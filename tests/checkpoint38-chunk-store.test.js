import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {storeUploadChunk} from '../src/upload-chunk-store.js';

function withTemp(fn){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'sa38-chunk-'));try{return fn(path.join(dir,'part'))}finally{fs.rmSync(dir,{recursive:true,force:true})}}
const chunk=Buffer.from('synthetic-safe-bytes-for-upload');

test('E01: chunk spool accepts exact replay without double-appending',()=>withTemp(file=>{
 const first=storeUploadChunk(file,{offset:0,receivedBytes:0,expectedBytes:1000,chunk});
 assert.equal(first.idempotent,false);assert.equal(first.receivedBytes,chunk.length);
 const replay=storeUploadChunk(file,{offset:0,receivedBytes:chunk.length,expectedBytes:1000,chunk});
 assert.equal(replay.idempotent,true);assert.deepEqual(fs.readFileSync(file),chunk);
 assert.throws(()=>storeUploadChunk(file,{offset:0,receivedBytes:chunk.length,expectedBytes:1000,chunk:Buffer.from('different')}),{status:409});
}));

test('E01: disk-ahead interrupted append resumes only with matching bytes',()=>withTemp(file=>{
 fs.writeFileSync(file,chunk.subarray(0,12));
 assert.throws(()=>storeUploadChunk(file,{offset:0,receivedBytes:0,expectedBytes:1000,chunk:Buffer.from('mismatched bytes')}),{status:409});
 assert.deepEqual(fs.readFileSync(file),chunk.subarray(0,12));
 const result=storeUploadChunk(file,{offset:0,receivedBytes:0,expectedBytes:1000,chunk});
 assert.equal(result.recoveredBytes,12);assert.equal(result.idempotent,false);assert.deepEqual(fs.readFileSync(file),chunk);
}));

test('E01: corrupted, shorter-than-committed and extra-spool state always fail closed',()=>withTemp(file=>{
 fs.writeFileSync(file,chunk.subarray(0,7));
 assert.throws(()=>storeUploadChunk(file,{offset:7,receivedBytes:12,expectedBytes:1000,chunk}),{status:409});
 assert.throws(()=>storeUploadChunk(file,{offset:1,receivedBytes:0,expectedBytes:1000,chunk}),{status:409});
 assert.throws(()=>storeUploadChunk(file,{offset:0,receivedBytes:0,expectedBytes:10,chunk}),{status:409});
 assert.throws(()=>storeUploadChunk(file,{offset:0,receivedBytes:0,expectedBytes:1000,chunk:Buffer.from('tiny')}),{status:409});
}));

test('E01: spool refuses symlinks and prevents target-file writes',()=>withTemp(file=>{
 const target=file+'.other';fs.writeFileSync(target,Buffer.from('protected'));
 fs.symlinkSync(target,file);
 assert.throws(()=>storeUploadChunk(file,{offset:0,receivedBytes:0,expectedBytes:1000,chunk}),{status:409});
 assert.equal(fs.readFileSync(target,'utf8'),'protected');
}));
