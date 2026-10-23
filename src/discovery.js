/** Checkpoint 25 discovery and creator tools. All discovery reads are limited to published synthetic catalog entries.
 * These are local SQLite implementations, not a production search or moderation service. */
import {all,one,run,now,db} from './database.js';
import {queryVideoCursor,searchFacetCounts} from './search-cursor.js';
import {rankSuggestions} from './suggestion-ranking.js';

const KINDS=['categories','performers','sites','networks','channels'];
const ROUTES={categories:'categories',performers:'models',sites:'sites',networks:'networks',channels:'channels'};
const VALID_SORT=['latest','most-viewed','top-rated','oldest','duration'];
const filterKeys=['q','sort','quality','category','channel','site','network','performer','tag','minDuration','maxDuration','publishedAfter','publishedBefore'];
function bad(message,status=400){const e=new Error(message);e.status=status;throw e}
function safe(value,max=100){return String(value??'').trim().slice(0,max)}
function int(value,def,min,max){if(value===null||value===undefined||value==='')return def;const n=Number(value);if(!Number.isSafeInteger(n)||n<min||n>max)bad('Invalid pagination value');return n}
function respond(res,body,status=200){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(body))}
async function json(req){let bytes=0;const chunks=[];for await(const chunk of req){bytes+=chunk.length;if(bytes>8192)bad('Request body too large',413);chunks.push(chunk)}try{return JSON.parse(Buffer.concat(chunks).toString()||'{}')}catch{bad('Invalid JSON')}}
function link(type,slug){return '/'+ROUTES[type]+'/'+encodeURIComponent(slug)}
function findAlias(query){return one('SELECT kind,target_slug FROM catalog_aliases WHERE alias=? COLLATE NOCASE',query)}
function aliasName(query){const a=findAlias(query);if(!a)return query;const t=one(`SELECT name FROM ${a.kind} WHERE slug=?`,a.target_slug);return t?.name||query}
function publicRows(which,term,directory){return directory(which,new URLSearchParams()).filter(x=>!term||x.name.toLocaleLowerCase('en').includes(term.toLocaleLowerCase('en'))).slice(0,8).map(x=>({...x,canonicalUrl:link(which,x.slug)}))}
export function catalogSuggestions(q,videoList,directory){
 const resolved=aliasName(q);
 // Ranking is per entity type, so a popular source does not crowd out a category.
 const entities=Object.fromEntries(KINDS.map(k=>[k,rankSuggestions(directory(k,new URLSearchParams()).filter(x=>x.videoCount>0),resolved,{limit:5}).map(x=>({...x,canonicalUrl:link(k,x.slug)}))]));
 const videos=rankSuggestions(videoList(new URLSearchParams({q:resolved,limit:'40'})).items,resolved,{limit:5});
 const alternativesList=alternatives(q);
 const hasDirectResults=videos.length>0||Object.values(entities).some(x=>x.length);
 return {...entities,videos,alternatives:alternativesList,didYouMean:!hasDirectResults?alternativesList.slice(0,3):[],resolvedQuery:resolved,aliasApplied:resolved!==q,
  aliasTarget:resolved!==q?{query:q,canonicalName:resolved}:null};
}
function publicSearch(q,params,videoList,directory){
 const resolved=aliasName(q),vparams=new URLSearchParams(params);vparams.set('q',resolved);const videos=videoList(vparams);
 const entities=Object.fromEntries(KINDS.map(k=>[k,publicRows(k,resolved,directory)]));
 return {query:q,resolvedQuery:resolved,aliasApplied:resolved!==q,videos,entities,canonicalUrl:'/search?'+new URLSearchParams({q:resolved}).toString()};
}
function tokens(term){return (term.toLocaleLowerCase('en').match(/[\p{L}\p{N}]+/gu)||[]).slice(0,6).map(s=>s.slice(0,35))}
function titleFts(term,limit){const t=tokens(term);if(!t.length)return [];
 // MATCH syntax is constructed from sanitized word tokens only, never from raw user input.
 const match=t.map(s=>'"'+s.replace(/"/g,'')+'"*').join(' AND ');
 return all(`SELECT v.id,v.title,v.slug,v.poster,v.duration,v.quality,v.views,bm25(video_title_fts) AS relevance
 FROM video_title_fts JOIN videos v ON v.id=video_title_fts.rowid
 WHERE video_title_fts MATCH ? AND v.status='PUBLISHED'
 AND NOT EXISTS(SELECT 1 FROM content_holds h WHERE h.video_id=v.id AND h.closed_at IS NULL)
 ORDER BY relevance ASC,v.id DESC LIMIT ?`,match,limit).map(x=>({...x,canonicalUrl:'/videos/'+encodeURIComponent(x.slug)}));
}
function facets(q){
 // Aggregate inside SQLite instead of building a huge IN (...) list in JavaScript.
 const like='%'+q.replace(/[\\%_]/g,x=>'\\'+x)+'%';
 const match=`(v.title LIKE ? ESCAPE '\\' OR EXISTS(SELECT 1 FROM channels ch WHERE ch.id=v.channel_id AND ch.name LIKE ? ESCAPE '\\')
 OR EXISTS(SELECT 1 FROM sites s WHERE s.id=v.site_id AND s.name LIKE ? ESCAPE '\\')
 OR EXISTS(SELECT 1 FROM video_categories vc JOIN categories c ON c.id=vc.category_id WHERE vc.video_id=v.id AND c.name LIKE ? ESCAPE '\\')
 OR EXISTS(SELECT 1 FROM video_performers vp JOIN performers p ON p.id=vp.performer_id WHERE vp.video_id=v.id AND p.name LIKE ? ESCAPE '\\'))`;
 const where=`v.status='PUBLISHED' AND NOT EXISTS(SELECT 1 FROM content_holds h WHERE h.video_id=v.id AND h.closed_at IS NULL) AND ${match}`;
 const args=Array(5).fill(like);
 const total=one(`SELECT COUNT(*) AS n FROM videos v WHERE ${where}`,...args).n;
 return {total,
  qualities:all(`SELECT v.quality AS name,COUNT(*) AS count FROM videos v WHERE ${where} GROUP BY v.quality ORDER BY count DESC,name ASC`,...args),
  categories:all(`SELECT c.slug,c.name,COUNT(*) AS count FROM videos v JOIN video_categories vc ON vc.video_id=v.id JOIN categories c ON c.id=vc.category_id WHERE ${where} GROUP BY c.id ORDER BY count DESC,c.name ASC LIMIT 20`,...args)};
}
function editDistance(a,b){if(Math.abs(a.length-b.length)>2)return 3;let prev=Array.from({length:b.length+1},(_,i)=>i);for(let i=1;i<=a.length;i++){const row=[i];for(let j=1;j<=b.length;j++)row[j]=Math.min(row[j-1]+1,prev[j]+1,prev[j-1]+(a[i-1]===b[j-1]?0:1));prev=row}return prev[b.length]}
function alternatives(q){const word=q.toLocaleLowerCase('en');if(word.length<3||word.length>40)return [];
 const names=all(`SELECT title AS name FROM videos WHERE status='PUBLISHED' AND NOT EXISTS(SELECT 1 FROM content_holds h WHERE h.video_id=videos.id AND h.closed_at IS NULL) LIMIT 300`).map(x=>x.name);
 for(const kind of KINDS)names.push(...all(`SELECT name FROM ${kind} LIMIT 100`).map(x=>x.name));
 const candidates=new Set(names.flatMap(x=>[x,...x.split(/\s+/u)]).map(x=>x.toLocaleLowerCase('en')).filter(x=>x.length>=3&&x.length<=40));
 return [...candidates].map(x=>({term:x,distance:editDistance(word,x)})).filter(x=>x.distance>0&&x.distance<=2).sort((a,b)=>a.distance-b.distance||a.term.localeCompare(b.term)).slice(0,5).map(x=>x.term);
}
function validFilter(raw){if(!raw||typeof raw!=='object'||Array.isArray(raw))bad('Filter must be an object');const obj={};for(const [key,value] of Object.entries(raw)){
 if(!filterKeys.includes(key)||typeof value!=='string'||value.length>100)bad('Invalid saved filter');
 if(key==='sort'&&!VALID_SORT.includes(value))bad('Invalid saved sort');
 if(['minDuration','maxDuration'].includes(key)&&(!/^\d{1,5}$/.test(value)||Number(value)>86400))bad('Invalid duration');
 if(key==='quality'&&!['HD','4K','1080p'].includes(value))bad('Invalid quality');
 if(['publishedAfter','publishedBefore'].includes(key)&&(!/^\d{4}-\d{2}-\d{2}$/.test(value)||!Number.isFinite(Date.parse(value))||new Date(value).toISOString().slice(0,10)!==value))bad('Invalid publication date');
 if(!/^[\p{L}\p{N} ._\-]*$/u.test(value))bad('Unsupported filter value');
 obj[key]=value;
 }return obj}
function ownUpload(user,id){const x=one('SELECT x.*,v.title,v.slug,v.status AS video_status,v.views,v.likes,v.dislikes FROM upload_sessions x JOIN videos v ON v.id=x.video_id WHERE x.id=? AND x.user_id=?',id,user.id);if(!x)bad('Upload not found',404);return x}
export async function discoveryApi(req,res,url,{requireUser,requireAdmin,videoList,directory,adminAudit}){
 const p=url.pathname,m=req.method,q=safe(url.searchParams.get('q'),80);
 if(m==='GET'&&p==='/api/search')return respond(res,publicSearch(q,url.searchParams,videoList,directory)),true; // D01/D02/D06
 if(m==='GET'&&p==='/api/search/titles')return respond(res,{query:q,items:titleFts(q,int(url.searchParams.get('limit'),12,1,30)),index:'sqlite-fts5'}),true; // D03
 if(m==='GET'&&p==='/api/search/facets')return respond(res,{query:q,...facets(aliasName(q))}),true; // D04
 if(m==='GET'&&p==='/api/search/cursor')return respond(res,queryVideoCursor(url.searchParams)),true; // D05 signed multi-filter keyset pagination
 if(m==='GET'&&p==='/api/search/advanced-facets')return respond(res,searchFacetCounts(url.searchParams)),true; // D04 cross-entity facets
 if(m==='GET'&&p==='/api/search/videos'){
  const params=new URLSearchParams(url.searchParams);params.set('q',aliasName(q));
  const page=int(params.get('page'),1,1,10000),limit=int(params.get('limit'),16,1,72);params.set('page',String(page));params.set('limit',String(limit));
  if(params.has('sort')&&!VALID_SORT.includes(params.get('sort')))bad('Invalid sort');
  const result=videoList(params);return respond(res,{...result,hasMore:page<result.pages,nextPage:page<result.pages?page+1:null,canonicalUrl:'/search?'+new URLSearchParams({q:params.get('q'),page:String(page)}).toString()}),true;
 } // D05
 if(m==='GET'&&p==='/api/search/previews'){
  const raw=url.searchParams.get('ids')||'';if(!/^\d+(,\d+){0,19}$/.test(raw))bad('Supply up to 20 numeric video IDs');const ids=[...new Set(raw.split(',').map(Number))];
  const items=all(`SELECT v.id,v.slug,v.poster,v.duration FROM videos v WHERE v.id IN (${ids.map(()=>'?').join(',')}) AND v.status='PUBLISHED' AND NOT EXISTS(SELECT 1 FROM content_holds h WHERE h.video_id=v.id AND h.closed_at IS NULL)`,...ids).map(x=>({...x,canonicalUrl:'/videos/'+encodeURIComponent(x.slug)}));
  return respond(res,{items}),true;
 } // D08
 if(m==='GET'&&p==='/api/search/alternatives')return respond(res,{query:q,items:alternatives(q)}),true; // D09
 if(p==='/api/admin/search/aliases'){
  const admin=requireAdmin(req);
  if(m==='GET')return respond(res,{items:all('SELECT id,alias,kind,target_slug AS targetSlug,created_at AS createdAt FROM catalog_aliases ORDER BY alias LIMIT 200')}),true;
  if(m==='POST'){
   const b=await json(req),alias=safe(b.alias,60).toLocaleLowerCase('en'),kind=b.kind,slug=safe(b.targetSlug,80);
   if(alias.length<2||!/^[-\p{L}\p{N} ]+$/u.test(alias)||!KINDS.includes(kind)||!one(`SELECT 1 FROM ${kind} WHERE slug=?`,slug))bad('Invalid alias target');
   if(one('SELECT 1 FROM catalog_aliases WHERE alias=? COLLATE NOCASE',alias))bad('Alias already exists',409);
   const id=Number(run('INSERT INTO catalog_aliases(alias,kind,target_slug,created_at) VALUES(?,?,?,?)',alias,kind,slug,now()).lastInsertRowid);adminAudit(admin,'catalog_alias',id,'CREATE');return respond(res,{id,alias,kind,targetSlug:slug},201),true;
  }
 }
 const aliasDel=p.match(/^\/api\/admin\/search\/aliases\/(\d+)$/);
 if(m==='DELETE'&&aliasDel){const admin=requireAdmin(req),r=run('DELETE FROM catalog_aliases WHERE id=?',Number(aliasDel[1]));if(!r.changes)bad('Alias not found',404);adminAudit(admin,'catalog_alias',aliasDel[1],'DELETE');return respond(res,{ok:true}),true}
 if(m==='GET'&&p==='/api/admin/catalog/duplicates'){
  requireAdmin(req);const rows=all(`SELECT v.id,v.title,v.channel_id AS channelId,v.status,v.slug FROM videos v ORDER BY v.channel_id,v.id`),groups=new Map();
  for(const v of rows){const key=v.channelId+':'+v.title.toLocaleLowerCase('en').replace(/[^\p{L}\p{N}]+/gu,' ').trim();if(!groups.has(key))groups.set(key,[]);groups.get(key).push(v)}
  return respond(res,{groups:[...groups.values()].filter(x=>x.length>1).slice(0,100),notice:'Potential duplicates only; no automatic deletion or publication.'}),true;
 } // D07
 if(p==='/api/me/saved-filters'){
  const u=requireUser(req);
  if(m==='GET')return respond(res,{items:all('SELECT id,name,filters_json AS filtersJson,created_at AS createdAt FROM saved_search_filters WHERE user_id=? ORDER BY id DESC',u.id).map(x=>({...x,filters:JSON.parse(x.filtersJson),filtersJson:undefined}))}),true;
  if(m==='POST'){
   const b=await json(req),name=safe(b.name,60),filters=validFilter(b.filters);
   if(name.length<2||name.length>60)bad('Name must be 2–60 characters');
   if(one('SELECT COUNT(*) AS n FROM saved_search_filters WHERE user_id=?',u.id).n>=20)bad('Maximum 20 saved filters',409);
   const id=Number(run('INSERT INTO saved_search_filters(user_id,name,filters_json,created_at) VALUES(?,?,?,?)',u.id,name,JSON.stringify(filters),now()).lastInsertRowid);return respond(res,{id,name,filters},201),true;
  }
 }
 const savedDel=p.match(/^\/api\/me\/saved-filters\/(\d+)$/);
 if(m==='DELETE'&&savedDel){const u=requireUser(req),r=run('DELETE FROM saved_search_filters WHERE id=? AND user_id=?',Number(savedDel[1]),u.id);if(!r.changes)bad('Saved filter not found',404);return respond(res,{ok:true}),true} // D10
 if(p==='/api/studio/profile'){
  const u=requireUser(req),profile=one('SELECT user_id AS userId,display_name AS displayName,status,channel_id AS channelId,bio FROM creator_profiles WHERE user_id=?',u.id);if(!profile)bad('Creator profile required',403);
  if(m==='GET')return respond(res,{profile}),true;
  if(m==='PATCH'){
   const b=await json(req);if(typeof b.bio!=='string'||b.bio.length>1000)bad('Bio must be at most 1000 characters');
   run('UPDATE creator_profiles SET bio=? WHERE user_id=?',b.bio.trim(),u.id);return respond(res,{ok:true,bio:b.bio.trim()}),true;
  }
 } // E01
 if(m==='GET'&&p==='/api/studio/insights'){
  const u=requireUser(req);if(!one('SELECT 1 FROM creator_profiles WHERE user_id=?',u.id))bad('Creator profile required',403);
  const summary=one(`SELECT COUNT(*) AS uploads,COALESCE(SUM(v.views),0) AS lifetimeViews,COALESCE(SUM(v.likes),0) AS lifetimeLikes,COALESCE(SUM(v.dislikes),0) AS lifetimeDislikes,
   COALESCE(SUM((SELECT COUNT(*) FROM comments c WHERE c.video_id=v.id AND c.hidden=0)),0) AS visibleComments,
   COALESCE(SUM((SELECT COUNT(*) FROM favorites f WHERE f.video_id=v.id)),0) AS currentFavorites
   FROM upload_sessions x JOIN videos v ON v.id=x.video_id WHERE x.user_id=?`,u.id);
  return respond(res,{summary,period:'lifetime',note:'Aggregated counters only; no daily-view time series is available.'}),true;
 } // E02
 if(m==='GET'&&p==='/api/studio/uploads/catalog'){
  const u=requireUser(req),status=url.searchParams.get('status')||'',page=int(url.searchParams.get('page'),1,1,10000),limit=int(url.searchParams.get('limit'),20,1,50);
  const valid=['UPLOADING','QUEUED','PROCESSING','FAILED','IN_REVIEW','PUBLISHED','REJECTED'];if(status&&!valid.includes(status))bad('Invalid upload status');
  const clause=status?'AND x.status=?':'',args=status?[u.id,status]:[u.id];
  const total=one(`SELECT COUNT(*) AS n FROM upload_sessions x WHERE x.user_id=? ${clause}`,...args).n;
  const items=all(`SELECT x.id,x.status,x.created_at AS createdAt,x.updated_at AS updatedAt,x.received_bytes AS receivedBytes,x.expected_bytes AS expectedBytes,v.id AS videoId,v.title,v.slug,v.status AS videoStatus FROM upload_sessions x JOIN videos v ON v.id=x.video_id WHERE x.user_id=? ${clause} ORDER BY x.created_at DESC,x.id DESC LIMIT ? OFFSET ?`,...args,limit,(page-1)*limit);
  return respond(res,{items,total,page,limit,pages:Math.ceil(total/limit)}),true;
 } // E03
 const ready=p.match(/^\/api\/studio\/uploads\/([a-f0-9-]{36})\/readiness$/);
 if(m==='GET'&&ready){const u=requireUser(req),x=ownUpload(u,ready[1]);
  const hold=!!one('SELECT 1 FROM content_holds WHERE video_id=? AND closed_at IS NULL',x.video_id);
  const categories=one('SELECT COUNT(*) AS n FROM video_categories WHERE video_id=?',x.video_id).n;
  const license=one('SELECT status FROM media_license_reviews WHERE upload_id=? ORDER BY rowid DESC LIMIT 1',x.id);
  const checks={fileReceived:x.received_bytes===x.expected_bytes,metadataPresent:x.title.trim().length>=8&&categories>0,creatorApproved:one("SELECT status='APPROVED' AS ok FROM creator_profiles WHERE user_id=?",u.id)?.ok===1,declarationsPresent:!!(x.rights_declaration&&x.adults_declaration&&x.consent_declaration),noActiveHold:!hold,processingApproved:x.status==='PUBLISHED',licenseReviewRecorded:!!license};
  return respond(res,{id:x.id,status:x.status,checks,readyForPublicRelease:false,requiresHumanApproval:true,note:'Checklist does not verify actual identity, consent, license validity, or production readiness.'}),true;
 } // E04
 const notes=p.match(/^\/api\/studio\/uploads\/([a-f0-9-]{36})\/notes$/);
 if(notes){const u=requireUser(req),x=ownUpload(u,notes[1]);
  if(m==='GET')return respond(res,{id:x.id,notes:one('SELECT notes FROM creator_upload_notes WHERE upload_id=? AND user_id=?',x.id,u.id)?.notes||''}),true;
  if(m==='PATCH'){
   const b=await json(req);if(typeof b.notes!=='string'||b.notes.length>2000)bad('Notes must be at most 2000 characters');
   run('INSERT INTO creator_upload_notes(upload_id,user_id,notes,updated_at) VALUES(?,?,?,?) ON CONFLICT(upload_id) DO UPDATE SET notes=excluded.notes,updated_at=excluded.updated_at',x.id,u.id,b.notes,now());return respond(res,{ok:true,notes:b.notes}),true;
  }
 } // E05
 // D08: private prototype follows for catalog entities. Source rights are NOT verified here.
 if(p==='/api/me/entity-follows'){
  const u=requireUser(req);
  if(m==='GET')return respond(res,{items:all(`SELECT kind,entity_id AS entityId,created_at AS createdAt FROM entity_follows WHERE user_id=? ORDER BY created_at DESC`,u.id)}),true;
  if(m==='POST'){
   const b=await json(req),kind=b.kind,id=Number(b.entityId);
   if(!['performers','sites','networks'].includes(kind)||!Number.isSafeInteger(id)||id<1)bad('Invalid follow target');
   if(!one(`SELECT 1 FROM ${kind} WHERE id=?`,id))bad('Catalog entry not found',404);
   // Only entries with at least one published video may be followed.
   const eligible={performers:`SELECT 1 FROM video_performers vp JOIN videos v ON v.id=vp.video_id WHERE vp.performer_id=? AND v.status='PUBLISHED'`,sites:`SELECT 1 FROM videos v WHERE v.site_id=? AND v.status='PUBLISHED'`,networks:`SELECT 1 FROM videos v JOIN sites s ON s.id=v.site_id WHERE s.network_id=? AND v.status='PUBLISHED'`}[kind];
   if(!one(eligible+' LIMIT 1',id))bad('No published content for this entry',404);
   run('INSERT OR IGNORE INTO entity_follows(user_id,kind,entity_id,created_at) VALUES(?,?,?,?)',u.id,kind,id,now());return respond(res,{ok:true,following:true,sourceRightsVerified:false}),true;
  }
 }
 const followDelete=p.match(/^\/api\/me\/entity-follows\/(performers|sites|networks)\/(\d+)$/);
 if(m==='DELETE'&&followDelete){const u=requireUser(req),r=run('DELETE FROM entity_follows WHERE user_id=? AND kind=? AND entity_id=?',u.id,followDelete[1],Number(followDelete[2]));if(!r.changes)bad('Follow not found',404);return respond(res,{ok:true}),true}
 return false;
}
