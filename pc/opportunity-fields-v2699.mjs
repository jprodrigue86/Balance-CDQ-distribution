// The existing authenticated storage contract stays compatible with deployed servers.
export const saleTypesV2699=['Entente de service','Vente de balance','Vente de pièce balance','Vente de projet balance','Vente de service'];
export const pipelinesV2699=['Entente de service et Location','Vente de produits (pièces et balances)','Appel de service et shutdown','Service sanitaire'];
export const stagesV2699=['Analyse des besoins','Sur le hold','Soumission à envoyer','Soumission envoyé','Soumission accepté','En attente de pièces','Gagnés fermés','Perdus fermés'];
const legacy=['À qualifier','Contact établi','Proposition','Proposition','Négociation','Négociation','Gagnée','Perdue'];
const previous={'À qualifier':stagesV2699[0],'Contact établi':stagesV2699[0],'Proposition':stagesV2699[3],'Négociation':stagesV2699[1],'Gagnée':stagesV2699[6],'Perdue':stagesV2699[7]};
const marker='\n\n[CDQ-OPPORTUNITE-V26.99]\n';
function validDate(v){if(!v)return true;if(!/^20\d{2}-\d{2}-\d{2}$/.test(v))return false;const d=new Date(v+'T12:00:00Z');return !Number.isNaN(d.getTime())&&d.toISOString().slice(0,10)===v;}
export function decodeOpportunityV2699(item){
 const result={...item};const raw=String(item.notes||''),at=raw.lastIndexOf(marker);
 if(at>=0)try{const extra=JSON.parse(raw.slice(at+marker.length));if(extra.schema===1&&stagesV2699.includes(extra.etape)&&(!extra.pipeline||pipelinesV2699.includes(extra.pipeline))&&(!extra.typeVente||saleTypesV2699.includes(extra.typeVente))&&validDate(extra.dateReception)&&validDate(extra.dateCloture)){Object.assign(result,{typeVente:extra.typeVente||'',pipeline:extra.pipeline||'',etape:extra.etape,dateReception:extra.dateReception||'',dateCloture:extra.dateCloture||'',notes:raw.slice(0,at)});}}catch{}
 if(!stagesV2699.includes(result.etape))result.etape=previous[result.etape]||stagesV2699[0];
 return result;
}
export function encodeOpportunityV2699(item,{existing=false}={}){
 const p={...item};
 if(!String(p.titre||'').trim()||(!existing&&!String(p.clientNom||'').trim()))throw Error('Le nom de l’opportunité et le nom du compte sont requis.');
 const stage=stagesV2699.indexOf(p.etape);if(stage<0)throw Error('Choisissez une étape.');
 if((!existing||p.typeVente)&&!saleTypesV2699.includes(p.typeVente)||(!existing||p.pipeline)&&!pipelinesV2699.includes(p.pipeline))throw Error('Choisissez le type de vente et le pipeline.');
 if(!existing&&!p.dateReception||!validDate(p.dateReception||'')||!validDate(p.dateCloture||''))throw Error('La date de réception ou de clôture est invalide.');
 const extra={schema:1,typeVente:p.typeVente||'',pipeline:p.pipeline||'',etape:p.etape,dateReception:p.dateReception||'',dateCloture:p.dateCloture||''};
 const notes=String(p.notes||'')+marker+JSON.stringify(extra);if(notes.length>2000)throw Error('Les notes sont trop longues. Réduisez-les pour enregistrer les choix de l’opportunité.');
 return {...p,etape:legacy[stage],notes};
}
export function driveFileKindV2699(item){
 const mime=String(item.mimeType||''),name=String(item.nom||'');
 if(item.kind==='folder'||mime==='application/vnd.google-apps.folder')return {key:'folder',label:'Dossier'};
 if(mime==='application/pdf'||/\.pdf$/i.test(name))return {key:'pdf',label:'PDF'};
 if(/spreadsheet|excel/.test(mime)||/\.xlsx?$/i.test(name))return {key:'sheet',label:mime.includes('google-apps')?'Sheets':'Excel'};
 if(/google-apps.document|word|opendocument.text/.test(mime)||/\.(docx?|odt)$/i.test(name))return {key:'doc',label:mime.includes('google-apps')?'Docs':'Word'};
 if(/presentation|powerpoint/.test(mime)||/\.pptx?$/i.test(name))return {key:'slides',label:'Présentation'};
 if(mime.startsWith('image/')||/\.(png|jpe?g|webp|heic)$/i.test(name))return {key:'gallery',label:'Photo'};
 return {key:'file',label:'Fichier'};
}
