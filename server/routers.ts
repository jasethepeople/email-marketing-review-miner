import { COOKIE_NAME } from "@shared/const";
import { DEFAULT_AI_RUBRIC, aiRubricSchema } from "./aiRubric";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, publicProcedure, router } from "./_core/trpc";
import { clearAiSummaryCache, getAiSummarySettings, saveAiSummarySettings } from "./db";
import { reviewInsightInputSchema } from "./reviewInsights";
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
    update: adminProcedure.input(aiRubricSchema).mutation(async ({ ctx, input }) => {
      await saveAiSummarySettings({ ...input, updatedBy: ctx.user.openId });
      await clearAiSummaryCache();
      return { rubric: input };
    }),
  }),

  // TODO: add feature routers here, e.g.
  // todo: router({
  //   list: protectedProcedure.query(({ ctx }) =>
  //     db.getUserTodos(ctx.user.id)
  //   ),
  // }),
});

export type AppRouter = typeof appRouter;
