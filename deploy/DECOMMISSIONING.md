# Perform+ AWS Decommissioning — September 26, 2026

This is the historical record for the retired shared-cluster deployment. Perform+ was subsequently restored on its dedicated cluster; use [the current deployment guide](aws-small/README.md) for operations.

Requested scope: remove Perform+ infrastructure while preserving the shared EKS cluster and unrelated applications. Account `703671901662`, region `us-west-2`.

## Status at Completion on September 26

Completed and verified. Terraform destroyed all 27 managed app resources. The final private network interfaces and release security group were removed after AWS released their attachments (21 minutes 19 seconds). Direct AWS inventories show no dedicated Perform+ resources remaining. Terraform state is empty and the final plan reports no changes.

## Removed and Verified

| Component | Resource |
|---|---|
| App workload and ingress controller | Namespace `perform-plus`; Helm release `perform-plus-ingress` |
| Public load balancer and target group | `k8s-performp-performp-7284016460` / `07a95dbe1fa68b97`; `k8s-performp-ui-994b9b3f5f` |
| Dedicated worker | Node group `perform-plus`; instance `i-06596a82078531b55` terminated |
| App disks | Database `vol-010502127d369da80`; worker root `vol-0434be0218d2a5586` |
| Database PV | `pvc-24308620-7581-47a5-9aa1-333c50f3bb80` |
| App-only storage node plugin | `kube-system/ebs-csi-node-perform-plus` |
| Container repositories and images | `perform-plus/api`, `perform-plus/ui` |
| Release networking | Security group `sg-0212d9e636fcd23d3` and all four private Lambda interfaces |
| Release function and logs | `perform-plus-release`, `/aws/lambda/perform-plus-release` |
| Public hosts and TLS certificates | `performplus.idaibhealth.com`, `performplus.citiustech.online`; their aliases, validation records, and dedicated certificates |
| Release access and worker configuration | GitHub, release, node and ingress roles/policies; release EKS access entry; launch template; release-specific cluster security rules |

No app EBS snapshots or reserved public IPs remain.

## Shared Infrastructure Preserved

- EKS `meshalloc-control-plane`, shared VPC/subnets, hosted zones, existing shared worker, and unrelated applications.
- The shared EBS CSI addon and `perform-plus-ebs-csi` IAM role are intentionally retained because other workloads use them.
- All three non-app persistent-volume handles remain unchanged. The 19 unrelated application/job pods preserved their original UIDs. Seven unrelated pods were already Pending before teardown; this work did not resolve those pre-existing scheduling conditions.

Five cert-manager/Kyverno service pods had been placed on the Perform+ worker. The user explicitly approved adding one smaller shared worker, migrating those services, and removing the Perform+ worker. The `system` node group was scaled from desired/max 1 to 2; minimum remains 1. The replacement is `t3.medium` instance `i-0bc35fd52360d29a3`. All five services rolled out successfully and were healthy on the new shared worker before the old one was deleted. Both remaining shared workers were Ready.

The system node group is managed outside this repository's Terraform root. Its approved capacity change is recorded in the private teardown receipt; future changes to its owning infrastructure should preserve the needed shared-service capacity.

## Backup and Redeployment Prevention

A private local database archive, Kubernetes configuration/secrets, pre-removal Terraform state, original provisioning files, and provider inventories are stored under `.local/aws-deploy/teardown-20260926/`. Do not commit or include those private files in the screenshot handoff.

The database dump is 28,706,179 bytes, with SHA-256 `dbfcdb07d7627fb68b8ef52f3bdd04b85d621dd905dcf23b42a149010749ffa9`. `pg_restore --list` validated its archive structure. This is not a full restore rehearsal.

At teardown completion, the GitHub release workflow was disabled, `PERFORM_PLUS_DEPLOY_ENABLED=false`, `deploy/DECOMMISSIONED` was present, and the legacy Terraform root contained no resources to provision. Restoration templates are preserved in `deploy/aws/restore-templates/`, with exact original files in the private teardown directory. The marker still protects the legacy bootstrap path; the separate `aws-small/` root owns the restored environment.

The temporary workstation API CIDR was removed. The original EKS allowlist is restored to `142.112.212.125/32` and the AWS update completed successfully.

## Billing Boundary

Identified app compute, load-balancing, storage, images, and log resources have been removed. Previously accrued charges can still appear on the bill. The shared cluster, its two workers, shared networking/storage, domains, and hosted zones remain and continue to incur their own charges.

## Verification Evidence

Private receipts include `database-backup.json`, `reviewed-plan.json`, `terraform-plan-final.json`, `terraform-apply.txt`, `kubernetes-verification.json`, `aws-verification.json`, and `access-restore-status.json`.

The reviewed Terraform apply completed with 27 deletions, 0 creations and 0 updates. Post-removal Terraform plan exit code is 0, and the state contains no resources. `completion.json` records the final assertions. Both public hosts no longer resolve. AWS documents the network-interface cleanup delay here: https://docs.aws.amazon.com/lambda/latest/dg/configuration-vpc.html
