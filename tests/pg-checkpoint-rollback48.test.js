import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {rollbackConfiguration} from '../scripts/pg-checkpoint-rollback-disposable.js';

const safe={NODE_ENV:'development',SA_PG_ROLLBACK:'YES_SYNTHETIC_ONLY',
 SA_PG_DISPOSABLE:'YES_I_ACCEPT_DATA_LOSS',PGHOST:'127.0.0.1',PGPORT:'55432',
 PGUSER:'sa_test',PGDATABASE:'sa_disposable_source48'};

test('checkpoint drill requires two explicit, distinct disposable loopback databases',()=>{
 assert.deepEqual(rollbackConfiguration('sa_disposable_target48',safe),
  {source:'sa_disposable_source48',target:'sa_disposable_target48'});
 for(const override of [
  {NODE_ENV:'production'},{SA_PUBLIC_CONTENT_MODE:'1'},
  {SA_PG_ROLLBACK:undefined},{SA_PG_DISPOSABLE:undefined},
  {PGDATABASE:'shared'},{PGHOST:'pg.internal.test'},{PGHOST:'localhost'},
  {PGPORT:undefined},{PGPORT:'0'},{PGPORT:'65536'},
  {PGSERVICE:'live'},{PGHOSTADDR:'203.0.113.7'},{PGOPTIONS:'-c search_path=other'},
 ]) assert.throws(()=>rollbackConfiguration('sa_disposable_target48',{...safe,...override}));
 for(const target of ['shared','sa_disposable_source48','sa_disposable_target48;DROP DATABASE live',''])
  assert.throws(()=>rollbackConfiguration(target,safe));
});

test('unsafe target is rejected before any PostgreSQL client is called',()=>{
 const result=spawnSync(process.execPath,['scripts/pg-checkpoint-rollback-disposable.js','--target','production'],
  {encoding:'utf8',env:{...process.env,...safe,PATH:'/usr/bin:/bin'},timeout:3000});
 assert.equal(result.status,1);
 assert.match(result.stderr,/DISTINCT_DISPOSABLE_TARGET_REQUIRED/);
 assert.doesNotMatch(result.stderr,/password|secret|token|@example\.test/i);
});
