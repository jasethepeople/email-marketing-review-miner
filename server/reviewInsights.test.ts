import { beforeEach, describe, expect, it, vi } from "vitest";

const { invokeLLM, listLLMModels } = vi.hoisted(() => ({
  invokeLLM: vi.fn(),
  listLLMModels: vi.fn(),
}));

vi.mock("./_core/llm", () => ({ invokeLLM, listLLMModels }));

import { generateFeatureGapSummary } from "./reviewInsights";

describe("generateFeatureGapSummary", () => {
  beforeEach(() => {
    listLLMModels.mockResolvedValue({ data: [{ id: "gpt-5-mini" }] });
    invokeLLM.mockResolvedValue({
      choices: [{
        message: {
          content: JSON.stringify({
            perspective: "Control gaps concentrate in the highest coded operational themes.",
            gaps: [
              { theme: "Human escalation", title: "Escalation ownership", whyNow: "Support is the most repeated operational concern.", recommendedFeature: "Add a named-owner escalation timeline." },
              { theme: "Account trust", title: "Explain account state", whyNow: "Account uncertainty is repeatedly coded in the current view.", recommendedFeature: "Build a compliance decision timeline." },
              { theme: "Pricing control", title: "Make pricing reversible", whyNow: "Pricing control appears repeatedly in the selected evidence.", recommendedFeature: "Create a live tier-change simulator." },
            ],
          }),
        },
      }],
    });
  });

  it("returns three distinct gaps and attaches evidence counts from the supplied filter", async () => {
    const result = await generateFeatureGapSummary({
      filter: "All",
      sampleSize: 38,
      themes: [
        { label: "Human escalation", count: 15 },
        { label: "Account trust", count: 10 },
        { label: "Pricing control", count: 9 },
      ],
    });

    expect(result.model).toBe("gpt-5-mini");
    expect(result.gaps.map(gap => gap.evidenceCount)).toEqual([15, 10, 9]);
    expect(invokeLLM).toHaveBeenCalledWith(expect.objectContaining({ model: "gpt-5-mini" }));
  });
});
