/** Optional pinned HLS.js bundling. No CDN injected at runtime. */
import fs from 'node:fs';import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const pkg=path.join(root,'node_modules','hls.js','package.json');
if(!fs.existsSync(pkg))throw Error('First run npm install --no-save --package-lock=false hls.js@1.7.3');
const version=JSON.parse(fs.readFileSync(pkg,'utf8')).version;
if(version!=='1.7.3')throw Error(`Expected reviewed hls.js@1.7.3; found ${version}`);
const source=path.join(root,'node_modules','hls.js','dist','hls.min.js');
const dest=path.join(root,'public','assets','vendor','hls.min.js');
fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(source,dest);
fs.copyFileSync(path.join(root,'node_modules','hls.js','LICENSE'),path.join(root,'public','assets','vendor','HLS-LICENSE.txt'));
console.log('Bundled hls.js 1.7.3 at',dest);
