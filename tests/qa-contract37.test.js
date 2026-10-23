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


import {before,after} from 'node:test';
let f;
before(async()=>{f=await fixtureServer()});
after(()=>{if(f)f.stop()});
test('Checkpoint 37: previously undocumented admin endpoints deny anonymous/member roles and return reviewed shapes to admins',async()=>{
 try{
  const viewer=await login(f,'viewer'),admin=await login(f,'admin');
  const spec=JSON.parse(fs.readFileSync(path.join(root,'contracts/openapi.json'),'utf8'));
  const routes=['/api/admin/audit','/api/admin/catalog/duplicate-candidates','/api/admin/compliance/cases','/api/admin/creators','/api/admin/diagnostics','/api/admin/holds','/api/admin/jobs','/api/admin/media/revocations','/api/admin/reports','/api/admin/uploads','/api/admin/videos'];
  for(const route of routes){
   const guest=await fetch(f.base+route);assert.equal(guest.status,401,`guest ${route}`);
   const member=await fetch(f.base+route,{headers:{Cookie:viewer}});assert.equal(member.status,403,`member ${route}`);
   const authorized=await fetch(f.base+route,{headers:{Cookie:admin}});
   assert.equal(authorized.status,200,`admin ${route}: ${await authorized.clone().text()}`);
   const schema=spec.paths[route].get.responses['200'].content['application/json'].schema;
   shape(await authorized.json(),schema,spec.components.schemas,route);
  }
  for(const route of ['/api/me/compliance/cases','/api/studio/compliance/cases']){
   const guest=await fetch(f.base+route);assert.equal(guest.status,401);
   const user=await fetch(f.base+route,{headers:{Cookie:viewer}});assert.equal(user.status,200);
   shape(await user.json(),spec.paths[route].get.responses['200'].content['application/json'].schema,spec.components.schemas,route);
  }
 }finally{}
});

test('Checkpoint 37: sensitive mutations require CSRF, validate payloads and never claim provider success',async()=>{
 try{
  const member=await login(f,'viewer');const csrfState=await csrf(f.base);
  const headers={'X-Requested-With':'StreamAtlas','Content-Type':'application/json',Cookie:member+'; '+csrfState.cookie,'X-CSRF-Token':csrfState.token};
  const videoList=await (await fetch(f.base+'/api/videos?limit=1')).json();
  const videoId=videoList.items[0].id;
  const valid={videoId,category:'COPYRIGHT',details:'A synthetic test complaint for the private moderation workflow.'};
  const invalidCsrf=await fetch(f.base+'/api/compliance/cases',{method:'POST',headers:{'X-Requested-With':'StreamAtlas','Content-Type':'application/json',Cookie:member},body:JSON.stringify(valid)});
  assert.equal(invalidCsrf.status,403);
  const invalid=await fetch(f.base+'/api/compliance/cases',{method:'POST',headers,body:JSON.stringify({...valid,category:'NOT_REVIEWED'})});
  assert.equal(invalid.status,400);
  const validResponse=await fetch(f.base+'/api/compliance/cases',{method:'POST',headers,body:JSON.stringify(valid)});
  assert.equal(validResponse.status,201,await validResponse.clone().text());
  const schema=JSON.parse(fs.readFileSync(path.join(root,'contracts/openapi.json'),'utf8')).components.schemas;
  shape(await validResponse.json(),schema.ComplianceCaseCreated,schema);
  const cases=await fetch(f.base+'/api/me/compliance/cases',{headers:{Cookie:member}});
  assert.equal(cases.status,200);assert.ok((await cases.json()).items.some(x=>x.videoId===videoId));
  // No configured real provider or external verification is ever advertised as working.
  const off=await fetch(f.base+'/api/me/assurance/start',{method:'POST',headers,body:'{}'});assert.equal(off.status,503);
  const recover=await fetch(f.base+'/api/auth/password-reset/request',{method:'POST',headers,body:JSON.stringify({email:'none@example.invalid'})});assert.equal(recover.status,503);
  const metrics=await fetch(f.base+'/api/internal/metrics');assert.equal(metrics.status,503);
  const vendor=await fetch(f.base+'/api/integrations/age-verification/callback',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});assert.equal(vendor.status,503);
 }finally{}
});
