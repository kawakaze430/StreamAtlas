/** Private-only S3 object staging contract. Never assumes permission to deploy. */
import path from 'node:path';
import {parseMediaExportKey} from './media-export-validation.js';
export function parsePrivateStageDestination(uri){
 if(typeof uri!=='string')throw Error('S3 destination is missing');
 const match=/^s3:\/\/([^/]+)\/(.+)$/.exec(uri);
 if(!match)throw Error('Expected s3://private-bucket/unique-prefix');
 const [,bucket,prefix]=match;
 if(bucket.length<3||bucket.length>63||!/^[a-z0-9][a-z0-9.-]*[a-z0-9]$/.test(bucket)||bucket.includes('..')||/^\d+\.\d+\.\d+\.\d+$/.test(bucket))throw Error('Invalid private bucket DNS name');
 if(prefix.length>160||prefix.startsWith('/')||prefix.endsWith('/')||!/^[A-Za-z0-9_./-]+$/.test(prefix)||prefix.split('/').some(x=>!x||x==='.'||x==='..')||prefix.includes('//'))throw Error('Unsafe S3 destination prefix');
 return {bucket,prefix};
}
export function stageObjectFromManifest(stage,asset,destination){
 const parts=parseMediaExportKey(asset?.key);
 if(!parts||typeof asset.sha256!=='string'||!/^[0-9a-f]{64}$/.test(asset.sha256)||!Number.isSafeInteger(asset.bytes)||asset.bytes<0)throw Error('Unverified source object');
 if(!path.isAbsolute(stage))throw Error('An absolute staged directory is required');
 if(!destination?.bucket||!destination?.prefix)throw Error('Missing private S3 destination');
 return {bucket:destination.bucket,key:`${destination.prefix}/${asset.key}`,source:path.join(stage,...asset.key.split('/')),bytes:asset.bytes,
  checksumBase64:Buffer.from(asset.sha256,'hex').toString('base64'),
  contentType:parts.name.endsWith('.m3u8')?'application/vnd.apple.mpegurl':parts.name.endsWith('.ts')?'video/mp2t':parts.name.endsWith('.mp4')?'video/mp4':parts.name.endsWith('.jpg')?'image/jpeg':parts.name.endsWith('.vtt')?'text/vtt':'application/json'};
}
export function inspectRemoteS3Head(head,expected,kmsKeyArn){
 if(!head||typeof head!=='object'||!Number.isSafeInteger(head.ContentLength)||head.ContentLength!==expected.bytes)return {valid:false,reason:'SIZE_MISMATCH'};
 if(head.ChecksumSHA256!==expected.checksumBase64)return {valid:false,reason:'CHECKSUM_MISSING_OR_DIFFERENT'};
 if(head.ServerSideEncryption!=='aws:kms'||head.SSEKMSKeyId!==kmsKeyArn)return {valid:false,reason:'KMS_MISMATCH'};
 return {valid:true,reason:'VERIFIED_REMOTE_OBJECT'};
}
export function validateKmsKeyArn(arn){
 if(typeof arn!=='string'||!/^arn:aws(?:-[a-z]+)?:kms:[a-z0-9-]+:\d{12}:key\/[A-Za-z0-9-]{8,120}$/.test(arn))throw Error('An explicit AWS KMS key ARN is required');
 return arn;
}
