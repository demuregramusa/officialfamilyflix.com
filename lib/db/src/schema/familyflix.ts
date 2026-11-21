import { relations, sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import {
  bigint,
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth";

export const titleKind = pgEnum("title_kind", ["movie", "series", "live"]);
export const movieStatus = pgEnum("movie_status", ["draft", "published", "archived"]);
export const archiveImportStatus = pgEnum("archive_import_status", [
  "validated",
  "running",
  "paused",
  "completed",
  "failed",
]);
export const licenseType = pgEnum("license_type", [
  "owned",
  "public_domain",
  "creative_commons",
  "licensed",
  "unlicensed",
  "cc_by_4_0",
  "cc_by_sa_4_0",
  "cc_by_nd_4_0",
  "cc_by_nc_4_0",
  "cc_by_nc_sa_4_0",
  "cc_by_nc_nd_4_0",
  "cc0_1_0",
  "authorized",
]);
export const rightsReviewStatus = pgEnum("rights_review_status", [
  "pending",
  "approved",
  "rejected",
  "restricted",
]);
export const mediaAssetKind = pgEnum("media_asset_kind", [
  "main_video",
  "poster",
  "backdrop",
  "photo",
  "artwork",
  "audio",
  "subtitle",
  "other",
]);
export const videoProvider = pgEnum("video_provider", [
  "cloudflare",
  "manual",
  "demo",
]);
export const videoStatus = pgEnum("video_status", [
  "pending_upload",
  "processing",
  "ready",
  "error",
  "disabled",
]);

export interface EpisodePayload {
  number: number;
  title: string;
  synopsis: string;
  duration: string;
}

export interface LivePayload {
  channel: string;
  onNow: string;
  next: string;
  endsIn: number;
}

export const movies = pgTable(
  "movies",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    kind: titleKind("kind").notNull().default("movie"),
    tagline: text("tagline"),
    synopsis: text("synopsis").notNull().default(""),
    year: integer("year"),
    rating: text("rating"),
    score: integer("score").default(0).notNull(),
    durationMinutes: integer("duration_minutes"),
    seasons: integer("seasons"),
    badge: text("badge"),
    tmdbId: integer("tmdb_id"),
    imageId: text("image_id"),
    palette: jsonb("palette").$type<[string, string]>(),
    posterUrl: text("poster_url"),
    backdropUrl: text("backdrop_url"),
    cast: jsonb("cast").$type<string[]>().notNull().default([]),
    creator: text("creator"),
    creatorAttribution: text("creator_attribution"),
    episodes: jsonb("episodes").$type<EpisodePayload[]>().notNull().default([]),
    live: jsonb("live").$type<LivePayload | null>(),
    featured: boolean("featured").notNull().default(false),
    status: movieStatus("status").notNull().default("draft"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    rightsHolder: text("rights_holder"),
    licenseType: licenseType("license_type").notNull().default("unlicensed"),
    licenseTerritory: text("license_territory").default("Worldwide"),
    licenseExpiresAt: timestamp("license_expires_at", { withTimezone: true }),
    sourceUrl: text("source_url"),
    rightsConfirmedAt: timestamp("rights_confirmed_at", { withTimezone: true }),
    createdBy: text("created_by"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("movies_slug_unique").on(table.slug),
    index("movies_status_idx").on(table.status),
    index("movies_kind_idx").on(table.kind),
  ],
);

export const archiveImportJobs = pgTable(
  "archive_import_jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    archiveName: text("archive_name").notNull(),
    archiveSha256: text("archive_sha256").notNull(),
    status: archiveImportStatus("status").notNull().default("validated"),
    createdBy: text("created_by")
      .references(() => user.id, { onDelete: "restrict" }),
    totalPages: integer("total_pages").notNull().default(0),
    nextPageIndex: integer("next_page_index").notNull().default(0),
    totalRecords: integer("total_records").notNull().default(0),
    expectedNewTitles: integer("expected_new_titles").notNull().default(0),
    expectedMatchedTitles: integer("expected_matched_titles").notNull().default(0),
    expectedSourceRecords: integer("expected_source_records").notNull().default(0),
    expectedTorrentSources: integer("expected_torrent_sources").notNull().default(0),
    processedRecords: integer("processed_records").notNull().default(0),
    createdTitles: integer("created_titles").notNull().default(0),
    matchedTitles: integer("matched_titles").notNull().default(0),
    updatedTitles: integer("updated_titles").notNull().default(0),
    duplicateRecords: integer("duplicate_records").notNull().default(0),
    duplicateSourceRecords: integer("duplicate_source_records").notNull().default(0),
    duplicateImdbRecords: integer("duplicate_imdb_records").notNull().default(0),
    importedSourceRecords: integer("imported_source_records").notNull().default(0),
    importedTorrentSources: integer("imported_torrent_sources").notNull().default(0),
    malformedPages: integer("malformed_pages").notNull().default(0),
    recoveredRecords: integer("recovered_records").notNull().default(0),
    skippedRecords: integer("skipped_records").notNull().default(0),
    failedRecords: integer("failed_records").notNull().default(0),
    issues: jsonb("issues")
      .$type<Array<{ page: number; sourceId?: string | null; message: string }>>()
      .notNull()
      .default([]),
    lastError: text("last_error"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("archive_import_jobs_sha256_unique").on(table.archiveSha256),
    index("archive_import_jobs_status_created_idx").on(table.status, table.createdAt),
    index("archive_import_jobs_creator_created_idx").on(table.createdBy, table.createdAt),
  ],
);

export const importedMovieSources = pgTable(
  "imported_movie_sources",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    movieId: uuid("movie_id")
      .notNull()
      .references(() => movies.id, { onDelete: "cascade" }),
    importJobId: uuid("import_job_id")
      .notNull()
      .references(() => archiveImportJobs.id, { onDelete: "restrict" }),
    provider: text("provider").notNull(),
    sourceId: text("source_id").notNull(),
    imdbCode: text("imdb_code"),
    sourceUrl: text("source_url"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("imported_movie_sources_provider_source_unique").on(
      table.provider,
      table.sourceId,
    ),
    index("imported_movie_sources_movie_idx").on(table.movieId),
    index("imported_movie_sources_imdb_idx").on(table.imdbCode),
  ],
);

export const importedTorrentSources = pgTable(
  "imported_torrent_sources",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    movieSourceId: uuid("movie_source_id")
      .notNull()
      .references(() => importedMovieSources.id, { onDelete: "cascade" }),
    sourceIndex: integer("source_index").notNull(),
    sourceUrl: text("source_url"),
    infoHash: text("info_hash"),
    quality: text("quality"),
    sourceType: text("source_type"),
    isRepack: boolean("is_repack"),
    videoCodec: text("video_codec"),
    bitDepth: text("bit_depth"),
    audioChannels: text("audio_channels"),
    seeders: integer("seeders"),
    peers: integer("peers"),
    size: text("size"),
    sizeBytes: bigint("size_bytes", { mode: "number" }),
    uploadedAt: text("uploaded_at"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull(),
    playbackStatus: text("playback_status").notNull().default("disabled"),
    rightsStatus: text("rights_status").notNull().default("unverified"),
    rightsEvidenceUrl: text("rights_evidence_url"),
    rightsEvidenceNotes: text("rights_evidence_notes"),
    rightsReviewNote: text("rights_review_note"),
    rightsReviewedBy: text("rights_reviewed_by"),
    rightsReviewedAt: timestamp("rights_reviewed_at", { withTimezone: true }),
    activatedBy: text("activated_by"),
    activatedAt: timestamp("activated_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("imported_torrent_sources_parent_idx").on(table.movieSourceId),
    uniqueIndex("imported_torrent_sources_position_unique").on(
      table.movieSourceId,
      table.sourceIndex,
    ),
    uniqueIndex("imported_torrent_sources_hash_unique")
      .on(table.movieSourceId, table.infoHash)
      .where(sql`${table.infoHash} IS NOT NULL`),
  ],
);

export const seriesSeasons = pgTable(
  "series_seasons",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    movieId: uuid("movie_id").notNull().references(() => movies.id, { onDelete: "cascade" }),
    seasonNumber: integer("season_number").notNull(),
    name: text("name"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("series_seasons_title_number_unique").on(table.movieId, table.seasonNumber),
    check("series_seasons_number_positive", sql`${table.seasonNumber} > 0`),
  ],
);

export const seriesEpisodes = pgTable(
  "series_episodes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    seasonId: uuid("season_id").notNull().references(() => seriesSeasons.id, { onDelete: "cascade" }),
    episodeNumber: integer("episode_number").notNull(),
    name: text("name").notNull(),
    synopsis: text("synopsis").notNull().default(""),
    durationMinutes: integer("duration_minutes"),
    status: movieStatus("status").notNull().default("draft"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdBy: text("created_by"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("series_episodes_season_number_unique").on(table.seasonId, table.episodeNumber),
    index("series_episodes_status_idx").on(table.status),
    check("series_episodes_number_positive", sql`${table.episodeNumber} > 0`),
    check("series_episodes_duration_positive", sql`${table.durationMinutes} is null or ${table.durationMinutes} > 0`),
  ],
);

export const mediaRights = pgTable(
  "media_rights",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    movieId: uuid("movie_id").references(() => movies.id, { onDelete: "cascade" }),
    episodeId: uuid("episode_id").references(() => seriesEpisodes.id, { onDelete: "cascade" }),
    assetKind: mediaAssetKind("asset_kind").notNull(),
    assetLabel: text("asset_label").notNull(),
    assetUrl: text("asset_url").notNull(),
    rightsHolder: text("rights_holder").notNull(),
    creatorAttribution: text("creator_attribution").notNull(),
    licenseType: licenseType("license_type").notNull(),
    licenseVersion: text("license_version").notNull(),
    licenseUrl: text("license_url").notNull(),
    usageRestrictions: text("usage_restrictions").array().notNull().default([]),
    sourceUrl: text("source_url").notNull(),
    evidenceUrl: text("evidence_url"),
    evidenceNotes: text("evidence_notes"),
    territory: text("territory"),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    uploaderAttested: boolean("uploader_attested").notNull().default(false),
    uploaderId: text("uploader_id"),
    submittedAt: timestamp("submitted_at", { withTimezone: true }).defaultNow().notNull(),
    reviewStatus: rightsReviewStatus("review_status").notNull().default("pending"),
    reviewedBy: text("reviewed_by"),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    reviewNotes: text("review_notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("media_rights_movie_idx").on(table.movieId),
    index("media_rights_episode_idx").on(table.episodeId),
    index("media_rights_review_status_idx").on(table.reviewStatus),
    index("media_rights_asset_kind_idx").on(table.assetKind),
    check("media_rights_owner_check", sql`num_nonnulls(${table.movieId}, ${table.episodeId}) = 1`),
  ],
);

export const genres = pgTable(
  "genres",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
  },
  (table) => [uniqueIndex("genres_slug_unique").on(table.slug)],
);

export const movieGenres = pgTable(
  "movie_genres",
  {
    movieId: uuid("movie_id")
      .notNull()
      .references(() => movies.id, { onDelete: "cascade" }),
    genreId: integer("genre_id")
      .notNull()
      .references(() => genres.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.movieId, table.genreId] }),
    index("movie_genres_genre_idx").on(table.genreId),
  ],
);

export const videoAssets = pgTable(
  "video_assets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    movieId: uuid("movie_id").references(() => movies.id, { onDelete: "cascade" }),
    episodeId: uuid("episode_id").references(() => seriesEpisodes.id, { onDelete: "cascade" }),
    mediaRightId: uuid("media_right_id").references(() => mediaRights.id, {
      onDelete: "set null",
    }),
    provider: videoProvider("provider").notNull().default("manual"),
    providerAssetId: text("provider_asset_id"),
    playbackId: text("playback_id"),
    hlsUrl: text("hls_url"),
    mp4Url: text("mp4_url"),
    thumbnailUrl: text("thumbnail_url"),
    status: videoStatus("status").notNull().default("pending_upload"),
    durationSeconds: integer("duration_seconds"),
    sizeBytes: bigint("size_bytes", { mode: "number" }),
    width: integer("width"),
    height: integer("height"),
    error: text("error"),
    signedPlayback: boolean("signed_playback").notNull().default(true),
    createdBy: text("created_by"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("video_assets_movie_unique").on(table.movieId),
    uniqueIndex("video_assets_episode_unique").on(table.episodeId),
    index("video_assets_status_idx").on(table.status),
    check("video_assets_owner_check", sql`num_nonnulls(${table.movieId}, ${table.episodeId}) = 1`),
  ],
);

export const subtitles = pgTable(
  "subtitles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    movieId: uuid("movie_id")
      .notNull()
      .references(() => movies.id, { onDelete: "cascade" }),
    mediaRightId: uuid("media_right_id").references(() => mediaRights.id, {
      onDelete: "set null",
    }),
    language: text("language").notNull(),
    label: text("label").notNull(),
    url: text("url").notNull(),
    isDefault: boolean("is_default").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("subtitles_movie_language_unique").on(table.movieId, table.language),
  ],
);

export const userFavorites = pgTable(
  "user_favorites",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    movieId: uuid("movie_id")
      .notNull()
      .references(() => movies.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.movieId] }),
    index("user_favorites_movie_idx").on(table.movieId),
  ],
);

export const playbackProgress = pgTable(
  "playback_progress",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    movieId: uuid("movie_id")
      .notNull()
      .references(() => movies.id, { onDelete: "cascade" }),
    episodeId: uuid("episode_id")
      .references(() => seriesEpisodes.id, { onDelete: "cascade" }),
    progressSeconds: integer("progress_seconds").notNull(),
    durationSeconds: integer("duration_seconds").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("playback_progress_movie_unique")
      .on(table.userId, table.movieId)
      .where(sql`${table.episodeId} IS NULL`),
    uniqueIndex("playback_progress_episode_unique")
      .on(table.userId, table.episodeId)
      .where(sql`${table.episodeId} IS NOT NULL`),
    index("playback_progress_user_updated_idx").on(table.userId, table.updatedAt),
    check("playback_progress_seconds_nonnegative", sql`${table.progressSeconds} >= 0`),
    check("playback_progress_duration_positive", sql`${table.durationSeconds} > 0`),
    check(
      "playback_progress_within_duration",
      sql`${table.progressSeconds} <= ${table.durationSeconds}`,
    ),
  ],
);

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id"),
    userEmail: text("user_email"),
    action: text("action").notNull(),
    entity: text("entity").notNull(),
    entityId: text("entity_id"),
    detail: jsonb("detail").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("audit_logs_created_idx").on(table.createdAt)],
);

export const siteSettings = pgTable("site_settings", {
  id: text("id").primaryKey().default("default"),
  value: jsonb("value").$type<Record<string, unknown>>().notNull(),
  updatedBy: text("updated_by"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const moviesRelations = relations(movies, ({ many, one }) => ({
  genres: many(movieGenres),
  video: one(videoAssets),
  subtitles: many(subtitles),
  rights: many(mediaRights),
  seasons: many(seriesSeasons),
  importedSources: many(importedMovieSources),
}));

export const archiveImportJobsRelations = relations(archiveImportJobs, ({ many }) => ({
  importedSources: many(importedMovieSources),
}));

export const importedMovieSourcesRelations = relations(importedMovieSources, ({ many, one }) => ({
  movie: one(movies, { fields: [importedMovieSources.movieId], references: [movies.id] }),
  importJob: one(archiveImportJobs, {
    fields: [importedMovieSources.importJobId],
    references: [archiveImportJobs.id],
  }),
  torrents: many(importedTorrentSources),
}));

export const importedTorrentSourcesRelations = relations(importedTorrentSources, ({ one }) => ({
  movieSource: one(importedMovieSources, {
    fields: [importedTorrentSources.movieSourceId],
    references: [importedMovieSources.id],
  }),
}));

export const seriesSeasonsRelations = relations(seriesSeasons, ({ one, many }) => ({
  movie: one(movies, { fields: [seriesSeasons.movieId], references: [movies.id] }),
  episodes: many(seriesEpisodes),
}));

export const seriesEpisodesRelations = relations(seriesEpisodes, ({ one, many }) => ({
  season: one(seriesSeasons, { fields: [seriesEpisodes.seasonId], references: [seriesSeasons.id] }),
  rights: many(mediaRights),
  video: one(videoAssets),
}));

export const genresRelations = relations(genres, ({ many }) => ({
  movies: many(movieGenres),
}));

export const movieGenresRelations = relations(movieGenres, ({ one }) => ({
  movie: one(movies, { fields: [movieGenres.movieId], references: [movies.id] }),
  genre: one(genres, { fields: [movieGenres.genreId], references: [genres.id] }),
}));

export const mediaRightsRelations = relations(mediaRights, ({ one }) => ({
  movie: one(movies, { fields: [mediaRights.movieId], references: [movies.id] }),
  episode: one(seriesEpisodes, { fields: [mediaRights.episodeId], references: [seriesEpisodes.id] }),
}));

export const videoAssetsRelations = relations(videoAssets, ({ one }) => ({
  movie: one(movies, { fields: [videoAssets.movieId], references: [movies.id] }),
  episode: one(seriesEpisodes, { fields: [videoAssets.episodeId], references: [seriesEpisodes.id] }),
  rights: one(mediaRights, {
    fields: [videoAssets.mediaRightId],
    references: [mediaRights.id],
  }),
}));

export const subtitlesRelations = relations(subtitles, ({ one }) => ({
  movie: one(movies, { fields: [subtitles.movieId], references: [movies.id] }),
  rights: one(mediaRights, {
    fields: [subtitles.mediaRightId],
    references: [mediaRights.id],
  }),
}));

export const insertMovieSchema = createInsertSchema(movies).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertMediaRightSchema = createInsertSchema(mediaRights).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  submittedAt: true,
  reviewedAt: true,
});
export type InsertMovie = z.infer<typeof insertMovieSchema>;
export type Movie = typeof movies.$inferSelect;
export type Genre = typeof genres.$inferSelect;
export type MediaRight = typeof mediaRights.$inferSelect;
export type VideoAsset = typeof videoAssets.$inferSelect;
export type Subtitle = typeof subtitles.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;
