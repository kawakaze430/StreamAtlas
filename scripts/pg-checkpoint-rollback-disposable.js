/** Synthetic-only PostgreSQL checkpoint/restore drill. The source is read-only;
 * all persistent fault and restore steps target a distinct empty disposable DB.
 * Neither successful parity nor this drill approves any traffic cutover.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {requireDisposableEnv,migrationFiles} from './pg-migrations.js';
import {ACCOUNT_MIGRATION_TABLES,createSyntheticSource} from './pg-account-migration-disposable.js';

const MAX_ARCHIVE=16*1024*1024;
const MAX_QUERY=16*1024*1024;
const reject=code=>Object.assign(new Error(code),{code});
const quoted=name=>'"'+name+'"';

export function rollbackConfiguration(target,env=process.env){
 if(env.NODE_ENV==='production'||env.SA_PUBLIC_CONTENT_MODE==='1')throw reject('PRODUCTION_ROLLBACK_FORBIDDEN');
 if(env.SA_PG_ROLLBACK!=='YES_SYNTHETIC_ONLY')throw reject('SYNTHETIC_ROLLBACK_ACK_REQUIRED');
 try{requireDisposableEnv(env)}catch{throw reject('DISPOSABLE_SOURCE_REQUIRED')}
 if(env.PGHOST!=='127.0.0.1'||!/^\d{1,5}$/.test(env.PGPORT||'')||Number(env.PGPORT)<1||Number(env.PGPORT)>65535)
  throw reject('EXPLICIT_LOOPBACK_PORT_REQUIRED');
 if(['PGSERVICE','PGSERVICEFILE','PGHOSTADDR','PGOPTIONS'].some(name=>env[name]))throw reject('CONNECTION_OVERRIDE_FORBIDDEN');
 if(!/^sa_disposable_[a-z0-9_]+$/.test(target||'')||target===env.PGDATABASE)throw reject('DISTINCT_DISPOSABLE_TARGET_REQUIRED');
 return {source:env.PGDATABASE,target};
}

function command(program,args,{env,input,maxBuffer=MAX_QUERY}={}){
 const result=spawnSync(program,args,{env,input,encoding:null,timeout:120000,maxBuffer});
 // PostgreSQL diagnostics can include synthetic hashes and row values.
 if(result.error||result.status!==0)throw reject('DISPOSABLE_'+program.toUpperCase()+'_FAILED');
 return result.stdout;
}
function sql(database,query,env){
 return command('psql',['-X','-w','-v','ON_ERROR_STOP=1','-A','-t','-q'],
  {env:{...env,PGDATABASE:database},input:Buffer.from(query)}).toString('utf8').trim();
}
function tables(database,env,{allowEmpty=false}={}){
 const output=sql(database,"SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename;",env);
 const names=output?output.split('\n'):[];
 if((!allowEmpty&&!names.length)||names.some(name=>!/^[a-z][a-z0-9_]*$/.test(name)))throw reject('UNEXPECTED_TABLE_IN_SNAPSHOT');
 return names;
}
function rows(database,table,env){
 const output=sql(database,`SELECT row_to_json(t)::text FROM public.${quoted(table)} t;`,env);
 const parsed=output?output.split('\n').map(line=>JSON.parse(line)):[];
 return crypto.createHash('sha256').update(JSON.stringify(parsed.map(row=>JSON.stringify(row)).sort())).digest('hex');
}
export function fingerprint(database,env=process.env){
 const names=tables(database,env);
 const summary=Object.fromEntries(names.map(table=>{
  const count=Number(sql(database,`SELECT count(*) FROM public.${quoted(table)};`,env));
  if(!Number.isSafeInteger(count)||count>2000)throw reject('UNEXPECTED_ROW_VOLUME');
  return [table,{count,digest:rows(database,table,env)}];
 }));
 const sequenceNames=sql(database,"SELECT sequencename FROM pg_sequences WHERE schemaname='public' ORDER BY sequencename;",env);
 const selected=sequenceNames?sequenceNames.split('\n'):[];
 if(selected.length>300||selected.some(name=>!/^[a-z][a-z0-9_]*$/.test(name)))throw reject('UNEXPECTED_SEQUENCE_IN_SNAPSHOT');
 // pg_sequences.last_value is NULL for an uncalled sequence. Compare the
 // underlying last_value and is_called too, since both affect the next ID.
 const definitions=sql(database,"SELECT row_to_json(s)::text FROM pg_sequences s WHERE schemaname='public' ORDER BY sequencename;",env);
 const states=selected.length?sql(database,selected.map(name=>
  `SELECT '${name}' AS name,last_value::text,is_called::text FROM public.${quoted(name)}`).join(' UNION ALL ')+';',env):'';
 const sequences={definitions,states};
 return {tables:summary,sequences};
}
function same(a,b){return JSON.stringify(a)===JSON.stringify(b)}

export function drill(target,{env=process.env}={}){
 const config=rollbackConfiguration(target,env);
 const sourceVersion=sql(config.source,"SELECT current_database()||'|'||current_setting('server_version_num');",env).split('|');
 const targetVersion=sql(config.target,"SELECT current_database()||'|'||current_setting('server_version_num');",env).split('|');
 if(sourceVersion[0]!==config.source||targetVersion[0]!==config.target||
    !/^160\d{3}$/.test(sourceVersion[1]||'')||sourceVersion[1]!==targetVersion[1])throw reject('SELECTED_POSTGRES_16_REQUIRED');
 if(tables(config.target,env,{allowEmpty:true}).length)throw reject('NONEMPTY_ROLLBACK_TARGET');
 const temporary=fs.mkdtempSync(path.join(os.tmpdir(),'sa-pg-checkpoint-'));
 let archive,fixture;
 try{
  fixture=createSyntheticSource(temporary);
  const expected=Object.fromEntries(ACCOUNT_MIGRATION_TABLES.map(table=>[table,fixture.payload.tables[table].length]));
  const source=fingerprint(config.source,env),names=Object.keys(source.tables);
  if(names.length<migrationFiles().length/2||!names.includes('sa_schema_migrations')||source.tables.sa_schema_migrations.count!==migrationFiles().length)
   throw reject('MIGRATION_LEDGER_MISMATCH');
  for(const [table,count] of Object.entries(expected))if(source.tables[table]?.count!==count)throw reject('NON_SYNTHETIC_SOURCE_COUNT');
  for(const table of names)if(!(table in expected)&&table!=='sa_schema_migrations'&&source.tables[table].count!==0)throw reject('UNREVIEWED_SOURCE_ROWS');
  const identities=sql(config.source,'SELECT email FROM users ORDER BY email;',env).split('\n');
  const accepted=['synthetic-migration-closed@example.test','synthetic-migration-other@example.test',
   'synthetic-migration-owner@example.test','synthetic-migration-revoked@example.test'];
  if(!same(identities,accepted))throw reject('NON_SYNTHETIC_IDENTITIES');

  archive=command('pg_dump',['--format=custom','--no-owner','--no-privileges'],
   {env:{...env,PGDATABASE:config.source},maxBuffer:MAX_ARCHIVE});
  if(archive.length<1024||archive.length>=MAX_ARCHIVE)throw reject('CHECKPOINT_SIZE_INVALID');
  const checkpoint=path.join(temporary,'source.pgdump'),digest=crypto.createHash('sha256').update(archive).digest('hex');
  fs.writeFileSync(checkpoint,archive,{flag:'wx',mode:0o600});
  const descriptor=fs.openSync(checkpoint,'r');try{fs.fsyncSync(descriptor)}finally{fs.closeSync(descriptor)}
  if(crypto.createHash('sha256').update(fs.readFileSync(checkpoint)).digest('hex')!==digest)throw reject('CHECKPOINT_INTEGRITY_FAILED');
  command('pg_restore',['--dbname',config.target,'--no-owner','--no-privileges','--exit-on-error','--single-transaction'],
   {env:{...env,PGDATABASE:config.target},input:fs.readFileSync(checkpoint)});
  if(!same(fingerprint(config.target,env),source))throw reject('INITIAL_RESTORE_MISMATCH');
  sql(config.target,"BEGIN; UPDATE user_preferences SET theme='light' WHERE user_id=1; DELETE FROM watch_progress WHERE user_id=1; COMMIT;",env);
  if(same(fingerprint(config.target,env),source))throw reject('PERSISTENT_FAULT_NOT_APPLIED');
  if(crypto.createHash('sha256').update(fs.readFileSync(checkpoint)).digest('hex')!==digest)throw reject('CHECKPOINT_INTEGRITY_FAILED');
  command('pg_restore',['--dbname',config.target,'--clean','--if-exists','--no-owner','--no-privileges','--exit-on-error','--single-transaction'],
   {env:{...env,PGDATABASE:config.target},input:fs.readFileSync(checkpoint)});
  const restored=fingerprint(config.target,env);
  if(!same(restored,source))throw reject('CHECKPOINT_ROLLBACK_MISMATCH');
  return {format:'streamatlas-synthetic-pg-checkpoint-drill-v1',status:'PASS',
   sourceReadOnly:true,targetDisposable:true,tableCount:names.length,
   recordCount:Object.values(source.tables).reduce((total,item)=>total+item.count,0),
   checkpointSha256:digest,encryptedCheckpoint:false,persistentFaultApplied:true,
   exactRowAndSequenceParityRestored:true,liveTrafficShifted:false,cutoverApproved:false};
 }finally{fixture?.mfaKey.fill(0);archive?.fill(0);fs.rmSync(temporary,{recursive:true,force:true})}
}

if(process.argv[1]&&path.resolve(process.argv[1])===import.meta.filename){
 try{
  if(process.argv.length!==4||process.argv[2]!=='--target')throw reject('USAGE_DISPOSABLE_TARGET_REQUIRED');
  console.log(JSON.stringify(drill(process.argv[3]),null,2));
 }catch(error){console.error('Synthetic checkpoint drill failed: '+(error.code||'CHECKPOINT_DRILL_FAILED'));process.exitCode=1;}
}
