# StreamAtlas Checkpoint 44 — 117-task ledger

The baseline is Checkpoint 43. **The 11 formerly NOT_STARTED task IDs now have local code and tests and are classified PARTIAL, not complete.** These are controlled experiments, review/policy boundaries and offline planning; they do not replace device, cloud, provider, legal or production acceptance.

## Counts

| Local complete | Partial | Prepared / not executed | External blocked | Not started | Total |
|---:|---:|---:|---:|---:|---:|
| 26 | 62 | 10 | 19 | 0 | 117 |

## Task-specific evidence and remaining gaps

### B01 — Vendor a reviewed, pinned hls.js version locally with integrity and license verification.

**Implemented:** Added offline SHA-256 and Apache-2.0 hls.js vendor guard; runtime bundle not yet acquired or independently reviewed.

**Test evidence:** 33 new Node tests, including license/digest/tamper; no real vendored binary or device validation.

**Remaining acceptance:** Pinned reviewed hls.js binary not vendored and audited locally.

### B05 — Test automatic ABR changes under throttled bandwidth and packet loss.

**Implemented:** Added deterministic rendition throttling/loss and buffer simulation with switch/stall evidence; genuine hls.js ABR browser trial still required.

**Test evidence:** 33 new Node tests including loss and invalid level cases; real ABR untested.

**Remaining acceptance:** No observed genuine ABR throttling/packet-loss acceptance.

### B16 — Optional Cast/AirPlay and appropriately licensed offline downloads.

**Implemented:** Added gated AirPlay/Cast capability policy with entitlement and gesture requirements; no Cast SDK or physical device session.

**Test evidence:** Local positive/denial cases passed; physical device acceptance not run.

**Remaining acceptance:** No verified Cast/AirPlay or licensed offline download subsystem.

### D09 — Migrate search to OpenSearch only after measuring database-search limits.

**Implemented:** Added representative sample, latency and budget gates for controlled OpenSearch experiments; no migration or cloud index.

**Test evidence:** Local threshold/invalid-measurement tests passed; representative load not measured.

**Remaining acceptance:** Only tiny SQLite benchmarks; no evidence-based OpenSearch migration or deployment.

### F07 — Run Node-vs-Spring API contract and authorization parity tests, including denial cases.

**Implemented:** Added read-only Node/Spring comparison including mismatched deny status and NOT_RUN results; APIs still lack full behavioral parity.

**Test evidence:** Local response comparison tests passed; authenticated live service parity remains required.

**Remaining acceptance:** Static route comparison showed 0 matching routes; behavioral parity not established.

### F08 — Perform controlled dual-read/shadow mode or maintenance-window cutover with checkpointed rollback.

**Implemented:** Added conservative read-only canary eligibility and rollback plan; no automated cutover or live dual reads.

**Test evidence:** Local unsafe/blocked decision tests passed; real restore/cutover not executed.

**Remaining acceptance:** No actual shadow reads, live cutover or rollback exercise.

### G15 — Evaluate secondary region/multi-AZ DR after proving demand and SLO need.

**Implemented:** Added SLO- and demand-based secondary-region evaluation with no deployment rights.

**Test evidence:** Local policy decision tests passed; second region not deployed or tested.

**Remaining acceptance:** Multi-region DR decision helper only; no second-region exercises.

### J12 — Perform multi-AZ chaos testing and multi-region recovery if justified by traffic and business requirements.

**Implemented:** Added bounded synthetic fault-injection, data preservation checks and unsupported-fault rejection.

**Test evidence:** Local recovery/injected failure tests passed; no real AZ/region chaos.

**Remaining acceptance:** No multi-AZ/multiregion chaos or recovery exercise.

### K02 — AI-assisted captions, metadata and tag suggestions with manual review.

**Implemented:** Added pluggable model-result validator for metadata/captions with manual review and no autopublish; no approved model account.

**Test evidence:** Local output schema/overlap/prompt-tamper/review tests passed; no approved model call.

**Remaining acceptance:** Local tag matching is not AI. Model/provider-assisted caption or metadata suggestions with human review are not implemented.

### K07 — Creator earnings, approved partnerships and deeper analytics.

**Implemented:** Added exact BigInt minor-unit earnings drafts with partner/contract/reviewer gate and no transfers.

**Test evidence:** Local idempotency, accuracy, denied partner tests passed; financial/provider approvals pending.

**Remaining acceptance:** No verified creator earnings/payout partnership platform.

### K08 — Account-controlled offline access to videos with explicit download licenses.

**Implemented:** Added explicitly licensed per-device offline entitlement and authenticated fixture-encryption boundary; no deployed DRM/offline browser cache.

**Test evidence:** Local expiry/hold/device/tamper tests passed; no online revocation service/DRM certification.

**Remaining acceptance:** No consent/entitlement-checked encrypted offline download implementation.

## Next engineering ownership

1. **B01 and B05:** independently verify hls.js 1.7.3 upstream bundle/license and pin digest, vendor using SHA check; test actual ABR switches with packet loss and fallback in Chrome, Firefox, WebKit, Safari/iOS, Android.
2. **F07/F08:** map exact Node and Spring authenticated and denial endpoints, instrument read-only shadow traffic, verify managed PostgreSQL backups and failback before any production traffic movement.
3. **K02/K07/K08/B16:** provider/business approvals first. No unapproved AI content publication, finance transfers, downloadable adult-content media or hardware casting.
4. **D09/G15/J12:** acquire representative metrics and SLO measurements and carry out private cloud chaos/recovery with authorization; no unreviewed region expansion.

Independent age assurance, rights and consent, takedown operations, hosting acceptance, legal geofencing and security review remain external public-release blockers.
