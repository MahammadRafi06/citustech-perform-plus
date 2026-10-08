terraform {
  required_version = ">= 1.10.0"
  required_providers {
    aws = { source = "hashicorp/aws", version = "6.63.0" }
  }
  backend "local" {
    path = "../../.local/aws-deploy/small-cluster/terraform.tfstate"
  }
}

provider "aws" {
  region              = "us-west-2"
  allowed_account_ids = ["703671901662"]
  default_tags {
    tags = {
      Project   = "perform-plus"
      ManagedBy = "perform-plus-small-terraform"
    }
  }
}

data "aws_caller_identity" "current" {}
data "aws_iam_openid_connect_provider" "github" {
  url = "https://token.actions.githubusercontent.com"
}

locals {
  name                = "perform-plus-small"
  admin_principal_arn = var.admin_principal_arn != "" ? var.admin_principal_arn : data.aws_caller_identity.current.arn
  github_subject      = "repo:MahammadRafi06@163666861/citustech-perform-plus@1367596866:ref:refs/heads/main"
  oidc_issuer         = replace(aws_iam_openid_connect_provider.cluster.url, "https://", "")
  public_subnets = {
    "us-west-2a" = "10.74.0.0/24"
    "us-west-2b" = "10.74.1.0/24"
  }
  irsa_accounts = {
    cni     = "system:serviceaccount:kube-system:aws-node"
    ebs     = "system:serviceaccount:kube-system:ebs-csi-controller-sa"
    ingress = "system:serviceaccount:perform-plus:aws-load-balancer-controller"
  }
}

resource "aws_vpc" "app" {
  cidr_block           = "10.74.0.0/16"
  enable_dns_support   = true
  enable_dns_hostnames = true
  tags                 = { Name = local.name }
}

resource "aws_internet_gateway" "app" {
  vpc_id = aws_vpc.app.id
  tags   = { Name = local.name }
}

resource "aws_subnet" "public" {
  for_each                = local.public_subnets
  vpc_id                  = aws_vpc.app.id
  availability_zone       = each.key
  cidr_block              = each.value
  map_public_ip_on_launch = true
  tags = {
    Name                                  = "${local.name}-${each.key}"
    "kubernetes.io/role/elb"              = "1"
    "kubernetes.io/cluster/${local.name}" = "shared"
  }
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.app.id
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.app.id
  }
  tags = { Name = "${local.name}-public" }
}

resource "aws_route_table_association" "public" {
  for_each       = aws_subnet.public
  subnet_id      = each.value.id
  route_table_id = aws_route_table.public.id
}

resource "aws_iam_role" "cluster" {
  name = "${local.name}-cluster"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "eks.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "cluster" {
  role       = aws_iam_role.cluster.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSClusterPolicy"
}

resource "aws_eks_cluster" "app" {
  name                          = local.name
  role_arn                      = aws_iam_role.cluster.arn
  version                       = "1.35"
  bootstrap_self_managed_addons = false
  access_config {
    authentication_mode                         = "API"
    bootstrap_cluster_creator_admin_permissions = false
  }
  vpc_config {
    subnet_ids              = [for subnet in aws_subnet.public : subnet.id]
    endpoint_private_access = true
    endpoint_public_access  = true
    public_access_cidrs     = var.admin_cidrs
  }
  upgrade_policy {
    support_type = "STANDARD"
  }
  depends_on = [aws_iam_role_policy_attachment.cluster]
}

resource "aws_eks_access_entry" "admin" {
  cluster_name  = aws_eks_cluster.app.name
  principal_arn = local.admin_principal_arn
  type          = "STANDARD"
  lifecycle {
    precondition {
      condition     = can(regex("^arn:aws:iam::703671901662:(user|role)/", local.admin_principal_arn))
      error_message = "Cluster administration requires an IAM user or role ARN in account 703671901662, not an STS session ARN. Set admin_principal_arn when using an assumed role."
    }
  }
}

resource "aws_eks_access_policy_association" "admin" {
  cluster_name  = aws_eks_cluster.app.name
  principal_arn = aws_eks_access_entry.admin.principal_arn
  policy_arn    = "arn:aws:eks::aws:cluster-access-policy/AmazonEKSClusterAdminPolicy"
  access_scope {
    type = "cluster"
  }
}

resource "aws_iam_openid_connect_provider" "cluster" {
  url            = aws_eks_cluster.app.identity[0].oidc[0].issuer
  client_id_list = ["sts.amazonaws.com"]
}

resource "aws_iam_role" "irsa" {
  for_each = local.irsa_accounts
  name     = each.key == "ebs" ? "${local.name}-ebs-csi" : "${local.name}-${each.key}"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Federated = aws_iam_openid_connect_provider.cluster.arn }
      Action    = "sts:AssumeRoleWithWebIdentity"
      Condition = {
        StringEquals = {
          "${local.oidc_issuer}:aud" = "sts.amazonaws.com"
          "${local.oidc_issuer}:sub" = each.value
        }
      }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "cni" {
  role       = aws_iam_role.irsa["cni"].name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy"
}

resource "aws_iam_role_policy_attachment" "ebs" {
  role       = aws_iam_role.irsa["ebs"].name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonEBSCSIDriverPolicy"
}

resource "aws_iam_role_policy" "ingress" {
  role   = aws_iam_role.irsa["ingress"].id
  name   = "aws-load-balancer-controller-v3-5-0"
  policy = file("${path.module}/../aws/load-balancer-controller-policy.json")
}

resource "aws_eks_addon" "cni" {
  cluster_name                = aws_eks_cluster.app.name
  addon_name                  = "vpc-cni"
  addon_version               = "v1.23.2-eksbuild.1"
  service_account_role_arn    = aws_iam_role.irsa["cni"].arn
  resolve_conflicts_on_create = "OVERWRITE"
  resolve_conflicts_on_update = "PRESERVE"
  depends_on                  = [aws_iam_role_policy_attachment.cni]
}

resource "aws_eks_addon" "kube_proxy" {
  cluster_name                = aws_eks_cluster.app.name
  addon_name                  = "kube-proxy"
  addon_version               = "v1.35.3-eksbuild.29"
  resolve_conflicts_on_create = "OVERWRITE"
  resolve_conflicts_on_update = "PRESERVE"
}

resource "aws_iam_role" "node" {
  name = "${local.name}-node"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "ec2.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "node" {
  for_each   = toset(["AmazonEKSWorkerNodePolicy", "AmazonEC2ContainerRegistryPullOnly"])
  role       = aws_iam_role.node.name
  policy_arn = "arn:aws:iam::aws:policy/${each.key}"
}

resource "aws_launch_template" "node" {
  name = "${local.name}-node"
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
    http_put_response_hop_limit = 1
  }
  tag_specifications {
    resource_type = "instance"
    tags          = { Name = "${local.name}-node", Project = "perform-plus" }
  }
  tag_specifications {
    resource_type = "volume"
    tags          = { Name = "${local.name}-node", Project = "perform-plus" }
  }
}

resource "aws_eks_node_group" "app" {
  cluster_name    = aws_eks_cluster.app.name
  node_group_name = "perform-plus"
  node_role_arn   = aws_iam_role.node.arn
  # Keep the single worker in the database volume's AZ during replacement.
  # The EKS control plane and public ALB still use both subnets.
  subnet_ids     = [aws_subnet.public["us-west-2a"].id]
  instance_types = ["t3.large"]
  capacity_type  = "ON_DEMAND"
  ami_type       = "AL2023_x86_64_STANDARD"
  scaling_config {
    min_size     = 1
    max_size     = 1
    desired_size = 1
  }
  labels = { workload = "perform-plus" }
  launch_template {
    id      = aws_launch_template.node.id
    version = tostring(aws_launch_template.node.latest_version)
  }
  depends_on = [
    aws_iam_role_policy_attachment.node,
    aws_route_table_association.public,
    aws_eks_addon.cni,
    aws_eks_addon.kube_proxy,
  ]
}

resource "aws_eks_addon" "coredns" {
  cluster_name                = aws_eks_cluster.app.name
  addon_name                  = "coredns"
  addon_version               = "v1.14.6-eksbuild.4"
  resolve_conflicts_on_create = "OVERWRITE"
  resolve_conflicts_on_update = "PRESERVE"
  depends_on                  = [aws_eks_node_group.app]
}

resource "aws_eks_addon" "ebs" {
  cluster_name                = aws_eks_cluster.app.name
  addon_name                  = "aws-ebs-csi-driver"
  addon_version               = "v1.66.0-eksbuild.1"
  service_account_role_arn    = aws_iam_role.irsa["ebs"].arn
  resolve_conflicts_on_create = "OVERWRITE"
  resolve_conflicts_on_update = "PRESERVE"
  depends_on                  = [aws_eks_node_group.app, aws_iam_role_policy_attachment.ebs]
}

resource "aws_ecr_repository" "app" {
  for_each             = toset(["ui", "api"])
  name                 = "perform-plus/${each.key}"
  image_tag_mutability = "IMMUTABLE"
  image_scanning_configuration {
    scan_on_push = true
  }
  encryption_configuration {
    encryption_type = "AES256"
  }
  lifecycle {
    prevent_destroy = true
  }
}

resource "aws_ecr_lifecycle_policy" "app" {
  for_each   = aws_ecr_repository.app
  repository = each.value.name
  policy = jsonencode({
    rules = [{
      rulePriority = 1
      description  = "Retain the five newest component images"
      selection = {
        tagStatus   = "any"
        countType   = "imageCountMoreThan"
        countNumber = 5
      }
      action = { type = "expire" }
    }]
  })
}

resource "aws_iam_role" "github" {
  name = "perform-plus-github-main"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Federated = data.aws_iam_openid_connect_provider.github.arn }
      Action    = "sts:AssumeRoleWithWebIdentity"
      Condition = {
        StringEquals = {
          "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
          "token.actions.githubusercontent.com:sub" = local.github_subject
        }
      }
    }]
  })
}

# The existing Actions workflow may publish with publish_only=true. This role
# grants no Kubernetes, Lambda, infrastructure or automatic-deployment access.
resource "aws_iam_role_policy" "github" {
  role = aws_iam_role.github.id
  name = "publish-app-images-only"
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["ecr:GetAuthorizationToken"]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "ecr:BatchCheckLayerAvailability", "ecr:InitiateLayerUpload",
          "ecr:UploadLayerPart", "ecr:CompleteLayerUpload", "ecr:PutImage",
          "ecr:BatchGetImage", "ecr:GetDownloadUrlForLayer", "ecr:DescribeImages",
        ]
        Resource = [for repository in aws_ecr_repository.app : repository.arn]
      },
    ]
  })
}
