import {tremiePhotoV2679} from './reader-tremie-photo-v2679.mjs';
import {curvedTremieArrowV2679} from './reader-tremie-arrows-v2679.mjs';
// Points measured on the load-cell collars of the report photographs.
// Coordinates are normalized from each image's top left, not the page.
export const vesselFeetV2678=Object.freeze({
 cuve3:{arriere_gauche:[.48,.834],avant_gauche:[.25,.926],avant_droit:[.759,.926]},
 cuve4:{arriere_gauche:[.373,.68],arriere_droit:[.758,.69],avant_gauche:[.235,.813],avant_droit:[.71,.831]},
 tremie3:{arriere_gauche:[.563,.707],avant_gauche:[.18,.813],avant_droit:[.815,.819]},
 tremie4:{arriere_gauche:[.282,.693],arriere_droit:[.719,.693],avant_gauche:[.135,.852],avant_droit:[.865,.852]}
});
export function normalizeVesselLayoutV2678(pdf,L){
 const N=L.PDFName.of,form=pdf.getForm(),page=pdf.getPage(0);
 if(!form.getFieldMaybe('points_test')||!form.getFieldMaybe('_cdq_points_diagram_3'))return false;
 const type=form.getField('type_balance'),title=type.getSelected?.().join(' ')||type.getText?.()||'',kind=/cuve/i.test(title)?'cuve':/tr[eé]mie/i.test(title)?'tremie':'';
 if(!kind)return false;
 const marker=N('CDQVesselLayoutV2678'),first=!page.node.has(marker),font=pdf.embedStandardFont(L.StandardFonts.HelveticaBold);
 const diagramMarker=N('CDQTremieDiagramV2679'),refreshDiagram=first||kind==='tremie'&&!page.node.has(diagramMarker);
 const embedded={};for(const [ref,o]of pdf.context.enumerateIndirectObjects())if(o instanceof L.PDFDict&&o.get(N('Type'))===N('Font')){
  const name=o.get(N('BaseFont'))?.decodeText?.()||'',d=o.lookupMaybe(N('FontDescriptor'),L.PDFDict);
  if(d&&(d.has(N('FontFile'))||d.has(N('FontFile2'))||d.has(N('FontFile3')))&&o.get(N('Encoding'))===N('WinAnsiEncoding')){
   if(name==='NimbusSans-Bold')embedded['Helvetica-Bold']=ref;if(name==='NimbusSans-Regular')embedded.Helvetica=ref;
  }
 }
 const fontRef=embedded['Helvetica-Bold']||font.ref;
 const text=(s,x,y,size=8.2,width=0,color='.114 .059 .871')=>'q '+color+' rg BT 0 Tc 0 Tw 100 Tz 0 Tr /CDQ78 '+size+' Tf '+(x+(width?(width-font.widthOfTextAtSize(s,size))/2:0))+' '+y+' Td '+font.encodeText(s)+' Tj ET Q\n';
 const white=r=>'q 1 1 1 rg '+[r.x-1.6,r.y-1.6,r.width+3.2,r.height+3.2].join(' ')+' re f Q\n';
 const cell=r=>'q .6 .992157 .992157 rg .02 .85 .94 RG .6 w '+[r.x,r.y,r.width,r.height].join(' ')+' re B Q\n';
 const cornerRect=(phase,position)=>({x:(position.endsWith('droit')?213:21)+(phase==='apres'?300:0),y:position.startsWith('arriere')?210:153,width:80,height:18});
 const stream=(src,w,h,resources={Font:{CDQ78:fontRef}})=>pdf.context.register(pdf.context.flateStream(src,{Type:'XObject',Subtype:'Form',BBox:[0,0,w,h],Resources:resources}));
 const meta=[['identification_balance','IDENTIFICATION DE LA BALANCE'],['type_balance','TYPE DE BALANCE'],['points_test','POINTS DE TEST'],['etendue_verifiee','ÉTENDUE VÉRIFIÉE'],['legal_pour_commerce','LÉGAL POUR LE COMMERCE']],metaNames=new Set(meta.map(([n])=>n));
 if(first){
  // End the identification cover below the printer row (y=507).
  let art='q 1 1 1 rg 0 117 '+page.getWidth()+' 147 re f Q\nq 1 1 1 rg 10.5 477 591 28 re f Q\n';
  const size=7.8,widths=meta.map(([,label])=>font.widthOfTextAtSize(label,size)+7),extra=(588.1-20-widths.reduce((a,b)=>a+b,0))/5;
  if(extra<0)throw Error('Vessel identification titles exceed available width');
  let x=11.5;
  for(let i=0;i<meta.length;i++){
   const [name,label]=meta[i],w=form.getField(name).acroField.getWidgets()[0],r={x,y:478.5,width:widths[i]+extra,height:14};w.setRectangle(r);
   art+=cell(r)+text(label,x,496.7,size,r.width);x+=r.width+5;
  }
  art+='q 1 1 1 rg 10.5 505 98 54 re f Q\n';
  for(const [label,y]of [['Indicateur',543],['Base de la balance',525],['Imprimante',507]]){
   const r={x:11.5,y,width:95.5,height:14};art+='q 1 1 1 rg .02 .85 .94 RG .6 w '+[r.x,r.y,r.width,r.height].join(' ')+' re B Q\n'+text(label,r.x+2,y+3,10.2);
  }
  art+='q 1 1 1 rg 10.5 118 591 30 re f Q\n';
  // Erase old, displaced page frames and draw the sole frame at widget bounds.
  for(const f of form.getFields()){
   const name=f.getName();if(!f.getText&&!f.getSelected||/^_|^Statut_|statut_|^charge_point_|^excentricite_/.test(name)||metaNames.has(name))continue;
   for(const w of f.acroField.getWidgets()){const r=w.getRectangle();if(r.width>3&&r.height>3)art+=white(r)+cell(r);}
  }
  for(const [name,label]of [['charge_excentricite','CHARGE D’EXCENTRICITÉ'],['tolerance_excentricite','ERREUR MAXIMALE TOLÉRÉE']]){
   const r=form.getField(name).acroField.getWidgets()[0].getRectangle();art+=text(label,r.x,141,8.2,r.width);
  }
  art+='q 1 1 1 rg 10.5 467 591 10 re f Q\n';
  for(const [name,label]of [['capacite_maximale','CAPACITÉ MAXIMALE (Max)'],['unite_mesure','UNITÉ DE MESURE'],['echelon','ÉCHELON (e)'],['etalon_utilise','ÉTALON UTILISÉ']]){
   const r=form.getField(name).acroField.getWidgets()[0].getRectangle();art+=text(label,r.x,468.5,7.8,r.width);
  }
  page.node.normalize();const resources=page.node.Resources(),fonts=resources.lookupMaybe(N('Font'),L.PDFDict)||pdf.context.obj({});fonts.set(N('CDQ78'),fontRef);resources.set(N('Font'),fonts);
  const ref=pdf.context.register(pdf.context.flateStream(art));page.node.addContentStream(ref);page.node.set(marker,ref);
 }
 if(refreshDiagram){
  // Stable widget locations in both variants keep the live form aligned.
  for(const phase of ['avant','apres'])for(const position of ['arriere_gauche','arriere_droit','avant_gauche','avant_droit'])
   for(const w of form.getField('excentricite_'+phase+'_'+position).acroField.getWidgets())w.setRectangle(cornerRect(phase,position));
  const blank=stream('q Q',591,116);
  for(const count of [3,4]){
   const box=form.getCheckBox('_cdq_points_diagram_'+count),w=box.acroField.getWidgets()[0],old=w.dict.lookup(N('AP'),L.PDFDict).lookup(N('N'),L.PDFDict).lookup(N('Yes'),L.PDFRawStream);
   let imageRef=old.dict.lookup(N('Resources'),L.PDFDict).lookup(N('XObject'),L.PDFDict).get(N('Hardware'+count));
   if(kind==='tremie'&&count===3){
    const photo=tremiePhotoV2679,encoded=Uint8Array.from(atob(photo.jpeg),c=>c.charCodeAt(0));
    imageRef=pdf.context.register(L.PDFRawStream.of(pdf.context.obj({Type:'XObject',Subtype:'Image',Width:photo.width,Height:photo.height,ColorSpace:'DeviceRGB',BitsPerComponent:8,Filter:'DCTDecode'}),encoded));
   }
   const image=pdf.context.lookup(imageRef);
   const ratio=image.dict.lookup(N('Width'),L.PDFNumber).asNumber()/image.dict.lookup(N('Height'),L.PDFNumber).asNumber(),hh=Math.min(90,94/ratio),hw=hh*ratio,px=157-hw/2,py=154,feet=vesselFeetV2678[kind+count];
   let src='q 1 1 1 rg 10.5 148 591 116 re f Q\n';
   for(const [phase,dx]of [['avant',0],['apres',300]]){
    // Both complete frames fit inside the AP BBox. Pictures stop at y=244.
    src+='q .4 .67 .83 RG .6 w '+[11.5+dx,149,288.5,114.5].join(' ')+' re S Q\n';
    src+=text(phase==='avant'?'AVANT CORRECTION':'APRÈS CORRECTION',11.5+dx,252.5,9.8,288.5,'.035 .035 .32');
    src+='q '+hw+' 0 0 '+hh+' '+(px+dx)+' '+py+' cm /Hardware'+count+' Do Q\n';
    for(const [position,[u,v]]of Object.entries(feet)){
     const r=cornerRect(phase,position),rear=position.startsWith('arriere'),left=position.endsWith('gauche'),label=rear?(count===3?'Arrière':left?'Arrière gauche':'Arrière droit'):left?'Avant gauche':'Avant droit';
     const tx=px+dx+u*hw,ty=py+(1-v)*hh,sx=left?r.x+r.width:r.x,sy=r.y+r.height/2,knee=rear?[left?106+dx:208+dx,ty]:[sx,sy],angle=Math.atan2(ty-knee[1],tx-knee[0]),a=angle+2.65,b=angle-2.65;
     src+=cell(r)+text(label,r.x,r.y+r.height+3,8.2,r.width);
     if(kind==='tremie')src+=curvedTremieArrowV2679(sx+(left?.9:-.9),sy,tx,ty,{rear,left});
     else src+='q .075 .22 .64 RG .075 .22 .64 rg .9 w '+sx+' '+sy+' m '+knee.join(' ')+' l '+tx+' '+ty+' l S '+tx+' '+ty+' m '+(tx+4*Math.cos(a))+' '+(ty+4*Math.sin(a))+' l '+(tx+4*Math.cos(b))+' '+(ty+4*Math.sin(b))+' l h f Q\n';
    }
   }
   const ap=stream('q 1 0 0 1 -10.5 -148 cm\n'+src+' Q',591,116,{Font:{CDQ78:fontRef},XObject:{['Hardware'+count]:imageRef}});
   w.setRectangle({x:10.5,y:148,width:591,height:116});w.dict.set(N('AP'),pdf.context.obj({N:{Yes:ap,Off:blank}}));
   const kids=box.acroField.dict.lookup(N('Kids'),L.PDFArray),annots=page.node.Annots();for(const ref of kids.asArray()){const i=annots.asArray().findIndex(a=>String(a)===String(ref));if(i>=0){annots.remove(i);annots.insert(0,ref);}}
  }
  if(kind==='tremie')page.node.set(diagramMarker,L.PDFBool.True);
 }
 // Clear MK as well as BS: otherwise edited PDF.js fields recreate old frames.
 for(const f of form.getFields()){
  const name=f.getName();if(!f.getText&&!f.getSelected||/^_|^Statut_|statut_/.test(name))continue;
  for(const w of f.acroField.getWidgets()){
   const r=w.getRectangle(),old=w.dict.lookupMaybe(N('AP'),L.PDFDict)?.lookupMaybe(N('N'),L.PDFRawStream);if(!old)continue;
   let value=f.getText?.()||f.getSelected?.().join(' ')||'';
   const number=Number(value.replace(',','.'));if(value&&Number.isFinite(number)){
    if(/^(?:charge_point_\d+_tolerance|tolerance_excentricite)$/.test(name))value='±'+String(number).replace('.',',')+'e';
    else if(/^charge_point_\d+_erreur_(avant|apres)$/.test(name))value=(number>0?'+':'')+String(number).replace('.',',')+'e';
   }
   const nominal=Math.min(name==='resume_commentaires'?10:11.25,r.height*.74);let size=nominal,lines=[value];
   function wrap(s){const result=[];for(const paragraph of value.split('\n')){let line='';for(const word of paragraph.split(' ')){const next=line?line+' '+word:word;if(line&&font.widthOfTextAtSize(next,s)>r.width-4){result.push(line);line=word;}else line=next;}result.push(line);}return result;}
   if(f.isMultiline?.())for(;size>3.5;size-=.25){lines=wrap(size);if(lines.length*size*1.15<=r.height-2&&lines.every(v=>font.widthOfTextAtSize(v,size)<=r.width-4))break;}
   else size=Math.min(size,value?(r.width-4)*size/Math.max(1,font.widthOfTextAtSize(value,size)):size);
   let source='q BT 0 Tc 0 Tw 100 Tz 0 Tr /CDQ78 '+size+' Tf 0 g\n';const top=(r.height-size*.718)/2+(lines.length-1)*size*1.15/2;
   for(let i=0;i<lines.length;i++)source+='1 0 0 1 '+Math.max(1,(r.width-font.widthOfTextAtSize(lines[i],size))/2)+' '+(top-i*size*1.15)+' Tm '+font.encodeText(lines[i])+' Tj\n';
   source+='ET Q';const resources=pdf.context.obj({Font:{CDQ78:fontRef}});
   w.dict.set(N('AP'),pdf.context.obj({N:stream(source,r.width,r.height,resources)}));w.dict.set(N('BS'),pdf.context.obj({W:0,S:'S'}));w.dict.set(N('Border'),pdf.context.obj([0,0,0]));
   const mk=w.dict.lookupMaybe(N('MK'),L.PDFDict);mk?.delete(N('BG'));mk?.delete(N('BC'));
   w.dict.set(N('DA'),L.PDFString.of('/CDQ78 '+nominal+' Tf 0 g'));f.acroField.dict.set(N('DA'),L.PDFString.of('/CDQ78 '+nominal+' Tf 0 g'));
  }
 }
 // Reuse the reports' fully embedded, metric-compatible sans fonts. This also
 // removes printer-dependent Helvetica substitution in earlier repair streams.
 const dr=form.acroForm.dict.lookupMaybe(N('DR'),L.PDFDict)||pdf.context.obj({}),df=dr.lookupMaybe(N('Font'),L.PDFDict)||pdf.context.obj({});df.set(N('CDQ78'),fontRef);dr.set(N('Font'),df);form.acroForm.dict.set(N('DR'),dr);
 const seen=new Set();function fonts(o){
  if(o instanceof L.PDFRef)o=pdf.context.lookup(o);if(!o||seen.has(o))return;seen.add(o);
  if(o instanceof L.PDFDict){const table=o.lookupMaybe(N('Font'),L.PDFDict);if(table)for(const [name,ref]of table.entries()){
   const f=pdf.context.lookup(ref);if(!(f instanceof L.PDFDict))continue;const base=f.get(N('BaseFont'))?.decodeText?.();
   if(embedded[base]&&(!f.has(N('Encoding'))||f.get(N('Encoding'))===N('WinAnsiEncoding'))&&!f.has(N('FontDescriptor')))table.set(name,embedded[base]);
  }for(const [,child]of o.entries())fonts(child);}else if(o instanceof L.PDFArray)for(const child of o.asArray())fonts(child);else if(o instanceof L.PDFStream)fonts(o.dict);
 }for(const [,o]of pdf.context.enumerateIndirectObjects())fonts(o);
 return true;
}
