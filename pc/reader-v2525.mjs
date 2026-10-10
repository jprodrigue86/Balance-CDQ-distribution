import {installDecimalPrecisionV2695,decimalPrecisionErrorV2695,isCorrectionReadingV2695} from './reader-decimals-v2695.mjs';
import {firstReaderPaintV2682} from './reader-first-paint-v2682.mjs';
import {paintReaderResults} from './reader-results-v2648.mjs';
import {identificationReportName} from './report-name-v2648.mjs';
import {installTouchNavigation,installFormNavigation,installNativeTextInput} from './reader-interactions-v2525.mjs';
import {installReaderCalibration} from './reader-calibration-v2565.mjs';
import {installReaderChoices} from './reader-choices-v2572.mjs';
import {installReaderTheme,applyReaderTheme} from './reader-theme-v2572.mjs';
import {saveEditableFormAppearance,normalizeEditableFormOnOpen} from './reader-choice-appearance-v2572.mjs';
import {centerFieldGlyphs} from './reader-layout-v2653.mjs';
import {downloadPdf} from './pdf-download-v2657.mjs';
import {readReaderMetadataV2724} from './pdf-metadata-v2724.mjs';
import {precisionToleranceDisplayV2726} from './reader-precision-excentricity-v2726.mjs';
installReaderTheme();
const assets=new URL('./vendor/pdfjs-6.3.289/',import.meta.url).href;
const $=id=>document.getElementById(id),hosted=parent!==window;
let parentOrigin='',autoReportName=false;
const formattedFields=new Map(),fieldTypography=new Map();
function applyFieldTypography(){
  for(const field of $('viewer').querySelectorAll('input,textarea,select,button.cdq-choice-field')){
    if(!fieldTypography.has(field.name)||field.name.startsWith('_')||/statut/i.test(field.name))continue;
    const size=fieldTypography.get(field.name);
    field.style.setProperty('font-size','calc('+size+'px * var(--total-scale-factor))','important');
    centerFieldGlyphs(field);
  }
}
function refreshResults(){if(!doc)return;paintReaderResults($('viewer'));}
$('viewer').addEventListener('input',()=>requestAnimationFrame(applyFieldTypography));
$('viewer').addEventListener('change',()=>requestAnimationFrame(applyFieldTypography));

try{const o=new URL(document.referrer).origin;if(o===location.origin||/^https:\/\/[a-z0-9-]+-script\.googleusercontent\.com$/.test(o))parentOrigin=o;}catch(_){}
const tell=data=>{if(hosted&&parentOrigin)parent.postMessage(data,parentOrigin)};
let api,viewer,scripting,doc,touch,form,readOnly=false,dirty=false,version=0,savedVersion=0,saving=false;
let lastAttempt=null,fieldDefinitions=null,nativeInput,readerCalibration=null,choices=null,decimalGuard=null;
const touchedIdentity=new Set();let lateIdentity=null;
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
  let value='',formattedValue,hasValue=false,pdfReadOnly=definitions.length>0;
  for(const definition of definitions){
    let stored=definition;
    try{if(definition?.id)stored=doc?.annotationStorage?.getValue(definition.id,definition)||definition;}catch(_){}
    const candidate=stored?.value??definition?.value??definition?.defaultValue;
    if(formattedValue===undefined)formattedValue=stored?.formattedValue??formattedFields.get(definition.id);
    if(!hasValue&&candidate!==undefined&&candidate!==null){value=candidate;hasValue=true;}
    const flags=Number(stored?.fieldFlags??definition?.fieldFlags??stored?.flags??definition?.flags??0);
    const locked=definition?.editable===false||Boolean(stored?.readOnly??definition?.readOnly) || !!(flags&1);
    if(!locked)pdfReadOnly=false;
  }
  const state={value:hasValue?value:'',formattedValue,readOnly:pdfReadOnly};
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
function cdqRestoreInteractiveFieldsV2581(){
  if(!doc||!fieldDefinitions)return;
  const controls=$('viewer').querySelectorAll('.textWidgetAnnotation input,.textWidgetAnnotation textarea,.choiceWidgetAnnotation select');
  for(const field of controls){
    const name=String(field.name||'');if(!name)continue;
    const state=cdqStoredFieldStateV2581(name);
    if(document.activeElement!==field){
      if(field.tagName==='SELECT'){
        const wanted=new Set(Array.isArray(state.value)?state.value.map(String):[String(state.value??'')]);
        for(const option of field.options)option.selected=wanted.has(String(option.value));
      }else{
        const raw=Array.isArray(state.value)?state.value.join(' + '):String(state.value??'');
        const wanted=state.formattedValue??raw;
        if(field.value!==wanted)field.value=wanted;
      }
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
const status=value=>{const el=$('status');el.textContent=value;el.dataset.active=String(!!value);};
function busy(value){saving=value;$('viewer').inert=value;$('savingMask').hidden=!value;for(const id of ['save','saveClose','doneFields','dismissKeyboard','discard','file'])$(id).disabled=value||!doc||readOnly;}
function fail(error){busy(false);status(error.message||String(error));$('closeError').textContent=error.message||String(error);closeAfterSave=false;}
function modified(){if(!readOnly&&!opening){dirty=true;version++;status('');}}
function close(){if(closed)return;closed=true;dirty=false;try{$('closeDialog').close()}catch(_){};tell({type:'CDQ_READER_CLOSE'});if(!hosted)history.back();}
async function requestClose(){
  if(saving){status('Enregistrement en cours…');return;}
  if(decimalGuard&&!decimalGuard.validate())return;
  commitActive();await new Promise(r=>setTimeout(r,120));
  if(!dirty||readOnly){close();return;}
  $('closeError').textContent='';if(!$('closeDialog').open)$('closeDialog').showModal();
  $('keepEditing').focus();
}
async function output(){
  if(decimalGuard&&!decimalGuard.validateAll())throw Error("Corrigez les décimales de la mesure avant d’enregistrer.");
  commitActive();await new Promise(r=>setTimeout(r,120));
  await scripting.dispatchWillSave();await new Promise(r=>setTimeout(r,0));
  let bytes=await doc.saveDocument();
  bytes=await saveEditableFormAppearance(bytes);
  return new Blob([bytes],{type:'application/pdf'});
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
  if(!doc||saving||readOnly&&!external)return;
  if(!readOnly&&decimalGuard&&!decimalGuard.validateAll())return;
  busy(true);$('closeError').textContent='';status(external?'Téléchargement…':'Enregistrement…');
  try{
    let blob=await output();const snapshot=version;if(lastAttempt?.version===snapshot)blob=lastAttempt.blob;
    if(external||!hosted||!fileId){const receipt=await downloadPdf(blob,name);busy(false);status(receipt);if(closeAfterSave){closeAfterSave=false;close();}return;}
    const requestId=lastAttempt?.version===snapshot?lastAttempt.id:'save-'+crypto.randomUUID();
    lastAttempt={id:requestId,version:snapshot,blob};
    pending={id:requestId,version:snapshot};
    pending.timer=setTimeout(()=>{if(pending?.id!==requestId)return;pending=null;fail(new Error('La sauvegarde n’a pas encore été confirmée. Le PDF reste ouvert; réessayez ou téléchargez vos réponses.'));},90000);
    tell({type:'CDQ_READER_SAVE',blob,name,requestId});
  }catch(e){fail(e);}
}
async function open(data){
  applyReaderTheme(data.theme);
  if(data.desktop===true){document.body.classList.add('cdq-reader-pc');$('readerTop').append($('name'));$('readerNameBar')?.remove();}
  const blob=data.blob;
  if(!(blob instanceof Blob)||blob.size>32*1024*1024||(await blob.slice(0,5).text())!=='%PDF-')throw Error('PDF invalide (32 Mo maximum).');
  if(doc)return; // A repeated READY/OPEN exchange must never erase current answers.
  opening=true;autoReportName=data.autoReportName===true;$('viewer').inert=true;name=String(data.name||name);fileId=String(data.fileId||'');readOnly=!!data.readOnly;
  $('name').textContent=name;$('empty').style.display='none';status('Ouverture du PDF…');
  const sourceBytes=await normalizeEditableFormOnOpen(new Uint8Array(await blob.arrayBuffer()));
  const task=api.getDocument({data:sourceBytes,standardFontDataUrl:assets+'standard_fonts/',cMapUrl:assets+'cmaps/',cMapPacked:true,wasmUrl:assets+'wasm/',isEvalSupported:false,enableXfa:false,enableHWA:true});
  doc=await task.promise;const firstPaint=firstReaderPaintV2682(viewer.eventBus);viewer.setDocument(doc);viewer.linkService.setDocument(doc);
  doc.annotationStorage.onSetModified=()=>{if(!readOnly&&!opening){dirty=true;status('');}};
  $('save').hidden=readOnly;$('saveClose').hidden=readOnly;
  // Scripting can initialise fields after the first canvas appears. User input is
  // tracked independently and is never cleared by a delayed render or rotation.
  const [metadata]=await Promise.all([readReaderMetadataV2724(doc),viewer.firstPagePromise]);
  const {fields,actions,typography,firstPageHasAnnotations}=metadata;fieldDefinitions=fields;
  if(fields?.get?.('identification_balance')||fields?.identification_balance)autoReportName=true;
  for(const [field,size] of typography)fieldTypography.set(field,size);
  applyFieldTypography();
  cdqApplyConstraintDefaultsV2583();
  readerCalibration=installReaderCalibration({surface:$('viewer'),doc,fields,tell});
  nativeInput.configure(fields);$('viewer').classList.toggle('cdq-form',!!(fields?.get?.('client_nom')||fields?.client_nom)&&!!(fields?.get?.('charge_point_1_charge_utilisee')||fields?.charge_point_1_charge_utilisee));
  if(fields?.size||fields&&Object.keys(fields).length||actions){const deadline=Date.now()+12000;while(!scripting.ready){if(Date.now()>deadline)throw Error('Les calculs du PDF n’ont pas pu démarrer. Fermez le document puis réessayez.');await new Promise(r=>setTimeout(r,25));}}
  await firstPaint.wait(firstPageHasAnnotations);
  cdqRestoreInteractiveFieldsV2581();applyFieldTypography();choices.refresh();applyFieldTypography();form.refresh();refreshResults();
  await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
  opening=false;busy(false);$('viewer').dataset.ready='true';status(readOnly?'Consultation seulement':'');
  applyLateIdentity();
  tell({type:'CDQ_READER_OPENED'});
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
  if(d.type==='CDQ_READER_SAVED'&&pending&&d.requestId===pending.id){
    clearTimeout(pending.timer);const snapshot=pending.version,discarding=pending.discard;pending=null;
    if(!d.ok){fail(new Error(d.error||'Enregistrement impossible. Le PDF reste ouvert.'));return;}
    if(discarding){busy(false);close();return;}
    lastAttempt=null;savedVersion=snapshot;dirty=version!==savedVersion;busy(false);await scripting.dispatchDidSave();
    status(d.queued?'Conservé sur cet appareil — synchronisation en attente.':'✓ Enregistré dans le dossier client');
    if(closeAfterSave&&!dirty){close();}else closeAfterSave=false;
  }
  if(d.type==='CDQ_READER_OPEN'&&api&&viewer)try{await open(d)}catch(err){opening=false;fail(err);}
});
try{
  api=await import(assets+'build/pdf.mjs');api.GlobalWorkerOptions.workerSrc=assets+'build/pdf.worker.mjs';
  const ui=await import(assets+'web/pdf_viewer.mjs'),eventBus=new ui.EventBus(),linkService=new ui.PDFLinkService({eventBus,externalLinkTarget:2});
  scripting=new ui.PDFScriptingManager({eventBus,sandboxBundleSrc:assets+'build/pdf.sandbox.mjs',wasmUrl:assets+'wasm/'});
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
  decimalGuard=installDecimalPrecisionV2695({surface:$('viewer'),getEchelon:()=>$('viewer').querySelector('[name="echelon"]')?.value||cdqStoredFieldStateV2581('echelon').value,status});
  form=installFormNavigation({validate:field=>decimalGuard.validate(field),surface:$('viewer'),toolbar:$('formNav'),previous:$('previousField'),next:$('nextField'),done:$('doneFields'),openChoice:field=>choices.open(field),choiceIsOpen:()=>choices.isOpen(),reveal:field=>{
    if(cdqTextEntryFieldV2550(field)){
      cdqNavigationTextFieldV2562=field;
      cdqDirectTextFieldV2557=null;
    }else{
      cdqNavigationTextFieldV2562=null;
    }
    cdqRevealFieldV2552(field,true);
  }});
  eventBus.on('pagesinit',()=>{viewer.currentScaleValue='page-width';});
  eventBus.on('pagerendered',()=>refreshResults());
  eventBus.on('scalechanging',e=>{$('zoom').textContent=Math.round(e.scale*100)+' %';});
  eventBus.on('pagerendered',e=>{if(!e.error&&e.source?.div)e.source.div.dataset.cdqPaintedV2556='true';if(e.error)fail(e.error);});
  eventBus.on('annotationlayerrendered',e=>{cdqWrapStableAnnotationLayerV2556(e.source);cdqRestoreInteractiveFieldsV2581();applyFieldTypography();if(readOnly)for(const field of $('viewer').querySelectorAll('input,textarea,select,button'))field.disabled=true;choices.refresh();applyFieldTypography();form.refresh();nativeInput.configure(fieldDefinitions);readerCalibration?.refresh();refreshResults();});
  eventBus.on('updatefromsandbox',event=>{
    const detail=event.detail||{};
    if(detail.id&&Object.hasOwn(detail,'formattedValue'))formattedFields.set(detail.id,detail.formattedValue??'');
    setTimeout(()=>{cdqRestorePrecisionToleranceV2726();refreshResults();applyFieldTypography();},0);
  });
  // A technician can stop at the last reading without moving to another field.
  // Commit only complete numeric inputs, so partial decimals stay editable.
  let liveCalculationTimer=0;
  $('viewer').addEventListener('input',e=>{
    const field=e.target,value=String(field.value??'');
    if(readOnly||opening||saving||!field.name||!(/^(echelon|capacite_maximale|charge_excentricite|charge_point_\d+_(charge_utilisee|charge_contrainte|avant_correction|apres_correction)|excentricite_(avant|apres)_)/.test(field.name)))return;
    clearTimeout(liveCalculationTimer);
    if(isCorrectionReadingV2695(field.name)&&decimalPrecisionErrorV2695(value,$('viewer').querySelector('[name="echelon"]')?.value||cdqStoredFieldStateV2581('echelon').value))return;
    if(value!==''&&!/^[+-]?(?:\d+(?:[.,]\d+)?|[.,]\d+)$/.test(value.replace(/[\s\u00a0\u202f]/g,'')))return;
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
  tell({type:'CDQ_READER_READY'});
}catch(e){fail(e);$('empty').textContent='Le lecteur n’a pas pu démarrer. Fermez puis mettez à jour l’application.';}

