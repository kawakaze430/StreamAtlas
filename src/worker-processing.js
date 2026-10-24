/** Fenced processing attempts for the single-SQLite worker, not distributed jobs. */
import {spawn} from 'node:child_process';
import {db,one,run,now} from './database.js';
import {ownsWorkerLease} from './worker-lease.js';

export class ProcessingInterrupted extends Error {
 constructor(message='Media processing interrupted; restart recovery required'){
  super(message);this.name='ProcessingInterrupted';this.code='PROCESSING_INTERRUPTED';
 }
}

function requireOwner(owner,signal,{allowAborted=false}={}){
 if(!allowAborted&&signal?.aborted)throw new ProcessingInterrupted();
 if(owner!==undefined){
  if(!ownsWorkerLease(owner))throw new ProcessingInterrupted('Worker lease is no longer owned');
 }else{
  // Explicit inline/test mode must not race an already active external worker.
  const lease=one('SELECT expires_at FROM worker_lease WHERE name=?','transcoder');
  if(lease?.expires_at>Date.now())throw new ProcessingInterrupted('An external worker owns processing');
 }
}

export function assertWorkerProcessingOwner(owner,signal){requireOwner(owner,signal);}

export function claimProcessingAttempt(id,{owner,signal}={}){
 db.exec('BEGIN IMMEDIATE');
 try{
  requireOwner(owner,signal);
  const upload=one('SELECT status,attempts FROM upload_sessions WHERE id=?',id);
  if(!upload||upload.status!=='QUEUED'||upload.attempts>=2){db.exec('COMMIT');return null;}
  const result=run("UPDATE upload_sessions SET status='PROCESSING',attempts=attempts+1,updated_at=? WHERE id=? AND status='QUEUED' AND attempts=?",now(),id,upload.attempts);
  db.exec('COMMIT');
  return result.changes?{id,attempt:upload.attempts+1,owner,signal}:null;
 }catch(error){db.exec('ROLLBACK');throw error;}
}

export function assertProcessingAttempt(claim,options){
 requireOwner(claim.owner,claim.signal,options);
 const upload=one('SELECT status,attempts FROM upload_sessions WHERE id=?',claim.id);
 if(!upload||upload.status!=='PROCESSING'||upload.attempts!==claim.attempt)throw new ProcessingInterrupted('Processing attempt was superseded');
}

export function withProcessingAttempt(claim,change,options){
 db.exec('BEGIN IMMEDIATE');
 try{
  assertProcessingAttempt(claim,options);
  const result=change();
  // A successor cannot take the SQLite lease during this write transaction.
  assertProcessingAttemptLease(claim,options);
  db.exec('COMMIT');return result;
 }catch(error){db.exec('ROLLBACK');throw error;}
}

function assertProcessingAttemptLease(claim,options){requireOwner(claim.owner,claim.signal,options);}

/** Wait for child close after cancellation, so a released lease has no live encoder. */
export function runProcessingCommand(program,args,{signal,timeout=90000,capture=false,maxOutput=256000}={}){
 if(signal?.aborted)return Promise.reject(new ProcessingInterrupted());
 return new Promise((resolve,reject)=>{
  const child=spawn(program,args,{stdio:['ignore',capture?'pipe':'ignore','pipe']});
  let stdout='',stderr='',failure,aborted=false;
  const cancel=()=>{aborted=true;child.kill('SIGKILL');};
  const timer=setTimeout(()=>{failure=Error('Media processing timeout exceeded');child.kill('SIGKILL');},timeout);
  signal?.addEventListener('abort',cancel,{once:true});
  if(signal?.aborted)cancel();
  child.stdout?.on('data',data=>{
   if(Buffer.byteLength(stdout)+data.length>maxOutput){failure=Error('Media probe output limit exceeded');child.kill('SIGKILL');}
   else stdout+=data.toString();
  });
  child.stderr.on('data',data=>{if(stderr.length<1600)stderr+=data.toString().slice(0,1600-stderr.length);});
  child.once('error',error=>{failure=error;});
  child.once('close',code=>{
   clearTimeout(timer);signal?.removeEventListener('abort',cancel);
   if(aborted)return reject(new ProcessingInterrupted());
   if(failure)return reject(failure);
   if(code!==0)return reject(Error(`Media worker failed (${program}, ${code}): ${stderr.slice(0,300)}`));
   resolve({stdout});
  });
 });
}
