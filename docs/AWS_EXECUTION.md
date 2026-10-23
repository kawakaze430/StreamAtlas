# AWS / custom domain execution — private synthetic demo only

**What exists:** Dockerfile, Docker Compose, Caddy authentication/HTTPS,
Lightsail Terraform in `deployment/aws/terraform`, private CloudFront/S3
Terraform in `deployment/aws/media-cdn`, client-side encrypted backups and
local staging. **Nothing was deployed and no domain was purchased.**

## Before AWS use

1. Verify Amazon AWS Acceptable Use Policy and actual service-specific terms;
   obtain necessary permission for planned use before any adult media. Start
   with a **synthetic/non-explicit private demo only**.
2. Create your AWS account directly at https://aws.amazon.com/; use root only
   for initial setup, enable root MFA, configure IAM roles and billing alerts.
   Never paste AWS credentials, signing private keys, or identity documents in
   chat or check them into source control.
3. Register a domain separately (Route 53 or accredited registrar), such as
   `example.com`, and reserve `preview.example.com` for the private app and
   `media.example.com` for a future *licensed* private media distribution.
   Domain ownership and DNS changes require your authorized action.
4. See `deployment/aws/README.md` for private Lightsail server deployment.
   Build it on a suitable host with Docker Compose and Caddy. Configure the
   static IP, `A` record, HTTPS certificate and password-gated preview.
5. From a locked-down operator environment, run `npm test`, `npm run doctor`,
   `npm run deploy:check`, and verify Docker builds, limited disk growth and
   app/worker isolation. None of those proves compliance by itself.

## CloudFront + S3 for a FUTURE approved catalog

This additional template lives in `deployment/aws/media-cdn`. It requires:

- A globally unique bucket name and verified AWS ownership.
- A locally generated RSA public key PEM file; the matching private key must
  remain outside Terraform in a secret manager with minimal role access.
- An ACM certificate in us-east-1 and a DNS record for `media.example.com`
  if you wish to send same-site CloudFront signed cookies from
  `preview.example.com`. CloudFront default domains cannot accept cookies
  set by unrelated site domains.
- Terraform >=1.6 + AWS CLI with scoped, short-lived IAM credentials. Example:

```bash
cd deployment/aws/media-cdn
terraform init
terraform fmt -check
terraform validate
terraform plan -var="private_media_bucket=unique-private-name" \
  -var="cloudfront_public_key_pem_path=/path/to/public.pem"
# IMPORTANT: Review plan, billing, IAM, bucket & provider support. Apply only
# after confirming authorization; we have NOT run an apply.
```

CloudFront signed cookies must be issued only after *server-side* confirmation
of lawful rights, participant consent, age assurance/entitlements, region and
publication status. The `src/cloudfront-access.js` signer intentionally has no
public unauthenticated endpoint. The prepared S3 private staging scripts do not
create public-read ACLs or permit unauthorized video publication.

### Actual AWS acceptance tests (not executed)

- IAM least privilege, S3 block public access, private origin (OAC),
  encrypted/versioned bucket, no accidental public bucket listing.
- CloudFront signed access returns 403 unsigned/expired/wrong-path and 200
  correctly signed; signed cookies persist for manifest + segments under the
  intended subdomain. Verify cache invalidation after emergency takedown.
- AWS metrics, alarms, logs, alerts and global bandwidth billing safeguards.
- Offsite encrypted backup from stopped services to S3 with KMS; restore to
  an entirely separate instance and verify media/checksums/catalog parity.
- Browser HTTPS security/CSP, mobile playback, cross-browser HLS, access denial
  under revoked entitlements, device clock differences, load and failure tests.

## Useful AWS documentation

- CloudFront private signed media: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/PrivateContent.html
- Signed cookies: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-signed-cookies.html
- OAC / private origin: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-overview.html
- S3 Ownership / block public access: https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-ownership-new-bucket.html
- AWS Acceptable Use Policy: https://aws.amazon.com/aup/
