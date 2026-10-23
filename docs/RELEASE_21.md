# StreamAtlas checkpoint 21: A01–A08 reproducible QA

## Delivered source changes
- `qa/BASELINE_V020.json` records SHA256 of the immutable checkpoint-20 input archive.
- `scripts/qa-inventory.js`, `qa/inventory.json`, `scripts/qa-release.js`, `qa/release-manifest.json`, `scripts/qa-release-verify.js`: per-file SHA256, SQL table inventory, source-detected literal API routes, checked-in source digest, repeatable verification.
- `docs/JOURNEYS_AND_PARITY_21.md`: journey-by-journey UI/API/role/status matrix.
- `qa/network-e2e.py`: Playwright real localhost browser runner for Chromium, Firefox and WebKit; desktop/mobile, access guard, search/watch, keyboard, local axe-core.
- `scripts/qa-fixtures.js`: randomized ephemeral viewer/approved-creator/moderator/admin database fixtures, with fail-closed temporary-path guard.
- `qa/a11y-audit.js` and improved offline Chromium harness: focus, contrast sampling, semantic labels, sample captions warning, screen overflow.
- `contracts/openapi.json` and `scripts/qa-openapi.js`: explicit 44-operation OpenAPI 3.1 spec; real HTTP contract tests for shape/session/role boundaries.
- `.github/workflows/qa-checkpoint21.yml`: Node regression/contracts, manifest validation, local dependency audit, strict multi-engine browser/axe gates.
- `docs/ARCHITECTURE_DECISIONS_21.md`, `docs/UPGRADE_ROLLBACK_21.md`: architecture decisions, release and rollback procedure, failure-oriented checks.
- `public/app.js`: add `aria-label` to comment textarea after offline audit detected an unlabeled control.

## Results and limits
- No production code/backend migration. Existing synthetic media and protections preserved.
- Node suite: see the current `npm test` output; baseline 127 tests.
- Offline Chromium: homepage/category/watch across desktop 1440, tablet 820 and mobile 390, sample MP4 and keyboard tab; sample captions absent (manual/pending).
- Actual network Chromium navigation in this sandbox reports `ERR_BLOCKED_BY_ADMINISTRATOR`. Firefox and WebKit not exercised locally. Axe package not fetched offline. Their CI jobs are configured, **not claimed to have passed**.
- 44 core OpenAPI operations are a reviewed subset, **not the full API**; route inventory includes additional static/dynamic endpoints requiring detailed contracts.
- GDPR/content rights/legal age assurance/cloud production approvals are NOT completed by this QA checkpoint.

## Remaining OpenAPI gap report
`npm run qa:contracts:gap` writes `qa/contract-gap-report.json`. This lists literal API operations not yet described in reviewed OpenAPI. Dynamic regex matchers and binary media/upload flows need a separate manual contract review. This transparency prevents claiming API completeness before it is achieved.
- A08 fail-closed source-tampering test: verifies clean copied files, rejects an altered app.js, rejects a missing server module.

## Deterministic cumulative ZIP
`python scripts/build-qa-zip.py /absolute/path/release.zip` builds a time-normalized, alphabetically sorted ZIP from source, excluding all runtime databases, uploaded media, credentials and test screenshots. The `.zip.sha256` sidecar records the byte-level archive checksum. The same files and version produce the same archive SHA-256 on repeated runs in a compatible Python/zlib environment.
