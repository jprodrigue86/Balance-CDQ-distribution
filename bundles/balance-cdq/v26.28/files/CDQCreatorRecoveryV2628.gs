/** Owner-only recovery. The Google ticket is issued by verifierJetonGoogleCDQ.
 * No email-only login, shared master PIN, technician bypass or Drive permission change.
 * This private helper is reached through the existing, allowlisted activation endpoint.
 */
function cdqCreatorRecoveryV2628_(email, nip, ticketGoogle, options) {
  options = options || {};
  const action = String(options.action || '');
  if (['state', 'unlock', 'set-pin'].indexOf(action) < 0) throw new Error('Demande de récupération invalide.');
  const ticket = String(ticketGoogle || '').trim();
  if (!ticket || ticket.length > 300) throw new Error('Confirmez votre compte Google créateur pour récupérer cet appareil.');
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(15000)) throw new Error('Une vérification est en cours. Réessayez dans un instant.');
  try {
    const owner = normaliserEmailCDQ_(obtenirAdministrateurPrincipal_());
    const proof = lireTicketGoogleCDQ_(ticket);
    if (!proof || !String(proof.sub || '').trim() || Number(proof.expiresAt || 0) <= Date.now() ||
        normaliserEmailCDQ_(proof.email) !== owner || normaliserEmailCDQ_(email) !== owner) {
      throw new Error('Récupération réservée au compte Google du créateur. Reconnectez ce compte.');
    }
    let user = trouverUtilisateurAutoriseParEmail_(owner);
    if (!user || user.role !== 'admin') throw new Error('Le compte créateur ne dispose plus de cet accès.');
    const hasPin = nip4DefiniUtilisateurCDQ_(user);
    // Identity confirmation alone NEVER creates a reusable device or application session.
    if (action === 'state') return {creatorRecovery:true, email:owner, hasPin:hasPin, expiresAt:proof.expiresAt};
    nip = String(nip || '').trim();
    if (!nip4ValideCDQ_(nip)) throw new Error('Entrez exactement les 4 chiffres de votre NIP personnel.');
    const props = PropertiesService.getScriptProperties();
    const failKey = 'CDQ_CREATOR_RECOVERY_FAIL_V2628';
    if (action === 'unlock') {
      if (!hasPin) throw new Error('Choisissez d’abord votre NIP personnel.');
      let failures = {};
      try { failures = JSON.parse(props.getProperty(failKey) || '{}') || {}; } catch (_) {}
      const now = Date.now();
      if (Number(failures.blockedUntil || 0) > now) throw new Error('Trop de tentatives de NIP. Attendez 10 minutes ou utilisez NIP oublié après confirmation Google.');
      if (!verifierNip4UtilisateurCDQ_(user, nip)) {
        const count = Number(failures.expiresAt || 0) > now ? Number(failures.count || 0) + 1 : 1;
        props.setProperty(failKey, JSON.stringify({count:count, expiresAt:now+600000, blockedUntil:count>=5?now+600000:0}));
        throw new Error(count >= 5 ? 'Trop de tentatives. Récupération par NIP bloquée pendant 10 minutes.' : 'NIP incorrect. Réessayez ou utilisez NIP oublié.');
      }
    } else {
      if (String(options.confirmation || '').trim() !== nip) throw new Error('Les deux NIP ne correspondent pas.');
      if (hasPin && options.confirmReset !== true) throw new Error('Confirmez explicitement le remplacement de votre NIP.');
      // The verified owner explicitly chose a new PIN. No other user's PIN is touched.
      sauvegarderNip4UtilisateurCDQ_(owner, nip);
      revoquerSessionsUtilisateur_(owner);
      consommerCodeActivationCDQ_(owner);
      user = trouverUtilisateurAutoriseParEmail_(owner);
    }
    // The script lock makes ticket consumption atomic across concurrent requests.
    supprimerTicketGoogleCDQ_(ticket);
    props.deleteProperty(failKey);
    effacerEchecsConnexionCDQ_(owner);
    const device = creerJetonAppareilCDQ_(user);
    const session = creerSessionRpcCDQ_(user);
    props.setProperty('CDQ_CREATOR_RECOVERY_LAST_V2628', JSON.stringify({at:Date.now(), action:action}));
    return {autorise:true, email:owner, role:user.role, jetonAppareil:device, jetonSession:session, nipConfigure:true, creatorRecovered:true};
  } finally { lock.releaseLock(); }
}
