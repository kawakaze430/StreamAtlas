/** Proposal-only AI creator assistance: NEVER automatically edits or publishes media.
 * A provider is injected by an operator; this implementation neither calls a model nor
 * accepts arbitrary tool instructions. All proposals require human review and evidence.
 */
import crypto from 'node:crypto';
const bad=x=>Object.assign(new Error(x),{code:x});
const clean=x=>typeof x==='string'&&x.length>0&&x.length<=200&&!/[\x00-\x1f<>]/.test(x);
export async function proposeCreatorMetadata({title,transcript=[],taxonomy=[],provider,rightsReviewed=false,humanReviewRequired=true}={}){
 if(!rightsReviewed||humanReviewRequired!==true)throw bad('EVIDENCE_AND_MANUAL_REVIEW_REQUIRED');
 if(!clean(title)||!Array.isArray(transcript)||transcript.length>200||transcript.some(x=>!clean(x))||!Array.isArray(taxonomy)||taxonomy.length>200||taxonomy.some(x=>!clean(x))||typeof provider!=='function')throw bad('INVALID_AI_SUGGESTION_INPUT');
 // Never send transcripts to a remote model without a separately approved data-processing agreement.
 const proposal=await provider(Object.freeze({title,transcript:Object.freeze([...transcript]),taxonomy:Object.freeze([...taxonomy])}));
 if(!proposal||typeof proposal!=='object'||!Array.isArray(proposal.tags)||proposal.tags.length>12||proposal.tags.some(x=>!taxonomy.includes(x))||!clean(proposal.title)||proposal.title.length>120||!Array.isArray(proposal.captions)||proposal.captions.length>500)throw bad('UNTRUSTED_MODEL_RESPONSE');
 let lastEnd=0;
 const captions=proposal.captions.map(item=>{
  const {startMs,endMs,text}=item||{};
  if(!Number.isSafeInteger(startMs)||!Number.isSafeInteger(endMs)||startMs<lastEnd||endMs<=startMs||endMs-startMs>15000||!clean(text)||text.length>160)throw bad('INVALID_CAPTION_PROPOSAL');
  lastEnd=endMs;return {startMs,endMs,text};
 });
 const fingerprint=crypto.createHash('sha256').update(JSON.stringify({title,proposal})).digest('hex');
 return {id:fingerprint.slice(0,20),source:'UNVERIFIED_MODEL_PROPOSAL',status:'PENDING_HUMAN_REVIEW',title:proposal.title,tags:[...new Set(proposal.tags)],captions,providerApprovalRecorded:false,published:false,requireHumanReview:true,modelFingerprint:fingerprint};
}
export function reviewCreatorProposal(proposal,{reviewerId,decision,notes,evidenceReviewed=false}={}){
 if(proposal?.status!=='PENDING_HUMAN_REVIEW'||!Number.isSafeInteger(reviewerId)||reviewerId<1||!['ACCEPT','REJECT'].includes(decision)||!clean(notes)||notes.length<12||!evidenceReviewed)throw bad('REVIEW_REQUIRED');
 return {...proposal,status:decision==='ACCEPT'?'APPROVED_FOR_DRAFT':'REJECTED',reviewerId,reviewNotes:notes,published:false,providerApprovalRecorded:proposal.providerApprovalRecorded};
}

/** P2 K07: auditable proposed earnings, never a promise of payment.
 * BigInt minor units avoid float rounding, and partner approval is a hard gate.
 */
export function calculateCreatorDraft({partnerApproved=false,contractRef,ledger=[],commissionBasisPoints=0,currency='USD',reviewerApproved=false}={}){
 if(!partnerApproved||!reviewerApproved||typeof contractRef!=='string'||!/^[A-Z0-9][A-Z0-9_-]{10,79}$/.test(contractRef))return {payable:false,reason:'CONTRACT_OR_PARTNER_APPROVAL_MISSING',transfersInitiated:0};
 if(!['USD','EUR','INR'].includes(currency)||!Number.isSafeInteger(commissionBasisPoints)||commissionBasisPoints<0||commissionBasisPoints>10000||!Array.isArray(ledger)||ledger.length>10000)throw bad('INVALID_EARNINGS_INPUT');
 const ids=new Set();let gross=0n;
 for(const e of ledger){if(!e||typeof e.eventId!=='string'||!/^evt_[a-zA-Z0-9_-]{8,80}$/.test(e.eventId)||ids.has(e.eventId)||typeof e.minorUnits!=='string'||!/^[0-9]{1,15}$/.test(e.minorUnits)||e.verified!==true)throw bad('UNVERIFIED_OR_DUPLICATE_REVENUE');ids.add(e.eventId);gross+=BigInt(e.minorUnits)}
 const fee=(gross*BigInt(commissionBasisPoints)+5000n)/10000n;
 return {payable:false,reason:'AUDITED_INVOICE_AND_PAYMENT_PROVIDER_REQUIRED',grossMinorUnits:gross.toString(),creatorDraftMinorUnits:(gross-fee).toString(),commissionMinorUnits:fee.toString(),events:ids.size,currency,contractRef,transfersInitiated:0,estimateOnly:true};
}
