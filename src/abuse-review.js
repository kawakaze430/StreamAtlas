// Advisory-only deterministic signals. Human review is required to hide content.
export function commentSignals(body,recentBodies=[]){
 const text=String(body||'').trim(),lower=text.toLowerCase();
 const signals=[];
 const links=text.match(/https?:\/\/[^\s]+/gi)||[];
 if(links.length>=2)signals.push('MULTIPLE_LINKS');
 if(/(.)\1{14,}/u.test(text))signals.push('REPEATED_CHARACTERS');
 const norm=s=>String(s).normalize('NFKC').toLowerCase().replace(/\s+/g,' ').trim();
 if(text.length>=12&&recentBodies.some(s=>norm(s)===norm(text)))signals.push('REPEATED_MESSAGE');
 return signals;
}
const normalize=s=>String(s||'').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
export function duplicateCandidates(videos,{limit=100}={}){
 const seen=new Map(),out=[];
 for(const v of videos){
  const name=normalize(v.title);
  if(name.length<8)continue;
  const bucket=name+'|'+Math.round(Number(v.duration||0)/10);
  const previous=seen.get(bucket)||[];
  for(const other of previous){
   if(other.id===v.id)continue;
   const [a,b]=[other.id,v.id].sort((x,y)=>x-y);
   out.push({videoA:a,videoB:b,reason:'MATCHING_NORMALIZED_TITLE_AND_DURATION',titles:[other.title,v.title]});
   if(out.length>=limit)return out;
  }
  previous.push(v);seen.set(bucket,previous);
 }
 return out;
}
