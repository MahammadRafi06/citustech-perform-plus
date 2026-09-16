"use client";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Search,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Check,
} from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { SelectField, Empty } from "./shared";
import type { Evidence } from "@/lib/types";
const authoredSections: Record<string, string[]> = {
  "DOC-0001": ["Documentation context"],
  "DOC-0003": ["Review limitation"],
  "DOC-0005": ["Next review step"],
  "DOC-0006": ["Neutral assessment request"],
  "DOC-0007": ["Integrity workflow"],
  "DOC-0008": ["Scenario assumptions", "Calculation status"],
  "DOC-0009": ["Applicable demonstration policy"],
};
export function isAuthored(doc: Evidence, heading: string) {
  return authoredSections[doc.id]?.includes(heading) || false;
}
export function SourceDocument({
  documents,
  selected,
  onSelect,
  onInspect,
  initialPage,
  initialSection,
}: {
  documents: Evidence[];
  selected?: Evidence;
  onSelect?: (id: string) => void;
  onInspect?: () => void;
  initialPage?: number;
  initialSection?: string;
}) {
  const params = useSearchParams();
  const linkedDocument = params?.get("document") || params?.get("sample");
  const followsLink = !linkedDocument || linkedDocument === selected?.id;
  const requestedPage = initialPage || (followsLink ? Number(params?.get("page")) : 0);
  const requestedSection = initialSection || (followsLink ? params?.get("section") || "" : "");
  const [original, setOriginal] = useState(false);
  const [page, setPage] = useState(0),
    [zoom, setZoom] = useState(100),
    [find, setFind] = useState(false),
    [query, setQuery] = useState("");
  const scroll = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const target = selected?.pages.findIndex((p) => p.number === requestedPage) ?? -1;
    setPage(target >= 0 ? target : 0);
    setQuery("");
    scroll.current?.scrollTo({ top: 0 });
  }, [selected?.id, requestedPage]);
  useEffect(() => {
    if (!requestedSection) return;
    const frame = requestAnimationFrame(() => {
      const target = Array.from(scroll.current?.querySelectorAll<HTMLElement>("[data-section]") || [])
        .find((node) => node.dataset.section === requestedSection);
      if (target && scroll.current) {
        scroll.current.scrollTo({ top: target.getBoundingClientRect().top - scroll.current.getBoundingClientRect().top + scroll.current.scrollTop - 28, behavior: "smooth" });
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [selected?.id, page, requestedSection]);
  if (!selected)
    return (
      <div className="source-viewer">
        <Empty
          title="No source document"
          description="Request eligible encounter documentation to continue."
        />
      </div>
    );
  const pages = selected.pages;
  const current = pages[Math.min(page, pages.length - 1)];
  const citations = pages.flatMap((p, i) =>
    p.sections.some((s) => s.highlight && !isAuthored(selected, s.heading))
      ? [i]
      : [],
  );
  const passage = (text: string, highlight?: boolean) => {
    if (query.trim()) {
      const parts = text.split(
        new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi"),
      );
      return parts.map((s, i) =>
        s.toLowerCase() === query.toLowerCase() ? <mark key={i}>{s}</mark> : s,
      );
    }
    return highlight ? <mark>{text}</mark> : text;
  };
  return (
    <section
      className="source-viewer"
      id="review-source"
      aria-label="Source document"
    >
      <div className="source-toolbar">
        <SelectField
          label="Source document"
          value={selected.id}
          onChange={(id) => onSelect?.(id)}
          options={documents.map((d) => ({ value: d.id, label: d.title }))}
        />
        <div className="source-controls">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Previous document page"
            disabled={page === 0}
            onClick={() => setPage(page - 1)}
          >
            <ChevronLeft size={16} />
          </Button>
          <span>
            {page + 1} / {pages.length}
          </span>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Next document page"
            disabled={page >= pages.length - 1}
            onClick={() => setPage(page + 1)}
          >
            <ChevronRight size={16} />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Zoom out"
            disabled={zoom <= 80}
            onClick={() => setZoom(zoom - 10)}
          >
            <ZoomOut size={16} />
          </Button>
          <span>{zoom}%</span>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Zoom in"
            disabled={zoom >= 160}
            onClick={() => setZoom(zoom + 10)}
          >
            <ZoomIn size={16} />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Fit width"
            onClick={() => setZoom(100)}
          >
            <Maximize2 size={16} />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Find in document"
            onClick={() => setFind(!find)}
          >
            <Search size={16} />
          </Button>
        </div>
      </div>
      {find && (
        <div className="source-find">
          <Input
            autoFocus
            aria-label="Find passage"
            placeholder="Find on this page…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      )}
      <div className="source-provenance">
        <span>{selected.id}</span>
        <span>Encounter {selected.date}</span>
        <span>{selected.signature_status || "Signature not supplied"}</span>
        <span>
          {selected.synthetic !== false ? "Reference document" : "Source record"}
        </span>
      </div>
      <div
        className="source-scroll"
        ref={scroll}
        tabIndex={0}
        aria-label="Scrollable source page"
      >
        <article
          className="source-paper"
          style={{ fontSize: `${(15 * zoom) / 100}px` }}
        >
          <h2>{selected.title}</h2>
          <p className="source-heading-meta">
            {selected.member_id} · {selected.provider}
            <br />
            {selected.date}
          </p>
          {current?.sections
            .filter((s) => original || !isAuthored(selected, s.heading))
            .map((s, i) => (
              <section key={i} data-section={s.heading} data-citation={s.highlight ? "true" : undefined}
                aria-label={requestedSection === s.heading ? `Linked passage: ${s.heading}` : undefined}
                style={requestedSection === s.heading ? { outline: "1px solid var(--border)", outlineOffset: "10px", borderRadius: "2px" } : undefined}>
                <h3>{s.heading}</h3>
                <p>{passage(s.text, s.highlight)}</p>
              </section>
            ))}
          <footer>
            Page {current?.number} · {selected.id} · Original source wording
          </footer>
        </article>
      </div>
      <div className="source-footer">
        <button onClick={() => setOriginal(!original)}>
          {original ? "Clinical source view" : "Complete document"}
        </button>
        {citations.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              const next = citations.find((i) => i > page) ?? citations[0];
              setPage(next);
              requestAnimationFrame(() =>
                scroll.current
                  ?.querySelector('[data-citation="true"]')
                  ?.scrollIntoView({ block: "center", behavior: "smooth" }),
              );
            }}
          >
            Linked passage
          </Button>
        )}
        {onInspect && (
          <Button variant="outline" size="sm" onClick={onInspect}>
            <Check size={14} />
            Mark inspected
          </Button>
        )}
      </div>
    </section>
  );
}
