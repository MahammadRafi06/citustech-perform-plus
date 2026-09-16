import type { RiskConfiguration } from "./risk-types";

export const reportingMonths = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const runLabels: Record<string, string> = {
  initial: "Initial",
  midyear_final: "Midyear/Final",
  forecast: "Forecast",
  historical: "Reference",
  benefit_year_diy: "Benefit year",
  external_score: "External scores",
};

export function configurationLabel(config: RiskConfiguration) {
  if (config.blend_components?.length) return `${config.year} CMS-HCC Blend · ${config.blend_components.map((part) => `${part.percent}% ${part.model}`).join(" and ")}`;
  const model = config.program === "MA" ? `CMS-HCC ${config.model_version?.match(/V\d+/)?.[0] || config.model_version || "model"}`
    : config.program === "Part D" ? `RxHCC ${config.id.includes("_mapd_") ? "MA-PD" : "PDP"}`
    : config.program === "ACA" ? config.model_version || "HHS-HCC"
    : config.program.startsWith("Medicaid") ? "Florida Medicaid" : config.model_version || config.program;
  const run = runLabels[config.run_type || ""] || config.run_type?.replaceAll("_", " ") || "Calculation";
  return `${config.year} ${model} ${run}`;
}

export function configurationComposition(config: RiskConfiguration) {
  if (config.program !== "MA") return `${config.year} ${config.program === "ACA" ? "Benefit Year" : "Reporting Year"}`;
  if (config.blend_components?.length) return `${config.year} (Payment Year): ${config.blend_components.map((part) => `${part.percent}% ${part.model}`).join(" and ")}`;
  if (config.model_version?.includes("V28") && [2026, 2027].includes(config.year)) return `${config.year} (Payment Year): 100% V28 (0% V24)`;
  if (config.model_version?.includes("V24")) return `${config.year} · V24 reference component; blended score unavailable`;
  return `${config.year} Payment Year`;
}

export function configurationForYear(configurations: RiskConfiguration[], year: number, current?: RiskConfiguration) {
  const candidates = configurations.filter((item) => item.year === year && item.run_type !== "historical");
  return candidates.find((item) => item.program === current?.program && item.run_type === current?.run_type && item.model_version === current?.model_version)
    || candidates.find((item) => item.program === current?.program && item.run_type === current?.run_type)
    || candidates.find((item) => item.program === current?.program)
    || candidates[0];
}
