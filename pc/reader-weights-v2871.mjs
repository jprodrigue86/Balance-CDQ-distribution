// Weight certificate controls. Opening an existing report never rewrites dates.
import {tableBorderStyleV2872} from './pdf-layout-borders-v2872.mjs';
export const WEIGHT_FREQUENCIES=Object.freeze(['1 mois','2 mois','3 mois','4 mois','5 mois','6 mois','12 mois','24 mois','1 an','2 ans']);
export function weightsDateParts(value){
 const s=String(value??'').trim(),iso=/^(\d{4})-(\d{2})-(\d{2})$/.exec(s),fr=/^(\d{1,2})[/.](\d{1,2})[/.](\d{4})$/.exec(s);
 if(!iso&&!fr)return null;
 const y=+(iso?iso[1]:fr[3]),m=+(iso?iso[2]:fr[2]),d=+(iso?iso[3]:fr[1]);
 if(y<1000||y>9999||m<1||m>12||d<1||d>new Date(Date.UTC(y,m,0)).getUTCDate())return null;
 return {y,m,d};
}
export function weightNextDate(date,frequency){
 const parts=weightsDateParts(date),months={'1 mois':1,'2 mois':2,'3 mois':3,'4 mois':4,'5 mois':5,'6 mois':6,'12 mois':12,'24 mois':24,'1 an':12,'2 ans':24}[frequency];
 if(!parts||!months)return '';
 const first=new Date(Date.UTC(parts.y,parts.m-1+months,1)),y=first.getUTCFullYear(),m=first.getUTCMonth()+1;
 if(y>9999)return '';
 const d=Math.min(parts.d,new Date(Date.UTC(y,m,0)).getUTCDate());
 return `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
}
function iso(value){const p=weightsDateParts(value);return p?`${p.y}-${String(p.m).padStart(2,'0')}-${String(p.d).padStart(2,'0')}`:'';}
export function weightsToday(now=new Date()){return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;}
export function installWeightsControlsV2871({surface,doc,fields}){
 const definitions=name=>{const f=fields instanceof Map?fields.get(name):fields?.[name];return f?(Array.isArray(f)?f:[f]):[];};
 if(!definitions('poids_01_01').length||!definitions('poids_14_06').length||!definitions('date_prochain').length)return ()=>{};
 const controller=new AbortController(),signal=controller.signal,buttons=new Set();let dialog=null,writing=false,uniformBorders=false,separated=false;
 const live=name=>surface.querySelector(`[name="${name}"]`);
 const read=name=>{const el=live(name);if(el)return el.value;const d=definitions(name)[0];return d?String(doc.annotationStorage.getValue(d.id,d)?.value??''):'';};
 let automatic=!read('date_prochain')||iso(read('date_prochain'))===weightNextDate(read('date_etalonnage'),read('frequence'));
 function write(name,value){
  writing=true;
  try{
   for(const def of definitions(name)){def.value=value;def.formattedValue=value;doc.annotationStorage.setValue(def.id,{value,formattedValue:value});}
   const el=live(name);if(el){el.value=value;el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));el.dispatchEvent(new Event('blur'));}
  }finally{writing=false;}
 }
 function calculate(force=false){const due=weightNextDate(read('date_etalonnage'),read('frequence'));if(due&&(automatic||force)){automatic=true;write('date_prochain',due);}return due;}
 surface.addEventListener('change',event=>{
  if(writing)return;
  if(event.target.name==='date_prochain')automatic=!event.target.value;
  if(['date_etalonnage','frequence'].includes(event.target.name))calculate();
 },{signal});
 function open(name){
  if(dialog)dialog.remove();dialog=document.createElement('dialog');dialog.setAttribute('aria-label',name==='date_prochain'?'Prochain étalonnage':name==='date_approbation'?'Date d’approbation':'Date d’étalonnage');
  dialog.style.cssText='max-width:90vw;padding:20px;border:1px solid #6db8c9;border-radius:10px;background:#fff;color:#102951;';
  const label=document.createElement('label');label.textContent=dialog.getAttribute('aria-label');const picker=document.createElement('input');picker.type='date';picker.value=iso(read(name))||weightsToday();picker.style.cssText='display:block;font:inherit;padding:10px;margin:12px 0';label.append(picker);dialog.append(label);
  const row=document.createElement('div');row.style.cssText='display:flex;gap:8px;flex-wrap:wrap';dialog.append(row);
  const close=()=>{dialog?.close();dialog?.remove();dialog=null;};
  const button=(text,action)=>{const b=document.createElement('button');b.type='button';b.textContent=text;b.style.cssText='padding:10px;font:inherit';b.onclick=action;row.append(b);};
  button('Aujourd’hui',()=>{picker.value=weightsToday();});
  if(name==='date_prochain')button('Calculer',()=>{const value=calculate(true);if(value)close();else picker.setCustomValidity('Renseignez la date d’étalonnage et la fréquence.');picker.reportValidity();});
  button('Appliquer',()=>{if(!weightsDateParts(picker.value)){picker.setCustomValidity('Choisissez une date valide.');picker.reportValidity();return;}if(name==='date_prochain')automatic=false;write(name,picker.value);if(name==='date_etalonnage')calculate();close();});
  button('Annuler',close);picker.oninput=()=>picker.setCustomValidity('');dialog.addEventListener('cancel',e=>{e.preventDefault();close();});document.body.append(dialog);dialog.showModal();picker.focus();
 }
 function refresh(){
  if(uniformBorders)for(const field of surface.querySelectorAll('input,textarea,select')){
   const section=field.closest('section'),sides=tableBorderStyleV2872(field.name,1,separated);if(!section||!sides)continue;
   for(const [key,value]of Object.entries(sides)){
    const property=key.replace(/[A-Z]/g,c=>'-'+c.toLowerCase());
    const next=key.startsWith('border')&&key.endsWith('Width')&&value!=='0px'?'calc(0.6px * var(--total-scale-factor))':value;
    if(section.style.getPropertyValue(property)!==next||section.style.getPropertyPriority(property)!=='important')section.style.setProperty(property,next,'important');
   }
  }
  // The historical reader has a global Arial Bold rule. New certificates
  // keep their authored regular Roboto Condensed typeface in live controls.
  if(definitions('classe').length)for(const field of surface.querySelectorAll('input,textarea,select,button.cdq-choice-field')){
   if(!field.name||!definitions(field.name).length)continue;
   for(const [key,value] of Object.entries({'font-family':'CDQSummary,Arial,sans-serif','font-weight':'400','color':'#092952','-webkit-text-fill-color':'#092952'}))
    if(field.style.getPropertyValue(key)!==value||field.style.getPropertyPriority(key)!=='important')field.style.setProperty(key,value,'important');
  }
  for(const name of ['date_etalonnage','date_prochain','date_approbation']){
   const field=live(name),section=field?.closest('section');if(!section)continue;
   field.style.setProperty('box-sizing','border-box','important');
   field.style.setProperty('padding-inline-end','calc(20px * var(--total-scale-factor))','important');
   if(section.querySelector('[data-cdq-weight-calendar]'))continue;
   const b=document.createElement('button');b.type='button';b.dataset.cdqWeightCalendar=name;b.setAttribute('aria-label','Calendrier : '+name.replaceAll('_',' '));b.innerHTML='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 2v6M17 2v6M3 11h18M7 15h3M14 15h3M7 18h3M14 18h3"/></svg>';b.style.cssText='position:absolute;box-sizing:border-box;right:calc(.6px * var(--total-scale-factor));top:calc(.6px * var(--total-scale-factor));height:calc(100% - 1.2px * var(--total-scale-factor));width:min(25%,calc(18px * var(--total-scale-factor)));min-height:0;min-width:0;line-height:1;padding:0;border:0;background:white;color:#102951;z-index:2';
   b.addEventListener('click',()=>open(name),{signal});section.append(b);buttons.add(b);
  }
 }
 const observer=new MutationObserver(refresh);observer.observe(surface,{subtree:true,childList:true});refresh();
 Promise.resolve(doc.getMetadata()).then(metadata=>{if(!signal.aborted&&String(metadata?.info?.Custom?.CDQVisualV2872||'')==='2872'){uniformBorders=true;separated=String(metadata?.info?.Custom?.CDQCellsSeparatedV2874||'')==='2874';refresh();}}).catch(()=>{});
 return()=>{controller.abort();observer.disconnect();for(const b of buttons)b.remove();dialog?.remove();};
}
