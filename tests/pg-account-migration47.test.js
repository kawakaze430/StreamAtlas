import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
 ACCOUNT_MIGRATION_TABLES,accountMigrationConfiguration,buildAccountImportSql,
 createSyntheticSource,openSyntheticTransfer,sealSyntheticTransfer,validateSyntheticPayload,
} from '../scripts/pg-account-migration-disposable.js';

const configured={NODE_ENV:'development',SA_PG_ACCOUNT_MIGRATION:'YES_SYNTHETIC_ONLY',
 SA_PG_DISPOSABLE:'YES_I_ACCEPT_DATA_LOSS',PGDATABASE:'sa_disposable_fixture47',
 PGHOST:'127.0.0.1',PGPORT:'55432',PGUSER:'sa_test'};

test('migration refuses production, remote and ambiguous database targets',()=>{
 assert.equal(accountMigrationConfiguration(configured).database,'sa_disposable_fixture47');
 for(const invalid of [
  {NODE_ENV:'production'},{SA_PUBLIC_CONTENT_MODE:'1'},
  {SA_PG_ACCOUNT_MIGRATION:undefined},{SA_PG_DISPOSABLE:undefined},
  {PGDATABASE:'streamatlas_live'},{PGHOST:'db.example.test'},
  {PGPORT:'0'},{PGPORT:'65536'},{PGUSER:undefined},
  {PGSERVICE:'other'},{PGHOSTADDR:'203.0.113.4'},{PGOPTIONS:'-c search_path=other'},
 ]) assert.throws(()=>accountMigrationConfiguration({...configured,...invalid}));
});

test('authenticated transfer rejects tampered ciphertext and wrong keys',()=>{
 const key=crypto.randomBytes(32),other=crypto.randomBytes(32);
 const envelope=sealSyntheticTransfer({format:'fixture',syntheticOnly:true},key);
 assert.deepEqual(openSyntheticTransfer(envelope,key),{format:'fixture',syntheticOnly:true});
 assert.throws(()=>openSyntheticTransfer(envelope,other),/TRANSFER_AUTHENTICATION_FAILED/);
 const bytes=Buffer.from(envelope.ciphertext,'base64');bytes[0]^=1;
 assert.throws(()=>openSyntheticTransfer({...envelope,ciphertext:bytes.toString('base64')},key),/TRANSFER_AUTHENTICATION_FAILED/);
 key.fill(0);other.fill(0);bytes.fill(0);
});

test('generated source contains only synthetic identities and all reviewed tables',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'sa-account47-'));
 let source;
 try{
  source=createSyntheticSource(dir);
  const summary=validateSyntheticPayload(source.payload);
  assert.equal(summary.tableCount,ACCOUNT_MIGRATION_TABLES.length);
  assert.equal(source.payload.tables.users.length,4);
  assert.ok(source.payload.tables.users.every(row=>row.email.endsWith('@example.test')));
  assert.equal(source.payload.tables.closed_accounts.length,1);
  assert.equal(source.payload.tables.user_mfa.length,1);
  assert.ok(source.payload.tables.sessions.every(row=>/^[a-f0-9]{64}$/.test(row.token_hash)));
  const forged=structuredClone(source.payload);
  forged.tables.users[0].email='actual-person@example.com';
  assert.throws(()=>validateSyntheticPayload(forged),/SYNTHETIC_IDENTITY_REQUIRED/);
  const sql=buildAccountImportSql(source.payload);
  assert.match(sql,/BEGIN;/);assert.match(sql,/ROLLBACK;$/);
  assert.match(sql,/MIGRATION_PARITY_FAILED/);
  assert.match(sql,/ACCOUNT_STATE_PARITY_FAILED/);
  assert.match(buildAccountImportSql(source.payload,{injectFailure:true}),/SYNTHETIC_ROLLBACK_PROBE/);
 }finally{source?.mfaKey.fill(0);fs.rmSync(dir,{recursive:true,force:true});}
});
