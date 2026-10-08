output "cluster_name" {
  value = aws_eks_cluster.app.name
}

output "cluster_endpoint" {
  value = aws_eks_cluster.app.endpoint
}

output "vpc_id" {
  value = aws_vpc.app.id
}

output "public_subnet_ids" {
  value = [for subnet in aws_subnet.public : subnet.id]
}

output "ingress_role_arn" {
  value = aws_iam_role.irsa["ingress"].arn
}

output "certificate_arn" {
  value = aws_acm_certificate_validation.app.certificate_arn
}

output "certificate_arns" {
  value = [aws_acm_certificate_validation.app.certificate_arn]
}

output "github_role_arn" {
  value = aws_iam_role.github.arn
}

output "repositories" {
  value = { for component, repository in aws_ecr_repository.app : component => repository.repository_url }
}

output "dns_published" {
  value = keys(aws_route53_record.app)
}
