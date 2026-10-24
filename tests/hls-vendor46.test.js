import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import {spawnSync} from 'node:child_process';
import {HLS_PIN,verifyVendored,vendorHls} from '../scripts/vendor-hls.js';

const root=path.resolve(import.meta.dirname,'..');
const vendor=path.join(root,'public/assets/vendor');
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'sa-hls-vendor-'));
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const clone=()=>{
 const dir=fs.mkdtempSync(path.join(tmp,'copy-'));
 fs.cpSync(vendor,dir,{recursive:true});
 return dir;
};
process.env.DB_PATH=path.join(tmp,'test.sqlite');
process.env.PRIVATE_PATH=path.join(tmp,'private');
process.env.NODE_ENV='test';
process.env.SA_DISABLE_WORKER='1';
const {server}=await import('../src/server.js');
let base;
before(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 base=`http://127.0.0.1:${server.address().port}`;
});
after(async()=>{
 await new Promise(resolve=>server.close(resolve));
 fs.rmSync(tmp,{recursive:true,force:true});
});

test('46 HLS client and both licenses verify without node_modules or network',()=>{
 const result=verifyVendored();
 assert.equal(result.version,'1.7.3');
 assert.equal(result.registrySignatureVerified,true);
 const module={exports:{}};
 // Execute the authentic UMD entry in isolation to verify its usable API. This
 // is not browser playback, ABR, decoder, network, or device acceptance.
 vm.runInNewContext(fs.readFileSync(path.join(vendor,'hls.min.js'),'utf8'),{module,exports:module.exports,console},{timeout:3000});
 assert.equal(module.exports.version,result.version);
 for(const name of ['attachMedia','loadSource','destroy'])assert.equal(typeof module.exports.prototype[name],'function');
 const out=spawnSync(process.execPath,['scripts/vendor-hls.js','--verify'],{cwd:root,encoding:'utf8'});
 assert.equal(out.status,0,out.stderr);
 assert.equal(JSON.parse(out.stdout).sha256,sha(fs.readFileSync(path.join(vendor,'hls.min.js'))));
});

test('46 same-origin static paths serve the actual pinned client and legal notices',async()=>{
 for(const name of ['hls.min.js','HLS-LICENSE.txt','APACHE-2.0.txt']){
  const response=await fetch(base+'/assets/vendor/'+name);
  assert.equal(response.status,200,name);
  if(name==='hls.min.js')assert.match(response.headers.get('content-type'),/javascript/);
  const bytes=Buffer.from(await response.arrayBuffer());
  assert.equal(sha(bytes),HLS_PIN.artifacts[name],name);
 }
 const head=await fetch(base+'/assets/vendor/hls.min.js',{method:'HEAD'});
 assert.equal(head.status,200);
 assert.equal((await head.arrayBuffer()).byteLength,0);
 const provenance=await fetch(base+'/assets/vendor/HLS-PROVENANCE.json');
 assert.equal(provenance.status,200);
 assert.equal((await provenance.json()).version,HLS_PIN.version);
});

test('46 player policy permits MSE media while keeping scripts and workers restricted',async()=>{
 const response=await fetch(base+'/');
 assert.equal(response.status,200);
 const directives=new Map(response.headers.get('content-security-policy').split(';').map(value=>value.trim().split(/\s+/)).map(([name,...values])=>[name,values]));
 assert.deepEqual(directives.get('media-src'),["'self'",'blob:']);
 assert.deepEqual(directives.get('script-src'),["'self'"]);
 assert.deepEqual(directives.get('worker-src'),["'none'"]);
 assert.deepEqual(directives.get('connect-src'),["'self'"]);
 assert.deepEqual(directives.get('object-src'),["'none'"]);
});

test('46 changing the bundle and its advertised checksum cannot bless tampered code',()=>{
 const dir=clone(),file=path.join(dir,'hls.min.js');
 fs.appendFileSync(file,'\n// altered bytes\n');
 const manifestPath=path.join(dir,'HLS-PROVENANCE.json');
 const manifest=JSON.parse(fs.readFileSync(manifestPath));
 manifest.artifacts['hls.min.js'].sha256=sha(fs.readFileSync(file));
 manifest.artifacts['hls.min.js'].bytes=fs.statSync(file).size;
 fs.writeFileSync(manifestPath,JSON.stringify(manifest));
 assert.throws(()=>verifyVendored({vendorDir:dir}),/Unexpected HLS artifact provenance/);
});

test('46 missing or changed notices and forged npm signatures fail verification',()=>{
 for(const name of ['HLS-LICENSE.txt','APACHE-2.0.txt']){
  const dir=clone();
  fs.writeFileSync(path.join(dir,name),'license removed');
  assert.throws(()=>verifyVendored({vendorDir:dir}),/integrity mismatch/);
 }
 const dir=clone(),file=path.join(dir,'HLS-PROVENANCE.json');
 const manifest=JSON.parse(fs.readFileSync(file));
 manifest.registryVerification.signatures=['Zm9yZ2Vk'];
 fs.writeFileSync(file,JSON.stringify(manifest));
 assert.throws(()=>verifyVendored({vendorDir:dir}),/Invalid npm registry signature/);
 const attacker=crypto.generateKeyPairSync('ec',{namedCurve:'prime256v1'});
 manifest.registryVerification.publicKeyDerBase64=attacker.publicKey.export({type:'spki',format:'der'}).toString('base64');
 manifest.registryVerification.signatures=[crypto.sign('sha256',Buffer.from(manifest.registryVerification.message),attacker.privateKey).toString('base64')];
 fs.writeFileSync(file,JSON.stringify(manifest));
 assert.throws(()=>verifyVendored({vendorDir:dir}),/Unexpected npm registry signature metadata/);
});

test('46 a wrong installed version or license cannot publish any destination file',()=>{
 for(const patch of [{version:'1.7.4'},{license:'MIT'}]){
  const packageDir=fs.mkdtempSync(path.join(tmp,'package-'));
  fs.writeFileSync(path.join(packageDir,'package.json'),JSON.stringify({name:'hls.js',version:'1.7.3',license:'Apache-2.0',...patch}));
  const destination=path.join(tmp,'never-published-'+crypto.randomUUID());
  assert.throws(()=>vendorHls({packageDir,vendorDir:destination}),/Expected reviewed hls.js/);
  assert.equal(fs.existsSync(destination),false);
 }
});

test('46 vendor verification rejects a symlink substituted for a reviewed asset',()=>{
 const dir=clone(),target=path.join(dir,'hls.min.js');
 fs.rmSync(target);
 fs.symlinkSync(path.join(vendor,'hls.min.js'),target);
 assert.throws(()=>verifyVendored({vendorDir:dir}),/regular vendor input/);
});

test('46 caller-supplied digests cannot replace the production HLS pin',()=>{
 const destination=path.join(tmp,'never-reblessed');
 assert.throws(()=>vendorHls({packageDir:tmp,vendorDir:destination,expectedBundleSha256:'0'.repeat(64)}),/reviewed production HLS pin/);
 assert.equal(fs.existsSync(destination),false);
 const check=spawnSync(process.execPath,['scripts/vendor-hls.js','--verify'],{cwd:root,env:{...process.env,SA_HLS_BUNDLE_SHA256:'0'.repeat(64)},encoding:'utf8'});
 assert.equal(check.status,1);
 assert.match(check.stderr,/reviewed production HLS pin/);
 const explicit=spawnSync(process.execPath,['scripts/vendor-hls.js','--source',tmp,'--output',destination,'--expected-sha',HLS_PIN.artifacts['hls.min.js']],{cwd:root,env:{...process.env,SA_HLS_BUNDLE_SHA256:'0'.repeat(64)},encoding:'utf8'});
 assert.equal(explicit.status,1);
 assert.match(explicit.stderr,/reviewed production HLS pin/);
 assert.equal(fs.existsSync(destination),false);
});
