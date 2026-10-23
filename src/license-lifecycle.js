/** Expiring internal license reviews. References are NOT independently verified
 * distribution licenses; operators must verify evidence and jurisdiction. */
import {db,all,one,run,now} from './database.js';
import {queueVideoRevocation} from './media-revocation.js';
const fail=(message,status=400)=>{const e=new Error(message);e.status=status;throw e};
export function getLicenseReview(uploadId){return one('SELECT upload_id AS uploadId,reference,expires_at AS expiresAt,status,reviewed_at AS reviewedAt FROM media_license_reviews WHERE upload_id=?',uploadId)||null}
export function verifyLicenseReview(uploadId,{reference,expiresAt,note},adminId){
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uploadId)||!Number.isSafeInteger(adminId))fail('Invalid media/admin identifiers');
 const x=one('SELECT x.id,x.video_id AS videoId FROM upload_sessions x WHERE x.id=? AND x.status IN (\'IN_REVIEW\',\'PUBLISHED\')',uploadId);
 if(!x)fail('Media not eligible for license review',404);
 if(typeof reference!=='string'||reference.trim().length<10||reference.length>180||/[<>\x00-\x1f]/.test(reference))fail('A restricted internal license reference is required');
 const time=Date.parse(expiresAt||'');if(!Number.isFinite(time)||time<Date.now()+3600_000||time>Date.now()+2*365*86400000)fail('Expiry must be at least 1 hour and at most 2 years in the future');
 if(typeof note!=='string'||note.trim().length<12||note.length>500)fail('A documented review note is required');
 run(`INSERT INTO media_license_reviews(upload_id,reference,expires_at,status,reviewed_by,reviewed_at,decision_note) VALUES(?,?,?,?,?,?,?)
  ON CONFLICT(upload_id) DO UPDATE SET reference=excluded.reference,expires_at=excluded.expires_at,status='VERIFIED',reviewed_by=excluded.reviewed_by,reviewed_at=excluded.reviewed_at,decision_note=excluded.decision_note`,uploadId,reference.trim(),new Date(time).toISOString(),'VERIFIED',adminId,now(),note.trim());
 run('INSERT INTO license_review_events(upload_id,actor_id,action,note,created_at) VALUES(?,?,?,?,?)',uploadId,adminId,'RECORDED',note.trim().slice(0,500),now());
 return getLicenseReview(uploadId);
}
function hideOnLicenseFailure(x,why){
 run("UPDATE videos SET status='HIDDEN' WHERE id=? AND status='PUBLISHED'",x.videoId);
 const exists=one('SELECT 1 FROM content_holds WHERE video_id=? AND closed_at IS NULL',x.videoId);
 if(!exists)run('INSERT INTO content_holds(video_id,reason,details,opened_by,opened_at) VALUES(?,?,?,?,?)',x.videoId,'RIGHTS_EXPIRED',why,x.reviewedBy,now());
 queueVideoRevocation(x.videoId,'LICENSE:'+why);
}
export function revokeLicenseReview(uploadId,{note},adminId){
 if(typeof note!=='string'||note.trim().length<12)fail('Revocation must include a detailed review note');
 const x=one('SELECT x.video_id AS videoId,l.reviewed_by AS reviewedBy FROM media_license_reviews l JOIN upload_sessions x ON x.id=l.upload_id WHERE l.upload_id=?',uploadId);
 if(!x)fail('License record not found',404);
 db.exec('BEGIN');try{
  run("UPDATE media_license_reviews SET status='REVOKED',reviewed_by=?,reviewed_at=?,decision_note=? WHERE upload_id=?",adminId,now(),note.trim().slice(0,500),uploadId);
  hideOnLicenseFailure({...x,reviewedBy:adminId},'License review revoked by an administrator');
  run('INSERT INTO license_review_events(upload_id,actor_id,action,note,created_at) VALUES(?,?,?,?,?)',uploadId,adminId,'REVOKED',note.trim().slice(0,500),now());
  db.exec('COMMIT');
 }catch(error){db.exec('ROLLBACK');throw error}
 return getLicenseReview(uploadId);
}
export function expireLicenseReviews(){
 const expiring=all(`SELECT x.video_id AS videoId,l.upload_id AS uploadId,l.reviewed_by AS reviewedBy
 FROM media_license_reviews l JOIN upload_sessions x ON x.id=l.upload_id
 WHERE l.status='VERIFIED' AND l.expires_at<=?`,now());
 let count=0;
 for(const x of expiring){db.exec('BEGIN');try{
  const r=run("UPDATE media_license_reviews SET status='EXPIRED' WHERE upload_id=? AND status='VERIFIED' AND expires_at<=?",x.uploadId,now());
  if(r.changes){hideOnLicenseFailure(x,'License review expired; renewal is required');run('INSERT INTO license_review_events(upload_id,actor_id,action,note,created_at) VALUES(?,?,?,?,?)',x.uploadId,x.reviewedBy,'EXPIRED','Automated expiry enforcement',now());count++}
  db.exec('COMMIT');
 }catch(e){db.exec('ROLLBACK');throw e}}
 return count;
}
