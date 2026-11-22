import pg from "../node_modules/.pnpm/pg@8.23.1/node_modules/pg/lib/index.js";

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL || "postgresql://postgres@localhost:5432/familyflix",
});

await client.connect();

try {
  console.log("Setting up developer platform tables in PostgreSQL...");

  await client.query(`
    CREATE EXTENSION IF NOT EXISTS "pgcrypto";

    CREATE TABLE IF NOT EXISTS developer_organizations (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      name text NOT NULL,
      slug text NOT NULL UNIQUE,
      owner_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
      billing_email text,
      created_at timestamp with time zone DEFAULT now() NOT NULL,
      updated_at timestamp with time zone DEFAULT now() NOT NULL
    );

    CREATE TABLE IF NOT EXISTS developer_projects (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id uuid NOT NULL REFERENCES developer_organizations(id) ON DELETE CASCADE,
      name text NOT NULL,
      environment text NOT NULL DEFAULT 'development',
      description text,
      created_at timestamp with time zone DEFAULT now() NOT NULL,
      updated_at timestamp with time zone DEFAULT now() NOT NULL
    );
    CREATE INDEX IF NOT EXISTS dev_projects_org_idx ON developer_projects(organization_id);

    CREATE TABLE IF NOT EXISTS api_key_credentials (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      project_id uuid NOT NULL REFERENCES developer_projects(id) ON DELETE CASCADE,
      name text NOT NULL,
      key_prefix text NOT NULL,
      key_display text NOT NULL,
      key_hash text NOT NULL UNIQUE,
      scopes jsonb NOT NULL DEFAULT '["*"]'::jsonb,
      rate_limit_per_min integer NOT NULL DEFAULT 60,
      rate_limit_per_day integer NOT NULL DEFAULT 10000,
      monthly_spend_limit_cents integer NOT NULL DEFAULT 10000,
      current_month_spend_cents integer NOT NULL DEFAULT 0,
      status text NOT NULL DEFAULT 'active',
      expires_at timestamp with time zone,
      last_used_at timestamp with time zone,
      created_at timestamp with time zone DEFAULT now() NOT NULL,
      updated_at timestamp with time zone DEFAULT now() NOT NULL
    );
    CREATE INDEX IF NOT EXISTS api_keys_project_idx ON api_key_credentials(project_id);
    CREATE INDEX IF NOT EXISTS api_keys_status_idx ON api_key_credentials(status);

    CREATE TABLE IF NOT EXISTS api_products (
      id text PRIMARY KEY,
      name text NOT NULL,
      description text NOT NULL,
      created_at timestamp with time zone DEFAULT now() NOT NULL
    );

    CREATE TABLE IF NOT EXISTS api_plans (
      id text PRIMARY KEY,
      product_id text NOT NULL REFERENCES api_products(id) ON DELETE CASCADE,
      tier text NOT NULL,
      billing_interval text NOT NULL,
      name text NOT NULL,
      price_usd numeric(10, 2) NOT NULL,
      requests_per_month integer NOT NULL,
      requests_per_minute integer NOT NULL,
      ai_tokens_per_month integer NOT NULL DEFAULT 0,
      features jsonb NOT NULL DEFAULT '[]'::jsonb,
      is_active boolean NOT NULL DEFAULT true,
      created_at timestamp with time zone DEFAULT now() NOT NULL,
      updated_at timestamp with time zone DEFAULT now() NOT NULL
    );

    CREATE TABLE IF NOT EXISTS developer_subscriptions (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id uuid NOT NULL REFERENCES developer_organizations(id) ON DELETE CASCADE,
      user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
      plan_id text NOT NULL REFERENCES api_plans(id) ON DELETE RESTRICT,
      product_id text NOT NULL REFERENCES api_products(id) ON DELETE RESTRICT,
      status text NOT NULL DEFAULT 'active',
      current_period_start timestamp with time zone DEFAULT now() NOT NULL,
      current_period_end timestamp with time zone NOT NULL,
      cancel_at_period_end boolean NOT NULL DEFAULT false,
      payment_method text DEFAULT 'card',
      stripe_subscription_id text,
      created_at timestamp with time zone DEFAULT now() NOT NULL,
      updated_at timestamp with time zone DEFAULT now() NOT NULL
    );
    CREATE INDEX IF NOT EXISTS dev_subs_org_idx ON developer_subscriptions(organization_id);

    CREATE TABLE IF NOT EXISTS credit_wallets (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id uuid NOT NULL REFERENCES developer_organizations(id) ON DELETE CASCADE,
      wallet_type text NOT NULL,
      balance_credits bigint NOT NULL DEFAULT 0,
      auto_recharge_enabled boolean NOT NULL DEFAULT false,
      auto_recharge_threshold integer NOT NULL DEFAULT 100,
      auto_recharge_amount integer NOT NULL DEFAULT 1000,
      created_at timestamp with time zone DEFAULT now() NOT NULL,
      updated_at timestamp with time zone DEFAULT now() NOT NULL,
      CONSTRAINT credit_wallets_org_type_unique UNIQUE(organization_id, wallet_type)
    );

    CREATE TABLE IF NOT EXISTS credit_transactions (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      wallet_id uuid NOT NULL REFERENCES credit_wallets(id) ON DELETE CASCADE,
      type text NOT NULL,
      amount_credits bigint NOT NULL,
      balance_after bigint NOT NULL,
      description text NOT NULL,
      reference_id text,
      created_at timestamp with time zone DEFAULT now() NOT NULL
    );
    CREATE INDEX IF NOT EXISTS credit_tx_wallet_idx ON credit_transactions(wallet_id);
    CREATE INDEX IF NOT EXISTS credit_tx_created_idx ON credit_transactions(created_at);

    CREATE TABLE IF NOT EXISTS api_usage_events (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      key_id uuid REFERENCES api_key_credentials(id) ON DELETE SET NULL,
      project_id uuid REFERENCES developer_projects(id) ON DELETE SET NULL,
      organization_id uuid REFERENCES developer_organizations(id) ON DELETE CASCADE,
      endpoint text NOT NULL,
      method text NOT NULL,
      status_code integer NOT NULL,
      latency_ms integer NOT NULL DEFAULT 0,
      tokens_used integer NOT NULL DEFAULT 0,
      credits_deducted integer NOT NULL DEFAULT 0,
      ip_address text,
      created_at timestamp with time zone DEFAULT now() NOT NULL
    );
    CREATE INDEX IF NOT EXISTS api_usage_key_idx ON api_usage_events(key_id);
    CREATE INDEX IF NOT EXISTS api_usage_org_created_idx ON api_usage_events(organization_id, created_at);

    CREATE TABLE IF NOT EXISTS ai_model_registry (
      id text PRIMARY KEY,
      name text NOT NULL,
      description text NOT NULL,
      provider text NOT NULL DEFAULT 'familyflix_ai',
      capabilities jsonb NOT NULL DEFAULT '[]'::jsonb,
      context_window integer NOT NULL DEFAULT 32768,
      max_output_tokens integer NOT NULL DEFAULT 4096,
      input_token_price_per_1m numeric(10, 4) NOT NULL DEFAULT 0.1500,
      output_token_price_per_1m numeric(10, 4) NOT NULL DEFAULT 0.6000,
      rate_limit_rpm integer NOT NULL DEFAULT 120,
      is_active boolean NOT NULL DEFAULT true,
      created_at timestamp with time zone DEFAULT now() NOT NULL,
      updated_at timestamp with time zone DEFAULT now() NOT NULL
    );

    CREATE TABLE IF NOT EXISTS developer_invoices (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id uuid NOT NULL REFERENCES developer_organizations(id) ON DELETE CASCADE,
      invoice_number text NOT NULL UNIQUE,
      amount_usd numeric(10, 2) NOT NULL,
      currency text NOT NULL DEFAULT 'USD',
      status text NOT NULL DEFAULT 'paid',
      description text NOT NULL,
      paid_at timestamp with time zone,
      download_url text,
      created_at timestamp with time zone DEFAULT now() NOT NULL
    );

    CREATE TABLE IF NOT EXISTS developer_webhooks (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id uuid NOT NULL REFERENCES developer_organizations(id) ON DELETE CASCADE,
      url text NOT NULL,
      secret text NOT NULL,
      events jsonb NOT NULL DEFAULT '["*"]'::jsonb,
      is_active boolean NOT NULL DEFAULT true,
      created_at timestamp with time zone DEFAULT now() NOT NULL,
      updated_at timestamp with time zone DEFAULT now() NOT NULL
    );
  `);

  console.log("Seeding API products...");
  await client.query(`
    INSERT INTO api_products (id, name, description) VALUES
      ('movies_api', 'FamilyFlix Movies & TV API', 'Production metadata, streaming availability, catalog discovery, and credit endpoints for movies and series.'),
      ('ai_api', 'FamilyFlix AI Intelligence API', 'Semantic vector recommendations, natural language catalog search, and automatic metadata enrichment.'),
      ('bundle', 'FamilyFlix Developer Bundle', 'Unified enterprise access combining Movies & TV API with AI Intelligence at bundled discount rates.')
    ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;
  `);

  console.log("Seeding API plans (Starter, Professional, Enterprise — Monthly and Yearly)...");
  const plans = [
    // Movies API Plans
    { id: "movies_starter_monthly", prod: "movies_api", tier: "starter", interval: "monthly", name: "Movies API Starter", price: 19.00, reqMonth: 100000, reqMin: 120, tokens: 0, feat: ["100,000 requests/month", "Full 23,000+ title catalog metadata", "120 req/min rate limit", "Standard email support"] },
    { id: "movies_starter_yearly", prod: "movies_api", tier: "starter", interval: "yearly", name: "Movies API Starter (Yearly)", price: 190.00, reqMonth: 100000, reqMin: 120, tokens: 0, feat: ["100,000 requests/month", "2 months free (Save 17%)", "120 req/min rate limit", "Standard email support"] },
    { id: "movies_pro_monthly", prod: "movies_api", tier: "professional", interval: "monthly", name: "Movies API Professional", price: 79.00, reqMonth: 1000000, reqMin: 600, tokens: 0, feat: ["1,000,000 requests/month", "Real-time streaming availability & rights API", "600 req/min rate limit", "Priority API webhook delivery", "Priority support"] },
    { id: "movies_pro_yearly", prod: "movies_api", tier: "professional", interval: "yearly", name: "Movies API Professional (Yearly)", price: 790.00, reqMonth: 1000000, reqMin: 600, tokens: 0, feat: ["1,000,000 requests/month", "2 months free (Save 17%)", "600 req/min rate limit", "Priority support"] },
    { id: "movies_enterprise_monthly", prod: "movies_api", tier: "enterprise", interval: "monthly", name: "Movies API Enterprise", price: 299.00, reqMonth: 10000000, reqMin: 3000, tokens: 0, feat: ["10,000,000 requests/month", "Unlimited team projects & custom scopes", "3,000 req/min high-burst rate limit", "99.9% uptime SLA", "Dedicated technical account manager"] },
    { id: "movies_enterprise_yearly", prod: "movies_api", tier: "enterprise", interval: "yearly", name: "Movies API Enterprise (Yearly)", price: 2990.00, reqMonth: 10000000, reqMin: 3000, tokens: 0, feat: ["10,000,000 requests/month", "Save $598/year", "3,000 req/min rate limit", "99.9% SLA & dedicated support"] },

    // AI API Plans
    { id: "ai_starter_monthly", prod: "ai_api", tier: "starter", interval: "monthly", name: "AI API Starter", price: 29.00, reqMonth: 50000, reqMin: 60, tokens: 2000000, feat: ["2,000,000 AI tokens/month", "Access to demure-search-v1 and demure-rec-v1", "Natural-language catalog queries", "60 req/min rate limit"] },
    { id: "ai_starter_yearly", prod: "ai_api", tier: "starter", interval: "yearly", name: "AI API Starter (Yearly)", price: 290.00, reqMonth: 50000, reqMin: 60, tokens: 2000000, feat: ["2,000,000 AI tokens/month", "2 months free (Save 17%)", "demure-search-v1 & demure-rec-v1", "60 req/min rate limit"] },
    { id: "ai_pro_monthly", prod: "ai_api", tier: "professional", interval: "monthly", name: "AI API Professional", price: 99.00, reqMonth: 500000, reqMin: 300, tokens: 20000000, feat: ["20,000,000 AI tokens/month", "All AI models including demure-meta-v1 & demure-chat-v1", "Deep semantic vector recommendations", "300 req/min rate limit"] },
    { id: "ai_pro_yearly", prod: "ai_api", tier: "professional", interval: "yearly", name: "AI API Professional (Yearly)", price: 990.00, reqMonth: 500000, reqMin: 300, tokens: 20000000, feat: ["20,000,000 AI tokens/month", "Save $198/year", "300 req/min rate limit", "Priority model queue"] },
    { id: "ai_enterprise_monthly", prod: "ai_api", tier: "enterprise", interval: "monthly", name: "AI API Enterprise", price: 399.00, reqMonth: 5000000, reqMin: 1200, tokens: 200000000, feat: ["200,000,000 AI tokens/month", "Dedicated model instance allocation", "1,200 req/min rate limit", "Custom metadata fine-tuning assistance", "Enterprise SLA"] },
    { id: "ai_enterprise_yearly", prod: "ai_api", tier: "enterprise", interval: "yearly", name: "AI API Enterprise (Yearly)", price: 3990.00, reqMonth: 5000000, reqMin: 1200, tokens: 200000000, feat: ["200,000,000 AI tokens/month", "Save $798/year", "1,200 req/min rate limit", "Enterprise SLA"] },

    // Developer Bundle Plans
    { id: "bundle_starter_monthly", prod: "bundle", tier: "starter", interval: "monthly", name: "Developer Bundle Starter", price: 39.00, reqMonth: 150000, reqMin: 180, tokens: 2000000, feat: ["Includes Movies API Starter + AI API Starter", "Save $9/month vs individual plans", "100k Movies calls + 2M AI tokens", "Independent credit ledger management"] },
    { id: "bundle_starter_yearly", prod: "bundle", tier: "starter", interval: "yearly", name: "Developer Bundle Starter (Yearly)", price: 390.00, reqMonth: 150000, reqMin: 180, tokens: 2000000, feat: ["Movies Starter + AI Starter Yearly", "Save $90/year", "Full bundled features"] },
    { id: "bundle_pro_monthly", prod: "bundle", tier: "professional", interval: "monthly", name: "Developer Bundle Professional", price: 149.00, reqMonth: 1500000, reqMin: 800, tokens: 20000000, feat: ["Includes Movies API Pro + AI API Pro", "Save $29/month vs individual plans", "1M Movies calls + 20M AI tokens", "Dedicated developer support"] },
    { id: "bundle_pro_yearly", prod: "bundle", tier: "professional", interval: "yearly", name: "Developer Bundle Professional (Yearly)", price: 1490.00, reqMonth: 1500000, reqMin: 800, tokens: 20000000, feat: ["Movies Pro + AI Pro Yearly", "Save $290/year", "800 req/min rate limit"] },
    { id: "bundle_enterprise_monthly", prod: "bundle", tier: "enterprise", interval: "monthly", name: "Developer Bundle Enterprise", price: 549.00, reqMonth: 15000000, reqMin: 4000, tokens: 200000000, feat: ["Includes Movies API Enterprise + AI Enterprise", "Save $149/month vs individual plans", "10M Movies calls + 200M AI tokens", "Custom enterprise contract & invoicing"] },
    { id: "bundle_enterprise_yearly", prod: "bundle", tier: "enterprise", interval: "yearly", name: "Developer Bundle Enterprise (Yearly)", price: 5490.00, reqMonth: 15000000, reqMin: 4000, tokens: 200000000, feat: ["Movies Enterprise + AI Enterprise Yearly", "Save $1,490/year", "4,000 req/min rate limit"] },
  ];

  for (const p of plans) {
    await client.query(`
      INSERT INTO api_plans (id, product_id, tier, billing_interval, name, price_usd, requests_per_month, requests_per_minute, ai_tokens_per_month, features, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true)
      ON CONFLICT (id) DO UPDATE SET
        price_usd = EXCLUDED.price_usd,
        requests_per_month = EXCLUDED.requests_per_month,
        requests_per_minute = EXCLUDED.requests_per_minute,
        ai_tokens_per_month = EXCLUDED.ai_tokens_per_month,
        features = EXCLUDED.features;
    `, [p.id, p.prod, p.tier, p.interval, p.name, p.price, p.reqMonth, p.reqMin, p.tokens, JSON.stringify(p.feat)]);
  }

  console.log("Seeding AI models in registry...");
  const models = [
    {
      id: "demure-rec-v1",
      name: "FamilyFlix Demure Recommendation Engine v1",
      desc: "Deep semantic recommendation model optimized for cinematic taste matching, mood vectors, and personalized discovery.",
      provider: "familyflix_ai",
      caps: ["recommendations", "similar_titles", "mood_analysis", "profile_taste"],
      ctx: 32768,
      out: 4096,
      inPrice: 0.1500,
      outPrice: 0.6000,
      rpm: 120,
    },
    {
      id: "demure-search-v1",
      name: "FamilyFlix Natural Language Semantic Search v1",
      desc: "Converts conversational queries into high-precision catalog filters and ranked title results.",
      provider: "familyflix_ai",
      caps: ["semantic_search", "natural_language_filter", "synopsis_embedding"],
      ctx: 16384,
      out: 2048,
      inPrice: 0.1000,
      outPrice: 0.4000,
      rpm: 180,
    },
    {
      id: "demure-meta-v1",
      name: "FamilyFlix Metadata & Taxonomy Enrichment v1",
      desc: "Automatically classifies genres, generates content advisories, subgenres, and keywords from title synopses.",
      provider: "familyflix_ai",
      caps: ["genre_classification", "subgenre_tagging", "content_advisory", "summarization"],
      ctx: 32768,
      out: 4096,
      inPrice: 0.2000,
      outPrice: 0.8000,
      rpm: 60,
    },
    {
      id: "demure-chat-v1",
      name: "FamilyFlix Streaming Concierge Assistant v1",
      desc: "Interactive AI streaming assistant for viewers and developers to discover entertainment and catalog insights.",
      provider: "familyflix_ai",
      caps: ["chat", "concierge", "curation", "trivia"],
      ctx: 32768,
      out: 4096,
      inPrice: 0.2500,
      outPrice: 1.0000,
      rpm: 90,
    },
  ];

  for (const m of models) {
    await client.query(`
      INSERT INTO ai_model_registry (id, name, description, provider, capabilities, context_window, max_output_tokens, input_token_price_per_1m, output_token_price_per_1m, rate_limit_rpm, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        capabilities = EXCLUDED.capabilities,
        rate_limit_rpm = EXCLUDED.rate_limit_rpm;
    `, [m.id, m.name, m.desc, m.provider, JSON.stringify(m.caps), m.ctx, m.out, m.inPrice, m.outPrice, m.rpm]);
  }

  // Ensure admin user has an initial organization, project, API key, and wallets so they can immediately test
  const adminRes = await client.query('SELECT id, name, email FROM "user" WHERE LOWER(email) = $1', ["iam23yhb@gmail.com"]);
  if (adminRes.rows.length > 0) {
    const adminUser = adminRes.rows[0];
    console.log(`Setting up default Developer Organization for Admin (${adminUser.email})...`);

    let orgId;
    const orgCheck = await client.query('SELECT id FROM developer_organizations WHERE owner_id = $1', [adminUser.id]);
    if (orgCheck.rows.length === 0) {
      const orgIns = await client.query(`
        INSERT INTO developer_organizations (name, slug, owner_id, billing_email)
        VALUES ('DemureGram Studios', 'demuregram-studios', $1, $2)
        RETURNING id
      `, [adminUser.id, adminUser.email]);
      orgId = orgIns.rows[0].id;
    } else {
      orgId = orgCheck.rows[0].id;
    }

    // Wallets for movies_api and ai_api
    await client.query(`
      INSERT INTO credit_wallets (organization_id, wallet_type, balance_credits)
      VALUES ($1, 'movies_api', 500000)
      ON CONFLICT (organization_id, wallet_type) DO NOTHING
    `, [orgId]);

    await client.query(`
      INSERT INTO credit_wallets (organization_id, wallet_type, balance_credits)
      VALUES ($1, 'ai_api', 250000)
      ON CONFLICT (organization_id, wallet_type) DO NOTHING
    `, [orgId]);

    // Default project
    let projId;
    const projCheck = await client.query('SELECT id FROM developer_projects WHERE organization_id = $1', [orgId]);
    if (projCheck.rows.length === 0) {
      const projIns = await client.query(`
        INSERT INTO developer_projects (organization_id, name, environment, description)
        VALUES ($1, 'Default Project', 'production', 'Primary FamilyFlix streaming and AI integration project')
        RETURNING id
      `, [orgId]);
      projId = projIns.rows[0].id;
    } else {
      projId = projCheck.rows[0].id;
    }

    // Default Developer Subscription (Bundle Enterprise for Admin)
    const subCheck = await client.query('SELECT id FROM developer_subscriptions WHERE organization_id = $1', [orgId]);
    if (subCheck.rows.length === 0) {
      await client.query(`
        INSERT INTO developer_subscriptions (organization_id, user_id, plan_id, product_id, status, current_period_start, current_period_end)
        VALUES ($1, $2, 'bundle_enterprise_yearly', 'bundle', 'active', now(), now() + interval '1 year')
      `, [orgId, adminUser.id]);
    }
  }

  console.log("Developer platform database tables and seed data created successfully! ✓");

} catch (err) {
  console.error("Error setting up developer tables:", err);
  process.exit(1);
} finally {
  await client.end();
}
