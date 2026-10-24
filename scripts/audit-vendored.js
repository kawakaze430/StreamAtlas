/** Audit the pinned vendored JS separately from the dependency-free root lock. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {verifyVendored,HLS_PIN} from './vendor-hls.js';

let directory;
try{
 const library=verifyVendored();
 directory=fs.mkdtempSync(path.join(os.tmpdir(),'streamatlas-vendor-audit-'));
 fs.writeFileSync(path.join(directory,'package.json'),JSON.stringify({name:'streamatlas-vendor-audit',version:'0.0.0',private:true,dependencies:{[library.name]:library.version}}));
 for(const args of [['install','--package-lock-only','--ignore-scripts','--no-audit','--no-fund'],['audit','--omit=dev','--audit-level=high']]){
  const result=spawnSync('npm',args,{cwd:directory,stdio:'inherit'});
  if(result.error)throw result.error;
  if(result.status!==0){process.exitCode=result.status??1;break;}
  if(args[0]==='install'){
   const lock=JSON.parse(fs.readFileSync(path.join(directory,'package-lock.json')));
   const dependency=lock.packages?.[`node_modules/${library.name}`];
   if(dependency?.version!==library.version||dependency.integrity!==HLS_PIN.integrity)throw Error('Audit resolution differs from the reviewed vendored package');
  }
 }
}catch(error){console.error('Vendored dependency audit failed: '+error.message);process.exitCode=1}
finally{if(directory)fs.rmSync(directory,{recursive:true,force:true})}
