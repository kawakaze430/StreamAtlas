/** CloudFront PRIVATE HLS signed-cookie signer.
 * This module is not a licensed content or user age verification solution.
 * Deployment must configure OAC, blocked-public S3 origin, a trusted key group,
 * and a same-site custom CloudFront domain before enabling requests.
 */
import crypto from 'node:crypto';
const safe64=b=>Buffer.from(b).toString('base64').replace(/\+/g,'-').replace(/=/g,'_').replace(/\//g,'~');
const uploadIdRE=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function signedMediaCookies({uploadId,mediaOrigin,keyPairId,privateKey,domain,ttlSeconds=300,nowEpoch=Math.floor(Date.now()/1000)}){
 if(!uploadIdRE.test(uploadId))throw Error('Invalid media upload id');
 const endpoint=new URL(mediaOrigin);
 if(endpoint.protocol!=='https:'||endpoint.pathname!=='/'||endpoint.search||endpoint.hash||endpoint.port||!endpoint.hostname.includes('.'))throw Error('Media origin must be an HTTPS domain root');
 if(!/^[A-Z0-9]{8,30}$/.test(keyPairId))throw Error('Invalid CloudFront public-key ID');
 if(typeof privateKey!=='string'||!privateKey.includes('PRIVATE KEY'))throw Error('CloudFront signing key is not configured');
 if(!Number.isSafeInteger(ttlSeconds)||ttlSeconds<30||ttlSeconds>900)throw Error('TTL must be between 30 and 900 seconds');
 if(!Number.isSafeInteger(nowEpoch)||nowEpoch<0)throw Error('Invalid current time');
 const trimmed=String(domain||'').replace(/^\./,'').toLowerCase();
 if(!/^[a-z0-9-]+(?:\.[a-z0-9-]+)+$/.test(trimmed)||(!endpoint.hostname.endsWith('.'+trimmed)&&endpoint.hostname!==trimmed))throw Error('Cookie domain must be an ancestor of the media host');
 const resource=`${endpoint.origin}/media/${uploadId}/*`;
 const expires=nowEpoch+ttlSeconds;
 const policy=JSON.stringify({Statement:[{Resource:resource,Condition:{DateLessThan:{'AWS:EpochTime':expires}}}]});
 const signature=crypto.sign('RSA-SHA1',Buffer.from(policy),privateKey);
 const fields={ 'CloudFront-Policy':safe64(policy), 'CloudFront-Signature':safe64(signature), 'CloudFront-Key-Pair-Id':keyPairId };
 const attribute=`Path=/media/${uploadId}/; Domain=.${trimmed}; Secure; HttpOnly; SameSite=Lax; Max-Age=${ttlSeconds}`;
 const cookies=Object.entries(fields).map(([key,value])=>`${key}=${value}; ${attribute}`);
 return {cookies,expires,resource,fields};
}
export function verifyPolicySignature(policyValue,signatureValue,publicKey){
 const unsafe64=str=>Buffer.from(str.replace(/-/g,'+').replace(/_/g,'=').replace(/~/g,'/'),'base64');
 return crypto.verify('RSA-SHA1',unsafe64(policyValue),publicKey,unsafe64(signatureValue));
}

/** Offline validation of the policy envelope for negative security tests.
 * This is NOT a CloudFront edge authorizer and cannot revoke cookies already
 * cached at viewers. AWS performs signature checks; origin holds need an
 * independently verified invalidation/short-TTL strategy.
 */
export function inspectSignedMediaCookies({fields,uploadId,mediaOrigin,publicKeys,nowEpoch=Math.floor(Date.now()/1000),isRevoked=()=>false}){
 const denied=reason=>({valid:false,reason});
 if(!fields||typeof fields!=='object'||!uploadIdRE.test(String(uploadId)))return denied('BAD_INPUT');
 const id=fields['CloudFront-Key-Pair-Id'];
 if(typeof id!=='string'||!Object.hasOwn(publicKeys||{},id))return denied('UNKNOWN_KEY');
 const policy64=fields['CloudFront-Policy'],signature64=fields['CloudFront-Signature'];
 if(typeof policy64!=='string'||typeof signature64!=='string'||
  !/^[A-Za-z0-9_~\-]+$/.test(policy64)||!/^[A-Za-z0-9_~\-]+$/.test(signature64)||
  policy64.length>8192||signature64.length>8192)return denied('BAD_ENCODING');
 try{
  if(!verifyPolicySignature(policy64,signature64,publicKeys[id]))return denied('BAD_SIGNATURE');
  const policy=JSON.parse(Buffer.from(policy64.replace(/-/g,'+').replace(/_/g,'=').replace(/~/g,'/'),'base64').toString('utf8'));
  const statement=policy?.Statement;
  if(!Array.isArray(statement)||statement.length!==1||Object.keys(policy).length!==1)return denied('BAD_POLICY');
  const entry=statement[0];
  const expected=`${new URL(mediaOrigin).origin}/media/${uploadId}/*`;
  if(entry.Resource!==expected||Object.keys(entry).sort().join(',')!=='Condition,Resource')return denied('RESOURCE_MISMATCH');
  const expires=entry.Condition?.DateLessThan?.['AWS:EpochTime'];
  if(!Number.isSafeInteger(nowEpoch)||!Number.isSafeInteger(expires)||expires<=nowEpoch||expires>nowEpoch+900)return denied('EXPIRED_OR_EXCESSIVE_TTL');
  if(isRevoked(uploadId))return denied('REVOKED_IN_LOCAL_SIMULATION');
  return {valid:true,expires,keyPairId:id};
 }catch{return denied('INVALID_POLICY')}
}
