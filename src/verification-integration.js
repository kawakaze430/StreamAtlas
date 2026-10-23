/** Vendor-neutral signed age-verification webhook adapter.
 * Prototype only: schema requires actual vendor mapping & independent audit.
 * We intentionally store no birthdate, identity document or biometric.
 * Signed result records do not, by themselves, certify effective age assurance.
 */
import crypto from 'node:crypto';
import {db,one,run,now} from './database.js';
export const hexHmac=(body,timestamp,secret)=>crypto.createHmac('sha256',secret).update(`${timestamp}.`).update(body).digest('hex');
export function verifySignedWebhook({body,headers,secret,clock=Date.now()}){
 if(typeof secret!=='string'||secret.length<32)throw Object.assign(Error('Verification integration not configured'),{status:503});
 const timestamp=String(headers['x-sa-event-timestamp']||'');
 if(!/^\d{13}$/.test(timestamp)||Math.abs(clock-Number(timestamp))>300000)throw Object.assign(Error('Stale or missing signed timestamp'),{status:401});
 const provided=String(headers['x-sa-event-signature']||'').replace(/^sha256=/,'');
 if(!/^[0-9a-f]{64}$/i.test(provided))throw Object.assign(Error('Invalid webhook signature'),{status:401});
 const candidate=Buffer.from(hexHmac(body,timestamp,secret),'hex');
 const signed=Buffer.from(provided,'hex');
 if(signed.length!==candidate.length||!crypto.timingSafeEqual(signed,candidate))throw Object.assign(Error('Invalid webhook signature'),{status:401});
 let event;try{event=JSON.parse(body.toString('utf8'))}catch{throw Object.assign(Error('Malformed event payload'),{status:400})}
 if(!/^[a-zA-Z0-9_-]{12,100}$/.test(String(event.eventId||'')))throw Object.assign(Error('Invalid event identifier'),{status:400});
 if(!Number.isSafeInteger(event.userId)||event.userId<1)throw Object.assign(Error('Invalid subject'),{status:400});
 if(!['PASS','REVOKE','FAIL'].includes(event.decision))throw Object.assign(Error('Invalid decision'),{status:400});
 if(!/^[a-zA-Z0-9._:-]{8,150}$/.test(String(event.providerRef||'')))throw Object.assign(Error('Invalid opaque provider reference'),{status:400});
 if(process.env.SA_REQUIRE_CHALLENGE_BINDING==='1'&&event.decision==='PASS'&&!/^[A-Za-z0-9_-]{43}$/.test(String(event.challengeId||'')))throw Object.assign(Error('Signed event missing binding challenge'),{status:400});
 if(event.decision==='PASS'){
  const expiry=Date.parse(event.expiresAt||'');
  if(!Number.isFinite(expiry)||expiry<clock+60000||expiry>clock+366*24*3600*1000)throw Object.assign(Error('Invalid verification expiry'),{status:400});
 }
 return event;
}
export function applyVerificationEvent(event){
 const user=one('SELECT id FROM users WHERE id=?',event.userId);
 if(!user)throw Object.assign(Error('Unknown verification subject'),{status:404});
 const existing=one('SELECT event_id FROM signed_verification_events WHERE event_id=?',event.eventId);
 if(existing)return {accepted:true,duplicate:true};
 db.exec('BEGIN');try{
  if(process.env.SA_REQUIRE_CHALLENGE_BINDING==='1'&&event.decision==='PASS'){
   const digest=crypto.createHash('sha256').update(event.challengeId).digest('hex');
   const claimed=run('UPDATE verification_challenges SET consumed_at=? WHERE challenge_hash=? AND user_id=? AND consumed_at IS NULL AND expires_at>?',now(),digest,event.userId,now());
   if(!claimed.changes)throw Object.assign(Error('Challenge expired, consumed or does not match subject'),{status:403});
  }
  run('INSERT INTO signed_verification_events(event_id,user_id,decision,received_at) VALUES(?,?,?,?)',event.eventId,event.userId,event.decision,now());
  if(event.decision==='PASS')run(`INSERT INTO age_assurance_receipts(user_id,provider_ref,expires_at,verified_at,status) VALUES(?,?,?,?,?)
   ON CONFLICT(user_id) DO UPDATE SET provider_ref=excluded.provider_ref,expires_at=excluded.expires_at,verified_at=excluded.verified_at,status=excluded.status`,event.userId,event.providerRef,event.expiresAt,now(),'VERIFIED');
  else run(`INSERT INTO age_assurance_receipts(user_id,provider_ref,expires_at,verified_at,status) VALUES(?,?,?,?,?)
   ON CONFLICT(user_id) DO UPDATE SET status='REVOKED',expires_at=excluded.expires_at,verified_at=excluded.verified_at`,event.userId,event.providerRef,now(),now(),'REVOKED');
  db.exec('COMMIT');
 }catch(error){db.exec('ROLLBACK');throw error}
 return {accepted:true,duplicate:false};
}
/** No vendor transport is implied. Bind a short-lived opaque request challenge to
 * the signed callback's user ID so it cannot be reassigned to another account. */
export function issueVerificationChallenge(userId){
 const raw=crypto.randomBytes(32).toString('base64url');
 const digest=crypto.createHash('sha256').update(raw).digest('hex');
 const expiresAt=new Date(Date.now()+10*60*1000).toISOString();
 run('DELETE FROM verification_challenges WHERE user_id=?',userId);
 run('INSERT INTO verification_challenges(challenge_hash,user_id,created_at,expires_at) VALUES(?,?,?,?)',digest,userId,now(),expiresAt);
 return {challengeId:raw,expiresAt};
}
