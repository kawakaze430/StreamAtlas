/** Offline-only product improvements. No network calls or external data dependencies.
 * Untrusted uploads, identity documents, and unlicensed media remain out of scope.
 */
import {all,one,db} from './database.js';
import crypto from 'node:crypto';
import {evaluateScenarios} from './recommendation-eval.js';

const catalogueFilter="v.status='PUBLISHED' AND NOT EXISTS (SELECT 1 FROM content_holds h WHERE h.video_id=v.id AND h.closed_at IS NULL)";
const error=(message,status=400)=>{const x=new Error(message);x.status=status;throw x};
const respond=(res,data,status=200)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow'});res.end(JSON.stringify(data));return true};
const safeInt=(v,def,min,max)=>{if(v==null||v==='')return def;if(!/^\d+$/.test(String(v)))error('Invalid integer parameter');const n=Number(v);if(!Number.isSafeInteger(n)||n<min||n>max)error('Parameter out of bounds');return n};
const LANGUAGES={
 en:{home:'Home',videos:'Videos',categories:'Categories',search:'Search',channels:'Channels',queue:'Watch Queue',latest:'Latest',history:'Watch History',captions:'Captions',access:'Restricted access'},
 hi:{home:'होम',videos:'वीडियो',categories:'श्रेणियां',search:'खोजें',channels:'चैनल',queue:'देखने की कतार',latest:'नवीनतम',history:'देखने का इतिहास',captions:'उपशीर्षक',access:'सीमित पहुंच'},
 es:{home:'Inicio',videos:'Videos',categories:'Categorías',search:'Buscar',channels:'Canales',queue:'Cola',latest:'Recientes',history:'Historial',captions:'Subtítulos',access:'Acceso restringido'}
};
export function locales(){return LANGUAGES}
export function canonicalMetadata(video){
 if(!video||typeof video.slug!=='string'||!/^[a-z0-9-]{1,150}$/.test(video.slug))error('Invalid catalog record');
 return {canonicalPath:'/videos/'+video.slug,title:String(video.title||'').slice(0,150),robots:'noindex,nofollow',previewAvailable:false,publicIndexingAllowed:false};
}
export function rankedDiverseCandidates(candidates,{limit=12,maxPerChannel=2,arm='balanced'}={}){
 if(!['balanced','popularity'].includes(arm))error('Invalid experimental arm');
 const seen=new Set(),channelCounts=new Map(),out=[];
 const sorted=[...candidates].filter(v=>v?.status==='PUBLISHED'&&!v.safetyHold && Number.isFinite(v.id)).sort((a,b)=>{
  const score=v=>arm==='popularity'?Math.log1p(Math.max(0,v.views||0)):(Math.log1p(Math.max(0,v.views||0))+(v.categoryMatch||0)*1.5+(v.following?4:0));
  return score(b)-score(a)||b.id-a.id;
 });
 for(const candidate of sorted){if(seen.has(candidate.id))continue;seen.add(candidate.id);
  const k=candidate.channelId||0,n=channelCounts.get(k)||0;
  if(n>=maxPerChannel)continue;
  out.push(candidate);channelCounts.set(k,n+1);if(out.length===limit)break;
 }
 return out;
}
export function compareRecommendationArms(rows){
 const popularity=rankedDiverseCandidates(rows,{limit:12,maxPerChannel:12,arm:'popularity'});
 const balanced=rankedDiverseCandidates(rows,{limit:12,maxPerChannel:2,arm:'balanced'});
 const metrics=arr=>({count:arr.length,uniqueChannels:new Set(arr.map(x=>x.channelId)).size,meanViews:arr.length?Math.round(arr.reduce((s,x)=>s+Math.max(0,x.views||0),0)/arr.length):0,videoIds:arr.map(x=>x.id)});
 return {population:'eligible synthetic catalog only',experimentType:'offline deterministic evaluation; no human experiment assignment',popularity:metrics(popularity),balanced:metrics(balanced)};
}
export function proposeTags(title,allowed){
 const input=String(title||'').toLowerCase();if(input.length>180)error('Title too long');
 return allowed.filter(c=>c&&typeof c.name==='string'&&c.name.length>=3&&new RegExp('(^|[^\\p{L}\\p{N}])'+c.name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&').toLowerCase()+'($|[^\\p{L}\\p{N}])','u').test(input)).slice(0,6).map(c=>({categoryId:c.id,label:c.name,origin:'exact local taxonomy match',reviewRequired:true}));
}
export function shortlistShorts(rows,limit=12){return rows.filter(x=>x.status==='PUBLISHED'&&!x.safetyHold&&x.duration>0&&x.duration<=60).sort((a,b)=>b.views-a.views||b.id-a.id).slice(0,limit)}

export async function roadmap32Api(req,res,url,{requireUser,requireAdmin}){
 const p=url.pathname,m=req.method;
 const isPublished=`${catalogueFilter}`;
 if(m==='GET'&&p==='/api/catalog/shorts'){
  const limit=safeInt(url.searchParams.get('limit'),12,1,36);
  const rows=all(`SELECT v.id,v.title,v.slug,v.duration,v.poster,v.media_url AS mediaUrl,v.views,v.likes,v.dislikes,v.quality,v.channel_id AS channelId,ch.name AS channelName,ch.slug AS channelSlug FROM videos v JOIN channels ch ON ch.id=v.channel_id WHERE ${isPublished} AND v.duration>0 AND v.duration<=60 ORDER BY v.views DESC,v.id DESC LIMIT ?`,limit);
  return respond(res,{items:rows,disclaimer:'Synthetic catalog examples; short-form playback is not yet a standalone mobile UI'});
 }
 if(m==='GET'&&p==='/api/catalog/canonical'){
  const slug=url.searchParams.get('slug')||'';
  if(!/^[a-z0-9-]{1,150}$/.test(slug))error('Invalid slug');
  const v=one(`SELECT v.slug,v.title FROM videos v WHERE v.slug=? AND ${isPublished}`,slug);
  if(!v)error('Not found',404);
  return respond(res,canonicalMetadata(v));
 }
 if(m==='GET'&&p==='/api/catalog/related-categories'){
  const slug=url.searchParams.get('slug')||'';if(!/^[a-z0-9-]{1,100}$/.test(slug))error('Invalid category');
  const category=one('SELECT id,name FROM categories WHERE slug=?',slug);if(!category)error('Category not found',404);
  const items=all(`SELECT c.id,c.name,c.slug,COUNT(DISTINCT v.id) AS sharedVideos FROM video_categories a JOIN video_categories b ON b.video_id=a.video_id AND b.category_id<>a.category_id JOIN categories c ON c.id=b.category_id JOIN videos v ON v.id=a.video_id WHERE a.category_id=? AND ${isPublished} GROUP BY c.id ORDER BY sharedVideos DESC,c.name LIMIT 12`,category.id);
  return respond(res,{category:category.name,items});
 }
 if(m==='GET'&&p==='/api/localization/dictionary'){
  const lang=url.searchParams.get('lang')||'en';if(!LANGUAGES[lang])error('Unsupported language',400);
  return respond(res,{language:lang,labels:LANGUAGES[lang],coverage:'navigation vocabulary only; full UI localization pending'});
 }
 if(m==='GET'&&p==='/api/me/sync-summary'){
  const u=requireUser(req);
  const preference=one('SELECT * FROM user_preferences WHERE user_id=?',u.id);
  const counts=one('SELECT COUNT(*) AS videos,MAX(watched_at) AS lastUpdated FROM watch_progress WHERE user_id=?',u.id);
  return respond(res,{settingsUpdatedAt:preference?.updated_at||null,watchedVideoCount:counts.videos,progressUpdatedAt:counts.lastUpdated,notice:'Server state is shared across authenticated sessions; device and network sync still requires real-world tests.'});
 }
 if(m==='GET'&&p==='/api/me/entity-follows/summary'){
  const u=requireUser(req);
  return respond(res,{counts:all('SELECT kind,COUNT(*) AS total FROM entity_follows WHERE user_id=? GROUP BY kind',u.id),notice:'Only records owned by the requesting account.'});
 }
 if(m==='GET'&&p==='/api/studio/metadata-suggestions'){
  const u=requireUser(req),id=url.searchParams.get('uploadId')||'';
  if(!/^[a-f0-9-]{36}$/.test(id))error('Invalid upload ID');
  const upload=one('SELECT x.id,x.status,x.user_id,v.title FROM upload_sessions x JOIN videos v ON v.id=x.video_id WHERE x.id=?',id);
  if(!upload)error('Upload unavailable',404);
  if(upload.user_id!==u.id){const role=one("SELECT role FROM creator_collaborators WHERE owner_id=? AND collaborator_id=? AND status='ACCEPTED'",upload.user_id,u.id)?.role;if(role!=='EDITOR')error('Upload unavailable',404)}
  const suggested=proposeTags(upload.title,all('SELECT id,name FROM categories ORDER BY name'));
  return respond(res,{uploadId:id,title:upload.title,suggestions:suggested,autoApplied:false,explanation:'Exact local taxonomy matches only; creator must review metadata. No external model is used.'});
 }
 if(m==='GET'&&p==='/api/studio/analytics/privacy-overview'){
  const u=requireUser(req);
  const owned=one('SELECT 1 FROM creator_profiles WHERE user_id=?',u.id);if(!owned)error('Creator profile required',403);
  const data=all(`SELECT q.video_id AS videoId,SUM(q.samples) AS samples,SUM(q.completions) AS completions,SUM(q.errors_total) AS playbackErrors FROM video_qoe_daily q JOIN upload_sessions x ON x.video_id=q.video_id WHERE x.user_id=? GROUP BY q.video_id ORDER BY samples DESC LIMIT 50`,u.id);
  return respond(res,{items:data.map(x=>({videoId:x.videoId,samples:x.samples>=5?x.samples:null,completions:x.samples>=5?x.completions:null,playbackErrors:x.samples>=5?x.playbackErrors:null,privacySuppressed:x.samples<5})),privacy:'No viewer identifiers; data suppressed below five opt-in playback samples.'});
 }
 if(m==='GET'&&p==='/api/admin/recommendations/cold-start-evaluation'){
  requireAdmin(req);
  const videos=all(`SELECT v.id,v.title,v.channel_id AS channelId,v.status,v.views FROM videos v WHERE ${isPublished} ORDER BY v.id ASC LIMIT 250`);
  const categories=all('SELECT video_id AS videoId,category_id AS categoryId FROM video_categories');
  const performers=all('SELECT video_id AS videoId,performer_id AS performerId FROM video_performers');
  const features=videos.map(v=>({...v,categoryIds:categories.filter(x=>x.videoId===v.id).map(x=>x.categoryId),performerIds:performers.filter(x=>x.videoId===v.id).map(x=>x.performerId)}));
  const scenarios=features.slice(0,Math.min(8,features.length)).map(seed=>({seed,relevant:features.filter(v=>v.id!==seed.id && v.categoryIds.some(x=>seed.categoryIds.includes(x))).slice(0,10).map(v=>v.id)}));
  return respond(res,{...evaluateScenarios(scenarios,features,{k:10}),dataset:'Local synthetic metadata only; relevance labels are category overlaps, not human outcomes.'});
 }
 if(m==='GET'&&p==='/api/admin/recommendations/offline-evaluation'){
  requireAdmin(req);
  const rows=all(`SELECT v.id,v.status,v.channel_id AS channelId,v.views FROM videos v WHERE ${isPublished} ORDER BY v.views DESC LIMIT 250`);
  return respond(res,compareRecommendationArms(rows));
 }
 if(m==='GET'&&p==='/api/admin/launch/readiness-preview'){
  requireAdmin(req);
  return respond(res,{readyForPublicLaunch:false,checks:{awsApplied:false,licensedMediaVerified:false,participantVerificationApproved:false,ageAssuranceExternallyVerified:false,independentSecurityAuditPassed:false},notice:'Always fail closed. Only independent documented acceptance may authorize future launch work.'});
 }
 if(m==='GET'&&p==='/api/compliance/appeal-guidance'){
  return respond(res,{submissionRoute:'/api/compliance/cases/{caseId}/appeal',eligibility:'Only the original uploader may contest a case after initial decision',republication:'An appeal never automatically republishes content',notice:'Prototype procedural information only; jurisdiction-specific counter-notice and repeat-infringer rules need counsel.'});
 }
 if(m==='GET'&&p==='/api/compliance/intake-guidance'){
  return respond(res,{categories:['COPYRIGHT','CONSENT','AGE','PRIVACY','OTHER'],referenceFormat:'Opaque case reference without document contents',notice:'Urgent reports require human escalation; this form is not a substitute for regulatory/legal procedures.'});
 }
 return false;
}
