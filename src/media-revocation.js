/** Durable operator queue for CDN revocation requests. An event alone DOES NOT
 * revoke extant signed cookies. Follow the emergency rights-hold playbook. */
import {all,run,now,db} from './database.js';
export function queueVideoRevocation(videoId,reason){
 const uploads=all("SELECT id FROM upload_sessions WHERE video_id=? AND status='PUBLISHED'",videoId);
 for(const x of uploads){
  run(`INSERT INTO media_revocation_jobs(upload_id,video_id,reason,status,requested_at)
    SELECT ?,?,?,?,? WHERE NOT EXISTS(SELECT 1 FROM media_revocation_jobs WHERE upload_id=? AND reason=? AND status IN ('PENDING','REQUESTED'))`,x.id,videoId,String(reason).slice(0,120),'PENDING',now(),x.id,String(reason).slice(0,120));
 }
 return uploads.length;
}
export function pendingRevocations(limit=100){return all("SELECT id,upload_id AS uploadId,video_id AS videoId,reason,requested_at AS requestedAt FROM media_revocation_jobs WHERE status='PENDING' ORDER BY id LIMIT ?",limit)};
export function markRevocationDone(ids,requestId){if(!Array.isArray(ids)||!ids.length||ids.some(x=>!Number.isSafeInteger(x)||x<1))throw Error('Invalid job IDs');if(!/^[A-Z0-9]{6,80}$/.test(requestId))throw Error('Invalid CloudFront invalidation reference');for(const id of ids)run("UPDATE media_revocation_jobs SET status='REQUESTED',processed_at=?,provider_request_id=? WHERE id=? AND status='PENDING'",now(),requestId,id)}

/** CloudFront invalidation submission is asynchronous. Never confuse REQUESTED with
 * COMPLETED, and never infer successful revocation of already-issued cookies. */
export function requestedRevocations(limit=100){
 if(!Number.isInteger(limit)||limit<1||limit>500)throw Error('Invalid revocation query limit');
 return all("SELECT id,upload_id AS uploadId,video_id AS videoId,reason,requested_at AS requestedAt,processed_at AS processedAt,provider_request_id AS providerRequestId FROM media_revocation_jobs WHERE status='REQUESTED' ORDER BY id LIMIT ?",limit);
}
export function unresolvedRevocations(limit=100){
 if(!Number.isInteger(limit)||limit<1||limit>500)throw Error('Invalid revocation query limit');
 return all("SELECT id,upload_id AS uploadId,video_id AS videoId,reason,status,requested_at AS requestedAt,processed_at AS processedAt,provider_request_id AS providerRequestId FROM media_revocation_jobs WHERE status IN ('PENDING','REQUESTED') ORDER BY id LIMIT ?",limit);
}
export function confirmProviderInvalidation(ids,requestId){
 if(!Array.isArray(ids)||!ids.length||new Set(ids).size!==ids.length||ids.some(x=>!Number.isSafeInteger(x)||x<1))throw Error('Invalid confirmation IDs');
 if(!/^[A-Z0-9]{6,80}$/.test(requestId||''))throw Error('Invalid provider confirmation reference');
 // Atomic across jobs: a mismatched ID cannot leave a partially confirmed batch.
 db.exec('BEGIN IMMEDIATE');
 try{
  let count=0;
  for(const id of ids){
   const updated=run("UPDATE media_revocation_jobs SET status='COMPLETED',processed_at=? WHERE id=? AND status='REQUESTED' AND provider_request_id=?",now(),id,requestId);
   if(updated.changes!==1)throw Error('Invalidation job state changed or provider request does not match');
   count++;
  }
  db.exec('COMMIT');return count;
 }catch(e){db.exec('ROLLBACK');throw e}
}
