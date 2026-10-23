import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';import fs from 'node:fs';import path from 'node:path';
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'sa31-abuse-'));
process.env.DB_PATH=path.join(tmp,'state.sqlite');process.env.PRIVATE_PATH=path.join(tmp,'media');process.env.NODE_ENV='test';process.env.SA_DISABLE_WORKER='1';
const {server}=await import('../src/server.js');
const {one,run}=await import('../src/database.js');
const {commentSignals,duplicateCandidates}=await import('../src/abuse-review.js');
let base,viewer,admin,videoId;
async function req(endpoint,{method='GET',json,cookie}={}){
 const headers={'X-Requested-With':'StreamAtlas'};
 if(json!==undefined)headers['content-type']='application/json';if(cookie)headers.cookie=cookie;
 const r=await fetch(base+endpoint,{method,headers,body:json===undefined?undefined:JSON.stringify(json)});
 return {status:r.status,headers:r.headers,body:await r.json()};
}
const cookie=r=>r.headers.get('set-cookie')?.split(';')[0];
before(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 base='http://127.0.0.1:'+server.address().port;
 viewer=cookie(await req('/api/auth/register',{method:'POST',json:{name:'Viewer QA',email:'viewer31@example.test',password:'very-good-password-31'}}));
 admin=cookie(await req('/api/auth/register',{method:'POST',json:{name:'Moderator QA',email:'admin31@example.test',password:'very-good-password-31'}}));
 run("UPDATE users SET role='ADMIN' WHERE email='admin31@example.test'");
 videoId=one("SELECT id FROM videos WHERE status='PUBLISHED' ORDER BY id LIMIT 1").id;
});
after(async()=>{await new Promise(resolve=>server.close(resolve));fs.rmSync(tmp,{recursive:true,force:true})});
test('advisory classification is conservative and deterministic',()=>{
 assert.deepEqual(commentSignals('A thoughtful observation.'),[]);
 assert.deepEqual(commentSignals('Visit https://one.test/ and https://two.test/'),['MULTIPLE_LINKS']);
 assert.deepEqual(commentSignals('great demonstration', ['  GREAT    demonstration ']),['REPEATED_MESSAGE']);
 assert.deepEqual(commentSignals('https://single.test only'),[]);
});
test('suspicious comments remain visible until human confirmation and cannot be reviewed by viewers',async()=>{
 const result=await req('/api/comments',{method:'POST',cookie:viewer,json:{videoId,body:'Look at https://one.test/ plus https://two.test/'}});
 assert.equal(result.status,201);const id=result.body.id;
 assert.equal(one('SELECT hidden FROM comments WHERE id=?',id).hidden,0);
 const forbidden=await req('/api/admin/comment-abuse-flags',{cookie:viewer});assert.equal(forbidden.status,403);
 const flags=await req('/api/admin/comment-abuse-flags',{cookie:admin});assert.equal(flags.status,200);
 const flag=flags.body.items.find(x=>x.commentId===id);assert.ok(flag);assert.deepEqual(flag.signals,['MULTIPLE_LINKS']);
 assert.equal((await req(`/api/admin/comment-abuse-flags/${flag.id}/decision`,{method:'PATCH',cookie:viewer,json:{decision:'CONFIRM'}})).status,403);
 assert.equal((await req(`/api/admin/comment-abuse-flags/${flag.id}/decision`,{method:'PATCH',cookie:admin,json:{decision:'DISMISS'}})).status,200);
 assert.equal(one('SELECT hidden FROM comments WHERE id=?',id).hidden,0);
 assert.equal((await req(`/api/admin/comment-abuse-flags/${flag.id}/decision`,{method:'PATCH',cookie:admin,json:{decision:'CONFIRM'}})).status,404);
});
test('confirmed human review hides only the selected comment and records audit',async()=>{
 const msg=await req('/api/comments',{method:'POST',cookie:viewer,json:{videoId,body:'Repeated https://sample1.test/ and https://sample2.test/'}});
 assert.equal(msg.status,201);
 const flag=(await req('/api/admin/comment-abuse-flags',{cookie:admin})).body.items.find(x=>x.commentId===msg.body.id);
 assert.ok(flag);
 assert.equal((await req(`/api/admin/comment-abuse-flags/${flag.id}/decision`,{method:'PATCH',cookie:admin,json:{decision:'CONFIRM'}})).status,200);
 assert.equal(one('SELECT hidden FROM comments WHERE id=?',msg.body.id).hidden,1);
 assert.ok(one('SELECT id FROM moderation_audit WHERE object_type=? AND object_id=?','comment_abuse_flag',String(flag.id)));
});
test('duplicate detection yields advisory cases and never merges a video',async()=>{
 assert.deepEqual(duplicateCandidates([{id:1,title:'My Amazing Sample Video',duration:77},{id:2,title:'MY amazing sample video!',duration:78}]).map(x=>[x.videoA,x.videoB]),[[1,2]]);
 const before=one('SELECT COUNT(*) AS total FROM videos').total;
 const src=one('SELECT * FROM videos WHERE id=?',videoId);
 const insert=run(`INSERT INTO videos(title,slug,site_id,channel_id,poster,media_url,duration,quality,views,likes,dislikes,published_at,status) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)`,src.title,'duplicate-audit-31',src.site_id,src.channel_id,src.poster,src.media_url,src.duration,src.quality,0,0,0,src.published_at,'HIDDEN');
 const secondId=Number(insert.lastInsertRowid);
 assert.equal((await req('/api/admin/catalog/duplicate-candidates',{cookie:viewer})).status,403);
 const r=await req('/api/admin/catalog/duplicate-candidates',{cookie:admin});assert.equal(r.status,200);
 const pair=r.body.items.find(x=>x.videoA===Math.min(videoId,secondId)&&x.videoB===Math.max(videoId,secondId));assert.ok(pair);
 const decide=await req('/api/admin/catalog/duplicate-candidates/decision',{cookie:admin,method:'POST',json:{videoA:pair.videoA,videoB:pair.videoB,decision:'DUPLICATE'}});
 assert.equal(decide.status,201);assert.equal(decide.body.changedMedia,false);
 assert.equal(one('SELECT COUNT(*) AS total FROM videos').total,before+1);
 assert.equal(one('SELECT status FROM videos WHERE id=?',secondId).status,'HIDDEN');
 const again=await req('/api/admin/catalog/duplicate-candidates',{cookie:admin});assert.equal(again.body.items.some(x=>x.videoA===pair.videoA&&x.videoB===pair.videoB),false);
});
