# Security, legal and rights checklist

This repository is for **local technical demonstration only** with synthetic, non-explicit images and locally generated clips. It is **not an adult-content hosting deployment**. Age assurance, identity/consent recordkeeping, licensing and jurisdictional restrictions are *not* implemented.

## Mandatory production prerequisites

- Decide intended service jurisdictions and obtain qualified local counsel on legality, age assurance, recordkeeping, notice/takedown, intermediary obligations and privacy law.
- Require effective viewer age assurance where applicable; do not rely on a simple confirmation checkbox as a substitute for legally required checks.
- Verify participants' adulthood, authentic consent and rights to publish; secure any highly sensitive documents with least-privilege access, retention and deletion policies.
- Support copyright takedown requests, appeals, revocation of consent where legally applicable, immediate quarantine, regulator/law-enforcement cooperation where legally required.
- Do not import/host third-party media without authorized licenses. Original branding and illustrations must be used.
- Enforce geographic restrictions before public catalog visibility and video delivery.
- Choose cloud/CDN/payment/advertising providers whose terms explicitly permit the lawful business model.
- Comprehensive privacy compliance: limited collection of sensitive data, encryption, controlled audit access, consent and user export/delete where applicable.

## Code hardening before any public deployment

- Add dedicated CSRF token mechanism, rate limiting for login, reports, likes, comments, view counting, uploads and admin actions.
- Add MFA for admins, password reset/email confirmation, stronger session revocation controls and security audit log.
- Harden user-generated comments: spam and abuse moderation, content policy enforcement, stricter server-side sanitization, retention limits.
- Harden uploads: malware scanning, content type/magic-byte verification, video decompression bombs/size limits, quota/rate limits, private staging, asynchronous review.
- Never serve unpublished or restricted videos from publicly reachable object keys or CDN paths.
- Add origin and proxy trust policy; currently `X-Forwarded-Proto` is trusted to decide Secure cookie behavior and should be restricted behind trusted ingress.
- Configure HTTPS, Content Security Policy, HSTS, security headers, secure reverse proxy and observability.
- Avoid secrets in source files, logs, screenshots, commit history or the ZIP.
- Add backup encryption, restoration drills, disaster recovery plan and vulnerability scanning.

## Demo-content limitations

Catalog category labels were inspired by reference navigation, but demo video content is generated from abstract original artwork. Performer names and their illustrated avatars are fictional. Real network brands, logos, performers, copyrighted thumbnails and adult video files from the reference website are not shipped.

## Checkpoint 02 — uploads and media security

The prototype now implements a **local technical trust boundary** for uploaded files:

- creator application + admin approval; demo-viewer accounts cannot upload;
- a registered creator can only manipulate their own upload sessions;
- file size (25 MiB), chunk size (2 MiB), exact offset and outstanding-upload caps;
- MP4/WebM/MOV extension and MIME declaration checks followed by FFprobe media-format inspection;
- a serial FFmpeg processor producing local HLS, MP4 and poster assets;
- media stored under `data/private`, outside the public static tree;
- media URLs return 404 until administrator approval; uploaded public media requires both uploaded status and video visibility to be PUBLISHED;
- admin-only private preview, review notes, explicit approval acknowledgments, audit logs, fail/retry/cancel;
- old admin publish endpoint cannot bypass uploaded-media review.

These controls do **not** replace production protections. The prototype does NOT provide real adult viewer age assurance, secure participant identity/adulthood evidence collection, consent verification, antivirus scanning, CSAM matching, content moderation classifiers, jurisdiction-aware blocks, evidence lifecycle management, a verified takedown process, secure public CDN tokens, cloud IAM, or independent penetration testing. Uploaded binary media and FFmpeg are not sandboxed and **must not be exposed to arbitrary internet uploads**. Self declarations and admin checkbox acknowledgments are not substantive verification.

Add robust origin/CSRF controls, reverse-proxy trust, per-user/IP rate limits, concurrency quotas, signed object-storage uploads, worker sandbox/resource caps, storage quotas and deletion policies before exposing this system to traffic. Staff must verify applicable local laws and permitted media-hosting agreements. Any potentially unlawful/non-consensual content requires an appropriately designed rapid removal and escalation procedure.


## Checkpoint 03 improvements and still-open risks

- `X-Forwarded-Proto` is only trusted for cookie `Secure` detection when `TRUST_PROXY=1` is explicitly configured. Configure it only behind a trusted TLS-terminating reverse proxy that strips untrusted forwarded headers.
- New owner checks protect upload metadata and chapter editing; only UPLOADING/FAILED/IN_REVIEW uploads can change metadata. Creator suspension blocks new approval and hides published videos. Reinstatement never automatically republishes.
- Approved uploads now offer two MP4 variants (main and 320p) and keep local HLS private until approval. The processor remains **unsandboxed**, so do not allow hostile media files.
- Individual session revocation and revoke-other-sessions reduce misuse, but no email confirmation/MFA/password recovery or complete CSRF mitigation exists.
- Playlists exclude hidden content, and hidden videos reject new comments/progress. View reporting has a 60-second in-process repeat limit, NOT persistent per-user anti-fraud protection.
- Browser graphical screenshot/E2E checks remain blocked in this runtime. Don't deploy publicly based on passing API tests alone.

## Checkpoints 04–05 improvements

- Normal local server launches an independent child media worker; SQLite job rows are the durable queue. Restart recovery is tested with a deliberately interrupted PROCESSING state. Use only one worker instance; there is no atomic claim/lease for multi-worker deployment yet.
- Upload processing validates original SHA-256, creates two HLS variant playlists, and removes staging source after successful processing. Unsupported/corrupt uploads fail without being published. The worker and FFmpeg remain **unsandboxed**.
- Non-test requests that change state require a signed double-submit CSRF token (cookie + `X-CSRF-Token`) and restricted Origin / Fetch-Site. Tokens use a persistent `SA_CSRF_SECRET` when configured, or an ephemeral boot secret. An ephemeral secret invalidates older browser tokens after restarts; reload the page. Per-IP authentication attempt buckets are stored in SQLite, but this does not replace a reverse-proxy/Redis distributed abuse-control system.
- Administrators may record **internal** license, adulthood and consent document-reference strings. These are not the documents themselves, are not verified, and should **never** contain real identity document numbers. `SA_REQUIRE_EVIDENCE_REFS=1` only enforces the presence of references, not their authenticity.
- Caption files are validated as limited plain-text WebVTT, visible only with the related published video. Hiding uploads removes availability for all media renditions and subtitles.
- Subscription notification lists never reveal withdrawn videos. Data export covers local playlists/history/subscriptions; account deletion, secure erasure and retention management remain open.

**Prior sections mentioning missing CSRF protections or in-process-only encoding describe historical state from Checkpoints 01–03 and are superseded by the above.**

## Checkpoint 06 security & privacy updates

- An authenticated member may change an existing non-demo password after proving the current password. New password must be 12–128 characters and different; all **other** sessions are revoked. No reset tokens, email identity proof, MFA or breached-password screening are implemented.
- `user_preferences.pause_history` stops **new playback-position/history persistence** for the account. It does not delete preexisting history or stop ordinary public view counting; existing history is cleared separately. Preferences can be exported as part of the account library JSON.
- Members can delete only their own comments, and can clear only their own Favorites or Watch Later tables. There is no complete account deletion workflow yet.
- New search facets enforce bounded numeric values and allowlisted quality strings. Admin diagnostics require an ADMIN role; they expose status data without internal legal reference IDs.
- The media processing job has a conditional SQLite claim and a bounded FFmpeg child-process timeout. **There is still no isolation against malicious media** and no distributed job leases; use a single trusted local worker only.
- Database backups are checksum-verifiable and avoid live WAL copying, but are **not encrypted** and exclude private media. Use restricted local filesystems, do not include them in distributed archives, and develop encryption/retention/restore drills before any deployment.
- No viewer identity/age assurance or actual participant evidence verification was introduced in Checkpoint 06. These remain absolute production launch blockers.

Historical descriptions above of missing CSRF and purely inline workers refer to older checkpoints; use the latest implementation and documentation when evaluating current risk.

## Checkpoints 07–09 security status (supersedes historical missing-feature notes)

- Account password recovery and verification now use hashed expiring single-use tokens. Development mail is optional local-private outbox only; public email provider is NOT available.
- Encrypted authenticator TOTP secrets and login MFA now exist. `SA_MFA_KEY` must persist securely; no recovery-code, key-rotation or real user-support procedure exists. Admin routes can require MFA, with stricter production configuration.
- Normal member account closure revokes sessions, clears private library and anonymizes login, but this is NOT a full legal right-to-erasure process. Creator uploads require reviewed closure and moderation reports may be preserved.
- A SQLite singleton worker lease reduces competing-worker recovery. Docker Compose security settings are a starter and were not executed; no sandbox security claim is supported.
- Production server configuration requires a persistent CSRF secret and HTTPS public origin, but no public deployment is authorized. Effective viewer age assurance, verified participants/rights, geofencing, robust takedown, hosted secrets, independent security assessment and legal review are still missing.
- PostgreSQL export is catalog-only and avoids user/session/verification data by default. Treat exports as confidential because titles and catalog associations remain business data. Spring Boot is read-only source and does not authorize content delivery.

### Encrypted offline snapshot prototype (Checkpoints 08–09)

- New `secure:backup` and `secure:restore` use a separately supplied 256-bit AES-GCM key to encrypt both a consistent SQLite snapshot and local uploads/processed media. Manifest contents are also encrypted and authenticated. Files are streamed; memory usage is bounded.
- Operators must stop both API and worker and explicitly set `SA_BACKUP_OFFLINE=1`. This flag is only an acknowledgement, not a provable global lock across machines.
- Restores refuse to overwrite existing data, validate all encrypted files, verify SHA-256 checksums and SQLite `integrity_check`, and remove partial staging data on failure. Three offline backup/restore/tamper tests passed.
- Still missing: independent threat review, real key management/rotation, disaster-recovery scheduling and restore drills, backups of cloud storage/CDN and legal evidence, retention and encrypted offsite replication. Never store `SA_BACKUP_KEY` alongside encrypted data.
