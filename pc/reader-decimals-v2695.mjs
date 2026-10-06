// Preserve typed zeros and require the measurement precision shown by e.
export const isCorrectionReadingV2695=name=>/^(?:charge_point_\d+_(?:avant|apres)_correction|excentricite_(?:avant|apres)_.+|B4_.+_(?:Avant|Apres)Correction)$/.test(name||'');
export function decimalPrecisionErrorV2695(value,echelon){
 function clean(v){return String(v===null||v===undefined?'':v).replace(/[\s\u00a0\u202f]/g,'').replace(',','.');}
 var e=clean(echelon),v=clean(value),number=/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/;
 if(!v)return '';
 if(!number.test(e)||!isFinite(Number(e))||Number(e)<=0)return 'Entrez un échelon valide avant de poursuivre les mesures.';
 if(!number.test(v)||!isFinite(Number(v)))return 'Entrez une mesure valide.';
 var expected=(e.split('.')[1]||'').length,actual=(v.split('.')[1]||'').length,difference=expected-actual;
 if(!difference)return '';
 return difference>0?'Il manque '+difference+' chiffre'+(difference>1?'s':'')+' après la virgule. L’échelon exige '+expected+' décimale'+(expected>1?'s':'')+'.':'La mesure doit avoir '+expected+' décimale'+(expected>1?'s':'')+', comme l’échelon. Retirez les décimales en trop.';
}
export function normalizeDecimalPrecisionV2695(pdf,L){
 const N=L.PDFName.of,form=pdf.getForm();if(!form.getFieldMaybe('echelon')||pdf.catalog.has(N('CDQDecimalPrecisionV2695')))return false;
 const validation='// CDQDecimalPrecisionV2695\n(function(){'+decimalPrecisionErrorV2695.toString().replace('decimalPrecisionErrorV2695','precisionError')+';var f=this.getField("echelon"),m=precisionError(event.value,f?f.valueAsString||f.value:"");if(m){event.rc=false;try{app.alert(m);}catch(ignore){}}}).call(this);';
 // Acrobat's JS engine predates const/arrow syntax. The function is deliberately
 // converted once; keep the browser and PDF checks on exactly the same rule.
 const legacy=validation.replace(/const /g,'var ').replace(/let /g,'var ').replace(/v=>String\(v\?\?''\)/,'function(v){return String(v===null||v===undefined?"":v)}').replace(/Number\.isFinite\(/g,'isFinite(');
 const text=a=>{const j=a?.lookup(N('JS'));return j?.decodeText?.()||'';};
 for(const f of form.getFields())if(isCorrectionReadingV2695(f.getName())){
  const aa=f.acroField.dict.lookupMaybe(N('AA'),L.PDFDict)||pdf.context.obj({});f.acroField.dict.set(N('AA'),aa);
  aa.set(N('V'),pdf.context.obj({S:'JavaScript',JS:L.PDFHexString.fromText(legacy)}));
  const k=aa.lookupMaybe(N('K'),L.PDFDict),old=text(k);aa.set(N('K'),pdf.context.obj({S:'JavaScript',JS:L.PDFHexString.fromText('if(event.willCommit){this._cdqDecimalInputV2695=this._cdqDecimalInputV2695||{};this._cdqDecimalInputV2695[event.targetName]={value:String(event.value),live:event.commitKey===1};'+legacy+'}\n'+old)}));
  aa.set(N('F'),pdf.context.obj({S:'JavaScript',JS:L.PDFHexString.fromText('if(event.value!==""&&event.value!==null){var ef=this.getField("echelon"),es=String(ef?ef.valueAsString||ef.value:"").replace(",","."),n=(es.split(".")[1]||"").length,v=Number(String(event.value).replace(/[\\s\\u00a0\\u202f]/g,"").replace(",",".")),typed=this._cdqDecimalInputV2695&&this._cdqDecimalInputV2695[event.targetName];if(typed&&Number(typed.value.replace(",","."))===v)event.value=typed.live?typed.value:typed.value.replace(".",",");else if(isFinite(v)&&n<=20)event.value=v.toFixed(n).replace(".",",");}')}));
 }
 pdf.catalog.set(N('CDQDecimalPrecisionV2695'),L.PDFNumber.of(2695));return true;
}
export function installDecimalPrecisionV2695({surface,getEchelon,status,owner=document}){
 let blocked=null;
 const reading=el=>el?.matches?.('input,textarea')&&!el.readOnly&&!el.disabled&&isCorrectionReadingV2695(el.name);
 function validate(field=owner.activeElement){
  if(!reading(field))return true;
  const message=decimalPrecisionErrorV2695(field.value,getEchelon());
  field.setCustomValidity(message);field.toggleAttribute('aria-invalid',!!message);
  if(!message){if(blocked===field)blocked=null;return true;}
  blocked=field;status(message);field.focus({preventScroll:true});field.reportValidity();return false;
 }
 function stop(e){e.preventDefault();e.stopImmediatePropagation();}
 owner.addEventListener('keydown',e=>{if(!e.isComposing&&['Tab','Enter'].includes(e.key)&&!validate(e.target))stop(e);},true);
 owner.addEventListener('pointerdown',e=>{
  const active=owner.activeElement;if(!reading(active)||active===e.target)return;
  const target=e.target.closest?.('input,textarea,select,button,a');
  if(target&&(surface.contains(target)||['back','nextField','previousField','doneFields','dismissKeyboard','save','saveClose','file'].includes(target.id))&&!validate(active))stop(e);
 },true);
 owner.addEventListener('click',e=>{const target=e.target.closest?.('input,textarea,select,button,a');if(!target||target===blocked)return;if((surface.contains(target)||['back','nextField','previousField','doneFields','dismissKeyboard','save','saveClose','file'].includes(target.id))&&!validate(blocked||owner.activeElement))stop(e);},true);
 surface.addEventListener('input',e=>{if(reading(e.target)){e.target.setCustomValidity('');e.target.removeAttribute('aria-invalid');if(blocked===e.target){status('');blocked=null;}}},true);
 return {validate,validateAll(){
  if(!validate())return false;
  for(const el of surface.querySelectorAll('input,textarea'))if(reading(el)&&el.getClientRects().length&&!validate(el))return false;
  return true;
 }};
}
