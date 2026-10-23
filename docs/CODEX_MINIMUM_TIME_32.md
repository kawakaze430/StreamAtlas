# Minimum Codex/User Execution — StreamAtlas v0.32

**ChatGPT owns ongoing code development, local tests, media fixtures, bug fixes, API contracts, release packaging, and status audits.** In the current ownership audit, 37 formerly overbroad environment-blocked tasks moved to the local engineering queue. Only the actual execution/acceptance steps remain for Codex/user. Spend scarce Codex hours only on capabilities unavailable in this environment. All milestones below are *blocked* pending actual execution, not finished work.

1. **Disposable PostgreSQL + Maven + Docker**: Install/build/rerun PostgreSQL migrations 001–016; verify schema/catalog plus private-account migration parity; compile Spring Boot starter and report full auth/media API gaps. No production DB changes.
2. **Real browser HLS verification**: Fetch, license-review and pin a supported hls.js release, then run Chromium/Firefox/WebKit, slow-network bitrate/caption/failure tests; attach logs. Do not assume the local MP4 audit means ABR works.
3. **Private AWS synthetic demo only**: With explicit owner approval, apply infrastructure to a restricted account, validate TLS/OAC/unsigned denial/expiration/actual revocation and test backed-up restore. Never expose real adult material or purchase a domain without authorization.
4. **External approval belongs to authorized humans/providers, not Codex**: jurisdiction legal advice, approved viewer age verification, documented adult participant consent/licensing, vendor permission, privacy impact assessment, independent security assessment, operational moderation staff and live payment processing.

Recommended handoff: give Codex `streamatlas-complete-checkpoints-01-to-32.zip` and `AUDIT_AND_HANDOFF/UPDATED_117_TASK_STATUS_32.csv`. Require exact command logs and before/after task IDs in each PR. Preserve `SA_PUBLIC_CONTENT_MODE` fail-closed behavior.
