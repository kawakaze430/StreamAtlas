#!/usr/bin/env bash
# Record one CI check without turning a failed command or an omitted check into PASS.
# Command arguments are recorded; supply credentials through the runtime environment.
set -uo pipefail

usage() {
  printf 'Usage: bash scripts/ci-check.sh CHECK_ID COMMAND [ARGS...]\n       bash scripts/ci-check.sh CHECK_ID --not-run REASON\n' >&2
  exit 2
}

[[ $# -ge 2 ]] || usage
check_id=$1
shift
[[ "$check_id" =~ ^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$ ]] || {
  printf 'Invalid CI check ID: use 1-80 letters, digits, underscores, or hyphens, starting with a letter or digit.\n' >&2
  exit 2
}
if [[ "$1" == --not-run ]]; then
  [[ $# -eq 2 && -n "$2" ]] || usage
fi

command -v node >/dev/null || { printf 'Node.js is required to record CI evidence.\n' >&2; exit 127; }
report_dir=${SA_CI_REPORT_DIR:-reports/ci}
mkdir -p -- "$report_dir" || exit 1
log_path="$report_dir/$check_id.log"
report_path="$report_dir/$check_id.json"
# A rerun must not leave a prior PASS available if evidence capture later fails.
rm -f -- "$report_path" "$report_path.tmp" || exit 1
commit=${GITHUB_SHA:-}
if [[ -z "$commit" ]]; then
  commit=$(git rev-parse --verify HEAD 2>/dev/null) || {
    printf 'Cannot identify the tested commit; set GITHUB_SHA or run in a Git checkout.\n' >&2
    exit 1
  }
fi
started_at=$(date -u +%Y-%m-%dT%H:%M:%SZ)
SECONDS=0
evidence_error=''

write_report() {
  node --input-type=module - "$report_path" "$check_id" "$commit" "$1" "$2" "$SECONDS" "$started_at" "$log_path" "$3" "$evidence_error" "${@:4}" <<'NODE'
import fs from 'node:fs';
const [reportPath, checkId, commit, status, exitCode, duration, startedAt, logPath, reason, evidenceError, ...command] = process.argv.slice(2);
const report = {
  format: 'streamatlas-ci-check-v1',
  check_id: checkId,
  commit,
  command,
  status,
  exit_code: exitCode === 'null' ? null : Number(exitCode),
  duration_seconds: Number(duration),
  started_at: startedAt,
  log: logPath,
};
if (reason) report.reason = reason;
if (evidenceError) report.evidence_error = evidenceError;
let output = '';
try {
  output = fs.readFileSync(logPath, 'utf8').replace(/\u001b\[[0-9;]*m/g, '');
} catch (error) {
  report.evidence_error = [report.evidence_error, `Cannot read captured output (${error.code || 'read error'}).`].filter(Boolean).join(' ');
}
const counts = {};
for (const match of output.matchAll(/^(?:#|ℹ) (tests|suites|pass|fail|cancelled|skipped|todo) (\d+)\s*$/gm)) {
  counts[match[1]] = Number(match[2]);
}
if (!Object.hasOwn(counts, 'tests')) {
  const unittest = [...output.matchAll(/^Ran (\d+) tests? in [\d.]+s\r?$/gm)].at(-1);
  if (unittest) {
    counts.tests = Number(unittest[1]);
    const success = [...output.matchAll(/^OK(?: \(skipped=(\d+)\))?\r?$/gm)].at(-1);
    if (success) {
      counts.skipped = Number(success[1] || 0);
      counts.pass = counts.tests - counts.skipped;
      counts.fail = 0;
    }
  }
}
if (Object.hasOwn(counts, 'tests')) report.test_counts = counts;
if (report.evidence_error) {
  if (report.status === 'PASS') report.status = 'FAIL';
  process.exitCode = 1;
}
try {
  fs.writeFileSync(`${reportPath}.tmp`, JSON.stringify(report, null, 2) + '\n');
  fs.renameSync(`${reportPath}.tmp`, reportPath);
} catch (error) {
  console.error(`Cannot write CI evidence (${error.code || 'write error'}).`);
  process.exitCode = 1;
}
NODE
}

if [[ "$1" == --not-run ]]; then
  reason=$2
  printf 'NOT RUN: %s\n' "$reason" | tee "$log_path"
  log_status=${PIPESTATUS[1]}
  [[ "$log_status" -eq 0 ]] || evidence_error="Output capture failed (tee exit $log_status)."
  write_report 'NOT RUN' null "$reason" || exit 1
  exit 0
fi

"$@" 2>&1 | tee "$log_path"
pipeline_status=("${PIPESTATUS[@]}")
command_status=${pipeline_status[0]}
log_status=${pipeline_status[1]}
status=PASS
[[ "$command_status" -eq 0 ]] || status=FAIL
[[ "$log_status" -eq 0 ]] || evidence_error="Output capture failed (tee exit $log_status); command exit is recorded separately."
write_report "$status" "$command_status" '' "$@"
report_status=$?
if [[ "$command_status" -ne 0 ]]; then
  exit "$command_status"
fi
[[ "$report_status" -eq 0 ]] || exit "$report_status"
[[ "$log_status" -eq 0 ]] || exit "$log_status"
exit 0
