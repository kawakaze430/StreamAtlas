/** Operator-supplied unit-price forecast; NOT an AWS quote or pricing lookup. */
import fs from 'node:fs';
const valid=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0&&x<1e12;
export function forecastCost({usage,rates,contingencyFraction=0.2}){
 const units={storageGbMonth:'storagePerGbMonth',egressGb:'egressPerGb',transcodeMinutes:'transcodePerMinute',requestsMillion:'requestsPerMillion'};
 if(!usage||!rates||!valid(contingencyFraction)||contingencyFraction>1)throw Error('Usage, rates and contingency are required');
 const items={};let subtotal=0;
 for(const [u,r] of Object.entries(units)){
  if(!valid(usage[u])||!valid(rates[r]))throw Error(`Invalid usage/rate: ${u}/${r}`);
  items[u]={quantity:usage[u],unitRate:rates[r],estimatedCost:Math.round(usage[u]*rates[r]*100)/100};subtotal+=usage[u]*rates[r];
 }
 subtotal=Math.round(subtotal*100)/100;
 return {currency:'USD',items,subtotal,contingency:Math.round(subtotal*contingencyFraction*100)/100,
  forecastTotal:Math.round(subtotal*(1+contingencyFraction)*100)/100,
  pricingVerified:false,note:'Supply independently checked current AWS rates, including tiering and taxes separately; this is only arithmetic.'};
}
if(process.argv[1]&&import.meta.url===new URL('file://'+process.argv[1]).href){
 if(!process.argv[2])throw Error('Usage: node scripts/cdn-cost-forecast.js <operator-prices.json>');
 console.log(JSON.stringify(forecastCost(JSON.parse(fs.readFileSync(process.argv[2],'utf8'))),null,2));
}
