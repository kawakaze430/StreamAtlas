// Browser-context heuristic checks. Full WCAG gate uses axe-core in network-e2e.py.
(() => {
  const visible=el=>!!(el.getClientRects().length)&&getComputedStyle(el).visibility!=='hidden';
  const tag=e=>e.tagName.toLowerCase();
  const failures=[];
  for(const e of document.querySelectorAll('img'))if(visible(e)&&!e.hasAttribute('alt'))failures.push({rule:'image-alt',element:tag(e),sample:e.outerHTML.slice(0,100)});
  for(const e of document.querySelectorAll('button,[role="button"]'))if(visible(e)&&!(e.getAttribute('aria-label')||e.getAttribute('title')||e.textContent.trim()))failures.push({rule:'button-name',element:tag(e),sample:e.outerHTML.slice(0,100)});
  for(const e of document.querySelectorAll('input,select,textarea')){
    if(!visible(e)||e.type==='hidden')continue;
    const labelled=!!(e.getAttribute('aria-label')||e.getAttribute('aria-labelledby')||e.closest('label')||(e.id&&document.querySelector(`label[for="${CSS.escape(e.id)}"]`)));
    if(!labelled)failures.push({rule:'form-label',element:tag(e),sample:e.outerHTML.slice(0,100)});
  }
  for(const e of document.querySelectorAll('video'))if(visible(e)){
    const tracks=[...e.querySelectorAll('track')].filter(t=>t.kind==='captions'||t.kind==='subtitles');
    if(!tracks.length)failures.push({rule:'captions-manual-review',element:'video',sample:'No caption track for this sample; verify on captioned upload fixtures'});
  }
  const overflow=document.documentElement.scrollWidth>innerWidth+2;
  if(overflow)failures.push({rule:'horizontal-overflow',element:'document',sample:`${document.documentElement.scrollWidth}/${innerWidth}`});
  function rgba(s){const m=s.match(/rgba?\((\d+)[, ]+(\d+)[, ]+(\d+)/);return m?[+m[1],+m[2],+m[3]]:null}
  function luminance(rgb){const x=rgb.map(v=>v/255).map(c=>c<=0.04045?c/12.92:((c+0.055)/1.055)**2.4);return .2126*x[0]+.7152*x[1]+.0722*x[2]}
  function bg(node){for(let e=node;e;e=e.parentElement){const color=getComputedStyle(e).backgroundColor;const c=rgba(color);if(c&&color.indexOf('0)')===-1)return c}return [17,17,17]}
  let contrastChecks=0;
  for(const e of [...document.querySelectorAll('p,span,a,label,button,h1,h2,h3')].filter(visible).slice(0,180)){
    if(!e.textContent.trim()||!e.firstChild||e.firstChild.nodeType!==Node.TEXT_NODE)continue;
    const fg=rgba(getComputedStyle(e).color),back=bg(e);if(!fg)continue;
    const a=luminance(fg),b=luminance(back),ratio=(Math.max(a,b)+.05)/(Math.min(a,b)+.05);
    contrastChecks++;
    if(ratio<3)failures.push({rule:'low-contrast-review',element:tag(e),ratio:Math.round(ratio*100)/100,sample:e.textContent.trim().slice(0,50)});
  }
  return {viewport:innerWidth,landmarks:document.querySelectorAll('main').length,headings:document.querySelectorAll('h1').length,contrastSamples:contrastChecks,failures};
})()
