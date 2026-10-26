import {approvedReportFamilyV2735} from './reader-approved-reports-v2735.mjs';

// Presentation provenance only. Does not authorize data, cache or Drive access.
export function t05Family(pdf,L){
  const N=L.PDFName.of,m=pdf.catalog.lookupMaybe(N('CDQT05'),L.PDFDict);
  if(!m||m.lookupMaybe(N('Revision'),L.PDFNumber)?.asNumber()!==1||m.lookupMaybe(N('FontWeight'),L.PDFNumber)?.asNumber()!==850)return null;
  const family=m.lookupMaybe(N('Family'),L.PDFString)?.decodeText();
  const approved=approvedReportFamilyV2735(pdf,L);
  if(!approved||approved.replace(/4$/,'')!==family)return null;
  const font=pdf.getForm().acroForm.dict.lookupMaybe(N('DR'),L.PDFDict)?.lookupMaybe(N('Font'),L.PDFDict)?.lookupMaybe(N('Roboto850'),L.PDFDict);
  return font?.lookupMaybe(N('BaseFont'),L.PDFName)?.decodeText()==='Roboto850'?family:null;
}

export function prepareT05Save(pdf,L){
  const family=t05Family(pdf,L);if(!family)return false;
  const N=L.PDFName.of,form=pdf.getForm();
  // PDF.js does not serialize push-button visibility; retain the selected
  // native plateau image in the saved PDF, including passive PDF viewers.
  if(family==='precision'&&pdf.catalog.has(N('CDQVisual20261026'))){
    const selected=form.getField('type_plateau').getSelected()[0];
    const shape=selected==='Triangle'?'triangle':selected==='Rond'?'round':'square';
    for(const field of form.getFields()){
      const m=/^plateau_image_(avant|apres)_(square|round|triangle)$/.exec(field.getName());
      if(!m)continue;
      for(const widget of field.acroField.getWidgets()){
        const flags=widget.getFlags();widget.setFlags(m[2]===shape?(flags&~(2|32))|4:flags|2|32);
      }
    }
  }

  if(['precision','cuve','tremie'].includes(family)){
    const selected=form.getField(family==='precision'?'type_plateau':'points_test').getSelected()[0];
    const hidden=selected==='Triangle'||selected==='3 points';
    for(const phase of ['avant','apres'])for(const widget of form.getField('excentricite_'+phase+'_arriere_droit').acroField.getWidgets()){
      const flags=widget.getFlags();widget.setFlags(hidden?flags|2:flags&~2);
    }
  }
  if(family==='table'){
    const marker=pdf.catalog.lookup(N('CDQT05'),L.PDFDict),scale=marker.lookup(N('BodyScale'),L.PDFNumber).asNumber(),offset=marker.lookup(N('BodyOffset'),L.PDFNumber).asNumber();
    const choice=form.getField('colonne'),selected=choice.getSelected()[0];
    const type=form.getField('type_balance').getSelected()[0];
    const mode=type==='Balance compteuse'?'Sans':selected==='Avec'?'Avec':'Sans';
    if(selected!==mode)choice.select(mode);
    for(const [prefix,ys]of Object.entries({indicateur:[543,543],base_balance:[543,527],imprimante:[527,511]})){
      const y=ys[mode==='Avec'?1:0]*scale+offset;
      for(const suffix of ['fabricant','modele','numero_serie','numero_am']){
        const f=form.getFieldMaybe(prefix+'_'+suffix);if(!f)continue;
        for(const widget of f.acroField.getWidgets()){
          const rect=widget.getRectangle();if(Math.abs(rect.y-y)>.001)widget.setRectangle({...rect,y:Number(y.toFixed(5))});
          const flags=widget.getFlags();widget.setFlags(mode==='Sans'&&prefix==='indicateur'?flags|2|32:(flags&~(2|32))|4);
        }
      }
    }
  }
  // The native DA, Q and full embedded Roboto font let PDF.js retain its own
  // formatted strings (notably 1000.000, ±1e and multiline notes) in each AP.
  centerSerializedT05Text(pdf,L);
  form.acroForm.dict.set(N('NeedAppearances'),pdf.context.obj(false));
  return true;
}

// PDF.js writes combo-box appearances left aligned even with /Q 1. Adjust
// only its serialized single-line text position/size, keeping the actual
// formatted literal, font, color, frame and calculation value untouched.
function centerSerializedT05Text(pdf,L){
  const N=L.PDFName.of;
  for(const field of pdf.getForm().getFields()){
    if(!(field instanceof L.PDFTextField||field instanceof L.PDFDropdown)||field.isMultiline?.())continue;
    for(const widget of field.acroField.getWidgets()){
      const ap=widget.dict.lookupMaybe(N('AP'),L.PDFDict),stream=ap?.lookupMaybe(N('N'),L.PDFRawStream);if(!stream)continue;
      const raw=L.decodePDFRawStream(stream).decode();let source='';for(let i=0;i<raw.length;i+=8192)source+=String.fromCharCode(...raw.subarray(i,i+8192));
      if(!source.startsWith('/Tx BMC'))continue;
      const blocks=source.match(/BT[\s\S]*?ET/g);if(blocks?.length!==1)continue;
      const block=blocks[0],tf=/\/Roboto850\s+([\d.]+)\s+Tf/.exec(block),td=/1 0 0 1 0 0 Tm\s+([-\d.]+)\s+([-\d.]+)\s+Td/.exec(block);
      const draws=[...block.matchAll(/(\((?:\\[\s\S]|[^\\()])*\)|<[\da-fA-F]+>)\s*Tj/g)];if(!tf||!td||draws.length!==1)continue;
      const token=draws[0][1],chars=(token[0]==='('?L.PDFString.of(token.slice(1,-1)):L.PDFHexString.of(token.slice(1,-1))).asBytes();
      const fonts=stream.dict.lookupMaybe(N('Resources'),L.PDFDict)?.lookupMaybe(N('Font'),L.PDFDict),font=fonts?.lookupMaybe(N('Roboto850'),L.PDFDict);
      const widths=font?.lookupMaybe(N('Widths'),L.PDFArray),first=font?.lookupMaybe(N('FirstChar'),L.PDFNumber)?.asNumber()||0;if(!widths)continue;
      let advance=0;for(const c of chars)advance+=widths.lookup(c-first,L.PDFNumber).asNumber()/1000;
      if(!(advance>0))continue;
      const rect=widget.getRectangle(),size=Number(tf[1]),nextSize=Math.min(size,(rect.width-3)/advance);
      if(!(nextSize>0))continue;
      const x=(rect.width-advance*nextSize)/2,y=Number(td[2])+(size-nextSize)*.718/2;
      if(Math.abs(x-Number(td[1]))<.02&&Math.abs(nextSize-size)<.001)continue;
      const nextBlock=block.replace(tf[0],'/Roboto850 '+nextSize.toFixed(5)+' Tf').replace(td[0],'1 0 0 1 0 0 Tm '+x.toFixed(5)+' '+y.toFixed(5)+' Td');
      const next=pdf.context.flateStream(Uint8Array.from(source.replace(block,nextBlock),c=>c.charCodeAt(0)));
      for(const [key,value]of stream.dict.entries())if(!['Length','Filter','DecodeParms'].includes(key.decodeText()))next.dict.set(key,value);
      ap.set(N('N'),pdf.context.register(next));
    }
  }
}

export function installT05Font(){
  if(typeof document==='undefined'||document.getElementById('cdq-t05-font'))return;
  const style=document.createElement('style');style.id='cdq-t05-font';
  style.textContent=`@font-face{font-family:CDQRoboto850;src:url("${new URL('../../pc/assets/fonts/t05-roboto850.ttf',import.meta.url).href}") format("truetype");font-weight:850;font-style:normal;font-display:swap}#viewer[data-cdq-t05="true"] button.cdq-choice-field{padding-left:0!important;padding-right:0!important}#viewer[data-cdq-t05="true"] .textWidgetAnnotation.hasOwnCanvas:has(>input[name="type_balance"][data-cdq-auto-field="true"]){border-color:transparent!important}`;
  document.head.append(style);
}

export function styleT05Fields(surface){
  if(surface?.dataset.cdqT05!=='true')return false;
  const corrected=!!surface.querySelector('input[name^="_cdq_visual_"]');
  if(corrected)for(const indicator of surface.querySelectorAll('input[name^="_cdq_visual_"]')){const section=indicator.closest('section');if(section)section.style.setProperty('pointer-events','none','important');}
  for(const field of surface.querySelectorAll('input:not([type=checkbox]),textarea,select,button.cdq-choice-field')){
    if(!field.name)continue;
    for(const [key,value]of Object.entries({'font-family':'CDQRoboto850,Arial,sans-serif','font-weight':'850','text-align':'center',color:corrected&&!field.name.endsWith('_numero_tete')&&/^(charge_point_|excentricite_(avant|apres)_|B4_|charge_excentricite$|tolerance_excentricite$)/.test(field.name)?'#000000':field.name.endsWith('_numero_tete')?'#101B7A':'#061B35'}))if(field.style.getPropertyValue(key)!==value||field.style.getPropertyPriority(key)!=='important')field.style.setProperty(key,value,'important');
    // PDF.js leaves the native /BS width in unscaled CSS pixels. Scale its
    // existing border like the .6pt native correction-frame canvases, without
    // adding a second rectangle or changing any widget geometry.
    const section=field.closest('section');
    if(corrected&&section?.style.borderStyle==='solid'&&parseFloat(section.style.borderWidth)>0){
      const width='calc(0.6px * var(--total-scale-factor))';
      if(section.style.getPropertyValue('border-width')!==width)section.style.setProperty('border-width',width,'important');
    }
  }
  return true;
}
