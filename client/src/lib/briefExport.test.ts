import { describe, expect, it } from "vitest";
import { buildFeatureGapBrief } from "./briefExport";

describe("buildFeatureGapBrief", () => {
  it("exports the active filter, cache status, and all three evidence-grounded gaps", () => {
    const brief = buildFeatureGapBrief({
      filter: "Brevo",
      sampleSize: 8,
      summary: {
        cacheStatus: "cached",
        model: "gpt-5-mini",
        perspective: "Account control should lead the build sequence.",
        gaps: [
          { theme: "Account trust", evidenceCount: 6, title: "Trust center", whyNow: "The top signal.", recommendedFeature: "Reason codes." },
          { theme: "Onboarding & usability", evidenceCount: 5, title: "Guidance", whyNow: "Setup is difficult.", recommendedFeature: "Setup flow." },
          { theme: "Human escalation", evidenceCount: 3, title: "Escalation", whyNow: "Support is delayed.", recommendedFeature: "SLA handoff." },
        ],
      },
    });

    expect(brief).toContain("**Evidence filter:** Brevo");
    expect(brief).toContain("**Summary source:** Validated cached analysis");
    expect(brief).toContain("Account trust (6 mentions)");
    expect(brief).toContain("SLA handoff.");
  });
});
