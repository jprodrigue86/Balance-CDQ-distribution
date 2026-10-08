import {clearWidgetFrameV2702} from './reader-truck-equipment-v2702.mjs';

const prefixes=['indicateur','base_balance','imprimante'];
const suffixes=['fabricant','modele','numero_serie','numero_am'];
const cyan='.6 .992156863 .992156863',ink='.114 .059 .871';
const labels={identification_balance:'IDENTIFICATION DE LA BALANCE',type_balance:'TYPE DE BALANCE',type_plateau:'TYPE DE PLATEAU',etendue_verifiee:'ÉTENDUE VÉRIFIÉE',legal_pour_commerce:'LÉGAL POUR LE COMMERCE',capacite_maximale:'CAPACITÉ MAXIMALE (Max)',unite_mesure:'UNITÉ DE MESURE',echelon:'ÉCHELON (e)',resolution:'RÉSOLUTION (d)',etalon_utilise:'ÉTALON UTILISÉ',points_test:'POINTS DE TEST'};
function resizeTextAppearance(pdf,L,w,old,next){
 if(Math.abs(old.width-next.width)+Math.abs(old.height-next.height)<.00001)return;
 const N=L.PDFName.of,ap=w.dict.lookupMaybe(N('AP'),L.PDFDict),o=ap?.lookup(N('N'));
 if(!(o instanceof L.PDFRawStream))return;
 const source=new TextDecoder().decode(L.decodePDFRawStream(o).decode());
 const stream=pdf.context.flateStream(`q 1 0 0 1 ${(next.width-old.width)/2} ${(next.height-old.height)/2} cm ${source} Q`,{Type:'XObject',Subtype:'Form',BBox:[0,0,next.width,next.height],Resources:o.dict.lookupMaybe(N('Resources'),L.PDFDict)||pdf.context.obj({})});
 ap.set(N('N'),pdf.context.register(stream));
}

const formHasSecondLoad=f=>!!f.getFieldMaybe('charge_point_1_charge_utilisee_2');
export function reportGridV2704(pdf){
 const f=pdf.getForm(),r=n=>f.getFieldMaybe(n)?.acroField.getWidgets()[0]?.getRectangle();
 const a=r('charge_point_1_charge_utilisee'),b=r('charge_point_1_charge_contrainte')||r('charge_point_1_tolerance');
 if(!a||!b)return null;
 const floor=a.height<15,pad=floor?1:0;
 const next=r('charge_point_2_charge_utilisee');
 const page=pdf.getPage(0).node,marker=page.entries().find(([k])=>String(k)==='/CDQReportLayoutV2713'),old=page.entries().find(([k])=>String(k)==='/CDQReportLayoutV2704');
 const meta=marker&&formHasSecondLoad(f)&&old?pdf.context.lookup(old[1]):null,recorded=meta?.entries().find(([k])=>String(k)==='/Gap')?.[1]?.asNumber?.();
 return {gap:recorded??Math.max(.8,b.x-a.x-a.width-2*pad),rowGap:Math.max(.8,a.y-next.y-a.height-2*pad),pad};
}

export function sectionCircleV2704(number,x,y,s=1){
 const rx=13.05*s,ry=12.7*s,k=.5522847498;
 const path=[`${x+rx} ${y} m`,`${x+rx} ${y+k*ry} ${x+k*rx} ${y+ry} ${x} ${y+ry} c`,`${x-k*rx} ${y+ry} ${x-rx} ${y+k*ry} ${x-rx} ${y} c`,`${x-rx} ${y-k*ry} ${x-k*rx} ${y-ry} ${x} ${y-ry} c`,`${x+k*rx} ${y-ry} ${x+rx} ${y-k*ry} ${x+rx} ${y} c`].join(' ');
 return `q .015686 .015686 .407959 rg .007843 .898039 .964706 RG ${1.3*s} w ${path} h B BT /CDQ2704Regular ${19*s} Tf 1 1 1 rg ${x-5.282*s} ${y-6.55*s} Td (${number}) Tj ET Q\n`;
}

// Add native PDF artwork to the door; the panorama's approved pixels stay intact.
export function restoreTruckDoorV2704(pdf,L,fontRef){
 const N=L.PDFName.of;
 for(const[ref,o]of pdf.context.enumerateIndirectObjects()){
  if(!(o instanceof L.PDFRawStream)||o.dict.get(N('Subtype'))!==N('Form')||o.dict.has(N('CDQTruckDoorV2704')))continue;
  let src;try{src=new TextDecoder().decode(L.decodePDFRawStream(o).decode());}catch{continue;}
  if(!src.includes('/Camion95 Do'))continue;
  const logo='q .055 .38 .74 RG .055 .38 .74 rg 1.1 w 23 17 m 23 19.76 20.76 22 18 22 c 15.24 22 13 19.76 13 17 c 13 14.24 15.24 12 18 12 c 20.76 12 23 14.24 23 17 c h S 20.5 17 m 20.5 18.38 19.38 19.5 18 19.5 c 16.62 19.5 15.5 18.38 15.5 17 c 15.5 15.62 16.62 14.5 18 14.5 c 19.38 14.5 20.5 15.62 20.5 17 c h S 18 17 m 21 14 l 19.8 14 l 21.5 12.3 l 22.6 13.4 l 20.9 15.1 l 20.9 16.3 l h f BT /DoorFont 8.2 Tf 6.1 2.8 Td (CDQ) Tj ET Q';
  const glyph=pdf.context.register(pdf.context.flateStream(logo,{Type:'XObject',Subtype:'Form',BBox:[0,0,36,24],Resources:{Font:{DoorFont:fontRef}}}));
  const resources=o.dict.lookup(N('Resources'),L.PDFDict),objects=resources.lookup(N('XObject'),L.PDFDict);objects.set(N('CDQDoor2704'),glyph);
  const stream=pdf.context.flateStream(src+'\n% CDQ door logo restored V2704\nq '+(.022/36)+' 0 0 '+(.098/24)+' .3877 .4634 cm /CDQDoor2704 Do Q\n');
  for(const[k,v]of o.dict.entries())if(!['/Length','/Filter','/DecodeParms'].includes(String(k)))stream.dict.set(k,v);
  stream.dict.set(N('CDQTruckDoorV2704'),pdf.context.obj(true));pdf.context.assign(ref,stream);return true;
 }
 return false;
}

// One page grid owns the borders. Category rows share a single separator;
// cyan cells use the report's existing central-table spacing on both axes.
export async function normalizeReportLayoutV2704(pdf,L){
 const N=L.PDFName.of,form=pdf.getForm(),page=pdf.getPage(0),grid=reportGridV2704(pdf);
 if(!grid||!form.getFieldMaybe('indicateur_fabricant')||!form.getFieldMaybe('imprimante_fabricant'))return false;
 const marker=N('CDQReportLayoutV2704');
 if(page.node.has(marker)){
  let changed=false;
  const ref=page.node.lookup(marker,L.PDFDict).get(N('Stream')),contents=page.node.Contents();
  const i=contents.asArray().findIndex(r=>String(r)===String(ref));
  if(i>=0&&i<contents.size()-1){contents.remove(i);contents.push(ref);changed=true;}
  for(const f of form.getFields())if(f.constructor.name!=='PDFCheckBox'&&(/^(?:indicateur|base_balance|imprimante)_/.test(f.getName())||labels[f.getName()]||/^charge_point_\d+_/.test(f.getName())))for(const w of f.acroField.getWidgets())changed=clearWidgetFrameV2702(pdf,L,w)||changed;
  return changed;
 }
 const r=n=>form.getField(n).acroField.getWidgets()[0].getRectangle();
 const rows=prefixes.filter(p=>form.getFieldMaybe(p+'_fabricant')),oldRows=rows.map(p=>r(p+'_fabricant'));
 const first=oldRows[0],stride=first.height+grid.rowGap,top=first.y+first.height;
 const gain=Math.max(0,top-first.height-(rows.length-1)*stride-oldRows.at(-1).y);
 const scale=page.getWidth()/612,left=10.8*scale,right=page.getWidth()-12.3*scale;
 const allPoints=form.getFields().filter(f=>/^charge_point_\d+_charge_utilisee$/.test(f.getName())).sort((a,b)=>Number(a.getName().match(/\d+/)[0])-Number(b.getName().match(/\d+/)[0]));
 const pointTop=r(allPoints[0].getName()).y+r(allPoints[0].getName()).height;
 const pointBottom=r(allPoints.at(-1).getName()).y;
 const precision=!!form.getFieldMaybe('type_plateau'),a4=page.getHeight()>820;
 const circle2=page.getHeight()-(a4?199.426:204.2),circle3=a4?page.getHeight()-348.125:precision?451:433.3;
 // Capture the original heading and column labels as vectors before repainting.
 const strip=await pdf.embedPage(page,{left:0,bottom:pointTop+.2,right:page.getWidth(),top:circle3+14*scale});await strip.embed();
 const bold=pdf.embedStandardFont(L.StandardFonts.HelveticaBold),regular=pdf.embedStandardFont(L.StandardFonts.Helvetica);
 await pdf.flush();
 const native=weight=>pdf.context.enumerateIndirectObjects().find(([,o])=>o instanceof L.PDFDict&&String(o.get(N('BaseFont')))==='/NimbusSans-'+weight&&String(o.get(N('Encoding')))==='/WinAnsiEncoding'&&o.lookupMaybe(N('LastChar'),L.PDFNumber)?.asNumber()===255&&o.lookupMaybe(N('FontDescriptor'),L.PDFDict)?.has(N('FontFile')))?.[0];
 const boldRef=native('Bold')||bold.ref,regularRef=native('Regular')||regular.ref;
 page.node.normalize();const resources=page.node.Resources(),fonts=resources.lookupMaybe(N('Font'),L.PDFDict)||pdf.context.obj({});fonts.set(N('CDQ2704Bold'),boldRef);fonts.set(N('CDQ2704Regular'),regularRef);resources.set(N('Font'),fonts);
 const objects=resources.lookupMaybe(N('XObject'),L.PDFDict)||pdf.context.obj({});objects.set(N('CDQ2704Heading'),strip.ref);resources.set(N('XObject'),objects);
 const cell=(box,fill=cyan)=>`q ${fill} rg .02 .85 .94 RG .6 w ${box.x} ${box.y} ${box.width} ${box.height} re B Q\n`;
 const text=(s,box,size=8.4,color=ink,font=bold,resource='CDQ2704Bold',padding=3)=>{size=Math.min(size,(box.width-padding)/font.widthOfTextAtSize(s,1));return `q ${color} rg BT /${resource} ${size} Tf ${box.x+(box.width-font.widthOfTextAtSize(s,size))/2} ${box.y+(box.height-size*.718)/2} Td ${font.encodeText(s)} Tj ET Q\n`;};
 const oldInfo=[['identification_balance','type_balance','type_plateau','etendue_verifiee','legal_pour_commerce','points_test'],['capacite_maximale','unite_mesure','echelon','resolution','etalon_utilise']].map(names=>names.filter(n=>form.getFieldMaybe(n))).map(names=>names.filter(n=>Math.abs(r(n).y-r(names[0]).y)<2).sort((a,b)=>r(a).x-r(b).x));
 const headerY=top+grid.rowGap,headerHeight=a4?15.533:16.5,maskTop=top+3.185+headerHeight+1;
 let art=`% CDQ compact equipment and full circles V2704\nq 1 1 1 rg ${left-1.5} ${pointTop+.1} ${right-left+3} ${maskTop-pointTop-.1} re f Q\n`;
 const category={x:left,y:top+grid.rowGap/2-rows.length*stride,width:first.x-left-grid.gap,height:rows.length*stride};
 art+=`q 1 1 1 rg .02 .85 .94 RG .6 w ${category.x} ${category.y} ${category.width} ${category.height} re B\n`;
 for(let i=1;i<rows.length;i++){const y=category.y+i*stride;art+=`${category.x} ${y} m ${category.x+category.width} ${y} l S\n`;}
 art+='Q\n';
 for(const[i,p]of rows.entries()){
  const y=top-first.height-i*stride,box={...category,y:y-grid.rowGap/2,height:stride};
  const label=precision&&p==='indicateur'?'Balance':p==='indicateur'?'Indicateur':p==='base_balance'?'Base de la balance':'Imprimante';art+=text(label,box,11.25);
  const names=suffixes.filter(s=>form.getFieldMaybe(p+'_'+s));
  for(const[j,s]of names.entries()){
   const field=form.getField(p+'_'+s),old=r(p+'_'+s),col=suffixes.indexOf(s),next=col<suffixes.length-1?r(rows[0]+'_'+suffixes[col+1]).x:right+grid.gap;
   for(const w of field.acroField.getWidgets()){const box={...old,y,height:first.height,width:next-old.x-grid.gap};w.setRectangle(box);clearWidgetFrameV2702(pdf,L,w);resizeTextAppearance(pdf,L,w,old,box);art+=cell(box);}
  }
 }
 const headerBoxes=[{x:left,width:category.width},...suffixes.filter(s=>form.getFieldMaybe(rows[0]+'_'+s)).map(s=>r(rows[0]+'_'+s))];
 for(const[i,b]of headerBoxes.entries()){const box={...b,y:headerY,height:headerHeight};art+=cell(box,'0 .32 .79')+text(['CATÉGORIE','FABRICANT','MODÈLE','N° DE SÉRIE','N° A-M'][i],box,6.1,'1 1 1',regular,'CDQ2704Regular');}
 for(const names of oldInfo){
  const old=names.map(r),rowLeft=old[0].x,rowRight=old.at(-1).x+old.at(-1).width,available=rowRight-rowLeft-grid.gap*(names.length-1),oldTotal=old.reduce((a,b)=>a+b.width,0);
  let x=rowLeft;
  for(const[i,n]of names.entries()){
   // Keep the commerce caption's approved width; return the horizontal gain to Type.
   const extra=available-oldTotal,width=precision?(old[i].width+(n==='type_balance'?extra:!names.includes('type_balance')?extra/names.length:0)):old[i].width*available/oldTotal;
   const box={...old[i],x,y:old[i].y+gain,width};
   for(const w of form.getField(n).acroField.getWidgets()){w.setRectangle(box);clearWidgetFrameV2702(pdf,L,w);resizeTextAppearance(pdf,L,w,old[i],box);}
   art+=cell(box)+text(labels[n]||n,{x,y:box.y+box.height+2,width,height:9.5},8.4,ink,bold,'CDQ2704Bold',0);x+=width+grid.gap;
  }
 }
 art+=`q 1 0 0 1 0 ${pointTop+.2+gain} cm /CDQ2704Heading Do Q\n`;
 for(const field of form.getFields())if(/^bloc3_statut_/.test(field.getName()))for(const w of field.acroField.getWidgets()){const old=w.getRectangle();w.setRectangle({...old,y:old.y+gain});}
 if(gain>.001){
  const firstR=r(allPoints[0].getName()),lastR=r(allPoints.at(-1).getName()),count=allPoints.length,pitch=(firstR.y-lastR.y)/(count-1),growth=gain/count;
  const tableRight=Math.max(...form.getFields().filter(f=>/^charge_point_1_/.test(f.getName())).flatMap(f=>f.acroField.getWidgets().map(w=>{const r=w.getRectangle();return r.x+r.width;})));
  art+=`q 1 1 1 rg ${left-1} ${pointBottom-1.2} ${tableRight-left+2} ${pointTop+gain-pointBottom+1.4} re f Q\n`;
  for(let i=1;i<=count;i++){
   const old=r('charge_point_'+i+'_charge_utilisee'),y=old.y+(count-i)*growth,height=old.height+growth;
   const firstColumn=Math.min(...form.getFields().filter(f=>f.getName().startsWith('charge_point_'+i+'_')).flatMap(f=>f.acroField.getWidgets().map(w=>w.getRectangle()).filter(r=>r.x>=left&&r.width>5&&Math.abs(r.y-old.y)<2).map(r=>r.x)));
   const pointBox={x:left,y,width:firstColumn-left-grid.gap,height};art+=cell(pointBox,'1 1 1')+text(String(i),pointBox,11.5);
   const painted=new Set();
   for(const field of form.getFields())if(field.getName().startsWith('charge_point_'+i+'_'))for(const w of field.acroField.getWidgets()){
    const old=w.getRectangle();if(Math.abs(old.y-(firstR.y-(i-1)*pitch))>2)continue;
    const box={...old,y:old.y+(count-i)*growth,height:old.height+growth};w.setRectangle(box);
    if(field.constructor.name!=='PDFCheckBox'){clearWidgetFrameV2702(pdf,L,w);resizeTextAppearance(pdf,L,w,old,box);}
    const stamp=[box.x,box.width].join(':');if(!painted.has(stamp)){art+=cell(box);painted.add(stamp);}
   }
  }
 }
 art+=sectionCircleV2704(2,23.4*scale,circle2,scale)+sectionCircleV2704(3,23.4*scale,circle3+gain,scale);
 const ref=pdf.context.register(pdf.context.flateStream(art));page.node.addContentStream(ref);page.node.set(marker,pdf.context.obj({Stream:ref,Recovered:gain,Gap:grid.gap,RowGap:grid.rowGap}));
 restoreTruckDoorV2704(pdf,L,boldRef);
 return true;
}
