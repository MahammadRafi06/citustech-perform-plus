# Perform+ browser action audit

September 14, 2026. Browser pass complete with the limitations below. Eight reproduced defects were fixed and browser-retested. The ledger contains 164 observations: 154 passing checks, eight original defects, one blocked upload and one unresolved fixture mismatch. Original failures are retained with links to successful retests; they are not eight outstanding failures.

## Environment and evidence

Tested the current local Next.js production build, including pending Florida population, named-owner and geography changes, through Chrome at `http://127.0.0.1:3100`, API port 8100, and an isolated database copy. Source base: local main `73a97dba0ab6455a7f3746fc045775190ca664b3` plus uncommitted changes. Test mutations did not use the working database. No commit, push or deployment occurred during this audit; this is not evidence of the public EKS deployment's current state.

- [Action ledger](../screenshots/browser-e2e/actions.json): actions, observed results and defect resolution links.
- [Screenshot gallery](../screenshots/browser-e2e/index.html): 39 desktop captures with text snapshots; settled replacements are identified.
- [Screenshot dimensions](../screenshots/browser-e2e/screenshot-manifest.json): actual sizes, rather than an assumed common viewport.
- [Download validation](../screenshots/browser-e2e/download-validation.json): 18 downloaded files parsed and inspected.
- [Validation summary](../screenshots/browser-e2e/validation-summary.json): build and automated test results.

## Screen and action coverage

Verified describes the listed browser paths, not every record, input permutation or concurrency condition.

| Area | Browser actions and outcomes | Boundary |
|---|---|---|
| Authentication and shell | Invalid/valid passwords, visibility toggle, four carousel slides and controls, sign-out, nine role types, sidebar, notifications, global search, guide and unauthorized routes | Entra/Okta logos are not implemented SSO. |
| Risk overview | Definitions, model/basis selection, member links, 10/25/50/100 paging and navigation, export, new population calculation | New batch completed 10,000 records, zero failures. |
| Risk analytics | All 11 report tabs; stages, prevalence, recapture and period comparison; cohort drilldowns; methodology; six operational reports with all four page sizes and exports | Frozen AI evaluation is separate from current operations. |
| Geography | County/provider/combined views, matrix/ranking drilldown, intersecting filters, reset, empty result, independent group/member pagination, retained-run link and export | Broward 1,206 members; Broward + Lakeside 267, RAF 0.975; Duval + Lakeside zero after rendering settled. |
| Suspect registry | Five categories, search/sort/density, saved views, ranking/priority/evidence filters, evidence detail, assign/request/defer/suppress, analysis/effect and campaign creation | Population illustrations stay unavailable for interactive clinical selection. |
| Chart review and members | Source selection, zoom/fit/find/passages, inspect gate, pause/reload/resume, supported/unsupported/assessment decisions, required rationale, clarification, history/factors/eligibility/exclusions/provenance, recalculation and saved-run reopening | Available single-finding stories verified; no same-chart multi-finding fixture was available. |
| Coding QA | Required notes, independent return for rework, revised decision, independent pass, superuser self-approval restriction | Review and QA provenance retained. |
| Campaigns | Exclusions, draft restore, required fields, owner/due date, coding/source/pre-visit allocations, frozen preview, stale preview rejected after second-tab edit, activation, completion/detail/export | Coding and integrity activated; other owner paths previewed. Double-click race not separately browser-tested. |
| Chart chase | Practice filters, contact note, requested/partial/received/unavailable states, work-item detail and export | Isolated test records only. |
| Document intake | Unsigned/mismatched validation, signed replacement publish, duplicate gate, later encounter publish and review reopening, source recheck | Fixture paths verified; native file attachment blocked by Chrome. |
| Providers and pre-visit | Practice scope, county search, member links, cross-practice URL denial, required task response, later encounter receipt, follow-up closure, no-task save gate | Document receipt and task response did not substitute for clinical review. |
| Submissions | Prepare, acknowledge/reject/retry/accept, deletion linked to original occurrence, eligibility gate, matched/discrepant report observations and export | Prepared local receiver/report fixtures; no external receiver or payment reconciliation. |
| RAF/model lab and financials | Add/remove/combined scenarios, fixed-input model comparison, unavailable model handling, save/reopen/export, MA/ACA/Medicaid assumptions and history | ACA demographics issue remains; V24 executable reference unavailable. |
| Models and data | Ten-configuration catalog/details, validated activation and prohibited external activation, mapping/empty search, coverage, new/resumed batches, external authored feed and exceptions | Seven feed rows: three imported; missing, duplicate and period exceptions preserved. CSV attachment blocked. |
| Audit | Case selection, chain coverage, timeline/provenance and selected-case package | Whole-population export not separately exercised. |
| Agents | Five configurable/four planned agents, filters, private primary/fallback, duplicate/budget validation, tools/instructions, pause/save/history/restore, discard guard, provider/model add/edit and export | Browser-local preview as requested; no live connectivity or inference claim. |
| Administration | Role/practice changes and reversal, disable/re-enable, blocked login, active session revoked in second origin, self-admin safeguards, isolated reset | Model status and role-change mouse lock fixed. |
| Ask Perform+ | Metrics, member explanations/citations, integrity proposal into planner, disabled empty proposal, unsupported prompt and scope | Activation required explicit campaign flow. No separate clarification-apply action exists. |

## Fixed defects

| ID | Original failure | Correction and browser retest |
|---|---|---|
| BUG-01 | Administration said model pack was not installed despite calculated results. | Display selected configuration release, dates and readiness. FIX-01. |
| BUG-02 | Paused review lost its selected decision on reload. | Persist/restore draft decision in both review interfaces, validate allowed decisions, clear on completion. FIX-02. Regression checks historical-evidence gate. |
| BUG-03 | Reset exposed archived receiver observations beside new active submissions. | Preserve archive; filter active reconciliation by member, configuration and current submission IDs. FIX-03 plus archive-retention regression. |
| BUG-04 | Alex Chen appeared selected but assignment Apply was disabled. | Explicit empty account option aligns visible and stored selection. FIX-04. |
| BUG-05 | Success toast covered campaign Continue. | Move notifications above the working area; immediate Continue works. FIX-05. |
| BUG-06 | Provider role/practice modal left mouse input locked after closing. | Native role selector avoids nested select/modal pointer-lock state. FIX-06. |
| BUG-07 | Completed analyses missing from count and registry details. | Recognize prepared_analysis and legacy fixture modes, with successful/completed statuses. FIX-07 and FIX-07-DETAILS. |
| BUG-08 | Unavailable V24 comparison falsely removed all baseline factors. | Only compute differences for a completed comparison score. FIX-08 plus saved-scenario regression. |

BUG-08 has matching 1910 × 932 [before](../screenshots/browser-e2e/19-unavailable-model-before.jpg) and [after](../screenshots/browser-e2e/20-unavailable-model-after.jpg) captures. An existing campaign test also expected the old role label “QA reviewer”; it now checks the stable account ID, actual display name and due date.

## Clinical, metric and export evidence

- **Supported coding:** Jordan source inspection → supported decision → independent QA return → revised decision → independent approval → rejected submission → accepted retry `SUB-ef11…` → eligibility/report comparison. Accepted eligibility RAF 0.756. Prior-period observation remained a separate discrepancy.
- **Integrity deletion:** Taylor unsupported finding → independent QA → deletion `SUB-ee1c4a2197`, preserving original `SUB-0001` → accepted/eligible deletion → 0.396 versus 0.756 baseline. Absent occurrence matched; report retaining the occurrence remained discrepant. Integrity campaign reached 1/1 after QA.
- **Changed evidence:** Morgan historical source blocked supported coding. Later signed encounter was received/published separately; recommendation v2 required fresh review while original rationale and source citations remained retained.
- **Scenarios:** Casey baseline 0.758 → 1.406 for selected addition; combined removal/addition 1.128. Saved runs reopened with original inputs/factors.
- **Frozen evaluation:** 200 records, precision 108/135 = 80%, recall 108/120 = 90%, 22 versus 36 review minutes. These are authored evaluation metrics, not live AI measurements.
- **Population:** 10,000 current; period comparison 9,600 matched and 400 current-only; 9,598 recapture pairs. Resumed historical run kept 400 ineligible records visible.
- **Exports:** Parsed 18 CSV/JSON/ZIP files, including 10,000 overview members, 200 evaluation records, six operational reports, campaigns/submissions, retained-run inputs, geography filters, financial assumptions and recapture inventory. Audit ZIP integrity passed with 239 JSON entries. Geography member detail explicitly represents its current page.

## Remaining TODOs and limits

- [ ] **Align cross-program fixture identities.** DATA-ACA-DEMOGRAPHICS: Casey's clinical header says 77 years; ACA inputs use DOB 2006-01-15 and CHILD PLATINUM. Resolve demographics, eligibility and expected scores together. Scoring evidence was preserved during this audit. [Screenshot](../screenshots/browser-e2e/27-aca-demographic-mismatch.jpg).
- [ ] **Finish native attachment checks.** UPLOAD-CSV: chooser opened, but local attachment returned “Not allowed”. The ChatGPT Chrome extension needs “Allow access to file URLs”. Then recheck CSV validation/import and intake file preview. Authored feed import and fixture publishing passed independently.
- [ ] **Provide a multi-finding clinical story before claiming that browser path.** Per-finding backend checks are separate evidence.

Rendered desktop screenshots were inspected for content, clipping and blocked controls. No remaining blocking overlap was observed in inspected states. Minor wording issues remain, including singular/plural counts and internal analysis-mode labels. Screenshot 12 and an early annual-recapture text snapshot were premature; use screenshots 22 and 25. Earlier files remain as chronological evidence, not successful render proof.

## Validation

Next.js production build passed after UI fixes; final browser retests used the rebuilt standalone app with static/public assets. Nine distinct focused regression/auth/scope/Florida tests passed. The final complete backend suite passed: **194 passed, zero failed**, in 185.65 seconds. Four existing framework deprecation warnings remain. The initial run's outdated owner-label assertion was corrected. `git diff --check` passed. Details are in the validation summary.

This audit covers the listed local demo interactions. Live SSO/agents, external clinical integrations, production load and public deployment acceptance are outside this scope.
