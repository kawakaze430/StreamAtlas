# Unapplied SQS design. IAM, content rights, region, and AWS spend require review.
terraform {
  required_version = ">= 1.6.0"
  required_providers { aws = { source = "hashicorp/aws", version = ">= 5.73, < 7.0" } }
}
provider "aws" { region = var.region }
variable "region" { type = string; default = "us-east-1" }
variable "name_prefix" { type = string; default = "streamatlas-private-eval" }
resource "aws_sqs_queue" "dead_letter" {
  name = "${var.name_prefix}-media-dlq"
  message_retention_seconds = 1209600
  sqs_managed_sse_enabled = true
  tags = { Environment = "private-evaluation", Data = "synthetic-only" }
}
resource "aws_sqs_queue" "media_jobs" {
  name = "${var.name_prefix}-media-jobs"
  visibility_timeout_seconds = 900
  receive_wait_time_seconds = 20
  message_retention_seconds = 345600
  sqs_managed_sse_enabled = true
  redrive_policy = jsonencode({ deadLetterTargetArn = aws_sqs_queue.dead_letter.arn, maxReceiveCount = 5 })
  tags = { Environment = "private-evaluation", Data = "synthetic-only" }
}
data "aws_iam_policy_document" "require_tls_media" {
  statement {
    sid = "DenyInsecureTransport"
    effect = "Deny"
    actions = ["sqs:*"]
    resources = [aws_sqs_queue.media_jobs.arn]
    principals { type = "*"; identifiers = ["*"] }
    condition { test = "Bool"; variable = "aws:SecureTransport"; values = ["false"] }
  }
}
resource "aws_sqs_queue_policy" "media_jobs" {
  queue_url = aws_sqs_queue.media_jobs.id
  policy = data.aws_iam_policy_document.require_tls_media.json
}
data "aws_iam_policy_document" "require_tls_dlq" {
  statement {
    sid = "DenyInsecureTransport"
    effect = "Deny"
    actions = ["sqs:*"]
    resources = [aws_sqs_queue.dead_letter.arn]
    principals { type = "*"; identifiers = ["*"] }
    condition { test = "Bool"; variable = "aws:SecureTransport"; values = ["false"] }
  }
}
resource "aws_sqs_queue_policy" "dead_letter" {
  queue_url = aws_sqs_queue.dead_letter.id
  policy = data.aws_iam_policy_document.require_tls_dlq.json
}
output "media_queue_arn" { value = aws_sqs_queue.media_jobs.arn }
output "dead_letter_queue_arn" { value = aws_sqs_queue.dead_letter.arn }
