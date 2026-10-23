/** Static guardrails for un-applied Terraform/JSON drafts.
 * This does NOT execute Terraform, contact AWS or validate IAM policy semantics.
 */
import fs from 'node:fs';import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
export function inspectInfrastructure({media,queue,waf,task}){
 const checks={
  privateMediaBucket:/resource "aws_s3_bucket_public_access_block" "media"/.test(media)&&/block_public_policy\s*=\s*true/.test(media),
  privateOriginalsBucket:/resource "aws_s3_bucket_public_access_block" "originals"/.test(media)&&/aws_s3_bucket" "originals"/.test(media),
  cloudFrontOac:/aws_cloudfront_origin_access_control/.test(media)&&/origin_access_control_id/.test(media),
  signedMedia:/trusted_key_groups\s*=\s*\[aws_cloudfront_key_group\.media\.id\]/.test(media),
  noCachedManifests:/path_pattern\s*=\s*"\*\.m3u8"/.test(media)&&/413f1600-6b0b-4f8f-9e6e-4d89ba1b1a8d/.test(media),
  noForceDestroy:!/force_destroy\s*=\s*true/.test(media),
  sourceArnBound:/variable\s*=\s*"AWS:SourceArn"/.test(media),
  queueEncrypted:(queue.match(/sqs_managed_sse_enabled\s*=\s*true/g)||[]).length>=2,
  deadLetterQueue:/redrive_policy/.test(queue)&&/maxReceiveCount/.test(queue),
  queueRequiresTls:/DenyInsecureTransport/.test(queue)&&/aws:SecureTransport/.test(queue),
  wafUnattachedDraft:/resource "aws_wafv2_web_acl"/.test(waf)&&!/aws_wafv2_web_acl_association/.test(waf),
  ecsSecretsOnly:task.containerDefinitions?.every(c=>c.secrets?.length>0&&c.readonlyRootFilesystem===true&&!c.environment?.some(e=>/PASSWORD|SECRET|PRIVATE_KEY/.test(e.name))),
  ecsNoPublicIpInTask:!Object.hasOwn(task,'assignPublicIp')
 };
 return {checks,staticGuardrailsPassed:Object.values(checks).every(Boolean),cloudProviderVerified:false,deployable:false};
}
export function inspectProjectInfrastructure(){const read=p=>fs.readFileSync(path.join(root,p),'utf8');return inspectInfrastructure({media:read('deployment/aws/media-cdn/main.tf'),queue:read('deployment/aws/queue/main.tf'),waf:read('deployment/aws/edge-waf/main.tf'),task:JSON.parse(read('deployment/aws/ecs/task-definition.example.json'))})}
if(process.argv[1]&&import.meta.url===new URL('file://'+process.argv[1]).href){
 const result=inspectProjectInfrastructure();console.log(JSON.stringify(result,null,2));if(!result.staticGuardrailsPassed)process.exitCode=1;
}
