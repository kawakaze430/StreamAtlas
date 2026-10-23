/** Restartable single-owner SQLite media worker.
 * Coordinates through a heartbeat lease; only the owner may run recovery.
 * Runs in a separate process (or optionally the network-disabled worker container).
 */
import crypto from 'node:crypto';
import {recoverUploads,processUpload} from './uploads.js';
import {one} from './database.js';
import {acquireWorkerLease,renewWorkerLease,releaseWorkerLease} from './worker-lease.js';
const owner=crypto.randomUUID();let stopping=false;
process.on('SIGINT',()=>{stopping=true});process.on('SIGTERM',()=>{stopping=true});
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let acquired=false;
try{
 while(!stopping&&!acquired){acquired=acquireWorkerLease(owner);if(!acquired)await delay(1500)}
 if(acquired){
  const heartbeat=setInterval(()=>{if(!renewWorkerLease(owner)){console.error('Worker lease lost; exiting');process.exitCode=1;stopping=true}},2000);
  try{
   recoverUploads();console.log('StreamAtlas worker ready with singleton SQLite lease');
   while(!stopping){
    const job=one("SELECT id FROM upload_sessions WHERE status='QUEUED' ORDER BY created_at,id LIMIT 1");
    if(job)await processUpload(job.id);else await delay(400);
   }
  }finally{clearInterval(heartbeat)}
 }
}finally{if(acquired)releaseWorkerLease(owner)}
