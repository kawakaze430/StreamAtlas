/** Operator-only status reconciliation of previously submitted CDN invalidations.
 * No actual AWS calls without explicit acknowledgement; never modifies media access
 * policy or claims that previously issued signed cookies have been revoked.
 */
import {spawnSync} from 'node:child_process';
import {requestedRevocations,confirmProviderInvalidation} from '../src/media-revocation.js';
const distribution=String(process.env.SA_CLOUDFRONT_DISTRIBUTION_ID||'');
if(process.env.SA_AWS_INVALIDATION_ACK!=='YES'||!/^E[A-Z0-9]{8,30}$/.test(distribution)){
 console.error('Refusing AWS calls: SA_AWS_INVALIDATION_ACK=YES and a valid CloudFront distribution ID are required.');
 process.exit(2);
}
const aws=process.env.SA_AWS_CLI_PATH||'aws';
const jobs=requestedRevocations(200),groups=new Map();
for(const job of jobs){
 if(!/^[A-Z0-9]{6,80}$/.test(job.providerRequestId||''))throw Error('Unsafe stored provider invalidation reference');
 const ref=job.providerRequestId;
 if(!groups.has(ref))groups.set(ref,[]);
 groups.get(ref).push(job);
}
let confirmed=0,pending=0,errors=0;
for(const [ref,group] of groups){
 const result=spawnSync(aws,['cloudfront','get-invalidation','--distribution-id',distribution,'--id',ref,'--output','json'],{encoding:'utf8',timeout:30000,maxBuffer:200000});
 if(result.error||result.status!==0){console.error('CloudFront status check failed; jobs remain REQUESTED.');errors++;continue}
 let body;try{body=JSON.parse(result.stdout)}catch{console.error('Unparseable CloudFront result; no transition.');errors++;continue}
 const item=body?.Invalidation;
 if(!item||item.Id!==ref||!['Completed','InProgress'].includes(item.Status)){
  console.error('Invalid CloudFront status or mismatched request ID; no transition.');errors++;continue;
 }
 if(item.Status==='InProgress'){pending+=group.length;continue}
 // Provider says complete. This STILL does not assert full viewer revocation or origin quarantine.
 try{confirmed+=confirmProviderInvalidation(group.map(x=>x.id),ref)}catch(e){console.error('Cannot reconcile provider status: '+e.message);errors++}
}
console.log(JSON.stringify({checked:groups.size,confirmed,pending,errors,providerInvalidationConfirmedOnly:true,viewerAccessRevocationVerified:false}));
if(errors)process.exitCode=1;
