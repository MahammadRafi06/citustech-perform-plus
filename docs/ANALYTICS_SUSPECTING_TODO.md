# Perform+ analytics and suspecting — implementation TODOs

**Status: fixture-backed analytics presentation implemented locally; browser verification and receipts are recorded in the [implementation handoff](ANALYTICS_SUSPECTING_IMPLEMENTATION.md).**

Implementation was authorized after planning, including in-memory/hardcoded data where needed. The delivered scope below supersedes native-only population-data requirements for this presentation. The original detailed checklist is retained as a stricter native/data-engineering backlog; unchecked items must not be read as verified native behavior.

### Delivered presentation checklist

- [x] Analytics-only navigation, six report tabs and aggregate provider/geography views.
- [x] Shared contract, reporting-period, model, score-stage and population filters.
- [x] Four populated RAF tiles with Baseline < Accepted ≤ Submitted < Potential at displayed precision.
- [x] Canonical suspects, all seven categories, rule/HCC breakdowns, likelihood matrix and retained evidence.
- [x] Six authored potential-overcapture topics and explicit deterministic-rule/prepared-AI separation.
- [x] Illustrative/native scenario paths, financial sensitivities, frozen AI and contextual assistant.
- [x] Eleven report catalog entries, immutable saved views and protected full-filter/selected exports.
- [x] Desktop visual refinements, local builds/tests and browser walkthrough; screenshot receipt linked above.

Native-only acceptance, complete metric-envelope coverage, richer comparisons and P1/P2 items remain explicitly bounded in the handoff. No cloud deployment is authorized by this implementation.

Reviewed on 2026-09-15 against local `main`, HEAD `0363809`, including the existing uncommitted analytics/UI changes. Read all 1,110 lines of [CitiusTech_Perform_Plus_Analytics_and_Suspecting_Full_Requirements.md](../CitiusTech_Perform_Plus_Analytics_and_Suspecting_Full_Requirements.md). This document converts its BL-01–BL-24 backlog into repository-specific work and acceptance checks. It originally authorized planning only; the later user instruction authorized local development, but not deployment.

The baseline below is a source inspection, not a new browser run, database census, model-validation run or performance benchmark. Existing verification receipts are historical evidence. Unchecked items remain open even where reusable implementation exists.

## 1. Scope and precedence

The product is for **analyzing population risk, identifying and prioritizing suspected conditions, inspecting supporting evidence, quantifying potential score impact, and exporting actionable insights**. It is not a workflow application.

Preserve these explicit user decisions when implementing the attached requirements:

| Area | Planning decision |
|---|---|
| Overview score tiles | Keep **Baseline, Potential scenarios, Submitted set, Accepted set**, showing their RAF scores. Do not replace them with the document's five-card executive layout or reintroduce a Score basis dropdown on Overview. |
| Overview supporting sections | Do not restore **Calculation coverage** or **Metric definitions and denominators** on Overview. Put detailed coverage in R11 and definitions in supporting report Method & data panels/exports. Relevant unavailable/stale reasons still belong beside affected values. |
| Reporting period | Keep **Run month: Latest** plus named reporting months, and Year. These select reporting periods, not execution months. Preserve the current Latest behavior until a documented snapshot-selection rule replaces it; never silently reinterpret it. |
| Program/model labels | Keep year-first labels and ordinary selectable 2024/2025 blend options. Do not restore a Historical group or special historical wording. Unavailable computation still returns an honest empty/unavailable result, never invented scores. |
| Basis versus stage | The four tiles choose data basis. Raw versus adjusted is a separate axis. Plan an explicit stage control in shared analysis context; adopt the requirement's adjusted MA headline only after verifying compatible retained outputs. Label other programs with their own score terminology. |
| Default model | Source currently defaults to `ma_v28_py2027_forecast`, not the document's assumed 2026 population story. Retain the current default; establish the actual retained cohort/configuration in BL-01 before selecting the three-snapshot story. |
| Visible scope | No Member analysis, member lists in analytics, member profile journey, assignment/approval/submission actions, or operating work queues. Keep necessary scoring APIs and clinical history/gates intact. |
| UI | Desktop only. Preserve the white sidebar, current branding, IBM Plex Sans, and established cobalt/teal palette. Reuse the existing shell and align containers/padding. |
| Runtime | Local authentication/RBAC and prepared AI behavior. No live inference or enterprise SSO dependency. No AWS provisioning, public deployment, or restoration of the decommissioned application. |

The document proposes new probability and financial defaults. BL-06 and BL-12 explicitly version those changes; existing saved results must retain the methods used to produce them. This plan records the proposal without claiming that those methods are already implemented or validated against real outcomes.

### 1.1 Additional direction from the supplied Prototype Sync notes

The user supplied meeting excerpts for items 9–14 after the initial requirements review. Treat those excerpts as additional product direction; the linked Teams meeting itself was not inspected. Incorporate their motivation into the same backlog, rather than create a competing dashboard or second suspect engine.

**Product narrative:** Perform+ is an executive risk analytics and suspecting platform. It explains population risk, shows where evidence-backed opportunities and representation risks are concentrated, and quantifies supported hypothetical impact. Deterministic rules identify candidates; AI reasoning adds context and explanations. Official mappings, eligibility, score arithmetic and clinical gates remain governed deterministic functions.

| Supplied note | Addition or clarification in this plan | Work items |
|---|---|---|
| 9 — Expand Risk Analytics Story | Lead with RAF trends, HCC prevalence, suspect concentration, geography, assigned-practice comparisons and risk opportunity. Remove owners, due dates, assignments, reviews and operations tracking from the visible analytic journey. | BL-02/08/09/10/16/18 |
| 10 — Executive dashboard | Preserve the four existing score tiles. Explain their mapping to Current RAF → Baseline, Projected RAF → Potential scenarios, Submitted RAF → Submitted set, Accepted RAF → Accepted set. Retain reporting month/year and year-first Program & model; add a real, scoped Contract filter. Support the headline with trend, distribution, top HCCs, geography and practice breakdowns. | BL-01/03/07/08 |
| 11 — Simplify Suspect Analytics | Add canonical suspects by business category, rule type and model-scoped HCC, plus distinct qualified-member counts with a defined denominator. These are analytical outputs, not assignment queues. | BL-03/05/10 |
| 12 — Overcoding detection | Add authored potential-overcapture examples involving HIV, diabetes with complications, CKD, depression, obesity and cardiovascular conditions. These are candidate demonstration topics, not assertions that those conditions are commonly miscoded or map to an HCC in every model. Each needs an applicable configuration, dated evidence/counterevidence and an honest known/unknown impact. | BL-05/07/10/11/12/18 |
| 13 — Deterministic rules plus AI | Visibly separate rule trigger/eligibility/mapping from prepared AI explanation, alternate interpretations and evidence synthesis. Label origins and versions; AI text cannot establish a diagnosis, alter a code, or replace scoring. | BL-05/10/14/16 |
| 14 — Refocused prototype | Keep executive/risk/suspect analytics and aggregate provider views. Keep workflow operations, QA/retrieval execution and agent administration hidden. The quoted reference to member views does not reopen Member analysis: the user's explicit exclusion remains in force, with bounded suspect evidence only. | BL-02/09/10/18 |

Contract attribution, rule qualification and provider comparison must have real fixture-backed definitions. Do not add cosmetic dropdowns, label every suspect member as clinically confirmed, or present descriptive practice differences as causal measures of care quality. The potential-overcapture story supports evidence inspection and coding-risk awareness; it does not claim completed audit readiness or regulatory certification.

## 2. What exists and what needs work

| Capability | Source-inspected baseline | Remaining work |
|---|---|---|
| Scope/navigation | [workflow-flags.ts](../apps/web/src/lib/workflow-flags.ts) hides operational destinations. [demo-app.tsx](../apps/web/src/components/demo-app.tsx) still exposes RAF & model lab; [dashboard.tsx](../apps/web/src/components/dashboard.tsx) still has Executive. | Four primary destinations, six analytic tabs, aggregate RAF route, Reports catalog, legacy route handling. |
| Overview/context | [risk-ui.tsx](../apps/web/src/components/risk-ui.tsx), [risk-client.ts](../apps/web/src/lib/risk-client.ts), and [reporting-period notes](RISK_OVERVIEW_REPORTING_PERIOD.md) contain the recent four-tile/period changes. | Share run/snapshot, filters, stage, as-of and saved context across reports without undoing the Overview changes. |
| Native models and retained runs | [risk_service.py](../apps/api/app/risk_service.py), [risk_inputs.py](../apps/api/app/risk_inputs.py), and [V2 verification](V2_VERIFICATION.md) provide a reusable scoring/provenance foundation. Historical receipts describe eight executable configurations. | Reverify installed assets and actual population coverage. Keep reference checks distinct from cohort execution; retain external-only Medicaid and unavailable V24 boundaries. |
| Population analytics | [risk_analytics.py](../apps/api/app/risk_analytics.py) contains weighted aggregates, score distributions, comparisons and recapture. | Fresh-only defaults, eligible denominators, stable bins, matched exposure, three retained snapshots, consistent metric envelopes. Current stale-inclusive aggregates do not meet the new fresh-only contract. |
| Geography | [risk_analytics.py](../apps/api/app/risk_analytics.py), [risk-geography-ui.tsx](../apps/web/src/components/risk-geography-ui.tsx), and [florida_population.py](../apps/api/app/florida_population.py) provide county/practice intersections and Florida display data. | End-period effective attribution, multi-selects, Unknown/Unassigned, suppression, aggregate-only exports, richer comparisons. Current attribution uses the directory, not effective-dated history. |
| Data inventory | Raw [seed/demo.json](../seed/demo.json) has 10,000 members, 30 practices, 1,500 findings and 11 documents associated with eight member IDs; six counties occur in the raw seed. The startup migration defines 12 Florida counties. | Census the migrated/persisted state separately. Eight document-linked IDs do not establish eight complete source-backed stories. Preserve the six established stories and any later local additions. |
| Suspect planning | [suspect-planning.ts](../apps/web/src/lib/suspect-planning.ts) and [suspect-insights.tsx](../apps/web/src/components/suspect-insights.tsx) provide evidence-based assumptions, bands and concentration charts. | Canonical case aliases, seven business categories, status crosswalk, exact 90-day method, freshness and shared persisted results. Current anchors are .82/.56/.28, not the proposed .80/.50/.20. |
| Scenario calculations | `opportunity_impact` in [risk_analytics.py](../apps/api/app/risk_analytics.py) groups selected findings by member and calculates their combined changes. | Explicit baseline/cohort snapshots, broader canonical candidate compatibility, add/remove/combined aggregate UX, exclusions and saved factor bridges. Reuse full-profile scoring rather than add coefficients. |
| Financials | The current UI has illustrative positive-value planning; [risk_financial.py](../apps/api/app/risk_financial.py) retains separate program methods. | Frozen selection and tie breaks, corrected-baseline increments, signed corrections, complete/partial net, recognition schedules and stage checks. Current UI defaults (.75 reach, .85 realization, $1,100) differ from the requirements. |
| Exports/assistant | Existing CSV/JSON/ZIP and prepared-answer foundations are reusable. [risk_exports.py](../apps/api/app/risk_exports.py) is not yet the specified report bundle. | Shared report snapshots, current-permission checks, full-filter canonical exports, aggregate-only analytics exports and bounded assistant links. Current overview/geography responses contain member arrays; spreading those into downloads violates the new export contract. |
| Release boundaries | [.github/workflows/release.yml](../.github/workflows/release.yml) requires `PERFORM_PLUS_DEPLOY_ENABLED == 'true'` for publishing/deploying. | Preserve this guard. The live GitHub variable and cloud state were not rechecked for this planning task. No release work is part of this backlog's P0. |

## 3. Delivery order

1. **Baseline and contracts:** BL-01 → BL-02/03 → BL-04/05. Resolve counting, context and scope before adding more report calculations.
2. **Canonical data and support assumptions:** BL-06 → BL-07. Establish repeatable examples and retained snapshots.
3. **Core product screens:** BL-08/09/10/11. Build population, geography, suspecting and aggregate RAF experiences on the shared contracts.
4. **Value and explanation:** BL-12/13/14. Reconcile finances, preserve other programs, and bind prepared answers to the visible analysis.
5. **Reports and acceptance:** BL-15 → BL-16/17 → BL-18. Complete exports, desktop inspection, scoped regression and local demonstration evidence.

Visual refinement happens as each screen is built; BL-16 is the final consistency pass. P1/P2 work is not a condition for completing the P0 local demonstration.

## 4. P0 — required for the next demonstration

### BL-01 — Establish a reproducible current baseline

**Trace:** §§1.5, 2, 13–14; B01–B28; D15/D16/D18. **Depends:** none.

- [x] Read the complete requirements and inspect the current scope flags, navigation, risk services, planning code, exports and existing delivery notes.
- [ ] Record the eventual implementation source SHA and working-tree state; preserve unrelated edits and existing local accounts/data.
- [ ] Start/inspect the existing local UI/API/database using the repository instructions; capture the current screen and route inventory without changing infrastructure.
- [ ] Produce an authorized data manifest distinguishing raw seed, applied migrations and persisted state: members, eligibility, counties/practices, source findings/canonical cases, source coverage, configs, runs, stages, dates and method versions.
- [ ] Inventory contract identifiers, enrollment/assignment validity dates and available rule/HCC mappings before promising the new Contract filter or qualified-member breakdown. Record whether each is retained data, needs a synthetic extension, or is unavailable.
- [ ] Refresh B01–B28 with source pointers, runtime evidence, reusable/partial/missing status and explicit unavailable capabilities. Select the actual main-story configuration and demo machine profile.

**Done when:** counts and model/run coverage are reproducible from the current local state, not copied from old screenshots or the requirements author's assumptions.

### BL-02 — Align navigation with the analytics-only product

**Trace:** SCP-01–05, UI-03, §§3.1–3.5. **Depends:** BL-01.

- [ ] Make Overview, Analytics, Suspect Registry and Reports the primary destinations; keep Models/data and Administration as authorized utilities where needed.
- [ ] Use analytic tabs: Risk & conditions, Geography & practices, Suspecting, RAF Intelligence, Financial, AI Impact.
- [ ] Redirect the old Executive entry to Overview and move the visible individual model lab journey to aggregate RAF Intelligence. Preserve eligible APIs/history and protected legacy routes.
- [ ] Remove member-profile and operational links from analytics, assistant answers and empty states; retain only bounded suspect-evidence navigation.
- [ ] Audit visible columns, tooltips, exports and navigation for owners, due dates, assignment tracking, review queues, QA/retrieval operations and agent administration. Preserve retained outcomes as read-only evidence where needed, without exposing execution controls.
- [ ] Preserve the existing Overview tiles, period controls, ordinary blend options and removed sections described in §1.

**Done when:** every core journey stays within aggregate analysis or bounded suspect inspection, with no workflow/member-analysis dependency.

### BL-03 — Share analysis context and metric definitions

**Trace:** §4/M01–M45, DAT-02/03/07, §3.2. **Depends:** BL-01.

- [ ] Define one versioned context for organization/authorization, program/configuration/year, contract, reporting period, retained run/snapshot, score basis/stage, county/practice multi-selects and relevant condition/evidence/direction filters.
- [ ] Apply AND across dimensions and OR within each dimension on the server; preserve context in URLs, back navigation, registry links and saved views. Add filter chips/reset and ignore superseded responses.
- [ ] Define effective contract membership and authorization, including unknown/overlapping assignments. Ensure Contract actually filters eligible exposure and every dependent report/export; show unavailable data honestly until populated.
- [ ] Define qualified members as distinct eligible members satisfying the selected rule's documented qualification criteria in the current context. Distinguish matched, excluded, suspect-bearing and clinically supported members; qualification is not a diagnosis. Keep rule, category and HCC groupings separate and disclose overlap.
- [ ] Define enrolled U, eligible E and fresh-scored S separately, including unknown eligibility. Use eligible member-month exposure or the explicitly versioned fractional-day fallback; union overlapping coverage periods.
- [ ] Implement metric envelopes with definition/version, value, numerator/denominator, unit, weighting, scope/filter hash, as-of/period, run/input/model references, basis/stage, origin, freshness, exclusions and unavailable reasons.
- [ ] Use the dataset manifest clock; apply the proposed 30-day freshness rule and immediate input/model/method invalidation. Exclude stale-only runs from current default means, with explicit last-available mode where useful. Preserve historical snapshot validity.
- [ ] Keep zero distinct from null; specify score/delta/percentage precision and full-precision exports. Make raw/adjusted selection explicit, never a label-only change.

**Done when:** identical context produces identical denominators and values across cards, charts, registry summaries, assistant answers and exports. Tests T01/T02/T14/T15/T25 pass.

### BL-04 — Verify model coverage and score-stage boundaries

**Trace:** RAF-01–03/06–08/10, D14–D16. **Depends:** BL-01/03.

- [ ] Inventory the eight reported native configurations, installed releases/assets/hashes, supported segments, existing reference receipts and actual retained population coverage; rerun relevant validation before claiming current parity.
- [ ] Expose native/imported/reference-only/unavailable coverage in RAF Intelligence and R11. Preserve program-specific score labels and external normalization restrictions.
- [ ] Verify raw-to-adjusted transformations, configuration/source windows and basis meanings. Keep 2027 Initial separate from the later-window forecast and preserve the existing default pending the BL-01 census.
- [ ] Keep the normal 2024/2025 blend option labels/weights, while returning unavailable computation without V24 assets. Do not fabricate a historical comparison or imply that a catalog entry is an executable engine.

**Done when:** configuration availability and population coverage are independently visible; unsupported model/stage combinations cannot silently reuse another program's values. T22/T23 pass.

### BL-05 — Introduce canonical suspect cases and taxonomy

**Trace:** SUS-01/02/04/11, §§7.1–7.3, DAT-04/05. **Depends:** BL-01/03.

- [ ] Add versioned business categories CG (coding gap), RC (recapture), NC (new-condition assessment), SP (specificity/relationship), ST (persistent status), OC (overcapture), DR (data/model representation); keep domain, direction, legacy type and evidence separate.
- [ ] Define stable canonical identity by member, clinical concept, period, episode/status and proposed representation change. Preserve all original finding/rule/source IDs as aliases and retained histories.
- [ ] Merge duplicate signals for the same question, keep distinct same-HCC conditions and different periods distinct, link conflicting add/remove proposals, and retain original-source lineage for copied evidence.
- [ ] Add the status crosswalk to open/resolved/superseded/unknown. Unknown statuses or unresolved category mappings are visible and excluded from assumptions that require a known mapping.
- [ ] Retain rule ID/type/version, qualifying/exclusion signals and model-specific HCC mapping on canonical cases. Several matching rules or HCC mappings must not multiply the distinct case/member total; unmapped cases remain visible.

**Done when:** three duplicate findings produce one case and three aliases; three distinct conditions produce three cases but one affected member. T03/T04/T20 pass; migration is repeatable and non-destructive.

### BL-06 — Implement the versioned 90-day support method

**Trace:** PROB-01–08, §8, D03–D06. **Depends:** BL-05.

- [ ] Introduce `SYN_SUPPORT90_V1`, origin `authored_synthetic_assumption`, labeled **90-day support likelihood**, conditional on review reached within 30 days; retain the prior method for historical results.
- [ ] Apply Strong .80, Moderate .50, Limited .20; one category modifier RC −.10 or NC −.15; clamp .05–.90. Store the authored ±.10 low/high range and Low/Medium/High thresholds .40/.70.
- [ ] Apply source, identity, evidence, disposition and freshness eligibility before arithmetic. Keep Unknown separate from Not applicable; OC/DR and closed cases have no future positive-support probability. Do not treat unknown statuses as open.
- [ ] Persist versioned inputs/t0/method/reasons so later evidence/outcomes cannot leak into an earlier prediction. Use one result for registry, reports, assistant and finance.
- [ ] Count conditional expected support as Σp once per canonical case and reached expected support as Σr×p. Recognition z changes neither; keep evidence strength and likelihood as separate dimensions.

**Done when:** .80/.70/.65/.05/null examples and null-reason behavior reconcile everywhere. T05/T06/T18/T20 pass; the UI does not claim calibration or statistical confidence intervals.

### BL-07 — Fill data gaps with deterministic retained examples

**Trace:** DAT-01/04–06/08, §14. **Depends:** BL-03–06.

- [ ] Prepare three retained, comparable main-story snapshots from deterministic synthetic inputs using the actual native scorer. A monthly series inside one run does not count as three historical snapshots.
- [ ] Preserve all existing IDs, source text, six established source-backed stories, custom accounts, sessions and saved history; add metadata-only examples without inventing chart quotations.
- [ ] Cover all seven categories, probability availability/bands, duplicate aliases, shared-HCC distinct cases, zero/unknown impact, add/remove conflicts, corrections plus additions, and known/unknown evidence states.
- [ ] Add effective-dated geography/practice examples, Unknown/Unassigned, empty and suppressed intersections, stale/failed/unavailable model states, complete/partial finances, restricted sources and saved-report fixtures.
- [ ] Add deterministic, effective-dated synthetic contract membership where BL-01 finds gaps, with overlap/unknown examples and expected cohort totals; preserve existing enrollment and scoring inputs unless a new version explicitly changes them.
- [ ] Author potential-overcapture stories for the six supplied topics: HIV, diabetes with complications, CKD, depression, obesity and cardiovascular conditions. Record the clinical question, applicable model/HCC or unavailable mapping, dated source/counterevidence, limitation and expected scenario behavior. Extend the existing source-backed stories only with retained evidence; label any new metadata-only story as authored.
- [ ] Record generator/migration version, clock, inputs, output counts, model/method hashes and fixture IDs in a manifest. Verify repeatability without resetting the existing database.

**Done when:** the planned journeys have traceable examples and true scorer outputs; missing assets/data remain explicitly unavailable rather than padded to a target count.

### BL-08 — Complete Overview and population reports

**Trace:** POP-01–11, R01–R04; §1 overrides apply. **Depends:** BL-03/04/07.

- [ ] Connect the existing four RAF tiles and population visuals to the shared context and stage; keep detailed coverage/definitions out of Overview.
- [ ] Make Overview the executive risk dashboard with year/model/contract context and reporting-period controls. Explain Current/Projected/Submitted/Accepted in the existing Baseline/Potential scenarios/Submitted set/Accepted set tiles. Projected RAF comes from the declared aggregate scenario on a compatible cohort/stage, not an unlabelled sum of probabilities or illustrative exposure.
- [ ] Use stable MA distribution bins [0,.5), [.5,1), [1,1.5), [1.5,2), [2,3), [3,∞), with linear `(n−1)q` quantiles and program-appropriate alternatives. Show denominators and true missingness.
- [ ] Calculate condition prevalence from eligible members, distinct category burden and capture/correction counts from canonical cases; avoid charts implying overlapping diagnoses sum to 100%.
- [ ] Build persistent-condition member-pair recapture/gap matrices; separate pair and distinct-member counts and avoid automatic acute-condition carryforward.
- [ ] Add comparable-period trends and matched direction counts using equal windows/runout/model/basis/stage and common weights `min(mm_before, mm_after)`; distinguish input change from model change and explain unmatched exclusions.
- [ ] Compose the supporting Overview visuals around RAF trend, RAF distribution, top model-scoped HCC prevalence, geography and assigned-practice breakdowns. Link each to the matching aggregate report with contract and all other filters preserved.

**Done when:** Overview links preserve cohort context, no report contains member rows, and T01/T02/T13/T14 plus cross-report totals reconcile.

### BL-09 — Complete geography and assigned-practice analytics

**Trace:** GEO-01–09, R05. **Depends:** BL-03/07.

- [ ] Use end-period valid member residence and assigned practice, independent of practice location or treating clinician. Retain Unknown and Unassigned buckets in totals and filters.
- [ ] Add county/practice multi-select intersections, ranked aggregate tables, top-N plus Other, and condition/risk aggregate drilldowns.
- [ ] Offer heatmap metrics for risk, prevalence, cases per 1,000 and coverage; add scatterplot with adjusted risk on x, capture-member rate on y, eligible population size and coverage color.
- [ ] Add an aggregate assigned-practice comparison view for RAF trend, HCC prevalence, recapture, suspect concentration and qualified-member rates within the selected contract. Show comparable population sizes/coverage and descriptive limitations; do not reintroduce a provider operations workspace or a member list.
- [ ] Apply k=20 distinct-member and complementary suppression consistently in values, tooltips, ranks and exports; disclose suppression without presenting it as a compliance certification.
- [ ] Remove implicit member-page payloads from analytic downloads and verify authorized, exhaustive group reconciliation before suppression.

**Done when:** T15–T17 pass, empty intersections remain selected, and every graphic identifies its denominator and attribution method.

### BL-10 — Refine suspecting analytics, registry and evidence

**Trace:** SUS-03/05–10/12, R06/R07/R09. **Depends:** BL-05–07.

- [ ] Default to the broad canonical finding population, with a source-backed filter for the complete stories. Show compact finding/ID, question, category/direction, evidence/source, status, likelihood, impact basis/value and updated-date columns; remove owners/assignments.
- [ ] Provide separate Capture potential, Accuracy/corrections and Data representation views. Capture ranking uses band, compatible expected impact, oldest analysis and canonical ID; never mix assumed and calculated impact scales.
- [ ] Rank confirmed correction-pending issues by integrity significance and age without suppressing them for unknown or negative monetary value. Preserve unknown-impact filters and disclosed tie breaks.
- [ ] Add category mix, evidence × likelihood matrix, condition Pareto, availability and correction summaries that reconcile with the full registry filter.
- [ ] Add suspects by rule type and model-scoped HCC alongside category views, with distinct qualified members and eligible denominators. Clicking a segment preserves all context into aggregate details or the bounded registry; explain overlaps instead of displaying an incorrect 100% composition.
- [ ] Complete the bounded evidence panel with authorized dated excerpts, negation/chronology, competing evidence, signal lineage, method and retained recommendation history. Use the specified missing-source message, not invented quotations.
- [ ] Present the supplied overcoding topics in Accuracy/corrections and R09 as potential representation risks with source/counterevidence and known/unknown signed score impact. Avoid diagnosis-by-rule, blanket disease claims and financial ranking that hides integrity issues.
- [ ] Separate a compact deterministic rule trigger/qualification section from prepared AI reasoning and evidence interpretation. Show the existing rule/model and explanation origins/versions; a full browsable rule library remains BL-20/P1.
- [ ] Make Model impact build an analytic scenario only. Support selected/all-filtered canonical export with aliases and method provenance; excerpts require explicit permission and selection.

**Done when:** J02/J04/J05 work without member profiles or workflow actions, the six source-backed stories remain intact, and canonical totals agree across R06/R07/R09 and the registry.

### BL-11 — Replace the visible model lab with aggregate RAF Intelligence

**Trace:** RAF-04/05/09/11, §6.2, R04. **Depends:** BL-04/05/07.

- [ ] Select an authorized cohort, explicit baseline snapshot/basis/stage and compatible canonical candidates; provide add, remove and combined scenario modes without a member editor/list.
- [ ] Extend the existing grouped `opportunity_impact` calculation to the canonical contract. Run full member profiles internally once per joint scenario; preserve hierarchy, interactions, replacements and duplicate neutrality.
- [ ] Keep baseline and scenario member sets/weights aligned; report partial exclusions and unknown impact instead of changing the denominator or inventing coefficients.
- [ ] Save immutable aggregate scenario inputs/results with run/model/method hashes, factor contributions, transformation/residual bridge and separate hypothetical labeling.
- [ ] Retain technical individual scoring off the core journey. Scenario save must not alter coding, review, submitted or accepted state.

**Done when:** exact combined, hierarchy-zero and unknown-impact fixtures pass T09–T11/T23, and saved aggregate outputs reopen reproducibly.

### BL-12 — Reconcile MA financial planning from selection to curve

**Trace:** FIN-01–08/10/11, R08, §9. **Depends:** BL-06/11.

- [ ] Separate calculated adjusted-score scenarios from authored score-equivalent exposure; never substitute one inside the other's totals. Validate stage/method compatibility before calculation.
- [ ] Select one positive candidate per member/program/configuration/payment window by base `p × increment`, then evidence and canonical-ID tie breaks. Freeze winners and exclusion IDs for low/base/high scenarios, condition attribution and exports; a child filter cannot resurrect a losing candidate.
- [ ] For members with corrections and additions, calculate corrected baseline first: `c = corrected − baseline`, `e = corrected-plus-addition − corrected`. Keep exact all-selected scenarios distinct from the one-winner financial approximation.
- [ ] Return gross positive, support-weighted, realized positive, signed corrections and modeled net. Apply r/p/z once to positives; do not probability-discount corrections. Unvalued/conflicting corrections make the total partial or unavailable with reasons.
- [ ] Version the proposed templates: Conservative r=.50/p_low/z=.70, Base .75/p_base/.90, Optimistic .90/p_high/1; common authored $1,000 sensitivity basis, explicit start month and 1–24-month horizon with a 12-month default.
- [ ] Build eligible exposure and recognition schedules, with no recognition before the declared effective time. Unknown future exposure needs a disclosed continuation assumption or unavailable value. Use a separate correction schedule.
- [ ] Render a reconciled gross-to-net waterfall, scenario range and cumulative monthly curve, backed by the same saved calculation/assumption record and full-precision export.

**Done when:** T07 gives $5,400 / $2,160 / $1,944 / −$600 / $1,344; T08 ends at $648; T09–T12/T22/T27 pass. Changing r, z or dollars never changes clinical probability or risk scores.

### BL-13 — Preserve program-specific financial methods

**Trace:** FIN-09, §9.5. **Depends:** BL-04/12.

- [ ] Inventory and document existing Part D, ACA and Medicaid financial implementations and their required inputs, normalization and provenance.
- [ ] Reuse supported methods with a named method version and program-specific explanations; expose score-only results where dollars cannot be calculated.
- [ ] Prevent a generic MA dollar multiplier or cross-program value total when the methods are incompatible. Preserve existing stricter input/freshness checks.

**Done when:** each program has either a reproducible supported method or an explicit unavailable reason; no working retained method is lost in the UI refresh.

### BL-14 — Keep AI Impact honest and Ask Perform+ contextual

**Trace:** AI-01–05, R10, §§11.1–11.2. **Depends:** BL-03/05/06.

- [ ] Verify the frozen evaluation against retained fixture data. The required example distinguishes 108/135 detection precision, 108/120 recall, 853/880 specificity and 105/135 confirmation yield; keep assisted-final/manual metrics and authored timing separate.
- [ ] Preserve the fixture if the document's assumed values differ; resolve and record the discrepancy rather than rewriting data to make a chart pass. Explain why unrelated population filters do not change a frozen evaluation.
- [ ] Bind prepared/replayed assistant answers to the visible report snapshot/filter hash and shared numerical results; handle unavailable answers explicitly.
- [ ] Explain the two-layer story in the evidence panel and demo narrative: deterministic rules identify candidates and govern eligibility; prepared AI reasons over supporting/contradicting evidence. Demonstrate an alternate interpretation or uncertainty without changing deterministic outputs or portraying replayed text as a live model call.
- [ ] Replace hidden member/workflow links with authorized aggregate or bounded suspect links. Keep every required metric reachable without the assistant and require no external inference.

**Done when:** T24/J06 pass, population/workflow activity cannot mutate the evaluation, and assistant values match the visible report.

### BL-15 — Build Reports, saved views and reproducible exports

**Trace:** UI-01/02/04/05, EXP-01–06, R01–R11, §§12–13. **Depends:** BL-08–14.

- [ ] Create a concise catalog with question, preview and saved views for R01 Executive risk summary; R02 Risk distribution & condition burden; R03 Recapture completeness; R04 Period & model comparison; R05 Geography & assigned practices; R06 Suspect opportunity concentration; R07 Support-likelihood planning; R08 Financial scenarios; R09 Accuracy & representation integrity; R10 AI evaluation; R11 Coverage & data reliability.
- [ ] Launch existing report calculations with frozen context; saving records a snapshot/version, while explicit refresh creates a new version. Keep report title, origin, dates and method visible without recreating Overview's removed sections.
- [ ] Implement CSV/JSON/reproducibility ZIP for every P0 report. Include `manifest.json`, `summary.csv`, `aggregates.csv`, `metric_definitions.json`, applicable `assumptions.json`, `exclusions.csv` and `README.md`.
- [ ] Include context/authorization fingerprint, filter hash, run/input/model/method identities, full precision, null reasons and suppression/exclusion counts. Use ISO dates and safe CSV text escaping. Never include secrets or implicit member-population files.
- [ ] Make registry export-all include the entire authorized canonical filter independently of 10/25/50/100 paging; selected export contains only selected permitted IDs. Source excerpts are optional and explicitly authorized.
- [ ] Recheck permissions at saved-view open and export generation/download. If scope shrinks, do not disclose old restricted totals or silently edit saved results; offer an explicit newly authorized snapshot.

**Done when:** T21/T25/T26 pass; reopened and exported reports match their frozen totals and methods, and no unimplemented PDF/PPTX action appears.

### BL-16 — Finish desktop visual consistency and interaction states

**Trace:** VIS-01–10, §12.3. **Depends:** BL-08–15.

- [ ] Standardize shell/container widths, page padding, heading hierarchy, cards, tables, filters, legends and chart colors across all visible screens without redesigning the accepted login page.
- [ ] Use the appropriate chart: distributions with percentile markers, recapture matrices, geography heatmap/scatterplot, suspect Pareto, reconciled financial bridge/range/curve and paired AI comparisons. Do not add decorative graphs without traceable data.
- [ ] Add accessible labels, keyboard operation, focus states, readable non-color-only legends and useful tooltips; retain 10/25/50/100 pagination where tables require it.
- [ ] Complete loading, stale, unavailable, empty, suppressed, partial and retry states. Preserve filters and retained results on failure; show real progress for long calculations/exports.
- [ ] Capture matching before/after screenshots at 1280×720, 1440×900 and 1920×1080 after fonts/data/charts finish rendering. Inspect every core screen and fix clipping, whitespace, unreadable labels and cross-page spacing differences.

**Done when:** the visual acceptance checklist includes rendered evidence at all three desktop sizes, with no empty premature captures, hidden member journeys or misleading unavailable values.

### BL-17 — Verify scope, caching and local performance

**Trace:** NFR-01–10, DAT-09. **Depends:** BL-15/16.

- [ ] Verify direct aggregate/evidence/scenario/export APIs enforce local roles and practice scope; retain explicit superuser access and clinical gates on retained APIs.
- [ ] Include authorization, filters, input/model/method versions and snapshot identity in cache keys. Exercise permission changes, late responses, API failures and unavailable configurations without losing context.
- [ ] Measure repeated warm aggregate/filter and registry-first-page responses on the recorded demo machine: target p95 ≤2s; usable navigation ≤3s after data is ready. Distinguish cold population calculation from warm report interaction.
- [ ] Document working local startup, required database/fixtures/assets, retry/progress behavior and known coverage limits. Keep credentials out of tracked artifacts and preserve the deployment guard.

**Done when:** J07/T25/T26 pass with actual measurements and local role checks; no hosting changes or production-readiness claims are introduced.

### BL-18 — Run the complete local acceptance journey

**Trace:** §15/J01–J07/T01–T28, §19; P1 test exceptions below. **Depends:** BL-17.

- [ ] Rehearse all seven journeys: executive analysis, suspect-to-evidence-to-scenario, finance, integrity corrections, model unavailability, AI evaluation/contextual explanation, and authorization/failure handling.
- [ ] Extend the executive journey through a contract filter, RAF/HCC/geography/practice comparisons and a qualified-member suspect breakdown. Rehearse at least one potential-overcapture story end to end and show deterministic rule output alongside prepared AI interpretation; inspect the remaining authored topics for provenance and model compatibility.
- [ ] Run the P0 golden fixtures and cross-report checks in §6 below, plus relevant existing scoring/provenance/authentication regressions. Record actual results, not checklist self-assertions.
- [ ] Verify no member tables/workflow actions returned, saved scenarios never mutate clinical state, current Overview preferences survive, and all eleven report exports match their snapshots.
- [ ] Save screenshots, fixture IDs, run/context hashes, test receipts, performance results and remaining limitations; update README/handoff to describe the analytics product and local startup.

**Done when:** every applicable P0 criterion has evidence and no unexplained metric/export difference remains. Completing this gate means local demonstration acceptance, not commit, push, cloud deployment or production certification.

## 5. Deferred work

| Ticket | Priority | TODO and acceptance | Dependency |
|---|---|---|---|
| BL-19 | P1 | [ ] Add readable PDF and editable PPTX exports for R01/R08/R10 first, with identical retained totals, assumptions and provenance. | Accepted P0 reports/export contract. |
| BL-20 | P1 | [ ] Add mature observed support cohorts with reach/observation/censoring separation (T19) and read-only rule explanations. Keep empirical rates separate from authored likelihood and retain the specified minimum observed-rate cell size. | Reliable outcome history and canonical cases; no operating work queues. |
| BL-21 | P1 | [ ] Add separately versioned probability overrides, richer financial schedules and method-scoped ACA market sensitivity (T28). | Accepted P0 finance; required method inputs. P0's basic recognition schedule is not deferred. |
| BL-22 | P1 | [ ] Add standardized comparison/reference weights and optional month-based geographic attribution. | Approved strata and exposure data; descriptive and standardized outputs remain distinct. |
| BL-23 | P2 | [ ] Consider validated closure prediction, measured AI productivity and actual payment attribution/reconciliation. | Real outcomes, independent protocols and approved methods; synthetic fixtures cannot establish validation. |
| BL-24 | P2 | [ ] Scope additional engines, including executable historical support, and production integrations/operations separately. | Explicit future approval/assets. No automatic return of workflow/member UI, enterprise SSO, live AI or cloud provisioning. |

## 6. Acceptance traceability

The source document's fixtures are specifications, not existing passing tests. The following groups cover every T01–T28 ID; T19 and T28 are conditional P1 acceptance, not P0 blockers.

| Checks | Required evidence | Work items |
|---|---|---|
| T01–T02 | Member-month mean 1.333333…; 80/100 fresh coverage; stale/missing distinct. | BL-03/08 |
| T03–T04 | Distinct members versus cases; duplicate alias merge counted once. | BL-05/10 |
| T05–T06 | Specified support anchors/bands; Σp=1.5 and Σr×p=1.125; z irrelevant to support. | BL-06 |
| T07–T08 | Five financial totals; $648 six-month schedule; curve endpoint equals monthly sum. | BL-12 |
| T09–T11 | Corrected-baseline joint effect; hierarchy zero; null unknown impact and exclusions. | BL-11/12 |
| T12 | Frozen winner survives scenario ranges and condition filtering. | BL-12 |
| T13–T14 | 3/4 recapture pairs; 80 matched members, excluding 20 current-only without prior zeros. | BL-03/08 |
| T15–T17 | Unknown attribution reconciles; empty intersection ratios unavailable; k=20 and complementary suppression. | BL-09 |
| T18 | Later evidence/outcomes cannot alter earlier t0 inputs. | BL-06/07 |
| T19 — P1 | Six supported of ten mature reached cases; two censored tracked separately. | BL-20 |
| T20 | Corrections, DR and already supported cases outside future-support estimates with reasons. | BL-05/06 |
| T21 | 143 permitted filtered cases export despite a 25-row page; selected export remains selected-only. | BL-10/15 |
| T22–T23 | Raw-to-adjusted method mismatch blocked; absent V24 execution unavailable. | BL-04/11/12 |
| T24 | Frozen precision/recall/yield remain separate and traceable. | BL-14 |
| T25–T26 | Newest request wins; permission loss cannot reveal old restricted totals or exports. | BL-03/15/17 |
| T27 | Unknown relevant correction makes net partial with explicit excluded count. | BL-12 |
| T28 — P1 | ACA own-Q sensitivity changes the market denominator consistently when implemented. | BL-21 |

Also verify R01/R06/registry distinct-member agreement; R06 canonical versus alias counts; R07 applicable/unknown/not-applicable denominators; R05 exhaustive authorized totals before suppression; RAF identical baseline/scenario cohorts; R08 selected/excluded reconciliation and monthly sums; R10 frozen-filter exception; saved-report date/method preservation.

Additional acceptance from the supplied meeting notes:

| Check | Expected behavior | Work items |
|---|---|---|
| MS-01 Contract context | Two fixture contracts with different eligible populations produce different, independently expected aggregates; overlap/unknown assignments follow the declared rule; drilldown, save and export preserve contract and authorization. | BL-01/03/07/08/15 |
| MS-02 Rule qualification | Multiple signals/rules for one clinical question yield one canonical case and one qualified member; exclusions and overlaps remain traceable across category/rule/HCC views. | BL-03/05/10 |
| MS-03 Executive continuity | Current/projected/submitted/accepted meanings match the four preserved tiles; supporting RAF/HCC/geography/practice visuals share the selected period/model/contract. | BL-08/09 |
| MS-04 Potential overcapture | All six requested topics have a documented example or explicit unavailable evidence/mapping; at least one runs from aggregate integrity insight through bounded evidence to a hypothetical signed impact without clinical mutation. | BL-07/10/11/12/18 |
| MS-05 Rules plus AI | Rule IDs/triggers/eligibility and explanation origin are separately inspectable; prepared AI output cannot alter rule qualification, model arithmetic or retained clinical state. | BL-05/10/14 |
| MS-06 Analytics-only UX | No owners, due dates, assignments, review/QA/retrieval operations, agent administration or member-analysis journey in the core UI or its exported report layouts. | BL-02/15/16/18 |

## 7. Plan completion and implementation boundary

- [x] Read the full source requirements and identify conflicts with newer user instructions.
- [x] Compare principal requirements with current source, preserving reusable capabilities and existing uncommitted work.
- [x] Produce prioritized, dependency-ordered TODOs with source requirement IDs and concrete acceptance checks.
- [x] User authorized implementation and permitted in-memory/hardcoded presentation data. Local implementation and verification are recorded in the linked handoff; native-only backlog and deployment remain separate.

The original planning phase changed only documents. The subsequent approved implementation changed application code, added deterministic presentation data and updated the local UI/API containers. Existing clinical data/accounts were preserved. Git publication and remote/cloud deployment were not performed.
