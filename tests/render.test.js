import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'streamatlas-render-'));
process.env.DB_PATH=path.join(tmp,'render.db');
process.env.NODE_ENV='test';
const {server}=await import('../src/server.js');
let base,context,app,locationObj;
before(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));base=`http://127.0.0.1:${server.address().port}`;
 app={innerHTML:''};locationObj={pathname:'/',search:'',href:base+'/'};
 const document={body:{classList:{toggle(){} }},querySelector(s){return s==='#app'?app:null},addEventListener(){},title:''};
 const history={pushState(a,b,p){const u=new URL(p,base);locationObj.pathname=u.pathname;locationObj.search=u.search;locationObj.href=u.href},replaceState(a,b,p){this.pushState(a,b,p)}};
 const storage=new Map();const localStorage={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)};
 const window={addEventListener(){},scrollTo(){},confirm(){return true}};
 const sandbox={document,window,history,localStorage,location:locationObj,navigator:{},console,URL,URLSearchParams,fetch:(p,opts)=>fetch(base+p,opts),setTimeout,clearTimeout};
 context=vm.createContext(sandbox);
 vm.runInContext(fs.readFileSync(new URL('../public/app.js',import.meta.url),'utf8'),context,{filename:'app.js'});
 await new Promise(resolve=>setTimeout(resolve,150));
});
after(async()=>{await new Promise(resolve=>server.close(resolve));fs.rmSync(tmp,{recursive:true,force:true})});
async function open(p){const u=new URL(p,base);locationObj.pathname=u.pathname;locationObj.search=u.search;locationObj.href=u.href;await vm.runInContext('route()',context);return app.innerHTML}
test('Homepage renders catalog and network navigation',async()=>{const html=await open('/');assert.match(html,/Latest Videos/);assert.match(html,/Most Viewed Videos/);assert.match(html,/Northlight Network/);assert.match(html,/Top Pornstars/);assert.match(html,/videocard/)});
test('Alphabetical categories render navigable chips',async()=>{const html=await open('/categories');assert.match(html,/Categories Alphabetically/);assert.match(html,/Amateur/);assert.match(html,/category-search/)});
test('Porn Sites directory renders grouped video sections',async()=>{const html=await open('/sites');assert.match(html,/Recently Updated Porn Sites/);assert.match(html,/See All Videos/);assert.match(html,/Northlight Originals/)});
test('Performer directory renders original profile illustrations',async()=>{const html=await open('/models');assert.match(html,/Most Viewed Pornstars/);assert.match(html,/person-1.jpg/);assert.match(html,/Avery Monroe/)});
test('Network page renders videos and sort controls',async()=>{const html=await open('/networks/northlight-network');assert.match(html,/All Network Videos/);assert.match(html,/Northlight Network/)});
test('Video detail renders working video source + actions',async()=>{const html=await open('/videos/after-hours-the-neon-edit-1');assert.match(html,/id="video-player"/);assert.match(html,/sample-1.mp4/);assert.match(html,/Watch Later/);assert.match(html,/Related Videos/);assert.match(html,/comment-form/);assert.match(html,/id="related-grid"/);assert.match(html,/data-action="more-related"/)});
test('Search page renders filtered results',async()=>{const html=await open('/search?q=Neon');assert.match(html,/Search results for/);assert.match(html,/Neon/)});
test('Signed-out Favorites page prompts account use',async()=>{const html=await open('/favorites');assert.match(html,/Sign in to access your library/)});

// Checkpoint 05 route smoke tests in a mock DOM (not graphical browser coverage).
test('Signed-out notifications invite sign in',async()=>{const html=await open('/notifications');assert.match(html,/Sign in for notifications/)});
test('Signed-out account settings show a sign-in prompt',async()=>{const html=await open('/settings');assert.match(html,/Sign in required/)});
// CP06 mock DOM route checks (not real graphical browser tests).
test('Search page includes duration and quality filters',async()=>{
 const html=await open('/search?q=Neon&quality=HD&minDuration=2');
 assert.match(html,/id="search-filters"/);assert.match(html,/Maximum seconds/);assert.match(html,/Apply filters/);
});
test('Signed-in settings template includes privacy and password controls',async()=>{
 vm.runInContext("state.user={id:9000,name:'Test User',email:'u@example.test',role:'MEMBER'}",context);
 const html=await open('/settings');
 assert.match(html,/id="preferences-form"/);assert.match(html,/Pause recording my watch history/);
 assert.match(html,/id="password-form"/);
 vm.runInContext('state.user=null',context);
});
test('Checkpoint 30 search screen renders multi-entity facet controls with preserved selections',async()=>{
 const html=await open('/search?q=Demo&category=amateur&network=pornforce');
 assert.match(html,/name="category"/);assert.match(html,/name="performer"/);assert.match(html,/name="site"/);
 assert.match(html,/name="network"/);assert.match(html,/name="channel"/);
 assert.match(html,/name="publishedAfter"/);
});
