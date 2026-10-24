/** Offline operator design tool. Does not create uploads or contact a provider. */
import {planMultipartUpload} from '../src/multipart-contract.js';

const args=process.argv.slice(2);
if(args.length===1&&args[0]==='--help'){
 console.log('node scripts/plan-multipart-upload.js --owner ID --upload UUID --bytes SIZE [--part-bytes SIZE] [--sha256 HEX]');
}else{
 try{
  const fields=new Map();
  for(let i=0;i<args.length;i+=2){
   if(!['--owner','--upload','--bytes','--part-bytes','--sha256'].includes(args[i])||!args[i+1]||fields.has(args[i]))throw Error('Unknown, duplicate or incomplete option; use --help');
   fields.set(args[i],args[i+1]);
  }
  const plan=planMultipartUpload({ownerId:Number(fields.get('--owner')),uploadId:fields.get('--upload'),expectedBytes:Number(fields.get('--bytes')),partBytes:fields.has('--part-bytes')?Number(fields.get('--part-bytes')):undefined,expectedWholeFileSha256:fields.get('--sha256')??null});
  console.log(JSON.stringify(plan,null,2));
 }catch(error){console.error('Multipart plan rejected: '+error.message);process.exitCode=1}
}
