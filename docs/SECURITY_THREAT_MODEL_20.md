# Preliminary threat model — NOT an independent assessment

| Boundary / trust asset | Credible attacker action | Mitigation shipped | Still required |
|---|---|---|---|
| Session and browser | CSRF, stolen cookie, account compromise | Signed double-submit CSRF, HttpOnly Strict session cookie, origin restrictions, encrypted TOTP, session revocation | Pen test, production email/identity provider, KMS and incident plan |
| Age verification provider | Replay or reroute a valid callback to another account | Signed timestamp, event ID replay ledger, optional ten-minute hashed transaction challenge binding, revocation events accepted without fresh challenge | Actual approved vendor contract + payload adapter and independent bypass review |
| Media entitlement / CDN | Direct asset URL, stale cache, forged cookie, over-broad policy | Private OAC bucket template, per-upload signed-cookie paths, short TTL, approval/evidence/receipt checks, holds, invalidation outbox | Real TLS, domain, AWS signed/unsigned tests, key rotation and origin purge procedures |
| Uploader-controlled video | Parser exploit, malware, oversized upload, worker exhaustion | Size/duration/codec limits, isolated worker example, clamscan fail-closed hook, FFmpeg timeout, private quarantine | Sandboxed transcoding on real infra, current malware signatures, input fuzzing and resource quotas |
| Content rights | Expired/revoked license, unauthenticated performer | Approval references, license-review dates, case tracking, human-reviewed holds and appeals, no auto republish | Authentic documentation and consent verification for every participant and license |
| Database and private files | Exfiltration, SQLite corruption, backup leak | Strict private directory model, encrypted local backup and sample restore, checksum verification, limited API | RDS/PG production transactions, IAM/KMS rotation, S3 retention/restore and privacy audits |
| Admin and moderation | Privilege escalation, malicious insider, rushed republish | Admin-only endpoints, optional mandatory MFA, audit entries, active holds, strong notes | Two-person review for critical actions, professional moderation SOP and legal oversight |
| Deployment and DNS | Misconfigured TLS, open ports, unwanted public distribution | Private gateway example, explicit external acceptance script, public-content startup blocker | AWS account owner action, domain registration, provider review and independent security sign-off |

**Non-goals:** This source does not independently confirm adulthood, consent, content ownership, jurisdictional legality, AWS policy approval, or real platform security. The release remains a private non-explicit demonstration.
