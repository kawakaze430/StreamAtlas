import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'sa-checkpoint45-'));
process.env.DB_PATH=path.join(tmp,'demo.db');process.env.PRIVATE_PATH=path.join(tmp,'private');process.env.NODE_ENV='test';
const {server}=await import('../src/server.js');
const {one,run}=await import('../src/database.js');
const clip=fs.readFileSync(path.join(ROOT,'public/assets/videos/sample-1.mp4'));
let base,admin,creator,follower,job,slug;
const call=async(p,{method='GET',json,cookie,bytes,offset}={})=>{
 const headers={'X-Requested-With':'StreamAtlas'};if(cookie)headers.Cookie=cookie;
 if(json!==undefined)headers['Content-Type']='application/json';
 if(bytes){headers['Content-Type']='application/octet-stream';headers['X-Upload-Offset']=String(offset)}
 const r=await fetch(base+p,{method,headers,body:json!==undefined?JSON.stringify(json):bytes});
 const ct=r.headers.get('content-type')||'';return {code:r.status,headers:r.headers,data:ct.includes('application/json')?await r.json():ct.includes('text')?await r.text():Buffer.from(await r.arrayBuffer())};
};
const session=r=>r.headers.get('set-cookie')?.split(';')[0];
const post=(p,json,cookie)=>call(p,{method:'POST',json,cookie});
const patch=(p,json,cookie)=>call(p,{method:'PATCH',json,cookie});
before(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));base='http://127.0.0.1:'+server.address().port});
after(async()=>{await new Promise(r=>server.close(r));fs.rmSync(tmp,{recursive:true,force:true})});

test('checkpoint 04/05: schema tables and new health version',async()=>{
 assert.ok((await call('/api/health')).data.checkpoint>=6);
 for(const t of ['processing_events','auth_rate_limits','review_evidence','video_captions'])assert.ok(one('SELECT name FROM sqlite_master WHERE type=? AND name=?','table',t));
});
test('checkpoint 04/05: creator and administrator role separation',async()=>{
 creator=session(await post('/api/auth/register',{name:'Uploader Forty',email:'creator45@example.test',password:'strong-password-456'}));
 admin=session(await post('/api/auth/register',{name:'Admin Forty',email:'admin45@example.test',password:'strong-password-456'}));
 run("UPDATE users SET role='ADMIN' WHERE email='admin45@example.test'");
 assert.equal((await post('/api/studio/apply',{displayName:'Authorized Catalog Demo',agreePolicies:true},creator)).code,201);
 const id=one("SELECT id FROM users WHERE email='creator45@example.test'").id;
 assert.equal((await patch(`/api/admin/creators/${id}/decision`,{decision:'APPROVED',note:'Verified original clip sample environment'},creator)).code,403);
 assert.equal((await patch(`/api/admin/creators/${id}/decision`,{decision:'APPROVED',note:'Approved test content creator for original media'},admin)).code,200);
 const f=await post('/api/auth/register',{name:'Subscriber 45',email:'subscriber45@example.test',password:'strong-password-456'});follower=session(f);
 const channel=one('SELECT channel_id FROM creator_profiles WHERE user_id=?',id).channel_id;
 assert.equal((await post('/api/me/subscriptions/toggle',{channelId:channel},follower)).code,200);
});
test('checkpoint 04/05: captions validate, only owner can edit, HLS is private',async()=>{
 const cat=(await call('/api/categories')).data[0].id;
 const r=await post('/api/studio/uploads/initiate',{title:'Synthetic sunrise sample clip',filename:'clip.mp4',mime:'video/mp4',size:clip.length,categoryId:cat,rightsDeclaration:true,adultsDeclaration:true,consentDeclaration:true},creator);
 assert.equal(r.code,201);job=r.data.id;slug=r.data.slug;
 const vtt='WEBVTT\n\n00:00:00.000 --> 00:00:01.000\nHello world\n';
 let reply=await patch(`/api/studio/uploads/${job}/metadata`,{title:'Synthetic sunrise sample clip',description:'No identifiable persons',categoryId:cat,chapters:[],captions:'NOT VALID'},creator);assert.equal(reply.code,400);
 reply=await patch(`/api/studio/uploads/${job}/metadata`,{title:'Synthetic sunrise sample clip',description:'No identifiable persons',categoryId:cat,chapters:[],captions:vtt},admin);assert.equal(reply.code,404);
 reply=await patch(`/api/studio/uploads/${job}/metadata`,{title:'Synthetic sunrise sample clip',description:'No identifiable persons',categoryId:cat,chapters:[{start:0,title:'First scene'}],captions:vtt},creator);assert.equal(reply.code,200);
 assert.equal((await call(`/api/studio/uploads/${job}/metadata`,{cookie:creator})).data.captions,vtt);
 assert.equal((await call(`/api/media/${job}/master.m3u8`)).code,404);
 const chunk=await call(`/api/studio/uploads/${job}/chunk`,{method:'PUT',cookie:creator,bytes:clip,offset:0});assert.equal(chunk.code,200);
 assert.equal((await post(`/api/studio/uploads/${job}/finalize`,{},creator)).code,202);
 let current='QUEUED';for(let i=0;i<120;i++){await new Promise(r=>setTimeout(r,100));current=(await call(`/api/studio/uploads/${job}`,{cookie:creator})).data.status;if(current==='IN_REVIEW'||current==='FAILED')break}
 assert.equal(current,'IN_REVIEW');
 assert.ok(fs.existsSync(path.join(tmp,'private','processed',job,'hi.m3u8')));
 assert.ok(fs.existsSync(path.join(tmp,'private','processed',job,'lo.m3u8')));
 assert.ok(fs.existsSync(path.join(tmp,'private','processed',job,'r360.m3u8')),'source-aware 360p variant');
 const actualMaster=fs.readFileSync(path.join(tmp,'private','processed',job,'master.m3u8'),'utf8');assert.match(actualMaster,/r360\.m3u8/);
 const events=await call(`/api/studio/uploads/${job}/events`,{cookie:creator});assert.equal(events.code,200);assert.ok(events.data.items.some(x=>x.state==='PROCESSING'));assert.ok(events.data.items.some(x=>x.state==='IN_REVIEW'));
});
test('checkpoint 05: separate evidence references and approval gate',async()=>{
 const refs={licenseRef:'DEMO-LICENSE-REFERENCE',adulthoodRef:'DEMO-ADULTHOOD-REFERENCE',consentRef:'DEMO-CONSENT-REFERENCE'};
 const p=`/api/admin/uploads/${job}/evidence`;
 assert.equal((await call(p,{cookie:creator})).code,403);
 assert.equal((await patch(p,{licenseRef:'bad',adulthoodRef:'age',consentRef:'consent'},admin)).code,400);
 const saved=await patch(p,refs,admin);assert.equal(saved.code,200);assert.equal(saved.data.items.length,3);
 assert.equal((await call(p,{cookie:admin})).data.items.length,3);
 const response=await patch(`/api/admin/uploads/${job}/decision`,{decision:'APPROVE',note:'Original synthetic non-explicit media tested by reviewer',rightsReviewed:true,adultsReviewed:true,consentReviewed:true},admin);
 assert.equal(response.code,200);
 const v=await call(`/api/videos/${slug}`);assert.equal(v.code,200);assert.ok(v.data.hlsUrl?.endsWith('/master.m3u8'));assert.ok(v.data.captionsUrl?.endsWith('/captions.vtt'));
 const manifest=await call(`/api/media/${job}/master.m3u8`);assert.equal(manifest.code,200);assert.match(manifest.data.toString(),/lo\.m3u8/);assert.match(manifest.data.toString(),/hi\.m3u8/);
 for(const f of ['hi.m3u8','lo.m3u8']){const pl=await call(`/api/media/${job}/${f}`);assert.equal(pl.code,200);assert.match(pl.data.toString(),/EXTINF/);}
 const vtt=await call(`/api/media/${job}/captions.vtt`);assert.equal(vtt.code,200);assert.match(vtt.data,/Hello world/);
});
test('checkpoint 05: notification inbox and library export are private by user',async()=>{
 const n=await call('/api/me/notifications',{cookie:follower});assert.equal(n.code,200);assert.equal(n.data.unread,1);
 const nid=n.data.items[0].id;
 assert.equal((await call('/api/me/notifications',{cookie:creator})).data.items.length,0);
 assert.equal((await patch(`/api/me/notifications/${nid}/read`,{},creator)).code,404);
 assert.equal((await patch(`/api/me/notifications/${nid}/read`,{},follower)).code,200);
 assert.equal((await call('/api/me/notifications',{cookie:follower})).data.unread,0);
 const x=await call('/api/me/export',{cookie:follower});assert.equal(x.code,200);
 assert.equal(x.data.user.email,'subscriber45@example.test');assert.equal(x.data.subscriptions.length,1);
 assert.equal((await call('/api/me/export')).code,401);
 const jobs=await call('/api/admin/jobs',{cookie:admin});assert.equal(jobs.code,200);assert.ok(jobs.data.items.some(x=>x.id===job));
 assert.equal((await call('/api/admin/jobs',{cookie:creator})).code,403);
});
test('checkpoint 05: hiding a video revokes captions and HLS variants',async()=>{
 const id=one('SELECT video_id FROM upload_sessions WHERE id=?',job).video_id;
 assert.equal((await patch(`/api/admin/videos/${id}/status`,{status:'HIDDEN'},admin)).code,200);
 for(const file of ['master.m3u8','lo.m3u8','hi.m3u8','captions.vtt'])assert.equal((await call(`/api/media/${job}/${file}`)).code,404);
 assert.equal((await call(`/api/videos/${slug}`)).code,404);
});
