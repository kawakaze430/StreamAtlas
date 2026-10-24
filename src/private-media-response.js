/** Serve private processed files without following final-component or directory symlinks.
 * FD-binding prevents swapping a path after permission checks and before the stream opens.
 * This is a defense-in-depth safeguard, not an alternative to filesystem ACLs,
 * storage isolation, public-edge policy or independent security testing.
 */
import fs from 'node:fs';
import path from 'node:path';

const denied=()=>Object.assign(new Error('Media not found'),{status:404});

// RFC 9110 single-range semantics for private MP4 playback, including suffix seeks.
// Multi-range requests fail closed rather than returning multipart responses.
export function parseMediaByteRange(header,size){
 if(typeof header!=='string'||!Number.isSafeInteger(size)||size<1)return null;
 const match=/^bytes=(\d*)-(\d*)$/.exec(header);
 if(!match||(match[1]===''&&match[2]===''))return null;
 const readNumber=s=>s!==''&&s.length<=16?Number(s):NaN;
 let start,end;
 if(match[1]===''){
  const suffix=readNumber(match[2]);
  if(!Number.isSafeInteger(suffix)||suffix<=0)return null;
  start=Math.max(0,size-suffix);end=size-1;
 }else{
  start=readNumber(match[1]);
  end=match[2]===''?size-1:readNumber(match[2]);
  if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||start>=size||end<start)return null;
  end=Math.min(end,size-1);
 }
 return {start,end};
}
function openPrivateFile(target,{trustedRoot}={}){
 if(trustedRoot){
  const root=path.resolve(trustedRoot),absolute=path.resolve(target),relative=path.relative(root,absolute);
  if(!relative||relative==='..'||relative.startsWith('..'+path.sep)||path.isAbsolute(relative))throw denied();
  let segment=root;
  for(const component of ['',...relative.split(path.sep).slice(0,-1)]){
   if(component)segment=path.join(segment,component);
   if(!fs.lstatSync(segment,{throwIfNoEntry:false})?.isDirectory())throw denied();
  }
 }
 const dir=fs.lstatSync(path.dirname(target),{throwIfNoEntry:false});
 if(!dir?.isDirectory())throw denied();
 let fd;
 try{
  fd=fs.openSync(target,fs.constants.O_RDONLY|(fs.constants.O_NOFOLLOW||0));
  const stat=fs.fstatSync(fd);
  const current=fs.lstatSync(target,{throwIfNoEntry:false});
  if(!stat.isFile()||!current?.isFile()||stat.dev!==current.dev||stat.ino!==current.ino)throw denied();
  return {fd,size:stat.size};
 }catch(e){if(fd!==undefined)fs.closeSync(fd);if(['ELOOP','ENOENT','EACCES','ENOTDIR','EISDIR'].includes(e.code))throw denied();throw e}
}

/** Returns synchronously after attaching a stream; closes FD on all responses. */
export function servePrivateMedia(req,res,target,mime,options={}){
 const {fd,size}=openPrivateFile(target,options);
 const headers={'Content-Type':mime,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Accept-Ranges':'bytes'};
 let code=200,range;
 if(mime==='video/mp4'&&req.headers.range){
  range=parseMediaByteRange(req.headers.range,size);
  if(!range){
   fs.closeSync(fd);res.writeHead(416,{'Content-Range':`bytes */${size}`,'Cache-Control':'no-store'});res.end();return;
  }
  code=206;headers['Content-Range']=`bytes ${range.start}-${range.end}/${size}`;
 }
 headers['Content-Length']=range?range.end-range.start+1:size;
 try{res.writeHead(code,headers)}catch(e){fs.closeSync(fd);throw e}
 if(req.method==='HEAD'){fs.closeSync(fd);res.end();return}
 const stream=fs.createReadStream(target,{fd,autoClose:true,...range});
 stream.once('error',()=>res.destroy());
 res.once('close',()=>stream.destroy());
 stream.pipe(res);
}
