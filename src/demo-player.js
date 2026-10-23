/** Assets in this module are locally generated, non-explicit and safe for public static serving.
 * Private uploads continue to use /api/media/... and its authorization checks. */
export function demoPlayerAssets(mediaUrl){
  const m=/^\/assets\/videos\/sample-([1-4])\.mp4$/.exec(mediaUrl||'');
  if(!m)return null;
  const base=`/assets/hls-demo/sample-${m[1]}`;
  return {
    hlsUrl:`${base}/master.m3u8`,
    qualityOptions:[{label:'Standard (MP4)',url:mediaUrl},{label:'Data saver (320p MP4)',url:`${base}/low.mp4`}],
    captionsUrl:`${base}/captions.vtt`,
    captionTracks:[{label:'English descriptive captions',srclang:'en',url:`${base}/captions.vtt`}],
    previewFrames:[0,2,4,6].map(time=>({time,url:`${base}/preview-${time}.jpg`})),
    trueMediaDuration:8
  };
}
