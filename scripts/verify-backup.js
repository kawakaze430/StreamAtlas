/** Verify a snapshot produced by db:backup, without restoring into the live DB. */
import {DatabaseSync} from 'node:sqlite';
import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';
const manifestPath=process.argv[2];
if(!manifestPath||!path.isAbsolute(manifestPath))throw Error('Usage: npm run db:verify -- /absolute/path/to/snapshot.sqlite.json');
const m=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
if(m.format!=='streamatlas-sqlite-backup'||m.version!==1||path.basename(m.file)!==m.file||!/^streamatlas-.*\.sqlite$/.test(m.file))throw Error('Unrecognized backup manifest');
const dataPath=path.join(path.dirname(manifestPath),m.file),contents=fs.readFileSync(dataPath);
const hash=crypto.createHash('sha256').update(contents).digest('hex');
if(hash!==m.sha256||contents.length!==m.bytes)throw Error('Backup checksum or length mismatch');
const db=new DatabaseSync(dataPath,{readOnly:true});let integrity;try{integrity=db.prepare('PRAGMA integrity_check').get().integrity_check}finally{db.close()}
if(integrity!=='ok')throw Error('Backup database integrity check failed');
console.log(JSON.stringify({ok:true,file:dataPath,sha256:hash,bytes:contents.length,integrity},null,2));
