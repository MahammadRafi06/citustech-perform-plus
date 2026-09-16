import { api } from "./api";
import type { RiskPrecision, RiskConfiguration, RiskOverview, RiskMemberProfile, RiskRun, RiskScenarioResult, RiskBatch, ScoreBasis } from "./risk-types";

export const scoreBasisLabels: Record<ScoreBasis, string> = {
  captured_baseline: "Baseline",
  qa_supported: "After quality review",
  submitted: "Submitted",
  accepted: "Accepted",
  eligible: "Eligible diagnoses",
  reported: "Reported result",
  potential: "Potential scenario",
};
export const overviewScoreBases: { basis: ScoreBasis; label: string }[] = [
  { basis: "captured_baseline", label: "Baseline" },
  { basis: "potential", label: "Potential scenarios" },
  { basis: "submitted", label: "Submitted" },
  { basis: "accepted", label: "Accepted" },
];
export function riskDecimals(precision?: RiskPrecision) {
  const value = typeof precision === "object" ? precision.canonical_decimals : precision;
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.min(9, value)) : 3;
}
export function formatRiskScore(value: number | null | undefined, precision: RiskPrecision = 3, signed = false) {
  if (value == null || !Number.isFinite(value)) return "—";
  const decimals = riskDecimals(precision);
  return new Intl.NumberFormat("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals, signDisplay: signed ? "exceptZero" : "auto" }).format(value);
}
export function canCalculateConfiguration(config?: RiskConfiguration) {
  return !!config && !Array.isArray(config.capabilities) && config.capabilities?.calculate === true;
}

function query(values: Record<string, string | number | undefined>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) if (value !== undefined && value !== "") params.set(key, String(value));
  return params.toString() ? `?${params}` : "";
}
export const riskClient = {
  configurations: () => api<{ items: RiskConfiguration[]; default_config_id: string; permissions: string[] }>("/risk/configurations"),
  overview: (config: string, basis: ScoreBasis, runMonth?: string) => api<RiskOverview>(`/risk/overview${query({ config_id: config, basis, run_month: runMonth })}`),
  member: (member: string, config: string, basis: ScoreBasis) => api<RiskMemberProfile>(`/risk/member/${encodeURIComponent(member)}${query({ config_id: config, basis })}`),
  run: (id: string) => api<RiskRun>(`/risk/runs/${encodeURIComponent(id)}`),
  calculate: (body: { member_id: string; config_id: string; basis?: ScoreBasis }, csrf: string) => api<RiskRun>("/risk/calculate", { method: "POST", body: JSON.stringify(body) }, csrf),
  scenario: (body: { member_id: string; config_id: string; baseline_run_id?: string; compare_config_id?: string; add_codes: { code: string; service_date?: string }[]; remove_diagnosis_ids: string[]; name?: string; save: boolean }, csrf: string) => api<RiskScenarioResult>("/risk/scenarios", { method: "POST", body: JSON.stringify(body) }, csrf),
  batches: () => api<{ items: RiskBatch[] }>("/risk/batches"),
  startBatch: (config_id: string, csrf: string) => api<RiskBatch>("/risk/batches", { method: "POST", body: JSON.stringify({ config_id }) }, csrf),
  retryBatch: (id: string, csrf: string) => api<RiskBatch>(`/risk/batches/${encodeURIComponent(id)}/resume`, { method: "POST", body: "{}" }, csrf),
};

export function downloadRiskJson(value: unknown, name: string) {
  const href = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = href; link.download = name; link.click();
  setTimeout(() => URL.revokeObjectURL(href), 5000);
}
