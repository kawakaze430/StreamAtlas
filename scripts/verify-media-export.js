/** Fail if staged approved media is missing, modified, or contains unexpected files. */
import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';
const root=path.resolve(process.argv[2]||'');
if(!process.argv[2]||!path.isAbsolute(process.argv[2]))throw Error('Supply an absolute export directory');
const manifest=JSON.parse(fs.readFileSync(path.join(root,'manifest.json'),'utf8'));
if(manifest.version!==1||!Array.isArray(manifest.assets)||manifest.files!==manifest.assets.length)throw Error('Invalid manifest');
let total=0;const seen=new Set();
for(const asset of manifest.assets){
 if(typeof asset.key!=='string'||!/^media\/[a-f0-9-]{36}\/(?:master|hi|lo)\.m3u8$|^media\/[a-f0-9-]{36}\/(?:playback|low)\.mp4$|^media\/[a-f0-9-]{36}\/poster\.jpg$|^media\/[a-f0-9-]{36}\/(?:hi|lo)_seg_\d{3}\.ts$/.test(asset.key)||seen.has(asset.key))throw Error('Invalid or repeated object key');
 seen.add(asset.key);
 const file=path.join(root,...asset.key.split('/')),stat=fs.lstatSync(file);
 if(!stat.isFile()||stat.isSymbolicLink()||stat.size!==asset.bytes)throw Error('Size/type mismatch: '+asset.key);
 const hash=crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
 if(hash!==asset.sha256)throw Error('Checksum mismatch: '+asset.key);total+=stat.size;
}
function traverse(dir){for(const ent of fs.readdirSync(dir,{withFileTypes:true})){
 const full=path.join(dir,ent.name);if(ent.isSymbolicLink())throw Error('Unexpected symlink');
 if(ent.isDirectory())traverse(full);else if(ent.isFile()&&!seen.has(path.relative(root,full).replaceAll(path.sep,'/')))throw Error('Unexpected staged file');
}}
if(fs.existsSync(path.join(root,'media')))traverse(path.join(root,'media'));
if(total!==manifest.totalBytes)throw Error('Total bytes mismatch');
console.log(`Verified ${seen.size} files (${total} bytes). No cloud upload performed.`);
