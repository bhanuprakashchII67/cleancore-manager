const CACHE_NAME='cleancore-manager-v3.8.15';
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{const r=e.request,u=new URL(r.url);if(r.mode==='navigate'||/\/(app|index|sw)\.js$/.test(u.pathname)){e.respondWith(fetch(r,{cache:'no-store'}).catch(()=>caches.match(r)));return;}e.respondWith(fetch(r).then(res=>{if(res.ok&&u.origin===self.location.origin){const c=res.clone();caches.open(CACHE_NAME).then(x=>x.put(r,c));}return res;}).catch(()=>caches.match(r)));});
