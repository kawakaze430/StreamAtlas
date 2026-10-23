# Checkpoint 23 acceptance matrix

| Requirement | Status | Evidence / limitation |
|---|---|---|
| User Watch Queue APIs and UI | Implemented / locally tested | Account-owned queue, add/remove/reorder/clear; browser smoke |
| Queue precedence for Up Next | Implemented | Client prioritizes eligible queued items when autoplay enabled; device E2E pending |
| Playlist ordering | Implemented / locally tested | API and UI controls, isolation tests |
| Per-channel alerts | Implemented / locally tested | PATCH preference, preserves subscription and feed |
| Continue Watching | Implemented / locally tested | Filters completed/hidden videos and respects stored history |
| User data export for new fields | Implemented / locally tested | Tests verify queue and alert preference fields |
| Backend migration compatibility | SQLite additive schema locally tested | PostgreSQL 009 prepared only, not run |
| Cross-browser/network HLS | NOT COMPLETE | Execute on internet-connected Playwright CI and physical Safari/iOS devices |
| Production AWS, legal, identity/rights and security approval | NOT COMPLETE | Requires operator identity, cloud access, external providers and independent review |
