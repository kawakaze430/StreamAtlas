/** Offline-auditable PostgreSQL 16+ migration runner.
 * Live execution is intentionally restricted to a disposable local database.
 * It NEVER creates/drops databases and never contacts cloud services.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const migrationsDir=path.join(root,'migrations/postgresql');
export const checksum=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
export function migrationFiles(dir=migrationsDir){
 const names=fs.readdirSync(dir).filter(name=>/^\d{3}_[a-z0-9_]+\.sql$/.test(name)).sort();
 if(!names.length)throw Error('No PostgreSQL migrations');
 names.forEach((name,i)=>{if(Number(name.slice(0,3))!==i+1)throw Error('Migration sequence gap or duplicate at '+name);});
 return names.map(name=>({name,sha256:checksum(fs.readFileSync(path.join(dir,name))),sql:fs.readFileSync(path.join(dir,name),'utf8')}));
}
export function validateMigrations(files){
 for(const m of files){
  if(!/^\s*(?:--[^\n]*\n\s*)*BEGIN\s*;/i.test(m.sql)||!(/COMMIT\s*;\s*(?:--[^\n]*\s*)*$/i).test(m.sql))throw Error('Migration must wrap changes in BEGIN/COMMIT: '+m.name);
  if(/\b(?:DROP\s+(?:DATABASE|TABLE)|TRUNCATE|GRANT\s+ALL)\b/i.test(m.sql))throw Error('Unsafe migration operation: '+m.name);
 }
 return {format:'streamatlas-pg-migration-manifest-v1',minimumPostgres:16,files:files.map(({name,sha256})=>({name,sha256}))};
}
export function atomicSql(m){
 // One transaction includes both the migration DDL and its checksum ledger row.
 const inner=m.sql.replace(/^\s*(?:--[^\n]*\n\s*)*BEGIN\s*;/i,'').replace(/COMMIT\s*;\s*(?:--[^\n]*\s*)*$/i,'');
 return `BEGIN;\n${inner}\nINSERT INTO sa_schema_migrations(name,sha256) VALUES ('${m.name}','${m.sha256}');\nCOMMIT;\n`;
}
function psql(sql){
 const result=spawnSync('psql',['-X','-v','ON_ERROR_STOP=1','-A','-t','-q'],{input:sql,encoding:'utf8',env:process.env,timeout:120000,maxBuffer:4*1024*1024});
 if(result.error)throw Error('psql unavailable or timed out: '+result.error.message);
 if(result.status!==0)throw Error('psql command failed: '+(result.stderr||'').slice(0,1200));
 return result.stdout.trim();
}
export function requireDisposableEnv(env=process.env){
 if(env.SA_PG_DISPOSABLE!=='YES_I_ACCEPT_DATA_LOSS')throw Error('Explicit disposable database acknowledgment required');
 if(!/^sa_disposable_[a-z0-9_]+$/.test(env.PGDATABASE||''))throw Error('PGDATABASE must start with sa_disposable_');
 if(!['127.0.0.1','localhost','::1'].includes(env.PGHOST||''))throw Error('PGHOST must be loopback');
 if(env.PGSERVICE||env.PGHOSTADDR&& !['127.0.0.1','::1'].includes(env.PGHOSTADDR))throw Error('PG service/remote host override forbidden');
 if(!env.PGUSER)throw Error('PGUSER is required');
}
export function execute(mode){
 const files=migrationFiles();const manifest=validateMigrations(files);
 if(mode==='--check')return manifest;
 if(!['--apply','--verify'].includes(mode))throw Error('Usage: node scripts/pg-migrations.js --check|--apply|--verify');
 requireDisposableEnv();
 const version=Number(psql('SHOW server_version_num;'));
 if(!Number.isInteger(version)||version<160000)throw Error('PostgreSQL 16+ required, found '+version);
 if(mode==='--apply')psql(`CREATE TABLE IF NOT EXISTS sa_schema_migrations (name TEXT PRIMARY KEY,sha256 CHAR(64) NOT NULL,applied_at TIMESTAMPTZ NOT NULL DEFAULT now());`);
 const exists=psql("SELECT to_regclass('public.sa_schema_migrations') IS NOT NULL;");
 if(exists!=='t')throw Error('Migration ledger missing');
 const applied=psql('SELECT name || \'|\' || sha256 FROM sa_schema_migrations ORDER BY name;');
 const ledger=new Map(applied?applied.split('\n').map(line=>line.split('|')):[]);
 for(const m of files){
  if(ledger.has(m.name)){
   if(ledger.get(m.name)!==m.sha256)throw Error('Applied migration checksum drift: '+m.name);
  }else if(mode==='--verify')throw Error('Migration not applied: '+m.name);
  else{psql(atomicSql(m));ledger.set(m.name,m.sha256);}
 }
 const actual=psql('SELECT count(*) FROM sa_schema_migrations;');
 if(Number(actual)!==files.length)throw Error('Unexpected migration ledger count: '+actual);
 return {...manifest,verifiedOnDisposablePostgres:true,appliedCount:files.length};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{console.log(JSON.stringify(execute(process.argv[2]||'--check'),null,2));}
 catch(e){console.error('PostgreSQL migration check failed: '+e.message);process.exitCode=1;}
}
