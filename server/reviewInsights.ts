import { z } from "zod";
import { invokeLLM, listLLMModels } from "./_core/llm";

const themeSchema = z.object({
  label: z.string().min(1).max(48),
  count: z.number().int().min(0).max(1000),
});

export const reviewInsightInputSchema = z.object({
  filter: z.enum(["All", "Klaviyo", "Mailchimp", "ActiveCampaign", "Brevo", "Omnisend"]),
  themes: z.array(themeSchema).min(3).max(6),
  sampleSize: z.number().int().min(1).max(1000),
});

const rawSummarySchema = z.object({
  perspective: z.string().min(1).max(1200),
  gaps: z.array(z.object({
    theme: z.string().min(1).max(48),
    title: z.string().min(1).max(300),
    whyNow: z.string().min(1).max(1200),
    recommendedFeature: z.string().min(1).max(1200),
  }).strict()).length(3),
}).strict();

export type ReviewInsightInput = z.infer<typeof reviewInsightInputSchema>;

export type FeatureGapSummary = {
  perspective: string;
  model: string;
  gaps: Array<{
    theme: string;
    evidenceCount: number;
    title: string;
    whyNow: string;
    recommendedFeature: string;
  }>;
};

const concise = (value: string, limit: number) =>
  value.length <= limit ? value : `${value.slice(0, limit - 1).trimEnd()}…`;

/** Generate only from supplied, current-filter evidence; no external market claims are allowed. */
export async function generateFeatureGapSummary(input: ReviewInsightInput): Promise<FeatureGapSummary> {
  const evidenceByTheme = new Map(input.themes.map(theme => [theme.label, theme.count]));
  const availableThemes = input.themes.filter(theme => theme.count > 0);

  if (availableThemes.length < 3) {
    throw new Error("At least three non-zero evidence themes are required for an AI top-three summary.");
  }

  const models = await listLLMModels();
  const model = models.data.find(candidate => candidate.id === "gpt-5-mini")?.id
    ?? models.data.find(candidate => candidate.id === "claude-haiku-4-5")?.id
    ?? models.data[0]?.id;

  if (!model) throw new Error("No built-in model is available for the feature-gap summary.");

  const evidence = availableThemes
    .sort((a, b) => b.count - a.count)
    .map(theme => `${theme.label}: ${theme.count} coded mentions`)
    .join("; ");

  const response = await invokeLLM({
    model,
    messages: [
      {
        role: "system",
        content: "You are a rigorous B2B product strategist. Use only the supplied coded review evidence. Do not invent customer facts, competitors, metrics, or market claims. Choose exactly three distinct themes from the supplied list. Translate each theme into a specific product feature gap, explain its current evidence in one concise sentence, and recommend a concrete build. Keep language decisive but calibrated.",
      },
      {
        role: "user",
        content: `Selected filter: ${input.filter}. Sample size: ${input.sampleSize} public-review excerpts. Available coded themes: ${evidence}. Return a concise top-three feature-gap analysis grounded exclusively in these counts.`,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "feature_gap_summary",
        strict: true,
        schema: {
          type: "object",
          properties: {
            perspective: { type: "string" },
            gaps: {
              type: "array",
              minItems: 3,
              maxItems: 3,
              items: {
                type: "object",
                properties: {
                  theme: { type: "string" },
                  title: { type: "string" },
                  whyNow: { type: "string" },
                  recommendedFeature: { type: "string" },
                },
                required: ["theme", "title", "whyNow", "recommendedFeature"],
                additionalProperties: false,
              },
            },
          },
          required: ["perspective", "gaps"],
          additionalProperties: false,
        },
      },
    },
  });

  const responseContent = response.choices[0]?.message.content;
  const content = typeof responseContent === "string"
    ? responseContent
    : responseContent?.filter(part => part.type === "text").map(part => part.text).join("");
  if (!content) throw new Error("The model did not return a readable feature-gap summary.");

  const parsed = rawSummarySchema.parse(JSON.parse(content));
  const uniqueThemes = new Set(parsed.gaps.map(gap => gap.theme));
  const unsupportedTheme = parsed.gaps.some(gap => !evidenceByTheme.has(gap.theme) || evidenceByTheme.get(gap.theme) === 0);

  if (uniqueThemes.size !== 3 || unsupportedTheme) {
    throw new Error("The model selected duplicate or unsupported evidence themes. Please retry the analysis.");
  }

  return {
    perspective: concise(parsed.perspective, 420),
    model,
    gaps: parsed.gaps.map(gap => ({
      theme: gap.theme,
      evidenceCount: evidenceByTheme.get(gap.theme) ?? 0,
      title: concise(gap.title, 100),
      whyNow: concise(gap.whyNow, 300),
      recommendedFeature: concise(gap.recommendedFeature, 260),
    })),
  };
}
