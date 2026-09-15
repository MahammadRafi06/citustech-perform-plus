# Perform+ AWS decommissioning — September 15, 2026

Requested scope: take Perform+ offline, delete its load balancer, and stop ongoing app-specific AWS resource charges. Account `703671901662`, region `us-west-2`; preserve the shared EKS cluster and other applications.

## Removed and verified

| Component | Exact resource |
|---|---|
| Application namespace and ingress/controller | `perform-plus`, Helm release `perform-plus-ingress` |
| Public ALB | `k8s-performp-performp-7284016460` / `5b718554a72c27cc` |
| ALB target group and security groups | `k8s-performp-ui-4cacb0f504`; `sg-07242d2e23f6292ce`, `sg-0b0047f84edba8952` |
| Dedicated node group / instance | `perform-plus` / `i-0447364cd0e93b416` |
| Node root disk | `vol-08a42a9ef41847b01` |
| Database disk and retained PV | `vol-057073dbb557e3193` / `pvc-997b9ce5-a7db-48d0-8d7e-3f0f25412a48` |
| Container images and repositories | `perform-plus/api`, `perform-plus/ui`; six image digests removed from each |
| Release function and logs | `perform-plus-release`, `/aws/lambda/perform-plus-release` |
| App DNS / certificate | `performplus.idaibhealth.com` alias and its ACM validation record; certificate `9afacb4f-6463-43f5-b95e-38024f8306cd` |
| App release access | GitHub OIDC role, EKS release access entry, node and ingress roles/policies, launch template and release-specific cluster security-group rules |

No app disk snapshots or reserved public IP remain. The database archive is local only, 7,606,044 bytes, SHA-256 `70f7fb81ed60b0af6f09ccd1176227b304cd3874e13f3ce02010655bfebdaa51`.

## Shared resources preserved

- EKS `meshalloc-control-plane`, VPC/subnets/network, Route 53 hosted zone `Z03332101O8QU3MC8I65G`, existing `system` and `iftah-e2e-central` node groups.
- All three pre-existing non-Perform+ PVs retained their exact original volume handles. All 26 non-system/non-Perform+ pods retained their original UIDs and readiness count.
- `aws-ebs-csi-driver`, role `perform-plus-ebs-csi` and its existing `AmazonEBSCSIDriverPolicy` attachment. The driver was already being used by other apps, so removing it would have broken shared storage.
- The controller and managed node plugin moved to existing `system` capacity. Its existing service-account role binding was explicitly restored and persisted in EKS addon configuration; no extra IAM policy or node was added. The driver is ACTIVE, controller 6/6, node plugin 3/3, and the separate staging plugin remains 3/3.

The reviewed Terraform plan specifies **23 deletions and 3 forget-without-destroy operations**, with no creations or updates. The three shared storage resources use [Terraform's documented `removed` / `destroy=false` behavior](https://developer.hashicorp.com/terraform/language/block/removed). The active root contains no resource-creation blocks.

## Final AWS network cleanup

The deleted release function left four private Lambda interfaces and its security group (`sg-01a24e732d9b038bc`) pending AWS detachment. They have no public IPs, no remaining Lambda function reference, and no running app workload. AWS rejected manual detach of service-owned `ela-attach` attachments and deletion while in use. The saved Terraform apply is waiting for the security-group dependency to clear.

[AWS documents delayed Lambda interface cleanup and the execution-role dependency](https://docs.aws.amazon.com/lambda/latest/dg/configuration-vpc.html#configuration-vpc-enis). Final provider results and any remaining network objects are recorded in `.local/aws-deploy/teardown-20260915/verification.json`. This section is updated after cleanup finishes.

## Verification boundaries

Provider inventories verify removal of all identified dedicated compute, load-balancer, EBS, ECR, log and DNS resources. The app is no longer generating workload traffic or releases. This does not erase previously accrued AWS usage, and the preserved shared cluster/network continue to incur their own charges. AWS billing can report earlier usage after resource deletion; see [AWS billing guidance](https://repost.aws/knowledge-center/ec2-billing-terminated).

Deployment prevention is enforced by the disabled GitHub workflow, false deployment variable, publishing/deployment job guards, the bootstrap decommission marker, and the empty Terraform provisioning configuration. Source/data needed for a future explicitly approved re-provisioning are preserved locally and in Git history.
