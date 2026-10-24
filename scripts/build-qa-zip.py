#!/usr/bin/env python3
"""Build a deterministic cumulative source ZIP without runtime or private files.

A Git checkout contributes only indexed paths. An extracted source ZIP (without
.git) can be repackaged with the same exclusions. This is a packaging boundary,
not a substitute for reviewing tracked source for secrets before committing.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import stat
import subprocess
import tempfile
import zipfile

ROOT = Path(__file__).resolve().parents[1]
EXCLUDED = {
    '.git', '.aws', '.azure', '.ssh', '.codex', '.agents', 'node_modules',
    'audit-output', 'reports', '__pycache__', '.pytest_cache', '.terraform',
    '.tmp', '.cache', '.venv', 'venv', 'backups', 'private', 'target',
    'coverage', 'archives',
}
PRIVATE_SUFFIXES = (
    '.db', '.db-shm', '.db-wal', '.sqlite', '.sqlite3', '.sqlite-shm',
    '.sqlite-wal', '.sqlite3-shm', '.sqlite3-wal', '.pyc', '.log', '.pem',
    '.key', '.p12', '.pfx', '.tfstate', '.tfstate.backup', '.tfvars',
    '.tfvars.json', '.zip', '.tar', '.tar.gz', '.tgz', '.jar', '.class',
    '.sql.export', '.zip.sha256', '.tmp', '.bak', '.swp', '.swo', '~',
)
EXAMPLE_ENV = {'.env.example', '.env.runtime.example'}
FIXED_TIMESTAMP = (2026, 10, 23, 0, 0, 0)


def allowed(relative: PurePosixPath) -> bool:
    parts = relative.parts
    if not parts or relative.is_absolute() or any(p in {'', '.', '..'} for p in parts):
        raise RuntimeError('Invalid source path')
    if any(p in EXCLUDED for p in parts):
        return False
    for part in parts:
        lower = part.lower()
        if lower.endswith(PRIVATE_SUFFIXES):
            return False
        if lower.startswith('.env') and part not in EXAMPLE_ENV:
            return False
        if lower in {'credentials.json', 'credentials', 'secrets.json', '.netrc', '.npmrc', '.ds_store'}:
            return False
    return parts[0] != 'data' or relative.as_posix() == 'data/.gitkeep'


def _regular_file(root: Path, relative: PurePosixPath) -> Path:
    current = root
    for part in relative.parts:
        current = current / part
        if current.is_symlink():
            raise RuntimeError('Refusing to package symlink: ' + relative.as_posix())
    if not current.is_file():
        raise RuntimeError('Indexed source file is missing or not regular: ' + relative.as_posix())
    if not stat.S_ISREG(current.stat().st_mode):
        raise RuntimeError('Refusing non-regular source file: ' + relative.as_posix())
    return current


def collect_files(root: Path) -> tuple[list[tuple[PurePosixPath, Path, int]], str]:
    root = root.resolve()
    files = []
    if (root / '.git').exists() or (root / '.git').is_symlink():
        # Do not fall back to a filesystem walk on Git errors: it could include
        # untracked user data that was intentionally excluded by the index.
        top = subprocess.run(['git', '-C', str(root), 'rev-parse', '--show-toplevel'],
                             check=True, capture_output=True, text=True)
        if Path(top.stdout.strip()).resolve() != root:
            raise RuntimeError('Source root does not match repository root')
        result = subprocess.run(['git', '-C', str(root), 'ls-files', '--stage', '-z'],
                                check=True, capture_output=True)
        for record in result.stdout.split(b'\0'):
            if not record:
                continue
            metadata, name = record.split(b'\t', 1)
            mode, _object, stage = metadata.split()
            if stage != b'0':
                raise RuntimeError('Cannot package an unresolved Git index')
            relative = PurePosixPath(os.fsdecode(name))
            if not allowed(relative):
                continue
            if mode not in {b'100644', b'100755'}:
                raise RuntimeError('Refusing non-regular indexed source: ' + relative.as_posix())
            files.append((relative, _regular_file(root, relative), 0o755 if mode == b'100755' else 0o644))
        selection = 'git-index'
    else:
        for directory, subdirs, names in os.walk(root, followlinks=False):
            base = Path(directory)
            kept = []
            for name in sorted(subdirs):
                relative = PurePosixPath((base / name).relative_to(root).as_posix())
                if allowed(relative):
                    if (base / name).is_symlink():
                        raise RuntimeError('Refusing to package symlink: ' + relative.as_posix())
                    kept.append(name)
            subdirs[:] = kept
            for name in names:
                relative = PurePosixPath((base / name).relative_to(root).as_posix())
                if allowed(relative):
                    path = _regular_file(root, relative)
                    mode = 0o755 if path.stat().st_mode & 0o111 else 0o644
                    files.append((relative, path, mode))
        selection = 'extracted-source'
    files.sort(key=lambda item: item[0].as_posix())
    if not files:
        raise RuntimeError('Refusing to build an empty source archive')
    return files, selection


def build_archive(root: Path, output: Path) -> dict:
    root, output = root.resolve(), output.resolve()
    if output == root or root in output.parents:
        raise RuntimeError('Archive output must be outside the source tree')
    files, selection = collect_files(root)
    output.parent.mkdir(parents=True, exist_ok=True)
    # A failed packaging operation must not replace an existing usable archive.
    fd, temporary_name = tempfile.mkstemp(prefix='.' + output.name + '.', suffix='.tmp', dir=output.parent)
    os.close(fd)
    temporary = Path(temporary_name)
    try:
        with zipfile.ZipFile(temporary, 'w', compression=zipfile.ZIP_DEFLATED,
                             compresslevel=9, strict_timestamps=True) as archive:
            for relative, path, mode in files:
                info = zipfile.ZipInfo(str(PurePosixPath(root.name) / relative), date_time=FIXED_TIMESTAMP)
                info.create_system = 3
                info.compress_type = zipfile.ZIP_DEFLATED
                info.external_attr = (stat.S_IFREG | mode) << 16
                archive.writestr(info, path.read_bytes(), compress_type=zipfile.ZIP_DEFLATED, compresslevel=9)
        with temporary.open('rb') as archive_file:
            digest = hashlib.file_digest(archive_file, 'sha256').hexdigest()
        temporary.replace(output)
    finally:
        temporary.unlink(missing_ok=True)
    output.with_suffix(output.suffix + '.sha256').write_text(f'{digest}  {output.name}\n', encoding='utf-8')
    return {'zip': str(output), 'files': len(files), 'bytes': output.stat().st_size,
            'sha256': digest, 'selection': selection}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    version = json.loads((ROOT / 'package.json').read_text(encoding='utf-8'))['version']
    parser.add_argument('output', nargs='?', type=Path,
                        default=ROOT.parent / f'StreamAtlas-v{version}-complete.zip')
    args = parser.parse_args()
    print(json.dumps(build_archive(ROOT, args.output), indent=2))


if __name__ == '__main__':
    main()
