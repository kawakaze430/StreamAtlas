# Checkpoint 19 — Production-readiness engineering pass

**Scope:** build on v0.18.0 without discarding or pretending to complete the
Node/SQLite full application. Includes both a runnable prototype and carefully
labeled preparation for future third-party services.

## Completed locally and tested

- **Formal content cases:** copyright, consent, age, privacy and other complaints;
  per-user case listing, priority queues, administrator disposition, append-only
  case events and uploader appeals. The case API never re-publishes media.
  Existing emergency hold workflow remains separate and active.
- **Browser/media audit:** unmodified application frontend renders 9 desktop,
  tablet and mobile states; desktop Chromium decodes and plays a real original
  8-second MP4 sample, playback advances, speed selection works, and the
  formal-case form submits using the demo account. Network navigation/HLS and
  Safari/WebKit are NOT tested.
- **Verification integration contract:** timestamped HMAC-SHA256 callbacks,
  signature validation, event-ID replay protection, expiry checks and privacy-
  minimized receipts (no stored DOB/ID image). No external vendor integration or
  proof of age assurance effectiveness is claimed. App-level public-content mode
  is deliberately disabled even when SA_PUBLIC_CONTENT_MODE=1 is set.
- **CloudFront policy signing:** local RSA policy signatures and three scoped
  CloudFront cookies for a manifest and relative segments, with path/host/TTL
  input validation and unit verification. Does NOT grant any user entitlement.
- **Private AWS IaC template:** S3 block public access, ACLs disabled,
  versioning, SSE encryption, CloudFront OAC and key-group restricted paths.
  No account resources created; no actual CDN signed-cookie/browser test.
- **Operations metrics:** authenticated, low-cardinality Prometheus text metrics
  (no raw URLs, email, tokens, or identifiers). Does not replace central logging.
- **Offline restore drill:** fresh synthetic SQLite catalog + private sample video
  encrypted, backed up, restored to new path and verified by SHA and SQLite
  integrity check. No actual AWS recovery drill or user-data restore performed.
- **Local load smoke:** bounded loopback-only request test with p50/p95/p99,
  throughput and failed-request counts; not representative of global traffic.
- **Migration template:** additive PostgreSQL migration 005 for cases, appeals,
  events and verification receipts, with disposable-lab wiring.

## Substantial items still genuinely incomplete

- No installed PostgreSQL service, Docker engine, Terraform binary or Maven:
  new migration and Terraform cannot be executed locally; Spring Boot still a
  read-only starter, not the full backend.
- No pinned reviewed hls.js binary because npm registry DNS lookup is blocked.
  Desktop adaptive ABR and network HLS are not verified. The original MP4
  decodes successfully in Chromium only.
- No AWS/registrar login, domain registration, HTTPS issuance, bucket/CDN
  construction, offsite recovery drill, or live CloudFront playback.
- No formal licensed content catalog, legally reviewed permitted jurisdictions,
  approved age-assurance vendor or participant age/consent workflows. Signed
  receipts are ONLY vendor-integration scaffolding, not legal certification.
- No completed formal operator incident response, DSA/DMCA counsel review,
  penetration test, multi-zone failover, malware scanning independent assessment
  or third-party provider approvals.

### Why public launch remains blocked

External law, content licensing, adult-participant verification and suitable
viewer age assurance cannot be turned into a "done" status by writing code.
`npm run launch:preflight` fails closed; `SA_PUBLIC_CONTENT_MODE=1` stops startup.
Local demo with **non-explicit synthetic content** may be evaluated privately
behind the provided password-protected gateway.

### Commands

```bash
npm run doctor
npm test
npm run audit:offline-browser    # requires Python Playwright + Chromium
npm run recovery:drill            # self-contained synthetic backup/restore
npm start
npm run load:local -- http://127.0.0.1:3000 180 15
npm run launch:preflight         # deliberately exits with public-launch BLOCKED
```

See `docs/AWS_EXECUTION.md` and `docs/PRODUCTION_GATES.md` for verified and
unverified integration boundaries.
