import { createHash } from "node:crypto";
import { AiRubric } from "./aiRubric";
import { getFreshAiSummaryCache, saveAiSummaryCache } from "./db";
import { FeatureGapSummary, ReviewInsightInput, generateFeatureGapSummary } from "./reviewInsights";

export type CachedFeatureGapSummary = FeatureGapSummary & {
  cacheStatus: "generated" | "cached";
};

export function buildSummaryCacheKey(input: ReviewInsightInput, rubric: AiRubric): string {
  const stableInput = {
    filter: input.filter,
    sampleSize: input.sampleSize,
    themes: [...input.themes].sort((a, b) => a.label.localeCompare(b.label)),
    rubric,
  };
  return createHash("sha256").update(JSON.stringify(stableInput)).digest("hex");
}

export async function getOrCreateFeatureGapSummary(
  input: ReviewInsightInput,
  rubric: AiRubric
): Promise<CachedFeatureGapSummary> {
  const cacheKey = buildSummaryCacheKey(input, rubric);
  const cached = await getFreshAiSummaryCache(cacheKey);

  if (cached?.summary && typeof cached.summary === "object") {
    const summary = cached.summary as unknown as FeatureGapSummary;
    if (Array.isArray(summary.gaps) && typeof summary.perspective === "string") {
      return { ...summary, cacheStatus: "cached" };
    }
  }

  const summary = await generateFeatureGapSummary(input, rubric);
  await saveAiSummaryCache(cacheKey, summary as unknown as Record<string, unknown>);
  return { ...summary, cacheStatus: "generated" };
}
