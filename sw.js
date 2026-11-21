const CACHE="detodito-public-v2026-11-21";
const STATIC=["./","./index.html","./styles.css","./pwa.css","./pwa.js","./script.js","./manifest.webmanifest","./icon-192.png","./icon-512.png","./assets/logo-detodito.png"];
self.addEventListener("install",event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(STATIC)).then(()=>self.skipWaiting()));});
self.addEventListener("activate",event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));});
self.addEventListener("fetch",event=>{
 const req=event.request,url=new URL(req.url);
 if(req.method!=="GET"||url.origin!==self.location.origin)return;
 if(/vintedgo|admin|supabase|auth|qr|token/i.test(url.pathname))return;
 if(req.mode==="navigate"){event.respondWith(fetch(req).catch(()=>caches.match(req)));return;}
 event.respondWith(caches.match(req).then(hit=>hit||fetch(req).then(res=>{if(res.ok&&res.type==="basic"){const copy=res.clone();caches.open(CACHE).then(c=>c.put(req,copy));}return res;})));
});
