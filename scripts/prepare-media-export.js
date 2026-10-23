/** Export only APPROVED and CURRENTLY PUBLIC processed media for an operator-reviewed
 * private-object-store migration. Does not upload anything or alter the source.
 * Usage: DB_PATH=/path/to/db PRIVATE_PATH=/path/to/private node scripts/prepare-media-export.js /absolute/export
 */
import {one,all} from '../src/database.js';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const root=path.resolve(process.argv[2]||'');
const source=path.resolve(process.env.PRIVATE_PATH||path.resolve('data/private'),'processed');
if(!process.argv[2]||!path.isAbsolute(process.argv[2])||root===source||root.startsWith(source+path.sep))throw Error('Supply an absolute, separate export folder');
if(fs.existsSync(root))throw Error('Export destination exists. Choose a new empty directory.');
const rows=all("SELECT x.id,x.video_id AS videoId,v.slug FROM upload_sessions x JOIN videos v ON v.id=x.video_id WHERE x.status='PUBLISHED' AND v.status='PUBLISHED' ORDER BY x.id");
fs.mkdirSync(root,{recursive:true,mode:0o700});
let totalBytes=0;const assets=[];
for(const row of rows){
 if(!/^[0-9a-f]{8}-[0-9a-f-]{27,28}$/.test(row.id))throw Error('Unexpected upload identifier');
 const folder=path.join(source,row.id);
 if(fs.lstatSync(folder,{throwIfNoEntry:false})?.isSymbolicLink())throw Error('A media directory cannot be a symlink');const files=['master.m3u8','hi.m3u8','lo.m3u8','playback.mp4','low.mp4','poster.jpg'];
 const segs=fs.existsSync(folder)?fs.readdirSync(folder).filter(n=>/^(hi|lo)_seg_\d{3}\.ts$/.test(n)).sort():[];
 for(const name of [...files,...segs]){
  const filepath=path.join(folder,name),st=fs.lstatSync(filepath,{throwIfNoEntry:false});
  if(!st?.isFile()||st.isSymbolicLink())throw Error(`Missing verified media rendition ${row.id}/${name}`);
  if(st.size>200*1024*1024)throw Error('Media file exceeds prototype staging limit');
  const data=fs.readFileSync(filepath),checksum=crypto.createHash('sha256').update(data).digest('hex');
  const dest=path.join(root,'media',row.id,name);fs.mkdirSync(path.dirname(dest),{recursive:true,mode:0o700});
  fs.writeFileSync(dest,data,{mode:0o600,flag:'wx'});totalBytes+=st.size;
  assets.push({key:`media/${row.id}/${name}`,videoId:row.videoId,slug:row.slug,bytes:st.size,sha256:checksum});
 }
}
const manifest={version:1,kind:'StreamAtlas approved processed media — private',createdAt:new Date().toISOString(),videos:rows.length,files:assets.length,totalBytes,assets};
fs.writeFileSync(path.join(root,'manifest.json'),JSON.stringify(manifest,null,2)+'\n',{mode:0o600,flag:'wx'});
console.log(JSON.stringify({videos:rows.length,files:assets.length,totalBytes,destination:root}));
