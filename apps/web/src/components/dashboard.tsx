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
  Sparkles,
  Info,
  ShieldCheck,
  Activity,
  Target,
  TrendingUp,
  FileCheck2,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  PageHeader,
  Panel,
  Metric,
  Status,
  Avatar,
  Modal,
  Notice,
  Empty,
  DataGrid,
} from "./shared";
import { num, label, download } from "@/lib/api";
import type { Snapshot, User, Opportunity } from "@/lib/types";
import { toast } from "sonner";
import { RiskAnalytics } from "./risk-analytics-ui";
import { RiskFinancial } from "./risk-financial-ui";
import { RiskOverview, RiskRecapture, useRiskContext } from "./risk-ui";

const domainTabs = [
  "AI Impact",
  "Executive",
  "Risk & conditions",
  "Suspecting",
  "Providers",
  "Retrieval",
  "Coding & QA",
  "Submissions",
  "Financial scenarios",
  "Data & AI operations",
];
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
    ) || "AI Impact";
  const [domain, setDomain] = useUrlState("view", initialReport);
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
    `/${user.screens.includes("reviews") ? "reviews" : "members"}/${o.member_id}`;
  const exportReport = () =>
    download(analytics ? "comparison" : "members", user.csrf_token).catch((e) =>
      toast.error(e.message),
    );
  return (
    <>
      <PageHeader
        title={analytics ? domain : "Program overview"}
        description={
          analytics && domain === "AI Impact"
            ? "Synthetic comparison · 100 charts per arm · September 2026"
            : `${risk.configuration?.name || "Program loading"} · ${risk.basis.replaceAll("_", " ")}`
        }
      >
        {!["Executive", "Risk & conditions", "Financial scenarios"].includes(domain) && <Button variant="outline" onClick={exportReport}>
          <ArrowDownToLine size={16} />
          {analytics ? "Export comparison" : "Export report"}
        </Button>}
        {analytics && !["Executive", "Risk & conditions", "Financial scenarios"].includes(domain) ? (
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
        <div className="report-selector">
          <label htmlFor="analytics-report">Report</label>
          <select
            id="analytics-report"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            className="report-select"
          >
            {[
              ["Impact and program", domainTabs.slice(0, 3)],
              ["Review operations", domainTabs.slice(3, 7)],
              ["Governance", domainTabs.slice(7)],
            ].map(([group, items]) => (
              <optgroup key={String(group)} label={String(group)}>
                {(items as string[]).map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </optgroup>
            ))}
          </select>
          <span className="subtle-tag">
            {analytics && domain === "AI Impact"
              ? comparison?.id
              : "Current workspace snapshot"}
          </span>
        </div>
      )}
      {analytics && domain === "Executive" ? <RiskOverview user={user} embedded /> : analytics && domain === "Risk & conditions" ? <RiskAnalytics user={user} /> : analytics && domain === "Financial scenarios" ? <RiskFinancial user={user} /> : analytics && domain !== "AI Impact" ? (
        <DomainView
          domain={domain}
          data={data}
          user={user}
          onMethod={() => setMethod(true)}
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
                      <th>Owner / due</th>
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
                          {o.owner}
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
              <strong>Synthetic review comparison</strong>
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
          <div className="comparison-layout">
            <Panel
              title="Final review outcomes"
              subtitle="Independent reference labels · Manual and AI-assisted review"
            >
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
              <div className="time-bars">
                <h3>
                  Active review time{" "}
                  <span className="subtle-tag">
                    · {pct("review_time_reduction")} lower in the synthetic
                    assisted arm
                  </span>
                </h3>
                {[
                  ["Manual", "manual_mean_minutes", ""],
                  ["AI-assisted", "assisted_mean_minutes", "assisted"],
                ].map(([name, key, cls]) => (
                  <div className={`time-row ${cls}`} key={key}>
                    <span>{name}</span>
                    <div>
                      <i
                        style={{
                          width: `${((metrics[key] ?? 0) / 40) * 100}%`,
                        }}
                      />
                    </div>
                    <strong>{val(key)}</strong>
                  </div>
                ))}
                <div className="time-axis">
                  <span>0</span>
                  <span>10</span>
                  <span>20</span>
                  <span>30</span>
                  <span>40 min</span>
                </div>
              </div>
            </Panel>
            <Panel
              title="AI-stage quality"
              subtitle="Flags before human review"
            >
              <div className="quality-summary">
                <div>
                  <strong>{pct("ai_precision")}</strong>
                  <span>Precision · 108 / 135</span>
                </div>
                <div>
                  <strong>{pct("ai_recall")}</strong>
                  <span>Recall · 108 / 120</span>
                </div>
              </div>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Reference</th>
                      <th>Flagged</th>
                      <th>Unflagged</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Positive</td>
                      <td>TP {comparison?.summary?.ai.tp ?? "—"}</td>
                      <td>FN {comparison?.summary?.ai.fn ?? "—"}</td>
                    </tr>
                    <tr>
                      <td>Negative</td>
                      <td>FP {comparison?.summary?.ai.fp ?? "—"}</td>
                      <td>TN {comparison?.summary?.ai.tn ?? "—"}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="padded">
                <p className="body-copy">
                  1,000 condition-evaluation slots in the assisted arm. Human
                  confirmation is recorded separately from AI accuracy.
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setMethod(true)}
                >
                  View definitions <ArrowRight size={14} />
                </Button>
              </div>
            </Panel>
          </div>
          <Panel
            title="Recent operational activity"
            subtitle="Latest 100 event records at most. Separate from the frozen synthetic comparison."
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
          <Panel
            title="Contribution records"
            subtitle="Operational recommendations, source versions and saved decisions"
            action={
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setRecords(true)}
              >
                View comparison records
              </Button>
            }
          >
            <DataGrid
              rows={data.opportunities}
              onRow={(o) => router.push(caseLink(o))}
              columns={[
                { accessorKey: "name", header: "Member" },
                { accessorKey: "condition", header: "Finding" },
                { accessorKey: "version", header: "Version" },
                { accessorKey: "evidence", header: "Evidence" },
                {
                  accessorKey: "status",
                  header: "Review status",
                  cell: ({ getValue }) => <Status value={String(getValue())} />,
                },
              ]}
              searchLabel="Search contribution records"
            />
          </Panel>
        </>
      )}
      <Modal
        open={method}
        onOpenChange={setMethod}
        title="Comparison methodology"
        description="Synthetic comparison · SYN-AI-COMP-001-v1"
      >
        <Notice>
          Authored illustration, not a clinical study, causal estimate or
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
        title="Synthetic evaluation records"
        description="200 charts, separate from the operational population."
      >
        <DataGrid
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
        <Button onClick={exportReport}>Download all chart records</Button>
      </Modal>
    </>
  );
}
function DomainView({
  domain,
  data,
  user,
  onMethod,
}: {
  domain: string;
  data: Snapshot;
  user: User;
  onMethod: () => void;
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
  type DomainRow = {
    id: string;
    member_id?: string;
    name: string;
    category: string;
    status: string;
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
              }))
            : relevant.map((o) => ({
                id: o.id,
                member_id: o.member_id,
                name: o.name || o.member_id,
                category: o.condition,
                status: o.qa_status || o.status,
              }));
  const groupBy = domain === "Risk & conditions" ? "category" : "status";
  const counts = rows.reduce<Record<string, number>>((result, row) => {
    const key = row[groupBy];
    result[key] = (result[key] || 0) + 1;
    return result;
  }, {});
  const series = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 100)
    .map(([name, value]) => ({ name: label(name), value }));
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
          label={["Coding & QA", "Executive", "Risk & conditions", "Suspecting"].includes(domain) ? "QA-approved actionable reviews" : "Completed outcomes"}
          value={num(completed)}
          note={domain === "Coding & QA" ? "Terminal review approved independently" : domain === "Retrieval" ? "Published usable source" : domain === "Submissions" ? "Accepted by the simulated receiver" : "Completion follows the selected workflow"}
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
      <Panel
        title={`${domain} · current work`}
        subtitle="All categories; counts derive from the records below."
      >
        {rows.length && series.length === 1 ? (
          <div className="padded">
            <p className="body-copy">
              {series[0].value} records · {series[0].name}. Browse the
              individual records below.
            </p>
          </div>
        ) : rows.length ? (
          <div
            className="chart-frame"
            style={{ height: Math.max(260, series.length * 36 + 60) }}
          >
            <ResponsiveContainer
              width="100%"
              height="100%"
              initialDimension={{ width: 600, height: 260 }}
            >
              <BarChart
                data={series}
                layout="vertical"
                margin={{ left: 8, right: 30, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis
                  type="number"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={280}
                  interval={0}
                  fontSize={13}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip />
                <Bar
                  dataKey="value"
                  name="Records"
                  fill="#347de0"
                  radius={[0, 4, 4, 0]}
                  maxBarSize={26}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <Empty
            title="No activity yet"
            description="Run an analysis in Suspect registry to view results here."
          />
        )}
      </Panel>
      <Panel title={`${domain} records`}>
        <DataGrid
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
            { accessorKey: "category", header: "Context" },
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
