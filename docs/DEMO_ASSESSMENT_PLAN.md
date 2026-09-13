# Perform+ assessment implementation plan

Date: 12 September 2026. Status: **implemented; connected workflows and approved runtime reset verified**. Two reset cycles restored the isolated rehearsal while preserving accounts, source text and frozen metrics. See [observed verification](ASSESSMENT_VERIFICATION.md).

Requirement source: [Perform_Plus_Demo_Assessment.md](../Perform_Plus_Demo_Assessment.md), read in full (478 lines). Execution checklist: [TODO.md](../TODO.md#assessment-backlog--active). This plan supersedes the initial delivery plan for the next increment; it preserves that delivery history.

## Baseline and scope

The assessment reviewed `fe99150`. This planning review checked current `main` at `40be7e2`: the intervening commit changes styles, layout/font imports and screenshots, with no API, workflow component, type or fixture changes. The assessment's workflow findings still apply. The assessment was the only untracked file when planning began; preserve it unchanged.

The current implementation already has all sixteen workspaces, local accounts/RBAC, a superuser, persistent PostgreSQL state, source viewing, independent QA and simulated external responses. Extend these components. Prioritize a clean desktop experience and connected ordinary workflows. Keep Next.js, Tailwind, shadcn/ui and separate UI/API/database deployment components.

The following paragraph records the original source-based planning review, before implementation. The assessment's 21 passing tests and R01–R08 reproductions are earlier evidence, not tests rerun during planning. No application records, credentials, containers or source code were changed for this plan. Regulatory and vendor references in the assessment are supplied design context; they have not been independently revalidated here. Verify authoritative code/model references when implementing any example that depends on them.

Use `DA-01` through `DA-12` for the assessment's `D01` through `D12`. The prefix avoids collision with the completed initial-delivery phases already named D01–D07 in TODO.md. Two bounded additions, DA-13 and DA-14, capture requirements in the assessment's workflow table that were not assigned a D ticket.

## Working decisions

| Topic | Planned default |
| --- | --- |
| Program breadth | Complete the existing MA Part C service-2026/payment-2027 story. Other programs remain future/unconfigured scope; no cosmetic selector implying a working engine. |
| Population versus actionable work | Keep the 10,000-member directory and population analytics. Use an explicit six-case catalog for complete workflow actions, with clear eligibility and links from browsing-only records. |
| Access and owners | Keep local authentication, all current roles and superuser access. Bind actionable owners to existing eligible accounts/practices; do not broaden staff population access to conceal assignment defects. |
| Administration | Include the small provider-scope fix first, even if account editing is a secondary presenter action. |
| Codes | Add only reviewed, prepared code outputs tied to source passages and the applicable release. Verify the reference before exposing a code as supported. |
| Scoring | Look for or generate a retained, independently checked reference example. If unavailable, ship the assessment's nonnumeric Casey hierarchy comparison and record numeric scoring as deferred. A fallback is not completion of official numeric scoring. |
| AI behavior | Use deterministic scenario transitions and source-linked templates. No live model, vector database or autonomous agent is needed. |
| Visual design | Continue the merged desktop layout. Preserve plain status text without colored backgrounds/dots. Reconcile the merge's Inter body-font change with the user's earlier IBM Plex Sans choice as a narrow consistency task, not a new theme redesign. |
| Scope labels | Use one restrained shared synthetic/program context and contextual “Prepared analysis,” “Precomputed reference,” and “Simulated receiver” labels where relevant. Avoid repeated demo branding and warning banners. |
| State and environments | Introduce additive state/fixture fields while preserving accounts and existing business history. Rehearsal resets run in an isolated test environment. Preview at :3002 and development at :3000/:8000 use different databases. |
| Later pilot and branding | Plan for synthetic usability feedback only. Real-record operation and any claim of a commercial relationship to CitiusTech require separate decisions; keep the existing application name for this increment. |

## Delivery sequence

Each phase includes its visible UI handoff and focused checks. The user subsequently authorized implementation. DA-01–DA-14 now have implemented application behavior; Casey ships the documented nonnumeric fallback. Browser stories, container preservation, desktop captures and two explicitly approved completed-runtime reset cycles are recorded in [ASSESSMENT_VERIFICATION.md](ASSESSMENT_VERIFICATION.md).

| Phase | Work | Exit condition |
| --- | --- | --- |
| 1 — Case and access foundation | DA-11; six-case catalog and additive state support for DA-03/DA-06/DA-10; DA-04 reachable owners and cohorts. Inspect scoring reference availability early. | Browsing-only rows cannot produce supported decisions; every offered assignment is reachable; provider account saves retain practice scope. |
| 2 — Complete the reviewed case | DA-05 shared completion rules, retained review/QA decisions, then DA-01 linked additions/corrections and retries. | Jordan and Taylor reach an explicit simulated outcome from the same independently approved decision; campaign progress agrees throughout. |
| 3 — Evidence changes and follow-up | DA-06 prepared transitions/history, DA-08 provider/intake/review handoffs, DA-07 current summaries/citations; finish DA-10 scope/date treatment. | Relevant published evidence produces a visible, traceable change; response alone never approves coding; no stale assistant conclusion remains. |
| 4 — Business explanation and trace | DA-02 scoring example or declared fallback, DA-09 complete case export, DA-13 import summary and DA-14 prepared record reconciliation. | The audience can inspect the basis of the scenario and trace a reviewed record through sources, decisions and simulated outcomes. |
| 5 — Desktop rehearsal and handoff | DA-12 across all sixteen workspaces; update run/presenter notes, focused checks, production builds and before/after capture. | Five connected stories pass with real local role handoffs, readable screens, consistent records and a repeatable isolated reset. |

Dependencies: DA-03 → DA-04; DA-03 + DA-05 → DA-01; shared case/source catalog → DA-06 + DA-08 → DA-07; DA-01 + DA-06 → DA-09; DA-01 → DA-14; DA-08 → DA-13. DA-10 spans every phase. Scoring reference work can proceed independently and must not hold up the connected workflow.

## Requirement details and acceptance

### DA-01 — Review to simulated submission · P1

Bind member, finding, prepared code/release, exact document/page/passage, recommendation snapshot, review decision and independent QA decision to each new submission. Keep source/review snapshots before later edits can overwrite them. The submission specialist explicitly prepares the approved result; QA approval alone does not simulate transmission.

Expose a clear next step after QA and a linked decision/source panel in Submission Operations. Implement Jordan's addition and Taylor's reviewed deletion correction. Preserve rejected attempts and original records; a retry retains its intended operation instead of always becoming a deletion. Repeating preparation for the same approved decision must not produce duplicate pending records. A new review or changed evidence requires fresh approval before preparing another result.

**Accept:** Jordan's addition and Taylor's deletion reference their exact approved decisions and sources. Same-user QA remains denied, including for superuser. Rejection → retry preserves operation/history. Transport acknowledgement, receiver acceptance, diagnosis eligibility and payment reconciliation have distinct states; acceptance never sets payment reconciled automatically.

Touchpoints: `apps/api/app/main.py` review/QA/submission actions; `apps/web/src/components/review-workbench.tsx`; Member 360, QA and Submissions in `workspaces.tsx`; `apps/web/src/lib/types.ts`; prepared fixtures in `seed/demo.json`.

### DA-02 — Casey scoring explanation · P1

Prepare baseline and combined full-member inputs with explicit model/year/segment assumptions and hierarchy/interaction explanation. A numeric example requires retained reference inputs, output, source/version and an independent reproduction check. Do not invent coefficients, add isolated marginal impacts or display unsupported revenue. Keep unavailable behavior for unconfigured inputs/programs.

**Accept:** numeric outputs match retained reference evidence exactly, or a clearly labeled nonnumeric illustration explains the changed input set and hierarchy. The handoff explicitly records which version was delivered. Numeric scoring and an actual model/year-switch journey remain unimplemented if the fallback is selected.

Touchpoints: `Scenarios` in `workspaces.tsx`, Casey fixture, typed scenario data, a retained reference artifact and verification notes.

### DA-03 — Reviewability and finding-specific evidence · P1

Create a small explicit catalog for Jordan, Morgan, Avery, Taylor, Casey and Riley: available sources, evidence relationships, allowed decisions and named transitions. Expose server-derived eligibility and reasons to both review surfaces. Do not substitute “has any signed current document” for support: Morgan's current source does not assess the historical condition; Taylor's current source contradicts existing coding.

**Accept:** unsupported browsing-only records show a useful explanation and complete-example link; direct API support is denied too. Jordan follows documented support; Morgan's history and Avery's indirect signals cannot directly support coding; Taylor follows integrity review; Riley requires a matching usable replacement. Casey's allowed actions follow its reviewed fixture. Original source text and attribution are preserved.

Touchpoints: member detail and review actions in `main.py`, `Member.showcase`/new eligibility types, registry/directory and both review interfaces, case/source fixture catalog.

### DA-04 — Reachable assignments and explainable priority · P1

Restrict actionable campaigns and bulk assignments to catalog cases and owners mapped to existing accounts/practices with the required workflow permissions. Validate the assignee's scope on the server and in frozen preview/activation; validate provider-practice selections across the whole chosen cohort. Existing larger seeded campaigns remain population illustrations unless their actionable subset is explicitly identified—do not silently change totals or advertise unreachable tasks.

Replace the assistant's arbitrary first matches with a small stable ranking using applicable priority, evidence, due date, disposition and coverage fields. Explain each inclusion, keep integrity work distinct, and require the user to review the exact proposal before activation. This also implements AI03.

**Accept:** every selectable assignee can open all assigned members and sources with their own login. Browsing records outside the actionable set cannot slip through direct assignment/activation. Preview, task creation and count/overlap explanations agree; repeated input gives the same ranked cohort and an empty result invents no work. Preserve current stale-preview checks.

Touchpoints: `allowed_members`, assignment/campaign/assistant actions in `main.py`; `campaign-planner.tsx`; registry bulk actions; `fixture-assistant.tsx`; task/account types and seeded campaigns.

### DA-05 — One completion definition per intervention · P1

Normalize seeded intervention keys and planner labels. Derive campaign/task/overview completion from one shared rule: coding and integrity review finish after an approved terminal review; retrieval finishes after source usability; previsit response is its own milestone and never counts as approved coding. Keep existing recorded-disposition metrics separate from QA-approved completion rather than silently changing their meaning.

Retain decision and QA snapshots with actor, reason and time. Require a user-entered reason for QA rework and show it to the coder in both review surfaces. Review submission stays open while awaiting QA; rework or a relevant new source reopens affected work consistently.

**Accept:** pending QA → pass completes work; pending QA → rework keeps work open; relevant new evidence invalidates current approval and reopens work. Each path produces matching member/task/campaign/dashboard results with an unchanged eligible denominator. Retrieval publication advances the correct intervention. A provider response does not finish coding. Self-QA restrictions remain enforced.

Touchpoints: bootstrap counts, review/QA/source actions in `main.py`; campaign progress; `dashboard.tsx`; both review surfaces; typed QA note and decision history.

### DA-06 — Prepared findings and recommendation history · P1

Separate workflow revision from recommendation version while preserving or explicitly migrating the existing campaign `expected_versions` contract. Build on the existing seeded recommendation-history shape. Named prepared transitions evaluate source IDs and scenario state, producing a changed/no-change finding, explanation and next action. Preserve previous snapshots and the exact evidence basis; an analysis run may be recorded even when its recommendation does not change. This implements AI01.

**Accept:** unchanged evidence returns “No change”; a relevant newly published source appends one before/after snapshot, including one authored contradiction/withdrawal-or-clarification transition. Assignment, review and QA do not pretend to create fresh AI recommendations. Repeated publication does not duplicate history; missing source produces an explicit no-result state.

Touchpoints: analyze/later-source/intake actions, opportunity history/types, Member 360 history, registry and source fixtures.

### DA-07 — Current summaries and exact citations · P1

Generate short prepared explanations from the same current scenario/recommendation state. Attach claim-level member/document/page/section references with support, history, contradiction or context labels. Extend source links to navigate to the relevant passage. Invalidate displayed assistant answers when their source/recommendation basis changes. This implements AI02.

**Accept:** Morgan updates after the qualifying published encounter; Avery remains an assessment signal until separately authored qualifying documentation exists; Taylor exposes the contradiction; no-source cases abstain. Every linked passage supports the associated claim and opens the correct protected source. Display and export retain original clinical quotations.

Touchpoints: `assistant_answer`/member summary in `main.py`, `fixture-assistant.tsx`, `source-document.tsx`, Member 360, source/recommendation types.

### DA-08 — Response → usable source → fresh review · P1

Show role-aware next actions for response, prepared encounter availability, receipt, validation, publication and review, retaining the same member and return context. Cross-role handoffs explain which account continues instead of linking to a denied workspace. Use explicitly authored case transitions; remove the generic path that manufactures a signed condition statement for arbitrary members.

Preserve Morgan's existing prepared later encounter. Add distinct Riley replacement and mismatch examples: today's valid/mismatch intake samples belong to members 7/8 and do not complete Riley's own story. Preserve those original documents. Avery defaults to assessment/no-support unless a separately authored qualifying source is intentionally added. Include evidence context and uncertainty/non-support options in neutral local query drafts (AI04).

Publish suitable documentation once, update its finding/summary/source links together and require a fresh review/QA. A prepared source becomes support-eligible through the defined validation/publication path; merely loading it or receiving a provider answer cannot bypass that path.

**Accept:** response alone never enables support; unsigned and mismatched samples fail with a useful reason; Riley's matched signed replacement publishes once and becomes visible in the same case. Relevant changed evidence retains previous decisions while clearing current approval. No outbound provider contact is implied or performed.

Touchpoints: response/later-source/intake handlers, provider/previsit/member workspaces, `intake-workspace.tsx`, review/source viewer, authored fixtures.

### DA-09 — Complete selected-case audit package · P2

Extend the existing ZIP with a human-readable manifest and machine-readable source → recommendation → review → QA → submission/correction chain. Include all relevant attempt outcomes and the synthetic/program/scenario basis, plus explicit missing-link states. Derive readiness from those records instead of fixed text. This implements the audit portion of AI05.

**Accept:** Jordan and Taylor packages match the UI and exact original source IDs/passages; contain prior decisions and rejected attempts; exclude unrelated members; identify any unavailable stage without claiming formal audit readiness. Retain protected export access.

Touchpoints: `downloads` in `main.py`, Audit/Submission workspaces, retained decision/history and attempt types.

### DA-10 — Consistent program, basis and scenario dates · P1

Expose one shared program/scenario context to UI and exports. Distinguish the scenario's staged date from actual action timestamps and show progression when a later encounter becomes available. Preserve authored encounter dates rather than silently replacing them with today's date or a generic future date. Standardize the contextual basis copy without repeated warning panels.

**Accept:** sources, assistant, scenarios, receiver outcomes and exports identify the appropriate prepared/synthetic basis. A future encounter is visibly staged; no label implies live inference, real transmission, payment reconciliation or implemented Part D/ACA/Florida support. Public regulatory assertions used in new copy are checked against authoritative sources at implementation time.

Touchpoints: bootstrap metadata, case fixture catalog, application shell, `display.py`, source/scenario/submission surfaces and exports.

### DA-11 — Preserve provider account scope · P0 for account saving

Preserve existing `provider_id` for provider no-op saves and enable/disable actions. If a practice change is exposed, require an explicit valid choice; never silently default an existing provider to PR-001. Keep current session revocation and self-account protections.

**Accept:** provider2 remains PR-002 after no-op save and disable/re-enable; a subsequent login can open member 2 and cannot open member 1. The same preservation holds for the other existing practices.

Touchpoint: `UserUpdate`/`update_user` in `main.py`, administration only if explicit practice editing is needed.

### DA-12 — Presenter usability and desktop verification · P2

Complete the five stories below using real separate role logins. Make QA rationale, saved versus unsaved state, source navigation, next actions and return links clear. Continue the current layout and reconcile typography/status treatment with the user's earlier preferences. Keep shared styles coherent across all sixteen screens and supporting analytics views.

**Accept:** no dead ends, lost selected-member context, stale conclusions, clipped sources or inaccessible primary actions. Capture and inspect matching before/after desktop views at 1440×900; check the dense review/source layouts at 1366×768 and 1920×1080 too. Record actual image dimensions. No mobile design work is required. Verify reset in an isolated environment restores the known scenarios while preserving accounts/roles and the frozen comparison.

### DA-13 — Prepared import summary · P2, bounded addition

The assessment's workflow table requests a received/matched/quarantined summary. Derive it from an explicitly identified prepared sample batch, separate from the 10,000-member roster. Link failed rows to intake and remediation; do not pretend arbitrary file preview is ingestion/OCR.

**Accept:** counts have named units and a reconcilable denominator; match and usability are separate stages, with explicit reasons for quarantined samples. Recheck/publication updates the applicable sample state without creating duplicate rows.

Touchpoints: source-validation runs and `source_issues` in `main.py`, Data Operations and Intake, prepared batch fixtures. Depends on DA-08/DA-10.

### DA-14 — Prepared record-level reconciliation · P2, bounded addition

The assessment's workflow table requests a source-to-reported comparison. Add one explicitly prepared comparison linked to the same showcased submission/decision, with distinct transport receipt, receiver acceptance, diagnosis eligibility, reported record and payment-reconciliation fields. Use a named synthetic receiver/report fixture and preserve its identity in the trace.

**Accept:** the presenter can match or explain a difference for the same source/decision/record. Simulated acceptance does not automatically set eligibility, reported or paid states. Payment stays unreconciled; no real report integration or invented financial result is claimed.

Touchpoints: Submission Operations, a prepared reconciliation fixture, typed result/basis fields, Audit export. Depends on DA-01/DA-10; include its trace in DA-09 once available.

## Screen coverage

| Screen | Planned change or verification |
| --- | --- |
| Overview | Shared completion definitions and honest drill-down counts; DA-05/DA-10/DA-12. |
| Analytics and AI Impact | QA-aware operational measures with definitions; preserve frozen comparison and its AI-stage/final-review distinction; DA-05/DA-12. |
| Suspect Registry | Actionable-case filter, eligibility reasons, reachable bulk work and changed/no-change history; DA-03/DA-04/DA-06. |
| Campaign Planner | Verified owners/cohorts, frozen activation preview and intervention completion; DA-04/DA-05. |
| Member 360 | Current summary, exact sources, recommendation/decision history and connected next steps; DA-01/DA-03/DA-05–DA-08. |
| Chart Chase | Receipt versus usability and linked remediation; DA-05/DA-08/DA-13. |
| Document Intake | Same-case prepared samples, publish-once transition and return to review; DA-08/DA-10/DA-13. |
| Chart Review | Shared evidence gate, prepared code/source selection, history and QA handoff; DA-01/DA-03/DA-05–DA-08. |
| Coding QA | Independent pass/rework rationale, retained decision and linked next action; DA-01/DA-05/DA-12. |
| Provider Portfolio | Reachable practice work and response/source handoffs; DA-04/DA-08/DA-11. |
| Pre-visit | Neutral contextual query, distinct response/encounter states and staged date; DA-08/DA-10. |
| Risk Scenarios | Casey's sourced full-member comparison or explicit nonnumeric fallback; DA-02/DA-10. |
| Submissions | Approved-case preparation, explicit operation/retry history, separate simulated processing stages and record comparison; DA-01/DA-14. |
| Audit | Complete selected-case trace and record-derived readiness; DA-09/DA-14. |
| Data Operations | Prepared batch counts, source issues and truthful run/no-change history; DA-06/DA-13. |
| Administration | Preserve provider scope; verify local role/session behavior and isolated reset; DA-11/DA-12. |

The shared assistant is covered by DA-04/DA-07/DA-08/DA-09. AI05 metric explanations remain grounded in existing metric definitions; retain their formulas and denominator links during DA-12 rather than building new measurement infrastructure.

## Verification and exit gate

| Presenter story | Required end-to-end evidence |
| --- | --- |
| Jordan: supported coding | Reachable allocation → exact source/prepared code → coder decision → different QA reviewer → linked simulated addition → separate receipt/acceptance → matching export. |
| Morgan and Avery: assessment | History/signal remains insufficient; neutral query and response do not approve coding; a separately authored usable source enables fresh review where configured; non-support remains a valid outcome. |
| Riley: intake | Same-case unsigned/mismatch rejection → matching signed replacement → one publication → usable source and current review. |
| Taylor: integrity correction | Contradictory evidence → reviewed deletion decision → independent QA → explicit simulated delete → retained rejection/retry → acceptance with payment still unreconciled. |
| Casey: scoring | Retained reference inputs/output checked if numeric; otherwise a clearly described nonnumeric hierarchy comparison. No invented official RAF or revenue. |

Before implementation, capture the current runtime/source identity and before screenshots; a source SHA alone does not prove what the :3002 container serves. Record the environment, role, case state, route, viewport and actual image dimensions for each pair. Keep credentials in ignored local files. The preview and development databases have different passwords; localhost cookies are not port-scoped, so use an isolated browser context or a separate host name for development during the :3002 rehearsal.

Extend existing focused API tests for the changed behavior: eligibility, scoped assignment, provider-save scope, QA-aware completion, linked submissions/retries, no-change/changed recommendation history, publication/current citations, selected-case ZIP, frozen comparison and isolated reset. Update older tests that assume loading an encounter immediately grants support; do not preserve that shortcut just to keep them green. Use disposable schemas and retain current independent-QA/superuser tests. Broad concurrency, load and rare correction coverage remain deferred.

Run `make check`, `make test` and `make build`, then build the separate UI/API images and validate the local UI → API → database path for the intended preview. Do not reset an existing shared database to introduce fixture fields. Rehearse the five stories, refresh checkpoints, role changes and representative exports; inspect rendered screenshots and fix remaining visible defects. Verify the frozen authored comparison remains unchanged (AI precision 108/135; recall 108/120; final assisted precision 102/105; manual 84/90; authored time 22 versus 36 minutes). Operational events remain a separate, limited activity measure.

Store new captures in `screenshots/assessment/before/` and `screenshots/assessment/after/` with a route/state/dimension manifest, and write `docs/ASSESSMENT_VERIFICATION.md` when verification is actually performed. Update `docs/PRESENTER_GUIDE.md`, README and TODO checkboxes with observed outcomes and any explicit fallback. Do not relabel historical screenshots or old test runs as fresh evidence.

## Deferred work and decision triggers

- Real EHR/provider/receiver connections, arbitrary document ingestion/OCR, live AI, autonomous actions and general identity matching.
- Complete official scoring/program engines, broad annual source/code rules, real Part D/ACA/Florida execution and actual payment/transfer reconciliation. DA-02's reference example is a bounded exception, not an installed scoring engine.
- Complex partial/multi-operation corrections, general concurrent editing, multi-organization reassignment, exhaustive edge cases and a new operational backend architecture.
- Enterprise identity/tenant policy, availability/recovery work, formal audit sampling/deadlines/appeals, independent clinical-effectiveness or productivity studies.
- A mobile layout, another full visual redesign, and target Kubernetes publication/rollout. Existing separate-component deployment preparation is retained; the target deployment ticket remains open until environment details are supplied.
- New branding or claims about ownership of the commercial Perform+ suite. Use existing naming until ownership/positioning is separately decided.

The bounded implementation is delivered under these decisions. If a verified numeric reference cannot be obtained, take the documented fallback and report that limitation. If a future request expands the audience to four operational programs or a real-record pilot, revise scope and acceptance separately before undertaking that expansion.
