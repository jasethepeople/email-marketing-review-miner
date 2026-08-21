import { z } from "zod";

export const RUBRIC_THEMES = [
  "Onboarding & usability",
  "Human escalation",
  "Account trust",
  "Pricing control",
  "Workflow flexibility",
  "Reliability",
] as const;

export const aiRubricSchema = z.object({
  themeWeights: z.object({
    "Onboarding & usability": z.number().min(0.25).max(3),
    "Human escalation": z.number().min(0.25).max(3),
    "Account trust": z.number().min(0.25).max(3),
    "Pricing control": z.number().min(0.25).max(3),
    "Workflow flexibility": z.number().min(0.25).max(3),
    "Reliability": z.number().min(0.25).max(3),
  }),
  minimumEvidenceCount: z.number().int().min(1).max(5),
  maximumWords: z.number().int().min(60).max(180),
  analysisPosture: z.enum(["direct", "balanced", "opportunity-led"]),
});

export type AiRubric = z.infer<typeof aiRubricSchema>;

export const DEFAULT_AI_RUBRIC: AiRubric = {
  themeWeights: {
    "Onboarding & usability": 1,
    "Human escalation": 1.1,
    "Account trust": 1.05,
    "Pricing control": 1,
    "Workflow flexibility": 1,
    "Reliability": 1,
  },
  minimumEvidenceCount: 1,
  maximumWords: 110,
  analysisPosture: "balanced",
};

export type WeightedTheme = { label: string; count: number; priorityScore: number };

export function rankThemesForRubric(
  themes: Array<{ label: string; count: number }>,
  rubric: AiRubric
): WeightedTheme[] {
  return themes
    .filter(theme => theme.count >= rubric.minimumEvidenceCount)
    .map(theme => ({
      ...theme,
      priorityScore: Number((theme.count * (rubric.themeWeights[theme.label as keyof AiRubric["themeWeights"]] ?? 1)).toFixed(2)),
    }))
    .sort((a, b) => b.priorityScore - a.priorityScore || b.count - a.count || a.label.localeCompare(b.label));
}

export function postureInstruction(posture: AiRubric["analysisPosture"]): string {
  if (posture === "direct") return "Be concise, decisive, and frank about what should be built first.";
  if (posture === "opportunity-led") return "Frame each gap as a credible switching and growth opportunity without overstating certainty.";
  return "Use a balanced, evidence-calibrated product-strategy tone.";
}
