/** Checkpoint 26: private creator-workspace operations. These APIs do not
 * authorize public release, verify participant identity, or provision cloud media.
 */
import fs from 'node:fs';
import path from 'node:path';
import {db,all,one,run,now} from './database.js';
const error=(message,status=400)=>{const e=new Error(message);e.status=status;throw e};
const reply=(res,payload,status=200)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(payload));return true};
async function parse(req){let size=0;const parts=[];for await(const part of req){size+=part.length;if(size>65536)error('Request too large',413);parts.push(part)}try{return JSON.parse(Buffer.concat(parts).toString('utf8')||'{}')}catch{error('Invalid JSON')}}
function creator(user){const p=one('SELECT user_id,channel_id,status FROM creator_profiles WHERE user_id=?',user.id);if(!p||p.status!=='APPROVED')error('Approved creator profile required',403);return p}
function delegated(user,ownerId,roles){if(user.id===ownerId){creator(user);return 'OWNER'}
 const p=one("SELECT cc.role FROM creator_collaborators cc JOIN creator_profiles cp ON cp.user_id=cc.owner_id WHERE cc.owner_id=? AND cc.collaborator_id=? AND cc.status='ACCEPTED' AND cp.status='APPROVED'",ownerId,user.id);
 if(!p||!roles.includes(p.role))error('Collaborator permission denied',403);return p.role;
}
function uploadFor(user,id,{roles=['EDITOR'],editable=false}={}){
 const x=one('SELECT x.*,v.title,v.poster FROM upload_sessions x JOIN videos v ON v.id=x.video_id WHERE x.id=?',id);
 if(!x)error('Upload not found',404);
 if(user.id!==x.user_id){const collab=one("SELECT role FROM creator_collaborators WHERE owner_id=? AND collaborator_id=? AND status='ACCEPTED'",x.user_id,user.id);if(!collab||!roles.includes(collab.role))error('Upload not found',404);creator({id:x.user_id})}
 if(editable&&!['UPLOADING','FAILED','IN_REVIEW'].includes(x.status))error('Only pre-approval upload metadata can be changed',409);
 return x;
}
function validateItem(x,b){if(typeof b.title!=='string'||b.title.trim().length<8||b.title.trim().length>150)error('Title must be 8–150 characters');
 if(typeof b.description!=='string'||b.description.length>1500)error('Description must be at most 1500 characters');
 const categoryId=Number(b.categoryId);if(!Number.isSafeInteger(categoryId)||!one('SELECT 1 FROM categories WHERE id=?',categoryId))error('Valid category required');
 return {id:x.id,videoId:x.video_id,title:b.title.trim(),description:b.description.trim(),categoryId};
}
export async function studioOperationsApi(req,res,url,{requireUser,requireAdmin}){
 const p=url.pathname,m=req.method;
 if(p==='/api/studio/collaborators'){
  const user=requireUser(req);
  if(m==='GET')return reply(res,{owned:all(`SELECT cc.collaborator_id AS userId,u.name,cc.role,cc.status,cc.invited_at AS invitedAt FROM creator_collaborators cc JOIN users u ON u.id=cc.collaborator_id WHERE cc.owner_id=? ORDER BY cc.invited_at DESC`,user.id),incoming:all(`SELECT cc.owner_id AS ownerId,u.name AS ownerName,cc.role,cc.status FROM creator_collaborators cc JOIN users u ON u.id=cc.owner_id WHERE cc.collaborator_id=? AND cc.status IN ('INVITED','ACCEPTED') ORDER BY cc.invited_at DESC`,user.id)});
  if(m==='POST'){
   creator(user);const b=await parse(req);const role=String(b.role||'');if(!['ANALYST','EDITOR','UPLOADER'].includes(role))error('Invalid collaborator role');
   const email=String(b.email||'').trim().toLowerCase();const invitee=one('SELECT id,role FROM users WHERE email=? AND NOT EXISTS(SELECT 1 FROM closed_accounts WHERE user_id=users.id)',email);
   if(!invitee||invitee.id===user.id||invitee.role==='DEMO')error('Eligible collaborator account not found',404);
   if(one("SELECT COUNT(*) AS n FROM creator_collaborators WHERE owner_id=? AND status<>'REVOKED'",user.id).n>=10)error('Maximum 10 active invitations',429);
   const exists=one('SELECT status FROM creator_collaborators WHERE owner_id=? AND collaborator_id=?',user.id,invitee.id);
   if(exists&&exists.status!=='REVOKED')error('An invitation already exists',409);
   run(`INSERT INTO creator_collaborators(owner_id,collaborator_id,role,status,invited_at) VALUES(?,?,?,'INVITED',?)
    ON CONFLICT(owner_id,collaborator_id) DO UPDATE SET role=excluded.role,status='INVITED',invited_at=excluded.invited_at,accepted_at=NULL`,user.id,invitee.id,role,now());
   return reply(res,{ok:true,invitedUserId:invitee.id,role,status:'INVITED',notice:role==='UPLOADER'?'Uploader delegation is not yet enabled for uploads.':'Invitation must be accepted.'},201);
  }
 }
 if(m==='POST'&&p==='/api/studio/collaborators/accept'){
  const user=requireUser(req),b=await parse(req),ownerId=Number(b.ownerId);if(!Number.isSafeInteger(ownerId))error('Invalid owner');creator({id:ownerId});
  const result=run("UPDATE creator_collaborators SET status='ACCEPTED',accepted_at=? WHERE owner_id=? AND collaborator_id=? AND status='INVITED'",now(),ownerId,user.id);
  if(!result.changes)error('Invitation not found',404);return reply(res,{ok:true,status:'ACCEPTED'});
 }
 const changeRole=p.match(/^\/api\/studio\/collaborators\/(\d+)\/role$/);
 if(m==='PATCH'&&changeRole){
  const owner=requireUser(req);creator(owner);const b=await parse(req),role=b.role;
  if(!['ANALYST','EDITOR','UPLOADER'].includes(role))error('Invalid collaborator role');
  const targetId=Number(changeRole[1]);if(!Number.isSafeInteger(targetId)||targetId===owner.id)error('Invalid collaborator');
  const record=one('SELECT role,status FROM creator_collaborators WHERE owner_id=? AND collaborator_id=?',owner.id,targetId);
  if(!record||!['INVITED','ACCEPTED'].includes(record.status))error('Active collaborator unavailable',404);
  if(record.role===role)error('Role already assigned',409);
  run('UPDATE creator_collaborators SET role=? WHERE owner_id=? AND collaborator_id=?',role,owner.id,targetId);
  run('INSERT INTO moderation_audit(actor_id,object_type,object_id,action,note,created_at) VALUES(?,?,?,?,?,?)',owner.id,'creator_collaborator',String(targetId),'ROLE_CHANGE',`${record.role} -> ${role}`,now());
  return reply(res,{ok:true,userId:targetId,role,status:record.status,note:'An uploader role does not grant direct-media upload authorization.'});
 }
 const collaborator=p.match(/^\/api\/studio\/collaborators\/(\d+)$/);
 if(m==='DELETE'&&collaborator){const user=requireUser(req);creator(user);const result=run("UPDATE creator_collaborators SET status='REVOKED' WHERE owner_id=? AND collaborator_id=? AND status<>'REVOKED'",user.id,Number(collaborator[1]));if(!result.changes)error('Collaborator not found',404);return reply(res,{ok:true,status:'REVOKED'});}
 const delegatedInsights=p.match(/^\/api\/studio\/collaboration\/(\d+)\/insights$/);
 if(m==='GET'&&delegatedInsights){const user=requireUser(req),ownerId=Number(delegatedInsights[1]);delegated(user,ownerId,['ANALYST','EDITOR']);
  const totals=one(`SELECT COUNT(*) AS uploads,COALESCE(SUM(CASE WHEN x.status='PUBLISHED' AND v.status='PUBLISHED' THEN v.views ELSE 0 END),0) AS publishedLifetimeViews
    FROM upload_sessions x JOIN videos v ON v.id=x.video_id WHERE x.user_id=?`,ownerId);
  return reply(res,{ownerId,totals,period:'lifetime',privacy:'Aggregate counters only; no individual viewer information.'});
 }
 if(m==='PATCH'&&p==='/api/studio/uploads/batch-metadata'){
  const user=requireUser(req),b=await parse(req);if(!Array.isArray(b.items)||b.items.length<1||b.items.length>10)error('Provide 1–10 upload updates');
  const ids=new Set(),updates=[];for(const item of b.items){if(!/^[a-f0-9-]{36}$/.test(item?.id||'')||ids.has(item.id))error('Invalid or duplicate upload ID');ids.add(item.id);const x=uploadFor(user,item.id,{editable:true});updates.push(validateItem(x,item));}
  db.exec('BEGIN');try{for(const x of updates){run('UPDATE videos SET title=? WHERE id=?',x.title,x.videoId);run('UPDATE upload_sessions SET description=?,updated_at=? WHERE id=?',x.description,now(),x.id);run('DELETE FROM video_categories WHERE video_id=?',x.videoId);run('INSERT INTO video_categories(video_id,category_id) VALUES(?,?)',x.videoId,x.categoryId)}db.exec('COMMIT')}catch(e){db.exec('ROLLBACK');throw e}
  return reply(res,{ok:true,updated:updates.length,ids:updates.map(x=>x.id)});
 }
 const schedule=p.match(/^\/api\/studio\/uploads\/([a-f0-9-]{36})\/schedule$/);
 if(m==='PATCH'&&schedule){const user=requireUser(req),x=uploadFor(user,schedule[1],{roles:[],editable:true}),b=await parse(req);
  let date=null;if(b.plannedReleaseAt!==null){if(typeof b.plannedReleaseAt!=='string'||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{3})?Z$/.test(b.plannedReleaseAt))error('UTC ISO date or null required');const time=Date.parse(b.plannedReleaseAt);if(!Number.isFinite(time)||time<Date.now()+60000||time>Date.now()+180*86400000)error('Plan release between 1 minute and 180 days ahead');date=new Date(time).toISOString()}
  run('UPDATE upload_sessions SET planned_release_at=?,updated_at=? WHERE id=?',date,now(),x.id);
  return reply(res,{ok:true,plannedReleaseAt:date,autoPublish:false,notice:'Scheduling is planning-only; no automatic publication or verification bypass.'});
 }
 const poster=p.match(/^\/api\/studio\/uploads\/([a-f0-9-]{36})\/poster$/);
 if(m==='PATCH'&&poster){const user=requireUser(req),x=uploadFor(user,poster[1],{roles:[],editable:false}),b=await parse(req);
  if(x.status!=='IN_REVIEW')error('Poster selection is limited to prepublication review; a published poster change requires new moderator review and cache invalidation',409);
  if(!Number.isInteger(b.frame)||b.frame<0||b.frame>3)error('Select a preview frame 0–3');
  const file=`preview_${b.frame}.jpg`,privateDir=process.env.PRIVATE_PATH||path.resolve(import.meta.dirname,'../data/private');
  if(!fs.statSync(path.join(privateDir,'processed',x.id,file),{throwIfNoEntry:false})?.isFile())error('Preview frame unavailable',409);
  run('UPDATE videos SET poster=? WHERE id=?',`/api/media/${x.id}/${file}`,x.video_id);run('UPDATE upload_sessions SET selected_poster=?,updated_at=? WHERE id=?',file,now(),x.id);
  return reply(res,{ok:true,selectedPoster:file});
 }
 if(m==='GET'&&p==='/api/studio/analytics/retention'){
  const user=requireUser(req),ownerId=url.searchParams.has('ownerId')?Number(url.searchParams.get('ownerId')):user.id;
  if(!Number.isSafeInteger(ownerId)||ownerId<1)error('Invalid owner');delegated(user,ownerId,['ANALYST','EDITOR']);
  const items=all(`SELECT v.id AS videoId,v.title,v.views AS lifetimeViews,
    COUNT(DISTINCT wp.user_id) AS distinctProgressAccounts,
    ROUND(AVG(CASE WHEN v.duration>0 THEN MIN(1.0,MAX(0.0,wp.position/v.duration)) ELSE NULL END),3) AS meanLastSavedProgressRatio
    FROM upload_sessions x JOIN videos v ON v.id=x.video_id LEFT JOIN watch_progress wp ON wp.video_id=v.id
    WHERE x.user_id=? AND x.status='PUBLISHED' AND v.status='PUBLISHED'
    GROUP BY v.id ORDER BY v.views DESC LIMIT 50`,ownerId).map(x=>({...x,meanLastSavedProgressRatio:x.distinctProgressAccounts>=5?x.meanLastSavedProgressRatio:null,privacySuppressed:x.distinctProgressAccounts<5}));
  return reply(res,{items,metricNote:'Saved progress is not qualified watch time or retention telemetry; ratios suppressed below five accounts.'});
 }
 if(m==='GET'&&p==='/api/admin/processing/dead-letters'){requireAdmin(req);return reply(res,{items:all(`SELECT d.upload_id AS uploadId,d.attempt_count AS attempts,d.failure_reason AS reason,d.created_at AS createdAt,x.status FROM processing_dead_letters d JOIN upload_sessions x ON x.id=d.upload_id ORDER BY d.created_at DESC LIMIT 100`)});}
 if(m==='GET'&&p==='/api/admin/licenses/renewals'){
  requireAdmin(req);const days=Number(url.searchParams.get('days')||30);if(!Number.isSafeInteger(days)||days<1||days>180)error('Days must be 1–180');
  const end=new Date(Date.now()+days*86400000).toISOString();return reply(res,{days,items:all(`SELECT l.upload_id AS uploadId,l.expires_at AS expiresAt,l.status,v.id AS videoId,v.title
    FROM media_license_reviews l JOIN upload_sessions x ON x.id=l.upload_id JOIN videos v ON v.id=x.video_id
    WHERE l.status='VERIFIED' AND l.expires_at>? AND l.expires_at<=? ORDER BY l.expires_at LIMIT 100`,now(),end),notice:'Internal review reminders; not legal proof of distribution rights.'});
 }
 const licenseHistory=p.match(/^\/api\/admin\/licenses\/([a-f0-9-]{36})\/history$/);
 if(m==='GET'&&licenseHistory){requireAdmin(req);if(!one('SELECT 1 FROM upload_sessions WHERE id=?',licenseHistory[1]))error('Upload not found',404);return reply(res,{items:all('SELECT actor_id AS actorId,action,note,created_at AS createdAt FROM license_review_events WHERE upload_id=? ORDER BY id DESC LIMIT 100',licenseHistory[1])});}
 return false;
}
