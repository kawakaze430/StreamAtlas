# Minimal Codex Cloud test-only task — use once if GitHub Actions is insufficient

## Setup (one-time)

1. Create a **private GitHub repository**, extract `streamatlas-complete-through-38.zip` and commit the extracted project contents with no `.env`, private database, unapproved media, tokens or identity documents. Prefer GitHub Actions directly if possible.
2. In Codex Cloud, connect that repository and create a cloud environment. Use only a **throwaway Linux environment** and no AWS/Azure/payment credentials. Do not turn on arbitrary outbound traffic to production services.
3. Paste the prompt below. Output evidence for ChatGPT; no source modifications or complete replacement project ZIP required from Codex.

## Paste to Codex Cloud

> You are a **test-only external runtime executor** for StreamAtlas **v0.38.0**. My regular ChatGPT environment already implemented the features and ran local Node/SQLite, FFmpeg, synthetic video tests, static PG checks, security/infra scanners, and offline Chromium. **Do not repeat those tests**, write features, refactor, edit source files, change dependency versions, use cloud provider credentials, deploy, create public access, or consume paid services. Keep all tests synthetic and non-explicit.
>
> First check existing `.github/workflows/postgres-disposable.yml` and `.github/workflows/qa-checkpoint21.yml`. If CI logs already clearly prove any of the items below passed for this *exact commit*, record evidence and SKIP rerunning that item.
>
> **Only do genuinely missing external runtime checks, in this order:**
>
> **1. Disposable PostgreSQL 16** (only if Docker/service and `psql` are available). Create an isolated loopback PG database whose name starts `sa_disposable_`. Explicitly verify `PGHOST=127.0.0.1`, `PGDATABASE=sa_disposable_...`, `SA_PG_DISPOSABLE=YES_I_ACCEPT_DATA_LOSS`, and `PGUSER` are set. Then run `npm run db:pg:apply:disposable`, `npm run db:pg:verify:disposable`, and `npm run db:pg:concurrency:disposable`. Never point scripts at a shared database. Do not attempt a destructive rollback on unowned infrastructure; report rollback NOT RUN without an approved safe fixture.
>
> **2. Java 21 / Maven Spring compile** (only if installed or already available in the environment): run `mvn -f backend-spring/pom.xml -B -ntp test`. Record success, test count and build errors. Do not treat successful compile as feature parity with Node.
>
> **3. Real browser engines** (only if already configured and sufficiently provisioned): with Playwright 1.56.0 installed and browser binaries available, run `python qa/network-e2e.py --engines chromium firefox webkit --strict --output reports/qa-browser-results.json`. Report each engine PASS/FAIL/NOT RUN separately. Distinguish localhost UI QA from physical Safari/iOS/Android tests and adaptive CDN playback. If network installs are disabled, do not struggle; state the exact missing dependency and stop that section.
>
> **Output only:** `CODEX_EXTERNAL_TEST_EVIDENCE.md` containing git commit, UTC timestamp, OS/tool versions, environment, each exact command, exit code, PASS/FAIL/NOT RUN, minimal sanitized log excerpt, reproducible blocker for every failed check, and unverified production tests. Include `reports/qa-browser-results.json` if produced. Do not upload personal data, keys, databases or real footage. Do not modify application/CI files or submit any deployment. No test pass should be inferred or fabricated. Avoid automatic retries and long unrelated investigations. Stop after these three categories, even if there are other project TODOs.

Bring back only this evidence file / small sanitized logs. ChatGPT will own any fixes, tests, updated 117-task ledger, and next complete ZIP.

## Better quota-saving option

The repository already defines these external tests in GitHub Actions. Running that CI and giving ChatGPT the **actual failing logs** can avoid a Codex Cloud task entirely. Real device, AWS staging, age/consent/legal and pentest approval cannot be earned from a CI or Codex report.
