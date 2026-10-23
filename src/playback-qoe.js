/** Privacy-minimizing, opt-in diagnostic counters. No IP, account, cookie, or session IDs stored. */
import {db,one,all,run,now} from './database.js';
import {rateLimit} from './security.js';
const json=(res,payload,status=200)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(payload));};
const error=(message,status=400)=>{const e=new Error(message);e.status=status;throw e;};
async function read(req){let s='';for await(const chunk of req){s+=chunk;if(s.length>4096)error('Diagnostic payload too large',413)}try{return JSON.parse(s)}catch{error('Invalid JSON')}}
const bounded=(value,min,max)=>typeof value==='number'&&Number.isFinite(value)&&value>=min&&value<=max;
export function ensureQoeTable(){db.exec(`CREATE TABLE IF NOT EXISTS video_qoe_daily (
 video_id INTEGER NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
 day TEXT NOT NULL,samples INTEGER NOT NULL DEFAULT 0,completions INTEGER NOT NULL DEFAULT 0,startup_failures INTEGER NOT NULL DEFAULT 0,
 startup_ms_total INTEGER NOT NULL DEFAULT 0,buffer_ms_total INTEGER NOT NULL DEFAULT 0,
 playback_ms_total INTEGER NOT NULL DEFAULT 0,errors_total INTEGER NOT NULL DEFAULT 0,
 switches_total INTEGER NOT NULL DEFAULT 0,updated_at TEXT NOT NULL,
 PRIMARY KEY(video_id,day));CREATE INDEX IF NOT EXISTS ix_qoe_day ON video_qoe_daily(day);`)}
/** Null response means this route was not handled. */
export async function playbackQoeApi(req,res,url,{requireUser}){
 const {pathname:p}=url;
 if(p==='/api/player/qoe'&&req.method==='POST'){
  if(process.env.SA_ENABLE_QOE_TELEMETRY!=='1')error('Playback telemetry disabled',503);
  const b=await read(req);
  if(b?.consent!==true)error('Explicit opt-in required');
  if(!Number.isSafeInteger(b.videoId)||b.videoId<1||!one("SELECT 1 FROM videos v WHERE v.id=? AND v.status='PUBLISHED' AND NOT EXISTS(SELECT 1 FROM content_holds h WHERE h.video_id=v.id AND h.closed_at IS NULL)",b.videoId))error('Video unavailable',404);
  for(const [key,cap] of [['startupMs',600000],['rebufferMs',36000000],['playbackMs',36000000],['errors',100],['qualitySwitches',100]])if(!bounded(b[key],0,cap)||!Number.isInteger(b[key]))error(`Invalid ${key}`);
  if(typeof b.completed!=='boolean'||typeof b.startupFailure!=='boolean'||b.rebufferMs>b.playbackMs+600000)error('Invalid playback diagnostics');
  rateLimit('anonymous-qoe:'+String(req.socket.remoteAddress||'unknown'),30,60000);
  ensureQoeTable();const day=now().slice(0,10);
  run(`INSERT INTO video_qoe_daily(video_id,day,samples,completions,startup_failures,startup_ms_total,buffer_ms_total,playback_ms_total,errors_total,switches_total,updated_at)
    VALUES(?,?,1,?,?,?,?,?,?,?,?) ON CONFLICT(video_id,day) DO UPDATE SET
    samples=samples+1,completions=completions+excluded.completions,startup_failures=startup_failures+excluded.startup_failures,
    startup_ms_total=startup_ms_total+excluded.startup_ms_total,
    buffer_ms_total=buffer_ms_total+excluded.buffer_ms_total,playback_ms_total=playback_ms_total+excluded.playback_ms_total,
    errors_total=errors_total+excluded.errors_total,switches_total=switches_total+excluded.switches_total,updated_at=excluded.updated_at`,
    b.videoId,day,Number(b.completed),Number(b.startupFailure),b.startupMs,b.rebufferMs,b.playbackMs,b.errors,b.qualitySwitches,now());
  run("DELETE FROM video_qoe_daily WHERE day < date('now','-30 days')");
  json(res,{ok:true,notice:'Aggregate totals only. No personal identifier retained.'},202);return true;
 }
 if(p==='/api/studio/analytics/qoe'&&req.method==='GET'){
  const user=requireUser(req);ensureQoeTable();
  const rows=all(`SELECT v.id AS videoId,v.title,SUM(q.samples) AS samples,SUM(q.completions) AS completions,SUM(q.startup_failures) AS startupFailures,
    SUM(q.startup_ms_total) AS startupMsTotal,SUM(q.buffer_ms_total) AS bufferMsTotal,
    SUM(q.playback_ms_total) AS playbackMsTotal,SUM(q.errors_total) AS errors,
    SUM(q.switches_total) AS qualitySwitches
    FROM upload_sessions x JOIN videos v ON v.id=x.video_id JOIN video_qoe_daily q ON q.video_id=v.id
    WHERE x.user_id=? AND x.status='PUBLISHED' AND v.status='PUBLISHED' AND NOT EXISTS (SELECT 1 FROM content_holds h WHERE h.video_id=v.id AND h.closed_at IS NULL) AND q.day>=date('now','-30 days')
    GROUP BY v.id ORDER BY samples DESC LIMIT 50`,user.id);
  const items=rows.map(r=>({videoId:r.videoId,title:r.title,samples:r.samples,completions:r.completions,startupFailures:r.samples>=5?r.startupFailures:null,
   startupAverageMs:r.samples>=5?Math.round(r.startupMsTotal/r.samples):null,
   rebufferRatio:r.samples>=5&&r.playbackMsTotal+r.bufferMsTotal>0?Number((r.bufferMsTotal/(r.playbackMsTotal+r.bufferMsTotal)).toFixed(3)):null,
   errors:r.samples>=5?r.errors:null,qualitySwitches:r.samples>=5?r.qualitySwitches:null,
   privacySuppressed:r.samples<5}));
  json(res,{items,windowDays:30,consent:'opt-in',notice:'Aggregate playback diagnostics, not full audience retention or unique-viewer counts.'});return true;
 }
 return false;
}
