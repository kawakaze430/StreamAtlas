import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {spawn} from 'node:child_process';
import {executeShadowReads,SHADOW_READ_PATHS} from '../src/shadow-read.js';
import {accountParityConfiguration} from '../scripts/test-spring-account-parity-disposable.js';

const ack={acknowledgeReadOnly:true,syntheticOnly:true};
async function server(handler){
 const instance=http.createServer(handler);
 await new Promise(resolve=>instance.listen(0,'127.0.0.1',resolve));
 return {origin:`http://127.0.0.1:${instance.address().port}`,close:()=>new Promise(resolve=>{instance.closeAllConnections();instance.close(resolve)})};
}
const json=(res,body,status=200)=>{res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(body))};
async function pair(left,right,work){
 const a=await server(left),b=await server(right);
 try{return await work({nodeOrigin:a.origin,springOrigin:b.origin})}finally{await Promise.all([a.close(),b.close()])}
}

test('46 real paired reads compare optional anonymous identity and protected denials',async()=>{
 const requests=[];
 const handler=(req,res)=>{requests.push({method:req.method,url:req.url,at:Date.now()});json(res,req.url==='/api/auth/me'?{user:null}:{error:'Sign in required'},req.url==='/api/auth/me'?200:401)};
 await pair(handler,handler,async origins=>{
  const result=await executeShadowReads({...ack,...origins});
  assert.equal(result.status,'PASS');assert.equal(result.parity.equivalent,2);assert.equal(result.parity.notRun,0);
  assert.deepEqual(result.comparisons.map(x=>x.nodeStatus),[200,401]);
  assert.equal(result.cutoverApproved,false);assert.equal(result.fullAuthorizationParity,false);
  assert.equal(result.rollback.phase,'BLOCKED');assert.equal(result.rollback.automatedCutover,false);
 });
 assert.equal(requests.length,4);assert.ok(requests.every(x=>x.method==='GET'));
 for(let i=1;i<requests.length;i++)assert.ok(requests[i].at-requests[i-1].at>=900,'read rate bounded to one per second');
});

test('46 full response mismatches fail without exposing identity, token or HTTP bodies',async()=>{
 const cookie='sa_session=synthetic_secret_session_token_1234',secret='private-synthetic@example.test';
 const received=[];
 await pair((req,res)=>{received.push(req.headers.cookie);json(res,{user:{id:1,email:secret},token:'synthetic_body_secret'})},
  (req,res)=>{received.push(req.headers.cookie);json(res,{user:{id:2,email:secret},token:'synthetic_body_secret'})},async origins=>{
   const result=await executeShadowReads({...ack,...origins,paths:[SHADOW_READ_PATHS[0]],cookie});
   assert.equal(result.status,'FAIL');assert.equal(result.parity.mismatches,1);
   assert.match(result.comparisons[0].differenceDigest,/^[a-f0-9]{64}$/);
   const output=JSON.stringify(result);
   for(const value of [cookie,secret,'synthetic_body_secret','"body"','"headers"'])assert.ok(!output.includes(value));
  });
 assert.deepEqual(received,[cookie,cookie]);
});

test('46 redirects are refused without contacting their destination',async()=>{
 let contacted=0;
 const trap=await server((_req,res)=>{contacted++;json(res,{should:'never run'})});
 try{
  await pair((_req,res)=>{res.writeHead(302,{Location:trap.origin+'/private?token=synthetic_redirect_secret'});res.end()},
   (_req,res)=>json(res,{user:null}),async origins=>{
    const result=await executeShadowReads({...ack,...origins,paths:[SHADOW_READ_PATHS[0]]});
    assert.equal(result.status,'NOT RUN');assert.equal(result.parity.notRun,1);
    assert.deepEqual(result.transport,[{side:'node',path:SHADOW_READ_PATHS[0],error:'REDIRECT_REFUSED'}]);
    assert.ok(!JSON.stringify(result).includes('synthetic_redirect_secret'));
   });
  assert.equal(contacted,0);
 }finally{await trap.close()}
});

test('46 malformed or oversized streamed JSON is never credited as parity',async()=>{
 await pair((_req,res)=>{res.writeHead(200,{'Content-Type':'application/json'});res.end('private_invalid_json_secret')},
  (_req,res)=>{res.writeHead(200,{'Content-Type':'application/json'});res.write('{"value":"');res.end('x'.repeat(100)+'"}')},async origins=>{
   const result=await executeShadowReads({...ack,...origins,paths:[SHADOW_READ_PATHS[0]],maxBytes:64});
   assert.equal(result.status,'NOT RUN');assert.equal(result.parity.equivalent,0);
   assert.deepEqual(result.transport.map(x=>x.error),['INVALID_SHADOW_JSON','SHADOW_BODY_LIMIT']);
   assert.ok(!JSON.stringify(result).includes('private_invalid_json_secret'));
  });
 await pair((_req,res)=>{res.writeHead(200,{'Content-Type':'application/json'});res.end(Buffer.from([0x7b,0x22,0x78,0x22,0x3a,0x22,0xff,0x22,0x7d]))},
  (_req,res)=>json(res,{x:'replacement'}),async origins=>{
   const result=await executeShadowReads({...ack,...origins,paths:[SHADOW_READ_PATHS[0]]});
   assert.equal(result.status,'NOT RUN');assert.equal(result.transport[0].error,'INVALID_SHADOW_JSON');
  });
});

test('46 absolute request timeout bounds a stalled response',async()=>{
 await pair((_req,res)=>{res.writeHead(200,{'Content-Type':'application/json'});res.write('{')},
  (_req,res)=>json(res,{user:null}),async origins=>{
   const started=Date.now();
   const result=await executeShadowReads({...ack,...origins,paths:[SHADOW_READ_PATHS[0]],timeoutMs:100});
   assert.equal(result.status,'NOT RUN');assert.equal(result.transport[0].error,'SHADOW_TIMEOUT');
   assert.ok(Date.now()-started<2500);
  });
});

test('46 matching server errors are comparable diagnostics, never passing readiness',async()=>{
 await pair((_req,res)=>json(res,{error:'Unavailable'},503),(_req,res)=>json(res,{error:'Unavailable'},503),async origins=>{
  const result=await executeShadowReads({...ack,...origins,paths:[SHADOW_READ_PATHS[0]]});
  assert.equal(result.parity.equivalent,1);
  assert.equal(result.status,'FAIL');
  assert.deepEqual(result.serviceErrors.map(x=>x.status),[503,503]);
 });
});

test('46 nonstandard HTTP statuses cannot contradict missing comparison evidence',async()=>{
 await pair((_req,res)=>json(res,{user:null},700),(_req,res)=>json(res,{user:null},700),async origins=>{
  const result=await executeShadowReads({...ack,...origins,paths:[SHADOW_READ_PATHS[0]]});
  assert.equal(result.status,'NOT RUN');assert.equal(result.parity.notRun,1);
  assert.equal(result.comparisons[0].result,'NOT_RUN');
  assert.deepEqual(result.transport.map(x=>x.error),['INVALID_SHADOW_STATUS','INVALID_SHADOW_STATUS']);
 });
});

test('46 configuration validation rejects SSRF, unsafe methods, query changes and excessive rate before HTTP',async()=>{
 const valid={...ack,nodeOrigin:'http://127.0.0.1:31001',springOrigin:'http://127.0.0.1:31002',paths:[SHADOW_READ_PATHS[0]]};
 for(const origin of ['http://localhost:8080','http://127.1:8080','http://2130706433:8080','http://0x7f000001:8080','https://example.com:443','http://127.0.0.1:8080/api','http://127.0.0.1:8080?next=x','http://user:pass@127.0.0.1:8080','http://127.0.0.1:65536']){
  await assert.rejects(executeShadowReads({...valid,nodeOrigin:origin}));
 }
 for(const change of [{acknowledgeReadOnly:false},{syntheticOnly:false},{paths:['POST /api/auth/me']},{paths:['GET /api/me/preferences?expanded=0']},{paths:['GET /api/auth/../auth/me']},{paths:[SHADOW_READ_PATHS[0],SHADOW_READ_PATHS[0]]},{cookie:'sa_session=secret\r\nHost: example.com'},{cookie:'sa_session=synthetic_token_123;other=secret'},{minIntervalMs:999},{maxBytes:65537},{timeoutMs:10001},{springOrigin:valid.nodeOrigin}]){
  await assert.rejects(executeShadowReads({...valid,...change}));
 }
});

test('46 CLI prints only sanitized comparison evidence and preserves failure exit codes',async()=>{
 await pair((_req,res)=>json(res,{user:{email:'left-private@example.test'}}),(_req,res)=>json(res,{user:{email:'right-private@example.test'}}),async origins=>{
  const result=await new Promise((resolve,reject)=>{
   const child=spawn(process.execPath,[new URL('../scripts/shadow-read.js',import.meta.url).pathname,'--node',origins.nodeOrigin,'--spring',origins.springOrigin,'--path',SHADOW_READ_PATHS[0]],
    {env:{...process.env,SA_SHADOW_READ_ACK:'YES',SA_SHADOW_SYNTHETIC_ONLY:'YES',SA_SHADOW_COOKIE:'sa_session=synthetic_cli_secret_123456'}});
   let stdout='',stderr='';child.stdout.on('data',data=>stdout+=data);child.stderr.on('data',data=>stderr+=data);
   child.on('error',reject);child.on('close',code=>resolve({code,stdout,stderr}));
  });
  assert.equal(result.code,1,result.stderr);const report=JSON.parse(result.stdout);assert.equal(report.status,'FAIL');
  assert.match(report.runtime.commit,/^[a-f0-9]{40}$/);assert.equal(typeof report.runtime.trackedWorktreeDirty,'boolean');
  assert.ok(!result.stdout.includes('private@example.test'));assert.ok(!result.stdout.includes('synthetic_cli_secret_123456'));
 });
});

test('46 actual backend parity harness refuses unsafe targets before seeding or process startup',()=>{
 const env={NODE_ENV:'test',SA_PG_DISPOSABLE:'YES_I_ACCEPT_DATA_LOSS',PGHOST:'127.0.0.1',PGPORT:'5432',
  PGUSER:'sa_test',PGDATABASE:'sa_disposable_account46',SA_SHADOW_READ_ACK:'YES',SA_SHADOW_SYNTHETIC_ONLY:'YES'};
 assert.deepEqual(accountParityConfiguration(env,'http://127.0.0.1:38081'),{springOrigin:'http://127.0.0.1:38081'});
 for(const changes of [{NODE_ENV:'production'},{SA_PUBLIC_CONTENT_MODE:'1'},{SA_PG_DISPOSABLE:''},{PGHOST:'localhost'},
  {PGHOST:'example.com'},{PGPORT:''},{PGPORT:'0'},{PGPORT:'65536'},{PGDATABASE:'production'},
  {PGSERVICE:'shared'},{PGSERVICEFILE:'/private/config'},{PGHOSTADDR:'127.0.0.1'},{PGOPTIONS:'-c search_path=private'},
  {PGUSER:'unsafe;role'},{SA_SHADOW_READ_ACK:''},{SA_SHADOW_SYNTHETIC_ONLY:''}]){
  assert.throws(()=>accountParityConfiguration({...env,...changes},'http://127.0.0.1:38081'));
 }
 for(const origin of ['http://localhost:38081','http://127.1:38081','http://127.0.0.1:38081/api',
  'http://127.0.0.1:38081?query=1','http://user:secret@127.0.0.1:38081','https://example.com:443','http://127.0.0.1:65536']){
  assert.throws(()=>accountParityConfiguration(env,origin));
 }
});
