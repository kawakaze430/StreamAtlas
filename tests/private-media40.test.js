import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import {servePrivateMedia,parseMediaByteRange} from '../src/private-media-response.js';

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
 for(const value of ['bytes=4-1','bytes=99999-','bytes=0-1,3-4','bytes=9007199254740999-','bytes=-0','bytes=-']){
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

test('private-media: supports safe open-ended and suffix ranges for seeking',()=>inServer(async({url})=>{
 const full=await (await fetch(url)).arrayBuffer(),size=full.byteLength;
 for(const [requested,start,end] of [
  ['bytes=0-',0,size-1],['bytes=-5',size-5,size-1],
  ['bytes=-9999',0,size-1],['bytes=2-999999',2,size-1],['bytes=0-0',0,0]
 ]){
  const r=await fetch(url,{headers:{range:requested}});
  assert.equal(r.status,206,requested);
  assert.equal(r.headers.get('content-range'),`bytes ${start}-${end}/${size}`);
  assert.equal((await r.arrayBuffer()).byteLength,end-start+1);
 }
 const head=await fetch(url,{method:'HEAD',headers:{range:'bytes=-5'}});
 assert.equal(head.status,206);assert.equal(Number(head.headers.get('content-length')),5);
}));

test('private-media: invalid and unsafe ranges are rejected before streaming',()=>{
 for(const value of ['bytes=-0','bytes=0-1,2-3','bytes=8-2','bytes=','bytes=1.0-2','bytes=999999999999999999-'])assert.equal(parseMediaByteRange(value,10),null,value);
 assert.deepEqual(parseMediaByteRange('bytes=-10',10),{start:0,end:9});
 assert.deepEqual(parseMediaByteRange('bytes=2-20',10),{start:2,end:9});
 assert.equal(parseMediaByteRange('bytes=-1',0),null);
});


test('private-media: a trusted media root forbids parent symlinks and traversal',()=>inServer(async({dir,media,file})=>{
 const original=fs.readFileSync(file);
 const root=path.join(dir,'trusted');fs.mkdirSync(root);
 const nested=path.join(root,'safe');fs.mkdirSync(nested);
 const valid=path.join(nested,'safe.mp4');fs.writeFileSync(valid,original);
 const serve=target=>new Promise(resolve=>{
  const server=http.createServer((req,res)=>{
   try{servePrivateMedia(req,res,target,'video/mp4',{trustedRoot:root})}
   catch(e){res.writeHead(e.status||500);res.end('denied')}
  });
  server.listen(0,'127.0.0.1',async()=>{
   try{const r=await fetch(`http://127.0.0.1:${server.address().port}`);resolve(r.status)}
   finally{server.close()}
  });
 });
 assert.equal(await serve(valid),200);
 assert.equal(await serve(file),404);
 const link=path.join(root,'link');fs.symlinkSync(media,link);
 assert.equal(await serve(path.join(link,'clip.mp4')),404);
}));
