/** Low-cardinality Prometheus metrics without paths, IDs, tokens or user attributes. */
import crypto from 'node:crypto';
import {operationsSnapshot} from './operations.js';
const launched=Date.now(),count=new Map(),buckets=[0.01,0.025,0.05,0.1,0.25,0.5,1,2,5,10];
let sum=0,samples=0;const hist=Array(buckets.length).fill(0);
export function countResponse(method,status,durationSeconds){
 const safeMethod=['GET','HEAD','POST','PATCH','PUT','DELETE','OPTIONS'].includes(method)?method:'OTHER';
 const key=`${safeMethod}|${Math.floor((Number(status)||500)/100)}xx`;count.set(key,(count.get(key)||0)+1);
 const duration=Number.isFinite(durationSeconds)?Math.max(0,durationSeconds):0;sum+=duration;samples++;
 for(let i=0;i<buckets.length;i++)if(duration<=buckets[i])hist[i]++;
}
export function authorizeMetrics(authorization,secret){
 if(typeof secret!=='string'||secret.length<32)return false;
 const provided=String(authorization||'');if(!provided.startsWith('Bearer '))return false;
 const token=provided.slice(7);const a=Buffer.from(token),b=Buffer.from(secret);
 return a.length===b.length&&crypto.timingSafeEqual(a,b);
}
export function metricsText(){
 const lines=['# HELP streamatlas_http_requests_total HTTP responses by method/status class (no user IDs)',
 '# TYPE streamatlas_http_requests_total counter'];
 for(const [key,value] of [...count].sort()){const [method,status]=key.split('|');lines.push(`streamatlas_http_requests_total{method="${method}",status_class="${status}"} ${value}`)}
 lines.push('# TYPE streamatlas_http_request_duration_seconds histogram');
 for(let i=0;i<buckets.length;i++)lines.push(`streamatlas_http_request_duration_seconds_bucket{le="${buckets[i]}"} ${hist[i]}`);
 lines.push(`streamatlas_http_request_duration_seconds_bucket{le="+Inf"} ${samples}`);
 lines.push(`streamatlas_http_request_duration_seconds_sum ${sum}`);
 lines.push(`streamatlas_http_request_duration_seconds_count ${samples}`);
 lines.push('# TYPE streamatlas_process_resident_memory_bytes gauge');
 lines.push(`streamatlas_process_resident_memory_bytes ${process.memoryUsage().rss}`);
 const op=operationsSnapshot();
 for(const [metric,value] of Object.entries({
  streamatlas_database_ready:op.databaseOk?1:0,
  streamatlas_private_storage_writable:op.privateStorageWritable?1:0,
  streamatlas_media_worker_lease_active:op.workerLeaseActive?1:0,
  streamatlas_media_jobs_queued:op.queued,
  streamatlas_media_jobs_processing:op.processing,
  streamatlas_media_jobs_failed:op.failed,
  streamatlas_media_jobs_review:op.awaitingReview
 })){
  lines.push(`# TYPE ${metric} gauge`);
  lines.push(`${metric} ${value}`);
 }
 lines.push('# TYPE streamatlas_uptime_seconds gauge');
 lines.push(`streamatlas_uptime_seconds ${Math.floor((Date.now()-launched)/1000)}`);
 return lines.join('\n')+'\n';
}
