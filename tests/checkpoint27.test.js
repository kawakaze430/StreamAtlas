import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';import path from 'node:path';import os from 'node:os';import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {migrationFiles,validateMigrations,atomicSql,requireDisposableEnv} from '../scripts/pg-migrations.js';
import {inspectSchema,pgColumns} from '../scripts/pg-schema-parity.js';
import {verifyCatalog} from '../scripts/pg-catalog-integrity.js';
import {exportSnapshot,verifySnapshot} from '../scripts/pg-private-snapshot.js';
import {inspect} from '../scripts/spring-contract-gap.js';
import {preflight} from '../scripts/pg-cutover-preflight.js';
import {auditEvidence} from '../scripts/aws-gates.js';
const root=path.resolve(import.meta.dirname,'..');const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'sa27-'));
const sqlite=path.join(tmp,'seed.db'),catalog=path.join(tmp,'catalog');
after(()=>fs.rmSync(tmp,{recursive:true,force:true}));
const run=(script,args=[],env={})=>execFileSync(process.execPath,[path.join(root,script),...args],{cwd:root,env:{...process.env,...env},stdio:'pipe'});

test('27: ordered 18 PostgreSQL migrations have stable content checksums',()=>{
 const m=migrationFiles();const v=validateMigrations(m);
 assert.equal(m.length,18);assert.equal(m[12].name,'013_integrity_and_audit.sql');assert.equal(m[13].name,'014_qoe_aggregates.sql');assert.equal(m[14].name,'015_search_keysets.sql');assert.equal(m[15].name,'016_comment_abuse_and_duplicate_review.sql');assert.equal(m[16].name,'017_reviewed_catalog_tags.sql');
 assert.ok(v.files.every(x=>/^[a-f0-9]{64}$/.test(x.sha256)));
});
test('27: migration static validator rejects unsafe or nontransactional scripts',()=>{
 assert.throws(()=>validateMigrations([{name:'001_bad.sql',sql:'DROP TABLE users;',sha256:'a'}]));
 assert.throws(()=>validateMigrations([{name:'001_bad.sql',sql:'BEGIN; DROP TABLE users; COMMIT;',sha256:'a'}]));
});
test('27: migration DDL and checksum ledger write share one transaction',()=>{
 const s=atomicSql(migrationFiles()[0]);assert.match(s,/^BEGIN;/);assert.match(s,/INSERT INTO sa_schema_migrations\(name,sha256\)/);assert.match(s,/COMMIT;\n$/);
 assert.equal((s.match(/^BEGIN;/gm)||[]).length,1);assert.equal((s.match(/^COMMIT;/gm)||[]).length,1);
});
test('27: disposable PostgreSQL execution rejects remote and production database settings',()=>{
 const e={SA_PG_DISPOSABLE:'YES_I_ACCEPT_DATA_LOSS',PGDATABASE:'sa_disposable_ci',PGHOST:'127.0.0.1',PGUSER:'sa_test'};
 assert.doesNotThrow(()=>requireDisposableEnv(e));
 assert.throws(()=>requireDisposableEnv({...e,PGDATABASE:'production'}));
 assert.throws(()=>requireDisposableEnv({...e,PGHOST:'db.example.com'}));
 assert.throws(()=>requireDisposableEnv({...e,SA_PG_DISPOSABLE:''}));
 assert.throws(()=>requireDisposableEnv({...e,PGSERVICE:'remote'}));
});
test('27: seed disposable SQLite database for parity audit',()=>{
 run('src/database.js',[],{DB_PATH:sqlite});assert.ok(fs.existsSync(sqlite));
});
test('27: all 62 application SQLite tables and columns are represented in PG DDL',()=>{
 const result=inspectSchema(sqlite);
 assert.equal(result.sqliteTables,62);assert.equal(result.postgresTables,62);
 assert.deepEqual(result.missingTables,[]);assert.deepEqual(result.missingColumns,{});
 assert.equal(result.verifiedOnPostgres,false);
});
test('27: parser sees additive columns and excludes SQL constraints from columns',()=>{
 const m=pgColumns('CREATE TABLE IF NOT EXISTS things (id BIGINT PRIMARY KEY, text TEXT CHECK(text IN (\'a\',\'b\')), PRIMARY KEY(id)); ALTER TABLE things ADD COLUMN IF NOT EXISTS more TEXT;');
 assert.deepEqual([...m.get('things')],['id','text','more']);
});
test('27: exported catalog checksums, IDs and foreign keys validate',()=>{
 run('scripts/export-catalog-pg.js',[catalog],{DB_PATH:sqlite});
 const result=verifyCatalog(catalog);assert.equal(result.counts.videos,72);assert.equal(result.foreignKeysChecked,true);
 run('scripts/build-pg-catalog-import.js',[catalog,path.join(tmp,'catalog.pg.sql')],{DB_PATH:sqlite});
});
test('27: even correctly re-hashed catalog with orphan FK is rejected',()=>{
 const target=path.join(catalog,'video_categories.jsonl'),manifestPath=path.join(catalog,'manifest.json');
 const old=fs.readFileSync(target);const originalManifest=fs.readFileSync(manifestPath);
 try{
  const rows=old.toString().trim().split('\n').map(JSON.parse);rows[0].video_id=999999;
  const bytes=Buffer.from(rows.map(JSON.stringify).join('\n')+'\n');fs.writeFileSync(target,bytes);
  const m=JSON.parse(originalManifest);m.tables.video_categories.sha256=crypto.createHash('sha256').update(bytes).digest('hex');fs.writeFileSync(manifestPath,JSON.stringify(m));
  assert.throws(()=>verifyCatalog(catalog),/Orphaned/);
 }finally{fs.writeFileSync(target,old);fs.writeFileSync(manifestPath,originalManifest);}
});
test('27: encrypted private snapshot contains no plaintext and has owner-only mode',()=>{
 const old={...process.env};
 try{
  process.env.SA_PG_SNAPSHOT_APPROVED='YES_PRIVATE_BACKUP';process.env.SA_PG_SNAPSHOT_KEY='a-secret-test-key-that-is-at-least-32-characters-long';
  const file=path.join(tmp,'private.json');const out=exportSnapshot(sqlite,file);
  assert.equal(out.encrypted,true);assert.equal(out.tableCount,62);
  assert.equal(fs.statSync(file).mode&0o777,0o600);
  const bytes=fs.readFileSync(file,'utf8');assert.doesNotMatch(bytes,/password_hash|"users"|"sessions"|"email"/);
  assert.equal(verifySnapshot(file).authenticated,true);
  process.env.SA_PG_SNAPSHOT_KEY='different-secret-key-at-least-32-characters-long';assert.throws(()=>verifySnapshot(file));
 }finally{for(const k of ['SA_PG_SNAPSHOT_APPROVED','SA_PG_SNAPSHOT_KEY']){if(old[k]===undefined)delete process.env[k];else process.env[k]=old[k];}}
});
test('27: snapshot requires explicit approval and rejects public-root destinations',()=>{
 const old={...process.env};
 try{
  process.env.SA_PG_SNAPSHOT_KEY='a-secret-test-key-that-is-at-least-32-characters-long';
  delete process.env.SA_PG_SNAPSHOT_APPROVED;
  assert.throws(()=>exportSnapshot(sqlite,path.join(tmp,'denied.json')),/approval/);
  process.env.SA_PG_SNAPSHOT_APPROVED='YES_PRIVATE_BACKUP';
  assert.throws(()=>exportSnapshot(sqlite,path.join(root,'public','denied.json')),/public/);
 }finally{for(const k of ['SA_PG_SNAPSHOT_APPROVED','SA_PG_SNAPSHOT_KEY']){if(old[k]===undefined)delete process.env[k];else process.env[k]=old[k];}}
});
test('27: Spring catalog remains loopback-only and excludes held/unlicensed uploads and media URLs',()=>{
 const props=fs.readFileSync(path.join(root,'backend-spring/src/main/resources/application.properties'),'utf8');
 const java=fs.readFileSync(path.join(root,'backend-spring/src/main/java/example/streamatlas/catalog/CatalogController.java'),'utf8');
 assert.match(props,/server.address=\$\{SA_SPRING_BIND:127\.0\.0\.1\}/);
 assert.match(java,/NOT EXISTS \(SELECT 1 FROM content_holds/);assert.match(java,/media_license_reviews/);
 assert.doesNotMatch(java,/media_url AS/);
});
test('27: static Spring parity report does not claim API equivalence',()=>{
 const result=inspect();assert.ok(result.nodeContractOperations>result.springOperations);
 assert.equal(result.readyForCutover,false);assert.equal(result.authAndUploadParityVerified,false);
});
test('27: PostgreSQL cutover preflight fails closed even with matching table/column names',()=>{
 const result=preflight(sqlite);assert.equal(result.gates.sqlitePgSchemaColumnsCovered,true);
 assert.equal(result.readyForCutover,false);assert.equal(result.gates.pointInTimeRestoreRehearsed,false);
});
test('27: AWS evidence template is missing approvals and cannot authorize deployment',()=>{
 const template=JSON.parse(fs.readFileSync(path.join(root,'docs/AWS_GATE_EVIDENCE_TEMPLATE.json'),'utf8'));
 const result=auditEvidence(template);assert.equal(Object.keys(result.tasks).length,5);
 assert.equal(result.allReferencesRecorded,false);assert.equal(result.deploymentAuthorized,false);assert.equal(result.cloudCallsPerformed,false);
 for(const k of Object.keys(result.tasks))assert.ok(result.tasks[k].missing.length);
});
test('27: even populated AWS references are not independently verified',()=>{
 const e=JSON.parse(fs.readFileSync(path.join(root,'docs/AWS_GATE_EVIDENCE_TEMPLATE.json'),'utf8'));
 for(const task of ['G01','G02','G03','G04','G05'])for(const key of Object.keys(e[task]))e[task][key]='opaque-review-reference';
 const result=auditEvidence(e);assert.equal(result.allReferencesRecorded,true);assert.equal(result.deploymentAuthorized,false);
});
test('27: Terraform draft separates private original and CDN rendition buckets',()=>{
 const hcl=fs.readFileSync(path.join(root,'deployment/aws/media-cdn/main.tf'),'utf8');
 assert.match(hcl,/resource "aws_s3_bucket" "originals"/);assert.match(hcl,/resource "aws_s3_bucket" "media"/);
 assert.match(hcl,/resource "aws_s3_bucket_public_access_block" "originals"/);
 assert.match(hcl,/resource "aws_s3_bucket_public_access_block" "media"/);
 assert.match(hcl,/resource "aws_s3_bucket_lifecycle_configuration" "originals"/);
 assert.match(hcl,/resource "aws_cloudfront_origin_access_control" "media"/);
 assert.doesNotMatch(hcl,/force_destroy\s*=\s*true/);
});
test('27: PostgreSQL CI is isolated and tests migrations, concurrent writes, and Spring compilation',()=>{
 const ci=fs.readFileSync(path.join(root,'.github/workflows/postgres-disposable.yml'),'utf8');
 assert.match(ci,/image: postgres:16/);assert.match(ci,/pg-migrations\.js --apply/);
 assert.match(ci,/pg-concurrency-smoke\.js/);assert.match(ci,/mvn -f backend-spring\/pom\.xml/);
});
