# Business requirements V2 — implementation plan

**Status: development approved; implementation and verification underway.**

Prepared 12 September 2026 after reading all 777 lines of [Business requirements V2](../CitusTech_Perform_Plus_Business_Requirements_v2.md) and inspecting the existing implementation. The initial delivery stopped after planning as requested. The user subsequently approved development. [Fresh verification](V2_VERIFICATION.md) and the active TODO checkpoint record current delivery; the rest of this document preserves the approved implementation scope.

## Branch and baseline

- Branch: `codex/business-requirements-v2`, based on fetched `origin/main` at `9b77300232c1834eb0816069dd18c40a7e37d628`.
- Isolated checkout: `/home/mahammad/Desktop/ct/.local/worktrees/business-requirements-v2`.
- Remote: `MahammadRafi06/citustech-perform-plus`.
- The original checkout contains concurrent UI stylesheet changes. They remain in place; this plan does not absorb or overwrite them. Reconcile the approved visual baseline before later UI work.
- Requirements SHA-256: `a72a9c1d12ca802b0a0930b00aa4e9da65a8ab595e250f5cf343509c403bcbda`. The supplied document is copied unchanged.
- Existing acceptance reports describe the previous increment. They are historical evidence, not new V2 test results. Source inspection and official-asset discovery are the evidence produced for this plan.

The active backlog is [TODO.md](../TODO.md). [The requirement matrix](V2_REQUIREMENTS_MATRIX.json) maps every active requirement to its existing implementation, classification, reused component, proposed change, model/data scope, planned acceptance evidence and remaining limitation. It contains **100 RA requirements and 70 retained BR requirements**. RA-14.05 and RA-14.07 are additional coverage; the other 98 RA requirements are mandatory. Retired BR-02.01–05 and AC-02 are recorded as superseded by executable scoring.

## Product outcome and scope

Deliver working, explainable risk calculation connected to the current clinical workflow. Required scope includes MA, historical model comparison, Part D, ACA and a Medicaid external-score journey. The nonnumeric Casey fallback and hand-entered headline totals cannot satisfy V2. Model availability or a polished unavailable state does not close a mandatory calculator ticket.

Keep the existing Next.js, Tailwind, shadcn/ui, FastAPI and PostgreSQL application, local authentication and local RBAC. UI, API and database remain separately deployable Kubernetes components. This increment adds no external identity system, new agent platform or blanket architecture rewrite. Preserve the desktop design system, IBM Plex Sans and plain status text without colored backgrounds or dots. Improve the existing screens and navigation as the capabilities are connected; mobile design is outside scope.

Two delivery gates organize the work, but both are needed for expanded-demo acceptance:

1. **Core risk gate:** validated MA configurations and historical comparison, complete scoreable population, ledger, scenarios, recapture, clinical/QA connections, score stages, aggregates and mandatory provenance.
2. **Expanded gate:** working RxHCC and ACA, Medicaid external import/analysis, validated bounded AI example or genuine retained-output replay, financial sensitivities and the complete D1/D2 rehearsal.

ESRD/PACE execution, licensed Medicaid grouping and further model packs remain separately approved additional coverage. Unknown ESRD/PACE status must already produce a routing exception in the mandatory MA path. Known ESRD/PACE membership must route to its declared exceptional configuration and remain unavailable if that pack is inactive; it must never fall through to ordinary MA. Real receiver transmission, production SSO/tenancy, broad concurrent-edit protection, arbitrary OCR ingestion, certification and measured clinical/payment outcomes remain later work. R08 remains open under a sequential single-presenter workflow.

## Current application: reuse and concrete gaps

| Area | Reuse | V2 change |
|---|---|---|
| Local access and persistence | Existing accounts, sessions, permissions, practice scope and saved workflow state | Add scoring permissions and versioned calculation storage without widening clinical access or resetting accounts |
| Data and findings | Synthetic population, prepared sources, registry and six reviewed stories | Complete model-specific inputs, monthly eligibility, stable finding/episode identity and separate score/review readiness |
| Review and QA | Exact source viewer, decisions, independent pass/rework and retained versions | Attach code occurrence/input/run references, require pass rationale and update only the supported score basis |
| Tasks/provider/intake | Reachable assignments, cohort preview, source receipt/publication and same-member handoffs | Bind completion to the requested evidence/response episode; make received-batch partitions exclusive; enforce actual date/source eligibility |
| Scenarios | Existing member/scenario surfaces and Casey explanation | Replace null scores with full-member execution, hierarchy/interaction explanations and historical fixed-input comparison |
| Submissions | Approved operation linkage, additions/deletions, retained attempts and retries | Complete stage inputs, explicit eligibility/report fixtures and discrepancies; preserve actual operation and provenance |
| Analytics and AI | Existing screens, source-linked explanations and frozen benchmark | Calculated aggregates/recapture, genuine AI/replay origin records, independently validated citations and noncausal score contribution |
| Export and rehearsal | Selected-case ZIP, controlled synthetic reset and presenter route | Mandatory reproducible calculation manifest, scoring-state reset rules and complete numerical/visual evidence |

The source audit found specific changes that cannot be treated as already complete:

- `assessment.py` selects the first member opportunity and `main.py` collapses member-to-opportunity state. Multiple findings need stable IDs before independent review or combined impact works.
- Existing `runs` are prepared-analysis activity, not scoring executions. Keep their identities distinct.
- QA currently requires rationale only for rework. BR-05.03 adds a concise rationale or selected reason for pass.
- Intake currently overlaps matched and quarantined counts. BR-08.06 requires mutually exclusive received-stage partitions, separate from validation/publication outcomes.
- Source validation checks kind/status/signature but does not enforce the calculation run's service window. R05 is open for accepted scoring inputs; labels alone cannot fix it.
- Current report comparison derives a matching presence result from the submission itself, while eligibility remains unevaluated. V2 needs independent prepared receiver/report inputs and discrepancy examples.

## Model coverage and activation matrix

Official discovery is documented in [Model discovery](references/v2-model-discovery.md). Downloading or inspecting an asset establishes availability only. Every configuration remains unvalidated until its wrapper, routing, input rules, precision and independent output evidence pass.

| Configuration | Required executable or external scope | Validation dependency / release boundary |
|---|---|---|
| MA V28 / 2024 CMS-HCC, PY2026 | Official available Midyear/Final Python release; community aged/disabled dual variants, institutional and supported new-enrollee profiles | Select the correct one of the official outputs from effective-dated eligibility; validate raw/adjusted outputs and the applicable PY2026 factors |
| MA V28, PY2027 | Distinct configuration using the available Initial Python release and its declared data window | Do not call Initial software Midyear/Final; any later-window scenario is an explicit forecast with its software/data assumptions |
| Historical V24/V28 | Same-input comparison using separately pinned historical packages, mapping releases and a common valid service-code subset | Official PY2025 bundle supplies V24/V28 SAS assets. Obtain authorized reference execution or independently reviewed reference outputs before activating an equivalent V24 adapter; no invented PY2027 V24 normalization |
| RxHCC, PY2027 | Separate MA-PD and PDP configurations; continuing-enrollee and supported new-enrollee/LIS/institution profiles | Validate the applicable output selection and distinct normalization/configuration; retain Part C and Part D separately for the same member |
| ACA HHS-HCC V08, BY2026 | Official adult, child and infant routes; supported metal/CSR configurations, Rx/duration, infant maturity/severity, interactions and affiliated-cost-factor terms; enrollment-weighted plan outputs | Validate the model's age reference and all declared terms. Current asset's late-2026 ICD validity remains incomplete: initial validated service-date scope is January–September 2026, pending the official update |
| Medicaid external scores | Named synthetic external producer/model/version, matched period/population, supplied components, rate cells, normalization/state-factor comparison and export | Validate feed coverage and unscored rules. Input changes require external refresh; do not invent diagnosis deltas or unavailable components |
| Florida external example | Explicit MMA/LTC/dental and rating period, selected external-score method and capitation assumptions | Keep exact state-payment reproduction inactive until controlling AHCA/actuarial methodology and reference reconciliation are supplied |
| Additional coverage | ESRD/PACE execution, licensed Medicaid grouper, further years/segments | Separate asset/methodology/license and independent validation gates; these cannot replace the mandatory families above |

The official [2026/2027 submission-window memo](https://www.cms.gov/files/document/deadline-submission-risk-adjustment-data-use-risk-score-calculation-runds-payment-years-2026-2027.pdf) places PY2027 Initial service dates at **1 July 2025–30 June 2026**, and Midyear/Final at **1 January–31 December 2026**. Original August/September 2026 showcase documents must retain their dates and stay outside the official Initial input set. Use separate eligible reference fixtures and an explicitly named later-run forecast for the original stories until compatible execution/source rules are validated. Verify source/encounter policy independently of the ICD mapping, including applicable PY2027 audio-only and unlinked chart-review rules and exceptions.

The Python packages ship input templates but no ready-made expected-output test suite. Reference generation is a delivery dependency, not a green check. Run the pinned official implementation separately from the application wrapper, retain its inputs/commands/outputs and have the relevant model/coding scope reviewed. For V24, acquire authorized SAS reference execution or an independently reviewed reference dataset; an equivalent port cannot validate against itself. Preserve package notices and investigate redistribution/CPT-table terms; do not invent a license identifier.

## Proposed implementation design

### Shared calculation contracts and storage

Retain the existing workflow state and add versioned PostgreSQL records for model configurations, immutable input snapshots, diagnosis occurrences, validation/exclusion results, calculation runs, stage snapshots, scenario runs, batch work and external score imports. Store payloads and indexes needed for member/configuration/period lookup; do not put all 10,000-member factor histories in the bootstrap response. Existing prepared-analysis run history remains a separate resource.

One backend calculation interface serves member detail, model lab, registry marginal effects, campaign union calculations, stage bridges, aggregate analytics and financial inputs. The UI formats returned values and never maintains an independent scoring formula. Capabilities distinguish locally executable configurations from external-score-only configurations.

Each result identifies input hash/version, asset hashes, configuration and software release, period, chosen segment, source/code exclusions, mapped/retained/suppressed factors, transformations, precision, run time, score basis and origin. Configuration/input changes create new runs. Failures leave earlier valid runs inspectable with their original basis. A cache key includes all effective calculation inputs and configuration assets.

Use persisted batch work with bounded chunks and explicit resume/retry in the existing API service. Prove that expensive execution does not block ordinary interactions; measure before introducing any extra infrastructure. Use a single active demo processor with safe restart/resume behavior; do not imply that this resolves general concurrent workflow writes.

### Inputs, fixtures and scoring rules

- Preserve all original clinical text, source IDs/versions and authored dates. Add clearly authored scoring/encounter supplements with coding review where needed, especially Casey; broad source language must not become invented diabetes type or CKD stage.
- Define program-specific schemas and effective-dated monthly eligibility. New enrollment in a plan does not automatically mean Medicare new-enrollee eligibility. Missing routing/source attributes remain exceptions, not lowest/highest defaults.
- Preserve diagnosis occurrence identity, service/code release, source linkage and replacement/void relationships. Mapping success, signature and current-looking text are insufficient source eligibility.
- Declare exactly **10,000 main-cohort members** with complete valid inputs, plus separately counted intentional negative fixtures. Record the exact expected scoreable member/member-month counts in the fixture manifest before execution. Every expected valid record must succeed; six clinical examples are insufficient.
- Keep the six source-review stories separate from the larger scoring population. Score-ready members do not gain unsupported review actions. Add distinct Part D, ACA and Medicaid examples with their actual input shapes.
- Keep raw outputs separate from normalization, coding-pattern, blending and other applicable transformations, with factor/order/source. Apply each only once. Match authoritative rounding; V28 canonical Python scores use three decimals. Use a maximum absolute difference of `0.000001` only for independently available unrounded values unless their specified precision requires a documented alternative.

### Score stages, scenarios and aggregation

| Basis | What changes it |
|---|---|
| Captured baseline | A new validated captured-data snapshot |
| QA-supported scenario | Exact approved addition/correction after independent QA |
| Submitted-set score | Recorded submission-set change |
| Accepted-set score | Explicit actual or simulated receiver acceptance result |
| Eligible-set score | Explicit program/report eligibility result |
| Reported result | A new imported report or separately authored report fixture |
| Potential scenario | Saved hypothetical inputs in a separate branch |

Each calculated stage uses its complete applicable member-period diagnosis set, including existing baseline/external occurrences. Deleting one occurrence must retain a category supported by another qualifying occurrence. Acknowledgement is not acceptance; acceptance is not risk eligibility or payment. A source, provider response or AI suggestion never changes approved inputs by itself.

The canonical marginal calculation is `score(baseline + candidate changes) - score(baseline)` under one pack and period. Combined opportunities use the union once. Preserve positive, negative and zero results. Comparison modes are explicitly separate: changed coding inputs under one model, fixed inputs under two configurations, and actual prior/current periods. A common adjusted comparison needs a reviewed common basis; raw vintage comparisons must be labeled as such.

MA internal portfolio measures use eligible member-month weights and the applicable monthly score where eligibility changes. ACA follows its defined plan aggregation. Medicaid follows the declared imported-score/rate-cell method. Every aggregate records contributing run IDs, weights, exclusions, completeness and freshness. Attribution uses one declared order/joint method and an explicit shared/residual term where necessary; do not double-count interactions or overlapping findings.

Recapture uses comparable eligible prior-period member-condition pairs. Maintain separate clinical and receiver-eligible numerators, periods and exclusions. Historical diagnoses do not automatically enter current supported inputs. Assessed-not-current is a valid resolution.

### AI, financial scenarios and access

Add a bounded read-only AI interface for the authorized member/source inputs and deterministic result references. A genuine retained-output replay is acceptable for an offline presentation, but prepared templates cannot be relabeled as model output. Validate member/source IDs and exact citation spans outside the model. Retain model/run/replay identity, abstention and current/historical/negated/uncertain/family/conflicting evidence classes. Source content grants no tools or clinical authority.

Track exposure, inspection, disposition and QA separately. AI/replay, rules and manual origins remain distinct. Calculate approved AI-origin contribution by comparing complete input sets with/without the relevant approved changes under the same configuration; group overlap and label the result noncausal. Preserve the frozen 200-chart benchmark and illustrative timing, including its denominators, independently of session activity.

Financial sensitivities retain their own assumptions/version and use valid scores without changing them. MA needs payment basis/months/adjustments; ACA needs state-market pool, plan liability/enrollment shares, premium basis and applicable IDF/AV/ARF/GCF/year/high-cost terms; Medicaid needs period/rate cell/normalization/capitation. Missing required assumptions block the financial estimate, not an otherwise valid score. Keep actual payment unreconciled in the standard route.

Define minimum permissions for reading scores, running/saving hypothetical scenarios, importing external scores and stewarding/activating model configurations. Reuse local roles and scopes; model stewardship does not grant coding or QA. Preserve superuser access to all pages/actions, ordinary administrator clinical restrictions, actual-assignee reachability and provider2's PR-002 boundary. No credentials enter committed documentation or exports.

## Sequence and dependencies after approval

| Phase | Tickets | User-visible checkpoint |
|---|---|---|
| 1. Foundations and reference preparation | V2-01–06, V2-10, V2-20, V2-31 | Inspectable model/input readiness and consistent program/run context; contracts ready for all required families |
| 2. MA calculation and explanation | V2-07–12, V2-19, V2-21 | Actual member score, factor ledger, full-member scenario and independently validated V24/V28 comparison |
| 3. Connected risk work | V2-13–18, V2-22–23 | Recapture/registry → review/QA → separate receiver stages and reconciled overview/campaigns |
| 4. Required breadth and contribution | V2-24–29 | Validated AI/replay example, Part D, ACA, Medicaid external scores and program-specific sensitivity |
| 5. Evidence and release rehearsal | V2-30, V2-32–36 | Complete cohort, consistent exports, clinical regressions, inspected desktop screens and D1/D2 evidence |
| Separate optional coverage | V2-37–40 | Richer ZIP narrative, exceptional/licensed/future packs only when separately authorized and validated |

Reference discovery, independent expected-result preparation and model-specific input contracts begin together in Phase 1. Part D/ACA adapter work can proceed independently once those contracts exist; the table is dependency order, not a request to defer required breadth. The historical V24 dependency blocks completion of the required comparison, while MA-only scenario and ledger work can proceed if its external reference oracle is pending. Every feature ticket includes relevant API/UI verification; the final phase integrates evidence rather than postponing all checks.

## Desktop screen coverage

| Existing surface | Planned change and owner ticket |
|---|---|
| Sign-in, administration and shell | Preserve working local access; add scoped model actions and shared context without another visual redesign (V2-20/31/34) |
| Overview and analytics views | Calculated current/comparable prior, supported movement, recapture/correction, distributions, stage/model bridge and metric drilldowns (V2-22) |
| AI suspect registry | Five finding types, model/category/period, “If supported” marginal result, overlap and reproducible named ranking (V2-14) |
| Member 360, source viewer and Chart review | Score/segment/readiness, complete factor ledger, exact sources, current/proposed/previous runs and protected decisions (V2-12/15/21) |
| QA and coding integrity | Versioned rationale, valid no-positive outcomes, corrected source/run linkage and fresh independent review (V2-15) |
| Campaigns and provider programs | Recapture/category readiness, member union impact, separate weighted portfolio delta, exact reachable tasks and provider attribution (V2-13/23) |
| Provider/pre-visit, chart chase and intake | Episode-specific completion, current evidence handoff, exclusive received counts and date/source validation (V2-04/16) |
| RAF & model lab | Input-driven member/cohort comparison, isolated scenarios, source-linked review task and mapping explorer (V2-11/12/21) |
| Data operations / Models & data | Configuration inventory, activation evidence, coverage/exceptions, imports and batch progress (V2-01/02/19/26–28) |
| Submissions, reconciliation and audit | Full stage inputs, retained operations/attempts, discrepancies, source/run drilldowns and calculation export (V2-17/18/30) |
| AI Impact and financial scenarios | Actual origin/exposure trace, noncausal approved score effect, unchanged benchmark and separate program assumptions (V2-24/25/29) |

V2-34 inventories the actual sixteen existing route families plus newly exposed tabs/dialogs, so no supporting screen is omitted by this grouped table. Keep model/year/run/basis/member/filter context through links and return paths.

## Acceptance evidence required before completion

1. **Independent numerical evidence:** each mandatory configuration and declared profile passes AT-01–05/14/16 at official precision, with retained input/reference output, asset digest and validation scope. Cover demographic-only, representative segments, duplicate neutrality, hierarchy suppression, actual interaction, addition/removal, invalid/out-of-window input, age/CSR/duration boundaries and deterministic input-order behavior.
2. **Complete population evidence:** a versioned manifest declares valid member/member-month totals before execution. V2-35 proves all expected valid records succeed, named negative fixtures reconcile and batch restart/retry works. Display stale/incomplete aggregates until refresh actually completes.
3. **Connected state evidence:** AT-06–13/15 and applicable AC-00/01/03–13 verify independent QA, fresh decision versions, stage independence, surviving duplicate occurrences, recapture denominators, actual-assignee permissions, origin attribution, complete-input campaign unions and truthful financial assumptions. R01–04/06–07 are regressions; R05 adds actual scoring-input validation; R08 stays recorded as later.
4. **Export evidence:** reopen old run/input/configuration snapshots after later changes; exported components, precision, stage, weighting and exclusions match their selected run. Required calculation provenance is complete even if optional richer ZIP narrative is not undertaken.
5. **Desktop evidence:** run the exact candidate revision in isolated UI/API/database components. Capture before/after at matching **1366×768, 1440×900 and 1920×1080** where representative; at minimum all sixteen routes at 1440×900, with key source/QA/lab/stage dialogs at all three. Store screenshots plus route, role, state, viewport, build and asset metadata under `screenshots/business-requirements-v2/`. Inspect rendered output and fix clipping, density, contrast, table alignment, focus and navigation defects. Reconcile the concurrent style baseline before capturing “before.”
6. **Measured performance:** document actual host, dataset, pack, warm-up and sample method; report warm cached open p95 target <1 s and single-member recalculation p95 target <2 s separately from batch duration. If unmet, retain honest calculating states and report the limitation; do not invent a pass or generalize to production.
7. **D1/D2 rehearsal:** identify build/model/fixture versions and complete all nine executive steps, plus Riley's intake and relevant account maintenance. Show positive, negative and zero effects, distinct required families and the frozen benchmark. Rehearse controlled synthetic reset and role sequence; protect shared runtime/accounts and real/external records.

Use meaningful existing and targeted API tests, TypeScript checks and production builds when implementation begins. Keep expected model values independent from application code. Test only changes and acceptance risks needed for this increment; no claim of production concurrency, clinical accuracy or real payment reconciliation follows from these local checks.

## Dependencies and remaining decisions

| Dependency | Planned resolution / owner | Effect if unresolved |
|---|---|---|
| Historical V24 independent reference | Engineering/model steward arranges authorized reference execution or reviewed expected values | Historical comparison remains open and blocks its mandatory acceptance; other work continues |
| Model/code/source eligibility and fixture review | Model steward and coding SME review release rules and clinical supplements | Unvalidated clinical examples cannot authorize coding or downstream additions |
| Late-2026 ACA mappings and later Medicare software | Pin current validated scope; register later assets as separate versions after verification | Dates outside available validated assets remain explicit exceptions/forecasts, not hidden successful execution |
| Package notices and applicable table rights | Review included/public distribution terms before redistributing assets | No unsupported license claim or unlicensed proprietary coefficient copy |
| ACA market and Medicaid external assumptions | Product/actuarial owner reviews named synthetic inputs and declared methods | Calculated scores remain usable; incomplete financial/state-payment claims stay blocked |
| Genuine AI example | AI/coding reviewer validates an authorized retained-output replay or bounded live run | Prepared templates alone cannot close RA-08.02 |
| Concurrent UI changes | Recheck original checkout and selected merge baseline after approval | Preserve others' work and record the actual screenshot baseline |

No new service subscription, licensed software purchase, external message, production deployment or public publication is assumed. Requirements with missing external inputs remain visibly open while independent implementation can proceed after approval.

**Approval checkpoint:** review this plan, the required model scope and the unchecked V2 backlog. Development starts only after the user's approval.
