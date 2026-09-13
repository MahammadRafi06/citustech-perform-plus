"use client";

import { useState } from "react";
import Link from "next/link";
import { useQueries, useQuery } from "@tanstack/react-query";
import { ArrowDownToLine, ArrowRight, ArrowUpRight, Check, FileText, RotateCcw, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { Checkbox } from "./ui/checkbox";
import { PageHeader, Panel, Empty, Status, Avatar, DataGrid, Drawer, Metric, SelectField } from "./shared";
import { useUrlState } from "@/hooks/workspace-state";
import { api, download, label } from "@/lib/api";
import type { Member, Submission } from "@/lib/types";
import type { WorkspaceProps } from "./workspaces";
import { RiskReconciliation } from "./risk-ui";

function linkedAttempts(records: Submission[], selected: Submission) {
  const sameMember = records.filter((record) => record.member_id === selected.member_id);
  const connected = new Set([selected.id]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const record of sameMember) {
      const identifiers = [record.id, record.original_id, record.retry_of].filter((id): id is string => !!id);
      if (!identifiers.some((id) => connected.has(id))) continue;
      for (const id of identifiers) {
        if (!connected.has(id)) {
          connected.add(id);
          changed = true;
        }
      }
    }
  }
  return sameMember.filter((record) => connected.has(record.id));
}

export function AssessmentSubmissions({ data, user, route, act }: WorkspaceProps) {
  const [memberFilter, setMemberFilter] = useUrlState("member", "");
  const [detailId, setDetailId] = useUrlState("record", "");
  const [selected, setSelected] = useState<string[]>(data.members.filter((m) => m.showcase && ["MB-000001", "MB-000004"].includes(m.id)).map((m) => m.id));
  const [response, setResponse] = useState("acknowledged");
  const [busy, setBusy] = useState(false);
  const detail = data.submissions.find((record) => record.id === detailId);
  const records = data.submissions.filter((record) => !memberFilter || record.member_id === memberFilter);
  const cases = data.members.filter((member) => member.showcase);
  const caseQueries = useQueries({ queries: selected.map((id) => ({ queryKey: ["member", id, user.id], queryFn: () => api<Member>(`/members/${id}`), enabled: route === "audit" })) });
  const approvalContext = useQuery({ queryKey: ["member", memberFilter, user.id], queryFn: () => api<Member>(`/members/${memberFilter}`), enabled: route === "submissions" && !!memberFilter });
  const exportRecords = (kind: string, ids: string[]) => download(kind, user.csrf_token, ids).then(() => toast.success("Package downloaded")).catch((error) => toast.error(error.message));
  const run = async (action: string, id: string, value?: string, findingId?: string) => {
    setBusy(true);
    try {
      const result = await act({ action, id, finding_id: findingId, value });
      if (result && typeof result === "object" && "submission_id" in result && typeof result.submission_id === "string") setDetailId(result.submission_id);
      if (action === "receiver" && value === "acknowledged") setResponse("accepted");
      else if (action === "correction" || (action === "prepare" && value !== "reconcile")) setResponse("acknowledged");
    } catch {} finally { setBusy(false); }
  };
  const stageNames = { sources: "Original source passages", recommendations: "Recommendation snapshots", review: "Saved review decisions", independent_qa: "Independent QA approval", linked_submission: "Linked submission", receiver_outcome: "Recorded receiver outcome", prepared_report: "Prepared report comparison" };
  if (route === "audit") return <>
    <PageHeader title="Audit workspace" description="Trace the selected case from original evidence through each recorded outcome.">
      <Button disabled={!selected.length || caseQueries.some((query) => query.isPending || query.isError)} onClick={() => exportRecords("audit", selected)}><ArrowDownToLine size={16} />Generate evidence package</Button>
    </PageHeader>
    <div className="audit-layout">
      <Panel title="Select case records" subtitle="The package includes only selected members and their linked history.">
        <div className="cohort-picker padded">{cases.map((member) => <label key={member.id}>
          <Checkbox checked={selected.includes(member.id)} onCheckedChange={(checked) => setSelected((current) => checked ? [...current, member.id] : current.filter((id) => id !== member.id))} />
          <Avatar name={member.name} id={member.id} /><span><strong>{member.name}</strong><small>{member.id} · {member.condition}</small></span><Status value={member.evidence} />
        </label>)}</div>
      </Panel>
      <Panel title="Recorded chain coverage" subtitle={`${selected.length} selected cases · coverage derives from retained records`}>
        <div className="padded">
          {!selected.length ? <Empty title="Select a case to inspect the chain" /> : caseQueries.some((query) => query.isPending) ? <p className="body-copy">Loading the selected case records…</p> : caseQueries.some((query) => query.isError) ? <Empty title="A selected case could not be loaded" description="Refresh the workspace before generating this package." /> : <>
            <div className="assessment-readiness">{Object.entries(stageNames).map(([key, name]) => <div key={key}><span>{name}</span><strong>{caseQueries.filter((query) => query.data?.audit_trace?.stages[key]).length} / {selected.length} cases</strong></div>)}</div>
            <p className="body-copy">Unavailable stages are identified in the readable manifest and machine-readable chain. Exporting preserves decisions, source quotations and all rejected attempts; it does not certify formal audit readiness.</p>
          </>}
        </div>
      </Panel>
    </div>
    {caseQueries.filter((query) => query.data).map((query) => { const member = query.data!; const trace = member.audit_trace; return <Panel key={member.id} title={member.name} subtitle={trace?.readiness || "Trace unavailable"}>
      <div className="padded"><div className="assessment-readiness"><div><span>Source passages</span><strong>{trace?.source_refs.length || 0}</strong></div><div><span>Retained review / QA decisions</span><strong>{trace?.decisions.length || 0} / {trace?.qa.length || 0}</strong></div><div><span>Submission attempts</span><strong>{trace?.submissions.length || 0}</strong></div></div>
      {!!trace?.missing_links.length && <p className="body-copy">Unavailable: {trace.missing_links.map((stage) => stageNames[stage as keyof typeof stageNames] || label(stage)).join(", ")}.</p>}
      <div className="button-row"><Button asChild variant="outline" size="sm"><Link href={`/members/${member.id}?tab=Timeline&returnTo=${encodeURIComponent("/audit")}`}>Inspect decision history<ArrowRight size={14} /></Link></Button>{user.screens.includes("submissions") && <Button asChild variant="outline" size="sm"><Link href={`/submissions?member=${member.id}`}>Inspect attempts<ArrowRight size={14} /></Link></Button>}</div></div>
    </Panel>; })}
  </>;
  const preparedCases = data.opportunities.filter((opportunity) => opportunity.eligibility?.transmission_configured && opportunity.eligibility?.prepared_code && (!memberFilter || opportunity.member_id === memberFilter));
  return <>
    <PageHeader title="Submission operations" description="Prepare approved records, retain each attempt and follow the simulated receiver.">
      <Button variant="outline" onClick={() => exportRecords("submissions", records.map((record) => record.id))}><ArrowDownToLine size={16} />Export records</Button>
    </PageHeader>
    <div className="metric-grid">
      <Metric label="Submission attempts" value={String(records.length)} note="Original records and linked attempts" icon={<Send size={18} />} />
      <Metric label="Receiver accepted" value={String(records.filter((record) => record.status === "accepted").length)} note="Acceptance is separate from payment" icon={<Check size={18} />} />
      <Metric label="Receiver rejected" value={String(records.filter((record) => record.status === "rejected").length)} note="Rejected attempts remain retained" icon={<RotateCcw size={18} />} />
      <Metric label="Prepared comparisons" value={String(records.filter((record) => record.report_comparison).length)} note="Synthetic report · payment unreconciled" icon={<FileText size={18} />} />
    </div>
    <Panel title="Approved review handoff" subtitle="A submission specialist explicitly prepares the exact current decision after independent QA.">
      {preparedCases.map((opportunity) => {
        const existing = data.submissions.filter((record) => record.decision_id && record.decision_id === opportunity.current_decision_id).at(-1);
        const code = opportunity.eligibility!.prepared_code!;
        const operation = code.operation || (opportunity.type === "integrity_review" ? "delete" : "add");
        const validDecision = operation === "add" ? opportunity.status === "resolved_supported" : opportunity.status === "resolved_unsupported";
        return <div className="assessment-ready-row" key={opportunity.id}><div><strong>{data.members.find((member) => member.id === opportunity.member_id)?.name || opportunity.name || opportunity.member_id}</strong><small>{label(operation)} · {code.code} · {code.release}</small></div><div><Status value={opportunity.qa_status || "not_submitted"} /><small>{existing ? `Linked record ${existing.id}` : opportunity.completion?.reason || "Awaiting independent QA"}</small></div><div className="button-row"><Button asChild size="sm" variant="ghost"><Link href={`/members/${opportunity.member_id}?tab=Timeline&returnTo=${encodeURIComponent("/submissions")}`}>Review basis</Link></Button>{existing ? <Button size="sm" variant="outline" onClick={() => setDetailId(existing.id)}>Open record<ArrowRight size={14} /></Button> : <Button size="sm" disabled={busy || !user.permissions.includes("prepare") || !opportunity.completion?.complete || !validDecision} onClick={() => run("prepare", opportunity.member_id, undefined, opportunity.id)}>Prepare {operation === "delete" ? "deletion" : "addition"}</Button>}</div></div>;
      })}
      {!preparedCases.length && <Empty title="No prepared record for this selection" description="The connected receiver workflow is configured for Jordan’s approved addition and Taylor’s approved deletion." />}
    </Panel>
    {memberFilter && <RiskReconciliation memberId={memberFilter} user={user} submissionId={detail?.id} />}
    {memberFilter && approvalContext.data && <div className="assessment-context"><strong>{approvalContext.data.name} · current review context</strong><p>{approvalContext.data.eligibility?.reason}</p></div>}
    <Panel>
      <DataGrid<Submission> rows={records} onRow={(record) => setDetailId(record.id)} toolbar={<SelectField label="Submission member" value={memberFilter} onChange={setMemberFilter} options={[{ value: "", label: "All members" }, ...cases.map((member) => ({ value: member.id, label: member.name }))]} />} exportAction={(filtered) => exportRecords("submissions", filtered.map((record) => record.id))} columns={[
        { accessorKey: "id", header: "Record", cell: ({ getValue }) => <span className="whitespace-nowrap">{String(getValue())}</span> },
        { accessorKey: "member_id", header: "Member", cell: ({ getValue }) => data.members.find((member) => member.id === getValue())?.name || String(getValue()) },
        { id: "operation", header: "Operation", cell: ({ row }) => label(row.original.operation || row.original.type) },
        { accessorKey: "status", header: "Receiver status", cell: ({ getValue }) => <Status value={String(getValue())} /> },
        { accessorKey: "decision_id", header: "Approved decision", cell: ({ getValue }) => getValue() ? String(getValue()) : "Original prepared record" },
        { accessorKey: "original_id", header: "Original record", cell: ({ getValue }) => getValue() ? String(getValue()) : "—" },
      ]} />
    </Panel>
    <Drawer open={!!detail} onOpenChange={(open) => !open && setDetailId("")} title={detail?.id || "Submission record"} description="Simulated receiver · each action retains its actual timestamp">
      {detail && <div className="assessment-submission-detail">
        <div className="badge-row"><Status value={detail.status} /><span>{label(detail.operation || detail.type)}</span>{detail.corrected && <Status value="corrected" />}</div>
        <p className="body-copy">{detail.reason}</p>
        <div className="assessment-readiness">
          <div><span>Member</span><Link href={`/members/${detail.member_id}?returnTo=${encodeURIComponent(`/submissions?record=${detail.id}`)}`}>{data.members.find((member) => member.id === detail.member_id)?.name || detail.member_id}<ArrowUpRight size={12} /></Link></div>
          <div><span>Code / release</span><strong>{detail.code || "Original source record"}{detail.code_release ? ` · ${detail.code_release}` : ""}</strong></div>
          <div><span>Transport receipt</span><Status value={detail.transport_status || "not_recorded"} /></div>
          <div><span>Receiver acceptance</span><Status value={detail.receiver_status || detail.status} /></div>
          <div><span>Diagnosis eligibility</span><Status value={detail.eligibility_status || "not_evaluated"} /></div>
          <div><span>Prepared report</span><Status value={detail.reported_status || "not_compared"} /></div>
          <div><span>Payment reconciliation</span><Status value={detail.reconciliation_status || "unreconciled"} /></div>
        </div>
        <h3 className="section-title">Retained approval and evidence</h3>
        {detail.review_snapshot ? <div className="assessment-trace">
          <div><strong>Review · {detail.decision_id}</strong><p>{detail.review_snapshot.note}</p><small>{detail.review_snapshot.actor} · {detail.review_snapshot.at ? new Date(detail.review_snapshot.at).toLocaleString() : "Original timestamp unavailable"}</small></div>
          <div><strong>Independent QA · {detail.qa_id}</strong><p>{detail.qa_snapshot?.note || "Approved review retained."}</p><small>{detail.qa_snapshot?.actor} · {label(detail.qa_snapshot?.status || "unavailable")}</small></div>
          <div><strong>Recommendation {detail.recommendation_snapshot?.version || "retained"}</strong><p>{detail.recommendation_snapshot?.summary}</p></div>
          {detail.source_refs?.map((source, index) => <div key={`${source.document_id}-${index}`}><Link href={`/members/${detail.member_id}?tab=Evidence+%26+documents&document=${source.document_id}&page=${source.page}&section=${encodeURIComponent(source.section)}`}><FileText size={13} />{source.document_id} · p. {source.page} · {source.section}<ArrowUpRight size={12} /></Link><blockquote>{source.quote}</blockquote></div>)}
        </div> : <p className="body-copy">This original prepared record predates the connected review handoff. A new linked decision must be approved before its correction can be prepared.</p>}
        {!["accepted", "rejected"].includes(detail.status) && <>
          <h3 className="section-title">Receiver response</h3>
          <SelectField label="Simulated receiver response" value={response} onChange={setResponse} options={["acknowledged", "accepted", "rejected"].map((value) => ({ value, label: label(value) }))} />
          <div className="drawer-actions">
            <Button disabled={busy || !user.permissions.includes("receiver")} onClick={() => run("receiver", detail.id, response)}><Check size={15} />Record response</Button>
          </div>
        </>}
        {detail.status === "rejected" && <>
          <h3 className="section-title">Rejected attempt</h3>
          <p className="body-copy">{detail.decision_id
            ? `The rejected attempt remains unchanged. A retry preserves the intended ${label(detail.operation || detail.type).toLowerCase()} operation and approved evidence basis.`
            : "The original rejection is retained. Prepare the current independently approved decision from the review handoff to continue."}</p>
          {detail.decision_id && user.permissions.includes("correction") && <Button variant="outline" disabled={busy} onClick={() => run("correction", detail.id)}><RotateCcw size={15} />Prepare retry</Button>}
        </>}
        {detail.status === "accepted" && <>
          <h3 className="section-title">Receiver outcome retained</h3><Button variant="outline" onClick={() => { setMemberFilter(detail.member_id); setDetailId(""); }}>Open eligibility and report reconciliation<ArrowRight size={14} /></Button>
          <p className="body-copy">This attempt’s terminal acceptance remains linked to its receiver history.</p>

        </>}
        {detail.report_comparison && <div className="assessment-context">
          <strong>{detail.report_comparison.name}</strong>
          <p>{detail.report_comparison.basis}</p>
          <div className="table-scroll"><table className="assessment-inputs"><thead><tr><th>Record field</th><th>Expected</th><th>Prepared report</th></tr></thead><tbody>
            <tr><td>Code</td><td>{detail.report_comparison.expected.code}</td><td>{detail.report_comparison.reported.code}</td></tr>
            <tr><td>Record presence</td><td>{label(detail.report_comparison.expected.record_presence)}</td><td>{label(detail.report_comparison.reported.record_presence)}</td></tr>
            <tr><td>Intended operation</td><td>{label(detail.report_comparison.expected.operation)}</td><td>Compared using record presence</td></tr>
          </tbody></table></div>
          <p>{detail.report_comparison.explanation}</p>
          <div className="assessment-trace"><div><small>Retained reference</small><strong>{detail.report_comparison.report_fixture_id}</strong><small>{detail.report_comparison.id} · {new Date(detail.report_comparison.at).toLocaleString()}</small></div><div><small>Linked record / approved decision</small><strong>{detail.report_comparison.submission_id} · {detail.report_comparison.decision_id}</strong><small>Independent QA {detail.report_comparison.qa_id} · {detail.report_comparison.member_id}</small></div></div>
          <p>Diagnosis eligibility: {label(detail.report_comparison.diagnosis_eligibility).toLowerCase()}. Payment: {label(detail.report_comparison.payment_reconciliation).toLowerCase()}.</p>
        </div>}
        <h3 className="section-title">Linked attempts</h3>
        <div className="linked-members">{linkedAttempts(data.submissions, detail).map((record) => <button className="button-row" key={record.id} onClick={() => setDetailId(record.id)}><span>{record.id} · {label(record.operation || record.type)}</span><Status value={record.status} /></button>)}</div>
        {!!detail.history?.length && <><h3 className="section-title">This attempt’s receiver history</h3><div className="timeline">{detail.history.map((event, index) => <div key={index}><strong>{label(event.stage)} · {label(event.status)}</strong><small>{new Date(event.at).toLocaleString()} · {event.terminal ? "Terminal receiver outcome" : "Transport only"}</small></div>)}</div></>}
      </div>}
    </Drawer>
  </>;
}
