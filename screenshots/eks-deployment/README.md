# Public deployment verification — September 13, 2026

URL: **https://performplus.idaibhealth.com**

Released source: `99e87271af3418dc907b7d3a564b1f82fc5af98a`, published from remote `main`. [GitHub Actions run 34765994514](https://github.com/MahammadRafi06/citustech-perform-plus/actions/runs/34765994514) passed both image jobs and the automated deployment job. Later documentation-only commits do not change the running application images.

## Live checks

- UI, API and PostgreSQL are separate, ready workloads in namespace `perform-plus` on `meshalloc-control-plane`, AWS `us-west-2`.
- Both running container image IDs match the ECR digests for the released source. Exact values are in [release-evidence.json](release-evidence.json).
- Public HTTPS validates successfully; HTTP redirects to HTTPS. `/health` and `/api/v1/ready` pass.
- All 14 local accounts successfully signed in over public HTTPS with distinct passwords, secure session cookies and matching identities. The superuser can access all 16 screens. Unauthenticated bootstrap returns 401; login from an untrusted Origin returns 403.
- Real Chrome sign-in reached the authenticated workspace. Screenshots were captured after rendering at the browser's native desktop viewport.
- The initial captured-baseline calculation for `ma_v28_py2027_forecast` completed with 10,000 of 10,000 members successfully scored, zero failures and 120,000 scored member-months. It ran from 15:39:03 to 15:47:21 UTC. This verifies the existing forecast calculation workflow on the synthetic roster; it is not a final payment result.
- The release identity can patch only the named UI/API Deployments. It cannot read Secrets, patch the database StatefulSet or modify the existing MeshAlloc Deployment. The EKS API public access restriction was preserved.
- Terraform reported no changes after deployment. The encrypted database PVC is bound and uses a Retain storage policy.

## Access and operation

Private account details are in the local, ignored `.local/aws-deploy/credentials.md` file with owner-only permissions. No passwords or sessions are included in this directory. See [deployment operations](../../deploy/README.md) for releases, infrastructure and credential management.

The existing cluster/network retain their `Disposable=true` and `ExpiresOn=2026-09-15` tags. This initial deployment uses one application node and does not configure scheduled database backups. The app retains its existing synthetic dataset and clinical review gates.

## Captures

- [Public sign-in](login.jpg) — 1920 × 937
- [Authenticated overview after calculation](overview.jpg) — 1910 × 835
