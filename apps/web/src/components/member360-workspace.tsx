"use client";

import { createElement, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { redirect, useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Search } from "lucide-react";
import { api } from "@/lib/api";
import type { User } from "@/lib/types";
import { useUrlState } from "@/hooks/workspace-state";
import { useRiskContext } from "./risk-ui";
import "./member360-workspace.css";
import { ColumnSortButton, SortableTable } from "./sortable-table";

type SourceNode = string | {
  tag: string;
  attrs: { className?: string; id?: string; colSpan?: number; scope?: string; style?: CSSProperties; historyTable?: string; historyMax?: number; historyAll?: boolean };
  children: SourceNode[];
};
type Member = {
  id: string; name: string; age: number; sex: string; product: string; conditions: string;
  composite: number; quality: number; risk: number; stars: number; closure: number;
  provider: string; group: string; plan: string; contract: string; network: string; line: string;
  newMember: boolean; flags: string[]; panes: { id: string; content: SourceNode[] }[];
};
type Profiles = { source: { file: string; sha256: string; origin: string; measurementYear: number; notes: string }; members: Member[] };
const tabs = [
  ["summary", "Summary"], ["enrollment", "Enrollment & Attribution"], ["quality", "Quality, Stars & Opportunities"],
  ["risk", "Risk Adjustment"], ["clinical", "Clinical Data"], ["claims", "Claims & Utilization"], ["sdoh", "SDOH & Engagement"],
];
const allowedTags = new Set(["div", "span", "p", "b", "strong", "i", "small", "br", "h2", "h3", "ul", "li", "table", "thead", "tbody", "tr", "th", "td", "details", "summary", "button"]);

// Render inert source data. The uploaded document's scripts and event handlers
// never enter the page; only history expansion has an explicit React action.
function SourceContent({ nodes, history, reveal }: { nodes: SourceNode[]; history: Record<string, number>; reveal: (id: string, tier: number) => void }) {
  function render(node: SourceNode, key: string, table = ""): ReactNode {
    if (typeof node === "string") return node;
    if (!allowedTags.has(node.tag)) return null;
    const { historyTable, historyMax = 1, historyAll, ...attrs } = node.attrs;
    const tableId = node.tag === "table" ? attrs.id || "" : table;
    if (historyTable) {
      const tier = history[historyTable] || 0;
      if (tier >= historyMax) return null;
      return <button key={key} className="yearbtn" type="button" aria-controls={historyTable}
        onClick={() => reveal(historyTable, historyAll ? historyMax : tier + 1)}>
        {tier ? "Show Earlier Procedures" : node.children.map((child, i) => render(child, `${key}-${i}`))}
      </button>;
    }
    const row = attrs.className?.includes("yearrow");
    const tier = Number(attrs.className?.match(/tier-(\d+)/)?.[1] || 1);
    const visible = row && (history[tableId] || 0) >= tier;
    const safeProps = { className: `${attrs.className || ""}${visible ? " show" : ""}`.trim() || undefined,
      id: attrs.id, colSpan: attrs.colSpan, scope: attrs.scope, style: attrs.style };
    const children = node.children.map((child, i) => render(child, `${key}-${i}`, tableId));
    if (node.tag === "table") return <SortableTable key={key} className={safeProps.className} id={safeProps.id} style={safeProps.style}>{children}</SortableTable>;
    return createElement(node.tag, { ...safeProps, key }, ...children);
  }
  return <>{nodes.map((node, index) => render(node, String(index)))}</>;
}

function Metric({ label, value, description }: { label: string; value: ReactNode; description: string }) {
  return <div className="kpi"><div className="l">{label}</div><div className="v">{value}</div><div className="d">{description}</div></div>;
}

function EntityFilter({ options, selected, onChange }: { options: string[]; selected: string[]; onChange: (next: string[]) => void }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open]);
  return <div ref={root} className={`f checkdrop${open ? " open" : ""}`} onKeyDown={event => {
    if (event.key === "Escape") { setOpen(false); root.current?.querySelector("button")?.focus(); }
  }}>
    <label id="member360-entity-label">ENTITY NAME</label>
    <button type="button" className="checkdrop-btn" aria-expanded={open} aria-controls="member360-entities"
      aria-labelledby="member360-entity-label member360-entity-value" onClick={() => setOpen(!open)}>
      <span id="member360-entity-value">{selected.length === 0 ? "All entities" : selected.length === 1 ? selected[0] : `${selected.length} selected`}</span><span className="chev">▾</span>
    </button>
    <div className="checkdrop-panel" id="member360-entities" role="group" aria-label="Entity options">
      <label className="checkdrop-item"><input type="checkbox" checked={!selected.length} onChange={() => onChange([])} /><span>All entities</span></label>
      {options.map(option => <label className="checkdrop-item" key={option}><input type="checkbox" checked={selected.includes(option)}
        onChange={() => onChange(selected.includes(option) ? selected.filter(value => value !== option) : [...selected, option])} /><span>{option}</span></label>)}
    </div>
  </div>;
}

function Profile({ member, activeTab, onTab, back, backLabel }: { member: Member; activeTab: string; onTab: (tab: string) => void; back?: () => void; backLabel: string }) {
  const [history, setHistory] = useState<Record<string, number>>({});
  const tablist = useRef<HTMLDivElement>(null);
  const header = useRef<HTMLDivElement>(null);
  function selectTab(tab: string) {
    const shellHeight = document.querySelector("header")?.getBoundingClientRect().height || 111;
    const anchor = (header.current?.getBoundingClientRect().bottom || 0) + window.scrollY + 14 - shellHeight;
    const shouldAlign = window.scrollY > anchor;
    onTab(tab);
    if (shouldAlign) requestAnimationFrame(() => window.scrollTo({ top: Math.max(0, anchor), behavior: "instant" }));
  }
  return <>
    <div className="m360-breadcrumb">{back && <><button type="button" onClick={back}><ArrowLeft size={14} />{backLabel}</button><span>/</span></>}<span>{member.name}</span></div>
    <div className="card member" ref={header}>
      <div className="avatar"><div className="circle">{member.name.split(" ").map(n => n[0]).join("")}</div><div className="mh"><h1>{member.name}</h1><small>{member.id} · {member.product}<br />Age {member.age} · {member.sex}</small></div></div>
      {([['Composite Impact', member.composite], ['Risk Impact', member.risk], ['Quality Impact', member.quality], ['Stars Impact', member.stars]] as const).map(([title, score]) => <div className="mh" key={title}><b>{score}</b><small>{title}</small></div>)}
      <div className="flags" style={{ gridColumn: "1/-1" }}>{member.flags.map(flag => <span key={flag} className={`pill ${flag.includes("Audit") ? "a" : flag.includes("HCC") ? "r" : flag.includes("New") ? "b" : "y"}`}>{flag}</span>)}
        {back && <button type="button" className="btn alt m360-back" onClick={back}>Back to {backLabel}</button>}
      </div>
    </div>
    <div ref={tablist} className="mtabs" role="tablist" aria-label={`${member.name} profile sections`} onKeyDown={event => {
      const index = tabs.findIndex(([id]) => id === activeTab);
      const next = event.key === "ArrowRight" ? (index + 1) % tabs.length : event.key === "ArrowLeft" ? (index + tabs.length - 1) % tabs.length : event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : -1;
      if (next >= 0) { event.preventDefault(); selectTab(tabs[next][0]); tablist.current?.querySelectorAll<HTMLButtonElement>("button")[next].focus(); }
    }}>
      {tabs.map(([id, title]) => <button className={`mtab${activeTab === id ? " on" : ""}`} key={id} type="button" role="tab" id={`m360-tab-${id}`}
        aria-selected={activeTab === id} aria-controls={`m360-panel-${id}`} tabIndex={activeTab === id ? 0 : -1} onClick={() => selectTab(id)}>{title}</button>)}
    </div>
    <div className="mtabpanewrap">
      {member.panes.map(pane => <section key={pane.id} id={`m360-panel-${pane.id}`} role="tabpanel" aria-labelledby={`m360-tab-${pane.id}`} hidden={activeTab !== pane.id} tabIndex={0}>
        <SourceContent nodes={pane.content} history={history} reveal={(id, tier) => setHistory(previous => ({ ...previous, [id]: tier }))} />
      </section>)}
    </div>
  </>;
}

export function Member360Workspace({ user }: { user: User }) {
  const search = useSearchParams();
  const risk = useRiskContext();
  if (!search?.get("member")?.trim()) {
    const destination = ["overview", "suspects", "analytics"].find(screen => user.screens.includes(screen));
    if (destination) redirect(risk.href(`/${destination}`));
    return <div className="member360-workspace"><div className="card" role="status">Open an individual member profile using a member link.</div></div>;
  }
  return <Member360ProfileWorkspace user={user} />;
}

function Member360ProfileWorkspace({ user }: { user: User }) {
  const search = useSearchParams();
  const router = useRouter();
  const risk = useRiskContext();
  const returnScreen = ["suspects", "overview", "analytics"].find(screen => user.screens.includes(screen));
  const backLabel = returnScreen === "suspects" ? "Suspected Conditions" : returnScreen === "analytics" ? "Risk Analytics" : "Dashboard";
  const back = returnScreen ? () => router.push(risk.href(returnScreen === "suspects" ? "/suspects?view=registry" : `/${returnScreen}`)) : undefined;
  const selectedId = search?.get("member") || "";
  const activeTab = tabs.some(([id]) => id === search?.get("tab")) ? search?.get("tab")! : "summary";
  const profiles = useQuery({ queryKey: ["member360", user.id], queryFn: () => api<Profiles>("/member360"), staleTime: 60000 });
  const [query, setQuery] = useUrlState("member_q", "");
  const [contract, setContract] = useUrlState("member_contract", "");
  const [plan, setPlan] = useUrlState("member_plan", "");
  const [hierarchy, setHierarchy] = useUrlState("member_hierarchy", "network");
  const [entities, setEntities] = useUrlState<string[]>("member_entities", []);
  const [sort, setSort] = useUrlState("member_sort", "composite");
  const [direction, setDirection] = useUrlState("member_direction", "desc");
  const [pageSize, setPageSize] = useUrlState("member_size", "10");
  const [requestedPage, setPage] = useUrlState("member_page", "1");
  const members = profiles.data?.members || [];
  const hierarchyKey = hierarchy === "provider" ? "provider" : hierarchy === "group" ? "group" : "network";
  const safeEntities = Array.isArray(entities) ? entities.filter((e): e is string => typeof e === "string") : [];
  const filtered = members.filter(member => (!contract || member.contract === contract) && (!plan || member.plan === plan)
    && (!safeEntities.length || safeEntities.includes(member[hierarchyKey]))
    && [member.name, member.id, member.provider, member.conditions].join(" ").toLowerCase().includes(query.trim().toLowerCase()));
  const sortKey = ["name", "age", "conditions", "composite", "quality", "risk", "stars", "closure"].includes(sort) ? sort as "name" | "age" | "conditions" | "composite" | "quality" | "risk" | "stars" | "closure" : "composite";
  const sorted = [...filtered].sort((a, b) => {
    const av = a[sortKey], bv = b[sortKey];
    return (typeof av === "number" && typeof bv === "number" ? av - bv : String(av).localeCompare(String(bv))) * (direction === "asc" ? 1 : -1);
  });
  const size = [10, 25, 50, 100].includes(Number(pageSize)) ? Number(pageSize) : 10;
  const pages = Math.max(1, Math.ceil(sorted.length / size));
  const page = Math.max(1, Math.min(pages, Number(requestedPage) || 1));
  const selected = members.find(member => member.id === selectedId);
  function navigate(member: string, tab = "summary", push = true) {
    const params = new URLSearchParams(window.location.search);
    if (member) params.set("member", member); else params.delete("member");
    if (member && tab !== "summary") params.set("tab", tab); else params.delete("tab");
    window.history[push ? "pushState" : "replaceState"](null, "", `${window.location.pathname}${params.size ? `?${params}` : ""}`);
    if (push) window.scrollTo({ top: 0, behavior: "instant" });
  }
  function reset() {
    const params = new URLSearchParams(window.location.search);
    [...params.keys()].filter(key => key.startsWith("member_")).forEach(key => params.delete(key));
    window.history.replaceState(null, "", `${window.location.pathname}${params.size ? `?${params}` : ""}`);
  }
  const hasFilters = !!(query || contract || plan || safeEntities.length);
  return <div className="member360-workspace">
    {profiles.isPending ? <div className="card" role="status">Loading member profiles…</div> : profiles.error ? <div className="card" role="alert"><h1>Unable to load Member 360</h1><p>{profiles.error.message}</p><button className="btn" onClick={() => profiles.refetch()}>Try again</button></div> : selectedId ? selected ? <Profile key={selected.id} member={selected} activeTab={activeTab} onTab={tab => navigate(selected.id, tab, false)} back={back} backLabel={backLabel} /> : <div className="card"><h1>Member unavailable</h1><p>This member is not available in your current access scope.</p>{back && <button className="btn" onClick={back}>Back to {backLabel}</button>}</div> : <>
      <h1 className="sr-only">Member 360</h1>
      <div className="card">
        <div className="filters">
          <div className="f"><label htmlFor="member-contract">CONTRACT</label><select id="member-contract" value={contract} onChange={e => { setContract(e.target.value); setPage("1"); }}><option value="">All contracts</option>{[...new Set(members.map(m => m.contract))].map(value => <option key={value}>{value}</option>)}</select></div>
          <div className="f"><label htmlFor="member-line">LINE OF BUSINESS</label><select id="member-line"><option>Medicare Advantage</option></select></div>
          <div className="f"><label htmlFor="member-plan">HEALTH PLAN</label><select id="member-plan" value={plan} onChange={e => { setPlan(e.target.value); setPage("1"); }}><option value="">All health plans</option>{[...new Set(members.map(m => m.plan))].map(value => <option key={value}>{value}</option>)}</select></div>
          <div className="f"><label htmlFor="member-hierarchy">HIERARCHY LEVEL</label><select id="member-hierarchy" value={hierarchyKey} onChange={e => { setHierarchy(e.target.value); setEntities([]); setPage("1"); }}><option value="network">Network</option><option value="group">Provider group</option><option value="provider">Provider</option></select></div>
          <EntityFilter options={[...new Set(members.map(m => m[hierarchyKey]))]} selected={safeEntities} onChange={value => { setEntities(value); setPage("1"); }} />
        </div>
      </div>
      <div className="kpis m360-list-kpis" aria-label="Member list metrics">
        <Metric label="MEMBERS SHOWN" value={filtered.length} description="Within the selected population" />
        <Metric label="AVG COMPOSITE IMPACT" value={filtered.length ? Math.round(filtered.reduce((sum, m) => sum + m.composite, 0) / filtered.length) : "—"} description="Across shown members" />
        <Metric label="HIGH IMPACT (80+)" value={filtered.filter(m => m.composite >= 80).length} description="Highest combined opportunity" />
        <Metric label="NEW MEMBERS" value={filtered.filter(m => m.newMember).length} description="Members with limited history" />
      </div>
      <div className="card">
        <div className="m360-list-tools"><h2>Member list <span className="m360-count">{filtered.length}</span></h2><div className="m360-search"><Search size={16} /><input aria-label="Search members" placeholder="Search name, ID, condition or provider" value={query} onChange={e => { setQuery(e.target.value); setPage("1"); }} /></div>{hasFilters && <button className="m360-text-button" onClick={reset}>Clear filters</button>}</div>
        <div className="tablewrap"><table aria-label="Member list" data-sortable-table style={{width:"100%",tableLayout:"fixed"}}><thead><tr>
          {[["name", "Member"], ["age", "Age"], ["conditions", "Chronic Conditions"], ["composite", "Composite Impact"], ["quality", "Quality Impact"], ["risk", "Risk Impact"], ["stars", "Stars Impact"], ["closure", "Closure Probability"]].map(([key, title]) => <th key={title} scope="col" aria-sort={key ? sortKey === key ? direction === "asc" ? "ascending" : "descending" : "none" : undefined}>{key ? <ColumnSortButton direction={sortKey === key ? direction === "asc" ? "asc" : "desc" : undefined} onClick={() => { setSort(key); setDirection(sortKey === key && direction === "asc" ? "desc" : "asc"); setPage("1"); }}>{title}</ColumnSortButton> : title}</th>)}<th scope="col">Action</th>
        </tr></thead><tbody>{sorted.slice((page - 1) * size, page * size).map(member => <tr key={member.id}>
          <td><button className="link m360-member-link" onClick={() => navigate(member.id)}>{member.name}</button><div className="muted m360-member-id">{member.id}</div></td><td>{member.age}</td><td className="m360-condition">{member.conditions}</td><td><b>{member.composite}</b></td><td>{member.quality}</td><td>{member.risk}</td><td>{member.stars}</td><td>{member.closure}%</td><td><button className="btn m360-open" onClick={() => navigate(member.id)} aria-label={`Open Member 360 for ${member.name}`}>Open Member 360</button></td>
        </tr>)}{!sorted.length && <tr><td colSpan={9}><div className="m360-empty"><h3>{members.length ? "No members match these filters" : "No members in your access scope"}</h3><p>{members.length ? "Try another name, condition, health plan or provider." : "There are no reference profiles assigned to your provider."}</p>{hasFilters && <button className="btn alt" onClick={reset}>Clear filters</button>}</div></td></tr>}</tbody></table></div>
        <div className="m360-pagination"><span role="status">{sorted.length ? (page - 1) * size + 1 : 0}–{Math.min(page * size, sorted.length)} of {sorted.length} members</span><label>Rows per page<select aria-label="Rows per page" value={size} onChange={e => { setPageSize(e.target.value); setPage("1"); }}>{[10, 25, 50, 100].map(value => <option key={value}>{value}</option>)}</select></label><span>Page {page} of {pages}</span><button disabled={page === 1} onClick={() => setPage(String(page - 1))}>Previous</button><button disabled={page === pages} onClick={() => setPage(String(page + 1))}>Next</button></div>
        <details className="scoreinfo"><summary>How are these scores calculated?</summary><p>Composite Impact combines Risk Impact (35%), Quality Impact (25%), Stars Impact (20%) and Opportunity Closure Probability (20%). Scores range from 0 to 100. Closure probability is the average across the member’s open quality measures. Member profiles contain the individual measures, evidence and score breakdown.</p></details>
      </div>
    </>}
    {profiles.data && <details className="m360-source"><summary>Source & scoring notes</summary><p>{profiles.data.source.notes}</p><p>Source: {profiles.data.source.file} · Measurement year {profiles.data.source.measurementYear}</p><p className="m360-hash">SHA-256: {profiles.data.source.sha256}</p></details>}
  </div>;
}
