import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {planMultipartUpload,prepareMultipartCompletion,MIN_PART_BYTES,MAX_MULTIPART_BYTES} from '../src/multipart-contract.js';

const uploadId='12345678-1234-4123-8123-123456789abc';
const context={ownerId:7,uploadId};
const digest=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
function fixture(){
 const payload=Buffer.alloc(MIN_PART_BYTES+1024,0x61);
 const plan=planMultipartUpload({...context,expectedBytes:payload.length,expectedWholeFileSha256:digest(payload)});
 const receipts=plan.parts.map(p=>({partNumber:p.partNumber,bytes:p.bytes,sha256:digest(payload.subarray(p.offset,p.offset+p.bytes)),etag:`"opaque-part-${p.partNumber}"`}));
 return {payload,plan,receipts};
}

test('multipart planning preserves exact boundaries and private owner namespace',()=>{
 const {plan}=fixture();
 assert.equal(plan.objectKey,`private/uploads/7/${uploadId}/source`);
 assert.deepEqual(plan.parts,[{partNumber:1,offset:0,bytes:MIN_PART_BYTES},{partNumber:2,offset:MIN_PART_BYTES,bytes:1024}]);
 const small=planMultipartUpload({...context,expectedBytes:1024});
 assert.deepEqual(small.parts,[{partNumber:1,offset:0,bytes:1024}]);
 assert.deepEqual(planMultipartUpload({...context,expectedBytes:MAX_MULTIPART_BYTES}).parts.map(p=>p.bytes),Array(5).fill(MIN_PART_BYTES));
});
test('multipart planner rejects traversal, invalid owner, quotas and nonfinal undersized parts',()=>{
 for(const change of [{ownerId:0},{ownerId:'7'},{uploadId:'../source'},{expectedBytes:1023},{expectedBytes:MAX_MULTIPART_BYTES+1},{partBytes:MIN_PART_BYTES-1},{expectedWholeFileSha256:'not-a-digest'}]){
  assert.throws(()=>planMultipartUpload({...context,expectedBytes:2048,...change}));
 }
});
test('completion sorts out-of-order trusted receipts and preserves wire checksums',()=>{
 const {plan,receipts}=fixture();
 const result=prepareMultipartCompletion(plan,[...receipts].reverse(),context);
 assert.deepEqual(result.parts.map(p=>p.PartNumber),[1,2]);
 assert.equal(result.parts[0].ChecksumSHA256,Buffer.from(receipts[0].sha256,'hex').toString('base64'));
 assert.equal(result.parts[1].ETag,receipts[1].etag);
 assert.equal(result.wholeFileVerified,false);assert.equal(result.providerVerified,false);assert.equal(result.publicationAuthorized,false);
 const reordered={...plan,parts:plan.parts.map(p=>({bytes:p.bytes,offset:p.offset,partNumber:p.partNumber}))};
 assert.deepEqual(prepareMultipartCompletion(reordered,receipts,context),result);
});
test('S3 composite checksum is not mislabeled as a whole-file SHA-256',()=>{
 const {payload,plan,receipts}=fixture();
 const result=prepareMultipartCompletion(plan,receipts,context);
 const expected=crypto.createHash('sha256').update(Buffer.concat(receipts.map(p=>Buffer.from(p.sha256,'hex')))).digest('base64')+'-2';
 assert.equal(result.compositeChecksumSha256,expected);
 assert.notEqual(result.compositeChecksumSha256,Buffer.from(digest(payload),'hex').toString('base64'));
 assert.equal(result.expectedWholeFileSha256,digest(payload));
});
test('completion refuses partial, duplicate, out-of-range, truncated and ETag-only receipts',()=>{
 const {plan,receipts}=fixture();
 for(const bad of [receipts.slice(1),[receipts[0],receipts[0]],[receipts[0],{...receipts[1],partNumber:3}],[receipts[0],{...receipts[1],bytes:1}],[{...receipts[0],sha256:undefined},receipts[1]],[{...receipts[0],etag:'bad\r\nheader'},receipts[1]]]){
  assert.throws(()=>prepareMultipartCompletion(plan,bad,context));
 }
});
test('completion rejects cross-owner/context and changed plan boundaries',()=>{
 const {plan,receipts}=fixture();
 assert.throws(()=>prepareMultipartCompletion(plan,receipts,{...context,ownerId:8}));
 assert.throws(()=>prepareMultipartCompletion(plan,receipts,{...context,uploadId:crypto.randomUUID()}));
 const modified=structuredClone(plan);modified.parts[0].offset=1;
 assert.throws(()=>prepareMultipartCompletion(modified,receipts,context));
 assert.throws(()=>prepareMultipartCompletion({...plan,objectKey:'public/source'},receipts,context));
});
test('offline multipart CLI emits a usable plan and rejects invalid requests without network access',()=>{
 const script=new URL('../scripts/plan-multipart-upload.js',import.meta.url);
 const good=spawnSync(process.execPath,[script.pathname,'--owner','7','--upload',uploadId,'--bytes','1024'],{encoding:'utf8'});
 assert.equal(good.status,0,good.stderr);assert.equal(JSON.parse(good.stdout).parts.length,1);
 const bad=spawnSync(process.execPath,[script.pathname,'--owner','7','--upload','../other','--bytes','1024'],{encoding:'utf8'});
 assert.equal(bad.status,1);assert.match(bad.stderr,/rejected/);assert.equal(bad.stdout,'');
});
