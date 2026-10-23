/** Validate SHA-256 manifest and all catalog FK references before PG import.
 * No DB connection or mutation; only catalog (no private account data).
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
const names=['categories','networks','sites','channels','performers','videos','video_categories','video_performers','video_chapters','video_captions'];
const foreignKeys={sites:[['network_id','networks']],channels:[['site_id','sites']],videos:[['site_id','sites'],['channel_id','channels']],video_categories:[['video_id','videos'],['category_id','categories']],video_performers:[['video_id','videos'],['performer_id','performers']],video_chapters:[['video_id','videos']],video_captions:[['video_id','videos']]};
const primaryKeys={video_categories:['video_id','category_id'],video_performers:['video_id','performer_id'],video_chapters:['video_id','start_seconds'],video_captions:['video_id']};
export function verifyCatalog(dir){
 const manifest=JSON.parse(fs.readFileSync(path.join(dir,'manifest.json'),'utf8'));
 if(manifest.format!=='StreamAtlas catalog export 1'||Object.keys(manifest.tables).sort().join('|')!==names.slice().sort().join('|'))throw Error('Unsupported or incomplete catalog manifest');
 const tables={};
 for(const name of names){
  const bytes=fs.readFileSync(path.join(dir,name+'.jsonl'));
  if(crypto.createHash('sha256').update(bytes).digest('hex')!==manifest.tables[name].sha256)throw Error('Catalog checksum mismatch: '+name);
  const rows=bytes.toString('utf8').trim().split('\n').filter(Boolean).map(s=>JSON.parse(s));
  if(rows.length!==manifest.tables[name].rows)throw Error('Catalog row-count mismatch: '+name);
  tables[name]=rows;
 }
 const ids=Object.fromEntries(names.filter(n=>!['video_categories','video_performers','video_chapters','video_captions'].includes(n)).map(name=>[name,new Set(tables[name].map(r=>r.id))]));
 for(const [name,rows] of Object.entries(tables)){
  const seen=new Set(),keys=primaryKeys[name]||['id'];
  for(const row of rows){
   const pk=JSON.stringify(keys.map(k=>row[k]));
   if(keys.some(k=>row[k]===undefined||row[k]===null)||seen.has(pk))throw Error('Duplicate or missing primary key: '+name);
   seen.add(pk);
   for(const [col,target] of foreignKeys[name]||[]){if(row[col]!==null&&row[col]!==undefined&&!ids[target].has(row[col]))throw Error(`Orphaned ${name}.${col} -> ${target}`);}
   if(name==='videos'&&(!Number.isInteger(row.duration)||row.duration<0||['views','likes','dislikes'].some(k=>!Number.isSafeInteger(row[k])||row[k]<0)))throw Error('Invalid catalog video counters/duration');
  }
 }
 return {valid:true,tableCount:names.length,counts:Object.fromEntries(names.map(n=>[n,tables[n].length])),foreignKeysChecked:true,checksumsVerified:true};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{if(!process.argv[2])throw Error('Usage: node scripts/pg-catalog-integrity.js /path/to/catalog-export');console.log(JSON.stringify(verifyCatalog(path.resolve(process.argv[2]))));}
 catch(e){console.error('Catalog integrity failed: '+e.message);process.exitCode=1;}
}
