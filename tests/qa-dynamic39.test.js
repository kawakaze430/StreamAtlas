import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
const root=path.resolve(import.meta.dirname,'..');
const files=['src/server.js','src/uploads.js','src/studio-operations.js','src/discovery.js','src/compliance-operations.js','src/roadmap32.js','src/operational-controls34.js','scripts/qa-dynamic-routes.js','qa/dynamic-route-reviewed-baseline.json'];
test('A06 checkpoint 39: dynamic API matcher inventory is stable and fails on unseen route patterns',()=>{
 const clean=spawnSync(process.execPath,['scripts/qa-dynamic-routes.js','--strict'],{cwd:root,encoding:'utf8'});
 assert.equal(clean.status,0,clean.stderr);
 const report=JSON.parse(fs.readFileSync(path.join(root,'qa/dynamic-route-report.json'),'utf8'));
 assert.ok(report.totalCandidates>=50,'Expect inventory to include existing regex routes');
 assert.equal(report.newOrModifiedMatchers.length,0);
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'sa39-dynamic-gate-'));
 try{
  for(const file of files){const out=path.join(tmp,file);fs.mkdirSync(path.dirname(out),{recursive:true});fs.copyFileSync(path.join(root,file),out)}
  fs.appendFileSync(path.join(tmp,'src/server.js'),"\nconst extraRoute=p.match(/^\\/api\\/admin\\/new-unreviewed\\/(\\d+)$/);\n");
  const failure=spawnSync(process.execPath,['scripts/qa-dynamic-routes.js','--strict'],{cwd:tmp,encoding:'utf8'});
  assert.notEqual(failure.status,0);
  assert.match(failure.stderr,/new-unreviewed/);
  const differences=JSON.parse(fs.readFileSync(path.join(tmp,'qa/dynamic-route-report.json'),'utf8'));
  assert.equal(differences.newOrModifiedMatchers.length,1);
  assert.equal(differences.newOrModifiedMatchers[0].file,'src/server.js');
 }finally{fs.rmSync(tmp,{recursive:true,force:true})}
});
