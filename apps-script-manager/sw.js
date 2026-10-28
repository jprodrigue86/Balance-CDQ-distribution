// V59: strict asset caching. A missing .mjs MUST NOT receive index.html.
const CACHE='cdq-apps-script-manager-v59-safe-qa';
const ASSETS=[
  './','index.html','style.css?v=59','api.js?v=59','jszip.min.js?v=23',
  'app.js?v=59','diagnostics.js?v=59','diagnostics.css?v=59',
  'update-check.js?v=59','version.json','local-tests-v59.mjs','regressions-v59.mjs',
  'qa-automation-v59.mjs','verified-modules-v59.mjs','manifest.webmanifest','icon-industrial.svg',
  'icon-192.png','icon-512.png'
];
self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys()
    .then(keys=>Promise.all(keys.filter(k=>k.startsWith('cdq-apps-script-manager-')&&k!==CACHE).map(k=>caches.delete(k))))
    .then(()=>self.clients.claim()));
});
self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET')return;
  const url=new URL(request.url);
  if(url.origin!==self.location.origin)return;
  // Never cache auth responses; keep the Manager's public static files only.
  if(!url.pathname.includes('/apps-script-manager/')||url.searchParams.has('cdq_diag'))return;
  const isNav=request.mode==='navigate',isModule=/\.(?:mjs|js)(?:$)/.test(url.pathname)||
    request.destination==='script';
  let cacheCopy=null;
  const responseTask=(async()=>{
    try{
      const response=await fetch(request,{cache:'no-store'});
      if(!response.ok)throw Error('ASSET_HTTP_'+response.status);
      cacheCopy=response.clone();
      return response;
    }catch(_){
      const cache=await caches.open(CACHE);
      const old=await cache.match(request);
      if(old)return old;
      if(isNav)return (await cache.match('./'))||Response.error();
      // Important: never respond to a missing JS/PDF with 200 index.html.
      if(isModule)return Response.error();
      return Response.error();
    }
  })();
  event.respondWith(responseTask);
  // waitUntil must be registered synchronously while the fetch event is active.
  event.waitUntil(responseTask.then(async()=>{
    if(cacheCopy)await caches.open(CACHE).then(cache=>cache.put(request,cacheCopy));
  }).catch(()=>{}));
});
