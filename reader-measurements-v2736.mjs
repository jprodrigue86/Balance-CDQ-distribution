// One rule is used by the reader and embedded Acrobat/PDF.js actions.
export const isCorrectionReadingV2736=name=>/^(?:charge_point_\d+_(?:avant|apres)_correction(?:_2)?|excentricite_(?:avant|apres)_.+|B4_.+_(?:Avant|Apres)Correction)$/.test(name||'');
export function measurementErrorV2736(value,echelon){
 function clean(v){return String(v===null||v===undefined?'':v).replace(/[\s\u00a0\u202f]/g,'').replace(',','.');}
 var e=clean(echelon),v=clean(value),number=/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/;
 if(!v||v==='-'||/^o\.l$/i.test(v))return '';
 if(!number.test(e)||!isFinite(Number(e))||Number(e)<=0)return 'Entrez un échelon valide avant de poursuivre les mesures.';
 if(!number.test(v)||!isFinite(Number(v)))return 'Entrez une mesure valide, un trait d’union (-) ou O.L.';
 var expected=(e.split('.')[1]||'').length,actual=(v.split('.')[1]||'').length,difference=expected-actual;
 if(difference)return difference>0?'Il manque '+difference+' chiffre'+(difference>1?'s':'')+' après la virgule. L’échelon exige '+expected+' décimale'+(expected>1?'s':'')+'.':'La mesure doit avoir '+expected+' décimale'+(expected>1?'s':'')+', comme l’échelon. Retirez les décimales en trop.';
 // Decimal integer long division avoids floating point false positives, even
 // above Number.MAX_SAFE_INTEGER. Equal precision gives the same integer scale.
 function trim(s){return s.replace(/^0+(?=\d)/,'');}
 function cmp(a,b){return a.length-b.length||(a===b?0:a>b?1:-1);}
 function sub(a,b){var out='',borrow=0;for(var i=a.length-1,j=b.length-1;i>=0;i--,j--){var n=Number(a.charAt(i))-borrow-(j>=0?Number(b.charAt(j)):0);if(n<0){n+=10;borrow=1;}else borrow=0;out=String(n)+out;}return trim(out);}
 var divisor=trim(e.replace(/^[+-]/,'').replace('.','')),digits=trim(v.replace(/^[+-]/,'').replace('.','')),remainder='0';
 for(var i=0;i<digits.length;i++){remainder=trim(remainder+digits.charAt(i));while(cmp(remainder,divisor)>=0)remainder=sub(remainder,divisor);}
 return remainder==='0'?'':'La mesure doit être un multiple de l’échelon '+e.replace('.',',')+'.';
}
export function isCompleteMeasurementInputV2736(value){
 const v=String(value??'').replace(/[\s\u00a0\u202f]/g,'');
 return v===''||v==='-'||/^o\.l$/i.test(v)||/^[+-]?(?:\d+(?:[.,]\d+)?|[.,]\d+)$/.test(v);
}
export function installMeasurementValidationV2736({surface,getEchelon,status,owner=document}){
 let blocked=null;
 const reading=el=>el?.matches?.('input,textarea')&&!el.readOnly&&!el.disabled&&isCorrectionReadingV2736(el.name);
 function validate(field=owner.activeElement){
  if(!reading(field))return true;
  const message=measurementErrorV2736(field.value,getEchelon());
  field.setCustomValidity(message);if(message)field.setAttribute('aria-invalid','true');else field.removeAttribute('aria-invalid');
  if(!message){if(blocked===field)blocked=null;return true;}
  blocked=field;status(message);field.focus({preventScroll:true});field.reportValidity();return false;
 }
 function stop(e){e.preventDefault();e.stopImmediatePropagation();}
 owner.addEventListener('keydown',e=>{if(!e.isComposing&&['Tab','Enter'].includes(e.key)&&!validate(e.target))stop(e);},true);
 owner.addEventListener('pointerdown',e=>{const active=owner.activeElement;if(!reading(active)||active===e.target)return;const target=e.target.closest?.('input,textarea,select,button,a');if(target&&(surface.contains(target)||['back','nextField','previousField','doneFields','dismissKeyboard','save','saveClose','file'].includes(target.id))&&!validate(active))stop(e);},true);
 owner.addEventListener('click',e=>{const target=e.target.closest?.('input,textarea,select,button,a');if(!target||target===blocked)return;if((surface.contains(target)||['back','nextField','previousField','doneFields','dismissKeyboard','save','saveClose','file'].includes(target.id))&&!validate(blocked||owner.activeElement))stop(e);},true);
 surface.addEventListener('input',e=>{if(reading(e.target)){e.target.setCustomValidity('');e.target.removeAttribute('aria-invalid');if(blocked===e.target){status('');blocked=null;}}},true);
 return {validate,validateAll(){if(!validate())return false;for(const el of surface.querySelectorAll('input,textarea'))if(reading(el)&&el.getClientRects().length&&!validate(el))return false;return true;}};
}

// Called around the existing family calculator. Its tolerances, applied-load
// formulas, selectable diagrams and ordinary numerical calculations stay intact.
// Only explicit skipped readings/overloads change evaluation and aggregation.
export function measurementResultsV2736(d,original,cfg){
 var out=original(d),eps=1e-10;
 function raw(n){var f=d.getField(n),v=f?f.valueAsString===undefined?f.value:f.valueAsString:'';return String(v===null||v===undefined?'':v).replace(/[\s\u00a0\u202f]/g,'').replace(',','.');}
 function special(v){return v==='-'||/^o\.l$/i.test(v);}
 function meaningful(v){return v!==''&&v!=='-';}
 function number(v){return /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(v)&&isFinite(Number(v))?Number(v):NaN;}
 function check(n,on){out[n]=on?'Yes':'Off';}
 function selected(b,a){return a!==''&&a!=='-'?a:b;}
 var e=number(raw('echelon')),goodRows=0,badRows=0,activeRows=0,incomplete=0,skippedRows=0,readingCount=0,changed=false;
 for(var i=1;i<=cfg.rows;i++){
  var p='charge_point_'+i+'_',rowSpecial=false,rowActive=false,rowGood=true,rowBad=false,rowCount=0,rowSkipped=0,rowIncomplete=false;
  for(var slot=0;slot<(cfg.dual?2:1);slot++){
   var s=slot?'_2':'',b=raw(p+'avant_correction'+s),a=raw(p+'apres_correction'+s),q=selected(b,a),hasSpecial=special(b)||special(a);
   if(hasSpecial)rowSpecial=true;
   if(meaningful(b)||meaningful(a)||meaningful(raw(p+'charge_utilisee'+s)))rowActive=true;
   if(meaningful(q))readingCount++;
   var skipped=(q===''||q==='-')&&hasSpecial;
   if(skipped){rowSkipped++;continue;}
   if(q===''){rowGood=false;rowIncomplete=true;continue;}
   rowCount++;
   if(/^o\.l$/i.test(q)){rowGood=false;rowBad=true;continue;}
   var t=number(String(out[p+'tolerance'+s]===undefined?'':out[p+'tolerance'+s])),err=number(String(out[p+(a!==''&&a!=='-'?'erreur_apres':'erreur_avant')+s]===undefined?'':out[p+(a!==''&&a!=='-'?'erreur_apres':'erreur_avant')+s]).replace(/e$/,''));
   if(!isFinite(t)||!isFinite(err)||!isFinite(e)||e<=0){rowGood=false;rowIncomplete=true;}
   else if(Math.abs(err)>t+eps){rowGood=false;rowBad=true;}
  }
  if(rowSpecial){
   changed=true;
   for(var slot=0;slot<(cfg.dual?2:1);slot++){var s=slot?'_2':'';for(var phase=0;phase<2;phase++){var v=raw(p+(phase?'apres':'avant')+'_correction'+s);if(special(v))out[p+'erreur_'+(phase?'apres':'avant')+s]='';}}
   // A skipped after reading uses the before error, never the empty after error.
   if(rowSkipped===(cfg.dual?2:1)){rowActive=false;skippedRows++;}
   rowGood=rowGood&&rowCount>0&&!rowIncomplete&&(!cfg.dual||meaningful(raw(p+'numero_tete')));
   // Retain the precision capacity guard, which is independent of measurement.
   if(cfg.precision&&rowCount&&out[p+'conforme']==='Non conforme'&&!isFinite(number(String(out[p+'tolerance']))))rowBad=true;
   if(cfg.revisedDual){
    // Revised V2763 per-weight calculator is authoritative for the independent
    // Poids 1 / Poids 2 indicators. Keep it intact after '-' or O.L input.
    var authored=out[p+'conforme'];rowBad=authored==='Non conforme';rowGood=authored==='Conforme';
   }else{
    out[p+'conforme']=rowBad?'Non conforme':rowGood?'Conforme':'';
    check(p+'conforme_vert',rowGood&&!rowBad);check(p+'conforme_rouge',rowBad);
   }
  }
  var state=out[p+'conforme'];
  if(rowActive){activeRows++;if(state==='Conforme')goodRows++;else if(state==='Non conforme')badRows++;else incomplete++;}
 }
 var g3=out.bloc3_statut_conforme==='Yes',r3=out.bloc3_statut_non_conforme==='Yes';
 if(changed){g3=activeRows>0&&goodRows>0&&badRows===0&&incomplete===0;r3=badRows>0;if(cfg.dual)g3=g3&&goodRows+skippedRows===cfg.rows;check('bloc3_statut_conforme',g3);check('bloc3_statut_non_conforme',r3);}
 if(cfg.dual){g3=changed?g3:goodRows===cfg.rows;r3=badRows>0;}
 var groups=cfg.groups,ns=groups?groups.avant.slice(0):[],as=groups?groups.apres.slice(0):[];
 if(cfg.points&&raw('points_test')==='3points'||cfg.precision&&/triangle/i.test(raw('type_plateau'))){var bn=[],an=[];for(var j=0;j<ns.length;j++)if(ns[j].indexOf('arriere_droit')<0){bn.push(ns[j]);an.push(as[j]);}ns=bn;as=an;}
 var eccSpecial=false,afterAny=false;
 for(var j=0;j<ns.length;j++){if(special(raw(ns[j]))||special(raw(as[j])))eccSpecial=true;if(meaningful(raw(as[j])))afterAny=true;}
 var g4=cfg.none||out.excentricite_statut_conforme==='Yes',r4=out.excentricite_statut_non_conforme==='Yes',eccIgnored=false;
 if(eccSpecial){
  changed=true;var count=0,any=false,invalid=false,complete=true,min=Infinity,max=-Infinity,ol=false;
  for(var j=0;j<ns.length;j++){
   var b=raw(ns[j]),a=raw(as[j]),q=afterAny?(a==='-'?b:a):selected(b,a);
   if(q==='-'||(q===''&&(b==='-'||a==='-')))continue;
   if(q===''){if(!cfg.partial||afterAny&&meaningful(b))complete=false;continue;}
   any=true;readingCount++;
   if(/^o\.l$/i.test(q)){ol=true;invalid=true;continue;}
   var x=number(q);if(!isFinite(x)){invalid=true;continue;}count++;min=Math.min(min,x);max=Math.max(max,x);
  }
  var c=number(raw('charge_excentricite')),t=number(String(out.tolerance_excentricite===undefined?'':out.tolerance_excentricite)),usable=isFinite(c)&&isFinite(t)&&isFinite(e)&&e>0,spread=(Math.max(0,max-c)+Math.max(0,c-min))/e;
  eccIgnored=!any&&complete;
  r4=ol||any&&(invalid||!usable||spread>t+eps||(!complete&&(!cfg.precision||afterAny)));
  g4=any&&count>0&&complete&&!r4;
  if(cfg.none){g4=true;r4=ol;}
  check('excentricite_statut_conforme',!cfg.none&&g4);check('excentricite_statut_non_conforme',r4);
 }
 // Count ordinary eccentricity readings even when only central rows contain skips.
 if(!eccSpecial)for(var j=0;j<ns.length;j++)if(meaningful(selected(raw(ns[j]),raw(as[j]))))readingCount++;
 // Nothing entered (or only '-') must never be marked compliant.
 if(!changed){
  var actual=readingCount;
  if(!actual){out.Statut_conformite='';check('Bouton_Conforme',false);check('Bouton_NonConforme',false);}
  return out;
 }
 var bad=r3||r4,complete=(g3||(activeRows===0&&skippedRows>0))&&(g4||eccIgnored)&&readingCount>0;
 out.Statut_conformite=bad?'Non conforme':complete?'Conforme':'';
 check('Bouton_Conforme',complete&&!bad);check('Bouton_NonConforme',bad);
 return out;
}

function readScriptV2736(action,pdf,L){const j=action?.lookup?.(L.PDFName.of('JS'));return j instanceof L.PDFRawStream?new TextDecoder().decode(L.decodePDFRawStream(j).decode()):j?.decodeText?.()||'';}
function familyConfigurationV2736(pdf,family,L){
 const names=pdf.getForm().getFields().map(f=>f.getName()),before=names.filter(n=>/^excentricite_avant_/.test(n)),truck=family==='camion'||family==='train';
 const groups=truck?{avant:names.filter(n=>/^B4_.+_AvantCorrection$/.test(n)).sort(),apres:names.filter(n=>/^B4_.+_ApresCorrection$/.test(n)).sort()}:{avant:before,apres:before.map(n=>n.replace('excentricite_avant_','excentricite_apres_'))};
 return {rows:Math.max(...names.map(n=>Number(/^charge_point_(\d+)_charge_utilisee$/.exec(n)?.[1]||0))),revisedDual:family==='multitete'&&pdf.catalog.has(L.PDFName.of('CDQApprovedReportV2737')),dual:family==='multitete',precision:family==='precision',points:family==='cuve4'||family==='tremie4',none:family==='multitete'||family==='suspendue',partial:truck,groups};
}
export function normalizeMeasurementRulesV2736(pdf,L,family){
 const N=L.PDFName.of,form=pdf.getForm();if(!form.getFieldMaybe('echelon')||pdf.catalog.has(N('CDQMeasurementRulesV2736')))return false;
 const cfg=familyConfigurationV2736(pdf,family,L),seen=new Set(),actions=[];
 function visit(o){if(o instanceof L.PDFRef)o=pdf.context.lookup(o);if(!o||seen.has(o))return;seen.add(o);if(o instanceof L.PDFDict){if(o.get(N('S'))===N('JavaScript'))actions.push(o);for(const[,v]of o.entries())visit(v);}else if(o instanceof L.PDFArray)for(const v of o.asArray())visit(v);else if(o instanceof L.PDFStream)visit(o.dict);}
 for(const[,o]of pdf.context.enumerateIndirectObjects())visit(o);
 const core=measurementResultsV2736.toString(),cache=new Map();
 function scriptRef(text){if(!cache.has(text))cache.set(text,pdf.context.register(pdf.context.flateStream(new TextEncoder().encode('\uFEFF'+text))));return cache.get(text);}
 function replace(action,text){action.set(N('JS'),scriptRef('// CDQMeasurementRulesV2736\n'+text));}
 let calculations=0;
 for(const action of actions){let source=readScriptV2736(action,pdf,L);if(!/function cdqResults\(d\)\s*\{/.test(source))continue;
  source=source.replace(/function cdqResults\(d\)\s*\{/,'function cdqOriginalResultsV2736(d){');
  source=source.replace(/function cdqOriginalResultsV2736\(d\)\{/,'function cdqResults(d){return measurementResultsV2736(d,cdqOriginalResultsV2736,'+JSON.stringify(cfg)+');}\n'+core+'\nfunction cdqOriginalResultsV2736(d){');replace(action,source);calculations++;
 }
 if(family==='plancher'){
  const row=actions.find(a=>readScriptV2736(a,pdf,L).includes('var m=/^charge_point_')&&readScriptV2736(a,pdf,L).includes('tolerance|erreur_avant|erreur_apres|conforme'));
  const status=actions.find(a=>readScriptV2736(a,pdf,L).includes('var rowStates=[];'));
  if(!row||!status)throw Error('Plancher original calculations not found');
  const rowSource=readScriptV2736(row,pdf,L).replace(/\}\)\(this,event\);/g,'})(d,ev);'),statusSource=readScriptV2736(status,pdf,L).replace(/\}\)\(this,event\);/g,'})(d,ev);');
  const original='function cdqOriginalResultsV2736(d){var real=d,local={};d={getField:function(n){if(Object.prototype.hasOwnProperty.call(local,n))return local[n];var f=real.getField(n);return local[n]=f?{value:f.value,valueAsString:f.valueAsString}:null;}};var out={},ev,n,p;for(var i=1;i<='+cfg.rows+';i++){p="charge_point_"+i+"_";var suffix=["tolerance","erreur_avant","erreur_apres","conforme"];for(var j=0;j<suffix.length;j++){n=p+suffix[j];ev={targetName:n,target:{name:n},value:""};'+rowSource+'out[n]=ev.value;}}ev={targetName:"Statut_conformite",value:""};'+statusSource+'out.Statut_conformite=ev.value;var c4s=String(d.getField(\"charge_excentricite\").value).replace(/[\\s\\u00a0\\u202f]/g,\"\").replace(\",\",\".\"),e4s=String(d.getField(\"echelon\").value).replace(/[\\s\\u00a0\\u202f]/g,\"\").replace(\",\",\".\"),c4=c4s===\"\"?NaN:Number(c4s),e4=e4s===\"\"?NaN:Number(e4s);out.tolerance_excentricite=isFinite(c4)&&c4>=0&&isFinite(e4)&&e4>0?Math.max(1,Math.ceil(c4*.001/e4-.5-1e-10)):\"\";var names=["bloc3_statut_conforme","bloc3_statut_non_conforme","excentricite_statut_conforme","excentricite_statut_non_conforme","Bouton_Conforme","Bouton_NonConforme"];for(var i=1;i<='+cfg.rows+';i++){names.push("charge_point_"+i+"_conforme_vert");names.push("charge_point_"+i+"_conforme_rouge");}for(var j=0;j<names.length;j++){var f=d.getField(names[j]);if(f)out[names[j]]=f.value;}return out;}';
  const calculate=core+'\n'+original+'\nvar cdqValuesV2736=measurementResultsV2736(this,cdqOriginalResultsV2736,'+JSON.stringify(cfg)+');';
  replace(row,'(function(){'+calculate+'var n=event.targetName||(event.target&&event.target.name);if(Object.prototype.hasOwnProperty.call(cdqValuesV2736,n))event.value=cdqValuesV2736[n];}).call(this);');
  replace(status,'(function(){'+calculate+'event.value=cdqValuesV2736.Statut_conformite;if(this._cdqMeasurementUpdatingV2736)return;this._cdqMeasurementUpdatingV2736=true;var previous=this.calculate;try{this.calculate=false;for(var n in cdqValuesV2736)if(/conforme_(vert|rouge)$|statut_(non_)?conforme$|^Bouton_/.test(n)){var f=this.getField(n);if(f&&String(f.value)!==String(cdqValuesV2736[n]))f.value=cdqValuesV2736[n];}}finally{this.calculate=previous;this._cdqMeasurementUpdatingV2736=false;}}).call(this);');calculations+=2;
 }
 if(!calculations)throw Error('Original family calculations not found: '+family);
 // Some masters have compact per-field C actions rather than cdqResults.
 // Route every computed value through the same preserved family calculator.
 const originalSource=actions.map(a=>readScriptV2736(a,pdf,L)).find(s=>s.includes('function cdqOriginalResultsV2736(d)'));
 function originalFunction(source){
  const start=source.indexOf('function cdqOriginalResultsV2736(d)'),open=source.indexOf('{',start);let depth=1,quote='',line=false,block=false;
  for(let i=open+1;i<source.length;i++){const c=source[i],next=source[i+1];if(line){if(c==='\n')line=false;continue;}if(block){if(c==='*'&&next==='/'){block=false;i++;}continue;}if(quote){if(c==='\\'){i++;continue;}if(c===quote)quote='';continue;}if(c==='"'||c==="'"){quote=c;continue;}if(c==='/'&&next==='/'){line=true;i++;continue;}if(c==='/'&&next==='*'){block=true;i++;continue;}if(c==='{')depth++;else if(c==='}'&&!--depth)return source.slice(start,i+1);}
  throw Error('Cannot preserve original calculator: '+family);
 }
 if(!originalSource)throw Error('Preserved family calculator missing: '+family);
 const calculator=core+'\n'+originalFunction(originalSource)+'\nvar values=measurementResultsV2736(this,cdqOriginalResultsV2736,'+JSON.stringify(cfg)+');';
 const apply='if(!this._cdqMeasurementUpdatingV2736){this._cdqMeasurementUpdatingV2736=true;var previous=this.calculate;try{this.calculate=false;for(var n in values)if(values[n]==="Yes"||values[n]==="Off"){var f=this.getField(n);if(f&&String(f.value)!==String(values[n]))f.value=values[n];}}finally{this.calculate=previous;this._cdqMeasurementUpdatingV2736=false;}}';
 for(const field of form.getFields())if(/^(?:charge_point_\d+_(?:tolerance|erreur_avant|erreur_apres|conforme)(?:_2)?|charge_point_\d+_conforme_(?:vert|rouge)|(?:bloc3|excentricite)_statut_(?:non_)?conforme|Bouton_(?:Conforme|NonConforme)|tolerance_excentricite|Statut_conformite)$/.test(field.getName())){
  const aa=field.acroField.dict.lookupMaybe(N('AA'),L.PDFDict),action=aa?.lookupMaybe(N('C'),L.PDFDict);if(!action)continue;
  replace(action,'(function(){'+calculator+'var name=event.targetName||(event.target&&event.target.name);if(Object.prototype.hasOwnProperty.call(values,name))event.value=values[name];'+(/^(Statut_conformite|tolerance_excentricite)$/.test(field.getName())?apply:'')+'}).call(this);');
 }

 const error=measurementErrorV2736.toString(),validation='(function(){'+error+';var f=this.getField("echelon"),m=measurementErrorV2736(event.value,f?f.valueAsString||f.value:"");if(m){event.rc=false;try{app.alert(m);}catch(ignore){}}else if(/^o\\.l$/i.test(String(event.value).replace(/\\s/g,"")))event.value="O.L";}).call(this);';
 for(const field of form.getFields())if(isCorrectionReadingV2736(field.getName())){
  const aa=field.acroField.dict.lookupMaybe(N('AA'),L.PDFDict)||pdf.context.obj({});field.acroField.dict.set(N('AA'),aa);
  const oldK=readScriptV2736(aa.lookupMaybe(N('K'),L.PDFDict),pdf,L),navigation=oldK.includes('}).call(this);}')?oldK.slice(oldK.indexOf('}).call(this);}')+15):oldK;
  const action=text=>pdf.context.obj({S:'JavaScript',JS:scriptRef('// CDQMeasurementRulesV2736\n'+text)});
  aa.set(N('V'),action(validation));
  aa.set(N('K'),action('// CDQDecimalPrecisionV2695 commit-only native entry retained\nif(event.willCommit){this._cdqDecimalInputV2695=this._cdqDecimalInputV2695||{};this._cdqDecimalInputV2695[event.targetName]={value:String(event.value),live:event.commitKey===1};'+validation+'}\n'+navigation));
  const oldF=readScriptV2736(aa.lookupMaybe(N('F'),L.PDFDict),pdf,L);aa.set(N('F'),action('var cdqTokenV2736=String(event.value===null?"":event.value).replace(/[\\s\\u00a0\\u202f]/g,"");if(cdqTokenV2736==="-")event.value="-";else if(/^o\\.l$/i.test(cdqTokenV2736))event.value="O.L";else{'+oldF+'}'));
 }
 pdf.catalog.set(N('CDQMeasurementRulesV2736'),L.PDFNumber.of(2736));return true;
}
