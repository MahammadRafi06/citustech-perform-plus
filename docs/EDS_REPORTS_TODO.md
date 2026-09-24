# EDS Reports

Source: `EDS.md` (read in full, 663 lines).

Scope: a read-only EDS analytics workspace in the existing application. Retain local authentication, role scope, Member 360 clinical evidence, and the current design system. No submission, coding, or workflow mutation controls.

- [x] Add EDS navigation, permission mapping and shareable report/filter URLs.
- [x] Implement all 20 reports, grouped into Submission Performance, Risk Reconciliation, Diagnosis Integrity and Data Quality.
- [x] Add contract-first filters, service/payment years, hierarchy and submission dimensions.
- [x] Create coherent, deterministic local encounter/diagnosis/model-output fixtures with explicit provenance.
- [x] Preserve source denominators, final MAO-004 precedence, member-level score reconciliation, separate Part C/Part D outputs, and independent support checks.
- [x] Add chart-to-record filtering, 50-record pagination and read-only submission/evidence lineage.
- [x] Verify data invariants, typecheck/build, and inspect all report layouts and interactions in the browser.

## Report Coverage

Submission: acceptance funnel (1), timeliness (5), rejection Pareto (6), duplicate/adjustment integrity (7), completeness (10), acknowledgement aging (19).

Risk Reconciliation: diagnosis yield (2), CMS-HCC/RxHCC reconciliation (3), unlinked CRR exposure (4), service eligibility (16).

Diagnosis Integrity: audit exposure (8), chronic recapture (9), CRR lifecycle (15), prevalence drift (17).

Data Quality: default data (11), beneficiary identity (12), provider eligibility (13), capitation completeness (14), X12 conformance (18), special services (20).

## Data Boundaries

The local reporting dataset is authored and not connected to CMS. The information popover and lineage panel disclose this. Model outputs are stored scenario fixtures, not official model execution. Financial estimates use explicit payment assumptions; Part D has its own subsidy basis. MAO-004 remains separate from preliminary MAO-002 and documentation support. Internal thresholds are identified as internal; no freshness SLA or live deadline is invented.

Policy reference checked: [CMS 2027 final announcement](https://www.cms.gov/newsroom/press-releases/cms-finalizes-2027-medicare-advantage-part-d-payment-policies-strengthen-accountability-long-term). MAO-004 reference: [CSSC MAO-004 guide](https://www.csscoperations.com/internet/csscw3_files.nsf/F2/MAO-004%20User%20Guide.pdf/%24FILE/MAO-004%20User%20Guide.pdf).

## Verification — 2026-09-24

- All 20 report views rendered in the browser, with populated charts and records.
- Production Next.js build, including TypeScript validation: passed.
- `node --test apps/web/tests/eds-reports.test.mjs`: 11 passed.
- Browser checks: contract and provider hierarchy; rapid consecutive selections; Part C/Part D changes; production/test and EDR/CRR filters; reset; 10/50/100-row pagination; next page; funnel-gap drilldown; evidence drawer open/close; canonical members first where applicable.
- Desktop canvas measured 1,910px for a 1,910px content viewport; no horizontal page overflow. Screenshots were inspected for funnel, donut, comparison, waterfall, trend, audit matrix and evidence views.
- Browser console contained existing extension-origin errors and extension-injected hydration attributes (`bis_skin_checked`), with no EDS runtime errors observed.
- Local UI remains available at http://localhost:3000/eds. API and PostgreSQL health checks passed. No cloud deployment was performed.

The reporting fixtures do not execute the official CMS software, ingest live acknowledgements, transmit 837s, or perform remediation. Regulatory deadlines, payment reconciliation against actual CMS artifacts, and real source-file ingestion require the production data integration described in EDS.md. The authored fixture basis is exposed in report information and record lineage.

A full-disk interruption was recovered from the development source map. Only the unused app production webpack cache and unused uv package-cache entries were removed; source, database, containers and installed environments were preserved.
