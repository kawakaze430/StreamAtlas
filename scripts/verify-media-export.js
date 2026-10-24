/** Offline reconciliation: every private staged asset and HLS dependency must agree
 * with the v2 manifest, and extra staged objects are rejected. No cloud calls. */
import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';
import {parseMediaExportKey,validateMediaExportGraph,MAX_MEDIA_OBJECT_BYTES} from '../src/media-export-validation.js';
const root=path.resolve(process.argv[2]||'');
if(!process.argv[2]||!path.isAbsolute(process.argv[2]))throw Error('Supply an absolute export directory');
if(!fs.lstatSync(root,{throwIfNoEntry:false})?.isDirectory())throw Error('Unsafe or absent export folder');
const manifestFile=path.join(root,'manifest.json');
if(!fs.lstatSync(manifestFile,{throwIfNoEntry:false})?.isFile())throw Error('Manifest must be a regular private file');
const mediaRoot=path.join(root,'media');
if(fs.existsSync(mediaRoot)&&!fs.lstatSync(mediaRoot).isDirectory())throw Error('Export media root must be a regular directory');
const manifest=JSON.parse(fs.readFileSync(manifestFile,'utf8'));
if(manifest.version!==2||manifest.productionApproval!==false||!Array.isArray(manifest.assets)||!Array.isArray(manifest.videoRecords)||
 manifest.files!==manifest.assets.length||manifest.videos!==manifest.videoRecords.length)throw Error('Unsupported or invalid private media export manifest');
let total=0;const seen=new Set(),grouped=new Map(),expectedRecords=new Map();
for(const record of manifest.videoRecords){
 if(!record||typeof record.uploadId!=='string'||!Number.isSafeInteger(record.videoId)||record.videoId<1||
 typeof record.slug!=='string'||!Number.isInteger(record.renditions)||!Number.isInteger(record.segments)||expectedRecords.has(record.uploadId))throw Error('Invalid video record');
 expectedRecords.set(record.uploadId,record);
}
for(const asset of manifest.assets){
 const parsed=parseMediaExportKey(asset?.key);
 if(!parsed||seen.has(asset.key)||!Number.isSafeInteger(asset.bytes)||asset.bytes<0||asset.bytes>MAX_MEDIA_OBJECT_BYTES||
 typeof asset.sha256!=='string'||!/^[a-f0-9]{64}$/.test(asset.sha256))throw Error('Invalid or repeated media object key or digest');
 const record=expectedRecords.get(parsed.uploadId);
 if(!record||record.videoId!==asset.videoId||record.slug!==asset.slug)throw Error('Unmatched video record');
 seen.add(asset.key);
 const file=path.join(root,...asset.key.split('/'));
 const parent=fs.lstatSync(path.dirname(file),{throwIfNoEntry:false});const stat=fs.lstatSync(file,{throwIfNoEntry:false});
 if(!parent?.isDirectory()||!stat?.isFile()||stat.size!==asset.bytes)throw Error('Size/type mismatch: '+asset.key);
 const data=fs.readFileSync(file);const hash=crypto.createHash('sha256').update(data).digest('hex');
 if(hash!==asset.sha256)throw Error('Checksum mismatch: '+asset.key);
 const variants=grouped.get(parsed.uploadId)||new Map();variants.set(parsed.name,data);grouped.set(parsed.uploadId,variants);
 total+=data.length;
}
if(grouped.size!==expectedRecords.size)throw Error('Missing video records');
for(const [id,rec] of expectedRecords){
 const variants=grouped.get(id);
 if(!variants)throw Error('Unrepresented media: '+id);
 const actual=validateMediaExportGraph(variants,{readText:name=>variants.get(name)?.toString('utf8')});
 if(actual.renditions!==rec.renditions||actual.segments!==rec.segments)throw Error('HLS graph mismatch: '+id);
}
function traverse(dir){for(const ent of fs.readdirSync(dir,{withFileTypes:true})){
 const full=path.join(dir,ent.name);
 if(ent.isSymbolicLink())throw Error('Unexpected staged symlink');
 if(ent.isDirectory())traverse(full);
 else if(!ent.isFile()||!seen.has(path.relative(root,full).replaceAll(path.sep,'/')))throw Error('Unexpected staged file');
}}
if(fs.existsSync(mediaRoot))traverse(mediaRoot);
if(total!==manifest.totalBytes)throw Error('Total bytes mismatch');
console.log(`Verified ${seen.size} staged private assets (${total} bytes) for ${manifest.videos} videos. No cloud upload performed.`);
