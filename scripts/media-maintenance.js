/** Safe local staging clean-up. Dry run by default.
 * Never deletes published assets or uploads actively being written/processed.
 * Not a substitute for a legally reviewed records-retention program.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {all} from '../src/database.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const privateRoot=process.env.PRIVATE_PATH||path.join(root,'data','private');
const staging=path.join(privateRoot,'uploads');
fs.mkdirSync(staging,{recursive:true});
const ageFlag=process.argv.indexOf('--older-than');
const days=ageFlag>=0?Number(process.argv[ageFlag+1]):7;
if(!Number.isFinite(days)||days<1||days>365)throw Error('--older-than must be from 1 to 365 days');
const apply=process.argv.includes('--apply');
const olderThan=Date.now()-days*86400000;
const dbRows=all('SELECT id,status,updated_at AS updatedAt FROM upload_sessions');
const statuses=Object.fromEntries(dbRows.map(r=>[r.id,r]));
let candidates=0,bytes=0,removed=0;
for(const entry of fs.readdirSync(staging,{withFileTypes:true})){
 if(!entry.isFile()||!/^[a-f0-9-]{36}\.part$/.test(entry.name))continue;
 const full=path.join(staging,entry.name),id=entry.name.slice(0,-5),record=statuses[id];
 const info=fs.statSync(full);
 const eligible=info.mtimeMs<olderThan&&(!record||(['FAILED','CANCELLED'].includes(record.status)&&new Date(record.updatedAt).getTime()<olderThan));
 if(!eligible)continue;
 candidates++;bytes+=info.size;
 if(apply){fs.unlinkSync(full);removed++}
}
console.log(JSON.stringify({mode:apply?'apply':'dry-run',olderThanDays:days,eligibleFiles:candidates,eligibleBytes:bytes,deleted:removed},null,2));
if(!apply)console.log('No files deleted. Use --apply explicitly after confirming backups and retention requirements.');
