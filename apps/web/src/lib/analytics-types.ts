import type { OpportunityLevel, OpportunityQuadrant } from './opportunity-matrix';

export type AnalysisBasis = 'captured_baseline' | 'potential' | 'submitted' | 'accepted';
export type AnalysisView = 'risk' | 'geography' | 'provider' | 'suspecting' | 'raf' | 'financial' | 'ai' | 'coverage';
export interface CountRow { name: string; count: number; members?: number }
export interface FinancialSettings { reach: number; realization: number; benchmark: number; months: number; recognition: number; start: string; retention: number; ramp: number }
export interface AnalysisContext {
  snapshot: string; stage: string; basis: AnalysisBasis; run_month: string; contract: string;
  counties: string[]; practices: string[]; category: string; condition: string; evidence: string; band: string;
  rule: string; source: string; disposition: string; q: string; freshness: string; financial: FinancialSettings;
  discovery?: string; hcc_only?:boolean; conditions?: string[]; health_network?:string; provider_group?:string; provider?:string;
  closure?: string; quadrant?: string; age_band?: string; gender?: string; race?: string; zip?: string; social_need?: string;
}
export interface SuspectCase {
  discovery?: {kind:string;label:string;signal:string;coded_view:string;why_missed:string;confirm:string;record_count:number;rank:number;origin:string;comparison_basis:string;version:string} | null;
  member_name?: string;
  profile_reference?: {member_id:string;year:number;model_version:string;condition:string;category:string;confidence:string;evidence:string;evidence_strength?:string;compliance_note:string;hcc:string|null;delta:number;inclusion:string;source_sha256:string} | null;
  id: string; aliases: string[]; member_id: string; condition: string; domain: string;
  category: string; category_label: string; direction: string; legacy_type: string;
  rule_ids: string[]; rule_type: string; hcc: string; mapping_origin: string; evidence: string;
  status: string; raw_status: string; delta: number | null; impact_basis: string;
  analysis_date: string; probability_t0: string; stale: boolean; document_ids: string[];
  probability: {base: number | null; low: number | null; high: number | null; band: string; reason: string; method: string};
  source_available: boolean; provider_id: string; provider: string; county: string; contract: string;
  qualified: boolean; summary: string; countercheck: string; authored_extension: boolean;
  recommendation_history: {version: number; summary: string; created_at: string}[];
  sources: {origin?:string; id: string; title: string; date: string; status: string; content_hash: string; excerpts: {page: number; section: string; text: string}[]}[];
}
export interface GeoRow {
  id: string; name: string; members: number | null; eligible: number | null; scored: number | null;
  score: number | null; cases: number | null; capture_members: number | null; rate: number | null;
  coverage: number | null; suppressed: boolean;
}
export interface ProviderRow {
  id: string; name: string; practice: string; specialty: string; suppressed: boolean;
  members: number | null; score: number | null; member_months: number | null;
  captured_suspects: number | null; identified_suspects: number | null; capture_rate: number | null;
  prior_conditions: number | null; recaptured_conditions: number | null; recapture_rate: number | null;
  open_suspects: number | null;
}
export interface PrevalenceRow {
  name: string; hcc: string; members: number; denominator: number; prevalence: number | null;
  prior: number; recaptured: number; gap: number; recapture: number | null;
}
export interface MoneyTotals { gross: number; phased: number; support: number; realized: number; corrections: number; net: number }
export interface FinancialResult extends MoneyTotals {
  scenarios: (MoneyTotals & {name: string; reach: number; realization: number; probability: string; support_probability: number|null; monthly: (MoneyTotals & {month: string})[]})[];
  curve: {month: string; Conservative: number; Base: number; Optimistic: number}[];
  waterfall: {name: string; start: number; end: number}[];
  selected_ids: string[]; excluded_ids: string[]; selection_hash: string; selected_count: number; excluded_count: number;
  unvalued_corrections: number; partial: boolean; method: string; dollars_available: boolean; program_note: string;
  potential_exposure: number; exposure_count: number; correction_count: number;
  exposure_exclusions: {reason:string;count:number}[]; addition_exclusions: {reason:string;count:number}[];
  eligible_member_months: number; weighted_support_probability: number|null;
  contributions: {name:string;count:number;value:number}[];
  assumptions: FinancialSettings & {eligible_start:string; active_months:number; eligibility: string; corrections: string; impact: string; origin: string; probability_method: string};
}
export interface AnalysisReport {
  discovery_groups?: {id:string;name:string;description:string;count:number}[];
  landing?: LandingAnalytics;
  version: string; context: AnalysisContext; config: {id: string; name: string; program: string; year: number; model_version: string};
  origin: string; origin_label: string; as_of: string; filter_hash: string; input_hash: string; scope_hash: string; snapshot_hash: string;
  options: {hierarchy?:{practiceId:string;network:string;group:string;provider:string}[]; counties: string[]; practices: {id: string; name: string}[]; contracts: {id: string; name: string}[]};
  snapshots: {id: string; name: string; origin: string; baseline?: number | null; scored?: number}[];
  summary: {enrolled: number; eligible: number; scored: number; stale: number; missing: number; coverage: number | null;
    member_months: number; cases: number; aliases: number; qualified_members: number; capture_members: number;
    corrections: number; sources: number; conditional_support: number; reached_support: number; applicable: number};
  bases: Record<AnalysisBasis, number | null>;
  trend: {month: string; baseline: number; potential: number; submitted: number; accepted: number}[];
  histogram: CountRow[]; percentiles: {p25: number | null; median: number | null; p75: number | null; p90: number | null};
  prevalence: PrevalenceRow[]; counties: GeoRow[]; practices: GeoRow[]; providers?: ProviderRow[]; categories: CountRow[]; rules: CountRow[];
  hccs: CountRow[]; conditions: CountRow[]; bands: CountRow[];
  evidence_matrix: ({evidence: string} & Record<string, string | number>)[]; cases: SuspectCase[];
  financial: FinancialResult; ai: {id: string; version: number; metrics: Record<string,number>};
  reports: {id: string; title: string; question: string; view: string}[];
  method: Record<string,string>; metrics: Record<string,{value: number | null; numerator: number | null; denominator: number | null; unit: string; definition_version: string}>;
}
export interface LandingAnalytics {
  origin: string;
  matrix: {id:string;name:string;quadrant:OpportunityQuadrant;closure:number|null;gain:number|null;members:number|null;cases:number|null;suppressed:boolean}[];
  quadrants?: {id:string;name:string;quadrant:OpportunityQuadrant;members:number|null;cases:number|null;suppressed:boolean}[];
  quadrant_conditions?: {id:string;name:string;quadrant:OpportunityQuadrant;members:number|null;cases:number|null;suppressed:boolean}[];
  closure_bands?: {id:string;name:string;quadrant:OpportunityQuadrant;band:OpportunityLevel;members:number|null;cases:number|null;suppressed:boolean}[];
  priority_members:number; priority_cases:number;
  recapture: {prior:number;confirmed:number;missing:number;months:string[];practices:{id:string;name:string}[];networks?:{id:string;name:string}[];
    heat:{condition:string;dimension:string;key:string;name:string;members:number|null;confirmed:number|null;rate:number|null;suppressed:boolean}[]};
  providers:{id:string;name:string;practice:string;specialty:string;members:number|null;suppressed:boolean;
    series:{month:string;rules:number;closed:number;added:number;rate:number;opening_open:number;available:number;identified_to_date?:number;closed_to_date?:number;open_to_date?:number;confirmed_to_date?:number}[]|null}[];
  networks?: {id:string;name:string;members:number|null;suppressed:boolean;series:LandingAnalytics['providers'][number]['series']}[];
  social:{id:string;name:string;members:number|null;needs:number|null;share:number|null;score:number|null;suppressed:boolean}[];
  social_options:Record<string,string[]>;
  model:{start:number|null;changes:{name:string;change:number}[];benchmark:number;months:number;members:number};
  continuing_members?: {start_year:number;end_year:number;members:number;member_months:number;start:number|null;end:number|null;delta:number|null;percent_change:number|null;
    start_label?:string;end_label?:string;model_comparison?:{v24:number|null;v28:number|null;start_weights:{v24:number;v28:number};end_weights:{v24:number;v28:number}}|null;
    changes:{name:string;change:number|null}[];cohort_hash:string;score_basis:string;origin:string;method:string};
}
export interface SavedAnalysis { id: string; name: string; report_id: string; created_at: string; available: boolean; snapshot_hash: string | null }
export interface ScenarioOutput {
  mode: string; baseline?: number | null; delta?: number | null; potential?: number | null;
  cases?: number; members?: number; origin?: string; exclusions?: {id: string; reason: string}[];
  result?: {finding_count: number; member_count: number; selected_cohort_weighted_delta: number | null; basis: string};
}
