// Retire the duplicate, offset legacy client outlines. Their existing widget
// appearances already paint the approved cyan fill and uniform 0.6 pt border.
const families=new Set(['plancher','camion','train','chariot','convoyeur','multitete','suspendue','table','trackscale']);
const anchors=[
 [11.87111,662,297.78643,15],[315.09220,662,133.70328,15],[454.78456,662,145.34434,15],
 [11.87111,633.5,248.99999,15],[267.37110,633.5,154,15],[491.27638,633.5,108.85252,15],[427.871,633.5,54,15],
 [11.87111,605,47.78145,15],[76.72827,605,50.55313,15],[144.91144,605,52.77048,15],
 [267.97377,605,109.86693,15],[440.37184,605,45.00976,15],[501.34870,605,42.79240,15],[558.99948,605,41.12942,15]
];
export async function normalizeReportFramesV2725(pdf,L,{key}={}){
 if(!families.has(key))return false;
 const N=L.PDFName.of,page=pdf.getPage(0),visited=new Set();let changed=false;
 function visit(ref,resources){
  if(visited.has(String(ref)))return;visited.add(String(ref));
  const old=pdf.context.lookup(ref);if(!(old instanceof L.PDFRawStream))return;
  const source=Array.from(L.decodePDFRawStream(old).decode(),c=>String.fromCharCode(c)).join('');
  const next=source.replace(/([-\d.e]+)\s+([-\d.e]+)\s+([-\d.e]+)\s+([-\d.e]+)\s+re\s+B\b/g,(match,...args)=>
   anchors.some(a=>a.every((n,i)=>Math.abs(n-Number(args[i]))<.0001))?'q .6 w '+[Number(args[0])+.5,Number(args[1])+.5,Number(args[2])-1,Number(args[3])-1].map(n=>+n.toFixed(6)).join(' ')+' re B Q':match);
  if(next!==source){
   const replacement=pdf.context.flateStream(Uint8Array.from(next,c=>c.charCodeAt(0)));
   for(const[k,v]of old.dict.entries())if(!['/Length','/Filter','/DecodeParms'].includes(String(k)))replacement.dict.set(k,v);
   pdf.context.assign(ref,replacement);changed=true;
  }
  const local=old.dict.lookupMaybe(N('Resources'),L.PDFDict)||resources;
  const objects=local?.lookupMaybe(N('XObject'),L.PDFDict);
  for(const match of source.matchAll(/\/([A-Za-z0-9_.-]+)\s+Do\b/g)){
   const child=objects?.get(N(match[1])),object=child&&pdf.context.lookup(child);
   if(object instanceof L.PDFRawStream&&String(object.dict.get(N('Subtype')))==='/Form')visit(child,local);
  }
 }
 const contents=page.node.Contents();
 for(const ref of contents instanceof L.PDFArray?contents.asArray():[contents])if(ref)visit(ref,page.node.Resources());
 return changed;
}
