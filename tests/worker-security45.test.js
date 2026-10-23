import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {DatabaseSync} from 'node:sqlite';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const delay=ms=>new Promise(r=>setTimeout(r,ms));
const fixture=fs.readFileSync(path.join(root,'public/assets/videos/sample-1.mp4'));

async function freePort(){const s=net.createServer();await new Promise(r=>s.listen(0,'127.0.0.1',r));const p=s.address().port;await new Promise(r=>s.close(r));return p}
async function poll(fn,limitMs=12000){const end=Date.now()+limitMs;while(Date.now()<end){try{const value=await fn();if(value)return value}catch{}await delay(100)}throw Error('Timed out waiting for local child process')}
test('strict CSRF, origin checks, durable worker recovery and publication gates', {timeout:40000},async()=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'sa-worker45-'));let server,worker;
 const port=await freePort();const base=`http://127.0.0.1:${port}`;
 const env={...process.env,DB_PATH:path.join(tmp,'data.db'),PRIVATE_PATH:path.join(tmp,'private'),NODE_ENV:'development',SA_ENFORCE_CSRF:'1',PORT:String(port),SA_DISABLE_WORKER:'1',SA_REQUIRE_EVIDENCE_REFS:'1'};
 try{
  server=spawn(process.execPath,['src/server.js'],{cwd:root,env,stdio:'ignore'});
  await poll(async()=>{const r=await fetch(base+'/api/health');return r.ok});
  const csrfResponse=await fetch(base+'/api/security/csrf');assert.equal(csrfResponse.status,200);
  const csrf=(await csrfResponse.json()).token,csrfCookie=csrfResponse.headers.get('set-cookie').split(';')[0];
  const json=async(p,data,method='POST',session='',withCsrf=true,extra={})=>{
   const headers={'X-Requested-With':'StreamAtlas','Content-Type':'application/json',Cookie:[csrfCookie,session].filter(Boolean).join('; '),...(withCsrf?{'X-CSRF-Token':csrf}:{}),...extra};
   const r=await fetch(base+p,{method,headers,body:JSON.stringify(data)});return {code:r.status,headers:r.headers,data:await r.json()};
  };
  const registerBody={name:'Real Server Test',email:'strict45@example.test',password:'strong-password-1234'};
  assert.equal((await json('/api/auth/register',registerBody,'POST','',false)).code,403);
  assert.equal((await json('/api/auth/register',registerBody,'POST','',true,{Origin:'http://evil.invalid'})).code,403);
  const register=await json('/api/auth/register',registerBody);assert.equal(register.code,201);
  const creatorCookie=register.headers.get('set-cookie').split(';')[0];
  const adminReg=await json('/api/auth/register',{name:'Admin Test',email:'admin45@example.test',password:'strong-password-1234'});assert.equal(adminReg.code,201);
  const adminCookie=adminReg.headers.get('set-cookie').split(';')[0];
  const db=new DatabaseSync(env.DB_PATH);db.prepare("UPDATE users SET role='ADMIN' WHERE email='admin45@example.test'").run();
  assert.equal((await json('/api/studio/apply',{displayName:'Worker Demo Channel',agreePolicies:true},'POST',creatorCookie)).code,201);
  const creatorId=db.prepare("SELECT id FROM users WHERE email='strict45@example.test'").get().id;
  assert.equal((await json(`/api/admin/creators/${creatorId}/decision`,{decision:'APPROVED',note:'Approved for synthetic test media'},'PATCH',adminCookie)).code,200);
  const cats=await (await fetch(base+'/api/categories')).json();
  const init=await json('/api/studio/uploads/initiate',{title:'Independent worker test clip',categoryId:cats[0].id,filename:'original.mp4',mime:'video/mp4',size:fixture.length,rightsDeclaration:true,adultsDeclaration:true,consentDeclaration:true},'POST',creatorCookie);
  assert.equal(init.code,201);const id=init.data.id;
  const chunk=await fetch(`${base}/api/studio/uploads/${id}/chunk`,{method:'PUT',headers:{'X-Requested-With':'StreamAtlas','X-CSRF-Token':csrf,'Content-Type':'application/octet-stream','X-Upload-Offset':'0',Cookie:csrfCookie+'; '+creatorCookie},body:fixture});assert.equal(chunk.status,200);
  assert.equal((await json(`/api/studio/uploads/${id}/finalize`,{},'POST',creatorCookie)).code,202);
  // Emulate a server/worker crash after a job claim: the persistent queue recovers PROCESSING on startup.
  db.prepare("UPDATE upload_sessions SET status='PROCESSING' WHERE id=?").run(id);
  worker=spawn(process.execPath,['src/media-worker.js'],{cwd:root,env,stdio:'ignore'});
  const completed=await poll(async()=>db.prepare('SELECT status FROM upload_sessions WHERE id=?').get(id)?.status==='IN_REVIEW',18000);
  assert.equal(completed,true);
  assert.equal((await json(`/api/admin/uploads/${id}/decision`,{decision:'APPROVE',note:'Synthetic sample clip manually checked',rightsReviewed:true,adultsReviewed:true,consentReviewed:true},'PATCH',adminCookie)).code,409);
  assert.equal((await json(`/api/admin/uploads/${id}/evidence`,{licenseRef:'DEMO-LICENSE-REF',adulthoodRef:'DEMO-AGE-REF',consentRef:'DEMO-CONSENT-REF'},'PATCH',adminCookie)).code,200);
  assert.equal((await json(`/api/admin/uploads/${id}/decision`,{decision:'APPROVE',note:'Synthetic sample clip manually checked',rightsReviewed:true,adultsReviewed:true,consentReviewed:true},'PATCH',adminCookie)).code,200);
  assert.equal((await fetch(base+`/api/media/${id}/master.m3u8`)).status,200);
  const rows=db.prepare('SELECT state FROM processing_events WHERE upload_id=?').all(id).map(x=>x.state);
  assert.ok(rows.includes('PROCESSING'));assert.ok(rows.includes('IN_REVIEW'));
  db.close();
 }finally{
  worker?.kill('SIGTERM');server?.kill('SIGTERM');
  await delay(300);fs.rmSync(tmp,{recursive:true,force:true});
 }
});
