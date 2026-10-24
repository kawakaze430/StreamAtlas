/** Deterministic, fail-closed validation of the LOCAL private media export graph.
 * This is not authorization to publish, copy rights documents or use cloud resources.
 * A live S3/CDN copy still requires independent eligibility checks and provider approval.
 */
export const MAX_MEDIA_OBJECT_BYTES=200*1024*1024;
const UPLOAD=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ASSET=/^(?:master|hi|lo|r(?:360|480|720|1080))\.m3u8$|^(?:playback|low|r(?:360|480|720|1080))\.mp4$|^(?:hi|lo|r(?:360|480|720|1080))_seg_\d{3}\.ts$|^poster\.jpg$|^preview_[0-3]\.jpg$|^renditions\.json$|^captions\.vtt$/;
export const REQUIRED_ASSETS=Object.freeze(['master.m3u8','hi.m3u8','lo.m3u8','playback.mp4','low.mp4','poster.jpg']);
export function validMediaAssetName(name){return typeof name==='string'&&name.length<=100&&ASSET.test(name)}
export function validUploadId(id){return typeof id==='string'&&UPLOAD.test(id)}
export function mediaExportKey(id,name){
 if(!validUploadId(id)||!validMediaAssetName(name))throw Error('Unsafe media export object key');
 return `media/${id}/${name}`;
}
export function parseMediaExportKey(key){
 if(typeof key!=='string'||key.length>160)return null;
 const match=/^media\/([^/]+)\/([^/]+)$/.exec(key);
 return match&&validUploadId(match[1])&&validMediaAssetName(match[2])?{uploadId:match[1],name:match[2]}:null;
}
function references(playlist){
 if(typeof playlist!=='string'||playlist.length>512*1024||!playlist.startsWith('#EXTM3U\n'))throw Error('Invalid or missing HLS playlist header');
 const files=[];
 for(const line of playlist.split(/\r?\n/)){
  const entry=line.trim();if(!entry)continue;
  if(entry.startsWith('#')){
   // Exporter supports only local, unencrypted MPEG-TS HLS playlists. External
   // key/map/URI references must be reviewed independently before migration.
   if(/URI\s*=|^#EXT-X-(?:KEY|MAP|SESSION-KEY|I-FRAME-STREAM-INF|MEDIA):/i.test(entry))throw Error('Unsupported HLS URI or external dependency');
   continue;
  }
  if(entry.includes('?')||entry.includes('#')||!validMediaAssetName(entry))throw Error('Unsafe HLS playlist reference');
  files.push(entry);
 }
 if(!files.length)throw Error('Empty HLS media references');
 return files;
}
/** Verify that every playlist names only assets present in the export.
 * There must be a playable high/low HLS ladder; optional renditions may exist.
 */
export function validateMediaExportGraph(files,{readText}={}){
 if(!(files instanceof Map))throw Error('Expected an asset map');
 for(const name of REQUIRED_ASSETS)if(!files.has(name))throw Error('Missing mandatory rendition: '+name);
 for(const name of files.keys())if(!validMediaAssetName(name))throw Error('Unexpected or unsafe media asset: '+name);
 if(typeof readText!=='function')throw Error('Playlist reader is required');
 const master=references(readText('master.m3u8'));
 if(!master.includes('hi.m3u8')||!master.includes('lo.m3u8')||master.some(x=>!x.endsWith('.m3u8'))||new Set(master).size!==master.length)throw Error('Invalid master HLS ladder');
 const expectedPlaylists=[...files.keys()].filter(x=>x.endsWith('.m3u8')&&x!=='master.m3u8');
 for(const variant of master)if(!files.has(variant))throw Error('Missing HLS rendition: '+variant);
 for(const variant of expectedPlaylists)if(!master.includes(variant))throw Error('Orphan HLS playlist: '+variant);
 const referencedSegments=new Set();
 for(const variant of master){
  const refs=references(readText(variant));
  if(refs.some(x=>!x.endsWith('.ts')))throw Error('HLS variant must reference local MPEG-TS segments only');
  for(const file of refs){if(!files.has(file))throw Error('Missing referenced HLS segment: '+file);referencedSegments.add(file)}
 }
 for(const file of files.keys())if(file.endsWith('.ts')&&!referencedSegments.has(file))throw Error('Unreferenced HLS segment: '+file);
 return {renditions:master.length,segments:referencedSegments.size};
}
