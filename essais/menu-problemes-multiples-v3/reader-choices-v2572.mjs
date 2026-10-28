// One reader-owned choice interface. PDF fields only store values and calculate.
// No PDF field is moved, hidden or made read-only while this dialog is open.
const TITLES={points_test:'Points de test',client_technicien:'Technicien',frequence_etalonnage:"Fréquence d’étalonnage",legal_pour_commerce:'Légal pour le commerce',unite_mesure:'Unité de mesure',etalon_utilise:'Étalon utilisé'};
const CDQ_STANDARD_KITS=Object.freeze(['Kit X','X1-X10','Kit Y','Y1-Y10','Kit Z','Z1-Z10','C1-C50','CDQ1882020','CDQ1882022','B1-B20','Kit CDQ2-1']);

// Metrics of the shared WinAnsi /FRC font, in thousandths of an em. Keeping
// caption fitting independent of the DOM also lets the PDF save worker use
// the same whole-label rule as the live choice button.
const CDQ_PROBLEM_RC_WIDTHS=Object.freeze([229,246,320,548,494,633,544,175,314,319,431,497,197,248,264,371,494,494,494,494,494,494,494,494,494,494,233,203,446,479,460,422,769,577,546,567,571,497,481,591,620,250,483,545,476,755,620,601,554,601,531,519,521,562,561,762,551,525,523,250,370,250,371,405,309,479,493,462,496,469,316,493,483,229,224,451,229,753,484,502,493,500,305,456,296,483,428,650,439,417,439,307,244,307,589,392,494,1026,195,310,327,590,483,500,428,819,519,272,827,1026,523,1026,1026,195,195,334,337,337,572,678,428,548,456,272,777,1026,439,525,229,232,480,511,713,464,240,538,418,786,396,418,487,248,786,415,374,470,330,330,313,499,435,244,229,330,403,418,638,678,673,422,577,577,577,577,577,577,812,567,497,497,497,497,250,250,250,250,585,620,601,601,601,601,601,471,601,562,562,562,562,525,515,522,479,479,479,479,479,479,729,462,469,469,469,469,235,235,235,235,514,484,502,502,502,502,502,500,499,483,483,483,483,417,508,417]);
export const cdqPlainProblemLabelV3=label=>String(label??'').replace(/\u200b/g,'').replace(/[\u00a0\u202f]/g,' ').replace(/\s+/g,' ').trim();
export function cdqProblemCaptionV3(labels,available,size,measure=(text,fontSize)=>Array.from(text).reduce((sum,char)=>sum+(CDQ_PROBLEM_RC_WIDTHS[char.codePointAt(0)-32]??500),0)*fontSize/1000){
  const names=labels.map(cdqPlainProblemLabelV3).filter(Boolean);
  if(!names.length)names.push('Aucun problème constaté');
  const full=names.join(' ; '),fits=text=>measure(text,size)<=available+.005;
  if(fits(full))return {text:full,size,shown:names.length,total:names.length};
  // Keep entire problem names and their state. The complete list remains in
  // the visible detail field immediately below the selector.
  for(let shown=names.length-1;shown>=1;shown--){
    const remaining=names.length-shown,text=names.slice(0,shown).join(' ; ')+' + '+remaining+' autre'+(remaining>1?'s':'');
    if(fits(text))return {text,size,shown,total:names.length};
  }
  const text=names[0]+(names.length>1?' + '+(names.length-1)+' autre'+(names.length>2?'s':''):'');
  return {text,size:Math.min(size,size*available/Math.max(measure(text,size),1)),shown:1,total:names.length};
}

export function installReaderChoices({surface,onConfirm,onOpen=()=>{},onClose=()=>{},isReadOnly=()=>false}){
  const entries=new Map();let current=null,draft=new Set(),problemMode=false,problemMultiple=false;
  const dialog=document.createElement('dialog');dialog.id='choiceDialog';dialog.setAttribute('aria-labelledby','choiceTitle');
  const title=document.createElement('h2');title.id='choiceTitle';
  const help=document.createElement('p');help.id='choiceHelp';help.className='choice-help';help.hidden=true;
  help.textContent='Plusieurs problèmes possibles. Un seul état par ligne.';
  const list=document.createElement('div');list.id='choiceOptions';
  const footer=document.createElement('div');footer.className='choice-footer';
  const cancel=document.createElement('button');cancel.type='button';cancel.id='choiceCancel';cancel.textContent='Annuler';
  const done=document.createElement('button');done.type='button';done.id='choiceDone';done.className='primary';done.textContent='Terminé';
  footer.append(cancel,done);dialog.append(title,help,list,footer);document.body.append(dialog);

  const nameOf=entry=>entry.select?.name||entry.input?.name||entry.button?.name||'';
  const multipleOf=entry=>(entry.kind==='kit-text'||entry.kind==='kit-native')||!!entry.select?.multiple;
  const disabledOf=entry=>entry.kind==='kit-native'||entry.kind==='kit-text'?false:!!(entry.select?.disabled||entry.input?.disabled);
  const sourceOf=entry=>entry.select||entry.input;

  function selected(entry){
    if((entry.kind==='kit-text'||entry.kind==='kit-native')){
      const text=String(entry.input?.value||'').trim();
      return text?text.split(/\s*\+\s*/).map(x=>x.trim()).filter(Boolean):[];
    }
    return Array.from(entry.select.selectedOptions).filter(o=>o.value.trim()).map(o=>o.value);
  }
  function options(entry){
    if((entry.kind==='kit-text'||entry.kind==='kit-native'))return CDQ_STANDARD_KITS.map(value=>({value,label:value}));
    return Array.from(entry.select.options)
      .filter(option=>option.value.trim())
      .map(option=>({value:option.value,label:option.textContent.trim()}));
  }
  // Pair only the known problem field, and only when every original option can
  // be represented. The PDF's export values and its own calculations stay intact.
  function problemPairs(entry){
    if(entry.kind!=='select'||!['probleme_constate','essai_cdq_probleme_constate'].includes(nameOf(entry)))return null;
    const all=options(entry),byValue=new Map(all.map(option=>[option.value,option]));
    if(byValue.size!==all.length||!byValue.has('aucun'))return null;
    const base=all.filter(option=>option.value!=='aucun'&&!option.value.endsWith('_corrige'));
    if(!base.length||all.length!==1+base.length*2||base.some(option=>!byValue.has(option.value+'_corrige')))return null;
    return {none:byValue.get('aucun'),rows:base.map(option=>({problem:option,corrected:byValue.get(option.value+'_corrige')}))};
  }
  // PDF.js uses nonbreaking spaces, and some PDFs add zero-width menu breaks.
  // Normalize presentation text only, never the <option> or its export value.
  const plainLabel=cdqPlainProblemLabelV3;
  function problemDraft(values,pairs){
    const given=new Set(values),normalized=new Set();
    for(const {problem,corrected}of pairs.rows){
      if(given.has(problem.value))normalized.add(problem.value);
      else if(given.has(corrected.value))normalized.add(corrected.value);
    }
    if(!normalized.size)normalized.add(pairs.none.value);
    return normalized;
  }
  function labels(entry){
    if((entry.kind==='kit-text'||entry.kind==='kit-native'))return selected(entry);
    return Array.from(entry.select.selectedOptions).map(o=>o.textContent.trim()).filter(Boolean);
  }
  function paint(entry){
    let currentLabels=labels(entry);
    let display=currentLabels.join(' + ');
    const pairs=entry.select?.multiple?problemPairs(entry):null;
    const css=getComputedStyle(sourceOf(entry));
    entry.button.style.fontSize=css.fontSize;
    entry.button.style.fontFamily=css.fontFamily;
    entry.button.style.fontWeight=css.fontWeight;
    if(pairs&&nameOf(entry)==='essai_cdq_probleme_constate'){
      const chosen=problemDraft(selected(entry),pairs),all=[pairs.none,...pairs.rows.flatMap(row=>[row.problem,row.corrected])];
      currentLabels=all.filter(option=>chosen.has(option.value)).map(option=>plainLabel(option.label));
      const size=parseFloat(css.fontSize)||10.008,scale=size/10.008;
      const width=entry.button.getBoundingClientRect().width||sourceOf(entry).getBoundingClientRect().width;
      const caption=cdqProblemCaptionV3(currentLabels,width>0?Math.max(1,width-6*scale):Infinity,size);
      display=caption.text;
      entry.button.style.setProperty('font-size',caption.size+'px','important');
      entry.button.style.fontFamily='CDQSummary, Arial, sans-serif';
      entry.button.style.fontWeight='400';
      if(entry.label){entry.label.style.textAlign='left';entry.label.style.padding='0 '+(3*scale)+'px';entry.label.style.textOverflow='clip';}
    }else if(pairs){
      const count=Array.from(problemDraft(selected(entry),pairs)).filter(value=>value!==pairs.none.value).length;
      display=count?count+' problème'+(count>1?'s sélectionnés':' sélectionné'):'Aucun problème constaté';
    }
    if(entry.label)entry.label.textContent=display;
    entry.button.title=currentLabels.join(' ; ');
    entry.button.setAttribute('aria-label',(TITLES[nameOf(entry)]||sourceOf(entry)?.title||nameOf(entry))+(currentLabels.length?' : '+currentLabels.join(', '):''));
    entry.button.disabled=disabledOf(entry)||isReadOnly();
  }
  function commit(entry){
    if((entry.kind==='kit-text'||entry.kind==='kit-native')){
      const values=Array.from(draft);
      const text=values.join(' + ');
      entry.input.value=text;
      // Mirror the private kit-order field used by the PDF's Acrobat menu. This
      // keeps a document filled in CDQ compatible with the PDF's own menu later.
      const order=surface.querySelector('.textWidgetAnnotation input[name="_cdq_kits_ordre"],input[name="_cdq_kits_ordre"]');
      if(order){
        order.value=values.join('|');
        order.dispatchEvent(new Event('input',{bubbles:true}));
        order.dispatchEvent(new Event('change',{bubbles:true}));
      }
      // PDF.js owns annotationStorage; real input/change events write the value
      // without making this read-only result field directly editable.
      entry.input.dispatchEvent(new Event('input',{bubbles:true}));
      entry.input.dispatchEvent(new Event('change',{bubbles:true}));
      paint(entry);
      return;
    }
    for(const option of entry.select.options)option.selected=draft.has(option.value);
    if(!entry.select.multiple&&!draft.size)entry.select.value='';
    entry.select.dispatchEvent(new Event('input',{bubbles:true}));
    entry.select.dispatchEvent(new Event('change',{bubbles:true}));
    paint(entry);
  }
  function entryFor(button){return entries.get(button?.dataset?.cdqChoiceKey||button?.name);}
  function renderOptions(){
    const choices=Array.from(list.querySelectorAll('button[data-value]'));
    const focused=problemMultiple&&choices.includes(document.activeElement)?document.activeElement:null;
    const tabStop=focused||choices.find(row=>draft.has(row.dataset.value))||choices[0];
    for(const row of choices){
      const checked=draft.has(row.dataset.value);
      row.setAttribute('aria-checked',String(checked));
      row.querySelector('.choice-check').textContent=checked?'✓':'';
      if(problemMode)row.tabIndex=row===tabStop?0:-1;
    }
  }
  function choiceButton(entry,option,{compact=false,label=option.label,state=''}={}){
    const row=document.createElement('button');row.type='button';row.className=compact?'choice-problem-state':'choice-row';row.dataset.value=option.value;
    row.setAttribute('role',multipleOf(entry)?'checkbox':'radio');
    if(compact){row.dataset.state=state;row.setAttribute('aria-label',label);row.title=label;}
    else{const text=document.createElement('span');text.className='choice-text';text.textContent=label;row.append(text);}
    const check=document.createElement('span');check.className='choice-check';check.setAttribute('aria-hidden','true');row.append(check);
    row.addEventListener('click',()=>{
      if(problemMultiple){
        if(option.value==='aucun'){draft.clear();draft.add('aucun');}
        else{
          const base=option.value.replace(/_corrige$/,'');
          draft.delete('aucun');
          if(draft.has(option.value))draft.delete(option.value);
          else{draft.delete(base);draft.delete(base+'_corrige');draft.add(option.value);}
          if(!draft.size)draft.add('aucun');
        }
      }
      else if(multipleOf(entry)){if(draft.has(option.value))draft.delete(option.value);else draft.add(option.value);}
      else{draft.clear();draft.add(option.value);}
      renderOptions();
    });
    return row;
  }
  function open(button){
    const entry=entryFor(button);if(!entry||isReadOnly()||disabledOf(entry))return false;
    if(current)return true;
    current=entry;draft=new Set(selected(entry));
    const pairs=problemPairs(entry);problemMode=!!pairs;problemMultiple=problemMode&&multipleOf(entry);
    if(problemMultiple)draft=problemDraft(draft,pairs);
    dialog.classList.toggle('choice-problems',problemMode);
    dialog.classList.toggle('choice-problems-multiple',problemMultiple);
    help.hidden=!problemMultiple;
    if(problemMultiple)dialog.setAttribute('aria-describedby','choiceHelp');else dialog.removeAttribute('aria-describedby');
    title.textContent=problemMode?'Problèmes constatés':TITLES[nameOf(entry)]||sourceOf(entry)?.title||nameOf(entry);
    list.replaceChildren();list.setAttribute('role',multipleOf(entry)?'group':'radiogroup');list.setAttribute('aria-label',title.textContent);
    if(pairs){
      const none=choiceButton(entry,pairs.none,{label:plainLabel(pairs.none.label)});none.classList.add('choice-problem-none');list.append(none);
      const heading=document.createElement('div');heading.className='choice-problem-heading';heading.setAttribute('aria-hidden','true');
      for(const text of ['Problème','Non corrigé','Corrigé']){const cell=document.createElement('span');cell.textContent=text;heading.append(cell);}
      list.append(heading);
      for(const pair of pairs.rows){
        const row=document.createElement('div');row.className='choice-problem-pair';
        const label=plainLabel(pair.problem.label),text=document.createElement('span');text.className='choice-problem-label';text.textContent=label;
        row.append(text,
          choiceButton(entry,pair.problem,{compact:true,label:label+' — Non corrigé',state:'uncorrected'}),
          choiceButton(entry,pair.corrected,{compact:true,label:label+' — Corrigé',state:'corrected'}));
        list.append(row);
      }
    }else{
      for(const option of options(entry))list.append(choiceButton(entry,option));
    }
    list.scrollTop=0;
    renderOptions();entry.button.setAttribute('aria-expanded','true');
    onOpen(entry.button);
    dialog.showModal();
    // Focus a button, never a text field: opening choices does not request IME.
    const focus=list.querySelector('[aria-checked="true"]')||list.querySelector('button')||done;
    focus.focus({preventScroll:true});
    if(problemMode)focus.scrollIntoView({block:'nearest'});
    return true;
  }
  function close(commitChanges){
    if(!current)return;
    const entry=current;current=null;
    if(commitChanges)commit(entry);
    draft.clear();entry.button.setAttribute('aria-expanded','false');
    dialog.close();onClose(entry.button);
    entry.button.focus({preventScroll:true});
    if(commitChanges)onConfirm(entry.button);
  }
  cancel.addEventListener('click',()=>close(false));done.addEventListener('click',()=>close(true));
  dialog.addEventListener('cancel',e=>{e.preventDefault();close(false);});
  dialog.addEventListener('keydown',e=>{
    if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close(false);}
    else if(e.key==='Tab')e.stopPropagation();
    else if(problemMode&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(e.key)){
      const button=e.target.closest?.('#choiceOptions button[data-value]');if(!button)return;
      const choices=Array.from(list.querySelectorAll('button[data-value]')),index=choices.indexOf(button);if(index<0)return;
      e.preventDefault();e.stopPropagation();
      const next=e.key==='Home'?0:e.key==='End'?choices.length-1:(index+(['ArrowLeft','ArrowUp'].includes(e.key)?-1:1)+choices.length)%choices.length;
      choices[next].focus();
      if(problemMultiple)renderOptions();else choices[next].click();
    }
  });

  function makeButton(name,source,kind,mount=null){
    const button=document.createElement('button');button.type='button';button.name=name;
    button.className='cdq-choice-field';button.dataset.cdqChoice='true';button.setAttribute('aria-haspopup','dialog');button.setAttribute('aria-expanded','false');
    if(kind==='kit-text')button.dataset.cdqKitText='true';
    const label=document.createElement('span');label.className='cdq-choice-value';
    const arrow=document.createElement('span');arrow.className='cdq-choice-arrow';arrow.setAttribute('aria-hidden','true');
    button.append(label);
    if(mount)mount.append(button);else source.after(button);
    source.dataset.cdqChoiceSource='true';source.tabIndex=-1;source.setAttribute('aria-hidden','true');
    button.addEventListener('click',()=>open(button));
    return {button,label};
  }
  function refreshNativeSelects(){
    // The annotation layer can be reconstructed between refreshes. Keep this
    // exact-name index local to this pass, never retain replaced mirror nodes.
    const mirrors=new Map();
    for(const mirror of surface.querySelectorAll('[name^="_cdq_affichage_"]')){
      const name=mirror.getAttribute('name');let matches=mirrors.get(name);
      if(!matches)mirrors.set(name,matches=[]);matches.push(mirror);
    }
    for(const select of surface.querySelectorAll('.choiceWidgetAnnotation select')){
      if(select.closest('[hidden]')||select.getAttribute('aria-hidden')==='true'&&!select.dataset.cdqChoiceSource)continue;
      let entry=entries.get(select.name);
      if(!entry||entry.kind!=='select'||entry.select!==select||!entry.button.isConnected){
        entry?.button.remove();
        const made=makeButton(select.name,select,'select');
        entry={kind:'select',select,...made};entries.set(select.name,entry);
        select.addEventListener('change',()=>paint(entry));
      }
      paint(entry);
      // The dialog button paints the value once. PDF mirror text must not
      // remain underneath it now that the interaction layer is transparent.
      for(const mirror of mirrors.get('_cdq_affichage_'+select.name)||[])mirror.closest('section')?.classList.add('cdq-choice-mirror');
    }
  }
  function refreshKitText(){
    // Micro-correction: use the PDF's own full-width Acrobat opener.
    // Do not create, resize or paint any rectangle over the PDF.
    if(entries.get('etalon_utilise')?.kind==='select')return;
    const input=surface.querySelector('.textWidgetAnnotation input[name="etalon_utilise"]');
    if(!input)return;
    const opener=surface.querySelector('[name="_cdq_kits_ouvrir"]');
    if(!opener)return;
    let entry=entries.get('etalon_utilise');
    if(!entry||entry.kind!=='kit-native'||entry.input!==input||entry.button!==opener||!opener.isConnected){
      if(entry?.generated)entry.button?.remove();
      opener.dataset.cdqChoice='true';
      opener.dataset.cdqChoiceKey='etalon_utilise';
      opener.setAttribute('aria-haspopup','dialog');
      opener.setAttribute('aria-expanded','false');
      opener.setAttribute('aria-label','Étalon utilisé');
      input.dataset.cdqChoiceSource='true';
      input.tabIndex=-1;
      entry={kind:'kit-native',input,button:opener,label:null,generated:false};
      entries.set('etalon_utilise',entry);
      if(!opener.dataset.cdqKitBound){
        opener.dataset.cdqKitBound='true';
        opener.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();open(opener);});
      }
      input.addEventListener('change',()=>paint(entry));
    }
    paint(entry);
  }
  surface.addEventListener('click',e=>{
    let button=e.target.closest?.('[data-cdq-choice]');
    if(!button&&e.target.name?.startsWith('_cdq_affichage_'))button=entries.get(e.target.name.slice('_cdq_affichage_'.length))?.button;
    if(!button||!entryFor(button))return;
    e.preventDefault();e.stopImmediatePropagation();open(button);
  },{capture:true});
  function refresh(){
    refreshNativeSelects();
    refreshKitText();
  }
  return {refresh,open,isOpen:()=>!!current,cancel:()=>close(false)};
}
