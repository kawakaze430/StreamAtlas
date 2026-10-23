/** Operator-invoked AWS invalidation requester. OFF by default; never triggered
 * on an incoming user request. CloudFront invalidation is NOT an immediate
 * revocation of extant valid signed cookies: urgent holds also require origin
 * quarantine/key-group response and the short session TTL. */
import {spawnSync} from 'node:child_process';
import {pendingRevocations,markRevocationDone} from '../src/media-revocation.js';
const distribution=String(process.env.SA_CLOUDFRONT_DISTRIBUTION_ID||'');
if(process.env.SA_AWS_INVALIDATION_ACK!=='YES'||!/^E[A-Z0-9]{8,30}$/.test(distribution)){
 console.error('Refusing AWS calls: explicit SA_AWS_INVALIDATION_ACK=YES and valid SA_CLOUDFRONT_DISTRIBUTION_ID are required.');process.exit(2);
}
const aws=process.env.SA_AWS_CLI_PATH||'aws';
const pending=pendingRevocations(60);
let requested=0;
for(const uploadId of [...new Set(pending.map(x=>x.uploadId))]){
 if(!/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(uploadId))throw Error('Unsafe revocation reference');
 const group=pending.filter(x=>x.uploadId===uploadId);
 const result=spawnSync(aws,['cloudfront','create-invalidation','--distribution-id',distribution,'--paths',`/media/${uploadId}/*`,'--output','json'],{encoding:'utf8',timeout:30000,maxBuffer:200000});
 if(result.error||result.status!==0){console.error('Invalidation request failed; jobs retained as PENDING.');process.exitCode=1;continue}
 let body;try{body=JSON.parse(result.stdout)}catch{console.error('Unexpected provider response; jobs left pending.');process.exitCode=1;continue}
 const ref=String(body?.Invalidation?.Id||'');
 if(!/^[A-Z0-9]{6,80}$/.test(ref)){console.error('Provider did not return an invalidation ID; jobs retained.');process.exitCode=1;continue}
 markRevocationDone(group.map(x=>x.id),ref);requested++;
}
console.log(JSON.stringify({requested,pendingBefore:pending.length,warning:'Requests submitted, not necessarily completed. This does not immediately revoke existing signed cookies.'}));
