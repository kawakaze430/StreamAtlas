import test from 'node:test';import assert from 'node:assert/strict';
import crypto from 'node:crypto';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'challenge20-'));
process.env.DB_PATH=path.join(dir,'db.sqlite');process.env.PRIVATE_PATH=path.join(dir,'private');process.env.NODE_ENV='test';process.env.SA_REQUIRE_CHALLENGE_BINDING='1';
const {run,now,one}=await import('../src/database.js');
const {issueVerificationChallenge,applyVerificationEvent,verifySignedWebhook,hexHmac}=await import('../src/verification-integration.js');
function makeUser(label){return Number(run('INSERT INTO users(email,name,created_at) VALUES(?,?,?)',label+'@test.example',label,now()).lastInsertRowid)}
const a=makeUser('challenge-a'),b=makeUser('challenge-b');
let counter=0;
function event(userId,challengeId,decision='PASS'){
 return {eventId:'test_challenge_evt_'+String(++counter).padStart(6,'0'),userId,challengeId,providerRef:'synthetic-provider-opaque-999',decision,expiresAt:new Date(Date.now()+300000).toISOString()};
}
test('20: challenge binding prevents signed event subject swapping and one-time reuse',()=>{
 const c=issueVerificationChallenge(a);
 assert.equal(c.challengeId.length,43);
 assert.ok(Date.parse(c.expiresAt)>Date.now());
 assert.throws(()=>applyVerificationEvent(event(b,c.challengeId)),/does not match subject/);
 assert.equal(one('SELECT consumed_at FROM verification_challenges WHERE user_id=?',a).consumed_at,null);
 const accepted=event(a,c.challengeId);
 assert.equal(applyVerificationEvent(accepted).accepted,true);
 assert.equal(applyVerificationEvent(accepted).duplicate,true);
 assert.throws(()=>applyVerificationEvent(event(a,c.challengeId)),/expired, consumed/);
 assert.equal(one('SELECT status FROM age_assurance_receipts WHERE user_id=?',a).status,'VERIFIED');
});
test('20: previous challenge expires on new challenge and expiry is enforced',()=>{
 const older=issueVerificationChallenge(a),newer=issueVerificationChallenge(a);
 assert.throws(()=>applyVerificationEvent(event(a,older.challengeId)),/expired, consumed/);
 run('UPDATE verification_challenges SET expires_at=? WHERE user_id=?',new Date(Date.now()-1000).toISOString(),a);
 assert.throws(()=>applyVerificationEvent(event(a,newer.challengeId)),/expired, consumed/);
});
test('20: signed revocation never requires an old or consumed challenge',()=>{
 const e=event(a,undefined,'REVOKE');
 assert.equal(applyVerificationEvent(e).accepted,true);
 assert.equal(one('SELECT status FROM age_assurance_receipts WHERE user_id=?',a).status,'REVOKED');
});
test('20: invalid signature cannot pass the challenge-binding adapter',()=>{
 const secret='testing-'+crypto.randomBytes(32).toString('hex'),timestamp=String(Date.now());
 const candidate=event(a,issueVerificationChallenge(a).challengeId),body=Buffer.from(JSON.stringify(candidate));
 assert.throws(()=>verifySignedWebhook({body,headers:{'x-sa-event-timestamp':timestamp,'x-sa-event-signature':'sha256='+'a'.repeat(64)},secret}),/signature/);
 const signed=hexHmac(body,timestamp,secret);
 assert.deepEqual(verifySignedWebhook({body,headers:{'x-sa-event-timestamp':timestamp,'x-sa-event-signature':signed},secret}),candidate);
});
test('20: challenge is hashed at rest and does not persist raw token',()=>{
 const c=issueVerificationChallenge(b);const r=one('SELECT challenge_hash FROM verification_challenges WHERE user_id=?',b);
 assert.equal(r.challenge_hash,crypto.createHash('sha256').update(c.challengeId).digest('hex'));
 assert.ok(!fs.readFileSync(process.env.DB_PATH).includes(c.challengeId));
 fs.rmSync(dir,{recursive:true,force:true});
});
