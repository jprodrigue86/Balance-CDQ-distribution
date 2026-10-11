import {clearWidgetFrameV2702} from './reader-truck-equipment-v2702.mjs';

// Presentation contract for the explicitly authored Table v2737. The existing
// readings, calculation order and calculation actions are outside this module.
export const tableColumnV2737=Object.freeze({
  marker:'CDQTableColumnV2737',revision:2737,choice:'colonne',
  options:Object.freeze(['Sans','Avec']),
  groups:Object.freeze({
    indicateur:Object.freeze({suffixes:['fabricant','modele','numero_serie','numero_am'],Sans:543,Avec:543}),
    base_balance:Object.freeze({suffixes:['fabricant','modele','numero_serie','numero_am'],Sans:543,Avec:527}),
    imprimante:Object.freeze({suffixes:['fabricant','modele','numero_serie'],Sans:527,Avec:511})
  }),
  artwork:Object.freeze({
    _cdq_points_diagram_4:'Sans',
    _cdq_table_colonne_diagram_avec:'Avec',
    _cdq_table_colonne_equipement_sans:'Sans',
    _cdq_table_colonne_equipement_avec:'Avec'
  })
});
export const tableColumnEquipmentV2737=Object.freeze(Object.entries(tableColumnV2737.groups).flatMap(([prefix,g])=>g.suffixes.map(suffix=>prefix+'_'+suffix)));
export const tableColumnHiddenFontsV2737=Object.freeze(tableColumnEquipmentV2737.filter(name=>name.startsWith('indicateur_')));
export const tableTypeV2739=Object.freeze({
  marker:'CDQTableTypeV2739',revision:2739,choice:'type_balance',column:'colonne',
  options:Object.freeze(['Balance de table','Balance compteuse'])
});
const modeOf=value=>(Array.isArray(value)?value[0]:value)==='Avec'?'Avec':'Sans';
const valueOf=value=>String((Array.isArray(value)?value[0]:value)??'').trim();
const definitions=(fields,name)=>{const raw=fields?.get?.(name)||fields?.[name];return raw?(Array.isArray(raw)?raw:[raw]):[];};
const requiredNames=[tableColumnV2737.choice,...tableColumnEquipmentV2737,...Object.keys(tableColumnV2737.artwork)];

export function isTableTypeFormV2739(pdf,L){
  const N=L.PDFName.of,marker=pdf.catalog.lookupMaybe(N(tableTypeV2739.marker),L.PDFDict);
  if(marker?.lookupMaybe(N('Revision'),L.PDFNumber)?.asNumber()!==2739||marker.get(N('Choice'))?.decodeText?.()!=='type_balance'||marker.get(N('Column'))?.decodeText?.()!=='colonne')return false;
  const old=pdf.catalog.lookupMaybe(N(tableColumnV2737.marker),L.PDFDict),form=pdf.getForm(),type=form.getFieldMaybe('type_balance');
  return old?.lookupMaybe(N('Revision'),L.PDFNumber)?.asNumber()===2737&&old.get(N('Choice'))?.decodeText?.()==='colonne'&&
    type?.getOptions?.().join('|')===tableTypeV2739.options.join('|')&&tableTypeV2739.options.includes(valueOf(type.getSelected?.()))&&requiredNames.every(name=>form.getFieldMaybe(name));
}

export function isTableTypeMetadataV2739(fields){
  const type=definitions(fields,'type_balance')[0],column=definitions(fields,'colonne')[0];
  const tagged=field=>(field?.actions?.get?.('Keystroke')||field?.actions?.Keystroke||[]).some(source=>source.includes('CDQ_TABLE_TYPE_V2739'));
  return requiredNames.every(name=>definitions(fields,name).length)&&type?.items?.map(item=>item.exportValue).join('|')===tableTypeV2739.options.join('|')&&
    column?.items?.map(item=>item.exportValue).join('|')==='Sans|Avec'&&tagged(type)&&tagged(column);
}

export function isTableColumnFormV2737(pdf,L){
  const N=L.PDFName.of,marker=pdf.catalog.lookupMaybe(N(tableColumnV2737.marker),L.PDFDict);
  if(marker?.lookupMaybe(N('Revision'),L.PDFNumber)?.asNumber()!==2737||marker.get(N('Choice'))?.decodeText?.()!=='colonne')return false;
  const form=pdf.getForm(),type=form.getFieldMaybe('type_balance');
  const label=type?.getText?.()||type?.getSelected?.().join(' ')||'';
  return (/^Balance de table$/i.test(label.trim())||isTableTypeFormV2739(pdf,L))&&requiredNames.every(name=>form.getFieldMaybe(name));
}

export function isTableColumnMetadataV2737(fields){
  if(!requiredNames.every(name=>definitions(fields,name).length))return false;
  const label=definitions(fields,'type_balance')[0]?.value;
  if(!/^Balance de table$/i.test(String(label||'').trim())&&!isTableTypeMetadataV2739(fields))return false;
  const choice=definitions(fields,'colonne')[0];
  return choice?.items?.map(item=>item.exportValue).join('|')==='Sans|Avec'&&
    (choice.actions?.get?.('Keystroke')||choice.actions?.Keystroke||[]).some(source=>source.includes('CDQ_TABLE_COLUMN_V2737'));
}

// PDF.js does not serialize sandbox field.rect assignments. Repair the exact
// same presentation at the end of each native open/save pipeline, preserving
// the authored widths, text appearances and both original/new photographs.
export function normalizeTableColumnV2737(pdf,L){
  if(!isTableColumnFormV2737(pdf,L))return false;
  const N=L.PDFName.of,form=pdf.getForm(),choice=form.getField('colonne');
  const typeChoice=isTableTypeFormV2739(pdf,L),counting=typeChoice&&valueOf(form.getField('type_balance').getSelected())==='Balance compteuse';
  const mode=counting?'Sans':modeOf(choice.getSelected());let changed=false;
  if(choice.getSelected().join(' ')!==mode){choice.select(mode);changed=true;}
  for(const [prefix,g] of Object.entries(tableColumnV2737.groups))for(const suffix of g.suffixes){
    const field=form.getField(prefix+'_'+suffix),hidden=mode==='Sans'&&prefix==='indicateur';
    for(const widget of field.acroField.getWidgets()){
      const r=widget.getRectangle();
      if(r.y!==g[mode]){widget.setRectangle({...r,y:g[mode]});changed=true;}
      const flags=widget.getFlags(),next=hidden?(flags|2|32)&~4:(flags&~(2|32))|4;
      if(flags!==next){widget.setFlags(next);changed=true;}
    }
  }
  for(const [name,state] of Object.entries(tableColumnV2737.artwork)){
    const field=form.getField(name),value=state===mode?'Yes':'Off';
    if(String(field.acroField.dict.get(N('V')))!=='/'+value){field.acroField.dict.set(N('V'),N(value));changed=true;}
    for(const widget of field.acroField.getWidgets()){
      if(String(widget.dict.get(N('AS')))!=='/'+value){widget.dict.set(N('AS'),N(value));changed=true;}
      const flags=widget.getFlags(),next=(flags&~(2|32))|4;
      if(flags!==next){widget.setFlags(next);changed=true;}
    }
  }
  // Its frame lives in the native page stream; the new choice owns text only.
  for(const widget of choice.acroField.getWidgets())changed=clearWidgetFrameV2702(pdf,L,widget)||changed;
  if(typeChoice)for(const widget of form.getField('type_balance').acroField.getWidgets())changed=clearWidgetFrameV2702(pdf,L,widget)||changed;
  return changed;
}

// Self-contained presentation actions also work in native Acrobat. No shared
// calculation function or existing field action needs to be modified.
export function tableColumnActionSourcesV2737(){
  const config=JSON.stringify({groups:tableColumnV2737.groups,artwork:tableColumnV2737.artwork,required:requiredNames});
  const source=preferred=>`/* CDQ_TABLE_COLUMN_V2737: presentation only */\n(function(doc,preferred){\nvar c=${config};\nvar type=doc.getField('type_balance');\nif(!type||!/^Balance de table$/i.test(String(type.value).replace(/^\\s+|\\s+$/g,'')))return;\nfor(var i=0;i<c.required.length;i++)if(!doc.getField(c.required[i]))return;\nvar choice=doc.getField('colonne'),v=preferred==='Avec'||preferred==='Sans'?preferred:choice.value;\nvar mode=v==='Avec'?'Avec':'Sans';\nfor(var prefix in c.groups){var g=c.groups[prefix];for(var j=0;j<g.suffixes.length;j++){\nvar f=doc.getField(prefix+'_'+g.suffixes[j]),hidden=mode==='Sans'&&prefix==='indicateur',r=f.rect;\nif(f.display!==(hidden?1:0))f.display=hidden?1:0;\nif(r&&r.length===4){var y=g[mode],h=Math.abs(r[3]-r[1]);if(Math.min(r[1],r[3])!==y)f.rect=[Math.min(r[0],r[2]),y+h,Math.max(r[0],r[2]),y];}\n}}\nfor(var name in c.artwork){var art=doc.getField(name),value=c.artwork[name]===mode?'Yes':'Off';if(art.value!==value)art.value=value;}\n})(this,${preferred});`;
  return {
    K:source("typeof event!=='undefined'&&!event.willCommit&&(event.changeEx==='Sans'||event.changeEx==='Avec')?event.changeEx:(typeof event!=='undefined'?event.value:null)"),
    V:source("typeof event!=='undefined'?event.value:null"),
    A:source('null'),Open:source('null'),WillSave:source('null')
  };
}

// Authoring helper; called only by the owner of the new PDF candidate. The
// reader's normalizer never installs scripts or silently changes a template.
export function installTableColumnActionsV2737(pdf,L){
  const N=L.PDFName.of,form=pdf.getForm(),choice=form.getField('colonne');
  if(!requiredNames.every(name=>form.getFieldMaybe(name)))throw Error('Incomplete Table column presentation');
  const sources=tableColumnActionSourcesV2737(),action=source=>pdf.context.register(pdf.context.obj({S:'JavaScript',JS:L.PDFHexString.fromText(source)}));
  let aa=choice.acroField.dict.lookupMaybe(N('AA'),L.PDFDict);if(!aa){aa=pdf.context.obj({});choice.acroField.dict.set(N('AA'),aa);}
  for(const key of ['K','V']){if(aa.has(N(key)))throw Error('New colonne already has '+key+' action');aa.set(N(key),action(sources[key]));}
  for(const widget of choice.acroField.getWidgets()){
    if(widget.dict.has(N('A')))throw Error('New colonne already has Action');
    widget.dict.set(N('A'),action(sources.A));
  }
  const append=(owner,key,source)=>{
    const old=owner.get(N(key)),next=action(source);
    if(!old){owner.set(N(key),next);return;}
    let node=pdf.context.lookup(old);const seen=new Set();
    if(!(node instanceof L.PDFDict))throw Error('Non-action '+key+' requires authoring review');
    while(node.has(N('Next'))){
      if(seen.has(node))throw Error('Cyclic '+key+' action');seen.add(node);
      const child=pdf.context.lookup(node.get(N('Next')));
      if(child instanceof L.PDFArray){child.push(next);return;}
      if(!(child instanceof L.PDFDict))throw Error('Unsupported '+key+' action chain');node=child;
    }
    node.set(N('Next'),next);
  };
  // PDF.js reads the first OpenAction only; it does not traverse its Next.
  // A named document script runs in both PDF.js and Acrobat and leaves the
  // report's existing OpenAction and named scripts completely unchanged.
  let names=pdf.catalog.lookupMaybe(N('Names'),L.PDFDict);
  if(!names){names=pdf.context.obj({});pdf.catalog.set(N('Names'),names);}
  let tree=names.lookupMaybe(N('JavaScript'),L.PDFDict);
  if(!tree){tree=pdf.context.obj({});names.set(N('JavaScript'),tree);}
  if(tree.has(N('Kids')))throw Error('Nested document-script name tree requires authoring review');
  const existing=tree.lookupMaybe(N('Names'),L.PDFArray)?.asArray()||[],entries=[];
  for(let i=0;i<existing.length;i+=2)entries.push([existing[i],existing[i+1]]);
  const documentName='CDQ_table_colonne_v2737';
  if(entries.some(([key])=>key.decodeText()===documentName))throw Error('Table column document action already installed');
  entries.push([L.PDFString.of(documentName),action(sources.Open)]);
  entries.sort(([a],[b])=>a.decodeText()<b.decodeText()?-1:a.decodeText()>b.decodeText()?1:0);
  tree.set(N('Names'),pdf.context.obj(entries.flat()));
  let docAA=pdf.catalog.lookupMaybe(N('AA'),L.PDFDict);if(!docAA){docAA=pdf.context.obj({});pdf.catalog.set(N('AA'),docAA);}
  append(docAA,'WS',sources.WillSave);
  pdf.catalog.set(N(tableColumnV2737.marker),pdf.context.obj({Revision:2737,Choice:L.PDFString.of('colonne')}));
  return sources;
}

// The v2739 choice extends only the presentation contract. Keep the v2737
// sources above unchanged so previously approved PDFs retain their actions.
export function tableTypeActionSourcesV2739(){
  const config=JSON.stringify({groups:tableColumnV2737.groups,artwork:tableColumnV2737.artwork,required:requiredNames});
  const source=(preferred,preferredType,kind)=>`/* CDQ_TABLE_COLUMN_V2737 / CDQ_TABLE_TYPE_V2739: presentation only */
(function(doc,preferred,preferredType,kind){
var c=${config},type=doc.getField('type_balance'),choice=doc.getField('colonne');
if(!type||!choice||type.numItems!==2||type.getItemAt(0,true)!=='Balance de table'||type.getItemAt(1,true)!=='Balance compteuse')return;
for(var i=0;i<c.required.length;i++)if(!doc.getField(c.required[i]))return;
var label=preferredType==='Balance de table'||preferredType==='Balance compteuse'?preferredType:String(type.value).replace(/^\\s+|\\s+$/g,'');
if(label!=='Balance de table'&&label!=='Balance compteuse')return;
var counting=label==='Balance compteuse',v=preferred==='Avec'||preferred==='Sans'?preferred:choice.value;
var mode=counting?'Sans':v==='Avec'?'Avec':'Sans';
if(counting){
  if(kind==='column'&&typeof event!=='undefined'&&event){
    if(event.name==='Keystroke'&&!event.willCommit&&preferred==='Avec')event.rc=false;
    else if(event.name==='Validate'||event.name==='Keystroke'&&event.willCommit)event.value='Sans';
  }
  if(choice.value!=='Sans')choice.value='Sans';
}
for(var prefix in c.groups){var g=c.groups[prefix];for(var j=0;j<g.suffixes.length;j++){
var f=doc.getField(prefix+'_'+g.suffixes[j]),hidden=mode==='Sans'&&prefix==='indicateur',r=f.rect;
if(f.display!==(hidden?1:0))f.display=hidden?1:0;
if(r&&r.length===4){var y=g[mode],h=Math.abs(r[3]-r[1]);if(Math.min(r[1],r[3])!==y)f.rect=[Math.min(r[0],r[2]),y+h,Math.max(r[0],r[2]),y];}
}}
for(var name in c.artwork){var art=doc.getField(name),value=c.artwork[name]===mode?'Yes':'Off';if(art.value!==value)art.value=value;}
})(this,${preferred},${preferredType},'${kind}');`;
  const eventValue="typeof event!=='undefined'&&event?event.value:null";
  const nextColumn="typeof event!=='undefined'&&event&&!event.willCommit&&(event.changeEx==='Sans'||event.changeEx==='Avec')?event.changeEx:("+eventValue+")";
  const nextType="typeof event!=='undefined'&&event&&!event.willCommit&&(event.changeEx==='Balance de table'||event.changeEx==='Balance compteuse')?event.changeEx:("+eventValue+")";
  return {
    K:source(nextColumn,'null','column'),V:source(eventValue,'null','column'),A:source('null','null','column'),
    Open:source('null','null','document'),WillSave:source('null','null','document'),
    TypeK:source('null',nextType,'type'),TypeV:source('null',eventValue,'type'),TypeA:source('null','null','type')
  };
}

// Called only by the PDF author after converting the same type_balance field
// to the two-option choice. Replace the five identified presentation scripts
// in place; preserve all other document scripts, action chains and references.
export function installTableTypeActionsV2739(pdf,L){
  const N=L.PDFName.of,form=pdf.getForm(),type=form.getField('type_balance'),choice=form.getField('colonne');
  if(pdf.catalog.has(N(tableTypeV2739.marker)))throw Error('Table type action already installed');
  if(!isTableColumnFormV2737(pdf,L)||type.getOptions?.().join('|')!==tableTypeV2739.options.join('|'))throw Error('Incomplete Table type presentation');
  if(type.acroField.getWidgets().length!==1||choice.acroField.getWidgets().length!==1)throw Error('Unexpected Table choice widgets');
  const read=action=>action?.lookup(N('JS'))?.decodeText?.();
  const old=tableColumnActionSourcesV2737(),sources=tableTypeActionSourcesV2739(),replacements=[];
  const plan=(role,action)=>{if(!(action instanceof L.PDFDict)||read(action)!==old[role])throw Error('Unexpected Table '+role+' presentation source');replacements.push([role,action]);};
  const columnAA=choice.acroField.dict.lookup(N('AA'),L.PDFDict);
  for(const key of ['K','V'])plan(key,columnAA.lookup(N(key),L.PDFDict));
  plan('A',choice.acroField.getWidgets()[0].dict.lookup(N('A'),L.PDFDict));
  const tree=pdf.catalog.lookup(N('Names'),L.PDFDict).lookup(N('JavaScript'),L.PDFDict);
  if(tree.has(N('Kids')))throw Error('Nested document-script name tree requires authoring review');
  const names=tree.lookup(N('Names'),L.PDFArray).asArray();let documentAction;
  for(let i=0;i<names.length;i+=2)if(names[i].decodeText()==='CDQ_table_colonne_v2737'){
    if(documentAction)throw Error('Duplicate Table document action');documentAction=pdf.context.lookup(names[i+1]);
  }
  plan('Open',documentAction);
  const saves=[],seen=new Set();
  function visit(value){
    const action=pdf.context.lookup(value);if(!action||seen.has(action))return;seen.add(action);
    if(action instanceof L.PDFArray){for(const next of action.asArray())visit(next);return;}
    if(!(action instanceof L.PDFDict))throw Error('Unexpected WillSave action chain');
    if(read(action)===old.WillSave)saves.push(action);
    if(action.has(N('Next')))visit(action.get(N('Next')));
  }
  visit(pdf.catalog.lookup(N('AA'),L.PDFDict).get(N('WS')));
  if(saves.length!==1)throw Error('Expected exactly one Table WillSave presentation');plan('WillSave',saves[0]);
  const typeAA=type.acroField.dict.lookupMaybe(N('AA'),L.PDFDict),typeWidget=type.acroField.getWidgets()[0];
  if(typeAA?.has(N('K'))||typeAA?.has(N('V'))||typeWidget.dict.has(N('A')))throw Error('Unexpected existing Type choice action');
  for(const [role,action] of replacements)action.set(N('JS'),L.PDFHexString.fromText(sources[role]));
  const action=source=>pdf.context.register(pdf.context.obj({S:'JavaScript',JS:L.PDFHexString.fromText(source)}));
  const aa=typeAA||pdf.context.obj({});type.acroField.dict.set(N('AA'),aa);
  aa.set(N('K'),action(sources.TypeK));aa.set(N('V'),action(sources.TypeV));typeWidget.dict.set(N('A'),action(sources.TypeA));
  pdf.catalog.set(N(tableTypeV2739.marker),pdf.context.obj({Revision:2739,Choice:L.PDFString.of('type_balance'),Column:L.PDFString.of('colonne')}));
  return sources;
}

// The annotation layer uses unrotated PDF percentages; its parent owns zoom
// and page rotation. Mirror that public DOM geometry, not private PDF.js data.
export function tableColumnDomRectV2737(rect,y,pageView){
  const dims=pageView?.viewport?.rawDims,view=pageView?.pdfPage?.view;
  if(!dims||!view||!Array.isArray(rect)||rect.length!==4)return null;
  const {pageWidth:w,pageHeight:h,pageX,pageY}=dims,x=Math.min(rect[0],rect[2]),width=Math.abs(rect[2]-rect[0]),height=Math.abs(rect[3]-rect[1]);
  return {left:100*(x-pageX)/w+'%',top:100*(view[3]-y-height+view[1]-pageY)/h+'%',width:100*width/w+'%',height:100*height/h+'%'};
}

export function installReaderTableColumnV2737({surface,getDocument,getFields,getPageView,afterChange=()=>{}}){
  let scheduled=false,disposed=false,applying=false,lastMode=null;
  const controls=name=>Array.from(surface.querySelectorAll('input,select,textarea')).filter(el=>el.name===name);
  function choiceValue(name,fields){
    const choice=controls(name).find(el=>el.tagName==='SELECT');
    if(choice)return valueOf(choice.value);
    const def=definitions(fields,name)[0],stored=getDocument()?.annotationStorage?.getValue(def?.id,def);
    return valueOf(stored?.value??def?.value??def?.defaultValue);
  }
  function counting(fields){return isTableTypeMetadataV2739(fields)&&choiceValue('type_balance',fields)==='Balance compteuse';}
  function mode(){
    const fields=getFields();if(!isTableColumnMetadataV2737(fields))return null;
    return counting(fields)?'Sans':modeOf(choiceValue('colonne',fields));
  }
  function put(def,state){
    const storage=getDocument()?.annotationStorage;if(!storage||!def?.id)return;
    const existing=storage.getValue(def.id,{});
    if(Object.entries(state).some(([key,value])=>existing[key]!==value))storage.setValue(def.id,state);
  }
  function refresh(){
    if(disposed||applying)return;
    const selected=mode(),fields=getFields();if(!selected){lastMode=null;return;}
    applying=true;
    try{
      const typeChoice=isTableTypeMetadataV2739(fields);
      for(const control of controls('type_balance')){
        const section=control.closest('section[data-annotation-id]');if(!section)continue;
        if(typeChoice)section.dataset.cdqTableTypeV2739='true';else delete section.dataset.cdqTableTypeV2739;
      }
      if(counting(fields)){
        for(const def of definitions(fields,'colonne'))put(def,{value:'Sans'});
        for(const control of controls('colonne'))if(control.tagName==='SELECT')control.value='Sans';
      }
      for(const [prefix,g] of Object.entries(tableColumnV2737.groups))for(const suffix of g.suffixes){
        const name=prefix+'_'+suffix,hidden=selected==='Sans'&&prefix==='indicateur';
        for(const def of definitions(fields,name)){
          put(def,{noView:hidden,noPrint:hidden});
          const geometry=tableColumnDomRectV2737(def.rect,g[selected],getPageView(def.page??0));
          for(const control of controls(name)){
            if(control.dataset.elementId&&control.dataset.elementId!==def.id)continue;
            const section=control.closest('section[data-annotation-id]');if(!section)continue;
            if(geometry)Object.assign(section.style,geometry);
            section.style.visibility=hidden?'hidden':'visible';
          }
        }
      }
      for(const [name,state] of Object.entries(tableColumnV2737.artwork)){
        const checked=state===selected;
        for(const def of definitions(fields,name))put(def,{value:checked,noView:false,noPrint:false});
        for(const control of controls(name)){control.checked=checked;const section=control.closest('section[data-annotation-id]');if(section)section.style.visibility='visible';}
      }
      const changed=lastMode!==selected;lastMode=selected;
      afterChange({mode:selected,changed});
    }finally{applying=false;}
  }
  function schedule(){
    if(disposed||scheduled)return;scheduled=true;
    queueMicrotask(()=>{scheduled=false;refresh();});
  }
  const choiceChanged=event=>{if(event.target?.name==='colonne'||event.target?.name==='type_balance'&&isTableTypeMetadataV2739(getFields()))schedule();};
  const reset=()=>schedule();
  surface.addEventListener('input',choiceChanged);
  surface.addEventListener('change',choiceChanged);
  // resetform is non-bubbling in PDF.js, so observe it in capture, then read
  // the choice after the native target listeners have restored its default.
  surface.addEventListener('resetform',reset,true);
  return {refresh,schedule,mode,isSans:()=>mode()==='Sans',dispose(){disposed=true;surface.removeEventListener('input',choiceChanged);surface.removeEventListener('change',choiceChanged);surface.removeEventListener('resetform',reset,true);}};
}
