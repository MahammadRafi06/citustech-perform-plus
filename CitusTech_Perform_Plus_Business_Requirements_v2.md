# CitusTech Perform+ — Risk Adjustment Business Requirements

CitusTech Perform+ shall be a risk-adjustment application built around **calculated risk scores, model-specific condition categories, annual recapture, evidence-supported coding, and reconciliation**. Its existing review and operational workflows shall be connected to that calculation foundation. An inactive RAF screen, a single stored score or a nonnumeric illustration does not satisfy the core product requirements.

The application can use synthetic member data and simulated external receiver responses for the executive demo. Its supported risk models must still calculate real, reproducible results from the supplied inputs. Deterministic risk-model calculations and AI-assisted discovery are different capabilities: AI helps identify and explain potential gaps; the applicable risk model determines the score.

**Reading guide:** A defines scope, model families and screens; B contains the new risk requirements; C defines calculations and score bases; D defines the demo and release gate; E maps changes from version 1; F retains existing workflow improvements; G preserves the AI benchmark; H tracks reproduced issues; I covers dependencies; J contains sources.

## A. Product direction and research findings

### A1. What changes in this revision

This is version 2 of the business requirements. It supersedes version 1's scoring scope, nonnumeric fallback, future-only treatment of all additional programs and corresponding release gates. The assessment remains evidence of what the existing build contained; its conservative scope recommendations no longer define the required product.

The supplied assessment reports a working Next.js/FastAPI/PostgreSQL application with member review, suspect registry, campaigns, retrieval, provider follow-up, QA, submission simulation, exports and an illustrative AI Impact comparison. It reports **no functioning numeric scoring engine**. Those existing capabilities shall be improved and reused; working scoring, model management and several RA-specific analyses are new additions. Current branch behavior must be inspected before implementation because this document does not represent a new application audit.

Research references were checked on 13 September 2026. Primary CMS, model-owner and state sources establish model facts. Vendor pages establish publicly described capabilities, not independent performance or evidence that Perform+ already implements them. Requirements below are product recommendations informed by those sources.

| Previous direction | Revised requirement |
|---|---|
| One prepared score, with nonnumeric fallback accepted as complete. | Executable member and population scoring; unavailable mandatory scoring is an incomplete requirement. |
| Most model functionality deferred. | A versioned model registry and working MA, Part D and ACA calculation paths are required for the expanded demo; Medicaid has explicit external-score and licensed-model paths. |
| Overview led by enrollment and task counts. | Overview led by program-specific risk scores, capture/recapture, unresolved opportunities, accuracy corrections and score reconciliation; operational counts remain supporting information. |
| Suspects described primarily by condition, priority and evidence band. | Add model/category mapping, recapture type, input/source basis, actual marginal score effect, hierarchy overlap and recommended intervention. |
| Member review mainly source and decision. | Add a member risk profile and factor ledger that explain why the score exists and how a reviewed change affects it. |
| AI Impact primarily a frozen benchmark. | Preserve that benchmark and add traceable AI-origin findings, independent QA outcomes, calculated score changes and review workload metrics. |
| Six cases are the main actionable population. | Separate a broader scoreable population from the smaller fully prepared clinical-review subset. |

### A2. What established vendors make visible

These sources motivate the required product experience. Exact algorithms, model coverage, performance and contracted services vary by vendor.

| Vendor | Publicly described capability | Requirement adopted for Perform+ |
|---|---|---|
| Innovaccer | Connects claims/clinical/pharmacy data with coding gaps, suspected conditions, RAF accuracy, risk analytics and prospective/retrospective workflows.[^V01] | Connect population risk, evidence gaps, interventions and supported coding in one member story. |
| Cotiviti | DxCG provides member/group risk analytics; Suspect Analytics uses clinical rules, statistical methods and multiple claim types to prioritize incomplete-diagnosis work.[^V02][^V03] | Separate payment models from predictive models; show why an opportunity was generated and how its score impact is calculated. |
| Reveleer | Describes HCC/RAF opportunity views, chase prioritization, source-linked review and risk/project reporting.[^V04] | Put category, score impact and evidence provenance in the suspect and coding workspaces. |
| RAAPID | Describes missed-code and unsupported-code discovery, chart prioritization, source justification and coding/QA support.[^V05] | Demonstrate supported additions, unsupported-code removal and valid zero-effect findings. Accuracy includes downward corrections. |
| Veradigm | Describes current, trending and opportunity risk scores, confidence-adjusted targeting, contract/condition analytics and program-specific financial projections.[^V06] | Make risk scores, recapture, model context and opportunity-to-outcome analytics prominent. |
| Milliman | MARA describes person/cohort risk profiles, current and prospective views, population comparisons and model selection by purpose and inputs.[^V07] | Give every model an explicit purpose, population, timing, data specification and licensing/validation status. |
| Arcadia | Describes risk-score analytics and separate suspected, historical and persistent-condition workflows connected to provider actions.[^V08] | Separate new suspecting from recapture and documented coding gaps; preserve the same case across provider and review handoffs. |

Veradigm also describes risk-aware submission validation and reconciliation. The product implication is to connect diagnosis/category and score impact to encounter errors and downstream stages, rather than display only a submission success count.[^V09] No vendor accuracy or revenue claim becomes a Perform+ target merely because it appears on a product page.

### A3. Model families and applicability

**RAF is not a universal interchangeable score.** Use “CMS-HCC RAF” for the applicable MA view, “RxHCC risk score” for Part D, the specified HHS risk score/PLRS terminology for ACA, and the configured methodology's name for Medicaid. Never average these different scales together or convert them to dollars with one generic multiplier.

CMS publishes model software and diagnosis mappings, including Python downloads for 2026 Midyear/Final and 2027 Initial. These support an executable calculation service; the model package, inputs and result validation remain implementation responsibilities.[^M03][^M04]

| Program / use | Model basis | Product treatment |
|---|---|---|
| MA Part C, ordinary non-PACE/non-ESRD, PY2026 | 2024 CMS-HCC, commonly called V28, fully phased in for this population.[^M01] | Required calculation path with its year/run package, supported segments and normalization/adjustment configuration. |
| MA Part C, ordinary non-PACE/non-ESRD, PY2027 | Final policy retains the 2024 CMS-HCC model; a proposed new Part C model was not finalized.[^M02] | Required separate PY2027 configuration. Initial software availability must not be mislabeled Midyear/Final software. |
| Historical MA comparison | CMS-HCC V24/2020 and V28/2024, with applicable historical year configuration.[^M05] | Required fixed-input model comparison. Historical payment blends belong to their applicable year, not an arbitrary user-selected “current blend.” |
| Medicare ESRD | Separate ESRD model and status/segment handling.[^M04] | Explicit route and supported-status catalog. Never score an ESRD case through ordinary community MA by silently ignoring its status. |
| PACE | Separate applicable configuration; PY2027 final policy uses a 50/50 blend of 2017 and 2024 CMS-HCC model scores.[^M02] | Explicit PACE configuration and validation before activation; do not inherit the ordinary MA blend. |
| Medicare Part D | RxHCC, distinct from Part C CMS-HCC. Annual policy and segment/normalization settings must be pinned.[^M01][^M02] | Working separate RxHCC calculation. Prescription evidence for suspecting does not convert RxHCC into a drug-transaction/PDE score. |
| ACA individual/small-group RA | Applicable HHS-HCC benefit-year models; BY2026 uses V08 with adult, child and infant model families and metal-level variants.[^M06] | Working ACA calculation with its own inputs, factors, aggregation and transfer scenario. Not a relabeled Medicare RAF. |
| Medicaid | State/program/rating-period methodology, including applicable population and benefit configuration. | Required program configuration and validated external-score ingestion; licensed calculation adapter where an applicable model package is obtained. |
| Florida Medicaid | AHCA publishes separate MMA, LTC and dental rate artifacts. Current state-specific grouper version/weights and payment methodology must be established independently.[^M08] | Distinct program/rating-period configuration. Do not assert one universal Florida RAF or automatically apply Medicare HCCs. |
| Commercial outside ACA; population health | Contract- or use-specific methods, including proprietary predictive families such as DxCG or MARA.[^V02][^V07] | Catalog as optional licensed analytics. Do not label a cost prediction as a statutory ACA transfer score or CMS payment RAF. |

The required package inventory shall name the executable assets, not just a generic model family: **CMS-HCC V28 for PY2026 and PY2027**, a **historical V24/V28 comparison configuration**, **PY2027 RxHCC with MA-PD/PDP profiles**, and **HHS-HCC V08 for ACA BY2026**. MA segment coverage shall explicitly include community aged/disabled and dual-status variants, institutional and supported new-enrollee routes. “New to this plan” shall not itself select a Medicare new-enrollee model. ACA coverage shall include adult, child and infant cases and the declared supported metal variants. Additional segment/year coverage shall have its own validation status.[^M11]

The CDPS model owner identifies Florida in an undated CDPS+Rx state-use survey and publishes current licensed model information. That supports evaluating CDPS+Rx, but does not establish the exact current AHCA payment implementation. A configured Florida calculation must identify its applicable state/actuarial basis; a generic CDPS+Rx demonstration must be labeled as such.[^M09]

### A4. Required delivery scope

| Delivery tier | Mandatory capabilities | Completion rule |
|---|---|---|
| **Core RA foundation** | Versioned registry; input validation; executable MA scoring; member factor ledger; population scoring; HCC/recapture work; full-member scenarios; score-aware suspecting; existing review/QA/submission linkage. | A working score changes correctly when eligible input changes and reconciles to a traceable run. No static-score or nonnumeric substitute. |
| **Expanded multi-program demo — target of this BRD** | Core foundation plus working RxHCC and ACA BY2026 paths, historical MA comparison, program-specific analytics and a Medicaid configuration/external-score journey. | Each required calculated family has separate inputs and reference-match tests. Imported Medicaid results retain their external origin. |
| **Additional configured coverage** | ESRD/PACE calculation routes, additional model years/segments, licensed Medicaid grouper, further state contracts and optional commercial predictive models. | Activate only after that configuration's inputs, license where relevant and independent reference validation are complete. These are scoped backlog items, not claims of current support. |
| **Later operational integrations** | Live EHR/retrieval/receiver integrations, broad production scale, actual financial settlement and independently measured clinical/AI outcomes. | Separate operational release; absence does not excuse a missing required demo calculation. |

Build MA first because it reuses the existing cases, then add the distinct required model paths. A release completing only MA can be described as the core RA increment; it does not satisfy the expanded multi-program demo gate.

### A5. Product screens and visible RA identity

The screen names below are business/navigation proposals. Reuse existing routes and components where practical. The main workspace should communicate risk adjustment immediately through its content and tasks, not through decorative HCC badges or unexplained score tiles.

| Screen | Existing basis | Required visible content and interactions | Change |
|---|---|---|---|
| **Risk overview** | Program overview | Active program/model/year/run; captured and QA-supported score basis; comparable prior score; recapture rate; unresolved score opportunity and accuracy exposure; stage bridge; top work requiring action. Every aggregate drills to its members. | ENH |
| **Members & risk profiles** | Member 360 | Member's model/segment, score states, demographic/category/interaction breakdown, prior/current category inventory, evidence and score history. | ENH |
| **AI suspecting & recapture** | Suspect registry | Separate recapture, documented coding gap, new clinical suspect, unsupported-code correction and submission gap views; model/category, evidence, marginal score effect and next action. | ENH |
| **Coding & QA** | Chart review and QA | Exact source alongside proposed code and category; current versus proposed full-member score; retained/suppressed categories; reasoned disposition and independent QA. | ENH |
| **Provider programs** | Campaigns/provider portfolio | Category/recapture work by practice; appropriate visit/query/chase intervention; cohort-level recalculated opportunity; reachable owners and correct completion. | ENH |
| **Chart retrieval & intake** | Existing retrieval/intake | Source receipt/usability and match checks, relevant program/source metadata, unresolved categories and return to review. | ENH |
| **RAF & model lab** | Risk Scenarios | Live input-driven calculation; baseline/scenario comparison; model/year comparison; full factor ledger; version/run details; member/cohort execution. | ENH screen + NEW calculation capability |
| **Submissions & score reconciliation** | Submission simulator | Code/category, approved decision, intended operation, attempts, receiver stages and their calculated versus reported score basis. | ENH |
| **Risk analytics** | Analytics tabs | Score movement, recapture, condition prevalence, opportunities, model transitions, provider/campaign performance, source gaps and score-stage reconciliation. | ENH |
| **AI impact** | Existing AI Impact | Separate illustrative detection benchmark, observed demo workflow activity, QA-supported AI-origin findings and calculated score effects. | ENH |
| **Models & data** | Existing Data operations/admin where available | Model inventory, configuration/validation status, mappings/coefficients provenance, required inputs, scoring coverage and data-quality exceptions. | NEW subcapability; reuse shell |

**Default desktop composition:** show the program/model/run selector and a concise row of risk measures; beneath it, place a score-stage bridge or risk trend beside an actionable recapture/opportunity table. Keep operational work counts beneath the risk context. On member review, show source and code/category/score explanation together, with the decision and QA status visible. Detailed assumptions belong in a nearby inspectable panel, not repeated paragraphs on every screen.

Use a consistent score precision and explicit units. A percentage change in RAF, an absolute score-point difference, a count of HCCs and a monetary estimate require different labels. An executive must be able to see whether a value is calculated, hypothetical, imported or externally simulated without reading a developer explanation.

## B. New and enhanced risk-adjustment requirements

Labels: **NEW** adds an absent subcapability; **ENH** extends existing behavior; **FIX** corrects a reported defect; **KEEP** preserves existing behavior; **VERIFY** is an evidence/configuration gate. All `RA-xx.xx` requirements are required for the expanded demo unless marked **Additional coverage** or **Later**. Existing `BR-xx.xx` workflow requirements are retained in Part F with explicit amendments.

**Applicability rule:** Executable factor ledgers, diagnosis-level marginal recalculation, hypothetical diagnosis scenarios and reference-execution tests apply to locally executable model configurations. In external-score-only Medicaid mode, retain the feed producer/model/period, declared input coverage, supplied components and validation results under RA-14.04/14.08; do not invent unavailable components, diagnosis deltas or local execution. Cohort aggregation and financial sensitivity may run only when their stated inputs and method are available. This rule qualifies general references to “each opportunity,” “every score” and “each model configuration” below.

### B1. Model registry and program configuration

- **RA-01.01 — NEW:** Maintain a versioned model registry containing program/purpose, jurisdiction, model family/release, payment or benefit/rating year, run/software release, eligible population/segments, supported input specification, effective dates, mapping/coefficient/hierarchy/interaction assets, applicable adjustment settings, source/license and validation status.
- **RA-01.02 — NEW:** Distinguish **available**, **installed**, **validated for the declared scope**, **active**, **external-score only**, **awaiting methodology/license**, and **retired** configurations. A displayed model name alone shall not indicate functioning support.
- **RA-01.03 — NEW:** Resolve the appropriate configuration using member enrollment/program, period and eligibility attributes. Where the reference program returns several segment scores, select the applicable segment from eligibility; never select the highest result to maximize RAF.
- **RA-01.04 — NEW:** Separate model vintage, payment/benefit year, diagnosis/service period and software run. A V28 model used in PY2026 and PY2027 shall have distinct applicable configuration records even where part of the model logic is unchanged.
- **RA-01.05 — NEW:** Activating a new pack shall preserve previous configurations and calculation runs. Historical outputs shall remain reproducible. A model refresh shall create a new version and a comparison result rather than silently rewrite prior scores.
- **RA-01.06 — NEW:** The model steward shall inspect supported scope, source assets, validation results and differences before activation. Required but unvalidated packs remain incomplete; an “unavailable” state is correct handling, not successful delivery.

**AT-01:** Activate two different validated configurations and calculate the same eligible fixed input set. Each result identifies the actual executed pack. Missing or conflicting routing attributes produce a correctable exception, not an arbitrary segment selection. An earlier run can be reopened unchanged after a new pack is activated.

### B2. Scoring inputs and data readiness

- **RA-02.01 — NEW:** Build scoreable member-period input sets using enrollment, model-required demographics/status, diagnosis/service records and other model-required inputs. Preserve member ID, program/contract, coverage months, source version, code system/release, service dates, claim/encounter identifiers and replacement/void relationships where supplied.
- **RA-02.02 — NEW:** For Medicare, support required age/sex and effective-dated member-month eligibility inputs such as dual/Medicaid status, disability/original-entitlement, institutional/new-enrollee and applicable ESRD/PACE information according to the chosen pack. For ACA, collect age, sex, metal level, plan/CSR variant, enrollment segments/duration, diagnosis and applicable prescription/affiliated-cost-factor inputs. Do not invent a common minimum field list that silently discards program-specific requirements.
- **RA-02.03 — NEW:** Validate accepted scoring inputs for the selected model's date window, code validity, segment eligibility, required fields, duplicate records and applicable source/encounter eligibility. A missing required value shall not be silently replaced with the lowest-risk or highest-risk default.
- **RA-02.04 — NEW:** Give each excluded or unresolved record a reason such as invalid code for service date, outside selected run, unmatched member, missing segment input, duplicate/superseded record or unsuitable source. Preserve the original source; do not delete inconvenient inputs from the audit trail.
- **RA-02.05 — ENH:** Separate **score-ready** from **review-ready**. Extend the synthetic dataset with complete scoring inputs for the declared population while keeping a smaller catalog of full source-review stories. A member may be score-ready without having a prepared interactive chart review.
- **RA-02.06 — NEW:** Report population coverage: enrolled members/member-months, eligible inputs, successfully scored, excluded and failed/unresolved. Unscorable members shall not receive fabricated zero scores or disappear from denominator reconciliation.
- **RA-02.07 — ENH:** The selected run's date window shall control eligibility. The existing August 2026 encounter, for example, shall not be presented as part of an earlier initial-run window simply because the payment year matches. A later-run forecast using currently available software shall be identified as a forecast with explicit data/software assumptions.

- **RA-02.08 — NEW:** Implement the supported program/year's source-eligibility profile separately from code-to-category mapping. For PY2027 Medicare this includes the applicable audio-only encounter and unlinked chart-review rules and exceptions from final instructions; retain needed encounter/modifier/linkage metadata. A signature or successful mapping alone does not establish eligibility. Unresolved required source metadata shall remain an eligibility exception.[^M02]

**AT-02:** Load a valid member, a demographic-only member, a duplicate diagnosis, an out-of-period diagnosis, an invalid code and a member missing required eligibility. The correct valid set is scored, excluded/failed records retain reasons, and population counts reconcile. A review-unprepared but score-ready member can be scored without enabling unsupported clinical review actions.

### B3. Executable deterministic scoring

- **RA-03.01 — NEW:** Execute the official model software or a separately validated equivalent against the selected input set. Use CMS's published Python assets where appropriate to the existing FastAPI/Python stack, subject to their scope and validation. Hand-authored UI totals do not satisfy the requirement.[^M03][^M04]
- **RA-03.02 — NEW:** Apply the selected pack's code mapping, eligibility edits, demographic logic, condition hierarchy, interactions and other components. Duplicate codes or repeated evidence for the same condition shall not inflate the model output.
- **RA-03.03 — NEW:** Expose raw model output separately from normalization, coding-pattern adjustment, blending or other applicable payment transformations. Apply each transformation only where required for the selected program/segment/year and record its factor, order and source. Do not normalize or adjust a result twice.
- **RA-03.04 — NEW:** Support single-member calculation, cohort/batch calculation and recalculation after a relevant approved input or configuration change. Identical input snapshot and model version shall produce the same result; cache reuse must retain that provenance.
- **RA-03.05 — NEW:** Store the calculation-run ID, input snapshot, executed model/configuration, selected segment, output components, exclusions and raw/adjusted outputs. Apply the package's specified intermediate/output rounding and record that precision; preserve higher-precision components where available. Display rounding shall not replace the authoritative model's rounding rules or introduce additional payment adjustments.
- **RA-03.06 — NEW:** Return explicit success, partially scored batch or failed/unavailable states. Missing coefficients, inconsistent assets or execution errors shall not cause the UI to reuse an unrelated score. Run errors shall identify the correctable issue without overwriting the last valid historical result.
- **RA-03.07 — NEW:** The same backend calculation service shall power member profiles, scenarios, opportunity deltas, campaign estimates and analytics. Independent front-end formulas or manually synchronized RAF cards are not acceptable.

**AT-03:** For each required configured family, match independent reference output at its defined precision, including identical package-prescribed rounding. The inspected V28 Python package rounds its canonical scores to three decimals; do not demand invented unrounded official output. Where independent unrounded components/totals are available, use a maximum absolute difference of `0.000001` unless their specified precision requires a documented alternative. Do not use a blanket coarse tolerance to hide errors. Verify segment, mappings and components as well as totals; check duplicate neutrality, demographic-only scoring and repeatability.[^M12]

### B4. Member risk profile and category ledger

- **RA-04.01 — ENH:** Add a risk summary to Member 360 showing model/year/run/segment, selected score basis, raw and applicable adjusted score, comparable prior value, data maturity and last calculation. Distinguish current, prior, hypothetical and external results.
- **RA-04.02 — NEW:** Provide a category ledger containing diagnosis/code, applicable HCC/RxHCC/HHS or configured Medicaid category, description, source, current/historical state, hierarchy-retained/suppressed status, model contribution and workflow disposition. Preserve excluded and zero-effect conditions with an explanation.
- **RA-04.03 — NEW:** Provide a factor breakdown for demographics, retained condition terms, interactions and other applicable components, followed by the transformation bridge to adjusted output. Totals shall reconcile to the stored calculation. Do not treat every model as a simple sum of HCC weights when its rules differ.
- **RA-04.04 — ENH:** Link ledger rows to exact source passages or claim/encounter records and the related opportunity, review, QA and submission records. A valid mapped code need not have a positive marginal contribution if hierarchy or other rules already capture its effect.
- **RA-04.05 — ENH:** Display score change after a relevant saved state transition and allow the reviewer to inspect the previous snapshot. A new AI suggestion alone shall not change the confirmed/QA-supported input set.
- **RA-04.06 — NEW:** Provide a searchable ICD-10-to-category explorer within Models & data or the model lab. A user shall select program/model/year, search a code or clinical description and inspect the actual mapping, category description, applicable segment coefficients, hierarchy relationships and version differences. Show no mapping or no score contribution honestly; selecting a search result shall not establish a clinical diagnosis.

**AT-04:** Select a member with demographics, at least two related conditions and an applicable interaction. Its ledger explains retained, suppressed and interaction terms, reconciles to the score and opens the correct sources. A duplicate or suppressed candidate displays zero marginal change where the model so determines.

### B5. Full-member scenarios and model comparison

- **RA-05.01 — ENH:** Replace the existing unavailable/precomputed-only Risk Scenarios experience with an input-driven baseline and scenario calculator. Users shall add/remove eligible diagnoses, choose a supported comparison model or inspect eligible segment changes in a clearly named scenario.
- **RA-05.02 — NEW:** Recompute the complete member under each scenario. Show baseline score, scenario score and absolute difference, with component-level reasons including mappings, suppression, interactions and applicable adjustments.
- **RA-05.03 — NEW:** For combined opportunities, calculate the union of the selected member inputs once. Do not sum standalone marginal HCC opportunities; overlapping categories and interactions make those values non-additive.
- **RA-05.04 — NEW:** Offer separate comparison modes: **same inputs, different model/configuration**; **same model, different coding inputs**; and **actual prior/current population**. Raw outputs from different denominator years shall be labeled as raw model comparisons. A comparable adjusted-impact view shall use an explicitly common, reviewed normalization/payment basis; do not invent an official PY2027 V24 adjustment. Actual prior/current movement shall identify enrollment, demographic, coding, eligibility and model changes rather than attribute all movement to the model.
- **RA-05.05 — NEW:** For historical V24/V28 comparison, identify each package/mapping basis and the common service-code input subset. Codes not valid in a comparison pack shall be shown with reasons. A historical comparison is not a claim that an old model is the current payment methodology.
- **RA-05.06 — ENH:** Saving a hypothetical scenario shall not change clinical records, approved codes, submitted records or reported scores. Users may create a linked review task from a scenario; normal evidence and QA prerequisites still apply.

**AT-05:** Demonstrate a positive supported addition, a hierarchy-suppressed zero effect, an unsupported-code removal with its actual model effect, and a combined-condition interaction. Compare fixed inputs across supported models and explain the difference. Change input order and confirm stable combined totals. No nonnumeric fallback satisfies this test.

### B6. Annual recapture and condition management

- **RA-06.01 — NEW:** Derive a prior-period condition/category inventory and compare it with current-period eligible evidence/coding. Create explicit recapture work for appropriate persistent conditions that lack current support; do not automatically carry historical diagnoses into current scoring.
- **RA-06.02 — ENH:** Distinguish recaptured, assessment due, documentation pending, coded/pending downstream processing, assessed not current, superseded by a related category, ineligible and unresolved states. Keep the definition of “recaptured” visible; internal clinical recapture and receiver-eligible recapture are separate milestones.
- **RA-06.03 — NEW:** Evaluate prior/current category comparability with the selected model releases. Do not compare category numbers from different model families or years as if their clinical meaning and coefficients were identical. Show mapping-change and noncomparable exclusions.
- **RA-06.04 — NEW:** Calculate clinical recapture and receiver-stage recapture rates using defined eligible member-condition pairs, with explicit period, exclusions and evidence stage. Show numerator/denominator and drilldown; duplicate documents shall not create extra recaptures.
- **RA-06.05 — ENH:** Add provider and campaign recapture views with upcoming visit context where available, source readiness and suggested intervention. A justified not-current condition is a valid resolution and shall not be disguised as a failed effort to raise RAF.

**AT-06:** A prior-year condition appears as assessment due without increasing current supported RAF. A qualifying current source and approved disposition advance the appropriate recapture stage. A model mapping change, duplicate note and justified not-current outcome each produce the correct denominator and state behavior.

### B7. Model-aware AI suspecting and prioritization

- **RA-07.01 — ENH:** Add separate views for **annual recapture**, **documented coding gap**, **new clinical suspect**, **unsupported existing code/correction**, and **submission/eligibility gap**. Preserve evidence distinctions and identify the actual input/source that generated each finding.
- **RA-07.02 — ENH:** Each opportunity shall show member, condition and proposed category under a named model, period, opportunity type, evidence source/passages, missing confirmation, baseline score-run ID, hypothetical marginal score effect, current status, next action and owner.
- **RA-07.03 — NEW:** Calculate opportunity impact through the full-member scorer: compare the named baseline with the candidate input set. Label the result “If supported” or equivalent until evidence/review requirements are met. Recalculate when another confirmed condition makes the opportunity redundant.
- **RA-07.04 — ENH:** Deduplicate or group opportunities for the same member/category/evidence episode and identify hierarchy overlap. A finding may remain clinically relevant with zero score effect; do not manufacture positive RAF to justify keeping it in the worklist.
- **RA-07.05 — ENH:** Provide named sorting modes for operational priority, recapture urgency, calculated marginal score effect and accuracy correction exposure. Consider source readiness, due date, visit timing, duplication and eligible owner access. Display the main ranking reasons.
- **RA-07.06 — ENH:** Keep predictive confidence, evidence strength and operational priority as separate fields. Use a numeric probability only when it has an identified model/evaluation or explicitly authored scenario basis. A “Strong” evidence label is not automatically a 90% diagnostic probability.
- **RA-07.07 — NEW:** If expected opportunity is shown, identify its assumptions. Compute a joint full-member scenario expectation or a declared approximation; never sum overlapping probability-weighted standalone HCC weights and label the result confirmed RAF. Suppress unsupported financial or confidence claims.

**AT-07:** The registry contains all five finding types. A candidate's score effect matches the model lab for the same inputs. A confirmed higher category changes a related opportunity's marginal value appropriately. Ranking is reproducible, exposes its basis and never creates inaccessible assignments or automatic coding.

### B8. AI evidence, reasoning and human decisions

- **RA-08.01 — ENH:** Extend the existing assistant to explain a suspect, recapture need, category mapping, score change and next permitted action using the case's current sources and deterministic calculation output. The assistant shall not invent coefficients or calculate authoritative RAF through generated prose.
- **RA-08.02 — NEW:** Define an AI service interface for a bounded read-only extraction, evidence classification or explanation task, with input/member scope, model/version, exact output citations and no-result handling. The expanded demo shall include a validated example of this capability; an offline replay of retained output must be visibly identified as replay, not live inference.
- **RA-08.03 — ENH:** Treat current, historical, negated, uncertain, family-history and contradictory references distinctly in the supported examples. A laboratory value or medication may motivate assessment; it shall not automatically establish a diagnosis or be promoted into approved scoring input.
- **RA-08.04 — ENH:** Preserve human disposition and independent QA. AI may propose a code/clarification or produce a source summary; it shall not sign a clinical statement, pass QA, publish unsupported documentation or authorize external submission.
- **RA-08.05 — ENH:** After new evidence, retain the earlier finding, citations, rule/model version and score-run basis. Refresh the current explanation and hypothetical effect without rewriting earlier approved or reported history.
- **RA-08.06 — NEW:** Check returned source/member IDs and citation spans against the authorized input records outside the AI model. Document content shall not grant tools or override instructions, scope or clinical/QA prerequisites. Missing support shall produce abstention and a useful next action.

**AT-08:** For the prepared cases, every substantive claim has a correct passage or explicit missing-evidence statement. Contradictory evidence changes the explanation; indirect signals do not become diagnoses. An out-of-scope citation is rejected. Live/replayed AI output and deterministic scoring are visibly distinct.

### B9. Risk-aware campaigns and provider work

- **RA-09.01 — ENH:** Campaign preview shall show intervention, eligible member/condition count, recapture count, evidence readiness, deduplicated full-member scenario impact, effort/capacity assumptions if provided and reachable owners. Identify whether the impact is hypothetical or already supported.
- **RA-09.02 — ENH:** Recompute cohort opportunity after grouping conditions by member; do not sum duplicated standalone worklist deltas. Show member-level score-point totals separately from a member-month-weighted portfolio score difference.
- **RA-09.03 — ENH:** Provider views shall display recapture, unresolved categories, evidence/query tasks and supported coding outcomes for that provider's permitted practice. Explain attribution and shared-member handling; avoid counting the same case under multiple providers in organization totals.
- **RA-09.04 — FIX:** Preserve the existing reachable-assignment and QA-based completion corrections. A completed response task, completed chart retrieval, completed coding review and eligible submitted diagnosis shall remain separate milestones in campaign analytics.
- **RA-09.05 — ENH:** Forecast campaign yield only with explicit support/completion assumptions or observed history of suitable scope. A selected cohort is not a guaranteed financial or RAF outcome.

**AT-09:** Two opportunities affecting the same member are aggregated through one combined calculation. Activation creates the exact permitted work, QA controls coding completion and provider totals reconcile after removing duplicate attribution.

### B10. Risk analytics and score-led overview

- **RA-10.01 — ENH:** Replace generic overview emphasis with program-specific calculated score measures: selected current score basis, comparable prior score, QA-supported changes, unresolved opportunity scenario, recapture and correction exposure. Keep counts of enrolled members and tasks as supporting context.
- **RA-10.02 — NEW:** Provide member/cohort score distribution, period trends, category prevalence, recapture, new versus historical suspects, supported additions/removals and score movement. Filters shall include program, model, year/run, contract/cohort, provider, source and score basis where applicable.
- **RA-10.03 — NEW:** Compute population aggregates using the selected program's defined weights and valid inputs. For an internal comparable MA portfolio view, use eligible member-month weighting and label it as the application's portfolio measure; do not call it an official payment aggregate without matching the official basis.
- **RA-10.04 — NEW:** Show raw change separately from changes caused by population mix, demographic/segment changes, code updates, model changes, submission eligibility and corrections. Attribution shall use a declared ordering/method and reconcile; nonlinear interaction effects shall be shown as shared/residual rather than allocated twice.
- **RA-10.05 — ENH:** Every risk metric shall expose definition, unit, input/run scope, numerator/denominator or weighting and drilldown. Compare like program/model/basis unless the view explicitly performs a model comparison.
- **RA-10.06 — ENH:** Unscored/failed or stale members shall be visible in completeness measures. A stale portfolio aggregate shall not be presented as updated simply because a chart animation refreshed.
- **RA-10.07 — NEW:** Add a model-change view showing the same eligible cohort under both packs, distribution of changes, largest drivers and members requiring review. Preserve true negative changes and zero changes.

**AT-10:** Portfolio totals reconcile to underlying member runs and declared weights. A code removal can reduce score while improving coding accuracy. A pure model comparison holds inputs fixed; a real period trend shows other causes. Filtering to the contributing members reproduces each headline measure.

### B11. Score stages, submissions and reconciliation

- **RA-11.01 — NEW:** Maintain separate input/score snapshots for captured baseline, QA-supported changes, submitted diagnoses, receiver-accepted diagnoses, receiver-eligible diagnoses and external reported results where available. Hypothetical opportunity is a separate branch, not the final step of an automatic pipeline.
- **RA-11.02 — ENH:** The existing review-to-submission link shall identify the source, code/category, decision/QA version and intended operation. Recompute only the stage whose underlying input set changes; QA approval alone shall not change a submitted or externally reported value.
- **RA-11.03 — NEW:** Distinguish a locally calculated score from an imported official/report value. A receipt or encounter acceptance is not itself a risk score. If an external report lacks a comparable member score, show diagnosis/category reconciliation without fabricating a score.
- **RA-11.04 — ENH:** Reconciliation shall show missing diagnoses, rejected/accepted-but-not-eligible records, period/model mismatches, superseded records and unresolved discrepancies with an owner and next action. Match the same member and relevant record version.
- **RA-11.05 — ENH:** Preserve original, rejected and corrected attempts and explicit addition/deletion operations. Approved deletion removes the intended input from the appropriate scenario/stage, then recomputes the member; the score effect is whatever the model produces, including zero.
- **RA-11.06 — NEW:** Provide a risk-score bridge with underlying input sets and explanation of changes between comparable stages. Use explicit prepared receiver/report fixtures for demo stages and retain their simulation basis; actual payment reconciliation remains separate.

- **RA-11.07 — NEW:** Each stage calculation shall use the complete known qualifying member-period input set, including applicable existing baseline/external diagnoses, not only new rows created in the demo submission queue. Flag incomplete source coverage. Deleting one diagnosis occurrence shall not remove a category still supported by another qualifying occurrence; recompute from the surviving input set.

**AT-11:** A QA-approved addition changes the supported scenario but leaves submitted/reported snapshots unchanged until their own events. A rejected addition retry stays an addition. An accepted-but-ineligible diagnosis is explainable. A prepared external report is labeled imported/simulated and reconciles to its own stated basis.

### B12. AI impact tied to RA outcomes

- **RA-12.01 — ENH:** Preserve the existing synthetic precision/recall and illustrative time benchmark as a labeled reference comparison. Add separate operational evidence for AI-origin/replay-origin findings, user exposure, source inspection, decision, independent QA and downstream status.
- **RA-12.02 — NEW:** Link each evaluated finding to its source, AI/rule run, opportunity, baseline score run and final human disposition. Do not attribute a preexisting code, a purely manual finding or a model-year change to AI discovery.
- **RA-12.03 — NEW:** Report QA-supported additions, corrections/removals, no-positive dispositions, false-positive burden where independently labeled and model-calculated score effect. Show positive, negative and zero changes. “AI-assisted supported RAF change in synthetic cases” is different from measured real-world AI uplift.
- **RA-12.04 — NEW:** For score attribution, compare full-member input sets with and without the approved AI-origin changes under the same pack and period. Group overlapping findings and use a declared sequential or joint allocation method; label noncausal contribution appropriately.
- **RA-12.05 — ENH:** Keep detection precision/recall, reviewer confirmation, final QA correctness, active review time, score contribution and financial scenario as separate measures. Timing claims require actual interval instrumentation; otherwise retain the existing explicitly illustrative comparison.
- **RA-12.06 — ENH:** Provide traceable explanations and drilldowns from each impact measure to the contributing cases. Live, replayed, rules-based and manual origins shall remain distinguishable rather than all being called AI.

**AT-12:** Review an AI-origin candidate, a manual candidate and an unsupported AI suggestion. The case counts and approved score effects are attributed to the correct origin, with no double counting of overlapping categories. The frozen benchmark remains unchanged and no synthetic demonstration is described as a causal outcome study.

### B13. Program-specific financial scenarios

- **RA-13.01 — ENH:** Extend the existing financial/risk scenario area with explicitly assumption-driven financial estimates. Keep model-calculated score change, projected financial effect and externally reconciled payment as separate outputs.
- **RA-13.02 — NEW:** An MA scenario shall identify applicable payment basis, eligible months, selected raw/adjusted score basis, applicable adjustments and any missing payment inputs. A simplified sensitivity calculation may be offered with its assumptions, but not described as a CMS payment reproduction.
- **RA-13.03 — NEW:** An ACA scenario shall use the applicable benefit-year/state-market risk pool, plan liability scores, enrollment shares/member months, induced-demand/actuarial-value/allowable-rating/geographic-cost terms where applicable, state-market premium basis and year-specific adjustments. Separate high-cost pool amounts, fees and validation adjustments where configured. A member's score does not translate to a fixed dollar amount per RAF point; show sensitivity to missing/estimated market information.[^M06][^M13]
- **RA-13.04 — NEW:** A Medicaid scenario shall identify state/program, rating period, rate cell, population, normalization/relative-score method and capitation assumptions. Licensed grouper output alone shall not be labeled the final payment adjustment.
- **RA-13.05 — ENH:** Include the financial effect of justified corrections and uncertainty. Forecasts shall not encourage unsupported coding, and an unavailable required assumption shall produce an incomplete estimate rather than an invented revenue tile.

**AT-13:** The same score-point difference is not automatically assigned the same dollar value across MA, ACA and Medicaid. A missing financial basis prevents a payment claim while preserving the valid score calculation. Changing a scenario assumption changes only that scenario, not stored official/imported results.

### B14. Part D, ACA and Medicaid-specific behavior

- **RA-14.01 — NEW:** Implement a separate validated PY2027 RxHCC path with the applicable MA-PD/PDP continuing-enrollee and supported new-enrollee profiles, including their distinct normalization/configuration. Keep Part C and Part D outputs separate for the same member. Pharmacy transactions may inform analysis but shall not be confused with PDE reconciliation or automatically establish diagnosis inputs.
- **RA-14.02 — NEW:** Implement the ACA BY2026 official workflow using its own adult (21+), child (2–20) and infant (0–1) routing at the model-defined age reference, plus supported metal/CSR configurations. Include applicable adult prescription and duration terms, infant maturity/severity logic, relevant interactions and BY2026 affiliated-cost-factor logic. Use the package's defined eligibility and scoring rules.[^M06][^M07]
- **RA-14.03 — NEW:** For ACA, retain enrollee-level outputs and the defined enrollment-weighted plan aggregate. Distinguish raw category output, calculated plan-liability risk measures, predicted transfer scenarios and actual transfer reports. Preserve raw enrollment, medical, pharmacy and supplemental submission inventory separately from analytical DIY eligibility filters; neither HCC-positive filtering nor other DIY scoring filters shall remove the operational submission inventory. The DIY calculator is not a complete EDGE validation/submission system.
- **RA-14.04 — NEW:** Provide Medicaid configuration and ingestion of independently calculated risk scores with member/period, grouper/version, population, score type, normalization basis, source and calculation time. Validate cohort match, missing/duplicate members and period compatibility. Imported values shall be labeled external scores, not locally calculated RAF.
- **RA-14.05 — NEW, Additional coverage:** Integrate a licensed Medicaid grouper where selected and available, such as CDPS+Rx, through the common calculation interface. Select relevant prospective/concurrent and population/benefit configuration from the approved methodology. Licensing or unavailable contract-specific weights shall remain a visible dependency, not be approximated by MA factors.[^M09]
- **RA-14.06 — NEW:** For Florida, require explicit MMA/LTC/dental program and rating-period selection. Before activating a state-payment-reproducing calculation, retain the applicable AHCA/actuarial methodology and model/weight/normalization basis. A generic licensed-model run or synthetic external-score example remains usable when accurately named; it does not prove state payment conformance.[^M08][^M10]
- **RA-14.07 — NEW, Additional coverage:** Configure and validate ESRD/PACE routes and any further year/segment packs separately. Unknown status shall produce a routing exception; it shall not silently become ordinary community MA.

- **RA-14.08 — NEW:** In external-score-only Medicaid mode, changed source data shall mark results as awaiting external refresh; do not fabricate a new member score or hypothetical diagnosis delta. Locally computable aggregation or sensitivity may update only under its declared method. Show imported components where supplied and “component detail unavailable” otherwise.
- **RA-14.09 — NEW:** Medicaid profiles shall define missing/insufficient-history, newborn, dual-eligible, excluded and unscored handling, denominator inclusion and any permitted imputation/duration method. Never default every unresolved member to zero or one. Provide a rate-cell/cohort aggregate and raw-versus-normalized/state-factor comparison using matched periods, population and model basis.

**AT-14:** Run separate Medicare Part C, RxHCC MA-PD/PDP and ACA examples, including ACA age boundaries, a CSR case and supported model terms. Import a synthetic Medicaid result set and inspect member detail, rate-cell aggregation, normalized/state-factor comparison and export. Show mismatched-period, duplicate and unscored handling. Changed inputs in import-only mode await external refresh; unavailable components are not invented. Florida payment-reproduction remains inactive until its actual methodology is evidenced.

### B15. Calculation provenance, operational performance and exports

- **RA-15.01 — NEW:** Retain exact input snapshots, model/configuration version, segment selection, exclusions, component trace, result precision and output basis for every displayed or exported score. These are core calculation evidence, not optional audit-package polish.
- **RA-15.02 — ENH:** Add score-run and baseline/scenario references to existing case exports, review decisions, opportunity records and simulated submission traces. A later recalculation shall not overwrite earlier downloaded evidence or an earlier decision's cited score.
- **RA-15.03 — NEW:** For locally executable configurations, recalculate affected members after relevant changes and rebuild dependent aggregates. For external-score-only configurations, request/await the external refresh and identify stale inputs/results; do not imply a local member recalculation occurred. Do not claim updated consistency before the relevant run or feed completes.
- **RA-15.04 — NEW:** For the agreed 10,000-member synthetic population, support a complete eligible-cohort run with progress, success/failure counts and resumable/retryable failed work appropriate to the demo. Measure performance on the actual environment. Initial UX targets are a cached result opening within one second and a single-member recalculation within two seconds at the 95th percentile after warm-up; if unmet, expose an honest calculating state and record the measured limitation. Targets are product goals, not claims about CMS software performance.
- **RA-15.05 — ENH:** Exports and comparison downloads shall identify model/year/run, score basis, weighting/denominator, excluded members and synthetic/external status. A CSV column named only `RAF` is insufficient when several incompatible score families or stages are present.

**AT-15:** Reopen an earlier score after changing member inputs and model configuration; reproduce its stored result. A batch shows complete coverage and failures, and a dependent dashboard identifies staleness until refreshed. Exported values match the selected run and stage.

### B16. Core release tests and demonstration fixtures

- **RA-16.01 — NEW:** Maintain an independent expected-result set for each required model configuration, covering at least demographic-only, representative eligible segments, duplicate code, hierarchy suppression, valid interaction, invalid/out-of-period input and an addition/removal scenario. Compare to official/reference execution and retain the evidence, not a test that repeats the application's own formula.
- **RA-16.02 — ENH:** Extend Jordan, Morgan, Avery, Taylor, Casey and Riley with the scoring inputs and source/encounter metadata needed for their declared story. Add separate synthetic Part D, ACA and Medicaid cases rather than merely changing the program label on the same unsupported record.
- **RA-16.03 — NEW:** Generate complete valid scoring inputs for the main 10,000-member synthetic population and score all normal eligible records. Before acceptance, declare the exact expected scoreable member/member-month count and identify any intentional negative fixtures separately with count and cause. All expected-scoreable records shall calculate successfully; named negative cases shall produce expected validation outcomes. A token scored cohort or six showcase scores cannot stand in for the population calculation.
- **RA-16.04 — NEW:** Validate required program routes, score-stage changes, model comparisons, full-member opportunity aggregation, recapture denominators and AI attribution. A score of zero may be a valid calculated result; it shall never be substituted for “not calculated.”
- **RA-16.05 — ENH:** Require the end-to-end tour to show risk scores before review, explain a source-backed category decision, pass independent QA, recalculate the correct score basis, create a linked simulated submission and explain any difference from reported/eligible outcomes.

**AT-16:** The required tests pass on an identified build and model-asset version. Main-cohort scoring matches the declared expected valid member/member-month counts, and intentional negative fixtures have their declared outcomes. The tour includes positive, negative and zero score effects and separate working model families. A missing required numeric calculator fails the expanded demo gate even if every screen is visually polished.

## C. Calculation definitions and business semantics

### C1. Score bases

| Label | Input basis | Permitted claim |
|---|---|---|
| **Captured baseline** | Declared current coded-data input set after the selected scoring validation/filtering. | Locally calculated score from those records; not proof every diagnosis was independently chart-audited. |
| **QA-supported scenario** | Baseline plus/minus the specifically approved additions/corrections. | Local score if those approved coding changes are included; not automatically submitted or accepted. |
| **Submitted-set score** | Applicable diagnosis set actually included in the recorded submission state. | Calculated from submitted records; external transmission may be simulated. |
| **Accepted-set score** | Records accepted by the actual or explicitly simulated receiver process. | Calculated from that accepted set; not automatically risk eligible. |
| **Eligible-set score** | Applicable diagnoses established as eligible by the selected report/rule basis. | Calculated from the eligible set with identified model/run; not an automatic final payment result. |
| **Reported result** | An imported external report or explicitly authored receiver/report fixture. | Reported/imported value with its provenance; not relabeled as a local calculation. |
| **Potential scenario** | Baseline plus/minus selected hypothetical changes. | Model-calculated result if the assumptions hold; not confirmed disease burden or guaranteed revenue. |

Each calculated stage uses the complete known applicable input set, not merely new demo submission rows; partial source coverage must be identified. External-score-only configurations retain external refresh semantics. These are input-set/basis labels, not seven copies of a monotonically increasing RAF. Deletions, eligibility exclusions, model changes and nonlinear interactions can reduce or leave scores unchanged.

### C2. Marginal impact and aggregation

Let `S(P, I)` be the deterministic result of model/configuration `P` on full member inputs `I`. The following definitions specify product behavior; they are not replacements for the official scoring algorithm.

| Measure | Definition | Required qualification |
|---|---|---|
| Candidate marginal change | `S(P, I with candidate change) − S(P, I)` | Name the baseline run and candidate change; apply all model rules again. |
| Combined member opportunity | `S(P, I with all selected compatible changes) − S(P, I)` | Not the sum of separately computed candidate changes. |
| Fixed-input model difference | `S(P2, I) − S(P1, I)` | Identify valid inputs, exclusions and raw versus common-adjustment basis; differing denominator years must not be ignored. |
| Internal member-month-weighted mean | `sum(score_i,m × eligible_i,m) / sum(eligible_i,m)` | Select effective-dated monthly segments; one member score times months is valid only when that score is constant across those months. Official program aggregation may require additional rules. |
| Clinical recapture rate | Current-period supported recaptures / eligible prior-period member-condition pairs | State model comparability, exclusions and whether QA is required for the numerator. |
| Eligible recapture rate | Receiver-eligible recaptures / the declared comparable eligible prior-period pairs | Preserve its later milestone and report basis. |
| AI-origin supported score contribution | Joint approved-with-AI-input scenario minus the declared comparison input set, same pack/period | A calculated contribution in the synthetic workflow, not causal clinical or financial impact. |

If a component-level attribution uses sequential changes, disclose the sequence because interactions can change each marginal allocation. Reconcile the final bridge with a shared/interaction residual if needed. Do not publish several independently computed overlapping marginal values as an additive total.

### C3. Evidence and score changes

1. An indirect signal creates an assessment opportunity and a hypothetical scenario only.
2. A provider reply records a response; a separate usable source may still be required.
3. A source-supported coder decision enters the existing QA process.
4. Independent QA permits the approved change to affect the QA-supported scenario.
5. The linked submission process affects submitted/accepted/eligible sets only as those distinct events occur.
6. A reported result remains linked to its imported report and period, even when later local calculations change.

Maintain the existing distinction between source receipt and usability, independent QA, retained receiver attempts and valid no-positive dispositions. Scoring strengthens these workflows; it does not replace them with automatic coding.

## D. Revised demo story and acceptance gate

### D1. Executive story

| Step | Screen and action | What the audience learns |
|---|---|---|
| 1. Establish risk context | Open Risk overview with active model/run and calculated population results; inspect recapture and correction exposure. | The product manages measured risk-model inputs and opportunities, beyond task counts. |
| 2. Explain an opportunity | Open Jordan from AI suspecting; inspect category, exact evidence and calculated marginal effect. | Suspecting connects evidence to a named model and full-member scenario. |
| 3. Complete the decision | Review source/code, pass with a different QA user and observe the supported score snapshot. | Human decisions and QA control which changes become approved. |
| 4. Follow the outcome | Create the linked simulated addition; inspect submitted/accepted/eligible stages and the score bridge. | Receiver stages and reported risk are distinct and traceable. |
| 5. Show recapture and uncertainty | Use Morgan/Avery for historical/indirect evidence; respond, obtain suitable documentation or record justified non-support. | The system seeks accurate assessment and does not automatically code suspicions. |
| 6. Demonstrate accuracy correction | Use Taylor for an explicit removal, rejected attempt and correct retry; inspect the resulting score effect. | Lower or unchanged RAF can be the correct outcome. |
| 7. Explain the model | Use Casey in the calculator: combine conditions, show hierarchy/interaction and compare historical/current packs on fixed inputs. | The displayed result is calculated and explainable. |
| 8. Demonstrate breadth | Run distinct RxHCC and ACA examples; show configured Medicaid score ingestion with provenance. | Different risk-adjustment programs have different inputs and outputs. |
| 9. Explain AI contribution | Open AI Impact and trace approved AI-origin findings to evidence and calculated score effects. | AI assistance, deterministic RAF and synthetic evaluation results remain separate. |

### D2. Expanded demo release gate

The expanded demo is complete only when:

- Required MA, RxHCC and ACA configurations calculate from inputs and match independent reference outputs for their declared scope.
- The model registry, scoreable population, factor ledger, scenarios, recapture and risk analytics are functioning and connected.
- The same diagnosis change produces consistent results in member view, opportunity delta, campaign aggregation and score-stage analytics.
- Positive, negative and zero marginal effects are correctly demonstrated; overlapping opportunities do not inflate totals.
- Existing assignment, source prerequisite, QA completion and retry defects are corrected for the included routes.
- Medicaid external-score/configuration behavior is functioning and its origin and limitations are explicit; a Florida payment-equivalent claim remains dependent on its actual methodology.
- Required source/date/model validation runs on accepted scoring inputs, not only on hardcoded showcase IDs.
- Synthetic data, AI replay where used and receiver simulation are accurately identified; none is presented as observed production efficacy or actual payment.

There is no nonnumeric fallback for a mandatory calculator. Missing validation or model inputs keep that requirement open while independent work continues. External integrations and full production hardening remain separately scoped.

### D3. Delivery sequence

1. **Scoring foundation:** inspect the current code, establish model registry and inputs, integrate validated MA calculation, create run/component records and reference tests.
2. **Risk identity:** enhance Member 360, Risk Scenarios, overview and category/recapture views using the same scorer.
3. **Connected action:** integrate model-aware suspecting, review/QA updates, campaigns and submission/score-stage reconciliation; retain existing workflow fixes.
4. **Program breadth:** add required RxHCC and ACA paths plus Medicaid external-score/configuration, with separate test records and validation.
5. **Value and evidence:** add AI-origin contribution analytics, model comparisons, financial sensitivities and calculation exports; rehearse the complete tour.

The backend is necessary because model execution, versioned input snapshots, consistent recalculation and saved workflow state must agree across screens. Reuse the existing FastAPI/PostgreSQL application. No new agent platform, framework rewrite or real receiver integration is required simply to calculate correct scores on synthetic records.

## E. Requirement change control

| Previous requirement or scope | V2 disposition | Governing requirements |
|---|---|---|
| BR-02.01–02.05 and corresponding AC-02; precomputed-only/nonnumeric acceptance | Replaced in full. | RA-01–RA-05, RA-14 and RA-16; gate D2. |
| BR-01.01: code abstraction only in two cases; mapping optional | Retain showcased clinical review; extend code/category abstraction to all scoreable records. | RA-02, RA-04 and RA-11. |
| BR-03.01–03.05: browsing-only versus six full cases | Preserve clinical guard; add independent score-readiness. | RA-02.05–02.06, RA-16.03. |
| BR-04.03–04.04: one fixed priority order | Retain as operational mode; add named model-impact and recapture modes. | RA-07 and RA-09. |
| BR-09: complete ZIP optional P2 | Full package presentation may remain P2; score provenance is mandatory. | RA-15.01–15.02. |
| BR-10: fixed MA/future-only programs and precomputed labels | Replace with active model/run context and genuine configured paths. | RA-01, RA-02.07 and RA-14. |
| BR-10.05/R05: date validation generally deferred | Accepted scoring inputs must have applicable date/eligibility validation. Arbitrary OCR/document-ingestion cases can remain later. | RA-02.03–02.04. |
| BR-13: AI benchmark and operational definitions only | Preserve benchmark; expand actual risk and AI contribution analytics. | RA-10 and RA-12. |
| D01–D12 existing workflow improvements | Retained with the amendments in the following implementation baseline. | Existing BR groups plus connected RA requirements. |
| All programs/models moved to future backlog | Superseded for required configurations and external-score path. | A4 scope and D2 release gate. |

### E1. New business information versus existing records

| Information | Existing basis | Required addition |
|---|---|---|
| Model configuration | Fixed program labels; no verified scoring engine. | Versioned executable pack, supported scope, mappings/factors, adjustments and validation. |
| Score input snapshot | Seeded members/opportunities and prepared documents. | Complete model-required demographics, enrollment and diagnosis/other inputs, input eligibility results and score-readiness. |
| Calculation run | No functioning scored run evidenced. | Immutable input/model references, selected segment, component ledger, exclusions, result and precision basis. |
| Category inventory | Prepared conditions and evidence bands. | Model-specific mapped/retained/suppressed categories, source references and prior/current comparison. |
| Opportunity | Existing suspect registry row. | Baseline run, candidate change, full-member marginal effect, overlap group, origin and scenario confidence basis. |
| Recapture | Historical case context exists. | Defined prior/current member-condition inventory, comparable denominator and milestone-specific recapture status. |
| Review/QA | Existing decisions and pass/rework. | Source-bound code/category and input/score version references; correct approved-stage recalculation. |
| Submission | Existing local simulator and attempts. | Approved-input linkage and separate submitted, accepted, eligible and reported bases. |
| Medicaid imported score | No current Medicaid configuration evidenced. | External producer/model/period, declared input coverage, factor details where supplied and validated match status. |
| Analytics | Existing charts and frozen AI comparison. | Real calculation aggregates, stage/model/period dimensions, recapture and origin-based impact definitions. |
| Audit package | Existing selected-case ZIP. | Mandatory calculation evidence and optional richer full-workflow packaging. |

The following part retains the detailed existing-workflow requirements so implementation teams can improve the current application without rebuilding it. The revised risk core and gate above take precedence over any narrower legacy demonstration example.

## F. Existing workflow implementation requirements

**Reported baseline to retain:** 10,000 synthetic members, 1,500 opportunities, 30 providers, four campaigns, 30 chart requests, 12 submission records, 11 initial documents and six detailed clinical-review cases. Accounts, workflow state and events persist through the existing local backend. Provider access is practice-based; staff scope is currently bounded. These are assessment observations, not a fresh count of the running build.

The following requirement IDs are retained for implementation continuity. P1 means required connected workflow; P2 means optional full-package/presenter polish unless promoted by a risk-core requirement. D11 remains mandatory if its affected administration action is exposed. References L01–L11, D01–D12, J01–J11 and R01–R08 are identifiers in the supplied assessment; they are not new test results.


### F0. Shared workflow behaviors

- **BR-00.01 — ENH, P1:** Reuse the existing backend and persist saved decisions, QA results, assignments, published sources, recommendation snapshots and linked outcomes. Extend persistence to model/input/calculation records under RA-15.
- **BR-00.02 — KEEP, P1:** Provider responses, AI suggestions and submission-specialist actions shall not bypass human review and independent QA prerequisites for new additions/corrections.
- **BR-00.03 — ENH, P1:** Retain member/case, program/model/period, source, decision and score-run relationships so users recognize the same case across screens.
- **BR-00.04 — KEEP, P1:** A justified non-positive outcome shall remain valid; larger RAF is not the only successful result.
- **BR-00.05 — ENH, P1:** Derive operational values and risk aggregates from their declared saved-state/input basis. Keep the frozen illustrative AI comparison separate from current workflow and calculated risk results.

**AC-00.1:** Saved records persist across normal navigation/role changes and retain their source/score version.  
**AC-00.2:** A valid non-support or correction outcome completes the applicable workflow without an unsupported addition.  
**AC-00.3:** Operational and score-state changes do not alter the frozen comparison dataset.

### F1. D01 — Connect approved review to a simulated outcome

**Business need:** Show that the work performed on a member leads to a traceable downstream result.  
**Existing:** Source review, human dispositions, independent QA, a submission simulator and retained attempts.  
**Gap:** Prepared coding fields and decision-to-submission creation are missing; generic retry changes the operation to deletion.  
**Trace:** D01, J02, J05, J09, R04; supporting assessment evidence L02/L04.

- **BR-01.01 — NEW, P1:** Provide code/category abstraction for scoreable records under RA-02/RA-04, and complete the source-reviewed addition/correction fixtures for Jordan and Taylor. Retain member/case, operation, code/release, service date, model/category mapping, exact source version/passage and reviewer decision version. Coding fixtures require SME review; the application shall not invent codes, mappings or score effects.
- **BR-01.02 — NEW, P1:** A submission specialist shall be able to create a simulated submission from the exact QA-approved decision. The record shall carry the approved operation and linked member, code, source, decision and QA references. Pending-QA, returned or unsupported-without-approved-correction cases shall not create a qualifying addition/correction.
- **BR-01.03 — ENH, P1:** Jordan's supported documented-gap case shall create an addition. Taylor's unsupported existing-code case shall create an explicitly approved deletion linked to the original record. A general non-support disposition without an existing record and approved correction shall not imply deletion.
- **BR-01.04 — FIX, P1:** Retrying a rejected addition shall remain an addition; retrying the showcased deletion shall remain a deletion. Each attempt shall retain its predecessor, intended operation and response reason. Prior records and rejected attempts shall remain inspectable.
- **BR-01.05 — ENH, P1:** Simulated acknowledgement, acceptance/rejection, eligibility and reported status shall be individually visible with their basis. A status not demonstrated by an explicit prepared result shall remain pending/unavailable rather than being inferred from acceptance. Payment shall remain unreconciled in the standard story.
- **BR-01.06 — NEW, P1:** The application shall provide one prepared record-level trace linking the source, coded-data comparison, approved decision, simulated submission and separate receiver-stage results. Any eligible/reported illustration shall use an explicitly identified prepared response; it shall not claim actual financial reconciliation.
- **BR-01.07 — ENH, P1:** Repeating the normal “create submission” action for the same approved decision and operation shall open or identify its existing linked record rather than create an unintended duplicate. A deliberate retry shall create a new attempt under that record. This requirement concerns the normal single-presenter flow, not a general concurrency platform.

**Acceptance criteria**

- **AC-01.1:** Given Jordan's inspectable prepared source and code, when a coder saves and a different QA user passes that decision, the submission specialist can create an addition for the same member and approved version. Without that pass, creation is blocked with the next required step.
- **AC-01.2:** Given Taylor's existing record, when the unsupported-code decision and explicit deletion are independently approved, the simulated deletion retains the original reference. Its rejection and subsequent retry remain visible; the retry is still a deletion.
- **AC-01.3:** A rejected addition retried through the normal resend path remains an addition. Refreshing/reopening creation does not silently duplicate the approved record.
- **AC-01.4:** Advancing acknowledgement alone does not show acceptance; acceptance alone does not show eligibility, reporting or payment. Explicit prepared eligibility/reporting results display their own basis, with payment unreconciled.
- **AC-01.5:** Users can navigate from the simulated record to its exact source, decision and QA result without selecting an unrelated seeded member.

### F2. D02 — Replaced by executable scoring requirements

The former BR-02.01–BR-02.05 and AC-02.1–AC-02.3 are retired. Their governing replacement is RA-01 through RA-05, RA-14 and RA-16, with the expanded demo gate in D2. The existing Risk Scenarios screen is retained and enhanced; a nonnumeric illustration does not complete this work.

### F3. D03 — Make the reviewability boundary explicit

**Business need:** Keep a large population credible for exploration while ensuring every actionable demo case has a complete workflow.  
**Existing:** Broad roster, six detailed cases and some member-specific evidence checks.  
**Gap:** A browsing member without documents can be recorded as supported.  
**Trace:** D03, J01/J03, R01; assessment L02/L06.

- **BR-03.01 — NEW, P1:** A case catalog shall separately identify score-readiness and full clinical-review readiness. It shall list permitted interventions, source fixtures, evidence prerequisites, expected dispositions and eligible roles. Initially the six detailed cases are the complete clinical-review set; the larger population must have scoring inputs or explicit unscorable status under RA-02 and RA-16.
- **BR-03.02 — FIX, P1:** Records without a prepared clinical-review path shall not permit unsupported coding, linked submission creation or activation of clinical work that cannot be completed. Explain the missing review preparation and link to a suitable prepared case. This restriction shall not disable valid calculation or read-only risk analytics for score-ready members.
- **BR-03.03 — FIX, P1:** Every supported-decision path shall require the matching usable source and reviewed evidence prerequisites. Apply the same checks to saved actions and UI controls. Model/date/source eligibility for accepted scoring inputs shall additionally follow RA-02; sample-specific guards are not a substitute for the scoring validation layer.
- **BR-03.04 — KEEP, P1:** Historical-only information and indirect laboratory/medication signals shall remain assessment needs until the prepared qualifying documentation is available and reviewed. An evidence band alone shall not satisfy source prerequisites.
- **BR-03.05 — ENH, P1:** Population exploration, score-ready coverage and full clinical-review counts shall be distinguishable. Show the larger computed population with its exclusions; do not present six prepared charts as 10,000 scored members or imply all scoreable records have complete interactive chart review.

**AC-03.1:** The assessment's member-14 no-document path cannot save a supported decision through the UI or the underlying save action; an appropriate prepared-example link is available.  
**AC-03.2:** Each of the six cases permits only the actions appropriate to its current prepared evidence state.  
**AC-03.3:** Morgan's historical context and Avery's indirect signals cannot independently complete a supported coding decision; the large roster remains searchable.

### F4. D04 — Make assignments reachable and priority understandable

**Business need:** An analyst's cohort must produce work the selected staff can actually open and complete.  
**Existing:** Filters, priority/evidence fields, assistant cohort proposal, preview, overlap checks and assignment.  
**Gap:** Assignment can target inaccessible members; assistant proposals currently use arbitrary row order.  
**Trace:** D04, AI03, R06; assessment L02.

- **BR-04.01 — FIX, P1:** Selectable case/owner combinations shall be restricted to prepared actionable cases accessible to the chosen owner and required handoff roles. Preserve current role/practice boundaries; do not solve the issue by granting all users broad access.
- **BR-04.02 — FIX, P1:** Campaign activation shall check the final cohort and owners and identify any inaccessible or unprepared case before creating tasks. A blocked selection shall retain the user's valid choices so it can be corrected.
- **BR-04.03 — ENH, P1:** The priority assistant shall propose candidates using a visible deterministic order based on the selected work type, existing priority, evidence category, due date, disposition and campaign coverage. Closed work shall be excluded; active duplicate work shall be excluded or explicitly identified for review. Integrity corrections shall be a separately selectable work category rather than being presented as additions.
- **BR-04.04 — ENH, P1:** Preserve priority/evidence/due-date order as a named operational ranking with stable ties and visible campaign coverage. Add the calculated risk-impact, recapture and correction modes specified in RA-07. Ranking shall be reproducible and shall not be described as a calibrated prediction unless its probability basis is evidenced.
- **BR-04.05 — ENH, P1:** Before activation, the analyst shall see the exact cases, unique member count, task count, owners, intervention, due dates and overlap/exclusion information. Assistant output shall remain a proposal until the user confirms this preview.
- **BR-04.06 — ENH, P1:** No eligible candidates shall produce a clear empty result with the limiting filters. The system shall not broaden access, substitute arbitrary members or claim that a campaign was activated.

**AC-04.1:** Reproduce the member-31 assignment scenario: an inaccessible case/owner pair cannot activate. Every allowed assignment is opened successfully while signed in as its actual assignee, including required source access.  
**AC-04.2:** Identical inputs yield the same ranked candidates and reasons; ties are stable, integrity work remains distinct and the exact confirmed cohort matches created tasks.  
**AC-04.3:** An overlap or empty result is explained without duplicate tasks or an invented success message.

### F5. D05 — Align QA, campaign and dashboard completion

**Business need:** Progress must represent work actually finished, including valid non-positive dispositions.  
**Existing:** Review save, separate QA, tasks, pass/rework and progress displays.  
**Gap:** A review save can complete the campaign task while QA is still pending.  
**Trace:** D05, J07, R03; assessment L02.

- **BR-05.01 — FIX, P1:** Coding-review tasks shall remain open while review or required independent QA is pending. QA pass shall complete the relevant review task; QA return shall leave or restore it to an active rework state.
- **BR-05.02 — ENH, P1:** Completion rules shall be declared by intervention as specified below. A valid no-addition disposition may complete review after its required QA; “deferred” or “awaiting assessment” shall not silently count as completed coding.
- **BR-05.03 — ENH, P1:** QA return shall require a visible reason linked to the decision version. QA pass shall record a concise rationale or selected reviewed reason. The coder shall see the returned reason and revise the decision before repeat QA.
- **BR-05.04 — FIX, P1:** Campaign progress, member tasks, QA queue and operational overview shall use the same authoritative task states and counting rules. Repeated saves or QA events shall not count one task as multiple completions.
- **BR-05.05 — ENH, P1:** Preserve the existing restriction that the author of a decision cannot independently QA that same decision, and extend the version linkage: a materially revised decision shall require a new QA result before it can serve as the basis for a new downstream action. The earlier decision and QA result shall remain historical.

| Demonstrated intervention | Completion rule | What does not complete it |
|---|---|---|
| Coding review or integrity review | Final disposition passes required independent QA. | Saving a draft/review, awaiting QA or a request for clarification. |
| Chart retrieval/intake | Required prepared documentation is matched and published as usable. | Recording receipt or a provider saying a chart was sent. |
| Provider response task | A response with a disposition is recorded, or the task closes with an explicit reason. | An unanswered draft query. Completion of this task does not complete coding. |
| Documentation follow-up | Required usable source is obtained, or an explicit unable-to-obtain/non-support outcome closes that task according to its declared rule. | A response alone when documentation is still required. |
| Simulated submission task | The defined simulator outcome for that task is reached. | Coding QA pass alone; this is a separate downstream task. |

**AC-05.1:** After review save, the coding task remains open and campaign completion does not increase. Independent QA pass completes it exactly once in campaign, member and overview views.  
**AC-05.2:** QA return with a reason routes work to the coder and displays rework consistently. Revision plus repeat QA preserves the earlier history.  
**AC-05.3:** Source receipt alone does not complete retrieval. A provider-response task can complete while documentation and coding remain open.  
**AC-05.4:** A QA-approved non-positive disposition completes eligible review work without increasing the supported-addition count.

### F6. D06 — Make recommendations change with evidence

**Business need:** Demonstrate useful analysis behavior, including unchanged results, rather than a version counter presented as new intelligence.  
**Existing:** Prepared analysis, refresh/run logging and a changing version field.  
**Gap:** Refresh increments a version without retaining a meaningful recommendation history.  
**Trace:** D06, AI01, J04, R07; assessment L02.

- **BR-06.01 — ENH, P1:** The existing analysis action shall evaluate the declared prepared scenario state and return changed, unchanged, or unable-to-evaluate. Inputs shall identify member/case, relevant source versions and scenario-rule version. A live AI model is not required for this prepared scenario transition; executable risk scoring remains required under RA-03.
- **BR-06.02 — NEW, P1:** A meaningful recommendation snapshot shall retain its input references, finding/disposition suggestion, evidence category, explanation, next action, creation time and previous snapshot reference. Published snapshots shall not be overwritten by later changes.
- **BR-06.03 — FIX, P1:** Identical relevant inputs shall produce an unchanged/replay result without implying a new recommendation. Run history may record the action, but assignment edits and other workflow updates shall not increment the recommendation version.
- **BR-06.04 — NEW, P1:** At least one prepared newly qualifying source and one prepared contradictory-source transition shall produce a visible before/after recommendation with the prior source context and a concise explanation of the change. The reviewer shall retain responsibility for the disposition.
- **BR-06.05 — ENH, P1:** New evidence shall mark affected displayed explanations as needing refresh or update them together through the prepared flow. It shall not silently overwrite a human decision, approve coding, create a submission or reverse a previously simulated outcome.
- **BR-06.06 — ENH, P1:** Missing required sources shall produce an explicit no-result state. The last available historical snapshot may remain inspectable with its earlier basis; it shall not be presented as a current conclusion.

**AC-06.1:** Refreshing the same inputs twice shows unchanged/replay and preserves the recommendation version; run activity remains distinguishable.  
**AC-06.2:** Loading the prepared new encounter changes Morgan's appropriate recommendation and retains the earlier historical-assessment state. A prepared contradiction produces a comparable before/after explanation and allows retain, withdraw or clarify as appropriate.  
**AC-06.3:** Assigning the case to another eligible owner does not create a new AI recommendation version. Missing-source analysis does not fabricate one.  
**AC-06.4:** Previously saved decisions and receiver attempts remain historical when the new recommendation appears.

### F7. D07 — Keep assistant explanations current and precisely sourced

**Business need:** A reviewer must be able to verify each explanation against the right evidence, including after the case changes.  
**Existing:** Assistant, member summary, document links and unsupported-prompt handling.  
**Gap:** Stored summaries can be stale and links are not statement-specific.  
**Trace:** D07, AI02, J01/J04; assessment L02.

- **BR-07.01 — ENH, P1:** Member summaries and supported assistant answers shall use the selected case's current prepared state and recommendation snapshot. After a scenario transition, the previous conclusion shall not remain displayed as current without a stale-state indication.
- **BR-07.02 — ENH, P1:** Each material evidence-based statement shall cite the specific member source, version and passage that supports it. Opening the citation shall navigate to or highlight that passage while preserving the current case context.
- **BR-07.03 — ENH, P1:** Explanations shall distinguish current support, historical context, indirect signal, contradiction and missing evidence. A document-level link to unrelated content shall not be substituted for support of the statement.
- **BR-07.04 — KEEP, P1:** The assistant shall abstain or offer supported next actions when the prepared evidence cannot answer a question. It shall use only records available to the signed-in user and shall not imply access to unavailable members or external records.
- **BR-07.05 — ENH, P1:** Deterministic templates may continue to support prepared explanations, but they do not replace the validated bounded AI example or identified retained-output replay required by RA-08.02. Explanations shall identify their actual basis and shall not claim live clinical inference, autonomous coding or verified diagnostic probability without the corresponding capability and evidence.

**AC-07.1:** Morgan's summary changes after the prepared encounter; Avery remains an assessment signal until the relevant source exists; Taylor displays the evidence conflict rather than a generic supportive summary.  
**AC-07.2:** Each tested claim opens its supporting passage for the correct member and source version. A no-source case yields missing-evidence wording.  
**AC-07.3:** An unsupported question or out-of-scope member request does not expose records or generate an ungrounded answer.

### F8. D08 — Guide provider response through usable evidence and review

**Business need:** Reduce navigation friction while preserving the difference between response, documentation, usability and review.  
**Existing:** Neutral query templates, provider responses, prepared encounter loading, chase/intake checks and publication.  
**Gap:** The presenter must manually connect these steps; query context and import summaries can be clearer.  
**Trace:** D08, AI04, J01/J03/J06/J08; assessment L02/L06/L07 and lifecycle findings.

- **BR-08.01 — ENH, P1:** Query drafts shall include the relevant prepared evidence context and the unanswered assessment/documentation question, with neutral non-support and uncertainty options. A user shall review the draft before it creates the local follow-up task.
- **BR-08.02 — ENH, P1:** After provider response, the case shall show whether documentation is still required and offer the appropriate next step: prepared encounter, intake review, additional follow-up or reasoned closure. The response alone shall not publish a source, support a code or pass QA.
- **BR-08.03 — ENH, P1:** The prepared documentation journey shall visibly distinguish requested, responded, source received, usable/published and reviewed. Users shall be able to move between the linked task, source and case without reselecting the member.
- **BR-08.04 — ENH, P1:** Preserve the existing wrong-member and unsigned-source checks and improve the resulting handoff: a rejected/quarantined sample shall display a specific reason and a route to the prepared replacement. Publishing the same suitable source repeatedly shall not create duplicate usable documents.
- **BR-08.05 — ENH, P1:** Publishing the suitable replacement shall make it available to the relevant reviewer and enable a fresh prepared analysis/summary. Source availability shall not itself record a human decision.
- **BR-08.06 — NEW, P2:** One prepared import summary shall show total received and mutually exclusive matched/accepted-for-processing, quarantined and unmatched/pending counts, with drilldowns or reasons that reconcile to the total. Validation/publication outcomes shall be a separate stage. This is a prepared batch illustration, not arbitrary-file ingestion.
- **BR-08.07 — KEEP, P1:** Local TXT/PDF selection shall remain accurately identified as local preview unless server ingestion is actually implemented later. Local contact notes and query tasks shall not claim external messages were sent.

**AC-08.1:** A provider response without an encounter leaves documentation/coding incomplete and presents an appropriate follow-up action. A non-support response can follow a reasoned no-addition path.  
**AC-08.2:** Riley's unsuitable or wrong-member sample is rejected with a reason. A prepared suitable replacement publishes once and appears in the correct case.  
**AC-08.3:** The new source can be opened from the case, refreshed analysis and updated summary; no coding/QA completion occurs automatically.  
**AC-08.4, P2:** Prepared import categories reconcile to total received and link to the corresponding sample results; file preview alone does not change those counts.

### F9. D09 — Extend the existing case export

**Business need:** Let an audience inspect the complete story without reconstructing relationships manually.  
**Existing:** Selected-member ZIP with documents, current decisions and events.  
**Gap:** It does not yet contain the complete connected decision/QA/submission chain.  
**Trace:** D09, AI05, J11; assessment L02.

- **BR-09.01 — ENH, P2 package finish:** Extend the existing full-case ZIP with sources, recommendation snapshots, review/rework, QA and connected submission/correction attempts. Calculation provenance, score-run references and reproducible numeric output under RA-15 are mandatory core scope even if this richer ZIP presentation is deferred.
- **BR-09.02 — NEW, P2 package finish:** Add a readable full-case manifest listing member/case, program/model/period, source references, score/input versions, decision/QA versions, operation/original record, receiver attempts and export time. The core calculation manifest under RA-15 is mandatory; this requirement adds a richer full-workflow narrative.
- **BR-09.03 — ENH, P2:** Missing or not-yet-completed links shall be explicitly marked. Exporting before submission shall produce a truthful partial case package rather than imply a completed outcome.
- **BR-09.04 — ENH, P2:** The exported package shall reflect the selected case at export time, match the displayed records and exclude unrelated member data. Re-export after a later change shall represent a new snapshot without altering the earlier downloaded package.

**AC-09.1:** For completed Jordan and Taylor stories, the manifest connects exact sources through decisions, QA and simulated attempt history without manual ID joins.  
**AC-09.2:** A pre-submission package marks that stage incomplete. All IDs and simulation labels agree with the UI; unrelated members are absent.  
**AC-09.3:** The narrative explanation contains only facts derivable from the included records.

### F10. D10 — Make scope, simulation and staged dates clear

**Business need:** A polished presentation must remain accurate about what the demo actually does.  
**Existing:** Program context, synthetic notices and some assistant/scoring disclosures.  
**Gap:** Labels are inconsistent and a prepared future encounter can appear to be a current completed event; model/run context and supported scoring-input validation also need expansion.  
**Trace:** D10, R05; assessment L01/L02/L11.

- **BR-10.01 — ENH, P1:** A consistent context area shall identify active program, executed model/version, service/payment or benefit/rating year, run/software release, data basis and scenario date. Preserve that context across corresponding outputs; each configured program shall invoke its own calculation or explicitly external-score path.
- **BR-10.02 — ENH, P1:** Loading an encounter later than the demo's initial date shall be presented as a staged scenario progression with its effective date. Preserve the source's authored service date; do not rewrite quoted documentation or confuse the scenario date with the actual session timestamp.
- **BR-10.03 — ENH, P1:** Calculated model output, hypothetical input scenarios, live or replayed AI, externally imported scores and receiver simulation shall have concise distinct labels. A precomputed reference may support validation but shall not be mislabeled as an interactive calculation. The basis must be inspectable without repetitive warning banners.
- **BR-10.04 — ENH, P1:** Provide working MA, RxHCC and ACA paths plus the configured Medicaid external-score journey required by A4/RA-14. Display additional model coverage with accurate readiness status and disable unsupported execution. A Florida payment-reproducing calculation requires its applicable methodology; generic or imported outputs must retain their narrower basis.
- **BR-10.05 — FIX, P1:** Validate accepted scoring-input dates, run windows and source eligibility under RA-02, including correctly handled exclusions. Review staged fixture chronology. Arbitrary OCR/document-ingestion date extraction can remain deferred; the original R05 limitation shall not be treated as resolved by labels alone.

**AC-10.1:** A presenter can identify program, periods and the prepared/simulated basis from the viewed screen and its export.  
**AC-10.2:** A future prepared encounter is visibly staged; its service date remains intact and chronology is understandable.  
**AC-10.3:** No standard receiver outcome claims payment, no prepared analysis claims live inference and no unconfigured program reuses MA results under another label.  
**AC-10.4:** Accepted scoring inputs are checked against the actual configured dates/window; invalid inputs are rejected/excluded with a reason. Staged fixture chronology is coherent. Separate unresolved arbitrary-ingestion date handling remains recorded, rather than being hidden by scenario labels.

### F11. D11 — Preserve provider scope during account maintenance

**Business need:** Routine account maintenance must not change which practice's records a provider can see.  
**Existing:** Local account editor and practice-based provider access.  
**Gap:** Saving provider2 can reset its practice from `PR-002` to `PR-001`.  
**Trace:** D11, R02; assessment L02.

- **BR-11.01 — FIX, P0 conditional:** A no-op account save or enable/disable action shall preserve the existing provider/practice association. A scope change shall occur only through an explicit intended edit permitted by the existing account model.
- **BR-11.02 — FIX, P0 conditional:** After the demonstrated account maintenance and fresh login, provider2 shall retain `PR-002` access, including its appropriate prepared member, and shall not gain `PR-001` access.
- **BR-11.03 — ENH, conditional:** If this fix is deferred, the affected account-editing action shall be excluded from the approved demo route. That exclusion shall be documented as a deferred defect, not described as resolution or production readiness.

**AC-11.1:** No-op save and enable/disable leave provider2 mapped to `PR-002`; after fresh login it can access member 2 and cannot access member 1.  
**AC-11.2:** If account editing is included in the tour, this check passes before rehearsal sign-off. Otherwise the tour explicitly omits that action and the defect remains open.

### F12. D12 — Improve the actual presenter route

**Business need:** The connected stories should feel like a coherent product workflow at the presenter's actual setup.  
**Existing:** Application shell, filters, return links, source panels, forms and several kinds of draft persistence.  
**Gap:** Handoffs, saved-state expectations and role switches can interrupt the tour.  
**Trace:** D12, J07; assessment L05–L09.

- **BR-12.01 — ENH, P2:** The included story screens shall expose a clear primary next action and a return route that retains member, campaign and relevant filter context. Status wording shall match the underlying business state.
- **BR-12.02 — ENH, P2:** At the agreed presenter viewport, source text, citations, decision controls, QA reason and next actions shall remain readable and reachable without clipped content or obstructing dialogs. Apply the existing design system consistently rather than starting a broad UI rebuild under this BRD.
- **BR-12.03 — ENH, P2:** Draft/save copy shall reflect actual persistence. Server-saved paused review notes, session-stored campaign drafts and unsaved page-memory input shall not all be labeled “Saved.”
- **BR-12.04 — ENH, P2:** The rehearsal procedure shall define the needed role sequence, starting records and a controlled reset of the synthetic demo state. If a reset control is already present, reuse it; otherwise provide a documented test-environment reset procedure. Reset shall not target external or real records.
- **BR-12.05 — ENH, P2:** Focus, keyboard navigation and modal closure shall work for the controls used in the agreed tour. Broader accessibility and device coverage shall remain a separate adoption activity, with no unverified compliance claim.

**AC-12.1:** Complete all included stories at the agreed viewport and role sequence with no dead end or loss of case context.  
**AC-12.2:** Save/draft labels accurately predict what survives navigation or refresh; paused notes persist as documented.  
**AC-12.3:** Reset restores the known prepared starting state and the stories can be repeated. The tour's key dialogs can be operated by keyboard with sensible focus return.

## G. Existing AI benchmark and operational definitions

The existing AI comparison arithmetic is reported as correct by the assessment and shall be preserved. The following BR-13 requirements maintain its definitions and operational-count integrity. **RA-10 and RA-12 add the substantive risk analytics and AI-origin score contribution required in V2; this section does not limit analytics to the old benchmark.**

- **BR-13.01 — KEEP, P1:** Preserve the existing authored comparison: 200 charts, 100 in each arm, ten condition slots per chart and 120 positive/880 negative reference slots per arm. Do not relabel this as a live trial or data measured from the demo session.
- **BR-13.02 — ENH, P1:** Each principal metric shall offer its definition, numerator, denominator, unit, cohort/period and synthetic or operational basis. A deterministic explanation shall use the same definition and underlying values as the chart/card.
- **BR-13.03 — ENH, P1:** AI-stage precision/recall, final human review performance, confirmation yield and illustrated review time shall remain separate measures. Reviewer acceptance shall not be used as a substitute for correctness; generated recommendations shall not be counted as exposure or adoption.
- **BR-13.04 — FIX, P1:** Operational completion metrics shall follow D05 and count the declared unique business object, such as completed tasks, rather than raw save events. Dashboard/campaign drilldowns shall reconcile to the displayed count using the same filters and definition.
- **BR-13.05 — ENH, P1:** Counters based on the latest 100 events shall be labeled recent activity with the applicable scope/window, not lifetime totals. If a lifetime count is required for a specific displayed measure, it shall instead be derived from complete relevant persisted state.
- **BR-13.06 — KEEP, P1:** The 22-versus-36-minute comparison shall remain explicitly illustrative. Existing pause/resume behavior shall not be presented as accumulated active-time measurement or used to claim observed productivity savings.
- **BR-13.07 — ENH, P1:** Completed demo tasks may change operational progress, but shall not improve the frozen AI accuracy percentages, create unsupported savings or imply that simulated receiver acceptance establishes revenue.

### G1. Benchmark values to preserve

Values below are transcribed from the supplied assessment's recalculated synthetic comparison; they are fixture acceptance values, not real-world performance claims.

| Measure | Numerator / denominator or calculation | Expected display | Required interpretation |
|---|---|---|---|
| AI precision | 108 / 135 | 80% | Reference-positive AI flags / all AI flags. |
| AI recall | 108 / 120 | 90% | Detected reference positives / all reference positives. |
| AI specificity | 853 / 880 | 96.93% | Correctly unflagged reference negatives / all reference negatives. |
| Final assisted precision | 102 / 105 | 97.14% | Correct final assisted positives / all final assisted positives. |
| Final assisted recall | 102 / 120 | 85% | Correct final assisted positives / all reference positives. |
| Final manual precision | 84 / 90 | 93.33% | Correct final manual positives / all final manual positives. |
| Final manual recall | 84 / 120 | 70% | Correct final manual positives / all reference positives. |
| Confirmation yield | 105 / 135 | 77.78% | Final positive confirmations / AI flags; includes incorrect confirmations. |
| Illustrative review time reduction | (36 − 22) / 36 | 38.89% | Authored time comparison; not observed or causally established savings. |

**AC-13.1:** Recalculate the comparison from its fixture records and match the listed values using consistent rounding. Each explanation identifies the right denominator and stage.  
**AC-13.2:** Save, return and pass a review; operational totals and drilldowns change correctly while all frozen benchmark values stay fixed.  
**AC-13.3:** Recent-event counters reveal their limited scope. No current session interaction claims measured time savings, live AI accuracy or actual payment impact.

## H. Existing reproduced issues and verification status

| Reproduction | Reported behavior | Current requirement/treatment | Closure condition |
|---|---|---|---|
| R01 | Member 14 saves supported review without source documents. | BR-03.02–03.03, FIX. | Unsupported action blocked for browsing-only records and prepared prerequisites enforced. |
| R02 | Provider2 account save changes practice to PR-001. | BR-11 group, conditional FIX. | Scope preserved and fresh-login access check passes; tour exclusion alone is deferral. |
| R03 | Campaign completes at review save while QA awaits. | BR-05 group, FIX. | Pending/pass/rework counts agree across screens. |
| R04 | Retry of a rejected addition becomes deletion without approved coding dependency. | BR-01.02–01.04, FIX/NEW linkage. | Approved operation retained, original/attempt history linked and premature creation blocked. |
| R05 | A source changed to year 2030 still passes current-period validation. | RA-02/BR-10.05 require actual validation for accepted scoring inputs; arbitrary document-ingestion extraction remains separate. | An out-of-window scoring input is excluded/rejected with reason. Scenario labels alone do not resolve this issue; document any remaining ingestion limitation. |
| R06 | Assigned member 31 returns 404 for coder. | BR-04.01–04.02, FIX. | Every allowed assignment opens for the actual assignee; inaccessible pairs cannot activate. |
| R07 | Refresh increments version without recommendation history. | BR-06 and RA-08, FIX/NEW snapshots. | Changed/no-change, source citations and score-input/version references remain consistent. |
| R08 | Stale expected-version writes both succeed; last write overwrites. | Later concurrency/stale-write work. | Not a demo fix or current gate. Use a single-presenter sequential workflow; do not claim concurrent-user conflict protection. |

The assessment reports **21 existing API acceptance tests passed** and eight reproduced behaviors. Those are historical assessment results; they have not been rerun in preparation of this BRD. A successful reproduction assertion confirms the reported behavior, not that the behavior is acceptable.

## I. Dependencies, validation and remaining scope

### I1. Inputs and owners

| Dependency | Business owner | Required evidence | Handling while incomplete |
|---|---|---|---|
| Official model assets and execution wrapper | Model steward and engineering | Selected package/version, source, validation outputs, supported scope and rounding/adjustment rules. | Required calculator remains incomplete; continue independent workflow work. |
| Scoring member/encounter inputs | Data lead and RA SME | Complete field mapping, source/period eligibility, monthly status and exclusion reasons. | Show scoring coverage/errors; do not use invented defaults. |
| Reviewed codes/source examples | Coding SME | Correct code release, category mapping and source/encounter basis for showcased decisions. | Do not enable unsupported clinical decisions or downstream additions. |
| ACA plan/market assumptions | Actuary/product owner | Benefit-year model, plan/CSR data, aggregation and transfer inputs/assumptions. | Keep valid scoring separate from incomplete financial estimates. |
| Medicaid external score feed | Medicaid program/actuarial owner | Producer, model/version, population, period, normalization, completeness and reference results. | Use a named synthetic external-score example with proper provenance; no false local recalculation. |
| Florida payment methodology | State-program/actuarial owner | Controlling program/rating-period method, model/weights, rate-cell rules and reference reconciliation. | Generic licensed or imported-score demonstration may proceed; state-payment-equivalent claim remains blocked. |
| Medicaid/predictive model license | Product/legal procurement owner | Authorized package or service rights for the selected model. | Keep license-dependent execution unavailable; do not recreate proprietary coefficients. |
| AI evidence capability | AI lead and coding/clinical reviewer | Bounded task, model/run or replay origin, checked citations, outputs and failure behavior. | Use correctly labeled retained-output replay for offline demonstration. |
| Demo scope and rehearsal | Product owner and demo lead | Named supported configurations, actual build/fixture versions, role route and acceptance evidence. | Do not market a partially delivered model family as working coverage. |

### I2. What remains later

Real external data/receiver transmission, production SSO/tenant architecture, broad concurrent editing/recovery, comprehensive device/accessibility certification, managed regulatory audit administration and independently measured clinical/financial outcomes remain separately scoped. R08 concurrent stale-write protection remains open for the single-presenter demo; do not represent it as already fixed.

**Working required risk-model calculations, model-specific input validation, HCC logic, full-member scenarios, recapture and risk analytics are no longer deferred production work.** They are part of the product definition and release gate in this document.

Additional ACA benefit years, licensed grouper coverage and exceptional Medicare branches shall be activated individually after their declared scope passes validation. Final annual policy or a coefficient table alone does not prove a complete model execution path. In the checked CMS index, a complete ACA BY2027 DIY execution package was not located; final BY2027 policy/coefficients are available and can inform a separately validated forward-comparison project.[^M13][^M14]

### I3. Evidence and known limitations

The original assessment remains the source for existing behavior and reproduced defects. No new application tests or source-code changes were performed to produce this requirements revision. CMS model software availability and inspection establish a feasible implementation path, not an already validated Perform+ calculator.

Public vendor pages were reviewed for product capabilities. Their deployed applications, contracted modules, proprietary algorithms and outcome claims were not independently tested. Detailed Inovalon pages could not be accessed reliably in this research, so the comparison relies on seven other vendors with accessible first-party documentation.

The exact current Florida payment model configuration remains unresolved. The model owner's state-use survey and AHCA base-rate documents do not establish every active grouper version, weight, exclusion, normalization or payment rule. Preserve this distinction while implementing the usable configuration, score-ingestion and analysis workflows.

### I4. Implementation handoff

For each requirement, record **existing implementation → classification → reused component → new behavior → applicable model/data scope → acceptance evidence → remaining limitation**. Retain earlier work that already satisfies a requirement. Do not implement parallel score formulas in each page or close a mandatory calculator ticket by hiding it behind an unavailable state.

The product owner should review the actual model coverage matrix and demonstration results before describing the build as an expanded multi-program RA application. That decision uses the numeric and workflow gates above, not the number of screens implemented.

## J. Sources

### Supplied application evidence

- **Perform_Plus_Demo_Assessment.md**, supplied assessment dated 12 September 2026. Used for reported current implementation, source revision, D01–D12 recommendations, AI01–AI05 findings, J01–J11 scenarios, R01–R08 reproductions and synthetic benchmark values. No public URL; supplied document.
- **CitusTech_Perform_Plus_Business_Requirements.md**, version 1 produced in this project. Used for requirement continuity. Version 2 supersedes its restricted scoring/program scope and numeric-or-nonnumeric release gate.

### Official and model-owner references

[^M01]: Centers for Medicare & Medicaid Services (CMS), [Announcement of Calendar Year 2026 Medicare Advantage Capitation Rates and Part C and Part D Payment Policies](https://www.cms.gov/files/document/2026-announcement.pdf), 7 April 2025, especially pp. 4–6. Annual MA/Part D model and adjustment context; verified 13 September 2026.

[^M02]: CMS, [Announcement of Calendar Year 2027 Medicare Advantage Capitation Rates and Part C and Part D Payment Policies](https://www.cms.gov/files/document/2027-announcement.pdf), 6 April 2026, especially pp. 3–6 and applicable risk-adjustment sections. Final policy rather than the earlier advance-notice proposal; verified 13 September 2026.

[^M03]: CMS, [2026 Model Software/ICD-10 Mappings](https://www.cms.gov/medicare/payment/medicare-advantage-rates-statistics/risk-adjustment/2026-model-software-icd-10-mappings), accessed 13 September 2026. Official initial and midyear/final assets, including the Python download.

[^M04]: CMS, [2027 Model Software/ICD-10 Mappings](https://www.cms.gov/medicare/payment/medicare-advantage-rates-statistics/risk-adjustment/2027-model-software-icd-10-mappings), accessed 13 September 2026. Official initial model software, Python software and diagnosis mappings.

[^M05]: CMS, [Announcement of Calendar Year 2025 Medicare Advantage Capitation Rates and Part C and Part D Payment Policies](https://www.cms.gov/files/document/2025-announcement.pdf), 1 April 2024, including pp. 4–5 and model-transition discussion. Historical V24/V28 policy basis; do not apply a historical blend as current PY2026/PY2027 policy.

[^M06]: CMS, [HHS-developed Risk Adjustment Model Algorithm “Do It Yourself” Instructions for Benefit Year 2026](https://www.cms.gov/files/document/cy2026-diy-instructions-07-31-26.pdf), 31 July 2026. Model/software and input/output context, including DIY versus operational EDGE/transfer distinctions.

[^M07]: CMS, [2026 Benefit Year Final HHS Risk Adjustment Model Coefficients](https://www.cms.gov/files/document/2026-benefit-year-final-hhs-risk-adjustment-model-coefficients2025-01-13.pdf), 13 January 2025. Adult/child/infant, metal and factor tables; use the applicable release rather than copied vendor examples.

[^M08]: Florida Agency for Health Care Administration (AHCA), [Medicaid Actuarial Services](https://ahca.myflorida.com/medicaid/medicaid-finance-and-analytics/medicaid-data-analytics/medicaid-actuarial-services.html), accessed 13 September 2026; associated [RY2025–26 MMA Final Base Rates](https://ahca.myflorida.com/content/download/27605/file/RY%2025-26%20MMA%20Final%20Base%20Rates.pdf) and [RY2025–26 LTC Final Base Rates](https://ahca.myflorida.com/content/download/27606/file/RY%2025-26%20LTC%20Final%20Base%20Rates.pdf). Program/rating-period structure; these are not complete grouper/payment specifications.

[^M09]: University of California San Diego, [Chronic Illness and Disability Payment System](https://hwsph.ucsd.edu/research/programs-groups/cdps.html), accessed 13 September 2026; [CDPS 7.3 FAQs](https://hwsph.ucsd.edu/_files/research/cdps/2026-CDPS-7.3-FAQs.pdf), 2026; [Summary of Risk Adjustment Efforts Across States](https://hwsph.ucsd.edu/_files/research/cdps/Summary%20of%20Risk%20Adjustment%20Efforts%20Across%20States.pdf), undated. Model family/licensing and survey context; availability of 7.3 does not establish Florida adoption of that version.

[^M10]: University of California San Diego, [Guidelines for Using CDPS Models for Risk Score Development](https://hwsph.ucsd.edu/_files/research/cdps/Guidelines%20for%20Using%20CDPS%20Models%20for%20Risk%20Score%20Development.pdf), undated, accessed 13 September 2026. Model-owner guidance on configuration, populations and score development; not a Florida regulation or rate certification.

[^M11]: CMS, [Report to Congress: Risk Adjustment in Medicare Advantage](https://www.cms.gov/files/document/report-congress-risk-adjustment-medicare-advantage-december-2024.pdf), December 2024, especially sections 2.4–2.7. Segment/model background; annual final instructions govern current-year changes.

[^M12]: CMS, [2027 Initial Model Software — Python](https://www.cms.gov/files/zip/2027-initial-model-software-python.zip), downloaded and package contents inspected 13 September 2026. Includes model readmes, transforms, mappings, factors, hierarchies and applicable interactions. Inspected V28 output precision and caller responsibility for segment selection; not a completed Perform+ validation run.

[^M13]: CMS, [HHS Notice of Benefit and Payment Parameters for 2027 Final Rule](https://www.cms.gov/files/document/cms-9883-f-patient-protection.pdf), published May 2026; [official final-rule fact sheet](https://www.cms.gov/newsroom/fact-sheets/hhs-notice-benefit-payment-parameters-2027-final-rule). Final benefit-year policy/factor and transfer context; execution readiness remains separately validated.

[^M14]: CMS, [Marketplace Regulations and Guidance](https://www.cms.gov/marketplace/resources/regulations-guidance), accessed 13 September 2026. Published model-package index, including July 2026 BY2026 materials. Failure to locate a complete BY2027 DIY package in this index is a bounded research finding, not proof that no further material exists anywhere.

### Vendor capability references

The following product pages displayed no verified publication date. All were accessed on 13 September 2026. Their descriptions are used as product-design motivation, not as verified performance or contractual model coverage.

[^V01]: Innovaccer, [AI-Powered Risk Adjustment for Payers](https://innovaccer.com/products/risk-adjustment-for-payers). Claims/clinical/pharmacy context, risk opportunities and review workflows.

[^V02]: Cotiviti, [DxCG Intelligence](https://www.cotiviti.com/solutions/risk-adjustment/dxcg-intelligence). Proprietary member/group risk analytics; distinct from automatic CMS payment-model coverage.

[^V03]: Cotiviti, [Suspect Analytics](https://www.cotiviti.com/solutions/risk-adjustment/suspect-analytics). Multi-source clinical/statistical suspecting and prioritization.

[^V04]: Reveleer, [Retrospective Risk Adjustment](https://www.reveleer.com/solutions/risk-adjustment). HCC/RAF opportunities, source review and project/risk reporting.

[^V05]: RAAPID, [Retrospective Risk Adjustment](https://www.raapidinc.com/retrospective-risk-adjustment/) and [Risk Adjustment Technology](https://www.raapidinc.com/risk-adjustment-technology/). Missed/unsupported coding, source justification and review/QA workflow descriptions.

[^V06]: Veradigm, [Risk Adjustment Analytics](https://veradigm.com/risk-adjustment-analytics-and-reporting/). Current/trending/opportunity scores, targeting, contract analytics and financial projection descriptions.

[^V07]: Milliman, [MARA](https://www.milliman.com/en/products/mara). Licensed risk profiles, population comparisons and model selection by purpose/data.

[^V08]: Arcadia, [Risk Adjustment](https://arcadia.io/risk-adjustment) and [HCC Risk Suspecting App](https://arcadia.io/risk-suspecting-software-with-epic). Risk analytics and distinct condition/follow-up workflows.

[^V09]: Veradigm, [Data Submissions and Reconciliation](https://veradigm.com/data-submissions-and-reconciliation/). Risk-aware intake, validation, correction and response processing.


## Companion — agent and generative AI model configuration

[Agent and AI Model Configuration Requirements](CitusTech_Perform_Plus_Agent_Model_Configuration_Requirements.md) defines provider connections, generative model deployments, tested agent versions and runtime controls. It is separate from RA-01 risk-adjustment model configuration. The current delivery is limited to an interactive configuration UI, as requested. Implementation tracking: [UI TODOs](docs/AGENT_MODEL_CONFIGURATION_PLAN.md).
