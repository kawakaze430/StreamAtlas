import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'streamatlas-test-'));
process.env.DB_PATH=path.join(tmp,'test.db');
process.env.NODE_ENV='test';
const {server}=await import('../src/server.js');
let base;
before(async()=>{await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));base=`http://127.0.0.1:${server.address().port}`});
after(async()=>{await new Promise(resolve=>server.close(resolve));fs.rmSync(tmp,{recursive:true,force:true})});
async function request(endpoint,{method='GET',body,cookie,header=true,range}={}){
 const headers={};if(body!==undefined)headers['Content-Type']='application/json';if(header)headers['X-Requested-With']='StreamAtlas';if(cookie)headers.Cookie=cookie;if(range)headers.Range=range;
 const response=await fetch(base+endpoint,{method,headers,body:body!==undefined?JSON.stringify(body):undefined});
 const text=await response.text();let json;try{json=JSON.parse(text)}catch{json=text}
 return {status:response.status,headers:response.headers,data:json};
}
const post=(endpoint,body={},cookie)=>request(endpoint,{method:'POST',body,cookie});
let cookie,videoId,channelId,slug;
test('Health endpoint reports running API',async()=>{const out=await request('/api/health');assert.equal(out.status,200);assert.equal(out.data.ok,true)});
test('Demo catalog seeded with relational directories',async()=>{
 const [videos,cats,models,sites,networks,channels]=await Promise.all(['/api/videos?limit=3','/api/categories','/api/performers','/api/sites','/api/networks','/api/channels'].map(x=>request(x)));
 assert.equal(videos.data.total,72);assert.equal(videos.data.items.length,3);
 assert.ok(cats.data.length>20);assert.equal(models.data.length,12);assert.equal(sites.data.length,10);assert.equal(networks.data.length,6);assert.equal(channels.data.length,10);
 const vid=videos.data.items[0];videoId=vid.id;channelId=vid.channelId;slug=vid.slug;
 assert.ok(vid.categories.length);assert.ok(vid.performers.length);
});
test('Search autocomplete groups matching entities',async()=>{const out=await request('/api/search/suggest?q=ama');assert.ok(out.data.categories.some(c=>c.name.toLowerCase().includes('ama')));assert.ok(Array.isArray(out.data.videos))});
test('Filters, sorting and pagination work',async()=>{
 const one=await request('/api/videos?site=northlight-originals&limit=2');assert.equal(one.data.items.length,2);assert.ok(one.data.items.every(v=>v.siteSlug==='northlight-originals'));
 const paged=await request('/api/videos?limit=5&page=2&sort=most-viewed');assert.equal(paged.data.page,2);assert.equal(paged.data.items.length,5);
 const empty=await request('/api/videos?category=nonexistent');assert.equal(empty.data.total,0);
});
test('Video details include related recommendations and metadata',async()=>{const out=await request('/api/videos/'+slug);assert.equal(out.status,200);assert.ok(out.data.related.length);assert.ok(out.data.categories.length);assert.ok(out.data.networkName);assert.equal(out.data.duration,8)});
test('Related video pagination returns distinct batches',async()=>{
 const first=await request('/api/videos/'+slug+'/related?limit=6&page=1');
 const second=await request('/api/videos/'+slug+'/related?limit=6&page=2');
 assert.equal(first.status,200);assert.equal(first.data.items.length,6);assert.equal(second.data.items.length,6);
 assert.ok(first.data.items.every(v=>v.id!==videoId));
 const ids=new Set(first.data.items.map(v=>v.id));assert.ok(second.data.items.every(v=>!ids.has(v.id)));
});
test('Media asset supports HTTP byte ranges',async()=>{const res=await request('/assets/videos/sample-1.mp4',{range:'bytes=0-127'});assert.equal(res.status,206);assert.ok(res.headers.get('content-range').startsWith('bytes 0-127/'))});
test('Deep links return HTML, not 404',async()=>{const r=await request('/categories/amateur');assert.equal(r.status,200);assert.match(r.data,/<!DOCTYPE html>/)});
test('Mutations require same-origin custom header',async()=>{const r=await request('/api/auth/demo',{method:'POST',body:{},header:false});assert.equal(r.status,403)});
test('Unauthenticated library access is rejected',async()=>{const r=await request('/api/me/library');assert.equal(r.status,401)});
test('Demo sign-in creates a cookie-based session',async()=>{const r=await post('/api/auth/demo');assert.equal(r.status,201);assert.equal(r.data.user.role,'DEMO');cookie=r.headers.get('set-cookie').split(';')[0];assert.ok(cookie.startsWith('sa_session='));const me=await request('/api/auth/me',{cookie});assert.equal(me.data.user.role,'DEMO')});
test('Favorites and Watch Later persist and toggle',async()=>{
 let r=await post('/api/me/library/toggle',{type:'favorite',videoId},cookie);assert.equal(r.data.active,true);
 r=await request('/api/me/library?type=favorites',{cookie});assert.equal(r.data.items.length,1);
 r=await post('/api/me/library/toggle',{type:'favorite',videoId},cookie);assert.equal(r.data.active,false);
 r=await post('/api/me/library/toggle',{type:'watchLater',videoId},cookie);assert.equal(r.data.active,true);
 r=await request('/api/me/library?type=watch_later',{cookie});assert.equal(r.data.items.length,1);
});
test('Reactions toggle and update counters',async()=>{const before=await request('/api/videos/'+slug);let r=await post('/api/me/reaction',{videoId,type:'LIKE'},cookie);assert.equal(r.data.likes,before.data.likes+1);r=await post('/api/me/reaction',{videoId,type:'LIKE'},cookie);assert.equal(r.data.reaction,null);assert.equal(r.data.likes,before.data.likes)});
test('Subscriptions persist across requests',async()=>{let r=await post('/api/me/subscriptions/toggle',{channelId},cookie);assert.equal(r.data.active,true);r=await request('/api/me/subscriptions',{cookie});assert.equal(r.data.items.length,1)});
test('Subscription feed shows new videos from followed channels',async()=>{
 const feed=await request('/api/me/feed',{cookie});assert.equal(feed.status,200);assert.ok(feed.data.items.length>0);assert.ok(feed.data.items.every(v=>v.channelId===channelId));
});
test('Performers can be filtered by country',async()=>{
 const r=await request('/api/performers?country=US');assert.equal(r.status,200);assert.ok(r.data.length>0);assert.ok(r.data.every(x=>x.country==='US'));
});
test('Watch progress records history',async()=>{let r=await post('/api/me/progress',{videoId,position:3.5},cookie);assert.equal(r.data.ok,true);r=await request('/api/me/history',{cookie});assert.equal(r.data.items.length,1);assert.equal(r.data.items[0].progress,3.5)});
test('Watch history can be cleared',async()=>{
 const r=await request('/api/me/history',{method:'DELETE',cookie});assert.equal(r.status,200);assert.equal(r.data.removed,1);
 const after=await request('/api/me/history',{cookie});assert.equal(after.data.items.length,0);
});
test('Playlists create and accept videos',async()=>{let r=await post('/api/me/playlists',{name:'My collection'},cookie);assert.equal(r.status,201);const id=r.data.id;await post('/api/me/playlists/items',{playlistId:id,videoId},cookie);r=await request('/api/me/playlists/'+id,{cookie});assert.equal(r.data.items.length,1);assert.equal(r.data.playlist.name,'My collection')});
test('Comments and reports are stored',async()=>{let r=await post('/api/comments',{videoId,body:'Original sample media looks good'},cookie);assert.equal(r.status,201);r=await request('/api/videos/'+slug);assert.ok(r.data.comments.some(c=>c.body==='Original sample media looks good'));r=await post('/api/reports',{videoId,reason:'Incorrect metadata',details:'Test report'},cookie);assert.equal(r.status,201)});
test('Regular user cannot access admin endpoints',async()=>{const r=await request('/api/admin/overview',{cookie});assert.equal(r.status,403)});
test('Account registration rejects short passwords',async()=>{const r=await post('/api/auth/register',{name:'Example',email:'test@example.com',password:'weak'});assert.equal(r.status,400)});
test('Admin workflow can review reports and hide or restore a video',async()=>{
 const {one,run}=await import('../src/database.js');
 const u=one("SELECT id FROM users WHERE role='DEMO' ORDER BY id DESC LIMIT 1");
 run('UPDATE users SET role=? WHERE id=?','ADMIN',u.id);
 let r=await request('/api/admin/overview',{cookie});assert.equal(r.status,200);assert.ok(r.data.openReports>=1);
 r=await request('/api/admin/reports',{cookie});assert.ok(r.data.items.length>=1);
 const reportId=r.data.items[0].id;
 let c=await request('/api/admin/comments',{cookie});assert.ok(c.data.items.length>=1);
 const commentId=c.data.items[0].id;
 c=await request('/api/admin/comments/'+commentId+'/visibility',{method:'PATCH',cookie,body:{hidden:true}});assert.equal(c.data.hidden,true);
 c=await request('/api/videos/'+slug);assert.ok(!c.data.comments.some(x=>x.id===commentId));
 c=await request('/api/admin/comments/'+commentId+'/visibility',{method:'PATCH',cookie,body:{hidden:false}});assert.equal(c.data.hidden,false);
 r=await request('/api/admin/reports/'+reportId+'/status',{method:'PATCH',cookie,body:{status:'RESOLVED'}});assert.equal(r.data.status,'RESOLVED');
 r=await request('/api/admin/videos',{cookie});assert.ok(r.data.items.length>=72);
 r=await request('/api/admin/videos/'+videoId+'/status',{method:'PATCH',cookie,body:{status:'HIDDEN'}});assert.equal(r.data.status,'HIDDEN');
 r=await request('/api/videos/'+slug);assert.equal(r.status,404);
 r=await request('/api/admin/videos/'+videoId+'/status',{method:'PATCH',cookie,body:{status:'PUBLISHED'}});assert.equal(r.data.status,'PUBLISHED');
 r=await request('/api/videos/'+slug);assert.equal(r.status,200);
});
test('Site top-rated sort uses actual average ratings',async()=>{const r=await request('/api/sites?sort=top-rated');assert.equal(r.status,200);assert.ok(r.data[0].avgRating>=r.data[1].avgRating)});
test('Sign-out invalidates the session',async()=>{const r=await post('/api/auth/logout',{},cookie);assert.equal(r.status,200);const me=await request('/api/auth/me',{cookie});assert.equal(me.data.user,null)});
