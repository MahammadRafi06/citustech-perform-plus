import type { Opportunity } from "./types";

// Authored planning assumptions for synthetic records, never model coefficients.
// This layer does not write diagnoses, scores, review outcomes or clinical state.
export const PLANNING_VERSION = "synthetic-planning-2026.1";
export const PLANNING_NOTE = "Planning assumptions, not calibrated predictions or calculated RAF. Closure means a supported documentation outcome; no approval or payment is implied.";
const probabilityByEvidence: Record<string, number> = { Strong: .82, Moderate: .56, Limited: .28 };
const exposureByCondition: [RegExp, number][] = [
  [/heart failure/i, .32], [/diabetes.*kidney/i, .29], [/kidney/i, .18],
  [/COPD/i, .22], [/diabetes/i, .17], [/vascular/i, .24], [/fibrillation/i, .16], [/depression/i, .12],
];
const terminal = new Set(["resolved_supported", "resolved_unsupported", "suppressed", "deferred"]);
export function suspectPlanning(finding: Pick<Opportunity, "id" | "member_id" | "condition" | "evidence" | "type" | "status">) {
  const base = probabilityByEvidence[finding.evidence];
  const eligible = !terminal.has(finding.status);
  const isCorrection = finding.type === "integrity_review";
  const assessOnly = ["source_issue", "scenario_comparison"].includes(finding.type);
  const modifier = finding.type === "predictive_signal" ? -.14 : finding.type === "historical_condition" ? -.08 : 0;
  const probability = base == null || assessOnly ? null : Math.max(.05, Math.min(.95, base + modifier));
  const assumption = exposureByCondition.find(([pattern]) => pattern.test(finding.condition))?.[1] ?? null;
  const exposure = assessOnly || assumption == null ? null : assumption * (isCorrection ? -1 : 1);
  return { finding_id: finding.id, member_id: finding.member_id, eligible, isCorrection, probability, exposure,
    weighted: eligible && probability != null && exposure != null ? probability * exposure : null,
    reason: assessOnly ? "Evidence readiness only; no closure or score assumption." : `${finding.evidence} evidence${modifier ? `; ${finding.type.replaceAll("_", " ")} adjustment` : ""}.`,
    source: PLANNING_VERSION };
}
export function planningPortfolio(rows: Opportunity[]) {
  const items = rows.map(row => ({ row, ...suspectPlanning(row) }));
  const active = items.filter(item => item.eligible);
  const estimated = active.filter(item => item.probability != null);
  // One positive opportunity per member prevents adding overlapping condition
  // hypotheses. The largest expected exposure is a planning cap, not a union RAF.
  const byMember = new Map<string, number>();
  for (const item of active) if (item.weighted != null && item.weighted > 0)
    byMember.set(item.member_id, Math.max(byMember.get(item.member_id) || 0, item.weighted));
  const grouped = (key: (row: Opportunity) => string) => {
    const map = new Map<string, { name: string; findings: number; expected: number; exposure: number; probabilities: number[] }>();
    for (const item of active) {
      const name = key(item.row);
      const group = map.get(name) || { name, findings: 0, expected: 0, exposure: 0, probabilities: [] };
      group.findings++;
      if (item.probability != null) { group.expected += item.probability; group.probabilities.push(item.probability); }
      if (item.weighted != null) group.exposure += item.weighted;
      map.set(name, group);
    }
    return [...map.values()].map(g => ({ ...g, probability: g.probabilities.length ? g.expected / g.probabilities.length : null })).sort((a, b) => b.findings - a.findings);
  };
  const bands = [
    { name: "High · 70–100%", min: .7, max: 1.01 },
    { name: "Medium · 40–69%", min: .4, max: .7 },
    { name: "Low · below 40%", min: 0, max: .4 },
  ].map(band => ({ name: band.name, value: estimated.filter(item => item.probability! >= band.min && item.probability! < band.max).length }));
  const unmodeled = active.length - estimated.length;
  if (unmodeled) bands.push({ name: "Evidence readiness only", value: unmodeled });
  return { items, active, estimated, unmodeled, bands,
    activeMembers: new Set(active.map(item => item.member_id)).size,
    expectedClosures: estimated.reduce((sum, item) => sum + item.probability!, 0),
    meanProbability: estimated.length ? estimated.reduce((sum, item) => sum + item.probability!, 0) / estimated.length : null,
    positiveExposure: [...byMember.values()].reduce((a, b) => a + b, 0),
    correctionExposure: active.reduce((sum, item) => sum + Math.min(0, item.weighted ?? 0), 0),
    byCondition: grouped(row => row.condition), byEvidence: grouped(row => row.evidence), byType: grouped(row => row.type),
  };
}
export function financialProjection(exposure: number, reach: number, realization: number, monthlyBenchmark: number, months: number) {
  return Math.max(0, exposure) * reach * realization * monthlyBenchmark * months;
}
