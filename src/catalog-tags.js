/** Independent, moderated tag taxonomy. No user-supplied tag is auto-published.
 * All public lists exclude hidden or held videos, and creation/assignment is admin-only.
 */
import {one,all,run,db,now} from './database.js';
const fail=(msg,status=400)=>{const e=new Error(msg);e.status=status;throw e};
const send=(res,payload,status=200)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow'});res.end(JSON.stringify(payload));return true};
const tagSlug=v=>typeof v==='string'&&/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(v)&&v.length<=60;
async function body(req){let size=0;const out=[];for await(const part of req){size+=part.length;if(size>16000)fail('Request too large',413);out.push(part)}try{return JSON.parse(Buffer.concat(out).toString('utf8')||'{}')}catch{fail('Invalid JSON')}}
export async function catalogTagsApi(req,res,url,{requireAdmin}){
 const p=url.pathname,m=req.method;
 if(m==='GET'&&p==='/api/catalog/tags'){
  const limit=Number(url.searchParams.get('limit')||30);if(!Number.isSafeInteger(limit)||limit<1||limit>100)fail('Invalid tag limit');
  return send(res,{items:all(`SELECT t.slug,t.name,COUNT(DISTINCT v.id) AS publishedVideos FROM catalog_tags t JOIN video_tag_links l ON l.tag_id=t.id JOIN videos v ON v.id=l.video_id
   WHERE v.status='PUBLISHED' AND NOT EXISTS(SELECT 1 FROM content_holds h WHERE h.video_id=v.id AND h.closed_at IS NULL)
   GROUP BY t.id ORDER BY publishedVideos DESC,t.name LIMIT ?`,limit),notice:'Reviewed catalog labels only; no automated classification.'});
 }
 if(m==='POST'&&p==='/api/admin/catalog/tags'){
  const admin=requireAdmin(req),b=await body(req);if(!tagSlug(b.slug)||typeof b.name!=='string'||b.name.trim().length<2||b.name.trim().length>80)fail('Invalid tag');
  if(one('SELECT 1 FROM catalog_tags WHERE slug=?',b.slug))fail('Tag already exists',409);
  const id=Number(run('INSERT INTO catalog_tags(name,slug,created_by,created_at) VALUES(?,?,?,?)',b.name.trim(),b.slug,admin.id,now()).lastInsertRowid);
  run('INSERT INTO moderation_audit(actor_id,object_type,object_id,action,note,created_at) VALUES(?,?,?,?,?,?)',admin.id,'catalog_tag',String(id),'CREATE','Manual taxonomy review',now());
  return send(res,{id,name:b.name.trim(),slug:b.slug,autoPublished:false},201);
 }
 const match=p.match(/^\/api\/admin\/videos\/(\d+)\/tags$/);
 if(match&&m==='PATCH'){
  const admin=requireAdmin(req),videoId=Number(match[1]),b=await body(req);
  if(!Number.isSafeInteger(videoId)||videoId<1||!one('SELECT 1 FROM videos WHERE id=?',videoId))fail('Video unavailable',404);
  if(!Array.isArray(b.slugs)||b.slugs.length>12||new Set(b.slugs).size!==b.slugs.length||b.slugs.some(x=>!tagSlug(x)))fail('Provide up to 12 unique valid tag slugs');
  const tagIds=b.slugs.map(slug=>{const x=one('SELECT id FROM catalog_tags WHERE slug=?',slug);if(!x)fail('Unknown tag slug');return x.id});
  db.exec('BEGIN');try{run('DELETE FROM video_tag_links WHERE video_id=?',videoId);for(const id of tagIds)run('INSERT INTO video_tag_links(video_id,tag_id) VALUES(?,?)',videoId,id);
   run('INSERT INTO moderation_audit(actor_id,object_type,object_id,action,note,created_at) VALUES(?,?,?,?,?,?)',admin.id,'video',String(videoId),'TAG_REVIEW',JSON.stringify(b.slugs),now());db.exec('COMMIT')}
  catch(e){db.exec('ROLLBACK');throw e}
  return send(res,{videoId,slugs:b.slugs,reviewedBy:admin.id});
 }
 if(m==='GET'&&p==='/api/admin/catalog/tags'){
  requireAdmin(req);return send(res,{items:all('SELECT id,name,slug,created_at AS createdAt FROM catalog_tags ORDER BY name LIMIT 300')});
 }
 return false;
}
