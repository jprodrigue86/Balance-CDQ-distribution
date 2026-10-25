const resultName=/^charge_point_\d+_conforme_(?:vert|rouge)(?:_2)?$/;
const measured=new WeakMap();
// Normalize the native appearance canvas' transparent rounding margin. PDF.js
// rounds each bitmap up to physical pixels; the widget remains fractional CSS.
export function resultCanvasPlacementV2767({width,height,bounds,rect}){
 const w=Math.abs(rect?.[2]-rect?.[0]),h=Math.abs(rect?.[3]-rect?.[1]);
 if(!(w>1.2&&h>1.2&&width>0&&height>0)||!bounds)return null;
 const [left,top,right,bottom]=bounds;if(!(right>left&&bottom>top))return null;
 const sx=(1-1.2/w)/(right-left)*width,sy=(1-1.2/h)/(bottom-top)*height;
 // Only the simple authored solid result rectangle qualifies. Never stretch
 // an unknown/custom icon or an image masquerading as a report field.
 if(sx<.75||sx>1.25||sy<.65||sy>1.35)return null;
 return {left:(.6/w-left/width*sx)*100,top:(.6/h-top/height*sy)*100,width:sx*100,height:sy*100};
}
function inkBounds(canvas){
 if(measured.has(canvas))return measured.get(canvas);
 let bounds=null;
 try{
  const {width:w,height:h}=canvas;if(!w||!h||w*h>1e6)return null;
  const bytes=canvas.getContext('2d').getImageData(0,0,w,h).data;
  let l=w,t=h,r=0,b=0,count=0;
  for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(bytes[(y*w+x)*4+3]>128){l=Math.min(l,x);t=Math.min(t,y);r=Math.max(r,x+1);b=Math.max(b,y+1);count++;}
  if(count&&(count/((r-l)*(b-t)))>.98)bounds=[l,t,r,b];
 }catch{}
 measured.set(canvas,bounds);return bounds;
}
export function alignResultCanvasesV2767(surface,fields){
 for(const input of surface.querySelectorAll('.buttonWidgetAnnotation.checkBox input')){
  if(!resultName.test(input.name))continue;
  const raw=fields?.get?.(input.name)||fields?.[input.name],defs=Array.isArray(raw)?raw:[raw];
  const section=input.closest('section'),definition=defs.find(d=>d?.id===input.dataset.elementId)||defs[0];
  if(!section||!definition?.rect)continue;
  for(const canvas of section.querySelectorAll('canvas[data-canvas-name="checked"]')){
   const placement=resultCanvasPlacementV2767({width:canvas.width,height:canvas.height,bounds:inkBounds(canvas),rect:definition.rect});
   if(placement)for(const [name,value]of Object.entries(placement))canvas.style.setProperty(name,value+'%','important');
  }
 }
}
