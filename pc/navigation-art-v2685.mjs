// Existing bitmap artwork, clipped from one local image. This is not vector conversion.
const atlas={"width":1536,"height":1296,"styles":{"current":[{"x":306,"y":5,"crop":82,"width":1536,"height":1024,"source":"original"},{"x":515,"y":5,"crop":82,"width":1536,"height":1024,"source":"original"},{"x":721,"y":5,"crop":82,"width":1536,"height":1024,"source":"original"},{"x":928,"y":5,"crop":82,"width":1536,"height":1024,"source":"original"},{"x":1136,"y":5,"crop":82,"width":1536,"height":1024,"source":"original"},{"x":1357,"y":5,"crop":82,"width":1536,"height":1024,"source":"original"}],"minimal":[{"x":172,"y":260,"crop":116},{"x":396,"y":260,"crop":116},{"x":623,"y":260,"crop":116},{"x":851,"y":260,"crop":116},{"x":1078,"y":260,"crop":116},{"x":1302,"y":260,"crop":116}],"dark-pro":[{"x":154,"y":400,"crop":152},{"x":378,"y":400,"crop":152},{"x":605,"y":400,"crop":152},{"x":833,"y":400,"crop":152},{"x":1060,"y":400,"crop":152},{"x":1284,"y":400,"crop":152}],"metal-music":[{"x":44,"y":119,"crop":320,"width":1448,"height":1086,"asset":"assets/navigation-v2701/icons.png","key":"home"},{"x":372,"y":559,"crop":164},{"x":396,"y":119,"crop":320,"width":1448,"height":1086,"asset":"assets/navigation-v2701/icons.png","key":"folder"},{"x":44,"y":575,"crop":320,"width":1448,"height":1086,"asset":"assets/navigation-v2701/icons.png","key":"inventory"},{"x":396,"y":575,"crop":320,"width":1448,"height":1086,"asset":"assets/navigation-v2701/icons.png","key":"invoices"},{"x":1095,"y":575,"crop":320,"width":1448,"height":1086,"asset":"assets/navigation-v2701/icons.png","key":"trash"}],"isometric":[{"x":148,"y":720,"crop":164},{"x":372,"y":720,"crop":164},{"x":599,"y":720,"crop":164},{"x":827,"y":720,"crop":164},{"x":1054,"y":720,"crop":164},{"x":1278,"y":720,"crop":164}]},"extras":{"calibration":{"x":742,"y":119,"crop":320,"width":1448,"height":1086,"asset":"assets/navigation-v2701/icons.png","key":"calibration"},"calcul":{"x":1095,"y":119,"crop":320,"width":1448,"height":1086,"asset":"assets/navigation-v2701/icons.png","key":"calcul"},"opportunities":{"x":742,"y":575,"crop":320,"width":1448,"height":1086,"asset":"assets/navigation-v2701/icons.png","key":"opportunities"},"drive":{"x":796,"y":1036,"crop":256},"home":{"x":44,"y":119,"crop":320,"width":1448,"height":1086,"asset":"assets/navigation-v2701/icons.png","key":"home"},"folder":{"x":396,"y":119,"crop":320,"width":1448,"height":1086,"asset":"assets/navigation-v2701/icons.png","key":"folder"},"inventory":{"x":44,"y":575,"crop":320,"width":1448,"height":1086,"asset":"assets/navigation-v2701/icons.png","key":"inventory"},"invoices":{"x":396,"y":575,"crop":320,"width":1448,"height":1086,"asset":"assets/navigation-v2701/icons.png","key":"invoices"},"trash":{"x":1095,"y":575,"crop":320,"width":1448,"height":1086,"asset":"assets/navigation-v2701/icons.png","key":"trash"}}};
const source=new URL('./assets/navigation-v2685/icons.webp',import.meta.url).href;
const rendered=new Map(),pending=new Map(),sheets=new Map();
function loadSheet(asset){
  if(!sheets.has(asset))sheets.set(asset,(async()=>{const image=new Image();image.src=new URL('./'+asset,import.meta.url).href;await image.decode();return image;})());
  return sheets.get(asset);
}
function tileUrl(key){
  if(rendered.has(key))return Promise.resolve(rendered.get(key));
  if(pending.has(key))return pending.get(key);
  const task=(async()=>{
    const tile=atlas.extras[key],image=await loadSheet(tile.asset||'assets/navigation-v2685/icons.webp'),canvas=document.createElement('canvas');
    canvas.width=canvas.height=tile.crop;
    canvas.getContext('2d').drawImage(image,tile.x,tile.y,tile.crop,tile.crop,0,0,tile.crop,tile.crop);
    const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
    if(!blob)throw Error('Navigation artwork cannot be prepared');
    const url=URL.createObjectURL(blob);rendered.set(key,url);return url;
  })();pending.set(key,task);return task;
}
export async function prepareSharedNavigationArtV2685(root=document){
  await Promise.all([...root.querySelectorAll('img[data-cdq-shared-icon-v2685]')].map(async image=>{
    const url=await tileUrl(image.dataset.cdqSharedIconV2685);
    if(image.src===url&&image.complete&&image.naturalWidth)return;
    if(image.src!==url)image.src=url;await image.decode();
  }));
}
window.cdqPrepareNavigationArtV2685=prepareSharedNavigationArtV2685;
let scheduled=false;
new MutationObserver(records=>{
  const containsArtwork=node=>node.nodeType===1&&(node.matches('img[data-cdq-shared-icon-v2685]')||node.querySelector('img[data-cdq-shared-icon-v2685]'));
  if(!records.some(r=>[...r.addedNodes].some(containsArtwork))||scheduled)return;
  scheduled=true;queueMicrotask(()=>{scheduled=false;prepareSharedNavigationArtV2685().catch(()=>{});});
}).observe(document.documentElement,{childList:true,subtree:true});
export function sharedNavigationIconV2685(key,className,attribute,size=32){
  const tile=atlas.extras[key];if(!tile)throw Error('Unknown navigation artwork: '+key);
  const dimensions=Number(size);
  const artwork=tile.asset?new URL('./'+tile.asset,import.meta.url).href:source;
  return '<img class="'+className+'" '+attribute+'="metal-music" data-cdq-shared-icon-v2685="'+key+'" data-cdq-art-src-v2685="'+artwork+'"'+(rendered.has(key)?' src="'+rendered.get(key)+'"':'')+' width="'+dimensions+'" height="'+dimensions+'" alt="" aria-hidden="true" draggable="false">';
}
