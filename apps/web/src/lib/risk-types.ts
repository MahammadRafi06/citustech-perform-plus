export type RiskPrecision = number | string | { canonical_decimals?: number; aggregation_decimals?: number; component_tolerance?: number };
export type ScoreBasis = "captured_baseline" | "qa_supported" | "submitted" | "accepted" | "eligible" | "reported" | "potential";

export interface RiskConfiguration {
  id: string;
  name?: string;
  label?: string;
  program: string;
  year: number;
  model_version?: string;
  blend_components?: { model: string; percent: number }[];
  software_release?: string;
  run_type?: string;
  status: string;
  score_label?: string;
  precision?: RiskPrecision;
  service_period?: { start: string; end: string };
  supported_segments?: string[];
  service_start?: string;
  service_end?: string;
  asset_sha256?: string;
  errors?: string[];
  warnings?: string[];
  capabilities?: string[] | { calculate?: boolean; scenarios?: boolean; external_import?: boolean; external_only?: boolean };
  validation_status?: string;
  source_url?: string;
  validation?: { status?: string; reference?: string; checked_at?: string; cases?: number };
  limitations?: string[];
  source_basis?: string;
}
export interface RiskComponent {
  factor: string;
  description: string;
  kind: string;
  coefficient: number | null;
  value: number | null;
  contribution: number | null;
  segment?: string;
  months?: number | string[];
}
export interface RiskCategory {
  code: string;
  category: string | null;
  status: string;
  diagnosis_ids: string[];
  source_ids: string[];
  description?: string;
  reason?: string;
}
export interface RiskRun {
  id: string;
  stale?: boolean;
  stale_reason?: string | null;
  snapshot_id: string;
  member_id?: string;
  created_at: string;
  score_basis: ScoreBasis;
  origin: string;
  synthetic: boolean;
  status: "completed" | "failed" | "unavailable";
  config_id: string;
  program: string;
  year: number;
  run_type: string;
  model_version: string;
  software_release: string;
  asset_sha256: string;
  selected_segment: string;
  raw_score: number | null;
  adjusted_score: number | null;
  monthly_scores: { month: string; segment: string; raw_score: number | null; adjusted_score: number | null }[];
  components: RiskComponent[];
  categories: RiskCategory[];
  exclusions: { id: string; code?: string; reason: string }[];
  warnings: string[];
  errors: string[];
  precision: RiskPrecision;
  transformations: { name?: string; operation?: string; label?: string; normalization?: number; coding_pattern_multiplier?: number; source_url?: string; factor?: string | number; value?: number; input?: number; output?: number; source?: string; description?: string }[];
  provenance: Record<string, unknown>;
}
export interface RiskDiagnosis {
  id: string;
  code: string;
  service_date?: string;
  source_id?: string;
  description?: string;
}
export interface RiskMemberProfile {
  member_id: string;
  identity: { dob: string; sex: number; profile_age: number; profile_age_reference_date: string };
  configuration: RiskConfiguration;
  readiness: { score_ready: boolean; review_ready: boolean; reasons: string[] };
  input_snapshot: { id: string; diagnoses?: RiskDiagnosis[]; age?: number; sex?: number; [key: string]: unknown };
  run: RiskRun | null;
  history: RiskRun[];
  stages: { basis: ScoreBasis; run: RiskRun | null }[];
  recapture: { id?: string; category?: string; condition?: string; status?: string; state?: string; source_basis?: string; exclusion_reason?: string; reason?: string }[];
  opportunities: { id: string; member_id?: string; condition: string; category?: string; delta?: number | null; status?: string }[];
}
export interface RiskMeasure {
  id: string;
  label: string;
  value: number | null;
  unit?: string;
  precision?: RiskPrecision;
  definition?: string;
  basis?: string;
  numerator?: number;
  denominator?: number;
  href?: string;
}
export interface RiskBatch {
  id: string;
  status: string;
  total: number;
  succeeded: number;
  failed: number;
  processed: number;
  created_at: string;
  updated_at: string;
  errors: { member_id?: string; error?: string; reason?: string }[];
}
export interface RiskOverview {
  configuration: RiskConfiguration;
  reporting_period?: { month: string | null; year: number; label: string };
  coverage: { enrolled_members: number; expected_scoreable: number; scored_members: number; failed_members: number; excluded_members: number; enrolled_member_months: number | null; scored_member_months: number; unscored_members?: number };
  portfolio: { raw_score: number | null; adjusted_score: number | null; weighting: string; denominator: number; incomplete_reason?: string | null };
  metrics: RiskMeasure[];
  external_groups?: { producer: string; model_version: string; program: string; rating_period: string; normalization_basis: string; coverage_basis: string; members: number; member_months: number; raw_score: number | null; adjusted_score: number | null; rate_cells: string[]; run_ids: string[] }[];
  distribution: { label: string; count: number }[];
  members: { member_id: string; name?: string; raw_score?: number | null; adjusted_score?: number | null; status?: string; stale?: boolean; run_id?: string }[];
  stale: boolean;
  batch: RiskBatch | null;
}
export interface RiskScenarioResult {
  id: string;
  baseline: RiskRun;
  scenario: RiskRun;
  delta: number | null;
  differences: { factor?: string; label?: string; description?: string; before?: number | null; after?: number | null; delta?: number | null; explanation?: string }[];
  saved: boolean;
}
