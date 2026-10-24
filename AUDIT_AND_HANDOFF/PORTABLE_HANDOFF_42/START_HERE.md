# StreamAtlas v0.42.0 — Complete checkpoint handoff

## Changes
- Replaced incomplete high/low-only media staging with a graph-checked HLS exporter.
- Exports every locally generated variant, segment, poster/thumbnail, rendition catalog, and database subtitle; refuses unknown files, source symlinks, missing segment references, and unsafe HLS URI dependencies.
- Adds v2 manifest tying each private staged object to an immutable SHA-256 digest and validated per-upload HLS graph; v1 incomplete exports are intentionally not accepted by the new verifier.
- Excludes videos with active safety holds and videos with recorded revoked or expired license reviews.
- Stage directory validation rejects manifest, media-root, and upload-folder symlink redirection. A failure during export deletes the incomplete staging directory.
- Adds regression coverage for referenced variants, forbidden playlist URLs, symlinks, held clips, incomplete renditions, checksums and tampered manifests.

## This is not a production migration
- No upload to AWS, no S3 provider-side object checksum/retention policy validation, and no public CDN has been performed.
- PUBLISHED status and documentary reference strings are not independently verified participant age, rights or consent.
- Staging is still a point-in-time copy: a subsequent takedown or rights revocation must be enforced at destination before any cloud publication.
- Cloud object upload requires preflight reauthorization, complete bucket-level ACL/KMS policies, and independent revocation/cached segment tests.
- B01 reviewed hls.js binary remains missing due to registry DNS EAI_AGAIN. Never load an unpinned CDN script.

## Local checks
```
node --test tests/media-export42.test.js tests/checkpoint18.test.js
npm run qa:inventory && npm run qa:release && npm run qa:release:verify
npm run qa:contracts:strict && npm run qa:dynamic:strict
npm run qa:security && npm run qa:infra
node --test --test-concurrency=2 tests/*.test.js
python -m unittest discover -s qa/tests -p 'test_*.py'
```

## Main-branch-only policy
Do not create branches, worktrees, PRs, tags, or force-push. Preserve currently verified v0.41 GitHub CI additions, sync this cumulative source directly to main after comparing latest HEAD, and commit a regenerated integrity manifest for the final exact source tree.
