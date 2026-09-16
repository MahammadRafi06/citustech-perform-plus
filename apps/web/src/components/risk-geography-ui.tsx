"use client";

import { useState, type CSSProperties } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { ArrowDownToLine, ArrowUpRight, LoaderCircle, MapPin, RotateCcw } from "lucide-react";
import { useRiskContext } from "./risk-ui";
import { Empty, Panel } from "./shared";
import { Button } from "./ui/button";
import { PaginatedTable } from "./table-pagination";
import { api, num } from "@/lib/api";
import { downloadRiskJson, formatRiskScore, scoreBasisLabels } from "@/lib/risk-client";
import type { User } from "@/lib/types";
import styles from "./risk-geography.module.css";

type Aggregate = { value: number | null; numerator: number | null; denominator: number; members: number; scored_members: number; unscored_members: number; stale_members: number; run_ids?: string[] };
type Group = Aggregate & { id: string; name: string; county: string; provider_id: string; provider: string };
type Result = { dimension: string; metric: string; definition: string; attribution: string; limitation: string | null; summary: Aggregate; groups: Group[]; counties: Group[]; providers: Group[]; matrix: Group[]; options: { counties: string[]; providers: { id: string; name: string }[] }; members_page: { total: number; page: number; size: number; items: { member_id: string; name: string; county: string; city: string; provider_id: string; provider: string; run_id: string | null; value: number | null; member_months: number; stale: boolean }[] } };
const shortCounty = (name: string) => name.replace(/ County$/, "");

export function RiskGeography({ user }: { user: User }) {
  const context = useRiskContext();
  // Remount only the report when model/stage changes, so pages and selections
  // cannot be carried into a different calculation context.
  return <GeographyReport key={`${user.id}:${context.configId}:${context.basis}`} user={user} />;
}

function GeographyReport({ user }: { user: User }) {
  const context = useRiskContext();
  const [county, setCounty] = useState("");
  const [provider, setProvider] = useState("");
  const [dimension, setDimension] = useState("county");

  const scope = `${context.configId}:${context.basis}:${county}:${provider}:${dimension}`;
  const results = useQuery({ queryKey: ["risk", "geography", user.id, scope], queryFn: () => api<Result>(`/risk/analytics/geography?${new URLSearchParams({ config_id: context.configId, basis: context.basis, county, provider_id: provider, dimension, page: "1", size: "10" })}`), enabled: !!context.configId, placeholderData: keepPreviousData });
  const data = results.data;
  const select = (nextCounty: string, nextProvider: string) => { setCounty(nextCounty); setProvider(nextProvider); };
  const summary = data?.summary;
  const activeDimension = data?.dimension || dimension;
  const providerView = activeDimension === "provider";
  const ranked = [...((providerView ? data?.providers : data?.counties) || [])].sort((a, b) => (b.value ?? -Infinity) - (a.value ?? -Infinity)).slice(0, providerView ? 10 : 12);
  const maximum = Math.max(1, ...ranked.map(row => row.value ?? 0)) * 1.12;
  const matrixProviders = [...(data?.providers || [])].sort((a, b) => b.members - a.members || a.name.localeCompare(b.name)).slice(0, 6);
  const cells = new Map(data?.matrix.map(cell => [cell.id, cell]));
  const scores = (data?.matrix || []).flatMap(row => row.value == null ? [] : [row.value]);
  const low = Math.min(...scores), high = Math.max(...scores);
  return <div className={`risk-workspace ${styles.workspace}`} aria-busy={results.isFetching}>
    <div className={styles.heading}><div><span className={styles.eyebrow}><MapPin size={14} /> Florida portfolio</span><h2>Geography & provider performance</h2><p>Compare risk across member residence counties and assigned practices.</p></div>{context.permissions.includes("export") && <Button variant="outline" disabled={!data || results.isFetching} onClick={() => downloadRiskJson({ configuration: context.configuration, score_basis: context.basis, filters: { county, provider_id: provider }, dimension, ...data }, `geography-${context.configId}-${context.basis}.json`)}><ArrowDownToLine size={15} />Export analysis</Button>}</div>
    <div className={styles.filters}>
      <label>Member county<select aria-label="Member county" value={county} onChange={e => select(e.target.value, provider)}><option value="">All counties</option>{data?.options.counties.map(name => <option key={name}>{name}</option>)}</select></label>
      <label>Assigned practice<select aria-label="Assigned practice" value={provider} onChange={e => select(county, e.target.value)}><option value="">All practices</option>{data?.options.providers.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <div className={styles.filterNote}><strong>{scoreBasisLabels[context.basis]}</strong><span role="status">{results.isFetching ? "Updating results…" : "County + practice filters apply together"}</span></div>
      <Button variant="ghost" size="sm" disabled={!county && !provider} onClick={() => select("", "")}><RotateCcw size={14} />Reset filters</Button>
    </div>
        <div className={styles.dimensions} role="tablist" aria-label="Group risk results by">{[["county", "By county"], ["provider", "By provider"], ["county_provider", "County + provider"]].map(([value, name]) => <button key={value} role="tab" aria-selected={dimension === value} onClick={() => { setDimension(value); }}>{name}</button>)}</div>
    {results.isPending ? <div className="risk-loading"><LoaderCircle className="animate-spin" size={18} />Loading county and practice results…</div> : results.error ? <Empty title="Geography analytics unavailable" description={results.error.message} /> : data && summary ? <>
      {data.limitation && <div className="risk-notice">{data.limitation}</div>}
      <div className={styles.metrics}>
        <div><span>Portfolio {data.metric}</span><strong>{formatRiskScore(summary.value)}</strong><small>Member-month weighted · unnormalized</small></div>
        <div><span>Members in scope</span><strong>{num(summary.members)}</strong><small>{num(summary.scored_members)} scored · {num(summary.unscored_members)} unscored</small></div>
        <div><span>Scored member-months</span><strong>{num(summary.denominator)}</strong><small>{num(summary.stale_members)} members with stale results</small></div>
        <div><span>County / practice coverage</span><strong>{data.counties.length}<em>/</em>{data.providers.length}</strong><small>Within the selected member cohort</small></div>
      </div>
      {!!data.groups.length ? <div className={styles.visuals}>
        <Panel title={`${data.metric} by ${providerView ? "provider" : "county"}`} subtitle={providerView ? "Ten highest-scoring practices · full breakdown below" : "Select a county to focus the aggregate analysis."}>
          <div className={styles.ranking} style={{ "--rank-label": providerView ? "180px" : "110px" } as CSSProperties}>
            <div className={styles.rankHeader}><span>{providerView ? "Assigned practice" : "Member residence"}</span><span>Weighted score</span><span>Members</span></div>
            {ranked.map(row => <button className={styles.rankRow} key={row.id} onClick={() => select(providerView ? county : row.county, providerView ? row.provider_id : provider)} aria-label={`${row.name}, ${data.metric} ${formatRiskScore(row.value)}, ${num(row.members)} members`}>
              <span title={row.name}>{providerView ? row.provider : shortCounty(row.county)}</span><div className={styles.track}><div className={styles.trackLine} />{summary.value != null && <i className={styles.benchmark} style={{ left: `${summary.value / maximum * 100}%` }} />}{row.value != null ? <><i className={styles.dot} style={{ left: `${row.value / maximum * 100}%` }} /><b style={{ left: `${row.value / maximum * 100}%` }}>{formatRiskScore(row.value)}</b></> : <small>Unscored</small>}</div><strong>{num(row.members)}</strong>
            </button>)}
            <div className={styles.rankAxis}><span /><div><span>0</span><span>{formatRiskScore(maximum, 1)}</span></div><span /></div>
            <p className={styles.note}>Vertical marker: selected portfolio average. Unscored groups have no plotted value.</p>
          </div>
        </Panel>
        <Panel title="County × practice" subtitle={`${matrixProviders.length} of ${data.providers.length} practices by member volume · select a cell to explore`}>
          <div className={styles.matrixWrap}><table className={styles.matrix}><caption className="sr-only">Member-month weighted {data.metric} for each county and practice</caption><thead><tr><th>County</th>{matrixProviders.map(p => <th key={p.id} title={p.name}><span>{p.name}</span></th>)}</tr></thead><tbody>{data.counties.map(c => <tr key={c.id}><th>{shortCounty(c.county)}</th>{matrixProviders.map(p => { const cell = cells.get(`${c.county}|${p.provider_id}`); const value = cell?.value; const strength = value == null ? 0 : high === low ? .5 : (value - low) / (high - low); return <td key={p.id}><button disabled={!cell} className={styles.heatCell} style={{ "--heat": `${Math.round(12 + strength * 72)}%` } as CSSProperties} data-scored={value != null} data-dark={strength > .55 && value != null} onClick={() => select(c.county, p.provider_id)} aria-label={`${c.county}, ${p.name}: ${value == null ? "No scored months" : formatRiskScore(value)}, ${cell?.members || 0} members`} title={`${cell?.members || 0} members · ${cell?.denominator || 0} scored months`}>{formatRiskScore(value)}</button></td>; })}</tr>)}</tbody></table>
          <div className={styles.legend}><span>{scores.length ? formatRiskScore(low) : "No scored results"}</span>{scores.length > 0 && <><i /><span>{formatRiskScore(high)}</span></>}<small>— No scored months</small></div></div>
        </Panel>
      </div> : <Empty title="No members in this combination" description="Choose another county or practice, or reset the filters." />}
      <Panel title="Performance breakdown" subtitle={`${data.metric} · same model, score basis and member-month weighting`}>
        <PaginatedTable rows={data.groups} label="Geography performance" scope={scope} headers={<><th>{activeDimension === "provider" ? "Assigned practice" : "Member county"}</th>{activeDimension === "county_provider" && <th>Assigned practice</th>}<th>{data.metric}</th><th>Members</th><th>Scored / unscored</th><th>Member-months</th><th>Stale</th><th /></>}>{row => <tr key={row.id}><td>{activeDimension === "provider" ? row.provider : row.county}</td>{activeDimension === "county_provider" && <td>{row.provider}</td>}<td className="risk-number">{formatRiskScore(row.value)}</td><td>{num(row.members)}</td><td>{num(row.scored_members)} / {num(row.unscored_members)}</td><td>{num(row.denominator)}</td><td>{num(row.stale_members)}</td><td><Button variant="ghost" size="sm" onClick={() => select(row.county || county, row.provider_id || provider)}>Focus cohort<ArrowUpRight size={13} /></Button></td></tr>}</PaginatedTable>
      </Panel>
      <details className="risk-disclosure"><summary>Metric definition & attribution</summary><p className={styles.note}>{data.definition} {data.attribution} Raw RAF is an internal model measure, before normalization or payment adjustments. It does not represent payment.</p></details>
    </> : null}
  </div>;
}
