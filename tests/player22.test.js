import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {spawnSync,spawn} from 'node:child_process';
import {demoPlayerAssets} from '../src/demo-player.js';
const root=path.resolve(import.meta.dirname,'..');
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'sa-player22-'));
process.env.DB_PATH=path.join(tmp,'test.db');process.env.NODE_ENV='test';
const {server}=await import('../src/server.js');
let base;
before(async()=>{await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));base=`http://127.0.0.1:${server.address().port}`});
after(async()=>{await new Promise(resolve=>server.close(resolve));fs.rmSync(tmp,{recursive:true,force:true})});

test('B01 fixture paths are restricted to four original synthetic clips',()=>{
  assert.equal(demoPlayerAssets('/api/media/secret/playback.mp4'),null);
  assert.equal(demoPlayerAssets('/assets/videos/other.mp4'),null);
  for(let i=1;i<=4;i++){
    const a=demoPlayerAssets(`/assets/videos/sample-${i}.mp4`);
    assert.equal(a.previewFrames.length,4);assert.equal(a.captionTracks[0].srclang,'en');
    assert.equal(a.qualityOptions.length,2);assert.match(a.hlsUrl,/master\.m3u8$/);
    assert.equal(a.trueMediaDuration,8);
  }
});
test('B02 sample HLS master playlist references only locally generated variants',()=>{
  for(let i=1;i<=4;i++){
    const dir=path.join(root,'public/assets/hls-demo',`sample-${i}`);
    const master=fs.readFileSync(path.join(dir,'master.m3u8'),'utf8');
    assert.match(master,/#EXTM3U/);assert.match(master,/lo\.m3u8/);assert.match(master,/hi\.m3u8/);
    assert.match(master,/RESOLUTION=320x180/);
    for(const quality of ['lo','hi']){
      const list=fs.readFileSync(path.join(dir,quality+'.m3u8'),'utf8');
      assert.match(list,/#EXT-X-ENDLIST/);
      for(const entry of list.split(/\r?\n/).filter(line=>line.endsWith('.ts'))){
        assert.match(entry,new RegExp(`^${quality}_seg_\\d{3}\\.ts$`));
        assert.ok(fs.statSync(path.join(dir,entry)).size>5000);
      }
    }
  }
});
test('B03 ffprobe can read both complete local HLS renditions',()=>{
  if(spawnSync('ffprobe',['-version'],{encoding:'utf8'}).status!==0)return;
  for(const quality of ['hi','lo']){
    const name=path.join(root,'public/assets/hls-demo/sample-1',quality+'.m3u8');
    const p=spawnSync('ffprobe',['-v','error','-show_entries','format=duration','-of','default=noprint_wrappers=1:nokey=1',name],{encoding:'utf8',timeout:10000});
    assert.equal(p.status,0,p.stderr);
    assert.ok(Number(p.stdout)>7&&Number(p.stdout)<10,p.stdout);
  }
});
test('B04 network video API advertises quality/caption/preview options for demo content',async()=>{
  const r=await fetch(base+'/api/videos/after-hours-the-neon-edit-1');assert.equal(r.status,200);
  const data=await r.json();assert.ok(data.hlsUrl?.endsWith('master.m3u8'));
  assert.equal(data.previewFrames.length,4);assert.equal(data.captionTracks[0].srclang,'en');
  assert.equal(data.qualityOptions.length,2);
});
test('B05 sample HLS manifests, VTT and thumbnails have correct HTTP media types',async()=>{
  const files=[['master.m3u8','application/vnd.apple.mpegurl'],['hi.m3u8','application/vnd.apple.mpegurl'],['hi_seg_000.ts','video/mp2t'],['captions.vtt','text/vtt'],['preview-0.jpg','image/jpeg'],['low.mp4','video/mp4']];
  for(const [name,type] of files){const r=await fetch(base+'/assets/hls-demo/sample-1/'+name);assert.equal(r.status,200,name);assert.ok(r.headers.get('content-type')?.startsWith(type),`${name}: ${r.headers.get('content-type')}`);assert.ok((await r.arrayBuffer()).byteLength>0)}
});
test('B06 public files cannot access a private-upload path through static URLs',async()=>{
  const r=await fetch(base+'/assets/hls-demo/../../data/private/example.mp4',{redirect:'manual'});
  assert.notEqual(r.headers.get('content-type')?.startsWith('video/'),true);
  assert.doesNotMatch(await r.text(),/PRIVATE_UPLOAD_BLOB_SENTINEL/);
});
test('B07 player includes accessible timeline, preview, captions, Up Next and keyboard support',()=>{
  const app=fs.readFileSync(path.join(root,'public/app.js'),'utf8');
  for(const x of ['player-scrubber','timeline-preview','player-captions','player-volume','up-next','player-qoe',"case 'c'", "case 'j'", "case 'l'",'touchend'])assert.ok(app.includes(x),x);
});

test('B08 actual HTTP HLS playlists and video segments are decodable through FFprobe',async()=>{
  if(spawnSync('ffprobe',['-version'],{encoding:'utf8'}).status!==0)return;
  const target=base+'/assets/hls-demo/sample-1/hi.m3u8';
  const p=await new Promise((resolve,reject)=>{
    const child=spawn('ffprobe',['-v','error','-protocol_whitelist','file,http,https,tcp,tls,crypto','-show_entries','format=duration','-of','default=noprint_wrappers=1:nokey=1',target]);
    let stdout='',stderr='';const timer=setTimeout(()=>child.kill('SIGKILL'),10000);
    child.stdout.on('data',x=>stdout+=x);child.stderr.on('data',x=>stderr+=x);
    child.on('error',reject);child.on('close',status=>{clearTimeout(timer);resolve({status,stdout,stderr})});
  });
  assert.equal(p.status,0,`FFprobe HTTP HLS failure: ${p.stderr}`);
  assert.ok(Number(p.stdout)>7,`Invalid network HLS duration: ${p.stdout}`);
});
