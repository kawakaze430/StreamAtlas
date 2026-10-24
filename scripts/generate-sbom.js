/** Minimal CycloneDX 1.5 application/package inventory (not a CVE scan). */
import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';
import {verifyVendored} from './vendor-hls.js';
const root=path.resolve(import.meta.dirname,'..');
export function buildSbom(pkg,lock,vendored=[]){
 const dependencies=Object.entries(lock?.packages||{}).filter(([name,info])=>name&&info.version).map(([name,info])=>({type:'library',name:name.replace(/^node_modules\//,''),version:info.version,purl:`pkg:npm/${encodeURIComponent(name.replace(/^node_modules\//,''))}@${info.version}`}));
 for(const library of vendored){
  const component={type:'library',name:library.name,version:library.version,purl:`pkg:npm/${encodeURIComponent(library.name)}@${library.version}`,licenses:[{license:{id:library.license}}],hashes:[{alg:'SHA-256',content:library.sha256}],properties:[{name:'streamatlas:delivery',value:'verified vendored JavaScript; root npm audit does not inspect this bundle'}]};
  const existing=dependencies.findIndex(item=>item.purl===component.purl);
  if(existing===-1)dependencies.push(component);else dependencies[existing]={...dependencies[existing],...component};
 }
 return {bomFormat:'CycloneDX',specVersion:'1.5',version:1,metadata:{component:{type:'application',name:pkg.name,version:pkg.version,purl:`pkg:npm/${pkg.name}@${pkg.version}`},properties:[{name:'streamatlas:scope',value:'package-lock and verified vendored JavaScript metadata; no native/OS/container dependency audit'}]},components:dependencies};
}
if(process.argv[1]&&import.meta.url===new URL('file://'+process.argv[1]).href){
 const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'))),lockPath=path.join(root,'package-lock.json');
 const lock=fs.existsSync(lockPath)?JSON.parse(fs.readFileSync(lockPath)):{};
 const vendorDir=path.join(root,'public/assets/vendor');
 const hasVendor=fs.existsSync(path.join(vendorDir,'HLS-PROVENANCE.json'))||fs.existsSync(path.join(vendorDir,'hls.min.js'));
 const vendored=hasVendor?[verifyVendored({vendorDir})]:[];
 const sbom=buildSbom(pkg,lock,vendored);const output=process.argv[2]?path.resolve(process.argv[2]):path.join(root,'qa/sbom.cdx.json');
 fs.writeFileSync(output,JSON.stringify(sbom,null,2)+'\n');
 console.log(`Generated metadata-only SBOM: ${output} (${sbom.components.length} third-party components, ${vendored.length} verified vendored)`);
}
