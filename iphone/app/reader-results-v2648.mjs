// Display the PDF's own checkbox results; never reproduce its tolerance rules.
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
    badge.style.fontSize=section.getBoundingClientRect().height*.66+'px';
    if(header&&!badge.childNodes.length){
      const label=document.createElement('span');label.textContent=bad?'NON CONFORME':'CONFORME';
      badge.append(label);badge.insertAdjacentHTML('beforeend','<svg viewBox="0 0 24 24" aria-hidden="true"><path d="'+(bad?'M5 5l14 14M19 5L5 19':'M4 12l5 5L20 6')+'"/></svg>');
    }
  }
}
