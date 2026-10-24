"""Evidence validation tests; no external runtime, network, or credentials used."""
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest


SCRIPT = Path(__file__).resolve().parents[2] / 'scripts' / 'ci-summary.py'
SPEC = importlib.util.spec_from_file_location('ci_summary', SCRIPT)
summary = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(summary)
COMMIT = 'a' * 40


class SummaryTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)

    def record(self, name, *, directory='', **changes):
        report = {'format': summary.FORMAT, 'check_id': name, 'commit': COMMIT,
                  'command': ['synthetic-check'], 'status': 'PASS', 'exit_code': 0,
                  'duration_seconds': 1}
        report.update(changes)
        destination = self.root / directory / f'{name}.json'
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_text(json.dumps(report))

    def result(self, jobs=None):
        return summary.summarize(self.root, COMMIT, jobs if jobs is not None else {'synthetic': {'result': 'success'}})

    def check(self, result, name):
        return next(check for check in result['checks'] if check['check_id'] == name)

    def test_missing_checks_are_not_run_and_never_complete(self):
        result = self.result()
        self.assertFalse(result['coverage_complete'])
        self.assertEqual(result['status'], 'NOT RUN')
        self.assertEqual(result['exit_code'], 0)
        self.assertTrue(all(check['status'] == 'NOT RUN' for check in result['checks']))

    def test_stale_sha_cannot_be_credited(self):
        self.record('doctor', commit='b' * 40)
        result = self.result()
        self.assertEqual(self.check(result, 'doctor')['status'], 'FAIL')
        self.assertEqual(result['exit_code'], 1)
        self.assertIn('commit', ' '.join(result['metadata_errors']))

    def test_duplicate_ids_fail_even_when_both_claim_success(self):
        self.record('doctor', directory='first')
        self.record('doctor', directory='second')
        result = self.result()
        self.assertEqual(self.check(result, 'doctor')['status'], 'FAIL')
        self.assertEqual(len(self.check(result, 'doctor')['artifacts']), 2)
        self.assertEqual(result['exit_code'], 1)

    def test_malformed_recognized_json_is_not_silently_ignored(self):
        (self.root / 'doctor.json').write_text('{broken')
        result = self.result()
        self.assertEqual(self.check(result, 'doctor')['status'], 'FAIL')
        self.assertEqual(result['exit_code'], 1)

    def test_recognized_non_object_json_is_a_failure_not_a_crash(self):
        (self.root / 'doctor.json').write_text('[]')
        result = self.result()
        self.assertEqual(self.check(result, 'doctor')['status'], 'FAIL')
        self.assertEqual(result['exit_code'], 1)

    def test_malformed_check_id_is_a_failure_not_a_crash(self):
        self.record('doctor', check_id=[])
        result = self.result()
        self.assertEqual(self.check(result, 'doctor')['status'], 'FAIL')
        self.assertEqual(result['exit_code'], 1)

    def test_nonzero_exit_cannot_claim_pass(self):
        self.record('doctor', exit_code=9)
        result = self.result()
        self.assertEqual(self.check(result, 'doctor')['status'], 'FAIL')
        self.assertEqual(result['exit_code'], 1)

    def test_empty_or_all_skipped_node_batch_cannot_pass(self):
        for counts in ({'tests': 0, 'pass': 0}, {'tests': 3, 'pass': 0, 'skipped': 3}):
            with self.subTest(counts=counts):
                self.record('node-batch-1', test_counts=counts)
                result = self.result()
                self.assertEqual(self.check(result, 'node-batch-1')['status'], 'FAIL')
                self.assertEqual(result['exit_code'], 1)

    def test_spring_without_actual_surefire_tests_cannot_pass(self):
        self.record('spring-tests')
        for xml in (None, '<testsuite name="empty" tests="0"/>',
                    '<testsuite name="skips" tests="1" skipped="1"><testcase name="skip"><skipped/></testcase></testsuite>'):
            with self.subTest(xml=xml):
                if xml:
                    (self.root / 'TEST-synthetic.xml').write_text(xml)
                result = self.result()
                self.assertEqual(self.check(result, 'spring-tests')['status'], 'FAIL')
                self.assertEqual(result['exit_code'], 1)

    def test_python_qa_zero_tests_or_all_skipped_cannot_pass(self):
        for counts in ({}, {'tests': 0}, {'tests': 3, 'skipped': 3}):
            with self.subTest(counts=counts):
                self.record('python-qa-tests', test_counts=counts)
                result = self.result()
                self.assertEqual(self.check(result, 'python-qa-tests')['status'], 'FAIL')
                self.assertEqual(result['exit_code'], 1)

    def test_surefire_actual_counts_keep_skips_distinct(self):
        self.record('spring-tests')
        (self.root / 'TEST-synthetic.xml').write_text(
            '<testsuite name="synthetic" tests="2" failures="0" errors="0" skipped="1">'
            '<testcase name="executed"/><testcase name="omitted"><skipped/></testcase></testsuite>')
        result = self.result()
        check = self.check(result, 'spring-tests')
        self.assertEqual(check['status'], 'PASS')
        self.assertEqual(check['test_counts'], {'tests': 2, 'passed': 1, 'skipped': 1, 'errors': 0, 'failures': 0})
        self.assertFalse(result['coverage_complete'])

    def integration_xml(self, *, skipped=False, classname='example.streamatlas.catalog.SessionAccountPostgresTest'):
        name = 'TEST-example.streamatlas.catalog.SessionAccountPostgresTest.xml'
        outcome = '<skipped/>' if skipped else ''
        (self.root / name).write_text(
            '<testsuite name="example.streamatlas.catalog.SessionAccountPostgresTest" tests="1" '
            f'skipped="{int(skipped)}"><testcase classname="{classname}" name="syntheticAccount">'
            f'{outcome}</testcase></testsuite>')

    def test_postgres_account_gate_cannot_borrow_passing_unit_tests(self):
        self.record('spring-tests')
        self.record('spring-account-postgres')
        (self.root / 'TEST-synthetic.xml').write_text(
            '<testsuite name="synthetic" tests="1"><testcase name="unit"/></testsuite>')
        for skipped in (None, True):
            with self.subTest(skipped=skipped):
                if skipped is not None:
                    self.integration_xml(skipped=skipped)
                result = self.result()
                self.assertEqual(self.check(result, 'spring-tests')['status'], 'PASS')
                self.assertEqual(self.check(result, 'spring-tests')['test_counts']['tests'], 1)
                self.assertEqual(self.check(result, 'spring-account-postgres')['status'], 'FAIL')

    def test_integration_evidence_cannot_substitute_for_missing_unit_tests(self):
        self.record('spring-tests')
        self.record('spring-account-postgres')
        self.integration_xml()
        result = self.result()
        self.assertEqual(self.check(result, 'spring-tests')['status'], 'FAIL')
        self.assertEqual(self.check(result, 'spring-account-postgres')['status'], 'PASS')

    def test_renamed_unit_xml_cannot_masquerade_as_postgres_integration(self):
        self.record('spring-account-postgres')
        self.integration_xml(classname='example.streamatlas.catalog.CatalogControllerTest')
        result = self.result()
        self.assertEqual(self.check(result, 'spring-account-postgres')['status'], 'FAIL')

    def test_vendor_and_session_integration_checks_are_required(self):
        for name in ('hls-vendor', 'vendored-dependency-audit', 'spring-pg-guard',
                     'spring-pg-apply', 'spring-pg-verify', 'spring-account-postgres',
                     'spring-node-shadow-parity', 'spring-pg-final-verify'):
            self.assertIn(name, summary.EXPECTED_CHECKS)
            self.assertEqual(self.check(self.result(), name)['status'], 'NOT RUN')

    def shadow_report(self, **changes):
        cases = []
        for name in sorted(summary.SHADOW_CASES):
            statuses = [200, 200 if name in ('owner', 'other', 'defaults') else 401]
            cases.append({'name': name, 'status': 'PASS', 'expectedStatuses': statuses,
                          'parity': {'compared': 2, 'equivalent': 2, 'mismatches': 0, 'notRun': 0,
                                     'cutoverApproved': False, 'fullAuthorizationParity': False},
                          'comparisons': [
                              {'path': path, 'result': 'EQUIVALENT', 'nodeStatus': statuses[index],
                               'springStatus': statuses[index], 'differenceDigest': None}
                              for index, path in enumerate(summary.SHADOW_PATHS)],
                          'transport': [], 'serviceErrors': []})
        report = {'format': 'streamatlas-spring-node-account-parity-v1',
                  'source': {'commit': COMMIT, 'trackedWorktreeDirty': False},
                  'status': 'PASS', 'cleanup': 'PASS', 'errors': [],
                  'syntheticOnly': True, 'readOnly': True, 'readOnlyStateUnchanged': True,
                  'cutoverApproved': False, 'fullAuthorizationParity': False,
                  'bodiesStored': False, 'credentialsStored': False,
                  'postgres': {'major': 16, 'disposable': True},
                  'caseCount': 7, 'readComparisons': 14, 'readRequests': 28,
                  'limits': {'minIntervalMs': 1000, 'maxRequests': 28},
                  'paths': summary.SHADOW_PATHS, 'cases': cases}
        report.update(changes)
        (self.root / summary.SHADOW_REPORT_NAME).write_text(json.dumps(report))
        return report

    def test_shadow_zero_exit_requires_actual_paired_http_artifact(self):
        self.record('spring-node-shadow-parity')
        result = self.result()
        self.assertEqual(self.check(result, 'spring-node-shadow-parity')['status'], 'NOT RUN')
        self.shadow_report()
        result = self.result()
        check = self.check(result, 'spring-node-shadow-parity')
        self.assertEqual(check['status'], 'PASS')
        self.assertEqual(check['test_counts'], {'cases': 7, 'read_comparisons': 14, 'read_requests': 28})

    def test_shadow_rejects_stale_dirty_incomplete_or_unclean_evidence(self):
        self.record('spring-node-shadow-parity')
        invalid = [
            {'source': {'commit': 'b' * 40, 'trackedWorktreeDirty': False}},
            {'source': {'commit': COMMIT, 'trackedWorktreeDirty': True}},
            {'cases': []}, {'readRequests': 0}, {'cleanup': 'FAIL'},
            {'readOnlyStateUnchanged': False}, {'cutoverApproved': True},
            {'errors': ['SYNTHETIC_FAILURE']}, {'limits': {'minIntervalMs': 0, 'maxRequests': 28}},
        ]
        for changes in invalid:
            with self.subTest(changes=changes):
                self.shadow_report(**changes)
                self.assertEqual(self.check(self.result(), 'spring-node-shadow-parity')['status'], 'FAIL')

    def test_shadow_rejects_matching_500s_missing_reads_and_transport_errors(self):
        self.record('spring-node-shadow-parity')
        for defect in ('server-error', 'missing-read', 'transport-error'):
            with self.subTest(defect=defect):
                report = self.shadow_report()
                case = report['cases'][0]
                if defect == 'server-error':
                    case['comparisons'][0].update(nodeStatus=500, springStatus=500)
                elif defect == 'missing-read':
                    case['parity']['notRun'] = 1
                else:
                    case['transport'] = [{'error': 'SHADOW_TIMEOUT'}]
                (self.root / summary.SHADOW_REPORT_NAME).write_text(json.dumps(report))
                self.assertEqual(self.check(self.result(), 'spring-node-shadow-parity')['status'], 'FAIL')

    def test_shadow_duplicate_raw_artifacts_and_malformed_reports_fail(self):
        self.record('spring-node-shadow-parity')
        self.shadow_report()
        duplicate = self.root / 'duplicate' / summary.SHADOW_REPORT_NAME
        duplicate.parent.mkdir()
        duplicate.write_text((self.root / summary.SHADOW_REPORT_NAME).read_text())
        self.assertEqual(self.check(self.result(), 'spring-node-shadow-parity')['status'], 'FAIL')
        duplicate.unlink()
        (self.root / summary.SHADOW_REPORT_NAME).write_text('{broken')
        self.assertEqual(self.check(self.result(), 'spring-node-shadow-parity')['status'], 'FAIL')

    def browser(self, state, *, bootstrap='passed', success=False, commit=COMMIT):
        report = {'suite': 'network-real-browser-v1', 'runtime': {'commit': commit},
                  'bootstrap': {'status': bootstrap}, 'success': success,
                  'results': {'chromium': {'status': state, 'checks': []}}}
        (self.root / 'qa-browser-chromium.json').write_text(json.dumps(report))

    def test_unavailable_browser_stays_not_run_but_retains_command_failure(self):
        self.record('browser-chromium', status='FAIL', exit_code=1)
        self.browser('unavailable')
        result = self.result({'browser': {'result': 'failure'}})
        check = self.check(result, 'browser-chromium')
        self.assertEqual(check['status'], 'NOT RUN')
        self.assertEqual(check['exit_code'], 1)
        self.assertEqual(result['exit_code'], 1)

    def test_real_browser_failure_is_never_reclassified_unavailable(self):
        self.record('browser-chromium', status='FAIL', exit_code=1)
        self.browser('failed')
        result = self.result()
        self.assertEqual(self.check(result, 'browser-chromium')['status'], 'FAIL')
        self.browser('failed', bootstrap='unavailable')
        result = self.result()
        self.assertEqual(self.check(result, 'browser-chromium')['status'], 'FAIL')

    def test_browser_pass_requires_actual_raw_and_axe_evidence(self):
        self.record('browser-chromium')
        result = self.result()
        self.assertEqual(self.check(result, 'browser-chromium')['status'], 'NOT RUN')
        self.browser('passed', success=True)
        result = self.result()
        self.assertEqual(self.check(result, 'browser-chromium')['status'], 'FAIL')

    def test_job_failure_or_cancellation_remains_failure_with_missing_checks(self):
        for state in ('failure', 'cancelled'):
            with self.subTest(state=state):
                result = self.result({'upstream': {'result': state}})
                self.assertEqual(result['status'], 'FAIL')
                self.assertEqual(result['exit_code'], 1)

    def test_invalid_jobs_metadata_fails(self):
        result = summary.summarize(self.root, COMMIT, None)
        self.assertEqual(result['exit_code'], 1)
        self.assertTrue(result['metadata_errors'])

    def test_disposable_catalog_parity_is_a_required_current_commit_check(self):
        self.assertIn('pg-catalog-full-row-parity', summary.EXPECTED_CHECKS)
        missing = self.result()
        self.assertEqual(self.check(missing, 'pg-catalog-full-row-parity')['status'], 'NOT RUN')
        self.assertFalse(missing['coverage_complete'])
        self.record('pg-catalog-full-row-parity')
        accepted = self.result()
        self.assertEqual(self.check(accepted, 'pg-catalog-full-row-parity')['status'], 'PASS')
        self.assertFalse(accepted['coverage_complete'])  # other checks remain missing
        self.record('pg-catalog-full-row-parity', commit='b' * 40)
        stale = self.result()
        self.assertEqual(self.check(stale, 'pg-catalog-full-row-parity')['status'], 'FAIL')
        self.assertEqual(stale['exit_code'], 1)

    def test_complete_success_requires_all_checks_and_actual_runtime_evidence(self):
        for name in summary.EXPECTED_CHECKS:
            kwargs = {'test_counts': {'tests': 1, 'pass': 1, 'fail': 0}} if name.startswith('node-batch-') or name == 'python-qa-tests' else {}
            self.record(name, **kwargs)
        (self.root / 'TEST-synthetic.xml').write_text(
            '<testsuite name="synthetic" tests="1"><testcase name="executed"/></testsuite>')
        self.integration_xml()
        self.shadow_report()
        for engine in summary.ENGINES:
            (self.root / f'qa-browser-{engine}.json').write_text(json.dumps({
                'suite': 'network-real-browser-v1', 'runtime': {'commit': COMMIT},
                'bootstrap': {'status': 'passed'}, 'success': True,
                'results': {engine: {'status': 'passed', 'checks': [
                    {'name': name, 'result': {'status': 'passed', 'violations': 0}} if name == 'axe-wcag-home'
                    else {'name': name, 'status': 'passed'}
                    for name in sorted(summary.REQUIRED_BROWSER_CHECKS)
                ]}},
            }))
        result = self.result()
        self.assertTrue(result['coverage_complete'])
        self.assertEqual(result['status'], 'PASS')
        self.assertEqual(result['exit_code'], 0)
        (self.root / 'contracts-dynamic.json').unlink()
        result = self.result()
        self.assertFalse(result['coverage_complete'])
        self.assertEqual(result['status'], 'NOT RUN')


if __name__ == '__main__':
    unittest.main()
