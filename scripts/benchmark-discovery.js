/** Local-only SQLite catalog search benchmark. Requires an explicit disposable DB_PATH. */
import {performance} from 'node:perf_hooks';
if(!process.env.DB_PATH)throw Error('Set DB_PATH to an ephemeral synthetic SQLite path; refusing to benchmark an implicit live database.');
const {db,all,one}=await import('../src/database.js');
const rows=one('SELECT COUNT(*) AS n FROM videos').n;
const terms=['demo','studio','sample','scene','channel'];
const sql="SELECT id,title FROM videos WHERE status='PUBLISHED' AND title LIKE ? ORDER BY published_at DESC,id DESC LIMIT 24";
const times=[];const stmt=db.prepare(sql);
for(let i=0;i<1000;i++){
 const start=performance.now();stmt.all('%'+terms[i%terms.length]+'%');times.push(performance.now()-start);
}
times.sort((a,b)=>a-b);
const plan=all('EXPLAIN QUERY PLAN '+sql,'%demo%').map(x=>x.detail);
const report={engine:'SQLite node:sqlite',syntheticVideoRows:rows,iterations:times.length,p50Ms:Number(times[499].toFixed(4)),p95Ms:Number(times[949].toFixed(4)),p99Ms:Number(times[989].toFixed(4)),plan,decision:'Insufficient dataset size to justify or validate an OpenSearch migration. Repeat with authorized representative volumes and workloads.'};
console.log(JSON.stringify(report,null,2));
