/** Read-only live TLS/DNS verification for an operator-owned PRIVATE synthetic
 * deployment. NO AWS mutations, NO third-party probing. Mandatory opt-in.
 */
import dns from 'node:dns/promises';
const ack=process.env.SA_EXTERNAL_PREVIEW_TEST_ACK;
if(ack!=='YES'){
 console.error('Private deployment check disabled: SA_EXTERNAL_PREVIEW_TEST_ACK=YES required.');process.exit(2);
}
function target(raw){
 let u;try{u=new URL(raw)}catch{throw Error('Provide a valid HTTPS preview hostname')}
 if(u.protocol!=='https:'||u.username||u.password||u.search||u.hash||u.pathname!=='/'||u.port||!u.hostname.includes('.'))throw Error('Only an HTTPS domain root is allowed');
 if(/(?:\.local|\.invalid|\.test)$/.test(u.hostname))throw Error('The live audit requires an actual operator-owned DNS hostname');
 return u;
}
const preview=target(process.env.SA_PREVIEW_URL);
if(!process.env.SA_PREVIEW_BASIC_AUTH||!process.env.SA_PREVIEW_BASIC_AUTH.includes(':'))throw Error('The private preview must have operator-provided basic auth');
const [host]=await dns.lookup(preview.hostname,{all:true});if(!host)throw Error('Preview DNS resolution failed');
const headers={Authorization:'Basic '+Buffer.from(process.env.SA_PREVIEW_BASIC_AUTH).toString('base64')};
async function check(endpoint,auth=false){const response=await fetch(new URL(endpoint,preview),{headers:auth?headers:{},redirect:'manual',signal:AbortSignal.timeout(12000)});await response.arrayBuffer();return response.status}
const unauthorized=await check('/api/ready');
if(unauthorized!==401)throw Error('Private gateway failed: unauthenticated readiness must return 401, received '+unauthorized);
const ready=await check('/api/ready',true);if(ready!==200)throw Error('Authenticated HTTPS readiness failed, status '+ready);
const site=await check('/',true);if(site!==200)throw Error('Authenticated homepage failed, status '+site);
const report={previewHost:preview.hostname,dnsResolved:true,httpsCertificateTrusted:true,unauthenticatedDenied:true,authenticatedReady:true,homepageAvailable:true};
if(process.env.SA_PRIVATE_CDN_URL){const media=target(process.env.SA_PRIVATE_CDN_URL);const uploadId=process.env.SA_PRIVATE_CDN_PROBE_UPLOAD_ID;
 if(!/^[a-f0-9]{8}-[a-f0-9-]{27}$/i.test(uploadId||''))throw Error('Provide a synthetic-media CDN probe UUID');
 const res=await fetch(new URL(`/media/${uploadId}/master.m3u8`,media),{redirect:'manual',signal:AbortSignal.timeout(12000)});await res.arrayBuffer();
 if(res.status!==403)throw Error('CDN unsigned access MUST return 403; got '+res.status);
 report.unsignedMediaDenied=true;
}
console.log(JSON.stringify({...report,warning:'Live private synthetic test only. This does not establish public launch or age/rights compliance.'},null,2));
