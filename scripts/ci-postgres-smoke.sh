#!/usr/bin/env bash
# Requires a DISPOSABLE PostgreSQL 15+ DB connected through PG* environment variables.
# DANGER: never point this at a real user database. No production rows are exported.
set -euo pipefail
: "${SA_CI_DISPOSABLE_DB:?Must set SA_CI_DISPOSABLE_DB=YES after verifying disposable DB}"
[[ "$SA_CI_DISPOSABLE_DB" == 'YES' ]] || { echo 'Not a disposable test DB' >&2; exit 2; }
command -v psql >/dev/null || { echo 'psql not installed' >&2; exit 2; }
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT
export DB_PATH="$work/source.sqlite"
node scripts/export-catalog-pg.js "$work/export"
node scripts/build-pg-catalog-import.js "$work/export" "$work/import.pg.sql"
for f in migrations/postgresql/00{1,2,3,4,5,6,7,8}_*.sql; do psql -v ON_ERROR_STOP=1 -f "$f" >/dev/null; done
psql -v ON_ERROR_STOP=1 -f "$work/import.pg.sql" >/dev/null
observed="$(psql -Atqc 'SELECT count(*) FROM videos')"
[[ "$observed" == 72 ]] || { echo "Expected 72 demo videos, got $observed" >&2; exit 1; }
relationships="$(psql -Atqc 'SELECT count(*) FROM video_categories')"
[[ "$relationships" -gt 0 ]] || { echo 'Video-category joins not imported' >&2; exit 1; }
psql -v ON_ERROR_STOP=1 -Atqc 'SELECT count(*) FROM videos v JOIN channels c ON c.id=v.channel_id WHERE v.status = '\''PUBLISHED'\''' > /dev/null
bash scripts/pg-verify-catalog.sh "$work/export/manifest.json"
printf 'PostgreSQL disposable smoke PASSED: videos=%s category joins=%s\n' "$observed" "$relationships"
