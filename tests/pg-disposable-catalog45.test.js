import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {importDisposableCatalog} from '../scripts/pg-catalog-import-disposable.js';
const project=path.resolve(import.meta.dirname,'..');
const tables=['categories','networks','sites','channels','performers','videos','video_categories','video_performers','video_chapters','video_captions'];
const orig={PGHOST:process.env.PGHOST,PGDATABASE:process.env.PGDATABASE,PGUSER:process.env.PGUSER,SA_PG_DISPOSABLE:process.env.SA_PG_DISPOSABLE};
const fixture=fs.mkdtempSync(path.join(os.tmpdir(),'sa45-pgcatalog-'));
const db=path.join(fixture,'catalog.db'),dir=path.join(fixture,'export');
const ex=spawnSync(process.execPath,['scripts/export-catalog-pg.js',dir],{cwd:project,encoding:'utf8',env:{...process.env,DB_PATH:db,PRIVATE_PATH:path.join(fixture,'private')},timeout:12000});
assert.equal(ex.status,0,ex.stderr);
const sources=Object.fromEntries(tables.map(t=>[t,fs.readFileSync(path.join(dir,t+'.jsonl'),'utf8').split('\n').filter(Boolean).map(JSON.parse)]));
function withDisposable(fn){
 process.env.PGHOST='127.0.0.1';process.env.PGDATABASE='sa_disposable_45';process.env.PGUSER='test';process.env.SA_PG_DISPOSABLE='YES_I_ACCEPT_DATA_LOSS';
 try{return fn()}finally{for(const [k,v] of Object.entries(orig)){if(v===undefined)delete process.env[k];else process.env[k]=v}}
}
const query=(sql)=>{
 if(sql==='SHOW server_version_num;')return '160015';
 if(sql.includes("SELECT 'categories|'"))return tables.map(t=>t+'|0').join('\n');
 if(sql.startsWith('BEGIN;')){assert.match(sql,/INSERT INTO "videos"/);assert.match(sql,/COMMIT;/);return ''}
 const name=sql.match(/FROM "(\w+)" ORDER BY/)?.[1];
 if(name)return sources[name].map(row=>JSON.stringify(row)).join('\n');
 throw Error('Unexpected SQL '+sql.slice(0,90));
};
test('F03: committed PostgreSQL adapter refuses non-disposable hosts before queries',()=>{
 let invoked=false;
 assert.throws(()=>importDisposableCatalog(dir,{query:()=>{invoked=true;return ''}}),/disposable|PGHOST|PGDATABASE|acknowledgment/i);
 assert.equal(invoked,false);
});
test('F03: source catalog exports verify all tables and compare every row against PG canonical fixtures',()=>withDisposable(()=>{
 const result=importDisposableCatalog(dir,{query});
 assert.equal(result.verified,true);assert.equal(result.tableCount,10);
 assert.equal(result.rows.videos,72);assert.equal(result.privateIdentityImported,false);
}));
test('F03: refuses nonempty or incomplete PG catalog without changes',()=>withDisposable(()=>{
 let imports=0;const q=s=>{if(s==='SHOW server_version_num;')return '160015';if(s.includes("SELECT 'categories|'"))return tables.map((t,i)=>t+'|'+(i===0?'1':'0')).join('\n');imports++;return ''};
 assert.throws(()=>importDisposableCatalog(dir,{query:q}),/nonempty or incomplete/);
 assert.equal(imports,0);
}));
test('F03: detects a modified PG row even when counts match',()=>withDisposable(()=>{
 const q=s=>s.includes('FROM "videos" ORDER BY')?sources.videos.map((r,i)=>JSON.stringify(i===0?{...r,views:r.views+1}:r)).join('\n'):query(s);
 assert.throws(()=>importDisposableCatalog(dir,{query:q}),/row-by-row catalog mismatch: videos/);
}));
test('F03: rejects a tampered source before PostgreSQL connection',()=>withDisposable(()=>{
 const p=path.join(dir,'videos.jsonl'),before=fs.readFileSync(p);
 try{fs.appendFileSync(p,'{}\n');assert.throws(()=>importDisposableCatalog(dir,{query:()=>{throw Error('unexpected PG connection')}}),/checksum mismatch/i)}
 finally{fs.writeFileSync(p,before)}
}));
