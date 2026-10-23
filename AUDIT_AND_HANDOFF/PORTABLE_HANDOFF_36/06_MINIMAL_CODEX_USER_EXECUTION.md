# Minimal Codex/user actions — protect the user's limited agent quota

The primary AI coding agent should do ALL accessible editing, synthetic testing, release packaging and documents. Only perform the following in a local terminal/agent with the missing capability, after checking project scripts and consulting `AUDIT_AND_HANDOFF/CODEX_USER_BLOCKERS_36.md`. Record actual evidence and return it to the coding agent.

## Suggested external-run order

1. **Environment and dependencies:** install Node 22.13+, Python 3, FFmpeg/ffprobe, real Chromium/Firefox/WebKit, pinned/licensed hls.js as required, Java 21/Maven, Docker/Compose and PostgreSQL 16. Do not install globally or download unreviewed packages without asking. Report version outputs.
2. **PostgreSQL disposable acceptance:** use `deployment/postgresql/compose.yaml` in an isolated environment; first review it, then run `npm run db:pg:check`, `npm run db:pg:apply:disposable`, `npm run db:pg:verify:disposable` and `npm run db:pg:concurrency:disposable` with explicit disposable-DB connection/configuration documented in the scripts. Do **not** point them at production data.
3. **Spring compile/parity:** `mvn -f backend-spring/pom.xml test` on Java 21, with configured disposable PostgreSQL; source currently has only a read-only catalog starter. Run negative authorization parity after implementation; do not claim complete migration just for a Maven build.
4. **Actual browsers:** `npm run qa:browser:network` after pinning the required test dependencies and starting a disposable local server; add real physical Safari/iOS/Android tests and throttled HLS network captures. Isolate localhost from production, use only sample videos.
5. **AWS private preview only:** after explicit authorization and confirmed provider terms, review `deployment/aws`, IAM, budgets, region, domain ownership, then prepare `terraform fmt/validate/plan` and mutually reviewed changes. Never run `apply` or open a public adult audience on behalf of the user without approval. Collect screenshots/logs of password-gated HTTPS synthetic staging, S3 private denies and CDN signer revocation.
6. **External providers/independent reviewers:** procurement and verified legal/rights/age/consent/security/moderation signoff cannot be completed merely by another model or a script. Keep gate BLOCKED with evidence requested.

## What to send back to the primary model

A redacted result summary including commands, software versions, exact timestamps, exit codes, targeted task IDs, test count, relevant output, and what failed; attach screenshots/logs with secrets removed. The primary model can then fix the code, rebuild the complete cumulative ZIP and change statuses based on verified evidence.

## Explicit non-goals

Do not use scarce Codex time to rewrite README text, regenerate ZIPs, write ordinary JavaScript tests, create status tables, or draft scripts when the primary agent can do those. No billing or real-payment testing unless a supported provider and explicit safe test context exist.
