# Optional Terraform infrastructure module

**Not executed in this environment; not a public adult-content deployment.** Only use for a legally and provider-approved *private synthetic-media preview*. Review AWS charges and budgets first. The domain is NOT bought by Terraform.

1. Install AWS CLI and Terraform from trusted official distributions; set up temporary AWS identity credentials with least privilege (no root access keys).
2. Copy `terraform.tfvars.example` to `terraform.tfvars`; choose currently supported region, AZ, Lightsail blueprint, bundle, pre-existing SSH key, and your own restricted SSH IP CIDR.
3. If you ALREADY own a domain and have an existing Route53 hosted zone, set `hosted_zone_id` and `preview_hostname`. Otherwise leave both empty and configure DNS later.
4. Run `terraform init`, `terraform fmt -check`, `terraform validate`, then **review** `terraform plan` including charges. Only after your explicit approval run `terraform apply`.
5. Read `instance_ip`; perform the manual Docker Compose setup in `deployment/aws/README.md`. Terraform creates infrastructure but never uploads source/secrets or deploys the app.
6. `terraform destroy` deletes the Lightsail instance (including any local data on its instance disk), IP and managed DNS record. Back up application data first.

The instance public-port rule exposes HTTP/HTTPS only through Caddy password authentication. Port 3000 is not published. `203.0.113.10/32` is documentation-only; use your actual public IPv4. Store Terraform state encrypted and private because it contains infrastructure details. Add budget alerts to prevent surprise data-transfer charges.
