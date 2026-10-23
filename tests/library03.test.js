import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'sa-library03-'));
process.env.DB_PATH=path.join(tmp,'data.db');process.env.PRIVATE_PATH=path.join(tmp,'media');process.env.NODE_ENV='test';
const {server}=await import('../src/server.js');
let base,cookie1,cookie2,otherCookie,playlistId,videoId;
async function request(p,{method='GET',cookie,json}={}){
 const hs={'X-Requested-With':'StreamAtlas'};if(cookie)hs.Cookie=cookie;if(json!==undefined)hs['Content-Type']='application/json';
 const response=await fetch(base+p,{method,headers:hs,body:json!==undefined?JSON.stringify(json):undefined});
 return {status:response.status,data:await response.json(),headers:response.headers};
}
const post=(p,json,cookie)=>request(p,{method:'POST',json,cookie});
const cookie=r=>r.headers.get('set-cookie')?.split(';')[0];
before(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));base=`http://127.0.0.1:${server.address().port}`});
after(async()=>{await new Promise(r=>server.close(r));fs.rmSync(tmp,{recursive:true,force:true})});

test('checkpoint 03 account sessions: list, protect current, revoke prior, revoke others',async()=>{
 const user={name:'Member Library',email:'member-library@example.test',password:'sufficient-password-123'};
 const first=await post('/api/auth/register',user);assert.equal(first.status,201);cookie1=cookie(first);
 const second=await post('/api/auth/login',{email:user.email,password:user.password});assert.equal(second.status,200);cookie2=cookie(second);
 const stranger=await post('/api/auth/register',{name:'Member Other',email:'other-library@example.test',password:'different-password-123'});otherCookie=cookie(stranger);
 let r=await request('/api/me/sessions',{cookie:cookie2});assert.equal(r.status,200);assert.equal(r.data.items.length,2);
 const current=r.data.items.find(s=>s.current),previous=r.data.items.find(s=>!s.current);assert.ok(current&&previous);
 assert.equal((await post('/api/me/sessions/revoke',{id:current.id},cookie2)).status,409);
 assert.equal((await post('/api/me/sessions/revoke',{id:previous.id},otherCookie)).status,404);
 assert.equal((await post('/api/me/sessions/revoke',{id:previous.id},cookie2)).status,200);
 assert.equal((await request('/api/me/sessions',{cookie:cookie1})).status,401);
 r=await request('/api/me/sessions',{cookie:cookie2});assert.equal(r.data.items.length,1);
 const again=await post('/api/auth/login',{email:user.email,password:user.password});cookie1=cookie(again);
 assert.equal((await post('/api/me/sessions/revoke-others',{},cookie2)).data.removed,1);
 assert.equal((await request('/api/me/sessions',{cookie:cookie1})).status,401);
});
test('checkpoint 03: playlist rename, item removal and cross-account protection',async()=>{
 const videos=await request('/api/videos?limit=2');assert.equal(videos.status,200);videoId=videos.data.items[0].id;
 const made=await post('/api/me/playlists',{name:'Old playlist'},cookie2);playlistId=made.data.id;
 let r=await request('/api/me/playlists/'+playlistId,{method:'PATCH',cookie:otherCookie,json:{name:'Stolen'}});assert.equal(r.status,404);
 r=await request('/api/me/playlists/'+playlistId,{method:'PATCH',cookie:cookie2,json:{name:'Renamed samples'}});assert.equal(r.status,200);
 r=await post('/api/me/playlists/items',{playlistId,videoId},cookie2);assert.equal(r.status,200);
 r=await request('/api/me/playlists/'+playlistId,{cookie:cookie2});assert.equal(r.data.playlist.name,'Renamed samples');assert.equal(r.data.items.length,1);
 r=await request(`/api/me/playlists/${playlistId}/videos/${videoId}`,{method:'DELETE',cookie:otherCookie});assert.equal(r.status,404);
 r=await request(`/api/me/playlists/${playlistId}/videos/${videoId}`,{method:'DELETE',cookie:cookie2});assert.equal(r.status,200);
 assert.equal((await request('/api/me/playlists/'+playlistId,{cookie:cookie2})).data.items.length,0);
});
test('checkpoint 03: remove a single video from watch history',async()=>{
 let r=await post('/api/me/progress',{videoId,position:2.5},cookie2);assert.equal(r.status,200);
 r=await request('/api/me/history',{cookie:cookie2});assert.ok(r.data.items.some(x=>x.id===videoId));
 r=await request('/api/me/history/'+videoId,{method:'DELETE',cookie:otherCookie});assert.equal(r.status,200);assert.equal(r.data.removed,0);
 r=await request('/api/me/history/'+videoId,{method:'DELETE',cookie:cookie2});assert.equal(r.status,200);assert.equal(r.data.removed,1);
 assert.ok(!(await request('/api/me/history',{cookie:cookie2})).data.items.some(x=>x.id===videoId));
});
