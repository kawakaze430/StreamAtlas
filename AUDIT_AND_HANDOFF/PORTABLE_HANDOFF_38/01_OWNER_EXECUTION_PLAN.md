# Execution path: ChatGPT owns coding; Codex reserved for genuine runtime gaps

## Stage 0 — In this ZIP, ChatGPT/current container, complete or in progress

- E01 PARTIAL: immutable, byte-verified upload chunk replay and disk-ahead crash recovery. Tests include synthetic end-to-end HTTP upload and pure spool fault cases; no remote S3 ingestion claimed.
- A06 PARTIAL: 11 audited upload regex endpoints added to OpenAPI with correct binary request transport and typed success receipt. Other dynamic routes and schemas remain.
- Existing Node, FFmpeg, static PostgreSQL migration, Chromium offline and source/infra QA can run here; **do not spend Codex Cloud time repeating them**.

## Stage 1 — CI-first: external ephemeral verification (no production credentials)

Push the extracted, secret-free cumulative ZIP contents to a **private GitHub repository** once, then use existing `.github/workflows/postgres-disposable.yml` (real PostgreSQL 16 and Maven) and `.github/workflows/qa-checkpoint21.yml` (Node/Playwright Chromium/Firefox/WebKit and local dependency audits). Also review workflow `verify.yml` for Docker build and Terraform template validation. This is an available low-Codex-use path, but **GitHub-hosted execution has not been performed or verified here**. Avoid uploading `data/private`, `.env`, real footage, real-user data or provider credentials. If a workflow fails, preserve its logs rather than changing version/source without proof.

If hosted CI access is unavailable, use **one** Codex Cloud task with `03_CODEX_CLOUD_ONE_SHOT.md`: tests only for PostgreSQL 16/Maven/real Playwright and environment blockers. Do not redo local-only verification.

## Stage 2 — Agent-owned local engineering (next checkpoints)

- Dynamic route inventory: enumerate regex URL handlers, add OpenAPI schemas/negative-case permission tests and avoid claiming full coverage from literal matcher.
- E01/E02/E03: quotas, no-spoofing, chunk cancellation, lease recovery, worker crash/dead-letter replay, fail-closed malware/integrity processing. Cloud upload path remains separate.
- Search/recs: held/deleted entries must be absent in all signed cursors, exports, replay feeds and caches; benchmark synthetic load with latency evidence.
- Strengthen S3 multipart spec, signed CDN revocation and regional block templates without applying AWS resources.

## Stage 3 — Authorized PRIVATE AWS staging only (separate approval)

No resources created or purchased in this checkpoint. After owner grants authorization for a **non-explicit, synthetic-only** staging budget, use one region, small server capacity, storage encryption, private S3 buckets, CloudFront signed access, RDS/IAM least privilege, HTTPS/TLS, WAF, CloudWatch alarms and AWS Budgets. Confirm credits apply to selected services: promotional credits are not a hard spending cap. Require explicit approved spend ceiling, region and AWS account access mechanism. No production media, payment accounts or live adult-content traffic.

## Stage 4 — Controlled regional acceptance, then only if licensed and legally cleared

Independent testing: video rights/consent/participants, jurisdiction-specific lawful distribution, viewer age assurance, provider written acceptance, staffed moderation and incident/takedown procedures, independent penetration testing, real-device playback, backups/restores, load tests and signed revocation. Worldwide networking does NOT mean unrestricted worldwide release.

## Resource allocations (avoid unnecessary costs and laptop heat)

| Resource | Primary use | Do NOT use yet |
|---|---|---|
| ChatGPT/current container | Source code, QA tests, local SQLite, FFmpeg, Chromium offline, manifests, complete ZIPs | Production claims, real AWS or providers |
| GitHub Actions | Reproducible postgres16/Maven/Playwright/Docker/Terraform CI (if user enables repo) | Real credentials, explicit media, spend without consent |
| Codex Cloud (limited) | **Only** missing runtime validation or concise failing CI diagnosis | Feature rewrites, repeated npm tests, manual ZIP repackaging |
| Colab credits | Optional batch synthetic encode/load/recommendation benchmarking that outgrows this container | Basic unit tests or hosting a public video origin |
| Google Drive 5TB | Encrypted private checkpoint backups with verified hashes | Public CDN, rights-free video storage, embedding credentials |
| AWS promotional credit | Authorized single-region private staging, later, with budgets/alerts | Unapproved public rollout; assuming $200 guarantees zero bill |
| Azure promotional credit | Spare test environment if an AWS-specific blocker truly needs comparison | Replicating an entire production stack unnecessarily |
| Antigravity / Codex local | Last-resort interactive debugging or IDE workflows | Continuous background jobs/large encodes on hot Windows laptop |

**Ownership boundary:** ChatGPT continues engineering when given the current ZIP and tools in a conversation. It cannot work autonomously between turns or connect to a private cloud account without a permitted connector and user authorization. Codex/GitHub/Colab runs only when explicitly launched/configured by the user.
