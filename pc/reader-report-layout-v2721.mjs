import {clearWidgetFrameV2702} from './reader-truck-equipment-v2702.mjs';
const cyan='.6 .992156863 .992156863',blue='0 .32 .79',ink='.114 .059 .871';
const read=(o,L)=>new TextDecoder().decode(L.decodePDFRawStream(o).decode());
const pictures=new Map();
async function picture(name,data){if(data?.[name])return data[name];if(!pictures.has(name))pictures.set(name,(async()=>{const url=new URL('./assets/report-art-v2721/'+name,import.meta.url);if(url.protocol==='file:'&&globalThis.process?.versions?.node){const fs=await import('node:fs/promises');return new Uint8Array(await fs.readFile(url));}const r=await fetch(url);if(!r.ok)throw Error('Photographie de balance indisponible.');return new Uint8Array(await r.arrayBuffer());})().catch(e=>{pictures.delete(name);throw e;}));return pictures.get(name);}
function replace(pdf,L,ref,o,source){const next=pdf.context.flateStream(source);for(const[k,v]of o.dict.entries())if(!['/Length','/Filter','/DecodeParms'].includes(String(k)))next.dict.set(k,v);pdf.context.assign(ref,next);}
export async function normalizeReportLayoutV2721(pdf,L,{key='',imageData}={}){
 const N=L.PDFName.of,form=pdf.getForm(),page=pdf.getPage(0),marker=N('CDQReportLayoutV2721');
 if(!form.getFieldMaybe('indicateur_fabricant')||!page.node.has(N('CDQReportTypographyV2719')))return false;
 const type=form.getFieldMaybe('type_balance'),label=type?.getText?.()||type?.getSelected?.().join(' ')||'';
 key=key||(/multi/i.test(label)?'multitete':/suspendue/i.test(label)?'suspendue':/train/i.test(label)?'train':/cuve/i.test(label)?'cuve4':/tr[eé]mie/i.test(label)?'tremie4':/plancher/i.test(label)?'plancher':'other');
 if(!['plancher','multitete','train','suspendue','cuve3','cuve4','tremie3','tremie4'].includes(key))return false;
 page.node.normalize();const resources=page.node.Resources(),fonts=resources.lookup(N('Font'),L.PDFDict),regular=fonts.get(N('CDQ2704Regular')),bold=fonts.get(N('CDQ2704Bold'));
 fonts.set(N('CDQ2721'),regular);fonts.set(N('CDQ2721Bold'),bold);const dr=form.acroForm.dict.lookupMaybe(N('DR'),L.PDFDict)||pdf.context.obj({}),dfs=dr.lookupMaybe(N('Font'),L.PDFDict)||pdf.context.obj({});dfs.set(N('CDQ2721'),regular);dr.set(N('Font'),dfs);form.acroForm.dict.set(N('DR'),dr);
 const regularEncoder=L.StandardFontEmbedder.for(L.StandardFonts.Helvetica),boldEncoder=L.StandardFontEmbedder.for(L.StandardFonts.HelveticaBold),r=n=>form.getField(n).acroField.getWidgets()[0].getRectangle();
 const width=(s,size,b=false)=>{const e=b?boldEncoder:regularEncoder;return Array.from(s).reduce((n,c)=>n+e.font.getWidthOfGlyph(e.encoding.encodeUnicodeCodePoint(c.codePointAt(0)).name),0)*size/1000;};
 const text=(s,b,size=7,color='1 1 1',boldText=false)=>{const lines=s.split('|'),step=size+1,base=b.y+(b.height-(lines.length-1)*step-size*.718)/2;return lines.map((line,i)=>`q ${color} rg BT 0 Tc 0 Tw 100 Tz /CDQ2721${boldText?'Bold':''} ${size} Tf ${b.x+(b.width-width(line,size,boldText))/2} ${base+(lines.length-1-i)*step} Td ${(boldText?boldEncoder:regularEncoder).encodeText(line)} Tj ET Q\n`).join('');};
 const fill=(b,color='1 1 1')=>`q ${color} rg ${b.x} ${b.y} ${b.width} ${b.height} re f Q\n`;
 const cell=(b,color=cyan)=>`q ${color} rg .02 .85 .94 RG .6 w ${b.x} ${b.y} ${b.width} ${b.height} re B Q\n`;
 function resize(f,next,size=10.36){for(const w of f.acroField.getWidgets()){w.setRectangle(next);clearWidgetFrameV2702(pdf,L,w);if(f.getText||f.getSelected){const value=f.getText?.()||f.getSelected?.().join(' ')||'',fit=Math.min(size,(next.width-3)/Math.max(1,width(value,1)));w.dict.set(N('AP'),pdf.context.obj({N:pdf.context.register(pdf.context.flateStream(text(value,{x:0,y:0,width:next.width,height:next.height},fit,'0 0 0'),{Type:'XObject',Subtype:'Form',BBox:[0,0,next.width,next.height],Resources:{Font:{CDQ2721:regular}}}))}));}}if(f.setFontSize)f.setFontSize(size);f.acroField.dict.set(N('DA'),L.PDFString.of('/CDQ2721 '+size+' Tf 0 g'));form.markFieldAsClean(f.ref);}
 const exists=page.node.has(marker);let art='% CDQ requested report corrections V2721\n';
 if(key==='plancher'){
  resize(type,r('type_balance'),10.36);
  const fields=form.getFields().filter(f=>/^charge_point_\d+_/.test(f.getName())),first=r('charge_point_1_charge_utilisee'),last=fields.filter(f=>/_charge_utilisee$/.test(f.getName())).sort((a,b)=>Number(a.getName().match(/\d+/)[0])-Number(b.getName().match(/\d+/)[0])).at(-1),bottom=last.acroField.getWidgets()[0].getRectangle().y;
  for(const f of fields)for(const w of f.acroField.getWidgets())clearWidgetFrameV2702(pdf,L,w);
  if(!exists){const left=10.8,right=r('charge_point_1_conforme_vert').x+r('charge_point_1_conforme_vert').width;art+=fill({x:left-1.5,y:bottom-1.5,width:right-left+3,height:first.y+first.height+20-bottom+3});
   const numbers=new Set(fields.map(f=>Number(f.getName().match(/\d+/)[0]))),cols=['charge_utilisee','charge_contrainte','tolerance','avant_correction','erreur_avant','apres_correction','erreur_apres','conforme_vert'];
   const titles=['Charge|Utilisée','Charge de|Contrainte','Tolérance','Avant|Correction','Erreur (e)','Après|Correction','Erreur (e)','Conforme'],hy=first.y+first.height+2;art+=cell({x:left,y:hy,width:first.x-left-2,height:18},blue)+text('Point',{x:left,y:hy,width:first.x-left-2,height:18});for(const[j,suffix]of cols.entries()){const f=form.getFieldMaybe('charge_point_1_'+suffix);if(f){const b={...f.acroField.getWidgets()[0].getRectangle(),y:hy,height:18};art+=cell(b,blue)+text(titles[j],b);}}
   for(const i of numbers){const p='charge_point_'+i+'_',point=r(p+'charge_utilisee');art+=cell({x:left,y:point.y,width:point.x-left-2,height:point.height},'1 1 1')+text(String(i),{x:left,y:point.y,width:point.x-left-2,height:point.height},10,ink);for(const suffix of cols){const f=form.getFieldMaybe(p+suffix);if(f)art+=cell(f.acroField.getWidgets()[0].getRectangle());}}
  }
 }
 if(key==='multitete'){
  const groups=[['charge_utilisee','Charges|Utilisées'],['tolerance','Tolérance (e)'],['avant_correction','Avant|Correction'],['erreur_avant','Erreur (e)'],['apres_correction','Après|Correction'],['erreur_apres','Erreur (e)']],left=10.8,right=447,first=r('charge_point_1_numero_tete'),last=r('charge_point_14_numero_tete'),bottom=last.y,headerBottom=first.y+first.height+(exists?0:1.2),hTop=headerBottom+30,cw=(right-left)/13,rowHeight=(headerBottom-bottom)/14;
  if(!exists){art+=fill({x:left-1,y:bottom-1,width:right-left+2,height:hTop-bottom+2});art+=cell({x:left,y:headerBottom,width:cw,height:30},blue)+text('N° de|Tête',{x:left,y:headerBottom,width:cw,height:30},7);
   for(const[j,[,title]]of groups.entries()){const x=left+(1+j*2)*cw;art+=cell({x,y:headerBottom+12,width:cw*2,height:18},blue)+text(title,{x,y:headerBottom+12,width:cw*2,height:18},7);for(let load=0;load<2;load++)art+=cell({x:x+load*cw,y:headerBottom,width:cw,height:12},blue)+text('Poids '+(load+1),{x:x+load*cw,y:headerBottom,width:cw,height:12},6.5);}
  }
  for(let i=1;i<=14;i++){const p='charge_point_'+i+'_',y=headerBottom-i*rowHeight,b={x:left,y,width:cw,height:rowHeight};resize(form.getField(p+'numero_tete'),b,8.4);if(!exists)art+=cell(b);
   for(const[j,[suffix]]of groups.entries())for(let load=0;load<2;load++){const box={x:left+(1+j*2+load)*cw,y,width:cw,height:rowHeight};resize(form.getField(p+suffix+(load?'_2':'')),box,8.4);if(!exists)art+=cell(box);}
   for(const suffix of ['conforme_vert','conforme_rouge'])for(const w of form.getField(p+suffix).acroField.getWidgets())w.dict.set(N('F'),pdf.context.obj(2));
  }
  if(!exists){for(const ref of page.node.Contents().asArray()){const o=pdf.context.lookup(ref);if(!(o instanceof L.PDFRawStream))continue;const source=read(o,L);if(/14 (?:têtes|essais)/i.test(source)||/313420(?:54|74)(?:CA|EA)/i.test(source)){const next=source.replace(/BT[^]*?ET/g,b=>/14 (?:têtes|essais)/i.test(b)||/313420(?:54|74)(?:CA|EA)/i.test(b)?'':b);if(next!==source)replace(pdf,L,ref,o,next);}}
   // This caption was also present in a nested presentation form.
   for(const[ref,o]of pdf.context.enumerateIndirectObjects())if(o instanceof L.PDFRawStream&&o.dict.get(N('Subtype'))===N('Form')){const s=read(o,L),next=s.replace(/BT[\s\S]*?ET/g,b=>/14 (?:têtes|essais)/i.test(b)||/313420(?:54|74)(?:CA|EA)/i.test(b)?'':b);if(next!==s)replace(pdf,L,ref,o,next);}
  }
 }
 if(/^cuve|^tremie/.test(key)){
  const names=['type_balance','points_test','etendue_verifiee','legal_pour_commerce'],first=r(names[0]),oldLast=r(names.at(-1)),right=oldLast.x+oldLast.width,legalWidth=width('Légal pour le Commerce',8.4,true)+4,gap=2,shared=(right-first.x-legalWidth-gap*3)/3;
  if(!exists)art+=fill({x:first.x-1,y:first.y-1,width:right-first.x+2,height:first.height+13.5});
  const captions=['Type de Balance','Points de Test','Étendue Vérifiée','Légal pour le Commerce'];let x=first.x;
  for(const[i,name]of names.entries()){const box={...r(name),x,width:i===3?legalWidth:shared};resize(form.getField(name),box,10.36);if(!exists)art+=cell(box)+text(captions[i],{...box,y:box.y+box.height+1,height:10.5},8.4,ink,true);x+=box.width+gap;}
 }
 if(key==='train'&&!exists){
  const top=page.getHeight()-618.8,left=148.9,right=page.getWidth()-12,deckWidth=(right-left-4)/3;
  let trainRef;for(const[ref,o]of pdf.context.enumerateIndirectObjects())if(o instanceof L.PDFRawStream&&o.dict.get(N('Subtype'))===N('Form')&&read(o,L).includes('/TrainPhoto Do')){trainRef=ref;break;}
  if(!trainRef)throw Error('Photographie de locomotive manquante.');const xs=resources.lookupMaybe(N('XObject'),L.PDFDict)||pdf.context.obj({});xs.set(N('CDQTrain2721'),trainRef);resources.set(N('XObject'),xs);
  art+=fill({x:10,y:top+15,width:page.getWidth()-20,height:74});
  for(let i=0;i<3;i++){const x=left+i*(deckWidth+2),iw=deckWidth-14,ih=iw*82/574,dy=top+20;art+=`q ${iw} 0 0 ${ih} ${x+7} ${dy+15} cm /CDQTrain2721 Do Q\n`;
   art+=`q .12 .28 .42 rg .02 .72 .87 RG .8 w ${x+2} ${dy} ${deckWidth-4} 8 re B .6 .992 .992 rg ${x+2} ${dy+8} ${deckWidth-4} 3 re B .1 .18 .28 rg ${x+12} ${dy-4} 9 4 re f ${x+deckWidth-21} ${dy-4} 9 4 re f Q\n`;
  }
 }
 if(key==='suspendue'&&!exists){
  const xs=resources.lookup(N('XObject'),L.PDFDict),old=xs.get(N('CDQHanging2713'));if(!old)throw Error('Photographies ANYLOAD absentes.');xs.set(N('CDQHanging2721'),old);
  const a=await pdf.embedPng(await picture('rice-3460.png',imageData)),b=await pdf.embedJpg(await picture('rice-4260.jpg',imageData));xs.set(N('CDQRice3460'),a.ref);xs.set(N('CDQRice4260'),b.ref);
  const x=10.8,right=page.getWidth()-12.3,headerY=page.getHeight()-r('charge_point_6_charge_utilisee').y; // Position remains below the central table.
  const band={x:10,y:269,width:page.getWidth()-20,height:20};art+=fill({x:10,y:157,width:page.getWidth()-20,height:132})+fill(band,blue)+text('MODÈLE',{x:45,y:269,width:band.width-45,height:20},10,'1 1 1');
  const tile=(right-x)/4,ih=100,y=161;
  for(let i=0;i<2;i++){const tx=x+i*tile+(tile-ih)/2;art+=`q ${tx} ${y} ${ih} ${ih} re W n ${ih*2} 0 0 ${ih} ${tx-i*ih} ${y} cm /CDQHanging2721 Do Q\n`;}
  for(const[i,img,name]of [[2,a,'CDQRice3460'],[3,b,'CDQRice4260']]){const iw=ih*img.width/img.height;art+=`q ${iw} 0 0 ${ih} ${x+i*tile+(tile-iw)/2} ${y} cm /${name} Do Q\n`;}
  const circles=page.node.lookup(N('CDQReportMicroV2716'),L.PDFDict),ref=circles.get(N('Stream')),o=pdf.context.lookup(ref),src=read(o,L);replace(pdf,L,ref,o,src.replace(/\(4\) Tj/,'(5) Tj'));
  const radius=13.05,cx=23.4,cy=279,k=.5522847498*radius;const list=circles.lookup(N('Circles'),L.PDFArray);list.lookup(list.size()-1,L.PDFArray).set(0,pdf.context.obj(5));list.push(pdf.context.obj([4,cx,cy,radius]));art+=`q .015686 .015686 .407959 rg .007843 .898039 .964706 RG 1.3 w ${cx+radius} ${cy} m ${cx+radius} ${cy+k} ${cx+k} ${cy+radius} ${cx} ${cy+radius} c ${cx-k} ${cy+radius} ${cx-radius} ${cy+k} ${cx-radius} ${cy} c ${cx-radius} ${cy-k} ${cx-k} ${cy-radius} ${cx} ${cy-radius} c ${cx+k} ${cy-radius} ${cx+radius} ${cy-k} ${cx+radius} ${cy} c h B BT /CDQ2721 19 Tf 1 1 1 rg ${cx-5.282} ${cy-6.55} Td (4) Tj ET Q\n`;
 }
 if(!exists){const ref=pdf.context.register(pdf.context.flateStream(art));page.node.addContentStream(ref);page.node.set(marker,ref);}else{const ref=page.node.get(marker),list=page.node.Contents();for(let i=list.size()-1;i>=0;i--)if(String(list.get(i))===String(ref))list.remove(i);list.push(ref);}
 const circle=page.node.lookup(N('CDQReportMicroV2716'),L.PDFDict).get(N('Stream')),ordered=page.node.Contents();for(let i=ordered.size()-1;i>=0;i--)if(String(ordered.get(i))===String(circle))ordered.remove(i);ordered.push(circle);
 return true;
}
