import {normalizeReportFramesV2725} from './reader-report-frame-micro-v2725.mjs';

// Only the reported remnants and demonstrably uneven cyan outlines may change.
// Do not edit AcroForm, widget/AP dictionaries, actions, photographs or geometry.
const number=n=>+n.toFixed(6),N=(L,s)=>L.PDFName.of(s);
const read=(o,L)=>Array.from(L.decodePDFRawStream(o).decode(),c=>String.fromCharCode(c)).join('');
function replace(pdf,L,ref,old,source){
 const next=pdf.context.flateStream(Uint8Array.from(source,c=>c.charCodeAt(0)));
 for(const[k,v]of old.dict.entries())if(!['/Length','/Filter','/DecodeParms'].includes(String(k)))next.dict.set(k,v);
 pdf.context.assign(ref,next);
}
const edgeFamilies=new Set(['plancher','precision','cuve3','cuve4','tremie3','tremie4','table','trackscale']);
const summaryFamilies=new Set(['precision','cuve3','cuve4','tremie3','tremie4']);
const afterFamilies=new Set(['precision','camion','train','chariot','convoyeur','cuve3','cuve4','tremie3','tremie4','table','trackscale','suspendue']);
const rectPattern=/([-\d.e]+)\s+([-\d.e]+)\s+([-\d.e]+)\s+([-\d.e]+)\s+re\s+B\b/g;
const close=(a,b)=>Math.abs(a-b)<.001;
function family(pdf,key){
 if(key)return key;
 const field=pdf.getForm().getFieldMaybe('type_balance'),v=field?.getText?.()||field?.getSelected?.().join(' ')||'';
 return /multi/i.test(v)?'multitete':/suspendue/i.test(v)?'suspendue':/track/i.test(v)?'trackscale':/train/i.test(v)?'train':/camion/i.test(v)?'camion':/chariot/i.test(v)?'chariot':/convoyeur/i.test(v)?'convoyeur':/table/i.test(v)?'table':/pr[eé]cision/i.test(v)?'precision':/cuve/i.test(v)?'cuve4':/tr[eé]mie/i.test(v)?'tremie4':'plancher';
}

export async function normalizeReportMicroV2725(pdf,L,{key=''}={}){
 const page=pdf.getPage(0),form=pdf.getForm();
 if(!page.node.has(N(L,'CDQReportTypographyV2719'))||!page.node.has(N(L,'CDQReportMicroV2716'))||!form.getFieldMaybe('client_nom'))return false;
 key=family(pdf,key);
 const contents=page.node.Contents();if(!(contents instanceof L.PDFArray))return false;
 let changed=await normalizeReportFramesV2725(pdf,L,{key});
 const boxes=['charge_excentricite','tolerance_excentricite'].map(n=>form.getFieldMaybe(n)?.acroField.getWidgets()[0]).filter(w=>w&&!(w.getFlags()&(2|32))).map(w=>w.getRectangle());
 const refs=[...new Map(contents.asArray().map(ref=>[String(ref),ref])).values()];
 for(const ref of refs){
  const old=pdf.context.lookup(ref);if(!(old instanceof L.PDFRawStream))continue;
  const source=read(old,L);let next=source;
  // The old uppercase summary is completely masked except for an accent
  // exposed by the reserved square around badge 5. Remove that retired text.
  if(summaryFamilies.has(key))next=next.replaceAll('(R\\311SUM\\311 \\057 COMMENTAIRES) Tj','() Tj');
  // V2719 owns the visible two-line heading. The earlier 8.4 pt copy protrudes
  // above its blue mask; retire just that copy, retaining the current title.
  if(afterFamilies.has(key)&&source.startsWith('% CDQ centered report captions V2713'))next=next.replace(/q 1 1 1 rg BT 0 Tc 0 Tw 100 Tz \/CDQ2719Caption 8\.4 Tf [-\d.e]+ [-\d.e]+ Td <417072E873> Tj ET Q\n/gi,'');
  if((key==='camion'||key==='train')&&!source.startsWith('% CDQ')){
   // Their saved AP already paints a complete 0.6 pt outline. An older page
   // rectangle is displaced by tiny fractions; remove only its duplicate.
   next=next.replace(rectPattern,(match,x,y,w,h)=>boxes.some(r=>close(+x,r.x)&&close(+y,r.y)&&close(+w,r.width)&&close(+h,r.height))?'':match);
  }else if(key==='precision'&&source.startsWith('% CDQ precision single cells V2673')){
   next=next.replace(rectPattern,(match,x,y,w,h,offset,whole)=>boxes.some(r=>close(+x,r.x)&&close(+y,r.y)&&close(+w,r.width)&&close(+h,r.height))&&!whole.slice(0,offset).endsWith('q .6 w ')?'q .6 w '+match+' Q':match);
  }else if(key==='plancher'&&!source.startsWith('% CDQ')){
   next=next.replace(rectPattern,(match,x,y,w,h)=>{
    const r=boxes.find(r=>close(+x,r.x-.5)&&close(+y,r.y-.5)&&close(+w,r.width+1)&&close(+h,r.height+1));
    return r?'q .6 w '+[r.x,r.y,r.width,r.height].map(number).join(' ')+' re B Q':match;
   });
  }
  if(edgeFamilies.has(key)&&source.startsWith('% CDQ report typography V2719')){
   next=next.replace(/q 1 1 1 rg ([-\d.e]+) ([-\d.e]+) ([-\d.e]+) ([-\d.e]+) re f Q/g,(match,x,y,w,h)=>{
    const r=boxes.find(r=>+x<=r.x&&+x + +w>=r.x+r.width&&+y>=r.y+r.height+.09&&+y<r.y+r.height+.3-.000001);
    if(!r)return match;const bottom=number(r.y+r.height+.3),top=+y + +h;
    return `q 1 1 1 rg ${x} ${bottom} ${w} ${number(top-bottom)} re f Q`;
   });
  }
  if(next!==source){replace(pdf,L,ref,old,next);changed=true;}
 }
 if(key==='precision'){
  // The retired AM heading's right stroke lies 0.203 pt outside the white
  // replacement mask. Its current, approved header ends at x=599.7.
  const resources=page.node.Resources(),objects=resources.lookupMaybe(N(L,'XObject'),L.PDFDict),ref=objects?.get(N(L,'CDQHeaderFinal')),old=ref&&pdf.context.lookup(ref);
  if(old instanceof L.PDFRawStream){const source=read(old,L),next=source.replace('495.481400 560 105.421600 16 re B','495.481400 560 104.218600 16 re B');if(next!==source){replace(pdf,L,ref,old,next);changed=true;}}
 }
 // Do not use the marker as a skip: older appearance repair can recreate an
 // original background on save. Re-check the exact anchors, idempotently.
 if(changed)page.node.set(N(L,'CDQReportMicroV2725'),pdf.context.obj({Revision:1,Family:L.PDFHexString.fromText(key)}));
 return changed;
}
