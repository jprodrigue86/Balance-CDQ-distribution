import {WEIGHT_CATALOG_V2872,WEIGHT_CATEGORIES_V2872,normalizeWeightChoiceV2872,normalizeWeightSelectionV2872,weightChoiceDetailsV2872} from './weights-catalog-v2872.mjs';

const CSS=`
.cdq-weight-create-v2872{--wc-bg:#0c1d29;--wc-field:#123348;--wc-line:#397b96;--wc-accent:#48d5ec;color:#f5fbff;display:grid;gap:16px;margin:14px 0}
.cdq-weight-create-v2872 [hidden]{display:none!important}
.cdq-weight-create-v2872 button,.cdq-weight-create-v2872 input{box-sizing:border-box;font:inherit;color:inherit;border:1px solid var(--wc-line);border-radius:12px;background:var(--wc-field);min-height:46px;padding:11px 13px;line-height:1.3;max-width:100%}
.cdq-weight-create-v2872 button{cursor:pointer;text-align:left;box-shadow:none}
.cdq-weight-create-v2872 button:focus-visible,.cdq-weight-create-v2872 input:focus-visible{outline:2px solid var(--wc-accent);outline-offset:3px}
.cdq-weight-create-v2872 button:disabled,.cdq-weight-create-v2872 input:disabled{opacity:.55;cursor:wait}
.cdq-weight-create-v2872 button[aria-pressed=true],.cdq-weight-create-v2872 button[aria-selected=true]{border-color:var(--wc-accent);background:#075e7a;color:#fff}
.cdq-weight-create-v2872 .wc-label{font-weight:700;font-size:1.05em;margin:0 0 9px;display:block}
.cdq-weight-create-v2872 .wc-count{display:flex;justify-content:space-between;align-items:center;width:100%;font-weight:700;background:linear-gradient(120deg,#143952,#0b2535);border-color:#4c9cba;padding:15px}
.cdq-weight-create-v2872 .wc-count-grid{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:7px;padding:12px 0 0}
.cdq-weight-create-v2872 .wc-count-grid button{padding:10px 2px;text-align:center;font-weight:700}
.cdq-weight-create-v2872 .wc-help{margin:0;color:#b7d4e2;font-size:.9em;line-height:1.5}
.cdq-weight-create-v2872 .wc-list{display:grid;gap:10px}
.cdq-weight-create-v2872 .wc-row{border:1px solid #284b60;background:var(--wc-bg);border-radius:14px;padding:12px;min-width:0}
.cdq-weight-create-v2872 .wc-row-head{display:grid;grid-template-columns:65px minmax(0,1fr);gap:9px;align-items:center}
.cdq-weight-create-v2872 .wc-number{font-size:.88em;color:#adcbdc;font-weight:700}
.cdq-weight-create-v2872 .wc-mass{width:100%;font-weight:700;display:flex;align-items:center;justify-content:space-between;gap:8px}
.cdq-weight-create-v2872 .wc-tolerance{margin:8px 0 0 74px;color:#7fe1ed;font-size:.88em;line-height:1.4}
.cdq-weight-create-v2872 .wc-picker{margin-top:14px;padding-top:12px;border-top:1px solid #31586d;display:grid;gap:10px}
.cdq-weight-create-v2872 .wc-tabs{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}
.cdq-weight-create-v2872 .wc-tabs button{padding:10px 4px;font-size:.85em;text-align:center;font-weight:700}
.cdq-weight-create-v2872 .wc-options{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px;max-height:280px;overflow:auto;overscroll-behavior:contain;padding:3px}
.cdq-weight-create-v2872 .wc-options button{text-align:center;padding:10px 5px;min-height:60px}
.cdq-weight-create-v2872 .wc-options strong,.cdq-weight-create-v2872 .wc-options small{display:block}
.cdq-weight-create-v2872 .wc-options small{font-size:.76em;color:#b7dae8;margin-top:3px}
.cdq-weight-create-v2872 .wc-custom{display:grid;gap:10px}
.cdq-weight-create-v2872 .wc-custom label{display:grid;gap:6px;font-size:.9em}
.cdq-weight-create-v2872 .wc-custom input{width:100%;min-width:0}
.cdq-weight-create-v2872 .wc-units{display:flex;gap:7px;flex-wrap:wrap}
.cdq-weight-create-v2872 .wc-units button{text-align:center;min-width:56px}
.cdq-weight-create-v2872 .wc-repeat{font-size:.85em;margin-top:9px;background:transparent;color:#b9e8f4;border-color:#31586d;min-height:40px}
.cdq-weight-create-v2872 .wc-summary{font-size:.9em;margin:0;color:#d3e7ef}
.cdq-weight-create-v2872 .wc-create{width:100%;font-weight:700;text-align:center;background:linear-gradient(120deg,#047fc3,#076484);border-color:#62d3ed;min-height:58px}
.cdq-weight-create-v2872 .wc-create[aria-disabled=true]{background:#173d52;border-color:#3c6c82;color:#b6cbd7}
.cdq-weight-create-v2872 .wc-error{color:#ffb3a9;margin:0;font-size:.9em}
@media(min-width:600px){.cdq-weight-create-v2872 .wc-options{grid-template-columns:repeat(4,minmax(0,1fr))}}
`;
function installStyle(doc){
  if(doc.getElementById('cdq-weights-create-v2872'))return;
  const style=doc.createElement('style');style.id='cdq-weights-create-v2872';style.textContent=CSS;doc.head.append(style);
}

export function renderWeightsCountV2871({body,create}){
  const doc=body.ownerDocument||document;installStyle(doc);
  const root=doc.createElement('div');root.className='cdq-weight-create-v2872';
  const make=(tag,className,text)=>{const node=doc.createElement(tag);if(className)node.className=className;if(text)node.textContent=text;return node;};
  const button=(text,action,className='')=>{const node=make('button',className,text);node.type='button';node.onclick=action;return node;};
  let count=14,category='metric',openIndex=-1;const selections=Array(14).fill(null),rows=[];
  const countSection=make('div'),countLabel=make('span','wc-label','Nombre de poids à étalonner');countLabel.id='cdqWeightCountLabelV2872';
  const countGrid=make('div','wc-count-grid');countGrid.id='cdqWeightCountOptionsV2872';countGrid.hidden=true;countGrid.setAttribute('role','group');countGrid.setAttribute('aria-label','Nombre de poids');
  const countButton=button('',()=>{closePicker();countGrid.hidden=!countGrid.hidden;countButton.setAttribute('aria-expanded',String(!countGrid.hidden));if(!countGrid.hidden)countGrid.querySelector('[aria-pressed=true]')?.focus();},'wc-count');
  countButton.dataset.cdqWeightRowsV2871='';countButton.setAttribute('aria-labelledby',countLabel.id);countButton.setAttribute('aria-expanded','false');countButton.setAttribute('aria-controls',countGrid.id);
  for(let n=1;n<=14;n++){
    const choice=button(String(n),()=>{count=n;countGrid.hidden=true;countButton.setAttribute('aria-expanded','false');closePicker();renderRows();countButton.focus();});
    choice.dataset.weightCount=String(n);choice.setAttribute('aria-label',n+' poids');countGrid.append(choice);
  }
  countGrid.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();countGrid.hidden=true;countButton.setAttribute('aria-expanded','false');countButton.focus();}});
  countSection.append(countLabel,countButton,countGrid);
  const help=make('p','wc-help','Choisissez les poids. Leurs valeurs nominales et tolérances seront inscrites dans le certificat.');
  const list=make('div','wc-list'),summary=make('p','wc-summary'),error=make('p','wc-error');error.setAttribute('role','alert');
  const createButton=button('Créer le certificat',()=>{
    try{
      const first=selections.slice(0,count).findIndex(value=>!value);
      if(first!==-1){error.textContent='Choisissez le poids '+(first+1)+' avant de créer le certificat.';openPicker(first);rows[first].mass.focus();return;}
      error.textContent='';create(count,normalizeWeightSelectionV2872(selections.slice(0,count),count));
    }catch(problem){error.textContent=problem.message||String(problem);}
  },'wc-create');createButton.dataset.cdqWeightsCreateV2872='';
  root.append(countSection,help,list,summary,error,createButton);body.replaceChildren(root);
  function updateSummary(){
    const chosen=selections.slice(0,count).filter(Boolean).length;
    summary.textContent=chosen+' / '+count+' poids choisis';createButton.setAttribute('aria-disabled',String(chosen!==count));
    countButton.replaceChildren(make('span','',count+' poids'),make('span','','⌄'));
    for(const option of countGrid.children)option.setAttribute('aria-pressed',String(Number(option.dataset.weightCount)===count));
  }
  function closePicker(){
    if(openIndex>=0){rows[openIndex]?.picker.replaceChildren();if(rows[openIndex]){rows[openIndex].picker.hidden=true;rows[openIndex].mass.setAttribute('aria-expanded','false');}}
    openIndex=-1;
  }
  function updateRow(index){
    const row=rows[index],selected=selections[index],value=selected?weightChoiceDetailsV2872(selected):null;
    row.mass.replaceChildren(make('span','',value?.label||'Choisir le poids'),make('span','','⌄'));
    row.mass.setAttribute('aria-label','Poids '+(index+1)+' : '+(value?.label||'choisir une valeur'));
    row.tolerance.textContent=value?'Tolérance : '+value.toleranceLabel+(value.custom?' · saisie manuelle':''):'Tolérance automatique';
    row.repeat.hidden=!selected||index===count-1;updateSummary();
  }
  function choose(index,choice){
    selections[index]=normalizeWeightChoiceV2872(choice);error.textContent='';closePicker();updateRow(index);rows[index].mass.focus();
  }
  function renderRows(){
    rows.length=0;list.replaceChildren();
    for(let index=0;index<count;index++){
      const row=make('section','wc-row'),head=make('div','wc-row-head'),number=make('span','wc-number','Poids '+(index+1));
      const mass=button('',()=>openIndex===index?closePicker():openPicker(index),'wc-mass');mass.dataset.weightIndex=String(index+1);mass.setAttribute('aria-expanded','false');
      const tolerance=make('p','wc-tolerance'),picker=make('div','wc-picker');picker.id='cdqWeightPickerV2872-'+index;picker.hidden=true;mass.setAttribute('aria-controls',picker.id);
      const repeat=button('Utiliser pour les poids suivants',()=>{for(let next=index+1;next<count;next++){selections[next]={...selections[index]};updateRow(next);}error.textContent='';},'wc-repeat');
      head.append(number,mass);row.append(head,tolerance,repeat,picker);list.append(row);rows.push({row,mass,tolerance,picker,repeat});updateRow(index);
    }
    updateSummary();
  }
  function openPicker(index){
    closePicker();openIndex=index;const holder=rows[index].picker;holder.hidden=false;rows[index].mass.setAttribute('aria-expanded','true');
    countGrid.hidden=true;countButton.setAttribute('aria-expanded','false');
    if(selections[index])category=weightChoiceDetailsV2872(selections[index]).category;
    const tabs=make('div','wc-tabs'),options=make('div','wc-options'),custom=make('div','wc-custom');tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label','Unité du poids');
    const note=make('p','wc-help','Tolérances : NIST 105-1, classe F.');
    function drawOptions(){
      custom.hidden=true;options.hidden=false;options.replaceChildren();
      const preferred=category==='metric'?['kg:20','kg:10','kg:5','kg:2','kg:1','g:500']:category==='lb'?['lb:50','lb:20','lb:10','lb:5','lb:1']:['oz:8','oz:4','oz:2','oz:1'];
      const choices=WEIGHT_CATALOG_V2872.filter(value=>value.category===category).sort((a,b)=>{const i=preferred.indexOf(a.id),j=preferred.indexOf(b.id);return (i<0?999:i)-(j<0?999:j);});
      options.setAttribute('role','listbox');options.setAttribute('aria-label','Valeur nominale');
      for(const value of choices){const option=button('',()=>choose(index,{catalogId:value.id}));option.setAttribute('role','option');option.setAttribute('aria-selected',String(selections[index]?.catalogId===value.id));option.dataset.weightCatalogId=value.id;option.append(make('strong','',value.label),make('small','',value.toleranceLabel));options.append(option);}
      for(const tab of tabs.children)tab.setAttribute('aria-selected',String(tab.dataset.weightCategory===category));
      note.textContent='Tolérances : NIST 105-1, classe F.';
    }
    for(const group of WEIGHT_CATEGORIES_V2872){const tab=button(group.label,()=>{category=group.id;drawOptions();});tab.dataset.weightCategory=group.id;tab.setAttribute('role','tab');tabs.append(tab);}
    function manual(){
      options.hidden=true;custom.hidden=false;custom.replaceChildren();note.textContent='Saisissez la valeur nominale et sa tolérance.';
      let unit=category==='metric'?'kg':category,toleranceUnit='mg';
      const nominalLabel=make('label','','Valeur nominale'),nominal=make('input');nominal.type='text';nominal.inputMode='decimal';nominal.autocomplete='off';nominal.setAttribute('aria-label','Valeur nominale personnalisée');nominalLabel.append(nominal);
      const unitRow=make('div','wc-units');unitRow.setAttribute('role','group');unitRow.setAttribute('aria-label','Unité nominale');
      const toleranceLabel=make('label','','Tolérance ±'),toleranceInput=make('input');toleranceInput.type='text';toleranceInput.inputMode='decimal';toleranceInput.autocomplete='off';toleranceInput.setAttribute('aria-label','Tolérance personnalisée');toleranceLabel.append(toleranceInput);
      const toleranceRow=make('div','wc-units');toleranceRow.setAttribute('role','group');toleranceRow.setAttribute('aria-label','Unité de tolérance');
      const pressed=(holder,value)=>{for(const option of holder.children)option.setAttribute('aria-pressed',String(option.textContent===value));};
      for(const value of category==='metric'?['kg','g','mg']:[category])unitRow.append(button(value,()=>{unit=value;pressed(unitRow,unit);}));
      for(const value of ['mg','g'])toleranceRow.append(button(value,()=>{toleranceUnit=value;pressed(toleranceRow,toleranceUnit);}));
      pressed(unitRow,unit);pressed(toleranceRow,toleranceUnit);
      const apply=button('Utiliser ce poids',()=>{try{choose(index,{custom:true,nominal:nominal.value,unit,tolerance:toleranceInput.value,toleranceUnit});}catch(problem){error.textContent=problem.message||String(problem);}});
      custom.append(nominalLabel,unitRow,toleranceLabel,toleranceRow,apply);nominal.focus();
    }
    const customButton=button('Saisie manuelle',manual),closeButton=button('Fermer les choix',()=>{closePicker();rows[index].mass.focus();});
    holder.append(tabs,options,custom,note,customButton,closeButton);drawOptions();
    holder.onkeydown=event=>{if(event.key==='Escape'){event.preventDefault();closePicker();rows[index].mass.focus();}};
  }
  renderRows();countButton.focus();
  return {getSelection:()=>selections.slice(0,count).map(value=>value?{...value}:null),getCount:()=>count};
}
