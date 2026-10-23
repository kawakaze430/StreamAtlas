import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'sa34-'));
process.env.DB_PATH=path.join(tmp,'db.sqlite');process.env.PRIVATE_PATH=path.join(tmp,'private');process.env.NODE_ENV='test';process.env.SA_DISABLE_WORKER='1';
const {server}=await import('../src/server.js');
const {one,run,now}=await import('../src/database.js');
const {readinessFindings,mediaRemovalPlan}=await import('../src/operational-controls34.js');
let base,admin,viewer,creator,creatorId,videoId;
async function request(route,{method='GET',cookie,json}={}){
 const headers={'X-Requested-With':'StreamAtlas'};if(cookie)headers.Cookie=cookie;if(json!==undefined)headers['Content-Type']='application/json';
 const res=await fetch(base+route,{method,headers,body:json===undefined?undefined:JSON.stringify(json)});
 return {status:res.status,body:await res.json(),cookie:res.headers.get('set-cookie')?.split(';')[0]};
}
before(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));base='http://127.0.0.1:'+server.address().port;
 admin=(await request('/api/auth/register',{method:'POST',json:{email:'admin34@local.test',name:'Admin34',password:'some-long-pass-34'}})).cookie;
 viewer=(await request('/api/auth/register',{method:'POST',json:{email:'viewer34@local.test',name:'Viewer34',password:'some-long-pass-34'}})).cookie;
 creator=(await request('/api/auth/register',{method:'POST',json:{email:'creator34@local.test',name:'Creator34',password:'some-long-pass-34'}})).cookie;
 run("UPDATE users SET role='ADMIN' WHERE email=?",'admin34@local.test');
 creatorId=one('SELECT id FROM users WHERE email=?','creator34@local.test').id;
 videoId=one("SELECT id FROM videos WHERE status='PUBLISHED' ORDER BY id LIMIT 1").id;
});
after(async()=>{await new Promise(resolve=>server.close(resolve));fs.rmSync(tmp,{recursive:true,force:true})});
test('admin readiness counters and recovery plan do not expose private material',async()=>{
 assert.equal((await request('/api/admin/operations/readiness-findings')).status,401);
 assert.equal((await request('/api/admin/operations/readiness-findings',{cookie:viewer})).status,403);
 const r=await request('/api/admin/operations/readiness-findings',{cookie:admin});assert.equal(r.status,200);assert.ok(r.body.catalog.total>=72);assert.equal(r.body.publicLaunchApproved,false);
 const recovery=await request('/api/admin/operations/recovery-plan',{cookie:admin});assert.equal(recovery.status,200);assert.equal(recovery.body.productionReady,false);
 assert.ok(!JSON.stringify(recovery.body).includes('SA_CSRF_SECRET'));
});
test('removal planning requires admin; no catalog mutation and no private paths',async()=>{
 const original=one('SELECT status FROM videos WHERE id=?',videoId).status;
 assert.equal((await request('/api/admin/operations/media-removal-plan/'+videoId,{cookie:viewer})).status,403);
 const r=await request('/api/admin/operations/media-removal-plan/'+videoId,{cookie:admin});assert.equal(r.status,200);
 assert.equal(r.body.dryRun,true);assert.equal(r.body.changesMade,false);
 assert.equal(r.body.requiredSteps.some(s=>s.includes('CDN purge')),true);
 assert.equal(one('SELECT status FROM videos WHERE id=?',videoId).status,original);
 assert.equal((await request('/api/admin/operations/media-removal-plan/999999999',{cookie:admin})).status,404);
});
test('human triage changes priority with audit events and prevents illegal transitions',async()=>{
 const viewerId=one('SELECT id FROM users WHERE email=?','viewer34@local.test').id;
 const id=Number(run("INSERT INTO compliance_cases(video_id,reporter_id,category,details,status,priority,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)",videoId,viewerId,'COPYRIGHT','Test report with clear and complete details','OPEN','STANDARD',now(),now()).lastInsertRowid);
 const url=`/api/admin/compliance/cases/${id}/priority`;
 assert.equal((await request(url,{method:'PATCH',cookie:viewer,json:{priority:'URGENT',note:'A genuine reason for escalation.'}})).status,403);
 assert.equal((await request(url,{method:'PATCH',cookie:admin,json:{priority:'URGENT',note:'short'}})).status,400);
 assert.equal((await request(url,{method:'PATCH',cookie:admin,json:{priority:'MALICIOUS',note:'A genuine reason for escalation.'}})).status,400);
 const r=await request(url,{method:'PATCH',cookie:admin,json:{priority:'URGENT',note:'Urgent allegation requires manual triage.'}});
 assert.equal(r.status,200);assert.equal(one('SELECT priority FROM compliance_cases WHERE id=?',id).priority,'URGENT');
 assert.equal(one("SELECT COUNT(*) AS n FROM compliance_case_events WHERE case_id=? AND action='PRIORITY_URGENT'",id).n,1);
 const triage=await request('/api/admin/compliance/triage',{cookie:admin});assert.equal(triage.status,200);assert.equal(triage.body.items.some(x=>x.caseId===id),true);
 assert.equal((await request(url,{method:'PATCH',cookie:admin,json:{priority:'URGENT',note:'Duplicate status update not allowed.'}})).status,409);
 run("UPDATE compliance_cases SET status='CLOSED' WHERE id=?",id);
 assert.equal((await request(url,{method:'PATCH',cookie:admin,json:{priority:'STANDARD',note:'Closed cases cannot be reprioritized.'}})).status,409);
});
test('creator upload and rights dashboards never include other user data',async()=>{
 const r=await request('/api/studio/upload-health',{cookie:creator});assert.equal(r.status,200);assert.deepEqual(r.body.items,[]);
 assert.equal((await request('/api/studio/upload-health')).status,401);
 assert.equal((await request('/api/studio/upload-health?limit=999',{cookie:creator})).status,400);
 assert.deepEqual((await request('/api/studio/rights-reminders',{cookie:creator})).body.items,[]);
 assert.equal((await request('/api/studio/rights-reminders?days=0',{cookie:creator})).status,400);
});
test('personal privacy summary is scoped and not usable without a session',async()=>{
 assert.equal((await request('/api/me/privacy/summary')).status,401);
 const r=await request('/api/me/privacy/summary',{cookie:viewer});assert.equal(r.status,200);
 assert.equal(r.body.otherUsersDataIncluded,false);assert.equal(r.body.watchProgress,0);
 run('INSERT INTO favorites(user_id,video_id,created_at) VALUES(?,?,?)',creatorId,videoId,now());
 assert.equal((await request('/api/me/privacy/summary',{cookie:viewer})).body.favorites,0);
 assert.equal((await request('/api/me/privacy/summary',{cookie:creator})).body.favorites,1);
});
test('readiness and media-removal pure helper audit snapshots remain fail-closed',()=>{
 assert.equal(readinessFindings().publicLaunchApproved,false);
 const plan=mediaRemovalPlan(videoId);assert.equal(plan.changesMade,false);
 assert.equal(mediaRemovalPlan(999999999),null);
});
