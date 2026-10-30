// Viewing transformations never modify the source sent to OCR/storage.
export function installInvoicePreviewV2783(box,image){
 box.__cdqPreviewV2783?.destroy();
 let scale=1,x=0,y=0,baseW=0,baseH=0,pinch=null,lastW=0,lastH=0;const pointers=new Map();
 const canvas=box.ownerDocument.createElement('div'),originalStyle=box.getAttribute('style');
 canvas.className='cdq-invoice-pan-v2783';canvas.append(image);box.replaceChildren(canvas);
 image.draggable=false;image.style.cssText='position:absolute;max-width:none;max-height:none;object-fit:contain;transform-origin:0 0;user-select:none;pointer-events:none';
 canvas.style.cssText='position:relative;width:100%;height:100%;min-height:280px;overflow:hidden;touch-action:none;cursor:grab';
 canvas.tabIndex=0;canvas.setAttribute('role','img');canvas.setAttribute('aria-label','Photo du reçu. Pincez avec deux doigts pour zoomer ou dézoomer.');
 box.style.position='relative';box.style.minHeight='280px';box.style.overflow='hidden';box.style.display='block';
 function paint(){const w=canvas.clientWidth,h=canvas.clientHeight;
  x=baseW*scale<=w?(w-baseW*scale)/2:Math.min(0,Math.max(w-baseW*scale,x));
  y=baseH*scale<=h?(h-baseH*scale)/2:Math.min(0,Math.max(h-baseH*scale,y));
  image.style.width=baseW+'px';image.style.height=baseH+'px';image.style.transform=`translate(${x}px,${y}px) scale(${scale})`;
 }
 function fit(preserve=false){const w=canvas.clientWidth,h=canvas.clientHeight;if(!w||!h||!image.naturalWidth||!image.naturalHeight)return;
  const same=w===lastW&&h===lastH;if(preserve&&same)return;
  const cx=baseW?((lastW/2-x)/(baseW*scale)):.5,cy=baseH?((lastH/2-y)/(baseH*scale)):.5;
  const k=Math.min(w/image.naturalWidth,h/image.naturalHeight);baseW=image.naturalWidth*k;baseH=image.naturalHeight*k;
  if(!preserve)scale=1;x=w/2-cx*baseW*scale;y=h/2-cy*baseH*scale;lastW=w;lastH=h;paint();
 }
 function reset(){fit(false);}
 function zoom(next,cx=canvas.clientWidth/2,cy=canvas.clientHeight/2){next=Math.max(1,Math.min(8,next));const ratio=next/scale;x=cx-(cx-x)*ratio;y=cy-(cy-y)*ratio;scale=next;paint();}
 const point=e=>{const r=canvas.getBoundingClientRect();return {x:e.clientX-r.left,y:e.clientY-r.top};};
 const pair=()=>{const p=[...pointers.values()];return {distance:Math.hypot(p[1].x-p[0].x,p[1].y-p[0].y),x:(p[0].x+p[1].x)/2,y:(p[0].y+p[1].y)/2};};
 canvas.onpointerdown=e=>{if(e.button>0||pointers.size>=2)return;e.preventDefault();pointers.set(e.pointerId,point(e));try{canvas.setPointerCapture(e.pointerId);}catch(_){}if(pointers.size===2)pinch=pair();};
 canvas.onpointermove=e=>{if(!pointers.has(e.pointerId))return;e.preventDefault();const old=pointers.get(e.pointerId),p=point(e);pointers.set(e.pointerId,p);
  if(pointers.size===2){const next=pair();if(pinch?.distance>0){const target=Math.max(1,Math.min(8,scale*next.distance/pinch.distance)),ratio=target/scale;x=next.x-(pinch.x-x)*ratio;y=next.y-(pinch.y-y)*ratio;scale=target;paint();}pinch=next;}
  else{x+=p.x-old.x;y+=p.y-old.y;paint();}
 };
 const end=e=>{pointers.delete(e.pointerId);pinch=null;};canvas.onpointerup=end;canvas.onpointercancel=end;canvas.onlostpointercapture=end;
 const wheel=e=>{e.preventDefault();const p=point(e);zoom(scale*Math.exp(-e.deltaY*.002),p.x,p.y);};canvas.addEventListener('wheel',wheel,{passive:false});canvas.ondblclick=e=>{const p=point(e);zoom(scale>1?1:2,p.x,p.y);};
 canvas.onkeydown=e=>{if(['+','=','-','0'].includes(e.key)){e.preventDefault();e.key==='0'?reset():zoom(scale*(e.key==='-'?.8:1.25));}};
 image.addEventListener('load',reset);const observer=typeof ResizeObserver==='function'?new ResizeObserver(()=>fit(true)):null;observer?.observe(canvas);reset();
 const api={reset,zoom,state:()=>({scale,x,y,baseW,baseH}),destroy(){observer?.disconnect();image.removeEventListener('load',reset);pointers.clear();canvas.removeEventListener('wheel',wheel);canvas.onpointerdown=canvas.onpointermove=canvas.onpointerup=canvas.onpointercancel=canvas.onlostpointercapture=canvas.ondblclick=canvas.onkeydown=null;if(originalStyle===null)box.removeAttribute('style');else box.setAttribute('style',originalStyle);delete box.__cdqPreviewV2783;}};box.__cdqPreviewV2783=api;return api;
}
