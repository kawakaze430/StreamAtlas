# StreamAtlas v0.45.0 — engineering checkpoint and 62-partial acceptance ledger

Source: v0.44.0 cumulative release. Primary Node/SQLite platform remains a
private, synthetic-media evaluation prototype. **NOT production approved.**

## Delivered and tested in this checkpoint

- **A03**: Browser network tests now create a touch-capable mobile context for
  all three engines and use `is_mobile` where Playwright supports it.
  CI verifies an actual touchscreen-generated touch/pointer event rather than
  assuming `navigator.maxTouchPoints` reflects emulation on Firefox/WebKit.
- **F03**: SHA-verified 10-table export is imported to an explicitly acknowledged
  **disposable loopback PostgreSQL 16**; checks nonempty DB refusal, atomic SQL
  import, row-level comparisons of every field and safe canonical timestamps.
  Added to the hosted PostgreSQL CI job; no identity data is imported.
- **E05/G08/I03**: CloudFront operations use deterministic CallerReference on
  invalidation submission. An operator-only status poller changes jobs from
  REQUESTED to COMPLETED only after the correct provider ID reports Completed.
  Retries and mismatched requests fail closed. This does NOT itself revoke
  issued signed cookies or demonstrate actual CDN invalidation.
- **H08/J02**: Production private preview enforces license review expiry for
  protected media and refuses startup without privileged MFA enforcement.
- **J10**: One acceptance matrix of all 62 original PARTIAL items, never
  self-certifying any legal/security/operational condition.

## Test commands

```sh
npm ci --ignore-scripts --no-audit --no-fund
npm run qa:release:verify
npm run qa:contracts:strict
npm run qa:dynamic:strict
npm run qa:security
npm run qa:infra
npm test
python -m unittest discover -s qa/tests -p 'test_*.py'
python scripts/partial-acceptance-matrix45.py
```

Only the hosted disposable PostgreSQL job may execute the live catalog import;
requires `SA_PG_DISPOSABLE=YES_I_ACCEPT_DATA_LOSS`, `PGHOST=127.0.0.1` and
`PGDATABASE=sa_disposable_*`. The CDN poller requires
`SA_AWS_INVALIDATION_ACK=YES`; **do not run it against AWS without a separate,
explicit user-approved private staging operation**.

## Remaining P0 acceptance

Distributed private storage, worker isolation, authorization API parity,
true cloud CDN revocation, actual provider-reviewed age/rights, security scans,
realistic load/restore, and staffed moderation remain unverified. Detailed
per-task remaining acceptance appears in
`AUDIT_AND_HANDOFF/UPDATED_117_TASK_ROADMAP_45.md`; final one-session Codex
technical audit scope is in `docs/CODEX_FINAL_62_PARTIAL_ACCEPTANCE_45.md`.

## Checkpoint 45 CI evidence-summary hardening

The required disposable PostgreSQL full-row catalog parity check is registered
in the exact-commit CI evidence aggregator. Missing, stale, or failing parity
evidence cannot be misreported as a successful completed suite. This is
synthetic/disposable verification only, not production database cutover.
