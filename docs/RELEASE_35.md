# StreamAtlas v0.35.0 — Source-verified release notes

## Scope
Cumulative baseline Checkpoint 34. This checkpoint **does not complete all 65 original partial/not-started tasks**. It closes two **local** task criteria and advances E03/E06/A06 with tests. Independent production acceptance remains separate.

### Features
- Owner-only bulk draft-initiate `POST /api/studio/uploads/bulk-initiate` (2–5 uploads; separate rights/age/consent declarations; quotas; one transaction; no publish).
- Creator Studio batch file input and sequential resumable transfer for each private upload (no live cloud target).
- Resilient recovery after interruption: process attempts exhausted at 2 move to `FAILED` and dead-letter rather than retrying forever.
- Secure pre-review owner-only storyboard image endpoints; the thumbnail picker renders four real FFmpeg-generated previews; changes to published poster now require a separate moderated/invalidation workflow.
- Real WebVTT and chapter metadata integration tested on an uploaded synthetic MP4.
- Account-private optional category preferences (max eight, no duplicates, opt-in, removable), local recommendation weighting, personal watch statistics and privacy-safe PWA base.
- Additive SQLite category-preference table and PostgreSQL migration 018 **draft only**; no PostgreSQL runtime executed.
- Reviewed API contracts for the new JSON routes; fresh 117-task ledger.

### Verification
- The source-tree suite passed **292/292 tests**, and desktop/tablet/mobile offline Chromium audits passed. The final ZIP is also verified after fresh extraction. Audit methods documented in `docs/STATUS_35.md`.
- All existing rights/consent/age claims are self-declarations pending authorized human review; the software does **not** validate identity/consent documents or legal rights.
- No AWS resources, domains, public adult hosting, payments or independent provider checks were run.

### Limitations
- E06 automatic scheduled publishing is *not* implemented: dates are creator planning metadata, never a way around approval.
- E03 worker uses a SQLite singleton lease; distributed broker/chaos/soak tests remain pending.
- The optional PWA shell never caches private video, authenticated APIs or verification details; physical device testing remains an external acceptance step.
