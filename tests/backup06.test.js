import test from 'node:test';import assert from 'node:assert/strict';
import fs from 'node:fs';import path from 'node:path';import os from 'node:os';import {spawnSync} from 'node:child_process';import {DatabaseSync} from 'node:sqlite';
const root=path.resolve(import.meta.dirname,'..');
function invoke(script,args,env){return spawnSync(process.execPath,[path.join(root,'scripts',script),...args],{cwd:root,env:{...process.env,...env},encoding:'utf8',timeout:15000})}
test('CP06: consistent SQLite snapshot, manifest checksum and tamper rejection', {timeout:30000},()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'sa6backup-')),live=path.join(temp,'live.sqlite'),dest=path.join(temp,'snapshots');
 try{
  const db=new DatabaseSync(live);db.exec('PRAGMA journal_mode=WAL;CREATE TABLE sample(id INTEGER PRIMARY KEY,name TEXT);INSERT INTO sample(name) VALUES(\'before snapshot\')');db.close();
  const make=invoke('backup-db.js',[dest],{DB_PATH:live});assert.equal(make.status,0,make.stderr);
  const info=JSON.parse(make.stdout);assert.equal(info.integrity,'ok');assert.ok(fs.existsSync(info.database));assert.ok(fs.existsSync(info.manifest));
  const check=invoke('verify-backup.js',[info.manifest],{});assert.equal(check.status,0,check.stderr);assert.equal(JSON.parse(check.stdout).ok,true);
  const restored=new DatabaseSync(info.database,{readOnly:true});try{assert.equal(restored.prepare('SELECT name FROM sample').get().name,'before snapshot')}finally{restored.close()}
  fs.appendFileSync(info.database,Buffer.from('modified'));
  const tamper=invoke('verify-backup.js',[info.manifest],{});assert.notEqual(tamper.status,0);assert.match(tamper.stderr,/checksum|mismatch/i);
  assert.notEqual(invoke('backup-db.js',[path.join('relative','path')],{DB_PATH:live}).status,0);
 }finally{fs.rmSync(temp,{recursive:true,force:true})}
});
