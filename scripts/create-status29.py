from pathlib import Path
import csv,collections,json,hashlib
root=Path(__file__).resolve().parents[1]
audit=root/'AUDIT_AND_HANDOFF'
source=audit/'117_TASK_STATUS.csv'
rows=list(csv.DictReader(source.open(newline='',encoding='utf8')))
updates={
 'A05':('PARTIAL','Caption-size/contrast browser selector and enhanced offline DOM checks passed. Full axe, Safari, screen reader still outstanding.'),
 'A06':('PARTIAL','Two reviewed OpenAPI operations and explicit QoE JSON schema added; dynamic routes still require manual contract parity.'),
 'B12':('PARTIAL','Size/contrast cue CSS and persisted local selector, tested in Chromium offline harness; iOS/Safari caption behavior not validated.'),
 'B15':('LOCAL','Opt-in, default-off telemetry now collects startup, startup-failure, rebuffer time and ratio, errors, quality switches, completion. Data aggregated by video/day without user/session/IP identifiers; test coverage and Chromium QA. Production sampling not verified.'),
 'C04':('PARTIAL','Account preferences and watch position verified across two independent authenticated sessions, with other-account isolation; actual physical devices still pending.'),
 'C10':('PARTIAL','Offline-only safe shell service worker added, avoiding caching any API/media or user-specific content; actual mobile installability/store-policy validation pending.'),
 'D07':('LOCAL','Generated 320w/640w responsive WebP posters; rendered srcset/sizes/lazy images, hover preview restores srcset; Chromium offline checks passed at desktop/tablet/mobile.'),
 'E08':('PARTIAL','Opt-in anonymized aggregate creator QoE dashboard with <5-sample suppression; qualified watch time, referral metrics and real creator analytics remain unfinished.'),
 'F02':('PARTIAL','Added migration 014 with QoE counters and rollback draft; no real PostgreSQL execution or constraints acceptance.'),
 'H04':('PARTIAL','Receipt-gated private demo now protects synthetic poster, MP4 and HLS static paths, tested against direct URL bypass. Real CDN, distributed edge and all preview paths not validated.'),
 'J05':('PARTIAL','Session startup/rebuffer aggregates now exist, but no representative SLO measurement, acceptance targets or production observability evidence.'),
}
for row in rows:
 row['previous_audited_status']=row['audited_status']
 if row['task_id'] in updates:
  row['audited_status'],row['evidence_and_remaining_work']=updates[row['task_id']]
 row['checkpoint_29_delta']='Updated and tested locally' if row['task_id'] in updates else 'No additional acceptance evidence this release'
cols=['task_id','priority','original_requirement','previous_audited_status','audited_status','checkpoint_29_delta','evidence_and_remaining_work']
with (audit/'UPDATED_117_TASK_STATUS_29.csv').open('w',encoding='utf8',newline='') as f:
 w=csv.DictWriter(f,fieldnames=cols);w.writeheader();w.writerows(rows)
counts=collections.Counter(r['audited_status'] for r in rows)
by=collections.defaultdict(list)
for row in rows:by[row['task_id'][0]].append(row)
md=['# StreamAtlas v0.29 — 117-task status (audit-conservative)','',f'**Total: {len(rows)} tasks.** Status: '+', '.join(f'{k} {counts[k]}' for k in ['LOCAL','PARTIAL','PREPARED','BLOCKED','NOT_STARTED'])+'.','', '> LOCAL means a feature has executable local implementation and local tests, not approval for public launch. PARTIAL may contain extensive code but lacks part of its acceptance criteria. No external approval or AWS changes were made.','', '## Work improved in this release','']
for key in updates:
 r=next(r for r in rows if r['task_id']==key)
 md += [f"- **{key} — {r['audited_status']}**: {r['original_requirement']} {r['evidence_and_remaining_work']}"]
md+=['','## Every task (full evidence ledger)','']
for area in sorted(by):
 md.append('### '+area)
 md.append('')
 for r in by[area]:md+= [f"- **{r['task_id']} [{r['audited_status']}] {r['priority']}:** {r['original_requirement']} — {r['evidence_and_remaining_work']}"]
 md.append('')
(audit/'UPDATED_117_TASK_ROADMAP_29.md').write_text('\n'.join(md)+'\n',encoding='utf8')
(root/'docs/STATUS_29.md').write_text('''# Checkpoint 29 — Acceptance status and next gates

## Verified in this release

- 8 new automated functional/security tests for opt-in playback diagnostics, scoped creator aggregates, independent-session preferences, caption styling, private media gating, safe PWA shell and responsive local posters.
- Synthetic videos only. Existing behavior preserved. Release must pass npm test and offline Chromium audit; refer to VERIFICATION_29.json for actual outcomes.
- The private catalog and media preview routes now enforce receipt gating for locally served poster, video and HLS assets when SA_PRIVATE_PREVIEW_REQUIRE_RECEIPT=1.
- QOE aggregate recording is **disabled by default**. To enable locally use SA_ENABLE_QOE_TELEMETRY=1; viewer must independently opt in. No IP, account, cookie or session identifiers enter the aggregate table. No external analytics provider is contacted.
- Caption text size and contrast are locally remembered, subject to native browser cue styling support.
- The installable PWA shell caches only `/offline.html`, `/styles.css`, and `/assets/favicon.svg`. It never stores private videos, posters, API results or user-generated data. It is not an offline-video app.
- PostgreSQL migration 014 is a draft only. Production DB cutover, Java backend, age/rights legal approvals and AWS cloud deployment remain unverified.

## Important limitations

- Cross-browser network HLS with hls.js still requires downloaded reviewed library and execution on actual Chrome/Firefox/WebKit/iOS devices.
- The video-per-day QoE table is an opt-in diagnostic prototype; it does not measure unique viewers or represent statistically meaningful production telemetry.
- Browser audit runs synthetic media in an offline-injected Chromium environment. It cannot stand in for global network/device QA.
- Most of the original 56 partial tasks have external/cloud or independent acceptance requirements. Only D07 and B15 are promoted to LOCALLY IMPLEMENTED in this update; their cloud/real-device acceptance remains open.
- This archive is not approved for public adult-content deployment.

## Next priorities

1. Run external browser network matrix, Safari/iOS HLS, and axe-based accessibility audit.
2. Execute migrations 001–014 on disposable PostgreSQL, then migrate all private accounts and operations with parity tests.
3. Complete actual Spring Boot APIs and contract parity without dropping the working Node implementation.
4. Stand up private AWS S3/CloudFront and test signed entitlement, failure, revocation and cache invalidations with authorized account access.
5. Complete independent vendor, documentary, legal, moderation, security and recovery audits.
''')
(root/'docs/RELEASE_29.md').write_text('''# StreamAtlas 0.29.0 — Audited partial-task engineering release

**Starting baseline:** uploaded consolidated Checkpoints 01–28 ZIP, with 237 initial passing tests. This release works on the actual contents of that archive, not recreated placeholder code.

## Implemented code changes

- B12: caption size (normal/large/extra) and high-contrast preference selectors for WebVTT, persisted locally; native cue rendering varies across browser engines.
- B15/E08: opt-in, disabled-by-default anonymous aggregate QoE API and private creator analytics; metrics cover startup, startup-failure, play/buffer duration, completion, errors and quality changes. Five-sample privacy threshold. No individual telemetry records persisted.
- C04: regression verifying saved preferences and watch progress across distinct sessions; cross-account isolation.
- C10: offline shell and safe service worker with strict static-only cache policy, no offline videos.
- D07: 320/640-pixel WebP poster variants, responsive srcset, lazy thumbnails and hover preview restoration.
- H04: private preview receipt-gating extends to direct synthetic posters and HLS static assets rather than MP4 alone.
- A06/F02: explicit QoE OpenAPI contract and PostgreSQL migration 014 with rollback (unexecuted against real PG).
- Added automated tests, browser controls verification, status CSV and full roadmap details.

## Verification

`npm test` must pass all old tests plus 8 new tests. `python scripts/offline-browser-audit.py` checks Chromium at 1440/820/390px with synthetic media. Release manifest and ZIP integrity are generated after the documentation is finalized.

**No live AWS resources, domain registration, real documentary age/consent checks, Spring Boot production cutover, security audit or global media distribution have been performed.**
''')
(root/'README.md').write_text('''# StreamAtlas 0.29.0 — Audited Engineering Checkpoint

This cumulative, locally runnable source was upgraded from the user's uploaded audited Checkpoint 28 archive. It includes all original features and an opt-in QoE diagnostic/creator summary, caption size and contrast controls, safe PWA offline shell, optimized responsive thumbnails and better private-preview asset gating.

**Not production launch approved.** The Node/SQLite demo remains primary; real age/rights verification, production AWS/CDN, Spring Boot/PostgreSQL cutover and independent security/legal approvals remain open.

Latest tasks and evidence: `docs/STATUS_29.md`, `docs/RELEASE_29.md`, `AUDIT_AND_HANDOFF/UPDATED_117_TASK_ROADMAP_29.md` (folder included in the cumulative ZIP).

Run `npm test`, `npm start`, and optionally `python scripts/offline-browser-audit.py`. All video content in the archive is synthetic.

---

'''+(root/'README.md').read_text())
print(dict(counts))
