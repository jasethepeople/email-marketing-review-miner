import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const { clearAiSummaryCache, getAiSummarySettings, saveAiSummarySettings } = vi.hoisted(() => ({
  clearAiSummaryCache: vi.fn(),
  getAiSummarySettings: vi.fn(),
  saveAiSummarySettings: vi.fn(),
}));

vi.mock("./db", () => ({ clearAiSummaryCache, getAiSummarySettings, saveAiSummarySettings }));

import { appRouter } from "./routers";

const baseContext = (role: "admin" | "user"): TrpcContext => ({
  user: {
    id: 1,
    openId: "rubric-admin",
    name: "Rubric Admin",
    email: "admin@example.com",
    loginMethod: "manus",
    role,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  },
  req: { protocol: "https", headers: {} } as TrpcContext["req"],
  res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
});

const rubric = {
  themeWeights: { "Onboarding & usability": 1, "Human escalation": 1.1, "Account trust": 1.05, "Pricing control": 1, "Workflow flexibility": 1, "Reliability": 1.5 },
  minimumEvidenceCount: 1,
  maximumWords: 110,
  analysisPosture: "balanced" as const,
};

describe("admin rubric procedures", () => {
  beforeEach(() => {
    getAiSummarySettings.mockResolvedValue(undefined);
    saveAiSummarySettings.mockResolvedValue(undefined);
    clearAiSummaryCache.mockResolvedValue(undefined);
  });

  it("rejects a non-admin caller before exposing rubric settings", async () => {
    const caller = appRouter.createCaller(baseContext("user"));
    await expect(caller.adminRubric.get()).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(getAiSummarySettings).not.toHaveBeenCalled();
  });

  it("persists a bounded rubric only for an administrator", async () => {
    const caller = appRouter.createCaller(baseContext("admin"));
    const result = await caller.adminRubric.update(rubric);

    expect(result.rubric).toEqual(rubric);
    expect(saveAiSummarySettings).toHaveBeenCalledWith({ ...rubric, updatedBy: "rubric-admin" });
    expect(clearAiSummaryCache).toHaveBeenCalledOnce();
  });
});
