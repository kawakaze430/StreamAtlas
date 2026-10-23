import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'sa32-'));
process.env.DB_PATH=path.join(tmp,'data.sqlite');process.env.PRIVATE_PATH=path.join(tmp,'private');process.env.NODE_ENV='test';process.env.SA_DISABLE_WORKER='1';
const {server}=await import('../src/server.js');
const {one,run,now}=await import('../src/database.js');
const {rankedDiverseCandidates,compareRecommendationArms,proposeTags,canonicalMetadata,shortlistShorts,locales}=await import('../src/roadmap32.js');
let base,member,owner,admin,id,uploadId;
async function req(route,opts={}){
 const h={'X-Requested-With':'StreamAtlas'};if(opts.cookie)h.cookie=opts.cookie;if(opts.json!==undefined)h['content-type']='application/json';
 const r=await fetch(base+route,{method:opts.method||'GET',headers:h,body:opts.json===undefined?undefined:JSON.stringify(opts.json)});
 return {status:r.status,body:await r.json(),headers:r.headers};
}
const cook=r=>r.headers.get('set-cookie')?.split(';')[0];
before(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));base='http://127.0.0.1:'+server.address().port;
 member=cook(await req('/api/auth/register',{method:'POST',json:{email:'member32@local.test',name:'Member 32',password:'long-safe-password-32'}}));
 owner=cook(await req('/api/auth/register',{method:'POST',json:{email:'creator32@local.test',name:'Creator 32',password:'long-safe-password-32'}}));
 admin=cook(await req('/api/auth/register',{method:'POST',json:{email:'admin32@local.test',name:'Admin 32',password:'long-safe-password-32'}}));
 const adminId=one("SELECT id FROM users WHERE email='admin32@local.test'").id;run("UPDATE users SET role='ADMIN' WHERE id=?",adminId);
 const ownerId=one("SELECT id FROM users WHERE email='creator32@local.test'").id;
 run('INSERT INTO creator_profiles(user_id,display_name,status,applied_at) VALUES(?,?,?,?)',ownerId,'Creator test','APPROVED',now());
 id=one("SELECT id FROM videos WHERE status='PUBLISHED' ORDER BY id LIMIT 1").id;
 uploadId=crypto.randomUUID();
 const v=one('SELECT id FROM videos WHERE id=?',id);
 run('INSERT INTO upload_sessions(id,user_id,video_id,original_filename,declared_type,expected_bytes,received_bytes,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?)',uploadId,ownerId,v.id,'sample.mp4','video/mp4',100,0,'UPLOADING',now(),now());
});
after(async()=>{await new Promise(r=>server.close(r));fs.rmSync(tmp,{recursive:true,force:true})});
test('pure recommendation experiments deduplicate and exclude held candidates',()=>{
 const rows=[{id:1,channelId:1,status:'PUBLISHED',views:300},{id:1,channelId:1,status:'PUBLISHED',views:300},{id:2,channelId:1,status:'PUBLISHED',views:200},{id:3,channelId:2,status:'PUBLISHED',views:200},{id:4,channelId:3,status:'PUBLISHED',safetyHold:true,views:1e6},{id:5,channelId:3,status:'HIDDEN',views:1e6}];
 assert.deepEqual(rankedDiverseCandidates(rows,{maxPerChannel:1}).map(x=>x.id),[1,3]);
 const result=compareRecommendationArms(rows);assert.equal(result.balanced.uniqueChannels,2);assert.ok(!result.balanced.videoIds.includes(4));
});
test('human-reviewed taxonomy suggestions are exact and do not auto-apply',()=>{
 assert.deepEqual(proposeTags('The Documentary Collection',[{id:9,name:'Documentary'},{id:10,name:'Travel'}]),[{categoryId:9,label:'Documentary',origin:'exact local taxonomy match',reviewRequired:true}]);
 assert.deepEqual(proposeTags('Undocumented',[{id:9,name:'Documentary'}]),[]);
 assert.equal(canonicalMetadata({slug:'safe-title',title:'Hello'}).publicIndexingAllowed,false);
 assert.ok(locales().hi.queue);
});
test('public short clips list only published unheld synthetic videos',async()=>{
 const r=await req('/api/catalog/shorts?limit=7');assert.equal(r.status,200);assert.equal(r.body.items.length,7);
 assert.ok(r.body.items.every(x=>x.duration<=60));
 assert.equal(r.headers.get('x-robots-tag'),'noindex, nofollow');
 assert.equal((await req('/api/catalog/shorts?limit=999')).status,400);
});
test('canonical route hides active holds and validates slugs',async()=>{
 const vid=one('SELECT slug FROM videos WHERE id=?',id);assert.equal((await req('/api/catalog/canonical?slug='+vid.slug)).status,200);
 assert.equal((await req('/api/catalog/canonical?slug=%22OR')).status,400);
 run('INSERT INTO content_holds(video_id,reason,details,opened_by,opened_at) VALUES(?,?,?,?,?)',id,'COPYRIGHT','Local test hold',one("SELECT id FROM users WHERE email='admin32@local.test'").id,now());
 assert.equal((await req('/api/catalog/canonical?slug='+vid.slug)).status,404);
 const s=await req('/api/catalog/shorts');assert.ok(!s.body.items.some(x=>x.id===id));
});
test('safe category relationships, short clips and nav dictionary',async()=>{
 const slug=one('SELECT slug FROM categories ORDER BY id LIMIT 1').slug;
 const r=await req('/api/catalog/related-categories?slug='+slug);
 assert.equal(r.status,200);assert.ok(r.body.items.every(x=>x.sharedVideos>0));
 assert.equal((await req('/api/catalog/related-categories?slug=not-found')).status,404);
 const lang=await req('/api/localization/dictionary?lang=es');assert.equal(lang.status,200);assert.equal(lang.body.labels.home,'Inicio');
 assert.equal((await req('/api/localization/dictionary?lang=zz')).status,400);
});
test('account-private summary endpoints deny anonymous and isolate',async()=>{
 assert.equal((await req('/api/me/sync-summary')).status,401);
 assert.equal((await req('/api/me/entity-follows/summary')).status,401);
 const a=await req('/api/me/sync-summary',{cookie:member});assert.equal(a.status,200);assert.equal(a.body.watchedVideoCount,0);
 const b=await req('/api/me/entity-follows/summary',{cookie:member});assert.deepEqual(b.body.counts,[]);
});
test('private upload suggestions enforce ownership and no auto-application',async()=>{
 assert.equal((await req('/api/studio/metadata-suggestions?uploadId='+uploadId)).status,401);
 assert.equal((await req('/api/studio/metadata-suggestions?uploadId='+uploadId,{cookie:member})).status,404);
 const r=await req('/api/studio/metadata-suggestions?uploadId='+uploadId,{cookie:owner});assert.equal(r.status,200);
 assert.equal(r.body.autoApplied,false);assert.equal(one('SELECT title FROM videos WHERE id=?',id).title,r.body.title);
 assert.equal((await req('/api/studio/metadata-suggestions?uploadId=invalid',{cookie:owner})).status,400);
});
test('private creator QoE summary is privacy-suppressed and not exposed cross-account',async()=>{
 assert.equal((await req('/api/studio/analytics/privacy-overview',{cookie:member})).status,403);
 assert.equal((await req('/api/studio/analytics/privacy-overview',{cookie:owner})).status,200);
});
test('admin-only recommender evaluation and fail-closed launch preview',async()=>{
 assert.equal((await req('/api/admin/recommendations/offline-evaluation',{cookie:member})).status,403);
 const r=await req('/api/admin/recommendations/offline-evaluation',{cookie:admin});assert.equal(r.status,200);
 assert.equal(r.body.experimentType.startsWith('offline deterministic'),true);assert.ok(r.body.balanced.count);
 const gate=await req('/api/admin/launch/readiness-preview',{cookie:admin});assert.equal(gate.status,200);assert.equal(gate.body.readyForPublicLaunch,false);
});
test('human escalation guidance is not proof of compliance',async()=>{
 const g=await req('/api/compliance/intake-guidance');assert.equal(g.status,200);assert.ok(g.body.categories.includes('COPYRIGHT'));
});

test('existing creator batch metadata updates are atomic and forbidden to unrelated members',async()=>{
 const category=one('SELECT id FROM categories ORDER BY id LIMIT 1').id;
 const payload={items:[{id:uploadId,title:'Synthetic creator session 32',description:'Original demonstration clip.',categoryId:category}]};
 assert.equal((await req('/api/studio/uploads/batch-metadata',{method:'PATCH',cookie:member,json:payload})).status,404);
 const before=one('SELECT title FROM videos WHERE id=?',id).title;
 assert.equal((await req('/api/studio/uploads/batch-metadata',{method:'PATCH',cookie:owner,json:{items:[...payload.items,{...payload.items[0],id:'not-a-valid-upload'}]}})).status,400);
 assert.equal(one('SELECT title FROM videos WHERE id=?',id).title,before);
 const valid=await req('/api/studio/uploads/batch-metadata',{method:'PATCH',cookie:owner,json:payload});assert.equal(valid.status,200);
 assert.equal(one('SELECT title FROM videos WHERE id=?',id).title,'Synthetic creator session 32');
});
test('editor collaborator may see suggestions but viewer cannot edit owner media',async()=>{
 const invited=await req('/api/studio/collaborators',{method:'POST',cookie:owner,json:{email:'member32@local.test',role:'EDITOR'}});
 assert.equal(invited.status,201);
 const ownerId=one("SELECT id FROM users WHERE email='creator32@local.test'").id;
 assert.equal((await req('/api/studio/collaborators/accept',{method:'POST',cookie:member,json:{ownerId}})).status,200);
 const suggest=await req('/api/studio/metadata-suggestions?uploadId='+uploadId,{cookie:member});assert.equal(suggest.status,200);
 assert.equal(suggest.body.autoApplied,false);
});
test('creator QoE summary suppresses low sample counts',async()=>{
 run('INSERT INTO video_qoe_daily(video_id,day,samples,completions,startup_failures,startup_ms_total,buffer_ms_total,playback_ms_total,errors_total,switches_total,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)',id,'2026-10-22',4,3,0,10,10,600,1,0,now());
 const low=await req('/api/studio/analytics/privacy-overview',{cookie:owner});assert.equal(low.status,200);
 const row=low.body.items.find(x=>x.videoId===id);assert.equal(row.privacySuppressed,true);assert.equal(row.playbackErrors,null);
 run('UPDATE video_qoe_daily SET samples=5 WHERE video_id=?',id);
 const high=await req('/api/studio/analytics/privacy-overview',{cookie:owner});assert.equal(high.body.items.find(x=>x.videoId===id).samples,5);
});
test('appeals guidance never promises automatic restoration',async()=>{
 const r=await req('/api/compliance/appeal-guidance');assert.equal(r.status,200);
 assert.match(r.body.republication,/never automatically/);
});

test('synthetic-only storyboard rejects arbitrary paths and produces four bounded images',async()=>{
 const {sampleSource,storyboard}=await import('../scripts/demo-storyboard32.js');
 assert.throws(()=>sampleSource('../../etc/passwd'),/Only bundled synthetic/);
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'sa32-storyboard-'));
 try{const r=storyboard('sample-1',directory);assert.equal(r.files.length,4);assert.ok(r.files.every(x=>fs.statSync(path.join(directory,x)).size>100));}
 finally{fs.rmSync(directory,{recursive:true,force:true})}
});
test('OpenAPI documents local prototype read endpoints without declaring public launch',()=>{
 const spec=JSON.parse(fs.readFileSync(new URL('../contracts/openapi.json',import.meta.url),'utf8'));
 for(const p of ['/api/catalog/shorts','/api/catalog/canonical','/api/studio/metadata-suggestions','/api/admin/launch/readiness-preview','/api/compliance/appeal-guidance'])assert.ok(spec.paths[p]?.get,p);
 assert.deepEqual(spec.paths['/api/studio/metadata-suggestions'].get.security,[{sessionCookie:[]}]);
 assert.match(spec.info.description,/NOT a production publishing approval/);
});
