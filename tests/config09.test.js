import test from 'node:test';import assert from 'node:assert/strict';import path from 'node:path';import {spawnSync} from 'node:child_process';
const root=path.resolve(import.meta.dirname,'..');
test('09: production server refuses to start without CSRF secret and HTTPS public origin',()=>{
 const env={...process.env,NODE_ENV:'production',SA_DISABLE_WORKER:'1'};
 delete env.SA_PUBLIC_ORIGIN;delete env.SA_CSRF_SECRET;
 const result=spawnSync(process.execPath,['src/server.js'],{cwd:root,env,encoding:'utf8',timeout:3000});
 assert.notEqual(result.status,0);
 assert.match(result.stderr,/stable SA_CSRF_SECRET/);
});
