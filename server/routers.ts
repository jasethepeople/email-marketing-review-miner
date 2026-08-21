import { COOKIE_NAME } from "@shared/const";
import { parse as parseCookie } from "cookie";
import { z } from "zod";
import { DEFAULT_AI_RUBRIC, aiRubricSchema } from "./aiRubric";
import { getSessionCookieOptions } from "./_core/cookies";
import { createHeartbeatJob, updateHeartbeatJob } from "./_core/heartbeat";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, publicProcedure, router } from "./_core/trpc";
import { clearAiSummaryCache, getAiRubricHistoryVersion, getAiSummarySettings, getSourceRefreshSettings, listAiRubricHistory, recordAiRubricHistory, saveAiSummarySettings, saveSourceRefreshSettings } from "./db";
import { reviewInsightInputSchema } from "./reviewInsights";
import { runSourceAvailabilityRefresh } from "./sourceRefresh";
import { getOrCreateFeatureGapSummary } from "./summaryCache";

async function currentRubric() {
  const stored = await getAiSummarySettings();
  if (!stored) return DEFAULT_AI_RUBRIC;
  const parsed = aiRubricSchema.safeParse({
    themeWeights: stored.themeWeights,
    minimumEvidenceCount: stored.minimumEvidenceCount,
    maximumWords: stored.maximumWords,
    analysisPosture: stored.analysisPosture,
  });
  return parsed.success ? parsed.data : DEFAULT_AI_RUBRIC;
}

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  reviewInsights: router({
    featureGapSummary: publicProcedure
      .input(reviewInsightInputSchema)
      .query(async ({ input }) => getOrCreateFeatureGapSummary(input, await currentRubric())),
  }),

  adminRubric: router({
    get: adminProcedure.query(async () => ({ rubric: await currentRubric() })),
    history: adminProcedure.query(async () => ({ versions: await listAiRubricHistory() })),
    update: adminProcedure.input(aiRubricSchema).mutation(async ({ ctx, input }) => {
      const prior = await currentRubric();
      await recordAiRubricHistory({ ...prior, changedBy: ctx.user.openId, changeType: "update" });
      await saveAiSummarySettings({ ...input, updatedBy: ctx.user.openId });
      await clearAiSummaryCache();
      return { rubric: input };
    }),
    rollback: adminProcedure.input(z.object({ versionId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const version = await getAiRubricHistoryVersion(input.versionId);
      if (!version) throw new Error("The requested rubric version no longer exists.");
      const prior = await currentRubric();
      await recordAiRubricHistory({ ...prior, changedBy: ctx.user.openId, changeType: "rollback", sourceVersionId: version.id });
      const rubric = aiRubricSchema.parse({
        themeWeights: version.themeWeights,
        minimumEvidenceCount: version.minimumEvidenceCount,
        maximumWords: version.maximumWords,
        analysisPosture: version.analysisPosture,
      });
      await saveAiSummarySettings({ ...rubric, updatedBy: ctx.user.openId });
      await clearAiSummaryCache();
      return { rubric };
    }),
  }),

  sourceRefresh: router({
    status: adminProcedure.query(async () => ({ settings: await getSourceRefreshSettings() })),
    enableDaily: adminProcedure.mutation(async ({ ctx }) => {
      const sessionToken = parseCookie(ctx.req.headers.cookie ?? "")[COOKIE_NAME] ?? "";
      if (!sessionToken) throw new Error("A valid session is required to enable the daily refresh.");
      const existing = await getSourceRefreshSettings();
      const job = {
        name: "daily-review-source-availability",
        cron: "0 0 9 * * *",
        path: "/api/scheduled/source-availability",
        description: "Daily public review-source availability check for Signal Ledger.",
      };
      const task = existing?.scheduleCronTaskUid
        ? await updateHeartbeatJob(existing.scheduleCronTaskUid, { cron: job.cron, path: job.path, description: job.description, enable: true }, sessionToken).then(() => ({ taskUid: existing.scheduleCronTaskUid }))
        : await createHeartbeatJob(job, sessionToken);
      await saveSourceRefreshSettings({ enabled: true, scheduleCronTaskUid: task.taskUid });
      return { taskUid: task.taskUid, nextExecutionAt: "nextExecutionAt" in task ? task.nextExecutionAt : null };
    }),
    runNow: adminProcedure.mutation(async () => runSourceAvailabilityRefresh()),
  }),

  // TODO: add feature routers here, e.g.
  // todo: router({
  //   list: protectedProcedure.query(({ ctx }) =>
  //     db.getUserTodos(ctx.user.id)
  //   ),
  // }),
});

export type AppRouter = typeof appRouter;
