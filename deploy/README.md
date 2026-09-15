# Perform+ hosting is decommissioned

The owner requested AWS hosting removal on September 15, 2026. Perform+ is offline. Its GitHub release workflow is disabled and `PERFORM_PLUS_DEPLOY_ENABLED=false`.

The app's ALB, target group, dedicated EKS node group/EC2 instance, root and database disks, ECR images/repositories, Lambda function, CloudWatch log group, DNS records and ACM certificate have been removed. See [decommissioning evidence](DECOMMISSIONING.md) for resource identifiers and final cleanup status.

The shared `meshalloc-control-plane` cluster, VPC, existing system/staging nodes, `idaibhealth.com` hosted zone, and other applications and storage remain. Other applications now use the EBS CSI driver, so it and its IAM permissions were preserved and removed from Perform+'s Terraform ownership. Its controller and managed node plugin run on existing system capacity; the separately managed staging node plugin was preserved.

## Re-creation is disabled

- `aws/` deliberately contains no resource-creation blocks. Its `removed` blocks preserve the shared storage driver and role while removing app ownership.
- Both publishing and deployment jobs require `PERFORM_PLUS_DEPLOY_ENABLED=true`; the entire workflow is also disabled in GitHub.
- `DECOMMISSIONED` blocks `scripts/bootstrap_eks.py` before it accesses AWS or Kubernetes.
- The source code, Dockerfiles and local application remain available. The last deployed application commit was `1e0f49e1a70b26f045b2ad1dfb90ba1234212465`.

Do not restore AWS provisioning or re-enable the workflow without a new explicit hosting request. Historical provisioning code is retained in Git history. Restoring that code requires reviewing shared-resource ownership and a fresh provider plan; the old ALB ARN and resource IDs are no longer usable.

## Local recovery material

The final PostgreSQL custom-format archive is `.local/aws-deploy/teardown-20260915/perform-plus.pgdump` (owner-only access). It was captured after stopping UI/API writes and validated by reading the full archive with `pg_restore --file=/dev/null`. This is archive validation, not a full restore drill.

Private state backup, exact saved removal plan, provider inventories and receipts are in the same ignored directory. No AWS database snapshot or S3 backup was created. Preserve this local directory if the demo data is needed again.
