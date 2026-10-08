# CitiusTech Perform+

A desktop application for population risk analytics, suspected HCCs, financial forecasts, Member 360 profiles and EDS reporting. It uses a Next.js UI, FastAPI API and PostgreSQL, with local authentication and role-based access. The repository includes synthetic data, model adapters, tests and deployment tooling.

## Run locally

Prerequisites: Node.js 24+, Python 3.13, `uv`, and PostgreSQL 18. Install the dependencies below; local data and generated credentials stay under ignored `.local/`.

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

- **UI:** Next.js App Router, React, strict TypeScript, Tailwind CSS, shadcn/ui, TanStack Query/Table, Recharts, Lucide and Sonner. Shared typography and colors are defined in the application stylesheets. The workspace is designed for desktop use.
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
| `deploy/aws-small` | Standalone EKS infrastructure and release instructions |
| `scripts` | Local launchers, fixture importers, model installer and deployment tooling |
| `docs` | Developer guides, calculation methods and source provenance |
| `PERFORMplus_MemberListApp_Member360_v14.html` | Source input for the Member 360 data and shared CSS importers; generated runtime outputs are committed |

## Verify

```bash
make check
make test
make build
kubectl kustomize deploy/k8s
```

API tests create a randomly named temporary schema in the configured local database and remove only that schema afterwards. The running demo's records and accounts are preserved. The tests cover the main authorized/denied role paths and state changes; this is not an exhaustive production security suite.

## Kubernetes

UI and API have separate Dockerfiles and images. PostgreSQL has its own persistent volume. Use the [standalone EKS guide](deploy/aws-small/README.md) for the current infrastructure layout, or the [generic Kubernetes guide](docs/KUBERNETES.md) for another environment. The legacy shared-cluster deployment remains disabled; its guard and restoration templates are retained.

## Developer references

- [Isolated local preview](docs/V2_LOCAL_RUN.md) and [official model installation](apps/api/app/risk_models/README.md).
- [Shared design](docs/shared-design.md), [Member 360 integration](docs/member360.md) and [suspect fixture boundaries](docs/suspect-discovery.md).
- [Financial forecast calculations](docs/FINANCIAL_CORRECTIONS.md), [cumulative analytics](docs/CUMULATIVE_ANALYTICS_TIMING.md) and [population and RAF trends](docs/POPULATION_AND_RAF_TRENDS.md).

Requirements, planning notes, client specifications, review screenshots and scratch outputs are kept outside the tracked source. Runtime assets, fixture data, dependency manifests and source provenance remain included.
