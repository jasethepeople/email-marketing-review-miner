import { beforeEach, describe, expect, it, vi } from "vitest";

const { getFreshAiSummaryCache, saveAiSummaryCache, generateFeatureGapSummary } = vi.hoisted(() => ({
  getFreshAiSummaryCache: vi.fn(),
  saveAiSummaryCache: vi.fn(),
  generateFeatureGapSummary: vi.fn(),
}));

vi.mock("./db", () => ({ getFreshAiSummaryCache, saveAiSummaryCache }));
vi.mock("./reviewInsights", () => ({ generateFeatureGapSummary }));

import { DEFAULT_AI_RUBRIC } from "./aiRubric";
import { buildSummaryCacheKey, getOrCreateFeatureGapSummary } from "./summaryCache";

const input = { filter: "All" as const, sampleSize: 38, themes: [
  { label: "Onboarding & usability", count: 16 },
  { label: "Human escalation", count: 15 },
  { label: "Account trust", count: 10 },
] };

const summary = { perspective: "A concise evidence read.", model: "gpt-5-mini", gaps: [
  { theme: "Onboarding & usability", evidenceCount: 16, title: "Onboard", whyNow: "Most mentions.", recommendedFeature: "Guidance." },
  { theme: "Human escalation", evidenceCount: 15, title: "Escalate", whyNow: "Second most.", recommendedFeature: "Human handoff." },
  { theme: "Account trust", evidenceCount: 10, title: "Trust", whyNow: "Repeated concern.", recommendedFeature: "Trust center." },
] };

describe("feature-gap cache", () => {
  beforeEach(() => { getFreshAiSummaryCache.mockReset(); saveAiSummaryCache.mockReset(); generateFeatureGapSummary.mockReset(); });

  it("creates a different cache key when the persisted rubric changes", () => {
    const defaultKey = buildSummaryCacheKey(input, DEFAULT_AI_RUBRIC);
    const changedKey = buildSummaryCacheKey(input, { ...DEFAULT_AI_RUBRIC, maximumWords: 140 });
    expect(defaultKey).not.toBe(changedKey);
  });

  it("reuses a valid cached summary without invoking the model", async () => {
    getFreshAiSummaryCache.mockResolvedValue({ summary });
    const result = await getOrCreateFeatureGapSummary(input, DEFAULT_AI_RUBRIC);
    expect(result.cacheStatus).toBe("cached");
    expect(generateFeatureGapSummary).not.toHaveBeenCalled();
  });

  it("stores a generated summary when no cache entry exists", async () => {
    getFreshAiSummaryCache.mockResolvedValue(undefined);
    generateFeatureGapSummary.mockResolvedValue(summary);
    const result = await getOrCreateFeatureGapSummary(input, DEFAULT_AI_RUBRIC);
    expect(result.cacheStatus).toBe("generated");
    expect(saveAiSummaryCache).toHaveBeenCalledOnce();
  });
});
