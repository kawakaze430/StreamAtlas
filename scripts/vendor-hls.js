/** Verify/reproduce the reviewed self-hosted HLS client; never fetch code at runtime. */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(import.meta.dirname,'..');
const defaultVendor=path.join(root,'public/assets/vendor');
const manifestName='HLS-PROVENANCE.json';
export const HLS_PIN=Object.freeze({
 name:'hls.js',version:'1.7.3',license:'Apache-2.0',
 integrity:'sha512-MsPlx6yVW4Qv4C7mEVou4/gk/5cN2dVxOTnrNjPSmyH2f0Ln+/UkG10Ax1PE6OvrmTVPKgQYozTtBaPOuCzq7A==',
 packageJson:'bdcbb1e6ba4a7f643bc14494b1e9036792460561847696e0509688a27c5f7dad',
 artifacts:Object.freeze({
  'hls.min.js':'a12e7ee1cd64a69dcdb314157e45dafcba705bfb0b1440b7935cb265d374423e',
  'HLS-LICENSE.txt':'ca8773cf798c7ed997d4dd7c8e23c348699f8d5b7462636694cc14de6cda12db',
  'APACHE-2.0.txt':'cfc7749b96f63bd31c3c42b5c471bf756814053e847c10f3eb003417bc523d30'
 })
});
const registryKeyId='SHA256:DhQ8wR5APBvFHLF/+Tc+AYvPOdTpcIDqOhxsBHRwC7U';
const registryKey='MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEY6Ya7W++7aUPzvMTrezH6Ycx3c+HOKYCcNGybJZSCJq/fd7Qa8uuAKtdIkUQtQiEKERhAmE5lMMJhP8OkDOa2g==';
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');

function regularBytes(file){
 const stat=fs.lstatSync(file);
 if(!stat.isFile()||stat.isSymbolicLink())throw Error('Expected a regular vendor input: '+path.basename(file));
 return fs.readFileSync(file);
}
function assertHash(bytes,expected,label){
 if(sha(bytes)!==expected)throw Error('Reviewed HLS integrity mismatch: '+label);
}
function assertExpectedPin(expectedBundleSha256){
 if(expectedBundleSha256!==undefined&&(!/^[a-f0-9]{64}$/i.test(expectedBundleSha256)||expectedBundleSha256.toLowerCase()!==HLS_PIN.artifacts['hls.min.js']))throw Error('SA_HLS_BUNDLE_SHA256 / --expected-sha must match the reviewed production HLS pin');
}
function provenanceAt(vendorDir){
 const bytes=regularBytes(path.join(vendorDir,manifestName));
 const manifest=JSON.parse(bytes);
 if(manifest.format!=='streamatlas-vendored-library-v1'||manifest.name!==HLS_PIN.name||manifest.version!==HLS_PIN.version||manifest.license!==HLS_PIN.license)throw Error('Unexpected HLS provenance identity');
 if(manifest.upstream?.metadataUrl!=='https://registry.npmjs.org/hls.js/1.7.3'||manifest.upstream?.tarballUrl!=='https://registry.npmjs.org/hls.js/-/hls.js-1.7.3.tgz'||manifest.upstream?.integrity!==HLS_PIN.integrity||manifest.sourcePackageJsonSha256!==HLS_PIN.packageJson)throw Error('Unexpected HLS upstream provenance');
 const names=Object.keys(HLS_PIN.artifacts);
 if(!manifest.artifacts||Object.keys(manifest.artifacts).length!==names.length)throw Error('Incomplete HLS artifact provenance');
 for(const name of names){
  const item=manifest.artifacts[name];
  if(item?.sha256!==HLS_PIN.artifacts[name]||!Number.isSafeInteger(item.bytes)||item.bytes<=0)throw Error('Unexpected HLS artifact provenance: '+name);
 }
 const verification=manifest.registryVerification;
 const message=`${HLS_PIN.name}@${HLS_PIN.version}:${HLS_PIN.integrity}`;
 if(verification?.keyId!==registryKeyId||verification.publicKeyDerBase64!==registryKey||verification.message!==message||!Array.isArray(verification.signatures))throw Error('Unexpected npm registry signature metadata');
 const key=crypto.createPublicKey({key:Buffer.from(registryKey,'base64'),format:'der',type:'spki'});
 if(!verification.signatures.some(signature=>typeof signature==='string'&&crypto.verify('sha256',Buffer.from(message),key,Buffer.from(signature,'base64'))))throw Error('Invalid npm registry signature');
 return {manifest,bytes};
}

export function verifyVendored({vendorDir=defaultVendor,expectedBundleSha256=process.env.SA_HLS_BUNDLE_SHA256}={}){
 assertExpectedPin(process.env.SA_HLS_BUNDLE_SHA256);
 assertExpectedPin(expectedBundleSha256);
 const {manifest}=provenanceAt(vendorDir);
 for(const [name,digest] of Object.entries(HLS_PIN.artifacts)){
  const bytes=regularBytes(path.join(vendorDir,name));
  assertHash(bytes,digest,name);
  if(bytes.length!==manifest.artifacts[name].bytes)throw Error('HLS artifact byte count mismatch: '+name);
 }
 return {name:HLS_PIN.name,version:HLS_PIN.version,license:HLS_PIN.license,sha256:HLS_PIN.artifacts['hls.min.js'],registrySignatureVerified:true};
}

export function vendorHls({packageDir=path.join(root,'node_modules/hls.js'),vendorDir=defaultVendor,expectedBundleSha256=process.env.SA_HLS_BUNDLE_SHA256}={}){
 // The committed review pins came from the registry-signed, SHA-512-verified
 // tarball. An installed package must reproduce those exact bytes, not just
 // declare the expected version in mutable package.json metadata.
 // Preserve the reviewed-hash installer interface without letting an arbitrary
 // caller-provided digest replace the production pin. Generic synthetic
 // installer fixtures remain in src/roadmap44-vendor.js.
 assertExpectedPin(process.env.SA_HLS_BUNDLE_SHA256);
 assertExpectedPin(expectedBundleSha256);
 const provenance=provenanceAt(defaultVendor);
 const packageBytes=regularBytes(path.join(packageDir,'package.json'));
 const pkg=JSON.parse(packageBytes);
 if(pkg.name!==HLS_PIN.name||pkg.version!==HLS_PIN.version||pkg.license!==HLS_PIN.license)throw Error(`Expected reviewed hls.js@${HLS_PIN.version} with Apache-2.0 license`);
 assertHash(packageBytes,HLS_PIN.packageJson,'package.json');
 const outputs={
  'hls.min.js':regularBytes(path.join(packageDir,'dist/hls.min.js')),
  'HLS-LICENSE.txt':regularBytes(path.join(packageDir,'LICENSE')),
  'APACHE-2.0.txt':regularBytes(path.join(defaultVendor,'APACHE-2.0.txt'))
 };
 // Validate the entire input set before publishing any file.
 for(const [name,bytes] of Object.entries(outputs))assertHash(bytes,HLS_PIN.artifacts[name],name);
 outputs[manifestName]=provenance.bytes;
 if(fs.existsSync(vendorDir)&&!fs.lstatSync(vendorDir).isDirectory())throw Error('Vendor destination must be a regular directory');
 fs.mkdirSync(vendorDir,{recursive:true});
 for(const [name,bytes] of Object.entries(outputs)){
  const destination=path.join(vendorDir,name);
  if(fs.existsSync(destination)&&!regularBytes(destination).equals(bytes))throw Error('Refusing to overwrite changed vendor artifact: '+name);
 }
 for(const [name,bytes] of Object.entries(outputs)){
  const destination=path.join(vendorDir,name);
  if(fs.existsSync(destination))continue; // Repeating a verified installation is a no-op.
  fs.writeFileSync(destination,bytes,{flag:'wx',mode:0o644});
 }
 return verifyVendored({vendorDir,expectedBundleSha256});
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  let verify=false,source,output,expectedBundleSha256;
  const args=process.argv.slice(2);
  for(let index=0;index<args.length;index++){
   if(args[index]==='--verify')verify=true;
   else if(args[index]==='--source'&&args[index+1])source=args[++index];
   else if(args[index]==='--output'&&args[index+1])output=args[++index];
   else if(args[index]==='--expected-sha'&&args[index+1])expectedBundleSha256=args[++index];
   else throw Error('Usage: node scripts/vendor-hls.js [--source PACKAGE_DIRECTORY] [--output DIRECTORY] [--expected-sha SHA256] | --verify [--output DIRECTORY]');
  }
  if(verify&&source)throw Error('--verify does not install a source package');
  if(verify&&expectedBundleSha256)throw Error('--verify uses the committed production pin');
  const options={...(source?{packageDir:path.resolve(source)}:{}),...(output?{vendorDir:path.resolve(output)}:{}),...(expectedBundleSha256?{expectedBundleSha256}:{})};
  const result=verify?verifyVendored(options):vendorHls(options);
  console.log(JSON.stringify(result,null,2));
 }catch(error){console.error('HLS vendor verification failed: '+error.message);process.exitCode=1;}
}
