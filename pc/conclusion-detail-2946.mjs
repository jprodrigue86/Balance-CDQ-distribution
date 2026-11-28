// Shared by the live annotation and the PDF appearance. The document itself
// draws both captions and the cyan separator. Coordinates are in PDF points.
export function conclusionRows(value,width,height,measure){
  const text=String(value??'').replace(/\r\n?/g,'\n');
  if(!text.trim())return [];
  const match=/^Corrigés\s*:\s*([^\n]*)\nNon corrigés\s*:\s*([\s\S]*)$/u.exec(text);
  if(!match)return null;
  return ['Corrigés :','Non corrigés :'].map((caption,index)=>{
    const body=match[index+1].trim();
    const x=5+measure(caption,9.5);
    const size=Math.min(9.5,9.5*(width-x-3)/Math.max(1,measure(body,9.5)));
    return {text:body,x,y:height*(index+.5)/2+size*.341796875,size};
  });
}

export function showConclusionRows(field,width,height,measure){
  const parent=field.closest('section');
  const rows=conclusionRows(field.value,width,height,measure);
  let svg=parent.querySelector('svg[data-conclusion-values]');
  if(!rows){svg?.remove();field.style.removeProperty('opacity');return false;}
  if(!svg){
    svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
    svg.setAttribute('data-conclusion-values','');svg.setAttribute('aria-hidden','true');
    svg.style.cssText='position:absolute;inset:0;width:100%;height:100%;pointer-events:none;overflow:hidden;';
    parent.append(svg);
  }
  const key=JSON.stringify([width,height,rows]);
  if(svg.dataset.geometry!==key){
    svg.setAttribute('viewBox',[0,0,width,height].join(' '));
    svg.replaceChildren(...rows.map(row=>{
      const label=document.createElementNS(svg.namespaceURI,'text');
      for(const [k,v] of Object.entries({x:row.x,y:row.y,'font-size':row.size,'font-family':'CDQForm2918, sans-serif','font-weight':700,fill:'black'}))label.setAttribute(k,v);
      label.textContent=row.text;return label;
    }));
    svg.dataset.geometry=key;
  }
  if(field.style.opacity!=='0')field.style.setProperty('opacity','0','important');
  return true;
}
