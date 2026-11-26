// Read the absolute presentation coordinates authored in the approved PDF.
// No PDF JavaScript is executed here and no business value is calculated.
const START='/* CDQ_TABLE_REFLOW_R6_START */';
const END='/* CDQ_TABLE_REFLOW_R6_END */';

export function authoredTableGeometryV2935(sources){
 for(const source of sources||[]){
  if(typeof source!=='string'||!source.includes(START)||!source.includes(END))continue;
  const begin=source.indexOf(START),end=source.indexOf(END,begin),section=source.slice(begin,end);
  const text=section.match(/var r6Layout=(\[[\s\S]*?\]);/)?.[1];
  const groupText=source.match(/var c=(\{.*?\}),type=/)?.[1];
  try{
   const rows=JSON.parse(text),config=JSON.parse(groupText),seen=new Set();
   if(!Array.isArray(rows)||rows.length<1||rows.length>500)continue;
   if(!rows.every(row=>Array.isArray(row)&&row.length===3&&typeof row[0]==='string'&&
     row[0].length<200&&!seen.has(row[0])&&seen.add(row[0])&&Array.isArray(row[1])&&
     row[1].length===4&&row[1].every(n=>Number.isFinite(n)&&Math.abs(n)<5000)&&
     row[1][2]>=row[1][0]&&row[1][1]>=row[1][3]&&Number.isFinite(row[2])&&Math.abs(row[2])<100))continue;
   if(!['indicateur','base_balance','imprimante'].every(name=>{
    const group=config.groups?.[name];return group&&Array.isArray(group.suffixes)&&
     group.suffixes.every(n=>typeof n==='string'&&/^[a-z_]+$/.test(n))&&
     ['Sans','Avec'].every(mode=>Number.isFinite(group[mode])&&Math.abs(group[mode])<5000);
   }))continue;
   return {rows,groups:config.groups};
  }catch{ /* An unrelated or malformed action never authorizes geometry. */ }
 }
 return null;
}

export function fieldActionSourcesV2935(fields,name='colonne'){
 const raw=fields?.get?.(name)||fields?.[name],defs=raw?(Array.isArray(raw)?raw:[raw]):[];
 return defs.flatMap(def=>def.actions instanceof Map?[...def.actions.values()].flat():Object.values(def.actions||{}).flat());
}

export function authoredTableRectV2935(row,mode){
 const [name,base,shift]=row,dy=mode==='Sans'?shift:0;
 // Acrobat rect order is left, top, right, bottom; PDF.js uses a normal rect.
 return {name,rect:[base[0],base[3]+dy,base[2],base[1]+dy]};
}

export function applyAuthoredTableGeometryV2935(pdf,L){
 const form=pdf.getForm(),choice=form.getFieldMaybe('colonne');if(!choice)return false;
 const N=L.PDFName.of,aa=choice.acroField.dict.lookupMaybe(N('AA'),L.PDFDict),sources=[];
 for(const key of ['K','V']){
  const action=aa?.lookupMaybe(N(key),L.PDFDict),js=action?.lookup(N('JS'));
  if(typeof js?.decodeText==='function')sources.push(js.decodeText());
 }
 const geometry=authoredTableGeometryV2935(sources);if(!geometry)return false;
 const type=form.getFieldMaybe('type_balance')?.getSelected?.()?.[0];
 const mode=type==='Balance compteuse'?'Sans':choice.getSelected()[0]==='Avec'?'Avec':'Sans';
 let changed=false;
 const move=(field,rect)=>{
  for(const widget of field?.acroField.getWidgets()||[]){
   const old=widget.getRectangle(),next={x:rect[0],y:rect[1],width:rect[2]-rect[0],height:rect[3]-rect[1]};
   if(Object.keys(next).some(key=>Math.abs(old[key]-next[key])>0.00001)){
    widget.setRectangle(next);changed=true;
   }
  }
 };
 for(const row of geometry.rows){const {name,rect}=authoredTableRectV2935(row,mode);move(form.getFieldMaybe(name),rect);}
 for(const [prefix,group]of Object.entries(geometry.groups))for(const suffix of group.suffixes){
  const field=form.getFieldMaybe(prefix+'_'+suffix);
  for(const widget of field?.acroField.getWidgets()||[]){
   const old=widget.getRectangle(),y=group[mode];
   if(Math.abs(old.y-y)>0.00001){widget.setRectangle({...old,y});changed=true;}
  }
 }
 return changed;
}
