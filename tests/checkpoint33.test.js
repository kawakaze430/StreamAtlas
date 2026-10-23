import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import crypto from 'node:crypto';
import {extraRenditions,composeMaster,encodedBandwidth,readQualityOptions} from '../src/media-ladder.js';
import {rankColdStart,evaluateScenarios,jaccard} from '../src/recommendation-eval.js';
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'sa33-test-'));
process.env.DB_PATH=path.join(temp,'qa.sqlite');process.env.PRIVATE_PATH=path.join(temp,'private');process.env.NODE_ENV='test';
const {server}=await import('../src/server.js');
const {one,run}=await import('../src/database.js');
let base,admin,member;
const request=async(url,{method='GET',data,cookie}={})=>{const headers={'X-Requested-With':'StreamAtlas'};if(cookie)headers.Cookie=cookie;if(data!==undefined)headers['Content-Type']='application/json';const r=await fetch(base+url,{method,headers,body:data===undefined?undefined:JSON.stringify(data)});return {status:r.status,headers:r.headers,body:(r.headers.get('content-type')||'').includes('json')?await r.json():await r.text()}};
before(async()=>{await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));base='http://127.0.0.1:'+server.address().port;
 const a=await request('/api/auth/register',{method:'POST',data:{email:'admin33@local.test',name:'Admin33',password:'secure-long-pass-33'}});admin=a.headers.get('set-cookie').split(';')[0];run("UPDATE users SET role='ADMIN' WHERE email=?",'admin33@local.test');
 const m=await request('/api/auth/register',{method:'POST',data:{email:'member33@local.test',name:'Member33',password:'secure-long-pass-33'}});member=m.headers.get('set-cookie').split(';')[0];
});
after(async()=>{await new Promise(r=>server.close(r));fs.rmSync(temp,{force:true,recursive:true})});
test('source-aware ladder never upscales; range limits are fail-closed',()=>{
 assert.deepEqual(extraRenditions(320,180),[]);
 assert.deepEqual(extraRenditions(640,360).map(x=>x.height),[360]);
 assert.deepEqual(extraRenditions(1920,1080).map(x=>x.height),[360,480,720,1080]);
 assert.deepEqual(extraRenditions(800,600).map(x=>x.height),[360,480]);
 assert.throws(()=>extraRenditions(8000,5000),/Invalid/);
});
test('master playlist validates all rendition paths, bandwidth and dimensions',()=>{
 const m=composeMaster([{profile:'lo',bandwidth:100000,width:320,height:180},{profile:'hi',bandwidth:500000,width:640,height:360},{profile:'r360',bandwidth:420000,width:640,height:360}]);
 assert.match(m,/r360\.m3u8/);assert.match(m,/RESOLUTION=640x360/);
 assert.throws(()=>composeMaster([{profile:'lo',bandwidth:100000,width:320,height:180},{profile:'../secrets',bandwidth:500000,width:640,height:360}]),/Invalid/);
 const f=path.join(temp,'bytes.mp4');fs.writeFileSync(f,Buffer.alloc(100000));assert.ok(encodedBandwidth(f,8)>90000);
});
test('quality options cannot derive paths from poisoned metadata',()=>{
 const id=crypto.randomUUID(),root=path.join(temp,id);fs.mkdirSync(root);
 fs.writeFileSync(path.join(root,'renditions.json'),JSON.stringify([{profile:'hi',label:'1080p'},{profile:'../../secret',label:'1080p'},{profile:'r360',label:'360p'}]));
 const q=readQualityOptions(root,id);assert.equal(q.length,2);assert.ok(q.every(x=>x.url.startsWith('/api/media/'+id+'/')));
});
test('catalog tags require admin creation and assignment, are visible only on approved unheld videos',async()=>{
 const video=one("SELECT id FROM videos WHERE status='PUBLISHED' ORDER BY id LIMIT 1");
 assert.equal((await request('/api/admin/catalog/tags',{method:'POST',data:{name:'Cinematic Light',slug:'cinematic-light'},cookie:member})).status,403);
 const created=await request('/api/admin/catalog/tags',{method:'POST',data:{name:'Cinematic Light',slug:'cinematic-light'},cookie:admin});assert.equal(created.status,201);
 assert.equal((await request('/api/admin/catalog/tags',{method:'POST',data:{name:'Repeat',slug:'cinematic-light'},cookie:admin})).status,409);
 const uri=`/api/admin/videos/${video.id}/tags`;
 assert.equal((await request(uri,{method:'PATCH',data:{slugs:['cinematic-light']},cookie:member})).status,403);
 assert.equal((await request(uri,{method:'PATCH',data:{slugs:['not-real']},cookie:admin})).status,400);
 assert.equal((await request(uri,{method:'PATCH',data:{slugs:['cinematic-light']},cookie:admin})).status,200);
 assert.equal((await request('/api/search/advanced-facets?tag=cinematic-light')).body.total,1);
 const cursor=await request('/api/search/cursor?tag=cinematic-light');assert.deepEqual(cursor.body.items.map(x=>x.id),[video.id]);
 const facet=await request('/api/search/advanced-facets');assert.equal(facet.body.facets.tags.find(x=>x.slug==='cinematic-light').count,1);
 let visible=await request('/api/catalog/tags');assert.equal(visible.body.items[0].slug,'cinematic-light');
 const actor=one("SELECT id FROM users WHERE email=?",'admin33@local.test').id;
 const hold=Number(run('INSERT INTO content_holds(video_id,reason,details,opened_by,opened_at) VALUES(?,?,?,?,?)',video.id,'COPYRIGHT','test hold',actor,new Date().toISOString()).lastInsertRowid);
 try{visible=await request('/api/catalog/tags');assert.equal(visible.body.items.length,0);assert.equal((await request('/api/search/advanced-facets?tag=cinematic-light')).body.total,0);assert.equal((await request('/api/videos?tag=cinematic-light')).body.items.length,0)}finally{run('DELETE FROM content_holds WHERE id=?',hold)}
 assert.equal((await request(uri,{method:'PATCH',data:{slugs:[]},cookie:admin})).status,200);
 assert.equal((await request('/api/catalog/tags')).body.items.length,0);
});

test('cold-start recommendation evaluation: eligibility, duplication, deterministic ranking and offline metrics',async()=>{
 const a={id:1,status:'PUBLISHED',title:'Sunrise Visual Study',views:20,channelId:1,categoryIds:[10]};
 const b={id:2,status:'PUBLISHED',title:'Sunrise Visual Essay',views:10,channelId:2,categoryIds:[10]};
 const c={id:3,status:'PUBLISHED',title:'Travel and Night',views:1000,channelId:3,categoryIds:[20]};
 const held={id:4,status:'PUBLISHED',title:'Sunrise Visual Essay',views:1e8,channelId:4,categoryIds:[10],safetyHold:true};
 const expired={id:5,status:'PUBLISHED',title:'Sunrise Visual Essay',views:1e8,channelId:5,categoryIds:[10],expiredLicense:true};
 assert.ok(jaccard(a,b)>jaccard(a,c));
 assert.deepEqual(rankColdStart(a,[b,b,c,held,expired],{k:3}).map(x=>x.id),[2,3]);
 const e=evaluateScenarios([{seed:a,relevant:[2]}],[b,b,c,held,expired],{k:3});
 assert.equal(e.offlineOnly,true);assert.equal(e.meanRecallAtK,1);assert.equal(e.meanNdcgAtK,1);
 assert.equal((await request('/api/admin/recommendations/cold-start-evaluation',{cookie:member})).status,403);
 const r=await request('/api/admin/recommendations/cold-start-evaluation',{cookie:admin});assert.equal(r.status,200);assert.equal(r.body.offlineOnly,true);
});
