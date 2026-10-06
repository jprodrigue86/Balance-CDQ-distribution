// A preload changes the expected indication, never the used-load tolerance.
export function normalizeConstraintsV2697(pdf,L){
 const N=L.PDFName.of,form=pdf.getForm();
 if(!form.getFields().some(f=>/^charge_point_\d+_charge_contrainte$/.test(f.getName())))return false;
 let changed=false;const seen=new Set();
 const read=j=>j instanceof L.PDFRawStream?new TextDecoder().decode(L.decodePDFRawStream(j).decode()):j?.decodeText?.()||'';
 function visit(o){
  if(o instanceof L.PDFRef)o=pdf.context.lookup(o);if(!o||seen.has(o))return;seen.add(o);
  if(o instanceof L.PDFDict){
   if(o.get(N('S'))===N('JavaScript')){
    const source=read(o.lookup(N('JS')));let next=source;
    next=next.replace(/err\(num\(p\s*\+\s*"(avant_correction|apres_correction)"\),\s*c,\s*e\)/g,'err(num(p+"$1"),cdqExpectedV2697(p,c),e)');
    next=next.replace(/error\((before|after),\s*c,\s*e\)/g,'error($1,cdqExpectedV2697(p,c),e)');
    next=next.replace(/err\(num\("(charge_point_\d+_)(avant_correction|apres_correction)"\),num\("\1charge_utilisee"\),num\("echelon"\)\)/g,'err(num("$1$2"),cdqExpectedV2697("$1",num("$1charge_utilisee")),num("echelon"))');
    if(next!==source){
     if(!next.includes('function cdqExpectedV2697('))next=next.replace(/function raw\(n\)\s*\{/,'function cdqExpectedV2697(p,c){var s=raw(p+"charge_contrainte"),k=s===""||s==="-"?0:num(p+"charge_contrainte");return isFinite(c)&&c>=0&&isFinite(k)&&k>=0?c+k:NaN;}\n$&');
     if(!next.includes('function cdqExpectedV2697('))throw Error('Constraint calculation scope is missing');
     o.set(N('JS'),L.PDFHexString.fromText(next));changed=true;
    }
   }
   for(const[,v]of o.entries())visit(v);
  }else if(o instanceof L.PDFArray)for(const v of o.asArray())visit(v);
  else if(o instanceof L.PDFStream)visit(o.dict);
 }
 for(const[,o]of pdf.context.enumerateIndirectObjects())visit(o);
 if(changed){
  const action=pdf.catalog.lookup(N('OpenAction')),recalculate='try{this.calculateNow();}catch(cdqConstraintOpenError){}';
  if(action instanceof L.PDFDict&&action.get(N('S'))===N('JavaScript'))action.set(N('JS'),L.PDFHexString.fromText(read(action.lookup(N('JS')))+'\n'+recalculate));
  else{const a=pdf.context.obj({S:'JavaScript',JS:L.PDFHexString.fromText(recalculate)});if(action instanceof L.PDFDict)a.set(N('Next'),action);else if(action instanceof L.PDFArray)a.set(N('Next'),pdf.context.obj({S:'GoTo',D:action}));pdf.catalog.set(N('OpenAction'),a);}
  pdf.catalog.set(N('CDQConstraintsV2697'),pdf.context.obj(true));
 }
 return changed;
}
