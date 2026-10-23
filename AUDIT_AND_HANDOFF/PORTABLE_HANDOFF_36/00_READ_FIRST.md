# READ FIRST — StreamAtlas portable project handoff (2026-10-22)

**Project:** StreamAtlas · **code baseline:** Checkpoint 36 / `package.json` v0.36.0 · **this deliverable:** a documentation/verification handoff layered on the same application code. **It is not a newly deployed version and does not mean additional roadmap features were built.**

## In one paragraph

StreamAtlas is a private, synthetic-media development prototype for a catalog-and-streaming platform with YouTube-like browse/search/watch, saved libraries and playlists, creator uploads/processing/review, moderation, account/security functions and administration. The eventual user goal is a globally accessible, production-grade service on AWS **only in regions and with content that are lawful and independently approved**. The intended adult-content distribution makes verified viewer eligibility, depicted-participant age/consent/rights, provider policies, regional restrictions, independent security testing and staffed moderation mandatory launch gates. **No public launch is authorized** by this ZIP.

## Current reality — do not infer from old checkpoint titles

- **Runnable system:** Node.js >=22.13 + Node built-in SQLite, JavaScript frontend, FFmpeg media worker, synthetic sample video fixtures. See `src/server.js`, `src/database.js`, `src/uploads.js`, `public/app.js`, `src/media-worker.js`, `package.json`.
- **Spring Boot:** `backend-spring/` is an incomplete **read-only catalog starter**, not full parity and not the production backend.
- **PostgreSQL:** SQL migration drafts/validation scripts; static parity is not a live PostgreSQL migration or cutover.
- **AWS:** `deployment/aws/` has private demo Compose instructions and Terraform/IaC templates. **Nothing has been deployed using this archive**, and no verified domain, S3/CloudFront distribution, RDS, WAF, IAM role or payment integration is supplied.
- **Player:** synthetic MP4/HLS fixtures and player UI. Real-network multi-browser/device ABR playback and revocation are not fully validated; pinned reviewed `hls.js` not vendored.
- **Legal/security:** Internal approval workflows, signed callbacks and evidence-reference fields are not external proof of real age/consent/licensing or public launch approval.
- **Latest recorded 117-task ledger:** LOCAL **26**, PARTIAL **51**, PREPARED **10**, BLOCKED **19**, NOT_STARTED **11** (total 117). These are **engineering-status**, not percentage of production readiness.
- **Baseline archive SHA-256:** `cf6442d21b13b892855c6e75962aaf55f5c7ab50d93b20903117965d3c18e0e6`. This handoff package adds docs and has its own separate SHA-256 digest.

## Five-minute setup for a new coding agent

1. Extract the **entire** ZIP; work in `streamatlas-checkpoint-36/`, not in an earlier checkpoint folder. Retain source and synthetic fixtures.
2. Read **in this order:** this file → `01_GOALS_ARCHITECTURE_AND_FEATURES.md` → `03_ROADMAP_BY_TASK.md` → `04_PRIORITIZED_NEXT_WORK.md` → `02_PRODUCTION_ACCEPTANCE_AND_AWS.md` → `05_MASTER_CONTINUATION_PROMPT.md`.
3. Check: `node --version` (needs Node 22.13+), `ffmpeg -version`, `ffprobe -version`; run `npm run doctor` then `node --test --test-concurrency=2 tests/*.test.js`.
4. If source is modified, regenerate source hashes **after edits**: `npm run qa:inventory && npm run qa:release && npm run qa:release:verify`.
5. Package **all project files** in one complete cumulative archive: `python scripts/build-qa-zip.py /your/output/streamatlas-complete-through-XX.zip`; perform a fresh extraction, `npm test` (bounded concurrency if needed), and release hash verification.
6. Only mark tasks LOCAL after their local acceptance criteria are actually tested. Do not mark PREPARED/BLOCKED complete merely for adding a template or mock.

## Key files

| Location | Purpose |
|---|---|
| `README.md` | Current app usage and historical cumulative features |
| `src/server.js` | Main Node HTTP/API routes and guards |
| `src/uploads.js`, `src/media-worker.js` | Creator media ingest/transcoding/worker |
| `src/database.js`, `migrations/postgresql/` | SQLite schema and PostgreSQL drafts |
| `public/app.js`, `public/styles.css` | Browser user interface |
| `backend-spring/` | Incomplete Java/Spring API starter |
| `deployment/` | Compose/Terraform/AWS/worker and monitoring examples |
| `tests/`, `qa/`, `scripts/` | Automated tests, QA and release verification |
| `contracts/openapi.json` | Reviewed API contracts (known route gaps exist) |
| `AUDIT_AND_HANDOFF/UPDATED_117_TASK_STATUS_36.csv` | Authoritative Checkpoint 36 task-by-task status |
| `docs/PRODUCTION_GATES.md` | Independent launch requirements (all unapproved) |
| `AUDIT_AND_HANDOFF/CODEX_USER_BLOCKERS_36.md` | Operator-only external tasks |
| `05_MASTER_CONTINUATION_PROMPT.md` | Full prompt to paste into another model |

## Source snapshot and transfer

Use the **complete project ZIP** or a **private Git repository** (preferred for repeated sessions); do **not** paste source file text across hundreds of messages. Upload this handoff document and the full ZIP to your new model/agent. If it has local folder access, extract or clone into a persistent workspace. Keep credentials, identity records, real private media, `.env`, runtime SQLite DB, and AWS keys outside the archive.

## User's recurring output contract

For every development *checkpoint*, deliver (a) full cumulative source ZIP, (b) task-by-task changes and updated five-category totals, (c) actual tests pass/fail/not-run, (d) detailed external blockers and Codex/user handoff, and (e) the next priority tasks. No false progress claims. Do not tell the user to wait for background work; finish what can be done in the active execution.
