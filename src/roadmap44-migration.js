/** Database search migration decisions and read-only shadow comparison.
 * No live database cutover, OpenSearch endpoint, or credentials are used.
 */
import crypto from 'node:crypto';
const fault=(code)=>Object.assign(new Error(code),{code});
const safeInt=(v,min=0)=>Number.isSafeInteger(v)&&v>=min;
export function openSearchDecision({rows,queries,p95Ms,p99Ms,errorRate,thresholdP95Ms=120,requiredSamples=10000,approvedBudget=false}={}){
 if(!safeInt(rows)||!safeInt(queries)||!Number.isFinite(p95Ms)||p95Ms<0||!Number.isFinite(p99Ms)||p99Ms<p95Ms||!Number.isFinite(errorRate)||errorRate<0||errorRate>1||!safeInt(requiredSamples,1))throw fault('INVALID_SEARCH_MEASUREMENT');
 const measurable=queries>=requiredSamples&&rows>=100000;
 const hit=measurable&&(p95Ms>thresholdP95Ms||errorRate>0.01);
 return {migrate:false,experimentRecommended:hit&&approvedBudget,reason:!measurable?'INSUFFICIENT_REPRESENTATIVE_DATA':!hit?'DATABASE_MEETS_SEARCH_SLO':!approvedBudget?'PERFORMANCE_LIMIT_HIT_BUT_BUDGET_UNAPPROVED':'CONTROLLED_OPENSEARCH_EXPERIMENT_ONLY',liveChangeAllowed:false,requirements:['Representative anonymized query mix','Index/search latency and recall baseline','Authenticated query and tenant isolation','Hold and takedown index propagation','Shadow comparisons and rollback','Explicit budget and owner approval']};
}
export function parityReport(nodeResponses,springResponses,{paths,ignoreFields=['requestId','generatedAt'],maxExamples=12}={}){
 if(!Array.isArray(paths)||paths.length<1||paths.length>250||!Array.isArray(ignoreFields)||ignoreFields.some(x=>typeof x!=='string'))throw fault('INVALID_PARITY_MATRIX');
 const canonical=(value)=>{
  if(Array.isArray(value))return value.map(canonical);
  if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).filter(([key])=>!ignoreFields.includes(key)).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>[k,canonical(v)]));
  return value;
 };
 const items=[];
 for(const p of paths){
  if(!/^\b(?:GET|HEAD) \/api\/[A-Za-z0-9_/?=&.-]{1,160}$/.test(p))throw fault('UNSAFE_SHADOW_PATH');
  const left=nodeResponses?.[p],right=springResponses?.[p];
  // Compare denials too, and deliberately never compare an unrecorded response as PASS.
  const valid=x=>x&&safeInt(x.status,100)&&x.status<=599&&Object.hasOwn(x,'body');
  const state=!valid(left)||!valid(right)?'NOT_RUN':left.status!==right.status||JSON.stringify(canonical(left.body))!==JSON.stringify(canonical(right.body))?'DIFFERENT':'EQUIVALENT';
  items.push({path:p,result:state,nodeStatus:valid(left)?left.status:null,springStatus:valid(right)?right.status:null});
 }
 const mismatches=items.filter(x=>x.result==='DIFFERENT'),untested=items.filter(x=>x.result==='NOT_RUN');
 return {compared:items.length,equivalent:items.filter(x=>x.result==='EQUIVALENT').length,mismatches:mismatches.length,notRun:untested.length,examples:[...mismatches,...untested].slice(0,maxExamples),cutoverApproved:false,fullAuthorizationParity:false};
}
export function buildShadowCutoverPlan({parity,rollbackBackupVerified=false,independentReviewerApproved=false,productionTrafficAllowed=false,serviceHasAuthenticatedWrites=true}={}){
 if(!parity||!safeInt(parity.compared,1)||!safeInt(parity.mismatches)||!safeInt(parity.notRun))throw fault('INVALID_PARITY_EVIDENCE');
 const ready=parity.mismatches===0&&parity.notRun===0&&rollbackBackupVerified&&independentReviewerApproved&&!serviceHasAuthenticatedWrites;
 return {phase:ready?'ELIGIBLE_FOR_PRIVATE_READ_ONLY_CANARY':'BLOCKED',automatedCutover:false,canaryReadPercent:ready?1:0,rollback:{steps:['Freeze traffic shift','Switch reads to Node baseline','Verify previous catalog checksum','Restore private snapshot only under approved incident procedure'],automated:false},shadow:{readOnly:true,maxRps:1,neverExposeDifferenceToViewer:true,logBody:false},reasons:[...(parity.mismatches?['PARITY_MISMATCH']:[]),...(parity.notRun?['PARITY_UNTESTED']:[]),...(!rollbackBackupVerified?['RESTORE_NOT_PROVEN']:[]),...(!independentReviewerApproved?['REVIEW_MISSING']:[]),...(serviceHasAuthenticatedWrites?['WRITE_PARITY_MISSING']:[])],publicTrafficAllowed:false,productionTrafficAllowed:false};
}
export function shadowDifferenceDigest(result){return crypto.createHash('sha256').update(JSON.stringify({compared:result.compared,mismatches:result.mismatches,notRun:result.notRun})).digest('hex')}
