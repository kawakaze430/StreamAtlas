/** Serve private processed files without following final-component or directory symlinks.
 * FD-binding prevents swapping a path after permission checks and before the stream opens.
 * This is a defense-in-depth safeguard, not an alternative to filesystem ACLs,
 * storage isolation, public-edge policy or independent security testing.
 */
import fs from 'node:fs';
import path from 'node:path';

const denied=()=>Object.assign(new Error('Media not found'),{status:404});

function openPrivateFile(target){
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
export function servePrivateMedia(req,res,target,mime){
 const {fd,size}=openPrivateFile(target);
 const headers={'Content-Type':mime,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Accept-Ranges':'bytes'};
 let code=200,range;
 if(mime==='video/mp4'&&req.headers.range){
  const m=/^bytes=(\d+)-(\d*)$/.exec(req.headers.range);
  const start=m?Number(m[1]):NaN,end=m&&m[2]?Number(m[2]):size-1;
  if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start>=size||end<start||start<0){
   fs.closeSync(fd);res.writeHead(416,{'Content-Range':`bytes */${size}`,'Cache-Control':'no-store'});res.end();return;
  }
  code=206;range={start,end:Math.min(end,size-1)};
  headers['Content-Range']=`bytes ${start}-${range.end}/${size}`;
 }
 headers['Content-Length']=range?range.end-range.start+1:size;
 try{res.writeHead(code,headers)}catch(e){fs.closeSync(fd);throw e}
 if(req.method==='HEAD'){fs.closeSync(fd);res.end();return}
 const stream=fs.createReadStream(target,{fd,autoClose:true,...range});
 stream.once('error',()=>res.destroy());
 res.once('close',()=>stream.destroy());
 stream.pipe(res);
}
