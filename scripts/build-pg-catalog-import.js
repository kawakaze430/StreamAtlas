import {verifyCatalog} from './pg-catalog-integrity.js';
/** Generate reviewed PostgreSQL catalog INSERT script from SHA-verified JSONL.
 * No live DB connection is required. Only whitelisted public catalog tables.
 * The output can be inspected and then applied with psql manually.
 */
import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';
const input=path.resolve(process.argv[2]||'data/catalog-export');
verifyCatalog(input);
const output=path.resolve(process.argv[3]||'data/catalog-import.pg.sql');
if(output.startsWith(path.resolve('public')+path.sep))throw Error('Do not expose SQL export in public/');
const expected=['categories','networks','sites','channels','performers','videos','video_categories','video_performers','video_chapters','video_captions'];
const meta=JSON.parse(fs.readFileSync(path.join(input,'manifest.json'),'utf8'));
if(meta.format!=='StreamAtlas catalog export 1'||Object.keys(meta.tables).sort().join('|')!==expected.slice().sort().join('|'))throw Error('Unsupported or incomplete catalog manifest');
const quoted=v=>v===null?'NULL':typeof v==='number'?(Number.isFinite(v)?String(v):(()=>{throw Error('Invalid number')})()):typeof v==='string'?"'"+v.replaceAll("'","''")+"'":typeof v==='boolean'?(v?'TRUE':'FALSE'):(()=>{throw Error('Unsupported value type')})();
let sql=['-- StreamAtlas catalog-only import from SHA256-verified export','-- Review before applying to a disposable PostgreSQL database','BEGIN;'];
const counts={};
for(const table of expected){
 const file=fs.readFileSync(path.join(input,table+'.jsonl'));
 const digest=crypto.createHash('sha256').update(file).digest('hex');
 if(digest!==meta.tables[table].sha256)throw Error('Export checksum mismatch: '+table);
 const rows=file.toString('utf8').trim().split('\n').filter(Boolean).map(s=>JSON.parse(s));
 if(rows.length!==meta.tables[table].rows)throw Error('Export count mismatch: '+table);
 counts[table]=rows.length;
 for(const row of rows){
  const keys=Object.keys(row);
  if(keys.length<1||keys.some(x=>!/^[a-z_]+$/.test(x)))throw Error('Invalid catalog column names');
  const cols=keys.map(x=>'"'+x+'"').join(',');
  sql.push(`INSERT INTO "${table}" (${cols}) VALUES (${keys.map(x=>quoted(row[x])).join(',')});`);
 }
}
for(const table of ['categories','networks','sites','channels','performers','videos']){
 sql.push(`SELECT setval(pg_get_serial_sequence('"${table}"','id'),GREATEST(COALESCE((SELECT MAX(id) FROM "${table}"),1),1),true);`);
}
sql.push('COMMIT;');
fs.mkdirSync(path.dirname(output),{recursive:true,mode:0o700});
fs.writeFileSync(output,sql.join('\n')+'\n',{mode:0o600});
console.log(JSON.stringify({output,counts,sha256:crypto.createHash('sha256').update(fs.readFileSync(output)).digest('hex')}));
