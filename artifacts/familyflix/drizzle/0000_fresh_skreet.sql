CREATE TYPE "public"."license_type" AS ENUM('owned', 'public_domain', 'creative_commons', 'licensed', 'unlicensed');--> statement-breakpoint
CREATE TYPE "public"."movie_status" AS ENUM('draft', 'published', 'archived');--> statement-breakpoint
CREATE TYPE "public"."title_kind" AS ENUM('movie', 'series', 'live');--> statement-breakpoint
CREATE TYPE "public"."video_provider" AS ENUM('cloudflare', 'manual', 'demo');--> statement-breakpoint
CREATE TYPE "public"."video_status" AS ENUM('pending_upload', 'processing', 'ready', 'error', 'disabled');--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text,
	"user_email" text,
	"action" text NOT NULL,
	"entity" text NOT NULL,
	"entity_id" text,
	"detail" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "genres" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "movie_genres" (
	"movie_id" uuid NOT NULL,
	"genre_id" integer NOT NULL,
	CONSTRAINT "movie_genres_movie_id_genre_id_pk" PRIMARY KEY("movie_id","genre_id")
);
--> statement-breakpoint
CREATE TABLE "movies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"kind" "title_kind" DEFAULT 'movie' NOT NULL,
	"tagline" text,
	"synopsis" text DEFAULT '' NOT NULL,
	"year" integer,
	"rating" text,
	"score" integer DEFAULT 0 NOT NULL,
	"duration_minutes" integer,
	"seasons" integer,
	"badge" text,
	"image_id" text,
	"palette" jsonb,
	"poster_url" text,
	"backdrop_url" text,
	"cast" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"episodes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"live" jsonb,
	"featured" boolean DEFAULT false NOT NULL,
	"status" "movie_status" DEFAULT 'draft' NOT NULL,
	"published_at" timestamp with time zone,
	"rights_holder" text,
	"license_type" "license_type" DEFAULT 'unlicensed' NOT NULL,
	"license_territory" text DEFAULT 'Worldwide',
	"license_expires_at" timestamp with time zone,
	"source_url" text,
	"rights_confirmed_at" timestamp with time zone,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subtitles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"movie_id" uuid NOT NULL,
	"language" text NOT NULL,
	"label" text NOT NULL,
	"url" text NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "video_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"movie_id" uuid NOT NULL,
	"provider" "video_provider" DEFAULT 'manual' NOT NULL,
	"provider_asset_id" text,
	"playback_id" text,
	"hls_url" text,
	"mp4_url" text,
	"thumbnail_url" text,
	"status" "video_status" DEFAULT 'pending_upload' NOT NULL,
	"duration_seconds" integer,
	"size_bytes" bigint,
	"width" integer,
	"height" integer,
	"error" text,
	"signed_playback" boolean DEFAULT true NOT NULL,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	"impersonated_by" text,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"role" text,
	"banned" boolean DEFAULT false,
	"ban_reason" text,
	"ban_expires" timestamp,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "movie_genres" ADD CONSTRAINT "movie_genres_movie_id_movies_id_fk" FOREIGN KEY ("movie_id") REFERENCES "public"."movies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movie_genres" ADD CONSTRAINT "movie_genres_genre_id_genres_id_fk" FOREIGN KEY ("genre_id") REFERENCES "public"."genres"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subtitles" ADD CONSTRAINT "subtitles_movie_id_movies_id_fk" FOREIGN KEY ("movie_id") REFERENCES "public"."movies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_assets" ADD CONSTRAINT "video_assets_movie_id_movies_id_fk" FOREIGN KEY ("movie_id") REFERENCES "public"."movies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_logs_created_idx" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "genres_slug_unique" ON "genres" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "movie_genres_genre_idx" ON "movie_genres" USING btree ("genre_id");--> statement-breakpoint
CREATE UNIQUE INDEX "movies_slug_unique" ON "movies" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "movies_status_idx" ON "movies" USING btree ("status");--> statement-breakpoint
CREATE INDEX "movies_kind_idx" ON "movies" USING btree ("kind");--> statement-breakpoint
CREATE UNIQUE INDEX "subtitles_movie_language_unique" ON "subtitles" USING btree ("movie_id","language");--> statement-breakpoint
CREATE UNIQUE INDEX "video_assets_movie_unique" ON "video_assets" USING btree ("movie_id");--> statement-breakpoint
CREATE INDEX "video_assets_status_idx" ON "video_assets" USING btree ("status");--> statement-breakpoint
CREATE INDEX "account_userId_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_userId_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");