# Testing matrix — StreamAtlas v0.5.0

**Verified run: 60 tests, 60 passed, 0 failed (Node 22.16 / FFmpeg 7.1.5).**

## Automated coverage

- `tests/api.test.js`: catalog/search/user account and library API behavior.
- `tests/render.test.js`: frontend route rendering through a limited mock DOM environment (not graphical browser).
- `tests/upload.test.js`: chunk upload/owner permission/FFmpeg pipeline/review/hidden-media access.
- `tests/checkpoint03.test.js`: video chapters, low-resolution processing, creator suspension and analytics.
- `tests/library03.test.js`: playlist/history/session ownership and deletion.
- `tests/checkpoint45.test.js`: HLS master and two variants, captions, evidence refs, owner checks, published notification inbox, export and admin jobs.
- `tests/worker-security45.test.js`: launches an actual non-test Node API server, tests strict CSRF and hostile Origin rejection, saves an upload with the media worker disabled, simulates `PROCESSING` crash state, then starts a separate media worker to recover and process it; requires review refs before publication.

## Manual browser acceptance checklist (still open)

- [ ] Chrome desktop 1366×768, 1920×1080: homepage, 4-column grid/sidebar/navigation.
- [ ] Chrome Android 360×800 and Safari iOS: responsive cards/menu/player.
- [ ] Search suggestions: keyboard Up/Down, Enter, Escape, screen reader roles.
- [ ] Individual directory pages, sorting, filters, pagination and error states.
- [ ] Video quality switching, caption tracks, seek, fullscreen, PiP, keyboard shortcuts.
- [ ] New uploader application, login, private file chunk upload and resumability.
- [ ] Moderator private preview, evidence reference inputs, publication and immediate removal.
- [ ] Channel subscriptions, new video notification inbox and mark read.
- [ ] Account data export download and reading saved JSON.
- [ ] Strict CSRF in actual browser for login, uploads and moderator actions.
- [ ] Accessibility pass with keyboard only and assistive technology.

Headless Chromium `--screenshot` timed out in the supplied runtime. **No screenshot, browser automation or accessibility certification is claimed.**

## Checkpoint 06 testing results (latest)

**72 passing automated tests / 0 failures** in Node v22.16 with FFmpeg v7.1.5. Expanded files:

- `tests/checkpoint06.test.js`: privacy preferences, paused watch-history persistence, comment ownership, scoped list clearing, password change/session revocation, filtered search validation, recommendations and administrator diagnostics.
- `tests/backup06.test.js`: online SQLite backup, verify SHA-256/integrity, read independent snapshot, detect tampering and invalid destination path.
- `tests/render.test.js`: mock DOM coverage for quality/duration search filters and logged-in settings-template controls.

**Browser status:** The standalone Chromium screenshot command was attempted again and timed out. A separate optional `npm run test:browser` (Playwright) script is now included, but **not executed successfully** in this environment because Playwright is not installed and Chromium is nonfunctional here. Use a compatible local machine with Playwright/Chromium and preserve screenshots for visual review. Do not equate mock DOM/API tests with end-to-end browser assurance.
