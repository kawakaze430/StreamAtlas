import fs from 'node:fs';import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');const server=fs.readFileSync(path.join(root,'src/server.js'),'utf8');const upload=fs.readFileSync(path.join(root,'src/uploads.js'),'utf8');
const modules=['src/studio-operations.js','src/discovery.js','src/compliance-operations.js','src/roadmap32.js','src/operational-controls34.js'];
const operations=[];
for(const [src,contents] of [['src/server.js',server],['src/uploads.js',upload],...modules.map(file=>[file,fs.readFileSync(path.join(root,file),'utf8')])]){
 for(const [i,line] of contents.split('\n').entries()){
  for(const m of line.matchAll(/(?:method|m)\s*===\s*['"](GET|POST|PUT|PATCH|DELETE|HEAD)['"]\s*&&\s*p\s*===\s*['"](\/api\/[^'"\s]+)['"]/g))operations.push({method:m[1],path:m[2],source:src,line:i+1});
 }
}
const spec=JSON.parse(fs.readFileSync(path.join(root,'contracts/openapi.json'),'utf8'));
const reviewed=new Set(Object.entries(spec.paths).flatMap(([p,methods])=>Object.keys(methods).map(method=>`${method.toUpperCase()} ${p}`)));
const unique=[...new Map(operations.map(o=>[`${o.method} ${o.path}`,o])).values()].sort((a,b)=>a.path.localeCompare(b.path)||a.method.localeCompare(b.method));
const pending=unique.filter(o=>!reviewed.has(`${o.method} ${o.path}`));
const results={staticDiscoveredOperations:unique.length,reviewedOperations:reviewed.size,staticUndocumented:pending.length,undocumented:pending,note:'Dynamic regex routes and upload patterns need manual review and are not fully analyzed by literal matching.'};
fs.writeFileSync(path.join(root,'qa/contract-gap-report.json'),JSON.stringify(results,null,2)+'\n');
console.log(`Static API routes: ${unique.length}; OpenAPI operations: ${reviewed.size}; static routes without reviewed contract: ${pending.length}`);
if(process.argv.includes('--strict') && pending.length){console.error('Unreviewed literal API routes:',pending.map(p=>`${p.method} ${p.path} (${p.source}:${p.line})`).join('\n'));process.exitCode=1;}
if(!reviewed.has('GET /api/health')||!reviewed.has('GET /api/videos')||!reviewed.has('POST /api/auth/login'))throw Error('Critical contract regression');
