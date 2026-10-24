/** Strict network authorization denial tests. All identities, DBs and bytes are disposable. */
import test, {before, after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import crypto from 'node:crypto';
import {spawn} from 'node:child_process';
import {DatabaseSync} from 'node:sqlite';
import {createQaFixtures} from '../scripts/qa-fixtures.js';

const root=path.resolve(import.meta.dirname,'..');
const privateMarker='PRIVATE_SYNTHETIC_OWNER_BYTES_39';
const privateTitle='Synthetic owner-only denial fixture 39';
const payload=Buffer.alloc(2048,0x61);
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let dir,db,server,base,upload,categoryId,caseId,accounts;
const actors={};

async function freePort(){
 const socket=net.createServer();await new Promise(resolve=>socket.listen(0,'127.0.0.1',resolve));
 const port=socket.address().port;await new Promise(resolve=>socket.close(resolve));return port;
}
async function csrfActor(){
 const response=await fetch(base+'/api/security/csrf');assert.equal(response.status,200);
 return {token:(await response.json()).token,csrfCookie:response.headers.get('set-cookie').split(';')[0],session:''};
}
async function request(route,{actor=actors.anonymous,method='GET',json,bytes,csrf=true,headers={}}={}){
 const mutation=!['GET','HEAD'].includes(method);
 const hs={'X-Requested-With':'StreamAtlas',Cookie:[actor?.csrfCookie,actor?.session].filter(Boolean).join('; ')};
 if(mutation){hs.Origin=base;if(csrf)hs['X-CSRF-Token']=actor.token;}
 if(json!==undefined)hs['Content-Type']='application/json';
 if(bytes){hs['Content-Type']='application/octet-stream';hs['X-Upload-Offset']='0';}
 Object.assign(hs,headers);
 const response=await fetch(base+route,{method,headers:hs,body:json!==undefined?JSON.stringify(json):bytes});
 const text=await response.text();
 let body;try{body=JSON.parse(text)}catch{body=null}
 return {status:response.status,body,text,headers:response.headers};
}
async function login(account){
 const actor=await csrfActor();
 const response=await request('/api/auth/login',{actor,method:'POST',json:{email:account.email,password:account.password}});
 assert.equal(response.status,200,'Synthetic fixture login must work');
 return {...actor,session:response.headers.get('set-cookie').split(';')[0],id:account.id};
}
async function register(name){
 const actor=await csrfActor();
 const response=await request('/api/auth/register',{actor,method:'POST',json:{name:'Synthetic '+name,email:name+'-39@example.invalid',password:'Ephemeral-test-password-39'}});
 assert.equal(response.status,201,'Synthetic registration must work');
 return {...actor,session:response.headers.get('set-cookie').split(';')[0],id:response.body.user.id};
}
function digest(file){return fs.existsSync(file)?crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'):null;}
function snapshot(){
 const all=sql=>db.prepare(sql).all();
 return JSON.stringify({
  upload:db.prepare('SELECT * FROM upload_sessions WHERE id=?').get(upload.id),
  video:db.prepare('SELECT * FROM videos WHERE id=?').get(upload.videoId),
  evidence:all('SELECT * FROM review_evidence ORDER BY upload_id,kind'),
  audit:all('SELECT * FROM moderation_audit ORDER BY id'),
  events:all('SELECT * FROM processing_events ORDER BY id'),
  appeals:all('SELECT * FROM compliance_appeals ORDER BY id'),
  cases:all('SELECT * FROM compliance_cases ORDER BY id'),
  caseEvents:all('SELECT * FROM compliance_case_events ORDER BY id'),
  categories:all('SELECT * FROM video_categories ORDER BY video_id,category_id'),
  chapters:all('SELECT * FROM video_chapters ORDER BY video_id,start_seconds'),
  captions:all('SELECT * FROM video_captions ORDER BY video_id'),
  holds:all('SELECT * FROM content_holds ORDER BY id'),
  notifications:all('SELECT * FROM notifications ORDER BY id'),
  deadLetters:all('SELECT * FROM processing_dead_letters ORDER BY upload_id'),
  part:digest(path.join(dir,'private','uploads',upload.id+'.part')),
  preview:digest(path.join(dir,'private','processed',upload.id,'preview_0.jpg')),
 });
}
function noPrivateLeak(response,label){
 for(const value of [privateMarker,privateTitle,accounts.creator.email,'Synthetic confidential reviewer details','SYNTHETIC-LICENSE-39'])assert.equal(response.text.includes(value),false,label+' leaked owner or reviewer data');
}
async function denied(route,options,status,label){
 const before=snapshot();const response=await request(route,options);
 assert.equal(response.status,status,label+' status');noPrivateLeak(response,label);
 assert.equal(snapshot(),before,label+' mutated protected database or source bytes');
 return response;
}
const nonOwners=['anonymous','viewer','demo','unapproved','otherCreator','admin'];
const unauthorizedStatus=name=>name==='anonymous'?401:404;
const adminDenied=['anonymous','viewer','demo','unapproved','owner','otherCreator'];

before(async()=>{
 dir=fs.mkdtempSync(path.join(os.tmpdir(),'sa-negative-auth39-'));
 const names=['NODE_ENV','SA_QA_FIXTURES','DB_PATH','PRIVATE_PATH','SA_DISABLE_WORKER'];
 const prior=Object.fromEntries(names.map(name=>[name,process.env[name]]));
 let fixture;
 try{
  process.env.NODE_ENV='test';process.env.SA_QA_FIXTURES='YES';
  fixture=await createQaFixtures({dir});
 }finally{
  for(const [name,value] of Object.entries(prior)){if(value===undefined)delete process.env[name];else process.env[name]=value;}
 }
 accounts=fixture.accounts;
 const port=await freePort();base=`http://127.0.0.1:${port}`;
 const env={...process.env,NODE_ENV:'development',SA_ENFORCE_CSRF:'1',SA_DISABLE_WORKER:'1',SA_REQUIRE_EVIDENCE_REFS:'1',DB_PATH:fixture.dbPath,PRIVATE_PATH:path.join(dir,'private'),PORT:String(port)};
 server=spawn(process.execPath,['src/server.js'],{cwd:root,env,stdio:'ignore'});
 let ready=false;
 for(let i=0;i<100;i++){
  try{if((await fetch(base+'/api/health')).ok){ready=true;break}}catch{}
  if(server.exitCode!==null)break;
  await sleep(50);
 }
 assert.ok(ready,'Disposable strict-CSRF server did not become ready');
 db=new DatabaseSync(fixture.dbPath);db.exec('PRAGMA busy_timeout=5000');
 actors.anonymous=await csrfActor();
 actors.viewer=await login(accounts.viewer);actors.owner=await login(accounts.creator);actors.admin=await login(accounts.admin);
 actors.unapproved=await register('unapproved');actors.otherCreator=await register('other-creator');
 const demoActor=await csrfActor();const demo=await request('/api/auth/demo',{actor:demoActor,method:'POST',json:{}});
 assert.equal(demo.status,201);actors.demo={...demoActor,session:demo.headers.get('set-cookie').split(';')[0],id:demo.body.user.id};
 db.prepare("INSERT INTO creator_profiles(user_id,channel_id,display_name,status,applied_at) VALUES(?,2,'Other synthetic creator','APPROVED',?)").run(actors.otherCreator.id,new Date().toISOString());
 const application=await request('/api/studio/apply',{actor:actors.unapproved,method:'POST',json:{displayName:'Pending synthetic creator',agreePolicies:true}});
 assert.equal(application.status,201);
 categoryId=(await (await fetch(base+'/api/categories')).json())[0].id;
 const created=await request('/api/studio/uploads/initiate',{actor:actors.owner,method:'POST',json:{title:privateTitle,filename:'synthetic.mp4',size:payload.length,mime:'video/mp4',categoryId,rightsDeclaration:true,adultsDeclaration:true,consentDeclaration:true}});
 assert.equal(created.status,201);upload=created.body;
 // Fixtures exercise authorization/stream boundaries only; these bytes are not claimed to be processed media.
 const output=path.join(dir,'private','processed',upload.id);fs.mkdirSync(output,{recursive:true});
 for(const name of ['preview_0.jpg','playback.mp4'])fs.writeFileSync(path.join(output,name),privateMarker);
 caseId=Number(db.prepare("INSERT INTO compliance_cases(video_id,reporter_id,category,details,status,created_at,updated_at) VALUES(?,?,'COPYRIGHT','Synthetic confidential reviewer details','RESOLVED',?,?)").run(upload.videoId,actors.viewer.id,new Date().toISOString(),new Date().toISOString()).lastInsertRowid);
});
after(async()=>{
 if(server&&server.exitCode===null){
  const closed=new Promise(resolve=>server.once('close',resolve));server.kill('SIGTERM');
  const timer=setTimeout(()=>server.kill('SIGKILL'),2000);await closed;clearTimeout(timer);
 }
 db?.close();if(dir)fs.rmSync(dir,{recursive:true,force:true});
});

test('39: upload initiation rejects anonymous, demo, viewer and unapproved creators without creating rows',async()=>{
 const before=snapshot(),count=db.prepare('SELECT count(*) AS n FROM upload_sessions').get().n;
 for(const name of ['anonymous','viewer','demo','unapproved']){
  const response=await request('/api/studio/uploads/initiate',{actor:actors[name],method:'POST',json:{title:'Another synthetic private upload',filename:'synthetic.mp4',size:2048,mime:'video/mp4',categoryId,rightsDeclaration:true,adultsDeclaration:true,consentDeclaration:true}});
  assert.equal(response.status,name==='anonymous'?401:403,name+' initiate');
  noPrivateLeak(response,name+' initiate');
  assert.equal(db.prepare('SELECT count(*) AS n FROM upload_sessions').get().n,count);
  assert.equal(snapshot(),before,name+' initiation mutated existing protected rows');
 }
});

test('39: dynamic owner-only reads hide upload data from every non-owner including an administrator',async()=>{
 const routes=['','/metadata','/events','/notes','/readiness'];
 for(const suffix of routes){
  const owner=await request(`/api/studio/uploads/${upload.id}${suffix}`,{actor:actors.owner});
  assert.equal(owner.status,200,'owner '+suffix+' positive control');
  for(const name of nonOwners)await denied(`/api/studio/uploads/${upload.id}${suffix}`,{actor:actors[name]},unauthorizedStatus(name),name+' read '+suffix);
 }
});

test('39: cross-owner chunk/finalize/metadata/retry/delete requests cannot change state, files or queue events',async()=>{
 const operations=[
  ['PUT','/chunk',{bytes:payload}],
  ['POST','/finalize',{json:{}}],
  ['PATCH','/metadata',{json:{title:'Unauthorized replacement title',description:'Denied edit',categoryId,chapters:[]}}],
  ['POST','/retry',{json:{}}],
  ['DELETE','',{json:{}}],
 ];
 for(const [method,suffix,body] of operations){
  for(const name of nonOwners)await denied(`/api/studio/uploads/${upload.id}${suffix}`,{actor:actors[name],method,...body},unauthorizedStatus(name),name+' '+method+' '+suffix);
 }
});

test('39: strict CSRF, signed-token matching and same-origin protections run before owner mutations',async()=>{
 const route=`/api/studio/uploads/${upload.id}/chunk`;
 const attacks=[
  {csrf:false},
  {headers:{'X-CSRF-Token':actors.viewer.token}},
  {headers:{'X-CSRF-Token':'A'.repeat(32)+'.'+'B'.repeat(43),Cookie:actors.owner.session+'; sa_csrf='+'A'.repeat(32)+'.'+'B'.repeat(43)}},
  {headers:{Origin:'https://cross-site.example.invalid'}},
  {headers:{'Sec-Fetch-Site':'cross-site'}},
 ];
 for(const [index,attack] of attacks.entries())await denied(route,{actor:actors.owner,method:'PUT',bytes:payload,...attack},403,'owner CSRF/origin attack '+index);
 const accepted=await request(route,{actor:actors.owner,method:'PUT',bytes:payload});
 assert.equal(accepted.status,200,'valid signed CSRF and matching origin positive control');
 assert.equal(accepted.body.receivedBytes,payload.length);assert.equal(accepted.body.complete,true);
 assert.equal(digest(path.join(dir,'private','uploads',upload.id+'.part')),crypto.createHash('sha256').update(payload).digest('hex'));
});

test('39: unpublished media stays unavailable while creator/admin private previews enforce their distinct roles',async()=>{
 db.prepare("UPDATE upload_sessions SET status='IN_REVIEW',processed_duration=1 WHERE id=?").run(upload.id);
 db.prepare("UPDATE videos SET status='PENDING_REVIEW' WHERE id=?").run(upload.videoId);
 for(const name of Object.keys(actors)){
  for(const method of ['GET','HEAD']){
   const response=await request(`/api/media/${upload.id}/playback.mp4`,{actor:actors[name],method,headers:{Range:'bytes=0-10'}});
   assert.equal(response.status,404,name+' public '+method);noPrivateLeak(response,name+' unpublished public media');
  }
 }
 for(const name of nonOwners)await denied(`/api/studio/uploads/${upload.id}/preview/preview_0.jpg`,{actor:actors[name]},unauthorizedStatus(name),name+' creator preview');
 const ownPreview=await request(`/api/studio/uploads/${upload.id}/preview/preview_0.jpg`,{actor:actors.owner});
 assert.equal(ownPreview.status,200);assert.equal(ownPreview.text,privateMarker);
 for(const name of adminDenied)await denied(`/api/admin/uploads/${upload.id}/preview/playback.mp4`,{actor:actors[name]},name==='anonymous'?401:403,name+' admin preview');
 const adminPreview=await request(`/api/admin/uploads/${upload.id}/preview/playback.mp4`,{actor:actors.admin,headers:{Range:'bytes=0-10'}});
 assert.equal(adminPreview.status,206);assert.equal(adminPreview.text,privateMarker.slice(0,11));
});

test('39: dynamic administrative review/evidence/compliance routes deny non-admin roles without side effects',async()=>{
 const routes=[
  ['GET',`/api/admin/uploads/${upload.id}/evidence`,{}],
  ['PATCH',`/api/admin/uploads/${upload.id}/evidence`,{json:{licenseRef:'SYNTHETIC-LICENSE',adulthoodRef:'SYNTHETIC-AGE',consentRef:'SYNTHETIC-CONSENT'}}],
  ['PATCH',`/api/admin/uploads/${upload.id}/decision`,{json:{decision:'APPROVE',note:'Denied synthetic review attempt',rightsReviewed:true,adultsReviewed:true,consentReviewed:true}}],
  ['GET',`/api/admin/compliance/cases/${caseId}`,{}],
  ['PATCH',`/api/admin/compliance/cases/${caseId}/decision`,{json:{status:'CLOSED',note:'Denied synthetic compliance decision'}}],
 ];
 for(const [method,route,body] of routes)for(const name of adminDenied)await denied(route,{actor:actors[name],method,...body},name==='anonymous'?401:403,name+' '+method+' '+route);
 assert.equal((await request(`/api/admin/uploads/${upload.id}/evidence`,{actor:actors.admin})).status,200);
 assert.equal((await request(`/api/admin/compliance/cases/${caseId}`,{actor:actors.admin})).status,200);
});

test('39: valid administrator role cannot bypass CSRF, missing evidence, or an active safety hold to publish',async()=>{
 const route=`/api/admin/uploads/${upload.id}/decision`;
 const decision={decision:'APPROVE',note:'Synthetic reviewer approvals only',rightsReviewed:true,adultsReviewed:true,consentReviewed:true};
 await denied(route,{actor:actors.admin,method:'PATCH',json:decision,csrf:false},403,'admin missing CSRF');
 await denied(route,{actor:actors.admin,method:'PATCH',json:decision,headers:{Origin:'https://cross-site.example.invalid'}},403,'admin cross-origin review');
 await denied(route,{actor:actors.admin,method:'PATCH',json:decision},409,'admin missing evidence references');
 const added=await request(`/api/admin/uploads/${upload.id}/evidence`,{actor:actors.admin,method:'PATCH',json:{licenseRef:'SYNTHETIC-LICENSE-39',adulthoodRef:'SYNTHETIC-AGE-39',consentRef:'SYNTHETIC-CONSENT-39'}});
 assert.equal(added.status,200);assert.equal(added.body.items.length,3);
 db.prepare("INSERT INTO content_holds(video_id,reason,details,opened_by,opened_at) VALUES(?,'CONSENT','Synthetic protective fixture',?,?)").run(upload.videoId,actors.admin.id,new Date().toISOString());
 await denied(route,{actor:actors.admin,method:'PATCH',json:decision},409,'admin held upload approval');
 assert.equal(db.prepare('SELECT status FROM upload_sessions WHERE id=?').get(upload.id).status,'IN_REVIEW');
 assert.equal(db.prepare('SELECT status FROM videos WHERE id=?').get(upload.videoId).status,'PENDING_REVIEW');
});

test('39: only the recorded uploader may appeal, and a valid appeal never republishes held content',async()=>{
 const route=`/api/compliance/cases/${caseId}/appeal`;
 const details={details:'Synthetic uploader requests a second human review of this case.'};
 for(const name of ['anonymous','viewer','demo','unapproved','otherCreator','admin'])await denied(route,{actor:actors[name],method:'POST',json:details},name==='anonymous'?401:403,name+' appeal');
 await denied(route,{actor:actors.owner,method:'POST',json:details,csrf:false},403,'owner appeal missing CSRF');
 const created=await request(route,{actor:actors.owner,method:'POST',json:details});
 assert.equal(created.status,201);assert.equal(created.body.status,'PENDING');
 assert.equal(db.prepare('SELECT count(*) AS n FROM compliance_appeals WHERE case_id=?').get(caseId).n,1);
 assert.equal(db.prepare('SELECT status FROM videos WHERE id=?').get(upload.videoId).status,'PENDING_REVIEW');
 assert.equal((await request(`/api/media/${upload.id}/playback.mp4`,{actor:actors.owner})).status,404);
});
