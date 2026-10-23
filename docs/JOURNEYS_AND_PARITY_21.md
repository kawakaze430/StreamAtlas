# A02 — Current-user journey and API/UI parity matrix

**Baseline:** v0.20 Node 22/SQLite synthetic-only private prototype. **Legend:** VERIFIED = exercised by `npm test` or offline Chromium; CONTRACT = described in OpenAPI; NETWORK-PENDING = cannot navigate localhost in this environment; REVIEW = requires external provider or human review. P0 is required before deployment. This is not a claim of end-to-end cross-browser production parity.

| Journey | UI | Core APIs | Roles | Current evidence / gap |
|---|---|---|---|---|
| Landing / directory nav | `/`, `/categories`, `/models`, `/sites`, `/networks`, `/channels` | `/api/home`, `/api/{categories,performers,sites,networks,channels}` | viewer/anonymous in private demo | Offline Chromium 3 viewports VERIFIED; network test PENDING |
| Search + autocomplete | Header search; `/search?q=` | `/api/search/suggest`, `/api/videos` | viewer/anonymous | Unit API VERIFIED; browser real-network PENDING |
| Video discovery | sort/filter/pagination | `/api/videos` | viewer/anonymous | API filters/ordering tests VERIFIED |
| Video watch | `/videos/{slug}` | `/api/videos/{slug}`, `/related` | eligible viewer | Offline Chromium MP4 decode VERIFIED; network HLS/ABR PENDING |
| Player controls | speed, skip, chapter, PiP, captions if uploaded | `/api/media/{id}/...` | entitled viewer | Offline synthetic MP4 speed/play VERIFIED; Safari/Firefox captions PENDING |
| Registration/login | auth modal/forms | `/api/auth/register`, `/login`, `/auth/me`, `/logout` | member | Isolated fixture login contracts VERIFIED; real browser network PENDING |
| Security lifecycle | account settings | `/api/me/security`, password/MFA routes | member | Auth regression suite VERIFIED; external email sender PENDING |
| Private favorites/Watch Later | `/favorites`, `/watch-later` | `/api/me/library`, `/toggle` | member | API + offline UI VERIFIED; cross-device browser PENDING |
| Playlists/history | `/playlists`, `/history` | `/api/me/playlists`, `/api/me/history` | member | API tests VERIFIED; browser network PENDING |
| Subscribe/notifications | `/subscriptions` and channel detail | `/api/me/subscriptions`, `/api/me/feed` | member | API tested; notification delivery PENDING |
| Creator registration | `/studio` | `/api/studio/apply`, `/api/studio/overview` | creator applicant | API tested; roles seeded for QA; real vendor identity REVIEW |
| Private media upload | creator studio | `/api/studio/uploads/*` | approved creator | Resumable FFmpeg tests VERIFIED; cloud object storage PENDING |
| Admin moderation | `/admin` | `/api/admin/*` | ADMIN only | Permission tests VERIFIED; real reviewer SOP REVIEW |
| Case/report/appeal | video report + dashboard | compliance case endpoints | member/admin | Synthetic complaint browser form VERIFIED offline; external legal policy REVIEW |
| Access receipt and CDN signing | access-status and preview | `/api/me/access-status`, preview cookies | eligible viewer | Signed-callback unit tests VERIFIED; certified provider PENDING |
| Ops, DR, rollbacks | private CLI | `/api/ready`, internal metrics | authorized operator | Local restore test VERIFIED; cloud recovery PENDING |

## Minimum reproducible evidence

1. `npm test`: all Node contract, media, security, upload tests on synthetic isolated databases.
2. `SA_AUDIT_OUTPUT=reports/offline-browser npm run qa:browser:offline`: Chromium renders real UI JS/CSS at 1440/820/390px, checks homepage/categories/watch, plays synthetic MP4, checks common focus/label/contrast heuristics. This does NOT navigate over the browser network.
3. `python qa/network-e2e.py --engines chromium firefox webkit --strict`: actual network-based browsers; intentionally fails if any engine is missing or blocked. Requires Playwright browser binaries and local axe-core for CI. Run in a permissive environment.
4. `npm run qa:release:verify`: every tracked source file matches SHA256 digest.

## Known acceptance exclusions

- **MODERATOR** is seeded as a distinct role fixture to verify denial of ADMIN operations; the backend currently authorizes only `ADMIN` for moderation. A future role-permission matrix is needed if MODERATOR should gain delegated powers.
- `public/app.js` synthetic watch page has no captions track for the demo MP4. Captions from uploaded media exist separately; enforce manual caption-switch tests before WCAG acceptance.
- Age/consent/legal/license status is never represented as verified based only on local mock receipts or declarations.
