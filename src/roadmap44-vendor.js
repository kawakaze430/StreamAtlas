/** Offline artifact integrity for reviewed Apache-2.0 HLS.js UMD bundle.
 * Refuse untrusted sources or licenses; no remote network, npm install or CDN fallback.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
const HEX=/^[a-f0-9]{64}$/i;
export function auditHlsVendorFiles({bundle,license,packageManifest,expectedBundleSha256,version='1.7.3'}={}){
 if(!Buffer.isBuffer(bundle)||bundle.length<10000||bundle.length>4_000_000||typeof license!=='string'||!license.includes('Apache License')||!license.includes('Version 2.0')||!packageManifest||packageManifest.name!=='hls.js'||packageManifest.version!==version||packageManifest.license!=='Apache-2.0'||!HEX.test(expectedBundleSha256||''))throw Error('UNREVIEWED_HLS_VENDOR');
 const actual=crypto.createHash('sha256').update(bundle).digest('hex');if(actual!==expectedBundleSha256.toLowerCase())throw Error('HLS_ARTIFACT_DIGEST_MISMATCH');
 return {version,license:'Apache-2.0',actualBundleSha256:actual,bytes:bundle.length,verified:true,securityReviewComplete:false};
}
export function verifiedVendorInstall({packageDir,destination,expectedBundleSha256,version='1.7.3'}={}){
 if(typeof packageDir!=='string'||typeof destination!=='string'||!path.isAbsolute(packageDir)||!path.isAbsolute(destination))throw Error('ABSOLUTE_PATHS_REQUIRED');
 const src=path.join(packageDir,'dist','hls.min.js'),lic=path.join(packageDir,'LICENSE'),manifest=path.join(packageDir,'package.json');
 for(const file of [src,lic,manifest]){const stat=fs.lstatSync(file);if(!stat.isFile())throw Error('UNSAFE_VENDOR_INPUT')}
 if(fs.existsSync(destination)&&!fs.lstatSync(destination).isDirectory())throw Error('UNSAFE_VENDOR_OUTPUT');
 const binary=fs.readFileSync(src),copyright=fs.readFileSync(lic,'utf8'),pkg=JSON.parse(fs.readFileSync(manifest,'utf8'));
 const result=auditHlsVendorFiles({bundle:binary,license:copyright,packageManifest:pkg,expectedBundleSha256,version});
 fs.mkdirSync(destination,{recursive:true});fs.writeFileSync(path.join(destination,'hls.min.js'),binary,{flag:'wx',mode:0o644});fs.writeFileSync(path.join(destination,'HLS-LICENSE.txt'),copyright,{flag:'wx',mode:0o644});fs.writeFileSync(path.join(destination,'HLS-REVIEW.json'),JSON.stringify({...result,publicLaunchApproved:false,reviewedAt:null},null,2)+'\n',{flag:'wx'});
 return result;
}
