import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {buildSbom} from '../scripts/generate-sbom.js';
import {verifyVendored} from '../scripts/vendor-hls.js';

test('SBOM includes verified local HLS even when root lockfile has no dependencies',()=>{
 const library=verifyVendored();
 const sbom=buildSbom({name:'streamatlas-test',version:'0.0.0'},{packages:{}},[library]);
 assert.equal(sbom.components.length,1);
 const component=sbom.components[0];
 assert.equal(component.name,'hls.js');assert.equal(component.version,'1.7.3');
 assert.deepEqual(component.licenses,[{license:{id:'Apache-2.0'}}]);
 assert.equal(component.hashes[0].content,library.sha256);
 assert.match(component.properties[0].value,/npm audit does not inspect/);
 assert.match(sbom.metadata.properties[0].value,/no native\/OS/);
});
test('SBOM merges duplicate npm identities while retaining verified bundle hash',()=>{
 const library=verifyVendored();
 const sbom=buildSbom({name:'fixture',version:'0.0.0'},{packages:{'node_modules/hls.js':{version:'1.7.3'}}},[library]);
 assert.equal(sbom.components.length,1);assert.equal(sbom.components[0].hashes[0].content,library.sha256);
});
test('SBOM CLI reports the actual vendored component instead of a zero-package inventory',()=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'sa-vendor-sbom-'));
 try{
  const output=path.join(tmp,'sbom.json');
  const result=spawnSync(process.execPath,[new URL('../scripts/generate-sbom.js',import.meta.url).pathname,output],{encoding:'utf8'});
  assert.equal(result.status,0,result.stderr);
  const data=JSON.parse(fs.readFileSync(output));
  assert.ok(data.components.some(x=>x.purl==='pkg:npm/hls.js@1.7.3'));
 }finally{fs.rmSync(tmp,{recursive:true,force:true})}
});
