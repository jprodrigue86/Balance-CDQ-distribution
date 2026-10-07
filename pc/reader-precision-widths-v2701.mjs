import {precisionEquipmentV2691} from './reader-precision-equipment-v2691.mjs';

// Redistribute only the first equipment row. The second row and every other
// field retain their approved geometry; the outer edges and 5pt gutters stay.
// V2702: the legal rectangle fits its 120.4056pt title; its 8.3pt gain
// goes entirely to Type de balance, with the same row endpoints.
export const precisionFirstRowWidthsV2701=[143.8,122.1,82.8,99.8,120.5];
export const precisionFirstRowLeftV2701=11.5,precisionFirstRowGapV2701=5;
export function normalizePrecisionWidthsV2701(pdf,L,bold){
 const N=L.PDFName.of,form=pdf.getForm();
 if(pdf.getPage(0).node.has(N('CDQReportLayoutV2704')))return false;
 if(!form.getFieldMaybe('type_plateau')||!form.getFieldMaybe('resolution')||!form.getFieldMaybe('charge_point_7_charge_utilisee')||form.getFieldMaybe('charge_point_8_charge_utilisee'))return false;
 const page=pdf.getPage(0),encoder=L.StandardFontEmbedder.for(L.StandardFonts.HelveticaBold),widths=bold.lookup(N('Widths'),L.PDFArray),fontRef=pdf.context.getObjectRef(bold)||pdf.context.register(bold);
 const width=(text,size)=>Array.from(encoder.encodeText(text).asBytes()).reduce((n,c)=>n+widths.lookup(c,L.PDFNumber).asNumber(),0)*size/1000;
 const moved=[];let x=precisionFirstRowLeftV2701;
 for(let col=0;col<5;col++){
  const field=form.getField(precisionEquipmentV2691[0][col]),target=precisionFirstRowWidthsV2701[col];
  for(const widget of field.acroField.getWidgets()){
   const old=widget.getRectangle();
   if(Math.abs(old.x-x)<.00001&&Math.abs(old.width-target)<.00001)continue;
   const next={...old,x,width:target};widget.setRectangle(next);moved.push({old,next});
   const options=field.acroField.getOptions?.()||[],text=field.getText?.()||field.getSelected?.().map(value=>options.find(o=>o.value.decodeText()===value)?.display?.decodeText()||value).join(' ')||'';
   const size=text?Math.min(10.36,(target-4)/Math.max(.001,width(text,1))):10.36;
   const source='q 0 0 '+target+' '+old.height+' re W n BT 0 Tc 0 Tw 100 Tz 0 Tr /CDQPrecisionWidth2701 '+size+' Tf 0 g '+((target-width(text,size))/2)+' '+((old.height-size*.718)/2)+' Td '+encoder.encodeText(text)+' Tj ET Q';
   widget.dict.set(N('AP'),pdf.context.obj({N:pdf.context.register(pdf.context.flateStream(source,{Type:'XObject',Subtype:'Form',BBox:[0,0,target,old.height],Resources:{Font:{CDQPrecisionWidth2701:fontRef}}}))}));
  }
  x+=target+precisionFirstRowGapV2701;
 }
 if(!moved.length)return false;
 const backingRef=page.node.get(N('CDQPrecisionBackgroundV2670')),backing=backingRef&&pdf.context.lookup(backingRef);
 if(!(backing instanceof L.PDFRawStream))throw Error('Precision cyan backing is missing');
 const oldSource=new TextDecoder().decode(L.decodePDFRawStream(backing).decode());
 const source=oldSource.replace(/(-?[\d.]+)\s+(-?[\d.]+)\s+([\d.]+)\s+([\d.]+)\s+re\s+B\b/g,(operation,...args)=>{
  const values=args.slice(0,4).map(Number),match=moved.find(({old})=>[old.x,old.y,old.width,old.height].every((n,i)=>Math.abs(n-values[i])<.00001));
  return match?[match.next.x,match.next.y,match.next.width,match.next.height].join(' ')+' re B':operation;
 });
 const stream=pdf.context.flateStream(source);for(const[k,v]of backing.dict.entries())if(!['/Length','/Filter','/DecodeParms'].includes(String(k)))stream.dict.set(k,v);pdf.context.assign(backingRef,stream);
 return true;
}
