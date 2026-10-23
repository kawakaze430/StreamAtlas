import test from 'node:test';import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {spawnSync} from 'node:child_process';
const root=path.resolve(import.meta.dirname,'..');
test('A08 release attestation detects tampered source and rejects incomplete rollback archive',()=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'streamatlas-release-tamper-'));
 try{
  const inventory=JSON.parse(fs.readFileSync(path.join(root,'qa/inventory.json'),'utf8'));
  for(const file of inventory.sourceFiles){const target=path.join(tmp,file.path);fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(path.join(root,file.path),target)}
  for(const p of ['qa/inventory.json','qa/release-manifest.json','contracts/openapi.json']){const target=path.join(tmp,p);fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(path.join(root,p),target)}
  const result=()=>spawnSync(process.execPath,['scripts/qa-release-verify.js'],{cwd:tmp,encoding:'utf8'});
  assert.equal(result().status,0,'clean fixture integrity');
  fs.appendFileSync(path.join(tmp,'public/app.js'),'\n// simulated post-release code tamper\n');
  const altered=result();assert.notEqual(altered.status,0);assert.match(altered.stderr,/Source integrity mismatch/);
  fs.copyFileSync(path.join(root,'public/app.js'),path.join(tmp,'public/app.js'));
  fs.rmSync(path.join(tmp,'src/server.js'));
  assert.notEqual(result().status,0,'missing file must fail verification');
 }finally{fs.rmSync(tmp,{recursive:true,force:true})}
});
