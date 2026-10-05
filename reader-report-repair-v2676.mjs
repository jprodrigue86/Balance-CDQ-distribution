// Repair the twelve report families requested for V26.76. The two approved
// references, Plancher and Précision (including special copies), are excluded.
export const repairedReportKeysV2676=Object.freeze(['table','camion','train','cuve3','cuve4','tremie3','tremie4','chariot','convoyeur','multitete','suspendue','trackscale']);
export function repairReportFormV2676(pdf,L,key){
 const {PDFName,PDFDict,PDFArray,PDFRawStream,PDFHexString,PDFString,StandardFonts,decodePDFRawStream}=L,N=PDFName.of,form=pdf.getForm();
 const read=o=>o instanceof PDFRawStream?new TextDecoder().decode(decodePDFRawStream(o).decode()):o?.decodeText?.()||'';
 const status=form.getFieldMaybe('Statut_conformite'),action=status?.acroField.dict.lookupMaybe(N('AA'),PDFDict)?.lookupMaybe(N('C'),PDFDict),owner=action?read(action.lookup(N('JS'))):'';
 const marked=pdf.catalog.get(N('CDQReportRepairV2676'))?.decodeText?.();
 const type=form.getFieldMaybe('type_balance'),label=type?.getSelected?.().join(' ')||type?.getText?.()||'';
 if(key&&!repairedReportKeysV2676.includes(key)||form.getFieldMaybe('resolution')||/plancher/i.test(label))return false;
 if(!key&&!marked&&(!form.getFieldMaybe('Bouton_ACompleter')||!owner.includes('function cdqResults(d)')))return false;
 if(!owner.includes('function cdqResults(d)'))return false;
 const mass=/"mass":\s*true/.test(owner),font=pdf.embedStandardFont(StandardFonts.HelveticaBold);
 // Keep each model's tolerance, row count, mass units and corner configuration.
 // As on Plancher, a started but incomplete correction cannot erase a red result.
 function patchCalculation(dict){
  const previous=read(dict.lookup(N('JS')));if(!previous.includes('function cdqResults(d)')||previous.includes('// CDQ report calculations V2676'))return;
  let next=previous.replace('var b=group("avant"),a=group("apres"),g=a.any?a:b;',
   'var b=group("avant"),a=group("apres"),g=a.any?a:b;\n    var correctionComplete=true;\n    if(a.any&&cfg.kind==="train")for(var slot=0;slot<cfg.groups.avant.length;slot++)if(raw(cfg.groups.avant[slot])!==""&&!isFinite(num(cfg.groups.apres[slot])))correctionComplete=false;');
  next=next.replace('if(usable&&g.any&&!g.invalid&&(g.complete||(cfg.kind==="train"&&g.count>0))) {',
   'if(usable&&g.any&&!g.invalid&&correctionComplete&&(g.complete||(cfg.kind==="train"&&g.count>0))) {');
  next=next.replace('g4=!r4;\n    }\n    check("excentricite_statut_conforme",g4);',
   'g4=!r4;\n    }else if(g.any){r4=true;}\n    check("excentricite_statut_conforme",g4);');
  next=next.replace('out.Statut_conformite=failed?"Non conforme":complete?"Conforme":"À compléter";',
   'out.Statut_conformite=failed?"Non conforme":complete?"Conforme":"";');
  next=next.replace('check("Bouton_Conforme",complete&&!failed);check("Bouton_NonConforme",failed);check("Bouton_ACompleter",!complete&&!failed);',
   'check("Bouton_Conforme",!failed);check("Bouton_NonConforme",failed);');
  if(previous.includes('function eccentricityTolerance(c, e)')){
   next=next.replace('var active = a.any ? a : b;',
    'var active = a.any ? a : b;\n  var correctionComplete=true;\n  if(a.any)for(var direction=0;direction<2;direction++)for(var position=1;position<=6;position++){var stem="B4_"+(direction===0?"Aller":"Retour")+"_P"+position+"_";if(raw(stem+"AvantCorrection")!==""&&!isFinite(num(stem+"ApresCorrection")))correctionComplete=false;}');
   next=next.replace('if (isFinite(limit) && active.count > 0) {','if (isFinite(limit) && active.count > 0 && !active.invalid && correctionComplete) {');
   next=next.replace('g4 = !r4 && !active.invalid;\n  }','g4 = !r4;\n  }else if(active.any){r4=true;}');
   next=next.replace('check("Bouton_Conforme",complete);','check("Bouton_Conforme",!(anyBad || r4));').replace('check("Bouton_ACompleter",!complete && !(anyBad || r4));','');
   next=next.replace('out.Statut_conformite = anyBad || r4 ? "Non conforme" : complete ? "Conforme" : "À compléter";','out.Statut_conformite = anyBad || r4 ? "Non conforme" : complete ? "Conforme" : "";');
  }
  if(next!==previous)dict.set(N('JS'),PDFHexString.fromText('// CDQ report calculations V2676\n'+next));
 }
 const visited=new Set();
 function visit(object){
  if(object instanceof L.PDFRef)object=pdf.context.lookup(object);
  if(!object||visited.has(object))return;visited.add(object);
  if(object instanceof PDFDict){if(object.get(N('S'))===N('JavaScript'))patchCalculation(object);for(const [,child]of object.entries())visit(child);}
  else if(object instanceof PDFArray)for(const child of object.asArray())visit(child);
  else if(object instanceof L.PDFStream)visit(object.dict);
 }
 for(const [,object]of pdf.context.enumerateIndirectObjects())visit(object);
 function remove(field){
  const order=form.acroForm.dict.lookupMaybe(N('CO'),PDFArray);if(order)for(let i=order.size()-1;i>=0;i--)if(String(order.get(i))===String(field.ref))order.remove(i);
  form.removeField(field);
 }
 for(const field of [...form.getFields()])if(field.getName()==='Bouton_ACompleter'||/^excentricite_statut_(?:texte|crochet|x|crochet_gauche)_adobe$/.test(field.getName()))remove(field);
 // The old truck pending button had a duplicate page reference. Removing the
 // field can leave that second reference behind; discard only missing objects.
 for(const page of pdf.getPages()){
  const annotations=page.node.Annots();if(annotations)for(let i=annotations.size()-1;i>=0;i--)if(!pdf.context.lookup(annotations.get(i)))annotations.remove(i);
 }
 const stream=(source,w,h)=>pdf.context.register(pdf.context.flateStream(source,{Type:'XObject',Subtype:'Form',FormType:1,BBox:[0,0,w,h],Resources:{Font:{CDQ76:font.ref}}}));
 const cyan='0.6 0.992157 0.992157';
 for(const field of form.getFields()){
  const name=field.getName();if(!field.getText&&!field.getSelected||/^_|^Statut_|statut_/i.test(name))continue;
  const options=field.getOptions?.(),selections=field.getSelected?.();
  let text=field.getText?field.getText()||'':selections.join(' + ');
  if(options&&selections){const raw=field.acroField.getOptions();text=selections.map(v=>raw.find(o=>o.value.decodeText()===v)?.display?.decodeText()||v).join(' + ');}
  const numeric=Number(String(text).replace(',','.'));
  if(text!==''&&Number.isFinite(numeric)){
   if(/^(?:charge_point_\d+_tolerance|tolerance_excentricite)$/.test(name))text='±'+String(numeric).replace('.',',')+(mass?'':'e');
   else if(/^charge_point_\d+_erreur_(avant|apres)$/.test(name))text=(numeric>0?'+':'')+String(numeric).replace('.',',')+(mass?'':'e');
  }
  for(const widget of field.acroField.getWidgets()){
   const {width:w,height:h}=widget.getRectangle();if(w<3||h<3)continue;
   const mk=widget.dict.lookupMaybe(N('MK'),PDFDict)||pdf.context.obj({});mk.set(N('BG'),pdf.context.obj([.6,.992157,.992157]));mk.set(N('BC'),pdf.context.obj([.02,.85,.94]));widget.dict.set(N('MK'),mk);
   widget.dict.set(N('BS'),pdf.context.obj({W:.6,S:'S'}));widget.dict.set(N('Border'),pdf.context.obj([0,0,.6]));
   const nominal=Math.min(name==='resume_commentaires'?10:11.25,h*.74);
   let size=nominal,lines=[];
   const wrap=s=>{const result=[];for(const para of text.split('\n')){let line='';for(const word of para.split(' ')){const next=line?line+' '+word:word;if(line&&font.widthOfTextAtSize(next,s)>w-4){result.push(line);line=word;}else line=next;}result.push(line);}return result;};
   if(h>20&&(field.isMultiline?.()||selections)){
    for(;size>3.5;size-=.25){lines=wrap(size);if(lines.length*size*1.15<=h-2&&lines.every(t=>font.widthOfTextAtSize(t,size)<=w-4))break;}
   }else{size=text?Math.min(size,(w-4)*size/Math.max(1,font.widthOfTextAtSize(text,size))):size;lines=[text];}
   let src='% CDQ cyan input V2676\nq '+cyan+' rg .02 .85 .94 RG .6 w .3 .3 '+(w-.6)+' '+(h-.6)+' re B 1 1 '+(w-2)+' '+(h-2)+' re W n BT 0 Tc 0 Tw 100 Tz 0 Tr /CDQ76 '+size+' Tf 0 g\n';
   const top=(h-size*.718)/2+(lines.length-1)*size*1.15/2;
   for(let i=0;i<lines.length;i++)src+='1 0 0 1 '+Math.max(1,(w-font.widthOfTextAtSize(lines[i],size))/2)+' '+(top-i*size*1.15)+' Tm '+font.encodeText(lines[i])+' Tj\n';
   src+='ET Q';widget.dict.set(N('AP'),pdf.context.obj({N:stream(src,w,h)}));
   const da=PDFString.of('/CDQ76 '+nominal+' Tf 0 g');widget.dict.set(N('DA'),da);field.acroField.dict.set(N('DA'),da);
  }
 }
 const dr=form.acroForm.dict.lookupMaybe(N('DR'),PDFDict)||pdf.context.obj({}),fonts=dr.lookupMaybe(N('Font'),PDFDict)||pdf.context.obj({});fonts.set(N('CDQ76'),font.ref);dr.set(N('Font'),fonts);form.acroForm.dict.set(N('DR'),dr);
 // Blank/inactive row result cells remain cyan; active results retain green/red.
 for(const field of form.getFields())if(/^charge_point_\d+_conforme_(vert|rouge)$/.test(field.getName()))for(const widget of field.acroField.getWidgets()){
  const {width:w,height:h}=widget.getRectangle(),bad=/_rouge$/.test(field.getName()),normal=widget.dict.lookupMaybe(N('AP'),PDFDict)?.lookupMaybe(N('N'),PDFDict);if(!normal)continue;
  normal.set(N('Off'),stream('q Q',w,h));normal.set(N('Yes'),stream('q '+(bad?'.937255 .090196 .090196':'.035294 .701961 .109804')+' rg .5 .5 '+(w-1)+' '+(h-1)+' re f Q',w,h));
 }
 const comments=form.getField('resume_commentaires').acroField.getWidgets()[0].getRectangle();
 for(const name of ['Bouton_Conforme','Bouton_NonConforme']){
  const box=form.getCheckBox(name),widget=box.acroField.getWidgets()[0],r=widget.getRectangle(),w=r.width,h=comments.height+1,bad=name==='Bouton_NonConforme';
  widget.setRectangle({...r,y:comments.y-.5,height:h});widget.dict.set(N('BS'),pdf.context.obj({W:0,S:'S'}));widget.dict.set(N('Border'),pdf.context.obj([0,0,0]));
  const label=bad?'NON CONFORME':'CONFORME',size=13.525,iw=29,gap=12,start=(w-iw-gap-font.widthOfTextAtSize(label,size))/2,mid=h/2,x=start+iw/2,rad=9,k=4.9705627;
  let src='% CDQ floor-style conclusion V2676\nq '+(bad?'.91 .035 .075 rg .52 .02 .035':'.055 .665 .13 rg .025 .34 .075')+' RG 1.8 w '+rad+' .9 m '+(w-rad)+' .9 l '+(w-rad+k)+' .9 '+(w-.9)+' '+(rad-k)+' '+(w-.9)+' '+rad+' c '+(w-.9)+' '+(h-rad)+' l '+(w-.9)+' '+(h-rad+k)+' '+(w-rad+k)+' '+(h-.9)+' '+(w-rad)+' '+(h-.9)+' c '+rad+' '+(h-.9)+' l '+(rad-k)+' '+(h-.9)+' .9 '+(h-rad+k)+' .9 '+(h-rad)+' c .9 '+rad+' l .9 '+(rad-k)+' '+(rad-k)+' .9 '+rad+' .9 c h B Q\n';
  src+='q 1 1 1 RG 2.25 w '+x+' '+(mid+20)+' m '+(x+15)+' '+(mid+13)+' l '+(x+12.5)+' '+(mid-7)+' l '+x+' '+(mid-20)+' l '+(x-12.5)+' '+(mid-7)+' l '+(x-15)+' '+(mid+13)+' l h S 2.8 w ';
  src+=bad?(x-7)+' '+(mid+7)+' m '+(x+7)+' '+(mid-7)+' l S '+(x-7)+' '+(mid-7)+' m '+(x+7)+' '+(mid+7)+' l S Q\n':(x-10)+' '+mid+' m '+(x-3)+' '+(mid-7)+' l '+(x+11)+' '+(mid+8)+' l S Q\n';
  src+='q 1 1 1 rg BT 0 Tc 0 Tw 100 Tz 0 Tr /CDQ76 '+size+' Tf '+(start+iw+gap)+' '+((h-size*.718)/2)+' Td '+font.encodeText(label)+' Tj ET Q';
  widget.dict.set(N('AP'),pdf.context.obj({N:{Yes:stream(src,w,h),Off:stream('q Q',w,h)}}));
 }
 const failed=form.getCheckBox('Bouton_NonConforme').isChecked();if(failed)form.getCheckBox('Bouton_Conforme').uncheck();else form.getCheckBox('Bouton_Conforme').check();
 if(status?.getText()==='À compléter')status.setText('');
 form.acroForm.dict.set(N('NeedAppearances'),pdf.context.obj(false));pdf.catalog.set(N('CDQReportRepairV2676'),PDFString.of(key||marked||'legacy'));
 return true;
}
