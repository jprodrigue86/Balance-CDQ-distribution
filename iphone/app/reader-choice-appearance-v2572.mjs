// Preserve an editable AcroForm when CDQ saves a client master PDF.
// The client-facing copy may be flattened separately by the send workflow.
let library;
async function pdfLibrary(){
  if(globalThis.PDFLib)return globalThis.PDFLib;
  library??=import('./vendor/pdf-lib-1.17.1.min.js').then(()=>globalThis.PDFLib);
  return library;
}

export async function saveEditableFormAppearance(bytes,providedLibrary){
  const {PDFDocument,PDFName,StandardFonts}=providedLibrary||await pdfLibrary();
  const pdf=await PDFDocument.load(bytes,{updateMetadata:false});
  const form=pdf.getForm();

  // Older CDQ saves could leave NeedAppearances=true. Some viewers then paint
  // the saved appearance briefly and subsequently cover it with an empty form
  // control. Keep the actual field values and their saved AP streams authoritative.
  form.acroForm.dict.set(PDFName.of('NeedAppearances'),pdf.context.obj(false));

  const field=form.getFieldMaybe('etalon_utilise');
  if(field?.getSelected&&field.acroField.hasFlag(1<<21)){
    const selected=field.getSelected(),font=await pdf.embedFont(StandardFonts.HelveticaBold);
    for(const widget of field.acroField.getWidgets()){
      const {width:w,height:h}=widget.getRectangle();
      const text=selected.join(' + '),available=w-14;
      let size=11.25,lines=[];
      function wrap(s){
        const result=[];let line='';
        for(const word of text.split(' ')){
          const candidate=line?line+' '+word:word;
          if(line&&font.widthOfTextAtSize(candidate,s)>available){result.push(line);line=word;}
          else line=candidate;
        }
        if(line)result.push(line);
        return result;
      }
      for(;size>3.5;size-=.25){lines=wrap(size);if(lines.length*size*1.15<=h-2)break;}
      lines=wrap(size);
      const commands=[
        `q .6 .992156863 .992156863 rg 0 0 ${w} ${h} re f .02 .85 .94 RG .6 w .3 .3 ${w-.6} ${h-.6} re S`,
        `0 0 0 rg ${w-9} ${h/2+1.5} m ${w-3} ${h/2+1.5} l ${w-6} ${h/2-1.5} l h f`,
        `1 1 ${w-12} ${h-2} re W n BT /CDQKit ${size} Tf 0 g`
      ];
      const lineHeight=size*1.15,top=(h+lines.length*lineHeight)/2-size;
      lines.forEach((line,i)=>{
        const x=2+(available-font.widthOfTextAtSize(line,size))/2;
        commands.push(`1 0 0 1 ${Math.max(2,x)} ${top-i*lineHeight} Tm ${font.encodeText(line)} Tj`);
      });
      commands.push('ET Q');
      const stream=pdf.context.flateStream(commands.join('\n'),{
        Type:'XObject',Subtype:'Form',BBox:[0,0,w,h],Resources:{Font:{CDQKit:font.ref}}
      });
      const ap=pdf.context.obj({N:pdf.context.register(stream)});
      widget.dict.set(PDFName.of('AP'),ap);
    }
  }

  // Never flatten the client master. PDF.js has already serialized values and
  // appearances for edited fields; preserve those streams and every widget.
  return pdf.save({updateFieldAppearances:false,useObjectStreams:true});
}

// Backward-compatible export used by older tests/modules.
export async function saveKitAppearance(bytes,providedLibrary){
  return saveEditableFormAppearance(bytes,providedLibrary);
}
