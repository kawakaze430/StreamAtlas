import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import fs from 'node:fs';import path from 'node:path';import os from 'node:os';import crypto from 'node:crypto';
const baseRoot=path.resolve(import.meta.dirname,'..');const temp=fs.mkdtempSync(path.join(os.tmpdir(),'streamatlas19-'));
process.env.DB_PATH=path.join(temp,'db.sqlite');process.env.PRIVATE_PATH=path.join(temp,'private');process.env.NODE_ENV='test';
process.env.SA_VERIFICATION_WEBHOOK_SECRET='webhook-'+crypto.randomBytes(32).toString('hex');
process.env.SA_METRICS_TOKEN='metrics-'+crypto.randomBytes(32).toString('hex');
const {server}=await import('../src/server.js');
const {one,run,now,createToken,tokenHash}=await import('../src/database.js');
const {hexHmac}=await import('../src/verification-integration.js');
const {signedMediaCookies,verifyPolicySignature}=await import('../src/cloudfront-access.js');
let base,admin,userA,userB,userAId,userBId;
function signIn(role,label){const id=Number(run('INSERT INTO users(email,name,role,created_at) VALUES(?,?,?,?)',label+'@example.test',label,role,now()).lastInsertRowid);
const token=createToken();run('INSERT INTO sessions(token_hash,user_id,expires_at) VALUES(?,?,?)',tokenHash(token),id,'2099-01-01T00:00:00Z');return {id,cookie:'sa_session='+token};}
async function req(uri,method='GET',body,user=userA){const result=await fetch(base+uri,{method,headers:{cookie:user?.cookie||'',...(body?{'content-type':'application/json'}:{}),'x-requested-with':'StreamAtlas'},body:body?JSON.stringify(body):undefined});return {status:result.status,data:await result.json()}}
before(async()=>{await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));base='http://127.0.0.1:'+server.address().port;
admin=signIn('ADMIN','caseadmin19');userA=signIn('MEMBER','casea19');userB=signIn('MEMBER','caseb19');userAId=userA.id;userBId=userB.id;});
after(async()=>{await new Promise(resolve=>server.close(resolve));fs.rmSync(temp,{recursive:true,force:true})});
test('19: public formal case filing is authenticated, scoped and urgency ranked',async()=>{
 assert.equal((await req('/api/compliance/cases','POST',{videoId:1,category:'AGE',details:'A detailed concern requiring reviewer assessment.'},null)).status,401);
 const submitted=await req('/api/compliance/cases','POST',{videoId:1,category:'CONSENT',details:'A detailed concern requiring a licensed reviewer to investigate.'});
 assert.equal(submitted.status,201);assert.equal(submitted.data.priority,'URGENT');globalThis._caseId=submitted.data.id;
 const a=await req('/api/me/compliance/cases');assert.equal(a.data.items.length,1);
 const b=await req('/api/me/compliance/cases','GET',undefined,userB);assert.equal(b.data.items.length,0);
 assert.equal((await req('/api/admin/compliance/cases')).status,403);
 assert.equal((await req('/api/admin/compliance/cases','GET',undefined,admin)).data.items[0].id,submitted.data.id);
 assert.equal(one('SELECT status FROM videos WHERE id=1').status,'PUBLISHED','case filing must not be automatic removal');
});
test('19: decisions require review rationale and preserve media visibility',async()=>{
 const id=globalThis._caseId;
 let x=await req(`/api/admin/compliance/cases/${id}/decision`,'PATCH',{status:'RESOLVED',note:'small'},admin);assert.equal(x.status,400);
 x=await req(`/api/admin/compliance/cases/${id}/decision`,'PATCH',{status:'IN_REVIEW',note:'Investigation assigned for documentary review'},admin);assert.equal(x.status,200);
 x=await req(`/api/admin/compliance/cases/${id}/decision`,'PATCH',{status:'RESOLVED',note:'Content status considered separately from case resolution'},admin);assert.equal(x.status,200);
 assert.equal(one('SELECT status FROM videos WHERE id=1').status,'PUBLISHED');
 assert.equal((await req('/api/admin/compliance/cases/'+id,'GET',undefined,admin)).data.events.length,3);
});
test('19: creator appeals are limited to owning uploaders; appeal does not publish videos',async()=>{
 const caseId=globalThis._caseId;
 assert.equal((await req(`/api/compliance/cases/${caseId}/appeal`,'POST',{details:'I disagree with the decision and request a second review.'},userB)).status,403);
 const upload='dddddddd-dddd-4ddd-8ddd-dddddddddddd';
 run('INSERT INTO upload_sessions(id,user_id,video_id,original_filename,declared_type,expected_bytes,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?)',upload,userBId,1,'test.mp4','video/mp4',1,'PUBLISHED',now(),now());
 const filed=await req(`/api/compliance/cases/${caseId}/appeal`,'POST',{details:'I am the recorded uploader and request another review of this case.'},userB);
 assert.equal(filed.status,201);assert.equal((await req(`/api/compliance/cases/${caseId}/appeal`,'POST',{details:'Repeated request with identical media rights details'},userB)).status,409);
 assert.equal((await req('/api/admin/compliance/cases/'+caseId,'GET',undefined,admin)).data.appeals[0].state,'PENDING');
 assert.equal((await req('/api/admin/compliance/appeals/'+filed.data.id+'/decision','PATCH',{status:'ACCEPTED',note:'Request acknowledged; original content decision unchanged'},admin)).status,200);
 assert.equal(one('SELECT status FROM videos WHERE id=1').status,'PUBLISHED');
});
test('19: signed vendor receipts require timestamp, signature, known subject and replay prevention',async()=>{
 const endpoint='/api/integrations/age-verification/callback';
 const event={eventId:'vendor_event_000101',userId:userAId,providerRef:'vendor-opaque-00019',decision:'PASS',expiresAt:new Date(Date.now()+3600_000).toISOString()};
 const body=JSON.stringify(event),timestamp=String(Date.now());
 const signed=hexHmac(Buffer.from(body),timestamp,process.env.SA_VERIFICATION_WEBHOOK_SECRET);
 const options={method:'POST',headers:{'content-type':'application/json','x-sa-event-timestamp':timestamp,'x-sa-event-signature':'sha256='+signed},body};
 assert.equal((await fetch(base+endpoint,{...options,headers:{...options.headers,'x-sa-event-signature':'sha256='+'0'.repeat(64)}})).status,401);
 assert.equal((await fetch(base+endpoint,{...options,headers:{...options.headers,'x-sa-event-timestamp':String(Date.now()-500000)}})).status,401);
 let r=await fetch(base+endpoint,options);assert.equal(r.status,202);assert.equal((await r.json()).duplicate,false);
 r=await fetch(base+endpoint,options);assert.equal(r.status,202);assert.equal((await r.json()).duplicate,true);
 assert.equal(one('SELECT status FROM age_assurance_receipts WHERE user_id=?',userAId).status,'VERIFIED');
 const revoked={...event,eventId:'vendor_event_000102',decision:'REVOKE'};const revokedBody=JSON.stringify(revoked);
 r=await fetch(base+endpoint,{method:'POST',headers:{'x-sa-event-timestamp':timestamp,'x-sa-event-signature':hexHmac(Buffer.from(revokedBody),timestamp,process.env.SA_VERIFICATION_WEBHOOK_SECRET)},body:revokedBody});
 assert.equal(r.status,202);assert.equal(one('SELECT status FROM age_assurance_receipts WHERE user_id=?',userAId).status,'REVOKED');
});
test('19: CloudFront signed HLS cookies have per-media scope, expiration and verifiable signature',()=>{
 const {privateKey,publicKey}=crypto.generateKeyPairSync('rsa',{modulusLength:2048,publicKeyEncoding:{type:'spki',format:'pem'},privateKeyEncoding:{type:'pkcs8',format:'pem'}});
 const uploadId='aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa';
 const result=signedMediaCookies({uploadId,mediaOrigin:'https://media.example.test/',keyPairId:'K12345678901',privateKey,domain:'example.test',ttlSeconds:90,nowEpoch:2000000000});
 assert.equal(result.expires,2000000090);assert.equal(result.cookies.length,3);
 assert.ok(result.cookies.every(x=>x.includes('Secure; HttpOnly; SameSite=Lax')&&x.includes('Path=/media/'+uploadId)));
 assert.ok(verifyPolicySignature(result.fields['CloudFront-Policy'],result.fields['CloudFront-Signature'],publicKey));
 assert.throws(()=>signedMediaCookies({uploadId,mediaOrigin:'http://media.example.test/',keyPairId:'K12345678901',privateKey,domain:'example.test'}),/HTTPS/);
 assert.throws(()=>signedMediaCookies({uploadId:'../../bad',mediaOrigin:'https://media.example.test/',keyPairId:'K12345678901',privateKey,domain:'example.test'}),/upload id/);
 assert.throws(()=>signedMediaCookies({uploadId,mediaOrigin:'https://media.example.test/',keyPairId:'K12345678901',privateKey,domain:'evil.test'}),/ancestor/);
});
test('19: private S3/CDN Terraform template includes strong isolation controls',()=>{
 const tf=fs.readFileSync(path.join(baseRoot,'deployment/aws/media-cdn/main.tf'),'utf8');
 for(const text of ['block_public_acls = true','block_public_policy = true','restrict_public_buckets = true','BucketOwnerEnforced','aws_cloudfront_origin_access_control','trusted_key_groups','SourceArn','force_destroy = false'])assert.ok(tf.includes(text),text);
});
test('19: metrics endpoint only accepts a constant-time checked bearer token and has no PII labels',async()=>{
 const r=await fetch(base+'/api/internal/metrics');assert.equal(r.status,401);
 const a=await fetch(base+'/api/internal/metrics',{headers:{Authorization:'Bearer invalid'}});assert.equal(a.status,401);
 const b=await fetch(base+'/api/internal/metrics',{headers:{Authorization:'Bearer '+process.env.SA_METRICS_TOKEN}});
 assert.equal(b.status,200);const text=await b.text();assert.match(text,/streamatlas_http_requests_total/);assert.match(text,/streamatlas_process_resident_memory_bytes/);
 assert.doesNotMatch(text,/casea19@example|sa_session|token_hash|user_id/);
});
test('19: public-content serving cannot be activated with a configuration flag',()=>{
 const r=spawnSync(process.execPath,['src/server.js'],{cwd:baseRoot,env:{...process.env,SA_PUBLIC_CONTENT_MODE:'1',SA_DISABLE_WORKER:'1'},encoding:'utf8',timeout:12000});
 assert.notEqual(r.status,0);assert.match(r.stderr,/Public-content launch is deliberately disabled/);
});
