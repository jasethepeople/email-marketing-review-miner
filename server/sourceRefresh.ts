import type { Express, Request, Response } from "express";
import { getSourceRefreshSettings, saveSourceRefreshSettings } from "./db";
import { sdk } from "./_core/sdk";

export const REVIEW_SOURCE_URLS = [
  { name: "Klaviyo", url: "https://www.trustpilot.com/review/klaviyo.com" },
  { name: "Mailchimp", url: "https://www.trustpilot.com/review/mailchimp.com" },
  { name: "ActiveCampaign", url: "https://www.trustpilot.com/review/activecampaign.com" },
  { name: "Brevo", url: "https://www.trustpilot.com/review/brevo.com" },
  { name: "Omnisend", url: "https://www.trustpilot.com/review/omnisend.com" },
] as const;

export type SourceAvailability = {
  name: string;
  url: string;
  reachable: boolean;
  status: number | null;
  checkedAt: string;
};

/** Performs a minimal public availability check only; it never parses or writes review content. */
export async function checkReviewSourceAvailability(): Promise<SourceAvailability[]> {
  return Promise.all(REVIEW_SOURCE_URLS.map(async source => {
    try {
      const response = await fetch(source.url, { method: "HEAD", redirect: "follow", signal: AbortSignal.timeout(12_000) });
      // A 401/403 still proves the cited public endpoint is live; it may simply restrict automated HEAD access.
      return { ...source, reachable: response.status >= 200 && response.status < 500, status: response.status, checkedAt: new Date().toISOString() };
    } catch {
      return { ...source, reachable: false, status: null, checkedAt: new Date().toISOString() };
    }
  }));
}

export async function runSourceAvailabilityRefresh() {
  const sources = await checkReviewSourceAvailability();
  const reachable = sources.filter(source => source.reachable).length;
  const status = reachable === sources.length ? "healthy" : reachable > 0 ? "degraded" : "unreachable";
  await saveSourceRefreshSettings({ enabled: true, lastRunAt: new Date(), lastStatus: status, lastResult: { sources, reachable, total: sources.length } });
  return { sources, status, reachable, total: sources.length };
}

export function registerSourceRefreshRoute(app: Express) {
  app.post("/api/scheduled/source-availability", async (req: Request, res: Response) => {
    try {
      const user = await sdk.authenticateRequest(req);
      if (!user.isCron || !user.taskUid) return res.status(403).json({ error: "cron-only" });
      const settings = await getSourceRefreshSettings();
      if (!settings?.enabled || settings.scheduleCronTaskUid !== user.taskUid) return res.json({ ok: true, skipped: "orphan-or-disabled" });
      const result = await runSourceAvailabilityRefresh();
      return res.json({ ok: true, ...result });
    } catch (error) {
      return res.status(500).json({
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
        context: { url: req.originalUrl },
      });
    }
  });
}
