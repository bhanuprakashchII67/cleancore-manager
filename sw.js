// CleanCore Manager service worker: push/Pusher disabled.
const CACHE_NAME='cleancore-manager-v3.8.83';
self.addEventListener('install',e=>e.waitUntil(self.skipWaiting()));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
 const r=e.request,u=new URL(r.url);
 if(r.mode==='navigate'||/\\.(html?|css|js)$/.test(u.pathname)){
   e.respondWith(fetch(r,{cache:'no-store'}).catch(()=>caches.match(r)));
   return;
 }
 e.respondWith(fetch(r).catch(()=>caches.match(r)));
});
