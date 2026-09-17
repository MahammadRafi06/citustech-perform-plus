"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useUrlState, useReturnLink } from "@/hooks/workspace-state";
import {
  ArrowRight,
  ArrowUpRight,
  ArrowDownToLine,
  Users,
  ScanLine,
  CheckCircle2,
  Clock3,
  Info,
  Activity,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  PageHeader,
  Panel,
  Metric,
  Status,
  Modal,
  Notice,
  Empty,
  DataGrid,
} from "./shared";
import { downloadRiskJson } from "@/lib/risk-client";
import { num, label, download } from "@/lib/api";
import type { Snapshot, User, Opportunity } from "@/lib/types";
import { toast } from "sonner";
import { ComparisonPlot, QualityMatrix, MetricSpotlight } from "./report-visuals";
import { OperationalVisuals } from "./report-operations";
import { RiskGeography } from "./risk-geography-ui";
import { RiskAnalytics } from "./risk-analytics-ui";
import { RiskFinancial } from "./risk-financial-ui";
import { RiskOverview, useRiskContext } from "./risk-ui";
import { RegistryInsights, SuspectReport } from "./suspect-insights";
import { WORKFLOW_ENABLED } from "@/lib/workflow-flags";
import { DEFAULT_PAGE_SIZE } from "./table-pagination";

const allDomainTabs = [
  "AI Impact",
  "Executive",
  "Risk & conditions",
  "Geography",
  "Suspecting",
  "Providers",
  "Retrieval",
  "Coding & QA",
  "Submissions",
  "Financial scenarios",
  "Data & AI operations",
];
const WORKFLOW_DOMAINS = new Set(["Providers", "Retrieval", "Coding & QA", "Submissions", "Data & AI operations"]);
const domainTabs = allDomainTabs.filter((name) => WORKFLOW_ENABLED || !WORKFLOW_DOMAINS.has(name));
export function Dashboard({
  data,
  user,
  analytics = false,
}: {
  data: Snapshot;
  user: User;
  analytics?: boolean;
}) {
  const router = useRouter();
  const risk = useRiskContext();
  const pathname = usePathname();
  const suffix = pathname?.split("/")[2];
  const initialReport =
    domainTabs.find(
      (t) =>
        t
          .toLowerCase()
          .replace(/&/g, "and")
          .replace(/[^a-z0-9]+/g, "-") === suffix,
    ) || "Executive";
  const [report, setDomain] = useUrlState("view", initialReport);
  const domain = domainTabs.includes(report) ? report : initialReport;
  const [method, setMethod] = useState(false),
    [records, setRecords] = useState(false);
  const metrics = data.comparison?.metrics || {};
  const comparison = data.comparison;
  const active = data.opportunities.filter((o) => o.eligibility?.reviewable && !o.completion?.complete && o.status !== "suppressed");
  const approved = data.opportunities.filter((o) => o.eligibility?.reviewable && o.completion?.complete);
  const pct = (key: string) =>
    !Number.isFinite(metrics[key])
      ? "Unavailable"
      : `${(metrics[key] * 100).toFixed(1)}%`;
  const val = (key: string, suffix = "") =>
    !Number.isFinite(metrics[key]) ? "Unavailable" : `${metrics[key]}${suffix}`;
  const attention = [...active]
    .sort(
      (a, b) => Number(b.priority === "High") - Number(a.priority === "High"),
    )
    .slice(0, 8);
  const caseLink = (o: Opportunity) =>
    `/${WORKFLOW_ENABLED && user.screens.includes("reviews") ? "reviews" : "members"}/${o.member_id}`;
  const exportReport = () => {
    if (!risk.permissions.includes("export")) return;
    if (analytics && domain !== "AI Impact") {
      downloadRiskJson({ report: domain, configuration: risk.configuration, score_basis: risk.basis, population_in_scope: data.population_count, records: operationalRows(data, domain).rows }, `perform-plus-${domain.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.json`);
      return;
    }
    download(analytics ? "comparison" : "members", user.csrf_token).catch(error => toast.error(error.message));
  };
  return (
    <Tabs value={domain} onValueChange={setDomain} className="report-workspace">
      <PageHeader
        title={analytics ? "Risk analytics" : "Program overview"}
        description={
          analytics && domain === "AI Impact"
            ? "Reference comparison · 100 charts per arm · September 2026"
            : `${risk.configuration?.name || "Program loading"} · ${risk.basis.replaceAll("_", " ")}`
        }
      >
        {risk.permissions.includes("export") && !["Executive", "Risk & conditions", "Geography", "Financial scenarios", "Suspecting"].includes(domain) && <Button variant="outline" onClick={exportReport}>
          <ArrowDownToLine size={16} />
          {analytics && domain === "AI Impact" ? "Export comparison" : "Export report"}
        </Button>}
        {analytics && domain === "AI Impact" ? (
          <Button variant="outline" onClick={() => setMethod(true)}>
            <Info size={16} />
            Methodology
          </Button>
        ) : !analytics && user.screens.includes("suspects") ? (
          <Button asChild>
            <Link href="/suspects">
              Open worklist <ArrowRight size={16} />
            </Link>
          </Button>
        ) : null}
      </PageHeader>
      {analytics && (
        <div className="report-navigation">
          <TabsList variant="line" className="report-tabs" aria-label="Reports">
            {domainTabs.map(name => <TabsTrigger key={name} value={name}>{name === "Financial scenarios" ? "Financial" : name === "Data & AI operations" ? "Data & AI" : name}</TabsTrigger>)}
          </TabsList>
        </div>
      )}
      <TabsContent value={domain} className="report-content">
      {analytics && domain === "Executive" ? <RiskOverview user={user} embedded /> : analytics && domain === "Risk & conditions" ? <RiskAnalytics user={user} /> : analytics && domain === "Geography" ? <RiskGeography user={user} /> : analytics && domain === "Financial scenarios" ? <SuspectReport data={data} user={user} financial /> : analytics && domain === "Suspecting" ? <SuspectReport data={data} user={user} /> : analytics && domain !== "AI Impact" ? (
        <DomainView
          domain={domain}
          data={data}
          user={user}
        />
      ) : !analytics ? (
        <>
          <div className="metric-grid">
            <Metric
              label="Enrolled members"
              value={num(data.population_count)}
              note={`${data.providers.length} practices`}
              icon={<Users />}
              onClick={() => router.push("/members")}
            />
            <Metric
              label="Open actionable reviews"
              value={num(active.length)}
              note={`${active.filter((o) => o.priority === "High").length} high priority · awaiting review or QA`}
              icon={<ScanLine />}
              onClick={
                user.screens.includes("suspects")
                  ? () => router.push("/suspects?kind=all&status=active")
                  : undefined
              }
            />
            <Metric
              label="QA-approved reviews"
              value={num(approved.length)}
              note={`${data.counts.resolved_supported || 0} supported dispositions recorded separately`}
              icon={<CheckCircle2 />}
              onClick={
                user.screens.includes("suspects")
                  ? () =>
                      router.push(
                        "/suspects?kind=all&saved=complete",
                      )
                  : undefined
              }
            />
            <Metric
              label="Population follow-up"
              value={num(
                (data.counts.awaiting_assessment || 0) +
                  (data.counts.awaiting_evidence || 0),
              )}
              note={`${data.counts.awaiting_assessment || 0} assessment · ${data.counts.awaiting_evidence || 0} evidence`}
              icon={<Clock3 />}
              onClick={
                user.screens.includes("suspects")
                  ? () => router.push("/suspects?kind=all&status=pending&scope=all")
                  : undefined
              }
            />
          </div>
          <div className="overview-layout">
            <Panel
              title="Needs attention"
              subtitle="Actionable reviews remain open until independent QA approval"
              action={
                <Link
                  href={
                    user.screens.includes("suspects")
                      ? "/suspects?kind=all&status=active"
                      : "/members"
                  }
                >
                  View all <ArrowUpRight size={14} />
                </Link>
              }
            >
              <div
                className="table-scroll"
                role="region"
                aria-label="Attention worklist"
                tabIndex={0}
              >
                <table>
                  <thead>
                    <tr>
                      <th>Member and finding</th>
                      <th>Evidence / due</th>
                      <th>Status</th>
                      <th>
                        <span className="sr-only">Action</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {!attention.length && <tr><td colSpan={4}>No actionable reviews are awaiting attention.</td></tr>}
                    {attention.map((o) => (
                      <tr key={o.id}>
                        <td>
                          <strong>{o.name || o.member_id}</strong>
                          <small>{o.condition}</small>
                        </td>
                        <td>
                          {o.evidence ? `${o.evidence} evidence` : "Awaiting evidence"}
                          <small>
                            {new Date(
                              o.due_date + "T12:00:00",
                            ).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            })}
                          </small>
                        </td>
                        <td>
                          <Status value={o.status} />
                        </td>
                        <td>
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={caseLink(o)}>
                              Review <ArrowRight size={14} />
                            </Link>
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
            <Panel
              title="Work by stage"
              subtitle={`Share of all ${num(data.opportunities.length)} work items`}
            >
              <div className="stage-list">
                {Object.entries(data.counts).map(([status, count]) => (
                  <div className="stage-row" key={status}>
                    <div>
                      <span>{label(status)}</span>
                      <strong>{num(count)}</strong>
                    </div>
                    <div className="stage-track">
                      <i
                        style={{
                          width: `${data.opportunities.length ? (count / data.opportunities.length) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          </div>
          <div className="comparison-callout">
            <div>
              <strong>Review comparison</strong>
              <span>
                100 charts per arm · {val("manual_mean_minutes", " min")} manual
                / {val("assisted_mean_minutes", " min")} assisted ·{" "}
                {pct("review_time_reduction")} lower active time
              </span>
            </div>
            <Link href="/analytics">Explore AI Impact →</Link>
          </div>
        </>
      ) : (
        <>
          <MetricSpotlight items={[
            { label: "Active review time reduction", value: pct("review_time_reduction"), note: `${val("manual_mean_minutes", " min")} manual → ${val("assisted_mean_minutes", " min")} assisted` },
            { label: "Supported final findings", value: String(comparison?.summary?.assisted.tp ?? "—"), note: `${comparison?.summary?.manual.tp ?? "—"} manual · 120 reference-positive slots per arm` },
            { label: "Assisted final precision", value: pct("assisted_precision"), note: `${pct("manual_precision")} manual · supported / final positive findings` },
          ]} />
          <div className="report-chart-grid">
            <Panel title="Time to a completed review" subtitle="Mean active minutes per chart · grouped by recorded complexity">
              <ComparisonPlot rows={comparisonRows(comparison?.evaluation_records || [])} unit=" min" />
              <div className="risk-panel-foot"><span>100 charts per arm · fixed reference comparison</span><Button variant="ghost" size="sm" onClick={() => setRecords(true)}>Inspect chart records<ArrowUpRight size={13} /></Button></div>
            </Panel>
            <Panel title="What the AI flagged" subtitle="AI-stage outcomes against independent reference labels">
              <div className="report-quality-head"><div><strong>{pct("ai_precision")}</strong><span>Precision</span></div><div><strong>{pct("ai_recall")}</strong><span>Recall</span></div><p>Before human review<br />1,000 evaluation slots</p></div>
              <QualityMatrix values={comparison?.summary?.ai} />
            </Panel>
          </div>
          <Panel title="Final review outcomes" subtitle="Human-confirmed results · independent reference labels">
              <div className="table-scroll">
                <table className="comparison-table">
                  <thead>
                    <tr>
                      <th>Measure</th>
                      <th>Manual</th>
                      <th>AI-assisted</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>
                        Active review time
                        <small>Mean minutes / completed chart</small>
                      </td>
                      <td>{val("manual_mean_minutes", " min")}</td>
                      <td>{val("assisted_mean_minutes", " min")}</td>
                    </tr>
                    <tr>
                      <td>
                        Supported final findings
                        <small>120 reference-positive slots per arm</small>
                      </td>
                      <td>{comparison?.summary?.manual.tp ?? "Unavailable"}</td>
                      <td>
                        {comparison?.summary?.assisted.tp ?? "Unavailable"}
                      </td>
                    </tr>
                    <tr>
                      <td>
                        Final-review precision
                        <small>Supported / all final positive findings</small>
                      </td>
                      <td>{pct("manual_precision")}</td>
                      <td>{pct("assisted_precision")}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
          </Panel>
          <Panel
            title="Recent operational activity"
            subtitle="Latest 100 event records at most. Separate from the fixed reference comparison."
          >
            <div className="session-grid">
              {[
                [
                  "Cases with evidence inspected",
                  new Set(
                    data.events
                      .filter((e) => e.action === "open_evidence")
                      .map((e) => e.resource),
                  ).size,
                ],
                [
                  "Reviews saved",
                  data.events.filter((e) => e.action === "review").length,
                ],
                [
                  "Current clarification tasks",
                  data.tasks.filter((t) => t.type === "query").length,
                ],
                [
                  "Receiver actions",
                  data.events.filter((e) => e.action === "receiver").length,
                ],
              ].map(([name, count]) => (
                <div key={name}>
                  <strong>{count}</strong>
                  <span>{name}</span>
                </div>
              ))}
            </div>
          </Panel>
          <RegistryInsights rows={data.opportunities} />
        </>
      )}
      </TabsContent>
      <Modal
        open={method}
        onOpenChange={setMethod}
        title="Comparison methodology"
        description="Reference comparison · SYN-AI-COMP-001-v1"
      >
        <Notice>
          Reference evaluation, not a clinical study, causal estimate or
          customer outcome.
        </Notice>
        <p className="body-copy">
          Two disjoint groups of 100 charts, with ten evaluation slots per
          chart: 120 reference-positive and 880 reference-negative slots per
          arm. Labels remain fixed when operational work changes.
        </p>
        <div className="definition-list">
          <div>
            <span>AI precision</span>
            <strong>108 / 135 = 80%</strong>
          </div>
          <div>
            <span>AI recall</span>
            <strong>108 / 120 = 90%</strong>
          </div>
          <div>
            <span>Final precision — manual / assisted</span>
            <strong>84 / 90 · 102 / 105</strong>
          </div>
          <div>
            <span>Human confirmation yield</span>
            <strong>105 / 135 = 77.78%</strong>
          </div>
          <div>
            <span>Active time reduction</span>
            <strong>(36 − 22) / 36 = 38.888…%</strong>
          </div>
        </div>
        <p className="body-copy">
          Display values are rounded; the export retains original metrics,
          reference labels and chart records.
        </p>
        <Button
          variant="outline"
          onClick={() => {
            setMethod(false);
            setRecords(true);
          }}
        >
          View underlying records
        </Button>
        <details>
          <summary>Exact source metrics</summary>
          <pre className="json-preview">{JSON.stringify(metrics, null, 2)}</pre>
        </details>
      </Modal>
      <Modal
        open={records}
        onOpenChange={setRecords}
        title="Evaluation records"
        description="200 charts, separate from the operational population."
      >
        <DataGrid
          pageSize={DEFAULT_PAGE_SIZE}
          stateKey="analytics_evaluation"
          rows={(comparison?.evaluation_records || []).map((r) => ({
            id: String(r.id),
            arm: r.arm === "assisted" ? "AI-assisted" : "Manual",
            complexity: String(r.complexity),
            minutes: Number(r.active_review_minutes),
          }))}
          columns={[
            { accessorKey: "id", header: "Chart" },
            { accessorKey: "arm", header: "Arm" },
            { accessorKey: "complexity", header: "Complexity" },
            { accessorKey: "minutes", header: "Active minutes" },
          ]}
          searchLabel="Search evaluation charts"
        />
        <Button disabled={!risk.permissions.includes("export")} onClick={exportReport}>Download all chart records</Button>
      </Modal>
    </Tabs>
  );
}
function DomainView({
  domain,
  data,
  user,
}: {
  domain: string;
  data: Snapshot;
  user: User;
}) {
  const returnLink = useReturnLink();
  if (domain === "Financial scenarios")
    return (
      <Panel
        title="Financial scenarios"
        subtitle="Keep opportunity estimates and realized results distinct."
      >
        <Empty
          title="Model configuration required"
          description="Configure a validated scoring model and financial methodology to enable these measures."
        />
        <div className="panel-bottom">
          {user.screens.includes("scenarios") && (
            <Button variant="outline" asChild>
              <Link href="/scenarios">
                Open risk scenarios
                <ArrowRight size={15} />
              </Link>
            </Button>
          )}
        </div>
      </Panel>
    );
  const { rows, relevant } = operationalRows(data, domain);
  const completed = ["Coding & QA", "Executive", "Risk & conditions", "Suspecting"].includes(domain)
    ? relevant.filter((o) => o.completion?.complete).length
    : rows.filter((r) =>
    [
      "accepted",
      "resolved_supported",
      "resolved_unsupported",
      "passed",
      "succeeded",
      "usable",
    ].includes(r.status),
  ).length;
  return (
    <>
      <div className="metric-grid three">
        <Metric
          label={`${domain} records`}
          value={num(rows.length)}
          note="Current workspace records"
          icon={<Activity size={18} />}
        />
        <Metric
          label={domain === "Providers" ? "Average response time" : ["Coding & QA", "Executive", "Risk & conditions", "Suspecting"].includes(domain) ? "QA-approved actionable reviews" : "Completed outcomes"}
          value={domain === "Providers" ? `${data.providers.length ? (data.providers.reduce((sum, item) => sum + item.response_days, 0) / data.providers.length).toFixed(1) : "—"} days` : num(completed)}
          note={domain === "Providers" ? "Mean recorded response days across practices" : domain === "Coding & QA" ? "Terminal review approved independently" : domain === "Retrieval" ? "Published usable source" : domain === "Submissions" ? "Accepted by the receiver" : "Completion follows the selected workflow"}
          icon={<CheckCircle2 size={18} />}
          accent="teal"
        />
        <Metric
          label="Program population"
          value={num(data.population_count)}
          note="Members in your access scope"
          icon={<Users size={18} />}
        />
      </div>
      <OperationalVisuals domain={domain} rows={rows} data={data} />
      <Panel title={`${domain} records`}>
        <DataGrid
          key={domain}
          pageSize={DEFAULT_PAGE_SIZE}
          stateKey={`analytics_${domain.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`}
          searchLabel={`Search ${domain.toLowerCase()} records…`}
          rows={rows}
          columns={[
            {
              accessorKey: "name",
              header: domain === "Providers" ? "Practice" : "Record / member",
              cell: ({ row }) =>
                row.original.member_id ? (
                  <Link href={returnLink(`/members/${row.original.member_id}`)}>
                    {row.original.name}
                  </Link>
                ) : (
                  row.original.name
                ),
            },
            { accessorKey: "id", header: "Record ID" },
            { accessorKey: "category", header: domain === "Providers" ? "Review workload" : "Context" },
            ...(domain === "Providers" ? [{ accessorKey: "response_days", header: "Response time (days)" }] : []),
            {
              accessorKey: "status",
              header: "Status",
              cell: ({ getValue }) => <Status value={String(getValue())} />,
            },
          ]}
        />
      </Panel>
    </>
  );
}

function comparisonRows(records: Record<string, unknown>[]) {
  const complexity = [...new Set(records.map(row => String(row.complexity)))];
  const preferred = ["low", "medium", "moderate", "high"];
  complexity.sort((a, b) => preferred.indexOf(a.toLowerCase()) - preferred.indexOf(b.toLowerCase()));
  return complexity.map(name => {
    const mean = (arm: string) => {
      const values = records.filter(row => String(row.complexity) === name && row.arm === arm).map(row => Number(row.active_review_minutes)).filter(Number.isFinite);
      return values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
    };
    return { name: label(name), before: mean("manual"), after: mean("assisted") };
  });
}

function operationalRows(data: Snapshot, domain: string) {
  type DomainRow = {
    id: string;
    member_id?: string;
    name: string;
    category: string;
    status: string;
    response_days?: number;
  };
  const relevant =
    domain === "Coding & QA"
      ? data.opportunities.filter(
          (o) =>
            o.qa_status ||
            o.status.startsWith("resolved") ||
            o.status === "in_review",
        )
      : domain === "Suspecting"
        ? data.opportunities.filter((o) =>
            [
              "documented_gap",
              "historical_condition",
              "predictive_signal",
              "specificity_query",
            ].includes(o.type),
          )
        : data.opportunities;
  const rows: DomainRow[] =
    domain === "Retrieval"
      ? data.chases.map((c) => ({
          id: c.id,
          member_id: c.member_id,
          name: c.member_id,
          category: c.document_type,
          status: c.status,
        }))
      : domain === "Submissions"
        ? data.submissions.map((r) => ({
            id: r.id,
            member_id: r.member_id,
            name: r.member_id,
            category: label(r.type),
            status: r.status,
          }))
        : domain === "Data & AI operations"
          ? data.runs.map((r) => ({
              id: r.id,
              name: r.id,
              category: `${r.members} ${r.members === 1 ? "member" : "members"} · ${r.mode}`,
              status: r.status,
            }))
          : domain === "Providers"
            ? data.providers.map((p) => ({
                id: p.id,
                name: p.name,
                category: `${data.opportunities.filter((o) => o.provider === p.name).length} work items`,
                status: "active",
                response_days: p.response_days,
              }))
            : relevant.map((o) => ({
                id: o.id,
                member_id: o.member_id,
                name: o.name || o.member_id,
                category: o.condition,
                status: o.qa_status || o.status,
              }));
  return { rows, relevant };
}
