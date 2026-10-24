/** Reviewed API-regex inventory. This is routing drift detection, not a full JS parser
 * or proof of request/response schema parity. Unknown path-matcher constructs fail
 * closed. Updating the baseline requires reviewing current dispatch predicates.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';

const ROOT=path.resolve(import.meta.dirname,'..');
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
const HTTP=new Set(['GET','HEAD','POST','PUT','PATCH','DELETE','OPTIONS','TRACE','CONNECT']);
const stable=tokens=>tokens.map(token=>token.raw).join(' ');
function lex(source){
 const tokens=[];let i=0;
 const add=(type,start,end,value=source.slice(start,end))=>tokens.push({type,raw:source.slice(start,end),value,start,end});
 while(i<source.length){
  if(/\s/.test(source[i])){i++;continue}
  const start=i,c=source[i],next=source[i+1];
  if(c==='/'&&next==='/'){i=source.indexOf('\n',i+2);if(i<0)i=source.length;continue}
  if(c==='/'&&next==='*'){const end=source.indexOf('*/',i+2);if(end<0)throw Error('Unterminated source comment');i=end+2;continue}
  if(c==='\''||c==='"'||c==='`'){
   const quote=c;i++;let closed=false;
   while(i<source.length){if(source[i]==='\\'){i+=2;continue}if(source[i++]===quote){closed=true;break}}
   if(!closed)throw Error('Unterminated source string');
   const raw=source.slice(start,i);
   if(quote==='`'&&/\$\{[^}]*(?:\.match\s*\(|new\s+RegExp)/.test(raw))throw Error('Unsupported routing expression inside a template literal');
   add(quote==='`'?'template':'string',start,i,raw.slice(1,-1));continue;
  }
  const previous=tokens.at(-1);
  if(c==='/'&&(!previous||['(','[','=',':',',','!','?',';','{','}','&&','||','return','=>'].includes(previous.raw))){
   i++;let characterClass=false,closed=false;
   while(i<source.length){
    const ch=source[i++];if(ch==='\\'){i++;continue}if(ch==='[')characterClass=true;else if(ch===']')characterClass=false;
    else if(ch==='/'&&!characterClass){closed=true;break}
    else if(ch==='\n')throw Error('Unterminated regex literal');
   }
   if(!closed)throw Error('Unterminated regex literal');while(/[a-z]/i.test(source[i]||'')&&i<source.length)i++;
   add('regex',start,i);continue;
  }
  if(/[A-Za-z_$]/.test(c)){i++;while(/[A-Za-z0-9_$]/.test(source[i]||'')&&i<source.length)i++;add('identifier',start,i);continue}
  const operator=['===','!==','=>','==','!=','&&','||','?.','<=','>=','++','--'].find(op=>source.startsWith(op,i));
  i+=operator?.length||1;add('punct',start,i);
 }
 return tokens;
}
function balanced(tokens,start){
 if(tokens[start]?.raw!=='(')throw Error('Unsupported routing guard');let depth=0;
 for(let i=start;i<tokens.length;i++){if(tokens[i].raw==='(')depth++;if(tokens[i].raw===')'&&!--depth)return i;}
 throw Error('Unbalanced routing guard');
}
function regexFromLiteral(literal){
 const last=literal.lastIndexOf('/');const body=literal.slice(1,last),flags=literal.slice(last+1);
 if(/[gy]/.test(flags))throw Error('Stateful API regex requires explicit scanner support');
 return new RegExp(body,flags);
}
function walk(directory){return fs.readdirSync(directory,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?walk(path.join(directory,entry.name)):entry.name.endsWith('.js')?[path.join(directory,entry.name)]:[]).sort()}

export function inspectSource(source,file){
 const tokens=lex(source),matchers=[];
 const routingVariables=new Set(['p','method','m']);
 for(let i=0;i<tokens.length-4;i++){
  if(tokens[i].type==='identifier'&&tokens[i+1].raw==='='&&tokens[i+3]?.raw==='.'&&['pathname','method'].includes(tokens[i+4]?.raw))routingVariables.add(tokens[i].raw);
 }
 for(let i=0;i<tokens.length;i++){
  const token=tokens[i];if(token.type!=='regex'||!token.raw.toLowerCase().includes('api'))continue;
  const before=tokens.slice(Math.max(0,i-4),i),after=tokens.slice(i+1,i+6);
  const isMatch=before.at(-1)?.raw==='('&&before.at(-2)?.raw==='match'&&before.at(-3)?.raw==='.';
  const isTest=after[0]?.raw==='.'&&after[1]?.raw==='test'&&after[2]?.raw==='(';
  if(!isMatch&&!isTest)throw Error(`${file}: unsupported API regex dispatch (${token.raw})`);
  let binding=null;
  for(let j=i-1;j>=Math.max(0,i-12)&&tokens[j].raw!==';';j--){if(tokens[j].raw==='='&&tokens[j-1]?.type==='identifier'){binding=tokens[j-1].raw;break}}
  if(binding)routingVariables.add(binding);
  regexFromLiteral(token.raw);
  matchers.push({id:`${file}#${sha(token.raw).slice(0,16)}`,expression:token.raw,kind:isMatch?'match':'test',binding,line:source.slice(0,token.start).split('\n').length});
 }
 // Calls through a variable/computed expression could hide an added route. They
 // are unsupported rather than silently omitted from the inventory.
 for(let i=0;i<tokens.length-4;i++){
  if(routingVariables.has(tokens[i].raw)&&tokens[i+1].raw==='.'&&tokens[i+2].raw==='match'&&tokens[i+3].raw==='('&&(tokens[i+4].type!=='regex'||!tokens[i+4].raw.toLowerCase().includes('api')))throw Error(`${file}: unsupported computed or unclassified path matcher`);
  if(tokens[i].raw==='.'&&tokens[i+1].raw==='test'&&tokens[i+2].raw==='('&&tokens[i+4]?.raw===')'&&routingVariables.has(tokens[i+3]?.raw)&&(tokens[i-1]?.type!=='regex'||!tokens[i-1].raw.toLowerCase().includes('api')))throw Error(`${file}: unsupported indirect or unclassified path predicate`);
  if(tokens[i].raw==='switch'&&tokens[i+1].raw==='('&&routingVariables.has(tokens[i+2]?.raw))throw Error(`${file}: switch-based routing requires scanner support`);
 }
 if(new Set(matchers.map(m=>m.id)).size!==matchers.length)throw Error(`${file}: duplicate API regex must receive a scoped source review`);
 if(!matchers.length)return null;
 const predicates=[],methodExpressions=[],guards=[];
 for(let i=0;i<tokens.length;i++){
  if(tokens[i].raw==='if'&&tokens[i+1]?.raw==='('){
   const end=balanced(tokens,i+1),guard=tokens.slice(i+2,end);let bodyEnd=end+1;
   if(tokens[bodyEnd]?.raw==='{'){let depth=0;for(let j=bodyEnd;j<tokens.length;j++){if(tokens[j].raw==='{')depth++;else if(tokens[j].raw==='}'&&!--depth){bodyEnd=j;break}}}
   else{while(bodyEnd<tokens.length&&![';','}'].includes(tokens[bodyEnd].raw))bodyEnd++;}
   guards.push({start:i,bodyStart:end+1,bodyEnd,tokens:guard});
   if(guard.some(t=>t.type==='identifier'&&routingVariables.has(t.raw)))predicates.push(stable(guard));
  }
  if(tokens[i].type==='string'&&HTTP.has(tokens[i].value)&&['===','!==','==','!='].includes(tokens[i-1]?.raw))methodExpressions.push(stable(tokens.slice(Math.max(0,i-2),i+1)));
  if(tokens[i].raw==='['){const end=tokens.findIndex((t,j)=>j>i&&t.raw===']');if(end>i&&tokens.slice(i+1,end).some(t=>t.type==='string'&&HTTP.has(t.value)))methodExpressions.push(stable(tokens.slice(i,Math.min(tokens.length,end+6))));}
 }
 for(const matcher of matchers){
  const related=matcher.binding?guards.filter(g=>g.tokens.some(t=>t.type==='identifier'&&t.raw===matcher.binding)):[];
  const methodGuards=guards.filter(g=>related.some(parent=>g===parent||(g.start>parent.bodyStart&&g.start<parent.bodyEnd)));
  matcher.sourceMethods=[...new Set(methodGuards.flatMap(g=>g.tokens.filter(t=>t.type==='string'&&HTTP.has(t.value)).map(t=>t.value)))].sort();
 }
 const policy={aliases:[...routingVariables].sort(),matchers:matchers.map(({line,...m})=>m),predicates,methodExpressions};
 return {source:file,routePolicySha256:sha(JSON.stringify(policy)),matchers,predicates};
}
export function inspectProject(root=ROOT){return walk(path.join(root,'src')).map(file=>inspectSource(fs.readFileSync(file,'utf8'),path.relative(root,file).split(path.sep).join('/'))).filter(Boolean)}
// Keep checkpoint 39's inspectable source-audit report fields. Source inventory
// is written before contract validation so a partial/failed fixture still records
// the actual new matcher; it never grants approval to it.
export function sourceAudit(discovered,baseline){
 const matchers=discovered.flatMap(module=>module.matchers.map(m=>({file:module.source,expression:m.expression,line:m.line})))
  .sort((a,b)=>a.file.localeCompare(b.file)||a.expression.localeCompare(b.expression));
 const reviewed=baseline.modules.flatMap(module=>module.matchers.map(m=>({file:module.source,expression:m.expression})));
 const key=m=>`${m.file}\u0000${m.expression}`;
 const expected=new Set(reviewed.map(key)),current=new Set(matchers.map(key));
 return {format:'streamatlas-dynamic-route-source-audit-v1',totalCandidates:matchers.length,existingBaselineCount:reviewed.length,
  newOrModifiedMatchers:matchers.filter(m=>!expected.has(key(m))),removedOrModifiedMatchers:reviewed.filter(m=>!current.has(key(m))),matchers,
  caveat:'Source matcher inventory and explicit method/contract mappings detect reviewed routing drift. They do not prove complete typed schemas, runtime authorization, or arbitrary JavaScript routing semantics.'};
}
function validateOperation(spec,operation,matcher,errors){
 if(!operation||!HTTP.has(operation.method)||typeof operation.path!=='string'||!Array.isArray(operation.examples)||!operation.examples.length){errors.push(`${matcher.id}: malformed reviewed operation`);return}
 const op=spec.paths?.[operation.path]?.[operation.method.toLowerCase()];
 if(!op){errors.push(`${operation.method} ${operation.path}: missing OpenAPI operation`);return}
 const parameters=[...operation.path.matchAll(/\{([^}]+)\}/g)].map(m=>m[1]);
 for(const name of parameters)if(!op.parameters?.some(p=>p.in==='path'&&p.name===name&&p.required===true&&p.schema))errors.push(`${operation.path}: missing required path parameter ${name}`);
 const expression=regexFromLiteral(matcher.expression);
 for(const example of operation.examples){
  if(typeof example!=='string'||!expression.test(example))errors.push(`${matcher.id}: reviewed example does not match current API regex`);
  const template=new RegExp('^'+operation.path.replace(/[.*+?^$()|[\]\\]/g,'\\$&').replace(/\{[^}]+\}/g,'[^/]+')+'$');
  if(!template.test(example))errors.push(`${matcher.id}: example does not match mapped contract path ${operation.path}`);
 }
 if(!op.responses||!Object.keys(op.responses).some(code=>/^2\d\d$/.test(code)))errors.push(`${operation.path}: no success response contract`);
 const refs=[...JSON.stringify(op).matchAll(/"\$ref":"#\/components\/schemas\/([^"/]+)"/g)].map(m=>m[1]);
 for(const name of refs)if(!spec.components?.schemas?.[name])errors.push(`${operation.path}: missing component schema ${name}`);
}
export function verifyDynamicRoutes({root=ROOT,baseline,spec}={}){
 baseline??=JSON.parse(fs.readFileSync(path.join(root,'qa/dynamic-route-reviewed-baseline.json'),'utf8'));
 spec??=JSON.parse(fs.readFileSync(path.join(root,'contracts/openapi.json'),'utf8'));
 const discovered=inspectProject(root),errors=[],operations=new Set();
 if(baseline.format!=='streamatlas-dynamic-route-review-v1'||!Array.isArray(baseline.modules))throw Error('Invalid dynamic-route review baseline');
 const expected=new Map(baseline.modules.map(module=>[module.source,module]));
 if(expected.size!==baseline.modules.length)throw Error('Duplicate source module review');
 for(const current of discovered){
  const review=expected.get(current.source);expected.delete(current.source);
  if(!review){errors.push(`${current.source}: source module has unreviewed API regexes`);continue}
  if(current.routePolicySha256!==review.routePolicySha256)errors.push(`${current.source}: routing predicates/methods changed after source review`);
  if(!Array.isArray(review.matchers)||!review.reviewNote)throw Error(`Incomplete source review: ${current.source}`);
  const reviewedMatchers=new Map(review.matchers.map(m=>[m.id,m]));
  if(reviewedMatchers.size!==review.matchers.length)throw Error(`Duplicate matcher review: ${current.source}`);
  for(const matcher of current.matchers){
   const entry=reviewedMatchers.get(matcher.id);reviewedMatchers.delete(matcher.id);
   if(!entry){errors.push(`${matcher.id}: unreviewed API matcher`);continue}
   if(entry.expression!==matcher.expression||entry.kind!==matcher.kind||!entry.reviewNote)errors.push(`${matcher.id}: matcher review/provenance mismatch`);
   if(!['endpoint','access-policy','media-validation','shadow-path-validation'].includes(entry.role)){errors.push(`${matcher.id}: missing reviewed matcher role`);continue}
   if(entry.role==='endpoint'&&(!Array.isArray(entry.operations)||!entry.operations.length))errors.push(`${matcher.id}: endpoint matcher has no reviewed operations`);
   if(entry.role!=='endpoint'&&entry.operations?.length)errors.push(`${matcher.id}: policy matcher must not claim endpoint operations`);
   if(JSON.stringify(entry.sourceMethods)!==JSON.stringify(matcher.sourceMethods))errors.push(`${matcher.id}: reviewed source-method inference changed`);
   if(entry.role==='endpoint')for(const method of matcher.sourceMethods)if(!entry.operations?.some(operation=>operation.method===method))errors.push(`${matcher.id}: source method ${method} is missing from reviewed mappings`);
   for(const operation of entry.operations||[]){validateOperation(spec,operation,matcher,errors);operations.add(`${operation.method} ${operation.path}`)}
  }
  for(const id of reviewedMatchers.keys())errors.push(`${id}: reviewed matcher no longer exists`);
 }
 for(const source of expected.keys())errors.push(`${source}: reviewed API module no longer exists`);
 return {format:'streamatlas-dynamic-route-result-v1',sourceModules:discovered.length,regexMatchers:discovered.reduce((n,m)=>n+m.matchers.length,0),reviewedDynamicOperations:operations.size,errors,passed:errors.length===0,typedSchemaParityComplete:false,scope:'Explicit source review of API regex matchers and routing/method predicates. Broad response schemas and runtime authorization behavior still require separate behavioral/schema tests; this is not general JavaScript AST coverage.'};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const reportPath=path.join(ROOT,'qa/dynamic-route-report.json');let report;
 try{
  const baseline=JSON.parse(fs.readFileSync(path.join(ROOT,'qa/dynamic-route-reviewed-baseline.json'),'utf8'));
  report=sourceAudit(inspectProject(),baseline);
  fs.writeFileSync(reportPath,JSON.stringify(report,null,2)+'\n');
  for(const matcher of report.newOrModifiedMatchers)console.error(`Unreviewed API matcher ${matcher.file}:${matcher.line} ${matcher.expression}`);
  const result=verifyDynamicRoutes({baseline});
  report={...report,...result,format:report.format,reviewFormat:result.format};
  fs.writeFileSync(reportPath,JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(result,null,2));if(!result.passed)process.exitCode=1;
 }
 catch(error){
  if(report)fs.writeFileSync(reportPath,JSON.stringify({...report,passed:false,errors:[error.message]},null,2)+'\n');
  console.error(`Dynamic route review failed: ${error.message}`);process.exitCode=1;
 }
}
