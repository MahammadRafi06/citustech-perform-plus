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
export interface Member {
  id: string;
  name: string;
  initials: string;
  age: number;
  sex: string;
  provider_id: string;
  provider: string;
  plan: string;
  county: string;
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
  qa_reviewer?: string;
  qa_status?: string;
  decision_note?: string;
  reviewer?: string;
  document_ids?: string[];
  recommendation_history?: {
    version: number;
    summary: string;
    created_at: string;
  }[];
}
export interface Evidence {
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
  id: string;
  member_id: string;
  title: string;
  type: string;
  status: string;
  owner: string;
  response?: string;
}
export interface Campaign {
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
  }[];
}
export interface Command {
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
