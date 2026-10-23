/** Search suggestion ranker. Returns offsets, never HTML, so clients can safely highlight text. */
export function rankSuggestions(rows,needle,{limit=5}={}){
 const q=String(needle||'').normalize('NFKC').toLocaleLowerCase('en').trim();
 if(!q)return [];
 return rows.map(row=>{
  const label=String(row.name||row.title||'');const normalized=label.normalize('NFKC').toLocaleLowerCase('en');const offset=normalized.indexOf(q);
  if(offset<0)return null;
  const popularity=Math.max(0,Number(row.videoCount||row.views||0));
  const exact=normalized===q,prefix=offset===0;
  const score=(exact?10000:prefix?5000:1000)+Math.min(999,Math.log1p(popularity)*80);
  // For ASCII labels offsets are direct UTF-16 positions. For complex Unicode labels
  // we decline a precise range instead of highlighting the wrong characters.
  const range=label.toLocaleLowerCase('en').indexOf(q);
  return {...row,matchType:exact?'exact':prefix?'prefix':'substring',matchRanges:range>=0?[[range,range+q.length]]:[],suggestionScore:Math.round(score)};
 }).filter(Boolean).sort((a,b)=>b.suggestionScore-a.suggestionScore||String(a.name||a.title).localeCompare(String(b.name||b.title))||a.id-b.id).slice(0,limit);
}
