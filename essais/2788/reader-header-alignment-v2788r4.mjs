// Align only native header appearance canvases to the existing blue artwork.
// The PDF fields and /AP streams remain untouched. Old DOM badges are excluded.
const HEADER=/^(?:(?:bloc3|excentricite)_statut_(?:non_)?conforme|Bouton_(?:Conforme|NonConforme))$/;
const measured=new WeakMap();
function headerInkBounds(canvas){
 if(measured.has(canvas))return measured.get(canvas);
 let bounds=null;
 try {const w=canvas.width,h=canvas.height;if(!w||!h||w*h>1e6)return null;
  const a=canvas.getContext('2d').getImageData(0,0,w,h).data;let l=w,t=h,r=0,b=0,n=0;
  for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(a[(y*w+x)*4+3]>128){l=Math.min(l,x);t=Math.min(t,y);r=Math.max(r,x+1);b=Math.max(b,y+1);n++;}
  if(n&&n/((r-l)*(b-t))>.75)bounds=[l,t,r,b];
 }catch{}
 measured.set(canvas,bounds);return bounds;
}
function headerArtworkFrame(section,definition){
 const page=section.closest('.page'),canvas=page?.querySelector('.canvasWrapper canvas');if(!canvas?.width||!canvas.height)return null;
 const s=section.getBoundingClientRect(),c=canvas.getBoundingClientRect();if(!(s.width>0&&s.height>0&&c.width>0&&c.height>0))return null;
 const w=definition.rect[2]-definition.rect[0],h=definition.rect[3]-definition.rect[1];
 if(!(w>60&&h>10&&h<30))return null;
 const sx=canvas.width/c.width,sy=canvas.height/c.height,x=Math.round((s.left-c.left-12*s.width/w)*sx),y=(s.top-c.top)*sy,hh=s.height*sy;
 if(x<0||x>=canvas.width)return null;
 const lo=Math.max(0,Math.floor(y-hh*.35)),hi=Math.min(canvas.height,Math.ceil(y+hh*1.35));
 try {const a=canvas.getContext('2d').getImageData(x,lo,1,hi-lo).data,blue=i=>i>=0&&i<hi-lo&&a[i*4]<80&&a[i*4+1]<140&&a[i*4+2]>80&&a[i*4+2]>a[i*4]*1.3;
  let t=Math.round(y+hh/2)-lo,b=t;if(!blue(t))return null;
  while(blue(t-1))t--;while(blue(b+1))b++;
  // Include only bounded header runs near the authored native rectangle.
  const top=c.top+(lo+t)/sy,bottom=c.top+(lo+b+1)/sy;
  if(Math.abs(top-s.top)>s.height*.12||Math.abs(bottom-s.bottom)>s.height*.12)return null;
  return {top:(top-s.top)/s.height,height:(bottom-top)/s.height};
 }catch{return null;}
}
export function alignHeaderCanvasesV2788R4(surface,fields){
 if(surface?.dataset.cdqT05!=='true'||!surface.querySelector('input[name^="_cdq_visual_"]'))return;
 for(const input of surface.querySelectorAll('.buttonWidgetAnnotation.checkBox input')){
  if(!HEADER.test(input.name))continue;
  const raw=fields?.get?.(input.name)||fields?.[input.name],defs=Array.isArray(raw)?raw:[raw],section=input.closest('section');
  const d=defs.find(d=>d?.id===input.dataset.elementId)||defs[0];if(!section||!d?.rect||section.classList.contains('cdq-result-widget'))continue;
  const frame=headerArtworkFrame(section,d);if(!frame)continue;
  for(const canvas of section.querySelectorAll('canvas[data-canvas-name="checked"]')){
   const bounds=headerInkBounds(canvas);if(!bounds)continue;const[l,t,r,b]=bounds;
   const xs=canvas.width/(r-l),ys=frame.height*canvas.height/(b-t);
   if(xs<.98||xs>1.08||ys<.88||ys>1.14)continue;
   const placement={left:-l/(r-l)*100,top:(frame.top-t/canvas.height*ys)*100,width:xs*100,height:ys*100};
   for(const[k,v]of Object.entries(placement))canvas.style.setProperty(k,v+'%','important');
  }
 }
}
