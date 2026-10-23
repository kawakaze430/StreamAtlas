import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'sa-cp24-'));
process.env.DB_PATH=path.join(tmp,'test.sqlite');process.env.PRIVATE_PATH=path.join(tmp,'private');process.env.NODE_ENV='test';
const {server}=await import('../src/server.js');
const {one,run}=await import('../src/database.js');
let base,alice,bob,ids,slug;
async function req(url,{method='GET',cookie,body}={}){
 const headers={'X-Requested-With':'StreamAtlas'};if(cookie)headers.Cookie=cookie;if(body!==undefined)headers['Content-Type']='application/json';
 const response=await fetch(base+url,{method,headers,body:body===undefined?undefined:JSON.stringify(body)});
 return {status:response.status,body:await response.json().catch(()=>null),cookie:response.headers.get('set-cookie')?.split(';')[0]};
}
const post=(p,b,c)=>req(p,{method:'POST',body:b,cookie:c});const patch=(p,b,c)=>req(p,{method:'PATCH',body:b,cookie:c});
const deleted=(p,b,c)=>req(p,{method:'DELETE',body:b,cookie:c});
before(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));base='http://127.0.0.1:'+server.address().port;
 const create=async(name,email)=>{const u=await post('/api/auth/register',{name,email,password:'long-secure-123456'});assert.equal(u.status,201);return u.cookie};
 alice=await create('Alice24','alice24@example.test');bob=await create('Bob24','bob24@example.test');
 const videos=(await req('/api/videos?limit=8')).body.items;ids=videos.map(v=>v.id);slug=videos[0].slug;
});
after(async()=>{await new Promise(r=>server.close(r));fs.rmSync(tmp,{recursive:true,force:true})});
test('C01 homepage modes require authorization for personal feeds, reject invalid mode',async()=>{
 for(const mode of ['latest','trending','top-rated']){const r=await req('/api/home/feed?mode='+mode);assert.equal(r.status,200);assert.ok(r.body.items.length);assert.equal(r.body.mode,mode)}
 assert.equal((await req('/api/home/feed?mode=for-you')).status,401);
 assert.equal((await req('/api/home/feed?mode=subscriptions')).status,401);
 assert.equal((await req('/api/home/feed?mode=INVALID',{cookie:alice})).status,400);
 assert.equal((await req('/api/home/feed?mode=for-you',{cookie:alice})).status,200);
});
test('C02 saved library advanced filtering, watched state and bulk actions isolated',async()=>{
 await post('/api/me/library/toggle',{videoId:ids[0],type:'favorite'},alice);await post('/api/me/library/toggle',{videoId:ids[1],type:'favorite'},alice);
 await post('/api/me/progress',{videoId:ids[0],position:12},alice);
 assert.deepEqual((await req('/api/me/library?type=favorites&filter=watched',{cookie:alice})).body.items.map(v=>v.id),[ids[0]]);
 assert.deepEqual((await req('/api/me/library?type=favorites&filter=unwatched',{cookie:alice})).body.items.map(v=>v.id),[ids[1]]);
 assert.equal((await req('/api/me/library?sort=unsupported',{cookie:alice})).status,400);
 assert.equal((await deleted('/api/me/library/items',{type:'favorites',videoIds:[ids[0]]},bob)).body.removed,0);
 assert.equal((await deleted('/api/me/library/items',{type:'favorites',videoIds:[ids[0],ids[1]]},alice)).body.removed,2);
 assert.equal((await deleted('/api/me/library/items',{type:'favorites',videoIds:[ids[0],ids[0]]},alice)).status,400);
});
test('C03 playlists default private, share only when unlisted, owner bulk removal',async()=>{
 const create=await post('/api/me/playlists',{name:'Shared if enabled'},alice);assert.equal(create.status,201);const pid=create.body.id;
 await post('/api/me/playlists/items',{playlistId:pid,videoId:ids[0]},alice);
 await post('/api/me/playlists/items',{playlistId:pid,videoId:ids[1]},alice);
 assert.equal((await req('/api/public/playlists/'+pid)).status,404);
 assert.equal((await patch('/api/me/playlists/'+pid,{name:'Shared if enabled',visibility:'UNLISTED'},bob)).status,404);
 assert.equal((await patch('/api/me/playlists/'+pid,{name:'Shared if enabled',visibility:'PUBLIC'},alice)).status,400);
 assert.equal((await patch('/api/me/playlists/'+pid,{name:'Shareable demo',visibility:'UNLISTED'},alice)).status,200);
 assert.equal((await req('/api/public/playlists/'+pid)).body.items.length,2);
 assert.equal((await deleted('/api/me/playlists/'+pid+'/videos',{videoIds:[ids[0]]},bob)).status,404);
 assert.equal((await deleted('/api/me/playlists/'+pid+'/videos',{videoIds:[ids[0]]},alice)).body.removed,1);
 run("UPDATE videos SET status='HIDDEN' WHERE id=?",ids[1]);assert.equal((await req('/api/public/playlists/'+pid)).body.items.length,0);run("UPDATE videos SET status='PUBLISHED' WHERE id=?",ids[1]);
 assert.equal((await patch('/api/me/playlists/'+pid,{name:'Private again',visibility:'PRIVATE'},alice)).status,200);
 assert.equal((await req('/api/public/playlists/'+pid)).status,404);
});
test('C04 synced theme/locale preferences remain private and persist across sessions',async()=>{
 const pref={pauseHistory:false,autoplayNext:true,theme:'light',locale:'Spanish',saveSearches:true};
 assert.equal((await patch('/api/me/preferences',pref,alice)).status,200);
 assert.equal((await req('/api/me/preferences?expanded=1',{cookie:alice})).body.theme,'light');
 assert.equal((await req('/api/me/preferences?expanded=1',{cookie:alice})).body.locale,'Spanish');
 assert.equal((await req('/api/me/preferences?expanded=1',{cookie:bob})).body.theme,'dark');
 assert.equal((await patch('/api/me/preferences',{...pref,locale:'Bad-Language'},alice)).status,400);
 const login=await post('/api/auth/login',{email:'alice24@example.test',password:'long-secure-123456'});
 assert.equal((await req('/api/me/preferences?expanded=1',{cookie:login.cookie})).body.locale,'Spanish');
});
test('C05 subscribed channel modes all / highlights / off, cross-user denied',async()=>{
 const id=one('SELECT id FROM channels ORDER BY id LIMIT 1').id;
 assert.equal((await post('/api/me/subscriptions/toggle',{channelId:id},alice)).status,200);
 assert.equal((await patch(`/api/me/subscriptions/${id}/notifications`,{mode:'HIGHLIGHTS'},alice)).body.mode,'HIGHLIGHTS');
 assert.equal((await req('/api/me/subscriptions',{cookie:alice})).body.items.find(x=>x.id===id).notify,0);
 assert.equal((await patch(`/api/me/subscriptions/${id}/notifications`,{mode:'OFF'},alice)).status,200);
 assert.equal((await patch(`/api/me/subscriptions/${id}/notifications`,{mode:'ALL'},alice)).status,200);
 assert.equal((await patch(`/api/me/subscriptions/${id}/notifications`,{mode:'ALL'},bob)).status,404);
 assert.equal((await patch(`/api/me/subscriptions/${id}/notifications`,{mode:'INVALID'},alice)).status,400);
});
test('C06 threaded comments, report dedupe, moderator pin and hidden parent control',async()=>{
 const v=ids[0],root=await post('/api/comments',{videoId:v,body:'Root comment C24'},alice);assert.equal(root.status,201);
 const child=await post('/api/comments',{videoId:v,parentId:root.body.id,body:'Reply content C24'},bob);assert.equal(child.status,201);
 assert.equal((await post('/api/comments',{videoId:ids[1],parentId:root.body.id,body:'Bad cross video'},bob)).status,409);
 assert.equal((await post('/api/comments',{videoId:v,parentId:child.body.id,body:'No nesting beyond level 1'},bob)).status,409);
 assert.ok((await req('/api/videos/'+slug)).body.comments.some(c=>c.parentId===root.body.id));
 assert.equal((await post('/api/comments/report',{commentId:root.body.id,reason:'Suspicious or abusive comment'},bob)).body.reported,true);
 assert.equal((await post('/api/comments/report',{commentId:root.body.id,reason:'Repeat same report'},bob)).body.reported,false);
 assert.equal((await req('/api/admin/comment-reports',{cookie:bob})).status,403);
 const aliceId=one('SELECT id FROM users WHERE email=?','alice24@example.test').id;
 run("UPDATE users SET role='ADMIN' WHERE id=?",aliceId);
 assert.equal((await patch('/api/admin/comments/'+root.body.id+'/pin',{pinned:true},alice)).status,200);
 assert.equal((await req('/api/videos/'+slug)).body.comments[0].pinned,1);
 assert.equal((await patch('/api/admin/comments/'+root.body.id+'/visibility',{hidden:true},alice)).status,200);
 assert.ok(!(await req('/api/videos/'+slug)).body.comments.some(c=>c.id===child.body.id));
 run("UPDATE users SET role='MEMBER' WHERE id=?",aliceId);
});
test('C07 watch queue navigation previous-next safe for missing/non-owned items',async()=>{
 const [a,b,c]=ids.slice(2,5);await post('/api/me/queue',{videoId:a},alice);await post('/api/me/queue',{videoId:b},alice);await post('/api/me/queue',{videoId:c},alice);
 const out=await req('/api/me/queue/navigation?videoId='+b,{cookie:alice});assert.equal(out.status,200);
 assert.equal(out.body.inQueue,true);assert.equal(out.body.previous,one('SELECT slug FROM videos WHERE id=?',a).slug);
 assert.equal(out.body.next,one('SELECT slug FROM videos WHERE id=?',c).slug);
 assert.equal((await req('/api/me/queue/navigation?videoId='+b,{cookie:bob})).body.inQueue,false);
});
test('C08 recommendations safety and diversity',async()=>{
 const r=await req('/api/me/recommendations?limit=24',{cookie:alice});assert.equal(r.status,200);
 const counts={};for(const v of r.body.items){counts[v.channelId]=(counts[v.channelId]||0)+1;assert.ok(counts[v.channelId]<=3)}
 run("UPDATE videos SET status='HIDDEN' WHERE id=?",ids[7]);
 assert.ok(!(await req('/api/me/recommendations?limit=24',{cookie:alice})).body.items.some(v=>v.id===ids[7]));
 run("UPDATE videos SET status='PUBLISHED' WHERE id=?",ids[7]);
});
test('C09 opt-in search history, dedupe, privacy, clear and export',async()=>{
 assert.equal((await post('/api/me/search-history',{query:'First private search'},bob)).body.saved,false);
 assert.equal((await post('/api/me/search-history',{query:'Category C24'},alice)).body.saved,true);
 await post('/api/me/search-history',{query:'Category C24'},alice);
 assert.equal((await req('/api/me/search-history',{cookie:alice})).body.items.length,1);
 assert.equal((await req('/api/me/search-history',{cookie:bob})).body.items.length,0);
 assert.equal((await req('/api/me/export',{cookie:alice})).body.searchHistory.length,1);
 assert.equal((await deleted('/api/me/search-history',undefined,bob)).body.removed,0);
 assert.equal((await deleted('/api/me/search-history',undefined,alice)).body.removed,1);
});
test('C10 account watch stats and install-manifest safely omit private data',async()=>{
 const r=await req('/api/me/watch-stats',{cookie:alice});assert.equal(r.status,200);assert.ok(r.body.uniqueVideos>=1);
 assert.ok(Array.isArray(r.body.topCategories));assert.match(r.body.note,/not audited total watch time/);
 assert.equal((await req('/api/me/watch-stats')).status,401);
 const manifest=fs.readFileSync(new URL('../public/manifest.webmanifest',import.meta.url),'utf8');
 assert.equal(JSON.parse(manifest).display,'standalone');assert.ok(!manifest.includes('https://'));
});
test('C06 comment complaint review requires admin and creates moderation audit',async()=>{
 const report=one('SELECT id FROM comment_reports ORDER BY id DESC LIMIT 1');assert.ok(report);
 assert.equal((await patch(`/api/admin/comment-reports/${report.id}/close`,{},bob)).status,403);
 const adminId=one('SELECT id FROM users WHERE email=?','alice24@example.test').id;
 run("UPDATE users SET role='ADMIN' WHERE id=?",adminId);
 assert.equal((await patch(`/api/admin/comment-reports/${report.id}/close`,{},alice)).status,200);
 assert.equal((await patch(`/api/admin/comment-reports/${report.id}/close`,{},alice)).status,404);
 assert.equal(one('SELECT action FROM moderation_audit WHERE object_type=? AND object_id=? ORDER BY rowid DESC LIMIT 1','comment_report',String(report.id)).action,'CLOSED');
 run("UPDATE users SET role='MEMBER' WHERE id=?",adminId);
});
test('C09 disabling saved searches automatically clears old account history',async()=>{
 await post('/api/me/search-history',{query:'temporary saved query'},alice);
 assert.equal((await req('/api/me/search-history',{cookie:alice})).body.items.length,1);
 const b={pauseHistory:false,autoplayNext:false,theme:'dark',locale:'English',saveSearches:false};
 assert.equal((await patch('/api/me/preferences',b,alice)).status,200);
 assert.deepEqual((await req('/api/me/search-history',{cookie:alice})).body.items,[]);
 assert.equal((await post('/api/me/search-history',{query:'should not save'},alice)).body.saved,false);
});
