import test from 'node:test';import assert from 'node:assert/strict';
import fs from 'node:fs';import path from 'node:path';import os from 'node:os';import {spawnSync} from 'node:child_process';
const root=path.resolve(import.meta.dirname,'..'),tmp=fs.mkdtempSync(path.join(os.tmpdir(),'revoke20-'));
process.env.DB_PATH=path.join(tmp,'db.sqlite');process.env.PRIVATE_PATH=path.join(tmp,'private');process.env.NODE_ENV='test';
const {one,run,now}=await import('../src/database.js');
const {queueVideoRevocation,pendingRevocations}=await import('../src/media-revocation.js');
const userId=Number(run('INSERT INTO users(email,name,created_at) VALUES(?,?,?)','revoke20@example.test','Operator',now()).lastInsertRowid);
const media='bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb';
run('INSERT INTO upload_sessions(id,user_id,video_id,original_filename,declared_type,expected_bytes,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?)',media,userId,1,'clip.mp4','video/mp4',1024,'PUBLISHED',now(),now());
function cli(extra={}){return spawnSync(process.execPath,['scripts/request-cdn-invalidations.js'],{cwd:root,encoding:'utf8',env:{...process.env,...extra}})}
test('20: private revocation queue persists source upload identifiers',()=>{
 assert.equal(queueVideoRevocation(1,'COPYRIGHT_HOLD'),1);
 assert.equal(pendingRevocations().length,1);
 assert.equal(pendingRevocations()[0].uploadId,media);
 assert.equal(queueVideoRevocation(9,'NO_MEDIA'),0);
});
test('20: AWS invalidation script refuses calls without explicit authorization',()=>{
 let p=cli({SA_AWS_INVALIDATION_ACK:'NO',SA_CLOUDFRONT_DISTRIBUTION_ID:'E12345678901'});
 assert.equal(p.status,2);assert.match(p.stderr,/Refusing AWS calls/);
 assert.equal(pendingRevocations().length,1);
});
test('20: failed provider call leaves outbox jobs recoverable',()=>{
 const fake=path.join(tmp,'aws-fail');fs.writeFileSync(fake,'#!/bin/sh\nexit 1\n',{mode:0o700});
 let p=cli({SA_AWS_INVALIDATION_ACK:'YES',SA_CLOUDFRONT_DISTRIBUTION_ID:'E12345678901',SA_AWS_CLI_PATH:fake});
 assert.equal(p.status,1);assert.equal(pendingRevocations().length,1);
});
test('20: confirmed simulated provider response transitions outbox exactly once',()=>{
 const fake=path.join(tmp,'aws-success');fs.writeFileSync(fake,'#!/bin/sh\nprintf \'{"Invalidation":{"Id":"I1234567890"}}\\n\'\n',{mode:0o700});
 let p=cli({SA_AWS_INVALIDATION_ACK:'YES',SA_CLOUDFRONT_DISTRIBUTION_ID:'E12345678901',SA_AWS_CLI_PATH:fake});
 assert.equal(p.status,0,p.stderr);assert.equal(pendingRevocations().length,0);
 assert.equal(one('SELECT status,provider_request_id AS providerRef FROM media_revocation_jobs').status,'REQUESTED');
 assert.equal(one('SELECT provider_request_id AS ref FROM media_revocation_jobs').ref,'I1234567890');
 assert.equal(JSON.parse(p.stdout).requested,1);
 const p2=cli({SA_AWS_INVALIDATION_ACK:'YES',SA_CLOUDFRONT_DISTRIBUTION_ID:'E12345678901',SA_AWS_CLI_PATH:fake});
 assert.equal(JSON.parse(p2.stdout).requested,0);
 fs.rmSync(tmp,{recursive:true,force:true});
});
