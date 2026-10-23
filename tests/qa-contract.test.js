import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import net from 'node:net';
import {spawn} from 'node:child_process';
import {createQaFixtures} from '../scripts/qa-fixtures.js';

const root=path.resolve(import.meta.dirname,'..');
async function port(){const s=net.createServer();await new Promise(r=>s.listen(0,'127.0.0.1',r));const p=s.address().port;await new Promise(r=>s.close(r));return p}
async function fixtureServer(){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'streamatlas-contract-'));
 const prior={NODE_ENV:process.env.NODE_ENV,SA_QA_FIXTURES:process.env.SA_QA_FIXTURES,DB_PATH:process.env.DB_PATH};
 process.env.NODE_ENV='test';process.env.SA_QA_FIXTURES='YES';
 const f=await createQaFixtures({dir});
 for(const [k,v] of Object.entries(prior)){if(v===undefined)delete process.env[k];else process.env[k]=v}
 const p=await port();const server=spawn(process.execPath,['src/server.js'],{cwd:root,env:{...process.env,NODE_ENV:'development',DB_PATH:f.dbPath,PRIVATE_PATH:path.join(dir,'private'),SA_DISABLE_WORKER:'1',PORT:String(p)},stdio:['ignore','ignore','pipe']});
 const base=`http://127.0.0.1:${p}`;let ready=false;let stderr='';server.stderr.on('data',x=>stderr+=x);
 for(let i=0;i<80;i++){try{if((await fetch(base+'/api/health')).ok){ready=true;break}}catch{}await new Promise(r=>setTimeout(r,75))}
 if(!ready){server.kill();fs.rmSync(dir,{recursive:true,force:true});throw Error(`QA server failed: ${stderr}`)}
 return {...f,base,server,stop:()=>{server.kill();fs.rmSync(dir,{recursive:true,force:true})}};
}
function shape(value,schema,definitions,pathName='root'){
 if(schema.$ref)return shape(value,definitions[schema.$ref.split('/').at(-1)],definitions,pathName);
 if(schema.anyOf){assert.ok(schema.anyOf.some(part=>{try{shape(value,part,definitions,pathName);return true}catch{return false}}));return}
 if(schema.type==='object'){assert.ok(value!==null&&typeof value==='object'&&!Array.isArray(value),`${pathName}: expected object`);for(const field of schema.required||[]){assert.ok(Object.hasOwn(value,field),`${pathName}: missing ${field}`)}for(const [field,sub] of Object.entries(schema.properties||{})){if(Object.hasOwn(value,field))shape(value[field],sub,definitions,`${pathName}.${field}`)}}
 if(schema.type==='array'){assert.ok(Array.isArray(value),`${pathName}: expected array`);for(const item of value.slice(0,3))shape(item,schema.items,definitions,pathName+'[]')}
 if(schema.type==='string')assert.equal(typeof value,'string',pathName);
 if(schema.type==='integer')assert.ok(Number.isInteger(value),pathName);
 if(schema.type==='boolean')assert.equal(typeof value,'boolean',pathName);
 if(schema.type==='null')assert.equal(value,null,pathName);
 if(schema.const!==undefined)assert.equal(value,schema.const,pathName);
}
async function csrf(base){const r=await fetch(base+'/api/security/csrf');return {token:(await r.json()).token,cookie:r.headers.get('set-cookie').split(';')[0]}}
async function login(f,role){const c=await csrf(f.base);const {email,password}=f.accounts[role];const r=await fetch(f.base+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json','X-Requested-With':'StreamAtlas','X-CSRF-Token':c.token,'Cookie':c.cookie},body:JSON.stringify({email,password})});assert.equal(r.status,200,`login ${role}: ${await r.text()}`);return r.headers.get('set-cookie').split(';')[0]}

test('A04 fixture builder refuses non-test environments and existing DBs',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'streamatlas-qa-guard-'));const prev=process.env.NODE_ENV,ack=process.env.SA_QA_FIXTURES;
 try{process.env.NODE_ENV='production';process.env.SA_QA_FIXTURES='YES';await assert.rejects(createQaFixtures({dir}),/require NODE_ENV=test/);
 process.env.NODE_ENV='test';delete process.env.SA_QA_FIXTURES;await assert.rejects(createQaFixtures({dir}),/SA_QA_FIXTURES/);
 }finally{if(prev===undefined)delete process.env.NODE_ENV;else process.env.NODE_ENV=prev;if(ack===undefined)delete process.env.SA_QA_FIXTURES;else process.env.SA_QA_FIXTURES=ack;fs.rmSync(dir,{recursive:true,force:true})}
});
test('A06 OpenAPI and behavior: public read shapes, authentication and role boundaries',async()=>{
 const f=await fixtureServer();
 try{
  const spec=JSON.parse(fs.readFileSync(path.join(root,'contracts/openapi.json'),'utf8'));
  assert.equal(spec.openapi,'3.1.0');assert.ok(Object.keys(spec.paths).length>=30);
  for(const endpoint of ['/api/health','/api/ready','/api/auth/me','/api/home','/api/videos','/api/search/suggest?q=ama','/api/categories','/api/performers','/api/sites','/api/networks','/api/channels']){
   const r=await fetch(f.base+endpoint);assert.equal(r.status,200,endpoint);const data=await r.json();const schema=spec.paths[endpoint.split('?')[0]].get.responses['200'].content['application/json'].schema;shape(data,schema,spec.components.schemas,endpoint);
  }
  const r=await fetch(f.base+'/api/videos?limit=3');const list=await r.json();assert.equal(list.items.length,3);assert.equal(list.total,72);
  const video=await fetch(f.base+'/api/videos/'+list.items[0].slug);shape(await video.json(),spec.components.schemas.Video,spec.components.schemas);
  const notSigned=await fetch(f.base+'/api/me/library');assert.equal(notSigned.status,401);
  const viewer=await login(f,'viewer');const creator=await login(f,'creator');const mod=await login(f,'moderator');const admin=await login(f,'admin');
  const me=await fetch(f.base+'/api/auth/me',{headers:{Cookie:viewer}});assert.equal((await me.json()).user.role,'MEMBER');
  const created=await fetch(f.base+'/api/studio/overview',{headers:{Cookie:creator}});assert.equal(created.status,200);
  for(const c of [viewer,creator,mod]){const r=await fetch(f.base+'/api/admin/overview',{headers:{Cookie:c}});assert.equal(r.status,403,'non-admin boundary')}
  const allowed=await fetch(f.base+'/api/admin/overview',{headers:{Cookie:admin}});assert.equal(allowed.status,200);
  const noCsrf=await fetch(f.base+'/api/me/library/toggle',{method:'POST',headers:{'Content-Type':'application/json','X-Requested-With':'StreamAtlas',Cookie:viewer},body:JSON.stringify({type:'favorite',videoId:list.items[0].id})});assert.equal(noCsrf.status,403);
  const other=await fetch(f.base+'/api/me/library',{headers:{Cookie:creator}});assert.equal((await other.json()).items.length,0);
 }finally{f.stop()}
});

test('Checkpoint 37 sensitive contracts describe transport, authorization and bounded inputs',()=>{
 const spec=JSON.parse(fs.readFileSync(path.join(root,'contracts/openapi.json'),'utf8'));
 const count=Object.values(spec.paths).reduce((n,verbs)=>n+Object.keys(verbs).length,0);
 assert.ok(count>=184,`Expected reviewed dynamic upload contracts, got ${count}`);
 for(const route of ['/api/admin/uploads','/api/admin/audit','/api/admin/compliance/cases','/api/studio/uploads/initiate','/api/compliance/cases','/api/me/mfa/enroll'])assert.ok(spec.paths[route]);
 for(const route of ['/api/admin/uploads','/api/admin/audit','/api/admin/compliance/cases']){
  assert.deepEqual(spec.paths[route].get.security,[{sessionCookie:[]}]);
  assert.equal(spec.paths[route].get.responses['200'].content['application/json'].schema.$ref,'#/components/schemas/Items');
 }
 const metrics=spec.paths['/api/internal/metrics'].get;
 assert.deepEqual(metrics.security,[{metricsBearer:[]}]);
 assert.ok(metrics.responses['200'].content['text/plain']);
 assert.equal(metrics.responses['200'].content['application/json'],undefined);
 const webhook=spec.paths['/api/integrations/age-verification/callback'].post;
 assert.deepEqual(webhook.security,[{verificationWebhookSignature:[]}]);
 assert.equal(spec.components.securitySchemes.verificationWebhookSignature.name,'x-sa-event-signature');
 const upload=spec.components.schemas.UploadInitiateInput;
 assert.ok(upload.required.includes('consentDeclaration'));
 assert.equal(upload.properties.size.maximum,26214400);
 const intake=spec.components.schemas.ComplianceCaseInput;
 assert.equal(intake.properties.details.minLength,25);
 for(const route of ['/api/me/assurance/start','/api/me/email/request-verification','/api/me/sessions/revoke-others'])assert.equal(spec.paths[route].post.requestBody,undefined);
});

