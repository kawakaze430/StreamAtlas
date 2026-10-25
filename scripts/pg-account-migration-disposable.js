/** Synthetic-only encrypted SQLite -> PostgreSQL account migration rehearsal.
 * The CLI deliberately accepts no input database or identity archive. It creates
 * its own fixtures and never moves live identities or approves a cutover.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {DatabaseSync} from 'node:sqlite';
import {requireDisposableEnv,migrationFiles} from './pg-migrations.js';

const root=path.resolve(import.meta.dirname,'..');
const MAX_BYTES=8*1024*1024;
const FORMAT='streamatlas-synthetic-accounts-v1';
const fail=code=>Object.assign(new Error(code),{code});
export const ACCOUNT_MIGRATION_TABLES=Object.freeze([
 'categories','networks','sites','channels','performers','videos','video_categories','video_performers','video_chapters','video_captions',
 'users','sessions','user_preferences','account_tokens','email_verifications','user_mfa','closed_accounts',
 'favorites','watch_later','reactions','watch_progress','subscriptions','playlists','playlist_videos','watch_queue','search_history','saved_search_filters','entity_follows','user_category_preferences',
 'creator_profiles','upload_sessions','processing_events','moderation_audit','review_evidence','notifications','auth_security_events',
]);
const booleanColumns=new Set(['pause_history','autoplay_next','save_searches','enabled','notify','rights_declaration','adults_declaration','consent_declaration']);
const identities=['categories','networks','sites','channels','performers','videos','users','playlists','saved_search_filters','processing_events','moderation_audit','notifications','auth_security_events'];
const literal=value=>"'"+String(value).replaceAll("'","''")+"'";
const identifier=value=>{if(!/^[a-z][a-z0-9_]*$/.test(value))throw fail('INVALID_SOURCE_COLUMN');return '"'+value+'"';};

export function accountMigrationConfiguration(env=process.env){
 if(env.NODE_ENV==='production'||env.SA_PUBLIC_CONTENT_MODE==='1')throw fail('PRODUCTION_MIGRATION_FORBIDDEN');
 if(env.SA_PG_ACCOUNT_MIGRATION!=='YES_SYNTHETIC_ONLY')throw fail('SYNTHETIC_MIGRATION_ACK_REQUIRED');
 try{requireDisposableEnv(env)}catch{throw fail('DISPOSABLE_DATABASE_REQUIRED')}
 if(!['127.0.0.1','::1'].includes(env.PGHOST)||!/^\d{1,5}$/.test(env.PGPORT||'')||Number(env.PGPORT)<1||Number(env.PGPORT)>65535)throw fail('EXPLICIT_LOOPBACK_PORT_REQUIRED');
 if(!/^[A-Za-z_][A-Za-z0-9_]{0,62}$/.test(env.PGUSER||''))throw fail('EXPLICIT_TEST_ROLE_REQUIRED');
 if(['PGSERVICE','PGSERVICEFILE','PGHOSTADDR','PGOPTIONS'].some(name=>env[name]))throw fail('CONNECTION_OVERRIDE_FORBIDDEN');
 return {database:env.PGDATABASE};
}

export function migrationQuery(sql,{env=process.env,runner=spawnSync}={}){
 const result=runner('psql',['-X','-w','-v','ON_ERROR_STOP=1','-A','-t','-q'],{input:sql,encoding:'utf8',env,timeout:30000,maxBuffer:MAX_BYTES});
 // PostgreSQL error details may include SQL identity/hash/MFA fields.
 if(result.error||result.status!==0)throw fail('DISPOSABLE_MIGRATION_SQL_FAILED');
 return result.stdout.trim();
}

export function sealSyntheticTransfer(payload,key){
 if(!Buffer.isBuffer(key)||key.length!==32)throw fail('TRANSFER_KEY_REQUIRED');
 const plaintext=Buffer.from(JSON.stringify(payload));
 if(plaintext.length>MAX_BYTES)throw fail('TRANSFER_SIZE_LIMIT');
 const iv=crypto.randomBytes(12),cipher=crypto.createCipheriv('aes-256-gcm',key,iv);
 cipher.setAAD(Buffer.from(FORMAT));
 const ciphertext=Buffer.concat([cipher.update(plaintext),cipher.final()]);
 plaintext.fill(0);
 return {format:FORMAT,algorithm:'AES-256-GCM',iv:iv.toString('base64'),tag:cipher.getAuthTag().toString('base64'),ciphertext:ciphertext.toString('base64')};
}

export function openSyntheticTransfer(envelope,key){
 try{
  if(!Buffer.isBuffer(key)||key.length!==32||envelope.format!==FORMAT||envelope.algorithm!=='AES-256-GCM')throw Error();
  if(['iv','tag','ciphertext'].some(name=>typeof envelope[name]!=='string')||envelope.ciphertext.length>MAX_BYTES*1.4)throw Error();
  const iv=Buffer.from(envelope.iv,'base64'),tag=Buffer.from(envelope.tag,'base64'),ciphertext=Buffer.from(envelope.ciphertext,'base64');
  if(iv.length!==12||tag.length!==16||ciphertext.length>MAX_BYTES)throw Error();
  const decipher=crypto.createDecipheriv('aes-256-gcm',key,iv);decipher.setAAD(Buffer.from(FORMAT));decipher.setAuthTag(tag);
  const plaintext=Buffer.concat([decipher.update(ciphertext),decipher.final()]);
  try{return JSON.parse(plaintext.toString('utf8'))}finally{plaintext.fill(0)}
 }catch{throw fail('TRANSFER_AUTHENTICATION_FAILED')}
}

export function validateSyntheticPayload(payload){
 if(payload?.format!==FORMAT||payload.syntheticOnly!==true||!payload.tables||Array.isArray(payload.tables))throw fail('INVALID_SYNTHETIC_PAYLOAD');
 if(Object.keys(payload.tables).sort().join(',')!==[...ACCOUNT_MIGRATION_TABLES].sort().join(','))throw fail('UNREVIEWED_SOURCE_TABLES');
 let count=0;
 for(const table of ACCOUNT_MIGRATION_TABLES){
  const rows=payload.tables[table];
  if(!Array.isArray(rows)||rows.length>1000)throw fail('SOURCE_ROW_LIMIT');
  for(const row of rows){
   if(!row||Array.isArray(row)||typeof row!=='object'||Object.keys(row).length<1)throw fail('INVALID_SOURCE_ROW');
   for(const [name,value] of Object.entries(row)){
    identifier(name);
    if(value!==null&&typeof value!=='string'&&typeof value!=='boolean'&&!(typeof value==='number'&&Number.isFinite(value)))throw fail('INVALID_SOURCE_VALUE');
    if(typeof value==='string'&&(value.includes('\0')||value.length>65536))throw fail('INVALID_SOURCE_VALUE');
    if(typeof value==='number'&&!Number.isSafeInteger(value)&&!['position','start_seconds','processed_duration'].includes(name))throw fail('UNSAFE_SOURCE_INTEGER');
   }
   count++;
  }
 }
 if(payload.tables.users.length!==4||payload.tables.users.some(row=>!/^synthetic-migration-(?:owner|other|closed|revoked)@example\.test$/.test(row.email)||!['ADMIN','MEMBER'].includes(row.role)))throw fail('SYNTHETIC_IDENTITY_REQUIRED');
 if(payload.tables.users.some(row=>!/^\w{32}:[a-f0-9]{128}$/.test(row.password_hash)||!Number.isSafeInteger(row.id)))throw fail('UNSUPPORTED_PASSWORD_ENCODING');
 for(const table of ['sessions','account_tokens'])if(payload.tables[table].some(row=>!/^[a-f0-9]{64}$/.test(row.token_hash)||!Number.isFinite(Date.parse(row.expires_at))))throw fail('UNSUPPORTED_TOKEN_ENCODING');
 for(const row of payload.tables.user_mfa){const bytes=Buffer.from(row.secret_encrypted||'','base64url');if(bytes.length!==60||!Number.isSafeInteger(row.last_totp_step))throw fail('UNSUPPORTED_MFA_ENCODING');}
 return {tableCount:ACCOUNT_MIGRATION_TABLES.length,recordCount:count};
}

export function createSyntheticSource(directory,{mfaKey=crypto.randomBytes(32)}={}){
 const database=path.join(directory,'synthetic.sqlite');
 const code=`
 import crypto from 'node:crypto';
 import {db,hashPassword,verifyPassword,tokenHash} from ${JSON.stringify(new URL('../src/database.js',import.meta.url).href)};
 import {encryptSecret,decryptSecret,newTotpSecret} from ${JSON.stringify(new URL('../src/account-security.js',import.meta.url).href)};
 const created='2026-01-02T03:04:05.000Z',expired='2025-01-02T03:04:05.000Z',future='2099-01-02T03:04:05.000Z';
 const insert=(table,row)=>{const columns=Object.keys(row);db.prepare('INSERT INTO '+table+' ('+columns.join(',')+') VALUES ('+columns.map(()=>'?').join(',')+')').run(...Object.values(row))};
 db.exec('BEGIN IMMEDIATE');
 try{
  for(const [index,name] of ['owner','other','closed','revoked'].entries()){
   const id=index+1,password=crypto.randomBytes(32).toString('base64url'),hash=hashPassword(password);
   if(!verifyPassword(password,hash)||verifyPassword(password+'wrong',hash))throw Error('Credential compatibility failed');
   insert('users',{id,email:'synthetic-migration-'+name+'@example.test',password_hash:hash,name:'Synthetic '+name,role:index===0?'ADMIN':'MEMBER',created_at:created});
   if(name!=='revoked')insert('sessions',{token_hash:tokenHash(crypto.randomBytes(32).toString('base64url')),user_id:id,expires_at:name==='closed'?expired:future});
   insert('user_preferences',{user_id:id,pause_history:index%2,autoplay_next:0,theme:'dark',locale:'English',save_searches:0,updated_at:created});
  }
  const secret=newTotpSecret(),encrypted=encryptSecret(secret);if(decryptSecret(encrypted)!==secret)throw Error('MFA compatibility failed');
  insert('user_mfa',{user_id:1,secret_encrypted:encrypted,enabled:1,last_totp_step:42,created_at:created});
  insert('closed_accounts',{user_id:3,closed_at:created});
  insert('email_verifications',{user_id:1,verified_at:created});
  insert('account_tokens',{token_hash:tokenHash(crypto.randomBytes(32).toString('base64url')),user_id:2,kind:'PASSWORD_RESET',expires_at:expired,created_at:created});
  insert('account_tokens',{token_hash:tokenHash(crypto.randomBytes(32).toString('base64url')),user_id:2,kind:'EMAIL_VERIFY',expires_at:future,created_at:created});
  for(const table of ['favorites','watch_later'])insert(table,{user_id:1,video_id:1,created_at:created});
  insert('favorites',{user_id:2,video_id:2,created_at:created});
  insert('reactions',{user_id:1,video_id:1,type:'LIKE'});
  insert('watch_progress',{user_id:1,video_id:1,position:3.25,watched_at:created});
  insert('subscriptions',{user_id:1,channel_id:1,created_at:created,notify:0,notify_mode:'OFF'});
  insert('playlists',{id:1,user_id:1,name:'Synthetic private list',created_at:created,visibility:'PRIVATE'});
  insert('playlist_videos',{playlist_id:1,video_id:2,added_at:created,position:1});
  insert('watch_queue',{user_id:1,video_id:1,position:1,added_at:created});
  insert('search_history',{user_id:1,query:'synthetic fixture',searched_at:created});
  insert('saved_search_filters',{id:1,user_id:1,name:'Synthetic filter',filters_json:'{"sort":"latest"}',created_at:created});
  insert('entity_follows',{user_id:1,kind:'sites',entity_id:1,created_at:created});
  insert('user_category_preferences',{user_id:1,category_id:1,created_at:created});
  insert('creator_profiles',{user_id:2,channel_id:1,display_name:'Synthetic creator',status:'APPROVED',applied_at:created,reviewed_at:created,reviewed_by:1,review_note:'Synthetic rehearsal only',bio:'Synthetic fixture'});
  db.prepare("UPDATE videos SET status='HIDDEN' WHERE id=72").run();
  const upload='00000000-0000-4000-8000-000000000047';
  insert('upload_sessions',{id:upload,user_id:2,video_id:72,original_filename:'synthetic.mp4',declared_type:'video/mp4',expected_bytes:128,received_bytes:128,sha256:'a'.repeat(64),status:'IN_REVIEW',attempts:1,description:'Synthetic metadata only',rights_declaration:1,adults_declaration:1,consent_declaration:1,processed_duration:8,error:null,created_at:created,updated_at:created,reviewed_at:null,reviewed_by:null,review_note:null,planned_release_at:null,selected_poster:'poster.jpg'});
  insert('processing_events',{id:1,upload_id:upload,state:'IN_REVIEW',message:'Synthetic rehearsal only',created_at:created});
  insert('moderation_audit',{id:1,actor_id:1,object_type:'upload',object_id:upload,action:'SYNTHETIC_REHEARSAL',note:'No actual review or approval',created_at:created});
  insert('review_evidence',{upload_id:upload,kind:'LICENSE',reference:'SYNTHETIC-NOT-A-LICENSE',checked_by:1,checked_at:created});
  insert('notifications',{id:1,user_id:1,channel_id:1,video_id:1,type:'NEW_VIDEO',read_at:null,created_at:created});
  insert('auth_security_events',{id:1,user_id:1,kind:'SYNTHETIC_REHEARSAL',created_at:created});
  if(db.prepare('PRAGMA foreign_key_check').all().length)throw Error('Fixture relationship failed');
  db.exec('COMMIT');db.close();
 }catch(error){try{db.exec('ROLLBACK');db.close()}catch{}process.exitCode=1;}
 `;
 const child=spawnSync(process.execPath,['--input-type=module','--eval',code],{cwd:root,env:{...process.env,NODE_ENV:'test',DB_PATH:database,PRIVATE_PATH:path.join(directory,'private'),SA_MFA_KEY:mfaKey.toString('hex')},encoding:'utf8',timeout:20000,maxBuffer:1024*1024});
 if(child.error||child.status!==0){mfaKey.fill(0);throw fail('SYNTHETIC_SOURCE_CREATION_FAILED');}
 fs.chmodSync(database,0o600);
 const db=new DatabaseSync(database,{readOnly:true});
 try{
  db.exec('BEGIN');
  const tables=Object.fromEntries(ACCOUNT_MIGRATION_TABLES.map(table=>[table,db.prepare(`SELECT * FROM ${identifier(table)} ORDER BY rowid`).all().map(row=>Object.fromEntries(Object.entries(row).map(([name,value])=>[name,booleanColumns.has(name)?Boolean(value):value])))]));
  db.exec('COMMIT');
  const payload={format:FORMAT,syntheticOnly:true,tables};validateSyntheticPayload(payload);
  return {payload,mfaKey,database};
 }catch(error){mfaKey.fill(0);throw error}finally{db.close()}
}

export function buildAccountImportSql(payload,{commit=false,injectFailure=false}={}){
 validateSyntheticPayload(payload);
 const ledger=migrationFiles();
 const sql=['BEGIN;',"SET LOCAL lock_timeout='5s';","SET LOCAL statement_timeout='25s';","SET LOCAL search_path=pg_catalog,public;",
  `LOCK TABLE ${ACCOUNT_MIGRATION_TABLES.map(t=>'public.'+identifier(t)).join(',')} IN ACCESS EXCLUSIVE MODE;`,
  `DO $$ BEGIN IF ${ACCOUNT_MIGRATION_TABLES.map(t=>`EXISTS(SELECT 1 FROM public.${identifier(t)})`).join(' OR ')} THEN RAISE EXCEPTION 'NONEMPTY_MIGRATION_TARGET'; END IF; END $$;`,
  `DO $$ BEGIN IF (SELECT count(*) FROM public.sa_schema_migrations)<>${ledger.length} OR ${ledger.map(m=>`NOT EXISTS(SELECT 1 FROM public.sa_schema_migrations WHERE name=${literal(m.name)} AND sha256=${literal(m.sha256)})`).join(' OR ')} THEN RAISE EXCEPTION 'MIGRATION_LEDGER_MISMATCH'; END IF; END $$;`];
 for(const table of ACCOUNT_MIGRATION_TABLES){
  const name=identifier(table),staged=identifier('migration_'+table),rows=payload.tables[table];
  sql.push(`CREATE TEMP TABLE ${staged} (LIKE public.${name} INCLUDING DEFAULTS) ON COMMIT DROP;`);
  if(rows.length){
   // jsonb_populate_recordset uses the destination's reviewed column types;
   // later bidirectional EXCEPT checks every field within the same transaction.
   sql.push(`INSERT INTO ${staged} SELECT * FROM jsonb_populate_recordset(NULL::public.${name},${literal(JSON.stringify(rows))}::jsonb);`);
   sql.push(`INSERT INTO public.${name} SELECT * FROM ${staged};`);
  }
  sql.push(`DO $$ BEGIN IF EXISTS((SELECT * FROM public.${name} EXCEPT ALL SELECT * FROM ${staged}) UNION ALL (SELECT * FROM ${staged} EXCEPT ALL SELECT * FROM public.${name})) THEN RAISE EXCEPTION 'MIGRATION_PARITY_FAILED'; END IF; END $$;`);
 }
 // Retain expired/closed/revoked state, and assert no accidental session revival.
 sql.push(`DO $$ BEGIN IF (SELECT count(*) FROM public.users)<>4 OR EXISTS(SELECT 1 FROM public.sessions WHERE user_id=4) OR NOT EXISTS(SELECT 1 FROM public.closed_accounts WHERE user_id=3) OR (SELECT last_totp_step FROM public.user_mfa WHERE user_id=1)<>42 THEN RAISE EXCEPTION 'ACCOUNT_STATE_PARITY_FAILED'; END IF; END $$;`);
 if(injectFailure)sql.push("DO $$ BEGIN RAISE EXCEPTION 'SYNTHETIC_ROLLBACK_PROBE'; END $$;");
 // Sequence setval is nontransactional; only change it for an explicit commit,
 // after all rollback/row/relationship checks have succeeded.
 if(commit)for(const table of identities)sql.push(`SELECT setval(pg_get_serial_sequence('public.${table}','id'),GREATEST(COALESCE((SELECT max(id) FROM public.${identifier(table)}),1),1),true);`);
 sql.push(commit?'COMMIT;':'ROLLBACK;');
 return sql.join('\n');
}

export function runSyntheticAccountMigration({commit=false,env=process.env,query=sql=>migrationQuery(sql,{env})}={}){
 const config=accountMigrationConfiguration(env);
 // Committed MFA records must remain decryptable by the explicitly configured
 // destination runtime. A rehearsal may use a throwaway key because it rolls back.
 if(commit&&!/^[a-f0-9]{64}$/i.test(env.SA_MFA_KEY||''))throw fail('DESTINATION_MFA_KEY_REQUIRED');
 const selected=query("SELECT current_database()||'|'||current_setting('server_version_num');").split('|');
 if(selected[0]!==config.database||!/^160\d{3}$/.test(selected[1]||''))throw fail('SELECTED_POSTGRES_16_REQUIRED');
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'sa-synthetic-migration-')),key=crypto.randomBytes(32);let source;
 try{
  source=createSyntheticSource(directory,{mfaKey:commit?Buffer.from(env.SA_MFA_KEY,'hex'):crypto.randomBytes(32)});
  const envelope=sealSyntheticTransfer(source.payload,key),transfer=path.join(directory,'accounts.encrypted.json');
  fs.writeFileSync(transfer,JSON.stringify(envelope),{mode:0o600,flag:'wx'});
  const payload=openSyntheticTransfer(JSON.parse(fs.readFileSync(transfer,'utf8')),key),summary=validateSyntheticPayload(payload);
  const before=query(ACCOUNT_MIGRATION_TABLES.map(t=>`SELECT '${t}|'||count(*) FROM public.${identifier(t)};`).join('\n'));
  if(before.split('\n').length!==ACCOUNT_MIGRATION_TABLES.length||before.split('\n').some(line=>!line.endsWith('|0')))throw fail('NONEMPTY_MIGRATION_TARGET');
  // A deliberately failing import must rollback all prior rows and audit inserts.
  let rejected=false;try{query(buildAccountImportSql(payload,{injectFailure:true}))}catch{rejected=true}
  if(!rejected||query(ACCOUNT_MIGRATION_TABLES.map(t=>`SELECT '${t}|'||count(*) FROM public.${identifier(t)};`).join('\n'))!==before)throw fail('ATOMIC_ROLLBACK_FAILED');
  query(buildAccountImportSql(payload,{commit}));
  const counts=Object.fromEntries(query(ACCOUNT_MIGRATION_TABLES.map(t=>`SELECT '${t}|'||count(*) FROM public.${identifier(t)};`).join('\n')).split('\n').map(line=>{const [t,n]=line.split('|');return [t,Number(n)];}));
  for(const table of ACCOUNT_MIGRATION_TABLES)if(counts[table]!== (commit?payload.tables[table].length:0))throw fail('POST_TRANSACTION_ROW_COUNT_FAILED');
  return {format:'streamatlas-synthetic-account-migration-report-v1',status:'PASS',...summary,mode:commit?'COMMIT_SYNTHETIC':'ROLLBACK_REHEARSAL',rowsByTable:Object.fromEntries(ACCOUNT_MIGRATION_TABLES.map(t=>[t,payload.tables[t].length])),encryptedTransfer:true,sourceCredentialCompatibility:true,fullFieldParityBeforeCommit:true,foreignKeysEnforced:true,deliberateFailureRolledBack:true,expiredAndRevokedStatePreserved:true,destinationMfaKeyRequiredOnCommit:commit,targetEmptyAfterRehearsal:!commit,syntheticOnly:true,liveIdentityImported:false,mediaBytesTransferred:false,cutoverApproved:false};
 }finally{key.fill(0);source?.mfaKey.fill(0);fs.rmSync(directory,{recursive:true,force:true});}
}

if(process.argv[1]&&path.resolve(process.argv[1])===import.meta.filename){
 try{
  if(process.argv.length!==3||!['--rehearse','--commit-synthetic'].includes(process.argv[2]))throw fail('USAGE_REHEARSE_OR_COMMIT_SYNTHETIC');
  console.log(JSON.stringify(runSyntheticAccountMigration({commit:process.argv[2]==='--commit-synthetic'}),null,2));
 }catch(error){console.error('Synthetic account migration failed: '+(error.code||'MIGRATION_EXECUTION_FAILED'));process.exitCode=1;}
}
