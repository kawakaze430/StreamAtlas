import test from 'node:test';import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import crypto from 'node:crypto';import {spawnSync} from 'node:child_process';
import {parsePrivateStageDestination,stageObjectFromManifest,inspectRemoteS3Head,validateKmsKeyArn} from '../src/s3-staging-contract.js';
import {mediaExportKey} from '../src/media-export-validation.js';
const root=path.resolve(import.meta.dirname,'..'),id='dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const kms='arn:aws:kms:ap-south-1:123456789012:key/12345678-1234-1234-1234-123456789012';
const source={
 'master.m3u8':'#EXTM3U\n#EXT-X-STREAM-INF:BANDWIDTH=123000\nlo.m3u8\n#EXT-X-STREAM-INF:BANDWIDTH=500000\nhi.m3u8\n',
 'hi.m3u8':'#EXTM3U\n#EXTINF:2,\nhi_seg_000.ts\n',
 'lo.m3u8':'#EXTM3U\n#EXTINF:2,\nlo_seg_000.ts\n',
 'hi_seg_000.ts':'synthetic_hi_segment','lo_seg_000.ts':'synthetic_lo_segment',
 'playback.mp4':'synthetic_main_mp4','low.mp4':'synthetic_low_mp4','poster.jpg':'synthetic_poster'
};
function fixture(){const rootDir=fs.mkdtempSync(path.join(os.tmpdir(),'sa43-'));const stage=path.join(rootDir,'stage');const media=path.join(stage,'media',id);fs.mkdirSync(media,{recursive:true});
 const assets=Object.entries(source).map(([name,contents])=>{fs.writeFileSync(path.join(media,name),contents);return {key:mediaExportKey(id,name),videoId:12,slug:'synthetic',bytes:Buffer.byteLength(contents),sha256:crypto.createHash('sha256').update(contents).digest('hex')}});
 const manifest={version:2,productionApproval:false,videos:1,files:assets.length,totalBytes:assets.reduce((s,a)=>s+a.bytes,0),videoRecords:[{uploadId:id,videoId:12,slug:'synthetic',renditions:2,segments:2}],assets};
 fs.writeFileSync(path.join(stage,'manifest.json'),JSON.stringify(manifest));return {rootDir,stage,manifest};
}
const run=(stage,flag,env={})=>spawnSync(process.execPath,['scripts/stage-private-s3.js',stage,'s3://private-videos-test/review/2026',kms,...(flag?[flag]:[])],{cwd:root,env:{...process.env,...env},encoding:'utf8',timeout:25000});
test('43: private S3 path, key, checksum and KMS requirements fail closed',()=>{
 assert.deepEqual(parsePrivateStageDestination('s3://private-videos-test/review/2026'),{bucket:'private-videos-test',prefix:'review/2026'});
 for(const bad of ['s3://mybucket/../x','s3://mybucket/a//b','s3://mybucket/','s3://192.168.1.5/x','http://bucket/prefix','s3://MyBucket/x'])assert.throws(()=>parsePrivateStageDestination(bad));
 assert.equal(validateKmsKeyArn(kms),kms);assert.throws(()=>validateKmsKeyArn('alias/kms'));
 const object=stageObjectFromManifest('/tmp/stage',{key:mediaExportKey(id,'hi_seg_000.ts'),sha256:'a'.repeat(64),bytes:8},{bucket:'private-videos-test',prefix:'review/2026'});
 assert.equal(object.contentType,'video/mp2t');assert.equal(object.key,`review/2026/media/${id}/hi_seg_000.ts`);
 const good={ContentLength:8,ChecksumSHA256:object.checksumBase64,ServerSideEncryption:'aws:kms',SSEKMSKeyId:kms};
 assert.equal(inspectRemoteS3Head(good,object,kms).valid,true);
 for(const field of ['ContentLength','ChecksumSHA256','ServerSideEncryption','SSEKMSKeyId']){const tampered={...good,[field]:'bad'};assert.equal(inspectRemoteS3Head(tampered,object,kms).valid,false,field)}
});
test('43: default stage preview validates all objects without contacting cloud or requiring credentials',()=>{
 const {rootDir,stage}=fixture();try{
  const r=run(stage);assert.equal(r.status,0,r.stderr);const report=JSON.parse(r.stdout);
  assert.equal(report.objects,8);assert.equal(report.mode,'dry-run');assert.equal(report.productionApproval,false);
  const denied=run(stage,'--upload',{SA_AWS_CLI_PATH:'/nonexistent/aws'});assert.notEqual(denied.status,0);assert.match(denied.stderr,/approval environment variable/i);
  fs.appendFileSync(path.join(stage,'media',id,'hi_seg_000.ts'),'changed');
  const tampered=run(stage);assert.notEqual(tampered.status,0);assert.match(tampered.stderr,/manifest failed verification/i);
 }finally{fs.rmSync(rootDir,{recursive:true,force:true})}
});
test('43: mock private S3 provider verifies SHA-256/KMS, skips identical objects and fails on mismatches',()=>{
 const {rootDir,stage}=fixture();try{
  const mock=path.join(rootDir,'mock-aws.js'),state=path.join(rootDir,'remote.json');
  fs.writeFileSync(mock,`#!/usr/bin/env node\nconst fs=require('node:fs'),crypto=require('node:crypto');let a=process.argv.slice(2),name=a[1],val=k=>a[a.indexOf(k)+1];const file=process.env.SA_MOCK_S3_STATE;const state=fs.existsSync(file)?JSON.parse(fs.readFileSync(file)):{},key=val('--key');if(a[0]!=='s3api')process.exit(3);if(name==='head-object'){if(!state[key]){console.error('Not Found');process.exit(255)}console.log(JSON.stringify(state[key]));process.exit(0)}if(name==='put-object'){const body=fs.readFileSync(val('--body')),hash=crypto.createHash('sha256').update(body).digest('base64');if(hash!==val('--checksum-sha256'))process.exit(2);state[key]={ContentLength:body.length,ChecksumSHA256:hash,ServerSideEncryption:val('--server-side-encryption'),SSEKMSKeyId:val('--ssekms-key-id')};fs.writeFileSync(file,JSON.stringify(state));console.log('{}');process.exit(0)}process.exit(4);`);fs.chmodSync(mock,0o755);
  const env={SA_AWS_CLI_PATH:mock,SA_MOCK_S3_STATE:state,SA_AWS_MEDIA_STAGE_APPROVED:'YES_SYNTHETIC_PRIVATE_ONLY',SA_AWS_MEDIA_COPY_ACK:'YES',SA_AWS_MEDIA_VERIFY_ACK:'YES'};
  const first=run(stage,'--upload',env);assert.equal(first.status,0,first.stderr);assert.equal(JSON.parse(first.stdout).uploaded,8);
  const next=run(stage,'--upload',env);assert.equal(next.status,0,next.stderr);assert.equal(JSON.parse(next.stdout).skipped,8);
  const verified=run(stage,'--verify',env);assert.equal(verified.status,0,verified.stderr);
  const data=JSON.parse(fs.readFileSync(state));data[Object.keys(data)[0]].ChecksumSHA256='bad';fs.writeFileSync(state,JSON.stringify(data));
  const mismatch=run(stage,'--upload',env);assert.notEqual(mismatch.status,0);assert.match(mismatch.stderr,/Refusing overwrite/);
 }finally{fs.rmSync(rootDir,{recursive:true,force:true})}
});
