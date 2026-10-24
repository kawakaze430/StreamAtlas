import test from 'node:test';import assert from 'node:assert/strict';import path from 'node:path';import {spawnSync} from 'node:child_process';
const root=path.resolve(import.meta.dirname,'..');
test('09: production server refuses to start without CSRF secret and HTTPS public origin',()=>{
 const env={...process.env,NODE_ENV:'production',SA_DISABLE_WORKER:'1'};
 delete env.SA_PUBLIC_ORIGIN;delete env.SA_CSRF_SECRET;
 const result=spawnSync(process.execPath,['src/server.js'],{cwd:root,env,encoding:'utf8',timeout:3000});
 assert.notEqual(result.status,0);
 assert.match(result.stderr,/stable SA_CSRF_SECRET/);
});

test('41: production must not start without preview gate',()=>{
 const env={...process.env,NODE_ENV:'production',SA_DISABLE_WORKER:'1',SA_CSRF_SECRET:'a'.repeat(64),SA_PUBLIC_ORIGIN:'https://preview.example.test'};
 delete env.SA_PRIVATE_PREVIEW_REQUIRE_RECEIPT;
 const r=spawnSync(process.execPath,['src/server.js'],{cwd:root,env,encoding:'utf8',timeout:3000});
 assert.notEqual(r.status,0);assert.match(r.stderr,/SA_PRIVATE_PREVIEW_REQUIRE_RECEIPT=1/);
});
test('41: production refuses development mail outbox',()=>{
 const env={...process.env,NODE_ENV:'production',SA_DISABLE_WORKER:'1',SA_PRIVATE_PREVIEW_REQUIRE_RECEIPT:'1',SA_DEV_MAIL_OUTBOX:'1',SA_CSRF_SECRET:'a'.repeat(64),SA_PUBLIC_ORIGIN:'https://preview.example.test'};
 const r=spawnSync(process.execPath,['src/server.js'],{cwd:root,env,encoding:'utf8',timeout:3000});
 assert.notEqual(r.status,0);assert.match(r.stderr,/development mail outbox/);
});
