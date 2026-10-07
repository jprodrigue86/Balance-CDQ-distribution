// The page owns the equipment grid. Widgets carry only their editable text,
// including when an external reader regenerates their appearances on save.
export function clearWidgetFrameV2702(pdf,L,widget){
 const N=L.PDFName.of;let changed=false;
 const border=widget.dict.get(N('Border')),bs=widget.dict.lookupMaybe(N('BS'),L.PDFDict);
 if(String(border)!=='[ 0 0 0 ]'||bs?.lookupMaybe(N('W'),L.PDFNumber)?.asNumber()!==0){
  widget.dict.set(N('Border'),pdf.context.obj([0,0,0]));widget.dict.set(N('BS'),pdf.context.obj({W:0,S:'S'}));changed=true;
 }
 const mk=widget.dict.lookupMaybe(N('MK'),L.PDFDict);
 for(const key of ['BG','BC'])if(mk?.has(N(key))){mk.delete(N(key));changed=true;}
 const old=widget.dict.lookupMaybe(N('AP'),L.PDFDict)?.lookup(N('N'));
 if(!(old instanceof L.PDFRawStream)&&!old?.getUnencodedContents)return changed;
 const source=new TextDecoder().decode(old instanceof L.PDFRawStream?L.decodePDFRawStream(old).decode():old.getUnencodedContents());
 if(/(?:\bre\s+[BbfS]|\bRG\b)/.test(source)){
  const r=widget.getRectangle(),text=source.match(/BT[\s\S]*?ET/g)||[];
  widget.dict.set(N('AP'),pdf.context.obj({N:pdf.context.register(pdf.context.flateStream('q '+text.join('\n')+' Q',{Type:'XObject',Subtype:'Form',BBox:[0,0,r.width,r.height],Resources:old.dict.lookupMaybe(N('Resources'),L.PDFDict)||pdf.context.obj({})}))}));changed=true;
 }
 return changed;
}

export function normalizeTruckEquipmentV2702(pdf,L){
 const N=L.PDFName.of,form=pdf.getForm();
 // Train shares the truck's historical field names; use its fixed report type
 // as well so the correction cannot repaint another equipment master.
 const type=form.getFieldMaybe('type_balance'),label=type?.getText?.()||type?.getSelected?.().join(' ')||'';
 if(!/camion/i.test(label)||!form.getFieldMaybe('B4_Aller_P1_AvantCorrection'))return false;
 const prefixes=['indicateur','base_balance','imprimante'],suffixes=['fabricant','modele','numero_serie','numero_am'];
 if(!prefixes.every(p=>form.getFieldMaybe(p+'_fabricant')))return false;
 const information=[['identification_balance','type_balance','etendue_verifiee','legal_pour_commerce'],['capacite_maximale','unite_mesure','echelon','etalon_utilise']];
 const page=pdf.getPage(0),marker=N('CDQTruckEquipmentV2702');let changed=false;
 if(!page.node.has(marker)){
  const bold=pdf.embedStandardFont(L.StandardFonts.HelveticaBold),regular=pdf.embedStandardFont(L.StandardFonts.Helvetica);
  page.node.normalize();const resources=page.node.Resources(),fonts=resources.lookupMaybe(N('Font'),L.PDFDict)||pdf.context.obj({});
  fonts.set(N('CDQTruckBold2702'),bold.ref);fonts.set(N('CDQTruckRegular2702'),regular.ref);resources.set(N('Font'),fonts);
  const rectangle=n=>form.getField(n).acroField.getWidgets()[0].getRectangle(),rows=prefixes.map(p=>rectangle(p+'_fabricant'));
  const left=10.8*page.getWidth()/612,right=rectangle('indicateur_numero_am').x+rectangle('indicateur_numero_am').width;
  const category=r=>({x:left,y:r.y,width:r.x-left-5,height:r.height});
  const cell=(r,fill)=>'q '+fill+' rg .02 .85 .94 RG .6 w '+[r.x,r.y,r.width,r.height].join(' ')+' re B Q\n';
  const text=(label,r,size,font,resource,color)=>{
   size=Math.min(size,(r.width-8)/font.widthOfTextAtSize(label,1));
   return 'q '+color+' rg BT /'+resource+' '+size+' Tf '+(r.x+(r.width-font.widthOfTextAtSize(label,size))/2)+' '+(r.y+(r.height-size*.718)/2)+' Td '+font.encodeText(label)+' Tj ET Q\n';
  };
  // Legacy category lines extend beyond the widget by two points. Cover the
  // entire header/data region, rather than leaving the printer's ghost line.
  const headerY=rows[0].y+rows[0].height+3.185,height=15.533;
  let art='% CDQ single truck equipment grid V2702\nq 1 1 1 rg '+(left-1.6)+' '+(rows[2].y-2.6)+' '+(right-left+3.2)+' '+(headerY+height-rows[2].y+3.2)+' re f Q\n';
  const headers=[category(rows[0]),...suffixes.map(s=>rectangle('indicateur_'+s))];
  for(const[i,r]of headers.entries()){
   const h={...r,y:headerY,height};art+=cell(h,'0 .32 .79')+text(['CATÉGORIE','FABRICANT','MODÈLE','N° DE SÉRIE','N° A-M'][i],h,6.1,regular,'CDQTruckRegular2702','1 1 1');
  }
  for(const[i,prefix]of prefixes.entries()){
   const r=category(rows[i]);art+=cell(r,'1 1 1')+text(['Indicateur','Base de la balance','Imprimante'][i],r,11.25,bold,'CDQTruckBold2702','.114 .059 .871');
   for(const suffix of suffixes){const field=form.getFieldMaybe(prefix+'_'+suffix);if(field)for(const w of field.acroField.getWidgets())art+=cell(w.getRectangle(),'.6 .992156863 .992156863');}
  }
  for(const names of information){
   const r=rectangle(names[0]);art+='q 1 1 1 rg '+(left-1.6)+' '+(r.y-1.6)+' '+(right-left+3.2)+' '+(r.height+3.2)+' re f Q\n';
   for(const name of names)for(const w of form.getField(name).acroField.getWidgets())art+=cell(w.getRectangle(),'.6 .992156863 .992156863');
  }
  const ref=pdf.context.register(pdf.context.flateStream(art));page.node.addContentStream(ref);page.node.set(marker,ref);changed=true;
 }
 const names=new Set(information.flat());
 for(const p of prefixes)for(const s of suffixes)names.add(p+'_'+s);
 for(const f of form.getFields())if(names.has(f.getName()))for(const w of f.acroField.getWidgets())changed=clearWidgetFrameV2702(pdf,L,w)||changed;
 return changed;
}
