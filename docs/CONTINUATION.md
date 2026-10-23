# Continuation after v0.20.0

The next work is no longer just adding checkboxes or local scripts. It requires **actual external execution**: (1) run networked cross-browser HLS/ABR and review/vendor hls.js; (2) provision disposable PG 16 and build the Spring Boot starter, perform verified staged migration of authenticated APIs and rollback testing; (3) obtain AWS account authorization, private preview domain, TLS, S3/OAC/CloudFront and signed-cookie/unsigned access tests; (4) integrate audited age provider and secure participant/license evidence service with legal advice; (5) third-party security review, production-email and real disaster recovery/load/on-call. Do not label public launch ready based on test counts.

The cumulative full-source checkpoint is `streamatlas-checkpoint-20`, with tests, private preview operations, and open gates detailed in `docs/ACCEPTANCE_MATRIX_20.md`. No earlier ZIP is required.

---

# Continue after v0.18.0

Start from `streamatlas-complete-checkpoints-01-to-18.zip` and preserve all previous features/tests. Check `docs/ROADMAP_14_18.md` for verified vs incomplete work.

1. Run `npm test`, `npm run audit:offline-browser`, and the manual GitHub Actions `browser-checkpoint18.yml` workflow. Fix true network browser failures, especially hls.js and media segment access.
2. Run disposable PostgreSQL Lab Compose (`deployment/postgresql/`), import catalog fixture, use `SA_CI_DISPOSABLE_DB=YES scripts/pg-verify-catalog.sh`, then build and run Spring Boot starter. Do not claim runtime cutover until Node API parity and privacy migrations pass.
3. Run Docker worker isolation and private AWS Compose on a lawful/authorized synthetic preview; add malware scan and resource caps, independent queue, S3 private source media, CDN signed access, and genuine outage monitoring. No real adult media until legal approval.
4. Integrate verified identity/age/rights providers and documented takedown/appeal workflows, audited by counsel and security reviewers in each intended jurisdiction. Never treat checkbox/references as proof.
5. Add load/failure tests, backup/restore drills, CI artifacts, IAM key handling, renewal/expiry alerts, and deployment rollback. Only then evaluate public availability.

On each new release: ship the **entire source ZIP**, exclude runtime DB/credentials/raw uploads, report actual test counts and unverified gates, and preserve old SQLite schema compatibility.


## After checkpoint 19
Use `docs/RELEASE_19.md` and `docs/PRODUCTION_GATES.md` as the most recent verified state. External AWS, verification-provider, PostgreSQL, HLS and legal obligations are NOT done and cannot be inferred from tests or IaC templates.
