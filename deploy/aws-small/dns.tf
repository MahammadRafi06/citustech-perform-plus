locals {
  domains = {
    "performplus.idaibhealth.com"   = "Z03332101O8QU3MC8I65G"
    "performplus.citiustech.online" = "Z03619462N2KEZ2IM79R1"
  }
}

resource "aws_acm_certificate" "app" {
  domain_name               = "performplus.idaibhealth.com"
  subject_alternative_names = ["performplus.citiustech.online"]
  validation_method         = "DNS"
  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_route53_record" "validation" {
  for_each = {
    for option in aws_acm_certificate.app.domain_validation_options : option.domain_name => option
  }
  zone_id = local.domains[each.key]
  name    = each.value.resource_record_name
  type    = each.value.resource_record_type
  records = [each.value.resource_record_value]
  ttl     = 60
}

resource "aws_acm_certificate_validation" "app" {
  certificate_arn         = aws_acm_certificate.app.arn
  validation_record_fqdns = [for record in aws_route53_record.validation : record.fqdn]
}

resource "aws_route53_record" "app" {
  for_each = var.lb_dns_name != "" && var.lb_zone_id != "" ? local.domains : {}
  zone_id  = each.value
  name     = each.key
  type     = "A"
  alias {
    name                   = var.lb_dns_name
    zone_id                = var.lb_zone_id
    evaluate_target_health = true
  }
  depends_on = [aws_acm_certificate_validation.app]
}
