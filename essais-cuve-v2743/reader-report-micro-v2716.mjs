import {floorArrowPresentationV2695} from './reader-report-presentation-v2695.mjs';

// Micro-correction only: block-2 captions, category bottom border, section
// circles, and the table-scale illustration/its four front reading widgets.
// Do not change field values, actions, fonts of answers, or calculation rules.
const captions={identification_balance:'IDENTIFICATION DE LA BALANCE',type_balance:'TYPE DE BALANCE',type_plateau:'TYPE DE PLATEAU',etendue_verifiee:'ÉTENDUE VÉRIFIÉE',legal_pour_commerce:'LÉGAL POUR LE COMMERCE',capacite_maximale:'CAPACITÉ MAXIMALE (Max)',unite_mesure:'UNITÉ DE MESURE',echelon:'ÉCHELON (e)',resolution:'RÉSOLUTION (d)',etalon_utilise:'ÉTALON UTILISÉ',points_test:'POINTS DE TEST'};
const read=(o,L)=>new TextDecoder().decode(L.decodePDFRawStream(o).decode());
const ink='.114 .059 .871',cyan='.6 .992156863 .992156863';
const number=x=>+x.toFixed(6);
function circle(n,x,y,r,s){
 const k=.5522847498*r;
 return `q .015686 .015686 .407959 rg .007843 .898039 .964706 RG ${1.3*s} w ${x+r} ${y} m ${x+r} ${y+k} ${x+k} ${y+r} ${x} ${y+r} c ${x-k} ${y+r} ${x-r} ${y+k} ${x-r} ${y} c ${x-r} ${y-k} ${x-k} ${y-r} ${x} ${y-r} c ${x+k} ${y-r} ${x+r} ${y-k} ${x+r} ${y} c h B BT /CDQ2716Number ${19*s} Tf 1 1 1 rg ${x-5.282*s} ${y-6.55*s} Td (${n}) Tj ET Q\n`;
}

function adjustTable(pdf,L,font){
 const N=L.PDFName.of,f=pdf.getForm(),field=f.getFieldMaybe('_cdq_points_diagram_4');
 if(!field)return false;
 const w=field.acroField.getWidgets()[0],states=w.dict.lookup(N('AP'),L.PDFDict).lookup(N('N'),L.PDFDict),ref=states.get(N('Yes')),old=pdf.context.lookup(ref),resources=old.dict.lookup(N('Resources'),L.PDFDict),hardware=resources.lookup(N('XObject'),L.PDFDict).get(N('Hardware4'));
 if(!hardware)throw Error('Table-scale photograph missing');
 const text=(s,x,y,size,width)=>`q ${ink} rg BT /CDQ95 ${size} Tf ${x+(width-font.widthOfTextAtSize(s,size))/2} ${y} Td ${font.encodeText(s)} Tj ET Q\n`;
 const cell=r=>`q ${cyan} rg .02 .85 .94 RG .6 w ${r.x} ${r.y} ${r.width} ${r.height} re B Q\n`;
 let src='% CDQ table geometry V2716\nq 1 0 0 1 -10.5 -148 cm q 1 1 1 rg 10.5 148 591 116 re f Q\n';
 for(const [phase,dx]of [['avant',0],['apres',300]]){
  src+=`q .4 .67 .83 RG .5 w ${11+dx} 149 292 115 re S Q\n`+text(phase==='avant'?'AVANT CORRECTION':'APRÈS CORRECTION',11+dx,255,10.5,292);
  src+=`q 112 0 0 74.666667 ${101+dx} 158 cm /Hardware4 Do Q\n`;
  for(const[position,title,x,y,tx,ty]of [['arriere_gauche','Arrière gauche',21,205,133,220],['arriere_droit','Arrière droit',221,205,182,220],['avant_gauche','Avant gauche',21,163,128,203],['avant_droit','Avant droit',221,163,186,203]]){
   const widget=f.getField('excentricite_'+phase+'_'+position).acroField.getWidgets()[0],r=widget.getRectangle();
   if(position.startsWith('avant_'))widget.setRectangle({...r,y});
   const box={...r,x:x+dx,y};
   src+=cell(box)+text(title,box.x,y+21,7.7,box.width)+floorArrowPresentationV2695(box.x+(x<157?box.width:0),y+9,tx+dx,ty,{left:x<157});
  }
 }
 src+='Q';
 pdf.context.assign(ref,pdf.context.flateStream(src,{Type:'XObject',Subtype:'Form',BBox:[0,0,591,116],Resources:resources}));
 return true;
}

export async function normalizeReportMicroV2716(pdf,L,{key=''}={}){
 const N=L.PDFName.of,page=pdf.getPage(0),f=pdf.getForm(),marker=N('CDQReportMicroV2716');
 if(!f.getFieldMaybe('indicateur_fabricant')||!f.getFieldMaybe('imprimante_fabricant')||!f.getFieldMaybe('charge_point_1_charge_utilisee'))return false;
 if(!page.node.has(N('CDQReportLayoutV2713'))||!page.node.has(N('CDQReportLayoutV2704')))return false;
 if(page.node.has(marker)){
  const meta=page.node.lookup(marker,L.PDFDict),ref=meta.get(N('Stream')),contents=page.node.Contents(),i=contents.asArray().findIndex(x=>String(x)===String(ref));
  if(i>=0&&i!==contents.size()-1){contents.remove(i);contents.push(ref);return true;}
  return false;
 }
 const type=f.getFieldMaybe('type_balance'),label=type?.getText?.()||type?.getSelected?.().join(' ')||'';
 key=key||(/multi/i.test(label)?'multitete':/suspendue/i.test(label)?'suspendue':/track/i.test(label)?'trackscale':/train/i.test(label)?'train':/camion/i.test(label)?'camion':/table/i.test(label)?'table':/pr[eé]cision/i.test(label)?'precision':/cuve/i.test(label)?'cuve4':/tr[eé]mie/i.test(label)?'tremie4':/plancher/i.test(label)?'plancher':'other');
 const font=pdf.embedStandardFont(L.StandardFonts.HelveticaBold),r=n=>f.getField(n).acroField.getWidgets()[0].getRectangle();
 page.node.normalize();const resources=page.node.Resources(),fonts=resources.lookup(N('Font'),L.PDFDict),boldRef=fonts.get(N('CDQ2704Bold')),regularRef=fonts.get(N('CDQ2704Regular'));
 if(!boldRef||!regularRef)throw Error('Approved report fonts missing');
 fonts.set(N('CDQ2716Caption'),boldRef);fonts.set(N('CDQ2716Number'),regularRef);
 const layoutRef=page.node.get(N('CDQReportLayoutV2713')),layout=pdf.context.lookup(layoutRef);
 let src=read(layout,L),count=0;
 for(const[name,title]of Object.entries(captions))if(f.getFieldMaybe(name)){
  const box=r(name),encoded=String(font.encodeText(title));
  const regex=new RegExp('q '+ink.replaceAll('.','\\.')+' rg BT 0 Tc 0 Tw 100 Tz /CDQ2713 7 Tf [-\\d.e]+ [-\\d.e]+ Td '+encoded.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+' Tj ET Q\\n','g');
  const size=Math.min(8.4,(box.width-.6)/font.widthOfTextAtSize(title,1)),y=box.y+box.height+1+(10.5-size*.718)/2;
  let found=0;src=src.replace(regex,()=>{found++;return `q ${ink} rg BT 0 Tc 0 Tw 100 Tz /CDQ2716Caption ${number(size)} Tf ${number(box.x+(box.width-font.widthOfTextAtSize(title,size))/2)} ${number(y)} Td ${encoded} Tj ET Q\n`;});
  if(found!==1)throw Error('Block-2 caption anchor: '+name+' '+found);count++;
 }
 pdf.context.assign(layoutRef,pdf.context.flateStream(src));
 if(key==='table')adjustTable(pdf,L,font);
 const meta=page.node.lookup(N('CDQReportLayoutV2704'),L.PDFDict),scale=page.getWidth()/612,h=page.getHeight(),a4=h>820,gain=meta.lookup(N('Recovered'),L.PDFNumber).asNumber(),rowGap=meta.lookup(N('RowGap'),L.PDFNumber).asNumber(),gap=meta.lookup(N('Gap'),L.PDFNumber).asNumber();
 const left=10.8*scale,right=r('indicateur_fabricant').x-gap,bottom=r('imprimante_fabricant').y-rowGap/2;
 let art=`% CDQ report micro-correction V2716: category bottom and foreground circles\nq .02 .85 .94 RG .6 w ${left} ${bottom} m ${right} ${bottom} l S Q\n`;
 const centers=[[1,h-91*scale],[2,h-(a4?199.426:204.2)],[3,(a4?h-348.125:f.getFieldMaybe('type_plateau')?451:433.3)+gain]];
 if(key==='suspendue')centers.push([4,144]);
 else if(key==='multitete')centers.push([4,h-680.9]);
 else centers.push([4,h-(a4?518.6:key==='trackscale'?512:514.2)],[5,h-(a4?742.5:['precision','cuve4','tremie4'].includes(key)?690.9:680.9)]);
 for(const[n,y]of centers)art+=circle(n,23.4*scale,y,13.05*scale,scale);
 const ref=pdf.context.register(pdf.context.flateStream(art));page.node.addContentStream(ref);
 page.node.set(marker,pdf.context.obj({Stream:ref,Captions:count,Circles:centers.map(([n,y])=>[n,23.4*scale,y,13.05*scale]),Table:key==='table'}));
 return true;
}
