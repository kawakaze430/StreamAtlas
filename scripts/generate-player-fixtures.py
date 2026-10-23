#!/usr/bin/env python3
"""Generate only synthetic demonstration HLS, previews and captions (no external media)."""
from pathlib import Path
import subprocess
ROOT=Path(__file__).resolve().parents[1]
V=ROOT/'public/assets/videos'
OUT=ROOT/'public/assets/hls-demo'
OUT.mkdir(parents=True,exist_ok=True)

def ff(args):
    subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-nostdin','-y','-threads','1',*map(str,args)],check=True,timeout=90)

for i in range(1,5):
    source=V/f'sample-{i}.mp4'
    if not source.is_file():raise FileNotFoundError(source)
    folder=OUT/f'sample-{i}'
    folder.mkdir(parents=True,exist_ok=True)
    low=folder/'low.mp4'
    ff(['-i',source,'-vf','scale=320:-2,fps=8','-an','-c:v','libx264','-preset','medium','-crf','38','-maxrate','80k','-bufsize','160k','-pix_fmt','yuv420p','-movflags','+faststart',low])
    for quality,input_file,bw in [('hi',source,1400000),('lo',low,400000)]:
        ff(['-i',input_file,'-c','copy','-f','hls','-hls_time','2','-hls_playlist_type','vod','-hls_segment_filename',folder/f'{quality}_seg_%03d.ts',folder/f'{quality}.m3u8'])
    hi_bw=round(source.stat().st_size*8/8*1.2)
    lo_bw=round(low.stat().st_size*8/8*1.2)
    (folder/'master.m3u8').write_text(f'#EXTM3U\n#EXT-X-VERSION:3\n#EXT-X-STREAM-INF:BANDWIDTH={lo_bw},RESOLUTION=320x180\nlo.m3u8\n#EXT-X-STREAM-INF:BANDWIDTH={hi_bw},RESOLUTION=640x360\nhi.m3u8\n')
    (folder/'captions.vtt').write_text('WEBVTT\n\n00:00:00.000 --> 00:00:03.900\nAbstract animated demonstration visuals.\n\n00:00:04.000 --> 00:00:07.900\nStreamAtlas synthetic sample footage.\n')
    for t in [0,2,4,6]:
        ff(['-ss',t,'-i',source,'-frames:v','1','-vf','scale=192:108','-q:v','5',folder/f'preview-{t}.jpg'])
    print('Created demo HLS, captions and storyboard',i)
