/** Checkpoint 02 — local-only authorized sample-media creator pipeline.
 * Uploads and processed assets are private until human approval; no production verification is claimed.
 * Requires optional FFmpeg and ffprobe binaries on PATH for actual processing.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawn} from 'node:child_process';
import {promisify} from 'node:util';
import {execFile} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {db,all,one,run,now} from './database.js';
import {scanUploadedFile} from './media-safety.js';
import {queueVideoRevocation} from './media-revocation.js';
import {storeUploadChunk} from './upload-chunk-store.js';
import {servePrivateMedia} from './private-media-response.js';
import {extraRenditions,encodedBandwidth,composeMaster} from './media-ladder.js';
const execFileAsync=promisify(execFile);
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const PRIVATE=process.env.PRIVATE_PATH||path.join(ROOT,'data','private');
const PARTS=path.join(PRIVATE,'uploads');
const PROCESSED=path.join(PRIVATE,'processed');
fs.mkdirSync(PARTS,{recursive:true});fs.mkdirSync(PROCESSED,{recursive:true});
const MAX_FILE=25*1024*1024,MAX_CHUNK=2*1024*1024;
const MAX_TRANSCODE_MS=Number(process.env.SA_TRANSCODE_TIMEOUT_MS||90000);
if(!Number.isFinite(MAX_TRANSCODE_MS)||MAX_TRANSCODE_MS<10000||MAX_TRANSCODE_MS>600000)throw Error('Invalid SA_TRANSCODE_TIMEOUT_MS (10000–600000).');
const busy=new Set();
const queue=[];let activeProcessing=false;
function enqueue(id){
 // Database QUEUED status is authoritative. Development tests run inline; normal
 // servers use a separate supervised worker process to keep FFmpeg off the API.
 if(process.env.NODE_ENV!=='test'&&process.env.MEDIA_WORKER_MODE!=='inline')return;
 if(queue.includes(id)||busy.has('job-'+id))return;
 queue.push(id);if(!activeProcessing)setImmediate(drainQueue);
}
async function drainQueue(){if(activeProcessing)return;activeProcessing=true;try{while(queue.length)await processUpload(queue.shift())}finally{activeProcessing=false}}
const publicUpload=u=>u&&({id:u.id,videoId:u.video_id,title:u.title,slug:u.slug,filename:u.original_filename,expectedBytes:u.expected_bytes,receivedBytes:u.received_bytes,status:u.status,videoStatus:u.video_status,description:u.description,createdAt:u.created_at,updatedAt:u.updated_at,error:u.error,attempts:u.attempts,sha256:u.sha256,duration:u.processed_duration,reviewNote:u.review_note});
function fail(msg,status=400){const e=new Error(msg);e.status=status;throw e}
function send(res,obj,status=200,headers={}){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...headers});res.end(JSON.stringify(obj))}
async function body(req){let size=0;const arr=[];for await(const buf of req){size+=buf.length;if(size>65536)fail('Request too large',413);arr.push(buf)}try{return JSON.parse(Buffer.concat(arr).toString()||'{}')}catch{fail('Invalid JSON')}}
function creator(req,requireUser){const user=requireUser(req);if(user.role==='DEMO')fail('Register a local account to apply as a creator.',403);return user}
function approvedCreator(req,requireUser){const u=creator(req,requireUser);const profile=one("SELECT * FROM creator_profiles WHERE user_id=? AND status='APPROVED'",u.id);if(!profile)fail('A moderator must approve your creator profile before uploads are enabled.',403);return {user:u,profile}}
function row(id){return one('SELECT x.*,v.title,v.slug,v.status AS video_status FROM upload_sessions x JOIN videos v ON v.id=x.video_id WHERE x.id=?',id)}
function audit(actor,type,id,action,note=''){run('INSERT INTO moderation_audit(actor_id,object_type,object_id,action,note,created_at) VALUES(?,?,?,?,?,?)',actor,type,String(id),action,note,now())}
function safeName(s){return String(s||'').replace(/[^a-zA-Z0-9._ -]/g,'_').slice(0,120)}
function validateVtt(input,duration){
 if(input==='')return '';
 if(typeof input!=='string'||Buffer.byteLength(input,'utf8')>12000||!input.startsWith('WEBVTT')||/[<\x00]/.test(input))fail('Captions must be a plain-text WEBVTT file up to 12 KB.');
 const timings=[...input.matchAll(/(\d{2}:\d{2}:\d{2}\.\d{3})\s+-->\s+(\d{2}:\d{2}:\d{2}\.\d{3})/g)];
 const seconds=t=>{const [h,m,s]=t.split(':');return Number(h)*3600+Number(m)*60+Number(s)};
 if(timings.length<1||timings.length>100)fail('Captions must contain 1 to 100 valid timestamp ranges.');
 for(const t of timings)if(seconds(t[1])>=seconds(t[2])||seconds(t[2])>duration+0.5)fail('Caption timestamps must be valid and within the video duration.');
 return input;
}
function evidenceItems(id){return all('SELECT kind,reference,checked_at AS checkedAt FROM review_evidence WHERE upload_id=? ORDER BY kind',id)}

function runCommand(program,args,timeout=MAX_TRANSCODE_MS){return new Promise((resolve,reject)=>{
 const child=spawn(program,args,{stdio:['ignore','ignore','pipe']});let error='',done=false;
 const timer=setTimeout(()=>{child.kill('SIGKILL');error+=' [processing timeout exceeded]'},timeout);
 child.stderr.on('data',b=>{if(error.length<1600)error+=b.toString().slice(0,800)});
 child.once('error',e=>{if(done)return;done=true;clearTimeout(timer);reject(e)});
 child.once('close',code=>{if(done)return;done=true;clearTimeout(timer);code===0?resolve():reject(Error(`Media worker failed (${program}, ${code}): ${error.slice(0,300)}`))});
 })}
export async function processUpload(id){if(busy.has('job-'+id))return;busy.add('job-'+id);
 const source=path.join(PARTS,id+'.part'),target=path.join(PROCESSED,id);
 try{
  const x=row(id);if(!x||x.status!=='QUEUED')return;
  const claim=run("UPDATE upload_sessions SET status='PROCESSING',attempts=attempts+1,updated_at=? WHERE id=? AND status='QUEUED'",now(),id);
  if(!claim.changes)return; // Atomic SQLite state transition prevents duplicate claims by competing loops.

  logProcessing(id,'PROCESSING','Worker claimed upload');
  await scanUploadedFile(source);
  const {stdout}=await execFileAsync(process.env.FFPROBE_PATH||'ffprobe',['-v','error','-protocol_whitelist','file,pipe','-show_entries','format=duration:stream=codec_type,width,height','-of','json',source],{timeout:20000,maxBuffer:256000});
  const metadata=JSON.parse(stdout),vid=metadata.streams?.find(s=>s.codec_type==='video'),duration=Number(metadata.format?.duration);
  if(!vid||!(duration>0&&duration<=120)||vid.width>3840||vid.height>2160||vid.width<16||vid.height<16)throw Error('Only valid video files up to 120 seconds and 4K resolution are accepted.');
  const checksum=await new Promise((resolve,reject)=>{const h=crypto.createHash('sha256');const stream=fs.createReadStream(source);stream.on('data',part=>h.update(part));stream.once('error',reject);stream.once('end',()=>resolve(h.digest('hex')))});
  if(checksum!==x.sha256)throw Error('Uploaded media hash verification failed.');
  fs.rmSync(target,{recursive:true,force:true});fs.mkdirSync(target,{recursive:true});
  const transcoded=path.join(target,'playback.mp4');
  await runCommand(process.env.FFMPEG_PATH||'ffmpeg',['-hide_banner','-loglevel','error','-nostdin','-y','-threads','2','-protocol_whitelist','file,pipe','-i',source,'-map','0:v:0','-map','0:a:0?','-t','120','-c:v','libx264','-preset','veryfast','-crf','28','-pix_fmt','yuv420p','-c:a','aac','-b:a','96k','-movflags','+faststart',transcoded]);
  await runCommand(process.env.FFMPEG_PATH||'ffmpeg',['-hide_banner','-loglevel','error','-nostdin','-y','-threads','2','-protocol_whitelist','file,pipe','-i',transcoded,'-map','0:v:0','-map','0:a:0?','-vf','scale=320:-2','-c:v','libx264','-preset','veryfast','-crf','33','-pix_fmt','yuv420p','-c:a','aac','-b:a','48k','-movflags','+faststart',path.join(target,'low.mp4')]);
  // Keep the legacy two profiles while adding only source-supported output heights.
  // The extra profiles are skipped if a source is too small: NEVER upscale user media.
  const profiles=[
   {profile:'lo',file:'low.mp4',width:320,height:Math.max(16,Math.floor(320*vid.height/vid.width/2)*2),label:'180p'},
   {profile:'hi',file:'playback.mp4',width:vid.width,height:vid.height,label:'Original'}
  ];
  for(const r of extraRenditions(vid.width,vid.height)){
   const file=r.profile+'.mp4';
   await runCommand(process.env.FFMPEG_PATH||'ffmpeg',['-hide_banner','-loglevel','error','-nostdin','-y','-threads','2','-protocol_whitelist','file,pipe','-i',transcoded,'-map','0:v:0','-map','0:a:0?','-vf',`scale=-2:${r.height}`,'-c:v','libx264','-preset','veryfast','-b:v',`${r.videoBitrate}k`,'-maxrate',`${r.videoBitrate}k`,'-bufsize',`${r.videoBitrate*2}k`,'-pix_fmt','yuv420p','-c:a','aac','-b:a','64k','-movflags','+faststart',path.join(target,file)]);
   profiles.push({...r,file,width:Math.ceil((r.height*vid.width/vid.height)/2)*2});
  }
  const master=[];
  for(const profile of profiles){
   await runCommand(process.env.FFMPEG_PATH||'ffmpeg',['-hide_banner','-loglevel','error','-nostdin','-y','-threads','2','-protocol_whitelist','file,pipe','-i',path.join(target,profile.file),'-c','copy','-f','hls','-hls_time','2','-hls_playlist_type','vod','-hls_segment_filename',path.join(target,profile.profile+'_seg_%03d.ts'),path.join(target,profile.profile+'.m3u8')]);
   master.push({...profile,bandwidth:encodedBandwidth(path.join(target,profile.file),duration)});
  }
  fs.writeFileSync(path.join(target,'master.m3u8'),composeMaster(master));
  fs.writeFileSync(path.join(target,'renditions.json'),JSON.stringify(master.map(({profile,label})=>({profile,label:profile==='hi'?'Original':profile==='lo'?'180p':label})),null,2));
  await runCommand(process.env.FFMPEG_PATH||'ffmpeg',['-hide_banner','-loglevel','error','-nostdin','-y','-threads','2','-protocol_whitelist','file,pipe','-i',transcoded,'-frames:v','1','-q:v','4',path.join(target,'poster.jpg')]);
  // Scrubbing storyboard frames are private media, served only through authorized /api/media paths.
  for(let index=0;index<4;index++){
   const seek=Math.max(0,Math.min(duration-0.2,Math.floor(index*duration/4)));
   await runCommand(process.env.FFMPEG_PATH||'ffmpeg',['-hide_banner','-loglevel','error','-nostdin','-y','-threads','1','-protocol_whitelist','file,pipe','-ss',String(seek),'-i',transcoded,'-frames:v','1','-vf','scale=192:-2','-q:v','5',path.join(target,`preview_${index}.jpg`)]);
  }
  run("UPDATE videos SET media_url=?,poster=?,duration=?,quality=?,status='PENDING_REVIEW' WHERE id=?",`/api/media/${id}/playback.mp4`,`/api/media/${id}/poster.jpg`,Math.round(duration),'HD',x.video_id);
  run("UPDATE upload_sessions SET status='IN_REVIEW',processed_duration=?,updated_at=?,error=NULL WHERE id=?",duration,now(),id);
  logProcessing(id,'IN_REVIEW','Transcoding complete, source-aware HLS ladder available');
  // Processed files are the playback originals for this local prototype. Free staging space.
  fs.rmSync(source,{force:true});
 }catch(e){const message=String(e.message||'Media processing failed').slice(0,400);console.warn('StreamAtlas upload processing:',id,message);
  run("UPDATE upload_sessions SET status='FAILED',updated_at=?,error=? WHERE id=?",now(),message,id);run("UPDATE videos SET status='FAILED' WHERE id=(SELECT video_id FROM upload_sessions WHERE id=?)",id);
  logProcessing(id,'FAILED',message);if(one('SELECT attempts FROM upload_sessions WHERE id=?',id)?.attempts>=2){run('INSERT OR REPLACE INTO processing_dead_letters(upload_id,attempt_count,failure_reason,created_at) VALUES(?,?,?,?)',id,2,message,now());logProcessing(id,'DEAD_LETTER','Processing attempts exhausted; operator review required')}fs.rmSync(target,{recursive:true,force:true});
 }finally{busy.delete('job-'+id)}
}
function logProcessing(id,state,message){run('INSERT INTO processing_events(upload_id,state,message,created_at) VALUES(?,?,?,?)',id,state,String(message).slice(0,400),now())}
// Worker process startup recovers interrupted jobs; API processes only in explicit inline/test mode.
export function recoverUploads(){
 // Called only after obtaining the singleton worker lease. An interrupted second
 // attempt must NOT be silently retried a third time after worker restart.
 const waiting=all("SELECT id,status,attempts,video_id FROM upload_sessions WHERE status IN ('QUEUED','PROCESSING') ORDER BY created_at,id");
 const summary={requeued:0,deadLettered:0};
 for(const x of waiting){
  if(x.attempts>=2){
   const reason='Interrupted processing after maximum two attempts; operator review required';
   db.exec('BEGIN IMMEDIATE');try{
    run("UPDATE upload_sessions SET status='FAILED',error=?,updated_at=? WHERE id=? AND status IN ('QUEUED','PROCESSING')",reason,now(),x.id);
    run("UPDATE videos SET status='FAILED' WHERE id=? AND status<>'PUBLISHED'",x.video_id);
    run('INSERT OR REPLACE INTO processing_dead_letters(upload_id,attempt_count,failure_reason,created_at) VALUES(?,?,?,?)',x.id,x.attempts,reason,now());
    logProcessing(x.id,'DEAD_LETTER',reason);db.exec('COMMIT');summary.deadLettered++;
   }catch(e){db.exec('ROLLBACK');throw e}
  }else{
   if(x.status==='PROCESSING'){
    run("UPDATE upload_sessions SET status='QUEUED',updated_at=? WHERE id=? AND status='PROCESSING'",now(),x.id);
    logProcessing(x.id,'RECOVERED','Interrupted processing returned to durable queue');
   }
   enqueue(x.id);summary.requeued++;
  }
 }
 return summary;
}
function feedMedia(req,res,p,{admin=false}={}){const m=admin?p.match(/^\/api\/admin\/uploads\/([a-f0-9-]{36})\/preview\/(poster\.jpg|playback\.mp4|preview_[0-3]\.jpg)$/):p.match(/^\/api\/media\/([a-f0-9-]{36})\/(master\.m3u8|hi\.m3u8|lo\.m3u8|r(?:360|480|720|1080)\.m3u8|poster\.jpg|playback\.mp4|low\.mp4|r(?:360|480|720|1080)\.mp4|(?:hi|lo|r360|r480|r720|r1080)_seg_\d{3}\.ts|preview_[0-3]\.jpg|captions\.vtt)$/);if(!m)fail('Media not found',404);
 const [_,id,file]=m;const clip=one('SELECT x.status AS state,v.status AS visibility FROM upload_sessions x JOIN videos v ON v.id=x.video_id WHERE x.id=?',id);
 if(!clip||(admin?!['IN_REVIEW','PUBLISHED','REJECTED'].includes(clip.state):clip.state!=='PUBLISHED'||clip.visibility!=='PUBLISHED'))fail('Media unavailable',404);
 if(file==='captions.vtt'){
   const cap=one('SELECT vc.vtt FROM video_captions vc JOIN upload_sessions x ON x.video_id=vc.video_id WHERE x.id=?',id);
   if(!cap)fail('Captions not found',404);
   res.writeHead(200,{'Content-Type':'text/vtt; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
   if(req.method==='HEAD')res.end();else res.end(cap.vtt);return;
 }
 const target=path.join(PROCESSED,id,file);
 const mime=file.endsWith('.m3u8')?'application/vnd.apple.mpegurl':file.endsWith('.ts')?'video/mp2t':file.endsWith('.jpg')?'image/jpeg':'video/mp4';
 servePrivateMedia(req,res,target,mime,{trustedRoot:PROCESSED});
}
export async function uploadApi(req,res,url,{requireUser,requireAdmin,requireMediaViewer=null,requireMediaEntitlement=null}){
 const p=url.pathname,method=req.method;
 if(p.startsWith('/api/media/')){if(requireMediaViewer)requireMediaViewer(req);if(requireMediaEntitlement){const m=p.match(/^\/api\/media\/([a-f0-9-]{36})\//);if(!m)fail('Invalid media reference',404);requireMediaEntitlement(m[1],req)}if(!['GET','HEAD'].includes(method))fail('Method not allowed',405);feedMedia(req,res,p);return true}
 if(/^\/api\/admin\/uploads\/[a-f0-9-]{36}\/preview\//.test(p)){requireAdmin(req);if(!['GET','HEAD'].includes(method))fail('Method not allowed',405);feedMedia(req,res,p,{admin:true});return true}
 const creatorPreview=p.match(/^\/api\/studio\/uploads\/([a-f0-9-]{36})\/preview\/(preview_[0-3]\.jpg)$/);
 if(creatorPreview){
  if(!['GET','HEAD'].includes(method))fail('Method not allowed',405);
  const u=requireUser(req),x=row(creatorPreview[1]);
  if(!x||x.user_id!==u.id||!['IN_REVIEW','PUBLISHED'].includes(x.status))fail('Preview unavailable',404);
  feedMedia(req,res,`/api/admin/uploads/${x.id}/preview/${creatorPreview[2]}`,{admin:true});return true;
 }
 if(!(p.startsWith('/api/studio/')||p.startsWith('/api/admin/creators')||p.startsWith('/api/admin/uploads')||p==='/api/admin/audit'))return false;
 if(method==='GET'&&p==='/api/studio/overview'){
  const u=requireUser(req),profile=one('SELECT * FROM creator_profiles WHERE user_id=?',u.id);
  const items=all('SELECT x.*,v.title,v.slug,v.status AS video_status FROM upload_sessions x JOIN videos v ON v.id=x.video_id WHERE x.user_id=? ORDER BY x.created_at DESC LIMIT 100',u.id).map(publicUpload);
  send(res,{creator:profile||null,items,limits:{maxBytes:MAX_FILE,chunkBytes:MAX_CHUNK,maxDurationSeconds:120},ffmpegRequired:true});return true
 }
 if(method==='GET'&&p==='/api/studio/analytics'){
  const u=requireUser(req);const profile=one('SELECT channel_id,status FROM creator_profiles WHERE user_id=?',u.id);if(!profile)fail('Creator profile required.',403);
  const summary=one(`SELECT COUNT(*) AS totalUploads,
    COALESCE(SUM(CASE WHEN x.status='PUBLISHED' AND v.status='PUBLISHED' THEN 1 ELSE 0 END),0) AS published,
    COALESCE(SUM(CASE WHEN x.status='IN_REVIEW' THEN 1 ELSE 0 END),0) AS awaitingReview,
    COALESCE(SUM(v.views),0) AS totalViews,COALESCE(SUM(v.likes),0) AS totalLikes,
    COALESCE(SUM(x.expected_bytes),0) AS originalBytes
    FROM upload_sessions x JOIN videos v ON v.id=x.video_id WHERE x.user_id=?`,u.id);
  const items=all(`SELECT v.id,v.title,v.slug,v.views,v.likes,v.dislikes,v.status,x.status AS uploadStatus,x.processed_duration AS duration,
    (SELECT COUNT(*) FROM comments c WHERE c.video_id=v.id AND c.hidden=0) AS comments
    FROM upload_sessions x JOIN videos v ON v.id=x.video_id WHERE x.user_id=? ORDER BY v.views DESC,v.id DESC LIMIT 30`,u.id);
  send(res,{summary,items,profileStatus:profile.status});return true
 }
 const metadataPath=p.match(/^\/api\/studio\/uploads\/([a-f0-9-]{36})\/metadata$/);
 if(method==='PATCH'&&metadataPath){
  const u=requireUser(req),x=row(metadataPath[1]);if(!x||x.user_id!==u.id)fail('Upload not found',404);
  if(!['UPLOADING','FAILED','IN_REVIEW'].includes(x.status))fail('Metadata may only be changed before an upload is approved.',409);
  const b=await body(req),title=String(b.title||'').trim(),description=String(b.description||'').trim();
  if(title.length<8||title.length>150||description.length>1500)fail('Title must be 8–150 characters; description at most 1500.');
  const categoryId=Number(b.categoryId);if(!Number.isInteger(categoryId)||!one('SELECT id FROM categories WHERE id=?',categoryId))fail('Valid category required.');
  const chapters=b.chapters===undefined?[]:b.chapters;
  if(!Array.isArray(chapters)||chapters.length>15)fail('Supply up to 15 chapters.');
  const processed=Number(x.processed_duration)||120;let last=-1;
  const captions=b.captions===undefined?undefined:validateVtt(String(b.captions||''),processed);
  const parsed=[];for(const ch of chapters){const at=Number(ch.start),text=String(ch.title||'').trim();
   if(!Number.isFinite(at)||at<0||at>=processed||at<=last||at>120||text.length<2||text.length>90)fail('Chapters must have ascending unique timestamps and titles (2–90 characters) within the video.');
   parsed.push({start:at,title:text});last=at;}
  db.exec('BEGIN');try{
   run('UPDATE videos SET title=? WHERE id=?',title,x.video_id);run('UPDATE upload_sessions SET description=?,updated_at=? WHERE id=?',description,now(),x.id);
   run('DELETE FROM video_categories WHERE video_id=?',x.video_id);run('INSERT INTO video_categories(video_id,category_id) VALUES(?,?)',x.video_id,categoryId);
   run('DELETE FROM video_chapters WHERE video_id=?',x.video_id);
   for(const chapter of parsed)run('INSERT INTO video_chapters(video_id,start_seconds,title) VALUES(?,?,?)',x.video_id,chapter.start,chapter.title);
   if(captions!==undefined){run('DELETE FROM video_captions WHERE video_id=?',x.video_id);if(captions)run('INSERT INTO video_captions(video_id,vtt,language) VALUES(?,?,?)',x.video_id,captions,'en');}
   db.exec('COMMIT');
  }catch(e){db.exec('ROLLBACK');throw e}
  send(res,{ok:true,title,description,categoryId,chapters:parsed,hasCaptions:!!captions});return true
 }
 if(method==='GET'&&metadataPath){
  const u=requireUser(req),x=row(metadataPath[1]);if(!x||x.user_id!==u.id)fail('Upload not found',404);
  const data=one('SELECT vc.category_id AS categoryId,v.title FROM videos v JOIN video_categories vc ON vc.video_id=v.id WHERE v.id=? LIMIT 1',x.video_id);
  send(res,{id:x.id,title:data?.title,description:x.description,categoryId:data?.categoryId,chapters:all('SELECT start_seconds AS start,title FROM video_chapters WHERE video_id=? ORDER BY start_seconds',x.video_id),captions:one('SELECT vtt FROM video_captions WHERE video_id=?',x.video_id)?.vtt||'',status:x.status,duration:x.processed_duration});return true
 }
 if(method==='POST'&&p==='/api/studio/apply'){
  const u=creator(req,requireUser),b=await body(req),displayName=String(b.displayName||'').trim();
  if(displayName.length<3||displayName.length>70||b.agreePolicies!==true)fail('Enter a display name (3–70 characters) and acknowledge uploader policies.');
  const exists=one('SELECT status FROM creator_profiles WHERE user_id=?',u.id);if(exists)fail('Creator application already exists: '+exists.status,409);
  run('INSERT INTO creator_profiles(user_id,display_name,status,applied_at) VALUES(?,?,?,?)',u.id,displayName,'PENDING',now());send(res,{ok:true,status:'PENDING'},201);return true
 }
 if(method==='GET'&&p==='/api/admin/creators'){
  requireAdmin(req);send(res,{items:all(`SELECT cp.*,u.email,u.name FROM creator_profiles cp JOIN users u ON u.id=cp.user_id ORDER BY CASE WHEN cp.status='PENDING' THEN 0 ELSE 1 END,cp.applied_at DESC LIMIT 200`)});return true
 }
 const appReview=p.match(/^\/api\/admin\/creators\/(\d+)\/decision$/);
 if(method==='PATCH'&&appReview){const admin=requireAdmin(req),b=await body(req),id=Number(appReview[1]);if(!['APPROVED','REJECTED','SUSPENDED','REINSTATED'].includes(b.decision))fail('Invalid decision');
  const profile=one('SELECT * FROM creator_profiles WHERE user_id=?',id);if(!profile)fail('Application not found',404);if(['APPROVED','REJECTED'].includes(b.decision)&&profile.status!=='PENDING')fail('Only pending applications can be approved or rejected.',409);
  if(b.decision==='SUSPENDED'&&profile.status!=='APPROVED')fail('Only approved creators may be suspended.',409);
  if(b.decision==='REINSTATED'&&profile.status!=='SUSPENDED')fail('Only suspended creators may be reinstated.',409);
  const note=String(b.note||'').trim().slice(0,400);if(note.length<8)fail('A reviewer note of at least 8 characters is required.');
  db.exec('BEGIN');try{
    if(b.decision==='APPROVED'){
      const suffix=crypto.randomUUID().slice(0,8),siteSlug=`creator-site-${id}-${suffix}`,channelSlug=`creator-${id}-${suffix}`;
      const siteId=Number(run('INSERT INTO sites(network_id,name,slug,last_updated) VALUES(NULL,?,?,?)',profile.display_name+' Studio',siteSlug,now()).lastInsertRowid);
      const channelId=Number(run('INSERT INTO channels(site_id,name,slug) VALUES(?,?,?)',siteId,profile.display_name,channelSlug).lastInsertRowid);
      run('UPDATE creator_profiles SET channel_id=? WHERE user_id=?',channelId,id);
    }
    if(b.decision==='SUSPENDED'){const affected=all("SELECT video_id FROM upload_sessions WHERE user_id=? AND status='PUBLISHED'",id);run("UPDATE videos SET status='HIDDEN' WHERE id IN (SELECT video_id FROM upload_sessions WHERE user_id=?) AND status='PUBLISHED'",id);for(const v of affected)queueVideoRevocation(v.video_id,'CREATOR_SUSPENDED');}
    const nextStatus=b.decision==='REINSTATED'?'APPROVED':b.decision;
    run('UPDATE creator_profiles SET status=?,reviewed_at=?,reviewed_by=?,review_note=? WHERE user_id=?',nextStatus,now(),admin.id,note,id);
    audit(admin.id,'creator',id,b.decision,note);db.exec('COMMIT');
  }catch(e){db.exec('ROLLBACK');throw e}
  send(res,{ok:true,status:b.decision});return true
 }
 if(method==='POST'&&p==='/api/studio/uploads/initiate'){
  const {user:u,profile}=approvedCreator(req,requireUser),b=await body(req);
  const title=String(b.title||'').trim(),size=Number(b.size),filename=safeName(b.filename),mime=String(b.mime||'');
  if(title.length<8||title.length>150)fail('Video title must be 8–150 characters.');
  if(!Number.isSafeInteger(size)||size<1024||size>MAX_FILE)fail('Video must be at least 1 KB and no more than 25 MB.',413);
  if(!/\.(mp4|webm|mov)$/i.test(filename)||!['video/mp4','video/webm','video/quicktime','application/octet-stream'].includes(mime))fail('Only MP4, WebM, and MOV video uploads are supported.');
  if(b.rightsDeclaration!==true||b.adultsDeclaration!==true||b.consentDeclaration!==true)fail('All three rights, adulthood and consent declarations are required.');
  const categoryId=Number(b.categoryId);if(!Number.isInteger(categoryId)||!one('SELECT 1 FROM categories WHERE id=?',categoryId))fail('Choose a valid category.');
  if(one("SELECT COUNT(*) AS n FROM upload_sessions WHERE user_id=? AND status IN ('UPLOADING','QUEUED','PROCESSING','IN_REVIEW')",u.id).n>=5)fail('You already have five outstanding uploads.',429);
  const channel=one('SELECT ch.id,ch.site_id FROM channels ch WHERE ch.id=?',profile.channel_id);
  if(!channel)fail('Creator channel not provisioned.',409);
  const id=crypto.randomUUID(),slug=`${title.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,55)||'upload'}-${id.slice(0,8)}`;
  db.exec('BEGIN');let videoId;
  try{
   videoId=Number(run('INSERT INTO videos(title,slug,site_id,channel_id,poster,media_url,duration,quality,views,likes,dislikes,published_at,status) VALUES(?,?,?,?,?,?,?,?,0,0,0,?,?)',title,slug,channel.site_id,channel.id,'/assets/posters/poster-1.jpg','',0,'Processing',now(),'DRAFT').lastInsertRowid);
   run('INSERT INTO video_categories(video_id,category_id) VALUES(?,?)',videoId,categoryId);
   run('INSERT INTO upload_sessions(id,user_id,video_id,original_filename,declared_type,expected_bytes,description,rights_declaration,adults_declaration,consent_declaration,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)',id,u.id,videoId,filename,mime,size,String(b.description||'').slice(0,1500),1,1,1,now(),now());
   db.exec('COMMIT');
  }catch(e){db.exec('ROLLBACK');throw e}
  send(res,{id,videoId,slug,status:'UPLOADING',chunkBytes:MAX_CHUNK,expectedBytes:size},201);return true
 }
 const uploadChunk=p.match(/^\/api\/studio\/uploads\/([a-f0-9-]{36})\/chunk$/);
 if(method==='PUT'&&uploadChunk){const u=requireUser(req),id=uploadChunk[1],x=row(id);if(!x||x.user_id!==u.id)fail('Upload not found',404);
  if(x.status!=='UPLOADING')fail('Upload is not accepting chunks.',409);
  if(req.headers['content-type']!=='application/octet-stream')fail('Content-Type must be application/octet-stream.',415);
  const offset=Number(req.headers['x-upload-offset']),length=Number(req.headers['content-length']);
  if(!Number.isSafeInteger(offset)||offset<0||offset>x.received_bytes)fail('Incorrect upload offset; refresh upload status and retry.',409);
  if(!Number.isInteger(length)||length<1||length>MAX_CHUNK||offset+length>x.expected_bytes)fail('Invalid chunk length or file boundary.',413);
  if(busy.has(id))fail('Another chunk is already in progress.',409);
  busy.add(id);const chunks=[];let got=0;
  try{
   for await(const c of req){got+=c.length;if(got>MAX_CHUNK||got>length)fail('Chunk exceeds allowed size.',413);chunks.push(c)}
   if(got!==length)fail('Incomplete chunk.',400);
   const dest=path.join(PARTS,id+'.part');
   const outcome=storeUploadChunk(dest,{offset,receivedBytes:x.received_bytes,expectedBytes:x.expected_bytes,chunk:Buffer.concat(chunks)});
   if(!outcome.idempotent){
    // Conditional commit: a crashing writer leaves recoverable spool bytes,
    // never a misleading committed DB offset. This does not lock multiple API hosts.
    const updated=run("UPDATE upload_sessions SET received_bytes=?,updated_at=? WHERE id=? AND status='UPLOADING' AND received_bytes=?",outcome.receivedBytes,now(),id,x.received_bytes);
    if(updated.changes!==1)fail('Upload progress changed concurrently; refresh status and retry.',409);
   }
   send(res,{id,receivedBytes:outcome.receivedBytes,expectedBytes:x.expected_bytes,complete:outcome.receivedBytes===x.expected_bytes,idempotent:outcome.idempotent,recoveredBytes:outcome.recoveredBytes});return true
  }finally{busy.delete(id)}
 }
 const final=p.match(/^\/api\/studio\/uploads\/([a-f0-9-]{36})\/finalize$/);
 if(method==='POST'&&final){const u=requireUser(req),id=final[1],initial=row(id);if(!initial||initial.user_id!==u.id)fail('Upload not found',404);
  if(busy.has(id))fail('An upload operation is already in progress.',409);
  busy.add(id);
  try{
   // Hold the per-upload lock across body parsing AND file hash computation.
   // A concurrent chunk/finalize cannot make the SQLite offset stale.
   const x=row(id);
   if(x.status!=='UPLOADING')fail('Upload already finalized or unavailable.',409);
   const src=path.join(PARTS,id+'.part');
   if(x.expected_bytes!==x.received_bytes||fs.statSync(src,{throwIfNoEntry:false})?.size!==x.expected_bytes)fail('Upload is incomplete.',409);
   const b=await body(req);if(b.expectedSha256!==undefined&&!/^[a-f0-9]{64}$/i.test(b.expectedSha256))fail('Invalid expected SHA-256 digest');
   const sha=await new Promise((resolve,reject)=>{const h=crypto.createHash('sha256');const stream=fs.createReadStream(src);stream.on('data',chunk=>h.update(chunk));stream.once('error',reject);stream.once('end',()=>resolve(h.digest('hex')))});
   if(b.expectedSha256&&sha!==b.expectedSha256.toLowerCase())fail('SHA-256 mismatch; upload was not finalized.',409);
   const result=run("UPDATE upload_sessions SET status='QUEUED',sha256=?,updated_at=? WHERE id=? AND status='UPLOADING' AND received_bytes=?",sha,now(),id,x.received_bytes);
   if(result.changes!==1)fail('Upload state changed while finalizing.',409);
   enqueue(id);send(res,{ok:true,status:'QUEUED',sha256:sha},202);return true;
  }finally{busy.delete(id)}
 }
 const processEvents=p.match(/^\/api\/studio\/uploads\/([a-f0-9-]{36})\/events$/);
 if(method==='GET'&&processEvents){const u=requireUser(req),x=row(processEvents[1]);if(!x||x.user_id!==u.id)fail('Upload not found',404);
  send(res,{items:all('SELECT state,message,created_at AS createdAt FROM processing_events WHERE upload_id=? ORDER BY id DESC LIMIT 100',x.id)});return true;
 }
 const statusPath=p.match(/^\/api\/studio\/uploads\/([a-f0-9-]{36})$/);
 if(method==='GET'&&statusPath){const u=requireUser(req),x=row(statusPath[1]);if(!x||x.user_id!==u.id)fail('Upload not found',404);send(res,publicUpload(x));return true}
 if(method==='DELETE'&&statusPath){const u=requireUser(req),x=row(statusPath[1]);if(!x||x.user_id!==u.id)fail('Upload not found',404);
   if(!['UPLOADING','FAILED'].includes(x.status)||busy.has(x.id)||busy.has('job-'+x.id))fail('Only incomplete or failed uploads can be cancelled.',409);
   run("UPDATE upload_sessions SET status='CANCELLED',updated_at=? WHERE id=?",now(),x.id);
   run("UPDATE videos SET status='CANCELLED' WHERE id=?",x.video_id);
   fs.rmSync(path.join(PARTS,x.id+'.part'),{force:true});fs.rmSync(path.join(PROCESSED,x.id),{force:true,recursive:true});send(res,{ok:true,status:'CANCELLED'});return true
 }
 const retryPath=p.match(/^\/api\/studio\/uploads\/([a-f0-9-]{36})\/retry$/);
 if(method==='POST'&&retryPath){const u=requireUser(req),x=row(retryPath[1]);if(!x||x.user_id!==u.id)fail('Upload not found',404);
   if(x.status!=='FAILED'||x.attempts>=2)fail('Retry unavailable. Only one processing retry is allowed.',409);
   if(fs.statSync(path.join(PARTS,x.id+'.part'),{throwIfNoEntry:false})?.size!==x.expected_bytes)fail('Source file unavailable.',409);
   run("UPDATE upload_sessions SET status='QUEUED',error=NULL,updated_at=? WHERE id=?",now(),x.id);
   enqueue(x.id);send(res,{ok:true,status:'QUEUED'},202);return true
 }
 if(method==='GET'&&p==='/api/admin/uploads'){
  requireAdmin(req);send(res,{items:all(`SELECT x.*,v.title,v.slug,v.status AS video_status,u.email AS uploaderEmail FROM upload_sessions x JOIN videos v ON v.id=x.video_id JOIN users u ON u.id=x.user_id ORDER BY CASE WHEN x.status='IN_REVIEW' THEN 0 ELSE 1 END,x.created_at DESC LIMIT 200`).map(x=>({...publicUpload(x),uploaderEmail:x.uploaderEmail,rightsDeclaration:!!x.rights_declaration,adultsDeclaration:!!x.adults_declaration,consentDeclaration:!!x.consent_declaration}))});return true
 }
 const evidencePath=p.match(/^\/api\/admin\/uploads\/([a-f0-9-]{36})\/evidence$/);
 if(evidencePath&&method==='GET'){requireAdmin(req);if(!row(evidencePath[1]))fail('Upload not found',404);send(res,{items:evidenceItems(evidencePath[1])});return true;}
 if(evidencePath&&method==='PATCH'){
  const admin=requireAdmin(req),x=row(evidencePath[1]);if(!x)fail('Upload not found',404);
  if(!['IN_REVIEW','PUBLISHED'].includes(x.status))fail('Evidence references only available for reviewed uploads.',409);
  const b=await body(req),fields={LICENSE:b.licenseRef,ADULTHOOD:b.adulthoodRef,CONSENT:b.consentRef};
  if(Object.values(fields).some(v=>typeof v!=='string'||v.trim().length<8||v.length>180||/[<>\x00-\x1f]/.test(v)))fail('Use 8–180 character internal reference IDs; never paste confidential identity documents.');
  db.exec('BEGIN');try{
   for(const [kind,reference] of Object.entries(fields))run('INSERT INTO review_evidence(upload_id,kind,reference,checked_by,checked_at) VALUES(?,?,?,?,?) ON CONFLICT(upload_id,kind) DO UPDATE SET reference=excluded.reference,checked_by=excluded.checked_by,checked_at=excluded.checked_at',x.id,kind,reference.trim(),admin.id,now());
   audit(admin.id,'evidence',x.id,'RECORD_REFERENCES','Local document reference IDs only; no verification claim');db.exec('COMMIT');
  }catch(e){db.exec('ROLLBACK');throw e}
  send(res,{ok:true,items:evidenceItems(x.id)});return true;
 }
 const review=p.match(/^\/api\/admin\/uploads\/([a-f0-9-]{36})\/decision$/);
 if(method==='PATCH'&&review){const admin=requireAdmin(req),x=row(review[1]),b=await body(req);if(!x)fail('Upload not found',404);
  if(x.status!=='IN_REVIEW')fail('Only processed uploads awaiting review can be decided.',409);
  if(!['APPROVE','REJECT'].includes(b.decision))fail('Decision must be APPROVE or REJECT.');
  const note=String(b.note||'').trim().slice(0,500);if(note.length<8)fail('Write a review note of at least 8 characters.');
  if(b.decision==='APPROVE'&&!(b.rightsReviewed===true&&b.adultsReviewed===true&&b.consentReviewed===true))fail('All three independent review acknowledgements are required.');
  if(b.decision==='APPROVE'&&(process.env.SA_REQUIRE_EVIDENCE_REFS==='1'||process.env.NODE_ENV==='production')&&evidenceItems(x.id).length!==3)fail('Three internal evidence references are required by this configuration.',409);
  if(b.decision==='APPROVE'&&one('SELECT 1 FROM content_holds WHERE video_id=? AND closed_at IS NULL',x.video_id))fail('An active rights/safety hold blocks approval.',409);
  if(b.decision==='APPROVE'&&one("SELECT 1 FROM media_license_reviews WHERE upload_id=? AND (status<>'VERIFIED' OR expires_at<=?)",x.id,now()))fail('Revoked or expired license review blocks approval.',409);
  if(b.decision==='APPROVE'&&x.planned_release_at&&Date.parse(x.planned_release_at)>Date.now())fail('A future planned release cannot be approved for immediate publication.',409);
  if(b.decision==='APPROVE'&&one('SELECT status FROM creator_profiles WHERE user_id=?',x.user_id)?.status!=='APPROVED')fail('Suspended or unapproved creator cannot publish.',409);
  db.exec('BEGIN');try{
   const pub=b.decision==='APPROVE';
   run('UPDATE upload_sessions SET status=?,reviewed_at=?,reviewed_by=?,review_note=?,updated_at=? WHERE id=?',pub?'PUBLISHED':'REJECTED',now(),admin.id,note,now(),x.id);
   run('UPDATE videos SET status=?,published_at=? WHERE id=?',pub?'PUBLISHED':'REJECTED',now(),x.video_id);
   if(pub){
     const published=one('SELECT channel_id FROM videos WHERE id=?',x.video_id);
     run(`INSERT OR IGNORE INTO notifications(user_id,channel_id,video_id,type,created_at)
          SELECT sub.user_id,?,?,'NEW_VIDEO',? FROM subscriptions sub WHERE sub.channel_id=? AND sub.notify=1`,
          published.channel_id,x.video_id,now(),published.channel_id);
   }
   audit(admin.id,'upload',x.id,b.decision,note);db.exec('COMMIT');
  }catch(e){db.exec('ROLLBACK');throw e}
  send(res,{ok:true,status:b.decision==='APPROVE'?'PUBLISHED':'REJECTED'});return true
 }
 if(method==='GET'&&p==='/api/admin/audit'){
  requireAdmin(req);send(res,{items:all('SELECT a.*,u.name AS actorName FROM moderation_audit a JOIN users u ON u.id=a.actor_id ORDER BY a.created_at DESC,a.id DESC LIMIT 200')});return true
 }
 return false;
}
