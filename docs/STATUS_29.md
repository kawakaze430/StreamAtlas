# Checkpoint 29 — Acceptance status and next gates

## Verified in this release

- 8 new automated functional/security tests for opt-in playback diagnostics, scoped creator aggregates, independent-session preferences, caption styling, private media gating, safe PWA shell and responsive local posters.
- Synthetic videos only. Existing behavior preserved. Release must pass npm test and offline Chromium audit; refer to VERIFICATION_29.json for actual outcomes.
- The private catalog and media preview routes now enforce receipt gating for locally served poster, video and HLS assets when SA_PRIVATE_PREVIEW_REQUIRE_RECEIPT=1.
- QOE aggregate recording is **disabled by default**. To enable locally use SA_ENABLE_QOE_TELEMETRY=1; viewer must independently opt in. No IP, account, cookie or session identifiers enter the aggregate table. No external analytics provider is contacted.
- Caption text size and contrast are locally remembered, subject to native browser cue styling support.
- The installable PWA shell caches only `/offline.html`, `/styles.css`, and `/assets/favicon.svg`. It never stores private videos, posters, API results or user-generated data. It is not an offline-video app.
- PostgreSQL migration 014 is a draft only. Production DB cutover, Java backend, age/rights legal approvals and AWS cloud deployment remain unverified.

## Important limitations

- Cross-browser network HLS with hls.js still requires downloaded reviewed library and execution on actual Chrome/Firefox/WebKit/iOS devices.
- The video-per-day QoE table is an opt-in diagnostic prototype; it does not measure unique viewers or represent statistically meaningful production telemetry.
- Browser audit runs synthetic media in an offline-injected Chromium environment. It cannot stand in for global network/device QA.
- Most of the original 56 partial tasks have external/cloud or independent acceptance requirements. Only D07 and B15 are promoted to LOCALLY IMPLEMENTED in this update; their cloud/real-device acceptance remains open.
- This archive is not approved for public adult-content deployment.

## Next priorities

1. Run external browser network matrix, Safari/iOS HLS, and axe-based accessibility audit.
2. Execute migrations 001–014 on disposable PostgreSQL, then migrate all private accounts and operations with parity tests.
3. Complete actual Spring Boot APIs and contract parity without dropping the working Node implementation.
4. Stand up private AWS S3/CloudFront and test signed entitlement, failure, revocation and cache invalidations with authorized account access.
5. Complete independent vendor, documentary, legal, moderation, security and recovery audits.
