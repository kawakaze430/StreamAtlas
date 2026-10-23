import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
const root=path.resolve(import.meta.dirname,'..'),tmp=fs.mkdtempSync(path.join(os.tmpdir(),'sa-cp18-'));
process.env.DB_PATH=path.join(tmp,'runtime.sqlite');process.env.PRIVATE_PATH=path.join(tmp,'private');process.env.NODE_ENV='test';
const {server}=await import('../src/server.js');const {run,one,now,createToken,tokenHash}=await import('../src/database.js');
let base,adminCookie;
before(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));base='http://127.0.0.1:'+server.address().port;
 const id=run('INSERT INTO users(email,password_hash,name,role,created_at) VALUES(?,?,?,?,?)','testcp18@local.example','not-real-password','Ops Admin','ADMIN',now()).lastInsertRowid;
 const token=createToken();run('INSERT INTO sessions(token_hash,user_id,expires_at) VALUES(?,?,?)',tokenHash(token),id,'2099-01-01T00:00:00.000Z');adminCookie='sa_session='+token;
});
after(async()=>{await new Promise(resolve=>server.close(resolve));fs.rmSync(tmp,{recursive:true,force:true})});
async function get(endpoint,{method='GET',data,cookie=adminCookie}={}){
 const headers={'X-Requested-With':'StreamAtlas','Cookie':cookie};if(data!==undefined)headers['Content-Type']='application/json';
 const r=await fetch(base+endpoint,{method,headers,body:data!==undefined?JSON.stringify(data):undefined});
 return {status:r.status,body:await r.json().catch(()=>null)};
}
test('Checkpoint 18 health includes storage/db status, only admins may read operations',async()=>{
 const ready=await get('/api/ready');assert.equal(ready.status,200);assert.equal(ready.body.version,JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8')).version);assert.equal(ready.body.storageOk,true);
 const ops=await get('/api/admin/operations');assert.equal(ops.status,200);assert.equal(ops.body.databaseOk,true);assert.equal(typeof ops.body.queued,'number');assert.ok(!('owner' in ops.body));
 const no=await get('/api/admin/operations',{cookie:''});assert.equal(no.status,401);
});
test('Takedown hold blocks re-publication and records closure without automatic restoration',async()=>{
 const id=1, slug=one('SELECT slug FROM videos WHERE id=?',id).slug;
 let result=await get(`/api/admin/videos/${id}/hold`,{method:'POST',cookie:'',data:{reason:'CONSENT',details:'Example human review is pending'}});assert.equal(result.status,401);
 result=await get(`/api/admin/videos/${id}/hold`,{method:'POST',data:{reason:'CONSENT',details:'Evidence pending verification'}});assert.equal(result.status,201);
 assert.equal(one('SELECT status FROM videos WHERE id=?',id).status,'HIDDEN');
 result=await get('/api/videos/'+slug);assert.equal(result.status,404);
 result=await get(`/api/admin/videos/${id}/hold`,{method:'POST',data:{reason:'OTHER',details:'A second emergency hold'}});assert.equal(result.status,409);
 result=await get(`/api/admin/videos/${id}/status`,{method:'PATCH',data:{status:'PUBLISHED'}});assert.equal(result.status,409);
 const cases=await get('/api/admin/holds');assert.equal(cases.status,200);assert.ok(cases.body.items[0].reason==='CONSENT');
 const caseId=cases.body.items[0].id;
 result=await get(`/api/admin/holds/${caseId}/close`,{method:'PATCH',data:{note:'short'}});assert.equal(result.status,400);
 result=await get(`/api/admin/holds/${caseId}/close`,{method:'PATCH',data:{note:'Verification case disposition documented'}});assert.equal(result.status,200);
 assert.equal(one('SELECT status FROM videos WHERE id=?',id).status,'HIDDEN');
 result=await get(`/api/admin/videos/${id}/status`,{method:'PATCH',data:{status:'PUBLISHED'}});assert.equal(result.status,200);
 assert.equal((await get('/api/videos/'+slug)).status,200);
});
test('Static malformed URL receives client error, not internal error',async()=>{
 const r=await fetch(base+'/%ZZ');assert.equal(r.status,400);
});
test('Approved media staging has SHA integrity and blocks tampering and private clips',()=>{
 const id='cccccccc-cccc-4ccc-8ccc-cccccccccccc';
 run('INSERT INTO upload_sessions(id,user_id,video_id,original_filename,declared_type,expected_bytes,created_at,updated_at,status) VALUES(?,?,?,?,?,?,?,?,?)',id,one('SELECT id FROM users WHERE role=?','ADMIN').id,2,'synthetic.mp4','video/mp4',5,now(),now(),'PUBLISHED');
 const folder=path.join(tmp,'private','processed',id);fs.mkdirSync(folder,{recursive:true});
 for(const file of ['master.m3u8','hi.m3u8','lo.m3u8','playback.mp4','low.mp4','poster.jpg','hi_seg_000.ts','lo_seg_000.ts'])fs.writeFileSync(path.join(folder,file),'synthetic:'+file);
 const staged=path.join(tmp,'staging');const env={...process.env,DB_PATH:process.env.DB_PATH,PRIVATE_PATH:process.env.PRIVATE_PATH};
 const prepare=spawnSync(process.execPath,['scripts/prepare-media-export.js',staged],{cwd:root,env,encoding:'utf8'});
 assert.equal(prepare.status,0,prepare.stderr);let manifest=JSON.parse(fs.readFileSync(path.join(staged,'manifest.json')));
 assert.equal(manifest.videos,1);assert.equal(manifest.files,8);assert.equal(manifest.assets[0].videoId,2);
 const verify=spawnSync(process.execPath,['scripts/verify-media-export.js',staged],{cwd:root,env,encoding:'utf8'});
 assert.equal(verify.status,0,verify.stderr);
 fs.appendFileSync(path.join(staged,'media',id,'hi_seg_000.ts'),'tamper');
 const check=spawnSync(process.execPath,['scripts/verify-media-export.js',staged],{cwd:root,env,encoding:'utf8'});
 assert.notEqual(check.status,0);assert.match(check.stderr,/mismatch/i);
});
test('Public-launch preflight fails closed and reports outstanding review gates',()=>{
 const out=spawnSync(process.execPath,['scripts/launch-preflight.js'],{cwd:root,encoding:'utf8'});
 assert.equal(out.status,1);const report=JSON.parse(out.stdout);assert.equal(report.publicLaunchReady,false);assert.ok(report.outstanding>=7);
});
