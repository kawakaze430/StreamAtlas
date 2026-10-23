/** Local operational metrics for the single-host preview. No private fields or secrets. */
import fs from 'node:fs';
import path from 'node:path';
import {one,all} from './database.js';

export function operationsSnapshot({privateDir=process.env.PRIVATE_PATH||path.resolve('data/private')}={}) {
 const worker=one("SELECT owner,expires_at FROM worker_lease WHERE name='transcoder'");
 const jobs=all('SELECT status,COUNT(*) AS count FROM upload_sessions GROUP BY status');
 const map=Object.fromEntries(jobs.map(x=>[x.status,Number(x.count)]));
 const dbCheck=one('PRAGMA quick_check')?.quick_check||'unknown';
 let diskWritable=false;
 try {fs.mkdirSync(privateDir,{recursive:true});fs.accessSync(privateDir,fs.constants.W_OK);diskWritable=true}catch {}
 const now=Date.now();
 return {
  databaseOk:dbCheck==='ok',privateStorageWritable:diskWritable,
  workerLeaseActive:!!worker&&worker.expires_at>now,
  workerLeaseAgeSeconds:worker&&worker.expires_at>now?Math.max(0,Math.floor((20000-(worker.expires_at-now))/1000)):null,
  queued:map.QUEUED||0,processing:map.PROCESSING||0,awaitingReview:map.IN_REVIEW||0,
  failed:map.FAILED||0,published:map.PUBLISHED||0,
  generatedAt:new Date(now).toISOString()
 };
}

export function workerHealth(snapshot,{requireWorker=false}={}) {
 return snapshot.databaseOk&&snapshot.privateStorageWritable&&(!requireWorker||snapshot.workerLeaseActive);
}
