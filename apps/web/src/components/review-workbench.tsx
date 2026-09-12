"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Check, LoaderCircle } from "lucide-react";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { Empty, Status, Notice, Modal } from "./shared";
import { SourceDocument, isAuthored } from "./source-document";
import { api, label } from "@/lib/api";
import type { Member } from "@/lib/types";
import type { WorkspaceProps } from "./workspaces";
import { useDraft, useUrlState, safeReturn } from "@/hooks/workspace-state";
export function ReviewWorkbench({
  id,
  user,
  act,
}: WorkspaceProps & { id: string }) {
  const params = useSearchParams();
  const [docId, setDocId] = useUrlState("document", "");
  const [decision, setDecision] = useDraft(`review-${id}-decision`, "");
  const [note, setNote] = useDraft(`review-${id}-note`, "");
  const [busy, setBusy] = useState(false);
  const [queryOpen, setQueryOpen] = useState(false);
  const [query, setQuery] = useDraft(
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
  const editable = user.permissions.includes("review");
  const qa = user.permissions.includes("qa");
  useEffect(() => {
    if (o?.draft_note && o.review_state === "paused") setNote(o.draft_note);
  }, [o?.draft_note, o?.review_state]);
  useEffect(() => {
    if (!note) return;
    const prevent = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", prevent);
    return () => window.removeEventListener("beforeunload", prevent);
  }, [note]);
  const run = async (action: string, value = "", text = note) => {
    setBusy(true);
    try {
      await act({ action, id, value, note: text });
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
  const blocked =
    ["MB-000002", "MB-000003", "MB-000006"].includes(id) && !m.later_encounter;
  const gate = blocked
    ? id === "MB-000006"
      ? "Signed, eligible encounter documentation is required before supported coding."
      : id === "MB-000003"
        ? "Indirect signals are not a diagnosis. A current assessment and a new source review are required."
        : "Historical documentation needs a current assessment before supported coding."
    : "";
  const saveReason = !decision
    ? "Select a decision to continue."
    : decision === "resolved_supported" && blocked
      ? gate
      : !note.trim()
        ? "Add a rationale that references the reviewed source."
        : "";
  const context =
    doc?.pages.flatMap((p) =>
      p.sections.filter((s) => isAuthored(doc, s.heading)),
    ) || [];
  const qaReason =
    o?.qa_status !== "awaiting_qa"
      ? "A completed review must be sent to QA first."
      : o?.reviewer === user.id || o?.reviewer === user.email
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
        <p>Service year 2026 · Payment year 2027</p>
        <Status value={o?.status || m.status} />
      </div>
      <nav className="workbench-mobile-tabs" aria-label="Review sections">
        <a href="#review-source">Source</a>
        <a href="#review-decision">Finding and decision</a>
      </nav>
      <div className="workbench-frame">
        <aside className="finding-rail">
          <header>
            <h2>Findings</h2>
            <small>{m.opportunities?.length || 0} linked to this chart</small>
          </header>
          <div className="rail-body">
            <div className="finding-card">
              <h3>{m.condition}</h3>
              <p>{o?.evidence || m.evidence} evidence</p>
              <Status value={o?.status || m.status} />
            </div>
            <small>
              {o?.id} · Version {o?.version}
            </small>
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
            void run("open_evidence", "", `Inspected ${docId}`);
          }}
          onInspect={() => {
            void run("open_evidence", "", `Inspected ${doc?.id}`);
          }}
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
            <small>
              {o?.id} · Recommendation v{o?.version}
            </small>
          </header>
          <div
            className="decision-scroll"
            tabIndex={0}
            aria-label="Scrollable review context"
          >
            <h3>{m.condition}</h3>
            <p className="body-copy">{m.summary}</p>
            <div className="badge-row">
              <span>{o?.evidence} evidence</span>
              <Status value={o?.status || m.status} />
            </div>
            {gate && <Notice>{gate}</Notice>}
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
            {editable && (
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
            {o?.decision_note && (
              <details open>
                <summary>Saved review</summary>
                <p>{o.decision_note}</p>
                {o.qa_status && <Status value={o.qa_status} />}
              </details>
            )}
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
                Precomputed demo recommendation · v{o?.version}. Source text is
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
            {user.permissions.includes("query") && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setQueryOpen(true)}
              >
                Create clarification task
              </Button>
            )}
            {user.permissions.includes("request_evidence") && (
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
                  {saveReason ||
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
                  disabled={!note.trim() || busy}
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
                    onClick={() => run("qa", "passed", "")}
                  >
                    Pass QA
                  </Button>
                  <Button
                    className="flex-1"
                    variant="outline"
                    disabled={!!qaReason || busy}
                    onClick={() =>
                      run("qa", "rework", "Returned for clarification")
                    }
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
