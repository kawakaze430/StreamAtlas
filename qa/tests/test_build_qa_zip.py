"""Cumulative source archives must exclude private/runtime files in both modes."""
import hashlib
import importlib.util
from pathlib import Path
import stat
import subprocess
import tempfile
import unittest
import zipfile

SCRIPT = Path(__file__).resolve().parents[2] / 'scripts' / 'build-qa-zip.py'
SPEC = importlib.util.spec_from_file_location('build_qa_zip', SCRIPT)
packaging = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(packaging)


class ArchiveTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.base = Path(self.temp.name)
        self.root = self.base / 'StreamAtlas'
        self.root.mkdir()
        self.output = self.base / 'complete.zip'

    def write(self, relative, content='source'):
        path = self.root / relative
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content)
        return path

    def git(self, *args):
        return subprocess.run(['git', '-C', str(self.root), *args], check=True,
                              capture_output=True, text=True)

    def contents(self):
        with zipfile.ZipFile(self.output) as archive:
            return {name: archive.read(name) for name in archive.namelist()}

    def test_git_selects_only_indexed_source_and_keeps_synthetic_media(self):
        self.git('init', '-q')
        self.write('src/app.js')
        self.write('public/assets/hls-demo/sample-1/lo_seg_000.ts', 'synthetic fixture')
        self.write('docs/new-source.md')
        self.git('add', '.')
        self.write('CODEX_EXTERNAL_TEST_EVIDENCE.md', 'user untracked report')
        self.write('private-media.mp4', 'untracked user media')
        result = packaging.build_archive(self.root, self.output)
        self.assertEqual(result['selection'], 'git-index')
        self.assertEqual(set(self.contents()), {
            'StreamAtlas/src/app.js', 'StreamAtlas/docs/new-source.md',
            'StreamAtlas/public/assets/hls-demo/sample-1/lo_seg_000.ts'})

    def test_sensitive_and_compiled_files_are_excluded_even_if_indexed(self):
        self.git('init', '-q')
        unsafe = ['backend-spring/target/classes/Example.class', 'backend-spring/target/app.jar',
                  'node_modules/demo/index.js', '.env', 'deployment/aws/.env.runtime',
                  'deployment/aws/terraform/terraform.tfvars', 'deployment/aws/terraform/terraform.tfvars.json',
                  'deployment/aws/terraform/terraform.tfstate.backup', 'qa/credentials.json',
                  '.aws/credentials', '.venv/bin/python', 'data/account.sqlite3-wal',
                  'data/public.json', 'data/private/video.mp4', 'reports/output.json',
                  'backups/restore.sql', '.tmp/key', 'demo.key', 'source.zip', 'source.tar.gz']
        safe = ['src/index.js', '.env.example', '.env.runtime.example',
                'deployment/aws/terraform/terraform.tfvars.example', 'data/.gitkeep',
                'backend-spring/src/main/java/Example.java', 'migrations/001.sql']
        for relative in unsafe + safe:
            self.write(relative)
        self.git('add', '.')
        packaging.build_archive(self.root, self.output)
        self.assertEqual(set(self.contents()), {'StreamAtlas/' + p for p in safe})

    def test_extracted_fallback_uses_same_exclusions_and_is_deterministic(self):
        self.write('src/index.js', 'retained source')
        executable = self.write('scripts/check.sh', '#!/bin/sh\nexit 0\n')
        executable.chmod(0o755)
        for relative in ['backend-spring/target/app.jar', 'qa/credentials.json',
                         'data/private/movie.mp4', '.venv/pyvenv.cfg', '.env.secret']:
            self.write(relative)
        first = packaging.build_archive(self.root, self.output)
        original = self.output.read_bytes()
        second = packaging.build_archive(self.root, self.output)
        self.assertEqual(first['selection'], 'extracted-source')
        self.assertEqual(first['sha256'], second['sha256'])
        self.assertEqual(original, self.output.read_bytes())
        self.assertEqual(hashlib.sha256(original).hexdigest(), first['sha256'])
        self.assertEqual(self.output.with_suffix('.zip.sha256').read_text(),
                         first['sha256'] + '  complete.zip\n')
        with zipfile.ZipFile(self.output) as archive:
            self.assertEqual(set(archive.namelist()), {'StreamAtlas/src/index.js', 'StreamAtlas/scripts/check.sh'})
            info = archive.getinfo('StreamAtlas/scripts/check.sh')
            self.assertEqual(info.create_system, 3)
            self.assertEqual(stat.S_IMODE(info.external_attr >> 16), 0o755)
            self.assertEqual(info.date_time, packaging.FIXED_TIMESTAMP)

    def test_git_executable_mode_and_unresolved_index_fail_closed(self):
        self.git('init', '-q')
        path = self.write('scripts/check.sh', '#!/bin/sh\n')
        self.git('add', '.')
        self.git('update-index', '--chmod=+x', 'scripts/check.sh')
        path.chmod(0o644)
        packaging.build_archive(self.root, self.output)
        with zipfile.ZipFile(self.output) as archive:
            self.assertEqual(stat.S_IMODE(archive.infolist()[0].external_attr >> 16), 0o755)
        object_id = self.git('hash-object', '-w', str(path)).stdout.strip()
        self.git('update-index', '--force-remove', 'scripts/check.sh')
        subprocess.run(['git', '-C', str(self.root), 'update-index', '--index-info'],
                       input=f'100644 {object_id} 1\tscripts/check.sh\n', text=True, check=True,
                       capture_output=True)
        with self.assertRaisesRegex(RuntimeError, 'unresolved Git index'):
            packaging.build_archive(self.root, self.output)

    def test_symlink_files_and_directories_are_never_followed(self):
        self.write('source.txt')
        outside = self.base / 'private.txt'
        outside.write_text('private data')
        link = self.root / 'link.txt'
        link.symlink_to(outside)
        with self.assertRaisesRegex(RuntimeError, 'symlink'):
            packaging.build_archive(self.root, self.output)
        link.unlink()
        (self.root / 'linked-dir').symlink_to(self.base, target_is_directory=True)
        with self.assertRaisesRegex(RuntimeError, 'symlink'):
            packaging.build_archive(self.root, self.output)

    def test_tracked_symlink_missing_source_and_broken_git_fail_closed(self):
        self.git('init', '-q')
        path = self.write('source.txt')
        self.git('add', '.')
        path.unlink()
        with self.assertRaisesRegex(RuntimeError, 'missing'):
            packaging.build_archive(self.root, self.output)
        path.symlink_to(self.base / 'outside')
        self.git('add', 'source.txt')
        with self.assertRaisesRegex(RuntimeError, 'non-regular indexed'):
            packaging.build_archive(self.root, self.output)
        (self.root / '.git' / 'HEAD').unlink()
        with self.assertRaises(subprocess.CalledProcessError):
            packaging.build_archive(self.root, self.output)
        self.assertFalse(self.output.exists())

    def test_output_inside_source_is_rejected_without_changing_existing_archive(self):
        self.write('source.txt')
        output = self.write('archive.zip', 'existing archive')
        with self.assertRaisesRegex(RuntimeError, 'outside the source tree'):
            packaging.build_archive(self.root, output)
        self.assertEqual(output.read_text(), 'existing archive')


if __name__ == '__main__':
    unittest.main()
