# StreamAtlas v0.36.0 — Engineering Status

| Status | Checkpoint 35 | Checkpoint 36 |
|---|---:|---:|
| Locally implemented | 25 | 26 |
| Partially implemented | 52 | 51 |
| Prepared, not executed | 10 | 10 |
| Externally blocked | 19 | 19 |
| Not started | 11 | 11 |
| **Total** | **117** | **117** |

There are **91 not-locally-complete tasks**: 51 partial + 10 prepared + 19 externally blocked + 11 not started = 91, with 26 locally implemented. Prepared external tasks remain PREPARED rather than falsely being counted as completed or blocked.

## Local engineering evidence

See `tests/checkpoint36.test.js` for account isolation, privacy threshold and analytics permissions, role-change audits and revocation, and hold propagation through stored member data and recommendation feeds. Existing tests must pass before shipping.

## Ownership and blockers

See `AUDIT_AND_HANDOFF/CODEX_USER_BLOCKERS_36.md`. External acceptance and public authorization are not implied by development status. This remains a private synthetic-media prototype.

## Checkpoint 36 acceptance evidence

- Source regression **295/295 passing**, bounded concurrency of 2.
- Offline Chromium audit successful: desktop (1440), tablet (820), mobile (390), synthetic MP4 and accessibility controls.
- Static PostgreSQL schema parity: **62/62 SQLite table names with corresponding DDL**, no missing columns. No PostgreSQL server was run.
- **141 reviewed API operations**, with 32 known static API routes requiring contract review (regex/dynamic inventory is also incomplete).
- Actual browser network/CDN, AWS, Docker/Maven/PostgreSQL acceptance and independent rights/age/security/legal review remain blocked.
