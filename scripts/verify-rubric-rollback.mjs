import { appRouter } from "../server/routers.ts";
import { getUserByOpenId, upsertUser } from "../server/db.ts";
import { ENV } from "../server/_core/env.ts";

const ownerOpenId = ENV.ownerOpenId;
await upsertUser({ openId: ownerOpenId, name: "Project owner", lastSignedIn: new Date() });
const owner = await getUserByOpenId(ownerOpenId);
if (!owner || owner.role !== "admin") throw new Error("Project owner is not an administrator.");

const caller = appRouter.createCaller({ user: owner, req: { protocol: "https", headers: {} }, res: { clearCookie() {} } });
const input = { filter: "All", sampleSize: 38, themes: [
  { label: "Onboarding & usability", count: 16 }, { label: "Human escalation", count: 15 },
  { label: "Account trust", count: 10 }, { label: "Pricing control", count: 9 },
  { label: "Workflow flexibility", count: 9 }, { label: "Reliability", count: 5 },
] };

const original = await caller.adminRubric.get();
const temporary = { ...original.rubric, themeWeights: { ...original.rubric.themeWeights, Reliability: 3 } };

try {
  await caller.adminRubric.update(temporary);
  const history = await caller.adminRubric.history();
  const snapshot = history.versions.at(-1);
  if (!snapshot) throw new Error("No rubric snapshot was recorded for rollback.");
  const temporarySummary = await caller.reviewInsights.featureGapSummary(input);
  await caller.adminRubric.rollback({ versionId: snapshot.id });
  const restored = await caller.adminRubric.get();
  const restoredSummary = await caller.reviewInsights.featureGapSummary(input);
  const afterHistory = await caller.adminRubric.history();
  const rollbackRecorded = afterHistory.versions.some(version => version.changeType === "rollback" && version.sourceVersionId === snapshot.id);

  if (restored.rubric.themeWeights.Reliability !== original.rubric.themeWeights.Reliability) throw new Error("Rollback did not restore the saved rubric weight.");
  if (temporarySummary.cacheStatus !== "generated" || restoredSummary.cacheStatus !== "generated") throw new Error("Rollback did not invalidate the summary cache.");
  if (!rollbackRecorded) throw new Error("Rollback event was not recorded in rubric history.");

  console.log(JSON.stringify({
    restoredReliabilityWeight: restored.rubric.themeWeights.Reliability,
    temporaryTopThemes: temporarySummary.gaps.map(gap => gap.theme),
    restoredTopThemes: restoredSummary.gaps.map(gap => gap.theme),
    cacheStatuses: [temporarySummary.cacheStatus, restoredSummary.cacheStatus],
    rollbackRecorded,
  }));
} finally {
  const current = await caller.adminRubric.get();
  if (current.rubric.themeWeights.Reliability !== original.rubric.themeWeights.Reliability) await caller.adminRubric.update(original.rubric);
}

process.exit(0);
