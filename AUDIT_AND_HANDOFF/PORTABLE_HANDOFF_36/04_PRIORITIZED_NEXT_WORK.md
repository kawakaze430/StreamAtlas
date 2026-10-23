# Prioritized continuation plan: code-owned first, true external work second

The user has limited Codex/Astra usage. Another AI coding model should implement most source changes in its own accessible workspace, using Codex/user actions **only for blocked execution**. Do not attempt to close all 91 unfinished tasks by merely changing their label.

## Recommended next coding sequence

These are suggested priority clusters, **not declarations of completion**. Cross-reference each ID with `03_ROADMAP_BY_TASK.md` and the code/test modules before starting.

| Priority | Roadmap IDs | Specific deliverable and honest local completion test |
|---|---|---|
| 1 | A06, A07 | Audit all static/dynamic routes against OpenAPI; implement meaningful request/response/auth/negative-case schemas; CI diff should fail on uncovered handlers; 32 known static gaps at baseline |
| 2 | E01, E02, E03 | End-to-end upload/media tests incl multipart resume, concurrent idempotency, corrupt inputs, worker interruption and DLQ; preserve quarantine and human review |
| 3 | E05, E06, E10 | Creator metadata/bulk/review lifecycle with role-gated state machine; prove scheduling never bypasses moderation, all audit transitions retained |
| 4 | D02, D04, D06 | Search taxonomy/tag facets, duplicates/merge review, regression for restricted content and stable cursor pagination; benchmark SQLite before proposing OpenSearch |
| 5 | D08, D10, K03 | Deterministic recommendations offline evaluator, cold-start/quality/diversity/safety metrics, negative safety tests, scale benchmarks; no unsupported AI/A/B claims |
| 6 | B03, B04, B06, B07, B12, B14 | Hardening captions, HLS ladder, seek/thumbnail/cue UX, client fallback and QoE; finish local automated coverage, route actual device tests to external handoff |
| 7 | C04, I01–I05 | Cross-session preference consistency and moderation queue/action/race/access audits; hold and takedown fanout tests |
| 8 | H04, H05, H07, H08 | Rights/territory/holds propagation and evidence-reference access; fail-closed tests; independent proof remains blocked |
| 9 | J01–J03, J06, J08–J10 | Security negative tests, synthetic load/soak, runbooks, SLO monitoring/thresholds, controlled restart and rollback drills |
| 10 | F02–F04, F06, F07 | Prepare PostgreSQL migration and Spring auth parity implementation, unit/contract suites and scripts; actual compile/DB execution via Codex if not available |

## Coding agent process

1. Pick a dependency-coherent group of tasks, not random screen mockups. Inspect relevant source and prior test failures.
2. Prefer meaningful done criteria and representative negative tests: state transitions, authorization, privacy, safety holds, retries, idempotency, no data loss.
3. Apply minimal backward-compatible migrations; never modify seed/runtime data as a substitute for a migration.
4. Run targeted tests, full suite, offline browser if available, static audits, release integrity and clean ZIP extraction.
5. **Only promote tasks where the ledger's remaining acceptance criteria are demonstrably met in this environment.** For missing externally necessary evidence, keep PARTIAL/PREPARED/BLOCKED with next owner and exact command.
6. At each checkpoint, provide complete cumulative archive, updated 117-task CSV/MD, release report, before/after counts, command logs, risks and next task batch. Do not invent a run result.

## External actions reserved for Codex/user

PostgreSQL/Maven/Docker runtime execution if unavailable to the coding agent; browser installations/device farm; private AWS staged Terraform plan/apply with explicit owner authorization; provider contracts and acceptance; real-domain DNS/ACM; payment-provider sandbox and live transaction tests only if a compatible provider is selected; independent penetration/legal/rights/age audits. The accompanying `CODEX_USER_BLOCKERS_36.md` has the actual roadmap IDs and missing evidence.

## Stop rules

- Do not enable `SA_PUBLIC_CONTENT_MODE`, open content to an unverified public audience, use real explicit/user media, or bypass holds/age/rights checks.
- Do not label mocked provider callbacks as real verified age/consent proof.
- Do not put passwords, API keys, private identity documents, private uploads, or runtime DBs in a ZIP or repo.
- Do not state a fully worldwide-deployed production platform exists absent real AWS, operational and independent validation evidence.
