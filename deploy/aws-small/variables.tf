variable "admin_cidrs" {
  description = "Explicit workstation IPv4 CIDRs allowed to reach the public Kubernetes API. Save actual values in an ignored private tfvars file."
  type        = list(string)
  validation {
    condition = length(var.admin_cidrs) > 0 && alltrue([
      for cidr in var.admin_cidrs : can(cidrnetmask(cidr)) && try(tonumber(split("/", cidr)[1]) >= 24, false)
    ])
    error_message = "Provide at least one valid IPv4 CIDR with a prefix of /24 or narrower; unrestricted public API access is prohibited."
  }
}

variable "admin_principal_arn" {
  description = "Stable IAM user or role ARN for cluster administration; defaults to the current caller, which must be an IAM user rather than an STS assumed-role session."
  type        = string
  default     = ""
}

variable "lb_dns_name" {
  description = "Hostname of the new ingress ALB. Leave empty until the app and HTTPS ingress are verified."
  type        = string
  default     = ""
  validation {
    condition     = (var.lb_dns_name == "") == (var.lb_zone_id == "")
    error_message = "Set both lb_dns_name and lb_zone_id together, or leave both empty."
  }
}

variable "lb_zone_id" {
  description = "Canonical hosted zone ID of the new ingress ALB, supplied together with lb_dns_name after ingress verification."
  type        = string
  default     = ""
}
