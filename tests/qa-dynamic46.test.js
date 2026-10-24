import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {inspectProject,inspectSource,verifyDynamicRoutes} from '../scripts/qa-dynamic-routes.js';
const root=path.resolve(import.meta.dirname,'..');
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const base=()=>read('qa/dynamic-route-reviewed-baseline.json');
const spec=()=>read('contracts/openapi.json');
function fixture(t){
 const temporary=fs.mkdtempSync(path.join(os.tmpdir(),'sa-dynamic-contract-'));
 for(const directory of ['src','qa','contracts','scripts'])fs.mkdirSync(path.join(temporary,directory));
 for(const file of fs.readdirSync(path.join(root,'src')).filter(x=>x.endsWith('.js')))fs.copyFileSync(path.join(root,'src',file),path.join(temporary,'src',file));
 for(const file of ['qa/dynamic-route-reviewed-baseline.json','contracts/openapi.json','scripts/qa-dynamic-routes.js'])fs.copyFileSync(path.join(root,file),path.join(temporary,file));
 t.after(()=>fs.rmSync(temporary,{recursive:true,force:true}));return temporary;
}
const check=root=>spawnSync(process.execPath,['scripts/qa-dynamic-routes.js','--strict'],{cwd:root,encoding:'utf8'});

test('reviewed current-source matcher gate passes without claiming typed behavior parity',()=>{
 const result=verifyDynamicRoutes();assert.equal(result.passed,true,JSON.stringify(result.errors));assert.equal(result.regexMatchers,62);assert.equal(result.sourceModules,8);assert.equal(result.reviewedDynamicOperations,76);assert.equal(result.typedSchemaParityComplete,false);
 const shadow=base().modules.find(m=>m.source==='src/roadmap44-migration.js');assert.equal(shadow.matchers[0].role,'shadow-path-validation');assert.deepEqual(shadow.matchers[0].operations,[]);
});
test('an unreviewed regex route in an existing module fails the executable gate',t=>{
 const tmp=fixture(t);fs.appendFileSync(path.join(tmp,'src/server.js'),"\nconst unreviewed=p.match(/^\\/api\\/new-feature\\/(\\d+)$/);if(method==='POST'&&unreviewed){}\n");
 const result=check(tmp);assert.equal(result.status,1);assert.match(result.stdout,/unreviewed API matcher/);
});
test('an added API .test route in a newly discovered module cannot evade the gate',t=>{
 const tmp=fixture(t);fs.writeFileSync(path.join(tmp,'src/new-router.js'),"export function route(p,method){if(/^\\/API\\/unreviewed\\/(\\d+)$/i.test(p)&&method==='GET')return true}\n");
 const result=check(tmp);assert.equal(result.status,1);assert.match(result.stdout,/unreviewed API regexes/);
});
test('a new allowed HTTP method on an existing matcher invalidates source review',t=>{
 const tmp=fixture(t),file=path.join(tmp,'src/server.js');fs.writeFileSync(file,fs.readFileSync(file,'utf8').replace("if(method==='GET'&&videoMatch)","if((method==='GET'||method==='PATCH')&&videoMatch)"));
 const result=check(tmp);assert.equal(result.status,1);assert.match(result.stdout,/routing predicates\/methods changed/);
});
test('a changed API capture or dispatch expression requires source re-review',t=>{
 const tmp=fixture(t),file=path.join(tmp,'src/server.js');fs.writeFileSync(file,fs.readFileSync(file,'utf8').replace('queue\\/(\\d+)$/','queue\\/([a-z0-9]+)$/'));
 const result=check(tmp);assert.equal(result.status,1);assert.match(result.stdout,/unreviewed API matcher/);
});
test('a missing mapped OpenAPI operation or path parameter fails, rather than counting path-only coverage',()=>{
 let changed=spec();delete changed.paths['/api/me/playlists/{id}'].patch;
 let result=verifyDynamicRoutes({spec:changed});assert.equal(result.passed,false);assert.ok(result.errors.some(x=>x.includes('PATCH /api/me/playlists/{id}: missing')));
 changed=spec();changed.paths['/api/media/{id}/{file}'].get.parameters=[];
 result=verifyDynamicRoutes({spec:changed});assert.equal(result.passed,false);assert.ok(result.errors.some(x=>x.includes('missing required path parameter file')));
});
test('baseline mappings cannot omit a source-inferred method branch',()=>{
 const baseline=base();const entry=baseline.modules.find(m=>m.source==='src/server.js').matchers.find(m=>m.operations.some(o=>o.path==='/api/me/playlists/{id}'));
 entry.operations=entry.operations.filter(o=>o.method!=='PATCH');
 const result=verifyDynamicRoutes({baseline});assert.equal(result.passed,false);assert.ok(result.errors.some(x=>x.includes('source method PATCH is missing')));
});
test('invalid route examples and orphaned reviewed matcher entries fail closed',()=>{
 const baseline=base();baseline.modules[0].matchers[0].operations[0].examples=['/api/unrelated/1'];
 let result=verifyDynamicRoutes({baseline});assert.equal(result.passed,false);assert.ok(result.errors.some(x=>x.includes('does not match current API regex')));
 const orphan=base();orphan.modules[0].matchers.push({...orphan.modules[0].matchers[0],id:'missing-reviewed-matcher'});
 result=verifyDynamicRoutes({baseline:orphan});assert.equal(result.passed,false);assert.ok(result.errors.some(x=>x.includes('no longer exists')));
});
test('computed/indirect routing, malformed regexes and stateful regexes are rejected',()=>{
 for(const source of ["const route=p.match(new RegExp('/api/new'));", "if(router.test(p)){}", "const route=p.match(/^\\/(?:a)pi\\/hidden$/);", "const route=p.match(/^\\/api\\/new/g);", "const route=p.match(/^\\/api\\/broken\n"]){assert.throws(()=>inspectSource(source,'src/new.js'));}
});
test('comments, source line movement and worker-only implementation changes do not grant or invalidate route reviews',()=>{
 const file='src/uploads.js',source=fs.readFileSync(path.join(root,file),'utf8'),before=inspectSource(source,file);
 const after=inspectSource("// p.match(/^\\/api\\/comment-only$/) is not executable\n"+source+"\nfunction workerOnly(epoch){if(epoch>2)return epoch+1;return 0}\n",file);
 assert.equal(after.routePolicySha256,before.routePolicySha256);assert.deepEqual(after.matchers.map(x=>x.id),before.matchers.map(x=>x.id));
});
test('all reviewed operations reference current schemas and binary media contracts do not masquerade as JSON',()=>{
 const current=spec();
 for(const route of ['/api/admin/uploads/{id}/preview/{file}','/api/studio/uploads/{id}/preview/{file}','/api/media/{id}/{file}']){
  const get=current.paths[route].get,head=current.paths[route].head;assert.ok(get.responses['200'].content);assert.equal(get.responses['200'].content['application/json'],undefined);assert.equal(head.responses['200'].content,undefined);assert.ok(get.responses['206']);assert.ok(get.responses['416']);
  const file=get.parameters.find(x=>x.name==='file');assert.ok(file.required);assert.ok(file.schema.pattern);
 }
 assert.equal(current.paths['/api/admin/catalog/duplicate-candidates/decision'].post.responses['201'].content['application/json'].schema.$ref,'#/components/schemas/Ok');
 assert.equal(current.paths['/api/me/playlists/{id}/videos'].delete.requestBody.content['application/json'].schema.$ref,'#/components/schemas/PlaylistRemoveInput');
 assert.equal(current.paths['/api/admin/comments/{id}/visibility'].patch.requestBody.content['application/json'].schema.$ref,'#/components/schemas/CommentVisibilityInput');
 assert.ok(inspectProject().every(m=>m.predicates.length));
});
