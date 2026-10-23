# A03/A05 — Browser, accessibility, and device QA

## Tooling
- **Actual network QA:** `qa/network-e2e.py` (pinned Python Playwright 1.56.0). Runs two viewport profiles across Chromium/Firefox/WebKit with real `page.goto`, JS error traps, keyboard checks, auth route protection and UI assertions. CI injects `axe-core@4.10.3` from a local npm package; no remote script URL. Strict mode returns failure for crashes, missing browsers, blocked navigation, failing accessibility assertions, or incomplete tests.
- **Offline fallback:** `scripts/offline-browser-audit.py` uses a disposable local API plus DOM-injected JS because this container blocks Chromium `localhost` navigation. It is not equivalent to network E2E and is reported separately. Adds `qa/a11y-audit.js` heuristic audit; JSON evidence is written to `<SA_AUDIT_OUTPUT>/accessibility-heuristic.json`.
- **Regression test:** `tests/qa-contract.test.js` creates ephemeral viewer, creator, moderator, administrator fixtures, performs actual HTTP calls against a disposable Node server, and enforces permission boundaries + CSRF.

## Local QA results in this checkpoint

| Check | Result | Limit |
|---|---|---|
| Chromium desktop 1440, tablet 820, mobile 390 responsive overflow | PASS in offline Chromium harness | No true network browser navigation |
| Reactivity: category/search/watch page, demo login, report | PASS in offline harness | DOM-injected UI + proxied real APIs |
| Synthetic 8s MP4 decoding and time progression | PASS in Chromium offline harness | No HLS, Firefox, Safari or network throttling |
| Keyboard focus reached logo link | PASS in offline harness | Not exhaustive tab-order or screen-reader coverage |
| Labels on visible watch page | Fixed comment-textarea missing label; heuristics rechecked | Not a formal WCAG audit |
| Contrast heuristic | 130+ sampled visible elements/viewport; no ratio below 3 observed | Cannot replace axe-core and human visual review |
| Captions | Missing on synthetic watch sample | Uploaded caption-media tests + human language/sync verification needed |
| Chromium network `page.goto` | BLOCKED (`ERR_BLOCKED_BY_ADMINISTRATOR`) | Must run on CI/developer machine |
| Firefox/WebKit native browser | NOT RUN here (binaries unavailable) | CI runner installs them |
| axe-core WCAG A/AA | NOT RUN here (offline package unavailable) | CI fails if unavailable |

## Device/accessibility acceptance before production

1. Keyboard-only full session (skip link, modal focus trap/restore, dialogs, control labels, and all player controls).
2. WCAG 2.1 AA axe audit for homepage/watch/search/library/studio/admin on desktop and mobile. Fix violations; attach CI artifact.
3. Screen-reader tests (NVDA/JAWS/VoiceOver/TalkBack), accessible notifications/error states, semantic landmarks, and appropriate heading order.
4. Quality/track controls and synchronized human-reviewed captions on real authorized assets.
5. Chrome, Firefox, WebKit, Safari on iOS, Android Chrome; repeat under slow-3G/4G throttling and limited CPU; test signed HLS and expired tokens.
6. Verify no image missing textual alternatives and normal text contrast >=4.5:1 (large text >=3:1); the heuristic <=3 check is only a preliminary safety check.

## How to run
```
python -m pip install playwright==1.56.0
python -m playwright install chromium firefox webkit
# For WCAG analysis: npm install --no-save axe-core@4.10.3
SA_QA_REQUIRE_AXE=1 python qa/network-e2e.py --engines chromium firefox webkit --strict
SA_AUDIT_OUTPUT=/tmp/sa-offline npm run qa:browser:offline
```
Do not set CI to green by removing strict mode or swallowing failed browser commands.
