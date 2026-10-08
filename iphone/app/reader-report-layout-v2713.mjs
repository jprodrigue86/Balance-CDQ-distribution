import {floorArrowPresentationV2695} from './reader-report-presentation-v2695.mjs';
import {clearWidgetFrameV2702} from './reader-truck-equipment-v2702.mjs';
const cache=new Map(),cyan='.6 .992156863 .992156863',blue='0 .32 .79',ink='.114 .059 .871';
async function picture(name,data){if(data?.[name])return data[name];if(!cache.has(name))cache.set(name,fetch(new URL('./assets/report-art-v2713/'+name+'.png',import.meta.url)).then(async r=>{if(!r.ok)throw Error('Illustration indisponible.');return new Uint8Array(await r.arrayBuffer());}).catch(e=>{cache.delete(name);throw e;}));return cache.get(name);}
function patchJavascript(pdf,L,change){
 const N=L.PDFName.of,seen=new Set();function visit(o){if(o instanceof L.PDFRef)o=pdf.context.lookup(o);if(!o||seen.has(o))return;seen.add(o);if(o instanceof L.PDFDict){if(o.get(N('S'))===N('JavaScript')){const j=o.lookup(N('JS')),s=j instanceof L.PDFRawStream?new TextDecoder().decode(L.decodePDFRawStream(j).decode()):j?.decodeText?.()||'',next=change(s);if(next!==s)o.set(N('JS'),L.PDFHexString.fromText(next));}for(const[,v]of o.entries())visit(v);}else if(o instanceof L.PDFArray)for(const v of o.asArray())visit(v);else if(o instanceof L.PDFStream)visit(o.dict);}for(const[,o]of pdf.context.enumerateIndirectObjects())visit(o);
}
function cloneText(pdf,L,original,name,page){
 const N=L.PDFName.of,f=pdf.getForm().createTextField(name),r=original.acroField.getWidgets()[0].getRectangle();f.addToPage(page,{...r,borderWidth:0});
 for(const key of ['AA','Ff','DA','Q','MaxLen']){const value=original.acroField.dict.get(N(key));if(value)f.acroField.dict.set(N(key),pdf.context.obj(value));}
 // Deep-copy actions: otherwise changing the second load also changes the first.
 const aa=original.acroField.dict.lookupMaybe(N('AA'),L.PDFDict);if(aa){const copied=pdf.context.obj({});for(const[k,a]of aa.entries()){const action=pdf.context.lookup(a),j=action?.lookup?.(N('JS'));if(j?.decodeText)copied.set(k,pdf.context.obj({S:'JavaScript',JS:L.PDFHexString.fromText(j.decodeText().replace(/(charge_point_\d+_(?:charge_utilisee|tolerance|avant_correction|apres_correction|erreur_avant|erreur_apres))(?=["\\])/g,'$1_2').replace(/p\+"(charge_utilisee|tolerance|avant_correction|apres_correction|erreur_avant|erreur_apres)"/g,'p+"$1_2"'))}));}f.acroField.dict.set(N('AA'),copied);}
 return f;
}

// Each head is evaluated independently at two loads; errors and tolerances are
// expressed in divisions of e. Incomplete after readings cannot hide a failure.
export function multiHeadResultsV2713(d){
 var out={},eps=1e-10,bad=0,complete=0;
 function raw(n){var f=d.getField(n);return String(f?f.valueAsString===undefined?f.value:f.valueAsString:'').replace(/[\s\u00a0\u202f]/g,'').replace(',','.');}
 function num(n){var s=raw(n);return /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(s)&&isFinite(Number(s))?Number(s):NaN;}
 function value(x){return isFinite(x)?Number(x.toPrecision(12)):'';}
 var e=num('echelon');
 for(var i=1;i<=14;i++){
  var p='charge_point_'+i+'_',after=raw(p+'apres_correction')!==''||raw(p+'apres_correction_2')!=='',good=true,evaluated=true,failure=false;
  for(var j=1;j<=2;j++){
   var s=j===1?'':'_2',c=num(p+'charge_utilisee'+s),b=num(p+'avant_correction'+s),a=num(p+'apres_correction'+s),t=isFinite(c)&&c>=0&&isFinite(e)&&e>0?Math.max(1,Math.ceil(c*.001/e-.5-eps)):NaN;
   var eb=isFinite(b)&&isFinite(t)?(b-c)/e:NaN,ea=isFinite(a)&&isFinite(t)?(a-c)/e:NaN,q=after?ea:eb;
   out[p+'tolerance'+s]=value(t);out[p+'erreur_avant'+s]=value(eb);out[p+'erreur_apres'+s]=value(ea);
   if(!isFinite(q)||!isFinite(t)){evaluated=false;good=false;if(after&&isFinite(eb)&&isFinite(t)&&Math.abs(eb)>t+eps)failure=true;}else if(Math.abs(q)>t+eps){good=false;failure=true;}
  }
  var named=raw(p+'numero_tete')!=='';good=good&&evaluated&&named;out[p+'conforme']=good?'Conforme':failure?'Non conforme':'';out[p+'conforme_vert']=good?'Yes':'Off';out[p+'conforme_rouge']=failure?'Yes':'Off';if(good)complete++;if(failure)bad++;
 }
 out.Statut_conformite=bad?'Non conforme':complete===14?'Conforme':'';out.Bouton_Conforme=bad?'Off':'Yes';out.Bouton_NonConforme=bad?'Yes':'Off';return out;
}

export async function normalizeReportLayoutV2713(pdf,L,{key='',imageData}={}){
 const N=L.PDFName.of,form=pdf.getForm(),page=pdf.getPage(0),marker=N('CDQReportLayoutV2713');
 if(!form.getFieldMaybe('charge_point_1_charge_utilisee')||!form.getFieldMaybe('indicateur_fabricant'))return false;
 if(page.node.has(marker)){const ref=page.node.get(marker),contents=page.node.Contents(),i=contents.asArray().findIndex(x=>String(x)===String(ref));if(i>=0&&i!==contents.size()-1){contents.remove(i);contents.push(ref);return true;}return false;}
 const type=form.getFieldMaybe('type_balance'),label=type?.getText?.()||type?.getSelected?.().join(' ')||'';
 key=key||(/multi/i.test(label)?'multitete':/suspendue/i.test(label)?'suspendue':/train/i.test(label)?'train':/chariot/i.test(label)?'chariot':/convoyeur/i.test(label)?'convoyeur':/table/i.test(label)?'table':/pr[eé]cision/i.test(label)?'precision':'other');
 const font=pdf.embedStandardFont(L.StandardFonts.Helvetica),r=n=>form.getField(n).acroField.getWidgets()[0].getRectangle();page.node.normalize();const resources=page.node.Resources(),fonts=resources.lookupMaybe(N('Font'),L.PDFDict)||pdf.context.obj({});fonts.set(N('CDQ2713'),fonts.get(N('CDQ2704Regular'))||font.ref);resources.set(N('Font'),fonts);
 const text=(s,b,size=7,color='1 1 1')=>{const lines=s.split('|'),step=size+1,base=b.y+(b.height-(lines.length-1)*step-size*.718)/2;return lines.map((line,i)=>`q ${color} rg BT 0 Tc 0 Tw 100 Tz /CDQ2713 ${size} Tf ${b.x+(b.width-font.widthOfTextAtSize(line,size))/2} ${base+(lines.length-1-i)*step} Td ${font.encodeText(line)} Tj ET Q\n`).join('');};
 const cell=(b,fill=cyan)=>`q ${fill} rg .02 .85 .94 RG .6 w ${b.x} ${b.y} ${b.width} ${b.height} re B Q\n`,white=b=>`q 1 1 1 rg ${b.x} ${b.y} ${b.width} ${b.height} re f Q\n`;
 function resize(f,next,{size=9.2}={}){for(const w of f.acroField.getWidgets()){const old=w.getRectangle();w.setRectangle(next);clearWidgetFrameV2702(pdf,L,w);const ap=w.dict.lookupMaybe(N('AP'),L.PDFDict),normal=ap?.lookup(N('N'));if(normal instanceof L.PDFRawStream){const value=f.getText?.()||f.getSelected?.().join(' ')||'';const fit=Math.min(size,(next.width-3)/Math.max(1,font.widthOfTextAtSize(value,1)));ap.set(N('N'),pdf.context.register(pdf.context.flateStream(text(value,{x:0,y:0,width:next.width,height:next.height},fit,'0 0 0'),{Type:'XObject',Subtype:'Form',BBox:[0,0,next.width,next.height],Resources:{Font:{CDQ2713:fonts.get(N('CDQ2713'))}}})));}else if(normal instanceof L.PDFDict){for(const[state,ref]of normal.entries()){const a=pdf.context.lookup(ref);if(!(a instanceof L.PDFRawStream))continue;const body=new TextDecoder().decode(L.decodePDFRawStream(a).decode());normal.set(state,pdf.context.register(pdf.context.flateStream(`q ${next.width/old.width} 0 0 ${next.height/old.height} 0 0 cm ${body} Q`,{Type:'XObject',Subtype:'Form',BBox:[0,0,next.width,next.height],Resources:a.dict.lookupMaybe(N('Resources'),L.PDFDict)||pdf.context.obj({})})));}}}if(f.setFontSize){f.setFontSize(size);f.acroField.dict.set(N('DA'),L.PDFString.of('/CDQ2713 '+size+' Tf 0 g'));}form.markFieldAsClean(f.ref);}
 const dr=form.acroForm.dict.lookupMaybe(N('DR'),L.PDFDict)||pdf.context.obj({}),drFonts=dr.lookupMaybe(N('Font'),L.PDFDict)||pdf.context.obj({});drFonts.set(N('CDQ2713'),fonts.get(N('CDQ2713')));dr.set(N('Font'),drFonts);form.acroForm.dict.set(N('DR'),dr);
 let art='% CDQ centered report captions V2713\n';
 const first=r('indicateur_fabricant'),second=r('indicateur_modele'),left=10.8*page.getWidth()/612,right=page.getWidth()-12.3*page.getWidth()/612,gap=Math.max(.8,second.x-first.x-first.width);
 const height=page.getHeight()>820?15.533:16.5,hy=first.y+first.height+Math.max(.8,r('charge_point_1_charge_utilisee').y-r('charge_point_2_charge_utilisee').y-r('charge_point_1_charge_utilisee').height);
 const equipment=[{x:left,width:first.x-left-gap},...['fabricant','modele','numero_serie','numero_am'].filter(s=>form.getFieldMaybe('indicateur_'+s)).map(s=>r('indicateur_'+s))];
 equipment.forEach((b,i)=>{const box={...b,y:hy,height};art+=cell(box,blue)+text(['CATÉGORIE','FABRICANT','MODÈLE','N° DE SÉRIE','N° A-M'][i],box);});
 const captions={identification_balance:'IDENTIFICATION DE LA BALANCE',type_balance:'TYPE DE BALANCE',type_plateau:'TYPE DE PLATEAU',etendue_verifiee:'ÉTENDUE VÉRIFIÉE',legal_pour_commerce:'LÉGAL POUR LE COMMERCE',capacite_maximale:'CAPACITÉ MAXIMALE (Max)',unite_mesure:'UNITÉ DE MESURE',echelon:'ÉCHELON (e)',resolution:'RÉSOLUTION (d)',etalon_utilise:'ÉTALON UTILISÉ',points_test:'POINTS DE TEST'};
 for(const y of new Set(Object.keys(captions).filter(n=>form.getFieldMaybe(n)).map(n=>r(n).y+r(n).height))){art+=white({x:10,y:y+.6,width:page.getWidth()-20,height:11.5});}
 for(const[n,label]of Object.entries(captions))if(form.getFieldMaybe(n)){const a=r(n),box={x:a.x,y:a.y+a.height+1,width:a.width,height:10.5};art+=white(box)+text(label,box,7,ink);}
 if(key==='precision'){const field=form.getField('resolution');field.acroField.dict.delete(N('AA'));for(const w of field.acroField.getWidgets())w.dict.delete(N('AA'));}
 const point=r('charge_point_1_charge_utilisee'),last=form.getFields().filter(f=>/^charge_point_\d+_charge_utilisee$/.test(f.getName())).sort((a,b)=>Number(a.getName().match(/\d+/)[0])-Number(b.getName().match(/\d+/)[0])).at(-1),bottom=last.acroField.getWidgets()[0].getRectangle().y,headerY=point.y+point.height+2;
 if(key!=='multitete'){
  const cols=[['charge_utilisee','CHARGE|UTILISÉE'],['charge_contrainte','CHARGE DE|CONTRAINTE'],['tolerance','TOLÉRANCE'],['avant_correction','AVANT|CORRECTION'],['erreur_avant','ERREUR (e)'],['apres_correction','APRÈS|CORRECTION'],['erreur_apres','ERREUR (e)'],['conforme_vert','CONFORME']].filter(([s])=>form.getFieldMaybe('charge_point_1_'+s));
  const boxes=[[{x:left,width:point.x-left-gap},'POINT'],...cols.map(([s,t])=>[r('charge_point_1_'+s),t])];for(const[b,t]of boxes){const box={...b,y:headerY,height:18};art+=cell(box,blue)+text(t,box);}
 }
 if(key==='multitete'){
  const groups=[['charge_utilisee','CHARGES|UTILISÉES'],['tolerance','TOLÉRANCE (e)'],['avant_correction','AVANT|CORRECTION'],['erreur_avant','ERREUR (e)'],['apres_correction','APRÈS|CORRECTION'],['erreur_apres','ERREUR (e)']],head=34,check=46,width=436-left,gw=(width-head-check-8*1.2)/6,hTop=headerY+18,headerBottom=hTop-30,rowHeight=(headerBottom-bottom-14*1.2)/14;
  art+=white({x:left-1,y:bottom-1,width:436-left+2,height:hTop-bottom+2});
  art+=cell({x:left,y:headerBottom,width:head,height:30},blue)+text('N° DE|TÊTE',{x:left,y:headerBottom,width:head,height:30});
  for(const[j,[suffix,title]]of groups.entries()){const x=left+head+1.2+j*(gw+1.2);art+=cell({x,y:headerBottom+12,width:gw,height:18},blue)+text(title,{x,y:headerBottom+12,width:gw,height:18});for(let load=1;load<=2;load++)art+=cell({x:x+(load-1)*(gw+1.2)/2,y:headerBottom,width:(gw-1.2)/2,height:10.8},blue)+text('Poids '+load,{x:x+(load-1)*(gw+1.2)/2,y:headerBottom,width:(gw-1.2)/2,height:10.8});}
  const cx=436-check;art+=cell({x:cx,y:headerBottom,width:check,height:30},blue)+text('CONFORME',{x:cx,y:headerBottom,width:check,height:30});
  for(let i=1;i<=14;i++){const p='charge_point_'+i+'_',y=headerBottom-1.2-i*rowHeight-(i-1)*1.2,num=form.getTextField(p+'numero_tete');if(!num.getText())num.setText(String(i));resize(num,{x:left,y,width:head,height:rowHeight});art+=cell({x:left,y,width:head,height:rowHeight},'1 1 1');
   for(const[j,[suffix]]of groups.entries())for(let load=1;load<=2;load++){const name=p+suffix+(load===1?'':'_2'),f=form.getFieldMaybe(name)||cloneText(pdf,L,form.getField(p+suffix),name,page),x=left+head+1.2+j*(gw+1.2)+(load-1)*(gw+1.2)/2,box={x,y,width:(gw-1.2)/2,height:rowHeight};resize(f,box);art+=cell(box);}
   for(const suffix of ['conforme_vert','conforme_rouge'])resize(form.getField(p+suffix),{x:cx,y,width:check,height:rowHeight});art+=cell({x:cx,y,width:check,height:rowHeight});
  }
  const action='// CDQ two loads per head V2713\n'+multiHeadResultsV2713.toString().replace('multiHeadResultsV2713','cdqResults');
  patchJavascript(pdf,L,s=>{const begin=s.indexOf('function cdqResults(d)'),end=s.indexOf('function cdqApply(',begin);return begin>=0&&end>begin?s.slice(0,begin)+action+'\n'+s.slice(end):s;});
  const co=form.acroForm.dict.lookupMaybe(N('CO'),L.PDFArray)||pdf.context.obj([]);for(let i=1;i<=14;i++)for(const suffix of ['tolerance','erreur_avant','erreur_apres'])co.push(form.getField('charge_point_'+i+'_'+suffix+'_2').ref);form.acroForm.dict.set(N('CO'),co);
  art+=white({x:left,y:bottom-10,width:425,height:9})+text('Charges : unité choisie · Tolérances et erreurs : échelons (e)',{x:left,y:bottom-10,width:425,height:9},6,ink);
 }
 if(key==='train'){
  const top=page.getHeight()-618.8,x=148.9,gw=(right-x-4)/3;
  art+=white({x:10,y:top-82,width:page.getWidth()-20,height:101});
  for(let section=1;section<=3;section++){const box={x:x+(section-1)*(gw+2),y:top,width:gw,height:14};art+=cell(box,blue)+text('SECTION '+section,box);}
  for(const[i,[phase,direction,correction]]of [['AvantCorrection','Aller','AVANT CORRECTION'],['AvantCorrection','Retour','AVANT CORRECTION'],['ApresCorrection','Aller','APRÈS CORRECTION'],['ApresCorrection','Retour','APRÈS CORRECTION']].entries()){
   const y=top-18-i*18;art+=cell({x:10.8,y,width:91,height:16},'1 1 1')+text(correction,{x:10.8,y,width:91,height:16},7,ink)+cell({x:103.8,y,width:43.1,height:16},'1 1 1')+text(direction,{x:103.8,y,width:43.1,height:16},7,ink);
   for(let section=1;section<=6;section++){const f=form.getField('B4_'+direction+'_P'+section+'_'+phase);for(const w of f.acroField.getWidgets())w.dict.set(N('F'),pdf.context.obj(section<=3?4:2));if(section<=3){const box={x:x+(section-1)*(gw+2),y,width:gw,height:16};resize(f,box,{size:10.36});art+=cell(box);}}
  }
  // The locomotive remains intact. Draw the three actual weighing decks below its rails.
  for(let section=1;section<=3;section++){const bx=12+(section-1)*(page.getWidth()-24)/3,bw=(page.getWidth()-24)/3-2;art+=`q .68 .72 .76 rg .12 .2 .28 RG .6 w ${bx} ${top+20} ${bw} 8 re B ${bx+8} ${top+17} 8 3 re f ${bx+bw-16} ${top+17} 8 3 re f Q\n`;}
  patchJavascript(pdf,L,s=>s.replace(/(var cfg = )(\{.*?\})(, out =)/,(all,a,json,b)=>{const cfg=JSON.parse(json);if(cfg.kind!=='train')return all;for(const phase of ['avant','apres']){const suffix=phase==='avant'?'AvantCorrection':'ApresCorrection';cfg.groups[phase]=['Aller','Retour'].flatMap(direction=>[1,2,3].map(i=>'B4_'+direction+'_P'+i+'_'+suffix));}return a+JSON.stringify(cfg)+b;}));
 }
 if(key==='suspendue'){
  const ref=page.node.get(N('CDQReportLayoutV2677')),stream=pdf.context.lookup(ref),source=new TextDecoder().decode(L.decodePDFRawStream(stream).decode()),cut=source.indexOf('q 1 1 1 rg 10 15 592 277 re f Q');if(cut<0)throw Error('Suspendue conclusion layout missing');
  pdf.context.assign(ref,pdf.context.flateStream(source.slice(0,cut)+'q 1 0 0 1 0 -130 cm '+source.slice(cut)+' Q'));
  for(const name of ['resume_commentaires','Bouton_Conforme','Bouton_NonConforme'])for(const w of form.getField(name).acroField.getWidgets()){const old=w.getRectangle();w.setRectangle({...old,y:old.y-130});}
  art+=white({x:10,y:155,width:page.getWidth()-20,height:bottom-155});
  const image=await pdf.embedPng(await picture('suspendue',imageData)),objects=resources.lookupMaybe(N('XObject'),L.PDFDict)||pdf.context.obj({});objects.set(N('CDQHanging2713'),image.ref);resources.set(N('XObject'),objects);const ih=118,iw=ih*image.width/image.height;art+=`q ${iw} 0 0 ${ih} ${(page.getWidth()-iw)/2} 169 cm /CDQHanging2713 Do Q\n`;
 }
 if(['chariot','convoyeur','table'].includes(key)){
  const targets=key==='chariot'?[[145,180],[169,180],[145.01,156.82],[169.13,156.82]]:key==='convoyeur'?[[130,230],[184,230],[124,216],[190,216]]:[[133,226],[182,226],[128,209],[186,209]];
  let count=0;for(const[ref,o]of pdf.context.enumerateIndirectObjects()){
   if(!(o instanceof L.PDFRawStream)||o.dict.get(N('Subtype'))!==N('Form'))continue;const src=new TextDecoder().decode(L.decodePDFRawStream(o).decode());if(!src.includes('% CDQ floor arrow V2689'))continue;
   let local=0;const next=src.replace(/% CDQ floor arrow V2689\s*q\s+([^qQ]+?)\s+Q/g,(block,body)=>{const start=body.match(/([-\d.]+)\s+([-\d.]+)\s+m/);if(!start)throw Error('Arrow origin absent');const dx=Math.floor(local/4)*300,[tx,ty]=targets[local%4];local++;count++;return floorArrowPresentationV2695(+start[1],+start[2],tx+dx,ty,{left:(+start[1]-dx)<157});});
   const replacement=pdf.context.flateStream(next);for(const[k,v]of o.dict.entries())if(!['/Length','/Filter','/DecodeParms'].includes(String(k)))replacement.dict.set(k,v);pdf.context.assign(ref,replacement);
  }if(count!==8)throw Error('Arrow count differs for '+key+': '+count);
  if(key==='table'){
   const image=await pdf.embedPng(await picture('table-off',imageData));let replaced=0;
   for(const[ref,o]of pdf.context.enumerateIndirectObjects())if(o instanceof L.PDFRawStream&&o.dict.get(N('Subtype'))===N('Form')){const xs=o.dict.lookupMaybe(N('Resources'),L.PDFDict)?.lookupMaybe(N('XObject'),L.PDFDict);if(xs?.has(N('Hardware4'))){const hardware=xs.get(N('Hardware4')),old=pdf.context.lookup(hardware);if(old instanceof L.PDFRawStream){pdf.context.assign(hardware,pdf.context.flateStream('q 0 0 1 1 re W n 1 0 0 1 0 0 cm /TableOff2713 Do Q',{Type:'XObject',Subtype:'Form',BBox:[0,0,1,1],Resources:{XObject:{TableOff2713:image.ref}}}));replaced++;}}}if(!replaced)throw Error('Table photograph missing');
  }
 }
 // New text widgets reuse the report’s embedded regular font in all live resources.
 for(const[k,v]of drFonts.entries()){const f=pdf.context.lookup(v);if(f instanceof L.PDFDict&&f.get(N('BaseFont'))===N('Helvetica')&&!f.has(N('FontDescriptor')))drFonts.set(k,fonts.get(N('CDQ2713')));}
 const ref=pdf.context.register(pdf.context.flateStream(art));page.node.addContentStream(ref);page.node.set(marker,ref);return true;
}
