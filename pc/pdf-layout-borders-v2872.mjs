// Pure pdf-lib helper. Call after PDF.js saveDocument/defaultUpdateAppearances.
// Text operators, field values/actions, and appearance resources are retained.
export const CDQ_BORDER_WIDTH_V2872=0.6;
const COLOR=[0.43,0.72,0.79];
const fmt=v=>String(Number(Number(v).toFixed(7)));
const gridName=/^(poids|balance|reference)_(\d\d)_(\d\d)$/;

export function tableBorderSidesV2872(name){
  const m=gridName.exec(String(name));
  if(!m)return null;
  return {left:Number(m[3])===1,right:true,top:Number(m[2])===1,bottom:true};
}
export function tableBorderStyleV2872(name,pixelsPerPoint=1){
  const sides=tableBorderSidesV2872(name);
  if(!sides)return null;
  if(!(Number.isFinite(pixelsPerPoint)&&pixelsPerPoint>0))throw Error('Invalid PDF scale');
  const width=fmt(CDQ_BORDER_WIDTH_V2872*pixelsPerPoint)+'px';
  return {boxSizing:'border-box',borderStyle:'solid',borderColor:'rgb(110,184,201)',
    borderLeftWidth:sides.left?width:'0px',borderRightWidth:width,
    borderTopWidth:sides.top?width:'0px',borderBottomWidth:width};
}

function tokens(source){
  const result=[];let i=0;
  const space=c=>/[\x00\t\n\f\r ]/.test(c);
  const delimiter=c=>!c||space(c)||'()<>[]{}/%'.includes(c);
  while(i<source.length){
    if(space(source[i])){i++;continue;}
    if(source[i]==='%'){while(i<source.length&&!/[\r\n]/.test(source[i]))i++;continue;}
    const start=i,c=source[i];
    if(c==='('){
      let depth=1;i++;
      while(i<source.length&&depth){
        if(source[i]==='\\'){i++;if(source[i]==='\r'&&source[i+1]==='\n')i++;i++;continue;}
        if(source[i]==='(')depth++;else if(source[i]===')')depth--;i++;
      }
      if(depth)throw Error('Unclosed PDF string');
      result.push({kind:'string',value:source.slice(start,i),start,end:i});continue;
    }
    if(c==='<'&&source[i+1]!=='<'){
      i++;while(i<source.length&&source[i]!=='>')i++;
      if(i===source.length)throw Error('Unclosed PDF hex string');
      i++;result.push({kind:'string',value:source.slice(start,i),start,end:i});continue;
    }
    if(c==='/'){
      i++;while(i<source.length&&!delimiter(source[i]))i++;
      result.push({kind:'name',value:source.slice(start,i),start,end:i});continue;
    }
    if('[]<>{}'.includes(c)){
      i+=((c==='<'||c==='>')&&source[i+1]===c)?2:1;
      result.push({kind:'delimiter',value:source.slice(start,i),start,end:i});continue;
    }
    i++;while(i<source.length&&!delimiter(source[i]))i++;
    const value=source.slice(start,i);
    result.push({kind:/^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(value)?'number':'word',value,start,end:i});
  }
  return result;
}
export function appearanceTextBlocksV2872(source){
  const all=tokens(source),blocks=[];let start=null;
  for(const t of all){
    if(t.kind!=='word')continue;
    if(t.value==='BT'){if(start!==null)throw Error('Nested PDF text');start=t.start;}
    if(t.value==='ET'&&start!==null){blocks.push(source.slice(start,t.end));start=null;}
  }
  if(start!==null)throw Error('Unclosed PDF text');
  return blocks;
}
function removeOuterStrokes(source,bbox){
  const all=tokens(source),edits=[];let inText=false,points=[],clip=false;
  const operands=(index,count)=>{
    const ts=all.slice(index-count,index);
    return ts.length===count&&ts.every(t=>t.kind==='number')?ts.map(t=>Number(t.value)):null;
  };
  for(let i=0;i<all.length;i++){
    const t=all[i];if(t.kind!=='word')continue;const op=t.value;
    if(op==='BT'){inText=true;continue;}if(op==='ET'){inText=false;continue;}if(inText)continue;
    if(op==='re'){
      const a=operands(i,4);if(a){const[x,y,w,h]=a;points.push([x,y],[x+w,y+h]);}
    }else if(op==='m'||op==='l'){
      const a=operands(i,2);if(a)points.push(a);
    }else if(op==='c'||op==='v'||op==='y'){
      // Rounded or nonrectangular AP artwork isn't treated as an outer frame.
      points=[];clip=true;
    }else if(op==='W'||op==='W*'){clip=true;}
    else if(['S','s','B','B*','b','b*','f','f*','n'].includes(op)){
      if(points.length&&!clip&&['S','s','B','B*','b','b*'].includes(op)){
        const bounds=[Math.min(...points.map(p=>p[0])),Math.min(...points.map(p=>p[1])),
          Math.max(...points.map(p=>p[0])),Math.max(...points.map(p=>p[1]))];
        if(bounds.every((v,j)=>Math.abs(v-bbox[j])<2)){
          edits.push({start:t.start,end:t.end,value:['B','b'].includes(op)?'f':['B*','b*'].includes(op)?'f*':'n'});
        }
      }
      points=[];clip=false;
    }
  }
  for(const e of edits.reverse())source=source.slice(0,e.start)+e.value+source.slice(e.end);
  return {source,count:edits.length};
}
function borderCommands(width,height,sides){
  const inset=CDQ_BORDER_WIDTH_V2872/2,paths={
    left:[inset,inset,inset,height-inset],right:[width-inset,inset,width-inset,height-inset],
    bottom:[inset,inset,width-inset,inset],top:[inset,height-inset,width-inset,height-inset]};
  let out='% CDQ2872_BORDER_BEGIN\nq\n'+COLOR.map(fmt).join(' ')+' RG\n0.6 w\n0 J\n0 j\n';
  for(const side of ['left','right','bottom','top']){
    if(!sides[side])continue;const [x,y,x2,y2]=paths[side];out+=fmt(x)+' '+fmt(y)+' m '+fmt(x2)+' '+fmt(y2)+' l\n';
  }
  return out+'S\nQ\n% CDQ2872_BORDER_END\n';
}
function decoded(source,L){
  const data=source instanceof L.PDFRawStream?L.decodePDFRawStream(source).decode():source.getUnencodedContents();let s='';
  for(let i=0;i<data.length;i+=8192)s+=String.fromCharCode(...data.subarray(i,i+8192));
  return s;
}
function numbers(array,L){return array.asArray().map((v,i)=>array.lookup(i,L.PDFNumber).asNumber());}
function transformToWidget(bbox,matrix,width,height){
  const[a,b,c,d,e,f]=matrix,[x0,y0,x1,y1]=bbox;
  const pts=[[x0,y0],[x1,y0],[x1,y1],[x0,y1]].map(([x,y])=>[a*x+c*y+e,b*x+d*y+f]);
  const minx=Math.min(...pts.map(p=>p[0])),maxx=Math.max(...pts.map(p=>p[0]));
  const miny=Math.min(...pts.map(p=>p[1])),maxy=Math.max(...pts.map(p=>p[1]));
  if(!(maxx>minx&&maxy>miny))throw Error('Invalid appearance bounding box');
  const sx=width/(maxx-minx),sy=height/(maxy-miny);
  return [sx*a,sy*b,sx*c,sy*d,sx*(e-minx),sy*(f-miny)];
}

export function normalizePdfLayoutBordersV2872(pdf,L){
  const N=L.PDFName.of;
  if(pdf.catalog.lookupMaybe(N('CDQVisualV2872'),L.PDFNumber)?.asNumber()!==2872)
    return {changed:0,skipped:0,reason:'unmarked PDF'};
  const weights=pdf.catalog.lookupMaybe(N('CDQWeightsV2871'),L.PDFNumber)?.asNumber()===2871;
  const result={changed:0,skipped:0,grid:0,regular:0,details:[]};
  for(const field of pdf.getForm().getFields()){
    if(!(field instanceof L.PDFTextField||field instanceof L.PDFDropdown))continue;
    for(const widget of field.acroField.getWidgets()){
      const name=field.getName(),grid=weights?tableBorderSidesV2872(name):null;
      const mk=widget.dict.lookupMaybe(N('MK'),L.PDFDict),bc=mk?.lookupMaybe(N('BC'),L.PDFArray);
      const color=bc?numbers(bc,L):[];
      if(!grid&&!(color.length===3&&color[0]>.15&&color[0]<.8&&color[1]>.45&&color[1]<.9&&color[2]>.6&&color[2]<.95&&color[1]-color[0]>.1))continue;
      const rectangle=widget.getRectangle(),{width,height}=rectangle;
      if(width<4||height<4)continue;
      const ap=widget.dict.lookupMaybe(N('AP'),L.PDFDict),stream=ap?.lookup(N('N'));
      if(!(stream instanceof L.PDFRawStream||stream instanceof L.PDFContentStream)){result.skipped++;continue;}
      const bboxArray=stream.dict.lookupMaybe(N('BBox'),L.PDFArray);if(!bboxArray){result.skipped++;continue;}
      const bbox=numbers(bboxArray,L),matrixArray=stream.dict.lookupMaybe(N('Matrix'),L.PDFArray);
      const matrix=matrixArray?numbers(matrixArray,L):[1,0,0,1,0,0];
      const source=decoded(stream,L),sides=grid||{left:true,right:true,top:true,bottom:true};
      const commands=borderCommands(width,height,sides);
      if(source.includes(commands)&&bbox.every((v,i)=>Math.abs(v-[0,0,width,height][i])<.001)
         &&matrix.every((v,i)=>Math.abs(v-[1,0,0,1,0,0][i])<.001)){result.skipped++;continue;}
      const beforeText=appearanceTextBlocksV2872(source);
      let cleaned;
      if(source.includes('% CDQ2872_BORDER_BEGIN')){
        const start=source.indexOf('% CDQ2872_BORDER_BEGIN'),end=source.indexOf('% CDQ2872_BORDER_END',start);
        if(end<0)throw Error('Incomplete canonical PDF border');
        cleaned={source:source.slice(0,start)+source.slice(end+'% CDQ2872_BORDER_END'.length),count:1};
      }else cleaned=removeOuterStrokes(source,bbox);
      if(!cleaned.count){result.skipped++;continue;}
      const transform=transformToWidget(bbox,matrix,width,height);
      const nextSource='q\n'+transform.map(fmt).join(' ')+' cm\n'+cleaned.source+'\nQ\n'+commands;
      if(JSON.stringify(beforeText)!==JSON.stringify(appearanceTextBlocksV2872(nextSource)))throw Error('PDF text changed during border normalization');
      const next=pdf.context.flateStream(Uint8Array.from(nextSource,c=>c.charCodeAt(0)));
      for(const[key,value]of stream.dict.entries())
        if(!['Length','Filter','DecodeParms','BBox','Matrix'].includes(key.decodeText()))next.dict.set(key,value);
      next.dict.set(N('BBox'),pdf.context.obj([0,0,width,height]));
      ap.set(N('N'),pdf.context.register(next));
      const bs=widget.dict.lookupMaybe(N('BS'),L.PDFDict)||pdf.context.obj({});
      bs.set(N('W'),L.PDFNumber.of(CDQ_BORDER_WIDTH_V2872));bs.set(N('S'),N('S'));widget.dict.set(N('BS'),bs);
      result.changed++;if(grid)result.grid++;else result.regular++;
      result.details.push({name,sides,width:CDQ_BORDER_WIDTH_V2872,textPreserved:true});
    }
  }
  return result;
}

const winAnsiExtra=new Map([
  ['€',128],['‚',130],['ƒ',131],['„',132],['…',133],['†',134],['‡',135],
  ['ˆ',136],['‰',137],['Š',138],['‹',139],['Œ',140],['Ž',142],
  ['‘',145],['’',146],['“',147],['”',148],['•',149],['–',150],['—',151],
  ['˜',152],['™',153],['š',154],['›',155],['œ',156],['ž',158],['Ÿ',159],
]);
function winAnsiBytes(text){
  const bytes=[];
  for(const c of String(text)){
    const n=c.codePointAt(0);
    if(n>=32&&n<=126||n>=160&&n<=255)bytes.push(n);
    else if(winAnsiExtra.has(c))bytes.push(winAnsiExtra.get(c));
    else throw Error('Character not supported by the existing FRC WinAnsi font');
  }
  return bytes;
}
// Optional prefill companion. The caller explicitly selects touched fields.
// No value is computed, changed, inferred, or copied from another field here.
export function refreshWeightTextAppearanceV2872(pdf,L,fieldNames){
  const N=L.PDFName.of;
  if(pdf.catalog.lookupMaybe(N('CDQVisualV2872'),L.PDFNumber)?.asNumber()!==2872||
     pdf.catalog.lookupMaybe(N('CDQWeightsV2871'),L.PDFNumber)?.asNumber()!==2871)
    return {changed:0,reason:'unmarked weights PDF'};
  const form=pdf.getForm(),dr=form.acroForm.dict.lookupMaybe(N('DR'),L.PDFDict);
  const fonts=dr?.lookupMaybe(N('Font'),L.PDFDict),fontRef=fonts?.get(N('FRC'));
  const font=fonts?.lookupMaybe(N('FRC'),L.PDFDict);
  const widths=font?.lookupMaybe(N('Widths'),L.PDFArray);
  const first=font?.lookupMaybe(N('FirstChar'),L.PDFNumber)?.asNumber();
  if(!fontRef||!widths||!Number.isFinite(first))throw Error('Original FRC font is unavailable');
  const descriptor=font.lookupMaybe(N('FontDescriptor'),L.PDFDict);
  const ascent=(descriptor?.lookupMaybe(N('Ascent'),L.PDFNumber)?.asNumber()??928)/1000;
  const descent=(descriptor?.lookupMaybe(N('Descent'),L.PDFNumber)?.asNumber()??-244)/1000;
  const result={changed:0,details:[]};
  for(const name of new Set(fieldNames)){
    const field=form.getFieldMaybe(String(name));
    if(!(field instanceof L.PDFTextField)||field.isMultiline?.())continue;
    const value=field.getText()||'',bytes=winAnsiBytes(value);
    let advance=0;
    for(const byte of bytes){
      const index=byte-first;
      if(index<0||index>=widths.size())throw Error('Glyph outside original FRC width table');
      advance+=widths.lookup(index,L.PDFNumber).asNumber()/1000;
    }
    for(const widget of field.acroField.getWidgets()){
      const {width,height}=widget.getRectangle();if(width<4||height<4)continue;
      const size=Math.min(8.5,advance>0?(width-5)/advance:8.5);
      const align=field.getAlignment(),textWidth=advance*size;
      const x=align===1?(width-textWidth)/2:align===2?width-2.5-textWidth:2.5;
      const y=(height-size*(ascent+descent))/2;
      const hex=bytes.map(b=>b.toString(16).padStart(2,'0')).join('');
      const sides=tableBorderSidesV2872(name)||{left:true,right:true,top:true,bottom:true};
      const source='q\n1 1 1 rg\n0 0 '+fmt(width)+' '+fmt(height)+' re f\nQ\n'+
        'BT\n/FRC '+fmt(size)+' Tf\n.035 .16 .32 rg\n1 0 0 1 '+fmt(x)+' '+fmt(y)+' Tm\n<'+hex+'> Tj\nET\n'+
        borderCommands(width,height,sides);
      const ap=widget.dict.lookupMaybe(N('AP'),L.PDFDict)||pdf.context.obj({});
      const stream=pdf.context.flateStream(Uint8Array.from(source,c=>c.charCodeAt(0)),{
        Type:'XObject',Subtype:'Form',BBox:[0,0,width,height],Resources:{Font:{FRC:fontRef}}});
      ap.set(N('N'),pdf.context.register(stream));widget.dict.set(N('AP'),ap);
      const bs=widget.dict.lookupMaybe(N('BS'),L.PDFDict)||pdf.context.obj({});
      bs.set(N('W'),L.PDFNumber.of(.6));bs.set(N('S'),N('S'));widget.dict.set(N('BS'),bs);
      // Preserve the family's actual font for later PDF.js editing.
      field.acroField.setDefaultAppearance('/FRC 8.5 Tf .035 .16 .32 rg');
      result.changed++;result.details.push({name,size,font:'FRC',valuePreserved:true});
    }
    form.markFieldAsClean(field.ref);
  }
  return result;
}
