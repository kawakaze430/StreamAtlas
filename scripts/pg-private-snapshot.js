/** Encrypted, read-only pre-cutover snapshot for PRIVATE migration rehearsal.
 * This is not a PostgreSQL loader, backup replacement or public-data export.
 * The envelope never contains plaintext rows, password hashes or MFA secrets.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const maxSnapshotBytes=64*1024*1024;
function getKey(){const key=process.env.SA_PG_SNAPSHOT_KEY||'';if(key.length<32)throw Error('SA_PG_SNAPSHOT_KEY must be at least 32 characters');return key;}
function safePath(file){
 const dest=path.resolve(file),publicDir=path.join(root,'public');
 if(dest===publicDir||dest.startsWith(publicDir+path.sep))throw Error('Private snapshot cannot be written inside public/');
 const parent=path.dirname(dest);fs.mkdirSync(parent,{recursive:true,mode:0o700});
 const realParent=fs.realpathSync(parent);if(realParent===publicDir||realParent.startsWith(publicDir+path.sep))throw Error('Private snapshot path resolves inside public/');
 if(fs.existsSync(dest))throw Error('Refusing to overwrite existing snapshot');
 return dest;
}
export function exportSnapshot(source,destination){
 if(process.env.SA_PG_SNAPSHOT_APPROVED!=='YES_PRIVATE_BACKUP')throw Error('Explicit private snapshot approval required');
 const key=getKey();const src=path.resolve(source);
 if(!fs.existsSync(src)||!fs.statSync(src).isFile())throw Error('SQLite source file missing');
 if(fs.statSync(src).size>maxSnapshotBytes)throw Error('Prototype snapshot limit exceeded (64 MiB); use reviewed streaming backup workflow');
 const dest=safePath(destination);const db=new DatabaseSync(src,{readOnly:true});
 let tables;
 try{
  db.exec('BEGIN');
  const names=db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE 'video_title_fts%' ORDER BY name").all().map(r=>r.name);
  tables=Object.fromEntries(names.map(name=>[name,db.prepare(`SELECT * FROM "${name}" ORDER BY rowid`).all()]));
  db.exec('COMMIT');
 }catch(e){try{db.exec('ROLLBACK');}catch{}throw e;}finally{db.close();}
 const plaintext=Buffer.from(JSON.stringify({format:'streamatlas-private-sqlite-snapshot-v1',tables}));
 if(plaintext.length>maxSnapshotBytes)throw Error('Serialized snapshot exceeds 64 MiB; use reviewed streaming workflow');
 const salt=crypto.randomBytes(16),iv=crypto.randomBytes(12),derived=crypto.scryptSync(key,salt,32,{maxmem:64*1024*1024});
 const cipher=crypto.createCipheriv('aes-256-gcm',derived,iv);
 const ciphertext=Buffer.concat([cipher.update(plaintext),cipher.final()]);
 const envelope={format:'streamatlas-private-snapshot-envelope-v1',algorithm:'aes-256-gcm',kdf:'scrypt',salt:salt.toString('base64'),iv:iv.toString('base64'),tag:cipher.getAuthTag().toString('base64'),ciphertext:ciphertext.toString('base64')};
 const fd=fs.openSync(dest,'wx',0o600);
 try{fs.writeFileSync(fd,JSON.stringify(envelope)+'\n');fs.fsyncSync(fd);}finally{fs.closeSync(fd);}
 return {encrypted:true,tableCount:Object.keys(tables).length,bytes:fs.statSync(dest).size};
}
export function verifySnapshot(file){
 const key=getKey(),envelope=JSON.parse(fs.readFileSync(file,'utf8'));
 if(envelope.format!=='streamatlas-private-snapshot-envelope-v1'||envelope.algorithm!=='aes-256-gcm'||envelope.kdf!=='scrypt')throw Error('Unsupported encrypted snapshot envelope');
 const salt=Buffer.from(envelope.salt,'base64'),iv=Buffer.from(envelope.iv,'base64'),tag=Buffer.from(envelope.tag,'base64'),ciphertext=Buffer.from(envelope.ciphertext,'base64');
 if(salt.length!==16||iv.length!==12||tag.length!==16||ciphertext.length>maxSnapshotBytes)throw Error('Invalid encrypted snapshot parameters');
 const decipher=crypto.createDecipheriv('aes-256-gcm',crypto.scryptSync(key,salt,32,{maxmem:64*1024*1024}),iv);decipher.setAuthTag(tag);
 const decoded=JSON.parse(Buffer.concat([decipher.update(ciphertext),decipher.final()]).toString('utf8'));
 if(decoded.format!=='streamatlas-private-sqlite-snapshot-v1'||!decoded.tables||typeof decoded.tables!=='object')throw Error('Invalid decrypted snapshot');
 return {authenticated:true,tableCount:Object.keys(decoded.tables).length,recordCount:Object.values(decoded.tables).reduce((sum,rows)=>sum+rows.length,0)};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  const [mode,file,...rest]=process.argv.slice(2);
  let result;
  if(mode==='export'&&file&&rest[0]==='--sqlite'&&rest[1])result=exportSnapshot(rest[1],file);
  else if(mode==='verify'&&file)result=verifySnapshot(file);
  else throw Error('Usage: node scripts/pg-private-snapshot.js export /private/snapshot.json --sqlite /path/db OR verify /private/snapshot.json');
  console.log(JSON.stringify(result));
 }catch(e){console.error('Private snapshot operation failed: '+e.message);process.exitCode=1;}
}
