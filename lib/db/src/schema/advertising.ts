import { relations, sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { movies, seriesEpisodes } from "./familyflix";

// -------------------------------------------------------------
// 1. ADVERTISING CAMPAIGNS
// -------------------------------------------------------------
export const adCampaigns = pgTable(
  "ad_campaigns",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    advertiserName: text("advertiser_name").notNull(),
    status: text("status").notNull().default("active"), // draft, active, paused, completed, archived
    priority: integer("priority").notNull().default(5), // 1 to 10
    pricingModel: text("pricing_model").notNull().default("cpm"), // cpm, cpc, cpv, flat
    cpmRate: numeric("cpm_rate", { precision: 10, scale: 2 }).notNull().default("8.50"),
    budget: numeric("budget", { precision: 12, scale: 2 }).notNull().default("1000.00"),
    spent: numeric("spent", { precision: 12, scale: 2 }).notNull().default("0.00"),
    startDate: timestamp("start_date", { withTimezone: true }),
    endDate: timestamp("end_date", { withTimezone: true }),
    placements: jsonb("placements").$type<string[]>().notNull().default(["preroll", "midroll", "pause"]),
    targetGenres: jsonb("target_genres").$type<string[]>().notNull().default(["*"]),
    targetDevices: jsonb("target_devices").$type<string[]>().notNull().default(["desktop", "mobile", "tablet", "connected_tv"]),
    targetGeo: jsonb("target_geo").$type<string[]>().notNull().default(["*"]),
    maxImpressionsTotal: integer("max_impressions_total"),
    maxImpressionsPerSession: integer("max_impressions_per_session").notNull().default(3),
    maxImpressionsPerUserPerDay: integer("max_impressions_per_user_per_day").notNull().default(6),
    totalImpressionsServed: integer("total_impressions_served").notNull().default(0),
    totalCompletions: integer("total_completions").notNull().default(0),
    totalClicks: integer("total_clicks").notNull().default(0),
    vastTagUrl: text("vast_tag_url"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_ad_campaigns_status").on(table.status),
    index("idx_ad_campaigns_priority").on(table.priority),
  ]
);

// -------------------------------------------------------------
// 2. AD CREATIVES
// -------------------------------------------------------------
export const adCreatives = pgTable(
  "ad_creatives",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    campaignId: uuid("campaign_id").notNull().references(() => adCampaigns.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    creativeType: text("creative_type").notNull().default("video"), // video, image, vast_tag, interactive_qr
    mediaUrl: text("media_url"),
    vastTagUrl: text("vast_tag_url"),
    durationSeconds: integer("duration_seconds").notNull().default(15),
    isSkippable: boolean("is_skippable").notNull().default(true),
    skipOffsetSeconds: integer("skip_offset_seconds").notNull().default(5),
    clickThroughUrl: text("click_through_url"),
    qrCodeUrl: text("qr_code_url"),
    callToActionText: text("call_to_action_text").notNull().default("Visit Sponsor"),
    sponsorBadgeText: text("sponsor_badge_text").notNull().default("FamilyFlix Free Streaming Sponsor"),
    companionBannerUrl: text("companion_banner_url"),
    status: text("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_ad_creatives_campaign_id").on(table.campaignId),
    index("idx_ad_creatives_status").on(table.status),
  ]
);

// -------------------------------------------------------------
// 3. AD CUE POINTS (MID-ROLL BREAKS)
// -------------------------------------------------------------
export const adCuePoints = pgTable(
  "ad_cue_points",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    movieId: uuid("movie_id").references(() => movies.id, { onDelete: "cascade" }),
    episodeId: uuid("episode_id").references(() => seriesEpisodes.id, { onDelete: "cascade" }),
    timestampSeconds: integer("timestamp_seconds").notNull(),
    cueType: text("cue_type").notNull().default("default_avod"), // natural_scene_change, imported_chapter, manual_review, default_avod
    label: text("label").notNull().default("Commercial Break"),
    podMaxAds: integer("pod_max_ads").notNull().default(2),
    podMaxDurationSeconds: integer("pod_max_duration_seconds").notNull().default(45),
    safetyIntervalPassed: boolean("safety_interval_passed").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_ad_cue_points_movie_id").on(table.movieId),
    index("idx_ad_cue_points_episode_id").on(table.episodeId),
    index("idx_ad_cue_points_timestamp").on(table.timestampSeconds),
  ]
);

// -------------------------------------------------------------
// 4. AD EVENTS & ANALYTICS
// -------------------------------------------------------------
export const adEvents = pgTable(
  "ad_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    campaignId: uuid("campaign_id").references(() => adCampaigns.id, { onDelete: "set null" }),
    creativeId: uuid("creative_id").references(() => adCreatives.id, { onDelete: "set null" }),
    movieId: uuid("movie_id").references(() => movies.id, { onDelete: "set null" }),
    episodeId: uuid("episode_id").references(() => seriesEpisodes.id, { onDelete: "set null" }),
    sessionId: text("session_id").notNull(),
    eventType: text("event_type").notNull(), // request, start, first_quartile, midpoint, third_quartile, complete, click, skip, error, pause_view
    placement: text("placement").notNull().default("preroll"), // preroll, midroll, pause, interactive
    durationWatched: integer("duration_watched").notNull().default(0),
    adDuration: integer("ad_duration").notNull().default(15),
    estimatedRevenue: numeric("estimated_revenue", { precision: 8, scale: 4 }).notNull().default("0.0000"),
    confirmedRevenue: numeric("confirmed_revenue", { precision: 8, scale: 4 }).notNull().default("0.0000"),
    deviceType: text("device_type").notNull().default("desktop"),
    clientIpHash: text("client_ip_hash"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_ad_events_campaign_id").on(table.campaignId),
    index("idx_ad_events_event_type").on(table.eventType),
    index("idx_ad_events_created_at").on(table.createdAt),
    index("idx_ad_events_session_id").on(table.sessionId),
  ]
);

// -------------------------------------------------------------
// 5. AD FREQUENCY LOGS (FREQUENCY CAPPING)
// -------------------------------------------------------------
export const adFrequencyLogs = pgTable(
  "ad_frequency_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sessionId: text("session_id").notNull(),
    campaignId: uuid("campaign_id").notNull().references(() => adCampaigns.id, { onDelete: "cascade" }),
    creativeId: uuid("creative_id").notNull().references(() => adCreatives.id, { onDelete: "cascade" }),
    placement: text("placement").notNull(),
    servedAt: timestamp("served_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_ad_freq_session_campaign").on(table.sessionId, table.campaignId, table.servedAt),
  ]
);

// -------------------------------------------------------------
// RELATIONS
// -------------------------------------------------------------
export const adCampaignsRelations = relations(adCampaigns, ({ many }) => ({
  creatives: many(adCreatives),
  events: many(adEvents),
}));

export const adCreativesRelations = relations(adCreatives, ({ one, many }) => ({
  campaign: one(adCampaigns, {
    fields: [adCreatives.campaignId],
    references: [adCampaigns.id],
  }),
  events: many(adEvents),
}));

export const adCuePointsRelations = relations(adCuePoints, ({ one }) => ({
  movie: one(movies, {
    fields: [adCuePoints.movieId],
    references: [movies.id],
  }),
  episode: one(seriesEpisodes, {
    fields: [adCuePoints.episodeId],
    references: [seriesEpisodes.id],
  }),
}));

export const adEventsRelations = relations(adEvents, ({ one }) => ({
  campaign: one(adCampaigns, {
    fields: [adEvents.campaignId],
    references: [adCampaigns.id],
  }),
  creative: one(adCreatives, {
    fields: [adEvents.creativeId],
    references: [adCreatives.id],
  }),
  movie: one(movies, {
    fields: [adEvents.movieId],
    references: [movies.id],
  }),
  episode: one(seriesEpisodes, {
    fields: [adEvents.episodeId],
    references: [seriesEpisodes.id],
  }),
}));
