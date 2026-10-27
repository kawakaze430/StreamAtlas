/** Durable, disposable private multipart storage adapter.
 * This stores only local synthetic parts. It does not sign provider requests,
 * attest remote storage, grant playback, or authorize publication.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {validateMultipartPlan} from './multipart-contract.js';

const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const invalid=message=>{throw new Error(message)};

function checkedDirectory(directory){
 let created=false;
 try{fs.mkdirSync(directory,{mode:0o700});created=true}catch(error){if(error.code!=='EEXIST')throw error}
 const stat=fs.lstatSync(directory);
 if(!stat.isDirectory()||stat.isSymbolicLink()||(stat.mode&0o077)!==0)invalid('Private multipart directory must be owner-only and not a link');
 // A new child directory is not durable across a power loss until its parent
 // directory entry is synced. Part and receipt writes sync their own parent.
 if(created)syncDirectory(path.dirname(directory));
 return directory;
}

function readRegular(file){
 let fd;
 try{
  fd=fs.openSync(file,fs.constants.O_RDONLY|fs.constants.O_NOFOLLOW);
  const stat=fs.fstatSync(fd);
  if(!stat.isFile()||stat.size>27*1024*1024)invalid('Unsafe private multipart file');
  return fs.readFileSync(fd);
 }finally{if(fd!==undefined)fs.closeSync(fd)}
}

function optionalRegular(file){
 try{return readRegular(file)}catch(error){if(error.code==='ENOENT')return null;throw error}
}

function syncDirectory(directory){
 const fd=fs.openSync(directory,fs.constants.O_RDONLY|fs.constants.O_DIRECTORY|fs.constants.O_NOFOLLOW);
 try{fs.fsyncSync(fd)}finally{fs.closeSync(fd)}
}

/** Publish immutable bytes without replacing a previous successful write. */
function writeImmutable(destination,bytes){
 const existing=optionalRegular(destination);
 if(existing){if(!existing.equals(bytes))invalid('Conflicting private multipart state');return false}
 const temporary=destination+'.'+crypto.randomUUID()+'.tmp';
 let fd;
 try{
  fd=fs.openSync(temporary,fs.constants.O_WRONLY|fs.constants.O_CREAT|fs.constants.O_EXCL|fs.constants.O_NOFOLLOW,0o600);
  fs.writeFileSync(fd,bytes);fs.fsyncSync(fd);fs.closeSync(fd);fd=undefined;
  try{fs.linkSync(temporary,destination)}catch(error){
   if(error.code!=='EEXIST')throw error;
   const winner=readRegular(destination);
   if(!winner.equals(bytes))invalid('Conflicting private multipart state');
  }
  syncDirectory(path.dirname(destination));
  return true;
 }finally{
  if(fd!==undefined)fs.closeSync(fd);
  try{fs.unlinkSync(temporary)}catch(error){if(error.code!=='ENOENT')throw error}
 }
}

function checkedReceipt(file,expected,partFile){
 const bytes=optionalRegular(file);
 if(!bytes)return null;
 let receipt;
 try{receipt=JSON.parse(bytes.toString('utf8'))}catch{invalid('Corrupt private part receipt')}
 if(!receipt||receipt.partNumber!==expected.partNumber||receipt.bytes!==expected.bytes||
    !/^[a-f0-9]{64}$/.test(receipt.sha256||'')||
    receipt.localReceiptId!==`local-sha256-${receipt.sha256}`)invalid('Invalid private part receipt');
 const payload=readRegular(partFile);
 if(payload.length!==expected.bytes||sha(payload)!==receipt.sha256)invalid('Stored private part differs from its verified receipt');
 return receipt;
}

export class PrivateMultipartStore {
 constructor(root){
  if(typeof root!=='string'||!path.isAbsolute(root))invalid('Absolute private multipart root required');
  this.root=path.resolve(root);
  for(let parent=path.dirname(this.root);parent!==path.dirname(parent);parent=path.dirname(parent)){
   const stat=fs.lstatSync(parent);
   if(!stat.isDirectory()||stat.isSymbolicLink())invalid('Private multipart root has an unsafe parent');
  }
  checkedDirectory(this.root);
  if(fs.realpathSync(this.root)!==this.root)invalid('Private multipart root resolves through a link');
 }

 namespace(plan,context){
  const checked=validateMultipartPlan(plan,context);
  // A private parent and fixed numeric/UUID child names exclude traversal and
  // prevent an untrusted upload from selecting another caller's files.
  if(fs.realpathSync(this.root)!==this.root)invalid('Private multipart root changed');
  const owner=checkedDirectory(path.join(this.root,String(checked.ownerId)));
  const upload=checkedDirectory(path.join(owner,checked.uploadId));
  const parts=checkedDirectory(path.join(upload,'parts'));
  writeImmutable(path.join(upload,'plan.json'),Buffer.from(JSON.stringify(checked)));
  return {checked,upload,parts};
 }

 resume(plan,context){
  const {checked,parts}=this.namespace(plan,context),verified=[],missing=[];
  for(const part of checked.parts){
   const receipt=checkedReceipt(path.join(parts,part.partNumber+'.json'),part,path.join(parts,part.partNumber+'.part'));
   (receipt?verified:missing).push(part.partNumber);
  }
  return {ownerId:checked.ownerId,uploadId:checked.uploadId,verified,missing,providerVerified:false};
 }

 putPart(plan,context,partNumber,bytes){
  const {checked,parts}=this.namespace(plan,context),expected=checked.parts[partNumber-1];
  if(!Number.isSafeInteger(partNumber)||!expected||!Buffer.isBuffer(bytes)||bytes.length!==expected.bytes)
   invalid('Part does not match the reviewed multipart boundary');
  const digest=sha(bytes),partFile=path.join(parts,partNumber+'.part');
  writeImmutable(partFile,bytes);
  const receipt={partNumber,bytes:bytes.length,sha256:digest,localReceiptId:`local-sha256-${digest}`};
  writeImmutable(path.join(parts,partNumber+'.json'),Buffer.from(JSON.stringify(receipt)));
  // A conflicting or corrupted prior receipt cannot be repaired by overwriting.
  checkedReceipt(path.join(parts,partNumber+'.json'),expected,partFile);
  return {...receipt,providerVerified:false};
 }

 complete(plan,context){
  const {checked,upload,parts}=this.namespace(plan,context);
  if(!checked.expectedWholeFileSha256)invalid('A reviewed whole-file SHA-256 is required before local completion');
  const chunks=[],receipts=[];
  for(const part of checked.parts){
   const partFile=path.join(parts,part.partNumber+'.part');
   const receipt=checkedReceipt(path.join(parts,part.partNumber+'.json'),part,partFile);
   if(!receipt)invalid('Missing verified private part');
   chunks.push(readRegular(partFile));receipts.push(receipt);
  }
  const source=Buffer.concat(chunks),digest=sha(source);
  if(source.length!==checked.expectedBytes||digest!==checked.expectedWholeFileSha256)
   invalid('Private whole-file checksum differs from the reviewed plan');
  const sourcePath=path.join(upload,'source.bin');
  writeImmutable(sourcePath,source);
  const completion={planDigest:checked.planDigest,wholeFileSha256:digest,bytes:source.length,
   localWholeFileVerified:true,wholeFileVerified:false,providerVerified:false,publicationAuthorized:false};
  writeImmutable(path.join(upload,'completion.json'),Buffer.from(JSON.stringify(completion)));
  // Deliberately omit provider ETags and CompleteMultipartUpload wire fields:
  // these local receipts cannot attest that any cloud provider stored a part.
  return {format:'streamatlas-private-local-multipart-v1',ownerId:checked.ownerId,
   uploadId:checked.uploadId,partsVerified:receipts.length,sourcePath,...completion};
 }
}
