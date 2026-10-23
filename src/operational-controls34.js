/** Checkpoint 34: local workflow controls, not external certification or public launch permission.
 * All queries are bounded and scoped; sensitive evidence contents never leave this module.
 */
import {db,all,one,run,now} from './database.js';
import {operationsSnapshot} from './operations.js';
const fail=(message,status=400)=>{const e=new Error(message);e.status=status;throw e};
const send=(res,data,status=200)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow'});res.end(JSON.stringify(data));return true};
async function body(req){let size=0;const chunks=[];for await(const chunk of req){size+=chunk.length;if(size>16384)fail('Request body too large',413);chunks.push(chunk)}try{return JSON.parse(Buffer.concat(chunks).toString('utf8')||'{}')}catch{fail('Invalid JSON')}}
const openHold="EXISTS (SELECT 1 FROM content_holds h WHERE h.video_id=v.id AND h.closed_at IS NULL)";
const unpublished="v.status<>'PUBLISHED'";
const unsafe="v.status='PUBLISHED' AND "+openHold;
export function readinessFindings({time=Date.now()}={}){
 const totals=one(`SELECT COUNT(*) AS total, SUM(CASE WHEN ${unsafe} THEN 1 ELSE 0 END) AS publishedWithHold, SUM(CASE WHEN ${unpublished} THEN 1 ELSE 0 END) AS unpublished FROM videos v`);
 const work=all("SELECT status,COUNT(*) AS count FROM upload_sessions GROUP BY status");
 const overdue=one("SELECT COUNT(*) AS count FROM compliance_cases WHERE status NOT IN ('RESOLVED','REJECTED','CLOSED') AND ((priority='URGENT' AND created_at<?) OR (priority<>'URGENT' AND created_at<?))",new Date(time-4*3600000).toISOString(),new Date(time-72*3600000).toISOString()).count;
 const expired=one("SELECT COUNT(*) AS count FROM media_license_reviews WHERE status='VERIFIED' AND expires_at<=?",new Date(time).toISOString()).count;
 const unreviewed=one("SELECT COUNT(*) AS count FROM upload_sessions x LEFT JOIN review_evidence r ON r.upload_id=x.id WHERE x.status='PUBLISHED' AND r.upload_id IS NULL").count;
 const queue=Object.fromEntries(work.map(x=>[x.status,x.count]));
 return {generatedAt:new Date(time).toISOString(),catalog:{total:totals.total,publishedWithHold:totals.publishedWithHold||0,unpublished:totals.unpublished||0},cases:{overdue},licenseReview:{expired},uploads:{publishedMissingEvidenceReferences:unreviewed,queued:queue.QUEUED||0,failed:queue.FAILED||0,processing:queue.PROCESSING||0},publicLaunchApproved:false,disclaimer:'Internal records and synthetic-data diagnostics only; no verification of real identity, consent, licensing, laws or production availability.'};
}
function riskSummary(caseRow){const hours=caseRow.priority==='URGENT'?4:72,due=new Date(Date.parse(caseRow.created_at)+hours*3600000).toISOString();return {caseId:caseRow.id,category:caseRow.category,priority:caseRow.priority,status:caseRow.status,assignedTo:caseRow.assigned_to,dueAt:due,overdue:due<now()}}
export function mediaRemovalPlan(videoId){
 const v=one('SELECT id,status,title FROM videos WHERE id=?',videoId);if(!v)return null;
 const x=all('SELECT id,status FROM upload_sessions WHERE video_id=?',videoId);
 const hold=one('SELECT COUNT(*) AS n FROM content_holds WHERE video_id=? AND closed_at IS NULL',videoId).n;
 const pending=one("SELECT COUNT(*) AS n FROM media_revocation_jobs WHERE video_id=?",videoId).n;
 return {videoId:v.id,status:v.status,hasOpenHold:hold>0,uploadSessions:x.map(a=>({id:a.id,status:a.status})),existingRevocationJobs:pending,requiredSteps:['Restrict playback authorization','Remove from catalog/search/recommendations','Restrict posters and previews','Revoke protected HLS manifests and segments','Submit CDN purge after approval','Verify all old URLs fail'],dryRun:true,changesMade:false};
}
export async function operationalControlsApi(req,res,url,{requireUser,requireAdmin}){
 const p=url.pathname,m=req.method;
 if(m==='GET'&&p==='/api/admin/operations/readiness-findings'){
  requireAdmin(req);return send(res,readinessFindings());
 }
 if(m==='GET'&&p==='/api/admin/operations/recovery-plan'){
  requireAdmin(req);const snapshot=operationsSnapshot();return send(res,{databaseOk:snapshot.databaseOk,storageWritable:snapshot.privateStorageWritable,workerLeaseActive:snapshot.workerLeaseActive,checks:['Stop writers and processing workers','Create verified encrypted DB + private-media backup','Store separate offline encryption secret securely','Restore to isolated target','Run consistency check and verify media hashes','Reopen workers only after restore approval'],cloudRestoreTested:false,productionReady:false});
 }
 const removal=p.match(/^\/api\/admin\/operations\/media-removal-plan\/(\d+)$/);
 if(m==='GET'&&removal){requireAdmin(req);const plan=mediaRemovalPlan(Number(removal[1]));if(!plan)fail('Video not found',404);return send(res,plan);}
 if(m==='GET'&&p==='/api/admin/compliance/triage'){
  requireAdmin(req);const limit=Number(url.searchParams.get('limit')||30);if(!Number.isSafeInteger(limit)||limit<1||limit>100)fail('Limit must be 1–100');
  const cases=all("SELECT id,category,priority,status,assigned_to,created_at FROM compliance_cases WHERE status NOT IN ('RESOLVED','REJECTED','CLOSED') ORDER BY (priority='URGENT') DESC,created_at ASC LIMIT ?",limit).map(riskSummary);
  return send(res,{items:cases,counts:{urgent:cases.filter(c=>c.priority==='URGENT').length,overdue:cases.filter(c=>c.overdue).length},notice:'Internal response targets only; no legal response deadline is guaranteed.'});
 }
 const priority=p.match(/^\/api\/admin\/compliance\/cases\/(\d+)\/priority$/);
 if(m==='PATCH'&&priority){const admin=requireAdmin(req),b=await body(req),id=Number(priority[1]);
  if(!['STANDARD','URGENT'].includes(b.priority))fail('Priority must be STANDARD or URGENT');
  const note=String(b.note||'').trim();if(note.length<15||note.length>500)fail('Priority change requires 15–500 characters of justification');
  const c=one('SELECT id,status,priority FROM compliance_cases WHERE id=?',id);if(!c)fail('Case not found',404);if(['RESOLVED','REJECTED','CLOSED'].includes(c.status))fail('Case is closed',409);if(c.priority===b.priority)fail('Priority unchanged',409);
  db.exec('BEGIN');try{run('UPDATE compliance_cases SET priority=?,updated_at=? WHERE id=? AND status NOT IN (\'RESOLVED\',\'REJECTED\',\'CLOSED\')',b.priority,now(),id);run('INSERT INTO compliance_case_events(case_id,actor_id,action,details,created_at) VALUES(?,?,?,?,?)',id,admin.id,'PRIORITY_'+b.priority,note,now());db.exec('COMMIT')}catch(e){db.exec('ROLLBACK');throw e}
  return send(res,{ok:true,caseId:id,priority:b.priority,publicMediaUnchanged:true});
 }
 if(m==='GET'&&p==='/api/studio/upload-health'){
  const user=requireUser(req),limit=Number(url.searchParams.get('limit')||50);if(!Number.isSafeInteger(limit)||limit<1||limit>100)fail('Invalid limit');
  const items=all('SELECT id,status,attempts,expected_bytes AS expectedBytes,received_bytes AS receivedBytes,updated_at AS updatedAt,error FROM upload_sessions WHERE user_id=? ORDER BY updated_at DESC LIMIT ?',user.id,limit).map(x=>({id:x.id,status:x.status,attempts:x.attempts,expectedBytes:x.expectedBytes,receivedBytes:x.receivedBytes,updatedAt:x.updatedAt,stalled:['UPLOADING','PROCESSING'].includes(x.status)&&Date.parse(x.updatedAt)<Date.now()-3600000,hasError:!!x.error}));
  return send(res,{items,scope:'owner-only; no raw private-media paths or worker secrets'});
 }
 if(m==='GET'&&p==='/api/studio/rights-reminders'){
  const user=requireUser(req),days=Number(url.searchParams.get('days')||30);if(!Number.isSafeInteger(days)||days<1||days>180)fail('Days must be 1–180');
  const ends=new Date(Date.now()+days*86400000).toISOString();const items=all(`SELECT x.id AS uploadId,x.status AS uploadStatus,l.status AS reviewStatus,l.expires_at AS expiresAt FROM upload_sessions x JOIN media_license_reviews l ON l.upload_id=x.id WHERE x.user_id=? AND (l.status<>'VERIFIED' OR l.expires_at<=?) ORDER BY l.expires_at ASC LIMIT 100`,user.id,ends);
  return send(res,{items,notice:'Internal rights-review status; external authenticity and actual renewal must be verified by authorized staff. No automatic publication.'});
 }
 if(m==='GET'&&p==='/api/me/privacy/summary'){
  const user=requireUser(req),counts=one(`SELECT (SELECT COUNT(*) FROM watch_progress WHERE user_id=?) AS watchProgress,(SELECT COUNT(*) FROM search_history WHERE user_id=?) AS searchHistory,(SELECT COUNT(*) FROM playlists WHERE user_id=?) AS playlists,(SELECT COUNT(*) FROM favorites WHERE user_id=?) AS favorites`,user.id,user.id,user.id,user.id),prefs=one('SELECT pause_history AS pauseHistory, autoplay_next AS autoplay FROM user_preferences WHERE user_id=?',user.id);
  return send(res,{...counts,preferences:prefs||{pauseHistory:0,autoplay:0},otherUsersDataIncluded:false});
 }
 return false;
}
