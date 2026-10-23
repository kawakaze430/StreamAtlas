# StreamAtlas v0.24.0 — Member experience release

Built cumulatively from verified v0.23.0 source. No proprietary imagery or third-party media bundled. This release focuses on roadmap C01–C10 (ten member-experience tasks). It does NOT complete the remaining A, B, D–K launch acceptance work.

| Roadmap | Implemented now or improved | Remaining / limitation |
|---|---|---|
| C01 Feeds | Home tabs: Latest, Trending, Top Rated, Subscriptions and For You; bounded server-driven feed modes | Full feed preference persistence and algorithmic trending not built |
| C02 Saved lists | Watched/unwatched filtering, newest/oldest/popularity sorting and owner-only bulk removal UI/API | Drag-reorder saved lists not built; playlist ordering is separate |
| C03 Playlists | Default PRIVATE, opt-in UNLISTED links, only approved videos shared, owner-only bulk removal and reordering | No public discoverability; share links should not be indexed |
| C04 Cross-device sync | Server-stored theme, interface-language preference and autoplay/history controls, read at sign-in; previous behavior retained | Only English UI actually translated; live multi-device E2E pending |
| C05 Channel notifications | ALL / HIGHLIGHTS / OFF modes and subscribed-channel controls | HIGHLIGHTS is a stored preference, **not** an implemented digest scheduler; OFF and HIGHLIGHTS have no instant alerts |
| C06 Comments | One-level comment replies, admin pin/unpin, reports with deduplication and review endpoint; parent-hidden replies filtered | Advanced spam classification, nested threading beyond one level and staffed moderation pending |
| C07 Queue | Previous/next queued-video navigation on watch pages, HTML5 drag reorder plus keyboard-friendly up/down controls | Device drag-and-drop/browser E2E pending |
| C08 Recommendations | Channel-diversity cap (3), publication and active safety-hold exclusion; existing explanation scores retained | Large-scale retrieval, online metrics and personalization evaluation pending |
| C09 Privacy | Opt-in private account search-history store (maximum 50), deletion/export, disable-clears-history; existing watch privacy unchanged | Independent privacy/legal retention review pending |
| C10 Watch statistics/PWA | Account-owned approximated progress statistics, top categories, install manifest with original local 192/512 icons | Stats are NOT verified elapsed watch time; no offline service worker, no install/device acceptance |

## QA evidence

- `npm test` must pass all inherited regression tests plus `tests/checkpoint24.test.js`.
- The test suite verifies cross-account denial, private playlist 404, unlisted visibility changes, hidden-media exclusion, comment boundaries/pin controls, notification persistence, search opt-in, queue ownership and watch statistics.
- `npm run qa:browser:offline` checks synthetic-media browsing and playback only; it is not a substitute for network-based Chrome/Firefox/WebKit/Safari acceptance.
- `npm run qa:release:verify` checks packaged source SHA-256 digests. Build the cumulative ZIP via `npm run qa:zip -- /mnt/data/<your-file>.zip`.

## Security notes

- Content publication remains disabled for public adult-content operation; no external age/participant/rights provider is certified or integrated.
- Unlisted playlist sharing does not grant playback entitlement. A private/region-gated production deployment must authorize assets separately and block caching outside validated CDN policies.
- Search history is opt-in and bounded; comments/reports require authenticated users; writes use existing CSRF safeguards.
- PostgreSQL migration `010_member_experience.sql` is **prepared but not executed**; primary backend is Node/SQLite.
