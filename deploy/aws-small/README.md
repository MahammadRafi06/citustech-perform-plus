# Perform+ standalone EKS restoration

The user authorized a new small EKS deployment on October 4, 2026, in AWS account `703671901662`, region `us-west-2`. This directory owns that standalone environment. The reviewed initial Terraform plan contains **38 creations, 0 updates and 0 deletions**. Restoration completed on October 4, 2026 (October 5 UTC). Both public hostnames passed HTTPS health, database readiness and existing-superuser sign-in checks. Dashboard, Risk Analytics and its Financial editor, Suspect Analytics and its evidence panel, and EDS were verified in a signed-in browser. This is a restore smoke check, not exhaustive regression or load testing.

The legacy [`deploy/aws`](../aws/) root remains suspended. [`deploy/DECOMMISSIONED`](../DECOMMISSIONED) continues to protect the old bootstrap path; it does not govern this separately authorized root. Do not restore the old root or use `scripts/bootstrap_eks.py`, `scripts/eks_credentials.py install`, or `scripts/release_eks.py` against this cluster: those paths retain the former cluster or Lambda release assumptions.

The repository includes the infrastructure definitions, provider lockfile and manifest renderer. Terraform state, administrator variables, credentials, database archives and generated manifests stay outside Git. A source checkout does not grant production access; operators must obtain the existing private state and environment inputs through the agreed access process before managing this environment.

## Topology and cost

| Component | Configuration |
| --- | --- |
| Cluster | `perform-plus-small`, Kubernetes 1.35, managed EKS control plane |
| Network | Dedicated `10.74.0.0/16` VPC; public `/24` subnets in `us-west-2a` and `us-west-2b`; internet gateway; no NAT gateway |
| Worker | One untainted on-demand `t3.large`: 2 vCPU, 8 GiB RAM, `workload=perform-plus`; minimum, desired and maximum capacity all 1 |
| Worker placement | `us-west-2a` only, so a replacement worker can reattach the same-AZ database disk; control-plane networking and ALB span both subnets |
| Storage | Encrypted 40 GiB gp3 worker disk; separate encrypted 10 GiB gp3 PostgreSQL claim with `Retain` policy |
| API access | Private Kubernetes endpoint enabled; public endpoint limited to explicit administrator CIDRs; administrator EKS access entry |
| AWS permissions | Cluster-owned OIDC provider and separate service-account roles for VPC CNI, EBS CSI and the ingress controller; IMDSv2 required with hop limit 1 |
| Application | Separate single-replica UI, API and PostgreSQL workloads in namespace `perform-plus` |
| HTTPS | One internet-facing ALB, one DNS-validated ACM certificate covering both public hostnames |
| Images | Immutable `perform-plus/ui` and `perform-plus/api` ECR repositories; five newest images retained per repository |

The 8 GiB worker is the selected small deployment size: it hosts PostgreSQL, the API, UI and Kubernetes services together. Reducing memory should follow workload measurements. A single worker and database provide no availability during worker replacement or an Availability Zone outage. The same-AZ placement avoids scheduling the only worker in an AZ that cannot attach the database volume; it does not provide failover.

Public worker addressing supplies outbound internet access without NAT charges. The worker has no SSH access configuration or general public inbound rule; public application traffic enters through the ALB. AWS documents the public-subnet addressing requirements in its [EKS networking guidance](https://docs.aws.amazon.com/eks/latest/userguide/network-reqs.html).

The October 4 estimate uses `t3.large` at **$0.0832/hour** in `us-west-2` and standard-support EKS at **$0.10/hour**: about **$133.74 per 730-hour month for those two items alone**. The expected total is roughly **$170–200/month**, including an ALB, public IPv4 addresses and gp3 storage, with usage-dependent load-balancer capacity, traffic, ECR and possible burst CPU charges. This is an estimate, not a billing limit or quote. The EC2 lookup is retained privately in `.local/aws-deploy/small-cluster/ec2-price.json`; see [EKS pricing](https://aws.amazon.com/eks/pricing/) for control-plane charges. Existing domain registration and hosted zones are outside this root.

Both hosts serve the same UI, API and database, with separate browser sign-in cookies:

- `https://performplus.idaibhealth.com` — existing Route 53 zone `Z03332101O8QU3MC8I65G`.
- `https://performplus.citiustech.online` — existing Route 53 zone `Z03619462N2KEZ2IM79R1`.

## Private state and reviewed Terraform changes

Run the commands below from the repository root. Keep state, plans, credentials, kubeconfig, dumps and generated manifests under ignored `.local/aws-deploy/`. Do not commit those files or print secret values.

| Path | Purpose |
| --- | --- |
| `.local/aws-deploy/small-cluster/terraform.tfstate` | State for this root only; the local backend path is relative to `deploy/aws-small` |
| `.local/aws-deploy/small-cluster/admin.tfvars.json` | Current allowed administrator CIDRs and, when needed, stable `admin_principal_arn` |
| `.local/aws-deploy/small-cluster/create.tfplan` | Saved, reviewed initial plan |
| `.local/aws-deploy/small-cluster/terraform-outputs.json` | Infrastructure outputs consumed by the manifest renderer |
| `.local/aws-deploy/small-cluster/kubeconfig` | Explicit credentials for this cluster |
| `.local/aws-deploy/small-cluster/rendered/` | Generated namespace, database, application and controller manifests |
| `.local/aws-deploy/teardown-20260926/database-20260926.dump` | Preserved database archive chosen for restoration |
| `.local/aws-deploy/teardown-20260926/secrets.private.json` | Saved environment Secret; treat as private credential material |

The existing AWS provider binary can be reused; no second large provider download is required when `deploy/aws/.terraform/providers` is available.

```bash
terraform -chdir=deploy/aws-small init \
  -plugin-dir=../aws/.terraform/providers -lockfile=readonly
terraform -chdir=deploy/aws-small validate
terraform -chdir=deploy/aws-small plan \
  -var-file=../../.local/aws-deploy/small-cluster/admin.tfvars.json \
  -out=../../.local/aws-deploy/small-cluster/create.tfplan
terraform -chdir=deploy/aws-small show \
  ../../.local/aws-deploy/small-cluster/create.tfplan
```

Inspect every new plan before applying its saved artifact. Later plans may differ from the initial 38-resource plan. Keep administrator CIDRs narrow. The default administrator is the current IAM caller; supply a stable IAM role/user ARN explicitly if operating under an assumed role or changing operators.

```bash
terraform -chdir=deploy/aws-small apply \
  ../../.local/aws-deploy/small-cluster/create.tfplan
terraform -chdir=deploy/aws-small output -json \
  > .local/aws-deploy/small-cluster/terraform-outputs.json
aws eks update-kubeconfig --region us-west-2 --name perform-plus-small \
  --alias perform-plus-small \
  --kubeconfig .local/aws-deploy/small-cluster/kubeconfig
export KUBECONFIG="$PWD/.local/aws-deploy/small-cluster/kubeconfig"
kubectl --context perform-plus-small get nodes
kubectl --context perform-plus-small -n kube-system get pods
```

This root manages its own EBS CSI addon. Do not apply legacy `deploy/eks/ebs-node.yaml`, which depended on the removed shared cluster's storage configuration.

## Restore the database before starting the API

First publish or select the reviewed source revision, resolve both ECR image digests, and verify they correspond to that same full source SHA. The renderer requires complete `@sha256:` image references and writes only beneath `.local`; it performs no cluster changes.

The renderer needs PyYAML and `kubectl`. The verified interpreter on this workstation is `/home/mahammad/miniconda3/bin/python`; the current system Python and repository `.venv` lack PyYAML.

```bash
/home/mahammad/miniconda3/bin/python scripts/render_small_eks.py \
  --terraform-outputs .local/aws-deploy/small-cluster/terraform-outputs.json \
  --output .local/aws-deploy/small-cluster/rendered \
  --source-sha "$RELEASE_SHA" \
  --api-image "$API_IMAGE" \
  --ui-image "$UI_IMAGE"
kubectl --context perform-plus-small apply \
  -f .local/aws-deploy/small-cluster/rendered/namespace.yaml
```

Prepare a mode-0600 `.local/aws-deploy/secrets.env` from the saved environment credentials without printing them. It must contain matching `POSTGRES_PASSWORD` and `DATABASE_URL`, plus `CT_DEMO_PASSWORD` and `CT_SUPERUSER_PASSWORD`. This is an input to prepare, not a file generated by the renderer. Reuse the preserved environment credentials when restoring its database and accounts. Do not reset account passwords merely to complete a restore.

```bash
kubectl --context perform-plus-small -n perform-plus create secret generic \
  perform-plus-secrets \
  --from-env-file=.local/aws-deploy/secrets.env
kubectl --context perform-plus-small apply \
  -f .local/aws-deploy/small-cluster/rendered/db.yaml
kubectl --context perform-plus-small -n perform-plus rollout status statefulset/db
```

Only PostgreSQL should be running at this point. Verify the archive's expected SHA-256, `dbfcdb07d7627fb68b8ef52f3bdd04b85d621dd905dcf23b42a149010749ffa9`, against the private backup receipt. Restore into the newly initialized, otherwise empty application database:

```bash
sha256sum .local/aws-deploy/teardown-20260926/database-20260926.dump
kubectl --context perform-plus-small -n perform-plus exec -i statefulset/db -- \
  pg_restore --exit-on-error --single-transaction --no-owner --no-privileges \
  -U ct_demo -d perform_plus \
  < .local/aws-deploy/teardown-20260926/database-20260926.dump
```

Compare restored tables, key row counts and saved application state with the backup evidence before starting the API. If the database already contains application data, stop and choose a deliberate restore procedure; do not rerun this initial restore blindly. The API initializes application state during startup, which is why `application.yaml` is applied only after the restore checks pass.

Install the pinned AWS Load Balancer Controller chart with the generated values. The private chart archive selected for this restoration is chart `3.5.0`, application `v3.5.0`:

```bash
helm upgrade --install perform-plus-ingress \
  .local/aws-deploy/small-cluster/aws-load-balancer-controller-3.5.0.tgz \
  --kube-context perform-plus-small --namespace perform-plus \
  --values .local/aws-deploy/small-cluster/rendered/controller-values.yaml \
  --wait --timeout 10m
kubectl --context perform-plus-small apply \
  -f .local/aws-deploy/small-cluster/rendered/application.yaml
kubectl --context perform-plus-small -n perform-plus rollout status deployment/api
kubectl --context perform-plus-small -n perform-plus rollout status deployment/ui
kubectl --context perform-plus-small -n perform-plus get pods,pvc,ingress
```

Verify the ALB's healthy target, certificate covering both hosts, HTTPS redirect and app health before publishing DNS. Save the new ALB hostname and canonical hosted zone ID as `lb_dns_name` and `lb_zone_id` in private `.local/aws-deploy/small-cluster/dns.tfvars.json`. Both values default to empty, so the initial apply creates no application DNS aliases.

```bash
terraform -chdir=deploy/aws-small plan \
  -var-file=../../.local/aws-deploy/small-cluster/admin.tfvars.json \
  -var-file=../../.local/aws-deploy/small-cluster/dns.tfvars.json \
  -out=../../.local/aws-deploy/small-cluster/dns.tfplan
terraform -chdir=deploy/aws-small show \
  ../../.local/aws-deploy/small-cluster/dns.tfplan
terraform -chdir=deploy/aws-small apply \
  ../../.local/aws-deploy/small-cluster/dns.tfplan
```

The expected DNS-only plan creates the two host aliases. Investigate other changes before applying. After publication, verify `/health`, `/api/v1/ready`, browser sign-in and representative saved data through each hostname. Record image digests, source annotations, restore counts and verification results privately. A Terraform apply or healthy pod alone does not prove the restored user workflow.

**After publishing DNS, include both private variable files in every future full plan.** Omitting the DNS values restores their empty defaults and plans removal of the public aliases.

## Future image publication and manual releases

The existing GitHub workflow is gated by `PERFORM_PLUS_DEPLOY_ENABLED`. Keep this variable **false during normal operation**. This root's `perform-plus-github-main` IAM role can publish only to the two ECR repositories; it has no Lambda invocation, Kubernetes or infrastructure permissions. No release Lambda exists in this topology.

For a deliberately scheduled publication, confirm the desired revision is current remote `main`, temporarily set the gate to `true`, dispatch `release.yml` on `main` with `publish_only=true`, monitor both component builds to completion, then immediately restore the gate to `false`, including if a build fails. Avoid concurrent pushes to `main` during that publication window: the legacy workflow also has a push trigger. Do not dispatch its normal deployment path. Publishing an image does not deploy it.

```bash
gh variable set PERFORM_PLUS_DEPLOY_ENABLED --body true \
  --repo MahammadRafi06/citustech-perform-plus
gh workflow run release.yml --ref main --field publish_only=true \
  --repo MahammadRafi06/citustech-perform-plus
# Identify and wait for this exact dispatch and both image jobs before continuing.
gh variable set PERFORM_PLUS_DEPLOY_ENABLED --body false \
  --repo MahammadRafi06/citustech-perform-plus
```

Resolve the published digests for that full SHA, run `scripts/render_small_eks.py` again with the verified current infrastructure outputs, review the generated application changes, and apply **only `application.yaml`** for a routine release. Do not replay the database restore or recreate its Secret. Wait for both deployments, inspect their exact image digests/source annotations, and verify HTTPS plus browser sign-in. Retain a current database backup before changes that can alter stored data. The five-image ECR retention policy limits how far back image-only rollback can go; do not assume an older running digest is still available for a fresh pull.


## Restore build note

The October 4 restore used source `901f38140834ce86ba40296b10912c13533b81d7`. The UI image was published by GitHub Actions run `37259151563`. Its API job stopped because the live HHS 2026 download no longer matched the committed model archive checksum.

The API was instead built from an exact `git archive` of that same source revision. All three original archives were recovered from the private local cache, matched against the committed `assets.json` SHA-256 values, and passed to the existing installer with `--offline`. The installer also verified every model package file and tree. No coefficients, runtime source, or expected checksums were changed. The build recipe, archive fingerprints and image digests are recorded privately under `.local/aws-deploy/small-cluster/` in `api-source/Dockerfile.offline`, `api-build-provenance.json`, and `images.json`.

A future online build may fail at the same upstream check. Restore from the verified pinned archives, or separately review an intentional model upgrade; do not replace the expected checksum merely to make a build pass.


## Verification receipt and remaining performance behavior

The private receipts include `database-restored.json`, `images.json`, `http-smoke.json`, `primary-host-smoke.json`, `pods-final.json`, `nodes-final.json`, and `completion.json`. PostgreSQL was restored into an empty database before API startup. The archive held 14 users and 10,000 base member records; the existing application initializer expands the working population to 110,000, which was verified through its authenticated bootstrap response. Member 360 reference records remain supplied by the existing application.

One initial uncached Dashboard request displayed the existing API-unavailable timeout. The page subsequently loaded, and all named browser checks passed. The API had no out-of-memory events or restarts. The unchanged source still has a 30-second proxy timeout; this deployment does not claim to fix the earlier cold-report or edited-forecast performance issue. Forecast editor opening was checked; applying a changed forecast was not part of this restoration check.
