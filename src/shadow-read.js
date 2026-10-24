/** Bounded synthetic-only loopback shadow reads. No traffic shift or stored bodies. */
import http from 'node:http';
import crypto from 'node:crypto';
import {setTimeout as pause} from 'node:timers/promises';
import {parityReport,buildShadowCutoverPlan} from './roadmap44-migration.js';

export const SHADOW_READ_PATHS=Object.freeze([
 'GET /api/auth/me',
 'GET /api/me/preferences?expanded=1',
]);
const fail=code=>Object.assign(new Error(code),{code});
const hash=value=>crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
const canonical=value=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'
 ?Object.fromEntries(Object.entries(value).filter(([key])=>!['requestId','generatedAt'].includes(key)).sort(([a],[b])=>a.localeCompare(b)).map(([key,item])=>[key,canonical(item)])):value;

function checkedOrigin(value){
 // Validate the original spelling before WHATWG URL normalization: 127.1,
 // integer/hex IPs, userinfo, paths, queries and redirects are not accepted.
 if(typeof value!=='string'||!/^http:\/\/(?:127\.0\.0\.1|\[::1\]):[1-9][0-9]{0,4}\/?$/.test(value))throw fail('LITERAL_LOOPBACK_ORIGIN_REQUIRED');
 const url=new URL(value);
 const port=Number(url.port||80);
 if(port<1||port>65535)throw fail('INVALID_SHADOW_PORT');
 return url.origin;
}

function readJson(origin,path,{cookie,timeoutMs,maxBytes}){
 return new Promise((resolve,reject)=>{
  let settled=false,response;
  const finish=(error,value)=>{
   if(settled)return;
   settled=true;clearTimeout(timer);
   if(error){response?.destroy();request.destroy();reject(error)}else resolve(value);
  };
  const headers={Accept:'application/json','Cache-Control':'no-store'};
  if(cookie)headers.Cookie=cookie;
  const request=http.request(new URL(path,origin),{method:'GET',headers},res=>{
   response=res;
   if(!Number.isInteger(res.statusCode)||res.statusCode<200||res.statusCode>599)return finish(fail('INVALID_SHADOW_STATUS'));
   if(res.statusCode>=300&&res.statusCode<400)return finish(fail('REDIRECT_REFUSED'));
   if(!/^application\/json(?:\s*;|$)/i.test(res.headers['content-type']||''))return finish(fail('JSON_RESPONSE_REQUIRED'));
   const declared=res.headers['content-length'];
   if(declared!==undefined&&(!/^\d+$/.test(declared)||Number(declared)>maxBytes))return finish(fail('SHADOW_BODY_LIMIT'));
   const chunks=[];let bytes=0;
   res.on('data',chunk=>{
    bytes+=chunk.length;
    if(bytes>maxBytes)return finish(fail('SHADOW_BODY_LIMIT'));
    chunks.push(chunk);
   });
   res.on('error',()=>finish(fail('SHADOW_READ_FAILED')));
   res.on('aborted',()=>finish(fail('SHADOW_READ_FAILED')));
   res.on('end',()=>{
    if(settled)return;
    try{
     const body=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(Buffer.concat(chunks)));
     if(!body||typeof body!=='object'||Array.isArray(body))return finish(fail('JSON_OBJECT_REQUIRED'));
     finish(null,{status:res.statusCode,body});
    }catch{return finish(fail('INVALID_SHADOW_JSON'))}
   });
  });
  request.on('error',()=>finish(fail('SHADOW_READ_FAILED')));
  const timer=setTimeout(()=>finish(fail('SHADOW_TIMEOUT')),timeoutMs);
  request.end();
 });
}

export async function executeShadowReads({nodeOrigin,springOrigin,paths=SHADOW_READ_PATHS,cookie='',
 acknowledgeReadOnly=false,syntheticOnly=false,timeoutMs=2500,maxBytes=65536,minIntervalMs=1000}={}){
 if(acknowledgeReadOnly!==true||syntheticOnly!==true)throw fail('SYNTHETIC_READ_ONLY_ACK_REQUIRED');
 const origins={node:checkedOrigin(nodeOrigin),spring:checkedOrigin(springOrigin)};
 if(origins.node===origins.spring)throw fail('DISTINCT_SHADOW_ORIGINS_REQUIRED');
 if(!Array.isArray(paths)||paths.length<1||paths.length>SHADOW_READ_PATHS.length||new Set(paths).size!==paths.length||paths.some(path=>!SHADOW_READ_PATHS.includes(path)))throw fail('UNSUPPORTED_SHADOW_READ_PATH');
 if(typeof cookie!=='string'||(cookie!==''&&!/^sa_session=[A-Za-z0-9_-]{16,256}$/.test(cookie)))throw fail('INVALID_SHADOW_COOKIE');
 if(!Number.isSafeInteger(timeoutMs)||timeoutMs<50||timeoutMs>10000)throw fail('INVALID_SHADOW_TIMEOUT');
 if(!Number.isSafeInteger(maxBytes)||maxBytes<64||maxBytes>65536)throw fail('INVALID_SHADOW_BODY_LIMIT');
 if(!Number.isSafeInteger(minIntervalMs)||minIntervalMs<1000||minIntervalMs>10000)throw fail('INVALID_SHADOW_RATE');
 const responses={node:{},spring:{}},transport=[];
 let nextReadAt=0;
 for(const path of paths){
  for(const side of ['node','spring']){
   await pause(Math.max(0,nextReadAt-Date.now()));
   nextReadAt=Date.now()+minIntervalMs;
   try{responses[side][path]=await readJson(origins[side],path.slice(4),{cookie,timeoutMs,maxBytes})}
   catch(error){
    // Only fixed internal error codes leave this function; exceptions may
    // otherwise contain URLs, a parser excerpt, response data or credentials.
    const allowed=new Set(['REDIRECT_REFUSED','JSON_RESPONSE_REQUIRED','SHADOW_BODY_LIMIT','SHADOW_READ_FAILED','SHADOW_TIMEOUT','JSON_OBJECT_REQUIRED','INVALID_SHADOW_JSON','INVALID_SHADOW_STATUS']);
    transport.push({side,path,error:allowed.has(error.code)?error.code:'SHADOW_READ_FAILED'});
   }
  }
 }
 const parity=parityReport(responses.node,responses.spring,{paths,maxExamples:2});
 const serviceErrors=paths.flatMap(path=>['node','spring'].filter(side=>responses[side][path]?.status>=500).map(side=>({side,path,status:responses[side][path].status})));
 const comparisons=paths.map(path=>{
  const left=responses.node[path],right=responses.spring[path];
  const single=parityReport(responses.node,responses.spring,{paths:[path]});
  const result=single.notRun?'NOT_RUN':single.mismatches?'DIFFERENT':'EQUIVALENT';
  return {path,result,nodeStatus:left?.status??null,springStatus:right?.status??null,
   differenceDigest:result==='DIFFERENT'?hash({path,left:{status:left.status,body:canonical(left.body)},right:{status:right.status,body:canonical(right.body)}}):null};
 });
 return {format:'streamatlas-loopback-shadow-v1',status:parity.mismatches||serviceErrors.length?'FAIL':parity.notRun?'NOT RUN':'PASS',
  scope:'Only the selected read-only account contracts; no full service, authorization or database cutover acceptance',
  origins,paths:[...paths],limits:{timeoutMs,maxBytes,minIntervalMs},parity,comparisons,transport,serviceErrors,
  rollback:buildShadowCutoverPlan({parity,serviceHasAuthenticatedWrites:true}),
  cutoverApproved:false,fullAuthorizationParity:false,bodiesStored:false,credentialsStored:false};
}
