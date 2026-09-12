"use client";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
type Answer = {
  answer: string;
  basis: string;
  sources: { label: string; href: string }[];
  proposal?: { member_ids: string[]; name: string; filter: string };
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
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useDraft("assistant-question", "");
  const [member, setMember] = useState("");
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [busy, setBusy] = useState(false);
  const [campaign, setCampaign] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const selectedMember =
    member || path?.match(/MB-\d+/)?.[0] || data.members[0]?.id || "";
  useEffect(() => {
    contextVersion.current++;
    setMember("");
    setAnswer(null);
  }, [path]);
  const ask = async (prompt: string) => {
    const version = contextVersion.current;
    setQuestion(prompt);
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
      if (version === contextVersion.current) setAnswer(result);
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
        <Notice>
          Prepared analysis from your accessible records. Responses use curated
          findings; a live model is not connected.
        </Notice>
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
              {answer.sources.length > 0 && (
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
