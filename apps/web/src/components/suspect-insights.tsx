"use client";
import { useMemo } from "react";
import { label, num } from "@/lib/api";
import type { Opportunity } from "@/lib/types";
import { Panel } from "./shared";
import { CompositionRing } from "./report-visuals";

const agingBucket = (due: string | undefined, status: string) => {
  if (status === "suppressed" || status === "deferred") return "Deferred or suppressed";
  if (!due) return "No due date";
  const days = Math.floor((new Date(`${due}T12:00:00`).getTime() - Date.now()) / 86400000);
  if (days < 0) return "Past due";
  if (days <= 14) return "Due within 14 days";
  if (days <= 45) return "Due within 45 days";
  return "Due beyond 45 days";
};
const AGING_ORDER = ["Past due", "Due within 14 days", "Due within 45 days", "Due beyond 45 days", "No due date", "Deferred or suppressed"];

function ring(items: { name: string; value: number }[], colors: string[]) {
  return items.map((item, index) => ({ ...item, color: colors[index % colors.length] }));
}
const TYPE_COLORS = ["#0f52ba", "#0e7c86", "#6b7fd7", "#8a5fbf", "#4b8f3a", "#c2703d", "#997a00"];
const EVIDENCE_COLORS = ["#0f52ba", "#4b8f3a", "#c2703d", "#6b7fd7", "#997a00"];

export function RegistryInsights({ rows }: { rows: Opportunity[] }) {
  const { types, evidence, owners, aging } = useMemo(() => {
    const count = (key: (o: Opportunity) => string) => {
      const map = new Map<string, number>();
      for (const o of rows) map.set(key(o), (map.get(key(o)) || 0) + 1);
      return [...map.entries()].sort((a, b) => b[1] - a[1]);
    };
    return {
      types: count((o) => label(o.type)).map(([name, value]) => ({ name, value })),
      evidence: count((o) => o.evidence || "Unrated").map(([name, value]) => ({ name, value })),
      owners: count((o) => o.owner || "Unassigned"),
      aging: AGING_ORDER.map((bucket) => ({ name: bucket, value: rows.filter((o) => agingBucket(o.due_date, o.status) === bucket).length })).filter((item) => item.value > 0),
    };
  }, [rows]);
  if (!rows.length) return null;
  return (
    <div className="registry-insights" aria-label="Suspect portfolio composition">
      <Panel title="Suspect mix by finding type" subtitle="Active filters applied.">
        <CompositionRing items={ring(types, TYPE_COLORS)} label="suspects" />
      </Panel>
      <Panel title="Evidence strength" subtitle="Strong evidence carries the highest confirmation likelihood.">
        <CompositionRing items={ring(evidence, EVIDENCE_COLORS)} label="suspects" />
      </Panel>
      <Panel title="Due-date aging" subtitle="Derived from assigned due dates; deferred and suppressed work is separate.">
        <ul className="insight-bars">
          {aging.map((item) => (
            <li key={item.name}>
              <span>{item.name}</span>
              <span className="insight-bar" style={{ width: `${Math.max(4, (item.value / rows.length) * 100)}%` }} aria-hidden="true" />
              <strong>{num(item.value)}</strong>
            </li>
          ))}
        </ul>
      </Panel>
      <Panel title="Owner workload" subtitle="Top owners of the filtered suspect cohort.">
        <ul className="insight-bars">
          {owners.slice(0, 6).map(([name, value]) => (
            <li key={name}>
              <span>{name}</span>
              <span className="insight-bar" style={{ width: `${Math.max(4, (value / rows.length) * 100)}%` }} aria-hidden="true" />
              <strong>{num(value)}</strong>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
