# StreamAtlas v0.38.0 — Durable local upload replay / narrow dynamic contract review

## Implementation (private synthetic sample media only)

- Preserve cumulative Checkpoints 01–37, Node/SQLite prototype, CSS/frontend, sample videos, all deployment drafts and historical status ledgers.
- `src/upload-chunk-store.js`: introduce file-spool **byte-identical replay** without duplicate append; fsync before SQLite received-bytes commit; detect and recover disk-ahead crash residue only when retransmitted bytes match; reject mismatched retries, modified committed bytes, out-of-bounds uploads and symlink spool objects.
- `src/uploads.js`: use the spool helper; conditionally update the database only if status/previous offset still match. Chunk receipt discloses `idempotent` and `recoveredBytes`; progress never advances after mismatched bytes. Published assets remain gated by review.
- Add four pure storage tests, expand the existing HTTP upload test with replay/mismatch/orphaned chunk recovery, and add an OpenAPI contract test.
- Review 11 **specific upload regex-route operations** for OpenAPI (173 → 184). The binary chunk operation is properly described as `application/octet-stream` with required offset/length headers and a typed 200 receipt.

## Important boundaries

- This is **single-node / single-API-writer local resiliency**, NOT a distributed multipart-upload implementation: in-process `busy` sets are not cross-instance locks; multi-host production requires S3 multipart or durable leases, cloud integrity and retry limits.
- Crash recovery handles file-ahead/database-behind only with the **same retried bytes**. File-behind/database-ahead, conflicting bytes and unsafe spools fail closed; manual quarantine/repair is required.
- This checkpoint does NOT establish multi-browser native HLS, a Maven build, live PostgreSQL, AWS IAM/WAF/CDN, real video uploads, security or provider approval.
- Full API contract parity remains incomplete: 184 OpenAPI operations includes 11 reviewed dynamic upload operations, and the static scanner covers only literal source patterns. `0 static gaps` is not `0 total gaps`.

## Rollback

- Use the verified full v0.37 ZIP (`ce58dbc0ab3a2093c7a63e3ed4859a983086373f2bc455c5ffad47a12a196102`) only in a disposable environment after preserving local media/SQLite. There is no production migration or cloud deployment in this checkpoint. The chunk receipt now includes two extra fields, a backward-compatible JSON addition, and exact duplicate retries return `200` instead of prior `409`.

## Testing

See `AUDIT_AND_HANDOFF/PORTABLE_HANDOFF_38/02_VERIFICATION.md` for actually executed commands, counts, limits, and any not-run items. Release integrity is regenerated after source/document edits, and must be rerun from a fresh extracted ZIP.
