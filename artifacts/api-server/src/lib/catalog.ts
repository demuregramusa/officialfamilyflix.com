import { and, desc, eq, ilike, inArray, or, isNull, gt } from "drizzle-orm";
import {
  db,
  genres,
  mediaRights,
  movieGenres,
  movies,
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
} from "@workspace/api-zod";
import { isEvidenceComplete, isRightCurrent, validatePublicHttpUrl } from "./rights";

type CatalogRow = {
  movie: Movie;
  rights: MediaRight[];
  video: (typeof videoAssets.$inferSelect) | null;
  genres: string[];
};

export async function getCatalogRows(options: {
  query?: string;
  kind?: Movie["kind"];
  limit?: number;
} = {}): Promise<CatalogRow[]> {
  const conditions = [eq(movies.status, "published")];
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
  const movieRows = await db
    .select()
    .from(movies)
    .where(and(...conditions))
    .orderBy(desc(movies.featured), desc(movies.publishedAt), desc(movies.createdAt))
    .limit(Math.max(1, Math.min(options.limit ?? 40, 100)));

  return hydrateCatalogMovies(movieRows);
}

async function hydrateCatalogMovies(movieRows: Movie[]): Promise<CatalogRow[]> {
  if (!movieRows.length) return [];
  const ids = movieRows.map((movie) => movie.id);
  const [rightsRows, videoRows, genreRows] = await Promise.all([
    db.select().from(mediaRights).where(inArray(mediaRights.movieId, ids)),
    db.select().from(videoAssets).where(inArray(videoAssets.movieId, ids)),
    db
      .select({ movieId: movieGenres.movieId, genreName: genres.name })
      .from(movieGenres)
      .innerJoin(genres, eq(movieGenres.genreId, genres.id))
      .where(inArray(movieGenres.movieId, ids)),
  ]);

  const rightsByMovie = new Map<string, MediaRight[]>();
  for (const rights of rightsRows) {
    if (!rights.movieId || !isRightCurrent(rights) || !isEvidenceComplete(rights)) continue;
    rightsByMovie.set(rights.movieId, [...(rightsByMovie.get(rights.movieId) ?? []), rights]);
  }
  const videoByMovie = new Map(videoRows.map((video) => [video.movieId, video]));
  const genresByMovie = new Map<string, string[]>();
  for (const genre of genreRows) {
    genresByMovie.set(genre.movieId, [...(genresByMovie.get(genre.movieId) ?? []), genre.genreName]);
  }

  return movieRows.flatMap((movie) => {
    const rights = rightsByMovie.get(movie.id) ?? [];
    const mainRight = rights.find((right) => right.assetKind === "main_video");
    const video = videoByMovie.get(movie.id) ?? null;
    if (
      !mainRight ||
      !video ||
      video.status !== "ready" ||
      video.mediaRightId !== mainRight.id
    ) {
      return [];
    }
    return [{
      movie,
      rights,
      video,
      genres: genresByMovie.get(movie.id) ?? [],
    }];
  });
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
  const mainRight = row.rights.find((right) => right.id === row.video?.mediaRightId);
  const poster = row.rights.find((right) => right.assetKind === "poster");
  return {
    id: row.movie.id,
    slug: row.movie.slug,
    name: row.movie.name,
    kind: row.movie.kind,
    synopsis: row.movie.synopsis,
    year: row.movie.year,
    genres: row.genres,
    creatorAttribution: mainRight?.creatorAttribution ?? row.movie.creatorAttribution ?? "",
    posterUrl: poster?.assetUrl ?? null,
    featured: row.movie.featured,
  };
}

export function toPublicTitleDetail(row: CatalogRow): PublicTitleDetail {
  const title = toPublicTitle(row);
  const backdrop = row.rights.find((right) => right.assetKind === "backdrop");
  return {
    ...title,
    tagline: row.movie.tagline,
    backdropUrl: backdrop?.assetUrl ?? null,
    cast: row.movie.cast,
    rating: row.movie.rating,
    durationMinutes: row.movie.durationMinutes,
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
  const video = row.video;
  const primaryRight = row.rights.find((right) => right.id === video?.mediaRightId);
  if (!video || !primaryRight || primaryRight.assetKind !== "main_video") return null;

  let url: string | null = null;
  let streamType: Playback["streamType"] | null = null;
  if (video.provider === "cloudflare") {
    const base = process.env.CLOUDFLARE_STREAM_CUSTOMER_SUBDOMAIN?.trim();
    url = video.hlsUrl ?? (base && video.playbackId
      ? `https://${base}.cloudflarestream.com/${encodeURIComponent(video.playbackId)}/manifest/video.m3u8`
      : null);
    streamType = "cloudflare";
  } else if (video.hlsUrl) {
    url = video.hlsUrl;
    streamType = "hls";
  } else if (video.mp4Url) {
    url = video.mp4Url;
    streamType = "mp4";
  }

  if (!url || !streamType) return null;
  if (!url.startsWith("https://") || validatePublicHttpUrl(url)) return null;
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

  return {
    titleName: row.movie.name,
    streamType,
    url,
    posterUrl: row.rights.find((right) => right.assetKind === "poster")?.assetUrl ?? null,
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
