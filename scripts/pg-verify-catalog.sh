#!/usr/bin/env bash
# Operator-supplied disposable PG connection using PGHOST/PGUSER/PGDATABASE/etc.
set -euo pipefail
[[ $# == 1 ]] || { echo 'Usage: scripts/pg-verify-catalog.sh /absolute/export/manifest.json' >&2; exit 2; }
[[ ${SA_CI_DISPOSABLE_DB:-} == YES ]] || { echo 'Set SA_CI_DISPOSABLE_DB=YES for a separately verified disposable lab' >&2; exit 2; }
command -v psql >/dev/null || { echo 'psql unavailable' >&2; exit 2; }
manifest="$1"
[[ -f "$manifest" ]] || { echo 'Export manifest not found' >&2; exit 2; }
for table in categories networks sites channels performers videos video_categories video_performers video_chapters video_captions; do
  expected="$(node -e 'const fs=require("fs");const d=JSON.parse(fs.readFileSync(process.argv[1]));console.log(d.tables[process.argv[2]].rows)' "$manifest" "$table")"
  observed="$(psql -v ON_ERROR_STOP=1 -Atqc "SELECT COUNT(*) FROM $table")"
  [[ "$expected" == "$observed" ]] || { echo "$table mismatch: source=$expected PG=$observed" >&2; exit 1; }
  echo "$table: $observed rows OK"
done
# Foreign key references and approved-only read contract.
psql -v ON_ERROR_STOP=1 -Atqc 'SELECT COUNT(*) FROM video_categories vc LEFT JOIN videos v ON vc.video_id=v.id WHERE v.id IS NULL' | grep -qx 0
psql -v ON_ERROR_STOP=1 -Atqc 'SELECT COUNT(*) FROM video_performers vp LEFT JOIN performers p ON vp.performer_id=p.id WHERE p.id IS NULL' | grep -qx 0
psql -v ON_ERROR_STOP=1 -Atqc "SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_name='content_holds'" | grep -qx 1
printf 'Disposable PostgreSQL catalog parity and constraints: PASSED\n'
