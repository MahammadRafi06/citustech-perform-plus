variable "app_load_balancer_arn" {
  description = "ALB created by the app's ingress controller; set after first ingress reconciliation."
  type        = string
  default     = null
}

data "aws_lb" "app" {
  count = var.app_load_balancer_arn == null ? 0 : 1
  arn   = var.app_load_balancer_arn
}

resource "aws_route53_record" "app" {
  count   = var.app_load_balancer_arn == null ? 0 : 1
  zone_id = local.zone_id
  name    = local.host
  type    = "A"
  alias {
    name                   = data.aws_lb.app[0].dns_name
    zone_id                = data.aws_lb.app[0].zone_id
    evaluate_target_health = true
  }
}
