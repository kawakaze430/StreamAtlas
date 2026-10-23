#!/usr/bin/env python3
"""Deterministic cumulative source archive; preserves executable bits, excludes runtime/private data."""
from __future__ import annotations
import pathlib, zipfile, hashlib, json, sys, os
ROOT=pathlib.Path(__file__).resolve().parents[1]
OUT=pathlib.Path(sys.argv[1]).resolve() if len(sys.argv)>1 else ROOT.parent/'streamatlas-complete-checkpoints-01-to-28.zip'
EXCLUDED={'.git','node_modules','audit-output','reports','__pycache__','.pytest_cache','.terraform','.tmp','backups','private'}
def allowed(p):
    rel=p.relative_to(ROOT);parts=rel.parts
    if any(x in EXCLUDED for x in parts):return False
    if any(x.endswith(('.db','.db-shm','.db-wal','.sqlite','.sqlite3','.pyc','.log','.tfstate','.tfstate.backup','.pem')) for x in parts):return False
    if any(x.startswith('.env') and x not in {'.env.example','.env.runtime.example'} for x in parts):return False
    if p.is_symlink():raise RuntimeError('Refusing to package symlink: '+str(rel))
    if parts[0]=='data' and rel.as_posix()!='data/.gitkeep':return False
    return True
files=sorted((p for p in ROOT.rglob('*') if p.is_file() and allowed(p)),key=lambda p:p.relative_to(ROOT).as_posix())
OUT.parent.mkdir(parents=True,exist_ok=True)
with zipfile.ZipFile(OUT,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=9,strict_timestamps=True) as z:
    for p in files:
        rel=pathlib.PurePosixPath(ROOT.name)/pathlib.PurePosixPath(p.relative_to(ROOT))
        info=zipfile.ZipInfo(str(rel),date_time=(2026,10,23,0,0,0));info.compress_type=zipfile.ZIP_DEFLATED
        info.external_attr=((0o755 if os.access(p,os.X_OK) else 0o644)<<16)
        z.writestr(info,p.read_bytes(),compress_type=zipfile.ZIP_DEFLATED,compresslevel=9)
sha=hashlib.sha256(OUT.read_bytes()).hexdigest()
(OUT.with_suffix(OUT.suffix+'.sha256')).write_text(f'{sha}  {OUT.name}\n')
print(json.dumps({'zip':str(OUT),'files':len(files),'bytes':OUT.stat().st_size,'sha256':sha},indent=2))
