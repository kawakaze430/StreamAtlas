/** Private, COMPLETE, fail-closed processed media export for review prior to S3 staging.
 * No cloud activity. Never use this as independent rights, age or publication approval.
 * Usage: DB_PATH=/path/to/db PRIVATE_PATH=/path/to/private node scripts/prepare-media-export.js /absolute/NEW/export
 */
import {all,one} from '../src/database.js';
import {mediaExportKey,validMediaAssetName,validUploadId,validateMediaExportGraph,MAX_MEDIA_OBJECT_BYTES} from '../src/media-export-validation.js';
import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';
const root=path.resolve(process.argv[2]||'');
const source=path.resolve(process.env.PRIVATE_PATH||path.resolve('data/private'),'processed');
if(!process.argv[2]||!path.isAbsolute(process.argv[2])||root===source||root.startsWith(source+path.sep)||source.startsWith(root+path.sep))throw Error('Supply a separate absolute export folder');
if(fs.existsSync(root))throw Error('Export destination exists. Choose a new empty directory.');
const rows=all(`SELECT x.id,x.video_id AS videoId,v.slug FROM upload_sessions x JOIN videos v ON v.id=x.video_id
 WHERE x.status='PUBLISHED' AND v.status='PUBLISHED'
 AND NOT EXISTS(SELECT 1 FROM content_holds h WHERE h.video_id=v.id AND h.closed_at IS NULL)
 AND NOT EXISTS(SELECT 1 FROM media_license_reviews l WHERE l.upload_id=x.id AND (l.status<>'VERIFIED' OR l.expires_at<=?))
 ORDER BY x.id`,new Date().toISOString());
if(fs.lstatSync(source,{throwIfNoEntry:false})?.isSymbolicLink())throw Error('Private source directory is a symlink');
fs.mkdirSync(root,{recursive:true,mode:0o700});
let totalBytes=0;const assets=[],videos=[];
try{
 for(const row of rows){
  if(!validUploadId(row.id))throw Error('Unexpected upload identifier');
  const folder=path.join(source,row.id);
  if(!fs.lstatSync(folder,{throwIfNoEntry:false})?.isDirectory())throw Error('Missing or redirected private media folder');
  const names=fs.readdirSync(folder);
  if(names.some(name=>!validMediaAssetName(name)))throw Error('Unrecognized private media file; manual inspection required');
  const contents=new Map();
  for(const name of names){
   const file=path.join(folder,name);
   const stat=fs.lstatSync(file,{throwIfNoEntry:false});
   if(!stat?.isFile()||stat.size>MAX_MEDIA_OBJECT_BYTES)throw Error('Missing, redirected or oversized media file: '+name);
   // O_NOFOLLOW binds to the regular file rather than following a late symlink.
   const fd=fs.openSync(file,fs.constants.O_RDONLY|(fs.constants.O_NOFOLLOW||0));
   try{
    const opened=fs.fstatSync(fd),again=fs.lstatSync(file);
    if(!opened.isFile()||opened.size!==stat.size||opened.ino!==again.ino||opened.dev!==again.dev)throw Error('Media file changed during export');
    const data=fs.readFileSync(fd);
    if(data.length!==opened.size)throw Error('Media file changed while reading');
    contents.set(name,data);
   }finally{fs.closeSync(fd)}
  }
  const cap=one('SELECT vtt FROM video_captions WHERE video_id=?',row.videoId)?.vtt;
  if(cap){
   if(contents.has('captions.vtt'))throw Error('Duplicate captions source');
   const bytes=Buffer.from(cap,'utf8');
   if(!cap.startsWith('WEBVTT')||bytes.length>12000)throw Error('Invalid approved subtitle data');
   contents.set('captions.vtt',bytes);
  }
  const graph=validateMediaExportGraph(contents,{readText:name=>contents.get(name)?.toString('utf8')});
  for(const [name,data] of [...contents].sort(([a],[b])=>a.localeCompare(b))){
   const dest=path.join(root,'media',row.id,name);fs.mkdirSync(path.dirname(dest),{recursive:true,mode:0o700});
   fs.writeFileSync(dest,data,{mode:0o600,flag:'wx'});
   totalBytes+=data.length;
   assets.push({key:mediaExportKey(row.id,name),videoId:row.videoId,slug:row.slug,bytes:data.length,sha256:crypto.createHash('sha256').update(data).digest('hex')});
  }
  videos.push({uploadId:row.id,videoId:row.videoId,slug:row.slug,...graph});
 }
 const manifest={version:2,kind:'StreamAtlas approved processed media — private offline staging',createdAt:new Date().toISOString(),videos:videos.length,files:assets.length,totalBytes,videoRecords:videos,assets,productionApproval:false};
 fs.writeFileSync(path.join(root,'manifest.json'),JSON.stringify(manifest,null,2)+'\n',{mode:0o600,flag:'wx'});
 console.log(JSON.stringify({videos:videos.length,files:assets.length,totalBytes,destination:root,productionApproval:false}));
}catch(e){fs.rmSync(root,{recursive:true,force:true});throw e}
