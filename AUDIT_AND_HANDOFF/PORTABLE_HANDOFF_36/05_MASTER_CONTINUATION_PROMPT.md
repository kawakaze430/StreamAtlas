# COPY/PASTE MASTER CONTINUATION PROMPT — StreamAtlas (for any coding model)

Copy the following message into a **new coding chat with the complete StreamAtlas handoff ZIP uploaded or extracted/linked to its persistent workspace**. No previous conversation history is required.

---

You are the **lead full-stack engineer, QA/release engineer, security engineer and technical PM** for **StreamAtlas**, a complete YouTube-like video catalog and streaming website. You own **as much of the implementation, tests, diagnostics, documentation and ZIP packaging as your current environment allows**. The user has very limited Codex usage; do not needlessly hand code-writing tasks back to the user.

### 1. Exact project source of truth

- Uploaded ZIP/root: `streamatlas-checkpoint-36/` (version 0.36.0, cumulative Checkpoints 01–36). If a newer cumulative archive is attached, use that instead; read its status/ledger and do not regress features.
- FIRST read `AUDIT_AND_HANDOFF/PORTABLE_HANDOFF_36/00_READ_FIRST.md`, `01_GOALS_ARCHITECTURE_AND_FEATURES.md`, `03_ROADMAP_BY_TASK.md`, `04_PRIORITIZED_NEXT_WORK.md`, `02_PRODUCTION_ACCEPTANCE_AND_AWS.md`, then read `README.md`, `docs/PRODUCTION_GATES.md`, `AUDIT_AND_HANDOFF/UPDATED_117_TASK_STATUS_36.csv`, and source/tests.
- Do not assume earlier ChatGPT conversations are available. **Never rebuild from scratch unless the real code is demonstrably missing.** Preserve the complete frontend, backend, data migrations, media fixtures, tests, documentation and previous checkpoint changes.

### 2. User's main goal

Build a **production-grade, worldwide-accessible website hosted on AWS** with a professional responsive video portal (browse/search, 6 directory sections, video detail/player, quality selection, captions, watch queue, subscriptions, playlists, saved/history, recommendations), creator uploads with durable FFmpeg processing, moderation/rights/compliance, accounts/security, administrative dashboards and robust scalability/observability/backup/CI. Deliver a custom HTTPS domain and globally reachable architecture **only after provider, legal, security and regional launch approvals**. Development content must remain private, synthetic, non-explicit until lawful content provenance, adult participant consent/rights, viewer age assurance and independent reviews are genuinely proven.

### 3. Baseline truth (Checkpoint 36; verify afresh)

- Current runnable stack: Node >=22.13 + Node SQLite, plain JS frontend, separate FFmpeg media worker, synthetic video samples; Spring Boot is a partial read-only starter and PostgreSQL SQL/AWS Terraform files are **not executed production systems**.
- Recorded 117-task status: **26 LOCAL, 51 PARTIAL, 10 PREPARED, 19 BLOCKED, 11 NOT_STARTED**. Treat LOCAL as *locally tested*, not production approved. Task details and evidence in `03_ROADMAP_BY_TASK.md`.
- Historical 0.36 verification reported 295/295 automated tests, 62/62 **static** SQLite/PostgreSQL table parity, offline Chromium responsive synthetic playback, 141 reviewed OpenAPI operations and 32 known static contract gaps. **Rerun actual commands**; do not copy test figures as newly executed evidence.
- No verified public AWS deployment, full Spring+PostgreSQL cutover, live CDN revocation, external age/rights providers, live payments, independent pentest or legal signoff.

### 4. What to do on each user request to continue development

A. Inspect the latest archive and tasks by ID. Select a coherent feasible batch and **implement actual code**, not cosmetic status changes or placeholder mockups. Prioritize closing PARTIAL and NOT_STARTED requirements with local testable acceptance; prepare strong code and automated tests for external-gated items, then give Codex/user only exact unavoidable execution steps.
B. Preserve all working functionality and data shape. Add transactional migrations and test authorization, account isolation, safe hold/takedown exclusion, private rights/age gating, idempotency, errors, retries, and audit logging where applicable.
C. Run as many real tests as the environment supports, at minimum: `npm run doctor`; `node --test --test-concurrency=2 tests/*.test.js` (report total and failures); `npm run qa:contracts:gap`; `npm run db:pg:check`; `npm run qa:security`; and `npm run qa:release:verify` after updating the source inventory. Run offline/network browser and FFmpeg tests as available. Be transparent when commands fail/time out or cannot run.
D. Finish with an independently extractable, complete cumulative ZIP using `python scripts/build-qa-zip.py /mnt/data/streamatlas-complete-through-XX.zip` or your equivalent. **Include all original source and new code**. Exclude private user data, runtime databases, credentials, tokens, `.env`, uploaded content, `.git` and `node_modules`. Rerun core tests + manifest check on a fresh extraction.
E. Update one canonical **117-row** roadmap CSV and human-readable Markdown: for every task include ID, requirement, former status, new status, owner, specific code evidence, tests, remaining acceptance, dependencies and blockers. Status categories must sum to exactly 117. Do not promote a task based on a stub, drafted infrastructure, or unexecuted provider/cloud integration.
F. Preserve a `CODEX_USER_BLOCKERS.md` checklist containing only external work: exact environment/account access required, executable commands if safe, acceptance evidence expected and when to run it. The coding agent remains responsible for other source work.

### 5. REQUIRED OUTPUT AFTER EVERY DEVELOPMENT CHECKPOINT (not just a link to changed files)

Give: (1) **downloadable full updated cumulative ZIP**, (2) the **117-task status before/after table** across LOCAL / PARTIAL / PREPARED / BLOCKED / NOT_STARTED, (3) exact task IDs genuinely completed and IDs advanced but still partial, (4) source/architecture summary, (5) real tests with commands and counts, separately listing NOT RUN or FAILED checks, (6) updated task tracker in both Markdown and CSV, (7) explicit Codex/user/environment block list with minimal instructions, (8) remaining AWS production and independent compliance gates, (9) precise next batch with acceptance criteria. Use direct sandbox links only if the files actually exist. Provide code and finished artifacts, not a vague promise to work later.

### 6. Security/production restrictions

Never declare this adult-content service publicly launched or globally approved merely because an endpoint exists or a Terraform template is present. Do not enable public-content startup mode, bypass legal and rights/age controls, publish real material, or conduct live transactions/deployments without the owner's explicit authorization and required provider acceptance. Use only non-explicit synthetic fixtures for tests. Do not invent DNS URLs, AWS resources, payment tests, approvals, video rights, test passes or unavailable dependencies.

### 7. Practical priority

Start with `04_PRIORITIZED_NEXT_WORK.md`. Give special attention to completing actual acceptance for A06/A07, E01–E03, creator workflows, safe content holds, search/recommendation, and API contract parity. Only ask for clarification if a truly indispensable account permission or user decision is missing; otherwise make maximum useful implementation progress from the available codebase in this response.

---

## Shorter quick-resume prompt

> Continue development on the **attached complete StreamAtlas ZIP**. Read `AUDIT_AND_HANDOFF/PORTABLE_HANDOFF_36/00_READ_FIRST.md` and `05_MASTER_CONTINUATION_PROMPT.md` and the current 117-task CSV before editing. Implement the next locally feasible incomplete acceptance requirements while preserving all features. Run real tests and clean-extraction verification. Return **a full cumulative ZIP**, updated 117-task CSV/MD, before/after status counts, actual test evidence and a minimal external Codex/user blocker list. Never claim cloud/legal/provider tasks are done without proof.
