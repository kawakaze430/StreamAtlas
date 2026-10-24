/** Read-only provenance checks followed by a transactionally imported synthetic
 * catalog on a newly provisioned LOOPBACK disposable PostgreSQL 16 database.
 * Deliberately refuses any database that already contains catalog records.
 * It NEVER imports identity, sessions, rights evidence or private documents.
 */
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {verifyCatalog} from './pg-catalog-integrity.js';
import {requireDisposableEnv} from './pg-migrations.js';

const tables=['categories','networks','sites','channels','performers','videos','video_categories','video_performers','video_chapters','video_captions'];
const ordering={video_categories:'video_id,category_id',video_performers:'video_id,performer_id',video_chapters:'video_id,start_seconds',video_captions:'video_id'};
const sqlValue=x=>x===null?'NULL':typeof x==='string'?"'"+x.replaceAll("'","''")+"'":Number.isFinite(x)&&typeof x==='number'?String(x):typeof x==='boolean'?(x?'TRUE':'FALSE'):(()=>{throw Error('Unsafe catalog field type')})();
const cliArgs=['-X','-v','ON_ERROR_STOP=1','-A','-t','-q'];
export function pgCatalogCommand(sql,{runner=spawnSync}={}){
 const result=runner('psql',cliArgs,{input:sql,encoding:'utf8',env:process.env,timeout:120000,maxBuffer:150*1024*1024});
 if(result.error||result.status!==0)throw Error('Disposable PostgreSQL operation failed: '+String(result.stderr||result.error?.message||'unknown').slice(0,600));
 return result.stdout.trim();
}
function normalized(row){
 const converted={};
 for(const [key,value] of Object.entries(row)){
  if((key==='last_updated'||key.endsWith('_at'))&&value!==null&&value!==undefined){
   const timestamp=Date.parse(value);
   if(!Number.isFinite(timestamp))throw Error('Invalid timestamp: '+key);
   converted[key]=new Date(timestamp).toISOString();
  }else converted[key]=value;
 }
 return Object.fromEntries(Object.entries(converted).sort(([a],[b])=>a.localeCompare(b)));
}
function rowsInExport(dir,table){
 const data=fs.readFileSync(path.join(dir,table+'.jsonl'));
 if(data.length>120*1024*1024)throw Error('Synthetic catalog file exceeds safe size limit');
 return data.toString('utf8').split('\n').filter(Boolean).map(x=>normalized(JSON.parse(x)));
}
export function importDisposableCatalog(dir,{query=pgCatalogCommand}={}){
 requireDisposableEnv();
 const source=verifyCatalog(dir),rows=Object.fromEntries(tables.map(t=>[t,rowsInExport(dir,t)]));
 if(query('SHOW server_version_num;').trim().match(/^\d+$/)?.[0]===undefined||Number(query('SHOW server_version_num;'))<160000)throw Error('PostgreSQL 16 or newer required');
 // Block use of a shared database even if the CLI environment is accidentally set.
 // These tables must exist from the pre-reviewed migrations and be empty.
 const current=query(tables.map(t=>`SELECT '${t}|' || count(*) FROM "${t}";`).join('\n')).split('\n').filter(Boolean);
 if(current.length!==tables.length||current.some(v=>!tables.some(t=>v===`${t}|0`)))throw Error('Refusing import into nonempty or incomplete disposable catalog');
 const statements=['BEGIN;','SET LOCAL lock_timeout = \'10s\';','SET LOCAL statement_timeout = \'90000ms\';'];
 for(const t of tables){
  for(const row of rows[t]){
   const keys=Object.keys(row);
   if(keys.length===0||keys.some(k=>!/^[a-z_]+$/.test(k)))throw Error('Invalid column names');
   statements.push(`INSERT INTO "${t}" (${keys.map(k=>'"'+k+'"').join(',')}) VALUES (${keys.map(k=>sqlValue(row[k])).join(',')});`);
  }
 }
 for(const t of ['categories','networks','sites','channels','performers','videos'])statements.push(`SELECT setval(pg_get_serial_sequence('"${t}"','id'),GREATEST(COALESCE((SELECT MAX(id) FROM "${t}"),1),1),true);`);
 statements.push('COMMIT;');
 query(statements.join('\n'));
 // Unlike aggregate-only parity, compare EVERY field of every exported row to
 // what PostgreSQL stores, with canonicalized timestamp representation.
 for(const t of tables){
  const lines=query(`SELECT row_to_json(t)::text FROM (SELECT * FROM "${t}" ORDER BY ${ordering[t]||'id'}) t;`);
  const returned=lines?lines.split('\n').map(x=>normalized(JSON.parse(x))):[];
  const expected=rows[t].map(x=>JSON.stringify(x)).sort();
  const actual=returned.map(x=>JSON.stringify(x)).sort();
  if(expected.length!==actual.length||expected.some((x,i)=>x!==actual[i]))throw Error('PostgreSQL row-by-row catalog mismatch: '+t);
 }
 return {verified:true,disposableOnly:true,tableCount:tables.length,rows:source.counts,privateIdentityImported:false,publicCutoverApproved:false};
}
if(process.argv[1]&&path.resolve(process.argv[1])===import.meta.filename){
 try{if(!process.argv[2])throw Error('Usage: node scripts/pg-catalog-import-disposable.js /path/to/synthetic/export');console.log(JSON.stringify(importDisposableCatalog(path.resolve(process.argv[2])),null,2));}
 catch(e){console.error('Disposable catalog import failed: '+e.message);process.exitCode=1;}
}
