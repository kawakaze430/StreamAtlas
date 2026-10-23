# Private media origin & signed HLS delivery: deployment template, NOT deployed

Read this before applying Terraform. This is an independently controlled subsystem
for an **approved, synthetic test catalog only**. Full release requires external
legal, identity, age, rights, privacy and provider reviews.

The Terraform configuration provisions two separate S3 buckets (private originals and private CDN renditions) with public-access blocks,
ACLs disabled, versioning, SSE-S3 encryption and a CloudFront distribution with
origin access control. CloudFront has a trusted key group and denies requests
without properly signed cookies/URLs. The only S3 read principal is CloudFront
with matching `AWS:SourceArn`.

1. Obtain appropriate AWS/provider approval and billing permissions. Set up a
   non-root deployment role. Do not commit keys, .tfstate, credentials or media.
2. Create a separate RSA signing key pair, store the **private key** in Secrets
   Manager, and supply the **PUBLIC PEM path only** to Terraform. Restrict file
   permissions on the signing process.
3. Configure `private_originals_bucket` and `private_media_bucket` (different globally unique names),
   `cloudfront_public_key_pem_path`, and optionally `media_domain` plus an issued
   ACM certificate ARN in us-east-1. Deploy with `terraform init/plan/apply`.
4. Use `media.example.com` and `app.example.com` on the same registrable domain;
   configure application-signed cookies scoped to `.example.com` with `Secure`.
   Never try to set cookies for the CloudFront default domain from an unrelated
   application domain.
5. Upload ONLY pre-reviewed, checksum-verified synthetic media to S3 under
   `media/<upload_id>/*`; keep staging and unpublished objects outside this tree.
   The existing staging script does **not** grant public access.
6. Bind the signer to an *approved playback-session authorization endpoint* with
   per-user entitlement, content status, release eligibility and geographic
   checks. The signer module alone cannot make any of those decisions.
7. Test unsigned requests (must 403), expired cookies (must 403), valid access
   (must return assets), invalid key, revoked/hidden videos, alternate paths and
   cache invalidation after takedowns. Certificate, DNS, live CDN behavior and
   signed-cookie propagation are UNTESTED until real AWS integration.

CloudFront signs a policy for `https://media.example.com/media/<uploadId>/*` so
one set of cookies covers an HLS manifest and its relative segment URLs.
No public launch, domain purchase, or live AWS resources have been performed.

Checkpoint 27 draft: the originals bucket has no CloudFront origin/policy; both buckets block public access, enforce bucket-owner ownership, enable versioning/SSE-S3 and abort incomplete multipart uploads after 7 days. This is NOT proof of AWS policy correctness, legal permission, encryption key policy, or a deployed resource. Terraform CLI validation and real IAM denial tests remain pending.
