import {normalizeFloorEquipmentV2697} from './reader-floor-equipment-v2697.mjs';
// Native PDF layout fixes. Existing field names, readings and calibration rules survive.
const images=new Map();
async function imageBytes(key,supplied){
 if(supplied?.[key])return supplied[key];
 if(!images.has(key))images.set(key,fetch(new URL('./assets/report-art-v2695/'+key+'.png',import.meta.url)).then(async r=>{if(!r.ok)throw Error('Image du rapport indisponible : '+key);return new Uint8Array(await r.arrayBuffer());}).catch(e=>{images.delete(key);throw e;}));
 return images.get(key);
}
export function floorArrowPresentationV2695(sx,sy,tx,ty,{left=tx>sx}={}){
 const dx=tx-sx,dy=ty-sy,length=Math.hypot(dx,dy),ux=dx/length,uy=dy/length;
 const referenceLength=Math.hypot(41,-10),rx=41/referenceLength,ry=-10/referenceLength;
 const point=(x,y)=>{
  const projected=x*rx+y*ry,headScale=Math.min(1,length/referenceLength),headStart=.65*referenceLength;
  const along=projected>=headStart?length-(referenceLength-projected)*headScale:projected/headStart*(length-(referenceLength-headStart)*headScale);
  const across=(-x*ry+y*rx)*(left?1:-1)*Math.min(1,length/24);
  return [sx+ux*along-uy*across,sy+uy*along+ux*across].map(v=>+v.toFixed(3)).join(' ');
 };
 return '% CDQ floor arrow V2689\nq .01 .15 .64 rg .7 .76 .84 RG .45 w '+point(0,0)+' m '+point(10,8.5)+' '+point(24,7.5)+' '+point(32,-2)+' c '+point(34,1)+' l '+point(41,-10)+' l '+point(28,-7)+' l '+point(30.2,-4.8)+' l '+point(21,2.7)+' '+point(10,3)+' '+point(0,0)+' c h B Q\n';
}
export async function normalizeReportPresentationV2695(pdf,L,{key='',imageData}={}){
 const N=L.PDFName.of,form=pdf.getForm(),page=pdf.getPage(0),label=form.getFieldMaybe('type_balance')?.getSelected?.().join(' ')||form.getFieldMaybe('type_balance')?.getText?.()||'';
 if(!form.getFieldMaybe('charge_point_1_charge_utilisee')||!['indicateur','base_balance','imprimante'].every(p=>form.getFieldMaybe(p+'_fabricant')))return false;
 key=key||(/multi/i.test(label)?'multitete':/camion/i.test(label)?'camion':/table/i.test(label)?'table':'other');
 if(key==='table'&&!form.getFieldMaybe('_cdq_points_diagram_4')||key==='multitete'&&!page.node.has(N('CDQReportLayoutV2677')))return false;
 const marker=N('CDQReportPresentationV2695'),first=!pdf.catalog.has(marker),font=pdf.embedStandardFont(L.StandardFonts.HelveticaBold);let appearanceChanged=false;
 const read=o=>new TextDecoder().decode(L.decodePDFRawStream(o).decode());
 const text=(s,x,y,size=8,color='.114 .059 .871',width=0)=>{
  if(width)size=Math.min(size,(width-3)/Math.max(1,font.widthOfTextAtSize(s,1)));
  return 'q '+color+' rg BT 0 Tc 0 Tw 100 Tz 0 Tr /CDQ95 '+size+' Tf '+(x+(width?(width-font.widthOfTextAtSize(s,size))/2:0))+' '+y+' Td '+font.encodeText(s)+' Tj ET Q\n';
 };
 const cell=(r,fill='.6 .992156863 .992156863')=>'q '+fill+' rg .02 .85 .94 RG .6 w '+[r.x,r.y,r.width,r.height].join(' ')+' re B Q\n';
 const plainAppearance=f=>{for(const w of f.acroField.getWidgets()){
  const old=w.dict.lookupMaybe(N('AP'),L.PDFDict)?.lookupMaybe(N('N'),L.PDFRawStream);if(!old)continue;
  const src=read(old),bits=src.match(/BT[\s\S]*?ET/g)||[],r=w.getRectangle();
  if(!/(?:\bre\s+[BbfS]|\bRG\b)/.test(src))continue;
  appearanceChanged=true;
  w.dict.set(N('AP'),pdf.context.obj({N:pdf.context.register(pdf.context.flateStream('q '+bits.join('\n')+' Q',{Type:'XObject',Subtype:'Form',BBox:[0,0,r.width,r.height],Resources:old.dict.lookupMaybe(N('Resources'),L.PDFDict)||pdf.context.obj({})}))}));
  w.dict.set(N('Border'),pdf.context.obj([0,0,0]));w.dict.set(N('BS'),pdf.context.obj({W:0,S:'S'}));
 }};
 if(first){
  page.node.normalize();const resources=page.node.Resources(),fonts=resources.lookupMaybe(N('Font'),L.PDFDict)||pdf.context.obj({});fonts.set(N('CDQ95'),font.ref);resources.set(N('Font'),fonts);
  let art='';
  // Repaint the equipment rows once, including the spaces between columns.
  // This removes the long cyan remnants of the old continuous table grid.
  const prefixes=['indicateur','base_balance','imprimante'];
  const rows=prefixes.map(p=>form.getField(p+'_fabricant').acroField.getWidgets()[0].getRectangle()),left=10.8*page.getWidth()/612,right=page.getWidth()-12.3*page.getWidth()/612;
  art+='q 1 1 1 rg '+(left-1)+' '+(rows[2].y-1)+' '+(right-left+2)+' '+(rows[0].y+rows[0].height-rows[2].y+2)+' re f Q\n';
  for(const [i,prefix]of prefixes.entries()){
   const r=rows[i],category={x:left,y:r.y,width:r.x-left-5,height:r.height};art+=cell(category,'1 1 1')+text(['Indicateur','Base de la balance','Imprimante'][i],category.x+2,r.y+2.4,11.25,'.114 .059 .871',category.width-4);
   for(const suffix of ['fabricant','modele','numero_serie','numero_am']){const f=form.getFieldMaybe(prefix+'_'+suffix);if(f)for(const w of f.acroField.getWidgets())art+=cell(w.getRectangle());}
  }
  if(key==='table'){
   const f=form.getField('_cdq_points_diagram_4'),w=f.acroField.getWidgets()[0],ap=w.dict.lookup(N('AP'),L.PDFDict).lookup(N('N'),L.PDFDict),ref=ap.get(N('Yes')),old=pdf.context.lookup(ref),hardware=old.dict.lookup(N('Resources'),L.PDFDict).lookup(N('XObject'),L.PDFDict).get(N('Hardware4'));
   let src='q 1 0 0 1 -10.5 -148 cm q 1 1 1 rg 10.5 148 591 116 re f Q\n';
   for(const [phase,dx]of [['avant',0],['apres',300]]){
    src+='q .4 .67 .83 RG .5 w '+(11+dx)+' 149 292 115 re S Q\n'+text(phase==='avant'?'AVANT CORRECTION':'APRÈS CORRECTION',11+dx,255,10.5,'.035 .035 .32',292);
    src+='q 112 0 0 74.666667 '+(101+dx)+' 164 cm /Hardware4 Do Q\n';
    for(const [position,title,x,y,tx,ty]of [['arriere_gauche','Arrière gauche',21,205,117.8,233.2],['arriere_droit','Arrière droit',221,205,198,233.2],['avant_gauche','Avant gauche',21,153,108.7,205.6],['avant_droit','Avant droit',221,153,205.3,205.6]]){
     const field=form.getField('excentricite_'+phase+'_'+position),widget=field.acroField.getWidgets()[0],r={x:x+dx,y,width:72,height:18};widget.setRectangle(r);
     src+=cell(r)+text(title,r.x,y+21,7.7,'.114 .059 .871',72)+floorArrowPresentationV2695(x+dx+(x<157?72:0),y+9,tx+dx,ty,{left:x<157});
    }
   }
   src+='Q';pdf.context.assign(ref,pdf.context.flateStream(src,{Type:'XObject',Subtype:'Form',BBox:[0,0,591,116],Resources:{Font:{CDQ95:font.ref},XObject:{Hardware4:hardware}}}));
  }
  if(key==='multitete'){
   const columns=[['numero_tete','N° TÊTE'],['charge_utilisee','CHARGE|UTILISÉE'],['tolerance','TOLÉRANCE'],['avant_correction','AVANT|CORRECTION'],['erreur_avant','ERREUR'],['apres_correction','APRÈS|CORRECTION'],['erreur_apres','ERREUR'],['conforme_vert','CONFORME']],gap=1.2,width=(436-10.8-gap*8)/9;
   const firstR=form.getField('charge_point_1_charge_utilisee').acroField.getWidgets()[0].getRectangle(),lastR=form.getField('charge_point_14_charge_utilisee').acroField.getWidgets()[0].getRectangle(),headerY=firstR.y+firstR.height+2;
   let table='q 1 1 1 rg 10 '+(lastR.y-1)+' 592 '+(headerY+20-lastR.y+2)+' re f Q\n';
   for(const [i,[suffix,title]]of [['point','POINT'],...columns].entries()){
    const r={x:10.8+i*(width+gap),y:headerY,width,height:18};table+=cell(r,'0 .32 .78');
    const lines=title.split('|');lines.forEach((line,j)=>table+=text(line,r.x,headerY+5+(lines.length-1-j)*7,6.5,'1 1 1',width));
   }
   for(let i=1;i<=14;i++){
    const row=form.getField('charge_point_'+i+'_charge_utilisee').acroField.getWidgets()[0].getRectangle();
    table+=cell({x:10.8,y:row.y,width,height:row.height},'1 1 1')+text(String(i),10.8,row.y+4.5,10.5,'.114 .059 .871',width);
    for(const [j,[suffix]]of columns.entries())for(const name of suffix==='conforme_vert'?['conforme_vert','conforme_rouge']:[suffix]){
     const f=form.getField('charge_point_'+i+'_'+name);for(const w of f.acroField.getWidgets())w.setRectangle({x:10.8+(j+1)*(width+gap),y:row.y,width,height:row.height});if(name!=='conforme_rouge')table+=cell(f.acroField.getWidgets()[0].getRectangle());
    }
   }
   const layout=page.node.get(N('CDQReportLayoutV2677'));if(!layout)throw Error('Multi-têtes table layout is missing');pdf.context.assign(layout,pdf.context.flateStream(table));
   const image=await pdf.embedPng(await imageBytes('multitete',imageData));
   const xobjects=resources.lookupMaybe(N('XObject'),L.PDFDict)||pdf.context.obj({});xobjects.set(N('CDQMulti95'),image.ref);resources.set(N('XObject'),xobjects);
   art+='q .4 .67 .83 RG .5 w 447 '+lastR.y+' 153 '+(headerY+18-lastR.y)+' re S Q\n'+cell({x:447,y:headerY,width:153,height:18},'0 .32 .78')+text('BALANCE MULTI-TÊTES',447,headerY+6,7,'1 1 1',153);
   const hw=147,hh=hw*image.height/image.width,y=lastR.y+22+(headerY-lastR.y-28-hh)/2;
   art+='q '+hw+' 0 0 '+hh+' 450 '+y+' cm /CDQMulti95 Do Q\n'+text('14 TÊTES · 14 ESSAIS',447,lastR.y+7,7,'.114 .059 .871',153);
  }
  if(key==='camion'){
   const originals=pdf.context.enumerateIndirectObjects().filter(([,o])=>o instanceof L.PDFRawStream&&o.dict.get(N('Subtype'))===N('Image')&&o.dict.lookup(N('Width'),L.PDFNumber).asNumber()>1000&&o.dict.lookup(N('Height'),L.PDFNumber).asNumber()<300);
   if(originals.length!==1)throw Error('Unexpected truck photograph count');
   const firstPoint=form.getField('B4_Aller_P1_AvantCorrection').acroField.getWidgets()[0].getRectangle(),hy=firstPoint.y+firstPoint.height+2;
   art+='q 1 1 1 rg 10 '+(hy-.5)+' '+(page.getWidth()-20)+' 13 re f Q\n';
   const header=[['CORRECTION',{x:10.8,y:hy,width:92.5,height:12}],['TRAJET',{x:105.3,y:hy,width:41.6,height:12}],...Array.from({length:6},(_,i)=>[String(i+1),{...form.getField('B4_Aller_P'+(i+1)+'_AvantCorrection').acroField.getWidgets()[0].getRectangle(),y:hy,height:12}])];
   for(const [title,r]of header)art+=cell(r,'0 .32 .78')+text(title,r.x,hy+3,7,'1 1 1',r.width);
   const image=await pdf.embedPng(await imageBytes('camion',imageData));
   // Clip the white canvas around the generated panorama in the PDF itself.
   pdf.context.assign(originals[0][0],pdf.context.flateStream('q 0 0 1 1 re W n 1 0 0 '+(725/255)+' 0 '+(-(725-495)/255)+' cm /Camion95 Do Q',{Type:'XObject',Subtype:'Form',BBox:[0,0,1,1],Resources:{XObject:{Camion95:image.ref}}}));
  }
  const ref=pdf.context.register(pdf.context.flateStream(art));page.node.addContentStream(ref);pdf.catalog.set(marker,L.PDFNumber.of(2695));
 }
 // Saves can regenerate widget borders: the page is the sole grid owner.
 for(const f of form.getFields())if(/^(?:indicateur|base_balance|imprimante)_(?:fabricant|modele|numero_serie|numero_am)$/.test(f.getName())||key==='table'&&/^excentricite_(?:avant|apres)_/.test(f.getName())||key==='multitete'&&/^charge_point_\d+_(?!conforme)/.test(f.getName()))plainAppearance(f);
 return normalizeFloorEquipmentV2697(pdf,L)||first||appearanceChanged;
}
