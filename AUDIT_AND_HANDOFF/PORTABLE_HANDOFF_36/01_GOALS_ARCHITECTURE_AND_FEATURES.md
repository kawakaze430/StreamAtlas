# Project goal, architecture, and what currently exists

## Product goal, in the user's terms

Build StreamAtlas as a complete worldwide-accessible video website: searchable video catalog; video cards, detail/watch pages and multiple playback qualities; categories, performers, sites, networks and channels; viewer accounts, playlists, subscriptions, watch history/queue, recommendations and notification controls; creator onboarding, large video upload, FFmpeg processing, moderation and rights review; secure private storage and streaming; administration and abuse-report handling; operational dashboards, tests, production AWS infrastructure, custom HTTPS domain, reliable backups and scalable service. Only lawfully licensed/consented content may ever be distributed; start with **synthetic non-explicit private preview**.

The product resemblance to YouTube is about UI functions, **not copying another site's code or assets**, bypassing video-platform restrictions, or downloading third-party copyrighted content without permission.

## Current executable topology

```
Visitor browser (public/app.js, styles.css)
    | Local HTTP + JSON APIs, session cookie + CSRF controls
Node.js server (src/server.js) ---- Node built-in SQLite (src/database.js)
    |                                  | local accounts/metadata/moderation
    +--- catalog, discovery, member APIs, creator Studio, operations
    | 
    +--- private upload/media routes + isolated FFmpeg worker
    |                                     |
    +--- synthetic demo MP4/HLS and self-generated media assets

Not connected to running production services:
  PostgreSQL migrations + Spring Boot catalog starter
  S3/CloudFront/OAC + DNS/ACM + ECS/ALB + SQS/WAF Terraform drafts
  approved age/rights providers, real payments, email delivery, audit vendors
```

## Locally implemented capabilities supported by source and tests

| Area | Visible/current source | Known limitations |
|---|---|---|
| Catalog | Homepage feeds, video grid, categories, performers, sites, networks, channels, watch pages | Local SQLite and synthetic seed only; real content licensing, public availability unverified |
| Search | Ranked suggestions, facets, signed cursor pagination, tags, keyword/category discovery | Broader taxonomy/ranking, external-scale benchmarks and optional OpenSearch remain open |
| Member features | Registration/login and demo mode; saved/favorite/watch later; playlists, watch queue, continue watching, notifications, history and account settings | External sync, production auth/email delivery and full privacy acceptance remain open |
| Video player | Synthetic MP4 + HLS demo assets, fallback quality selection, captions, speed/seek/volume, timeline thumbnails, PiP, QoE | Reviewed hls.js dependency and real-browser network adaptive HLS/DRM/device matrix remain open |
| Creator Studio | Upload sessions, multipart/chunk support, private processing, FFmpeg renditions, generated posters, captions/chapters, metadata, collaborators, review | Scale, cloud storage isolation, failed-job recovery, external verified rights and safe publishing must be completed |
| Admin/moderation | Human approval queues, reporting, appeals, holds, takedown planning, review audit events and risk summaries | Staffed real-world moderation, legal timelines, external evidence validation and remote CDN revocation unverified |
| Security/privacy | Account sessions, password hashing, CSRF, optional MFA, role checks, scoped private-media routes, local risk tests, encrypted backup drills | Third-party pentest, production secrets/IAM, live edge/WAF and provider assessments unverified |
| Operations | Health/readiness, local metrics, SLO definitions, static deployment audits, offline browser tests, source manifests | No real worldwide staging/production telemetry, incident on-call or recovery certification |

## Database and backend migration truth

`src/database.js` is the active schema; PostgreSQL SQL files are migration drafts (recorded static 62/62 table parity, not an actual database migration). `backend-spring/src/main/java/.../CatalogController.java` is a read-only, incomplete API layer. A future engineer must compile and test Java, execute migrations on a **disposable** PostgreSQL instance, verify row-by-row and authorization parity, add missing Spring endpoints, then plan gated cutover/rollback. **Do not switch the frontend to Spring or delete Node early.**

## Current QA evidence and limitations

Checkpoint 36 reports 295 automated tests passing in a bounded Node run, offline desktop/tablet/mobile Chromium audit, 62/62 static SQL table parity, and 141 reviewed OpenAPI operations; 32 known static routes lacked reviewed contracts. Those are historical checkpoint claims unless independently rerun in the new environment. Fresh handoff verification results are recorded in `07_HANDOFF_VERIFICATION.md`.

## Provenance

Baseline: original complete `streamatlas-complete-checkpoints-01-to-36.zip`, which preserves prior source history and docs within one root. This portable handoff adds **documentation only** and updates the QA source-integrity inventory for those new files; it does not silently redesign or relabel application code.
