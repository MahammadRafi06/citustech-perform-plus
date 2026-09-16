# Member 360

The top navigation entry opens `/member360`. The supplied `PERFORMplus_MemberListApp_Member360_v14.html` is the visual reference. Its complete stylesheet provides the shared design for the existing application. Colors, typography, cards, controls, metrics, tabs and tables are applied app-wide; only prototype-specific layouts remain scoped to `.member360-workspace`. Shell adapters handle the existing sticky two-row header and navigation. The original upload is unchanged.

The page contains a searchable, sortable member list, contract/plan/entity filters, filtered KPIs, CSV export and 10/25/50/100 row pagination. Five reference profiles contain Summary, Enrollment & Attribution, Quality/Stars, Risk Adjustment, Clinical Data, Claims/Utilization and SDOH sections. Prior procedures, refills and claims expand inside their original tables. URL state supports member/tab deep links and browser navigation. Tabs also support arrow, Home and End keys.

## Source and boundaries

- `scripts/import_member360.py` extracts inert data into `apps/api/app/fixtures/member360.json` and invokes the shared CSS importer. Run with system Python + lxml and the installed web dependencies. No uploaded script executes in the app.
- The source SHA-256 is recorded in the fixture and visible in Source & scoring notes.
- The five profiles link to nine read-only suspect records using the same member IDs, names, conditions and evidence summaries. Already validated contributions remain in the profile rather than becoming new gaps. Matching profile members appear first in member-based analytics tables and exports; filters and access scope apply before ordering. Names link to their Member 360 risk section.
- Profiles stay separate from the existing clinical store and scored analytics population. No source patient is renamed into an existing member, and no native score, evidence or review state is changed. Source deltas are labeled as 2026 reference values, excluded from score/financial aggregation, and rejected by scenarios until current-model mapping and evidence are available.
- `GET /api/v1/member360` requires an authenticated account with the existing `members` screen permission. Provider accounts receive only explicitly assigned reference profiles; other member-enabled roles can inspect the reference set. No write endpoint is provided. Scope IDs are presentation access assignments, not patient/provider identity matches with the clinical store.
- CSV export follows the current list filters and the existing export permission.
- Submitted/accepted score definitions elsewhere are unchanged. Reference HCC mappings/coefficients remain unvalidated; financial values assume $12,000 per RAF point. The notes disclose those limitations. Suspects still require clinician documentation and coding validation.

## Adaptations

The app shell replaces the prototype's duplicate header, navigation and entry-point screens. The member list is the direct landing page. Geographic labels/ZIPs are adapted to Florida. Repeated promotional/demo copy is removed from the body while source provenance remains available. CKD specificity wording requires clinician reconciliation rather than treating a lab result as a confirmed diagnosis. Source numeric evidence and RAF values are retained.

## Verification

Run `npm run typecheck --prefix apps/web` and `.venv/bin/python -m pytest apps/api/tests/test_member360.py apps/api/tests/test_member360_analytics.py apps/api/tests/test_analytics_api.py -q`. Tests cover all 35 panes, source integrity, inert markup, history targets, API authentication and member permission, provider payload isolation, read-only behavior, clinical/financial disclosures, linked ordering and scenario boundaries.

The September 16 visual and data audit is in `screenshots/app-audit-2026-09-16/`, with a screenshot gallery and a findings report.

Browser evidence and screenshots are saved under `.local/member360/` and `.local/shared-html-style/` during local validation. Public releases follow [the deployment instructions](../deploy/README.md); source, image digests, rollout status and public browser evidence are recorded under the corresponding ignored `.local/aws-deploy/release-*` folder.
