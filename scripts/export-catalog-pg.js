/** Privacy-safe catalog export for an eventual PostgreSQL migration.
 * Excludes accounts, sessions, tokens, rights records, and private media.
 * Output is JSONL (one row per line), plus SHA256 manifest. Use a separate
 * reviewed loader; this is not a live migration/dual-write mechanism.
 */
import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';
import {all} from '../src/database.js';
const tables=['categories','networks','sites','channels','performers','videos','video_categories','video_performers','video_chapters','video_captions'];
const dest=path.resolve(process.argv[2]||'data/catalog-export');
if(dest===path.resolve('public')||dest.startsWith(path.resolve('public')+path.sep))throw Error('Never export database records inside the public web root.');
fs.mkdirSync(dest,{recursive:true,mode:0o700});
const manifest={format:'StreamAtlas catalog export 1',createdAt:new Date().toISOString(),tables:{}};
for(const table of tables){
 const rows=all(`SELECT * FROM ${table} ORDER BY ${table==='video_categories'?'video_id,category_id':table==='video_performers'?'video_id,performer_id':table==='video_chapters'?'video_id,start_seconds':table==='video_captions'?'video_id':'id'}`);
 const bytes=Buffer.from(rows.map(x=>JSON.stringify(x)).join('\n')+(rows.length?'\n':''),'utf8');
 const file=path.join(dest,table+'.jsonl');fs.writeFileSync(file,bytes,{mode:0o600});
 manifest.tables[table]={rows:rows.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex')};
}
fs.writeFileSync(path.join(dest,'manifest.json'),JSON.stringify(manifest,null,2)+'\n',{mode:0o600});
console.log(JSON.stringify({destination:dest,counts:Object.fromEntries(Object.entries(manifest.tables).map(([k,v])=>[k,v.rows]))}));
