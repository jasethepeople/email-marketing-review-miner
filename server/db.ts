import { and, eq, gt } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { AiSummarySettings, InsertUser, aiRubricHistory, aiSummaryCache, aiSummarySettings, sourceRefreshSettings, users } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getAiSummarySettings(): Promise<AiSummarySettings | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(aiSummarySettings).where(eq(aiSummarySettings.id, 1)).limit(1);
  return rows[0];
}

export async function saveAiSummarySettings(input: {
  themeWeights: Record<string, number>;
  minimumEvidenceCount: number;
  maximumWords: number;
  analysisPosture: string;
  updatedBy: string;
}): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("The rubric settings store is not available.");

  await db.insert(aiSummarySettings).values({
    id: 1,
    themeWeights: input.themeWeights,
    minimumEvidenceCount: input.minimumEvidenceCount,
    maximumWords: input.maximumWords,
    analysisPosture: input.analysisPosture,
    updatedBy: input.updatedBy,
  }).onDuplicateKeyUpdate({
    set: {
      themeWeights: input.themeWeights,
      minimumEvidenceCount: input.minimumEvidenceCount,
      maximumWords: input.maximumWords,
      analysisPosture: input.analysisPosture,
      updatedBy: input.updatedBy,
      updatedAt: new Date(),
    },
  });
}

export async function getFreshAiSummaryCache(cacheKey: string) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(aiSummaryCache).where(and(
    eq(aiSummaryCache.cacheKey, cacheKey),
    gt(aiSummaryCache.expiresAt, new Date())
  )).limit(1);
  const cached = rows[0];
  if (cached) await db.update(aiSummaryCache).set({ lastUsedAt: new Date() }).where(eq(aiSummaryCache.id, cached.id));
  return cached;
}

export async function saveAiSummaryCache(cacheKey: string, summary: Record<string, unknown>): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await db.insert(aiSummaryCache).values({ cacheKey, summary, expiresAt, lastUsedAt: new Date() }).onDuplicateKeyUpdate({
    set: { summary, expiresAt, lastUsedAt: new Date() },
  });
}

export async function clearAiSummaryCache(): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(aiSummaryCache);
}

export type RubricSnapshot = {
  themeWeights: Record<string, number>;
  minimumEvidenceCount: number;
  maximumWords: number;
  analysisPosture: string;
};

export async function recordAiRubricHistory(snapshot: RubricSnapshot & {
  changedBy: string;
  changeType: "update" | "rollback";
  sourceVersionId?: number;
}): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("The rubric history store is not available.");
  await db.insert(aiRubricHistory).values(snapshot);
}

export async function listAiRubricHistory() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(aiRubricHistory).orderBy(aiRubricHistory.id).limit(50);
}

export async function getAiRubricHistoryVersion(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(aiRubricHistory).where(eq(aiRubricHistory.id, id)).limit(1);
  return rows[0];
}

export async function getSourceRefreshSettings() {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(sourceRefreshSettings).where(eq(sourceRefreshSettings.id, 1)).limit(1);
  return rows[0];
}

export async function saveSourceRefreshSettings(input: {
  enabled: boolean;
  scheduleCronTaskUid?: string | null;
  lastRunAt?: Date | null;
  lastStatus?: string | null;
  lastResult?: Record<string, unknown> | null;
}): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("The source refresh settings store is not available.");
  await db.insert(sourceRefreshSettings).values({ id: 1, ...input }).onDuplicateKeyUpdate({
    set: { ...input, updatedAt: new Date() },
  });
}
