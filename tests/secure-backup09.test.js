import test from 'node:test';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';
import fs from 'node:fs';import path from 'node:path';import os from 'node:os';
const root=path.resolve(import.meta.dirname,'..');const temp=fs.mkdtempSync(path.join(os.tmpdir(),'sa-securebackup09-'));
const dbFile=path.join(temp,'source.sqlite'),media=path.join(temp,'private'),out=path.join(temp,'backups'),restore=path.join(temp,'restored');
const env={...process.env,NODE_ENV:'test',DB_PATH:dbFile,PRIVATE_PATH:media,SA_BACKUP_KEY:'a'.repeat(64),SA_BACKUP_OFFLINE:'1'};
let directory;
test('09: encrypted offline backup covers consistent SQLite and private media',()=>{
 execFileSync(process.execPath,['--input-type=module','-e',`const {db}=await import(${JSON.stringify(new URL('../src/database.js',import.meta.url).href)});db.close();`],{cwd:root,env});
 fs.mkdirSync(path.join(media,'processed','clip-1'),{recursive:true});
 fs.mkdirSync(path.join(media,'uploads'),{recursive:true});
 fs.writeFileSync(path.join(media,'processed','clip-1','preview.mp4'),'FAKE PRIVATE VIDEO BYTES');
 fs.writeFileSync(path.join(media,'uploads','demo.part'),'DUMMY PRIVATE UPLOAD');
 const result=JSON.parse(execFileSync(process.execPath,[path.join(root,'scripts/secure-backup.js'),out],{cwd:root,env,encoding:'utf8'}));
 directory=result.folder;assert.equal(result.entries,3);
 const manifest=fs.readFileSync(path.join(directory,'manifest.enc'));
 assert.equal(manifest.includes(Buffer.from('FAKE PRIVATE VIDEO')),false);
 assert.equal(manifest.includes(Buffer.from('clip-1')),false);
 assert.equal(fs.existsSync(path.join(directory,'database.sqlite')),false);
});
test('09: restore authenticates encrypted files, checks DB integrity, prevents overwrite',()=>{
 const result=JSON.parse(execFileSync(process.execPath,[path.join(root,'scripts/secure-restore.js'),directory,restore],{cwd:root,env,encoding:'utf8'}));
 assert.equal(result.ok,true);assert.equal(result.files,3);
 assert.equal(fs.readFileSync(path.join(restore,'private','uploads','demo.part'),'utf8'),'DUMMY PRIVATE UPLOAD');
 assert.equal(fs.readFileSync(path.join(restore,'private','processed','clip-1','preview.mp4'),'utf8'),'FAKE PRIVATE VIDEO BYTES');
 assert.equal(fs.readFileSync(path.join(restore,'database.sqlite')).subarray(0,15).toString(),'SQLite format 3');
 assert.throws(()=>execFileSync(process.execPath,[path.join(root,'scripts/secure-restore.js'),directory,restore],{cwd:root,env,stdio:'ignore'}));
});
test('09: tampered AES-GCM backup fails closed without partial restore',()=>{
 const target=path.join(temp,'tampered-restore');
 const blob=path.join(directory,'000001.enc');const contents=fs.readFileSync(blob);contents[0]^=1;fs.writeFileSync(blob,contents);
 assert.throws(()=>execFileSync(process.execPath,[path.join(root,'scripts/secure-restore.js'),directory,target],{cwd:root,env,stdio:'ignore'}));
 assert.equal(fs.existsSync(target),false);
 fs.rmSync(temp,{recursive:true,force:true});
});
