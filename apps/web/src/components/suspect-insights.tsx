"use client";
import { useMemo, useState } from "react";
import { ArrowDownToLine, ArrowUpRight, SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import { num } from "@/lib/api";
import type { Opportunity, Snapshot, User } from "@/lib/types";
import { planningPortfolio, financialProjection, PLANNING_NOTE, PLANNING_VERSION } from "@/lib/suspect-planning";
import { downloadRiskJson } from "@/lib/risk-client";
import { Panel, Empty } from "./shared";
import { Button } from "./ui/button";
import { CompositionRing } from "./report-visuals";
import { AnalyticsBars, ProjectionTrend, REPORT_COLORS } from "./analytics-charts";
import { useRiskContext } from "./risk-ui";
import styles from "./suspect-insights.module.css";

const pct = (value: number | null) => value == null ? "—" : `${Math.round(value * 100)}%`;
const money = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
const kind = (value: string) => ({ documented_gap: "Documentation gap", historical_condition: "Historical condition", predictive_signal: "Predictive signal", integrity_review: "Accuracy correction", source_issue: "Source readiness", scenario_comparison: "Scenario" }[value] || value.replaceAll("_", " "));
export function RegistryInsights({ rows }: { rows: Opportunity[] }) {
  const report = useMemo(() => planningPortfolio(rows), [rows]);
  return <div className={styles.registry} aria-label="Suspect portfolio insights">
    <Panel title="Closure likelihood" subtitle="Estimated · active findings only"><CompositionRing items={report.bands.map((b, i) => ({ ...b, color: REPORT_COLORS[i] }))} label="open findings" /></Panel>
    <Panel title="Evidence profile" subtitle="Current filters · open opportunities"><AnalyticsBars horizontal height={210} rows={report.byEvidence.map(r => ({ name: r.name, value: r.findings }))} /></Panel>
    <Panel title="Opportunity outlook" subtitle="Planning estimates"><div className={styles.outlook}><span>Average closure estimate</span><strong>{pct(report.meanProbability)}</strong><p>{num(Math.round(report.expectedClosures))} expected finding outcomes across {num(report.estimated.length)} modeled findings.</p><Link href="/analytics?view=Suspecting">Explore suspect intelligence<ArrowUpRight size={14} /></Link></div></Panel>
  </div>;
}

export function SuspectReport({ data, user, financial = false }: { data: Snapshot; user: User; financial?: boolean }) {
  const context = useRiskContext();
  const [evidence, setEvidence] = useState("all");
  const [type, setType] = useState("all");
  const [reach, setReach] = useState(75);
  const [realization, setRealization] = useState(85);
  const [benchmark, setBenchmark] = useState(1100);
  const [months, setMonths] = useState(12);
  const rows = useMemo(() => data.opportunities.filter(o => (evidence === "all" || o.evidence === evidence) && (type === "all" || o.type === type)), [data.opportunities, evidence, type]);
  const report = useMemo(() => planningPortfolio(rows), [rows]);
  const ma = context.configId.startsWith("ma_");
  const values = [.75, 1, 1.2].map(factor => financialProjection(report.positiveExposure, reach / 100, Math.min(1, realization / 100 * factor), benchmark, months));
  const projection = ["Start", "25%", "50%", "75%", "100%"].map((name, i) => ({ name: i ? `${Math.round(months * i / 4)} mo` : name, conservative: values[0] * i / 4, base: values[1] * i / 4, optimistic: values[2] * i / 4 }));
  const exportReport = () => downloadRiskJson({ report: financial ? "financial_planning" : "suspect_intelligence", source: PLANNING_VERSION, definition: PLANNING_NOTE, config_id: context.configId, filters: { evidence, type }, findings: rows.length, open_findings: report.active.length, expected_outcomes: report.expectedClosures, closure_bands: report.bands, conditions: report.byCondition.map(({ probabilities, ...group }) => group), evidence: report.byEvidence.map(({ probabilities, ...group }) => group), ...(financial && ma ? { assumptions: { reach_percent: reach, realization_percent: realization, monthly_benchmark: benchmark, months, overlap_method: "Largest positive probability-weighted exposure per member; not a combined model calculation" }, estimated_positive_score_points: report.positiveExposure, correction_score_points_separate: report.correctionExposure, scenarios: { conservative: values[0], base: values[1], optimistic: values[2] }, projection } : {}) }, `${financial ? "financial" : "suspect"}-planning.json`);
  return <div className={styles.report}>
    <div className={styles.heading}><div><span className={styles.eyebrow}>{financial ? "FINANCIAL INTELLIGENCE" : "SUSPECT INTELLIGENCE"}</span><h2>{financial ? "Turn opportunity into a planning outlook" : "A clearer view of the opportunity"}</h2><p>{financial ? "Explore the value of supported documentation under explicit assumptions." : "Understand the evidence, likely outcomes and conditions driving your suspect population."}</p></div>{context.permissions.includes("export") && <Button variant="outline" onClick={exportReport}><ArrowDownToLine size={15} />Export analysis</Button>}</div>
    <div className={styles.filters}><SlidersHorizontal size={17} /><label>Evidence<select value={evidence} onChange={e => setEvidence(e.target.value)}><option value="all">All evidence levels</option>{[...new Set(data.opportunities.map(o => o.evidence))].map(value => <option key={value}>{value}</option>)}</select></label><label>Finding type<select value={type} onChange={e => setType(e.target.value)}><option value="all">All finding types</option>{[...new Set(data.opportunities.map(o => o.type))].map(value => <option key={value} value={value}>{kind(value)}</option>)}</select></label><span>{num(rows.length)} findings · {num(report.active.length)} open</span><Button variant="ghost" size="sm" disabled={evidence === "all" && type === "all"} onClick={() => { setEvidence("all"); setType("all"); }}>Reset</Button></div>
    {!rows.length ? <Empty title="No findings match these filters" description="Reset filters to inspect the full authorized suspect population." /> : <>
    <div className={styles.metrics}>
      <div><span>Open opportunities</span><strong>{num(report.active.length)}</strong><small>{num(report.activeMembers)} distinct members</small></div>
      <div><span>Modeled closure likelihood</span><strong>{pct(report.meanProbability)}</strong><small>{num(report.estimated.length)} modeled · {num(report.unmodeled)} readiness-only</small></div>
      <div><span>Expected finding outcomes</span><strong>{num(Math.round(report.expectedClosures))}</strong><small>Sum of open finding probabilities</small></div>
      <div><span>{financial && ma ? "Base financial projection" : "Strong-evidence opportunities"}</span><strong>{financial && ma ? money(values[1]) : num(report.byEvidence.find(r => r.name === "Strong")?.findings || 0)}</strong><small>{financial && ma ? `${months} months · positive opportunities only` : "Available evidence, not confirmed diagnoses"}</small></div>
    </div>
    {financial ? ma ? <>
      <div className={styles.assumptions}><label>Reach<input aria-label="Planning reach" type="range" min="0" max="100" value={reach} onChange={e => setReach(Number(e.target.value))} /><strong>{reach}%</strong></label><label>Realization<input aria-label="Planning realization" type="range" min="0" max="100" value={realization} onChange={e => setRealization(Number(e.target.value))} /><strong>{realization}%</strong></label><label>Monthly benchmark ($)<input aria-label="Monthly benchmark" type="number" min="0" max="10000" value={benchmark} onChange={e => setBenchmark(Math.max(0, Math.min(10000, Number(e.target.value))))} /></label><label>Projection horizon<select aria-label="Projection horizon" value={months} onChange={e => setMonths(Number(e.target.value))}>{[6, 12, 18, 24].map(m => <option key={m} value={m}>{m} months</option>)}</select></label></div>
      <div className={styles.grid}><Panel title="Cumulative opportunity outlook" subtitle="Estimated linear realization over the selected horizon"><ProjectionTrend rows={projection} /></Panel><Panel title="A range, with transparent assumptions" subtitle="Sensitivity to the realization assumption"><div className={styles.scenarios}>{["Conservative", "Base case", "Optimistic"].map((name, i) => <div key={name} data-featured={i === 1}><span>{name}</span><strong>{money(values[i])}</strong><small>{Math.round(Math.min(100, realization * [.75, 1, 1.2][i]))}% realization</small></div>)}</div><p className={styles.note}>Positive exposure × reach × realization × monthly benchmark × months. Closure probability is already included in exposure. One positive opportunity per member is retained to limit overlap.</p></Panel></div>
      <div className={styles.bridge}><div><span>Probability-weighted positive exposure</span><strong>{report.positiveExposure.toFixed(2)} pts</strong></div><span>×</span><div><span>Reach / realization</span><strong>{reach}% / {realization}%</strong></div><span>×</span><div><span>Benchmark / horizon</span><strong>{money(benchmark)} / {months} mo</strong></div><span>=</span><div><span>Base scenario</span><strong>{money(values[1])}</strong></div></div>
      <p className={styles.note}>Accuracy corrections carry {report.correctionExposure.toFixed(2)} estimated score points and are shown separately, not counted as upside. Exposure assumptions are unnormalized and are not official model coefficients or a payment forecast.</p>
    </> : <Panel title="Program-specific financial methods"><p className={styles.note}>This portfolio projection is scoped to MA. ACA and external Medicaid retain their own program-specific sensitivity methods; a common dollars-per-score multiplier is not applied across programs.</p></Panel> : <>
      <div className={styles.grid}><Panel title="Closure probability profile" subtitle="Evidence-led assumptions for open findings"><CompositionRing items={report.bands.map((band, i) => ({ ...band, color: REPORT_COLORS[i] }))} label="open findings" /></Panel><Panel title="Evidence to expected outcomes" subtitle="Finding counts compared with probability-weighted outcomes"><AnalyticsBars rows={report.byEvidence.map(row => ({ name: row.name, findings: row.findings, expected: Math.round(row.expected) }))} keys={[{ key: "findings", name: "Open findings" }, { key: "expected", name: "Expected outcomes" }]} /></Panel></div>
      <div className={styles.grid}><Panel title="Conditions driving the opportunity" subtitle="Top eight conditions by open findings"><AnalyticsBars horizontal height={330} rows={report.byCondition.slice(0, 8).map(row => ({ name: row.name.replace("Chronic ", "").slice(0, 25), value: row.findings }))} /></Panel><Panel title="Finding mix" subtitle="Documentation, recapture, predictive and integrity signals"><CompositionRing items={report.byType.map((row, i) => ({ name: kind(row.name), value: row.findings, color: REPORT_COLORS[i % REPORT_COLORS.length] }))} label="open findings" /></Panel></div>
    </>}
    </>}
    <details className={styles.method}><summary>Planning methodology & data provenance</summary><p>{PLANNING_NOTE}</p><p>Strong / Moderate / Limited evidence start at 82% / 56% / 28%. Historical conditions subtract 8 percentage points; predictive signals subtract 14. Source-readiness and scenario-only findings are not modeled. Resolved, suppressed and deferred findings are excluded from open opportunity projections. These are planning assumptions, not learned or validated probabilities.</p><p>The finding population is the retained MA suspect catalog, scoped to your access. Selecting another scoring configuration does not reclassify these findings. Official scores and saved clinical history remain unchanged. Version: {PLANNING_VERSION}.</p></details>
  </div>;
}
