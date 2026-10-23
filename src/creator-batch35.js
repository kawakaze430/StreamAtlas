/** Checkpoint 35: transaction-safe, review-only creator batch draft creation.
 * This creates private UPLOADING sessions, never public videos. Each video is
 * individually transferred, checked, processed, and independently reviewed.
 */
import crypto from 'node:crypto';
import {db,one,run,now} from './database.js';
const error=(message,status=400)=>{const e=new Error(message);e.status=status;throw e};
const respond=(res,data,status=200)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data));return true};
async function readJson(req){let size=0,parts=[];for await(const part of req){size+=part.length;if(size>65536)error('JSON request too large',413);parts.push(part)}try{return JSON.parse(Buffer.concat(parts).toString('utf8')||'{}')}catch{error('Invalid JSON')}}
function validateDraft(b){
 const title=typeof b?.title==='string'?b.title.trim():'',filename=typeof b?.filename==='string'?b.filename.replace(/[^a-zA-Z0-9._ -]/g,'_').slice(0,120):'',mime=b?.mime;
 const size=Number(b?.size),categoryId=Number(b?.categoryId);
 if(title.length<8||title.length>150)error('Title must be 8–150 characters');
 if(!Number.isSafeInteger(size)||size<1024||size>25*1024*1024)error('Each video must be between 1 KB and 25 MB',413);
 if(!/\.(mp4|webm|mov)$/i.test(filename)||!['video/mp4','video/webm','video/quicktime','application/octet-stream'].includes(mime))error('Unsupported video type');
 if(b.rightsDeclaration!==true||b.adultsDeclaration!==true||b.consentDeclaration!==true)error('Explicit rights, adulthood and consent declarations are required for every upload');
 if(!Number.isSafeInteger(categoryId)||!one('SELECT 1 FROM categories WHERE id=?',categoryId))error('Valid category required');
 if(typeof b.description!=='undefined'&&(typeof b.description!=='string'||b.description.length>1500))error('Description too long');
 return {title,filename,size,mime,categoryId,description:b.description||''};
}
export async function creatorBatch35Api(req,res,url,{requireUser}){
 if(req.method!=='POST'||url.pathname!=='/api/studio/uploads/bulk-initiate')return false;
 const user=requireUser(req),profile=one("SELECT channel_id FROM creator_profiles WHERE user_id=? AND status='APPROVED'",user.id);
 if(!profile)error('Approved creator profile required',403);
 const channel=one('SELECT id,site_id FROM channels WHERE id=?',profile.channel_id);if(!channel)error('Creator channel unavailable',409);
 const b=await readJson(req);
 if(!Array.isArray(b.items)||b.items.length<2||b.items.length>5)error('Supply 2–5 private video drafts');
 const drafts=b.items.map(validateDraft);
 if(new Set(drafts.map(x=>x.filename.toLowerCase())).size!==drafts.length)error('Duplicate filenames within one batch');
 const outstanding=one("SELECT COUNT(*) AS count FROM upload_sessions WHERE user_id=? AND status IN ('UPLOADING','QUEUED','PROCESSING','IN_REVIEW')",user.id)?.count||0;
 if(outstanding+drafts.length>5)error('Five outstanding uploads per creator is the limit',429);
 const created=[];
 db.exec('BEGIN IMMEDIATE');
 try{
  for(const d of drafts){
   const id=crypto.randomUUID(),slug=`${d.title.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,55)||'upload'}-${id.slice(0,8)}`;
   const videoId=Number(run(`INSERT INTO videos(title,slug,site_id,channel_id,poster,media_url,duration,quality,views,likes,dislikes,published_at,status) VALUES(?,?,?,?,?,?,?,?,0,0,0,?,?)`,d.title,slug,channel.site_id,channel.id,'/assets/posters/poster-1.jpg','',0,'Processing',now(),'DRAFT').lastInsertRowid);
   run('INSERT INTO video_categories(video_id,category_id) VALUES(?,?)',videoId,d.categoryId);
   run(`INSERT INTO upload_sessions(id,user_id,video_id,original_filename,declared_type,expected_bytes,description,rights_declaration,adults_declaration,consent_declaration,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`,id,user.id,videoId,d.filename,d.mime,d.size,d.description,1,1,1,now(),now());
   created.push({id,videoId,slug,chunkBytes:2*1024*1024,status:'UPLOADING',expectedBytes:d.size,filename:d.filename});
  }
  db.exec('COMMIT');
 }catch(e){db.exec('ROLLBACK');throw e}
 return respond(res,{items:created,private:true,requiresIndividualTransfer:true,requiresHumanReview:true},201);
}
