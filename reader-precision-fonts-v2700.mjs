import {precisionEquipmentV2691} from './reader-precision-equipment-v2691.mjs';

// Use the master's embedded sans-serif throughout Precision. Standard Helvetica
// was substituted differently by Android and external readers. Keep encodings,
// answers, actions, pictures and widget geometry intact.
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
  if(o instanceof L.PDFRawStream){if(o.dict.get(N('Subtype'))!==N('Image'))visit(o.dict);return;}
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
 const page=pdf.getPage(0),marker=N('CDQPrecisionFontsV2700');
 if(page.node.has(marker))return changed;
 const encoder=L.StandardFontEmbedder.for(L.StandardFonts.HelveticaBold),widths=bold.lookup(N('Widths'),L.PDFArray),size=precisionCaptionSizeV2700;
 const width=text=>Array.from(encoder.encodeText(text).asBytes()).reduce((n,c)=>n+widths.lookup(c,L.PDFNumber).asNumber(),0)*size/1000;
 const wrap=(text,max)=>{
  const lines=[];let line='';
  for(const word of text.split(' ')){const next=line?line+' '+word:word;if(line&&width(next)>max){lines.push(line);line=word;}else line=next;}
  if(line)lines.push(line);return lines;
 };
 const fontRef=pdf.context.getObjectRef(bold)||pdf.context.register(bold);
 page.node.normalize();const resources=page.node.Resources(),fonts=resources.lookupMaybe(N('Font'),L.PDFDict)||pdf.context.obj({});fonts.set(N('CDQPrecisionCaption2700'),fontRef);resources.set(N('Font'),fonts);
 let art='% CDQ precision embedded typography V2700\n';
 for(let row=0;row<2;row++)for(let col=0;col<5;col++){
  const r=form.getField(precisionEquipmentV2691[row][col]).acroField.getWidgets()[0].getRectangle(),lines=wrap(precisionCaptionsV2700[row][col],r.width+1);
  if(lines.length>2)throw Error('Precision caption does not fit its reserved heading area');
  // Repaint only the old caption ink, between the existing input rectangles.
  art+='q 1 1 1 rg '+[r.x-.2,r.y+r.height+.6,r.width+.4,12.6].join(' ')+' re f Q\n';
  lines.forEach((line,i)=>{
   const x=r.x+(r.width-width(line))/2,y=r.y+r.height+(lines.length===1?3:1+(lines.length-1-i)*6.5);
   art+='q .114 .059 .871 rg BT 0 Tc 0 Tw 100 Tz 0 Tr /CDQPrecisionCaption2700 '+size+' Tf '+x+' '+y+' Td '+encoder.encodeText(line)+' Tj ET Q\n';
  });
 }
 const ref=pdf.context.register(pdf.context.flateStream(art));page.node.addContentStream(ref);page.node.set(marker,ref);
 return true;
}
