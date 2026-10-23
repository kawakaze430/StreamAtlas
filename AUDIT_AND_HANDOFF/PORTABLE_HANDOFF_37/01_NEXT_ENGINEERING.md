# Next locally actionable engineering batch

1. A06: route coverage beyond the literal scanner. Manually enumerate conditional `.match(regex)` and imported handler branches in `src/server.js`, `src/uploads.js`, `src/discovery.js`, `src/compliance-operations.js`, `src/studio-operations.js`, etc.; add OpenAPI schemas and permission/negative integration tests (do not assume a pattern is registered only because its text appears in source). Compare runtime router behavior with contracts; enforce documented error status codes.
2. E01/E02/E03: private upload state-transition tests for corruption, overlapping/resumed chunks, worker process interruption, atomic retries/dead lettering and held content. Do not publish without human approval; no real explicit media.
3. D02/D04/D06: stable search cursors with safety holds and duplicate review, real local performance benchmark.
4. A07: hosted CI confirmation across Node tests, strict route gate, dependency audits, Playwright, PostgreSQL and browser engines; no local successful CI implies GitHub job passed.
5. F02–F07/B03/B09: real PostgreSQL, Maven, HLS/browser/device tests in authenticated owner environment.

Preserve `UPDATED_117_TASK_STATUS_37.csv` through checkpoint continuation. No checkpoint 37 task moved to LOCAL; two tasks received better evidence while remaining PARTIAL.
