import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'streamatlas-cp23-'));
process.env.DB_PATH=path.join(tmp,'test.sqlite');process.env.PRIVATE_PATH=path.join(tmp,'media');process.env.NODE_ENV='test';
const {server}=await import('../src/server.js');
const {one,run}=await import('../src/database.js');
let base,alice,bob,videoIds;
async function request(endpoint,{method='GET',cookie,body}={}){
 const headers={'X-Requested-With':'StreamAtlas'};if(cookie)headers.Cookie=cookie;if(body!==undefined)headers['Content-Type']='application/json';
 const res=await fetch(base+endpoint,{method,headers,body:body===undefined?undefined:JSON.stringify(body)});
 return {status:res.status,body:await res.json()};
}
const post=(p,body,cookie)=>request(p,{method:'POST',body,cookie});
const patch=(p,body,cookie)=>request(p,{method:'PATCH',body,cookie});
const del=(p,cookie)=>request(p,{method:'DELETE',cookie});
before(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));base=`http://127.0.0.1:${server.address().port}`;
 const make=async(name,email)=>{const headers={'Content-Type':'application/json','X-Requested-With':'StreamAtlas'};const res=await fetch(base+'/api/auth/register',{method:'POST',headers,body:JSON.stringify({name,email,password:'long-demo-password-4321'})});assert.equal(res.status,201);return res.headers.get('set-cookie').split(';')[0]};
 alice=await make('Test Alice','alice23@example.test');bob=await make('Test Bob','bob23@example.test');
 videoIds=(await request('/api/videos?limit=5')).body.items.map(v=>v.id);
});
after(async()=>{await new Promise(r=>server.close(r));fs.rmSync(tmp,{recursive:true,force:true})});

test('CP23 queue: authentication, insert/dedupe, visibility, stable ordering, delete and clear',async()=>{
 assert.equal((await request('/api/me/queue')).status,401);
 const [a,b,c]=videoIds;
 assert.equal((await post('/api/me/queue',{videoId:a},alice)).status,201);
 assert.equal((await post('/api/me/queue',{videoId:a},alice)).body.added,false);
 await post('/api/me/queue',{videoId:b},alice);await post('/api/me/queue',{videoId:c},alice);
 assert.deepEqual((await request('/api/me/queue',{cookie:alice})).body.items.map(v=>v.id),[a,b,c]);
 assert.deepEqual((await request('/api/me/queue',{cookie:bob})).body.items,[]);
 assert.equal((await patch('/api/me/queue/order',{videoIds:[c,a,b]},alice)).status,200);
 assert.deepEqual((await request('/api/me/queue',{cookie:alice})).body.items.map(v=>v.id),[c,a,b]);
 assert.equal((await patch('/api/me/queue/order',{videoIds:[a,a,b]},alice)).status,400);
 assert.equal((await patch('/api/me/queue/order',{videoIds:[a,b]},alice)).status,409);
 assert.equal((await del('/api/me/queue/'+b,bob)).body.removed,0);
 assert.equal((await del('/api/me/queue/'+a,alice)).body.removed,1);
 assert.equal((await del('/api/me/queue',alice)).body.removed,2);
});
test('CP23 queue rejects unpublished items and omits videos hidden after being saved',async()=>{
 const id=videoIds[3];await post('/api/me/queue',{videoId:id},alice);
 run("UPDATE videos SET status='HIDDEN' WHERE id=?",id);
 assert.equal((await post('/api/me/queue',{videoId:id},bob)).status,404);
 assert.deepEqual((await request('/api/me/queue',{cookie:alice})).body.items,[]);
 assert.equal((await patch('/api/me/queue/order',{videoIds:[]},alice)).status,200);
 run("UPDATE videos SET status='PUBLISHED' WHERE id=?",id);
 await del('/api/me/queue',alice);
});
test('CP23 playlists are private, sortable and survive additional inserts',async()=>{
 const [a,b,c]=videoIds;const made=await post('/api/me/playlists',{name:'Queue favorites'},alice);assert.equal(made.status,201);const id=made.body.id;
 assert.equal((await post('/api/me/playlists/items',{playlistId:id,videoId:a},alice)).status,200);
 await post('/api/me/playlists/items',{playlistId:id,videoId:b},alice);
 await post('/api/me/playlists/items',{playlistId:id,videoId:c},alice);
 assert.deepEqual((await request('/api/me/playlists/'+id,{cookie:alice})).body.items.map(v=>v.id),[a,b,c]);
 assert.equal((await patch(`/api/me/playlists/${id}/order`,{videoIds:[c,b,a]},bob)).status,404);
 assert.equal((await patch(`/api/me/playlists/${id}/order`,{videoIds:[a,a,c]},alice)).status,400);
 assert.equal((await patch(`/api/me/playlists/${id}/order`,{videoIds:[c,b,a]},alice)).status,200);
 assert.deepEqual((await request('/api/me/playlists/'+id,{cookie:alice})).body.items.map(v=>v.id),[c,b,a]);
 assert.equal((await post('/api/me/playlists/items',{playlistId:id,videoId:a},alice)).status,200);
 assert.deepEqual((await request('/api/me/playlists/'+id,{cookie:alice})).body.items.map(v=>v.id),[c,b,a]);
});
test('CP23 subscription notifications allow per-channel opt out without unsubscribing',async()=>{
 const channel=one('SELECT id FROM channels ORDER BY id LIMIT 1').id;
 await post('/api/me/subscriptions/toggle',{channelId:channel},alice);
 const list=(await request('/api/me/subscriptions',{cookie:alice})).body.items;
 assert.equal(list[0].notify,1);
 assert.equal((await patch('/api/me/subscriptions/'+channel+'/notifications',{enabled:false},alice)).status,200);
 assert.equal((await patch('/api/me/subscriptions/'+channel+'/notifications',{enabled:'false'},alice)).status,400);
 assert.equal((await patch('/api/me/subscriptions/'+channel+'/notifications',{enabled:true},bob)).status,404);
 assert.equal((await request('/api/me/subscriptions',{cookie:alice})).body.items[0].notify,0);
 assert.equal((await request('/api/me/feed',{cookie:alice})).status,200);
});
test('CP23 Continue Watching is isolated, excludes completed and hidden videos',async()=>{
 const [id,completed]=videoIds;
 assert.equal((await request('/api/me/continue-watching')).status,401);
 const firstDuration=one('SELECT duration FROM videos WHERE id=?',id).duration;
 await post('/api/me/progress',{videoId:id,position:Math.max(1,Math.min(25,firstDuration/4))},alice);
 const duration=one('SELECT duration FROM videos WHERE id=?',completed).duration;
 await post('/api/me/progress',{videoId:completed,position:duration-1},alice);
 assert.deepEqual((await request('/api/me/continue-watching',{cookie:alice})).body.items.map(v=>v.id),[id]);
 assert.deepEqual((await request('/api/me/continue-watching',{cookie:bob})).body.items,[]);
 run("UPDATE videos SET status='HIDDEN' WHERE id=?",id);
 assert.deepEqual((await request('/api/me/continue-watching',{cookie:alice})).body.items,[]);
 run("UPDATE videos SET status='PUBLISHED' WHERE id=?",id);
});
test('CP23: account JSON export contains private queue and notification settings',async()=>{
 await post('/api/me/queue',{videoId:videoIds[0]},alice);
 const data=(await request('/api/me/export',{cookie:alice})).body;
 assert.ok(Array.isArray(data.watchQueue));assert.ok(data.watchQueue.some(x=>x.videoId===videoIds[0]));
 assert.ok(data.subscriptions.some(x=>x.notify===0));
 assert.equal((await request('/api/me/export')).status,401);
});
