"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, LoaderCircle } from "lucide-react";
import { api, label } from "@/lib/api";
import type { User } from "@/lib/types";
import { Empty, Panel, Status } from "./shared";
import { useRiskContext } from "./risk-ui";

type ReplayMetadata = { id: string; name: string; retained_at: string; status: string; provenance: Record<string, unknown>; validation: { valid: boolean; errors: { code: string; message: string }[]; semantic_validation?: string }; limitations: string[] };
type Replay = ReplayMetadata & { summary: string; abstention_reason?: string; classifications: { id: string; condition: string; status: string; explanation: string; citations: { document_id: string; source_version: number; source_hash: string; page: number; section: string; start: number; end: number; quote: string; href: string }[] }[]; prompt: string; raw_output: string; artifact_sha256: string; input: { coverage: string; source_set_hash: string; sources: { document_id: string; source_version: number; source_hash: string; pages: { number: number; sections: { heading: string; text: string }[] }[] }[] } };

export function RiskSourceAnalysis({ memberId, user }: { memberId: string; user: User }) {
  const context = useRiskContext();
  const [selected, setSelected] = useState("");
  const listing = useQuery({ queryKey: ["risk", "ai", user.id, memberId], queryFn: () => api<{ items: ReplayMetadata[]; limitations: string[] }>(`/risk/members/${memberId}/ai`) });
  const item = listing.data?.items.find((row) => row.id === selected) || listing.data?.items[0];
  const detail = useQuery({ queryKey: ["risk", "ai", user.id, memberId, item?.id, item?.status], queryFn: () => api<Replay>(`/risk/members/${memberId}/ai/${item!.id}`), enabled: item?.status === "available", retry: false });
  const replay = item?.status === "available" && !detail.error ? detail.data : undefined;
  if (listing.isPending) return <div className="risk-loading"><LoaderCircle className="animate-spin" size={18} />Loading retained source analysis…</div>;
  if (listing.error) return <Empty title="Source analysis unavailable" description={listing.error.message} />;
  return <div className="risk-workspace"><Panel title="Source analysis" subtitle="Retained model output · Reviewer assessment required" action={item && <Status value={item.status} />}>
    <div className="risk-analysis-body"><p className="risk-helper">Inspect recorded classifications against exact source passages. This view does not run inference or change review, coding or scoring decisions.</p>
    {!item ? <Empty title="No retained analysis for this member" description="Use the source documents and review workspace to assess the available evidence." /> : <>
      {listing.data!.items.length > 1 && <div className="risk-form"><label>Retained analysis<select value={item.id} onChange={(event) => setSelected(event.target.value)}>{listing.data!.items.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}</select></label></div>}
      {item.status !== "available" ? <div className="risk-error"><strong>{item.status === "stale" ? "Available sources changed" : "Retained output did not pass validation"}</strong>{item.validation.errors.map((error) => <p key={error.code}>{error.message}</p>)}</div> : detail.isPending ? <div className="risk-loading"><LoaderCircle className="animate-spin" size={18} />Validating retained output…</div> : detail.error ? <div className="risk-error" role="alert">{detail.error.message}</div> : replay && <>
        <div className="risk-analysis-summary"><strong>{replay.summary}</strong><Status value={replay.status} /></div>
        {replay.abstention_reason && <p className="risk-helper">{replay.abstention_reason}</p>}
        <div className="risk-analysis-claims">{replay.classifications.map((row) => <article key={row.id}><div><h3>{row.condition}</h3><Status value={row.status} /></div><p>{row.explanation}</p>{row.citations.map((citation, index) => <blockquote key={`${citation.document_id}-${index}`}><p>{citation.quote}</p><Link href={context.href(citation.href)}>{citation.document_id} · v{citation.source_version} · Page {citation.page} · {citation.section}<ArrowUpRight size={13} /></Link><small>Exact span {citation.start}–{citation.end}</small></blockquote>)}</article>)}</div>
        <details className="risk-disclosure"><summary>Recorded model and validation provenance</summary><dl className="risk-definition-list"><div><dt>Retained</dt><dd>{new Date(replay.retained_at).toLocaleString()}</dd></div><div><dt>Model family</dt><dd>{String(replay.provenance.model_family || "Not recorded")}</dd></div><div><dt>Exact model build</dt><dd>{String(replay.provenance.exact_model_version || "Not attested")}</dd></div><div><dt>Source set hash</dt><dd>{replay.input.source_set_hash}</dd></div><div><dt>Artifact hash</dt><dd>{replay.artifact_sha256}</dd></div></dl><p>{String(replay.provenance.identity_limitations || "")}</p><p>{replay.validation.semantic_validation}</p>{replay.limitations.map((text, index) => <p key={index}>{text}</p>)}</details>
        <details className="risk-disclosure"><summary>Retained prompt and structured output</summary><h4>Prompt</h4><pre className="risk-retained-text">{replay.prompt}</pre><h4>Recorded output</h4><pre className="risk-retained-text">{replay.raw_output}</pre></details>
        <details className="risk-disclosure"><summary>Complete retained source input · {replay.input.sources.length} documents</summary><p>{replay.input.coverage}</p>{replay.input.sources.map((source) => <details key={source.document_id} className="risk-disclosure"><summary>{source.document_id} · Version {source.source_version}</summary><p className="risk-helper">{source.source_hash}</p>{source.pages.map((page) => <section key={page.number}><h4>Page {page.number}</h4>{page.sections.map((section, index) => <div key={index}><h4>{section.heading}</h4><p className="risk-retained-text">{section.text}</p></div>)}</section>)}</details>)}</details>
      </>}
    </>}
  </div></Panel></div>;
}
