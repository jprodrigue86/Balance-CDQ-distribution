// One reader-owned choice interface. PDF fields only store values and calculate.
// No PDF field is moved, hidden or made read-only while this dialog is open.
const TITLES={points_test:'Points de test',client_technicien:'Technicien',frequence_etalonnage:"Fréquence d’étalonnage",legal_pour_commerce:'Légal pour le commerce',unite_mesure:'Unité de mesure',etalon_utilise:'Étalon utilisé'};
const CDQ_STANDARD_KITS=Object.freeze(['Kit X','X1-X10','Kit Y','Y1-Y10','Kit Z','Z1-Z10','C1-C50','CDQ1882020','CDQ1882022','B1-B20','Kit CDQ2-1']);

export function installReaderChoices({surface,onConfirm,onOpen=()=>{},onClose=()=>{},isReadOnly=()=>false}){
  const entries=new Map();let current=null,draft=new Set();
  const dialog=document.createElement('dialog');dialog.id='choiceDialog';dialog.setAttribute('aria-labelledby','choiceTitle');
  const title=document.createElement('h2');title.id='choiceTitle';
  const list=document.createElement('div');list.id='choiceOptions';
  const footer=document.createElement('div');footer.className='choice-footer';
  const cancel=document.createElement('button');cancel.type='button';cancel.id='choiceCancel';cancel.textContent='Annuler';
  const done=document.createElement('button');done.type='button';done.id='choiceDone';done.className='primary';done.textContent='Terminé';
  footer.append(cancel,done);dialog.append(title,list,footer);document.body.append(dialog);

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
  function labels(entry){
    if((entry.kind==='kit-text'||entry.kind==='kit-native'))return selected(entry);
    return Array.from(entry.select.selectedOptions).map(o=>o.textContent.trim()).filter(Boolean);
  }
  function paint(entry){
    const currentLabels=labels(entry);
    if(entry.label)entry.label.textContent=currentLabels.join(' + ');
    entry.button.title=currentLabels.join(' + ');
    entry.button.setAttribute('aria-label',(TITLES[nameOf(entry)]||sourceOf(entry)?.title||nameOf(entry))+(currentLabels.length?' : '+currentLabels.join(', '):''));
    entry.button.disabled=disabledOf(entry)||isReadOnly();
    const css=getComputedStyle(sourceOf(entry));
    entry.button.style.fontSize=css.fontSize;
    entry.button.style.fontFamily=css.fontFamily;
    entry.button.style.fontWeight=css.fontWeight;
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
    for(const row of list.children){
      const checked=draft.has(row.dataset.value);
      row.setAttribute('aria-checked',String(checked));
      row.querySelector('.choice-check').textContent=checked?'✓':'';
    }
  }
  function open(button){
    const entry=entryFor(button);if(!entry||isReadOnly()||disabledOf(entry))return false;
    if(current)return true;
    current=entry;draft=new Set(selected(entry));
    title.textContent=TITLES[nameOf(entry)]||sourceOf(entry)?.title||nameOf(entry);
    list.replaceChildren();list.setAttribute('role',multipleOf(entry)?'group':'radiogroup');list.setAttribute('aria-label',title.textContent);
    for(const option of options(entry)){
      const row=document.createElement('button');row.type='button';row.className='choice-row';row.dataset.value=option.value;
      row.setAttribute('role',multipleOf(entry)?'checkbox':'radio');
      const label=document.createElement('span');label.className='choice-text';label.textContent=option.label;
      const check=document.createElement('span');check.className='choice-check';check.setAttribute('aria-hidden','true');
      row.append(label,check);
      row.addEventListener('click',()=>{
        if(multipleOf(entry)){if(draft.has(option.value))draft.delete(option.value);else draft.add(option.value);}
        else{draft.clear();draft.add(option.value);}
        renderOptions();
      });
      list.append(row);
    }
    renderOptions();entry.button.setAttribute('aria-expanded','true');
    onOpen(entry.button);
    dialog.showModal();
    // Focus a button, never a text field: opening choices does not request IME.
    (list.querySelector('[aria-checked="true"]')||list.firstElementChild||done).focus({preventScroll:true});
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
      for(const mirror of surface.querySelectorAll('[name="_cdq_affichage_'+select.name+'"]'))mirror.closest('section')?.classList.add('cdq-choice-mirror');
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
