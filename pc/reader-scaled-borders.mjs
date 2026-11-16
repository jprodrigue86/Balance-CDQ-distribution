// PDF.js uses fixed CSS borders for editable widgets. Chromium rounds those
// borders to whole CSS pixels even on high-density screens. A single SVG
// stroke in PDF coordinates scales with the document without that minimum.
export function replaceWidgetBorder(container,data){
 if(!['Tx','Ch'].includes(data?.fieldType)||!data.rect||data.rotation||data.borderStyle?.style!==1||!data.borderColor)return false;
 const line=Number(data.borderStyle.width),[x1,y1,x2,y2]=data.rect,w=Math.abs(x2-x1),h=Math.abs(y2-y1);
 if(![line,w,h].every(Number.isFinite)||line<=0||line>20||w<=line||h<=line)return false;
 if(container.querySelector(':scope > .cdq-widget-border-v2884'))return false;
 const ns='http://www.w3.org/2000/svg',svg=container.ownerDocument.createElementNS(ns,'svg'),rect=container.ownerDocument.createElementNS(ns,'rect');
 svg.classList.add('cdq-widget-border-v2884');svg.setAttribute('viewBox',`0 0 ${w} ${h}`);svg.setAttribute('preserveAspectRatio','none');svg.setAttribute('aria-hidden','true');svg.setAttribute('focusable','false');
 svg.style.cssText='position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:1;overflow:visible;';
 rect.setAttribute('x',String(line/2));rect.setAttribute('y',String(line/2));rect.setAttribute('width',String(w-line));rect.setAttribute('height',String(h-line));rect.setAttribute('fill','none');rect.setAttribute('stroke','currentColor');rect.setAttribute('stroke-width',String(line));
 // PDF.js writes updated stroke colours to this same style property. Inherit
// it so script-driven colours continue to follow the existing owner.
 svg.style.color=container.style.borderColor;
 svg.append(rect);container.append(svg);container.style.borderWidth='0px';return true;
}
export function scaleWidgetBorders(surface,annotations){
 const map=new Map(annotations.map(a=>[a.id,a]));let changed=0;
 for(const el of surface.querySelectorAll('.textWidgetAnnotation,.choiceWidgetAnnotation'))if(replaceWidgetBorder(el,map.get(el.dataset.annotationId)))changed++;
 return changed;
}
