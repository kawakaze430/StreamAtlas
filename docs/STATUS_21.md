# Checkpoint 21 — A01–A08 acceptance and remaining work

**Release:** StreamAtlas v0.21.0. Private synthetic-media demonstration only. Source is cumulative from Checkpoint 20. No AWS deployment, external approval, adult-media rights verification, production database cutover, or public launch.

| ID | Acceptance goal | Delivered | Final status |
|---|---|---|---|
| A01 | Snapshot v0.20; inventory routes/API, SQL schema, assets/risks; reproducible manifest | `qa/BASELINE_V020.json` has immutable source archive hash; `qa/inventory.json` enumerates source SHA256, 44 SQLite tables, SQL migrations, routes/assets; `qa/release-manifest.json` and verifier; deterministic ZIP builder | **Done for current source snapshot** |
| A02 | Current journeys and parity | `docs/JOURNEYS_AND_PARITY_21.md` maps 16 flows to pages, API, roles, and observed or unverified evidence | **Documented; external flows pending** |
| A03 | Playwright full network Chromium/Firefox/WebKit/mobile | `qa/network-e2e.py` launches real browsers and fails strict gates; CI installs all engines and runs desktop/mobile; sample Chromium here blocked by `ERR_BLOCKED_BY_ADMINISTRATOR` | **Implemented, network matrix NOT passed here** |
| A04 | Private ephemeral role accounts | `scripts/qa-fixtures.js` creates randomized viewer, approved creator, moderator and administrator in test-only `/tmp` DB; refuses other envs; fixture HTTP permission tests | **Implemented/tested** |
| A05 | Keyboard/focus/captions/labels/contrast/overflow | Chromium offline heuristics, focus/tab audit, contrast samples, overflow checks, fixed video comment field `aria-label`; network runner invokes pinned axe-core WCAG rules if installed | **Partial — axe, captions sync, screen readers, full focus, Safari/mobile testing pending** |
| A06 | OpenAPI and behavioral contracts | `contracts/openapi.json` 44 explicitly reviewed operations (42 unique paths), shape assertions, login-role-CSRF tests; `qa/contract-gap-report.json` lists **38 static endpoint operations without reviewed contract**, plus dynamic matchers pending | **Partial — entire Node API not fully specified** |
| A07 | CI gates | `.github/workflows/qa-checkpoint21.yml`: regressions, manifest, local source scan, `npm audit`, Chromium/Firefox/WebKit real network + axe, offline audit; previous `verify.yml` includes PostgreSQL/Maven and Docker builds | **Configured, not run on GitHub in this session** |
| A08 | Release tags/changelog/upgrade/rollback + failure tests | `docs/CHANGELOG.md`, SHA256 source/ZIP, `docs/UPGRADE_ROLLBACK_21.md`, tamper/missing-file failure tests, strict CSRF and role-denial integration tests | **Local verification complete; Git tag/push/live rollback not executed** |

## Reproducible commands

```bash
npm test
npm run doctor
npm run qa:contracts:gap
npm run qa:release:verify
npm run qa:security
SA_AUDIT_OUTPUT=/tmp/streamatlas-audit npm run qa:browser:offline
# On a machine with Playwright browsers and axe-core installed:
SA_QA_REQUIRE_AXE=1 npm run qa:browser:network
# Rebuild a normalized cumulative source ZIP:
npm run qa:zip
```

## Evidence at checkpoint creation

- Node regression and behavioral contracts: **133/133 passing** (127 baseline + six checkpoint tests).
- Offline Chromium: three viewport audits and real 8-second synthetic MP4 decode/playback; no horizontal overflow, keyboard focus reached the logo link, no missing form-label heuristic after fix on audited pages. Caption track on baseline sample is absent and flagged for manual work.
- Real browser network attempt: **FAILED due to environment restriction** `net::ERR_BLOCKED_BY_ADMINISTRATOR` when visiting localhost; Firefox/WebKit and axe-core are untested here.
- Source snapshot and ZIP: archive normalized and SHA-256 sidecar; clean extraction tests must be rerun after any changes.
- Release static/source scan does **not** replace third-party dependency vulnerability scanners, an independent penetration test, or provider authorization.

## Next required engineering work

1. Execute new strict network CI on a GitHub repository and fix UI/semantic/axe issues it finds. Add WebKit/iOS and Firefox actual HLS, caption-switch, bitrate throttling tests with authorized media fixtures.
2. Review the **38 static** undocumented operations and additional regex dynamic routes/binary uploads; expand OpenAPI and behavioral tests to complete coverage.
3. Approve CI evidence and manually create a Git release tag. Rehearse upgrade and safe rollback in a separate environment, keeping rights revocations and takedowns current.
4. Complete remaining infrastructure/application work (live PG and Spring cutover, authorized S3/CloudFront, verified age/rights/consent providers, moderation operations, AWS domain) before any public distribution.
