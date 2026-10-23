import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import {servePrivateMedia} from '../src/private-media-response.js';

const inServer=async(fn)=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'sa-private-media40-'));
 const media=path.join(dir,'media');fs.mkdirSync(media);
 const file=path.join(media,'clip.mp4');fs.writeFileSync(file,Buffer.from('strictly-synthetic-media-fixture-12345'));
 const server=http.createServer((req,res)=>{
  try{servePrivateMedia(req,res,file,'video/mp4')}
  catch(e){res.writeHead(e.status||500);res.end('unavailable')}
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const url=`http://127.0.0.1:${server.address().port}`;
 try{await fn({dir,media,file,url})}
 finally{await new Promise(resolve=>server.close(resolve));fs.rmSync(dir,{recursive:true,force:true})}
};

test('private-media: HEAD, exact ranges, and malformed ranges are bounded',()=>inServer(async({url})=>{
 const full=await fetch(url);assert.equal(full.status,200);const bytes=await full.arrayBuffer();
 const head=await fetch(url,{method:'HEAD'});assert.equal(head.status,200);assert.equal(Number(head.headers.get('content-length')),bytes.byteLength);
 const part=await fetch(url,{headers:{Range:'bytes=2-9'}});assert.equal(part.status,206);assert.equal((await part.arrayBuffer()).byteLength,8);
 for(const value of ['bytes=4-1','bytes=99999-','bytes=0-1,3-4','bytes=9007199254740999-','bytes=-2']){
  const r=await fetch(url,{headers:{Range:value}});assert.equal(r.status,416,value);assert.match(r.headers.get('content-range'),/^bytes \*\//);
 }
}));

test('private-media: refuses symlinks in media file and parent without reading target',()=>inServer(async({dir,media,file,url})=>{
 const outside=path.join(dir,'outside');fs.writeFileSync(outside,'PRIVATE-NONMEDIA-DATA');
 fs.unlinkSync(file);fs.symlinkSync(outside,file);
 assert.equal((await fetch(url)).status,404);
 fs.unlinkSync(file);fs.writeFileSync(file,'safe');
 fs.renameSync(media,path.join(dir,'actual'));
 fs.symlinkSync(path.join(dir,'actual'),media);
 assert.equal((await fetch(url)).status,404);
}));
