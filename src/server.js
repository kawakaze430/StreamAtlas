import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {db,all,one,run,now,createToken,tokenHash,hashPassword,verifyPassword} from './database.js';
import {uploadApi,recoverUploads} from './uploads.js';
import {studioOperationsApi} from './studio-operations.js';
import {operationalControlsApi} from './operational-controls34.js';
import {complianceOperationsApi,dualReviewRequired} from './compliance-operations.js';
import {discoveryApi,catalogSuggestions} from './discovery.js';
import {makeCsrf,verifyMutation,rateLimit} from './security.js';
import {error as accountError,developmentMailerEnabled,issueAccountToken,consumeAccountToken,deliverDevelopmentMail,newTotpSecret,encryptSecret,decryptSecret,totp,verifyTotp,verifyAndConsumeMfa} from './account-security.js';
import {fork} from 'node:child_process';
import {operationsSnapshot,workerHealth} from './operations.js';
import {verifySignedWebhook,applyVerificationEvent,issueVerificationChallenge} from './verification-integration.js';
import {authorizeMetrics,countResponse,metricsText} from './metrics.js';
import {assuranceSummary,requirePrivateViewer,authorizePrivateMedia} from './playback-authorization.js';
import {signedMediaCookies} from './cloudfront-access.js';
import {verifyTrustedGeo,evaluateTerritory,parseCountryList} from './territory-policy.js';
import {demoPlayerAssets} from './demo-player.js';
import {playbackQoeApi} from './playback-qoe.js';
import {queueVideoRevocation,pendingRevocations} from './media-revocation.js';
import {verifyLicenseReview,revokeLicenseReview,getLicenseReview} from './license-lifecycle.js';
import {commentSignals,duplicateCandidates} from './abuse-review.js';
import {roadmap32Api} from './roadmap32.js';
import {catalogTagsApi} from './catalog-tags.js';
import {creatorBatch35Api} from './creator-batch35.js';
import {creatorInsights36Api} from './creator-insights36.js';
import {readQualityOptions} from './media-ladder.js';
// No environment flag can waive independent adult-content launch verification.
if(process.env.SA_PUBLIC_CONTENT_MODE==='1')throw Error('Public-content launch is deliberately disabled: external legality, identity/age, participant consent, rights and hosting approvals are NOT implemented.');
// Fail closed for common security configuration omissions in production.
if(process.env.NODE_ENV==='production'){
 if(!process.env.SA_CSRF_SECRET||process.env.SA_CSRF_SECRET.length<32)throw Error('Production requires a stable SA_CSRF_SECRET of at least 32 characters');
 if(!process.env.SA_PUBLIC_ORIGIN||!/^https:\/\//.test(process.env.SA_PUBLIC_ORIGIN))throw Error('Production requires an HTTPS SA_PUBLIC_ORIGIN');
 if(process.env.SA_PRIVATE_PREVIEW_REQUIRE_RECEIPT!=='1')throw Error('Production preview requires SA_PRIVATE_PREVIEW_REQUIRE_RECEIPT=1; public release is disabled.');
 if(process.env.SA_DEV_MAIL_OUTBOX==='1')throw Error('Production preview cannot enable development mail outbox.');
 if(process.env.TRUST_PROXY==='1'&&!process.env.SA_PROXY_TRUST_ACK)throw Error('Production proxy trust requires SA_PROXY_TRUST_ACK=1 after proxy header validation');
}
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const VERSION=JSON.parse(fs.readFileSync(path.join(ROOT,'package.json'),'utf8')).version;
const CHECKPOINT=Number(VERSION.split('.')[1]);
const PUBLIC=path.join(ROOT,'public');
const PORT=Number(process.env.PORT||3000);
const JSON_HEADERS={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'};
const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.ico':'image/x-icon','.mp4':'video/mp4','.vtt':'text/vtt; charset=utf-8','.m3u8':'application/vnd.apple.mpegurl','.ts':'video/mp2t','.json':'application/json','.webmanifest':'application/manifest+json','.txt':'text/plain; charset=utf-8','.xml':'application/xml; charset=utf-8'};
const VIDEO_COLS=`v.id,v.title,v.slug,v.poster,v.media_url AS mediaUrl,v.duration,v.quality,v.views,v.likes,v.dislikes,v.published_at AS publishedAt,v.site_id AS siteId,v.channel_id AS channelId,s.name AS siteName,s.slug AS siteSlug,n.id AS networkId,n.name AS networkName,n.slug AS networkSlug,ch.name AS channelName,ch.slug AS channelSlug, (SELECT group_concat(c.name,' | ') FROM categories c JOIN video_categories vc ON vc.category_id=c.id WHERE vc.video_id=v.id) AS categoriesText,(SELECT group_concat(p.name,' | ') FROM performers p JOIN video_performers vp ON vp.performer_id=p.id WHERE vp.video_id=v.id) AS performersText`;
const VIDEO_FROM='FROM videos v JOIN sites s ON s.id=v.site_id LEFT JOIN networks n ON n.id=s.network_id JOIN channels ch ON ch.id=v.channel_id';
const SQL_VIDEOS=`SELECT ${VIDEO_COLS} ${VIDEO_FROM}`;
// Every viewer-facing catalog entrypoint must apply the same active-hold exclusion.
const NO_HOLD="NOT EXISTS(SELECT 1 FROM content_holds h WHERE h.video_id=v.id AND h.closed_at IS NULL)";
function availableVideo(id){return one(`SELECT v.id FROM videos v WHERE v.id=? AND v.status='PUBLISHED' AND ${NO_HOLD}`,id);}
const simpleVideo=v=>v&&({...v,previewFrame:demoPlayerAssets(v.mediaUrl)?.previewFrames?.[0]?.url||null,categories:v.categoriesText?v.categoriesText.split(' | '):[],performers:v.performersText?v.performersText.split(' | '):[]});
function send(res,obj,status=200,headers={}){res.writeHead(status,{...JSON_HEADERS,...headers});res.end(JSON.stringify(obj));}
function fail(message,status=400){const error=new Error(message);error.status=status;throw error;}
const parseCookies=req=>Object.fromEntries((req.headers.cookie||'').split(';').filter(part=>part.includes('=')).map(part=>{const i=part.indexOf('=');let value='';try{value=decodeURIComponent(part.slice(i+1).trim())}catch{}return [part.slice(0,i).trim(),value]}));
function currentUser(req){const token=parseCookies(req).sa_session;if(!token)return null;const row=one('SELECT u.id,u.email,u.name,u.role FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>? AND NOT EXISTS(SELECT 1 FROM closed_accounts c WHERE c.user_id=u.id)',tokenHash(token),now());return row||null;}
function secureCookie(req,token,maxAge=2592000){const secure=process.env.NODE_ENV==='production'||Boolean(req.socket.encrypted)||(process.env.TRUST_PROXY==='1'&&req.headers['x-forwarded-proto']==='https');return `sa_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${maxAge}${secure?'; Secure':''}`;}
function createSession(req,res,user){const token=createToken();run('INSERT INTO sessions(token_hash,user_id,expires_at) VALUES(?,?,?)',tokenHash(token),user.id,new Date(Date.now()+2592000000).toISOString());res.setHeader('Set-Cookie',secureCookie(req,token));return user;}
function requireUser(req){const u=currentUser(req);if(!u)fail('Sign in or enable demo mode to use this feature.',401);return u;}
function requireAdmin(req){const user=requireUser(req);if(user.role!=='ADMIN')fail('Forbidden: administrator role required',403);if((process.env.SA_REQUIRE_ADMIN_VERIFIED_EMAIL==='1'||process.env.NODE_ENV==='production')&&!one('SELECT 1 FROM email_verifications WHERE user_id=?',user.id))fail('Verified administrator email is required.',403);if((process.env.SA_REQUIRE_ADMIN_MFA==='1'||process.env.NODE_ENV==='production')&&!one('SELECT 1 FROM user_mfa WHERE user_id=? AND enabled=1',user.id))fail('Administrator authenticator MFA is required.',403);return user;}
function adminAudit(user,type,id,action){run('INSERT INTO moderation_audit(actor_id,object_type,object_id,action,created_at) VALUES(?,?,?,?,?)',user.id,type,String(id),action,now());}
function nval(value,def=1,min=1,max=100){const n=Number(value);return Number.isFinite(n)?Math.min(max,Math.max(min,Math.floor(n))):def;}
function cleanText(value,max=140){return String(value||'').trim().slice(0,max)}
function videoList(query){
 const where=["v.status='PUBLISHED'", "NOT EXISTS (SELECT 1 FROM content_holds h WHERE h.video_id=v.id AND h.closed_at IS NULL)"];const args=[];
 const filt={category:['EXISTS(SELECT 1 FROM video_categories vc JOIN categories c ON c.id=vc.category_id WHERE vc.video_id=v.id AND c.slug=?)'],performer:['EXISTS(SELECT 1 FROM video_performers vp JOIN performers p ON p.id=vp.performer_id WHERE vp.video_id=v.id AND p.slug=?)'],site:['s.slug=?'],network:['n.slug=?'],channel:['ch.slug=?']};
 for(const [k,[clause]] of Object.entries(filt))if(query.get(k)){where.push(clause);args.push(query.get(k));}
 if(query.get('tag')){if(!/^[a-z0-9-]{1,60}$/.test(query.get('tag')))fail('Invalid tag');where.push('EXISTS(SELECT 1 FROM video_tag_links l JOIN catalog_tags t ON t.id=l.tag_id WHERE l.video_id=v.id AND t.slug=?)');args.push(query.get('tag'));}
 if(query.get('q')){const term='%'+query.get('q').slice(0,80)+'%';where.push(`(v.title LIKE ? OR ch.name LIKE ? OR s.name LIKE ? OR EXISTS(SELECT 1 FROM video_categories vc JOIN categories c ON vc.category_id=c.id WHERE vc.video_id=v.id AND c.name LIKE ?) OR EXISTS(SELECT 1 FROM video_performers vp JOIN performers p ON vp.performer_id=p.id WHERE vp.video_id=v.id AND p.name LIKE ?))`);args.push(term,term,term,term,term)}
 // Validate optional search facets before using them in SQL. All values remain parameterized.
 const minDuration=query.get('minDuration'),maxDuration=query.get('maxDuration');
 for(const [value,operator] of [[minDuration,'>='],[maxDuration,'<=']])if(value!==null){
  if(!/^\d{1,5}$/.test(value)||Number(value)>86400)fail('Invalid duration filter');
  where.push(`v.duration ${operator} ?`);args.push(Number(value));
 }
 if(minDuration!==null&&maxDuration!==null&&Number(minDuration)>Number(maxDuration))fail('Minimum duration exceeds maximum duration');
 for(const [name,op] of [['publishedAfter','>='],['publishedBefore','<=']]){
  const value=query.get(name);if(value!==null){if(!/^\d{4}-\d{2}-\d{2}$/.test(value)||!Number.isFinite(Date.parse(value))||new Date(value).toISOString().slice(0,10)!==value)fail('Invalid publication date');
   where.push(`substr(v.published_at,1,10) ${op} ?`);args.push(value)}
 }
 if(query.get('publishedAfter')&&query.get('publishedBefore')&&query.get('publishedAfter')>query.get('publishedBefore'))fail('Publication date range is inverted');
 if(query.get('quality')){const quality=query.get('quality');if(!['HD','4K','1080p'].includes(quality))fail('Invalid quality filter');where.push('v.quality=?');args.push(quality)}
 const filters=where.join(' AND ');
 const order={'latest':'v.published_at DESC','most-viewed':'v.views DESC','top-rated':'(1.0 * v.likes / (v.likes+v.dislikes+1)) DESC, v.likes DESC','oldest':'v.published_at ASC','duration':'v.duration DESC'}[query.get('sort')]||'v.published_at DESC';
 const page=nval(query.get('page'),1,1,10000),limit=nval(query.get('limit'),16,1,72);
 const total=one(`SELECT count(*) AS total ${VIDEO_FROM} WHERE ${filters}`,...args).total;
 const items=all(`${SQL_VIDEOS} WHERE ${filters} ORDER BY ${order},v.id DESC LIMIT ? OFFSET ?`,...args,limit,(page-1)*limit).map(simpleVideo);
 return {items,total,page,limit,pages:Math.ceil(total/limit)};
}
function directory(which,query){
 const map={
  categories:{sql:`SELECT c.id,c.name,c.slug,COUNT(visible_v.id) AS videoCount FROM categories c LEFT JOIN video_categories vc ON vc.category_id=c.id LEFT JOIN videos visible_v ON visible_v.id=vc.video_id AND visible_v.status='PUBLISHED' AND NOT EXISTS(SELECT 1 FROM content_holds h WHERE h.video_id=visible_v.id AND h.closed_at IS NULL) GROUP BY c.id`,order:'c.name COLLATE NOCASE ASC'},
  performers:{sql:`SELECT p.id,p.name,p.slug,p.country,COUNT(v.id) AS videoCount,COALESCE(SUM(v.views),0) AS totalViews FROM performers p LEFT JOIN video_performers vp ON vp.performer_id=p.id LEFT JOIN videos v ON v.id=vp.video_id AND v.status='PUBLISHED' AND NOT EXISTS(SELECT 1 FROM content_holds h WHERE h.video_id=v.id AND h.closed_at IS NULL) GROUP BY p.id`,order:'totalViews DESC,p.name ASC'},
  networks:{sql:`SELECT n.id,n.name,n.slug,n.description,COUNT(DISTINCT v.id) AS videoCount,COUNT(DISTINCT s.id) AS siteCount FROM networks n LEFT JOIN sites s ON s.network_id=n.id LEFT JOIN videos v ON v.site_id=s.id AND v.status='PUBLISHED' AND NOT EXISTS(SELECT 1 FROM content_holds h WHERE h.video_id=v.id AND h.closed_at IS NULL) GROUP BY n.id`,order:'videoCount DESC,n.name ASC'},
  sites:{sql:`SELECT s.id,s.name,s.slug,s.last_updated AS lastUpdated,n.name AS networkName,n.slug AS networkSlug,COUNT(v.id) AS videoCount,COALESCE(AVG(1.0*v.likes/(v.likes+v.dislikes+1)),0) AS avgRating FROM sites s LEFT JOIN networks n ON n.id=s.network_id LEFT JOIN videos v ON v.site_id=s.id AND v.status='PUBLISHED' AND NOT EXISTS(SELECT 1 FROM content_holds h WHERE h.video_id=v.id AND h.closed_at IS NULL) GROUP BY s.id`,order:'lastUpdated DESC'},
  channels:{sql:`SELECT ch.id,ch.name,ch.slug,s.name AS siteName,COUNT(v.id) AS videoCount FROM channels ch LEFT JOIN sites s ON s.id=ch.site_id LEFT JOIN videos v ON v.channel_id=ch.id AND v.status='PUBLISHED' AND NOT EXISTS(SELECT 1 FROM content_holds h WHERE h.video_id=v.id AND h.closed_at IS NULL) GROUP BY ch.id`,order:'videoCount DESC,ch.name ASC'}
 };
 if(!map[which])fail('Unknown directory',404);
 let sort=map[which].order;
 if(query.get('sort')==='alphabetical')sort='name COLLATE NOCASE ASC';
 if(query.get('sort')==='alphabetical-desc')sort='name COLLATE NOCASE DESC';
 if(query.get('sort')==='many-videos')sort='videoCount DESC';
 if(query.get('sort')==='top-rated'&&which==='sites')sort='avgRating DESC,videoCount DESC';
 if(which==='sites'&&query.get('sort')==='recent')sort='lastUpdated DESC';
 let rows=all(`${map[which].sql} ORDER BY ${sort}`);
 if(query.get('q'))rows=rows.filter(r=>r.name.toLowerCase().includes(query.get('q').toLowerCase()));
 if(which==='performers'&&query.get('country'))rows=rows.filter(r=>r.country===query.get('country'));
 return rows;
}
async function parseBody(req){
 let size=0;const chunks=[];
 for await(const chunk of req){size+=chunk.length;if(size>65536)fail('Request body too large',413);chunks.push(chunk)}
 try{return JSON.parse(Buffer.concat(chunks).toString('utf8')||'{}')}catch{fail('Invalid JSON')}
}
function toUserOutput(user){return user?{id:user.id,email:user.email,name:user.name,role:user.role}:null}
// Authentication request buckets are persisted in SQLite to survive API restarts.
const recentViews=new Map(); // prototype abuse control, persistent distributed limiter required for production

function loginRateLimit(req){rateLimit('auth:'+String(req.socket.remoteAddress||'unknown'),15,60000)}
function listLibrary(user,type){if(!['favorites','watch_later'].includes(type))fail('Unknown list',404);return all(`SELECT ${VIDEO_COLS} ${VIDEO_FROM} JOIN ${type} x ON x.video_id=v.id WHERE x.user_id=? AND v.status='PUBLISHED' AND ${NO_HOLD} ORDER BY x.created_at DESC`,user.id).map(simpleVideo)}
function getPageRouteVideo(slug){return simpleVideo(one(`${SQL_VIDEOS} WHERE v.slug=? AND v.status='PUBLISHED' AND NOT EXISTS(SELECT 1 FROM content_holds h WHERE h.video_id=v.id AND h.closed_at IS NULL)`,slug));}
function findRelated(video,limit=12,offset=0){const rows=all(`${SQL_VIDEOS} WHERE v.id<>? AND v.status='PUBLISHED' AND NOT EXISTS(SELECT 1 FROM content_holds h WHERE h.video_id=v.id AND h.closed_at IS NULL) ORDER BY (CASE WHEN v.site_id=? THEN 3 ELSE 0 END)+(CASE WHEN v.channel_id=? THEN 2 ELSE 0 END)+ (CASE WHEN EXISTS(SELECT 1 FROM video_categories c1 JOIN video_categories c2 ON c1.category_id=c2.category_id WHERE c1.video_id=? AND c2.video_id=v.id) THEN 2 ELSE 0 END) DESC,v.views DESC LIMIT ? OFFSET ?`,video.id,video.siteId,video.channelId,video.id,limit,offset);return rows.map(simpleVideo)}
/** Explainable local-prototype recommendations from subscriptions and saved categories.
 * Works for the small catalog; production should use precomputed candidates.
 */
function personalizedFeed(user,limit=12){
 const subscribed=new Set(all('SELECT channel_id AS id FROM subscriptions WHERE user_id=?',user.id).map(x=>x.id));
 const preferred=new Set(all('SELECT DISTINCT vc.category_id AS id FROM video_categories vc JOIN favorites f ON f.video_id=vc.video_id WHERE f.user_id=?',user.id).map(x=>x.id));
 for(const p of all('SELECT category_id AS id FROM user_category_preferences WHERE user_id=?',user.id))preferred.add(p.id);
 const alreadyFavorite=new Set(all('SELECT video_id AS id FROM favorites WHERE user_id=?',user.id).map(x=>x.id));
 const categories=all('SELECT video_id AS videoId,category_id AS categoryId FROM video_categories');
 const byVideo=new Map();for(const c of categories){if(!byVideo.has(c.videoId))byVideo.set(c.videoId,[]);byVideo.get(c.videoId).push(c.categoryId)}
 const rows=all(`${SQL_VIDEOS} WHERE v.status='PUBLISHED' AND NOT EXISTS(SELECT 1 FROM content_holds h WHERE h.video_id=v.id AND h.closed_at IS NULL)`).map(v=>{
  const matches=(byVideo.get(v.id)||[]).filter(id=>preferred.has(id)).length;
  const following=subscribed.has(v.channelId);
  const popularity=Math.log10(Math.max(1,v.views)+1);
  const score=(following?12:0)+matches*4+popularity-(alreadyFavorite.has(v.id)?8:0);
  return {...simpleVideo(v),reason:following?'From a channel you follow':matches?'Matches saved categories':'Popular in the catalog',_rank:score};
 });
 rows.sort((a,b)=>b._rank-a._rank||b.views-a.views||b.id-a.id);
 const diversity=new Map(),result=[];
 for(const candidate of rows){const count=diversity.get(candidate.channelId)||0;if(count>=3)continue;
  diversity.set(candidate.channelId,count+1);result.push(candidate);if(result.length===limit)break;}
 return result.map(({_rank,...v})=>v);
}
async function api(req,res,url){
 const p=url.pathname,method=req.method;

 if(method==='GET'&&p==='/api/internal/metrics'){
  if(!process.env.SA_METRICS_TOKEN||process.env.SA_METRICS_TOKEN.length<32)fail('Metrics disabled',503);
  if(!authorizeMetrics(req.headers.authorization,process.env.SA_METRICS_TOKEN))fail('Not authorized',401);
  res.writeHead(200,{'Content-Type':'text/plain; version=0.0.4; charset=utf-8','Cache-Control':'no-store'});res.end(metricsText());return;
 }
 if(method==='GET'&&p==='/api/health')return send(res,{ok:true,product:'StreamAtlas',checkpoint:CHECKPOINT,db:'sqlite',mediaWorker:process.env.MEDIA_WORKER_MODE||'separate'});
 if(method==='GET'&&p==='/api/ready'){const s=operationsSnapshot();const ok=workerHealth(s,{requireWorker:process.env.SA_REQUIRE_WORKER_HEALTH==='1'});return send(res,{ready:ok,version:VERSION,databaseOk:s.databaseOk,storageOk:s.privateStorageWritable},ok?200:503)};
 if(method==='GET'&&p==='/api/security/csrf')return send(res,{token:makeCsrf(req,res)});
 // Private proof-of-concept receipt enforcement. Not a public launch toggle.
 const privateReceiptRequired=process.env.SA_PRIVATE_PREVIEW_REQUIRE_RECEIPT==='1';
 const catalogMediaRoute=/^\/api\/(home(?:\/|$)|public\/playlists(?:\/|$)|videos(?:\/|$)|search(?:\/|$)|categories(?:\/|$)|performers(?:\/|$)|sites(?:\/|$)|networks(?:\/|$)|channels(?:\/|$)|media\/|player\/qoe$|catalog\/|localization\/dictionary$)/.test(p);
 if(privateReceiptRequired&&catalogMediaRoute)requirePrivateViewer(currentUser(req));
 if(await playbackQoeApi(req,res,url,{requireUser}))return;
 if(method==='POST'&&p==='/api/me/assurance/start'){
  if(process.env.SA_ENABLE_VENDOR_CHALLENGES!=='1')fail('No age-assurance vendor is connected',503);
  const user=requireUser(req);if(user.role==='DEMO')fail('Demo identities cannot request access verification',403);
  rateLimit('assurance-challenge:'+user.id,5,3600000);
  return send(res,{...issueVerificationChallenge(user.id),notice:'Opaque local transaction token only; no external verification service has been contacted.'},201);
 }
 if(method==='GET'&&p==='/api/me/access-status'){
  const u=requireUser(req);return send(res,assuranceSummary(u.id));
 }
 // Never expose unrestricted CDN signing. The signer is restricted to a private
 // synthetic-media evaluation, a valid external receipt and reviewed assets.
 const privateCdnMatch=p.match(/^\/api\/private-preview\/media\/([a-f0-9-]{36})\/cookies$/);
 if(method==='POST'&&privateCdnMatch){
  if(process.env.SA_PRIVATE_CDN_EVALUATION!=='1')fail('Private media CDN evaluation is disabled',503);
  const viewer=requireUser(req);rateLimit(`cdn-sign:${viewer.id}`,12,60000);authorizePrivateMedia({uploadId:privateCdnMatch[1],user:viewer});
  if(process.env.SA_ENFORCE_TERRITORY==='1'){
   const geo=verifyTrustedGeo({headers:req.headers,path:p,secret:process.env.SA_TRUSTED_GEO_HMAC_SECRET});
   if(!geo.trusted)fail('Trusted geographic assertion required',403);
   let allowed;try{allowed=parseCountryList(process.env.SA_MEDIA_ALLOWED_COUNTRIES||'')}catch{fail('Media territory policy invalid',503)}
   if(!evaluateTerritory({country:geo.country,allowedCountries:allowed}).allowed)fail('Media unavailable in this territory',403);
  }
  if(!process.env.SA_MEDIA_SIGNING_PRIVATE_KEY_FILE||!process.env.SA_MEDIA_ORIGIN||!process.env.SA_MEDIA_KEY_PAIR_ID||!process.env.SA_MEDIA_COOKIE_DOMAIN)fail('Private signing configuration incomplete',503);
  let privateKey;try{
   const keyPath=path.resolve(process.env.SA_MEDIA_SIGNING_PRIVATE_KEY_FILE);
   const keyStat=fs.lstatSync(keyPath);
   if(!keyStat.isFile()||keyStat.isSymbolicLink()||(keyStat.mode&0o077)!==0||keyPath.startsWith(PUBLIC+path.sep))fail('Signing key must be an owner-only private file outside the public web root',503);
   privateKey=fs.readFileSync(keyPath,'utf8');
  }catch(e){if(e.status)throw e;fail('Signing key file unavailable',503)}
  const signed=signedMediaCookies({uploadId:privateCdnMatch[1],mediaOrigin:process.env.SA_MEDIA_ORIGIN,keyPairId:process.env.SA_MEDIA_KEY_PAIR_ID,privateKey,domain:process.env.SA_MEDIA_COOKIE_DOMAIN,ttlSeconds:60});
  res.setHeader('Set-Cookie',signed.cookies);
  return send(res,{ok:true,expiresAt:new Date(signed.expires*1000).toISOString(),manifestUrl:`${new URL(process.env.SA_MEDIA_ORIGIN).origin}/media/${privateCdnMatch[1]}/master.m3u8`});
 }
 if(await catalogTagsApi(req,res,url,{requireAdmin}))return;
 if(await roadmap32Api(req,res,url,{requireUser,requireAdmin}))return;
 if(await discoveryApi(req,res,url,{requireUser,requireAdmin,videoList,directory,adminAudit}))return;
 if(await studioOperationsApi(req,res,url,{requireUser,requireAdmin}))return;
 if(await creatorBatch35Api(req,res,url,{requireUser}))return;
 if(await creatorInsights36Api(req,res,url,{requireUser}))return;
 if(await operationalControlsApi(req,res,url,{requireUser,requireAdmin}))return;
 if(await complianceOperationsApi(req,res,url,{requireAdmin}))return;
 if(await uploadApi(req,res,url,{requireUser,requireAdmin,
  requireMediaViewer:privateReceiptRequired?(request)=>requirePrivateViewer(currentUser(request)):null,
  requireMediaEntitlement:(privateReceiptRequired||process.env.SA_REQUIRE_REVIEWED_LICENSE_EXPIRY==='1')
   ?(uploadId,request)=>authorizePrivateMedia({uploadId,user:currentUser(request),requireAssurance:privateReceiptRequired,requireEvidence:true}):null}))return;

 // C01: deterministic, safe and bounded home-feed modes.
 if(method==='GET'&&p==='/api/home/feed'){
  const mode=String(url.searchParams.get('mode')||'latest');
  if(!['latest','trending','top-rated','subscriptions','for-you'].includes(mode))fail('Unknown feed mode');
  const limit=nval(url.searchParams.get('limit'),20,1,40);let items;
  if(mode==='subscriptions'){
   const u=requireUser(req);items=all(`${SQL_VIDEOS} JOIN subscriptions sub ON sub.channel_id=v.channel_id WHERE sub.user_id=? AND v.status='PUBLISHED' AND ${NO_HOLD} ORDER BY v.published_at DESC,v.id DESC LIMIT ?`,u.id,limit).map(simpleVideo);
  }else if(mode==='for-you'){items=personalizedFeed(requireUser(req),limit)}
  else items=videoList(new URLSearchParams('limit='+limit+'&sort='+(mode==='trending'?'most-viewed':mode))).items;
  return send(res,{mode,items,personalized:mode==='for-you'||mode==='subscriptions'});
 }
 if(method==='GET'&&p==='/api/home')return send(res,{latest:videoList(new URLSearchParams('limit=12&sort=latest')).items,mostViewed:videoList(new URLSearchParams('limit=12&sort=most-viewed')).items,topRated:videoList(new URLSearchParams('limit=8&sort=top-rated')).items,categories:directory('categories',new URLSearchParams()).slice(0,12),performers:directory('performers',new URLSearchParams()).slice(0,8),sites:directory('sites',new URLSearchParams()).slice(0,8),networks:directory('networks',new URLSearchParams())});
 if(method==='GET'&&p==='/api/videos')return send(res,videoList(url.searchParams));
 if(method==='GET'&&p==='/api/search/suggest'){
  const q=cleanText(url.searchParams.get('q'),50);if(q.length<1)return send(res,{categories:[],channels:[],performers:[],sites:[],networks:[],videos:[],alternatives:[]});
  return send(res,catalogSuggestions(q,videoList,directory));
 }
 const entity=p.match(/^\/api\/(categories|performers|sites|networks|channels)$/);
 if(method==='GET'&&entity)return send(res,directory(entity[1],url.searchParams));
 const itemEntity=p.match(/^\/api\/(categories|performers|sites|networks|channels)\/([a-z0-9-]+)$/);
 if(method==='GET'&&itemEntity){const obj=directory(itemEntity[1],new URLSearchParams()).find(x=>x.slug===itemEntity[2]);if(!obj)fail('Not found',404);return send(res,obj)}
 const relatedMatch=p.match(/^\/api\/videos\/([a-z0-9-]+)\/related$/);
 if(method==='GET'&&relatedMatch){const v=getPageRouteVideo(relatedMatch[1]);if(!v)fail('Video not found',404);const page=nval(url.searchParams.get('page'),1,1,1000),limit=nval(url.searchParams.get('limit'),12,1,48),total=one(`SELECT COUNT(*) AS n FROM videos v WHERE v.id<>? AND v.status='PUBLISHED' AND ${NO_HOLD}`,v.id).n;return send(res,{items:findRelated(v,limit,(page-1)*limit),page,limit,total,pages:Math.ceil(total/limit)})}
 const videoMatch=p.match(/^\/api\/videos\/([a-z0-9-]+)$/);
 if(method==='GET'&&videoMatch){const video=getPageRouteVideo(videoMatch[1]);if(!video)fail('Video not found',404);const user=currentUser(req);const flags=user?{favorite:!!one('SELECT 1 FROM favorites WHERE user_id=? AND video_id=?',user.id,video.id),watchLater:!!one('SELECT 1 FROM watch_later WHERE user_id=? AND video_id=?',user.id,video.id),reaction:one('SELECT type FROM reactions WHERE user_id=? AND video_id=?',user.id,video.id)?.type||null,progress:one('SELECT position FROM watch_progress WHERE user_id=? AND video_id=?',user.id,video.id)?.position||0,subscribed:!!one('SELECT 1 FROM subscriptions WHERE user_id=? AND channel_id=?',user.id,video.channelId)}:{};const comments=all('SELECT c.id,c.body,c.created_at AS createdAt,u.name,c.user_id AS userId,c.parent_id AS parentId,c.pinned AS pinned FROM comments c JOIN users u ON u.id=c.user_id WHERE c.video_id=? AND c.hidden=0 AND (c.parent_id IS NULL OR EXISTS(SELECT 1 FROM comments parent WHERE parent.id=c.parent_id AND parent.hidden=0)) ORDER BY c.pinned DESC,c.created_at DESC LIMIT 60',video.id);const qualityOptions=[{label:'Standard',url:video.mediaUrl}];const uploaded=one("SELECT id FROM upload_sessions WHERE video_id=? AND status='PUBLISHED'",video.id);
 const demo=demoPlayerAssets(video.mediaUrl);
 const extraQualities=uploaded?readQualityOptions(path.join(process.env.PRIVATE_PATH||path.join(ROOT,'data','private'),'processed',uploaded.id),uploaded.id):[];
 const uploadedCaptions=uploaded&&one('SELECT 1 FROM video_captions WHERE video_id=?',video.id)?`/api/media/${uploaded.id}/captions.vtt`:null;
 return send(res,{...video,related:findRelated(video),flags,comments,chapters:all('SELECT start_seconds AS start,title FROM video_chapters WHERE video_id=? ORDER BY start_seconds',video.id),qualityOptions:demo?.qualityOptions||(uploaded?(extraQualities.length?extraQualities:[{label:'High quality',url:video.mediaUrl},{label:'Data saver (320p)',url:`/api/media/${uploaded.id}/low.mp4`} ]):qualityOptions),hlsUrl:uploaded?`/api/media/${uploaded.id}/master.m3u8`:demo?.hlsUrl||null,captionsUrl:uploadedCaptions||demo?.captionsUrl||null,captionTracks:uploadedCaptions?[{label:'English',srclang:'en',url:uploadedCaptions}]:demo?.captionTracks||[],previewFrames:demo?.previewFrames||(uploaded?Array.from({length:4},(_,i)=>({time:Math.floor(i*video.duration/4),url:`/api/media/${uploaded.id}/preview_${i}.jpg`})) :[]),trueMediaDuration:demo?.trueMediaDuration||null});}
 // Machine-to-machine signed vendor receipt; disabled unless a real secret is configured.
 if(method==='POST'&&p==='/api/integrations/age-verification/callback'){
  if(!process.env.SA_VERIFICATION_WEBHOOK_SECRET||process.env.SA_VERIFICATION_WEBHOOK_SECRET.length<32)fail('Integration not configured',503);
  const chunks=[];let count=0;
  for await(const chunk of req){count+=chunk.length;if(count>8192)fail('Webhook too large',413);chunks.push(chunk)}
  const event=verifySignedWebhook({body:Buffer.concat(chunks),headers:req.headers,secret:process.env.SA_VERIFICATION_WEBHOOK_SECRET});
  return send(res,applyVerificationEvent(event),202);
 }
 if(method==='GET'&&p==='/api/auth/me')return send(res,{user:toUserOutput(currentUser(req))});
 if(method==='POST'&&p==='/api/auth/demo'){rateLimit('demo:'+String(req.socket.remoteAddress||'unknown'),30,3600_000);const id=run('INSERT INTO users(email,password_hash,name,role,created_at) VALUES(?,?,?,?,?)',`demo-${crypto.randomUUID()}@local.demo`,null,'Demo Viewer','DEMO',now()).lastInsertRowid;const user=one('SELECT id,email,name,role FROM users WHERE id=?',Number(id));createSession(req,res,user);return send(res,{user:toUserOutput(user)},201)}
 if(method==='POST'&&p==='/api/auth/register'){loginRateLimit(req);const b=await parseBody(req);const email=cleanText(b.email,150).toLowerCase(),pass=String(b.password||''),name=cleanText(b.name,70);if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)||pass.length<10||!name)fail('Enter a valid name/email and a password of at least 10 characters');if(one('SELECT 1 FROM users WHERE email=?',email))fail('Email already registered',409);const id=run('INSERT INTO users(email,password_hash,name,created_at) VALUES(?,?,?,?)',email,hashPassword(pass),name,now()).lastInsertRowid;const user=one('SELECT id,email,name,role FROM users WHERE id=?',Number(id));createSession(req,res,user);return send(res,{user:toUserOutput(user),emailVerified:false},201)}
 if(method==='POST'&&p==='/api/auth/login'){loginRateLimit(req);const b=await parseBody(req);const user=one('SELECT * FROM users WHERE email=?',cleanText(b.email,150).toLowerCase());if(!user||one('SELECT 1 FROM closed_accounts WHERE user_id=?',user.id)||!verifyPassword(String(b.password||''),user.password_hash))fail('Invalid credentials',401);
  const mfa=one('SELECT secret_encrypted,enabled FROM user_mfa WHERE user_id=?',user.id);
  if(mfa?.enabled)verifyAndConsumeMfa(user.id,mfa.secret_encrypted,b.mfaCode);
  createSession(req,res,user);return send(res,{user:toUserOutput(user),mfaRequired:!!mfa?.enabled})}
 if(method==='POST'&&p==='/api/auth/logout'){const token=parseCookies(req).sa_session;if(token)run('DELETE FROM sessions WHERE token_hash=?',tokenHash(token));res.setHeader('Set-Cookie',secureCookie(req,'',0));return send(res,{ok:true})}

 // Development email outbox writes private files only when explicitly enabled;
 // production without a real sender returns 503 instead of pretending delivery.
 if(method==='POST'&&p==='/api/auth/password-reset/request'){
  rateLimit('reset:'+String(req.socket.remoteAddress||'unknown'),6,3600000);
  const b=await parseBody(req),email=cleanText(b.email,150).toLowerCase();
  if(!developmentMailerEnabled())fail('A verified email provider is required for password recovery.',503);
  const u=one('SELECT id,email,password_hash FROM users WHERE email=?',email);
  if(u&&!one('SELECT 1 FROM closed_accounts WHERE user_id=?',u.id)&&u.password_hash!==null){
   const token=issueAccountToken(u.id,'PASSWORD_RESET');deliverDevelopmentMail(u.email,'PASSWORD_RESET',token);
   if(process.env.NODE_ENV==='test')return send(res,{ok:true,developmentToken:token});
  }
  return send(res,{ok:true,message:'If the address is eligible, a reset request has been generated.'});
 }
 if(method==='POST'&&p==='/api/auth/password-reset/confirm'){
  rateLimit('reset-use:'+String(req.socket.remoteAddress||'unknown'),12,3600000);
  const b=await parseBody(req),password=String(b.password||'');
  if(password.length<12||password.length>128)fail('Password must be 12–128 characters');
  const uid=consumeAccountToken(b.token,'PASSWORD_RESET');
  db.exec('BEGIN');try{
   run('UPDATE users SET password_hash=? WHERE id=?',hashPassword(password),uid);
   run('DELETE FROM sessions WHERE user_id=?',uid);
   run('INSERT INTO auth_security_events(user_id,kind,created_at) VALUES(?,?,?)',uid,'PASSWORD_RESET',now());
   db.exec('COMMIT');
  }catch(e){db.exec('ROLLBACK');throw e}
  return send(res,{ok:true,sessionsRevoked:true});
 }
 if(method==='GET'&&p==='/api/me/security'){
  const u=requireUser(req),mfa=one('SELECT enabled FROM user_mfa WHERE user_id=?',u.id);
  return send(res,{emailVerified:!!one('SELECT 1 FROM email_verifications WHERE user_id=?',u.id),mfaEnabled:!!mfa?.enabled,developmentMailer:developmentMailerEnabled()});
 }
 if(method==='POST'&&p==='/api/me/email/request-verification'){
  const u=requireUser(req);rateLimit('verify-email:'+u.id,5,3600000);
  if(one('SELECT 1 FROM email_verifications WHERE user_id=?',u.id))return send(res,{ok:true,alreadyVerified:true});
  if(!developmentMailerEnabled())fail('A verified email provider is required for verification.',503);
  const token=issueAccountToken(u.id,'EMAIL_VERIFY',24*3600000);
  deliverDevelopmentMail(u.email,'EMAIL_VERIFY',token);
  return send(res,{ok:true,...(process.env.NODE_ENV==='test'?{developmentToken:token}:{})});
 }
 if(method==='POST'&&p==='/api/me/email/confirm-verification'){
  const u=requireUser(req),b=await parseBody(req);const userId=consumeAccountToken(b.token,'EMAIL_VERIFY',u.id);
  if(userId!==u.id)fail('Token does not belong to the current account.',403);
  run('INSERT INTO email_verifications(user_id,verified_at) VALUES(?,?) ON CONFLICT(user_id) DO UPDATE SET verified_at=excluded.verified_at',u.id,now());
  return send(res,{ok:true,emailVerified:true});
 }
 if(method==='POST'&&p==='/api/me/mfa/enroll'){
  const u=requireUser(req),b=await parseBody(req),pw=one('SELECT password_hash FROM users WHERE id=?',u.id)?.password_hash;
  if(!pw||!verifyPassword(String(b.password||''),pw))fail('Current password required to enroll MFA',403);
  if(one('SELECT enabled FROM user_mfa WHERE user_id=?',u.id)?.enabled)fail('MFA already enabled',409);
  const secret=newTotpSecret();
  run('INSERT INTO user_mfa(user_id,secret_encrypted,enabled,last_totp_step,created_at) VALUES(?,?,0,-1,?) ON CONFLICT(user_id) DO UPDATE SET secret_encrypted=excluded.secret_encrypted,enabled=0,last_totp_step=-1,created_at=excluded.created_at',u.id,encryptSecret(secret),now());
  const uri=`otpauth://totp/StreamAtlas:${encodeURIComponent(u.email)}?secret=${secret}&issuer=StreamAtlas&algorithm=SHA1&digits=6&period=30`;
  return send(res,{secret,uri,warning:'Store this secret in an authenticator. It cannot be retrieved later.'});
 }
 if(method==='POST'&&p==='/api/me/mfa/confirm'){
  const u=requireUser(req),b=await parseBody(req),row=one('SELECT secret_encrypted,enabled FROM user_mfa WHERE user_id=?',u.id);
  if(!row||row.enabled)fail('No pending MFA enrollment',409);
  verifyAndConsumeMfa(u.id,row.secret_encrypted,b.code);
  run('UPDATE user_mfa SET enabled=1 WHERE user_id=?',u.id);
  run('DELETE FROM sessions WHERE user_id=? AND token_hash<>?',u.id,tokenHash(parseCookies(req).sa_session||''));
  run('INSERT INTO auth_security_events(user_id,kind,created_at) VALUES(?,?,?)',u.id,'MFA_ENABLED',now());
  return send(res,{ok:true,mfaEnabled:true});
 }
 if(method==='POST'&&p==='/api/me/mfa/disable'){
  const u=requireUser(req),b=await parseBody(req),pw=one('SELECT password_hash FROM users WHERE id=?',u.id)?.password_hash;
  if(!verifyPassword(String(b.password||''),pw))fail('Current password required',403);
  const mfa=one('SELECT secret_encrypted,enabled FROM user_mfa WHERE user_id=?',u.id);
  if(!mfa?.enabled)fail('MFA not enabled',409);
  verifyAndConsumeMfa(u.id,mfa.secret_encrypted,b.code);
  run('DELETE FROM user_mfa WHERE user_id=?',u.id);
  run('INSERT INTO auth_security_events(user_id,kind,created_at) VALUES(?,?,?)',u.id,'MFA_DISABLED',now());
  return send(res,{ok:true,mfaEnabled:false});
 }
 if(method==='POST'&&p==='/api/me/close-account'){
  const u=requireUser(req),b=await parseBody(req),record=one('SELECT password_hash,role FROM users WHERE id=?',u.id);
  if(record.role==='ADMIN'||record.role==='DEMO')fail('This account type cannot be closed here.',403);
  if(!verifyPassword(String(b.password||''),record.password_hash))fail('Current password required',403);
  const mfa=one('SELECT secret_encrypted,enabled FROM user_mfa WHERE user_id=?',u.id);
  if(mfa?.enabled)verifyAndConsumeMfa(u.id,mfa.secret_encrypted,b.mfaCode);
  if(one('SELECT 1 FROM upload_sessions WHERE user_id=? LIMIT 1',u.id)||one('SELECT 1 FROM creator_profiles WHERE user_id=? LIMIT 1',u.id))fail('Creator profiles and media require a reviewed closure workflow.',409);
  db.exec('BEGIN');try{
    for(const reaction of all('SELECT video_id AS videoId,type FROM reactions WHERE user_id=?',u.id)){
      const column=reaction.type==='LIKE'?'likes':'dislikes';
      run(`UPDATE videos SET ${column}=MAX(0,${column}-1) WHERE id=?`,reaction.videoId);
    }
    run('DELETE FROM comment_reports WHERE reporter_id=?',u.id);
    run('DELETE FROM creator_collaborators WHERE collaborator_id=?',u.id);
    for(const table of ['search_history','saved_search_filters','entity_follows','watch_queue','favorites','watch_later','watch_progress','reactions','subscriptions','notifications','user_preferences','user_category_preferences','account_tokens','email_verifications','user_mfa'])run(`DELETE FROM ${table} WHERE user_id=?`,u.id);
    run('DELETE FROM playlist_videos WHERE playlist_id IN (SELECT id FROM playlists WHERE user_id=?)',u.id);
    run('DELETE FROM playlists WHERE user_id=?',u.id);
    run('DELETE FROM sessions WHERE user_id=?',u.id);
    run('UPDATE comments SET body=? WHERE user_id=?','[deleted by author]',u.id);
    run('UPDATE users SET email=?,name=?,password_hash=NULL WHERE id=?',`closed-${u.id}@deleted.invalid`,'Closed account',u.id);
    run('INSERT INTO closed_accounts(user_id,closed_at) VALUES(?,?)',u.id,now());
    db.exec('COMMIT');
  }catch(e){db.exec('ROLLBACK');throw e}
  res.setHeader('Set-Cookie',secureCookie(req,'',0));return send(res,{ok:true,accountClosed:true,notice:'Reports and moderation audit references may remain under retention obligations.'});
 }
 if(method==='GET'&&p==='/api/me/sessions'){
  const u=requireUser(req),current=tokenHash(parseCookies(req).sa_session||'');
  return send(res,{items:all('SELECT token_hash,expires_at FROM sessions WHERE user_id=? AND expires_at>? ORDER BY expires_at DESC',u.id,now()).map(s=>({id:s.token_hash.slice(0,16),current:s.token_hash===current,expiresAt:s.expires_at}))});
 }
 if(method==='POST'&&p==='/api/me/sessions/revoke-others'){
  const u=requireUser(req),current=tokenHash(parseCookies(req).sa_session||'');
  const r=run('DELETE FROM sessions WHERE user_id=? AND token_hash<>?',u.id,current);
  return send(res,{ok:true,removed:r.changes});
 }
 if(method==='POST'&&p==='/api/me/sessions/revoke'){
  const u=requireUser(req),b=await parseBody(req);if(!/^[a-f0-9]{16}$/.test(String(b.id)))fail('Invalid session reference');
  const current=tokenHash(parseCookies(req).sa_session||'');
  const matches=all('SELECT token_hash FROM sessions WHERE user_id=? AND substr(token_hash,1,16)=?',u.id,b.id);
  if(matches.length!==1)fail('Session unavailable',404);if(matches[0].token_hash===current)fail('Sign out to end your current session.',409);
  const r=run('DELETE FROM sessions WHERE user_id=? AND token_hash=?',u.id,matches[0].token_hash);return send(res,{ok:true,removed:r.changes});
 }
 if(method==='PATCH'&&p==='/api/me/password'){
  const u=requireUser(req);rateLimit(`password:${u.id}`,5,3600000);
  const b=await parseBody(req),current=String(b.currentPassword||''),replacement=String(b.newPassword||'');
  const record=one('SELECT password_hash FROM users WHERE id=?',u.id);
  if(!record.password_hash)fail('Demo-only accounts cannot change passwords.',403);
  if(!verifyPassword(current,record.password_hash))fail('Current password is incorrect',403);const mfa=one('SELECT secret_encrypted,enabled FROM user_mfa WHERE user_id=?',u.id);if(mfa?.enabled)verifyAndConsumeMfa(u.id,mfa.secret_encrypted,b.mfaCode);
  if(replacement.length<12||replacement.length>128||replacement===current)fail('Choose a different password of 12–128 characters.');
  db.exec('BEGIN');try{
   run('UPDATE users SET password_hash=? WHERE id=?',hashPassword(replacement),u.id);
   run('DELETE FROM sessions WHERE user_id=? AND token_hash<>?',u.id,tokenHash(parseCookies(req).sa_session||''));
   db.exec('COMMIT');
  }catch(e){db.exec('ROLLBACK');throw e}
  return send(res,{ok:true,otherSessionsRevoked:true});
 }
 // Persistent user-owned Watch Queue; hidden media never appears in its API response.
 if(method==='GET'&&p==='/api/me/queue/navigation'){
  const u=requireUser(req),videoId=Number(url.searchParams.get('videoId'));
  if(!Number.isSafeInteger(videoId)||videoId<1)fail('Valid videoId required');
  const ids=all(`SELECT q.video_id AS id FROM watch_queue q JOIN videos v ON v.id=q.video_id WHERE q.user_id=? AND v.status='PUBLISHED' AND ${NO_HOLD} ORDER BY q.position`,u.id).map(x=>x.id);
  const idx=ids.indexOf(videoId);if(idx<0)return send(res,{previous:null,next:null,inQueue:false});
  const prev=idx>0?one('SELECT slug FROM videos WHERE id=?',ids[idx-1]):null,next=idx<ids.length-1?one('SELECT slug FROM videos WHERE id=?',ids[idx+1]):null;
  return send(res,{inQueue:true,previous:prev?.slug||null,next:next?.slug||null});
 }
 if(method==='GET'&&p==='/api/me/queue'){
  const u=requireUser(req);return send(res,{items:all(`${SQL_VIDEOS} JOIN watch_queue q ON q.video_id=v.id WHERE q.user_id=? AND v.status='PUBLISHED' AND ${NO_HOLD} ORDER BY q.position ASC,q.added_at ASC`,u.id).map(simpleVideo)});
 }
 if(method==='POST'&&p==='/api/me/queue'){
  const u=requireUser(req),b=await parseBody(req),id=Number(b.videoId);
  if(!Number.isSafeInteger(id)||id<1||!availableVideo(id))fail('Video unavailable',404);
  const count=one('SELECT count(*) AS n FROM watch_queue WHERE user_id=?',u.id).n;
  const exists=one('SELECT 1 FROM watch_queue WHERE user_id=? AND video_id=?',u.id,id);
  if(!exists&&count>=100)fail('Queue limit of 100 videos reached',409);
  const result=run('INSERT OR IGNORE INTO watch_queue(user_id,video_id,position,added_at) VALUES(?,?,(SELECT COALESCE(MAX(position),0)+1 FROM watch_queue WHERE user_id=?),?)',u.id,id,u.id,now());
  return send(res,{ok:true,added:!!result.changes},result.changes?201:200);
 }
 if(method==='PATCH'&&p==='/api/me/queue/order'){
  const u=requireUser(req),b=await parseBody(req),ids=b.videoIds;
  if(!Array.isArray(ids)||ids.length>100||ids.some(x=>!Number.isSafeInteger(x)||x<1)||new Set(ids).size!==ids.length)fail('Invalid queue order');
  const existing=all(`SELECT q.video_id AS id FROM watch_queue q JOIN videos v ON v.id=q.video_id WHERE q.user_id=? AND v.status='PUBLISHED' AND ${NO_HOLD}`,u.id).map(x=>x.id);
  if(ids.length!==existing.length||ids.some(id=>!existing.includes(id)))fail('Queue order does not match your available queue',409);
  db.exec('BEGIN');try{ids.forEach((id,i)=>run('UPDATE watch_queue SET position=? WHERE user_id=? AND video_id=?',i+1,u.id,id));db.exec('COMMIT')}catch(e){db.exec('ROLLBACK');throw e}
  return send(res,{ok:true,count:ids.length});
 }
 if(method==='DELETE'&&p==='/api/me/queue'){
  const u=requireUser(req);const x=run('DELETE FROM watch_queue WHERE user_id=?',u.id);return send(res,{ok:true,removed:x.changes});
 }
 const queueItem=p.match(/^\/api\/me\/queue\/(\d+)$/);
 if(method==='DELETE'&&queueItem){const u=requireUser(req);const x=run('DELETE FROM watch_queue WHERE user_id=? AND video_id=?',u.id,Number(queueItem[1]));return send(res,{ok:true,removed:x.changes});}
 if(method==='GET'&&p==='/api/me/continue-watching'){
  const u=requireUser(req);const limit=nval(url.searchParams.get('limit'),24,1,72);
  return send(res,{items:all(`${SQL_VIDEOS} JOIN watch_progress w ON w.video_id=v.id WHERE w.user_id=? AND v.status='PUBLISHED' AND ${NO_HOLD} AND w.position>0 AND w.position < v.duration-5 ORDER BY w.watched_at DESC LIMIT ?`,u.id,limit).map(simpleVideo)});
 }
 if(method==='GET'&&p==='/api/me/recommendations'){
  const u=requireUser(req);return send(res,{items:personalizedFeed(u,nval(url.searchParams.get('limit'),12,1,24)),model:'local-explainable-v1'});
 }
 if(p==='/api/me/category-preferences'){
  const user=requireUser(req);
  if(method==='GET')return send(res,{categoryIds:all('SELECT category_id AS id FROM user_category_preferences WHERE user_id=? ORDER BY category_id',user.id).map(x=>x.id),optional:true,explanation:'Used only for local demo category ranking; no external profile sharing.'});
  if(method==='PUT'){
   const payload=await parseBody(req),ids=payload.categoryIds;
   if(!Array.isArray(ids)||ids.length>8||ids.some(x=>!Number.isSafeInteger(x)||x<1)||new Set(ids).size!==ids.length)fail('Choose up to eight distinct category IDs.');
   if(ids.some(id=>!one('SELECT id FROM categories WHERE id=?',id)))fail('Unrecognized category.');
   db.exec('BEGIN IMMEDIATE');try{
    run('DELETE FROM user_category_preferences WHERE user_id=?',user.id);
    for(const id of ids)run('INSERT INTO user_category_preferences(user_id,category_id,created_at) VALUES(?,?,?)',user.id,id,now());
    db.exec('COMMIT');
   }catch(e){db.exec('ROLLBACK');throw e}
   return send(res,{ok:true,categoryIds:ids,optional:true});
  }
  fail('Method not allowed',405);
 }
 if(method==='GET'&&p==='/api/me/preferences'){
  const u=requireUser(req),pref=one('SELECT * FROM user_preferences WHERE user_id=?',u.id);
  return send(res,{pauseHistory:!!pref?.pause_history,autoplayNext:!!pref?.autoplay_next,...(url.searchParams.get('expanded')==='1'?{theme:pref?.theme||'dark',locale:pref?.locale||'English',saveSearches:!!pref?.save_searches}:{})});
 }
 if(method==='PATCH'&&p==='/api/me/preferences'){
  const u=requireUser(req),b=await parseBody(req);
  if(typeof b.pauseHistory!=='boolean'||typeof b.autoplayNext!=='boolean')fail('Provide both privacy preferences as booleans.');
  const previous=one('SELECT * FROM user_preferences WHERE user_id=?',u.id)||{};
  const theme=b.theme??previous.theme??'dark',locale=b.locale??previous.locale??'English',saveSearches=b.saveSearches??!!previous.save_searches;
  if(!['dark','light'].includes(theme)||!['English','Hindi','Spanish','French','German'].includes(locale)||typeof saveSearches!=='boolean')fail('Invalid account preferences');
  run('INSERT INTO user_preferences(user_id,pause_history,autoplay_next,theme,locale,save_searches,updated_at) VALUES(?,?,?,?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET pause_history=excluded.pause_history,autoplay_next=excluded.autoplay_next,theme=excluded.theme,locale=excluded.locale,save_searches=excluded.save_searches,updated_at=excluded.updated_at',u.id,Number(b.pauseHistory),Number(b.autoplayNext),theme,locale,Number(saveSearches),now());
  if(!saveSearches)run('DELETE FROM search_history WHERE user_id=?',u.id);
  return send(res,{ok:true,pauseHistory:b.pauseHistory,autoplayNext:b.autoplayNext,theme,locale,saveSearches});
 }
 if(method==='DELETE'&&p==='/api/me/library'){
  const u=requireUser(req),type=url.searchParams.get('type');
  const table={favorites:'favorites',watchLater:'watch_later'}[type];if(!table)fail('Unknown library collection');
  const result=run(`DELETE FROM ${table} WHERE user_id=?`,u.id);return send(res,{ok:true,removed:result.changes});
 }
 if(method==='GET'&&p==='/api/me/library'){
  const u=requireUser(req),type=url.searchParams.get('type')||'favorites',sort=url.searchParams.get('sort')||'newest',filter=url.searchParams.get('filter')||'all';
  if(!['newest','oldest','most-viewed'].includes(sort)||!['all','watched','unwatched'].includes(filter))fail('Invalid library filter');
  let items=listLibrary(u,type);const watched=new Set(all('SELECT video_id FROM watch_progress WHERE user_id=? AND position>0',u.id).map(x=>x.video_id));
  if(filter!=='all')items=items.filter(v=>watched.has(v.id)===(filter==='watched'));
  if(sort==='oldest')items.reverse();else if(sort==='most-viewed')items.sort((a,b)=>b.views-a.views||b.id-a.id);
  return send(res,{items,sort,filter});
 }
 if(method==='DELETE'&&p==='/api/me/library/items'){
  const u=requireUser(req),b=await parseBody(req),table={favorites:'favorites',watchLater:'watch_later'}[b.type],ids=b.videoIds;
  if(!table||!Array.isArray(ids)||ids.length<1||ids.length>50||ids.some(id=>!Number.isSafeInteger(id)||id<1)||new Set(ids).size!==ids.length)fail('Invalid bulk library request');
  const removed=run(`DELETE FROM ${table} WHERE user_id=? AND video_id IN (${ids.map(()=>'?').join(',')})`,u.id,...ids).changes;
  return send(res,{ok:true,removed});
 }
 if(method==='POST'&&p==='/api/me/library/toggle'){const user=requireUser(req),b=await parseBody(req);const table=b.type==='watchLater'?'watch_later':b.type==='favorite'?'favorites':null;if(!table)fail('Invalid list');const v=availableVideo(b.videoId);if(!v)fail('Video unavailable',404);const exists=one(`SELECT 1 FROM ${table} WHERE user_id=? AND video_id=?`,user.id,v.id);if(exists)run(`DELETE FROM ${table} WHERE user_id=? AND video_id=?`,user.id,v.id);else run(`INSERT INTO ${table}(user_id,video_id,created_at) VALUES(?,?,?)`,user.id,v.id,now());return send(res,{active:!exists})}
 if(method==='POST'&&p==='/api/me/reaction'){const user=requireUser(req),b=await parseBody(req);const v=availableVideo(b.videoId);if(!v)fail('Video unavailable',404);if(!['LIKE','DISLIKE'].includes(b.type))fail('Invalid reaction');const prev=one('SELECT type FROM reactions WHERE user_id=? AND video_id=?',user.id,v.id)?.type;
  db.exec('BEGIN');try{if(prev){run('DELETE FROM reactions WHERE user_id=? AND video_id=?',user.id,v.id);run(`UPDATE videos SET ${prev==='LIKE'?'likes':'dislikes'}=MAX(0,${prev==='LIKE'?'likes':'dislikes'}-1) WHERE id=?`,v.id)}if(prev!==b.type){run('INSERT INTO reactions(user_id,video_id,type) VALUES(?,?,?)',user.id,v.id,b.type);run(`UPDATE videos SET ${b.type==='LIKE'?'likes':'dislikes'}=${b.type==='LIKE'?'likes':'dislikes'}+1 WHERE id=?`,v.id)}db.exec('COMMIT')}catch(e){db.exec('ROLLBACK');throw e}const fresh=one('SELECT likes,dislikes FROM videos WHERE id=?',v.id);return send(res,{reaction:prev===b.type?null:b.type,...fresh})}
 if(method==='POST'&&p==='/api/me/progress'){const user=requireUser(req),b=await parseBody(req);const videoId=nval(b.videoId,0,0,10000000),position=Math.max(0,Math.min(86400,Number(b.position)||0));if(!availableVideo(videoId))fail('Video not found',404);
 const pref=one('SELECT pause_history FROM user_preferences WHERE user_id=?',user.id);if(pref?.pause_history)return send(res,{ok:true,saved:false,reason:'history_paused'});
 run('INSERT INTO watch_progress(user_id,video_id,position,watched_at) VALUES(?,?,?,?) ON CONFLICT(user_id,video_id) DO UPDATE SET position=excluded.position,watched_at=excluded.watched_at',user.id,videoId,position,now());return send(res,{ok:true})}
 // Search history is disabled by default and never recorded for anonymous users.
 if(method==='POST'&&p==='/api/me/search-history'){
  const u=requireUser(req),b=await parseBody(req),q=cleanText(b.query,100).replace(/\s+/g,' ');
  if(q.length<2)fail('Search query too short');
  if(!one('SELECT save_searches FROM user_preferences WHERE user_id=?',u.id)?.save_searches)return send(res,{saved:false});
  run('INSERT INTO search_history(user_id,query,searched_at) VALUES(?,?,?) ON CONFLICT(user_id,query) DO UPDATE SET searched_at=excluded.searched_at',u.id,q,now());
  run('DELETE FROM search_history WHERE user_id=? AND query NOT IN (SELECT query FROM search_history WHERE user_id=? ORDER BY searched_at DESC LIMIT 50)',u.id,u.id);
  return send(res,{saved:true});
 }
 if(method==='GET'&&p==='/api/me/search-history'){const u=requireUser(req);return send(res,{items:all('SELECT query,searched_at AS searchedAt FROM search_history WHERE user_id=? ORDER BY searched_at DESC LIMIT 50',u.id)});}
 if(method==='DELETE'&&p==='/api/me/search-history'){const u=requireUser(req);const r=run('DELETE FROM search_history WHERE user_id=?',u.id);return send(res,{ok:true,removed:r.changes});}
 if(method==='GET'&&p==='/api/me/watch-stats'){
  const u=requireUser(req),stats=one(`SELECT COUNT(*) AS uniqueVideos, COALESCE(SUM(MIN(w.position,v.duration)),0) AS totalSeconds FROM watch_progress w JOIN videos v ON v.id=w.video_id WHERE w.user_id=?`,u.id);
  const categories=all(`SELECT c.name,COUNT(*) AS videos FROM watch_progress w JOIN video_categories vc ON vc.video_id=w.video_id JOIN categories c ON c.id=vc.category_id WHERE w.user_id=? GROUP BY c.id ORDER BY videos DESC,c.name LIMIT 5`,u.id);
  return send(res,{...stats,topCategories:categories,note:'Derived from last saved positions, not audited total watch time.'});
 }
 if(method==='GET'&&p==='/api/me/history'){const user=requireUser(req);return send(res,{items:all(`SELECT ${VIDEO_COLS},w.position AS progress ${VIDEO_FROM} JOIN watch_progress w ON w.video_id=v.id WHERE w.user_id=? AND v.status='PUBLISHED' AND ${NO_HOLD} ORDER BY w.watched_at DESC`,user.id).map(simpleVideo)})}
 if(method==='DELETE'&&p==='/api/me/history'){const user=requireUser(req);const r=run('DELETE FROM watch_progress WHERE user_id=?',user.id);return send(res,{ok:true,removed:r.changes})}
 const historyItem=p.match(/^\/api\/me\/history\/(\d+)$/);
 if(method==='DELETE'&&historyItem){const u=requireUser(req);const r=run('DELETE FROM watch_progress WHERE user_id=? AND video_id=?',u.id,Number(historyItem[1]));return send(res,{ok:true,removed:r.changes})}
 if(method==='GET'&&p==='/api/me/notifications'){
  const u=requireUser(req);
  const items=all(`SELECT n.id,n.read_at AS readAt,n.created_at AS createdAt,n.type,
      v.title,v.slug,ch.name AS channelName FROM notifications n
      JOIN videos v ON v.id=n.video_id JOIN channels ch ON ch.id=n.channel_id
      WHERE n.user_id=? AND v.status='PUBLISHED' AND ${NO_HOLD} ORDER BY n.created_at DESC,n.id DESC LIMIT 100`,u.id);
  const unread=items.filter(n=>!n.readAt).length;
  return send(res,{items,unread});
 }
 if(method==='POST'&&p==='/api/me/notifications/read-all'){
   const u=requireUser(req);const result=run('UPDATE notifications SET read_at=? WHERE user_id=? AND read_at IS NULL',now(),u.id);
   return send(res,{ok:true,marked:result.changes});
 }
 const readNotification=p.match(/^\/api\/me\/notifications\/(\d+)\/read$/);
 if(method==='PATCH'&&readNotification){const u=requireUser(req);
   const result=run('UPDATE notifications SET read_at=? WHERE id=? AND user_id=?',now(),Number(readNotification[1]),u.id);
   if(!result.changes)fail('Notification unavailable',404);
   return send(res,{ok:true});
 }
 if(method==='GET'&&p==='/api/me/export'){
   const u=requireUser(req);
   return send(res,{exportedAt:now(),user:{email:u.email,name:u.name,createdAt:one('SELECT created_at AS createdAt FROM users WHERE id=?',u.id)?.createdAt},
    favorites:all('SELECT video_id AS videoId,created_at AS savedAt FROM favorites WHERE user_id=?',u.id),
    watchLater:all('SELECT video_id AS videoId,created_at AS savedAt FROM watch_later WHERE user_id=?',u.id),
    watchQueue:all('SELECT video_id AS videoId,position FROM watch_queue WHERE user_id=? ORDER BY position',u.id),
    watchHistory:all('SELECT video_id AS videoId,position,watched_at AS watchedAt FROM watch_progress WHERE user_id=?',u.id),
    searchHistory:all('SELECT query,searched_at AS searchedAt FROM search_history WHERE user_id=?',u.id),
    savedFilters:all('SELECT name,filters_json AS filtersJson,created_at AS createdAt FROM saved_search_filters WHERE user_id=? ORDER BY id DESC',u.id).map(x=>({name:x.name,filters:JSON.parse(x.filtersJson),createdAt:x.createdAt})),
    entityFollows:all('SELECT kind,entity_id AS entityId,created_at AS createdAt FROM entity_follows WHERE user_id=?',u.id),
    subscriptions:all('SELECT channel_id AS channelId,created_at AS subscribedAt,notify FROM subscriptions WHERE user_id=?',u.id),
    playlists:all('SELECT p.id,p.name,p.created_at AS createdAt FROM playlists p WHERE p.user_id=?',u.id).map(p=>({...p,videoIds:all('SELECT video_id AS videoId FROM playlist_videos WHERE playlist_id=? ORDER BY position ASC',p.id).map(x=>x.videoId)})),
    preferences:{pauseHistory:!!one('SELECT pause_history FROM user_preferences WHERE user_id=?',u.id)?.pause_history,autoplayNext:!!one('SELECT autoplay_next FROM user_preferences WHERE user_id=?',u.id)?.autoplay_next},
    categoryPreferences:all('SELECT category_id FROM user_category_preferences WHERE user_id=?',u.id).map(x=>x.category_id)
   });
 }
 if(method==='GET'&&p==='/api/me/feed'){const user=requireUser(req);return send(res,{items:all(`${SQL_VIDEOS} JOIN subscriptions sub ON sub.channel_id=v.channel_id WHERE sub.user_id=? AND v.status='PUBLISHED' AND ${NO_HOLD} ORDER BY v.published_at DESC LIMIT 48`,user.id).map(simpleVideo)})}
 if(method==='GET'&&p==='/api/me/subscriptions'){const user=requireUser(req);return send(res,{items:all('SELECT c.*,x.notify,x.notify_mode AS notifyMode,s.name AS siteName FROM subscriptions x JOIN channels c ON c.id=x.channel_id LEFT JOIN sites s ON s.id=c.site_id WHERE x.user_id=? ORDER BY x.created_at DESC',user.id)})}
 if(method==='POST'&&p==='/api/me/subscriptions/toggle'){const user=requireUser(req),b=await parseBody(req);if(!one('SELECT id FROM channels WHERE id=?',b.channelId))fail('Channel not found',404);const exists=one('SELECT 1 FROM subscriptions WHERE user_id=? AND channel_id=?',user.id,b.channelId);if(exists)run('DELETE FROM subscriptions WHERE user_id=? AND channel_id=?',user.id,b.channelId);else run('INSERT INTO subscriptions(user_id,channel_id,created_at) VALUES(?,?,?)',user.id,b.channelId,now());return send(res,{active:!exists})}
 const notificationPreference=p.match(/^\/api\/me\/subscriptions\/(\d+)\/notifications$/);
 if(method==='PATCH'&&notificationPreference){
  const u=requireUser(req),b=await parseBody(req);
  const mode=b.mode??(typeof b.enabled==='boolean'?(b.enabled?'ALL':'OFF'):null);
  if(!['ALL','HIGHLIGHTS','OFF'].includes(mode))fail('Notification mode must be ALL, HIGHLIGHTS or OFF');
  const result=run('UPDATE subscriptions SET notify_mode=?,notify=? WHERE user_id=? AND channel_id=?',mode,mode==='ALL'?1:0,u.id,Number(notificationPreference[1]));
  if(!result.changes)fail('Subscription not found',404);
  return send(res,{ok:true,enabled:mode==='ALL',mode,note:mode==='HIGHLIGHTS'?'Digest highlights require a future scheduler; no instant alerts are sent.':undefined});
 }
 const sharedPlaylist=p.match(/^\/api\/public\/playlists\/(\d+)$/);
 if(method==='GET'&&sharedPlaylist){
  const pl=one("SELECT id,name,visibility FROM playlists WHERE id=? AND visibility='UNLISTED'",Number(sharedPlaylist[1]));
  if(!pl)fail('Shared playlist unavailable',404);
  const items=all(`${SQL_VIDEOS} JOIN playlist_videos pv ON pv.video_id=v.id WHERE pv.playlist_id=? AND v.status='PUBLISHED' AND ${NO_HOLD} ORDER BY pv.position`,pl.id).map(simpleVideo);
  return send(res,{playlist:pl,items});
 }
 if(method==='GET'&&p==='/api/me/playlists'){const user=requireUser(req);return send(res,{items:all('SELECT p.id,p.name,p.created_at AS createdAt,COUNT(pv.video_id) AS videoCount FROM playlists p LEFT JOIN playlist_videos pv ON pv.playlist_id=p.id WHERE p.user_id=? GROUP BY p.id ORDER BY p.created_at DESC',user.id)})}
 if(method==='POST'&&p==='/api/me/playlists'){const user=requireUser(req),b=await parseBody(req);const name=cleanText(b.name,70),visibility=b.visibility||'PRIVATE';
 if(!name||!['PRIVATE','UNLISTED'].includes(visibility))fail('Valid playlist name and visibility required');
 const id=run('INSERT INTO playlists(user_id,name,created_at,visibility) VALUES(?,?,?,?)',user.id,name,now(),visibility).lastInsertRowid;
 return send(res,{id:Number(id),name,visibility},201)}
 const playlistMatch=p.match(/^\/api\/me\/playlists\/(\d+)$/);
 if(method==='GET'&&playlistMatch){const user=requireUser(req);const pl=one('SELECT * FROM playlists WHERE id=? AND user_id=?',Number(playlistMatch[1]),user.id);if(!pl)fail('Playlist not found',404);const items=all(`SELECT ${VIDEO_COLS} ${VIDEO_FROM} JOIN playlist_videos pv ON pv.video_id=v.id WHERE pv.playlist_id=? AND v.status='PUBLISHED' AND ${NO_HOLD} ORDER BY pv.position ASC,pv.rowid ASC`,pl.id).map(simpleVideo);return send(res,{playlist:pl,items})}
 if(method==='PATCH'&&playlistMatch){const u=requireUser(req),b=await parseBody(req),name=cleanText(b.name,70);
 const prior=one('SELECT name,visibility FROM playlists WHERE id=? AND user_id=?',Number(playlistMatch[1]),u.id);if(!prior)fail('Playlist not found',404);
 const visibility=b.visibility??prior.visibility;
 if(!['PRIVATE','UNLISTED'].includes(visibility)||!name)fail('Valid name and visibility required');
 run('UPDATE playlists SET name=?,visibility=? WHERE id=? AND user_id=?',name,visibility,Number(playlistMatch[1]),u.id);
 return send(res,{ok:true,name,visibility});
 }
 const playlistOrder=p.match(/^\/api\/me\/playlists\/(\d+)\/order$/);
 if(method==='PATCH'&&playlistOrder){
  const u=requireUser(req),b=await parseBody(req),playlistId=Number(playlistOrder[1]),ids=b.videoIds;
  if(!one('SELECT 1 FROM playlists WHERE id=? AND user_id=?',playlistId,u.id))fail('Playlist not found',404);
  if(!Array.isArray(ids)||ids.length>500||ids.some(x=>!Number.isSafeInteger(x)||x<1)||new Set(ids).size!==ids.length)fail('Invalid playlist order');
  const visible=all(`SELECT pv.video_id AS id FROM playlist_videos pv JOIN videos v ON v.id=pv.video_id WHERE pv.playlist_id=? AND v.status='PUBLISHED' AND ${NO_HOLD}`,playlistId).map(x=>x.id);
  if(ids.length!==visible.length||ids.some(id=>!visible.includes(id)))fail('Playlist order does not match available items',409);
  db.exec('BEGIN');try{ids.forEach((id,i)=>run('UPDATE playlist_videos SET position=? WHERE playlist_id=? AND video_id=?',i+1,playlistId,id));db.exec('COMMIT')}catch(e){db.exec('ROLLBACK');throw e}
  return send(res,{ok:true,count:ids.length});
 }
 const bulkPlaylist=p.match(/^\/api\/me\/playlists\/(\d+)\/videos$/);
 if(method==='DELETE'&&bulkPlaylist){
  const u=requireUser(req),b=await parseBody(req),ids=b.videoIds,pl=Number(bulkPlaylist[1]);
  if(!one('SELECT 1 FROM playlists WHERE id=? AND user_id=?',pl,u.id))fail('Playlist unavailable',404);
  if(!Array.isArray(ids)||!ids.length||ids.length>100||ids.some(x=>!Number.isSafeInteger(x)||x<1)||new Set(ids).size!==ids.length)fail('Invalid video selection');
  const r=run(`DELETE FROM playlist_videos WHERE playlist_id=? AND video_id IN (${ids.map(()=>'?').join(',')})`,pl,...ids);
  return send(res,{ok:true,removed:r.changes});
 }
 const playlistItem=p.match(/^\/api\/me\/playlists\/(\d+)\/videos\/(\d+)$/);
 if(method==='DELETE'&&playlistItem){const u=requireUser(req);
 const own=one('SELECT id FROM playlists WHERE id=? AND user_id=?',Number(playlistItem[1]),u.id);if(!own)fail('Playlist not found',404);
 const r=run('DELETE FROM playlist_videos WHERE playlist_id=? AND video_id=?',own.id,Number(playlistItem[2]));return send(res,{ok:true,removed:r.changes});
 }
 if(method==='POST'&&p==='/api/me/playlists/items'){const user=requireUser(req),b=await parseBody(req);const pl=one('SELECT id FROM playlists WHERE id=? AND user_id=?',b.playlistId,user.id);if(!pl)fail('Playlist unavailable',404);if(!availableVideo(b.videoId))fail('Video unavailable',404);run('INSERT OR IGNORE INTO playlist_videos(playlist_id,video_id,added_at,position) VALUES(?,?,?,(SELECT COALESCE(MAX(position),0)+1 FROM playlist_videos WHERE playlist_id=?))',pl.id,b.videoId,now(),pl.id);return send(res,{ok:true})}
 if(method==='DELETE'&&playlistMatch){const user=requireUser(req);run('DELETE FROM playlists WHERE id=? AND user_id=?',Number(playlistMatch[1]),user.id);return send(res,{ok:true})}
 if(method==='POST'&&p==='/api/videos/view'){const b=await parseBody(req);const id=Number(b.videoId);if(!availableVideo(id))fail('Video not found',404);const viewer=currentUser(req)?.id||req.socket.remoteAddress||'anonymous';const key=`${viewer}:${id}`;
 const last=recentViews.get(key)||0;if(Date.now()-last<60_000)return send(res,{ok:true,counted:false});
 recentViews.set(key,Date.now());if(recentViews.size>50000){const cutoff=Date.now()-60_000;for(const [k,seen] of recentViews)if(seen<cutoff)recentViews.delete(k)}
 run('UPDATE videos SET views=views+1 WHERE id=?',id);return send(res,{ok:true,counted:true})}
 if(method==='POST'&&p==='/api/reports'){const user=requireUser(req),b=await parseBody(req);const reason=cleanText(b.reason,100),details=cleanText(b.details,1200);if(!reason||!availableVideo(b.videoId))fail('Valid public video and reason required');run('INSERT INTO reports(user_id,video_id,reason,details,created_at) VALUES(?,?,?,?,?)',user.id,b.videoId,reason,details,now());return send(res,{ok:true},201)}
 if(method==='POST'&&p==='/api/comments'){
  const user=requireUser(req),b=await parseBody(req),body=cleanText(b.body,1000),videoId=Number(b.videoId),parentId=b.parentId==null?null:Number(b.parentId);
  rateLimit('comments:user:'+user.id,30,60_000);
  if(body.length<2||!availableVideo(videoId))fail('Valid public video and comment required');
  if(parentId!==null){const parent=one('SELECT id,video_id,parent_id,hidden FROM comments WHERE id=?',parentId);
   if(!parent||parent.video_id!==videoId||parent.hidden||parent.parent_id!==null)fail('Reply must belong to a visible top-level comment',409);}
  const recent=all('SELECT body FROM comments WHERE user_id=? ORDER BY id DESC LIMIT 10',user.id).map(x=>x.body);
  const signals=commentSignals(body,recent);
  const id=Number(run('INSERT INTO comments(user_id,video_id,body,created_at,parent_id) VALUES(?,?,?,?,?)',user.id,videoId,body,now(),parentId).lastInsertRowid);
  if(signals.length)run('INSERT INTO comment_abuse_flags(comment_id,signals_json,created_at) VALUES(?,?,?)',id,JSON.stringify(signals),now());
  // Return no suspicion signal to ordinary viewers: avoids signaling detector thresholds.
  return send(res,{ok:true,id,parentId},201);
 }
 if(method==='POST'&&p==='/api/comments/report'){
  const u=requireUser(req),b=await parseBody(req),id=Number(b.commentId),reason=cleanText(b.reason,250);
  rateLimit('comment-reports:user:'+u.id,12,3600_000);
  if(reason.length<8||!one("SELECT 1 FROM comments c JOIN videos v ON v.id=c.video_id WHERE c.id=? AND c.hidden=0 AND v.status='PUBLISHED' AND NOT EXISTS (SELECT 1 FROM content_holds h WHERE h.video_id=v.id AND h.closed_at IS NULL)",id))fail('Valid visible comment and reason required');
  const r=run('INSERT OR IGNORE INTO comment_reports(comment_id,reporter_id,reason,created_at) VALUES(?,?,?,?)',id,u.id,reason,now());
  return send(res,{ok:true,reported:!!r.changes},201);
 }
 const commentReportClose=p.match(/^\/api\/admin\/comment-reports\/(\d+)\/close$/);
 if(method==='PATCH'&&commentReportClose){const admin=requireAdmin(req),id=Number(commentReportClose[1]);
  const result=run('UPDATE comment_reports SET handled_at=? WHERE id=? AND handled_at IS NULL',now(),id);
  if(!result.changes)fail('Open report not found',404);adminAudit(admin,'comment_report',id,'CLOSED');
  return send(res,{ok:true,handled:true});
 }
 const commentPin=p.match(/^\/api\/admin\/comments\/(\d+)\/pin$/);
 if(method==='PATCH'&&commentPin){const admin=requireAdmin(req),b=await parseBody(req),id=Number(commentPin[1]);
  if(typeof b.pinned!=='boolean')fail('Pinned must be a boolean');
  const comment=one('SELECT video_id,parent_id FROM comments WHERE id=?',id);
  if(!comment||comment.parent_id!==null)fail('Only top-level comments can be pinned',409);
  db.exec('BEGIN');try{if(b.pinned)run('UPDATE comments SET pinned=0 WHERE video_id=?',comment.video_id);
   run('UPDATE comments SET pinned=? WHERE id=?',Number(b.pinned),id);adminAudit(admin,'comment',id,b.pinned?'PIN':'UNPIN');db.exec('COMMIT')}
  catch(e){db.exec('ROLLBACK');throw e}return send(res,{ok:true,pinned:b.pinned});
 }
 if(method==='GET'&&p==='/api/admin/comment-abuse-flags'){
  requireAdmin(req);
  const records=all(`SELECT f.id,f.comment_id AS commentId,f.signals_json AS signalsJson,f.state,f.created_at AS createdAt,
   c.body,c.hidden,u.name AS author FROM comment_abuse_flags f JOIN comments c ON c.id=f.comment_id
   JOIN users u ON u.id=c.user_id ORDER BY CASE WHEN f.state='PENDING' THEN 0 ELSE 1 END,f.created_at DESC LIMIT 150`);
  return send(res,{items:records.map(({signalsJson,...x})=>({...x,signals:JSON.parse(signalsJson)}))});
 }
 const abuseDecision=p.match(/^\/api\/admin\/comment-abuse-flags\/(\d+)\/decision$/);
 if(method==='PATCH'&&abuseDecision){
  const admin=requireAdmin(req),b=await parseBody(req),id=Number(abuseDecision[1]);
  if(!['CONFIRM','DISMISS'].includes(b.decision))fail('Invalid review decision');
  const flag=one("SELECT comment_id FROM comment_abuse_flags WHERE id=? AND state='PENDING'",id);
  if(!flag)fail('Pending abuse flag not found',404);
  db.exec('BEGIN');try{
   const state=b.decision==='CONFIRM'?'CONFIRMED':'DISMISSED';
   run('UPDATE comment_abuse_flags SET state=?,reviewed_by=?,reviewed_at=? WHERE id=?',state,admin.id,now(),id);
   if(state==='CONFIRMED')run('UPDATE comments SET hidden=1 WHERE id=?',flag.comment_id);
   adminAudit(admin,'comment_abuse_flag',id,state);
   db.exec('COMMIT');
  }catch(e){db.exec('ROLLBACK');throw e}
  return send(res,{ok:true,decision:b.decision});
 }
 // Candidate-only duplicate discovery. A review is not a merge or takedown.
 if(method==='GET'&&p==='/api/admin/catalog/duplicate-candidates'){
  requireAdmin(req);
  const candidates=duplicateCandidates(all('SELECT id,title,duration FROM videos ORDER BY id DESC LIMIT 500'));
  return send(res,{items:candidates.filter(x=>!one('SELECT 1 FROM catalog_duplicate_reviews WHERE video_a=? AND video_b=?',x.videoA,x.videoB)),note:'Candidates are advisory; no asset is merged, hidden or removed.'});
 }
 const dupDecision=p.match(/^\/api\/admin\/catalog\/duplicate-candidates\/decision$/);
 if(method==='POST'&&dupDecision){
  const admin=requireAdmin(req),b=await parseBody(req);
  const a=Number(b.videoA),bb=Number(b.videoB);
  if(!Number.isSafeInteger(a)||!Number.isSafeInteger(bb)||a<1||a>=bb||!['DUPLICATE','DISTINCT'].includes(b.decision))fail('Invalid candidate decision');
  const candidates=duplicateCandidates(all('SELECT id,title,duration FROM videos ORDER BY id DESC LIMIT 500'));
  if(!candidates.some(x=>x.videoA===a&&x.videoB===bb))fail('Candidate not found',404);
  const r=run('INSERT OR IGNORE INTO catalog_duplicate_reviews(video_a,video_b,decision,reviewed_by,reviewed_at) VALUES(?,?,?,?,?)',a,bb,b.decision,admin.id,now());
  if(!r.changes)fail('Candidate already reviewed',409);
  adminAudit(admin,'catalog_duplicate',`${a}:${bb}`,b.decision);
  return send(res,{ok:true,decision:b.decision,changedMedia:false},201);
 }
 if(method==='GET'&&p==='/api/admin/comment-reports'){
  requireAdmin(req);return send(res,{items:all(`SELECT r.id,r.reason,r.created_at AS createdAt,c.id AS commentId,c.body FROM comment_reports r JOIN comments c ON c.id=r.comment_id WHERE r.handled_at IS NULL ORDER BY r.created_at DESC LIMIT 100`)});
 }

 const ownComment=p.match(/^\/api\/me\/comments\/(\d+)$/);
 if(method==='DELETE'&&ownComment){
  const u=requireUser(req),id=Number(ownComment[1]);
  if(!one('SELECT 1 FROM comments WHERE id=? AND user_id=?',id,u.id))fail('Comment unavailable',404);
  db.exec('BEGIN');try{run('DELETE FROM comments WHERE parent_id=?',id);run('DELETE FROM comments WHERE id=? AND user_id=?',id,u.id);db.exec('COMMIT')}catch(e){db.exec('ROLLBACK');throw e}
  return send(res,{ok:true,removed:1});
 }
 if(method==='GET'&&p==='/api/admin/operations'){requireAdmin(req);return send(res,operationsSnapshot())}
 if(method==='GET'&&p==='/api/admin/overview'){requireAdmin(req);return send(res,{videos:one('SELECT COUNT(*) AS n FROM videos').n,users:one('SELECT COUNT(*) AS n FROM users').n,openReports:one("SELECT COUNT(*) AS n FROM reports WHERE status='OPEN'").n,sites:one('SELECT COUNT(*) AS n FROM sites').n,hidden:one("SELECT COUNT(*) AS n FROM videos WHERE status='HIDDEN'").n})}
 if(method==='GET'&&p==='/api/admin/diagnostics'){
  requireAdmin(req);
  const integrity=one('PRAGMA quick_check')?.quick_check||'unknown';
  const stats=all('SELECT status,COUNT(*) AS count,COALESCE(SUM(expected_bytes),0) AS uploadedBytes FROM upload_sessions GROUP BY status');
  const recent=all('SELECT state,created_at AS createdAt FROM processing_events ORDER BY id DESC LIMIT 20');
  return send(res,{databaseIntegrity:integrity,uploadStates:stats,recentProcessingEvents:recent,checkedAt:now(),workerMode:process.env.SA_DISABLE_WORKER==='1'?'manual':process.env.MEDIA_WORKER_MODE==='inline'?'inline':'separate'});
 }
 if(method==='GET'&&p==='/api/admin/jobs'){
   requireAdmin(req);
   return send(res,{counts:all('SELECT status,COUNT(*) AS count FROM upload_sessions GROUP BY status'),
    items:all(`SELECT x.id,x.status,x.attempts,x.expected_bytes AS expectedBytes,
     x.received_bytes AS receivedBytes,x.updated_at AS updatedAt,x.error,v.title,u.email AS creator
     FROM upload_sessions x JOIN videos v ON v.id=x.video_id JOIN users u ON u.id=x.user_id
     ORDER BY x.updated_at DESC LIMIT 100`)});
 }
 if(method==='GET'&&p==='/api/admin/reports'){requireAdmin(req);return send(res,{items:all(`SELECT r.id,r.video_id AS videoId,r.reason,r.details,r.status,r.created_at AS createdAt,CASE WHEN lower(r.reason) LIKE '%consent%' OR lower(r.reason) LIKE '%age%' THEN 'HIGH' ELSE 'NORMAL' END AS priority,u.name AS submittedBy,v.title AS videoTitle,v.slug AS videoSlug FROM reports r JOIN users u ON u.id=r.user_id JOIN videos v ON v.id=r.video_id ORDER BY CASE WHEN r.status='OPEN' THEN 0 ELSE 1 END,CASE WHEN lower(r.reason) LIKE '%consent%' OR lower(r.reason) LIKE '%age%' THEN 0 ELSE 1 END,r.created_at DESC LIMIT 200`)})}
 if(method==='GET'&&p==='/api/admin/comments'){requireAdmin(req);return send(res,{items:all('SELECT c.id,c.body,c.hidden,c.pinned,c.created_at AS createdAt,v.title AS videoTitle,u.name AS author FROM comments c JOIN users u ON u.id=c.user_id JOIN videos v ON v.id=c.video_id ORDER BY c.created_at DESC LIMIT 200')})}
 const adminComment=p.match(/^\/api\/admin\/comments\/(\d+)\/visibility$/);
 if(method==='PATCH'&&adminComment){const reviewer=requireAdmin(req);const b=await parseBody(req);if(typeof b.hidden!=='boolean')fail('hidden must be a boolean');const r=run('UPDATE comments SET hidden=? WHERE id=?',b.hidden?1:0,Number(adminComment[1]));if(!r.changes)fail('Comment not found',404);adminAudit(reviewer,'comment',adminComment[1],b.hidden?'HIDE':'RESTORE');return send(res,{ok:true,hidden:b.hidden})}
 if(method==='GET'&&p==='/api/admin/holds'){
  requireAdmin(req);return send(res,{items:all(`SELECT h.id,h.video_id AS videoId,h.reason,h.details,h.opened_at AS openedAt,h.closed_at AS closedAt,
  v.title FROM content_holds h JOIN videos v ON v.id=h.video_id ORDER BY (h.closed_at IS NOT NULL),h.opened_at DESC LIMIT 200`)});
 }
 const holdStart=p.match(/^\/api\/admin\/videos\/(\d+)\/hold$/);
 if(method==='POST'&&holdStart){const admin=requireAdmin(req),b=await parseBody(req),id=Number(holdStart[1]);
  const reason=String(b.reason||''),details=cleanText(b.details,500);
  if(!['CONSENT','AGE','COPYRIGHT','RIGHTS_EXPIRED','OTHER'].includes(reason)||details.length<12)fail('Reason and at least 12 characters of case details are required');
  if(!one('SELECT 1 FROM videos WHERE id=?',id))fail('Video not found',404);
  if(one('SELECT id FROM content_holds WHERE video_id=? AND closed_at IS NULL',id))fail('There is already an active hold for this video',409);
  db.exec('BEGIN');try{
   run('INSERT INTO content_holds(video_id,reason,details,opened_by,opened_at) VALUES(?,?,?,?,?)',id,reason,details,admin.id,now());
   run("UPDATE videos SET status='HIDDEN' WHERE id=?",id);
   queueVideoRevocation(id,'EMERGENCY_HOLD:'+reason);
   adminAudit(admin,'video',id,'EMERGENCY_HOLD:'+reason);
   db.exec('COMMIT');
  }catch(e){db.exec('ROLLBACK');throw e}
  return send(res,{ok:true,status:'HIDDEN'},201);
 }
 const holdClose=p.match(/^\/api\/admin\/holds\/(\d+)\/close$/);
 if(method==='PATCH'&&holdClose){const admin=requireAdmin(req),b=await parseBody(req),details=cleanText(b.note,500),id=Number(holdClose[1]);
  if(details.length<12)fail('Closure note must contain at least 12 characters');
  const active=one('SELECT video_id FROM content_holds WHERE id=? AND closed_at IS NULL',id);
  if(!active)fail('Open hold not found',404);
  run('UPDATE content_holds SET closed_at=?,closed_by=?,closure_note=? WHERE id=?',now(),admin.id,details,id);
  adminAudit(admin,'video',active.video_id,'CLOSE_HOLD');
  return send(res,{ok:true,videoRemainsHidden:true});
 }
 const licenseRoute=p.match(/^\/api\/admin\/uploads\/([a-f0-9-]{36})\/license$/);
 if(licenseRoute){const admin=requireAdmin(req),uploadId=licenseRoute[1];
  if(method==='GET')return send(res,{item:getLicenseReview(uploadId)});
  if(method==='PATCH'){
   const b=await parseBody(req);
   if(b.action==='VERIFY')return send(res,{item:verifyLicenseReview(uploadId,b,admin.id)});
   if(b.action==='REVOKE')return send(res,{item:revokeLicenseReview(uploadId,b,admin.id)});
   fail('License action must be VERIFY or REVOKE');
  }
 }
 if(method==='GET'&&p==='/api/admin/media/revocations'){requireAdmin(req);return send(res,{items:pendingRevocations()});}
 const revocationStatus=p.match(/^\/api\/admin\/media\/revocations\/(\d+)\/status$/);
 if(method==='GET'&&revocationStatus){requireAdmin(req);const videoId=Number(revocationStatus[1]);const video=one('SELECT status FROM videos WHERE id=?',videoId);if(!video)fail('Video not found',404);
  const jobs=all('SELECT id,reason,status,requested_at AS requestedAt,processed_at AS processedAt,provider_request_id AS providerRequestId FROM media_revocation_jobs WHERE video_id=? ORDER BY id DESC LIMIT 100',videoId);
  return send(res,{videoId,visibility:video.status,activeHold:!!one('SELECT 1 FROM content_holds WHERE video_id=? AND closed_at IS NULL',videoId),jobs,cdnRevocationVerified:false,notice:'Database hide is immediate; provider invalidation, old signed credentials and cached copies are NOT independently verified.'});
 }

 if(method==='GET'&&p==='/api/admin/videos'){requireAdmin(req);return send(res,{items:all(`SELECT v.id,v.title,v.slug,v.status,v.views,s.name AS siteName FROM videos v LEFT JOIN sites s ON s.id=v.site_id ORDER BY v.published_at DESC LIMIT 200`)})}
 const adminStatus=p.match(/^\/api\/admin\/videos\/(\d+)\/status$/);
 if(method==='PATCH'&&adminStatus){const reviewer=requireAdmin(req);const b=await parseBody(req),status=String(b.status||'');if(!['PUBLISHED','HIDDEN'].includes(status))fail('Status must be PUBLISHED or HIDDEN');const uploaded=one('SELECT x.status AS uploadStatus FROM upload_sessions x WHERE x.video_id=?',Number(adminStatus[1]));if(status==='PUBLISHED'&&one('SELECT 1 FROM content_holds WHERE video_id=? AND closed_at IS NULL',Number(adminStatus[1])))fail('An unresolved rights/safety hold blocks publication.',409);if(uploaded&&status==='PUBLISHED'){if(uploaded.uploadStatus!=='PUBLISHED')fail('Uploaded media must pass the dedicated review workflow.',409);const owner=one('SELECT cp.status FROM creator_profiles cp JOIN upload_sessions x ON x.user_id=cp.user_id WHERE x.video_id=?',Number(adminStatus[1]));if(owner?.status!=='APPROVED')fail('A suspended creator cannot republish content.',409);}const result=run('UPDATE videos SET status=? WHERE id=?',status,Number(adminStatus[1]));if(!result.changes)fail('Video not found',404);if(status==='HIDDEN')queueVideoRevocation(Number(adminStatus[1]),'ADMIN_HIDE');adminAudit(reviewer,'video',adminStatus[1],status);return send(res,{ok:true,status})}
 const adminReport=p.match(/^\/api\/admin\/reports\/(\d+)\/status$/);
 if(method==='PATCH'&&adminReport){const reviewer=requireAdmin(req);const b=await parseBody(req),status=String(b.status||'');if(!['OPEN','RESOLVED','DISMISSED'].includes(status))fail('Invalid report status');const result=run('UPDATE reports SET status=? WHERE id=?',status,Number(adminReport[1]));if(!result.changes)fail('Report not found',404);adminAudit(reviewer,'report',adminReport[1],status);return send(res,{ok:true,status})}

 // Formal complaint records complement, and never bypass, the emergency hold workflow.
 if(method==='POST'&&p==='/api/compliance/cases'){
  const user=requireUser(req),b=await parseBody(req);
  const id=nval(b.videoId,0,0,10000000),category=String(b.category||'').toUpperCase();
  const details=cleanText(b.details,2000);
  const evidenceReference=b.evidenceReference===undefined?null:String(b.evidenceReference||'').trim();
  if(evidenceReference!==null&&!/^[A-Za-z0-9][A-Za-z0-9._:/-]{7,119}$/.test(evidenceReference))fail('Use an opaque evidence reference, not documents or personal details.');
  if(!['COPYRIGHT','CONSENT','AGE','PRIVACY','OTHER'].includes(category))fail('Invalid case category');
  if(details.length<25)fail('Case details must contain at least 25 characters');
  if(!one('SELECT id FROM videos WHERE id=?',id))fail('Video not found',404);
  rateLimit('case-user:'+user.id,12,3600_000);
  const priority=['CONSENT','AGE'].includes(category)?'URGENT':'STANDARD';
  db.exec('BEGIN');let caseId;
  try{
   caseId=Number(run('INSERT INTO compliance_cases(video_id,reporter_id,category,details,status,priority,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)',id,user.id,category,details,'OPEN',priority,now(),now()).lastInsertRowid);
   run('INSERT INTO compliance_case_events(case_id,actor_id,action,details,created_at) VALUES(?,?,?,?,?)',caseId,user.id,'FILED',category,now());
   if(evidenceReference)run('INSERT INTO compliance_case_evidence_refs(case_id,submitted_by,reference,created_at) VALUES(?,?,?,?)',caseId,user.id,evidenceReference,now());
   db.exec('COMMIT');
  }catch(e){db.exec('ROLLBACK');throw e}
  // URGENT means a priority review, not automatically deleting someone else's lawful media.
  return send(res,{id:caseId,priority,status:'OPEN',notice:'Filed for human review; no automatic content decision was made.'},201);
 }
 if(method==='GET'&&p==='/api/me/compliance/cases'){
  const user=requireUser(req);
  return send(res,{items:all(`SELECT id,video_id AS videoId,category,status,priority,created_at AS createdAt,updated_at AS updatedAt
   FROM compliance_cases WHERE reporter_id=? ORDER BY created_at DESC LIMIT 100`,user.id)});
 }
 if(method==='GET'&&p==='/api/me/compliance/appeals'){
  const user=requireUser(req);
  return send(res,{items:all(`SELECT a.id,a.case_id AS caseId,a.state,a.created_at AS createdAt,a.decided_at AS decidedAt,c.category,c.status AS caseStatus
   FROM compliance_appeals a JOIN compliance_cases c ON c.id=a.case_id WHERE a.appellant_id=? ORDER BY a.created_at DESC LIMIT 100`,user.id)});
 }
 if(method==='GET'&&p==='/api/studio/compliance/cases'){
  const user=requireUser(req);
  return send(res,{items:all(`SELECT DISTINCT c.id,c.video_id AS videoId,v.title,c.category,c.status,c.priority,c.updated_at AS updatedAt,
    (SELECT COUNT(*) FROM compliance_appeals a WHERE a.case_id=c.id AND a.appellant_id=?) AS myAppeals
    FROM compliance_cases c JOIN videos v ON v.id=c.video_id
    JOIN upload_sessions x ON x.video_id=v.id WHERE x.user_id=?
    ORDER BY c.updated_at DESC LIMIT 100`,user.id,user.id)});
 }
 const appeal=p.match(/^\/api\/compliance\/cases\/(\d+)\/appeal$/);
 if(method==='POST'&&appeal){
  const user=requireUser(req),caseId=Number(appeal[1]),b=await parseBody(req),details=cleanText(b.details,2000);
  if(details.length<25)fail('Provide at least 25 characters explaining the appeal');
  const c=one('SELECT id,video_id,status FROM compliance_cases WHERE id=?',caseId);
  if(!c)fail('Case not found',404);
  // Only the verified owning uploader may contest a case; viewers/reporters cannot appeal arbitrary media.
  const owner=one('SELECT 1 FROM upload_sessions WHERE user_id=? AND video_id=? LIMIT 1',user.id,c.video_id);
  if(!owner)fail('Only the uploader of this media may file this appeal.',403);
  if(!['RESOLVED','REJECTED','CLOSED'].includes(c.status))fail('A case must have an initial decision before appeal.',409);
  if(one('SELECT id FROM compliance_appeals WHERE case_id=? AND appellant_id=?',caseId,user.id))fail('This appeal was already filed.',409);
  const aid=Number(run('INSERT INTO compliance_appeals(case_id,appellant_id,details,created_at) VALUES(?,?,?,?)',caseId,user.id,details,now()).lastInsertRowid);
  run('INSERT INTO compliance_case_events(case_id,actor_id,action,details,created_at) VALUES(?,?,?,?,?)',caseId,user.id,'APPEAL_FILED','Uploader requested a second review',now());
  return send(res,{id:aid,status:'PENDING',notice:'Appeals never republish content automatically.'},201);
 }
 if(method==='GET'&&p==='/api/admin/compliance/cases'){
  requireAdmin(req);
  return send(res,{items:all(`SELECT c.id,c.video_id AS videoId,v.title,c.category,c.priority,c.status,c.created_at AS createdAt,
    c.updated_at AS updatedAt,c.assigned_to AS assignedTo,
    (SELECT COUNT(*) FROM compliance_appeals a WHERE a.case_id=c.id AND a.state='PENDING') AS pendingAppeals
    FROM compliance_cases c JOIN videos v ON v.id=c.video_id
    ORDER BY (c.priority='URGENT') DESC,(c.status='OPEN') DESC,c.created_at DESC LIMIT 250`)});
 }
 const caseDetail=p.match(/^\/api\/admin\/compliance\/cases\/(\d+)$/);
 if(method==='GET'&&caseDetail){
  requireAdmin(req);const id=Number(caseDetail[1]);const item=one('SELECT * FROM compliance_cases WHERE id=?',id);
  if(!item)fail('Case not found',404);
  return send(res,{item,events:all('SELECT id,actor_id AS actorId,action,details,created_at AS createdAt FROM compliance_case_events WHERE case_id=? ORDER BY id',id),
   appeals:all('SELECT id,appellant_id AS appellantId,details,state,created_at AS createdAt FROM compliance_appeals WHERE case_id=? ORDER BY id',id),
   evidenceReferences:all('SELECT reference,submitted_by AS submittedBy,created_at AS createdAt FROM compliance_case_evidence_refs WHERE case_id=? ORDER BY created_at',id)});
 }
 const caseDecision=p.match(/^\/api\/admin\/compliance\/cases\/(\d+)\/decision$/);
 if(method==='PATCH'&&caseDecision){
  const reviewer=requireAdmin(req),b=await parseBody(req),id=Number(caseDecision[1]),status=String(b.status||'').toUpperCase(),note=cleanText(b.note,1000);
  if(!['IN_REVIEW','AWAITING_EVIDENCE','RESOLVED','REJECTED','CLOSED'].includes(status)||note.length<15)fail('Decision status and at least 15 characters of reasoning required.');
  const prev=one('SELECT video_id,status FROM compliance_cases WHERE id=?',id);
  if(!prev)fail('Case not found',404);
  if(dualReviewRequired(id,status))fail('Two distinct reviewer signoffs are required for sensitive-case closure.',409);
  db.exec('BEGIN');try{
   run('UPDATE compliance_cases SET status=?,assigned_to=?,decision_note=?,updated_at=? WHERE id=?',status,reviewer.id,note,now(),id);
   run('INSERT INTO compliance_case_events(case_id,actor_id,action,details,created_at) VALUES(?,?,?,?,?)',id,reviewer.id,'DECISION:'+status,note,now());
   adminAudit(reviewer,'compliance_case',id,status);
   db.exec('COMMIT');
  }catch(e){db.exec('ROLLBACK');throw e}
  return send(res,{ok:true,status,videoStatusUnchanged:true});
 }
 const appealDecision=p.match(/^\/api\/admin\/compliance\/appeals\/(\d+)\/decision$/);
 if(method==='PATCH'&&appealDecision){
  const reviewer=requireAdmin(req),b=await parseBody(req),id=Number(appealDecision[1]);
  const status=String(b.status||'').toUpperCase(),note=cleanText(b.note,1000);
  if(!['ACCEPTED','DECLINED'].includes(status)||note.length<15)fail('Appeal decision and explanation required');
  const prev=one("SELECT case_id AS caseId FROM compliance_appeals WHERE id=? AND state='PENDING'",id);
  if(!prev)fail('Pending appeal not found',404);
  db.exec('BEGIN');try{
   run('UPDATE compliance_appeals SET state=?,decided_at=? WHERE id=?',status,now(),id);
   run('INSERT INTO compliance_case_events(case_id,actor_id,action,details,created_at) VALUES(?,?,?,?,?)',prev.caseId,reviewer.id,'APPEAL_'+status,note,now());
   adminAudit(reviewer,'compliance_appeal',id,status);
   db.exec('COMMIT');
  }catch(e){db.exec('ROLLBACK');throw e}
  return send(res,{ok:true,status,videoStatusUnchanged:true});
 }
 fail('API endpoint not found',404);
}
function serveStatic(req,res,pathname){
 let decoded;try{decoded=decodeURIComponent(pathname)}catch{return send(res,{error:'Invalid URL encoding'},400)}
 const asset=decoded.startsWith('/assets/')?decoded:['/styles.css','/app.js','/sw.js','/offline.html','/manifest.webmanifest','/robots.txt','/sitemap.xml'].includes(decoded)?decoded:'/index.html';
 const target=path.resolve(PUBLIC,'.'+asset);if(!target.startsWith(PUBLIC+path.sep))return send(res,{error:'Forbidden'},403);
 let stat;try{stat=fs.statSync(target)}catch{return send(res,{error:'Asset not found'},404)}
 if(!stat.isFile())return send(res,{error:'Not found'},404);
 const mime=MIME[path.extname(target)]||'application/octet-stream';
 const headers={'Content-Type':mime,'Accept-Ranges':'bytes','X-Content-Type-Options':'nosniff','Cache-Control':['/index.html','/sw.js','/offline.html'].includes(asset)?'no-store':'public, max-age=3600'};
 if(req.headers.range&&path.extname(target)==='.mp4'){
  const m=/bytes=(\d+)-(\d*)/.exec(req.headers.range);if(!m){res.writeHead(416);res.end();return}
  const start=Number(m[1]),end=m[2]?Math.min(Number(m[2]),stat.size-1):stat.size-1;
  if(start>=stat.size||end<start){res.writeHead(416,{'Content-Range':`bytes */${stat.size}`});res.end();return}
  res.writeHead(206,{...headers,'Content-Range':`bytes ${start}-${end}/${stat.size}`,'Content-Length':end-start+1});if(req.method==='HEAD'){res.end();return}fs.createReadStream(target,{start,end}).pipe(res);return;
 }
 res.writeHead(200,{...headers,'Content-Length':stat.size});if(req.method==='HEAD'){res.end();return}fs.createReadStream(target).pipe(res);
}
const server=http.createServer(async(req,res)=>{
 const requestStart=process.hrtime.bigint();
 res.once('finish',()=>countResponse(req.method,res.statusCode,Number(process.hrtime.bigint()-requestStart)/1e9));

 if(process.env.NODE_ENV==='production')res.setHeader('Strict-Transport-Security','max-age=31536000; includeSubDomains');res.setHeader('Permissions-Policy','camera=(), microphone=(), geolocation=()');res.setHeader('X-Frame-Options','DENY');res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');res.setHeader('X-Content-Type-Options','nosniff');
 res.setHeader('Content-Security-Policy',"default-src 'self'; img-src 'self' data:; media-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'");
 try{const url=new URL(req.url,`http://${req.headers.host||'localhost'}`);if(url.pathname.startsWith('/api/')){
   if(!['GET','HEAD','OPTIONS'].includes(req.method) && url.pathname!=='/api/integrations/age-verification/callback'){if(req.headers['x-requested-with']!=='StreamAtlas')fail('Missing application request header',403);verifyMutation(req)}
   await api(req,res,url);
  }else if(['GET','HEAD'].includes(req.method)){
   if(process.env.SA_PRIVATE_PREVIEW_REQUIRE_RECEIPT==='1'&&['/assets/videos/','/assets/hls-demo/','/assets/posters/'].some(prefix=>url.pathname.startsWith(prefix)))requirePrivateViewer(currentUser(req));
   serveStatic(req,res,url.pathname);
  }
  else fail('Method not allowed',405);
 }catch(e){if(!res.headersSent){const status=e.status||500;send(res,{error:status>=500?'Internal server error':e.message},status)}else res.end();if((e.status||500)>=500)console.error(e)}
});
let workerChild=null;let shuttingDown=false;
function startMediaWorker(){
 if(shuttingDown||workerChild||process.env.MEDIA_WORKER_MODE==='inline'||process.env.SA_DISABLE_WORKER==='1')return;
 const child=fork(path.join(ROOT,'src','media-worker.js'),[],{stdio:'inherit',env:{...process.env,SA_MEDIA_WORKER:'1'}});
 workerChild=child;
 child.on('exit',()=>{
  workerChild=null;
  if(!shuttingDown){console.error('Media worker exited; restarting');setTimeout(startMediaWorker,1000).unref()}
 });
}
if(process.env.NODE_ENV!=='test'){
 if(process.env.MEDIA_WORKER_MODE==='inline')recoverUploads();else startMediaWorker();
 server.listen(PORT,()=>console.log(`StreamAtlas checkpoint 34: http://localhost:${PORT}`));
 const close=()=>{shuttingDown=true;workerChild?.kill('SIGTERM');server.close();};
 process.on('SIGINT',close);process.on('SIGTERM',close);
}
export {server};
