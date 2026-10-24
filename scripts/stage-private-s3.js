/** OFFLINE by default. To use AWS: externally approved synthetic-private staging only.
 * Usage: node scripts/stage-private-s3.js /ABSOLUTE/STAGE s3://private-bucket/prefix arn:aws:kms:region:account:key/id [--verify|--upload]
 * Requires an existing v2 graph-verified staged export, isolated IAM and KMS.
 * NO command here grants viewer rights, public access, or an AWS deployment approval.
 */
import fs from 'node:fs';import path from 'node:path';import {spawnSync} from 'node:child_process';
import {parsePrivateStageDestination,stageObjectFromManifest,inspectRemoteS3Head,validateKmsKeyArn} from '../src/s3-staging-contract.js';
const [stageArg,targetArg,keyArg,...flags]=process.argv.slice(2);
if(!stageArg||!path.isAbsolute(stageArg))throw Error('Provide an absolute private export staging directory');
const stage=path.resolve(stageArg);
const destination=parsePrivateStageDestination(targetArg);
const kms=validateKmsKeyArn(keyArg);
if(flags.length>1||flags.some(f=>!['--verify','--upload'].includes(f)))throw Error('Only one of --verify or --upload is supported');
const mode=flags[0]||'--dry-run';
const child=spawnSync(process.execPath,[path.join(import.meta.dirname,'verify-media-export.js'),stage],{encoding:'utf8',timeout:30000,maxBuffer:200000});
if(child.status!==0)throw Error('Local export manifest failed verification. No AWS calls made.');
const manifest=JSON.parse(fs.readFileSync(path.join(stage,'manifest.json'),'utf8'));
if(!manifest||manifest.version!==2||manifest.productionApproval!==false||!Array.isArray(manifest.assets)||manifest.assets.length>10000)throw Error('Refusing unverified export manifest');
const targets=manifest.assets.map(asset=>stageObjectFromManifest(stage,asset,destination));
const summary={mode:mode.slice(2),objects:targets.length,totalBytes:targets.reduce((n,x)=>n+x.bytes,0),bucket:destination.bucket,prefix:destination.prefix,uploaded:0,verified:0,skipped:0,productionApproval:false};
if(mode==='--dry-run'){
 console.log(JSON.stringify({...summary,note:'Dry-run validated all v2 staged assets. No AWS commands or network calls were made.'}));
 process.exit(0);
}
if(process.env.SA_AWS_MEDIA_STAGE_APPROVED!=='YES_SYNTHETIC_PRIVATE_ONLY')throw Error('Synthetic-private operator approval environment variable required. No AWS calls made.');
if(mode==='--verify'&&process.env.SA_AWS_MEDIA_VERIFY_ACK!=='YES')throw Error('Read-only AWS verification requires SA_AWS_MEDIA_VERIFY_ACK=YES');
if(mode==='--upload'&&process.env.SA_AWS_MEDIA_COPY_ACK!=='YES')throw Error('Explicit SA_AWS_MEDIA_COPY_ACK=YES is required');
const aws=process.env.SA_AWS_CLI_PATH||'aws';
const invoke=args=>{
 const r=spawnSync(aws,args,{encoding:'utf8',timeout:60000,maxBuffer:500000,env:process.env});
 if(r.error)throw Error('AWS CLI unavailable or failed to execute: '+r.error.code);
 return r;
};
function head(target){
 const result=invoke(['s3api','head-object','--bucket',target.bucket,'--key',target.key,'--checksum-mode','ENABLED','--output','json']);
 if(result.status!==0){
  if(/(?:^|\W)(?:404|Not\s*Found|NoSuchKey)(?:\W|$)/i.test(result.stderr||''))return null;
  throw Error('Remote S3 head-object failed, not a confirmed 404. No writes performed for this object.');
 }
 try{return JSON.parse(result.stdout)}catch{throw Error('Invalid remote object metadata response')}
}
for(const target of targets){
 let current=head(target);
 if(current){
  const state=inspectRemoteS3Head(current,target,kms);
  if(!state.valid)throw Error('Pre-existing S3 object differs or is insufficiently verified: '+target.key+' ('+state.reason+'). Refusing overwrite.');
  summary.verified++;summary.skipped++;continue;
 }
 if(mode==='--verify')throw Error('Missing remote media object: '+target.key);
 const result=invoke(['s3api','put-object','--bucket',target.bucket,'--key',target.key,
  '--body',target.source,'--server-side-encryption','aws:kms','--ssekms-key-id',kms,
  '--checksum-algorithm','SHA256','--checksum-sha256',target.checksumBase64,
  '--content-type',target.contentType,'--cache-control','private, no-store, max-age=0','--output','json']);
 if(result.status!==0)throw Error('Private S3 object upload failed: '+target.key);
 current=head(target);
 const state=inspectRemoteS3Head(current,target,kms);
 if(!state.valid)throw Error('Post-upload S3 checksum, size or KMS mismatch: '+target.key+' ('+state.reason+'). Quarantine the stage; no release permitted.');
 summary.uploaded++;summary.verified++;
}
console.log(JSON.stringify({...summary,note:'Objects verified in private storage; no CloudFront delivery, rights/age or release approval implied.'}));
