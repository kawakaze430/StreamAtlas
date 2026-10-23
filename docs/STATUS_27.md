# StreamAtlas Checkpoint 27 — 15 original roadmap tasks (F01–F10, G01–G05)

**All 15 were reviewed. None is fully production-accepted.** This release adds offline migration/approval tooling and a CI recipe; it does not imply a successful PostgreSQL deployment or cloud access. LOCAL = tested in Node with synthetic/disposable fixtures; CI-PENDING = defined workflow not run here; BLOCKED = requires external approvals/resources.

| Task | New evidence in v0.27.0 | Full acceptance status |
|---|---|---|
| F01 PostgreSQL 16+ disposable migration | Transactional ordered runner with SHA-256 ledger, local-only database-name/host guards, PostgreSQL 16 GitHub Actions service definition | **CI-PENDING**: no `psql`/PostgreSQL installed locally; 13 SQL files not executed against a server in this run |
| F02 constraints/FKs/audit/rollback | Draft migration 013 adds nonnegative checks, FK indexes, append-only audit triggers; manual reversible DDL for 013 | **PARTIAL**: SQL static checks only; triggers not an external immutable audit, data constraints not validated on live rows |
| F03 catalog import/parity | SHA-256, duplicate primary key, missing FK and invalid counter detection before generating catalog import; static 56/56 table+column coverage | **PARTIAL**: no live PostgreSQL import, FK check, row-by-row parity or real data |
| F04 secure private accounts import | AES-256-GCM/scrypt encrypted read-only SQLite snapshot with explicit approval, 0600 mode and tamper/wrong-key tests | **PARTIAL**: this is a local rehearsal artifact, not a secure Postgres loader; MFA/session migration, key custody and access review remain |
| F05 concurrency/consistency/performance | Disposable-only 8-client PostgreSQL concurrency/idempotency smoke defined and included in CI | **CI-PENDING**: no local PG execution; no representative scale/transaction-isolation benchmark |
| F06 Spring Boot full modules | Read-only catalog hardened to bind loopback, omit `mediaUrl`, deny held uploads and uploads lacking current local license review; Maven compilation CI job | **PARTIAL**: Spring auth, library, upload, moderation and playback eligibility modules not implemented; Maven unavailable locally |
| F07 Node-vs-Spring API parity | Static route inventory compares 97 Node OpenAPI operations with 7 Spring routes; explicitly reports 0 matching paths and no denial parity | **BLOCKED**: behavioral/authorization contract parity not achieved |
| F08 dual-read/cutover/rollback | Fail-closed preflight report with ten gates, no traffic switch; manual cutover runbook | **BLOCKED**: no shadow mode, checkpointed cutover or live rollback drill |
| F09 managed database/PITR/restore | Manual backup, PITR and restore acceptance checklist | **BLOCKED**: no managed DB, cloud account, encrypted restore or provider signoff |
| F10 Next.js consideration | Decision record retains existing frontend until API parity and performance evidence exist | **DECISION RECORDED**: migration deliberately deferred, not a prerequisite or completed Next.js migration |
| G01 domain/provider/account/billing | Structured evidence template for four mandatory approvals | **BLOCKED**: no domain ownership/provider/billing authorization obtained or verified |
| G02 IAM/OIDC/secrets/KMS/budgets | Scoped role/cost-control design and documentary evidence checks | **BLOCKED**: no IAM/KMS/budget resources configured or tested |
| G03 private HTTPS synthetic staging | HTTPS/password/synthetic-only test evidence gates added | **BLOCKED**: no approved remote staging or HTTPS acceptance test |
| G04 DNS/ACM/redirects | DNS ownership, certificate and redirect acceptance evidence gates | **BLOCKED**: no DNS/certificate changes made |
| G05 private originals/renditions buckets | Terraform draft separates private originals from private CloudFront rendition bucket, with public-access blocks, versioning, SSE-S3 and multipart abort | **PARTIAL/BLOCKED**: Terraform CLI not available; not validated/applied; no S3 policy denial or encryption acceptance test |

## Exact technical limitations

- Local `node --test` exercises code and disposable SQLite, **not** PostgreSQL SQL execution, Spring runtime or real AWS.
- Static 56/56 table/column-name parity does **not** prove matching data types, constraints, indexes, semantics, timestamps or foreign keys on PostgreSQL.
- Private encrypted snapshots may contain personal information and secrets: never include them in archives, public paths, logs or source control. This prototype export is limited to 64 MiB and does not replace a reviewed production migration or backup system.
- Source Terraform may incur costs if independently applied; no infrastructure was created or modified here.
- No public adult-content launch, independent age/consent/rights/territory certification, provider acceptance or legal authorization has been obtained.
