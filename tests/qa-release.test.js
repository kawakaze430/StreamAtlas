import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';
const root=path.resolve(import.meta.dirname,'..');
test('A01 inventory paths and checksums match committed project',()=>{
 const i=JSON.parse(fs.readFileSync(path.join(root,'qa/inventory.json')));
 assert.ok(i.sourceFiles.length>130);
 const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
 for(const f of i.sourceFiles)assert.equal(sha(fs.readFileSync(path.join(root,f.path))),f.sha256,f.path);
});
test('A06 API contract includes video/search/auth and security responses',()=>{
 const spec=JSON.parse(fs.readFileSync(path.join(root,'contracts/openapi.json')));
 assert.equal(spec.openapi,'3.1.0');assert.ok(Object.keys(spec.paths).length>=35);
 for(const p of ['/api/health','/api/videos','/api/search/suggest','/api/auth/login','/api/me/library','/api/admin/overview'])assert.ok(spec.paths[p],p);
 assert.deepEqual(spec.paths['/api/admin/overview'].get.security,[{sessionCookie:[]}]);
 assert.ok(spec.paths['/api/videos'].get.responses['200'].content['application/json'].schema.$ref.includes('VideoList'));
});
test('A08 release manifest is reproducible, source only, deliberately not approved for production',()=>{
 const release=JSON.parse(fs.readFileSync(path.join(root,'qa/release-manifest.json')));
 assert.equal(release.releaseGate,'not-production-approved');assert.ok(release.sourceDigest.length===64);
 assert.ok(!Object.hasOwn(release,'createdAt'));
});
