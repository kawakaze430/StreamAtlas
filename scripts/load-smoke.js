/** Bounded local-only load smoke. NEVER load-test a third-party website. */
const input=process.argv[2]||'http://127.0.0.1:3000';
const url=new URL(input);
if(url.protocol!=='http:'||!['127.0.0.1','localhost','[::1]'].includes(url.hostname)||url.username||url.password)throw Error('Only explicit loopback HTTP URLs are allowed');
const count=Number(process.argv[3]||120),concurrency=Number(process.argv[4]||12);
if(!Number.isInteger(count)||count<1||count>1000||!Number.isInteger(concurrency)||concurrency<1||concurrency>32)throw Error('Load test limits: requests 1..1000, concurrency 1..32');
const endpoints=['/api/health','/api/ready','/api/home','/api/videos?limit=16','/api/categories','/api/search/suggest?q=ama'];
let index=0,failed=0;const durations=[];
const started=performance.now();
async function worker(){while(index<count){const i=index++;const begin=performance.now();
 try{const requestURL=new URL(endpoints[i%endpoints.length],url);const result=await fetch(requestURL,{signal:AbortSignal.timeout(10000)});if(!result.ok)failed++;await result.arrayBuffer();}catch{failed++}
 durations.push(performance.now()-begin);
}}
await Promise.all(Array.from({length:Math.min(concurrency,count)},worker));
const elapsed=(performance.now()-started)/1000;durations.sort((a,b)=>a-b);const at=rank=>durations[Math.min(durations.length-1,Math.max(0,Math.ceil(durations.length*rank)-1))]||0;
const report={target:url.origin,requests:count,concurrency,failed,successRate:Math.round(10000*(count-failed)/count)/100,
 p50Ms:Math.round(at(.5)),p95Ms:Math.round(at(.95)),p99Ms:Math.round(at(.99)),throughputRps:Math.round(count/elapsed*100)/100,seconds:Math.round(elapsed*100)/100};
console.log(JSON.stringify(report,null,2));
if(failed||report.p95Ms>5000)process.exitCode=1;
