const NATIVE_GROUP="// CDQ conformity precedence V2823: keep each failure until its own repair passes.\nfunction CDQ_nativeGroup(d,names,corrected,second,values){\n function raw(n){var v=values&&values.hasOwnProperty(n)?values[n]:CDQ_nativeRaw(d,n);return String(v===null||v===undefined?'':v).trim();}\n function number(v){var s=String(v).replace(/[\\s\\u00a0\\u202f±]/g,'').replace(/e$/i,'').replace(',','.');return /^[+-]?(?:\\d+(?:\\.\\d*)?|\\.\\d+)$/.test(s)&&isFinite(Number(s))?Number(s):NaN;}\n function entered(v){return v!==''&&v!=='-'&&v!=='N/V';}\n function paired(n){return n.replace('_avant_correction','_apres_correction').replace('excentricite_avant_','excentricite_apres_').replace('_AvantCorrection','_ApresCorrection');}\n var multi=!!d.getField('charge_point_1_avant_correction_2');\n var group=names.filter(function(n){return multi?(second?/_2$/.test(n):/^charge_/.test(n)&&!/_2$/.test(n)):(second?!/^charge_/.test(n):/^charge_/.test(n));});\n var before=group.filter(function(n){return CDQ_nativeBefore(n)&&CDQ_nativeVisible(d.getField(n));});\n before=before.filter(function(n){return n.indexOf('arriere_droit')<0||!(/^3points$/i.test(raw('points_test'))||/triangle/i.test(raw('type_plateau')));});\n var after=corrected||before.some(function(n){return entered(raw(paired(n)));});\n var count=0,needed=0,bad=false,pending=false,parameters=true;\n if(multi||!second){\n  for(var i=0;i<before.length;i++){\n   var name=before[i],an=paired(name),b=raw(name),a=raw(an),selected=after?a:b;\n   var t=number(raw(name.replace('_avant_correction','_tolerance')));\n   var eb=number(raw(name.replace('_avant_correction','_erreur_avant'))),ea=number(raw(an.replace('_apres_correction','_erreur_apres')));\n   var beforeBad=/^o\\.l$/i.test(b)||entered(b)&&isFinite(eb)&&isFinite(t)&&Math.abs(eb)>Math.abs(t)+1e-9;\n   var afterGood=CDQ_nativeValid(a)&&!/^o\\.l$/i.test(a)&&isFinite(ea)&&isFinite(t)&&Math.abs(ea)<=Math.abs(t)+1e-9;\n   var afterBad=/^o\\.l$/i.test(a)||entered(a)&&isFinite(ea)&&isFinite(t)&&Math.abs(ea)>Math.abs(t)+1e-9;\n   if(beforeBad&&!afterGood){bad=true;if(after)pending=true;}\n   if(afterBad)bad=true;\n   if(selected==='-'&&!beforeBad)continue;\n   needed++;if(CDQ_nativeValid(selected))count++;\n   var err=after?ea:eb;\n   if(entered(selected)&&(!isFinite(err)||!isFinite(t)))parameters=false;\n   if(multi&&!raw(name.replace(/_(?:avant|apres)_correction(?:_2)?$/,'_numero_tete')))parameters=false;\n   // Keep native capacity guards and exact (unrounded) comparisons.\n   var status=raw(name.replace(/_(?:avant|apres)_correction(?:_2)?$/,'_conforme'));\n   if(status==='Non conforme'&&(!after||entered(a)))bad=true;\n  }\n }else{\n  var partial=before.some(function(n){return /^B4_/.test(n);});\n  var c=number(raw('charge_excentricite')),e=number(raw('echelon')),t=number(raw('tolerance_excentricite'));\n  parameters=isFinite(c)&&isFinite(t)&&isFinite(e)&&e>0;\n  function phaseState(isAfter,requireAll){\n   var total=0,valid=0,lo=Infinity,hi=-Infinity,fail=false;\n   for(var i=0;i<before.length;i++){\n    var b=raw(before[i]),a=raw(paired(before[i])),v=isAfter?a:b;\n    if(partial&&!entered(b)&&!entered(a))continue;\n    if(v==='-'&&!requireAll)continue;\n    total++;var n=number(v);\n    if(/^o\\.l$/i.test(v))fail=true;\n    if(isFinite(n)){valid++;lo=Math.min(lo,n);hi=Math.max(hi,n);}\n   }\n   if(valid&&parameters&&(Math.max(0,hi-c)+Math.max(0,c-lo))/e>t+1e-9)fail=true;\n   return {needed:total,count:valid,bad:fail,complete:parameters&&total>0&&valid===total};\n  }\n  var bstate=phaseState(false,false),astate=phaseState(true,bstate.bad),selected=after?astate:bstate;\n  // After a failed series, every active point must be rechecked. Partial\n  // after data can neither erase the failure nor turn it into non-evaluable.\n  pending=after&&bstate.bad&&!astate.complete;\n  bad=selected.bad||pending;count=selected.count;needed=selected.needed;\n }\n return {complete:parameters&&needed>0&&count===needed,count:count,needed:needed,bad:bad,pending:pending,after:after,available:before.length>0};\n}\nfunction CDQ_effectiveNativeResultsV2823(d,values){\n var names=CDQ_nativeNames(d),facts=CDQ_problemFacts(CDQ_problemSelection(d)),corrected=facts.count>0&&!facts.unresolved.length;\n var central=CDQ_nativeGroup(d,names,corrected,false,values),ecc=CDQ_nativeGroup(d,names,corrected,true,values);\n var bad=facts.unresolved.length>0||central.bad||ecc.bad,complete=central.complete&&(!ecc.available||ecc.complete);\n function check(n,on){if(d.getField(n))values[n]=on?'Yes':'Off';}\n check('bloc3_statut_non_conforme',central.bad);check('bloc3_statut_conforme',!central.bad);\n check('excentricite_statut_non_conforme',ecc.bad);check('excentricite_statut_conforme',!ecc.bad);\n values.Statut_conformite=bad?'Non conforme':complete?'Conforme':'';\n check('Bouton_NonConforme',bad);check('Bouton_Conforme',!bad&&complete);\n return values;\n}\n";
const FLOOR_EFFECTIVE="    // CDQ conformity precedence V2823: a correction replaces one point only.\n    if(centralActive===\"apres\"){\n      var pendingCentral=false;\n      for(var row=0;row<6;row++)if(groups.central_avant.points[row]===\"red\"&&groups.central_apres.points[row]!==\"green\")pendingCentral=true;\n      if(pendingCentral){central.bad=true;central.state=\"red\";}\n    }\n    // A failed eccentricity series needs every active after point to pass.\n    if(eccActive===\"apres\"&&groups.ecc_avant.bad&&!ecc.complete){ecc.bad=true;ecc.state=\"red\";}\n";
export function transformConformitySourceV2823(source){
 if(source.includes('CDQ conformity precedence V2823'))return source;
 let next=source;
 if(source.includes('function CDQ_nativeGroup(')){
  const start=next.indexOf('function CDQ_nativeGroup('),end=next.indexOf('function CDQ_update(',start);
  if(end<0)throw Error('V34 hybrid group boundary absent');
  next=next.slice(0,start)+NATIVE_GROUP+'\n'+next.slice(end);
  const anchor='var central=CDQ_nativeGroup(d,names,corrected,false),ecc=CDQ_nativeGroup(d,names,corrected,true);';
  if(!next.includes(anchor))throw Error('V34 hybrid aggregate absent');
  next=next.replace(anchor,anchor+"\n  var effectiveV2823=CDQ_effectiveNativeResultsV2823(d,{});for(var keyV2823 in effectiveV2823){var fieldV2823=d.getField(keyV2823);if(fieldV2823&&String(fieldV2823.value)!==String(effectiveV2823[keyV2823]))fieldV2823.value=effectiveV2823[keyV2823];}");
  next=next.replace("if(g.bad)return (g.after?'après correction, ':'')+", "if(g.pending)return 'un ou plusieurs points non conformes avant correction restent à corriger.';if(g.bad)return (g.after?'après correction, ':'')+");
 }else if(source.includes('var central=groups["central_"+centralActive],ecc=groups["ecc_"+eccActive];')){
  const points='complete=true,bad=false,count=0,confirmed=0,invalidEntered=false,hasOverload=false,pendingOverload=false;';
  if(!next.includes(points))throw Error('V34 floor point loop absent');
  next=next.replace(points,points+'var pointStatesV2823=[];');
  next=next.replace('CDQ_measureStyle(d,name,state,blocked);','pointStatesV2823.push(state);CDQ_measureStyle(d,name,state,blocked);');
  next=next.replace('groups["central_"+phase]={complete:complete,','groups["central_"+phase]={points:pointStatesV2823,complete:complete,');
  const anchor='var central=groups["central_"+centralActive],ecc=groups["ecc_"+eccActive];';
  next=next.replace(anchor,anchor+'\n'+FLOOR_EFFECTIVE);
 }else if(source.includes('function measurementResultsV2736(d,original,cfg){')){
  next=next.replace('function measurementResultsV2736(d,original,cfg){',`// CDQ conformity precedence V2823\nfunction measurementResultsV2736(d,original,cfg){var out=measurementResultsOriginalV2823(d,original,cfg);return typeof CDQ_effectiveNativeResultsV2823==='function'?CDQ_effectiveNativeResultsV2823(d,out):out;}\nfunction measurementResultsOriginalV2823(d,original,cfg){`);
 }else if(source.includes('// CDQ two loads per head V2713')&&source.includes('function cdqResults(d){')){
  next=next.replace('function cdqResults(d){',`// CDQ conformity precedence V2823\nfunction cdqResults(d){var out=cdqOriginalResultsV2823(d);return typeof CDQ_effectiveNativeResultsV2823==='function'?CDQ_effectiveNativeResultsV2823(d,out):out;}\nfunction cdqOriginalResultsV2823(d){`);
 }
 return next;
}

// Change JavaScript actions only. Every field, appearance, image and page
// resource remains owned by the exact approved v28.22 document.
export function normalizeConformityV2823(pdf,L){
 const N=L.PDFName.of,seen=new Set();let changed=false;
 const read=j=>{if(!(j instanceof L.PDFRawStream))return j?.decodeText?.()||'';const b=L.decodePDFRawStream(j).decode();return b[0]===254&&b[1]===255?new TextDecoder('utf-16be').decode(b.subarray(2)):new TextDecoder().decode(b);};
 function visit(o){
  if(o instanceof L.PDFRef)o=pdf.context.lookup(o);
  if(!o||seen.has(o))return;seen.add(o);
  if(o instanceof L.PDFDict){
   if(o.get(N('S'))===N('JavaScript')){
    const source=read(o.lookup(N('JS'))),next=transformConformitySourceV2823(source);
    if(next!==source){o.set(N('JS'),L.PDFHexString.fromText(next));changed=true;}
   }
   for(const[,v]of o.entries())visit(v);
  }else if(o instanceof L.PDFArray)for(const v of o.asArray())visit(v);
  else if(o instanceof L.PDFStream)visit(o.dict);
 }
 for(const[,o]of pdf.context.enumerateIndirectObjects())visit(o);
 return changed;
}
