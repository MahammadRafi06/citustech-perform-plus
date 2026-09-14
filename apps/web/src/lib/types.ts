export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  provider_id: string;
  screens: string[];
  permissions: string[];
  csrf_token: string;
}
export interface SourceReference {
  member_id?: string;
  document_id: string;
  page: number;
  section: string;
  quote?: string;
  relation?: string;
}
export interface PreparedCode {
  code: string;
  description: string;
  release: string;
  source_url?: string;
  reference_url?: string;
  reference_id?: string;
  operation?: string;
  basis?: string;
}
export interface ReviewEligibility {
  reviewable: boolean;
  finding_selection_required?: boolean;
  support_allowed: boolean;
  transmission_configured?: boolean;
  allowed_decisions: string[];
  reason: string;
  source_ids: string[];
  example_href: string;
  prepared_code?: PreparedCode;
}
export interface SourceClaim extends SourceReference {
  text: string;
  relation: string;
  quote: string;
  href: string;
}
export interface Completion {
  complete: boolean;
  reason: string;
}
export interface ReviewDecision {
  risk_context?: { config_id?: string; baseline_run_id?: string; snapshot_id?: string };
  id: string;
  actor_id: string;
  actor: string;
  at: string | null;
  decision: string;
  note: string;
  recommendation_version: number;
  source_refs: SourceReference[];
  prepared_code?: PreparedCode;
  basis?: string;
  basis_key?: string;
}
export interface QADecision {
  id: string;
  decision_id: string;
  actor_id?: string;
  actor: string;
  status: string;
  note: string;
  at: string | null;
}
export interface Recommendation {
  version: number;
  summary: string;
  created_at: string;
  document_ids?: string[];
  source_refs?: SourceReference[];
  state?: string;
  basis?: string;
  evidence?: string;
  previous_version?: number | null;
  next_action?: string;
}
export interface CaseTransition {
  id: string;
  label: string;
  document_id: string;
  date: string;
  status: string;
}
export interface CaseScenario {
  id: string;
  date: string;
  basis: string;
  transitions: CaseTransition[];
}
export interface NextCaseStep {
  label: string;
  role: string;
  href: string;
  action?: string;
  value?: string;
}
export interface ProgramContext {
  program: string;
  service_year: number;
  payment_year: number;
  model: string;
  scenario_date: string;
  basis: string;
  analysis_basis: string;
  receiver_basis: string;
  unconfigured_programs?: string[];
}
export interface AssignmentOption {
  id: string;
  name: string;
  email: string;
  role: string;
  provider_id: string;
  member_ids: string[];
  interventions: string[];
}
export interface PreparedImportRow {
  document_id: string;
  member_id: string;
  requested_member_id: string;
  title: string;
  received: boolean;
  matched: boolean | null;
  published: boolean;
  status: string;
  reason: string;
  href: string;
}
export interface PreparedImport {
  accepted_for_processing?: number;
  unmatched_pending?: number;
  identity_matched?: number;
  id: string;
  name: string;
  unit: string;
  total: number;
  received: number;
  matched: number;
  quarantined: number;
  published: number;
  basis: string;
  rows: PreparedImportRow[];
}
export interface ScoringScenario {
  id: string;
  member_id: string;
  basis: string;
  numeric_status: string;
  program: string;
  service_year: number;
  payment_year: number;
  model: string;
  segment: string;
  demographics: { age: number; sex: string };
  baseline_inputs: string[];
  combined_inputs: string[];
  source_ids: string[];
  baseline_score: number | null;
  combined_score: number | null;
  delta: number | null;
  steps: { label: string; detail: string }[];
  limitation: string;
}
export interface AuditTrace {
  member_id: string;
  program_context: ProgramContext;
  scenario: CaseScenario;
  source_refs: SourceReference[];
  recommendations: Recommendation[];
  decisions: ReviewDecision[];
  qa: QADecision[];
  submissions: Submission[];
  stages: Record<string, boolean>;
  missing_links: string[];
  readiness: string;
  formal_audit_readiness: boolean;
}
export interface Member {
  selected_finding_id?: string | null;
  finding_summary?: Record<string, unknown>;
  id: string;
  name: string;
  initials: string;
  age: number;
  sex: string;
  provider_id: string;
  provider: string;
  plan: string;
  county: string;
  city?: string;
  state?: string;
  condition: string;
  status: string;
  priority: string;
  evidence: string;
  opportunity_type: string;
  service_date: string;
  next_visit: string;
  summary: string;
  showcase?: boolean;
  provider_response?: string;
  later_encounter?: boolean;
  documents?: Evidence[];
  opportunities?: Opportunity[];
  tasks?: Task[];
  history?: Activity[];
  eligibility?: ReviewEligibility;
  claims?: SourceClaim[];
  basis_key?: string;
  next_steps?: NextCaseStep[];
  scenario?: CaseScenario;
  audit_trace?: AuditTrace;
  submissions?: Submission[];
}
export interface Opportunity {
  id: string;
  member_id: string;
  name?: string;
  initials?: string;
  provider?: string;
  condition: string;
  type: string;
  status: string;
  priority: string;
  evidence: string;
  owner: string;
  due_date: string;
  version: number;
  review_state?: string;
  draft_note?: string;
  draft_decision?: string;
  qa_reviewer?: string;
  qa_status?: string;
  decision_note?: string;
  reviewer?: string;
  document_ids?: string[];
  recommendation_history?: Recommendation[];
  recommendation_version?: number;
  analysis_basis_key?: string;
  eligibility?: ReviewEligibility;
  decision_history?: ReviewDecision[];
  qa_history?: QADecision[];
  qa_note?: string;
  completion?: Completion;
  current_decision_id?: string;
  prepared_code?: PreparedCode;
}
export interface Evidence {
  source_member_id?: string;
  synthetic?: boolean;
  evidence_relation?: string;
  superseded_by?: string;
  source_policy?: { id?: string; version?: string; reason?: string };
  later_example?: boolean;
  requested_member_id?: string;
  id: string;
  member_id: string;
  title: string;
  date: string;
  provider: string;
  signature_status?: string;
  published_at?: string;
  received_at?: string;
  requires_publication?: boolean;
  scenario_date?: string;
  source_status: string;
  kind: string;
  pages: {
    number: number;
    sections: { heading: string; text: string; highlight?: boolean }[];
  }[];
}
export interface Activity {
  id: number;
  actor: string;
  action: string;
  resource: string;
  detail: string;
  created_at: string;
}
export interface Task {
  finding_id?: string;
  closure_disposition?: string;
  closure_reason?: string;
  closed_at?: string;
  closed_by?: string;
  id: string;
  member_id: string;
  title: string;
  type: string;
  status: string;
  owner: string;
  response?: string;
  campaign_id?: string;
  intervention?: string;
  completion?: Completion;
  owner_id?: string;
  due_date?: string;
}
export interface Campaign {
  finding_ids?: string[];
  id: string;
  name: string;
  type: string;
  owner: string;
  status: string;
  member_ids: string[];
  created_at: string;
  due_date: string;
  progress: number;
  description?: string;
  owner_id?: string;
  actionable_member_ids?: string[];
  population_illustration?: boolean;
  completion_denominator?: number;
  completed_count?: number;
  intervention?: string;
}
export interface Chase {
  contact_history?: {
    at: string;
    actor: string;
    channel: string;
    note: string;
  }[];
  document_ids?: string[];
  id: string;
  member_id: string;
  provider: string;
  status: string;
  requested: string;
  document_type: string;
  owner: string;
  due_date: string;
}
export interface Submission {
  corrected?: boolean;
  id: string;
  member_id: string;
  type: string;
  status: string;
  receiver: string;
  original_id: string | null;
  reason: string;
  condition: string;
  history?: { stage: string; status: string; at: string; terminal: boolean }[];
  operation?: string;
  decision_id?: string;
  qa_id?: string;
  recommendation_version?: number;
  prepared_code?: PreparedCode;
  source_refs?: SourceReference[];
  decision?: ReviewDecision;
  qa?: QADecision;
  predecessor_id?: string;
  created_at?: string;
  data_basis?: string;
  payment_status?: string;
  eligibility_status?: string;
  report_comparison?: PreparedReportComparison;
  code?: string;
  code_release?: string;
  transport_status?: string;
  receiver_status?: string;
  reported_status?: string;
  reconciliation_status?: string;
  review_snapshot?: ReviewDecision;
  qa_snapshot?: QADecision;
  recommendation_snapshot?: Recommendation;
  retry_of?: string;
}
export interface PreparedReportComparison {
  id: string;
  report_fixture_id: string;
  name: string;
  basis: string;
  at: string;
  submission_id: string;
  member_id: string;
  decision_id: string;
  qa_id: string;
  source_refs: SourceReference[];
  expected: { code: string; operation: string; record_presence: string };
  reported: { code: string; record_presence: string };
  status: string;
  explanation: string;
  diagnosis_eligibility: string;
  payment_reconciliation: string;
}
export interface Provider {
  id: string;
  name: string;
  county: string;
  city: string;
  contact: string;
  response_days: number;
}
export interface Comparison {
  summary?: {
    manual: { tp: number; fp: number; fn: number; tn: number };
    assisted: { tp: number; fp: number; fn: number; tn: number };
    ai: { tp: number; fp: number; fn: number; tn: number };
  };
  id: string;
  chart_count: number;
  metrics: Record<string, number>;
  method: string;
  limitations: string;
  evaluation_records: Record<string, unknown>[];
  strata: Record<string, string | number>[];
}
export interface Snapshot {
  program_context?: ProgramContext;
  assignment_options?: AssignmentOption[];
  case_catalog?: { member_id: string; name: string; scenario_id: string; transitions: CaseTransition[] }[];
  import_summary?: PreparedImport;
  scenarios?: ScoringScenario[];
  completion_counts?: { eligible_cases: number; qa_approved: number; awaiting_qa: number; recorded_dispositions: number };
  issues: {
    id: string;
    member_id: string;
    title: string;
    status: string;
    reason: string;
    date: string;
  }[];
  members: Member[];
  population_count: number;
  opportunities: Opportunity[];
  counts: Record<string, number>;
  events: Activity[];
  campaigns: Campaign[];
  chases: Chase[];
  submissions: Submission[];
  providers: Provider[];
  comparison: Comparison | null;
  tasks: Task[];
  tour_started: string;
  runs: {
    id: string;
    mode: string;
    status: string;
    members: number;
    created_at: string;
    stages: string[];
    results?: { member_id: string; result: string; explanation: string; recommendation_version?: number }[];
  }[];
}
export interface Command {
  finding_id?: string;
  finding_ids?: string[];
  task_id?: string;
  decision_id?: string;
  evidence_episode_id?: string;
  document_id?: string;
  page?: number;
  section?: string;
  expected_versions?: Record<string, number>;
  expected_covered?: string[];
  owner?: string;
  due_date?: string;
  action: string;
  id?: string;
  member_ids?: string[];
  value?: string;
  note?: string;
  name?: string;
}
