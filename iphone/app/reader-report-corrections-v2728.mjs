import {normalizeFloorMicroV2727} from './reader-floor-micro-v2727.mjs';
import {normalizeTablePhotoV2727} from './reader-table-photo-v2727.mjs';
const imageHash='2ecad1970ba277427fd9c015c32fa5a35705cc81d20db66bc3615813aacaa74d';
let truckSource;
export async function normalizeTruckDoorV2728(pdf,L,{sourceBytes}={}){
 const N=L.PDFName.of,form=pdf.getForm();if(!form.getFieldMaybe('B4_Aller_P6_AvantCorrection')||!form.getFieldMaybe('B4_Retour_P6_ApresCorrection'))return false;
 const decode=o=>new TextDecoder().decode(L.decodePDFRawStream(o).decode());
 const targets=pdf.context.enumerateIndirectObjects().filter(([,o])=>o instanceof L.PDFRawStream&&o.dict.get(N('Subtype'))===N('Form')&&decode(o).includes('/Camion95 Do'));
 if(!targets.length)return false;if(targets.length!==1)throw Error('Photographie du camion inattendue.');
 const container=targets[0][1],source=decode(container),doorRef=container.dict.lookup(N('Resources'),L.PDFDict).lookup(N('XObject'),L.PDFDict).get(N('CDQDoor2704'));
 if(!doorRef)return false;const door=pdf.context.lookup(doorRef,L.PDFRawStream);if(door.dict.has(N('CDQOriginalDoorPhotoV2727')))return false;
 if(source.trim()!=='q 0 0 1 1 re W n 1 0 0 2.843137254901961 0 -0.9019607843137255 cm /Camion95 Do Q\n% CDQ door logo restored V2704\nq 0.0006111111111111111 0 0 0.004083333333333334 .3877 .4634 cm /CDQDoor2704 Do Q'||!decode(door).includes('(CDQ) Tj'))throw Error('Placement du logo du camion inattendu.');
 if(!sourceBytes){truckSource??=fetch(new URL('./assets/report-art-v2727/truck-original-photo.pdf',import.meta.url)).then(async r=>{if(!r.ok)throw Error('Photographie originale du camion indisponible.');return new Uint8Array(await r.arrayBuffer());}).catch(e=>{truckSource=undefined;throw e;});sourceBytes=await truckSource;}
 const original=await L.PDFDocument.load(sourceBytes,{updateMetadata:false}),image=original.catalog.lookup(N('CDQOriginalTruckPhotoV2728'),L.PDFRawStream);
 const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',image.getContents())),b=>b.toString(16).padStart(2,'0')).join('');
 if(hash!==imageHash||image.dict.lookup(N('Width'),L.PDFNumber).asNumber()!==1567||image.dict.lookup(N('Height'),L.PDFNumber).asNumber()!==162)throw Error('Photographie originale du camion non reconnue.');
 const copy=L.PDFObjectCopier.for(original.context,pdf.context).copy(image);copy.dict.set(N('Mask'),pdf.context.obj([190,255,190,255,190,255]));const ref=pdf.context.register(copy);
 const sx=36/27,sy=24/19,paint='q 0 0 36 24 re W n '+(1567*sx)+' 0 0 '+(162*sy)+' '+(-609*sx)+' '+(-(162-65-19)*sy)+' cm /OriginalTruckPhoto2727 Do Q\n';
 pdf.context.assign(doorRef,pdf.context.flateStream(paint,{Type:'XObject',Subtype:'Form',BBox:[0,0,36,24],Resources:{XObject:{OriginalTruckPhoto2727:ref}},CDQOriginalDoorPhotoV2727:true}));return true;
}
export async function normalizeReportCorrectionsV2728(pdf,L,options={}){return (await normalizeFloorMicroV2727(pdf,L,options))|(await normalizeTablePhotoV2727(pdf,L,options))|(await normalizeTruckDoorV2728(pdf,L,options));}
