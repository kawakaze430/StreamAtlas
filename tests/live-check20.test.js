import test from 'node:test';import assert from 'node:assert/strict';import {spawnSync} from 'node:child_process';
const script='scripts/verify-private-deployment.js';
function call(env){return spawnSync(process.execPath,[script],{encoding:'utf8',env:{...process.env,...env}})}
test('20: live domain validation requires explicit operator opt-in and HTTPS',()=>{
 assert.equal(call({SA_EXTERNAL_PREVIEW_TEST_ACK:'NO'}).status,2);
 let r=call({SA_EXTERNAL_PREVIEW_TEST_ACK:'YES',SA_PREVIEW_URL:'http://somewhere.example/',SA_PREVIEW_BASIC_AUTH:'test:test'});
 assert.notEqual(r.status,0);assert.match(r.stderr,/HTTPS/);
 r=call({SA_EXTERNAL_PREVIEW_TEST_ACK:'YES',SA_PREVIEW_URL:'https://preview.example.test/',SA_PREVIEW_BASIC_AUTH:'test:test'});
 assert.notEqual(r.status,0);assert.match(r.stderr,/operator-owned DNS/);
});
