#!/usr/bin/env node
/** Guard the local prototype from accidentally enabling public indexing or unreviewed launch. */
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const robots=fs.readFileSync(path.join(root,'public/robots.txt'),'utf8');
const sitemap=fs.readFileSync(path.join(root,'public/sitemap.xml'),'utf8');
const server=fs.readFileSync(path.join(root,'src/server.js'),'utf8');
const checks={robotsDisallowAll:/^Disallow:\s*\/\s*$/m.test(robots),emptyPublicSitemap:/<urlset[^>]*><\/urlset>/s.test(sitemap),failClosedServer:server.includes("SA_PUBLIC_CONTENT_MODE==='1'"),privateMediaProtection:server.includes('requirePrivateViewer(currentUser(req))')};
if(Object.values(checks).some(v=>!v)){console.error(JSON.stringify(checks,null,2));process.exitCode=1}
else console.log(JSON.stringify({ok:true,checks},null,2));
