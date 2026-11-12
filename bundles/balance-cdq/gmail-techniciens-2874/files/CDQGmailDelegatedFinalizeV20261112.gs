/**
 * CDQ — finalisation Gmail du technicien, seule et explicite.
 * Apps Script garde les archives/ZIP déjà préparés; jamais de GmailApp owner.
 * Aucun token utilisateur stocké, journalisé, transmis à Cloudflare ou Drive.
 * L'action est idempotente pour une seule tentative et ne rejoue pas un résultat incertain.
 */
function cdqGmailDelegatedFinalizeV20261112(clientId,jobId,oauthToken,confirmation) {
  if(confirmation!=='ENVOYER_DEPUIS_MON_COMPTE')throw Error('GMAIL_TECH_CONFIRMATION_REQUIRED');
  var actor=verifierDroit_('envoi'),email=normaliserEmailCDQ_(actor&&actor.email||''),
      client=String(clientId||''),id=String(jobId||'');
  if(!email||!/^[A-Za-z0-9_-]{10,200}$/.test(client)||!/^[a-f0-9]{32}$/.test(id))
    throw Error('INVALID_GMAIL_TECH_CONTEXT');
  var scope=cdqClientPortalScopeV20261028_(client);
  if(!scope||normaliserEmailCDQ_(scope.actor&&scope.actor.email||'')!==email)
    throw Error('SCOPE_MISMATCH');
  // This identity is verified by Google (not by the string supplied by the UI).
  var authorized=cdqGmailTechAccountV20261112_(oauthToken,email);
  if(authorized!==email)throw Error('GMAIL_TECH_ACCOUNT_MISMATCH');

  var job=cdqSpGet_(CDQ_SP_JOB_+id);
  if(!job||job.id!==id||job.clientId!==client||job.actor!==email||
     !cdqSpActionsV2866_(job).email||!job.archiveConfirmed||job.phase!=='awaiting_gmail')
    throw Error('GMAIL_TECH_JOB_NOT_READY');
  if(job.mailAttempted||job.mailSent||job.blocked)
    throw Error('GMAIL_TECH_PREVIOUS_ATTEMPT_CHECK_REQUIRED');
  if(cdqSpActionsV2866_(job).publish!==true&&job.portalConfirmed)
    throw Error('CONFLICT_DELIVERY_ACTIONS');
  if(cdqSpActionsV2866_(job).publish&&(!job.portalConfirmed||!job.visitConfirmed))
    throw Error('PORTAL_VISIT_NOT_CONFIRMED');

  var request=cdqSpReadRequest_(job),manifest=cdqSpPublication_(job);
  cdqSpCheckActionsManifestV2866_(job,manifest);
  if(!request||request.clientId!==client||!Array.isArray(request.sources)||
     request.sources.length!==job.count||!manifest.zip||
     manifest.zip.fileId!==job.zipId||manifest.zip.sha256!==job.zipHash||
     manifest.zip.size!==job.zipSize||manifest.zip.name!==job.zipName)
    throw Error('CONFLICT_GMAIL_TECH_ZIP');
  var recipient=cdqGmailTechEmailV20261112_(request.email);
  if(!recipient||recipient!==cdqSpRecipientV2866_(request.email,job))
    throw Error('INVALID_GMAIL_TECH_RECIPIENT');
  var zip=cdqSpBlob_({fileId:job.zipId,name:job.zipName,size:job.zipSize,sha256:job.zipHash});
  var text=String(request.message||'').trim()||'Bonjour,\n\nVeuillez trouver ci-joint les éléments d’étalonnage de '+
    (request.companyName||'votre entreprise')+'.\n\nMerci.';
  var prepared;
  if(cdqSpActionsV2866_(job).publish){
    var info=cdqSpPortalLink_({email:email},client,request.companyName);
    prepared=cdqEmailPortalPrepareV20261030_(text,client,'convertir',info);
    if(!prepared||prepared.linkIncluded!==true||
       !['INCLUDED','LINK_ONLY'].includes(prepared.status))
      throw Error('PORTAL_LINK_UNAVAILABLE');
  }else prepared=cdqSpMailTextV2866_(text);

  // Keep the exact former deduplication key across old/new clients and callers.
  var identities=request.sources.map(function(s,i){
    return s.fileId+':'+(s.kind==='sheet'?'modified:'+new Date(s.driveRevision).getTime():
      (s.sourceSha256||manifest.entries[i].sourceSha256))+':'+s.conversionName;
  }).sort();
  var key='CDQ_SEND_ZIP_V2823_'+cdqSpHash_(cdqSpJson_([client,recipient,identities]));
  cdqSpLegacyUncertain_(client,recipient);
  cdqSpLock_(function(){
    var fresh=cdqSpGet_(CDQ_SP_JOB_+id),receipt=cdqSpGet_(key);
    if(!fresh||fresh.actor!==email||fresh.clientId!==client||
       fresh.phase!=='awaiting_gmail'||fresh.mailAttempted||fresh.mailSent||
       fresh.blocked||!fresh.archiveConfirmed||fresh.zipHash!==job.zipHash||
       fresh.bodyHash!==job.bodyHash||fresh.requestHash!==job.requestHash)
      throw Error('CONFLICT_GMAIL_TECH_JOB');
    if(receipt&&receipt.phase==='sending'&&
       !(typeof cdqSendReviewAllowsSendKeyV20261112_==='function'&&
         cdqSendReviewAllowsSendKeyV20261112_(key)))
      throw Error('CDQ_ENVOI_A_VERIFIER');
    if(receipt&&receipt.phase==='sent'&&Date.now()-Number(receipt.at||0)<86400000&&!request.force)
      throw Error('CDQ_DOUBLE_ENVOI');
    fresh.mailAttempted=true;fresh.mailSent=false;fresh.phase='gmail_sending';
    fresh.sendKey=key;fresh.mailActor=email;fresh.mailConsentRequestedAt=Date.now();
    cdqSpSave_(fresh);
    cdqSpPut_(key,{phase:'sending',at:Date.now(),jobId:id,
      protocol:CDQ_SP_VERSION_,actor:email,recipient:recipient,transport:'gmail-user-oauth'});
  });
  var marker='Référence d’envoi CDQ : '+id,subject='Rapports d’étalonnages - '+
      (request.companyName||'Client')+' - '+job.date,reply;
  try{
    reply=cdqGmailTechSendV20261112_({accessToken:oauthToken,expectedActor:email,
      recipient:recipient,subject:subject,
      plainText:prepared.text+'\n\n'+marker,
      htmlBody:prepared.htmlBody+'<p>'+marker+'</p>',
      zipName:job.zipName,zipBlob:zip,inlineImages:prepared.inlineImages||{}});
  }catch(error){
    // No retry, including HTTP errors: transport may have accepted the message.
    cdqSpLock_(function(){
      var current=cdqSpGet_(CDQ_SP_JOB_+id);
      if(current&&current.phase==='gmail_sending'&&current.sendKey===key){
        current.blocked=true;current.error='GMAIL_TECH_RESULT_TO_VERIFY';
        cdqSpSave_(current);
      }
    });
    throw Error('GMAIL_TECH_SEND_UNCERTAIN : vérifiez les courriels envoyés depuis votre compte. Aucun renvoi automatique.');
  }
  if(!reply||reply.ok!==true||reply.sender!==email||reply.recipient!==recipient||
     !reply.gmailMessageId)throw Error('GMAIL_TECH_SEND_UNCERTAIN');
  cdqSpLock_(function(){
    var current=cdqSpGet_(CDQ_SP_JOB_+id),receipt=cdqSpGet_(key);
    if(!current||current.phase!=='gmail_sending'||current.actor!==email||
       !receipt||receipt.phase!=='sending'||receipt.jobId!==id)
      throw Error('GMAIL_TECH_RECEIPT_CONFLICT');
    cdqSpPut_(key,{phase:'sent',at:Date.now(),jobId:id,
      protocol:CDQ_SP_VERSION_,actor:email,recipient:recipient,
      messageId:reply.gmailMessageId,transport:'gmail-user-oauth'});
    current.mailSent=true;current.messageId=reply.gmailMessageId;
    current.mailConfirmedAt=Date.now();current.phase='complete';current.error='';
    current.blocked=false;current.nextAt=0;current.completedAt=Date.now();
    cdqSpSave_(current);cdqSpActive_(current,true);
  });
  return {ok:true,jobId:id,clientId:client,from:email,to:recipient,
    gmailMessageId:reply.gmailMessageId,mailSent:true,archiveDone:true,
    portalDone:!!job.portalConfirmed,noCopyToOwner:true};
}
