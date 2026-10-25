/** License checks use disposable synthetic metadata; no documentary approval is asserted. */
import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';

const temporary=fs.mkdtempSync(path.join(os.tmpdir(),'sa-license-enforcement-'));
process.env.DB_PATH=path.join(temporary,'test.sqlite');
process.env.PRIVATE_PATH=path.join(temporary,'private');
process.env.NODE_ENV='test';
process.env.SA_ENFORCE_CSRF='1';
process.env.SA_DISABLE_WORKER='1';
delete process.env.SA_REQUIRE_REVIEWED_LICENSE_EXPIRY;
const {server}=await import('../src/server.js');
const {db,one,run,now,tokenHash}=await import('../src/database.js');
const {authorizePrivateMedia}=await import('../src/playback-authorization.js');
let base,csrf,csrfCookie,adminCookie,memberCookie,adminId,uploaderId,nextVideo=1;

before(async()=>{
 adminId=Number(run('INSERT INTO users(email,name,role,created_at) VALUES(?,?,?,?)','license-reviewer@example.invalid','Synthetic reviewer','ADMIN',now()).lastInsertRowid);
 uploaderId=Number(run('INSERT INTO users(email,name,role,created_at) VALUES(?,?,?,?)','license-uploader@example.invalid','Synthetic uploader','MEMBER',now()).lastInsertRowid);
 run('INSERT INTO creator_profiles(user_id,display_name,status,applied_at) VALUES(?,?,?,?)',uploaderId,'Synthetic publisher','APPROVED',now());
 for(const [id,role] of [[adminId,'admin'],[uploaderId,'member']]){
  const token=crypto.randomBytes(32).toString('hex');
  run('INSERT INTO sessions(token_hash,user_id,expires_at) VALUES(?,?,?)',tokenHash(token),id,new Date(Date.now()+3600000).toISOString());
  if(role==='admin')adminCookie='sa_session='+token;else memberCookie='sa_session='+token;
 }
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 base='http://127.0.0.1:'+server.address().port;
 const response=await fetch(base+'/api/security/csrf');
 csrf=(await response.json()).token;csrfCookie=response.headers.get('set-cookie').split(';')[0];
});
after(async()=>{
 await new Promise(resolve=>server.close(resolve));
 db.close();fs.rmSync(temporary,{recursive:true,force:true});
});

function fixture({status='VERIFIED',expiresAt=new Date(Date.now()+86400000).toISOString(),review=true,visible=false,closedHold=false}={}){
 const id=crypto.randomUUID(),videoId=nextVideo++;
 run('UPDATE videos SET status=? WHERE id=?',visible?'PUBLISHED':'HIDDEN',videoId);
 run('INSERT INTO upload_sessions(id,user_id,video_id,original_filename,declared_type,expected_bytes,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?)',id,uploaderId,videoId,'synthetic.mp4','video/mp4',128,'PUBLISHED',now(),now());
 if(review)run('INSERT INTO media_license_reviews(upload_id,reference,expires_at,status,reviewed_by,reviewed_at,decision_note) VALUES(?,?,?,?,?,?,?)',id,'synthetic-license-reference',expiresAt,status,adminId,now(),'Synthetic policy regression fixture');
 for(const kind of ['LICENSE','ADULTHOOD','CONSENT'])run('INSERT INTO review_evidence(upload_id,kind,reference,checked_by,checked_at) VALUES(?,?,?,?,?)',id,kind,'synthetic-reference-'+kind,adminId,now());
 if(closedHold)run('INSERT INTO content_holds(video_id,reason,details,opened_by,opened_at,closed_by,closed_at,closure_note) VALUES(?,?,?,?,?,?,?,?)',videoId,'RIGHTS_EXPIRED','Synthetic previous hold',adminId,now(),adminId,now(),'Closed hold does not renew a license');
 return {id,videoId};
}
function authorize(upload){return authorizePrivateMedia({uploadId:upload.id,user:{id:uploaderId},requireAssurance:false});}
async function publish(upload,{cookie=adminCookie,withCsrf=true}={}){
 const response=await fetch(base+'/api/admin/videos/'+upload.videoId+'/status',{
  method:'PATCH',headers:{'Content-Type':'application/json','X-Requested-With':'StreamAtlas',Origin:base,Cookie:[cookie,csrfCookie].filter(Boolean).join('; '),...(withCsrf?{'X-CSRF-Token':csrf}:{})},body:JSON.stringify({status:'PUBLISHED'})
 });
 return {status:response.status,body:await response.json()};
}
async function deniedPublish(upload,options={},status=409){
 const audits=one('SELECT count(*) AS count FROM moderation_audit').count;
 const response=await publish(upload,options);assert.equal(response.status,status,JSON.stringify(response.body));
 assert.equal(one('SELECT status FROM videos WHERE id=?',upload.videoId).status,'HIDDEN');
 assert.equal(one('SELECT count(*) AS count FROM moderation_audit').count,audits,'Denied publication must not create a successful moderation audit');
}

test('required playback licensing rejects malformed expiry and preserves valid access',()=>{
 process.env.SA_REQUIRE_REVIEWED_LICENSE_EXPIRY='1';
 try{
  for(const expiresAt of ['not-a-date','',new Date(Date.now()-1).toISOString()]){
   const upload=fixture({expiresAt,visible:true});
   assert.throws(()=>authorize(upload),error=>error.status===403&&/License validity/.test(error.message),'Invalid or elapsed expiry must deny playback');
  }
  assert.doesNotThrow(()=>authorize(fixture({visible:true})));
 }finally{delete process.env.SA_REQUIRE_REVIEWED_LICENSE_EXPIRY;}
});
test('production playback requires a current license even without the optional development flag',()=>{
 process.env.NODE_ENV='production';
 try{
  assert.throws(()=>authorize(fixture({review:false,visible:true})),error=>error.status===403);
  assert.throws(()=>authorize(fixture({expiresAt:'invalid-expiry',visible:true})),error=>error.status===403);
  assert.doesNotThrow(()=>authorize(fixture({visible:true})));
 }finally{process.env.NODE_ENV='test';}
});
test('admin republish rejects a revoked license after its old hold was closed',async()=>{
 await deniedPublish(fixture({status:'REVOKED',closedHold:true}));
});
test('admin republish rejects recorded expiry without waiting for the expiry job',async()=>{
 await deniedPublish(fixture({expiresAt:new Date(Date.now()-1).toISOString()}));
 await deniedPublish(fixture({status:'EXPIRED'}));
});
test('admin republish fails closed on malformed license expiry',async()=>{
 await deniedPublish(fixture({expiresAt:'not-a-date'}));
 await deniedPublish(fixture({expiresAt:''}));
});
test('required development licensing prevents republishing an upload with no review',async()=>{
 process.env.SA_REQUIRE_REVIEWED_LICENSE_EXPIRY='1';
 try{await deniedPublish(fixture({review:false}));}
 finally{delete process.env.SA_REQUIRE_REVIEWED_LICENSE_EXPIRY;}
});
test('a renewed current license permits explicit republish after the hold is closed',async()=>{
 const upload=fixture({closedHold:true});
 const response=await publish(upload);assert.equal(response.status,200);
 assert.equal(one('SELECT status FROM videos WHERE id=?',upload.videoId).status,'PUBLISHED');
});
test('default synthetic workflow keeps uploads without license records and seed catalog usable',async()=>{
 const upload=fixture({review:false,visible:true});
 assert.doesNotThrow(()=>authorize(upload));
 run("UPDATE videos SET status='HIDDEN' WHERE id=?",upload.videoId);
 assert.equal((await publish(upload)).status,200);
 const seed={videoId:72};run("UPDATE videos SET status='HIDDEN' WHERE id=?",seed.videoId);
 process.env.SA_REQUIRE_REVIEWED_LICENSE_EXPIRY='1';
 try{assert.equal((await publish(seed)).status,200);}
 finally{delete process.env.SA_REQUIRE_REVIEWED_LICENSE_EXPIRY;}
});
test('valid licensing cannot bypass admin authorization or CSRF checks',async()=>{
 const upload=fixture();
 await deniedPublish(upload,{cookie:''},401);
 await deniedPublish(upload,{cookie:memberCookie},403);
 await deniedPublish(upload,{withCsrf:false},403);
});
