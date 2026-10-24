import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {validMediaAssetName,mediaExportKey,parseMediaExportKey,validateMediaExportGraph} from '../src/media-export-validation.js';
const root=path.resolve(import.meta.dirname,'..');
const uuid='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const files={
 'master.m3u8':'#EXTM3U\n#EXT-X-STREAM-INF:BANDWIDTH=500000\nlo.m3u8\n#EXT-X-STREAM-INF:BANDWIDTH=1200000\nhi.m3u8\n#EXT-X-STREAM-INF:BANDWIDTH=700000\nr360.m3u8\n',
 'lo.m3u8':'#EXTM3U\n#EXTINF:2,\nlo_seg_000.ts\n#EXT-X-ENDLIST\n',
 'hi.m3u8':'#EXTM3U\n#EXTINF:2,\nhi_seg_000.ts\n#EXT-X-ENDLIST\n',
 'r360.m3u8':'#EXTM3U\n#EXTINF:2,\nr360_seg_000.ts\n#EXT-X-ENDLIST\n',
 'hi_seg_000.ts':'synthetic-hi','lo_seg_000.ts':'synthetic-lo','r360_seg_000.ts':'synthetic-360',
 'playback.mp4':'synthetic-main','low.mp4':'synthetic-low','r360.mp4':'synthetic-360-file',
 'poster.jpg':'synthetic-poster','preview_0.jpg':'synthetic-preview',
 'renditions.json':JSON.stringify([{profile:'r360',label:'360p'}]),
 'captions.vtt':'WEBVTT\n\n00:00:00.000 --> 00:00:01.000\nSynthetic caption\n'
};
const map=()=>new Map(Object.entries(files).map(([n,bytes])=>[n,Buffer.from(bytes)]));
const validate=assets=>validateMediaExportGraph(assets,{readText:name=>assets.get(name)?.toString('utf8')});
test('42: staged HLS graph includes every renditions and optional captions/previews',()=>{
 assert.deepEqual(validate(map()),{renditions:3,segments:3});
 assert.equal(validMediaAssetName('r360_seg_000.ts'),true);
 assert.equal(parseMediaExportKey(mediaExportKey(uuid,'r360.m3u8')).uploadId,uuid);
 for(const unsafe of ['../secrets','a/evil','https:evil','x.m3u8?token=foo','r360_seg_0000.ts'])assert.equal(validMediaAssetName(unsafe),false);
});
test('42: missing transcoded variant, orphan segment, and malicious relative/remote HLS references fail closed',()=>{
 for(const missing of ['r360.m3u8','r360_seg_000.ts','hi.m3u8']){
  const m=map();m.delete(missing);assert.throws(()=>validate(m),/Missing|Orphan/i);
 }
 for(const injected of ['../other.m3u8','https://elsewhere.invalid/seg.ts','hi_seg_000.ts?secret=1']){
  const m=map();m.set('hi.m3u8',Buffer.from(`#EXTM3U\n#EXTINF:2,\n${injected}\n`));assert.throws(()=>validate(m),/Unsafe HLS/i);
 }
 const m=map();m.set('hi.m3u8',Buffer.from('#EXTM3U\n#EXT-X-KEY:METHOD=AES-128,URI="https://untrusted.invalid/key"\nhi_seg_000.ts\n'));
 assert.throws(()=>validate(m),/Unsupported HLS URI/);
});
function fakeExport(){const dest=fs.mkdtempSync(path.join(os.tmpdir(),'sa-export42-'));const media=path.join(dest,'media',uuid);fs.mkdirSync(media,{recursive:true});for(const [n,v] of Object.entries(files))fs.writeFileSync(path.join(media,n),v);
 const assets=Object.entries(files).map(([name,bytes])=>({key:mediaExportKey(uuid,name),videoId:12,slug:'synthetic',bytes:Buffer.byteLength(bytes),sha256:crypto.createHash('sha256').update(bytes).digest('hex')}));
 const record={uploadId:uuid,videoId:12,slug:'synthetic',renditions:3,segments:3};const manifest={version:2,kind:'Private synthetic',productionApproval:false,createdAt:new Date().toISOString(),videos:1,files:assets.length,totalBytes:assets.reduce((a,v)=>a+v.bytes,0),videoRecords:[record],assets};
 fs.writeFileSync(path.join(dest,'manifest.json'),JSON.stringify(manifest));return {dest,media};}
function verify(dir){return spawnSync(process.execPath,['scripts/verify-media-export.js',dir],{cwd:root,encoding:'utf8'})}
test('42: stage verifier rejects symlinked media root and manifest',()=>{
 const {dest}=fakeExport();try{
  const original=path.join(dest,'media'),moved=path.join(dest,'original-media');
  fs.renameSync(original,moved);fs.symlinkSync(moved,original);
  const redirected=verify(dest);assert.notEqual(redirected.status,0);assert.match(redirected.stderr,/media root/);
  fs.unlinkSync(original);fs.renameSync(moved,original);
  fs.renameSync(path.join(dest,'manifest.json'),path.join(dest,'saved-manifest.json'));
  fs.symlinkSync(path.join(dest,'saved-manifest.json'),path.join(dest,'manifest.json'));
  const manifestLink=verify(dest);assert.notEqual(manifestLink.status,0);assert.match(manifestLink.stderr,/manifest must/i);
 }finally{fs.rmSync(dest,{recursive:true,force:true})}
});
test('42: complete v2 export verifies and detects missing variants, tampering, unexpected assets, symlink and manifest changes',()=>{
 const {dest,media}=fakeExport();try{
  assert.equal(verify(dest).status,0);
  fs.rmSync(path.join(media,'r360_seg_000.ts'));let r=verify(dest);assert.notEqual(r.status,0);assert.match(r.stderr,/mismatch|missing|size/i);
  fs.writeFileSync(path.join(media,'r360_seg_000.ts'),files['r360_seg_000.ts']);assert.equal(verify(dest).status,0);
  fs.writeFileSync(path.join(media,'secret.tmp'),'not-approved');r=verify(dest);assert.notEqual(r.status,0);assert.match(r.stderr,/Unexpected/);
  fs.rmSync(path.join(media,'secret.tmp'));
  const m=JSON.parse(fs.readFileSync(path.join(dest,'manifest.json')));m.productionApproval=true;fs.writeFileSync(path.join(dest,'manifest.json'),JSON.stringify(m));r=verify(dest);assert.notEqual(r.status,0);assert.match(r.stderr,/Unsupported or invalid/);
 }finally{fs.rmSync(dest,{recursive:true,force:true})}
});
