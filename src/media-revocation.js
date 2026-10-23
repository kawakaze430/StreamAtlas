/** Durable operator queue for CDN revocation requests. An event alone DOES NOT
 * revoke extant signed cookies. Follow the emergency rights-hold playbook. */
import {all,run,now} from './database.js';
export function queueVideoRevocation(videoId,reason){
 const uploads=all("SELECT id FROM upload_sessions WHERE video_id=? AND status='PUBLISHED'",videoId);
 for(const x of uploads){
  run(`INSERT INTO media_revocation_jobs(upload_id,video_id,reason,status,requested_at)
    SELECT ?,?,?,?,? WHERE NOT EXISTS(SELECT 1 FROM media_revocation_jobs WHERE upload_id=? AND reason=? AND status='PENDING')`,x.id,videoId,String(reason).slice(0,120),'PENDING',now(),x.id,String(reason).slice(0,120));
 }
 return uploads.length;
}
export function pendingRevocations(limit=100){return all("SELECT id,upload_id AS uploadId,video_id AS videoId,reason,requested_at AS requestedAt FROM media_revocation_jobs WHERE status='PENDING' ORDER BY id LIMIT ?",limit)};
export function markRevocationDone(ids,requestId){if(!Array.isArray(ids)||!ids.length||ids.some(x=>!Number.isSafeInteger(x)||x<1))throw Error('Invalid job IDs');if(!/^[A-Z0-9]{6,80}$/.test(requestId))throw Error('Invalid CloudFront invalidation reference');for(const id of ids)run("UPDATE media_revocation_jobs SET status='REQUESTED',processed_at=?,provider_request_id=? WHERE id=? AND status='PENDING'",now(),requestId,id)}
