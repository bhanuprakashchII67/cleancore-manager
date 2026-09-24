const CACHE_NAME='cleancore-manager-v3.8.55-r1';
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{const r=e.request,u=new URL(r.url);if(r.mode==='navigate'||/\/(app|index|sw)\.js$/.test(u.pathname)){e.respondWith(fetch(r,{cache:'no-store'}).catch(()=>caches.match(r)));return;}e.respondWith(fetch(r).then(res=>{if(res.ok&&u.origin===self.location.origin){const c=res.clone();caches.open(CACHE_NAME).then(x=>x.put(r,c));}return res;}).catch(()=>caches.match(r)));});

self.addEventListener("push",event=>{
 let data={};
 try{data=event.data?event.data.json():{}}catch{data={body:event.data?event.data.text():""};}
 const title=data.title||"CleanCore Manager";
 const options={
   body:data.body||"New Manager notification",
   tag:data.notification_id||"cleancore-manager-push",
   data:{url:data.url||"/",notification_id:data.notification_id||""},
   vibrate:[200,100,200],
   silent:false,
   renotify:true,
   requireInteraction:true
 };
 event.waitUntil((async()=>{
   try{
     await self.registration.showNotification(title,options);
   }catch(err){
     try{
       await self.registration.showNotification(title,{body:options.body,tag:options.tag,data:options.data,vibrate:options.vibrate,silent:false,renotify:true});
     }catch(_){}
   }
 })());
});
self.addEventListener("notificationclick",event=>{
 event.notification.close();
 const url=event.notification?.data?.url||"/";
 event.waitUntil(clients.matchAll({type:"window",includeUncontrolled:true}).then(list=>{
   for(const client of list){if("focus" in client)return client.focus();}
   if(clients.openWindow)return clients.openWindow(url);
 }));
});
