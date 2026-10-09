import {captionInkV2719} from './report-caption-ink-v2719.mjs';
import {reportGridV2704} from './reader-report-layout-v2704.mjs';

// Presentation only. Never rename fields, change readings, actions, calculation
// order, photograph data, section-circle geometry or input-rectangle geometry.
const ink='.114 .059 .871',white='1 1 1',blue='0 .32 .79';
const client={client_nom:'Nom du Client',client_telephone:'Téléphone',client_technicien:'Technicien',client_adresse:'Adresse',client_ville:'Ville',client_province:'Province',client_code_postal:'Code Postal'};
const equipment={identification_balance:'Identification de la Balance',type_balance:'Type de Balance',type_plateau:'Type de Plateau',etendue_verifiee:'Étendue Vérifiée',legal_pour_commerce:'Légal pour le Commerce',capacite_maximale:'Capacité Maximale',unite_mesure:'Unité de Mesure',echelon:'Échelon (e)',resolution:'Résolution (d)',etalon_utilise:'Étalon Utilisé',points_test:'Points de Test'};
const dec=new TextDecoder('windows-1252'),raw=o=>new TextDecoder().decode(o);
const round=n=>+n.toFixed(6);
export function reportTitleCaseV2719(text){
 const small=new Set(['de','du','des','le','la','les','et','pour','à','au','aux']);
 return String(text).replace(/\s*\(Max\)/gi,'').replace(/[A-Za-zÀ-ÖØ-öø-ÿŒœ]+(?:['’][A-Za-zÀ-ÖØ-öø-ÿŒœ]+)?/g,(word,offset)=>{
  if(['N','A','M'].includes(word)&&/N°|A-M/.test(text))return word;
  if(/^[ed]$/.test(word)&&new RegExp('\\('+word+'\\)','i').test(text))return word.toLowerCase();
  const parts=word.toLowerCase().split(/['’]/);
  if(parts.length===2)return parts[0]==='d'?"d'"+parts[1][0].toUpperCase()+parts[1].slice(1):parts[0][0].toUpperCase()+parts[0].slice(1)+"'"+parts[1][0].toUpperCase()+parts[1].slice(1);
  return offset>0&&small.has(parts[0])?parts[0]:parts[0][0].toUpperCase()+parts[0].slice(1);
 });
}
function inkBounds(text,weight){
 const list=Array.from(text).map(c=>captionInkV2719[weight][c]).filter(Boolean);
 return {ascent:Math.max(0,...list.map(a=>a[0])),descent:Math.max(0,...list.map(a=>a[1]))};
}
function tokenText(token,L){
 if(token[0]==='<')return dec.decode(L.PDFHexString.of(token.slice(1,-1).replace(/\s/g,'')).asBytes());
 let s=token.slice(1,-1).replace(/\\([0-7]{1,3}|[\s\S])/g,(_,c)=>/^[0-7]+$/.test(c)?String.fromCharCode(parseInt(c,8)):(c==='n'?'\n':c==='r'?'\r':c==='t'?'\t':c));
 return dec.decode(Uint8Array.from(s,c=>c.charCodeAt(0)));
}
function replaceStream(pdf,L,ref,o,text){
 const next=pdf.context.flateStream(text);
 for(const[k,v]of o.dict.entries())if(!['/Length','/Filter','/DecodeParms'].includes(String(k)))next.dict.set(k,v);
 pdf.context.assign(ref,next);
}

export async function normalizeReportTypographyV2719(pdf,L,{key=''}={}){
 const N=L.PDFName.of,page=pdf.getPage(0),form=pdf.getForm(),marker=N('CDQReportTypographyV2719');
 if(!form.getFieldMaybe('client_nom')||!form.getFieldMaybe('indicateur_fabricant')||!form.getFieldMaybe('charge_point_1_charge_utilisee')||!page.node.has(N('CDQReportMicroV2716')))return false;
 page.node.normalize();
 function order(ref){
  const list=page.node.Contents(),circle=page.node.lookup(N('CDQReportMicroV2716'),L.PDFDict).get(N('Stream'));
  const before=list.asArray().map(String).join('|');
  for(const target of [ref,circle]){for(let i=list.size()-1;i>=0;i--)if(String(list.get(i))===String(target))list.remove(i);list.push(target);}
  return before!==list.asArray().map(String).join('|');
 }
 if(page.node.has(marker))return order(page.node.lookup(marker,L.PDFDict).get(N('Stream')));
 const type=form.getFieldMaybe('type_balance'),value=type?.getSelected?.().join(' ')||type?.getText?.()||'';
 key=key||(/multi/i.test(value)?'multitete':/suspendue/i.test(value)?'suspendue':/track/i.test(value)?'trackscale':/train/i.test(value)?'train':/camion/i.test(value)?'camion':/table/i.test(value)?'table':/pr[eé]cision/i.test(value)?'precision':/cuve/i.test(value)?'cuve4':/tr[eé]mie/i.test(value)?'tremie4':'plancher');
 const resources=page.node.Resources(),fonts=resources.lookup(N('Font'),L.PDFDict),boldRef=fonts.get(N('CDQ2704Bold')),regularRef=fonts.get(N('CDQ2704Regular'));
 if(!boldRef||!regularRef)throw Error('Approved report fonts unavailable');
 fonts.set(N('CDQ2719Caption'),boldRef);fonts.set(N('CDQ2719Header'),regularRef);
 const encoder=L.StandardFontEmbedder.for(L.StandardFonts.HelveticaBold);
 function width(text,size,ref=boldRef){
  const font=pdf.context.lookup(ref),first=font.lookupMaybe(N('FirstChar'),L.PDFNumber)?.asNumber()||0,ws=font.lookupMaybe(N('Widths'),L.PDFArray);
  if(!ws){
   const base=String(font.get(N('BaseFont')));
   if(!/^\/(?:Helvetica(?:-Bold)?|NimbusSans-(?:Bold|Regular))$/.test(base))throw Error('Unsupported caption font: '+base);
   const standard=L.StandardFontEmbedder.for(/Bold/.test(base)?L.StandardFonts.HelveticaBold:L.StandardFonts.Helvetica);
   return Array.from(text).reduce((sum,c)=>sum+standard.font.getWidthOfGlyph(standard.encoding.encodeUnicodeCodePoint(c.codePointAt(0)).name),0)*size/1000;
  }
  return Array.from(encoder.encodeText(text).asBytes()).reduce((sum,c)=>sum+(ws.lookup(c-first,L.PDFNumber)?.asNumber()||0),0)*size/1000;
 }
 const r=name=>form.getFieldMaybe(name)?.acroField.getWidgets()[0]?.getRectangle();
 const masks=[],captions=[];
 const badges=page.node.lookup(N('CDQReportMicroV2716'),L.PDFDict).lookup(N('Circles'),L.PDFArray).asArray();
 let art='% CDQ report typography V2719 — approved letter case and visible-ink centering\nq\n0 0 '+page.getWidth()+' '+page.getHeight()+' re\n';
 // Preserve the complete numbered-badge area, including antialiased edges.
 for(const badge of badges){const [,x,y,radius]=badge.asArray().map(v=>v.asNumber()),pad=radius+1;art+=`${x-pad} ${y-pad} ${2*pad} ${2*pad} re\n`;}
 art+='W* n\n';
 function mask(box,color=white){if(box.width<=0||box.height<=0)throw Error('Invalid caption mask');masks.push([box.x,box.y,box.x+box.width,box.y+box.height]);art+=`q ${color} rg ${box.x} ${box.y} ${box.width} ${box.height} re f Q\n`;}
 function text(title,box,{size=8.4,color=ink,weight='bold'}={}){
  const ref=weight==='bold'?boldRef:regularRef,resource=weight==='bold'?'CDQ2719Caption':'CDQ2719Header';
  const lines=title.split('|'),step=size+1;
  if(Math.max(...lines.map(s=>width(s,size,ref)))>box.width-1)throw Error('Caption does not fit: '+title+' '+box.width);
  const first=inkBounds(lines[0],weight),last=inkBounds(lines.at(-1),weight),height=(lines.length-1)*step+(first.ascent+last.descent)*size;
  if(height>box.height+.5)throw Error('Caption exceeds its height: '+title);
  const base=box.y+(box.height-height)/2+last.descent*size;
  lines.forEach((line,i)=>{
   const x=box.x+(box.width-width(line,size,ref))/2,y=base+(lines.length-1-i)*step;
   art+=`q ${color} rg BT 0 Tc 0 Tw 100 Tz 0 Ts 0 Tr /${resource} ${size} Tf ${round(x)} ${round(y)} Td ${encoder.encodeText(line)} Tj ET Q\n`;
  });
  captions.push({title,box,size,color,weight});
 }
 function above(name,title,{x,width:span,pad=1,height=10.5,maskX,maskWidth}={}){
  const widget=form.getFieldMaybe(name)?.acroField.getWidgets()[0];
  if(!widget||widget.getFlags()&(2|32))return;
  const field=r(name);if(!field)return;
  const box={x:x??field.x,y:field.y+field.height+pad,width:span??field.width,height};
  mask({x:maskX??box.x-1,y:box.y-.4,width:maskWidth??box.width+2,height:box.height+.8});text(title,box);
 }

 // Actual input rectangles provide the horizontal centers. Title bands never
 // reach a neighboring cyan cell, calendar control or numbered section bar.
 for(const[name,title]of Object.entries(client))above(name,title);
 if(r('date_etalonnage_1')){
  const first=r('date_etalonnage_1'),last=r('date_etalonnage_3');
  above('date_etalonnage_1',"Date d'Étalonnage",{x:first.x,width:last.x+last.width-first.x,maskX:first.x-2,maskWidth:last.x+last.width-first.x+4,height:11.5});
 }
 above('frequence_etalonnage',"Fréquence d'Étalonnage",{maskX:r('frequence_etalonnage')?.x-20,maskWidth:(r('frequence_etalonnage')?.width||0)+40,height:11.5});
 if(r('prochain_etalonnage_1')){
  const first=r('prochain_etalonnage_1'),last=r('prochain_etalonnage_3');
  above('prochain_etalonnage_1','Date du Prochain Étalonnage',{x:first.x,width:last.x+last.width-first.x,maskX:first.x-11,maskWidth:last.x+last.width-first.x+13,height:11.5});
 }
 for(const[name,title]of Object.entries(equipment))above(name,title);

 const grid=reportGridV2704(pdf),scale=page.getWidth()/612,left=10.8*scale;
 const rows=['indicateur','base_balance','imprimante'].filter(p=>r(p+'_fabricant'));
 const first=r(rows[0]+'_fabricant'),categoryWidth=first.x-left-grid.gap;
 for(const prefix of rows){
  const field=r(prefix+'_fabricant'),box={x:left+.6,y:field.y-grid.rowGap/2+.6,width:categoryWidth-1.2,height:field.height+grid.rowGap-1.2};
  mask(box);text(prefix==='indicateur'?(r('type_plateau')?'Balance':'Indicateur'):prefix==='base_balance'?'Base de la Balance':'Imprimante',box);
 }
 const headers=[{x:left,width:categoryWidth},...['fabricant','modele','numero_serie','numero_am'].filter(s=>r(rows[0]+'_'+s)).map(s=>r(rows[0]+'_'+s))];
 const hy=first.y+first.height+grid.rowGap,hh=page.getHeight()>820?15.533:16.5;
 for(const[i,b]of headers.entries()){
  const box={x:b.x+.6,y:hy+.6,width:b.width-1.2,height:hh-1.2};
  mask(box,blue);text(['Catégorie','Fabricant','Modèle','N° de Série','N° A-M'][i],box,{size:7,color:white,weight:'regular'});
 }

 const point=r('charge_point_1_charge_utilisee'),headerY=point.y+point.height+2;
 if(key!=='multitete'){
  const columns=[['charge_utilisee','Charge|Utilisée'],['charge_contrainte','Charge de|Contrainte'],['tolerance','Tolérance'],['avant_correction','Avant|Correction'],['erreur_avant','Erreur (e)'],['apres_correction','Après|Correction'],['erreur_apres','Erreur (e)'],['conforme_vert','Conforme']].filter(([s])=>r('charge_point_1_'+s));
  for(const[b,title]of [[{x:left,width:point.x-left-grid.gap},'Point'],...columns.map(([s,t])=>[r('charge_point_1_'+s),t])]){
   const box={x:b.x+.6,y:headerY+.6,width:b.width-1.2,height:16.8};mask(box,blue);text(title,box,{size:7,color:white,weight:'regular'});
  }
 }else{
  const head=r('charge_point_1_numero_tete'),firstLoad=r('charge_point_1_charge_utilisee'),secondLoad=r('charge_point_1_charge_utilisee_2');
  const bottom=head.y+head.height+1.2,top=bottom+30;
  const box={x:head.x+.5,y:bottom+.5,width:head.width-1,height:29};mask(box,blue);text('N° de|Tête',box,{size:7,color:white,weight:'regular'});
  for(const[suffix,title]of [['charge_utilisee','Charges|Utilisées'],['tolerance','Tolérance (e)'],['avant_correction','Avant|Correction'],['erreur_avant','Erreur (e)'],['apres_correction','Après|Correction'],['erreur_apres','Erreur (e)']]){
   const a=r('charge_point_1_'+suffix),b=r('charge_point_1_'+suffix+'_2'),upper={x:a.x+.5,y:bottom+12.5,width:b.x+b.width-a.x-1,height:17};mask(upper,blue);text(title,upper,{size:7,color:white,weight:'regular'});
   for(const[j,v]of [a,b].entries()){const small={x:v.x+.5,y:bottom+.5,width:v.width-1,height:9.8};mask(small,blue);text('Poids '+(j+1),small,{size:7,color:white,weight:'regular'});}
  }
  const conformity=r('charge_point_1_conforme_vert'),c={x:conformity.x+.5,y:bottom+.5,width:conformity.width-1,height:29};mask(c,blue);text('Conforme',c,{size:7,color:white,weight:'regular'});
 }
 if(!(form.getFieldMaybe('charge_excentricite')?.acroField.getWidgets()[0]?.getFlags()&(2|32))){
  const field=r('charge_excentricite');if(field)mask({x:10,y:field.y+field.height+.1,width:page.getWidth()-20,height:12.5});
 }
 above('charge_excentricite',"Charge d'Excentricité",{height:9.5,pad:.6});
 above('tolerance_excentricite','Erreur Maximale Tolérée',{height:9.5,pad:.6});
 above('resume_commentaires','Résumé / Commentaires',{height:12.5,pad:.6});

 // Update diagram titles inside every alternate 3/4-point and plateau image
 // appearance. The original photo streams and arrow paths are retained.
 const dataAppearances=new Set();
 for(const field of form.getFields())if(!/^_cdq_points_diagram_|^plateau_image_/.test(field.getName()))for(const w of field.acroField.getWidgets()){
  const ap=w.dict.lookupMaybe(N('AP'),L.PDFDict);if(ap)for(const[,v]of ap.entries())if(v instanceof L.PDFRef)dataAppearances.add(String(v));
 }
 const stringToken='(<[^>]*>|\\((?:\\\\[\\s\\S]|[^\\\\()])*\\))';
 const literal=new RegExp(stringToken+'\\s*Tj|\\[\\s*'+stringToken+'\\s*\\]\\s*TJ','g');
 const unicodeMaps=new Map();
 function oldText(token,ref){
  const text=tokenText(token,L),font=pdf.context.lookup(ref),unicode=font.lookupMaybe(N('ToUnicode'),L.PDFRawStream);
  if(!unicode)return text;
  if(!unicodeMaps.has(String(ref))){const map=new Map(),cmap=raw(L.decodePDFRawStream(unicode).decode());for(const pair of cmap.matchAll(/<([0-9a-f]{2})>\s*<([0-9a-f]{4})>/gi))map.set(parseInt(pair[1],16),String.fromCharCode(parseInt(pair[2],16)));unicodeMaps.set(String(ref),map);}
  const map=unicodeMaps.get(String(ref));return Array.from(text,c=>map.get(c.charCodeAt(0))||c).join('');
 }
 function oldWidth(token,size,ref){
  const font=pdf.context.lookup(ref),ws=font.lookupMaybe(N('Widths'),L.PDFArray),first=font.lookupMaybe(N('FirstChar'),L.PDFNumber)?.asNumber()||0;
  if(!ws)return width(tokenText(token,L),size,ref);
  const value=token[0]==='<'?L.PDFHexString.of(token.slice(1,-1).replace(/\s/g,'')).asBytes():Uint8Array.from(tokenText(token,L),c=>c.charCodeAt(0));
  return Array.from(value).reduce((sum,c)=>sum+(ws.lookup(c-first,L.PDFNumber)?.asNumber()||0),0)*size/1000;
 }
 let streamChanges=0,diagramTitles=0;
 const pageStreams=new Set(pdf.getPages().flatMap(p=>{const c=p.node.Contents();return c instanceof L.PDFArray?c.asArray().map(String):c?[String(c)]:[];}));
 for(const[ref,o]of pdf.context.enumerateIndirectObjects()){
  if(!(o instanceof L.PDFRawStream)||(!pageStreams.has(String(ref))&&o.dict.get(N('Subtype'))!==N('Form'))||dataAppearances.has(String(ref)))continue;
  let source;try{source=raw(L.decodePDFRawStream(o).decode());}catch{continue;}
  if(!source.includes('BT'))continue;
  let next=source.replace(/\(IDENTIFICATION D\\(?:222|047)UN CLIENT\)/g,'(IDENTIFICATION DU CLIENT)').replace(/<4944454e54494649434154494f4e2044(?:92|27)554e20434c49454e54>/gi,String(encoder.encodeText('IDENTIFICATION DU CLIENT')));
  const own=o.dict.lookupMaybe(N('Resources'),L.PDFDict)||resources;
  next=next.replace(/BT[\s\S]*?ET/g,block=>{
   const show=[...block.matchAll(literal)];if(show.length!==1)return block;
   const tf=block.match(/\/(\S+)\s+([-\d.]+)\s+Tf/),pos=[...block.matchAll(/([-\d.]+)\s+([-\d.]+)\s+(Td|Tm)\b/g)].at(-1);if(!tf||!pos)return block;
   const oldFont=own.lookupMaybe(N('Font'),L.PDFDict)?.get(N(tf[1]));if(!oldFont)return block;
   // Older compacted copies can retain an unused appearance with a dangling
   // font reference. It is not rendered; leave that retired appearance alone.
   if(!(pdf.context.lookup(oldFont) instanceof L.PDFDict))return block;
   const token=show[0][1]||show[0][2],old=oldText(token,oldFont);
   if(!/^(?:(?:AVANT|APRÈS|APRES|ARRIÈRE|ARRIERE|Avant|Après|Arrière)(?:\s+(?:CORRECTION|Correction|GAUCHE|Gauche|gauche|DROIT|Droit|droit|CENTRE|Centre|centre))?|(?:SECTION|Section|PATTE|Patte|POINT|Point)\s+\d+|CORRECTION|TRAJET|ALLER|RETOUR|Aller|Retour|BALANCE MULTI-TÊTES|14 TÊTES · 14 ESSAIS)$/.test(old))return block;
   const title=reportTitleCaseV2719(old);if(title===old)return block;
   let previousWidth;try{previousWidth=oldWidth(token,+tf[2],oldFont);}catch{return block;}
   const phase=/correction/i.test(old),size=phase?+tf[2]:8.4,newWidth=width(title,size),a=inkBounds(old,'bold'),b=inkBounds(title,'bold');
   const x=+pos[1]+(previousWidth-newWidth)/2,y=+pos[2]+((a.ascent-a.descent)*+tf[2]-(b.ascent-b.descent)*size)/2;
   const fs=own.lookupMaybe(N('Font'),L.PDFDict);if(!fs)return block;fs.set(N('CDQ2719Caption'),boldRef);
   diagramTitles++;
   return block.replace(show[0][0],encoder.encodeText(title)+' Tj').replace(tf[0],'/CDQ2719Caption '+size+' Tf').replace(pos[0],round(x)+' '+round(y)+' '+pos[3]);
  });
  if(next!==source){replaceStream(pdf,L,ref,o,next);streamChanges++;}
 }
 art+='Q\n';
 const ref=pdf.context.register(pdf.context.flateStream(art));page.node.addContentStream(ref);
 page.node.set(marker,pdf.context.obj({Stream:ref,Captions:captions.map(c=>({Title:L.PDFHexString.fromText(c.title),Box:[c.box.x,c.box.y,c.box.width,c.box.height],Size:c.size,Weight:c.weight})),Masks:masks,Diagrams:diagramTitles,ChangedStreams:streamChanges}));
 order(ref);return true;
}
