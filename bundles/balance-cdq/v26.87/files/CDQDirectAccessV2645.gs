/* Persistent device recognition; every server session checks current user access. */
function cdqDirectSessionV2645_(u, registerDevice, verifiedInThisRequest) {
  if (!u || !u.email) throw new Error('Compte CDQ non autorisé.');
  const current = verifiedInThisRequest === true ? u : trouverUtilisateurAutoriseParEmail_(u.email);
  if (!current) throw new Error('Accès retiré par l’administrateur.');
  cdqTraceStageV2687_('session');
  if(!CDQ_BOOTSTRAP_RPC_V2687_)lierCleTemporaireCDQ_(current);
  const state = {
    autorise:true, email:current.email, role:current.role,
    jetonSession:creerSessionRpcCDQ_(current), versionBackend:CDQ_BACKEND_BUILD_,
    ouvertureDirecte:true, sessionExpiresAtV2686:Date.now()+18*60*60*1000,
    startupMaintenanceV2686:true
  };
  if (registerDevice) {
    state.jetonAppareil = creerJetonAppareilCDQ_(current);
    PropertiesService.getScriptProperties().setProperty('CDQ_DEVICE_REGISTERED_V2645_'+empreinteCDQ_(normaliserEmailCDQ_(current.email)), '1');
  }
  return typeof cdqStartupCachedV2527_ === 'function' ? cdqStartupCachedV2527_(state) : state;
}

function cdqDirectAccessV2645_(deviceToken, googleTicket) {
  const token=String(deviceToken||'').trim();
  const u=token ? lireUtilisateurDepuisJetonAppareilCDQ_(token) : null;
  if (u) return cdqDirectSessionV2645_(u,false,true);
  const ticket=String(googleTicket||'').trim();
  if (ticket) {
    const lock=LockService.getScriptLock();
    if (!lock.tryLock(15000)) throw new Error('Une connexion est en cours. Réessayez.');
    try {
      const proof=lireTicketGoogleCDQ_(ticket);
      if (!proof || !String(proof.sub||'').trim() || Number(proof.expiresAt||0)<=Date.now()) throw new Error('Confirmez votre compte Google.');
      const user=trouverUtilisateurAutoriseParEmail_(proof.email);
      if (!user) throw new Error('Ce compte n’est pas autorisé dans la gestion des utilisateurs CDQ.');
      const state=cdqDirectSessionV2645_(user,true);
      supprimerTicketGoogleCDQ_(ticket);
      return state;
    } finally { lock.releaseLock(); }
  }
  return {
    autorise:false,versionBackend:CDQ_BACKEND_BUILD_,ouvertureDirecte:true,
    connexionRequise:true,oublierJeton:!!token,emailSuggere:'',
    message:token ? 'Cet appareil n’est plus autorisé. Reconnectez votre compte CDQ.' : 'Enregistrez votre compte CDQ avec votre code d’activation à 6 chiffres. Cette étape est demandée une seule fois.'
  };
}

function cdqDirectActivateV2645_(email, code, googleTicket, deviceToken) {
  email=normaliserEmailCDQ_(email);code=String(code||'').trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Adresse courriel invalide.');
  if (!codeAccesValideCDQ_(code)) throw new Error('Le code d’activation doit contenir 6 chiffres.');
  const identity=verifierIdentiteActivationCDQ_(email,googleTicket,deviceToken);
  if (verifierBlocageConnexionCDQ_(email).bloque) throw new Error('Trop de tentatives. Attendez 10 minutes.');
  const u=trouverUtilisateurAutoriseParEmail_(email);
  if (!u || !codeDefiniUtilisateurCDQ_(u) || !verifierCodeUtilisateurCDQ_(u,code)) {
    enregistrerEchecConnexionCDQ_(email);
    throw new Error('Adresse courriel ou code d’activation incorrect.');
  }
  effacerEchecsConnexionCDQ_(email);
  revoquerSessionsUtilisateur_(email);
  consommerCodeActivationCDQ_(email);
  if (identity.type==='google') supprimerTicketGoogleCDQ_(googleTicket);
  return cdqDirectSessionV2645_(u,true);
}

function cdqDirectFinishActivationV2645_(activationToken) {
  const lock=LockService.getScriptLock();
  if (!lock.tryLock(15000)) throw new Error('Une activation est en cours. Réessayez.');
  try {
    const a=lireJetonActivationCDQ_(activationToken);
    if (!a) throw new Error('Cette activation a expiré. Demandez un nouveau code à 6 chiffres.');
    const u=trouverUtilisateurAutoriseParEmail_(a.email);
    if (!u) throw new Error('Accès retiré par l’administrateur.');
    const state=cdqDirectSessionV2645_(u,true);
    PropertiesService.getScriptProperties().deleteProperty(a.cle);
    return state;
  } finally { lock.releaseLock(); }
}

function cdqDeviceRegisteredV2645_(u) {
  return !!u && (nip4DefiniUtilisateurCDQ_(u) || PropertiesService.getScriptProperties().getProperty('CDQ_DEVICE_REGISTERED_V2645_'+empreinteCDQ_(normaliserEmailCDQ_(u.email)))==='1');
}

