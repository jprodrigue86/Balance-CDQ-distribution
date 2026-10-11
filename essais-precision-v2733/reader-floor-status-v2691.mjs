// A constant offset at every corner must still fail against the applied load.
// Keep the floor's tolerance formula and its complete-after-series rule.
export function normalizeFloorStatusV2691(pdf,L){
 const N=L.PDFName.of,form=pdf.getForm(),type=form.getFieldMaybe('type_balance');
 const label=type?.getText?.()||type?.getSelected?.().join(' ')||'';
 const legacyFloor=!type&&form.getFieldMaybe('_visuel_type_balance')&&form.getFieldMaybe('base_balance_fabricant')&&!form.getFieldMaybe('resolution');
 if((!/plancher/i.test(label)&&!legacyFloor)||!form.getFieldMaybe('charge_excentricite'))return false;
 let changed=false;const seen=new Set();
 function visit(o){
  if(o instanceof L.PDFRef)o=pdf.context.lookup(o);
  if(!o||seen.has(o))return;seen.add(o);
  if(o instanceof L.PDFDict){
   if(o.get(N('S'))===N('JavaScript')){
    const j=o.lookup(N('JS')),source=j instanceof L.PDFRawStream?new TextDecoder().decode(L.decodePDFRawStream(j).decode()):j?.decodeText?.()||'';
    if(source.includes('var good3=started>0')&&source.includes('(before.max-before.min)/e')){
     const next=source.replace('var usable4=isFinite(t4)&&isFinite(e)&&e>0;',
      'var charge4=num("charge_excentricite");\nvar usable4=isFinite(t4)&&isFinite(e)&&e>0&&isFinite(charge4);\n// CDQ floor absolute corner errors V2691\nfunction worst4(g){return Math.max(Math.abs(g.min-charge4),Math.abs(g.max-charge4))/e;}')
      .replace('(after.max-after.min)/e<=t4+1e-9','worst4(after)<=t4+1e-9')
      .replace('(before.max-before.min)/e<=t4+1e-9','worst4(before)<=t4+1e-9')
      .replace('// The tolerance rule remains the same: (maximum - minimum) / e.','// Evaluate each corner against the applied load, with the existing tolerance.');
     if(next===source||next.includes('(before.max-before.min)/e'))throw Error('Floor status V2691 anchor differs');
     o.set(N('JS'),L.PDFHexString.fromText(next));changed=true;
    }
    if(legacyFloor&&source.includes('function cdqResults(d)')&&source.includes('a.max - a.min <= limit')){
     const pattern=/var g4 = false, r4 = false, limit = t4 \* e;[\s\S]*?(?=  check\("excentricite_statut_conforme", g4\);)/;
     const next=source.replace(pattern,'var g4 = false, r4 = false, limit = t4 * e;\n  // CDQ floor absolute corner errors V2691\n  var active = a.any ? a : b;\n  if(active.any){\n    if(active.complete && isFinite(limit) && isFinite(c4) && e > 0){\n      g4 = Math.max(Math.abs(active.min-c4),Math.abs(active.max-c4)) <= limit + eps * Math.max(1,Math.abs(limit));\n      r4 = !g4;\n    }else{r4=true;}\n  }\n');
     if(next===source||next.includes('a.max - a.min <= limit'))throw Error('Legacy floor status V2691 anchor differs');
     o.set(N('JS'),L.PDFHexString.fromText(next));changed=true;
    }
   }
   for(const[,v]of o.entries())visit(v);
  }else if(o instanceof L.PDFArray)for(const v of o.asArray())visit(v);
  else if(o instanceof L.PDFStream)visit(o.dict);
 }
 for(const[,o]of pdf.context.enumerateIndirectObjects())visit(o);
 // Re-evaluate saved readings on opening, before the technician edits a field.
 // The existing opening action only controls the screen tint.
 if(String(pdf.catalog.get(N('CDQFloorStatusV2691')))!=='true'){
  const action=pdf.catalog.lookupMaybe(N('OpenAction'),L.PDFDict);
  const recalculate='try{this.calculateNow();}catch(cdqFloorOpenError){}';
  if(action?.get(N('S'))===N('JavaScript')){
   const j=action.lookup(N('JS')),source=j instanceof L.PDFRawStream?new TextDecoder().decode(L.decodePDFRawStream(j).decode()):j?.decodeText?.()||'';
   action.set(N('JS'),L.PDFHexString.fromText(source+'\n'+recalculate));
  }else{
   const next=pdf.context.obj({S:'JavaScript',JS:L.PDFHexString.fromText(recalculate)});
   if(action)next.set(N('Next'),action);
   pdf.catalog.set(N('OpenAction'),next);
  }
  pdf.catalog.set(N('CDQFloorStatusV2691'),pdf.context.obj(true));changed=true;
 }
 return changed;
}
