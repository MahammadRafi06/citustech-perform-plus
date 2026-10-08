# Optional preparation for the additional .online domain. The existing .com
# certificate, Route 53 records and load balancer remain in place during cutover.
variable "prepare_online_domain" {
  description = "Prepare TLS for performplus.citiustech.online in its existing Route 53 zone; preserve the .com domain."
  type        = bool
  default     = false
}

resource "aws_acm_certificate" "online" {
  count             = var.prepare_online_domain ? 1 : 0
  domain_name       = "performplus.citiustech.online"
  validation_method = "DNS"
  lifecycle { create_before_destroy = true }
}

output "online_certificate_arn" {
  value = var.prepare_online_domain ? aws_acm_certificate.online[0].arn : null
}

output "online_certificate_dns_validation" {
  description = "Certificate-validation CNAMEs managed in the existing citiustech.online Route 53 zone."
  value = var.prepare_online_domain ? [for item in aws_acm_certificate.online[0].domain_validation_options : {
    name  = item.resource_record_name
    type  = item.resource_record_type
    value = item.resource_record_value
  }] : []
}

resource "aws_route53_record" "online_validation" {
  for_each = var.prepare_online_domain ? { for item in aws_acm_certificate.online[0].domain_validation_options : item.domain_name => item } : {}
  zone_id  = "Z03619462N2KEZ2IM79R1"
  name     = each.value.resource_record_name
  type     = each.value.resource_record_type
  records  = [each.value.resource_record_value]
  ttl      = 60
}

resource "aws_acm_certificate_validation" "online" {
  count                   = var.prepare_online_domain ? 1 : 0
  certificate_arn         = aws_acm_certificate.online[0].arn
  validation_record_fqdns = [for record in aws_route53_record.online_validation : record.fqdn]
}

variable "publish_online_domain" {
  description = "Publish the additional app alias only after both-domain ingress and API origins are verified."
  type        = bool
  default     = false
  validation {
    condition     = !var.publish_online_domain || (var.prepare_online_domain && var.app_load_balancer_arn != null)
    error_message = "Publishing .online requires prepare_online_domain=true and the existing app_load_balancer_arn."
  }
}

resource "aws_route53_record" "online_app" {
  count   = var.publish_online_domain ? 1 : 0
  zone_id = "Z03619462N2KEZ2IM79R1"
  name    = "performplus.citiustech.online"
  type    = "A"
  alias {
    name                   = data.aws_lb.app[0].dns_name
    zone_id                = data.aws_lb.app[0].zone_id
    evaluate_target_health = true
  }
  depends_on = [aws_acm_certificate_validation.online]
}
