/** Signal Ledger administration: persisted controls are intentionally bounded and evidence-first. */
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarClock, Check, History, Loader2, RefreshCw, RotateCcw, Settings2, ShieldAlert, SlidersHorizontal } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";

const themes = ["Onboarding & usability", "Human escalation", "Account trust", "Pricing control", "Workflow flexibility", "Reliability"] as const;

type RubricForm = {
  themeWeights: Record<(typeof themes)[number], number>;
  minimumEvidenceCount: number;
  maximumWords: number;
  analysisPosture: "direct" | "balanced" | "opportunity-led";
};

const defaults: RubricForm = {
  themeWeights: { "Onboarding & usability": 1, "Human escalation": 1.1, "Account trust": 1.05, "Pricing control": 1, "Workflow flexibility": 1, "Reliability": 1 },
  minimumEvidenceCount: 1,
  maximumWords: 110,
  analysisPosture: "balanced",
};

function RubricPanel() {
  const { user, loading } = useAuth();
  const utils = trpc.useUtils();
  const [form, setForm] = useState<RubricForm>(defaults);
  const settingsQuery = trpc.adminRubric.get.useQuery(undefined, { enabled: user?.role === "admin" });
  const historyQuery = trpc.adminRubric.history.useQuery(undefined, { enabled: user?.role === "admin" });
  const sourceRefreshQuery = trpc.sourceRefresh.status.useQuery(undefined, { enabled: user?.role === "admin" });
  const update = trpc.adminRubric.update.useMutation({ onSuccess: ({ rubric }) => { setForm(rubric); utils.adminRubric.get.invalidate(); utils.adminRubric.history.invalidate(); utils.reviewInsights.featureGapSummary.invalidate(); } });
  const rollback = trpc.adminRubric.rollback.useMutation({ onSuccess: ({ rubric }) => { setForm(rubric); utils.adminRubric.get.invalidate(); utils.adminRubric.history.invalidate(); utils.reviewInsights.featureGapSummary.invalidate(); } });
  const enableDaily = trpc.sourceRefresh.enableDaily.useMutation({ onSuccess: () => sourceRefreshQuery.refetch() });
  const runNow = trpc.sourceRefresh.runNow.useMutation({ onSuccess: () => sourceRefreshQuery.refetch() });

  useEffect(() => { if (settingsQuery.data?.rubric) setForm(settingsQuery.data.rubric); }, [settingsQuery.data]);

  if (loading) return <div className="admin-loading"><Loader2 size={22} className="spin" /> Loading administration controls…</div>;
  if (user?.role !== "admin") return <div className="admin-denied"><ShieldAlert size={28} /><h1>Administrator access required</h1><p>This panel changes the scoring rubric used for public AI feature-gap summaries. Sign in with an administrator account to continue.</p><Link href="/">Return to research dossier</Link></div>;

  const valid = Object.values(form.themeWeights).every(value => value >= .25 && value <= 3)
    && form.minimumEvidenceCount >= 1 && form.minimumEvidenceCount <= 5
    && form.maximumWords >= 60 && form.maximumWords <= 180;

  return <div className="admin-page">
    <header className="admin-head"><div><p className="admin-kicker">SIGNAL LEDGER / ADMINISTRATION</p><h1>AI summary rubric</h1><p>Adjust how visible review evidence converts into the three gaps selected for the product-strategy summary.</p></div><Link href="/" className="admin-return">View dossier</Link></header>
    <div className="admin-callout"><Settings2 size={20} /><p><strong>Settings are global.</strong> Changes are persisted and applied on the server to future visitor summaries. Inputs are bounded to preserve evidence-led output.</p></div>
    {settingsQuery.isLoading ? <div className="admin-loading"><Loader2 size={22} className="spin" /> Retrieving current rubric…</div> : <>
      <section className="admin-section"><div className="admin-section-title"><SlidersHorizontal size={18} /><div><h2>Theme weights</h2><p>Higher weights increase a theme’s priority score: coded mentions × weight.</p></div></div><div className="weight-grid">
        {themes.map(theme => <label key={theme} className="weight-field"><span>{theme}</span><div><Input type="number" min="0.25" max="3" step="0.05" value={form.themeWeights[theme]} onChange={event => setForm(current => ({ ...current, themeWeights: { ...current.themeWeights, [theme]: Number(event.target.value) } }))} /><b>×</b></div></label>)}
      </div></section>
      <section className="admin-section parameter-section"><div className="admin-section-title"><Settings2 size={18} /><div><h2>Generation parameters</h2><p>Define the evidence threshold, output budget, and strategy voice sent to the server-side model.</p></div></div><div className="parameter-grid">
        <label><Label htmlFor="minimumEvidence">Minimum evidence mentions</Label><Input id="minimumEvidence" type="number" min="1" max="5" value={form.minimumEvidenceCount} onChange={event => setForm(current => ({ ...current, minimumEvidenceCount: Number(event.target.value) }))} /><small>1–5 coded mentions</small></label>
        <label><Label htmlFor="maximumWords">Maximum summary words</Label><Input id="maximumWords" type="number" min="60" max="180" value={form.maximumWords} onChange={event => setForm(current => ({ ...current, maximumWords: Number(event.target.value) }))} /><small>60–180 words</small></label>
        <label><Label>Analysis posture</Label><Select value={form.analysisPosture} onValueChange={(value: RubricForm["analysisPosture"]) => setForm(current => ({ ...current, analysisPosture: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="balanced">Balanced & calibrated</SelectItem><SelectItem value="direct">Direct & decisive</SelectItem><SelectItem value="opportunity-led">Opportunity-led</SelectItem></SelectContent></Select><small>Changes instruction framing, not evidence.</small></label>
      </div></section>
      <section className="admin-section"><div className="admin-section-title"><History size={18} /><div><h2>Version history</h2><p>Every save creates an immutable snapshot of the rubric it replaced. Restoring a snapshot also invalidates stale summary cache entries.</p></div></div>
        {historyQuery.isLoading ? <div className="admin-inline-loading"><Loader2 size={15} className="spin" /> Loading saved versions…</div> : historyQuery.data?.versions.length ? <div className="history-list">{[...historyQuery.data.versions].reverse().map(version => <div className="history-row" key={version.id}><div><strong>Version {version.id}</strong><span>{new Date(version.createdAt).toLocaleString()} · {version.changeType}</span></div><p>{version.analysisPosture} · {version.minimumEvidenceCount} evidence minimum · {version.maximumWords} words</p><Button variant="outline" size="sm" onClick={() => rollback.mutate({ versionId: version.id })} disabled={rollback.isPending}>Restore</Button></div>)}</div> : <p className="admin-empty">No prior rubric version exists yet. The first save will create a reversible snapshot.</p>}
        {rollback.error && <p className="save-error">The selected version could not be restored. Try again.</p>}
      </section>
      <section className="admin-section"><div className="admin-section-title"><CalendarClock size={18} /><div><h2>Daily source availability</h2><p>Checks whether the five cited public review pages are reachable at 09:00 UTC. This records only availability metadata; it does not ingest or alter review content.</p></div></div>
        <div className="refresh-status"><div><span>STATUS</span><strong>{sourceRefreshQuery.data?.settings?.lastStatus ?? "Not yet checked"}</strong></div><div><span>LAST CHECK</span><strong>{sourceRefreshQuery.data?.settings?.lastRunAt ? new Date(sourceRefreshQuery.data.settings.lastRunAt).toLocaleString() : "—"}</strong></div><div><span>DAILY JOB</span><strong>{sourceRefreshQuery.data?.settings?.scheduleCronTaskUid ? "Active" : "Ready after publishing"}</strong></div></div>
        <div className="refresh-actions"><Button variant="outline" onClick={() => runNow.mutate()} disabled={runNow.isPending}>{runNow.isPending ? <Loader2 size={15} className="spin" /> : <RefreshCw size={15} />} Run availability check</Button><Button onClick={() => enableDaily.mutate()} disabled={enableDaily.isPending || Boolean(sourceRefreshQuery.data?.settings?.scheduleCronTaskUid)}>{enableDaily.isPending ? <Loader2 size={15} className="spin" /> : <CalendarClock size={15} />} {sourceRefreshQuery.data?.settings?.scheduleCronTaskUid ? "Daily check enabled" : "Enable daily check"}</Button></div>
        {enableDaily.error && <p className="save-error">Publish the site, then retry enabling the daily job from this panel.</p>}{runNow.error && <p className="save-error">The source check could not complete. No review data was changed.</p>}
      </section>
      <footer className="admin-actions"><div>{update.isSuccess && <span className="save-success"><Check size={15} /> Rubric saved. New summaries will use these settings.</span>}{update.error && <span className="save-error">Could not save changes. Try again.</span>}</div><div><Button variant="outline" onClick={() => setForm(defaults)} disabled={update.isPending}><RotateCcw size={15} /> Reset defaults</Button><Button onClick={() => update.mutate(form)} disabled={!valid || update.isPending}>{update.isPending ? <Loader2 size={15} className="spin" /> : <Check size={15} />} Save rubric</Button></div></footer>
    </>}
  </div>;
}

export default function AdminSettings() { return <DashboardLayout><RubricPanel /></DashboardLayout>; }
