import { afterEach, describe, expect, it, vi } from "vitest";
import { checkReviewSourceAvailability } from "./sourceRefresh";

describe("checkReviewSourceAvailability", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("records reachability metadata only for every cited public source", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, status: 200 })
      .mockResolvedValueOnce({ ok: false, status: 403 })
      .mockResolvedValueOnce({ ok: true, status: 200 })
      .mockResolvedValueOnce({ ok: true, status: 200 })
      .mockResolvedValueOnce({ ok: true, status: 200 });
    vi.stubGlobal("fetch", fetchMock);

    const results = await checkReviewSourceAvailability();

    expect(results).toHaveLength(5);
    expect(results[0]).toMatchObject({ name: "Klaviyo", reachable: true, status: 200 });
    expect(results[1]).toMatchObject({ name: "Mailchimp", reachable: true, status: 403 });
    expect(fetchMock).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ method: "HEAD" }));
    expect(results.every(result => Object.keys(result).every(key => ["name", "url", "reachable", "status", "checkedAt"].includes(key)))).toBe(true);
  });

  it("returns a safe unreachable result when a source request fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network unavailable")));
    const results = await checkReviewSourceAvailability();
    expect(results.every(result => result.reachable === false && result.status === null)).toBe(true);
  });
});
