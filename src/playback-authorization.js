/** Private evaluation-only access policy. This enforces recorded receipts, NOT
 * the effectiveness of an external age-assurance vendor or content verification.
 * Public distribution remains disabled independently in server.js.
 */
import {one} from './database.js';
const deny=(message,status)=>{const e=new Error(message);e.status=status;throw e};
export function assuranceSummary(userId){
 if(!Number.isSafeInteger(Number(userId))||Number(userId)<1)return {eligible:false,reason:'AUTH_REQUIRED'};
 const r=one('SELECT status,expires_at AS expiresAt,verified_at AS verifiedAt FROM age_assurance_receipts WHERE user_id=?',userId);
 if(!r)return {eligible:false,reason:'NO_VERIFIED_RECEIPT'};
 if(r.status!=='VERIFIED')return {eligible:false,reason:'REVOKED'};
 if(!Number.isFinite(Date.parse(r.expiresAt))||Date.parse(r.expiresAt)<=Date.now())return {eligible:false,reason:'EXPIRED'};
 return {eligible:true,reason:'ACTIVE_RECEIPT',expiresAt:r.expiresAt};
}
export function requirePrivateViewer(user){
 if(!user)deny('Sign in required for this private preview.',401);
 if(user.role==='DEMO')deny('Demo accounts cannot access receipt-gated media.',403);
 const status=assuranceSummary(user.id);
 if(!status.eligible)deny('A valid independently issued access receipt is required.',403);
 return status;
}
export function authorizePrivateMedia({uploadId,user,requireAssurance=true,requireEvidence=true}){
 if(requireAssurance)requirePrivateViewer(user);
 else if(!user)deny('Sign in is required.',401);
 if(!/^[a-f0-9]{8}-[a-f0-9-]{27}$/i.test(String(uploadId)))deny('Invalid media reference.',400);
 const media=one(`SELECT x.id,x.video_id AS videoId,x.status AS uploadStatus,
  v.status AS videoStatus,cp.status AS creatorStatus
  FROM upload_sessions x JOIN videos v ON v.id=x.video_id
  LEFT JOIN creator_profiles cp ON cp.user_id=x.user_id WHERE x.id=?`,uploadId);
 if(!media||media.uploadStatus!=='PUBLISHED'||media.videoStatus!=='PUBLISHED')deny('Media not available.',404);
 if(media.creatorStatus!=='APPROVED')deny('Media publisher is not approved.',403);
 if(one('SELECT 1 FROM content_holds WHERE video_id=? AND closed_at IS NULL',media.videoId))deny('Media subject to an active safety hold.',403);
 if(process.env.NODE_ENV==='production'||process.env.SA_REQUIRE_REVIEWED_LICENSE_EXPIRY==='1'){
  const license=one('SELECT status,expires_at FROM media_license_reviews WHERE upload_id=?',uploadId);
  if(!license||license.status!=='VERIFIED'||Date.parse(license.expires_at)<=Date.now())deny('License validity review is not current.',403);
 }
 if(requireEvidence){
  const count=one("SELECT COUNT(DISTINCT kind) AS n FROM review_evidence WHERE upload_id=? AND kind IN ('LICENSE','ADULTHOOD','CONSENT')",uploadId)?.n;
  if(count!==3)deny('Required review references are incomplete.',403);
 }
 return media;
}
