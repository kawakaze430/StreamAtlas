// Offline shell only. Never store any API, media, user content or verification response.
const STATIC_CACHE='streamatlas-safe-shell-v1';
const STATIC_FILES=['/offline.html','/styles.css','/assets/favicon.svg'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(STATIC_CACHE).then(cache=>cache.addAll(STATIC_FILES)));self.skipWaiting()});
self.addEventListener('activate',event=>{event.waitUntil(Promise.all([caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==STATIC_CACHE).map(k=>caches.delete(k)))),self.clients.claim()]))});
self.addEventListener('fetch',event=>{const r=event.request;if(r.mode!=='navigate'||r.method!=='GET')return;const path=new URL(r.url).pathname;if(path.startsWith('/api/')||path.startsWith('/assets/')||path.startsWith('/admin')||path.startsWith('/studio'))return;event.respondWith(fetch(r).catch(()=>caches.match('/offline.html')))})
