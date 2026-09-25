"use client";

import { SortableTable } from './sortable-table';
import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ArrowDownToLine, ArrowLeft, ArrowRight, Bot, Check, ChevronDown, ChevronRight, FileSearch, Layers3, MessageSquareText, Network, Plus, Search, Server, LockKeyhole, Settings2, ShieldCheck, SlidersHorizontal, Waypoints, X } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { PageHeader } from "./shared";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger } from "./ui/select";
import { toast } from "sonner";
import type { User } from "@/lib/types";
import { agents, providers, defaults, initialState, withPrivateModel, changesBetween, validateSettings, type AgentDefinition, type AgentSettings, type ConfigState, type Connection, type Deployment, type ProviderId } from "./ai-configuration-data";
import styles from "./ai-configuration.module.css";

const nav = [["agents", "Agents"], ["connections", "Providers"], ["models", "Models"], ["activity", "Change history"]];
const icons = [MessageSquareText, FileSearch, Waypoints, ShieldCheck, Layers3];
const fmt = (n: number) => new Intl.NumberFormat("en-US").format(n);
const date = (value: string) => new Date(value).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
const equal = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

function Field({ label, hint, error, children, className = "" }: { label: string; hint?: string; error?: string; children: ReactNode; className?: string }) {
  return <label className={`${styles.field} ${className}`}><span>{label}</span>{children}{error ? <small role="alert" className={styles.fieldError}>{error}</small> : hint ? <small>{hint}</small> : null}</label>;
}
function ProviderMark({ id }: { id: ProviderId }) {
  const provider = providers.find(p => p.id === id);
  return <span className={styles.providerMark} data-provider={id} aria-hidden="true">{provider?.logo ? <img src={`/brand/providers/${provider.logo}`} width={26} height={26} alt="" /> : id === "private" ? <Server size={22} /> : <Network size={22} />}</span>;
}
function AgentMark({ agent, large = false }: { agent: AgentDefinition; large?: boolean }) {
  const Icon = icons[agents.findIndex(a => a.id === agent.id)] || Bot;
  return <span className={`${styles.agentMark} ${large ? styles.largeMark : ""}`} data-agent={agent.id}><Icon size={large ? 25 : 20} strokeWidth={1.7} /></span>;
}

function ProviderSelect({ value, onChange, disabled }: { value: ProviderId; onChange: (id: ProviderId) => void; disabled: boolean }) {
  return <Select value={value} onValueChange={id => onChange(id as ProviderId)} disabled={disabled}>
    <SelectTrigger aria-label="Provider" className={styles.providerTrigger}><span className={styles.optionIdentity}><ProviderMark id={value} /><span>{providers.find(p => p.id === value)?.name}</span></span></SelectTrigger>
    <SelectContent position="popper" align="start" className={styles.modelMenu}>{providers.map(p => <SelectItem key={p.id} value={p.id} textValue={p.name} className={styles.modelOption}><span className={styles.optionIdentity}><ProviderMark id={p.id} /><span>{p.name}</span></span></SelectItem>)}</SelectContent>
  </Select>;
}

function ConnectionSelect({ value, connections, onChange, disabled }: { value: string; connections: Connection[]; onChange: (id: string) => void; disabled: boolean }) {
  const selected = connections.find(c => c.id === value);
  return <Select value={value} onValueChange={onChange} disabled={disabled}>
    <SelectTrigger aria-label="Provider connection" className={styles.providerTrigger}><span className={styles.optionIdentity}>{selected && <ProviderMark id={selected.provider} />}<span>{selected?.name || "Select a provider"}</span></span></SelectTrigger>
    <SelectContent position="popper" align="start" className={styles.modelMenu}>{[...connections].sort((a, b) => Number(b.provider === "private") - Number(a.provider === "private")).map(c => <SelectItem key={c.id} value={c.id} textValue={c.name} className={styles.modelOption}><span className={styles.optionIdentity}><ProviderMark id={c.provider} /><span><strong>{c.name}</strong><small>{c.provider === "private" ? "Organization-hosted" : providers.find(p => p.id === c.provider)?.name}</small></span></span></SelectItem>)}</SelectContent>
  </Select>;
}

function ModelSelect({ label, value, state, onChange, disabled, primary }: { label: string; value: string; state: ConfigState; onChange: (id: string) => void; disabled: boolean; primary?: string }) {
  const selected = state.models.find(m => m.id === value);
  const connection = state.connections.find(c => c.id === selected?.connection);
  const identity = (m: Deployment, providerId: ProviderId, isPrimary = false) => <span className={styles.optionIdentity}><ProviderMark id={providerId} /><span><strong>{m.name}</strong><small>{isPrimary ? "Already selected as primary" : providerId === "private" ? "Organization-hosted · Your infrastructure" : providers.find(p => p.id === providerId)?.name}</small></span></span>;
  return <Select value={value || "__none__"} onValueChange={id => onChange(id === "__none__" ? "" : id)} disabled={disabled}>
    <SelectTrigger aria-label={label} className={styles.modelTrigger}>{selected && connection ? identity(selected, connection.provider) : <span className={styles.optionIdentity}><span className={styles.providerMark}><Layers3 size={20} /></span><span><strong>No fallback</strong><small>Use the primary model only</small></span></span>}</SelectTrigger>
    <SelectContent position="popper" align="start" className={styles.modelMenu}>
      {primary !== undefined && <SelectGroup><SelectLabel className={styles.modelGroupLabel}>Fallback behavior</SelectLabel><SelectItem value="__none__" className={styles.modelOption}>No fallback</SelectItem></SelectGroup>}
      {providers.map(p => {
        const models = state.models.filter(m => state.connections.find(c => c.id === m.connection)?.provider === p.id);
        return models.length ? <SelectGroup key={p.id} data-private={p.id === "private"}><SelectLabel className={styles.modelGroupLabel}>{p.id === "private" ? "Private deployment" : p.name}</SelectLabel>{models.map(m => <SelectItem key={m.id} value={m.id} textValue={m.name} disabled={primary === m.id} className={styles.modelOption}>{identity(m, p.id, primary === m.id)}</SelectItem>)}</SelectGroup> : null;
      })}
    </SelectContent>
  </Select>;
}

export function AiConfiguration({ user }: { user: User }) {
  const router = useRouter();
  const path = usePathname() || "/admin/ai/agents";
  const section = path.split("/")[3] || "agents";
  const agent = agents.find(a => a.id === path.split("/")[4]);
  const key = `ct-ai-configuration-v1:${user.id}`;
  const [state, setState] = useState<ConfigState>(initialState);
  const [loaded, setLoaded] = useState(false);
  const [draft, setDraft] = useState<AgentSettings | null>(null);
  const [connectionEdit, setConnectionEdit] = useState<Connection | "new" | null>(null);
  const [modelEdit, setModelEdit] = useState<Deployment | "new" | null>(null);
  const [search, setSearch] = useState("");
  const [providerFilter, setProviderFilter] = useState("all");
  const [filter, setFilter] = useState("all");
  const [leave, setLeave] = useState<string | null>(null);
  const [historyDetail, setHistoryDetail] = useState<string | null>(null);
  const current = agent ? state.settings[agent.id] || defaults(agent.id) : null;
  const dirty = !!(draft && current && !equal(draft, current));
  const writable = user.permissions.includes("users");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const saved = JSON.parse(raw) as ConfigState;
        if (saved.schema !== 1 || !Array.isArray(saved.connections) || !Array.isArray(saved.models) || !Array.isArray(saved.revisions) || !saved.settings || typeof saved.settings !== "object") throw new Error();
        setState(withPrivateModel(saved));
      }
    } catch { toast.error("Saved preview settings could not be loaded. Default settings are shown."); }
    setLoaded(true);
  }, [key]);
  useEffect(() => { if (loaded) setDraft(agent ? structuredClone(state.settings[agent.id] || defaults(agent.id)) : null); }, [agent?.id, loaded]); // Saved state updates must not overwrite an in-progress form.
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function persist(next: ConfigState) {
    try { localStorage.setItem(key, JSON.stringify(next)); setState(next); return true; }
    catch { toast.error("Settings could not be saved in this browser. Your form is still available."); return false; }
  }
  function navigate(to: string) { if (dirty) setLeave(to); else { setSearch(""); router.push(to); } }
  function saveAgent(action: "Saved" | "Restored" = "Saved", value = draft) {
    if (!agent || !value || !writable) return;
    const errors = validateSettings(value, state, agent);
    if (Object.keys(errors).length) { toast.error("Review the highlighted settings before saving."); return; }
    const revisions = state.revisions.filter(r => r.agentId === agent.id);
    const version = (revisions[0]?.version || 0) + 1;
    const changes = changesBetween(current!, value);
    const revision = { id: crypto.randomUUID(), agentId: agent.id, version, at: new Date().toISOString(), settings: structuredClone(value), changes: changes.length ? changes : ["Initial configuration"], action };
    if (persist({ ...state, settings: { ...state.settings, [agent.id]: structuredClone(value) }, revisions: [revision, ...state.revisions].slice(0, 200) })) {
      setDraft(structuredClone(value)); toast.success(`${agent.name} configuration saved`, { description: `Version ${version} · Saved in this browser` });
    }
  }
  function exportSettings() {
    const blob = new Blob([JSON.stringify({ ...state, exported_at: new Date().toISOString(), mode: "configuration_preview", live_inference_configured: false }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "perform-plus-agent-settings.json"; a.click(); setTimeout(() => URL.revokeObjectURL(url), 5000);
  }
  const modelName = (id: string) => state.models.find(m => m.id === id)?.name || "No model selected";
  const connectionFor = (modelId: string) => state.connections.find(c => c.id === state.models.find(m => m.id === modelId)?.connection);
  const providerCount = new Set(agents.filter(a => !a.planned).map(a => connectionFor((state.settings[a.id] || defaults(a.id)).model)?.provider)).size;
  const filtered = agents.filter(a => {
    const s = state.settings[a.id] || defaults(a.id);
    return (!search || `${a.name} ${a.description} ${modelName(s.model)}`.toLowerCase().includes(search.toLowerCase())) &&
      (filter === "all" || (filter === "available" && !a.planned) || (filter === "planned" && a.planned) || (filter === "customized" && !!state.settings[a.id])) &&
      (providerFilter === "all" || (!a.planned && connectionFor(s.model)?.provider === providerFilter));
  });

  if (!loaded) return <div className={styles.loading}>Loading Agents configuration…</div>;
  return <div className={styles.workspace}>
    {!agent ? <>
      <PageHeader title="Agents configuration" description="Choose your models. Shape how each agent works."><div className={styles.headerActions}><span className={styles.environment}>Development workspace</span><Button variant="outline" onClick={exportSettings}><ArrowDownToLine size={15} />Export settings</Button></div></PageHeader>
      <Tabs value={section} onValueChange={value => navigate(`/admin/ai/${value}`)}><TabsList variant="line" className={styles.navigation} aria-label="Agents configuration sections">{nav.map(([id, title]) => <TabsTrigger key={id} value={id}>{title}</TabsTrigger>)}</TabsList></Tabs>
      {section === "agents" && <>
        <div className={styles.summary}><div><Bot size={19} /><strong>5</strong><span>configurable agents</span></div><div><Network size={18} /><strong>{providerCount}</strong><span>selected {providerCount === 1 ? "provider" : "providers"}</span></div><div><SlidersHorizontal size={18} /><strong>{Object.keys(state.settings).length}</strong><span>customized</span></div><div className={styles.providerRoster}><span>Provider catalog</span>{(["openai", "anthropic", "azure", "bedrock", "private"] as ProviderId[]).map(id => <span key={id} title={providers.find(p => p.id === id)?.name}><ProviderMark id={id} /></span>)}</div></div>
        <div className={styles.toolbar}><div className={styles.search}><Search size={16} /><Input aria-label="Search agents" placeholder="Search agents or models…" value={search} onChange={e => setSearch(e.target.value)} /></div><select aria-label="Filter agents" value={filter} onChange={e => setFilter(e.target.value)}><option value="all">All agents</option><option value="available">Configurable</option><option value="customized">Customized</option><option value="planned">Planned</option></select><select aria-label="Filter by provider" value={providerFilter} onChange={e => setProviderFilter(e.target.value)}><option value="all">All providers</option>{providers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
        <div className={styles.agentGrid}>{filtered.filter(a => !a.planned).map(a => {
          const settings = state.settings[a.id] || defaults(a.id); const c = connectionFor(settings.model); const last = state.revisions.find(r => r.agentId === a.id);
          return <article className={styles.agentCard} key={a.id}>
            <div className={styles.cardHeading}><AgentMark agent={a} /><div><span className={styles.eyebrow}>{a.category}</span><h2>{a.name}</h2></div><span className={styles.cardVersion}>{settings.paused ? "Paused" : last ? `v${last.version}` : "Default"}</span></div>
            <p className={styles.cardDescription}>{a.description}</p>
            <div className={styles.cardModel}>{c && <ProviderMark id={c.provider} />}<div><strong>{modelName(settings.model)}</strong><span>{c?.provider === "private" ? "Organization-hosted" : providers.find(p => p.id === c?.provider)?.name}{settings.fallback && " · Fallback set"}</span></div><span className={styles.tokenAllowance}>{fmt(settings.output)}<small>output tokens</small></span></div>
            <div className={styles.cardFooter}><span>{last ? `Saved ${date(last.at)}` : `${settings.tools.length} tools available`}</span><Button variant="ghost" size="sm" aria-label={`Configure ${a.name}`} onClick={() => navigate(`/admin/ai/agents/${a.id}`)}>Configure<ArrowRight size={14} /></Button></div>
          </article>;
        })}{!search && filter === "all" && providerFilter === "all" && <article className={styles.privateCard}><div className={styles.privateCardTop}><ProviderMark id="private" /><span>YOUR INFRASTRUCTURE</span></div><h2>Your models.<br />Your environment.</h2><p>Choose an organization-hosted model for any agent, as its primary model or fallback.</p><button onClick={() => navigate('/admin/ai/models')}>Explore private models<ArrowRight size={16} /></button></article>}</div>
        {!!filtered.filter(a => a.planned).length && <section className={styles.plannedSection}><div className={styles.plannedHeading}><h2>More agents, coming next</h2><span>Planned capabilities</span></div><div className={styles.plannedGrid}>{filtered.filter(a => a.planned).map(a => <div key={a.id}><AgentMark agent={a} /><div><strong>{a.name}</strong><span>{a.description}</span></div></div>)}</div></section>}
        {!filtered.length && <div className={styles.tablePanel}><EmptyState title="No matching agents" detail="Try another search or clear the filters." action={<Button variant="outline" onClick={() => { setSearch(""); setFilter("all"); setProviderFilter("all"); }}>Clear filters</Button>} /></div>}

      </>}
      {section === "connections" && <>
        <SectionHead title="Provider connections" description="Keep provider details in one place and reuse them across agents." action={<Button onClick={() => setConnectionEdit("new")} disabled={!writable}><Plus size={16} />Add provider</Button>} />
        <div className={styles.connectionGrid}>{[...state.connections].sort((a, b) => Number(b.provider === "private") - Number(a.provider === "private")).map(c => <article className={styles.connectionCard} data-private={c.provider === "private"} key={c.id}>
          <div className={styles.connectionHeading}><ProviderMark id={c.provider} /><div><h3>{c.name}</h3><span>{providers.find(p => p.id === c.provider)?.name}</span></div><span className={styles.hostingLabel}>{c.provider === "private" ? "Organization-hosted" : "Provider connection"}</span></div>
          <div className={styles.connectionEndpoint}><span>{providers.find(p => p.id === c.provider)?.protocol}</span><code>{c.endpoint || (c.region ? `Region: ${c.region}` : "Endpoint not set")}</code></div>
          <div className={styles.connectionFacts}><div><span>Environment</span><strong>{c.environment}</strong></div><div><span>Models</span><strong>{state.models.filter(m => m.connection === c.id).length} available</strong></div><div><span>Connection</span><strong>Not connected</strong></div></div>
          <div className={styles.cardFooter}><span>Configuration details only</span><Button variant="ghost" size="sm" aria-label={`Edit ${c.name}`} onClick={() => setConnectionEdit(c)}>Manage provider<ArrowRight size={14} /></Button></div>
        </article>)}</div>{!state.connections.length && <EmptyState title="Add your first provider" detail="A provider connection can be shared by several agents." />}
        <div className={styles.explainer}><ShieldCheck size={19} /><div><strong>Credentials stay out of this preview</strong><p>You can organize provider details here. API keys, connection tests and live inference will be connected separately.</p></div></div>
      </>}
      {section === "models" && <>
        <SectionHead title="Model deployments" description="Name your models once, then select them for any agent." action={<Button onClick={() => setModelEdit("new")} disabled={!writable}><Plus size={16} />Add model</Button>} />
        <div className={styles.tablePanel}><SortableTable><thead><tr><th>Model</th><th>Provider connection</th><th>Inference identifier</th><th>Used by</th><th /></tr></thead><tbody>{[...state.models].sort((a, b) => Number(state.connections.find(c => c.id === b.connection)?.provider === "private") - Number(state.connections.find(c => c.id === a.connection)?.provider === "private")).map(m => { const c = state.connections.find(c => c.id === m.connection); const count = agents.filter(a => !a.planned && [state.settings[a.id]?.model || defaults(a.id).model, state.settings[a.id]?.fallback].includes(m.id)).length; return <tr key={m.id}><td><div className={styles.providerCell}>{c && <ProviderMark id={c.provider} />}<div><strong>{m.name}</strong><small>{m.description || "Generation model"}</small></div></div></td><td><strong>{c?.name || "Not assigned"}</strong><small>{c?.provider === "private" ? "Organization-hosted" : "Provider connection"}</small></td><td><code>{m.target || "Not entered"}</code></td><td>{count} {count === 1 ? "agent" : "agents"}</td><td><Button variant="ghost" size="sm" onClick={() => setModelEdit(m)}>Edit<ArrowRight size={14} /></Button></td></tr>; })}</tbody></SortableTable></div>
        <p className={styles.sectionNote}>Verify model access and capabilities before connecting a provider.</p>
      </>}
      {section === "activity" && <>
        <SectionHead title="Configuration history" description="A clear record of the settings saved in this browser." />
        <div className={styles.tablePanel}>{state.revisions.length ? <SortableTable><thead><tr><th>Agent</th><th>Change</th><th>Version</th><th>Saved</th><th /></tr></thead><tbody>{state.revisions.map(r => <tr key={r.id}><td><div className={styles.providerCell}>{agents.find(a => a.id === r.agentId) && <AgentMark agent={agents.find(a => a.id === r.agentId)!} />}<div><strong>{agents.find(a => a.id === r.agentId)?.name}</strong><small>{agents.find(a => a.id === r.agentId)?.category}</small></div></div></td><td>{r.action}<small>{r.changes.join(", ")}</small></td><td>Version {r.version}</td><td>{date(r.at)}</td><td><Button size="sm" variant="ghost" onClick={() => setHistoryDetail(r.id)}>View settings<ArrowRight size={14} /></Button></td></tr>)}</tbody></SortableTable> : <EmptyState title="Your changes will appear here" detail="Save an agent configuration to start its version history. No model executions are recorded in this preview." action={<Button variant="outline" onClick={() => navigate('/admin/ai/agents')}>Configure an agent<ArrowRight size={15} /></Button>} />}</div>
      </>}
      {!nav.some(([id]) => id === section) && <EmptyState title="Configuration page not found" detail="Choose a section above." />}
    </> : agent.planned ? <EmptyState title={`${agent.name} is planned`} detail="Model settings will be available when this agent is introduced." action={<Button variant="outline" onClick={() => navigate('/admin/ai/agents')}>Back to agents</Button>} /> : draft && <AgentEditor agent={agent} state={state} draft={draft} setDraft={setDraft} dirty={dirty} writable={writable} save={() => saveAgent()} back={() => navigate('/admin/ai/agents')} reset={() => setDraft(structuredClone(current!))} restore={r => { setDraft(structuredClone(r)); toast.message("Previous settings loaded", { description: "Review them and save as a new version." }); }} openModels={() => navigate('/admin/ai/models')} />}
    <div className={styles.previewNote}><span>Configuration preview</span><p>Settings are saved for your account in this browser. They do not change live AI or clinical workflows.</p></div>
    <ConnectionDialog value={connectionEdit} connections={state.connections} writable={writable} close={() => setConnectionEdit(null)} save={value => { if (persist({ ...state, connections: [...state.connections.filter(c => c.id !== value.id), value] })) { setConnectionEdit(null); toast.success("Provider details saved"); } }} />
    <ModelDialog value={modelEdit} state={state} writable={writable} close={() => setModelEdit(null)} save={value => { if (persist({ ...state, models: [...state.models.filter(m => m.id !== value.id), value] })) { setModelEdit(null); toast.success("Model details saved"); } }} />
    <Dialog open={!!leave} onOpenChange={open => { if (!open) setLeave(null); }}><DialogContent><DialogHeader><DialogTitle>Leave with unsaved changes?</DialogTitle><DialogDescription>Your last saved configuration will be kept.</DialogDescription></DialogHeader><div className={styles.dialogActions}><Button variant="outline" onClick={() => setLeave(null)}>Keep editing</Button><Button onClick={() => { const to = leave!; setLeave(null); setDraft(null); router.push(to); }}>Discard changes</Button></div></DialogContent></Dialog>
    <Dialog open={!!historyDetail} onOpenChange={open => { if (!open) setHistoryDetail(null); }}><DialogContent className={styles.historyDialog}><DialogHeader><DialogTitle>Saved configuration</DialogTitle><DialogDescription>{agents.find(a => a.id === state.revisions.find(r => r.id === historyDetail)?.agentId)?.name}</DialogDescription></DialogHeader>{(() => { const r = state.revisions.find(r => r.id === historyDetail); return r ? <><div className={styles.historyMeta}>Version {r.version} · {date(r.at)}</div><dl className={styles.reviewList}><dt>Primary model</dt><dd>{modelName(r.settings.model)}</dd><dt>Fallback</dt><dd>{r.settings.fallback ? modelName(r.settings.fallback) : "Off"}</dd><dt>Temperature</dt><dd>{r.settings.temperature ?? "Provider default"}</dd><dt>Output allowance</dt><dd>{fmt(r.settings.output)} tokens</dd><dt>Context budget</dt><dd>{fmt(r.settings.context)} tokens</dd><dt>Allowed tools</dt><dd>{r.settings.tools.join(", ") || "None"}</dd></dl><Button variant="outline" onClick={() => { setHistoryDetail(null); navigate(`/admin/ai/agents/${r.agentId}`); }}>Open agent configuration<ArrowRight size={14} /></Button></> : null; })()}</DialogContent></Dialog>
  </div>;
}

function SectionHead({ title, description, action }: { title: string; description: string; action?: ReactNode }) { return <div className={styles.sectionHead}><div><h2>{title}</h2><p>{description}</p></div>{action}</div>; }
function EmptyState({ title, detail, action }: { title: string; detail: string; action?: ReactNode }) { return <div className={styles.empty}><Settings2 size={28} strokeWidth={1.4} /><h3>{title}</h3><p>{detail}</p>{action}</div>; }

function AgentEditor({ agent, state, draft, setDraft, dirty, writable, save, back, reset, restore, openModels }: { agent: AgentDefinition; state: ConfigState; draft: AgentSettings; setDraft: (s: AgentSettings) => void; dirty: boolean; writable: boolean; save: () => void; back: () => void; reset: () => void; restore: (s: AgentSettings) => void; openModels: () => void }) {
  const [editorTab, setEditorTab] = useState("settings");
  const [advanced, setAdvanced] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const errors = validateSettings(draft, state, agent);
  const update = <K extends keyof AgentSettings>(key: K, value: AgentSettings[K]) => setDraft({ ...draft, [key]: value });
  const model = state.models.find(m => m.id === draft.model);
  const connection = state.connections.find(c => c.id === model?.connection);
  const provider = providers.find(p => p.id === connection?.provider);
  const versions = state.revisions.filter(r => r.agentId === agent.id);
  const total = draft.history + draft.evidence + draft.output + 2048;

  function check() { setShowValidation(true); if (!Object.keys(errors).length) toast.success("Settings look good", { description: "Form and budget checks passed. No provider request was made." }); }
  return <>
    <button className={styles.back} onClick={back}><ArrowLeft size={14} />All agents</button>
    <header className={styles.agentHeader}><AgentMark agent={agent} large /><div><div className={styles.agentTitle}><h1>{agent.name}</h1><span>{agent.category}</span></div><p>{agent.detail}</p></div><div className={styles.versionLabel}>{versions.length ? <><strong>Version {versions[0].version}</strong><span>Saved {date(versions[0].at)}</span></> : <><strong>Default configuration</strong><span>Personalize this agent</span></>}</div></header>
    <Tabs value={editorTab} onValueChange={setEditorTab}><TabsList variant="line" className={styles.navigation} aria-label="Agent configuration views"><TabsTrigger value="settings">Settings</TabsTrigger><TabsTrigger value="instructions">Instructions & tools</TabsTrigger><TabsTrigger value="history">Version history{versions.length ? ` (${versions.length})` : ""}</TabsTrigger></TabsList></Tabs>
    {editorTab === "settings" && <div className={styles.editorGrid}><div className={styles.editorMain}>
      <section className={styles.formPanel}><div className={styles.panelTitle}><span className={styles.sectionNumber}><Layers3 size={18} /></span><div><h2>Model</h2><p>Select a private deployment or a model from your configured providers.</p></div></div><div className={styles.formBody}>
        <div className={styles.fieldGrid}><Field label="Primary model" error={errors.model}><ModelSelect label="Primary model" value={draft.model} state={state} onChange={value => update("model", value)} disabled={!writable} /></Field>
        <Field label="Fallback model" error={errors.fallback}><ModelSelect label="Fallback model" value={draft.fallback} state={state} onChange={value => update("fallback", value)} disabled={!writable} primary={draft.model} /></Field></div>
        <div className={styles.selectedModel} data-private={provider?.id === "private"}>{provider?.id === "private" ? <LockKeyhole size={18} /> : <Network size={18} />}<div><strong>{provider?.id === "private" ? "Organization-hosted deployment" : connection?.name || "Choose a provider"}</strong><span>{provider?.id === "private" ? "Use your own model infrastructure. Endpoint and access setup are managed separately." : `${provider?.protocol || ""} · ${connection?.environment || "Development"}`}</span></div><button onClick={openModels}>Manage models<ArrowRight size={13} /></button></div>
      </div></section>
      <section className={styles.formPanel}><div className={styles.panelTitle}><span className={styles.sectionNumber}><SlidersHorizontal size={18} /></span><div><h2>Response settings</h2><p>Set the balance between answer length and available context.</p></div></div><div className={styles.formBody}>
        <div className={styles.fieldGrid}><Field label="Output allowance" hint="128–32,768 tokens · Includes generated response content." error={errors.output}><div className={styles.unitInput}><Input type="number" min={128} max={32768} value={draft.output} onChange={e => update("output", Number(e.target.value))} disabled={!writable} /><span>tokens</span></div></Field><Field label="Context budget" hint="4,096–262,144 tokens · Application planning limit." error={errors.context}><div className={styles.unitInput}><Input type="number" min={4096} max={262144} value={draft.context} onChange={e => update("context", Number(e.target.value))} disabled={!writable} /><span>tokens</span></div></Field></div>
        <div className={styles.temperature}><div><label htmlFor="ai-temperature-mode">Temperature</label><p>Use the model’s default, or set a value for this agent.</p></div><select id="ai-temperature-mode" value={draft.temperature === null ? "default" : "custom"} onChange={e => update("temperature", e.target.value === "default" ? null : 0.2)} disabled={!writable}><option value="default">Provider default</option><option value="custom">Custom value</option></select></div>
        {draft.temperature !== null && <div className={styles.sliderRow}><div><input aria-label="Temperature slider" type="range" min={0} max={2} step={0.1} value={draft.temperature} onChange={e => update("temperature", Number(e.target.value))} disabled={!writable} /><div className={styles.sliderLabels}><span>More focused</span><span>More varied</span></div></div><Field label="Value" error={errors.temperature}><Input type="number" min={0} max={2} step={0.1} value={draft.temperature} onChange={e => update("temperature", Number(e.target.value))} disabled={!writable} /></Field></div>}
      </div></section>
      <section className={styles.formPanel}><button className={styles.advancedToggle} aria-expanded={advanced} aria-controls="ai-advanced-settings" onClick={() => setAdvanced(!advanced)}><SlidersHorizontal size={18} /><span><strong>Advanced settings</strong><small>Context allocation, timeouts and retries</small></span>{advanced ? <ChevronDown size={17} /> : <ChevronRight size={17} />}</button>{advanced && <div className={styles.formBody} id="ai-advanced-settings"><div className={styles.fieldGrid}>{([['history', 'Conversation history', 'tokens', 0, 64000], ['evidence', 'Retrieved evidence', 'tokens', 0, 128000], ['timeout', 'Response timeout', 'seconds', 10, 300], ['retries', 'Additional retries', 'attempts', 0, 3]] as const).map(([key, title, unit, min, max]) => <Field key={key} label={title} hint={`${fmt(min)}–${fmt(max)} ${unit}`} error={errors[key]}><div className={styles.unitInput}><Input type="number" min={min} max={max} value={draft[key]} onChange={e => update(key, Number(e.target.value))} disabled={!writable} /><span>{unit}</span></div></Field>)}</div><label className={styles.checkRow}><input type="checkbox" checked={draft.paused} onChange={e => update("paused", e.target.checked)} disabled={!writable} /><div><strong>Pause this configuration</strong><small>Keep its saved settings while excluding it from the preview setup.</small></div></label></div>}</section>
    </div><aside><section className={styles.formPanel}><div className={styles.asideTitle}><h2>At a glance</h2><span>{dirty ? "Unsaved changes" : "Up to date"}</span></div><div className={styles.asideProvider}>{provider && <ProviderMark id={provider.id} />}<div><strong>{model?.name || "Choose a model"}</strong><span>{provider?.id === "private" ? "Organization-hosted" : provider?.name}</span></div></div><dl className={styles.summaryList}><dt>Hosting</dt><dd>{provider?.id === "private" ? "Private deployment" : "Provider connection"}</dd><dt>Output</dt><dd>{agent.output}</dd><dt>Temperature</dt><dd>{draft.temperature ?? "Provider default"}</dd><dt>Tools</dt><dd>{draft.tools.length} allowed</dd></dl><div className={styles.contextCard}><div><h3>Context allocation</h3><strong>{fmt(draft.context)}</strong></div><div className={styles.contextBar} role="img" aria-label={`${fmt(total)} of ${fmt(draft.context)} tokens allocated`}>{([['history', draft.history], ['evidence', draft.evidence], ['output', draft.output], ['reserve', 2048]] as const).map(([key, value]) => <span key={key} data-part={key} style={{ width: `${Math.min(100, value / Math.max(draft.context, total, 1) * 100)}%` }} />)}</div><div className={styles.budgetLegend}>{[['History', draft.history], ['Evidence', draft.evidence], ['Response', draft.output], ['Instructions & reserve', 2048]].map(([name, value]) => <div key={name}><span>{name}</span><strong>{fmt(Number(value))}</strong></div>)}</div><p>{total <= draft.context ? `${fmt(draft.context - total)} tokens unallocated` : `${fmt(total - draft.context)} tokens over budget`}</p></div></section><div className={styles.boundary}><ShieldCheck size={19} /><h3>Review stays in your hands</h3><p>These settings do not change clinical decisions, independent QA or risk model coefficients.</p></div></aside></div>}
    {editorTab === "instructions" && <div className={styles.instructionsGrid}><section className={styles.formPanel}><div className={styles.panelTitle}><span className={styles.sectionNumber}><MessageSquareText size={18} /></span><div><h2>Instructions</h2><p>Give this agent guidance on style and focus.</p></div></div><div className={styles.formBody}><div className={styles.lockedPrompt}><span>Core instructions<ShieldCheck size={14} /></span><p>Use authorized workspace evidence, preserve source references and clearly distinguish supported findings from proposals. Keep clinical review and approval with the responsible user.</p><small>Managed by Perform+ · {agent.id}_v1</small></div><Field label="Additional instructions" hint={`${draft.supplement.length}/2,000 characters · Do not include credentials or patient details.`}><textarea rows={7} maxLength={2000} value={draft.supplement} placeholder="Keep explanations concise and highlight missing evidence." onChange={e => update("supplement", e.target.value)} disabled={!writable} /></Field></div></section><section className={styles.formPanel}><div className={styles.panelTitle}><span className={styles.sectionNumber}><Waypoints size={18} /></span><div><h2>Allowed tools</h2><p>Tools available to this agent’s business role.</p></div></div><div className={styles.formBody}>{agent.tools.map(tool => <label className={styles.toolRow} key={tool}><input type="checkbox" checked={draft.tools.includes(tool)} onChange={e => update("tools", e.target.checked ? [...draft.tools, tool] : draft.tools.filter(t => t !== tool))} disabled={!writable} /><span><strong>{tool}</strong><small>Read-only · Existing record permissions apply</small></span></label>)}<p className={styles.sectionNote}>Tool selections are configuration metadata in this preview. No actions are executed here.</p></div></section></div>}
    {editorTab === "history" && <section className={styles.tablePanel}>{versions.length ? <SortableTable><thead><tr><th>Version</th><th>Changed settings</th><th>Saved</th><th /></tr></thead><tbody>{versions.map((r, i) => <tr key={r.id}><td><strong>Version {r.version}</strong><small>{i === 0 ? "Current saved settings" : r.action}</small></td><td>{r.changes.join(", ")}</td><td>{date(r.at)}</td><td><Button variant="outline" size="sm" onClick={() => { restore(r.settings); setEditorTab("settings"); }} disabled={!writable || equal(r.settings, draft)}>Restore as draft</Button></td></tr>)}</tbody></SortableTable> : <EmptyState title="Start this agent’s history" detail="Your first save creates version 1. Later changes stay available to review or restore." />}</section>}
    {showValidation && <div role="status" className={Object.keys(errors).length ? styles.validationError : styles.validationSuccess}>{Object.keys(errors).length ? <><strong>Review {Object.keys(errors).length} {Object.keys(errors).length === 1 ? "setting" : "settings"}</strong><p>{Object.values(errors).join(" ")}</p></> : <><Check size={17} /><span>Settings and budget checks passed. Provider connectivity has not been tested.</span></>}<button aria-label="Dismiss validation" onClick={() => setShowValidation(false)}><X size={15} /></button></div>}
    <div className={styles.saveBar}><div><strong>{dirty ? "Unsaved changes" : versions.length ? `Version ${versions[0].version} saved` : "Default settings"}</strong><span>{dirty ? "Save to keep these settings for this agent." : "Adjust the settings to make this agent your own."}</span></div><Button variant="ghost" disabled={!dirty} onClick={reset}>Discard changes</Button><Button variant="outline" onClick={check}>Check settings</Button><Button onClick={() => { setShowValidation(true); save(); }} disabled={!writable || !!Object.keys(errors).length || (!dirty && versions.length > 0)}><Check size={16} />Save configuration</Button></div>
  </>;
}

function ConnectionDialog({ value, connections, writable, close, save }: { value: Connection | "new" | null; connections: Connection[]; writable: boolean; close: () => void; save: (value: Connection) => void }) {
  const [draft, setDraft] = useState<Connection>({ id: "", name: "", provider: "openai", endpoint: "https://api.openai.com/v1", region: "", environment: "Development" });
  const [error, setError] = useState("");
  useEffect(() => { if (value) { setDraft(value === "new" ? { id: crypto.randomUUID(), name: "", provider: "openai", endpoint: "https://api.openai.com/v1", region: "", environment: "Development" } : { ...value }); setError(""); } }, [value]);
  const update = (field: keyof Connection, val: string) => setDraft({ ...draft, [field]: val });
  function submit() {
    if (draft.name.trim().length < 2) { setError("Enter a connection name with at least two characters."); return; }
    if (connections.some(c => c.id !== draft.id && c.name.toLowerCase() === draft.name.trim().toLowerCase())) { setError("A connection with this name already exists."); return; }
    if (draft.endpoint) { try { const url = new URL(draft.endpoint); if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash) throw new Error(); } catch { setError("Use an HTTPS API root without credentials, query parameters or fragments."); return; } }
    save({ ...draft, name: draft.name.trim(), endpoint: draft.endpoint.trim() });
  }
  return <Dialog open={!!value} onOpenChange={open => { if (!open) close(); }}><DialogContent className={styles.formDialog}><DialogHeader><DialogTitle>{value === "new" ? "Add provider" : "Provider details"}</DialogTitle><DialogDescription>Reusable provider details for your agent configurations.</DialogDescription></DialogHeader><div className={styles.dialogBody}><Field label="Connection name"><Input maxLength={100} value={draft.name} onChange={e => update("name", e.target.value)} placeholder="Azure clinical workspace" disabled={!writable} /></Field><div className={styles.fieldGrid}><Field label="Provider"><ProviderSelect value={draft.provider} onChange={id => setDraft({ ...draft, provider: id, endpoint: providers.find(p => p.id === id)!.endpoint, region: "" })} disabled={!writable} /></Field><Field label="Environment"><select value={draft.environment} onChange={e => update("environment", e.target.value)} disabled={!writable}>{["Development", "Test", "Production"].map(e => <option key={e}>{e}</option>)}</select></Field></div>{draft.provider === "bedrock" ? <Field label="AWS region" hint="The location of your intended Bedrock connection."><Input value={draft.region} onChange={e => update("region", e.target.value)} placeholder="us-west-2" disabled={!writable} /></Field> : <Field label={draft.provider === "azure" ? "Resource endpoint" : draft.provider === "private" ? "Private endpoint" : "API base URL"} hint={draft.provider === "azure" ? "Use your resource origin. The v1 API path is added by the integration." : draft.provider === "private" ? "Your organization’s hosted model endpoint. OpenAI-compatible API format." : "No API keys or credentials in this field."}><Input value={draft.endpoint} onChange={e => update("endpoint", e.target.value)} placeholder={draft.provider === "azure" ? "https://your-resource.openai.azure.com" : draft.provider === "private" ? "https://models.your-organization.com/v1" : "Provider API endpoint"} disabled={!writable} /></Field>}<div className={styles.credentialNote}><ShieldCheck size={18} /><p>Credential setup and connection testing are not enabled in this preview. Only these nonsecret details will be saved.</p></div>{error && <p role="alert" className={styles.fieldError}>{error}</p>}</div><div className={styles.dialogActions}><Button variant="outline" onClick={close}>Cancel</Button><Button onClick={submit} disabled={!writable}>Save provider</Button></div></DialogContent></Dialog>;
}

function ModelDialog({ value, state, writable, close, save }: { value: Deployment | "new" | null; state: ConfigState; writable: boolean; close: () => void; save: (value: Deployment) => void }) {
  const [draft, setDraft] = useState<Deployment>({ id: "", name: "", connection: "", target: "", description: "" });
  const [error, setError] = useState("");
  useEffect(() => { if (value) { setDraft(value === "new" ? { id: crypto.randomUUID(), name: "", connection: state.connections[0]?.id || "", target: "", description: "" } : { ...value }); setError(""); } }, [value]);
  const azure = state.connections.find(c => c.id === draft.connection)?.provider === "azure";
  function submit() {
    if (draft.name.trim().length < 2 || !state.connections.some(c => c.id === draft.connection)) { setError("Enter a model name and select a provider connection."); return; }
    if (state.models.some(m => m.id !== draft.id && m.name.toLowerCase() === draft.name.trim().toLowerCase())) { setError("A model with this display name already exists."); return; }
    if (/https?:|[\r\n]/.test(draft.target)) { setError("Use the exact model or deployment identifier, not a URL."); return; }
    save({ ...draft, name: draft.name.trim(), target: draft.target.trim() });
  }
  return <Dialog open={!!value} onOpenChange={open => { if (!open) close(); }}><DialogContent className={styles.formDialog}><DialogHeader><DialogTitle>{value === "new" ? "Add model" : "Model details"}</DialogTitle><DialogDescription>Use a clear display name so your team can choose the right model.</DialogDescription></DialogHeader><div className={styles.dialogBody}><Field label="Display name"><Input maxLength={100} value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} placeholder="Clinical review model" disabled={!writable} /></Field><Field label="Provider connection"><ConnectionSelect value={draft.connection} connections={state.connections} onChange={id => setDraft({ ...draft, connection: id })} disabled={!writable} /></Field><Field label={azure ? "Azure deployment name" : "Model identifier"} hint={azure ? "Use the deployment name from your Azure resource, which may differ from the underlying model name." : "Optional in this preview. Enter the exact inference target when known."}><Input maxLength={200} value={draft.target} onChange={e => setDraft({ ...draft, target: e.target.value })} placeholder={azure ? "clinical-review" : "Exact model identifier"} disabled={!writable} /></Field><Field label="Description"><Input maxLength={160} value={draft.description} onChange={e => setDraft({ ...draft, description: e.target.value })} placeholder="What this model is used for" disabled={!writable} /></Field>{error && <p role="alert" className={styles.fieldError}>{error}</p>}</div><div className={styles.dialogActions}><Button variant="outline" onClick={close}>Cancel</Button><Button onClick={submit} disabled={!writable || !state.connections.length}>Save model</Button></div></DialogContent></Dialog>;
}
