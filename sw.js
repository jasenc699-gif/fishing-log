const CACHE='fishinglog-v37', TILE_CACHE='fishinglog-tiles-v1', MAX_TILES=300;
const CORE=['./','./index.html','./manifest.json','./icon-192.png','./icon-512.png',
 './vendor/leaflet.js','./vendor/leaflet.css','./vendor/leaflet.markercluster.js','./vendor/MarkerCluster.css','./vendor/MarkerCluster.Default.css','./vendor/exifr.js','./vendor/leaflet-heat.js','./vendor/fonts/inter.woff2',
 './vendor/images/marker-icon.png','./vendor/images/marker-icon-2x.png','./vendor/images/marker-shadow.png','./vendor/images/layers.png','./vendor/images/layers-2x.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>Promise.allSettled(CORE.map(a=>c.add(new Request(a,{cache:'reload'}))))));self.skipWaiting();});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==CACHE&&x!==TILE_CACHE).map(x=>caches.delete(x)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{
  const req=e.request,url=req.url;
  if(req.method!=='GET')return;
  if(url.includes('tile.openstreetmap.org')||url.includes('tiles.')||url.includes('/tile/')){
    e.respondWith(caches.open(TILE_CACHE).then(async c=>{const hit=await c.match(req);if(hit)return hit;
      try{const res=await fetch(req);if(res.ok||res.type==='opaque'){const keys=await c.keys();if(keys.length>=MAX_TILES)await Promise.all(keys.slice(0,Math.floor(MAX_TILES*.1)).map(k=>c.delete(k)));c.put(req,res.clone());}return res;}catch{return new Response('',{status:503});}}));
    return;}
  if(!url.startsWith(self.location.origin)){e.respondWith(fetch(req).catch(()=>new Response('',{status:503})));return;}
  // libraries, fonts, icons: cache-first (they never change between releases)
  if(/\/vendor\/|icon-\d+\.png/.test(url)){
    e.respondWith(caches.open(CACHE).then(async c=>{const hit=await c.match(req);if(hit)return hit;const r=await fetch(req);if(r.ok)c.put(req,r.clone());return r;}));return;}
  // the app itself: network-first so a new version shows on the very next load; cached copy if offline or slow
  e.respondWith((async()=>{const c=await caches.open(CACHE);
    try{const r=await Promise.race([fetch(req.mode==='navigate'?req.url:req,{cache:'no-cache'}),new Promise((_,no)=>setTimeout(no,4000))]);if(r&&r.ok){c.put(req,r.clone());return r;}throw 0;}
    catch(x){return (await c.match(req,{ignoreSearch:true}))||(await c.match('./index.html'));}})());
});
