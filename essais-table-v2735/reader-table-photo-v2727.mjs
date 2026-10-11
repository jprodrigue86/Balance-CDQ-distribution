import {floorArrowPresentationV2695} from './reader-report-presentation-v2695.mjs';

// Tips sit just inside the four visible stainless-platform corners. The second
// phase uses identical geometry translated 300 points horizontally.
export const tablePhotoCornerTargetsV2727=Object.freeze([
 Object.freeze([150,226]),Object.freeze([201,218]),
 Object.freeze([123,212]),Object.freeze([187,202]),
]);
export const tablePhotoAssetV2727='assets/report-art-v2727/table-ohaus-off.png';
let cachedImage;
async function imageData(supplied){
 if(supplied)return supplied;
 if(!cachedImage)cachedImage=fetch(new URL('./'+tablePhotoAssetV2727,import.meta.url)).then(async r=>{
  if(!r.ok)throw Error('Photographie de la balance de table indisponible.');
  return new Uint8Array(await r.arrayBuffer());
 }).catch(e=>{cachedImage=undefined;throw e;});
 return cachedImage;
}

// Replace existing photograph resources and existing vector paths, without
// page overlays. All live values, widgets, actions and other artwork survive.
export async function normalizeTablePhotoV2727(pdf,L,{key='',imageBytes}={}){
 const N=L.PDFName.of,marker=N('CDQTablePhotoV2727'),form=pdf.getForm();
 const f=form.getFieldMaybe('type_balance');
 const label=f?.getSelected?.().join(' ')||f?.getText?.()||'';
 if((key||(/\btable\b/i.test(label)?'table':''))!=='table')return false;
 if(pdf.catalog.has(marker)||!form.getFieldMaybe('_cdq_points_diagram_4'))return false;
 const forms=pdf.context.enumerateIndirectObjects().filter(([,o])=>o instanceof L.PDFRawStream&&o.dict.get(N('Subtype'))===N('Form'));
 const decode=o=>Array.from(L.decodePDFRawStream(o).decode(),b=>String.fromCharCode(b)).join('');
 // Fail before modifying a report if its expected native artwork is absent.
 const photos=forms.filter(([,o])=>/\/TableOff2713\s+Do\b/.test(decode(o)));
 const diagrams=forms.filter(([,o])=>{const s=decode(o);return s.includes('% CDQ table geometry V2716')&&s.includes('% CDQ floor arrow V2689');});
 const totalArrows=diagrams.reduce((n,[,o])=>n+(decode(o).match(/% CDQ floor arrow V2689/g)||[]).length,0);
 if(photos.length!==1||totalArrows!==8)throw Error('Table V2727: expected one shared photograph and eight arrows, found '+photos.length+'/'+totalArrows);
 const image=await pdf.embedPng(await imageData(imageBytes));
 photos[0][1].dict.lookup(N('Resources'),L.PDFDict).lookup(N('XObject'),L.PDFDict).set(N('TableOff2713'),image.ref);
 for(const[ref,o]of diagrams){
  let local=0;
  const next=decode(o).replace(/% CDQ floor arrow V2689\s*q\s+([^qQ]+?)\s+Q/g,(_,body)=>{
   const start=body.match(/([-\d.]+)\s+([-\d.]+)\s+m/);
   if(!start)throw Error('Table V2727: missing existing arrow origin');
   const dx=Math.floor(local/4)*300,[tx,ty]=tablePhotoCornerTargetsV2727[local%4];local++;
   return floorArrowPresentationV2695(Number(start[1]),Number(start[2]),tx+dx,ty,{left:Number(start[1])-dx<157});
  });
  const replacement=pdf.context.flateStream(Uint8Array.from(next,c=>c.charCodeAt(0)));
  for(const[k,v]of o.dict.entries())if(!['/Length','/Filter','/DecodeParms'].includes(String(k)))replacement.dict.set(k,v);
  pdf.context.assign(ref,replacement);
 }
 pdf.catalog.set(marker,L.PDFNumber.of(2727));return true;
}
