/** Static gap inventory, NOT a behavioral or authorization parity test. */
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export function inspect(){
 const spec=JSON.parse(fs.readFileSync(path.join(root,'contracts/openapi.json'),'utf8'));
 const java=fs.readFileSync(path.join(root,'backend-spring/src/main/java/example/streamatlas/catalog/CatalogController.java'),'utf8');
 const prefix=java.match(/@RequestMapping\("([^"]+)"\)/)?.[1]||'';
 const spring=[...java.matchAll(/@(Get|Post|Put|Delete|Patch)Mapping\("([^"]+)"\)/g)].map(m=>`${m[1].toUpperCase()} ${prefix}${m[2]}`);
 const node=Object.entries(spec.paths).flatMap(([p,methods])=>Object.keys(methods).filter(k=>['get','post','put','delete','patch'].includes(k)).map(k=>`${k.toUpperCase()} ${p}`));
 const springSet=new Set(spring);
 return {format:'streamatlas-spring-static-parity-gap-v1',nodeContractOperations:node.length,springOperations:spring.length,matchingOperations:node.filter(x=>springSet.has(x)),unimplementedNodeOperations:node.filter(x=>!springSet.has(x)),springRoutes:spring,authAndUploadParityVerified:false,behavioralParityVerified:false,readyForCutover:false};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))console.log(JSON.stringify(inspect(),null,2));
