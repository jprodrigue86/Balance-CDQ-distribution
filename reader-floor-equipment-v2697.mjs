// Cover the complete legacy category outlines; one page grid owns every border.
export function normalizeFloorEquipmentV2697(pdf,L){
 const N=L.PDFName.of,form=pdf.getForm(),type=form.getFieldMaybe('type_balance'),label=type?.getText?.()||type?.getSelected?.().join(' ')||'';
 if(!/plancher/i.test(label)&&!(form.getFieldMaybe('_visuel_type_balance')&&!form.getFieldMaybe('resolution')))return false;
 const prefixes=['indicateur','base_balance','imprimante'];if(!prefixes.every(p=>form.getFieldMaybe(p+'_fabricant')))return false;
 const page=pdf.getPage(0),marker=N('CDQFloorEquipmentV2697');let changed=false;
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
 for(const f of form.getFields())if(/^(indicateur|base_balance|imprimante)_(fabricant|modele|numero_serie|numero_am)$/.test(f.getName()))for(const w of f.acroField.getWidgets()){
  const old=w.dict.lookupMaybe(N('AP'),L.PDFDict)?.lookupMaybe(N('N'),L.PDFRawStream);if(!old)continue;const src=new TextDecoder().decode(L.decodePDFRawStream(old).decode());
  if(!/(?:\bre\s+[BbfS]|\bRG\b)/.test(src))continue;
  const r=w.getRectangle(),bits=src.match(/BT[\s\S]*?ET/g)||[];w.dict.set(N('AP'),pdf.context.obj({N:pdf.context.register(pdf.context.flateStream('q '+bits.join('\n')+' Q',{Type:'XObject',Subtype:'Form',BBox:[0,0,r.width,r.height],Resources:old.dict.lookupMaybe(N('Resources'),L.PDFDict)||pdf.context.obj({})}))}));w.dict.set(N('Border'),pdf.context.obj([0,0,0]));w.dict.set(N('BS'),pdf.context.obj({W:0,S:'S'}));changed=true;
 }
 return changed;
}
