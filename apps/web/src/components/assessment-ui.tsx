"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { Member, Opportunity, User, Snapshot } from "@/lib/types";
import { label } from "@/lib/api";
import { Button } from "./ui/button";
import { Notice, Status } from "./shared";

export function EligibilityNotice({ eligibility }: { eligibility: Opportunity["eligibility"] }) {
  if (!eligibility || (eligibility.reviewable && eligibility.support_allowed)) return null;
  return <Notice>
    {eligibility.reason}
    {!eligibility.reviewable && eligibility.example_href && <Link className="inline-flex items-center gap-1 ml-2" href={eligibility.example_href.replace(/^\/reviews\//, "/members/")}>Open a complete case <ArrowRight size={13} /></Link>}
  </Notice>;
}

export function CaseClaims({ claims }: { claims: Member["claims"] }) {
  if (!claims?.length) return null;
  return <div className="space-y-3">
    {claims.map((claim, index) => <div className="review-context-item" key={`${claim.document_id}-${claim.section}-${index}`}>
      <small>{label(claim.relation)}</small>
      <p>{claim.text}</p>
      <Link className="inline-flex items-center gap-1 text-sm" href={claim.href}>{claim.document_id} · p. {claim.page} · {claim.section}<ArrowRight size={13} /></Link>
    </div>)}
  </div>;
}

export function CaseNextSteps({ member, user, accounts, onAction, busy = false }: {
  member: Member;
  user: User;
  accounts?: Snapshot["assignment_options"];
  onAction?: (action: string, value?: string) => void;
  busy?: boolean;
}) {
  if (!member.next_steps?.length) return null;
  return <div className="space-y-3" aria-label="Next case steps">
    {member.next_steps.map((step, index) => {
      const screen = step.href?.split("/")[1]?.split("?")[0];
      const actionAllowed = !!step.action && step.action !== "prepare" && user.permissions.includes(step.action);
      const linkAllowed = !!step.href && user.screens.includes(screen || "");
      const nextAccount = accounts?.find((account) => account.role === step.role && account.member_ids.includes(member.id));
      return <div className="review-context-item" key={`${step.label}-${index}`}>
        <strong>{step.label}</strong>
        {step.role && <small>{nextAccount?.email || label(step.role)} continues this step</small>}
        {actionAllowed && onAction ? <Button className="mt-2" size="sm" variant="outline" disabled={busy} onClick={() => onAction(step.action!, step.value)}>Continue <ArrowRight size={13} /></Button>
          : linkAllowed ? <Link className="mt-2 inline-flex items-center gap-1 text-sm" href={step.href!}>Open workspace <ArrowRight size={13} /></Link> : null}
      </div>;
    })}
  </div>;
}

export function ReviewHistory({ opportunity }: { opportunity?: Opportunity }) {
  if (!opportunity?.decision_history?.length) return null;
  return <div className="space-y-4">
    {opportunity.decision_history.slice().reverse().map((decision) => <div className="review-context-item" key={decision.id}>
      <div className="badge-row"><Status value={decision.decision} /><small>{decision.id === opportunity.current_decision_id ? "Current review" : "Retained review"}</small></div>
      <p>{decision.note}</p>
      <small>{decision.actor} · {decision.at ? new Date(decision.at).toLocaleString() : "Time not retained"} · Recommendation v{decision.recommendation_version}</small>
      {decision.source_refs?.map((source, index) => <p className="text-sm" key={index}><Link className="inline-flex items-center gap-1" href={`/members/${opportunity.member_id}?tab=Evidence%20%26%20documents&document=${encodeURIComponent(source.document_id)}&page=${source.page}&section=${encodeURIComponent(source.section)}`}>{source.document_id} · p. {source.page} · {source.section}<ArrowRight size={12} /></Link></p>)}
      {opportunity.qa_history?.filter((qa) => qa.decision_id === decision.id).map((qa) => <div className="mt-2 border-l-2 pl-3" key={qa.id}>
        <strong>QA · {label(qa.status)}</strong>
        {qa.note && <p>{qa.note}</p>}
        <small>{qa.actor} · {qa.at ? new Date(qa.at).toLocaleString() : "Time not retained"}</small>
      </div>)}
    </div>)}
  </div>;
}
