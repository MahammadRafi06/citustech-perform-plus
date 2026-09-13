# Assessment implementation and verification

12 September 2026. Implementation on `codex/assessment-workflows`, based on merged `main` at `40be7e2`. The application changes for DA-01–DA-14 are implemented. Casey uses the approved nonnumeric fallback. The isolated automated reset checks and two explicitly approved reset cycles of the completed port-3003 rehearsal pass.

Requirements: [assessment](../Perform_Plus_Demo_Assessment.md), [accepted plan](DEMO_ASSESSMENT_PLAN.md), [delivery checklist](../TODO.md). This report records this increment's checks, separately from the historical verification reports.

## Delivered behavior

- Six authored cases have finding-specific eligibility, protected passages and named evidence transitions. Population records remain browsable without manufacturing supported decisions.
- Offered assignees are actual local accounts with access to the selected members and sources. Provider account saves preserve practice scope; conversion to a provider requires a practice selection.
- Coding and integrity completion require an independently approved terminal review. Rework and relevant new evidence reopen work. Receipt and provider response are separate from usable documentation and approved coding.
- Decisions, QA rationale, recommendation versions and exact source references remain retained. Prepared additions/deletions use the current approved decision; rejected attempts and retry operations are preserved.
- Prepared summaries and citations follow the published evidence basis. The import summary reports a named, bounded batch and its matching, quarantine and usability states.
- The audit package contains selected-case source, recommendation, review, QA, submission and prepared-report chains, with explicit missing stages.
- Desktop UI uses IBM Plex Sans and plain status/evidence text, with no colored status backgrounds or dots. All sixteen screen families retain their local role gates.

## Verification performed

| Check | Result |
| --- | --- |
| Focused API acceptance | **28 passed**, 133.86 seconds; four existing dependency/lifecycle deprecation warnings. Disposable PostgreSQL schema, separate from both app environments. |
| Final intake handoff label | **1 passed**, 27 deselected, 12.00 seconds after the final wording fix. Known mismatches link to source inspection, publication remains blocked, and the matching signed source remains usable. |
| Type and compile checks | `make check` passed; subsequent frontend type checks passed after integration fixes. |
| Production compilation | Host Next.js production build passed. Separate final UI and API container builds passed. |
| Local deployment topology | Separate Next.js UI, FastAPI API and PostgreSQL containers; protected operations pass through the UI's same-origin proxy. |
| Login and scope | Real coder, QA, submission, provider and superuser logins. Provider2 retains PR-002, can read Morgan and is denied Jordan. Tests cover every offered assignee's member/source reachability. |
| Preview preservation | All 14 existing accounts, roles, practice scopes and password hashes unchanged. Original workflow records, source text and frozen comparison preserved. |
| Exact source/export checks | Protected Jordan/Taylor ZIPs match the completed browser chains, retain exact original source pages and exclude unrelated members. |
| Refresh and return context | Saved decisions and outcomes survive refresh and container replacement. Fresh sign-in restores the selected member and submission record from an allowed deep link. |
| Desktop visual checks | Matching 1440×900 captures across all sixteen screens plus login and detail views; additional 1366×768 and 1920×1080 source/review checks. No mobile acceptance requested. |
| Reset | Automated preservation checks and two approved `:3003` reset cycles pass. All six baseline cases, 14 accounts, practice scopes, passwords, source text and frozen metrics verified; `:3002` unchanged. |

The suite covers review eligibility, independent/self-QA, provider scope preservation, account/source reachability, exact campaign previews and stale-preview rejection, stable assistant ranking, completion/rework, publish-once transitions, no-change analysis, recommendation and legacy decision retention, retry operations, audit ZIP contents and frozen metric formulas. It is focused acceptance coverage, not exhaustive concurrency, performance or production assurance.

## Browser stories and archived outcomes

The connected stories were performed with separately authenticated local accounts in `ct-assessment-20260912` at `http://localhost:3003`. Their completed state was backed up before the subsequently approved reset; the screenshots and exported packages remain retained evidence. The existing preview database was not used for resets or story mutation.

| Story | Observed browser outcome |
| --- | --- |
| Jordan | Coder inspected DOC-0001 and saved a supported decision. QA signed in separately and passed it. Submission specialist prepared the addition, recorded acknowledgement and acceptance, then compared the prepared report. |
| Morgan | Practice-2 provider recorded a local response and received the authored September 18 encounter. Support remained unavailable until retrieval validated and published DOC-0005. The coder reviewed the new source; independent QA passed the fresh decision. |
| Avery | Supported coding stayed disabled for laboratory/pharmacy context. Coder saved an assessment-only disposition; coding completion stayed false. |
| Riley | Original unsigned source failed signature validation. The named mismatch failed member matching and could not publish. The matching signed replacement passed intake and published; the workbench opened that source for a fresh coder decision and independent QA. |
| Taylor | Coder reviewed the contradiction. QA returned it with a user-entered rationale; the coder saw that rationale and submitted a revised decision. Independent QA passed it. A rejected deletion retained its approval and operation on retry; the accepted retry matched expected record absence in the prepared report. |
| Casey | Full retained baseline/combined input sets and assumptions are visible. Numeric scores, deltas and financial results remain unavailable, with a specific explanation. |

Pre-reset rehearsal identifiers make the retained exported evidence directly traceable:

| Case | Source → review → QA → attempt |
| --- | --- |
| Jordan | DOC-0001 → DEC-69e9055a4e → QA-460941aa06 → SUB-bcd7b5fde7 |
| Taylor | DOC-0007 → revised DEC-9ea2e68da4 → QA-d6bbdda9e1 → rejected SUB-16886626b3 → accepted SUB-9fd5b7899b |

Jordan's package contains one review, one independent approval and one accepted linked addition. Taylor's contains two reviews, the rework and pass, and four submission records: the original, historical rejection, new rejection and accepted deletion retry. Both completed prepared chains have no missing stages, while explicitly declining formal audit certification. The report remains synthetic; diagnosis eligibility is **not evaluated** and payment remains **unreconciled**.

The complete frozen comparison still equals the authored seed: AI precision 108/135, recall 108/120, assisted final precision 102/105, manual final precision 84/90 and authored mean review time 22 versus 36 minutes. Current operational activity is separate. No productivity or clinical effectiveness study is claimed.

## Runtime and screenshots

The final working preview is [localhost:3002](http://localhost:3002). Existing environment-specific credentials continue to work; see [README](../README.md#run-locally). Passwords remain in ignored local files, never in this report or frontend bundles. Browser cookies are not port-scoped; use deliberate sign-out/sign-in when moving between environments.

The preview project is `ct-acceptance-20260912142859`. Only UI/API containers were replaced. Its PostgreSQL container and volume were retained. The earlier manually created UI lacked Compose labels; that stateless container was stopped and retained as `ct-acceptance-20260912142859-ui-before-assessment` before creating the managed replacement. Original UI/API image tags remain available as `perform-plus-ui:pre-assessment` and `perform-plus-api:pre-assessment`.

[Screenshot index](../screenshots/assessment/README.md) · [machine-readable manifest](../screenshots/assessment/manifest.json) · [baseline reconstruction metadata](../screenshots/assessment/baseline-reconstruction.json).

There are 62 inspected screenshots: 20 matching before/after screen pairs, nine workflow captures, nine supporting analytics views and four additional desktop-size checks. Native screenshot pixel dimensions are recorded separately from the requested CSS viewport. Images are original browser captures, without resizing or relabeling.

Four original baseline captures were valid: login, overview, suspects and Jordan review. Sixteen initially captured loading frames were replaced using the preserved original UI/API images and a fresh synthetic database in a dedicated baseline project on port 3004. Those records are explicitly marked **reconstructed baseline** in the manifest. They demonstrate the earlier implementation and styling; they are not evidence that mutable case state is identical to the original shared preview.

Visual inspection led to fixes for the current source default in Member 360, addition retry grouping, source-member metadata, code-reference spacing, QA footer state, missing legacy timestamps, sign-in return context and dense toolbar/link layout. Compact Document Intake now keeps its document strip readable and primary actions visible, with source and validation content scrolling inside their panels. A final handoff label directs known mismatches to inspect the quarantined source; it does not offer publication. Fresh proxy checks on both environments confirmed this label and retained Riley's published matching source and QA approval. Valid original clinical source wording was retained even where it uses demonstration language.

Runtime source fingerprints, container identities and fresh check results are recorded in the screenshot manifest and ignored `.local/assessment-*.json` files. Protected completed-case ZIPs are retained at `.local/assessment-jordan-audit.zip` and `.local/assessment-taylor-audit.zip`; they are separate from the screenshot artifact.

## Approved runtime reset

The user approved the pending reset and backup with “go ahead.” Verification completed at **2026-09-13 00:19 UTC** (12 September locally). The test and preview projects use distinct networks and volumes: `ct-assessment-20260912_database` on port 3003 and `ct-acceptance-20260912142859_database` on port 3002.

A protected full backup of the completed test database was saved before resetting: `.local/assessment-rehearsal-before-approved-reset.dump`, 315,673 bytes, owner-only mode `0600`, ignored by Git. Its PostgreSQL archive catalog was checked and includes accounts, workflow state, events and sessions. No restore was performed or claimed.

Both reset requests passed through the test UI's same-origin API proxy. Each restored the same six cases, 10,000 members, 1,500 work items, four seeded campaigns and 12 seeded submissions, with zero tasks, analysis runs, review decisions or QA decisions and one reset event. All 14 accounts, roles, practice scopes and password hashes stayed identical. Original source passages and the complete frozen comparison stayed identical. Two ordinary analysis actions between resets returned the same “No change” result without creating new recommendations; the second reset cleared their runs.

Fresh coder, QA, submission, practice-2 provider and superuser logins passed. Provider2 retained PR-002 access and remained denied another practice's member. Superuser retained all 16 screens and 26 action permissions. A separate browser confirmed six open actionable reviews, zero QA-approved reviews, and Riley's original unsigned DOC-0009 with supported coding disabled. The working preview's business state, accounts, source text, events and container identities stayed unchanged.

Port 3003 is now at the starting baseline, ready for another walkthrough. Earlier completed case outcomes are available in the protected backup and retained ZIPs/screenshots, rather than in the current live rehearsal. [Reset verification metadata](../screenshots/assessment/reset-verification.json) records the non-sensitive results; detailed protected evidence remains in `.local/assessment-reset-verification.json`, `.local/assessment-approved-reset-before.json` and `.local/assessment-approved-reset-after.json`.

## Explicit boundaries

Casey's **nonnumeric** option is delivered. Official complete-member numeric scoring, a working model/year switch and unconfigured program engines remain deferred. Prepared code descriptions and their release references were checked against the retained official reference source; see [reference notes](references/README.md).

No live AI, arbitrary ingestion/OCR, external provider delivery, actual receiver/report integration, payment reconciliation or target Kubernetes rollout was added. Local three-container success does not establish target-cluster deployment or production operating readiness.

The earlier automatic approval rejections were resolved by the user's explicit approval before the backup and reset were executed. The prior blocked record remains archived locally; there is no remaining assessment reset blocker.
