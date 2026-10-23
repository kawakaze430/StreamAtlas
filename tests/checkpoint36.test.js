import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import crypto from 'node:crypto';
const work=fs.mkdtempSync(path.join(os.tmpdir(),'sa36-integration-'));
process.env.NODE_ENV='test';process.env.SA_DISABLE_WORKER='1';process.env.DB_PATH=path.join(work,'test.db');process.env.PRIVATE_PATH=path.join(work,'private');
const {server}=await import('../src/server.js');
const {one,run,now}=await import('../src/database.js');
let base,owner,analyst,outsider,ownerId,analystId,outsiderId,video,holdId,playlistId,uploadId;
async function request(path,{method='GET',cookie,payload}={}){
 const headers={'X-Requested-With':'StreamAtlas'};if(cookie)headers.Cookie=cookie;if(payload!==undefined)headers['Content-Type']='application/json';
 const res=await fetch(base+path,{method,headers,body:payload===undefined?undefined:JSON.stringify(payload)});
 return {status:res.status,body:await res.json(),cookie:res.headers.get('set-cookie')?.split(';')[0]};
}
async function register(email){return (await request('/api/auth/register',{method:'POST',payload:{name:email.split('@')[0],email,password:'long-testing-password-36'}})).cookie}
before(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));base='http://127.0.0.1:'+server.address().port;
 owner=await register('owner36@local.test');analyst=await register('analyst36@local.test');outsider=await register('outsider36@local.test');
 ownerId=one("SELECT id FROM users WHERE email='owner36@local.test'").id;
 analystId=one("SELECT id FROM users WHERE email='analyst36@local.test'").id;
 outsiderId=one("SELECT id FROM users WHERE email='outsider36@local.test'").id;
 video=one("SELECT id,slug,channel_id AS channelId FROM videos WHERE status='PUBLISHED' ORDER BY id LIMIT 1");
 run('INSERT INTO creator_profiles(user_id,channel_id,display_name,status,applied_at) VALUES(?,?,?,?,?)',ownerId,video.channelId,'Synthetic Creator','APPROVED',now());
 uploadId=crypto.randomUUID();
 run(`INSERT INTO upload_sessions(id,user_id,video_id,original_filename,declared_type,expected_bytes,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?)`,uploadId,ownerId,video.id,'sample.mp4','video/mp4',2048,'PUBLISHED',now(),now());
 run("INSERT INTO creator_collaborators(owner_id,collaborator_id,role,status,invited_at,accepted_at) VALUES(?,?,'ANALYST','ACCEPTED',?,?)",ownerId,analystId,now(),now());
 run('INSERT INTO subscriptions(user_id,channel_id,created_at) VALUES(?,?,?)',ownerId,video.channelId,now());
 run('INSERT INTO favorites(user_id,video_id,created_at) VALUES(?,?,?)',ownerId,video.id,now());
 run('INSERT INTO watch_progress(user_id,video_id,position,watched_at) VALUES(?,?,?,?)',ownerId,video.id,10,now());
 await request('/api/me/queue',{method:'POST',cookie:owner,payload:{videoId:video.id}});
 const r=await request('/api/me/playlists',{method:'POST',cookie:owner,payload:{name:'Synthetic playlist'}});assert.equal(r.status,201);playlistId=r.body.id;
 await request('/api/me/playlists/items',{method:'POST',cookie:owner,payload:{playlistId,videoId:video.id}});
});
after(async()=>{await new Promise(r=>server.close(r));fs.rmSync(work,{recursive:true,force:true})});
test('creator trends suppress low opt-in cohorts and enforce strict analytics authorization',async()=>{
 assert.equal((await request('/api/studio/analytics/playback-trends')).status,401);
 assert.equal((await request('/api/studio/analytics/playback-trends',{cookie:outsider,payload:undefined})).status,404);
 assert.equal((await request(`/api/studio/analytics/playback-trends?ownerId=${ownerId}`,{cookie:outsider})).status,403);
 assert.equal((await request(`/api/studio/analytics/playback-trends?ownerId=${ownerId}`,{cookie:analyst})).status,200);
 for(const days of ['0','31','abc','-2'])assert.equal((await request('/api/studio/analytics/playback-trends?days='+days,{cookie:owner})).status,400);
 assert.equal((await request('/api/studio/analytics/playback-trends?ownerId=2.2',{cookie:owner})).status,400);
 run(`INSERT INTO video_qoe_daily(video_id,day,samples,completions,startup_failures,startup_ms_total,buffer_ms_total,playback_ms_total,errors_total,switches_total,updated_at) VALUES(?,date('now'),4,2,1,800,400,3600000,1,2,?)`,video.id,now());
 let r=await request('/api/studio/analytics/playback-trends',{cookie:owner});assert.equal(r.status,200);assert.equal(r.body.items[0].privacySuppressed,true);assert.equal(r.body.items[0].samples,null);
 run('UPDATE video_qoe_daily SET samples=6,completions=4,playback_ms_total=7200000 WHERE video_id=?',video.id);
 r=await request('/api/studio/analytics/playback-trends?days=7',{cookie:analyst});assert.equal(r.status,404); // Analyst needs explicit ownerId.
 r=await request(`/api/studio/analytics/playback-trends?days=7&ownerId=${ownerId}`,{cookie:analyst});assert.equal(r.status,200);
 assert.equal(r.body.items[0].samples,6);assert.equal(r.body.items[0].optInPlaybackHours,2);
 assert.equal(r.body.items[0].averageStartupMs,133);
 assert.equal(r.body.items[0].privacySuppressed,false);
 assert.equal(JSON.stringify(r.body).includes('owner36@local.test'),false);
 assert.equal((await request(`/api/studio/analytics/playback-trends?days=7&ownerId=${ownerId}`,{cookie:outsider})).status,403);
});
test('collaborator role changes are owner-only, audited and revocable',async()=>{
 const uri='/api/studio/collaborators/'+analystId+'/role';
 assert.equal((await request(uri,{method:'PATCH',cookie:outsider,payload:{role:'EDITOR'}})).status,403);
 assert.equal((await request(uri,{method:'PATCH',cookie:owner,payload:{role:'ADMIN'}})).status,400);
 assert.equal((await request(uri,{method:'PATCH',cookie:owner,payload:{role:'EDITOR'}})).status,200);
 assert.equal(one('SELECT role FROM creator_collaborators WHERE owner_id=? AND collaborator_id=?',ownerId,analystId).role,'EDITOR');
 assert.equal(one("SELECT COUNT(*) AS n FROM moderation_audit WHERE actor_id=? AND object_type='creator_collaborator' AND action='ROLE_CHANGE'",ownerId).n,1);
 assert.equal((await request(uri,{method:'PATCH',cookie:owner,payload:{role:'EDITOR'}})).status,409);
 assert.equal((await request(`/api/studio/analytics/playback-trends?ownerId=${ownerId}`,{cookie:analyst})).status,200);
 assert.equal((await request('/api/studio/collaborators/'+analystId,{method:'DELETE',cookie:owner})).status,200);
 assert.equal((await request(`/api/studio/analytics/playback-trends?ownerId=${ownerId}`,{cookie:analyst})).status,403);
 assert.equal((await request(uri,{method:'PATCH',cookie:owner,payload:{role:'ANALYST'}})).status,404);
});
test('placing an active hold hides previously saved video from feeds, library, playlist, queue and history',async()=>{
 const pre=await request('/api/me/library?type=favorites',{cookie:owner});assert.equal(pre.status,200);assert.ok(pre.body.items.some(x=>x.id===video.id));
 run('INSERT INTO notifications(user_id,channel_id,video_id,type,created_at) VALUES(?,?,?,?,?)',ownerId,video.channelId,video.id,'NEW_VIDEO',now());
 holdId=Number(run("INSERT INTO content_holds(video_id,reason,details,opened_by,opened_at) VALUES(?,?,?,?,?)",video.id,'COPYRIGHT','Safety hold for cross-route regression',ownerId,now()).lastInsertRowid);
 try{
  for(const url of ['/api/me/feed','/api/home/feed?mode=subscriptions','/api/me/queue','/api/me/library?type=favorites','/api/me/history','/api/me/continue-watching','/api/me/playlists/'+playlistId]){
   const r=await request(url,{cookie:owner});assert.equal(r.status,200,url);assert.equal(r.body.items.some(x=>x.id===video.id),false,url);
  }
  const next=await request('/api/videos/'+video.slug+'/related');assert.equal(next.status,404);
  assert.equal((await request('/api/me/notifications',{cookie:owner})).body.items.some(x=>x.slug===video.slug),false);
  for(const [url,payload] of [['/api/me/queue',{videoId:video.id}],['/api/me/library/toggle',{videoId:video.id,type:'favorite'}],['/api/videos/view',{videoId:video.id}],['/api/me/progress',{videoId:video.id,position:20}],['/api/me/playlists/items',{playlistId,videoId:video.id}]]){
   assert.equal((await request(url,{method:'POST',cookie:owner,payload})).status,404,url);
  }
  assert.equal((await request('/api/me/recommendations',{cookie:owner})).body.items.some(x=>x.id===video.id),false);
  assert.equal((await request('/api/home/feed?mode=for-you',{cookie:owner})).body.items.some(x=>x.id===video.id),false);
  assert.equal((await request('/api/home/feed?mode=subscriptions',{cookie:owner})).body.items.some(x=>x.id===video.id),false);
  assert.equal((await request('/api/me/queue/navigation?videoId='+video.id,{cookie:owner})).body.inQueue,false);
  assert.equal((await request('/api/me/queue/order',{method:'PATCH',cookie:owner,payload:{videoIds:[video.id]}})).status,409);
  assert.equal((await request('/api/studio/analytics/playback-trends',{cookie:owner})).body.items.some(x=>x.videoId===video.id),false);
  assert.equal((await request('/api/studio/analytics/qoe',{cookie:owner})).body.items.some(x=>x.videoId===video.id),false);
 }finally{run('UPDATE content_holds SET closed_at=?,closed_by=? WHERE id=?',now(),ownerId,holdId)}
 const r=await request('/api/me/library?type=favorites',{cookie:owner});assert.equal(r.body.items.some(x=>x.id===video.id),true);
});
