/** Evaluate low-cardinality aggregate edge metrics against draft SLOs.
 * No production SLO can be certified from these offline aggregates.
 */
import {evaluateEdgeSamples} from './edge-readiness.js';
export const DRAFT_SLOS=Object.freeze({max5xxRate:0.005,maxStartupP95Ms:2500,maxPageLoadP95Ms:3000,maxRebufferP95Ratio:0.02,minCacheHitRate:0.8});
export function evaluateSlo(input,thresholds=DRAFT_SLOS){
 const samples=evaluateEdgeSamples(input);
 const regions=samples.regions.map(r=>{
  const results={
   availability:r.errorRate!==null&&r.errorRate<=thresholds.max5xxRate,
   startup:r.startupP95Ms!==null&&r.startupP95Ms<=thresholds.maxStartupP95Ms,
   pageLoad:r.pageLoadP95Ms!==null&&r.pageLoadP95Ms<=thresholds.maxPageLoadP95Ms,
   rebuffer:r.rebufferP95Ratio!==null&&r.rebufferP95Ratio<=thresholds.maxRebufferP95Ratio,
   cache:r.cacheHitRate!==null&&r.cacheHitRate>=thresholds.minCacheHitRate
  };
  return {...r,objectives:results,offlineEvaluationPass:r.adequateSample&&Object.values(results).every(Boolean)};
 });
 return {regions,allOfflineObjectivesMet:regions.every(r=>r.offlineEvaluationPass),productionSloVerified:false,
  note:'Draft objectives only. Independent approved-region synthetic and real-user telemetry is still required.'};
}

/** Operational SLO contract for pre-production synthetic monitoring.
 * Missing or insufficient samples fail closed. Numbers are engineering objectives,
 * not measured public availability or a service-level agreement.
 */
export const OPERATIONAL_SLOS=Object.freeze({
 availabilityMin:0.999, apiP95MsMax:350, apiErrorRateMax:0.005,
 videoStartupP95MsMax:2500, rebufferP95Max:0.02,
 jobSuccessRateMin:0.99, queuedJobOldestSecondsMax:300,
 minimumRequests:100, minimumPlaybackSamples:30, minimumJobs:10
});
export function evaluateOperationalSlo(x,t=OPERATIONAL_SLOS){
 if(!x||typeof x!=='object')throw Error('Operational SLO data required');
 const integer=v=>Number.isSafeInteger(v)&&v>=0;
 const values=['requests','successfulRequests','apiErrors','startedVideos','completedJobs','failedJobs','oldestQueuedSeconds'];
 for(const k of values)if(!integer(x[k]))throw Error('Invalid SLO counter: '+k);
 if(x.successfulRequests+x.apiErrors>x.requests)throw Error('Request counters are inconsistent');
 const arrays=['apiLatencyMs','videoStartupMs','videoRebufferRatio'];
 for(const k of arrays)if(!Array.isArray(x[k])||!x[k].every(v=>typeof v==='number'&&Number.isFinite(v)&&v>=0))throw Error('Invalid samples: '+k);
 if(x.videoRebufferRatio.some(v=>v>1))throw Error('Rebuffer ratio exceeds one');
 const quantile=a=>a.length?[...a].sort((a,b)=>a-b)[Math.ceil(a.length*.95)-1]:null;
 const jobs=x.completedJobs+x.failedJobs;
 const sufficient=x.requests>=t.minimumRequests&&x.apiLatencyMs.length>=t.minimumRequests&&x.startedVideos>=t.minimumPlaybackSamples&&x.videoStartupMs.length>=t.minimumPlaybackSamples&&x.videoRebufferRatio.length>=t.minimumPlaybackSamples&&jobs>=t.minimumJobs;
 const observed={availability:x.requests?x.successfulRequests/x.requests:null,apiErrorRate:x.requests?x.apiErrors/x.requests:null,apiP95Ms:quantile(x.apiLatencyMs),videoStartupP95Ms:quantile(x.videoStartupMs),rebufferP95:quantile(x.videoRebufferRatio),jobSuccessRate:jobs?x.completedJobs/jobs:null,oldestQueuedSeconds:x.oldestQueuedSeconds};
 const objectives={availability:observed.availability!==null&&observed.availability>=t.availabilityMin,apiErrors:observed.apiErrorRate!==null&&observed.apiErrorRate<=t.apiErrorRateMax,apiLatency:observed.apiP95Ms!==null&&observed.apiP95Ms<=t.apiP95MsMax,videoStartup:observed.videoStartupP95Ms!==null&&observed.videoStartupP95Ms<=t.videoStartupP95MsMax,rebuffering:observed.rebufferP95!==null&&observed.rebufferP95<=t.rebufferP95Max,jobs:observed.jobSuccessRate!==null&&observed.jobSuccessRate>=t.jobSuccessRateMin,queueAge:observed.oldestQueuedSeconds<=t.queuedJobOldestSecondsMax};
 return {thresholds:t,observed,objectives,sufficientSamples:sufficient,localAcceptance:sufficient&&Object.values(objectives).every(Boolean),productionVerified:false};
}
