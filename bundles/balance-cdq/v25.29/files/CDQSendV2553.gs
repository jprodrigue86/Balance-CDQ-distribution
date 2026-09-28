// V25.53 — copies PDF client aplaties et destinataire par client.
// Le PDF maître reste dans son dossier et n'est jamais remplacé par cette copie temporaire.

function cdqEmailV2553_(value) {
  const email=String(value||'').trim().toLowerCase();
  if(!email || email.length>254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Adresse courriel invalide.');
  return email;
}

function cdqRecipientKeyV2553_(clientId) {
  clientId=String(clientId||'').trim();
  if(!/^[A-Za-z0-9_-]{10,200}$/.test(clientId)) throw new Error('Client invalide.');
  return 'cdqRecipientV2553:'+clientId;
}

function obtenirDestinataireClientV2553(clientId) {
  verifierDroit_('lecture');
  const key=cdqRecipientKeyV2553_(clientId);
  const saved=String(PropertiesService.getUserProperties().getProperty(key)||'').trim();
  if(saved)return saved;
  return typeof obtenirDestinataireParDefaut==='function' ? String(obtenirDestinataireParDefaut()||'') : '';
}

function enregistrerDestinataireClientV2553(clientId,email) {
  verifierDroit_('ecriture');
  const key=cdqRecipientKeyV2553_(clientId),valid=cdqEmailV2553_(email);
  PropertiesService.getUserProperties().setProperty(key,valid);
  return {ok:true,email:valid,clientId:String(clientId)};
}

function cdqTempIdsV2553_(ids) {
  const out=[];
  (Array.isArray(ids)?ids:[]).forEach(function(id){
    id=String(id||'').trim();
    if(/^[A-Za-z0-9_-]{10,200}$/.test(id)&&out.indexOf(id)<0)out.push(id);
  });
  return out.slice(0,80);
}

function creerCopieAplatieTemporaireV2553(id,base64,clientId,session) {
  verifierDroit_('ecriture');
  id=String(id||'').trim();clientId=String(clientId||'').trim();session=String(session||'').trim();
  if(!/^[A-Za-z0-9_-]{10,200}$/.test(id)||!/^[A-Za-z0-9_-]{10,200}$/.test(clientId))throw new Error('Cible PDF invalide.');
  if(!/^[A-Za-z0-9._-]{3,100}$/.test(session))throw new Error('Session d’envoi invalide.');
  if(typeof base64!=='string'||!base64||base64.length>Math.ceil(CDQ_DOCUMENT_MAX_BYTES_/3)*4||!/^[A-Za-z0-9+/]*={0,2}$/.test(base64))throw new Error('Copie PDF invalide.');

  verifierCibleDansMasterCDQ_('fichier',id);
  const cible=obtenirPdfClientCDQ_(id);
  if(String(cible.client.getId())!==clientId)throw new Error('Ce PDF n’appartient pas au client sélectionné.');
  const bytes=Utilities.base64Decode(base64);
  if(bytes.length<8||bytes.length>CDQ_DOCUMENT_MAX_BYTES_||bytes.slice(0,5).map(function(b){return String.fromCharCode(b)}).join('')!=='%PDF-')throw new Error('Copie PDF invalide.');

  const original=cible.fichier,parents=original.getParents();
  if(!parents.hasNext())throw new Error('Dossier du PDF introuvable.');
  const parent=parents.next();
  const temp=parent.createFile(Utilities.newBlob(bytes,'application/pdf',original.getName()));
  try{temp.setDescription('CDQ_TEMP_V2553|'+session+'|'+id+'|'+Date.now());}catch(_){}
  return {ok:true,id:temp.getId(),originalId:id,nom:original.getName(),taille:bytes.length};
}

function nettoyerCopiesAplatiesV2553(ids) {
  verifierDroit_('ecriture');
  let count=0;
  cdqTempIdsV2553_(ids).forEach(function(id){
    try{
      const f=DriveApp.getFileById(id),desc=String(f.getDescription()||'');
      if(desc.indexOf('CDQ_TEMP_V2553|')!==0)return;
      f.setTrashed(true);count++;
    }catch(_){}
  });
  return {ok:true,nettoyes:count};
}

function cdqRecentKeyV2553_(files,folders,mode,email,company) {
  const canonical=JSON.stringify({
    f:(Array.isArray(files)?files:[]).map(String).sort(),
    d:(Array.isArray(folders)?folders:[]).map(String).sort(),
    m:String(mode||''),
    e:String(email||'').trim().toLowerCase(),
    c:String(company||'')
  });
  const digest=Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,canonical,Utilities.Charset.UTF_8);
  return 'cdqSendRecentV2553:'+Utilities.base64EncodeWebSafe(digest).replace(/=+$/,'');
}

function verifierEnvoiSelectionRecentV2553(files,folders,mode,email,company,hours) {
  verifierDroit_('lecture');
  if(typeof verifierEnvoiSelectionRecent==='function'){
    try{
      const legacy=verifierEnvoiSelectionRecent(files,folders,mode,email,company,hours);
      if(legacy&&legacy.doublon)return legacy;
    }catch(_){}
  }
  const key=cdqRecentKeyV2553_(files,folders,mode,email,company);
  const timestamp=Number(PropertiesService.getUserProperties().getProperty(key)||0);
  const age=Math.max(1,Number(hours)||24)*3600000;
  return timestamp&&Date.now()-timestamp<age ? {doublon:true,timestamp:timestamp} : {doublon:false,timestamp:0};
}

function envoyerSelectionSuiviV2553(originalFiles,sendFiles,folders,mode,email,message,clientName,company,session,force,tempIds) {
  verifierDroit_('ecriture');
  originalFiles=(Array.isArray(originalFiles)?originalFiles:[]).map(String);
  sendFiles=(Array.isArray(sendFiles)?sendFiles:[]).map(String);
  folders=(Array.isArray(folders)?folders:[]).map(String);
  tempIds=cdqTempIdsV2553_(tempIds);
  if(originalFiles.length!==sendFiles.length)throw new Error('Sélection PDF incohérente.');
  const tempToOriginal={};
  for(let i=0;i<sendFiles.length;i++)if(sendFiles[i]!==originalFiles[i])tempToOriginal[sendFiles[i]]=originalFiles[i];

  try{
    const result=envoyerSelectionSuivi(sendFiles,folders,mode,email,message,clientName,company,session,!!force);
    if(result&&Array.isArray(result.echecs)){
      result.echecs=result.echecs.map(function(item){
        if(!item||!item.id||!tempToOriginal[String(item.id)])return item;
        const copy={};Object.keys(item).forEach(function(k){copy[k]=item[k]});copy.id=tempToOriginal[String(item.id)];return copy;
      });
    }
    if(result&&Number(result.envoyes||0)>0){
      const key=cdqRecentKeyV2553_(originalFiles,folders,mode,email,company);
      PropertiesService.getUserProperties().setProperty(key,String(Date.now()));
    }
    return result;
  } finally {
    nettoyerCopiesAplatiesV2553(tempIds);
  }
}
