"use client";

import Link from "next/link";
import { ArrowRight, ArrowUpRight, FileText, LoaderCircle } from "lucide-react";
import { useState } from "react";
import { Button } from "./ui/button";
import { label } from "@/lib/api";
import type { AssignmentOption, Command, User, Opportunity } from "@/lib/types";
import "./assessment-workspaces.css";

export function EligibilityContext({ eligibility }: { eligibility?: {
  reviewable: boolean;
  support_allowed: boolean;
  reason: string;
  example_href?: string;
} }) {
  if (!eligibility) return null;
  return (
    <div className="assessment-context">
      <strong>{!eligibility.reviewable ? "Population record" : eligibility.support_allowed ? "Evidence available for review" : "Further review required"}</strong>
      <p>{eligibility.reason}</p>
      {!eligibility.reviewable && eligibility.example_href && (
        <Link href={eligibility.example_href}>Open a complete case <ArrowRight size={14} /></Link>
      )}
    </div>
  );
}

export function PreparedClaims({ claims, summary }: { claims?: {
  text: string;
  relation: string;
  document_id?: string;
  page?: number;
  section?: string;
  quote?: string;
  href?: string;
}[]; summary: string }) {
  if (!claims?.length) return <p>{summary}</p>;
  return <div className="assessment-claims"><p>{summary}</p><details><summary>Inspect supporting context · {claims.length} cited passages</summary>{claims.map((claim, index) => (
    <div key={`${claim.document_id}-${index}`}>
      <p>{claim.text}</p>
      <div className="assessment-citation">
        <span>{label(claim.relation)}</span>
        {claim.href && claim.document_id ? <Link href={claim.href}><FileText size={12} />{claim.document_id} · p. {claim.page}{claim.section ? ` · ${claim.section}` : ""}<ArrowUpRight size={12} /></Link> : <span>Source unavailable</span>}
      </div>
    </div>
  ))}</details></div>;
}

export function NextSteps({ steps, user, memberId, findingId, act, assignments }: {
  steps?: { label: string; role: string; href?: string; action?: string; value?: string; reason?: string }[];
  user: User;
  memberId: string;
  findingId?: string;
  act: (body: Command) => Promise<unknown>;
  assignments?: AssignmentOption[];
}) {
  const [pending, setPending] = useState<string | null>(null);
  if (!steps?.length) return null;
  return <div className="assessment-next-steps">
    {steps.map((step, index) => {
      const route = step.href?.split("?")[0].split("/").filter(Boolean)[0];
      const canAct = !!step.action && step.action !== "prepare" && user.permissions.includes(step.action);
      const canVisit = !!step.href && !!route && user.screens.includes(route);
      const accounts = assignments?.filter((account) => account.role === step.role && account.member_ids.includes(memberId));
      return <div className="assessment-next-step" key={`${step.label}-${index}`}>
        <div><strong>{step.label}</strong><small>{accounts?.length ? accounts.map((account) => account.email).join(", ") : label(step.role)}{step.reason ? ` · ${step.reason}` : ""}</small></div>
        {canAct ? <Button size="sm" variant="outline" disabled={pending !== null} onClick={async () => {
          setPending(step.label);
          try { await act({ action: step.action!, id: memberId, finding_id: findingId, value: step.value }); } catch {} finally { setPending(null); }
        }}>{pending === step.label ? <LoaderCircle size={14} className="animate-spin" /> : <ArrowRight size={14} />}Continue</Button> : canVisit ? <Button asChild size="sm" variant="outline"><Link href={step.href!}>Open<ArrowRight size={14} /></Link></Button> : <span className="assessment-handoff">Continue with {label(step.role).toLowerCase()}</span>}
      </div>;
    })}
  </div>;
}

export function CaseHistory({ opportunity }: { opportunity?: Opportunity }) {
  return <div className="assessment-history">
    {opportunity?.recommendation_history?.map((record) => <article key={`recommendation-${record.version}`}>
      <header><strong>Recommendation {record.version}</strong><span>Prepared analysis</span></header>
      <p>{record.summary}</p><small>{record.document_ids?.join(" · ") || "Retained recommendation"}{record.created_at ? ` · ${new Date(record.created_at).toLocaleString()}` : ""}</small>
    </article>)}
    {opportunity?.decision_history?.map((record) => <article key={record.id}>
      <header><strong>{label(record.decision)}</strong><span>{record.id}</span></header>
      <p>{record.note}</p><small>{record.actor || record.actor_id} · Recommendation {record.recommendation_version || "retained"}{record.at ? ` · ${new Date(record.at).toLocaleString()}` : " · Time not recorded"}</small>
      {!!record.source_refs?.length && <details><summary>Retained evidence basis · {record.source_refs.length} passages</summary>{record.source_refs.map((source, i) => <blockquote key={i}><p>{source.quote}</p><small>{source.document_id} · p. {source.page} · {source.section}</small></blockquote>)}</details>}
      {opportunity?.qa_history?.filter((qa) => qa.decision_id === record.id).map((qa) => <div className="assessment-context" key={qa.id}><strong>Independent QA · {label(qa.status)}</strong><p>{qa.note || "Approval retained with the reviewed decision."}</p><small>{qa.actor || qa.actor_id}{qa.at ? ` · ${new Date(qa.at).toLocaleString()}` : " · Time not recorded"}</small></div>)}
    </article>)}
    {!opportunity?.recommendation_history?.length && !opportunity?.decision_history?.length && <p className="body-copy">No prepared recommendation or review history is available for this record.</p>}
  </div>;
}
