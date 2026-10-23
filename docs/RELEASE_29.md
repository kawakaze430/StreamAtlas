# StreamAtlas 0.29.0 — Audited partial-task engineering release

**Starting baseline:** uploaded consolidated Checkpoints 01–28 ZIP, with 237 initial passing tests. This release works on the actual contents of that archive, not recreated placeholder code.

## Implemented code changes

- B12: caption size (normal/large/extra) and high-contrast preference selectors for WebVTT, persisted locally; native cue rendering varies across browser engines.
- B15/E08: opt-in, disabled-by-default anonymous aggregate QoE API and private creator analytics; metrics cover startup, startup-failure, play/buffer duration, completion, errors and quality changes. Five-sample privacy threshold. No individual telemetry records persisted.
- C04: regression verifying saved preferences and watch progress across distinct sessions; cross-account isolation.
- C10: offline shell and safe service worker with strict static-only cache policy, no offline videos.
- D07: 320/640-pixel WebP poster variants, responsive srcset, lazy thumbnails and hover preview restoration.
- H04: private preview receipt-gating extends to direct synthetic posters and HLS static assets rather than MP4 alone.
- A06/F02: explicit QoE OpenAPI contract and PostgreSQL migration 014 with rollback (unexecuted against real PG).
- Added automated tests, browser controls verification, status CSV and full roadmap details.

## Verification

`npm test` must pass all old tests plus 8 new tests. `python scripts/offline-browser-audit.py` checks Chromium at 1440/820/390px with synthetic media. Release manifest and ZIP integrity are generated after the documentation is finalized.

**No live AWS resources, domain registration, real documentary age/consent checks, Spring Boot production cutover, security audit or global media distribution have been performed.**
