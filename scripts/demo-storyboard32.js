#!/usr/bin/env node
/** Creates a storyboard only from bundled synthetic sample clips; NEVER accepts arbitrary user media. */
import fs from 'node:fs';import path from 'node:path';import os from 'node:os';
import {spawnSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export function sampleSource(name){
 if(!/^sample-[1-4]$/.test(name))throw Error('Only bundled synthetic sample-1 through sample-4 are accepted');
 const source=path.join(root,'public','assets','videos',name+'.mp4');
 if(!fs.statSync(source,{throwIfNoEntry:false})?.isFile()||fs.lstatSync(source).isSymbolicLink())throw Error('Bundled sample unavailable');
 return source;
}
export function storyboard(name,outputDir){
 const source=sampleSource(name),directory=path.resolve(outputDir);
 fs.mkdirSync(directory,{recursive:true,mode:0o700});
 if(fs.lstatSync(directory).isSymbolicLink())throw Error('Output cannot be a symlink');
 const target=path.join(directory,name+'-%02d.jpg');
 const proc=spawnSync('ffmpeg',['-hide_banner','-loglevel','error','-nostdin','-y','-i',source,'-vf','fps=1/2,scale=240:-2','-frames:v','4',target],{timeout:30000,encoding:'utf8'});
 if(proc.status!==0)throw Error('FFmpeg storyboard failure: '+(proc.stderr||proc.error?.message||'Unknown error').slice(0,250));
 const files=fs.readdirSync(directory).filter(n=>new RegExp('^'+name+'-\\d\\d\\.jpg$').test(n)).sort();
 return {sample:name,files,syntheticOnly:true,outputDirectory:directory};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const result=storyboard(process.argv[2]||'sample-1',process.argv[3]||fs.mkdtempSync(path.join(os.tmpdir(),'sa-storyboard-')));
 console.log(JSON.stringify(result,null,2));
}
