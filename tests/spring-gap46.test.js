import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {inspect} from '../scripts/spring-contract-gap.js';

function fixture(t,files){
 const repoRoot=fs.mkdtempSync(path.join(os.tmpdir(),'sa-spring-gap46-'));
 t.after(()=>fs.rmSync(repoRoot,{recursive:true,force:true}));
 const controllers=path.join(repoRoot,'backend-spring/src/main/java/example/streamatlas/catalog');
 fs.mkdirSync(controllers,{recursive:true});fs.mkdirSync(path.join(repoRoot,'contracts'));
 fs.writeFileSync(path.join(repoRoot,'contracts/openapi.json'),JSON.stringify({paths:{'/api/me':{get:{}},'/other':{post:{}}}}));
 for(const [file,source]of Object.entries(files))fs.writeFileSync(path.join(controllers,file),source);
 return {repoRoot,controllers};
}

test('46: static Spring inventory includes both authenticated reads and preserves seven catalog operations',()=>{
 const report=inspect();
 assert.deepEqual(report.controllerFiles,['CatalogController.java','SessionAccountController.java']);
 assert.equal(report.springOperations,9);
 assert.ok(report.matchingOperations.includes('GET /api/auth/me'));
 assert.ok(report.matchingOperations.includes('GET /api/me/preferences'));
 assert.equal(report.springRoutes.filter(route=>route.startsWith('GET /api/v1/catalog/')).length,7);
 for(const suffix of['health','videos','videos/{slug}','categories','networks','sites','performers'])
  assert.ok(report.springRoutes.includes(`GET /api/v1/catalog/${suffix}`));
 assert.equal(report.authAndUploadParityVerified,false);
 assert.equal(report.behavioralParityVerified,false);
 assert.equal(report.readyForCutover,false);
});

test('46: each controller has its own static prefix and comment/string annotations are ignored',t=>{
 const options=fixture(t,{
  'AccountController.java':'// @RequestMapping("/wrong")\n@RestController\n@RequestMapping(path = "/api")\npublic class AccountController { @GetMapping(value = "/me") Object me(){ return "@PostMapping(\\"/fake\\")"; } }',
  'OtherController.java':'/* @RequestMapping("/wrong") */ public class OtherController { @PostMapping("/other") Object post(){return null;} }',
  'NotAControllerService.java':'public class NotAControllerService { @GetMapping("/ignored") Object x(){return null;} }',
 });
 fs.mkdirSync(path.join(options.controllers,'nested'));
 fs.writeFileSync(path.join(options.controllers,'nested','NestedController.java'),'public class NestedController { @GetMapping("/nested") Object x(){return null;} }');
 const report=inspect(options);
 assert.deepEqual(report.springRoutes,['GET /api/me','POST /other']);
 assert.deepEqual(report.matchingOperations,['GET /api/me','POST /other']);
});

test('46: computed paths and method RequestMapping fail closed instead of silently disappearing',t=>{
 const options=fixture(t,{'ExampleController.java':'public class ExampleController { @GetMapping(API_PATH) Object x(){return null;} }'});
 const file=path.join(options.controllers,'ExampleController.java');
 assert.throws(()=>inspect(options),/Unsupported nonliteral Spring mapping/);
 fs.writeFileSync(file,'public class ExampleController { @RequestMapping("/api/me") Object x(){return null;} }');
 assert.throws(()=>inspect(options),/Unsupported method RequestMapping/);
 fs.writeFileSync(file,'@RequestMapping(BASE_PATH) public class ExampleController { @GetMapping("/me") Object x(){return null;} }');
 assert.throws(()=>inspect(options),/Unsupported nonliteral Spring mapping/);
});
