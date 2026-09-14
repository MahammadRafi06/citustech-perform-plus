# Browser audit gap closure

All three requested gaps are closed and browser-verified on the isolated QA application on September 14, 2026. The original [browser audit](BROWSER_E2E_AUDIT.md) remains the historical record.

- [x] Use one member date of birth and sex across scoring programs; keep model-specific age reference dates.
- [x] Mark earlier mismatched ACA fixture results stale without changing their saved inputs/results; verify recalculation and historical inspection.
- [x] Add Casey's second, independently sourced assessment question with stable finding and episode IDs.
- [x] Exercise finding selection, isolated drafts, source gates, separate review/QA histories and completion in the browser.
- [x] Attach a real synthetic CSV; verify parser errors, successful rows and retained import exceptions.
- [x] Attach local text/PDF intake previews and verify they do not publish clinical evidence.
- [x] Run regression/build checks and capture rendered evidence.

## ACA identity and retained evidence

Casey Morgan (`MB-000005`) now uses DOB `1950-01-15` and female sex input across MA, ACA and Part D. Profile age 77 refers to February 1, 2027; ACA keeps its September 30, 2026 enrollment reference. Switching programs never changes DOB. The ACA fixture version is `scoring-inputs-2026.2-identity`. MA/Part D fixture values and versions are unchanged.

The original ACA child result `RUN-4c0d4e22c8114f81949f0dd40fb2cb55` (2.507) was marked stale. Recalculate produced an ADULT PLATINUM result of 0.684 using the corrected identity. The prior child result and original input snapshot still reopen with an explicit historical-demographics notice. Tests assert both retained objects remain unchanged. Existing mismatched current ACA stage pointers are marked stale on startup; users must recalculate those results. Official child/infant reference tests remain independent of the member fixtures.

## Two findings on one chart

Casey retains the original `OP-0005` / `DOC-0008` chronic-condition finding. New `OP-CASEY-BP` / `EP-CASEY-BP-2026` uses the separately signed `DOC-CASEY-BP`. It records an unconfirmed blood pressure observation, not an established hypertension diagnosis. Supported coding is blocked for that finding.

Browser sequence: selection required → supported chronic-condition draft → unsupported blood-pressure draft → reload each independently → save first review → independent QA → verify second still pending → save second review → independent QA → member review complete with two distinct outcomes. Self-approval remained disabled. Finding selection now loads the matching source and title; the member API returns eligibility for each individual finding. Backend coverage also verifies ambiguous-action rejection and campaign completion 0/2 → 1/2 → 2/2.

Adding a source correctly makes Casey's older frozen AI replay stale (`STALE_SOURCE_SET`). Its authored output and original source hash were not rewritten. A fresh analysis is required to include the new source; no live inference is claimed.

## Actual browser attachments

After the user enabled Chrome's ChatGPT extension setting **Allow access to file URLs**, the native chooser attached repository files successfully. No DOM file injection or API-only substitute was used.

- `invalid-columns.csv`: rejected with the required `rating_period` column error; import disabled.
- `scores.csv`: browser showed the actual filename and two parsed records. Import `EXTERNAL_IMPORT-b9e5199e86ee41749dd1f633e6f5a0d3` received 2, imported 1, excluded 1 for missing score, and reported 4 absent declared cohort members. No default score was substituted. Authored-example metadata was loaded first, then adjusted for this synthetic file; the submitted rows came from the actual CSV attachment.
- `intake-preview.txt` and `intake-preview.pdf`: rendered their local contents. The right panel explicitly showed preview-only status; validation/publishing controls were unavailable. Closing preview restored the original prepared source and its existing publication timestamp.

Reusable files are in [seed/upload-examples](../seed/upload-examples). Intake remains a local preview feature; this verification does not add server-side file ingestion.

## Verification and screenshots

- Full API suite: **196 passed, zero failed**, 209.59 seconds; four existing framework deprecation warnings.
- Focused gap/workflow/audit checks: 15 passed.
- Final Next.js production build and TypeScript validation: passed using `npm run build -- --webpack`. Local Turbopack's CSS worker encountered an environment bind-permission failure; the documented Webpack build path passed. Deployment still uses the existing image build workflow.
- Final standalone UI rebuilt and inspected in Chrome against the isolated PostgreSQL QA clone. No test decisions or imported scores were written to the public database.
- [Screenshot index](../screenshots/audit-gap-closure/README.md) records actual rendered evidence. Early captures 01–03 predate the finding-selection wording fix; final captures 18–21 show the final UI.
