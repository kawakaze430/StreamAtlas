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
