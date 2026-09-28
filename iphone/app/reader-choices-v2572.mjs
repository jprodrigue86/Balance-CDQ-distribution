// One reader-owned choice interface. PDF fields only store values and calculate.
// No PDF field is moved, hidden or made read-only while this dialog is open.
const TITLES={client_technicien:'Technicien',frequence_etalonnage:"Fréquence d’étalonnage",legal_pour_commerce:'Légal pour le commerce',unite_mesure:'Unité de mesure',etalon_utilise:'Étalon utilisé'};
export function installReaderChoices({surface,onConfirm,onOpen=()=>{},onClose=()=>{},isReadOnly=()=>false}){
  const entries=new Map();let current=null,draft=new Set();
  const dialog=document.createElement('dialog');dialog.id='choiceDialog';dialog.setAttribute('aria-labelledby','choiceTitle');
  const title=document.createElement('h2');title.id='choiceTitle';
  const list=document.createElement('div');list.id='choiceOptions';
  const footer=document.createElement('div');footer.className='choice-footer';
  const cancel=document.createElement('button');cancel.type='button';cancel.id='choiceCancel';cancel.textContent='Annuler';
  const done=document.createElement('button');done.type='button';done.id='choiceDone';done.className='primary';done.textContent='Terminé';
  footer.append(cancel,done);dialog.append(title,list,footer);document.body.append(dialog);
  function selected(select){return Array.from(select.selectedOptions).filter(o=>o.value.trim()).map(o=>o.value);}
  function paint(entry){
    const labels=Array.from(entry.select.selectedOptions).map(o=>o.textContent.trim()).filter(Boolean);
    entry.label.textContent=labels.join(' + ');
    entry.button.title=labels.join(' + ');
    entry.button.setAttribute('aria-label',(TITLES[entry.select.name]||entry.select.title||entry.select.name)+(labels.length?' : '+labels.join(', '):''));
    entry.button.disabled=entry.select.disabled||isReadOnly();
    const css=getComputedStyle(entry.select);
    entry.button.style.fontSize=css.fontSize;
  }
  function entryFor(button){return entries.get(button?.name);}
  function renderOptions(){
    for(const row of list.children){
      const checked=draft.has(row.dataset.value);
      row.setAttribute('aria-checked',String(checked));
      row.querySelector('.choice-check').textContent=checked?'✓':'';
    }
  }
  function open(button){
    const entry=entryFor(button);if(!entry||isReadOnly()||entry.select.disabled)return false;
    if(current)return true;
    current=entry;draft=new Set(selected(entry.select));
    title.textContent=TITLES[entry.select.name]||entry.select.title||entry.select.name;
    list.replaceChildren();list.setAttribute('role',entry.select.multiple?'group':'radiogroup');list.setAttribute('aria-label',title.textContent);
    for(const option of entry.select.options){
      if(!option.value.trim())continue;
      const row=document.createElement('button');row.type='button';row.className='choice-row';row.dataset.value=option.value;
      row.setAttribute('role',entry.select.multiple?'checkbox':'radio');
      const label=document.createElement('span');label.className='choice-text';label.textContent=option.textContent.trim();
      const check=document.createElement('span');check.className='choice-check';check.setAttribute('aria-hidden','true');
      row.append(label,check);
      row.addEventListener('click',()=>{
        if(entry.select.multiple){if(draft.has(option.value))draft.delete(option.value);else draft.add(option.value);}
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
  function close(commit){
    if(!current)return;
    const entry=current;current=null;
    if(commit){
      for(const option of entry.select.options)option.selected=draft.has(option.value);
      if(!entry.select.multiple&&!draft.size)entry.select.value='';
      // PDF.js owns the canonical annotationStorage and sandbox calculation events.
      entry.select.dispatchEvent(new Event('input',{bubbles:true}));
      entry.select.dispatchEvent(new Event('change',{bubbles:true}));
      paint(entry);
    }
    draft.clear();entry.button.setAttribute('aria-expanded','false');
    dialog.close();onClose(entry.button);
    entry.button.focus({preventScroll:true});
    if(commit)onConfirm(entry.button);
  }
  cancel.addEventListener('click',()=>close(false));done.addEventListener('click',()=>close(true));
  dialog.addEventListener('cancel',e=>{e.preventDefault();close(false);});
  dialog.addEventListener('keydown',e=>{
    if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close(false);}
    else if(e.key==='Tab')e.stopPropagation();
  });
  function refresh(){
    for(const select of surface.querySelectorAll('.choiceWidgetAnnotation select')){
      if(select.closest('[hidden]')||select.getAttribute('aria-hidden')==='true'&&!select.dataset.cdqChoiceSource)continue;
      let entry=entries.get(select.name);
      if(!entry||entry.select!==select||!entry.button.isConnected){
        entry?.button.remove();
        const button=document.createElement('button');button.type='button';button.name=select.name;
        button.className='cdq-choice-field';button.dataset.cdqChoice='true';button.setAttribute('aria-haspopup','dialog');button.setAttribute('aria-expanded','false');
        const label=document.createElement('span');label.className='cdq-choice-value';
        const arrow=document.createElement('span');arrow.className='cdq-choice-arrow';arrow.setAttribute('aria-hidden','true');
        button.append(label,arrow);select.after(button);
        select.dataset.cdqChoiceSource='true';select.tabIndex=-1;select.setAttribute('aria-hidden','true');
        entry={select,button,label};entries.set(select.name,entry);
        button.addEventListener('click',()=>open(button));
        select.addEventListener('change',()=>paint(entry));
      }
      paint(entry);
    }
  }
  return {refresh,open,isOpen:()=>!!current,cancel:()=>close(false)};
}
