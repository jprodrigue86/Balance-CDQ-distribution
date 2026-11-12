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

// Global across clients, isolated by the authenticated CDQ technician.
function cdqGlobalRecipientKeyV2756_(actor){
  return 'cdqRecipientGlobalV2756:'+empreinteCDQ_(normaliserEmailCDQ_(actor.email));
}
function obtenirDestinataireClientV2553(clientId) {
  const actor=verifierDroit_('lecture');
  const saved=String(PropertiesService.getScriptProperties().getProperty(cdqGlobalRecipientKeyV2756_(actor))||'').trim();
  return saved || String(obtenirDestinataireParDefaut()||'');
}
function enregistrerDestinataireClientV2553(clientId,email) {
  const actor=verifierDroit_('ecriture'),valid=cdqEmailV2553_(email);
  PropertiesService.getScriptProperties().setProperty(cdqGlobalRecipientKeyV2756_(actor),valid);
  return {ok:true,email:valid,clientId:String(clientId||''),scope:'all-clients'};
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


// V28.32: confirm durable prior sends before costly PDF preparation.
// Never match on a filename alone. No publication or mail occurs here.

// V28.33: guard legacy ZIP receipts BEFORE expensive exports. No old PDF is read.
// Only exact current Google Sheet source IDs, revisions and recipient form a key.
function cdqSendPreviousSheetsV2833_(files,email,clientId){
  if(!Array.isArray(files)||!files.length||files.length>250)return {doublon:false};
  var identities=[];
  for(var i=0;i<files.length;i++){
    var id=String(files[i]);
    cdqSendQueueScopeV2826_(id,clientId);
    var source=DriveApp.getFileById(id);
    if(source.getMimeType()!==MimeType.GOOGLE_SHEETS)return {doublon:false};
    var updated=source.getLastUpdated().getTime();
    var pdfName=source.getName().replace(/\.xlsx?$/i,'')+'.pdf';
    identities.push(id+':modified:'+updated+':'+pdfName);
  }
  var canonical=JSON.stringify([String(clientId),String(email||'').trim().toLowerCase(),identities.sort()]);
  var key='CDQ_SEND_ZIP_V2823_'+cdqUploadHashV2751_(Utilities.newBlob(canonical).getBytes());
  var stored=PropertiesService.getScriptProperties().getProperty(key),previous=null;
  try{previous=JSON.parse(stored||'null');}catch(_){}
  if(!previous)return {doublon:false};
  var age=Date.now()-Number(previous.at||0);
  if(previous.phase==='sending'&&!(typeof cdqSendReviewAllowsSendKeyV20261112_==='function'&&cdqSendReviewAllowsSendKeyV20261112_(key)))return {incertain:true};
  if(previous.phase==='sent'&&age>=0&&age<86400000)
    return {doublon:true,timestamp:Number(previous.at)||0};
  return {doublon:false};
}

function cdqSendRecentQueueV2832_(files,email,clientId,actor,hours){
  if(!Array.isArray(files)||!files.length||files.length>1000)return {doublon:false,timestamp:0};
  var owner=String(actor&&actor.email||'').trim().toLowerCase(),recipient=String(email||'').trim().toLowerCase(),
    client=String(clientId||'').trim();
  if(!owner||!recipient||!client)return {doublon:false,timestamp:0};
  var now=Date.now(),age=Math.max(1,Number(hours)||24)*3600000,
    wanted=JSON.stringify(files.map(String).sort()),
    all=PropertiesService.getScriptProperties().getProperties(),jobs=[];
  Object.keys(all).forEach(function(key){
    if(key.indexOf(CDQ_SEND_QUEUE_V2826_)!==0)return;
    try{
      var job=JSON.parse(all[key]),at=Number(job&&job.at)||0;
      if(job&&String(job.actor||'').trim().toLowerCase()===owner&&job.clientId===client&&job.requestId&&at>0&&now-at>=0&&now-at<age)jobs.push(job);
    }catch(_){}
  });
  jobs.sort(function(a,b){return Number(b.at)-Number(a.at);});
  for(var i=0;i<jobs.length&&i<64;i++){
    var job=jobs[i],request;
    try{
      var txt=DriveApp.getFileById(job.requestId).getBlob().getDataAsString();
      if(txt.length>250000)continue;
      request=JSON.parse(txt);
    }catch(_){continue;}
    if(!request||String(request.clientId||'')!==client||
       String(request.email||'').trim().toLowerCase()!==recipient||
       !Array.isArray(request.files)||JSON.stringify(request.files.map(String).sort())!==wanted)continue;
    var delivery=null,receipt=null;
    try{delivery=JSON.parse(all[CDQ_DELIVERY_PREFIX_V2825_+job.id]||'null');}catch(_){}
    try{receipt=delivery&&delivery.sendKey?JSON.parse(all[delivery.sendKey]||'null'):null;}catch(_){}
    if(typeof cdqSendReviewClosedV20261112_==='function'&&cdqSendReviewClosedV20261112_(job,delivery,receipt))continue;
    if(receipt&&receipt.phase==='sent'&&receipt.jobId===job.id)
      return {doublon:true,timestamp:Number(receipt.at)||Number(job.at),source:'durable-confirmed'};
    if(job.mailAttempted||(receipt&&receipt.phase==='sending'&&receipt.jobId===job.id)||
       (delivery&&(delivery.phase==='ready'||delivery.phase==='complete')))
      return {doublon:false,incertain:true,timestamp:Number(job.at)};
  }
  return {doublon:false,timestamp:0};
}

function verifierEnvoiSelectionRecentLegacyV20261103_(files,folders,mode,email,company,hours) {
  var actor=verifierDroit_('lecture');
  mode='convertir';
  if(!Array.isArray(folders)||!folders.length){
    cdqClientPortalScopeV20261028_(String(company||''));
    var recent=cdqSendRecentQueueV2832_(files,email,company,actor,hours);
    if(recent.incertain)throw Error('CDQ_ENVOI_A_VERIFIER : envoi identique incertain. Vérifiez les courriels envoyés; aucun renvoi automatique.');
    if(recent.doublon)return recent;
    var oldSheets=cdqSendPreviousSheetsV2833_(files,email,company);
    if(oldSheets.incertain)throw Error('CDQ_ENVOI_A_VERIFIER : ancien envoi ZIP incertain. Vérifiez les courriels avant toute nouvelle préparation.');
    if(oldSheets.doublon)return oldSheets;
  }
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

function envoyerSelectionSuiviV2553(originalFiles,sendFiles,folders,mode,email,message,clientName,company,session,force,tempIds,sendIntentV20261103) {
  if(sendIntentV20261103){
    if(sendIntentV20261103.protocol!==20261103||!Array.isArray(tempIds)||tempIds.length)throw Error('INVALID_SEND_PROTOCOL : préparation incompatible.');
    return cdqSpStart_(originalFiles,folders,email,message,clientName,company,session,!!force,sendIntentV20261103);
  }
  verifierDroit_('ecriture');
  mode='convertir';
  originalFiles=(Array.isArray(originalFiles)?originalFiles:[]).map(String);
  sendFiles=(Array.isArray(sendFiles)?sendFiles:[]).map(String);
  folders=(Array.isArray(folders)?folders:[]).map(String);
  tempIds=cdqTempIdsV2553_(tempIds);
  if(originalFiles.length!==sendFiles.length)throw new Error('Sélection PDF incohérente.');
  const tempToOriginal={};
  for(let i=0;i<sendFiles.length;i++)if(sendFiles[i]!==originalFiles[i])tempToOriginal[sendFiles[i]]=originalFiles[i];

  try{
    const recentV2823=verifierEnvoiSelectionRecentV2553(originalFiles,folders,mode,email,company,24);
    if(recentV2823.doublon&&!force)throw Error('CDQ_DOUBLE_ENVOI|'+String(recentV2823.timestamp||''));
    if(!folders.length&&originalFiles.length>0)return cdqSendQueueStartV2826_(originalFiles,email,message,clientName,company,session,!!force);
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

// Final delivery copies only. Source documents are never overwritten.
var CDQ_SEND_ZIP_MAX_BYTES_V2823_ = 24 * 1024 * 1024;
var CDQ_SEND_PORTAL_PDF_MAX_BYTES_V2823_ = 16 * 1024 * 1024;
var cdqSendSourcesV2823_ = [];
var cdqSendClientV2823_ = '';

// Explicit administrator repair/diagnostic. The authorized V28.23 migration below
// runs once on the first scoped send, never on module load or ordinary requests.
function activerPublicationPdfEnvoiV2823() {
  verifierDroit_('administration');
  PropertiesService.getScriptProperties().setProperties({CDQ_CLIENT_PORTAL_ENABLED_20261028:'true',CDQ_SEND_PORTAL_MIGRATION_V2823:'1'},false);
  return diagnostiquerPublicationPdfEnvoiV2823();
}

function diagnostiquerPublicationPdfEnvoiV2823() {
  verifierDroit_('administration');
  return {enabled:PropertiesService.getScriptProperties().getProperty('CDQ_CLIENT_PORTAL_ENABLED_20261028') === 'true',
    migrated:PropertiesService.getScriptProperties().getProperty('CDQ_SEND_PORTAL_MIGRATION_V2823') === '1',
    archiveHookAvailable:typeof cdqClientPortalArchiveV20261028_ === 'function',
    pdfLimitBytes:CDQ_SEND_PORTAL_PDF_MAX_BYTES_V2823_,zipLimitBytes:CDQ_SEND_ZIP_MAX_BYTES_V2823_};
}

function cdqSendMigratePortalV2823_(clientId) {
  verifierDroit_('envoi');
  var client = DriveApp.getFolderById(String(clientId || ''));
  if (!client || !cdqArchiveClientInOriginalMasterV2622_(client))
    throw Error('La publication doit concerner un client du dossier maître CDQ actuel.');
  if (typeof cdqClientPortalArchiveV20261028_ !== 'function')
    throw Error('Aucun courriel envoyé : le module de publication des PDF sur la page client est indisponible.');
  var props = PropertiesService.getScriptProperties(), lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    if (props.getProperty('CDQ_SEND_PORTAL_MIGRATION_V2823') !== '1')
      props.setProperties({CDQ_CLIENT_PORTAL_ENABLED_20261028:'true',CDQ_SEND_PORTAL_MIGRATION_V2823:'1'},false);
  } finally { lock.releaseLock(); }
  // A later explicit operator disable is respected rather than reversed.
  cdqSendRequirePortalV2823_();
}

function cdqSendRequirePortalV2823_() {
  if (PropertiesService.getScriptProperties().getProperty('CDQ_CLIENT_PORTAL_ENABLED_20261028') !== 'true' ||
      typeof cdqClientPortalArchiveV20261028_ !== 'function')
    throw Error('Aucun courriel envoyé : la publication des PDF sur la page client doit être activée par un administrateur avant cet envoi.');
}

function cdqSendCheckPortalResultV2823_(archive) {
  if (archive && !archive.portal && !archive.portalPending) {
    archive.portalPending = true;
    archive.portalError = 'La publication sur la page client a été désactivée ou interrompue après l’envoi. Les PDF sont conservés dans les archives; reprenez leur publication depuis Page client.';
  }
  return archive;
}

function cdqSendConvertSourceV2823_(file) {
  var before = file.getLastUpdated().getTime();
  var blob = convertirFichierEnPdf(file.getId());
  if (file.getLastUpdated().getTime() !== before)
    throw Error('Le document a changé pendant sa conversion. Reprenez la sélection avant l’envoi.');
  return cdqSendRegisterSourceV2823_(blob,file,before);
}

function cdqSendRegisterSourceV2823_(blob, file, sourceRevision) {
  var sourceId = String(file.getId()), description = String(file.getDescription() || '');
  var temporary = /^CDQ_TEMP_V2553\|[^|]+\|([A-Za-z0-9_-]{10,200})\|/.exec(description);
  if (temporary) sourceId = temporary[1];
  if (cdqSendClientForFilesV2823_([String(file.getId())]) !== cdqSendClientV2823_ ||
      (temporary && cdqSendClientForFilesV2823_([sourceId]) !== cdqSendClientV2823_))
    throw Error('Le document ne correspond pas au client sélectionné.');
  var hash = cdqUploadHashV2751_(blob.getBytes());
  cdqSendSourcesV2823_.push({blob:blob,sha256:hash,sourceId:sourceId,
    identityHash:file.getMimeType() === MimeType.GOOGLE_SHEETS ? 'modified:' + sourceRevision :
      (temporary ? cdqUploadHashV2751_(DriveApp.getFileById(sourceId).getBlob().getBytes()) : hash),
    // A native Google Sheets PDF export has no editable AcroForm fields.
    nativeSheets:file.getMimeType() === MimeType.GOOGLE_SHEETS});
  return blob;
}

function cdqSendPdfNameV2823_(name, used) {
  var clean = String(name || 'Rapport.pdf').replace(/\\/g, '/').split('/').filter(Boolean).join(' - ')
    .replace(/[:*?"<>|\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
  try { clean = clean.normalize('NFC'); } catch (_) {}
  var base = (clean.replace(/\.pdf$/i, '') || 'Rapport').slice(0, 150);
  var candidate = base + '.pdf', n = 2;
  while (used[candidate.toLowerCase()]) candidate = base + ' (' + (n++) + ').pdf';
  used[candidate.toLowerCase()] = true;
  return candidate;
}

function cdqSendFlattenPdfV2823_(blob, actor, clientId) {
  var bytes = blob.getBytes(), hash = cdqUploadHashV2751_(bytes);
  if (bytes.length < 8 || bytes.slice(0,5).map(function(b){return String.fromCharCode((b+256)%256);}).join('') !== '%PDF-')
    throw Error('PDF invalide : ' + blob.getName());
  var result = cdqReportEngineCallV2754_(actor, 'flattenSendV2823', {
    base64: Utilities.base64Encode(bytes), sha256: hash, fileName: blob.getName(), clientId:clientId
  }, {clientId:clientId});
  if (!result || result.flattened !== true || typeof result.base64 !== 'string')
    throw Error('Le moteur n’a pas confirmé le PDF non modifiable : ' + blob.getName());
  var finalBytes = Utilities.base64Decode(result.base64);
  if (finalBytes.length !== Number(result.size) || cdqUploadHashV2751_(finalBytes) !== result.sha256)
    throw Error('Copie PDF non modifiable incomplète : ' + blob.getName());
  return Utilities.newBlob(finalBytes, 'application/pdf', blob.getName());
}

function cdqPrepareSendZipV2823_(pieces, clientId, company, sessionId, failures) {
  if (failures && failures.length) throw Error('Aucun courriel envoyé : ' + failures.length + ' élément(s) n’ont pas pu être préparés. ' + failures.map(function(e){return e.nom + ' : ' + e.message;}).join('; '));
  var actor = verifierDroit_('envoi'), inputs = [], used = {}, pdfs = [], sourceIds = [], identities = [];
  (pieces || []).forEach(function(blob){
    var mime = String(blob.getContentType() || '').toLowerCase();
    if (mime === 'application/zip' || /\.zip$/i.test(blob.getName())) {
      Utilities.unzip(blob).forEach(function(entry){inputs.push(entry);});
    } else inputs.push(blob);
  });
  if (!inputs.length) throw Error('Aucun PDF à envoyer.');
  cdqSendMigratePortalV2823_(clientId);
  inputs.forEach(function(blob, i){
    if (!cdqArchiveIsPdfBlobV2622_(blob)) throw Error('Aucun courriel envoyé : le document « ' + blob.getName() + ' » ne peut pas être converti en PDF.');
    var inputBytes = blob.getBytes();
    if (inputBytes.length < 8 || inputBytes.slice(0,5).map(function(b){return String.fromCharCode((b+256)%256);}).join('') !== '%PDF-')
      throw Error('PDF invalide : ' + blob.getName());
    ecrireProgressionEnvoi_(sessionId, {phase:'conversion',total:inputs.length,termine:i,message:'PDF non modifiable ' + (i+1) + ' sur ' + inputs.length + '…'});
    var digest = cdqUploadHashV2751_(blob.getBytes()), source = null, matches = [];
    for (var j=0; j<cdqSendSourcesV2823_.length; j++) {
      if (cdqSendSourcesV2823_[j].sha256 === digest && cdqSendSourcesV2823_[j].blob.getName() === blob.getName()) matches.push(j);
    }
    // Exact bytes plus archive entry name identify the source; an ambiguous duplicate
    // remains archive-addressed rather than replacing the wrong stable portal item.
    if (matches.length === 1) source = cdqSendSourcesV2823_.splice(matches[0],1)[0];
    var copy = source && source.nativeSheets ? blob.copyBlob() : cdqSendFlattenPdfV2823_(blob, actor, String(clientId || ''));
    if (copy.getBytes().length > CDQ_SEND_PORTAL_PDF_MAX_BYTES_V2823_)
      throw Error('Aucun courriel envoyé : le PDF « ' + blob.getName() + ' » dépasse la limite de 16 Mio de la page client. Réduisez ce PDF avant de reprendre l’envoi.');
    copy.setName(cdqSendPdfNameV2823_(blob.getName(), used));
    pdfs.push(copy);
    sourceIds.push(source ? source.sourceId : '');
    identities.push((source ? source.sourceId + ':' + source.identityHash : digest) + ':' + blob.getName());
  });
  var date = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'America/Toronto', 'yyyy-MM-dd');
  var zipName = cdqSendPdfNameV2823_('Rapports - ' + (company || 'Client') + ' - ' + date, {}).replace(/\.pdf$/, '.zip');
  var zip = Utilities.zip(pdfs, zipName);
  if (zip.getBytes().length > CDQ_SEND_ZIP_MAX_BYTES_V2823_)
    throw Error('Aucun courriel envoyé : le ZIP dépasse la limite de 24 Mio. Réduisez la sélection puis réessayez. Aucun document n’a été supprimé.');
  return {pdfs:pdfs,attachments:[zip],pdfCount:pdfs.length,zipName:zipName,sourceIds:sourceIds,identities:identities};
}

function cdqSendEmailZipV2823_(delivery,email,subject,body,sender,clientId,force) {
  cdqSendRequirePortalV2823_();
  var canonical = JSON.stringify([String(clientId),String(email).trim().toLowerCase(),delivery.identities.slice().sort()]);
  var key = 'CDQ_SEND_ZIP_V2823_' + cdqUploadHashV2751_(Utilities.newBlob(canonical).getBytes());
  var props = PropertiesService.getScriptProperties(), lock = LockService.getScriptLock(), claim = String(Date.now()) + '-' + Math.random();
  lock.waitLock(10000);
  try {
    var previous = JSON.parse(props.getProperty(key) || 'null'), now = Date.now();
    if (previous && previous.phase === 'sending')
      throw Error('CDQ_ENVOI_A_VERIFIER : un envoi de ces mêmes PDF est en cours ou son résultat est incertain. Vérifiez le courriel envoyé avant toute reprise; aucun second courriel n’a été envoyé.');
    if (previous && previous.phase === 'sent' && now - previous.at < 86400000 && !force)
      throw Error('CDQ_DOUBLE_ENVOI|' + previous.at);
    // Bound only completed bookkeeping retention; never discard an ambiguous send.
    if (typeof props.getProperties === 'function' && typeof props.deleteProperty === 'function') {
      var all = props.getProperties(), removed = 0;
      Object.keys(all).forEach(function(k){
        if (removed >= 128 || k.indexOf('CDQ_SEND_ZIP_V2823_') !== 0) return;
        try { var old = JSON.parse(all[k]); if (old.phase === 'sent' && now-old.at>7*86400000) { props.deleteProperty(k); removed++; } } catch (_) {}
      });
    }
    props.setProperty(key, JSON.stringify({phase:'sending',at:now,claim:claim}));
  } finally { lock.releaseLock(); }
  // No lock spans Gmail, conversion, Drive or portal calls. A failure/timeout is
  // deliberately left ambiguous, so a blind network retry cannot send twice.
  var job;
  try {job=cdqDeliveryStageV2825_(delivery,clientId,email,subject,key);props.setProperty(key,JSON.stringify({phase:'sending',at:Date.now(),claim:claim,jobId:job.id}));}
  catch(stageError){props.setProperty(key,JSON.stringify({phase:'failedBeforeSend',at:Date.now(),claim:claim}));throw stageError;}
  var outcome;
  try { outcome = cdqEmailPortalSendV20261030_(email,subject,body,delivery.attachments,sender,clientId,'convertir'); }
  catch (error) { throw Error('CDQ_ENVOI_A_VERIFIER : résultat du courriel incertain; vérifiez les messages envoyés avant toute reprise. ' + String(error && error.message || error)); }
  try { props.setProperty(key, JSON.stringify({phase:'sent',at:Date.now(),claim:claim,jobId:job.id})); }
  catch (_) { console.warn('CDQ_SEND_ZIP_RECEIPT_PENDING'); }
  try {cdqDeliveryConfirmV2825_(job);}catch(_){console.warn('CDQ_DELIVERY_CONFIRM_PENDING');}
  return outcome;
}

function cdqSendClientForFilesV2823_(ids) {
  var clientId = '';
  (ids || []).forEach(function(id){
    var current = DriveApp.getFileById(String(id)), found = '';
    for (var depth=0; depth<20; depth++) {
      var parents = current.getParents();
      if (!parents.hasNext()) break;
      var parent = parents.next();
      if (String(parent.getId()) === String(CONFIG.MASTER_FOLDER_ID)) { found = String(current.getId()); break; }
      current = parent;
    }
    if (!found || (clientId && clientId !== found)) throw Error('La sélection doit appartenir à un seul client CDQ.');
    clientId = found;
  });
  if (!clientId) throw Error('Client manquant pour l’envoi.');
  return clientId;
}

// Durable outbox: final ZIP exists before mail. Continuations never send mail.
var CDQ_DELIVERY_PREFIX_V2825_='CDQ_DELIVERY_V2825:';
function cdqDeliveryReportKeyV2825_(name){
 var key=String(name||'').normalize('NFC').trim().replace(/\.pdf$/i,'').replace(/\s+/g,' ').trim().toLowerCase();
 return /^liste de balances?$/.test(key)?'liste de balance':key;
}
function cdqDeliveryScheduleV2825_(){
 // All new continuations use the same executor that prepares and mails the ZIP.
 cdqSendQueueScheduleV2826_();
}
// Publication-only work covers the legacy synchronous/folder send path. This
// record is persisted and scheduled BEFORE mail; the worker requires evidence.
function cdqDeliveryQueueV2830_(delivery){
 var job={version:2831,pipelineVersion:2831,id:delivery.id,clientId:delivery.clientId,
  actor:delivery.actor,sessionKeyV2751:delivery.sessionKeyV2751,at:delivery.at,
  count:delivery.count,cursor:0,phase:'publish',publicationOnly:true};
 cdqSendQueueSaveV2826_(job);cdqSendQueueScheduleV2826_();
}
function cdqDeliveryStageV2825_(delivery,clientId,email,subject,sendKey,confirmedAt){
 var access=cdqClientPortalScopeV20261028_(clientId),props=PropertiesService.getScriptProperties();
 var zip=delivery.attachments[0],zipHash=cdqUploadHashV2751_(zip.getBytes()),jobId=Utilities.getUuid();
 var client=DriveApp.getFolderById(clientId);
 if(!cdqArchiveClientInOriginalMasterV2622_(client))throw Error('SCOPE_MISMATCH : client déplacé.');
 var reports=cdqArchiveEnsureFolderV2622_(client,CDQ_SENT_ARCHIVE_REPORT_ALIASES_V2622,CDQ_SENT_ARCHIVE_REPORT_CANONICAL_V2622);
 var archives=cdqArchiveEnsureFolderV2622_(reports,CDQ_SENT_ARCHIVE_ARCHIVE_ALIASES_V2622,CDQ_SENT_ARCHIVE_ARCHIVE_CANONICAL_V2622);
 var date=Utilities.formatDate(new Date(confirmedAt||Date.now()),Session.getScriptTimeZone()||'America/Toronto','yyyy-MM-dd');
 var dated=cdqArchiveEnsureFolderV2622_(archives,[date],date),folder=dated.createFolder('Envoi '+jobId);
 var used={},entries=delivery.pdfs.map(function(blob,i){
  var name=blob.getName(),key=cdqDeliveryReportKeyV2825_(name),bytes=blob.getBytes();
  if(!cdqArchiveIsPdfBlobV2622_(blob)||!key||used[key]||bytes.length<8||bytes.length>16*1024*1024)throw Error('INVALID_DELIVERY_PDF : PDF manquant, répété ou trop volumineux.');
  used[key]=true;return {name:name,sha256:cdqUploadHashV2751_(bytes),size:bytes.length,sourceId:String((delivery.sourceIds||[])[i]||'')};
 });
 var technicalJob={id:jobId,clientId:String(clientId),folderId:folder.getId()};cdqLegacyTechnicalCreateV2866_(technicalJob);var technical=cdqLegacyTechnicalFolderV2866_(technicalJob);
 var zipFile=technical.createFile(zip.copyBlob());
 var manifestText=JSON.stringify({version:2825,entries:entries}),manifest=technical.createFile('publication.json',manifestText,MimeType.PLAIN_TEXT);
 var state={version:2825,pipelineVersion:2831,sessionKeyV2751:CDQ_ACCES_RPC_COURANT_&&CDQ_ACCES_RPC_COURANT_.sessionKeyV2751,id:jobId,clientId:String(clientId),actor:normaliserEmailCDQ_(access.actor.email),email:String(email),subject:String(subject),sendKey:sendKey||'',at:confirmedAt||Date.now(),phase:confirmedAt?'ready':'prepared',zipId:zipFile.getId(),zipHash:zipHash,manifestId:manifest.getId(),manifestHash:cdqUploadHashV2751_(Utilities.newBlob(manifestText).getBytes()),folderId:folder.getId(),technicalFolderId:technicalJob.technicalFolderId,cursor:0,count:entries.length};
 props.setProperty(CDQ_DELIVERY_PREFIX_V2825_+jobId,JSON.stringify(state));
 cdqDeliveryQueueV2830_(state);
 delivery.publicationJobId=jobId;
 return state;
}
function cdqDeliveryConfirmV2825_(job){
 var props=PropertiesService.getScriptProperties(),key=CDQ_DELIVERY_PREFIX_V2825_+job.id;
 var current=JSON.parse(props.getProperty(key)||'null');if(!current)throw Error('INVALID_DELIVERY_JOB');
 if(current.phase==='prepared'){current.phase='ready';props.setProperty(key,JSON.stringify(current));}
}
function cdqDeliveryQueuedReceiptV2825_(delivery,clientId){return {ok:true,archives:0,clientId:clientId,publicationQueued:true,publicationJobId:delivery.publicationJobId,portalPending:true};}
function cdqDeliverySentEvidenceV2825_(job){
 var props=PropertiesService.getScriptProperties(),receipt=JSON.parse(props.getProperty(job.sendKey)||'null');
 if(receipt&&receipt.phase==='sent'&&receipt.jobId===job.id)return true;
 // Resolve the small post-send crash window using exact ZIP bytes, never resend.
 var threads=GmailApp.search('in:sent after:'+Math.floor((job.at-1000)/1000)+' subject:"'+job.subject.replace(/["\\]/g,' ')+'"',0,20);
 return threads.some(function(thread){return thread.getMessages().some(function(message){
  if(message.getSubject()!==job.subject||message.getDate().getTime()<job.at-1000||message.getTo().toLowerCase().indexOf(job.email.toLowerCase())<0)return false;
  return message.getAttachments({includeInlineImages:false,includeAttachments:true}).some(function(blob){return /\.zip$/i.test(blob.getName())&&cdqUploadHashV2751_(blob.getBytes())===job.zipHash;});
 });});
}
function cdqDeliveryWorkerV2825_(budgetMs,onlyClient,onlyActor,onlyJob){
 // Never scan/replay old deliveries, including when a legacy trigger fires.
 if(typeof onlyJob!=='string'||!onlyJob||!onlyClient||!onlyActor)return;

 var budget=typeof budgetMs==='number'?Math.max(5000,Math.min(180000,budgetMs)):180000;
 var props=PropertiesService.getScriptProperties(),start=Date.now();
 var keys=[CDQ_DELIVERY_PREFIX_V2825_+onlyJob];
 for(var k=0;k<keys.length&&Date.now()-start<budget;k++){
  var key=keys[k],job,lease=Utilities.getUuid(),lock=LockService.getScriptLock();
  lock.waitLock(10000);
  try{job=JSON.parse(props.getProperty(key)||'null');if(!job||job.id!==onlyJob||job.clientId!==onlyClient||job.actor!==onlyActor||job.phase==='complete'||job.blocked||job.leaseUntil>Date.now()||job.nextAt>Date.now())continue;job.lease=lease;job.leaseUntil=Date.now()+420000;props.setProperty(key,JSON.stringify(job));}
  finally{lock.releaseLock();}
  var oldAccess=CDQ_ACCES_RPC_COURANT_,oldPermission=CDQ_WS_RPC_PERMISSION_V2638_;
  try{
   var actor=cdqWsActorV2638_(job.actor);
   CDQ_ACCES_RPC_COURANT_={email:actor.email,role:actor.role,verifiedUserV2686:actor,sessionKeyV2751:job.sessionKeyV2751};
   CDQ_WS_RPC_PERMISSION_V2638_=cdqWsRpcPermissionV2638_('envoyerSelectionSuivi',actor.email);
   var access=cdqClientPortalScopeV20261028_(job.clientId),client=cdqWsListClientV2646_(job.clientId),scope=access.scope;
   if(!client||!client.meta||client.meta.id!==job.clientId||!client.path||client.path.length!==2)throw Error('SCOPE_MISMATCH : client déplacé.');
   if(props.getProperty('CDQ_CLIENT_PORTAL_ENABLED_20261028')!=='true')throw Error('PORTAL_DISABLED');
   if(job.phase==='prepared'){
    if(!cdqDeliverySentEvidenceV2825_(job)){job.nextAt=Date.now()+300000;if(Date.now()-job.at>86400000){job.blocked=true;job.error='Envoi non confirmé : vérifiez les courriels envoyés.';}continue;}
    job.phase='ready';props.setProperty(key,JSON.stringify(job));
   }
   [job.zipId,job.manifestId,job.folderId].forEach(function(id){cdqLegacyArtifactScopeV2866_(job,id);});
   var zip=DriveApp.getFileById(job.zipId).getBlob();
   var manifestBlob=DriveApp.getFileById(job.manifestId).getBlob();if(cdqUploadHashV2751_(manifestBlob.getBytes())!==job.manifestHash)throw Error('CONFLICT_DELIVERY_MANIFEST');
   // Keep ZIP handling native. Materializing millions of ZIP bytes in V8 on
   // every continuation is unnecessary: the immutable manifest binds each
   // PDF name, length and SHA-256, all checked before archive/publication below.
   var pdfs;try{pdfs=Utilities.unzip(zip);}catch(_){throw Error('CONFLICT_DELIVERY_ZIP');}
   var manifest=JSON.parse(manifestBlob.getDataAsString());
   if(!manifest.entries||manifest.entries.length!==job.count||pdfs.length!==job.count)throw Error('CONFLICT_DELIVERY_MANIFEST');
   cdqReportEngineCallV2754_(actor,'portalLink',{clientId:job.clientId,clientName:String(client.meta.name||'Documents client')},scope);
   var folder=DriveApp.getFolderById(job.folderId);
   while(job.cursor<job.count&&Date.now()-start<budget){
    var item=manifest.entries[job.cursor],blob=pdfs[job.cursor],bytes=blob.getBytes();
    if(blob.getName()!==item.name||bytes.length!==item.size||cdqUploadHashV2751_(bytes)!==item.sha256)throw Error('CONFLICT_DELIVERY_PDF');
    // The per-delivery folder makes creation resumable even if a process dies
    // immediately after Drive creates the PDF and before the cursor is saved.
    var files=folder.getFilesByName(item.name),file=null;
    while(files.hasNext()){var candidate=files.next();if(cdqUploadHashV2751_(candidate.getBlob().getBytes())!==item.sha256)throw Error('CONFLICT_DELIVERY_ARCHIVE');if(!file)file=candidate;}
    if(!file)file=folder.createFile(blob.copyBlob().setContentType('application/pdf'));
    file.setDescription(JSON.stringify({schema:1,type:'cdq-archive-envoi',archivedAt:new Date(job.at).toISOString(),clientId:job.clientId,sessionId:job.id,email:job.email,source:'convertir-et-envoyer-v28.25',zipSha256:job.zipHash}));
    var documentId=cdqUploadHashV2751_(Utilities.newBlob('cdq-portal-logical-v2825|'+job.clientId+'|'+cdqDeliveryReportKeyV2825_(item.name)).getBytes());
    var receipt=cdqReportEngineCallV2754_(actor,'portalPublish',{logicalReportV2825:1,stableSourceV1:1,sourceFileId:item.sourceId||file.getId(),sourceArchivedAtMs:job.at,clientId:job.clientId,deliveryId:job.id,documentId:documentId,name:item.name,size:item.size,sha256:item.sha256,base64:Utilities.base64Encode(bytes)},scope);
    if(!receipt||receipt.ok!==true||receipt.documentId!==documentId||(!receipt.superseded&&(receipt.sha256!==item.sha256||receipt.size!==item.size)))throw Error('INVALID_PORTAL_RECEIPT');
    job.cursor++;job.attempts=0;job.error='';props.setProperty(key,JSON.stringify(job));
   }
   if(job.cursor===job.count){job.phase='complete';job.completedAt=Date.now();}
  }catch(error){job.attempts=Number(job.attempts||0)+1;job.error=String(error.message||error).slice(0,300);job.blocked=job.attempts>=8||/^(SCOPE_|CONFLICT_|INVALID_|PORTAL_REVOKED|PORTAL_DOCUMENT_REMOVED)/.test(job.error);job.nextAt=Date.now()+Math.min(3600000,300000*Math.pow(2,job.attempts-1));}
  finally{CDQ_ACCES_RPC_COURANT_=oldAccess;CDQ_WS_RPC_PERMISSION_V2638_=oldPermission;job.leaseUntil=0;job.lease='';props.setProperty(key,JSON.stringify(job));}
 }
}
// One-time, explicitly scoped repair of the user's reported sent ZIP. No mail.
function cdqRepairSentSanimarcV2825_(access){
 var clientId='12l0Hh5fSvVOWxgkTnQjan300JATQEj4U',messageId='1a19c3102f31311c';
 if(access.scope.clientId!==clientId||normaliserEmailCDQ_(access.actor.email)!=='jp.rodrigue86@gmail.com')return null;
 var props=PropertiesService.getScriptProperties(),key='CDQ_REPAIR_SENT_V2825:'+messageId,old=props.getProperty(key);
 if(old)return JSON.parse(props.getProperty(CDQ_DELIVERY_PREFIX_V2825_+old)||'null');
 var message=GmailApp.getMessageById(messageId);
 if(message.getSubject()!=='Rapports d’étalonnages - Sani-marc - 2026-11-02'||message.getTo().toLowerCase().indexOf('jp.rodrigue86@gmail.com')<0||message.getFrom().toLowerCase().indexOf('jp.rodrigue86@gmail.com')<0)throw Error('CONFLICT_SENT_MESSAGE');
 var zips=message.getAttachments({includeInlineImages:false,includeAttachments:true}).filter(function(b){return b.getName()==='Rapports - Sani-marc - 2026-11-02.zip';});
 if(zips.length!==1||zips[0].getBytes().length!==15912663)throw Error('CONFLICT_SENT_ZIP');
 var pdfs=Utilities.unzip(zips[0]),job=cdqDeliveryStageV2825_({attachments:zips,pdfs:pdfs,sourceIds:[]},clientId,'jp.rodrigue86@gmail.com',message.getSubject(),'',message.getDate().getTime());
 props.setProperty(key,job.id);return job;
}

// V28.26: prepare large direct-file selections in bounded, durable steps.
// Only a new authenticated send request creates a job. Installation does not
// replay old requests or publish any client documents.
var CDQ_SEND_QUEUE_V2826_ = 'CDQ_SEND_QUEUE_V2826:';
var CDQ_SEND_ITEM_V2826_ = 'CDQ_SEND_ITEM_V2826:';
function cdqSendQueueSaveV2826_(job) {
  PropertiesService.getScriptProperties().setProperty(CDQ_SEND_QUEUE_V2826_+job.id,JSON.stringify(job));
}
function cdqSendQueueScheduleV2826_() { return cdqSendClockReadyV2831_(); }
function cdqSendQueueReceiptV2826_(job) {
  return {ok:true,queued:true,envoyes:0,echecs:[],jobId:job.id,total:job.count,
    trackingVersion:2828,sessionId:String(job.session||''),clientId:job.clientId,status:'pending',mailSent:false,portalDone:false,
    message:'Préparation enregistrée : '+job.count+' fichiers. Le traitement continue automatiquement par étapes. Le courriel sera envoyé avec le ZIP des PDF non modifiables une fois la préparation terminée; la page client sera ensuite actualisée. Vous pouvez fermer cette fenêtre.'};
}
function cdqSendQueueStartV2826_(files,email,message,companyName,clientId,session,force) {
  var actor=verifierDroit_('envoi');
  if(!validerAdresseCourriel(email)||!Array.isArray(files)||!files.length||files.length>1000)throw Error('Sélection ou destinataire invalide.');
  cdqSendClockReadyV2831_();
  files=files.map(String);
  if(files.some(function(id){return !/^[A-Za-z0-9_-]{10,200}$/.test(id);})||new Set(files).size!==files.length)throw Error('Sélection incohérente : fichier invalide ou répété.');
  cdqClientPortalScopeV20261028_(clientId);cdqSendRequirePortalV2823_();
  var prior=cdqSendRecentQueueV2832_(files,email,clientId,actor,24);
  if(prior.incertain)throw Error('CDQ_ENVOI_A_VERIFIER : résultat incertain pour cette sélection. Aucun nouveau lot créé.');
  if(prior.doublon&&!force)throw Error('CDQ_DOUBLE_ENVOI|'+String(prior.timestamp||''));
  var oldSheets=cdqSendPreviousSheetsV2833_(files,email,clientId);
  if(oldSheets.incertain)throw Error('CDQ_ENVOI_A_VERIFIER : ZIP historique incertain. Aucun nouveau lot créé.');
  if(oldSheets.doublon&&!force)throw Error('CDQ_DOUBLE_ENVOI|'+String(oldSheets.timestamp||''));
  // Also consult the ORIGINAL send history, not only the V28.31 durable queue.
  // An explicit user-confirmed force starts a genuinely new full conversion.
  if(!force&&typeof verifierEnvoiSelectionRecent==='function'){
    var historical=verifierEnvoiSelectionRecent(files,[],'convertir',email,clientId,24);
    if(historical&&historical.doublon)
      throw Error('CDQ_DOUBLE_ENVOI|'+String(historical.timestamp||''));
  }
  var request={version:2826,files:files,email:String(email).trim(),message:String(message||''),companyName:String(companyName||''),clientId:String(clientId),force:!!force};
  var text=JSON.stringify(request),hash=cdqUploadHashV2751_(Utilities.newBlob(text).getBytes());
  var props=PropertiesService.getScriptProperties(),lock=LockService.getScriptLock();lock.waitLock(10000);
  var job,created=false;
  try {
    var all=props.getProperties(),active=Object.keys(all).filter(function(k){return k.indexOf(CDQ_SEND_QUEUE_V2826_)===0;}).map(function(k){var j=JSON.parse(all[k]);if(j.pipelineVersion===2831&&j.phase==='initializing'&&Date.now()-j.at>420000){j.blocked=true;j.error='Préparation initiale interrompue avant tout envoi.';cdqSendQueueSaveV2826_(j);}return j;}).find(function(j){return j.pipelineVersion===2831&&j.actor===actor.email&&j.requestHash===hash&&j.phase!=='complete'&&!j.blocked;});
    if(active)throw Error('CDQ_ENVOI_EN_COURS : un essai identique est encore actif. Terminez ou vérifiez cet essai avant d’en démarrer un nouveau indépendant.');
    else {
      job={version:2831,pipelineVersion:2831,id:Utilities.getUuid(),actor:actor.email,sessionKeyV2751:CDQ_ACCES_RPC_COURANT_&&CDQ_ACCES_RPC_COURANT_.sessionKeyV2751,clientId:String(clientId),session:String(session||''),count:files.length,requestHash:hash,renvoiConfirme:!!force,at:Date.now(),phase:'initializing',cursor:0};
      // Reserve this request before Drive calls; a concurrent click cannot queue
      // another mail while the first request is being persisted.
      cdqSendQueueSaveV2826_(job);created=true;
    }
  } finally {lock.releaseLock();}
  if(!created){if(job.requestId)cdqSendQueueScheduleV2826_();return cdqSendQueueReceiptV2826_(job);}
  if(job.phase!=='initializing'||job.at<Date.now()-300000)throw Error('Préparation incomplète : réessayez après vérification.');
  try {
    var client=DriveApp.getFolderById(clientId);
    if(!cdqArchiveClientInOriginalMasterV2622_(client))throw Error('SCOPE_MISMATCH : client déplacé.');
    var reports=cdqArchiveEnsureFolderV2622_(client,CDQ_SENT_ARCHIVE_REPORT_ALIASES_V2622,CDQ_SENT_ARCHIVE_REPORT_CANONICAL_V2622);
    var archives=cdqArchiveEnsureFolderV2622_(reports,CDQ_SENT_ARCHIVE_ARCHIVE_ALIASES_V2622,CDQ_SENT_ARCHIVE_ARCHIVE_CANONICAL_V2622);
    var date=Utilities.formatDate(new Date(job.at),Session.getScriptTimeZone()||'America/Toronto','yyyy-MM-dd');
    var dated=cdqArchiveEnsureFolderV2622_(archives,[date],date),folder=dated.createFolder('Envoi '+job.id);
    job.folderId=folder.getId();cdqLegacyTechnicalCreateV2866_(job);job.requestId=cdqLegacyTechnicalFolderV2866_(job).createFile('selection.json',text,MimeType.PLAIN_TEXT).getId();job.phase='prepare';
    cdqSendQueueSaveV2826_(job);cdqSendQueueScheduleV2826_();
    ecrireProgressionEnvoi_(session,{phase:'preparation',total:job.count,termine:0,message:'Préparation enregistrée; traitement automatique par étapes.'});
    return cdqSendQueueReceiptV2826_(job);
  } catch(e){job.blocked=true;job.error=String(e.message||e).slice(0,400);cdqSendQueueSaveV2826_(job);throw e;}
}
function cdqSendQueueScopeV2826_(id,clientId) {
  var scope=cdqDriveScopeV2521_(id,{},[CONFIG.MASTER_FOLDER_ID]);
  if(!scope.meta||scope.meta.trashed||!scope.path||scope.path.length<2||scope.path[1].id!==clientId)throw Error('SCOPE_MISMATCH : document déplacé hors du client.');
}
function cdqSendQueueEntriesV2826_(job) {
  var all=PropertiesService.getScriptProperties().getProperties(),entries=[];
  for(var i=0;i<job.count;i++){
    var value=all[CDQ_SEND_ITEM_V2826_+job.id+':'+i];if(!value)break;
    entries.push(JSON.parse(value));
  }
  return entries;
}

function cdqSendExportSheetGroupV2833_(group) {
  // Always export each source afresh: never read a PDF or ZIP from an older job.
  // Preserve the original single-sheet paper/portrait/export settings exactly.
  if(!Array.isArray(group)||!group.length||group.length>4)throw Error('INVALID_SHEET_EXPORT_GROUP');
  if(!UrlFetchApp||typeof UrlFetchApp.fetchAll!=='function')
    return group.map(function(x){return convertirGoogleSheetEnPdf(x.id);});
  var token=ScriptApp.getOAuthToken(),queries=group.map(function(x){
    return {
      url:'https://docs.google.com/spreadsheets/d/'+encodeURIComponent(x.id)+'/export?'+
        'format=pdf&size='+encodeURIComponent(CONFIG.FORMAT_PAPIER)+
        '&portrait='+(CONFIG.PORTRAIT?'true':'false')+
        '&fitw=true&sheetnames=false&printtitle=false&pagenumbers=false&gridlines=false&fzr=false',
      method:'get',headers:{Authorization:'Bearer '+token},muteHttpExceptions:true
    };
  });
  var responses=UrlFetchApp.fetchAll(queries);
  if(!responses||responses.length!==group.length)throw Error('SHEET_BATCH_EXPORT_INCOMPLETE');
  return responses.map(function(res,i){
    var status=res.getResponseCode();
    if(status!==200)throw Error('SHEET_BATCH_EXPORT_HTTP_'+status);
    return res.getBlob().setName(group[i].name.replace(/\.xlsx?$/i,'')+'.pdf');
  });
}
function cdqSendQueuePrepareV2826_(job,request,actor,deadline) {
  var props=PropertiesService.getScriptProperties(),entries=cdqSendQueueEntriesV2826_(job),
    folder=DriveApp.getFolderById(job.folderId),used={};
  entries.forEach(function(e){used[e.name.toLowerCase()]=true;});
  job.cursor=entries.length;
  var processed=0;
  while(job.cursor<job.count&&Date.now()+16000<deadline&&processed<16){
    var group=[],start=Date.now();
    for(var p=job.cursor;p<job.count&&group.length<4&&processed+group.length<16;p++){
      var id=request.files[p];
      cdqSendQueueScopeV2826_(id,job.clientId);
      var source=DriveApp.getFileById(id),mime=source.getMimeType();
      if(group.length&&mime!==MimeType.GOOGLE_SHEETS)break;
      group.push({id:id,source:source,name:source.getName(),mime:mime,
        revision:source.getLastUpdated().getTime()});
      if(mime!==MimeType.GOOGLE_SHEETS)break;
    }
    if(!group.length)throw Error('INVALID_SHEET_EXPORT_GROUP');
    var sheets=group.every(function(x){return x.mime===MimeType.GOOGLE_SHEETS;});
    var blobs=sheets?cdqSendExportSheetGroupV2833_(group):
      [convertirFichierEnPdf(group[0].id)];
    if(blobs.length!==group.length)throw Error('SHEET_BATCH_EXPORT_INCOMPLETE');
    for(var i=0;i<group.length;i++){
      var item=group[i],blob=blobs[i],inputBytes=blob.getBytes();
      if(item.source.getLastUpdated().getTime()!==item.revision)
        throw Error('CONFLICT_SOURCE_CHANGED : '+item.name);
      var identity=item.mime===MimeType.GOOGLE_SHEETS?
        'modified:'+item.revision:cdqUploadHashV2751_(inputBytes);
      var pdf=sheets?blob.copyBlob():cdqSendFlattenPdfV2823_(blob,actor,job.clientId);
      var bytes=sheets?inputBytes:pdf.getBytes(),name=cdqSendPdfNameV2823_(blob.getName(),used),
        sha=cdqUploadHashV2751_(bytes);
      if(bytes.length<8||bytes.length>CDQ_SEND_PORTAL_PDF_MAX_BYTES_V2823_||
        bytes.slice(0,5).map(function(b){return String.fromCharCode((b+256)%256);}).join('')!=='%PDF-')
        throw Error('INVALID_DELIVERY_PDF : '+name);
      // Only a prior partial write IN THIS fresh, uniquely named job folder
      // can be reconciled after a crash; other batches are never reused.
      var candidates=folder.getFilesByName(name),file=null;
      while(candidates.hasNext()){
        var candidate=candidates.next();
        if(cdqUploadHashV2751_(candidate.getBlob().getBytes())!==sha)
          throw Error('CONFLICT_DELIVERY_ARCHIVE : '+name);
        if(!file)file=candidate;
      }
      if(!file)file=folder.createFile(pdf.setName(name).setContentType('application/pdf'));
      var entry={name:name,sha256:sha,size:bytes.length,sourceId:item.id,fileId:file.getId(),
        identity:item.id+':'+identity+':'+blob.getName()};
      props.setProperty(CDQ_SEND_ITEM_V2826_+job.id+':'+job.cursor,JSON.stringify(entry));
      entries.push(entry);job.cursor++;processed++;job.error='';job.attempts=0;
      cdqSendQueueSaveV2826_(job);
      ecrireProgressionEnvoi_(job.session,{phase:'conversion',total:job.count,
        termine:job.cursor,message:job.cursor+' PDF sur '+job.count+' préparés et sauvegardés.'});
    }
    console.info('CDQ_SEND_BATCH_V2833 converted='+group.length+' elapsedMs='+(Date.now()-start));
  }
  if(job.cursor===job.count){job.phase='package';cdqSendQueueSaveV2826_(job);}
}
function cdqSendQueuePackageV2826_(job,request) {
  var entries=cdqSendQueueEntriesV2826_(job);
  if(entries.length!==job.count)throw Error('INVALID_DELIVERY_MANIFEST');
  var folder=DriveApp.getFolderById(job.folderId),children=folder.getFiles(),filesById={};
  while(children.hasNext()){var child=children.next();filesById[child.getId()]=child;}
  var pdfs=entries.map(function(e){if(!filesById[e.fileId])throw Error('SCOPE_MISMATCH : archive déplacée.');var b=filesById[e.fileId].getBlob(),bytes=b.getBytes();if(bytes.length!==e.size||cdqUploadHashV2751_(bytes)!==e.sha256)throw Error('CONFLICT_DELIVERY_PDF');return b.setName(e.name);});
  var date=Utilities.formatDate(new Date(job.at),Session.getScriptTimeZone()||'America/Toronto','yyyy-MM-dd');
  var name=cdqSendPdfNameV2823_('Rapports - '+(request.companyName||'Client')+' - '+date,{}).replace(/\.pdf$/,'.zip');
  var zip=Utilities.zip(pdfs,name),bytes=zip.getBytes(),zipHash=cdqUploadHashV2751_(bytes);
  if(bytes.length>CDQ_SEND_ZIP_MAX_BYTES_V2823_)throw Error('INVALID_ZIP_SIZE : le ZIP dépasse 24 Mio; aucun courriel envoyé.');
  var props=PropertiesService.getScriptProperties(),folder=cdqLegacyTechnicalFolderV2866_(job),files=folder.getFilesByName(name);
  var zipFile;if(files.hasNext()){zipFile=files.next();if(cdqUploadHashV2751_(zipFile.getBlob().getBytes())!==zipHash)throw Error('CONFLICT_DELIVERY_ZIP');}else zipFile=folder.createFile(zip);
  var manifestText=JSON.stringify({version:2825,entries:entries}),manifests=folder.getFilesByName('publication.json');
  var manifest=manifests.hasNext()?manifests.next():folder.createFile('publication.json',manifestText,MimeType.PLAIN_TEXT);
  if(manifest.getBlob().getDataAsString()!==manifestText)throw Error('CONFLICT_DELIVERY_MANIFEST');
  var canonical=JSON.stringify([job.clientId,request.email.toLowerCase(),entries.map(function(e){return e.identity;}).sort()]);
  var delivery={version:2825,pipelineVersion:2831,sessionKeyV2751:job.sessionKeyV2751,id:job.id,clientId:job.clientId,actor:job.actor,email:request.email,subject:'Rapports d’étalonnages - '+(request.companyName||'Client')+' - '+date,
    sendKey:'CDQ_SEND_ZIP_V2823_'+cdqUploadHashV2751_(Utilities.newBlob(canonical).getBytes()),at:job.at,phase:'prepared',zipId:zipFile.getId(),zipHash:zipHash,manifestId:manifest.getId(),manifestHash:cdqUploadHashV2751_(Utilities.newBlob(manifestText).getBytes()),folderId:job.folderId,technicalFolderId:job.technicalFolderId,cursor:0,count:job.count};
  props.setProperty(CDQ_DELIVERY_PREFIX_V2825_+job.id,JSON.stringify(delivery));
  job.phase='send';job.mailReadyAt=Date.now();cdqSendQueueSaveV2826_(job);
}
function cdqSendQueueMailV2826_(job,request) {
  var props=PropertiesService.getScriptProperties(),delivery=JSON.parse(props.getProperty(CDQ_DELIVERY_PREFIX_V2825_+job.id)||'null');
  if(!delivery)throw Error('INVALID_DELIVERY_JOB');
  if(job.mailAttempted){
    if(!cdqDeliverySentEvidenceV2825_(delivery))throw Error('CDQ_ENVOI_A_VERIFIER : résultat du courriel incertain. Aucun renvoi automatique.');
    cdqDeliveryConfirmV2825_(delivery);job.phase='publish';job.attempts=0;job.error='';job.nextAt=0;return;
  }
  cdqLegacyArtifactScopeV2866_(delivery,delivery.zipId);
  var zip=DriveApp.getFileById(delivery.zipId).getBlob();
  if(cdqUploadHashV2751_(zip.getBytes())!==delivery.zipHash)throw Error('CONFLICT_DELIVERY_ZIP');
  var lock=LockService.getScriptLock();lock.waitLock(10000);
  try {
    var previous=JSON.parse(props.getProperty(delivery.sendKey)||'null');
    if(previous&&previous.phase==='sending'&&!(typeof cdqSendReviewAllowsSendKeyV20261112_==='function'&&cdqSendReviewAllowsSendKeyV20261112_(delivery.sendKey)))throw Error('CDQ_ENVOI_A_VERIFIER : un envoi de ces mêmes PDF est à vérifier.');
    if(previous&&previous.phase==='sent'&&Date.now()-previous.at<86400000&&!request.force)throw Error('CDQ_DOUBLE_ENVOI : ces PDF ont déjà été envoyés.');
    props.setProperty(delivery.sendKey,JSON.stringify({phase:'sending',at:Date.now(),jobId:job.id}));
    job.mailAttempted=true;cdqSendQueueSaveV2826_(job);
  } finally {lock.releaseLock();}
  // A separate invocation handles mail: conversion/ZIP time is never deducted
  // from its execution budget. Publication resumes only after confirmed mail.
  var body=request.message.trim()?request.message:'Bonjour,\n\nVeuillez trouver ci-joint les éléments d’étalonnage de '+(request.companyName||'votre entreprise')+'.\n\nMerci.';
  cdqEmailPortalSendV20261030_(request.email,delivery.subject,body,[zip],CONFIG.NOM_EXPEDITEUR,job.clientId,'convertir');
  props.setProperty(delivery.sendKey,JSON.stringify({phase:'sent',at:Date.now(),jobId:job.id}));
  cdqDeliveryConfirmV2825_(delivery);
  job.phase='publish';job.attempts=0;job.error='';job.nextAt=0;
  ecrireProgressionEnvoi_(job.session,{phase:'publication',total:job.count,termine:0,message:'Courriel envoyé avec '+job.count+' PDF dans le ZIP. Mise à jour de la page client en cours.'});
}
function cdqSendQueuePublishV2830_(job,deadline){
 var props=PropertiesService.getScriptProperties(),key=CDQ_DELIVERY_PREFIX_V2825_+job.id;
 var delivery=JSON.parse(props.getProperty(key)||'null');
 if(!delivery||delivery.id!==job.id||delivery.clientId!==job.clientId||delivery.actor!==job.actor||delivery.count!==job.count)throw Error('INVALID_DELIVERY_JOB');
 var remaining=deadline-Date.now();
 if(remaining>=5000)cdqDeliveryWorkerV2825_(remaining,job.clientId,job.actor,job.id);
 delivery=JSON.parse(props.getProperty(key)||'null');
 job.cursor=Number(delivery.cursor)||0;job.error=delivery.error||'';job.blocked=!!delivery.blocked;job.nextAt=Number(delivery.nextAt)||0;
 if(delivery.phase==='complete'&&delivery.cursor===job.count){
  job.phase='complete';job.completedAt=Date.now();job.nextAt=0;
  ecrireProgressionEnvoi_(job.session,{phase:'termine',total:job.count,termine:job.count,message:'Courriel envoyé et page client actualisée : '+job.count+' PDF.'});
 }
}
function cdqSendQueueWorkerV2826_(event) {
  if(!event||event.executor!=='cloudflare-cron')return;
  var props=PropertiesService.getScriptProperties(),all=props.getProperties(),deadline=Date.now()+78000;
  props.setProperty('CDQ_PIPELINE_HEALTH_V2830',JSON.stringify({version:2830,startedAt:Date.now(),triggered:!!(event&&event.executor==='cloudflare-cron'),state:'running'}));
  var keys=Object.keys(all).filter(function(k){return k.indexOf(CDQ_SEND_QUEUE_V2826_)===0;});
  for(var i=0;i<keys.length&&Date.now()<deadline;i++){
    var job,lock=LockService.getScriptLock();lock.waitLock(10000);
    try {job=JSON.parse(props.getProperty(keys[i])||'null');if(!job||job.pipelineVersion!==2831||job.phase==='initializing'||job.phase==='complete'||job.blocked||job.leaseUntil>Date.now()||job.nextAt>Date.now())continue;job.leaseUntil=Date.now()+420000;cdqSendQueueSaveV2826_(job);}finally{lock.releaseLock();}
    var old=CDQ_ACCES_RPC_COURANT_,oldDrive=CDQ_WS_RPC_PERMISSION_V2638_;
    try {
      var actor=cdqWsActorV2638_(job.actor);
      CDQ_ACCES_RPC_COURANT_={email:actor.email,role:actor.role,verifiedUserV2686:actor,sessionKeyV2751:job.sessionKeyV2751};
      CDQ_WS_RPC_PERMISSION_V2638_=cdqWsRpcPermissionV2638_('envoyerSelectionSuivi',actor.email);
      cdqClientPortalScopeV20261028_(job.clientId);cdqSendRequirePortalV2823_();
      if(job.phase==='publish'){cdqSendQueuePublishV2830_(job,deadline);}
      else {
      cdqSendQueueScopeV2826_(job.folderId,job.clientId);cdqLegacyArtifactScopeV2866_(job,job.requestId);
      var blob=DriveApp.getFileById(job.requestId).getBlob();
      if(cdqUploadHashV2751_(blob.getBytes())!==job.requestHash)throw Error('CONFLICT_DELIVERY_REQUEST');
      var request=JSON.parse(blob.getDataAsString());
      if(request.clientId!==job.clientId||request.files.length!==job.count)throw Error('INVALID_DELIVERY_REQUEST');
      if(job.phase==='prepare')cdqSendQueuePrepareV2826_(job,request,actor,deadline);
      else if(job.phase==='package'){if(deadline-Date.now()>25000)cdqSendQueuePackageV2826_(job,request);}
      else if(job.phase==='send'){if(deadline-Date.now()>25000)cdqSendQueueMailV2826_(job,request);}
      }
    } catch(e){job.error=String(e.message||e).slice(0,400);job.attempts=Number(job.attempts||0)+1;job.blocked=job.attempts>=4||/^(SCOPE_|CONFLICT_|INVALID_|CDQ_DOUBLE_ENVOI)/.test(job.error);job.nextAt=Date.now()+60000*Math.pow(2,job.attempts-1);console.error('CDQ_SEND_QUEUE_V2826 '+job.id+' '+job.phase+' '+job.error);ecrireProgressionEnvoi_(job.session,{phase:'erreur',total:job.count,termine:job.cursor,message:job.error});}
    finally {CDQ_ACCES_RPC_COURANT_=old;CDQ_WS_RPC_PERMISSION_V2638_=oldDrive;job.leaseUntil=0;cdqSendQueueSaveV2826_(job);}
    if(job.phase==='complete')for(var j=0;j<job.count;j++)props.deleteProperty(CDQ_SEND_ITEM_V2826_+job.id+':'+j);
  }
  // The external cron stays active when the queue is empty.
  var health=JSON.parse(props.getProperty('CDQ_PIPELINE_HEALTH_V2830')||'{}');health.completedAt=Date.now();health.state='idle';props.setProperty('CDQ_PIPELINE_HEALTH_V2830',JSON.stringify(health));
}
// V28.28: project durable send/publication checkpoints without advancing them.
// No Gmail search, worker invocation, schedule, cache or property write here.
function cdqSendTrackingParseV2828_(raw) {
  try {var value=JSON.parse(raw||'null');return value&&typeof value==='object'?value:null;}catch(_){return null;}
}
function cdqSendTrackingOwnedV2828_(job,id,actor,clientId) {
  return !!job&&job.id===id&&String(job.actor||'').trim().toLowerCase()===actor&&job.clientId===clientId;
}
function cdqSendTrackingProjectV2828_(queue,delivery,all) {
  var job=queue||delivery,total=Math.max(0,Number(job.count)||0);
  var receipt=delivery&&delivery.sendKey?cdqSendTrackingParseV2828_(all[delivery.sendKey]):null;
  var mailSent=!!((receipt&&receipt.phase==='sent'&&receipt.jobId===job.id)||
    (delivery&&(delivery.phase==='ready'||delivery.phase==='complete'))||(queue&&queue.phase==='complete'));
  var portalDone=!!(delivery&&delivery.phase==='complete'&&Number(delivery.cursor)===total&&Number(delivery.count)===total);
  var complete=mailSent&&portalDone;
  var blocked=!complete&&!!((delivery&&delivery.blocked)||(queue&&queue.blocked&&(!mailSent||queue.pipelineVersion>=2830))); 
  // V28.29: a read-only attention state, never a durable worker block.
  // Preparation age is not mail age. Require an exact confirmed-mail timestamp.
  var confirmedAt=Math.max(queue&&queue.phase==='complete'?Number(queue.completedAt)||0:0,
    receipt&&receipt.phase==='sent'&&receipt.jobId===job.id?Number(receipt.at)||0:0);
  var attention=!complete&&!blocked&&mailSent&&!!delivery&&Number(delivery.cursor)===0&&
    confirmedAt>0&&Date.now()-confirmedAt>=900000&&
    !(Number(delivery.leaseUntil)>Date.now())&&!(Number(delivery.nextAt)>Date.now());
  var queueError=String(queue&&queue.error||'');
  var duplicateBlocked=!mailSent&&/^CDQ_DOUBLE_ENVOI/.test(queueError);
  var uncertain=!mailSent&&!!((queue&&queue.mailAttempted)||(receipt&&receipt.phase==='sending')||
    queueError.indexOf('CDQ_ENVOI_A_VERIFIER')!==-1);
  var mailStalled=!mailSent&&!duplicateBlocked&&!uncertain&&queue&&queue.phase==='send'&&
    Number(queue.mailReadyAt)>0&&Date.now()-Number(queue.mailReadyAt)>180000&&
    !(Number(queue.leaseUntil)>Date.now())&&!(Number(queue.nextAt)>Date.now());
  var phase=complete?'termine':(mailSent?'publication':(uncertain?'verification':
    (!queue||queue.phase==='send'?'envoi':(queue.phase==='package'?'assemblage':'preparation'))));
  var progress=mailSent?(delivery&&delivery.cursor):queue&&queue.cursor;
  var result={trackingVersion:2828,jobId:job.id,clientId:job.clientId,sessionId:String(queue&&queue.session||''),
    createdAt:Number(job.at)||0,total:total,renvoiConfirme:!!(queue&&queue.renvoiConfirme),
    termine:complete?total:Math.max(0,Math.min(total,Number(progress)||0)),
    phase:phase,status:complete?'complete':(blocked||attention?'blocked':'pending'),mailSent:mailSent,portalDone:portalDone};
  if(complete)result.message='Courriel envoyé et page client actualisée : '+total+' PDF.';
  else if(mailSent)result.message='Courriel envoyé. Mise à jour de la page client : '+result.termine+' sur '+total+' PDF.';
  else if(uncertain)result.message='Résultat du courriel à vérifier. Aucun nouvel envoi ne doit être lancé pendant cette vérification.';
  else if(phase==='assemblage')result.message='Assemblage du ZIP : '+total+' PDF préparés.';
  else if(phase==='envoi')result.message='Préparation terminée. Confirmation du courriel en attente.';
  else result.message='Préparation : '+result.termine+' sur '+total+' PDF sauvegardés.';
  // Worker errors can contain recipient/file data. Return categories, never raw text.
  var active=mailSent&&!(queue&&queue.blocked&&queue.pipelineVersion>=2830)?delivery:queue||delivery;
  if(!complete&&((active&&active.error)||blocked||uncertain)) {
    result.error=uncertain?'MAIL_UNCONFIRMED':(mailSent?'PORTAL_PENDING':'PREPARATION_PENDING');
    if(blocked)result.message+=' Traitement suspendu; une vérification est nécessaire.';
    else if(!uncertain)result.message+=' Difficulté temporaire; reprise automatique en attente.';
  }
  if(!complete&&!blocked&&active&&Number(active.nextAt)>Date.now())result.retryAt=Number(active.nextAt);
  if(duplicateBlocked){
    // Backward-compatible terminal state for installed Android 28.31:
    // PREPARATION_PENDING enables its "Fermer le suivi" control; it does NOT
    // mean this job sent a mail. Keep the exact reason machine readable.
    result.phase='envoi';result.status='blocked';
    result.error='PREPARATION_PENDING';result.terminalReason='ALREADY_SENT';
    result.message='Cet ancien essai n’autorisait pas un second courriel identique. Aucun nouvel envoi n’a été effectué. Fermez ce suivi; une confirmation de renvoi doit créer une nouvelle tâche.';
  } else if(mailStalled) {
    result.phase='envoi';result.status='blocked';result.error='MAIL_STAGE_STALLED';
    result.message='Le ZIP est prêt, mais la confirmation du courriel tarde. Vérifiez le statut du dernier envoi avant toute nouvelle tentative.';
  }
  if(attention){
    result.error='PORTAL_PROGRESS_UNCONFIRMED';
    result.message='Courriel confirmé. Aucun PDF confirmé sur la page client plus de 15 minutes après l’envoi. Vérifiez l’état avant de renvoyer ce lot. Vous pouvez fermer le suivi sans relancer ni annuler le traitement.';
  }
  return result;
}
function cdqSendTrackingReadLegacyV20261103_(query) {
  var actor=verifierDroit_('envoi'),email=String(actor&&actor.email||'').trim().toLowerCase();
  var clientId=String(query.clientId||'').trim(),id=String(query.jobId||'').trim(),sessionId=String(query.sessionId||'');
  if(!email||!/^[A-Za-z0-9_-]{10,200}$/.test(clientId)||(id&&!/^[A-Za-z0-9_-]{8,100}$/.test(id)))throw Error('INVALID_TRACKING_QUERY');
  // Existing read-only access/scope checks revalidate the current actor and client.
  cdqClientPortalScopeV20261028_(clientId);
  var all=PropertiesService.getScriptProperties().getProperties();
  function read(jobId) {
    var queue=cdqSendTrackingParseV2828_(all[CDQ_SEND_QUEUE_V2826_+jobId]);
    var delivery=cdqSendTrackingParseV2828_(all[CDQ_DELIVERY_PREFIX_V2825_+jobId]);
    if(queue&&!cdqSendTrackingOwnedV2828_(queue,jobId,email,clientId))return null;
    if(delivery&&!cdqSendTrackingOwnedV2828_(delivery,jobId,email,clientId))return null;
    if(!queue&&!delivery)return null;
    if(queue&&queue.pipelineVersion!==2831&&!queue.mailAttempted&&!delivery){
      if(!id)return null;
      return {trackingVersion:2828,jobId:jobId,clientId:clientId,total:queue.count,termine:queue.cursor||0,phase:'preparation',status:'blocked',mailSent:false,portalDone:false,error:'PREPARATION_PENDING',message:'Cette ancienne préparation est arrêtée et ne sera pas relancée. Aucun courriel envoyé. Fermez ce suivi puis confirmez votre sélection actuelle.'};
    }
    if(!id&&sessionId&&(!queue||queue.session!==sessionId))return null;
    return cdqSendTrackingProjectV2828_(queue,delivery,all);
  }
  if(id)return read(id)||{trackingVersion:2828,jobId:id,total:0,termine:0,phase:'verification',status:'blocked',mailSent:false,portalDone:false,error:'NOT_FOUND',message:'Suivi indisponible pour cet envoi. Vérifiez son résultat avant tout nouvel envoi.'};
  var seen={},candidates=[];
  Object.keys(all).forEach(function(key){
    var prefix=key.indexOf(CDQ_SEND_QUEUE_V2826_)===0?CDQ_SEND_QUEUE_V2826_:
      (key.indexOf(CDQ_DELIVERY_PREFIX_V2825_)===0?CDQ_DELIVERY_PREFIX_V2825_:'');
    if(!prefix)return;
    var jobId=key.slice(prefix.length);if(seen[jobId])return;seen[jobId]=true;
    var result=read(jobId);
    if(result&&(result.status!=='complete'||result.createdAt>=Date.now()-86400000))candidates.push(result);
  });
  // On app restart, choose the latest submitted job, not a stale older blocked
  // job that should never obscure a newer confirmed mail+portal delivery.
  // Explicit jobId/sessionId reads still return their exact job unchanged.
  candidates.sort(function(a,b){
    var newest=(Number(b.createdAt)||0)-(Number(a.createdAt)||0);
    if(newest)return newest;
    var activeA=a.status!=='complete',activeB=b.status!=='complete';
    return activeA!==activeB?(activeA?-1:1):String(b.jobId||'').localeCompare(String(a.jobId||''));
  });
  return candidates[0]||{trackingVersion:2828,jobId:'',status:'none'};
}


// V28.31: the existing Cloudflare cron calls this through the signed service
// envelope. No public RPC or client polling can advance mail/publication.
var CDQ_SEND_HEALTH_V2831_='CDQ_SEND_HEALTH_V2831';
function cdqSendClockOwnerV2831_(){
 if(typeof CDQ_ACCES_RPC_COURANT_!=='undefined'&&CDQ_ACCES_RPC_COURANT_)throw Error('OWNER_EDITOR_ONLY');
 var owner=normaliserEmailCDQ_(obtenirAdministrateurPrincipal_());
 if(!owner||normaliserEmailCDQ_(Session.getActiveUser().getEmail())!==owner||normaliserEmailCDQ_(Session.getEffectiveUser().getEmail())!==owner)throw Error('OWNER_EDITOR_ONLY');
}
function cdqSendClockReadyV2831_(){
 var health=cdqSendTrackingParseV2828_(PropertiesService.getScriptProperties().getProperty(CDQ_SEND_HEALTH_V2831_));
 if(!health||health.executor!=='cloudflare-cron'||health.version!==2831||!health.startedAt||Date.now()-health.startedAt>300000||health.state==='failed')throw Error('CDQ_SEND_EXECUTOR_UNAVAILABLE : le traitement automatique ne répond pas. Aucun nouveau lot accepté; réessayez après sa remise en service.');
 return true;
}
function cdqSendServiceTickV2831_(message){
 // Called only AFTER cdqReportEngineVerifyV2754_ authenticated the envelope.
 if(!message||message.purpose!=='engine-to-gas'||message.action!=='sendQueueTickV2831'||!message.payload||message.payload.protocol!==2831||!Number.isSafeInteger(message.timestamp)||Math.abs(Date.now()-message.timestamp)>90000||!/^[a-f0-9-]{36}$/i.test(message.nonce||''))throw Error('INVALID_SEND_TICK : appel serveur invalide.');
 var props=PropertiesService.getScriptProperties(),lock=LockService.getScriptLock(),health,leaseKey='CDQ_SEND_EXECUTOR_LEASE_V2831';
 lock.waitLock(10000);
 try{
  var cache=CacheService.getScriptCache(),nonceKey='CDQ_SEND_TICK_V2831:'+message.nonce;
  if(cache.get(nonceKey))throw Error('BRIDGE_REPLAY : appel déjà reçu.');
  cache.put(nonceKey,'1',180);
  var lease=cdqSendTrackingParseV2828_(props.getProperty(leaseKey));
  if(lease&&lease.until>Date.now())return {ok:true,version:2831,state:'busy'};
  props.setProperty(leaseKey,JSON.stringify({nonce:message.nonce,until:Date.now()+420000}));
  health={version:2831,executor:'cloudflare-cron',startedAt:Date.now(),state:'running'};
  props.setProperty(CDQ_SEND_HEALTH_V2831_,JSON.stringify(health));
 }finally{lock.releaseLock();}
 try{cdqSendProbeV2831_();cdqSendQueueWorkerV2826_({executor:'cloudflare-cron'});health.state='idle';}
 catch(e){health.state='failed';throw e;}
 finally{
  health.completedAt=Date.now();
  props.setProperty(CDQ_SEND_HEALTH_V2831_,JSON.stringify(health));
  lock.waitLock(10000);
  try{var current=cdqSendTrackingParseV2828_(props.getProperty(leaseKey));if(current&&current.nonce===message.nonce)props.deleteProperty(leaseKey);}finally{lock.releaseLock();}
 }
 return {ok:true,version:2831,state:health.state,startedAt:health.startedAt,completedAt:health.completedAt};
}
// Kept inert until the diagnostic owner-created clock is removed. It cannot
// process old or new customer work; only the authenticated cron can do that.
function cdqSendClockV2831_(){return {retired:true};}
function cdqEtatHorlogeEnvoiV2831(){
 cdqSendClockOwnerV2831_();
 var health=cdqSendTrackingParseV2828_(PropertiesService.getScriptProperties().getProperty(CDQ_SEND_HEALTH_V2831_)),ready=false;
 try{ready=cdqSendClockReadyV2831_();}catch(_){}
 var result={version:2831,ready:ready,health:health};console.log(JSON.stringify(result));return result;
}

// Owner diagnostic: the next real authenticated cron converts the FIRST source
// from the known stalled request. It creates no Drive file, sends no email and
// never publishes a customer document. Only aggregate proof is persisted.
function cdqPreparerPreuveEnvoiV2831(){
 cdqSendClockOwnerV2831_();
 var props=PropertiesService.getScriptProperties(),job=cdqSendTrackingParseV2828_(props.getProperty(CDQ_SEND_QUEUE_V2826_+'27d224a5-5e3a-4eca-9a7c-d77aa6c4b94c'));
 if(!job||job.pipelineVersion!==2830||job.phase!=='prepare'||job.cursor!==0||job.mailAttempted||job.actor!==normaliserEmailCDQ_(obtenirAdministrateurPrincipal_()))throw Error('PROBE_SOURCE_UNCONFIRMED');
 var existing=cdqSendTrackingParseV2828_(props.getProperty('CDQ_SEND_PROBE_V2831'));
 if(existing&&existing.state==='complete')throw Error('PROBE_ALREADY_COMPLETE');
 props.setProperty('CDQ_SEND_PROBE_V2831',JSON.stringify({state:'pending',sourceJobId:job.id,createdAt:Date.now()}));
 console.log(JSON.stringify({prepared:true,conversionOnly:true,emails:0,portalWrites:0}));
}
function cdqSendProbeV2831_(){
 var props=PropertiesService.getScriptProperties(),probe=cdqSendTrackingParseV2828_(props.getProperty('CDQ_SEND_PROBE_V2831'));
 if(!probe||probe.state!=='pending')return;
 var old=CDQ_ACCES_RPC_COURANT_,oldDrive=CDQ_WS_RPC_PERMISSION_V2638_;
 try{
  var job=cdqSendTrackingParseV2828_(props.getProperty(CDQ_SEND_QUEUE_V2826_+probe.sourceJobId));
  if(!job||job.pipelineVersion!==2830||job.mailAttempted)throw Error('PROBE_SOURCE_UNCONFIRMED');
  var actor=cdqWsActorV2638_(job.actor);
  CDQ_ACCES_RPC_COURANT_={email:actor.email,role:actor.role,verifiedUserV2686:actor,sessionKeyV2751:job.sessionKeyV2751};
  CDQ_WS_RPC_PERMISSION_V2638_=cdqWsRpcPermissionV2638_('envoyerSelectionSuivi',actor.email);
  cdqClientPortalScopeV20261028_(job.clientId);cdqLegacyArtifactScopeV2866_(job,job.requestId);
  var requestBlob=DriveApp.getFileById(job.requestId).getBlob();
  if(cdqUploadHashV2751_(requestBlob.getBytes())!==job.requestHash)throw Error('PROBE_REQUEST_CHANGED');
  var request=JSON.parse(requestBlob.getDataAsString()),id=request.files[0];
  if(request.clientId!==job.clientId||request.files.length!==job.count)throw Error('PROBE_REQUEST_CHANGED');
  cdqSendQueueScopeV2826_(id,job.clientId);
  var source=DriveApp.getFileById(id),revision=source.getLastUpdated().getTime(),pdf=convertirFichierEnPdf(id);
  if(source.getLastUpdated().getTime()!==revision)throw Error('PROBE_SOURCE_CHANGED');
  if(source.getMimeType()!==MimeType.GOOGLE_SHEETS)pdf=cdqSendFlattenPdfV2823_(pdf,actor,job.clientId);
  var bytes=pdf.getBytes();
  if(bytes.length<8||bytes.slice(0,5).map(function(b){return String.fromCharCode((b+256)%256);}).join('')!=='%PDF-')throw Error('INVALID_PROBE_PDF');
  var zip=Utilities.zip([pdf.setName('preuve.pdf')],'preuve.zip');
  probe={state:'complete',executor:'cloudflare-cron',completedAt:Date.now(),pdfBytes:bytes.length,pdfSha256:cdqUploadHashV2751_(bytes),zipBytes:zip.getBytes().length,files:1,emails:0,driveWrites:0,portalWrites:0};
 }catch(e){probe={state:'failed',completedAt:Date.now(),error:String(e.message||e).split(':')[0].slice(0,100),emails:0,driveWrites:0,portalWrites:0};}
 finally{CDQ_ACCES_RPC_COURANT_=old;CDQ_WS_RPC_PERMISSION_V2638_=oldDrive;props.setProperty('CDQ_SEND_PROBE_V2831',JSON.stringify(probe));}
}
function cdqEtatPreuveEnvoiV2831(){cdqSendClockOwnerV2831_();var result=cdqSendTrackingParseV2828_(PropertiesService.getScriptProperties().getProperty('CDQ_SEND_PROBE_V2831'));if(result&&result.sourceJobId)delete result.sourceJobId;console.log(JSON.stringify(result));return result;}

// New callers opt in only after an authenticated capability/edition preflight.
function verifierEnvoiSelectionRecentV2553(files,folders,mode,email,company,hours,options){
  if(options){
    if(options.protocol!==20261103)throw Error('SEND_PROTOCOL_UNAVAILABLE');
    return cdqSpPreflight_(files,folders,email,company,hours);
  }
  return verifierEnvoiSelectionRecentLegacyV20261103_(files,folders,mode,email,company,hours);
}
function cdqSendTrackingReadV2828_(query){
  var fast=cdqSpReadTracking_(query||{});
  if(query&&query.jobId&&fast)return fast;
  var old=cdqSendTrackingReadLegacyV20261103_(query);
  if(!fast)return old;
  if(!old||old.status==='none')return fast;
  return Number(fast.createdAt)>Number(old.createdAt)?fast:old;
}
// New legacy jobs separate technical artifacts; old jobs retain their paths.
function cdqLegacyTechnicalCreateV2866_(job){
 var result=Drive.Files.create({name:'Envoi technique historique '+job.id,mimeType:'application/vnd.google-apps.folder',parents:[CDQ_WS_SYSTEM_V2638_],appProperties:{cdqLegacyDeliveryV2866:'1',cdqJob:String(job.id),cdqClient:String(job.clientId)}},null,{fields:'id',supportsAllDrives:true});
 if(!result||!result.id)throw Error('TECHNICAL_FOLDER_NOT_CONFIRMED');
 job.technicalFolderId=String(result.id);cdqLegacyTechnicalFolderV2866_(job);return job.technicalFolderId;
}
function cdqLegacyTechnicalFolderV2866_(job){
 if(!job.technicalFolderId)return DriveApp.getFolderById(job.folderId);
 var meta=Drive.Files.get(String(job.technicalFolderId),{fields:'id,mimeType,parents,trashed,appProperties',supportsAllDrives:true}),p=meta.appProperties||{};
 if(meta.trashed||meta.mimeType!=='application/vnd.google-apps.folder'||!meta.parents||meta.parents.length!==1||meta.parents[0]!==CDQ_WS_SYSTEM_V2638_||p.cdqLegacyDeliveryV2866!=='1'||p.cdqJob!==String(job.id)||p.cdqClient!==String(job.clientId))throw Error('SCOPE_MISMATCH : dossier technique déplacé ou lot différent.');
 return DriveApp.getFolderById(job.technicalFolderId);
}
function cdqLegacyArtifactScopeV2866_(job,id){
 if(!job.technicalFolderId||id===job.folderId)return cdqSendQueueScopeV2826_(id,job.clientId);
 cdqLegacyTechnicalFolderV2866_(job);
 var manifest=id===job.requestId||id===job.manifestId,zip=id===job.zipId;
 if(!manifest&&!zip)throw Error('SCOPE_MISMATCH : fichier technique inconnu.');
 var meta=Drive.Files.get(String(id),{fields:'id,mimeType,parents,trashed',supportsAllDrives:true});
 if(meta.trashed||!meta.parents||meta.parents.length!==1||meta.parents[0]!==job.technicalFolderId||zip&&meta.mimeType!=='application/zip'||manifest&&['text/plain','application/json'].indexOf(meta.mimeType)<0)throw Error('SCOPE_MISMATCH : fichier technique déplacé ou incompatible.');
}

// Explicit inventory from the read-only 2026-11-09 review. No name-based discovery.
// Maintenance never invokes an executor, changes mail state, or deletes data.
function cdqLegacyRelocationMetaV2869_(id){
 return Drive.Files.get(String(id),{fields:'id,name,mimeType,parents,trashed,size,md5Checksum,appProperties,capabilities(canEdit)',supportsAllDrives:true});
}
function cdqLegacyRelocationTickV2869_(){
 var props=PropertiesService.getScriptProperties();if(props.getProperty('CDQ_LEGACY_RELOCATION_ALL_DONE_V2869')==='1')return {complete:true};
 var deadline=Date.now()+90000,results=[];
 for(var i=0;i<CDQ_LEGACY_RELOCATION_V2869_.length;i++){
  var entry=CDQ_LEGACY_RELOCATION_V2869_[i],key='CDQ_LEGACY_RELOCATION_RETRY_V2869_P2:'+entry.id;
  var retry=JSON.parse(props.getProperty(key)||'null'),saved=JSON.parse(props.getProperty('CDQ_LEGACY_RELOCATION_V2869:'+entry.id)||'null');
  if(saved&&saved.status==='complete'){results.push({id:entry.id,status:'complete',files:saved.files.length,targetId:saved.targetId});continue;}
  if(Date.now()>=deadline||retry&&retry.attempts>=3){results.push({id:entry.id,status:'pending',error:retry&&retry.error||'',states:cdqLegacyRelocationStatesV2869_(entry.id)});continue;}
  try{var result=cdqLegacyRelocationOneV2869_(entry);results.push({id:entry.id,status:result.status,files:result.files?result.files.length:0,targetId:result.targetId||''});}
  catch(e){var failure={attempts:(retry&&retry.attempts||0)+1,error:String(e.message||e).slice(0,180),at:new Date().toISOString()};props.setProperty(key,JSON.stringify(failure));results.push({id:entry.id,status:'blocked',error:failure.error,states:cdqLegacyRelocationStatesV2869_(entry.id)});}
 }
 var report={schema:2869,checkedAt:new Date().toISOString(),groups:results,complete:results.length===9&&results.every(function(r){return r.status==='complete';}),emailsSent:0,customerPdfOrSheetsMoved:0,deleted:0};
 // Private operator receipt, outside client folders; no emails or message text.
 var lock=LockService.getScriptLock();if(!lock.tryLock(100))return report;
 try{var root=DriveApp.getFolderById(CDQ_WS_SYSTEM_V2638_),name='MAJ-038-rangement-historique-2869.json',it=root.getFilesByName(name),file=it.hasNext()?it.next():null;
  if(it.hasNext())throw Error('HISTORICAL_RECEIPT_AMBIGUOUS');
  var text=JSON.stringify(report,null,2);if(file)file.setContent(text);else file=root.createFile(name,text,MimeType.PLAIN_TEXT);
  props.setProperty('CDQ_LEGACY_RELOCATION_RECEIPT_V2869',file.getId());if(report.complete)props.setProperty('CDQ_LEGACY_RELOCATION_ALL_DONE_V2869','1');return report;
 }finally{lock.releaseLock();}
}
function cdqLegacyRelocationOneV2869_(entry){
 var lock=LockService.getScriptLock();if(!lock.tryLock(100))return {status:'busy'};
 try{
  var props=PropertiesService.getScriptProperties(),key='CDQ_LEGACY_RELOCATION_V2869:'+entry.id;
  var journal=JSON.parse(props.getProperty(key)||'null');if(journal&&journal.status==='complete')return journal;
  var lease=JSON.parse(props.getProperty('CDQ_SEND_EXECUTOR_LEASE_V2831')||'null');
  if(lease&&Number(lease.until)>Date.now())return {status:'busy'};
  var names=['CDQ_SEND_QUEUE_V2826:'+entry.id,'CDQ_DELIVERY_V2825:'+entry.id],records=[];
  names.forEach(function(name){var raw=props.getProperty(name);if(raw)records.push({key:name,raw:raw,job:JSON.parse(raw)});});
  if(!records.length)throw Error('HISTORICAL_REFERENCES_MISSING');
  var first=records[0].job,clientId=String(first.clientId||''),actor=String(first.actor||'');
  if(!clientId||!actor)throw Error('HISTORICAL_IDENTITY_MISSING');
  // The current executor ignores retired 2830 preparations. A prepared/ready
  // delivery is inert while its paired queue is complete or explicitly blocked;
  // direct delivery work requires a scoped explicit call and claims its lease.
  // Preserve every state byte: this policy only permits storage relocation.
  var queue=records.filter(function(r){return r.key.indexOf('CDQ_SEND_QUEUE_V2826:')===0;})[0];
  queue=queue&&queue.job;
  function retired(j){return j&&j.version===2830&&j.pipelineVersion===2830&&j.phase==='prepare'&&j.cursor===0&&!j.mailAttempted&&Number(j.at)>0&&Number(j.at)<1794182400000&&records.length===1;}
  var queueIdle=queue&&(queue.phase==='complete'||queue.blocked===true||retired(queue));
  records.forEach(function(record){var j=record.job;
   if(j.id!==entry.id||j.folderId!==entry.folderId||j.clientId!==clientId||j.actor!==actor)throw Error('HISTORICAL_REFERENCE_CONFLICT');
   var pairedIdle=record.key.indexOf('CDQ_DELIVERY_V2825:')===0&&queueIdle&&j.version===2825&&['prepared','ready'].indexOf(j.phase)>=0&&(!j.pipelineVersion||j.pipelineVersion===2831);
   if(Number(j.leaseUntil)>Date.now()||j.phase!=='complete'&&j.blocked!==true&&!retired(j)&&!pairedIdle)throw Error('HISTORICAL_JOB_NOT_IDLE');
  });
  cdqWsActorV2638_(actor);cdqSendQueueScopeV2826_(entry.folderId,clientId);
  cdqWsListFolderWriteV2731_(DriveApp.getFolderById(clientId),actor,'ranger ses fichiers techniques');
  var root=cdqLegacyRelocationMetaV2869_(CDQ_WS_SYSTEM_V2638_);
  if(root.trashed||root.mimeType!=='application/vnd.google-apps.folder'||!root.capabilities||!root.capabilities.canEdit)throw Error('TECHNICAL_ROOT_NOT_WRITABLE');
  var referenced={},hashes={};records.forEach(function(record){var j=record.job;
   ['requestId','manifestId','zipId'].forEach(function(k){if(!j[k])return;var type=k==='zipId'?'zip':k==='requestId'?'request':'manifest';
    if(referenced[j[k]]&&referenced[j[k]]!==type)throw Error('HISTORICAL_ARTIFACT_COLLISION');referenced[j[k]]=type;
    var hash=j[k==='requestId'?'requestHash':k==='manifestId'?'manifestHash':'zipHash'];if(hash)hashes[j[k]]=hash;
   });
  });
  entry.files.forEach(function(f){if(!referenced[f.id]||referenced[f.id]==='zip')throw Error('HISTORICAL_JSON_NOT_REFERENCED');});
  if(Object.keys(referenced).some(function(id){return referenced[id]!=='zip'&&!entry.files.some(function(f){return f.id===id;});}))throw Error('HISTORICAL_JSON_INVENTORY_CHANGED');
  var target=journal&&journal.targetId||first.technicalFolderId||'',files=[];
  records.forEach(function(r){if(r.job.technicalFolderId&&r.job.technicalFolderId!==target)throw Error('HISTORICAL_TARGET_CONFLICT');});
  Object.keys(referenced).forEach(function(id){var meta=cdqLegacyRelocationMetaV2869_(id),kind=referenced[id],expected=entry.files.filter(function(f){return f.id===id;})[0];
   if(meta.trashed||!meta.parents||meta.parents.length!==1||[entry.folderId,target].indexOf(meta.parents[0])<0||!meta.capabilities||!meta.capabilities.canEdit)throw Error('HISTORICAL_ARTIFACT_SCOPE_CHANGED');
   if(kind==='zip'){if(meta.mimeType!=='application/zip'||!meta.md5Checksum)throw Error('HISTORICAL_ZIP_NOT_VERIFIABLE');}
   else{
    if(['text/plain','application/json'].indexOf(meta.mimeType)<0||meta.name!==expected.name||Number(meta.size)!==expected.bytes||!meta.md5Checksum)throw Error('HISTORICAL_JSON_CHANGED');
    var blob=DriveApp.getFileById(id).getBlob(),data=JSON.parse(blob.getDataAsString());
    if(data.version!==expected.version||kind==='request'&&data.clientId!==clientId||kind==='manifest'&&!Array.isArray(data.entries))throw Error('HISTORICAL_JSON_PROVENANCE_CHANGED');
    if(hashes[id]&&cdqUploadHashV2751_(blob.getBytes())!==hashes[id])throw Error('HISTORICAL_JSON_HASH_CHANGED');
   }
   files.push({id:id,kind:kind,name:meta.name,bytes:Number(meta.size),md5Checksum:meta.md5Checksum,oldParent:entry.folderId});
  });
  if(!journal){journal={version:2869,id:entry.id,status:'prepared',at:new Date().toISOString(),folderId:entry.folderId,clientId:clientId,backups:records.map(function(r){return {key:r.key,value:r.raw};}),files:files};
   if(Utilities.newBlob(JSON.stringify(journal)).getBytes().length>8000)throw Error('HISTORICAL_JOURNAL_TOO_LARGE');
   props.setProperty(key,JSON.stringify(journal));
  }else if(JSON.stringify(journal.files)!==JSON.stringify(files))throw Error('HISTORICAL_FILE_CHANGED_DURING_RELOCATION');
  if(!target){
   // Recover a folder created immediately before an interrupted checkpoint.
   var found=Drive.Files.list({q:"'"+CDQ_WS_SYSTEM_V2638_+"' in parents and trashed=false and appProperties has { key='cdqLegacyDeliveryV2866' and value='1' } and appProperties has { key='cdqJob' and value='"+entry.id+"' }",fields:'files(id),nextPageToken',pageSize:100,supportsAllDrives:true,includeItemsFromAllDrives:true});
   if(found.nextPageToken||(found.files||[]).length>1)throw Error('HISTORICAL_TARGET_AMBIGUOUS');
   if((found.files||[]).length)target=found.files[0].id;
   else{var holder={id:entry.id,clientId:clientId,folderId:entry.folderId};target=cdqLegacyTechnicalCreateV2866_(holder);}
   journal.targetId=target;props.setProperty(key,JSON.stringify(journal));
  }
  cdqLegacyTechnicalFolderV2866_({id:entry.id,clientId:clientId,technicalFolderId:target});
  files.forEach(function(file){var meta=cdqLegacyRelocationMetaV2869_(file.id);
   if(meta.md5Checksum!==file.md5Checksum||Number(meta.size)!==file.bytes||meta.parents.length!==1)throw Error('HISTORICAL_FILE_CHANGED_BEFORE_MOVE');
   if(meta.parents[0]===entry.folderId)Drive.Files.update({},file.id,null,{addParents:target,removeParents:entry.folderId,fields:'id,parents',supportsAllDrives:true});
   else if(meta.parents[0]!==target)throw Error('HISTORICAL_FILE_MOVED_EXTERNALLY');
   var after=cdqLegacyRelocationMetaV2869_(file.id);
   if(after.md5Checksum!==file.md5Checksum||Number(after.size)!==file.bytes||after.parents.length!==1||after.parents[0]!==target)throw Error('HISTORICAL_MOVE_NOT_CONFIRMED');
  });
  // IDs and mail/publication states stay unchanged; only storage reference moves.
  var updates={};records.forEach(function(r){if(props.getProperty(r.key)!==r.raw)throw Error('HISTORICAL_JOB_CHANGED_DURING_RELOCATION');r.job.technicalFolderId=target;updates[r.key]=JSON.stringify(r.job);});
  props.setProperties(updates,false);
  records.forEach(function(r){if(props.getProperty(r.key)!==updates[r.key])throw Error('HISTORICAL_REFERENCE_NOT_CONFIRMED');});
  journal.status='complete';journal.completedAt=new Date().toISOString();props.setProperty(key,JSON.stringify(journal));return journal;
 }finally{lock.releaseLock();}
}
var CDQ_LEGACY_RELOCATION_V2869_=[{"id":"683775cd-42d3-48ff-8a3e-c99246caf1ee","folderId":"1E1X0ybmc9cjcPSlxE4_kmdYm_SetCW40","files":[{"id":"1MxoZuymm6zmEQH31aqJku_2d5gMLGvIP","name":"publication.json","bytes":331,"version":2825},{"id":"19bKrvBhiL6VtG8ZmykDT59sNuozFE44q","name":"selection.json","bytes":214,"version":2826}]},{"id":"a9720dfc-c432-4237-a623-ff5aa7fa64f8","folderId":"1ICrVkXagYSqi4OSLtcPJZgR-ue_JIZgj","files":[{"id":"1wyf613T04NMqOZAoDybhEM2c7zAgfUXB","name":"publication.json","bytes":30487,"version":2825},{"id":"1iRcSlENIAg97fmcC9d0IfzdxYQOd0QpR","name":"selection.json","bytes":4530,"version":2826}]},{"id":"43f0c1f6-b981-4ae5-83a2-9a7fcb9dc7cc","folderId":"1-2Xmx3oRrdgTtq4GnBjk2SapiCMcL0xM","files":[{"id":"1c5lEEjFnlA0w3vAizQRxtGPd_re5cFKp","name":"publication.json","bytes":30487,"version":2825},{"id":"1GoxqQFmYmt-SiS7T8k6c3BeV1L5mnR1c","name":"selection.json","bytes":4530,"version":2826}]},{"id":"0bd240d1-84d8-4be5-ba33-e2d202408972","folderId":"1UG2lEWrQy7n2LDsQCPLt3OXG7CB9mn9X","files":[{"id":"1lLrG3FEFM0X72aiBzlpphOnYDZbWDCkT","name":"publication.json","bytes":28762,"version":2825},{"id":"1G8oVoOla9V_SV6SMRvuBm-9XN-rAzhLO","name":"selection.json","bytes":4296,"version":2826}]},{"id":"a18d621c-492a-475b-84e4-dd2efe800438","folderId":"1Tqh20plaR4WGmK0gN_05pgvXQ7Qw3biQ","files":[{"id":"170LxXjHxAjERU_EHXp7kF7WSr8zkbZ2f","name":"publication.json","bytes":30487,"version":2825},{"id":"1-AwEJRIGJsrKZfOZj8dAAchbP3xQOFd3","name":"selection.json","bytes":4531,"version":2826}]},{"id":"26a1b299-3245-46da-900b-b0b256c379e5","folderId":"1etdiowAUC_NyXptLAiwq-hd6PmbSIptg","files":[{"id":"1--9lueuRo_3q-psmU34UZWVQeppABp-k","name":"publication.json","bytes":30487,"version":2825},{"id":"1J8yoPHR4toUtLALWqQrHhIlWFCwmHgZB","name":"selection.json","bytes":4531,"version":2826}]},{"id":"f95f8f8e-6e05-4944-bde1-11a4d8497702","folderId":"1PGcssTAMxn3mGwsLXwzhI0Qi6a1vRsbB","files":[{"id":"1CqNLXzXYe5ZxT9UMKC3M1kG3IBLMgazW","name":"publication.json","bytes":30487,"version":2825},{"id":"1nRwFAGK2-dZqjfH2UEykbKPIYKKINLye","name":"selection.json","bytes":4531,"version":2826}]},{"id":"03410e4a-5100-402b-be0c-f95aee358e17","folderId":"1sAOlz0ikkkJPU2rt8QDr2nhkttBIPd9Y","files":[{"id":"1pGQVaqWn_6TMgIIUsgFAqEWAX5MWLx8i","name":"publication.json","bytes":11975,"version":2825}]},{"id":"27d224a5-5e3a-4eca-9a7c-d77aa6c4b94c","folderId":"1euRFjyWE1MtiVmc9mlvJemCSvkt2SxUM","files":[{"id":"1wPqLq3ii6c85qADfm_dBIbjsowghbX6t","name":"selection.json","bytes":4531,"version":2826}]}];

// Operator diagnostics intentionally omit email, messages and session keys.
function cdqLegacyRelocationStatesV2869_(id){
 var props=PropertiesService.getScriptProperties(),out=[];
 ['CDQ_SEND_QUEUE_V2826:','CDQ_DELIVERY_V2825:'].forEach(function(prefix){
  var raw=props.getProperty(prefix+id);if(!raw)return;var job=JSON.parse(raw),item={kind:prefix};
  ['version','pipelineVersion','phase','blocked','leaseUntil','nextAt','at','count','cursor','mailAttempted','completedAt','attempts'].forEach(function(k){if(job[k]!==undefined)item[k]=job[k];});out.push(item);
 });return out;
}
