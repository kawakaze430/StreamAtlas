# Hosted CI proof and still-blocking release gates — 2026-10-24

## Verified main-only GitHub Actions

- Repository: private `kawakaze430/StreamAtlas`.
- Exact tested HEAD: `2416f6c129b1580eeeeee02e8492ccdef50c3555`.
- Comprehensive workflow run: https://github.com/kawakaze430/StreamAtlas/actions/runs/40064661241 — **SUCCESS**, all 15 individually reported jobs passed.
- Passed categories: Node regression batches, committed integrity/contracts, disposable PostgreSQL 16 migrations/concurrency, Java 21 Spring controller tests, real Chromium, Firefox and WebKit/axe, synthetic offline Chromium MP4 playback, Terraform queue/media-cdn/edge-waf validation, Docker/Compose, security and dependency inventory, exact-commit evidence summary.
- The offline Chromium job was repaired by using preinstalled Google Chrome on pinned `ubuntu-24.04` instead of Snap Chromium lacking MP4 codec support. The real MP4 playback acceptance remained enabled and subsequently PASSED.
- These are hosted validations for **the specified GitHub commit only**. The local cumulative 0.41 ZIP also contains new application files not fully synchronized to GitHub; independently run full local Node/Python and offline Chromium tests against the ZIP.

## Local cumulative artifact

- Version `0.41.0` preserves application Checkpoints 01–41 **plus** later Codex CI evidence/test files merged from exact committed GitHub source archive.
- Full 321 Node tests, 21 Python tests, offline Chromium desktop/tablet/mobile, static contracts/dynamic route gate, security/infra policy and release digest all passed locally.
- The ZIP is not a live deployment, not proof of Node/Spring API parity and not an AWS production acceptance artifact.

## Production gate remains closed

- No public adult-content service launch without independent jurisdiction/legal review, verified participant rights and consent, provider approval, viewer age assurance, safety/moderation escalation, security penetration testing, actual managed cloud (data/media/CDN) staging, load and restore/DR results and operational staffing.
- Do not claim AWS production readiness, publish content, expose sensitive media or spend cloud credits without explicit authorization.
