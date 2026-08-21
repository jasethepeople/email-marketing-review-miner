import { appRouter } from "../server/routers.ts";
import { getUserByOpenId, upsertUser } from "../server/db.ts";
import { ENV } from "../server/_core/env.ts";

const ownerOpenId = ENV.ownerOpenId;
if (!ownerOpenId) throw new Error("Project owner identifier is not configured.");

await upsertUser({ openId: ownerOpenId, name: "Project owner", lastSignedIn: new Date() });
const owner = await getUserByOpenId(ownerOpenId);
if (!owner || owner.role !== "admin") throw new Error("Project owner was not recognized as an administrator.");

const ctx = {
  user: owner,
  req: { protocol: "https", headers: {} },
  res: { clearCookie() {} },
};
const caller = appRouter.createCaller(ctx);
const input = {
  filter: "All",
  sampleSize: 38,
  themes: [
    { label: "Onboarding & usability", count: 16 },
    { label: "Human escalation", count: 15 },
    { label: "Account trust", count: 10 },
    { label: "Pricing control", count: 9 },
    { label: "Workflow flexibility", count: 9 },
    { label: "Reliability", count: 5 },
  ],
};

const original = await caller.adminRubric.get();
const temporary = {
  ...original.rubric,
  themeWeights: { ...original.rubric.themeWeights, Reliability: 3 },
};

try {
  await caller.adminRubric.update(temporary);
  const reloaded = await caller.adminRubric.get();
  const first = await caller.reviewInsights.featureGapSummary(input);
  const second = await caller.reviewInsights.featureGapSummary(input);
  const firstThemes = first.gaps.map(gap => gap.theme);

  if (reloaded.rubric.themeWeights.Reliability !== 3) throw new Error("Updated rubric did not persist.");
  if (!firstThemes.includes("Reliability")) throw new Error("Updated rubric did not affect top-three selection.");
  if (first.cacheStatus !== "generated" || second.cacheStatus !== "cached") throw new Error("Cache invalidation or reuse did not behave as expected.");

  console.log(JSON.stringify({
    persistedReliabilityWeight: reloaded.rubric.themeWeights.Reliability,
    regeneratedThemes: firstThemes,
    cacheStatuses: [first.cacheStatus, second.cacheStatus],
  }));
} finally {
  await caller.adminRubric.update(original.rubric);
}

process.exit(0);
