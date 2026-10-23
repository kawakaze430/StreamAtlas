# StreamAtlas continuation after v0.26.0

Start from the cumulative `streamatlas-complete-checkpoints-01-to-26.zip`, not an earlier checkpoint. Read `docs/STATUS_26.md` and the original `docs/streamatlas-master-development-roadmap.md` before marking anything complete.

**Next 15 original tasks for a future batch:** F01–F10 and G01–G05, in dependency order. Start with disposable PostgreSQL 16 migration execution/rollback, catalog and account migration parity, SQL constraints, concurrent-write tests and Spring endpoint parity. AWS domain/identity/billing tasks G01–G05 are **external authorization blockers**, not automatically executable. Never create cloud resources or spend money without explicit approval.

**Local follow-ups:** Add full E09 delegated uploader identity and ownership model before enabling UPLOADER; make E06 batch editor a full accessible UI; implement true E08 privacy-respecting watch-time events; test E03 worker crash and retry behavior with a disposable queue; harden E02 FFmpeg sandbox; verify E05 CDN cache invalidation only in approved private staging; add comprehensive denial tests for any new access paths.

**Commands:** `npm run doctor && npm test && npm run qa:release:verify && npm run qa:browser:offline`. PostgreSQL migration 012 is a draft until exercised against disposable PostgreSQL 16; offline browser tests do not establish networked HLS support.
