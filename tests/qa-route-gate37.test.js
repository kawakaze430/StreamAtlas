import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
const root=path.resolve(import.meta.dirname,'..');
const modules=['src/server.js','src/uploads.js','src/studio-operations.js','src/discovery.js','src/compliance-operations.js','src/roadmap32.js','src/operational-controls34.js','scripts/qa-route-diff.js','contracts/openapi.json'];
test('A06 strict contract gate succeeds on reviewed literal operations and refuses newly added undocumented route',()=>{
 const clean=spawnSync(process.execPath,['scripts/qa-route-diff.js','--strict'],{cwd:root,encoding:'utf8'});
 assert.equal(clean.status,0,clean.stderr);assert.match(clean.stdout,/without reviewed contract: 0/);
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'sa37-route-gate-'));
 try{
  for(const file of modules){const dest=path.join(tmp,file);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(path.join(root,file),dest)}
  fs.mkdirSync(path.join(tmp,'qa'),{recursive:true});
  fs.appendFileSync(path.join(tmp,'src/server.js'),"\nif(method==='GET'&&p==='/api/qa/missing-contract'){}\n");
  const failed=spawnSync(process.execPath,['scripts/qa-route-diff.js','--strict'],{cwd:tmp,encoding:'utf8'});
  assert.notEqual(failed.status,0);
  assert.match(failed.stderr,/GET \/api\/qa\/missing-contract/);
  const report=JSON.parse(fs.readFileSync(path.join(tmp,'qa/contract-gap-report.json'),'utf8'));
  assert.equal(report.staticUndocumented,1);
  assert.equal(report.undocumented[0].source,'src/server.js');
 }finally{fs.rmSync(tmp,{recursive:true,force:true})}
});
