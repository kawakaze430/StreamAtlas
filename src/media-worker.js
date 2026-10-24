/** Restartable single-owner SQLite media worker.
 * Coordinates through a heartbeat lease; only the owner may run recovery.
 * Runs in a separate process (or optionally the network-disabled worker container).
 */
import crypto from 'node:crypto';
import {setTimeout as pause} from 'node:timers/promises';
import {recoverUploads,processUpload} from './uploads.js';
import {one} from './database.js';
import {acquireWorkerLease,renewWorkerLease,releaseWorkerLease} from './worker-lease.js';
const owner=crypto.randomUUID();let stopping=false;
const controller=new AbortController();
function stop({leaseLost=false}={}){
 stopping=true;
 if(leaseLost)process.exitCode=1;
 controller.abort();
}
process.on('SIGINT',()=>stop());process.on('SIGTERM',()=>stop());
const delay=async ms=>{try{await pause(ms,undefined,{signal:controller.signal});}catch(error){if(!controller.signal.aborted)throw error;}};
let acquired=false;
try{
 while(!stopping&&!acquired){acquired=acquireWorkerLease(owner);if(!acquired)await delay(1500)}
 if(acquired&&!stopping){
  const heartbeat=setInterval(()=>{
   try{if(renewWorkerLease(owner))return;}catch{}
   console.error('Worker lease lost or renewal failed; stopping active processing');stop({leaseLost:true});
  },2000);
  try{
   recoverUploads({owner,signal:controller.signal});console.log('StreamAtlas worker ready with singleton SQLite lease');
   while(!stopping){
    const job=one("SELECT id FROM upload_sessions WHERE status='QUEUED' ORDER BY created_at,id LIMIT 1");
    if(job){
     const result=await processUpload(job.id,{owner,signal:controller.signal});
     if(result?.interrupted&&!stopping)stop({leaseLost:true});
    }else await delay(400);
   }
  }finally{clearInterval(heartbeat)}
 }
}finally{if(acquired)releaseWorkerLease(owner)}
