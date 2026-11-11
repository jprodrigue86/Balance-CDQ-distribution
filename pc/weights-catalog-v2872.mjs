// Transcribed from the user's Conversion.pdf, Rice Lake PN 36104 (6/18).
// Only the three NIST 105-1 Class F columns are used. Blank tolerances are omitted.
export const WEIGHT_REFERENCE_V2872=Object.freeze({
  id:'rice-lake-36104-201806-nist1051-f',name:'NIST 105-1 — classe F',
  libraryFileId:'libfile_65b2b92b97308191ac2170b25b895490',
  sha256:'0c2f152950fa8c9627d486470840f9b9c868ba336ce791add78ef1918edeb8a7'
});
const metric=[
  ['5000','kg','500','g'],['3000','kg','300','g'],['2000','kg','200','g'],['1000','kg','100','g'],
  ['500','kg','50','g'],['300','kg','30','g'],['200','kg','20','g'],['100','kg','10','g'],
  ['50','kg','5','g'],['30','kg','3','g'],['25','kg','2.5','g'],['20','kg','2','g'],
  ['10','kg','1','g'],['5','kg','500','mg'],['3','kg','300','mg'],['2','kg','200','mg'],['1','kg','100','mg'],
  ['500','g','70','mg'],['300','g','60','mg'],['200','g','40','mg'],['100','g','20','mg'],
  ['50','g','10','mg'],['30','g','6','mg'],['20','g','4','mg'],['10','g','2','mg'],
  ['5','g','1.5','mg'],['3','g','1.3','mg'],['2','g','1.1','mg'],['1','g','0.90','mg'],
  ['500','mg','0.72','mg'],['300','mg','0.61','mg'],['200','mg','0.54','mg'],['100','mg','0.43','mg'],
  ['50','mg','0.35','mg'],['30','mg','0.30','mg'],['20','mg','0.26','mg'],['10','mg','0.21','mg'],
  ['5','mg','0.17','mg'],['3','mg','0.14','mg'],['2','mg','0.12','mg'],['1','mg','0.10','mg']
];
const pounds=[
  ['10000','lb','450','g'],['5000','lb','230','g'],['3000','lb','140','g'],['2500','lb','110','g'],
  ['2000','lb','91','g'],['1000','lb','45','g'],['500','lb','23','g'],['100','lb','4.5','g'],
  ['50','lb','2.3','g'],['30','lb','1.4','g'],['25','lb','1.1','g'],['20','lb','910','mg'],
  ['10','lb','450','mg'],['5','lb','230','mg'],['3','lb','140','mg'],['2','lb','91','mg'],['1','lb','70','mg'],
  ['0.5','lb','45','mg'],['0.3','lb','27','mg'],['0.2','lb','18','mg'],['0.1','lb','9.1','mg'],
  ['0.05','lb','4.5','mg'],['0.03','lb','2.7','mg'],['0.02','lb','1.8','mg'],['0.01','lb','1.5','mg'],
  ['0.005','lb','1.2','mg'],['0.003','lb','0.99','mg'],['0.002','lb','0.87','mg'],['0.001','lb','0.70','mg']
];
const ounces=[
  ['8','oz','45','mg'],['4','oz','23','mg'],['2','oz','11','mg'],['1','oz','5.4','mg'],
  ['1/2','oz','2.8','mg'],['1/4','oz','1.7','mg'],['1/8','oz','1.3','mg'],['1/16','oz','1.1','mg'],
  ['1/32','oz','0.87','mg'],['1/64','oz','0.69','mg'],['0.5','oz','2.8','mg'],['0.3','oz','1.8','mg'],
  ['0.2','oz','1.6','mg'],['0.1','oz','1.3','mg'],['0.05','oz','1.0','mg'],['0.03','oz','0.85','mg'],
  ['0.02','oz','0.75','mg'],['0.01','oz','0.60','mg']
];
const fr=value=>String(value).replace('.',',');
export const WEIGHT_CATEGORIES_V2872=Object.freeze([
  Object.freeze({id:'metric',label:'kg / g / mg'}),Object.freeze({id:'lb',label:'Livres (lb)'}),Object.freeze({id:'oz',label:'Onces (oz)'})
]);
export const WEIGHT_CATALOG_V2872=Object.freeze([['metric',metric],['lb',pounds],['oz',ounces]].flatMap(([category,rows])=>rows.map(([nominal,unit,tolerance,toleranceUnit])=>Object.freeze({
  id:unit+':'+nominal,category,nominal,unit,tolerance,toleranceUnit,
  label:fr(nominal)+' '+unit,toleranceLabel:'± '+fr(tolerance)+' '+toleranceUnit
}))));
const byId=new Map(WEIGHT_CATALOG_V2872.map(row=>[row.id,row]));
function positive(value){
  const text=String(value??'').trim().replace(',','.');
  if(!/^\d{1,9}(?:\.\d{1,8})?$/.test(text)||!(Number(text)>0))throw Error('Saisissez une valeur positive.');
  return text.replace(/^0+(?=\d)/,'').replace(/(\.\d*?)0+$/,'$1').replace(/\.$/,'');
}
export function normalizeWeightChoiceV2872(choice){
  if(typeof choice==='string')choice={catalogId:choice};
  if(!choice||typeof choice!=='object'||Array.isArray(choice))throw Error('Choisissez la valeur de chaque poids.');
  if(Object.hasOwn(choice,'catalogId')){
    if(Object.keys(choice).length!==1||!byId.has(choice.catalogId))throw Error('Ce poids ne figure pas dans la table de tolérances.');
    return {catalogId:choice.catalogId};
  }
  if(choice.custom!==true||Object.keys(choice).sort().join(',')!=='custom,nominal,tolerance,toleranceUnit,unit'||!['kg','g','mg','lb','oz'].includes(choice.unit)||!['g','mg'].includes(choice.toleranceUnit))throw Error('Poids personnalisé invalide.');
  return {custom:true,nominal:positive(choice.nominal),unit:choice.unit,tolerance:positive(choice.tolerance),toleranceUnit:choice.toleranceUnit};
}
export function weightChoiceDetailsV2872(choice){
  const value=normalizeWeightChoiceV2872(choice);
  if(value.catalogId)return byId.get(value.catalogId);
  return {...value,category:['kg','g','mg'].includes(value.unit)?'metric':value.unit,label:fr(value.nominal)+' '+value.unit,toleranceLabel:'± '+fr(value.tolerance)+' '+value.toleranceUnit};
}
export function normalizeWeightSelectionV2872(selection,count){
  if(selection===undefined||selection===null)return null; // Existing count-only callers remain compatible.
  if(!Number.isInteger(Number(count))||Number(count)<1||Number(count)>14||!Array.isArray(selection)||selection.length!==Number(count))throw Error('Le nombre de poids choisis doit correspondre au certificat.');
  return selection.map(normalizeWeightChoiceV2872);
}
export function weightSelectionKeyV2872(selection,count){return JSON.stringify(normalizeWeightSelectionV2872(selection,count));}
export function weightSelectionPrefillV2872(selection,count){
  const rows=normalizeWeightSelectionV2872(selection,count);if(!rows)return {};
  // No measured mass, serial number or conformity is fabricated.
  const result=rows.every(row=>row.catalogId)?{classe:'F'}:{};
  rows.forEach((row,index)=>{const value=weightChoiceDetailsV2872(row),prefix='poids_'+String(index+1).padStart(2,'0')+'_';result[prefix+'01']=value.label;result[prefix+'06']=value.toleranceLabel;});
  return result;
}
export function isWeightCreationFieldV2872(name,value){
  if(typeof value!=='string'||value.length>80)return false;
  if(name==='classe')return value==='F';
  if(/^poids_(?:0[1-9]|1[0-4])_01$/.test(name))return /^(?:\d{1,9}(?:[.,]\d{1,8})?|1\/(?:2|4|8|16|32|64)) (?:kg|g|mg|lb|oz)$/.test(value);
  if(/^poids_(?:0[1-9]|1[0-4])_06$/.test(name))return /^± \d{1,9}(?:[.,]\d{1,8})? (?:mg|g)$/.test(value);
  return false;
}
// Creation permission is separate from the canvas-cache eligibility contract.
// Weights drafts carry more than identity; they must never reuse an identity-only canvas.
export function isWeightCreationDraftV2872({modeleId,readerPreparedVersion,initialValues,readOnly,bytes}){
  if(modeleId!=='poids'||readerPreparedVersion!==2730||readOnly||!Number.isInteger(bytes)||bytes<=0||bytes>4*1024*1024||!initialValues||typeof initialValues!=='object'||Array.isArray(initialValues))return false;
  const entries=Object.entries(initialValues);
  return entries.length>0&&entries.every(([name,value])=>typeof value==='string'&&value.length<=1000&&(
    /^client_(nom|telephone|technicien|adresse|ville|province|code_postal)$/.test(name)||
    name==='date_etalonnage'&&/^\d{4}-\d{2}-\d{2}$/.test(value)||isWeightCreationFieldV2872(name,value)));
}
