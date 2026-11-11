import {reportFieldNameV2819,reportFieldV2819,reportFieldValueV2819,isV34ReportFieldsV2819,isWeightsV6FieldsV2866,weightsCreationIdentityV2866} from './report-field-aliases-v2819.mjs';
import {isWeightCreationFieldV2872} from './weights-catalog-v2872.mjs';
import {weightsDateParts} from './reader-weights-v2871.mjs';
import {normalizePdfLayoutBordersV2872,refreshWeightTextAppearanceV2872} from './pdf-layout-borders-v2872.mjs';
import {t05Family} from './reader-t05.mjs';
import {normalizeMeasurementRulesV2736} from './reader-measurements-v2736.mjs';
import {normalizeReportVisualV2736} from './reader-report-visual-v2736.mjs';
import {applyEquipmentHeaderGapV2736} from './reader-equipment-gap-v2736.mjs';
import {approvedReportFamilyV2735,updateApprovedIdentityAppearanceV2735} from './reader-approved-reports-v2735.mjs';
import {normalizeFloorStatusV2691} from './reader-floor-status-v2691.mjs';
// Fill raw inputs, then run the approved PDF's own JavaScript calculations.
import {floorTemplate} from './floor-template-v2519.mjs';
import {compactToleranceActions,centerSingleLineAppearances} from './reader-layout-v2653.mjs';
import {readCalculationMetadataV2724} from './pdf-metadata-v2724.mjs';
const assets=new URL('./vendor/pdfjs-6.3.289/',import.meta.url).href;
export const rawField=/^(client_(nom|telephone|technicien|adresse|ville|province|code_postal)|(?:prochain_etalonnage|date_etalonnage)_[123]|frequence_etalonnage|(?:indicateur|base_balance)_(fabricant|modele|numero_serie|numero_am)|imprimante_(fabricant|modele|numero_serie)|identification_balance|etendue_verifiee|legal_pour_commerce|capacite_maximale|unite_mesure|echelon|etalon_utilise|charge_point_[1-6]_(charge_utilisee|avant_correction|apres_correction)|charge_excentricite|excentricite_(avant|apres)_(arriere_gauche|avant_gauche|arriere_droit|avant_droit))$/;
let engine;
const norm=s=>String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim().toLowerCase();
export async function fillPdf(values,{blob,strict=true,onlyEmpty=false,library=null}={}){
  const entries=Object.entries(values||{}).filter(([,v])=>v!==null&&v!==undefined&&String(v).trim()!=='');
  for(const [k,v] of entries)if((!rawField.test(k)&&!(k==='date_etalonnage'&&weightsDateParts(v))&&!isWeightCreationFieldV2872(k,v))||String(v).length>1000)throw Error('Champ de transfert refusé : '+k);
  let bytes=new Uint8Array(await (blob||(await floorTemplate()).blob).arrayBuffer());
  await import('./vendor/pdf-lib-1.17.1.min.js');
  const L=library||globalThis.PDFLib,lib=await L.PDFDocument.load(bytes),form=lib.getForm(),approved=approvedReportFamilyV2735(lib,L);let changed=false;
  if(isWeightsV6FieldsV2866(form)){
    for(const [k,v] of entries)if(!/^client_(nom|telephone|technicien|adresse|ville|province|code_postal)$/.test(k)&&!(k==='date_etalonnage'&&weightsDateParts(v))&&!isWeightCreationFieldV2872(k,v))throw Error('Champ de transfert refusé : '+k);
    const touched=[];
    for(const [key,value]of Object.entries(weightsCreationIdentityV2866(Object.fromEntries(entries)))){
      const name=reportFieldNameV2819(form,key),field=form.getFieldMaybe(name);
      if(!field){if(strict)throw Error('Champ absent du modèle : '+name);continue;}
      if(field.isReadOnly())continue;
      if(field instanceof L.PDFTextField&&(!onlyEmpty||!String(field.getText()||'').trim())){field.setText(String(value));touched.push(field);}
    }
    if(!touched.length)return blob;
    if(lib.catalog.lookupMaybe(L.PDFName.of('CDQVisualV2872'),L.PDFNumber)?.asNumber()===2872){
      refreshWeightTextAppearanceV2872(lib,L,touched.map(field=>field.getName()));
      normalizePdfLayoutBordersV2872(lib,L);
    }else{
      const font=await lib.embedFont(L.StandardFonts.Helvetica);
      for(const field of touched)field.defaultUpdateAppearances(font);
    }
    return new Blob([await lib.save({updateFieldAppearances:false})],{type:'application/pdf'});
  }
  for(const [k] of entries)if(!rawField.test(k))throw Error('Champ de transfert refusé : '+k);
  // A V27.37 reviewed Multi-têtes has its own 57 native calculators with
  // independent Poids 1 / Poids 2 states. Do not wrap them again during
  // creation/prefill: the V27.36 wrapper overwrites valid native results.
  // The strict approvedReportFamilyV2735 provenance check above must pass.
  const nativeMulti=approved==='multitete'&&
    lib.catalog.lookupMaybe(L.PDFName.of('CDQNativeMultiHeadV2763'),L.PDFNumber)?.asNumber()===2763&&
    lib.catalog.has(L.PDFName.of('CDQApprovedReportV2737'))&&
    lib.catalog.lookupMaybe(L.PDFName.of('CDQMultiHeadSkipOverloadV2737'),L.PDFNumber)?.asNumber()===2737;
  const t05=t05Family(lib,L),v34=isV34ReportFieldsV2819(form);
  for(const entry of entries)entry[0]=reportFieldNameV2819(form,entry[0]);
  if(t05||v34)changed=false;
  else if(approved)changed=(nativeMulti?false:normalizeMeasurementRulesV2736(lib,L,approved))|
    normalizeReportVisualV2736(lib,L,approved)|applyEquipmentHeaderGapV2736(lib,L,approved);
  else changed=compactToleranceActions(lib,L)|normalizeFloorStatusV2691(lib,L);
  for(const entry of entries){
    const [name,value]=entry;const field=form.getFieldMaybe(name);
    if(!field){if(strict)throw Error('Champ absent du modèle : '+name);continue;}
    if(field instanceof L.PDFDropdown){
      const found=field.getOptions().find(o=>norm(o)===norm(value));
      // Existing options may have distinct export/display values; match export too.
      const raw=field.acroField.getOptions().find(o=>norm(o.value.decodeText())===norm(value));
      if(raw)entry[1]=raw.value.decodeText();
      else if(found){const opt=field.acroField.getOptions().find(o=>o.display?.decodeText()===found);entry[1]=opt?.value.decodeText()||found;}
      else if(['client_technicien','etalon_utilise','essai_cdq_client_technicien','essai_cdq_etalon_utilise'].includes(name)){field.addOptions([String(value).trim()]);changed=true;}
      else throw Error('Choix inconnu pour '+name+' : '+value);
    }
  }
  // Identity-only prefill has no measurement calculations. Keep the approved
  // JavaScript and editable fields, without booting PDF.js + QuickJS a first time.
  if(entries.every(([name])=>/^(?:essai_cdq_)?client_/.test(name))){
    for(const [name,value] of entries){
      const field=form.getFieldMaybe(name);if(!field)continue;
      if(field instanceof L.PDFTextField){if(!onlyEmpty||!String(field.getText()||'').trim())field.setText(String(value));}
      else if(field instanceof L.PDFDropdown&&(!onlyEmpty||!field.getSelected().some(v=>String(v).trim())))field.select(String(value));
    }
    const font=approved||v34?null:await lib.embedFont(L.StandardFonts.HelveticaBold);
    for(const [name] of entries){
      const field=form.getFieldMaybe(name);if(!field)continue;
      if(v34)continue;
      if(approved){updateApprovedIdentityAppearanceV2735(lib,L,field);continue;}
      // Some approved PDFs contain a non-widget kid without a rectangle.
      // Update only identity widgets with actual geometry; keep every field,
      // script and original kid in the document unchanged.
      const original=field.acroField.getWidgets;
      const widgets=original.call(field.acroField).filter(w=>{try{const r=w.getRectangle();return [r.x,r.y,r.width,r.height].every(Number.isFinite);}catch{return false;}});
      if(widgets.length){try{field.acroField.getWidgets=()=>widgets;field.defaultUpdateAppearances(font);}finally{field.acroField.getWidgets=original;}}
    }
    if(v34){
      // The V34 saver owns the exact embedded condensed font and multiline fit.
      const {saveEditableFormAppearance}=await import('./reader-choice-appearance-v2572.mjs');
      return new Blob([await saveEditableFormAppearance(await lib.save({updateFieldAppearances:false}),L)],{type:'application/pdf'});
    }
    if(t05){ /* Preserve native T05 identity appearance. */ }
    else if(approved)normalizeReportVisualV2736(lib,L,approved);
    else centerSingleLineAppearances(lib,L);
    normalizePdfLayoutBordersV2872(lib,L);
    return new Blob([await lib.save({updateFieldAppearances:false})],{type:'application/pdf'});
  }
  if(changed)bytes=await lib.save({updateFieldAppearances:false});
  engine||=import(assets+'build/pdf.mjs');const api=await engine;api.GlobalWorkerOptions.workerSrc=assets+'build/pdf.worker.mjs';
  const task=api.getDocument({data:bytes,standardFontDataUrl:assets+'standard_fonts/',cMapUrl:assets+'cmaps/',cMapPacked:true,wasmUrl:assets+'wasm/',isEvalSupported:false});const doc=await task.promise;
  let sandbox;const valid=new Map(),errors=[];
  const update=e=>{const {id,siblings,...detail}=e.detail||{};if(detail.command==='error'){errors.push(detail.value);console.error(detail.value);return;}for(const key of [id,...(siblings||[])])if(valid.has(key)){const value={...detail},def=valid.get(key);if(def.type==='text'&&typeof value.value==='number')value.value=String(value.value);if(def.type==='checkbox'&&typeof value.value==='string')value.value=value.value!=='Off'&&value.value===def.exportValues;doc.annotationStorage.setValue(key,value);}};
  try{
    const {objects,calculationOrder,metadata,actions}=await readCalculationMetadataV2724(doc);if(!objects)throw Error('Ce PDF ne contient pas de formulaire.');
    const fields=objects instanceof Map?objects:new Map(Object.entries(objects));
    for(const defs of fields.values())for(const def of defs)valid.set(def.id,def);
    window.addEventListener('updatefromsandbox',update);
    const {QuickJSSandbox}=await import(assets+'build/pdf.sandbox.mjs');sandbox=await QuickJSSandbox(assets+'wasm/');
    sandbox.create({objects,calculationOrder,appInfo:{platform:navigator.platform,language:'fr-CA'},docInfo:{...metadata.info,numPages:doc.numPages,actions}});
    sandbox.dispatchEvent({id:'doc',name:'Open'});
    for(const [name,raw] of entries){
      const defs=fields.get(name);if(!defs?.length){if(strict)throw Error('Champ absent : '+name);continue;}
      const value=String(raw),id=defs[0].id;
      sandbox.dispatchEvent({id,name:'Keystroke',value,willCommit:true,commitKey:1,selStart:0,selEnd:value.length});
      sandbox.dispatchEvent({id,name:'Blur',value});
    }
    sandbox.dispatchEvent({id:'doc',name:'WillSave'});
    // Allow document timers to finish; Enter navigation is not triggered by this transfer.
    await new Promise(r=>setTimeout(r,80));
    if(errors.length)throw Error('Calcul PDF interrompu : '+errors[0]);
    const {saveEditableFormAppearance}=await import('./reader-choice-appearance-v2572.mjs');
    const output=new Blob([await saveEditableFormAppearance(await doc.saveDocument(),L)],{type:'application/pdf'});
    return output;
  }finally{window.removeEventListener('updatefromsandbox',update);sandbox?.nukeSandbox();await task.destroy();}
}

