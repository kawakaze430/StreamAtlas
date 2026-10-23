import test from 'node:test';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';import fs from 'node:fs';import path from 'node:path';import os from 'node:os';
const root=path.resolve(import.meta.dirname,'..'),tmp=fs.mkdtempSync(path.join(os.tmpdir(),'sa-postgres09-'));
const db=path.join(tmp,'test.db'),dir=path.join(tmp,'catalog'),sql=path.join(tmp,'catalog.sql');
test('09: PG schema files include required modules, no private database',()=>{
 for(const f of ['001_catalog.sql','002_accounts.sql','003_creator_and_operations.sql']){
  const s=fs.readFileSync(path.join(root,'migrations/postgresql',f),'utf8');
  assert.match(s,/BEGIN;/);assert.match(s,/COMMIT;/);assert.match(s,/CREATE TABLE IF NOT EXISTS/);
 }
 assert.ok(!fs.existsSync(path.join(root,'public','streamatlas.db')));
});
test('09: catalog export is SHA checked, restores IDs and excludes private accounts',()=>{
 const env={...process.env,DB_PATH:db,NODE_ENV:'test'};
 execFileSync(process.execPath,[path.join(root,'scripts/export-catalog-pg.js'),dir],{cwd:root,env});
 const manifest=JSON.parse(fs.readFileSync(path.join(dir,'manifest.json'),'utf8'));
 assert.equal(manifest.tables.videos.rows,72);
 assert.equal(manifest.tables.video_categories.rows,216);
 assert.equal(fs.existsSync(path.join(dir,'users.jsonl')),false);
 assert.equal(fs.existsSync(path.join(dir,'sessions.jsonl')),false);
 execFileSync(process.execPath,[path.join(root,'scripts/build-pg-catalog-import.js'),dir,sql],{cwd:root,env});
 const content=fs.readFileSync(sql,'utf8');
 assert.match(content,/INSERT INTO "videos"/);assert.match(content,/SELECT setval/);assert.match(content,/COMMIT;/);
 assert.equal((content.match(/INSERT INTO "videos"/g)||[]).length,72);
 // No tokens / user secrets leak through the default catalog-only export.
 assert.doesNotMatch(content,/INSERT INTO "users"|INSERT INTO "sessions"|password_hash|secret_encrypted/);
});
test('09: tampered export is rejected rather than generating SQL',()=>{
 fs.appendFileSync(path.join(dir,'videos.jsonl'),'CORRUPT\n');
 assert.throws(()=>execFileSync(process.execPath,[path.join(root,'scripts/build-pg-catalog-import.js'),dir,sql],{cwd:root,env:{...process.env,NODE_ENV:'test'}}));
 fs.rmSync(tmp,{recursive:true,force:true});
});
