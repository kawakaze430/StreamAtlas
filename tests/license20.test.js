import test from 'node:test';import assert from 'node:assert/strict';
import fs from 'node:fs';import path from 'node:path';import os from 'node:os';
const root=fs.mkdtempSync(path.join(os.tmpdir(),'license20-'));
process.env.DB_PATH=path.join(root,'app.sqlite');process.env.PRIVATE_PATH=path.join(root,'media');process.env.NODE_ENV='test';
const {one,run,now}=await import('../src/database.js');
const {verifyLicenseReview,revokeLicenseReview,expireLicenseReviews,getLicenseReview}=await import('../src/license-lifecycle.js');
const {authorizePrivateMedia}=await import('../src/playback-authorization.js');
const admin=Number(run('INSERT INTO users(email,name,role,created_at) VALUES(?,?,?,?)','licenseadmin20@example.test','License Reviewer','ADMIN',now()).lastInsertRowid);
const uploader=Number(run('INSERT INTO users(email,name,role,created_at) VALUES(?,?,?,?)','licenseuploader20@example.test','Uploader','MEMBER',now()).lastInsertRowid);
const upload='cccccccc-cccc-4ccc-8ccc-cccccccccccc';
run('INSERT INTO creator_profiles(user_id,display_name,status,applied_at) VALUES(?,?,?,?)',uploader,'Licensed synthetic creator','APPROVED',now());
run('INSERT INTO upload_sessions(id,user_id,video_id,original_filename,declared_type,expected_bytes,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?)',upload,uploader,1,'clip.mp4','video/mp4',1024,'PUBLISHED',now(),now());
test('20: internal license record requires valid expiry, internal reference, note',()=>{
 assert.throws(()=>verifyLicenseReview(upload,{reference:'short',expiresAt:new Date(Date.now()+86400000).toISOString(),note:'A documented independent review'},admin),/reference/);
 assert.throws(()=>verifyLicenseReview(upload,{reference:'internal-lic-001',expiresAt:new Date(Date.now()-1000).toISOString(),note:'A documented independent review'},admin),/Expiry/);
 assert.throws(()=>verifyLicenseReview(upload,{reference:'internal-lic-001',expiresAt:new Date(Date.now()+86400000).toISOString(),note:'too short'},admin),/review note/);
 const reviewed=verifyLicenseReview(upload,{reference:'internal-lic-001',expiresAt:new Date(Date.now()+86400000).toISOString(),note:'Document reference inspected by reviewer'},admin);
 assert.equal(reviewed.status,'VERIFIED');assert.equal(getLicenseReview(upload).reference,'internal-lic-001');
});
test('20: optional entitlement policy enforces valid license review',()=>{
 process.env.SA_REQUIRE_REVIEWED_LICENSE_EXPIRY='1';
 assert.doesNotThrow(()=>authorizePrivateMedia({uploadId:upload,user:{id:uploader},requireAssurance:false,requireEvidence:false}));
 run('UPDATE media_license_reviews SET expires_at=? WHERE upload_id=?',new Date(Date.now()-1000).toISOString(),upload);
 assert.throws(()=>authorizePrivateMedia({uploadId:upload,user:{id:uploader},requireAssurance:false,requireEvidence:false}),/License validity/);
});
test('20: expiry job quarantines licensed media and queues CDN invalidation, idempotently',()=>{
 assert.equal(expireLicenseReviews(),1);
 assert.equal(one('SELECT status FROM videos WHERE id=1').status,'HIDDEN');
 assert.equal(one('SELECT status FROM media_license_reviews WHERE upload_id=?',upload).status,'EXPIRED');
 assert.equal(one('SELECT reason FROM content_holds WHERE video_id=1').reason,'RIGHTS_EXPIRED');
 assert.equal(one('SELECT COUNT(*) n FROM media_revocation_jobs WHERE video_id=1').n,1);
 assert.equal(expireLicenseReviews(),0);
});
test('20: operator renewal cannot automatically republish previously quarantined video',()=>{
 verifyLicenseReview(upload,{reference:'internal-renewal-007',expiresAt:new Date(Date.now()+86400000).toISOString(),note:'Renewed document reference inspected by reviewer'},admin);
 assert.equal(one('SELECT status FROM videos WHERE id=1').status,'HIDDEN');
 assert.ok(one('SELECT 1 FROM content_holds WHERE video_id=1 AND closed_at IS NULL'));
});
test('20: explicit revocation hides, retains audit-hold and queues a separate request',()=>{
 const result=revokeLicenseReview(upload,{note:'Rights holder has revoked the local evaluation license'},admin);
 assert.equal(result.status,'REVOKED');
 assert.equal(one('SELECT COUNT(*) n FROM media_revocation_jobs WHERE video_id=1').n,2);
 assert.equal(one('SELECT COUNT(*) n FROM content_holds WHERE video_id=1 AND closed_at IS NULL').n,1);
 fs.rmSync(root,{recursive:true,force:true});
});
