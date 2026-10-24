/** Offline S3 multipart planning/receipt contract. No credentials, signing or network.
 * A structurally complete receipt is not proof that the provider stored the bytes.
 * The authenticated caller must supply ownerId/uploadId from its own session.
 */
import crypto from 'node:crypto';

export const MAX_MULTIPART_BYTES=25*1024*1024;
export const MIN_PART_BYTES=5*1024*1024;
const FORMAT='streamatlas-s3-multipart-plan-v1';
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest();
function invalid(message){throw new TypeError(message)}

export function planMultipartUpload({ownerId,uploadId,expectedBytes,partBytes=MIN_PART_BYTES,expectedWholeFileSha256=null}={}){
 if(!Number.isSafeInteger(ownerId)||ownerId<1)invalid('A positive authenticated owner ID is required');
 if(typeof uploadId!=='string'||!uuid.test(uploadId))invalid('A lowercase upload UUID v4 is required');
 if(!Number.isSafeInteger(expectedBytes)||expectedBytes<1024||expectedBytes>MAX_MULTIPART_BYTES)invalid('Expected size must be 1 KiB to 25 MiB');
 if(!Number.isSafeInteger(partBytes)||partBytes<MIN_PART_BYTES||partBytes>MAX_MULTIPART_BYTES)invalid('Part size must be 5 MiB to 25 MiB');
 if(expectedWholeFileSha256!==null&&(typeof expectedWholeFileSha256!=='string'||!/^[a-f0-9]{64}$/.test(expectedWholeFileSha256)))invalid('Expected whole-file digest must be lowercase SHA-256 hex');
 const count=Math.ceil(expectedBytes/partBytes);
 const parts=Array.from({length:count},(_,index)=>({partNumber:index+1,offset:index*partBytes,bytes:Math.min(partBytes,expectedBytes-index*partBytes)}));
 const plan={format:FORMAT,ownerId,uploadId,objectKey:`private/uploads/${ownerId}/${uploadId}/source`,expectedBytes,partBytes,expectedWholeFileSha256,parts};
 // This detects changed plans; it is deliberately not an authentication signature.
 return {...plan,planDigest:sha(JSON.stringify(plan)).toString('hex')};
}

function checkedPlan(plan,context){
 if(!plan||typeof plan!=='object'||plan.format!==FORMAT)invalid('Unsupported multipart plan');
 if(!context||context.ownerId!==plan.ownerId||context.uploadId!==plan.uploadId)invalid('Multipart plan does not belong to the authenticated upload');
 const expected=planMultipartUpload(plan);
 const sameParts=Array.isArray(plan.parts)&&plan.parts.length===expected.parts.length&&plan.parts.every((part,index)=>part&&Object.keys(part).length===3&&['partNumber','offset','bytes'].every(key=>part[key]===expected.parts[index][key]));
 if(plan.objectKey!==expected.objectKey||plan.planDigest!==expected.planDigest||!sameParts)invalid('Multipart plan was changed or has invalid boundaries');
 return expected;
}

/** Build the exact CompleteMultipartUpload parts, without making a provider call.
 * Receipts must come from a trusted adapter, never directly from a browser.
 * ETags are opaque: they are not accepted as file hashes.
 */
export function prepareMultipartCompletion(plan,receipts,context){
 const checked=checkedPlan(plan,context);
 if(!Array.isArray(receipts)||receipts.length!==checked.parts.length)invalid('Exactly one verified receipt is required for every planned part');
 const byNumber=new Map();
 for(const receipt of receipts){
  if(!receipt||!Number.isSafeInteger(receipt.partNumber)||receipt.partNumber<1||receipt.partNumber>checked.parts.length||byNumber.has(receipt.partNumber))invalid('Part numbers must be unique and cover the plan');
  const expected=checked.parts[receipt.partNumber-1];
  if(receipt.bytes!==expected.bytes)invalid('Part size does not match the planned boundary');
  if(typeof receipt.sha256!=='string'||!/^[a-f0-9]{64}$/.test(receipt.sha256))invalid('Every part needs a verified SHA-256 digest; an ETag is insufficient');
  if(typeof receipt.etag!=='string'||!receipt.etag.trim()||receipt.etag.length>256||/[\x00-\x1f\x7f]/.test(receipt.etag))invalid('Part ETag must be a bounded opaque value without control characters');
  byNumber.set(receipt.partNumber,receipt);
 }
 const ordered=checked.parts.map(part=>byNumber.get(part.partNumber));
 return {
  format:'streamatlas-s3-multipart-completion-v1',objectKey:checked.objectKey,
  uploadId:checked.uploadId,ownerId:checked.ownerId,expectedBytes:checked.expectedBytes,
  parts:ordered.map(part=>({PartNumber:part.partNumber,ETag:part.etag,ChecksumSHA256:Buffer.from(part.sha256,'hex').toString('base64')})),
  // AWS SHA-256 multipart COMPOSITE differs from SHA-256 of the complete file.
  compositeChecksumSha256:sha(Buffer.concat(ordered.map(part=>Buffer.from(part.sha256,'hex')))).toString('base64')+'-'+ordered.length,
  expectedWholeFileSha256:checked.expectedWholeFileSha256,
  wholeFileVerified:false,providerVerified:false,publicationAuthorized:false,
 };
}
