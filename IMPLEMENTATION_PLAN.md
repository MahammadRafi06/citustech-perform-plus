# CitusTech Perform+ demo implementation plan

## Current increment — business requirements V2, in development

The active plan is [Business requirements V2](docs/BUSINESS_REQUIREMENTS_V2_PLAN.md), with the [active V2 backlog](TODO.md#active-increment--business-requirements-v2) and [170-requirement traceability matrix](docs/V2_REQUIREMENTS_MATRIX.json). It is based on `origin/main` at `9b77300` in the isolated `codex/business-requirements-v2` checkout.

**The user approved development after reviewing the TODOs. Implementation is underway; see [current verification](docs/V2_VERIFICATION.md).** V2 requires actual MA, historical V24/V28, RxHCC and ACA calculation plus Medicaid external-score workflows. Earlier nonnumeric/precomputed fallback acceptance and deferred scoring statements below are historical and are superseded. Local authentication/RBAC, clinical/QA gates, desktop visual conventions, evidence provenance and separate UI/API/database components remain in scope.

## Historical increment — capability assessment

The previous execution plan is [docs/DEMO_ASSESSMENT_PLAN.md](docs/DEMO_ASSESSMENT_PLAN.md), based on the complete [12 September assessment](Perform_Plus_Demo_Assessment.md) and checked against merged `main` at `40be7e2`. Track its completed implementation and verification under [historical assessment backlog](TODO.md#historical-assessment-backlog--previous-increment).

The assessment increment is **implemented and verified**, with [fresh verification evidence](docs/ASSESSMENT_VERIFICATION.md). Automated reset checks and two explicitly approved reset cycles of the isolated rehearsal passed; the shared preview was preserved. It connects review, independent QA and simulated submission; fixes evidence/assignment/progress gaps; updates prepared findings and source-linked explanations; adds scoring/trace explanations; and verifies the desktop presenter route. Local authentication/RBAC and separate UI/API/database components remain in scope. The new plan records the complete acceptance criteria and explicit fallback for scoring.

## Historical initial implementation plan

The remainder records the original build plan and its earlier completion evidence. It does not supersede the assessment scope or the user's later desktop, typography and plain-status preferences. Its completion claims apply to that initial delivery; the assessment has separate verification and explicit deferred work.

Updated 12 September 2026: **Next.js + Tailwind + shadcn/ui; separate Kubernetes UI, API and PostgreSQL components.** Following the user's clarifications: **prioritize UI cleanliness and working demo interactions, while keeping local user authentication and local role-based access control (RBAC).** Track delivery in [TODO.md](TODO.md).

This direction replaces the previous backend-first M01–M13 execution order and pre-frontend backend gates for this demo. The [original specification](CitusTech_Perform_Plus_Coding_Spec.md) remains the reference for product content, visual direction and scenario meaning. Its full backend architecture and release suite are deferred where they exceed the needs below. The original document is preserved unchanged.

## What success looks like

A presenter can sign in with a local account, open an attractive workspace and complete the main product story within that user's permissions. Tables, filters, drawers, evidence links, forms, state changes and downloads work. Moving between screens or refreshing the browser preserves the demo's progress; reset reliably restores the starting story.

Keep all sixteen screen families, with the most attention on Overview, AI Impact, Suspect Registry, Member 360 and Chart Review. Supporting screens get clean, bounded interactions that complete the story. Depth of backend implementation is not a demo acceptance measure.

Use roughly **60% of effort for visual design and UI implementation, 25% for connected demo interactions/data, and 15% for focused verification and rehearsal**. This is a prioritization guide, not a calendar estimate.

## Build approach

- Use the user-requested Next.js App Router, React, strict TypeScript, Tailwind CSS, shadcn/ui and table/chart approach. Start with the actual application shell and opening screens; no separate design approval gate is required before continuing.
- Put synthetic fixtures and actions behind one typed client and a small local FastAPI service. Use PostgreSQL for local users, role assignments, sessions and shared synthetic workflow state. Components read and update the same members, opportunities, campaigns, reviews and submissions through protected endpoints.
- Persist workflow changes locally on the server so they survive refresh and can be shared between authenticated demo users. Browser storage holds safe display preferences only; user-scoped cached data is cleared on sign-out/account change. Keep fixture reset separate from account/role management. UI, API and PostgreSQL are separate Kubernetes components. A dedicated worker remains deferred.
- Use precomputed AI responses and simulated retrieval/provider/receiver outcomes. Run analysis must actually select the relevant fixture, update the visible result and record the demo action. Show honest processing feedback and a simulation label, without manufactured delays or invented live progress.
- Seed the six detailed cases on the local server with readable synthetic documents and working evidence anchors; serve documents through protected routes rather than public assets. Add lightweight rows for population browsing. Reproduce the displayed 10,000-member population consistently without generating the specification's entire production-style source inventory.
- Keep the frozen synthetic comparison separate from mutable demo-session activity. Opening evidence or changing a decision updates the session/workflow display, not the benchmark.
- Use separately authenticated seeded users for the different demo roles. Account switching uses sign-out/sign-in; a browser persona selector cannot grant permissions or impersonate another user.

## Local authentication and RBAC

Keep this small and fully local. Implement email/password sign-in, securely hashed stored passwords, an expiring server-managed session in an HttpOnly cookie, session restoration and sign-out invalidation. Resolve the current account and its roles on the server; use same-origin/CSRF checks for cookie-authenticated changes. Configure secrets locally and keep credentials out of browser storage and frontend bundles.

Protect routes/navigation for a clean experience and enforce permissions on the actual local API reads, changes, documents and downloads. Shared protected fixtures must come through that API rather than being bundled into an unrestricted frontend dataset. Frontend visibility alone is not the RBAC boundary.

Use the specification's eight roles with a compact permission matrix:

| Local role | Demo access |
| --- | --- |
| Executive | Overview, analytics and allowed reports; read-only member access for this demo |
| Risk analyst | Population/suspects, analysis, cohorts, campaigns and assignment; no coding approval |
| Retrieval coordinator | Assigned chart chase/intake and related member/source records |
| Coder | Assigned/scoped source review, decisions and clarification tasks |
| QA reviewer | Independent QA, pass/rework and permitted integrity review; no self-approval of the original coder's work |
| Provider | Granted practice/cases, pre-visit tasks and responses |
| Submission analyst | Sample batches, responses, corrections and permitted audit exports |
| Administrator | Local users/roles, settings and demo reset; clinical actions still require the appropriate clinical role |

Use the compact role matrix for audit, scenario views and presenter navigation. Each local account currently has one role. Use a simple provider/assigned-case relationship where the role requires it; full multi-tenant policy infrastructure is deferred. An administrator can assign roles and enable/disable accounts. Disablement or role changes must invalidate or refresh affected session permissions. No public registration, external SSO, federation or MFA is required for this demo.

Seed distinct local users and document their local setup/login procedure. If the tour combines activity across accounts, use an explicitly permitted tour identifier and retain the actual signed-in actor on each action. Reset restores demo business records and tour activity without resetting users, passwords or role assignments.

## Delivery order

Every phase ends with something visible and usable in the browser. Polish the current flow as it is connected; do not leave visual work until the end.

| Phase | Priority and deliverable | Done when |
| --- | --- | --- |
| D01 — Visual foundation and opening screens | Sign-in UI, shell, typography, spacing, shared cards/tables/drawers; Overview and AI Impact | The opening experience is clean at presenter resolutions and has clear sign-in and drill-down paths |
| D02 — Local access, shared demo data and interactions | Local sign-in/sessions/RBAC, PostgreSQL-backed fixture service, persistent filters, save/reset and linked cases | Permitted actions work across screens/refresh; denied API actions fail; reset preserves accounts/roles |
| D03 — Core walkthrough | Suspect Registry → Member/evidence → campaign → chart review → QA; fixture AI and decision feedback | A presenter completes the main story and sees the resulting state reflected in queues and summary cards |
| D04 — Supporting lifecycle | Provider/pre-visit, intake/chase, scenario view, submissions/corrections and audit download | The remaining showcase stories have working actions and a clear visible outcome |
| D05 — Screen completion and consistency | Remaining analytics, Data Operations and Administration; consistent navigation, counts and action behavior | All sixteen screen families are present with useful demo content and bounded working interactions |
| D06 — Polish and rehearsal | Visual browser inspection, interaction fixes, repeatable tour, reset and concise setup guide | Both a short tour and the full approximately eighteen-minute tour run cleanly from a reset |

The first coding package, now implemented, is D01: scaffold the frontend, implement the sign-in UI and shell/design tokens, and build Overview and AI Impact using a small coherent fixture set. Connect their primary drill-downs immediately. Add actual local authentication/RBAC and the protected fixture service in D02 before accepting the connected demo workflows; this does not restore the original broad backend gates.

## UI cleanliness standard

- Establish clear hierarchy: page title, a short explanation, one prominent primary action, then the data. Keep less-used actions in an overflow menu or contextual drawer.
- Use consistent spacing, typography, borders, status colors and component sizing. Keep charts readable, numerical precision sensible and table columns focused on the task.
- Prioritize realistic content density. Use detail drawers for supporting information so screens do not become walls of metadata or configuration fields.
- Make selected filters, row selection, current member and current workflow status easy to see. Preserve context when navigating to a record and back.
- Give each action an understandable outcome: updated record, opened detail, created task, downloaded file or clear validation feedback. Avoid buttons that only produce a generic success toast.
- Include useful empty/loading/error states for the interactions being demonstrated. Fix clipped text, overflowing tables, chart collisions, unstable layouts and modal focus issues as they appear.
- Retain basic keyboard access, readable contrast, labels and visible focus. Favor desktop presentation quality at 1366×768, 1440×900 and 1920×1080; keep narrower widths usable without building a separate mobile product.
- Keep synthetic/simulated labels visible but unobtrusive. Keep implementation details in presenter/setup notes rather than the executive's normal flow.

## Screen scope for this demo

| Screen | Phase | Working demo scope |
| --- | --- | --- |
| 01 Program Overview | D01; connected in D02/D03 | Clean KPI/funnel/trend layout; cards drill into matching members/work; workflow totals update |
| 02 Analytics Explorer and AI Impact | D01; expanded in D05 | Synthetic comparison, How measured, current-session panel, filterable supporting views and relevant drill-downs |
| 03 Suspect Registry | D03 | Search/filter/select, fixture analysis, why-prioritized drawer, evidence/history and campaign entry |
| 04 Campaign Planner | D03 | Cohort preview, intervention/assignment form, activate and view the created campaign/tasks |
| 05 Member 360 | D03 | Linked timeline/tabs, readable summary, exact source navigation and current work status |
| 06 Chart Chase Workspace | D04 | Filtered requests, request detail, simulated receipt and visible partial/usable outcomes |
| 07 Document Intake | D04 | Load a bundled sample, show matching/source details, publish the valid case and demonstrate one mismatch |
| 08 AI Chart Review | D03 | Readable document/highlights, select finding, save a reasoned decision, update queue and hand off to QA |
| 09 Coding QA | D03 | Open assigned example, inspect original decision, pass or return for rework and show the resulting state |
| 10 Provider Portfolio | D04 | Practice/member drill-down, open tasks and editable neutral query draft |
| 11 Pre-visit Provider View | D04 | Concise assessment questions, save a response and load the explicitly later encounter example |
| 12 Risk Score Scenarios | D04 | Compare named precomputed illustrative scenarios with visible assumptions, or show configuration required; no invented live calculation |
| 13 Submission Operations | D04 | Prepare/download a sample, apply simulated acknowledgement/rejection, inspect and remediate a linked correction |
| 14 Audit Workspace | D04 | Select showcase evidence and download an actual package/manifest matching that selection |
| 15 Data Operations | D05 | Fixture source freshness/run history, inspect one sample issue and demonstrate retry/status update |
| 16 Administration and Presenter Controls | D02 access/reset; finished D05 | Administrator-only local user/role management, scenario controls, preferences and protected demo reset |

All nine supporting analytics views can use bounded, prepared datasets. Only expose filters and narrative questions supported by those datasets. Likewise, intake may support bundled/declared sample formats; arbitrary document extraction and general-purpose ingestion are deferred.

Main walkthrough actions must work. Secondary functions should have a meaningful bounded behavior or a clear “Not available in this demo” explanation. This is not permission to replace a primary workflow with a static screen or a toast.

## Six showcase journeys

| Case | What the audience sees and does |
| --- | --- |
| MB-000001 — documented gap | Open a fixture recommendation, inspect the current source passage, save the supported review and see QA/queue updates |
| MB-000002 — historical condition | Create a pre-visit task, save a response, load a labeled later encounter and return to review |
| MB-000003 — predictive signal | Inspect the limited evidence and create a neutral assessment task; it remains distinct from an approved diagnosis |
| MB-000004 — unsupported existing code | Review the contradiction, follow QA/correction, see acknowledgement then rejection, and leave the correction visibly unresolved until simulated remediation succeeds |
| MB-000005 — scenario comparison | Compare a clearly illustrative combined scenario and its explanation, or a useful configuration-required state; do not sum unrelated candidate effects |
| MB-000006 — source issue | Inspect the prepared source-eligibility reason and route a remediation task |

Preserve these product distinctions through a small set of explicit fixture transitions. They do not require a comprehensive clinical rules engine. Prewritten summaries and neutral query drafts are acceptable; supported prompts should open relevant content and require an explicit user action to create work.

## Minimum data and behavior checks

Use just enough structure to keep the demo coherent:

- Shared stable IDs connect a case, source passage, opportunity, campaign/task, review and sample submission. Opening a citation must show the intended member and document.
- Lists, selected counts, dashboards and exports agree for supported filters. Keep broad synthetic population data and the 200-chart comparison distinct.
- Saving a review, creating a campaign or applying a simulated response updates the affected views and survives refresh. Disable duplicate clicks while an action is being saved.
- Local roles govern real API actions and protected records/files, including direct requests. Signing out ends access; signing in as another user refreshes menus, permissions and cached case data.
- Preserve a small visible action history so a presenter can explain what changed. Reset restores operational fixtures and clears session activity while leaving the frozen comparison intact.
- Keep benchmark arithmetic consistent with the specification, including 80% AI precision, 90% recall, 102 versus 84 independently supported final findings, and 22 versus 36 minutes per chart. These remain labeled synthetic comparisons.
- Retain synthetic-only data and simulated external actions. Scores that are illustrative carry that label in the screen and export; unavailable real calculations remain unavailable.

A few targeted checks for local login/RBAC, shared state/reset, benchmark arithmetic and the main action transitions are sufficient initially. No coverage percentage, full backend-negative suite, crash-recovery exercise or comprehensive adversarial test matrix is a prerequisite for the demo.

## Focused acceptance and handoff

1. Inspect the main screens in the browser at presenter resolutions, checking spacing, content density, readable evidence, table/chart layout and primary-action visibility.
2. Walk the six cases and every visible primary action. Fix broken navigation, dead controls, wrong records, missing feedback and inconsistent state.
3. Refresh during the main flow, revisit prior screens, download actual sample artifacts and reset twice. Confirm the story is repeatable and a second run does not accumulate unwanted demo work.
4. Verify valid/invalid login, session restoration/expiry, sign-out invalidation, allowed/denied role actions, one denied direct API/export path and administrator-only account/reset operations. Check account changes clear prior user data from the UI.
5. Rehearse a short executive route and the full tour with external services unavailable. Confirm switching local accounts and opening prepared scenarios is straightforward.
6. Deliver a short startup/login guide, presenter route/bookmarks, reset instructions and a list of simulated or unavailable features. Add a fallback recording after the interactive flow is stable.

Keep verification proportional to the demo. Fix ordinary visible failures and broken scenario behavior before expanding into rare edge cases.

## Deferred backend and production work

These remain later work, not blockers for the UI demo:

- Complete domain API/OpenAPI/SQLAlchemy/Alembic/PostgreSQL implementation and production-shaped schema coverage beyond the small local auth/RBAC and fixture service.
- Durable workers, transactional outbox, leases, distributed idempotency and concurrency/crash-recovery guarantees.
- Enterprise SSO/federation/MFA, full multi-tenant policy infrastructure, comprehensive access auditing and production security hardening. Local account authentication, RBAC and the demo's provider/case scope checks remain included.
- Live inference, calibration studies, general retrieval/extraction pipelines and arbitrary document support.
- Validated official scoring engines, full program/source-policy packs, live provider/receiver integrations and financial reconciliation.
- Full 20,000-source/12,000-encounter generation, comprehensive adversarial fixtures, exhaustive backend/browser suites, load testing, backup/restore operations and production deployment work.

A typed demo service keeps a later backend integration possible. Do not introduce an infrastructure subsystem unless a required demo interaction actually needs it. Publishing or real external delivery remains a separate action.

## Initial implementation record — historical

D01–D06 are delivered for the bounded demo. The remaining feature work includes exact campaign allocation previews, atomic bulk actions, validated source publication, chart contact history, a grounded fixture assistant, URL-based list/detail context, user-scoped draft retention and synchronized case outcomes. All sixteen screen families and nine supporting analytics views were exercised in the browser. Local authentication and RBAC remain enforced by the separate API.

Seventeen focused acceptance tests pass. Both Docker images build, and an isolated UI/API/PostgreSQL stack passes authentication, health and restart-persistence checks. The full six-case route and shorter opening route were rehearsed; presenter timing remains a pacing guide rather than a benchmark. See [verification](docs/VERIFICATION.md) and the updated [presenter guide](docs/PRESENTER_GUIDE.md).

Only environment-specific delivery remains: publish images to the chosen registry and validate the target Kubernetes rollout, ingress/TLS and PVC behavior. No remote cluster has been selected or changed. This does not expand the demo into the deferred production backend scope above.
