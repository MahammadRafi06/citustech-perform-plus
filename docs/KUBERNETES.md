# Separate UI, API and database deployment

The base contains two Deployments (`ui`, `api`), a PostgreSQL StatefulSet (`db`), internal Services, a PVC and a ConfigMap. It uses one replica per component for the demo. The UI image contains no member fixtures; the API owns data access and seeds its dedicated PostgreSQL database once. Restarts preserve stored workflow state and accounts.

## Prepare images

Run from the repository root with Docker available:

```bash
docker build -f apps/web/Dockerfile -t perform-plus-ui:0.1.0 .
docker build -f apps/api/Dockerfile -t perform-plus-api:0.1.0 .
```

Push these images to your registry, then set `newName` and the desired immutable image tag/digest under `images` in `deploy/k8s/kustomization.yaml`. For a local cluster, load both images using that cluster's image-loading command. Both images have been built and validated in a local three-container environment. They have not been pushed to a registry or rolled out in a target Kubernetes cluster.

The UI Dockerfile packages Next's standalone server and static assets. The API image includes the protected synthetic seed. PostgreSQL 18 mounts its volume at `/var/lib/postgresql`; the PVC requests 10 GiB from the cluster's default StorageClass. Set a StorageClass explicitly if your cluster has no default.

## Prepare access and configuration

Select the intended Kubernetes context explicitly before running the deployment commands below. Do not rely on a workstation’s current default context.

```bash
export CT_KUBE_CONTEXT="<chosen-context>"
python3 scripts/k8s_secrets.py
kubectl --context "$CT_KUBE_CONTEXT" apply -f deploy/k8s/namespace.yaml
kubectl --context "$CT_KUBE_CONTEXT" -n perform-plus create secret generic perform-plus-secrets --from-env-file=.local/k8s-secrets.env
```

The first command creates a local, ignored 0600 file with a generated database password, matching connection URL and initial demo password. It never overwrites an existing file. Keep the same database secret when reusing its PVC. Local workstation passwords are not automatically reused in Kubernetes.

For HTTPS access, copy `deploy/k8s/ingress.example.yaml`, set the real host, your installed ingress class and an existing TLS Secret. Add the resulting file to `kustomization.yaml`. In `config.yaml`, set `CT_ALLOWED_ORIGINS` to the exact HTTPS origin and `CT_SECURE_COOKIE` to `"true"`.

The ingress uses `/api` → `api:8000` and `/` → `ui:3000` without path rewriting. `API_INTERNAL_URL=http://api:8000` remains useful for local port-forwarding. No CORS wildcard or public database Service is required.

## Apply and check

```bash
kubectl kustomize deploy/k8s
kubectl --context "$CT_KUBE_CONTEXT" apply -k deploy/k8s
kubectl --context "$CT_KUBE_CONTEXT" -n perform-plus rollout status statefulset/db
kubectl --context "$CT_KUBE_CONTEXT" -n perform-plus rollout status deployment/api
kubectl --context "$CT_KUBE_CONTEXT" -n perform-plus rollout status deployment/ui
kubectl --context "$CT_KUBE_CONTEXT" -n perform-plus get pods,services,pvc
```

For a local preview without ingress, retain the base's localhost origins and non-secure cookie, then run:

```bash
kubectl --context "$CT_KUBE_CONTEXT" -n perform-plus port-forward service/ui 3000:3000
```

Open `http://localhost:3000`. The initial Kubernetes demo password is `CT_DEMO_PASSWORD` in your local secret-input file. Account emails match the README.

## Health and persistence

- UI `/health`: process health, independent of API availability.
- API `/api/v1/live`: process liveness; a database outage does not fail this probe.
- API `/api/v1/ready`: database reachable and seed initialized.
- PostgreSQL readiness: `pg_isready`; persistent data lives in its PVC.

Startup probes allow initialization before readiness. API startup uses a PostgreSQL advisory lock for the small schema/seed bootstrap; workflow changes lock the shared state row. This is a bounded demo design, not a claim of high availability or production backend scale. Add operational backups and environment-specific infrastructure controls when deployment requirements are known.

## Local three-component validation

`deploy/compose.acceptance.yaml` runs separate UI, API and PostgreSQL containers, with only the UI bound to `127.0.0.1:3002`. Create an ignored `.local/acceptance.env` file (mode 0600) containing unique URL-safe values for `CT_ACCEPTANCE_DB_PASSWORD` and `CT_ACCEPTANCE_PASSWORD`, then use a dedicated project name:

```bash
docker compose --env-file .local/acceptance.env -p ct-acceptance -f deploy/compose.acceptance.yaml up -d
python3 scripts/container_acceptance.py
```

The acceptance script exercises the public UI proxy, health, real cookie login/CSRF, scoped records, saved analysis and logout. The runtime mount deliberately resembles a root-owned Kubernetes `emptyDir` writable through GID 10001. The API creates its private state directory at `/app/runtime/state`; database records live in PostgreSQL. Restart persistence was checked independently for API and database.

The current workstation acceptance project is `ct-acceptance-20260912142859`; reuse that exact project name to inspect or stop only that stack. Its database volume is intentionally preserved. Local development on port 3000 uses a separate database and account file.

## Validation status

Kustomize rendering and isolated Docker Compose validation pass. A disposable local k3d attempt failed while creating an fsnotify watcher (`too many open files`); raising the container file-descriptor limit did not resolve the host watcher exhaustion. Both failed attempts were rolled back. Existing Kubernetes configuration and host sysctls were preserved.

The actual registry, Kubernetes context/namespace, ingress host, TLS secret and StorageClass still need to be chosen. Target-cluster rollout, ingress/TLS and PVC checks remain pending; local container success is not Kubernetes deployment proof.
