/** Actual Node/Spring account reads against disposable synthetic PostgreSQL 16.
 * This command neither imports real accounts nor authorizes a service cutover.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawn,spawnSync} from 'node:child_process';
import {DatabaseSync} from 'node:sqlite';
import {setTimeout as pause} from 'node:timers/promises';
import {requireDisposableEnv} from './pg-migrations.js';
import {executeShadowReads,SHADOW_READ_PATHS} from '../src/shadow-read.js';

const root=path.resolve(import.meta.dirname,'..');
const tables=['users','sessions','user_preferences','closed_accounts'];
const order={users:'id',sessions:'token_hash',user_preferences:'user_id',closed_accounts:'user_id'};
const fail=code=>Object.assign(new Error(code),{code});
const literal=value=>"'"+String(value).replaceAll("'","''")+"'";
const digest=value=>crypto.createHash('sha256').update(value).digest('hex');

export function accountParityConfiguration(env,springOrigin){
 if(env.NODE_ENV==='production'||env.SA_PUBLIC_CONTENT_MODE==='1')throw fail('PRODUCTION_PARITY_FORBIDDEN');
 if(env.SA_SHADOW_READ_ACK!=='YES'||env.SA_SHADOW_SYNTHETIC_ONLY!=='YES')throw fail('SYNTHETIC_READ_ONLY_ACK_REQUIRED');
 try{requireDisposableEnv(env)}catch{throw fail('DISPOSABLE_PG_GUARD_REQUIRED')}
 if(!['127.0.0.1','::1'].includes(env.PGHOST)||!/^\d{1,5}$/.test(env.PGPORT||'')||Number(env.PGPORT)<1||Number(env.PGPORT)>65535)throw fail('EXPLICIT_LOOPBACK_PG_PORT_REQUIRED');
 if(!/^[a-zA-Z_][a-zA-Z0-9_]{0,62}$/.test(env.PGUSER))throw fail('EXPLICIT_TEST_ROLE_REQUIRED');
 if(['PGSERVICE','PGSERVICEFILE','PGHOSTADDR','PGOPTIONS'].some(key=>env[key]))throw fail('PG_CONNECTION_OVERRIDE_FORBIDDEN');
 if(typeof springOrigin!=='string'||!/^http:\/\/(?:127\.0\.0\.1|\[::1\]):[1-9][0-9]{0,4}\/?$/.test(springOrigin))throw fail('LITERAL_LOOPBACK_SPRING_ORIGIN_REQUIRED');
 const selected=new URL(springOrigin);
 if(Number(selected.port||80)>65535)throw fail('INVALID_SPRING_PORT');
 return {springOrigin:selected.origin};
}

function query(sql){
 const result=spawnSync('psql',['-X','-w','-v','ON_ERROR_STOP=1','-A','-t','-q'],
  {input:sql,encoding:'utf8',env:process.env,timeout:15000,maxBuffer:1024*1024});
 // SQL/server diagnostics can contain fixture identity or session hashes.
 if(result.error||result.status!==0)throw fail('DISPOSABLE_PG_COMMAND_FAILED');
 return result.stdout.trim();
}

function sourceMetadata(){
 const revision=spawnSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8',timeout:5000});
 const changes=spawnSync('git',['status','--porcelain','--untracked-files=no'],{cwd:root,encoding:'utf8',timeout:5000});
 const candidate=revision.status===0?revision.stdout.trim():process.env.GITHUB_SHA;
 return {commit:typeof candidate==='string'&&/^[a-f0-9]{40}$/.test(candidate)?candidate:null,
  node:process.version,trackedWorktreeDirty:changes.status===0?Boolean(changes.stdout.trim()):null};
}

async function startNode(dir){
 const code=`import {server} from ${JSON.stringify(new URL('../src/server.js',import.meta.url).href)};
  import {db} from ${JSON.stringify(new URL('../src/database.js',import.meta.url).href)};
  let closing=false;
  function stop(){if(closing)return;closing=true;server.closeAllConnections();server.close(()=>{db.close();process.exit(0)})}
  server.on('error',()=>process.exit(1));
  server.listen(0,'127.0.0.1',()=>process.send({port:server.address().port}));
  process.on('message',message=>{if(message==='stop')stop()});process.on('SIGTERM',stop);`;
 const child=spawn(process.execPath,['--input-type=module','--eval',code],{cwd:root,
  env:{...process.env,NODE_ENV:'test',DB_PATH:path.join(dir,'node.sqlite'),PRIVATE_PATH:path.join(dir,'private'),SA_DISABLE_WORKER:'1'},
  stdio:['ignore','ignore','ignore','ipc']});
 const close=async()=>{
  if(child.exitCode!==null||child.signalCode!==null)return;
  const stopped=new Promise(resolve=>child.once('close',resolve));
  if(child.connected)child.send('stop');else child.kill('SIGTERM');
  const timer=setTimeout(()=>child.kill('SIGKILL'),3000);
  try{await stopped}finally{clearTimeout(timer)}
 };
 try{
  const port=await new Promise((resolve,reject)=>{
   const timer=setTimeout(()=>reject(fail('NODE_QA_SERVER_TIMEOUT')),10000);
   child.once('error',()=>{clearTimeout(timer);reject(fail('NODE_QA_SERVER_FAILED'))});
   child.once('exit',()=>{clearTimeout(timer);reject(fail('NODE_QA_SERVER_FAILED'))});
   child.once('message',message=>{clearTimeout(timer);Number.isInteger(message?.port)?resolve(message.port):reject(fail('NODE_QA_SERVER_FAILED'))});
  });
  return {origin:`http://127.0.0.1:${port}`,close};
 }catch(error){await close();throw error}
}

function fixtures(){
 const created=new Date().toISOString(),future=new Date(Date.now()+3600000).toISOString(),past=new Date(Date.now()-3600000).toISOString();
 const suffix=crypto.randomBytes(12).toString('hex');
 return ['owner','other','defaults','expired','closed','revoked'].map((name,index)=>({
  name,id:crypto.randomInt(100000000,900000000)+index,email:`synthetic-shadow-${name}-${suffix}@example.test`,
  display:`Synthetic shadow ${name}`,token:crypto.randomBytes(32).toString('base64url'),created,
  expires:name==='expired'?past:future,
  preferences:name==='owner'?{pause:true,autoplay:false,theme:'light',locale:'Spanish',save:true}
   :name==='other'?{pause:false,autoplay:true,theme:'dark',locale:'English',save:false}:null,
 }));
}

function seedPostgres(accounts){
 // Locks and emptiness checks share the seeding transaction, so another test
 // cannot race a nonempty/shared account database past the guard.
 const sql=['BEGIN;',"SET LOCAL lock_timeout='5s';","SET LOCAL statement_timeout='10s';",
  'LOCK TABLE users,sessions,user_preferences,closed_accounts IN ACCESS EXCLUSIVE MODE;',
  `DO $$ BEGIN IF ${tables.map(t=>`EXISTS(SELECT 1 FROM ${t})`).join(' OR ')} THEN RAISE EXCEPTION 'Nonempty account tables'; END IF; END $$;`];
 for(const a of accounts){
  sql.push(`INSERT INTO users(id,email,password_hash,name,role,created_at) VALUES(${a.id},${literal(a.email)},NULL,${literal(a.display)},'MEMBER',${literal(a.created)});`);
  sql.push(`INSERT INTO sessions(token_hash,user_id,expires_at) VALUES(${literal(digest(a.token))},${a.id},${literal(a.expires)});`);
  if(a.preferences){const p=a.preferences;sql.push(`INSERT INTO user_preferences(user_id,pause_history,autoplay_next,theme,locale,save_searches,updated_at) VALUES(${a.id},${p.pause},${p.autoplay},${literal(p.theme)},${literal(p.locale)},${p.save},${literal(a.created)});`)}
  if(a.name==='closed')sql.push(`INSERT INTO closed_accounts(user_id,closed_at) VALUES(${a.id},${literal(a.created)});`);
  if(a.name==='revoked')sql.push(`DELETE FROM sessions WHERE token_hash=${literal(digest(a.token))} AND user_id=${a.id};`);
 }
 sql.push('COMMIT;');query(sql.join('\n'));
}

function seedSqlite(db,accounts){
 db.exec('PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000; BEGIN IMMEDIATE;');
 try{
  for(const a of accounts){
   db.prepare("INSERT INTO users(id,email,password_hash,name,role,created_at) VALUES(?,?,NULL,?,'MEMBER',?)").run(a.id,a.email,a.display,a.created);
   db.prepare('INSERT INTO sessions(token_hash,user_id,expires_at) VALUES(?,?,?)').run(digest(a.token),a.id,a.expires);
   if(a.preferences){const p=a.preferences;db.prepare('INSERT INTO user_preferences(user_id,pause_history,autoplay_next,theme,locale,save_searches,updated_at) VALUES(?,?,?,?,?,?,?)').run(a.id,Number(p.pause),Number(p.autoplay),p.theme,p.locale,Number(p.save),a.created)}
   if(a.name==='closed')db.prepare('INSERT INTO closed_accounts(user_id,closed_at) VALUES(?,?)').run(a.id,a.created);
   if(a.name==='revoked')db.prepare('DELETE FROM sessions WHERE token_hash=? AND user_id=?').run(digest(a.token),a.id);
  }
  db.exec('COMMIT;');
 }catch(error){db.exec('ROLLBACK;');throw error}
}

const pgSnapshot=()=>query(tables.map(t=>`SELECT row_to_json(r)::text FROM (SELECT * FROM ${t} ORDER BY ${order[t]}) r;`).join('\n'));
const sqliteSnapshot=db=>JSON.stringify(tables.map(t=>db.prepare(`SELECT * FROM ${t} ORDER BY ${order[t]}`).all()));

export async function runDisposableAccountParity({springOrigin}={}){
 const config=accountParityConfiguration(process.env,springOrigin);
 const report={format:'streamatlas-spring-node-account-parity-v1',status:'FAIL',source:sourceMetadata(),
  postgres:{major:16,disposable:true},caseCount:0,readComparisons:0,readRequests:0,
  paths:[...SHADOW_READ_PATHS],limits:{minIntervalMs:1000,maxRequests:28},cases:[],errors:[],
  readOnlyStateUnchanged:false,cleanup:'NOT RUN',syntheticOnly:true,readOnly:true,cutoverApproved:false,fullAuthorizationParity:false,
  bodiesStored:false,credentialsStored:false};
 let dir,server,db,seeded=false,accounts=[];
 try{
  const pg=query("SELECT current_database()||'|'||current_setting('server_version_num');").split('|');
  if(pg.length!==2||pg[0]!==process.env.PGDATABASE||!/^160\d{3}$/.test(pg[1]))throw fail('SELECTED_DISPOSABLE_POSTGRES_16_REQUIRED');
  if(tables.some(table=>query(`SELECT count(*) FROM ${table};`)!=='0'))throw fail('NONEMPTY_ACCOUNT_TABLES_REFUSED');
  accounts=fixtures();
  if(new Set(accounts.map(a=>a.id)).size!==accounts.length)throw fail('FIXTURE_ID_COLLISION');
  // A command timeout can occur after COMMIT, so retain the unique ownership
  // markers before starting the command and clean them even on an uncertain exit.
  seeded=true;seedPostgres(accounts);
  dir=fs.mkdtempSync(path.join(os.tmpdir(),'sa-spring-node-parity-'));
  server=await startNode(dir);db=new DatabaseSync(path.join(dir,'node.sqlite'));seedSqlite(db,accounts);
  const pgBefore=pgSnapshot(),sqliteBefore=sqliteSnapshot(db);
  const scenarios=[{name:'anonymous',token:'',expected:[200,401]},...accounts.map(a=>({name:a.name,token:a.token,
   expected:['expired','closed','revoked'].includes(a.name)?[200,401]:[200,200]}))];
  for(const [index,scenario] of scenarios.entries()){
   if(index)await pause(1000); // Keep the bound across separate comparison calls.
   const compared=await executeShadowReads({nodeOrigin:server.origin,springOrigin:config.springOrigin,
    cookie:scenario.token?'sa_session='+scenario.token:'',acknowledgeReadOnly:true,syntheticOnly:true});
   const statusesMatch=compared.comparisons.every((item,i)=>item.nodeStatus===scenario.expected[i]&&item.springStatus===scenario.expected[i]);
   report.cases.push({name:scenario.name,status:compared.status==='PASS'&&statusesMatch?'PASS':'FAIL',
    expectedStatuses:scenario.expected,parity:compared.parity,comparisons:compared.comparisons,
    transport:compared.transport,serviceErrors:compared.serviceErrors});
   report.readRequests+=4;report.readComparisons+=2;report.caseCount++;
  }
  report.readOnlyStateUnchanged=pgBefore===pgSnapshot()&&sqliteBefore===sqliteSnapshot(db);
  if(!report.readOnlyStateUnchanged)report.errors.push('READ_ONLY_STATE_CHANGED');
  if(report.cases.some(item=>item.status!=='PASS'))report.errors.push('ACCOUNT_PARITY_FAILED');
 }catch(error){
  const allowed=new Set(['SELECTED_DISPOSABLE_POSTGRES_16_REQUIRED','NONEMPTY_ACCOUNT_TABLES_REFUSED','FIXTURE_ID_COLLISION',
   'DISPOSABLE_PG_COMMAND_FAILED','NODE_QA_SERVER_FAILED','NODE_QA_SERVER_TIMEOUT']);
  report.errors.push(allowed.has(error.code)?error.code:'ACCOUNT_PARITY_EXECUTION_FAILED');
 }finally{
  let clean=true;
  try{db?.close()}catch{clean=false}
  try{await server?.close()}catch{clean=false}
  if(seeded){
   try{
    const own=accounts.map(a=>`(id=${a.id} AND email=${literal(a.email)})`).join(' OR ');
    // ID plus an unpredictable fixture email scopes cleanup even if a raced
    // guard or uncertain command exit prevented this transaction from committing.
    const selected=`SELECT id FROM users WHERE ${own}`;
    query(`BEGIN; SET LOCAL lock_timeout='5s'; SET LOCAL statement_timeout='10s';
     DELETE FROM sessions WHERE user_id IN (${selected}); DELETE FROM closed_accounts WHERE user_id IN (${selected});
     DELETE FROM user_preferences WHERE user_id IN (${selected}); DELETE FROM users WHERE ${own}; COMMIT;`);
    if(tables.some(table=>query(`SELECT count(*) FROM ${table};`)!=='0'))clean=false;
   }catch{clean=false}
  }
  try{if(dir)fs.rmSync(dir,{recursive:true,force:true})}catch{clean=false}
  report.cleanup=clean?'PASS':'FAIL';
  if(!clean)report.errors.push('FIXTURE_CLEANUP_FAILED');
 }
 report.status=report.errors.length===0&&report.caseCount===7&&report.readOnlyStateUnchanged&&report.cleanup==='PASS'?'PASS':'FAIL';
 return report;
}

if(process.argv[1]&&path.resolve(process.argv[1])===import.meta.filename){
 try{
  const args=process.argv.slice(2),values=new Map();
  if(args.length===1&&args[0]==='--help'){
   console.log('node scripts/test-spring-account-parity-disposable.js --spring http://127.0.0.1:PORT [--output reports/spring-node-shadow-parity.json]');
   console.log('Requires guarded loopback PG16, empty account tables, SA_SHADOW_READ_ACK=YES and SA_SHADOW_SYNTHETIC_ONLY=YES. Spring must already use that same disposable database.');
  }else{
   for(let index=0;index<args.length;index+=2){
    if(!['--spring','--output'].includes(args[index])||!args[index+1]||values.has(args[index]))throw fail('INVALID_PARITY_OPTION');
    values.set(args[index],args[index+1]);
   }
   const report=await runDisposableAccountParity({springOrigin:values.get('--spring')||process.env.SA_SHADOW_SPRING_URL});
   const output=JSON.stringify(report,null,2)+'\n';
   if(values.has('--output')){const file=path.resolve(values.get('--output'));fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,output,{mode:0o600})}
   console.log(output.trimEnd());if(report.status!=='PASS')process.exitCode=1;
  }
 }catch(error){
  const allowed=new Set(['PRODUCTION_PARITY_FORBIDDEN','SYNTHETIC_READ_ONLY_ACK_REQUIRED','DISPOSABLE_PG_GUARD_REQUIRED',
   'EXPLICIT_LOOPBACK_PG_PORT_REQUIRED','EXPLICIT_TEST_ROLE_REQUIRED','PG_CONNECTION_OVERRIDE_FORBIDDEN',
   'LITERAL_LOOPBACK_SPRING_ORIGIN_REQUIRED','INVALID_SPRING_PORT','INVALID_PARITY_OPTION']);
  console.error(JSON.stringify({format:'streamatlas-spring-node-account-parity-error-v1',error:allowed.has(error.code)?error.code:'ACCOUNT_PARITY_CONFIGURATION_FAILED',cutoverApproved:false}));
  process.exitCode=2;
 }
}
