# Next steps after StreamAtlas v0.42.0

1. Validate an exact-source sync to existing private GitHub `main` with release checksum and a full CI run (Node, Python, Java, PostgreSQL 16, real Chromium/Firefox/WebKit, Terraform, Docker, audit). Never force-push or create a branch/PR/worktree.
2. Cloud media acceptance: run an explicitly authorized, limited-cost private S3+CloudFront staging drill with the new v2 manifest and per-object ETag/SHA-256 verification; verify an active hold and edge-cached segment revocation.
3. Complete an independently reviewed, locally vendored hls.js library and real adaptive bitrate throttling/recovery tests; the npm registry could not be reached in this environment.
4. Production Node/SQLite -> PostgreSQL/Spring API migration remains incomplete. Implement full authenticated Spring contracts and live catalog/private identity migration with a deterministic rollback plan.
5. No public adult-content release without legal jurisdiction, performer/viewer age assurance, consent/rights, provider, staffed moderation, and independent security acceptance.
