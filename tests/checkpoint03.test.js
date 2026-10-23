import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'sa-checkpoint03-'));
process.env.DB_PATH=path.join(tmp,'database.db');
process.env.PRIVATE_PATH=path.join(tmp,'media');
process.env.NODE_ENV='test';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const {server}=await import('../src/server.js');
const {run,one}=await import('../src/database.js');
const fixture=fs.readFileSync(path.join(ROOT,'public/assets/videos/sample-1.mp4'));
let base,admin,creator,other,job,slug,videoId,categoryId;
async function request(p,{method='GET',cookie,json,bytes,offset,headers={}}={}){
 const hs={'X-Requested-With':'StreamAtlas',...headers};if(cookie)hs.Cookie=cookie;
 if(json!==undefined)hs['Content-Type']='application/json';
 if(bytes){hs['Content-Type']='application/octet-stream';hs['X-Upload-Offset']=String(offset)}
 const res=await fetch(base+p,{method,headers:hs,body:json!==undefined?JSON.stringify(json):bytes});
 const ct=res.headers.get('content-type')||'';return {status:res.status,headers:res.headers,data:ct.includes('json')?await res.json():Buffer.from(await res.arrayBuffer())};
}
const post=(p,json,cookie)=>request(p,{method:'POST',json,cookie});
const patch=(p,json,cookie)=>request(p,{method:'PATCH',json,cookie});
const session=r=>r.headers.get('set-cookie')?.split(';')[0];
before(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));base=`http://127.0.0.1:${server.address().port}`});
after(async()=>{await new Promise(r=>server.close(r));fs.rmSync(tmp,{recursive:true,force:true})});

test('checkpoint 03: schema migrates and health version increments',async()=>{
 assert.ok((await request('/api/health')).data.checkpoint>=6);
 assert.ok(one("SELECT name FROM sqlite_master WHERE type='table' AND name='video_chapters'"));
});
test('checkpoint 03: creator approval needs note, creator is restricted to own uploads',async()=>{
 const c=await post('/api/auth/register',{name:'Creator Three',email:'c3@example.test',password:'long-password-123'});creator=session(c);
 const a=await post('/api/auth/register',{name:'Admin Three',email:'a3@example.test',password:'long-password-123'});admin=session(a);run("UPDATE users SET role='ADMIN' WHERE email='a3@example.test'");
 const o=await post('/api/auth/register',{name:'Stranger Three',email:'o3@example.test',password:'long-password-123'});other=session(o);
 assert.equal((await post('/api/studio/apply',{displayName:'Original Creator Three',agreePolicies:true},creator)).status,201);
 const uid=one("SELECT id FROM users WHERE email='c3@example.test'").id;
 assert.equal((await patch(`/api/admin/creators/${uid}/decision`,{decision:'APPROVED',note:'short'},admin)).status,400);
 assert.equal((await patch(`/api/admin/creators/${uid}/decision`,{decision:'APPROVED',note:'Approved sample uploader for local testing'},admin)).status,200);
 categoryId=(await request('/api/categories')).data[0].id;
 const create=await post('/api/studio/uploads/initiate',{title:'Authorized demo three video',filename:'original.mp4',mime:'video/mp4',size:fixture.length,categoryId,rightsDeclaration:true,adultsDeclaration:true,consentDeclaration:true},creator);
 assert.equal(create.status,201);job=create.data.id;videoId=create.data.videoId;slug=create.data.slug;
 assert.equal((await request(`/api/studio/uploads/${job}/metadata`,{cookie:other})).status,404);
 assert.equal((await request('/api/studio/analytics',{cookie:other})).status,403);
});
test('checkpoint 03: editable metadata with validated ordered chapters',async()=>{
 const endpoint=`/api/studio/uploads/${job}/metadata`;
 let r=await patch(endpoint,{title:'Updated sample three video',description:'Original non-explicit sample',categoryId,chapters:[{start:2,title:'Later'},{start:1,title:'Earlier'}]},creator);
 assert.equal(r.status,400);
 r=await patch(endpoint,{title:'Updated sample three video',description:'Original non-explicit sample',categoryId,chapters:[{start:0,title:'Opening'},{start:1,title:'Second scene'}]},other);assert.equal(r.status,404);
 r=await patch(endpoint,{title:'Updated sample three video',description:'Original non-explicit sample',categoryId,chapters:[{start:0,title:'Opening'},{start:1,title:'Second scene'}]},creator);assert.equal(r.status,200);
 r=await request(endpoint,{cookie:creator});assert.equal(r.data.title,'Updated sample three video');assert.equal(r.data.chapters.length,2);
 assert.equal((await request('/api/videos/'+slug)).status,404);
});
test('checkpoint 03: low-bitrate rendition is private and then public after moderation',async()=>{
 let r=await request(`/api/studio/uploads/${job}/chunk`,{method:'PUT',bytes:fixture,offset:0,cookie:creator});assert.equal(r.status,200);
 assert.equal((await post(`/api/studio/uploads/${job}/finalize`,{},creator)).status,202);
 let status='';for(let i=0;i<300;i++){await new Promise(r=>setTimeout(r,100));status=(await request(`/api/studio/uploads/${job}`,{cookie:creator})).data.status;if(['IN_REVIEW','FAILED'].includes(status))break}
 assert.equal(status,'IN_REVIEW');assert.ok(fs.existsSync(path.join(tmp,'media','processed',job,'low.mp4')));
 assert.equal((await request(`/api/media/${job}/low.mp4`)).status,404);
 const analytics=await request('/api/studio/analytics',{cookie:creator});assert.equal(analytics.status,200);assert.equal(analytics.data.summary.totalUploads,1);assert.equal(analytics.data.summary.awaitingReview,1);
 const decision=await patch(`/api/admin/uploads/${job}/decision`,{decision:'APPROVE',note:'Non-explicit original test video documentation checked',rightsReviewed:true,adultsReviewed:true,consentReviewed:true},admin);
 assert.equal(decision.status,200);
 const details=await request('/api/videos/'+slug);assert.equal(details.status,200);assert.equal(details.data.chapters.length,2);assert.ok(details.data.qualityOptions.length>=2);assert.ok(details.data.qualityOptions.some(x=>x.label==='360p')); 
 r=await request(`/api/media/${job}/low.mp4`,{headers:{Range:'bytes=0-127'}});assert.equal(r.status,206);assert.equal(r.data.length,128);
});
test('checkpoint 03: repeated view reporting is throttled and hidden assets are excluded from playlist and comments',async()=>{
 let r=await post('/api/videos/view',{videoId},creator);assert.equal(r.status,200);assert.equal(r.data.counted,true);
 r=await post('/api/videos/view',{videoId},creator);assert.equal(r.status,200);assert.equal(r.data.counted,false);
 const playlist=await post('/api/me/playlists',{name:'Only public videos'},creator);assert.equal(playlist.status,201);
 await post('/api/me/playlists/items',{playlistId:playlist.data.id,videoId},creator);
 assert.equal((await patch(`/api/admin/videos/${videoId}/status`,{status:'HIDDEN'},admin)).status,200);
 assert.equal((await request(`/api/media/${job}/low.mp4`)).status,404);
 assert.equal((await request('/api/me/playlists/'+playlist.data.id,{cookie:creator})).data.items.length,0);
 assert.equal((await post('/api/comments',{videoId,body:'Should not reach hidden video'},creator)).status,400);
 assert.equal((await post('/api/me/progress',{videoId,position:1},creator)).status,404);
});
test('checkpoint 03: suspension and reinstatement do not automatically republish hidden videos',async()=>{
 const uid=one("SELECT id FROM users WHERE email='c3@example.test'").id;
 let r=await patch(`/api/admin/creators/${uid}/decision`,{decision:'SUSPENDED',note:'Temporarily suspended for local test'},admin);
 assert.equal(r.status,200);
 assert.equal((await request('/api/studio/analytics',{cookie:creator})).data.profileStatus,'SUSPENDED');
 r=await patch(`/api/admin/creators/${uid}/decision`,{decision:'REINSTATED',note:'Reinstated after original sample checks'},creator);assert.equal(r.status,403);
 r=await patch(`/api/admin/creators/${uid}/decision`,{decision:'REINSTATED',note:'Reinstated after original sample checks'},admin);assert.equal(r.status,200);
 assert.equal(one('SELECT status FROM videos WHERE id=?',videoId).status,'HIDDEN');
 r=await patch(`/api/admin/creators/${uid}/decision`,{decision:'REINSTATED',note:'Repeat action not permitted'},admin);assert.equal(r.status,409);
 r=await patch(`/api/admin/videos/${videoId}/status`,{status:'PUBLISHED'},admin);assert.equal(r.status,200);
 const history=(await request('/api/admin/audit',{cookie:admin})).data.items;
 assert.ok(history.some(e=>e.action==='SUSPENDED'));assert.ok(history.some(e=>e.action==='REINSTATED'));
});
