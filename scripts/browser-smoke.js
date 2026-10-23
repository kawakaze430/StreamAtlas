/** Optional real Chromium browser smoke test (not part of npm test).
 * Run after installing Playwright in your own development environment:
 *   npm install --no-save playwright && npx playwright install chromium
 *   npm run test:browser
 * This deliberately uses a private disposable database and non-explicit media.
 */
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {spawn} from 'node:child_process';import net from 'node:net';import assert from 'node:assert/strict';
let chromium;
try{({chromium}=await import('playwright'))}catch{console.error('Playwright is not installed. Run: npm install --no-save playwright && npx playwright install chromium');process.exit(2)}
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'streamatlas-browser06-'));
const output=path.resolve(process.env.SA_BROWSER_SCREENSHOTS||path.join(temp,'screenshots'));
fs.mkdirSync(output,{recursive:true});
const socket=net.createServer();await new Promise(resolve=>socket.listen(0,'127.0.0.1',resolve));const port=socket.address().port;await new Promise(resolve=>socket.close(resolve));
const base=`http://127.0.0.1:${port}`;
const env={...process.env,PORT:String(port),DB_PATH:path.join(temp,'db.sqlite'),PRIVATE_PATH:path.join(temp,'private'),SA_DISABLE_WORKER:'1',NODE_ENV:'development'};
const server=spawn(process.execPath,['src/server.js'],{cwd:path.resolve(import.meta.dirname,'..'),env,stdio:'ignore'});
let browser;
try{
 let listening=false;for(let i=0;i<80;i++){try{const r=await fetch(base+'/api/health');if(r.ok){listening=true;break}}catch{}await new Promise(resolve=>setTimeout(resolve,100))}
 assert.ok(listening,'Local test server did not start');
 browser=await chromium.launch({headless:process.env.SA_HEADED!=='1',...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
 for(const viewport of [{width:1440,height:900,name:'desktop'},{width:390,height:844,name:'mobile'}]){
  const page=await browser.newPage({viewport:{width:viewport.width,height:viewport.height}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/',{waitUntil:'networkidle'});await page.locator('.videocard').first().waitFor();
  assert.ok((await page.locator('.videocard').count())>=8,'Homepage video cards not rendered');
  await page.screenshot({path:path.join(output,viewport.name+'-homepage.png'),fullPage:true});
  await page.goto(base+'/categories',{waitUntil:'networkidle'});await page.locator('.chip').first().waitFor();
  await page.goto(base+'/search?q=Neon&quality=HD',{waitUntil:'networkidle'});
  await page.locator('#search-filters').waitFor();
  await page.screenshot({path:path.join(output,viewport.name+'-search.png'),fullPage:true});
  await page.goto(base+'/videos/after-hours-the-neon-edit-1',{waitUntil:'networkidle'});
  await page.locator('#video-player').waitFor();
  assert.equal(await page.locator('#playback-speed').count(),1);
  assert.equal(await page.locator('#related-grid').count(),1);
  await page.screenshot({path:path.join(output,viewport.name+'-watch.png'),fullPage:true});
  assert.deepEqual(errors,[],'Unexpected page JavaScript errors');
  await page.close();
 }
 console.log('Browser smoke tests passed; screenshots saved:',output);
}finally{
 await browser?.close();server.kill('SIGTERM');await new Promise(resolve=>setTimeout(resolve,150));
 // Screenshots are retained only when explicitly sent to a separate destination.
 if(!process.env.SA_BROWSER_SCREENSHOTS)fs.rmSync(temp,{recursive:true,force:true});
}
