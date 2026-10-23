import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'sa-cp25-'));
process.env.DB_PATH=path.join(tmp,'db.sqlite');process.env.PRIVATE_PATH=path.join(tmp,'private');process.env.NODE_ENV='test';
const {server}=await import('../src/server.js');
const {one,run}=await import('../src/database.js');
let base,alice,bob,admin,v,cat,uploadId;
async function req(route,{method='GET',cookie,body}={}){
 const headers={'X-Requested-With':'StreamAtlas'};if(cookie)headers.Cookie=cookie;if(body!==undefined)headers['Content-Type']='application/json';
 const res=await fetch(base+route,{method,headers,body:body===undefined?undefined:JSON.stringify(body)});
 return {status:res.status,body:await res.json().catch(()=>null),cookie:res.headers.get('set-cookie')?.split(';')[0]};
}
const post=(p,b,c)=>req(p,{method:'POST',body:b,cookie:c});const patch=(p,b,c)=>req(p,{method:'PATCH',body:b,cookie:c});const del=(p,c)=>req(p,{method:'DELETE',cookie:c});
before(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));base='http://127.0.0.1:'+server.address().port;
 const create=async(name,email)=>{const r=await post('/api/auth/register',{name,email,password:'long-secure-123456'});assert.equal(r.status,201);return r.cookie};
 alice=await create('Alice25','alice25@example.test');bob=await create('Bob25','bob25@example.test');admin=await create('Admin25','admin25@example.test');
 run("UPDATE users SET role='ADMIN' WHERE email=?",'admin25@example.test');
 v=(await req('/api/videos?limit=1')).body.items[0];cat=one('SELECT id,slug,name FROM categories ORDER BY id LIMIT 1');
});
after(async()=>{await new Promise(resolve=>server.close(resolve));fs.rmSync(tmp,{recursive:true,force:true})});

test('D01 unified search provides typed published catalog results',async()=>{
 const r=await req('/api/search?q='+encodeURIComponent(v.title.split(' ')[0]));assert.equal(r.status,200);
 assert.ok(Array.isArray(r.body.videos.items));assert.ok(r.body.videos.items.some(x=>x.id===v.id));
 for(const kind of ['categories','performers','sites','networks','channels'])assert.ok(Array.isArray(r.body.entities[kind]));
});
test('D02 aliases are admin-managed and resolve to canonical names',async()=>{
 assert.equal((await post('/api/admin/search/aliases',{alias:'alias-demo',kind:'categories',targetSlug:cat.slug},alice)).status,403);
 const r=await post('/api/admin/search/aliases',{alias:'alias-demo',kind:'categories',targetSlug:cat.slug},admin);assert.equal(r.status,201);
 assert.equal((await req('/api/search?q=alias-demo')).body.resolvedQuery,cat.name);
 assert.equal((await post('/api/admin/search/aliases',{alias:'alias-demo',kind:'categories',targetSlug:cat.slug},admin)).status,409);
 assert.equal((await del('/api/admin/search/aliases/'+r.body.id,admin)).status,200);
 assert.equal((await req('/api/search?q=alias-demo')).body.aliasApplied,false);
});
test('D03 FTS5 title index supports insert/update and never returns hidden media',async()=>{
 const id=v.id,old=v.title;run('UPDATE videos SET title=? WHERE id=?','UnicornXYZ25 AlphaBeta',id);
 try{
  assert.ok((await req('/api/search/titles?q=UnicornXYZ25')).body.items.some(x=>x.id===id));
  run("UPDATE videos SET status='HIDDEN' WHERE id=?",id);
  assert.ok(!(await req('/api/search/titles?q=UnicornXYZ25')).body.items.some(x=>x.id===id));
 }finally{run('UPDATE videos SET title=?,status=? WHERE id=?',old,'PUBLISHED',id)}
 assert.ok(!(await req('/api/search/titles?q=UnicornXYZ25')).body.items.some(x=>x.id===id));
 assert.equal((await req('/api/search/titles?q='+encodeURIComponent('" OR *'))).status,200);
});
test('D04 search facets include only visible media and use consistent counts',async()=>{
 const r=await req('/api/search/facets');assert.equal(r.status,200);assert.ok(r.body.total>=70);
 assert.ok(r.body.qualities.length>0);assert.ok(r.body.categories.length>0);
 run("UPDATE videos SET status='HIDDEN' WHERE id=?",v.id);
 assert.equal((await req('/api/search/facets')).body.total,r.body.total-1);
 run("UPDATE videos SET status='PUBLISHED' WHERE id=?",v.id);
});
test('D05 bounded stable search pagination and validated sorting',async()=>{
 const a=await req('/api/search/videos?limit=3&page=1&sort=most-viewed');assert.equal(a.status,200);assert.equal(a.body.items.length,3);assert.equal(a.body.nextPage,2);
 const b=await req('/api/search/videos?limit=3&page=2&sort=most-viewed');assert.equal(b.status,200);
 assert.ok(!a.body.items.some(x=>b.body.items.some(y=>x.id===y.id)));
 assert.deepEqual((await req('/api/search/videos?limit=3&page=1&sort=most-viewed')).body.items.map(x=>x.id),a.body.items.map(x=>x.id));
 assert.equal((await req('/api/search/videos?sort=malicious')).status,400);
 assert.equal((await req('/api/search/videos?page=-1')).status,400);
});
test('D06 canonical navigation URLs are relative and encoded',async()=>{
 const r=await req('/api/search?q='+encodeURIComponent('demo & search'));
 assert.equal(r.status,200);assert.ok(r.body.canonicalUrl.startsWith('/search?q='));
 assert.ok(!r.body.canonicalUrl.startsWith('//'));assert.ok(r.body.entities.categories.every(x=>x.canonicalUrl.startsWith('/categories/')));
});
test('D07 duplicates visible only to admin; no automated moderation',async()=>{
 assert.equal((await req('/api/admin/catalog/duplicates',{cookie:alice})).status,403);
 const original=one('SELECT * FROM videos WHERE id=?',v.id);
 const id=Number(run(`INSERT INTO videos(title,slug,site_id,channel_id,poster,media_url,duration,quality,views,likes,dislikes,published_at,status) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)`,
 original.title.toUpperCase()+' ',original.slug+'-duplicate-test',original.site_id,original.channel_id,original.poster,original.media_url,original.duration,original.quality,0,0,0,original.published_at,'HIDDEN').lastInsertRowid);
 const r=await req('/api/admin/catalog/duplicates',{cookie:admin});assert.equal(r.status,200);assert.ok(r.body.groups.some(x=>x.some(y=>y.id===id)));
 assert.equal(one('SELECT status FROM videos WHERE id=?',id).status,'HIDDEN');run('DELETE FROM videos WHERE id=?',id);
});
test('D08 preview endpoint excludes hidden and held media and private playback URLs',async()=>{
 const r=await req('/api/search/previews?ids='+v.id);assert.equal(r.status,200);assert.equal(r.body.items[0].id,v.id);
 assert.equal(r.body.items[0].mediaUrl,undefined);
 run("UPDATE videos SET status='HIDDEN' WHERE id=?",v.id);
 assert.equal((await req('/api/search/previews?ids='+v.id)).body.items.length,0);
 run("UPDATE videos SET status='PUBLISHED' WHERE id=?",v.id);
 assert.equal((await req('/api/search/previews?ids=1,abc')).status,400);
});
test('D09 typo alternatives are bounded and reject punctuation injection',async()=>{
 const r=await req('/api/search/alternatives?q=catgories');assert.equal(r.status,200);assert.ok(Array.isArray(r.body.items));assert.ok(r.body.items.length<=5);
 assert.deepEqual((await req('/api/search/alternatives?q=%3Cscript%3E')).body.items,[]);
});
test('D10 private saved search filters enforce ownership and schema',async()=>{
 assert.equal((await req('/api/me/saved-filters')).status,401);
 const r=await post('/api/me/saved-filters',{name:'Favorite HD',filters:{q:'sample',quality:'HD',sort:'latest'}},alice);assert.equal(r.status,201);
 assert.equal((await req('/api/me/saved-filters',{cookie:alice})).body.items.length,1);
 assert.equal((await req('/api/me/saved-filters',{cookie:bob})).body.items.length,0);
 assert.equal((await post('/api/me/saved-filters',{name:'Bad',filters:{sql:'DROP TABLE'}},alice)).status,400);
 assert.equal((await del('/api/me/saved-filters/'+r.body.id,bob)).status,404);
 assert.equal((await del('/api/me/saved-filters/'+r.body.id,alice)).status,200);
});
test('E01 creator profile bio is private to owner and requires application',async()=>{
 assert.equal((await req('/api/studio/profile',{cookie:alice})).status,403);
 const a=await post('/api/studio/apply',{displayName:'Creator 25',agreePolicies:true},alice);assert.equal(a.status,201);
 assert.equal((await patch('/api/studio/profile',{bio:'Synthetic demo creator bio'},alice)).status,200);
 assert.equal((await req('/api/studio/profile',{cookie:alice})).body.profile.bio,'Synthetic demo creator bio');
 assert.equal((await req('/api/studio/profile',{cookie:bob})).status,403);
 assert.equal((await patch('/api/studio/profile',{bio:'x'.repeat(1001)},alice)).status,400);
});
test('E02 creator insights are private and accurately labeled lifetime counters',async()=>{
 assert.equal((await req('/api/studio/insights',{cookie:bob})).status,403);
 const r=await req('/api/studio/insights',{cookie:alice});assert.equal(r.status,200);
 assert.equal(r.body.period,'lifetime');assert.match(r.body.note,/no daily-view time series/);
 assert.equal(r.body.summary.uploads,0);
});
test('E03 creator upload catalog is paginated and never leaks another account',async()=>{
 const creatorId=one('SELECT id FROM users WHERE email=?','alice25@example.test').id;
 assert.equal((await patch('/api/admin/creators/'+creatorId+'/decision',{decision:'APPROVED',note:'Approved for synthetic testing'},admin)).status,200);
 const created=await post('/api/studio/uploads/initiate',{title:'Synthetic Test Upload for Catalog',size:2048,filename:'synthetic.mp4',mime:'video/mp4',categoryId:cat.id,rightsDeclaration:true,adultsDeclaration:true,consentDeclaration:true},alice);
 assert.equal(created.status,201);uploadId=created.body.id;
 const r=await req('/api/studio/uploads/catalog?limit=1&status=UPLOADING',{cookie:alice});assert.equal(r.status,200);assert.equal(r.body.items[0].id,uploadId);
 assert.equal((await req('/api/studio/uploads/catalog',{cookie:bob})).body.items.length,0);
 assert.equal((await req('/api/studio/uploads/catalog?status=INVALID',{cookie:alice})).status,400);
});
test('E04 readiness is owner-only and never authorizes publication',async()=>{
 assert.equal((await req('/api/studio/uploads/'+uploadId+'/readiness',{cookie:bob})).status,404);
 const r=await req('/api/studio/uploads/'+uploadId+'/readiness',{cookie:alice});assert.equal(r.status,200);
 assert.equal(r.body.readyForPublicRelease,false);assert.equal(r.body.requiresHumanApproval,true);
 assert.equal(r.body.checks.fileReceived,false);assert.equal(r.body.checks.declarationsPresent,true);
});
test('E05 private creator notes persist without entering public metadata',async()=>{
 assert.equal((await patch('/api/studio/uploads/'+uploadId+'/notes',{notes:'Private creator planning note'},bob)).status,404);
 assert.equal((await patch('/api/studio/uploads/'+uploadId+'/notes',{notes:'Private creator planning note'},alice)).status,200);
 assert.equal((await req('/api/studio/uploads/'+uploadId+'/notes',{cookie:alice})).body.notes,'Private creator planning note');
 assert.equal((await req('/api/studio/uploads/'+uploadId+'/notes',{cookie:bob})).status,404);
 assert.equal((await patch('/api/studio/uploads/'+uploadId+'/notes',{notes:'x'.repeat(2001)},alice)).status,400);
});
test('D10 privacy: saved filters export and account closure erase personal filters',async()=>{
 const saved=await post('/api/me/saved-filters',{name:'Erase on closure',filters:{q:'private'}},bob);assert.equal(saved.status,201);
 const exported=await req('/api/me/export',{cookie:bob});assert.equal(exported.status,200);
 assert.ok(exported.body.savedFilters.some(x=>x.name==='Erase on closure'));
 const bobId=one('SELECT id FROM users WHERE email=?','bob25@example.test').id;
 assert.equal((await post('/api/me/close-account',{password:'long-secure-123456'},bob)).status,200);
 assert.equal(one('SELECT COUNT(*) AS n FROM saved_search_filters WHERE user_id=?',bobId).n,0);
 assert.equal((await req('/api/me/saved-filters',{cookie:bob})).status,401);
});
test('D01 private-preview receipt gate applies to all new public search routes',async()=>{
 process.env.SA_PRIVATE_PREVIEW_REQUIRE_RECEIPT='1';
 try{
  for(const p of ['/api/search?q=test','/api/search/videos?q=test','/api/search/titles?q=test','/api/search/facets?q=test','/api/search/alternatives?q=test','/api/search/previews?ids=1']){
   assert.equal((await req(p)).status,401,p);
   assert.equal((await req(p,{cookie:alice})).status,403,p);
  }
 }finally{delete process.env.SA_PRIVATE_PREVIEW_REQUIRE_RECEIPT}
});
test('D03 autocomplete resolves aliases and ranks grouped suggestions',async()=>{
 const r=await post('/api/admin/search/aliases',{alias:'my-synthetic-alias',kind:'categories',targetSlug:cat.slug},admin);assert.equal(r.status,201);
 const suggest=await req('/api/search/suggest?q=my-synthetic-alias');assert.equal(suggest.status,200);
 assert.equal(suggest.body.resolvedQuery,cat.name);assert.equal(suggest.body.aliasApplied,true);
 assert.ok(suggest.body.categories.some(x=>x.slug===cat.slug));assert.ok(Array.isArray(suggest.body.alternatives));
 assert.equal((await del('/api/admin/search/aliases/'+r.body.id,admin)).status,200);
});
test('D04 publication date filters validate ranges and bound results',async()=>{
 assert.equal((await req('/api/videos?publishedAfter=2026-02-31')).status,400);
 assert.equal((await req('/api/videos?publishedAfter=2026-10-22&publishedBefore=2026-01-01')).status,400);
 assert.equal((await req('/api/videos?publishedAfter=2000-01-01')).status,200);
 assert.equal((await req('/api/search?publishedBefore=2000-01-01')).body.videos.total,0);
});
test('D05 keyset cursor is stable, filter-bound and rejects malformed cursors',async()=>{
 const a=await req('/api/search/cursor?limit=4&sort=latest');assert.equal(a.status,200);assert.equal(a.body.items.length,4);assert.ok(a.body.nextCursor);
 const b=await req('/api/search/cursor?limit=4&sort=latest&after='+encodeURIComponent(a.body.nextCursor));assert.equal(b.status,200);
 assert.ok(!a.body.items.some(x=>b.body.items.some(y=>x.id===y.id)));
 assert.equal((await req('/api/search/cursor?limit=4&sort=most-viewed&after='+encodeURIComponent(a.body.nextCursor))).status,400);
 assert.equal((await req('/api/search/cursor?after=%22OR%201%3D1')).status,400);
});
test('D06 private development robots and manifest are served with correct MIME',async()=>{
 const robots=await fetch(base+'/robots.txt');assert.equal(robots.status,200);assert.match(await robots.text(),/Disallow: \/$/m);
 const sitemap=await fetch(base+'/sitemap.xml');assert.equal(sitemap.status,200);assert.match(await sitemap.text(),/urlset/);
 const manifest=await fetch(base+'/manifest.webmanifest');assert.equal(manifest.status,200);assert.match(manifest.headers.get('content-type'),/manifest\+json/);
 const index=await fetch(base+'/');assert.match(await index.text(),/noindex, nofollow/);
});
test('D07 synthetic-only preview frames and lazy-loading metadata',async()=>{
 const list=(await req('/api/videos?limit=72')).body.items;
 assert.ok(list.some(x=>x.previewFrame?.startsWith('/assets/hls-demo/')));
 const html=fs.readFileSync(new URL('../public/app.js',import.meta.url),'utf8');assert.match(html,/data-preview=/);assert.match(html,/loading="lazy"/);
 assert.ok(!list.some(x=>x.previewFrame?.startsWith('/api/media/')));
});
test('D08 entity follows are owner-only and limited to visible catalog entries',async()=>{
 const site=one("SELECT s.id FROM sites s JOIN videos v ON v.site_id=s.id AND v.status='PUBLISHED' LIMIT 1");assert.ok(site);
 assert.equal((await post('/api/me/entity-follows',{kind:'sites',entityId:site.id},alice)).status,200);
 assert.equal((await req('/api/me/entity-follows',{cookie:alice})).body.items.length,1);
 assert.equal((await req('/api/me/entity-follows',{cookie:admin})).body.items.length,0);
 assert.equal((await post('/api/me/entity-follows',{kind:'users',entityId:1},alice)).status,400);
 assert.equal((await del('/api/me/entity-follows/sites/'+site.id,admin)).status,404);
 assert.equal((await del('/api/me/entity-follows/sites/'+site.id,alice)).status,200);
});
