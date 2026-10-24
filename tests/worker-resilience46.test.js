import test,{after,afterEach} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawn,spawnSync} from 'node:child_process';

const root=path.resolve(import.meta.dirname,'..');
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'sa-worker46-'));
process.env.DB_PATH=path.join(tmp,'jobs.db');
process.env.PRIVATE_PATH=path.join(tmp,'private');
process.env.NODE_ENV='development';
process.env.SA_REQUIRE_MALWARE_SCAN='0';
const {db,run,one,all,now}=await import('../src/database.js');
const {processUpload}=await import('../src/uploads.js');
const {runProcessingCommand,ProcessingInterrupted}=await import('../src/worker-processing.js');
const {scanUploadedFile}=await import('../src/media-safety.js');
const parts=path.join(tmp,'private','uploads');
const processed=path.join(tmp,'private','processed');
const workers=new Set(),pids=new Set();
const userId=Number(run('INSERT INTO users(email,name,created_at) VALUES(?,?,?)','worker46@example.test','Synthetic worker QA',now()).lastInsertRowid);
const media=path.join(tmp,'synthetic.mp4');
const fixture=spawnSync(process.env.FFMPEG_PATH||'ffmpeg',['-hide_banner','-loglevel','error','-nostdin','-f','lavfi','-i','color=c=blue:s=160x90:r=10','-t','0.6','-an','-c:v','libx264','-pix_fmt','yuv420p',media],{encoding:'utf8',timeout:15000});
assert.equal(fixture.status,0,fixture.stderr);
const bytes=fs.readFileSync(media);
const sha=crypto.createHash('sha256').update(bytes).digest('hex');

function seedJob(){
 const id=crypto.randomUUID();
 const videoId=Number(run('INSERT INTO videos(title,slug,poster,media_url,status,published_at) VALUES(?,?,?,?,?,?)','Synthetic worker recovery','worker-'+id,'','', 'DRAFT',now()).lastInsertRowid);
 run('INSERT INTO upload_sessions(id,user_id,video_id,original_filename,declared_type,expected_bytes,received_bytes,sha256,status,attempts,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)',id,userId,videoId,'synthetic.mp4','video/mp4',bytes.length,bytes.length,sha,'QUEUED',0,now(),now());
 fs.writeFileSync(path.join(parts,id+'.part'),bytes,{mode:0o600});
 return {id,videoId};
}
function holdProgram(marker){
 const file=path.join(tmp,'hold-'+crypto.randomUUID());
 fs.writeFileSync(file,`#!${process.execPath}\nimport fs from 'node:fs';\nfs.writeFileSync(${JSON.stringify(marker)},JSON.stringify({pid:process.pid}));\nsetInterval(()=>{},1000);\n`,{mode:0o700});
 return file;
}
function alive(pid){
 try{
  process.kill(pid,0);
  const stat=fs.readFileSync(`/proc/${pid}/stat`,'utf8');
  return !/\) Z /.test(stat);
 }catch(error){if(['ESRCH','ENOENT'].includes(error.code))return false;throw error;}
}
async function until(check,description,timeout=10000){
 const end=Date.now()+timeout;
 do{if(check())return;await new Promise(resolve=>setTimeout(resolve,20));}while(Date.now()<end);
 assert.fail('Timed out waiting for '+description);
}
async function bounded(promise,timeout=5000){
 let timer;
 try{return await Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Child process did not exit')),timeout);})]);}
 finally{clearTimeout(timer);}
}
function worker(ffmpeg){
 const env={...process.env,NODE_ENV:'development',SA_REQUIRE_MALWARE_SCAN:'0'};
 delete env.NODE_TEST_CONTEXT;
 if(ffmpeg)env.FFMPEG_PATH=ffmpeg;
 const child=spawn(process.execPath,['src/media-worker.js'],{cwd:root,env,stdio:['ignore','pipe','pipe']});
 const entry={child,output:''};
 entry.done=new Promise((resolve,reject)=>{child.once('error',reject);child.once('close',(code,signal)=>{workers.delete(entry);resolve({code,signal});});});
 child.stdout.on('data',b=>{entry.output=(entry.output+b.toString()).slice(-4000);});
 child.stderr.on('data',b=>{entry.output=(entry.output+b.toString()).slice(-4000);});
 workers.add(entry);return entry;
}
async function stop(entry,signal='SIGTERM'){
 entry.child.kill(signal);
 return bounded(entry.done);
}
async function encoderPid(marker){
 await until(()=>fs.existsSync(marker),'encoder start');
 const pid=JSON.parse(fs.readFileSync(marker)).pid;
 pids.add(pid);return pid;
}
function state(id){return one('SELECT status,attempts FROM upload_sessions WHERE id=?',id);}
function attempts(id){return fs.readdirSync(processed).filter(name=>name.startsWith('.attempt-'+id+'-'));}

afterEach(async()=>{
 for(const entry of [...workers]){entry.child.kill('SIGKILL');await bounded(entry.done);}
 for(const pid of pids){if(alive(pid))process.kill(pid,'SIGKILL');}
 pids.clear();
 run('DELETE FROM worker_lease');
 run("UPDATE upload_sessions SET status='FAILED' WHERE status IN ('QUEUED','PROCESSING')");
});
after(()=>{db.close();fs.rmSync(tmp,{recursive:true,force:true});});

test('46: cancellation waits for a real processing child to exit',async()=>{
 const marker=path.join(tmp,'command-child');
 const controller=new AbortController();
 const promise=runProcessingCommand(process.execPath,['-e',`require('fs').writeFileSync(${JSON.stringify(marker)},JSON.stringify({pid:process.pid}));setInterval(()=>{},1000);`],{signal:controller.signal,timeout:10000});
 const pid=await encoderPid(marker);
 controller.abort();
 await assert.rejects(promise,ProcessingInterrupted);
 assert.equal(alive(pid),false);pids.delete(pid);
});

test('46: signal cancellation stops the antivirus child without accepting an unchecked file',async()=>{
 const marker=path.join(tmp,'scanner-child');
 const controller=new AbortController();
 const promise=scanUploadedFile(media,{required:true,scanner:holdProgram(marker),signal:controller.signal});
 const pid=await encoderPid(marker);
 controller.abort();
 await assert.rejects(promise,error=>error.name==='AbortError');
 assert.equal(alive(pid),false);pids.delete(pid);
});

test('46: graceful worker stop preserves a recoverable claim and restart completes privately',async()=>{
 const job=seedJob(),marker=path.join(tmp,'graceful-encoder');
 const first=worker(holdProgram(marker));
 const pid=await encoderPid(marker);
 assert.deepEqual({...state(job.id)},{status:'PROCESSING',attempts:1});
 assert.equal(attempts(job.id).length,1);
 assert.deepEqual(await stop(first),{code:0,signal:null},first.output);
 assert.equal(alive(pid),false);pids.delete(pid);
 assert.deepEqual({...state(job.id)},{status:'PROCESSING',attempts:1});
 assert.equal(one('SELECT status FROM videos WHERE id=?',job.videoId).status,'DRAFT');
 assert.equal(one('SELECT count(*) AS n FROM worker_lease').n,0);
 assert.equal(attempts(job.id).length,0);
 assert.ok(all('SELECT state FROM processing_events WHERE upload_id=?',job.id).some(e=>e.state==='INTERRUPTED'));
 const restarted=worker();
 await until(()=>state(job.id).status==='IN_REVIEW','restarted real FFmpeg pipeline',15000);
 assert.deepEqual(await stop(restarted),{code:0,signal:null},restarted.output);
 assert.equal(state(job.id).attempts,2);
 assert.equal(one('SELECT status FROM videos WHERE id=?',job.videoId).status,'PENDING_REVIEW');
 assert.ok(fs.statSync(path.join(processed,job.id,'playback.mp4')).size>0);
 assert.ok(fs.statSync(path.join(processed,job.id,'master.m3u8')).size>0);
 assert.equal(fs.existsSync(path.join(parts,job.id+'.part')),false);
 assert.equal(all("SELECT state FROM processing_events WHERE upload_id=? AND state='RECOVERED'",job.id).length,1);
});

test('46: lease takeover fences a stale encoder from successor state and output',async()=>{
 const job=seedJob(),marker=path.join(tmp,'stale-encoder');
 const stale=worker(holdProgram(marker));
 const pid=await encoderPid(marker);
 const originalOwner=one('SELECT owner FROM worker_lease').owner;
 run('UPDATE worker_lease SET expires_at=?',Date.now()-1);
 const successor=worker();
 await until(()=>one('SELECT owner FROM worker_lease')?.owner!==originalOwner,'lease takeover');
 await until(()=>state(job.id).status==='IN_REVIEW','successor processing',15000);
 const output=path.join(processed,job.id,'playback.mp4');
 const digest=crypto.createHash('sha256').update(fs.readFileSync(output)).digest('hex');
 assert.deepEqual(await bounded(stale.done),{code:1,signal:null},stale.output);
 assert.equal(alive(pid),false);pids.delete(pid);
 assert.equal(state(job.id).status,'IN_REVIEW');assert.equal(state(job.id).attempts,2);
 assert.equal(one('SELECT status FROM videos WHERE id=?',job.videoId).status,'PENDING_REVIEW');
 assert.equal(crypto.createHash('sha256').update(fs.readFileSync(output)).digest('hex'),digest);
 assert.equal(all("SELECT state FROM processing_events WHERE upload_id=? AND state='FAILED'",job.id).length,0);
 assert.equal(attempts(job.id).length,0);
 assert.deepEqual(await stop(successor),{code:0,signal:null},successor.output);
});

test('46: two real worker crashes recover to one dead letter without a third attempt',async()=>{
 const job=seedJob();
 for(let attempt=1;attempt<=2;attempt++){
  const marker=path.join(tmp,'crash-encoder-'+attempt);
  const current=worker(holdProgram(marker));
  const pid=await encoderPid(marker);
  assert.equal(state(job.id).attempts,attempt);
  assert.deepEqual(await stop(current,'SIGKILL'),{code:null,signal:'SIGKILL'});
  // SIGKILL cannot run Node cleanup; the test supervisor reaps only its own
  // recorded encoder. Container/init supervision remains necessary in deployment.
  if(alive(pid))process.kill(pid,'SIGKILL');
  await until(()=>!alive(pid),'crashed encoder cleanup',2000);pids.delete(pid);
  run('UPDATE worker_lease SET expires_at=?',Date.now()-1); // Advance lease expiry without a 20s test sleep.
 }
 const recovery=worker();
 await until(()=>state(job.id).status==='FAILED','exhausted-attempt recovery');
 assert.equal(state(job.id).attempts,2);
 assert.equal(one('SELECT attempt_count FROM processing_dead_letters WHERE upload_id=?',job.id).attempt_count,2);
 assert.equal(all("SELECT state FROM processing_events WHERE upload_id=? AND state='DEAD_LETTER'",job.id).length,1);
 assert.equal(all("SELECT state FROM processing_events WHERE upload_id=? AND state='PROCESSING'",job.id).length,2);
 assert.equal(fs.existsSync(path.join(processed,job.id)),false);
 assert.equal(attempts(job.id).length,0);
 assert.equal(fs.existsSync(path.join(parts,job.id+'.part')),true);
 assert.deepEqual(await stop(recovery),{code:0,signal:null},recovery.output);
});

test('46: unsafe source failure leaves another canonical directory and external inode untouched',async()=>{
 const job=seedJob();
 const source=path.join(parts,job.id+'.part');
 fs.unlinkSync(source);
 fs.symlinkSync(media,source);
 const canonical=path.join(processed,job.id);
 fs.mkdirSync(canonical);fs.writeFileSync(path.join(canonical,'sentinel'),'other attempt output');
 const result=await processUpload(job.id);
 assert.equal(result.status,'FAILED');
 assert.equal(state(job.id).status,'FAILED');
 assert.equal(fs.readFileSync(path.join(canonical,'sentinel'),'utf8'),'other attempt output');
 assert.equal(fs.readFileSync(media).equals(bytes),true);
 assert.equal(fs.lstatSync(source).isSymbolicLink(),true);
});
