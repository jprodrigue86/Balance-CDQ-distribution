// One source policy for the fresh list snapshots and the already-authorized UI tree.
// Sheets may be nested; PDF discovery retains its historical scope. A candidate
// is not a recognized report: its authenticated content signature decides rows.
export const reportSourceScopeV2895='v2895-recursive-sheets';
export const normalizeReportSourceV2895=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[’']/g,' ').replace(/\s+/g,' ').trim().toLowerCase();
export const excludedReportSourceV2895=value=>/^(?:liste (?:de|des) balances?|archives?|rs(?: pdf)?|irs(?: pdf)?)(?:\b|[._ -])/.test(normalizeReportSourceV2895(value))||/^_cdq(?:[_ -]|$)/.test(normalizeReportSourceV2895(value));
const reportFolder=name=>/^rapports? (?:d ?)?etalonnages?$/.test(normalizeReportSourceV2895(name));
const sheet=file=>['GOOGLE_SHEETS','application/vnd.google-apps.spreadsheet'].includes(file?.mimeType||file?.type);
const pdf=file=>['PDF','application/pdf'].includes(file?.mimeType||file?.type);
export const reportSourceCandidateV2895=(file,includePdf=false)=>!!file&&!excludedReportSourceV2895(file.nom||file.name)&&(sheet(file)||includePdf&&pdf(file));
const id=value=>String(value?.id||'');
const incomplete=node=>node?.charge===false||node?.complete===false||node?.incomplete===true||node?.tronque===true||node?.truncated===true||node?.partial===true||!!node?.nextPageToken;
const fail=message=>{throw Object.assign(Error(message),{code:'LIST_SOURCE_TREE_INCOMPLETE'});};

// This view never loads a folder and never claims that a lazy tree is exhaustive.
export function loadedReportSourcesV2895(tree,{includeConfirmedPdf=()=>false,includePending=false}={}){
 const files=new Map(),folders=new Map(),seen=new Set();
 function visit(node,depth=0,includePdf=true){
  if(!node||typeof node!=='object'||seen.has(node))return;seen.add(node);
  for(const file of node.fichiers||[])if(id(file)&&(includePending===true||!file._cdqPendingSaveV2660)&&reportSourceCandidateV2895(file,includePdf||includeConfirmedPdf(file)))files.set(id(file),file);
  for(const child of node.dossiers||[]){if(!id(child)||excludedReportSourceV2895(child.nom||child.name))continue;folders.set(id(child),child);visit(child,depth+1,depth===0&&reportFolder(child.nom||child.name));}
 }
 visit(tree);return {files:[...files.values()].sort((a,b)=>id(a).localeCompare(id(b))),folders:[...folders.values()].sort((a,b)=>id(a).localeCompare(id(b)))};
}

// Every source snapshot re-reads each eligible folder with the original client
// scope. No cached child, partial page, or limit can authorize a list import.
export async function readReportSourceTreeV2895(root,{readFolder,stillCurrent=()=>true}={}){
 const files=new Map(),folders=[],visited=new Set();
 const guard=()=>{if(!stillCurrent())throw Object.assign(Error('Le client, le compte ou une sauvegarde a changé.'),{code:'LIST_CONTEXT_CHANGED'});};
 function take(file,includePdf){
  if(!reportSourceCandidateV2895(file,includePdf))return;
  if(!id(file)||file._cdqPendingSaveV2660||id(file).startsWith('cdq-local-'))fail('Rapport non confirmé dans le dossier.');
  if(files.has(id(file)))fail('Un rapport apparaît plusieurs fois dans le parcours.');
  files.set(id(file),{...file});if(files.size>500)fail('Plus de 500 rapports candidats : le parcours est incomplet.');
 }
 async function visit(node,depth=0,includePdf=true){
  guard();if(depth>24||!id(node)||visited.has(id(node))||visited.size>=500)fail('Le parcours des dossiers est incomplet ou cyclique.');
  if(incomplete(node)||!Array.isArray(node.fichiers)||!Array.isArray(node.dossiers))fail('Dossier client incomplet ou non confirmé.');
  visited.add(id(node));if(depth)folders.push(id(node));
  for(const file of node.fichiers)take(file,includePdf);
  const children=node.dossiers.filter(child=>!excludedReportSourceV2895(child?.nom||child?.name)).slice().sort((a,b)=>id(a).localeCompare(id(b)));
  if(children.some(child=>!id(child))||new Set(children.map(id)).size!==children.length)fail('Dossier de rapports incomplet.');
  for(const child of children){
   guard();if(depth>=24||visited.has(id(child))||visited.size>=500)fail('Le parcours des dossiers est incomplet ou cyclique.');
   const loaded=await readFolder(id(child));guard();if(id(loaded)!==id(child)||Array.isArray(loaded.parents)&&!loaded.parents.map(String).includes(id(node)))fail('Le dossier retourné ne correspond pas au dossier demandé.');
   await visit(loaded,depth+1,depth===0&&reportFolder(child.nom||child.name));
  }
 }
 await visit(root);guard();return {files:[...files.values()].sort((a,b)=>id(a).localeCompare(id(b))),folders:folders.sort()};
}
