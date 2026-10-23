/** AES-256-GCM streaming encryption and private backup manifest helpers.
 * Not a substitute for a reviewed production key-management and retention system.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {pipeline} from 'node:stream/promises';
export function backupKey(){const key=process.env.SA_BACKUP_KEY||'';if(!/^[0-9a-fA-F]{64}$/.test(key))throw Error('Set SA_BACKUP_KEY to 64 hex chars (32 random bytes)');return Buffer.from(key,'hex')}
export function requireOffline(){if(process.env.SA_BACKUP_OFFLINE!=='1')throw Error('Stop both API and media workers, then set SA_BACKUP_OFFLINE=1 to acknowledge an offline backup/restore.');}
export function rejectPublicDestination(folder){const target=path.resolve(folder),root=path.resolve(import.meta.dirname,'..','public');if(target===root||target.startsWith(root+path.sep))throw Error('Never write a backup inside the public web root.');}
export async function encryptFile(source,destination,key){
 const iv=crypto.randomBytes(12),cipher=crypto.createCipheriv('aes-256-gcm',key,iv);
 await pipeline(fs.createReadStream(source),cipher,fs.createWriteStream(destination,{flags:'wx',mode:0o600}));
 const stat=fs.statSync(destination);return {iv:iv.toString('base64url'),tag:cipher.getAuthTag().toString('base64url'),cipherBytes:stat.size};
}
export async function decryptFile(source,destination,entry,key){
 const decipher=crypto.createDecipheriv('aes-256-gcm',key,Buffer.from(entry.iv,'base64url'));
 decipher.setAuthTag(Buffer.from(entry.tag,'base64url'));
 await pipeline(fs.createReadStream(source),decipher,fs.createWriteStream(destination,{flags:'wx',mode:0o600}));
}
export function encryptManifest(data,key){const iv=crypto.randomBytes(12),c=crypto.createCipheriv('aes-256-gcm',key,iv),text=Buffer.from(JSON.stringify(data),'utf8'),encrypted=Buffer.concat([c.update(text),c.final()]);return {ciphertext:encrypted,iv:iv.toString('base64url'),tag:c.getAuthTag().toString('base64url')}}
export function decryptManifest(data,iv,tag,key){const d=crypto.createDecipheriv('aes-256-gcm',key,Buffer.from(iv,'base64url'));d.setAuthTag(Buffer.from(tag,'base64url'));return JSON.parse(Buffer.concat([d.update(data),d.final()]).toString('utf8'))}
export function sha256File(file){const h=crypto.createHash('sha256'),fd=fs.openSync(file,'r'),buffer=Buffer.alloc(1024*1024);try{let n;while((n=fs.readSync(fd,buffer,0,buffer.length,null))>0)h.update(buffer.subarray(0,n));return h.digest('hex')}finally{fs.closeSync(fd)}}
export function walkPrivate(base,subdir){const src=path.join(base,subdir);if(!fs.existsSync(src))return [];
 const output=[],visit=(abs,relative)=>{for(const item of fs.readdirSync(abs,{withFileTypes:true})){if(item.isSymbolicLink())throw Error('Refusing to back up a media symlink');const next=path.join(abs,item.name),rel=path.posix.join(relative,item.name);if(item.isDirectory())visit(next,rel);else if(item.isFile())output.push({source:next,relative:'private/'+rel})}};
 visit(src,subdir);return output.sort((a,b)=>a.relative.localeCompare(b.relative));
}
export function safeRelative(rel){if(typeof rel!=='string'||rel.startsWith('/')||rel.includes('\\')||rel.split('/').some(x=>x==='..'||x===''||x==='.')||!(/^(database\.sqlite|private\/(?:uploads|processed)\/[A-Za-z0-9._\-/]+)$/.test(rel)))throw Error('Invalid backup entry path');return rel}
