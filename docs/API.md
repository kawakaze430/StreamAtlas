# REST API reference — checkpoint 01

All endpoints return JSON. Base URL: `http://localhost:3000`. Non-GET operations require `X-Requested-With: StreamAtlas` (a preliminary same-origin safeguard; NOT a complete production CSRF design). User endpoints authenticate using an HttpOnly session cookie.

## Public catalog

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/health` | Health and checkpoint |
| GET | `/api/home` | Latest, popular, top rated, directories for sidebar |
| GET | `/api/videos` | Paginated/sorted catalog |
| GET | `/api/videos/:slug` | Video detail, related videos, user flags and comments |
| GET | `/api/videos/:slug/related?page=2&limit=12` | Paginated related videos |
| GET | `/api/search/suggest?q=...` | Suggest videos/categories/performers/sites/channels/networks |
| GET | `/api/categories` | Categories with video counts |
| GET | `/api/categories/:slug` | Category metadata |
| GET | `/api/performers` | Performer directory with aggregated views |
| GET | `/api/performers/:slug` | Performer metadata |
| GET | `/api/sites` | Source site directory, counts and rating |
| GET | `/api/sites/:slug` | Source site metadata |
| GET | `/api/networks` | Network directory |
| GET | `/api/networks/:slug` | Network metadata |
| GET | `/api/channels` | Channel directory |
| GET | `/api/channels/:slug` | Channel metadata |

`GET /api/videos` query params: `page` (1+), `limit` (1..72), `sort=latest|most-viewed|top-rated|oldest|duration`, optional `category`, `performer`, `site`, `network`, `channel`, `q`. Values for relationships are URL slugs. Response shape: `{items, total, page, limit, pages}`.

Directory `sort` values: `alphabetical`, `alphabetical-desc`, `many-videos`, `top-rated` (sites), `recent` (sites). Performer directories support `country=US` (or another country code).

## Sessions

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/auth/me` | Current viewer or null |
| POST | `/api/auth/demo` | Create new local demo viewer + session cookie |
| POST | `/api/auth/register` | `{name,email,password}`; min 10-character password |
| POST | `/api/auth/login` | `{email,password}` |
| POST | `/api/auth/logout` | Destroy current session |

## Library and interaction

| Method | Endpoint | Request / response |
|---|---|---|
| GET | `/api/me/library?type=favorites` | List favorite videos |
| GET | `/api/me/library?type=watch_later` | Watch Later videos |
| POST | `/api/me/library/toggle` | `{type:'favorite'|'watchLater',videoId}` |
| POST | `/api/me/reaction` | `{type:'LIKE'|'DISLIKE',videoId}` |
| POST | `/api/me/progress` | `{videoId,position}` |
| GET | `/api/me/history` | Watch history/progress |
| DELETE | `/api/me/history` | Clear all watch history |
| POST | `/api/me/subscriptions/toggle` | `{channelId}` |
| GET | `/api/me/subscriptions` | Subscribed channels |
| GET | `/api/me/feed` | Latest approved videos from subscribed channels |
| GET | `/api/me/playlists` | Owned playlists |
| POST | `/api/me/playlists` | `{name}` |
| GET | `/api/me/playlists/:id` | Playlist and its videos |
| DELETE | `/api/me/playlists/:id` | Delete owned playlist |
| POST | `/api/me/playlists/items` | `{playlistId,videoId}` |
| POST | `/api/comments` | `{videoId,body}` |
| POST | `/api/reports` | `{videoId,reason,details}` |
| POST | `/api/videos/view` | `{videoId}`; rudimentary demo view counter only |

## Admin (requires `ADMIN` role)

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/admin/overview` | Aggregate dashboard counts |
| GET | `/api/admin/reports` | Up to 200 most recent reports |
| GET | `/api/admin/comments` | Up to 200 most recent comments including hidden |
| PATCH | `/api/admin/comments/:id/visibility` | `{hidden:true|false}` |
| GET | `/api/admin/videos` | Up to 200 catalog rows including hidden |
| PATCH | `/api/admin/videos/:id/status` | `{status:'PUBLISHED'|'HIDDEN'}` |
| PATCH | `/api/admin/reports/:id/status` | `{status:'OPEN'|'RESOLVED'|'DISMISSED'}` |

Use the CLI command in README to create a local administrator.

## Sample request

```bash
curl -s 'http://localhost:3000/api/videos?sort=most-viewed&limit=4'
curl -s 'http://localhost:3000/api/search/suggest?q=ama'
```

Mutation testing requires a valid login cookie and the application header; using the UI is the easiest approach.

## Checkpoint 02 additions — Creator and media lifecycle

All JSON mutations require `X-Requested-With: StreamAtlas` and an authenticated cookie. `PUT` chunk requests use binary `Content-Type: application/octet-stream` and `X-Upload-Offset`. These are prototype local APIs, not public cloud signed URLs.

| Verb | Path | Access | Purpose |
|---|---|---|---|
| GET | `/api/studio/overview` | signed-in user | Creator status, owned uploads, size/format constraints |
| POST | `/api/studio/apply` | registered member | Apply for creator channel (`displayName`, `agreePolicies: true`) |
| GET | `/api/admin/creators` | admin | List creator applications |
| PATCH | `/api/admin/creators/:userId/decision` | admin | APPROVED / REJECTED / SUSPENDED with note |
| POST | `/api/studio/uploads/initiate` | approved creator | Title, description, filename, MIME, byte size, categoryId, three declarations |
| PUT | `/api/studio/uploads/:uuid/chunk` | upload owner | Binary chunk <=2 MiB at exact `X-Upload-Offset` |
| GET | `/api/studio/uploads/:uuid` | upload owner | Current resumable offset and upload state |
| POST | `/api/studio/uploads/:uuid/finalize` | upload owner | SHA-256 full upload, begin queued FFmpeg |
| POST | `/api/studio/uploads/:uuid/retry` | upload owner | Reprocess one failed job once |
| DELETE | `/api/studio/uploads/:uuid` | upload owner | Cancel incomplete/failed upload and delete its private file |
| GET | `/api/admin/uploads` | admin | Upload moderation queue and metadata |
| GET | `/api/admin/uploads/:uuid/preview/playback.mp4` | admin | Private processed video preview with Range |
| GET | `/api/admin/uploads/:uuid/preview/poster.jpg` | admin | Private processed poster preview |
| PATCH | `/api/admin/uploads/:uuid/decision` | admin | APPROVE / REJECT + note, and three booleans on APPROVE |
| GET | `/api/admin/audit` | admin | Creator/upload/video/report/comment action audit |
| GET | `/api/media/:uuid/playback.mp4` | public *only after approved* | Progressive sample MP4, with Range support |
| GET | `/api/media/:uuid/poster.jpg` | public *only after approved* | Generated poster |
| GET | `/api/media/:uuid/master.m3u8` | public *only after approved* | Single-rendition local HLS manifest |
| GET | `/api/media/:uuid/seg_000.ts` etc. | public *only after approved* | HLS segments |

An explicit JSON upload initiation example:

```json
{
  "title":"My original landscape demo video",
  "filename":"sample.mp4",
  "mime":"video/mp4",
  "size":67068,
  "categoryId":1,
  "description":"Self-owned non-explicit video sample",
  "rightsDeclaration":true,
  "adultsDeclaration":true,
  "consentDeclaration":true
}
```

Approval example (requires an admin to independently check *actual* evidence before sending):

```json
{
  "decision":"APPROVE",
  "note":"Evidence reviewed according to the operator's external review procedure",
  "rightsReviewed":true,
  "adultsReviewed":true,
  "consentReviewed":true
}
```

No uploaded media becomes public before approval. Failed/rejected uploads never become public. Admins may hide any published video immediately; the uploaded-media route enforces both publication and upload approval state. Checkpoint 02 does **not** implement the actual documentary verification process.


## Checkpoint 03 additions

| Method | Route | Access | Behavior |
|---|---|---|---|
| GET | `/api/videos/:slug` | Public for published | Includes `chapters` and `qualityOptions` (main + 320p for approved uploads) |
| GET | `/api/media/:uploadId/low.mp4` | Published and visible only | Data saver media, supports Range |
| GET | `/api/studio/analytics` | Creator | Per-creator totals, video views, likes and comment counts |
| GET | `/api/studio/uploads/:id/metadata` | Upload owner | Read title, description, category, chapters, status |
| PATCH | `/api/studio/uploads/:id/metadata` | Upload owner; only unapproved states | `{title,description,categoryId,chapters:[{start,title}]}` up to 15 ordered chapters |
| PATCH | `/api/admin/creators/:userId/decision` | Admin | `{decision:'SUSPENDED'|'REINSTATED',note}`; at least 8 chars; restoration doesn't publish |
| GET | `/api/me/sessions` | Viewer | List active sessions with opaque 16-character references and current flag |
| POST | `/api/me/sessions/revoke` | Viewer | `{id}`; revoke a non-current session |
| POST | `/api/me/sessions/revoke-others` | Viewer | Revoke all sessions other than current |
| PATCH | `/api/me/playlists/:id` | Owner | `{name}` rename playlist |
| DELETE | `/api/me/playlists/:id/videos/:videoId` | Owner | Remove playlist item |
| DELETE | `/api/me/history/:videoId` | Viewer | Remove one item from history |
| POST | `/api/videos/view` | Viewer or visitor | Single-process 60-second repeated-view cooldown; `{counted:boolean}` |

All state-changing requests require `X-Requested-With: StreamAtlas`; this header is NOT a complete CSRF defense. Full production review and age/rights restrictions remain unimplemented.


## Checkpoints 04–05 endpoint additions

- `GET /api/security/csrf` — returns signed CSRF token and host-only same-site cookie for API mutations. Send token as `X-CSRF-Token` alongside the cookie for all `POST`/`PUT`/`PATCH`/`DELETE` in non-test mode. Origin and Fetch-Site also enforced.
- `GET /api/admin/jobs` — admin-only processing job counts and recent queue status.
- `GET /api/studio/uploads/{id}/events` — owner-only processing history.
- `GET/PATCH /api/admin/uploads/{id}/evidence` — admin-only internal license/adulthood/consent reference IDs, **not proof verification**.
- `PATCH /api/studio/uploads/{id}/metadata` — now accepts `captions` plain WEBVTT text up to 12KB.
- `GET /api/media/{uploadId}/master.m3u8`, `hi.m3u8`, `lo.m3u8`, `hi_seg_NNN.ts`, `lo_seg_NNN.ts`, and `captions.vtt` — protected published-media access. Existing MP4 endpoints retained.
- `GET /api/me/notifications` — recent published upload alerts from subscribed creator channels; includes unread count.
- `PATCH /api/me/notifications/{id}/read` and `POST /api/me/notifications/read-all` — owner-only read state.
- `GET /api/me/export` — owner-only personal library data JSON (no uploaded media bytes or sensitive evidence).

See `docs/TESTING.md` for non-test CSRF and worker-process end-to-end verification.

## Checkpoint 06 additions (v0.6.0)

**Authentication**: `PATCH /api/me/password` expects `{currentPassword,newPassword}` and retains current session while revoking other sessions. Auth required; demo accounts cannot change a password. New password must be different and 12–128 characters.

**Preferences**:
- `GET /api/me/preferences` → `{pauseHistory,autoplayNext}` (authenticated)
- `PATCH /api/me/preferences` with both boolean fields; pauses subsequent progress recording. Changing preferences does not delete existing history.
- `DELETE /api/me/library?type=favorites|watchLater` clears only the current user's indicated collection.
- `DELETE /api/me/comments/:id` deletes only a comment owned by the authenticated user.

**Discovery**:
- `GET /api/videos` additionally supports `minDuration`/`maxDuration` (0–86400 seconds) and `quality=HD|4K|1080p`, in combination with existing text, category, channel, site and network filters.
- `GET /api/me/recommendations?limit=12` returns up to 24 published videos with `reason` (`From a channel you follow`, `Matches saved categories`, `Popular in the catalog`) from local explainable heuristic ranking.

**Admin**: `GET /api/admin/diagnostics` requires ADMIN, returns SQLite quick_check, upload-status totals, processing-event status/timestamp and worker mode. No sensitive reference IDs are emitted.

**Request safety reminder**: Non-test runtime mutations require the application header, signed CSRF cookie and `X-CSRF-Token`, plus same-origin policies. The initial checkpoint01 section above predates CSRF hardening and is superseded by CP04–06.
