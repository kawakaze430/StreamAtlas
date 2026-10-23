/** OFFLINE encrypted database + processed/upload media snapshot.
 * Usage: SA_BACKUP_KEY=<64hex> SA_BACKUP_OFFLINE=1 npm run secure:backup -- /absolute/backups
 */
import {DatabaseSync,backup} from 'node:sqlite';
import fs from 'node:fs';import path from 'node:path';import os from 'node:os';import crypto from 'node:crypto';
import {backupKey,requireOffline,rejectPublicDestination,encryptFile,encryptManifest,sha256File,walkPrivate} from '../src/secure-backup-core.js';
const key=backupKey();requireOffline();
const destination=process.argv[2];if(!destination||!path.isAbsolute(destination))throw Error('Usage: secure:backup -- /absolute/private/backup-directory');rejectPublicDestination(destination);
const root=path.resolve(import.meta.dirname,'..'),dbPath=process.env.DB_PATH||path.join(root,'data','streamatlas.db'),media=process.env.PRIVATE_PATH||path.join(root,'data','private');
if(!fs.existsSync(dbPath))throw Error('SQLite database does not exist.');
fs.mkdirSync(destination,{recursive:true,mode:0o700});
const folder=path.join(destination,'streamatlas-secure-'+new Date().toISOString().replace(/[:.]/g,'-')+'-'+crypto.randomBytes(4).toString('hex'));
fs.mkdirSync(folder,{mode:0o700});
const staging=fs.mkdtempSync(path.join(os.tmpdir(),'sa-offline-snapshot-'));
try{
 const snapshot=path.join(staging,'database.sqlite');const db=new DatabaseSync(dbPath);try{await backup(db,snapshot)}finally{db.close()}
 const verify=new DatabaseSync(snapshot,{readOnly:true});try{if(verify.prepare('PRAGMA integrity_check').get().integrity_check!=='ok')throw Error('Backup database integrity check failed')}finally{verify.close()}
 const files=[{source:snapshot,relative:'database.sqlite'},...walkPrivate(media,'uploads'),...walkPrivate(media,'processed')];
 const records=[];
 for(const [i,f] of files.entries()){
  const name=String(i).padStart(6,'0')+'.enc',output=path.join(folder,name);
  const encrypted=await encryptFile(f.source,output,key);
  records.push({...encrypted,relative:f.relative,blob:name,plainSha256:sha256File(f.source)});
 }
 const manifest={format:'streamatlas-encrypted-offline-backup',version:1,createdAt:new Date().toISOString(),entryCount:records.length,files:records};
 const encryptedManifest=encryptManifest(manifest,key);
 fs.writeFileSync(path.join(folder,'manifest.enc'),encryptedManifest.ciphertext,{mode:0o600,flag:'wx'});
 fs.writeFileSync(path.join(folder,'manifest.info'),JSON.stringify({format:manifest.format,version:1,iv:encryptedManifest.iv,tag:encryptedManifest.tag})+'\n',{mode:0o600,flag:'wx'});
 console.log(JSON.stringify({folder,entries:records.length,encrypted:true,containsDb:true,includesUploadsAndProcessedMedia:true},null,2));
}catch(e){fs.rmSync(folder,{recursive:true,force:true});throw e}
finally{fs.rmSync(staging,{recursive:true,force:true})}
