import test from 'node:test';import assert from 'node:assert/strict';
import {spawnSync,spawn} from 'node:child_process';
import fs from 'node:fs';import path from 'node:path';import os from 'node:os';import net from 'node:net';
const root=path.resolve(import.meta.dirname,'..');
function node(args,{env={},timeout=60000}={}){
 const r=spawnSync(process.execPath,args,{cwd:root,env:{...process.env,...env},encoding:'utf8',timeout});return r;
}
test('19: actual offline encrypted backup/restore drill verifies both SQLite and media checksums',()=>{
 const result=node(['scripts/recovery-drill.js'],{timeout:60000});assert.equal(result.status,0,result.stderr||result.stdout);
 const report=JSON.parse(result.stdout);assert.equal(report.ok,true);assert.equal(report.mediaRecovered,true);assert.equal(report.videosRecovered,72);
});
test('19: local load-smoke command forbids remote third-party targets',()=>{
 const result=node(['scripts/load-smoke.js','https://example.com', '1','1']);assert.notEqual(result.status,0);assert.match(result.stderr,/loopback/i);
});
test('19: bounded localhost load smoke serves a running real API with zero failures',async()=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'sa-load19-'));const server=net.createServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));const port=server.address().port;await new Promise(r=>server.close(r));
 const proc=spawn(process.execPath,['src/server.js'],{cwd:root,env:{...process.env,PORT:String(port),DB_PATH:path.join(tmp,'runtime.sqlite'),PRIVATE_PATH:path.join(tmp,'private'),SA_DISABLE_WORKER:'1',NODE_ENV:'development'},stdio:'ignore'});
 try{
  let started=false;for(let i=0;i<60;i++){try{const r=await fetch(`http://127.0.0.1:${port}/api/health`,{signal:AbortSignal.timeout(1000)});if(r.ok){started=true;break}}catch{}await new Promise(r=>setTimeout(r,100))}assert.equal(started,true);
  const r=node(['scripts/load-smoke.js',`http://127.0.0.1:${port}`,'48','6']);assert.equal(r.status,0,r.stderr||r.stdout);
  const report=JSON.parse(r.stdout);assert.equal(report.failed,0);assert.equal(report.requests,48);
 }finally{proc.kill();fs.rmSync(tmp,{recursive:true,force:true})}
});
