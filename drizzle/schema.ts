import { int, json, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/** Singleton configuration record that governs the evidence-to-priority rubric for AI summaries. */
export const aiSummarySettings = mysqlTable("ai_summary_settings", {
  id: int("id").primaryKey(),
  themeWeights: json("themeWeights").$type<Record<string, number>>().notNull(),
  minimumEvidenceCount: int("minimumEvidenceCount").notNull(),
  maximumWords: int("maximumWords").notNull(),
  analysisPosture: varchar("analysisPosture", { length: 32 }).notNull(),
  updatedBy: varchar("updatedBy", { length: 64 }),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AiSummarySettings = typeof aiSummarySettings.$inferSelect;

/** Cached, evidence-scoped LLM result. The cache key includes the current rubric and expires after seven days. */
export const aiSummaryCache = mysqlTable("ai_summary_cache", {
  id: int("id").autoincrement().primaryKey(),
  cacheKey: varchar("cacheKey", { length: 128 }).notNull().unique(),
  summary: json("summary").$type<Record<string, unknown>>().notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  lastUsedAt: timestamp("lastUsedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
