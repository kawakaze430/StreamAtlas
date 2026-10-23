/**
 * Private, single-API-writer upload journal repair.
 *
 * The file is fsync'd BEFORE the SQLite received_bytes transaction. After a
 * crash between those operations the file may be ahead of the database. Only
 * a byte-for-byte replay of the same chunk may repair that condition.
 * This is NOT a distributed lock: multi-instance uploads require a durable
 * object-store multipart protocol or a single-owner / distributed lease.
 */
import fs from 'node:fs';

function conflict(message){const error=new Error(message);error.status=409;throw error;}
function equalAt(fd,offset,bytes){
 const found=Buffer.allocUnsafe(bytes.length);
 let read=0;
 while(read<bytes.length){const n=fs.readSync(fd,found,read,bytes.length-read,offset+read);if(n===0)return false;read+=n;}
 return found.equals(bytes);
}

/** Returns a file result only; caller must advance DB with a compare-and-set. */
export function storeUploadChunk(file,{offset,receivedBytes,expectedBytes,chunk}){
 if(!Buffer.isBuffer(chunk)||!Number.isSafeInteger(offset)||offset<0||!Number.isSafeInteger(receivedBytes)||receivedBytes<0||!Number.isSafeInteger(expectedBytes)||expectedBytes<=0||offset+chunk.length>expectedBytes||chunk.length===0)conflict('Invalid upload chunk state or bounds.');
 const exists=fs.existsSync(file);
 // No symlink is permitted inside the private upload spool.
 if(exists&&!fs.lstatSync(file).isFile())conflict('Upload spool must be a regular file.');
 const flags=exists?'r+':'wx+';
 const fd=fs.openSync(file,flags,0o600);
 try{
  const stored=fs.fstatSync(fd).size;
  if(!Number.isSafeInteger(stored)||stored>expectedBytes||stored<receivedBytes)conflict('Stored upload differs from committed progress; manual recovery required.');
  if(offset<receivedBytes){
   // Lost HTTP response: repeat of a previously committed chunk must not append.
   if(offset+chunk.length>receivedBytes||!equalAt(fd,offset,chunk))conflict('Retry bytes do not match the committed upload.');
   return {receivedBytes,idempotent:true,recoveredBytes:0};
  }
  if(offset!==receivedBytes)conflict('Incorrect upload offset; refresh upload status and retry.');
  if(stored>offset+chunk.length)conflict('Uncommitted bytes extend beyond the retried chunk; manual recovery required.');
  const orphan=stored-offset;
  if(orphan>0&&!equalAt(fd,offset,chunk.subarray(0,orphan)))conflict('Retry bytes do not match uncommitted data; upload is quarantined from advancing.');
  let written=orphan;
  while(written<chunk.length){
   const count=fs.writeSync(fd,chunk,written,chunk.length-written,offset+written);
   if(count<=0)throw Error('Upload spool write failed.');
   written+=count;
  }
  fs.fsyncSync(fd);
  if(fs.fstatSync(fd).size!==offset+chunk.length)throw Error('Upload spool write length changed unexpectedly.');
  return {receivedBytes:offset+chunk.length,idempotent:false,recoveredBytes:orphan};
 }finally{fs.closeSync(fd)}
}
