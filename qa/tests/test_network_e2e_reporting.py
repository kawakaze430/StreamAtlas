"""Failure evidence and cleanup tests; no browser or database runtime required."""
import contextlib
import importlib.util
import io
import json
import pathlib
import subprocess
import tempfile
import types
import unittest
from unittest import mock


SCRIPT = pathlib.Path(__file__).resolve().parents[1] / 'network-e2e.py'
SPEC = importlib.util.spec_from_file_location('network_e2e', SCRIPT)
runner = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(runner)


class BrowserEvidenceTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.output = pathlib.Path(self.temp.name) / 'report.json'
        self.runtime = {'commit': 'a' * 40, 'python': '3.test', 'node': 'v22.test',
                        'playwright': None, 'commit_source': 'git'}
        patcher = mock.patch.object(runner, 'runtime_metadata', return_value=self.runtime)
        patcher.start()
        self.addCleanup(patcher.stop)

    def execute(self, *extra):
        with contextlib.redirect_stdout(io.StringIO()):
            result = runner.run(['--engines', 'chromium', 'firefox', '--output',
                                 str(self.output), *extra])
        return result, json.loads(self.output.read_text())

    def fixtures(self, args, **kwargs):
        self.fixture_dir = pathlib.Path(args[-1])
        credentials = self.fixture_dir / 'credentials.json'
        credentials.write_text(json.dumps({'viewer': {'email': 'viewer@example.test',
                                                       'password': 'synthetic-secret'}}))
        return subprocess.CompletedProcess(args, 0, stdout=json.dumps({
            'credentialsPath': str(credentials),
            'dbPath': str(self.fixture_dir / 'test.sqlite'),
        }))

    def test_missing_playwright_writes_unavailable_bootstrap_without_starting_server(self):
        with mock.patch.object(runner, 'load_playwright', side_effect=ModuleNotFoundError(
                "No module named 'playwright'")), mock.patch.object(runner.subprocess, 'Popen') as popen:
            result, report = self.execute('--strict')
        self.assertEqual(result, 1)
        self.assertFalse(report['success'])
        self.assertEqual(report['runtime'], self.runtime)
        self.assertEqual(report['bootstrap']['status'], 'unavailable')
        self.assertEqual(report['bootstrap']['stage'], 'playwright-import')
        self.assertTrue(all(item == {'status': 'not-run', 'checks': []}
                            for item in report['results'].values()))
        popen.assert_not_called()

    def test_fixture_failure_replaces_stale_success_without_leaking_captured_output(self):
        self.output.write_text('{"success":true}')
        failure = subprocess.CalledProcessError(19, ['node', 'scripts/qa-fixtures.js'],
                                                output='sensitive-fixture-output',
                                                stderr='sensitive-fixture-stderr')
        with mock.patch.object(runner, 'load_playwright'), \
                mock.patch.object(runner.subprocess, 'run', side_effect=failure), \
                mock.patch.object(runner.subprocess, 'Popen') as popen:
            result, report = self.execute('--strict')
        self.assertEqual(result, 1)
        self.assertFalse(report['success'])
        self.assertEqual(report['bootstrap']['stage'], 'fixtures')
        self.assertIn('code 19', report['bootstrap']['error'])
        self.assertNotIn('sensitive-fixture', self.output.read_text())
        popen.assert_not_called()

    def test_readiness_failure_reaps_server_and_removes_disposable_credentials(self):
        server = mock.Mock()
        server.wait.side_effect = [subprocess.TimeoutExpired(['node'], 4), 0]
        with mock.patch.object(runner, 'load_playwright'), \
                mock.patch.object(runner.subprocess, 'run', side_effect=self.fixtures), \
                mock.patch.object(runner.subprocess, 'Popen', return_value=server), \
                mock.patch.object(runner, 'port', return_value=12345), \
                mock.patch.object(runner, 'ready', side_effect=RuntimeError(
                    'readiness failed for viewer@example.test password=synthetic-secret')):
            result, report = self.execute('--strict')
        self.assertEqual(result, 1)
        self.assertEqual(report['bootstrap']['stage'], 'server-ready')
        self.assertEqual(report['bootstrap']['status'], 'failed')
        self.assertTrue(all(item['status'] == 'not-run' for item in report['results'].values()))
        self.assertNotIn('synthetic-secret', self.output.read_text())
        self.assertNotIn('viewer@example.test', self.output.read_text())
        server.terminate.assert_called_once()
        server.kill.assert_called_once()
        self.assertEqual(server.wait.call_count, 2)
        self.assertFalse(self.fixture_dir.exists())

    def test_missing_engines_are_unavailable_and_strict_mode_fails(self):
        for strict, expected_exit in [(False, 0), (True, 1)]:
            with self.subTest(strict=strict):
                browser_type = mock.Mock()
                browser_type.launch.side_effect = RuntimeError(
                    "BrowserType.launch: Executable doesn't exist at /browser-cache/missing")
                playwright = mock.MagicMock()
                playwright.__enter__.return_value = types.SimpleNamespace(
                    chromium=browser_type, firefox=browser_type)
                server = mock.Mock()
                with mock.patch.object(runner, 'load_playwright', return_value=lambda: playwright), \
                        mock.patch.object(runner.subprocess, 'run', side_effect=self.fixtures), \
                        mock.patch.object(runner.subprocess, 'Popen', return_value=server), \
                        mock.patch.object(runner, 'port', return_value=12345), \
                        mock.patch.object(runner, 'ready'):
                    result, report = self.execute(*(['--strict'] if strict else []))
                self.assertEqual(result, expected_exit)
                self.assertFalse(report['success'])
                self.assertEqual(report['bootstrap']['status'], 'passed')
                self.assertEqual(browser_type.launch.call_count, 2)
                self.assertTrue(all(item['status'] == 'unavailable' and not item['checks']
                                    for item in report['results'].values()))
                self.assertFalse(self.fixture_dir.exists())


if __name__ == '__main__':
    unittest.main()
