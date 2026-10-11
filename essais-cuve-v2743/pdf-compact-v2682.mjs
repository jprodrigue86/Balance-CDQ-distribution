export function compactReportReadyV2682(pdf,L){
 const N=L.PDFName.of;
 if(String(pdf.catalog.get(N('CDQCompactV2682')))!=='true')return false;
 const form=pdf.getForm();if(String(form.acroForm.dict.get(N('NeedAppearances')))==='true')return false;
 if(!form.getFieldMaybe('client_nom')||!form.getFieldMaybe('charge_point_1_charge_utilisee'))return false;
 for(const field of form.getFields())for(const widget of field.acroField.getWidgets())if(!widget.dict.lookupMaybe(N('AP'),L.PDFDict)?.has(N('N')))return false;
 const points=form.getFieldMaybe('points_test');
 if(points){const three=points.getSelected()[0]==='3 points';if(form.getFieldMaybe('_cdq_points_diagram_3')?.isChecked()!==three||form.getFieldMaybe('_cdq_points_diagram_4')?.isChecked()===three)return false;}
 const plateau=form.getFieldMaybe('type_plateau');
 if(plateau){const value=plateau.getSelected().join(' '),triangle=/triangle/i.test(value),shape=triangle?'triangle':/rond/i.test(value)?'round':'square';
  for(const field of form.getFields()){
   const image=/^plateau_image_(avant|apres)_(square|round|triangle)$/.exec(field.getName()),corner=/^excentricite_(avant|apres)_arriere_droit$/.test(field.getName());
   if(!image&&!corner)continue;const hidden=image?image[2]!==shape:triangle;
   if(field.acroField.getWidgets().some(w=>!!(w.getFlags()&(2|32))!==hidden))return false;
  }
 }
 return true;
}
// Lossless cleanup only: retain every page, widget, action and appearance state.
export function compactReportV2682(pdf,L,{predictImages=true}={}){
 const N=L.PDFName.of,context=pdf.context,stats={unusedResources:0,unreachableObjects:0,duplicateObjects:0,predictedImages:0,imageBytesSaved:0};
 function walk(o,fn,seen=new Set()){
  if(o instanceof L.PDFRef){const id=String(o);if(seen.has(id))return;seen.add(id);walk(context.lookup(o),fn,seen);}
  else if(o instanceof L.PDFStream){fn(o.dict);for(const[,v]of o.dict.entries())walk(v,fn,seen);}
  else if(o instanceof L.PDFDict){fn(o);for(const[,v]of o.entries())walk(v,fn,seen);}
  else if(o instanceof L.PDFArray)for(const v of o.asArray())walk(v,fn,seen);
 }
 function collect(){
  const refs=new Set();
  function visit(o){if(o instanceof L.PDFRef){const id=String(o);if(refs.has(id))return;refs.add(id);visit(context.lookup(o));}else if(o instanceof L.PDFStream)visit(o.dict);else if(o instanceof L.PDFDict)for(const[,v]of o.entries())visit(v);else if(o instanceof L.PDFArray)for(const v of o.asArray())visit(v);}
  for(const v of Object.values(context.trailerInfo))visit(v);
  for(const[ref]of context.enumerateIndirectObjects())if(!refs.has(String(ref))){context.delete(ref);stats.unreachableObjects++;}
 }
 collect();
 const groups=new Map(),owners=new Set(),read=o=>{
  const bytes=o instanceof L.PDFRawStream?L.decodePDFRawStream(o).decode():o instanceof L.PDFStream&&typeof o.getUnencodedContents==='function'?o.getUnencodedContents():null;
  if(!bytes)throw Error('Unknown content stream');return new TextDecoder('latin1').decode(bytes);
 };
 function add(owner,streams){
  const resources=owner.lookupMaybe(N('Resources'),L.PDFDict);if(!resources)return;
  owners.add(owner);let group=groups.get(resources);if(!group)groups.set(resources,group={text:[],safe:true});
  try{for(const s of streams)group.text.push(read(s));}catch{group.safe=false;}
 }
 for(const page of pdf.getPages()){
  const contents=page.node.Contents(),refs=contents instanceof L.PDFArray?contents.asArray():contents?[contents]:[];
  add(page.node,refs.map(r=>context.lookup(r)));
 }
 for(const[,o]of context.enumerateIndirectObjects())if(o instanceof L.PDFStream&&o.dict.get(N('Subtype'))===N('Form'))add(o.dict,[o]);
 // A shared dictionary used by a pattern, Type 3 glyph or other owner is kept.
 for(const v of Object.values(context.trailerInfo))walk(v,dict=>{const r=dict.lookupMaybe(N('Resources'),L.PDFDict);if(r&&groups.has(r)&&!owners.has(dict))groups.get(r).safe=false;});
 for(const[resources,group]of groups){
  if(!group.safe)continue;const text=group.text.join('\n');
  for(const[category,operator]of [['XObject','Do'],['Font','Tf'],['ExtGState','gs']]){
   const entries=resources.lookupMaybe(N(category),L.PDFDict);if(!entries)continue;
   const used=new Set();const regex=category==='Font'?/\/(\S+)\s+[-+\d.eE]+\s+Tf\b/g:new RegExp('/(\\S+)\\s+'+operator+'\\b','g');
   for(const m of text.matchAll(regex))used.add('/'+m[1]);
   for(const[key]of entries.entries())if(!used.has(String(key))){entries.delete(key);stats.unusedResources++;}
  }
 }
 collect();
 if(predictImages)for(const[ref,s]of context.enumerateIndirectObjects()){
  if(!(s instanceof L.PDFRawStream)||s.dict.get(N('Subtype'))!==N('Image')||s.dict.get(N('Filter'))!==N('FlateDecode')||s.dict.has(N('DecodeParms')))continue;
  const space=s.dict.get(N('ColorSpace')),colors=space===N('DeviceRGB')?3:space===N('DeviceGray')?1:0;
  const width=s.dict.lookupMaybe(N('Width'),L.PDFNumber)?.asNumber(),height=s.dict.lookupMaybe(N('Height'),L.PDFNumber)?.asNumber(),bits=s.dict.lookupMaybe(N('BitsPerComponent'),L.PDFNumber)?.asNumber();
  if(!colors||bits!==8||!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||width*height>20000000)continue;
  let raw;try{raw=L.decodePDFRawStream(s).decode();}catch{continue;}
  if(raw.length!==width*height*colors)continue;
  const rowBytes=width*colors,encoded=new Uint8Array(raw.length+height),work=Array.from({length:5},()=>new Uint8Array(rowBytes));
  for(let y=0;y<height;y++){
   const scores=[0,0,0,0,0],offset=y*rowBytes;
   for(let x=0;x<rowBytes;x++){
    const value=raw[offset+x],left=x>=colors?raw[offset+x-colors]:0,up=y?raw[offset+x-rowBytes]:0,upperLeft=y&&x>=colors?raw[offset+x-rowBytes-colors]:0;
    const p=left+up-upperLeft,a=Math.abs(p-left),b=Math.abs(p-up),c=Math.abs(p-upperLeft),paeth=a<=b&&a<=c?left:b<=c?up:upperLeft;
    const predictors=[0,left,up,Math.floor((left+up)/2),paeth];
    for(let f=0;f<5;f++){const v=(value-predictors[f])&255;work[f][x]=v;scores[f]+=Math.abs(v<128?v:v-256);}
   }
   let chosen=0;for(let f=1;f<5;f++)if(scores[f]<scores[chosen])chosen=f;
   encoded[y*(rowBytes+1)]=chosen;encoded.set(work[chosen],y*(rowBytes+1)+1);
  }
  const stream=context.flateStream(encoded);
  if(stream.getContents().length>=s.getContents().length-256)continue;
  for(const[key,value]of s.dict.entries())if(!['/Length','/Filter','/DecodeParms'].includes(String(key)))stream.dict.set(key,value);
  stream.dict.set(N('DecodeParms'),context.obj({Predictor:15,Colors:colors,BitsPerComponent:8,Columns:width}));
  stats.imageBytesSaved+=s.getContents().length-stream.getContents().length;stats.predictedImages++;context.assign(ref,stream);
 }
 function canonical(o){if(o instanceof L.PDFDict)return '{'+o.entries().filter(([k])=>String(k)!=='/Length').sort(([a],[b])=>String(a).localeCompare(String(b))).map(([k,v])=>String(k)+':'+canonical(v)).join('|')+'}';if(o instanceof L.PDFArray)return '['+o.asArray().map(canonical).join('|')+']';return String(o);}
 function bytesEqual(a,b){if(a.length!==b.length)return false;for(let i=0;i<a.length;i++)if(a[i]!==b[i])return false;return true;}
 function hash(bytes){let h=2166136261;for(const b of bytes)h=Math.imul(h^b,16777619);return (h>>>0).toString(16);}
 for(let pass=0;pass<4;pass++){
  const buckets=new Map(),aliases=new Map();
  for(const[ref,o]of context.enumerateIndirectObjects()){
   const isStream=o instanceof L.PDFRawStream;
   // Mutable widget appearance forms are intentionally independent.
   if(isStream&&['/Form','/ObjStm','/XRef'].includes(String(o.dict.get(N('Subtype'))||o.dict.get(N('Type')))))continue;
   if(!isStream&&(!(o instanceof L.PDFDict)||!['/Font','/FontDescriptor'].includes(String(o.get(N('Type'))))&&o.get(N('S'))!==N('JavaScript')))continue;
   const bytes=isStream?o.getContents():new Uint8Array(),description=canonical(isStream?o.dict:o),key=description+'#'+bytes.length+'#'+hash(bytes),bucket=buckets.get(key)||[];
   const equal=bucket.find(item=>bytesEqual(bytes,item.bytes));
   if(equal)aliases.set(String(ref),equal.ref);else{bucket.push({ref,bytes});buckets.set(key,bucket);}
  }
  if(!aliases.size)break;
  const seen=new Set();
  function replace(o){
   if(o instanceof L.PDFStream)replace(o.dict);
   else if(o instanceof L.PDFDict){if(seen.has(o))return;seen.add(o);for(const[k,v]of o.entries())if(v instanceof L.PDFRef&&aliases.has(String(v)))o.set(k,aliases.get(String(v)));else replace(v);}
   else if(o instanceof L.PDFArray){if(seen.has(o))return;seen.add(o);for(let i=0;i<o.size();i++){const v=o.get(i);if(v instanceof L.PDFRef&&aliases.has(String(v)))o.set(i,aliases.get(String(v)));else replace(v);}}
  }
  for(const[,o]of context.enumerateIndirectObjects())replace(o);
  for(const[ref]of context.enumerateIndirectObjects())if(aliases.has(String(ref))){context.delete(ref);stats.duplicateObjects++;}
 }
 collect();pdf.catalog.set(N('CDQCompactV2682'),context.obj(true));return stats;
}
