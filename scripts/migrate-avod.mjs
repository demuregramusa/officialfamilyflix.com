import pg from "../lib/db/node_modules/pg/lib/index.js";

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL or POSTGRES_URL environment variable is required for AVOD migration.");
}

const client = new pg.Client({
  connectionString,
  ssl: connectionString.includes("railway.internal") ? false : { rejectUnauthorized: false },
});

async function run() {
  await client.connect();
  console.log("Connected to Railway Postgres! Running AVOD schema migration...");

  await client.query(`
    CREATE TABLE IF NOT EXISTS ad_campaigns (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      advertiser_name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      priority INTEGER NOT NULL DEFAULT 5,
      pricing_model TEXT NOT NULL DEFAULT 'cpm',
      cpm_rate NUMERIC(10,2) NOT NULL DEFAULT 8.50,
      budget NUMERIC(12,2) NOT NULL DEFAULT 1000.00,
      spent NUMERIC(12,2) NOT NULL DEFAULT 0.00,
      start_date TIMESTAMP WITH TIME ZONE,
      end_date TIMESTAMP WITH TIME ZONE,
      placements JSONB NOT NULL DEFAULT '["preroll", "midroll", "pause"]'::jsonb,
      target_genres JSONB NOT NULL DEFAULT '["*"]'::jsonb,
      target_devices JSONB NOT NULL DEFAULT '["desktop", "mobile", "tablet", "connected_tv"]'::jsonb,
      target_geo JSONB NOT NULL DEFAULT '["*"]'::jsonb,
      max_impressions_total INTEGER,
      max_impressions_per_session INTEGER NOT NULL DEFAULT 3,
      max_impressions_per_user_per_day INTEGER NOT NULL DEFAULT 6,
      total_impressions_served INTEGER NOT NULL DEFAULT 0,
      total_completions INTEGER NOT NULL DEFAULT 0,
      total_clicks INTEGER NOT NULL DEFAULT 0,
      vast_tag_url TEXT,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS ad_creatives (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      campaign_id UUID NOT NULL REFERENCES ad_campaigns(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      creative_type TEXT NOT NULL DEFAULT 'video',
      media_url TEXT,
      vast_tag_url TEXT,
      duration_seconds INTEGER NOT NULL DEFAULT 15,
      is_skippable BOOLEAN NOT NULL DEFAULT true,
      skip_offset_seconds INTEGER NOT NULL DEFAULT 5,
      click_through_url TEXT,
      qr_code_url TEXT,
      call_to_action_text TEXT NOT NULL DEFAULT 'Visit Sponsor',
      sponsor_badge_text TEXT NOT NULL DEFAULT 'FamilyFlix Free Streaming Sponsor',
      companion_banner_url TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS ad_cue_points (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      movie_id UUID REFERENCES movies(id) ON DELETE CASCADE,
      episode_id UUID REFERENCES series_episodes(id) ON DELETE CASCADE,
      timestamp_seconds INTEGER NOT NULL,
      cue_type TEXT NOT NULL DEFAULT 'default_avod',
      label TEXT NOT NULL DEFAULT 'Commercial Break',
      pod_max_ads INTEGER NOT NULL DEFAULT 2,
      pod_max_duration_seconds INTEGER NOT NULL DEFAULT 45,
      safety_interval_passed BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS ad_events (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      campaign_id UUID REFERENCES ad_campaigns(id) ON DELETE SET NULL,
      creative_id UUID REFERENCES ad_creatives(id) ON DELETE SET NULL,
      movie_id UUID REFERENCES movies(id) ON DELETE SET NULL,
      episode_id UUID REFERENCES series_episodes(id) ON DELETE SET NULL,
      session_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      placement TEXT NOT NULL DEFAULT 'preroll',
      duration_watched INTEGER NOT NULL DEFAULT 0,
      ad_duration INTEGER NOT NULL DEFAULT 15,
      estimated_revenue NUMERIC(8,4) NOT NULL DEFAULT 0.0000,
      confirmed_revenue NUMERIC(8,4) NOT NULL DEFAULT 0.0000,
      device_type TEXT NOT NULL DEFAULT 'desktop',
      client_ip_hash TEXT,
      user_agent TEXT,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS ad_frequency_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      session_id TEXT NOT NULL,
      campaign_id UUID NOT NULL REFERENCES ad_campaigns(id) ON DELETE CASCADE,
      creative_id UUID NOT NULL REFERENCES ad_creatives(id) ON DELETE CASCADE,
      placement TEXT NOT NULL,
      served_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS idx_ad_campaigns_status ON ad_campaigns(status);
    CREATE INDEX IF NOT EXISTS idx_ad_creatives_campaign_id ON ad_creatives(campaign_id);
    CREATE INDEX IF NOT EXISTS idx_ad_cue_points_timestamp ON ad_cue_points(timestamp_seconds);
    CREATE INDEX IF NOT EXISTS idx_ad_events_session_id ON ad_events(session_id);
    CREATE INDEX IF NOT EXISTS idx_ad_freq_session_campaign ON ad_frequency_logs(session_id, campaign_id, served_at);

    INSERT INTO ad_campaigns (
      id, name, advertiser_name, status, priority, pricing_model, cpm_rate, budget, placements, vast_tag_url
    ) VALUES (
      '00000000-0000-0000-0000-000000000001',
      'Monetag / HilltopAds AVOD Network',
      'Monetag / HilltopAds Zone #7651065',
      'active',
      10,
      'cpm',
      8.50,
      5000.00,
      '["preroll", "midroll", "pause"]'::jsonb,
      'https://crookedagreement.com/d.mwFNzOdIGPN/vhZyGAUT/UeCmO9YubZkU/lJkPPdTmcx2/NTTcEMwnNpjJURtjNCzjYF1_MmT/A/2hOAQv'
    ) ON CONFLICT (id) DO UPDATE SET vast_tag_url = EXCLUDED.vast_tag_url;

    INSERT INTO ad_creatives (
      id, campaign_id, name, creative_type, vast_tag_url, duration_seconds, is_skippable, skip_offset_seconds, click_through_url, call_to_action_text, sponsor_badge_text, status
    ) VALUES (
      '00000000-0000-0000-0000-000000000002',
      '00000000-0000-0000-0000-000000000001',
      'Zone #7651065 VAST 3.0 / 4.0 Feed Spot',
      'vast_tag',
      'https://crookedagreement.com/d.mwFNzOdIGPN/vhZyGAUT/UeCmO9YubZkU/lJkPPdTmcx2/NTTcEMwnNpjJURtjNCzjYF1_MmT/A/2hOAQv',
      15,
      true,
      5,
      'https://familyflix.demuregram.com',
      'Visit Sponsor',
      'Monetag / HilltopAds Official AVOD Sponsor',
      'active'
    ) ON CONFLICT (id) DO UPDATE SET vast_tag_url = EXCLUDED.vast_tag_url;
  `);

  console.log("AVOD schema migration completed successfully!");
  await client.end();
}

run().catch((err) => {
  console.error("Migration error:", err);
  process.exit(1);
});
