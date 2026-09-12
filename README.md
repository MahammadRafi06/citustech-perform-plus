# CitusTech Perform+

A connected risk-adjustment **product demo** with a polished Next.js interface, real local accounts and local role-based access. All member information is synthetic; AI findings and external responses use prepared fixtures.

## Run locally

Requirements: Node.js 24+, Python 3.13, `uv`, and PostgreSQL 18. This workstation already has the dependencies and an isolated database initialized.

```bash
make setup
make dev
```

Open **http://localhost:3000**. The UI runs on 3000 and the API on 8000. `scripts/database.py` initializes its own PostgreSQL directory under `.local/postgres`, listening only on `127.0.0.1:55432`. It preserves existing demo data on subsequent starts. PostgreSQL stays running when the UI/API launcher stops.

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

Accounts have one role each. Provider users only receive their practice's records. Clinical actions remain unavailable to administrators. Sign out and sign back in to switch accounts; role changes revoke the affected user's sessions.

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
| `seed/demo.json` | Server-only synthetic roster, six detailed cases and frozen comparison |
| `deploy/k8s` | Separate UI/API Deployments, PostgreSQL StatefulSet/PVC, Services, config and ingress example |
| `docs/PRESENTER_GUIDE.md` | Short walkthrough and six case stories |
| `TODO.md`, `IMPLEMENTATION_PLAN.md` | Completed demo scope and target deployment status |

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

## Completed demo workflows

Campaigns include searchable cohorts, allocation owner, due date, an exact preview and activation. Registry bulk actions assign, request evidence, defer or suppress the selected records. Filters, sorting, pagination and detail return links retain their context; session-only form drafts survive navigation, and paused reviews also survive refresh.

Chart chase has grouped requests and local contact history. Intake checks the requested member, signature and source eligibility before publishing; later signed encounters can complete the same path. The labeled fixture assistant answers supported cohort/member/metric questions with source links and an explicit campaign proposal review. It uses no external model.

See [verification](docs/VERIFICATION.md) for the earlier browser rehearsal and separate-container validation, and [redesign QA](docs/UI_QA.md) for the current UI changes and 18 focused API checks. The container registry push and target Kubernetes rollout remain pending environment details.

## Demo boundaries

Six showcase records have complete readable evidence; the remaining 10,000-member roster provides population browsing. Analysis loads precomputed findings; provider delivery and receiver responses are simulated. Intake previews local TXT/PDF files and validates bundled samples, without uploading arbitrary files or extracting PDF text. No official scoring pack or financial methodology is installed, so score/revenue fields remain unavailable. The frozen 200-chart AI comparison is separate from mutable session activity.

A broader domain database model, live integrations, general document ingestion, live AI and enterprise auth are follow-on work. The original [product specification](CitusTech_Perform_Plus_Coding_Spec.md) is preserved unchanged.
