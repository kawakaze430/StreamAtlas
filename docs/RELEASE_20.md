# StreamAtlas v0.20.0 — cumulative engineering release

**Scope:** Private synthetic-media prototype, not a public adult-content service.
**Baseline:** v0.19.0, 107 passing automated tests.
**Current release:** locally verified; consult `CHECKPOINT_MANIFEST.json` for final test counts.

## Changes delivered

1. `src/playback-authorization.js`: non-demo, signed-receipt, expiration-aware private-preview viewer checks; uploaded-asset eligibility includes public status, creator approval, no active safety hold and three reviewed reference types. An optional license expiration policy also restricts access.
2. `src/server.js`: `SA_PRIVATE_PREVIEW_REQUIRE_RECEIPT=1` gates catalog, search, posted sample media and uploaded media. `GET /api/me/access-status` reveals only the state of the receipt (no PII). `POST /api/private-preview/media/:uploadId/cookies` requires logged-in viewer eligibility, three internal review references, a published upload and approved creator. The signing key must be an owner-only local file outside the web root. The CloudFront signer remains explicitly private-evaluation-only.
3. `src/verification-integration.js`: private one-time challenge issuance, hashed challenge storage, and optional challenge binding for signed PASS callbacks. Revocation callbacks remain accepted without a fresh challenge; unknown/expired/reused or mismatched challenges fail closed.
4. `src/media-safety.js`: optional ClamAV-compatible scanner executes before FFprobe/FFmpeg. A scanner outage or nonzero error exit rejects the upload when `SA_REQUIRE_MALWARE_SCAN=1`.
5. `src/media-revocation.js` and `scripts/request-cdn-invalidations.js`: administrators' emergency holds, hide actions, creator suspension and license expiration/revocation create a durable invalidation outbox. The operator script issues CloudFront invalidation requests only after an explicit opt-in and a valid distribution ID. It marks a job `REQUESTED` only after receiving a request identifier; it does NOT claim an invalidation finished or that existing signed cookies are revoked.
6. `src/license-lifecycle.js`: internal, dated media-license review references. Expiry or revocation hides published media, creates an unresolved rights hold, and queues a CDN invalidation. Renewal never automatically republishes. A Cron/operator script can enforce expirations. This is a workflow and not documentary license authentication.
7. `scripts/verify-private-deployment.js`: read-only operator-acknowledged live HTTPS/DNS/private-gateway checks, optionally verifying unsigned CDN access is rejected with HTTP 403. No AWS resources were created.
8. Operational Prometheus gauges and optional alert-rule templates in `deployment/monitoring` for SQLite health, media worker backlog, storage and 5xx ratios.
9. PostgreSQL **schema-only** migrations `006`–`008` and updated disposable lab init scripts. PostgreSQL and Spring Boot are **not cut over**.
10. Expanded unit/API tests, offline Chromium responsive test and actual MP4 decoding. Reviewed HLS JavaScript cannot be retrieved within this environment and genuine cross-browser HLS tests remain open.

## Local commands

```bash
npm test
npm run audit:offline-browser
npm run recovery:drill
npm start
```

**Opt-in preview controls** (do not turn these into public regulatory claims):

```bash
SA_PRIVATE_PREVIEW_REQUIRE_RECEIPT=1 npm start
# For an external age provider integration prototype ONLY:
SA_ENABLE_VENDOR_CHALLENGES=1
SA_REQUIRE_CHALLENGE_BINDING=1
# Optional antivirus, fail closed when scanner is not installed:
SA_REQUIRE_MALWARE_SCAN=1
SA_CLAMSCAN_PATH=/usr/bin/clamscan
# Reviewed-license expiry gate on uploaded media:
SA_REQUIRE_REVIEWED_LICENSE_EXPIRY=1
# Execute job after offline backup/operator approval:
SA_LICENSE_EXPIRY_JOB_ACK=YES npm run license:expire
```

A reviewed verifier or properly configured webhook signer is **not by itself evidence** that a jurisdiction's age assurance standard is met. Internal evidence references are **not actual proof of participant age or consent**. Private synthetic demonstration and CDN cryptographic tests do **not** authorize distribution of regulated content.

## Explicitly not completed

- `hls.js` binary fetch, networked Chrome/Firefox/WebKit Safari HLS and adaptive-bitrate tests, production data path, production DNS/TLS and real S3/CloudFront media session.
- PostgreSQL **execution** and full Spring Boot account/media/moderation/write APIs, identity/session data migration, atomic cutover, rollback and dual-write testing.
- Vendor agreements, verified age/consent/license evidence, regional legality, human operational 24/7 moderation service and independent provider/legal reviews.
- AWS plan/apply, billing approval, domain registration, multi-AZ deployment, real KMS/S3 restore, cloud load/soak, independent penetration testing and IAM validation.

Use `docs/ACCEPTANCE_MATRIX_20.md` and `docs/OPERATOR_RUNBOOK_20.md` for an executable external checklist. The `SA_PUBLIC_CONTENT_MODE=1` guard remains disabled by design.
