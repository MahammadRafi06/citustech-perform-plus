"use client";

import { useId, type CSSProperties } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { num } from "@/lib/api";
import styles from "./report-visuals.module.css";

export const chartColors = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)", "var(--chart-6)"];
export type ChartSlice = { name: string; value: number; color?: string };
const finite = (n: number | null | undefined): n is number => typeof n === "number" && Number.isFinite(n);
const plotLabel = (name: string) => {
  if (name.length <= 24) return [name];
  const at = name.lastIndexOf(" ", 24);
  const split = at > 8 ? at : 24;
  const remainder = name.slice(split).trim();
  return [name.slice(0, split), remainder.length <= 24 ? remainder : `…${remainder.slice(-23)}`];
};
const percent = (n: number, total: number) => total > 0 ? `${(n / total * 100).toFixed(1)}%` : "—";

/** Mutually exclusive categories only. Overlapping prevalence uses PrevalenceTiles. */
export function CompositionRing({ items, label = "records", onSelect }: { items: ChartSlice[]; label?: string; onSelect?: (name: string) => void }) {
  const total = items.reduce((sum, item) => sum + Math.max(0, item.value), 0);
  let offset = 0;
  return <div className={styles.composition}>
    <div className={styles.ring}>
      <svg viewBox="0 0 240 240" role="img" aria-label={`${num(total)} ${label}. ${items.map(item => `${item.name}: ${num(item.value)}`).join("; ")}`}>
        <circle cx="120" cy="120" r="91" fill="none" stroke="var(--muted)" strokeWidth="25" />
        {total > 0 && items.map((item, index) => {
          const size = Math.max(0, item.value) / total * 100;
          const start = offset; offset += size;
          return <circle key={item.name} cx="120" cy="120" r="91" pathLength="100" fill="none" stroke={item.color || chartColors[index % chartColors.length]} strokeWidth="25" strokeDasharray={`${Math.max(0, size - (size < 100 ? Math.min(.7, size / 5) : 0))} ${100 - Math.max(0, size - (size < 100 ? Math.min(.7, size / 5) : 0))}`} strokeDashoffset={-start} transform="rotate(-90 120 120)"><title>{item.name}: {num(item.value)} ({percent(item.value, total)})</title></circle>;
        })}
        <text x="120" y="119" textAnchor="middle" className={styles.ringValue}>{num(total)}</text>
        <text x="120" y="142" textAnchor="middle" className={styles.ringLabel}>{label}</text>
      </svg>
    </div>
    <div className={styles.legend} aria-label={`${label} distribution`}>
      {items.map((item, index) => {
        const content = <><i style={{ background: item.color || chartColors[index % chartColors.length] }} /><span>{item.name}</span><strong>{num(item.value)}</strong><small>{percent(item.value, total)}</small></>;
        return onSelect ? <button key={item.name} onClick={() => onSelect(item.name)}>{content}</button> : <div key={item.name}>{content}</div>;
      })}
      {!total && <p className={styles.note}>No recorded values in this scope.</p>}
    </div>
  </div>;
}

export function ComparisonPlot({ rows, leftLabel = "Manual", rightLabel = "AI-assisted", unit = "", max, format }: { rows: { name: string; before: number | null | undefined; after: number | null | undefined }[]; leftLabel?: string; rightLabel?: string; unit?: string; max?: number; format?: (value: number) => string }) {
  const values = rows.flatMap(row => [row.before, row.after]).filter(finite);
  const minimum = Math.min(0, ...values);
  const maximum = max ?? Math.max(1, ...values) * 1.08;
  const roughStep = (maximum - minimum) / 5;
  const power = 10 ** Math.floor(Math.log10(roughStep || 1));
  const fraction = roughStep / power;
  const step = (fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10) * power;
  const lower = Math.floor(minimum / step) * step;
  const upper = max ?? Math.ceil(maximum / step) * step;
  const ticks = Array.from({ length: Math.round((upper - lower) / step) + 1 }, (_, i) => lower + i * step);
  const x = (value: number) => 172 + (value - lower) / (upper - lower || 1) * 390;
  const display = format || ((n: number) => `${Number(n.toFixed(2))}${unit}`);
  const height = rows.length * 70 + 50;
  return <div className={styles.plot}>
    <div className={styles.plotLegend}><span><i style={{ background: "var(--data-manual)" }} />{leftLabel}</span><span><i style={{ background: "var(--chart-2)" }} />{rightLabel}</span></div>
    <svg viewBox={`0 0 610 ${height}`} role="img" aria-label={rows.map(row => `${row.name}: ${leftLabel} ${finite(row.before) ? display(row.before) : "unavailable"}; ${rightLabel} ${finite(row.after) ? display(row.after) : "unavailable"}`).join(". ")}>
      {ticks.map(value => { return <g key={value}><line x1={x(value)} y1="12" x2={x(value)} y2={height - 28} stroke="var(--border)" strokeDasharray="3 5" /><text x={x(value)} y={height - 7} textAnchor="middle" className={styles.axis}>{new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(value)}{unit}</text></g>; })}
      {rows.map((row, i) => { const y = i * 70 + 38; return <g key={row.name}>
        <text x="0" y={y + (plotLabel(row.name).length > 1 ? -4 : 4)} className={styles.plotLabel}>{plotLabel(row.name).map((line, index) => <tspan key={index} x="0" dy={index ? 16 : 0}>{line}</tspan>)}<title>{row.name}</title></text>
        {finite(row.before) && finite(row.after) && <line x1={x(row.before)} x2={x(row.after)} y1={y} y2={y} stroke="var(--border-strong)" strokeWidth="3" />}
        {finite(row.before) && <><circle cx={x(row.before)} cy={y} r="5" fill="var(--data-manual)" /><text x={x(row.before)} y={y - 13} textAnchor="middle" className={styles.beforeValue}>{display(row.before)}</text></>}
        {finite(row.after) && <><circle cx={x(row.after)} cy={y} r="6" fill="var(--chart-2)" stroke="var(--card)" strokeWidth="2" /><text x={x(row.after)} y={y + 22} textAnchor="middle" className={styles.afterValue}>{display(row.after)}</text></>}
        {!finite(row.before) && !finite(row.after) && <text x="172" y={y + 4} className={styles.axis}>No retained values</text>}
      </g>; })}
    </svg>
  </div>;
}

export function QualityMatrix({ values }: { values?: { tp: number; fp: number; fn: number; tn: number } }) {
  if (!values) return <p className={styles.empty}>No retained evaluation counts.</p>;
  const cells = [
    { label: "True positive", count: values.tp, note: "Supported flag", tone: "teal" },
    { label: "False negative", count: values.fn, note: "Missed reference finding", tone: "amber" },
    { label: "False positive", count: values.fp, note: "Unsupported flag", tone: "amber" },
    { label: "True negative", count: values.tn, note: "Correctly unflagged", tone: "blue" },
  ];
  return <div className={styles.matrix} role="group" aria-label="AI flags against independent reference labels">
    <div /><span>Flagged by AI</span><span>Not flagged</span>
    {cells.map((cell, i) => <div className={styles.matrixRow} key={cell.label}>{i % 2 === 0 && <span className={styles.matrixAxis}>Reference<br />{i === 0 ? "positive" : "negative"}</span>}<div className={styles.matrixCell} data-tone={cell.tone}><span>{cell.label}</span><strong>{num(cell.count)}</strong><small>{cell.note}</small></div></div>)}
  </div>;
}

export function MetricSpotlight({ items }: { items: { label: string; value: string; note: string }[] }) {
  return <div className={styles.spotlights}>{items.map((item, i) => <div key={item.label} style={{ "--metric-color": chartColors[i % 2] } as CSSProperties}><span>{item.label}</span><strong>{item.value}</strong><small>{item.note}</small></div>)}</div>;
}

export function MonthlyTrend({ values }: { values: { month: string; value: number; denominator: number }[] }) {
  const id = useId().replace(/:/g, "");
  const rows = values.map(row => ({ ...row, value: finite(row.value) ? row.value : null }));
  if (!values.length) return <p className={styles.empty}>No monthly score series. Calculate the selected input basis to view retained results.</p>;
  return <div className={styles.trend}>
    <div className={styles.plotLegend}><span><i style={{ background: "var(--chart-1)" }} />Raw model score</span><small>Monthly member-weighted values · zero-based axis</small></div>
    <ResponsiveContainer width="100%" height={255} initialDimension={{ width: 800, height: 255 }}><AreaChart data={rows} margin={{ top: 18, right: 20, bottom: 8, left: 0 }} accessibilityLayer>
      <defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--chart-1)" stopOpacity={.19} /><stop offset="100%" stopColor="var(--chart-1)" stopOpacity={.015} /></linearGradient></defs>
      <CartesianGrid stroke="var(--border)" vertical={false} strokeDasharray="3 5" />
      <XAxis dataKey="month" tickFormatter={month => ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][Number(String(month).slice(5, 7)) - 1] || String(month)} tick={{ fill: "var(--text-muted)", fontSize: 12 }} axisLine={false} tickLine={false} dy={8} />
      <YAxis domain={[0, "auto"]} tick={{ fill: "var(--text-muted)", fontSize: 12 }} axisLine={false} tickLine={false} width={48} />
      <Tooltip content={({ active, payload, label }) => active && payload?.length ? <div className={styles.tooltip}><strong>{label}</strong><span>Raw score <b>{Number(payload[0].value).toFixed(3)}</b></span><span>Member-months <b>{num(payload[0].payload.denominator)}</b></span></div> : null} />
      <Area type="linear" dataKey="value" stroke="var(--chart-1)" strokeWidth={2.5} fill={`url(#${id})`} dot={{ r: 3, fill: "var(--card)", strokeWidth: 2 }} activeDot={{ r: 5 }} isAnimationActive={false} connectNulls={false} />
    </AreaChart></ResponsiveContainer>
  </div>;
}

export function PrevalenceTiles({ items, selected, onSelect }: { items: { category: string; members: number; denominator: number }[]; selected: string; onSelect: (category: string) => void }) {
  const ranked = [...items].sort((a, b) => b.members - a.members).slice(0, 12);
  if (!ranked.length) return <p className={styles.empty}>No retained categories in this score basis.</p>;
  return <div className={styles.prevalence}>
    <div className={styles.tileGrid}>{ranked.map((item, index) => <button key={item.category} aria-pressed={selected === item.category} onClick={() => onSelect(item.category)} style={{ "--tile-color": chartColors[index % 2], "--tile-tint": `${Math.min(24, 4 + (item.denominator ? item.members / item.denominator : 0) * 28)}%` } as CSSProperties}>
      <span>{item.category}<small>{String(index + 1).padStart(2, "0")}</small></span><strong>{percent(item.members, item.denominator)}</strong><small>{num(item.members)} / {num(item.denominator)} scored members</small>
    </button>)}</div><p className={styles.note}>Top {ranked.length} categories by distinct members. Categories may overlap; percentages do not add to 100%. Select a category to inspect its cohort below.</p>
  </div>;
}

export function CoverageGauge({ value, total, label }: { value: number; total: number; label: string }) {
  const ratio = total > 0 ? Math.max(0, Math.min(1, value / total)) : 0;
  return <div className={styles.coverage}><svg viewBox="0 0 110 110" role="img" aria-label={`${label}: ${num(value)} of ${num(total)}`}><circle cx="55" cy="55" r="43" fill="none" stroke="var(--muted)" strokeWidth="8" /><circle cx="55" cy="55" r="43" pathLength="100" stroke="var(--chart-2)" strokeWidth="8" fill="none" strokeDasharray={`${ratio * 100} 100`} strokeLinecap={ratio > 0 ? "round" : "butt"} transform="rotate(-90 55 55)" /><text x="55" y="61" textAnchor="middle" className={styles.gaugeValue}>{total ? `${Math.round(ratio * 100)}%` : "—"}</text></svg><div><strong>{label}</strong><span>{num(value)} of {num(total)}</span><small>{total ? "Based on the selected scope" : "No comparable denominator"}</small></div></div>;
}
