import { describe, expect, it } from "vitest";
import { safeReturnTo } from "./_core/oauth";

describe("safeReturnTo", () => {
  it("preserves an internal administration destination after sign-in", () => {
    expect(safeReturnTo("/admin")).toBe("/admin");
    expect(safeReturnTo("/admin?tab=rubric")).toBe("/admin?tab=rubric");
  });

  it("rejects external and malformed return destinations", () => {
    expect(safeReturnTo("https://example.test")).toBe("/");
    expect(safeReturnTo("//example.test")).toBe("/");
    expect(safeReturnTo("/\\example.test")).toBe("/");
  });
});
