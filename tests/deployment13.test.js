import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {parseEnvFile,validateEnv} from '../deployment/aws/validate-env.mjs';
const root=new URL('../',import.meta.url);
test('AWS private demo config rejects placeholders, bad origins, missing MFA, insecure hash',()=>{
 const env=parseEnvFile(fs.readFileSync(new URL('deployment/aws/.env.runtime.example',root),'utf8'));
 assert.ok(validateEnv(env).length>=4);
});
test('AWS private demo config accepts a correctly-shaped private preview environment',()=>{
 const env={SA_DEMO_DOMAIN:'preview.my-owned-domain.test',SA_PUBLIC_ORIGIN:'https://preview.my-owned-domain.test',SA_CSRF_SECRET:'a'.repeat(96),SA_MFA_KEY:'b'.repeat(64),SA_DEMO_AUTH_HASH:'$2a$12$'+'A'.repeat(53),SA_REQUIRE_EVIDENCE_REFS:'1',SA_REQUIRE_ADMIN_MFA:'1'};
 assert.deepEqual(validateEnv(env),[]);
});
test('AWS compose keeps Node application private and worker network-disabled',()=>{
 const text=fs.readFileSync(new URL('deployment/aws/compose.yaml',root),'utf8');
 assert.match(text,/network_mode: none/);
 assert.match(text,/SA_DISABLE_WORKER: '1'/);
 assert.match(text,/appdata:\/app\/data/);
 assert.doesNotMatch(text,/3000:3000/);
 assert.match(fs.readFileSync(new URL('deployment/aws/Caddyfile',root),'utf8'),/basic_auth/);
});
test('server readiness endpoint confirms SQLite readable',async()=>{
 process.env.NODE_ENV='test';
 const {server}=await import('../src/server.js');
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{
  const address=server.address();const r=await fetch(`http://127.0.0.1:${address.port}/api/ready`);
  assert.equal(r.status,200);assert.deepEqual(await r.json(),{ready:true,version:JSON.parse(fs.readFileSync(new URL('package.json',root),'utf8')).version,databaseOk:true,storageOk:true});
 }finally{await new Promise(resolve=>server.close(resolve))}
});
