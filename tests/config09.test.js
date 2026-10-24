import test from 'node:test';import assert from 'node:assert/strict';import path from 'node:path';import fs from 'node:fs';import os from 'node:os';import {spawnSync} from 'node:child_process';
const root=path.resolve(import.meta.dirname,'..');
// Production bootstrap imports SQLite eagerly. Give each subprocess its own
// disposable DB so unrelated concurrent test files cannot lock data/streamatlas.db.
function isolatedStart(env){
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'sa-prod-config-'));
 try{return spawnSync(process.execPath,['src/server.js'],{cwd:root,
  env:{...env,DB_PATH:path.join(tmp,'startup.db'),PRIVATE_PATH:path.join(tmp,'private')},
  encoding:'utf8',timeout:3000});}
 finally{fs.rmSync(tmp,{recursive:true,force:true});}
}
test('09: production server refuses to start without CSRF secret and HTTPS public origin',()=>{
 const env={...process.env,NODE_ENV:'production',SA_DISABLE_WORKER:'1'};
 delete env.SA_PUBLIC_ORIGIN;delete env.SA_CSRF_SECRET;
 const result=isolatedStart(env);
 assert.notEqual(result.status,0);
 assert.match(result.stderr,/stable SA_CSRF_SECRET/);
});


test('41: production cannot accidentally serve without private preview receipt gate',()=>{
 const env={...process.env,NODE_ENV:'production',SA_DISABLE_WORKER:'1',SA_CSRF_SECRET:'a'.repeat(64),SA_PUBLIC_ORIGIN:'https://preview.example.test'};
 delete env.SA_PRIVATE_PREVIEW_REQUIRE_RECEIPT;
 const r=isolatedStart(env);
 assert.notEqual(r.status,0);assert.match(r.stderr,/SA_PRIVATE_PREVIEW_REQUIRE_RECEIPT=1/);
});

test('41: production refuses development email outbox even with preview enabled',()=>{
 const env={...process.env,NODE_ENV:'production',SA_DISABLE_WORKER:'1',SA_PRIVATE_PREVIEW_REQUIRE_RECEIPT:'1',SA_DEV_MAIL_OUTBOX:'1',SA_CSRF_SECRET:'a'.repeat(64),SA_PUBLIC_ORIGIN:'https://preview.example.test'};
 const r=isolatedStart(env);
 assert.notEqual(r.status,0);assert.match(r.stderr,/development mail outbox/);
});
