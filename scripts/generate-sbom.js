/** Minimal CycloneDX 1.5 application/package inventory (not a CVE scan). */
import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';
const root=path.resolve(import.meta.dirname,'..');
export function buildSbom(pkg,lock){
 const dependencies=Object.entries(lock?.packages||{}).filter(([name,info])=>name&&info.version).map(([name,info])=>({type:'library',name:name.replace(/^node_modules\//,''),version:info.version,purl:`pkg:npm/${encodeURIComponent(name.replace(/^node_modules\//,''))}@${info.version}`}));
 return {bomFormat:'CycloneDX',specVersion:'1.5',version:1,metadata:{component:{type:'application',name:pkg.name,version:pkg.version,purl:`pkg:npm/${pkg.name}@${pkg.version}`},properties:[{name:'streamatlas:scope',value:'package-lock metadata only; no native/OS/container dependency audit'}]},components:dependencies};
}
if(process.argv[1]&&import.meta.url===new URL('file://'+process.argv[1]).href){
 const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'))),lockPath=path.join(root,'package-lock.json');
 const lock=fs.existsSync(lockPath)?JSON.parse(fs.readFileSync(lockPath)):{};
 const sbom=buildSbom(pkg,lock);const output=process.argv[2]?path.resolve(process.argv[2]):path.join(root,'qa/sbom.cdx.json');
 fs.writeFileSync(output,JSON.stringify(sbom,null,2)+'\n');
 console.log(`Generated metadata-only SBOM: ${output} (${sbom.components.length} locked third-party packages)`);
}
