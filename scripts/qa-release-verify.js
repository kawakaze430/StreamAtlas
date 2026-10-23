import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';
const root=path.resolve(import.meta.dirname,'..'),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const i=JSON.parse(fs.readFileSync(path.join(root,'qa/inventory.json'))),r=JSON.parse(fs.readFileSync(path.join(root,'qa/release-manifest.json')));
if(i.sourceFiles.length!==r.fileCount)throw Error('Release file count mismatch');
for(const f of i.sourceFiles){const filepath=path.join(root,f.path);if(!fs.existsSync(filepath)||sha(fs.readFileSync(filepath))!==f.sha256)throw Error('Source integrity mismatch: '+f.path)}
if(sha(JSON.stringify(i.sourceFiles))!==r.sourceDigest)throw Error('Source manifest digest mismatch');
if(sha(fs.readFileSync(path.join(root,'contracts/openapi.json')))!==r.contractsDigest)throw Error('Contract integrity mismatch');
console.log(`Release verification passed: ${r.version}, ${r.fileCount} files, ${r.sourceDigest}`);
