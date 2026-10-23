# C01–C10 checkpoint 24 task status

**Implemented and unit/integration-tested locally:** C01 (mode API/feed UI), C02 (list filtering/sorting/bulk), C03 (playlist privacy/bulk/share), C04 (account theme/locale sync), C05 (notification modes), C06 (threaded comments/report/administrative pin), C07 (queue navigation/drag controls), C08 (diversity & eligibility), C09 (opt-in search history), C10 (viewing-position statistics and PWA starter).

**Still pending complete original 117-task acceptance:** persistent selected home-feed preference; full playlist sharing/copyright/regional authorization; HIGHLIGHTS digest delivery; spam classification and full moderation triage; genuine cross-device, iOS and network HLS validation; trained recommendation model and independent personalization/privacy evaluation; actual screen-reader/WCAG audit; PWA offline install testing; PostgreSQL/Spring migration and live AWS/domain launch; independent security/legal/compliance provider approvals.

**Technology:** Node 22 and SQLite remain the supported local runtime. PostgreSQL migration 010 is a translation draft only. Original synthetic media is unchanged.

**Run:** `npm run doctor && npm test && npm start`. QA: `npm run qa:release:verify`, `npm run qa:browser:offline` if Playwright Chromium is available.

**Next recommended tasks:** D01–D10 improve directory/search/metadata, then E creator workflow; separately close the B-series network adaptive HLS acceptance requirements and all critical cloud/legal gates.
