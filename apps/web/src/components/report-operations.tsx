"use client";

import { useState, type CSSProperties } from "react";
import { label, num } from "@/lib/api";
import type { Snapshot } from "@/lib/types";
import { Panel, Empty } from "./shared";
import { CompositionRing } from "./report-visuals";
import styles from "./report-operations.module.css";

type Row = { id: string; name: string; category: string; status: string };
const countBy = (rows: Row[], key: "category" | "status") => Object.entries(rows.reduce<Record<string, number>>((all, row) => { all[row[key]] = (all[row[key]] || 0) + 1; return all; }, {})).sort((a, b) => b[1] - a[1]);

export function OperationalVisuals({ domain, rows, data }: { domain: string; rows: Row[]; data: Snapshot }) {
  const [selected, setSelected] = useState("");
  if (!rows.length) return <Panel title={`${domain} activity`}><Empty title="No recorded activity" description="The visualization will appear when this workflow has records." /></Panel>;
  const responseCounts = data.providers.reduce<Record<number, number>>((all, provider) => { all[provider.response_days] = (all[provider.response_days] || 0) + 1; return all; }, {});
  const practiceSlices = Object.entries(responseCounts).sort((a, b) => Number(a[0]) - Number(b[0])).map(([days, value]) => ({ name: `${days} ${Number(days) === 1 ? "day" : "days"}`, value }));
  const statuses = countBy(rows, "status");
  const categories = countBy(rows, "category");
  // Include the tail in Other so every record remains in the chart denominator.
  const statusNames = statuses.slice(0, 5).map(([key]) => key);
  const categoryNames = categories.slice(0, 5).map(([key]) => key);
  const columns = [...statusNames, ...(statuses.length > 5 ? ["Other states"] : [])];
  const groups = [...categoryNames, ...(categories.length > 5 ? ["Other categories"] : [])];
  const countCell = (category: string, status: string) => rows.filter(row => (category === "Other categories" ? !categoryNames.includes(row.category) : row.category === category) && (status === "Other states" ? !statusNames.includes(row.status) : row.status === status)).length;
  const max = Math.max(1, ...groups.flatMap(group => columns.map(status => countCell(group, status))));
  return <div className="report-chart-grid">
    <Panel title={domain === "Providers" ? "Practice workload and response" : "Current workflow composition"} subtitle={domain === "Providers" ? "Recorded response days and review workload · all practices in scope" : `${num(rows.length)} records · mutually exclusive recorded states`}>
      {domain === "Providers" ? <ProviderPlot data={data} /> : <CompositionRing items={statuses.map(([name, value]) => ({ name: label(name), value }))} label="records" />}
    </Panel>
    <Panel title={domain === "Providers" ? "Practice response profile" : "Where the work sits"} subtitle={domain === "Providers" ? "Practices by recorded response time · full access scope" : "Record counts by context and workflow state"}>
      {domain === "Providers" ? <CompositionRing items={practiceSlices} label="practices" /> : <div className={styles.heatmap}>
        <div className={styles.matrix} role="table" aria-label={`${domain} records by context and state`} style={{ gridTemplateColumns: `minmax(125px,1.4fr) repeat(${columns.length}, minmax(48px,1fr))` }}>
          <div role="row" className={styles.row}><span role="columnheader" className={styles.corner}>Context</span>{columns.map(status => <span role="columnheader" key={status} className={styles.column}>{label(status)}</span>)}</div>
          {groups.map(group => <div role="row" key={group} className={styles.row}><span role="rowheader" className={styles.rowLabel} title={group}>{group}</span>{columns.map(status => { const count = countCell(group, status); const name = `${group} · ${label(status)}`; return <div role="cell" key={status}><button className={styles.cell} aria-label={`${name}: ${count} records`} aria-pressed={selected === name} onClick={() => setSelected(selected === name ? "" : name)} style={{ "--heat": `${count ? 9 + count / max * 29 : 0}%` } as CSSProperties}>{count}</button></div>; })}</div>)}
        </div>
        <div className={styles.heatLegend}><span>Fewer</span><i /><span>More records</span></div>
        <p className={styles.note}>{selected || "Select a cell to read its context. Exact records remain available below."}</p>
      </div>}
    </Panel>
  </div>;
}

function ProviderPlot({ data }: { data: Snapshot }) {
  const points = data.providers.map(provider => ({ ...provider, work: data.opportunities.filter(item => item.provider === provider.name).length }));
  const grouped = [...points.reduce<Map<string, { response: number; work: number; names: string[] }>>((all, point) => {
    const key = `${point.response_days}:${point.work}`;
    const group = all.get(key) || { response: point.response_days, work: point.work, names: [] };
    group.names.push(point.name); all.set(key, group); return all;
  }, new Map()).values()];
  const maxX = Math.max(5, Math.ceil(Math.max(...points.map(point => point.response_days)) / 5) * 5);
  const maxY = Math.max(5, Math.ceil(Math.max(...points.map(point => point.work)) / 20) * 20);
  const x = (value: number) => 48 + value / maxX * 445;
  const y = (value: number) => 234 - value / maxY * 190;
  return <div className={styles.providerPlot}>
    <svg viewBox="0 0 560 290" role="img" aria-label={`Practice response days and current work items: ${points.map(point => `${point.name}, ${point.response_days} days, ${point.work} work items`).join("; ")}`}>
      {[0, 1, 2, 3, 4].map(i => <g key={i}><line x1="48" x2="510" y1={y(maxY * i / 4)} y2={y(maxY * i / 4)} stroke="var(--border)" strokeDasharray="3 5" /><text x="37" y={y(maxY * i / 4) + 4} textAnchor="end" className={styles.axis}>{Number((maxY * i / 4).toFixed(1))}</text><text x={x(maxX * i / 4)} y="258" textAnchor="middle" className={styles.axis}>{Number((maxX * i / 4).toFixed(1))}</text></g>)}
      <text x="48" y="17" className={styles.axis}>Current work items</text><text x="275" y="282" textAnchor="middle" className={styles.axis}>Recorded response time (days)</text>
      {grouped.map(point => <g key={`${point.response}:${point.work}`}><circle cx={x(point.response)} cy={y(point.work)} r={10 + Math.sqrt(point.names.length) * 4} fill="var(--chart-2)" fillOpacity=".13" /><circle cx={x(point.response)} cy={y(point.work)} r="7" fill="var(--chart-2)" stroke="var(--card)" strokeWidth="2"><title>{point.names.join(", ")}: {point.response} days · {point.work} work items each</title></circle><text x={x(point.response)} y={y(point.work) - 23} textAnchor="middle" className={styles.pointLabel}>{point.names.length}</text></g>)}
    </svg>
    <p className={styles.note}>{num(points.length)} practices shown. Overlapping practices share a point; the number above it is the practice count. Hover for names. Full practice details are retained in the table below.</p>
  </div>;
}
