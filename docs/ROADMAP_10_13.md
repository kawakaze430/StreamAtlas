# Checkpoints 10–13: implementation record, acceptance criteria, and blockers

Status terminology: **DONE (locally tested)**, **IMPLEMENTED (not executed externally)**, **PARTIAL**, or **BLOCKED / not started**. Source code does not imply a completed public launch.

## Checkpoint 10: playback/browser compatibility

| Task | Status | Proof / next action |
|---|---|---|
| Preserve existing MP4 native player, HLS adapter, captions and chapters | DONE | Prior automated tests run along with Checkpoint 13 suite |
| Vendor pinned hls.js 1.7.3 | BLOCKED | npm registry DNS resolution `EAI_AGAIN`; `npm run vendor:hls` can be executed on a networked machine. Never inject unreviewed remote CDN JS into the player. |
| Browser E2E on desktop/mobile | BLOCKED | Python Playwright could launch Chromium, but page navigation to both `data:` and local `127.0.0.1` returned `ERR_BLOCKED_BY_ADMINISTRATOR`. Use `npm run test:browser` on a machine without this restriction. |
| Browser test CI | PARTIAL | Prior optional smoke script exists, but Playwright browser running not CI-gated; add separate nightly browser job after verification. |

## Checkpoint 11: PostgreSQL & Spring Boot

| Task | Status | Proof / next action |
|---|---|---|
| Preserve PostgreSQL 15+ schemas and SHA-verified catalog migration scripts | DONE | Prior tests + fresh catalog export/import SQL generator tests |
| Disposable PostgreSQL migration exercise | IMPLEMENTED | `scripts/ci-postgres-smoke.sh` applies schemas/import and checks records in GitHub Actions; not executed on PostgreSQL locally (binary/server unavailable). |
| Spring Boot catalog-only build and read parity | IMPLEMENTED | GitHub Actions Maven/Java21+ PostgreSQL smoke job added; **not executed** in current environment. |
| Replace live Node/SQLite with PostgreSQL and full Spring Boot APIs | NOT STARTED | Need transactional identity, account tokens, moderation, signed media, upload lifecycle, data cutover and rollback. Running Node/SQLite application remains canonical. |

## Checkpoint 12: AWS demo infrastructure

| Task | Status | Proof / next action |
|---|---|---|
| Private deployment Dockerfile / Compose / Caddy gateway | IMPLEMENTED | Static/structural automated tests, configuration validator; no Docker daemon in current environment. |
| Private SSH/domain/HTTPS/operator runbook | DONE | `deployment/aws/README.md`; domain must be purchased by operator. |
| Secure persistent media and SQLite volume | IMPLEMENTED | Single-host named volume and separate worker. Does not provide multi-zone or distributed storage. |
| AWS account deployment / custom domain / paid registration | BLOCKED | No AWS account connection, registrar authorization or user-selected domain. |
| AWS production adult-content launch | BLOCKED | Legal, provider, identity/rights/consent, geo, and age assurance gates incomplete. |

## Checkpoint 13: backup, release, operational validation

| Task | Status | Proof / next action |
|---|---|---|
| API readiness endpoint | DONE | Node integration test exercises `/api/ready` database check |
| AWS preview env validator | DONE | Node tests reject bad URL, secret, hash and missing security flags |
| Offline AES-256-GCM app+media snapshot | DONE (prior) | Prior tests verify restore/tampering; added S3 push operator script (not run with AWS). |
| KMS-protected S3 offsite copy | IMPLEMENTED | `deployment/aws/offsite-backup.sh`; AWS CLI, bucket, IAM role and KMS permissions must be provisioned; no offsite restore drill performed. |
| Single consolidated source ZIP | DONE | Full latest code includes all prior features; no previous ZIPs or runtime DBs bundled. |
| Fresh archive test and app smoke | DONE | Results recorded in `docs/STATUS.md`. |

## Mandatory before internet-facing adult-content service

- Jurisdiction-by-jurisdiction written legal clearance, review AWS Acceptable Use Policy and each service-specific terms.
- Real effective viewer age assurance where legally required, securely stored participant age/consent records, licensing and content revocation/takedown flows.
- Trust and safety team on-call, appeal processes, rightsholder escalation, prompt reporting of illegal content and automated search/CDN cache invalidation.
- Third-party security audit, MFA on all privileged identities, verified email delivery, rate limits and malware scanning/worker sandbox assessment.
- Managed PostgreSQL, private cloud object storage, signed media delivery, a durable queue, monitoring, geo access control, production encryption/key rotation and restore drills.
- Full browser accessibility/mobile testing on actual hardware; regular load tests and latency/availability targets.

## Project reality check

This release **does not** claim Checkpoints 10–13 are all entirely complete. Significant infrastructure artifacts have been implemented and tested where tools permit, but PostgreSQL/Spring Boot runtime replacement, adaptive HLS confirmation, browser visual checks, public AWS deployment and legal launch remain unverified/not done. Honest handoff is preferable to unsafe launch instructions.
