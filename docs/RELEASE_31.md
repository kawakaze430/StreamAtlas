# Checkpoint 31 — local engineering and blockers

## New locally verified functionality
- Advisory comment-abuse signals with PENDING/CONFIRMED/DISMISSED human decisions, explicit admin-only review APIs, audit entries and UI.
- Duplicate-video candidate review with human decisions and no automatic merge, delete or content restoration.
- SQLite schema additions and PostgreSQL migration `016_comment_abuse_and_duplicate_review.sql` (only statically validated here).
- Four new OpenAPI operations for admin review.

## Honest task changes
- I08 **NOT_STARTED → LOCAL** after specific integration and authorization tests.
- D06 stays PARTIAL (SEO, safe asset merge and other requirements remain).
- A06 stays PARTIAL (100 reviewed operations, not complete server API parity).

Engineering status counts: {'LOCAL': 23, 'PARTIAL': 51, 'NOT_STARTED': 14, 'BLOCKED': 19, 'PREPARED': 10} (117 total).
Queue assignment counts: {'LOCAL_VERIFIED': 23, 'BLOCKED_CODEX_USER_ENVIRONMENT': 60, 'LOCAL_ENGINEERING_QUEUE': 22, 'BLOCKED_EXTERNAL_PROVIDER_OR_LEGAL': 12}.
These queue assignments reflect **where validation must happen**, not software completion.

## Runtime limitations
No local Docker, `psql`, Maven, authenticated AWS account, production mail/payment provider, certified age-assurance provider, participant evidence verification, legal approval or independent pen test. Do not interpret draft integrations as functional public deployments.

## Validation commands
`npm test`; `npm run qa:openapi`; `npm run db:pg:check`; `npm run qa:release:verify`; `npm run qa:browser:offline`.
