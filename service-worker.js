const CACHE='crm-inmobiliario-v7';
const ASSETS=['./','./index.html','./styles.css','./app.js','./stage3.js','./stage4.js','./stage5.js','./stage6.js','./firebase.js','./manifest.json','./icon.svg','./icon-192.png','./icon-512.png','./icon-maskable-512.png','./apple-touch-icon.png'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS))));
self.addEventListener('message',event=>{if(event.data==='SKIP_WAITING')self.skipWaiting();});
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{const r=event.request;if(r.method!=='GET')return;event.respondWith(caches.match(r).then(cached=>cached||fetch(r).then(res=>{if(res&&res.ok&&new URL(r.url).protocol.startsWith('http')){const copy=res.clone();caches.open(CACHE).then(c=>c.put(r,copy));}return res;}).catch(()=>r.mode==='navigate'?caches.match('./index.html'):Response.error())));});
