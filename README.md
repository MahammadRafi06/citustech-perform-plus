# CitusTech Perform+

A desktop risk-adjustment workspace with real local accounts, local role-based access and connected review workflows. All member information is synthetic. Analysis, authored source transitions and receiver outcomes use prepared records rather than external services.

## Run locally

Requirements: Node.js 24+, Python 3.13, `uv`, and PostgreSQL 18. This workstation already has the dependencies and an isolated database initialized.

```bash
make setup
make dev
```

Open **http://localhost:3000**. The UI runs on 3000 and the API on 8000. `scripts/database.py` initializes its own PostgreSQL directory under `.local/postgres`, listening only on `127.0.0.1:55432`. It preserves existing demo data on subsequent starts. PostgreSQL stays running when the UI/API launcher stops.

The separate container preview uses **http://localhost:3002** by default. Its Next.js proxy connects to the API container at `http://api:8000`, which uses the container database. It does **not** connect to the development API on host port 8000. A successful development login therefore does not establish that the same password works in the preview.

| Environment | Browser URL | Credential source |
| --- | --- | --- |
| Development | `http://127.0.0.1:3000` or `http://localhost:3000` | `.local/demo-accounts.json`; generated superuser record in `.local/superuser-account.json` |
| Container preview | `http://localhost:3002` | Initial ordinary-account password comes from the protected `.local/acceptance.env` configuration; when present, the `preview` entry in `.local/superuser-logins.json` records the separately generated preview superuser login |

Keep these files local, ignored by Git and restricted to their owner. Read the entry for the intended environment; do not copy credentials into documentation or commits. The recorded password must still match that environment's database. Changing initial-password configuration does not change an existing account.

When using both environments, prefer `127.0.0.1:3000` for development and `localhost:3002` for the preview. Browser cookies are not separated by port: signing into another `localhost` instance replaces its `ct_session` cookie and can end the first session. Use the application's sign-in screen for browser verification rather than a direct API login on a different port.

If PostgreSQL is installed elsewhere, change `PG` in `scripts/database.py`, or set `DATABASE_URL` to a **dedicated demo database** before starting. The API creates its own tables on startup; do not point it at an unrelated application's database.

The first start generates local passwords in **`.local/demo-accounts.json`** (ignored, file mode 0600). Enter the account email and its password from that file. The interface uses clean aliases such as analyst@perform.test; legacy addresses in the credentials file remain valid with the same passwords. To choose the initial shared demo password yourself, set `CT_DEMO_PASSWORD` before the first startup. Changing that environment variable does not reset existing accounts.

| Account prefix (`@perform.test`) | Role |
| --- | --- |
| `analyst` | Risk analyst — opening dashboard and main tour |
| `executive` | Executive — population and analytics, read-only |
| `coder` | Coder — assigned first 30 cases, source review and decisions |
| `qa` | QA reviewer — independent pass/rework |
| `retrieval` | Retrieval coordinator — chart chase and sample intake |
| `provider` | Provider for PR-001 |
| `provider2` … `provider6` | Separate providers for PR-002 … PR-006 |
| `submission` | Submission analyst — simulated outcomes and corrections |
| `admin` | Administrator — users, roles, operations and reset |
| `superuser` | Superuser — all pages, action permissions and member records |

Accounts have one role each. Provider users only receive their practice's records. Clinical actions remain unavailable to administrators. The separate superuser can access every workspace and action, while source eligibility and independent QA still apply. Sign out and sign back in to switch accounts; role changes revoke the affected user's sessions.

On first startup, including upgrades of an existing local database, the API creates `superuser@perform.test` if no superuser account exists. Its generated password is saved in `.local/superuser-account.json` (or `CT_DATA_DIR/superuser-account.json` in a container), with file mode 0600 and outside Git. Set `CT_SUPERUSER_PASSWORD` before that first startup to choose the initial password. Subsequent startups preserve existing accounts and passwords; changing the environment variable does not reset them.

The example container runtime directory is temporary. Save the generated superuser credential file in protected local storage before recreating the API container, or provide the initial password through your deployment's secret configuration. The database retains the account even when that temporary file disappears.

## Stack and layout

- **UI:** Next.js App Router, React, strict TypeScript, Tailwind CSS, shadcn/ui, TanStack Query/Table, Recharts, Lucide, Sonner, locally bundled IBM Plex Sans. The workspace is designed for desktop use.
- **API:** FastAPI, Argon2 password hashes, opaque expiring cookie sessions, CSRF/origin checks, protected fixtures/actions/downloads.
- **Database:** PostgreSQL. Users, sessions, event history and mutable demo state persist here. The operational dataset is a single locked JSON state row to keep this demonstration small.

```text
Browser ── same origin ── UI (Next.js)
                 └────── API (FastAPI) ── PostgreSQL
```

Locally, Next.js forwards `/api/*` using the server-only `API_INTERNAL_URL` environment variable. In Kubernetes, the example ingress routes `/api` directly to the API and `/` to the UI. PostgreSQL has no public endpoint.

| Path | Purpose |
| --- | --- |
| `apps/web` | UI, shared design components, local proxy |
| `apps/api` | Protected API and focused acceptance tests |
| `apps/api/app/assessment.py` | Additive case catalog, named source transitions, completion rules and retained trace assembly |
| `seed/demo.json` | Server-only synthetic roster, six detailed cases and frozen comparison |
| `deploy/k8s` | Separate UI/API Deployments, PostgreSQL StatefulSet/PVC, Services, config and ingress example |
| `docs/PRESENTER_GUIDE.md` | Opening route and five connected stories across six cases |
| `docs/DEMO_ASSESSMENT_PLAN.md`, `TODO.md` | Assessment requirements, execution checklist and deferred scope |
| `docs/ASSESSMENT_VERIFICATION.md` | Observed checks, limits and current screenshot evidence |
| `docs/references` | Retained prepared code references and the scoring fallback boundary |

## Verify

```bash
make check
make test
make build
kubectl kustomize deploy/k8s
```

API tests create a randomly named temporary schema in the configured local database and remove only that schema afterwards. The running demo's records and accounts are preserved. The tests cover the main authorized/denied role paths and state changes; this is not an exhaustive production security suite.

## Kubernetes

See [deployment instructions](docs/KUBERNETES.md). UI and API have separate Dockerfiles and images. PostgreSQL has its own persistent volume. This repository prepares the deployment; it does not assume a cluster, ingress domain or registry.

## Connected assessment workflows

The 10,000-member directory remains available for population browsing. Six explicit cases support complete actions. Both review surfaces receive the same server-derived eligibility; a historical mention, indirect signal or unsigned source cannot become supported coding simply because another signed document exists. Prepared Jordan/Taylor code outputs retain their release and source references.

Campaigns select those actionable cases, an eligible local account and a due date. The exact preview checks account access, current work revisions and existing coverage before activation. Existing larger campaigns retain their population membership; their actionable subset and completion denominator are shown separately. Coding/integrity work completes only after a terminal review and independent QA. Source remediation uses source usability; receipt alone is insufficient. A provider response is its own milestone and never approves coding.

Reviews and QA retain actor, reason, time, recommendation and exact source passages. Rework requires an entered explanation. The same reviewer cannot approve their own decision, including when using the superuser. A relevant published source updates the prepared finding, retains earlier snapshots and requires fresh review/QA; unchanged evidence does not manufacture a new recommendation version.

Morgan's September 18 encounter, Riley's signed replacement and mismatch, and Jordan's later clarification are named authored transitions. Receiving a staged document does not make it support-eligible: it must pass member/signature checks and publication. Original source text remains available. Avery has no qualifying authored later encounter, so a response leaves the assessment signal unsupported.

After QA, the submission specialist explicitly prepares Jordan's addition or Taylor's deletion from that exact current approval. A rejected attempt can produce a retry with the same intended operation and retained history. Transport acknowledgement, receiver acceptance, diagnosis eligibility, prepared report comparison and payment reconciliation remain distinct. The named synthetic report checks presence of an added record or absence of a deleted record; it does not reconcile payment.

Ask Perform+ uses current prepared findings, exact page/section citations and stable explained cohort rankings. Displayed answers become stale when their evidence or work context changes. Audit exports include readable and machine-readable source → recommendation → review → QA → submission chains, with unavailable stages explicitly identified. Data Operations shows received, matched, quarantined and published document counts for a named prepared batch.

Follow the [presenter guide](docs/PRESENTER_GUIDE.md) for the five rehearsed story routes. The increment passes 28 focused API tests and production builds; [assessment verification](docs/ASSESSMENT_VERIFICATION.md) records browser results, preserved preview accounts and the additional runtime-reset approval boundary. Before/after captures are in [screenshots/assessment](screenshots/assessment/). [Earlier verification](docs/VERIFICATION.md) and [redesign QA](docs/UI_QA.md) remain historical evidence for earlier increments. The container registry push and target Kubernetes rollout remain pending environment details.

## Demo boundaries

Six cases within the 10,000-member roster have a prepared workflow; population-only records cannot be assigned or reviewed as complete cases. The configured story is MA Part C, service year 2026/payment year 2027. Other programs are unconfigured.

Casey's comparison delivers the assessment's **nonnumeric fallback**: retained demographics and documented diabetes/CKD input sets, with the explanation of what a configured full-member model would need. It does not infer diabetes type, kidney stage, particular hierarchy effects, coefficients or revenue. Official numeric scoring and model/year switching remain deferred because independently checked reference outputs are unavailable.

Intake can preview local TXT/PDF files and validate prepared sources; it does not upload arbitrary files, perform OCR or run a general ingestion pipeline. Provider responses and receiver operations remain local. No live AI, outbound clinical messages, payer integration or payment reconciliation is configured. The frozen 200-chart AI comparison and its metric definitions remain separate from mutable workflow activity. Scenario dates are staged; saved actions retain their actual timestamps.

A broader domain database model, live integrations, general document ingestion, live AI and enterprise auth are follow-on work. The original [product specification](CitusTech_Perform_Plus_Coding_Spec.md) is preserved unchanged.
