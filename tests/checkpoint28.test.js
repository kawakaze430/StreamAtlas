import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import crypto from 'node:crypto';
import {signedMediaCookies,inspectSignedMediaCookies} from '../src/cloudfront-access.js';
import {signTrustedGeo,verifyTrustedGeo,evaluateTerritory,parseCountryList} from '../src/territory-policy.js';
import {evaluateEdgeSamples,percentile} from '../scripts/edge-readiness.js';
import {forecastCost} from '../scripts/cdn-cost-forecast.js';
import {evaluateDisasterRecovery} from '../scripts/dr-decision.js';
import {buildSbom} from '../scripts/generate-sbom.js';
import {evaluateReleaseGates} from '../scripts/check-release-gates.js';
import {evaluateSlo} from '../scripts/slo-evaluate.js';
const root=path.resolve(import.meta.dirname,'..');
const file=p=>fs.readFileSync(path.join(root,p),'utf8');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'sa28-'));
process.env.DB_PATH=path.join(temp,'db.sqlite');process.env.PRIVATE_PATH=path.join(temp,'private');process.env.NODE_ENV='test';
const {server}=await import('../src/server.js');const {run,one,now}=await import('../src/database.js');
let base;
before(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));base=`http://127.0.0.1:${server.address().port}`});
after(async()=>{delete process.env.SA_REQUIRE_ADMIN_VERIFIED_EMAIL;await new Promise(r=>server.close(r));fs.rmSync(temp,{recursive:true,force:true})});
async function request(p,method='GET',body,cookie){
 const r=await fetch(base+p,{method,headers:{'x-requested-with':'StreamAtlas',...(body?{'content-type':'application/json'}:{}),...(cookie?{cookie}:{})},body:body?JSON.stringify(body):undefined});
 return {status:r.status,body:await r.json().catch(()=>null),cookie:r.headers.get('set-cookie')?.split(';')[0]};
}
const uploadId='d81a34f4-71ef-4a51-b10b-66f3b77b1709',origin='https://media.example.test',keyId='K1234567890';
const rsa=crypto.generateKeyPairSync('rsa',{modulusLength:2048});
const privateKey=rsa.privateKey.export({type:'pkcs8',format:'pem'}),publicKey=rsa.publicKey.export({type:'spki',format:'pem'});
const cookies=()=>signedMediaCookies({uploadId,mediaOrigin:origin,keyPairId:keyId,privateKey,domain:'example.test',ttlSeconds:60,nowEpoch:2000000000});
const valid=fields=>inspectSignedMediaCookies({fields,uploadId,mediaOrigin:origin,publicKeys:{[keyId]:publicKey},nowEpoch:2000000010});

test('G06: private CDN has signed media default and uncached manifest behavior',()=>{
 const hcl=file('deployment/aws/media-cdn/main.tf');
 assert.match(hcl,/aws_cloudfront_origin_access_control/);assert.match(hcl,/trusted_key_groups/);
 assert.match(hcl,/path_pattern\s*=\s*"\*\.m3u8"/);assert.match(hcl,/413f1600-6b0b-4f8f-9e6e-4d89ba1b1a8d/);
 assert.match(hcl,/aws_s3_bucket_public_access_block/);
});
test('G07: signer scopes cookie path, secure attributes, TTL and upload ID',()=>{
 const signed=cookies();assert.equal(signed.expires,2000000060);
 assert.equal(signed.resource,`${origin}/media/${uploadId}/*`);
 assert.equal(signed.cookies.length,3);
 for(const c of signed.cookies){assert.match(c,/Secure; HttpOnly; SameSite=Lax; Max-Age=60/);assert.match(c,new RegExp(`Path=/media/${uploadId}/`))}
 assert.equal(valid(signed.fields).valid,true);
 assert.throws(()=>signedMediaCookies({uploadId:'../../x',mediaOrigin:origin,keyPairId:keyId,privateKey,domain:'example.test'}));
});
test('G08: unsigned, forged, expired, wrong-resource and revoked simulated CDN cookies are denied',()=>{
 const f=cookies().fields;
 assert.equal(valid({}).valid,false);
 assert.equal(valid({...f,'CloudFront-Signature':'BAD'}).valid,false);
 assert.equal(inspectSignedMediaCookies({fields:f,uploadId,mediaOrigin:origin,publicKeys:{[keyId]:publicKey},nowEpoch:2000000060}).reason,'EXPIRED_OR_EXCESSIVE_TTL');
 assert.equal(inspectSignedMediaCookies({fields:f,uploadId,mediaOrigin:'https://other.example.test',publicKeys:{[keyId]:publicKey},nowEpoch:2000000010}).reason,'RESOURCE_MISMATCH');
 assert.equal(inspectSignedMediaCookies({fields:f,uploadId,mediaOrigin:origin,publicKeys:{[keyId]:publicKey},nowEpoch:2000000010,isRevoked:()=>true}).reason,'REVOKED_IN_LOCAL_SIMULATION');
});
test('G08/J03: signing key rotation accepts known old/new IDs only',()=>{
 const f=cookies().fields;
 assert.equal(inspectSignedMediaCookies({fields:f,uploadId,mediaOrigin:origin,publicKeys:{},nowEpoch:2000000010}).reason,'UNKNOWN_KEY');
 const next=crypto.generateKeyPairSync('rsa',{modulusLength:2048});
 const newPublic=next.publicKey.export({type:'spki',format:'pem'});
 assert.equal(inspectSignedMediaCookies({fields:f,uploadId,mediaOrigin:origin,publicKeys:{[keyId]:publicKey,K2222222222:newPublic},nowEpoch:2000000010}).valid,true);
 assert.equal(inspectSignedMediaCookies({fields:f,uploadId,mediaOrigin:origin,publicKeys:{K2222222222:newPublic},nowEpoch:2000000010}).valid,false);
});
test('G09: Fargate draft uses private ECR digest placeholder, readiness and secrets',()=>{
 const task=JSON.parse(file('deployment/aws/ecs/task-definition.example.json'));
 assert.deepEqual(task.requiresCompatibilities,['FARGATE']);assert.equal(task.networkMode,'awsvpc');
 assert.match(task.containerDefinitions[0].image,/IMMUTABLE_DIGEST/);
 assert.equal(task.containerDefinitions[0].readonlyRootFilesystem,true);
 assert.match(task.containerDefinitions[0].healthCheck.command.join(' '),/catalog\/health/);
 assert.ok(task.containerDefinitions[0].secrets.length);
});
test('G10: SQS queue draft uses encryption, TLS denial and dead-letter routing',()=>{
 const hcl=file('deployment/aws/queue/main.tf');
 assert.match(hcl,/sqs_managed_sse_enabled\s*=\s*true/g);assert.match(hcl,/maxReceiveCount\s*=\s*5/);
 assert.match(hcl,/DenyInsecureTransport/);assert.match(hcl,/visibility_timeout_seconds\s*=\s*900/);
 assert.match(hcl,/message_retention_seconds\s*=\s*1209600/);
});
test('G11: trusted geo HMAC binds country, time and exact request path',()=>{
 const path=`/api/private-preview/media/${uploadId}/cookies`,secret='a'.repeat(48),timestamp=2000000000;
 const sig=signTrustedGeo({country:'US',timestamp,path,secret});
 const headers={'x-sa-geo-country':'US','x-sa-geo-time':String(timestamp),'x-sa-geo-signature':sig};
 assert.deepEqual(verifyTrustedGeo({headers,path,secret,nowEpoch:timestamp+20}),{trusted:true,country:'US'});
 assert.equal(verifyTrustedGeo({headers,path,secret,nowEpoch:timestamp+40}).trusted,false);
 assert.equal(verifyTrustedGeo({headers:{...headers,'x-sa-geo-country':'CA'},path,secret,nowEpoch:timestamp}).trusted,false);
 assert.equal(verifyTrustedGeo({headers,path:path+'x',secret,nowEpoch:timestamp}).trusted,false);
 assert.equal(verifyTrustedGeo({headers:{...headers,'x-sa-geo-signature':'0'.repeat(64)},path,secret,nowEpoch:timestamp}).trusted,false);
});
test('G11: territory rules fail closed on unknown, denied and missing allowlist',()=>{
 assert.deepEqual(parseCountryList('us, ca'),['US','CA']);assert.throws(()=>parseCountryList('US,US'));
 assert.equal(evaluateTerritory({country:'US',allowedCountries:['US','CA']}).allowed,true);
 assert.equal(evaluateTerritory({country:'US',allowedCountries:['US'],deniedCountries:['US']}).allowed,false);
 assert.equal(evaluateTerritory({country:'ZZ',allowedCountries:['US']}).allowed,false);
 assert.equal(evaluateTerritory({country:'US',allowedCountries:[]}).allowed,false);
});
test('G12: WAF draft has common rules and IP rate limiting; signer is user-throttled',()=>{
 const waf=file('deployment/aws/edge-waf/main.tf');assert.match(waf,/AWSManagedRulesCommonRuleSet/);assert.match(waf,/rate_based_statement/);
 assert.match(file('src/server.js'),/rateLimit\(`cdn-sign:\$\{viewer.id\}`,12,60000\)/);
});
const region=()=>({region:'synthetic_lab',requests:120,errors5xx:0,denied403:2,cacheHits:100,cacheEligibleRequests:110,startupMs:Array(35).fill(350),pageLoadMs:Array(35).fill(400),rebufferRatio:Array(35).fill(.01)});
test('G13: aggregate edge evaluator calculates percentiles and rejects inconsistent data',()=>{
 const result=evaluateEdgeSamples({regions:[region()]});assert.equal(result.adequateSample,true);
 assert.equal(result.regions[0].cacheHitRate,100/110);assert.equal(result.regions[0].startupP95Ms,350);
 assert.equal(result.productionEvidenceVerified,false);assert.equal(percentile([4,1,2,3],.95),4);
 assert.throws(()=>evaluateEdgeSamples({regions:[{...region(),cacheHits:121}]}),/Inconsistent/);
 assert.equal(evaluateEdgeSamples({regions:[{...region(),startupMs:[1]}]}).adequateSample,false);
});
test('G14: cost forecast uses explicit rates and never claims live AWS pricing',()=>{
 const result=forecastCost({usage:{storageGbMonth:100,egressGb:50,transcodeMinutes:200,requestsMillion:2},rates:{storagePerGbMonth:.02,egressPerGb:.1,transcodePerMinute:.01,requestsPerMillion:.4}});
 assert.equal(result.subtotal,9.8);assert.equal(result.forecastTotal,11.76);assert.equal(result.pricingVerified,false);
 assert.throws(()=>forecastCost({usage:{storageGbMonth:-1},rates:{}}));
});
test('G15: DR decision requires measured RTO/RPO and approved region',()=>{
 assert.equal(evaluateDisasterRecovery().evidenceComplete,false);
 const result=evaluateDisasterRecovery({targetRtoMinutes:60,targetRpoMinutes:15,measuredRestoreMinutes:50,measuredDataLossMinutes:10,approvedRegions:['us-east-1']});
 assert.equal(result.objectivesMet,true);assert.equal(result.multiRegionValidated,false);
 assert.equal(evaluateDisasterRecovery({targetRtoMinutes:60,targetRpoMinutes:15,measuredRestoreMinutes:90,measuredDataLossMinutes:10,approvedRegions:['us-east-1']}).needsRemediation,true);
});
test('J01: lockfile-based SBOM does not claim OS/container CVE coverage',()=>{
 const pkg=JSON.parse(file('package.json')),lock=JSON.parse(file('package-lock.json'));
 const sbom=buildSbom(pkg,lock);assert.equal(sbom.bomFormat,'CycloneDX');assert.equal(sbom.specVersion,'1.5');
 assert.equal(sbom.metadata.component.version,JSON.parse(file('package.json')).version);assert.match(sbom.metadata.properties[0].value,/no native\/OS/);
 assert.match(file('.github/workflows/security-checkpoint28.yml'),/npm audit --omit=dev/);
});
test('J02: admin access requires verified email when security flag is enabled',async()=>{
 const created=await request('/api/auth/register','POST',{name:'Checkpoint Admin',email:'admin28@example.test',password:'long-admin-password-28'});
 assert.equal(created.status,201);const cookie=created.cookie;
 run("UPDATE users SET role='ADMIN' WHERE email=?",'admin28@example.test');
 process.env.SA_REQUIRE_ADMIN_VERIFIED_EMAIL='1';
 try{
  assert.equal((await request('/api/admin/overview','GET',undefined,cookie)).status,403);
  const verification=await request('/api/me/email/request-verification','POST',{},cookie);assert.equal(verification.status,200);
  assert.equal((await request('/api/me/email/confirm-verification','POST',{token:verification.body.developmentToken},cookie)).status,200);
  assert.equal((await request('/api/admin/overview','GET',undefined,cookie)).status,200);
 }finally{delete process.env.SA_REQUIRE_ADMIN_VERIFIED_EMAIL}
});
test('J03: rotation runbook explicitly covers overlap, expiry, compromise and no cloud writes',()=>{
 const doc=file('docs/KEY_ROTATION_28.md');for(const key of ['old public key','compromise','cached','No AWS'])assert.match(doc,new RegExp(key,'i'));
});
test('J04: independent assessment remains an external blocker',()=>{
 assert.match(file('docs/INDEPENDENT_SECURITY_ASSESSMENT_28.md'),/qualified \*\*independent\*\* assessor/);
 assert.equal(evaluateReleaseGates(JSON.parse(file('docs/RELEASE_GATE_EVIDENCE_28.json'))).independentPenetrationTestVerified,false);
});
test('J05: draft SLOs reject inadequate samples and never certify production',()=>{
 const good=evaluateSlo({regions:[region()]});assert.equal(good.allOfflineObjectivesMet,true);assert.equal(good.productionSloVerified,false);
 assert.equal(evaluateSlo({regions:[{...region(),errors5xx:3}]}).allOfflineObjectivesMet,false);
 assert.equal(evaluateSlo({regions:[{...region(),startupMs:[350]}]}).allOfflineObjectivesMet,false);
});
test('15 roadmap gate references never self-certify production readiness',()=>{
 const result=evaluateReleaseGates(JSON.parse(file('docs/RELEASE_GATE_EVIDENCE_28.json')));
 assert.equal(result.taskCount,15);assert.equal(Object.keys(result.tasks).length,15);
 assert.equal(result.allTasksProductionComplete,false);assert.equal(result.publicLaunchApproved,false);
 for(const task of Object.values(result.tasks))assert.equal(task.independentlyVerified,false);
});

test('G06/G08/G10/G12: infrastructure guardrails detect a removed CDN signature requirement',async()=>{
 const {inspectProjectInfrastructure,inspectInfrastructure}=await import('../scripts/infra-policy-audit.js');
 const result=inspectProjectInfrastructure();assert.equal(result.staticGuardrailsPassed,true);assert.equal(result.cloudProviderVerified,false);
 const media=file('deployment/aws/media-cdn/main.tf');
 const broken=inspectInfrastructure({media:media.replaceAll('trusted_key_groups = [aws_cloudfront_key_group.media.id]','trusted_key_groups = []'),
  queue:file('deployment/aws/queue/main.tf'),waf:file('deployment/aws/edge-waf/main.tf'),task:JSON.parse(file('deployment/aws/ecs/task-definition.example.json'))});
 assert.equal(broken.checks.signedMedia,false);assert.equal(broken.staticGuardrailsPassed,false);
});
