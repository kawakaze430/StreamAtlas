/** Fail-closed, HMAC-authenticated geo-assertion boundary for private tests.
 * A real edge must REMOVE incoming x-sa-geo-* headers before injecting signed
 * values. A raw client country header is NEVER sufficient. No geo provider or
 * jurisdictional approval is included in this prototype.
 */
import crypto from 'node:crypto';
const validCountry=x=>typeof x==='string'&&/^[A-Z]{2}$/.test(x)&&x!=='ZZ';
const validPath=x=>typeof x==='string'&&x.startsWith('/api/private-preview/media/')&&x.length<200&&!x.includes('\n');
function digest(secret,country,timestamp,path){return crypto.createHmac('sha256',secret).update(`${country}\n${timestamp}\n${path}`).digest('hex')}
export function signTrustedGeo({country,timestamp,path,secret}){
 if(!validCountry(country)||!validPath(path)||!Number.isSafeInteger(timestamp)||typeof secret!=='string'||secret.length<32)throw Error('Invalid trusted geo assertion inputs');
 return digest(secret,country,timestamp,path);
}
export function verifyTrustedGeo({headers,path,secret,nowEpoch=Math.floor(Date.now()/1000),maxAgeSeconds=30}){
 const denied=reason=>({trusted:false,reason});
 if(typeof secret!=='string'||secret.length<32)return denied('GEO_SIGNER_UNCONFIGURED');
 const country=headers?.['x-sa-geo-country'],timeString=headers?.['x-sa-geo-time'],signature=headers?.['x-sa-geo-signature'];
 if(!validCountry(country)||!validPath(path)||typeof timeString!=='string'||!/^[0-9]{10,11}$/.test(timeString)||typeof signature!=='string'||!/^[a-f0-9]{64}$/.test(signature))return denied('INVALID_ASSERTION');
 const timestamp=Number(timeString);
 if(!Number.isSafeInteger(nowEpoch)||!Number.isSafeInteger(maxAgeSeconds)||maxAgeSeconds<1||maxAgeSeconds>60||Math.abs(nowEpoch-timestamp)>maxAgeSeconds)return denied('STALE_ASSERTION');
 const expected=Buffer.from(digest(secret,country,timestamp,path),'hex'),actual=Buffer.from(signature,'hex');
 if(!crypto.timingSafeEqual(expected,actual))return denied('BAD_SIGNATURE');
 return {trusted:true,country};
}
export function evaluateTerritory({country,allowedCountries,deniedCountries=[]}){
 if(!validCountry(country)||!Array.isArray(allowedCountries)||allowedCountries.length===0)return {allowed:false,reason:'UNVERIFIED_OR_UNCONFIGURED'};
 if(!allowedCountries.every(validCountry)||!deniedCountries.every(validCountry))return {allowed:false,reason:'INVALID_POLICY'};
 if(deniedCountries.includes(country))return {allowed:false,reason:'DENIED_COUNTRY'};
 return allowedCountries.includes(country)?{allowed:true,reason:'POLICY_MATCH'}:{allowed:false,reason:'NOT_IN_ALLOWLIST'};
}
export function parseCountryList(value){
 if(typeof value!=='string'||!value.trim())return [];
 const codes=value.split(',').map(x=>x.trim().toUpperCase());
 if(!codes.every(validCountry)||new Set(codes).size!==codes.length)throw Error('Invalid or duplicate ISO country code in policy');
 return codes;
}
