import { describe, expect, it } from "vitest";
import { buildFeatureGapPdf } from "./pdfBriefExport";

describe("buildFeatureGapPdf", () => {
  it("creates a valid PDF envelope containing the active feature-gap brief", () => {
    const pdf = buildFeatureGapPdf({
      filter: "All",
      sampleSize: 38,
      summary: { cacheStatus: "cached", model: "gpt-5-mini", perspective: "Control needs are visible.", gaps: [
        { theme: "Human escalation", evidenceCount: 15, title: "Escalate", whyNow: "Users need help.", recommendedFeature: "Named owner." },
        { theme: "Account trust", evidenceCount: 10, title: "Trust", whyNow: "State is unclear.", recommendedFeature: "State timeline." },
        { theme: "Pricing control", evidenceCount: 9, title: "Price", whyNow: "Billing is opaque.", recommendedFeature: "Tier preview." },
      ] },
    });
    const text = new TextDecoder().decode(pdf);
    expect(text.startsWith("%PDF-1.4")).toBe(true);
    expect(text).toContain("**Evidence filter:** All");
    expect(text).toContain("Named owner.");
  });
});
