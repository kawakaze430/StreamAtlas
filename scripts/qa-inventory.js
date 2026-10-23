/** Source-derived reproducible inventory: no database or private storage access. */
import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';
const root=path.resolve(import.meta.dirname,'..');
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
function paths(dir){return fs.readdirSync(path.join(root,dir),{withFileTypes:true}).flatMap(e=>e.isDirectory()?paths(`${dir}/${e.name}`):[`${dir}/${e.name}`]);}
const relevant=['src','public','scripts','migrations','backend-spring','deployment','tests','.github','qa','contracts','docs','AUDIT_AND_HANDOFF'].flatMap(d=>fs.existsSync(path.join(root,d))?paths(d):[]).filter(f=>!(/\/node_modules\/|\/\.terraform\/|\/target\/|\/__pycache__\//.test(f))).sort();
const files=[...relevant,'README.md','package.json','package-lock.json','.gitignore'].filter(f=>!['qa/inventory.json','qa/release-manifest.json'].includes(f)).filter(f=>fs.statSync(path.join(root,f)).isFile()).map(f=>({path:f,sha256:sha(fs.readFileSync(path.join(root,f))),bytes:fs.statSync(path.join(root,f)).size}));
const server=fs.readFileSync(path.join(root,'src/server.js'),'utf8');
const uploads=fs.readFileSync(path.join(root,'src/uploads.js'),'utf8');
const patterns=[...server.matchAll(/p\s*===\s*['"](\/api\/[^'"\s]+)['"]/g)].map(m=>m[1]);
const uploadPaths=[...uploads.matchAll(/['"](\/api\/(?:studio|admin|media)[^'" ]+)['"]/g)].map(m=>m[1]);
const dynamic=[...server.matchAll(/p\.match\((\/\^\\\/api\\\/[^;\n]+)/g)].map(m=>m[1].slice(0,150));
const pagePaths=[...server.matchAll(/['"](\/(?:categories|videos|models|sites|networks|channels|search|favorites|studio)[^'"\s]*)['"]/g)].map(m=>m[1]);
const tables=[...fs.readFileSync(path.join(root,'src/database.js'),'utf8').matchAll(/CREATE TABLE IF NOT EXISTS\s+([a-z_]+)/gi)].map(m=>m[1]);
const migrations=files.filter(f=>f.path.startsWith('migrations/postgresql/')).map(f=>({path:f.path,sha256:f.sha256}));
const assets=files.filter(f=>f.path.startsWith('public/assets/'));
const spec=JSON.parse(fs.readFileSync(path.join(root,'contracts/openapi.json'),'utf8'));
const inventory={format:'streamatlas-qa-inventory-v1',version:JSON.parse(fs.readFileSync(path.join(root,'package.json'))).version,root:'StreamAtlas',sourceFiles:files,sha256OfFileList:sha(JSON.stringify(files)),api:{literalPaths:[...new Set([...patterns,...uploadPaths])].sort(),dynamicRouteExpressions:[...new Set(dynamic)].sort(),contractOperations:Object.entries(spec.paths).flatMap(([p,obj])=>Object.keys(obj).map(method=>`${method.toUpperCase()} ${p}`))},schema:{sqliteTables:[...new Set(tables)].sort(),postgresMigrations:migrations},frontend:{routes:[...new Set(pagePaths)].sort(),assets:assets.length,assetBytes:assets.reduce((a,b)=>a+b.bytes,0)},riskFlags:['Node/SQLite primary runtime','Spring starter not cut over','Networked browser tests not fully verified','Public adult-content launch legally blocked','External vendor integration not certified','Cloud deployment not executed']};
const out=path.resolve(process.argv[2]||path.join(root,'qa/inventory.json'));
fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(inventory,null,2)+'\n');console.log(`Inventory: ${files.length} files, ${inventory.schema.sqliteTables.length} tables, ${inventory.api.literalPaths.length} static API paths, ${inventory.api.contractOperations.length} contracted operations -> ${out}`);
