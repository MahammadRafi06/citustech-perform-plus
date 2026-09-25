"use client";

import { SortableTable } from './sortable-table';
import { useEffect, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowUpRight, Calculator, LoaderCircle, Plus, Search, X } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { ComparisonPlot } from "./report-visuals";
import { Empty, Panel, Status } from "./shared";
import { PaginatedTable } from "./table-pagination";
import { useRiskContext } from "./risk-ui";
import { api, label } from "@/lib/api";
import { riskClient, formatRiskScore, scoreBasisLabels, downloadRiskJson } from "@/lib/risk-client";
import type { User } from "@/lib/types";
import { toast } from "sonner";

type Field = { key: string; label: string; type: "text" | "number" | "select" | "json"; required: boolean; options?: string[]; min?: number; max?: number; help?: string };
type Reference = { title: string; url: string; pages?: string };
type FinancialResult = { id: string; name?: string; status: string; missing: string[]; errors: string[]; program: string; assumptions: Record<string, unknown>; estimate: { baseline: number; scenario: number; difference: number; currency: string; label: string } | null; components: { key: string; label: string; baseline: number; scenario: number; difference: number; unit: string }[]; sensitivities: { label: string; baseline: number; scenario: number; difference: number }[]; method: string; references: Reference[]; actual_payment_status: string; baseline_run_ids: string[]; scenario_run_ids: string[]; member_ids: string[]; created_at: string; score_comparison?: { baseline: number; scenario: number; difference: number; score_basis: string; eligible_member_months: number; weighting?: string } };
const money = (value: number | null | undefined) => value == null || !Number.isFinite(value) ? "—" : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(value);
export function RiskFinancial({ user }: { user: User }) {
  const context = useRiskContext();
  const client = useQueryClient();
  const [memberId, setMemberId] = useState("MB-000005");
  const [memberInput, setMemberInput] = useState(memberId);
  const [baselineId, setBaselineId] = useState("");
  const [scenarioId, setScenarioId] = useState("");
  const [name, setName] = useState("Financial sensitivity");
  const [assumptions, setAssumptions] = useState<Record<string, unknown>>({});
  const [result, setResult] = useState<FinancialResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("calculate");
  const schema = useQuery({ queryKey: ["risk", "financial", "schema", user.id], queryFn: () => api<{ programs: { id: string; name: string; method: string; fields: Field[]; example_assumptions: Record<string, unknown>; references: Reference[] }[]; actual_payment_status: string }>("/risk/financial/schema") });
  const program = schema.data?.programs.find((item) => item.id === context.configuration?.program);
  const profile = useQuery({ queryKey: ["risk", "member", user.id, memberId, context.configId, context.basis], queryFn: () => riskClient.member(memberId, context.configId, context.basis), enabled: !!context.configId });
  const saved = useQuery({ queryKey: ["risk", "financial", "history", user.id], queryFn: () => api<{ items: FinancialResult[] }>("/risk/financial"), enabled: tab === "saved" });
  const runs = profile.data?.history.filter((run) => run.status === "completed") || [];
  const baseline = runs.find((run) => run.id === baselineId);
  useEffect(() => { setBaselineId(""); setScenarioId(""); setResult(null); setError(""); setAssumptions({}); }, [memberId, context.configId]);
  useEffect(() => { if (!baselineId && profile.data?.run?.status === "completed") setBaselineId(profile.data.run.id); }, [profile.data, baselineId]);
  const change = (key: string, value: unknown) => { setAssumptions((current) => ({ ...current, [key]: value })); setResult(null); };
  const example = () => {
    const next = { ...program?.example_assumptions };
    const months = baseline?.monthly_scores.map((month) => month.month).sort() || [];
    if (months.length) { next.period_start = String(months[0]); next.period_end = String(months.at(-1)); if (program?.id === "ACA") next.target_plan_member_months = months.length; }
    if (program?.id === "Medicaid" && baseline) { next.rating_period = baseline.provenance.rating_period; next.rate_cell = baseline.selected_segment; }
    setAssumptions(next); setResult(null);
  };
  const calculate = async () => {
    if (!program) return;
    setBusy(true); setError("");
    try { const value = await api<FinancialResult>("/risk/financial", { method: "POST", body: JSON.stringify({ program: program.id, name, baseline_run_id: baselineId || undefined, scenario_run_id: scenarioId || undefined, assumptions }) }, user.csrf_token); setResult(value); setTab("result"); window.scrollTo({ top: 0, behavior: "smooth" }); await client.invalidateQueries({ queryKey: ["risk", "financial", "history"] }); if (value.status === "complete") toast.success("Financial sensitivity saved"); }
    catch (error) { setError((error as Error).message); } finally { setBusy(false); }
  };
  if (schema.isPending) return <div className="risk-loading"><LoaderCircle className="animate-spin" size={18} />Loading financial methods…</div>;
  if (schema.error) return <Empty title="Financial methods unavailable" description={schema.error.message} />;
  return <div className="risk-workspace"><div className="risk-tabs"><button aria-selected={tab === "calculate"} onClick={() => setTab("calculate")}>Calculate sensitivity</button><button aria-selected={tab === "saved"} onClick={() => setTab("saved")}>Retained sensitivities</button></div>
    {tab === "saved" ? <Panel title="Retained financial assumptions and outputs">{saved.isPending ? <div className="risk-loading">Loading retained sensitivities…</div> : saved.error ? <Empty title="History unavailable" description={saved.error.message} /> : saved.data?.items.length ? <PaginatedTable rows={saved.data.items} label="Retained financial sensitivities" scope={user.id} headers={<><th>Saved sensitivity</th><th>Program</th><th>State</th><th>Estimated difference</th><th>Inspect</th></>}>{(item) => <tr key={item.id}><td><strong>{item.name || item.id}</strong><small>{new Date(item.created_at).toLocaleString()}</small></td><td>{item.program}</td><td>{label(item.status)}</td><td>{money(item.estimate?.difference)}</td><td><Button variant="ghost" size="sm" onClick={() => { setResult(item); setTab("result"); }}>Open retained result</Button></td></tr>}</PaginatedTable> : <Empty title="No saved financial sensitivities" />}</Panel> : tab !== "result" ? !program ? <Empty title="No financial method for this program" description="Select a configured MA, ACA or external Medicaid context. Part D scores retain their own program basis." /> : <>
      <div className="risk-profile-toolbar"><p className="risk-helper">{program.method}</p><Button disabled={busy || !context.permissions.includes("risk_scenario")} onClick={calculate}><Calculator size={15} />{busy ? "Calculating…" : "Calculate and save"}</Button></div>
      <div className="risk-financial-layout"><Panel title="Retained score comparison" subtitle="Select the complete saved result for each side."><div className="risk-form">
        <form onSubmit={(event) => { event.preventDefault(); setMemberId(memberInput.trim()); }}><label>Member ID</label><div className="risk-inline-input"><Input aria-label="Financial member ID" value={memberInput} onChange={(event) => setMemberInput(event.target.value)} /><Button variant="outline" size="icon" type="submit" aria-label="Load financial member"><Search size={15} /></Button></div></form>
        <label>Name<Input value={name} onChange={(event) => setName(event.target.value)} /></label>
        <label>Baseline run<select aria-label="Baseline run" value={baselineId} onChange={(event) => { setBaselineId(event.target.value); setResult(null); }}><option value="">Select a completed run</option>{runs.map((run) => <option key={run.id} value={run.id}>{scoreBasisLabels[run.score_basis]} · {formatRiskScore(run.raw_score, run.precision)} · {run.id.slice(-8)}</option>)}</select></label>
        <label>Scenario run<select aria-label="Scenario run" value={scenarioId} onChange={(event) => { setScenarioId(event.target.value); setResult(null); }}><option value="">Select a retained comparison</option>{runs.map((run) => <option key={run.id} value={run.id}>{scoreBasisLabels[run.score_basis]} · {formatRiskScore(run.raw_score, run.precision)} · {run.id.slice(-8)}</option>)}</select></label>
        {profile.error && <p className="risk-helper">{profile.error.message}</p>}
        <Link className="risk-text-link" href={context.href(`/scenarios?member=${memberId}`)}>Create a score comparison<ArrowUpRight size={13} /></Link>
        <p className="risk-helper">Actual payment remains {label(schema.data?.actual_payment_status || "unreconciled").toLowerCase()}.</p>
      </div></Panel><Panel title="Explicit financial assumptions" subtitle="Missing assumptions leave the estimate incomplete." action={<Button variant="outline" size="sm" onClick={example}>Load reference assumptions</Button>}><div className="risk-form risk-assumption-form">
        {program.fields.map((field) => field.type === "json" && field.key === "market_plans" ? <div className="risk-market-plans" key={field.key}><span className="risk-field-label">{field.label}</span><p className="risk-helper">The target plan’s PLRS comes from the selected saved scores. Peer assumptions remain explicit.</p><div className="table-scroll"><SortableTable className="risk-table"><thead><tr>{["Plan", "Share", "PLRS", "IDF", "AV", "ARF", "GCF", ""].map((name, index) => <th key={index}>{name}</th>)}</tr></thead><tbody>{(Array.isArray(assumptions.market_plans) ? assumptions.market_plans as Record<string, unknown>[] : []).map((plan, index, plans) => <tr key={index}>{["plan_id", "enrollment_share", "plrs", "idf", "av", "arf", "gcf"].map((key) => <td key={key}><Input aria-label={`Plan ${index + 1} ${key}`} value={String(plan[key] ?? "")} disabled={key === "plrs" && plan.plan_id === assumptions.target_plan_id} placeholder={key === "plrs" && plan.plan_id === assumptions.target_plan_id ? "From run" : ""} type={key === "plan_id" ? "text" : "number"} step="any" onChange={(event) => change("market_plans", plans.map((item, i) => i === index ? { ...item, [key]: key === "plan_id" ? event.target.value : event.target.value === "" ? null : Number(event.target.value) } : item))} /></td>)}<td><Button variant="ghost" size="icon-sm" aria-label={`Remove plan ${index + 1}`} onClick={() => change("market_plans", plans.filter((_, i) => i !== index))}><X size={12} /></Button></td></tr>)}</tbody></SortableTable></div><Button variant="outline" size="sm" onClick={() => change("market_plans", [...(Array.isArray(assumptions.market_plans) ? assumptions.market_plans : []), { plan_id: "" }])}><Plus size={14} />Add plan assumption</Button></div> : <label key={field.key} className={field.type === "text" && field.key.includes("basis") ? "risk-wide-field" : ""}>{field.label}{field.type === "select" ? <select value={String(assumptions[field.key] ?? "")} onChange={(event) => change(field.key, event.target.value)}><option value="">Select</option>{field.options?.map((value) => <option key={value} value={value}>{label(value)}</option>)}</select> : field.type === "text" && field.key.includes("basis") ? <textarea rows={2} value={String(assumptions[field.key] ?? "")} onChange={(event) => change(field.key, event.target.value)} /> : <Input type={field.type === "number" ? "number" : "text"} step="any" min={field.min} max={field.max} value={String(assumptions[field.key] ?? "")} onChange={(event) => change(field.key, field.type === "number" ? event.target.value === "" ? null : Number(event.target.value) : event.target.value)} />}{field.help && <small className="risk-helper">{field.help}</small>}</label>)}
      </div></Panel></div>
    </> : null}
    {error && <div className="risk-error" role="alert">{error}</div>}
    {result && tab !== "saved" && <Panel title={result.estimate?.label || "Retained financial sensitivity"} subtitle={`${result.id} · ${result.program}`} action={context.permissions.includes("export") && <Button variant="outline" size="sm" onClick={() => downloadRiskJson(result, `${result.id}.json`)}>Export retained result</Button>}>
      {result.status !== "complete" ? <div className="risk-error"><strong>Estimate incomplete</strong>{!!result.missing.length && <p>Required: {result.missing.map((key) => program?.fields.find((field) => field.key === key)?.label || label(key)).join(", ")}.</p>}{result.errors.map((error) => <p key={error}>{error}</p>)}</div> : <div className="risk-metrics three">{[["Baseline estimate", result.estimate?.baseline], ["Scenario estimate", result.estimate?.scenario], ["Estimated difference", result.estimate?.difference]].map(([title, value]) => <div className="risk-metric" key={String(title)}><span>{title}</span><strong>{money(value as number)}</strong><small>Assumption-driven sensitivity</small></div>)}</div>}
      {result.status === "complete" && result.estimate && <ComparisonPlot rows={[{ name: "Selected assumptions", before: result.estimate.baseline, after: result.estimate.scenario }, ...result.sensitivities.map(item => ({ name: label(item.label), before: item.baseline, after: item.scenario }))]} leftLabel="Baseline estimate" rightLabel="Scenario estimate" format={money} />}
      {!!result.components.length && <PaginatedTable rows={result.components} label="Financial components" scope={result.id} headers={<><th>Component</th><th>Baseline</th><th>Scenario</th><th>Difference</th></>}>{(item) => <tr key={item.key}><td>{item.label}</td><td>{money(item.baseline)}</td><td>{money(item.scenario)}</td><td>{money(item.difference)}</td></tr>}</PaginatedTable>}
      {!!result.sensitivities.length && <PaginatedTable rows={result.sensitivities} label="Assumption sensitivities" scope={result.id} headers={<><th>Assumption sensitivity</th><th>Baseline estimate</th><th>Scenario estimate</th><th>Difference</th></>}>{(item, index) => <tr key={`${item.label}-${index}`}><td>{label(item.label)}</td><td>{money(item.baseline)}</td><td>{money(item.scenario)}</td><td>{money(item.difference)}</td></tr>}</PaginatedTable>}
      <details className="risk-disclosure"><summary>Retained calculation and assumption basis</summary><p>{result.method}</p><p>Baseline: {result.baseline_run_ids.join(", ")}<br />Scenario: {result.scenario_run_ids.join(", ")}</p><dl className="risk-definition-list">{Object.entries(result.assumptions).filter(([key]) => key !== "market_plans").map(([key, value]) => <div key={key}><dt>{program?.fields.find((field) => field.key === key)?.label || label(key)}</dt><dd>{String(value ?? "Not supplied")}</dd></div>)}</dl>{result.references.map((reference) => <p key={reference.url}><a href={reference.url} target="_blank" rel="noreferrer">{reference.title}{reference.pages ? ` · pp. ${reference.pages}` : ""}</a></p>)}</details><div className="risk-panel-foot"><span>Actual payment: {label(result.actual_payment_status)}</span><Status value={result.status} /></div>
    </Panel>}
  </div>;
}
