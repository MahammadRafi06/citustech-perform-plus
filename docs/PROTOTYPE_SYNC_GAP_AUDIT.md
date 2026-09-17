# Prototype Sync: implementation and verification

Updated September 17, 2026. These changes are in the local working tree and running at http://localhost:3000. They have not been pushed or deployed as part of this task.

## Current scope

The visible Risk analytics tabs are **Risk & conditions, Geography, Provider and Financial**. AI results and Score scenarios are hidden following the latest instruction. Their underlying components and APIs remain intact; old tab links show the available Risk & conditions report and the evidence drawer no longer offers the hidden scenario action.

## Checklist

| # | Requested item | Status | Result |
|---|---|---|---|
| 1 | Remove Northstar / Meridian references | Done in active UI | Login and header branding removed. Legacy plan display values normalize to Medicare Advantage; contract IDs are retained with neutral labels. Original source records and unused historical assets are not rewritten. |
| 2 | Remove top-right Search Suspects | Done | No shared-header search. The conditions list retains its local search. |
| 3 | Consistent help/user controls | Done within Risk; external comparison pending | One shared header provides Workspace guide and Account menu on every screen. Current Stars/Compass application references were requested but have not been supplied. |
| 4 | Align top band with Enterprise Compass | Done against supplied reference | The supplied HTML's Segoe UI, white 60px band, 20px horizontal padding and CT colors are applied. Current live cross-product parity remains unverified. |
| 5 | Align contract names with Stars | Awaiting authoritative names | H1032 and H5594 now use neutral Medicare Advantage labels. IDs and selection behavior are unchanged. No Stars names were invented. |
| 6 | Remove Score Type selector | Done | Raw/adjusted control is removed. Score view is the separate baseline/potential/submitted/accepted selection. |
| 7 | Full-population provider hierarchy | Done | Central MA Network → Northside Medical / Harbor Primary Care → Provider covers all 30 native practices and the four Member 360 provider scopes. The supplied reference names and clinical identities are preserved. The native group attribution is authored presentation data. API filtering and exports use the same hierarchy. |
| 8 | Remove Population Analysis row/explanations | Done | Intro containers, population summary row and How this works control are removed. |
| 9 | KPI naming | Done | Potential, Submitted to CMS and Accepted by CMS appear in the MA score tiles, views and legends. Non-CMS program wording remains appropriate. |
| 10 | Realistic RAF trends | Done | Series vary independently and preserve the score ordering; current endpoints match the tiles. |
| 11 | Capitalization | Done | Score tiles share the Member 360 uppercase label treatment. The now-hidden scenario tiles use the same primitive. Explicitly requested matrix wording is preserved. |
| 12 | RAF distribution terminology/counts | Done | Distribution uses population percentages, Median and 90th percentile. Member-count axis/tooltips and scored-member footer are removed. |
| 13 | Cleaner chart titles/subtitles | Done | Main prevalence/geography titles remain concise; explanatory chart footers are removed. |
| 14 | Multi-select conditions / matrix | Done | Checkbox condition selection filters bubbles, quadrant totals and list drill-through. Cases are counted once across the selected condition domains. Protected contributing groups do not expose a partial total. |
| 15 | Closure categories | Done | Low, Medium and High appear in the axis, level selector, bubble tooltip, selected detail and drill-through chips. Exact underlying values remain for reproducible filtering. |
| 16 | Quadrant click updates detail | Done | Quadrants update the selected suspect count and the conditions-list action; condition and closure filters carry through. |
| 17 | Explanations behind information icons | Done | Shared accessible information popovers provide chart methods and denominators. Evidence provenance, suppression, missing-score exclusions and scenario caveats remain. |
| 18 | Latest recapture period | Done | By month is the default. Latest month appears first with a distinct header and cell treatment; older months remain paginated. |
| 19 | Common-member comparison | Done under revised scope | The latest requested 2025 → 2026 continuing-member comparison remains. Identical enrolled/scored members and covered-month weights are used in both years. Added conditions, unconfirmed conditions and coding updates reconcile to the change. The older V24/V28 model-isolation request was superseded, not represented as completed by this annual comparison. |
| 20 | Cumulative identified / closed trends | Done | Dashboard and Provider chart Total Identified against Total Closed, accumulating all earlier runs through each month. Dashboard shows Still Open as identified minus closed and labels the confirmed subset Closed — HCC Confirmed. Closed never exceeds identified. Confirmed additions remain distinct from closed-but-unsupported outcomes. No operational chart-delivery events are used. |
| 21 | Replace ZIP stratification | Done | Social-needs filtering uses County and propagates the existing county population filter. Original member ZIP data remains available in member records. |
| 22 | Overcoding emphasis | Done | Possible overcoding remains a primary suspect tab and Dashboard coding-risk card. Data issues is available through the conditions-list category and a smaller source-data-check link rather than a main tab. Evidence checks remain intact. |
| 23 | Two charts plus one table | Done for visible reports | Risk & conditions, Geography, Provider and Financial each have two primary charts and one table. AI results and Score scenarios were consolidated too, then hidden at the user's request. Non-MA programs without a payment model retain the existing unavailable-revenue behavior. |
| 24 | Financial parameter popup | Done | A concise assumptions strip opens Edit forecast. Draft edits do not affect reports until Apply; Cancel discards edits and Reset defaults restores the inputs. Calculation details are behind an information icon. |
| 25 | Suspected HCC terminology | Done where mapped | MA suspect metrics count mapped HCC findings. HCC grouping uses Suspected HCCs. Unmapped reference findings, data issues and other programs retain condition/suspect terminology rather than being mislabeled as HCCs. |

## Visible report layouts

| Tab | Charts | Table |
|---|---|---|
| Risk & conditions | Condition prevalence; Chronic recapture | Common conditions & yearly confirmation |
| Geography | County RAF comparison; County opportunity | County comparison |
| Provider | Provider capture & recapture; Cumulative suspect outcomes | Provider comparison |
| Financial | Revenue estimate waterfall; Revenue over time | Compare revenue forecasts |

## Verification

- 74 existing landing/analytics checks passed; five new tests passed for multi-condition unions, cumulative totals, complete hierarchy coverage, county filtering and plan-label cleanup.
- Four Member 360 identity, ordering, access-scope and evidence-boundary tests passed.
- Web TypeScript check passed after the final tab-hiding change.
- Populated browser inspection at the user's desktop viewport confirmed two charts and one table on the visible tabs, consistent tiles and no horizontal page overflow in the inspected report views.
- Two selected matrix conditions (diabetes and cardiovascular) produced **182 suspects**, and drill-through showed **182 records**. The condition selections and quadrant remained in the URL.
- Forecast Cancel reopened at the original **75%** review rate. Applying **80%** updated Expected net revenue from **$1,838,578 to $1,983,030**. Reset restored **75%**, 90% payment rate, $1,000/RAF/month and the 12-month forecast inputs.
- Contract labels, full hierarchy options, calculation popovers, latest-first recapture, model-details dialog (before its parent tab was hidden) and final four-tab navigation were inspected in the browser.
- Existing local browser-extension hydration warnings remain separate from these feature checks; this is not a public deployment certification.

## Only external follow-up

Supply the authoritative Stars contract names and current Stars/Enterprise Compass reference URLs to certify exact cross-product naming and header parity. The supplied HTML reference has been used; no live cross-product match is claimed without those sources.

## Source pointers

- [Workspace, report tabs and forecast dialog](../apps/web/src/components/analytics-workspace.tsx)
- [Calculation help and condition selector](../apps/web/src/components/analytics-controls.tsx)
- [Dashboard interactions](../apps/web/src/components/landing-analytics.tsx)
- [Report charts](../apps/web/src/components/analytics-visuals.tsx)
- [Provider hierarchy](../apps/api/app/provider_hierarchy.py)
- [Analytics filtering and metrics](../apps/api/app/analytics_experience.py)
- [Landing aggregates and annual comparison](../apps/api/app/analytics_landing.py)
- [Supplied reference](../PERFORMplus_MemberListApp_Member360_v14.html)
