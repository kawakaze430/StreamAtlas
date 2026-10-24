# Next engineering and acceptance queue

1. Sync exact current cumulative v0.41 source to existing private `main`, while preserving already committed CI improvements. No force-push, branch, PR or worktree. Compare tracked tree/file hashes before fast-forward.
2. Review GitHub Actions **scheduling** problem: runs at b9cfb7e9 failed within seconds and produced no job steps. Check Actions account billing/usage, enabled workflows, runner availability and repository policy with account administrator before assigning application failures. Do not rerun blindly.
3. Rerun real Chromium/Firefox/WebKit with pinned local axe-core; inspect JSON artifacts for actual defects, not just summary exit codes. Test Safari/iOS and Android separately on actual devices.
4. Execute PostgreSQL 16 migration and rollback using an ephemeral database. Java 21 Maven with test counts; no full Spring API parity claim from compilation alone.
5. Private S3 uploads and signed CloudFront cookies at origin; revoked access including already-cached segments; distributed worker lease/quarantine/idempotency and load. Keep local SQLite prototype isolated until verified cutover.
6. Outside code: independent legal review for allowed regions, viewer/participant age verification, documented consent/rights, provider acceptance, CSAM detection/reporting workflow and staffed takedown operations. Production blocked until complete.

## CI evidence convergence (2026-10-24)

- Current cumulative ZIP now merges Codex direct-main CI infrastructure, Python test runner tests, 15 Java controller tests and Node CI evidence tests; 321 Node + 21 Python passed in the merged local worktree.
- Main-only work must preserve Codex CI and security changes. Offline MP4 codec acceptance should run with Google Chrome, not Snap Chromium.
- User resources are reserved for authorized private staging and genuinely unavailable physical-device/security/compliance work; do not deploy or spend cloud credits without permission.
