"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Check, LoaderCircle } from "lucide-react";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { Empty, Status, Notice, Modal } from "./shared";
import { useRiskContext } from "./risk-ui";
import { SourceDocument, isAuthored } from "./source-document";
import { api, label } from "@/lib/api";
import type { Member } from "@/lib/types";
import type { WorkspaceProps } from "./workspaces";
import { useDraft, useUrlState, safeReturn } from "@/hooks/workspace-state";
import { CaseClaims, CaseNextSteps, EligibilityNotice, ReviewHistory } from "./assessment-ui";
export function ReviewWorkbench({
  id,
  data,
  user,
  act,
}: WorkspaceProps & { id: string }) {
  const params = useSearchParams();
  const risk = useRiskContext();
  const [findingId, setFindingId] = useUrlState("finding", "");
  const [qaDisposition, setQaDisposition] = useState("passed");
  const [docId, setDocId] = useUrlState("document", "");
  const [decision, setDecision] = useDraft(`review-${id}-${findingId || "single"}-decision`, "");
  const [note, setNote] = useDraft(`review-${id}-${findingId || "single"}-note`, "");
  const [busy, setBusy] = useState(false);
  const [queryOpen, setQueryOpen] = useState(false);
  const [qaOpen, setQaOpen] = useState(false);
  const [query, setQuery] = useDraft(
    `query-${id}-${findingId || "single"}`,
    "Please review the available history and document your current clinical assessment, including if this condition is not supported.",
  );
  const result = useQuery({
    queryKey: ["member", id, user.id, findingId],
    queryFn: () => api<Member>(`/members/${id}${findingId ? `?finding=${encodeURIComponent(findingId)}` : ""}`),
  });
  const m = result.data;
  const o = m?.opportunities?.find((item) => item.id === m.selected_finding_id) || (m?.opportunities?.length === 1 ? m.opportunities[0] : undefined);
  const [qaNote, setQaNote] = useDraft(`review-${id}-${o?.id || findingId || "single"}-${o?.current_decision_id || "no-decision"}-qa-note`, "");
  const workflowConfigId = o?.decision_history?.find((decision) => decision.id === o.current_decision_id)?.risk_context?.config_id || "ma_v28_py2027_forecast";
  const workflowConfig = risk.configurations.find((config) => config.id === workflowConfigId);
  const eligibility = o?.eligibility || m?.eligibility;
  const doc = m?.documents?.find((d) => d.id === docId) || m?.documents?.find((d) => eligibility?.source_ids.includes(d.id)) || m?.documents?.[0];
  const editable = user.permissions.includes("review");
  const qa = user.permissions.includes("qa");
  useEffect(() => {
    if (o?.review_state === "paused") {
      setNote(o.draft_note || "");
      setDecision(o.draft_decision || "");
    }
  }, [o?.id, o?.draft_note, o?.draft_decision, o?.review_state]);
  useEffect(() => {
    if (!note) return;
    const prevent = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", prevent);
    return () => window.removeEventListener("beforeunload", prevent);
  }, [note]);
  const run = async (action: string, value = "", text = note) => {
    setBusy(true);
    try {
      await act({ action, id, finding_id: o?.id, decision_id: action === "qa" ? o?.current_decision_id : undefined, value, note: text });
      if (action === "review" || action === "complete_review") {
        setNote("");
        setDecision("");
      }
      await result.refetch();
      return true;
    } catch {
      return false;
    } finally {
      setBusy(false);
    }
  };
  if (result.isPending)
    return (
      <Empty
        title="Opening chart review"
        description="Retrieving source documents and saved decisions…"
      />
    );
  if (!m)
    return (
      <Empty title="Member unavailable" description={result.error?.message} />
    );
  const saveReason = !eligibility?.reviewable
    ? eligibility?.reason || "Review eligibility is unavailable. Refresh this case before saving."
    : !decision
    ? "Select a decision to continue."
    : !eligibility.allowed_decisions.includes(decision)
      ? eligibility.reason
      : !note.trim()
        ? "Add a rationale that references the reviewed source."
        : "";
  const context =
    doc?.pages.flatMap((p) =>
      p.sections.filter((s) => isAuthored(doc, s.heading)),
    ) || [];
  const qaReason =
    !o?.current_decision_id
      ? o?.review_state === "fresh_review_required"
        ? "The evidence changed. A fresh review is required before independent QA."
        : "Save a current review before sending it to independent QA."
      : o.qa_status === "passed"
        ? o.completion?.complete
          ? "Independent QA passed. The approved review is ready for the next case step."
          : "Independent QA passed. The case still requires further assessment or follow-up."
        : o.qa_status === "rework"
          ? "Returned for rework. The reviewer must submit a revised decision before QA can continue."
          : o.qa_status !== "awaiting_qa"
            ? "Submit the current review to independent QA to continue."
            : o.reviewer === user.id || o.reviewer === user.email
              ? "A different reviewer must perform independent QA."
              : "";
  return (
    <>
      <div className="back-link">
        <Link href={safeReturn(params?.get("returnTo"), "/reviews")}>
          <ArrowLeft size={14} />
          Back to review queue
        </Link>
        <Link href={`/members/${id}`}>
          Member 360 <ArrowRight size={14} />
        </Link>
      </div>
      <div className="workbench-identity">
        <div>
          <h1>{m.name}</h1>
          <p>
            {id} · {m.age} years · {m.sex} · {m.plan}
          </p>
        </div>
        <p>Service year {data.program_context?.service_year || 2026} · Payment year {data.program_context?.payment_year || 2027}{risk.configId !== workflowConfigId && <><br /><small>Clinical scoring workflow: {workflowConfig?.name || workflowConfigId}</small></>}</p>
        <Status value={o?.status || m.status} />
      </div>
      <div className="workbench-frame">
        <aside className="finding-rail">
          <header>
            <h2>Findings</h2>
            <small>{m.opportunities?.length || 0} linked to this chart</small>
          </header>
          <div className="rail-body">
            {(m.opportunities?.length || 0) > 1 && <label className="form-field">Finding<select aria-label="Select finding to review" value={o?.id || ""} onChange={(event) => { setFindingId(event.target.value); setDocId(""); }}><option value="">Select a finding</option>{m.opportunities?.map((item) => <option key={item.id} value={item.id}>{item.condition} · {item.id}</option>)}</select></label>}
            <div className="finding-card">
              <h3>{o?.condition || "Choose a finding"}</h3>
              <p>{o?.evidence || m.evidence} evidence</p>
              <Status value={o?.status || m.status} />
            </div>
            {o && <small>{o.id} · Recommendation v{o.recommendation_version || o.version}</small>}
            <div className="review-context-item">
              <strong>Assigned to</strong>
              <p>{o?.owner || "Unassigned"}</p>
              <strong>Due date</strong>
              <p>{o?.due_date || "Not set"}</p>
            </div>
          </div>
        </aside>
        <SourceDocument
          documents={m.documents || []}
          selected={doc}
          onSelect={(docId) => {
            setDocId(docId);
          }}
          onInspect={o ? () => {
            void run("open_evidence", "", `Inspected ${doc?.id}`);
          } : undefined}
        />
        <section
          className="decision-pane"
          id="review-decision"
          aria-label="Finding and decision"
        >
          <header>
            <h2>
              {editable
                ? "Review decision"
                : qa
                  ? "Independent QA"
                  : "Review context"}
            </h2>
            {o && <small>{o.id} · Recommendation v{o.recommendation_version || o.version}</small>}
          </header>
          <div
            className="decision-scroll"
            tabIndex={0}
            aria-label="Scrollable review context"
          >
            <h3>{o?.condition || "Choose a finding"}</h3>
            <p className="body-copy">{m.summary}</p>
            <div className="badge-row">
              {o && <span>{o.evidence} evidence</span>}
              <Status value={o?.status || m.status} />
            </div>
            <EligibilityNotice eligibility={eligibility} />
            {eligibility?.prepared_code && <div className="review-context-item">
              <small>{eligibility.prepared_code.operation === "delete" ? "Prior code to remove" : "Prepared code output"}</small>
              <strong>{eligibility.prepared_code.code} · {eligibility.prepared_code.description}</strong>
              <small className="block">{eligibility.prepared_code.release}</small>
              <a className="mt-1 inline-flex text-sm underline underline-offset-4" href={eligibility.prepared_code.reference_url} target="_blank" rel="noreferrer">Code reference</a>
              {eligibility.prepared_code.basis && <details><summary>Code basis</summary><p>{eligibility.prepared_code.basis}</p></details>}
            </div>}
            {!!m.claims?.length && <details><summary>Finding-specific passages · {m.claims.length}</summary><CaseClaims claims={m.claims} /></details>}
            {o?.qa_status === "rework" && <Notice>
              <strong>Returned for rework</strong>
              <p>{o.qa_history?.slice().reverse().find((q) => q.status === "rework")?.note || "Review the QA feedback before submitting a new decision."}</p>
            </Notice>}
            {context.length > 0 && (
              <details>
                <summary>Authored review context</summary>
                {context.map((s, i) => (
                  <div key={i} className="review-context-item">
                    <strong>{s.heading}</strong>
                    <p>{s.text}</p>
                  </div>
                ))}
                <p>
                  Application-authored context retained from the source fixture;
                  not a clinician quotation.
                </p>
              </details>
            )}
            {editable && eligibility?.reviewable && (
              <>
                <fieldset className="decision-options">
                  <legend className="sr-only">Review decision</legend>
                  {[
                    [
                      "resolved_supported",
                      "Supported by evidence",
                      "Current, eligible documentation supports this finding.",
                    ],
                    [
                      "resolved_unsupported",
                      "Not supported",
                      "Record why the reviewed source does not support it.",
                    ],
                    [
                      "awaiting_assessment",
                      "Needs current assessment",
                      "Route for clarification and retain this review.",
                    ],
                  ].map(([value, title, desc]) => (
                    <label
                      className={decision === value ? "selected" : ""}
                      key={value}
                    >
                      <input
                        type="radio"
                        name="review-decision"
                        value={value}
                        checked={decision === value}
                        disabled={!eligibility.allowed_decisions.includes(value)}
                        onChange={() => setDecision(value)}
                      />
                      <span>
                        <strong>{title}</strong>
                        <small>{desc}</small>
                      </span>
                    </label>
                  ))}
                </fieldset>
                <div className="form-field">
                  <Label htmlFor="review-rationale">Review rationale</Label>
                  <textarea
                    id="review-rationale"
                    rows={4}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Cite the source and explain your decision…"
                  />
                </div>
                <div className="button-row">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={busy}
                    onClick={() =>
                      run(
                        o?.review_state === "paused"
                          ? "start_review"
                          : "pause_review",
                        decision,
                      )
                    }
                  >
                    {o?.review_state === "paused"
                      ? "Resume review"
                      : "Pause and save draft"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={busy}
                    onClick={() =>
                      run("defer", "", "Deferred for documentation")
                    }
                  >
                    Defer
                  </Button>
                </div>
              </>
            )}
            {!!o?.decision_history?.length && <details open><summary>Saved reviews and QA</summary><ReviewHistory opportunity={o} /></details>}
            {!o?.decision_history?.length && o?.decision_note && <details open><summary>Saved review</summary><p>{o.decision_note}</p>{o.qa_status && <Status value={o.qa_status} />}</details>}
            <details open={o?.qa_status === "awaiting_qa" || o?.qa_status === "passed"}><summary>Next role and case steps</summary><CaseNextSteps member={m} user={user} accounts={data.assignment_options} busy={busy} onAction={(action, value) => void run(action, value)} /></details>
            <details>
              <summary>Evidence provenance</summary>
              <p>
                {doc?.id} · {doc?.kind} · {doc?.date}
              </p>
              <p>
                Source state: {label(doc?.source_status || "unavailable")}.
                Signature: {doc?.signature_status || "Not supplied"}.
              </p>
              <p>
                Prepared analysis · v{o?.recommendation_version || o?.version}. Source text is
                preserved. Linked citations identify supplied sections.
              </p>
              {doc?.superseded_by && <p>Superseded by {doc.superseded_by}</p>}
            </details>
            <details>
              <summary>History and related work</summary>
              {m.history?.slice(0, 10).map((e) => (
                <div className="review-context-item" key={e.id}>
                  <strong>{label(e.action)}</strong>
                  <p>{e.detail}</p>
                  <small>{new Date(e.created_at).toLocaleString()}</small>
                </div>
              ))}
              {m.tasks?.map((t) => (
                <p key={t.id}>
                  {t.title} · {label(t.status)}
                </p>
              ))}
              <div className="connected-links">
                {user.screens.includes("previsit") && (
                  <Link href={`/previsit?member=${id}`}>
                    Provider assessment <ArrowRight size={14} />
                  </Link>
                )}
                {user.screens.includes("submissions") && (
                  <Link href={`/submissions?member=${id}`}>
                    Submissions <ArrowRight size={14} />
                  </Link>
                )}
                <Link href={`/members/${id}?tab=Timeline`}>
                  Full member history <ArrowRight size={14} />
                </Link>
              </div>
            </details>
            {user.permissions.includes("query") && eligibility?.reviewable && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (!query || query.startsWith("Please review the available history")) setQuery(`Please assess ${o?.condition || m.condition} in the current encounter. Available context: ${m.summary} Source: ${doc?.id || "not yet available"}, ${doc?.date || "date unavailable"}. Document whether the condition is supported, not supported, uncertain, or needs further information, with your clinical rationale.`);
                  setQueryOpen(true);
                }}
              >
                Create clarification task
              </Button>
            )}
            {user.permissions.includes("request_evidence") && eligibility?.reviewable && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  run(
                    "request_evidence",
                    "",
                    "Request current eligible source documentation",
                  )
                }
              >
                Request evidence
              </Button>
            )}
          </div>
          <footer className="decision-footer">
            {editable && (
              <>
                <p aria-live="polite">
                  {!decision && o?.current_decision_id && o.qa_status === "awaiting_qa" ? "Current review saved and awaiting independent QA. A revised decision will start a new review." : !decision && o?.qa_status === "passed" ? "Independent QA approved the current review. The next case step is available in the handoff above." : saveReason ||
                    "The saved decision will be available for independent QA."}
                </p>
                <Button
                  disabled={!!saveReason || busy}
                  onClick={() => run("review", decision)}
                >
                  {busy ? (
                    <LoaderCircle size={16} className="animate-spin" />
                  ) : (
                    <Check size={16} />
                  )}
                  Save review and send to QA
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={!eligibility?.reviewable || !note.trim() || busy}
                  onClick={() => run("complete_review", "no_finding")}
                >
                  Complete without a supported finding
                </Button>
              </>
            )}
            {qa && (
              <>
                <p>
                  {qaReason ||
                    "Review the source and the first reviewer's rationale."}
                </p>
                <div className="flex gap-2">
                  <Button
                    className="flex-1"
                    disabled={!!qaReason || busy}
                    onClick={() => { setQaDisposition("passed"); setQaOpen(true); }}
                  >
                    Pass QA
                  </Button>
                  <Button
                    className="flex-1"
                    variant="outline"
                    disabled={!!qaReason || busy}
                    onClick={() => { setQaDisposition("rework"); setQaOpen(true); }}
                  >
                    Return for rework
                  </Button>
                </div>
              </>
            )}
            {!editable && !qa && (
              <p>Your role has read-only access to this review.</p>
            )}
          </footer>
        </section>
      </div>
      <Modal open={qaOpen} onOpenChange={setQaOpen} title={qaDisposition === "passed" ? "Pass independent QA" : "Return for rework"} description="Record your independent assessment. This rationale stays with the exact reviewed decision.">
        <div className="form-field"><Label htmlFor="qa-rationale">{qaDisposition === "passed" ? "QA rationale" : "Rework reason"}</Label><textarea id="qa-rationale" rows={4} value={qaNote} onChange={(e) => setQaNote(e.target.value)} placeholder={qaDisposition === "passed" ? "Explain why the reviewed source and decision are appropriate…" : "Identify the source or decision that needs correction…"} /></div>
        <Button disabled={!qaNote.trim() || busy || !!qaReason} onClick={async () => { if (await run("qa", qaDisposition, qaNote)) { setQaOpen(false); setQaNote(""); } }}>{qaDisposition === "passed" ? "Pass QA" : "Return to reviewer"}</Button>
      </Modal>
      <Modal
        open={queryOpen}
        onOpenChange={setQueryOpen}
        title="Clarification task"
        description="Request a current clinical assessment without suggesting a diagnosis."
      >
        <div className="form-field">
          <Label htmlFor="review-query">Request</Label>
          <textarea
            id="review-query"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <Button
          disabled={!query.trim() || busy}
          onClick={async () => {
            if (await run("query", "", query)) setQueryOpen(false);
          }}
        >
          Create task
        </Button>
      </Modal>
    </>
  );
}
