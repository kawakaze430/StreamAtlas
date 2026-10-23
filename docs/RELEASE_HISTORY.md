- **v0.28.0 (Checkpoint 28):** Private CDN signing/geo hardening, cloud draft guardrails, SBOM, SLO/cost/DR evaluation; 19 new tests. Cloud and external approvals remain blocked.
- v0.25.0 (Checkpoint 25): Search/creator workspace prototypes, original roadmap status matrix, 23 new integration tests, private SEO policy and synthetic Chromium UI checks. No public-launch acceptance.
## Checkpoint 20 — private access, rights lifecycle, operations

Delivered receipt-gated browsing and uploaded media, one-time signed-provider challenge binding, optional fail-closed antivirus, license review expiration/revocation, emergency CDN invalidation outbox, private domain/gateway smoke, and new metrics/alerts. 127 Node tests and offline Chromium browser audit pass; live provider and cloud cutovers remain pending.

# StreamAtlas cumulative release history

**This archive is the only project ZIP needed to run the latest code.** It contains the incremental source outcome of Checkpoints 01–13. Older checkpoint ZIPs were snapshots, not build dependencies.

| Checkpoint | Added / preserved |
|---|---|
| 01 | Homepage and directory navigation, categories, performers, sites, networks, channels, search, seeded 72 synthetic video records, accounts, libraries, comments and basic admin. |
| 02 | Authorized upload sessions with chunked/resumable upload, FFmpeg processing, thumbnails, admin review. |
| 03 | Richer playback, chapters, playlists and creator/account management. |
| 04–05 | Background worker, HLS renditions, protected media, caption authoring and review reference records. |
| 06 | Privacy controls, saved collections, search filters, recommendations and SQLite backup integrity. |
| 07–09 | Optional hls.js adapter, identity recovery & MFA, worker lease, encrypted offline backup, initial PostgreSQL schemas, catalog export and Java starter. |
| 10–13 | Readiness check, deployable private AWS demo Compose/Caddy setup, environment configuration validation, PostgreSQL+Spring contract CI workflows, optional KMS/S3 backup operator path and comprehensive domain/deployment runbook. |

Non-explicit synthetic media only. No real content redistribution rights are implied. Always use fresh backups and test upgrades with disposable copies before deploying changes.

| 21–22 | Reproducible QA foundations, offline Chromium and synthetic media playback improvements, demo captions, preview frames. |
| 23 | Private Watch Queue, reorderable playlists, per-channel notifications, Continue Watching, queue-priority autoplay and additional tests. |
