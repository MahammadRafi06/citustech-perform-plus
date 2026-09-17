# Perform+ hosting

Addresses: https://performplus.idaibhealth.com and https://performplus.citiustech.online share the existing `meshalloc-control-plane` EKS deployment in AWS account `703671901662`, region `us-west-2`. Both use the same app, accounts and database; each hostname has its own sign-in cookie.

Hostinger registers `citiustech.online`; its authoritative DNS is the existing Route 53 zone. See [dual-domain operation](domain-migration/README.md) for certificate, ingress, DNS and rollback details. Keep both origins and HTTPS certificates when updating the deployment.

Hosting restoration was explicitly requested after the September 15 shutdown. The previous removal record is retained in [DECOMMISSIONING.md](DECOMMISSIONING.md).

## Deployment

- `aws/` manages app-only ECR repositories, an isolated node group, ingress permissions, ACM/DNS and the GitHub release bridge.
- The cluster, VPC, subnets, hosted zone and shared EBS CSI driver remain externally managed. Do not import or change their ownership.
- `eks/` deploys separate UI, API and PostgreSQL components. TLS terminates at the app ALB; the UI proxies authenticated API requests.
- GitHub Actions publishes immutable source-SHA images from current remote `main`. The release bridge only patches the UI/API Deployments in the app namespace.
- `scripts/bootstrap_eks.py` verifies remote main and ECR digests before rendering and applying initial manifests. Routine releases use `scripts/release_eks.py`.
- Private credentials, Terraform state, database archives and release receipts stay in ignored `.local/aws-deploy/`.

## Restore sequence

1. Review the current provider inventory and a saved Terraform plan. Apply only app resources; use the existing shared storage driver.
2. Publish the reviewed source to remote main, then dispatch the release workflow with `publish_only=true` to build immutable UI/API images without attempting an initial rollout.
3. Apply `eks/ebs-node.yaml` separately to register storage only on the dedicated app node. This uses the existing EBS node service account and never overlaps another node plugin. Create the app namespace and Secret from private local inputs. Install the pinned ingress controller with `eks/controller-values.yaml`.
4. Deploy the database and restore the chosen database archive before starting the API. Reinstall the environment account passwords using `scripts/eks_credentials.py install` if restoring another environment.
5. Render and apply the exact image digests, wait for readiness, then set `app_load_balancer_arn` using a private Terraform variable file and apply the DNS-only plan.
6. Enable routine releases only after bootstrap is complete. Verify source annotations, image digests, HTTPS health/readiness and browser sign-in.

Recreating these resources resumes app-specific AWS charges. Preserve database backups before any future teardown. The last shutdown archive remains in `.local/aws-deploy/teardown-20260915/`.

The dedicated node plugin follows the [upstream additional-node-daemonset guidance](https://github.com/kubernetes-sigs/aws-ebs-csi-driver/blob/master/docs/additional-daemonsets.md). Its images match the installed EKS addon version.
