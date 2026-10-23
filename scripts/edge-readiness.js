/** Evaluate synthetic or operator-supplied aggregate edge metrics. No external probes. */
import fs from 'node:fs';
const finite=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0;
export function percentile(values,p){if(!Array.isArray(values)||!values.length||!values.every(finite))throw Error('Nonempty nonnegative numeric samples required');const sorted=[...values].sort((a,b)=>a-b);return sorted[Math.ceil(sorted.length*p)-1]}
export function evaluateEdgeSamples(input,{minimumRequests=100,minimumStartups=30}={}){
 if(!input||!Array.isArray(input.regions)||!input.regions.length)throw Error('At least one region is required');
 const regions=input.regions.map(r=>{
  if(typeof r.region!=='string'||!/^[A-Za-z0-9_-]{2,32}$/.test(r.region))throw Error('Invalid region label');
  for(const key of ['requests','errors5xx','denied403','cacheHits','cacheEligibleRequests'])if(!Number.isSafeInteger(r[key])||r[key]<0)throw Error('Invalid counter: '+key);
  if(r.errors5xx+r.denied403>r.requests||r.cacheHits>r.cacheEligibleRequests||r.cacheEligibleRequests>r.requests)throw Error('Inconsistent counters');
  for(const key of ['startupMs','pageLoadMs','rebufferRatio'])if(!Array.isArray(r[key])||!r[key].every(finite))throw Error('Invalid samples: '+key);
  if(r.rebufferRatio.some(x=>x>1))throw Error('Rebuffer ratio must be between zero and one');
  const sampled=r.requests>=minimumRequests&&r.startupMs.length>=minimumStartups&&r.pageLoadMs.length>=minimumStartups&&r.rebufferRatio.length>=minimumStartups;
  return {region:r.region,requests:r.requests,errors5xx:r.errors5xx,denied403:r.denied403,
   errorRate:r.requests?r.errors5xx/r.requests:null,deniedRate:r.requests?r.denied403/r.requests:null,
   cacheHitRate:r.cacheEligibleRequests?r.cacheHits/r.cacheEligibleRequests:null,
   startupP95Ms:r.startupMs.length?percentile(r.startupMs,.95):null,
   pageLoadP95Ms:r.pageLoadMs.length?percentile(r.pageLoadMs,.95):null,
   rebufferP95Ratio:r.rebufferRatio.length?percentile(r.rebufferRatio,.95):null,
   adequateSample:sampled};
 });
 if(new Set(regions.map(r=>r.region)).size!==regions.length)throw Error('Duplicate region labels');
 return {regions,adequateSample:regions.every(r=>r.adequateSample),productionEvidenceVerified:false,
  note:'Aggregate metrics evaluator only. No actual edge or global region was contacted.'};
}
if(process.argv[1]&&import.meta.url===new URL('file://'+process.argv[1]).href){
 const file=process.argv[2];if(!file)throw Error('Usage: node scripts/edge-readiness.js <aggregate-metrics.json>');
 console.log(JSON.stringify(evaluateEdgeSamples(JSON.parse(fs.readFileSync(file,'utf8'))),null,2));
}
