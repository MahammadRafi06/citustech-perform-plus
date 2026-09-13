"use client";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  Sparkles,
  ArrowRight,
  LoaderCircle,
  Send,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Drawer, Notice, SelectField } from "./shared";
import { CampaignDialog } from "./campaign-planner";
import { api } from "@/lib/api";
import type { User, Snapshot, Command } from "@/lib/types";
import { useDraft } from "@/hooks/workspace-state";
import { toast } from "sonner";
import { CaseClaims } from "./assessment-ui";
import type { Member } from "@/lib/types";
type Answer = {
  answer: string;
  basis: string;
  basis_key?: string;
  claims?: Member["claims"];
  sources: { label: string; href: string }[];
  proposal?: { member_ids: string[]; name: string; filter: string; intervention?: string; rankings?: { member_id: string; rank: number; reasons: string[] }[] };
};
export function FixtureAssistant({
  user,
  data,
  act,
}: {
  user: User;
  data: Snapshot;
  act: (c: Command) => Promise<unknown>;
}) {
  const contextVersion = useRef(0);
  const path = usePathname();
  const params = useSearchParams();
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useDraft("assistant-question", "");
  const [member, setMember] = useState("");
  const [storedAnswer, setAnswer] = useState<{ result: Answer; context: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [campaign, setCampaign] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [proposal, setProposal] = useState<{ name: string; intervention?: string }>();
  const selectedMember =
    member || path?.match(/MB-\d+/)?.[0] || params?.get("member") || data.members[0]?.id || "";
  const currentContext = JSON.stringify({
    member: selectedMember,
    memberState: data.members.filter((m) => m.id === selectedMember).map((m) => [m.summary, m.status, m.provider_response]),
    caseActivity: data.events.find((event) => event.resource === selectedMember && event.action !== "open_evidence")?.id,
    work: data.opportunities.filter((o) => o.eligibility?.reviewable || o.member_id === selectedMember).map((o) => [o.member_id, o.analysis_basis_key, o.recommendation_version, o.status, o.qa_status, o.owner, o.priority, o.due_date]),
    campaigns: data.campaigns.map((c) => [c.id, c.status, c.member_ids]),
  });
  const answer = storedAnswer?.context === currentContext ? storedAnswer.result : null;
  useEffect(() => { contextVersion.current++; }, [currentContext]);
  useEffect(() => {
    contextVersion.current++;
    setMember("");
    setAnswer(null);
  }, [path]);
  const ask = async (prompt: string) => {
    const version = contextVersion.current;
    const context = currentContext;
    setQuestion(prompt);
    setAnswer(null);
    setBusy(true);
    try {
      const result = await api<Answer>(
        "/assistant",
        {
          method: "POST",
          body: JSON.stringify({ question: prompt, member_id: selectedMember }),
        },
        user.csrf_token,
      );
      if (version === contextVersion.current) setAnswer({ result, context });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="assistant-trigger"
        aria-label="Ask Perform+"
        onClick={() => setOpen(true)}
      >
        <Sparkles size={15} />
        <span>Ask Perform+</span>
      </Button>
      <Drawer
        open={open}
        onOpenChange={setOpen}
        title="Ask Perform+"
        description="Grounded explanations and reviewed cohort proposals"
      >
        <p className="body-copy">Prepared analysis from your accessible records, with source passages attached to each finding.</p>
        <div className="assistant-prompts">
          {user.screens.includes("suspects") && (
            <Button
              variant="outline"
              disabled={busy}
              onClick={() =>
                ask("Find a high-priority cohort with strong evidence")
              }
            >
              Find a priority cohort
              <ArrowRight size={14} />
            </Button>
          )}
          {user.screens.includes("analytics") && (
            <Button
              variant="outline"
              disabled={busy}
              onClick={() =>
                ask("Explain the AI precision, recall and review time metrics")
              }
            >
              Explain AI Impact
              <ArrowRight size={14} />
            </Button>
          )}
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => ask("Summarize this member and the evidence")}
          >
            Summarize selected member
            <ArrowRight size={14} />
          </Button>
        </div>
        <div className="form-field">
          <LabelContext
            name={
              data.members.find((m) => m.id === selectedMember)?.name ||
              selectedMember
            }
          />
          <SelectField
            label="Assistant member context"
            value={selectedMember}
            onChange={(value) => {
              contextVersion.current++;
              setMember(value);
              setAnswer(null);
            }}
            options={data.members.map((m) => ({
              value: m.id,
              label: m.name + " · " + m.id,
            }))}
          />
        </div>
        <form
          className="assistant-question"
          onSubmit={(e) => {
            e.preventDefault();
            if (question.trim()) ask(question);
          }}
        >
          <Input
            aria-label="Ask Perform+"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask about the cohort, member or metrics…"
          />
          <Button
            size="icon"
            aria-label="Ask question"
            disabled={!question.trim() || busy}
          >
            {busy ? (
              <LoaderCircle className="animate-spin" size={16} />
            ) : (
              <Send size={16} />
            )}
          </Button>
        </form>
        {storedAnswer && !answer && !busy && <Notice>The case or cohort has changed. Ask again to use the current evidence and work state.</Notice>}
        {busy ? (
          <div className="inline-loading">
            <LoaderCircle className="animate-spin" size={18} />
            Reviewing records…
          </div>
        ) : (
          answer && (
            <div className="assistant-answer">
              <span className="insight-title">
                <Sparkles size={15} />
                {answer.basis}
              </span>
              <p>{answer.answer}</p>
              <CaseClaims claims={answer.claims} />
              {!answer.claims?.length && answer.sources.length > 0 && (
                <>
                  <h3 className="section-title">Grounded in these records</h3>
                  <div className="linked-members">
                    {answer.sources.map((source, i) => (
                      <Link
                        key={i}
                        href={source.href}
                        onClick={() => setOpen(false)}
                      >
                        <FileText size={14} />
                        {source.label}
                        <ArrowRight size={14} />
                      </Link>
                    ))}
                  </div>
                </>
              )}
              {answer.proposal && (
                <div className="assistant-proposal">
                  <strong>
                    {answer.proposal.member_ids.length} proposed members
                  </strong>
                  <p>
                    Inspect the matching registry or review the exact allocation
                    before creating work.
                  </p>
                  {answer.proposal.rankings?.length ? <ol className="space-y-3 py-3">
                    {answer.proposal.rankings.map((ranked) => <li key={ranked.member_id}>
                      <strong>{ranked.rank}. {data.members.find((m) => m.id === ranked.member_id)?.name || ranked.member_id}</strong>
                      <p className="text-sm">{ranked.reasons.join(" · ")}</p>
                    </li>)}
                  </ol> : null}
                  <Button variant="outline" asChild>
                    <Link
                      href={answer.proposal.filter}
                      onClick={() => setOpen(false)}
                    >
                      Open matching registry
                      <ArrowRight size={14} />
                    </Link>
                  </Button>
                  {user.permissions.includes("campaign") && (
                    <Button
                      disabled={!answer.proposal.member_ids.length}
                      onClick={() => {
                        setSelected(answer.proposal!.member_ids);
                        setProposal({ name: answer.proposal!.name, intervention: answer.proposal!.intervention });
                        setOpen(false);
                        setCampaign(true);
                      }}
                    >
                      Review campaign proposal
                      <ArrowRight size={14} />
                    </Button>
                  )}
                </div>
              )}
            </div>
          )
        )}
      </Drawer>
      <CampaignDialog
        open={campaign}
        onOpenChange={setCampaign}
        selected={selected}
        onSelectedChange={setSelected}
        data={data}
        act={act}
        proposal={proposal}
      />
    </>
  );
}

function LabelContext({ name }: { name: string }) {
  return (
    <p className="body-copy">
      Selected member: <strong>{name}</strong>
    </p>
  );
}
