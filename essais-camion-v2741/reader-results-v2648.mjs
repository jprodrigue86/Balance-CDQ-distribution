// Display the PDF's own checkbox results; never reproduce its tolerance rules.
const artworkFrames=new WeakMap();
function artworkFrame(section,row){
  const canvas=section.closest('.page')?.querySelector('.canvasWrapper canvas');
  if(!canvas?.width||!canvas.height)return null;
  const a=section.getBoundingClientRect(),c=canvas.getBoundingClientRect();
  if(!a.width||!a.height||!c.width||!c.height)return null;
  const key=[row?'row':'header',section.style.left,section.style.top,section.style.width,section.style.height,canvas.width,canvas.height].join(':');
  let cache=artworkFrames.get(canvas);if(!cache){cache=new Map();artworkFrames.set(canvas,cache);}
  if(cache.has(key))return cache.get(key);
  const x=(a.left-c.left)*canvas.width/c.width,y=(a.top-c.top)*canvas.height/c.height,w=a.width*canvas.width/c.width,h=a.height*canvas.height/c.height;
  let frame=null;
  try{
    const context=canvas.getContext('2d');if(!context)return null;
    if(row){
      // Find the existing cyan border near each side of the real cell. Older
      // reports can have a checkbox rectangle shifted inside that border.
      const pad=Math.max(4,w*.12),left=Math.max(0,Math.floor(x-pad)),right=Math.min(canvas.width,Math.ceil(x+w+pad));
      const pixels=context.getImageData(left,Math.max(0,Math.min(canvas.height-1,Math.round(y+h/2))),right-left,1).data;
      const cyan=i=>pixels[i*4]<90&&pixels[i*4+1]>150&&pixels[i*4+2]>175&&pixels[i*4+3]>200;
      function edge(target){let best=null,distance=Infinity;for(let i=0;i<right-left;i++)if(cyan(i)){const start=i;while(i+1<right-left&&cyan(i+1))i++;const center=left+(start+i+1)/2,d=Math.abs(center-target);if(d<distance){distance=d;best=center;}}return best;}
      const l=edge(x),r=edge(x+w);
      if(l!==null&&r!==null&&r-l>w*.75&&r-l<w*1.25){
        const inset=Math.max(1,(r-l)*.015);
        frame={left:(l+inset-x)/w*100,top:1.5,width:(r-l-2*inset)/w*100,height:97};
      }
    }else{
      // The blue band is authoritative, rather than the shorter legacy widget.
      const top=Math.max(0,Math.floor(y-h)),bottom=Math.min(canvas.height,Math.ceil(y+2*h));
      const pixels=context.getImageData(Math.max(0,Math.min(canvas.width-1,Math.round(x+w/2))),top,1,bottom-top).data;
      const blue=i=>pixels[i*4]<70&&pixels[i*4+1]<170&&pixels[i*4+2]>140&&pixels[i*4+3]>200;
      let start=Math.round(y+h/2)-top,end=start;
      if(blue(start)){while(start>0&&blue(start-1))start--;while(end<bottom-top-1&&blue(end+1))end++;
        const center=top+(start+end+1)/2;frame={left:0,top:(center-y-h/2)/h*100,width:100,height:100};
      }
    }
  }catch(_){/* A report without readable page pixels keeps its PDF geometry. */}
  if(frame)cache.set(key,frame);return frame;
}
export function paintReaderResults(surface){
  for(const input of surface.querySelectorAll('.buttonWidgetAnnotation.checkBox input')){
    const name=input.name||'',row=/^charge_point_\d+_conforme_(vert|rouge)$/.exec(name),header=/^(bloc3|excentricite)_statut_(non_)?conforme$/.exec(name);
    if(!row&&!header)continue;
    const section=input.closest('section');if(!section)continue;
    section.classList.add('cdq-result-widget');
    let badge=section.querySelector('.cdq-result-indicator');
    if(!badge){badge=document.createElement('div');badge.className='cdq-result-indicator';badge.setAttribute('aria-hidden','true');section.append(badge);}
    const bad=!!(row?row[1]==='rouge':header[2]);
    badge.classList.toggle('bad',bad);badge.classList.toggle('row-result',!!row);badge.hidden=!input.checked;
    badge.style.fontSize=parseFloat(getComputedStyle(section).height)*.66+'px';
    const frame=artworkFrame(section,!!row);
    if(frame)for(const key of ['left','top','width','height'])badge.style[key]=frame[key]+'%';
    if(header&&!badge.childNodes.length){
      const label=document.createElement('span');label.textContent=bad?'NON CONFORME':'CONFORME';
      badge.append(label);badge.insertAdjacentHTML('beforeend','<svg viewBox="0 0 24 24" aria-hidden="true"><path d="'+(bad?'M5 5l14 14M19 5L5 19':'M4 12.5l5 5L20 6.5')+'"/></svg>');
    }
  }
}
