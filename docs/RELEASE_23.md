# StreamAtlas v0.23.0 — Watch queue, member libraries and following

## Verified implementation

- **Private Watch Queue:** Add eligible published videos from a watch page; deduplicate; limit to 100; reorder, remove or clear. Account ownership and media-visibility checks apply to every queue operation.
- **Watch-page autoplay precedence:** When autoplay is enabled, the user's next eligible queue item takes precedence over the ordinary related-video suggestion. Queue membership is not automatically deleted; users decide when to remove items. A missing/unavailable queued item is not exposed to the player.
- **Continue Watching:** Account-private view of unfinished progress with deleted/hidden videos filtered. Paused history does not create additional progress; no tracking is sent by this prototype's offline QA harness.
- **Playlists:** Order persists through refresh/relogin; controls reorder items without changing ownership. Existing playlist creation, renaming, remove and delete remain available.
- **Subscriptions:** Per-channel notification alerts may be muted without unsubscribing. The signed-in subscription feed continues to show followed channels when notifications are off.
- **Account export:** Queue and subscription notification settings included.
- **Compatibility:** A new additive SQLite schema and a proposed PostgreSQL migration 009 cover queue, playlist ordering, and per-channel notification preferences.

## Validation evidence

- API tests in `tests/checkpoint23.test.js` verify cross-account isolation, no duplicate insertion, queue order integrity, visibility filtering, preference validation, playlist ordering, watch progress and JSON export.
- Existing regressions must pass with `npm test`. Offline Chromium QA is run via `npm run qa:browser:offline` at three widths; it tests user-facing add/remove queue controls and Continue Watching navigation in addition to sample MP4 playback and old routes.
- Source inventory, contracts and SHA-256 release manifest are regenerated using `npm run qa:inventory && npm run qa:release && npm run qa:release:verify` before packaging.

## Known gaps / next steps

- Full network browser E2E across Chromium/Firefox/WebKit and physical devices is still unverified in this restricted runtime.
- Better persistence for offline-synced watch queue and queue autoplay on every browser has not been validated across devices.
- Optional drag-and-drop UI and public/shared playlists are **not** implemented. Playlists and queue are private to the account.
- PostgreSQL 009 has not been applied to a real PG instance; Spring Boot cutover and live AWS deploy remain unfinished.
- All media is synthetic non-explicit demonstration material. Public release requires effective external verification, rights/consent, legal and operator signoffs.

## Run locally

```bash
npm run doctor
npm test
npm start
npm run qa:browser:offline
```
