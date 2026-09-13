terraform {
  required_version = ">= 1.10.0"
  required_providers {
    aws     = { source = "hashicorp/aws", version = "6.63.0" }
    archive = { source = "hashicorp/archive", version = "2.8.0" }
  }
  backend "local" { path = "../../.local/aws-deploy/terraform.tfstate" }
}

provider "aws" {
  region = "us-west-2"
  default_tags { tags = { Project = "perform-plus", ManagedBy = "perform-plus-terraform" } }
}

data "aws_caller_identity" "current" {}
data "aws_eks_cluster" "existing" { name = "meshalloc-control-plane" }
data "aws_iam_openid_connect_provider" "eks" { url = data.aws_eks_cluster.existing.identity[0].oidc[0].issuer }
data "aws_iam_openid_connect_provider" "github" { url = "https://token.actions.githubusercontent.com" }

locals {
  prefix     = "perform-plus"
  region     = "us-west-2"
  account    = data.aws_caller_identity.current.account_id
  registry   = "${local.account}.dkr.ecr.${local.region}.amazonaws.com"
  repository = "MahammadRafi06/citustech-perform-plus"
  host       = "performplus.idaibhealth.com"
  zone_id    = "Z03332101O8QU3MC8I65G"
  subnets    = ["subnet-059cf470b5e140a27", "subnet-0f1b63a43cc932211"]
  eks_issuer = replace(data.aws_iam_openid_connect_provider.eks.url, "https://", "")
  scheduling = { nodeSelector = { "workload" = "perform-plus" }, tolerations = [{ key = "workload", operator = "Equal", value = "perform-plus", effect = "NoSchedule" }] }
}

resource "aws_ecr_repository" "app" {
  for_each             = toset(["ui", "api"])
  name                 = "${local.prefix}/${each.key}"
  image_tag_mutability = "IMMUTABLE"
  image_scanning_configuration { scan_on_push = true }
  encryption_configuration { encryption_type = "AES256" }
  lifecycle { prevent_destroy = true }
}

resource "aws_iam_role" "github" {
  name               = "perform-plus-github-main"
  assume_role_policy = jsonencode({ Version = "2012-10-17", Statement = [{ Effect = "Allow", Principal = { Federated = data.aws_iam_openid_connect_provider.github.arn }, Action = "sts:AssumeRoleWithWebIdentity", Condition = { StringEquals = { "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com", "token.actions.githubusercontent.com:sub" = "repo:${local.repository}:ref:refs/heads/main" } } }] })
}

resource "aws_iam_role_policy" "github" {
  role = aws_iam_role.github.id
  name = "publish-app-and-invoke-release"
  policy = jsonencode({ Version = "2012-10-17", Statement = [
    { Effect = "Allow", Action = ["ecr:GetAuthorizationToken"], Resource = "*" },
    { Effect = "Allow", Action = ["ecr:BatchCheckLayerAvailability", "ecr:InitiateLayerUpload", "ecr:UploadLayerPart", "ecr:CompleteLayerUpload", "ecr:PutImage", "ecr:BatchGetImage", "ecr:GetDownloadUrlForLayer", "ecr:DescribeImages"], Resource = [for repo in aws_ecr_repository.app : repo.arn] },
    { Effect = "Allow", Action = ["lambda:InvokeFunction"], Resource = aws_lambda_function.release.arn }
  ] })
}

resource "aws_iam_role" "node" {
  name               = "perform-plus-eks-node"
  assume_role_policy = jsonencode({ Version = "2012-10-17", Statement = [{ Effect = "Allow", Principal = { Service = "ec2.amazonaws.com" }, Action = "sts:AssumeRole" }] })
}
resource "aws_iam_role_policy_attachment" "node" {
  for_each   = toset(["AmazonEKSWorkerNodePolicy", "AmazonEC2ContainerRegistryPullOnly"])
  role       = aws_iam_role.node.name
  policy_arn = "arn:aws:iam::aws:policy/${each.key}"
}
resource "aws_launch_template" "node" {
  name = "perform-plus-eks-node"
  block_device_mappings {
    device_name = "/dev/xvda"
    ebs {
      volume_size           = 40
      volume_type           = "gp3"
      encrypted             = true
      delete_on_termination = true
    }
  }
  metadata_options {
    http_endpoint               = "enabled"
    http_tokens                 = "required"
    http_put_response_hop_limit = 2
  }
  tag_specifications {
    resource_type = "instance"
    tags          = { Name = "perform-plus-eks-node", Project = "perform-plus" }
  }
  tag_specifications {
    resource_type = "volume"
    tags          = { Name = "perform-plus-eks-node", Project = "perform-plus" }
  }
}
resource "aws_eks_node_group" "app" {
  cluster_name    = data.aws_eks_cluster.existing.name
  node_group_name = "perform-plus"
  node_role_arn   = aws_iam_role.node.arn
  subnet_ids      = local.subnets
  instance_types  = ["t3.large"]
  capacity_type   = "ON_DEMAND"
  ami_type        = "AL2023_x86_64_STANDARD"
  scaling_config {
    min_size     = 1
    max_size     = 1
    desired_size = 1
  }
  labels = { workload = "perform-plus" }
  taint {
    key    = "workload"
    value  = "perform-plus"
    effect = "NO_SCHEDULE"
  }
  launch_template {
    id      = aws_launch_template.node.id
    version = tostring(aws_launch_template.node.latest_version)
  }
  depends_on = [aws_iam_role_policy_attachment.node]
}

resource "aws_iam_role" "ebs" {
  name               = "perform-plus-ebs-csi"
  assume_role_policy = jsonencode({ Version = "2012-10-17", Statement = [{ Effect = "Allow", Principal = { Federated = data.aws_iam_openid_connect_provider.eks.arn }, Action = "sts:AssumeRoleWithWebIdentity", Condition = { StringEquals = { "${local.eks_issuer}:aud" = "sts.amazonaws.com", "${local.eks_issuer}:sub" = "system:serviceaccount:kube-system:ebs-csi-controller-sa" } } }] })
}
resource "aws_iam_role_policy_attachment" "ebs" {
  role       = aws_iam_role.ebs.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonEBSCSIDriverPolicy"
}
resource "aws_eks_addon" "ebs" {
  cluster_name             = data.aws_eks_cluster.existing.name
  addon_name               = "aws-ebs-csi-driver"
  addon_version            = "v1.65.0-eksbuild.2"
  service_account_role_arn = aws_iam_role.ebs.arn
  configuration_values     = jsonencode({ controller = merge(local.scheduling, { replicaCount = 1 }), node = { nodeSelector = local.scheduling.nodeSelector, enableWindows = false } })
  depends_on               = [aws_eks_node_group.app, aws_iam_role_policy_attachment.ebs]
}

resource "aws_iam_role" "ingress" {
  name               = "perform-plus-load-balancer-controller"
  assume_role_policy = jsonencode({ Version = "2012-10-17", Statement = [{ Effect = "Allow", Principal = { Federated = data.aws_iam_openid_connect_provider.eks.arn }, Action = "sts:AssumeRoleWithWebIdentity", Condition = { StringEquals = { "${local.eks_issuer}:aud" = "sts.amazonaws.com", "${local.eks_issuer}:sub" = "system:serviceaccount:perform-plus:aws-load-balancer-controller" } } }] })
}
resource "aws_iam_role_policy" "ingress" {
  role   = aws_iam_role.ingress.id
  name   = "aws-load-balancer-controller-v3-5-0"
  policy = file("${path.module}/load-balancer-controller-policy.json")
}

resource "aws_acm_certificate" "app" {
  domain_name       = local.host
  validation_method = "DNS"
  lifecycle { create_before_destroy = true }
}
resource "aws_route53_record" "validation" {
  for_each = { for item in aws_acm_certificate.app.domain_validation_options : item.domain_name => item }
  zone_id  = local.zone_id
  name     = each.value.resource_record_name
  type     = each.value.resource_record_type
  records  = [each.value.resource_record_value]
  ttl      = 60
}
resource "aws_acm_certificate_validation" "app" {
  certificate_arn         = aws_acm_certificate.app.arn
  validation_record_fqdns = [for record in aws_route53_record.validation : record.fqdn]
}

resource "aws_security_group" "release" {
  name        = "perform-plus-release"
  description = "Perform Plus release bridge to the private EKS API"
  vpc_id      = data.aws_eks_cluster.existing.vpc_config[0].vpc_id
}
resource "aws_vpc_security_group_egress_rule" "release" {
  security_group_id            = aws_security_group.release.id
  referenced_security_group_id = data.aws_eks_cluster.existing.vpc_config[0].cluster_security_group_id
  ip_protocol                  = "tcp"
  from_port                    = 443
  to_port                      = 443
}
resource "aws_vpc_security_group_ingress_rule" "release" {
  security_group_id            = data.aws_eks_cluster.existing.vpc_config[0].cluster_security_group_id
  referenced_security_group_id = aws_security_group.release.id
  ip_protocol                  = "tcp"
  from_port                    = 443
  to_port                      = 443
  description                  = "Perform Plus namespace release bridge"
}
resource "aws_iam_role" "release" {
  name               = "perform-plus-release"
  assume_role_policy = jsonencode({ Version = "2012-10-17", Statement = [{ Effect = "Allow", Principal = { Service = "lambda.amazonaws.com" }, Action = "sts:AssumeRole" }] })
}
resource "aws_iam_role_policy_attachment" "release_vpc" {
  role       = aws_iam_role.release.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole"
}
resource "aws_cloudwatch_log_group" "release" {
  name              = "/aws/lambda/perform-plus-release"
  retention_in_days = 14
}
data "archive_file" "release" {
  type        = "zip"
  source_file = "${path.module}/release.py"
  output_path = "${path.module}/../../.local/aws-deploy/release.zip"
}
resource "aws_lambda_function" "release" {
  function_name                  = "perform-plus-release"
  role                           = aws_iam_role.release.arn
  runtime                        = "python3.13"
  handler                        = "release.handler"
  filename                       = data.archive_file.release.output_path
  source_code_hash               = data.archive_file.release.output_base64sha256
  timeout                        = 60
  reserved_concurrent_executions = 1
  memory_size                    = 128
  vpc_config {
    subnet_ids         = local.subnets
    security_group_ids = [aws_security_group.release.id]
  }
  environment { variables = {
    CLUSTER_NAME     = data.aws_eks_cluster.existing.name
    CLUSTER_ENDPOINT = data.aws_eks_cluster.existing.endpoint
    CLUSTER_CA       = data.aws_eks_cluster.existing.certificate_authority[0].data
    ECR_REGISTRY     = local.registry
  } }
  depends_on = [aws_iam_role_policy_attachment.release_vpc, aws_cloudwatch_log_group.release]
}
resource "aws_eks_access_entry" "release" {
  cluster_name      = data.aws_eks_cluster.existing.name
  principal_arn     = aws_iam_role.release.arn
  kubernetes_groups = ["perform-plus-release"]
  type              = "STANDARD"
}

output "repositories" { value = { for key, repo in aws_ecr_repository.app : key => repo.repository_url } }
output "github_role" { value = aws_iam_role.github.arn }
output "certificate_arn" { value = aws_acm_certificate_validation.app.certificate_arn }
output "ingress_role" { value = aws_iam_role.ingress.arn }
output "release_function" { value = aws_lambda_function.release.function_name }
