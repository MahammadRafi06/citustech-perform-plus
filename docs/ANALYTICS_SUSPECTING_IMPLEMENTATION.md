# Analytics and suspecting — local implementation

Implemented on 2026-09-15 in the existing `main` working tree, starting at `0363809`. Existing uncommitted work, accounts, source documents and clinical history were preserved. No commit, push or cloud deployment is part of this increment.

The user approved implementation and explicitly permitted in-memory/hardcoded data to keep the presentation populated. This supersedes the original plan's requirement that every presentation value come from a retained native population calculation. **Illustrative analytics and native model execution remain separate.**

## Delivered experience

- Four main destinations: Risk overview, Risk analytics, Suspect registry and Reports. Operational workspaces, Member analysis and agent administration remain outside the visible analytic journey. The workspace guide links to analytics only.
- Shared program/payment-year, reporting month (`Latest`), contract, raw/adjusted stage, snapshot, county/practice and suspect filters. Context follows report links and exports. Normal 2024/2025 blend options remain available.
- Four populated Overview tiles: Baseline, Potential scenarios, Submitted set and Accepted set. Values follow **Baseline < Accepted ≤ Submitted < Potential**, including three-decimal display and scoped/filter views.
- Six analytic tabs: Risk & conditions, Geography & practices, Suspecting, RAF Intelligence, Financial and AI Impact. No member roster is included in population reports.
- RAF trends/distributions, condition burden and recapture, county heat tiles, practice comparisons, risk/opportunity scatterplots, suspect category/rule/HCC counts, evidence/likelihood matrix, integrity examples, scenario composition, financial waterfall and cumulative sensitivities, frozen AI comparisons.
- Canonical suspect questions with source aliases, seven business categories, read-only evidence/history, distinct eligible qualified-member counts and the versioned 90-day support method. Capture includes CG/RC/NC/SP/ST; OC and DR do not receive positive-support probabilities.
- Potential-overcapture examples cover HIV, diabetes complications, CKD, depression, obesity and cardiovascular representation. Authored metadata is distinguished from retained chart quotations. Unmapped concepts stay unresolved rather than receiving invented HCCs.
- Aggregate illustrative scenarios and the existing full-profile native scenario path. Native outputs are not overwritten or forced into the illustrative headline ordering; zero native impact is valid when a proposed condition is already represented. Calculation/save does not publish clinical score stages.
- Eleven report catalog entries, immutable saved analyses, CSV/JSON/ZIP exports, full-filter and selected suspect exports. Population exports omit implicit member/case lists. Source access and current authorization are checked server-side.
- Desktop styling, white sidebar, existing branding/font, 10/25/50/100 table paging, loading/error/suppressed/empty states and report-bound prepared Ask Perform+ answers.

## Data and calculation boundary

`apps/api/app/analytics_experience.py` defines `analytics-population-2026.4` and `SYN_SUPPORT90_V1`. It projects the existing synthetic directory without writing new clinical records. Contract assignments, presentation eligibility/exposure, population scores, condition mix, recapture, component bridges and scenario submission/acceptance stages are authored assumptions. Program, year and run-type presentation multipliers are not official model coefficients.

Three presentation snapshots are deterministic. July/August contain separately authored prior-period questions, not backdated retained findings or future chart quotes. Saved reports persist exact values/methods; they do not silently recompute when the presentation generator changes.

The illustrative headline stages use an authored positive opportunity of at least 0.006, with submitted at 62% and accepted at 54% of the opportunity above Baseline. This keeps the user's requested ordering visible at three decimals even in a narrow cohort. The minimum is never fed into native calculations or financial estimates. A genuinely empty cohort has an explicit no-matching-population state instead of a fabricated zero.

Financials use one frozen positive candidate per member; reach/support/recognition apply once to positives. Signed corrections remain independent. Default sensitivity is $1,000 per score-equivalent per eligible month, 75% reach, 90% recognition and a 12-month horizon. Unknown corrections remain disclosed as partial. Non-MA programs show populated score information and require their own dollar method; generic MA reimbursement is never applied to them.

The positive financial presentation adds 1,200 deterministic metadata-only capture questions to synthetic members without retained questions. Selection is global before authorization and scope filters, with stable IDs and no fabricated chart documents. The September default MA outlook is $623,066 Conservative, $1,826,837 Base and $2,989,133 Optimistic; signed corrections remain -$312,600. Zero reach, correction-only views or adverse custom assumptions can still yield a negative net. Saved reports from previous versions retain their original values. See [fresh report screenshots](../screenshots/major-reports-positive-financials/README.md).

The existing frozen AI fixture is retained. Its detection, human-final, confirmation-yield and authored timing metrics remain distinct. No live inference or measured production productivity claim was introduced.

## Local runtime

The updated application runs at **http://localhost:3000**, using Compose project `perform-local`, its existing database, and these local image tags:

- `perform-plus-ui:analytics-suspecting-local`
- `perform-plus-api:analytics-suspecting-local`

Protected runtime configuration is in ignored `.local/analytics-suspecting/runtime.env`. Its credentials are not copied into tracked artifacts. The database was backed up before container replacement. Only this project's UI/API containers were recreated; unrelated containers and AWS resources were untouched.

To repeat the local container update after building both images:

```bash
docker compose --project-name perform-local \
  --env-file .local/analytics-suspecting/runtime.env \
  -f deploy/compose.acceptance.yaml up -d --no-deps api ui
```

## Verification

- Web TypeScript validation and production Docker build.
- API analytics arithmetic, canonicalization, scope, saved/export authorization and native model/reporting regressions. The final receipt is in [screenshots/analytics-suspecting/verification.txt](../screenshots/analytics-suspecting/verification.txt).
- Browser: contract/month/year/stage/basis filters; financial assumption change and reconciliation; saved financial view reopened with preserved values; actual JSON download; retained evidence and recommendation history; evidence-to-scenario selection; illustrative and native calculation; county/practice comparisons and pagination; suspect/correction categories; prepared assistant; frozen AI and report catalog.
- Before/after Overview captures use matching 1280×720, 1440×900 and 1920×1080 viewports. Other core report captures document the final rendering. See [screenshot index](../screenshots/analytics-suspecting/README.md).

This is local demonstration verification. A network p95 performance benchmark and production deployment acceptance were not performed.

## Original requirements that remain outside the fixture-backed increment

The original strict/native backlog remains useful for a later data-engineering phase: three actual native population snapshots; effective-dated enrollment/attribution with overlap handling; fully retained model-to-model factor comparison; all M01–M45 metric envelopes; full corrected-baseline native financial attribution; standardized/observed outcome analyses; comprehensive saved native-scenario browsing; and the full exhaustive T01–T28 acceptance matrix. Existing native services and clinical gates remain available, but presentation fixtures do not establish these stronger claims.

P1/P2 exports (PDF/PPTX), calibrated closure prediction, live AI, new model assets and cloud integrations remain deferred. No workflow/member UI is reopened by that backlog.
