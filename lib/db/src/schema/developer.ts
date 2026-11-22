import { relations, sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth";

// 1. Developer Organizations
export const developerOrganizations = pgTable(
  "developer_organizations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    billingEmail: text("billing_email"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex("dev_orgs_slug_unique").on(table.slug)],
);

// 2. Developer Projects (Development, Testing, Production)
export const developerProjects = pgTable(
  "developer_projects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => developerOrganizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    environment: text("environment").notNull().default("development"), // development | testing | production
    description: text("description"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("dev_projects_org_idx").on(table.organizationId)],
);

// 3. API Key Credentials (Cryptographically hashed, secret shown once)
export const apiKeyCredentials = pgTable(
  "api_key_credentials",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => developerProjects.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    keyPrefix: text("key_prefix").notNull(), // ff_live_ or ff_test_
    keyDisplay: text("key_display").notNull(), // ff_live_...xxxx
    keyHash: text("key_hash").notNull(), // SHA-256 hash of full secret
    scopes: jsonb("scopes").$type<string[]>().notNull().default(["*"]),
    rateLimitPerMin: integer("rate_limit_per_min").notNull().default(60),
    rateLimitPerDay: integer("rate_limit_per_day").notNull().default(10000),
    monthlySpendLimitCents: integer("monthly_spend_limit_cents").notNull().default(10000), // $100
    currentMonthSpendCents: integer("current_month_spend_cents").notNull().default(0),
    status: text("status").notNull().default("active"), // active | revoked | expired
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("api_keys_hash_unique").on(table.keyHash),
    index("api_keys_project_idx").on(table.projectId),
    index("api_keys_status_idx").on(table.status),
  ],
);

// 4. API Products (Movies API, AI API, Bundle)
export const apiProducts = pgTable("api_products", {
  id: text("id").primaryKey(), // movies_api | ai_api | bundle
  name: text("name").notNull(),
  description: text("description").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// 5. API Plans (Configurable by admin: Starter, Professional, Enterprise — Monthly & Yearly)
export const apiPlans = pgTable("api_plans", {
  id: text("id").primaryKey(), // e.g. movies_starter_monthly, ai_pro_yearly, etc.
  productId: text("product_id")
    .notNull()
    .references(() => apiProducts.id, { onDelete: "cascade" }),
  tier: text("tier").notNull(), // starter | professional | enterprise
  billingInterval: text("billing_interval").notNull(), // monthly | yearly
  name: text("name").notNull(),
  priceUsd: numeric("price_usd", { precision: 10, scale: 2 }).notNull(),
  requestsPerMonth: integer("requests_per_month").notNull(),
  requestsPerMinute: integer("requests_per_minute").notNull(),
  aiTokensPerMonth: integer("ai_tokens_per_month").notNull().default(0),
  features: jsonb("features").$type<string[]>().notNull().default([]),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// 6. Developer Subscriptions
export const developerSubscriptions = pgTable(
  "developer_subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => developerOrganizations.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    planId: text("plan_id")
      .notNull()
      .references(() => apiPlans.id, { onDelete: "restrict" }),
    productId: text("product_id")
      .notNull()
      .references(() => apiProducts.id, { onDelete: "restrict" }),
    status: text("status").notNull().default("active"), // active | canceled | past_due
    currentPeriodStart: timestamp("current_period_start", { withTimezone: true }).defaultNow().notNull(),
    currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }).notNull(),
    cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
    paymentMethod: text("payment_method").default("card"),
    stripeSubscriptionId: text("stripe_subscription_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("dev_subs_org_idx").on(table.organizationId),
    index("dev_subs_status_idx").on(table.status),
  ],
);

// 7. Separate Credit Wallets (Strictly Independent Balances)
export const creditWallets = pgTable(
  "credit_wallets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => developerOrganizations.id, { onDelete: "cascade" }),
    walletType: text("wallet_type").notNull(), // 'movies_api' | 'ai_api' (Strict Separation!)
    balanceCredits: bigint("balance_credits", { mode: "number" }).notNull().default(0),
    autoRechargeEnabled: boolean("auto_recharge_enabled").notNull().default(false),
    autoRechargeThreshold: integer("auto_recharge_threshold").notNull().default(100),
    autoRechargeAmount: integer("auto_recharge_amount").notNull().default(1000),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("credit_wallets_org_type_unique").on(table.organizationId, table.walletType),
  ],
);

// 8. Credit Transactions (Auditable Ledger)
export const creditTransactions = pgTable(
  "credit_transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    walletId: uuid("wallet_id")
      .notNull()
      .references(() => creditWallets.id, { onDelete: "cascade" }),
    type: text("type").notNull(), // topup | usage_deduction | plan_grant | refund | adjustment
    amountCredits: bigint("amount_credits", { mode: "number" }).notNull(),
    balanceAfter: bigint("balance_after", { mode: "number" }).notNull(),
    description: text("description").notNull(),
    referenceId: text("reference_id"), // e.g. stripe payment ID, invoice ID, or API key ID
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("credit_tx_wallet_idx").on(table.walletId),
    index("credit_tx_created_idx").on(table.createdAt),
  ],
);

// 9. API Usage Events (Metering & Analytics)
export const apiUsageEvents = pgTable(
  "api_usage_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    keyId: uuid("key_id").references(() => apiKeyCredentials.id, { onDelete: "set null" }),
    projectId: uuid("project_id").references(() => developerProjects.id, { onDelete: "set null" }),
    organizationId: uuid("organization_id").references(() => developerOrganizations.id, { onDelete: "cascade" }),
    endpoint: text("endpoint").notNull(),
    method: text("method").notNull(),
    statusCode: integer("status_code").notNull(),
    latencyMs: integer("latency_ms").notNull().default(0),
    tokensUsed: integer("tokens_used").notNull().default(0),
    creditsDeducted: integer("credits_deducted").notNull().default(0),
    ipAddress: text("ip_address"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("api_usage_key_idx").on(table.keyId),
    index("api_usage_org_created_idx").on(table.organizationId, table.createdAt),
    index("api_usage_created_idx").on(table.createdAt),
  ],
);

// 10. AI Model Registry
export const aiModelRegistry = pgTable("ai_model_registry", {
  id: text("id").primaryKey(), // demure-rec-v1 | demure-search-v1 | demure-meta-v1 | demure-chat-v1
  name: text("name").notNull(),
  description: text("description").notNull(),
  provider: text("provider").notNull().default("familyflix_ai"),
  capabilities: jsonb("capabilities").$type<string[]>().notNull().default([]),
  contextWindow: integer("context_window").notNull().default(32768),
  maxOutputTokens: integer("max_output_tokens").notNull().default(4096),
  inputTokenPricePer1M: numeric("input_token_price_per_1m", { precision: 10, scale: 4 }).notNull().default("0.1500"),
  outputTokenPricePer1M: numeric("output_token_price_per_1m", { precision: 10, scale: 4 }).notNull().default("0.6000"),
  rateLimitRpm: integer("rate_limit_rpm").notNull().default(120),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// 11. Developer Invoices & Receipts
export const developerInvoices = pgTable(
  "developer_invoices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => developerOrganizations.id, { onDelete: "cascade" }),
    invoiceNumber: text("invoice_number").notNull(),
    amountUsd: numeric("amount_usd", { precision: 10, scale: 2 }).notNull(),
    currency: text("currency").notNull().default("USD"),
    status: text("status").notNull().default("paid"), // paid | open | void
    description: text("description").notNull(),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("dev_invoices_number_unique").on(table.invoiceNumber),
    index("dev_invoices_org_idx").on(table.organizationId),
  ],
);

// 12. Developer Webhooks
export const developerWebhooks = pgTable(
  "developer_webhooks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => developerOrganizations.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    secret: text("secret").notNull(),
    events: jsonb("events").$type<string[]>().notNull().default(["*"]),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("dev_webhooks_org_idx").on(table.organizationId)],
);

// Relations
export const developerOrganizationsRelations = relations(developerOrganizations, ({ one, many }) => ({
  owner: one(user, { fields: [developerOrganizations.ownerId], references: [user.id] }),
  projects: many(developerProjects),
  subscriptions: many(developerSubscriptions),
  wallets: many(creditWallets),
  invoices: many(developerInvoices),
  webhooks: many(developerWebhooks),
}));

export const developerProjectsRelations = relations(developerProjects, ({ one, many }) => ({
  organization: one(developerOrganizations, { fields: [developerProjects.organizationId], references: [developerOrganizations.id] }),
  keys: many(apiKeyCredentials),
  usageEvents: many(apiUsageEvents),
}));

export const apiKeyCredentialsRelations = relations(apiKeyCredentials, ({ one, many }) => ({
  project: one(developerProjects, { fields: [apiKeyCredentials.projectId], references: [developerProjects.id] }),
  usageEvents: many(apiUsageEvents),
}));

export const apiPlansRelations = relations(apiPlans, ({ one, many }) => ({
  product: one(apiProducts, { fields: [apiPlans.productId], references: [apiProducts.id] }),
  subscriptions: many(developerSubscriptions),
}));

export const developerSubscriptionsRelations = relations(developerSubscriptions, ({ one }) => ({
  organization: one(developerOrganizations, { fields: [developerSubscriptions.organizationId], references: [developerOrganizations.id] }),
  user: one(user, { fields: [developerSubscriptions.userId], references: [user.id] }),
  plan: one(apiPlans, { fields: [developerSubscriptions.planId], references: [apiPlans.id] }),
  product: one(apiProducts, { fields: [developerSubscriptions.productId], references: [apiProducts.id] }),
}));

export const creditWalletsRelations = relations(creditWallets, ({ one, many }) => ({
  organization: one(developerOrganizations, { fields: [creditWallets.organizationId], references: [developerOrganizations.id] }),
  transactions: many(creditTransactions),
}));

export const creditTransactionsRelations = relations(creditTransactions, ({ one }) => ({
  wallet: one(creditWallets, { fields: [creditTransactions.walletId], references: [creditWallets.id] }),
}));
