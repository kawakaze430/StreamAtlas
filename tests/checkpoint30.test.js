import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {rankSuggestions} from '../src/suggestion-ranking.js';
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'sa-cp30-'));
process.env.DB_PATH=path.join(tmp,'test.sqlite');process.env.PRIVATE_PATH=path.join(tmp,'private');process.env.NODE_ENV='test';process.env.SA_SEARCH_CURSOR_SECRET='search-test-secret-for-checkpoint-30-very-long';
const {server}=await import('../src/server.js');const {one,run}=await import('../src/database.js');
let base;
const req=async route=>{const response=await fetch(base+route);return {status:response.status,data:await response.json()}};
before(async()=>{await new Promise(ok=>server.listen(0,'127.0.0.1',ok));base='http://127.0.0.1:'+server.address().port;});
after(async()=>{await new Promise(ok=>server.close(ok));fs.rmSync(tmp,{recursive:true,force:true});});
test('D03 autocomplete ranks prefix above substring and provides safe highlight offsets',()=>{
 const rows=rankSuggestions([{id:1,name:'Mature Demo',videoCount:25},{id:2,name:'Demo Universe',videoCount:2},{id:3,name:'Demo',videoCount:1},{id:4,name:'Something Else',videoCount:900}], 'demo');
 assert.deepEqual(rows.map(x=>x.id),[3,2,1]);assert.deepEqual(rows[0].matchRanges,[[0,4]]);
 assert.deepEqual(rows[2].matchRanges,[[7,11]]);
});
test('D03 real grouped suggestions have bounded ranked categories and safe URL/highlighting',async()=>{
 const r=await req('/api/search/suggest?q=am');assert.equal(r.status,200);
 for(const k of ['videos','categories','channels','performers','sites','networks']){
  assert.ok(Array.isArray(r.data[k]));assert.ok(r.data[k].length<=5);
  for(const x of r.data[k]){assert.ok(Array.isArray(x.matchRanges));assert.ok(['exact','prefix','substring'].includes(x.matchType));assert.ok(x.suggestionScore>0)}
 }
 assert.ok(r.data.categories.some(x=>x.name.toLowerCase().includes('am')));
});
test('D04 advanced multi-entity facets total is consistent with cursor filters',async()=>{
 const unfiltered=await req('/api/search/advanced-facets');assert.equal(unfiltered.status,200);assert.equal(unfiltered.data.total,72);
 for(const key of ['qualities','categories','sites','networks','channels','performers'])assert.ok(Array.isArray(unfiltered.data.facets[key]),key);
 const network=unfiltered.data.facets.networks.find(x=>x.slug);assert.ok(network);
 const filtered=await req('/api/search/advanced-facets?network='+network.slug);assert.equal(filtered.status,200);assert.ok(filtered.data.total>0);
 assert.equal(filtered.data.total,(await req('/api/search/cursor?network='+network.slug+'&limit=50')).data.items.length+(await (async()=>{
  const first=(await req('/api/search/cursor?network='+network.slug+'&limit=50')).data;
  if(!first.nextCursor)return {data:{items:[]}};return req('/api/search/cursor?network='+network.slug+'&limit=50&after='+first.nextCursor)
 })()).data.items.length);
});
test('D04 invalid facets and ranges rejected before SQL',async()=>{
 for(const suffix of ['quality=unknown','network=a%27OR%201%3D1','minDuration=200&maxDuration=100','publishedAfter=2026-02-31','sort=unexpected','badFilter=1']){
  assert.equal((await req('/api/search/advanced-facets?'+suffix)).status,400,suffix);
 }
});
test('D05 signed keyset pagination has no duplicates, preserves order and detects tampering',async()=>{
 let after=null;const seen=new Set();let pages=0;let previous=Infinity;
 do{
  const r=await req('/api/search/cursor?sort=most-viewed&limit=7'+(after?'&after='+encodeURIComponent(after):''));
  assert.equal(r.status,200);for(const item of r.data.items){assert.ok(!seen.has(item.id),'duplicate video '+item.id);seen.add(item.id);assert.ok(item.views<=previous);previous=item.views}
  after=r.data.nextCursor;pages++;assert.ok(pages<20);
 }while(after);
 assert.equal(seen.size,72);
 const a=(await req('/api/search/cursor?limit=3')).data;assert.ok(a.nextCursor);
 const changed=a.nextCursor.slice(0,-5)+'XXXXX';assert.equal((await req('/api/search/cursor?limit=3&after='+encodeURIComponent(changed))).status,400);
 assert.equal((await req('/api/search/cursor?limit=3&quality=HD&after='+encodeURIComponent(a.nextCursor))).status,400);
});
test('D05 held/hidden videos never appear in any cursor or facet result',async()=>{
 const target=one('SELECT id FROM videos WHERE status=? ORDER BY id LIMIT 1','PUBLISHED');
 const baseline=(await req('/api/search/advanced-facets')).data.total;
 run('UPDATE videos SET status=? WHERE id=?','HIDDEN',target.id);
 try{
  const r=await req('/api/search/cursor?limit=50');assert.equal(r.status,200);assert.ok(!r.data.items.some(x=>x.id===target.id));
  assert.equal((await req('/api/search/advanced-facets')).data.total,baseline-1);
 }finally{run('UPDATE videos SET status=? WHERE id=?','PUBLISHED',target.id)}
});
test('D03/D04 safety hold filters an otherwise published video from all public search surfaces',async()=>{
 const video=one("SELECT id,title FROM videos WHERE status='PUBLISHED' ORDER BY id LIMIT 1");
 const actor=Number(run("INSERT INTO users(email,name,created_at) VALUES(?,?,?)",'reviewer30@example.test','Reviewer30',new Date().toISOString()).lastInsertRowid);
 const hold=Number(run("INSERT INTO content_holds(video_id,reason,details,opened_by,opened_at) VALUES(?,?,?,?,?)",video.id,'COPYRIGHT','Synthetic rights review for regression coverage',actor,new Date().toISOString()).lastInsertRowid);
 try{
  const catalog=await req('/api/videos?limit=72');assert.equal(catalog.status,200);assert.ok(!catalog.data.items.some(x=>x.id===video.id));
  const suggestions=await req('/api/search/suggest?q='+encodeURIComponent(video.title.slice(0,5)));assert.equal(suggestions.status,200);assert.ok(!suggestions.data.videos.some(x=>x.id===video.id));
  const listing=await req('/api/search/cursor?limit=50');assert.ok(!listing.data.items.some(x=>x.id===video.id));
  assert.equal((await req('/api/search/advanced-facets')).data.total,71);
 }finally{run('DELETE FROM content_holds WHERE id=?',hold);run('DELETE FROM users WHERE id=?',actor)}
});
