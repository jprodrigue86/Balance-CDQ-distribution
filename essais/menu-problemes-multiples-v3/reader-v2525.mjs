import {createReaderSaveProgressV2758} from '../../reader-save-progress-v2758.mjs';
import {installVerifiedRangeV2756} from '../../verified-range-v2756.mjs';
import {installFirstTapV2756} from '../../first-tap-v2756.mjs';
import {prepareCamionCanvasBoundaryV2755,installCamionCanvasBoundaryV2755,prepareTrainCalendarBoundaryV2755,installTrainCalendarBoundaryV2755} from '../../reader-canvas-boundary-v2755.mjs';
import {trialReportMetadataFamilyV2743} from '../../reader-trial-reports-v2743.mjs';
import {refreshResultGeometryV2743,restoreBlankResultConclusionV2743} from '../../reader-result-geometry-v2743.mjs';
import {captureReportFieldsV2754,restoreReportFieldsV2754,reportFieldsV2754,reportContextV2754} from '../../report-engine-client-v2754.mjs';
import {matchReportTemplateV2754} from '../../report-engine-match-v2754.mjs';
import {approvedReportMetadataFamilyV2735} from '../../reader-approved-reports-v2735.mjs';
import {createReaderEquipmentEmitterV2746} from '../../reader-equipment-edits-v2746.mjs';
import {refreshReaderCamionDisplayV2741} from '../../reader-camion-display-v2741.mjs';
import {installReaderTableColumnV2737} from '../../reader-table-column-v2737.mjs';
import {installFirstPageRenderLeaseV2731} from '../../reader-first-paint-scheduler-v2731.mjs';
let qaFirstPageLeaseCleanupV2731=()=>{},qaFirstPaintOwnerV2731=null;
import {installMeasurementValidationV2736,measurementErrorV2736,isCorrectionReadingV2736,isCompleteMeasurementInputV2736} from '../../reader-measurements-v2736.mjs';
import {refreshReportVisualV2736} from '../../reader-report-visual-v2736.mjs';
import {firstReaderPaintV2682} from '../../reader-first-paint-v2682.mjs';
import {paintReaderResults} from '../../reader-results-v2648.mjs';
import {identificationReportName} from '../../report-name-v2648.mjs';
import {installTouchNavigation,installFormNavigation,installNativeTextInput} from '../../reader-interactions-v2525.mjs';
import {installReaderCalibration} from '../../reader-calibration-v2565.mjs';
import {installReaderChoices} from './reader-choices-v2572.mjs';
import {installReaderTheme,applyReaderTheme} from '../../reader-theme-v2572.mjs';
import {pdfWorkV2729,validatedPdfSaveInfoV2753} from './pdf-work-v2729.mjs';
import {readReaderOpeningBytesV2753} from '../../reader-opening-source-v2753.mjs';
import {readerTemplatePaintAvailableV2753,prepareReaderTemplatePaintV2753,installReaderTemplatePaintV2753,clearReaderTemplatePaintV2753} from '../../reader-template-paint-v2753.mjs';
import {centerFieldsGlyphs} from '../../reader-layout-v2653.mjs';
import {downloadPdf} from '../../pdf-download-v2657.mjs';
import {readReaderMetadataV2724} from '../../pdf-metadata-v2724.mjs';
import {precisionToleranceDisplayV2726} from '../../reader-precision-excentricity-v2726.mjs';
import {createReaderVisualRefreshV2730} from '../../reader-visual-refresh-v2730.mjs';
import {dispatchReaderSandboxEventV2731,awaitReaderPageActionsV2731} from '../../reader-scripting-fence-v2731.mjs';
import {isCacheableReaderDraftV2730,isCacheableReaderDocumentV2730,hasPristineIdentityV2730,readerSourceKeyV2730,protectReaderSnapshotsV2730,readerViewportV2730,sameReaderViewportV2730,readerOpeningLeaseIsCurrentV2730,readerCanvasGeometryMatchesV2730,serializeReaderScriptingV2730,cancellableReaderPaintV2730,
  captureReaderCanvasesV2730,canRetainReaderCanvasV2730,canReuseReaderCanvasV2730,clearReaderAnnotationStorageV2730,rebuildReaderAnnotationsV2730} from '../../reader-canvas-cache-v2730.mjs';
installReaderTheme();
const assets=new URL('../../vendor/pdfjs-6.3.289/',import.meta.url).href;
function loadReaderModulesV2730(load,base){
  // pdf_viewer.mjs reads the global installed by pdf.mjs during evaluation.
  // The sandbox module is independent and can load alongside the core.
  const core=load(base+'build/pdf.mjs'),sandbox=load(base+'build/pdf.sandbox.mjs');
  const ui=core.then(()=>load(base+'web/pdf_viewer.mjs'));
  return Promise.all([core,ui,sandbox]);
}
const $=id=>document.getElementById(id),hosted=parent!==window;
let parentOrigin='',autoReportName=false;
const formattedFields=new Map(),fieldTypography=new Map();
function applyFieldTypography(){
  const fields=[];
  for(const field of $('viewer').querySelectorAll('input,textarea,select,button.cdq-choice-field')){
    if(isCorrectionReadingV2736(field.name))field.inputMode='text';
    // The trial problem button fits whole selected names to its rectangle.
    // Its source select keeps the native size; paint() owns only the button.
    if(field.matches('button.cdq-choice-field[name="essai_cdq_probleme_constate"]')&&$('viewer').querySelector('select[name="essai_cdq_probleme_constate"]')?.multiple)continue;
    if(!fieldTypography.has(field.name)||field.name.startsWith('_')||/statut/i.test(field.name)||tableColumnV2737?.isSans()&&field.name.startsWith('indicateur_'))continue;
    const size=fieldTypography.get(field.name);
    const desired='calc('+size+'px * var(--total-scale-factor))';
    if(field.style.getPropertyValue('font-size')!==desired||field.style.getPropertyPriority('font-size')!=='important')field.style.setProperty('font-size',desired,'important');
    fields.push(field);
  }
  if(!approvedReportMetadataFamilyV2735(fieldDefinitions))centerFieldsGlyphs(fields);
  refreshReaderCamionDisplayV2741({surface:$('viewer'),document:doc,fields:fieldDefinitions,typography:fieldTypography});
  refreshReportVisualV2736({surface:$('viewer'),fields:fieldDefinitions});
  if(trialReportMetadataFamilyV2743(fieldDefinitions))refreshResultGeometryV2743($('viewer'));
}
function refreshResults(){if(!doc)return;if(trialReportMetadataFamilyV2743(fieldDefinitions)){restoreBlankResultConclusionV2743($('viewer'));refreshResultGeometryV2743($('viewer'));}else paintReaderResults($('viewer'));}
$('viewer').addEventListener('input',()=>requestAnimationFrame(applyFieldTypography));
$('viewer').addEventListener('change',()=>requestAnimationFrame(applyFieldTypography));

try{const o=new URL(document.referrer).origin;if(o===location.origin||/^https:\/\/[a-z0-9-]+-script\.googleusercontent\.com$/.test(o))parentOrigin=o;}catch(_){}
const tell=data=>{if(hosted&&parentOrigin)parent.postMessage(data,parentOrigin)};
let api,viewer,scripting,doc,touch,form,documentTask,pdfWorker,sandboxReady,sandboxModule,readerUIV2730,readOnly=false,dirty=false,version=0,savedVersion=0,saving=false;
let canvasCandidateV2730=null,closedCanvasV2730=null,closedViewportV2730=null,documentPaintV2730=null,documentGenerationV2730=0,resetPromiseV2730=Promise.resolve();
const destroyedReaderTasksV2730=new WeakMap();
const readerSaveProgressV2758=createReaderSaveProgressV2758();
let lastAttempt=null,fieldDefinitions=null,nativeInput,readerCalibration=null,choices=null,decimalGuard=null,tableColumnV2737=null;
const visualRefreshV2730=createReaderVisualRefreshV2730(()=>{
  if(!doc||closed)return;
  tableColumnV2737?.refresh();cdqRestorePrecisionToleranceV2726();refreshResults();applyFieldTypography();
},{defer:()=>opening});
const touchedIdentity=new Set();let lateIdentity=null;
let reportEngineV2754=null,reportSnapshotV2754=null,snapshotUpdatesV2754=[],engineDefaultsAppliedV2754=false;
let initialValuesV2730=null,initialAppliedV2730=false,initialUpdatesV2730=[],initialPreparedDraftV2730=false;
function initializeSandboxIdentityV2730(data,values,document,locked,preparedDraft=false){
  const updates=[];if(locked)return updates;
  for(const [name,value] of Object.entries(values||{})){
    if(!/^client_(nom|telephone|technicien|adresse|ville|province|code_postal)$/.test(name)||typeof value!=='string'||value.length>1000||!value.trim())continue;
    const raw=data.objects?.get?.(name)||data.objects?.[name],defs=raw?(Array.isArray(raw)?raw:[raw]):[];
    // CREATE historically replaced the approved template's static Qc default.
    // Keep onlyEmpty protection for every private value and untrusted report.
    const blankProvince=preparedDraft&&name==='client_province'&&defs.length>0&&defs.every(def=>def.value==='Qc'&&def.defaultValue==='Qc');
    if(!defs.length||defs.every(def=>def.editable===false||def.readOnly)||(!blankProvince&&defs.some(def=>String(def.value??def.defaultValue??'').trim())))continue;
    for(const def of defs){
      if(def.editable===false||def.readOnly)continue;
      const state={value};if(Array.isArray(def.items)){const items=def.items.map(item=>({...item}));if(!items.some(item=>item.exportValue===value))items.push({displayValue:value,exportValue:value});def.items=items;state.items=items;}
      def.value=value;document.annotationStorage.setValue(def.id,state);updates.push({id:def.id,name,...state});
    }
  }
  return updates;
}
function restoreSnapshotV2754(){
  for(const {id,name,...state}of snapshotUpdatesV2754){
    if(state.items)viewer.eventBus.dispatch('updatefromsandbox',{source:window,detail:{id,items:state.items}});
    const definition=cdqFieldDefinitionsV2581(name).find(item=>item.id===id),button=['checkbox','radiobutton'].includes(definition?.type);
    viewer.eventBus.dispatch('updatefromsandbox',{source:window,detail:{id,...state,...(button?{value:state.value?definition.exportValues||'Yes':'Off'}:{}),...(state.noView!==undefined||state.noPrint!==undefined?{display:state.noView?(state.noPrint?1:3):(state.noPrint?2:0)}:{})}});
    doc.annotationStorage.setValue(id,state);
    if(state.formattedValue!==undefined)formattedFields.set(id,state.formattedValue);
    for(const definition of cdqFieldDefinitionsV2581(name))if(definition.id===id){definition.value=button?(state.value?definition.exportValues||'Yes':'Off'):state.value;if(state.items)definition.items=state.items;}
  }
}
function restoreInitialIdentityV2730(){
  for(const update of initialUpdatesV2730){
    const {id,name,value,items}=update;
    // PDF.js processes dropdown items by resetting selection to item zero.
    // Send the items first and the wanted value in a separate event, including
    // after a layer that was absent when sandbox initialization ran.
    if(items)viewer.eventBus.dispatch('updatefromsandbox',{source:window,detail:{id,items}});
    viewer.eventBus.dispatch('updatefromsandbox',{source:window,detail:{id,value}});
    doc.annotationStorage.setValue(id,{value,...(items?{items}:{})});
    for(const definition of cdqFieldDefinitionsV2581(name))if(definition.id===id){definition.value=value;if(items)definition.items=items;}
  }
}
function applyLateIdentity(){
  if(!lateIdentity||!doc||opening||readOnly||closed)return;
  const values=lateIdentity;lateIdentity=null;
  for(const [name,value] of Object.entries(values)){
    if(!/^client_(adresse|ville|province|code_postal|telephone)$/.test(name)||typeof value!=='string'||value.length>1000||!value.trim()||touchedIdentity.has(name))continue;
    const state=cdqStoredFieldStateV2581(name);if(state.readOnly||String(state.value||'').trim())continue;
    const defs=cdqFieldDefinitionsV2581(name);if(!defs.length)continue;
    for(const def of defs)doc.annotationStorage.setValue(def.id,{value});
    for(const input of $('viewer').querySelectorAll('input,textarea'))if(input.name===name&&!input.disabled&&!input.readOnly){input.value=value;input.dispatchEvent(new Event('change',{bubbles:true}));}
    dirty=true;version++;
  }
}
let cdqStableLayerHoldUntilV2556=0;
function cdqWrapStableAnnotationLayerV2556(pageView){
  const layer=pageView?.annotationLayer;
  if(!layer||layer.__cdqStableHideV2556||typeof layer.hide!=='function')return;
  const originalHide=layer.hide.bind(layer);
  layer.__cdqStableHideV2556=originalHide;
  layer.hide=function(){
    if(performance.now()<cdqStableLayerHoldUntilV2556&&pageView?.div?.dataset?.cdqPaintedV2556==='true')return;
    return originalHide();
  };
}
function cdqHoldRenderedLayersV2556(duration=1800){
  cdqStableLayerHoldUntilV2556=Math.max(cdqStableLayerHoldUntilV2556,performance.now()+duration);
  const count=Number(viewer?.pagesCount||0);
  for(let i=0;i<count;i++)cdqWrapStableAnnotationLayerV2556(viewer.getPageView?.(i));
}
function commitActive(){if($('viewer').contains(document.activeElement)){const sink=$('status');sink.tabIndex=-1;sink.focus({preventScroll:true});}}
function cdqTextEntryFieldV2550(el){return !!el&&el.matches?.('.textWidgetAnnotation input,.textWidgetAnnotation textarea')&&!el.disabled&&!el.readOnly&&el.dataset.cdqAutoField!=='true';}
function cdqFieldDefinitionsV2581(name){
  const raw=fieldDefinitions instanceof Map?fieldDefinitions.get(name):fieldDefinitions?.[name];
  return raw?Array.isArray(raw)?raw:[raw]:[];
}
function cdqStoredFieldStateV2581(name){
  const definitions=cdqFieldDefinitionsV2581(name);
  let value='',formattedValue,items,hasValue=false,pdfReadOnly=definitions.length>0;
  for(const definition of definitions){
    let stored=definition;
    try{if(definition?.id)stored=doc?.annotationStorage?.getValue(definition.id,definition)||definition;}catch(_){}
    const candidate=stored?.value??definition?.value??definition?.defaultValue;
    if(formattedValue===undefined)formattedValue=stored?.formattedValue??formattedFields.get(definition.id);
    if(items===undefined)items=stored?.items;
    if(!hasValue&&candidate!==undefined&&candidate!==null){value=candidate;hasValue=true;}
    const flags=Number(stored?.fieldFlags??definition?.fieldFlags??stored?.flags??definition?.flags??0);
    const locked=definition?.editable===false||Boolean(stored?.readOnly??definition?.readOnly) || !!(flags&1);
    if(!locked)pdfReadOnly=false;
  }
  const state={value:hasValue?value:'',formattedValue,readOnly:pdfReadOnly,...(items?{items}: {})};
  const precision=name==='tolerance_excentricite'&&cdqFieldDefinitionsV2581('type_plateau').length>0&&cdqFieldDefinitionsV2581('charge_point_7_charge_utilisee').length>0;
  const display=precisionToleranceDisplayV2726(name,state,precision);
  if(display!==state)for(const definition of definitions)if(definition?.id){
    // Persist the repaired format too: PDF.js uses it for the saved AP stream.
    doc.annotationStorage.setValue(definition.id,{formattedValue:display.formattedValue});
    formattedFields.set(definition.id,display.formattedValue);
  }
  return display;
}
function cdqRestorePrecisionToleranceV2726(){
  if(!doc||!fieldDefinitions||!cdqFieldDefinitionsV2581('type_plateau').length)return;
  const state=cdqStoredFieldStateV2581('tolerance_excentricite');
  for(const field of $('viewer').querySelectorAll('[name="tolerance_excentricite"]'))if(document.activeElement!==field){
    const wanted=state.formattedValue??String(state.value??'');
    if(field.value!==wanted)field.value=wanted;
  }
}
function cdqApplyConstraintDefaultsV2583(){
  if(!doc||!fieldDefinitions)return;
  const entries=fieldDefinitions instanceof Map?fieldDefinitions.entries():Object.entries(fieldDefinitions||{});
  for(const [name,raw] of entries){
    if(!/^charge_point_\d+_charge_contrainte$/.test(String(name||'')))continue;
    const definitions=Array.isArray(raw)?raw:[raw];
    for(const definition of definitions){
      if(!definition)continue;
      let stored=definition;
      try{if(definition.id)stored=doc.annotationStorage.getValue(definition.id,definition)||definition;}catch(_){}
      const value=stored?.value??definition.value??definition.defaultValue??'';
      if(String(value).trim())continue;
      try{
        if(definition.id)doc.annotationStorage.setValue(definition.id,{value:'-'});
        definition.value='-';
      }catch(_){}
    }
  }
}
function cdqTrialProblemLocksV2(){
  const menu=$('viewer').querySelector('select[name="essai_cdq_probleme_constate"]');
  if(!menu?.multiple)return null;
  const selected=Array.from(menu.selectedOptions,option=>String(option.value)).filter(value=>value&&value!=='aucun');
  return {avant:selected.length>0,apres:selected.some(value=>!value.endsWith('_corrige'))};
}
function cdqRestoreInteractiveFieldsV2581(){
  if(!doc||!fieldDefinitions)return;
  const trialLocks=cdqTrialProblemLocksV2();
  const controls=$('viewer').querySelectorAll('.textWidgetAnnotation input,.textWidgetAnnotation textarea,.choiceWidgetAnnotation select');
  for(const field of controls){
    const name=String(field.name||'');if(!name)continue;
    const state=cdqStoredFieldStateV2581(name);
    if(document.activeElement!==field){
      if(field.tagName==='SELECT'){
        // A new technician may be absent from the bundled dropdown. These
        // option changes are included in PDF.js' saved Opt dictionary too.
        if(Array.isArray(state.items))for(const item of state.items)if(![...field.options].some(option=>option.value===item.exportValue))field.add(new Option(item.displayValue,item.exportValue));
        const wanted=new Set(Array.isArray(state.value)?state.value.map(String):[String(state.value??'')]);
        for(const option of field.options)option.selected=wanted.has(String(option.value));
      }else{
        const raw=Array.isArray(state.value)?state.value.join(' + '):String(state.value??'');
        const wanted=state.formattedValue??raw;
        if(field.value!==wanted)field.value=wanted;
      }
    }
    // These twenty trial measurements have dynamic NV locks. The saved /Ff
    // describes the previous save; current problems determine their state
    // after a correction, an opening or an annotation-layer rebuild/zoom.
    const trialMeasure=trialLocks&&/^essai_cdq_(?:charge_point_[1-6]_(avant|apres)_correction|excentricite_(avant|apres)_(?:arriere_gauche|arriere_droit|avant_gauche|avant_droit))$/.exec(name);
    if(trialMeasure){
      const locked=readOnly||trialLocks[trialMeasure[1]||trialMeasure[2]];
      field.disabled=locked;
      // PDF.js synchronizes runtime readonly changes through disabled only.
      // A second HTML readOnly lock would survive the next corrected/none
      // selection even after the PDF script has made this field editable.
      field.readOnly=false;
      continue;
    }
    // Only the PDF's own read-only flag (or the user's Lecture role) may lock
    // a master field. Re-rendering/zooming must never turn editable client
    // fields into a blank disabled overlay.
    if(!readOnly&&!state.readOnly){
      field.disabled=false;
      field.readOnly=false;
    }
  }
}

let cdqViewportFieldTimerV2550=0,cdqDirectTextFieldV2557=null,cdqNavigationTextFieldV2562=null;
function cdqKeyboardVisibleV2560(){
  const viewport=window.visualViewport;
  if(!viewport)return false;
  const layoutHeight=Math.max(window.innerHeight||0,document.documentElement?.clientHeight||0);
  if(!layoutHeight)return false;
  return layoutHeight-viewport.height>Math.max(120,layoutHeight*.16);
}
function cdqSetKeyboardLayoutV2560(active){
  const want=!!active,body=document.body,container=$('container');
  if(body.classList.contains('cdq-keyboard-field')===want)return;
  const before=container?.getBoundingClientRect?.();
  body.classList.toggle('cdq-keyboard-field',want);
  const after=container?.getBoundingClientRect?.();
  if(!before||!after)return;
  const dx=after.left-before.left,dy=after.top-before.top;
  if(Math.abs(dx)>.5)container.scrollLeft+=dx;
  if(Math.abs(dy)>.5)container.scrollTop+=dy;
}
function cdqRevealFieldV2552(field,center=false){
  if(!field||!field.isConnected)return;
  const container=$('container'),rect=field.getBoundingClientRect(),host=container.getBoundingClientRect();
  if(!rect.width||!rect.height||!host.width||!host.height)return;
  const nav=$('formNav'),navInset=nav&&!nav.hidden?nav.getBoundingClientRect().height:0;
  const safeLeft=host.left+12,safeRight=host.right-12,safeTop=host.top+12,safeBottom=host.bottom-12-navInset;
  const visible=rect.left>=safeLeft&&rect.right<=safeRight&&rect.top>=safeTop&&rect.bottom<=safeBottom;
  if(!center){
    if(visible)return;
    let dx=0,dy=0;
    if(rect.left<safeLeft)dx=rect.left-safeLeft;
    else if(rect.right>safeRight)dx=rect.right-safeRight;
    if(rect.top<safeTop)dy=rect.top-safeTop;
    else if(rect.bottom>safeBottom)dy=rect.bottom-safeBottom;
    if(Math.abs(dx)>2)container.scrollLeft+=dx;
    if(Math.abs(dy)>2)container.scrollTop+=dy;
    return;
  }
  const targetX=host.left+host.width*.5,targetY=safeTop+(safeBottom-safeTop)*.42;
  const centerX=rect.left+rect.width/2,centerY=rect.top+rect.height/2;
  const dx=centerX-targetX,dy=centerY-targetY;
  if(Math.abs(dx)>1)container.scrollLeft+=dx;
  if(Math.abs(dy)>1)container.scrollTop+=dy;
}
function cdqKeyboardFieldV2550(active,field,reveal=true){
  clearTimeout(cdqViewportFieldTimerV2550);
  if(!active||!field){
    cdqSetKeyboardLayoutV2560(false);
    return;
  }
  if(cdqKeyboardVisibleV2560())cdqSetKeyboardLayoutV2560(true);
  if(!reveal)return;
  requestAnimationFrame(()=>requestAnimationFrame(()=>{
    if(document.activeElement===field&&cdqDirectTextFieldV2557===field)cdqRevealFieldV2552(field,false);
  }));
}
function cdqScheduleViewportFieldV2550(){
  clearTimeout(cdqViewportFieldTimerV2550);
  cdqViewportFieldTimerV2550=setTimeout(()=>{
    const active=document.activeElement;
    const manual=cdqTextEntryFieldV2550(active)&&active===cdqDirectTextFieldV2557;
    const navigated=cdqTextEntryFieldV2550(active)&&active===cdqNavigationTextFieldV2562;
    const tracked=manual||navigated;
    const keyboard=tracked&&cdqKeyboardVisibleV2560();
    cdqSetKeyboardLayoutV2560(keyboard);
    if(tracked&&keyboard)requestAnimationFrame(()=>cdqRevealFieldV2552(active,navigated));
  },90);
}
let name='Rapport.pdf',fileId='',pending=null,opening=false,closeAfterSave=false,closed=false;
let cdqFitWidthV2753=window.innerWidth,cdqFitFrameV2753=0;
function cdqScheduleWidthFitV2753(){
  const width=window.innerWidth;
  if(width<=0||width===cdqFitWidthV2753||opening)return;
  cdqFitWidthV2753=width;
  if(cdqFitFrameV2753)window.cancelAnimationFrame(cdqFitFrameV2753);
  cdqFitFrameV2753=0;
  if(!viewer||!doc||closed||viewer.currentScaleValue!=='page-width')return;
  const current=doc,currentViewer=viewer,generation=documentGenerationV2730,epoch=pdfWorkV2729().stats().epoch;
  cdqFitFrameV2753=window.requestAnimationFrame(()=>{
    cdqFitFrameV2753=0;
    if(doc!==current||viewer!==currentViewer||viewer.pdfDocument!==current||opening||viewer.currentScaleValue!=='page-width'||viewer.container.clientWidth<=0||!readerOpeningLeaseIsCurrentV2730({generation,currentGeneration:documentGenerationV2730,epoch,currentEpoch:pdfWorkV2729().stats().epoch,closed}))return;
    // Reapply PDF.js' own width preset after layout, preserving its native
    // page and annotation tasks. Keyboard-height changes and manual zoom skip it.
    cdqHoldRenderedLayersV2556(2200);viewer.currentScaleValue='page-width';
  });
}
const readerEquipmentV2746=createReaderEquipmentEmitterV2746({surface:$('viewer'),
  canEmit:()=>!!doc&&!readOnly&&!opening&&!closed,
  getValue:fieldName=>{
    const input=[...$('viewer').querySelectorAll('input,textarea,select')].find(field=>field.name===fieldName);
    if(input?.type==='checkbox'){
      // Blank-report recovery selects a green artwork canvas in the DOM only.
      // Keep that visual placeholder out of the equipment/conformity snapshot.
      const stored=cdqStoredFieldStateV2581(fieldName).value;
      return stored===true||stored==='Yes'?'Yes':'Off';
    }
    return input?.value??cdqStoredFieldStateV2581(fieldName).value;
  },send:tell});
const status=value=>{const el=$('status');el.textContent=value;el.dataset.active=String(!!value);};
let readerSaveProgressRequestV2759='';
function renderReaderSaveProgressV2758(requestId,initial=false){
  const value=readerSaveProgressV2758.text({requestId,version,dirty,closed,opening,saving});
  if(!value||!initial&&$('status').textContent!==readerSaveProgressV2758.lastDisplayed())return false;
  readerSaveProgressRequestV2759=requestId;
  status(value);readerSaveProgressV2758.displayed(value);return true;
}
function busy(value){saving=value;$('viewer').inert=value||opening||closed;$('savingMask').hidden=!value;for(const id of ['save','saveClose','doneFields','dismissKeyboard','discard','file'])$(id).disabled=value||!doc||opening||readOnly;}
function fail(error){busy(false);status(error.message||String(error));$('closeError').textContent=error.message||String(error);closeAfterSave=false;}
function modified(){if(!readOnly&&!opening){dirty=true;version++;status('');}}
function resetDocumentFieldsV2730(){qaFirstPaintOwnerV2731=null;qaFirstPageLeaseCleanupV2731();qaFirstPageLeaseCleanupV2731=()=>{};
  readerEquipmentV2746.reset();readerSaveProgressV2758.reset();readerSaveProgressRequestV2759='';
  tableColumnV2737?.dispose();tableColumnV2737=null;visualRefreshV2730.reset();choices?.cancel();form?.reset();touch?.reset();cdqKeyboardFieldV2550(false);menu(true);
  documentPaintV2730?.dispose();documentPaintV2730=null;
  doc=null;documentTask=null;fieldDefinitions=null;readerCalibration=null;formattedFields.clear();fieldTypography.clear();touchedIdentity.clear();lateIdentity=null;
  lastAttempt=null;pending=null;dirty=false;version=0;savedVersion=0;closeAfterSave=false;initialAppliedV2730=false;initialUpdatesV2730=[];
  cdqDirectTextFieldV2557=null;cdqNavigationTextFieldV2562=null;delete $('viewer').dataset.ready;$('viewer').classList.remove('cdq-form');$('viewer').inert=true;
  $('calibrationHelp')?.setAttribute('hidden','');
}
async function destroyReaderDocumentV2730(task=documentTask){qaFirstPaintOwnerV2731=null;qaFirstPageLeaseCleanupV2731();qaFirstPageLeaseCleanupV2731=()=>{};
  documentPaintV2730?.dispose();documentPaintV2730=null;
  viewer.setDocument(null);viewer.linkService.setDocument(null);await scripting.setDocument(null);
  if(task){let taskReset=destroyedReaderTasksV2730.get(task);if(!taskReset){taskReset=Promise.resolve().then(()=>task.destroy());destroyedReaderTasksV2730.set(task,taskReset);}await taskReset;}
}
async function resetClosedDocumentV2730(){
  try{
    const candidate=canvasCandidateV2730,task=documentTask,pageView=viewer.getPageView(0),epoch=pdfWorkV2729().stats().epoch;
    const keep=viewer.currentScaleValue==='page-width'&&canRetainReaderCanvasV2730(candidate,{epoch,document:doc,pageView,controls:$('viewer').querySelectorAll('input,textarea,select,button').length,viewport:closedViewportV2730});
    canvasCandidateV2730=null;closedCanvasV2730=null;visualRefreshV2730.reset();
    choices?.cancel();form?.reset();touch?.reset();cdqKeyboardFieldV2550(false);menu(true);
    if(keep){
      // Resolve PageClose/WillClose before destroying the sandbox, without
      // resetting PDFViewer's already-painted page. Drain queued dispatches.
      viewer.eventBus.dispatch('pagesdestroy',{source:viewer});
      await new Promise(resolve=>setTimeout(resolve,0));await new Promise(resolve=>setTimeout(resolve,0));
      await scripting.setDocument(null);await new Promise(resolve=>setTimeout(resolve,0));
      const parkedViewport={...readerViewportV2730(viewer),width:closedViewportV2730?.width,height:closedViewportV2730?.height};
      if(pdfWorkV2729().stats().epoch===epoch&&canRetainReaderCanvasV2730(candidate,{epoch,document:doc,pageView,controls:$('viewer').querySelectorAll('input,textarea,select,button').length,viewport:parkedViewport})){
        candidate.artwork.layer.cancel();clearReaderAnnotationStorageV2730(doc.annotationStorage);
        closedCanvasV2730={...candidate,document:doc,task};
      }else await destroyReaderDocumentV2730(task);
    }else await destroyReaderDocumentV2730(task);
    resetDocumentFieldsV2730();opening=false;fileId='';readOnly=false;autoReportName=false;initialValuesV2730=null;initialPreparedDraftV2730=false;reportEngineV2754=null;reportSnapshotV2754=null;snapshotUpdatesV2754=[];engineDefaultsAppliedV2754=false;closedViewportV2730=null;status('Ouverture…');
    await Promise.all([pdfWorker.promise,sandboxReady]);tell({type:'CDQ_READER_READY'});
  }catch{tell({type:'CDQ_READER_RESET_FAILED_V2730'});}
}
function close(){if(closed)return;readerSaveProgressV2758.close();clearReaderTemplatePaintV2753();qaFirstPaintOwnerV2731=null;qaFirstPageLeaseCleanupV2731();qaFirstPageLeaseCleanupV2731=()=>{};closedViewportV2730=readerViewportV2730(viewer);closed=true;documentGenerationV2730++;dirty=false;$('viewer').inert=true;$('viewer').style.opacity='0';try{$('closeDialog').close()}catch(_){};tell({type:'CDQ_READER_CLOSE',reusable:hosted});if(hosted)resetPromiseV2730=resetClosedDocumentV2730();else history.back();}
async function requestClose(){
  if(saving){status('Enregistrement en cours…');return;}
  if(decimalGuard&&!decimalGuard.validate())return;
  commitActive();await new Promise(r=>setTimeout(r,120));
  if(!dirty||readOnly){close();return;}
  $('closeError').textContent='';if(!$('closeDialog').open)$('closeDialog').showModal();
  $('keepEditing').focus();
}
// V27.58: older snapshots can contain the current field format beside a
// stale widget format. For one text widget with the same value, both describe
// the same annotation. Restore the canonical format without changing answers,
// template actions, widget flags, choices, buttons or multi-widget fields.
function coherentReportFormatsV2758(fields,objects){
  let coherent=fields;
  for(const [name,state]of Object.entries(fields||{})){
    const raw=objects instanceof Map?objects.get(name):objects?.[name];
    const defs=raw?Array.isArray(raw)?raw:[raw]:[];
    if(defs.length!==1||defs[0]?.type!=='text'||!Array.isArray(state.widgets)||state.widgets.length!==1)continue;
    const widget=state.widgets[0];
    if(widget.id!==defs[0].id||widget.value!==state.value||typeof state.formattedValue!=='string'||typeof widget.formattedValue!=='string'||widget.formattedValue===state.formattedValue)continue;
    if(coherent===fields)coherent={...fields};
    coherent[name]={...state,widgets:[{...widget,formattedValue:state.formattedValue}]};
  }
  return coherent;
}
async function outputSnapshotV2754(){
  if(decimalGuard&&!decimalGuard.validateAll())throw Error('Corrigez les décimales de la mesure avant d’enregistrer.');
  const current=doc,generation=documentGenerationV2730;
  commitActive();await new Promise(resolve=>setTimeout(resolve,120));
  await scripting.dispatchWillSave();await new Promise(resolve=>setTimeout(resolve,0));await visualRefreshV2730.flush();
  if(current!==doc||generation!==documentGenerationV2730||closed)throw Error('Le rapport a changé pendant son enregistrement.');
  const fields=capturePreparedReaderFieldsV2759();
  return {reportSnapshotV2754:fields};
}
function capturePreparedReaderFieldsV2759(){
  const fields=captureReportFieldsV2754(fieldDefinitions,cdqStoredFieldStateV2581,definition=>{
    const state=doc.annotationStorage.getValue(definition.id,definition)||definition;
    // PDF.js updates annotationStorage before external sandbox listeners. Its
    // internal listener removes detail.id, so the display cache may be older.
    const formattedValue=state.formattedValue??formattedFields.get(definition.id);
    return {...definition,...state,...(formattedValue!==undefined?{formattedValue}:{})};
  });
  return fields;
}
async function outputPreparedSnapshotV2759(){
  const current=doc,generation=documentGenerationV2730,work=pdfWorkV2729(),epoch=work.stats().epoch;
  const check=()=>{if(!current||current!==doc||generation!==documentGenerationV2730||closed||opening||work.stats().epoch!==epoch)throw Error('Le rapport a changé pendant son enregistrement.');};
  check();
  // Commit the active field, validation and WillSave calculations exactly once.
  // Both the field record and the PDF then come from this same live document.
  const snapshot=await outputSnapshotV2754();check();
  const capturedVersion=version,serialized=JSON.stringify(snapshot.reportSnapshotV2754);
  const unchanged=()=>{check();if(version!==capturedVersion||JSON.stringify(capturePreparedReaderFieldsV2759())!==serialized)throw Error('Les réponses ont changé pendant la préparation du PDF. Réessayez l’enregistrement.');};
  const bytes=await current.saveDocument();unchanged();
  // Retain the approved local save normalization; never render a second PDF
  // from the field snapshot on the server when these prepared bytes are used.
  const prepared=await work.request('save',{bytes,summary:false},{epoch});unchanged();
  const blob=new Blob([prepared.bytes],{type:'application/pdf'});
  if(blob.size<8||blob.size>16*1024*1024||(await blob.slice(0,5).text())!=='%PDF-')throw Error('Le PDF préparé est invalide ou dépasse 16 Mo.');
  unchanged();
  return {...snapshot,preparedPdfV2759:blob,pdfSaveInfoV2753:validatedPdfSaveInfoV2753(prepared.info)};
}
async function output(){
  const work=pdfWorkV2729(),workEpoch=work.stats().epoch;
  if(decimalGuard&&!decimalGuard.validateAll())throw Error("Corrigez les décimales de la mesure avant d’enregistrer.");
  commitActive();await new Promise(r=>setTimeout(r,120));
  await scripting.dispatchWillSave();await new Promise(r=>setTimeout(r,0));
  await visualRefreshV2730.flush();
  let bytes=await doc.saveDocument();
  const prepared=await work.request('save',{bytes,summary:false},{epoch:workEpoch});
  return {blob:new Blob([prepared.bytes],{type:'application/pdf'}),pdfSaveInfoV2753:validatedPdfSaveInfoV2753(prepared.info)};
}
async function finishDocument(){
  if(saving||!doc)return;
  if(readOnly||!dirty){close();return;}
  // Close after the local durable write is acknowledged. Drive uploads continue
  // independently, and a failed local write keeps the answers in this reader.
  closeAfterSave=true;
  await save();
}
async function save(external=false){
  if(!doc||opening||closed||saving||readOnly&&!external)return;
  if(!readOnly&&decimalGuard&&!decimalGuard.validateAll())return;
  commitActive();busy(true);$('closeError').textContent='';status(external?'Téléchargement…':'Enregistrement…');
  try{
    // A lost local acknowledgement retries the exact durable payload. Reusing
    // its request id must not serialize and repair the whole PDF again.
    const dataOnly=!!reportEngineV2754&&hosted&&!!fileId&&!external;
    const reusable=lastAttempt?.version===version&&(dataOnly?!!lastAttempt.reportSnapshotV2754&&lastAttempt.preparedPdfV2759 instanceof Blob:!!lastAttempt.blob);
    const prepared=reusable?lastAttempt:dataOnly?await outputPreparedSnapshotV2759():await output();
    const {blob,pdfSaveInfoV2753}=prepared,snapshot=version;
    if(external||!hosted||!fileId){const receipt=await downloadPdf(blob,name);busy(false);status(receipt);if(closeAfterSave){closeAfterSave=false;close();}return;}
    const requestId=lastAttempt?.version===snapshot?lastAttempt.id:'save-'+crypto.randomUUID();
    lastAttempt={id:requestId,version:snapshot,...prepared};
    pending={id:requestId,version:snapshot};
    readerSaveProgressV2758.begin(requestId,snapshot,reportEngineV2754);
    pending.timer=setTimeout(()=>{if(pending?.id!==requestId)return;pending=null;fail(new Error('La sauvegarde n’a pas encore été confirmée. Le PDF reste ouvert; réessayez ou téléchargez vos réponses.'));},90000);
    if(dataOnly)tell({type:'CDQ_READER_SAVE_SNAPSHOT_V2754',reportSnapshotV2754:prepared.reportSnapshotV2754,preparedPdfV2759:prepared.preparedPdfV2759,name,requestId});
    else tell({type:'CDQ_READER_SAVE',blob,name,requestId,readerPreparedVersion:2730,pdfSaveInfoV2753});
  }catch(e){fail(e);}
}
async function open(data){
  const work=pdfWorkV2729(),workEpoch=work.stats().epoch;
  await resetPromiseV2730;
  if(work.stats().epoch!==workEpoch)throw Error('Le compte a changé pendant l’ouverture du rapport.');
  if(data.preparedEpoch!==undefined&&data.preparedEpoch!==workEpoch)throw Error('Le compte ou l’accès Drive a changé.');
  applyReaderTheme(data.theme);
  if(data.desktop===true){document.body.classList.add('cdq-reader-pc');document.body.classList.remove('cdq-reader-mobile');$('readerTop').append($('name'));$('readerNameBar')?.remove();}
  else{document.body.classList.add('cdq-reader-mobile');document.body.classList.remove('cdq-reader-pc');$('readerTop').append($('name'));}
  const blob=data.blob;
  if(!(blob instanceof Blob)||blob.size>32*1024*1024||(await blob.slice(0,5).text())!=='%PDF-')throw Error('PDF invalide (32 Mo maximum).');
  if(work.stats().epoch!==workEpoch)throw Error('Le compte a changé pendant l’ouverture du rapport.');
  if(doc||opening)return; // A repeated OPEN must never erase current answers.
  let generation=++documentGenerationV2730;
  const checkLease=()=>{if(!readerOpeningLeaseIsCurrentV2730({generation,currentGeneration:documentGenerationV2730,epoch:workEpoch,currentEpoch:work.stats().epoch,closed}))throw Error('Le compte ou le rapport a changé pendant son ouverture.');if(reuse&&(!sameReaderViewportV2730(retained?.viewport,readerViewportV2730(viewer))||!readerCanvasGeometryMatchesV2730(retained?.artwork,viewer.getPageView(0))))throw Error('Les dimensions du lecteur ont changé.');};
  visualRefreshV2730.reset();delete $('viewer').dataset.cdqFamily;delete $('viewer').dataset.cdqTemplatePaintV2753;opening=true;closed=false;autoReportName=data.autoReportName===true;
  $('viewer').inert=true;$('viewer').style.opacity='0';name=String(data.name||name);fileId=String(data.fileId||'');readOnly=!!data.readOnly;
  reportEngineV2754=reportContextV2754(data.reportEngineV2754);reportSnapshotV2754=data.reportSnapshotV2754?reportFieldsV2754(data.reportSnapshotV2754):null;snapshotUpdatesV2754=[];engineDefaultsAppliedV2754=false;
  initialValuesV2730=data.initialValues||null;initialAppliedV2730=false;initialUpdatesV2730=[];initialPreparedDraftV2730=data.readerPreparedVersion===2730&&isCacheableReaderDraftV2730({...data,bytes:blob.size});
  $('name').textContent=name;$('empty').style.display='none';status('Ouverture du PDF…');
  const preparedBlob=data.preparedBlob instanceof Blob?data.preparedBlob:data.readerPreparedVersion===2730?blob:null;
  readerEquipmentV2746.configure(String(data.readerRequestId||data.readerSession||''));
  readerSaveProgressV2758.open({owner:data.saveProgressOwnerV2758,readerRequestId:String(data.readerRequestId||data.readerSession||''),readerPhaseV2757:data.readerPhaseV2757||0});
  let sourceBytes,retained=closedCanvasV2730,reuse=false,preparedPaintV2753=null;
  let staticArtworkV2753=data.preparedEpoch===workEpoch?data.staticArtworkV2753:null,artworkEpochV2753=data.preparedEpoch;
  const preparedInfoV2753=info=>{staticArtworkV2753=info.staticArtworkV2753||null;artworkEpochV2753=workEpoch;};
  closedCanvasV2730=null;
  // This opening owns the retained task before its first asynchronous read.
  // A concurrent close can therefore destroy it through the normal reset.
  if(retained)documentTask=retained.task;
  try{
    sourceBytes=await readReaderOpeningBytesV2753({blob,preparedBlob,readerPreparedVersion:data.readerPreparedVersion,readerNormalizedV2730:data.readerNormalizedV2730,preparedEpoch:data.preparedEpoch,work,epoch:workEpoch,checkCurrent:checkLease,onPrepared:preparedInfoV2753});
    checkLease();
    const sourceLength=sourceBytes.byteLength,cacheSource={...data,bytes:sourceLength};
    const sourceKind=preparedBlob?(isCacheableReaderDraftV2730(cacheSource)?'draft':isCacheableReaderDocumentV2730(cacheSource)?'document':null):null,eligible=!!sourceKind;
    const key=eligible?await readerSourceKeyV2730(sourceBytes):null;checkLease();
    reuse=eligible&&canReuseReaderCanvasV2730(retained,{key,epoch:workEpoch,viewport:readerViewportV2730(viewer),pageView:viewer.getPageView(0)});
    if(retained&&!reuse){await destroyReaderDocumentV2730(retained.task);retained=null;checkLease();}
    if(!reuse&&readerTemplatePaintAvailableV2753()){
      const paintKey=key||await readerSourceKeyV2730(sourceBytes);checkLease();
      preparedPaintV2753=await prepareReaderTemplatePaintV2753({sourceSha256:paintKey,sourceBytesLength:sourceLength,staticArtwork:staticArtworkV2753,preparedEpoch:artworkEpochV2753,epoch:workEpoch,targetPhysicalWidth:$('container').clientWidth*devicePixelRatio,checkCurrent:checkLease});checkLease();
    }
    for(let attempt=0;attempt<2;attempt++){
      let attemptTask=null;
      try{
        canvasCandidateV2730=eligible?{key,epoch:workEpoch,bytes:sourceLength,sourceKind,pristineIdentity:false}:null;
        let firstPaint;
        if(reuse){
          $('viewer').dataset.cdqTemplatePaintV2753='retained';
          doc=retained.document;documentTask=attemptTask=retained.task;
          firstPaint=documentPaintV2730={wait:async()=>{},dispose(){}};
          await rebuildReaderAnnotationsV2730({cached:retained,document:doc,pageView:viewer.getPageView(0),ui:readerUIV2730,viewer});checkLease();
          viewer.eventBus.dispatch('annotationlayerrendered',{source:viewer.getPageView(0),pageNumber:1,error:null});
          $('container').scrollTop=0;$('container').scrollLeft=0;
        }else{
          // Keep the original RGB pixels on the Canvas2D path. In particular,
          // avoid transferring OffscreenCanvas bitmaps back into a software
          // canvas before result badges sample those same page pixels.
          const camionCanvasPreparationV2755=prepareCamionCanvasBoundaryV2755({sourceBytes,staticArtwork:staticArtworkV2753,preparedEpoch:artworkEpochV2753,epoch:workEpoch,pdfjsVersion:api.version,checkCurrent:checkLease});
          const camionCanvasBoundaryV2755=camionCanvasPreparationV2755===null?null:await camionCanvasPreparationV2755;checkLease();
          const trainCalendarPreparationV2755=camionCanvasBoundaryV2755===null?prepareTrainCalendarBoundaryV2755({sourceBytes,staticArtwork:staticArtworkV2753,preparedEpoch:artworkEpochV2753,epoch:workEpoch,pdfjsVersion:api.version,checkCurrent:checkLease}):null;
          const trainCalendarBoundaryV2755=trainCalendarPreparationV2755===null?null:await trainCalendarPreparationV2755;checkLease();
          const task=documentTask=attemptTask=api.getDocument({data:sourceBytes,worker:pdfWorker,standardFontDataUrl:assets+'standard_fonts/',cMapUrl:assets+'cmaps/',cMapPacked:true,wasmUrl:assets+'wasm/',isEvalSupported:false,enableXfa:false,enableHWA:false,isOffscreenCanvasSupported:false});
          const parsed=await task.promise;checkLease();doc=parsed;
          installCamionCanvasBoundaryV2755(parsed,camionCanvasBoundaryV2755);
          installTrainCalendarBoundaryV2755(parsed,trainCalendarBoundaryV2755);
          if(eligible)protectReaderSnapshotsV2730(doc);
          qaFirstPaintOwnerV2731=Object.freeze({document:doc,generation,epoch:workEpoch,paint:preparedPaintV2753});
          firstPaint=documentPaintV2730=cancellableReaderPaintV2730(firstReaderPaintV2682(viewer.eventBus));viewer.setDocument(doc);viewer.linkService.setDocument(doc);
        }
        doc.annotationStorage.onSetModified=()=>{if(!readOnly&&!opening){dirty=true;status('');}};
        $('save').hidden=readOnly;$('saveClose').hidden=readOnly;
        // Scripting can initialise fields after the first canvas appears. Input
        // becomes available only after the canvas, widgets and calculations.
        const [metadata]=await Promise.all([readReaderMetadataV2724(doc),viewer.firstPagePromise]);checkLease();
        const {fields,actions,typography,firstPageHasAnnotations}=metadata;fieldDefinitions=fields;
        if(!reportEngineV2754&&!readOnly&&data.reportEngineImportV2754&&artworkEpochV2753===workEpoch){
          const template=matchReportTemplateV2754({staticArtworkV2753,fields});
          if(template)reportEngineV2754=reportContextV2754({...data.reportEngineImportV2754,template,family:template.modeleId});
        }
         // Select only the exact approved Suspendue field schema before restoring
         // the original cyan widget appearance in CSS; never repaint the page.
         $('viewer').dataset.cdqFamily=approvedReportMetadataFamilyV2735(fields)||'';
        tableColumnV2737?.dispose();tableColumnV2737=installReaderTableColumnV2737({surface:$('viewer'),getDocument:()=>doc,getFields:()=>fieldDefinitions,getPageView:index=>viewer.getPageView(index),afterChange:()=>{}});
        if(canvasCandidateV2730)canvasCandidateV2730.pristineIdentity=hasPristineIdentityV2730(fields);
        if(fields?.get?.('identification_balance')||fields?.identification_balance)autoReportName=true;
        for(const [field,size] of typography)fieldTypography.set(field,size);
        applyFieldTypography();cdqApplyConstraintDefaultsV2583();
        readerCalibration=installReaderCalibration({surface:$('viewer'),doc,fields,tell});
        nativeInput.configure(fields);$('viewer').classList.toggle('cdq-form',!!(fields?.get?.('client_nom')||fields?.client_nom)&&!!(fields?.get?.('charge_point_1_charge_utilisee')||fields?.charge_point_1_charge_utilisee));
        // Fresh artwork and sandbox startup compete for the same browser
        // thread. Let PDF.js finish its first paint before initializing actions.
        // Its automatic request shares this one sandbox; a retained canvas
        // resolves this wait immediately and keeps its existing startup path.
        await firstPaint.wait(firstPageHasAnnotations);checkLease();
        await scripting.setDocument(doc);checkLease();
        if(reuse&&(fields?.size||fields&&Object.keys(fields).length||actions)&&!scripting.ready)throw Error('Les calculs du PDF n’ont pas pu redémarrer.');
        if(fields?.size||fields&&Object.keys(fields).length||actions){const deadline=Date.now()+12000;while(!scripting.ready){checkLease();if(Date.now()>deadline)throw Error('Les calculs du PDF n’ont pas pu démarrer. Fermez le document puis réessayez.');await new Promise(r=>setTimeout(r,25));}await awaitReaderPageActionsV2731(scripting,viewer.currentPageNumber,{pdfjsVersion:api.version,checkLease});}
        if(initialAppliedV2730){restoreInitialIdentityV2730();dirty=true;version++;}
        if(reportSnapshotV2754||engineDefaultsAppliedV2754)restoreSnapshotV2754();
        if(engineDefaultsAppliedV2754&&!readOnly){dirty=true;version++;}
        cdqRestoreInteractiveFieldsV2581();choices.refresh();
        if(readOnly)for(const field of $('viewer').querySelectorAll('input,textarea,select,button'))field.disabled=true;
        readerCalibration?.refresh();
        visualRefreshV2730.schedule();
        await visualRefreshV2730.flush();checkLease();
        form.refresh();
        await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));checkLease();
        await visualRefreshV2730.flush();checkLease();
        if(canvasCandidateV2730)canvasCandidateV2730.viewport=readerViewportV2730(viewer);
        if(reuse&&!canRetainReaderCanvasV2730(canvasCandidateV2730,{epoch:workEpoch,document:doc,pageView:viewer.getPageView(0),controls:$('viewer').querySelectorAll('input,textarea,select,button').length,viewport:retained.viewport}))throw Error('Le rendu du rapport a changé pendant son ouverture.');
        opening=false;busy(false);$('viewer').style.opacity='';$('viewer').dataset.ready='true';status(readOnly?'Consultation seulement':'');
        cdqScheduleWidthFitV2753();applyLateIdentity();tell({type:'CDQ_READER_OPENED',readerRequestId:data.readerRequestId,reportEngineV2754});return;
      }catch(error){
        if(generation!==documentGenerationV2730)return;
        if(!reuse||attempt!==0||work.stats().epoch!==workEpoch)throw error;
        // Only a pristine opening can reach this fallback: the form has never
        // been revealed or made editable. Destroy every partial widget/sandbox
        // before parsing the immutable source again (getDocument transfers it).
        generation=++documentGenerationV2730;reuse=false;retained=null;await destroyReaderDocumentV2730(attemptTask);checkLease();
        resetDocumentFieldsV2730();canvasCandidateV2730=null;
        sourceBytes=await readReaderOpeningBytesV2753({blob,preparedBlob,readerPreparedVersion:data.readerPreparedVersion,readerNormalizedV2730:data.readerNormalizedV2730,preparedEpoch:data.preparedEpoch,work,epoch:workEpoch,checkCurrent:checkLease,onPrepared:preparedInfoV2753});checkLease();
      }
    }
  }catch(error){
    if(generation!==documentGenerationV2730)return;
    clearReaderTemplatePaintV2753();canvasCandidateV2730=null;closedCanvasV2730=null;await destroyReaderDocumentV2730(documentTask||retained?.task);
    if(generation!==documentGenerationV2730)return;
    resetDocumentFieldsV2730();opening=false;throw error;
  }
}
function menu(hide=false){$('more').hidden=hide?true:!$('more').hidden;$('menu').setAttribute('aria-expanded',String(!$('more').hidden));}
function zoom(factor,origin){if(viewer&&doc){const target=Math.max(.35,Math.min(4,viewer.currentScale*factor));viewer.updateScale({scaleFactor:target/viewer.currentScale,origin,drawingDelay:250});}}
$('menu').onclick=()=>menu();$('fit').onclick=()=>{if(viewer){cdqHoldRenderedLayersV2556(2200);viewer.currentScaleValue='page-width';}menu(true);};
document.addEventListener('pointerdown',e=>{if(!$('more').hidden&&!e.target.closest('#more,#menu'))menu(true);},true);
$('cancelMenu').onclick=()=>{menu(true);$('menu').focus({preventScroll:true});};
$('quitMenu').onclick=()=>{menu(true);requestClose();};
$('plus').onclick=()=>zoom(1.2);$('minus').onclick=()=>zoom(1/1.2);
$('container').addEventListener('wheel',e=>{if(!e.ctrlKey&&!e.metaKey)return;e.preventDefault();zoom(Math.exp(-Math.max(-100,Math.min(100,e.deltaY))*.004),[e.clientX,e.clientY]);},{passive:false});
let drag=null;
$('container').addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'&&(e.button===1||e.button===0&&!e.target.closest('input,textarea,select,button,a'))){e.preventDefault();$('container').classList.add('dragging');drag={id:e.pointerId,x:e.clientX,y:e.clientY,left:$('container').scrollLeft,top:$('container').scrollTop};$('container').setPointerCapture(e.pointerId);}});
$('container').addEventListener('pointermove',e=>{if(drag?.id===e.pointerId){$('container').scrollLeft=drag.left+drag.x-e.clientX;$('container').scrollTop=drag.top+drag.y-e.clientY;}});
for(const type of ['pointerup','pointercancel'])$('container').addEventListener(type,()=>{drag=null;$('container').classList.remove('dragging')});
$('save').onclick=()=>{menu(true);save();};$('download').onclick=()=>{menu(true);save(true);};
$('back').onclick=requestClose;$('saveClose').onclick=()=>{$('closeDialog').close();finishDocument();};
$('dismissKeyboard').addEventListener('pointerdown',e=>e.preventDefault());
$('dismissKeyboard').onclick=()=>{
  if(saving||!doc)return;
  if(decimalGuard&&!decimalGuard.validate())return;
  commitActive();
  cdqDirectTextFieldV2557=null;cdqNavigationTextFieldV2562=null;
  cdqKeyboardFieldV2550(false);
  $('dismissKeyboard').focus({preventScroll:true});
  setTimeout(refreshResults,0);
};
$('doneFields').addEventListener('click',()=>{requestClose();});
$('keepEditing').onclick=()=>{$('closeDialog').close();closeAfterSave=false;tell({type:'CDQ_READER_CLOSE_CANCELLED_V2640'});};
$('discard').onclick=()=>{
  if(!hosted||!fileId){close();return;}
  busy(true);status('Fermeture…');
  const requestId='discard-'+crypto.randomUUID();
  pending={id:requestId,discard:true,timer:setTimeout(()=>{pending=null;fail(new Error('La fermeture n’a pas été confirmée. Réessayez.'));},15000)};
  tell({type:'CDQ_READER_DISCARD',requestId});
};
$('closeDialog').addEventListener('cancel',e=>{if(saving)e.preventDefault();else tell({type:'CDQ_READER_CLOSE_CANCELLED_V2640'});closeAfterSave=false;});
for(const type of ['input','change'])$('viewer').addEventListener(type,e=>{if(autoReportName&&e.target.name==='identification_balance'){const next=identificationReportName(e.target.value);if(next){name=next;$('name').textContent=name;}}});
$('viewer').addEventListener('input',modified);$('viewer').addEventListener('change',modified);
// Scripted PDF fields cancel native insertion and return accepted text through
// the sandbox, without emitting input/change. Capture the editing intent before
// that interception so close/save also protects those answers and their version.
$('viewer').addEventListener('beforeinput',e=>{if(cdqTextEntryFieldV2550(e.target))modified();},{capture:true});
for(const type of ['input','change'])$('viewer').addEventListener(type,e=>{if(e.isTrusted&&e.target.name)touchedIdentity.add(e.target.name);});
$('viewer').addEventListener('input',()=>readerCalibration?.refresh());$('viewer').addEventListener('change',()=>readerCalibration?.refresh());
$('viewer').addEventListener('pointerdown',e=>{
  if(cdqTextEntryFieldV2550(e.target)){
    cdqNavigationTextFieldV2562=null;
    cdqDirectTextFieldV2557=e.target;
    cdqKeyboardFieldV2550(true,e.target,true);
    return;
  }
  if(!e.target.closest?.('input,textarea,select,button,a')){
    cdqDirectTextFieldV2557=null;
    cdqNavigationTextFieldV2562=null;
    const active=document.activeElement;
    if(cdqTextEntryFieldV2550(active))active.blur();
    cdqKeyboardFieldV2550(false);
  }
},{capture:true});
$('viewer').addEventListener('focusin',e=>{if(cdqTextEntryFieldV2550(e.target))cdqKeyboardFieldV2550(true,e.target,false);},{capture:true});
$('viewer').addEventListener('focusout',()=>{setTimeout(()=>{const active=document.activeElement;if(!cdqTextEntryFieldV2550(active)){cdqDirectTextFieldV2557=null;cdqNavigationTextFieldV2562=null;cdqKeyboardFieldV2550(false);}},80);});
window.visualViewport?.addEventListener('resize',cdqScheduleViewportFieldV2550);
window.addEventListener('resize',cdqScheduleWidthFitV2753);
window.addEventListener('beforeunload',e=>{if(!closed&&(dirty||saving)){e.preventDefault();e.returnValue='';}});
document.addEventListener('keydown',e=>{if(choices?.isOpen())return;if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='s'){e.preventDefault();save();}else if(e.key==='Escape'&&!$('more').hidden){e.preventDefault();menu(true);$('menu').focus({preventScroll:true});}else if(e.key==='Escape'&&!$('closeDialog').open){e.preventDefault();requestClose();}});
$('file').onchange=()=>{if(doc){status('Fermez le PDF actuel avant d’en ouvrir un autre.');return;}const f=$('file').files[0];if(f)open({blob:f,name:f.name}).catch(fail);};
// Listen before loading the engine; parent identity and source are both checked.
window.addEventListener('message',async e=>{
  if(!hosted||e.source!==parent||!parentOrigin||e.origin!==parentOrigin)return;
  const d=e.data||{};
  if(d.type==='CDQ_READER_THEME'){applyReaderTheme(d.theme);return;}
  if(d.type==='CDQ_READER_PREFILL_V2642'&&String(d.fileId||'')===fileId){lateIdentity={...lateIdentity,...d.values};applyLateIdentity();return;}
  if(d.type==='CDQ_READER_REQUEST_CLOSE'){requestClose();return;}
  if(d.type==='CDQ_READER_SAVE_PROGRESS_V2758'){if(!closed&&!opening&&readerSaveProgressV2758.accept(d))renderReaderSaveProgressV2758(d.requestId);return;}
  if(d.type==='CDQ_READER_SAVED'&&pending&&d.requestId===pending.id){
    clearTimeout(pending.timer);const snapshot=pending.version,discarding=pending.discard;pending=null;
    if(!d.ok){fail(new Error(d.error||'Enregistrement impossible. Le PDF reste ouvert.'));return;}
    if(discarding){busy(false);close();return;}
    const progressTrackedV2758=readerSaveProgressV2758.acknowledge(d.requestId,snapshot),savedGenerationV2758=documentGenerationV2730;
    lastAttempt=null;savedVersion=snapshot;dirty=version!==savedVersion;busy(false);await scripting.dispatchDidSave();
    if(closed||savedGenerationV2758!==documentGenerationV2730)return;
    if(d.reportEngineV2754)reportEngineV2754=reportContextV2754(d.reportEngineV2754)||reportEngineV2754;
    if(progressTrackedV2758)renderReaderSaveProgressV2758(d.requestId,true);else status(d.queued?'Conservé sur cet appareil — synchronisation en attente.':'✓ Enregistré dans le dossier client');
    if(closeAfterSave&&!dirty){close();}else closeAfterSave=false;
  }
  if(d.type==='CDQ_READER_OPEN'&&api&&viewer)try{await open(d)}catch(err){opening=false;fail(err);tell({type:'CDQ_READER_OPEN_FAILED_V2731',readerRequestId:d.readerRequestId,error:String(err?.message||err).slice(0,500)});}
});
try{
  const loaded=await loadReaderModulesV2730(specifier=>import(specifier),assets);api=loaded[0];const ui=loaded[1];readerUIV2730=ui;sandboxModule=loaded[2];api.GlobalWorkerOptions.workerSrc=assets+'build/pdf.worker.mjs';
  pdfWorker=new api.PDFWorker();sandboxReady=sandboxModule.QuickJSSandbox(assets+'wasm/');
  const eventBus=new ui.EventBus(),linkService=new ui.PDFLinkService({eventBus,externalLinkTarget:2});
  window.addEventListener('updatefromsandbox',event=>eventBus.dispatch('updatefromsandbox',{source:window,detail:event.detail}));
  scripting=new ui.PDFScriptingManager({eventBus,externalServices:{createScripting:()=>({
    async createSandbox(data){
      // Initial identity is already durable beside the blank template. Give
      // it to the sandbox before its Open action, without parsing/saving a
      // second PDF or overwriting any existing identity/measurement.
      const sandboxDocument=doc,generation=documentGenerationV2730,epoch=pdfWorkV2729().stats().epoch,values=initialValuesV2730,locked=readOnly,preparedDraft=initialPreparedDraftV2730;
      const sandbox=await sandboxReady;
      if(doc!==sandboxDocument||!readerOpeningLeaseIsCurrentV2730({generation,currentGeneration:documentGenerationV2730,epoch,currentEpoch:pdfWorkV2729().stats().epoch,closed}))throw Error('Le compte ou le rapport a changé pendant son ouverture.');
      const defaults=!reportSnapshotV2754&&['cuve3','tremie3'].includes(reportEngineV2754?.family)?{points_test:{value:'3 points'}}:null;
      snapshotUpdatesV2754=reportSnapshotV2754||defaults?restoreReportFieldsV2754(coherentReportFormatsV2758(reportSnapshotV2754||defaults,data.objects),{objects:data.objects,storage:sandboxDocument.annotationStorage}):[];engineDefaultsAppliedV2754=!!defaults&&snapshotUpdatesV2754.length>0;
      const updates=initializeSandboxIdentityV2730(data,values,sandboxDocument,locked,preparedDraft);initialAppliedV2730||=updates.length>0;initialUpdatesV2730=updates;
      sandbox.create(data);
      restoreInitialIdentityV2730();restoreSnapshotV2754();
    },
    dispatchEventInSandbox(event){return dispatchReaderSandboxEventV2731(sandboxReady,event);},
    async destroySandbox(){(await sandboxReady).nukeSandbox();sandboxReady=sandboxModule.QuickJSSandbox(assets+'wasm/');sandboxReady.catch(()=>{});}
  })}});
  serializeReaderScriptingV2730(scripting);
  viewer=new ui.PDFViewer({container:$('container'),viewer:$('viewer'),eventBus,linkService,scriptingManager:scripting,removePageBorders:true,annotationMode:api.AnnotationMode.ENABLE_FORMS,maxCanvasPixels:16777216,enableDetailCanvas:false,textLayerMode:0});
  linkService.setViewer(viewer);scripting.setViewer(viewer);
  const cdqRawUpdateScaleV2556=viewer.updateScale.bind(viewer);
  viewer.updateScale=options=>{cdqHoldRenderedLayersV2556(2200);return cdqRawUpdateScaleV2556(options);};
  $('container').addEventListener('touchstart',()=>cdqHoldRenderedLayersV2556(1800),{passive:true,capture:true});
  $('container').addEventListener('scroll',()=>cdqHoldRenderedLayersV2556(900),{passive:true});
  touch=installTouchNavigation({container:$('container'),surface:$('viewer'),getViewer:()=>viewer});
  nativeInput=installNativeTextInput($('viewer'));
  choices=installReaderChoices({surface:$('viewer'),isReadOnly:()=>readOnly,
    onConfirm:field=>form.advance(field),
    onOpen:()=>{cdqDirectTextFieldV2557=null;cdqNavigationTextFieldV2562=null;cdqKeyboardFieldV2550(false);},
    onClose:()=>form.refresh()});
  decimalGuard=installMeasurementValidationV2736({surface:$('viewer'),getEchelon:()=>$('viewer').querySelector('[name="echelon"]')?.value||cdqStoredFieldStateV2581('echelon').value,status});
  form=installFormNavigation({validate:field=>decimalGuard.validate(field),surface:$('viewer'),toolbar:$('formNav'),previous:$('previousField'),next:$('nextField'),done:$('doneFields'),openChoice:field=>choices.open(field),choiceIsOpen:()=>choices.isOpen(),reveal:field=>{
    if(cdqTextEntryFieldV2550(field)){
      cdqNavigationTextFieldV2562=field;
      cdqDirectTextFieldV2557=null;
    }else{
      cdqNavigationTextFieldV2562=null;
    }
    cdqRevealFieldV2552(field,true);
  }});
  eventBus.on('pagesinit',()=>{
    qaFirstPageLeaseCleanupV2731();
    const owner=qaFirstPaintOwnerV2731,pageView=viewer.getPageView(0),page=pageView?.pdfPage;
    const leaseCleanup=owner?installFirstPageRenderLeaseV2731({document:owner.document,page,pageView,generation:owner.generation,epoch:owner.epoch,getDocument:()=>qaFirstPaintOwnerV2731===owner?doc:null,getPage:()=>viewer.getPageView(0)?.pdfPage,getPageView:()=>viewer.getPageView(0),getGeneration:()=>documentGenerationV2730,getEpoch:()=>pdfWorkV2729().stats().epoch,isClosed:()=>closed,isOpening:()=>opening,surface:$('viewer'),pdfjsVersion:api.version,RenderingCancelledException:api.RenderingCancelledException}):()=>{};
    viewer.currentScaleValue='page-width';
    const paintCleanup=owner?installReaderTemplatePaintV2753({page,pageView,prepared:owner.paint,pdfjsVersion:api.version,RenderingCancelledException:api.RenderingCancelledException,
      checkCurrent:()=>{if(qaFirstPaintOwnerV2731!==owner||owner.document!==doc||owner.generation!==documentGenerationV2730||owner.epoch!==pdfWorkV2729().stats().epoch||viewer.getPageView(0)!==pageView||!$('viewer').contains(pageView.div)||closed||!opening)throw Error('Le compte ou le rapport a changé pendant son ouverture.');},
      onHit:()=>{$('viewer').dataset.cdqTemplatePaintV2753='ready';}}):()=>{};
    qaFirstPageLeaseCleanupV2731=()=>{paintCleanup();leaseCleanup();};
  });
  eventBus.on('pagerendered',event=>{if(event.pageNumber===1&&event.source===viewer.getPageView(0)){qaFirstPaintOwnerV2731=null;qaFirstPageLeaseCleanupV2731();qaFirstPageLeaseCleanupV2731=()=>{};}if(opening)visualRefreshV2730.schedule();else refreshResults();});
  eventBus.on('scalechanging',e=>{$('zoom').textContent=Math.round(e.scale*100)+' %';});
  eventBus.on('pagerendered',e=>{if(!e.error&&e.source?.div)e.source.div.dataset.cdqPaintedV2556='true';if(e.error)fail(e.error);});
  eventBus.on('annotationlayerrendered',e=>{if(!e.error&&e.pageNumber===1)captureReaderCanvasesV2730(canvasCandidateV2730,e.source);cdqWrapStableAnnotationLayerV2556(e.source);if(opening)return;cdqRestoreInteractiveFieldsV2581();applyFieldTypography();if(readOnly)for(const field of $('viewer').querySelectorAll('input,textarea,select,button'))field.disabled=true;choices.refresh();applyFieldTypography();form.refresh();nativeInput.configure(fieldDefinitions);readerCalibration?.refresh();refreshResults();});
  eventBus.on('updatefromsandbox',event=>{
    if(!doc||closed)return;
    const detail=event.detail||{};
    if(detail.id&&Object.hasOwn(detail,'formattedValue'))formattedFields.set(detail.id,detail.formattedValue??'');
    visualRefreshV2730.schedule();
    readerEquipmentV2746.changed();
  });
  // A technician can stop at the last reading without moving to another field.
  // Commit complete numbers or the explicit skip/overload tokens; partial input stays editable.
  installFirstTapV2756(document);
  installVerifiedRangeV2756({surface:$('viewer'),names:()=>fieldDefinitions instanceof Map?[...fieldDefinitions.keys()]:Object.keys(fieldDefinitions||{}),enabled:()=>!!doc&&!readOnly&&!opening&&!saving&&!closed,
    write:(name,value)=>{
      for(const definition of cdqFieldDefinitionsV2581(name)){
        if(!definition.id||definition.readOnly)continue;
        definition.value=value;doc.annotationStorage.setValue(definition.id,{value});
        eventBus.dispatch('updatefromsandbox',{source:window,detail:{id:definition.id,value}});
        eventBus.dispatch('dispatcheventinsandbox',{source:viewer,detail:{id:definition.id,name:'Keystroke',value,willCommit:true,commitKey:1,selStart:0,selEnd:value.length}});
      }
    },changed:()=>{dirty=true;version++;readerEquipmentV2746.changed();visualRefreshV2730.schedule();}});
  let liveCalculationTimer=0;
  $('viewer').addEventListener('input',e=>{
    const field=e.target,value=String(field.value??'');
    if(readOnly||opening||saving||!field.name||!(isCorrectionReadingV2736(field.name)||/^(echelon|capacite_maximale|charge_excentricite|charge_point_\d+_(charge_utilisee|charge_contrainte))$/.test(field.name)))return;
    clearTimeout(liveCalculationTimer);
    if(isCorrectionReadingV2736(field.name)&&measurementErrorV2736(value,$('viewer').querySelector('[name="echelon"]')?.value||cdqStoredFieldStateV2581('echelon').value))return;
    if(isCorrectionReadingV2736(field.name)?!isCompleteMeasurementInputV2736(value):value!==''&&!/^[+-]?(?:\d+(?:[.,]\d+)?|[.,]\d+)$/.test(value.replace(/[\s\u00a0\u202f]/g,'')))return;
    liveCalculationTimer=setTimeout(()=>{
      if(readOnly||opening||saving||document.activeElement!==field)return;
      const definition=cdqFieldDefinitionsV2581(field.name)[0];if(!definition?.id)return;
      eventBus.dispatch('dispatcheventinsandbox',{source:viewer,detail:{id:definition.id,name:'Keystroke',value,willCommit:true,commitKey:1,selStart:0,selEnd:value.length}});
    },100);
  });
  $('viewer').addEventListener('focusout',()=>clearTimeout(liveCalculationTimer));
  eventBus.on('textlayerrendered',()=>form.refresh());
  document.addEventListener('visibilitychange',()=>{if(document.hidden)touch.reset();});
  if(hosted){$('empty').style.display='none';status('Ouverture…');}else status('Choisissez un PDF.');
  // READY now means both engines are prepared; the first report no longer
  // pays for starting the PDF worker and compiling its calculation sandbox.
  await Promise.all([pdfWorker.promise,sandboxReady]);tell({type:'CDQ_READER_READY'});
}catch(e){const message=String(e?.message||e||'Initialisation impossible.').slice(0,500);console.error('CDQ_READER_INIT_FAILED_V2730',message);fail(new Error(message));tell({type:'CDQ_READER_INIT_FAILED_V2731',error:message});$('empty').textContent='Le lecteur n’a pas pu démarrer. Fermez puis mettez à jour l’application.';}

