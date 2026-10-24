import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

const root = path.resolve(import.meta.dirname, '..');
const wrapper = path.join(root, 'scripts/ci-check.sh');
const commit = 'a'.repeat(40);

function fixture(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'streamatlas-ci-evidence-'));
  t.after(() => fs.rmSync(dir, {recursive: true, force: true}));
  return {
    dir,
    run: (...args) => {
      const env = {...process.env, GITHUB_SHA: commit, SA_CI_REPORT_DIR: path.join(dir, 'reports')};
      // A subprocess running its own test runner must not inherit this runner's context.
      delete env.NODE_TEST_CONTEXT;
      return spawnSync('bash', [wrapper, ...args], {
        cwd: root,
        env,
        encoding: 'utf8',
        timeout: 15000,
      });
    },
    read: id => JSON.parse(fs.readFileSync(path.join(dir, 'reports', `${id}.json`), 'utf8')),
  };
}

test('CI evidence retains the failing command exit code and both output streams through tee', t => {
  const f = fixture(t);
  const args = [process.execPath, '-e', 'console.log("synthetic stdout");console.error("synthetic stderr");process.exit(7)'];
  const result = f.run('failure-check', ...args);
  assert.equal(result.status, 7, result.stderr);
  const report = f.read('failure-check');
  assert.equal(report.status, 'FAIL');
  assert.equal(report.exit_code, 7);
  assert.equal(report.commit, commit);
  assert.deepEqual(report.command, args);
  assert.ok(report.duration_seconds >= 0);
  const log = fs.readFileSync(report.log, 'utf8');
  assert.match(log, /synthetic stdout/);
  assert.match(log, /synthetic stderr/);
  assert.match(result.stdout, /synthetic stderr/);
});

test('CI success captures output while forwarding shell metacharacters as literal arguments', t => {
  const f = fixture(t);
  const sentinel = path.join(f.dir, 'must-not-exist');
  const literal = `$(touch ${sentinel}); echo unexpected`;
  const args = [process.execPath, '-e', 'console.log(process.argv[1])', literal];
  const result = f.run('success-check', ...args);
  assert.equal(result.status, 0, result.stderr);
  const report = f.read('success-check');
  assert.equal(report.status, 'PASS');
  assert.equal(report.exit_code, 0);
  assert.deepEqual(report.command, args);
  assert.equal(fs.readFileSync(report.log, 'utf8'), literal + '\n');
  assert.equal(fs.existsSync(sentinel), false);
});

test('CI omission remains NOT RUN with no invented command exit code or test count', t => {
  const f = fixture(t);
  const result = f.run('missing-runtime', '--not-run', 'Required synthetic runtime is unavailable');
  assert.equal(result.status, 0, result.stderr);
  const report = f.read('missing-runtime');
  assert.equal(report.status, 'NOT RUN');
  assert.equal(report.exit_code, null);
  assert.deepEqual(report.command, []);
  assert.equal(report.reason, 'Required synthetic runtime is unavailable');
  assert.equal(report.test_counts, undefined);
  assert.match(fs.readFileSync(report.log, 'utf8'), /^NOT RUN:/);
});

test('CI check IDs cannot escape the evidence directory or execute their command', t => {
  const f = fixture(t);
  const sentinel = path.join(f.dir, 'must-not-exist');
  for (const id of ['../outside', '/absolute', '.', 'bad id', '$(id)', 'x'.repeat(81)]) {
    const result = f.run(id, process.execPath, '-e', 'require("fs").writeFileSync(process.argv[1], "unexpected")', sentinel);
    assert.equal(result.status, 2, `${id}: ${result.stderr}`);
  }
  assert.equal(fs.existsSync(sentinel), false);
  assert.equal(fs.existsSync(path.join(f.dir, 'reports')), false);
});

test('CI evidence captures completed Node TAP totals and preserves skipped outcomes', t => {
  const f = fixture(t);
  const file = path.join(f.dir, 'fixture.test.mjs');
  fs.writeFileSync(file, 'import test from "node:test"; import assert from "node:assert/strict"; test("fixture executes", () => assert.equal(typeof process.pid, "number")); test.skip("fixture intentionally omitted", () => {});\n');
  const result = f.run('node-counts', process.execPath, '--test', '--test-reporter=tap', file);
  assert.equal(result.status, 0, result.stderr);
  const report = f.read('node-counts');
  assert.equal(report.status, 'PASS');
  assert.ok(report.test_counts, result.stdout + result.stderr);
  assert.equal(report.test_counts.tests, 2);
  assert.equal(report.test_counts.pass, 1);
  assert.equal(report.test_counts.fail, 0);
  assert.equal(report.test_counts.skipped, 1);
});

test('CI evidence counts real Python unittest skips separately from passes', t => {
  const f = fixture(t);
  const file = path.join(f.dir, 'fixture_unittest.py');
  fs.writeFileSync(file, 'import unittest\nclass EvidenceFixture(unittest.TestCase):\n    def test_executed(self):\n        self.assertEqual("ready".upper(), "READY")\n    @unittest.skip("intentional fixture omission")\n    def test_omitted(self):\n        self.fail("must not execute")\n');
  const result = f.run('python-counts', 'python3', '-m', 'unittest', 'discover', '-s', f.dir, '-p', 'fixture_unittest.py');
  assert.equal(result.status, 0, result.stderr);
  const report = f.read('python-counts');
  assert.equal(report.status, 'PASS');
  assert.deepEqual(report.test_counts, {tests: 2, skipped: 1, pass: 1, fail: 0});
});

test('CI log capture failure cannot turn a successful command into passing evidence', t => {
  const f = fixture(t);
  const reportDir = path.join(f.dir, 'reports');
  fs.mkdirSync(path.join(reportDir, 'capture-error.log'), {recursive: true});
  fs.writeFileSync(path.join(reportDir, 'capture-error.json'), JSON.stringify({status: 'PASS', stale: true}));
  const result = f.run('capture-error', process.execPath, '-e', 'console.log("synthetic command succeeds")');
  assert.equal(result.status, 1);
  const report = f.read('capture-error');
  assert.equal(report.status, 'FAIL');
  assert.equal(report.exit_code, 0, 'retain the actual command exit despite evidence failure');
  assert.equal(report.stale, undefined);
  assert.match(report.evidence_error, /Output capture failed/);
});
