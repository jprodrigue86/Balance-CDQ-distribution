/* CDQ 28.93 — confirmed delivery milestones and durable notification receipts. */
(function(host){
  'use strict';
  const normalize=value=>String(value||'').trim().toLowerCase();
  const terminal=new Set(['completed','blocked','cancelled','closed']);
  const phaseLabels={preparation:'Préparation des PDF…',assemblage:'Assemblage et archivage des PDF…',publication:'Publication sur la page client…',envoi:'Envoi du courriel…',verification:'Courriel à vérifier — aucun renvoi automatique.'};
  const integer=value=>Number.isSafeInteger(value)&&value>=0&&value<=10000;
  function snapshot(result,complete=host.cdqDeliveryActionsV2866?.complete){
    if(!result||typeof result!=='object')return null;
    const known=Object.prototype.hasOwnProperty.call(result,'termine')&&integer(result.termine)&&integer(result.total)&&Number(result.total)>0;
    const total=integer(result.total)?Number(result.total):0,prepared=known?Math.min(total,Number(result.termine)):0;
    const rejected=result.deliveryStatus==='rejected'||result.errorCode==='MAIL_DELIVERY_REJECTED';
    const completed=!rejected&&typeof complete==='function'&&complete(result)===true;
    const outcome=completed?'completed':['cancelled','closed'].includes(result.status)?result.status:rejected||result.status==='blocked'?'blocked':'running';
    const actions=result.actionsV2866,modern=!!actions&&typeof actions.publish==='boolean'&&typeof actions.email==='boolean';
    const publish=modern?actions.publish:true,email=modern?actions.email:true;
    const provider=result.mailProvider||result.provider||(result.mailMode==='microsoft-server-oauth-v1'?'microsoft':'gmail');
    const service=provider==='microsoft'?'Microsoft':provider==='gmail'?'Gmail':'le service d’envoi';
    const units=total+(modern?1:0)+(publish?1:0)+(email?1:0);
    const confirmed=prepared+(modern&&result.archiveDone===true?1:0)+(publish&&result.portalDone===true&&(!modern||result.visitDone===true)?1:0)+(email&&result.mailSent===true&&!rejected?1:0);
    const globalPercent=completed?100:known&&units>0?Math.min(99,Math.floor(100*confirmed/units)):null;
    let phase=String(result.phase||'preparation');
    if(!Object.prototype.hasOwnProperty.call(phaseLabels,phase))phase='preparation';
    let detail=phaseLabels[phase];
    if(completed){phase='termine';detail=publish?(email?'PDF archivés et publiés; courriel accepté par '+service+', livraison non confirmée.':'PDF archivés et publiés. Aucun courriel demandé.'):'PDF archivés; courriel accepté par '+service+', livraison non confirmée.';}
    else if(outcome==='cancelled'){phase='annule';detail='Tâche annulée avant le courriel; fichiers conservés.';}
    else if(outcome==='closed'){phase='cloture';detail='Suivi clôturé; aucun renvoi automatique.';}
    else if(outcome==='blocked'){
      if(rejected){phase='verification';detail='Courriel accepté par '+service+' puis rejeté'+(result.deliveryErrorCode==='SMTP_550_5_7_26'?' (550 5.7.26)':'')+'. Fichiers conservés; aucun renvoi automatique.';}
      else if(result.error==='MAIL_UNCONFIRMED'||result.errorCode==='MAIL_UNCONFIRMED')detail=phaseLabels.verification;
      else if(['CDQ_ENVOI_A_VERIFIER','CDQ_REPEAT_CONFIRMATION_REQUIRED','ALREADY_SENT_REQUIRES_CONFIRMATION','SEND_ALREADY_SENT'].includes(result.errorCode))detail='Courriel non envoyé — vérifier l’envoi précédent.';
      else detail='Traitement arrêté — voir les tâches en attente.';
    }
    return {schema:2893,clientId:String(result.clientId||''),phase,prepared,total,globalPercent,detail,outcome};
  }

  function createReporter({identity,native,storage,complete}={}){
    const key=owner=>'cdqTaskNotificationReceiptsV2893|'+owner;
    const current=owner=>{const id=identity?.();return id?.authorized&&normalize(id.owner)===owner;};
    function read(owner){try{const value=JSON.parse(storage?.getItem(key(owner))||'[]');return Array.isArray(value)?value.filter(x=>x?.jobId&&x?.snapshot?.schema===2893&&terminal.has(x.snapshot.outcome)).slice(-50):[];}catch(_){return [];}}
    function save(owner,values){try{storage?.setItem(key(owner),JSON.stringify(values.slice(-50)));}catch(_){}}
    function invoke(owner,jobId,value){try{return native()?.reportTaskProgressV2893?.(owner,jobId,JSON.stringify(value))===true;}catch(_){return false;}}
    function report(owner,job,result){
      owner=normalize(owner);if(!current(owner)||!job?.id||result?.jobId!==job.id||result.clientId!==job.clientId)return false;
      const bridge=native?.();if(typeof bridge?.reportTaskProgressV2893!=='function')return false;
      const value=snapshot(result,complete);if(!value)return false;
      const accepted=invoke(owner,job.id,value);
      if(terminal.has(value.outcome)){
        const pending=read(owner).filter(x=>x.jobId!==job.id);
        if(!accepted)pending.push({jobId:job.id,snapshot:value});
        save(owner,pending);
      }
      return accepted;
    }
    function retry(){
      const id=identity?.(),owner=normalize(id?.owner);if(!id?.authorized||!owner||typeof native?.()?.reportTaskProgressV2893!=='function')return;
      const remaining=[];
      for(const item of read(owner)){if(!current(owner)||!invoke(owner,item.jobId,item.snapshot))remaining.push(item);}
      if(current(owner))save(owner,remaining);
    }
    return {report,retry};
  }
  function confirmRepeat(check,confirm){
    if(check?.doublon!==true)return {accepted:true,force:false};
    const claim=check?.sendV20261103?.plan?.repeatV2893;
    if(check?.sendV20261103?.capabilities?.repeatConfirmationProtocol!==2893||claim?.protocol!==2893||!/^CDQ_SEND_ZIP_V2823_[a-f0-9]{64}$/.test(claim.sendKey||'')||!Number.isSafeInteger(claim.confirmedAt)||claim.confirmedAt<=0||claim.confirmedAt!==check.timestamp)
      throw Error('La confirmation sécurisée du renvoi est indisponible. Aucun nouveau traitement lancé.');
    const accepted=confirm('Ces mêmes documents ont déjà été envoyés récemment à ce destinataire. Voulez-vous les envoyer de nouveau ?')===true;
    return {accepted,force:accepted};
  }
  function retainSheetDates(previous,next){
    const known=new Map(previous.map(file=>[String(file.id),file]));
    return next.map(file=>{
      const old=known.get(String(file.id)),revision=old?._cdqSheetConfirmedRevisionV2893;
      const sheet=file.type==='GOOGLE_SHEETS'||!file.type&&old?.type==='GOOGLE_SHEETS',confirmedAt=Date.parse(revision||''),incoming=Date.parse(file.dateModification||'');
      if(!sheet||!Number.isFinite(confirmedAt)||revision!==old.dateModification||Number.isFinite(incoming)&&incoming>confirmedAt)return file;
      return {...file,type:'GOOGLE_SHEETS',dateModification:revision,modifiedTime:revision,revision,_cdqSheetConfirmedRevisionV2893:revision};
    });
  }
  function repeatRejection(error){
    const code=String(error?.code||error?.message||error||'').trim();
    return ({CDQ_REPEAT_CONFIRMATION_REQUIRED:'Un envoi identique a été confirmé. Rouvrez la confirmation pour décider explicitement de le renvoyer.',INVALID_REPEAT_CONFIRMATION:'La confirmation sécurisée du renvoi est invalide. Rouvrez la confirmation; aucun nouveau traitement lancé.',CONFLICT_REPEAT_CONFIRMATION:'L’état de l’envoi précédent a changé. Vérifiez-le puis rouvrez la confirmation; aucun nouveau traitement lancé.'})[code]||'';
  }
  let reporter=null;
  const api={snapshot,confirmRepeat,repeatRejection,retainSheetDates,createReporter,configure(options){reporter=createReporter(options);},report(...args){return reporter?.report(...args)||false;},retry(){host.cdqDriveBackgroundV2746?.publish?.();reporter?.retry();}};
  host.cdqSendProgressV2893=api;
  const retry=()=>Promise.resolve().then(()=>api.retry());
  for(const event of ['cdq:access-ready','cdq:drive-ready-v2632','cdq:drive-background-idle-v2746','cdq:drive-write-idle-v2746','online'])host.addEventListener?.(event,retry);
  host.document?.addEventListener?.('visibilitychange',()=>{if(!host.document.hidden)retry();});
})(typeof window==='undefined'?globalThis:window);
