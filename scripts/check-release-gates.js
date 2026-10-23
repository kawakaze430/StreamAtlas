/** Explicitly non-self-certifying checklist for tasks G06-G15 and J01-J05. */
import fs from 'node:fs';import path from 'node:path';
const ids=[...Array.from({length:10},(_,i)=>`G${String(i+6).padStart(2,'0')}`),...Array.from({length:5},(_,i)=>`J${String(i+1).padStart(2,'0')}`)];
export function evaluateReleaseGates(input={}){
 const tasks=Object.fromEntries(ids.map(id=>{
  const r=input[id]||{};
  const localEvidence=Array.isArray(r.localEvidence)?r.localEvidence.filter(x=>typeof x==='string'&&x.trim()).length:0;
  const externalEvidence=Array.isArray(r.externalEvidence)?r.externalEvidence.filter(x=>typeof x==='string'&&x.trim()).length:0;
  return [id,{localEvidenceReferences:localEvidence,externalEvidenceReferences:externalEvidence,independentlyVerified:false,status:localEvidence?'LOCAL_WORK_ONLY':'BLOCKED_OR_NOT_STARTED'}];
 }));
 return {tasks,taskCount:ids.length,allTasksProductionComplete:false,cloudDeploymentAuthorized:false,independentPenetrationTestVerified:false,publicLaunchApproved:false,
  note:'Reference strings are unverified and cannot self-authorize deployment, rights, legal compliance, or security certification.'};
}
if(process.argv[1]&&import.meta.url===new URL('file://'+process.argv[1]).href){
 const file=process.argv.find(x=>x.endsWith('.json'));const evidence=file?JSON.parse(fs.readFileSync(path.resolve(file),'utf8')):{};
 console.log(JSON.stringify(evaluateReleaseGates(evidence),null,2));
 if(!process.argv.includes('--report-only'))process.exitCode=1;
}
