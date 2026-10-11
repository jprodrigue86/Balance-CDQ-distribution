// The V2704 heading is a cropped copy of old page artwork. A header call
// outside that Form's clipping box can be omitted without repainting anything.
const operators=new Set(('q Q cm w J j M d ri i gs m l c v y h re S s f F f* B B* b b* n W W* BT ET Tc Tw Tz TL Tf Tr Ts Td TD Tm T* Tj TJ \u0027 \u0022 d0 d1 CS cs SC SCN sc scn G g RG rg K k sh Do MP DP BMC BDC EMC BX EX').split(' '));
const white=c=>c===0||c===9||c===10||c===12||c===13||c===32;
const delimiter=c=>white(c)||'()<>[]{}/%'.includes(String.fromCharCode(c));
const number=/^[+-]?(?:\d+\.?\d*|\.\d+)$/;
const identity=[1,0,0,1,0,0];
const multiply=(a,b)=>[a[0]*b[0]+a[2]*b[1],a[1]*b[0]+a[3]*b[1],a[0]*b[2]+a[2]*b[3],a[1]*b[2]+a[3]*b[3],a[0]*b[4]+a[2]*b[5]+a[4],a[1]*b[4]+a[3]*b[5]+a[5]];
const intersect=(a,b)=>a&&b?[Math.max(a[0],b[0]),Math.max(a[1],b[1]),Math.min(a[2],b[2]),Math.min(a[3],b[3])]:null;
const empty=b=>!b||b[2]<=b[0]||b[3]<=b[1];

// Byte offsets are retained, including strings and comments. Inline images and
// unrecognised programs are deliberately left alone rather than guessed at.
function lex(bytes){
 let i=0;
 const text=(a,b)=>{let s='';for(let j=a;j<b;j++)s+=String.fromCharCode(bytes[j]);return s;};
 function skip(){while(i<bytes.length){if(white(bytes[i])){i++;continue;}if(bytes[i]===37){while(i<bytes.length&&bytes[i]!==10&&bytes[i]!==13)i++;continue;}break;}}
 function token(){
  skip();if(i===bytes.length)return null;const start=i,c=bytes[i++];
  if(c===40){let depth=1;while(i<bytes.length&&depth){const c=bytes[i++];if(c===92){if(i<bytes.length){if(bytes[i++]===13&&bytes[i]===10)i++;}}else if(c===40)depth++;else if(c===41)depth--;}if(depth)throw Error('string');return {start,end:i,type:'operand'};}
  if(c===91||c===60&&bytes[i]===60){const close=c===91?']':'>>';if(c===60)i++;while(true){skip();if(i>=bytes.length)throw Error('composite');if(close===']'&&bytes[i]===93){i++;break;}if(close==='>>'&&bytes[i]===62&&bytes[i+1]===62){i+=2;break;}token();}return {start,end:i,type:'operand'};}
  if(c===60){while(i<bytes.length&&bytes[i]!==62){if(!white(bytes[i])&&!/[0-9a-f]/i.test(String.fromCharCode(bytes[i])))throw Error('hex');i++;}if(i>=bytes.length)throw Error('hex');i++;return {start,end:i,type:'operand'};}
  if(c===47){while(i<bytes.length&&!delimiter(bytes[i]))i++;const raw=text(start+1,i);if(/#(?![\da-f]{2})/i.test(raw))throw Error('name');return {start,end:i,type:'name',value:raw.replace(/#([\da-f]{2})/gi,(_,h)=>String.fromCharCode(parseInt(h,16)))};}
  if(')>]}{'.includes(String.fromCharCode(c)))throw Error('delimiter');
  while(i<bytes.length&&!delimiter(bytes[i]))i++;const raw=text(start,i);
  if(number.test(raw)){const value=Number(raw);if(!Number.isFinite(value))throw Error('number');return {start,end:i,type:'number',value};}
  if(['true','false','null'].includes(raw))return {start,end:i,type:'operand'};
  if(!operators.has(raw))throw Error('operator');return {start,end:i,type:'operator',value:raw};
 }
 return {token};
}

function program(bytes,bbox){
 if(!(bytes instanceof Uint8Array)||bytes.length>524288)return null;
 try{
  const reader=lex(bytes),operands=[],stack=[],calls=[],removals=[];
  let state={ctm:identity.slice(),clip:bbox?.slice()||null},path=null,pendingClip=false,clipEvidence=null;
  const finite=(count)=>operands.length===count&&operands.every(t=>t.type==='number'&&Number.isFinite(t.value));
  let t;
  while((t=reader.token())){
   if(t.type!=='operator'){operands.push(t);if(operands.length>1024)throw Error('operands');continue;}
   const op=t.value;
   if(op==='q'){if(operands.length)throw Error('q');stack.push({ctm:state.ctm.slice(),clip:state.clip?.slice()||null,evidence:clipEvidence});}
   else if(op==='Q'){if(operands.length||!stack.length)throw Error('Q');const old=stack.pop();state={ctm:old.ctm,clip:old.clip};clipEvidence=old.evidence;}
   else if(op==='cm'){if(!finite(6))throw Error('cm');state.ctm=multiply(state.ctm,operands.map(t=>t.value));if(!state.ctm.every(Number.isFinite))throw Error('cm');}
   else if(op==='re'){
    if(!finite(4))throw Error('re');const [x,y,w,h]=operands.map(t=>t.value),m=state.ctm;
    const points=[[x,y],[x+w,y],[x,y+h],[x+w,y+h]].map(([x,y])=>[m[0]*x+m[2]*y+m[4],m[1]*x+m[3]*y+m[5]]);
    if(!points.flat().every(Number.isFinite))throw Error('re');
    const bounds=[Math.min(...points.map(p=>p[0])),Math.min(...points.map(p=>p[1])),Math.max(...points.map(p=>p[0])),Math.max(...points.map(p=>p[1]))];
    if(!path)path={bounds,ctm:m.slice(),rect:[x,y,w,h]};else if(path.bounds)path={bounds:[Math.min(path.bounds[0],bounds[0]),Math.min(path.bounds[1],bounds[1]),Math.max(path.bounds[2],bounds[2]),Math.max(path.bounds[3],bounds[3])],ctm:null,rect:null};
   }
   else if(['m','l','c','v','y','h'].includes(op)){path={bounds:null};}
   else if(op==='W'||op==='W*'){if(operands.length)throw Error('W');pendingClip=true;}
   else if(['n','S','s','f','F','f*','B','B*','b','b*'].includes(op)){
    if(pendingClip&&path?.bounds){state.clip=intersect(state.clip,path.bounds);clipEvidence={ctmAtClip:path.ctm,localClip:path.rect,clipBounds:path.bounds};}
    path=null;pendingClip=false;
   }
   else if(op==='Do'){
    if(operands.length!==1||operands[0].type!=='name')throw Error('Do');const name=operands[0].value;calls.push(name);
    if(bbox&&name==='CDQHeaderFinal'&&empty(state.clip)&&clipEvidence)removals.push({start:operands[0].start,end:t.end,parentBBox:bbox.slice(),ctmAtCall:state.ctm.slice(),...clipEvidence,intersectionBounds:state.clip?.slice()||null,intersectionArea:0});
   }
   operands.length=0;
  }
  if(stack.length||operands.length||bbox&&pendingClip)throw Error('incomplete');
  return {calls,removals};
 }catch{return null;}
}

function appearanceReachability(pdf,L){
 const N=L.PDFName.of,seen=new Set();let uncertain=false;
 const resolve=o=>o?pdf.context.lookup(o):null;
 function visit(o){
  o=resolve(o);if(!o||seen.has(o))return;seen.add(o);
  if(o instanceof L.PDFDict){for(const[,v]of o.entries())visit(v);return;}
  if(!(o instanceof L.PDFRawStream)||o.dict.get(N('Subtype'))!==N('Form'))return;
  let parsed;try{parsed=program(L.decodePDFRawStream(o).decode(),null);}catch{}
  const resources=o.dict.lookupMaybe(N('Resources'),L.PDFDict),objects=resources?.lookupMaybe(N('XObject'),L.PDFDict);
  if(!parsed){if(objects)for(const[,v]of objects.entries())visit(v);else uncertain=true;return;}
  for(const name of parsed.calls){const target=objects?.get(N(name));if(target)visit(target);else uncertain=true;}
 }
 for(const[,o]of pdf.context.enumerateIndirectObjects())if(o instanceof L.PDFDict&&o.has(N('AP')))visit(o.get(N('AP')));
 return {seen,uncertain};
}

export function pruneInvisibleReportHeadingV2730(pdf,L,{onPrune}={}){
 const N=L.PDFName.of;let changed=false;
 try{
  const appearances=appearanceReachability(pdf,L);if(appearances.uncertain)return false;
  const visited=new Set();
  for(const page of pdf.getPages()){
   if(!page.node.has(N('CDQReportLayoutV2704')))continue;
   const objects=page.node.Resources()?.lookupMaybe(N('XObject'),L.PDFDict),ref=objects?.get(N('CDQ2704Heading')),stream=ref&&pdf.context.lookup(ref);
   if(!(stream instanceof L.PDFRawStream)||visited.has(stream)||appearances.seen.has(stream))continue;visited.add(stream);
   if(stream.dict.get(N('Subtype'))!==N('Form')||stream.dict.get(N('Filter'))!==N('FlateDecode')||stream.dict.has(N('DecodeParms')))continue;
   const box=stream.dict.lookupMaybe(N('BBox'),L.PDFArray);if(!box||box.size()!==4)continue;
   const bbox=box.asArray().map(n=>pdf.context.lookup(n)?.asNumber?.());if(!bbox.every(Number.isFinite)||empty(bbox))continue;
   const resources=stream.dict.lookupMaybe(N('Resources'),L.PDFDict),child=resources?.lookupMaybe(N('XObject'),L.PDFDict)?.get(N('CDQHeaderFinal'));
   if(!(child&&pdf.context.lookup(child) instanceof L.PDFRawStream))continue;
   const bytes=L.decodePDFRawStream(stream).decode(),parsed=program(bytes,bbox);if(!parsed?.removals.length)continue;
   let length=bytes.length;for(const r of parsed.removals)length-=r.end-r.start;
   const output=new Uint8Array(length);let source=0,dest=0;
   for(const r of parsed.removals){output.set(bytes.subarray(source,r.start),dest);dest+=r.start-source;source=r.end;}
   output.set(bytes.subarray(source),dest);
   const replacement=pdf.context.flateStream(output);
   for(const[k,v]of stream.dict.entries())if(String(k)!=='/Length')replacement.dict.set(k,v);
   pdf.context.assign(ref,replacement);changed=true;
   onPrune?.({ref:String(ref),originalDecodedBytes:bytes.length,prunedDecodedBytes:output.length,removals:parsed.removals.map(r=>({...r,removedBytes:Array.from(bytes.subarray(r.start,r.end))}))});
  }
 }catch{/* Unsupported reports retain their original artwork. */}
 return changed;
}
