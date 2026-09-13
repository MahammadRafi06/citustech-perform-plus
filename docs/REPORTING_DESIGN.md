# Workspace palette and reporting

The signed-in workspace uses one palette, defined in `apps/web/src/app/tokens.css`. Existing near-duplicate colors now reference these tokens at their original definitions; there is no additional theme override layer. The white sidebar and login composition are retained.

| Purpose | Token | Color |
| --- | --- | --- |
| Primary action, selection, leading data series | `--primary`, `--chart-1` | Cobalt `#3659ad` |
| Supporting data, assisted review | `--signal`, `--chart-2` | Teal `#258582` |
| Categorical data | `--chart-3` through `--chart-6` | Ochre, muted violet, blue-gray, slate |
| Main canvas | `--background` | `#f6f7f9` |
| Panels and navigation | `--card` | White |
| Main text | `--foreground` | `#202b3b` |
| Secondary text | `--text-muted` | `#667284` |
| Rules and panel edges | `--border` | `#e2e6ec` |

Warnings, errors and evidence highlights have distinct semantic tokens. Workflow status labels stay neutral with no colored backgrounds or status dots. Chart legends are separate from status labels and always include readable text and values.

## Reports

Risk analytics exposes ten reports in one side-by-side tab row, with Radix keyboard navigation and URL-preserved selection. Existing program/model and score-basis context is retained.

- **AI Impact:** review-time comparison by recorded chart complexity, an AI/reference outcome matrix and a compact metric summary. The frozen synthetic comparison and its definitions remain explicit; final human review outcomes remain separate from AI-stage results.
- **Executive / Risk overview:** composition ring for mutually exclusive risk buckets and a completeness gauge. Member counts, member-month denominators and factor-ledger links remain available.
- **Risk & conditions:** a monthly area/line plot with exact denominator tooltips, prevalence tiles linked to contributing members, distinct recapture gauges, and a matched-cohort period comparison. Monthly lines use straight segments and a zero-based axis, without invented intermediate values.
- **Operational reports:** composition rings and record-count heatmaps. Tail categories are included in Other; counts still reconcile to the underlying records. Known zero values remain zero.
- **Providers:** response/workload scatter plot and response-time composition. Identical coordinates are grouped, with practice counts and names retained; the table includes response days. Average response time means the arithmetic mean of recorded response days across practices in scope.
- **Financial:** paired baseline/scenario plots use retained estimates and sensitivity results. Missing assumptions still leave estimates incomplete; no payment or eligibility gate changes.

Operational exports now contain the selected report's records and calculation context instead of downloading the unrelated AI comparison. The existing export permission is required. AI exports, retained risk analytics, financial exports and evidence drill-downs remain available.

## Display rules

Composition rings only use mutually exclusive categories. Condition prevalence can overlap and therefore uses individually labeled tiles, not a pie chart. Missing comparisons remain unavailable, zero denominators show no percentage, and population stages are not drawn as a sequential conversion funnel. The implementation adds no data, dates, outcomes or clinical calculations.

Reusable visuals are in `report-visuals.tsx`; operational chart layouts are in `report-operations.tsx`. Their custom styles are scoped CSS modules. Existing unused bar-chart styles were removed.
