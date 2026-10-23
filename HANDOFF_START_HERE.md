# StreamAtlas v0.38.0 — complete cumulative handoff (Checkpoints 01–38)

**Start here:** `AUDIT_AND_HANDOFF/PORTABLE_HANDOFF_38/00_START_HERE.md`, then `docs/RELEASE_38.md`, `AUDIT_AND_HANDOFF/UPDATED_117_TASK_STATUS_38.csv`, `AUDIT_AND_HANDOFF/UPDATED_117_TASK_ROADMAP_38.md`, the next engineering path, and the one-shot Codex test-only prompt. Prior numbered folders preserve evidence for earlier releases, not current status.

**Implemented this checkpoint:** private single-writer resumable upload recovery (byte-exact replay, fsync-before-SQL progress and fail-closed conflict checks), expanded HTTP and unit tests, and 11 reviewed dynamic upload OpenAPI contracts (173 → 184 total). Existing Node/SQLite, frontend, media processing, review, signed/CDN templates and all 117 task rows are retained.

**Engineering task state:** 26 LOCAL / 51 PARTIAL / 10 PREPARED / 19 BLOCKED / 11 NOT_STARTED. `LOCAL` describes local engineering evidence only; no real PostgreSQL 16, Maven, real multi-engine browsers, AWS staging or outside provider verification is asserted without actual evidence. Zero static literal route gaps is not complete dynamic API coverage.

**Security/release condition:** synthetic, non-explicit media only; no adult-content public launch without jurisdiction-lawful operation, participant proof/rights/consent, legally sufficient age assurance, trained moderation, service-provider approval and independent security review. Cloud resources and purchases require explicit authorization. Preserve the complete ZIP and release SHA-256.
