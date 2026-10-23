# OPTIONAL private-media delivery infrastructure. Not applied by ChatGPT.
# A custom CloudFront media domain and ACM certificate (in us-east-1) must be
# attached later to use same-site signed cookies; the default CloudFront domain
# is NOT suitable for cookies issued by a separate application host.
terraform {
required_version = ">= 1.6.0"
required_providers {
aws = {
source = "hashicorp/aws", version = "~> 5.0"
}
}
}
provider "aws" {
region = var.region
}
variable "region" {
type = string
default = "us-east-1"
}
variable "private_media_bucket" {
type = string
}
variable "private_originals_bucket" {
type = string
}
variable "cloudfront_public_key_pem_path" {
type = string
}
variable "cloudfront_public_key_name" {
type = string
default = "streamatlas-preview-media-key"
}
variable "media_domain" {
type = string
default = ""
}
variable "acm_certificate_arn" {
type = string
default = ""
}
resource "aws_s3_bucket" "media" {
bucket = var.private_media_bucket
force_destroy = false
}
resource "aws_s3_bucket_public_access_block" "media" {
bucket = aws_s3_bucket.media.id
block_public_acls = true
block_public_policy = true
ignore_public_acls = true
restrict_public_buckets = true
}
resource "aws_s3_bucket_ownership_controls" "media" {
bucket = aws_s3_bucket.media.id
rule {
object_ownership = "BucketOwnerEnforced"
}
}
resource "aws_s3_bucket_versioning" "media" {
bucket = aws_s3_bucket.media.id
versioning_configuration {
status = "Enabled"
}
}
resource "aws_s3_bucket_server_side_encryption_configuration" "media" {
bucket = aws_s3_bucket.media.id
rule {
apply_server_side_encryption_by_default {
sse_algorithm = "AES256"
}
}
}
# Separate, non-CDN original-media bucket. No CloudFront origin or public policy.
# Terraform is a DRAFT: never apply without provider, rights and billing approval.
resource "aws_s3_bucket" "originals" {
bucket = var.private_originals_bucket
force_destroy = false
lifecycle {
precondition {
condition = var.private_originals_bucket != var.private_media_bucket
error_message = "Originals and renditions must use different buckets."
}
}
}
resource "aws_s3_bucket_public_access_block" "originals" {
bucket = aws_s3_bucket.originals.id
block_public_acls = true
block_public_policy = true
ignore_public_acls = true
restrict_public_buckets = true
}
resource "aws_s3_bucket_ownership_controls" "originals" {
bucket = aws_s3_bucket.originals.id
rule {
object_ownership = "BucketOwnerEnforced"
}
}
resource "aws_s3_bucket_versioning" "originals" {
bucket = aws_s3_bucket.originals.id
versioning_configuration {
status = "Enabled"
}
}
resource "aws_s3_bucket_server_side_encryption_configuration" "originals" {
bucket = aws_s3_bucket.originals.id
rule {
apply_server_side_encryption_by_default {
sse_algorithm = "AES256"
}
}
}
resource "aws_s3_bucket_lifecycle_configuration" "originals" {
bucket = aws_s3_bucket.originals.id
rule {
id = "abort-incomplete-multipart"
status = "Enabled"
abort_incomplete_multipart_upload {
days_after_initiation = 7
}
}
}
resource "aws_s3_bucket_lifecycle_configuration" "media" {
bucket = aws_s3_bucket.media.id
rule {
id = "abort-incomplete-multipart"
status = "Enabled"
abort_incomplete_multipart_upload {
days_after_initiation = 7
}
}
}
resource "aws_cloudfront_origin_access_control" "media" {
name = "streamatlas-media-oac"
description = "Signed private access to StreamAtlas media bucket"
origin_access_control_origin_type = "s3"
signing_behavior = "always"
signing_protocol = "sigv4"
}
resource "aws_cloudfront_public_key" "media" {
name = var.cloudfront_public_key_name
encoded_key = file(var.cloudfront_public_key_pem_path)
comment = "Public verification key only; keep private signing key OUTSIDE Terraform"
}
resource "aws_cloudfront_key_group" "media" {
name = "streamatlas-private-media"
items = [aws_cloudfront_public_key.media.id]
}
resource "aws_cloudfront_distribution" "media" {
enabled = true
comment = "PRIVATE StreamAtlas synthetic-media evaluation, no public launch approval"
aliases = var.media_domain == "" ? [] : [var.media_domain]
is_ipv6_enabled = true
price_class = "PriceClass_100"
origin {
domain_name = aws_s3_bucket.media.bucket_regional_domain_name
origin_id = "media-s3"
origin_access_control_id = aws_cloudfront_origin_access_control.media.id
}
default_cache_behavior {
target_origin_id = "media-s3"
viewer_protocol_policy = "https-only"
allowed_methods = ["GET", "HEAD"]
cached_methods = ["GET", "HEAD"]
compress = true
trusted_key_groups = [aws_cloudfront_key_group.media.id]
cache_policy_id = "658327ea-f89d-4fab-a63d-7e88639e58f6" # AWS Managed-CachingOptimized
}
# HLS manifests are not cached at the CDN in this draft; short-lived
# manifests are required for timely publishing/hold changes. All media paths
# still require trusted signatures, including manifests and segments.
ordered_cache_behavior {
path_pattern = "*.m3u8"
target_origin_id = "media-s3"
viewer_protocol_policy = "https-only"
allowed_methods = ["GET", "HEAD"]
cached_methods = ["GET", "HEAD"]
compress = false
trusted_key_groups = [aws_cloudfront_key_group.media.id]
cache_policy_id = "413f1600-6b0b-4f8f-9e6e-4d89ba1b1a8d" # AWS Managed-CachingDisabled
}
restrictions {
geo_restriction {
restriction_type = "none"
}
}
viewer_certificate {
acm_certificate_arn = var.media_domain == "" ? null : var.acm_certificate_arn
ssl_support_method = var.media_domain == "" ? null : "sni-only"
minimum_protocol_version = "TLSv1.2_2021"
cloudfront_default_certificate = var.media_domain == ""
}
lifecycle {
precondition {
condition = (var.media_domain == "") == (var.acm_certificate_arn == "")
error_message = "Provide both custom media_domain and ACM certificate ARN or neither."
}
}
}
data "aws_iam_policy_document" "read_cloudfront_only" {
statement {
sid = "CloudFrontOACReadOnly"
actions = ["s3:GetObject"]
resources = ["${aws_s3_bucket.media.arn}/*"]
principals {
type = "Service"
identifiers = ["cloudfront.amazonaws.com"]
}
condition {
test = "StringEquals"
variable = "AWS:SourceArn"
values = [aws_cloudfront_distribution.media.arn]
}
}
}
resource "aws_s3_bucket_policy" "media" {
bucket = aws_s3_bucket.media.id
policy = data.aws_iam_policy_document.read_cloudfront_only.json
depends_on = [aws_s3_bucket_public_access_block.media]
}
output "media_bucket" {
value = aws_s3_bucket.media.bucket
}
output "cdn_hostname" {
value = aws_cloudfront_distribution.media.domain_name
}
output "trusted_key_group_id" {
value = aws_cloudfront_key_group.media.id
}
output "public_key_id" {
value = aws_cloudfront_public_key.media.id
}
output "private_originals_bucket" {
value = aws_s3_bucket.originals.bucket
}
