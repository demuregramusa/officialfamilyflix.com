CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enums
DO $$ BEGIN
    CREATE TYPE title_kind AS ENUM('movie', 'series', 'live');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE movie_status AS ENUM('draft', 'published', 'archived');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE archive_import_status AS ENUM('validated', 'running', 'paused', 'completed', 'failed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE license_type AS ENUM(
      'owned', 'public_domain', 'creative_commons', 'licensed', 'unlicensed',
      'cc_by_4_0', 'cc_by_sa_4_0', 'cc_by_nd_4_0', 'cc_by_nc_4_0',
      'cc_by_nc_sa_4_0', 'cc_by_nc_nd_4_0', 'cc0_1_0', 'authorized'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE rights_review_status AS ENUM('pending', 'approved', 'rejected', 'restricted');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE media_asset_kind AS ENUM('main_video', 'poster', 'backdrop', 'photo', 'artwork', 'audio', 'subtitle', 'other');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE video_provider AS ENUM('cloudflare', 'manual', 'demo');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE video_status AS ENUM('pending_upload', 'processing', 'ready', 'error', 'disabled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE copyright_case_type AS ENUM('copyright_report', 'counter_notice');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE copyright_case_status AS ENUM('open', 'under_review', 'restricted', 'counter_notice_received', 'resolved', 'rejected', 'closed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Auth tables
CREATE TABLE IF NOT EXISTS "user" (
  id text PRIMARY KEY,
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  email_verified boolean DEFAULT false NOT NULL,
  image text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  role text,
  banned boolean DEFAULT false,
  ban_reason text,
  ban_expires timestamp with time zone,
  favorite_genres jsonb DEFAULT '[]'::jsonb NOT NULL,
  onboarded boolean DEFAULT false NOT NULL
);

CREATE TABLE IF NOT EXISTS "session" (
  id text PRIMARY KEY,
  expires_at timestamp with time zone NOT NULL,
  token text NOT NULL UNIQUE,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  ip_address text,
  user_agent text,
  user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  impersonated_by text
);
CREATE INDEX IF NOT EXISTS session_userId_idx ON "session"(user_id);

CREATE TABLE IF NOT EXISTS "account" (
  id text PRIMARY KEY,
  account_id text NOT NULL,
  provider_id text NOT NULL,
  user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  access_token text,
  refresh_token text,
  id_token text,
  access_token_expires_at timestamp with time zone,
  refresh_token_expires_at timestamp with time zone,
  scope text,
  password text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS account_userId_idx ON "account"(user_id);

CREATE TABLE IF NOT EXISTS "verification" (
  id text PRIMARY KEY,
  identifier text NOT NULL,
  value text NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS verification_identifier_idx ON "verification"(identifier);

-- FamilyFlix catalog tables
CREATE TABLE IF NOT EXISTS "movies" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  kind title_kind NOT NULL DEFAULT 'movie',
  tagline text,
  synopsis text NOT NULL DEFAULT '',
  year integer,
  rating text,
  score integer NOT NULL DEFAULT 0,
  duration_minutes integer,
  seasons integer,
  badge text,
  tmdb_id integer,
  image_id text,
  palette jsonb,
  poster_url text,
  backdrop_url text,
  "cast" jsonb NOT NULL DEFAULT '[]'::jsonb,
  creator text,
  creator_attribution text,
  episodes jsonb NOT NULL DEFAULT '[]'::jsonb,
  live jsonb,
  featured boolean NOT NULL DEFAULT false,
  status movie_status NOT NULL DEFAULT 'draft',
  published_at timestamp with time zone,
  rights_holder text,
  license_type license_type NOT NULL DEFAULT 'unlicensed',
  license_territory text DEFAULT 'Worldwide',
  license_expires_at timestamp with time zone,
  source_url text,
  rights_confirmed_at timestamp with time zone,
  created_by text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS movies_status_idx ON "movies"(status);
CREATE INDEX IF NOT EXISTS movies_kind_idx ON "movies"(kind);

CREATE TABLE IF NOT EXISTS "archive_import_jobs" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  archive_name text NOT NULL,
  archive_sha256 text NOT NULL UNIQUE,
  status archive_import_status NOT NULL DEFAULT 'validated',
  created_by text REFERENCES "user"(id) ON DELETE RESTRICT,
  total_pages integer NOT NULL DEFAULT 0,
  next_page_index integer NOT NULL DEFAULT 0,
  total_records integer NOT NULL DEFAULT 0,
  expected_new_titles integer NOT NULL DEFAULT 0,
  expected_matched_titles integer NOT NULL DEFAULT 0,
  expected_source_records integer NOT NULL DEFAULT 0,
  expected_torrent_sources integer NOT NULL DEFAULT 0,
  processed_records integer NOT NULL DEFAULT 0,
  created_titles integer NOT NULL DEFAULT 0,
  matched_titles integer NOT NULL DEFAULT 0,
  updated_titles integer NOT NULL DEFAULT 0,
  duplicate_records integer NOT NULL DEFAULT 0,
  duplicate_source_records integer NOT NULL DEFAULT 0,
  duplicate_imdb_records integer NOT NULL DEFAULT 0,
  imported_source_records integer NOT NULL DEFAULT 0,
  imported_torrent_sources integer NOT NULL DEFAULT 0,
  malformed_pages integer NOT NULL DEFAULT 0,
  recovered_records integer NOT NULL DEFAULT 0,
  skipped_records integer NOT NULL DEFAULT 0,
  failed_records integer NOT NULL DEFAULT 0,
  issues jsonb NOT NULL DEFAULT '[]'::jsonb,
  last_error text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "imported_movie_sources" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  movie_id uuid NOT NULL REFERENCES "movies"(id) ON DELETE CASCADE,
  import_job_id uuid REFERENCES "archive_import_jobs"(id) ON DELETE RESTRICT,
  provider text NOT NULL,
  source_id text NOT NULL,
  imdb_code text,
  source_url text,
  metadata jsonb NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT imported_movie_sources_provider_source_unique UNIQUE (provider, source_id)
);
CREATE INDEX IF NOT EXISTS imported_movie_sources_movie_idx ON "imported_movie_sources"(movie_id);
CREATE INDEX IF NOT EXISTS imported_movie_sources_imdb_idx ON "imported_movie_sources"(imdb_code);

CREATE TABLE IF NOT EXISTS "imported_torrent_sources" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  movie_source_id uuid NOT NULL REFERENCES "imported_movie_sources"(id) ON DELETE CASCADE,
  source_index integer NOT NULL,
  source_url text,
  info_hash text,
  quality text,
  source_type text,
  is_repack boolean,
  video_codec text,
  bit_depth text,
  audio_channels text,
  seeders integer,
  peers integer,
  size text,
  size_bytes bigint,
  uploaded_at text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  playback_status text NOT NULL DEFAULT 'disabled',
  rights_status text NOT NULL DEFAULT 'unverified',
  rights_evidence_url text,
  rights_evidence_notes text,
  rights_review_note text,
  rights_reviewed_by text,
  rights_reviewed_at timestamp with time zone,
  activated_by text,
  activated_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS imported_torrent_sources_parent_idx ON "imported_torrent_sources"(movie_source_id);

CREATE TABLE IF NOT EXISTS "series_seasons" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  movie_id uuid NOT NULL REFERENCES "movies"(id) ON DELETE CASCADE,
  season_number integer NOT NULL,
  name text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT series_seasons_title_number_unique UNIQUE (movie_id, season_number)
);

CREATE TABLE IF NOT EXISTS "series_episodes" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id uuid NOT NULL REFERENCES "series_seasons"(id) ON DELETE CASCADE,
  episode_number integer NOT NULL,
  name text NOT NULL,
  synopsis text NOT NULL DEFAULT '',
  duration_minutes integer,
  status movie_status NOT NULL DEFAULT 'draft',
  published_at timestamp with time zone,
  created_by text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT series_episodes_season_number_unique UNIQUE (season_id, episode_number)
);
CREATE INDEX IF NOT EXISTS series_episodes_status_idx ON "series_episodes"(status);

CREATE TABLE IF NOT EXISTS "media_rights" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  movie_id uuid REFERENCES "movies"(id) ON DELETE CASCADE,
  episode_id uuid REFERENCES "series_episodes"(id) ON DELETE CASCADE,
  asset_kind media_asset_kind NOT NULL,
  asset_label text NOT NULL,
  asset_url text NOT NULL,
  rights_holder text NOT NULL,
  creator_attribution text NOT NULL,
  license_type license_type NOT NULL,
  license_version text NOT NULL,
  license_url text NOT NULL,
  usage_restrictions text[] NOT NULL DEFAULT '{}',
  source_url text NOT NULL,
  evidence_url text,
  evidence_notes text,
  territory text,
  expires_at timestamp with time zone,
  uploader_attested boolean NOT NULL DEFAULT false,
  uploader_id text,
  submitted_at timestamp with time zone NOT NULL DEFAULT now(),
  review_status rights_review_status NOT NULL DEFAULT 'pending',
  reviewed_by text,
  reviewed_at timestamp with time zone,
  review_notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS media_rights_movie_idx ON "media_rights"(movie_id);
CREATE INDEX IF NOT EXISTS media_rights_episode_idx ON "media_rights"(episode_id);
CREATE INDEX IF NOT EXISTS media_rights_review_status_idx ON "media_rights"(review_status);
CREATE INDEX IF NOT EXISTS media_rights_asset_kind_idx ON "media_rights"(asset_kind);

CREATE TABLE IF NOT EXISTS "genres" (
  id serial PRIMARY KEY,
  name text NOT NULL,
  slug text NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS "movie_genres" (
  movie_id uuid NOT NULL REFERENCES "movies"(id) ON DELETE CASCADE,
  genre_id integer NOT NULL REFERENCES "genres"(id) ON DELETE CASCADE,
  PRIMARY KEY (movie_id, genre_id)
);
CREATE INDEX IF NOT EXISTS movie_genres_genre_idx ON "movie_genres"(genre_id);

CREATE TABLE IF NOT EXISTS "video_assets" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  movie_id uuid REFERENCES "movies"(id) ON DELETE CASCADE,
  episode_id uuid REFERENCES "series_episodes"(id) ON DELETE CASCADE,
  media_right_id uuid REFERENCES "media_rights"(id) ON DELETE SET NULL,
  provider video_provider NOT NULL DEFAULT 'manual',
  provider_asset_id text,
  playback_id text,
  hls_url text,
  mp4_url text,
  thumbnail_url text,
  status video_status NOT NULL DEFAULT 'pending_upload',
  duration_seconds integer,
  size_bytes bigint,
  width integer,
  height integer,
  error text,
  signed_playback boolean NOT NULL DEFAULT true,
  created_by text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "subtitles" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  movie_id uuid NOT NULL REFERENCES "movies"(id) ON DELETE CASCADE,
  media_right_id uuid REFERENCES "media_rights"(id) ON DELETE SET NULL,
  language text NOT NULL,
  label text NOT NULL,
  url text NOT NULL,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "user_favorites" (
  user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  movie_id uuid NOT NULL REFERENCES "movies"(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, movie_id)
);

CREATE TABLE IF NOT EXISTS "playback_progress" (
  user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  movie_id uuid NOT NULL REFERENCES "movies"(id) ON DELETE CASCADE,
  episode_id uuid REFERENCES "series_episodes"(id) ON DELETE CASCADE,
  progress_seconds integer NOT NULL,
  duration_seconds integer NOT NULL,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS playback_progress_movie_unique
  ON "playback_progress"(user_id, movie_id)
  WHERE episode_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS playback_progress_episode_unique
  ON "playback_progress"(user_id, episode_id)
  WHERE episode_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS "audit_logs" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text,
  user_email text,
  action text NOT NULL,
  entity text NOT NULL,
  entity_id text,
  detail jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "site_settings" (
  id text PRIMARY KEY DEFAULT 'default',
  value jsonb NOT NULL,
  updated_by text,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "copyright_cases" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_number text NOT NULL UNIQUE,
  case_type copyright_case_type NOT NULL,
  status copyright_case_status NOT NULL DEFAULT 'open',
  movie_id uuid REFERENCES "movies"(id) ON DELETE SET NULL,
  related_case_id uuid,
  reporter_name text NOT NULL,
  reporter_email text NOT NULL,
  summary text NOT NULL,
  payload jsonb NOT NULL,
  submitted_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  reviewed_by text,
  reviewed_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS "copyright_case_events" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES "copyright_cases"(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  actor_user_id text,
  actor_name text NOT NULL,
  note text NOT NULL DEFAULT '',
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "repeat_infringers" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  case_id uuid REFERENCES "copyright_cases"(id) ON DELETE SET NULL,
  reason text NOT NULL,
  recorded_by text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
