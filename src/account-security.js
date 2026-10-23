/** Prototype account protection: hashed, single-use expiring tokens and encrypted TOTP.
 * Mail delivery is intentionally dev-only. Do NOT expose SA_DEV_MAIL_OUTBOX publicly.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {one,run,now,tokenHash} from './database.js';

export function error(message,status=400){return Object.assign(new Error(message),{status})}
export function developmentMailerEnabled(){return process.env.NODE_ENV==='test'||(process.env.NODE_ENV!=='production'&&process.env.SA_DEV_MAIL_OUTBOX==='1')}
export function issueAccountToken(userId,kind,ttlMs=900000){
 if(!['EMAIL_VERIFY','PASSWORD_RESET'].includes(kind))throw error('Invalid account token kind');
 const raw=crypto.randomBytes(32).toString('base64url'),digest=tokenHash(raw);
 run('DELETE FROM account_tokens WHERE user_id=? AND kind=?',userId,kind);
 run('INSERT INTO account_tokens(token_hash,user_id,kind,expires_at,created_at) VALUES(?,?,?,?,?)',digest,userId,kind,new Date(Date.now()+ttlMs).toISOString(),now());
 return raw;
}
export function consumeAccountToken(raw,kind,expectedUserId=null){
 if(typeof raw!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(raw))throw error('Invalid or expired token',400);
 const digest=tokenHash(raw),row=one('SELECT user_id AS userId,expires_at AS expiresAt FROM account_tokens WHERE token_hash=? AND kind=?',digest,kind);
 if(!row||Date.parse(row.expiresAt)<=Date.now()||(expectedUserId!==null&&row.userId!==expectedUserId))throw error('Invalid or expired token',400);
 const used=run('DELETE FROM account_tokens WHERE token_hash=? AND kind=? AND expires_at>?',digest,kind,now());
 if(!used.changes)throw error('Token already used or expired',400);
 return row.userId;
}
export function deliverDevelopmentMail(email,kind,raw){
 if(!developmentMailerEnabled())throw error('No mail provider configured. Account recovery is unavailable.',503);
 // Unit tests can inspect returned tokens, but no files or logs expose them.
 if(process.env.NODE_ENV==='test')return;
 const dir=path.resolve(process.env.PRIVATE_PATH||'data/private','mail-outbox');fs.mkdirSync(dir,{recursive:true,mode:0o700});
 const file=path.join(dir,crypto.randomUUID()+'.json');fs.writeFileSync(file,JSON.stringify({to:email,kind,token:raw,createdAt:now()}),{mode:0o600});
}
function totpKey(){const value=process.env.SA_MFA_KEY||'';if(!/^[a-fA-F0-9]{64}$/.test(value))throw error('Set a persistent 32-byte SA_MFA_KEY before enrolling MFA.',503);return Buffer.from(value,'hex')}
export function encryptSecret(secret){const iv=crypto.randomBytes(12),cipher=crypto.createCipheriv('aes-256-gcm',totpKey(),iv),payload=Buffer.concat([cipher.update(secret,'utf8'),cipher.final()]);return Buffer.concat([iv,cipher.getAuthTag(),payload]).toString('base64url')}
export function decryptSecret(ciphertext){const raw=Buffer.from(ciphertext,'base64url');const cipher=crypto.createDecipheriv('aes-256-gcm',totpKey(),raw.subarray(0,12));cipher.setAuthTag(raw.subarray(12,28));return Buffer.concat([cipher.update(raw.subarray(28)),cipher.final()]).toString('utf8')}
const base32='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
export function newTotpSecret(){const bytes=crypto.randomBytes(20);let bits=0,value=0,result='';for(const b of bytes){value=(value<<8)|b;bits+=8;while(bits>=5){result+=base32[(value>>>(bits-=5))&31]}}if(bits>0)result+=base32[(value<<(5-bits))&31];return result}
function base32decode(s){let value=0,bits=0,bytes=[];for(const c of s){const n=base32.indexOf(c);if(n<0)throw error('Invalid MFA secret');value=(value<<5)|n;bits+=5;if(bits>=8){bytes.push((value>>>(bits-=8))&255);value&=(1<<bits)-1}}return Buffer.from(bytes)}
export function totp(secret,step=Math.floor(Date.now()/30000)){const msg=Buffer.alloc(8);msg.writeBigUInt64BE(BigInt(step));const mac=crypto.createHmac('sha1',base32decode(secret)).update(msg).digest();const off=mac[mac.length-1]&15;return String((mac.readUInt32BE(off)&0x7fffffff)%1000000).padStart(6,'0')}
export function verifyTotp(secret,code,lastStep=-1){if(!/^\d{6}$/.test(String(code||'')))return -1;const current=Math.floor(Date.now()/30000);for(const step of [current,current-1,current+1])if(step>lastStep&&crypto.timingSafeEqual(Buffer.from(totp(secret,step)),Buffer.from(String(code))))return step;return -1}
export function verifyAndConsumeMfa(userId,ciphertext,code){const row=one('SELECT last_totp_step AS step FROM user_mfa WHERE user_id=?',userId);const step=verifyTotp(decryptSecret(ciphertext),code,row?.step??-1);if(step<0)throw error('Invalid or reused authentication code',401);run('UPDATE user_mfa SET last_totp_step=? WHERE user_id=?',step,userId);return true}
