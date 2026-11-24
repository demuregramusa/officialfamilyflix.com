import fs from "node:fs";
import path from "node:path";
import pg from "../node_modules/.pnpm/pg@8.23.1/node_modules/pg/lib/index.js";

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL || "postgresql://postgres@localhost:5432/familyflix",
});

await client.connect();

try {
  console.log("Querying all published movies and TV shows from PostgreSQL...");

  // 1. Query all published titles with genres and primary torrent/video playback info
  const titlesQuery = `
    SELECT
      m.id,
      m.slug,
      m.name,
      m.kind,
      m.tagline,
      m.synopsis,
      m.year,
      m.rating,
      m.score,
      m.duration_minutes AS "durationMinutes",
      m.poster_url AS "posterUrl",
      m.backdrop_url AS "backdropUrl",
      m.creator_attribution AS "creatorAttribution",
      m.featured,
      m.status,
      m.cast,
      COALESCE(array_agg(DISTINCT g.name) FILTER (WHERE g.name IS NOT NULL), '{}') AS genres
    FROM movies m
    LEFT JOIN movie_genres mg ON m.id = mg.movie_id
    LEFT JOIN genres g ON mg.genre_id = g.id
    WHERE m.status = 'published'
    GROUP BY m.id
    ORDER BY m.kind DESC, m.featured DESC, m.year DESC NULLS LAST, m.name ASC
  `;
  const titlesRes = await client.query(titlesQuery);

  // 2. Query direct video assets (MP4 / HLS / Cloudflare)
  const videoAssetsRes = await client.query(`
    SELECT
      movie_id AS "movieId",
      episode_id AS "episodeId",
      provider,
      status,
      mp4_url AS "mp4Url",
      hls_url AS "hlsUrl",
      playback_id AS "playbackId"
    FROM video_assets
    WHERE status = 'ready'
  `);

  const videoByMovieId = new Map();
  const videoByEpisodeId = new Map();
  for (const v of videoAssetsRes.rows) {
    if (v.movieId) videoByMovieId.set(v.movieId, v);
    if (v.episodeId) videoByEpisodeId.set(v.episodeId, v);
  }

  // 3. Query active/approved torrent sources (best source per movie/series)
  const torrentsRes = await client.query(`
    SELECT DISTINCT ON (ims.movie_id)
      ims.movie_id AS "movieId",
      ims.imdb_code AS "imdbCode",
      t.info_hash AS "infoHash",
      t.source_url AS "sourceUrl",
      t.quality,
      t.source_type AS "sourceType",
      t.video_codec AS "videoCodec",
      t.size,
      t.size_bytes AS "sizeBytes",
      t.seeders,
      t.peers
    FROM imported_torrent_sources t
    INNER JOIN imported_movie_sources ims ON t.movie_source_id = ims.id
    WHERE t.playback_status = 'active' AND t.rights_status = 'approved'
    ORDER BY ims.movie_id,
      (CASE WHEN t.video_codec != 'x265' THEN 1 ELSE 0 END) DESC,
      (CASE WHEN t.quality = '720p' THEN 2 WHEN t.quality = '1080p' THEN 1 ELSE 0 END) DESC,
      COALESCE(t.seeders, 0) DESC
  `);

  const torrentByMovieId = new Map();
  for (const t of torrentsRes.rows) {
    torrentByMovieId.set(t.movieId, t);
  }

  // 4. Query all TV series seasons and episodes
  const episodesRes = await client.query(`
    SELECT
      e.id AS "episodeId",
      s.movie_id AS "movieId",
      s.season_number AS "seasonNumber",
      s.name AS "seasonName",
      e.episode_number AS "episodeNumber",
      e.name AS "episodeName",
      e.synopsis,
      e.duration_minutes AS "durationMinutes",
      e.status
    FROM series_episodes e
    INNER JOIN series_seasons s ON e.season_id = s.id
    WHERE e.status = 'published'
    ORDER BY s.movie_id, s.season_number ASC, e.episode_number ASC
  `);

  const episodesByMovieId = new Map();
  for (const ep of episodesRes.rows) {
    if (!episodesByMovieId.has(ep.movieId)) {
      episodesByMovieId.set(ep.movieId, []);
    }
    episodesByMovieId.get(ep.movieId).push(ep);
  }

  // 5. Assemble unified catalog records
  const allTitles = [];
  const tvShowsOnly = [];
  const moviesOnly = [];

  for (const row of titlesRes.rows) {
    const posterUrl = row.posterUrl ? row.posterUrl.replace("https://yts.pw/", "https://img.yts.pw/") : null;
    const backdropUrl = row.backdropUrl ? row.backdropUrl.replace("https://yts.pw/", "https://img.yts.pw/") : posterUrl;
    const directVideo = videoByMovieId.get(row.id) || null;
    const torrentSource = torrentByMovieId.get(row.id) || null;
    const rawEpisodes = episodesByMovieId.get(row.id) || [];

    const episodes = rawEpisodes.map((ep) => {
      const epVideo = videoByEpisodeId.get(ep.episodeId) || null;
      const streamUrl = epVideo?.mp4Url
        || epVideo?.hlsUrl
        || `/api/playback/${encodeURIComponent(row.slug)}/episodes/${encodeURIComponent(ep.episodeId)}/media`;
      return {
        id: ep.episodeId,
        seasonNumber: ep.seasonNumber,
        seasonName: ep.seasonName,
        episodeNumber: ep.episodeNumber,
        name: ep.episodeName,
        synopsis: ep.synopsis || "",
        durationMinutes: ep.durationMinutes,
        playback: {
          apiEndpoint: `/api/playback/${row.slug}/episodes/${ep.episodeId}`,
          streamUrl,
          directMp4Url: epVideo?.mp4Url || null,
          hlsUrl: epVideo?.hlsUrl || null,
          provider: epVideo?.provider || (torrentSource ? "webtorrent-gateway" : "direct"),
        },
      };
    });

    const firstEpVideo = rawEpisodes.length > 0 ? videoByEpisodeId.get(rawEpisodes[0].episodeId) : null;
    const primaryDirectUrl = directVideo?.mp4Url || directVideo?.hlsUrl || firstEpVideo?.mp4Url || firstEpVideo?.hlsUrl || null;
    const streamUrl = primaryDirectUrl || `/api/playback/${encodeURIComponent(row.slug)}/media`;

    const item = {
      id: row.id,
      slug: row.slug,
      name: row.name,
      kind: row.kind, // "movie" | "series"
      year: row.year,
      rating: row.rating,
      score: Number(row.score) || 0,
      durationMinutes: row.durationMinutes,
      tagline: row.tagline || null,
      synopsis: row.synopsis || "",
      genres: Array.isArray(row.genres) ? row.genres : [],
      cast: Array.isArray(row.cast) ? row.cast : [],
      creatorAttribution: row.creatorAttribution || "Public Domain / Authorized Archive",
      featured: Boolean(row.featured),
      posterUrl,
      backdropUrl,
      urls: {
        detailPage: `/titles/${row.slug}`,
        watchPage: `/watch/${row.slug}`,
        detailApi: `/api/v1/titles/${row.slug}`,
        playbackApi: `/api/playback/${row.slug}`,
        mediaStreamUrl: streamUrl,
      },
      playbackSource: {
        streamType: (directVideo?.hlsUrl || firstEpVideo?.hlsUrl) ? "hls" : "mp4",
        directMp4Url: directVideo?.mp4Url || firstEpVideo?.mp4Url || null,
        hlsUrl: directVideo?.hlsUrl || firstEpVideo?.hlsUrl || null,
        torrentGateway: torrentSource
          ? {
              imdbCode: torrentSource.imdbCode || null,
              infoHash: torrentSource.infoHash,
              quality: torrentSource.quality,
              sourceType: torrentSource.sourceType,
              videoCodec: torrentSource.videoCodec,
              size: torrentSource.size,
              sizeBytes: torrentSource.sizeBytes ? Number(torrentSource.sizeBytes) : null,
              seeders: torrentSource.seeders,
              peers: torrentSource.peers,
              sourceUrl: torrentSource.sourceUrl,
              magnetUrl: torrentSource.infoHash
                ? `magnet:?xt=urn:btih:${torrentSource.infoHash}&dn=${encodeURIComponent(row.name)}`
                : null,
              gatewayStreamEndpoint: `/api/playback/${row.slug}/media`,
            }
          : null,
      },
      ...(row.kind === "series" ? { episodeCount: episodes.length, episodes } : {}),
    };

    allTitles.push(item);
    if (row.kind === "series") {
      tvShowsOnly.push(item);
    } else {
      moviesOnly.push(item);
    }
  }

  const exportedAt = new Date().toISOString();

  // File 1: Complete catalog (All 23,272 movies & TV shows)
  const fullCatalogPayload = {
    platform: "FamilyFlix By DemureGram",
    exportedAt,
    summary: {
      totalPublishedTitles: allTitles.length,
      totalMovies: moviesOnly.length,
      totalTvSeries: tvShowsOnly.length,
      totalTvEpisodes: tvShowsOnly.reduce((acc, s) => acc + (s.episodes?.length || 0), 0),
    },
    architectureNotesForDeveloper: {
      database: "PostgreSQL (tables: movies, movie_genres, genres, media_rights, video_assets, imported_movie_sources, imported_torrent_sources, series_seasons, series_episodes, subtitles)",
      inMemoryCatalogCache: "artifacts/api-server/src/lib/catalog-service.ts pre-loads all 23,272 titles into memory on server boot with O(1) Map lookups by ID/slug and pre-computed homepage curated rows (<10ms API response).",
      playbackPipeline: {
        directArchiveMp4AndHls: "Movies and TV episodes with a ready row in video_assets serve direct HTTPS MP4/HLS streams (e.g., Archive.org / CDN MP4 URLs).",
        webTorrentHttpRangeGateway: "Titles backed by imported_torrent_sources stream via GET /api/playback/:slug/media (artifacts/api-server/src/lib/torrent-playback.ts), which resolves the .torrent metadata, prioritizes initial & tail MP4 header pieces via 2-argument torrent.critical(start, end), and pipes byte-range responses (HTTP 206 Partial Content) directly to the HTML5 <video> player.",
        tvSeriesPlayback: "TV series store seasons in series_seasons and episodes in series_episodes. GET /api/playback/:slug automatically resolves episode 1 for series-level playback, while GET /api/playback/:slug/episodes/:episodeId resolves individual episode streams.",
      },
      keyEndpoints: {
        listTitles: "GET /api/v1/titles?limit=48&offset=0&kind=movie|series&query=...",
        getTitleDetail: "GET /api/v1/titles/:slug",
        getPlaybackManifest: "GET /api/playback/:slug",
        getEpisodePlaybackManifest: "GET /api/playback/:slug/episodes/:episodeId",
        streamMediaByteRange: "GET /api/playback/:slug/media",
        curatedHomepageRows: "GET /api/v1/home/curated-rows",
        categoriesList: "GET /api/v1/categories",
      },
    },
    titles: allTitles,
  };

  // File 2: All TV Shows & Episodes catalog
  const tvCatalogPayload = {
    platform: "FamilyFlix By DemureGram — TV Series & Episodes Catalog",
    exportedAt,
    totalTvSeries: tvShowsOnly.length,
    totalEpisodes: tvShowsOnly.reduce((acc, s) => acc + (s.episodes?.length || 0), 0),
    series: tvShowsOnly,
  };

  // File 3: Compact Developer Blueprint (15 representative movies + 15 TV shows with full episodes)
  const sampleDirectMovies = moviesOnly.filter((m) => m.playbackSource.directMp4Url).slice(0, 8);
  const sampleTorrentMovies = moviesOnly.filter((m) => m.playbackSource.torrentGateway).slice(0, 8);
  const blueprintPayload = {
    platform: "FamilyFlix By DemureGram — Developer Catalog & Playback Architecture Blueprint",
    exportedAt,
    summary: fullCatalogPayload.summary,
    architectureNotesForDeveloper: fullCatalogPayload.architectureNotesForDeveloper,
    sampleDirectStreamMovies: sampleDirectMovies,
    sampleTorrentGatewayMovies: sampleTorrentMovies,
    sampleTvSeriesWithEpisodes: tvShowsOnly.slice(0, 15),
  };

  const rootDir = path.resolve(process.cwd());
  const publicDirs = [
    rootDir,
    path.join(rootDir, "artifacts", "familyflix", "public"),
    path.join(rootDir, "artifacts", "familyflix", "dist", "public"),
  ];

  for (const dir of publicDirs) {
    if (!fs.existsSync(dir)) continue;
    fs.writeFileSync(
      path.join(dir, "familyflix-full-catalog-movies-and-tv-shows.json"),
      JSON.stringify(fullCatalogPayload, null, 2),
      "utf8",
    );
    fs.writeFileSync(
      path.join(dir, "familyflix-tv-shows-catalog.json"),
      JSON.stringify(tvCatalogPayload, null, 2),
      "utf8",
    );
    fs.writeFileSync(
      path.join(dir, "familyflix-developer-catalog-blueprint.json"),
      JSON.stringify(blueprintPayload, null, 2),
      "utf8",
    );
  }

  console.log(`Exported ${allTitles.length} total titles (${moviesOnly.length} movies, ${tvShowsOnly.length} TV series) successfully!`);
} finally {
  await client.end();
}
