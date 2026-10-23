/** Read-only SQLite -> PostgreSQL migration DDL coverage audit.
 * Reports schema names and counts only, never reads account rows or secrets.
 */
import fs from 'node:fs';
import path from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dir=path.join(root,'migrations/postgresql');
function tableBodies(sql){
 const out=[];const re=/CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+"?([a-z_][a-z_0-9]*)"?\s*\(/ig;
 for(const m of sql.matchAll(re)){
  let depth=1,quote='',i=m.index+m[0].length,start=i;
  for(;i<sql.length;i++){
   const c=sql[i];
   if(quote){if(c===quote){if(sql[i+1]===quote){i++;}else quote='';}continue;}
   if(c==="'"||c==='"'){quote=c;continue;}
   if(c==='(')depth++;
   if(c===')'&&!--depth)break;
  }
  if(depth!==0)throw Error('Unbalanced CREATE TABLE: '+m[1]);
  out.push({table:m[1],body:sql.slice(start,i)});
 }
 return out;
}
function columns(body){
 const out=[];let depth=0,quote='',start=0;const chunks=[];
 for(let i=0;i<body.length;i++){
  const c=body[i];if(quote){if(c===quote){if(body[i+1]===quote)i++;else quote='';}continue;}
  if(c==="'"||c==='"'){quote=c;continue;}
  if(c==='(')depth++;else if(c===')')depth--;
  if(c===','&&depth===0){chunks.push(body.slice(start,i));start=i+1;}
 }
 chunks.push(body.slice(start));
 for(const chunk of chunks){const m=chunk.trim().match(/^"?([a-z_][a-z_0-9]*)"?\s+(?:BIGINT|INTEGER|INT|TEXT|UUID|TIMESTAMPTZ|TIMESTAMP|DATE|BOOLEAN|JSONB|DOUBLE|CHAR|VARCHAR|REAL|NUMERIC|BYTEA)\b/i);if(m)out.push(m[1]);}
 return out;
}
export function pgColumns(sql){
 const out=new Map();for(const {table,body} of tableBodies(sql)){if(out.has(table))throw Error('Duplicate PG CREATE TABLE: '+table);out.set(table,new Set(columns(body)));}
 for(const m of sql.matchAll(/ALTER\s+TABLE\s+"?([a-z_][a-z_0-9]*)"?\s+ADD\s+COLUMN\s+(?:IF\s+NOT\s+EXISTS\s+)?"?([a-z_][a-z_0-9]*)"?/ig))out.get(m[1])?.add(m[2]);
 return out;
}
export function inspectSchema(dbPath){
 if(!fs.existsSync(dbPath))throw Error('SQLite snapshot missing; provide --sqlite /path/to/disposable.db');
 const db=new DatabaseSync(dbPath,{readOnly:true});
 try{
  const sqliteTables=db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE 'video_title_fts%' ORDER BY name").all().map(r=>r.name);
  const pg=pgColumns(fs.readdirSync(dir).filter(x=>/^\d{3}_.*\.sql$/.test(x)).sort().map(x=>fs.readFileSync(path.join(dir,x),'utf8')).join('\n'));
  const missingTables=sqliteTables.filter(t=>!pg.has(t));
  const missingColumns={};const mapped={};
  for(const table of sqliteTables){
   const sqliteCols=db.prepare(`PRAGMA table_info("${table}")`).all().map(r=>r.name);
   const pgCols=pg.get(table)||new Set();const missing=sqliteCols.filter(x=>!pgCols.has(x));
   if(missing.length)missingColumns[table]=missing;
   mapped[table]={sqliteColumns:sqliteCols.length,postgresColumns:pgCols.size};
  }
  return {format:'streamatlas-pg-schema-parity-v1',sqliteTables:sqliteTables.length,postgresTables:pg.size,missingTables,missingColumns,tableColumnCounts:mapped,verifiedOnPostgres:false};
 }finally{db.close();}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{const idx=process.argv.indexOf('--sqlite');if(idx<0||!process.argv[idx+1])throw Error('Usage: node scripts/pg-schema-parity.js --sqlite /path/to/disposable.db');const result=inspectSchema(path.resolve(process.argv[idx+1]));console.log(JSON.stringify(result,null,2));if(result.missingTables.length||Object.keys(result.missingColumns).length)process.exitCode=2;}
 catch(e){console.error('Schema parity audit failed: '+e.message);process.exitCode=1;}
}
