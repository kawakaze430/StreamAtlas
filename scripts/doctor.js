import {spawnSync} from 'node:child_process';
const good=process.versions.node.split('.').map(Number);
const ok=good[0]>22||(good[0]===22&&good[1]>=13);
console.log(`Node.js ${process.versions.node} — ${ok?'OK':'upgrade to >=22.13'}`);
let passed=ok;
for(const [label,bin] of [['FFmpeg',process.env.FFMPEG_PATH||'ffmpeg'],['FFprobe',process.env.FFPROBE_PATH||'ffprobe']]){
 const p=spawnSync(bin,['-version'],{encoding:'utf8',timeout:8000});const success=p.status===0;
 console.log(`${label}: ${success?(p.stdout.split('\n')[0]):'NOT FOUND — uploads cannot be processed'}`);passed&&=success;
}
if(!passed)process.exitCode=1;
