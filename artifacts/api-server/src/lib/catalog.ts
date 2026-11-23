import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { and, desc, eq, ilike, inArray, or, isNull, gt } from "drizzle-orm";
import {
  db,
  genres,
  importedMovieSources,
  importedTorrentSources,
  mediaRights,
  movieGenres,
  movies,
  seriesEpisodes,
  seriesSeasons,
  subtitles,
  videoAssets,
  type MediaRight,
  type Movie,
} from "@workspace/db";
import type {
  Playback,
  PublicRightsRecord,
  PublicTitle,
  PublicTitleDetail,
  PublicSeriesEpisode,
  EpisodePlayback,
} from "@workspace/api-zod";
import { isEvidenceComplete, isRightCurrent, validatePublicHttpUrl } from "./rights";
import { isEpisodePubliclyPlayable, isSeriesPubliclyVisible } from "./episode-eligibility";
import { isTorrentPlaybackEligible } from "./movie-archive-policy";

type EpisodeCatalogRow = {
  episode: typeof seriesEpisodes.$inferSelect;
  seasonNumber: number;
  seasonName: string | null;
  rights: MediaRight[];
  video: (typeof videoAssets.$inferSelect) | null;
};

type CatalogRow = {
  movie: Movie;
  rights: MediaRight[];
  video: (typeof videoAssets.$inferSelect) | null;
  torrent: (typeof importedTorrentSources.$inferSelect) | null;
  genres: string[];
  episodes: EpisodeCatalogRow[];
};

export async function getCatalogRows(options: {
  query?: string;
  kind?: Movie["kind"];
  limit?: number;
  offset?: number;
} = {}): Promise<CatalogRow[]> {
  const conditions = [eq(movies.status, "published")];
  const offset = Math.max(0, options.offset ?? 0);
  if (options.kind) conditions.push(eq(movies.kind, options.kind));
  if (options.query?.trim()) {
    const query = options.query.trim().replaceAll("\\", "\\\\").replaceAll("%", "\\%").replaceAll("_", "\\_");
    const pattern = `%${query}%`;
    const searchCondition = or(
      ilike(movies.name, pattern),
      ilike(movies.synopsis, pattern),
      ilike(movies.creatorAttribution, pattern),
      inArray(movies.id, db.select({ movieId: mediaRights.movieId }).from(mediaRights).where(and(
        eq(mediaRights.reviewStatus, "approved"),
        eq(mediaRights.uploaderAttested, true),
        or(ilike(mediaRights.creatorAttribution, pattern), ilike(mediaRights.rightsHolder, pattern)),
      ))),
      inArray(movies.id, db.select({ movieId: movieGenres.movieId })
        .from(movieGenres)
        .innerJoin(genres, eq(movieGenres.genreId, genres.id))
        .where(ilike(genres.name, pattern))),
    );
    if (searchCondition) conditions.push(searchCondition);
  }
  if (options.kind) {
    const movieRows = await db
      .select()
      .from(movies)
      .where(and(...conditions))
      .orderBy(desc(movies.featured), desc(movies.publishedAt), desc(movies.createdAt))
      .limit(Math.max(1, Math.min(options.limit ?? 40, 100)))
      .offset(offset);

    return hydrateCatalogMovies(movieRows);
  }

  // When no specific kind is requested (e.g. Home page / mixed catalog browse),
  // guarantee TV series are included alongside movies so both are prominently displayed!
  const targetTotal = Math.max(1, Math.min(options.limit ?? 100, 100));
  const seriesLimit = Math.max(1, Math.min(30, Math.floor(targetTotal * 0.35)));
  const moviesLimit = Math.max(1, targetTotal - seriesLimit);

  const [seriesRows, movieRows] = await Promise.all([
    db
      .select()
      .from(movies)
      .where(and(...conditions, eq(movies.kind, "series")))
      .orderBy(desc(movies.featured), desc(movies.publishedAt), desc(movies.createdAt))
      .limit(seriesLimit)
      .offset(offset ? Math.floor(offset * 0.35) : 0),
    db
      .select()
      .from(movies)
      .where(and(...conditions, eq(movies.kind, "movie")))
      .orderBy(desc(movies.featured), desc(movies.publishedAt), desc(movies.createdAt))
      .limit(moviesLimit)
      .offset(offset ? Math.floor(offset * 0.65) : 0),
  ]);

  // Interleave series and movies so both appear across carousels
  const combined: Movie[] = [];
  const maxLen = Math.max(seriesRows.length, movieRows.length);
  for (let i = 0; i < maxLen; i++) {
    if (i < seriesRows.length) combined.push(seriesRows[i]!);
    if (i < movieRows.length) combined.push(movieRows[i]!);
  }

  return hydrateCatalogMovies(combined.length ? combined : movieRows);
}

async function hydrateCatalogMovies(movieRows: Movie[]): Promise<CatalogRow[]> {
  if (!movieRows.length) return [];
  const ids = movieRows.map((movie) => movie.id);
  const [rightsRows, videoRows, torrentRows, genreRows] = await Promise.all([
    db.select().from(mediaRights).where(inArray(mediaRights.movieId, ids)),
    db.select().from(videoAssets).where(inArray(videoAssets.movieId, ids)),
    db.select({
      movieId: importedMovieSources.movieId,
      torrent: importedTorrentSources,
    })
      .from(importedTorrentSources)
      .innerJoin(importedMovieSources, eq(importedTorrentSources.movieSourceId, importedMovieSources.id))
      .where(and(
        inArray(importedMovieSources.movieId, ids),
        eq(importedTorrentSources.playbackStatus, "active"),
        eq(importedTorrentSources.rightsStatus, "approved"),
      )),
    db
      .select({ movieId: movieGenres.movieId, genreName: genres.name })
      .from(movieGenres)
      .innerJoin(genres, eq(movieGenres.genreId, genres.id))
      .where(inArray(movieGenres.movieId, ids)),
  ]);

  const rightsByMovie = new Map<string, MediaRight[]>();
  for (const rights of rightsRows) {
    if (
      !rights.movieId ||
      rights.reviewStatus !== "approved" ||
      !isRightCurrent(rights) ||
      !isEvidenceComplete(rights)
    ) continue;
    rightsByMovie.set(rights.movieId, [...(rightsByMovie.get(rights.movieId) ?? []), rights]);
  }
  const videoByMovie = new Map(videoRows.map((video) => [video.movieId, video]));
  const torrentByMovie = new Map<string, typeof importedTorrentSources.$inferSelect>();
  // Prefer cached torrents on disk first, then universal x264 720p/1080p with highest seeders.
  const torrentCacheDir = path.join(os.tmpdir(), "familyflix-torrents");
  const scoreTorrent = (t: typeof importedTorrentSources.$inferSelect): number => {
    let score = (t.seeders ?? 0) * 5;
    if (t.infoHash && fs.existsSync(path.join(torrentCacheDir, `${t.infoHash}.torrent`))) {
      score += 10000;
    }
    if (t.videoCodec !== "x265") score += 500;
    if (t.quality === "720p") score += 150;
    else if (t.quality === "1080p") score += 100;
    else if (t.quality === "2160p") score -= 500;
    return score;
  };
  const byBestSource = [...torrentRows].sort(
    (a, b) => scoreTorrent(b.torrent) - scoreTorrent(a.torrent),
  );
  for (const row of byBestSource) {
    if (isTorrentPlaybackEligible(row.torrent, true) && !torrentByMovie.has(row.movieId)) {
      torrentByMovie.set(row.movieId, row.torrent);
    }
  }
  const genresByMovie = new Map<string, string[]>();
  for (const genre of genreRows) {
    genresByMovie.set(genre.movieId, [...(genresByMovie.get(genre.movieId) ?? []), genre.genreName]);
  }

  const episodeRows = await getPublicEpisodeRows(
    movieRows.filter((movie) => movie.kind === "series").map((movie) => movie.id),
    torrentByMovie,
  );

  return movieRows.flatMap((movie) => {
    const rights = rightsByMovie.get(movie.id) ?? [];
    const mainRight = rights.find((right) => right.assetKind === "main_video");
    const video = videoByMovie.get(movie.id) ?? null;
    const torrent = torrentByMovie.get(movie.id) ?? null;
    const episodes = episodeRows.get(movie.id) ?? [];
    if (movie.kind === "series"
      ? !isSeriesPubliclyVisible({ kind: movie.kind, status: movie.status, playableEpisodeCount: episodes.length })
      : (!mainRight || !(
          (video && video.status === "ready" && video.mediaRightId === mainRight.id) ||
          torrent
        ))) {
      return [];
    }
    return [{
      movie,
      rights,
      video,
      torrent,
      genres: genresByMovie.get(movie.id) ?? [],
      episodes,
    }];
  });
}

async function getPublicEpisodeRows(
  seriesIds: string[],
  torrentByMovie?: Map<string, typeof importedTorrentSources.$inferSelect>,
): Promise<Map<string, EpisodeCatalogRow[]>> {
  const result = new Map<string, EpisodeCatalogRow[]>();
  if (!seriesIds.length) return result;
  const rows = await db
    .select({
      episode: seriesEpisodes,
      seasonId: seriesSeasons.id,
      seasonNumber: seriesSeasons.seasonNumber,
      seasonName: seriesSeasons.name,
      movieId: seriesSeasons.movieId,
    })
    .from(seriesEpisodes)
    .innerJoin(seriesSeasons, eq(seriesEpisodes.seasonId, seriesSeasons.id))
    .where(and(inArray(seriesSeasons.movieId, seriesIds), eq(seriesEpisodes.status, "published")));
  if (!rows.length) return result;
  const episodeIds = rows.map(({ episode }) => episode.id);
  const [rightsRows, videoRows] = await Promise.all([
    db.select().from(mediaRights).where(inArray(mediaRights.episodeId, episodeIds)),
    db.select().from(videoAssets).where(inArray(videoAssets.episodeId, episodeIds)),
  ]);
  const rightsByEpisode = new Map<string, MediaRight[]>();
  for (const right of rightsRows) {
    if (!right.episodeId || !isRightCurrent(right) || !isEvidenceComplete(right)) continue;
    rightsByEpisode.set(right.episodeId, [...(rightsByEpisode.get(right.episodeId) ?? []), right]);
  }
  const videoByEpisode = new Map(
    videoRows.filter((video) => video.episodeId).map((video) => [video.episodeId!, video]),
  );
  for (const { episode, seasonNumber, seasonName, movieId } of rows) {
    const rights = rightsByEpisode.get(episode.id) ?? [];
    const video = videoByEpisode.get(episode.id) ?? null;
    const hasTorrent = Boolean(torrentByMovie?.has(movieId));
    if (!isEpisodePubliclyPlayable({
      parentSeriesId: movieId,
      episodeSeriesId: movieId,
      parentStatus: "published",
      parentKind: "series",
      episodeIsPublished: episode.status === "published",
      rights,
      video,
      hasTorrent,
    })) continue;
    result.set(movieId, [...(result.get(movieId) ?? []), {
      episode,
      seasonNumber,
      seasonName,
      rights,
      video,
    }]);
  }
  for (const episodes of result.values()) {
    episodes.sort((a, b) =>
      a.seasonNumber - b.seasonNumber ||
      a.episode.episodeNumber - b.episode.episodeNumber,
    );
  }
  return result;
}

function toPublicRightsRecord(right: MediaRight): PublicRightsRecord {
  const assetKind = right.assetKind.replaceAll("_", "-") as PublicRightsRecord["assetKind"];
  const licenseTypeMap: Record<string, PublicRightsRecord["licenseType"]> = {
    cc_by_4_0: "cc-by-4.0",
    cc_by_sa_4_0: "cc-by-sa-4.0",
    cc_by_nd_4_0: "cc-by-nd-4.0",
    cc_by_nc_4_0: "cc-by-nc-4.0",
    cc_by_nc_sa_4_0: "cc-by-nc-sa-4.0",
    cc_by_nc_nd_4_0: "cc-by-nc-nd-4.0",
    cc0_1_0: "cc0-1.0",
    public_domain: "public-domain",
    owned: "creator-owned",
    authorized: "authorized-copyright",
    licensed: "authorized-copyright",
    unlicensed: "unlicensed",
    creative_commons: "unlicensed",
  };
  return {
    assetKind,
    assetLabel: right.assetLabel,
    rightsHolder: right.rightsHolder,
    creatorAttribution: right.creatorAttribution,
    licenseType: licenseTypeMap[right.licenseType] ?? "unlicensed",
    licenseVersion: right.licenseVersion,
    licenseUrl: right.licenseUrl,
    usageRestrictions: right.usageRestrictions,
    sourceUrl: right.sourceUrl,
    territory: right.territory,
    expiresAt: right.expiresAt,
  };
}

export function toPublicTitle(row: CatalogRow): PublicTitle {
  const mainRight = row.rights.find((right) => right.id === row.video?.mediaRightId) ??
    row.rights.find((right) => right.assetKind === "main_video");
  const poster = row.rights.find((right) => right.assetKind === "poster");
  const rawPoster = poster?.assetUrl ?? row.movie.posterUrl ?? null;
  const posterUrl = rawPoster ? rawPoster.replace("https://yts.pw/", "https://img.yts.pw/") : null;
  return {
    id: row.movie.id,
    slug: row.movie.slug,
    name: row.movie.name,
    kind: row.movie.kind,
    synopsis: row.movie.synopsis,
    year: row.movie.year,
    genres: row.genres,
    creatorAttribution: mainRight?.creatorAttribution ?? row.movie.creatorAttribution ?? "",
    posterUrl,
    featured: row.movie.featured,
  };
}

export function toPublicTitleDetail(row: CatalogRow): PublicTitleDetail {
  const title = toPublicTitle(row);
  const backdrop = row.rights.find((right) => right.assetKind === "backdrop");
  const rawBackdrop = backdrop?.assetUrl ?? row.movie.backdropUrl ?? row.movie.posterUrl ?? null;
  const backdropUrl = rawBackdrop ? rawBackdrop.replace("https://yts.pw/", "https://img.yts.pw/") : title.posterUrl;
  return {
    ...title,
    tagline: row.movie.tagline,
    backdropUrl,
    cast: row.movie.cast,
    rating: row.movie.rating,
    durationMinutes: row.movie.durationMinutes,
    rights: row.rights.map(toPublicRightsRecord),
    episodes: row.episodes.map(toPublicEpisode),
  };
}

function toPublicEpisode(row: EpisodeCatalogRow): PublicSeriesEpisode {
  return {
    id: row.episode.id,
    seasonNumber: row.seasonNumber,
    seasonName: row.seasonName,
    episodeNumber: row.episode.episodeNumber,
    name: row.episode.name,
    synopsis: row.episode.synopsis,
    durationMinutes: row.episode.durationMinutes,
    rights: row.rights.map(toPublicRightsRecord),
  };
}

export async function getPublicCatalogRowBySlug(slug: string): Promise<CatalogRow | null> {
  const [movie] = await db.select().from(movies)
    .where(and(eq(movies.slug, slug), eq(movies.status, "published")))
    .limit(1);
  if (!movie) return null;
  const [row] = await hydrateCatalogMovies([movie]);
  return row ?? null;
}

export async function getPlaybackForRow(row: CatalogRow): Promise<Playback | null> {
  const firstEpisode = row.movie.kind === "series" ? row.episodes[0] : undefined;
  const video = row.video ?? firstEpisode?.video ?? null;
  const rightsPool = row.rights.length ? row.rights : (firstEpisode?.rights ?? []);
  const primaryRight = rightsPool.find((right) => (video && right.id === video.mediaRightId) || right.assetKind === "main_video");

  let url: string | null = null;
  let streamType: Playback["streamType"] | null = null;
  if (video && primaryRight?.assetKind === "main_video" && video.provider === "cloudflare") {
    const base = process.env.CLOUDFLARE_STREAM_CUSTOMER_SUBDOMAIN?.trim();
    url = video.hlsUrl ?? (base && video.playbackId
      ? `https://${base}.cloudflarestream.com/${encodeURIComponent(video.playbackId)}/manifest/video.m3u8`
      : null);
    streamType = "cloudflare";
  } else if (video && primaryRight?.assetKind === "main_video" && video.hlsUrl) {
    url = video.hlsUrl;
    streamType = "hls";
  } else if (video && primaryRight?.assetKind === "main_video" && video.mp4Url) {
    url = video.mp4Url;
    streamType = "mp4";
  } else if (row.torrent && isTorrentPlaybackEligible(row.torrent, true)) {
    url = `/api/playback/${encodeURIComponent(row.movie.slug)}/media`;
    streamType = "mp4";
  }

  if (!url || !streamType) return null;
  if (!url.startsWith("/") && (!url.startsWith("https://") || validatePublicHttpUrl(url))) return null;
  const subtitlesForTitle = await db
    .select({
      id: subtitles.id,
      language: subtitles.language,
      label: subtitles.label,
      url: subtitles.url,
      isDefault: subtitles.isDefault,
      mediaRight: mediaRights,
    })
    .from(subtitles)
    .innerJoin(mediaRights, eq(subtitles.mediaRightId, mediaRights.id))
    .where(and(
      eq(subtitles.movieId, row.movie.id),
      eq(mediaRights.reviewStatus, "approved"),
      or(isNull(mediaRights.expiresAt), gt(mediaRights.expiresAt, new Date())),
    ));

  const rawPoster = row.rights.find((right) => right.assetKind === "poster")?.assetUrl ?? row.movie.posterUrl ?? null;
  const posterUrl = rawPoster ? rawPoster.replace("https://yts.pw/", "https://img.yts.pw/") : null;

  return {
    titleName: row.movie.name,
    streamType,
    url,
    posterUrl,
    subtitles: subtitlesForTitle
      .filter((subtitle) => isRightCurrent(subtitle.mediaRight))
      .map(({ id, language, label, url: subtitleUrl, isDefault }) => ({
        id,
        language,
        label,
        url: subtitleUrl,
        isDefault,
      })),
  };
}

export async function getEpisodePlaybackForRow(
  row: CatalogRow,
  episodeId: string,
): Promise<EpisodePlayback | null> {
  const episode = row.episodes.find((candidate) => candidate.episode.id === episodeId);
  if (!episode) return null;
  const video = episode.video;
  const primaryRight = episode.rights.find((right) => (video && right.id === video.mediaRightId) || right.assetKind === "main_video");
  if (!primaryRight || primaryRight.assetKind !== "main_video") return null;

  let url: string | null = null;
  let streamType: EpisodePlayback["streamType"] | null = null;
  if (video && video.provider === "cloudflare") {
    const base = process.env.CLOUDFLARE_STREAM_CUSTOMER_SUBDOMAIN?.trim();
    url = video.hlsUrl ?? (base && video.playbackId
      ? `https://${base}.cloudflarestream.com/${encodeURIComponent(video.playbackId)}/manifest/video.m3u8`
      : null);
    streamType = "cloudflare";
  } else if (video && video.hlsUrl) {
    url = video.hlsUrl;
    streamType = "hls";
  } else if (video && video.mp4Url) {
    url = video.mp4Url;
    streamType = "mp4";
  } else if (row.torrent && isTorrentPlaybackEligible(row.torrent, true)) {
    url = `/api/playback/${encodeURIComponent(row.movie.slug)}/episodes/${encodeURIComponent(episode.episode.id)}/media`;
    streamType = "mp4";
  }
  if (!url || !streamType) return null;
  if (!url.startsWith("/") && (!url.startsWith("https://") || validatePublicHttpUrl(url))) return null;
  const rawPoster = row.rights.find((right) => right.assetKind === "poster")?.assetUrl ?? row.movie.posterUrl ?? null;
  const posterUrl = rawPoster ? rawPoster.replace("https://yts.pw/", "https://img.yts.pw/") : null;

  return {
    titleName: `${row.movie.name} · S${episode.seasonNumber} E${episode.episode.episodeNumber}: ${episode.episode.name}`,
    streamType,
    url,
    posterUrl,
    subtitles: [],
    episodeId: episode.episode.id,
    seasonNumber: episode.seasonNumber,
    episodeNumber: episode.episode.episodeNumber,
    episodeName: episode.episode.name,
  };
}
