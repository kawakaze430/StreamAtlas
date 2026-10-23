# Canonical 117-task roadmap — Checkpoint 25 review of D01–D10 and E01–E05

**Status vocabulary:** LOCAL = functional in Node/SQLite and tested locally; PARTIAL = some requirements exist but original task not fully accepted; BLOCKED = requires outside access, independent evidence, or major unimplemented engineering. These 15 entries are **not** 15 completed production tasks.

| Original task | Checkpoint 25 evidence / existing baseline | Status and remaining acceptance |
|---|---|---|
| D01 Separate linked catalog directories | Existing Videos/Categories/Performers/Sites/Networks/Channels pages preserved; new unified multi-entity results and links | LOCAL for core pages; parity audits still needed |
| D02 Recording/navigation parity | Existing responsive Chromium smoke and linked routes retained | PARTIAL: frame-by-frame parity against both user recordings not verified in this run |
| D03 Grouped autocomplete, aliases, typos, popularity, highlights | Admin alias CRUD, alias-aware grouped suggestions, popularity sort, bounded edit-distance alternatives; existing UI highlighting | PARTIAL: relevance/typo quality and large-catalog speed not evaluated |
| D04 Multi-entity search and advanced facets | Unified search, quality/category facet counts, duration/quality/date filtering and existing site/performer/channel/network URL filters | PARTIAL: full indexed faceting for all dimensions, date buckets and tag taxonomy not complete |
| D05 Cursor pagination, stable indexes | SQLite indexes, deterministic page ordering, keyset cursor for title/quality with latest/oldest/most-viewed | PARTIAL: keyset cursor does not yet cover all advanced facets/sorts; load test at scale pending |
| D06 Canonical links, safe metadata, sitemap, duplicate merging | Canonical relative links, noindex/robots/empty sitemap for private preview, admin duplicate candidate report | PARTIAL: no public SEO approval or automatic near-duplicate merge |
| D07 Hover previews and optimized lazy thumbnails | Synthetic-only preview frames, lazy/async poster images, Chromium hover/restoration test | PARTIAL: optimized multi-resolution thumbnail pipeline and device E2E pending |
| D08 Follows for performers/sites/networks with permissions | Private per-account follow APIs/UI, only entities with published videos can be followed | PARTIAL: source rights/territory permissions are not verified; no personalized follow feed |
| D09 OpenSearch only after measurements | Local synthetic SQLite benchmark and query-plan report | BLOCKED: 72-row benchmark cannot justify OpenSearch migration; no OpenSearch cluster or scale test |
| D10 Embedding similarity, reranking, A/B, cold-start | Existing heuristic recommendations and safety/diversity checks preserved | BLOCKED: no embeddings model, experiment infrastructure or independent evaluation |
| E01 Resumable direct-to-private-storage uploads | Existing local resumable chunks, SHA-256, quotas and private processing retained; new own-upload pagination | PARTIAL: direct object-storage transfer, concurrency/load and storage authorization not validated |
| E02 Malware scan, FFmpeg isolation, resource ceilings | Existing optional fail-closed ClamAV hook, protocol whitelist, bounded transcoding and worker isolation retained | PARTIAL: scanner/FFmpeg production sandbox and security certification unverified |
| E03 Durable queue, idempotency, retries, DLQ, events | Existing SQLite job states, singleton worker lease, bounded retries and processing events retained | PARTIAL: managed durable queue, explicit DLQ and failure injection at scale pending |
| E04 Verified rights/adulthood/consent/territory gate | Existing declarations, reviewer evidence references, holds and status controls; new checklist explicitly never authorizes release | BLOCKED: independent evidence verification, territory restrictions, legal approval not implemented |
| E05 Takedown and CDN/cache revocation | Existing DB hide, media entitlement checks, revocation outbox and operator invalidation scripts retained | PARTIAL: actual CDN invalidation, expiry of issued cookies and end-to-end deletion confirmation unverified |

## Additional implemented local subfeatures (not separate roadmap completions)

Private saved-search filter CRUD/export/deletion, FTS title index maintenance, typed search response, typo suggestions, duplicate candidate report, creator profile bio, creator lifetime insight summary, creator own-upload filtering, owner-only upload notes, and non-authorizing readiness checklist.

## Unresolved high-priority production gates

- Full network HLS playback on Chromium/Firefox/WebKit/Safari and mobile devices, with signed-media expiry/revocation acceptance.
- PostgreSQL migration execution, Spring Boot full backend parity, database performance and rollback drills.
- Durable distributed media processing and malware scanner/container sandbox validation.
- Real AWS object storage/CDN/DNS/TLS and operational/backup tests after explicit authorization.
- Independent legal/provider/age/consent/rights/territory approvals and staffed moderation.
