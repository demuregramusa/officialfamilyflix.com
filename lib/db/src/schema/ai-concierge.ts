import { relations } from "drizzle-orm";
import {
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

// 1. User AI Concierge Preferences
export const aiUserPreferences = pgTable(
  "ai_user_preferences",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    selectedAssistant: text("selected_assistant").notNull().default("raven"), // "raven" | "princeton"
    voiceActivationEnabled: boolean("voice_activation_enabled").notNull().default(false),
    voiceSpeed: numeric("voice_speed", { precision: 3, scale: 2 }).notNull().default("1.00"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("ai_user_pref_user_unique").on(table.userId),
  ],
);

// 2. User AI Credit Wallets (Account-specific AI usage allowance)
export const aiCreditWallets = pgTable(
  "ai_credit_wallets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    balance: integer("balance").notNull().default(100),
    plan: text("plan").notNull().default("free"), // "free" | "basic" | "vip"
    totalUsed: integer("total_used").notNull().default(0),
    monthlyAllowance: integer("monthly_allowance").notNull().default(100),
    lastResetAt: timestamp("last_reset_at", { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("ai_credit_wallets_user_unique").on(table.userId),
  ],
);

// 3. User AI Credit Ledger (Auditable transaction history)
export const aiCreditLedger = pgTable(
  "ai_credit_ledger",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    type: text("type").notNull(), // "monthly_grant" | "purchase" | "usage" | "bonus"
    amount: integer("amount").notNull(),
    balanceAfter: integer("balance_after").notNull(),
    description: text("description").notNull(),
    referenceId: text("reference_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("ai_credit_ledger_user_idx").on(table.userId),
    index("ai_credit_ledger_created_idx").on(table.createdAt),
  ],
);

// 4. AI Conversations (Isolated by authenticated user)
export const aiConversations = pgTable(
  "ai_conversations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    assistant: text("assistant").notNull().default("raven"),
    title: text("title").notNull().default("New Conversation"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("ai_conversations_user_idx").on(table.userId),
  ],
);

// 5. AI Messages
export const aiMessages = pgTable(
  "ai_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => aiConversations.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: text("role").notNull(), // "user" | "assistant" | "system"
    content: text("content").notNull(),
    action: jsonb("action"), // e.g. { type: "navigate" | "play_movie" | "play_episode", slug: string, title: string, url: string }
    creditsDeducted: integer("credits_deducted").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("ai_messages_conv_idx").on(table.conversationId),
    index("ai_messages_user_idx").on(table.userId),
  ],
);

// Relations
export const aiUserPreferencesRelations = relations(aiUserPreferences, ({ one }) => ({
  user: one(user, { fields: [aiUserPreferences.userId], references: [user.id] }),
}));

export const aiCreditWalletsRelations = relations(aiCreditWallets, ({ one }) => ({
  user: one(user, { fields: [aiCreditWallets.userId], references: [user.id] }),
}));

export const aiCreditLedgerRelations = relations(aiCreditLedger, ({ one }) => ({
  user: one(user, { fields: [aiCreditLedger.userId], references: [user.id] }),
}));

export const aiConversationsRelations = relations(aiConversations, ({ one, many }) => ({
  user: one(user, { fields: [aiConversations.userId], references: [user.id] }),
  messages: many(aiMessages),
}));

export const aiMessagesRelations = relations(aiMessages, ({ one }) => ({
  conversation: one(aiConversations, { fields: [aiMessages.conversationId], references: [aiConversations.id] }),
  user: one(user, { fields: [aiMessages.userId], references: [user.id] }),
}));
