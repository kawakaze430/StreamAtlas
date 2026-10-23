# StreamAtlas continuation after Checkpoint 27

Start from `streamatlas-complete-checkpoints-01-to-27.zip`, not an earlier ZIP. Keep the Node/SQLite prototype as the only verified local runtime. Never mark F01–F09 or G01–G05 complete based on this release's static checks.

**Highest priority, when a disposable PostgreSQL 16 server is available:** run the new GitHub Actions `postgres-disposable.yml` (or a controlled equivalent) and resolve any migration SQL failures; check column data types and foreign keys, then execute catalog import with row/FK parity and a real restore drill. Run Maven/Spring tests, build missing modules, add denied-access cases and prove behavior parity before any shadow traffic. CI workflow is a proposal until observed passing logs are available.

**Next 15 original roadmap items to review:** G06–G15 (CDN entitlement, origin bypass, API/worker delivery, geography, WAF, performance, cost and DR) plus J01–J05 (threat model/SBOM, privileged MFA, secret rotation, independent penetration testing and SLOs). For G items, implement only local tests/templates until independent provider, domain, billing, rights and legal approvals are documented. J04 requires independent qualified testing, not an automated self-attestation.

**Local commands:** `npm run doctor && npm test && npm run qa:release:verify && npm run qa:security && npm run qa:browser:offline`. Static DB migration audit: `npm run db:pg:check`; static schema parity: `node scripts/pg-schema-parity.js --sqlite /path/to/disposable.db`; static cutover gates: `node scripts/pg-cutover-preflight.js /path/to/disposable.db`; AWS documentary gates: `node scripts/aws-gates.js`. Real PostgreSQL migration requires an isolated loopback PG16 database named `sa_disposable_*`, an explicit acknowledgment, and installed `psql`; never target production with the provided runner.

**Do not:** deploy to AWS, purchase a domain, modify billing/permissions, claim rights/consent/age verification, enable public hosting, or put private database snapshots into release ZIPs.
