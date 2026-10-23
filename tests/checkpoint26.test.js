import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import crypto from 'node:crypto';
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'sa-cp26-'));
process.env.DB_PATH=path.join(tmp,'test.sqlite');process.env.PRIVATE_PATH=path.join(tmp,'private');process.env.NODE_ENV='test';
const {server}=await import('../src/server.js');
const {one,all,run,now}=await import('../src/database.js');
const {queueVideoRevocation}=await import('../src/media-revocation.js');
const {scanUploadedFile}=await import('../src/media-safety.js');
let base,owner,editor,analyst,outsider,admin,admin2,ownerId,editorId,analystId,admin2Id,uploadId,videoId,cat;
async function http(p,{method='GET',cookie,data,raw}={}){
 const headers={'x-requested-with':'StreamAtlas'};if(cookie)headers.cookie=cookie;
 if(data!==undefined)headers['content-type']='application/json';if(raw){headers['content-type']='application/octet-stream';headers['x-upload-offset']=String(raw.offset);headers['content-length']=String(raw.bytes.length)}
 const response=await fetch(base+p,{method,headers,body:raw?raw.bytes:data===undefined?undefined:JSON.stringify(data)});
 return {status:response.status,payload:await response.json().catch(()=>null),cookie:response.headers.get('set-cookie')?.split(';')[0]};
}
const post=(p,data,cookie)=>http(p,{method:'POST',data,cookie});const patch=(p,data,cookie)=>http(p,{method:'PATCH',data,cookie});const del=(p,cookie)=>http(p,{method:'DELETE',cookie});
async function create(name){const r=await post('/api/auth/register',{name,email:`${name.toLowerCase()}26@example.test`,password:'correct horse battery stable 26'});assert.equal(r.status,201);return r.cookie}
async function initiate(title='Synthetic Checkpoint Twenty Six'){return post('/api/studio/uploads/initiate',{title,size:2048,filename:'synthetic.mp4',mime:'video/mp4',categoryId:cat,rightsDeclaration:true,adultsDeclaration:true,consentDeclaration:true},owner)}
before(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));base='http://127.0.0.1:'+server.address().port;
 owner=await create('Owner');editor=await create('Editor');analyst=await create('Analyst');outsider=await create('Outsider');admin=await create('Admin');admin2=await create('AdminTwo');
 ownerId=one("SELECT id FROM users WHERE email='owner26@example.test'").id;editorId=one("SELECT id FROM users WHERE email='editor26@example.test'").id;analystId=one("SELECT id FROM users WHERE email='analyst26@example.test'").id;admin2Id=one("SELECT id FROM users WHERE email='admintwo26@example.test'").id;
 run("UPDATE users SET role='ADMIN' WHERE email LIKE 'admin%26@example.test'");cat=one('SELECT id FROM categories LIMIT 1').id;
 assert.equal((await post('/api/studio/apply',{displayName:'Original synthetic creator',agreePolicies:true},owner)).status,201);
 assert.equal((await patch(`/api/admin/creators/${ownerId}/decision`,{decision:'APPROVED',note:'Local synthetic fixture only'},admin)).status,200);
 const r=await initiate();assert.equal(r.status,201);uploadId=r.payload.id;videoId=r.payload.videoId;
});
after(async()=>{delete process.env.SA_REQUIRE_DUAL_REVIEW;await new Promise(r=>server.close(r));fs.rmSync(tmp,{recursive:true,force:true})});
test('E06 batch metadata validates all records and rolls back atomically',async()=>{
 const other=await initiate('Another Synthetic Fixture Upload');assert.equal(other.status,201);
 const b={items:[{id:uploadId,title:'Updated Original Synthetic Video',description:'A safe test',categoryId:cat},{id:other.payload.id,title:'short',description:'A safe test',categoryId:cat}]};
 assert.equal((await patch('/api/studio/uploads/batch-metadata',b,owner)).status,400);
 assert.equal(one('SELECT title FROM videos WHERE id=?',videoId).title,'Synthetic Checkpoint Twenty Six');
 b.items[1].title='Second Valid Synthetic Video';assert.equal((await patch('/api/studio/uploads/batch-metadata',b,owner)).payload.updated,2);
 assert.equal(one('SELECT title FROM videos WHERE id=?',videoId).title,'Updated Original Synthetic Video');
 assert.equal((await patch('/api/studio/uploads/batch-metadata',b,outsider)).status,404);
 assert.equal((await patch('/api/studio/uploads/batch-metadata',{items:Array(11).fill(b.items[0])},owner)).status,400);
});
test('E09 collaboration requires invitation acceptance; analyst is read-only',async()=>{
 assert.equal((await post('/api/studio/collaborators',{email:'analyst26@example.test',role:'ANALYST'},outsider)).status,403);
 assert.equal((await post('/api/studio/collaborators',{email:'analyst26@example.test',role:'ANALYST'},owner)).status,201);
 assert.equal((await http(`/api/studio/collaboration/${ownerId}/insights`,{cookie:analyst})).status,403);
 assert.equal((await post('/api/studio/collaborators/accept',{ownerId},analyst)).status,200);
 assert.equal((await http(`/api/studio/collaboration/${ownerId}/insights`,{cookie:analyst})).status,200);
 assert.equal((await patch('/api/studio/uploads/batch-metadata',{items:[{id:uploadId,title:'Analyst must not edit upload',description:'Denied',categoryId:cat}]},analyst)).status,404);
 assert.equal((await http(`/api/studio/collaboration/${ownerId}/insights`,{cookie:outsider})).status,403);
});
test('E09 editor can edit scoped uploads; revoked editor immediately loses access',async()=>{
 assert.equal((await post('/api/studio/collaborators',{email:'editor26@example.test',role:'EDITOR'},owner)).status,201);
 assert.equal((await post('/api/studio/collaborators/accept',{ownerId},editor)).status,200);
 const data={items:[{id:uploadId,title:'Scoped Editor Updated Title',description:'Editor metadata',categoryId:cat}]};
 assert.equal((await patch('/api/studio/uploads/batch-metadata',data,editor)).status,200);
 assert.equal((await del(`/api/studio/collaborators/${editorId}`,owner)).status,200);
 assert.equal((await patch('/api/studio/uploads/batch-metadata',data,editor)).status,404);
 assert.equal((await post('/api/studio/collaborators/accept',{ownerId},editor)).status,404);
});
test('E06 planned release never auto-publishes and cannot be changed by outsiders',async()=>{
 const when=new Date(Date.now()+3600000).toISOString();const r=await patch(`/api/studio/uploads/${uploadId}/schedule`,{plannedReleaseAt:when},owner);
 assert.equal(r.status,200);assert.equal(r.payload.autoPublish,false);
 assert.equal((await patch(`/api/studio/uploads/${uploadId}/schedule`,{plannedReleaseAt:when},outsider)).status,404);
 assert.equal((await patch(`/api/studio/uploads/${uploadId}/schedule`,{plannedReleaseAt:'2020-01-01T00:00:00Z'},owner)).status,400);
 assert.equal(one('SELECT status FROM upload_sessions WHERE id=?',uploadId).status,'UPLOADING');
 assert.equal((await patch(`/api/studio/uploads/${uploadId}/schedule`,{plannedReleaseAt:null},owner)).status,200);
});
test('E07 poster selection is limited to processed owner media and real private frames',async()=>{
 assert.equal((await patch(`/api/studio/uploads/${uploadId}/poster`,{frame:1},owner)).status,409);
 run("UPDATE upload_sessions SET status='IN_REVIEW' WHERE id=?",uploadId);
 const dir=path.join(tmp,'private','processed',uploadId);fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,'preview_1.jpg'),'synthetic placeholder');
 assert.equal((await patch(`/api/studio/uploads/${uploadId}/poster`,{frame:2},owner)).status,409);
 assert.equal((await patch(`/api/studio/uploads/${uploadId}/poster`,{frame:1},outsider)).status,404);
 assert.equal((await patch(`/api/studio/uploads/${uploadId}/poster`,{frame:1},owner)).status,200);
 assert.equal(one('SELECT poster FROM videos WHERE id=?',videoId).poster,`/api/media/${uploadId}/preview_1.jpg`);
});
test('E04 approval fails closed for active safety holds and future release schedules',async()=>{
 const holdId=Number(run('INSERT INTO content_holds(video_id,reason,details,opened_by,opened_at) VALUES(?,?,?,?,?)',videoId,'CONSENT','Pending synthetic consent investigation',ownerId,now()).lastInsertRowid);
 const approval={decision:'APPROVE',note:'This is only a synthetic fixture review',rightsReviewed:true,adultsReviewed:true,consentReviewed:true};
 assert.equal((await patch(`/api/admin/uploads/${uploadId}/decision`,approval,admin)).status,409);
 run('UPDATE content_holds SET closed_at=?,closed_by=?,closure_note=? WHERE id=?',now(),ownerId,'Test-only closure',holdId);
 run('UPDATE upload_sessions SET planned_release_at=? WHERE id=?',new Date(Date.now()+3600000).toISOString(),uploadId);
 assert.equal((await patch(`/api/admin/uploads/${uploadId}/decision`,approval,admin)).status,409);
 run('UPDATE upload_sessions SET planned_release_at=NULL WHERE id=?',uploadId);
 assert.equal(one('SELECT status FROM videos WHERE id=?',videoId).status,'DRAFT');
});
test('E01 finalize compares client SHA-256 without queueing mismatched bytes',async()=>{
 const r=await initiate('Digest Mismatch Synthetic Fixture');assert.equal(r.status,201);const id=r.payload.id;
 const bytes=Buffer.alloc(2048,0x61);const chunk=await http(`/api/studio/uploads/${id}/chunk`,{method:'PUT',cookie:owner,raw:{bytes,offset:0}});assert.equal(chunk.status,200);
 const mismatch=await post(`/api/studio/uploads/${id}/finalize`,{expectedSha256:'0'.repeat(64)},owner);assert.equal(mismatch.status,409);
 assert.equal(one('SELECT status FROM upload_sessions WHERE id=?',id).status,'UPLOADING');
 assert.equal((await post(`/api/studio/uploads/${id}/finalize`,{expectedSha256:'bad'},owner)).status,400);
 const ok=await post(`/api/studio/uploads/${id}/finalize`,{expectedSha256:crypto.createHash('sha256').update(bytes).digest('hex')},owner);assert.equal(ok.status,202);
 for(let i=0;i<100;i++){if(one('SELECT status FROM upload_sessions WHERE id=?',id).status==='FAILED')break;await new Promise(r=>setTimeout(r,40))}
 assert.equal(one('SELECT status FROM upload_sessions WHERE id=?',id).status,'FAILED');
 assert.equal((await post(`/api/studio/uploads/${id}/retry`,{},owner)).status,202);
 for(let i=0;i<100;i++){if(one('SELECT status FROM upload_sessions WHERE id=?',id).status==='FAILED')break;await new Promise(r=>setTimeout(r,40))}
 assert.equal(one('SELECT attempt_count FROM processing_dead_letters WHERE upload_id=?',id)?.attempt_count,2);
 assert.equal((await http('/api/admin/processing/dead-letters',{cookie:outsider})).status,403);
 assert.ok((await http('/api/admin/processing/dead-letters',{cookie:admin})).payload.items.some(x=>x.uploadId===id));
});
test('E02 production-mode scanner cannot be disabled via required=false',async()=>{
 const file=path.join(tmp,'scanner-sample.bin');fs.writeFileSync(file,'synthetic');const old=process.env.NODE_ENV;
 try{process.env.NODE_ENV='production';await assert.rejects(scanUploadedFile(file,{required:false,scanner:'/no/such/clamav'}),/scanning unavailable/)}finally{process.env.NODE_ENV=old}
});
test('E05 repeated revocation requests do not multiply pending jobs',async()=>{
 run("UPDATE upload_sessions SET status='PUBLISHED' WHERE id=?",uploadId);run("UPDATE videos SET status='PUBLISHED' WHERE id=?",videoId);
 queueVideoRevocation(videoId,'SYNTHETIC_REVOKE');queueVideoRevocation(videoId,'SYNTHETIC_REVOKE');
 assert.equal(one("SELECT COUNT(*) AS n FROM media_revocation_jobs WHERE upload_id=? AND reason='SYNTHETIC_REVOKE' AND status='PENDING'",uploadId).n,1);
});
test('E08 retention proxy suppresses small cohorts and exposes no viewer identities',async()=>{
 const first=await http('/api/studio/analytics/retention',{cookie:owner});assert.equal(first.status,200);
 assert.equal(first.payload.items.find(x=>x.videoId===videoId).privacySuppressed,true);
 for(let i=0;i<5;i++){const id=Number(run('INSERT INTO users(email,name,role,created_at) VALUES(?,?,?,?)',`viewer-${i}@example.test`,`Viewer ${i}`,'MEMBER',now()).lastInsertRowid);run('INSERT INTO watch_progress(user_id,video_id,position,watched_at) VALUES(?,?,?,?)',id,videoId,10,now())}
 run('UPDATE videos SET duration=100 WHERE id=?',videoId);
 const r=await http('/api/studio/analytics/retention',{cookie:owner});assert.equal(r.status,200);assert.equal(r.payload.items.find(x=>x.videoId===videoId).privacySuppressed,false);
 assert.equal(r.payload.items.find(x=>x.videoId===videoId).meanLastSavedProgressRatio,0.1);
 assert.equal((await http('/api/studio/analytics/retention',{cookie:outsider})).status,403);
 assert.ok(!JSON.stringify(r.payload).includes('viewer-0@example.test'));
});
test('E10 license reminders and append-only review history are admin-only',async()=>{
 const expiresAt=new Date(Date.now()+5*86400000).toISOString();const data={action:'VERIFY',reference:'synthetic-license-ref-1234',expiresAt,note:'Internal synthetic review record only'};
 assert.equal((await patch(`/api/admin/uploads/${uploadId}/license`,data,outsider)).status,403);
 assert.equal((await patch(`/api/admin/uploads/${uploadId}/license`,data,admin)).status,200);
 const due=await http('/api/admin/licenses/renewals?days=10',{cookie:admin});assert.equal(due.status,200);assert.ok(due.payload.items.some(x=>x.uploadId===uploadId));
 assert.equal((await http('/api/admin/licenses/renewals?days=999',{cookie:admin})).status,400);
 const history=await http(`/api/admin/licenses/${uploadId}/history`,{cookie:admin});assert.equal(history.status,200);assert.equal(history.payload.items[0].action,'RECORDED');
 assert.equal((await http(`/api/admin/licenses/${uploadId}/history`,{cookie:outsider})).status,403);
});
test('I01 structured complaint intake issues private case identifiers',async()=>{
 const r=await post('/api/compliance/cases',{videoId,category:'CONSENT',details:'Synthetic complaint requiring human review, not auto removal.'},outsider);
 assert.equal(r.status,201);assert.equal(r.payload.priority,'URGENT');globalThis.case26=r.payload.id;
 assert.equal((await http('/api/admin/compliance/cases',{cookie:outsider})).status,403);
});
test('I02 case assignment and SLA timers require administrator and retain audit event',async()=>{
 const id=globalThis.case26;
 assert.equal((await patch(`/api/admin/compliance/cases/${id}/assign`,{reviewerId:admin2Id},outsider)).status,403);
 assert.equal((await patch(`/api/admin/compliance/cases/${id}/assign`,{reviewerId:ownerId},admin)).status,400);
 assert.equal((await patch(`/api/admin/compliance/cases/${id}/assign`,{reviewerId:admin2Id},admin)).status,200);
 const sla=await http('/api/admin/compliance/sla',{cookie:admin});assert.equal(sla.status,200);assert.equal(sla.payload.items.find(x=>x.id===id).targetHours,4);
 assert.equal(one('SELECT assigned_to FROM compliance_cases WHERE id=?',id).assigned_to,admin2Id);
 assert.ok(all('SELECT action FROM compliance_case_events WHERE case_id=?',id).some(x=>x.action==='ASSIGNED'));
});
test('I05 optional dual-review gate requires two distinct signoffs and never republishes',async()=>{
 const id=globalThis.case26;process.env.SA_REQUIRE_DUAL_REVIEW='1';
 const decision={status:'RESOLVED',note:'Synthetic case reviewed and resolved only as a test'};
 assert.equal((await patch(`/api/admin/compliance/cases/${id}/decision`,decision,admin)).status,409);
 assert.equal((await post(`/api/admin/compliance/cases/${id}/signoff`,{note:'First independent synthetic review'},admin)).status,200);
 assert.equal((await post(`/api/admin/compliance/cases/${id}/signoff`,{note:'Duplicate independent review'},admin)).status,409);
 assert.equal((await patch(`/api/admin/compliance/cases/${id}/decision`,decision,admin)).status,409);
 assert.equal((await post(`/api/admin/compliance/cases/${id}/signoff`,{note:'Second independent synthetic review'},admin2)).status,200);
 assert.equal((await patch(`/api/admin/compliance/cases/${id}/decision`,decision,admin)).status,200);
 assert.equal(one('SELECT status FROM videos WHERE id=?',videoId).status,'PUBLISHED');
 delete process.env.SA_REQUIRE_DUAL_REVIEW;
});
test('E09 uploader delegation is explicitly not enabled by invitation alone',async()=>{
 const r=await post('/api/studio/collaborators',{email:'analyst26@example.test',role:'UPLOADER'},owner);assert.equal(r.status,409,'accepted analyst must be revoked before changing roles');
 assert.equal((await del(`/api/studio/collaborators/${analystId}`,owner)).status,200);
 const invite=await post('/api/studio/collaborators',{email:'analyst26@example.test',role:'UPLOADER'},owner);assert.equal(invite.status,201);
 assert.match(invite.payload.notice,/not yet enabled/);
 assert.equal((await post('/api/studio/collaborators/accept',{ownerId},analyst)).status,200);
 assert.equal((await post('/api/studio/uploads/initiate',{title:'Unauthorized Delegated Upload',size:2048,filename:'demo.mp4',mime:'video/mp4',categoryId:cat,rightsDeclaration:true,adultsDeclaration:true,consentDeclaration:true},analyst)).status,403);
});
test('I01 optional opaque complaint evidence reference is restricted to admin detail',async()=>{
 const r=await post('/api/compliance/cases',{videoId,category:'COPYRIGHT',details:'Synthetic notice with an opaque reference for offline human review.',evidenceReference:'casevault:synthetic-001'},outsider);
 assert.equal(r.status,201);assert.ok(!JSON.stringify(r.payload).includes('casevault'));
 const detail=await http('/api/admin/compliance/cases/'+r.payload.id,{cookie:admin});assert.equal(detail.status,200);
 assert.equal(detail.payload.evidenceReferences[0].reference,'casevault:synthetic-001');
 assert.equal((await http('/api/admin/compliance/cases/'+r.payload.id,{cookie:outsider})).status,403);
 assert.equal((await post('/api/compliance/cases',{videoId,category:'COPYRIGHT',details:'Synthetic notice with a bad evidence reference.',evidenceReference:'<script>bad</script>'},outsider)).status,400);
});
test('I03 revocation operator view does not claim actual CDN invalidation',async()=>{
 const r=await http(`/api/admin/media/revocations/${videoId}/status`,{cookie:admin});assert.equal(r.status,200);
 assert.equal(r.payload.cdnRevocationVerified,false);assert.ok(r.payload.jobs.some(x=>x.reason==='SYNTHETIC_REVOKE'));
 assert.equal((await http(`/api/admin/media/revocations/${videoId}/status`,{cookie:outsider})).status,403);
 assert.equal((await http('/api/admin/media/revocations/99999999/status',{cookie:admin})).status,404);
});
test('I04 uploader appeals are private and cannot republish automatically',async()=>{
 const caseId=globalThis.case26;
 const appeal=await post(`/api/compliance/cases/${caseId}/appeal`,{details:'Synthetic uploader requests independent review of this decision.'},owner);
 assert.equal(appeal.status,201);
 const list=await http('/api/me/compliance/appeals',{cookie:owner});assert.equal(list.status,200);assert.ok(list.payload.items.some(x=>x.caseId===caseId&&x.state==='PENDING'));
 assert.equal((await http('/api/me/compliance/appeals',{cookie:outsider})).payload.items.length,0);
 assert.equal(one('SELECT status FROM videos WHERE id=?',videoId).status,'PUBLISHED');
});
