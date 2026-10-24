> **Checkpoint 45:** guarded PostgreSQL catalog import, CDN invalidation confirmation, production license/MFA gates, and explicit 62-partial acceptance matrix. See `docs/RELEASE_45.md`. Public launch remains blocked.

# StreamAtlas v0.43.0 — Current cumulative private prototype

**New in Checkpoint 43:** a guarded offline-by-default, private-only S3 staging tool with per-object SHA-256/KMS/length verification and never-overwrite-on-mismatch behavior, plus mock-AWS regression tests. Read [`docs/S3_STAGING_43.md`](docs/S3_STAGING_43.md) and [`AUDIT_AND_HANDOFF/PORTABLE_HANDOFF_43/START_HERE.md`](AUDIT_AND_HANDOFF/PORTABLE_HANDOFF_43/START_HERE.md). No AWS calls or spending have been performed; public release remains blocked by independent safety, rights, age, jurisdiction, provider and security reviews.

---

# StreamAtlas v0.42.0 — Current cumulative private prototype

Checkpoint 42 makes private synthetic-media export **complete and dependency-verified** for future S3 migration. It stages all referenced HLS variants/segments, captions, previews and renditions with SHA-256 manifest v2. See [`docs/MEDIA_EXPORT_42.md`](docs/MEDIA_EXPORT_42.md) and [`AUDIT_AND_HANDOFF/PORTABLE_HANDOFF_42/START_HERE.md`](AUDIT_AND_HANDOFF/PORTABLE_HANDOFF_42/START_HERE.md). The primary runtime remains Node.js/SQLite; managed-cloud, browser/device, and independent rights/age/legal/security acceptance are separate, still-unfinished gates. The earlier release history below is preserved for reference.

---

# StreamAtlas v0.38.0 — Cumulative Private Synthetic-Media Prototype (Checkpoints 01–38)

**Current:** Checkpoint 38 adds byte-identical resumable chunk retry, safe recovery when a file write completed before SQLite progress commit, and 11 reviewed dynamic upload API contracts (184 operations total). See [Checkpoint 38 release notes](docs/RELEASE_38.md), [117-task tracker](AUDIT_AND_HANDOFF/UPDATED_117_TASK_STATUS_38.csv), and [minimum Codex/GitHub Cloud test plan](AUDIT_AND_HANDOFF/PORTABLE_HANDOFF_38/03_CODEX_CLOUD_ONE_SHOT.md). This is a **private synthetic-media** prototype and does not permit a public adult-content launch.

---

# StreamAtlas v0.36.0 — Cumulative Local Development Prototype (Checkpoints 01–36)

New in Checkpoint 36: shared active-hold filtering across saved and discoverable videos, private opt-in playback trend analytics with five-sample suppression, owner-only audited creator collaborator role edits, and 16 additional reviewed OpenAPI operations. Tests and roadmap evidence: [`docs/RELEASE_36.md`](docs/RELEASE_36.md), [`docs/STATUS_36.md`](docs/STATUS_36.md), and [`AUDIT_AND_HANDOFF/UPDATED_117_TASK_ROADMAP_36.md`](AUDIT_AND_HANDOFF/UPDATED_117_TASK_ROADMAP_36.md).

**Run:** `npm test && npm start`, then visit `http://localhost:3000`. Demo uses generated, synthetic non-explicit media. Real AWS, PostgreSQL, Spring Boot, legal/provider approvals, DRM, device tests, and public distribution are **not** implemented/approved. Do not use the demo for real people or real protected content.

---

# StreamAtlas v0.34.0 — Operational QA and Creator/Moderation Controls

Checkpoint 34 advances 20 partially implemented roadmap tasks (without falsely closing them) through eight protected operational API routes, working Admin/Studio UI summaries, tested priority escalation, and an updated 117-task ledger. See `docs/RELEASE_34.md`, `docs/STATUS_34.md`, and `AUDIT_AND_HANDOFF/UPDATED_117_TASK_ROADMAP_34.md`. Public adult-content launch is still blocked.

# StreamAtlas v0.33.0 — Cumulative Synthetic-Media Prototype

New in Checkpoint 33: reviewed tag taxonomy, source-aware video quality ladder, and privacy-safe offline cold-start recommendation evaluation. See `docs/RELEASE_33.md` and `AUDIT_AND_HANDOFF/UPDATED_117_TASK_ROADMAP_33.md`. Real cloud/provider/legal approval remains outstanding.

# StreamAtlas v0.30.0 — Cumulative Synthetic-Media Prototype

This includes Checkpoints 01–30. The live runtime remains Node.js/SQLite.

New in this release: ranked highlighted autocomplete, signed cursor pagination, multi-entity search facets with search UI selectors, safety-hold exclusions, and measurable offline operational SLO objectives. **See `docs/STATUS_30.md` before treating any feature as complete.**

# StreamAtlas 0.29.0 — Audited Engineering Checkpoint

This cumulative, locally runnable source was upgraded from the user's uploaded audited Checkpoint 28 archive. It includes all original features and an opt-in QoE diagnostic/creator summary, caption size and contrast controls, safe PWA offline shell, optimized responsive thumbnails and better private-preview asset gating.

**Not production launch approved.** The Node/SQLite demo remains primary; real age/rights verification, production AWS/CDN, Spring Boot/PostgreSQL cutover and independent security/legal approvals remain open.

Latest tasks and evidence: `docs/STATUS_29.md`, `docs/RELEASE_29.md`, `AUDIT_AND_HANDOFF/UPDATED_117_TASK_ROADMAP_29.md` (folder included in the cumulative ZIP).

Run `npm test`, `npm start`, and optionally `python scripts/offline-browser-audit.py`. All video content in the archive is synthetic.

---

> **Checkpoint 28 (v0.28.0):** Security/edge preparation for G06–G15 and J01–J05: local signed-cookie/geo negative tests, private CDN/queue/WAF/ECS drafts, SBOM, verified-admin-email option, SLO/cost/DR calculators and independent-assessment gates. **No AWS, legal, provider, security or production signoff was obtained.** See `docs/RELEASE_28.md` and `docs/STATUS_28.md`.

> **Checkpoint 27 (v0.27.0):** Disposable PostgreSQL migration tooling, catalog/schema integrity checks, encrypted private snapshot rehearsal, fail-closed cutover gates and AWS approval/IaC drafts. Node/SQLite remains the only verified running backend; PostgreSQL and AWS were not executed locally. Read `docs/RELEASE_27.md` and `docs/STATUS_27.md`.

> **Checkpoint 26 (v0.26.0):** Creator collaboration, processing/review safeguards, and compliance coordination are added on top of Checkpoint 25. The original 117-task roadmap remains in `docs/streamatlas-master-development-roadmap.md`; E01–E10/I01–I05 remain partial or blocked as documented in `docs/STATUS_26.md`. Node/SQLite is still the running backend; PostgreSQL, Spring, OpenSearch, cloud deployment and independent legal/age/consent/rights verification remain unfinished. See `docs/RELEASE_26.md`.

# StreamAtlas v0.24.0 — Member Experience (Checkpoint 24)

**Newest cumulative checkpoint**: 10 C-series roadmap tasks extended in this release. See [RELEASE_24.md](docs/RELEASE_24.md), [STATUS_24.md](docs/STATUS_24.md), and [CONTINUATION_24.md](docs/CONTINUATION_24.md). All video test media is synthetic; public operation remains blocked until independently verified requirements are met.

# StreamAtlas v0.23.0 — Checkpoint 23 member experience

**New:** private ordered Watch Queue, playlist reorder controls, Continue Watching, per-channel notification settings, queue-first autoplay, additive SQLite schema and PostgreSQL parity migration 009. [Release report](docs/RELEASE_23.md) · [Status](docs/STATUS_23.md).

**Still private synthetic-media development only.** No public adult-content hosting certification, AWS deployment, or Spring/PostgreSQL cutover.

# StreamAtlas v0.22.0 — Checkpoint 22 Player Upgrade

**New:** Verified local HLS demonstration profiles, storyboards, captions, accessible timeline controls, dual MP4 quality, playback telemetry, mobile double-tap seek and opt-in Up Next countdown. See [Checkpoint 22 Player Report](docs/PLAYER_22.md), [Status](docs/STATUS_22.md), and [Continuation](docs/CONTINUATION_22.md).

**Public adult-content deployment remains disabled.** All example media is generated non-explicit content. Cross-browser HLS/ABR and independent legal/provider reviews remain pending.

# StreamAtlas v0.21.0 — Checkpoint 21 QA foundation

This is the **complete cumulative prototype** with A01–A08 QA engineering additions. The app still runs on **Node.js/SQLite** and remains **private synthetic-media development only**.

**Quick QA:** `npm test` · `npm run qa:release:verify` · `npm run qa:security` · `npm run qa:browser:offline`.
**Network tests (strict):** `npm run qa:browser:network` after installing Playwright and Chromium/Firefox/WebKit. This sandbox blocks browser navigation to localhost; do not report network tests green here.
**Documentation:** [Checkpoint 21 acceptance matrix](docs/STATUS_21.md), [Checkpoint 21 release](docs/RELEASE_21.md), [Journey parity](docs/JOURNEYS_AND_PARITY_21.md), [QA & accessibility](docs/QA_AND_ACCESSIBILITY_21.md), [architecture decisions](docs/ARCHITECTURE_DECISIONS_21.md), [upgrade/rollback](docs/UPGRADE_ROLLBACK_21.md).

---

# StreamAtlas v0.20.0 — Cumulative Development Source (Checkpoints 01–20)


## Checkpoint 20: private access controls and operational readiness

**Not a public-content service.** This update retains the original Node/SQLite runtime and all previous functionality, and adds optional private receipt-gated browsing, transaction-bound signed verification callbacks, owner-only CDN cookie signing for approved uploaded assets, antivirus-before-FFmpeg processing, internal license expiry and revocation workflows, durable CDN invalidation requests, private deployment checks, and operational gauges/alert templates. The original PostgreSQL/Spring Boot cutover is **not completed**.

For exact tests and limitations, see [Release 20](docs/RELEASE_20.md), [Production acceptance matrix](docs/ACCEPTANCE_MATRIX_20.md), [Operator incident guide](docs/OPERATOR_RUNBOOK_20.md) and [Preliminary threat model](docs/SECURITY_THREAT_MODEL_20.md).

New commands: `npm run license:expire` (requires `SA_LICENSE_EXPIRY_JOB_ACK=YES`), `npm run cdn:invalidate` (requires AWS IAM permissions and `SA_AWS_INVALIDATION_ACK=YES`), and `npm run verify:private-deployment` (requires operator-owned HTTPS host and explicit acknowledgment). All are opt-in and unavailable/blocked without necessary configuration.

The source contains **no actual licenses, participant identity documents, approved age-vendor contract, AWS credentials, registered domain or live cloud environment**. Do not mistake locally generated receipt signatures or internal evidence references for certified compliance.

**Runnable only as a local/private synthetic-media prototype.** All project files from the prior checkpoints are incorporated; the earlier ZIPs are not needed. This is **not** a production-ready adult-content service, and no AWS domain, CDN or backend cutover has been completed.

**New in checkpoint 19:** formal legal/consent/age/privacy case management, uploader appeals with audit events, cryptographic verification-webhook adapter, CloudFront private HLS signed-cookie helper and IaC template, authenticated metrics, real Chromium sample MP4 playback assertion, automatic encrypted backup/restore drill, safe bounded load smoke, PostgreSQL migration 005 and fail-closed public-release startup flag.  See [Release 19](docs/RELEASE_19.md), [Production Gates](docs/PRODUCTION_GATES.md), [Security Report](docs/SECURITY_CHECKPOINT19.md), and [AWS Steps](docs/AWS_EXECUTION.md).

## Quick start and new local verification commands

```bash
npm run doctor
npm test
npm start                # browse to http://localhost:3000
npm run audit:offline-browser   # requires Playwright + Chromium
npm run recovery:drill   # synthetic encrypted backup + media restore
npm run load:local -- http://127.0.0.1:3000 180 15
npm run launch:preflight # public-launch gate intentionally BLOCKED
```

`GET /api/internal/metrics` requires a `Bearer` token matching a strong
`SA_METRICS_TOKEN` (>=32 chars). The signed external verification webhook
requires `SA_VERIFICATION_WEBHOOK_SECRET` (>=32 chars); neither setting proves
regulatory compliance. Both are optional and off by default. The CloudFront
cookie signer is intentionally NOT exposed as an unrestricted playback API.



# Earlier milestone: Checkpoints 01–18 (v0.18.0)


## Checkpoints 14–18 (historical): verified outcomes and open gates

**At checkpoint 18, 96/96 automated Node tests passed**. The Python Playwright offline Chromium harness rendered real frontend JS/CSS connected to a disposable local Node backend at **desktop, tablet and mobile** widths (no horizontal overflow). It found and fixed a Favorites navigation bug. This is an *offline DOM/browser audit*, not a successful network-navigation E2E run.

New additions: admin operations dashboard and enhanced readiness; approved processed media staging with SHA-256 verification and optional manual S3 sync command; local PostgreSQL 16 disposable Compose lab and 004 migration; auditable rights/safety emergency holds that block republishing; FFmpeg file/pipe protocol allowlist; a fail-closed public-launch inventory; an optional manual GitHub Actions browser workflow.

**NOT completed:** live Spring Boot/PostgreSQL cutover, actual AWS deployment/domain purchase, production S3/CDN playback, hls.js bundle (npm unavailable locally), effective viewer age verification, authentic performer consent/rights verification, full graphical network navigation/browser testing, security/legal/provider audit. See `docs/ROADMAP_14_18.md` and `docs/STATUS.md`.

### New local commands

```bash
npm test
npm run audit:offline-browser      # Python Playwright+Chromium; screenshots are local only
npm run media:prepare-export -- /absolute/new/private/stage
npm run media:verify-export -- /absolute/new/private/stage
npm run launch:preflight            # intentionally returns exit 1 for unresolved public launch
```

To stage approved processed media to a private S3 prefix, read `docs/ROADMAP_14_18.md` and `scripts/aws-stage-media.sh`. It requires AWS CLI + an operator-approved bucket and SSE-KMS key; no AWS action is performed automatically. PostgreSQL lab: `deployment/postgresql/README.md`.

---


> **One consolidated ZIP:** This checkpoint contains the cumulative source from all earlier releases. You do **not** need to combine Checkpoint 01, 02, 03, 05, 06 and 09 archives yourself. No runtime accounts, databases, uploaded media or secrets are shipped.

## Newly delivered for Checkpoints 10–13

- `deployment/aws/compose.yaml`, `Dockerfile`, `Caddyfile` — a **password-protected private demo** on a single Ubuntu VM using Docker, Caddy-managed HTTPS, separate non-networked FFmpeg worker and persistent local data.
- `deployment/aws/terraform/` — **optional, not executed** Terraform for a Lightsail VM, static IP, restrictive SSH rules and an optional existing Route 53 DNS zone record. No domain is purchased automatically.
- `deployment/aws/README.md` — detailed AWS, DNS/custom-domain, TLS, credentials, data persistence, upgrade and restore runbook.
- `deployment/aws/offsite-backup.sh` — optional operator-run backup to S3 with client-side AES-256-GCM encryption and S3 SSE-KMS; **no AWS execution claimed**.
- `deployment/aws/validate-env.mjs` — preflight config validator; use `npm run deploy:check` after creating `deployment/aws/.env.runtime`.
- `.github/workflows/verify.yml` — CI jobs for Node, synthetic media tests, Docker build, pinned hls.js retrieval and PostgreSQL + Spring Boot starter build/contract. **CI not run in this container**.
- `scripts/ci-postgres-smoke.sh` — disposable PostgreSQL catalog migration acceptance script.
- `/api/ready` — database readiness endpoint for the container health check.
- New automated regression tests for deployment configuration and readiness.

### Important launch status

This repository remains a **working local Node.js/SQLite prototype** with non-explicit synthetic media. Spring Boot/PostgreSQL are NOT cut over, browser navigation is blocked in this environment, and no AWS account or domain is connected. The AWS package is for a **private, password-gated synthetic demonstration only**, NOT public adult-content hosting. Actual content distribution requires verified law/provider/age/rights/consent/moderation readiness and further security work.

### Quick commands

```bash
npm run doctor
npm test
npm start                  # http://localhost:3000
```

For AWS preparation, read `deployment/aws/README.md`, **then** `deployment/aws/terraform/README.md` if you want infrastructure-as-code. Never skip the manual legal/provider/security gates.

### How to get a domain

1. Search availability and current registration/renewal price on Amazon Route 53 **Registered domains → Register domains** or a registrar of your choice.
2. Buy a domain with your registrar account (this is a separate paid action; credits generally cannot fund Route 53 domain registration).
3. Create `preview.yourdomain.com` as a DNS **A** record pointing to your Lightsail static IPv4 address; if using Route 53, use the hosted zone. The optional Terraform module can create a record **only for an existing zone**.
4. Configure `deployment/aws/.env.runtime` for that **exact hostname** and its HTTPS origin, start the private Compose gateway, and verify a working TLS certificate.
5. Keep the gateway password in place. Do not publicly distribute real adult content until all required checks pass.

### Detailed progress

- `docs/ROADMAP_10_13.md` — individually itemized checkpoints, verified work, unverified additions and blocking tasks.
- `docs/STATUS.md` — precise current state and remaining launch work.
- `docs/RELEASE_HISTORY.md` — cumulative features from every checkpoint.

---

A runnable, **local-only**, original video discovery and streaming prototype inspired by rich video directories and YouTube-style viewing workflows. **All shipped videos and imagery are synthetic and non-explicit.** This release does not provide legal authorization to distribute adult content. It does not verify adult participant age, consent, identity or licensing, and it is not appropriate for a public adult-content deployment.

## Start the runnable application

**Requirements:** Node.js 22.13+, FFmpeg and FFprobe for uploads/media tests. No `npm install` required for the main site.

```sh
npm run doctor
npm start
# Open http://localhost:3000
npm test
```

The main application is still **Node.js + SQLite + vanilla JavaScript/CSS**. It preserves the original complete browsing/viewer/admin experience and 72 synthetic video records. All local users, session cookies, and uploaded binaries are stored only on your development machine in `data/` and are not shipped in this archive.

### Admin account

```sh
# Set SA_ADMIN_EMAIL and SA_ADMIN_PASSWORD environment variables first.
npm run admin:create
```

To test creator uploads, apply through Creator Studio, approve using the locally provisioned admin, and upload a **non-explicit test video**. Media remains private until review.

## Delivered in this combined release

### Checkpoint 06 — preserved

- Directory home, Latest/Top Rated/Most Viewed, Categories A–Z, Pornstars, Porn Sites, Networks, Channels and advanced search.
- Player with MP4 qualities, caption tracks, chapters, speed, PiP, theater, autoplay, saved history, subscriptions and rule-based recommendations.
- Creator Studio: resumable uploads with FFprobe/FFmpeg processing, two HLS renditions, private moderated publication, comments/reports, admin audit records.
- Account sessions/preferences, SQLite backups, CSRF defense and abuse throttling.

### Checkpoint 07 — playback/browser foundation

- New optional adaptive HLS.js client adapter with safe MP4/native HLS fallback; quality switching attempts to preserve seek position/speed and recovers network/media errors where supported.
- Pinned `hls.js@1.7.3` local-vendor script; **binary NOT included** because npm registry access failed. See `docs/HLS.md`.
- Existing Playwright desktop/mobile browser-smoke script retained. Chromium process timed out in this environment; **graphical E2E not verified**.

### Checkpoint 08 — identity, worker, security

- Single-use SHA256-hashed expiring email-verification and password-recovery tokens, server-side token consumption and reset-session revocation.
- Development-only private mail outbox controlled by `SA_DEV_MAIL_OUTBOX=1`. No production provider configured; related endpoints return 503 in production.
- Encrypted AES-256-GCM authenticator/TOTP secret storage (`SA_MFA_KEY` required), MFA enrollment/confirmation/login/disable, TOTP step replay protection, optional admin MFA enforcement (automatically required on production admin endpoints).
- Account closure for non-creator non-admin accounts: revoke sessions, anonymize account, clear saved collections. Creator accounts with uploaded media are excluded until reviewed. **This is not a legal full-erasure workflow.**
- Singleton SQLite worker lease with heartbeat/expiry to limit double ownership, plus an **untested** non-root/network-disabled/container worker deployment starter (`deployment/worker`).
- Production server startup checks for a stable CSRF secret and configured HTTPS origin; not a substitute for penetration testing and deployment compliance.

### Checkpoint 09 — migration foundation, not cutover

- Three PostgreSQL 15+ migration SQL files for catalog, accounts, and creator/moderation operations.
- Privacy-limited catalog export to SHA-256-verified JSONL (`db:export-catalog`) and SQL import generator (`db:build-pg-import`). Tested with 72 sample videos, links and category data; PostgreSQL execution remains untested.
- Initial **read-only** Spring Boot/PostgreSQL catalog source (`backend-spring/`) with videos and directory endpoints. This source has not been built here (Maven and live PostgreSQL unavailable), and it does **not** replace the Node application's identity, uploads, player, or moderation APIs.
- Existing 87 baseline Node tests were preserved; the expanded release adds deployment/readiness tests. Full local end-to-end browser tests, Docker, Maven, and PostgreSQL validation remain outstanding.

## Configuring development account security

The application reads environment variables; it does **not** load `.env` automatically. Use your shell's environment configuration (or a trusted runner).

```sh
# Generate separate random values for secrets using Node:
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Set `SA_MFA_KEY` to a persistent **64-character hexadecimal** value before MFA enrollment. Losing it makes existing authenticator entries undecryptable. For local email testing, set `SA_DEV_MAIL_OUTBOX=1` and inspect `data/private/mail-outbox/`; messages are intentionally not actually sent to email addresses. `SA_CSRF_SECRET` should also be a stable strong secret when using non-test servers.

For real email delivery, integrate a verified email sender and message abuse controls; production issuance currently refuses to simulate delivery. Do not expose local outbox files or reset tokens over HTTP.

## NEW: encrypted offline database + private-media backups

Unlike the Checkpoint 06 DB-only backup, this release can snapshot the SQLite database **and** local `data/private/uploads` and `data/private/processed` media. Backups encrypt every file and the manifest with AES-256-GCM and verify integrity upon restore. **Stop the API and worker first:** the script enforces explicit `SA_BACKUP_OFFLINE=1` acknowledgement but cannot check for writers running on another host.

```sh
# Create a separate strong 32-byte key, store it securely outside this repository.
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
# Set SA_BACKUP_KEY=<64 hex chars> and SA_BACKUP_OFFLINE=1 in your shell, then:
npm run secure:backup -- /absolute/private/backups
npm run secure:restore -- /absolute/private/backups/streamatlas-secure-... /absolute/new-restore-directory
```

The restore refuses to overwrite an existing directory. Point `DB_PATH` at `<restore>/database.sqlite` and `PRIVATE_PATH` at `<restore>/private` only after verifying that the services are stopped and the restored data is correct. Do **not** lose or commit the encryption key. These tools passed offline roundtrip and tamper tests but have not been audited as a production disaster-recovery system.

## Export a catalog fixture for PostgreSQL

```sh
npm run db:export-catalog -- /path/to/private/export
npm run db:build-pg-import -- /path/to/private/export /path/to/private/catalog-import.pg.sql
```

See `docs/POSTGRES_MIGRATION.md` before any database operations. This is catalog-only: user accounts, password hashes, MFA, session tokens, private media and consent references are intentionally excluded.

## Worker sandbox starter

The main server launches a supervised worker by default. To use the **separate local Docker Compose** example, run the API with `SA_DISABLE_WORKER=1`, then build one worker with `deployment/worker/compose.yaml` and ensure filesystem permissions match. Docker build/run were not available here. See `deployment/worker/README.md`.

## Full documentation

- `docs/STATUS.md` — exact completed/incomplete checkpoint status and detailed remaining work.
- `docs/CONTINUATION.md` — recommended Checkpoint 10+ next sequence.
- `docs/POSTGRES_MIGRATION.md` — catalog migration/export/import plan.
- `docs/HLS.md` — pinned optional HLS vendor setup and limitations.
- `docs/SECURITY.md` — historical and current security limitations.
- `docs/API.md` / `docs/ARCHITECTURE.md` — original Node API and prototype architecture.

## Launch restrictions

**Do not publicly deploy this repository for adult-content distribution.** It lacks jurisdiction-aware lawful-access decisions, effective viewer age assurance where required, authentic participant age/consent evidence verification, licensing workflows, staffed takedown/appeal operations, legally reviewed retention, network/provider approvals, a completed security audit and tested production infrastructure. Synthetic sample content and development declarations are not a substitute for those requirements.


## Checkpoint 32 continuation
See `docs/RELEASE_31.md` and `AUDIT_AND_HANDOFF/CODEX_USER_HANDOFF_31.md` for audited delivery and external blockers. Public-content deployment remains disabled.


## Checkpoint 32 additions

New read-only local endpoints for short synthetic clips, canonical/noindex metadata, related categories, restricted creator metadata suggestions, private sync/follow summaries, creator QoE aggregates, offline recommender experiments, localized nav labels and compliance/launch guidance. Run `npm run qa:private-index`, `npm run qa:recs:offline`, or `npm run media:demo-storyboard -- sample-1 /tmp/sa-storyboard` for demonstrations. These are not production/legal verification. See `docs/RELEASE_32.md` and `AUDIT_AND_HANDOFF/UPDATED_117_TASK_STATUS_32.csv`.

## Checkpoint 37 — API contract inventory hardening

Private cumulative v0.37.0 release: add 32 literal operations to generated OpenAPI (141 → 173); strict CI gate `npm run qa:contracts:strict`; synthetic authorization, CSRF, compliance and fail-closed adapter tests. Literal discovery now finds 0 undocumented operations among its 123 static detections; this does **not** cover regex/dynamic routes. See `docs/RELEASE_37.md` and `AUDIT_AND_HANDOFF/PORTABLE_HANDOFF_37/` for handoff and limitations. No public cloud/provider/age/rights approval exists.

### Checkpoint 44: previously unstarted roadmap foundations (not production features)

B01/B05/B16/D09/F07/F08/G15/J12/K02/K07/K08 now have locally testable **partial** scaffolding. New modules under `src/roadmap44-*.js` cover SHA-pinned HLS artifact license checking, deterministic ABR/loss simulations, native casting capability gates, explicitly licensed offline fixture encryption, search migration thresholds, Node/Spring comparison and safe shadow decisions, DR and chaos decision records, human-reviewed model proposals, and proposed creator earnings with no actual financial transfers. These tools **do not expose new public endpoints or permit adult-content public launch**.

For machine-readable conservative results, run `npm run qa:roadmap44`; for targeted regression run `node --test tests/roadmap44-eleven-gaps.test.js`. The 117-row source of truth is `AUDIT_AND_HANDOFF/UPDATED_117_TASK_STATUS_44.csv`; external acceptance remains open for each of these 11 tasks.
