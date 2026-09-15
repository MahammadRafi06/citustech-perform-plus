# Perform+ was decommissioned on 2026-09-15 at the owner's request.
# This root deliberately contains no resource-creation blocks.
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

# Other applications now use this cluster-wide storage driver. Preserve the
# driver and its existing IAM permissions while removing Perform+ ownership.
# Its controller is moved onto the existing system node before app-node removal.
removed {
  from = aws_eks_addon.ebs
  lifecycle { destroy = false }
}
removed {
  from = aws_iam_role.ebs
  lifecycle { destroy = false }
}
removed {
  from = aws_iam_role_policy_attachment.ebs
  lifecycle { destroy = false }
}
