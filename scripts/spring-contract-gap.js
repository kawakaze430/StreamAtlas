/** Static gap inventory, NOT a behavioral or authorization parity test. */
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
// Preserve offsets while masking comments and Java literals. Annotation-looking
// text in a comment or response string must not become an inventoried endpoint.
function codeMask(java){
 return java.replace(/\/\*[\s\S]*?\*\/|\/\/[^\r\n]*|"""[\s\S]*?"""|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/g,
  text=>text.replace(/[^\r\n]/g,' '));
}
function controllerRoutes(java,file){
 const mask=codeMask(java),classOffset=mask.search(/\b(?:class|record|interface|enum)\s+\w+/);
 if(classOffset<0)throw new Error(`No top-level Spring controller declaration in ${file}`);
 const annotations=[];
 for(const match of mask.matchAll(/@(Request|Get|Head|Post|Put|Delete|Patch|Options)Mapping\b/g)){
  let end=match.index+match[0].length;
  while(/\s/.test(mask[end]||'')&&end<mask.length)end++;
  let argument='';
  if(mask[end]==='('){
   const start=++end;let depth=1;
   while(end<mask.length&&depth){if(mask[end]==='(')depth++;if(mask[end]===')')depth--;end++;}
   if(depth)throw new Error(`Unclosed Spring mapping in ${file}`);
   argument=java.slice(start,end-1).trim();
  }
  const literal=argument.match(/^(?:(?:value|path)\s*=\s*)?"([^"\\]*)"$/);
  if(argument&&!literal)throw new Error(`Unsupported nonliteral Spring mapping in ${file}; static inventory requires one literal path`);
  const route=literal?.[1]||'';
  if(route&&!route.startsWith('/'))throw new Error(`Unsupported relative Spring mapping in ${file}`);
  annotations.push({kind:match[1],route,classMapping:match.index<classOffset});
 }
 const prefixes=annotations.filter(a=>a.classMapping);
 if(prefixes.length>1||prefixes.some(a=>a.kind!=='Request'))throw new Error(`Unsupported class mapping in ${file}`);
 const prefix=prefixes[0]?.route||'';
 return annotations.filter(a=>!a.classMapping).map(a=>{
  if(a.kind==='Request')throw new Error(`Unsupported method RequestMapping in ${file}; use an explicit typed mapping for this static inventory`);
  return `${a.kind.toUpperCase()} ${prefix}${a.route}`;
 });
}
export function inspect({repoRoot=root}={}){
 const spec=JSON.parse(fs.readFileSync(path.join(repoRoot,'contracts/openapi.json'),'utf8'));
 const directory=path.join(repoRoot,'backend-spring/src/main/java/example/streamatlas/catalog');
 const controllers=fs.readdirSync(directory,{withFileTypes:true})
  .filter(file=>file.isFile()&&file.name.endsWith('Controller.java')).map(file=>file.name).sort();
 const spring=[...new Set(controllers.flatMap(file=>controllerRoutes(fs.readFileSync(path.join(directory,file),'utf8'),file)))];
 const node=Object.entries(spec.paths).flatMap(([p,methods])=>Object.keys(methods).filter(k=>['get','post','put','delete','patch'].includes(k)).map(k=>`${k.toUpperCase()} ${p}`));
 const springSet=new Set(spring);
 return {format:'streamatlas-spring-static-parity-gap-v1',sourceScope:'Top-level *Controller.java in the catalog package; literal class RequestMapping prefixes and typed method mappings only; no inherited, composed or behavioral mapping analysis',controllerFiles:controllers,nodeContractOperations:node.length,springOperations:spring.length,matchingOperations:node.filter(x=>springSet.has(x)),unimplementedNodeOperations:node.filter(x=>!springSet.has(x)),springRoutes:spring,authAndUploadParityVerified:false,behavioralParityVerified:false,readyForCutover:false};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))console.log(JSON.stringify(inspect(),null,2));
