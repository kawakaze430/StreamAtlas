import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'streamatlas-cp06-'));
process.env.DB_PATH=path.join(dir,'test.db');process.env.PRIVATE_PATH=path.join(dir,'private');process.env.NODE_ENV='test';
const {server}=await import('../src/server.js');const {one,run}=await import('../src/database.js');
let base,a,b,videoId,videoSlug;
before(async()=>{await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));base=`http://127.0.0.1:${server.address().port}`;
 const video=one("SELECT id,slug FROM videos WHERE status='PUBLISHED' LIMIT 1");videoId=video.id;videoSlug=video.slug;
 a=await call('/api/auth/register',{method:'POST',body:{name:'Alice Member',email:'cp06alice@example.test',password:'long-strong-pass-1234'}});assert.equal(a.status,201);
 b=await call('/api/auth/register',{method:'POST',body:{name:'Bob Member',email:'cp06bob@example.test',password:'bob-long-pass-1234'}});assert.equal(b.status,201);
});
after(async()=>{await new Promise(resolve=>server.close(resolve));fs.rmSync(dir,{recursive:true,force:true})});
async function call(uri,{method='GET',body,cookie}={}){
 const headers={'X-Requested-With':'StreamAtlas'};if(body!==undefined)headers['Content-Type']='application/json';if(cookie)headers.Cookie=cookie;
 const response=await fetch(base+uri,{method,headers,body:body!==undefined?JSON.stringify(body):undefined});
 const data=await response.json().catch(()=>null);
 return {status:response.status,data,cookie:response.headers.get('set-cookie')?.split(';')[0]};
}
const ca=()=>a.cookie,cb=()=>b.cookie;

test('CP06: status and additive privacy schema',async()=>{
 assert.ok((await call('/api/health')).data.checkpoint>=6);
 assert.ok(one("SELECT name FROM sqlite_master WHERE type='table' AND name='user_preferences'"));
});
test('CP06: advanced search facets match ranges, quality and reject malformed values',async()=>{
 const full=(await call('/api/videos?limit=72')).data.items;
 const min=5,max=10;
 const q=await call(`/api/videos?minDuration=${min}&maxDuration=${max}&sort=most-viewed&limit=72`);
 assert.equal(q.status,200);assert.ok(q.data.items.every(x=>x.duration>=min&&x.duration<=max));
 assert.equal(q.data.total,full.filter(x=>x.duration>=min&&x.duration<=max).length);
 const hd=await call('/api/videos?quality=HD&limit=72');assert.equal(hd.status,200);assert.ok(hd.data.items.every(x=>x.quality==='HD'));
 for(const p of ['minDuration=-1','maxDuration=100000','quality=FHD','minDuration=10&maxDuration=3'])assert.equal((await call('/api/videos?'+p)).status,400,p);
});
test('CP06: privacy preferences isolated across accounts and persist',async()=>{
 const defaults=await call('/api/me/preferences',{cookie:ca()});assert.deepEqual(defaults.data,{pauseHistory:false,autoplayNext:false});
 const invalid=await call('/api/me/preferences',{method:'PATCH',cookie:ca(),body:{pauseHistory:'true',autoplayNext:true}});assert.equal(invalid.status,400);
 const saved=await call('/api/me/preferences',{method:'PATCH',cookie:ca(),body:{pauseHistory:true,autoplayNext:true}});assert.equal(saved.status,200);
 assert.equal((await call('/api/me/preferences',{cookie:ca()})).data.pauseHistory,true);
 assert.equal((await call('/api/me/preferences',{cookie:cb()})).data.pauseHistory,false);
});
test('CP06: history paused blocks new progress and resumes afterwards',async()=>{
 const paused=await call('/api/me/progress',{method:'POST',cookie:ca(),body:{videoId,position:4}});
 assert.equal(paused.status,200);assert.equal(paused.data.saved,false);
 assert.equal((await call('/api/me/history',{cookie:ca()})).data.items.length,0);
 await call('/api/me/preferences',{method:'PATCH',cookie:ca(),body:{pauseHistory:false,autoplayNext:false}});
 const saved=await call('/api/me/progress',{method:'POST',cookie:ca(),body:{videoId,position:4}});assert.equal(saved.status,200);
 assert.equal((await call('/api/me/history',{cookie:ca()})).data.items.length,1);
});
test('CP06: saved-list clearing belongs only to its owner',async()=>{
 await call('/api/me/library/toggle',{method:'POST',cookie:ca(),body:{videoId,type:'watchLater'}});
 await call('/api/me/library/toggle',{method:'POST',cookie:cb(),body:{videoId,type:'watchLater'}});
 assert.equal((await call('/api/me/library?type=watchLater',{method:'DELETE',cookie:ca()})).data.removed,1);
 assert.equal((await call('/api/me/library?type=watch_later',{cookie:ca()})).data.items.length,0);
 assert.equal((await call('/api/me/library?type=watch_later',{cookie:cb()})).data.items.length,1);
 assert.equal((await call('/api/me/library?type=unknown',{method:'DELETE',cookie:ca()})).status,400);
});
test('CP06: own comment deletion cannot remove another user comment',async()=>{
 const create=await call('/api/comments',{method:'POST',cookie:ca(),body:{videoId,body:'A comment that belongs to Alice'}});assert.equal(create.status,201);
 const details=(await call('/api/videos/'+videoSlug)).data;
 const entry=details.comments.find(x=>x.body==='A comment that belongs to Alice');assert.ok(entry?.userId);
 const denied=await call('/api/me/comments/'+entry.id,{method:'DELETE',cookie:cb()});assert.equal(denied.status,404);
 assert.equal((await call('/api/me/comments/'+entry.id,{method:'DELETE',cookie:ca()})).status,200);
 const after=(await call('/api/videos/'+videoSlug)).data;assert.ok(!after.comments.some(x=>x.id===entry.id));
});
test('CP06: password change rejects wrong password, keeps active login, revokes other sessions',async()=>{
 const second=await call('/api/auth/login',{method:'POST',body:{email:'cp06alice@example.test',password:'long-strong-pass-1234'}});assert.equal(second.status,200);
 const denied=await call('/api/me/password',{method:'PATCH',cookie:ca(),body:{currentPassword:'bad',newPassword:'different-long-pass-222'}});assert.equal(denied.status,403);
 const weak=await call('/api/me/password',{method:'PATCH',cookie:ca(),body:{currentPassword:'long-strong-pass-1234',newPassword:'weak'}});assert.equal(weak.status,400);
 const changed=await call('/api/me/password',{method:'PATCH',cookie:ca(),body:{currentPassword:'long-strong-pass-1234',newPassword:'different-long-pass-222'}});
 assert.equal(changed.status,200);
 assert.ok((await call('/api/auth/me',{cookie:ca()})).data.user);
 assert.equal((await call('/api/auth/me',{cookie:second.cookie})).data.user,null);
 assert.equal((await call('/api/auth/login',{method:'POST',body:{email:'cp06alice@example.test',password:'long-strong-pass-1234'}})).status,401);
 assert.equal((await call('/api/auth/login',{method:'POST',body:{email:'cp06alice@example.test',password:'different-long-pass-222'}})).status,200);
});
test('CP06: settings are included in account export and admin diagnostics remain private',async()=>{
 const exportData=await call('/api/me/export',{cookie:ca()});assert.equal(exportData.status,200);assert.deepEqual(exportData.data.preferences,{pauseHistory:false,autoplayNext:false});
 assert.equal((await call('/api/admin/diagnostics',{cookie:ca()})).status,403);
 run("UPDATE users SET role='ADMIN' WHERE email=?",'cp06alice@example.test');
 const diagnostics=await call('/api/admin/diagnostics',{cookie:ca()});assert.equal(diagnostics.status,200);
 assert.equal(diagnostics.data.databaseIntegrity,'ok');assert.ok(Array.isArray(diagnostics.data.uploadStates));
});
test('CP06: explainable member recommendations require a session and exclude hidden media',async()=>{
 assert.equal((await call('/api/me/recommendations')).status,401);
 const before=await call('/api/me/recommendations?limit=7',{cookie:cb()});assert.equal(before.status,200);assert.equal(before.data.items.length,7);
 assert.ok(before.data.items.every(v=>v.reason&&v.status!=='HIDDEN'));
 const id=before.data.items[0].id;
 await call('/api/me/library/toggle',{method:'POST',cookie:cb(),body:{videoId:id,type:'favorite'}});
 const after=await call('/api/me/recommendations?limit=7',{cookie:cb()});assert.equal(after.status,200);
 assert.equal(after.data.items.length,7);
 assert.ok(after.data.items.every(v=>typeof v.reason==='string'));
 assert.equal((await call('/api/me/recommendations?limit=500',{cookie:cb()})).data.items.length,24);
});
