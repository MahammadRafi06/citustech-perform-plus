"use client";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, AreaChart, Area, Legend, Cell } from "recharts";
export const REPORT_COLORS = ["#2456b7", "#09858a", "#7b80c4", "#c39143", "#9aacc6"];
const format = (value: unknown) => typeof value === "number" ? new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value) : String(value ?? "");
export function AnalyticsBars({ rows, keys = [{ key: "value", name: "Findings" }], horizontal = false, height = 280 }: { rows: Record<string, unknown>[]; keys?: { key: string; name: string }[]; horizontal?: boolean; height?: number }) {
  return <div style={{ width: "100%", minWidth: 0, height }} role="img" aria-label={keys.map(k => k.name).join(" and ")}><ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 700, height }}><BarChart data={rows} layout={horizontal ? "vertical" : "horizontal"} margin={{ top: 12, right: 24, bottom: 8, left: 4 }} barCategoryGap="28%" accessibilityLayer>
    <CartesianGrid stroke="#e9edf4" vertical={false} strokeDasharray="3 4" />
    <XAxis type={horizontal ? "number" : "category"} dataKey={horizontal ? undefined : "name"} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#66758a" }} tickFormatter={v => typeof v === "number" ? format(v) : String(v)} />
    <YAxis type={horizontal ? "category" : "number"} dataKey={horizontal ? "name" : undefined} width={horizontal ? 162 : 48} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#66758a" }} />
    <Tooltip formatter={value => format(value)} contentStyle={{ borderRadius: 8, border: "1px solid #dfe5ef", fontSize: 12 }} cursor={{ fill: "#f3f6fb" }} />
    {keys.length > 1 && <Legend iconType="circle" wrapperStyle={{ fontSize: 12, paddingTop: 14 }} />}
    {keys.map((key, i) => <Bar key={key.key} dataKey={key.key} name={key.name} fill={REPORT_COLORS[i]} radius={horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]} isAnimationActive={false}>{keys.length === 1 && rows.map((_, index) => <Cell key={index} fill={REPORT_COLORS[index % REPORT_COLORS.length]} />)}</Bar>)}
  </BarChart></ResponsiveContainer></div>;
}
export function ProjectionTrend({ rows }: { rows: { name: string; conservative: number; base: number; optimistic: number }[] }) {
  return <div style={{ width: "100%", height: 290 }} role="img" aria-label="Cumulative financial projection scenarios"><ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 700, height: 290 }}><AreaChart data={rows} margin={{ top: 12, right: 18, left: 8, bottom: 8 }} accessibilityLayer>
    <CartesianGrid stroke="#e9edf4" vertical={false} strokeDasharray="3 4" /><XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} /><YAxis tickFormatter={v => `$${Math.round(v / 1000)}k`} axisLine={false} tickLine={false} tick={{ fontSize: 11 }} width={62} /><Tooltip formatter={value => `$${format(value)}`} contentStyle={{ borderRadius: 8, fontSize: 12 }} /><Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
    <Area type="monotone" dataKey="optimistic" name="Optimistic" stroke="#7b80c4" fill="#7b80c4" fillOpacity={.06} strokeWidth={2} isAnimationActive={false} /><Area type="monotone" dataKey="base" name="Base" stroke="#2456b7" fill="#2456b7" fillOpacity={.1} strokeWidth={2.5} isAnimationActive={false} /><Area type="monotone" dataKey="conservative" name="Conservative" stroke="#09858a" fill="#09858a" fillOpacity={.08} strokeWidth={2} isAnimationActive={false} />
  </AreaChart></ResponsiveContainer></div>;
}
