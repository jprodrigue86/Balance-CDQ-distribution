// Cover the complete legacy category outlines; one page grid owns every border.
export function normalizeFloorEquipmentV2697(pdf,L){
 const N=L.PDFName.of,form=pdf.getForm(),type=form.getFieldMaybe('type_balance'),label=type?.getText?.()||type?.getSelected?.().join(' ')||'';
 if(!/plancher/i.test(label)&&!(form.getFieldMaybe('_visuel_type_balance')&&!form.getFieldMaybe('resolution')))return false;
 const prefixes=['indicateur','base_balance','imprimante'];if(!prefixes.every(p=>form.getFieldMaybe(p+'_fabricant')))return false;
 const page=pdf.getPage(0),marker=N('CDQFloorEquipmentV2697');let changed=false;
 // The approved older master paints its fixed type in a checkbox appearance.
 // Keep that historical field hidden and expose the same fixed text normally.
 if(!type){
  const visual=form.getFieldMaybe('_visuel_type_balance'),r=visual?.acroField.getWidgets()[0]?.getRectangle();
  if(r){const fixed=form.createTextField('type_balance'),font=pdf.embedStandardFont(L.StandardFonts.HelveticaBold);fixed.setText('Balance de Plancher');fixed.enableReadOnly();fixed.setAlignment(L.TextAlignment.Center);fixed.addToPage(page,{x:r.x+1,y:r.y+1,width:r.width-2,height:r.height-2,borderWidth:0,font,backgroundColor:L.rgb(.6,.992156863,.992156863),textColor:L.rgb(.114,.059,.871)});fixed.setFontSize(11.25);fixed.updateAppearances(font);
   for(const w of visual.acroField.getWidgets()){
    w.dict.set(N('F'),L.PDFNumber.of(34));const empty=pdf.context.register(pdf.context.flateStream('q Q',{Type:'XObject',Subtype:'Form',BBox:[0,0,r.width,r.height]})),normal=w.dict.lookupMaybe(N('AP'),L.PDFDict)?.lookup(N('N'));
    w.dict.set(N('AP'),pdf.context.obj({N:normal instanceof L.PDFDict?Object.fromEntries(normal.keys().map(k=>[k.decodeText(),empty])):empty}));
   }changed=true;
  }
 }
 if(!pdf.catalog.has(marker)){
  const font=pdf.embedStandardFont(L.StandardFonts.HelveticaBold);page.node.normalize();const resources=page.node.Resources(),fonts=resources.lookupMaybe(N('Font'),L.PDFDict)||pdf.context.obj({});fonts.set(N('CDQ97'),font.ref);resources.set(N('Font'),fonts);
  const rectangle=n=>form.getField(n).acroField.getWidgets()[0].getRectangle(),r1=rectangle('charge_point_1_charge_utilisee'),r2=rectangle('charge_point_1_charge_contrainte');
  // Block 3's painted cells extend one point beyond each widget edge.
  const gap=r2.x-r1.x-r1.width-2;
  const rows=prefixes.map(p=>rectangle(p+'_fabricant')),left=10.8*page.getWidth()/612,right=page.getWidth()-12.3*page.getWidth()/612;
  // Old category boxes extend two points past the editable widget bounds.
  let art='q 1 1 1 rg '+(left-1.2)+' '+(rows[2].y-2.6)+' '+(right-left+2.4)+' '+(rows[0].y+rows[0].height-rows[2].y+5.2)+' re f Q\n';
  const cell=(r,fill)=>'q '+fill+' rg .02 .85 .94 RG .6 w '+[r.x,r.y,r.width,r.height].join(' ')+' re B Q\n';
  for(const [i,prefix]of prefixes.entries()){
   const r={...rows[i],y:rows[i].y-1,height:rows[i].height+2},category={x:left,y:r.y,width:r.x-left-gap,height:r.height},label=['Indicateur','Base de la balance','Imprimante'][i];art+=cell(category,'1 1 1');
   const size=Math.min(11.25,(category.width-4)/font.widthOfTextAtSize(label,1)),x=category.x+(category.width-font.widthOfTextAtSize(label,size))/2;
   art+='q .114 .059 .871 rg BT /CDQ97 '+size+' Tf '+x+' '+(r.y+2.4)+' Td '+font.encodeText(label)+' Tj ET Q\n';
   const fields=['fabricant','modele','numero_serie','numero_am'].map(s=>form.getFieldMaybe(prefix+'_'+s));
   for(let j=0;j<fields.length;j++){const f=fields[j];if(!f)continue;for(const w of f.acroField.getWidgets()){
    const old=w.getRectangle(),next=j<3?rectangle('indicateur_'+['fabricant','modele','numero_serie','numero_am'][j+1]).x:right+gap;w.setRectangle({...old,y:r.y,height:r.height,width:next-old.x-gap});art+=cell(w.getRectangle(),'.6 .992156863 .992156863');
   }}
  }
  const ref=pdf.context.register(pdf.context.flateStream(art));page.node.addContentStream(ref);page.node.set(N('CDQFloorEquipmentStreamV2697'),ref);pdf.catalog.set(marker,pdf.context.obj(true));changed=true;
 }
 const informationRows=[['identification_balance','type_balance','etendue_verifiee','legal_pour_commerce'],['capacite_maximale','unite_mesure','echelon','etalon_utilise']],informationNames=new Set(informationRows.flat());
 if(!pdf.catalog.has(N('CDQFloorInformationV2697'))){
  const rectangle=n=>form.getField(n).acroField.getWidgets()[0].getRectangle(),a=rectangle('charge_point_1_charge_utilisee'),b=rectangle('charge_point_1_charge_contrainte'),gap=b.x-a.x-a.width-2;
  let art='';
  for(const names of informationRows){
   const old=names.map(rectangle),left=old[0].x-1,right=old.at(-1).x+old.at(-1).width+1;
   art+='q 1 1 1 rg '+(left-.5)+' '+(old[0].y-1.5)+' '+(right-left+1)+' '+(old[0].height+3)+' re f Q\n';
   for(const [i,n]of names.entries())for(const w of form.getField(n).acroField.getWidgets()){
    const r={x:old[i].x-1,y:old[i].y-1,width:(i<3?old[i+1].x-1-gap:right)-(old[i].x-1),height:old[i].height+2};w.setRectangle(r);
    art+='q .6 .992156863 .992156863 rg .02 .85 .94 RG .6 w '+[r.x,r.y,r.width,r.height].join(' ')+' re B Q\n';
   }
  }
  const ref=pdf.context.register(pdf.context.flateStream(art));page.node.addContentStream(ref);page.node.set(N('CDQFloorInformationStreamV2697'),ref);pdf.catalog.set(N('CDQFloorInformationV2697'),pdf.context.obj(true));changed=true;
 }
 for(const f of form.getFields())if(informationNames.has(f.getName())||/^(indicateur|base_balance|imprimante)_(fabricant|modele|numero_serie|numero_am)$/.test(f.getName()))for(const w of f.acroField.getWidgets()){
  const old=w.dict.lookupMaybe(N('AP'),L.PDFDict)?.lookup(N('N'));if(!(old instanceof L.PDFRawStream)&&!old?.getUnencodedContents)continue;const src=new TextDecoder().decode(old instanceof L.PDFRawStream?L.decodePDFRawStream(old).decode():old.getUnencodedContents());
  if(!/(?:\bre\s+[BbfS]|\bRG\b)/.test(src))continue;
  const r=w.getRectangle(),bits=src.match(/BT[\s\S]*?ET/g)||[];w.dict.set(N('AP'),pdf.context.obj({N:pdf.context.register(pdf.context.flateStream('q '+bits.join('\n')+' Q',{Type:'XObject',Subtype:'Form',BBox:[0,0,r.width,r.height],Resources:old.dict.lookupMaybe(N('Resources'),L.PDFDict)||pdf.context.obj({})}))}));w.dict.set(N('Border'),pdf.context.obj([0,0,0]));w.dict.set(N('BS'),pdf.context.obj({W:0,S:'S'}));changed=true;
 }
 return changed;
}
