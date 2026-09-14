"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  ArrowDownToLine,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileText,
  FileCheck2,
  Filter,
  FolderOpen,
  Layers3,
  LoaderCircle,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Users,
  ZoomIn,
  ZoomOut,
  Send,
  Upload,
  RotateCcw,
  Building2,
  CalendarDays,
  ClipboardList,
  MoreHorizontal,
  ScanLine,
  Info,
  AlertCircle,
} from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  PageHeader,
  Panel,
  Empty,
  Status,
  Avatar,
  DataGrid,
  Drawer,
  Modal,
  Notice,
  Metric,
  SelectField,
} from "./shared";
import type {
  User,
  Snapshot,
  Command,
  Member,
  Opportunity,
  Campaign,
  Chase,
  Submission,
  Provider,
  Evidence,
  Task,
} from "@/lib/types";
import { formatRiskScore } from "@/lib/risk-client";
import { api, label, num, download } from "@/lib/api";
import { toast } from "sonner";
import {
  useDraft,
  useUrlState,
  useReturnLink,
  safeReturn,
} from "@/hooks/workspace-state";
import { CampaignPlanner, CampaignDialog } from "./campaign-planner";
import { ReviewWorkbench } from "./review-workbench";
import { SourceDocument } from "./source-document";
import { AssessmentSubmissions } from "./assessment-submissions";
import { IntakeWorkspace } from "./intake-workspace";
import { RiskSourceAnalysis } from "./risk-ai-ui";
import { MemberRiskProfile, RiskModelLab, RiskModelsData, RiskReconciliation, RiskInputSnapshot, RiskMemberDirectory, RiskImpactSummary, type RiskImpactResult, useRiskContext } from "./risk-ui";
import { EligibilityContext, PreparedClaims, NextSteps, CaseHistory } from "./assessment-workspaces";
export type WorkspaceProps = {
  route: string;
  path: string;
  user: User;
  data: Snapshot;
  act: (body: Command) => Promise<unknown>;
  refresh: () => Promise<unknown>;
};
const findingType = (value: string) =>
  ({
    documented_gap: "Potential coding gap",
    historical_condition: "Historical condition review",
    predictive_signal: "AI condition hypothesis",
    specificity_query: "Documentation clarification",
    integrity_review: "Integrity review",
    source_issue: "Source remediation",
    scenario_comparison: "Risk scenario context",
  })[value as "documented_gap"] || label(value);
const can = (u: User, action: string) => u.permissions.includes(action);
const actionSafe = (act: WorkspaceProps["act"], body: Command) =>
  act(body).catch(() => undefined);
const exportSafe = (kind: string, u: User, ids: string[] = [], q = "") =>
  download(kind, u.csrf_token, ids, q)
    .then(() => toast.success("Export downloaded"))
    .catch((e) => toast.error(e.message));
export function Workspaces(props: WorkspaceProps) {
  const { route, path } = props;
  if (route === "members" && path.split("/")[2])
    return <MemberWorkspace key={path} {...props} id={path.split("/")[2]} />;
  if (route === "reviews" && path.split("/")[2])
    return <ReviewWorkbench key={path} {...props} id={path.split("/")[2]} />;
  if (route === "members") return <RiskMemberDirectory user={props.user} providers={props.data.providers} />;
  if (route === "suspects" || route === "reviews" || route === "qa")
    return <Registry {...props} />;
  if (route === "campaigns") return <CampaignPlanner {...props} />;
  if (route === "providers" || route === "previsit")
    return <Providers {...props} />;
  if (route === "chase" || route === "intake")
    return <IntakeWorkspace {...props} />;
  if (route === "submissions" || route === "audit")
    return <AssessmentSubmissions {...props} />;
  if (route === "scenarios") return <RiskModelLab user={props.user} />;
  if (route === "data") return <RiskModelsData user={props.user} sources={<Operations {...props} />} />;
  if (route === "admin" || route === "data") return <Operations {...props} />;
  return <Empty title="Workspace not found" />;
}
function Registry({ data, user, route, act }: WorkspaceProps) {
  const router = useRouter();
  const risk = useRiskContext();
  const queryClient = useQueryClient();
  const [ranking, setRanking] = useUrlState("ranking", "operational_priority");
  const [impact, setImpact] = useState<RiskImpactResult | null>(null);
  const [impactBusy, setImpactBusy] = useState(false);
  const marginal = useQuery({ queryKey: ["risk", "opportunities", user.id, risk.configId, ranking], queryFn: () => api<{ items: { finding_id: string; delta: number | null; ranking_reason: string; stale?: boolean }[] }>(`/risk/opportunities?config_id=${encodeURIComponent(risk.configId)}&mode=${ranking}`), enabled: !!risk.configId });
  const params = useSearchParams();
  const [status, setStatus] = useUrlState("status", "all");
  const [memberFilter, setMemberFilter] = useUrlState("member", "");
  const [kind, setKind] = useUrlState("kind", "suspects");
  const [savedView, setSavedView] = useUrlState("saved", "all");
  const [scope, setScope] = useUrlState("scope", "actionable");
  const [analysisDetails, setAnalysisDetails] = useState(false);
  const returnLink = useReturnLink();
  const [priority, setPriority] = useUrlState("priority", "all");
  const [evidence, setEvidence] = useUrlState("evidence", "all");
  const [bulk, setBulk] = useState("");
  const [allocation, setAllocation] = useDraft("bulk-owner", "");
  const [bulkNote, setBulkNote] = useDraft("bulk-note", "");
  const [selected, setSelected] = useDraft<string[]>(
    `registry-${route}-selected`,
    [],
  );
  const [detailId, setDetailId] = useState("");
  const detail = data.opportunities.find((item) => item.id === detailId) || null;
  const setDetail = (item: Opportunity | null) => setDetailId(item?.id || "");
  const detailRecord = useQuery({
    queryKey: ["member", detail?.member_id, user.id, detail?.id],
    queryFn: () => api<Member>(`/members/${detail?.member_id}?finding=${detail?.id}`),
    enabled: !!detail,
  });
  const [busy, setBusy] = useState(false);
  const [campaign, setCampaign] = useState(false);
  const [name, setName] = useState("");
  const [intervention, setIntervention] = useState("Retrospective review");
  const assignmentOptions = (data.assignment_options || []).filter((owner) =>
    owner.interventions.includes("coding_review") && selected.every((id) => owner.member_ids.includes(data.opportunities.find((o) => o.id === id)?.member_id || "")),
  );
  const selectableIds = new Set(data.opportunities.filter((o) => o.eligibility?.reviewable).map((o) => o.id));
  useEffect(() => {
    setSelected((current) => current.filter((id) => selectableIds.has(id)));
  }, [data.opportunities]);
  const rows = data.opportunities.filter(
    (o) =>
      (scope === "all" || !!o.eligibility?.reviewable) &&
      (!memberFilter || o.member_id === memberFilter) &&
      (route !== "suspects" ||
        (kind === "suspects"
          ? [
              "documented_gap",
              "historical_condition",
              "predictive_signal",
              "specificity_query",
            ].includes(o.type)
          : kind === "all" || o.type === kind)) &&
      (savedView === "all" ||
        (savedView === "complete" ? !!o.completion?.complete : savedView === "active"
          ? !o.completion?.complete && o.status !== "suppressed"
          : savedView === "assessment"
            ? o.status === "awaiting_assessment"
            : savedView === "ready"
              ? o.evidence === "Strong" &&
                ["new", "in_review"].includes(o.status)
              : (o.recommendation_history?.length || 0) > 1)) &&
      (status === "all" ||
        (status === "active"
          ? !o.completion?.complete && o.status !== "suppressed"
          : status === "pending"
            ? ["awaiting_assessment", "awaiting_evidence"].includes(o.status)
            : o.status === status)) &&
      (priority === "all" || o.priority === priority) &&
      (evidence === "all" || o.evidence === evidence) &&
      (route !== "qa" || o.qa_status === "awaiting_qa"),
  );
  const ranks = new Map((marginal.data?.items || []).map((item, index) => [item.finding_id, index]));
  rows.sort((left, right) => (ranks.get(left.id) ?? Number.MAX_SAFE_INTEGER) - (ranks.get(right.id) ?? Number.MAX_SAFE_INTEGER));
  const calculateImpact = async () => { setImpactBusy(true); try { const value = await api<RiskImpactResult>("/risk/opportunities/calculate", { method: "POST", body: JSON.stringify({ config_id: risk.configId, finding_ids: selected }) }, user.csrf_token); setImpact(value); await queryClient.invalidateQueries({ queryKey: ["risk", "opportunities"] }); } catch (error) { toast.error((error as Error).message); } finally { setImpactBusy(false); } };
  useEffect(() => setImpact(null), [selected, risk.configId]);
  const columns: ColumnDef<Opportunity, unknown>[] = [
    {
      id: "select",
      header: "",
      enableSorting: false,
      cell: ({ row }) => (
        <span onClick={(e) => e.stopPropagation()}>
          <Checkbox
            aria-label={`Select ${row.original.member_id}`}
            disabled={!row.original.eligibility?.reviewable}
            checked={selected.includes(row.original.id)}
            onCheckedChange={(v) =>
              setSelected((s) =>
                v
                  ? [...s, row.original.id]
                  : s.filter((id) => id !== row.original.id),
              )
            }
          />
        </span>
      ),
    },
    {
      accessorKey: "name",
      header: "Member",
      cell: ({ row }) => (
        <div className="person-cell">
          <Avatar
            name={row.original.name || row.original.member_id}
            id={row.original.member_id}
          />
          <span>
            <strong>{row.original.name || row.original.member_id}</strong>
            <small>{row.original.member_id}</small>
          </span>
        </div>
      ),
    },
    {
      accessorKey: "condition",
      header: "Finding",
      cell: ({ row }) => (
        <>
          <strong className="table-primary">{row.original.condition}</strong>
          <small>{findingType(row.original.type)}{!row.original.eligibility?.reviewable ? " · Population only" : ""}</small>
        </>
      ),
    },
    {
      accessorKey: "priority",
      header: "Priority",
      cell: ({ getValue }) => <Status value={String(getValue())} />,
    },
    {
      accessorKey: "evidence",
      header: "Evidence",
      cell: ({ getValue }) => <Status value={String(getValue())} />,
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ getValue }) => <Status value={String(getValue())} />,
    },
    { id: "marginal", header: "Marginal score effect", cell: ({ row }) => { const value = marginal.data?.items.find((item) => item.finding_id === row.original.id); return <span>{formatRiskScore(value?.delta, 3, true)}<small>{value?.stale ? "Inputs changed · recalculate" : value?.delta == null ? "Not calculated" : "Complete-member scenario"}</small></span>; } },
    { accessorKey: "owner", header: "Owner" },
    {
      accessorKey: "due_date",
      header: "Due date",
      cell: ({ getValue }) => (
        <span className="date-value">
          {new Date(`${String(getValue())}T12:00:00`).toLocaleDateString(
            "en-US",
            { month: "short", day: "numeric" },
          )}
        </span>
      ),
    },
    { id: "open", header: "", cell: () => <ArrowUpRight size={15} /> },
  ];
  const run = async () => {
    if (!selected.length) {
      toast.info("Select one or more members to run analysis.");
      return;
    }
    setBusy(true);
    try {
      await act({
        action: "analyze",
        member_ids: [...new Set(data.opportunities.filter((o) => selected.includes(o.id)).map((o) => o.member_id))],
        finding_ids: selected,
      });
    } catch {
    } finally {
      setBusy(false);
    }
  };
  const create = async () => {
    setBusy(true);
    try {
      await act({
        action: "campaign",
        member_ids: [...new Set(data.opportunities.filter((o) => selected.includes(o.id)).map((o) => o.member_id))],
        finding_ids: selected,
        name,
        value: intervention,
      });
      setCampaign(false);
      setSelected([]);
      router.push("/campaigns");
    } catch {
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <PageHeader
        eyebrow="EVIDENCE-LED REVIEW"
        title={
          route === "reviews"
            ? "Chart review"
            : route === "qa"
              ? "Coding quality assurance"
              : "Suspect registry"
        }
        description={
          route === "qa"
            ? "Independent review, clear feedback and traceable decisions."
            : route === "reviews"
              ? "Your review queue, with source evidence at the center."
              : "Prioritize findings, inspect evidence and assign the next review."
        }
      >
        {can(user, "campaign") && (
          <Button
            variant="outline"
            onClick={() => {
              if (!selected.length) {
                toast.info("Select members to create a campaign.");
                return;
              }
              setCampaign(true);
            }}
          >
            <Plus size={16} />
            Create campaign
          </Button>
        )}
        {can(user, "analyze") && (
          <Button disabled={busy} onClick={run}>
            {busy ? (
              <LoaderCircle className="animate-spin" size={16} />
            ) : (
              <Sparkles size={16} />
            )}
            Run analysis
          </Button>
        )}
      </PageHeader>
      {route === "suspects" && (
        <div className="registry-views" aria-label="Work categories">
          {[
            ["suspects", "Suspects"],
            ["integrity_review", "Integrity"],
            ["source_issue", "Source issues"],
            ["scenario_comparison", "Scenarios"],
            ["all", "All work"],
          ].map(([value, title]) => (
            <button
              key={value}
              className={kind === value ? "active" : ""}
              onClick={() => setKind(value)}
            >
              {title}{" "}
              <span>
                {num(
                  data.opportunities.filter((o) => (scope === "all" || o.eligibility?.reviewable) && (
                    value === "suspects"
                      ? [
                          "documented_gap",
                          "historical_condition",
                          "predictive_signal",
                          "specificity_query",
                        ].includes(o.type)
                      : value === "all" || o.type === value),
                  ).length,
                )}
              </span>
            </button>
          ))}
        </div>
      )}
      <div className="registry-summary">
        <div>
          <strong>{num(rows.length)}</strong>
          <span>
            {kind === "suspects" && route === "suspects"
              ? "suspects"
              : "work items"}
          </span>
        </div>
        <div>
          <strong>{rows.filter((o) => o.priority === "High").length}</strong>
          <span>high priority</span>
        </div>
        <div>
          <strong>{rows.filter((o) => o.evidence === "Strong").length}</strong>
          <span>strong evidence</span>
        </div>
      </div>
      {data.runs.some((r) => ["prepared_analysis", "fixture"].includes(r.mode)) && route === "suspects" && (
        <div className="run-result">
          <span className="subtle-tag">Prepared analysis</span>
          <span>
            {(() => {
              const r = data.runs.find((r) => ["prepared_analysis", "fixture"].includes(r.mode))!;
              return `${new Date(r.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} · ${r.members} ${r.members === 1 ? "finding" : "findings"} analyzed`;
            })()}
          </span>
          <button onClick={() => setAnalysisDetails(true)}>
            Analysis details
          </button>
        </div>
      )}
      {memberFilter && <div className="filter-chips"><button onClick={() => setMemberFilter("")}>Member: {data.members.find((m) => m.id === memberFilter)?.name || memberFilter} ×</button></div>}
      {(status !== "all" ||
        priority !== "all" ||
        evidence !== "all" ||
        savedView !== "all") && (
        <div className="filter-chips">
          {status !== "all" && (
            <button onClick={() => setStatus("all")}>{label(status)} ×</button>
          )}
          {priority !== "all" && (
            <button onClick={() => setPriority("all")}>
              {priority} priority ×
            </button>
          )}
          {evidence !== "all" && (
            <button onClick={() => setEvidence("all")}>
              {evidence} evidence ×
            </button>
          )}
          {savedView !== "all" && (
            <button onClick={() => setSavedView("all")}>
              Saved view: {label(savedView)} ×
            </button>
          )}
        </div>
      )}
      <Modal
        open={analysisDetails}
        onOpenChange={setAnalysisDetails}
        title="Analysis details"
        description="Prepared analysis · Source-linked recommendations"
      >
        <div className="definition-list">
          {data.runs
            .filter((r) => ["prepared_analysis", "fixture"].includes(r.mode))
            .slice(0, 3)
            .map((r) => (
              <div key={r.id}>
                <span>
                  {r.id} · {new Date(r.created_at).toLocaleString()}
                </span>
                <strong>
                  {r.members} {r.members === 1 ? "finding" : "findings"} ·{" "}
                  {label(r.status)}
                </strong>
                <p>{r.stages.join(" → ")}</p>
              </div>
            ))}
        </div>
        <p className="body-copy">
          Analysis checks the current source set against the prepared case. Unchanged evidence retains its recommendation version. Review cited passages before deciding.
        </p>
      </Modal>
      {selected.length > 0 && (
        <div className="selection-bar">
          <strong>
            {selected.length} {selected.length === 1 ? "finding" : "findings"}{" "}
            selected ·{" "}
            {
              selected.filter((id) => !rows.some((o) => o.id === id))
                .length
            }{" "}
            outside current filters
          </strong>
          {[
            ["assign", "Assign to team"],
            ["request_evidence", "Request evidence"],
            ["defer", "Defer selected"],
            ["suppress", "Suppress selected"],
          ]
            .filter(([action]) => can(user, action))
            .map(([action, title]) => (
              <Button
                key={action}
                variant="ghost"
                size="sm"
                onClick={() => setBulk(action)}
              >
                {title}
              </Button>
            ))}
          <Button variant="ghost" size="sm" onClick={() => setSelected([])}>
            Clear selection
          </Button>
        </div>
      )}
      {impact && <RiskImpactSummary result={impact} />}
      <Panel>
        <DataGrid
          rows={rows}
          columns={columns}
          onRow={(o) => setDetail(o)}
          searchLabel="Search members, conditions or owners…"
          pageSize={25}
          selectedIds={data.opportunities
            .filter((o) => selected.includes(o.id))
            .map((o) => o.id)}
          actions={
            user.permissions.includes("risk_scenario") && (
              <Button variant="outline" disabled={impactBusy || !selected.length} onClick={calculateImpact}>
                {impactBusy ? "Calculating…" : "Calculate effect"}
              </Button>
            )
          }
          toolbar={
            <div className="registry-filters">
              <SelectField showLabel label="Ranking" value={ranking} onChange={setRanking} options={[["operational_priority", "Operational priority"], ["recapture_urgency", "Recapture urgency"], ["marginal_score_effect", "Marginal score effect"], ["accuracy_correction", "Accuracy correction"]].map(([value, label]) => ({ value, label }))} />
              <SelectField
                showLabel
                label="Work scope"
                value={scope}
                onChange={setScope}
                options={[{ value: "actionable", label: "Actionable cases" }, { value: "all", label: "Population findings" }]}
              />
              <SelectField
                showLabel
                label="Saved view"
                value={savedView}
                onChange={setSavedView}
                options={[
                  { value: "all", label: "All records" },
                  { value: "active", label: "Open review / QA" },
                  { value: "complete", label: "QA-approved completion" },
                  { value: "assessment", label: "Needs assessment" },
                  { value: "ready", label: "Ready for review" },
                  { value: "changed", label: "Evidence changed" },
                ]}
              />

              <SelectField
                showLabel
                label="Status"
                value={status}
                onChange={(v) => {
                  setStatus(v);
                }}
                options={[
                  { value: "all", label: "All statuses" },
                  { value: "active", label: "Active opportunities" },
                  { value: "pending", label: "Pending follow-up" },
                  ...Object.keys(data.counts).map((s) => ({
                    value: s,
                    label: label(s),
                  })),
                ]}
              />
              <SelectField
                showLabel
                label="Priority"
                value={priority}
                onChange={(v) => {
                  setPriority(v);
                }}
                options={[
                  { value: "all", label: "All priorities" },
                  ...["High", "Medium", "Low"].map((v) => ({
                    value: v,
                    label: v,
                  })),
                ]}
              />
              <SelectField
                showLabel
                label="Evidence"
                value={evidence}
                onChange={(v) => {
                  setEvidence(v);
                }}
                options={["all", "Strong", "Moderate", "Limited"].map((v) => ({
                  value: v,
                  label: v === "all" ? "All evidence" : v,
                }))}
              />
            </div>
          }
          exportAction={(filtered) =>
            exportSafe(
              "opportunities",
              user,
              filtered.map((o) => o.id),
            )
          }
        />
      </Panel>
      <Drawer
        open={!!detail}
        onOpenChange={(v) => !v && setDetail(null)}
        title={detail?.condition || "Opportunity"}
        description={
          detail
            ? `${detail.member_id} · Recommendation version ${detail.recommendation_version || 1}`
            : undefined
        }
      >
        {detail && (
          <>
            <div className="detail-person">
              <Avatar
                name={detail.name || detail.member_id}
                id={detail.member_id}
                size="large"
              />
              <div>
                <h3>{detail.name || detail.member_id}</h3>
                <p>{detail.provider || "Practice unavailable"}</p>
              </div>
            </div>
            <div className="badge-row">
              <Status value={detail.priority} />
              <Status value={detail.evidence} />
              <Status value={detail.status} />
            </div>
            <div className="insight-card">
              <span>
                <Sparkles size={15} />
                Finding context
              </span>
              <p>
                {data.members.find((m) => m.id === detail.member_id)?.summary ||
                  `A ${label(detail.type).toLowerCase()} was identified in the source records. Inspect the source and confirm the next review action.`}
              </p>
            </div>
            <EligibilityContext eligibility={detailRecord.data?.eligibility || detail.eligibility} />
            <h3 className="section-title">Source context</h3>
            {detailRecord.isPending ? (
              <p className="body-copy">Loading linked sources…</p>
            ) : detailRecord.data?.documents?.length ? (
              detailRecord.data.documents.map((d) => (
                <details className="review-context-item" key={d.id}>
                  <summary>
                    {d.title} · {d.date}
                  </summary>
                  {d.pages.flatMap((p) =>
                    p.sections
                      .filter((s) => s.highlight)
                      .map((s, i) => (
                        <blockquote key={`${p.number}-${i}`}>
                          <p>{s.text}</p>
                          <small>
                            {d.id} · Page {p.number} · {s.heading}
                          </small>
                        </blockquote>
                      )),
                  )}
                  <p>
                    Source: {label(d.source_status)} ·{" "}
                    {d.signature_status || "Signature not supplied"}
                  </p>
                  <Link
                    href={returnLink(
                      `/members/${detail.member_id}?tab=Evidence%20%26%20documents&document=${d.id}`,
                    )}
                  >
                    Open cited document →
                  </Link>
                </details>
              ))
            ) : (
              <p className="body-copy">
                No source document is available. Request eligible documentation.
              </p>
            )}
            <h3 className="section-title">Conflicts and missing information</h3>
            <p className="body-copy">
              {detail.type === "integrity_review"
                ? "Contradictory source information requires independent integrity review; retain the original receiver record."
                : detail.type === "historical_condition"
                  ? "Historical evidence requires a current assessment."
                  : detail.type === "predictive_signal"
                    ? "Indirect signals do not establish a diagnosis. Request a current assessment."
                    : detail.type === "source_issue"
                      ? "Source eligibility requires remediation. Inspect signature and encounter metadata."
                      : "Inspect the full source for current support, contradictions and eligibility before deciding."}
            </p>
            <h3 className="section-title">Why prioritized</h3>
            <div className="definition-list">
              <div>
                <span>Review priority</span>
                <strong>{detail.priority}</strong>
              </div>
              <div>
                <span>Evidence strength</span>
                <strong>{detail.evidence}</strong>
              </div>
              <div>
                <span>Due date</span>
                <strong>{detail.due_date}</strong>
              </div>
              <div>
                <span>Assigned owner</span>
                <strong>{detail.owner}</strong>
              </div>
            </div>
            {detail.recommendation_history && (
              <>
                <h3 className="section-title">What changed</h3>
                {detail.recommendation_history.map((r) => (
                  <div className="history-card" key={r.version}>
                    <strong>Version {r.version}</strong>
                    <p>{r.summary}</p>
                  </div>
                ))}
              </>
            )}
            <div className="drawer-actions">
              <Button asChild>
                <Link
                  href={returnLink(
                    `/${user.screens.includes("reviews") ? "reviews" : "members"}/${detail.member_id}?finding=${detail.id}`,
                  )}
                >
                  Open source and next action
                  <ArrowRight size={15} />
                </Link>
              </Button>
              {can(user, "defer") && detail.eligibility?.reviewable && (
                <Button
                  variant="outline"
                  onClick={() =>
                    actionSafe(act, {
                      action: "defer",
                      id: detail.id,
                      note: "Deferred for follow-up review.",
                    }).then(() => setDetail(null))
                  }
                >
                  Defer
                </Button>
              )}
            </div>
          </>
        )}
      </Drawer>
      <Modal
        open={!!bulk}
        onOpenChange={(v) => !v && setBulk("")}
        title={`${label(bulk)} selected work`}
        description={`${selected.length} members · changes are validated together before saving`}
      >
        {bulk === "assign" && (
          <SelectField
            label="Review account"
            value={allocation}
            onChange={setAllocation}
            options={[{ value: "", label: "Choose a review account" }, ...assignmentOptions.map((owner) => ({ value: owner.id, label: `${owner.name} · ${label(owner.role)}` }))]}
          />
        )}
        <div className="form-field">
          <Label htmlFor="bulk-reason">
            {bulk === "assign"
              ? "Allocation note (optional)"
              : "Reason / follow-up note"}
          </Label>
          <textarea
            id="bulk-reason"
            rows={3}
            value={bulkNote}
            onChange={(e) => setBulkNote(e.target.value)}
          />
        </div>
        <Notice>
          {bulk === "assign" ? "Each listed account can review every selected case. " : ""}
          Selected records remain selected if validation fails. Existing open
          evidence requests will be reused.
        </Notice>
        <Button
          disabled={
            busy ||
            !selected.length ||
            (bulk === "assign" && !assignmentOptions.some((owner) => owner.id === allocation)) ||
            (["defer", "suppress"].includes(bulk) && !bulkNote.trim())
          }
          onClick={async () => {
            setBusy(true);
            try {
              await act({
                action: bulk,
                member_ids: [...new Set(data.opportunities.filter((o) => selected.includes(o.id)).map((o) => o.member_id))],
        finding_ids: selected,
                value: allocation,
                note: bulkNote,
              });
              setBulk("");
              setSelected([]);
              setBulkNote("");
            } catch {
            } finally {
              setBusy(false);
            }
          }}
        >
          Apply to {selected.length} members
        </Button>
      </Modal>
      <CampaignDialog
        open={campaign}
        onOpenChange={setCampaign}
        selected={selected}
        onSelectedChange={setSelected}
        data={data}
        act={act}
        onComplete={() => {
          setSelected([]);
          router.push("/campaigns");
        }}
      />
    </>
  );
}
function MemberDirectory({ data, user }: WorkspaceProps) {
  const router = useRouter();
  const returnLink = useReturnLink();
  const [q, setQ] = useUrlState("q", "");
  const [page, setPage] = useUrlState("page", 1);
  const [provider, setProvider] = useUrlState("provider", "");
  const result = useQuery({
    queryKey: ["members", user.id, q, page, provider],
    queryFn: () =>
      api<{ items: Member[]; total: number }>(
        `/members?q=${encodeURIComponent(q)}&page=${page}&provider=${provider}`,
      ),
  });
  return (
    <>
      <PageHeader
        title="Member 360"
        description="One connected view of the member, their evidence and their work."
      >
        <Button
          variant="outline"
          onClick={() =>
            download("members", user.csrf_token, [], q, provider).catch((e) =>
              toast.error(e.message),
            )
          }
        >
          <ArrowDownToLine size={16} />
          Export members
        </Button>
      </PageHeader>
      <div className="showcase-strip">
        <div>
          <Sparkles size={18} />
          <span>
            <strong>Priority cases</strong>
            <small>Six prepared cases with linked evidence and complete workflows.</small>
          </span>
        </div>
        {data.members.filter((m) => m.showcase).map((m) => (
          <Link key={m.id} href={returnLink(`/members/${m.id}`)}>
            <Avatar name={m.name} id={m.id} />
            <span>{m.name.split(" ")[0]}</span>
          </Link>
        ))}
      </div>
      <Panel>
        <div className="table-tools">
          <div className="search-field">
            <Search size={16} />
            <Input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              placeholder="Search members by name or ID…"
              aria-label="Search directory"
            />
          </div>
          <SelectField
            label="Provider"
            value={provider}
            onChange={(v) => {
              setProvider(v);
              setPage(1);
            }}
            options={[
              { value: "", label: "All providers" },
              ...data.providers.map((p) => ({ value: p.id, label: p.name })),
            ]}
          />
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Member</th>
                <th>Plan & provider</th>
                <th>Member county</th>
                <th>Review context</th>
                <th>Status</th>
                <th>Next visit</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {result.data?.items.map((m) => (
                <tr
                  key={m.id}
                  className="clickable-row"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter")
                      router.push(returnLink(`/members/${m.id}`));
                  }}
                  onClick={() => router.push(returnLink(`/members/${m.id}`))}
                >
                  <td>
                    <div className="person-cell">
                      <Avatar name={m.name} id={m.id} />
                      <span>
                        <strong>{m.name}</strong>
                        <small>
                          {m.id} · {m.age} years · {m.sex}
                        </small>
                      </span>
                    </div>
                  </td>
                  <td>
                    <strong>{m.provider}</strong>
                    <small>{m.plan}</small>
                  </td>
                  <td>{m.county}<small>{m.city}{m.state ? `, ${m.state}` : ""}</small></td>
                  <td>{m.condition}</td>
                  <td>
                    <Status value={m.status} />
                  </td>
                  <td>{m.next_visit || "Not scheduled"}</td>
                  <td>
                    <ArrowUpRight size={15} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {result.isPending && (
          <div className="inline-loading">
            <LoaderCircle className="animate-spin" size={18} />
            Loading members…
          </div>
        )}
        {result.isError && (
          <Empty
            title="Could not load members"
            description={result.error.message}
          />
        )}
        {result.data && !result.data.items.length && <Empty />}
        <div className="table-footer">
          <span>{num(result.data?.total || 0)} members</span>
          <div>
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
            >
              Previous
            </Button>
            <span>Page {page}</span>
            <Button
              variant="outline"
              size="sm"
              disabled={page * 25 >= (result.data?.total || 0)}
              onClick={() => setPage(page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      </Panel>
    </>
  );
}
function MemberWorkspace({
  id,
  user,
  data,
  act,
  review = false,
}: WorkspaceProps & { id: string; review?: boolean }) {
  const params = useSearchParams();
  const [tab, setTab] = useUrlState("tab", "Risk profile");
  const risk = useRiskContext();
  const [findingId, setFindingId] = useUrlState("finding", "");
  const [docId, setDocId] = useUrlState("document", "");
  const [zoom, setZoom] = useState(100);
  const [decision, setDecision] = useDraft(`review-${id}-${findingId || "single"}-decision`, "");
  const [note, setNote] = useDraft(`review-${id}-${findingId || "single"}-note`, "");
  const [closingTask, setClosingTask] = useState<Task | null>(null);
  const [closure, setClosure] = useState("unable_to_obtain");
  const [closureNote, setClosureNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [queryOpen, setQueryOpen] = useState(false);
  const [draft, setDraft] = useDraft(
    `query-${id}-${findingId || "single"}`,
    "Please review the available history and document your current clinical assessment, including if this condition is not supported.",
  );
  const result = useQuery({
    queryKey: ["member", id, user.id, findingId],
    queryFn: () => api<Member>(`/members/${id}${findingId ? `?finding=${encodeURIComponent(findingId)}` : ""}`),
  });
  const m = result.data;
  const o = m?.opportunities?.find((item) => item.id === m.selected_finding_id) || (m?.opportunities?.length === 1 ? m.opportunities[0] : undefined);
  const [qaNote, setQaNote] = useDraft(`qa-${id}-${o?.id || findingId || "single"}-${o?.current_decision_id || "no-decision"}-note`, "");
  const currentSourceIds = m?.eligibility?.source_ids || o?.eligibility?.source_ids || [];
  const doc = m?.documents?.find((d) => d.id === docId)
    || m?.documents?.find((d) => currentSourceIds.includes(d.id))
    || m?.documents?.[0];
  useEffect(() => {
    if (!note) return;
    const prevent = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", prevent);
    return () => window.removeEventListener("beforeunload", prevent);
  }, [note]);
  useEffect(() => {
    if (o?.review_state === "paused") {
      setNote(o.draft_note || "");
      setDecision(o.draft_decision || "");
    }
  }, [o?.id, o?.draft_note, o?.draft_decision, o?.review_state]);
  const save = async () => {
    setBusy(true);
    try {
      await act({ action: "review", id, finding_id: o?.id, value: decision, note });
      setNote("");
      setDecision("");
      await result.refetch();
    } catch {
    } finally {
      setBusy(false);
    }
  };
  if (result.isPending)
    return (
      <div className="inline-loading">
        <LoaderCircle className="animate-spin" />
        Opening member record…
      </div>
    );
  if (!m)
    return (
      <Empty title="Member unavailable" description={result.error?.message} />
    );
  return (
    <>
      <div className="back-link">
        <Link
          href={safeReturn(
            params?.get("returnTo"),
            review ? "/reviews" : "/members",
          )}
        >
          <ArrowLeft size={14} />
          Back to {review ? "review queue" : "members"}
        </Link>
        <span>{m.id}</span>
      </div>
      <div className="member-heading">
        <Avatar name={m.name} id={id} size="large" />
        <div>
          <h1>{m.name}</h1>
          <p>
            {m.id} <span>·</span> {m.age} years <span>·</span> {m.sex}{" "}
            <span>·</span> {m.plan}
          </p>
        </div>
        <div className="page-actions">
          {can(user, "query") && m.eligibility?.reviewable && (
            <Button variant="outline" onClick={() => setQueryOpen(true)}>
              <Send size={15} />
              Create clarification task
            </Button>
          )}
          {can(user, "analyze") && m.eligibility?.reviewable && (
            <Button
              onClick={() =>
                actionSafe(act, { action: "analyze", member_ids: [id], finding_ids: o ? [o.id] : undefined })
              }
            >
              <Sparkles size={16} />
              Refresh analysis
            </Button>
          )}
        </div>
      </div>
      <div className="member-context">
        <span>
          <Building2 size={14} />
          {m.provider}
        </span>
        <span>{m.county}{m.state ? ` · ${m.state}` : ""}</span>
        <span>
          <CalendarDays size={14} />
          Next visit: {m.next_visit || "Not scheduled"}
        </span>
        <span>
          <ShieldCheck size={14} />
          Clinical workflow · {data.program_context?.program || "MA"} · {data.program_context?.payment_year || 2027}
        </span>
        <Status value={o?.status || m.status} />
        {m.scenario && <span title="Scenario dates are staged; saved actions retain their actual timestamps.">Scenario date: {m.scenario.date}</span>}
      </div>
      {(m.opportunities?.length || 0) > 1 && <div className="risk-finding-select"><SelectField label="Clinical finding" value={o?.id || ""} onChange={setFindingId} options={[{ value: "", label: "Select a finding for clinical actions" }, ...(m.opportunities || []).map((item) => ({ value: item.id, label: `${item.condition} · ${item.id}` }))]} /></div>}
      {!m.eligibility?.reviewable && <EligibilityContext eligibility={m.eligibility} />}
      <Tabs value={tab} onValueChange={setTab} className="member-tabs">
        <TabsList>
          {[
            "Risk profile",
            "Scoring inputs",
            "Source analysis",
            "Overview",
            "Evidence & documents",
            "Opportunities",
            "Timeline",
            "Tasks",
            "Risk scenarios",
            "Score reconciliation",
            "Submissions",
          ].map((t) => (
            <TabsTrigger key={t} value={t}>
              {t}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      {tab === "Risk profile" ? <MemberRiskProfile memberId={id} user={user} /> : tab === "Source analysis" ? <RiskSourceAnalysis memberId={id} user={user} /> : tab === "Scoring inputs" ? <RiskInputSnapshot memberId={id} user={user} /> : ["Overview", "Evidence & documents"].includes(tab) ? (
        <>
          {tab === "Overview" && (
            <div className="member-summary">
              <span className="insight-title">
                <Sparkles size={16} />
                Current summary <span>PREPARED ANALYSIS</span>
              </span>
              <PreparedClaims claims={m.claims} summary={m.summary} />
              <div>
                <Status value={o?.evidence || m.evidence} />
                <span>
                  Current and historical sources are shown separately.
                </span>
              </div>
            </div>
          )}
          <div
            className={`review-layout ${!can(user, "review") ? "read-only" : ""}`}
          >
            <SourceDocument
              documents={m.documents || []}
              selected={doc}
              onSelect={setDocId}
              onInspect={() =>
                actionSafe(act, {
                  action: "open_evidence",
                  id,
                  finding_id: o?.id,
                  document_id: doc?.id,
                  note: `Inspected ${doc?.id}`,
                })
              }
            />
            <div className="review-side">
              <Panel
                title={
                  can(user, "review") ? "Reviewer decision" : "Review context"
                }
                subtitle={
                  o
                    ? `Finding ${o.id} · Recommendation ${o.recommendation_version || 1}`
                    : "Member context"
                }
              >
                <div className="review-form">
                  <div className="finding-title">
                    <span>REVIEW OPPORTUNITY</span>
                    <h3>{m.condition}</h3>
                    <Status value={o?.evidence || m.evidence} />
                  </div>
                  <EligibilityContext eligibility={m.eligibility} />
                  {can(user, "review") && m.eligibility?.reviewable ? (
                    <>
                      <div className="decision-options">
                        {[
                          [
                            "resolved_supported",
                            "Supported by evidence",
                            "Current documentation supports this review.",
                          ],
                          [
                            "resolved_unsupported",
                            "Not supported",
                            "Retain the reviewed context and reason.",
                          ],
                          [
                            "awaiting_assessment",
                            "Needs clarification",
                            "Request current assessment or evidence.",
                          ],
                        ].map(([value, title, desc]) => (
                          <label
                            key={value}
                            className={decision === value ? "selected" : ""}
                          >
                            <input
                              type="radio"
                              name="decision"
                              value={value}
                              checked={decision === value}
                              disabled={!m.eligibility?.allowed_decisions.includes(value)}
                              onChange={() => setDecision(value)}
                            />
                            <span>
                              <strong>{title}</strong>
                              <small>{desc}</small>
                            </span>
                          </label>
                        ))}
                      </div>
                      <div className="form-field">
                        <Label htmlFor="reason">Review rationale</Label>
                        <textarea
                          id="reason"
                          value={note}
                          onChange={(e) => setNote(e.target.value)}
                          placeholder="Explain the decision using the reviewed source…"
                          rows={4}
                        />
                      </div>
                      <p className="assessment-review-state">{note.trim() || decision ? "Unsaved decision" : o?.current_decision_id ? `Saved decision ${o.current_decision_id}` : "No decision saved"}</p>
                      <Button
                        className="w-full"
                        disabled={
                          !decision ||
                          !note.trim() ||
                          busy ||
                          !m.eligibility?.allowed_decisions.includes(decision)
                        }
                        onClick={save}
                      >
                        {busy ? (
                          <LoaderCircle size={15} className="animate-spin" />
                        ) : (
                          <Check size={15} />
                        )}
                        Save review & send to QA
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={!note.trim()}
                        onClick={async () => {
                          try {
                            await act({
                              action: "complete_review",
                              id,
                              finding_id: o?.id,
                              value: "no_finding",
                              note,
                            });
                            setNote("");
                          } catch {}
                        }}
                      >
                        Complete without a supported finding
                      </Button>
                      <div className="button-row">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            actionSafe(act, {
                              action:
                                o?.review_state === "paused"
                                  ? "start_review"
                                  : "pause_review",
                              value: decision,
                              id,
                              finding_id: o?.id,
                              note,
                            })
                          }
                        >
                          {o?.review_state === "paused"
                            ? "Resume review"
                            : "Pause & save draft"}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            actionSafe(act, {
                              action: "defer",
                              id,
                              finding_id: o?.id,
                              note: "Deferred for documentation",
                            })
                          }
                        >
                          Defer
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="definition-list">
                      <div>
                        <span>Opportunity type</span>
                        <strong>{label(o?.type || m.opportunity_type)}</strong>
                      </div>
                      <div>
                        <span>Priority</span>
                        <strong>{o?.priority || m.priority}</strong>
                      </div>
                      <div>
                        <span>Owner</span>
                        <strong>{o?.owner || "Review team"}</strong>
                      </div>
                      <div>
                        <span>Source-through date</span>
                        <strong>{m.service_date}</strong>
                      </div>
                    </div>
                  )}
                  {o?.qa_note && (
                    <div className="assessment-context"><strong>QA feedback</strong><p>{o.qa_note}</p></div>
                  )}
                  {o?.qa_status && (
                    <div className="badge-row">
                      <span>QA outcome</span>
                      <Status value={o.qa_status} />
                    </div>
                  )}
                  {o?.decision_note && (
                    <div className="saved-decision">
                      <CheckCircle2 size={16} />
                      <span>
                        <strong>Saved review</strong>
                        {o.decision_note}
                      </span>
                    </div>
                  )}
                  {can(user, "qa") && (
                    <div className="qa-actions">
                      <Notice>
                        {o?.reviewer === user.id || o?.reviewer === user.email
                          ? "A different reviewer must perform independent QA."
                          : o?.qa_status !== "awaiting_qa"
                            ? "A completed review must be sent to QA first."
                            : "Independent QA preserves the first reviewer’s decision and history."}
                      </Notice>
                      <div className="form-field"><Label htmlFor="member-qa-note">QA rationale · required</Label><textarea id="member-qa-note" rows={3} value={qaNote} onChange={(e) => setQaNote(e.target.value)} placeholder="Explain your independent assessment of the source and decision…" /></div>
                      <Button
                        disabled={
                          !qaNote.trim() ||
                          o?.qa_status !== "awaiting_qa" ||
                          o?.reviewer === user.id ||
                          o?.reviewer === user.email
                        }
                        onClick={() =>
                          act({ action: "qa", id, finding_id: o?.id, decision_id: o?.current_decision_id, value: "passed", note: qaNote }).then(() => setQaNote("")).catch(() => undefined)
                        }
                      >
                        <ShieldCheck size={15} />
                        Pass QA
                      </Button>
                      <Button
                        variant="outline"
                        disabled={
                          !qaNote.trim() ||
                          o?.qa_status !== "awaiting_qa" ||
                          o?.reviewer === user.id ||
                          o?.reviewer === user.email
                        }
                        onClick={() =>
                          act({
                            action: "qa",
                            id,
                            finding_id: o?.id,
                            decision_id: o?.current_decision_id,
                            value: "rework",
                            note: qaNote,
                          }).then(() => setQaNote("")).catch(() => undefined)
                        }
                      >
                        Return for rework
                      </Button>
                    </div>
                  )}
                </div>
              </Panel>
              {!!m.next_steps?.length && <Panel title="Next step"><NextSteps steps={m.next_steps} assignments={data.assignment_options} user={user} memberId={id} findingId={o?.id} act={act} /></Panel>}
              <Panel title="Connected work">
                <div className="connected-links">
                  {user.screens.includes("previsit") && (
                    <Link href={`/previsit?member=${id}`}>
                      <CalendarDays size={16} />
                      Provider assessment
                      <ArrowRight size={14} />
                    </Link>
                  )}
                  {user.screens.includes("submissions") && (
                    <Link href={`/submissions?member=${id}`}>
                      <Send size={16} />
                      Submission operations
                      <ArrowRight size={14} />
                    </Link>
                  )}
                  {user.screens.includes("scenarios") && (
                    <Link href={`/scenarios?member=${id}`}>
                      <Layers3 size={16} />
                      Risk scenarios
                      <ArrowRight size={14} />
                    </Link>
                  )}
                  <button onClick={() => setTab("Timeline")}>
                    <Clock3 size={16} />
                    Decision history
                    <ArrowRight size={14} />
                  </button>
                </div>
              </Panel>
            </div>
          </div>
        </>
      ) : tab === "Timeline" ? (
        <>
        <Panel title="Recommendation and decision history" subtitle="Previous evidence, review and independent QA snapshots are retained."><CaseHistory opportunity={o} /></Panel>
        <Panel
          title="Member timeline"
          subtitle="Actual saved actions and source context"
        >
          <div className="timeline padded">
            {m.history?.length ? (
              m.history.map((e) => (
                <div key={e.id}>
                  <span className="timeline-icon">
                    <Check size={13} />
                  </span>
                  <strong>{label(e.action)}</strong>
                  <p>{e.detail}</p>
                  <small>
                    {label(e.actor.split("@")[0].replace(/\.demo$/, ""))} ·{" "}
                    {new Date(e.created_at).toLocaleString()}
                  </small>
                </div>
              ))
            ) : (
              <>
                <div>
                  <span className="timeline-icon">
                    <FileText size={13} />
                  </span>
                  <strong>Current source received</strong>
                  <PreparedClaims claims={m.claims} summary={m.summary} />
                  <small>{m.service_date}</small>
                </div>
                <div>
                  <span className="timeline-icon">
                    <Sparkles size={13} />
                  </span>
                  <strong>Precomputed analysis available</strong>
                  <p>Open the source evidence and review the next action.</p>
                  <small>September 12, 2026</small>
                </div>
              </>
            )}
          </div>
        </Panel>
        </>
      ) : tab === "Tasks" ? (
        <Panel title="Member tasks">
          {m.tasks?.length ? (
            <DataGrid
              rows={m.tasks}
              columns={[
                { accessorKey: "title", header: "Task" },
                { accessorKey: "type", header: "Type", cell: ({ getValue }) => label(String(getValue())) },
                { accessorKey: "owner", header: "Owner" },
                { id: "closure", header: "Disposition", cell: ({ row }) => row.original.closure_reason ? <span>{label(row.original.closure_disposition || "closed")}<small>{row.original.closure_reason}</small></span> : user.permissions.includes("close_task") && !row.original.completion?.complete && (["query", "request_evidence"].includes(row.original.type) || ["pre_visit", "source_remediation"].includes(row.original.intervention || "")) ? <Button variant="ghost" size="sm" onClick={() => setClosingTask(row.original)}>Close with reason</Button> : "—" },
                { id: "completion", header: "Completion basis", cell: ({ row }) => row.original.completion?.reason || "Awaiting workflow outcome" },
                {
                  accessorKey: "status",
                  header: "Status",
                  cell: ({ getValue }) => <Status value={String(getValue())} />,
                },
              ]}
            />
          ) : (
            <Empty
              title="No new tasks"
              description="Create a clarification or evidence request to add work for this member."
            />
          )}
        </Panel>
      ) : tab === "Opportunities" ? (
        <Panel title="Linked opportunities">
          <DataGrid
            rows={m.opportunities || []}
            onRow={(finding) => { setFindingId(finding.id); setTab("Overview"); }}
            columns={[
              { accessorKey: "condition", header: "Condition" },
              { accessorKey: "type", header: "Type" },
              {
                accessorKey: "status",
                header: "Status",
                cell: ({ getValue }) => <Status value={String(getValue())} />,
              },
            ]}
          />
        </Panel>
      ) : tab === "Score reconciliation" ? <RiskReconciliation memberId={id} user={user} /> : tab === "Risk scenarios" ? (
        <Panel title="Complete-member scenario comparison" subtitle="Inspect retained inputs and the effect of changing the complete condition set.">
          <div className="padded"><p className="body-copy">The model lab calculates hypothetical coding changes separately from clinical approval, submitted records and reported outcomes.</p>
          {user.screens.includes("scenarios") && <Button asChild variant="outline"><Link href={risk.href(`/scenarios?member=${id}`)}>Open RAF & model lab<ArrowRight size={15} /></Link></Button>}</div>
        </Panel>
      ) : (
        <Panel title="Linked submission records" subtitle="Receiver outcomes are separate from review approval and payment reconciliation.">
          {m.submissions?.length ? <DataGrid rows={m.submissions} columns={[{ accessorKey: "id", header: "Record" }, { accessorKey: "type", header: "Operation" }, { accessorKey: "decision_id", header: "Approved decision" }, { accessorKey: "status", header: "Receiver status", cell: ({ getValue }) => <Status value={String(getValue())} /> }]} /> : <Empty title="No linked submission yet" description="An independently approved eligible decision can be prepared in Submission operations." />}
          <div className="padded">{user.screens.includes("submissions") ? <Button asChild variant="outline"><Link href={`/submissions?member=${id}`}>Open submission operations<ArrowRight size={15} /></Link></Button> : <p className="body-copy">A submission analyst continues after independent QA approval.</p>}</div>
        </Panel>
      )}
      <Modal open={!!closingTask} onOpenChange={(open) => !open && setClosingTask(null)} title="Close follow-up task" description={closingTask?.title}>
        <div className="form-field"><Label>Disposition</Label><select value={closure} onChange={(event) => setClosure(event.target.value)}><option value="unable_to_obtain">Unable to obtain</option><option value="not_supported">Not supported</option><option value="not_current">Not current</option></select></div>
        <div className="form-field"><Label>Reason</Label><textarea rows={4} value={closureNote} onChange={(event) => setClosureNote(event.target.value)} /></div>
        <p className="body-copy">This closes the selected follow-up task. Source publication and clinical decisions retain their own gates.</p>
        <Button disabled={busy || !closureNote.trim() || !closingTask} onClick={async () => { setBusy(true); try { await act({ action: "close_task", id, task_id: closingTask!.id, value: closure, note: closureNote }); setClosingTask(null); setClosureNote(""); await result.refetch(); } catch {} finally { setBusy(false); } }}>Save closure</Button>
      </Modal>
      <Modal
        open={queryOpen}
        onOpenChange={setQueryOpen}
        title="Create a clinical clarification task"
        description={`${m.name} · Query draft`}
      >
        <div className="assessment-context"><strong>Evidence context</strong><p>{m.summary}</p><p>Record a current assessment, a non-supporting finding or uncertainty. No diagnosis is presumed by this request.</p></div>
        <div className="form-field">
          <Label htmlFor="draft">Query draft</Label>
          <textarea
            id="draft"
            rows={5}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
        </div>
        <Notice>
          A provider response does not automatically approve a diagnosis.
          Returned documentation goes through a fresh review.
        </Notice>
        <Button
          disabled={!draft.trim()}
          onClick={async () => {
            try {
              await act({ action: "query", id, finding_id: o?.id, note: draft });
              setQueryOpen(false);
            } catch {}
          }}
        >
          <Send size={15} />
          Create task
        </Button>
      </Modal>
    </>
  );
}
function Providers({ data, user, route, act }: WorkspaceProps) {
  const [detail, setDetail] = useState<Provider | null>(null);
  const [chosen, setChosen] = useUrlState("member", data.members[0]?.id || "");
  const [taskId, setTaskId] = useUrlState("task", "");
  const [providerSearch, setProviderSearch] = useUrlState("q", "");
  const [memberSearch, setMemberSearch] = useUrlState("member_q", "");
  const directory = useQuery({
    queryKey: ["previsit-members", user.id, memberSearch],
    queryFn: () =>
      api<{ items: Member[]; total: number }>(
        `/members?size=100&q=${encodeURIComponent(memberSearch)}`,
      ),
    enabled: route === "previsit",
  });
  const chosenRecord = useQuery({
    queryKey: ["member", chosen, user.id],
    queryFn: () => api<Member>(`/members/${chosen}`),
    enabled: route === "previsit" && !!chosen,
  });
  const [response, setResponse] = useDraft(
    `provider-${chosen}-response`,
    "needs_information",
  );
  const [note, setNote] = useDraft(`provider-${chosen}-note`, "");
  const [busy, setBusy] = useState(false);
  const m =
    chosenRecord.data ||
    data.members.find((m) => m.id === chosen) ||
    data.members[0];
  const responseTasks = (m?.tasks || []).filter((task) => (["query", "provider_response", "pre_visit"].includes(task.type) || task.intervention === "pre_visit") && !["closed", "completed", "responded"].includes(task.status));
  const responseTask = responseTasks.find((task) => task.id === taskId) || (responseTasks.length === 1 ? responseTasks[0] : undefined);
  if (route === "previsit" && chosenRecord.isError)
    return (
      <Empty
        title="Member unavailable"
        description={chosenRecord.error.message}
      />
    );
  if (route === "previsit")
    return (
      <>
        <PageHeader
          eyebrow="PROVIDER WORKSPACE"
          title="Pre-visit review"
          description="Relevant context. Neutral questions. A clear next step."
        />
        <div className="previsit-layout">
          <Panel title="Upcoming member reviews">
            <div className="previsit-list">
              <Input
                aria-label="Search upcoming members"
                placeholder="Search your practice members…"
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
              />
              <small>
                {directory.data?.total || 0} matching members · showing up to
                100
              </small>
              {(directory.data?.items || data.members).map((member) => (
                <button
                  key={member.id}
                  className={member.id === m?.id ? "active" : ""}
                  onClick={() => setChosen(member.id)}
                >
                  <Avatar name={member.name} id={member.id} />
                  <span>
                    <strong>{member.name}</strong>
                    <small>{member.next_visit || "Visit not scheduled"}</small>
                  </span>
                  <ChevronRight size={15} />
                </button>
              ))}
            </div>
          </Panel>
          {m && (
            <Panel title={m.name} subtitle={`${m.id} · ${m.provider}`}>
              <div className="padded">
                <div className="insight-card">
                  <span>
                    <FileText size={15} />
                    Relevant history
                  </span>
                  <p>{m.summary}</p>
                </div>
                <EligibilityContext eligibility={m.eligibility} />
                <div className="form-field"><Label>Response task</Label><select aria-label="Provider response task" value={responseTask?.id || ""} onChange={(e) => setTaskId(e.target.value)}><option value="">{responseTasks.length ? "Choose the task to respond to" : "No pending provider task"}</option>{responseTasks.map((task) => <option key={task.id} value={task.id}>{task.title} · {task.id}</option>)}</select></div><h3 className="section-title">Question for this encounter</h3>
                <p className="body-copy">
                  Please review the available context for{" "}
                  {m.condition.toLowerCase()} and document your current
                  assessment. A negative assessment or need for more information
                  is a valid outcome.
                </p>
                <div className="decision-options">
                  {[
                    ["supported", "Supported in current assessment"],
                    ["not_supported", "Not supported"],
                    ["needs_information", "Needs more information"],
                    ["deferred", "Deferred"],
                  ].map(([v, title]) => (
                    <label key={v} className={response === v ? "selected" : ""}>
                      <input
                        type="radio"
                        name="response"
                        checked={response === v}
                        onChange={() => setResponse(v)}
                      />
                      <span>
                        <strong>{title}</strong>
                      </span>
                    </label>
                  ))}
                </div>
                <div className="form-field">
                  <Label htmlFor="provider-note">Response note</Label>
                  <textarea
                    id="provider-note"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={3}
                    placeholder="Add context for the review team…"
                  />
                </div>
                <div className="button-row">
                  <Button
                    disabled={busy || !responseTask || !note.trim()}
                    onClick={async () => {
                      setBusy(true);
                      try {
                        await act({
                          action: "respond",
                          id: m.id,
                          task_id: responseTask?.id,
                          finding_id: responseTask?.finding_id,
                          value: response,
                          note,
                        });
                      } catch {
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    <Check size={15} />
                    Save response
                  </Button>
                </div>
                {!!m.next_steps?.length && <NextSteps steps={m.next_steps} assignments={data.assignment_options} user={user} memberId={m.id} act={act} />}
                {m.provider_response && (
                  <div className="saved-decision">
                    <CheckCircle2 size={16} />
                    Saved response: {label(m.provider_response)}
                  </div>
                )}
                <Notice>
                  Responses are recorded locally. A response and encounter
                  documentation are separate; coding requires a new review.
                </Notice>
              </div>
            </Panel>
          )}
        </div>
      </>
    );
  return (
    <>
      <PageHeader
        title="Provider portfolio"
        description="A shared view of practices, documentation and open work."
      />
      <Panel>
        <DataGrid
          rows={data.providers.map((p) => ({
            ...p,
            work_items: data.opportunities.filter((o) => o.provider === p.name)
              .length,
          }))}
          searchLabel="Search practices, counties or contacts…"
          onRow={setDetail}
          columns={[
            {
              accessorKey: "name",
              header: "Practice",
              cell: ({ row }) => (
                <>
                  <strong>{row.original.name}</strong>
                  <small>{row.original.id}</small>
                </>
              ),
            },
            { accessorKey: "city", header: "City" },
            { accessorKey: "county", header: "County" },
            {
              accessorKey: "response_days",
              header: "Response turnaround",
              cell: ({ getValue }) => `${getValue()} days`,
            },
            { accessorKey: "work_items", header: "Work items" },
            { accessorKey: "contact", header: "Contact" },
          ]}
        />
      </Panel>
      <Drawer
        open={!!detail}
        onOpenChange={(v) => !v && setDetail(null)}
        title={detail?.name || "Practice"}
        description="Practice details"
      >
        {detail && (
          <>
            <div className="definition-list">
              <div>
                <span>Site ID</span>
                <strong>{detail.id}</strong>
              </div>
              <div>
                <span>County</span>
                <strong>{detail.county}</strong>
              </div>
              <div>
                <span>Practice contact</span>
                <strong>{detail.contact}</strong>
              </div>
            </div>
            <h3 className="section-title">Selected member records</h3>
            <div className="linked-members">
              {data.members
                .filter((m) => m.provider_id === detail.id)
                .map((m) => (
                  <Link key={m.id} href={`/members/${m.id}`}>
                    {m.name}
                    <ArrowUpRight size={14} />
                  </Link>
                ))}
            </div>
            <Notice>
              No external message is sent. Open a member to create a neutral
              clarification task.
            </Notice>
            <Button variant="outline" asChild>
              <Link href={`/members?provider=${detail.id}`}>
                View practice members
                <ArrowRight size={15} />
              </Link>
            </Button>
          </>
        )}
      </Drawer>
    </>
  );
}
function Scenarios({ data, user }: WorkspaceProps) {
  const [id, setId] = useUrlState("member", "MB-000005");
  const detail = useQuery({ queryKey: ["member", id, user.id], queryFn: () => api<Member>(`/members/${id}`) });
  const member = detail.data || data.members.find((m) => m.id === id);
  const scenario = data.scenarios?.find((item) => item.member_id === id);
  return <>
    <PageHeader title="Risk score scenarios" description="Inspect the full-member inputs and the assumptions behind a combined comparison." />
    <div className="scenario-context">
      <Select value={id} onValueChange={setId}><SelectTrigger aria-label="Scenario member"><SelectValue /></SelectTrigger><SelectContent>{(member && !data.members.some((m) => m.id === member.id) ? [member, ...data.members.filter((m) => m.showcase)] : data.members.filter((m) => m.showcase)).map((m) => <SelectItem key={m.id} value={m.id}>{m.name} · {m.id}</SelectItem>)}</SelectContent></Select>
      <span>{data.program_context?.program} · Payment {data.program_context?.payment_year}</span>
      <span>{scenario ? scenario.basis : "Scenario not configured"}</span>
    </div>
    {!scenario ? <Panel title="No prepared comparison for this member"><Empty title="Scoring configuration required" description="Numeric scores require a configured model, complete inputs and retained reference results. The Casey comparison explains the input and hierarchy approach." /><div className="padded"><Button variant="outline" onClick={() => setId("MB-000005")}>Open Casey comparison<ArrowRight size={15} /></Button></div></Panel> : <>
      <div className="metric-grid three">
        <Metric label="Baseline score" value="—" note="Independent numeric reference unavailable" icon={<Layers3 size={18} />} />
        <Metric label="Combined score" value="—" note="Full-member calculation not performed" icon={<ScanLine size={18} />} />
        <Metric label="Payment result" value="—" note="No financial estimate or reconciliation" icon={<ShieldCheck size={18} />} />
      </div>
      <Panel title={`${member?.name || "Casey"} · baseline and combined inputs`} subtitle={`${scenario.id} · ${scenario.basis}`}>
        <div className="table-scroll"><table className="assessment-inputs"><thead><tr><th>Input</th><th>Baseline</th><th>Combined scenario</th></tr></thead><tbody>
          <tr><td>Retained condition set</td><td><ul>{scenario.baseline_inputs.map((input) => <li key={input}>{input}</li>)}</ul></td><td><ul>{scenario.combined_inputs.map((input) => <li key={input}>{input}</li>)}</ul></td></tr>
          <tr><td>Demographic context</td><td>{scenario.demographics.age} years · {scenario.demographics.sex}</td><td>Unchanged</td></tr>
          <tr><td>Program / years</td><td>{scenario.program}<br />Service {scenario.service_year} / payment {scenario.payment_year}</td><td>Unchanged</td></tr>
          <tr><td>Model / segment assumption</td><td>{scenario.model}<br />{scenario.segment}</td><td>Same assumed model and segment</td></tr>
          <tr><td>Protected evidence</td><td colSpan={2}>{scenario.source_ids.map((documentId) => <Link key={documentId} href={`/members/${id}?tab=Evidence+%26+documents&document=${documentId}`}>{documentId} · inspect original source<ArrowUpRight size={13} /></Link>)}</td></tr>
        </tbody></table></div>
      </Panel>
      <Panel title="How the comparison would be resolved" subtitle="An input illustration, with no inferred code details or numeric effect.">
        <div className="assessment-history">{scenario.steps.map((step, index) => <article key={step.label}><header><strong>{index + 1}. {step.label}</strong></header><p>{step.detail}</p></article>)}</div>
        <div className="padded"><p className="body-copy">{scenario.limitation}</p></div>
      </Panel>
    </>}
  </>;
}
function Operations({ data, user, route, act, refresh }: WorkspaceProps) {
  const client = useQueryClient();
  const risk = useRiskContext();
  const [tab, setTab] = useState("Users & access");
  const [resetOpen, setResetOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [providerAccount, setProviderAccount] = useState<(User & { active: number }) | null>(null);
  const [providerPractice, setProviderPractice] = useState("");
  const [providerSaving, setProviderSaving] = useState(false);
  const users = useQuery({
    queryKey: ["admin-users"],
    queryFn: () =>
      api<{ users: (User & { active: number })[]; roles: string[] }>(
        "/admin/users",
      ),
    enabled: route === "admin",
  });
  if (route === "data")
    return (
      <>
        <PageHeader
          title="Data operations"
          description="Source freshness and processing activity, in one clear view."
        >
          <Button
            variant="outline"
            onClick={() =>
              actionSafe(act, { action: "retry", id: "sample-import" })
            }
          >
            <RotateCcw size={15} />
            Recheck sources
          </Button>
        </PageHeader>
        <div className="metric-grid three">
          <Metric
            label="Member population"
            value={num(data.population_count)}
            note="Source loaded"
            icon={<Users size={18} />}
          />
          <Metric
            label="Analysis runs"
            value={String(data.runs.filter((r) => ["prepared_analysis", "fixture"].includes(r.mode) && ["succeeded", "completed"].includes(r.status)).length)}
            note="Completed analysis actions"
            icon={<Sparkles size={18} />}
            accent="teal"
          />
          <Metric
            label="Operational events"
            value={String(data.events.length)}
            note="Recent saved activity"
            icon={<Clock3 size={18} />}
            accent="purple"
          />
        </div>
        {data.import_summary && <Panel title={data.import_summary.name} subtitle={`${data.import_summary.id} · ${data.import_summary.total} prepared ${data.import_summary.unit}`}>
          <div className="registry-summary padded">
            <div><strong>{data.import_summary.received} / {data.import_summary.total}</strong><span>documents received</span></div>
            <div><strong>{data.import_summary.matched} / {data.import_summary.received}</strong><span>accepted for processing</span></div>
            <div><strong>{data.import_summary.quarantined}</strong><span>documents quarantined</span></div><div><strong>{data.import_summary.unmatched_pending ?? "—"}</strong><span>unmatched / pending</span></div>
            <div><strong>{data.import_summary.published}</strong><span>usable documents published</span></div>
          </div>
          <DataGrid rows={data.import_summary.rows.map((row) => ({ ...row, id: row.document_id }))} columns={[
            { accessorKey: "title", header: "Prepared source", cell: ({ row }) => <><strong>{row.original.title}</strong><small>{row.original.document_id}</small></> },
            { accessorKey: "requested_member_id", header: "Requested member" },
            { accessorKey: "status", header: "Intake state", cell: ({ getValue }) => <Status value={String(getValue())} /> },
            { accessorKey: "reason", header: "Validation context" },
            { id: "next", header: "Next step", cell: ({ row }) => user.screens.includes("intake") ? <Link href={`${row.original.href}&returnTo=${encodeURIComponent("/data")}`}>Inspect intake<ArrowUpRight size={13} /></Link> : <span>Retrieval coordinator</span> },
          ]} />
          <div className="padded"><p className="body-copy">{data.import_summary.basis} Counts refer to the prepared batch above, separate from the {num(data.population_count)}-member population.</p></div>
        </Panel>}
        <Panel title="Source inventory" subtitle="Connected sources">
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Source</th>
                  <th>Coverage</th>
                  <th>Data through</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {[
                  [
                    "Enrollment & attribution",
                    `${num(data.population_count)} members`,
                  ],
                  ["Clinical evidence", "Detailed clinical records"],
                  ["AI comparison", "200 frozen evaluation charts"],
                  ["Receiver responses", "Receiver response records"],
                ].map(([name, count]) => (
                  <tr key={name}>
                    <td>
                      <strong>{name}</strong>
                    </td>
                    <td>{count}</td>
                    <td>{data.program_context?.scenario_date || "2026-09-12"} · staged basis</td>
                    <td>
                      <Status
                        value={name === "Clinical evidence" ? ((data.import_summary?.quarantined || 0) > 0 ? "needs_attention" : "prepared_sources") : name === "Receiver responses" ? "simulated_receiver" : "reference_loaded"}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
        <Panel
          title="Source issues"
          subtitle="Original records remain intact while the issue is resolved."
        >
          <div className="padded">
            {data.issues?.length ? (
              data.issues.map((issue) => (
                <div className="issue-card" key={issue.id}>
                  <div className="badge-row">
                    <strong>{issue.title}</strong>
                    <Status value={issue.status} />
                  </div>
                  <p>{issue.reason}</p>
                  <div className="button-row">
                    <Button variant="outline" size="sm" asChild>
                      <Link
                        href={`/members/${issue.member_id}?tab=Evidence+%26+documents`}
                      >
                        Inspect source
                      </Link>
                    </Button>
                    {user.screens.includes("intake") && (
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/intake?sample=${issue.id}&member=${issue.member_id}&returnTo=${encodeURIComponent("/data")}`}>
                          Open intake document
                        </Link>
                      </Button>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <Empty
                title="No source issues"
                description="No source issues require attention."
              />
            )}
          </div>
        </Panel>
        <Panel title="Processing and validation history">
          {data.runs.length ? (
            <DataGrid
              rows={data.runs}
              columns={[
                { accessorKey: "id", header: "Run" },
                {
                  accessorKey: "mode",
                  header: "Analysis",
                  cell: ({ getValue }) =>
                    getValue() === "fixture"
                      ? "Evidence analysis"
                      : label(String(getValue())),
                },
                { accessorKey: "members", header: "Members" },
                {
                  accessorKey: "status",
                  header: "Status",
                  cell: ({ getValue }) => <Status value={String(getValue())} />,
                },
                { accessorKey: "created_at", header: "Executed at" },
              ]}
            />
          ) : (
            <Empty
              title="No analysis runs this session"
              description="A risk analyst can run a precomputed analysis from Suspect Registry."
            />
          )}
        </Panel>
      </>
    );
  return (
    <>
      <PageHeader
        title="Administration"
        description="Manage access and workspace settings."
      ><Button asChild variant="outline"><Link href="/admin/ai/agents"><Settings size={16} />Agents configuration<ArrowRight size={14} /></Link></Button></PageHeader>
      <Tabs value={tab} onValueChange={setTab} className="member-tabs">
        <TabsList>
          {[
            "Users & access",
            "Program configuration",
            "AI settings",
            "Workspace settings",
          ].map((t) => (
            <TabsTrigger key={t} value={t}>
              {t}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      {tab === "Users & access" ? (
        <Panel
          title="Workspace accounts"
          subtitle="Manage roles and account access. Changes sign the account out of active sessions."
        >
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Account state</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {users.data?.users.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div className="person-cell">
                        <Avatar name={u.name} />
                        <span>
                          <strong>{u.name}</strong>
                          <small>{u.email}</small>
                        </span>
                      </div>
                    </td>
                    <td>
                      <select
                        className="role-select"
                        aria-label={`${u.name} role`}
                        value={u.role}
                        disabled={u.id === user.id}
                        onChange={async (event) => {
                          const role = event.target.value;
                          if (role === "provider" && u.role !== "provider") {
                            setProviderPractice("");
                            setProviderAccount(u);
                            return;
                          }
                          try {
                            await api(
                              `/admin/users/${u.id}`,
                              {
                                method: "PATCH",
                                body: JSON.stringify({
                                  role,
                                  active: !!u.active,
                                }),
                              },
                              user.csrf_token,
                            );
                            toast.success("Role updated; sessions revoked.");
                            await client.invalidateQueries({
                              queryKey: ["admin-users"],
                            });
                            await refresh();
                          } catch (e) {
                            toast.error((e as Error).message);
                          }
                        }}
                      >
                        {users.data?.roles.map((r) => (
                          <option key={r} value={r}>{label(r)}</option>
                        ))}
                      </select>
                      {u.role === "provider" && <small>{data.providers.find((practice) => practice.id === u.provider_id)?.name || u.provider_id}</small>}
                    </td>
                    <td>
                      <Status value={u.active ? "active" : "disabled"} />
                    </td>
                    <td>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={u.id === user.id}
                        onClick={async () => {
                          try {
                            await api(
                              `/admin/users/${u.id}`,
                              {
                                method: "PATCH",
                                body: JSON.stringify({
                                  role: u.role,
                                  active: !u.active,
                                }),
                              },
                              user.csrf_token,
                            );
                            await client.invalidateQueries({
                              queryKey: ["admin-users"],
                            });
                            await refresh();
                            toast.success("Account updated.");
                          } catch (e) {
                            toast.error((e as Error).message);
                          }
                        }}
                      >
                        {u.active ? "Disable" : "Enable"}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      ) : tab === "Workspace settings" ? (
        <Panel
          title="Workspace maintenance"
          subtitle="Manage the starting dataset. Accounts and role assignments are preserved."
        >
          <div className="padded">
            <div className="tour-list">
              {data.members.slice(0, 6).map((m, i) => (
                <Link href={`/members/${m.id}`} key={m.id}>
                  <span>0{i + 1}</span>
                  {m.name} · {label(m.opportunity_type)}
                  <ArrowRight size={15} />
                </Link>
              ))}
            </div>
            <div className="reset-block">
              <div>
                <h3>Restore starting state</h3>
                <p>Clear workflow changes and restore the initial dataset.</p>
              </div>
              <Button variant="outline" onClick={() => setResetOpen(true)}>
                <RotateCcw size={15} />
                Reset workspace
              </Button>
            </div>
          </div>
        </Panel>
      ) : tab === "AI settings" ? (
        <Panel title="Agent configuration" subtitle="Choose a model and personalize the settings for each Perform+ agent.">
          <div className="padded"><p className="body-copy">Manage shared provider details, model selections, response settings and saved versions in one place.</p><Button asChild><Link href="/admin/ai/agents">Open Agents configuration<ArrowRight size={15} /></Link></Button></div>
        </Panel>
      ) : (
        <Panel title={tab} subtitle="Program and workspace configuration">
          <div className="padded">
            <div className="definition-list">
              {(tab === "AI settings"
                ? [
                    ["Execution mode", "Prepared findings"],
                    ["Live inference", "Not configured"],
                    ["Reference evaluation", "200 charts · Version 1"],
                    ["External delivery", "Disabled"],
                  ]
                : [
                    ["Program", risk.configuration?.program || "Loading configuration"],
                    ["Service window", `${risk.configuration?.service_start || "Not supplied"} — ${risk.configuration?.service_end || "Not supplied"}`],
                    ["Payment / benefit year", String(risk.configuration?.year || "Not supplied")],
                    ["Reference model pack", risk.configuration?.software_release || "Not supplied"],
                    ["Model readiness", risk.configuration ? label(risk.configuration.status) : "Loading configuration"],
                    [
                      "Source policy",
                      "Signed encounter documentation required",
                    ],
                  ]
              ).map(([k, v]) => (
                <div key={k}>
                  <span>{k}</span>
                  <strong>{v}</strong>
                </div>
              ))}
            </div>
            <Notice>
              Contact your workspace administrator to update program settings.
            </Notice>
          </div>
        </Panel>
      )}
      <Modal
        open={!!providerAccount}
        onOpenChange={(open) => !open && !providerSaving && setProviderAccount(null)}
        title="Assign provider access"
        description={providerAccount ? `${providerAccount.name} · ${providerAccount.email}` : undefined}
      >
        <p className="body-copy">Select the practice whose member records this account can access. The provider role is saved together with this practice.</p>
        <SelectField
          label="Provider practice"
          showLabel
          value={providerPractice}
          onChange={setProviderPractice}
          options={[
            { value: "", label: "Select a practice" },
            ...data.providers.map((practice) => ({ value: practice.id, label: `${practice.name} · ${practice.id}` })),
          ]}
        />
        <p className="assessment-review-state">Unsaved access change · saving signs this account out of its current sessions.</p>
        <div className="button-row">
          <Button variant="outline" disabled={providerSaving} onClick={() => setProviderAccount(null)}>Cancel</Button>
          <Button
            disabled={providerSaving || !providerAccount || !data.providers.some((practice) => practice.id === providerPractice)}
            onClick={async () => {
              if (!providerAccount) return;
              setProviderSaving(true);
              try {
                await api(`/admin/users/${providerAccount.id}`, {
                  method: "PATCH",
                  body: JSON.stringify({ role: "provider", active: !!providerAccount.active, provider_id: providerPractice }),
                }, user.csrf_token);
                await client.invalidateQueries({ queryKey: ["admin-users"] });
                await refresh();
                setProviderAccount(null);
                setProviderPractice("");
                toast.success("Provider access and practice saved; sessions revoked.");
              } catch (error) {
                toast.error((error as Error).message);
              } finally {
                setProviderSaving(false);
              }
            }}
          >
            {providerSaving ? <LoaderCircle className="animate-spin" size={15} /> : <Check size={15} />}
            Save provider access
          </Button>
        </div>
      </Modal>
      <Modal
        open={resetOpen}
        onOpenChange={setResetOpen}
        title="Restore starting state"
        description="This clears workflow changes and restores the initial dataset."
      >
        <Notice>
          Workspace accounts, passwords and roles remain unchanged. The frozen
          AI comparison is preserved.
        </Notice>
        <div className="form-field">
          <Label htmlFor="reset-confirmation">
            Type RESET WORKSPACE to continue
          </Label>
          <Input
            id="reset-confirmation"
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
          />
        </div>
        <Button
          disabled={confirmation !== "RESET WORKSPACE" || busy}
          onClick={async () => {
            setBusy(true);
            try {
              await api(
                "/admin/reset",
                { method: "POST", body: JSON.stringify({ confirmation }) },
                user.csrf_token,
              );
              await refresh();
              client.removeQueries({ queryKey: ["draft"] });
              await client.invalidateQueries();
              setResetOpen(false);
              setConfirmation("");
              toast.success("Workspace restored.");
            } catch (e) {
              toast.error((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? (
            <LoaderCircle className="animate-spin" size={15} />
          ) : (
            <RotateCcw size={15} />
          )}
          Reset workspace
        </Button>
      </Modal>
    </>
  );
}
