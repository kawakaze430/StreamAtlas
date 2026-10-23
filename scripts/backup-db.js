/** Consistent online SQLite snapshot with SHA-256 and integrity verification.
 * Usage: npm run db:backup -- /absolute/backup-directory
 * This covers SQLite ONLY; private media and legal records need a separately
 * reviewed backup/retention policy. Do not copy live WAL/SHM files manually.
 */
import {DatabaseSync,backup} from 'node:sqlite';
import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const source=process.env.DB_PATH||path.join(root,'data','streamatlas.db');
const destination=process.argv[2];
if(!destination||!path.isAbsolute(destination))throw Error('Usage: npm run db:backup -- /absolute/backup-directory');
if(!fs.existsSync(source))throw Error('Source database not found; initialize the site first.');
fs.mkdirSync(destination,{recursive:true,mode:0o700});
const id=new Date().toISOString().replace(/[:.]/g,'-')+'-'+crypto.randomBytes(4).toString('hex');
const dbOut=path.join(destination,'streamatlas-'+id+'.sqlite');
const sourceDb=new DatabaseSync(source);try{await backup(sourceDb,dbOut)}finally{sourceDb.close()}
const verifyDb=new DatabaseSync(dbOut,{readOnly:true});
let verification;try{verification=verifyDb.prepare('PRAGMA integrity_check').get().integrity_check}finally{verifyDb.close()}
if(verification!=='ok'){fs.rmSync(dbOut,{force:true});throw Error('Backup failed SQLite integrity_check: '+verification)}
const data=fs.readFileSync(dbOut),sha256=crypto.createHash('sha256').update(data).digest('hex');
const manifest={format:'streamatlas-sqlite-backup',version:1,file:path.basename(dbOut),sha256,bytes:data.length,createdAt:new Date().toISOString(),integrity:verification,includesPrivateMedia:false};
const manifestPath=dbOut+'.json';fs.writeFileSync(manifestPath,JSON.stringify(manifest,null,2)+'\n',{flag:'wx',mode:0o600});
console.log(JSON.stringify({database:dbOut,manifest:manifestPath,sha256,integrity:verification},null,2));
