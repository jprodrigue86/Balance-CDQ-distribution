// Viewing transformations never modify the source sent to OCR/storage.
export function installInvoicePreviewV2783(box,image){
 box.__cdqPreviewV2783?.destroy();
 let scale=1,x=0,y=0,baseW=0,baseH=0,pinch=null;const pointers=new Map();
 const canvas=box.ownerDocument.createElement('div'),toolbar=box.ownerDocument.createElement('div');
 canvas.className='cdq-invoice-pan-v2783';toolbar.className='cdq-invoice-zoom-v2783';canvas.append(image);box.replaceChildren(canvas,toolbar);
 image.draggable=false;image.style.cssText='position:absolute;max-width:none;max-height:none;object-fit:contain;transform-origin:0 0;user-select:none;pointer-events:none';
 canvas.style.cssText='position:relative;width:100%;min-height:280px;flex:1 1 auto;overflow:hidden;touch-action:none;cursor:grab';toolbar.style.cssText='display:flex;justify-content:flex-end;padding:6px 0;flex:0 0 auto';
 box.style.position='relative';box.style.minHeight='330px';box.style.overflow='hidden';box.style.display='flex';box.style.flexDirection='column';
 function paint(){const w=canvas.clientWidth,h=canvas.clientHeight;x=Math.min(Math.max(x,Math.min(0,w-baseW*scale)),Math.max(0,w-baseW*scale));y=Math.min(Math.max(y,Math.min(0,h-baseH*scale)),Math.max(0,h-baseH*scale));image.style.width=baseW+'px';image.style.height=baseH+'px';image.style.transform=`translate(${x}px,${y}px) scale(${scale})`;canvas.setAttribute('aria-label','Photo du reçu, zoom '+Math.round(scale*100)+' %');}
 function reset(){const k=Math.min(canvas.clientWidth/(image.naturalWidth||1),canvas.clientHeight/(image.naturalHeight||1));baseW=(image.naturalWidth||1)*k;baseH=(image.naturalHeight||1)*k;scale=1;x=(canvas.clientWidth-baseW)/2;y=(canvas.clientHeight-baseH)/2;paint();}
 function zoom(next,cx=canvas.clientWidth/2,cy=canvas.clientHeight/2){next=Math.max(1,Math.min(8,next));const ratio=next/scale;x=cx-(cx-x)*ratio;y=cy-(cy-y)*ratio;scale=next;paint();}
 for(const [label,fn]of [['Afficher toute la photo',reset]]){const b=box.ownerDocument.createElement('button');b.type='button';b.textContent=label;b.setAttribute('aria-label',label==='+'?'Agrandir la photo':label==='−'?'Réduire la photo':'Afficher toute la photo');b.style.cssText='min-width:42px;min-height:42px;background:#142b3e;color:white;border:1px solid #59c9ee;border-radius:8px';b.onclick=fn;toolbar.append(b);}
 const point=e=>{const r=canvas.getBoundingClientRect();return {x:e.clientX-r.left,y:e.clientY-r.top};};
 const distance=()=>{const p=[...pointers.values()];return Math.hypot(p[1].x-p[0].x,p[1].y-p[0].y);};
 canvas.onpointerdown=e=>{if(e.button>0)return;e.preventDefault();pointers.set(e.pointerId,point(e));canvas.setPointerCapture?.(e.pointerId);if(pointers.size===2)pinch={distance:distance()};};
 canvas.onpointermove=e=>{if(!pointers.has(e.pointerId))return;e.preventDefault();const old=pointers.get(e.pointerId),p=point(e);pointers.set(e.pointerId,p);if(pointers.size===2){const pts=[...pointers.values()],d=distance();if(pinch?.distance>0)zoom(scale*d/pinch.distance,(pts[0].x+pts[1].x)/2,(pts[0].y+pts[1].y)/2);pinch={distance:d};}else if(pointers.size===1){x+=p.x-old.x;y+=p.y-old.y;paint();}};
 const end=e=>{pointers.delete(e.pointerId);pinch=null;};canvas.onpointerup=end;canvas.onpointercancel=end;canvas.onlostpointercapture=end;
 const wheel=e=>{e.preventDefault();const p=point(e);zoom(scale*Math.exp(-e.deltaY*.002),p.x,p.y);};canvas.addEventListener('wheel',wheel,{passive:false});canvas.ondblclick=e=>{const p=point(e);zoom(scale>1?1:2,p.x,p.y);};
 image.addEventListener('load',reset);const observer=typeof ResizeObserver==='function'?new ResizeObserver(reset):null;observer?.observe(box);reset();
 const api={reset,zoom,state:()=>({scale,x,y,baseW,baseH}),destroy(){observer?.disconnect();image.removeEventListener('load',reset);pointers.clear();canvas.removeEventListener('wheel',wheel);}};box.__cdqPreviewV2783=api;return api;
}
