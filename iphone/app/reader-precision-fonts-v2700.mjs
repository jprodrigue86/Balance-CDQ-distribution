import {precisionEquipmentV2691} from './reader-precision-equipment-v2691.mjs';
import {normalizePrecisionWidthsV2701} from './reader-precision-widths-v2701.mjs';
import {clearWidgetFrameV2702} from './reader-truck-equipment-v2702.mjs';

// Use the master's embedded sans-serif throughout Precision. Standard Helvetica
// was substituted differently by Android and external readers. Keep encodings,
// answers, actions and pictures intact. V2701 redistributes the first row so
// every equipment caption fits on one line at the same embedded font size.
export const precisionCaptionSizeV2700=8.4;
export const precisionCaptionsV2700=[
 ['IDENTIFICATION DE LA BALANCE','TYPE DE BALANCE','TYPE DE PLATEAU','ÉTENDUE VÉRIFIÉE','LÉGAL POUR LE COMMERCE'],
 ['CAPACITÉ MAXIMALE (Max)','UNITÉ DE MESURE','ÉCHELON (e)','RÉSOLUTION (d)','ÉTALON UTILISÉ']
];
export async function normalizePrecisionFontsV2700(pdf,L){
 const N=L.PDFName.of,form=pdf.getForm();
 if(!form.getFieldMaybe('type_plateau')||!form.getFieldMaybe('resolution')||!form.getFieldMaybe('charge_point_7_charge_utilisee')||form.getFieldMaybe('charge_point_8_charge_utilisee'))return false;
 // Materialize fonts requested by earlier appearance helpers before repairing
 // their live resources. Otherwise pdf-lib can overwrite a repair while saving.
 await pdf.flush();
 const live=[],seen=new Set();
 const visit=value=>{
  const o=pdf.context.lookup(value);if(!o||seen.has(o))return;seen.add(o);
  if(o instanceof L.PDFRawStream||o?.getUnencodedContents){if(o.dict.get(N('Subtype'))!==N('Image'))visit(o.dict);return;}
  if(o instanceof L.PDFDict){
   if(o.get(N('Type'))===N('Font')){live.push(o);return;}
   for(const[,v]of o.entries())visit(v);
  }else if(o instanceof L.PDFArray)for(const v of o.asArray())visit(v);
 };
 visit(pdf.catalog);
 const embedded=weight=>live.find(o=>String(o.get(N('BaseFont')))==='/NimbusSans-'+weight&&String(o.get(N('Encoding')))==='/WinAnsiEncoding'&&o.lookupMaybe(N('LastChar'),L.PDFNumber)?.asNumber()===255&&o.lookupMaybe(N('FontDescriptor'),L.PDFDict)?.has(N('FontFile')));
 const bold=embedded('Bold'),regular=embedded('Regular');
 if(!bold||!regular)throw Error('Precision embedded sans-serif fonts are missing');
 let changed=false;
 for(const o of live){
  const base=String(o.get(N('BaseFont'))),replacement=base==='/Helvetica-Bold'?bold:base==='/Helvetica'?regular:null;
  if(!replacement||String(o.get(N('Encoding')))!=='/WinAnsiEncoding'||o.has(N('FontDescriptor')))continue;
  for(const[k]of [...o.entries()])o.delete(k);
  for(const[k,v]of replacement.entries())o.set(k,v);
  changed=true;
 }
 changed=normalizePrecisionWidthsV2701(pdf,L,bold)||changed;
 // The fixed Type field can receive its own cyan appearance from an external
 // reader. All ten cells use only the common page backing, even after saving.
 for(const name of precisionEquipmentV2691.flat())for(const w of form.getField(name).acroField.getWidgets())changed=clearWidgetFrameV2702(pdf,L,w)||changed;
 const page=pdf.getPage(0),marker=N('CDQPrecisionFontsV2702'),backing=page.node.get(N('CDQPrecisionBackgroundV2670'));
 for(const name of ['CDQPrecisionFontsV2700','CDQPrecisionFontsV2701']){
  const oldMarker=N(name),oldCaption=page.node.get(oldMarker);
  if(oldCaption){const contents=page.node.Contents();for(let i=contents.size()-1;i>=0;i--)if(String(contents.get(i))===String(oldCaption))contents.remove(i);page.node.delete(oldMarker);changed=true;}
 }
 const lastBacking=()=>{const contents=page.node.Contents(),i=contents.asArray().findIndex(r=>String(r)===String(backing));if(i>=0&&i<contents.size()-1){contents.remove(i);contents.push(backing);changed=true;}};
 if(page.node.has(marker)){lastBacking();return changed;}
 const encoder=L.StandardFontEmbedder.for(L.StandardFonts.HelveticaBold),widths=bold.lookup(N('Widths'),L.PDFArray),size=precisionCaptionSizeV2700;
 const width=text=>Array.from(encoder.encodeText(text).asBytes()).reduce((n,c)=>n+widths.lookup(c,L.PDFNumber).asNumber(),0)*size/1000;
 const fontRef=pdf.context.getObjectRef(bold)||pdf.context.register(bold);
 page.node.normalize();const resources=page.node.Resources(),fonts=resources.lookupMaybe(N('Font'),L.PDFDict)||pdf.context.obj({});fonts.set(N('CDQPrecisionCaption2700'),fontRef);resources.set(N('Font'),fonts);
 const top=form.getField(precisionEquipmentV2691[0][0]).acroField.getWidgets()[0].getRectangle(),bottom=form.getField(precisionEquipmentV2691[1][0]).acroField.getWidgets()[0].getRectangle();
 // Clear the complete former first row, including its two-line captions and
 // old borders. The authoritative cyan backing is then painted above this mask.
 let art='% CDQ precision embedded typography V2702\nq 1 1 1 rg 10.5 '+(top.y-.5)+' 591 '+(523.5-(top.y-.5))+' re f Q\n';
 art+='q 1 1 1 rg 10.5 '+(bottom.y+bottom.height+.6)+' 591 12.6 re f Q\n';
 for(let row=0;row<2;row++)for(let col=0;col<5;col++){
  const r=form.getField(precisionEquipmentV2691[row][col]).acroField.getWidgets()[0].getRectangle(),label=precisionCaptionsV2700[row][col];
  if(width(label)>r.width+1)throw Error('Precision single-line caption does not fit its rectangle');
  const x=r.x+(r.width-width(label))/2,y=r.y+r.height+3;
  art+='q .114 .059 .871 rg BT 0 Tc 0 Tw 100 Tz 0 Tr /CDQPrecisionCaption2700 '+size+' Tf '+x+' '+y+' Td '+encoder.encodeText(label)+' Tj ET Q\n';
 }
 const ref=pdf.context.register(pdf.context.flateStream(art));page.node.addContentStream(ref);page.node.set(marker,ref);
 lastBacking();
 return true;
}
