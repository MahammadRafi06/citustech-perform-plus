# CitiusTech Perform+ — product and engineering handoff

Prepared September 15, 2026 from the current repository and retained verification records. Source baseline: `main` at `f378569`. Repository: `MahammadRafi06/citustech-perform-plus`.

**Perform+ is a desktop healthcare risk-adjustment workspace.** It connects population risk analysis, suspected documentation gaps, source-based chart review, independent coding QA, provider follow-up and submission tracking. The product helps a team identify work, review the evidence, understand its score impact and retain the history behind every decision.

The delivery priority was a polished, connected demonstration with working interactions. It uses 10,000 synthetic members, Florida residence and practice data, named account owners, and six detailed clinical stories. Population browsing and scoring extend beyond those stories; the full interactive clinical workflow is prepared for the six showcase members. Casey includes two independently reviewed findings.

**The delivered workspaces cover the following capabilities.**

| Area | Delivered behavior |
|---|---|
| Risk overview and analytics | Population scores, stage comparisons, recapture, distributions, category prevalence, operational reports, retained-run drilldowns and exports. Reports are side-by-side tabs; tables use 10/25/50/100 pagination. |
| Geography and providers | County, assigned-practice and combined views, rankings and a county-by-provider heatmap. Intersecting filters reconcile to authorized member detail. Geography means member residence; provider means assigned practice, not the treating clinician on each claim. |
| RAF & model lab | Saved full-member add/remove/combined scenarios, factor/category explanations, inputs, exclusions, model context and historical runs. Financial sensitivities keep program-specific assumptions separate from calculated scores. |
| Suspect registry and member profiles | Search, filters, rankings, saved views, assignment, evidence requests, deferral/suppression, clinical findings, source documents and calculation history. |
| Chart review and Coding QA | Source inspection, citation-linked decisions, required rationale, independent findings, saved drafts, pause/resume, pass/rework and retained decision history. |
| Campaigns, chart chase and intake | Cohort/allocation preview, named owners, due dates, activation and completion; practice contact history and retrieval status; prepared source matching, validation and publication. Local TXT/PDF files can be previewed. |
| Providers and pre-visit | Practice-scoped member access, clarification tasks, responses and later-encounter follow-up. |
| Submissions and audit | Prepared addition/deletion, acknowledgement, rejection, retry, acceptance, eligibility and report discrepancies; source-to-decision-to-submission audit chains and CSV/JSON/ZIP exports. |
| Models & data | Versioned configuration catalog, mapping lookup, model readiness, persisted population batches, retry/history and external Medicaid score imports with retained exceptions. |
| Ask Perform+ and AI evaluation | Bounded source-linked explanations, prepared analysis, retained model-output replay and cohort/campaign proposals. Frozen evaluation metrics remain separate from mutable operational activity. |
| Agents | Separate sidebar workspace for five configurable and four planned agent roles. Provider/model selection, private primary/fallback models, settings, instructions/tools, validation, browser-local history, restore and export. |
| Administration | Local accounts, roles, practice scope, enable/disable, session revocation and controlled synthetic workflow reset. |

**Real calculations and simulated external behavior must remain clearly distinguished.** Eight current configurations execute installed, checksum-verified official software within their declared scope: MA V28 PY2026; MA V28 PY2027 Initial and later-run forecast; four PY2027 RxHCC MA-PD/PDP Initial/forecast configurations; and ACA HHS-HCC V08 BY2026. Medicaid uses externally calculated score imports. Historical V24 execution/comparison remains unavailable. Missing or ineligible inputs must not receive fabricated scores.

Scores retain inputs, configuration/assets, factors, exclusions and run identity. Captured, supported, submitted, accepted and eligible stages remain separate; reported observations and hypothetical potential are separate again. Geography analytics use raw model scores and eligible member-month weighting, not payment RAF. Financial scenarios are estimates from explicit assumptions, not reconciled payments.

AI is prepared behavior or retained-output replay, not a deployed live inference service. Agents settings persist per user in the current browser and do not configure live execution. Private-provider selection does not establish endpoint connectivity or compliance. Entra/Okta marks on sign-in do not implement SSO. Provider responses, chart-retrieval transitions and receiver/report outcomes are local prepared workflows. TXT/PDF preview is not server-side ingestion or OCR; external-score CSV import does parse actual uploaded rows.

**Preserve these rules when extending the product.**

- Clinical support requires the exact eligible source and finding; historical, indirect, unsigned or mismatched evidence cannot be promoted merely because another signed document exists.
- A reviewer cannot approve their own decision, including the superuser. Changed supporting evidence requires fresh review and QA while preserving prior snapshots.
- Provider response, receipt, publication, QA, receiver acceptance and payment are different milestones.
- Provider/practice and role scope apply to records, actions, analytics and exports. Ordinary administrators do not gain clinical authority. Superusers have all workspaces/actions but retain the clinical gates.
- Keep score definitions, denominators, missing/stale states and evidence provenance intact. Synthetic data, frozen metrics and retained replay must not be presented as live clinical outcomes.

**The established design direction is desktop only.** Preserve IBM Plex Sans, the shared cobalt/teal palette, white collapsible sidebar, consistent page padding, and plain status text without colored backgrounds or dots. Sign-in uses approximately 70% blue branding/carousel and 30% plain white login. CitiusTech product assets and Northstar & Meridian workspace branding are already bundled. Inspect fully rendered screens at matching desktop viewport sizes before accepting visual changes.

**The implementation has three separate components.** Next.js App Router, React, TypeScript, Tailwind/shadcn, TanStack and Recharts form the UI in `apps/web`. FastAPI in `apps/api` provides authentication, workflow actions and scoring APIs. PostgreSQL stores accounts, sessions and workflow state; versioned scoring data has dedicated persisted records. The operational demo state still uses a single locked JSON state row, so it is not a completed production domain schema. Authentication uses Argon2 hashes, expiring cookie sessions and CSRF/origin checks.

The local browser uses the Next.js `/api` proxy to FastAPI. Separate Dockerfiles and Kubernetes UI/API/database definitions remain in the repository. Scoring adapters live in `apps/api/app/risk_models`; shared model orchestration/storage live in the `risk_*` API modules. The desktop shell is `apps/web/src/components/demo-app.tsx`; core clinical transitions are in `apps/api/app/assessment.py`.

**Run locally when needed; this handoff does not restart anything.** The documented prerequisites are Node.js 24+, Python 3.13, `uv` and PostgreSQL 18. From the repository root:

```sh
make setup
python scripts/model_assets.py install --dest .local/model-assets
python scripts/model_assets.py verify --dest .local/model-assets
make dev
```

UI: `http://localhost:3000`; API: `127.0.0.1:8000`; dedicated local PostgreSQL: `127.0.0.1:55432`, with data in `.local/postgres`. Official model archives are not committed; the installer verifies their manifest hashes. See [model runtime details](../apps/api/app/risk_models/README.md) for scoring interpreter configuration. Local service availability was not retested for this handoff.

Credentials remain in ignored owner-only files: `.local/demo-accounts.json` and `.local/superuser-account.json`; other previews may use separate records/databases. Do not commit passwords. `superuser@perform.test` is the all-workspace account. Initial-password environment variables do not reset existing accounts. Cookies are shared across ports on the same hostname, so concurrent localhost previews can replace each other's sessions. Stopping `make dev` stops UI/API; the local PostgreSQL process stays running.

**Latest recorded validation:** the September 14 gap-closure run passed 196 API tests and the production Webpack build/type checks. The earlier browser audit recorded 164 observations and fixed eight reproduced defects. Its three follow-up gaps—ACA demographic consistency, actual browser attachments and a two-finding clinical story—were subsequently closed. The independent model receipt records 98 checks and 79 reference cases; these are separate historical evidence, not totals to add to the latest API count. No test suite was rerun while writing this handoff.

Useful local commands are `make check`, `make test` and `make build`. The recorded successful build fallback for the workstation's Turbopack worker restriction is `npm --prefix apps/web run build -- --webpack`. Tests use disposable PostgreSQL schemas. Browser QA should also use an isolated data copy so review decisions, resets and imports do not change the presentation dataset.

**AWS hosting is intentionally decommissioned.** On September 15 the public Perform+ deployment, ALB, dedicated node/disks, ECR repositories/images, Lambda/network dependencies, logs and app DNS were removed. The last hosted application release was `1e0f49e`; decommissioning is recorded on `main` through `f378569`. The shared EKS cluster and other applications remain. The workflow is disabled, `PERFORM_PLUS_DEPLOY_ENABLED=false`, `deploy/DECOMMISSIONED` blocks bootstrap, and the active Terraform configuration has no provisioning resources. Do not restore hosting without a new explicit request and reviewed resource plan.

The final database archive is `.local/aws-deploy/teardown-20260915/perform-plus.pgdump`. It is local, private and absent from Git; a new maintainer needs a separate secure transfer if that exact dataset is required. Its full archive stream was validated, but a restore drill was not performed.

**Outstanding work is tracked in `TODO.md`, not implied complete by the polished UI.** Major remaining items are historical V24 reference execution/comparison; broader multi-program population/routing and restart acceptance; complete recapture, scenario-to-review and campaign/provider score-impact integration; AI-origin contribution attribution; expanded receiver/report/provenance coverage; and performance acceptance. Live providers/inference, enterprise SSO, general ingestion/OCR, clinical integrations and production hardening were deferred. Keep these separate from the three browser gaps that are now closed.

Use [TODO.md](../TODO.md) and the [V2 requirement matrix](V2_REQUIREMENTS_MATRIX.json) for the backlog; [browser audit](BROWSER_E2E_AUDIT.md) and [gap closure](AUDIT_GAP_CLOSURE.md) for latest interaction evidence; [Agents scope](AGENT_MODEL_CONFIGURATION_PLAN.md) and [Florida analytics](FLORIDA_ANALYTICS_PLAN.md) for their definitions; [presenter guide](PRESENTER_GUIDE.md) for clinical stories; and [decommissioning](../deploy/DECOMMISSIONING.md) for hosting state. Screenshots are under `screenshots/`, especially `browser-e2e`, `audit-gap-closure`, `florida-analytics` and `agents-polish`. Older README and verification passages describe earlier increments, including obsolete deployment-pending and MA-only statements; they do not override the later evidence linked here.
