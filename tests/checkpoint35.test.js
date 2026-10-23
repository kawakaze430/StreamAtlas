import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'sa35-'));
process.env.NODE_ENV='test';process.env.SA_DISABLE_WORKER='1';process.env.DB_PATH=path.join(dir,'test.db');process.env.PRIVATE_PATH=path.join(dir,'private');
const {server}=await import('../src/server.js');
const {one,run,now}=await import('../src/database.js');
const {recoverUploads}=await import('../src/uploads.js');
let base,creator,other,creatorId,categoryId;
async function req(route,{method='GET',cookie,body}={}){
 const h={'X-Requested-With':'StreamAtlas'};if(cookie)h.Cookie=cookie;if(body!==undefined)h['Content-Type']='application/json';
 const r=await fetch(base+route,{method,headers:h,body:body===undefined?undefined:JSON.stringify(body)});
 return {status:r.status,body:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};
}
const draft=(name='Test scene')=>({title:'Original '+name+' recording',filename:name.replaceAll(' ','-')+'.mp4',size:2500,mime:'video/mp4',categoryId,rightsDeclaration:true,adultsDeclaration:true,consentDeclaration:true});
before(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));base=`http://127.0.0.1:${server.address().port}`;
 creator=(await req('/api/auth/register',{method:'POST',body:{email:'owner35@local.test',name:'Uploader 35',password:'check-long-password-35'}})).cookie;
 other=(await req('/api/auth/register',{method:'POST',body:{email:'other35@local.test',name:'Outsider 35',password:'check-long-password-35'}})).cookie;
 creatorId=one("SELECT id FROM users WHERE email='owner35@local.test'").id;
 const site=run('INSERT INTO sites(name,slug,last_updated) VALUES(?,?,?)','Synthetic QA','qa35-'+Date.now(),now());
 const channel=run('INSERT INTO channels(site_id,name,slug) VALUES(?,?,?)',Number(site.lastInsertRowid),'CreatorQA','qa-ch35-'+Date.now());
 run('INSERT INTO creator_profiles(user_id,display_name,status,applied_at,channel_id) VALUES(?,?,?,?,?)',creatorId,'Creator QA 35','APPROVED',now(),Number(channel.lastInsertRowid));
 categoryId=one('SELECT id FROM categories ORDER BY id LIMIT 1').id;
});
after(async()=>{await new Promise(resolve=>server.close(resolve));fs.rmSync(dir,{recursive:true,force:true})});
test('batch creation fails closed for anonymous/noncreator and invalid declarations; no partial writes',async()=>{
 assert.equal((await req('/api/studio/uploads/bulk-initiate',{method:'POST',body:{items:[draft('a'),draft('b')]}})).status,401);
 assert.equal((await req('/api/studio/uploads/bulk-initiate',{method:'POST',cookie:other,body:{items:[draft('a'),draft('b')]}})).status,403);
 const beforeCount=one('SELECT COUNT(*) AS n FROM upload_sessions WHERE user_id=?',creatorId).n;
 for(const items of [[draft('a'),{...draft('b'),consentDeclaration:false}],[draft('a'),draft('a')]]){
  const r=await req('/api/studio/uploads/bulk-initiate',{method:'POST',cookie:creator,body:{items}});assert.equal(r.status,400);
 }
 assert.equal(one('SELECT COUNT(*) AS n FROM upload_sessions WHERE user_id=?',creatorId).n,beforeCount);
});
test('batch drafts remain private and obey exact per-owner limit',async()=>{
 const r=await req('/api/studio/uploads/bulk-initiate',{method:'POST',cookie:creator,body:{items:[draft('scene a'),draft('scene b')]}});
 assert.equal(r.status,201);assert.equal(r.body.items.length,2);assert.equal(r.body.private,true);
 for(const x of r.body.items){
  assert.equal(one('SELECT status FROM videos WHERE id=?',x.videoId).status,'DRAFT');
  assert.equal((await req('/api/videos/'+x.slug)).status,404);
  assert.equal((await req('/api/studio/uploads/'+x.id,{cookie:other})).status,404);
 }
 const cap=await req('/api/studio/uploads/bulk-initiate',{method:'POST',cookie:creator,body:{items:[draft('scene c'),draft('scene d'),draft('scene e'),draft('scene f')]}});assert.equal(cap.status,429);
});
test('existing atomic bulk metadata cannot change other owners or corrupt earlier updates',async()=>{
 const ids=await req('/api/studio/overview',{cookie:creator});const [a,b]=ids.body.items;
 const clean={id:a.id,title:'Safe edited studio title',description:'Changed in one transaction',categoryId};
 assert.equal((await req('/api/studio/uploads/batch-metadata',{method:'PATCH',cookie:other,body:{items:[clean]}})).status,404);
 const initial=one('SELECT title FROM videos WHERE id=?',a.videoId).title;
 const r=await req('/api/studio/uploads/batch-metadata',{method:'PATCH',cookie:creator,body:{items:[clean,{id:b.id,title:'x',description:'Bad item',categoryId}]}});
 assert.equal(r.status,400);assert.equal(one('SELECT title FROM videos WHERE id=?',a.videoId).title,initial);
 const good=await req('/api/studio/uploads/batch-metadata',{method:'PATCH',cookie:creator,body:{items:[clean,{...clean,id:b.id,title:'Another edited studio title'}]}});
 assert.equal(good.status,200);assert.equal(good.body.updated,2);
});
test('recovery dead-letters exhausted processing attempts and does not publish',()=>{
 const item=one('SELECT id,video_id FROM upload_sessions WHERE user_id=? ORDER BY created_at LIMIT 1',creatorId);
 run("UPDATE upload_sessions SET status='PROCESSING',attempts=2 WHERE id=?",item.id);
 const summary=recoverUploads();assert.ok(summary.deadLettered>=1);
 assert.equal(one('SELECT status FROM upload_sessions WHERE id=?',item.id).status,'FAILED');
 assert.equal(one('SELECT status FROM videos WHERE id=?',item.video_id).status,'FAILED');
 assert.equal(one('SELECT attempt_count FROM processing_dead_letters WHERE upload_id=?',item.id).attempt_count,2);
 assert.equal(recoverUploads().deadLettered,0);
});
test('optional category profile is private, validated, synced and reversible',async()=>{
 assert.equal((await req('/api/me/category-preferences')).status,401);
 assert.deepEqual((await req('/api/me/category-preferences',{cookie:creator})).body.categoryIds,[]);
 assert.equal((await req('/api/me/category-preferences',{method:'PUT',cookie:creator,body:{categoryIds:[categoryId,categoryId]}})).status,400);
 assert.equal((await req('/api/me/category-preferences',{method:'PUT',cookie:creator,body:{categoryIds:[999999]}})).status,400);
 assert.equal((await req('/api/me/category-preferences',{method:'PUT',cookie:creator,body:{categoryIds:[categoryId]}})).status,200);
 assert.deepEqual((await req('/api/me/category-preferences',{cookie:creator})).body.categoryIds,[categoryId]);
 assert.deepEqual((await req('/api/me/category-preferences',{cookie:other})).body.categoryIds,[]);
 assert.ok((await req('/api/me/recommendations',{cookie:creator})).body.items.length>0);
 const clear=await req('/api/me/category-preferences',{method:'PUT',cookie:creator,body:{categoryIds:[]}});
 assert.equal(clear.status,200);assert.deepEqual((await req('/api/me/category-preferences',{cookie:creator})).body.categoryIds,[]);
});
