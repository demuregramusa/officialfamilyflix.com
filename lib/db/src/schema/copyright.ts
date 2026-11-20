import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import {
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth";
import { movies } from "./familyflix";

export const copyrightCaseType = pgEnum("copyright_case_type", [
  "copyright_report",
  "counter_notice",
]);
export const copyrightCaseStatus = pgEnum("copyright_case_status", [
  "open",
  "under_review",
  "restricted",
  "counter_notice_received",
  "resolved",
  "rejected",
  "closed",
]);

export const copyrightCases = pgTable(
  "copyright_cases",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    caseNumber: text("case_number").notNull(),
    caseType: copyrightCaseType("case_type").notNull(),
    status: copyrightCaseStatus("status").notNull().default("open"),
    movieId: uuid("movie_id").references(() => movies.id, { onDelete: "set null" }),
    relatedCaseId: uuid("related_case_id"),
    reporterName: text("reporter_name").notNull(),
    reporterEmail: text("reporter_email").notNull(),
    summary: text("summary").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    submittedAt: timestamp("submitted_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    reviewedBy: text("reviewed_by"),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("copyright_cases_case_number_unique").on(table.caseNumber),
    index("copyright_cases_status_idx").on(table.status),
    index("copyright_cases_movie_idx").on(table.movieId),
    index("copyright_cases_submitted_idx").on(table.submittedAt),
  ],
);

export const copyrightCaseEvents = pgTable(
  "copyright_case_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    caseId: uuid("case_id")
      .notNull()
      .references(() => copyrightCases.id, { onDelete: "cascade" }),
    eventType: text("event_type").notNull(),
    actorUserId: text("actor_user_id"),
    actorName: text("actor_name").notNull(),
    note: text("note").notNull().default(""),
    detail: jsonb("detail").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("copyright_case_events_case_idx").on(table.caseId)],
);

export const repeatInfringers = pgTable(
  "repeat_infringers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    caseId: uuid("case_id").references(() => copyrightCases.id, {
      onDelete: "set null",
    }),
    reason: text("reason").notNull(),
    recordedBy: text("recorded_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("repeat_infringers_user_idx").on(table.userId),
    index("repeat_infringers_case_idx").on(table.caseId),
  ],
);

export const copyrightCasesRelations = relations(copyrightCases, ({ one, many }) => ({
  movie: one(movies, { fields: [copyrightCases.movieId], references: [movies.id] }),
  events: many(copyrightCaseEvents),
  parentCase: one(copyrightCases, {
    fields: [copyrightCases.relatedCaseId],
    references: [copyrightCases.id],
    relationName: "relatedCase",
  }),
}));

export const copyrightCaseEventsRelations = relations(copyrightCaseEvents, ({ one }) => ({
  case: one(copyrightCases, {
    fields: [copyrightCaseEvents.caseId],
    references: [copyrightCases.id],
  }),
  actor: one(user, {
    fields: [copyrightCaseEvents.actorUserId],
    references: [user.id],
  }),
}));

export const repeatInfringersRelations = relations(repeatInfringers, ({ one }) => ({
  user: one(user, {
    fields: [repeatInfringers.userId],
    references: [user.id],
  }),
  case: one(copyrightCases, {
    fields: [repeatInfringers.caseId],
    references: [copyrightCases.id],
  }),
}));

export const insertCopyrightCaseSchema = createInsertSchema(copyrightCases).omit({
  id: true,
  submittedAt: true,
  updatedAt: true,
  reviewedAt: true,
});
export type InsertCopyrightCase = z.infer<typeof insertCopyrightCaseSchema>;
export type CopyrightCase = typeof copyrightCases.$inferSelect;
export type CopyrightCaseEvent = typeof copyrightCaseEvents.$inferSelect;
export type RepeatInfringer = typeof repeatInfringers.$inferSelect;
