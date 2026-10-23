# StreamAtlas v0.37.0 — start here

This is the complete cumulative **Checkpoint 37** private synthetic-media project. Checkpoint 36 documents under `PORTABLE_HANDOFF_36` are historical; they are not updated to v0.37.0. Primary runtime remains Node 22+/SQLite; the Spring Boot starter, PostgreSQL migrations, browser multi-engine QA, and AWS infrastructure are not production-complete.

Read `HANDOFF_START_HERE.md`, `docs/RELEASE_37.md`, `AUDIT_AND_HANDOFF/UPDATED_117_TASK_ROADMAP_37.md`, `01_NEXT_ENGINEERING.md` and `02_VERIFICATION.md`. For product architecture and 117 original requirements also read `../PORTABLE_HANDOFF_36/01_GOALS_ARCHITECTURE_AND_FEATURES.md` and `../ORIGINAL_117_TASK_ROADMAP.md`.

Run `npm run doctor`, `npm run qa:contracts:strict`, `node --test --test-concurrency=2 tests/*.test.js`, `npm run qa:inventory && npm run qa:release && npm run qa:release:verify`; after making code changes, regenerate reproducible manifests. Package the entire source with `python scripts/build-qa-zip.py <complete-archive-path>`, then extract fresh and retest.

**Never** treat zero scanner-reported literal gaps as 100% API contract coverage. Dynamic regex routes and typed response schemas need review. Do not deploy public adult content without third-party verification of legality, age, rights, consent, moderation, independent security, provider acceptance and territory policy.
