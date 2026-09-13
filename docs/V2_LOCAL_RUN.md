# Run the V2 worktree

This increment lives on `codex/business-requirements-v2` in `.local/worktrees/business-requirements-v2`. Its current preview is [localhost:3005](http://localhost:3005), proxying the separate API on port 8004. The original previews use other ports and remain unchanged.

Use the repository's locked API dependencies in a Python 3.13 environment and install the web workspace from its lockfile. The model packages run in isolated subprocesses using that same Python environment; no separately managed model service is required.

```bash
python3.13 -m venv .venv
.venv/bin/python -m pip install -r apps/api/requirements.lock
npm ci --prefix apps/web
.venv/bin/python scripts/model_assets.py install
```

The installer downloads the official public archives named in `apps/api/app/risk_models/assets.json`, checks archive and every package-file hash, and installs under ignored `.local/model-assets`. Changed upstream bytes cause a failure requiring a reviewed manifest update. Existing assets can be rechecked with:

```bash
.venv/bin/python scripts/model_assets.py verify
```

Set `DATABASE_URL` to a dedicated PostgreSQL database, or place its connection string in ignored `.local/database-url`. The current worktree uses `perform_plus_v2`; tests create and remove their own randomly named schemas. Do not point tests or this new preview at another project's database. Local account setup and password maintenance follow the existing [application instructions](../README.md); account files and credentials stay ignored.

For this V2 preview, generated accounts are recorded in `.local/v2-runtime/demo-accounts.json` and `.local/v2-runtime/superuser-account.json` inside the V2 worktree. These belong to its separate database; credentials from another preview may differ. Browser cookies are shared across localhost ports, so use a separate browser profile when keeping two previews signed in simultaneously.

Start these in separate terminals from the V2 worktree:

```bash
.venv/bin/python scripts/v2_dev.py api
.venv/bin/python scripts/v2_dev.py ui
```

The launcher selects the worktree's private data directory and model assets, checks the database setting, and connects the UI proxy to its API. Optional `--api-port` and `--ui-port` arguments must match between the two launches. It does not reset records or stop another preview.

## Separate images and Kubernetes components

```bash
docker build -f apps/api/Dockerfile -t perform-plus-api:v2-local .
docker build -f apps/web/Dockerfile -t perform-plus-ui:v2-local .
```

The API build includes checksum-verified official model packages at `/app/models`, locked Python dependencies and retained synthetic source/import fixtures. Scoring writes temporary execution files separately from those package trees. The UI remains a separate image. PostgreSQL remains its own component and persistent store.

Existing [Kubernetes manifests](../deploy/k8s/) and [deployment instructions](KUBERNETES.md) retain the UI/API/database split. Set the image references to your published images before applying them. This increment's evidence covers local images and local runtime; it does not record a cluster deployment.

## State, provenance and validation

Saving a hypothetical scenario or financial assumption never records a clinical diagnosis. Independent review/QA and explicit receiver fixtures advance their own score stages. External imports preserve the producing model, period, rate cell and normalization basis; changed clinical sources require external refresh.

The existing administration reset requires its explicit confirmation. It archives the synthetic workflow snapshot, clears synthetic workflow stage pointers, retains current baseline scores and all immutable scoring evidence, preserves local accounts and marks external scores stale. Reset is blocked while a batch is active. It does not erase imported history or reset another preview.

Run focused checks against the dedicated local database:

```bash
CT_MODEL_ASSETS="$PWD/.local/model-assets" CT_MODEL_PYTHON="$PWD/.venv/bin/python" .venv/bin/python -m pytest apps/api/tests -q
npm run build --prefix apps/web
```

[V2 verification](V2_VERIFICATION.md), the [TODO checkpoint](../TODO.md) and the [requirement matrix](V2_REQUIREMENTS_MATRIX.json) distinguish completed evidence from open acceptance gates. Historical V24 reference validation, full AI-origin contribution attribution and broader comparison/recapture acceptance remain open.
