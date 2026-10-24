import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

const root=path.resolve(import.meta.dirname,'..'),tmp=fs.mkdtempSync(path.join(os.tmpdir(),'streamatlas-cdn45-'));
process.env.DB_PATH=path.join(tmp,'cdn.sqlite');process.env.PRIVATE_PATH=path.join(tmp,'private');process.env.NODE_ENV='test';
const {run,one,now}=await import('../src/database.js');
const {queueVideoRevocation,pendingRevocations,requestedRevocations,unresolvedRevocations,confirmProviderInvalidation,markRevocationDone}=await import('../src/media-revocation.js');
const userId=Number(run('INSERT INTO users(email,name,created_at) VALUES(?,?,?)','cdn45@example.test','Reviewer',now()).lastInsertRowid);
const media='4aaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa';
run('INSERT INTO upload_sessions(id,user_id,video_id,original_filename,declared_type,expected_bytes,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?)',media,userId,1,'synthetic.mp4','video/mp4',1234,'PUBLISHED',now(),now());
const script=path.join(tmp,'aws-status');
fs.writeFileSync(script,`#!/bin/sh\nif [ "$SA_FAKE_PROVIDER_ERROR" = "YES" ]; then exit 7; fi\nprintf '{"Invalidation":{"Id":"%s","Status":"%s"}}\\n' "${'${SA_FAKE_REF:-I1234567890}'}" "${'${SA_FAKE_STATUS:-InProgress}'}"\n`,{mode:0o700});
function cli(opts={}){return spawnSync(process.execPath,['scripts/verify-cdn-invalidations.js'],{cwd:root,encoding:'utf8',env:{...process.env,SA_AWS_CLI_PATH:script,...opts},timeout:4000});}
test('45: no verification without exact operator opt-in',()=>{
 queueVideoRevocation(1,'RIGHTS_HOLD');
 assert.equal(pendingRevocations().length,1);
 assert.equal(cli().status,2);
 assert.equal(pendingRevocations().length,1);
});
test('45: requested is neither CDN completed nor eligible for a duplicated outbox entry',()=>{
 const [job]=pendingRevocations();markRevocationDone([job.id],'I1234567890');
 assert.equal(requestedRevocations().length,1);
 assert.equal(pendingRevocations().length,0);
 queueVideoRevocation(1,'RIGHTS_HOLD');
 assert.equal(unresolvedRevocations().length,1);
 assert.equal(unresolvedRevocations()[0].status,'REQUESTED');
});
test('45: CloudFront InProgress is not a confirmed purge',()=>{
 const response=cli({SA_AWS_INVALIDATION_ACK:'YES',SA_CLOUDFRONT_DISTRIBUTION_ID:'E12345678901'});
 assert.equal(response.status,0,response.stderr);
 assert.equal(JSON.parse(response.stdout).pending,1);
 assert.equal(requestedRevocations().length,1);
});
test('45: wrong provider request, malformed provider response, and errors never confirm',()=>{
 for(const override of [{SA_FAKE_REF:'I9999999999',SA_FAKE_STATUS:'Completed'},{SA_FAKE_STATUS:'Bogus'},{SA_FAKE_PROVIDER_ERROR:'YES'}]){
  const response=cli({SA_AWS_INVALIDATION_ACK:'YES',SA_CLOUDFRONT_DISTRIBUTION_ID:'E12345678901',...override});
  assert.equal(response.status,1);
  assert.equal(requestedRevocations().length,1);
 }
});
test('45: verified provider completion transitions exactly once',()=>{
 const response=cli({SA_AWS_INVALIDATION_ACK:'YES',SA_CLOUDFRONT_DISTRIBUTION_ID:'E12345678901',SA_FAKE_STATUS:'Completed'});
 assert.equal(response.status,0,response.stderr);
 assert.equal(JSON.parse(response.stdout).confirmed,1);
 assert.equal(JSON.parse(response.stdout).viewerAccessRevocationVerified,false);
 assert.equal(requestedRevocations().length,0);
 assert.equal(one("SELECT status FROM media_revocation_jobs WHERE upload_id=?",media).status,'COMPLETED');
 const second=cli({SA_AWS_INVALIDATION_ACK:'YES',SA_CLOUDFRONT_DISTRIBUTION_ID:'E12345678901',SA_FAKE_STATUS:'Completed'});
 assert.equal(JSON.parse(second.stdout).checked,0);
 assert.throws(()=>confirmProviderInvalidation([1],'I1234567890'),/Invalidation job state changed/);
});
test('45: provider ID mismatch rolls back the entire batch atomically',()=>{
 queueVideoRevocation(1,'NEW_RIGHTS_HOLD');const [job]=pendingRevocations();
 markRevocationDone([job.id],'I1234567890');
 assert.throws(()=>confirmProviderInvalidation([job.id,987654321],'I1234567890'),/Invalidation job state changed/);
 assert.equal(one('SELECT status FROM media_revocation_jobs WHERE id=?',job.id).status,'REQUESTED');
});
