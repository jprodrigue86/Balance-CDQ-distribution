// Single painted data cells and model-specific layouts; all input values survive.
export function normalizeReportLayoutV2677(pdf,L,key=''){
 const N=L.PDFName.of,form=pdf.getForm(),page=pdf.getPage(0),type=form.getFieldMaybe('type_balance'),label=type?.getSelected?.().join(' ')||type?.getText?.()||'';
 key=key||(/suspendue/i.test(label)?'suspendue':/train/i.test(label)?'train':/pr[eé]cision/i.test(label)?'precision':'');
 if(/plancher/i.test(label)||key==='plancher')return false;
 if(!pdf.catalog.has(N('CDQReportRepairV2676'))&&!form.getFieldMaybe('type_plateau'))return false;
 if(!form.getFieldMaybe('charge_point_1_charge_utilisee'))return false;
 const marker=N('CDQReportLayoutV2677'),first=!page.node.has(marker),font=pdf.embedStandardFont(L.StandardFonts.HelveticaBold);
 if(form.getFieldMaybe('points_test')&&form.getFieldMaybe('_cdq_points_diagram_3')){const three=form.getField('points_test').getSelected()[0]==='3 points';form.getCheckBox('_cdq_points_diagram_3')[three?'check':'uncheck']();form.getCheckBox('_cdq_points_diagram_4')[three?'uncheck':'check']();const choice=form.getField('points_test'),value=choice.getSelected()[0];for(const w of choice.acroField.getWidgets()){const r=w.getRectangle(),size=11.25,src='q .6 .992157 .992157 rg .02 .85 .94 RG .6 w .3 .3 '+(r.width-.6)+' '+(r.height-.6)+' re B BT /CDQ77 '+size+' Tf 0 g '+((r.width-font.widthOfTextAtSize(value,size))/2)+' '+((r.height-size*.718)/2)+' Td '+font.encodeText(value)+' Tj ET Q';w.dict.set(N('AP'),pdf.context.obj({N:pdf.context.register(pdf.context.flateStream(src,{Type:'XObject',Subtype:'Form',BBox:[0,0,r.width,r.height],Resources:{Font:{CDQ77:font.ref}}}))}));}for(const phase of ['avant','apres'])for(const w of form.getField('excentricite_'+phase+'_arriere_droit').acroField.getWidgets())w.dict.set(N('F'),pdf.context.obj(three?2:4));}
 const text=(t,x,y,size=8,color='.114 .059 .871',centerWidth=0)=>'q '+color+' rg BT 0 Tc 0 Tw 100 Tz 0 Tr /CDQ77 '+size+' Tf '+(x+(centerWidth?(centerWidth-font.widthOfTextAtSize(t,size))/2:0))+' '+y+' Td '+font.encodeText(t)+' Tj ET Q\n';
 let art='';const cell=r=>'q .6 .992156863 .992156863 rg .02 .85 .94 RG .6 w '+[r.x,r.y,r.width,r.height].join(' ')+' re B Q\n';
 if(first&&key!=='precision'){
  const rows=form.getFields().filter(f=>/^charge_point_\d+_charge_utilisee$/.test(f.getName()));
  const firstR=rows[0].acroField.getWidgets()[0].getRectangle(),lastR=rows.at(-1).acroField.getWidgets()[0].getRectangle(),headerY=firstR.y+firstR.height+2;
  art+='q 1 1 1 rg 10 '+(lastR.y-1)+' '+(page.getWidth()-20)+' '+(headerY+18-lastR.y+2)+' re f Q\n';
  const columns=[['charge_utilisee','CHARGE UTILISÉE'],['charge_contrainte','CHARGE DE|CONTRAINTE'],['tolerance','TOLÉRANCE'],['avant_correction','AVANT|CORRECTION'],['erreur_avant','ERREUR (e)'],['apres_correction','APRÈS|CORRECTION'],['erreur_apres','ERREUR (e)'],['conforme_vert','CONFORME']];
  if(!form.getFieldMaybe('charge_point_1_charge_contrainte')){columns.splice(1,1);columns.unshift(['numero_tete','N° TÊTE']);for(const col of columns)if(col[0].startsWith('erreur'))col[1]='ERREUR';}
  const left=Math.min(...columns.map(([name])=>form.getField('charge_point_1_'+name).acroField.getWidgets()[0].getRectangle().x));
  const point={x:10.8,y:headerY,width:left-12.2,height:18};
  for(const [r,label] of [[point,'POINT'],...columns.map(([name,label])=>[{...form.getField('charge_point_1_'+name).acroField.getWidgets()[0].getRectangle(),y:headerY,height:18},label])]){
   art+='q 0 .32 .78 rg .02 .85 .94 RG .6 w '+[r.x,r.y,r.width,r.height].join(' ')+' re B Q\n';
   const lines=label.split('|'),size=lines.length===2?6.6:Math.min(7,(r.width-4)*7/font.widthOfTextAtSize(label,7));
   lines.forEach((line,i)=>art+=text(line,r.x,r.y+5+(lines.length-1-i)*7,size,'1 1 1',r.width));
  }
  for(const [i,row]of rows.entries()){
   const r=row.acroField.getWidgets()[0].getRectangle();art+='q 1 1 1 rg .02 .85 .94 RG .6 w 10.8 '+r.y+' '+point.width+' '+r.height+' re B Q\n'+text(String(i+1),10.8,r.y+(r.height-8)/2,10.5,'.114 .059 .871',point.width);
   for(const [name]of columns)art+=cell(form.getField('charge_point_'+(i+1)+'_'+name).acroField.getWidgets()[0].getRectangle());
  }
 }
 if(first&&key==='precision'){
  const groups=[['identification_balance','type_balance','type_plateau','etendue_verifiee','legal_pour_commerce'],['capacite_maximale','unite_mesure','echelon','resolution','etalon_utilise']];
  const labels=[['IDENTIFICATION DE LA BALANCE','TYPE DE BALANCE','TYPE DE PLATEAU','ÉTENDUE VÉRIFIÉE','LÉGAL POUR LE COMMERCE'],['CAPACITÉ MAXIMALE (Max)','UNITÉ DE MESURE','ÉCHELON (e)','RÉSOLUTION (d)','ÉTALON UTILISÉ']];
  const size=8.4,widths=labels[0].map((_,i)=>Math.max(...labels.map(row=>font.widthOfTextAtSize(row[i],size)))+8),extra=(590-20-widths.reduce((a,b)=>a+b,0))/5;
  art+='q 1 1 1 rg 10.5 467.5 591 56 re f Q\n';
  for(let row=0;row<2;row++){let x=11.5;for(let i=0;i<5;i++){
   const f=form.getField(groups[row][i]),w=f.acroField.getWidgets()[0],r=w.getRectangle(),width=113.8;w.setRectangle({...r,x,width});art+=cell({...r,x,width})+text(labels[row][i],x,r.y+r.height+3,Math.min(size,(width-2)/font.widthOfTextAtSize(labels[row][i],1)),'.114 .059 .871',width);x+=width+5;
  }}
 }
 function patchScripts(change){const seen=new Set();function walk(o){if(o instanceof L.PDFRef)o=pdf.context.lookup(o);if(!o||seen.has(o))return;seen.add(o);if(o instanceof L.PDFDict){if(o.get(N('S'))===N('JavaScript')){const s=o.lookup(N('JS'));let js=s instanceof L.PDFRawStream?new TextDecoder().decode(L.decodePDFRawStream(s).decode()):s?.decodeText?.()||'';if(js.includes('function cdqResults(d)')){const next=change(js);if(next!==js)o.set(N('JS'),L.PDFHexString.fromText(next));}}for(const[,v]of o.entries())walk(v);}else if(o instanceof L.PDFArray)for(const v of o.asArray())walk(v);else if(o instanceof L.PDFStream)walk(o.dict);}for(const[,o]of pdf.context.enumerateIndirectObjects())walk(o);}
 if(first&&key==='suspendue'){
  for(const f of form.getFields())if(/^(?:excentricite_|charge_excentricite|tolerance_excentricite)/.test(f.getName()))for(const w of f.acroField.getWidgets())w.dict.set(N('F'),pdf.context.obj(2));
  patchScripts(s=>s.replace(/"kind":\s*"central"/g,'"kind":"none"'));
  art+='q 1 1 1 rg 10 15 592 277 re f Q\nq 0 .32 .78 rg 10 263 592 21 re f Q\n'+'q .025 0 .31 rg 0 .9 .95 RG 1.3 w 34 274 m 34 280.075 29.075 285 23 285 c 16.925 285 12 280.075 12 274 c 12 267.925 16.925 263 23 263 c 29.075 263 34 267.925 34 274 c B Q\n'+text('4',12,267,18,'1 1 1',22)+text('CONCLUSION',46,269,10.5,'1 1 1')+text('RÉSUMÉ / COMMENTAIRES',11,249,8.4);
  const comments=form.getField('resume_commentaires').acroField.getWidgets()[0];comments.setRectangle({x:11.5,y:145,width:400,height:99});art+=cell(comments.getRectangle());
  for(const name of ['Bouton_Conforme','Bouton_NonConforme']){const w=form.getField(name).acroField.getWidgets()[0];w.setRectangle({x:424,y:144.5,width:176,height:100});}
 }
 if(first&&key==='train'){
  for(const f of form.getFields())if(/^B4_.*_P[3-6]_/.test(f.getName()))for(const w of f.acroField.getWidgets())w.dict.set(N('F'),pdf.context.obj(2));
  patchScripts(s=>s.replace(/(var cfg = )(\{.*?\})(, out =)/,(all,a,json,b)=>{const cfg=JSON.parse(json);for(const phase of ['avant','apres'])cfg.groups[phase]=cfg.groups[phase].filter(n=>/_P[12]_/.test(n));return a+JSON.stringify(cfg)+b;}));
  const top=page.getHeight()-618.8;art+='q 1 1 1 rg 10 '+(top-78)+' '+(page.getWidth()-20)+' 99 re f Q\n';
  const x=148.9,gap=2,width=(page.getWidth()-12-x-gap)/2;
  for(const [i,name]of ['SECTION 1','SECTION 2'].entries())art+='q 0 .32 .78 rg '+(x+i*(width+gap))+' '+top+' '+width+' 14 re f Q\n'+text(name,x+i*(width+gap),top+4,8,'1 1 1',width);
  for(const [i,[phase,direction,title]]of [['AvantCorrection','Aller','Avant correction · Aller'],['AvantCorrection','Retour','Avant correction · Retour'],['ApresCorrection','Aller','Après correction · Aller'],['ApresCorrection','Retour','Après correction · Retour']].entries()){
   const y=top-18-i*18;art+=text(title,12,y+5,6.9,'.035 .035 .32');
   for(let section=1;section<=2;section++){const f=form.getField('B4_'+direction+'_P'+section+'_'+phase),w=f.acroField.getWidgets()[0],r={x:x+(section-1)*(width+gap),y,width,height:16};w.setRectangle(r);art+=cell(r);}
  }
 }
 if(first){page.node.normalize();const resources=page.node.Resources(),fonts=resources.lookupMaybe(N('Font'),L.PDFDict)||pdf.context.obj({});fonts.set(N('CDQ77'),font.ref);resources.set(N('Font'),fonts);const ref=pdf.context.register(pdf.context.flateStream(art));page.node.addContentStream(ref);page.node.set(marker,ref);}
 // Strip old input frames from appearances; the page owns the single cell.
 for(const f of form.getFields())if(key==='precision'&&/^(identification_balance|type_balance|type_plateau|etendue_verifiee|legal_pour_commerce|capacite_maximale|unite_mesure|echelon|resolution|etalon_utilise)$/.test(f.getName())||key!=='precision'&&/^charge_point_\d+_(?!conforme)/.test(f.getName())||pdf.catalog.has(N('CDQDiagramV2677'))&&(/^(?:excentricite_(?:avant|apres)_|charge_excentricite$|tolerance_excentricite$)/.test(f.getName())||form.getFieldMaybe('points_test')&&/^(?:identification_balance|type_balance|etendue_verifiee|legal_pour_commerce|points_test)$/.test(f.getName())))for(const w of f.acroField.getWidgets()){
  const r=w.getRectangle(),old=w.dict.lookupMaybe(N('AP'),L.PDFDict)?.lookupMaybe(N('N'),L.PDFRawStream);if(!old)continue;
  const src=new TextDecoder().decode(L.decodePDFRawStream(old).decode()),bits=src.match(/BT[\s\S]*?ET/g)||[],text=f.getText?.()||f.getSelected?.().join(' ')||'';
  let source;if(key==='precision'){const size=text?Math.min(10.36,(r.width-4)*10.36/Math.max(1,font.widthOfTextAtSize(text,10.36))):10.36;source='q BT 0 Tc 0 Tw 100 Tz 0 Tr /CDQ77 '+size+' Tf 0 g '+((r.width-font.widthOfTextAtSize(text,size))/2)+' '+((r.height-size*.718)/2)+' Td '+font.encodeText(text)+' Tj ET Q';}else source='q '+bits.join('\n')+' Q';
  const resources=old.dict.lookupMaybe(N('Resources'),L.PDFDict)||pdf.context.obj({});if(key==='precision')resources.set(N('Font'),pdf.context.obj({CDQ77:font.ref}));
  w.dict.set(N('AP'),pdf.context.obj({N:pdf.context.register(pdf.context.flateStream(source,{Type:'XObject',Subtype:'Form',BBox:[0,0,r.width,r.height],Resources:resources}))}));w.dict.set(N('BS'),pdf.context.obj({W:0,S:'S'}));w.dict.set(N('Border'),pdf.context.obj([0,0,0]));
 }
 return true;
}
