/**
 * Signal Ledger design reminder: editorial data journalism with warm manuscript surfaces,
 * graphite type, and signal coral only where evidence becomes a product decision.
 */
import { useMemo, useState } from "react";
import {
  ArrowDownToLine,
  ArrowUpRight,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Copy,
  ExternalLink,
  FileText,
  Layers3,
  MailWarning,
  Share2,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Workflow,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { buildFeatureGapBrief } from "@/lib/briefExport";
import { buildFeatureGapPdf } from "@/lib/pdfBriefExport";
import {
  Bar,
  BarChart,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const pdfUrl = "/manus-storage/email-marketing-review-miner-executive-strategy_0ba4ae08.pdf";

type CompetitorId = "All" | "Klaviyo" | "Mailchimp" | "ActiveCampaign" | "Brevo" | "Omnisend";

const competitors = [
  {
    name: "Klaviyo",
    profile: "1.7 / 5",
    reviews: "366 public reviews",
    sample: 7,
    negative: 6,
    score: -2.33,
    headline: "Billing control & dependable operations",
    note: "The sample repeatedly links test profiles, plan movement, paid support gates, and unreliable admin behaviour.",
    source: "https://www.trustpilot.com/review/klaviyo.com",
  },
  {
    name: "Mailchimp",
    profile: "2.6 / 5",
    reviews: "1,494 public reviews",
    sample: 8,
    negative: 6,
    score: -2.29,
    headline: "Account-state clarity & support continuity",
    note: "The evidence sample connects account lockouts, setup problems, unclear enforcement, and outdated guidance.",
    source: "https://www.trustpilot.com/review/mailchimp.com",
  },
  {
    name: "ActiveCampaign",
    profile: "2.8 / 5",
    reviews: "1,428 public reviews",
    sample: 8,
    negative: 3,
    score: -1.27,
    headline: "Safe live-workflow changes & optional AI",
    note: "Users value automation power but flag plan increases, AI friction, performance, and limited control around complex work.",
    source: "https://www.trustpilot.com/review/activecampaign.com",
  },
  {
    name: "Brevo",
    profile: "4.0 / 5",
    reviews: "7,180 public reviews",
    sample: 8,
    negative: 6,
    score: -1.64,
    headline: "Explainable compliance & verification",
    note: "The strongest negative pattern is opaque account validation, suspended access, and hard-to-diagnose delivery states.",
    source: "https://www.trustpilot.com/review/brevo.com",
  },
  {
    name: "Omnisend",
    profile: "4.4 / 5",
    reviews: "512 public reviews",
    sample: 7,
    negative: 3,
    score: 1.06,
    headline: "Workflow versioning & campaign portability",
    note: "High-touch migration support is a strength; requested capability remains around live edits, contact movement, and reusable campaigns.",
    source: "https://www.trustpilot.com/review/omnisend.com",
  },
] as const;

const themeData: Record<CompetitorId, { label: string; count: number }[]> = {
  All: [
    { label: "Onboarding & usability", count: 16 },
    { label: "Human escalation", count: 15 },
    { label: "Account trust", count: 10 },
    { label: "Pricing control", count: 9 },
    { label: "Workflow flexibility", count: 9 },
    { label: "Reliability", count: 5 },
  ],
  Klaviyo: [
    { label: "Pricing control", count: 4 },
    { label: "Workflow flexibility", count: 3 },
    { label: "Onboarding & usability", count: 2 },
    { label: "Human escalation", count: 2 },
    { label: "Account trust", count: 1 },
    { label: "Reliability", count: 1 },
  ],
  Mailchimp: [
    { label: "Human escalation", count: 4 },
    { label: "Onboarding & usability", count: 3 },
    { label: "Account trust", count: 2 },
    { label: "Reliability", count: 2 },
    { label: "Pricing control", count: 1 },
    { label: "Workflow flexibility", count: 1 },
  ],
  ActiveCampaign: [
    { label: "Workflow flexibility", count: 4 },
    { label: "Pricing control", count: 4 },
    { label: "Onboarding & usability", count: 3 },
    { label: "Human escalation", count: 3 },
    { label: "Account trust", count: 0 },
    { label: "Reliability", count: 0 },
  ],
  Brevo: [
    { label: "Account trust", count: 6 },
    { label: "Onboarding & usability", count: 5 },
    { label: "Human escalation", count: 3 },
    { label: "Reliability", count: 1 },
    { label: "Pricing control", count: 0 },
    { label: "Workflow flexibility", count: 0 },
  ],
  Omnisend: [
    { label: "Human escalation", count: 3 },
    { label: "Onboarding & usability", count: 3 },
    { label: "Account trust", count: 1 },
    { label: "Workflow flexibility", count: 1 },
    { label: "Reliability", count: 1 },
    { label: "Pricing control", count: 0 },
  ],
};

const buildingBlocks = [
  {
    number: "01",
    title: "Trust Center",
    icon: ShieldCheck,
    statement: "Make every account and send decision explainable.",
    items: ["Compliance review timeline", "Reason categories & appeal path", "Live send / hold state", "Exportable campaign audit log"],
    color: "coral",
  },
  {
    number: "02",
    title: "Pricing Integrity Ledger",
    icon: ClipboardCheck,
    statement: "Turn usage pricing into consent, not surprise.",
    items: ["Non-billable test mode", "30 / 60-day cost forecast", "Explicit tier-change approval", "Downgrade-date preview"],
    color: "gold",
  },
  {
    number: "03",
    title: "Workflow Versions",
    icon: Workflow,
    statement: "Let teams amend revenue logic without rebuilding it.",
    items: ["Draft / active version diff", "Safe live-step edit rules", "Contact-move impact preview", "Full campaign portability"],
    color: "teal",
  },
  {
    number: "04",
    title: "Human-in-loop Copilot",
    icon: Sparkles,
    statement: "Use AI to shorten triage, never to block escalation.",
    items: ["Data-linked suggestions", "One-click context handoff", "Named owner & service clock", "AI guidance can be disabled"],
    color: "graphite",
  },
];

const sourceLabels = [
  ["Klaviyo", "https://www.trustpilot.com/review/klaviyo.com"],
  ["Mailchimp", "https://www.trustpilot.com/review/mailchimp.com"],
  ["ActiveCampaign", "https://www.trustpilot.com/review/activecampaign.com"],
  ["Brevo", "https://www.trustpilot.com/review/brevo.com"],
  ["Omnisend", "https://www.trustpilot.com/review/omnisend.com"],
];

function ScoreTooltip({ active, payload }: { active?: boolean; payload?: { payload: { name: string; negative: number; sample: number } }[] }) {
  if (!active || !payload?.length) return null;
  const data = payload[0].payload;
  return (
    <div className="chart-tooltip">
      <strong>{data.name}</strong>
      <span>{data.negative} negative / {data.sample} sampled excerpts</span>
    </div>
  );
}

export default function Home() {
  const [focus, setFocus] = useState<CompetitorId>("All");
  const [notice, setNotice] = useState("");
  const selected = focus === "All" ? null : competitors.find((competitor) => competitor.name === focus);
  const themes = themeData[focus];
  const maxTheme = Math.max(...themes.map((theme) => theme.count), 1);
  const { data: aiSummary, isLoading: isSummaryLoading, error: summaryError, refetch: refetchSummary } = trpc.reviewInsights.featureGapSummary.useQuery(
    { filter: focus, themes, sampleSize: selected?.sample ?? 38 },
    { staleTime: 30 * 60 * 1000, retry: 1 }
  );

  const chartData = useMemo(
    () => competitors.map((competitor) => ({ name: competitor.name, negative: competitor.negative, sample: competitor.sample })),
    []
  );

  const share = async () => {
    const shareData = { title: "Signal Ledger — Email Marketing Review Miner", text: "Public-review evidence and product opportunities for email marketing SaaS.", url: window.location.href };
    try {
      if (navigator.share) await navigator.share(shareData);
      else {
        await navigator.clipboard.writeText(window.location.href);
        setNotice("Research link copied to clipboard.");
      }
    } catch {
      setNotice("Sharing was cancelled. The research remains available here.");
    }
  };

  const copyThesis = async () => {
    await navigator.clipboard.writeText("Win customers when their campaign operation is at risk: make billing, compliance, workflow change, and human escalation observable, reversible, and explainable.");
    setNotice("Strategy thesis copied to clipboard.");
  };

  const exportBrief = () => {
    if (!aiSummary) return;
    const brief = buildFeatureGapBrief({ filter: focus, sampleSize: selected?.sample ?? 38, summary: aiSummary });
    const blob = new Blob([brief], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `signal-ledger-${focus.toLowerCase().replaceAll(" ", "-")}-feature-gap-brief.md`;
    anchor.click();
    URL.revokeObjectURL(url);
    setNotice("Current feature-gap brief downloaded.");
  };

  const exportPdfBrief = () => {
    if (!aiSummary) return;
    const pdf = buildFeatureGapPdf({ filter: focus, sampleSize: selected?.sample ?? 38, summary: aiSummary });
    const pdfBuffer = new Uint8Array(pdf).buffer as ArrayBuffer;
    const url = URL.createObjectURL(new Blob([pdfBuffer], { type: "application/pdf" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `signal-ledger-${focus.toLowerCase().replaceAll(" ", "-")}-feature-gap-brief.pdf`;
    anchor.click();
    URL.revokeObjectURL(url);
    setNotice("Current feature-gap PDF downloaded.");
  };

  return (
    <div className="ledger-app">
      <aside className="provenance-rail">
        <a className="brand" href="#top" aria-label="Signal Ledger home">
          <img src="/manus-storage/signal-ledger-logo_8a55acc6.png" alt="Signal Ledger mark" />
          <span>Signal<br />Ledger</span>
        </a>
        <div className="rail-rule" />
        <p className="rail-label">Research dossier</p>
        <p className="rail-number">01 / 01</p>
        <nav aria-label="Report sections">
          <a href="#evidence">Evidence</a>
          <a href="#signals">Signals</a>
          <a href="#wedge">Product wedge</a>
          <a href="#sources">Method</a>
        </nav>
        <div className="rail-bottom">
          <span>Public sources</span>
          <span>20 Aug 2026</span>
        </div>
      </aside>

      <main id="top">
        <header className="topbar">
          <div className="topbar-kicker"><span className="live-dot" /> EXECUTIVE RESEARCH / EMAIL MARKETING</div>
          <div className="topbar-actions">
            <a className="quiet-action" href="/admin"><SlidersHorizontal size={15} /> AI rubric</a>
            <button className="quiet-action" onClick={share}><Share2 size={15} /> Share</button>
            <a className="download-action" href={pdfUrl} target="_blank" rel="noreferrer"><ArrowDownToLine size={15} /> Download PDF</a>
          </div>
        </header>

        <section className="hero" id="evidence">
          <div className="hero-copy">
            <p className="section-kicker"><span>PUBLIC REVIEW INTELLIGENCE</span></p>
            <h1>Trace the complaint.<br /><em>Build the escape hatch.</em></h1>
            <p className="hero-deck">A product-strategy read of public feedback across five prominent email-marketing platforms—focused on the failure states that make customers willing to switch.</p>
            <div className="hero-metrics">
              <div><strong>38</strong><span>Cited review excerpts</span></div>
              <div><strong>5</strong><span>Competitors studied</span></div>
              <div><strong>6</strong><span>Recurring pain-point groups</span></div>
            </div>
          </div>
          <div className="hero-art" aria-hidden="true">
            <div className="hero-art-inner" />
            <span className="hero-caption">SIGNAL / 04</span>
          </div>
        </section>

        <section className="thesis-band">
          <div className="slash" />
          <div>
            <p className="eyebrow">STRATEGIC THESIS</p>
            <p>Win the moments when an email platform can interrupt revenue: surprise billing, opaque compliance, a paused send, an uneditable workflow, or a support loop that never reaches an accountable person.</p>
          </div>
          <button onClick={copyThesis} aria-label="Copy strategic thesis"><Copy size={17} /></button>
        </section>

        <section className="section-frame evidence-section">
          <div className="section-heading">
            <div>
              <p className="section-kicker"><span>01 / COMPETITOR LEDGER</span></p>
              <h2>Where dissatisfaction<br />concentrates.</h2>
            </div>
            <p className="margin-note">A purposive evidence sample, not a satisfaction census. Profile scores are public-page context; strategy derives from recurring review language.</p>
          </div>

          <div className="competitor-filter" role="group" aria-label="Focus a competitor">
            {(["All", ...competitors.map((competitor) => competitor.name)] as CompetitorId[]).map((name) => (
              <button key={name} onClick={() => setFocus(name)} className={focus === name ? "is-active" : ""}>{name}</button>
            ))}
          </div>

          <div className="ledger-grid">
            <div className="chart-card">
              <div className="chart-header"><span>NEGATIVE SAMPLE SIGNAL</span><small>hover to inspect</small></div>
              <div className="negative-chart">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 26, right: 12, bottom: 4, left: -18 }}>
                    <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: "#60706f", fontSize: 11 }} />
                    <YAxis hide domain={[0, 8]} />
                    <Tooltip content={<ScoreTooltip />} cursor={{ fill: "rgba(239,102,91,.07)" }} />
                    <Bar dataKey="negative" radius={[3, 3, 0, 0]} maxBarSize={42}>
                      {chartData.map((entry) => <Cell key={entry.name} fill={focus === "All" || focus === entry.name ? "#EF665B" : "#d9d9d1"} />)}
                      <LabelList dataKey="negative" position="top" fill="#233233" fontSize={11} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p className="chart-caption">Negative after a transparent lexicon + review-rating pass. The purpose is thematic comparison inside this sample, not a market ranking.</p>
            </div>

            <div className="focus-card">
              <span className="mini-index">{focus === "All" ? "ALL / 05" : `FOCUS / ${competitors.findIndex((item) => item.name === focus) + 1}`}</span>
              {selected ? (
                <>
                  <h3>{selected.name}</h3>
                  <div className="focus-score"><strong>{selected.profile}</strong><span>{selected.reviews}</span></div>
                  <p>{selected.note}</p>
                  <a href={selected.source} target="_blank" rel="noreferrer">Open public review page <ArrowUpRight size={15} /></a>
                </>
              ) : (
                <>
                  <h3>The sample, not the scoreboard.</h3>
                  <p>Across 38 excerpts, friction clusters around <strong>control</strong>: users need clarity about system state, agency to correct it, and a responsible person when stakes rise.</p>
                  <div className="all-score">24 <span>negative<br />excerpts</span></div>
                </>
              )}
            </div>
          </div>
        </section>

        <section className="section-frame signal-section" id="signals">
          <div className="section-heading narrow">
            <div>
              <p className="section-kicker"><span>02 / THE SHARED SIGNAL</span></p>
              <h2>Customers are asking<br />for control.</h2>
            </div>
            <p className="margin-note">Filter the evidence above to compare how each product contributes to a theme. Each excerpt can belong to more than one theme.</p>
          </div>
          <div className="theme-layout">
            <div className="theme-bars">
              {themes.map((theme, index) => (
                <div className="theme-row" key={theme.label}>
                  <div className="theme-meta"><span>{String(index + 1).padStart(2, "0")}</span><strong>{theme.label}</strong><b>{theme.count}</b></div>
                  <div className="bar-track"><div className={`bar-fill fill-${index}`} style={{ width: `${(theme.count / maxTheme) * 100}%` }} /></div>
                </div>
              ))}
            </div>
            <aside className="evidence-annotation">
              <MailWarning size={20} />
              <p><strong>Do not confuse “AI assistance” with control.</strong> The frustration is not simply automated support. It is the inability to see what changed, reverse it, or hand the case to a responsible operator.</p>
            </aside>
          </div>
        </section>

        <section className="ai-gap-section" aria-live="polite">
          <div className="ai-gap-heading">
            <div>
              <p className="section-kicker"><span>AI / CURRENT FILTER</span></p>
              <h2>Three gaps worth<br />building for.</h2>
            </div>
            <div className="ai-method-note">
              <Sparkles size={18} />
              <p>Generated from the active <strong>{focus}</strong> evidence view only. The model selects from visible coded themes; counts remain tied to the research sample.</p>
            </div>
          </div>

          {isSummaryLoading && (
            <div className="ai-loading" role="status"><span className="loading-spark"><Sparkles size={18} /></span><div><strong>Reading the selected evidence</strong><p>Identifying the three highest-priority feature gaps for this filter.</p></div></div>
          )}

          {summaryError && (
            <div className="ai-error"><div><strong>The summary could not be generated.</strong><span>The chart and evidence remain available. Try the analysis again.</span></div><button onClick={() => refetchSummary()}>Retry AI analysis</button></div>
          )}

          {aiSummary && !isSummaryLoading && (
            <>
              <div className="ai-perspective-row"><p className="ai-perspective">{aiSummary.perspective}</p><div className="ai-export-actions"><button className="ai-export" onClick={exportBrief}><ArrowDownToLine size={14} /> Markdown</button><button className="ai-export" onClick={exportPdfBrief}><ArrowDownToLine size={14} /> PDF brief</button></div></div>
              <div className="ai-gap-grid">
                {aiSummary.gaps.map((gap, index) => (
                  <article className="ai-gap-card" key={gap.theme}>
                    <div className="ai-gap-index"><span>0{index + 1}</span><b>{gap.evidenceCount} mentions</b></div>
                    <p className="ai-theme">{gap.theme}</p>
                    <h3>{gap.title}</h3>
                    <p>{gap.whyNow}</p>
                    <div className="ai-feature"><span>BUILD</span><strong>{gap.recommendedFeature}</strong></div>
                  </article>
                ))}
              </div>
              <p className="ai-footnote">{aiSummary.cacheStatus === "cached" ? "Cached analysis reused; no additional model request." : "Fresh analysis generated from the active evidence."} Model: {aiSummary.model}. This is a strategy aid, not a statistical ranking or an external market claim.</p>
            </>
          )}
        </section>

        <section className="wedge-section" id="wedge">
          <div className="wedge-head">
            <div>
              <p className="section-kicker"><span>03 / THE PRODUCT WEDGE</span></p>
              <h2>Assured Campaign<br />Operations.</h2>
            </div>
            <p>Do not lead with another generic email builder. Lead with a campaign operation that is observable, reversible, and explainable when revenue is at risk.</p>
          </div>
          <div className="build-grid">
            {buildingBlocks.map((block) => {
              const Icon = block.icon;
              return (
                <article className={`build-card ${block.color}`} key={block.number}>
                  <div className="build-card-top"><span>{block.number}</span><Icon size={22} /></div>
                  <h3>{block.title}</h3>
                  <p>{block.statement}</p>
                  <ul>{block.items.map((item) => <li key={item}><CheckCircle2 size={14} />{item}</li>)}</ul>
                  <div className="card-arrow"><ChevronRight size={18} /></div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="sequence-section">
          <div className="sequence-title"><Layers3 size={18} /><span>90-DAY BUILD SEQUENCE</span></div>
          <div className="sequence-grid">
            <div><span>0–30</span><h3>Restore confidence</h3><p>Prototype Trust Center and Pricing Integrity with design partners facing campaign-risk events.</p></div>
            <div><span>31–60</span><h3>Make switching safe</h3><p>Ship workflow versions, impact previews, and a credible migration path for revenue logic.</p></div>
            <div><span>61–90</span><h3>Accelerate recovery</h3><p>Add preflight confidence checks and a context-carrying human escalation route.</p></div>
          </div>
        </section>

        <section className="method-section" id="sources">
          <div className="method-art" aria-hidden="true" />
          <div className="method-copy">
            <p className="section-kicker"><span>04 / EVIDENCE, NOT CERTAINTY</span></p>
            <h2>Methods that remain visible.</h2>
            <p>This dossier uses a manually captured, cited public-review sample from Trustpilot pages. The accompanying Python script applies a transparent domain lexicon, rating-aware sentiment score, pain-point rules, and deterministic TF–IDF k-means clustering.</p>
            <p>The work is qualitative and directional: it is not a full-platform scrape, a statistically representative survey, or evidence of willingness to pay. Validate with recent switchers and controlled onboarding tests before committing to a full-suite build.</p>
            <div className="source-list">
              {sourceLabels.map(([label, href], index) => <a href={href} target="_blank" rel="noreferrer" key={label}><span>[{index + 1}]</span>{label}<ExternalLink size={13} /></a>)}
            </div>
          </div>
        </section>

        <footer>
          <div className="footer-brand"><img src="/manus-storage/signal-ledger-logo_8a55acc6.png" alt="" /> <span>SIGNAL LEDGER</span></div>
          <span>Evidence sample collected 20 Aug 2026</span>
          <a href={pdfUrl} target="_blank" rel="noreferrer"><FileText size={15} /> Executive PDF</a>
        </footer>
      </main>

      {notice && <button className="notice" onClick={() => setNotice("")}>{notice}</button>}
    </div>
  );
}
