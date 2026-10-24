/** Checkpoint 44: deterministic ABR experiment policy, device/offline entitlement gates.
 * These functions can be exercised in CI without misleadingly claiming real browser/packet-loss tests.
 */
import crypto from 'node:crypto';

const err=(reason)=>Object.assign(new Error(reason),{code:reason});
const positive=n=>Number.isFinite(n)&&n>0;
export function evaluateAbrTrace({levels,samples,initialLevel=0,minBufferSeconds=4}={}){
 if(!Array.isArray(levels)||levels.length<1||levels.length>12||!levels.every(positive)||levels.some((v,i)=>i>0&&v<=levels[i-1]))throw err('INVALID_ABR_LEVELS');
 if(!Number.isInteger(initialLevel)||initialLevel<0||initialLevel>=levels.length||!positive(minBufferSeconds))throw err('INVALID_ABR_CONFIGURATION');
 if(!Array.isArray(samples)||!samples.length||samples.length>10000)throw err('INVALID_ABR_SAMPLES');
 let current=initialLevel,stalls=0,switches=0;
 const events=[];
 for(const [index,s] of samples.entries()){
  if(!s||!positive(s.throughputKbps)||!Number.isFinite(s.bufferSeconds)||s.bufferSeconds<0||s.bufferSeconds>3600||!Number.isFinite(s.lossRate)||s.lossRate<0||s.lossRate>1)throw err('INVALID_NETWORK_SAMPLE');
  // Deliberately conservative: this is a reproducible offline experiment, NOT hls.js logic.
  const sustainable=s.throughputKbps*(s.lossRate>=0.15?0.45:s.lossRate>=0.05?0.65:0.8);
  let target=0;
  for(let i=0;i<levels.length;i++)if(levels[i]<=sustainable)target=i;
  if(s.bufferSeconds<minBufferSeconds)target=Math.min(target,current-1<0?0:current-1);
  // Prevent an optimistic multi-rendition quality jump in one decision.
  if(target>current+1)target=current+1;
  const previous=current;current=target;
  if(s.bufferSeconds===0)stalls++;
  if(previous!==current)switches++;
  events.push({index,previous,current,action:previous===current?'HOLD':previous>current?'DOWN':'UP',lossRate:s.lossRate});
 }
 return {experimentOnly:true,events,stalls,switches,finalLevel:current,realBrowserAcceptance:false};
}

export function devicePlaybackCapability({protocol,airPlayAvailable=false,castSdkConfigured=false,userGesture=false,privateReceipt=false,regionAllowed=false}={}){
 if(!privateReceipt||!regionAllowed)return {allowed:false,reason:'PRIVATE_ACCESS_REQUIRED'};
 if(!userGesture)return {allowed:false,reason:'USER_GESTURE_REQUIRED'};
 if(protocol==='airplay')return airPlayAvailable?{allowed:true,reason:'NATIVE_AIRPLAY_AVAILABLE'}:{allowed:false,reason:'AIRPLAY_UNAVAILABLE'};
 if(protocol==='cast')return castSdkConfigured?{allowed:true,reason:'CAST_PROVIDER_REQUIRES_DEVICE_TEST'}:{allowed:false,reason:'CAST_SDK_NOT_APPROVED'};
 return {allowed:false,reason:'UNSUPPORTED_PROTOCOL'};
}

export function licensedOfflineEntitlement({explicitDownloadLicense=false,licenseExpiresAt,accessExpiresAt,now=Date.now(),privateReceipt=false,deviceId,rightsReviewed=false,regionAllowed=false,activeHold=false,revoked=false}={}){
 if(!explicitDownloadLicense||!rightsReviewed)return {allowed:false,reason:'DOWNLOAD_RIGHTS_NOT_VERIFIED'};
 if(!privateReceipt||!regionAllowed||activeHold||revoked)return {allowed:false,reason:'ACCESS_DENIED'};
 if(typeof deviceId!=='string'||!/^[a-zA-Z0-9_-]{12,80}$/.test(deviceId))return {allowed:false,reason:'INVALID_DEVICE'};
 const license=Date.parse(licenseExpiresAt||''),access=Date.parse(accessExpiresAt||'');
 if(!Number.isFinite(license)||!Number.isFinite(access)||license<=now||access<=now)return {allowed:false,reason:'EXPIRED'};
 return {allowed:true,reason:'EXPLICIT_LICENSED_DEVICE',expiresAt:new Date(Math.min(license,access)).toISOString(),providerDrmCertified:false};
}
/** Encryption-at-rest demo only: device binding and revocation MUST be enforced on each server reconciliation.
 * Never return unencrypted source media from this function. Not commercial DRM.
 */
export function encryptOfflineFixture(plaintext,{key,deviceId,entitlement}={}){
 if(!entitlement?.allowed||!entitlement.expiresAt||!Buffer.isBuffer(key)||key.length!==32||!Buffer.isBuffer(plaintext)||plaintext.length>8*1024*1024||plaintext.length<1||!/^[a-zA-Z0-9_-]{12,80}$/.test(deviceId||''))throw err('OFFLINE_ENCRYPTION_DENIED');
 const nonce=crypto.randomBytes(12),cipher=crypto.createCipheriv('aes-256-gcm',key,nonce);
 const header={version:1,deviceId,expiresAt:entitlement.expiresAt};
 const aad=Buffer.from(JSON.stringify(header));cipher.setAAD(aad);
 const ciphertext=Buffer.concat([cipher.update(plaintext),cipher.final()]);
 return {header,nonce:nonce.toString('base64'),tag:cipher.getAuthTag().toString('base64'),ciphertext:ciphertext.toString('base64'),requiresOnlineRevocationCheck:true,drmCertified:false};
}
export function decryptOfflineFixture(bundle,{key,deviceId,now=Date.now(),revocationConfirmed=false}={}){
 if(!revocationConfirmed||!bundle||bundle.header?.version!==1||bundle.header.deviceId!==deviceId||Date.parse(bundle.header.expiresAt)<=now||!Buffer.isBuffer(key)||key.length!==32)throw err('OFFLINE_ACCESS_DENIED');
 try{
  const decipher=crypto.createDecipheriv('aes-256-gcm',key,Buffer.from(bundle.nonce,'base64'));
  decipher.setAAD(Buffer.from(JSON.stringify(bundle.header)));decipher.setAuthTag(Buffer.from(bundle.tag,'base64'));
  return Buffer.concat([decipher.update(Buffer.from(bundle.ciphertext,'base64')),decipher.final()]);
 }catch{throw err('OFFLINE_INTEGRITY_ERROR')}
}
