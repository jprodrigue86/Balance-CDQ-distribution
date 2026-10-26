// Presentation schema only: no authorization, cache, Drive or bundle privileges.
const PREFIX='_cdq_visual_', HELPER=PREFIX+'recalculate';
const SOURCES=new Set([
 '73db995205bd5b50dafa85bceb8fb980ac3db6c80ab05ac50babda1665f3912a',
 'a3f1f0047a64012a461aa219de07fae0ed77d642c18557a041896bd47edbe8c7',
 '70e90971e22af4d4b3bed84c376d99e4bd1aa7e268755031624002aee74bd2af',
 'a084563d4bd32aabecc1f3a75399a542223bb14297f7ac2083fda78bc8cd8de5',
 '9532e740e2495dfe90c9b2dcef2584c69295e5835f4773dd4b2a6f81727bdba0',
 'b741913a7041a6aa5673c1f87d0f63ba65b1362a299e5be9ac49858ff755629c',
 'c069ca495d11147e28165556c9c7610be69c335f90163cbe4e1f26856a9600ce',
 '19d6f984615009e01c8ce797242bfdbfb2716984e689774d8c9b54d05f04840b',
 '1a879eee062008a30ec694b18417b336063bf907929d278092b24a91397c8a39',
 '2973708946e5b48c64fd2d9569cb443fd4b02d1c0d2a75a21e03f528c4404b26',
 '10e063ee01771f990443ef74c29066e8eebb64d1328d2ad9bdb5dc25f2c8df09',
 '1e1765d8e456e09d006b623d0da1ce144637d20ffb2575ce27339be7cac1299b'
]);
function partition(names){
 if(!names.includes(HELPER))return null;
 const extra=names.filter(n=>n.startsWith(PREFIX)),ids=new Map();
 for(const name of extra){
  if(name===HELPER)continue;
  const m=/^_cdq_visual_(p\d+|group_(?:avant|apres))_(neutral|green|red)$/.exec(name);
  if(!m)return null;
  if(!ids.has(m[1]))ids.set(m[1],new Set());ids.get(m[1]).add(m[2]);
 }
 if(!ids.size||[...ids.values()].some(s=>s.size!==3))return null;
 const points=[...ids.keys()].filter(n=>/^p\d+$/.test(n)).sort((a,b)=>Number(a.slice(1))-Number(b.slice(1)));
 if(points.length<2||points.length>120||points.some((p,i)=>p!=='p'+i))return null;
 return {base:names.filter(n=>!n.startsWith(PREFIX)).sort(),extra,points};
}
export function visualBaseNames20261026(pdf,L){
 const fields=pdf.getForm().getFields(),names=fields.map(f=>f.getName()).sort(),parts=partition(names);
 if(!parts)return names;
 try{
  const N=L.PDFName.of,m=pdf.catalog.lookupMaybe(N('CDQVisual20261026'),L.PDFDict);
  if(!m||m.lookupMaybe(N('Revision'),L.PDFNumber)?.asNumber()!==1||!SOURCES.has(m.lookupMaybe(N('SourceSHA256'),L.PDFString)?.decodeText()))return names;
  const specs=JSON.parse(m.lookup(N('Specs'),L.PDFString).decodeText());
  if(specs.length!==parts.points.length||specs.some((s,i)=>s.id!=='p'+i||!parts.base.includes(s.field)||!(/^(charge_point_\d+_(avant|apres)_correction(_2)?|excentricite_(avant|apres)_.+|B4_.+_(Avant|Apres)Correction)$/.test(s.field))))return names;
  for(const f of fields.filter(f=>parts.extra.includes(f.getName()))){
   if(!f.isReadOnly()||!(f.getName()===HELPER?f instanceof L.PDFTextField:f instanceof L.PDFCheckBox))return names;
  }
  return parts.base;
 }catch{return names;}
}
export function visualBaseMetadataNames20261026(fields){
 const entries=fields instanceof Map?[...fields.entries()]:Object.entries(fields||{}),names=entries.map(([n])=>n).sort(),parts=partition(names);
 if(!parts)return names;
 for(const [name,defs]of entries){
  if(!name.startsWith(PREFIX))continue;
  if(!Array.isArray(defs)||!defs.length||defs.some(d=>d.type!==(name===HELPER?'text':'checkbox')||!d.readonly))return names;
 }
 return parts.base;
}
