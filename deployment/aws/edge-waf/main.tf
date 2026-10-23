# UNATTACHED example CloudFront WAF. Review managed-rule false positives and cost.
# For CLOUDFRONT scope this provider must be in us-east-1.
terraform {
required_version = ">= 1.6.0"
required_providers {
aws = {
source = "hashicorp/aws", version = ">= 5.73, < 7.0"
}
}
}
provider "aws" {
region = "us-east-1"
}
resource "aws_wafv2_web_acl" "private_preview" {
name = "streamatlas-private-preview-draft"
scope = "CLOUDFRONT"
description = "Not attached; test false positives and legal/provider requirements first"
default_action {
allow {
}
}
visibility_config {
cloudwatch_metrics_enabled = true
metric_name = "streamatlasPrivatePreviewDraft"
sampled_requests_enabled = false
}
rule {
name = "rate-limit-ip"
priority = 1
action {
block {
}
}
statement {
rate_based_statement {
limit = 2000
aggregate_key_type = "IP"
}
}
visibility_config {
cloudwatch_metrics_enabled = true
metric_name = "streamatlasRateLimitDraft"
sampled_requests_enabled = false
}
}
rule {
name = "aws-common-rule-set"
priority = 2
override_action {
none {
}
}
statement {
managed_rule_group_statement {
name = "AWSManagedRulesCommonRuleSet"
vendor_name = "AWS"
}
}
visibility_config {
cloudwatch_metrics_enabled = true
metric_name = "streamatlasCommonRulesDraft"
sampled_requests_enabled = false
}
}
}
output "unattached_web_acl_arn" {
value = aws_wafv2_web_acl.private_preview.arn
}
