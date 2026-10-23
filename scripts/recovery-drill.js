/** Run a real encrypted backup and restore against a disposable SQLite/media fixture.
 * Never touches the running application or existing files. No customer data used.
 */
import fs from 'node:fs';import path from 'node:path';import os from 'node:os';import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';import {DatabaseSync} from 'node:sqlite';
const ROOT=path.resolve(import.meta.dirname,'..');
const root=fs.mkdtempSync(path.join(os.tmpdir(),'sa-recovery-drill-'));
const dbPath=path.join(root,'runtime.sqlite'),privatePath=path.join(root,'private'),backupOut=path.join(root,'backups'),restoreOut=path.join(root,'restored');
const key=crypto.randomBytes(32).toString('hex');
const env={...process.env,DB_PATH:dbPath,PRIVATE_PATH:privatePath,SA_BACKUP_OFFLINE:'1',SA_BACKUP_KEY:key,SA_DISABLE_WORKER:'1'};
function run(filename,args=[]){const result=spawnSync(process.execPath,[filename,...args],{cwd:ROOT,env,encoding:'utf8',timeout:60000});if(result.status!==0)throw Error(`${filename} failed: ${result.stderr||result.stdout}`);return result.stdout.trim()}
function sum(file){return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')}
try{
 run('-e',["import('./src/database.js').then(()=>console.log('seeded'))"]);
 const stored=path.join(privatePath,'processed','00000000-0000-4000-8000-000000000001');
 fs.mkdirSync(stored,{recursive:true});fs.copyFileSync(path.join(ROOT,'public/assets/videos/sample-1.mp4'),path.join(stored,'sample.mp4'));
 const before=sum(path.join(stored,'sample.mp4'));
 const backup=JSON.parse(run('scripts/secure-backup.js',[backupOut]));
 const result=JSON.parse(run('scripts/secure-restore.js',[backup.folder,restoreOut]));
 if(!result.ok)throw Error('Restore reported failure');
 const actual=path.join(restoreOut,'private','processed','00000000-0000-4000-8000-000000000001','sample.mp4');
 if(!fs.existsSync(actual)||sum(actual)!==before)throw Error('Recovered media missing or corrupt');
 const restoreDb=new DatabaseSync(path.join(restoreOut,'database.sqlite'),{readOnly:true});
 const videos=restoreDb.prepare('SELECT COUNT(*) n FROM videos').get().n;
 const integrity=restoreDb.prepare('PRAGMA integrity_check').get().integrity_check;
 restoreDb.close();if(videos!==72||integrity!=='ok')throw Error(`DB recovery mismatch count=${videos},integrity=${integrity}`);
 console.log(JSON.stringify({ok:true,encryptedBackup:true,mediaRecovered:true,sqliteIntegrity:integrity,videosRecovered:videos,entries:result.files},null,2));
}finally{fs.rmSync(root,{recursive:true,force:true})}
