"use client";
import { CompositionRing, CoverageGauge } from "./report-visuals";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, ArrowUpRight, Calculator, ChevronRight, Download, FileText, Layers3, LoaderCircle, RefreshCw, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Empty, PageHeader, Panel, Status } from "./shared";
import { PaginatedTable } from "./table-pagination";
import { api, label, num } from "@/lib/api";
import { useUrlState } from "@/hooks/workspace-state";
import { riskClient, formatRiskScore, scoreBasisLabels, riskDecimals, canCalculateConfiguration, downloadRiskJson } from "@/lib/risk-client";
import type { RiskPrecision, RiskConfiguration, RiskRun, RiskMemberProfile, RiskScenarioResult, ScoreBasis, RiskOverview as RiskOverviewData } from "@/lib/risk-types";
import type { User } from "@/lib/types";

type RiskContextValue = {
  configuration?: RiskConfiguration;
  configurations: RiskConfiguration[];
  configId: string;
  basis: ScoreBasis;
  permissions: string[];
  pending: boolean;
  error: Error | null;
  choose: (config: string, basis?: ScoreBasis) => void;
  href: (path: string) => string;
};
const RiskContext = createContext<RiskContextValue | null>(null);
export function useRiskContext() {
  const value = useContext(RiskContext);
  if (!value) throw new Error("Risk context is unavailable");
  return value;
}
export function RiskProvider({ user, children }: { user: User; children: ReactNode }) {
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const [stored, setStored] = useState<{ config: string; basis: ScoreBasis } | null>(null);
  const models = useQuery({ queryKey: ["risk", "configurations", user.id], queryFn: riskClient.configurations });
  useEffect(() => {
    try {
      const value = sessionStorage.getItem(`ct-risk-context-${user.id}`);
      if (value) setStored(JSON.parse(value));
    } catch { /* An invalid saved preference does not replace server defaults. */ }
  }, [user.id]);
  const configId = params?.get("config") || stored?.config || models.data?.default_config_id || "";
  const requestedBasis = params?.get("basis") || stored?.basis || "captured_baseline";
  const basis: ScoreBasis = requestedBasis in scoreBasisLabels ? requestedBasis as ScoreBasis : "captured_baseline";
  const choose = (config: string, nextBasis = basis) => {
    setStored({ config, basis: nextBasis });
    sessionStorage.setItem(`ct-risk-context-${user.id}`, JSON.stringify({ config, basis: nextBasis }));
    const next = new URLSearchParams(params?.toString());
    next.set("config", config); next.set("basis", nextBasis); next.delete("run");
    router.replace(`${pathname}?${next}`, { scroll: false });
  };
  const href = (path: string) => {
    const [target, search = ""] = path.split("?");
    const next = new URLSearchParams(search);
    if (configId && !next.has("config")) next.set("config", configId);
    if (!next.has("basis")) next.set("basis", basis);
    return `${target}${next.size ? `?${next}` : ""}`;
  };
  return <RiskContext.Provider value={{ configuration: models.data?.items.find((item) => item.id === configId), configurations: models.data?.items || [], configId, basis, permissions: models.data?.permissions || [], pending: models.isPending, error: models.error, choose, href }}>{children}</RiskContext.Provider>;
}

export function RiskContextBar() {
  const context = useRiskContext();
  const config = context.configuration;
  return <div className="risk-context-bar" aria-label="Risk calculation context">
    <label><span>Program & model</span><select aria-label="Program and model configuration" value={context.configId} disabled={context.pending || !context.configurations.length} onChange={(e) => context.choose(e.target.value, e.target.value === "medicaid_fl_external" ? "reported" : context.basis === "reported" ? "captured_baseline" : context.basis)}>
      {!context.configurations.length && <option value="">{context.error ? "Model service unavailable" : "Loading configurations…"}</option>}
      {context.configurations.map((item) => <option key={item.id} value={item.id}>{item.name || item.id}</option>)}
    </select></label>
    <label><span>Score basis</span><select aria-label="Score basis" value={context.basis} onChange={(e) => context.choose(context.configId, e.target.value as ScoreBasis)}>{Object.entries(scoreBasisLabels).map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select></label>
    <div className="risk-context-detail"><strong>{config ? `${config.year} · ${label(config.run_type || "Configured period")}` : "Configuration pending"}</strong><span>{config?.service_start && config?.service_end ? `Service dates ${config.service_start} — ${config.service_end}` : "Service window not supplied"}</span></div>
    <span className="risk-origin">{config?.status ? label(config.status) : "Awaiting configuration"}</span>
  </div>;
}

function LoadingRisk({ text = "Loading risk results…" }: { text?: string }) {
  return <div className="risk-loading" role="status"><LoaderCircle size={19} className="animate-spin" /><span>{text}</span></div>;
}
function RiskError({ error, retry }: { error: Error | null; retry?: () => void }) {
  return <div className="risk-error" role="alert"><strong>Risk results could not be loaded</strong><p>{error?.message || "The requested result is unavailable."}</p>{retry && <Button variant="outline" size="sm" onClick={retry}><RefreshCw size={14} />Try again</Button>}</div>;
}
function riskScoreName(program?: string) { return program === "MA" ? "Raw RAF" : program === "Part D" ? "Raw RxHCC score" : program === "ACA" ? "Raw HHS-HCC score" : program?.startsWith("Medicaid") ? "Imported raw score" : "Raw model score"; }
function ScoreMetric({ title, value, note, precision = 3, signed = false, href }: { title: string; value: number | null | undefined; note: string; precision?: RiskPrecision; signed?: boolean; href?: string }) {
  const content = <><span>{title}</span><strong>{formatRiskScore(value, precision, signed)}</strong><small>{note}{href && <ArrowUpRight size={13} />}</small></>;
  return href ? <Link className="risk-metric" href={href}>{content}</Link> : <div className="risk-metric">{content}</div>;
}

export function RiskOverview({ user, embedded = false }: { user: User; embedded?: boolean }) {
  const context = useRiskContext();
  const result = useQuery({ queryKey: ["risk", "overview", user.id, context.configId, context.basis], queryFn: () => riskClient.overview(context.configId, context.basis), enabled: !!context.configId, refetchInterval: (query) => ["running", "queued"].includes(query.state.data?.batch?.status || "") ? 2000 : false });
  const client = useQueryClient();
  const [busy, setBusy] = useState(false);
  const overview = result.data;
  const coverageHref = context.href(user.screens.includes("data") ? "/data?riskTab=coverage" : "/members");
  const runBatch = async () => {
    setBusy(true);
    try { await riskClient.startBatch(context.configId, user.csrf_token); await client.invalidateQueries({ queryKey: ["risk"] }); toast.success("Population calculation started"); }
    catch (error) { toast.error((error as Error).message); } finally { setBusy(false); }
  };
  return <div className="risk-workspace">
    {!embedded && <PageHeader title="Risk overview" description="Calculated risk, supporting evidence and the work that changes it.">
      {context.permissions.includes("export") && <Button variant="outline" disabled={!overview || !!result.error} onClick={() => downloadRiskJson(overview, `risk-overview-${context.configId}-${context.basis}.json`)}><Download size={15} />Export results</Button>}
      {user.screens.includes("scenarios") && <Button variant="outline" asChild><Link href={context.href("/scenarios")}><Calculator size={15} />Open model lab</Link></Button>}
      <Button disabled={busy || !context.configId || !canCalculateConfiguration(context.configuration) || context.basis !== "captured_baseline" || !context.permissions.includes("risk_calculate")} onClick={runBatch}><RefreshCw size={15} className={busy ? "animate-spin" : ""} />{busy ? "Starting…" : "Calculate population"}</Button>
    </PageHeader>}
    {embedded && context.permissions.includes("export") && <div className="risk-profile-toolbar"><span /><Button variant="outline" disabled={!overview || !!result.error} onClick={() => downloadRiskJson(overview, `risk-overview-${context.configId}-${context.basis}.json`)}><Download size={15} />Export results</Button></div>}
    {context.error ? <RiskError error={context.error} /> : result.isPending ? <LoadingRisk /> : result.error ? <RiskError error={result.error} retry={() => result.refetch()} /> : overview ? <>
      {overview.stale && <div className="risk-notice"><RefreshCw size={15} /><span>Inputs have changed. The last completed results remain visible until the calculation finishes.</span></div>}
      <div className="risk-metrics">
        <ScoreMetric title={context.configuration?.score_label || riskScoreName(context.configuration?.program)} value={overview.portfolio.raw_score} precision={context.configuration?.precision} note={scoreBasisLabels[context.basis]} href={context.href("/members?riskStatus=completed")} />
        <ScoreMetric title="Adjusted portfolio score" value={overview.portfolio.adjusted_score} precision={context.configuration?.precision} note={overview.portfolio.weighting || "Configured weighting"} href={context.href("/members?riskStatus=completed")} />
        <ScoreMetric title="Successfully scored" value={overview.coverage.scored_members} precision={0} note={`${num(overview.coverage.expected_scoreable)} expected scoreable members`} href={coverageHref} />
        <ScoreMetric title="Without a completed score" value={overview.coverage.unscored_members} precision={0} note={`${num(overview.coverage.failed_members)} failed · ${num(overview.coverage.excluded_members)} excluded`} href={context.href("/members?riskStatus=unscored")} />
      </div>
      {overview.portfolio.incomplete_reason && <div className="risk-notice">{overview.portfolio.incomplete_reason}</div>}
      {!!overview.external_groups?.length && <Panel title="Comparable external score groups" subtitle="Producer, program, rating period and normalization basis remain explicit."><PaginatedTable rows={overview.external_groups} label="Comparable external score groups" scope={`${user.id}:${context.configId}:${context.basis}`} headers={<><th>Producer / model</th><th>Program / period</th><th>Normalization basis</th><th>Coverage</th><th>Raw / adjusted score</th></>}>{(group, index) => <tr key={index}><td><strong>{group.producer}</strong><small>{group.model_version}</small></td><td>{group.program}<small>{group.rating_period} · {group.rate_cells.join(", ")}</small></td><td>{group.normalization_basis}</td><td>{group.members} members<small>{group.member_months} member-months</small></td><td>{formatRiskScore(group.raw_score)}<small>{formatRiskScore(group.adjusted_score)} adjusted</small></td></tr>}</PaginatedTable></Panel>}
      <div className="risk-overview-grid">
        <Panel title="Risk distribution" subtitle={`${scoreBasisLabels[context.basis]} · ${overview.portfolio.weighting || "Selected population"}`}>
          <CompositionRing items={overview.distribution.map(bucket => ({ name: bucket.label, value: bucket.count }))} label="scored members" /><div className="risk-panel-foot"><span>{num(overview.coverage.scored_member_months)} scored member-months</span><Link href={coverageHref}>Inspect coverage<ArrowRight size={13} /></Link></div>
        </Panel>
        <Panel title="Calculation coverage" subtitle="Excluded and failed records remain part of the reconciliation."><CoverageGauge value={overview.coverage.scored_members} total={overview.coverage.expected_scoreable} label="Calculation completeness" />
          <dl className="risk-definition-list"><div><dt>Enrolled members</dt><dd>{num(overview.coverage.enrolled_members)}</dd></div><div><dt>Expected scoreable</dt><dd>{num(overview.coverage.expected_scoreable)}</dd></div><div><dt>Completed</dt><dd>{num(overview.coverage.scored_members)}</dd></div><div><dt>Failed calculations</dt><dd>{num(overview.coverage.failed_members)}</dd></div><div><dt>Excluded</dt><dd>{num(overview.coverage.excluded_members)}</dd></div><div><dt>Portfolio denominator</dt><dd>{num(overview.portfolio.denominator)}</dd></div></dl>
          {overview.batch && <div className="risk-panel-foot"><span>{label(overview.batch.status)} · {num(overview.batch.processed)} / {num(overview.batch.total)}</span><Link href={context.href(user.screens.includes("data") ? "/data?riskTab=runs" : "/members")}>Open run<ArrowRight size={13} /></Link></div>}
        </Panel>
      </div>
      {!!overview.metrics.length && <details className="risk-disclosure risk-method"><summary>Metric definitions and denominators</summary>{overview.metrics.map((metric) => <p key={metric.id}><strong>{metric.label}.</strong> {metric.definition || metric.unit}{metric.denominator !== undefined ? ` · Denominator: ${num(metric.denominator)}` : ""}{metric.numerator !== undefined ? ` · Numerator: ${formatRiskScore(metric.numerator, 6)}` : ""}</p>)}</details>}
      <Panel title="Member risk results" subtitle="Each result opens its retained input and factor ledger." action={<Link href={context.href("/members")}>All members<ArrowRight size={14} /></Link>}>
        <MemberRiskResults key={`${user.id}:${context.configId}:${context.basis}`} members={overview.members} />
      </Panel>
    </> : null}
  </div>;
}

function MemberRiskResults({ members }: { members: RiskOverviewData["members"] }) {
  const context = useRiskContext();
  if (!members.length) return <Empty title="No member results yet" description="Start a calculation or inspect model and input readiness." />;
  return <PaginatedTable rows={members} label="Member risk results" noun="members" headers={<><th>Member</th><th>Raw score</th><th>Adjusted score</th><th>Calculation state</th><th>Result</th></>}>
    {(member) => <tr key={member.member_id}>
      <td><strong>{member.name || member.member_id}</strong><small>{member.member_id}</small></td>
      <td className="risk-number">{formatRiskScore(member.raw_score, context.configuration?.precision)}</td>
      <td className="risk-number">{formatRiskScore(member.adjusted_score, context.configuration?.precision)}</td>
      <td>{label(member.stale ? "stale" : member.status || (member.run_id ? "completed" : "not_calculated"))}</td>
      <td><Link href={context.href(`/members/${member.member_id}?tab=Risk+profile`)}>Open profile<ArrowUpRight size={13} /></Link></td>
    </tr>}
  </PaginatedTable>;
}

export function RiskRunLedger({ run, memberId }: { run: RiskRun; memberId: string }) {
  const context = useRiskContext();
  const [tab, setTab] = useState("Factors");
  const precision = riskDecimals(run.precision);
  const exportRun = async () => { try { const response = await fetch(`/api/v1/risk/runs/${encodeURIComponent(run.id)}/export`); if (!response.ok) throw new Error("The calculation export could not be downloaded."); const blob = await response.blob(); const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = `perform-plus-${run.id}.json`; link.click(); URL.revokeObjectURL(url); } catch (error) { toast.error((error as Error).message); } };
  return <div className="risk-run-ledger">
    <div className="risk-result-heading"><div><span className="risk-eyebrow">{scoreBasisLabels[run.score_basis] || label(run.score_basis)}</span><h2>{run.model_version} · {run.year}</h2><p>{label(run.selected_segment)} · {run.software_release}</p></div><div><Status value={run.status} />{context.permissions.includes("export") && <Button variant="ghost" size="sm" onClick={exportRun}><Download size={13} />Export ledger</Button>}<small>{label(run.origin)}{run.synthetic ? " · Synthetic inputs" : ""}</small></div></div>
    <div className="risk-metrics two"><ScoreMetric title={riskScoreName(run.program)} value={run.raw_score} precision={precision} note="Output before applicable payment transformations" /><ScoreMetric title="Adjusted score" value={run.adjusted_score} precision={precision} note="Applied transformations are retained below" /></div>
    {!!run.errors?.length && <div className="risk-error"><strong>Calculation requires attention</strong>{run.errors.map((error) => <p key={error}>{error}</p>)}</div>}
    {!!run.warnings?.length && <details className="risk-disclosure"><summary>{run.warnings.length} calculation note{run.warnings.length > 1 ? "s" : ""}</summary>{run.warnings.map((warning) => <p key={warning}>{warning}</p>)}</details>}
    <div className="risk-tabs" role="tablist" aria-label="Calculation details">{["Factors", "Categories", "Monthly eligibility", "Exclusions", "Provenance"].map((name) => <button key={name} role="tab" aria-selected={tab === name} onClick={() => setTab(name)}>{name}{name === "Exclusions" && ` (${run.exclusions?.length || 0})`}</button>)}</div>
    {tab === "Factors" ? <>
      <div className="table-scroll"><table className="risk-table"><thead><tr><th>Model factor</th><th>Type / segment</th><th>Coefficient</th><th>Contribution</th></tr></thead><tbody>{run.components?.map((factor, index) => <tr key={`${factor.factor}-${index}`}><td><strong>{factor.description || factor.factor}</strong><small>{factor.factor}</small></td><td>{label(factor.kind)}{factor.segment && <small>{label(factor.segment)}</small>}</td><td className="risk-number">{formatRiskScore(factor.coefficient, precision)}</td><td className="risk-number">{formatRiskScore(factor.contribution, precision)}</td></tr>)}</tbody></table></div>
      {!run.components?.length && <Empty title="Component detail unavailable" description="This result does not contain a locally calculated factor ledger." />}
      {!!run.transformations?.length && <details className="risk-disclosure" open><summary>Adjustment bridge</summary><div className="table-scroll"><table className="risk-table"><thead><tr><th>Transformation</th><th>Factor</th><th>Input</th><th>Output</th></tr></thead><tbody>{run.transformations.map((item, i) => <tr key={i}><td>{item.name || item.label || item.operation || item.description || `Step ${i + 1}`}{item.source && <small>{item.source}</small>}</td><td>{item.factor ?? (item.normalization ? `÷ ${item.normalization}${item.coding_pattern_multiplier ? ` × ${item.coding_pattern_multiplier}` : ""}` : "—")}</td><td>{formatRiskScore(item.input, precision)}</td><td>{formatRiskScore(item.output, precision)}</td></tr>)}</tbody></table></div></details>}
    </> : tab === "Categories" ? <div className="table-scroll"><table className="risk-table"><thead><tr><th>Diagnosis</th><th>Model category</th><th>Model treatment</th><th>Source record</th></tr></thead><tbody>{run.categories?.map((category, index) => <tr key={`${category.code}-${index}`}><td><strong>{category.code}</strong><small>{category.description}</small></td><td>{category.category || "No mapping"}</td><td>{label(category.status)}{category.reason && <small>{category.reason}</small>}</td><td>{category.source_ids?.length ? category.source_ids.map((source) => <Link key={source} href={context.href(source.startsWith("DOC-") ? `/members/${memberId}?tab=Evidence+%26+documents&document=${encodeURIComponent(source)}` : `/members/${memberId}?tab=Scoring+inputs&source=${encodeURIComponent(source)}&run=${run.id}`)}>{source}<ArrowUpRight size={12} /></Link>) : <span>Source detail unavailable</span>}</td></tr>)}</tbody></table>{!run.categories?.length && <Empty title="No mapped diagnosis categories" description="A demographic-only result can still have a valid model score." />}</div>
    : tab === "Monthly eligibility" ? <div className="table-scroll"><table className="risk-table"><thead><tr><th>Month</th><th>Selected segment</th><th>Raw score</th><th>Adjusted score</th></tr></thead><tbody>{run.monthly_scores?.map((month) => <tr key={month.month}><td>{month.month}</td><td>{label(month.segment)}</td><td>{formatRiskScore(month.raw_score, precision)}</td><td>{formatRiskScore(month.adjusted_score, precision)}</td></tr>)}</tbody></table>{!run.monthly_scores?.length && <Empty title="No monthly component detail" description="Inspect the selected program's aggregation and input basis." />}</div>
    : tab === "Exclusions" ? run.exclusions?.length ? <div className="table-scroll"><table className="risk-table"><thead><tr><th>Input record</th><th>Code</th><th>Exclusion reason</th></tr></thead><tbody>{run.exclusions.map((item) => <tr key={item.id}><td>{item.id}</td><td>{item.code || "—"}</td><td>{item.reason}</td></tr>)}</tbody></table></div> : <Empty title="No excluded inputs" description="The retained calculation reports no input exclusions." />
    : <dl className="risk-definition-list"><div><dt>Calculation run</dt><dd>{run.id}</dd></div><div><dt>Input snapshot</dt><dd>{run.snapshot_id}</dd></div><div><dt>Configuration</dt><dd>{run.config_id}</dd></div><div><dt>Software release</dt><dd>{run.software_release}</dd></div><div><dt>Asset SHA-256</dt><dd className="risk-hash">{run.asset_sha256 || "Not supplied"}</dd></div><div><dt>Calculated at</dt><dd>{run.created_at ? new Date(run.created_at).toLocaleString() : "Not calculated"}</dd></div><div><dt>Output precision</dt><dd>{typeof run.precision === "string" ? run.precision : `${precision} canonical decimal places`}</dd></div>{Object.entries(run.provenance || {}).filter(([key]) => ["producer", "model_version", "program", "rating_period", "normalization_basis", "calculated_at", "coverage_basis", "source_policy", "source_metadata_requirement", "source_url"].includes(key)).map(([key, value]) => <div key={key}><dt>{label(key)}</dt><dd>{typeof value === "string" && value.startsWith("https://") ? <a href={value} target="_blank" rel="noreferrer">Source reference<ArrowUpRight size={13} /></a> : String(value)}</dd></div>)}</dl>}
  </div>;
}

export function MemberRiskProfile({ memberId, user }: { memberId: string; user: User }) {
  const context = useRiskContext();
  const client = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [historyId, setHistoryId] = useState("");
  const profile = useQuery({ queryKey: ["risk", "member", user.id, memberId, context.configId, context.basis], queryFn: () => riskClient.member(memberId, context.configId, context.basis), enabled: !!context.configId });
  const calculate = async () => {
    setBusy(true);
    try { const run = await riskClient.calculate({ member_id: memberId, config_id: context.configId, basis: context.basis }, user.csrf_token); await client.invalidateQueries({ queryKey: ["risk"] }); if (run.status === "completed") toast.success("Member calculation complete"); else toast.error(run.errors?.[0] || "Calculation did not complete"); }
    catch (error) { toast.error((error as Error).message); } finally { setBusy(false); }
  };
  useEffect(() => setHistoryId(""), [memberId, context.configId, context.basis]);
  const data = profile.data;
  const run = historyId ? data?.history.find((item) => item.id === historyId) : data?.run;
  if (profile.isPending) return <LoadingRisk text="Opening the member risk profile…" />;
  if (profile.error) return <RiskError error={profile.error} retry={() => profile.refetch()} />;
  if (!data) return <Empty title="Risk profile unavailable" />;
  return <div className="risk-workspace">
    <div className="risk-profile-toolbar"><div><strong>{data.readiness.score_ready ? "Score-ready" : "Scoring inputs need attention"}</strong><span>{data.readiness.review_ready ? "Clinical review prepared" : "Clinical review is not prepared"}</span></div><div className="button-row">{user.screens.includes("scenarios") && <Button variant="outline" asChild><Link href={context.href(`/scenarios?member=${memberId}`)}><Calculator size={15} />Compare scenario</Link></Button>}<Button disabled={busy || !data.readiness.score_ready || context.basis !== "captured_baseline" || !canCalculateConfiguration(context.configuration) || !context.permissions.includes("risk_calculate")} onClick={calculate}><RefreshCw size={15} className={busy ? "animate-spin" : ""} />{busy ? "Calculating…" : "Recalculate"}</Button></div></div>
    {!!data.readiness.reasons.length && <details className="risk-disclosure" open={!data.readiness.score_ready}><summary>Input readiness</summary>{data.readiness.reasons.map((reason) => <p key={reason}>{reason}</p>)}</details>}
    {context.configuration?.program === "ACA" && <div className="risk-notice"><span>Separate synthetic scoring profile · ACA · Date of birth {String(data.input_snapshot.dob || "not supplied")} · {data.input_snapshot.sex === 1 ? "Male" : data.input_snapshot.sex === 2 ? "Female" : "Sex not supplied"} · Metal {String((data.input_snapshot.aca as Record<string, unknown> | undefined)?.metal || "not supplied")}. The clinical chart retains its original member context.</span></div>}
    <div className="risk-stage-strip" aria-label="Score stages">{data.stages.map((stage) => <button key={stage.basis} onClick={() => context.choose(context.configId, stage.basis)} aria-pressed={context.basis === stage.basis}><span>{scoreBasisLabels[stage.basis] || label(stage.basis)}</span><strong>{formatRiskScore(stage.run?.raw_score, stage.run?.precision)}</strong><small>{stage.run ? label(stage.run.origin) : "No result"}</small></button>)}</div>
    {!!data.history.length && <div className="risk-history-select"><label htmlFor="risk-history">Calculation snapshot</label><select id="risk-history" value={historyId} onChange={(e) => setHistoryId(e.target.value)}><option value="">Current {scoreBasisLabels[context.basis].toLowerCase()}</option>{data.history.filter((item) => item.id !== data.run?.id).map((item) => <option key={item.id} value={item.id}>{new Date(item.created_at).toLocaleString()} · {scoreBasisLabels[item.score_basis] || label(item.score_basis)} · {item.id}</option>)}</select></div>}
    {run ? <Panel><RiskRunLedger run={run} memberId={memberId} /></Panel> : <Panel><Empty title="No calculation for this score basis" description="A new calculation uses the selected configuration and its qualifying input set. Earlier score bases remain independent." /></Panel>}
    {!!data.recapture.length && <Panel title="Annual condition inventory"><div className="table-scroll"><table className="risk-table"><thead><tr><th>Condition / category</th><th>Recapture state</th><th>Basis</th></tr></thead><tbody>{data.recapture.map((item, index) => <tr key={item.id || index}><td>{item.condition || item.category}</td><td>{label(item.state || item.status || "unresolved")}</td><td>{item.exclusion_reason || item.source_basis || item.reason}</td></tr>)}</tbody></table></div></Panel>}
  </div>;
}

export function RiskModelLab({ user }: { user: User }) {
  const context = useRiskContext();
  const params = useSearchParams();
  const [memberId, setMemberId] = useState(params?.get("member") || "MB-000005");
  const [memberInput, setMemberInput] = useState(memberId);
  const [mode, setMode] = useState("coding");
  const [compareId, setCompareId] = useState("");
  const [addCodes, setAddCodes] = useState("");
  const [serviceDate, setServiceDate] = useState("");
  const [removed, setRemoved] = useState<string[]>([]);
  const [name, setName] = useState("Condition comparison");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<RiskScenarioResult | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const profile = useQuery({ queryKey: ["risk", "member", user.id, memberId, context.configId, "captured_baseline"], queryFn: () => riskClient.member(memberId, context.configId, "captured_baseline"), enabled: !!memberId && !!context.configId });
  useEffect(() => { setResult(null); setError(null); }, [memberId, context.configId, mode, compareId, addCodes, serviceDate, removed]);
  useEffect(() => { setRemoved([]); }, [memberId, context.configId]);
  const calculate = async (save: boolean) => {
    setBusy(true); setError(null);
    try {
      const output = await riskClient.scenario({ member_id: memberId, config_id: context.configId, baseline_run_id: profile.data?.run?.id, compare_config_id: mode === "model" ? compareId : undefined, add_codes: mode === "coding" ? addCodes.split(/[\s,;]+/).map((code) => code.trim().toUpperCase()).filter(Boolean).map((code) => ({ code, ...(serviceDate ? { service_date: serviceDate } : {}) })) : [], remove_diagnosis_ids: mode === "coding" ? removed : [], name, save }, user.csrf_token);
      setResult(output);
      if (save && output.saved) toast.success("Hypothetical scenario saved");
    } catch (error) { setError(error as Error); } finally { setBusy(false); }
  };
  const diagnoses = profile.data?.input_snapshot?.diagnoses || [];
  const canCalculate = context.permissions.includes("risk_scenario") && canCalculateConfiguration(context.configuration) && !!context.configId && !!memberId && (mode !== "model" || !!compareId) && !busy;
  return <div className="risk-workspace">
    <PageHeader title="RAF & model lab" description="Change the complete input set and inspect the model's result."><Button disabled={!canCalculate} onClick={() => calculate(false)}><Calculator size={15} />{busy ? "Calculating…" : "Calculate comparison"}</Button><Button variant="outline" asChild><Link href={context.href(`/members/${memberId}?tab=Risk+profile`)}>Member risk profile<ArrowUpRight size={15} /></Link></Button></PageHeader>
    <div className="risk-lab-layout">
      <Panel title="Comparison inputs" subtitle="Hypothetical changes leave clinical and submitted records intact." className="risk-lab-inputs">
        <div className="risk-form">
          <form onSubmit={(e) => { e.preventDefault(); setMemberId(memberInput.trim()); }}><label htmlFor="risk-member">Member ID</label><div className="risk-inline-input"><Input id="risk-member" value={memberInput} onChange={(e) => setMemberInput(e.target.value)} /><Button variant="outline" size="icon" type="submit" aria-label="Load member risk inputs"><Search size={15} /></Button></div></form>
          <label>Comparison mode<select aria-label="Comparison mode" value={mode} onChange={(e) => setMode(e.target.value)}><option value="coding">Change coding inputs</option><option value="model">Compare model versions</option></select></label>
          <label>Scenario name<Input value={name} onChange={(e) => setName(e.target.value)} /></label>
          {mode === "model" ? <><label>Comparison configuration<select aria-label="Comparison configuration" value={compareId} onChange={(e) => setCompareId(e.target.value)}><option value="">Choose a compatible configuration</option>{context.configurations.filter((config) => config.id !== context.configId && config.program === context.configuration?.program).map((config) => <option key={config.id} value={config.id}>{config.name || config.id}</option>)}</select></label><p className="risk-helper">Inputs stay fixed. Model releases may exclude different codes; inspect the retained exclusions and adjustment basis.</p></> : <>
            <label>Candidate ICD-10-CM codes<textarea rows={2} value={addCodes} onChange={(e) => setAddCodes(e.target.value)} placeholder="Enter codes, separated by commas" /></label>
            <label>Candidate service date<Input type="date" value={serviceDate} onChange={(e) => setServiceDate(e.target.value)} /></label>
            <div><span className="risk-field-label">Existing diagnosis inputs</span>{profile.isPending ? <LoadingRisk text="Reading inputs…" /> : profile.error ? <p className="risk-helper">{profile.error.message}</p> : diagnoses.length ? <div className="risk-diagnosis-inputs">{diagnoses.map((diagnosis) => <label key={diagnosis.id}><input type="checkbox" checked={removed.includes(diagnosis.id)} onChange={(e) => setRemoved((ids) => e.target.checked ? [...ids, diagnosis.id] : ids.filter((id) => id !== diagnosis.id))} /><span><strong>Remove {diagnosis.code}</strong><small>{diagnosis.service_date || "Date retained in snapshot"} · {diagnosis.id}</small></span></label>)}</div> : <p className="risk-helper">No diagnosis occurrences were supplied for this snapshot.</p>}</div>
          </>}
          {!profile.data?.readiness.score_ready && !!profile.data?.readiness.reasons.length && <div className="risk-notice">{profile.data.readiness.reasons.join(" ")}</div>}
          {result && <Button variant="outline" disabled={busy || result.saved} onClick={() => calculate(true)}>{result.saved ? "Scenario saved" : "Save hypothetical scenario"}</Button>}
          <Link className="risk-text-link" href={context.href("/analytics?view=Risk+%26+conditions")}>Inspect actual period movement<ArrowRight size={13} /></Link>
        </div>
      </Panel>
      <div>
        {error ? <RiskError error={error} /> : busy ? <LoadingRisk text="Running the full-member comparison…" /> : result ? <>
          <div className="risk-metrics three"><ScoreMetric title="Baseline" value={result.baseline.raw_score} precision={result.baseline.precision} note={result.baseline.model_version} /><ScoreMetric title="Scenario" value={result.scenario.raw_score} precision={result.scenario.precision} note={result.scenario.model_version} /><ScoreMetric title="Absolute score difference" value={result.delta} precision={result.scenario.precision} signed note="Complete-member recomputation" /></div>
          <div className="risk-notice"><Layers3 size={16} /><span>{result.saved ? "Saved hypothetical scenario" : "Unsaved hypothetical comparison"} · Combined changes are calculated together under the selected model.</span></div>
          {!!result.differences?.length && <Panel title="What changed"><div className="table-scroll"><table className="risk-table"><thead><tr><th>Component</th><th>Score difference</th><th>Basis</th></tr></thead><tbody>{result.differences.map((change, index) => <tr key={change.factor || index}><td>{change.description || change.label || change.factor}</td><td>{formatRiskScore(change.delta, result.scenario.precision, true)}</td><td>{change.explanation || "Complete-member component change"}</td></tr>)}</tbody></table></div></Panel>}
          <Panel><RiskRunLedger run={result.scenario} memberId={memberId} /></Panel>
        </> : profile.data?.run ? <Panel title="Current baseline" subtitle="Calculate a comparison to see the effect of the proposed inputs."><RiskRunLedger run={profile.data.run} memberId={memberId} /></Panel> : <Panel><Empty title="Ready to compare complete member inputs" description="Choose a member and an eligible configuration, then calculate a coding-input or fixed-input model comparison." /></Panel>}
      </div>
    </div>
  </div>;
}

type Mapping = { code: string; description?: string; category?: string; category_description?: string; coefficients?: Record<string, number>; suppresses?: string[]; edits?: Record<string, string>; hierarchy?: unknown };
export function RiskModelsData({ user, sources }: { user: User; sources: ReactNode }) {
  const context = useRiskContext();
  const params = useSearchParams();
  const [tab, setTab] = useState(params?.get("riskTab") || "models");
  const [selectedId, setSelectedId] = useState("");
  useEffect(() => { setTab(params?.get("riskTab") || "models"); }, [params]);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const batches = useQuery({ queryKey: ["risk", "batches", user.id], queryFn: riskClient.batches, enabled: tab === "runs", refetchInterval: (data) => data.state.data?.items.some((batch) => ["queued", "running"].includes(batch.status)) ? 2000 : false });
  const mappings = useQuery({ queryKey: ["risk", "mappings", context.configId, query], queryFn: () => api<{ items: Mapping[] }>(`/risk/mappings?${new URLSearchParams({ config_id: context.configId, q: query })}`), enabled: tab === "mappings" && !!context.configId && !!query });
  const config = context.configurations.find((item) => item.id === selectedId) || context.configuration;
  const [busy, setBusy] = useState(false);
  const queryClient = useQueryClient();
  const activate = async () => { if (!config) return; setBusy(true); try { await api(`/risk/configurations/${encodeURIComponent(config.id)}/activate`, { method: "POST", body: "{}" }, user.csrf_token); await queryClient.invalidateQueries({ queryKey: ["risk", "configurations"] }); toast.success("Validated configuration activated"); } catch (error) { toast.error((error as Error).message); } finally { setBusy(false); } };
  const retry = async (id: string) => { setBusy(true); try { await riskClient.retryBatch(id, user.csrf_token); await batches.refetch(); toast.success("Calculation resumed"); } catch (error) { toast.error((error as Error).message); } finally { setBusy(false); } };
  return <div className="risk-workspace">
    <PageHeader title="Models & data" description="Inspect model scope, calculation evidence and source readiness." />
    <div className="risk-tabs" role="tablist" aria-label="Models and data views">{[["models", "Model inventory"], ["mappings", "Code explorer"], ["coverage", "Scoring coverage"], ["runs", "Calculation runs"], ["external", "External scores"], ["sources", "Source operations"]].map(([id, name]) => <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)}>{name}</button>)}</div>
    {tab === "external" ? <ExternalScoreImport user={user} /> : tab === "sources" ? sources : tab === "coverage" ? <RiskOverview user={user} embedded /> : tab === "models" ? context.pending ? <LoadingRisk /> : context.error ? <RiskError error={context.error} /> : <div className="risk-model-grid">
      <Panel title="Configured model inventory" subtitle="Availability, execution and independent validation are separate states."><div className="risk-model-list">{context.configurations.map((item) => <button key={item.id} className={config?.id === item.id ? "selected" : ""} onClick={() => setSelectedId(item.id)}><span><strong>{item.name || item.id}</strong><small>{item.program} · {item.year} · {item.software_release}</small></span><Status value={item.status} /><ChevronRight size={14} /></button>)}</div></Panel>
      {config && <Panel title={config.name || config.id} subtitle={config.id}><dl className="risk-definition-list"><div><dt>Program / period</dt><dd>{config.program} · {config.year}</dd></div><div><dt>Model / software</dt><dd>{config.model_version}<small>{config.software_release}</small></dd></div><div><dt>Run</dt><dd>{label(config.run_type || "not_configured")}</dd></div><div><dt>Configured service window</dt><dd>{config.service_start || "Not supplied"} — {config.service_end || "Not supplied"}</dd></div><div><dt>Readiness</dt><dd>{label(config.status)}</dd></div><div><dt>Independent validation</dt><dd>{label(config.validation_status || "Not supplied")}</dd></div><div><dt>Supported segments</dt><dd>{config.supported_segments?.map(label).join(", ") || "Scope detail unavailable"}</dd></div><div><dt>Asset SHA-256</dt><dd className="risk-hash">{config.asset_sha256 || "Not supplied"}</dd></div></dl>{!!config.errors?.length && <div className="risk-error">{config.errors.map((error) => <p key={error}>{error}</p>)}</div>}{!!config.warnings?.length && <details className="risk-disclosure" open><summary>Configuration notes</summary>{config.warnings.map((warning) => <p key={warning}>{warning}</p>)}</details>}<div className="risk-panel-foot"><div className="button-row"><Button variant="outline" onClick={() => context.choose(config.id)}>Use this configuration<ArrowRight size={14} /></Button>{context.permissions.includes("model_manage") && <Button disabled={busy || !["validated", "validated for declared scope"].includes(config.status)} onClick={activate}>Activate</Button>}</div>{config.source_url && <a href={config.source_url} target="_blank" rel="noreferrer">Source reference<ArrowUpRight size={13} /></a>}</div></Panel>}
    </div> : tab === "mappings" ? <Panel title="ICD-10-CM category explorer" subtitle="Mapping is model-specific. A search result does not establish a clinical diagnosis."><form className="risk-search" onSubmit={(e) => { e.preventDefault(); setQuery(search.trim()); }}><Input aria-label="Search a code or description" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Code or clinical description" /><Button variant="outline" type="submit"><Search size={15} />Search mapping</Button></form>{mappings.isFetching ? <LoadingRisk text="Reading model mappings…" /> : mappings.error ? <RiskError error={mappings.error} /> : mappings.data?.items.length ? <div className="table-scroll"><table className="risk-table"><thead><tr><th>Code / description</th><th>Category</th><th>Segment coefficients</th><th>Hierarchy</th></tr></thead><tbody>{mappings.data.items.map((mapping, index) => <tr key={`${mapping.code}-${index}`}><td><strong>{mapping.code}</strong><small>{mapping.description}</small></td><td>{mapping.category || "No mapping"}<small>{mapping.category_description}</small></td><td>{mapping.coefficients ? <details><summary>Inspect coefficients</summary><dl>{Object.entries(mapping.coefficients).map(([key, value]) => <div key={key}><dt>{label(key)}</dt><dd>{formatRiskScore(value, context.configuration?.precision)}</dd></div>)}</dl></details> : "Not supplied"}</td><td>{mapping.suppresses?.length ? <span>Suppresses {mapping.suppresses.join(", ")}</span> : "No suppressions listed"}{!!mapping.edits && Object.entries(mapping.edits).map(([key, value]) => <small key={key}>{label(key)}: {value}</small>)}</td></tr>)}</tbody></table></div> : <Empty title={query ? "No mapping matches" : "Search the selected model"} description={query ? "Try another code or description, or inspect the configuration's supported release." : "Enter a diagnosis code or description to inspect its actual mapping and coefficients."} />}</Panel>
    : <Panel title="Population calculation runs" subtitle="Processing progress is separate from model validation and clinical review.">{batches.isPending ? <LoadingRisk /> : batches.error ? <RiskError error={batches.error} /> : batches.data?.items.length ? <div className="table-scroll"><table className="risk-table"><thead><tr><th>Run / started</th><th>State</th><th>Processed</th><th>Completed</th><th>Failed</th><th>Action</th></tr></thead><tbody>{batches.data.items.map((batch) => <tr key={batch.id}><td><strong>{batch.id}</strong><small>{new Date(batch.created_at).toLocaleString()}</small></td><td>{label(batch.status)}</td><td>{num(batch.processed)} / {num(batch.total)}</td><td>{num(batch.succeeded)}</td><td>{num(batch.failed)}</td><td>{!["completed", "running", "queued"].includes(batch.status) && <Button variant="outline" size="sm" disabled={busy || !context.permissions.includes("risk_calculate")} onClick={() => retry(batch.id)}>Resume run</Button>}</td></tr>)}</tbody></table></div> : <Empty title="No calculation runs yet" description="Start the eligible population from Risk overview." />}</Panel>}
  </div>;
}

function readScoreCsv(text: string) {
  const records: string[][] = [];
  let row: string[] = [], cell = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') { if (quoted && text[i + 1] === '"') { cell += '"'; i++; } else quoted = !quoted; }
    else if (ch === ',' && !quoted) { row.push(cell.trim()); cell = ""; }
    else if ((ch === '\n' || ch === '\r') && !quoted) { if (ch === '\r' && text[i + 1] === '\n') i++; row.push(cell.trim()); if (row.some(Boolean)) records.push(row); row = []; cell = ""; }
    else cell += ch;
  }
  if (quoted) throw new Error("The CSV contains an unclosed quoted field.");
  row.push(cell.trim()); if (row.some(Boolean)) records.push(row);
  const headers = records.shift()?.map((name) => name.replace(/^\uFEFF/, "")) || [];
  for (const key of ["member_id", "rating_period", "rate_cell", "coverage_months", "raw_score"]) if (!headers.includes(key)) throw new Error(`The score file requires a ${key} column.`);
  return records.map((record) => Object.fromEntries(headers.map((key, index) => [key, ["raw_score", "normalized_score", "state_factor", "coverage_months"].includes(key) ? record[index] ? Number(record[index]) : null : record[index] || ""])));
}

type ExternalReport = { id: string; received: number; imported: number; excluded: number; exceptions: { member_id: string; reasons: string[] }[]; member_ids: string[]; missing_member_ids: string[]; denominator_policy: string; basis: string };
export function ExternalScoreImport({ user }: { user: User }) {
  const context = useRiskContext();
  const client = useQueryClient();
  const [metadata, setMetadata] = useState({ producer: "", model_version: "", program: "MMA", rating_period: "2026", normalization_basis: "", calculated_at: "", coverage_basis: "", synthetic: true });
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState<Error | null>(null);
  const [report, setReport] = useState<ExternalReport | null>(null);
  useEffect(() => { if (report) window.scrollTo({ top: 0, behavior: "smooth" }); }, [report]);
  const [busy, setBusy] = useState(false);
  const set = (key: keyof typeof metadata, value: string) => { setMetadata((old) => ({ ...old, [key]: value })); setReport(null); };
  const loadExample = async () => { setBusy(true); setError(null); try { const example = await api<{ metadata: typeof metadata; rows: Record<string, unknown>[] }>("/risk/external-scores/example"); setMetadata(example.metadata); setRows(example.rows); setFileName("Authored Medicaid example"); setReport(null); } catch (error) { setError(error as Error); } finally { setBusy(false); } };
  const submit = async () => {
    setBusy(true); setError(null);
    try { const value = await api<ExternalReport>("/risk/external-scores", { method: "POST", body: JSON.stringify({ metadata, rows }) }, user.csrf_token); setReport(value); await client.invalidateQueries({ queryKey: ["risk"] }); toast.success(`${value.imported} external scores imported`); }
    catch (error) { setError(error as Error); } finally { setBusy(false); }
  };
  return <div className="risk-workspace">
    <div className="risk-notice"><FileText size={16} /><span>Florida Medicaid · externally supplied scores. Diagnosis changes require a refreshed score from the declared producer.</span></div>
      {report && <Panel title="Import reconciliation" subtitle={report.id}><div className="risk-metrics three"><ScoreMetric title="Received" value={report.received} precision={0} note="Rows in the submitted score set" /><ScoreMetric title="Imported" value={report.imported} precision={0} note="Valid matched score records" /><ScoreMetric title="Excluded" value={report.excluded} precision={0} note="Retained import exceptions" /></div><p className="risk-helper">{report.denominator_policy}</p>{report.exceptions.length > 0 && <div className="table-scroll"><table className="risk-table"><thead><tr><th>Member</th><th>Import exception</th></tr></thead><tbody>{report.exceptions.map((item, i) => <tr key={`${item.member_id}-${i}`}><td>{item.member_id}</td><td>{item.reasons.join(" ")}</td></tr>)}</tbody></table></div>}<div className="risk-panel-foot"><span>{report.missing_member_ids.length} declared cohort members absent from this file</span><Button variant="outline" asChild><Link href="/overview?config=medicaid_fl_external&basis=reported">Inspect reported score basis<ArrowRight size={14} /></Link></Button></div>{report.member_ids.map((id) => <Link className="risk-text-link" key={id} href={context.href(`/members/${id}?tab=Risk+profile&config=medicaid_fl_external&basis=reported`)}>{id} · Imported score profile<ArrowUpRight size={13} /></Link>)}</Panel>}
    <div className="risk-lab-layout">
      <Panel title="Score-set provenance" subtitle="These fields stay with every imported result."><div className="risk-form">
        <label>Producer<Input value={metadata.producer} onChange={(e) => set("producer", e.target.value)} placeholder="External scoring organization" /></label>
        <label>Model and version<Input value={metadata.model_version} onChange={(e) => set("model_version", e.target.value)} /></label>
        <label>Florida program<select value={metadata.program} onChange={(e) => set("program", e.target.value)}><option>MMA</option><option>LTC</option><option>dental</option></select></label>
        <label>Rating period<Input value={metadata.rating_period} onChange={(e) => set("rating_period", e.target.value)} /></label>
        <label>Normalization basis<Input value={metadata.normalization_basis} onChange={(e) => set("normalization_basis", e.target.value)} placeholder="As declared by the score producer" /></label>
        <label>Calculated at<Input type="text" value={metadata.calculated_at} onChange={(e) => set("calculated_at", e.target.value)} /></label>
        <label>Coverage basis<Input value={metadata.coverage_basis} onChange={(e) => set("coverage_basis", e.target.value)} placeholder="Eligible covered months" /></label>
        <label className="risk-check"><input type="checkbox" checked={metadata.synthetic} onChange={(e) => setMetadata((old) => ({ ...old, synthetic: e.target.checked }))} />Synthetic input data</label>
      </div></Panel>
      <div className="risk-workspace"><Panel title="Import score records" subtitle="Missing and invalid scores remain explicit exceptions."><div className="risk-form">
        <Button variant="outline" disabled={busy || !context.permissions.includes("risk_import")} onClick={loadExample}>Load authored score-set example</Button><label>CSV score file<Input type="file" accept=".csv,text/csv" onChange={async (event) => { const file = event.target.files?.[0]; if (!file) return; setError(null); setReport(null); try { const values = readScoreCsv(await file.text()); setRows(values); setFileName(file.name); } catch (error) { setRows([]); setError(error as Error); } }} /></label>
        <p className="risk-helper">Required columns: member_id, rating_period, rate_cell, coverage_months, raw_score. Optional: normalized_score, state_factor, unscored_reason.</p>
        {rows.length > 0 && <><span className="risk-field-label">{fileName} · {rows.length} records</span><div className="table-scroll"><table className="risk-table"><thead><tr><th>Member</th><th>Rate cell</th><th>Covered months</th><th>Raw score</th></tr></thead><tbody>{rows.slice(0,8).map((row, i) => <tr key={i}><td>{String(row.member_id || "Missing")}</td><td>{String(row.rate_cell || "Missing")}</td><td>{String(row.coverage_months ?? "Missing")}</td><td>{typeof row.raw_score === "number" ? formatRiskScore(row.raw_score) : "Missing"}</td></tr>)}</tbody></table></div></>}
        <Button disabled={busy || !rows.length || !context.permissions.includes("risk_import") || Object.entries(metadata).some(([key, value]) => key !== "synthetic" && !String(value).trim())} onClick={submit}>{busy ? "Validating import…" : "Validate and import scores"}</Button>
      </div></Panel>
      {error && <RiskError error={error} />}

      </div>
    </div>
  </div>;
}

type ReceiverEvidence = { id: string; kind: "eligibility" | "report"; name: string; config_id: string; service_year: number; payment_year: number; result?: string; reason?: string; basis: string; content_hash?: string };
type ReceiverResult = { id: string; submission_id: string; eligibility_status?: string; reason?: string; status?: string; explanation?: string; discrepancies?: { kind: string; reason: string }[]; next_action?: string; reported_score?: number | null; score_reason?: string; expected?: { code: string; record_presence: string }; reported?: { code: string; record_presence: string }; fixture?: ReceiverEvidence; created_at?: string; at?: string };
export function RiskReconciliation({ memberId, user, submissionId }: { memberId: string; user: User; submissionId?: string }) {
  const context = useRiskContext();
  const client = useQueryClient();
  const [recordId, setRecordId] = useState(submissionId || "");
  const [fixtureId, setFixtureId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const result = useQuery({ queryKey: ["risk", "reconciliation", memberId, context.configId, user.id], queryFn: () => api<{ submissions: { id: string; status: string; decision_id?: string; operation?: string; code?: string }[]; stages: { basis: ScoreBasis; run: RiskRun | null }[]; fixtures: ReceiverEvidence[]; eligibility_results: ReceiverResult[]; report_results: ReceiverResult[]; payment_reconciliation: string }>(`/risk/members/${encodeURIComponent(memberId)}/reconciliation?config_id=${encodeURIComponent(context.configId)}`), enabled: !!context.configId });
  useEffect(() => { setRecordId(submissionId || ""); setFixtureId(""); setError(null); }, [memberId, submissionId, context.configId]);
  const data = result.data;
  const selected = data?.submissions.find((record) => record.id === recordId);
  const fixture = data?.fixtures.find((item) => item.id === fixtureId);
  const apply = async () => {
    if (!selected || !fixture) return;
    setBusy(true); setError(null);
    try { await api(`/risk/submissions/${encodeURIComponent(selected.id)}/${fixture.kind}`, { method: "POST", body: JSON.stringify({ fixture_id: fixture.id }) }, user.csrf_token); await Promise.all([client.invalidateQueries({ queryKey: ["risk"] }), client.invalidateQueries({ queryKey: ["snapshot"] }), client.invalidateQueries({ queryKey: ["member"] })]); toast.success(fixture.kind === "report" ? "Independent report comparison retained" : "Receiver eligibility result retained"); }
    catch (error) { setError(error as Error); } finally { setBusy(false); }
  };
  if (result.isPending) return <LoadingRisk text="Reading linked score stages…" />;
  if (result.error) return <RiskError error={result.error} retry={() => result.refetch()} />;
  if (!data) return null;
  const observations = [...data.eligibility_results, ...data.report_results].filter((item) => !recordId || item.submission_id === recordId);
  return <Panel title="Score-stage reconciliation" subtitle="Accepted records, diagnosis eligibility and reported evidence retain distinct outcomes.">
    <div className="risk-form">
      <div className="risk-stage-strip">{data.stages.map((stage) => <Link key={stage.basis} href={context.href(`/members/${memberId}?tab=Risk+profile&basis=${stage.basis}`)}><span>{scoreBasisLabels[stage.basis]}</span><strong>{formatRiskScore(stage.run?.raw_score, stage.run?.precision)}</strong><small>{stage.run ? label(stage.run.status) : "No score result"}</small></Link>)}</div>
      <label>Linked submission<select aria-label="Linked submission" value={recordId} onChange={(event) => setRecordId(event.target.value)}><option value="">Select an approved submission attempt</option>{data.submissions.map((record) => <option key={record.id} value={record.id}>{record.id} · {record.operation || "Record"} {record.code} · {label(record.status)}</option>)}</select></label>
      <label>Independent receiver / report evidence<select aria-label="Independent receiver or report evidence" value={fixtureId} onChange={(event) => setFixtureId(event.target.value)}><option value="">Choose an authored observation</option>{data.fixtures.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      {fixture && <div className="risk-notice"><FileText size={15} /><span><strong>{fixture.name}</strong><br />Service {fixture.service_year} · Payment {fixture.payment_year} · {fixture.config_id}<br />{fixture.reason || fixture.basis}</span></div>}
      <div className="risk-profile-toolbar"><p className="risk-helper">{selected?.status !== "accepted" || !selected?.decision_id ? "Select an accepted attempt linked to its independent QA-approved decision." : "Apply this exact observation to the selected approved record."}</p><Button disabled={busy || !fixture || !selected?.decision_id || selected.status !== "accepted" || !context.permissions.includes("receiver")} onClick={apply}>{busy ? "Recording…" : fixture?.kind === "report" ? "Compare reported record" : "Record eligibility result"}</Button></div>
      {error && <RiskError error={error} />}
      {observations.length ? <div className="risk-observations">{observations.map((item) => <article key={item.id}><div><strong>{item.fixture?.name || item.id}</strong><Status value={item.eligibility_status || item.status || "recorded"} /></div><p>{item.reason || item.explanation}</p>{item.expected && item.reported && <dl className="risk-definition-list"><div><dt>Expected {item.expected.code}</dt><dd>{label(item.expected.record_presence)}</dd></div><div><dt>Reported occurrence</dt><dd>{label(item.reported.record_presence)}</dd></div></dl>}{item.discrepancies?.map((issue) => <p key={issue.kind}><strong>{label(issue.kind)}</strong> · {issue.reason}</p>)}{item.score_reason && <p className="risk-helper">{item.score_reason}</p>}<small>{item.submission_id} · {item.next_action}</small></article>)}</div> : <Empty title="No receiver eligibility or report observation retained" description="Select the exact attempt and independently authored evidence to record the next outcome." />}
      <p className="risk-helper">Payment reconciliation: {label(data.payment_reconciliation).toLowerCase()}.</p>
    </div>
  </Panel>;
}

function inputValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "Not supplied";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return value.map(inputValue).join(", ");
  if (typeof value === "object") return Object.entries(value as Record<string, unknown>).map(([key, item]) => `${label(key)}: ${inputValue(item)}`).join(" · ");
  return String(value);
}
export function RiskInputSnapshot({ memberId, user }: { memberId: string; user: User }) {
  const context = useRiskContext();
  const params = useSearchParams();
  const runId = params?.get("run") || "";
  const sourceId = params?.get("source") || "";
  const profile = useQuery({ queryKey: ["risk", "member", user.id, memberId, context.configId, context.basis], queryFn: () => riskClient.member(memberId, context.configId, context.basis), enabled: !!context.configId && !runId });
  const retained = useQuery({ queryKey: ["risk", "input", user.id, runId], queryFn: () => api<RiskMemberProfile["input_snapshot"]>(`/risk/runs/${encodeURIComponent(runId)}/input`), enabled: !!runId });
  const snapshot = runId ? retained.data : profile.data?.input_snapshot;
  const pending = runId ? retained.isPending : profile.isPending;
  const error = runId ? retained.error : profile.error;
  if (pending) return <LoadingRisk text="Reading retained scoring inputs…" />;
  if (error) return <RiskError error={error} />;
  if (!snapshot) return <Empty title="Scoring snapshot unavailable" />;
  const months = Array.isArray(snapshot.enrollment) ? snapshot.enrollment as Record<string, unknown>[] : [];
  const diagnoses = snapshot.diagnoses || [];
  return <div className="risk-workspace"><Panel title="Retained scoring inputs" subtitle={runId ? `Immutable inputs for ${runId}` : "Inputs for the selected member, configuration and score basis."}>
    <dl className="risk-definition-list">{["id", "member_id", "dob", "sex", "orec", "source_coverage", "fixture_version"].filter((key) => snapshot[key] !== undefined).map((key) => <div key={key}><dt>{({ id: "Input snapshot", member_id: "Member", dob: "Date of birth", sex: "Model sex input", orec: "Original reason for entitlement" } as Record<string, string>)[key] || label(key)}</dt><dd>{inputValue(snapshot[key])}</dd></div>)}</dl>
  </Panel><Panel title="Diagnosis occurrence inventory" subtitle="Occurrences retain their source, encounter, service date and eligibility classification."><div className="table-scroll"><table className="risk-table"><thead><tr><th>Diagnosis occurrence</th><th>Source / encounter</th><th>Service / source type</th><th>Eligibility inputs</th></tr></thead><tbody>{diagnoses.map((value) => { const diagnosis = value as typeof value & Record<string, unknown>; return <tr key={diagnosis.id} className={diagnosis.source_id === sourceId ? "risk-input-selected" : ""}><td><strong>{diagnosis.code}</strong><small>{diagnosis.id}</small></td><td>{diagnosis.source_id?.startsWith("DOC-") ? <Link href={context.href(`/members/${memberId}?tab=Evidence+%26+documents&document=${diagnosis.source_id}`)}>{diagnosis.source_id}<ArrowUpRight size={12} /></Link> : diagnosis.source_id || "Not supplied"}<small>{inputValue(diagnosis.encounter_id)}</small></td><td>{diagnosis.service_date || "Not supplied"}<small>{label(String(diagnosis.source_type || "not_supplied"))}</small></td><td>{["eligible_service", "audio_only", "linked_encounter", "signature_status"].filter((key) => diagnosis[key] !== undefined).map((key) => <small key={key}>{label(key)}: {inputValue(diagnosis[key])}</small>)}</td></tr>; })}</tbody></table>{!diagnoses.length && <Empty title="No local diagnosis occurrences supplied" description={snapshot.external_input ? "This imported score retains the external producer's input record below." : "This snapshot may support a demographic-only calculation."} />}</div></Panel>
  {!!months.length && <Panel title="Monthly enrollment inputs"><div className="table-scroll"><table className="risk-table"><thead><tr><th>Month</th><th>Dual / Medicaid</th><th>Enrollment profile</th><th>Other routing</th></tr></thead><tbody>{months.map((month, index) => <tr key={index}><td>{inputValue(month.month)}</td><td>{inputValue(month.dual_status)}<small>Medicaid: {inputValue(month.medicaid)}</small></td><td>Institutional: {inputValue(month.institutional)}<small>New enrollee: {inputValue(month.new_enrollee)}</small><small>C-SNP: {inputValue(month.c_snp)}</small></td><td>ESRD: {inputValue(month.esrd)}<small>PACE: {inputValue(month.pace)}</small><small>LIS: {inputValue(month.lis)}</small></td></tr>)}</tbody></table></div></Panel>}
  {["aca", "ndc", "hcpcs", "external_input", "metadata"].filter((key) => snapshot[key] !== undefined && inputValue(snapshot[key])).map((key) => <Panel key={key} title={({ aca: "ACA eligibility and benefit inputs", ndc: "NDC input signals", hcpcs: "HCPCS input signals", external_input: "Supplied external score record", metadata: "External score provenance" } as Record<string,string>)[key]}><div className="risk-form"><p className="risk-helper">{inputValue(snapshot[key])}</p></div></Panel>)}
  </div>;
}

export function RiskMemberDirectory({ user, providers }: { user: User; providers: { id: string; name: string }[] }) {
  const context = useRiskContext();
  const [q, setQ] = useUrlState("q", "");
  const [provider, setProvider] = useUrlState("provider", "");
  const [status, setStatus] = useUrlState("riskStatus", "");
  const [page, setPage] = useUrlState("page", 1);
  type Row = { member_id: string; name: string; provider: string; raw_score: number | null; adjusted_score: number | null; selected_segment?: string; status: string; score_ready: boolean; review_ready: boolean; stale: boolean; run_id?: string };
  const result = useQuery({ queryKey: ["risk", "directory", user.id, context.configId, context.basis, q, provider, status, page], queryFn: () => api<{ items: Row[]; total: number; page: number; page_size: number }>(`/risk/members?${new URLSearchParams({ config_id: context.configId, basis: context.basis, q, provider, page: String(page), page_size: "25", status })}`), enabled: !!context.configId });
  return <div className="risk-workspace"><PageHeader title="Member risk profiles" description="Calculated scores, input readiness and clinical evidence in one member record." />
    <Panel><div className="risk-directory-controls"><Input aria-label="Search member risk profiles" placeholder="Search name or member ID…" value={q} onChange={(event) => { setQ(event.target.value); setPage(1); }} /><select aria-label="Risk profile provider" value={provider} onChange={(event) => { setProvider(event.target.value); setPage(1); }}><option value="">All providers</option>{providers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><select aria-label="Risk calculation status" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}><option value="">All calculation states</option>{["completed", "failed", "unavailable", "not_calculated", "unscored", "stale"].map((value) => <option key={value} value={value}>{label(value)}</option>)}</select></div>
      {result.isPending ? <LoadingRisk text="Loading member risk profiles…" /> : result.error ? <RiskError error={result.error} retry={() => result.refetch()} /> : result.data?.items.length ? <div className="table-scroll"><table className="risk-table"><thead><tr><th>Member / practice</th><th>{riskScoreName(context.configuration?.program)}</th><th>Adjusted score</th><th>Model segment</th><th>Readiness</th><th>Calculation state</th></tr></thead><tbody>{result.data.items.map((member) => <tr key={member.member_id}><td><Link href={context.href(`/members/${member.member_id}?tab=Risk+profile`)}><strong>{member.name}</strong><ArrowUpRight size={13} /></Link><small>{member.member_id} · {member.provider}</small></td><td className="risk-number">{formatRiskScore(member.raw_score, context.configuration?.precision)}</td><td className="risk-number">{formatRiskScore(member.adjusted_score, context.configuration?.precision)}</td><td>{member.selected_segment ? label(member.selected_segment) : "Not selected"}</td><td>{member.score_ready ? "Scoring inputs prepared" : "Scoring inputs need attention"}<small>{member.review_ready ? "Clinical review prepared" : "No interactive review story"}</small></td><td><Status value={member.stale ? "stale" : member.status} /></td></tr>)}</tbody></table></div> : <Empty title="No matching members" description="Adjust the search or calculation filters." />}
      <div className="risk-panel-foot"><span>{num(result.data?.total || 0)} matching members · Page {page}</span><div className="button-row"><Button variant="outline" size="sm" disabled={page <= 1 || result.isFetching} onClick={() => setPage(page - 1)}>Previous</Button><Button variant="outline" size="sm" disabled={page * 25 >= (result.data?.total || 0) || result.isFetching} onClick={() => setPage(page + 1)}>Next</Button></div></div>
    </Panel>
  </div>;
}

export type RiskImpactResult = { items: { member_id: string; finding_ids: string[]; baseline_run_id: string; scenario_run_id?: string; delta: number | null; baseline_score: number | null; scenario_score: number | null; member_months: number; label: string; status: string }[]; combined_member_score_point_change: number | null; selected_cohort_weighted_delta: number | null; denominator_member_months: number; basis: string };
export function RiskImpactSummary({ result }: { result: RiskImpactResult }) {
  return <Panel title="Combined selected-condition effect" subtitle="Each member is recalculated once with the union of selected changes."><div className="risk-metrics two"><ScoreMetric title="Combined member score-point change" value={result.combined_member_score_point_change} signed note="Sum of separately recomputed member changes" /><ScoreMetric title="Selected-cohort weighted change" value={result.selected_cohort_weighted_delta} signed note={`${num(result.denominator_member_months)} eligible member-months`} /></div><div className="table-scroll"><table className="risk-table"><thead><tr><th>Member</th><th>Selected findings</th><th>Baseline</th><th>Scenario</th><th>Difference</th></tr></thead><tbody>{result.items.map((item) => <tr key={item.member_id}><td>{item.member_id}</td><td>{item.finding_ids.join(", ")}</td><td>{formatRiskScore(item.baseline_score)}</td><td>{formatRiskScore(item.scenario_score)}</td><td>{formatRiskScore(item.delta, 3, true)}<small>{item.label || label(item.status)}</small></td></tr>)}</tbody></table></div><p className="risk-helper padded">{result.basis}</p></Panel>;
}

export function RiskRecapture({ user }: { user: User }) {
  const context = useRiskContext();
  type Pair = { id?: string; member_id?: string; member_name?: string; category?: string; condition?: string; code?: string; state?: string; prior_run_id?: string; current_run_id?: string; prior_period?: string; current_period?: string; clinical_recaptured?: boolean; receiver_eligible_recaptured?: boolean; exclusion_reason?: string; reason?: string };
  const data = useQuery({ queryKey: ["risk", "recapture", user.id, context.configId], queryFn: () => api<{ status: string; definition?: string; items: Pair[]; exclusions: Pair[]; clinical: { numerator: number; denominator: number }; receiver_eligible: { numerator: number; denominator: number }; prior_scored_members?: number; current_scored_members?: number }>(`/risk/recapture?config_id=${encodeURIComponent(context.configId)}`), enabled: !!context.configId });
  const [tab, setTab] = useState("eligible");
  if (data.isPending) return <LoadingRisk text="Reading prior and current condition inventory…" />;
  if (data.error) return <RiskError error={data.error} retry={() => data.refetch()} />;
  if (!data.data) return null;
  const inventory = data.data;
  const rows = tab === "eligible" ? inventory.items : inventory.exclusions;
  return <div className="risk-workspace"><div className="risk-metrics three"><ScoreMetric title="Comparable condition pairs" value={inventory.clinical.denominator} precision={0} note="Distinct eligible member-category pairs" /><ScoreMetric title="Clinically recaptured" value={inventory.clinical.numerator} precision={0} note={`${num(inventory.clinical.denominator)} eligible pairs · independently QA-supported`} /><ScoreMetric title="Receiver-eligible recapture" value={inventory.receiver_eligible.numerator} precision={0} note={`${num(inventory.receiver_eligible.denominator)} eligible pairs · separate downstream milestone`} /></div>
    <div className="report-chart-grid"><Panel title="Clinical recapture" subtitle="Independent QA-supported condition pairs"><CoverageGauge value={inventory.clinical.numerator} total={inventory.clinical.denominator} label="Clinically recaptured" /></Panel><Panel title="Receiver-eligible recapture" subtitle="A separate downstream milestone"><CoverageGauge value={inventory.receiver_eligible.numerator} total={inventory.receiver_eligible.denominator} label="Receiver-eligible pairs" /></Panel></div>
    <Panel title="Annual condition inventory" subtitle={inventory.definition || label(inventory.status)} action={context.permissions.includes("export") && <Button variant="outline" size="sm" onClick={() => downloadRiskJson({ configuration: context.configuration, inventory }, `risk-recapture-${context.configId}.json`)}>Export condition inventory</Button>}><div className="risk-tabs padded" role="tablist" aria-label="Recapture inventory"><button role="tab" aria-selected={tab === "eligible"} onClick={() => setTab("eligible")}>Comparable pairs · {inventory.items.length}</button><button role="tab" aria-selected={tab === "excluded"} onClick={() => setTab("excluded")}>Excluded / unresolved · {inventory.exclusions.length}</button></div>{rows.length ? <PaginatedTable rows={rows} label="Annual condition inventory" scope={`${user.id}:${context.configId}:${tab}`} headers={<><th>Member / condition</th><th>Prior period</th><th>Current period</th><th>Review milestone</th><th>Receiver milestone</th></>}>{(item, index) => <tr key={item.id || index}><td>{item.member_id ? <Link href={context.href(`/members/${item.member_id}?tab=Risk+profile`)}><strong>{item.member_name || item.member_id}</strong><ArrowUpRight size={13} /></Link> : "Population comparability"}<small>{item.category} · {item.condition || item.code}</small></td><td>{item.prior_period || "Not comparable"}</td><td>{item.current_period || "Not comparable"}</td><td>{item.state ? label(item.state) : "Excluded"}<small>{item.exclusion_reason || item.reason}</small></td><td>{item.receiver_eligible_recaptured ? "Eligible recapture" : "No eligible recapture"}</td></tr>}</PaginatedTable> : <Empty title={inventory.status === "available" ? "No condition pairs in this view" : label(inventory.status)} description="The inventory requires actual prior and current calculations under comparable category definitions." />}<div className="risk-panel-foot"><span>{num(inventory.prior_scored_members || 0)} prior scored members · {num(inventory.current_scored_members || 0)} current scored members</span></div></Panel>
  </div>;
}
