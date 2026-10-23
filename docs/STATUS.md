# Latest status: StreamAtlas v0.20.0 — private synthetic-media prototype

Current acceptance evidence: **127/127 Node tests passing**, Chromium offline audit of desktop/tablet/mobile with a real synthetic MP4 playback assertion, encrypted SQLite/media synthetic restore, and a bounded local load smoke (180 requests, 0 failed). This is NOT a live public adult-content deployment.

New code: receipt-gated private catalog and media, signed provider challenge binding, approval/evidence-limited private CDN cookies, pre-FFmpeg antivirus hook, media-license expiry/revoke holds, CDN invalidation outbox/operator script, external preview audit script, additional metrics and example alert rules. **PostgreSQL and Spring Boot remain starters; AWS/domain, real providers and independent audits are not complete.** See `docs/RELEASE_20.md` and `docs/ACCEPTANCE_MATRIX_20.md`.

---

# StreamAtlas v0.19.0 — Implementation Status

## Current scope

**Working local backend: Node 22 + SQLite.** Non-explicit synthetic video examples only. Checkpoints 01–18 work remains preserved: catalogs, categories, performer/site/network/channel directories, full browsing UI, authentication, demo accounts, creator uploads, FFmpeg processing, captions, chapters, comments, favorites, playlists, subscriptions, moderation, notifications, recovery.

## Checkpoint 19 local results

- Full Node regression suite (includes formal cases, appeals, webhook signatures, CDN signature unit tests, metrics access, immutable public-release block, bounded localhost load & offline restore drill): see actual `npm test` output.
- Original `public/app.js` rendered at desktop/tablet/mobile through offline Chromium browser harness, with real synthetic MP4 decode and playback speed change. Formal complaint form submitted successfully. This is NOT networked browser streaming/E2E.
- Networked HLS client, iOS/Safari, live AWS object storage and CloudFront authorization remain **UNVERIFIED**.
- PostgreSQL migration 005 is included in the disposable lab and CI script but PostgreSQL/Maven/Docker/Terraform are **not installed in the current runtime**; no cutover or Terraform apply has taken place.
- Independent age assurance, participant adulthood verification, lawful content licenses, qualified human moderation, copyright notice/counter-notice procedures and hosting approvals remain **external blocking prerequisites**.
- Live domain registration, DNS, AWS deployment, actual offsite KMS/S3 restore drill and independent pentest remain **unfinished**.

## Priority next steps before external launch

1. Qualified jurisdiction/hosting/provider legal evaluation; written content rights and performer age/consent proof; approved effective viewer age assurance with audited end-to-end enforcement; independent trained moderation operations.
2. Obtain AWS/domain account and permissions. Test private synthetic demo behind TLS and credentials; monitor costs. Build and validate Docker, Terraform, CDN signed-cookie delivery and offsite restore/alerting.
3. Get PostgreSQL/Maven CI and real Spring modules running, transactional import / migration parity, session migration, write freeze, rollback, re-test all endpoints; Node/SQLite is still sole complete backend.
4. Fetch, review and pin hls.js; browser HLS/ABR with real network segments on Chrome/Firefox/Safari/mobile, accessibility, slow networks, revocation and cache invalidation.
5. Worker scanning/sandbox independent assessment, production email/MFA recovery, security testing, load tests at expected concurrency, incident response/on-call, privacy/retention/data deletion.

**Do not set `SA_PUBLIC_CONTENT_MODE=1` expecting a launch.** The current app aborts startup. `npm run launch:preflight` intentionally returns failure until future external checks and code changes are completed.
