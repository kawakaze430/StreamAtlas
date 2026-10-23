/** Source-aware optional HLS ladder. Never upscale, and always retain legacy lo/hi.
 * All rendition work is private and must run after scanner, FFprobe, and SHA checks.
 */
import fs from 'node:fs';
import path from 'node:path';
export const HEIGHTS=Object.freeze([360,480,720,1080]);
export function extraRenditions(width,height){
 if(!Number.isInteger(width)||!Number.isInteger(height)||width<16||height<16||width>3840||height>2160)throw Error('Invalid input dimensions');
 return HEIGHTS.filter(h=>height>=h&&width>=Math.ceil(h*4/3)).map(h=>({height:h,profile:`r${h}`,label:`${h}p`,videoBitrate:({360:650,480:1100,720:2300,1080:4500})[h]}));
}
export function encodedBandwidth(file,duration,minimum=90000){
 if(!(duration>0&&duration<=120)||!Number.isFinite(duration))throw Error('Invalid media duration');
 const bits=fs.statSync(file).size*8/duration;
 return Math.max(minimum,Math.ceil(bits*1.15/1000)*1000);
}
export function composeMaster(profiles){
 if(!Array.isArray(profiles)||profiles.length<2)throw Error('At least two profiles are required');
 let text='#EXTM3U\n#EXT-X-VERSION:3\n#EXT-X-INDEPENDENT-SEGMENTS\n';
 for(const p of profiles){if(!/^(lo|hi|r(?:360|480|720|1080))$/.test(p.profile)||!Number.isSafeInteger(p.bandwidth)||p.bandwidth<90000||!Number.isInteger(p.width)||!Number.isInteger(p.height)||p.width<16||p.height<16)throw Error('Invalid rendition');
  text+=`#EXT-X-STREAM-INF:BANDWIDTH=${p.bandwidth},RESOLUTION=${p.width}x${p.height}\n${p.profile}.m3u8\n`;
 }
 return text;
}
export function readQualityOptions(target,uploadId){
 if(!/^[a-f0-9-]{36}$/.test(uploadId))return [];
 const file=path.join(target,'renditions.json');
 try{const obj=JSON.parse(fs.readFileSync(file,'utf8'));if(!Array.isArray(obj)||obj.length>8)return [];
  return obj.filter(x=>/^(lo|hi|r(?:360|480|720|1080))$/.test(x.profile)&&(x.label==='Original'||/^\d{2,4}p$/.test(x.label))).map(x=>({label:x.label,url:`/api/media/${uploadId}/${x.profile}.mp4`}));
 }catch{return []}
}
