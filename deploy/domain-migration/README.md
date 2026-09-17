# Perform+ dual-domain operation

Both addresses serve the same application on the existing `meshalloc-control-plane` EKS cluster, namespace `perform-plus`, AWS account `703671901662`, region `us-west-2`:

- https://performplus.idaibhealth.com
- https://performplus.citiustech.online

Both remain available; neither redirects to the other. They share accounts and data. Cookies and browser-local preferences are per origin, so each hostname needs its own sign-in. No passwords were reset.

## DNS and TLS

Hostinger is the registrar for `citiustech.online`. DNS is managed in the existing Route 53 zone `Z03619462N2KEZ2IM79R1`, delegated to:

- `ns-1122.awsdns-12.org`
- `ns-1728.awsdns-24.co.uk`
- `ns-312.awsdns-39.com`
- `ns-849.awsdns-42.net`

Do not switch nameservers to Hostinger or create another zone. The app manages only its additional A alias and certificate-validation CNAME. Apex, mail and unrelated records are unchanged.

The alias targets the existing ALB in `dns-records.json`. Certificates attached to its HTTPS listener are:

| Host | ACM certificate ID in us-west-2 |
| --- | --- |
| performplus.idaibhealth.com | 1a53ac6c-90dd-4f95-9d03-4133e3cf3a20 |
| performplus.citiustech.online | c2299e67-0888-4452-87ab-d828f01d2136 |

Retain the validation CNAME for automatic renewal. Terraform resources are in `deploy/aws/domain-migration.tf`. `deploy/aws/production.auto.tfvars.json` persists both feature flags and the existing ALB ARN; disabling a flag proposes deleting the corresponding new-domain resources. The hosted zone itself remains externally owned.

## Deployment configuration

`deploy/eks/ingress.yaml` retains both host rules and both certificates. `deploy/eks/kustomization.yaml` permits both HTTPS origins and keeps secure cookies enabled. The release workflow checks health and readiness on both domains. `scripts/eks_credentials.py` documents both addresses for future credential preparation; never rerun password installation just to change a hostname.

The scoped JSON merge patches in this folder contain the applied configuration. Before reusing them, compare current live rules, origins and certificate IDs and server-dry-run the changes. ConfigMap origin changes require an API restart; its Recreate strategy can briefly interrupt API requests. No new application images or database migration were needed for this domain addition. The running app source remains `95ca912f2d8aed5666e7948bb9805e81ff939cc2`.

## Verification

- [x] Exact hostname and all four authoritative registry delegations verified.
- [x] Reviewed certificate plan: certificate, validation CNAME and ACM validation only; no existing resources changed or deleted.
- [x] Certificate issued and attached beside the existing .com certificate.
- [x] Dual-host ingress and origin patches passed server dry-run and were applied; API rollout completed.
- [x] New hostname passed SNI/Host-aware HTTPS checks against the ALB before DNS publication.
- [x] Reviewed alias-only plan applied to publish .online; original .com DNS retained.
- [x] Public DNS, hostname-valid TLS, UI health and API readiness passed on both domains without resolver overrides.
- [x] Fresh browser sign-in and sign-out passed on both domains. New-domain dashboard, 840-record condition drill-down and five-member Member 360 view passed.
- [x] Temporary workstation /32 access was removed; original cluster allowlist restored to `142.112.212.125/32`.
- [x] Final Terraform plan reported no changes; rendering, release-boundary checks and whitespace checks passed.

Private saved plans, before/after snapshots, browser screenshots and verification receipts are under `.local/aws-deploy/domain-online/`. The production tfvars contain no credentials; passwords remain in ignored private files.

## Rollback

Keep users on .com. Set only `publish_online_domain=false`, review the plan to remove only the new app alias, then apply. Keep `prepare_online_domain=true` to retain its certificate and validation record during investigation. If ingress/origins must be restored, use the private saved rollback patches and restart the API only if origins changed. Keep the old certificate, DNS alias, existing ALB, database and unrelated workloads intact.
