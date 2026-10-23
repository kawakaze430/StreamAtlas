/** Deterministic, bounded offline recommendation evaluation.
 * This is a privacy-preserving local experiment, NOT live online A/B assignment.
 * No viewer identifiers, preferences, clicks, or watch histories are stored.
 */
const ALNUM=/[\p{L}\p{N}]+/gu;
export function featureSet(record){
 const words=(text)=>String(text||'').toLocaleLowerCase('en').match(ALNUM)||[];
 const common=new Set(['the','a','and','in','of','for','with','to','video','part','episode','sample']);
 const result=new Set(words(record.title).filter(x=>x.length>=3&&!common.has(x)).slice(0,12).map(x=>'t:'+x));
 for(const id of (record.categoryIds||[]).slice(0,15))if(Number.isSafeInteger(id))result.add('c:'+id);
 for(const id of (record.performerIds||[]).slice(0,15))if(Number.isSafeInteger(id))result.add('p:'+id);
 return result;
}
export function jaccard(a,b){const x=featureSet(a),y=featureSet(b);let intersection=0;for(const f of x)if(y.has(f))intersection++;return x.size+y.size-intersection?intersection/(x.size+y.size-intersection):0;}
const eligible=x=>x&&Number.isSafeInteger(x.id)&&x.id>0&&x.status==='PUBLISHED'&&!x.safetyHold&&!x.expiredLicense;
export function rankColdStart(seed,candidates,{k=10,maxPerChannel=2}={}){
 if(!Number.isSafeInteger(k)||k<1||k>50||!Number.isSafeInteger(maxPerChannel)||maxPerChannel<1||maxPerChannel>20)throw Error('Invalid evaluation limits');
 const seen=new Set(),counts=new Map();const ordered=candidates.filter(x=>eligible(x)&&x.id!==seed.id).map(x=>({item:x,score:jaccard(seed,x)*10+Math.log1p(Math.max(0,x.views||0))*0.02})).sort((a,b)=>b.score-a.score||a.item.id-b.item.id);
 const out=[];for(const row of ordered){const v=row.item;if(seen.has(v.id))continue;seen.add(v.id);const ch=v.channelId||0,n=counts.get(ch)||0;if(n>=maxPerChannel)continue;counts.set(ch,n+1);out.push(v);if(out.length>=k)break}return out;
}
export function evaluateScenarios(scenarios,items,{k=10}={}){
 if(!Array.isArray(scenarios)||scenarios.length>100||!Array.isArray(items)||items.length>5000)throw Error('Invalid evaluation dataset');
 let ndcgSum=0,recallSum=0,valid=0;const surfaced=new Set();
 for(const row of scenarios){if(!row?.seed||!Array.isArray(row.relevant)||!row.relevant.length)continue;
  const rel=new Set(row.relevant.filter(Number.isSafeInteger));const ranked=rankColdStart(row.seed,items,{k});ranked.forEach(v=>surfaced.add(v.id));
  let dcg=0;for(let i=0;i<ranked.length;i++)if(rel.has(ranked[i].id))dcg+=1/Math.log2(i+2);
  const ideal=Array.from({length:Math.min(k,rel.size)},(_,i)=>1/Math.log2(i+2)).reduce((a,b)=>a+b,0);
  ndcgSum+=ideal?dcg/ideal:0;recallSum+=ranked.filter(x=>rel.has(x.id)).length/rel.size;valid++;
 }
 const eligibleCount=new Set(items.filter(eligible).map(x=>x.id)).size;
 return {offlineOnly:true,noViewerData:true,scenarios:valid,k,meanNdcgAtK:valid?Number((ndcgSum/valid).toFixed(4)):null,meanRecallAtK:valid?Number((recallSum/valid).toFixed(4)):null,catalogCoverage:eligibleCount?Number((surfaced.size/eligibleCount).toFixed(4)):null,limitations:'Synthetic relevance scenarios only. No online randomized assignment, learned embeddings or customer-outcome claims.'};
}
