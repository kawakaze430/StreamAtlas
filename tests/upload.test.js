import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'sa-upload-'));
process.env.DB_PATH=path.join(tmp,'unit.db');
process.env.PRIVATE_PATH=path.join(tmp,'private');
process.env.NODE_ENV='test';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const {server}=await import('../src/server.js');
const {run,one}=await import('../src/database.js');
let base,adminCookie,creatorCookie,createdId,clipSlug,videoId;
const fixture=fs.readFileSync(path.join(ROOT,'public/assets/videos/sample-1.mp4'));
const request=async(p,{method='GET',cookie,json,bytes,offset,headers={}}={})=>{
 const hs={'X-Requested-With':'StreamAtlas',...headers};if(cookie)hs.Cookie=cookie;
 if(json!==undefined)hs['Content-Type']='application/json';
 if(bytes)Object.assign(hs,{'Content-Type':'application/octet-stream','X-Upload-Offset':String(offset)});
 const resp=await fetch(base+p,{method,headers:hs,body:json!==undefined?JSON.stringify(json):bytes||undefined});
 const contentType=resp.headers.get('content-type')||'';
 const data=contentType.includes('json')?await resp.json():Buffer.from(await resp.arrayBuffer());
 return {status:resp.status,headers:resp.headers,data};
};
const post=(p,json={},cookie)=>request(p,{method:'POST',json,cookie});
const patch=(p,json,cookie)=>request(p,{method:'PATCH',json,cookie});
const cookieOf=r=>r.headers.get('set-cookie')?.split(';')[0];
before(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));base=`http://127.0.0.1:${server.address().port}`});
after(async()=>{await new Promise(r=>server.close(r));fs.rmSync(tmp,{recursive:true,force:true})});

test('creator application requires a registered user and explicit policy acknowledgment',async()=>{
 let x=await post('/api/studio/apply',{displayName:'My Channel',agreePolicies:true});assert.equal(x.status,401);
 const demo=await post('/api/auth/demo');x=await post('/api/studio/apply',{displayName:'Demo',agreePolicies:true},cookieOf(demo));assert.equal(x.status,403);
 const c=await post('/api/auth/register',{name:'Test Creator',email:'creator@example.test',password:'creator-password-123'});creatorCookie=cookieOf(c);
 const admin=await post('/api/auth/register',{name:'QA Reviewer',email:'reviewer@example.test',password:'reviewer-password-123'});adminCookie=cookieOf(admin);
 run("UPDATE users SET role='ADMIN' WHERE email='reviewer@example.test'");
 x=await post('/api/studio/apply',{displayName:'An Original Channel',agreePolicies:true},creatorCookie);assert.equal(x.status,201);
 x=await post('/api/studio/apply',{displayName:'Another Channel',agreePolicies:true},creatorCookie);assert.equal(x.status,409);
});
test('creator approval needs an admin, and provisions an independent channel',async()=>{
 const apps=await request('/api/admin/creators',{cookie:adminCookie});assert.equal(apps.status,200);
 const app=apps.data.items.find(x=>x.display_name==='An Original Channel');assert.ok(app);
 let r=await patch(`/api/admin/creators/${app.user_id}/decision`,{decision:'APPROVED'},creatorCookie);assert.equal(r.status,403);
 r=await patch(`/api/admin/creators/${app.user_id}/decision`,{decision:'APPROVED',note:'Approved for local tests only'},adminCookie);assert.equal(r.status,200);
 const studio=await request('/api/studio/overview',{cookie:creatorCookie});assert.equal(studio.data.creator.status,'APPROVED');assert.ok(studio.data.creator.channel_id);
});
test('upload initiation validates rights declarations and file metadata',async()=>{
 const categories=await request('/api/categories');const categoryId=categories.data[0].id;
 const b={title:'Original sample upload one',filename:'self-owned-demo.mp4',size:fixture.length,mime:'video/mp4',categoryId,rightsDeclaration:true,adultsDeclaration:true,consentDeclaration:true};
 let out=await post('/api/studio/uploads/initiate',{...b,consentDeclaration:false},creatorCookie);assert.equal(out.status,400);
 out=await post('/api/studio/uploads/initiate',{...b,size:26*1024*1024},creatorCookie);assert.equal(out.status,413);
 out=await post('/api/studio/uploads/initiate',b,creatorCookie);assert.equal(out.status,201);createdId=out.data.id;clipSlug=out.data.slug;videoId=out.data.videoId;
 assert.equal((await request('/api/videos/'+clipSlug)).status,404);
 assert.equal((await request(`/api/media/${createdId}/playback.mp4`)).status,404);
 assert.equal((await request(`/api/media/${createdId}/preview_0.jpg`)).status,404);
 assert.equal((await request('/api/studio/overview')).status,401);
});
test('resumable chunks enforce ownership, offsets and size',async()=>{
 let r=await request(`/api/studio/uploads/${createdId}/chunk`,{method:'PUT',cookie:adminCookie,bytes:fixture.subarray(0,4096),offset:0});assert.equal(r.status,404);
 r=await request(`/api/studio/uploads/${createdId}/chunk`,{method:'PUT',cookie:creatorCookie,bytes:fixture.subarray(0,4096),offset:1});assert.equal(r.status,409);
 r=await request(`/api/studio/uploads/${createdId}/chunk`,{method:'PUT',cookie:creatorCookie,bytes:fixture.subarray(0,4096),offset:0});assert.equal(r.status,200);assert.equal(r.data.receivedBytes,4096);
 r=await request(`/api/studio/uploads/${createdId}/chunk`,{method:'PUT',cookie:creatorCookie,bytes:fixture.subarray(0,4096),offset:0});assert.equal(r.status,200);assert.equal(r.data.idempotent,true);assert.equal(r.data.receivedBytes,4096);
 r=await request(`/api/studio/uploads/${createdId}/chunk`,{method:'PUT',cookie:creatorCookie,bytes:Buffer.alloc(4096,0xAA),offset:0});assert.equal(r.status,409);
 const partFile=path.join(tmp,'private','uploads',createdId+'.part');
 fs.appendFileSync(partFile,fixture.subarray(4096,4160)); // Simulate crash after spool write, before SQL commit.
 r=await request(`/api/studio/uploads/${createdId}/chunk`,{method:'PUT',cookie:creatorCookie,bytes:Buffer.alloc(128,0xBB),offset:4096});assert.equal(r.status,409);
 assert.equal(one('SELECT received_bytes AS n FROM upload_sessions WHERE id=?',createdId).n,4096);
 assert.equal(fs.statSync(partFile).size,4160);
 r=await post(`/api/studio/uploads/${createdId}/finalize`,{},creatorCookie);assert.equal(r.status,409);
 r=await request(`/api/studio/uploads/${createdId}/chunk`,{method:'PUT',cookie:creatorCookie,bytes:fixture.subarray(4096),offset:4096});assert.equal(r.status,200);assert.equal(r.data.complete,true);assert.equal(r.data.recoveredBytes,64);
 assert.equal(fs.readFileSync(partFile).equals(fixture),true);
 r=await request(`/api/studio/uploads/${createdId}/chunk`,{method:'PUT',cookie:creatorCookie,bytes:fixture.subarray(4096),offset:4096});assert.equal(r.status,200);assert.equal(r.data.idempotent,true);
});
test('finalized upload goes through FFmpeg processing, private HLS, and review',async()=>{
 const [attemptA,attemptB]=await Promise.all([post(`/api/studio/uploads/${createdId}/finalize`,{},creatorCookie),post(`/api/studio/uploads/${createdId}/finalize`,{},creatorCookie)]);
 assert.deepEqual([attemptA.status,attemptB.status].sort(),[202,409]);
 const out=attemptA.status===202?attemptA:attemptB;assert.match(out.data.sha256,/^[a-f0-9]{64}$/);
 let job;for(let i=0;i<100;i++){
  await new Promise(r=>setTimeout(r,90));job=(await request('/api/studio/overview',{cookie:creatorCookie})).data.items.find(x=>x.id===createdId);
  if(['IN_REVIEW','FAILED'].includes(job?.status))break;
 }
 assert.equal(job?.status,'IN_REVIEW',`Media processing error: ${job?.error}`);
 assert.ok(fs.existsSync(path.join(tmp,'private','processed',createdId,'master.m3u8')));
 assert.ok(fs.existsSync(path.join(tmp,'private','processed',createdId,'poster.jpg')));
 for(let i=0;i<4;i++)assert.ok(fs.existsSync(path.join(tmp,'private','processed',createdId,`preview_${i}.jpg`)));
 assert.equal((await request(`/api/media/${createdId}/preview_0.jpg`)).status,404);
 assert.equal((await request(`/api/media/${createdId}/master.m3u8`)).status,404);
 const ownerPreview=await request(`/api/studio/uploads/${createdId}/preview/preview_2.jpg`,{cookie:creatorCookie});assert.equal(ownerPreview.status,200);assert.ok(ownerPreview.data.length>500);
 assert.equal((await request(`/api/studio/uploads/${createdId}/preview/preview_2.jpg`,{cookie:adminCookie})).status,404);
 let posterChoice=await patch(`/api/studio/uploads/${createdId}/poster`,{frame:2},creatorCookie);assert.equal(posterChoice.status,200);assert.equal(posterChoice.data.selectedPoster,'preview_2.jpg');
 const categoryId=(await request('/api/categories')).data[0].id;
 const captionVtt='WEBVTT\n\n00:00:00.000 --> 00:00:01.000\nSample scene for caption accessibility.\n';
 const revised=await patch(`/api/studio/uploads/${createdId}/metadata`,{title:'Original sample with reviewed chapters',description:'A non-explicit synthetic sample for accessibility.',categoryId,chapters:[{start:0,title:'Opening demonstration'}],captions:captionVtt},creatorCookie);
 assert.equal(revised.status,200);assert.deepEqual(revised.data.chapters,[{start:0,title:'Opening demonstration'}]);
 assert.equal((await request(`/api/studio/uploads/${createdId}/metadata`,{cookie:adminCookie})).status,404);
 assert.equal((await request(`/api/studio/uploads/${createdId}/metadata`,{cookie:creatorCookie})).data.captions,captionVtt);

 assert.equal((await request(`/api/admin/uploads/${createdId}/preview/playback.mp4`,{cookie:creatorCookie})).status,403);
 assert.equal((await request(`/api/admin/uploads/${createdId}/preview/playback.mp4`)).status,401);
 const privatePreview=await request(`/api/admin/uploads/${createdId}/preview/playback.mp4`,{cookie:adminCookie,headers:{Range:'bytes=0-127'}});assert.equal(privatePreview.status,206);assert.equal(privatePreview.data.byteLength,128);
 assert.equal((await request('/api/videos/'+clipSlug)).status,404);
});
test('review requires evidence acknowledgments and cannot be bypassed through legacy status endpoint',async()=>{
 let r=await patch(`/api/admin/videos/${videoId}/status`,{status:'PUBLISHED'},adminCookie);assert.equal(r.status,409);
 r=await patch(`/api/admin/uploads/${createdId}/decision`,{decision:'APPROVE',note:'Evidence reviewed carefully'},adminCookie);assert.equal(r.status,400);
 r=await patch(`/api/admin/uploads/${createdId}/decision`,{decision:'APPROVE',note:'Evidence reviewed carefully',rightsReviewed:true,adultsReviewed:true,consentReviewed:true},creatorCookie);assert.equal(r.status,403);
 r=await patch(`/api/admin/uploads/${createdId}/decision`,{decision:'APPROVE',note:'Local test sample reviewed, original generated media',rightsReviewed:true,adultsReviewed:true,consentReviewed:true},adminCookie);assert.equal(r.status,200);
 assert.equal(r.data.status,'PUBLISHED');
 r=await request('/api/videos/'+clipSlug);assert.equal(r.status,200);assert.deepEqual(r.data.chapters.map(c=>c.title),['Opening demonstration']);assert.equal(r.data.captionTracks?.[0]?.srclang,'en');assert.equal(r.data.poster,`/api/media/${createdId}/preview_2.jpg`);
 assert.equal((await patch(`/api/studio/uploads/${createdId}/poster`,{frame:1},creatorCookie)).status,409);assert.equal(r.data.mediaUrl,`/api/media/${createdId}/playback.mp4`);
 r=await request(`/api/media/${createdId}/master.m3u8`);assert.equal(r.status,200);assert.match(r.data.toString(),/#EXTM3U/);
 r=await request(`/api/media/${createdId}/preview_0.jpg`);assert.equal(r.status,200);assert.match(r.headers.get('content-type'),/image\/jpeg/);
 r=await request(`/api/media/${createdId}/playback.mp4`,{headers:{range:'bytes=0-127'}});assert.equal(r.status,206);assert.equal(r.data.byteLength,128);
 const log=await request('/api/admin/audit',{cookie:adminCookie});assert.ok(log.data.items.some(x=>x.action==='APPROVE'));
});
test('moderator hide makes new streams immediately unavailable',async()=>{
 let r=await patch(`/api/admin/videos/${videoId}/status`,{status:'HIDDEN'},adminCookie);assert.equal(r.status,200);
 assert.equal((await request(`/api/media/${createdId}/playback.mp4`)).status,404);
 assert.equal((await request(`/api/media/${createdId}/preview_0.jpg`)).status,404);
 assert.equal((await request('/api/videos/'+clipSlug)).status,404);
 r=await patch(`/api/admin/videos/${videoId}/status`,{status:'PUBLISHED'},adminCookie);assert.equal(r.status,200);
 assert.equal((await request(`/api/media/${createdId}/poster.jpg`)).status,200);
});
test('invalid media upload fails safely and does not become public',async()=>{
 const cats=await request('/api/categories');const bogus=Buffer.alloc(1500,0x31);
 const b={title:'Bogus test file sample',filename:'broken.mp4',size:bogus.length,mime:'video/mp4',categoryId:cats.data[0].id,rightsDeclaration:true,adultsDeclaration:true,consentDeclaration:true};
 let r=await post('/api/studio/uploads/initiate',b,creatorCookie);assert.equal(r.status,201);const badId=r.data.id,badSlug=r.data.slug;
 r=await request(`/api/studio/uploads/${badId}/chunk`,{method:'PUT',cookie:creatorCookie,bytes:bogus,offset:0});assert.equal(r.status,200);
 r=await post(`/api/studio/uploads/${badId}/finalize`,{},creatorCookie);assert.equal(r.status,202);
 let status;for(let i=0;i<80;i++){await new Promise(r=>setTimeout(r,80));status=(await request('/api/studio/overview',{cookie:creatorCookie})).data.items.find(x=>x.id===badId).status;if(status==='FAILED')break}
 assert.equal(status,'FAILED');assert.equal((await request('/api/videos/'+badSlug)).status,404);
 let retry=await post(`/api/studio/uploads/${badId}/retry`,{},creatorCookie);assert.equal(retry.status,202);
 for(let i=0;i<80;i++){await new Promise(r=>setTimeout(r,80));status=(await request('/api/studio/overview',{cookie:creatorCookie})).data.items.find(x=>x.id===badId).status;if(status==='FAILED')break}
 assert.equal(status,'FAILED');retry=await post(`/api/studio/uploads/${badId}/retry`,{},creatorCookie);assert.equal(retry.status,409);
 assert.equal((await patch(`/api/admin/uploads/${badId}/decision`,{decision:'APPROVE',note:'This should fail',rightsReviewed:true,adultsReviewed:true,consentReviewed:true},adminCookie)).status,409);
});

test('failed upload can be cancelled and its files removed',async()=>{
 const list=(await request('/api/studio/overview',{cookie:creatorCookie})).data.items;
 const bad=list.find(x=>x.status==='FAILED');assert.ok(bad);
 assert.equal((await request(`/api/studio/uploads/${bad.id}`,{cookie:adminCookie})).status,404);
 assert.equal((await request(`/api/studio/uploads/${bad.id}`,{cookie:creatorCookie})).status,200);
 const result=await request(`/api/studio/uploads/${bad.id}`,{method:'DELETE',cookie:creatorCookie});assert.equal(result.status,200);
 assert.equal((await request(`/api/studio/uploads/${bad.id}`,{cookie:creatorCookie})).data.status,'CANCELLED');
 assert.equal(fs.existsSync(path.join(tmp,'private','uploads',bad.id+'.part')),false);
 assert.equal((await request(`/api/media/${bad.id}/playback.mp4`)).status,404);
});
