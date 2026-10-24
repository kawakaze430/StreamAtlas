/** Explicit synthetic-only operator command. JSON output contains no HTTP bodies. */
import {executeShadowReads} from '../src/shadow-read.js';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
function sourceMetadata(){
 const root=path.resolve(import.meta.dirname,'..');
 const revision=spawnSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8',timeout:5000});
 const changes=spawnSync('git',['status','--porcelain','--untracked-files=no'],{cwd:root,encoding:'utf8',timeout:5000});
 const candidate=revision.status===0?revision.stdout.trim():process.env.GITHUB_SHA;
 return {commit:typeof candidate==='string'&&/^[a-f0-9]{40}$/.test(candidate)?candidate:null,
  node:process.version,trackedWorktreeDirty:changes.status===0?Boolean(changes.stdout.trim()):null};
}
const args=process.argv.slice(2);
if(args.length===1&&args[0]==='--help'){
 console.log('node scripts/shadow-read.js --node http://127.0.0.1:PORT --spring http://127.0.0.1:PORT [--path "GET /api/auth/me"]');
 console.log('Requires SA_SHADOW_READ_ACK=YES and SA_SHADOW_SYNTHETIC_ONLY=YES. Optional SA_SHADOW_COOKIE supplies one synthetic sa_session cookie; never pass credentials in arguments.');
}else{
 try{
  const values=new Map(),paths=[];
  for(let i=0;i<args.length;i+=2){
   const key=args[i],value=args[i+1];
   if(!['--node','--spring','--path'].includes(key)||!value||(key!=='--path'&&values.has(key)))throw Error('INVALID_SHADOW_OPTION');
   if(key==='--path')paths.push(value);else values.set(key,value);
  }
  const result=await executeShadowReads({nodeOrigin:values.get('--node')||process.env.SA_SHADOW_NODE_URL,
   springOrigin:values.get('--spring')||process.env.SA_SHADOW_SPRING_URL,
   ...(paths.length?{paths}:{}),cookie:process.env.SA_SHADOW_COOKIE||'',
   acknowledgeReadOnly:process.env.SA_SHADOW_READ_ACK==='YES',syntheticOnly:process.env.SA_SHADOW_SYNTHETIC_ONLY==='YES'});
  console.log(JSON.stringify({...result,runtime:sourceMetadata()},null,2));
  if(result.status!=='PASS')process.exitCode=1;
 }catch(error){
  // Do not echo arbitrary inputs, cookie values or captured response bodies.
  console.error(JSON.stringify({format:'streamatlas-loopback-shadow-error-v1',error:error.code||'SHADOW_CONFIGURATION_FAILED',cutoverApproved:false}));
  process.exitCode=2;
 }
}
