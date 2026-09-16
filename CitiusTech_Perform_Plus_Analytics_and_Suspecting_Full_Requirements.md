# CitiusTech Perform+ — Analytics and Suspecting Requirements

**Version:** 1.0 — consolidated requirements for the next demonstration release  
**Prepared:** 16 September 2026  
**Product:** CitiusTech Perform+  
**Delivery:** Desktop application; local demonstration using synthetic data  
**Document purpose:** Business, functional, data, calculation, presentation and acceptance requirements. This document authorizes no development, deployment or external transmission.

> Analyze population risk, identify and prioritize suspected conditions, inspect supporting evidence, quantify potential score impact, and export actionable insights.

The business goal is **risk-adjustment data integrity while maximizing the health plan's supported financial benefit through accurate health-status representation and identification of overcapture**. Positive opportunity and required downward corrections must both remain visible. A suspected condition is a question for review; it is not an established diagnosis, an accepted submission or earned revenue.

## Contents

1. [Scope, decisions and evidence](#1-scope-decisions-and-evidence)
2. [Capability baseline and change matrix](#2-capability-baseline-and-change-matrix)
3. [Information architecture and screen contracts](#3-information-architecture-and-screen-contracts)
4. [Shared analytic semantics and metric dictionary](#4-shared-analytic-semantics-and-metric-dictionary)
5. [Executive and population requirements](#5-executive-and-population-requirements)
6. [RAF and model intelligence](#6-raf-and-model-intelligence)
7. [Suspect intelligence and evidence](#7-suspect-intelligence-and-evidence)
8. [Closure-probability specification](#8-closure-probability-specification)
9. [Financial-projection specification](#9-financial-projection-specification)
10. [Geography and provider analytics](#10-geography-and-provider-analytics)
11. [AI Impact and Ask Perform+](#11-ai-impact-and-ask-perform)
12. [Report catalog, exports and visual design](#12-report-catalog-exports-and-visual-design)
13. [Data entities and analytic interfaces](#13-data-entities-and-analytic-interfaces)
14. [Data gaps and demonstration population plan](#14-data-gaps-and-demonstration-population-plan)
15. [Journeys and reconciliation acceptance](#15-journeys-and-reconciliation-acceptance)
16. [Security, performance and release boundaries](#16-security-performance-and-release-boundaries)
17. [Decision register](#17-decision-register)
18. [Traceability and implementation backlog](#18-traceability-and-implementation-backlog)
19. [Release acceptance and sources](#19-release-acceptance-and-sources)

## 1. Scope, decisions and evidence

### 1.1 Requirement status and priority

| Label | Meaning |
|---|---|
| Confirmed scope | Explicitly specified in the supplied latest-scope prompt or the user's clarified business goal. |
| Specified default | A concrete recommendation adopted by this document to remove implementation ambiguity. It is not a claim of stakeholder sign-off or empirical validation. The decision register identifies its owner. |
| Existing | Capability reported in the supplied implementation inventory; preserve it. This is not fresh code verification. |
| Enhance | Extend or correct a reported existing capability without rebuilding its foundation. |
| New | A separately identifiable requirement absent from the supplied inventory. |
| Deferred | Outside the visible demonstration release, even if underlying code already exists. |
| Unable to verify | Repository/runtime evidence is unavailable or does not establish the claim. This is an evidence status, not evidence that a capability is absent. |
| P0 | Required for the current analytics/suspecting demonstration. An explicit unavailable state satisfies a requirement only where this document permits it. |
| P1 | Follow-up enhancement after the P0 demonstration; not a silent release dependency. |
| P2 | Future production capability requiring separate validation, data, integration or security work. |

Acceptance criteria are normative requirements for a future implementation. They are not test results from the current application. Business defaults may be changed through versioned requirements change control; formulas, fixtures and exports must then change together.

### 1.2 Primary users and decisions

| Persona | Decisions supported | Primary surfaces |
|---|---|---|
| Risk-adjustment executive | Where is risk incompletely represented? How much opportunity is supported versus speculative? What integrity exposure remains? | Executive, Financial, concise reports |
| RA analytics lead | Which conditions/cohorts explain score changes, recapture gaps and suspect concentration? | Risk & conditions, Geography & practices, Suspecting |
| Suspecting/clinical analytics specialist | Is a finding an evidence-backed coding gap, an assessment hypothesis, a correction or a data issue? What source supports it? | Suspect Registry, bounded evidence panel |
| Actuarial/finance analyst | Which model, assumptions and overlap rules drive the estimate? How sensitive is it? | RAF Intelligence, Financial, scenario exports |
| Data/model steward | Are scores, mappings, eligible populations and evidence current and complete? | Coverage/methodology panels, provenance exports |
| Demonstration presenter | Can the population-to-evidence-to-projection story be completed without dead ends? | All P0 surfaces, prepared analysis replays |

Provider task execution, coding production work, submission operations and care management are not personas with new workspaces in this release.

### 1.3 Confirmed visible scope

- Population/cohort analytics, RAF/model intelligence, suspect-level inspection, financial sensitivity, AI evaluation and polished reports.
- Aggregate drilldowns by model, condition, residence county and assigned practice.
- Suspect-level identifiers and bounded evidence excerpts inside the registry; no member chart timeline or Member 360.
- Existing local authentication, server-enforced authorization, saved calculation history and exports.
- Local, populated, reproducible demonstration. Live LLM inference and enterprise SSO are not release prerequisites.

**Primary journey:** Explore population → identify opportunity → inspect evidence → model impact → export insights.

### 1.4 Explicit exclusions and retained technical capabilities

**SCP-01 — P0 / Enhance — Visible scope.** Hide chart review execution, coding QA execution, campaigns/assignments, owner work queues, chart chase, intake operations, provider tasks, pre-visit workflows, submissions, operational audit workspaces, Member 360 and agent/provider configuration from primary navigation, dashboard actions and contextual links. **Acceptance:** each primary journey completes without entering one of these surfaces; no visible action opens a hidden workflow.

**SCP-02 — P0 / Existing — Preserve underlying behavior.** Retain existing workflow APIs, histories, evidence, model runs, local authentication and role/practice protections. Hiding a route does not authorize data access. **Acceptance:** regression checks establish that retained data is readable by its authorized functions and direct API calls still enforce scope.

**SCP-03 — P0 / Enhance — RAF lab decision.** The visible RAF experience uses aggregate cohort scenarios. Existing individual-input/full-member scenario endpoints and saved records remain optional technical capabilities for authorized model verification outside the core navigation. Do not add a member selector, demographic editor, individual risk ledger or member-analysis route to satisfy aggregate scenario requirements. Computation may still operate on individual profiles server-side. **Acceptance:** population scenarios work without opening a member workspace; direct technical access obeys existing permissions and is not linked from reports.

**SCP-04 — P0 / Existing — Hosting boundary.** Preserve the decommissioned public-hosting state and disabled deployment automation. **Acceptance:** this release's requirements and demo instructions use local startup only; no AWS provisioning, public publishing or deployment restoration is required.

**SCP-05 — P0 / Enhance — Prior-document precedence.** This scope supersedes older requirements that made operational workflows and individual risk profiles part of the demonstration. Retain their underlying clinical safeguards and calculation provenance. **Acceptance:** backlog items for hidden operations are marked deferred, not imported as P0 through old requirement references.

### 1.5 Evidence actually available

| Evidence ID | Material | What it establishes | Limit |
|---|---|---|---|
| E01 | `LATEST_SCOPE_REQUIREMENTS_PROMPT(1).md`, supplied for this task | Current scope decisions and stakeholder-reported implementation inventory | Does not prove current code, dataset counts or runtime behavior |
| E02 | Prior `CitusTech_Perform_Plus_Business_Requirements_v2.md` available in the workspace | Prior requirements, historical fixture definitions and conflicts with new scope | A requirements document, not implementation evidence |
| E03 | Earlier application screenshots in this conversation | Historical screen composition and branding | Not evidence of the latest refresh; no current visual regression conclusion is made |
| E04 | Prior Suspecting Categories and Rules document and visible conversation | Integrity goal and seven-category clinical/business taxonomy | Does not authorize operational workspaces in this release |
| E05 | Official sources in section 19 | Program-specific model and payment distinctions | Do not verify the application's model implementation |
| E06 | Repository/runtime | Not available in the supplied workspace; named application paths were not found | All claimed current implementation details remain unable to verify |

No current repository commit, live dataset audit, source-code line evidence or browser acceptance result is claimed. The first backlog task is evidence reconciliation when the repository is supplied. Do not block requirements completion on that future check.

## 2. Capability baseline and change matrix

“Reported” below means E01 unless stated otherwise. **All repository/runtime statuses in this table are unable to verify in this task.** Proposed owner paths are listed later as inspection targets, not as files read.

| ID | Capability | Reported baseline | Required disposition | Delivery |
|---|---|---|---|---|
| B01 | Next.js/React/TypeScript, Tailwind/shadcn, FastAPI, PostgreSQL | Separate UI/API/database components | Existing; reuse stack and boundaries | P0 |
| B02 | Local auth, superuser, role/practice restrictions | Working locally | Existing; enforce on aggregates and exports as well as rows | P0 |
| B03 | Desktop shell | White collapsible sidebar, IBM Plex Sans, cobalt/teal | Enhance; consistent dense analytic layouts, no mobile design | P0 |
| B04 | Synthetic population | About 10,000 members, 12 counties, 30 assigned practices, 1,500 findings | Enhance; audited manifest and balanced demo coverage; preserve IDs | P0 |
| B05 | Source evidence | Six detailed clinical stories retain sources | Existing; preserve; distinguish source-backed from metadata-only findings | P0 |
| B06 | Versioned scoring and scenarios | Snapshots, factors, exclusions, stages, histories | Existing; share semantics across analytics | P0 |
| B07 | Eight executable configurations | MA, RxHCC and ACA configurations listed in section 6 | Enhance; explicit execution/profile/population coverage | P0 |
| B08 | Medicaid | External-score import with metadata/exceptions | Existing; import analytics, no native payment engine claim | P0 |
| B09 | Default MA population run | Completed for 10,000 members | Existing; verify eligibility and scope before treating as coverage denominator | P0 |
| B10 | Other program populations | Reference/profile coverage | Enhance; reference-only badge or authentic scoped run; no copied MA scores | P0 |
| B11 | V24 comparison | Unavailable | Deferred; unavailable comparison state is mandatory | P0 state / P2 engine |
| B12 | Score states | Raw, adjusted and multiple data/processing bases | Enhance; separate axes and restrict headline choices | P0 |
| B13 | Executive/risk analytics | Coverage, distribution, prevalence, recapture, comparisons | Enhance; metric contracts and aggregate drilldowns | P0 |
| B14 | County/practice analytics | Intersections, ranks, heatmap, weighting | Enhance; fixed attribution, small-cohort rules and reconciliation | P0 |
| B15 | Current aggregate refresh | Histograms, percentiles, change-direction counts; member lists removed | Unable to verify; inspect latest working tree before changing components | P0 verification |
| B16 | Registry | Types, evidence, status, filters, source history, excerpts | Enhance; canonical suspects, seven-category mapping, scenario links | P0 |
| B17 | Synthetic planning probabilities | Shared Strong/Moderate/Limited assumptions; historical/predictive adjustments | Enhance; named target/horizon, versioned exact rule, exclusions | P0 |
| B18 | Exposure assumptions | Separate from calculated model deltas | Existing; preserve separation in charts, sorting and exports | P0 |
| B19 | MA planning view | Reach, realization, benchmark, horizon, ranges, curves | Enhance; unambiguous formula, frozen overlap selection, signed corrections | P0 |
| B20 | ACA/Medicaid sensitivity | Retained input/result methods; not reconciliation | Existing + Enhance; expose only within verified method/data scope | P0 |
| B21 | AI evaluation and replay | Frozen comparison, source-linked prepared outputs | Existing + Enhance; no measured live savings claims | P0 |
| B22 | Ask Perform+ | Prepared/bounded explanation behavior | Enhance as an optional contextual panel; no new live agent dependency | P0 existing path / P1 expansion |
| B23 | CSV/JSON/ZIP exports | Existing, including aggregate analysis/planning assumptions | Enhance; consistent manifest, scope and reconciliation | P0 |
| B24 | Saved report/scenario presentation | Saved calculation inputs/results exist | Enhance; named snapshot-backed report views | P0 |
| B25 | PDF and editable presentation exports | Not established | New; separately scoped rendering/output capability | P1 |
| B26 | Operational/member/configuration screens | Existing or previously required | Deferred from visible core; retain permitted backend behavior | Not P0 UI |
| B27 | Empirical probability calibration | No evidence of calibrated model | New; outcomes, mature cohorts, validation, monitoring | P2 |
| B28 | Real payment attribution/inference/SSO | Not established for this release | Deferred; never implied by a polished demo | P2 |

## 3. Information architecture and screen contracts

### 3.1 Navigation

Use four primary sidebar destinations: **Overview**, **Analytics**, **Suspect Registry**, **Reports**. Analytics has six tabs: **Risk & conditions**, **Geography & practices**, **Suspecting**, **RAF Intelligence**, **Financial**, **AI Impact**. The existing Executive tab becomes the Overview entry to the same report; retain an old-route redirect rather than a second divergent executive dashboard.

RAF Intelligence is the aggregate presentation of existing model/scenario capabilities. Reports is a catalog and saved-view launcher, not a second calculation engine. Ask Perform+ is a contextual drawer only when the existing prepared-answer capability is available. It must not be the sole path to any required metric.

Recommended routes are logical targets, not mandatory rewrites of current URLs: `/overview`, `/analytics/risk`, `/analytics/geography`, `/analytics/suspecting`, `/analytics/raf`, `/analytics/financial`, `/analytics/ai-impact`, `/suspects`, `/reports`. Redirect legacy visible analytic routes and preserve shared-link filters. Hidden operational routes must not become anonymous or lose role checks.

### 3.2 Global analysis context

Every relevant screen has a compact context bar containing:

- Organization; line of business/program; model/configuration; payment or benefit year; data/service period; selected retained run; score data basis; score stage.
- Residence county and assigned-practice multi-select filters; optional condition/category, evidence and finding-direction filters where meaningful.
- Dataset as-of date, run date and refresh/stale badge. Do not substitute today's browser date for the synthetic dataset's as-of date.
- Applied-filter chips, reset, save view and export actions. Only relevant filters appear; the method panel exposes the complete context.

Filters apply with **AND across dimensions, OR within a multi-select dimension**. Missing/unknown county and practice are selectable buckets. All values are intersected with authorization on the server. Run and scenario identifiers stay in the URL or saved view; authentication secrets and evidence text do not.

### 3.3 Screen/report contracts

| Screen | Decision, main inputs | Required composition | Connected interactions and export |
|---|---|---|---|
| Overview | Program health from population, model runs, recapture, suspects and quality | Five KPIs: eligible members, scored coverage, captured adjusted score, members with capture candidates, potential overcapture cases; distribution; risk trend; opportunity mix; recapture gap; coverage callout | Cohort-preserving navigation to underlying aggregate report; registry only from a suspect opportunity; executive CSV/JSON/ZIP |
| Risk & conditions | Burden, risk mix and recapture using retained category ledgers | Histogram with percentile markers; top condition prevalence; recapture matrix; category burden; comparable-period direction counts | Select a bar/category to filter aggregate summaries; compare eligible matched cohorts; no member rows |
| Geography & practices | Location/assignment differences after denominator and coverage checks | County/practice ranked table; prevalence or risk heatmap; scatterplot of risk versus capture opportunity; data completeness overlay | County × practice intersection; top-N plus Other; drill to condition distribution; export aggregates |
| Suspecting analytics | Finding concentration and likely review outcomes | Canonical counts; business-category mix; evidence × planning-likelihood matrix; condition Pareto; probability availability; separate corrections summary | Open registry with identical canonical case filters; compare conditional versus reached expected outcomes |
| Suspect Registry | Inspect a suspect's evidence and analytic impact | Paginated suspect rows, compact analytic summary, filters, bounded side panel; no owner/assignment actions | Source excerpt, reasoning/provenance, retained recommendation versions, add to analytic scenario, export selected/all filtered suspects |
| RAF Intelligence | Model context, score stages and hypothetical impact | Coverage matrix, raw/adjusted selector, factor composition, aggregate add/remove/combined scenarios, comparison availability | Choose eligible cohort and candidate set; calculate/save aggregate scenario; inspect exclusions and aggregate factor bridge |
| Financial | Whether assumptions justify a financial planning range | Program/method selector, shared baseline, gross/probability-adjusted/corrections/net bridge, scenario range, cumulative curve, assumptions panel | Adjust reach, recognition realization, sensitivity basis and payment window; save scenario; export exact assumptions/results |
| AI Impact | What frozen evaluation demonstrates and what remains unknown | Detection metrics, human-final decision metrics, timing illustration and provenance/completeness; clear frozen cohort banner | Methodology and raw aggregate confusion-matrix export; no operational worklist or fabricated live trend |
| Reports | Select an audience-ready analysis and preserve context | Concise catalog, latest saved views and preview | Launch report using frozen context or explicit fresh run; CSV/JSON/ZIP; P1 PDF/presentation actions shown only when implemented |

### 3.4 Bounded suspect evidence panel

The panel contains finding ID, permitted member identifier, category, concise clinical question, evidence strength/source availability, dated source excerpts if retained, competing/negative evidence, model relevance, planning-probability method, scenario status and source/recommendation history. Excerpts can expand within the panel. There is no full longitudinal member record, new diagnosis entry, approve/reject coding control or workflow assignment.

An unavailable excerpt reads **“Source document not retained for this demonstration finding”**. A synthetic evidence summary must say it is authored scenario metadata. Do not display generated quotations as if copied from an absent chart.

### 3.5 Common interaction requirements

**UI-01 — P0 / Enhance.** A report cross-link carries all applicable context and explains any dropped incompatible filter. **Acceptance:** county, practice, model, period and score basis survive a population → suspect → scenario journey; a fixed benchmark view explicitly states it does not inherit population filters.

**UI-02 — P0 / Enhance.** Filter changes show a loading state tied to the pending query. **Acceptance:** old data is not relabeled with newly selected filters; responses from superseded queries cannot replace the newest state.

**UI-03 — P0 / Enhance.** Aggregate views contain no member lists or individual demographic profiles. **Acceptance:** drilling every chart lands on aggregates or, when deliberately opening suspect cases, the scoped registry; no hidden Member 360 link remains.

**UI-04 — P0 / Enhance.** A saved view records context and provenance; a saved scenario also records calculation inputs/results. **Acceptance:** reopening a frozen view returns its original snapshot or an explicit missing-snapshot message; “Refresh with latest data” creates a new version rather than altering the old one.

**UI-05 — P0 / Enhance.** Aggregate tables and the registry use 10/25/50/100 rows where pagination is appropriate. **Acceptance:** sort/filter precedes pagination; totals describe the full filtered scope; export-all includes that full scope, not the visible page.

## 4. Shared analytic semantics and metric dictionary

### 4.1 Analysis contract

Every metric result must include `metric_id`, `definition_version`, `value`, `unit`, `numerator`, `denominator` where applicable, `weighting`, `population_scope_id`, `filter_hash`, `period_start/end`, `as_of`, `run_id`, `input_snapshot_id`, `model_config_id/version`, `score_basis`, `score_stage`, `origin`, `calculated_at`, `freshness_status`, `exclusion_counts` and `availability_reason`.

Origin is one of `calculated_from_synthetic_inputs`, `authored_synthetic_assumption`, `retained_synthetic_outcome`, `external_import`, or `measured_real_outcome`. The demonstration must not produce the last label from authored fixtures. “Calculated” can be numerically exact on synthetic inputs without becoming a real-world outcome.

### 4.2 Cohorts, enrollment and weighting

Let `U` be the distinct authorized members with enrollment overlapping the selected population period. Let `E` be the subset satisfying the selected model's declared eligibility and required enrollment/demographic rules. Members with unresolved eligibility remain in U and an eligibility-unknown bucket, not silently in E.

Let `mm_i` be the validated enrolled member-month equivalent for member i in the selected interval. Use the existing program-specific enrollment convention and store `member_month_method_id`; do not replace an official enrollment-duration input with an analytics approximation. If only dated spans exist, the specified **analytics fallback** is eligible days in month / calendar days in month, unioned to prevent duplicate coverage days. Label this fractional convention. It must not feed an official scoring input unless the selected program permits it.

Let `S` be members in E with a successful, applicable, current-for-snapshot score in the selected run/basis/stage. A “stale” retained score may be displayed in a separately labeled last-available mode; it is not included in the default fresh-score summary. A valid zero score remains a scored observation.

- Count/prevalence charts use distinct members unless a case/condition count is explicitly named.
- Portfolio mean scores use member-month weights: `Σ(mm_i × score_i) / Σ(mm_i)` over the disclosed scored subset.
- Unweighted member score distributions use one applicable score per member per selected interval, with an explicit unweighted badge. Do not represent them as weighted portfolio shares.
- If member-month inputs are missing, weighted metrics are unavailable; never silently substitute simple means. Counts and explicitly unweighted distributions can still be shown.
- A score sum across members is not a portfolio RAF. Export a sum of per-member deltas only with that precise label; display mean delta and affected-member count as the headline.

### 4.3 Score basis and stage are independent axes

| Axis/value | Definition | P0 presentation |
|---|---|---|
| Captured basis | Diagnoses/other inputs present in the selected coded snapshot, processed through the declared model eligibility rules; not a claim that all are clinically validated | Default analytics basis with evidence qualification |
| Supported basis | Eligible inputs with retained positive clinical/coding review support under the defined review standard | Optional comparison if complete provenance exists; missing support is not automatic disease absence |
| Submitted / accepted bases | Inputs represented in retained outbound/receiver states, if available | Methodology/provenance or retained comparison only; no submissions workspace |
| Eligible inputs | Records passing model/program input criteria | Coverage/exclusion attribute; not an invented additional score stage |
| Reported score | Externally reported/imported score with producer/method/period | Separate reported series; not silently substituted for locally calculated captured score |
| Potential scenario | Hypothetical full-profile result after declared changes | Scenario result; never overwrite captured/support/accepted values |
| Raw stage | Model output before explicitly applicable downstream adjustments | Available where model produces it |
| Adjusted stage | Raw output after the selected pack's versioned normalization/other applicable adjustments | Default MA headline if supported; show transformation, not a generic universal formula |
| External stage | Producer-defined scale/normalization | Use for imported Medicaid scores; no local adjustment invented |

If repository semantics differ, map old fields to these definitions explicitly and preserve old values. Do not rename incompatible fields into apparent equivalence. Part C RAF, Part D RxHCC score and ACA plan liability risk score must use their proper labels; they are not one interchangeable RAF scale.

### 4.4 Freshness, absence and precision

Specified demo defaults: data refresh becomes stale after **30 calendar days** from the dataset as-of date relative to the report's evaluation date; a score is stale immediately when an input snapshot, model version or eligibility configuration no longer matches. Retained historical-period reports do not become invalid merely because time has passed: label them “Historical snapshot” and show their original cutoff. Source clinical dates are evaluated under clinical/program rules, not this 30-day interface rule.

For planning probabilities, freshness expires after 30 days or immediately on a relevant evidence/status/method/input change. The demonstration clock is the manifest's date so a replay remains reproducible. A presenter can explicitly evaluate freshness against another date without rewriting source dates.

`null` means unknown/unavailable; zero means calculated zero. A zero denominator produces “Not available — no eligible denominator,” not 0%. Never convert unscored members, unmapped conditions, missing outcomes or missing financial inputs to zero.

Calculate with retained full precision. Display scores to 3 decimals, score deltas to 4 decimals, percentages to 1 decimal (evaluation tables may use 2), money to whole USD and abbreviated executive money to at most 2 decimals. Tooltips/exports retain raw values. Sum raw values before rounding. Percentile interpolation uses sorted observations and rank `(n−1)q`, linear interpolation between adjacent scores; store `quantile_method=linear_n_minus_1`.

### 4.5 Metric dictionary

All rows inherit section 4.1 provenance, authorized intersecting filters, snapshot/period context and section 4.4 absence rules unless an exception is stated. `MM(X)` means sum of valid member-month weights in set X. Baselines and comparisons use the same score stage and basis. Metric IDs are stable.

| ID / metric | Formula; numerator / denominator | Unit / weight | Time, provenance and interpretation |
|---|---|---|---|
| M01 Enrolled members | `count_distinct(U)` | Members; unweighted | Selected enrollment interval; enrollment snapshot |
| M02 Model-eligible members | `count_distinct(E)` | Members; unweighted | Model/version eligibility; disclose U−E and unknown eligibility |
| M03 Eligible member months | `MM(E)` | Member months | Selected interval and method; missing weights separately counted |
| M04 Fresh scored members | `count_distinct(S)` | Members | Successful applicable selected run; not all historical runs |
| M05 Member score coverage | `count(S)/count(E)` | % members | Show numerator/denominator and stale/unscored counts |
| M06 Weighted score coverage | `MM(S)/MM(E)` | % member months | Unavailable if denominator weights cannot be validated |
| M07 Captured mean risk score | `Σ mm_i×captured_i / MM(S)` | Score; MM-weighted | Captured inputs, specified raw/adjusted stage; not supported/accepted value |
| M08 Supported mean risk score | Same weighted formula over support-scored subset | Score; MM-weighted | Show support coverage; comparing M07/M08 requires their common scored subset |
| M09 Reported mean score | Weighted imported values within one compatible producer/model/period/scale | Producer score | No mixing local/internal and reported values; missing scale blocks aggregate |
| M10 Median/P10/P90 | Linear quantiles over S scores | Score; unweighted | One selected score/member; missing excluded and counted |
| M11 Distribution share | Members with score in bin / count(S) | % scored members | Default MA bins [0,.5), [.5,1), [1,1.5), [1.5,2), [2,3), [3,+∞); model-specific profiles override |
| M12 Condition prevalence | Distinct eligible members with retained qualifying condition / count(E) | % eligible members | Documented/coded condition basis; suspects excluded; members can appear in several conditions |
| M13 Category burden | Distinct eligible members assigned selected model category / count(E) | % eligible members | Scored/mapping coverage shown; pre/post-hierarchy stage explicit |
| M14 Multicategory burden | Members with 0/1/2/3+ retained disease categories / count(S) | % scored members | Disease categories only; no demographic factor counted as a disease |
| M15 Recapture eligible pairs | Count of distinct member–persistent-condition pairs from prior eligible period, with current eligibility and comparable observation window | Pairs | Program-specific condition mapping; unknown applicability excluded/countable |
| M16 Recapture rate | Current qualifying recaptured pairs / M15 | % pairs | Captured and supported rates are separate variants; no carryforward from history alone |
| M17 Recapture gap | M15 minus recaptured pairs | Pairs; also distinct members separately | “Not yet recaptured” rather than diagnosis absent; incomplete current window labeled |
| M18 Comparable score change | `Σ w_i×(s_i,t1−s_i,t0)/Σw_i` over matched eligible scored members | Score delta; fixed common weights | Default `w_i=min(mm_i,t0,mm_i,t1)` over equal-length windows; zero/missing weights excluded |
| M19 Change direction | Count of matched members with rounded-to-4-decimal delta >0, =0, <0 | Members | Uses same matched set as M18; no joins across incompatible models |
| M20 Fixed-input model difference | Weighted `f_modelB(x_i)−f_modelA(x_i)` | Score delta | Same input snapshot, common valid scope and adjustment conventions; unavailable without executable model A/B |
| M21 Open canonical suspects | Distinct unresolved canonical case IDs after deduplication | Cases | Latest status as-of; raw source findings reported separately |
| M22 Members with capture candidates | Distinct eligible members with at least one open capture-directed case | Members | Excludes correction-only cases, false positives and unresolved identity errors |
| M23 Potential overcapture cases | Distinct open correction-directed canonical cases | Cases | Separate confirmed/unconfirmed correction counts; no automatic financial reduction |
| M24 Evidence availability | Cases with retained permitted source excerpts / eligible canonical cases | % cases | Metadata-only and source-missing displayed separately |
| M25 Probability coverage | Cases with valid in-scope planning/prediction value / probability-applicable open cases | % cases | Method/horizon fixed; not-applicable separated from unknown |
| M26 Conditional supported closures | `Σ p_i` over probability-eligible selected canonical cases | Expected cases | Conditional on review reached within 30 days; support by day 90; no reach multiplier yet |
| M27 Reached supported closures | `Σ r_i×p_i` | Expected cases | Same target/horizon; separate per-case versus one-per-member financial selection counts |
| M28 Observed timely support rate | Mature reached cases supported by day 90 / all reached cases with complete 90-day outcome observation | % cases | Cohort anchored at prediction date; unresolved at day 90 is not achieved, not proof of no disease; censored excluded/reported |
| M29 Hypothetical mean score delta | MM-weighted full-profile scenario score minus baseline score, same cohort/weights | Score delta | Calculation run and changed-input set required; no sum of category coefficients |
| M30 Assumed exposure | Authored per-case/per-member score-equivalent increment | Score-equivalent assumption | Planning only; never displayed as M29; units/stage/method must be declared |
| M31 Gross positive planning value | `Σ e_i×B_i×h_i` over frozen financial selection | USD estimate | Section 9 variables; all eligible selected positives, no reach/support/realization discount |
| M32 Support-weighted opportunity | `Σ r_i×p_i×e_i×B_i×h_i` | USD estimate | Conditional target consistent; closure probability applied once |
| M33 Realization-adjusted positive value | `Σ r_i×p_i×z_i×e_i×B_i×h_i` | USD estimate | z is downstream recognition conditional on support; distinct from clinical support |
| M34 Signed correction value | `Σ c_i×B_i×h_i,c` for validated/declared correction scenarios | Signed USD estimate | Usually negative; separate assumed/validated status; never applies positive-capture p or reach |
| M35 Modeled net value | M33 + M34 | Signed USD estimate | Requires compatible basis/window, overlap treatment and disclosed completeness; excludes unknown-valued corrections |
| M36 Cumulative projected value | Sum of eligible monthly M33/M34 contributions through selected month | USD estimate | Curves and total use identical effective-month assumptions |
| M37 Reconciled payment change | Retained reconciled payment difference under validated reconciliation method | USD actual | Unavailable in demo; never substitute M35 or simulated acceptance |
| M38 Concentration share | Selected top-k conditions' attributed value / total attributed value, one attribution per selected candidate | % value | Use same frozen financial selection; shared findings attributed once; aggregate clinical prevalence remains overlapping |
| M39 AI precision | TP / (TP+FP) | % flagged reference slots | Frozen evaluation cohort and independent labels; null if no positives |
| M40 AI recall | TP / (TP+FN) | % reference positives | Same frozen target and slots |
| M41 Final-review precision/recall | TP_final/(TP_final+FP_final); TP_final/(TP_final+FN_final) | % | Assisted and manual arms separately; not AI-stage metrics |
| M42 Illustrative review-time reduction | `(manual_minutes−assisted_minutes)/manual_minutes` | % reduction | Frozen authored comparison; no live productivity claim |
| M43 Data freshness/completeness | Counts stale, missing, invalid, excluded by mutually exclusive primary reason plus multi-reason detail | Records/members | Primary buckets reconcile; detailed reasons can overlap and are labeled |
| M44 County/practice rate | Relevant member or case count divided by the explicitly named group denominator | Per 100/1,000 or % | Distinct member rates and case rates never share a label; residence/assignment cutoff disclosed |
| M45 Scenario coverage | Eligible members/cases with complete compatible impact inputs / eligible scenario population | % | Computed and assumption-only coverage separate; no expansion to missing values |

### 4.6 Reconciliation invariants

1. M02 = fresh scored + stale-only + unscored/failed among eligible members using mutually exclusive primary states. Ineligible and eligibility-unknown belong outside this sum.
2. A histogram's member counts sum to M04 and its proportions to 100% before rounding. Unknowns are a separate annotation, never in the zero-score bin.
3. M19 direction counts sum to the matched comparison denominator; not to the full population if matching excluded members.
4. Recapture gap + recaptured pairs = recapture-eligible pairs. “Not yet due/observation incomplete” is separately disclosed under the chosen comparison cutoff.
5. Raw findings ≥ canonical cases; duplicate reduction is not called clinical closure.
6. Case counts and member counts are separate. A case with multiple evidence sources is one case.
7. County/practice breakdowns include Unknown/Unassigned and use fixed attribution so they reconcile to their parent scope. Clinical condition prevalence need not sum to 100%.
8. Financial charts reconcile only under the same frozen selection, score/exposure basis, probabilities, window and assumptions. Computed and illustrative totals must not be combined without a separately named mixed-method report; mixed-method financial totals are disabled in P0.

## 5. Executive and population requirements

**User decisions:** assess portfolio risk representation, identify concentrated opportunity, distinguish capture gaps from incomplete data, and select a meaningful cohort for further analysis.

**Inputs/calculations:** M01–M19, M21–M25 and M43; enrollment, selected scoring run, category ledger, prior comparable period, canonical suspects. Default charts use one selected program/configuration, not a blended cross-program score. Overview can show program-specific side-by-side tiles if each tile has its own denominator.

| Requirement | Priority / change | Functional behavior and testable acceptance |
|---|---|---|
| POP-01 Headline metrics | P0 / Enhance | Use the five KPIs in section 3.3 with denominator and period details. Given 100 eligible members, 80 fresh scores, 10 stale-only and 10 unscored, display 80% fresh coverage; the mean uses only the 80 fresh observations, including valid zeros. |
| POP-02 Distribution | P0 / Enhance | Show count/share histogram and P10/median/P90 for the selected score stage. Given a missing score and a true zero, only the true zero enters the first bin. Bins are stable across same-model comparisons; an overflow bin retains outliers. |
| POP-03 Trend | P0 / Enhance | Plot at least three retained comparable synthetic snapshots when available, with explicit basis/cutoff and coverage for every point. If only one exists, show one observation and a “trend history unavailable” state; do not interpolate invented history. |
| POP-04 Condition burden | P0 / Enhance | Rank documented conditions/categories and separate recapture from newly assessed hypotheses. Selecting a condition filters aggregate cohort analysis. A suspect without supported/captured coding does not increase documented prevalence. |
| POP-05 Recapture | P0 / Enhance | Use member–persistent-condition pairs and model/program-specific relevance. Acute historical diagnoses are not automatically annual recapture targets. Given two eligible prior conditions and one current qualified recapture, display 1/2 pairs and one gap; do not infer disease absence from the gap. |
| POP-06 Comparable periods | P0 / Enhance | Offer “Matched cohort change” and “Observed portfolio change” as distinct modes. Default matched mode uses equal-length service windows, equal runout offsets and common weights. Newly enrolled/exited and unmatched members are counted outside the matched result. |
| POP-07 Change explanation | P0 / New | Show matched score direction counts and an aggregate factor/category bridge where calculable. A residual or interaction bucket preserves reconciliation; never force a category-only attribution to sum when interactions explain the difference. |
| POP-08 Opportunity summary | P0 / Enhance | Show capture candidates, correction candidates and data-representation issues separately, with source/probability/impact coverage. A correction is visible even when it has negative or unknown dollar impact. |
| POP-09 Coverage states | P0 / Enhance | Zero eligible, partial scoring, stale run, unsupported configuration, reference-only population and failed run each have distinct states. Each preserves the user's filters and has an applicable next step such as choosing a supported run or exporting exclusions. |
| POP-10 Read-only completeness inspection | P0 / Enhance | Provide aggregate exclusions by reason and program. A model/source problem links to methodology or exclusions; it does not reopen intake/operational management. |
| POP-11 Drilldown/export | P0 / Enhance | Each metric's aggregate drilldown/export uses the same definition and scope. Given a filtered 80-member fresh-scored cohort, CSV and JSON reproduce its weighted mean, histogram and excluded counts independently of pagination. |
| POP-12 Formal standardized comparisons | P1 / New | Add age/eligibility standardized county/provider comparisons only after reference weights and adequate strata are specified. Until then show stratified descriptive results, not adjusted provider performance or causal explanations. |

**Period comparability contract:** match program, comparable eligibility segment, score basis/stage, model/version, mapping rules, exposure convention, duration and runout. If changing model version, use fixed-input model comparison instead of labeling the result actual health-status change. A deliberately noncomparable side-by-side view may display separate values with a warning and no percentage-change arrow.

## 6. RAF and model intelligence

### 6.1 Configuration visibility and coverage

The following are **reported executable inventory entries**, not claims of independent validation. Configuration IDs below are document aliases; map them to actual repository IDs without changing persisted identities.

| Alias | Display context | Required coverage label / scope boundary |
|---|---|---|
| CFG-01 | MA V28 — PY2026 | Reported full default MA run; confirm selected segment/input eligibility and adjustments |
| CFG-02 | MA V28 — PY2027 Initial | Executable within declared scope; Initial is a run/software context, not a new HCC model family |
| CFG-03 | MA V28 — PY2027 later-run forecast | Forecast configuration; distinguish forecast assumptions from released run software/normalization |
| CFG-04 | RxHCC — PY2027 MA-PD Initial | Part D risk context; no Part C conversion |
| CFG-05 | RxHCC — PY2027 MA-PD forecast | Forecast pack/provenance disclosed |
| CFG-06 | RxHCC — PY2027 PDP Initial | Separate applicable model/normalization context |
| CFG-07 | RxHCC — PY2027 PDP forecast | Forecast pack/provenance disclosed |
| CFG-08 | ACA HHS-HCC V08 — BY2026 | Adult/child/infant, metal and other supported configuration scope explicitly listed |
| EXT-MCD | Medicaid externally produced scores | Import-only; producer/model/version/period/normalization/contract metadata required; not one of the eight native executable configurations |

Do not count an unsupported subsegment as executable because its family is present. PACE, ESRD or other special segments are excluded from generic MA scenarios unless the actual executable configuration supports them. Reference-profile coverage for a configuration does not establish a scored 10,000-member population.

Official context supports this version discipline: CMS retained the 2024 Part C model for non-PACE CY2027, while updating Part D and distinguishing MA-PD/PDP populations. Source-eligibility policy also changes by payment year. These are reasons to version the full configuration, not just the HCC label. [CMS CY2027 final rate announcement](https://www.cms.gov/newsroom/fact-sheets/2027-medicare-advantage-part-d-rate-announcement)

ACA BY2026 uses its own V08 classification, age-group/metal configurations, factors and published updates. Its current software documentation also distinguishes local score simulation from final transfers. Record the exact asset release/fingerprint, including applicable ACF/RXC support, rather than treating “V08” as a complete implementation specification. [CMS BY2026 DIY instructions](https://www.cms.gov/files/document/cy2026-diy-instructions-07-31-26.pdf)

### 6.2 Aggregate scenario contract

Scenario inputs are a saved eligible cohort, baseline run/snapshot, scenario mode (`add`, `remove`, `combined`), permitted canonical finding set, model configuration and explicit assumed/validated changes. Member profiles remain server-side implementation inputs.

For member i, let `x_i` be the complete baseline profile and `T_i` be the declared scenario transformation. Calculate `d_i=f(T_i(x_i))−f(x_i)` using the same full model/configuration. Compute the cohort mean delta with unchanged denominators/weights. A condition with a coefficient may have zero incremental impact because of hierarchy, an existing factor or interactions. Do not assign it the coefficient as a guaranteed delta.

The results show baseline mean, scenario mean, mean delta, affected-member count, increased/unchanged/decreased counts, calculation coverage, exclusions, aggregate factor changes and hypothetical status. The factor bridge uses the full model outputs, including hierarchy/interaction and an explained residual where applicable. No result is written back as an actual captured diagnosis or payment.

**Selection distinction:** an **all-selected joint scenario** assumes every selected change is realized and runs the whole profile once. A **probability-adjusted planning scenario** uses section 9's single-positive-candidate selection or a separately validated joint-probability method. These are separate saved method types, not alternate labels for the same number.

### 6.3 Requirements

| Requirement | Priority / change | Functional behavior and testable acceptance |
|---|---|---|
| RAF-01 Context registry | P0 / Enhance | Every score/report carries program, family, release, year, run type, segment and score stage. Selecting an unsupported segment produces an explicit unavailable state and never falls back to another model. |
| RAF-02 Model coverage matrix | P0 / Enhance | Distinguish configuration executable, reference profile validated, selected population eligible, selected population scored, stale and failed. CFG-02 reference results cannot masquerade as CFG-01 population coverage. |
| RAF-03 Raw/adjusted transparency | P0 / Enhance | Show both stages when valid and the exact adjustment version/order. Switching stage recalculates every dependent aggregate/scenario consistently; do not reapply normalization to an already-adjusted score. |
| RAF-04 Complete-profile scenarios | P0 / Existing + Enhance | Retain add/remove/combined execution and expose aggregate controls. A duplicate add changes nothing; removing a suppressed category may change nothing; replacing a higher category is recalculated with remaining inputs. |
| RAF-05 Combined corrections | P0 / Enhance | Evaluate validated removals and positive additions together for exact joint scenarios. Acceptance: combined delta equals final full-profile score minus original; it need not equal a sum of isolated deltas. |
| RAF-06 Comparable model change | P0 / Enhance | Fixed-input comparison holds input facts constant and discloses changed model/adjustment context. V24 remains unavailable when absent; no seeded fake V24 result or inferred conversion factor is allowed. |
| RAF-07 Historical period change | P0 / Enhance | Use actual retained period inputs and common-cohort rules. Do not attribute a normalization-only change to increased disease burden. |
| RAF-08 Import boundaries | P0 / Existing | Imported Medicaid scores retain producer-defined semantics and exceptions. A local add/remove scenario is unavailable without a supported native engine or a separately supplied scenario result from the producer. |
| RAF-09 Scenario immutability | P0 / Enhance | Save input IDs, rule/probability/selection versions, factors, exclusions, stages and output values. Reopening a result does not recalculate it invisibly against a new pack. |
| RAF-10 Unknown impact | P0 / Enhance | Missing mapping, insufficient inputs and unsupported model produce `impact=null` with reason. A valid calculation returning zero produces zero with explanation. Registry sorting distinguishes the two. |
| RAF-11 Aggregate factor view | P0 / New | Factor/category bars expose prevalence, retained/suppressed counts and aggregate contribution basis. Do not label demographic components as suspected clinical conditions. |
| RAF-12 Broader engines | P2 / Deferred | Additional historical, special-segment and native Medicaid execution require separately licensed/approved assets, reference cases and reconciliation. They are not prerequisites for this demonstration. |

## 7. Suspect intelligence and evidence

### 7.1 Taxonomy and current-type mapping

Keep existing `finding_type` for compatibility and add a versioned normalized `business_category`, `direction` and `clinical_domain`. The business category answers **why this is an RA integrity opportunity**; the clinical domain identifies the disease/status area. Evidence level, probability band and workflow status are separate dimensions.

| Category | Business question | Existing-type mapping guidance | Direction and impact treatment |
|---|---|---|---|
| CG — Documented coding gap | Does retained eligible documentation contain a condition missing from the coded input? | Documentation gap | Potential addition; full-profile scenario after evidence eligibility checks |
| RC — Recapture opportunity | Does a previously established relevant condition require current-period reassessment/documentation? | Historical condition | Assessment/recapture lead; no automatic annual carryforward |
| NC — New condition assessment | Do combined data signals justify clinical assessment of a not-yet-established condition? | Predictive signal | Hypothesis only; assumed scenario separate from diagnosed state |
| SP — Specificity/relationship discrepancy | Is type, stage, acuity, relationship or complication represented accurately? | Specificity/clinical question; accuracy correction where applicable | Addition, reduction or zero impact; replacement may be required |
| ST — Persistent status discrepancy | Is amputation, transplant, dependence or another status represented correctly for the period? | Documentation/history/specificity subtype | Addition or correction; source requirements still apply |
| OC — Potential overcapture | Is an existing/proposed coded representation unsupported, overstated or ineligible? | Accuracy correction | Separate integrity finding; no positive “closure value” by default |
| DR — Data/model representation issue | Was valid information lost, mislinked, rejected or scored under the wrong configuration? | Source-readiness/data issue | Technical completeness/integrity; not automatically a clinical hypothesis |

Do not force every legacy type into one category by label alone. A missing source can affect CG or OC; use the underlying question and keep `mapping_status=unresolved` if required evidence is absent. The previous 65-rule catalog remains a rule-content source; its operational action-owner instructions do not reinstate execution screens here.

### 7.2 Canonical identity and overlap

Create a stable canonical case for a **member + clinical concept + relevant service/benefit period + episode/status context + proposed representation change**. Retain aliases to all original finding IDs, rule IDs and source systems. Diagnosis-code strings alone are insufficient identity: codes may change specificity, while several different conditions may share one HCC.

- Several rules flagging the same diabetes-with-neuropathy question merge into one case with multiple signals.
- Distinct conditions that map to the same HCC remain distinct clinical cases; their score effects may overlap.
- Different periods remain linked but distinct cases; do not silently carry closure across years.
- Conflicting add/remove proposals are linked and held for interpretation, not netted to zero.
- One case can have model-impact records for Part C and Part D; the clinical case count remains one within its scope. Financial values across programs are not automatically summed.
- Duplicated claims/source copies are not independent corroboration. Keep original-source lineage.

### 7.3 Data signals and clinical interpretation

Supported signal families include enrollment/demographics, claims diagnoses/procedures, pharmacy dispensing/administered drugs, labs, vitals, clinical notes, C-CDA/FHIR/HIE, imaging/pathology, problem lists, surgery/device/status, utilization/ADT, prior authorizations, care-management assessments, home/LTSS records, behavioral records, maternal/infant episodes, member-reported information, family history, SDOH and external risk outputs. The catalog is extensible; no arbitrary limit to pharmacy or labs.

Every signal carries subject, source, authored/effective date, certainty/negation, current/historical/resolved status, source eligibility, evidence span or structured field reference, and known limitations. GenAI can explain assertion, chronology, alternate medication indications, contradictions and relationships. Official code mappings, eligibility gates, arithmetic and model execution remain governed deterministic functions.

Examples to include in the six source-backed stories or an explicitly authored scenario extension:

| Example | Appropriate analytic finding | Required countercheck |
|---|---|---|
| Amputation history plus independent diabetes-related evidence | ST status gap and, only with separate supporting signals, NC diabetes assessment | Amputation alone does not establish diabetes; keep clinical cases and financial overlap distinct |
| Gabapentin/pregabalin/duloxetine plus symptoms/exam | NC neuropathy question, or SP relationship review if both diagnoses already established | Medication may have other indications; never infer diabetic neuropathy from dispensing alone |
| Historical heart failure and no current-period evidence | RC assessment/recapture lead | Current documentation/source lag; no automatic carryforward |
| Relevant note negates active cancer but coding remains active | OC disease-status discrepancy | A later resolved statement does not invalidate an earlier eligible active encounter |
| Valid supported diagnosis omitted in an extract | DR representation gap | Do not request new clinical documentation when processing is the cause |
| Documented condition maps beneath an already retained hierarchy category | Genuine clinical finding with zero calculated marginal score impact | Zero score effect does not make the diagnosis false |

### 7.4 Registry and prioritization requirements

| Requirement | Priority / change | Functional behavior and testable acceptance |
|---|---|---|
| SUS-01 Taxonomy | P0 / Enhance | Display business category, clinical domain, legacy type, direction and rule/version separately. Unmapped legacy cases are visible as unmapped and excluded from category-dependent financial assumptions. |
| SUS-02 Canonical counts | P0 / New | Deduplicate source findings into canonical cases with retained aliases. Given three source findings for one clinical question, show one case, three signals and no duplicate closure/value. |
| SUS-03 Registry columns | P0 / Enhance | Default columns: finding, permitted member ID, condition/question, category/direction, evidence/source availability, current status, support-likelihood band, impact basis/value and last updated. Expand details instead of adding dozens of columns. Owner/assignment columns are absent. |
| SUS-04 Read-only outcomes | P0 / Enhance | Display retained status/outcome histories without creating workflow execution. Resolved/superseded/unsupported cases can be viewed via filter but do not enter open opportunity or future-closure estimates. |
| SUS-05 Evidence panel | P0 / Enhance | Show dated excerpts and clinical reasoning only from retained authorized sources or clearly labeled authored summaries. A source link opens the bounded panel; missing evidence never produces a fabricated citation. |
| SUS-06 Distinct priority views | P0 / Enhance | Provide Capture potential, Accuracy/corrections and Data representation views. No single revenue sort hides correction cases. Positive-value ranking never changes clinical truth or evidence wording. |
| SUS-07 Transparent capture ranking | P0 / New | Default order: evidence/planning-likelihood band descending, compatible expected impact descending, oldest analysis date, canonical ID. Within each basis, expected impact is p×increment; unknowns follow known values and remain filterable. Do not compare assumed exposure with computed deltas in one impact-ranked list without selecting a single impact basis. |
| SUS-08 Integrity ranking | P0 / Enhance | Rank confirmed correction-pending representation ahead of unconfirmed signals, then documented severity of integrity issue and age. Unknown dollar value does not demote a confirmed issue out of visibility. No correction due date or legal deadline is invented. |
| SUS-09 Scenario selection | P0 / Enhance | “Model impact” creates a hypothetical scenario from authorized, model-compatible canonical cases and explains exclusions. It does not accept a diagnosis or send a submission. |
| SUS-10 Broad population with source limits | P0 / Enhance | Registry defaults to the broad seeded finding population. The six complete stories are selectable by source-availability filter, not the default total. Metadata-only cases remain analytically useful with honest evidence labels. |
| SUS-11 Status crosswalk | P0 / Enhance | Preserve raw statuses, map to open/resolved/superseded/unknown analytic disposition with versioned rules. An unrecognized raw status is unknown and excluded from probability estimates, not assumed open. |
| SUS-12 Export | P0 / Enhance | Export selected/all-filtered canonical cases with IDs, aliases, category, signal provenance, source-availability flag, probabilities/methods and scenario basis. Include clinical excerpts only with explicit export permission and selection. |
| SUS-13 Rule explanations | P1 / Enhance | Add browsable rule-definition panels with activation criteria, exclusions and examples, retaining the seven-category structure and clinical scope of the prior catalog. This is read-only content, not a rule/agent administration workspace. |

## 8. Closure-probability specification

### 8.1 Precisely named target

The primary planning target is **“Supported finding within 90 days, if review is reached within 30 days.”** The compact label is **“90-day support likelihood”**. A visible badge says **“Illustrative planning assumption”** for the current authored method. Do not label this “AI confidence” or an empirically calibrated closure probability.

Let t0 be the analysis snapshot date. Let R30 mean a relevant evidence/clinical review starts by t0+30 days. Let S90 mean that, by t0+90 days, an authorized reviewer records that the proposed capture/representation finding is supported by eligible evidence under the stated review standard. The probability is:

`p_i = P(S90_i | R30_i, information available at t0)`

Clinical support is distinct from: retrieving a chart; completing a task; saving a note; accepting a code into an outbound file; receiver acceptance; payment recognition; or closing a false-positive finding. Those may be separate outcome events. A valid “not supported” decision closes work operationally but is **not** S90 success.

The 90-day support horizon and financial payment window are different controls. Changing payment months does not silently change p. An alternative support horizon requires a separate authored or validated method/version. P0 exposes only the 90-day target, with the 30-day reach condition in methodology and exports.

### 8.2 Eligibility and null behavior

Planning p applies only to an open, canonical, capture-directed CG/RC/NC/SP/ST case with known mapped category, an authored/retained usable evidence assumption, no unresolved identity conflict and no hard clinical/source exclusion. It is not calculated for OC corrections or DR completion; these need different targets if added later.

| Situation | Probability behavior | Count/ranking treatment |
|---|---|---|
| Open eligible capture case | Calculate using selected method | Include in probability coverage and conditional expected supports |
| No retained source but adequate explicitly authored signal metadata | Allow synthetic planning estimate; label metadata-only and evidence grade as an assumption | Never imply a complete chart or clinical support |
| Evidence grade unknown or no usable signal metadata | `null`, reason `insufficient_planning_inputs` | Unknown band; do not invent a neutral 50% |
| Unsupported causal inference, resolved negative finding, contradicted/non-applicable proposed condition | No positive planning estimate until case meaning is corrected | Exclude from expected capture; preserve explanatory record |
| Correction or technical data issue | `null`, reason `different_outcome_target` | Separate integrity/data report, not low probability |
| Already supported/resolved/superseded | `null`, reason `not_open` | Retained observed outcome; do not assign 100% future success |
| Duplicate case | Compute once on canonical case | Alias rows cannot multiply expected closures |
| Ineligible model source/period or unresolved identity | `null`, specific reason | Visibility retained; excluded from positive financial set |
| Stale relevant evidence/method inputs | `null` in current estimate, preserve prior estimate as historical | Needs refresh; no silent reuse |

### 8.3 Exact P0 authored method

**Method ID:** `SYN_SUPPORT90_V1`. **Origin:** authored synthetic assumption. This is a concrete proposed default for the next release, not a claim about the current `suspect-planning.ts` constants. Inspect and migrate the existing method with an explicit version change if its arithmetic differs.

| Input | Base value or adjustment |
|---|---|
| Strong evidence assumption | 0.80 |
| Moderate evidence assumption | 0.50 |
| Limited evidence assumption | 0.20 |
| RC historical/recapture case | Subtract 0.10 |
| NC new-condition/predictive case | Subtract 0.15 |
| CG/SP/ST | No type adjustment |
| Valid result bounds | Clamp to [0.05, 0.90] |

`p_base = clamp(evidence_anchor + category_adjustment, 0.05, 0.90)`

Use the normalized primary business category once; historical and predictive adjustments do not stack. No numerical “source count boost,” medication-specific diagnosis confidence or GenAI self-reported probability is added. Hard exclusions in section 8.2 run before this arithmetic.

Specified sensitivity spread: `p_low=max(0, p_base−0.10)`; `p_high=min(1, p_base+0.10)`. This is an **authored planning range**, not a confidence interval, prediction interval or calibrated probability bound. Store all anchors, caps, modifiers and method version in the export.

Bands: Low `[0,0.40)`, Medium `[0.40,0.70)`, High `[0.70,1]`, Unknown and Not applicable. Show whole percentages only in detail; emphasize bands in the registry to avoid false precision. Examples: Strong CG=80%; Strong RC=70%; Strong NC=65%; Limited NC=5%; absent evidence grade=null.

### 8.4 Probability and evidence are different

Evidence grade describes the supplied evidence assumption/quality. Support likelihood refers to the defined future review outcome under the method. Neither establishes disease truth. A high likelihood is not permission to add a diagnosis, and a low likelihood is not a reason to suppress a required correction or refuse an assessment.

Each explanation exposes the evidence anchor, one category adjustment, target/horizon, as-of date, hard exclusions, source availability and synthetic/calibrated status. GenAI may verbalize that stored explanation; it must not invent a different number or private clinical confidence score.

### 8.5 Empirical rates and future validated predictions

Keep three separate display modes:

1. **Illustrative planning:** SYN_SUPPORT90_V1 over synthetic cases.
2. **Observed support rate:** retained outcome events for a disclosed mature cohort; synthetic fixtures remain labeled synthetic observed fixtures.
3. **Validated prediction:** future model/rule estimate with independent temporal validation and calibration evidence. Not available in this release.

For observed rates, anchor each case at its original prediction t0 and use only information available then. Include reached cases with observable follow-up through day 90. Success is S90; known pending or unsupported at day 90 is “target not achieved.” Cases not reached by day30 do not enter the conditional support denominator; they do enter reach-rate analysis. Loss of follow-up/censoring is reported separately and never silently treated as a negative diagnosis.

Before a production method can be labeled validated: define/adjudicate outcome labels; deduplicate member episodes; prevent member/date leakage; validate on later time periods; assess selection bias from which cases were reviewed; compare to a simple evidence/category baseline; report calibration by band/program/category/source availability and relevant population groups; report discrimination and decision utility separately; retain uncertainty intervals and minimum samples; monitor drift and outcome lag. GenAI use does not remove any of these requirements.

Specified provisional reporting minimum: at least 30 fully observable cases per rate cell for display, and 200 fully observable cases with at least 30 successes and 30 non-successes for a calibration subgroup. These are product gates, not proof that a method is sufficiently validated. Clinical/analytics owners must define performance thresholds, statistical power and release approval before a production label is enabled. Synthetic examples cannot satisfy the production gate.

### 8.6 Requirements and acceptance

| Requirement | Priority / change | Acceptance |
|---|---|---|
| PROB-01 Target contract | P0 / New | Every probability has target, conditional event, horizon and origin; no bare “closure %” appears in report/export without these semantics. |
| PROB-02 Shared method | P0 / Enhance | Registry, aggregate charts, Ask Perform+ and financials use the same stored SYN_SUPPORT90_V1 result for an identical case snapshot; they do not independently reimplement constants. |
| PROB-03 Eligibility | P0 / Enhance | All rows in section 8.2 are represented in fixtures. Missing inputs produce null, closed cases do not receive 1.0, and corrections do not enter positive support totals. |
| PROB-04 Exact arithmetic | P0 / Enhance | Strong CG=.80, Strong RC=.70, Strong NC=.65, Limited NC=.05; boundary .70 is High and .40 is Medium. Apply one category modifier only. |
| PROB-05 Expected counts | P0 / Enhance | M26 sums p over canonical eligible cases; M27 applies reach once. A duplicate alias does not change either; expected values can be fractional and are labeled expected. |
| PROB-06 Freshness/history | P0 / New | An evidence/status/method change invalidates the current probability; the previous result remains reproducible from its snapshot. |
| PROB-07 Empirical separation | P0 / Enhance | A report never uses authored p as a historical closure rate or a synthetic outcome as real validation. Unknown outcomes and not-yet-mature cohorts remain separate. |
| PROB-08 Sensitivity range | P0 / New | Range labels say planning assumptions; no 95% claim appears. Changing a scenario to low/base/high uses the stored appropriate p value without changing the observed outcome. |
| PROB-09 Observed cohort analysis | P1 / New | Display reach rate, conditional support rate, observation completeness and censoring counts from imported/retained outcome events, without operational workflow screens. |
| PROB-10 Production calibration | P2 / New | Validated-prediction mode cannot be enabled without documented target, validation data, leakage checks, subgroup calibration, thresholds, version and owner approval. |

## 9. Financial-projection specification

### 9.1 Purpose and displayed amounts

The financial screen answers: **What financial planning opportunity follows from the selected cohort, supported assumptions, model context and uncertainty?** It does not answer how much a payer has earned or will certainly receive.

Display these distinct stages, with completeness and method labels:

1. **Gross positive potential:** selected positive exposure assuming review, support and downstream realization all occur.
2. **Support-weighted opportunity:** reach and the defined support likelihood applied once.
3. **Realization-adjusted positive value:** conditional downstream recognition applied after support.
4. **Signed corrections:** separate downward/upward correction scenario effect; known/unknown and validated/unconfirmed counts disclosed.
5. **Modeled net value:** compatible positive value plus compatible signed corrections.
6. **Actual reconciled payments:** unavailable in the current demonstration.

Show “Calculated scenario” and “Illustrative exposure” as separate selectable methods. An exact model calculation on synthetic inputs is still a hypothetical financial estimate. No dashboard says “revenue generated,” “fines avoided,” “guaranteed uplift” or “AI-attributed savings” on this basis.

### 9.2 Canonical selection and overlap

**P0 planning method:** select at most **one positive candidate per member per program/configuration/payment window** after canonical deduplication and eligibility checks. This preserves the current approximate approach while making its limits explicit.

For each member, select the candidate with the largest `p_base × positive_increment` in the selected impact basis; break ties by stronger evidence, then canonical ID. Do not pick a negative or unknown increment. Freeze the selection before conservative/base/optimistic changes, condition drilldowns and exports. Save included and excluded case IDs and reasons. Financial scope is rooted in the authorized cohort at scenario creation; analytic condition filters partition that frozen selection rather than selecting a different winner. Changing root cohort/model/method requires an explicitly new scenario version.

This is a **single-candidate approximation**. It may omit valid additional opportunities; it is not an exact joint model, an assured conservative lower bound or proven value attribution. The report states the number of excluded overlapping/additional candidates and members affected.

When several changes are intentionally modeled together, use the exact all-selected full-profile scenario in RAF Intelligence. Probability-weighting that joint result requires joint outcome states or a validated dependence method. Do not multiply each isolated condition coefficient by its probability and sum it as an exact joint RAF change.

**Corrections:** when a member has both a validated correction and a positive selected candidate, calculate correction first:

`c_i = f(x_i with validated corrections) − f(x_i)`

`e_i = f(x_i with validated corrections and selected addition) − f(x_i with validated corrections)`

Thus the unweighted all-realized total is `c_i + e_i = final score − baseline score`. This is a declared attribution order, not a claim that isolated condition contributions are unique. If the correction is uncertain, contradicts the positive case, or its modeled timing cannot be reconciled, exclude that member from the combined net estimate and display the unresolved scenario separately. An illustrative method without a full scorer must disclose that joint interactions remain unquantified; it cannot label its net value exact.

### 9.3 MA planning variables and formula

| Variable | Meaning | Validation / default |
|---|---|---|
| `e_i` | Positive per-member increment on the declared adjusted score basis, or explicitly authored score-equivalent exposure | Must be >0 and compatible with chosen method. Never replace an unavailable calculated delta with an assumption inside the same series. |
| `c_i` | Signed correction delta on the same basis | Validated scenario or separately labeled authored correction assumption; exclude unconfirmed corrections from confirmed totals |
| `r_i` | Probability/assumed fraction that review is reached within 30 days | [0,1]; default Base .75 |
| `p_i` | Probability of support by day90 conditional on reach by day30 | Section 8; cannot already include r or downstream recognition |
| `z_i` | Conditional realization that supported eligible input is recognized for the modeled payment window | [0,1]; default Base .90; not a second clinical confirmation probability |
| `B_i,m` | USD per eligible payment month per unit adjusted score, used as an illustrative payment sensitivity basis | Positive finite input with source/version. Demo example $1,000, explicitly authored; not a retrieved official county benchmark or complete MA payment formula. |
| `u_i,m` | Eligible payment-month exposure fraction | [0,1], from known coverage or a disclosed continuation assumption; unknowns cannot silently become full years |
| `a_i,m` | Recognition timing factor conditional on successful realization | [0,1], nondecreasing; zero before assumed effective month, one after in the simple demo schedule |
| `h_i` | Effective payment-month exposure | `Σ_m u_i,m×a_i,m`; cannot exceed selected horizon |
| `h_i,c` | Correction-effective exposure | Separate disclosed schedule; never controlled by positive opportunity reach/support likelihood |

For constant B within the window:

```text
GrossPositive         = Σ e_i × B_i × h_i
SupportWeighted       = Σ r_i × p_i × e_i × B_i × h_i
RealizedPositive      = Σ r_i × p_i × z_i × e_i × B_i × h_i
SignedCorrections     = Σ c_i × B_i × h_i,c
ModeledNet            = RealizedPositive + SignedCorrections
```

For varying monthly sensitivity/exposure, sum `e_i×B_i,m×u_i,m×a_i,m` by month before applying r, p and z. All curves use those same monthly terms. Do not apply a separate annual factor after summing months. `r` and `z` each appear once; p is conditional and appears once.

Corrections require their own recognition/timing assumptions where payment impact is estimated. The requirement to correct an unsupported representation does not depend on whether an amount can be calculated or recovered. Unvalued corrections remain counted and make the net result **partial**, with the excluded number and reason. No actual correction submission or payment adjustment occurs from this screen.

The UI may retain the existing control caption “Monthly benchmark” for continuity only if the adjacent label says **“Illustrative payment sensitivity basis”** and the method panel explains the simplification. Actual MA payments depend on more than this multiplication. The production method must use a separately approved payment model, not promote this approximation by removing its label.

### 9.4 Assumptions and scenario controls

Specified initial scenario templates:

| Assumption | Conservative | Base | Optimistic |
|---|---:|---:|---:|
| Reach within 30 days r | .50 | .75 | .90 |
| Support likelihood | `p_low` | `p_base` | `p_high` |
| Recognition realization z | .70 | .90 | 1.00 |
| Payment sensitivity B | Shared authored $1,000 or user-entered common basis | Same | Same |
| Payment exposure window | Same selected eligible months | Same | Same |
| Confirmed correction set | Same validated set and schedule | Same | Same |

These are recommended demonstration assumptions, not measured health-plan performance. Financial inputs default to a **12-month future payment window** explicitly selected by year/start month. In the standard PY2027 story, use January–December 2027 only when the retained analysis date and stated support/recognition timing make that window consistent. If no eligible future exposure is known, require the user to choose a clearly labeled continuation assumption or leave value unavailable.

Controls: program/method; root cohort; model/run/stage; impact basis; payment start and length (1–24 months); reach; realization; sensitivity basis; assumed recognition month; scenario set. Do not expose p as an unexplained free slider: users select the versioned low/base/high planning range. A separately entered override is P1, must be named and saved as a new authored method.

Changing B or payment window affects financial estimates, not clinical probability or risk scores. Changing r affects expected reached support, not conditional p. Changing z affects money recognition, not expected clinical support. The same overlap selection stays frozen across the scenario range.

### 9.5 Program-specific methods

| Program | P0 requirement | Financial boundary |
|---|---|---|
| Medicare Advantage Part C | MA calculation/exposure planning under sections 9.2–9.4 | Illustrative sensitivity, not bid/benchmark/payment reconciliation; correct stage/normalization mandatory |
| Part D RxHCC | Preserve retained Part D score results and any separately documented existing financial method | No Part C B multiplier. If a Part D payment method and required subsidy/liability assumptions are absent, dollars unavailable; score scenarios remain usable. |
| ACA | Preserve retained ACA financial sensitivity method, input snapshots and results; show score-only mode when market/method inputs are unavailable | Transfers depend on the market pool and other factors; no guaranteed dollars-per-HCC/RAF or MA benchmark conversion |
| Medicaid | Analyze imported scores and retain separately documented contract sensitivity results | No native state payment-engine claim. Dollar sensitivity needs the actual contract/rate-cell methodology or an explicit authored reference scenario. |

**ACA method contract.** A retained method must identify state/market pool, benefit year, plan/metal context, member months, plan liability risk-score basis, relevant non-risk adjustment factors, market weights/denominators, premium basis, risk-sharing/high-cost assumptions where applicable and formula version. Preserve the existing method if its metadata and arithmetic meet this contract; otherwise show its saved result as a legacy method with limited interpretation and disable new dollar generation until clarified.

For a **new P1 illustrative risk-component sensitivity** if needed, define `Q_j` as plan j's risk term under the named method, `s_j` as its market member-month share and `Pbar` as the applicable premium basis. Recompute `D=Σs_jQ_j` and `D'=Σs_jQ'_j` for the proposed risk changes. Hold the non-risk allocation term fixed and show:

`DeltaRiskComponent_i = MM_i × Pbar × (Q'_i/D' − Q_i/D)`

This is only the stated risk-component sensitivity; it is not the full ACA transfer, high-cost pool result or final settlement. `Q` construction must come from the named method; it is not automatically a raw HCC score. An own-plan change must update the market denominator when its market share is nonzero. Missing market assumptions produce unavailable dollars, not a made-up slope. Production full-transfer forecasting is P2. CMS explicitly notes that transfers depend on other issuers' data. [CMS BY2026 simulation guidance](https://www.cms.gov/files/document/cy2026-diy-instructions-07-31-26.pdf)

**Medicaid method contract.** Require state/program/contract, rating period, rate cell, producer/model, input score normalization, applicable adjustable rate component, enrollment exposure, budget-neutrality treatment and excluded services. If a retained contract sensitivity applies `rate_component × change_in_relative_factor × member_months`, name that specific contract assumption and all transformations; do not present it as a universal Medicaid formula. No local condition-add delta is produced from an imported score alone. State managed-care methods require contract-specific actuarial context. [CMS Medicaid rate guides](https://www.medicaid.gov/medicaid/managed-care/guidance/rate-review-and-rate-guides)

### 9.6 Worked arithmetic fixture

Three independent selected positive candidates have adjusted score-equivalent exposures `.20, .10, .15`; p values `.80, .50, .20`; r `.75`; z `.90`; B `$1,000`; and 12 eligible future payment months each after the declared support/recognition horizon. These are authored fixture assumptions. A separate compatible validated correction scenario is `−.05` for 12 months.

| Output | Calculation | Expected |
|---|---|---:|
| Conditional expected supports | .80 + .50 + .20 | 1.50 cases |
| Reached expected supports | .75 × 1.50 | 1.125 cases |
| Gross positive | (.20+.10+.15) × 1,000 × 12 | $5,400 |
| Support-weighted | .75 × (.80×.20 + .50×.10 + .20×.15) × 1,000 × 12 | $2,160 |
| Realization-adjusted positive | 2,160 × .90 | $1,944 |
| Signed correction | −.05 × 1,000 × 12 | −$600 |
| Modeled net | 1,944 − 600 | $1,344 |

Adding an alias of the first case changes none of these numbers. Adding a second candidate to the first member does not automatically add its value: the selection policy chooses one and records the exclusion. A calculation returning zero marginal impact contributes zero, while a missing calculation produces incomplete coverage. The example is not a fixture for an official HCC coefficient.

### 9.7 Requirements

| Requirement | Priority / change | Acceptance |
|---|---|---|
| FIN-01 Value stages | P0 / Enhance | Display gross, support-weighted, realization-adjusted, corrections and net with distinct labels. Actual reconciled payments reads unavailable. |
| FIN-02 Single source of arithmetic | P0 / Enhance | Cards, bridge, curve, table and export derive from one retained scenario result; worked fixture reproduces $5,400/$2,160/$1,944/−$600/$1,344. |
| FIN-03 No double probability | P0 / Enhance | Metadata says whether p is conditional. Reject incompatible methods that already include reach/recognition and would be multiplied by them again. |
| FIN-04 Frozen overlap selection | P0 / Enhance | Select once per root scenario, retain winners/exclusions, preserve winners across low/base/high and report slices. No condition filter silently creates extra winners. |
| FIN-05 Joint correction effect | P0 / Enhance | For overlapping same-member changes, calculate correction-first baseline or mark combined net unavailable. Isolated deltas cannot be summed and called exact. |
| FIN-06 Correct score stage | P0 / Enhance | e, c and B use the same stage/scale. A raw/adjusted mismatch blocks calculation with an actionable message. |
| FIN-07 Scenario ranges | P0 / Enhance | Shared inputs and scenario-specific factors are visible; ordering is checked for the chosen nonnegative-positive set. Negative corrections remain present in all scenarios. A range is never labeled a confidence interval. |
| FIN-08 Time/window | P0 / Enhance | Payment curve ends at the same horizon as its headline total; no month before effective recognition receives positive value. Member eligibility caps exposure. |
| FIN-09 Program methods | P0 / Existing + Enhance | Part D/ACA/Medicaid cannot use the MA default multiplier. Missing required method inputs disable dollar generation but preserve score/report access. |
| FIN-10 Partial data | P0 / Enhance | Show valued/unvalued eligible candidates and corrections. Partial net is labeled partial, with full count and excluded value unknown; no extrapolation to all 10,000 members. |
| FIN-11 Scenario history/export | P0 / Enhance | Save all variables, definitions, selected/excluded case references, assumptions, method versions and monthly results; reopening yields original totals. |
| FIN-12 Forecast extensions | P1 / New | Add versioned probability overrides, richer exposure/recognition schedules and documented ACA risk-component sensitivity only after P0 reconciliation. |
| FIN-13 Production payment models | P2 / Deferred | Full actuarial/payment reconciliation, calibrated joint outcomes and validated attribution require separately approved data/methods; synthetic scenario interaction does not satisfy them. |

## 10. Geography and provider analytics

**Decision:** where does risk, suspect burden or data incompleteness concentrate, after accounting for exposure and comparability? County is **member residence**. Provider is **assigned practice**, not necessarily treating or diagnosing clinician. Use the screen label “Assigned practice” and the attribution cutoff visibly.

Specified default attribution: the member's valid residence and practice assignment at the selected period end, using an effective record within the selected eligibility context. If none is valid, use Unknown county/Unassigned practice; do not backfill from an undated latest address. This fixed attribution assigns each member to one county and one practice per snapshot, making partitions reconcilable. P1 may add member-month residence/assignment attribution as a separately named method.

Use same-program/model/segment/score-basis comparisons. Show eligible N, fresh-score coverage and available member months with every ranked risk result. County risk differences are descriptive; they do not establish provider quality, clinical causation or coding performance.

Specified small-cohort default: suppress sensitive cell values/rates where underlying distinct-member N is 1–19. Display “<20 members” and no precise rate, percentile or rank. Zero eligible remains zero. Apply complementary suppression where totals would trivially reveal a suppressed cell; exports follow the same policy. This is a product display rule, not a claim of regulatory de-identification. Authorized suspect-level access remains controlled separately and must not be expanded by an aggregate chart.

| Requirement | Priority / change | Acceptance |
|---|---|---|
| GEO-01 Attribution | P0 / Enhance | Every county/practice result carries assignment/residence method and date. A member with two historical practices appears once under end-period attribution. |
| GEO-02 Intersections | P0 / Existing + Enhance | County × practice filters use AND. Selecting a county and a practice with no shared members gives a genuine empty intersection; neither filter is silently dropped. |
| GEO-03 Ranking comparability | P0 / Enhance | Sort only within comparable model/basis and show N/coverage. Small/unknown cohorts are not assigned misleading top/bottom ranks. |
| GEO-04 Missing dimensions | P0 / Enhance | Unknown county and Unassigned practice buckets retain members and reconcile to parent totals. No geocoding or treating-practice inference is fabricated. |
| GEO-05 Heatmap | P0 / Enhance | County × practice matrix supports a selected metric (risk, prevalence, cases/1,000 or coverage), clear units and null/suppressed distinction. A legend does not mix count and rate. |
| GEO-06 Scatterplot | P0 / New | X = captured adjusted mean score, Y = capture-candidate members per 1,000 eligible members; bubble size = eligible N; color = score-coverage band. Tooltips disclose filters/basis. No regression/causal claim is required. |
| GEO-07 Aggregate drilldown | P0 / Enhance | Clicking a county/practice opens its condition/risk distribution, not a member list. Opening suspects is a separate deliberate action with permissions. |
| GEO-08 Authorized partitions | P0 / Existing + Enhance | Backend applies scope before aggregate and export. A practice-scoped user cannot recover other practices' totals through charts, saved views, exports or assistant answers. |
| GEO-09 Small cohorts | P0 / New | Suppressed UI values remain suppressed in CSV/JSON/PDF when those formats exist. Sorting/tooltips do not leak exact suppressed values. |

## 11. AI Impact and Ask Perform+

### 11.1 Frozen evaluation

The existing authored comparison remains a **frozen synthetic evaluation**: 200 charts, 100 per arm, ten condition slots per chart, 120 positive and 880 negative reference slots per arm. Preserve its benchmark values when confirmed against the retained fixture; E02 documents the following expected arithmetic. This is a historical fixture requirement, not fresh runtime verification.

| Metric | Fixture arithmetic | Expected display |
|---|---|---:|
| AI-stage precision | 108 / 135 | 80.00% |
| AI-stage recall | 108 / 120 | 90.00% |
| AI-stage specificity | 853 / 880 | 96.93% |
| Assisted final-review precision / recall | 102/105; 102/120 | 97.14% / 85.00% |
| Manual final-review precision / recall | 84/90; 84/120 | 93.33% / 70.00% |
| Confirmation yield | 105/135 | 77.78% |
| Illustrative active-review time reduction | (36−22)/36 | 38.89% |

Final-review decisions are not the AI-stage labels. Confirmation yield includes incorrectly confirmed positives and is not accuracy. The time illustration is not measured activity from the current session. Manual/assisted arms share the target definition; this authored comparison does not establish real causal effectiveness.

If the runtime fixture differs, preserve its actual data and log the conflict; do not overwrite retained records just to match this document. Resolve the fixture version before showing a claimed benchmark.

### 11.2 Contextual assistant

Ask Perform+ may explain current population/report results, why a selected suspect was flagged, the probability calculation, the financial assumptions or why a model is unavailable. The P0 path can use prepared questions, retained model-output replay and deterministic arithmetic explanations. Show its actual mode in the panel, such as “Prepared analysis” or “Retained response.” Do not describe it as live model inference when it is not.

Answers carry the report/snapshot/filter context, source or metric references, and generation/replay date. A stale prepared answer must not display under different filters. If the case/report is outside prepared coverage, respond with a bounded unavailable message or the verified deterministic metric explanation; do not invent a population analysis.

| Requirement | Priority / change | Acceptance |
|---|---|---|
| AI-01 Evaluation integrity | P0 / Existing + Enhance | Metrics reproduce the frozen fixture; changing a report filter, reviewing a case elsewhere or changing a financial assumption does not improve the benchmark. |
| AI-02 Honest impact | P0 / Enhance | Separate evaluation quality, authored timing and hypothetical financial scenarios. No “AI-generated revenue” is calculated by assigning all suspect value to AI. |
| AI-03 Appropriate visual comparison | P0 / Enhance | Timing uses paired bars with minutes; quality comparison shows reference denominators and stage-specific rates. Avoid one combined AI score hiding precision/recall tradeoffs. |
| AI-04 Source-linked responses | P0 / Enhance | Every numeric assistant answer matches the visible metric/scenario snapshot; every clinical quotation resolves to retained authorized evidence. |
| AI-05 Mode and scope | P0 / Enhance | Prepared/replayed outputs disclose mode; no live inference/configuration/SSO dependency is introduced. Unsupported questions have useful bounded responses. |
| AI-06 Future measured impact | P2 / New | Production AI impact needs outcome tracking, comparison design, independent labels, recorded resource use and attribution assumptions before measured benefit claims. |

## 12. Report catalog, exports and visual design

### 12.1 Concise report catalog

The catalog launches the corresponding analytic surface with a saved context. It does not duplicate calculations. Each report has a one-sentence question, a compact executive summary, readable charts and an expandable Method & data panel. All P0 reports export CSV/JSON and a reproducibility ZIP. Presentation exports are P1.

| Report ID / title | Audience and question | Metrics / primary visualization | P0 export contents |
|---|---|---|---|
| R01 Executive risk summary | Executive: how complete is risk representation and where is attention needed? | M01–M07, M17, M22–M25; headline cards, trend, opportunity mix | Summary plus aggregate backing data, definitions and provenance |
| R02 Risk distribution & condition burden | Analytics: what drives the portfolio's risk mix? | M07–M14; histogram/percentiles, ranked prevalence, category-count distribution | Bin counts, quantiles, condition/category aggregates and coverage |
| R03 Recapture completeness | RA lead: which persistent conditions have not been recaptured in a comparable period? | M15–M17; condition × period matrix and gap bars | Eligible/recaptured/gap pairs as aggregate counts; distinct-member counts separately |
| R04 Period & model comparison | Actuarial/model steward: did inputs change or did the model change? | M18–M20, M29; matched-direction bars and factor bridge | Paired cohort aggregate results, comparison mode and exclusions |
| R05 Geography & assigned practices | RA lead: where are descriptive differences concentrated? | M44 plus score/coverage/prevalence; heatmap, ranked table and scoped scatterplot | Fixed-attribution aggregates, denominators and suppression flags |
| R06 Suspect opportunity concentration | Suspecting lead: what kinds of questions dominate? | M21–M25, M38; category mix and condition Pareto | Canonical aggregate counts, financial-selection attribution and overlap exclusions |
| R07 Support-likelihood planning | Analyst: how much supported review outcome is assumed and what is unknown? | M25–M28; likelihood bands and evidence × band matrix | Assumption-based estimates separately from mature observed rates |
| R08 Financial scenarios | Finance: how sensitive is the opportunity to assumptions and corrections? | M31–M36; gross-to-net bridge, range plot and cumulative curve | All variables, selected/excluded cases as permitted, monthly totals and method |
| R09 Accuracy & representation integrity | Integrity lead: which overcapture/data issues remain unresolved? | M23, M34, M43; category bars, age bands and known/unknown impact | Read-only aggregate corrections/data gaps and status provenance; no task assignments |
| R10 AI evaluation | Executive/clinical lead: what does the retained benchmark establish? | M39–M42; paired quality/timing views | Frozen confusion matrices, denominators, cohort and authored timing assumptions |
| R11 Coverage & data reliability | Data/model steward: what can be safely interpreted? | M05–M06, M24–M25, M43–M45; completeness matrix and exclusions | Model/population coverage, freshness, missing sources and method gaps |

A bridge/waterfall must use components that sum to its displayed endpoint. A Pareto uses mutually exclusive attribution for value concentration; overlapping clinical prevalence uses ranked bars, not a misleading 100% composition. Scenario ranges use endpoints with method labels, not shaded statistical confidence bands. A map is optional P1; the existing county heatmap/ranking is sufficient and must not depend on live geocoding.

### 12.2 Export specification

**EXP-01 — P0 / Enhance — Formats.** Preserve CSV, JSON and ZIP. Do not expose a PDF/PPTX button until that exporter exists. PDF and editable presentation generation are P1 new capabilities, not assumed to be included in existing ZIP export.

**EXP-02 — P0 / Enhance — Common manifest.** Include product/report/version, generation time, synthetic/origin labels, requesting authorization-scope fingerprint, filter definition/hash, cohort/run/snapshot IDs, model/mapping/adjustment versions, program/year/period, attribution/weighting methods, score basis/stage, metric versions, missing/stale/suppression counts, financial/probability method versions and source references. Do not include keys, tokens, passwords or unrestricted user claims.

**EXP-03 — P0 / Enhance — ZIP contents.** Use predictable names: `manifest.json`, `summary.csv`, `aggregates.csv`, `metric_definitions.json`, `assumptions.json` when applicable, `exclusions.csv`, and a short `README.md` describing limits. Registry exports may additionally include `suspects.csv` and explicitly permitted source excerpts. No member-level population file is generated as an implicit analytics export.

**EXP-04 — P0 / Enhance — Values and locale.** Use UTF-8, ISO dates, explicit USD currency, decimal values without locale-dependent thousands separators in machine fields, stable IDs and raw/full-precision numeric fields alongside optional display values. Null numeric CSV fields are blank with a reason column; JSON uses null, never NaN. Escape spreadsheet formula-leading text to prevent formula execution, while retaining the unaltered semantic value in appropriately typed JSON when permitted.

**EXP-05 — P0 / Enhance — Snapshot consistency.** An export runs against the visible report's retained snapshot/filter hash. If inputs changed, the user chooses the existing snapshot or refreshes the report; do not export newly computed totals under an old screenshot's date.

**EXP-06 — P0 / Existing + Enhance — Authorization.** Recheck current permissions at export generation/download. A saved snapshot does not grant access to newly restricted practices. Offer creation of an authorized subset as a new report rather than silently changing the original saved totals. All suppression policies survive export.

**EXP-07 — P1 / New — Presentation formats.** Add print-quality PDF report pages and editable PPTX slides for R01/R08/R10 first. Use report title, population/period, origin label, readable legends, assumptions footer and provenance page. Do not rasterize the entire editable slide as one screenshot. Formula/table totals must match the same retained report output.

### 12.3 Desktop design requirements

Preserve the current white sidebar, IBM Plex Sans, cobalt/teal tokens and CitiusTech Perform+ branding. Northstar & Meridian remains an explicitly fictional example organization. Do not introduce client branding, a mobile navigation design or a new marketing-style hero.

Specified desktop design targets: primary 1440×900, verify at 1280×720 and 1920×1080. Use the existing component system; suggested token targets are 14px body/table text, 12px secondary metadata, 24–28px page titles and 8px spacing increments. Reuse actual accessible tokens rather than creating per-screen near-duplicate colors.

| Requirement | Priority / change | Acceptance |
|---|---|---|
| VIS-01 Hierarchy | P0 / Enhance | Page title/context, decision metrics and first actionable chart are visible without a large empty header at the target desktop size. Supporting methodology is expandable rather than a wall of introductory text. |
| VIS-02 Consistency | P0 / Enhance | Shared card padding, control height, chart title/legend positions, numeric formatting and table density across all six analytic tabs. No one-off oversized KPI cards or duplicated subtitles. |
| VIS-03 Semantic colors | P0 / Enhance | Captured/comparison series use stable tokens; potential and corrections remain distinct; color is accompanied by label/shape. A correction is not portrayed as a successful positive uplift because it is green. |
| VIS-04 Chart readability | P0 / Enhance | Every chart has units, denominator context, readable axes, meaningful legend and keyboard-accessible data summary. No decorative 3D/pie effects or dual axes that obscure different units. |
| VIS-05 Tables/panels | P0 / Enhance | Tables use consistent row height, sticky headers where needed and right-aligned numeric columns. Bounded evidence panels scroll independently only when necessary; avoid stacked nested scroll areas. |
| VIS-06 Empty/error states | P0 / Enhance | Distinguish no matches, unsupported model, missing source, partially scored, stale snapshot, suppressed cohort and failed request. Preserve filters and offer only applicable actions. |
| VIS-07 Loading | P0 / Enhance | Skeletons preserve layout; no flashing zero metrics, chart rescaling from zero placeholders or stale response overwrite. |
| VIS-08 Interaction/accessibility | P0 / Enhance | Visible focus, labeled inputs, keyboard-reachable controls, usable contrast and escape/return-focus for panels/dialogs. Do not claim an accessibility certification from these checks. |
| VIS-09 Export parity | P0 / Enhance | Report preview names/units/filters agree with exported summaries. Standard legends and caveats are readable when screen-shared at 1440×900. |
| VIS-10 Desktop-only boundary | P0 / Existing | No mobile acceptance matrix or mobile designs. At smaller unsupported widths, give a clear desktop-use message or maintain usable desktop scrolling without pretending mobile optimization. |

## 13. Data entities and analytic interfaces

### 13.1 Logical entities and required fields

These are logical contracts. Reuse equivalent existing tables/views; do not create duplicate stores solely because this document uses different names. Fields described as derived should come from source records and versioned transforms. New entities are proposed only for missing semantics.

| Entity / grain | Required fields | Integrity/derivation requirement |
|---|---|---|
| Organization and access scope | organization_id, fictional/demo flag, role/practice access mappings, effective access dates | Scope applied before query/aggregation/export; no trust in client filters |
| Population snapshot | population_scope_id, snapshot_id, as_of, source_cutoffs, generation_seed/version, origin, record counts, checksum | Immutable referenced snapshot; current/latest is a pointer, not a mutation of history |
| Member identity | stable member_id, organization_id, program membership references, identity resolution status | Synthetic IDs preserved; identities never merged by GenAI/name similarity |
| Enrollment span | member_id, program/plan, start/end, eligibility segment, model-required demographics, source/version | Union overlapping eligible spans; gaps and unknown dates retained |
| Member-month exposure | member_id, month, eligible days, denominator days, weight, method_id/version, validity | Program convention or explicit analytics fallback; no double-counted days |
| Residence history | member_id, county code/name, state, effective start/end, source, quality | Member residence, not provider address; Unknown retained |
| Practice and assignment | practice_id/name, member_id, effective start/end, assignment type, source, quality | Assigned practice; deterministic point-in-time selection, conflicts flagged |
| Clinical source | source_id/type/system, member_id, encounter_id, service/authored/received dates, signature/eligibility metadata, version/hash, origin | Original and amended records linked; metadata-only records do not imply retained document bytes |
| Clinical assertion/signal | signal_id, source_id, concept/code system/version, value/unit, subject, certainty, negation, temporality, relationship, span/field_ref, source-availability state | Preserve clinical meaning and provenance; numerical/medication clues do not become confirmed diagnoses |
| Coded diagnosis/input | input_id, member_id, encounter/service date, code/system/version, raw/corrected state, source, eligibility result/reasons | Retain original/replaced/voided lineage; never overwrite history with scenario assumptions |
| Model configuration | config_id/version, program, family, official asset release/hash/URL, year/run, segment scope, mapping, factors, adjustments/order, native/import-only, validation metadata | Released/forecast and declared supported scope explicit |
| Model run | run_id, config_id/version, input_snapshot_id, as_of, execution time, status, score basis/stage, member coverage, exclusions, validation fingerprint | Same retained run reused by every report; failed/partial distinguishable |
| Member model result | member_id, run_id, raw/adjusted score, factor contributions, categories, hierarchy state, interactions, exclusions, eligibility status | Internal analytic/scoring grain only; not authorization for a visible member workspace |
| External score import | import_id, member/cohort ID, producer, model/version, rating period, normalization/scale, score, file hash, validation exceptions | Unknown scale blocks incompatible averages; import-only status preserved |
| Canonical suspect | case_id, original finding aliases, member_id, concept/period/episode/change key, business category, legacy type, direction, clinical domain, rule/version, status/as_of | Clinical deduplication separate from model hierarchy overlap |
| Suspect evidence links | case_id, signal/source IDs, retained-excerpt references, evidence grade/assumption origin, contradictions, source dates | Sources may be shared; no copy counted as independent support |
| Planning estimate | case_id, t0, target/horizon/reach condition, method/version, inputs hash, p_base/low/high, band, exclusions, freshness, origin | Separate from observed outcome and model delta |
| Outcome event | case_id, event type/date, review reach date, supported/unsupported/clarification decision, source/actor role, observation end/censor reason, origin | Read/import existing history; no new operational UI required; events preserve chronology |
| Impact scenario | scenario_id/version, cohort/filter hash, baseline run, input transforms, computed/assumed basis, member results, aggregate deltas, correction order, exclusions | Hypothetical immutable results; actual coded records remain unchanged |
| Financial selection | scenario_id, member_id, selected case_id, candidate IDs, selection policy/version, tie-break result, excluded reasons | At most one positive per member/program/window under P0 approximation |
| Financial assumptions/result | method/version, currency, program, r/p/z sources, B, payment window, exposure/recognition schedule, corrections, low/base/high, monthly/total amounts, completeness | Arithmetic lineage, units and conditioning explicit; no observed-revenue field filled by estimates |
| Metric/report snapshot | report_id/version, metric IDs/definitions, context, numerator/denominator, values, suppression, provenance, saved name | Snapshot and method version allow exact re-open/export |
| AI benchmark/replay | evaluation_id/version, reference labels/counts, arm/target, timing origin, replay response, context hash, cited refs | Frozen benchmark cannot be mutated by demonstration interactions |
| Export manifest | export_id, report/scenario IDs, context hashes, authorization/suppression result, file format, generated_at, schema/version | No secrets; consistent with the downloadable files |

### 13.2 Analytic service contracts

Use existing API boundaries where possible. These are required behaviors, not a mandate to introduce specific endpoint paths.

| Contract | Required request | Required response / error semantics |
|---|---|---|
| Report context/coverage | Authorized scope, program/model/year, period, run/basis/stage, filters | Resolved context, available options, eligibility/scoring/source coverage, incompatible-filter reasons |
| Aggregate report | Resolved context ID/hash, metric/report ID, groupings, sort, page | Values with section 4.1 metadata, grouped denominators, suppression, full-scope totals |
| Suspect query | Same context plus category/direction/evidence/status/probability filters, canonical mode | Canonical case rows, alias counts, eligible/unknown/not-applicable totals, pagination |
| Evidence detail | Authorized case ID and retained version | Bounded permitted evidence/reasoning/provenance; unavailable reason if source absent |
| Scenario calculate/save | Baseline run, cohort, proposed canonical set, method, assumptions, expected prior version if editing | New immutable scenario result or input/applicability validation errors; no workflow write |
| Report/scenario export | Retained snapshot/scenario ID, format, selected/all-filtered mode | Authorized export with manifest; refusal if permission or snapshot changed incompatibly |
| Prepared assistant | Context hash and supported question/case reference | Matching retained/deterministic response, mode and citations; bounded unavailable response otherwise |

Use stable machine reason codes, for example: `unsupported_model`, `reference_only`, `input_snapshot_stale`, `missing_weight`, `missing_source`, `unknown_evidence_grade`, `non_applicable_target`, `overlap_excluded`, `unresolved_identity`, `small_cohort_suppressed`, `permission_denied`, `missing_financial_method`, `incompatible_score_stage`. Human-readable text explains the next analytic action.

### 13.3 Data/consistency requirements

| Requirement | Priority / change | Acceptance |
|---|---|---|
| DAT-01 Reuse existing records | P0 / Existing + Enhance | Map logical entities to current storage; preserve IDs, source histories, prior calculation runs and exports. No destructive reseed to simplify analytics. |
| DAT-02 Shared context | P0 / Enhance | One context/hash identifies report, registry and scenario inputs. Identical context/metric versions return consistent denominators and totals. |
| DAT-03 Lineage | P0 / Enhance | Each finding/probability/scenario links to retained inputs or explicit authored metadata; every score to its model/run. Missing lineage is visible, not fabricated. |
| DAT-04 Reproducible generation | P0 / Enhance | Seed, generator version, manifest and source hashes reproduce the same synthetic records and distributions. Adding a new fixture version preserves previous scenario reproducibility. |
| DAT-05 Chronology | P0 / Enhance | Review/outcome/recognition dates cannot precede their causal prerequisites. Post-t0 evidence cannot be used in t0 probability explanations or validation features. |
| DAT-06 Observed versus authored | P0 / Enhance | Every assumption and outcome carries origin. A random draw or authored positive is never marked observed real clinical support. |
| DAT-07 Numeric validation | P0 / New | Reject probabilities outside [0,1], negative member-month exposure, nonfinite amounts, incompatible units/stages, impossible date intervals and duplicate result keys. |
| DAT-08 Snapshot immutability | P0 / Enhance | New inputs create new probability/scenario/report versions; old exports remain interpretable under the old definitions. |
| DAT-09 Contract tests | P0 / New | Shared aggregation/selection/probability methods pass the concrete reconciliation fixtures in section 15; avoid testing only that a component duplicates its own formula. |

## 14. Data gaps and demonstration population plan

### 14.1 Data-gap matrix

“Reported populated” is E01 inventory, not a verified count. Audit before deciding which records actually need authoring.

| Data/capability | Current evidence | Derivable without inventing facts? | Required action / priority |
|---|---|---|---|
| 10,000 members / 12 counties / 30 practices | Reported populated | Counts, valid assignments and distributions can be audited | P0 manifest; fix true inconsistencies without replacing valid identity/history |
| ~1,500 findings | Reported broad population exposed | Category/direction/canonical mapping partly derivable | P0 map and count raw versus canonical cases; manually resolve ambiguous mappings |
| Six detailed clinical stories | Retained sources reported | Excerpts/history can be linked, not extrapolated to all records | P0 source-backed subset filter and usable example journey |
| Evidence grades outside six stories | Synthetic metadata may exist | Only if explicit authored inputs exist | P0 flag assumption origin; author missing metadata where justified or leave null |
| Canonical deduplication | Not established | From stable member/concept/episode/change keys | P0 derive with reviewed aliases and conflict cases |
| Closure target/horizon/conditioning | Not explicit in reported model | Cannot infer from a probability value | P0 SYN_SUPPORT90_V1 metadata and migration mapping |
| Calibrated closure predictions | Not established | No | P2 outcome dataset and validation; P0 displays illustrative status |
| Outcome follow-up | Retained workflow histories; no population-wide mature outcome claim | Some events derivable with definitions | P0 preserve; P1 aggregate empirical analysis; author separate labeled fixtures for edge tests |
| Default MA scored population | Reported completed | Aggregates from actual retained results | P0 eligibility/stage/freshness audit and complete demo report |
| Other model full populations | Reference/profile coverage only | Cannot copy MA output | P0 show reference coverage; add small eligible reference cohorts only as needed for the story, with real model execution |
| Prior comparable periods | Comparable analysis reported, history extent unknown | Only from retained inputs/runs | P0 verify; author missing synthetic period inputs then execute scorer, never author “official” numeric scores |
| Financial assumed exposure | Shared authored estimates reported | Can be derived only under named assumption model | P0 complete versioned exposure metadata; do not overwrite calculated deltas |
| Actual scenario deltas | Full-profile lab exists | Derived from executable model with complete inputs | P0 compute selected eligible cohorts and retain exclusions |
| Future eligible payment months | Not established population-wide | Only from available coverage/explicit continuation assumptions | P0 require declared horizon/exposure source; show missing coverage |
| ACA market/payment inputs | Retained sensitivity methods; full input completeness unknown | Not from an HCC score alone | P0 inspect methods; otherwise unavailable dollars/reference result; P1 authored market sensitivity fixture |
| Medicaid contract payment method | Imported score metadata only; sensitivity methods reported | Not from score/Florida geography alone | P0 retain only declared methods; no native payment engine claim |
| Authored AI benchmark | E02 fixture definition | Arithmetic can be checked against retained benchmark | P0 reconcile version and retain frozen mode |
| PDF/presentation exporter | No supplied evidence | New implementation | P1, not silently included in CSV/ZIP inventory |

### 14.2 Reproducible population plan

1. **Audit first.** Produce a baseline manifest of exact existing counts, program eligibility, assignments, score coverage, raw/canonical findings, available sources and model configurations. Preserve the existing roughly 10,000-member universe and source IDs.
2. **Balance the main MA story.** Use real retained model calculations on synthetic inputs to create useful low/medium/high score and opportunity cohorts. Balance the inputs, not manually assigned “official” scores. Keep a mix of high clinical opportunity with zero marginal score, uncertain hypotheses, corrections and data gaps.
3. **Make three population snapshots usable.** Reuse existing snapshots or author dated synthetic inputs and execute the native scorer. The main story should have at least three retained snapshots under one compatible model with visible eligibility/coverage. If snapshots are year-to-date cutoffs, label them that way; do not call their increments independent monthly disease incidence. Matched-period comparison uses its separate contract.
4. **Preserve the six source-backed stories.** Ensure each is reachable from its aggregate cohort and has a meaningful bounded evidence panel. Add new synthetic source stories only when required to cover a missing scenario; do not fabricate documents for every one of the 1,500 findings.
5. **Populate planning inputs consistently.** Store evidence assumptions, normalized categories, source availability and method versions in a shared dataset. Derive all probability bands and summaries from it; do not maintain hand-entered totals for screenshots.
6. **Create only scoped program references.** Where another model has reference coverage, retain it and clearly label small reference cohorts. New reference members, if needed, use a separate manifest/cohort and must not inflate or contaminate the main MA population. Never assign the same MA score to ACA/RxHCC just to populate tabs.
7. **Keep financial inputs honest.** Seed an explicitly authored MA sensitivity basis and standard scenario templates. Preserve existing ACA/Medicaid saved examples with method labels; missing current-method inputs remain unavailable.
8. **Create independent verification fixtures.** Test-only cases can be small and purpose-built; they do not have to enter the executive population. Record whether each fixture is clinical-source-backed, metadata-only, model-calculated or assumption-only.

### 14.3 Required coverage, not fabricated quotas

The demo manifest must confirm these paths exist; exact clinical prevalence targets are authored design choices, not epidemiologic estimates:

- Each of the seven business categories and each applicable capture/correction/data direction.
- Low, Medium, High, Unknown and Not applicable probability states; all three evidence assumptions.
- At least one duplicate signal, one distinct clinical condition sharing an HCC, one hierarchy-suppressed zero delta, one uncomputable delta and one contradictory add/remove pair.
- Current, historical, negated, uncertain and other-person assertions among prepared clinical examples.
- At least one positive opportunity and a separately visible correction in the principal demo cohort.
- One member with both a positive candidate and a correction to test joint calculation/selection behavior.
- A county × practice intersection with no members; a small suppressed cohort; unknown geography; unassigned practice; partial/stale scores.
- A valid zero score, missing score, failed run, unsupported configuration and reference-only model.
- One complete financial scenario, one partial scenario with unknown correction value, and one program whose dollar method is unavailable.
- Source-backed and metadata-only registry findings, plus a denied-source case for permission verification.
- Saved/reopened report/scenario and full-filter export across multiple pages.

After authoring, regenerate summaries from the same data. No chart receives a separately invented count merely to look balanced.

## 15. Journeys and reconciliation acceptance

### 15.1 Main executive journey

1. Open Overview for the default MA population and retained run. Read eligible N, weighted captured score, coverage and separate capture/correction counts.
2. Open Risk & conditions, inspect the distribution and select a condition with a meaningful recapture/opportunity concentration.
3. Narrow to one residence county and assigned-practice intersection. See the intersected denominator and coverage, not the whole-plan values under new labels.
4. Open Suspecting analytics and then the Registry with the same applicable filters. Inspect one source-backed case in the bounded evidence panel; show a metadata-only case to demonstrate its limitation honestly.
5. Open aggregate RAF Intelligence and run/reopen a hypothetical scenario. Explain baseline, full-profile delta, hierarchy/interaction effects and any exclusions.
6. Open Financial with the retained cohort and selected planning method. Compare low/base/high, show reach/support/recognition separately, and include signed corrections.
7. Save the scenario and export the executive/financial package. Reopen it and reproduce the displayed totals from the retained results.

No step depends on a member-analysis screen, coding task, provider request, campaign assignment, submission or live inference endpoint.

### 15.2 Additional required journeys

| Journey | Sequence | Acceptance result |
|---|---|---|
| J02 Overcapture integrity | Overview correction count → R09 → filtered registry → retained contrary evidence → remove/combined scenario → export | Negative/zero/unknown impact is represented honestly; no hidden coding-deletion action; correction remains visible regardless of revenue |
| J03 Model applicability | RAF coverage matrix → select RxHCC/ACA reference context → inspect supported segment/results → choose unavailable V24 or native Medicaid what-if | Valid reference result is usable; unavailable calculation is clearly unavailable; no copied MA score |
| J04 Closure assumption | Suspecting → evidence × likelihood matrix → a Strong RC case → probability explanation → financial reach change | Case p stays .70 while expected reached support changes; p is never described as a calibrated AI confidence |
| J05 Data limitation | Geography → empty county/practice intersection → reset one filter → partial-score cohort → missing-source case | Empty/partial/missing states remain distinct, consistent and visually complete |
| J06 AI evaluation | AI Impact → methodology → precision/recall confusion matrix → timing illustration → export | Frozen denominators and authored timing labels persist; no relationship to live session revenue is implied |
| J07 Restricted access | Sign in as practice-scoped user → aggregate reports → saved report → registry/evidence → export | Data stays within current scope; broad saved/report URLs cannot reveal other practices |

### 15.3 Golden reconciliation fixtures

These are independently specified test cases for a future implementation. The arithmetic below is part of the requirements, not evidence that current code passes.

| Test ID | Input/setup | Expected result |
|---|---|---|
| T01 Weighted mean | Scores 1.0 and 2.0 with valid member months 12 and 6 | Mean = 24/18 = 1.333333…; displayed 1.333; unweighted mean 1.5 appears only if explicitly requested |
| T02 Coverage | 100 eligible; 80 fresh scored, 10 stale-only, 10 unscored | Member coverage 80%; stale/unscored separately visible; no missing score coerced to zero |
| T03 Distinct members | One member has three different valid condition cases | M21=3 cases, M22=1 member; prevalence membership not a sum of cases |
| T04 Canonical duplicate | Three rule/source findings concern one clinical question/period/change | One canonical case; three aliases/signals; probability and value counted once |
| T05 Probability | Strong CG, Strong RC, Strong NC, Limited NC, unknown grade | .80, .70, .65, .05, null; bands High, High, Medium, Low, Unknown |
| T06 Expected support | p=.8,.5,.2 and uniform r=.75 | Conditional 1.5; reached 1.125; z changes neither |
| T07 Financial arithmetic | Inputs in section 9.6 | Gross 5,400; support-weighted 2,160; realized positive 1,944; correction −600; net 1,344 USD |
| T08 Payment schedule | e=.20, r=.75, p=.80, z=.90, B=1,000, 6 eligible effective months | Realized positive = $648; zero outside those six months; cumulative curve final = $648 |
| T09 Exact combined effect | Scorer returns baseline 1.50, after correction 1.30, final addition+correction 1.40 | c=−.20, e=.10; combined=−.10; no separate isolated add value used |
| T10 Hierarchy zero | New valid diagnosis maps to a category superseded by existing profile | Actual scenario delta zero with hierarchy reason; clinical case retained; not treated as unknown |
| T11 Unknown impact | Missing model mapping or full-profile input | Delta null with reason; excluded from exact total; coverage reduced; no fabricated coefficient |
| T12 Fixed selection | Same member has .20×.80=.16 and .30×.50=.15 base expected increments | Select first; low/high scenario changes do not switch winner; filtered condition subtotal does not resurrect second |
| T13 Recapture | Four eligible member–persistent-condition pairs, three current qualifying recaptures | 75% recapture and one pair gap; pair/member counts explicitly distinguished |
| T14 Matched periods | 80 members have comparable valid scores in both periods, 20 only current | M18/M19 denominator 80; direction counts sum to 80; 20 do not become prior zeros |
| T15 Geography | Three members, one Unknown county and one Unassigned practice | All three in overall denominator; exhaustive fixed-attribution groups reconcile before suppression |
| T16 Empty intersection | County A and Practice B have no common eligible members | Eligible N=0; ratios unavailable; neither filter disappears |
| T17 Small cohort | A group has 12 distinct members and a complementary total exposes it | Suppressed cell/rates/rank, with complementary suppression as necessary in UI/export |
| T18 Future leakage | Evidence arrives at t0+20 and support outcome occurs at t0+60 | Neither is a t0 probability input; later version can use the evidence with a new t0 |
| T19 Outcome maturity | Reached cases with full 90-day observation: 6 support, 3 unsupported, 1 still pending; 2 additional censored | Observed target rate 6/10=60%; censored=2; pending is target not achieved, not diagnosis absent |
| T20 Non-applicable probability | Confirmed correction, DR issue and already supported case | All outside future positive-support probability set with specific reason codes |
| T21 Export-all | Filter returns 143 canonical cases; current page size 25 | Export-all contains 143 permitted canonical cases, selected export contains selected IDs only; neither defaults to 25 |
| T22 Stage compatibility | Raw delta offered to adjusted-score payment method without declared transformation | Calculation blocked until corrected; no hidden normalization shortcut |
| T23 Model absence | Request V24 execution/comparison without assets | Explicit unavailable result; no inferred/fabricated historical value |
| T24 AI metric separation | Frozen fixture from section 11 | Precision 80%, recall 90%, confirmation yield 77.78%; no substitution of yield for accuracy |
| T25 Stale filter response | Request A resolves after newer request B | B context/data remains; A response cannot overwrite it |
| T26 Permission change | Saved broad report opened after loss of one practice | No old restricted rows/totals disclosed; authorized subset requires explicit new snapshot |
| T27 Net completeness | Positive value known, one relevant correction impact unknown | Net labeled partial with unvalued correction count; no claim of total accurate net benefit |
| T28 ACA market sensitivity, if added | Change own Q with nonzero market share | D' changes consistently; display only method-scoped risk-component sensitivity, not guaranteed transfer |

### 15.4 Cross-report checks

- R01 capture-member count equals the distinct member count of the corresponding R06/registry canonical filter, after identical program/eligibility filters.
- R06 case counts equal registry full-filter totals; raw alias counts reconcile separately.
- R07 probability bands sum to probability-applicable cases plus disclosed unknowns; not-applicable cases are outside that denominator.
- R05 exhaustive county/practice totals equal the same parent scope before suppression; visible totals follow the suppression policy afterward.
- RAF baseline and scenario use the same member set/weights; a partial scenario exposes exclusions rather than changing the baseline denominator silently.
- R08 totals equal its monthly curve endpoint and exported monthly sums. R08 positive totals need not equal the sum of all R06 cases because one-per-member selection excludes overlaps; the bridge reports this difference.
- R10 is frozen and independent of population filtering unless a compatible evaluation subgroup actually exists. A context banner explains this exception.
- Reopening a report preserves its as-of date, origin, definitions and scenario method even when the application has newer source data.

## 16. Security, performance and release boundaries

| Requirement | Priority / change | Acceptance |
|---|---|---|
| NFR-01 Server-enforced scope | P0 / Existing + Enhance | Direct aggregate/evidence/export API calls reject unauthorized scope; UI hiding is never the control. Superuser access remains explicit. |
| NFR-02 Minimal identifiers | P0 / Enhance | Analytics tables remain aggregate. Registry/export includes only identifiers necessary and authorized for suspect inspection; broad demographic profiles are absent. |
| NFR-03 Prepared AI boundary | P0 / Existing | P0 works with local prepared/replayed outputs. No secrets appear in browser data, source-control examples, logs or exports; no external inference call is required. |
| NFR-04 Local startup | P0 / Existing | Document existing UI/API/database local startup and required fixture/model availability; no deployment/provisioning is introduced. |
| NFR-05 Performance budget | P0 / Enhance | Specified target on the agreed demo machine: warm aggregate/filter responses p95 ≤2s and registry first-page p95 ≤2s for the seeded scope; report navigation usable within 3s after data is ready. Record hardware, run size and repeated measurements. |
| NFR-06 Long-running work | P0 / Enhance | Native population calculations and large exports may exceed interactive budget; display real progress/status and preserve retained completed results. Do not use animated fake progress to imply an unrun calculation. |
| NFR-07 Failure recovery | P0 / Enhance | API failure gives actionable state/retry without losing filters or overwriting saved scenarios. One unavailable model does not break other analytic tabs. |
| NFR-08 Consistent caching | P0 / Enhance | Cache keys include authorization scope, input/model/method versions and filters. A stale or differently authorized result cannot serve as current data. |
| NFR-09 Traceable changes | P0 / Existing + Enhance | Existing logs/history remain intact; analytic saves reference immutable inputs. No new operational audit workspace is required. |
| NFR-10 No unsupported readiness claims | P0 / Existing | Demo narrative describes synthetic data, prepared behavior and limited coverage accurately. Do not claim compliance certification, production ingestion/OCR, enterprise SSO, live receiver integration or payment reconciliation. |
| NFR-11 Production operations | P2 / Deferred | Production SSO, tenant hardening, concurrency/load targets, retention, disaster recovery, deployment and live integrations require separate scope and validation. |

The performance targets are specified defaults, not current benchmark results. A single-presenter local demonstration does not establish multi-user production performance. Existing local authentication is mandatory; adding enterprise SSO is not.

## 17. Decision register

Confirmed scope decisions are in section 1. The following consequential details were not fully specified by E01. Defaults below make the document implementable without waiting for every optional preference; they do not imply that the user approved each numeric value.

| Decision | Recommended/default resolution in this document | Owner / change consequence |
|---|---|---|
| D01 Individual inputs in model lab | Retain technical capability off core navigation; expose aggregate scenarios only | Product/model lead; adding visible member analysis requires explicit scope change |
| D02 Executive screen location | Overview is the sole executive report entry; old Executive tab route redirects | Product/design; avoid duplicated metrics |
| D03 Probability target | Support by day90 conditional on reach by day30 | Clinical analytics/product; changing target requires new labels, methods and outcome data |
| D04 Authored probability constants | SYN_SUPPORT90_V1 anchors .80/.50/.20; RC −.10; NC −.15; clamp .05–.90 | Analytics/clinical owner; reconcile current method before migration |
| D05 Probability ranges/bands | ±.10 planning spread; low <.40, medium .40–<.70, high ≥.70 | Analytics; not empirical intervals |
| D06 Default freshness | 30 days for current data/probability plus immediate version/input invalidation | Data/product; historical snapshots retain historical validity |
| D07 Geography/provider attribution | End-period valid residence/assigned practice; Unknown/Unassigned retained | Analytics; month-level attribution is P1 separate method |
| D08 Small-cohort display | k=20 plus complementary suppression; probability observed-rate cell minimum 30 | Data governance/analytics; not a de-identification certification |
| D09 Financial overlap | One positive candidate/member/program/window selected on p_base×increment; freeze selection | Actuarial/product; exact joint probabilistic valuation is P2 |
| D10 Corrections and financial ranking | Corrections are a separate integrity view; revenue decrease cannot suppress them | Clinical integrity/product |
| D11 Default planning assumptions | r=.75, z=.90, B=$1,000 illustrative; 12 future payment months with explicit start/eligibility | Finance; replace with approved inputs when available, preserve origin |
| D12 Other-program dollar availability | Retain documented methods; unavailable dollars when required inputs/method are missing | Actuarial/model owner; no generic MA conversion |
| D13 PDF/presentation exports | P1; P0 CSV/JSON/ZIP and polished on-screen reports | Product/design; PDF/PPTX implementation is additional work |
| D14 Reference versus population coverage | Keep explicit reference-only mode for configurations without populated eligible runs | Model/data owner; never expand counts by assumption |
| D15 Model-asset validation | Repository must establish asset release/hash, segment scope and official reference parity | Model owner; **unresolved implementation evidence**, not replaceable by invented metadata |
| D16 Exact current schema/field semantics | Map current storage and score bases before changing calculations | Engineering/analytics; **unresolved repository evidence** |
| D17 Production calibration thresholds | Do not set success thresholds from synthetic data; require real independent validation protocol | Clinical/data science owner; blocks validated-prediction claim, not demo |
| D18 Demo machine/performance | Agree hardware profile; use section 16 budget provisionally | Engineering/QA; record actual results before performance claims |

Genuine blockers are narrow: an unavailable model method blocks its numeric result, not all application work; absent evidence blocks a clinical-support claim, not the ability to inspect an authored scenario; absence of live inference does not block a prepared analytics demonstration.

## 18. Traceability and implementation backlog

### 18.1 Requirement-to-current-implementation traceability

Repository paths below were requested in E01 but are **inspection targets only**; they were not present for inspection in this task. Do not quote this table as code verification. If modules are named differently, record the actual paths/commit during BL-01.

| Requirement group | Baseline IDs / evidence | Expected inspection target | Required disposition |
|---|---|---|---|
| SCP-01–05, UI-01–05 | B03, B15, B26; E01 | `apps/web/src/lib/workflow-flags.ts`, navigation/routes, `docs/PRODUCT_HANDOFF.md`, `docs/ANALYTICS_REFRESH.md` | Preserve refresh, hide deferred surfaces, aggregate lab routing; verify current tree before editing |
| POP-01–12; metric M01–M20 | B09, B12–B15; E01 | Analytics components, `apps/api/app/risk_*`, `docs/FLORIDA_ANALYTICS_PLAN.md` | Reuse aggregations; unify denominators, coverage and comparable-period semantics |
| RAF-01–12 | B06–B12; E01/E05 | `apps/api/app/risk_*`, model assets/registry, snapshot/scenario services | Verify eight config scopes/versions and actual native/reference/population coverage |
| SUS-01–13 | B05, B16, B18; E01/E04 | Registry/evidence components, finding/clinical-source APIs | Add taxonomy/canonical identity and bounded inspection; do not reopen review/member workspace |
| PROB-01–10 | B17, B27; E01 | `apps/web/src/lib/suspect-planning.ts`, planning API/storage, outcome history | Inspect current constants; centralize method, target/horizon, null/freshness and exports |
| FIN-01–13 | B18–B20; E01 | Financial analytics/components, planning service, retained risk financial methods | Preserve program-specific methods; formalize conditioning, selection and signed corrections |
| GEO-01–09 | B14; E01 | Geography/assigned-practice APIs/components, `docs/FLORIDA_ANALYTICS_PLAN.md` | Fixed attribution, intersections, aggregates and minimum-cohort handling |
| AI-01–06 | B21–B22; E01/E02 | AI Impact fixture, prepared answer/replay components | Preserve frozen evaluation and source/context restrictions |
| EXP-01–07, VIS-01–10 | B03, B23–B25; E01 | Export services, design tokens, chart/table components, `docs/BROWSER_E2E_AUDIT.md` | P0 CSV/JSON/ZIP consistency; presentation exporter remains P1 |
| DAT-01–09 | B04–B06, B09–B10, B16–B20; E01 | Seed/migrations/schema, snapshots, result stores | Preserve populated data, add missing explicit metadata and reproducible fixtures |
| NFR-01–11 | B01–B02, B28; E01 | Auth/export authorization, caching, `README.md`, `TODO.md`, `docs/AUDIT_GAP_CLOSURE.md` | Retain security/local operation; document actual runtime results |
| Prior V2 conflicts | E02 sections A4–A5, B4/B9/B11, D/F | `CitusTech_Perform_Plus_Business_Requirements_v2.md` and any repository counterpart | Member-profile/workflow-heavy demonstration requirements superseded; calculation/safety history retained |

### 18.2 Ordered backlog

The implementation team should create tickets from these items; this document does not start that implementation. Sequence dependencies, not estimates, determine the order. “Verify existing” is part of the work and may close an item without a rebuild if current behavior already meets acceptance.

| Backlog ID | Priority / change | Deliverable and requirement coverage | Dependencies | Completion evidence |
|---|---|---|---|---|
| BL-01 | P0 / Verify existing | Inspect requested README/TODO/handoff/refresh/geography/audit docs, flags, planning, registry/analytics and risk modules; reconcile E01 inventory | None | Actual commit/paths, runtime startup result, exact manifest and updated capability matrix; no invented verification |
| BL-02 | P0 / Enhance | Visible navigation/scope cleanup and aggregate RAF route; SCP-01–05, UI-03 | BL-01 | Main journey has no operational/member/configuration dependency; retained APIs/history intact |
| BL-03 | P0 / Enhance | Shared analysis context, eligibility, weighting, freshness and metric contracts; section 4, DAT-02/03/07 | BL-01 | T01/T02/T14/T15; matching context hashes and explicit null semantics |
| BL-04 | P0 / Existing + Enhance | Verify model/configuration coverage, assets, raw/adjusted and native/import boundaries; RAF-01–03/06–08/10 | BL-01, BL-03 | Configuration matrix and reference validation; unsupported paths correctly unavailable |
| BL-05 | P0 / Enhance | Canonical suspect model, category/type/status crosswalk, alias/history preservation; SUS-01/02/04/11 | BL-01, BL-03 | T03/T04/T20; stable IDs and documented unresolved mappings |
| BL-06 | P0 / Enhance | Versioned support-planning method and metadata; PROB-01–08 | BL-05 | T05/T06/T18/T20 and shared UI/export values; no calibrated claim |
| BL-07 | P0 / Enhance | Synthetic gap fill and retained snapshot preparation; DAT-01/04–06/08, section 14 | BL-03–06 | Seed manifest, three main-story snapshots, required edge states; actual scores come from scorer |
| BL-08 | P0 / Enhance | Overview/risk/recapture/comparison reports; POP-01–11, R01–R04 | BL-03/04/07 | T01/T02/T13/T14 plus cross-report reconciliation |
| BL-09 | P0 / Enhance | Geography/assigned-practice reports; GEO-01–09, R05 | BL-03/07 | T15–T17; no individual-member drilldown; authorized partitions |
| BL-10 | P0 / Enhance | Suspecting analytics, registry and bounded evidence; SUS-03/05–10/12, R06/R07/R09 | BL-05–07 | Broad finding population and six retained-source stories; J02/J04/J05 |
| BL-11 | P0 / Enhance | Aggregate full-profile scenarios; RAF-04/05/09/11 | BL-04/05/07 | T09–T11/T23; snapshot-preserved hypothetical outputs |
| BL-12 | P0 / Enhance | MA planning, selection, probability conditioning, corrections and curves; FIN-01–08/10/11 | BL-06/11 | T07–T12/T22/T27; same totals in charts and exports |
| BL-13 | P0 / Existing + Enhance | Program-specific retained financial-method checks; FIN-09 | BL-04/12 | Part D/ACA/Medicaid methods documented or gracefully unavailable; no MA multiplier reuse |
| BL-14 | P0 / Enhance | Frozen AI Impact and bounded existing Ask Perform+; AI-01–05 | BL-03/05/06 | T24 and J06; fixture unchanged by workflow/filter activity |
| BL-15 | P0 / Enhance | Report catalog, saved views, CSV/JSON/ZIP manifests; UI-01/02/04/05, EXP-01–06, R01–R11 | BL-08–14 | T21/T25/T26; complete and reproducible export package |
| BL-16 | P0 / Enhance | Desktop visual consistency and failure/empty states; VIS-01–10 | BL-08–15 | Screenshots at 1280×720, 1440×900, 1920×1080; no clipping/false labels; keyboard checks |
| BL-17 | P0 / Existing + Enhance | Authorization/cache/local/performance regression; NFR-01–10, DAT-09 | BL-15/16 | J07, T25/T26, recorded local latency; no hosting changes |
| BL-18 | P0 / Verify release | Run all applicable section 15 fixtures and demonstration journeys; section 19 gate | BL-17 | Signed-off evidence checklist with failures/limitations visible; no self-certified production claims |
| BL-19 | P1 / New | PDF/editable presentation exports, EXP-07 | P0 accepted | R01/R08/R10 artifact parity and readable export layout |
| BL-20 | P1 / New | Mature observed closure cohorts and read-only rule panels; PROB-09, SUS-13 | Reliable outcome history | Censoring/reach/target separation; no operating work queues |
| BL-21 | P1 / Enhance | Financial overrides/schedules and ACA component sensitivity; FIN-12 | P0 finance accepted | Versioned methods; T28; no full-transfer claim |
| BL-22 | P1 / New | Standardized comparison/reference weights and optional month-based attribution; POP-12 | Approved strata/exposure data | Descriptive versus standardized results visibly separated |
| BL-23 | P2 / New | Validated closure models, measured AI impact and production payment/attribution; PROB-10, AI-06, FIN-13 | Real outcomes, independent validation, approved methods | Protocol-specific validation and monitored release; no synthetic substitute |
| BL-24 | P2 / Deferred | Additional model engines and production operations; RAF-12, NFR-11 | Separate approved scope/assets/infrastructure | Explicit future release plan; no restoration of hidden operational UI by implication |

### 18.3 Change-control rules

- Existing behavior that meets a requirement is retained; do not rebuild it merely because this document assigns a new ID.
- A data-semantic change requires a definition/method version and migration mapping, not only a label change.
- A scope expansion to operational workflow, member analysis, agent configuration, live inference or public hosting requires a separate product decision; none is implied by this backlog.
- A completed ticket records actual evidence: code path/commit, data/run version and relevant acceptance results. Requirements prose alone is not completion evidence.
- P1/P2 items cannot be advertised as working in the P0 demo. Explicitly allowed unavailable states remain useful P0 behavior.

## 19. Release acceptance and sources

### 19.1 Definition of done for the demonstration

The release is ready when:

1. The main population → suspect → evidence → scenario → export journey completes on the local desktop build with no operational/member workspace dependency.
2. Reported baseline capabilities have been reconciled against the actual repository/runtime; unresolved items remain labeled and numeric claims stay within verified coverage.
3. The main MA population is populated, distributions/recapture/trends are coherent and at least three retained same-model snapshots support the planned story. Other configurations clearly distinguish reference, full-population and unavailable modes.
4. Captured/supported/reported/potential bases and raw/adjusted stages remain distinct. Calculations preserve full-profile hierarchy/interaction behavior and immutable provenance.
5. Registry counts are canonical, source coverage is honest and the six source-backed cases are usable without a full member workspace.
6. SYN_SUPPORT90_V1, its target/horizon, exclusions and assumption status appear consistently across reports, registry, assistant explanations and exports.
7. Financial totals reconcile through reach/support/recognition, frozen selection, correction treatment and the monthly horizon. Exact calculations and authored exposures are not silently mixed.
8. At least the required positive, correction, zero-impact, unknown, duplicate, partial, stale, unavailable, small-cohort and empty-intersection fixtures are exercised.
9. Current role/practice authorization and export protections pass; no UI-only security assumption or new public deployment exists.
10. CSV/JSON/ZIP outputs reproduce visible figures and carry method/provenance. Unsupported PDF/presentation buttons are absent.
11. Desktop layouts are visually checked at the specified sizes, and performance is measured on the named local demo setup.
12. The presenter can explain what is calculated, authored, replayed, imported, hypothetical or unavailable without qualification hidden in a separate document.

No gate requires live LLM inference, production OCR/ingestion, enterprise SSO, native Medicaid payment calculation, live submissions, real payments or a production certification.

### 19.2 Source register and interpretation

The primary product authority is the user-supplied latest-scope prompt. The earlier V2 document supplies historical definitions and identifies conflicts; it does not override this scope. Official references below support program boundaries. They do not validate any application code, clinical case, probability constant or financial assumption in this document.

| Source | Relevant use |
|---|---|
| `LATEST_SCOPE_REQUIREMENTS_PROMPT(1).md` | Confirmed scope, implementation inventory, requested deliverables and hidden-surface boundaries |
| `CitusTech_Perform_Plus_Business_Requirements_v2.md` | Prior model/workflow requirements and frozen synthetic evaluation arithmetic; requirements-only evidence |
| Prior Suspecting Categories and Rules document | Seven business categories, bidirectional capture/correction and evidence interpretation |
| [CMS CY2027 Medicare Advantage and Part D Rate Announcement](https://www.cms.gov/newsroom/fact-sheets/2027-medicare-advantage-part-d-rate-announcement) | Program/model/year/source-policy distinctions and Part D population differences |
| [CMS BY2026 HHS risk-adjustment DIY software instructions, July 2026 update](https://www.cms.gov/files/document/cy2026-diy-instructions-07-31-26.pdf) | HHS model release/configuration and local score simulation versus market-dependent transfers |
| [CMS Medicaid managed-care rate guides](https://www.medicaid.gov/medicaid/managed-care/guidance/rate-review-and-rate-guides) | Contract/rating-period actuarial context for Medicaid sensitivity rather than one universal method |
| [CMS Medicare Advantage Risk Adjustment Data Validation program](https://www.cms.gov/data-research/monitoring-programs/medicare-risk-adjustment-data-validation-program) | Evidence support and payment-integrity context; unsupported diagnoses are not a financial success metric |

Clinical integrity is a product objective throughout. The document does not promise elimination of audit findings, recoveries or penalties. Required corrections remain visible even when they decrease an estimated score or financial amount.

**Handoff:** implement from the prioritized backlog after reconciling the current build. Preserve working foundations, add the missing analytic semantics and evidence, and keep the demonstration within the explicitly stated scope.
