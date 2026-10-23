import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');const temp=fs.mkdtempSync(path.join(os.tmpdir(),'sa29-'));
process.env.DB_PATH=path.join(temp,'db.sqlite');process.env.PRIVATE_PATH=path.join(temp,'private');process.env.NODE_ENV='test';
const {server}=await import('../src/server.js');const {one,run,all}=await import('../src/database.js');
let base,user,second,other,videoId,uploadId;
async function request(p,{method='GET',cookie,data}={}){const headers={'X-Requested-With':'StreamAtlas'};if(cookie)headers.cookie=cookie;if(data!==undefined)headers['content-type']='application/json';const r=await fetch(base+p,{method,headers,body:data===undefined?undefined:JSON.stringify(data)});return {status:r.status,body:await r.json().catch(()=>null),cookie:r.headers.get('set-cookie')?.split(';')[0]}}
const post=(p,data,cookie)=>request(p,{method:'POST',cookie,data});
before(async()=>{await new Promise(done=>server.listen(0,'127.0.0.1',done));base=`http://127.0.0.1:${server.address().port}`;
 const a=await post('/api/auth/register',{name:'Quality Tester',email:'qoe29@example.test',password:'long secure password 29'});assert.equal(a.status,201);user=a.cookie;
 const login=await post('/api/auth/login',{email:'qoe29@example.test',password:'long secure password 29'});assert.equal(login.status,200);second=login.cookie;
 const b=await post('/api/auth/register',{name:'Other Viewer',email:'other29@example.test',password:'long secure password 29'});assert.equal(b.status,201);other=b.cookie;
 videoId=(await request('/api/videos?limit=1')).body.items[0].id;
});
after(async()=>{delete process.env.SA_ENABLE_QOE_TELEMETRY;await new Promise(done=>server.close(done));fs.rmSync(temp,{force:true,recursive:true})});
const metric={consent:true,startupFailure:false,startupMs:1200,rebufferMs:80,playbackMs:5000,errors:0,qualitySwitches:1,completed:true};
test('B15 telemetry disabled by default, requires explicit consent and valid bounded samples',async()=>{
 assert.equal((await post('/api/player/qoe',{...metric,videoId})).status,503);
 process.env.SA_ENABLE_QOE_TELEMETRY='1';
 assert.equal((await post('/api/player/qoe',{...metric,consent:false,videoId})).status,400);
 assert.equal((await post('/api/player/qoe',{...metric,startupMs:Infinity,videoId})).status,400);
 assert.equal((await post('/api/player/qoe',{...metric,playbackMs:-2,videoId})).status,400);
 assert.equal((await post('/api/player/qoe',{...metric,videoId:9999999})).status,404);
 assert.equal((await post('/api/player/qoe',{...metric,videoId})).status,202);
 assert.equal(one('SELECT samples FROM video_qoe_daily WHERE video_id=?',videoId).samples,1);
 const columns=all('PRAGMA table_info(video_qoe_daily)').map(c=>c.name);
 for(const prohibited of ['user_id','session_id','ip_address','cookie','email'])assert.ok(!columns.includes(prohibited));
});
test('B15 aggregate telemetry never reports hidden videos',async()=>{
 run("UPDATE videos SET status='HIDDEN' WHERE id=?",videoId);
 assert.equal((await post('/api/player/qoe',{...metric,videoId})).status,404);
 run("UPDATE videos SET status='PUBLISHED' WHERE id=?",videoId);
});
test('C04 authenticated sessions share preferences and watch history while unrelated users remain isolated',async()=>{
 const a=await request('/api/me/preferences',{cookie:user});assert.equal(a.status,200);
 assert.equal((await request('/api/me/preferences',{method:'PATCH',cookie:user,data:{pauseHistory:false,autoplayNext:true,theme:'light',locale:'English',saveSearches:false}})).status,200);
 const fromOtherSession=await request('/api/me/preferences?expanded=1',{cookie:second});assert.equal(fromOtherSession.body.theme,'light');assert.equal(fromOtherSession.body.autoplayNext,true);
 assert.equal((await request('/api/me/preferences?expanded=1',{cookie:other})).body.theme,'dark');
 assert.equal((await post('/api/me/progress',{videoId,position:8},user)).status,200);
 const otherDevice=await request('/api/me/history',{cookie:second});assert.ok(otherDevice.body.items.some(v=>v.id===videoId));
 assert.ok(!(await request('/api/me/history',{cookie:other})).body.items.some(v=>v.id===videoId));
});
test('B12 caption appearance controls and session diagnostics render with safe selector variants',()=>{
 const app=fs.readFileSync(path.join(root,'public/app.js'),'utf8'),css=fs.readFileSync(path.join(root,'public/styles.css'),'utf8');
 for(const id of ['caption-size','caption-contrast','player-captions','player-qoe'])assert.ok(app.includes(id));
 for(const cl of ['captions-normal::cue','captions-large::cue','captions-extra::cue','captions-high::cue'])assert.ok(css.includes(cl));
 assert.match(app,/Rebuffer.*Quality changes.*Errors/);assert.match(app,/qoe\.completed/);
});
test('C10 PWA offline shell excludes API/media caching and contains no private saved assets',async()=>{
 const sw=fs.readFileSync(path.join(root,'public/sw.js'),'utf8');assert.match(sw,/r\.mode!=='navigate'/);assert.match(sw,/path\.startsWith\('\/api\/'\)/);assert.match(sw,/path\.startsWith\('\/assets\/'\)/);
 const shell=await fetch(base+'/offline.html');assert.equal(shell.status,200);assert.match(await shell.text(),/never saved for offline viewing/);
 const worker=await fetch(base+'/sw.js');assert.equal(worker.status,200);assert.match(await worker.text(),/Offline shell only/);
});
test('E08 creator telemetry only exposes aggregate metrics for their own uploads and suppresses small samples',async()=>{
 assert.equal((await request('/api/studio/analytics/qoe')).status,401);
 assert.equal((await post('/api/studio/apply',{displayName:'Quality Creator 29',agreePolicies:true},user)).status,201);
 const cat=one('SELECT id FROM categories LIMIT 1').id;
 const initiated=await post('/api/studio/uploads/initiate',{title:'Synthetic Video Quality Test Upload',size:2048,filename:'safe.mp4',mime:'video/mp4',categoryId:cat,rightsDeclaration:true,adultsDeclaration:true,consentDeclaration:true},user);
 // A creator application alone does not grant upload permissions.
 assert.equal(initiated.status,403);
 const u=one("SELECT id FROM users WHERE email='qoe29@example.test'");const site=one('SELECT id FROM sites LIMIT 1').id;const channelId=Number(run('INSERT INTO channels(site_id,name,slug) VALUES(?,?,?)',site,'Quality Creator 29','quality-creator-29').lastInsertRowid);run("UPDATE creator_profiles SET status='APPROVED',channel_id=? WHERE user_id=?",channelId,u.id);
 const r=await post('/api/studio/uploads/initiate',{title:'Synthetic Video Quality Test Upload',size:2048,filename:'safe.mp4',mime:'video/mp4',categoryId:cat,rightsDeclaration:true,adultsDeclaration:true,consentDeclaration:true},user);
 assert.equal(r.status,201,JSON.stringify(r.body));uploadId=r.body.id;const uploadedId=r.body.videoId;
 run("UPDATE upload_sessions SET status='PUBLISHED' WHERE id=?",uploadId);run("UPDATE videos SET status='PUBLISHED' WHERE id=?",uploadedId);
 assert.equal((await post('/api/player/qoe',{...metric,videoId:uploadedId})).status,202);
 const single=(await request('/api/studio/analytics/qoe',{cookie:user})).body.items.find(v=>v.videoId===uploadedId);assert.ok(single);assert.equal(single.startupAverageMs,null);assert.equal(single.privacySuppressed,true);
 for(let n=0;n<4;n++)assert.equal((await post('/api/player/qoe',{...metric,videoId:uploadedId})).status,202);
 const aggregated=(await request('/api/studio/analytics/qoe',{cookie:second})).body.items.find(v=>v.videoId===uploadedId);assert.equal(aggregated.samples,5);assert.equal(aggregated.startupAverageMs,1200);assert.equal(aggregated.startupFailures,0);assert.equal(aggregated.rebufferRatio,Number((80/5080).toFixed(3)));
 assert.deepEqual((await request('/api/studio/analytics/qoe',{cookie:other})).body.items,[]);
});
test('H04 private preview cannot bypass the receipt gate through static poster, MP4 or HLS sample URLs',async()=>{
 process.env.SA_PRIVATE_PREVIEW_REQUIRE_RECEIPT='1';
 try{
  for(const route of ['/assets/posters/poster-1.jpg','/assets/videos/sample-1.mp4','/assets/hls-demo/sample-1/master.m3u8']){
   const r=await fetch(base+route);assert.ok([401,403].includes(r.status),route+': '+r.status);
  }
  assert.equal((await fetch(base+'/assets/icons/icon-192.png')).status,200);
  assert.ok([401,403].includes((await post('/api/player/qoe',{...metric,videoId})).status),'QoE API must respect private receipt gate');
 }finally{delete process.env.SA_PRIVATE_PREVIEW_REQUIRE_RECEIPT}
});
test('D07 responsive posters actually exist and have useful source sizes',()=>{
 const app=fs.readFileSync(path.join(root,'public/app.js'),'utf8');assert.match(app,/posterSrcset/);
 for(const px of ['320','640']){
  const filepath=path.join(root,'public/assets/posters/poster-1.'+px+'.webp');
  assert.ok(fs.statSync(filepath).size>100,'optimized image missing');
 }
 assert.ok(app.includes('${posterSrcset(v.poster)}')); // poster responsive files are local
});
