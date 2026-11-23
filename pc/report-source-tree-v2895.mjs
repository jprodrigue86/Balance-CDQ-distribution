// One source policy for the fresh list snapshots and the already-authorized UI tree.
// Sheets may be nested; PDF discovery retains its historical scope. A candidate
// is not a recognized report: its authenticated content signature decides rows.
export const reportSourceScopeV2895='v2895-recursive-sheets';
export const normalizeReportSourceV2895=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[’']/g,' ').replace(/\s+/g,' ').trim().toLowerCase();
export const excludedReportSourceV2895=value=>/^(?:liste (?:de|des) balances?|archives?|rs(?: pdf)?|irs(?: pdf)?)(?:\b|[._ -])/.test(normalizeReportSourceV2895(value))||/^_cdq(?:[_ -]|$)/.test(normalizeReportSourceV2895(value));
const reportFolder=name=>/^rapports? (?:d ?)?etalonnages?$/.test(normalizeReportSourceV2895(name));
const sheet=file=>['GOOGLE_SHEETS','application/vnd.google-apps.spreadsheet'].includes(file?.mimeType||file?.type);
const pdf=file=>['PDF','application/pdf'].includes(file?.mimeType||file?.type);
export function weightCertificateSource(file) {
  if (!file) return false;
  const family = file.family || file.modeleId || file.template?.family || file.appProperties?.cdqTemplateModel;
  if (family) return family === 'poids';
  const name = String(file.nom || file.name || '').normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '').trim().replace(/\s+/g, ' ').toLowerCase();
  return /^(?:certificats?|certficats?) (?:de )?poids? etalons?(?:[ ._-].*)?\.pdf$/.test(name);
}
export const reportSourceCandidateV2895=(file,includePdf=false)=>!!file&&!weightCertificateSource(file)&&!excludedReportSourceV2895(file.nom||file.name)&&(sheet(file)||includePdf&&pdf(file));
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
 const queued=new Set([id(root)]), pending=[];
 function collect(node,depth,includePdf){
  guard();if(depth>24||!id(node)||visited.has(id(node))||visited.size>=500)fail('Le parcours des dossiers est incomplet ou cyclique.');
  if(incomplete(node)||!Array.isArray(node.fichiers)||!Array.isArray(node.dossiers))fail('Dossier client incomplet ou non confirmé.');
  visited.add(id(node));if(depth)folders.push(id(node));
  for(const file of node.fichiers)take(file,includePdf);
  for(const child of node.dossiers){
   if(excludedReportSourceV2895(child?.nom||child?.name))continue;
   const childId=id(child);
   if(!childId||depth>=24||queued.has(childId)||queued.size>=500)fail('Le parcours des dossiers est incomplet ou cyclique.');
   queued.add(childId);
   pending.push({childId,parent:id(node),depth:depth+1,includePdf:depth===0&&reportFolder(child.nom||child.name)});
  }
 }
 collect(root,0,true);
 // At most two outstanding folder reads. Drain both before releasing the scan lease.
 for(let i=0;i<pending.length;){
  guard();
  const pair=pending.slice(i,i+2);i+=pair.length;
  const replies=await Promise.allSettled(pair.map(async item=>readFolder(item.childId)));
  guard();
  for(const [j,response] of replies.entries()){
   if(response.status==='rejected')throw response.reason;
   const item=pair[j],node=response.value;
   if(id(node)!==item.childId||Array.isArray(node.parents)&&!node.parents.map(String).includes(item.parent))fail('Le dossier retourné ne correspond pas au dossier demandé.');
   collect(node,item.depth,item.includePdf);
  }
 }
 guard();return {files:[...files.values()].sort((a,b)=>id(a).localeCompare(id(b))),folders:folders.sort()};
}
