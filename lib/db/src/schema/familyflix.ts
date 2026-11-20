import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import {
  bigint,
  boolean,
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

export const mediaRights = pgTable(
  "media_rights",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    movieId: uuid("movie_id").references(() => movies.id, { onDelete: "cascade" }),
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
    index("media_rights_review_status_idx").on(table.reviewStatus),
    index("media_rights_asset_kind_idx").on(table.assetKind),
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
    movieId: uuid("movie_id")
      .notNull()
      .references(() => movies.id, { onDelete: "cascade" }),
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
    index("video_assets_status_idx").on(table.status),
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
}));

export const videoAssetsRelations = relations(videoAssets, ({ one }) => ({
  movie: one(movies, { fields: [videoAssets.movieId], references: [movies.id] }),
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
