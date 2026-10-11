// The ten equipment inputs share five columns; saved answers stay editable.
export const precisionColumnsV2675=[
 ['identification_balance','type_balance','type_plateau','etendue_verifiee','legal_pour_commerce'],
 ['capacite_maximale','unite_mesure','echelon','resolution','etalon_utilise']
];
export function normalizePrecisionLayoutV2675(pdf,L){
 const N=L.PDFName.of,form=pdf.getForm(),page=pdf.getPage(0),marker=N('CDQPrecisionLayoutV2675');
 if(page.node.has(marker))return false;
 const font=pdf.embedStandardFont(L.StandardFonts.HelveticaBold),left=11.5,width=113.8,gap=5;
 const labels=[['IDENTIFICATION DE LA BALANCE','TYPE DE BALANCE','TYPE DE PLATEAU','ÉTENDUE VÉRIFIÉE','LÉGAL POUR LE COMMERCE'],['CAPACITÉ MAXIMALE (Max)','UNITÉ DE MESURE','ÉCHELON (e)','RÉSOLUTION (d)','ÉTALON UTILISÉ']];
 let art='q 1 1 1 rg 10.5 467.5 591 56 re f Q\n';
 for(let row=0;row<2;row++)for(let column=0;column<5;column++){
  const f=form.getField(precisionColumnsV2675[row][column]),w=f.acroField.getWidgets()[0],r=w.getRectangle(),x=left+column*(width+gap);w.setRectangle({...r,x,width});
  const value=f.getText?f.getText()||'':(f.getSelected()||[]).join(' '),size=value?Math.min(10.36,(width-4)*10.36/Math.max(1,font.widthOfTextAtSize(value,10.36))):10.36;
  const source='q 0 0 '+width+' '+r.height+' re W n BT 0 Tc 0 Tw 100 Tz 0 Tr /CDQ75 '+size+' Tf 0 g '+((width-font.widthOfTextAtSize(value,size))/2)+' '+((r.height-size*.718)/2)+' Td '+font.encodeText(value)+' Tj ET Q';
  w.dict.set(N('AP'),pdf.context.obj({N:pdf.context.register(pdf.context.flateStream(source,{Type:'XObject',Subtype:'Form',BBox:[0,0,width,r.height],Resources:{Font:{CDQ75:font.ref}}}))}));
  const label=labels[row][column],ls=Math.min(8.4,(width-2)*8.4/font.widthOfTextAtSize(label,8.4));
  art+='q .114 .059 .871 rg BT 0 Tc 0 Tw 100 Tz 0 Tr /CDQ75 '+ls+' Tf '+(x+(width-font.widthOfTextAtSize(label,ls))/2)+' '+(r.y+r.height+3)+' Td '+font.encodeText(label)+' Tj ET Q\n';
 }
 page.node.normalize();const resources=page.node.Resources(),fonts=resources.lookupMaybe(N('Font'),L.PDFDict)||pdf.context.obj({});fonts.set(N('CDQ75'),font.ref);resources.set(N('Font'),fonts);
 const ref=pdf.context.register(pdf.context.flateStream(art));page.node.addContentStream(ref);page.node.set(marker,ref);
 // In a migrated filled report, repaint its existing cells above the new labels.
 const background=page.node.get(N('CDQPrecisionBackgroundV2670')),contents=page.node.Contents();if(background){const i=contents.asArray().findIndex(r=>String(r)===String(background));if(i>=0){contents.remove(i);contents.push(background);}}
 // Use the floor's bold typography and shield, centered in the same-height box.
 const comment=form.getTextField('resume_commentaires').acroField.getWidgets()[0].getRectangle();
 for(const name of ['Bouton_Conforme','Bouton_NonConforme']){
  const w=form.getField(name).acroField.getWidgets()[0],r=w.getRectangle(),h=comment.height+1,wid=r.width,bad=name==='Bouton_NonConforme';
  w.setRectangle({...r,y:comment.y-.5,height:h});w.dict.set(N('BS'),pdf.context.obj({W:0,S:'S'}));w.dict.set(N('Border'),pdf.context.obj([0,0,0]));
  const label=bad?'NON CONFORME':'CONFORME',size=13.525,iw=29,g=12,tw=font.widthOfTextAtSize(label,size),start=(wid-iw-g-tw)/2,mid=h/2;
  const radius=9,k=4.9705627;
  let src='% CDQ precision conclusion V2675\nq '+(bad?'.91 .035 .075 rg .52 .02 .035':'.055 .665 .13 rg .025 .34 .075')+' RG 1.8 w '+radius+' .9 m '+(wid-radius)+' .9 l '+(wid-radius+k)+' .9 '+(wid-.9)+' '+(radius-k)+' '+(wid-.9)+' '+radius+' c '+(wid-.9)+' '+(h-radius)+' l '+(wid-.9)+' '+(h-radius+k)+' '+(wid-radius+k)+' '+(h-.9)+' '+(wid-radius)+' '+(h-.9)+' c '+radius+' '+(h-.9)+' l '+(radius-k)+' '+(h-.9)+' .9 '+(h-radius+k)+' .9 '+(h-radius)+' c .9 '+radius+' l .9 '+(radius-k)+' '+(radius-k)+' .9 '+radius+' .9 c h B Q\n';
  const x=start+iw/2;
  src+='q 1 1 1 RG 2.25 w '+x+' '+(mid+20)+' m '+(x+15)+' '+(mid+13)+' l '+(x+12.5)+' '+(mid-7)+' l '+x+' '+(mid-20)+' l '+(x-12.5)+' '+(mid-7)+' l '+(x-15)+' '+(mid+13)+' l h S 2.8 w ';
  src+=bad?(x-7)+' '+(mid+7)+' m '+(x+7)+' '+(mid-7)+' l S '+(x-7)+' '+(mid-7)+' m '+(x+7)+' '+(mid+7)+' l S Q\n':(x-10)+' '+mid+' m '+(x-3)+' '+(mid-7)+' l '+(x+11)+' '+(mid+8)+' l S Q\n';
  src+='q 1 1 1 rg BT 0 Tc 0 Tw 100 Tz 0 Tr /CDQ75 '+size+' Tf '+(start+iw+g)+' '+((h-size*.718)/2)+' Td '+font.encodeText(label)+' Tj ET Q';
  const ap=w.dict.lookup(N('AP'),L.PDFDict).lookup(N('N'),L.PDFDict);ap.set(N('Yes'),pdf.context.register(pdf.context.flateStream(src,{Type:'XObject',Subtype:'Form',BBox:[0,0,wid,h],Resources:{Font:{CDQ75:font.ref}}})));
 }
 return true;
}
