/** Restore a validated encrypted snapshot into a NEW directory only.
 * Never overwrites an active DB/media tree. Operator must stop API and worker.
 */
import {DatabaseSync} from 'node:sqlite';
import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';
import {backupKey,requireOffline,rejectPublicDestination,decryptFile,decryptManifest,sha256File,safeRelative} from '../src/secure-backup-core.js';
const key=backupKey();requireOffline();
const source=process.argv[2],target=process.argv[3];if(!source||!target||!path.isAbsolute(source)||!path.isAbsolute(target))throw Error('Usage: secure:restore -- /absolute/backup-folder /absolute/new-output-folder');
rejectPublicDestination(target);
if(fs.existsSync(target))throw Error('Restore destination must not exist; never overwrite live application data.');
const parent=path.dirname(target);fs.mkdirSync(parent,{recursive:true,mode:0o700});
const work=path.join(parent,'.restore-'+crypto.randomUUID());fs.mkdirSync(work,{mode:0o700});
try{
 const info=JSON.parse(fs.readFileSync(path.join(source,'manifest.info'),'utf8'));
 if(info.format!=='streamatlas-encrypted-offline-backup'||info.version!==1)throw Error('Unsupported encrypted snapshot');
 const manifest=decryptManifest(fs.readFileSync(path.join(source,'manifest.enc')),info.iv,info.tag,key);
 if(manifest.format!==info.format||manifest.version!==1||manifest.files?.length!==manifest.entryCount||manifest.entryCount<1||manifest.entryCount>100000)throw Error('Invalid encrypted manifest');
 const destinations=new Set();
 for(const file of manifest.files){
  const relative=safeRelative(file.relative);
  if(destinations.has(relative))throw Error('Duplicate backup file path');destinations.add(relative);
  if(!/^\d{6}\.enc$/.test(file.blob)||!/^[a-f0-9]{64}$/.test(file.plainSha256))throw Error('Invalid backup entry');
  const src=path.join(source,file.blob),dst=path.join(work,relative);fs.mkdirSync(path.dirname(dst),{recursive:true,mode:0o700});
  if(fs.statSync(src).size!==file.cipherBytes)throw Error('Encrypted file size mismatch');
  await decryptFile(src,dst,file,key);
  if(sha256File(dst)!==file.plainSha256)throw Error('Plaintext checksum mismatch');
 }
 if(!destinations.has('database.sqlite'))throw Error('Snapshot is missing the database');
 const restored=new DatabaseSync(path.join(work,'database.sqlite'),{readOnly:true});try{if(restored.prepare('PRAGMA integrity_check').get().integrity_check!=='ok')throw Error('Restored SQLite database integrity check failed')}finally{restored.close()}
 fs.renameSync(work,target);console.log(JSON.stringify({ok:true,restoredTo:target,files:manifest.entryCount,notice:'Do not start the app until DB_PATH and PRIVATE_PATH are configured for the new directory.'},null,2));
}catch(e){fs.rmSync(work,{recursive:true,force:true});throw e}
