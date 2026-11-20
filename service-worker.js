const CACHE='crm-clientes-v9';
const ASSETS=['./','./index.html','./styles.css','./app.js','./firebase.js','./manifest.json','./icon.svg','./icon-192.png','./icon-512.png','./icon-maskable-512.png','./apple-touch-icon.png'];
const SDK='https://www.gstatic.com/firebasejs/';
const SDK_CACHE='firebase-sdk-10.12.2'; // no se borra al publicar una versión nueva de la app
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS))));
self.addEventListener('message',event=>{if(event.data==='SKIP_WAITING')self.skipWaiting();});
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE&&k!==SDK_CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
  const r=event.request;if(r.method!=='GET')return;
  const sameOrigin=new URL(r.url).origin===self.location.origin,sdk=r.url.startsWith(SDK);
  // Las conexiones de Firebase (Firestore, login) no pasan por la caché.
  if(!sameOrigin&&!sdk)return;
  event.respondWith(caches.match(r).then(cached=>cached||fetch(r).then(res=>{
    // El SDK de Firebase se guarda tras la primera descarga (también respuestas "opaque" de <script>).
    if(res&&(res.ok||(sdk&&res.type==='opaque'))){const copy=res.clone();caches.open(sdk?SDK_CACHE:CACHE).then(c=>c.put(r,copy));}
    return res;
  }).catch(()=>r.mode==='navigate'?caches.match('./index.html'):Response.error())));
});
