/** Checkpoint 36: least-privilege, opt-in-only playback quality aggregates.
 * Source is non-identifying session totals. Never imply these are verified views,
 * unique viewers, qualified watch time, or full retention measurements.
 */
import {one,all} from './database.js';
const fail=(message,status=400)=>{const e=new Error(message);e.status=status;throw e};
const reply=(res,data)=>{res.writeHead(200,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow'});res.end(JSON.stringify(data));return true};
const cleanNumber=n=>Number.isFinite(n)?n:0;
export async function creatorInsights36Api(req,res,url,{requireUser}){
 if(req.method!=='GET'||url.pathname!=='/api/studio/analytics/playback-trends')return false;
 const user=requireUser(req),params=url.searchParams;
 const daysString=params.get('days')||'30';
 if(!['7','30'].includes(daysString))fail('Choose the 7-day or 30-day period');
 const days=Number(daysString);
 const ownerString=params.get('ownerId');
 if(ownerString!==null&&!/^[1-9][0-9]{0,9}$/.test(ownerString))fail('Invalid owner ID');
 const ownerId=ownerString===null?user.id:Number(ownerString);
 if(!Number.isSafeInteger(ownerId))fail('Invalid owner ID');
 const approved=one("SELECT 1 FROM creator_profiles WHERE user_id=? AND status='APPROVED'",ownerId);
 if(!approved)fail('Creator workspace unavailable',404);
 if(user.id!==ownerId){
  const role=one("SELECT role FROM creator_collaborators WHERE owner_id=? AND collaborator_id=? AND status='ACCEPTED'",ownerId,user.id)?.role;
  if(!['ANALYST','EDITOR'].includes(role))fail('Creator analytics unavailable',403);
 }
 // Player telemetry is opt-in and daily aggregated. Uploaded, published videos only.
 const rows=all(`SELECT v.id AS videoId,v.title,q.day,SUM(q.samples) AS samples,
 SUM(q.completions) AS completions,SUM(q.playback_ms_total) AS playbackMs,
 SUM(q.buffer_ms_total) AS bufferMs,SUM(q.startup_ms_total) AS startupMs,
 SUM(q.errors_total) AS errors,SUM(q.startup_failures) AS startupFailures,
 SUM(q.switches_total) AS qualitySwitches
 FROM upload_sessions x JOIN videos v ON v.id=x.video_id
 JOIN video_qoe_daily q ON q.video_id=v.id
 WHERE x.user_id=? AND x.status='PUBLISHED' AND v.status='PUBLISHED'
 AND NOT EXISTS(SELECT 1 FROM content_holds h WHERE h.video_id=v.id AND h.closed_at IS NULL)
 AND q.day>=date('now',?) AND q.day<=date('now')
 GROUP BY v.id,q.day ORDER BY q.day DESC,v.id LIMIT 3000`,ownerId,`-${days-1} days`);
 const byVideo=new Map();
 for(const r of rows){let x=byVideo.get(r.videoId);if(!x){x={videoId:r.videoId,title:r.title,samples:0,completions:0,playbackMs:0,bufferMs:0,startupMs:0,errors:0,startupFailures:0,qualitySwitches:0,days:new Set()};byVideo.set(r.videoId,x)}
  for(const field of ['samples','completions','playbackMs','bufferMs','startupMs','errors','startupFailures','qualitySwitches'])x[field]+=cleanNumber(r[field]);x.days.add(r.day);
 }
 const items=[...byVideo.values()].map(x=>{
  if(x.samples<5)return {videoId:x.videoId,title:x.title,privacySuppressed:true,reportingDays:x.days.size,samples:null,completedSessions:null,optInPlaybackHours:null,averageStartupMs:null,rebufferRatio:null,errors:null,startupFailures:null,qualitySwitches:null};
  return {videoId:x.videoId,title:x.title,privacySuppressed:false,reportingDays:x.days.size,samples:x.samples,
   completedSessions:x.completions,optInPlaybackHours:Number((x.playbackMs/3600000).toFixed(3)),
   averageStartupMs:Math.round(x.startupMs/x.samples),rebufferRatio:x.playbackMs+x.bufferMs>0?Number((x.bufferMs/(x.playbackMs+x.bufferMs)).toFixed(4)):null,
   errors:x.errors,startupFailures:x.startupFailures,qualitySwitches:x.qualitySwitches};
 }).sort((a,b)=>(b.samples??-1)-(a.samples??-1)||a.videoId-b.videoId);
 return reply(res,{ownerId,days,items,privacyThreshold:5,source:'Aggregated, explicitly opt-in local playback diagnostics',disclaimer:'Not unique viewers, qualified watch time, audited traffic, full audience retention or revenue. Low-sample cohorts are suppressed.'});
}
