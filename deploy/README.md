# Perform+ public EKS deployment

Application URL: **https://performplus.idaibhealth.com**. GitHub repository: **MahammadRafi06/citustech-perform-plus**, release branch **main**. AWS account **703671901662**, region **us-west-2**, cluster **meshalloc-control-plane**, namespace **perform-plus**.

## Components

- UI and API: separate ECR repositories, immutable full-commit tags, deployed using SHA-256 image digests.
- PostgreSQL: separate StatefulSet with an encrypted 10 GiB gp3 persistent volume. The StorageClass uses Retain; deleting Kubernetes objects does not erase the EBS volume.
- HTTPS: ACM certificate, public Application Load Balancer, HTTP-to-HTTPS redirect and one Route 53 alias. API requests use the UI's existing same-origin proxy. The API and database Services are internal.
- Capacity: one dedicated `t3.large` managed node, with an app label and scheduling taint. Existing system node and workloads are preserved. This is a single-node deployment, not a highly available database setup.
- Ingress controller: official chart/controller 3.5.0, watching only the app namespace; service mutation is disabled.

The existing cluster/network are tagged `Disposable=true`, `ExpiresOn=2026-09-15`. This configuration does not change those lifetime tags. Continued availability depends on the cluster owner retaining that infrastructure.

## Release workflow

`.github/workflows/release.yml` builds both Dockerfiles on pushes to main. It verifies current remote main, authenticates with repository/branch-bound GitHub OIDC, and publishes immutable images. Enable repository variable `PERFORM_PLUS_DEPLOY_ENABLED=true` after the initial bootstrap.

The workflow invokes the `perform-plus-release` Lambda inside the VPC. Its EKS group can get/patch only Deployments `ui` and `api` in namespace `perform-plus`. The function accepts only digest-pinned images from the two configured repositories; it cannot apply arbitrary manifests. It reports success only once the expected revision and both image digests have fully rolled out. The workflow then checks public UI/API health over HTTPS. It has no database password and cannot read Kubernetes Secrets.

The EKS API's public CIDR restriction remains unchanged. The release bridge calls the private endpoint; no permanent AWS credentials or additional public Kubernetes access are used. See [GitHub OIDC in AWS](https://docs.github.com/en/actions/how-tos/secure-your-work/security-harden-deployments/oidc-in-aws) and [EKS group access entries](https://docs.aws.amazon.com/eks/latest/userguide/create-k8s-group-access-entry.html).

This repository uses GitHub's immutable subject format. The trust policy pins owner ID `163666861`, repository ID `1367596866`, and `refs/heads/main`; it does not fall back to a name-only or wildcard subject. Recheck `gh api repos/MahammadRafi06/citustech-perform-plus/actions/oidc/customization/sub` if repository ownership changes. See [immutable OIDC subjects](https://docs.github.com/en/actions/reference/security/oidc#immutable-subject-claims).

## Infrastructure and bootstrap

`aws/` is a separate Terraform root. State and saved plans are under ignored `.local/aws-deploy/`; do not delete that state or commit it. Initialize, generate a saved plan, inspect it, and apply that exact plan. Existing cluster/VPC/hosted-zone resources are referenced rather than imported or recreated.

`aws/production.auto.tfvars.json` records the ingress-created ALB ARN used for the Route 53 alias. If the ingress is deliberately replaced, verify the new ALB identity and update that input before applying a DNS plan.

```bash
terraform -chdir=deploy/aws init
terraform -chdir=deploy/aws plan -out=../../.local/aws-deploy/change.tfplan
terraform -chdir=deploy/aws show ../../.local/aws-deploy/change.tfplan
terraform -chdir=deploy/aws apply ../../.local/aws-deploy/change.tfplan
```

Install the pinned chart with `controller-values.yaml`, then publish main's two images and run:

```bash
python scripts/bootstrap_eks.py --sha FULL_REMOTE_MAIN_SHA --apply
```

This command refuses a non-main revision, resolves both immutable image digests, performs a Kubernetes server dry run, then applies the app manifests. It does not read or change other application namespaces. Infrastructure/manifest changes need this operator step; routine image releases use GitHub Actions.

## Login credentials

`python scripts/eks_credentials.py prepare` creates `.local/aws-deploy/secrets.env`, `accounts.json` and `credentials.md` with owner-only permissions. Existing files are preserved. Ordinary accounts use distinct, 10-character passwords without easily confused characters; the superuser uses a separate 12-character password. Database/bootstrap secrets remain long and random. No password policy or hashing has been weakened.

Install `secrets.env` as Kubernetes Secret `perform-plus-secrets` without printing it. After first API startup, `python scripts/eks_credentials.py install` sets the prepared individual passwords on existing seeded accounts. This explicit operation revokes those users' current sessions but preserves their roles and application records. **Do not run it as part of routine deployments.**

Read `credentials.md` locally to distribute access. `superuser@perform.test` can view every page/action, while the clinical requirement for independent QA still applies. Local passwords, cookie authentication, CSRF checks and RBAC remain enabled. Microsoft Entra and Okta logos are decorative; SSO is not configured.

## Operations

- Inspect only this app: `kubectl --context meshalloc-control-plane -n perform-plus get pods,svc,ingress,pvc`.
- Health: `/health` for UI; `/api/v1/ready` for API/database readiness.
- Roll back a failed image release by explicitly selecting a retained ECR digest and using `kubectl rollout undo` on the affected app Deployment. Confirm the target digest and rollout state before using it.
- The node, ALB, EBS, ECR and Lambda/log resources incur AWS usage charges. ECR repositories are protected against Terraform deletion; the database volume is retained. Remove only app-owned resources when decommissioning and decide separately whether to retain database data.
- Scheduled database backups and restore drills are not configured by this initial deployment. The application still uses its existing prepared synthetic dataset and workflow boundaries; public hosting does not add live clinical integrations.
