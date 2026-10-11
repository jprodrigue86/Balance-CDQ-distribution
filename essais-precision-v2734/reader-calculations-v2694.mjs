import {normalizeFloorStatusV2691} from './reader-floor-status-v2691.mjs';
import {normalizeConstraintsV2697} from './reader-constraints-v2697.mjs';

// Include the applied load in the range: equal offsets cannot cancel, and
// opposite offsets add. Preserve each report's tolerance and active positions.
export function normalizeCalculationsV2694(pdf,L,key=''){
 const N=L.PDFName.of,form=pdf.getForm(),type=form.getFieldMaybe('type_balance');
 const label=type?.getText?.()||type?.getSelected?.().join(' ')||'';
 const family=key||pdf.catalog.get(N('CDQReportRepairV2676'))?.decodeText?.()||'';
 const tremie=/tr[eé]mie/i.test(label+' '+family);
 const eccentric=!!form.getFieldMaybe('charge_excentricite');
 if(!eccentric&&!tremie)return false;
 let changed=normalizeFloorStatusV2691(pdf,L),calculationsChanged=false;const seen=new Set();
 const read=j=>j instanceof L.PDFRawStream?new TextDecoder().decode(L.decodePDFRawStream(j).decode()):j?.decodeText?.()||'';
 function visit(o){
  if(o instanceof L.PDFRef)o=pdf.context.lookup(o);
  if(!o||seen.has(o))return;seen.add(o);
  if(o instanceof L.PDFDict){
   if(o.get(N('S'))===N('JavaScript')){
    const source=read(o.lookup(N('JS')));let next=source;
    if(eccentric&&source.includes('charge_excentricite')&&!/"kind"\s*:\s*"none"/.test(source)){
     const reference=source.includes('var charge4=')&&!/var c4\s*=/.test(source)?'charge4':'c4';
     next=next.replace(/\b(g|a|b|active)\.max\s*-\s*\1\.min/g,(_,g)=>'(Math.max(0,'+g+'.max-'+reference+')+Math.max(0,'+reference+'-'+g+'.min))');
     next=next.replace(/Math\.max\(Math\.abs\(g\.min-c4\),Math\.abs\(g\.max-c4\)\)/g,'(Math.max(0,g.max-c4)+Math.max(0,c4-g.min))');
     next=next.replace(/Math\.max\(Math\.abs\(g\.min-charge4\),Math\.abs\(g\.max-charge4\)\)/g,'(Math.max(0,g.max-charge4)+Math.max(0,charge4-g.min))');
     // V2691's original embedded floor uses a spaced expression.
     next=next.replace(/Math\.max\(Math\.abs\(active\.min\s*-\s*c4\),\s*Math\.abs\(active\.max\s*-\s*c4\)\)/g,'(Math.max(0,active.max-c4)+Math.max(0,c4-active.min))');
    }
    if(tremie&&source.includes('function cdqResults(d)')){
     const before=next;
     next=next.replace(/err\(num\(p\s*\+\s*"(avant_correction|apres_correction)"\),\s*c,\s*e\)/g,'err(num(p+"$1"),cdqExpectedV2694(p,c),e)');
     next=next.replace(/error\((before|after),\s*c,\s*e\)/g,'error($1,cdqExpectedV2694(p,c),e)');
     if(next!==before)next=next.replace(/function cdqResults\(d\)\s*\{/g,'$&\n  function cdqExpectedV2694(p,c){var s=raw(p+"charge_contrainte"),k=s===""||s==="-"?0:num(p+"charge_contrainte");return isFinite(c)&&isFinite(k)&&k>=0?c+k:NaN;}');
    }
    if(next!==source){
     if(!next.includes('// CDQ anchored calculations V2694'))next='// CDQ anchored calculations V2694\n'+next;
     o.set(N('JS'),L.PDFHexString.fromText(next));changed=calculationsChanged=true;
    }
   }
   for(const[,v]of o.entries())visit(v);
  }else if(o instanceof L.PDFArray)for(const v of o.asArray())visit(v);
  else if(o instanceof L.PDFStream)visit(o.dict);
 }
 for(const[,o]of pdf.context.enumerateIndirectObjects())visit(o);
 if(calculationsChanged&&String(pdf.catalog.get(N('CDQCalculationsV2694')))!=='true'){
  const action=pdf.catalog.lookup(N('OpenAction')),recalculate='try{this.calculateNow();}catch(cdqCalculationsOpenError){}';
  if(action instanceof L.PDFDict&&action.get(N('S'))===N('JavaScript'))action.set(N('JS'),L.PDFHexString.fromText(read(action.lookup(N('JS')))+'\n'+recalculate));
  else{const next=pdf.context.obj({S:'JavaScript',JS:L.PDFHexString.fromText(recalculate)});if(action instanceof L.PDFDict)next.set(N('Next'),action);else if(action instanceof L.PDFArray)next.set(N('Next'),pdf.context.obj({S:'GoTo',D:action}));pdf.catalog.set(N('OpenAction'),next);}
  pdf.catalog.set(N('CDQCalculationsV2694'),pdf.context.obj(true));
 }
 return normalizeConstraintsV2697(pdf,L)||changed;
}
