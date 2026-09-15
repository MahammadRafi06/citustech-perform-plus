> Hosting was decommissioned on September 15, 2026. The checklist below records the earlier deployment. See [current status](README.md).

# Public EKS deployment

Target: https://performplus.idaibhealth.com, AWS account 703671901662, region us-west-2, existing cluster meshalloc-control-plane.

- [x] Inspect remote main, AWS identity, cluster, network and public DNS zone.
- [x] Commit and push the completed login branding to personal GitHub main.
- [x] Create private UI/API ECR repositories and main-only GitHub OIDC publishing role.
- [x] Prepare and inspect the Terraform plan; add dedicated app capacity, EBS storage and TLS.
- [x] Deploy separate UI, API and PostgreSQL workloads in perform-plus.
- [x] Configure public HTTPS ingress and Route 53 alias.
- [x] Provision manageable user passwords through private secret files; retain local RBAC.
- [x] Publish immutable image tags/digests from remote main using GitHub Actions.
- [x] Enable namespace-scoped automated deployment through the private EKS API.
- [x] Verify public TLS, sign-in, role access, readiness and the rendered login page.
- [x] Record the final release, DNS, images, credentials location and operating instructions.

Deployment and verification: [operating instructions](README.md) and [release evidence](../screenshots/eks-deployment/README.md).

The existing cluster/network have Disposable=true and ExpiresOn=2026-09-15 tags. Their lifetime is a separate owner decision; this deployment does not alter those tags or existing workloads. New app resources are tracked separately in deploy/aws. The database volume uses Retain.

GitHub uses OIDC with access only to this repository's main branch. Because the EKS API is restricted, a small VPC Lambda release bridge can only patch/get the app's two named Deployments. It cannot modify Secrets, the database, cluster roles or other namespaces. It accepts only the two configured ECR repository digests. No public Kubernetes endpoint expansion, permanent GitHub AWS keys or laptop-hosted runner is required.
