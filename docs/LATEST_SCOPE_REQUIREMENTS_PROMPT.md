# Prompt: finalize Perform+ analytics and suspecting requirements

Act as a senior healthcare risk-adjustment product analyst and analytics solution architect. Finalize the business and functional requirements for the next iteration of **CitiusTech Perform+**, using the current application as the baseline. Your task is requirements finalization, not implementation. Produce a document that product, design and engineering can agree on and implement without guessing.

Our agreed product definition is:

> Analyze population risk, identify and prioritize suspected conditions, inspect supporting evidence, quantify potential score impact, and export actionable insights.

The product should be heavy on analytics, polished reports, RAF intelligence, financial projections and suspect closure probabilities. It is a **desktop-only application**. We prioritize a credible, populated, visually polished demonstration with connected interactions. Distinguish that release from future production capabilities.

## 1. Scope decisions already made

- This release is a risk analytics and suspecting product. Operational workflow management is outside the scope.
- Member analysis / Member 360 / individual member risk-profile workspaces are deferred. Do not require them to complete the primary product journey.
- Remove member lists from analytics tabs. Use population, cohort, condition, county and provider summaries, charts, comparisons and aggregate drilldowns instead.
- The Suspect Registry may retain suspect-level rows, identifiers and inline evidence summaries. This is not authorization to rebuild a member-analysis workspace.
- Chart review execution, coding QA, campaign assignment, owners/work queues, chart chase, document-intake operations, provider task handling, pre-visit workflows, submissions and operational audit workspaces stay hidden.
- Underlying workflow APIs, history, role protections and clinical safeguards are retained. Do not propose deleting them or treating hidden UI as a server-side security boundary.
- Agent/provider configuration screens also stay outside the visible core experience. Live inference and enterprise SSO are not prerequisites for this demonstration.
- The primary journey is: **Explore population → identify opportunity → inspect evidence → model impact → export insights.**

Clarify whether individual-member inputs in the existing RAF/model lab should remain as an optional technical capability or be replaced by aggregate scenarios. Do not silently reintroduce member analysis through this ambiguity.

## 2. What already exists

Treat the following as an implementation inventory, not a claim that every broader business requirement is complete. Verify against the repository when available and label anything you cannot verify.

**Foundation and interface**

- Next.js/React/TypeScript, Tailwind/shadcn UI, FastAPI and PostgreSQL, with separate UI/API/database components.
- Working local authentication, role/practice access restrictions and a superuser. Existing permissions also apply to protected data and exports.
- Desktop shell, white collapsible sidebar, IBM Plex Sans and a shared cobalt/teal palette. Existing branding is CitiusTech Perform+ with the Northstar & Meridian example organization.
- Roughly 10,000 synthetic members, Florida residence data across 12 counties, 30 assigned practices and roughly 1,500 synthetic findings. Six detailed clinical stories have retained sources; those stories are not evidence that every population record has a complete chart.
- Existing clinical source history, calculation history and exports must be preserved.

**Risk calculation and RAF capabilities**

- Versioned model configurations and persisted input snapshots, runs, factors/categories, exclusions, score stages and scenarios.
- Eight executable configurations within declared scope: MA V28 PY2026; MA V28 PY2027 Initial and later-run forecast; PY2027 RxHCC MA-PD/PDP Initial and forecast configurations; ACA HHS-HCC V08 BY2026.
- Medicaid external-score import with producer/model/period/normalization metadata and retained import exceptions. This is not a native Florida Medicaid payment engine.
- Full-member add/remove/combined hypothetical calculations and saved results exist in the model lab. Historical V24 execution/comparison remains unavailable.
- Default MA population calculation has completed for 10,000 members. Other configurations have reference/profile coverage; do not assume every configuration already has a fully populated 10,000-member run.
- Raw, adjusted, captured, supported, submitted, accepted, eligible, reported and potential score concepts already exist. Recommend which belong in an analytics-focused UI without merging their definitions.

**Analytics and reporting**

- Risk overview, calculation coverage, score distributions, condition prevalence, annual recapture and comparable-period analysis.
- County, assigned-practice and county/practice analysis, with intersecting filters, ranked comparisons and a heatmap. Geography means member residence; provider means assigned practice, not necessarily the treating clinician on a claim.
- Member-month-weighted portfolio calculations, explicit denominators, missing/stale counts and retained-run provenance.
- Analytics tabs currently cover Executive, Risk & conditions, Geography, Suspecting, Financial and AI Impact.
- The current local UI refresh replaces individual-member lists with aggregate charts/summaries, adds histogram/percentile views and aggregate period-change direction counts, and hides Member risk profiles. Confirm the latest working tree/runtime rather than relying on older screenshots.
- Existing JSON/CSV/ZIP export mechanisms and 10/25/50/100 pagination for suitable tables. New exports include aggregate analysis and synthetic suspect planning assumptions.

**Suspecting**

- Registry with finding types, evidence levels, statuses, priority, search/filtering, source/recommendation history and inline evidence excerpts when a retained source exists.
- Relevant types include documentation gaps, historical conditions, predictive signals, specificity/clinical questions, accuracy corrections and source-readiness issues. Not every type is a confirmed diagnosis or a positive financial opportunity.
- The current refresh exposes the broader synthetic finding population instead of defaulting to only the handful of interactive review cases.
- New visual summaries include closure-likelihood bands, evidence-to-expected-outcome comparisons, condition concentration and finding mix.
- Missing planning estimates are populated through a shared, explicitly authored synthetic planning model. Initial probabilities use Strong/Moderate/Limited evidence assumptions with adjustments for historical and predictive findings. These are **not calibrated probabilities**.
- Illustrative score exposures are separate from actual model-calculated scenario deltas. Existing model scores are not overwritten or fabricated to fill gaps.

**Financials**

- Existing retained financial sensitivity methods distinguish MA, ACA and Medicaid assumptions and preserve saved inputs/results. They are not payment reconciliation.
- The current UI refresh adds an MA portfolio planning view: reach, realization, monthly benchmark and horizon controls; conservative/base/optimistic outcomes; cumulative projection curves; and transparent formula/assumption disclosure.
- That portfolio view uses authored exposure assumptions and probability weighting. It retains one positive exposure per member to limit overlap; this is not a mathematically exact joint model scenario or proven attribution method.
- Accuracy corrections are separate from positive opportunity. Do not call all score changes revenue uplift.

**AI, evidence and delivery limits**

- Prepared analyses, bounded source-linked explanations, retained model-output replay and a frozen AI evaluation comparison exist. They are not a deployed live inference service or measured live financial contribution.
- Provider communications, retrieval transitions and receiver outcomes are prepared local behavior.
- TXT/PDF intake preview does not establish production document ingestion or OCR. Native external-score CSV parsing/import exists.
- Public AWS hosting has been decommissioned. The application can run locally; deployment automation is disabled. Requirements work must not provision resources or re-enable deployment.

## 3. Requirements to finalize

For each area, explain the user decision it supports, inputs, calculations, filters, visuals, interactions, exports and acceptance criteria.

**A. Executive and population analytics**

Define the headline metrics, risk distribution, trends, category burden, recapture gaps, score coverage, period comparisons and opportunity summaries. Specify eligible denominators, enrollment/member-month weighting and comparable cohorts. Include zero-data, partially scored, stale-data and unsupported-model states.

**B. RAF and model intelligence**

Define captured versus potential risk, model/year/run context, what-if scenarios, hierarchy/interaction/overlap treatment, and comparability rules. Keep raw and adjusted scores explicit. Differentiate actual period change from fixed-input model change. Missing historical execution must remain unavailable rather than receiving a fabricated comparison.

**C. Suspect intelligence and closure probability**

Define the suspect taxonomy, duplicate/member-condition identity, opportunity priority and evidence signals. Define exactly what “closure” means and its prediction horizon: evidence obtained, clinically supported finding, accepted coding or another outcome. Do not use these interchangeably.

Specify probability inputs, exclusions, calibration requirements, confidence/uncertainty, thresholds, freshness and explanation. Separate rule-based illustrative estimates from empirical closure rates and validated predictions. Explain how missing evidence, unsupported hypotheses, already resolved items, corrections and overlapping findings affect estimates and ranking.

**D. Financial projections**

Define scenario methodology by program; assumptions such as score basis, normalization, benchmark, duration, reach, realization and uncertainty; probability weighting; and overlap avoidance. Prevent double-counting closure probability or applying one generic dollars-per-RAF multiplier across programs.

Separate gross potential, probability-adjusted opportunity, corrections, modeled net value and actual reconciled payments. Label estimates clearly. Define conservative/base/optimistic assumptions and how sensitivity charts, controls and exports reconcile.

**E. Geography and provider analytics**

Define county, practice and combined dimensions; attribution timing; intersecting filters; comparability; minimum cohort sizes; missing locations; and authorized scope. Use aggregate drilldowns and rankings without individual-member lists.

**F. Reports and visual design**

Propose a concise report catalog. For each report, specify audience, question answered, metric definitions, primary visualization and export. Use appropriate visual variety—distributions, trends, heatmaps, waterfall/bridge charts, scatterplots, concentration/Pareto views and scenario ranges—not decorative chart variety.

Retain consistent spacing, typography, palette, clear legends/units and readable empty/loading states. Reports should be presentation-ready, with assumptions and provenance accessible without overwhelming the page. List required export formats and distinguish existing capabilities from proposed PDF/presentation outputs. No mobile designs.

**G. Data completeness and demonstration data**

Specify required tables/entities and fields for cohorts, enrollment, geography, providers, diagnoses/evidence, model runs, suspects, probability inputs, outcomes and financial assumptions.

Identify what is already populated, what can be derived and what needs additional authored synthetic records. Require stable identifiers, reproducible generation, internally consistent distributions, preserved provenance and explicit synthetic origin. Do not populate missing clinical facts, official scores or observed outcomes with unlabeled guesses. Include demonstration coverage for meaningful low/medium/high opportunity, corrections, uncertainty, missing values and empty filter intersections.

## 4. Required deliverables

1. A concise product scope statement, primary users/personas and decisions supported.
2. An **existing / enhance / new / deferred / unable-to-verify** capability matrix, with repository or screen evidence where available.
3. Final information architecture and screen/report inventory. Identify hidden legacy surfaces without turning them back into requirements.
4. Prioritized requirements with stable IDs and testable acceptance criteria: current demo must-haves, follow-up enhancements and future production work.
5. A metric dictionary covering formulas, units, numerator/denominator, weighting, time period, filters, provenance, assumptions and unavailable/stale behavior.
6. A dedicated closure-probability specification and a dedicated financial-projection specification, including calibration limits and overlap handling.
7. A data-gap matrix and synthetic-data population plan.
8. Representative analytics and suspect journeys, including exports and cross-report reconciliation checks.
9. A list of consequential open decisions with recommended defaults. Clearly separate confirmed requirements from recommendations and unresolved assumptions.
10. A requirements-to-current-implementation traceability table and a final implementation-ready backlog.

When the repository is available, inspect `README.md`, `TODO.md`, `docs/PRODUCT_HANDOFF.md`, `docs/ANALYTICS_REFRESH.md`, `docs/FLORIDA_ANALYTICS_PLAN.md`, `docs/BROWSER_E2E_AUDIT.md`, `docs/AUDIT_GAP_CLOSURE.md`, the V2 business requirements, `apps/web/src/lib/workflow-flags.ts`, `apps/web/src/lib/suspect-planning.ts`, the analytics/registry components and `apps/api/app/risk_*` modules. Older documents contain workflow-heavy requirements and stale delivery descriptions. The explicit scope in this prompt takes precedence; record conflicts rather than importing the old backlog wholesale.

Do not start development, assume production readiness, claim compliance/certification, invent live integrations or restore AWS hosting. Finalize the requirements first. Keep recommendations practical for a polished analytics and suspecting demonstration, while making the path to credible production metrics explicit.
