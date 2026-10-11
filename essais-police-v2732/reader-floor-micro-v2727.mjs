// Plancher only: redistribute the five 4 pt gaps into the six test rows.
// The table envelope, columns, headings, other sections and all field actions
// remain unchanged. Rewrite the owning page stream rather than overlaying it.
const round=n=>+n.toFixed(6);
const near=(a,b)=>Math.abs(a-b)<.00001;
const decode=(o,L)=>Array.from(o instanceof L.PDFRawStream?L.decodePDFRawStream(o).decode():o.getUnencodedContents(),c=>String.fromCharCode(c)).join('');
function stream(pdf,L,source,old,extra={}){
 const next=pdf.context.flateStream(Uint8Array.from(source,c=>c.charCodeAt(0)));
 for(const[k,v]of old.dict.entries())if(!['/Length','/Filter','/DecodeParms',...Object.keys(extra).map(k=>'/'+k)].includes(String(k)))next.dict.set(k,v);
 for(const[k,v]of Object.entries(extra))next.dict.set(L.PDFName.of(k),pdf.context.obj(v));
 return next;
}
function resizeAppearance(pdf,L,widget,oldRect,nextRect){
 const N=L.PDFName.of,ap=widget.dict.lookupMaybe(N('AP'),L.PDFDict);
 if(!ap)return;
 const normal=ap.lookup(N('N'));
 const resize=(old,checked=false)=>{
  if(!(old instanceof L.PDFRawStream)&&!old?.getUnencodedContents)throw Error('Unexpected floor row appearance.');
  let source=decode(old,L);
  if(checked){
   // These automatic status cells contain only the solid green/red inset.
   // Extend the actual fill, keeping its approved colour and 0.5 pt inset.
   const fill=/0\.5 0\.5 ([-\d.e]+) ([-\d.e]+) re f/;
   if(source.match(fill))source=source.replace(fill,(_,width)=>`0.5 0.5 ${width} ${round(nextRect.height-1)} re f`);
   else if(/\S/.test(source.replace(/[qQ\s]/g,'')))throw Error('Unexpected floor conformity appearance.');
  }else source=`q 1 0 0 1 0 ${round((nextRect.height-oldRect.height)/2)} cm\n${source}\nQ\n`;
  return pdf.context.register(stream(pdf,L,source,old,{BBox:[0,0,nextRect.width,nextRect.height]}));
 };
 if(normal instanceof L.PDFRawStream||normal?.getUnencodedContents){
  const replacement=pdf.context.obj({});for(const[k,v]of ap.entries())replacement.set(k,k===N('N')?resize(normal):v);
  return replacement;
 }else if(normal instanceof L.PDFDict){
  const replacement=pdf.context.obj({});
  for(const[k,v]of normal.entries())replacement.set(k,resize(pdf.context.lookup(v),true));
  const nextAp=pdf.context.obj({});for(const[k,v]of ap.entries())nextAp.set(k,k===N('N')?replacement:v);
  return nextAp;
 }else throw Error('Missing floor row appearance.');
}

export async function normalizeFloorMicroV2727(pdf,L,{key=''}={}){
 const N=L.PDFName.of,form=pdf.getForm(),page=pdf.getPage(0);
 const type=form.getFieldMaybe('type_balance'),label=type?.getText?.()||type?.getSelected?.().join(' ')||'';
 if(key&&key!=='plancher'||!/plancher/i.test(label)||!page.node.has(N('CDQReportLayoutV2721')))return false;
 const rows=Array.from({length:6},(_,i)=>form.getFieldMaybe(`charge_point_${i+1}_charge_utilisee`));
 if(rows.some(f=>!f)||form.getFieldMaybe('charge_point_7_charge_utilisee'))return false;
 const rectangles=rows.map(f=>f.acroField.getWidgets()[0].getRectangle()),top=rectangles[0].y+rectangles[0].height,bottom=rectangles.at(-1).y;
 const height=(top-bottom)/6;
 if(page.node.has(N('CDQFloorMicroV2727'))&&rectangles.every((r,i)=>near(r.y,round(top-(i+1)*height))&&near(r.height,round(top-i*height)-round(top-(i+1)*height))))return false;
 // Anchor this micro-correction to the approved six-row, 104 pt table.
 // An unrelated or externally redesigned PDF is left intact.
 if(!near(top,400)||!near(bottom,296)||!rectangles.every((r,i)=>near(r.y,386-i*18)&&near(r.height,14)))return false;
 const ref=page.node.get(N('CDQReportLayoutV2721')),old=pdf.context.lookup(ref);
 if(!(old instanceof L.PDFRawStream))throw Error('Floor table stream unavailable.');
 const source=decode(old,L);
 if(!source.startsWith('% CDQ requested report corrections V2721'))throw Error('Unexpected floor table owner.');
 const geometry=rectangles.map((r,i)=>{const y=round(top-(i+1)*height),upper=round(top-i*height);return {...r,y,height:round(upper-y)};});
 let cells=0,numbers=0;
 let next=source.replace(/([-\d.e]+) ([-\d.e]+) ([-\d.e]+) ([-\d.e]+) re B/g,(match,x,y,w,h)=>{
  const row=rectangles.findIndex(r=>near(r.y,+y)&&near(r.height,+h));
  if(row<0)return match;
  if(+x<10.8||+x+ +w>594.56001)throw Error('Unexpected floor row cell.');
  cells++;return `${x} ${geometry[row].y} ${w} ${geometry[row].height} re B`;
 });
 next=next.replace(/(\/CDQ2721 10 Tf [-\d.e]+ )([-\d.e]+)( Td <3([1-6])> Tj)/g,(match,prefix,y,suffix,index)=>{
  const i=Number(index)-1;if(!near(+y,rectangles[i].y+3.41))throw Error('Unexpected floor point caption.');
  numbers++;const shift=geometry[i].y-rectangles[i].y+(geometry[i].height-rectangles[i].height)/2;
  return prefix+round(+y+shift)+suffix;
 });
 if(cells!==54||numbers!==6)throw Error(`Floor table anchors incomplete: ${cells} cells, ${numbers} point captions.`);
 const fields=form.getFields().filter(f=>/^charge_point_[1-6]_/.test(f.getName()));
 const updates=[];
 for(const f of fields){const i=Number(f.getName().match(/^charge_point_(\d+)_/)[1])-1;
  for(const widget of f.acroField.getWidgets()){
   const rectangle=widget.getRectangle();
   if(!near(rectangle.y,rectangles[i].y)||!near(rectangle.height,14))throw Error('Unexpected floor widget geometry: '+f.getName());
   updates.push({widget,rectangle,next:{...rectangle,y:geometry[i].y,height:geometry[i].height}});
  }
 }
 if(updates.length!==60)throw Error('Unexpected floor row widget count: '+updates.length);
 // Validate and prepare every appearance before changing any widget geometry.
 for(const update of updates)update.ap=resizeAppearance(pdf,L,update.widget,update.rectangle,update.next);
 for(const{widget,next:target,ap}of updates){if(ap)widget.dict.set(N('AP'),ap);widget.setRectangle(target);}
 pdf.context.assign(ref,stream(pdf,L,next,old));
 page.node.set(N('CDQFloorMicroV2727'),pdf.context.obj({Revision:1,Stream:ref,Rows:6,Top:top,Bottom:bottom}));
 return true;
}
