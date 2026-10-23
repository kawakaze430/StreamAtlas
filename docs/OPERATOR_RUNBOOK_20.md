# Private preview operator runbook and emergency revocation

## Before a private AWS preview

- Only original **synthetic** demonstration media is permitted in the test environment.
- The preview domain and billing must be owned/approved by the operator. Do not supply cloud access keys in chat or commit them to source.
- Require account MFA, HTTPS, password-protected Caddy preview, restricted SSH, backup encryption and a tested restore path. Review the hosting/CDN provider's adult-content policies separately.
- Run `npm test`, `npm run recovery:drill`, and the existing browser audit before an infrastructure change.
- For a real domain already owned by the operator, set `SA_EXTERNAL_PREVIEW_TEST_ACK=YES`, `SA_PREVIEW_URL=https://preview.example.com/`, and `SA_PREVIEW_BASIC_AUTH='user:secret'`, then run `npm run verify:private-deployment`. This test is read-only. Never run it on someone else's site.

## Emergency content / rights incident

1. A trained reviewer receives the case, records the issue and severity, and assesses immediate legal/safety obligations.
2. Use the administrator emergency-hold action to set `HIDDEN`. It creates an audit event and a durable CDN invalidation outbox job for uploaded media.
3. For an explicit license revocation or automatic expiry, use the license-review action/expiry job; it also hides media and creates a rights hold.
4. If private CloudFront delivery is active, the operator must separately quarantine/remove the offending S3 objects or adjust permissions, rotate/disable affected signing keys if needed, and invalidate the relevant `/media/UUID/*` paths. **Invalidation by itself cannot instantly revoke an existing unexpired signed cookie.** Cached tokens have a short lifetime, but any ongoing access must be risk-assessed.
5. An authorized operator may run `SA_AWS_INVALIDATION_ACK=YES SA_CLOUDFRONT_DISTRIBUTION_ID=E... npm run cdn:invalidate` only after approval and IAM validation. The script records `REQUESTED`, not `COMPLETED`.
6. Confirm the CloudFront invalidation status in AWS, test that unauthorized access is denied, and reconcile the evidence, legal retention and abuse-reporting process.
7. Content does not republish automatically when a case is closed, license is renewed, or an appeal is accepted. Re-publication requires a new human, lawful review.

## Worker / DB / media storage incidents

- Worker stalled: inspect `GET /api/admin/operations`, verify the worker lease, and inspect processing events without leaking uploader documents.
- Database health failure: stop writes, preserve forensic copies, restore into an **isolated** target from a known-good encrypted backup, validate integrity and media checksums, then plan a reviewed switchover.
- Private storage not writable: stop new uploads; keep known-good published media read-only until permissions/volume capacity are fixed. Do not bypass moderation to restore throughput.
- Auth or signed-provider compromise: revoke sessions/receipt trust, rotate compromised signing and MFA envelope keys via a reviewed process, and coordinate with providers. Avoid exposing token payloads in logs.
- HTTP 5xx spike: correlate logs and low-cardinality metrics, capture a timeline, consider maintenance/read-only mode, and roll back tested deployment changes.

## Monitoring

`GET /api/internal/metrics` is bearer-token-protected; scrape only over a protected channel. Sample, **not yet deployed**, alert rules live in `deployment/monitoring/streamatlas-alerts.yml`. The app exposes database health, storage writable state, pending/failed media work and status-classed HTTP responses without labels containing account IDs.

## Deliberate omissions

No 24/7 moderation staffing, legal counter-notice rules, cloud provider agreement, regulatory approval, automatic KMS rotation, AWS resource application, production email delivery, independent penetration testing or real age/consent evidence was created by these scripts.
