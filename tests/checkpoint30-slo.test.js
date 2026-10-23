import test from 'node:test';import assert from 'node:assert/strict';
import {OPERATIONAL_SLOS,evaluateOperationalSlo} from '../scripts/slo-evaluate.js';
const input=()=>({requests:200,successfulRequests:200,apiErrors:0,apiLatencyMs:Array(200).fill(80),startedVideos:40,videoStartupMs:Array(40).fill(600),videoRebufferRatio:Array(40).fill(0.005),completedJobs:20,failedJobs:0,oldestQueuedSeconds:20});
test('J05 defines measurable API, player and worker objectives',()=>{
 assert.ok(OPERATIONAL_SLOS.apiP95MsMax>0&&OPERATIONAL_SLOS.videoStartupP95MsMax>0);const r=evaluateOperationalSlo(input());assert.equal(r.localAcceptance,true);assert.equal(r.productionVerified,false);
});
test('J05 checks bad load, video buffering, old queues, and insufficient evidence',()=>{
 for(const modify of [x=>x.apiLatencyMs.fill(5000),x=>x.videoRebufferRatio.fill(.5),x=>x.oldestQueuedSeconds=5000,x=>{x.requests=99;x.successfulRequests=99},x=>x.failedJobs=20]){
  const x=input();modify(x);const r=evaluateOperationalSlo(x);assert.equal(r.localAcceptance,false);
 }
});
test('J05 rejects invalid or inconsistent operational metrics',()=>{
 assert.throws(()=>evaluateOperationalSlo({...input(),successfulRequests:300}));assert.throws(()=>evaluateOperationalSlo({...input(),videoRebufferRatio:[1.5]}));assert.throws(()=>evaluateOperationalSlo({...input(),apiLatencyMs:[-3]}));
});
