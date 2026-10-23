/** Bounded, signed, filtered keyset pagination for the local public video catalog.
 * A cursor is navigation state, NOT an authorization token; visibility is checked on every request.
 * For production/multi-worker runs configure a stable SA_SEARCH_CURSOR_SECRET (32+ chars).
 */
import crypto from 'node:crypto';
import {all,one} from './database.js';
const DEV_SECRET=crypto.randomBytes(32);
const SORTS={latest:{expr:'v.published_at',dir:'DESC',type:'text'},oldest:{expr:'v.published_at',dir:'ASC',type:'text'},'most-viewed':{expr:'v.views',dir:'DESC',type:'number'},duration:{expr:'v.duration',dir:'DESC',type:'number'}};
const KINDS=['category','performer','site','network','channel'];
const ALLOWED=new Set(['q','sort','quality','tag','category','performer','site','network','channel','minDuration','maxDuration','publishedAfter','publishedBefore','limit','after']);
const enc=(x)=>Buffer.from(JSON.stringify(x)).toString('base64url');
const err=(message)=>{const e=new Error(message);e.status=400;throw e};
function secret(){const s=process.env.SA_SEARCH_CURSOR_SECRET;if(s&&s.length>=32)return Buffer.from(s);if(process.env.NODE_ENV==='production')err('Cursor secret is not configured');return DEV_SECRET}
function sign(text){return crypto.createHmac('sha256',secret()).update(text).digest('base64url')}
function decode(text){if(!/^[\w-]{15,1800}\.[\w-]{43}$/.test(text))err('Invalid cursor');const [data,mac]=text.split('.');const actual=Buffer.from(sign(data),'base64url'),provided=Buffer.from(mac,'base64url');if(actual.length!==provided.length||!crypto.timingSafeEqual(actual,provided))err('Invalid cursor signature');try{return JSON.parse(Buffer.from(data,'base64url').toString('utf8'))}catch{err('Invalid cursor payload')}}
function date(v){return /^\d{4}-\d\d-\d\d$/.test(v)&&!Number.isNaN(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v}
function getFilters(p){
 for(const key of p.keys())if(!ALLOWED.has(key))err('Unsupported search filter: '+key);
 const f={};for(const name of ['q','tag',...KINDS,'quality','publishedAfter','publishedBefore'])f[name]=String(p.get(name)||'').trim();
 f.q=f.q.slice(0,80);
 for(const name of KINDS)if(f[name]&&!/^[a-z0-9-]{1,90}$/.test(f[name]))err('Invalid '+name);
 if(f.tag&&!/^[a-z0-9-]{1,60}$/.test(f.tag))err('Invalid tag');
 if(f.quality&&!['HD','4K','1080p'].includes(f.quality))err('Invalid quality');
 for(const n of ['publishedAfter','publishedBefore'])if(f[n]&&!date(f[n]))err('Invalid publication date');
 if(f.publishedAfter&&f.publishedBefore&&f.publishedAfter>f.publishedBefore)err('Invalid publication date range');
 for(const n of ['minDuration','maxDuration']){const v=p.get(n);if(v===null||v==='')f[n]=null;else if(!/^\d{1,5}$/.test(v)||Number(v)>86400)err('Invalid duration');else f[n]=Number(v)}
 if(f.minDuration!==null&&f.maxDuration!==null&&f.minDuration>f.maxDuration)err('Invalid duration range');
 f.sort=p.get('sort')||'latest';if(!SORTS[f.sort])err('Invalid sort');
 return f;
}
function whereFor(f){const where=["v.status='PUBLISHED'",'NOT EXISTS (SELECT 1 FROM content_holds h WHERE h.video_id=v.id AND h.closed_at IS NULL)'];const args=[];
 const like='%'+f.q.replace(/[\\%_]/g,s=>'\\'+s)+'%';
 if(f.q){where.push(`(v.title LIKE ? ESCAPE '\\' OR ch.name LIKE ? ESCAPE '\\' OR s.name LIKE ? ESCAPE '\\' OR n.name LIKE ? ESCAPE '\\' OR EXISTS (SELECT 1 FROM video_categories vc JOIN categories c ON c.id=vc.category_id WHERE vc.video_id=v.id AND c.name LIKE ? ESCAPE '\\') OR EXISTS (SELECT 1 FROM video_performers vp JOIN performers pe ON pe.id=vp.performer_id WHERE vp.video_id=v.id AND pe.name LIKE ? ESCAPE '\\'))`);args.push(...Array(6).fill(like))}
 if(f.tag){where.push('EXISTS(SELECT 1 FROM video_tag_links vt JOIN catalog_tags t ON t.id=vt.tag_id WHERE vt.video_id=v.id AND t.slug=?)');args.push(f.tag)}
 if(f.category){where.push('EXISTS(SELECT 1 FROM video_categories vc JOIN categories c ON c.id=vc.category_id WHERE vc.video_id=v.id AND c.slug=?)');args.push(f.category)}
 if(f.performer){where.push('EXISTS(SELECT 1 FROM video_performers vp JOIN performers pe ON pe.id=vp.performer_id WHERE vp.video_id=v.id AND pe.slug=?)');args.push(f.performer)}
 for(const [key,col] of [['site','s.slug'],['network','n.slug'],['channel','ch.slug'],['quality','v.quality']])if(f[key]){where.push(`${col}=?`);args.push(f[key])}
 for(const [key,op,col] of [['minDuration','>=','v.duration'],['maxDuration','<=','v.duration'],['publishedAfter','>=','substr(v.published_at,1,10)'],['publishedBefore','<=','substr(v.published_at,1,10)']])if(f[key]!==null&&f[key]!==''){where.push(`${col} ${op} ?`);args.push(f[key])}
 return {sql:where.join(' AND '),args};
}
const FROM='FROM videos v JOIN channels ch ON ch.id=v.channel_id JOIN sites s ON s.id=v.site_id LEFT JOIN networks n ON n.id=s.network_id';
export function queryVideoCursor(params){const filters=getFilters(params),sort=SORTS[filters.sort],limit=+(params.get('limit')||16);if(!Number.isSafeInteger(limit)||limit<1||limit>50)err('Invalid page limit');
 const {sql,args}=whereFor(filters),queryHash=crypto.createHash('sha256').update(JSON.stringify(filters)).digest('hex');
 let more='',cursorArgs=[];
 if(params.get('after')){
  const c=decode(params.get('after'));if(c.v!==1||c.filterHash!==queryHash||!Number.isSafeInteger(c.id)||c.id<1||typeof c.key!==(sort.type==='text'?'string':'number'))err('Cursor does not match filters');
  if(sort.type==='text'&&(c.key.length>80||!/^\d{4}-\d\d-\d\d/.test(c.key)))err('Invalid cursor sort value');
  if(sort.type==='number'&&(!Number.isFinite(c.key)||c.key<0))err('Invalid cursor sort value');
  const op=sort.dir==='ASC'?'>':'<';more=` AND (${sort.expr} ${op} ? OR (${sort.expr}=? AND v.id < ?))`;cursorArgs=[c.key,c.key,c.id];
 }
 const sqlRows=`SELECT v.id,v.title,v.slug,v.poster,v.duration,v.views,v.quality,v.published_at AS publishedAt,s.name AS siteName,ch.name AS channelName,${sort.expr} AS sortKey ${FROM} WHERE ${sql}${more} ORDER BY ${sort.expr} ${sort.dir},v.id DESC LIMIT ?`;
 const rows=all(sqlRows,...args,...cursorArgs,limit+1),items=rows.slice(0,limit),last=items.at(-1);
 const token=rows.length>limit&&last?(()=>{const data=enc({v:1,filterHash:queryHash,key:last.sortKey,id:last.id});return data+'.'+sign(data)})():null;
 return {items:items.map(({sortKey,...item})=>({...item,canonicalUrl:'/videos/'+encodeURIComponent(item.slug)})),nextCursor:token,hasMore:!!token,sort:filters.sort,limit,filters};
}
export function searchFacetCounts(params){const filters=getFilters(params),{sql,args}=whereFor(filters);
 const total=one(`SELECT COUNT(*) AS n ${FROM} WHERE ${sql}`,...args).n;
 const dimensions={tags:{joins:'JOIN video_tag_links vt ON vt.video_id=v.id JOIN catalog_tags t ON t.id=vt.tag_id',select:'t.slug,t.name',group:'t.id'},qualities:{select:'v.quality',label:'name'},categories:{joins:'JOIN video_categories vc ON vc.video_id=v.id JOIN categories c ON c.id=vc.category_id',select:'c.slug,c.name',group:'c.id'},sites:{select:'s.slug,s.name',group:'s.id'},networks:{select:'n.slug,n.name',group:'n.id'},channels:{select:'ch.slug,ch.name',group:'ch.id'},performers:{joins:'JOIN video_performers vp ON vp.video_id=v.id JOIN performers pe ON pe.id=vp.performer_id',select:'pe.slug,pe.name',group:'pe.id'}};
 const result={};for(const [kind,d] of Object.entries(dimensions)){
  result[kind]=all(`SELECT ${d.select},COUNT(DISTINCT v.id) AS count ${FROM} ${d.joins||''} WHERE ${sql} GROUP BY ${d.group||d.select} ORDER BY count DESC,1 ASC LIMIT 30`,...args);
 }
 return {total,filters,facets:result};
}
