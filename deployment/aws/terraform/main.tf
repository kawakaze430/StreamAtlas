# OPTIONAL one-host private demo infrastructure; Terraform does not register domains
# or upload application code. Run ONLY with reviewed paid AWS account credentials.
terraform {
  required_version = ">= 1.6.0"
  required_providers {
    aws = {
      source = "hashicorp/aws"
      version = ">= 5.73, < 7.0"
    }
  }
}
provider "aws" {
  region = var.region
}
variable "region" { type = string }
variable "availability_zone" { type = string }
variable "bundle_id" {
  type = string
  description = "Choose valid Lightsail bundle ID in your region after checking current prices."
}
variable "blueprint_id" {
  type = string
  default = "ubuntu_24_04"
}
variable "instance_name" {
  type = string
  default = "streamatlas-private-preview"
}
variable "key_pair_name" {
  type = string
  default = null
  description = "Existing Lightsail SSH key pair; set explicitly for SSH access."
}
variable "ssh_cidr" {
  type = string
  description = "YOUR public IP followed by /32 for SSH; never set 0.0.0.0/0"
  validation {
    condition = can(cidrnetmask(var.ssh_cidr)) && var.ssh_cidr != "0.0.0.0/0"
    error_message = "Provide a restrictive valid SSH IPv4 CIDR."
  }
}
variable "hosted_zone_id" {
  type = string
  default = ""
  description = "Optional EXISTING Route53 hosted zone ID; Terraform does not register any domain."
}
variable "preview_hostname" {
  type = string
  default = ""
  description = "Optional hostname owned by you, under the hosted zone."
}
resource "aws_lightsail_instance" "preview" {
  name              = var.instance_name
  availability_zone = var.availability_zone
  blueprint_id      = var.blueprint_id
  bundle_id         = var.bundle_id
  key_pair_name     = var.key_pair_name
  tags = {
    Application = "streamatlas-synthetic-preview"
    Environment = "private-evaluation"
  }
}
resource "aws_lightsail_static_ip" "preview" {
  name = "${var.instance_name}-ip"
}
resource "aws_lightsail_static_ip_attachment" "preview" {
  static_ip_name = aws_lightsail_static_ip.preview.name
  instance_name  = aws_lightsail_instance.preview.name
}
resource "aws_lightsail_instance_public_ports" "preview" {
  instance_name = aws_lightsail_instance.preview.name
  port_info { protocol = "tcp" from_port = 22 to_port = 22 cidrs = [var.ssh_cidr] }
  port_info { protocol = "tcp" from_port = 80 to_port = 80 cidrs = ["0.0.0.0/0"] }
  port_info { protocol = "tcp" from_port = 443 to_port = 443 cidrs = ["0.0.0.0/0"] }
  port_info { protocol = "udp" from_port = 443 to_port = 443 cidrs = ["0.0.0.0/0"] }
}
resource "aws_route53_record" "preview" {
  count = var.hosted_zone_id != "" && var.preview_hostname != "" ? 1 : 0
  zone_id = var.hosted_zone_id
  name = var.preview_hostname
  type = "A"
  ttl = 300
  records = [aws_lightsail_static_ip.preview.ip_address]
}
output "instance_ip" { value = aws_lightsail_static_ip.preview.ip_address }
output "preview_url" { value = var.preview_hostname == "" ? "No DNS record managed by Terraform" : "https://${var.preview_hostname}" }
output "next_step" { value = "Install Docker on the Ubuntu instance, copy source privately, create deployment/aws/.env.runtime and start the private Compose stack." }
