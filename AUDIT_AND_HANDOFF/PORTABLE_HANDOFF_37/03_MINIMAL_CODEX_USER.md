# External-only work (not done at checkpoint 37)

Reserve Codex/user execution for tests needing unavailable runtimes, physical devices or private infrastructure: `npm run db:pg:apply:disposable` and concurrency/rollback on real disposable PostgreSQL 16; `mvn test` or `mvn verify` under `backend-spring/` with actual JDK/Maven; strict real browser test matrix in `qa/network-e2e.py`; real S3/CloudFront/RDS/WAF/IAM/DNS/ACM/HTTPS private staging only after authorization, budget and credentials; signed HLS revocation, load/DR; independent security, legal, age/consent/rights and provider approval. No external commands executed by this handoff.

Store evidence with environment, command, outputs and secret-free logs. Never upload production tokens, creator identity documents, explicit media, or runtime databases into chat/ZIP.
