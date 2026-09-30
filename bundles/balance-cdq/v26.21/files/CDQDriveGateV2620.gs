/* Balance CDQ V26.20 — séparation stricte compte application / compte Drive.
 * Le compte Google choisi pour Drive doit avoir une permission explicite sur le
 * dossier maître (ou une permission de domaine). Les permissions "anyone" sont
 * volontairement ignorées pour l'accès depuis Balance CDQ.
 */

function cdqDriveGateMasterIdV2620_(){
  return String(CONFIG && CONFIG.MASTER_FOLDER_ID || '').trim();
}

function cdqDriveGateDomainV2620_(email){
  email=normaliserEmailCDQ_(email);
  const i=email.lastIndexOf('@');
  return i>0 ? email.slice(i+1) : '';
}

function cdqDriveGateExplicitPermissionsV2620_(){
  const id=cdqDriveGateMasterIdV2620_();
  if(!id)throw new Error('Dossier maître Drive non configuré.');
  const users={},domains={};

  function user(email,source){
    email=normaliserEmailCDQ_(email);
    if(email)users[email]=source||'permission';
  }
  function domain(value,source){
    value=String(value||'').trim().toLowerCase();
    if(value)domains[value]=source||'domaine';
  }

  const folder=DriveApp.getFolderById(id);
  try{
    const owner=folder.getOwner();
    if(owner)user(owner.getEmail(),'owner');
  }catch(_){}
  try{
    folder.getEditors().forEach(function(u){try{user(u.getEmail(),'editor');}catch(_){}});
  }catch(_){}
  try{
    folder.getViewers().forEach(function(u){try{user(u.getEmail(),'viewer');}catch(_){}});
  }catch(_){}

  // Le service avancé Drive permet de voir les permissions de domaine et les
  // permissions explicites qui ne remontent pas toujours par DriveApp.
  // "anyone" est expressément ignoré : l'application ne doit jamais considérer
  // ce partage général comme une autorisation de technicien.
  try{
    let pageToken='';
    do{
      const options={
        supportsAllDrives:true,
        fields:'nextPageToken,permissions(type,role,emailAddress,domain,deleted)',
        pageSize:100
      };
      if(pageToken)options.pageToken=pageToken;
      const page=Drive.Permissions.list(id,options)||{};
      (page.permissions||[]).forEach(function(p){
        if(!p||p.deleted===true)return;
        const type=String(p.type||'').toLowerCase();
        if(type==='user')user(p.emailAddress,'drive-user');
        else if(type==='domain')domain(p.domain,'drive-domain');
      });
      pageToken=String(page.nextPageToken||'');
    }while(pageToken);
  }catch(_){}

  return {users:users,domains:domains};
}

function cdqVerifierCompteDriveV2620_(email){
  email=normaliserEmailCDQ_(email);
  if(!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){
    return {ok:false,email:email,message:'Choisissez une adresse Google valide pour Drive.'};
  }
  const permissions=cdqDriveGateExplicitPermissionsV2620_();
  if(permissions.users[email]){
    return {ok:true,email:email,permissionSource:permissions.users[email]};
  }
  const domain=cdqDriveGateDomainV2620_(email);
  if(domain && permissions.domains[domain]){
    return {ok:true,email:email,permissionSource:permissions.domains[domain]};
  }
  return {
    ok:false,
    email:email,
    message:'Ce compte Google n’est pas autorisé à accéder aux dossiers Drive de Balance CDQ. Demandez à l’administrateur de l’ajouter au partage Workspace/Drive.'
  };
}

function verifierAccesDriveEmailCDQV2620(email){
  verifierDroit_('lecture');
  return cdqVerifierCompteDriveV2620_(email);
}

function verifierJetonDriveGoogleCDQV2620(idToken,challengeId){
  verifierDroit_('lecture');
  idToken=String(idToken||'').trim();
  challengeId=String(challengeId||'').trim();
  if(!idToken || idToken.length>6000 || !challengeId || challengeId.length>200){
    throw new Error('Connexion Google Drive invalide. Réessayez.');
  }

  const props=PropertiesService.getScriptProperties();
  const cleDefi=cleProprieteGoogleDefiCDQ_(challengeId);
  const brut=props.getProperty(cleDefi);
  if(!brut)throw new Error('La demande Google Drive a expiré. Réessayez.');
  props.deleteProperty(cleDefi);

  let defi;
  try{defi=JSON.parse(brut);}catch(_){throw new Error('La demande Google Drive est invalide. Réessayez.');}
  if(!defi || Number(defi.expiresAt||0)<Date.now() || !defi.nonce){
    throw new Error('La demande Google Drive a expiré. Réessayez.');
  }

  const response=UrlFetchApp.fetch(
    CDQ_GOOGLE_TOKENINFO_URL_+'?id_token='+encodeURIComponent(idToken),
    {method:'get',muteHttpExceptions:true,followRedirects:false}
  );
  if(response.getResponseCode()!==200)throw new Error('Google n’a pas pu confirmer ce compte Drive.');

  let payload;
  try{payload=JSON.parse(response.getContentText()||'{}');}
  catch(_){throw new Error('Réponse Google Drive invalide.');}

  const issuer=String(payload.iss||'');
  const email=normaliserEmailCDQ_(payload.email);
  const emailVerified=payload.email_verified===true || String(payload.email_verified).toLowerCase()==='true';
  const now=Math.floor(Date.now()/1000);

  if(String(payload.aud||'')!==CDQ_GOOGLE_CLIENT_ID_)throw new Error('Cette connexion Google ne correspond pas à Balance CDQ.');
  if(issuer!=='https://accounts.google.com' && issuer!=='accounts.google.com')throw new Error('Émetteur Google invalide.');
  if(Number(payload.exp||0)<=now-30)throw new Error('La connexion Google Drive a expiré. Réessayez.');
  if(!emailVerified || !email)throw new Error('Google n’a pas confirmé l’adresse du compte Drive.');
  if(String(payload.nonce||'')!==String(defi.nonce))throw new Error('La vérification Google Drive ne correspond pas à cette demande.');

  const access=cdqVerifierCompteDriveV2620_(email);
  if(!access.ok)throw new Error(access.message);
  return access;
}

function cdqDriveGateCapabilitiesV2620(){
  verifierDroit_('lecture');
  return {
    ok:true,
    version:'26.20',
    applicationLogin:'email-code-pin',
    driveGate:'explicit-google-account',
    ignoresAnyonePermission:true
  };
}
