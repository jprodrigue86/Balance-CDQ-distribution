// These records are archives, not upload tasks. Retain the exact PDF bytes.
export const localReportVisibleV2714=c=>!!c&&!c.removed&&c.kind!=='prepared'&&c.kind!=='sheet'&&!!c.readerRequestId&&!c.driveId;
export const invalidRemotePdfV2714=error=>/^(?:Error:\s*)?PDF introuvable ou invalide\.$/.test(String(error?.message||error||'').trim());
export function retiredLocalReportV2714(c,reason='user',now=Date.now()){
 return {...c,removed:true,status:'retired',retiredAt:now,retirementReason:reason,error:''};
}
export function pruneLocalReportRowsV2714(root,active){
 const removed=[];
 function walk(node){if(!node)return;node.fichiers=(node.fichiers||[]).filter(f=>{
  if(!String(f.id||'').startsWith('cdq-local-')||active.has(String(f.id).slice(10)))return true;
  removed.push(String(f.id));return false;
 });for(const folder of node.dossiers||[])walk(folder);}
 walk(root);return removed;
}
