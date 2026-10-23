import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import crypto from 'node:crypto';
const scratch=fs.mkdtempSync(path.join(os.tmpdir(),'streamatlas20-'));
process.env.NODE_ENV='test';process.env.DB_PATH=path.join(scratch,'app.sqlite');process.env.PRIVATE_PATH=path.join(scratch,'private');
process.env.SA_PRIVATE_PREVIEW_REQUIRE_RECEIPT='1';process.env.SA_PRIVATE_CDN_EVALUATION='1';
const {privateKey,publicKey}=crypto.generateKeyPairSync('rsa',{modulusLength:2048,publicKeyEncoding:{type:'spki',format:'pem'},privateKeyEncoding:{type:'pkcs8',format:'pem'}});
const keyFile=path.join(scratch,'key.pem');fs.writeFileSync(keyFile,privateKey,{mode:0o600});
process.env.SA_MEDIA_SIGNING_PRIVATE_KEY_FILE=keyFile;process.env.SA_MEDIA_ORIGIN='https://media.example.test/';process.env.SA_MEDIA_KEY_PAIR_ID='K12345678901';process.env.SA_MEDIA_COOKIE_DOMAIN='example.test';
const {server}=await import('../src/server.js');
const {run,one,now,createToken,tokenHash}=await import('../src/database.js');
const {assuranceSummary,authorizePrivateMedia}=await import('../src/playback-authorization.js');
const {verifyPolicySignature}=await import('../src/cloudfront-access.js');
let base,viewer,owner,admin,uploadId='aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa';
function makeUser(role,name){let id=Number(run('INSERT INTO users(email,name,role,created_at) VALUES(?,?,?,?)',name+'@example.test',name,role,now()).lastInsertRowid);const token=createToken();run('INSERT INTO sessions(token_hash,user_id,expires_at) VALUES(?,?,?)',tokenHash(token),id,'2099-01-01T00:00:00Z');return{id,role,cookie:'sa_session='+token};}
async function http(route,{method='GET',user=null,data}={}){const r=await fetch(base+route,{method,headers:{'x-requested-with':'StreamAtlas',...(user?{cookie:user.cookie}:{}),...(data?{'content-type':'application/json'}:{})},body:data?JSON.stringify(data):undefined});let payload;try{payload=await r.json()}catch{payload={}}return {status:r.status,payload,headers:r.headers}}
before(async()=>{viewer=makeUser('MEMBER','viewer20');owner=makeUser('MEMBER','owner20');admin=makeUser('ADMIN','admin20');await new Promise(r=>server.listen(0,'127.0.0.1',r));base='http://127.0.0.1:'+server.address().port;});
after(async()=>{await new Promise(r=>server.close(r));fs.rmSync(scratch,{recursive:true,force:true})});
test('20: private catalog is denied without valid receipt; demo accounts do not bypass',async()=>{
 assert.equal((await http('/api/videos')).status,401);
 assert.equal((await http('/api/videos',{user:viewer})).status,403);
 assert.equal((await http('/api/search/suggest?q=amateur',{user:viewer})).status,403);
 const videoAsset=await fetch(base+'/assets/videos/sample-1.mp4');assert.equal(videoAsset.status,401);
 assert.equal((await http('/api/me/access-status',{user:viewer})).payload.reason,'NO_VERIFIED_RECEIPT');
 run('INSERT INTO age_assurance_receipts(user_id,provider_ref,expires_at,verified_at,status) VALUES(?,?,?,?,?)',viewer.id,'synthetic-test-only',new Date(Date.now()+600000).toISOString(),now(),'VERIFIED');
 assert.equal((await http('/api/videos',{user:viewer})).status,200);
 const status=await http('/api/me/access-status',{user:viewer});assert.equal(status.payload.eligible,true);assert.ok(!('providerRef'in status.payload));
 run('UPDATE age_assurance_receipts SET expires_at=? WHERE user_id=?',new Date(Date.now()-1000).toISOString(),viewer.id);
 assert.equal((await http('/api/videos',{user:viewer})).status,403);
 run('UPDATE age_assurance_receipts SET expires_at=?,status=? WHERE user_id=?',new Date(Date.now()+600000).toISOString(),'REVOKED',viewer.id);
 assert.equal(assuranceSummary(viewer.id).reason,'REVOKED');
 assert.equal((await http('/api/videos',{user:viewer})).status,403);
});
test('20: no CDN signing without published/reviewed media, active receipt, or valid publisher',async()=>{
 run('UPDATE age_assurance_receipts SET status=? WHERE user_id=?','VERIFIED',viewer.id);
 const videoId=1;
 run('INSERT INTO creator_profiles(user_id,display_name,status,applied_at) VALUES(?,?,?,?)',owner.id,'Licensed preview creator','APPROVED',now());
 run('INSERT INTO upload_sessions(id,user_id,video_id,original_filename,declared_type,expected_bytes,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?)',uploadId,owner.id,videoId,'sample.mp4','video/mp4',1024,'IN_REVIEW',now(),now());
 const url=`/api/private-preview/media/${uploadId}/cookies`;
 assert.equal((await http(url,{method:'POST',user:viewer})).status,404);
 const unreviewedLocal=await fetch(base+`/api/media/${uploadId}/master.m3u8`,{headers:{cookie:viewer.cookie}});assert.equal(unreviewedLocal.status,404);
 run("UPDATE upload_sessions SET status='PUBLISHED' WHERE id=?",uploadId);
 assert.equal((await http(url,{method:'POST',user:viewer})).status,403,'Incomplete evidence must deny');
 for(const kind of ['LICENSE','ADULTHOOD','CONSENT'])run('INSERT INTO review_evidence(upload_id,kind,reference,checked_by,checked_at) VALUES(?,?,?,?,?)',uploadId,kind,'test-record-1234',admin.id,now());
 const okay=await http(url,{method:'POST',user:viewer});assert.equal(okay.status,200);
 assert.match(okay.payload.manifestUrl,/^https:\/\/media\.example\.test\/media\//);
 const setCookie=okay.headers.getSetCookie();assert.equal(setCookie.length,3);
 const policy=decodeURIComponent((setCookie.find(s=>s.startsWith('CloudFront-Policy='))||'').split(';')[0].split('=')[1]);
 const signature=decodeURIComponent((setCookie.find(s=>s.startsWith('CloudFront-Signature='))||'').split(';')[0].split('=')[1]);
 assert.ok(verifyPolicySignature(policy,signature,publicKey));
 assert.ok(setCookie.every(s=>s.includes('Secure; HttpOnly')&&s.includes('Path=/media/'+uploadId)));
 run('UPDATE videos SET status=? WHERE id=?','HIDDEN',videoId);
 assert.equal((await http(url,{method:'POST',user:viewer})).status,404);

 run('UPDATE videos SET status=? WHERE id=?','PUBLISHED',videoId);
 run('INSERT INTO content_holds(video_id,reason,details,opened_by,opened_at) VALUES(?,?,?,?,?)',videoId,'CONSENT','Unresolved synthetic review case',admin.id,now());
 assert.equal((await http(url,{method:'POST',user:viewer})).status,403);
 assert.throws(()=>authorizePrivateMedia({uploadId,user:viewer}),/safety hold/);
});
test('20: private preview CDN refuses a missing session and does not expose signing key',async()=>{
 assert.equal((await http(`/api/private-preview/media/${uploadId}/cookies`,{method:'POST'})).status,401);
 const read=await http('/api/home',{user:viewer});assert.equal(read.status,200);
 assert.ok(!JSON.stringify(read.payload).includes('PRIVATE KEY'));
});
