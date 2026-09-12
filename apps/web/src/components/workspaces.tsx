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
} from "@/lib/types";
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
import { IntakeWorkspace } from "./intake-workspace";
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
  if (route === "members") return <MemberDirectory {...props} />;
  if (route === "suspects" || route === "reviews" || route === "qa")
    return <Registry {...props} />;
  if (route === "campaigns") return <CampaignPlanner {...props} />;
  if (route === "providers" || route === "previsit")
    return <Providers {...props} />;
  if (route === "chase" || route === "intake")
    return <IntakeWorkspace {...props} />;
  if (route === "submissions" || route === "audit")
    return <Submissions {...props} />;
  if (route === "scenarios") return <Scenarios {...props} />;
  if (route === "admin" || route === "data") return <Operations {...props} />;
  return <Empty title="Workspace not found" />;
}
function Registry({ data, user, route, act }: WorkspaceProps) {
  const router = useRouter();
  const params = useSearchParams();
  const [status, setStatus] = useUrlState("status", "all");
  const [kind, setKind] = useUrlState("kind", "suspects");
  const [savedView, setSavedView] = useUrlState("saved", "all");
  const [analysisDetails, setAnalysisDetails] = useState(false);
  const returnLink = useReturnLink();
  const [priority, setPriority] = useUrlState("priority", "all");
  const [evidence, setEvidence] = useUrlState("evidence", "all");
  const [bulk, setBulk] = useState("");
  const [allocation, setAllocation] = useDraft("bulk-owner", "Coding team");
  const [bulkNote, setBulkNote] = useDraft("bulk-note", "");
  const [selected, setSelected] = useDraft<string[]>(
    `registry-${route}-selected`,
    [],
  );
  const [detail, setDetail] = useState<Opportunity | null>(null);
  const detailRecord = useQuery({
    queryKey: ["member", detail?.member_id, user.id],
    queryFn: () => api<Member>(`/members/${detail?.member_id}`),
    enabled: !!detail,
  });
  const [busy, setBusy] = useState(false);
  const [campaign, setCampaign] = useState(false);
  const [name, setName] = useState("");
  const [intervention, setIntervention] = useState("Retrospective review");
  const rows = data.opportunities.filter(
    (o) =>
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
        (savedView === "active"
          ? ![
              "resolved_supported",
              "resolved_unsupported",
              "suppressed",
            ].includes(o.status)
          : savedView === "assessment"
            ? o.status === "awaiting_assessment"
            : savedView === "ready"
              ? o.evidence === "Strong" &&
                ["new", "in_review"].includes(o.status)
              : !!o.recommendation_history?.some(
                  (h) =>
                    h.summary.includes("encounter") ||
                    h.summary.includes("source"),
                ))) &&
      (status === "all" ||
        (status === "active"
          ? ![
              "resolved_supported",
              "resolved_unsupported",
              "suppressed",
            ].includes(o.status)
          : status === "pending"
            ? ["awaiting_assessment", "awaiting_evidence"].includes(o.status)
            : o.status === status)) &&
      (priority === "all" || o.priority === priority) &&
      (evidence === "all" || o.evidence === evidence) &&
      (route !== "qa" ||
        o.qa_status === "awaiting_qa" ||
        (o.type === "integrity_review" && !o.qa_status)),
  );
  const columns: ColumnDef<Opportunity, unknown>[] = [
    {
      id: "select",
      header: "",
      enableSorting: false,
      cell: ({ row }) => (
        <span onClick={(e) => e.stopPropagation()}>
          <Checkbox
            aria-label={`Select ${row.original.member_id}`}
            checked={selected.includes(row.original.member_id)}
            onCheckedChange={(v) =>
              setSelected((s) =>
                v
                  ? [...s, row.original.member_id]
                  : s.filter((id) => id !== row.original.member_id),
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
          <small>{findingType(row.original.type)}</small>
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
        member_ids: selected,
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
        member_ids: selected,
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
                  data.opportunities.filter((o) =>
                    value === "suspects"
                      ? [
                          "documented_gap",
                          "historical_condition",
                          "predictive_signal",
                          "specificity_query",
                        ].includes(o.type)
                      : value === "all" || o.type === value,
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
      {data.runs.some((r) => r.mode === "fixture") && route === "suspects" && (
        <div className="run-result">
          <span className="subtle-tag">Precomputed demo</span>
          <span>
            {(() => {
              const r = data.runs.find((r) => r.mode === "fixture")!;
              return `${new Date(r.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} · ${r.members} ${r.members === 1 ? "member" : "members"} analyzed`;
            })()}
          </span>
          <button onClick={() => setAnalysisDetails(true)}>
            Analysis details
          </button>
        </div>
      )}
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
        description="Precomputed demo · Source-linked recommendations"
      >
        <div className="definition-list">
          {data.runs
            .filter((r) => r.mode === "fixture")
            .slice(0, 3)
            .map((r) => (
              <div key={r.id}>
                <span>
                  {r.id} · {new Date(r.created_at).toLocaleString()}
                </span>
                <strong>
                  {r.members} {r.members === 1 ? "member" : "members"} ·{" "}
                  {label(r.status)}
                </strong>
                <p>{r.stages.join(" → ")}</p>
              </div>
            ))}
        </div>
        <p className="body-copy">
          This run loads prepared findings and preserves recommendation
          versions. Review cited source evidence before deciding.
        </p>
      </Modal>
      {selected.length > 0 && (
        <div className="selection-bar">
          <strong>
            {selected.length} {selected.length === 1 ? "member" : "members"}{" "}
            selected ·{" "}
            {
              selected.filter((id) => !rows.some((o) => o.member_id === id))
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
      <Panel>
        <DataGrid
          rows={rows}
          columns={columns}
          onRow={(o) => setDetail(o)}
          searchLabel="Search members, conditions or owners…"
          pageSize={25}
          selectedIds={data.opportunities
            .filter((o) => selected.includes(o.member_id))
            .map((o) => o.id)}
          toolbar={
            <>
              <SelectField
                label="Saved view"
                value={savedView}
                onChange={setSavedView}
                options={[
                  { value: "all", label: "All records" },
                  { value: "active", label: "All active" },
                  { value: "assessment", label: "Needs assessment" },
                  { value: "ready", label: "Ready for review" },
                  { value: "changed", label: "Evidence changed" },
                ]}
              />

              <SelectField
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
            </>
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
            ? `${detail.member_id} · Recommendation version ${detail.version}`
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
            <h3 className="section-title">Cited support</h3>
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
                    `/${user.screens.includes("reviews") ? "reviews" : "members"}/${detail.member_id}`,
                  )}
                >
                  Open source and next action
                  <ArrowRight size={15} />
                </Link>
              </Button>
              {can(user, "defer") && (
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
            label="Allocation owner"
            value={allocation}
            onChange={setAllocation}
            options={[
              "Coding team",
              "QA team",
              "Retrieval team",
              "Provider practice",
            ].map((v) => ({ value: v, label: v }))}
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
          Selected records remain selected if validation fails. Existing open
          evidence requests will be reused.
        </Notice>
        <Button
          disabled={
            busy ||
            !selected.length ||
            (["defer", "suppress"].includes(bulk) && !bulkNote.trim())
          }
          onClick={async () => {
            setBusy(true);
            try {
              await act({
                action: bulk,
                member_ids: selected,
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
            <small>Members with detailed evidence and open review items.</small>
          </span>
        </div>
        {data.members.slice(0, 6).map((m) => (
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
  const [tab, setTab] = useUrlState("tab", "Overview");
  const [docId, setDocId] = useUrlState("document", "");
  const [zoom, setZoom] = useState(100);
  const [decision, setDecision] = useDraft(`review-${id}-decision`, "");
  const [note, setNote] = useDraft(`review-${id}-note`, "");
  const [busy, setBusy] = useState(false);
  const [queryOpen, setQueryOpen] = useState(false);
  const [draft, setDraft] = useDraft(
    `query-${id}`,
    "Please review the available history and document your current clinical assessment, including if this condition is not supported.",
  );
  const result = useQuery({
    queryKey: ["member", id, user.id],
    queryFn: () => api<Member>(`/members/${id}`),
  });
  const m = result.data;
  const o = m?.opportunities?.[0];
  const doc = m?.documents?.find((d) => d.id === docId) || m?.documents?.[0];
  useEffect(() => {
    if (!note) return;
    const prevent = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", prevent);
    return () => window.removeEventListener("beforeunload", prevent);
  }, [note]);
  useEffect(() => {
    if (o?.draft_note && o.review_state === "paused") setNote(o.draft_note);
  }, [o?.draft_note, o?.review_state]);
  const save = async () => {
    setBusy(true);
    try {
      await act({ action: "review", id, value: decision, note });
      setNote("");
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
          {can(user, "query") && (
            <Button variant="outline" onClick={() => setQueryOpen(true)}>
              <Send size={15} />
              Create clarification task
            </Button>
          )}
          {can(user, "analyze") && (
            <Button
              onClick={() =>
                actionSafe(act, { action: "analyze", member_ids: [id] })
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
        <span>
          <CalendarDays size={14} />
          Next visit: {m.next_visit || "Not scheduled"}
        </span>
        <span>
          <ShieldCheck size={14} />
          MA Part C · 2026 / 2027
        </span>
        <Status value={o?.status || m.status} />
      </div>
      <Tabs value={tab} onValueChange={setTab} className="member-tabs">
        <TabsList>
          {[
            "Overview",
            "Evidence & documents",
            "Opportunities",
            "Timeline",
            "Tasks",
            "Risk scenarios",
            "Submissions",
          ].map((t) => (
            <TabsTrigger key={t} value={t}>
              {t}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      {["Overview", "Evidence & documents"].includes(tab) ? (
        <>
          {tab === "Overview" && (
            <div className="member-summary">
              <span className="insight-title">
                <Sparkles size={16} />
                Member summary <span>SOURCE-LINKED</span>
              </span>
              <p>{m.summary}</p>
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
              onSelect={(docId) => {
                setDocId(docId);
                actionSafe(act, {
                  action: "open_evidence",
                  id,
                  note: `Inspected ${docId}`,
                });
              }}
              onInspect={() =>
                actionSafe(act, {
                  action: "open_evidence",
                  id,
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
                    ? `Finding ${o.id} · Version ${o.version}`
                    : "Member context"
                }
              >
                <div className="review-form">
                  <div className="finding-title">
                    <span>REVIEW OPPORTUNITY</span>
                    <h3>{m.condition}</h3>
                    <Status value={o?.evidence || m.evidence} />
                  </div>
                  {id === "MB-000006" &&
                    !m.documents?.some(
                      (d) =>
                        d.signature_status === "signed" &&
                        ["eligible", "usable"].includes(d.source_status),
                    ) && (
                      <Notice>
                        This prepared source fails its signature/source
                        eligibility check. Obtain eligible documentation before
                        supported coding.
                      </Notice>
                    )}
                  {id === "MB-000003" && o?.evidence !== "Strong" && (
                    <Notice>
                      Indirect signals support an assessment task. They do not
                      establish a current diagnosis.
                    </Notice>
                  )}
                  {can(user, "review") ? (
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
                      <Button
                        className="w-full"
                        disabled={
                          !decision ||
                          !note.trim() ||
                          busy ||
                          (decision === "resolved_supported" &&
                            ["MB-000002", "MB-000003", "MB-000006"].includes(
                              id,
                            ) &&
                            !m.later_encounter)
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
                              id,
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
                        Independent QA preserves the first reviewer’s decision
                        and history.
                      </Notice>
                      <Button
                        disabled={o?.qa_status !== "awaiting_qa"}
                        onClick={() =>
                          actionSafe(act, { action: "qa", id, value: "passed" })
                        }
                      >
                        <ShieldCheck size={15} />
                        Pass QA
                      </Button>
                      <Button
                        variant="outline"
                        disabled={o?.qa_status !== "awaiting_qa"}
                        onClick={() =>
                          actionSafe(act, {
                            action: "qa",
                            id,
                            value: "rework",
                            note: "Returned for clarification",
                          })
                        }
                      >
                        Return for rework
                      </Button>
                    </div>
                  )}
                </div>
              </Panel>
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
                  <p>{m.summary}</p>
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
      ) : tab === "Tasks" ? (
        <Panel title="Member tasks">
          {m.tasks?.length ? (
            <DataGrid
              rows={m.tasks}
              columns={[
                { accessorKey: "title", header: "Task" },
                { accessorKey: "type", header: "Type" },
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
      ) : (
        <Panel title={tab}>
          <Empty
            title={
              tab === "Risk scenarios"
                ? "Model configuration required"
                : "Review the connected workflow"
            }
            description={
              tab === "Risk scenarios"
                ? "An official model pack has not been installed. Evidence review remains available."
                : "Submission outcomes remain separate from coding decisions. Open Submission Operations with the appropriate local role."
            }
          />
        </Panel>
      )}
      <Modal
        open={queryOpen}
        onOpenChange={setQueryOpen}
        title="Create a clinical clarification task"
        description={`${m.name} · Query draft`}
      >
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
              await act({ action: "query", id, note: draft });
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
                <h3 className="section-title">Question for this encounter</h3>
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
                    disabled={busy}
                    onClick={async () => {
                      setBusy(true);
                      try {
                        await act({
                          action: "respond",
                          id: m.id,
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
                  <Button
                    variant="outline"
                    disabled={busy || m.documents?.some((d) => d.later_example)}
                    onClick={() =>
                      actionSafe(act, { action: "later_encounter", id: m.id })
                    }
                  >
                    <FileCheck2 size={15} />
                    {m.documents?.some((d) => d.later_example)
                      ? "Follow-up encounter added"
                      : "Add prepared encounter"}
                  </Button>
                </div>
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
function Submissions({ data, user, route, act }: WorkspaceProps) {
  const [detailId, setDetailId] = useState("");
  const detail = data.submissions.find((r) => r.id === detailId);
  const setDetail = (record: Submission | null) =>
    setDetailId(record?.id || "");
  const [memberFilter, setMemberFilter] = useUrlState("member", "");
  const records = data.submissions.filter(
    (r) => !memberFilter || r.member_id === memberFilter,
  );
  const [response, setResponse] = useState("acknowledged");
  const [selected, setSelected] = useState<string[]>([
    "MB-000001",
    "MB-000004",
  ]);
  const [busy, setBusy] = useState(false);
  if (route === "audit")
    return (
      <>
        <PageHeader
          title="Audit workspace"
          description="Build a traceable evidence package from the exact records reviewed."
        >
          <Button
            onClick={() => exportSafe("audit", user, selected)}
            disabled={!selected.length}
          >
            <ArrowDownToLine size={16} />
            Generate evidence package
          </Button>
        </PageHeader>
        <div className="audit-layout">
          <Panel
            title="Select evidence"
            subtitle="Select members for the audit package"
          >
            <div className="cohort-picker padded">
              {data.members.map((m) => (
                <label key={m.id}>
                  <Checkbox
                    checked={selected.includes(m.id)}
                    onCheckedChange={(v) =>
                      setSelected((s) =>
                        v ? [...s, m.id] : s.filter((i) => i !== m.id),
                      )
                    }
                  />
                  <Avatar name={m.name} id={m.id} />
                  <span>
                    <strong>{m.name}</strong>
                    <small>
                      {m.id} · {m.condition}
                    </small>
                  </span>
                  <Status value={m.evidence} />
                </label>
              ))}
            </div>
          </Panel>
          <Panel title="Package readiness">
            <div className="padded">
              <div className="audit-count">
                <FolderOpen size={28} />
                <strong>{selected.length}</strong>
                <span>selected members</span>
              </div>
              <div className="check-list">
                <p>
                  <CheckCircle2 size={16} />
                  Member and source identifiers
                </p>
                <p>
                  <CheckCircle2 size={16} />
                  Exact prepared evidence passages
                </p>
                <p>
                  <CheckCircle2 size={16} />
                  Downloadable JSON manifest
                </p>
                <p>
                  <Info size={16} />
                  Source provenance included
                </p>
              </div>
              <Notice>
                The ZIP contains selected source records and the matching
                manifest. Generating it does not change a finding.
              </Notice>
            </div>
          </Panel>
        </div>
      </>
    );
  return (
    <>
      <PageHeader
        title="Submission operations"
        description="Follow each record from preparation to its receiver outcome."
      >
        <Button
          variant="outline"
          onClick={() =>
            exportSafe(
              "submissions",
              user,
              records.map((r) => r.id),
            )
          }
        >
          <ArrowDownToLine size={16} />
          Export payload
        </Button>
      </PageHeader>
      <div className="metric-grid">
        <Metric
          label="Submission records"
          value={String(records.length)}
          note="Response simulator"
          icon={<Send size={18} />}
        />
        <Metric
          label="Accepted records"
          value={String(records.filter((s) => s.status === "accepted").length)}
          note="Not a payment confirmation"
          icon={<CheckCircle2 size={18} />}
          accent="teal"
        />
        <Metric
          label="Receiver exceptions"
          value={String(records.filter((s) => s.status === "rejected").length)}
          note="Remediation required"
          icon={<AlertCircle size={18} />}
          accent="amber"
        />
        <Metric
          label="Pending corrections"
          value={String(
            records.filter(
              (s) =>
                s.type === "correction" &&
                !["accepted", "rejected"].includes(s.status),
            ).length,
          )}
          note="Original records retained"
          icon={<RotateCcw size={18} />}
          accent="purple"
        />
      </div>
      <Panel>
        <DataGrid<Submission>
          rows={records}
          toolbar={
            <SelectField
              label="Submission member"
              value={memberFilter}
              onChange={setMemberFilter}
              options={[
                { value: "", label: "All members" },
                ...Array.from(
                  new Set(data.submissions.map((r) => r.member_id)),
                ).map((id) => ({
                  value: id,
                  label: data.members.find((m) => m.id === id)?.name || id,
                })),
              ]}
            />
          }
          exportAction={(filtered) =>
            exportSafe(
              "submissions",
              user,
              filtered.map((r) => r.id),
            )
          }
          columns={[
            {
              accessorKey: "id",
              header: "Record",
              cell: ({ getValue }) => (
                <span className="whitespace-nowrap">{String(getValue())}</span>
              ),
            },
            {
              accessorKey: "member_id",
              header: "Member",
              cell: ({ getValue }) => (
                <span className="whitespace-nowrap">{String(getValue())}</span>
              ),
            },
            {
              accessorKey: "type",
              header: "Operation",
              cell: ({ getValue }) => label(String(getValue())),
            },
            {
              accessorKey: "status",
              header: "Receiver status",
              cell: ({ getValue }) => <Status value={String(getValue())} />,
            },
            { accessorKey: "reason", header: "Context" },
            { accessorKey: "original_id", header: "Original record" },
            {
              id: "correction",
              header: "Correction",
              cell: ({ row }) =>
                row.original.corrected ? (
                  <Status value="corrected" />
                ) : row.original.original_id ? (
                  "Linked attempt"
                ) : (
                  "—"
                ),
            },
          ]}
          onRow={(r) => setDetail(r)}
        />
      </Panel>
      <Drawer
        open={!!detail}
        onOpenChange={(v) => !v && setDetail(null)}
        title={detail?.id || "Submission"}
        description="Response simulator · no external delivery"
      >
        {detail && (
          <>
            <div className="badge-row">
              <Status value={detail.status} />
              {detail.corrected && <Status value="corrected" />}
              <span className="subtle-tag">{label(detail.type)}</span>
            </div>
            <p className="body-copy">{detail.reason}</p>
            <div className="definition-list">
              <div>
                <span>Member</span>
                <Link href={`/members/${detail.member_id}`}>
                  {detail.member_id}
                  <ArrowUpRight size={13} />
                </Link>
              </div>
              <div>
                <span>Original record</span>
                <strong>{detail.original_id || detail.id}</strong>
              </div>
              <div>
                <span>Payment reconciliation</span>
                <strong>Unreconciled</strong>
              </div>
            </div>
            <h3 className="section-title">Receiver response</h3>
            {["accepted", "rejected"].includes(detail.status) && (
              <Notice>
                This terminal response is retained. Prepare a linked remediation
                attempt to retry.
              </Notice>
            )}
            <Select
              value={response}
              onValueChange={setResponse}
              disabled={["accepted", "rejected"].includes(detail.status)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["acknowledged", "accepted", "rejected"].map((v) => (
                  <SelectItem key={v} value={v}>
                    {label(v)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="drawer-actions">
              <Button
                disabled={
                  busy || ["accepted", "rejected"].includes(detail.status)
                }
                onClick={async () => {
                  setBusy(true);
                  try {
                    await act({
                      action: "receiver",
                      id: detail.id,
                      value: response,
                    });
                    setDetail(null);
                  } catch {
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <Check size={15} />
                Record response
              </Button>
              <Button
                variant="outline"
                onClick={() =>
                  actionSafe(act, { action: "correction", id: detail.id }).then(
                    () => setDetail(null),
                  )
                }
              >
                Prepare remediation
              </Button>
            </div>
            <Notice>
              A transport acknowledgement is not record acceptance. Rejected
              corrections remain unresolved.
            </Notice>
            <h3 className="section-title">Linked attempts</h3>
            <div className="linked-members">
              {data.submissions
                .filter(
                  (r) =>
                    (r.original_id || r.id) ===
                    (detail.original_id || detail.id),
                )
                .map((r) => (
                  <button
                    key={r.id}
                    className="button-row"
                    onClick={() => setDetail(r)}
                  >
                    <span>
                      {r.id} · {label(r.type)}
                    </span>
                    <Status value={r.status} />
                  </button>
                ))}
            </div>
            {detail.history && (
              <>
                <h3 className="section-title">
                  Receiver history for this attempt
                </h3>
                <div className="timeline">
                  {detail.history.map((h, i) => (
                    <div key={i}>
                      <strong>{label(h.stage)}</strong>
                      <p>
                        {label(h.status)} ·{" "}
                        {h.terminal
                          ? "Terminal record response"
                          : "Transport only"}
                      </p>
                      <small>{h.at}</small>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </Drawer>
    </>
  );
}
function Scenarios({ data, user }: WorkspaceProps) {
  const [id, setId] = useUrlState("member", "MB-000005");
  const detail = useQuery({
    queryKey: ["member", id, user.id],
    queryFn: () => api<Member>(`/members/${id}`),
  });
  const member = detail.data || data.members.find((m) => m.id === id);
  return (
    <>
      <PageHeader
        title="Risk score scenarios"
        description="Understand the full member context behind a modeled change."
      />
      <div className="scenario-context">
        <Select value={id} onValueChange={setId}>
          <SelectTrigger aria-label="Scenario member">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(member && !data.members.some((m) => m.id === member.id)
              ? [member, ...data.members]
              : data.members
            ).map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.name} · {m.id}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="subtle-tag">MA Part C · 2027</span>
        <span className="subtle-tag">Reference model not installed</span>
      </div>
      <div className="metric-grid three">
        <Metric
          label="Current-data score"
          value="—"
          note="Model configuration required"
          icon={<Layers3 size={18} />}
        />
        <Metric
          label="Combined scenario"
          value="—"
          note="Full diagnosis-set calculation required"
          icon={<ScanLine size={18} />}
          accent="teal"
        />
        <Metric
          label="Reconciled financial result"
          value="—"
          note="Payment reconciliation unavailable"
          icon={<ShieldCheck size={18} />}
          accent="purple"
        />
      </div>
      <div className="charts-grid">
        <Panel title="Scenario inputs" subtitle={member?.name}>
          <div className="padded">
            <div className="definition-list">
              <div>
                <span>Program</span>
                <strong>Medicare Advantage · Part C</strong>
              </div>
              <div>
                <span>Service / payment year</span>
                <strong>2026 / 2027</strong>
              </div>
              <div>
                <span>Review context</span>
                <strong>{member?.condition}</strong>
              </div>
              <div>
                <span>Input basis</span>
                <strong>Member record</strong>
              </div>
              <div>
                <span>Calculation status</span>
                <Status value="configuration_required" />
              </div>
            </div>
            <Button variant="outline" asChild>
              <Link href={`/members/${id}`}>
                Inspect member evidence
                <ArrowRight size={15} />
              </Link>
            </Button>
          </div>
        </Panel>
        <Panel title="Why a combined scenario matters">
          <div className="padded">
            <div className="scenario-explainer">
              <span>A</span>
              <Plus size={17} />
              <span>B</span>
              <ArrowRight size={19} />
              <strong>
                Recalculate
                <br />
                the full member
              </strong>
            </div>
            <p className="body-copy">
              Hierarchies and interactions can change the effect of a diagnosis
              when it is combined with the member’s existing conditions.
              Standalone opportunity effects must not be added together.
            </p>
            <Notice>
              Scores require a configured, validated program model.
            </Notice>
          </div>
        </Panel>
      </div>
    </>
  );
}
function Operations({ data, user, route, act, refresh }: WorkspaceProps) {
  const client = useQueryClient();
  const [tab, setTab] = useState("Users & access");
  const [resetOpen, setResetOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
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
            value={String(data.runs.filter((r) => r.mode === "fixture").length)}
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
                    <td>Sep 12, 2026</td>
                    <td>
                      <Status
                        value={
                          name === "Clinical evidence" && data.issues?.length
                            ? "needs_attention"
                            : "usable"
                        }
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
                        <Link href={`/intake?sample=${issue.id}`}>
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
      />
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
                      <Select
                        value={u.role}
                        disabled={u.id === user.id}
                        onValueChange={async (role) => {
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
                            client.invalidateQueries({
                              queryKey: ["admin-users"],
                            });
                          } catch (e) {
                            toast.error((e as Error).message);
                          }
                        }}
                      >
                        <SelectTrigger
                          className="role-select"
                          aria-label={`${u.name} role`}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {users.data?.roles.map((r) => (
                            <SelectItem key={r} value={r}>
                              {label(r)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
                            client.invalidateQueries({
                              queryKey: ["admin-users"],
                            });
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
                    ["Program", "MA Part C · non-PACE"],
                    ["Service / payment year", "2026 / 2027"],
                    ["Reference model pack", "Not installed"],
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
