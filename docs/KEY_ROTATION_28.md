# Checkpoint 28 — media signing key rotation plan (NOT performed)

The local signer uses one CloudFront key pair ID and an owner-only private key file. The offline inspector accepts a **key-ID → public-key** registry so that overlapping old/new keys can be tested without exposing private material. No AWS key group or Secrets Manager changes were made.

Proposed controlled rotation for an approved private synthetic environment:

1. Generate a new key offline with approved cryptographic policy. Keep the private key out of Terraform, source, CI logs and release ZIPs. Register only the public key in a trusted CloudFront key group and verify provider propagation.
2. Configure the signing service with the new key ID and private key secret version, using least-privilege retrieval and audit logging. Verify it can sign a 60-second per-upload cookie, then switch issuing traffic to the new key.
3. Keep the old public key trusted for **at least the longest previously issued cookie TTL plus propagation and clock skew**, then remove it. Test valid/expired/invalid/old-key/alternate-resource cases from the CDN, not just the offline inspector.
4. If compromise is suspected, block access at origin/edge, invalidate affected media, revoke the old key urgently and document the inevitable window for cached copies. A local hold alone **cannot retroactively revoke already-issued CloudFront signed cookies**.
5. Record operator approvals, old/new key fingerprints (never private keys), timings, cache invalidation IDs, provider logs and independent test evidence. Do not automate rotation against AWS until IAM, cost, provider, territory and legal gates are approved.

Separate rotation and restore plans remain required for MFA encryption keys, CSRF secrets, webhook HMAC keys, database credentials, KMS and OIDC roles. Current prototype does **not** implement dual-key MFA re-encryption or production Secrets Manager orchestration.
