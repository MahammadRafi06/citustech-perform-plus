# CitusTech Perform+ UI-first demo TODO

Updated 12 September 2026. Execution plan: [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md). Product reference: [original coding specification](CitusTech_Perform_Plus_Coding_Spec.md).

The user's clarified priority is a clean UI and a functioning demo, with **local user authentication and local role-based access control (RBAC)** retained. This replaces the previous backend-first milestones and exhaustive release gates. The original specification remains the product reference. UI work starts immediately; a small local service provides real sign-in and permission enforcement as the screens are connected.

Build all sixteen screens, with the strongest detail on the opening screens and main walkthrough. Supporting screens should offer useful, bounded interactions. Primary actions must work; secondary actions must work or clearly explain their unavailable state. Use realistic linked synthetic records, accurate evidence for the six detailed cases, clear fixture/simulation labels and no real outbound delivery.

Allocate effort approximately **60% to visual/UI quality, 25% to journey wiring (including local authentication/RBAC) and 15% to focused QA**. These are effort priorities, not a delivery-time promise. Checkboxes below track the implemented demo and verified demo scope and the remaining environment deployment.

## Implementation status — 12 September 2026

The bounded demo implementation is complete across D01–D06: **Next.js, Tailwind, shadcn/ui, FastAPI and PostgreSQL**, all sixteen screen families, local authentication/RBAC, and the remaining campaign, bulk-action, intake, assistant and navigation work. The focused acceptance suite passes **17 tests**. Browser QA covered the six case paths, both walkthrough routes, account handoffs, reset, downloads, keyboard interaction and the four target viewport sizes. See [verification evidence](docs/VERIFICATION.md) for the exact scope and timing limits.

Separate UI/API images build successfully. An isolated three-container environment verifies UI → API → PostgreSQL, health, real cookie authentication and persistence across API/database restarts. **The remaining deployment item is image publication and validation in the actual target Kubernetes environment.** Registry, cluster/context, namespace and ingress/TLS details have not been supplied. A disposable local Kubernetes attempt was blocked by the workstation's file-watcher limit; it was rolled back without changing existing clusters or host settings.

Current run instructions: [README.md](README.md). Tour: [docs/PRESENTER_GUIDE.md](docs/PRESENTER_GUIDE.md). Deployment: [docs/KUBERNETES.md](docs/KUBERNETES.md).

## D01 — Visual foundation and opening screens

- [x] **D01-01** Scaffold the specified Next.js App Router frontend with React, strict TypeScript, Tailwind CSS and shadcn/ui, TanStack Query/Table, Recharts, accessible shared primitives and CSS tokens; keep setup lightweight and integrate the local auth/data service in D02.
- [x] **D01-02** Build the application shell, eight navigation groups, program/period context, synthetic-data label and signed-in user/role banner; make each screen reachable by its allowed roles.
- [x] **D01-03** Establish polished typography, spacing, restrained colors, cards, tables, status badges and chart styles using the provisional brand direction and a licensed local font.
- [x] **D01-04** Design Program Overview first: readable operational cards, funnel, trends and attention list, with convincing linked synthetic content and useful drill-down targets.
- [x] **D01-05** Design Analytics Explorer with AI Impact as its first tab: clear outcome cards, comparison, contribution and session-activity sections; distinguish frozen comparison results from current demo activity.
- [x] **D01-06** Build reusable filters, detail drawers, tabs, dialogs, toasts, evidence panels and loading/empty/unavailable states; keep density and interactions consistent.
- [x] **D01-07** Review the opening screens in a browser at presentation size and refine hierarchy, alignment, spacing and chart readability before expanding the remaining screens.
- [x] **D01-08** Build a clean local sign-in screen, sign-out action, session-expired state and useful access-denied page; preserve safe return navigation and show only permitted menus/actions after sign-in.

**Ready when:** the shell, Overview and AI Impact look presentation-ready, and their main interactions have clear destinations.

## D02 — Local access, shared demo data and interactions

- [x] **D02-01** Create a typed demo client backed by a small local FastAPI service and PostgreSQL store. Serve protected fixture reads/actions through that service so local RBAC controls the actual data and mutations; keep business behavior bounded to the demo.
- [x] **D02-02** Seed a lightweight 10,000-member roster, six detailed linked cases and the separate frozen comparison dataset on the local server. Serve protected records and case documents through permission-checked routes, not public assets/frontend bundles; preserve the specification's case identities and intended outcomes.
- [x] **D02-03** Persist synthetic workflow changes in PostgreSQL, with a role-protected operational reset; keep accounts/roles separate from fixture reset. Restrict browser persistence to safe display preferences, clear user-scoped query caches on sign-out/account change, and preserve a permitted presenter-tour link across separately authenticated users.
- [x] **D02-04** Wire shared filters, search, sort, pagination and selection to actual fixture records; retain meaningful route/filter context when opening details and returning to a list.
- [x] **D02-05** Implement common action handling with validation for required fields, visible progress/feedback, preserved form input and refreshed affected views after a successful action.
- [x] **D02-06** Derive operational totals and case status from the same shared data; keep frozen comparison values and current-session counts separate, with visible scope and as-of labels.
- [x] **D02-07** Provide working local CSV/report downloads for the main lists and summary views, reflecting the selected filters and visibly labeling synthetic or simulated content.
- [x] **D02-08** Implement local email/password sign-in with seeded accounts, securely hashed passwords, expiring server-managed sessions in HttpOnly cookies and sign-out invalidation. Keep credentials/secrets out of frontend bundles and browser storage; apply same-origin/CSRF checks to cookie-authenticated mutations. No external identity provider is required.
- [x] **D02-09** Define the eight demo roles and a small shared permission matrix; resolve identity/roles on the server and check protected reads, actions, documents, exports and reset. Enforce the relevant seeded provider/assigned-case scope. Reject denied direct API requests even when someone changes a client-side role or opens a hidden route.

**Ready when:** local sign-in/sign-out and role restrictions work; permitted actions survive refresh and appear consistently across screens; reset restores operational fixtures without changing local users/roles.

## D03 — Core walkthrough

- [x] **D03-01** Build Suspect Registry with useful filters, priority/status/evidence columns and a detail drawer; make fixture analysis return linked findings with honest processing feedback and an explicit precomputed label, without artificial delays.
- [x] **D03-02** Connect opportunities to Member 360, with a readable directory, timeline and required tabs populated meaningfully for the six detailed members.
- [x] **D03-03** Build the evidence viewer for the detailed cases with correct document, page, quotation and highlights; distinguish current, historical and contradictory evidence.
- [x] **D03-04** Build the chart-review workspace with clear supported, unsupported, clarification and defer actions; require the evidence/reason appropriate to the demo case and show the resulting disposition across screens.
- [x] **D03-05** Add a practical no-finding review path and visible saved review state; let a reviewer pause/resume without losing entered work, with saved drafts and actual action timestamps; active-time instrumentation is deferred.
- [x] **D03-06** Build Campaign Planner with cohort selection, intervention, allocation and a useful preview; activation creates the previewed local tasks and updates campaign/member views.
- [x] **D03-07** Implement the primary assignment, evidence-request, defer and suppress actions for selected work; show affected records/counts and avoid duplicate work on a repeated demo action.
- [x] **D03-08** Build a focused Coding QA queue and review flow using a separately signed-in local QA user; pass or return a case for rework while retaining the original decision and actor. The original coder cannot independently approve their own review.

**Ready when:** the presenter can move from suspect to source, review, campaign/task and QA with coherent case status and feedback throughout.

## D04 — Supporting lifecycle

- [x] **D04-01** Build Provider Portfolio with useful practice/member context and task details; allow a reviewed neutral query or assessment request to create a clearly simulated provider task.
- [x] **D04-02** Build the Pre-visit Provider View with supported, not-supported, more-information and deferred responses; link responses back to the case and offer the explicitly labeled later-encounter fixture for a fresh review.
- [x] **D04-03** Build Chart Chase with grouped requests, contact history and working request/partial-receipt/received/unavailable actions; separate receipt from usable documentation in labels and state.
- [x] **D04-04** Build Document Intake around sample documents and bounded local file metadata preview; show metadata, member matching, preview and validation feedback. Clearly explain unsupported extraction rather than simulating successful OCR.
- [x] **D04-05** Build Risk Score Scenarios with fixed, clearly illustrative scenarios and assumptions, or a precise unavailable state; keep hypothetical findings separate from confirmed coding and never imply official model calculation.
- [x] **D04-06** Build Submission Operations with sample record/batch preview, downloadable simulated payloads and selectable fixture responses; distinguish transport receipt, accepted/rejected records and unresolved correction outcomes.
- [x] **D04-07** Build Audit Workspace with case/sample selection, evidence readiness and a working synthetic evidence-manifest export; keep original evidence and decision history visible during correction.

**Ready when:** each supporting screen completes a useful local action and returns to the associated member, task or case without implying a real send or verified financial outcome.

## D05 — Remaining screens and consistency

- [x] **D05-01** Complete bounded fixture-backed versions of the nine analytics views: executive, risk/conditions, suspecting, providers, retrieval, coding/QA, submissions, financial scenarios and data/AI operations; make their principal filters and drill-downs useful.
- [x] **D05-02** Add a constrained, labeled template/fixture assistant for selected cohort questions, member summaries and metric explanations; return grounded demo answers or a useful limitation, with explicit user action to apply a proposal.
- [x] **D05-03** Complete Data Operations with fixture source freshness, counts, sample errors and a bounded retry demonstration; show actual local demo activity rather than invented backend execution.
- [x] **D05-04** Complete local account administration with role assignment and account enable/disable restricted to the administrator; changed permissions must take effect without trusting cached client roles. Add program context, tour entry points and protected reset. Switching demo accounts uses sign-out/sign-in, not an unrestricted persona selector.
- [x] **D05-05** Reconcile links, status labels, selected context and counts across all sixteen screens; ensure campaign, provider, QA, submission and audit changes remain attached to the correct detailed case.
- [x] **D05-06** Audit visible controls: primary CTAs complete their intended demo action; secondary actions either do something useful or display a specific unavailable explanation. Remove placeholder buttons and dead navigation.

**Ready when:** all sixteen screens have a coherent purpose, meaningful data and usable interactions, with no dead shells.

## D06 — Polish and rehearsal

- [x] **D06-01** Run focused browser visual QA at 1366×768, 1440×900 and 1920×1080, plus a usable 1024px layout; fix overflow, clipped dialogs, unreadable tables, chart labels and inconsistent spacing.
- [x] **D06-02** Exercise every primary action and the six detailed case paths; check practical keyboard/focus behavior, feedback, source links and the distinction between illustrative, simulated and unavailable results.
- [x] **D06-03** Verify refresh persistence, reset, filter/back navigation and representative downloads; confirm session actions do not change the frozen comparison and repeated main actions do not create confusing duplicate work.
- [x] **D06-04** Rehearse the full eighteen-minute presenter tour and a shorter opening-to-outcome tour with external services unavailable; fix awkward transitions and document the reset/start points.
- [x] **D06-05** Deliver concise local run instructions, a presenter guide, screenshots or a fallback walkthrough, and a clear list of demo simplifications; confirm the finished UI and main journey in the browser before handoff.
- [x] **D06-06** Check successful/failed local login, refresh/session expiry, logout invalidation, allowed/denied actions by role, a denied direct API/export request, and administrator-only user changes/reset. Verify protected case data is cleared from the UI when switching accounts; keep this focused rather than building an exhaustive security suite.

**Ready when:** the demo looks clean, runs smoothly through both tours, resets reliably and is straightforward for another presenter to operate.

## Deferred from this demo

The full normalized domain backend architecture, durable workers/outbox infrastructure, enterprise SSO/federation/MFA, production security hardening, official scoring engines, live AI, real integrations/delivery, complete ingestion pipelines, full source-volume fixtures and exhaustive edge-case coverage remain follow-on work. The small local authentication/RBAC service and its protected demo data/actions are included now.

## D07 — Separate Kubernetes components

- [x] Separate Next.js UI and FastAPI API Dockerfiles; server-only fixture packaging.
- [x] PostgreSQL StatefulSet, persistent volume, separate Services and UI/API Deployments.
- [x] Runtime API URL, generated local secret input, same-origin ingress example and health probes.
- [x] Local Kustomize rendering and deployment guide.
- [x] Build both container images and validate separate UI/API/PostgreSQL containers, health, authentication and restart persistence locally.
- [ ] Push the images and validate the actual target Kubernetes cluster, ingress/TLS and PVC behavior after deployment targets are supplied.
