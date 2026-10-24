#!/usr/bin/env python3
"""Aggregate current-commit CI artifacts without crediting missing or empty checks."""
import argparse
import json
import math
import os
from pathlib import Path
import re
import sys
import xml.etree.ElementTree as ET


EXPECTED_CHECKS = (
    'node-batch-1', 'node-batch-2', 'doctor', 'syntax-server', 'syntax-browser',
    'release-integrity', 'contracts-static', 'contracts-dynamic', 'hls-vendor', 'python-qa-tests',
    'pg-guard', 'pg-migrations-check', 'pg-apply', 'pg-verify', 'pg-concurrency',
    'pg-final-verify', 'pg-catalog-full-row-parity', 'spring-tests',
    'spring-pg-guard', 'spring-pg-apply', 'spring-pg-verify',
    'spring-account-postgres', 'spring-node-shadow-parity', 'spring-pg-final-verify', 'browser-chromium', 'browser-firefox',
    'browser-webkit', 'browser-offline', 'security-source', 'security-infra',
    'sbom', 'dependency-audit', 'vendored-dependency-audit', 'terraform-media-cdn', 'terraform-queue',
    'terraform-edge-waf', 'docker-compose', 'docker-build',
)
FORMAT = 'streamatlas-ci-check-v1'
ENGINES = ('chromium', 'firefox', 'webkit')
REQUIRED_BROWSER_CHECKS = {
    'desktop-home', 'desktop-categories', 'desktop-search', 'desktop-watch',
    'viewer-login-favorites', 'viewer-admin-denied', 'axe-wcag-home',
    'desktop-keyboard', 'mobile-home', 'mobile-categories', 'mobile-search',
    'mobile-watch', 'mobile-keyboard',
}
SHADOW_REPORT_NAME = 'qa-spring-node-shadow-parity.json'
SHADOW_PATHS = ['GET /api/auth/me', 'GET /api/me/preferences?expanded=1']
SHADOW_CASES = {'anonymous', 'owner', 'other', 'defaults', 'expired', 'closed', 'revoked'}


def integer(value):
    return isinstance(value, int) and not isinstance(value, bool)


def fail(check, reason):
    check['status'] = 'FAIL'
    check.setdefault('validation_errors', []).append(reason)


def validate_record(record, check_id, commit):
    if not isinstance(record, dict):
        return ['Check metadata must be a JSON object']
    errors = []
    if record.get('format') != FORMAT:
        errors.append('Unsupported or missing check metadata format')
    if record.get('check_id') != check_id:
        errors.append('Check ID does not match the expected ID')
    if record.get('commit') != commit:
        errors.append('Evidence commit does not match the selected full SHA')
    command = record.get('command')
    if not isinstance(command, list) or not all(isinstance(item, str) for item in command):
        errors.append('command must be an array of strings')
    status = record.get('status')
    code = record.get('exit_code')
    if status not in ('PASS', 'FAIL', 'NOT RUN'):
        errors.append('Unknown check status')
    if status == 'NOT RUN':
        if code is not None or command != []:
            errors.append('Unexecuted check must have a null exit code and empty command')
    elif not integer(code) or code < 0 or code > 255:
        errors.append('Executed check must have an integer process exit code')
    elif (status == 'PASS') != (code == 0):
        errors.append('Check status contradicts its command exit code')
    if status in ('PASS', 'FAIL') and command == []:
        errors.append('Executed check is missing its command')
    duration = record.get('duration_seconds')
    if isinstance(duration, bool) or not isinstance(duration, (int, float)) or duration < 0 or (isinstance(duration, float) and not math.isfinite(duration)):
        errors.append('duration_seconds must be finite and nonnegative')
    if 'test_counts' in record:
        counts = record['test_counts']
        if not isinstance(counts, dict) or not all(integer(n) and n >= 0 for n in counts.values()):
            errors.append('test_counts must contain nonnegative integer counts')
    return errors


def surefire_counts(paths, required_class=None):
    """Count actual testcases, separately retaining skipped/failure/error totals."""
    totals = dict(tests=0, passed=0, failures=0, errors=0, skipped=0)
    seen_suites = set()
    for path in paths:
        root = ET.parse(path).getroot()
        if root.tag not in ('testsuite', 'testsuites'):
            raise ValueError('Unrecognized Surefire XML root')
        suites = [suite for suite in root.iter('testsuite') if not list(suite.iter('testsuite'))[1:]]
        if not suites:
            raise ValueError('Surefire XML contains no test suite')
        for suite in suites:
            cases = suite.findall('testcase')
            identity = (suite.get('name'), tuple((case.get('classname'), case.get('name')) for case in cases))
            if identity in seen_suites:
                raise ValueError('Duplicate Surefire test suite evidence')
            seen_suites.add(identity)
            actual = dict(tests=len(cases), passed=0, failures=0, errors=0, skipped=0)
            for case in cases:
                if not case.get('name') or sum(case.find(outcome) is not None for outcome in ('skipped', 'error', 'failure')) > 1:
                    raise ValueError('Surefire testcase is unnamed or has contradictory outcomes')
                if required_class and case.get('classname') != required_class:
                    raise ValueError('Surefire testcase does not belong to the required integration class')
                if case.find('skipped') is not None:
                    actual['skipped'] += 1
                elif case.find('error') is not None:
                    actual['errors'] += 1
                elif case.find('failure') is not None:
                    actual['failures'] += 1
                else:
                    actual['passed'] += 1
            for key in ('tests', 'failures', 'errors', 'skipped'):
                if key in suite.attrib and int(suite.attrib[key]) != actual[key]:
                    raise ValueError('Surefire declared counts contradict actual testcase elements')
            for key, value in actual.items():
                totals[key] += value
    return totals


def browser_evidence(check, report, engine, commit):
    if not isinstance(report, dict) or report.get('suite') != 'network-real-browser-v1':
        fail(check, 'Unrecognized real-browser report')
        return
    runtime = report.get('runtime')
    if not isinstance(runtime, dict) or runtime.get('commit') != commit:
        fail(check, 'Browser report does not identify the selected commit')
        return
    if runtime.get('tracked_worktree_dirty') is True:
        fail(check, 'Browser report was generated from modified tracked source')
        return
    results = report.get('results')
    entry = results.get(engine) if isinstance(results, dict) else None
    bootstrap = report.get('bootstrap')
    if not isinstance(entry, dict) or not isinstance(bootstrap, dict):
        fail(check, 'Browser report is missing engine/bootstrap evidence')
        return
    check['browser_result'] = entry
    check['bootstrap'] = bootstrap
    state = entry.get('status')
    if state == 'failed' or bootstrap.get('status') == 'failed':
        fail(check, 'Browser bootstrap or engine execution failed')
        return
    if state == 'unavailable' or bootstrap.get('status') == 'unavailable':
        if check['status'] == 'PASS':
            fail(check, 'Passing command contradicts unavailable browser runtime')
        elif check['status'] == 'FAIL':
            check['status'] = 'NOT RUN'
            check['reason'] = 'Required browser runtime unavailable; original command exit code retained'
        return
    if bootstrap.get('status') != 'passed':
        fail(check, 'Browser bootstrap or engine execution failed')
        return
    if state != 'passed':
        if state == 'not-run':
            if check['status'] == 'PASS':
                fail(check, 'Passing command contradicts unexecuted browser checks')
            return
        fail(check, 'Unknown browser engine status')
        return
    checks = entry.get('checks')
    if not isinstance(checks, list) or not checks:
        fail(check, 'Passing browser entry contains no completed checks')
        return
    names = [item.get('name') for item in checks if isinstance(item, dict)]
    if len(names) != len(checks) or any(not isinstance(name, str) for name in names) or len(set(names)) != len(names) or not REQUIRED_BROWSER_CHECKS.issubset(names):
        fail(check, 'Passing browser entry is missing expected checks or has ambiguous check names')
        return
    axe = [item for item in checks if isinstance(item, dict) and item.get('name') == 'axe-wcag-home']
    if len(axe) != 1 or axe[0].get('result') != {'status': 'passed', 'violations': 0}:
        fail(check, 'Required axe accessibility result is absent or did not pass')
    if report.get('success') is not True:
        fail(check, 'Passing browser entry contradicts unsuccessful strict report')


def shadow_evidence(check, report, commit):
    """Require the actual paired HTTP proof, not merely a successful launcher."""
    if not isinstance(report, dict) or report.get('format') != 'streamatlas-spring-node-account-parity-v1':
        fail(check, 'Unrecognized Node/Spring account shadow report')
        return
    source = report.get('source')
    if not isinstance(source, dict) or source.get('commit') != commit or source.get('trackedWorktreeDirty') is not False:
        fail(check, 'Shadow report does not identify clean source at the selected commit')
    if report.get('status') != 'PASS' or report.get('cleanup') != 'PASS' or report.get('errors') != []:
        fail(check, 'Shadow execution or synthetic fixture cleanup did not pass')
    for field in ('syntheticOnly', 'readOnly', 'readOnlyStateUnchanged'):
        if report.get(field) is not True:
            fail(check, f'Shadow report lacks the required {field} proof')
    for field in ('cutoverApproved', 'fullAuthorizationParity', 'bodiesStored', 'credentialsStored'):
        if report.get(field) is not False:
            fail(check, f'Shadow report contradicts its limited scope: {field}')
    postgres = report.get('postgres')
    if not isinstance(postgres, dict) or not integer(postgres.get('major')) or postgres['major'] != 16 or postgres.get('disposable') is not True:
        fail(check, 'Shadow report lacks disposable PostgreSQL 16 runtime evidence')
    for field, value in (('caseCount', 7), ('readComparisons', 14), ('readRequests', 28)):
        if not integer(report.get(field)) or report[field] != value:
            fail(check, f'Shadow report has incomplete actual {field}')
    limits = report.get('limits')
    if not isinstance(limits, dict) or not integer(limits.get('minIntervalMs')) or limits['minIntervalMs'] < 1000 or limits.get('maxRequests') != 28:
        fail(check, 'Shadow request limits are missing or exceed the approved rate/budget')
    cases = report.get('cases')
    if report.get('paths') != SHADOW_PATHS or not isinstance(cases, list) or len(cases) != len(SHADOW_CASES):
        fail(check, 'Shadow report is missing the fixed route and account case coverage')
        return
    names = [case.get('name') if isinstance(case, dict) else None for case in cases]
    if any(not isinstance(name, str) for name in names) or set(names) != SHADOW_CASES:
        fail(check, 'Shadow report has missing or duplicate account cases')
        return
    for case in cases:
        expected = [200, 200 if case['name'] in ('owner', 'other', 'defaults') else 401]
        parity = case.get('parity')
        comparisons = case.get('comparisons')
        if case.get('status') != 'PASS' or case.get('expectedStatuses') != expected or case.get('transport') != [] or case.get('serviceErrors') != []:
            fail(check, f"Shadow case did not complete the expected reads: {case['name']}")
        if not isinstance(parity, dict) or any(not integer(parity.get(key)) or parity[key] != value for key, value in (('compared', 2), ('equivalent', 2), ('mismatches', 0), ('notRun', 0))) or parity.get('cutoverApproved') is not False or parity.get('fullAuthorizationParity') is not False:
            fail(check, f"Shadow case lacks two equivalent, completed reads: {case['name']}")
        if not isinstance(comparisons, list) or len(comparisons) != 2:
            fail(check, f"Shadow case is missing actual HTTP comparisons: {case['name']}")
            continue
        for index, comparison in enumerate(comparisons):
            if not isinstance(comparison, dict) or comparison.get('path') != SHADOW_PATHS[index] or comparison.get('result') != 'EQUIVALENT' or comparison.get('nodeStatus') != expected[index] or comparison.get('springStatus') != expected[index] or comparison.get('differenceDigest') is not None:
                fail(check, f"Shadow HTTP response proof is inconsistent: {case['name']}")
    check['test_counts'] = {'cases': len(cases), 'read_comparisons': report.get('readComparisons', 0), 'read_requests': report.get('readRequests', 0)}


def summarize(reports, commit, jobs, run_url=None):
    reports = Path(reports)
    errors = []
    if not isinstance(commit, str) or not re.fullmatch(r'[0-9a-fA-F]{40}', commit):
        errors.append('GITHUB_SHA must contain the full selected commit SHA')
    checks = {name: {'check_id': name, 'commit': commit, 'status': 'NOT RUN',
                     'exit_code': None, 'command': [], 'artifacts': [],
                     'reason': 'No current-commit check artifact was supplied'} for name in EXPECTED_CHECKS}
    records = {name: [] for name in EXPECTED_CHECKS}
    browser_reports = {engine: [] for engine in ENGINES}
    shadow_reports = []
    if reports.exists() and not reports.is_dir():
        errors.append('Reports path is not a directory')
    for path in sorted(reports.rglob('*.json')):
        relative = str(path.relative_to(reports))
        filename_id = path.stem if path.stem in checks else None
        browser_engine = next((engine for engine in ENGINES if path.name == f'qa-browser-{engine}.json'), None)
        is_shadow = path.name == SHADOW_REPORT_NAME
        try:
            data = json.loads(path.read_text(encoding='utf-8'))
        except (OSError, UnicodeError, ValueError):
            if filename_id or browser_engine or is_shadow:
                name = filename_id or ('spring-node-shadow-parity' if is_shadow else f'browser-{browser_engine}')
                checks[name]['artifacts'].append(relative)
                fail(checks[name], 'Malformed recognized JSON artifact')
                errors.append(f'{relative}: malformed recognized JSON artifact')
            continue
        recognized = filename_id or isinstance(data, dict) and ('check_id' in data or str(data.get('format', '')).startswith('streamatlas-ci-check'))
        if recognized:
            name = data.get('check_id') if isinstance(data, dict) else filename_id
            if not isinstance(name, str) or name not in checks:
                errors.append(f'{relative}: unknown or missing check_id')
                if filename_id:
                    fail(checks[filename_id], 'Malformed recognized check metadata')
                    checks[filename_id]['artifacts'].append(relative)
                continue
            if filename_id and filename_id != name:
                errors.append(f'{relative}: filename and metadata check IDs disagree')
                fail(checks[filename_id], 'Artifact filename and check ID disagree')
            records[name].append((relative, data))
        if browser_engine:
            browser_reports[browser_engine].append((relative, data))
        if is_shadow:
            shadow_reports.append((relative, data))
    for name, items in records.items():
        check = checks[name]
        if not items:
            continue
        check['artifacts'].extend(path for path, _ in items)
        if len(items) != 1:
            fail(check, 'Duplicate check_id artifacts are not accepted')
            errors.append(f'{name}: duplicate check_id artifacts')
            continue
        _, record = items[0]
        log_path = Path(items[0][0]).with_suffix('.log')
        if (reports / log_path).is_file():
            check['artifacts'].append(str(log_path))
        issues = validate_record(record, name, commit)
        if issues or check['status'] == 'FAIL':
            for issue in issues:
                fail(check, issue)
                errors.append(f'{name}: {issue}')
            continue
        check.update({key: value for key, value in record.items() if key not in ('format', 'artifacts')})
        check.pop('reason', None)
        if record.get('reason'):
            check['reason'] = record['reason']
        if name.startswith('node-batch-') and check['status'] == 'PASS':
            counts = check.get('test_counts', {})
            if counts.get('tests', 0) <= 0 or counts.get('pass', 0) <= 0:
                fail(check, 'Node batch did not demonstrate any executed passing tests')
            elif counts.get('fail', 0) or counts.get('cancelled', 0):
                fail(check, 'Node batch reported failed or cancelled tests')
        if name == 'python-qa-tests' and check['status'] == 'PASS':
            counts = check.get('test_counts', {})
            if counts.get('tests', 0) - counts.get('skipped', 0) <= 0:
                fail(check, 'Python QA suite did not demonstrate any actual non-skipped tests')
            elif any(counts.get(key, 0) for key in ('fail', 'failures', 'errors', 'unexpected_successes')):
                fail(check, 'Python QA suite reported unsuccessful tests')
    xml_paths = sorted(reports.rglob('TEST-*.xml'))
    integration_class = 'example.streamatlas.catalog.SessionAccountPostgresTest'
    integration_paths = [path for path in xml_paths if path.name == f'TEST-{integration_class}.xml']
    unit_paths = [path for path in xml_paths if path not in integration_paths]
    for name, paths, required_class in (
            ('spring-tests', unit_paths, None),
            ('spring-account-postgres', integration_paths, integration_class)):
        spring = checks[name]
        if spring['status'] != 'PASS':
            continue
        spring['artifacts'].extend(str(path.relative_to(reports)) for path in paths)
        try:
            counts = surefire_counts(paths, required_class=required_class)
            spring['test_counts'] = counts
            if counts['tests'] - counts['skipped'] <= 0:
                fail(spring, 'Maven completed without any actual non-skipped Surefire testcases')
            elif counts['failures'] or counts['errors']:
                fail(spring, 'Surefire XML reports test failures or errors')
            elif required_class and counts['skipped']:
                fail(spring, 'Required PostgreSQL integration cases were skipped')
        except (OSError, ValueError, ET.ParseError):
            fail(spring, 'Invalid or contradictory Surefire XML evidence')
    shadow = checks['spring-node-shadow-parity']
    shadow['artifacts'].extend(path for path, _ in shadow_reports)
    if len(shadow_reports) > 1:
        fail(shadow, 'Duplicate actual Node/Spring shadow reports are not accepted')
        errors.append('spring-node-shadow-parity: duplicate actual shadow reports')
    elif len(shadow_reports) == 1 and shadow['status'] == 'PASS' and not shadow.get('validation_errors'):
        shadow_evidence(shadow, shadow_reports[0][1], commit)
    elif not shadow_reports and shadow['status'] == 'PASS':
        shadow['status'] = 'NOT RUN'
        shadow['reason'] = 'Required actual Node/Spring account shadow artifact was not supplied'
    for engine, items in browser_reports.items():
        check = checks[f'browser-{engine}']
        check['artifacts'].extend(path for path, _ in items)
        if len(items) > 1:
            fail(check, 'Duplicate real-browser reports are not accepted')
            errors.append(f'browser-{engine}: duplicate real-browser reports')
        elif len(items) == 1 and check['status'] in ('PASS', 'FAIL') and not check.get('validation_errors'):
            browser_evidence(check, items[0][1], engine, commit)
        elif not items and check['status'] == 'PASS':
            check['status'] = 'NOT RUN'
            check['reason'] = 'Required raw real-browser artifact was not supplied'
    actual_jobs = {}
    if not isinstance(jobs, dict):
        errors.append('SA_CI_JOBS must be an object containing actual job results')
    else:
        for name, job in jobs.items():
            result = job.get('result') if isinstance(job, dict) else None
            actual_jobs[name] = {'result': result}
            if result not in ('success', 'failure', 'cancelled', 'skipped'):
                errors.append(f'{name}: unknown or missing job result')
    job_failure = any(job['result'] in ('failure', 'cancelled') for job in actual_jobs.values())
    command_failure = any(integer(check.get('exit_code')) and check['exit_code'] != 0 for check in checks.values())
    check_failure = any(check['status'] == 'FAIL' for check in checks.values())
    complete = bool(actual_jobs) and all(job['result'] == 'success' for job in actual_jobs.values()) and all(check['status'] == 'PASS' for check in checks.values()) and not errors
    failed = bool(errors or job_failure or command_failure or check_failure)
    return {
        'format': 'streamatlas-ci-summary-v1', 'commit': commit, 'run_url': run_url,
        'status': 'FAIL' if failed else 'PASS' if complete else 'NOT RUN',
        'coverage_complete': complete, 'exit_code': 1 if failed else 0,
        'jobs': actual_jobs, 'checks': list(checks.values()), 'metadata_errors': errors,
        'warning': None if complete else 'Coverage incomplete: only independently verified current-commit PASS checks are credited.',
    }


def markdown(summary):
    def cell(value):
        return str(value).replace('|', '\\|').replace('\r', ' ').replace('\n', ' ')
    lines = ['## StreamAtlas CI evidence', '', f"Commit: `{cell(summary['commit'])}`", '',
             f"Overall: **{summary['status']}**; complete coverage: **{summary['coverage_complete']}**."]
    if summary['run_url']:
        lines.extend(['', f"Run: {cell(summary['run_url'])}"])
    if summary['warning']:
        lines.extend(['', f"**Warning:** {summary['warning']}"])
    lines.extend(['', '| Check | Result | Exit | Test counts |', '| --- | --- | --- | --- |'])
    for check in summary['checks']:
        lines.append(f"| {cell(check['check_id'])} | {check['status']} | {cell(check.get('exit_code'))} | {cell(json.dumps(check.get('test_counts', {}), sort_keys=True))} |")
    lines.extend(['', '### Actual job results', ''])
    lines.extend(f"- `{cell(name)}`: {cell(job['result'])}" for name, job in summary['jobs'].items())
    if not summary['jobs']:
        lines.append('- No actual job-result metadata supplied.')
    if summary['metadata_errors']:
        lines.extend(['', '### Evidence errors', ''])
        lines.extend(f'- {cell(error)}' for error in summary['metadata_errors'])
    return '\n'.join(lines) + '\n'


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--reports', type=Path, required=True)
    parser.add_argument('--output', type=Path, default=Path('reports/ci-summary.json'))
    args = parser.parse_args(argv)
    try:
        jobs = json.loads(os.environ.get('SA_CI_JOBS', '{}'))
    except json.JSONDecodeError:
        jobs = None
    server = os.environ.get('GITHUB_SERVER_URL', 'https://github.com').rstrip('/')
    repository = os.environ.get('GITHUB_REPOSITORY')
    run_id = os.environ.get('GITHUB_RUN_ID')
    run_url = f'{server}/{repository}/actions/runs/{run_id}' if repository and run_id else None
    summary = summarize(args.reports, os.environ.get('GITHUB_SHA'), jobs, run_url)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(summary, indent=2) + '\n', encoding='utf-8')
    rendered = markdown(summary)
    if os.environ.get('GITHUB_STEP_SUMMARY'):
        with open(os.environ['GITHUB_STEP_SUMMARY'], 'a', encoding='utf-8') as output:
            output.write(rendered)
    print(rendered)
    return summary['exit_code']


if __name__ == '__main__':
    sys.exit(main())
