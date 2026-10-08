# Perform+ decommissioned at the user request on September 26, 2026.
# This root intentionally manages no resources. Shared EKS/VPC/storage services
# remain externally managed. Restore only after an explicit new request.
terraform {
  required_version = ">= 1.10.0"
  required_providers {
    aws     = { source = "hashicorp/aws", version = "6.63.0" }
    archive = { source = "hashicorp/archive", version = "2.8.0" }
  }
  backend "local" { path = "../../.local/aws-deploy/terraform.tfstate" }
}
provider "aws" {
  region              = "us-west-2"
  allowed_account_ids = ["703671901662"]
}
