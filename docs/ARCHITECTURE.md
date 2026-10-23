# Architecture — checkpoint 01

## Logical overview

```
Browser (HTML / CSS / JS client-side router)
       |
       | fetch JSON and media URL
       v
Node.js HTTP server (no external packages)
   |        |          |
 REST APIs  Static     Byte-range MP4
   |        assets     delivery
   v
SQLite (users, catalog, relationships, watch data, reports)
```

The prototype is intentionally single-process to make it portable. It implements API boundaries matching the proposed future decomposition.

### Catalog domain

- `networks` — production/distribution groups.
- `sites` — source catalogs, currently one network per site (junction table needed if many-to-many).
- `channels` — content publishers linked to a site.
- `performers` — profiles (fictional sample identities).
- `categories` — taxonomy terms.
- `videos` — approved publishing records and media URLs.
- `video_categories` and `video_performers` — many-to-many links.

A public video is emitted only when `videos.status='PUBLISHED'`. Hiding an item removes it from home, search, related recommendations, filtered feeds and direct watch detail routes. Seed sources are original local assets, not third-party partner data.

### User domain

`users` + `sessions`: scrypt password hashing, 32 random bytes per session, SHA-256 of session token stored in DB, HttpOnly SameSite=Strict cookie, 30-day expiration. The server does not currently implement email verification, password reset, secure audit trails or distributed rate limiting.

`favorites`, `watch_later`, `watch_progress`, `playlists`, `playlist_videos`, `subscriptions`, `reactions`, `comments`, `reports` hold per-user state. Demo viewer accounts are disposable but stored until local DB reset.

### Playback

Frontend native HTML5 video points to a bundled sample MP4. The HTTP static handler supports byte-range `206 Partial Content` responses. Sample clips are generated from original artwork and run for ~8 seconds each. Card labels use `SAMPLE`; this is NOT HLS, 4K output or CDN streaming.

### Search & sorting

- `GET /api/search/suggest?q=` combines category/channel/site/network/performer names and video title matches.
- `GET /api/videos?...` filters normalized video relationships using SQL EXISTS subqueries.
- Top-rated videos use `likes / (likes + dislikes + 1)` as a basic smoothing factor.
- Porn Site Top Rated uses average video rating; Pornstars Most Viewed uses aggregated video views and supports country-code filtering.
- Related videos rank same site, same channel, category overlap and view popularity, with offset/limit pagination. Content eligibility filtering precedes ranking.

### Security basics included

No cross-origin permissive CORS headers. Mutations require application header `X-Requested-With: StreamAtlas`. DB SQL uses prepared statements. User text is HTML-escaped. Authentication cookies are HttpOnly + SameSite=Strict and Secure for HTTPS requests. Admin routes require `ADMIN` role. Path traversal in file requests is guarded; API bodies have a 64 KiB limit. CSP forbids external scripts and resources.

**Not production security:** A custom header is not a complete CSRF defense for all deployment architectures. A production deployment must add independent CSRF analysis, stringent rate limits, proper signed media authorization, abuse prevention, provenance controls, secure audit records and threat-model review.

### Production architecture plan (not yet built)

```
Next.js (SSR / SEO) -> Spring Boot Catalog + User APIs -> PostgreSQL
                         |             |
                         |             + Redis / OpenSearch
                         |
                  Upload metadata & review -> Private storage
                                               |
                                        Media processing jobs
                                               |
                                         FFmpeg/HLS encodes
                                               |
                                         Approved CDN assets
```

Migrate feature-by-feature with contract tests. Introduce modular services only as needed after first deployment.


## Checkpoint 02 — media ingestion subsystem

`src/uploads.js` encapsulates the creator and upload routes, private media delivery, and serial asynchronous media job processing. Requests go through the existing Node HTTP router and cookie authentication. `src/database.js` adds creator_profiles, upload_sessions and moderation_audit tables without dropping the Checkpoint 01 catalog.

Creator applicant → admin approval → create creator site/channel → upload session → exact-offset private chunks → finalize / SHA-256 → QUEUED → FFprobe → FFmpeg MP4, HLS and poster → IN_REVIEW → private admin preview + external documentation review → APPROVE/REJECT. Only APPROVE makes a video PUBLISHED; media requests require both record statuses published.

The worker is **in-process and serialized** with restart recovery of QUEUED/PROCESSING jobs. Database and private media are persisted on the local filesystem. No managed queue/object store, verified evidence system, transcoding sandbox, CDN or signed HLS URL is implied.


## Checkpoint 03 update

Added `video_chapters` relational table (video FK, start seconds, title). The metadata editor validates unique ascending chapter markers before persisting atomically with title, description and category; public watch data includes the chapter list only for published videos.

FFmpeg creates a 320p lower-bitrate MP4 in addition to the primary MP4, poster and single-rendition HLS assets. The player switches MP4 source while remembering the current seek position and speed. This is manual rendition selection, **not** ABR; future playback should use an authorized HLS player and true multi-rendition master manifests.

Account session revocation uses 16-character non-bearer prefixes of hashed session tokens scoped to the authenticated user. It does not expose raw session cookies to the UI. Viewer preferences (speed/autoplay/theme) currently use localStorage and should eventually be part of an account settings API.


## Checkpoint 04/05 architecture (local)

`Browser → Node HTTP API → SQLite (WAL)` serves catalog pages, user accounts, moderation, search, sessions and notification reads.

`Creator uploads → private chunked staging → SQLite QUEUED job → separately supervised Node media worker → FFprobe/FFmpeg → private MP4/HLS posters → moderator review → published media route` forms the media pipeline. The media worker is a separate OS process started by `npm start` by default, and may be started manually with `npm run worker`. The queue survives process exit via SQLite status; worker recovery requeues PROCESSING rows. A single worker is supported, NOT safe concurrent distributed consumers.

All media assets, including captions and HLS segments, run an authorization check before reading from private storage. Browser API mutations require signed double-submit CSRF, application header and Origin/Fetch-Site constraints.

Subscriptions are stored in SQLite; a successful creator approval inserts notification records for currently subscribed members in the publication transaction. Withdrawn media is filtered on notification reads. Account JSON exports include library records and user metadata only.

The longer-term Next.js + Spring Boot + PostgreSQL architecture remains a **migration proposal**, not a feature of this checkout. Strong viewer age assurance, lawful distribution, evidence verification and secure transcoder isolation are mandatory prerequisites before public deployment.

## Checkpoint 06 architecture delta (supersedes the Checkpoint 01 overview above)

The normal API server now supervises an independent `src/media-worker.js` process for SQLite-queued processing (Checkpoint 04). In CP06, `processUpload()` checks the conditional SQL claim result before transcoding to avoid duplicate claims during concurrent polling. This is *not* a distributed lease: only one worker should run, and simultaneous worker startups/recovery could still interfere.

SQLite `user_preferences` stores server-side watch-history and autoplay settings. `GET /api/me/recommendations` ranks eligible videos using saved-category matches, followed channels and popularity; it reads the small local catalog for each request, so it must be replaced with indexed/precomputed retrieval before large-scale deployment.

The SQLite backup tool uses Node's online SQLite `backup()` instead of copying an open live DB file, followed by SHA-256/`integrity_check`. The backup deliberately excludes private uploads; a production backup must coordinate encrypted database snapshots, media assets and retention policies.

Real browser E2E remains unverified due to Chromium execution timeouts. Desktop Chrome currently uses selectable MP4 renditions, while native-HLS browsers may use the master playlist. hls.js/ABR client integration is still pending.
