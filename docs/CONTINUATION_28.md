# Next StreamAtlas continuation after Checkpoint 28

Start from the complete `streamatlas-complete-checkpoints-01-to-28.zip` cumulative source. Do not reimplement existing local features or mark G06–G15/J01–J05 production complete. Retain the fail-closed no-public-launch posture.

**Highest technical priority:** execute the disposable PostgreSQL 16 migration and Spring Boot compilation workflows in an isolated environment with actual `psql`, Maven and Terraform CLI, fixing observed errors rather than inferring success from static templates. Then implement API parity for Spring auth, libraries, moderation, uploads and denied-access contracts. No production database cutover until tested backups and rollback.

**Next 15 roadmap tasks to assess** by dependency and feasibility: H01–H10 (external age, rights, consent, privacy, territory launch gates) plus J06–J10 (metrics/on-call, complete restore, load/soak, rollback/failover, evidence-based launch checklist). H01/H02/H03/H06/H09/H10 are external approvals and cannot be self-completed. Implement only local safeguards and reproducible synthetic tests until external providers and legal counsel supply genuine evidence.

**Cloud guardrails:** never run Terraform apply, deploy ECS/SQS/WAF, access AWS billing, buy DNS, or expose real media without explicit account-owner/provider/legal approval. `SA_ENFORCE_TERRITORY` requires a trusted proxy that strips and re-signs geo headers. The local CDN revocation inspector is a simulation; test actual unsigned/expired/held CDN behavior only in approved private staging.

**Local QA:** `npm test`, `npm run qa:infra`, `npm run qa:security`, `npm run qa:release:verify`, and `npm run qa:browser:offline` if Playwright/Chromium are available. The CI workflows have not been observed passing.
