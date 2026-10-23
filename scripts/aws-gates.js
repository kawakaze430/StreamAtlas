/** Offline documentary evidence inventory for G01-G05. Never calls AWS. */
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
const keys={G01:['domainOwnershipRef','providerAcceptanceRef','awsAccountOwnerApprovalRef','billingApprovalRef'],G02:['iamLeastPrivilegeReviewRef','oidcRoleReviewRef','secretsAndKmsReviewRef','budgetAlertReviewRef'],G03:['privateStagingHttpsTestRef','passwordGateDenialTestRef','syntheticOnlyCatalogTestRef'],G04:['dnsOwnershipVerificationRef','acmIssuedCertificateTestRef','redirectAndTlsTestRef'],G05:['originalsBucketPrivateTestRef','renditionsBucketPrivateTestRef','encryptionLifecycleTestRef','sourceBypassDenialTestRef']};
export function auditEvidence(e){
 if(e.format!=='streamatlas-private-staging-evidence-v1')throw Error('Unsupported evidence format');
 const result={};
 for(const [task,fields] of Object.entries(keys)){
  const missing=fields.filter(k=>typeof e[task]?.[k]!=='string'||!e[task][k].trim()||/^(todo|tbd|placeholder)$/i.test(e[task][k].trim()));
  result[task]={referencesRecorded:fields.length-missing.length,required:fields.length,missing,evidenceComplete:missing.length===0,independentlyVerified:false};
 }
 return {format:'streamatlas-aws-offline-gates-v1',tasks:result,allReferencesRecorded:Object.values(result).every(x=>x.evidenceComplete),externalApprovalsIndependentlyVerified:false,deploymentAuthorized:false,cloudCallsPerformed:false};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{const file=process.argv[2]||path.resolve('docs/AWS_GATE_EVIDENCE_TEMPLATE.json');console.log(JSON.stringify(auditEvidence(JSON.parse(fs.readFileSync(file,'utf8'))),null,2));}
 catch(e){console.error('AWS evidence audit failed: '+e.message);process.exitCode=1;}
}
