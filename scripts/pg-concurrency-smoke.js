/** Disposable PostgreSQL concurrent-write/idempotency smoke (not a load test). */
import {spawn,spawnSync} from 'node:child_process';
import {requireDisposableEnv} from './pg-migrations.js';
const args=['-X','-v','ON_ERROR_STOP=1','-A','-t','-q'];
function sqlSync(sql){const r=spawnSync('psql',args,{input:sql,encoding:'utf8',env:process.env,timeout:30000});if(r.status!==0)throw Error('psql smoke setup failed: '+(r.stderr||r.error?.message||'').slice(0,500));return r.stdout.trim();}
function sqlAsync(sql){return new Promise((resolve,reject)=>{
 const child=spawn('psql',args,{stdio:['pipe','pipe','pipe'],env:process.env});let stderr='',stdout='';
 child.stdout.on('data',d=>stdout+=d);child.stderr.on('data',d=>stderr+=d);
 child.on('error',reject);child.on('close',code=>code===0?resolve(stdout.trim()):reject(Error('Concurrent psql failed: '+stderr.slice(0,500))));child.stdin.end(sql);
 });}
export async function smoke(){
 requireDisposableEnv();
 if(Number(sqlSync('SHOW server_version_num;'))<160000)throw Error('PostgreSQL 16+ required');
 sqlSync('CREATE TABLE IF NOT EXISTS sa_disposable_write_smoke (key TEXT PRIMARY KEY, count INTEGER NOT NULL DEFAULT 0); TRUNCATE sa_disposable_write_smoke;');
 const work=Array.from({length:8},()=>sqlAsync("BEGIN; INSERT INTO sa_disposable_write_smoke(key,count) VALUES('counter',1) ON CONFLICT(key) DO UPDATE SET count=sa_disposable_write_smoke.count+1; INSERT INTO sa_disposable_write_smoke(key,count) VALUES('idempotent',1) ON CONFLICT(key) DO NOTHING; COMMIT;"));
 await Promise.all(work);
 const result=sqlSync("SELECT key || '|' || count FROM sa_disposable_write_smoke ORDER BY key;");
 if(result!=='counter|8\nidempotent|1')throw Error('Concurrent transaction/idempotency smoke mismatch: '+result);
 return {verified:true,concurrentClients:8,counter:8,idempotentRows:1,scope:'disposable PostgreSQL only; not representative throughput'};
}
if(process.argv[1]?.endsWith('pg-concurrency-smoke.js'))smoke().then(x=>console.log(JSON.stringify(x))).catch(e=>{console.error(e.message);process.exitCode=1;});
