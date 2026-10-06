// Paint white, edge-connected catalogue backdrops on black. Never alter the
// supplier asset, coloured pixels, enclosed labels, or technicians' photographs.
export function clearCatalogueBackdropV2699(data,width,height){
 const count=width*height,seen=new Uint8Array(count),stack=new Int32Array(count);let tail=0;
 const white=i=>{const p=i*4,r=data[p],g=data[p+1],b=data[p+2];return data[p+3]>0&&Math.min(r,g,b)>=242&&Math.max(r,g,b)-Math.min(r,g,b)<=14;};
 function add(i){if(i<0||i>=count||seen[i]||!white(i))return;seen[i]=1;stack[tail++]=i;}
 for(let x=0;x<width;x++){add(x);add((height-1)*width+x);}for(let y=1;y<height-1;y++){add(y*width);add(y*width+width-1);}
 let removed=0;while(tail){const i=stack[--tail];data[i*4+3]=0;removed++;const x=i%width;if(x>0)add(i-1);if(x<width-1)add(i+1);add(i-width);add(i+width);}
 return removed;
}
const cache=new Map(),seen=new WeakSet();
function remember(source,result){if(cache.size>=32)cache.delete(cache.keys().next().value);cache.set(source,result);}
function paint(img){
 if(seen.has(img)||!img.complete||!img.naturalWidth)return;
 const source=img.currentSrc||img.src;if(!/\/assets\/inventory-v\d+\//.test(source))return;seen.add(img);
 if(cache.has(source)){const result=cache.get(source);if(result){img.dataset.cdqCatalogueSourceV2699=source;img.src=result;}return;}
 try{
  const canvas=document.createElement('canvas');canvas.width=img.naturalWidth;canvas.height=img.naturalHeight;if(canvas.width*canvas.height>2000000)return;
  const context=canvas.getContext('2d',{willReadFrequently:true});context.drawImage(img,0,0);
  const corners=[[0,0],[canvas.width-1,0],[0,canvas.height-1],[canvas.width-1,canvas.height-1]];
  // Cache already transparent artwork without allocating a full pixel buffer.
  if(corners.some(([x,y])=>context.getImageData(x,y,1,1).data[3]<128)){remember(source,null);return;}
  const image=context.getImageData(0,0,canvas.width,canvas.height),pixels=image.data;
  if(!clearCatalogueBackdropV2699(pixels,canvas.width,canvas.height)){remember(source,null);return;}
  context.putImageData(image,0,0);const result=canvas.toDataURL('image/png');remember(source,result);img.dataset.cdqCatalogueSourceV2699=source;img.src=result;
 }catch{/* Cross-origin photographs retain their original pixels on the black frame. */}
}
function scan(node=document){for(const img of node.querySelectorAll?.('#cdqInventoryModernV2592 [data-photo] img')||[])paint(img);}
if(typeof document!=='undefined'){
 document.addEventListener('load',e=>{if(e.target instanceof HTMLImageElement&&e.target.closest('#cdqInventoryModernV2592 [data-photo]'))paint(e.target);},true);
 const start=()=>{scan();new MutationObserver(records=>{if(records.some(r=>r.addedNodes.length))scan();}).observe(document.body,{childList:true,subtree:true});};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
}
