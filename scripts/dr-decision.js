/** Offline DR planning only; does not declare multi-region readiness. */
export function evaluateDisasterRecovery({targetRtoMinutes,targetRpoMinutes,measuredRestoreMinutes,measuredDataLossMinutes,approvedRegions=[],testedFailover=false}={}){
 const valid=x=>Number.isFinite(x)&&x>=0;
 const measurements=[targetRtoMinutes,targetRpoMinutes,measuredRestoreMinutes,measuredDataLossMinutes];
 const complete=measurements.every(valid)&&Array.isArray(approvedRegions)&&approvedRegions.length>0;
 const objectivesMet=complete&&measuredRestoreMinutes<=targetRtoMinutes&&measuredDataLossMinutes<=targetRpoMinutes;
 return {evidenceComplete:complete,objectivesMet,needsRemediation:!objectivesMet,
  multiRegionValidated:false,failoverTestReported:testedFailover===true,
  recommendation:!complete?'Collect approved regions and real restore measurements':!objectivesMet?'Improve tested backups and recovery before considering multi-region':'Evaluate multi-AZ economics first; multi-region requires separate testing and approvals'};
}
