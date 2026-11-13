// CDQ_PACKAGE_BUILD: 2026.10.02-v26.38-workspace-authorized-pdfs
const CONFIG = {
  MASTER_FOLDER_ID: '1cU0ekKqfuf9nOytUsnH1Mbljx8gWWe77',
  DESTINATAIRE: 'jp.rodrigue86@gmail.com',
  NOM_EXPEDITEUR: 'Conversion PDF',
  FORMAT_PAPIER: 'tabloid',
  PORTRAIT: true,

  // Cache serveur. Le cache Android persistant est géré dans Selector.html.
  CACHE_COMPAGNIES_SECONDES: 21600, // jusqu'à 6 h
  CACHE_CLIENT_SECONDES: 21600,     // jusqu'à 6 h
  CACHE_CLIENT_MAX_CARACTERES: 90000
};



/* =====================================================
   TEMPLATE PROTÉGÉ — BALANCE INTERMÉDIAIRE
   Original maître conservé dans _CDQ_SYSTEME.
   Le bouton ne travaille JAMAIS sur l'original : makeCopy() uniquement.
===================================================== */
const CDQ_TEMPLATE_BALANCE_INTERMEDIAIRE_ID_ = '1Eyji-xHX69Wa0EQTx0nx-D8KEmfY_hhB';
const CDQ_TEMPLATE_BALANCE_INTERMEDIAIRE_NOM_ = 'Balance de plancher.pdf';
const CDQ_MODELES_INTERMEDIAIRES_ = Object.freeze({
  plancher: {id:CDQ_TEMPLATE_BALANCE_INTERMEDIAIRE_ID_, nom:'Balance de plancher.pdf'},
  cuve4: {id:'1_9QwH264J6BeayiSbm2GYhq2VQaialVS', nom:'Balance Quvre 4.pdf'},
  precision: {id:'1vKstCL2GenfmiHLx4pb9rvcA3AYAfd8M',nom:'Balance de précision.pdf'},
  camion: {id:'1bzyDe-owGSZMdnWtXLhIi7Ep7GKjiNxd',nom:'Balance à camion.pdf'},
  cuve3: {id:'1k9f9I81LM1o4JTJ1FxZ5gzDJxs4lQU09', nom:'Balance de cuve 3 points.pdf'}
});
function obtenirModeleIntermediaireCDQ_(modeleId) {
  // Les anciennes interfaces sans sous-type continuent d'utiliser le plancher.
  const cle = modeleId == null || modeleId === '' ? 'plancher' : String(modeleId);
  if (!Object.prototype.hasOwnProperty.call(CDQ_MODELES_INTERMEDIAIRES_, cle)) {
    throw new Error('Choisissez un modèle de balance valide.');
  }
  return {cle:cle, id:CDQ_MODELES_INTERMEDIAIRES_[cle].id, nom:CDQ_MODELES_INTERMEDIAIRES_[cle].nom};
}

const CDQ_BACKEND_BUILD_ = '2026.11.02-v28.34-tracking-recovery';


/* =====================================================
   SECURITE STABLE V3
   - Code d'activation à 6 chiffres : UNE SEULE UTILISATION
   - Après activation : création obligatoire d'un NIP à 4 chiffres
   - PC : NIP requis à chaque ouverture de l'application
   - Android/PWA : biométrie locale, puis NIP après 3 échecs
   - Sessions serveur temporaires + jeton appareil révocable
===================================================== */

const CDQ_PIN_VERSION_ = 2;              // code d'activation 6 chiffres
const CDQ_NIP4_VERSION_ = 1;
const CDQ_PIN_ITERATIONS_ = 1200;
const CDQ_NIP4_ITERATIONS_ = 1800;
const CDQ_SESSION_TEMP_JOURS_ = 35;
const CDQ_SESSION_APPAREIL_JOURS_ = 180;
const CDQ_ACTIVATION_MINUTES_ = 30;
const CDQ_MAX_ECHECS_PIN_ = 5;
const CDQ_BLOCAGE_PIN_SECONDES_ = 600;
const CDQ_SESSION_RPC_HEURES_ = 18;

// Google Identity Services — V21.42
// Le client ID est public. Aucun secret client n'est utilisé par la PWA.
const CDQ_GOOGLE_CLIENT_ID_ = '764508884818-u4qnjmflg2bbht0e8ja22m8blrbm8nmk.apps.googleusercontent.com';
const CDQ_GOOGLE_DEFI_MINUTES_ = 5;
const CDQ_GOOGLE_TICKET_MINUTES_ = 15;
const CDQ_GOOGLE_TOKENINFO_URL_ = 'https://oauth2.googleapis.com/tokeninfo';


function normaliserEmailCDQ_(email) {
  return String(email || '').trim().toLowerCase();
}

function obtenirUtilisateurCourant_() {
  // Dans une Web App "exécuter en tant que moi", Google peut volontairement
  // masquer l'adresse des autres utilisateurs. On ne dépend donc PAS de cette
  // valeur pour les techniciens. Elle reste utile lorsque Google l'expose.
  try {
    return normaliserEmailCDQ_(Session.getActiveUser().getEmail());
  } catch (e) {
    return '';
  }
}

function obtenirAdministrateurPrincipal_() {
  return 'jp.rodrigue86@gmail.com';
}

function empreinteCDQ_(valeur) {
  const octets = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    String(valeur || ''),
    Utilities.Charset.UTF_8
  );
  return octets.map(function(b) {
    const n = (b + 256) % 256;
    return ('0' + n.toString(16)).slice(-2);
  }).join('');
}

function hashCodeAccesCDQ_(code, sel) {
  let valeur = String(sel || '') + '|' + String(code || '');
  for (let i = 0; i < CDQ_PIN_ITERATIONS_; i++) {
    valeur = empreinteCDQ_(valeur + '|' + i);
  }
  return valeur;
}

function codeAccesValideCDQ_(code) {
  return /^\d{6}$/.test(String(code || '').trim());
}

function genererCodeAccesCDQ_() {
  // 6 chiffres, comme le flux déjà présenté aux techniciens.
  return String(Math.floor(100000 + Math.random() * 900000));
}

function genererSelCDQ_() {
  return Utilities.getUuid() + '-' + Utilities.getUuid();
}

function obtenirCleTemporaireUtilisateur_() {
  try {
    return String(Session.getTemporaryActiveUserKey() || '').trim();
  } catch (e) {
    return '';
  }
}

function cleProprieteGoogleDefiCDQ_(challengeId) {
  return 'CDQ_GOOGLE_DEFI_V1_' + empreinteCDQ_(String(challengeId || '')).slice(0, 48);
}

function cleProprieteGoogleTicketCDQ_(ticket) {
  return 'CDQ_GOOGLE_TICKET_V1_' + empreinteCDQ_(String(ticket || '')).slice(0, 48);
}

function creerDefiConnexionGoogleCDQ() {
  nettoyerSessionsExpireesCDQ_();
  const props = PropertiesService.getScriptProperties();
  const challengeId = Utilities.getUuid() + '-' + Utilities.getUuid();
  const nonce = empreinteCDQ_(Utilities.getUuid() + '|' + Utilities.getUuid() + '|' + Date.now());
  const maintenant = Date.now();
  props.setProperty(
    cleProprieteGoogleDefiCDQ_(challengeId),
    JSON.stringify({
      nonce: nonce,
      createdAt: maintenant,
      expiresAt: maintenant + CDQ_GOOGLE_DEFI_MINUTES_ * 60 * 1000
    })
  );
  return {
    challengeId: challengeId,
    nonce: nonce,
    clientId: CDQ_GOOGLE_CLIENT_ID_,
    expiresAt: maintenant + CDQ_GOOGLE_DEFI_MINUTES_ * 60 * 1000
  };
}

function lireTicketGoogleCDQ_(ticket) {
  ticket = String(ticket || '').trim();
  if (!ticket) return null;
  const props = PropertiesService.getScriptProperties();
  const cle = cleProprieteGoogleTicketCDQ_(ticket);
  const brut = props.getProperty(cle);
  if (!brut) return null;
  try {
    const x = JSON.parse(brut);
    if (!x || Number(x.expiresAt || 0) < Date.now()) {
      props.deleteProperty(cle);
      return null;
    }
    const u = trouverUtilisateurAutoriseParEmail_(x.email);
    if (!u) {
      props.deleteProperty(cle);
      return null;
    }
    return {
      cle: cle,
      ticket: ticket,
      email: u.email,
      role: u.role,
      sub: String(x.sub || ''),
      expiresAt: Number(x.expiresAt || 0)
    };
  } catch (e) {
    props.deleteProperty(cle);
    return null;
  }
}

function supprimerTicketGoogleCDQ_(ticket) {
  ticket = String(ticket || '').trim();
  if (!ticket) return;
  PropertiesService.getScriptProperties().deleteProperty(cleProprieteGoogleTicketCDQ_(ticket));
}

function verifierJetonGoogleCDQ(idToken, challengeId) {
  idToken = String(idToken || '').trim();
  challengeId = String(challengeId || '').trim();
  if (!idToken || idToken.length > 6000 || !challengeId || challengeId.length > 200) {
    throw new Error('Connexion Google invalide. Réessayez.');
  }

  const props = PropertiesService.getScriptProperties();
  const cleDefi = cleProprieteGoogleDefiCDQ_(challengeId);
  const brut = props.getProperty(cleDefi);
  if (!brut) throw new Error('La demande Google a expiré. Réessayez.');
  props.deleteProperty(cleDefi);

  let defi;
  try { defi = JSON.parse(brut); }
  catch (e) { throw new Error('La demande Google est invalide. Réessayez.'); }
  if (!defi || Number(defi.expiresAt || 0) < Date.now() || !defi.nonce) {
    throw new Error('La demande Google a expiré. Réessayez.');
  }

  const response = UrlFetchApp.fetch(
    CDQ_GOOGLE_TOKENINFO_URL_ + '?id_token=' + encodeURIComponent(idToken),
    {method:'get', muteHttpExceptions:true, followRedirects:false}
  );
  if (response.getResponseCode() !== 200) {
    throw new Error('Google n’a pas pu confirmer cette identité. Réessayez.');
  }

  let payload;
  try { payload = JSON.parse(response.getContentText() || '{}'); }
  catch (e) { throw new Error('Réponse Google invalide. Réessayez.'); }

  const maintenantSec = Math.floor(Date.now() / 1000);
  const issuer = String(payload.iss || '');
  const email = normaliserEmailCDQ_(payload.email);
  const emailVerified = payload.email_verified === true || String(payload.email_verified).toLowerCase() === 'true';

  if (String(payload.aud || '') !== CDQ_GOOGLE_CLIENT_ID_) {
    throw new Error('Cette connexion Google ne correspond pas à Balance CDQ.');
  }
  if (issuer !== 'https://accounts.google.com' && issuer !== 'accounts.google.com') {
    throw new Error('Émetteur Google invalide.');
  }
  if (Number(payload.exp || 0) <= maintenantSec - 30) {
    throw new Error('La connexion Google a expiré. Réessayez.');
  }
  if (!emailVerified || !email) {
    throw new Error('Google n’a pas confirmé l’adresse courriel.');
  }
  if (String(payload.nonce || '') !== String(defi.nonce)) {
    throw new Error('La vérification Google ne correspond pas à cette ouverture de CDQ.');
  }

  const u = trouverUtilisateurAutoriseParEmail_(email);
  if (!u) {
    throw new Error('Ce compte Google n’est pas autorisé dans Balance CDQ.');
  }

  const ticket = Utilities.getUuid() + '-' + Utilities.getUuid() + '-' + Utilities.getUuid();
  const expiresAt = Date.now() + CDQ_GOOGLE_TICKET_MINUTES_ * 60 * 1000;
  props.setProperty(
    cleProprieteGoogleTicketCDQ_(ticket),
    JSON.stringify({
      email: u.email,
      role: u.role,
      sub: String(payload.sub || ''),
      createdAt: Date.now(),
      expiresAt: expiresAt
    })
  );

  return {
    ok: true,
    ticket: ticket,
    email: u.email,
    role: u.role,
    nipConfigure: nip4DefiniUtilisateurCDQ_(u),
    expiresAt: expiresAt
  };
}

function verifierIdentiteActivationCDQ_(email, ticketGoogle, jetonAppareil) {
  email = normaliserEmailCDQ_(email);
  const utilisateur = trouverUtilisateurAutoriseParEmail_(email);
  if (!utilisateur) {
    throw new Error('Cette adresse courriel n’est pas autorisée à utiliser Balance CDQ.');
  }

  const appareil = lireUtilisateurDepuisJetonAppareilCDQ_(String(jetonAppareil || '').trim());
  if (appareil && appareil.email === email) return {type:'appareil', identite:appareil};

  // V26.19 : la Gestion des utilisateurs + le code d’activation sont la
  // preuve d’accès à l’application. Google est réservé à Drive/Sheets/PDF.
  return {type:'gestion-utilisateurs', identite:utilisateur};
}

function cleProprieteTemporaireCDQ_(cleTemporaire) {
  return 'CDQ_AUTH_TEMP_V2_' + empreinteCDQ_(cleTemporaire).slice(0, 48);
}

function cleProprieteAppareilCDQ_(jeton) {
  return 'CDQ_AUTH_DEVICE_V2_' + empreinteCDQ_(jeton).slice(0, 48);
}

function normaliserEnregistrementUtilisateurCDQ_(item, emailForce) {
  if (typeof item === 'string') item = { email: item };
  if (!item || typeof item !== 'object') item = {};

  const email = normaliserEmailCDQ_(
    emailForce || item.email || item.courriel || item.mail || item.adresse || item.emailAddress
  );
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;

  return {
    email: email,
    role: normaliserRoleCDQ_(item.role || item.type || item.niveau || 'technicien'),
    pinSalt: String(item.pinSalt || item.codeSalt || ''),
    pinHash: String(item.pinHash || item.codeHash || ''),
    pinVersion: Number(item.pinVersion || item.codeVersion || 0) || 0,
    nip4Salt: String(item.nip4Salt || item.nipSalt || ''),
    nip4Hash: String(item.nip4Hash || item.nipHash || ''),
    nip4Version: Number(item.nip4Version || item.nipVersion || 0) || 0
  };
}

function obtenirSecuriteAdminCDQ_() {
  const props = PropertiesService.getScriptProperties();
  const brut = props.getProperty('CDQ_ADMIN_SECURITY_V2');
  if (!brut) return { pinSalt: '', pinHash: '', pinVersion: 0, nip4Salt:'', nip4Hash:'', nip4Version:0 };
  try {
    const x = JSON.parse(brut) || {};
    return {
      pinSalt: String(x.pinSalt || ''),
      pinHash: String(x.pinHash || ''),
      pinVersion: Number(x.pinVersion || 0) || 0,
      nip4Salt: String(x.nip4Salt || ''),
      nip4Hash: String(x.nip4Hash || ''),
      nip4Version: Number(x.nip4Version || 0) || 0
    };
  } catch (e) {
    return { pinSalt: '', pinHash: '', pinVersion: 0, nip4Salt:'', nip4Hash:'', nip4Version:0 };
  }
}

function sauvegarderSecuriteAdminCDQ_(u) {
  const props = PropertiesService.getScriptProperties();
  props.setProperty('CDQ_ADMIN_SECURITY_V2', JSON.stringify({
    pinSalt: String(u.pinSalt || ''),
    pinHash: String(u.pinHash || ''),
    pinVersion: Number(u.pinVersion || 0) || 0,
    nip4Salt: String(u.nip4Salt || ''),
    nip4Hash: String(u.nip4Hash || ''),
    nip4Version: Number(u.nip4Version || 0) || 0
  }));
}

function normaliserUtilisateursAutorisesCDQ_(source) {
  const admin = obtenirAdministrateurPrincipal_();
  const resultat = [];
  const vus = {};

  function ajouter(item, emailForce) {
    const u = normaliserEnregistrementUtilisateurCDQ_(item, emailForce);
    if (!u || u.email === admin || vus[u.email]) return;
    vus[u.email] = true;
    resultat.push(u);
  }

  if (Array.isArray(source)) {
    source.forEach(function(item) { ajouter(item); });
  } else if (source && typeof source === 'object') {
    Object.keys(source).forEach(function(cle) {
      const valeur = source[cle];
      if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cle)) ajouter(valeur, cle);
      else ajouter(valeur);
    });
  } else if (typeof source === 'string') {
    source.split(/[;,\n\r]+/).map(function(x){ return x.trim(); }).filter(Boolean)
      .forEach(function(email){ ajouter({ email: email, role: 'technicien' }); });
  }

  resultat.sort(function(a,b){ return a.email.localeCompare(b.email); });
  return resultat;
}

function lireUtilisateursStockesCDQ_() {
  const brut = PropertiesService.getScriptProperties().getProperty('UTILISATEURS_AUTORISES');
  if (!brut) return [];
  try { return normaliserUtilisateursAutorisesCDQ_(JSON.parse(brut)); }
  catch (e) { return normaliserUtilisateursAutorisesCDQ_(brut); }
}

function sauvegarderUtilisateursStockesCDQ_(utilisateurs) {
  const propres = normaliserUtilisateursAutorisesCDQ_(utilisateurs).map(function(u){
    return {
      email: u.email,
      role: u.role,
      pinSalt: u.pinSalt || '',
      pinHash: u.pinHash || '',
      pinVersion: Number(u.pinVersion || 0) || 0,
      nip4Salt: u.nip4Salt || '',
      nip4Hash: u.nip4Hash || '',
      nip4Version: Number(u.nip4Version || 0) || 0
    };
  });
  PropertiesService.getScriptProperties()
    .setProperty('UTILISATEURS_AUTORISES', JSON.stringify(propres));
  return propres;
}

function obtenirUtilisateursAutorises_() {
  cdqEnsureWorkspaceAdminV2626_();
  const admin = obtenirAdministrateurPrincipal_();
  const securiteAdmin = obtenirSecuriteAdminCDQ_();
  const liste = lireUtilisateursStockesCDQ_();
  return [{
    email: admin,
    role: 'admin',
    pinSalt: securiteAdmin.pinSalt,
    pinHash: securiteAdmin.pinHash,
    pinVersion: securiteAdmin.pinVersion,
    nip4Salt: securiteAdmin.nip4Salt,
    nip4Hash: securiteAdmin.nip4Hash,
    nip4Version: securiteAdmin.nip4Version
  }].concat(liste);
}

function trouverUtilisateurAutoriseParEmail_(email) {
  email = normaliserEmailCDQ_(email);
  if (!email) return null;
  cdqEnsureWorkspaceAdminV2626_();
  // Read only the record needed for this account; no cross-request role cache.
  if(email===obtenirAdministrateurPrincipal_())return Object.assign({email:email,role:'admin'},obtenirSecuriteAdminCDQ_());
  return lireUtilisateursStockesCDQ_().find(function(x){return x.email===email;})||null;
}

function codeDefiniUtilisateurCDQ_(u) {
  return !!(u && u.pinSalt && u.pinHash && Number(u.pinVersion || 0) >= CDQ_PIN_VERSION_);
}

function definirNouveauCodeUtilisateurCDQ_(email) {
  email = normaliserEmailCDQ_(email);
  const admin = obtenirAdministrateurPrincipal_();
  const code = genererCodeAccesCDQ_();
  const sel = genererSelCDQ_();
  const hash = hashCodeAccesCDQ_(code, sel);

  if (email === admin) {
    sauvegarderSecuriteAdminCDQ_({
      pinSalt: sel, pinHash: hash, pinVersion: CDQ_PIN_VERSION_,
      nip4Salt:'', nip4Hash:'', nip4Version:0
    });
    return code;
  }

  const utilisateurs = lireUtilisateursStockesCDQ_();
  const u = utilisateurs.find(function(x){ return x.email === email; });
  if (!u) throw new Error('Utilisateur introuvable.');
  u.pinSalt = sel;
  u.pinHash = hash;
  u.pinVersion = CDQ_PIN_VERSION_;
  u.nip4Salt = '';
  u.nip4Hash = '';
  u.nip4Version = 0;
  sauvegarderUtilisateursStockesCDQ_(utilisateurs);
  return code;
}

function verifierCodeUtilisateurCDQ_(u, code) {
  if (!codeDefiniUtilisateurCDQ_(u) || !codeAccesValideCDQ_(code)) return false;
  return hashCodeAccesCDQ_(String(code).trim(), u.pinSalt) === u.pinHash;
}


function nip4ValideCDQ_(nip) {
  return /^\d{4}$/.test(String(nip || '').trim());
}

function hashNip4CDQ_(nip, sel) {
  let valeur = String(sel || '') + '|NIP4|' + String(nip || '');
  for (let i = 0; i < CDQ_NIP4_ITERATIONS_; i++) {
    valeur = empreinteCDQ_(valeur + '|' + i);
  }
  return valeur;
}

function nip4DefiniUtilisateurCDQ_(u) {
  return !!(u && u.nip4Salt && u.nip4Hash && Number(u.nip4Version || 0) >= CDQ_NIP4_VERSION_);
}

function verifierNip4UtilisateurCDQ_(u, nip) {
  if (!nip4DefiniUtilisateurCDQ_(u) || !nip4ValideCDQ_(nip)) return false;
  return hashNip4CDQ_(String(nip).trim(), u.nip4Salt) === u.nip4Hash;
}

function sauvegarderNip4UtilisateurCDQ_(email, nip) {
  email = normaliserEmailCDQ_(email);
  if (!nip4ValideCDQ_(nip)) throw new Error('Le NIP doit contenir exactement 4 chiffres.');

  const sel = genererSelCDQ_();
  const hash = hashNip4CDQ_(nip, sel);
  const admin = obtenirAdministrateurPrincipal_();

  if (email === admin) {
    const actuel = obtenirSecuriteAdminCDQ_();
    actuel.nip4Salt = sel;
    actuel.nip4Hash = hash;
    actuel.nip4Version = CDQ_NIP4_VERSION_;
    sauvegarderSecuriteAdminCDQ_(actuel);
    return true;
  }

  const utilisateurs = lireUtilisateursStockesCDQ_();
  const u = utilisateurs.find(function(x){ return x.email === email; });
  if (!u) throw new Error('Utilisateur introuvable.');
  u.nip4Salt = sel;
  u.nip4Hash = hash;
  u.nip4Version = CDQ_NIP4_VERSION_;
  sauvegarderUtilisateursStockesCDQ_(utilisateurs);
  return true;
}

function consommerCodeActivationCDQ_(email) {
  email = normaliserEmailCDQ_(email);
  const admin = obtenirAdministrateurPrincipal_();

  if (email === admin) {
    const actuel = obtenirSecuriteAdminCDQ_();
    actuel.pinSalt = '';
    actuel.pinHash = '';
    actuel.pinVersion = 0;
    sauvegarderSecuriteAdminCDQ_(actuel);
    return true;
  }

  const utilisateurs = lireUtilisateursStockesCDQ_();
  const u = utilisateurs.find(function(x){ return x.email === email; });
  if (!u) throw new Error('Utilisateur introuvable.');
  u.pinSalt = '';
  u.pinHash = '';
  u.pinVersion = 0;
  sauvegarderUtilisateursStockesCDQ_(utilisateurs);
  return true;
}

function cleProprieteActivationCDQ_(jeton) {
  return 'CDQ_AUTH_ACTIVATION_V3_' + empreinteCDQ_(String(jeton || '')).slice(0,48);
}

function creerJetonActivationCDQ_(utilisateur) {
  const jeton = Utilities.getUuid() + '-' + Utilities.getUuid();
  const maintenant = Date.now();
  PropertiesService.getScriptProperties().setProperty(
    cleProprieteActivationCDQ_(jeton),
    JSON.stringify({
      email: normaliserEmailCDQ_(utilisateur.email),
      createdAt: maintenant,
      authSource: 'gestion-utilisateurs',
      expiresAt: maintenant + CDQ_ACTIVATION_MINUTES_ * 60 * 1000
    })
  );
  return jeton;
}

function lireJetonActivationCDQ_(jeton) {
  jeton = String(jeton || '').trim();
  if (!jeton) return null;
  const props = PropertiesService.getScriptProperties();
  const cle = cleProprieteActivationCDQ_(jeton);
  const brut = props.getProperty(cle);
  if (!brut) return null;
  try {
    const x = JSON.parse(brut);
    if (!x || Number(x.expiresAt || 0) < Date.now()) {
      props.deleteProperty(cle);
      return null;
    }
    // V26.21 : le jeton d’activation appartient au courriel CDQ autorisé,
    // jamais à une session Google. Google reste réservé à Drive/Sheets/PDF.
    return { cle:cle, email:normaliserEmailCDQ_(x.email), expiresAt:Number(x.expiresAt||0) };
  } catch(e) {
    props.deleteProperty(cle);
    return null;
  }
}

// Reprise d'une activation interrompue : le ticket expire après 30 minutes.
// Il ne donne pas accès aux dossiers et ne contient jamais le NIP.
function reprendreActivationCDQ(jetonActivation) {
  return cdqDirectFinishActivationV2645_(jetonActivation);
}


/* =====================================================
   SESSION RPC V21.58
   Le déploiement Apps Script s'exécute comme propriétaire et peut être
   ouvert anonymement par la PWA. Dans ce mode, getTemporaryActiveUserKey()
   peut être vide pour un technicien. La session applicative ne doit donc
   plus dépendre de cette clé Google.

   Un jeton de session COURTE DURÉE est créé uniquement après un NIP ou une
   biométrie valides. Il reste en mémoire dans le Selector et accompagne les
   appels serveur après déverrouillage. Le jeton appareil permanent, lui,
   ne suffit jamais à autoriser une opération.
===================================================== */
let CDQ_ACCES_RPC_COURANT_ = null;

function cleProprieteSessionRpcCDQ_(jeton) {
  return 'CDQ_AUTH_RPC_V1_' + empreinteCDQ_(String(jeton || '')).slice(0, 48);
}

function creerSessionRpcCDQ_(utilisateur) {
  if (!utilisateur || !utilisateur.email) throw new Error('Utilisateur de session invalide.');
  const jeton = Utilities.getUuid() + '-' + Utilities.getUuid() + '-' + Utilities.getUuid();
  const maintenant = Date.now();
  PropertiesService.getScriptProperties().setProperty(
    cleProprieteSessionRpcCDQ_(jeton),
    JSON.stringify({
      email: normaliserEmailCDQ_(utilisateur.email),
      createdAt: maintenant,
      lastSeen: maintenant,
      expiresAt: maintenant + CDQ_SESSION_RPC_HEURES_ * 60 * 60 * 1000
    })
  );
  return jeton;
}

function lireUtilisateurDepuisSessionRpcCDQ_(jeton) {
  jeton = String(jeton || '').trim();
  if (!jeton) return null;
  const props = PropertiesService.getScriptProperties();
  const cle = cleProprieteSessionRpcCDQ_(jeton);
  const brut = props.getProperty(cle);
  if (!brut) return null;
  try {
    const session = JSON.parse(brut);
    if (!session || Number(session.expiresAt || 0) < Date.now()) {
      props.deleteProperty(cle);
      return null;
    }
    const u = trouverUtilisateurAutoriseParEmail_(session.email);
    if (!u) {
      props.deleteProperty(cle);
      return null;
    }
    const seenNowV2687=Date.now();
    if(seenNowV2687-Number(session.lastSeen||0)>=15*60*1000){
      session.lastSeen=seenNowV2687;props.setProperty(cle,JSON.stringify(session));
    }
    return u;
  } catch(e) {
    props.deleteProperty(cle);
    return null;
  }
}

function supprimerSessionRpcCDQ_(jeton) {
  jeton = String(jeton || '').trim();
  if (jeton) PropertiesService.getScriptProperties().deleteProperty(cleProprieteSessionRpcCDQ_(jeton));
}

// Point d'entrée unique pour les appels applicatifs après déverrouillage.
// Les fonctions privées (suffixe _) et les fonctions d'authentification sont
// volontairement refusées ici.
function cdqRpcLegacyV2687_(nomFonction, args, jetonSession) {
  nomFonction = String(nomFonction || '').trim();
  if (!/^[A-Za-z_$][A-Za-z0-9_$]{0,90}$/.test(nomFonction) || /_$/.test(nomFonction)) {
    throw new Error('Appel serveur non autorisé.');
  }
  const interdits = {
    cdqRpc:true, doGet:true,
    creerDefiConnexionGoogleCDQ:true,
    verifierJetonGoogleCDQ:true,
    connecterAvecCodeAcces:true,
    definirNip4ApresActivation:true,
    deverrouillerAvecNip:true,
    restaurerSessionApresBiometrie:true,
    reprendreSessionCourteCDQV2524:true,
    obtenirEtatAcces:true,
    reprendreActivationCDQ:true
  };
  if (interdits[nomFonction]) throw new Error('Appel de connexion non autorisé par cette route.');

  const u = lireUtilisateurDepuisSessionRpcCDQ_(jetonSession);
  if (!u) throw new Error('SESSION EXPIRÉE : reconnectez votre compte CDQ autorisé.');

  cdqTraceStageV2687_('drive');
  cdqTraceStageV2687_('drive');
  cdqTraceStageV2687_('drive');
  cdqTraceStageV2687_('drive');
  cdqTraceStageV2687_('drive');
  cdqTraceStageV2687_('drive');
  const drivePermission = cdqWsRpcPermissionV2638_(nomFonction, u.email);
  const fn = globalThis[nomFonction];
  if (typeof fn !== 'function') throw new Error('Fonction serveur introuvable : ' + nomFonction);

  const precedent = CDQ_ACCES_RPC_COURANT_;
  const precedentDrive = CDQ_WS_RPC_PERMISSION_V2638_;
  CDQ_WS_RPC_PERMISSION_V2638_ = drivePermission;
  CDQ_ACCES_RPC_COURANT_ = { email:u.email, role:u.role, verifiedUserV2686:u, sessionKeyV2751:cleProprieteSessionRpcCDQ_(jetonSession) };
  // A one-use proof for the initial save access check, bound to this exact RPC context.
  if (nomFonction === 'cdqReportEngineV2754' && Array.isArray(args) && args[0] === 'save')
    CDQ_ACCES_RPC_COURANT_.initialDriveProofV2815 = { context:CDQ_ACCES_RPC_COURANT_, permission:drivePermission, email:u.email, sessionKey:CDQ_ACCES_RPC_COURANT_.sessionKeyV2751 };
  try {
    cdqTraceStageV2687_('function');
    cdqTraceStageV2687_('function');
    cdqTraceStageV2687_('function');
    cdqTraceStageV2687_('function');
    cdqTraceStageV2687_('function');
    cdqTraceStageV2687_('function');
    return fn.apply(null, Array.isArray(args) ? args : []);
  } finally {
    CDQ_ACCES_RPC_COURANT_ = precedent;
    CDQ_WS_RPC_PERMISSION_V2638_ = precedentDrive;
    if (nomFonction === 'deconnecterAppareil') supprimerSessionRpcCDQ_(jetonSession);
  }
}

function effacerSessionTemporaireCouranteCDQ_() {
  const cleTemp = obtenirCleTemporaireUtilisateur_();
  if (!cleTemp) return;
  PropertiesService.getScriptProperties().deleteProperty(cleProprieteTemporaireCDQ_(cleTemp));
}

function nettoyerSessionsExpireesCDQ_() {
  const props = PropertiesService.getScriptProperties();
  const toutes = props.getProperties();
  const maintenant = Date.now();
  Object.keys(toutes).forEach(function(cle){
    if (
      cle.indexOf('CDQ_AUTH_TEMP_V2_') !== 0 &&
      cle.indexOf('CDQ_AUTH_DEVICE_V2_') !== 0 &&
      cle.indexOf('CDQ_AUTH_ACTIVATION_V3_') !== 0 &&
      cle.indexOf('CDQ_AUTH_RPC_V1_') !== 0 &&
      cle.indexOf('CDQ_GOOGLE_DEFI_V1_') !== 0 &&
      cle.indexOf('CDQ_GOOGLE_TICKET_V1_') !== 0
    ) return;
    try {
      const session = JSON.parse(toutes[cle]);
      if (!session || Number(session.expiresAt || 0) < maintenant) props.deleteProperty(cle);
    } catch(e) { props.deleteProperty(cle); }
  });
}

function revoquerSessionsUtilisateur_(email, options) {
  email = normaliserEmailCDQ_(email);
  if (!email) return;
  options = options || {};
  const preserverTicketsGoogle = !!options.preserverTicketsGoogle;
  const props = PropertiesService.getScriptProperties();
  const toutes = props.getProperties();
  Object.keys(toutes).forEach(function(cle){
    const estTicketGoogle = cle.indexOf('CDQ_GOOGLE_TICKET_V1_') === 0;
    if (
      cle.indexOf('CDQ_AUTH_TEMP_V2_') !== 0 &&
      cle.indexOf('CDQ_AUTH_DEVICE_V2_') !== 0 &&
      cle.indexOf('CDQ_AUTH_ACTIVATION_V3_') !== 0 &&
      cle.indexOf('CDQ_AUTH_RPC_V1_') !== 0 &&
      !estTicketGoogle
    ) return;
    // Lorsqu'un administrateur génère une nouvelle clé pendant que le technicien
    // est déjà sur l'écran d'activation, garder son ticket Google de 15 minutes.
    // Sinon la clé toute neuve devient immédiatement inutilisable et l'écran
    // répond "Reconnectez-vous avec votre compte Google" en boucle.
    if (preserverTicketsGoogle && estTicketGoogle) return;
    try {
      const session = JSON.parse(toutes[cle]);
      if (normaliserEmailCDQ_(session && session.email) === email) props.deleteProperty(cle);
    } catch(e) {}
  });
}

function lierCleTemporaireCDQ_(utilisateur) {
  const cleTemporaire = obtenirCleTemporaireUtilisateur_();
  if (!cleTemporaire || !utilisateur || !utilisateur.email) return false;
  const maintenant = Date.now();
  PropertiesService.getScriptProperties().setProperty(
    cleProprieteTemporaireCDQ_(cleTemporaire),
    JSON.stringify({
      email: normaliserEmailCDQ_(utilisateur.email),
      createdAt: maintenant,
      expiresAt: maintenant + CDQ_SESSION_TEMP_JOURS_ * 24 * 60 * 60 * 1000
    })
  );
  return true;
}

function lireUtilisateurDepuisCleTemporaireCDQ_() {
  const cleTemporaire = obtenirCleTemporaireUtilisateur_();
  if (!cleTemporaire) return null;
  const props = PropertiesService.getScriptProperties();
  const cle = cleProprieteTemporaireCDQ_(cleTemporaire);
  const brut = props.getProperty(cle);
  if (!brut) return null;
  try {
    const session = JSON.parse(brut);
    if (!session || Number(session.expiresAt || 0) < Date.now()) {
      props.deleteProperty(cle); return null;
    }
    const u = trouverUtilisateurAutoriseParEmail_(session.email);
    if (!u) { props.deleteProperty(cle); return null; }
    return u;
  } catch(e) { props.deleteProperty(cle); return null; }
}

function creerJetonAppareilCDQ_(utilisateur) {
  const jeton = Utilities.getUuid() + '-' + Utilities.getUuid() + '-' + Utilities.getUuid();
  const maintenant = Date.now();
  PropertiesService.getScriptProperties().setProperty(
    cleProprieteAppareilCDQ_(jeton),
    JSON.stringify({
      email: normaliserEmailCDQ_(utilisateur.email),
      createdAt: maintenant,
      lastSeen: maintenant,
      expiresAt: maintenant + CDQ_SESSION_APPAREIL_JOURS_ * 24 * 60 * 60 * 1000
    })
  );
  return jeton;
}

function lireUtilisateurDepuisJetonAppareilCDQ_(jeton) {
  jeton = String(jeton || '').trim();
  if (!jeton) return null;
  const props = PropertiesService.getScriptProperties();
  const cle = cleProprieteAppareilCDQ_(jeton);
  const brut = props.getProperty(cle);
  if (!brut) return null;
  try {
    const session = JSON.parse(brut);
    if (!session || Number(session.expiresAt || 0) < Date.now()) {
      props.deleteProperty(cle); return null;
    }
    const u = trouverUtilisateurAutoriseParEmail_(session.email);
    if (!u) { props.deleteProperty(cle); return null; }
    const seenNowV2687=Date.now();
    if(seenNowV2687-Number(session.lastSeen||0)>=15*60*1000){
      session.lastSeen=seenNowV2687;props.setProperty(cle,JSON.stringify(session));
    }
    return u;
  } catch(e) { props.deleteProperty(cle); return null; }
}

function cleEchecsConnexionCDQ_(email) {
  return 'CDQ_PIN_FAIL_V2_' + empreinteCDQ_(normaliserEmailCDQ_(email) + '|' + obtenirCleTemporaireUtilisateur_()).slice(0, 42);
}

function verifierBlocageConnexionCDQ_(email) {
  const cache = CacheService.getScriptCache();
  const cle = cleEchecsConnexionCDQ_(email);
  const brut = cache.get(cle);
  if (!brut) return { bloque: false, echecs: 0 };
  try {
    const x = JSON.parse(brut);
    return { bloque: !!x.bloque, echecs: Number(x.echecs || 0) };
  } catch(e) { return { bloque: false, echecs: 0 }; }
}

function enregistrerEchecConnexionCDQ_(email) {
  const cache = CacheService.getScriptCache();
  const cle = cleEchecsConnexionCDQ_(email);
  const etat = verifierBlocageConnexionCDQ_(email);
  const echecs = Number(etat.echecs || 0) + 1;
  const bloque = echecs >= CDQ_MAX_ECHECS_PIN_;
  cache.put(cle, JSON.stringify({ echecs: echecs, bloque: bloque }), bloque ? CDQ_BLOCAGE_PIN_SECONDES_ : 300);
  return { echecs: echecs, bloque: bloque };
}

function effacerEchecsConnexionCDQ_(email) {
  CacheService.getScriptCache().remove(cleEchecsConnexionCDQ_(email));
}

function verifierAcces_() {
  // V21.58 : les appels provenant de cdqRpc transportent une session créée
  // seulement après validation du NIP/de la biométrie. Cette voie fonctionne
  // même quand Apps Script ne fournit aucune TemporaryActiveUserKey.
  if (CDQ_ACCES_RPC_COURANT_ && CDQ_ACCES_RPC_COURANT_.email) {
    const uRpc = CDQ_ACCES_RPC_COURANT_.verifiedUserV2686 || trouverUtilisateurAutoriseParEmail_(CDQ_ACCES_RPC_COURANT_.email);
    if (uRpc) return { autorise:true, email:uRpc.email, role:uRpc.role };
  }

  // Compatibilité PC / ancien déploiement lorsque Google fournit encore une
  // clé temporaire propre à l'utilisateur.
  const uSession = lireUtilisateurDepuisCleTemporaireCDQ_();
  if (uSession) return { autorise: true, email: uSession.email, role: uSession.role };

  throw new Error('SESSION EXPIRÉE : reconnectez votre compte CDQ autorisé.');
}

function connecterAvecCodeAcces(email, code, ticketGoogle, jetonAppareil) {
  if (arguments[4] && arguments[4].creatorRecovery === true) {
    return cdqCreatorRecoveryV2628_(email, code, ticketGoogle, arguments[4]);
  }
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(15000)) throw new Error('Une vérification est déjà en cours. Réessayez dans un instant.');
  try { return connecterAvecCodeAccesVerrouille_(email, code, ticketGoogle, jetonAppareil); }
  finally { lock.releaseLock(); }
}

function connecterAvecCodeAccesVerrouille_(email, code, ticketGoogle, jetonAppareil) {
  return cdqDirectActivateV2645_(email,code,ticketGoogle,jetonAppareil);
}







// Compatibility endpoint; no local biometric or PIN verification.
function restaurerSessionApresBiometrie(jetonAppareil) {
  return cdqDirectAccessV2645_(jetonAppareil,'');
}

function deconnecterAppareil(jetonAppareil) {
  jetonAppareil = String(jetonAppareil || '').trim();
  const props = PropertiesService.getScriptProperties();
  if (jetonAppareil) props.deleteProperty(cleProprieteAppareilCDQ_(jetonAppareil));
  const cleTemp = obtenirCleTemporaireUtilisateur_();
  if (cleTemp) props.deleteProperty(cleProprieteTemporaireCDQ_(cleTemp));
  return { ok: true };
}

// Fonction privée : peut être exécutée manuellement depuis l'éditeur Apps Script,
// mais ne peut pas être appelée avec google.script.run (nom terminé par _).
// Elle sert uniquement de filet de sécurité si le propriétaire perd son accès.
function initialiserSecuriteDepuisEditeur_() {
  const admin = obtenirAdministrateurPrincipal_();
  const effectif = normaliserEmailCDQ_(Session.getEffectiveUser().getEmail());
  if (effectif !== admin) throw new Error('Cette opération doit être exécutée par le propriétaire du script.');

  const crees = [];
  lireUtilisateursStockesCDQ_().forEach(function(u){
    if (u.email !== admin && !codeDefiniUtilisateurCDQ_(u)) {
      crees.push({ email: u.email, code: definirNouveauCodeUtilisateurCDQ_(u.email) });
    }
  });

  console.log('CODES CDQ À CONSERVER ET TRANSMETTRE UNE SEULE FOIS : ' + JSON.stringify(crees));
  return crees;
}

/* =====================================================
   ROLES / AUTORISATIONS FINES
===================================================== */
function normaliserRoleCDQ_(role) {
  role = String(role || '').trim().toLowerCase();
  if (role === 'admin') return 'admin';
  if (role === 'lecture') return 'lecture';
  if (role === 'technicien' || role === 'user') return 'technicien';
  return 'technicien';
}

function verifierDroit_(action) {
  const acces = verifierAcces_();
  const role = normaliserRoleCDQ_(acces.role);
  const droits = {
    lecture: ['admin','technicien','lecture'],
    envoi: ['admin','technicien'],
    ecriture: ['admin','technicien'],
    suppressionFichier: ['admin','technicien'],
    suppressionDossier: ['admin'],
    administration: ['admin']
  };
  const autorises = droits[action] || ['admin'];
  if (autorises.indexOf(role) === -1) {
    throw new Error('ACTION NON AUTORISÉE POUR LE RÔLE « ' + role + ' ».');
  }
  return { autorise: true, email: acces.email, role: role };
}

function estProprietairePrincipal_() {
  const acces = verifierAcces_();
  return String(acces.email || '').trim().toLowerCase() ===
    String(obtenirAdministrateurPrincipal_() || '').trim().toLowerCase();
}

function obtenirEtatAcces(jetonAppareil, ticketGoogle) {
  return cdqDirectAccessV2645_(jetonAppareil,ticketGoogle);
}

/* =====================================================
   PROFILS TECHNICIENS POUR LES RAPPORTS PDF — V21.79
   Port de la V21.57 sur la sécurité/session V21.58+.
   Le nom imprimé dans les rapports reste séparé de l'authentification.
===================================================== */
const CDQ_PROFILS_TECHNICIENS_PROP_ = 'CDQ_PROFILS_TECHNICIENS_V1';

function cdqNormaliserNomRapport_(nom) {
  return String(nom || '').replace(/\s+/g, ' ').trim().slice(0, 80);
}
function cdqLireProfilsTechniciens_() {
  let brut='';
  try { brut=PropertiesService.getScriptProperties().getProperty(CDQ_PROFILS_TECHNICIENS_PROP_)||''; } catch(e) {}
  let source={}; try { source=brut?(JSON.parse(brut)||{}):{}; } catch(e) { source={}; }
  const profils={};
  Object.keys(source||{}).forEach(function(cle){
    const email=normaliserEmailCDQ_(cle); if(!email)return;
    const p=source[cle]||{};
    profils[email]={nomRapport:cdqNormaliserNomRapport_(p.nomRapport||p.nom||''),actifRapports:p.actifRapports!==false};
  });
  return profils;
}
function cdqSauverProfilsTechniciens_(profils) {
  const propre={};
  Object.keys(profils||{}).forEach(function(cle){
    const email=normaliserEmailCDQ_(cle);if(!email)return;
    const p=profils[cle]||{};
    propre[email]={nomRapport:cdqNormaliserNomRapport_(p.nomRapport||''),actifRapports:p.actifRapports!==false};
  });
  PropertiesService.getScriptProperties().setProperty(CDQ_PROFILS_TECHNICIENS_PROP_,JSON.stringify(propre));
  return propre;
}
function cdqObtenirProfilTechnicien_(email) {
  email=normaliserEmailCDQ_(email);
  const p=cdqLireProfilsTechniciens_();
  return p[email]||{nomRapport:'',actifRapports:true};
}
function cdqDefinirProfilTechnicien_(email,nomRapport,actifRapports) {
  email=normaliserEmailCDQ_(email);if(!email)throw new Error('Utilisateur invalide.');
  const profils=cdqLireProfilsTechniciens_();
  profils[email]={nomRapport:cdqNormaliserNomRapport_(nomRapport),actifRapports:actifRapports!==false};
  cdqSauverProfilsTechniciens_(profils);return profils[email];
}
function modifierProfilTechnicien(email,nomRapport,actifRapports) {
  verifierDroit_('administration');email=normaliserEmailCDQ_(email);
  const u=trouverUtilisateurAutoriseParEmail_(email);if(!u)throw new Error('Utilisateur introuvable.');
  const role=normaliserRoleCDQ_(u.role);
  const profil=cdqDefinirProfilTechnicien_(email,nomRapport,role==='lecture'?false:actifRapports);
  return {ok:true,profil:profil,utilisateurs:utilisateursPourInterfaceCDQ_()};
}
function obtenirListeTechniciensRapports() {
  const acces=verifierDroit_('lecture');
  const profils=cdqLireProfilsTechniciens_(),autorises=obtenirUtilisateursAutorises_();
  const techniciens=autorises.filter(function(u){const r=normaliserRoleCDQ_(u.role);return r==='technicien'||r==='admin';})
    .map(function(u){const p=profils[u.email]||{nomRapport:'',actifRapports:true};return {nom:cdqNormaliserNomRapport_(p.nomRapport),actif:p.actifRapports!==false};})
    .filter(function(x){return x.actif&&!!x.nom;})
    .sort(function(a,b){return a.nom.localeCompare(b.nom,'fr',{sensitivity:'base'});});
  const emailCourant=normaliserEmailCDQ_(acces.email),uCourant=autorises.find(function(u){return u.email===emailCourant;});
  const pCourant=profils[emailCourant]||{nomRapport:'',actifRapports:true};
  const roleCourant=uCourant?normaliserRoleCDQ_(uCourant.role):'lecture';
  const nomCourant=(roleCourant==='technicien'||roleCourant==='admin')&&pCourant.actifRapports!==false?cdqNormaliserNomRapport_(pCourant.nomRapport):'';
  const serial=JSON.stringify(techniciens.map(function(x){return x.nom;}));
  return {ok:true,techniciens:techniciens.map(function(x){return {nom:x.nom};}),courant:nomCourant?{nom:nomCourant}:null,version:empreinteCDQ_(serial).slice(0,24),genereLe:Date.now()};
}

function utilisateursPourInterfaceCDQ_() {
  const admin=obtenirAdministrateurPrincipal_(),profils=cdqLireProfilsTechniciens_();
  return obtenirUtilisateursAutorises_().map(function(u){
    const p=profils[u.email]||{nomRapport:'',actifRapports:true};
    return {email:u.email,role:u.role,codeDefini:codeDefiniUtilisateurCDQ_(u),nipDefini:nip4DefiniUtilisateurCDQ_(u),accesCreateur:u.email===admin,nomRapport:cdqNormaliserNomRapport_(p.nomRapport),actifRapports:p.actifRapports!==false};
  });
}

function obtenirListeUtilisateurs() {
  verifierDroit_('administration');
  return utilisateursPourInterfaceCDQ_();
}

function ajouterUtilisateur(email, role, nomRapport) {
  verifierDroit_('administration');
  email=normaliserEmailCDQ_(email);
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new Error('Adresse courriel invalide.');
  const admin=obtenirAdministrateurPrincipal_();
  role=email===admin?'admin':normaliserRoleCDQ_(role);
  const nom=cdqNormaliserNomRapport_(nomRapport);
  if(email===admin){if(nom)cdqDefinirProfilTechnicien_(admin,nom,true);return {utilisateurs:utilisateursPourInterfaceCDQ_(),codeTemporaire:null,email:admin};}
  const utilisateurs=lireUtilisateursStockesCDQ_();let u=utilisateurs.find(function(x){return x.email===email;}),nouveau=false;
  if(!u){u={email:email,role:role,pinSalt:'',pinHash:'',pinVersion:0,nip4Salt:'',nip4Hash:'',nip4Version:0};utilisateurs.push(u);nouveau=true;}else{u.role=role;}
  sauvegarderUtilisateursStockesCDQ_(utilisateurs);
  if(nom)cdqDefinirProfilTechnicien_(email,nom,role!=='lecture');
  else if(role==='lecture'){const ancien=cdqObtenirProfilTechnicien_(email);if(ancien.nomRapport)cdqDefinirProfilTechnicien_(email,ancien.nomRapport,false);}
  let codeTemporaire=null;
  // V21.58 : ne jamais recréer un code de masse pour un technicien ayant déjà son NIP.
  if(nouveau||(!cdqDeviceRegisteredV2645_(u)&&!codeDefiniUtilisateurCDQ_(u)))codeTemporaire=definirNouveauCodeUtilisateurCDQ_(email);
  return {utilisateurs:utilisateursPourInterfaceCDQ_(),codeTemporaire:codeTemporaire,email:email};
}

function genererNouveauCodeUtilisateur(email) {
  verifierDroit_('administration');
  email = normaliserEmailCDQ_(email);
  if (email === obtenirAdministrateurPrincipal_()) {
    throw new Error('Le compte créateur n’utilise pas de code d’activation.');
  }
  const u = trouverUtilisateurAutoriseParEmail_(email);
  if (!u) throw new Error('Utilisateur introuvable.');
  const code = definirNouveauCodeUtilisateurCDQ_(email);
  // Révoquer les anciennes sessions/appareils, mais conserver la preuve Google
  // en cours pour que la nouvelle clé puisse être utilisée immédiatement.
  revoquerSessionsUtilisateur_(email, {preserverTicketsGoogle:true});
  return { email: email, codeTemporaire: code, utilisateurs: utilisateursPourInterfaceCDQ_() };
}

function genererCodesManquants() {
  verifierDroit_('administration');
  const crees = [];
  const admin = obtenirAdministrateurPrincipal_();
  obtenirUtilisateursAutorises_().forEach(function(u){
    // Le code d'activation est à usage unique et disparaît volontairement une
    // fois le NIP créé. Ne jamais régénérer en masse un code pour un utilisateur
    // déjà activé : cela effacerait son NIP et révoquerait son appareil.
    if (u.email !== admin && !cdqDeviceRegisteredV2645_(u) && !codeDefiniUtilisateurCDQ_(u)) {
      const code = definirNouveauCodeUtilisateurCDQ_(u.email);
      revoquerSessionsUtilisateur_(u.email, {preserverTicketsGoogle:true});
      crees.push({ email: u.email, codeTemporaire: code });
    }
  });
  return { codes: crees, utilisateurs: utilisateursPourInterfaceCDQ_() };
}

// À exécuter uniquement depuis l'éditeur Apps Script. Cette fonction associe
// la clé temporaire Google du propriétaire à son rôle administrateur. Son nom
// terminé par _ empêche tout appel depuis le navigateur.
function autoriserCreateurDepuisEditeur_() {
  const admin = obtenirAdministrateurPrincipal_();
  const effectif = normaliserEmailCDQ_(Session.getEffectiveUser().getEmail());
  const actif = normaliserEmailCDQ_(Session.getActiveUser().getEmail());
  if (effectif !== admin || (actif && actif !== admin)) {
    throw new Error('Cette opération doit être exécutée par le propriétaire du script.');
  }
  const u = trouverUtilisateurAutoriseParEmail_(admin);
  if (!lierCleTemporaireCDQ_(u)) throw new Error('Clé temporaire Google indisponible.');
  return { ok:true, email:admin, role:'admin' };
}

function supprimerUtilisateur(email) {
  verifierDroit_('administration');email=normaliserEmailCDQ_(email);
  const admin=obtenirAdministrateurPrincipal_();if(email===admin)throw new Error('Le compte administrateur principal ne peut pas être supprimé.');
  const utilisateurs=lireUtilisateursStockesCDQ_().filter(function(x){return x.email!==email;});
  sauvegarderUtilisateursStockesCDQ_(utilisateurs);revoquerSessionsUtilisateur_(email);
  const ancien=cdqObtenirProfilTechnicien_(email);if(ancien.nomRapport)cdqDefinirProfilTechnicien_(email,ancien.nomRapport,false);
  return utilisateursPourInterfaceCDQ_();
}

function modifierRoleUtilisateur(email, role) {
  verifierDroit_('administration');email=normaliserEmailCDQ_(email);
  const admin=obtenirAdministrateurPrincipal_();if(email===admin)throw new Error('Le rôle de l’administrateur principal ne peut pas être modifié.');
  const utilisateurs=lireUtilisateursStockesCDQ_(),cible=utilisateurs.find(function(x){return x.email===email;});if(!cible)throw new Error('Utilisateur introuvable.');
  cible.role=normaliserRoleCDQ_(role);sauvegarderUtilisateursStockesCDQ_(utilisateurs);
  const profil=cdqObtenirProfilTechnicien_(email);
  if(profil.nomRapport&&cible.role==='lecture')cdqDefinirProfilTechnicien_(email,profil.nomRapport,false);
  return utilisateursPourInterfaceCDQ_();
}

/* =====================================================
   OUVERTURE DE L'APPLICATION
===================================================== */
function doGet(e) {
  const params = e && e.parameter ? e.parameter : {};
  if(String(params.cdq_native_bridge||'')==='1')return cdqEmbeddedBridgeV2528_(params);

  // V21.98 : endpoint de santé indépendant de l'interface.
  // Utilisé par CDQ Script Manager après un déploiement.
  if (String(params.cdq_health || '') === '1') {
    let selectorBuild = '';
    let selectorBytes = 0;
    let selectorOk = false;
    try {
      const selectorSource = HtmlService.createHtmlOutputFromFile('Selector').getContent();
      selectorBytes = selectorSource.length;
      selectorOk = selectorBytes > 1000;
      const m = selectorSource.match(/CDQ_PACKAGE_BUILD:\s*([A-Za-z0-9._-]+)/i);
      selectorBuild = m && m[1] ? String(m[1]).trim() : '';
    } catch (err) {
      selectorOk = false;
    }

    const backendBuild = (typeof CDQ_BACKEND_BUILD_ !== 'undefined')
      ? String(CDQ_BACKEND_BUILD_)
      : 'inconnue';

    const payload = {
      type: 'CDQ_HEALTH_READY',
      build: backendBuild,
      selectorBuild: selectorBuild,
      selectorOk: selectorOk,
      selectorBytes: selectorBytes,
      serverTime: new Date().toISOString()
    };

    const payloadJs = JSON.stringify(payload).replace(/</g, '\\u003c');
    const html = '<!doctype html><html><head><meta charset="utf-8"><title>CDQ Health</title></head>' +
      '<body style="background:#05070a;color:#dce8ef;font:14px system-ui;padding:18px">' +
      '<div id="ok">Balance CDQ · vérification de production</div>' +
      '<script>(function(){var p=' + payloadJs + ';' +
      'try{window.top.postMessage(p,"https://jprodrigue86.github.io");}catch(e){}' +
      'try{window.parent.postMessage(p,"https://jprodrigue86.github.io");}catch(e){}' +
      '})();<\/script></body></html>';

    return HtmlService.createHtmlOutput(html)
      .setTitle('Balance CDQ Health')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }

  // Application normale.
  return HtmlService.createHtmlOutputFromFile('Selector')
    .setTitle('Rapports D’étalonnages')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function testerScript_() {
  Logger.log('Le script fonctionne !');
}


/* =====================================================
   CACHE SERVEUR
===================================================== */
function cleCacheClient_(dossierId) {
  return 'CONTENU_CLIENT_V8_UI_' + String(dossierId || '');
}

function invaliderCacheCompagnies_() {
  CacheService.getScriptCache().remove('LISTE_COMPAGNIES_V8_UI');
}

function invaliderCacheContenuClient_(dossierId) {
  dossierId = String(dossierId || '').trim();
  if (!dossierId) return;
  CacheService.getScriptCache().remove(cleCacheClient_(dossierId));
}

function mettreEnCacheClient_(dossierId, resultat) {
  try {
    const json = JSON.stringify(resultat);
    if (json.length <= CONFIG.CACHE_CLIENT_MAX_CARACTERES) {
      CacheService
        .getScriptCache()
        .put(cleCacheClient_(dossierId), json, CONFIG.CACHE_CLIENT_SECONDES);
    }
  } catch (e) {
    console.log('Cache client ignoré :', e);
  }
}


/* =====================================================
   LISTE DES COMPAGNIES
===================================================== */
function obtenirDossiersClients(forceRefresh) {
  verifierAcces_();

  const cache = CacheService.getScriptCache();
  const cle = 'LISTE_COMPAGNIES_V8_UI';

  if (!forceRefresh) {
    const brut = cache.get(cle);
    if (brut) {
      try {
        return JSON.parse(brut);
      } catch (e) {}
    }
  }

  if(typeof Drive!=="undefined"){
    try{const fast=cdqReadCompaniesV2527_();try{cache.put(cle,JSON.stringify(fast),CONFIG.CACHE_COMPAGNIES_SECONDES);}catch(_){}return fast;}catch(e){console.warn("Liste groupée indisponible; lecture classique.");}
  }
  if(typeof Drive!=="undefined"){
    try{const fast=cdqReadCompaniesV2527_();try{cache.put(cle,JSON.stringify(fast),CONFIG.CACHE_COMPAGNIES_SECONDES);}catch(_){}return fast;}catch(e){console.warn("Liste groupée indisponible; lecture classique.");}
  }
  const dossierPrincipal = DriveApp.getFolderById(CONFIG.MASTER_FOLDER_ID);
  const dossiers = dossierPrincipal.getFolders();
  const resultats = [];
  const photoIndex = construireIndexPhotosCDQ_();

  while (dossiers.hasNext()) {
    const dossier = dossiers.next();
    if (estDossierSystemeCDQ_(dossier)) continue;
    resultats.push({
      id: dossier.getId(),
      nom: dossier.getName(),
      favori: estFavoriDossier_(dossier),
      notePresente: !!extraireNoteCDQ_(dossier.getDescription() || ''),
      photoPresente: photoPresenteDansIndexCDQ_(photoIndex,'client',dossier.getId())
    });
  }

  resultats.sort(function(a, b) {
    return a.nom.localeCompare(b.nom, 'fr', { sensitivity: 'base' });
  });

  try {
    cache.put(cle, JSON.stringify(resultats), CONFIG.CACHE_COMPAGNIES_SECONDES);
  } catch (e) {
    console.log('Cache compagnies ignoré :', e);
  }

  return resultats;
}


/* =====================================================
   DOSSIERS
===================================================== */
function creerDossierDansCompagnie(idCompagnie, nomDossier) {
  verifierDroit_('ecriture');

  idCompagnie = (idCompagnie || '').trim();
  nomDossier = (nomDossier || '').trim();

  if (!idCompagnie) throw new Error('Compagnie non sélectionnée.');
  if (!nomDossier) throw new Error('Le nom du dossier ne peut pas être vide.');
  if (nomDossier.length > 200) throw new Error('Le nom du dossier est trop long.');

  const compagnie = DriveApp.getFolderById(idCompagnie);
  const nouveauDossier = compagnie.createFolder(nomDossier);

  invaliderCacheContenuClient_(idCompagnie);

  return {
    id: nouveauDossier.getId(),
    nom: nouveauDossier.getName(),
    fichiers: [],
    dossiers: []
  };
}

function creerDossierClient(nomDossier,requestId) {
  return cdqCreateCompanyOnceV2760_(nomDossier,requestId);
}

function supprimerDossier(dossierId, idCompagnie) {
  return cdqDeleteFolderV2752_(dossierId, idCompagnie, true); // CDQ verified Drive deletion V27.52
  verifierDroit_('suppressionDossier');

  dossierId = (dossierId || '').trim();
  idCompagnie = (idCompagnie || '').trim();

  if (!dossierId) throw new Error('Dossier introuvable.');
  if (dossierId === CONFIG.MASTER_FOLDER_ID) {
    throw new Error('Le dossier principal ne peut pas être supprimé.');
  }

  const dossier = DriveApp.getFolderById(dossierId);
  verifierModificationDossierAutorisee_(dossier, 'le supprimer');
  const nom = dossier.getName();
  dossier.setTrashed(true);

  if (idCompagnie) invaliderCacheContenuClient_(idCompagnie);

  return {
    id: dossierId,
    nom: nom,
    message: 'Dossier « ' + nom + ' » envoyé à la corbeille.'
  };
}


/* =====================================================
   FICHIERS COMPATIBLES
===================================================== */


/* =====================================================
   DOSSIERS PROTÉGÉS
===================================================== */
const CDQ_PROTECTION_MARKER_ = '[CDQ_PROTECTED]';

function estDossierProtege_(dossier) {
  try {
    return String(dossier.getDescription() || '').indexOf(CDQ_PROTECTION_MARKER_) !== -1;
  } catch (e) {
    return false;
  }
}

function remplacerProtectionDossier_(description, protege) {
  let d = String(description || '').replace(/\n?\[CDQ_PROTECTED\]\n?/g, '\n').trim();
  if (protege) d = (d ? d + '\n' : '') + CDQ_PROTECTION_MARKER_;
  return d.trim();
}

function verifierModificationDossierAutorisee_(dossier, action) {
  if (!estDossierProtege_(dossier)) return true;
  if (estProprietairePrincipal_()) return true;
  throw new Error('Ce dossier est protégé. Seul le propriétaire principal peut ' + (action || 'le modifier') + '.');
}

function definirProtectionDossier(dossierId, protege, idCompagnie) {
  verifierProprietairePrincipal_();
  dossierId = String(dossierId || '').trim();
  if (!dossierId) throw new Error('Dossier introuvable.');
  const dossier = DriveApp.getFolderById(dossierId);
  dossier.setDescription(remplacerProtectionDossier_(dossier.getDescription() || '', !!protege));
  if (idCompagnie) invaliderCacheContenuClient_(idCompagnie);
  return {
    id: dossierId,
    protege: !!protege,
    message: protege ? 'Dossier protégé.' : 'Protection du dossier retirée.'
  };
}

function estFavoriFichier_(fichier) {
  try {
    return !!fichier.isStarred();
  } catch (e) {
    return false;
  }
}

function estFavoriDossier_(dossier) {
  try {
    return !!dossier.isStarred();
  } catch (e) {
    return false;
  }
}


function fichierCompatible_(fichier, photoIndex) {
  const nom = fichier.getName();
  const typeMime = fichier.getMimeType();
  const extension = nom.indexOf('.') >= 0
    ? nom.split('.').pop().toLowerCase()
    : '';

  const estGoogleSheet = typeMime === MimeType.GOOGLE_SHEETS;
  const estExcel = extension === 'xlsx' || extension === 'xls';
  const estPDF = extension === 'pdf' || typeMime === MimeType.PDF;

  if (!estGoogleSheet && !estExcel && !estPDF) return null;

  const notePresente = !!extraireNoteCDQ_(fichier.getDescription() || '');
  const fichierId = fichier.getId();
  if (!photoIndex) photoIndex = construireIndexPhotosCDQ_();

  return {
    id: fichierId,
    nom: nom,
    type: estPDF ? 'PDF' : (estGoogleSheet ? 'GOOGLE_SHEETS' : 'EXCEL'),
    dateModification: fichier.getLastUpdated().toISOString(),
    favori: estFavoriFichier_(fichier),
    notePresente: notePresente,
    photoPresente: photoPresenteDansIndexCDQ_(photoIndex,'fichier',fichierId)
  };
}




/* =====================================================
   STRUCTURE AUTOMATIQUE DES NOUVEAUX CLIENTS
   Noms copiés de la photo fournie.
===================================================== */
const CDQ_STRUCTURE_CLIENT_V1_ = [
  'Certficat de poid étalon',
  'Contrat',
  'Liste de balance',
  "Rapports d'étalonnages"
];




function assurerStructureClientAIOuverture_(idCompagnie) {
  idCompagnie = String(idCompagnie || '').trim();
  if (!idCompagnie) return { cree: 0, ignore: true };

  const client = DriveApp.getFolderById(idCompagnie);
  if (!verifierDossierClientDirect_(client)) {
    return { cree: 0, ignore: true };
  }

  const marqueur = '[CDQ_STRUCTURE_V1]';
  const description = String(client.getDescription() || '');
  if (description.indexOf(marqueur) !== -1) {
    return { cree: 0, dejaInitialise: true };
  }

  const existants = [];
  const it = client.getFolders();
  while (it.hasNext()) existants.push(it.next().getName());

  const standardsPresents = CDQ_STRUCTURE_CLIENT_V1_.filter(function(nom) {
    return existants.indexOf(nom) !== -1;
  }).length;

  // Client vide = nouveau. Une structure standard partielle est complétée.
  // Un ancien client avec uniquement des dossiers personnalisés n'est pas modifié.
  let cree = 0;
  if (existants.length === 0 || standardsPresents > 0) {
    CDQ_STRUCTURE_CLIENT_V1_.forEach(function(nom) {
      if (existants.indexOf(nom) === -1) {
        client.createFolder(nom);
        cree++;
      }
    });
  }

  client.setDescription((description ? description.trim() + '\n' : '') + marqueur);
  if (cree) invaliderCacheContenuClient_(idCompagnie);

  return {
    cree: cree,
    noms: CDQ_STRUCTURE_CLIENT_V1_.slice(),
    structurePersonnalisee: existants.length > 0 && standardsPresents === 0
  };
}

/* =====================================================
   CHARGEMENT PARESSEUX DES DOSSIERS
===================================================== */
function metaDossierLegere_(dossier, photoIndex) {
  return {
    id: dossier.getId(),
    nom: dossier.getName(),
    favori: estFavoriDossier_(dossier),
    notePresente: !!extraireNoteCDQ_(dossier.getDescription() || ''),
    photoPresente: photoPresenteDansIndexCDQ_(photoIndex || cdqCachedPhotoIndexV2756_(),'dossier',dossier.getId()),
    protege: estDossierProtege_(dossier),
    charge: false,
    fichiers: [],
    dossiers: []
  };
}

function lireDossierSurface_(dossier, photoIndex) {
  if(typeof Drive!=="undefined"){try{return cdqReadSurfaceV2527_(dossier,photoIndex);}catch(e){console.warn("Lecture groupée indisponible; lecture Drive classique.");}}
  photoIndex = photoIndex || cdqCachedPhotoIndexV2756_();
  const resultat = {
    id: dossier.getId(),
    nom: dossier.getName(),
    favori: estFavoriDossier_(dossier),
    notePresente: !!extraireNoteCDQ_(dossier.getDescription() || ''),
    photoPresente: photoPresenteDansIndexCDQ_(photoIndex,'dossier',dossier.getId()),
    protege: estDossierProtege_(dossier),
    charge: true,
    fichiers: [],
    dossiers: []
  };

  const fichiers = dossier.getFiles();
  while (fichiers.hasNext()) {
    const compatible = fichierCompatible_(fichiers.next(), photoIndex);
    if (compatible) resultat.fichiers.push(compatible);
  }

  const dossiers = dossier.getFolders();
  while (dossiers.hasNext()) resultat.dossiers.push(metaDossierLegere_(dossiers.next(), photoIndex));

  resultat.fichiers.sort(function(a, b) {
    return new Date(b.dateModification) - new Date(a.dateModification);
  });
  resultat.dossiers.sort(function(a, b) {
    return a.nom.localeCompare(b.nom, 'fr', { sensitivity: 'base' });
  });
  return resultat;
}

function obtenirContenuDossierParesseux(dossierId, idCompagnie) {
  verifierDroit_('lecture');
  dossierId = String(dossierId || '').trim();
  if (!dossierId) throw new Error('Dossier introuvable.');
  const dossier = DriveApp.getFolderById(dossierId);
  return {
    contenu: lireDossierSurface_(dossier),
    genereLe: Date.now(),
    source: 'drive',
    idCompagnie: String(idCompagnie || '')
  };
}


/* =====================================================
   LECTURE RECURSIVE DU CLIENT
===================================================== */

function lireDossierRecursif_(dossier, photoIndex) {
  photoIndex = photoIndex || construireIndexPhotosCDQ_();
  const resultat = lireDossierSurface_(dossier, photoIndex);
  resultat.dossiers = resultat.dossiers.map(function(meta) {
    return lireDossierRecursif_(DriveApp.getFolderById(meta.id), photoIndex);
  });
  resultat.charge = true;
  return resultat;
}


/* =====================================================
   CONTENU CLIENT OPTIMISE

   - forceRefresh=false : utilise d'abord le cache serveur.
   - forceRefresh=true  : relit Google Drive et renouvelle le cache.
===================================================== */

function obtenirContenuClientOptimise(dossierId, forceRefresh) {
  verifierDroit_('lecture');

  dossierId = String(dossierId || '').trim();
  if (!dossierId) throw new Error('Compagnie introuvable.');

  const cache = CacheService.getScriptCache();
  const cle = cleCacheClient_(dossierId);

  if (!forceRefresh) {
    const brut = cache.get(cle);
    if (brut) {
      try {
        const resultatCache = JSON.parse(brut);
        resultatCache.source = 'cache';
        return resultatCache;
      } catch (e) {}
    }
  }

  // Opening a client is read-only; creation establishes its standard folders.
  const photoIndex = cdqCachedPhotoIndexV2756_();
  const contenu = lireDossierSurface_(DriveApp.getFolderById(dossierId), photoIndex);
  contenu.photoPresente = photoPresenteDansIndexCDQ_(photoIndex,'client',dossierId);
  const resultat = {
    contenu: contenu,
    genereLe: Date.now(),
    source: 'drive',
    chargementParesseux: true
  };
  mettreEnCacheClient_(dossierId, resultat);
  return resultat;
}

// Compatibilité avec l'ancienne interface.
function obtenirContenuClient(dossierId) {
  return obtenirContenuClientOptimise(dossierId, false).contenu;
}

// Appelé silencieusement par la nouvelle interface après avoir affiché
// instantanément le cache Android.
function actualiserContenuClient(dossierId) {
  return obtenirContenuClientOptimise(dossierId, true);
}


/* =====================================================
   META D'UN SEUL FICHIER
   Évite de rescanner toute la compagnie après Modifier.
===================================================== */
function obtenirMetaFichier(fichierId) {
  verifierAcces_();
  const fichier = DriveApp.getFileById(fichierId);
  const meta = fichierCompatible_(fichier);
  if (!meta) throw new Error('Type de fichier non supporté.');
  return meta;
}

function obtenirDateModificationFichier(fichierId) {
  return obtenirMetaFichier(fichierId).dateModification;
}


/* =====================================================
   NOTES ATTACHÉES AUX FICHIERS

   La note est conservée dans la description Google Drive.
   Un marqueur CDQ permet de préserver une description Drive
   qui pourrait déjà exister.
===================================================== */
const NOTE_CDQ_DEBUT_ = '[[CDQ_NOTE_V1]]';
const NOTE_CDQ_FIN_ = '[[/CDQ_NOTE_V1]]';
const NOTE_CDQ_MAX_CARACTERES_ = 2000;

function extraireNoteCDQ_(description) {
  description = String(description || '');

  const debut = description.indexOf(NOTE_CDQ_DEBUT_);
  if (debut < 0) return '';

  const positionTexte = debut + NOTE_CDQ_DEBUT_.length;
  const fin = description.indexOf(NOTE_CDQ_FIN_, positionTexte);

  if (fin < 0) return '';

  return description
    .substring(positionTexte, fin)
    .replace(/^\s*\n?/, '')
    .replace(/\n?\s*$/, '');
}

function remplacerNoteCDQ_(description, note) {
  description = String(description || '');
  note = String(note || '').trim();

  const debut = description.indexOf(NOTE_CDQ_DEBUT_);

  if (debut >= 0) {
    const fin = description.indexOf(
      NOTE_CDQ_FIN_,
      debut + NOTE_CDQ_DEBUT_.length
    );

    if (fin >= 0) {
      const apres = fin + NOTE_CDQ_FIN_.length;
      description =
        description.substring(0, debut) +
        description.substring(apres);
    }
  }

  description = description.trim();

  if (!note) {
    return description;
  }

  const bloc =
    NOTE_CDQ_DEBUT_ +
    '\n' +
    note +
    '\n' +
    NOTE_CDQ_FIN_;

  return description
    ? description + '\n\n' + bloc
    : bloc;
}

function obtenirNoteFichier(fichierId) {
  verifierAcces_();

  fichierId = String(fichierId || '').trim();

  if (!fichierId) {
    throw new Error('Fichier introuvable.');
  }

  const fichier = DriveApp.getFileById(fichierId);

  return {
    id: fichierId,
    nom: fichier.getName(),
    note: extraireNoteCDQ_(fichier.getDescription())
  };
}

function enregistrerNoteFichier(fichierId, note, idCompagnie) {
  const acces = verifierDroit_('ecriture');

  fichierId = String(fichierId || '').trim();
  idCompagnie = String(idCompagnie || '').trim();
  note = String(note || '').trim();

  if (!fichierId) {
    throw new Error('Fichier introuvable.');
  }

  if (note.length > NOTE_CDQ_MAX_CARACTERES_) {
    throw new Error(
      'La note est trop longue. Maximum : ' +
      NOTE_CDQ_MAX_CARACTERES_ +
      ' caractères.'
    );
  }

  const fichier = DriveApp.getFileById(fichierId);
  const descriptionActuelle = fichier.getDescription() || '';
  const nouvelleDescription =
    remplacerNoteCDQ_(descriptionActuelle, note);

  fichier.setDescription(nouvelleDescription);
  if (note) cdqArchiverNoteV2292_('fichier', fichierId, note, acces);

  if (idCompagnie) {
    invaliderCacheContenuClient_(idCompagnie);
  }

  const meta = fichierCompatible_(fichier);

  return {
    id: fichierId,
    note: note,
    meta: meta,
    message: note
      ? 'Note enregistrée.'
      : 'Note effacée.'
  };
}


/* =====================================================
   NOTES ATTACHÉES AUX DOSSIERS CLIENT / SOUS-DOSSIERS
   Utilise le même bloc CDQ dans la description Drive.
===================================================== */
function obtenirNoteDossier(dossierId) {
  verifierAcces_();

  dossierId = String(dossierId || '').trim();
  if (!dossierId) throw new Error('Dossier introuvable.');

  const dossier = DriveApp.getFolderById(dossierId);

  return {
    id: dossierId,
    nom: dossier.getName(),
    note: extraireNoteCDQ_(dossier.getDescription() || '')
  };
}

function enregistrerNoteDossier(dossierId, note, idCompagnie) {
  const acces = verifierDroit_('ecriture');

  dossierId = String(dossierId || '').trim();
  idCompagnie = String(idCompagnie || '').trim();
  note = String(note || '').trim();

  if (!dossierId) throw new Error('Dossier introuvable.');
  if (note.length > NOTE_CDQ_MAX_CARACTERES_) {
    throw new Error('La note est trop longue. Maximum : ' + NOTE_CDQ_MAX_CARACTERES_ + ' caractères.');
  }

  const dossier = DriveApp.getFolderById(dossierId);
  const descriptionActuelle = dossier.getDescription() || '';
  dossier.setDescription(remplacerNoteCDQ_(descriptionActuelle, note));
  if (note) cdqArchiverNoteV2292_('dossier', dossierId, note, acces);

  if (idCompagnie) invaliderCacheContenuClient_(idCompagnie);

  return {
    id: dossierId,
    note: note,
    message: note ? 'Note du dossier enregistrée.' : 'Note du dossier effacée.'
  };
}


/* =====================================================
   LISTE PLATE DES FICHIERS
===================================================== */
function obtenirFichiersSheets(dossierId) {
  verifierAcces_();

  const contenu = obtenirContenuClientOptimise(dossierId, false).contenu;
  const resultats = [];

  function parcourir(noeud) {
    (noeud.fichiers || []).forEach(function(f) { resultats.push(f); });
    (noeud.dossiers || []).forEach(parcourir);
  }

  parcourir(contenu);

  resultats.sort(function(a, b) {
    return new Date(b.dateModification) - new Date(a.dateModification);
  });

  return resultats;
}

function obtenirFichier_(fichierId) {
  verifierAcces_();
  return DriveApp.getFileById(fichierId);
}


/* =====================================================
   EXPORT GOOGLE SHEETS
===================================================== */
function convertirGoogleSheetEnPdf(fichierId) {
  verifierAcces_();

  const fichier = DriveApp.getFileById(fichierId);
  const spreadsheetId = fichier.getId();

  const url =
    'https://docs.google.com/spreadsheets/d/' +
    spreadsheetId +
    '/export?' +
    'format=pdf' +
    '&size=' + encodeURIComponent(CONFIG.FORMAT_PAPIER) +
    '&portrait=' + (CONFIG.PORTRAIT ? 'true' : 'false') +
    '&fitw=true' +
    '&sheetnames=false' +
    '&printtitle=false' +
    '&pagenumbers=false' +
    '&gridlines=false' +
    '&fzr=false';

  const response = UrlFetchApp.fetch(url, {
    headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
    muteHttpExceptions: true
  });

  if (response.getResponseCode() !== 200) {
    throw new Error('Impossible de convertir le fichier Google Sheets en PDF.');
  }

  const nomPdf = fichier.getName().replace(/\.xlsx?$/i, '') + '.pdf';
  return response.getBlob().setName(nomPdf);
}


/* =====================================================
   EXPORT EXCEL
   Nécessite le service avancé Google Drive déjà utilisé
   par ton application.
===================================================== */
function convertirExcelEnPdf(fichierId) {
  verifierAcces_();

  const fichier = DriveApp.getFileById(fichierId);
  const blob = fichier.getBlob();

  const ressource = {
    name: 'TEMP_CONVERSION_' + fichier.getName(),
    mimeType: 'application/vnd.google-apps.spreadsheet'
  };

  const fichierTemp = Drive.Files.create(ressource, blob, { fields: 'id,name' });
  const tempId = fichierTemp.id;

  try {
    // Petite attente nécessaire pour que Google termine la conversion Excel -> Sheets.
    Utilities.sleep(1200);

    const url =
      'https://docs.google.com/spreadsheets/d/' +
      tempId +
      '/export?' +
      'format=pdf' +
      '&size=' + encodeURIComponent(CONFIG.FORMAT_PAPIER) +
      '&portrait=' + (CONFIG.PORTRAIT ? 'true' : 'false') +
      '&fitw=true' +
      '&sheetnames=false' +
      '&printtitle=false' +
      '&pagenumbers=false' +
      '&gridlines=false' +
      '&fzr=false';

    const response = UrlFetchApp.fetch(url, {
      headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
      muteHttpExceptions: true
    });

    if (response.getResponseCode() !== 200) {
      throw new Error('Impossible de convertir le fichier Excel en PDF.');
    }

    const nomPdf = fichier.getName().replace(/\.xlsx?$/i, '') + '.pdf';
    return response.getBlob().setName(nomPdf);

  } finally {
    try {
      DriveApp.getFileById(tempId).setTrashed(true);
    } catch (erreur) {
      console.log('Erreur suppression fichier temporaire :', erreur);
    }
  }
}


/* =====================================================
   CONVERSION D'UN FICHIER
===================================================== */
function convertirFichierEnPdf(fichierId) {
  verifierAcces_();

  const fichier = DriveApp.getFileById(fichierId);
  const nom = fichier.getName().toLowerCase();
  const typeMime = fichier.getMimeType();

  if (typeMime === MimeType.GOOGLE_SHEETS) {
    return convertirGoogleSheetEnPdf(fichierId);
  }

  if (nom.endsWith('.xlsx') || nom.endsWith('.xls')) {
    return convertirExcelEnPdf(fichierId);
  }

  if (nom.endsWith('.pdf') || typeMime === MimeType.PDF) {
    return fichier.getBlob();
  }

  throw new Error('Type de fichier non supporté : ' + fichier.getName());
}


/* =====================================================
   COURRIEL
===================================================== */
function obtenirDestinataireParDefaut() {
  verifierAcces_();
  return CONFIG.DESTINATAIRE;
}

function validerAdresseCourriel(email) {
  verifierAcces_();
  if (!email) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function convertirEtEnvoyer(fichiersIds, email, message, nomCompagnie) {
  verifierDroit_('envoi');
  const clientId = cdqSendClientForFilesV2823_(fichiersIds);
  return convertirEtEnvoyerSuivi(fichiersIds, email, message, nomCompagnie, clientId, '', false);
}


/* =====================================================
   OUVRIR FICHIER POUR MODIFICATION
===================================================== */
function ouvrirFichierPourModification(fichierId) {
  verifierAcces_();

  const fichier = DriveApp.getFileById(fichierId);
  const nom = fichier.getName().toLowerCase();
  const typeMime = fichier.getMimeType();

  if (typeMime === MimeType.GOOGLE_SHEETS) {
    return 'https://docs.google.com/spreadsheets/d/' + fichierId + '/edit';
  }

  if (
    nom.endsWith('.pdf') ||
    typeMime === MimeType.PDF ||
    nom.endsWith('.xlsx') ||
    nom.endsWith('.xls')
  ) {
    return 'https://drive.google.com/file/d/' + fichierId + '/view';
  }

  return 'https://drive.google.com/file/d/' + fichierId + '/view';
}

function ouvrirFichierLectureSeule(fichierId) {
  verifierDroit_('lecture');
  fichierId = String(fichierId || '').trim();
  if (!fichierId) throw new Error('Fichier introuvable.');

  const fichier = DriveApp.getFileById(fichierId);
  const mime = String(fichier.getMimeType() || '');

  if (mime === MimeType.GOOGLE_SHEETS) {
    return 'https://docs.google.com/spreadsheets/d/' + encodeURIComponent(fichierId) + '/preview';
  }
  if (mime === MimeType.GOOGLE_DOCS) {
    return 'https://docs.google.com/document/d/' + encodeURIComponent(fichierId) + '/preview';
  }
  if (mime === MimeType.GOOGLE_SLIDES) {
    return 'https://docs.google.com/presentation/d/' + encodeURIComponent(fichierId) + '/preview';
  }
  return 'https://drive.google.com/file/d/' + encodeURIComponent(fichierId) + '/preview';
}



/* =====================================================
   FAVORIS
===================================================== */
function definirFavorisFichiers(fichierIds, favori, idCompagnie) {
  verifierDroit_('ecriture');

  if (!Array.isArray(fichierIds) || !fichierIds.length) {
    throw new Error('Aucun fichier sélectionné.');
  }

  const etat = !!favori;
  const resultats = [];

  fichierIds.forEach(function(id) {
    id = String(id || '').trim();
    if (!id) return;

    const fichier = DriveApp.getFileById(id);
    fichier.setStarred(etat);

    const meta = fichierCompatible_(fichier);
    if (meta) resultats.push(meta);
  });

  idCompagnie = String(idCompagnie || '').trim();
  if (idCompagnie) invaliderCacheContenuClient_(idCompagnie);

  return {
    favori: etat,
    fichiers: resultats,
    message: etat
      ? (resultats.length + ' fichier' + (resultats.length > 1 ? 's ajoutés' : ' ajouté') + ' aux favoris.')
      : (resultats.length + ' fichier' + (resultats.length > 1 ? 's retirés' : ' retiré') + ' des favoris.')
  };
}


/* =====================================================
   RENOMMER UN DOSSIER
===================================================== */
function renommerDossier(dossierId, nouveauNom, idCompagnie) {
  verifierDroit_('ecriture');

  dossierId = String(dossierId || '').trim();
  nouveauNom = String(nouveauNom || '').trim();
  idCompagnie = String(idCompagnie || '').trim();

  if (!dossierId) throw new Error('Dossier introuvable.');
  if (!nouveauNom) throw new Error('Le nom ne peut pas être vide.');
  if (nouveauNom.length > 200) throw new Error('Le nom du dossier est trop long.');

  const dossier = DriveApp.getFolderById(dossierId);
  verifierModificationDossierAutorisee_(dossier, 'le renommer');
  dossier.setName(nouveauNom);

  invaliderCacheCompagnies_();
  if (idCompagnie) invaliderCacheContenuClient_(idCompagnie);

  return {
    id: dossierId,
    nom: dossier.getName(),
    message: 'Dossier renommé.'
  };
}


/* =====================================================
   RENOMMER
===================================================== */
function renommerFichier(fichierId, nouveauNom, idCompagnie) {
  // CDQ V27.65 : trace du transport RPC; authentification et integrite conservees.
  verifierDroit_('ecriture');

  nouveauNom = (nouveauNom || '').trim();
  idCompagnie = (idCompagnie || '').trim();

  if (!nouveauNom) throw new Error('Le nom ne peut pas être vide.');

  const fichier = DriveApp.getFileById(fichierId);
  fichier.setName(nouveauNom);

  if (idCompagnie) invaliderCacheContenuClient_(idCompagnie);

  const meta = fichierCompatible_(fichier);
  if (!meta) throw new Error('Type de fichier non supporté.');
  return meta;
}



/* =====================================================
   COPIER LE TEMPLATE PROTÉGÉ DANS LE DOSSIER OUVERT
   V21.11 : copie binaire exacte du PDF + fallback système
===================================================== */
function obtenirTemplateBalanceIntermediaire_(modeleId) {
  const modele = obtenirModeleIntermediaireCDQ_(modeleId);
  if(modele.cle === 'plancher')return cdqTemplateEmbarque_('plancher');
  const systeme = obtenirDossierSystemeCDQ_();
  try {
    const f = DriveApp.getFileById(modele.id);
    if (f && !f.isTrashed() && f.getMimeType() === 'application/pdf') {
      const parents = f.getParents();
      while (parents.hasNext()) {
        const parent = parents.next();
        if (parent.getId() === systeme.getId() || dossierEstSousAncetreCDQ_(parent, systeme.getId())) return f;
      }
    }
  } catch(e) { console.log('Modèle ' + modele.cle + ' par ID indisponible.'); }

  // Secours limité au dossier des modèles; aucun rapport client n'est utilisé.
  const dossiers = [systeme];
  const templates = systeme.getFoldersByName('Templates');
  while (templates.hasNext()) dossiers.unshift(templates.next());
  // Secours borné aux sous-dossiers connus des modèles, jamais aux rapports clients.
  const nomsSousDossiers = {camion:['Balance à camion'], precision:['Template Précision'], cuve4:['Balance Quvre 4']}[modele.cle] || [];
  dossiers.slice().forEach(function(parent) {
    nomsSousDossiers.forEach(function(nom) {
      const it = parent.getFoldersByName(nom);
      while (it.hasNext()) dossiers.unshift(it.next());
    });
  });
  const noms = [modele.nom];
  if (modele.cle === 'plancher') noms.push('_TEMPLATE_BALANCE_INTERMEDIAIRE_NE_PAS_MODIFIER.pdf','Balance intermédiaire.pdf','Balance intermediaire.pdf');
  for (let d = 0; d < dossiers.length; d++) {
    for (let n = 0; n < noms.length; n++) {
      const it = dossiers[d].getFilesByName(noms[n]);
      while (it.hasNext()) {
        const f = it.next();
        if (!f.isTrashed() && f.getMimeType() === 'application/pdf') return f;
      }
    }
  }
  throw new Error('Le modèle ' + modele.nom + ' est introuvable dans _CDQ_SYSTEME / Templates. Aucun rapport n’a été créé.');
}


const CDQ_TEMPLATE_OFFLINE_CHUNK_BYTES_ = 2 * 1024 * 1024;

function obtenirMetaTemplateBalanceIntermediaireHorsLigne(modeleId) {
  verifierDroit_('lecture');

  const fichier = obtenirTemplateBalanceIntermediaire_(modeleId);
  const taille = Number(fichier.getSize());
  const chunkSize = CDQ_TEMPLATE_OFFLINE_CHUNK_BYTES_;

  return {
    ok:true,
    id:fichier.getId(),
    nom:obtenirModeleIntermediaireCDQ_(modeleId).nom,
    modeleId:obtenirModeleIntermediaireCDQ_(modeleId).cle,
    taille:taille,
    modifieLe:fichier.getLastUpdated().getTime(),
    chunkSize:chunkSize,
    chunks:Math.ceil(taille / chunkSize),
    mimeType:'application/pdf',
    sha256:'' // Drive revision (id + modified time) invalidates the offline cache.
  };
}

function obtenirChunkTemplateBalanceIntermediaireHorsLigne(index, revisionAttendue, modeleId) {
  verifierDroit_('lecture');

  if (!Number.isInteger(index) || index < 0) throw new Error('Index du segment PDF invalide.');

  const fichier = obtenirTemplateBalanceIntermediaire_(modeleId);
  if (revisionAttendue && (String(revisionAttendue.id) !== String(fichier.getId()) ||
      Number(revisionAttendue.modifieLe) !== fichier.getLastUpdated().getTime())) {
    throw new Error('Le modèle PDF a changé. Relancez la préparation hors ligne.');
  }
  const bytes = fichier.getBlob().getBytes();
  const chunkSize = CDQ_TEMPLATE_OFFLINE_CHUNK_BYTES_;
  const debut = index * chunkSize;

  if (debut >= bytes.length) {
    throw new Error('Bloc de template hors limites.');
  }

  const fin = Math.min(bytes.length, debut + chunkSize);
  const morceau = bytes.slice(debut, fin);

  return {
    ok:true,
    index:index,
    debut:debut,
    fin:fin,
    total:bytes.length,
    base64:Utilities.base64Encode(morceau)
  };
}

function copierTemplateBalanceIntermediaire(idCompagnie, dossierDestinationId, modeleId, requestId, revisionAttendue) {
  const acces = verifierDroit_('ecriture');
  requestId = String(requestId || '');
  if (requestId && !/^[a-zA-Z0-9_-]{8,100}$/.test(requestId)) throw new Error('Identifiant de copie invalide.');
  const copieLock = requestId ? LockService.getScriptLock() : null;
  if (copieLock) copieLock.waitLock(30000);
  try {

  idCompagnie = String(idCompagnie || '').trim();
  dossierDestinationId = String(dossierDestinationId || idCompagnie).trim();

  if (!idCompagnie) throw new Error('Choisissez d’abord une compagnie.');
  if (!dossierDestinationId) throw new Error('Dossier de destination introuvable.');

  try {
    const client = DriveApp.getFolderById(idCompagnie);
    if (!verifierDossierClientDirect_(client) || estDossierSystemeCDQ_(client)) {
      throw new Error('Choisissez un client CDQ autorisé.');
    }
    const dossierDestination = DriveApp.getFolderById(dossierDestinationId);

    // Sécurité : racine client ou descendant réel du client.
    const autorise =
      dossierDestinationId === idCompagnie ||
      dossierEstSousAncetreCDQ_(dossierDestination, idCompagnie);

    if (!autorise) {
      throw new Error('Le dossier ouvert n’appartient pas à la compagnie sélectionnée.');
    }

    const modele = obtenirModeleIntermediaireCDQ_(modeleId);
    const template = obtenirTemplateBalanceIntermediaire_(modele.cle);
    const templateModifieLe = template.getLastUpdated().getTime();
    // L'identifiant est inscrit dans la copie atomiquement. Une réponse perdue
    // peut être rejouée sans créer un deuxième rapport.
    if (requestId) {
      const existants = dossierDestination.getFiles();
      while (existants.hasNext()) {
        const existant = existants.next(); let meta = {};
        try { meta = JSON.parse(existant.getDescription() || '{}'); } catch(e) {}
        if (meta.cdqTemplateRequestId === requestId && meta.cdqTemplateAuthor === acces.email) {
          if (meta.cdqTemplateModel !== modele.cle) throw new Error('Identifiant déjà utilisé pour un autre modèle.');
          return {ok:true,id:existant.getId(),nom:existant.getName(),clientId:idCompagnie,dossierId:dossierDestinationId,
            modeleId:modele.cle,templateId:meta.cdqTemplateId,templateModifieLe:meta.cdqTemplateModified,
            taille:Number(existant.getSize()),revision:existant.getLastUpdated().toISOString(),type:'PDF'};
        }
      }
    }
    if (revisionAttendue && (String(revisionAttendue.templateId) !== template.getId() ||
        Number(revisionAttendue.modifieLe) !== templateModifieLe)) {
      throw new Error('Le modèle a été remplacé depuis la préparation. Votre copie locale reste disponible dans Modèles hors ligne.');
    }


    let nom = modele.nom;
    let numero = 2;
    while (dossierDestination.getFilesByName(nom).hasNext()) {
      nom = modele.nom.replace(/\.pdf$/i, '') + ' ' + numero + '.pdf';
      numero++;
    }

    let copie = null;
    let erreurNative = null;

    if (requestId) {
      const metadata={name:nom,mimeType:'application/pdf',parents:[dossierDestinationId],description:JSON.stringify({
        cdqTemplateRequestId:requestId,cdqTemplateAuthor:acces.email,cdqTemplateModel:modele.cle,
        cdqTemplateId:template.getId(),cdqTemplateModified:templateModifieLe
      })};
      const resultat = template.cdqEmbedded ? Drive.Files.create(metadata,cdqBlobEmbarque_(modele.cle,nom),{fields:'id'}) : Drive.Files.copy(metadata,template.getId(),{fields:'id'});
      copie = DriveApp.getFileById(resultat.id);
    }

    // Méthode 1 : copie Drive native (la plus fidèle et la plus rapide).
    if (!copie) try {
      copie = template.makeCopy(nom, dossierDestination);
    } catch (e) {
      erreurNative = e;
    }

    // Méthode 2 : secours par copie binaire exacte.
    if (!copie) {
      try {
        const blob = template.getBlob().setName(nom);
        copie = dossierDestination.createFile(blob);
        copie.setName(nom);
      } catch (e2) {
        const detail1 = erreurNative && erreurNative.message ? erreurNative.message : '';
        const detail2 = e2 && e2.message ? e2.message : String(e2);
        throw new Error(
          'Échec de la copie Drive. ' +
          (detail1 ? ('Méthode native : ' + detail1 + '. ') : '') +
          'Méthode de secours : ' + detail2
        );
      }
    }

    const idCopie = copie && copie.getId ? copie.getId() : '';
    if (!idCopie) throw new Error('La copie du PDF n’a pas pu être créée.');

    // Le cache ne doit jamais transformer une copie réussie en erreur.
    try { invaliderCacheContenuClient_(idCompagnie); } catch (e) {}

    return {
      ok: true,
      id: idCopie,
      nom: copie.getName(),
      dossierId: dossierDestinationId,
      clientId: idCompagnie,
      type: 'PDF',
      taille: Number(copie.getSize()),
      revision: copie.getLastUpdated().toISOString(),
      url: copie.getUrl(),
      modeleId: modele.cle,
      templateId: template.getId(),
      templateModifieLe: templateModifieLe,
      message: 'Rapport créé : ' + copie.getName()
    };

  } catch (e) {
    throw new Error(
      'Impossible de créer la Balance intermédiaire. ' +
      (e && e.message ? e.message : String(e))
    );
  }
  } finally { if (copieLock) copieLock.releaseLock(); }
}

/* =====================================================
   DUPLIQUER
===================================================== */
function dupliquerFichier(fichierId, idCompagnie) {
  verifierDroit_('ecriture');

  fichierId = (fichierId || '').trim();
  idCompagnie = (idCompagnie || '').trim();

  if (!fichierId) throw new Error('Fichier introuvable.');

  const fichier = DriveApp.getFileById(fichierId);
  const parents = fichier.getParents();
  if (!parents.hasNext()) {
    throw new Error('Le dossier parent du fichier est introuvable.');
  }

  const dossierParent = parents.next();
  const nomOriginal = fichier.getName();
  const point = nomOriginal.lastIndexOf('.');
  const base = point > 0 ? nomOriginal.substring(0, point) : nomOriginal;
  const extension = point > 0 ? nomOriginal.substring(point) : '';

  let numero = 1;
  let nouveauNom = base + ' - Copie' + extension;

  while (dossierParent.getFilesByName(nouveauNom).hasNext()) {
    numero++;
    nouveauNom = base + ' - Copie ' + numero + extension;
  }

  const copie = fichier.makeCopy(nouveauNom, dossierParent);

  // Une copie est un nouveau rapport : elle démarre sans la note CDQ
  // de l'original, tout en conservant une éventuelle autre description Drive.
  try {
    const descriptionCopie = copie.getDescription() || '';
    const descriptionSansNote = remplacerNoteCDQ_(descriptionCopie, '');
    if (descriptionCopie !== descriptionSansNote) {
      copie.setDescription(descriptionSansNote);
    }
  } catch (e) {
    console.log('Note de la copie non modifiée :', e);
  }

  if (idCompagnie) invaliderCacheContenuClient_(idCompagnie);

  const meta = fichierCompatible_(copie);

  return {
    id: copie.getId(),
    nom: copie.getName(),
    type: meta ? meta.type : '',
    dateModification: meta ? meta.dateModification : copie.getLastUpdated().toISOString(),
    originalId: fichierId,
    message: 'Rapport dupliqué : ' + copie.getName()
  };
}


function dupliquerFichiers(fichierIds, idCompagnie) {
  verifierDroit_('ecriture');

  if (!Array.isArray(fichierIds) || !fichierIds.length) {
    throw new Error('Aucun fichier sélectionné.');
  }

  const copies = [];
  fichierIds.forEach(function(id) {
    const resultat = dupliquerFichier(String(id || ''), idCompagnie);
    if (resultat) copies.push(resultat);
  });

  return {
    fichiers: copies,
    message: copies.length + ' rapport' + (copies.length > 1 ? 's dupliqués.' : ' dupliqué.')
  };
}


/* =====================================================
   SUPPRIMER FICHIERS
===================================================== */
function supprimerFichiers(fichiersIds, idCompagnie) {
  return cdqDeleteSelectionV2752_(fichiersIds, [], idCompagnie, true); // CDQ verified Drive deletion V27.52
  verifierDroit_('suppressionFichier');

  idCompagnie = (idCompagnie || '').trim();

  if (!fichiersIds || !fichiersIds.length) {
    throw new Error('Aucun fichier à supprimer.');
  }

  let nombreSupprime = 0;
  const idsSupprimes = [];

  fichiersIds.forEach(function(id) {
    try {
      DriveApp.getFileById(id).setTrashed(true);
      nombreSupprime++;
      idsSupprimes.push(id);
    } catch (erreur) {
      console.log('Erreur suppression ' + id + ' :', erreur);
    }
  });

  if (idCompagnie) invaliderCacheContenuClient_(idCompagnie);

  return {
    nombre: nombreSupprime,
    ids: idsSupprimes,
    message:
      nombreSupprime +
      (nombreSupprime === 1 ? ' fichier supprimé.' : ' fichiers supprimés.')
  };
}

/* =====================================================
   AMÉLIORATIONS 14 / 24 / 25 / 26 + RESTAURATION
   - Favoris unifiés fichiers / dossiers / compagnies
   - Historique d'envoi
   - Protection contre double envoi
   - Progression d'envoi consultable par l'interface
   - Annuler après suppression
===================================================== */
const CDQ_HISTORIQUE_MAX_ = 20;
const CDQ_DOUBLE_ENVOI_HEURES_ = 24;
const CDQ_PROGRESS_TTL_SECONDES_ = 900;

function definirFavoriDossier(dossierId, favori, idCompagnie) {
  verifierDroit_('ecriture');

  dossierId = String(dossierId || '').trim();
  idCompagnie = String(idCompagnie || '').trim();
  if (!dossierId) throw new Error('Dossier introuvable.');

  const dossier = DriveApp.getFolderById(dossierId);
  dossier.setStarred(!!favori);

  // Un dossier peut aussi être le dossier client lui-même.
  invaliderCacheCompagnies_();
  if (idCompagnie) invaliderCacheContenuClient_(idCompagnie);

  return {
    id: dossierId,
    nom: dossier.getName(),
    favori: !!favori,
    message: favori ? 'Dossier ajouté aux favoris.' : 'Dossier retiré des favoris.'
  };
}

function definirFavoriCompagnie(dossierId, favori) {
  return definirFavoriDossier(dossierId, favori, dossierId);
}

function restaurerFichiers(fichiersIds, idCompagnie) {
  return cdqDeleteSelectionV2752_(fichiersIds, [], idCompagnie, false); // CDQ verified Drive deletion V27.52
  verifierDroit_('ecriture');
  idCompagnie = String(idCompagnie || '').trim();
  if (!Array.isArray(fichiersIds) || !fichiersIds.length) {
    throw new Error('Aucun fichier à restaurer.');
  }

  const ids = [];
  fichiersIds.forEach(function(id) {
    try {
      id = String(id || '').trim();
      if (!id) return;
      DriveApp.getFileById(id).setTrashed(false);
      ids.push(id);
    } catch (e) {
      console.log('Restauration impossible pour ' + id + ' :', e);
    }
  });

  if (idCompagnie) invaliderCacheContenuClient_(idCompagnie);

  return {
    ids: ids,
    nombre: ids.length,
    message: ids.length + (ids.length === 1 ? ' fichier restauré.' : ' fichiers restaurés.')
  };
}

function restaurerDossier(dossierId, idCompagnie) {
  return cdqDeleteFolderV2752_(dossierId, idCompagnie, false); // CDQ verified Drive deletion V27.52
  verifierDroit_('ecriture');
  dossierId = String(dossierId || '').trim();
  idCompagnie = String(idCompagnie || '').trim();
  if (!dossierId) throw new Error('Dossier introuvable.');

  const dossier = DriveApp.getFolderById(dossierId);
  dossier.setTrashed(false);
  invaliderCacheCompagnies_();
  if (idCompagnie) invaliderCacheContenuClient_(idCompagnie);

  return {
    id: dossierId,
    nom: dossier.getName(),
    message: 'Dossier restauré.'
  };
}

function cleHistoriqueEnvoi_(idCompagnie) {
  return 'CDQ_HIST_ENVOI_' + String(idCompagnie || 'SANS_CLIENT');
}

function creerSignatureEnvoi_(fichiersIds, email, idCompagnie) {
  const ids = (fichiersIds || []).map(function(id) {
    return String(id || '').trim();
  }).filter(Boolean).sort();

  const texte = [
    String(idCompagnie || ''),
    String(email || '').trim().toLowerCase(),
    ids.join('|')
  ].join('||');

  const digest = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    texte,
    Utilities.Charset.UTF_8
  );

  return Utilities.base64EncodeWebSafe(digest).replace(/=+$/g, '');
}

function lireHistoriqueEnvoi_(idCompagnie) {
  const props = PropertiesService.getScriptProperties();
  const brut = props.getProperty(cleHistoriqueEnvoi_(idCompagnie));
  if (!brut) return [];
  try {
    const valeur = JSON.parse(brut);
    return Array.isArray(valeur) ? valeur : [];
  } catch (e) {
    return [];
  }
}

function ecrireHistoriqueEnvoi_(idCompagnie, historique) {
  const limite = Date.now() - (120 * 24 * 60 * 60 * 1000);
  const propre = (historique || [])
    .filter(function(item) { return item && Number(item.timestamp || 0) >= limite; })
    .slice(0, CDQ_HISTORIQUE_MAX_);

  PropertiesService.getScriptProperties().setProperty(
    cleHistoriqueEnvoi_(idCompagnie),
    JSON.stringify(propre)
  );
}

function enregistrerHistoriqueEnvoi_(fichiersIds, email, nomCompagnie, idCompagnie) {
  const historique = lireHistoriqueEnvoi_(idCompagnie);
  historique.unshift({
    timestamp: Date.now(),
    compagnie: String(nomCompagnie || 'Client'),
    email: String(email || ''),
    nombre: (fichiersIds || []).length,
    signature: creerSignatureEnvoi_(fichiersIds, email, idCompagnie)
  });
  ecrireHistoriqueEnvoi_(idCompagnie, historique);
}

function obtenirHistoriqueEnvois(idCompagnie) {
  verifierAcces_();
  return lireHistoriqueEnvoi_(idCompagnie).map(function(item) {
    return {
      timestamp: item.timestamp,
      compagnie: item.compagnie,
      email: item.email,
      nombre: item.nombre
    };
  });
}

function verifierEnvoiRecent(fichiersIds, email, idCompagnie, heures) {
  verifierAcces_();
  const h = Math.max(1, Math.min(168, Number(heures || CDQ_DOUBLE_ENVOI_HEURES_)));
  const limite = Date.now() - h * 60 * 60 * 1000;
  const signature = creerSignatureEnvoi_(fichiersIds, email, idCompagnie);
  const trouve = lireHistoriqueEnvoi_(idCompagnie).find(function(item) {
    return item && item.signature === signature && Number(item.timestamp || 0) >= limite;
  });

  return {
    doublon: !!trouve,
    timestamp: trouve ? trouve.timestamp : null,
    heures: h
  };
}

function cleProgressionEnvoi_(sessionId) {
  return 'CDQ_SEND_PROGRESS_' + String(sessionId || '').replace(/[^A-Za-z0-9_-]/g, '').substring(0, 80);
}

function ecrireProgressionEnvoi_(sessionId, progression) {
  if (!sessionId) return;
  try {
    CacheService.getScriptCache().put(
      cleProgressionEnvoi_(sessionId),
      JSON.stringify(progression || {}),
      CDQ_PROGRESS_TTL_SECONDES_
    );
  } catch (e) {
    console.log('Progression envoi non enregistrée :', e);
  }
}

function obtenirProgressionEnvoi(sessionId, optionalQuery) {
  verifierAcces_();
  if (optionalQuery && optionalQuery.trackingV2828 === 1) return cdqSendTrackingReadV2828_(optionalQuery);
  if (!sessionId) return null;
  const brut = CacheService.getScriptCache().get(cleProgressionEnvoi_(sessionId));
  if (!brut) return null;
  try { return JSON.parse(brut); } catch (e) { return null; }
}

function convertirEtEnvoyerSuivi(fichiersIds, email, message, nomCompagnie, idCompagnie, sessionId, forcerDoublon) {
  verifierDroit_('envoi');
  if(Array.isArray(fichiersIds)&&fichiersIds.length>0)return cdqSendQueueStartV2826_(fichiersIds,email,message,nomCompagnie,idCompagnie,sessionId,!!forcerDoublon);
  cdqSendSourcesV2823_ = [];
  cdqSendClientV2823_ = String(idCompagnie || '').trim();

  if (!validerAdresseCourriel(email)) throw new Error('Adresse courriel invalide.');
  if (!Array.isArray(fichiersIds) || !fichiersIds.length) throw new Error('Aucun fichier sélectionné.');

  idCompagnie = String(idCompagnie || '').trim();
  sessionId = String(sessionId || '').trim() || ('zip-v2823-' + Date.now() + '-' + Math.random().toString(36).slice(2));

  const doublon = verifierEnvoiRecent(fichiersIds, email, idCompagnie, CDQ_DOUBLE_ENVOI_HEURES_);
  if (doublon.doublon && !forcerDoublon) {
    throw new Error('CDQ_DOUBLE_ENVOI|' + String(doublon.timestamp || ''));
  }

  const total = fichiersIds.length;
  const piecesJointes = [];

  ecrireProgressionEnvoi_(sessionId, {
    phase: 'conversion', total: total, termine: 0, message: 'Préparation des rapports...'
  });

  fichiersIds.forEach(function(id, index) {
    piecesJointes.push(cdqSendConvertSourceV2823_(DriveApp.getFileById(id)));
    ecrireProgressionEnvoi_(sessionId, {
      phase: 'conversion', total: total, termine: index + 1,
      message: 'Rapport ' + (index + 1) + ' sur ' + total + ' préparé.'
    });
  });

  const deliveryV2823 = cdqPrepareSendZipV2823_(piecesJointes, idCompagnie, nomCompagnie, sessionId, []);
  const date = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  const sujet = 'Rapports d’étalonnages - ' + (nomCompagnie || 'Client') + ' - ' + date;
  const corps = message && String(message).trim()
    ? String(message)
    : ('Bonjour,\n\nVeuillez trouver ci-joint les rapports d’étalonnage de ' +
       (nomCompagnie || 'votre entreprise') + '.\n\nMerci.');

  ecrireProgressionEnvoi_(sessionId, {
    phase: 'envoi', total: total, termine: total, message: 'Envoi du courriel...'
  });

  const cdqPortalMailOutcomeV20261030 = cdqSendEmailZipV2823_(deliveryV2823,email,sujet,corps,CONFIG.NOM_EXPEDITEUR,idCompagnie,!!forcerDoublon);

  let archiveEnvoi = null;
  let archiveErreur = '';
  try {
    archiveEnvoi = cdqDeliveryQueuedReceiptV2825_(deliveryV2823,idCompagnie);
    cdqSendCheckPortalResultV2823_(archiveEnvoi);
  } catch (archiveError) {
    archiveErreur = archiveError && archiveError.message ? archiveError.message : String(archiveError);
    console.log('CDQ V26.22 archivage après envoi impossible : ' + archiveErreur);
  }

  enregistrerHistoriqueEnvoi_(fichiersIds, email, nomCompagnie, idCompagnie);

  ecrireProgressionEnvoi_(sessionId, {
    phase: 'termine', total: total, termine: total,
    message: archiveErreur ? 'Courriel envoyé; archive non créée : ' + archiveErreur : 'Envoi terminé.'
  });

  return {
    lienClientInclus: cdqPortalMailOutcomeV20261030.linkIncluded,
    statutLienClient: cdqPortalMailOutcomeV20261030.status,
    message: archiveErreur
      ? 'Courriel envoyé avec succès, mais l’archive n’a pas pu être créée.'
      : (archiveEnvoi && archiveEnvoi.archives
          ? 'Courriel envoyé avec succès. ' + archiveEnvoi.archives + ' PDF archivé(s) dans ' + archiveEnvoi.chemin + '.'
          : 'Courriel envoyé avec succès.')+(archiveEnvoi&&archiveEnvoi.portalPending?' L’archivage et la mise à jour de la page client se poursuivent automatiquement.':''),
    total: total,
    pdfsEnvoyes: deliveryV2823.pdfCount,
    zip: deliveryV2823.zipName,
    archive: archiveEnvoi,
    archiveErreur: archiveErreur,
    timestamp: Date.now()
  };
}

/* =====================================================
   SÉLECTION MULTIPLE FICHIERS + DOSSIERS
===================================================== */
function definirFavorisSelection(fichierIds, dossierIds, favori, idCompagnie) {
  verifierDroit_('ecriture');

  fichierIds = Array.isArray(fichierIds) ? fichierIds : [];
  dossierIds = Array.isArray(dossierIds) ? dossierIds : [];
  idCompagnie = String(idCompagnie || '').trim();
  const etat = !!favori;

  fichierIds.forEach(function(id) {
    id = String(id || '').trim();
    if (!id) return;
    DriveApp.getFileById(id).setStarred(etat);
  });

  dossierIds.forEach(function(id) {
    id = String(id || '').trim();
    if (!id || id === CONFIG.MASTER_FOLDER_ID) return;
    DriveApp.getFolderById(id).setStarred(etat);
  });

  invaliderCacheCompagnies_();
  if (idCompagnie) invaliderCacheContenuClient_(idCompagnie);

  const total = fichierIds.length + dossierIds.length;
  return {
    favori: etat,
    nombre: total,
    message: total + (total === 1 ? ' élément ' : ' éléments ') + (etat ? 'ajouté aux favoris.' : 'retirés des favoris.')
  };
}


function supprimerSelectionMultiple(fichierIds, dossierIds, idCompagnie) {
  return cdqDeleteSelectionV2752_(fichierIds, dossierIds, idCompagnie, true); // CDQ verified Drive deletion V27.52
  const acces = verifierAcces_();

  fichierIds = Array.isArray(fichierIds) ? fichierIds : [];
  dossierIds = Array.isArray(dossierIds) ? dossierIds : [];
  idCompagnie = String(idCompagnie || '').trim();

  if (fichierIds.length) verifierDroit_('suppressionFichier');
  if (dossierIds.length) verifierDroit_('suppressionDossier');

  const fichiersSupprimes = [];
  const dossiersSupprimes = [];

  fichierIds.forEach(function(id) {
    try {
      id = String(id || '').trim();
      if (!id) return;
      DriveApp.getFileById(id).setTrashed(true);
      fichiersSupprimes.push(id);
    } catch (e) {
      console.log('Suppression fichier impossible ' + id + ' :', e);
    }
  });

  dossierIds.forEach(function(id) {
    try {
      id = String(id || '').trim();
      if (!id || id === CONFIG.MASTER_FOLDER_ID || id === idCompagnie) return;
      const dossier = DriveApp.getFolderById(id);
      verifierModificationDossierAutorisee_(dossier, 'le supprimer');
      dossier.setTrashed(true);
      dossiersSupprimes.push(id);
    } catch (e) {
      console.log('Suppression dossier impossible ' + id + ' :', e);
      throw e;
    }
  });

  invaliderCacheCompagnies_();
  if (idCompagnie) invaliderCacheContenuClient_(idCompagnie);

  const total = fichiersSupprimes.length + dossiersSupprimes.length;
  return {
    fichiers: fichiersSupprimes,
    dossiers: dossiersSupprimes,
    nombre: total,
    message: total + (total === 1 ? ' élément supprimé.' : ' éléments supprimés.')
  };
}

function restaurerSelectionMultiple(fichierIds, dossierIds, idCompagnie) {
  return cdqDeleteSelectionV2752_(fichierIds, dossierIds, idCompagnie, false); // CDQ verified Drive deletion V27.52
  verifierDroit_('ecriture');

  fichierIds = Array.isArray(fichierIds) ? fichierIds : [];
  dossierIds = Array.isArray(dossierIds) ? dossierIds : [];
  idCompagnie = String(idCompagnie || '').trim();

  let nombre = 0;
  fichierIds.forEach(function(id) {
    try {
      id = String(id || '').trim();
      if (!id) return;
      DriveApp.getFileById(id).setTrashed(false);
      nombre++;
    } catch (e) {
      console.log('Restauration fichier impossible ' + id + ' :', e);
    }
  });

  dossierIds.forEach(function(id) {
    try {
      id = String(id || '').trim();
      if (!id) return;
      DriveApp.getFolderById(id).setTrashed(false);
      nombre++;
    } catch (e) {
      console.log('Restauration dossier impossible ' + id + ' :', e);
    }
  });

  invaliderCacheCompagnies_();
  if (idCompagnie) invaliderCacheContenuClient_(idCompagnie);

  return {
    nombre: nombre,
    message: nombre + (nombre === 1 ? ' élément restauré.' : ' éléments restaurés.')
  };
}



/* =====================================================
   ENVOI DE FICHIERS ET DOSSIERS — CONVERTI OU ORIGINAL
===================================================== */
function nettoyerNomArchive_(nom) {
  return String(nom || 'Dossier').replace(/[\\:*?"<>|]/g, '_').trim() || 'Dossier';
}

function exporterFichierGoogleOriginal_(fichier) {
  const mime = fichier.getMimeType();
  let exportMime = '';
  let extension = '';

  if (mime === 'application/vnd.google-apps.spreadsheet') {
    exportMime = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    extension = '.xlsx';
  } else if (mime === 'application/vnd.google-apps.document') {
    exportMime = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    extension = '.docx';
  } else if (mime === 'application/vnd.google-apps.presentation') {
    exportMime = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
    extension = '.pptx';
  } else {
    return fichier.getBlob().setName(fichier.getName());
  }

  const url = 'https://www.googleapis.com/drive/v3/files/' +
    encodeURIComponent(fichier.getId()) +
    '/export?mimeType=' + encodeURIComponent(exportMime);
  const response = UrlFetchApp.fetch(url, {
    headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
    muteHttpExceptions: true
  });
  if (response.getResponseCode() !== 200) {
    throw new Error('Impossible d’exporter le fichier original : ' + fichier.getName());
  }
  let nom = fichier.getName();
  if (!nom.toLowerCase().endsWith(extension)) nom += extension;
  return response.getBlob().setName(nom);
}

function obtenirBlobOriginalPourEnvoi_(fichier) {
  const mime = String(fichier.getMimeType() || '');
  if (mime.indexOf('application/vnd.google-apps.') === 0) {
    return exporterFichierGoogleOriginal_(fichier);
  }
  return fichier.getBlob().setName(fichier.getName());
}

function obtenirBlobSelonMode_(fichier, mode) {
  if (mode === 'convertir') {
    const compatible = fichierCompatible_(fichier);
    if (compatible) return cdqSendConvertSourceV2823_(fichier);
    throw Error("Le document ne peut pas être converti en PDF : " + fichier.getName());
  }
  return obtenirBlobOriginalPourEnvoi_(fichier);
}

function collecterDossierPourArchive_(dossier, prefixe, mode, blobs, cdqArchivePlanV2754) {
  const prefix = prefixe ? String(prefixe).replace(/\\/g, '/') + '/' : '';
  const fichiers = dossier.getFiles();
  while (fichiers.hasNext()) {
    const fichier = fichiers.next();
    const blob = obtenirBlobSelonMode_(fichier, mode);
    if(cdqArchivePlanV2754)cdqReportEngineArchiveBlobV2754_(fichier,blob,cdqArchivePlanV2754,dossier.getId());
    blob.setName(prefix + blob.getName());
    blobs.push(blob);
  }

  const sousDossiers = dossier.getFolders();
  while (sousDossiers.hasNext()) {
    const sous = sousDossiers.next();
    const nomSous = nettoyerNomArchive_(sous.getName());
    collecterDossierPourArchive_(sous, prefix + nomSous, mode, blobs, cdqArchivePlanV2754);
  }
}

function preparerDossierPourEnvoi_(dossierId, mode, cdqArchivePlanV2754) {
  const dossier = DriveApp.getFolderById(String(dossierId || '').trim());
  const blobs = [];
  collecterDossierPourArchive_(dossier, '', mode, blobs, cdqArchivePlanV2754);
  if (!blobs.length) {
    blobs.push(Utilities.newBlob('Dossier vide', 'text/plain', 'DOSSIER_VIDE.txt'));
  }
  if(cdqArchivePlanV2754)cdqReportEngineArchiveCollectedV2754_(cdqArchivePlanV2754);
  return Utilities.zip(blobs, nettoyerNomArchive_(dossier.getName()) + '.zip');
}

function creerSignatureSelectionEnvoi_(fichiersIds, dossiersIds, mode, email, idCompagnie) {
  const f = (fichiersIds || []).map(String).filter(Boolean).sort();
  const d = (dossiersIds || []).map(String).filter(Boolean).sort();
  const texte = [
    String(idCompagnie || ''),
    String(email || '').trim().toLowerCase(),
    mode === 'original' ? 'original' : 'convertir',
    'F:' + f.join('|'),
    'D:' + d.join('|')
  ].join('||');
  const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, texte, Utilities.Charset.UTF_8);
  return Utilities.base64EncodeWebSafe(digest).replace(/=+$/g, '');
}

function verifierEnvoiSelectionRecent(fichiersIds, dossiersIds, mode, email, idCompagnie, heures) {
  verifierAcces_();
  const h = Math.max(1, Math.min(168, Number(heures || CDQ_DOUBLE_ENVOI_HEURES_)));
  const limite = Date.now() - h * 60 * 60 * 1000;
  const signature = creerSignatureSelectionEnvoi_(fichiersIds, dossiersIds, mode, email, idCompagnie);
  const trouve = lireHistoriqueEnvoi_(idCompagnie).find(function(item) {
    return item && item.signature === signature && Number(item.timestamp || 0) >= limite;
  });
  return { doublon: !!trouve, timestamp: trouve ? trouve.timestamp : null, heures: h };
}

function enregistrerHistoriqueSelectionEnvoi_(fichiersIds, dossiersIds, mode, email, nomCompagnie, idCompagnie) {
  const historique = lireHistoriqueEnvoi_(idCompagnie);
  historique.unshift({
    timestamp: Date.now(),
    compagnie: String(nomCompagnie || 'Client'),
    email: String(email || ''),
    nombre: (fichiersIds || []).length + (dossiersIds || []).length,
    mode: mode === 'original' ? 'original' : 'convertir',
    signature: creerSignatureSelectionEnvoi_(fichiersIds, dossiersIds, mode, email, idCompagnie)
  });
  ecrireHistoriqueEnvoi_(idCompagnie, historique);
}


function envoyerSelectionSuivi(fichiersIds, dossiersIds, modeEnvoi, email, message, nomCompagnie, idCompagnie, sessionId, forcerDoublon) {
  verifierDroit_('envoi');
  if(Array.isArray(fichiersIds)&&fichiersIds.length>0&&(!Array.isArray(dossiersIds)||!dossiersIds.length))return cdqSendQueueStartV2826_(fichiersIds,email,message,nomCompagnie,idCompagnie,sessionId,!!forcerDoublon);
  cdqSendSourcesV2823_ = [];
  cdqSendClientV2823_ = String(idCompagnie || '').trim();

  fichiersIds = Array.isArray(fichiersIds) ? fichiersIds : [];
  dossiersIds = Array.isArray(dossiersIds) ? dossiersIds : [];
  const mode = 'convertir'; // V28.23: all report deliveries are immutable PDF ZIPs.
  if (!validerAdresseCourriel(email)) throw new Error('Adresse courriel invalide.');
  if (!fichiersIds.length && !dossiersIds.length) throw new Error('Aucun fichier ou dossier sélectionné.');

  idCompagnie = String(idCompagnie || '').trim();
  sessionId = String(sessionId || '').trim() || ('zip-v2823-' + Date.now() + '-' + Math.random().toString(36).slice(2));

  const doublon = verifierEnvoiSelectionRecent(fichiersIds, dossiersIds, mode, email, idCompagnie, CDQ_DOUBLE_ENVOI_HEURES_);
  if (doublon.doublon && !forcerDoublon) {
    throw new Error('CDQ_DOUBLE_ENVOI|' + String(doublon.timestamp || ''));
  }

  const cdqArchiveGuardV2754 = cdqReportEngineArchiveGuardV2754_(dossiersIds, idCompagnie);
  const total = fichiersIds.length + dossiersIds.length;
  const piecesJointes = [];
  const echecs = [];
  const fichiersReussis = [];
  const dossiersReussis = [];
  let termine = 0;

  ecrireProgressionEnvoi_(sessionId, {
    phase: 'conversion', total: total, termine: 0,
    message: mode === 'convertir' ? 'Conversion et préparation...' : 'Préparation sans conversion...'
  });

  fichiersIds.forEach(function(id) {
    id = String(id || '').trim();
    try {
      const fichier = DriveApp.getFileById(id);
      piecesJointes.push(obtenirBlobSelonMode_(fichier, mode));
      fichiersReussis.push(id);
    } catch (e) {
      let nom = 'Fichier';
      try { nom = DriveApp.getFileById(id).getName(); } catch (_) {}
      echecs.push({ type: 'fichier', id: id, nom: nom, message: e && e.message ? e.message : String(e) });
    }
    termine++;
    ecrireProgressionEnvoi_(sessionId, {
      phase: 'conversion', total: total, termine: termine,
      message: 'Élément ' + termine + ' sur ' + total + ' préparé.'
    });
  });

  dossiersIds.forEach(function(id) {
    id = String(id || '').trim();
    try {
      const dossier = DriveApp.getFolderById(id);
      piecesJointes.push(preparerDossierPourEnvoi_(id, mode, cdqArchiveGuardV2754));
      dossiersReussis.push(id);
    } catch (e) {
      let nom = 'Dossier';
      try { nom = DriveApp.getFolderById(id).getName(); } catch (_) {}
      echecs.push({ type: 'dossier', id: id, nom: nom, message: e && e.message ? e.message : String(e) });
    }
    termine++;
    ecrireProgressionEnvoi_(sessionId, {
      phase: 'conversion', total: total, termine: termine,
      message: 'Élément ' + termine + ' sur ' + total + ' préparé.'
    });
  });

  if (!piecesJointes.length) {
    ecrireProgressionEnvoi_(sessionId, {
      phase: 'erreur', total: total, termine: total,
      message: 'Aucun élément n’a pu être préparé.'
    });
    return {
      message: 'Aucun élément n’a été envoyé.',
      total: total,
      envoyes: 0,
      echecs: echecs,
      fichiersEchec: echecs.filter(function(x){return x.type==='fichier';}).map(function(x){return x.id;}),
      dossiersEchec: echecs.filter(function(x){return x.type==='dossier';}).map(function(x){return x.id;}),
      mode: mode,
      timestamp: Date.now()
    };
  }

  const deliveryV2823 = mode === 'convertir' ? cdqPrepareSendZipV2823_(piecesJointes, idCompagnie, nomCompagnie, sessionId, echecs) : null;
  const archivePdfsV2823 = deliveryV2823 ? deliveryV2823.pdfs : piecesJointes;
  const date = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  const sujet = 'Rapports d’étalonnages - ' + (nomCompagnie || 'Client') + ' - ' + date;
  const corps = message && String(message).trim()
    ? String(message)
    : ('Bonjour,\n\nVeuillez trouver ci-joint les éléments d’étalonnage de ' + (nomCompagnie || 'votre entreprise') + '.\n\nMerci.');

  ecrireProgressionEnvoi_(sessionId, {
    phase: 'envoi', total: total, termine: total,
    message: echecs.length ? 'Envoi des éléments préparés...' : 'Envoi du courriel...'
  });

  cdqReportEngineArchiveGuardV2754_(dossiersIds, idCompagnie, cdqArchiveGuardV2754);
  const cdqPortalMailOutcomeV20261030 = deliveryV2823
    ? cdqSendEmailZipV2823_(deliveryV2823,email,sujet,corps,CONFIG.NOM_EXPEDITEUR,idCompagnie,!!forcerDoublon)
    : cdqEmailPortalSendV20261030_(email,sujet,corps,piecesJointes,CONFIG.NOM_EXPEDITEUR,idCompagnie,mode);

  let archiveEnvoi = null;
  let archiveErreur = '';
  if (archivePdfsV2823.some(cdqArchiveIsPdfBlobV2622_)) {
    try {
      archiveEnvoi = deliveryV2823 ? cdqDeliveryQueuedReceiptV2825_(deliveryV2823,idCompagnie) : cdqArchiverPiecesEnvoyeesV2622_(archivePdfsV2823, idCompagnie, {
        sessionId: sessionId,
        email: email,
        nomCompagnie: nomCompagnie,
        sourceFileIds: deliveryV2823 ? deliveryV2823.sourceIds : fichiersReussis.concat(dossiersReussis),
        sourceMode: mode
      });
      if (deliveryV2823) cdqSendCheckPortalResultV2823_(archiveEnvoi);
    } catch (archiveError) {
      archiveErreur = archiveError && archiveError.message ? archiveError.message : String(archiveError);
      console.log('CDQ V26.22 archivage après envoi impossible : ' + archiveErreur);
    }
  }

  enregistrerHistoriqueSelectionEnvoi_(fichiersReussis, dossiersReussis, mode, email, nomCompagnie, idCompagnie);
  const messageTermine = archiveErreur
    ? 'Courriel envoyé; archive non créée : ' + archiveErreur
    : (echecs.length ? 'Envoi terminé avec ' + echecs.length + ' erreur(s).' : 'Envoi terminé.');
  ecrireProgressionEnvoi_(sessionId, {
    phase: 'termine', total: total, termine: total,
    message: messageTermine
  });

  const messageBase = echecs.length
    ? (piecesJointes.length + ' élément(s) envoyé(s), ' + echecs.length + ' en erreur.')
    : (mode === 'convertir' ? 'Courriel envoyé avec un ZIP contenant ' + deliveryV2823.pdfCount + ' PDF non modifiable(s).' : 'Courriel envoyé sans conversion.');
  const messageFinal = archiveErreur
    ? messageBase + ' Le courriel est parti, mais l’archive n’a pas pu être créée.'
    : (archiveEnvoi && archiveEnvoi.archives
        ? messageBase + ' ' + archiveEnvoi.archives + ' PDF archivé(s) dans ' + archiveEnvoi.chemin + '.'
        : messageBase);

  return {
    lienClientInclus: cdqPortalMailOutcomeV20261030.linkIncluded,
    statutLienClient: cdqPortalMailOutcomeV20261030.status,
    message: messageFinal+(archiveEnvoi&&archiveEnvoi.portalPending?' L’archivage et la mise à jour de la page client se poursuivent automatiquement.':''),
    total: total,
    envoyes: piecesJointes.length,
    pdfsEnvoyes: deliveryV2823 ? deliveryV2823.pdfCount : null,
    zip: deliveryV2823 ? deliveryV2823.zipName : null,
    echecs: echecs,
    fichiersEchec: echecs.filter(function(x){return x.type==='fichier';}).map(function(x){return x.id;}),
    dossiersEchec: echecs.filter(function(x){return x.type==='dossier';}).map(function(x){return x.id;}),
    mode: mode,
    archive: archiveEnvoi,
    archiveErreur: archiveErreur,
    timestamp: Date.now()
  };
}



/* =====================================================
   DIAGNOSTIC ADMINISTRATEUR
===================================================== */
function obtenirDiagnosticApplication() {
  const acces = verifierDroit_('administration');
  const resultat = {
    serveur: 'Apps Script',
    versionBackend: CDQ_BACKEND_BUILD_,
    horodatage: new Date().toISOString(),
    utilisateur: acces.email,
    role: acces.role,
    fuseauHoraire: Session.getScriptTimeZone(),
    dossierPrincipal: CONFIG.MASTER_FOLDER_ID,
    drive: 'inconnu',
    cacheCompagnies: 'inconnu'
  };

  try {
    const dossier = DriveApp.getFolderById(CONFIG.MASTER_FOLDER_ID);
    resultat.drive = dossier ? 'OK' : 'Erreur';
    resultat.nomDossierPrincipal = dossier.getName();
  } catch (e) {
    resultat.drive = 'ERREUR : ' + (e && e.message ? e.message : String(e));
  }

  try {
    resultat.cacheCompagnies = CacheService.getScriptCache().get('LISTE_COMPAGNIES_V8_UI') ? 'présent' : 'vide';
  } catch (e) {
    resultat.cacheCompagnies = 'indisponible';
  }

  try {
    resultat.nombreUtilisateurs = obtenirUtilisateursAutorises_().length;
  } catch (e) {}

  return resultat;
}

/* =====================================================
   CRÉATION MULTI-COMPAGNIES — PROPRIÉTAIRE PRINCIPAL SEULEMENT
   Cette API est volontairement refusée à tous les autres comptes,
   même s'ils possèdent le rôle « admin » dans l'application.
===================================================== */
function verifierProprietairePrincipal_() {
  const acces = verifierAcces_();
  const principal = String(obtenirAdministrateurPrincipal_() || '').trim().toLowerCase();
  const email = String(acces && acces.email || '').trim().toLowerCase();
  if (!principal || email !== principal) {
    throw new Error('ACTION RÉSERVÉE AU PROPRIÉTAIRE PRINCIPAL.');
  }
  return acces;
}

function normaliserNomsDossiersLot_(valeurs, maximum, libelle) {
  if (!Array.isArray(valeurs)) valeurs = [];
  const vus = {};
  const propres = [];
  valeurs.forEach(function(valeur) {
    const nom = String(valeur || '').trim();
    if (!nom) return;
    if (nom.length > 200) throw new Error((libelle || 'Nom') + ' trop long : ' + nom.substring(0, 40));
    const cle = nom.toLocaleLowerCase();
    if (vus[cle]) return;
    vus[cle] = true;
    propres.push(nom);
  });
  if (!propres.length) throw new Error('Aucun ' + String(libelle || 'nom').toLowerCase() + ' fourni.');
  if (propres.length > maximum) throw new Error('Maximum ' + maximum + ' ' + String(libelle || 'noms').toLowerCase() + ' par opération.');
  return propres;
}

function verifierDossierClientDirect_(dossier) {
  const idPrincipal = String(CONFIG.MASTER_FOLDER_ID || '');
  const parents = dossier.getParents();
  while (parents.hasNext()) {
    if (String(parents.next().getId()) === idPrincipal) return true;
  }
  return false;
}

function obtenirOuCreerDossierParNom_(parent, nom) {
  const existants = parent.getFoldersByName(nom);
  if (existants.hasNext()) {
    return { dossier: existants.next(), cree: false };
  }
  return { dossier: parent.createFolder(nom), cree: true };
}

function creerDossiersEnLotPrive(compagnieIds, nomsDossiers, nomsSousDossiers) {
  verifierProprietairePrincipal_();

  if (!Array.isArray(compagnieIds)) compagnieIds = [];
  const ids = [];
  const vusIds = {};
  compagnieIds.forEach(function(id) {
    id = String(id || '').trim();
    if (!id || vusIds[id]) return;
    vusIds[id] = true;
    ids.push(id);
  });

  if (!ids.length) throw new Error('Aucune compagnie sélectionnée.');
  // L'interface envoie les compagnies par petits lots pour éviter les délais Apps Script.
  if (ids.length > 25) throw new Error('Lot trop grand : maximum 25 compagnies par appel.');

  const racines = normaliserNomsDossiersLot_(nomsDossiers, 25, 'nom de dossier');
  const sous = Array.isArray(nomsSousDossiers) && nomsSousDossiers.length
    ? normaliserNomsDossiersLot_(nomsSousDossiers, 30, 'nom de sous-dossier')
    : [];

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    let dossiersCrees = 0;
    let sousDossiersCrees = 0;
    let existants = 0;
    const erreurs = [];

    ids.forEach(function(idCompagnie) {
      try {
        const compagnie = DriveApp.getFolderById(idCompagnie);
        if (!verifierDossierClientDirect_(compagnie)) {
          throw new Error('Le dossier ciblé n’est pas un dossier client direct autorisé.');
        }

        racines.forEach(function(nomDossier) {
          const resultatRacine = obtenirOuCreerDossierParNom_(compagnie, nomDossier);
          if (resultatRacine.cree) dossiersCrees++;
          else existants++;

          sous.forEach(function(nomSousDossier) {
            const resultatSous = obtenirOuCreerDossierParNom_(resultatRacine.dossier, nomSousDossier);
            if (resultatSous.cree) sousDossiersCrees++;
            else existants++;
          });
        });

        invaliderCacheContenuClient_(idCompagnie);
      } catch (e) {
        erreurs.push({ id: idCompagnie, message: e && e.message ? e.message : String(e) });
      }
    });

    return {
      compagniesTraitees: ids.length,
      dossiersCrees: dossiersCrees,
      sousDossiersCrees: sousDossiersCrees,
      existants: existants,
      erreurs: erreurs
    };
  } finally {
    lock.releaseLock();
  }
}

/* =====================================================
   CDQ V19 — HORS LIGNE / PHOTOS / INVENTAIRE
   IMPORTANT :
   - Toute logique sensible reste côté serveur.
   - Le dossier système est masqué de la liste des clients.
===================================================== */

const CDQ_V19_BUILD_ = '2026.09.15.1136-v21.32';
const CDQ_SYSTEM_FOLDER_NAME_ = '_CDQ_SYSTEME';
const CDQ_PHOTOS_FOLDER_NAME_ = 'PHOTOS';
const CDQ_PHOTO_INDEX_CACHE_KEY_ = 'CDQ_PHOTO_INDEX_V2';

function invaliderIndexPhotosCDQ_() {
  try { CacheService.getScriptCache().remove(CDQ_PHOTO_INDEX_CACHE_KEY_); } catch(e) {}
}

function construireIndexPhotosCDQ_() {
  const cache = CacheService.getScriptCache();
  try {
    const brut = cache.get(CDQ_PHOTO_INDEX_CACHE_KEY_);
    if (brut) return JSON.parse(brut);
  } catch(e) {}
  const index = {};
  const systeme = obtenirDossierSystemeCDQ_();
  const dossiers = systeme.getFolders();
  while (dossiers.hasNext()) {
    const d = dossiers.next();
    if (d.getName() === CDQ_PHOTOS_FOLDER_NAME_) {
      // Les anciennes pièces jointes restent visibles à leur emplacement actuel.
      const anciens = d.getFolders();
      while (anciens.hasNext()) {
        const ancien = anciens.next(), meta = lireMetaPhotoCDQ_(ancien);
        if (meta.type && meta.id && ancien.getFiles().hasNext()) {
          index[String(meta.type).toLowerCase() + ':' + meta.id] = true;
        }
      }
    }
    if (lireMetaPhotoCDQ_(d).cdqPhotoClientId) {
      parcourirPhotosClientCDQ_(d, function(f) {
        const meta = lireMetaPhotoCDQ_(f);
        if (meta.type && meta.cibleId) index[meta.type + ':' + meta.cibleId] = true;
      });
    }
  }
  try { cache.put(CDQ_PHOTO_INDEX_CACHE_KEY_, JSON.stringify(index), 120); } catch(e) {}
  return index;
}

function photoPresenteDansIndexCDQ_(index, type, id) {
  return !!(index && index[String(type || '').toLowerCase() + ':' + String(id || '')]);
}

function obtenirEtatPhotosCibles(cibles) {
  verifierDroit_('lecture');
  if (!Array.isArray(cibles)) cibles = [];
  if (cibles.length > 700) throw new Error('Trop d’éléments à vérifier en une seule fois.');
  const index = construireIndexPhotosCDQ_();
  return cibles.map(function(c){
    const type = String(c && c.type || '').toLowerCase();
    const id = String(c && c.id || '');
    return { type:type, id:id, photoPresente:photoPresenteDansIndexCDQ_(index,type,id) };
  });
}

const CDQ_INVENTAIRE_SPREADSHEET_NAME_ = '_CDQ_Inventaire';
const CDQ_INVENTAIRE_PROP_ID_ = 'CDQ_INVENTAIRE_SPREADSHEET_ID_V1';
const CDQ_OFFLINE_MAX_CELLS_PAR_ONGLET_ = 30000;
const CDQ_OFFLINE_MAX_ONGLETS_ = 20;
const CDQ_PHOTO_MAX_BASE64_ = 8 * 1024 * 1024;

function estDossierSystemeCDQ_(dossier) {
  try {
    const nom = String(dossier && dossier.getName ? dossier.getName() : '');
    return nom === CDQ_SYSTEM_FOLDER_NAME_ || nom.indexOf('_CDQ_') === 0;
  } catch (e) {
    return false;
  }
}

function obtenirDossierSystemeCDQ_() {
  const master = DriveApp.getFolderById(CONFIG.MASTER_FOLDER_ID);
  const existants = master.getFoldersByName(CDQ_SYSTEM_FOLDER_NAME_);
  if (existants.hasNext()) return existants.next();
  const dossier = master.createFolder(CDQ_SYSTEM_FOLDER_NAME_);
  try { dossier.setDescription('Dossier système privé de Rapports D’étalonnages CDQ.'); } catch(e) {}
  invaliderCacheCompagnies_();
  return dossier;
}

function obtenirSousDossierSystemeCDQ_(nom) {
  const parent = obtenirDossierSystemeCDQ_();
  const existants = parent.getFoldersByName(String(nom || '').trim());
  if (existants.hasNext()) return existants.next();
  return parent.createFolder(String(nom || '').trim());
}

function dossierEstSousAncetreCDQ_(dossier, ancetreId) {
  ancetreId = String(ancetreId || '');
  if (!dossier || !ancetreId) return false;
  const vus = {};
  let file = [dossier];
  let garde = 0;
  while (file.length && garde++ < 80) {
    const courant = file.shift();
    let id = '';
    try { id = String(courant.getId()); } catch(e) { continue; }
    if (id === ancetreId) return true;
    if (vus[id]) continue;
    vus[id] = true;
    try {
      const parents = courant.getParents();
      while (parents.hasNext()) file.push(parents.next());
    } catch(e) {}
  }
  return false;
}

function fichierEstDansClientCDQ_(fichier, idCompagnie) {
  idCompagnie = String(idCompagnie || '');
  if (!fichier || !idCompagnie) return false;
  try {
    const parents = fichier.getParents();
    while (parents.hasNext()) {
      if (dossierEstSousAncetreCDQ_(parents.next(), idCompagnie)) return true;
    }
  } catch(e) {}
  return false;
}

function verifierCibleDansMasterCDQ_(type, id) {
  type = String(type || '').toLowerCase();
  id = String(id || '').trim();
  if (!id) throw new Error('Cible invalide.');

  if (type === 'client' || type === 'dossier') {
    const dossier = DriveApp.getFolderById(id);
    if (!dossierEstSousAncetreCDQ_(dossier, CONFIG.MASTER_FOLDER_ID)) {
      throw new Error('Cible hors de l’espace CDQ.');
    }
    return true;
  }

  if (type === 'fichier') {
    const fichier = DriveApp.getFileById(id);
    const parents = fichier.getParents();
    while (parents.hasNext()) {
      if (dossierEstSousAncetreCDQ_(parents.next(), CONFIG.MASTER_FOLDER_ID)) return true;
    }
    throw new Error('Fichier hors de l’espace CDQ.');
  }

  throw new Error('Type de cible non supporté.');
}

/* =====================================================
   PRÉPARATION AUTOMATIQUE HORS LIGNE D’UN CLIENT
===================================================== */

function collecterGoogleSheetsClientCDQ_(dossier, resultats) {
  if (!dossier || estDossierSystemeCDQ_(dossier)) return;

  const fichiers = dossier.getFiles();
  while (fichiers.hasNext()) {
    const f = fichiers.next();
    if (f.getMimeType() === MimeType.GOOGLE_SHEETS || f.getMimeType() === 'application/pdf') {
      resultats.push({
        type: f.getMimeType() === MimeType.GOOGLE_SHEETS ? 'GOOGLE_SHEETS' : 'PDF',
        id: f.getId(),
        nom: f.getName(),
        dateModification: f.getLastUpdated().toISOString()
      });
    }
  }

  const dossiers = dossier.getFolders();
  while (dossiers.hasNext()) {
    const sous = dossiers.next();
    if (estDossierSystemeCDQ_(sous)) continue;
    collecterGoogleSheetsClientCDQ_(sous, resultats);
  }
}

function obtenirManifestHorsLigneClient(idCompagnie) {
  verifierDroit_('lecture');
  idCompagnie = String(idCompagnie || '').trim();
  if (!idCompagnie) throw new Error('Compagnie non sélectionnée.');

  const client = DriveApp.getFolderById(idCompagnie);
  if (!verifierDossierClientDirect_(client)) {
    throw new Error('Ce dossier n’est pas un client direct autorisé.');
  }

  const fichiers = [];
  collecterGoogleSheetsClientCDQ_(client, fichiers);
  fichiers.sort(function(a,b){ return String(a.nom).localeCompare(String(b.nom), 'fr', {sensitivity:'base'}); });

  return {
    build: CDQ_V19_BUILD_,
    client: { id: idCompagnie, nom: client.getName() },
    fichiers: fichiers,
    total: fichiers.length,
    genereLe: Date.now()
  };
}

function obtenirSnapshotGoogleSheetHorsLigne(fichierId, idCompagnie) {
  verifierDroit_('lecture');
  fichierId = String(fichierId || '').trim();
  idCompagnie = String(idCompagnie || '').trim();

  const fichier = DriveApp.getFileById(fichierId);
  if (fichier.getMimeType() !== MimeType.GOOGLE_SHEETS) {
    throw new Error('Le fichier demandé n’est pas un Google Sheets.');
  }
  if (!fichierEstDansClientCDQ_(fichier, idCompagnie)) {
    throw new Error('Ce fichier ne fait pas partie du client sélectionné.');
  }

  const classeur = SpreadsheetApp.openById(fichierId);
  const onglets = [];
  const feuilles = classeur.getSheets().slice(0, CDQ_OFFLINE_MAX_ONGLETS_);

  feuilles.forEach(function(feuille) {
    const lastRow = Math.max(0, feuille.getLastRow());
    const lastCol = Math.max(0, feuille.getLastColumn());

    if (!lastRow || !lastCol) {
      onglets.push({
        nom: feuille.getName(),
        valeurs: [],
        lignes: 0,
        colonnes: 0,
        tronque: false
      });
      return;
    }

    const colonnes = Math.min(lastCol, 120);
    const maxRowsByCells = Math.max(1, Math.floor(CDQ_OFFLINE_MAX_CELLS_PAR_ONGLET_ / colonnes));
    const lignes = Math.min(lastRow, maxRowsByCells);
    const valeurs = feuille.getRange(1,1,lignes,colonnes).getDisplayValues();

    onglets.push({
      nom: feuille.getName(),
      valeurs: valeurs,
      lignes: lignes,
      colonnes: colonnes,
      lignesOriginales: lastRow,
      colonnesOriginales: lastCol,
      tronque: lignes < lastRow || colonnes < lastCol,
      frozenRows: feuille.getFrozenRows(),
      frozenColumns: feuille.getFrozenColumns()
    });
  });

  return {
    build: CDQ_V19_BUILD_,
    id: fichierId,
    nom: fichier.getName(),
    dateModification: fichier.getLastUpdated().toISOString(),
    onglets: onglets,
    lectureSeule: true,
    genereLe: Date.now()
  };
}

// =====================================================
// V22.92 — CLASSEMENT LISIBLE DES PHOTOS ET NOTES
// _CDQ_SYSTEME / Photos|Notes / Compagnie / Date - Technicien / fichier
// =====================================================
function cdqNomArchiveV2292_(v,repli){
  let s=String(v||repli||'').replace(/[\\/:*?"<>|\u0000-\u001F]+/g,' - ').replace(/\s+/g,' ').trim();
  if(!s)s=String(repli||'Sans nom');
  return s.slice(0,110);
}
function cdqTechnicienArchiveV2292_(email){
  email=normaliserEmailCDQ_(email);let nom='';
  try{nom=cdqObtenirProfilTechnicien_(email).nomRapport||'';}catch(e){}
  if(!nom&&email)nom=email.split('@')[0].replace(/[._-]+/g,' ');
  return cdqNomArchiveV2292_(nom,'Technicien');
}
function cdqRacineArchiveV2292_(nom,creer){
  const sys=obtenirDossierSystemeCDQ_(),it=sys.getFoldersByName(nom);
  if(it.hasNext())return it.next();
  return creer?sys.createFolder(nom):null;
}
function cdqDossierCompagnieArchiveV2292_(racine,client,creer){
  if(!racine)return null;const id=String(client.getId()),it=racine.getFolders();let parNom=null;
  while(it.hasNext()){
    const d=it.next(),m=lireMetaPhotoCDQ_(d);
    if(String(m.cdqArchiveClientId||m.cdqPhotoClientId||'')===id){if(creer&&d.getName()!==client.getName())d.setName(client.getName());return d;}
    if(!parNom&&d.getName()===client.getName()&&!m.cdqArchiveClientId&&!m.cdqPhotoClientId)parNom=d;
  }
  if(parNom){if(creer)parNom.setDescription(JSON.stringify({cdqArchiveClientId:id,version:92}));return parNom;}
  if(!creer)return null;
  const d=racine.createFolder(cdqNomArchiveV2292_(client.getName(),'Client'));
  d.setDescription(JSON.stringify({cdqArchiveClientId:id,version:92}));return d;
}
function cdqCibleArchiveV2292_(type,id,client){
  try{
    type=String(type||'').toLowerCase();
    if(type==='client')return '';
    const clientId=String(client&&client.getId?client.getId():'');
    const clientNom=String(client&&client.getName?client.getName():'').trim().toLowerCase();

    if(type==='dossier'){
      const d=DriveApp.getFolderById(id);
      if(String(d.getId())===clientId)return '';
      const n=String(d.getName()||'').trim();
      if(!n||n.toLowerCase()===clientNom)return '';
      return cdqNomArchiveV2292_(n,'');
    }

    if(type==='fichier'){
      const f=DriveApp.getFileById(id);
      const structure={
        'certficat de poid étalon':1,
        'certificat de poids étalon':1,
        'contrat':1,
        'liste de balance':1,
        "rapports d'étalonnages":1,
        "rapports d'étalonnage":1,
        'rapports':1
      };
      const attente=[],vus={};
      const parents=f.getParents();while(parents.hasNext())attente.push(parents.next());
      let garde=0;
      while(attente.length&&garde++<40){
        const d=attente.shift(),did=String(d.getId());
        if(vus[did])continue;vus[did]=1;
        if(did===clientId)break;
        const nom=String(d.getName()||'').trim();
        const low=nom.toLowerCase();
        if(nom && low!==clientNom && !structure[low] && low.indexOf('_cdq_')!==0){
          return cdqNomArchiveV2292_(nom,'');
        }
        const ps=d.getParents();while(ps.hasNext())attente.push(ps.next());
      }
      let n=String(f.getName()||'').replace(/\.(pdf|xlsx?|xlsm|csv)$/i,'').trim();
      if(!n||n.toLowerCase()===clientNom)return '';
      return cdqNomArchiveV2292_(n,'');
    }
    return '';
  }catch(e){return '';}
}
function cdqBaseNomArchiveV2292_(prefixe,client,tech,cible){
  return [prefixe,cdqNomArchiveV2292_(client.getName(),'Client'),tech,cible].filter(Boolean).join(' - ');
}
function cdqExtensionPhotoV2292_(mime,original){
  const m=String(original||'').match(/\.([A-Za-z0-9]{2,8})$/);if(m)return'.'+m[1].toLowerCase();
  mime=String(mime||'').toLowerCase();if(mime==='image/png')return'.png';if(mime==='image/webp')return'.webp';if(/heic|heif/.test(mime))return'.heic';return'.jpg';
}
function obtenirDossierPhotosClientLegacyV2292_(client){
  const sys=obtenirDossierSystemeCDQ_(),it=sys.getFolders();
  while(it.hasNext()){const d=it.next();if(d.getName()==='Photos'||d.getName()==='Notes')continue;if(String(lireMetaPhotoCDQ_(d).cdqPhotoClientId||'')===String(client.getId()))return d;}
  return null;
}
function cdqArchiverNoteV2292_(type,id,note,acces){
  note=String(note||'').trim();if(!note)return null;
  const lock=LockService.getScriptLock();lock.waitLock(30000);
  try{
  const client=obtenirClientPhotoCDQ_(type,id),zone=Session.getScriptTimeZone()||'America/Toronto',now=new Date();
  const jour=Utilities.formatDate(now,zone,'yyyy-MM-dd'),prefixe=jour;
  const tech=cdqTechnicienArchiveV2292_(acces&&acces.email),cible=cdqCibleArchiveV2292_(type,id,client);
  const nom=cdqBaseNomArchiveV2292_(prefixe,client,tech,cible)+'.txt';
  const texte=['Compagnie : '+client.getName(),'Date : '+jour,'Technicien : '+tech,cible?('Balance / cible : '+cible):'','','Note :',note].join('\n');
  const archiveMeta={cdqNoteArchive:true,type:type,cibleId:id,idCompagnie:client.getId(),ajoutePar:acces&&acces.email||'',ajouteLe:now.toISOString(),nomCible:cible,version:92};
  if(PropertiesService.getScriptProperties().getProperty('CDQ_SYSTEM_NOTES_V1')==='on')return cdqCloudArchiveNoteV20261113_(client,nom,texte,archiveMeta,acces);
  const racine=cdqRacineArchiveV2292_('Notes',true),comp=cdqDossierCompagnieArchiveV2292_(racine,client,true);
  const sousNom=cdqNomArchiveV2292_(jour+' - '+tech+(cible?(' - '+cible):''),jour+' - '+tech),its=comp.getFoldersByName(sousNom),dossier=its.hasNext()?its.next():comp.createFolder(sousNom);
  const f=dossier.createFile(nom,texte,MimeType.PLAIN_TEXT);
  f.setDescription(JSON.stringify(archiveMeta));
  return f;
  }finally{lock.releaseLock();}
}

/* =====================================================
   PHOTOS ATTACHÉES AUX CLIENTS / DOSSIERS / FICHIERS
===================================================== */

function cleDossierPhotoCDQ_(type, id) {
  return String(type || '').toUpperCase() + '_' + empreinteCDQ_(String(id || '')).slice(0, 28);
}

function lireMetaPhotoCDQ_(element) {
  try { return JSON.parse(String(element.getDescription() || '{}')) || {}; }
  catch(e) { return {}; }
}

function obtenirClientPhotoCDQ_(type, id) {
  // Résout le vrai client depuis la cible, même depuis l'accueil sans sélection.
  const attente = [], vus = {};
  if (type === 'fichier') {
    const parents = DriveApp.getFileById(id).getParents();
    while (parents.hasNext()) attente.push(parents.next());
  } else if (type === 'client' || type === 'dossier') {
    attente.push(DriveApp.getFolderById(id));
  } else { throw new Error('Type de cible non supporté.'); }
  let garde = 0;
  while (attente.length && garde++ < 80) {
    const dossier = attente.shift(), cle = String(dossier.getId());
    if (vus[cle] || cle === CONFIG.MASTER_FOLDER_ID || estDossierSystemeCDQ_(dossier)) continue;
    vus[cle] = true;
    if (verifierDossierClientDirect_(dossier)) return dossier;
    const parents = dossier.getParents();
    while (parents.hasNext()) attente.push(parents.next());
  }
  throw new Error('La photo doit être rattachée à un client CDQ.');
}

function obtenirDossierPhotosClientCDQ_(client, creer) {
  const systeme = cdqRacineArchiveV2292_('Photos', creer);
  if (!systeme) return null;
  const dossiers = systeme.getFolders();
  while (dossiers.hasNext()) {
    const dossier = dossiers.next();
    if (String(lireMetaPhotoCDQ_(dossier).cdqPhotoClientId || '') === String(client.getId())) {
      if (creer && dossier.getName() !== client.getName()) dossier.setName(client.getName());
      return dossier;
    }
  }
  if (!creer) return null;
  const dossier = systeme.createFolder(client.getName());
  dossier.setDescription(JSON.stringify({cdqPhotoClientId:client.getId(), cdqArchiveClientId:client.getId(), rangement:'Photos/Compagnie/Date-Technicien', version:92}));
  return dossier;
}

function parcourirPhotosClientCDQ_(clientPhotos, visite) {
  if (!clientPhotos) return;
  const dates = clientPhotos.getFolders();
  while (dates.hasNext()) {
    const dossier = dates.next();
    if (!/^\d{4}-\d{2}-\d{2}(?:\s+-\s+.+)?$/.test(dossier.getName())) continue;
    const fichiers = dossier.getFiles();
    while (fichiers.hasNext()) visite(fichiers.next());
  }
}

function obtenirDossierPhotosCibleCDQ_(type, id) {
  // Lecture seulement de l'ancien classement _CDQ_SYSTEME/PHOTOS/TYPE_hash.
  const racines = obtenirDossierSystemeCDQ_().getFoldersByName(CDQ_PHOTOS_FOLDER_NAME_);
  if (!racines.hasNext()) return null;
  const dossiers = racines.next().getFoldersByName(cleDossierPhotoCDQ_(type, id));
  return dossiers.hasNext() ? dossiers.next() : null;
}

function datePrisePhotoCDQ_(meta) {
  meta = meta || {};
  const date = meta.capturedAt ? new Date(meta.capturedAt) : new Date();
  if (!Number.isFinite(date.getTime())) throw new Error('Date de prise de la photo invalide.');
  let locale = date, zone = Session.getScriptTimeZone() || 'America/Toronto';
  if (meta.timezoneOffset !== undefined && meta.timezoneOffset !== null) {
    const offset = Number(meta.timezoneOffset);
    if (!Number.isInteger(offset) || Math.abs(offset) > 840) throw new Error('Fuseau horaire de la photo invalide.');
    locale = new Date(date.getTime() - offset * 60000);
    zone = 'UTC';
  }
  return {capturedAt:date.toISOString(), jour:Utilities.formatDate(locale, zone, 'yyyy-MM-dd'),
    prefixe:Utilities.formatDate(locale, zone, 'yyyyMMdd_HHmmss')};
}

function resultatPhotoCDQ_(fichier, meta) {
  return {id:fichier.getId(), nom:fichier.getName(), date:meta.capturedAt || fichier.getDateCreated().toISOString(),
    url:fichier.getUrl(), taille:fichier.getSize(), type:meta.type, cibleId:meta.cibleId,
    idCompagnie:meta.idCompagnie, datePhoto:meta.datePhoto};
}

function nettoyerNomPhotoCDQ_(nom) {
  nom = String(nom || 'photo.jpg').replace(/[\\/:*?"<>|]+/g, '_').trim();
  if (!nom) nom = 'photo.jpg';
  if (nom.length > 120) nom = nom.slice(-120);
  return nom;
}

function enregistrerPhotoPieceJointe(type, id, dataUrl, nomFichier, idCompagnie, photoMeta) {
  const utilisateur = verifierDroit_('ecriture');
  type = String(type || '').toLowerCase();
  id = String(id || '').trim();
  dataUrl = String(dataUrl || '');
  if (dataUrl.length > CDQ_PHOTO_MAX_BASE64_) throw new Error('La photo est trop volumineuse. Réduisez sa taille.');
  const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/.exec(dataUrl);
  if (!match) throw new Error('Format de photo invalide.');
  const client = obtenirClientPhotoCDQ_(type, id);
  const date = datePrisePhotoCDQ_(photoMeta);
  const technicien = cdqTechnicienArchiveV2292_(utilisateur.email);
  const cible = cdqCibleArchiveV2292_(type, id, client);
  const uploadId = String(photoMeta && photoMeta.uploadId || '').slice(0,160);
  const bytes = Utilities.base64Decode(match[2]);
  const nom = cdqBaseNomArchiveV2292_(date.jour, client, technicien, cible) + cdqExtensionPhotoV2292_(match[1], nomFichier);
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  let resultat;
  try {
    // Sous le verrou : aucun doublon de dossier lors de prises simultanées.
    const clientPhotos = obtenirDossierPhotosClientCDQ_(client, true);
    const nomSousDossier = cdqNomArchiveV2292_(date.jour + ' - ' + technicien + (cible ? ' - ' + cible : ''), date.jour + ' - ' + technicien);
    const dates = clientPhotos.getFoldersByName(nomSousDossier);
    const dossier = dates.hasNext() ? dates.next() : clientPhotos.createFolder(nomSousDossier);
    if (uploadId) {
      const existants = dossier.getFiles();
      while (existants.hasNext()) {
        const f = existants.next(), meta = lireMetaPhotoCDQ_(f);
        if (meta.uploadId === uploadId && meta.type === type && meta.cibleId === id) {
          resultat = resultatPhotoCDQ_(f, meta);
          break;
        }
      }
    }
    if (!resultat) {
      const fichier = dossier.createFile(Utilities.newBlob(bytes, match[1], nom));
      const meta = {type:type, cibleId:id, idCompagnie:client.getId(), capturedAt:date.capturedAt,
        datePhoto:date.jour, uploadId:uploadId, ajoutePar:utilisateur.email, ajouteLe:new Date().toISOString(),
        technicien:technicien, nomCompagnie:client.getName(), nomCible:cible, rangement:'Photos/Compagnie/Date-Technicien', version:92};
      try { fichier.setDescription(JSON.stringify(meta)); }
      catch(e) { fichier.setTrashed(true); throw e; }
      resultat = resultatPhotoCDQ_(fichier, meta);
    }
  } finally { lock.releaseLock(); }
  invaliderIndexPhotosCDQ_();
  invaliderCacheContenuClient_(client.getId());
  if (type === 'client') invaliderCacheCompagnies_();
  return resultat;
}

function obtenirPhotosPieceJointe(type, id) {
  verifierDroit_('lecture');
  type = String(type || '').toLowerCase();
  id = String(id || '').trim();
  const client = obtenirClientPhotoCDQ_(type, id), resultat = [], vus = {};
  function ajouter(f, ancien) {
    const meta = lireMetaPhotoCDQ_(f);
    if (!ancien && (meta.type !== type || String(meta.cibleId || '') !== id)) return;
    if (vus[f.getId()]) return;
    vus[f.getId()] = true;
    resultat.push(resultatPhotoCDQ_(f, meta));
  }
  parcourirPhotosClientCDQ_(obtenirDossierPhotosClientCDQ_(client, false), function(f){ ajouter(f, false); });
  parcourirPhotosClientCDQ_(obtenirDossierPhotosClientLegacyV2292_(client), function(f){ ajouter(f, false); });
  const ancien = obtenirDossierPhotosCibleCDQ_(type, id);
  if (ancien) {
    const fichiers = ancien.getFiles();
    while (fichiers.hasNext()) ajouter(fichiers.next(), true);
  }
  resultat.sort(function(a,b){ return new Date(b.date) - new Date(a.date); });
  return resultat;
}

function supprimerPhotoPieceJointe(photoId) {
  verifierDroit_('ecriture');
  photoId = String(photoId || '').trim();
  const f = DriveApp.getFileById(photoId);
  // Vérification : la photo doit être dans le dossier système CDQ.
  let autorisee = false;
  const parents = f.getParents();
  while (parents.hasNext()) {
    if (dossierEstSousAncetreCDQ_(parents.next(), obtenirDossierSystemeCDQ_().getId())) {
      autorisee = true;
      break;
    }
  }
  if (!autorisee) throw new Error('Photo hors de l’espace système CDQ.');

  let meta = {};
  try { meta = JSON.parse(String(f.getDescription() || '{}')); } catch(e) { meta = {}; }
  if (!/^image\//.test(f.getMimeType()) || !meta.type || !meta.cibleId) {
    throw new Error('Ce fichier n’est pas une photo jointe CDQ.');
  }
  f.setTrashed(true);
  invaliderIndexPhotosCDQ_();
  if (String(meta.idCompagnie || '').trim()) invaliderCacheContenuClient_(String(meta.idCompagnie || '').trim());
  if (String(meta.type || '').toLowerCase() === 'client') invaliderCacheCompagnies_();
  return { ok:true, id:photoId, type:String(meta.type || ''), cibleId:String(meta.cibleId || '') };
}

/* =====================================================
   INVENTAIRE V20
   - Seuls les administrateurs créent les articles/lignes.
   - Seuls les administrateurs ajustent/ajoutent le stock Shop.
   - Les techniciens voient Shop + tous les camions.
   - Un technicien peut transférer entre son camion et Shop
     ou entre son camion et le camion d'un autre technicien.
   - Historique complet des mouvements.
   - Classement par section + fournisseur/marque.
   - Alerte de stock bas basée sur le TOTAL Shop + tous camions.
===================================================== */

const CDQ_INV_HEADERS_ARTICLES_ = [
  'articleId','numero','description','categorie','fabricant',
  'minimumCamion','minimumShop','actif','majLe','modele'
];

const CDQ_INV_CATEGORIES_DEFAUT_ = [
  'Indicateurs','Cellules de charge','Cartes de sommation'
];
const CDQ_INV_FABRICANTS_DEFAUT_ = [
  'Rice Lake','Avery Weigh-Tronics','Total Comp','Mettler Toledo','AnyLoad'
];

const CDQ_INV_FABRICANTS_PAR_CATEGORIE_ = {
  'Cellules de charge': ['Rice Lake','Mettler Toledo','AnyLoad']
};
const CDQ_INV_HEADERS_STOCK_ = [
  'emplacementId','emplacementNom','articleId','quantite','majLe'
];
const CDQ_INV_HEADERS_MOUVEMENTS_ = [
  'date','articleId','numero','description','quantite',
  'origineId','origineNom','destinationId','destinationNom',
  'utilisateur','type','note'
];
const CDQ_INV_HEADERS_ALERTES_ = [
  'alerteId','dateCreation','dateMaj','articleId','numero','description',
  'total','seuil','destinataire','etat','dateResolution'
];

const CDQ_INV_PROP_ACHETEUR_ = 'CDQ_INV_ACHETEUR_EMAIL_V20';
const CDQ_INV_PROP_SEUIL_ = 'CDQ_INV_SEUIL_GLOBAL_V20';
const CDQ_INV_SEUIL_DEFAUT_ = 3;

function assurerEntetesInventaireCDQ_(feuille, entetes) {
  if (feuille.getMaxColumns() < entetes.length) {
    feuille.insertColumnsAfter(feuille.getMaxColumns(), entetes.length - feuille.getMaxColumns());
  }
  const actuel = feuille.getRange(1,1,1,entetes.length).getValues()[0];
  let different = false;
  for (let i=0;i<entetes.length;i++) {
    if (String(actuel[i] || '') !== entetes[i]) { different = true; break; }
  }
  if (different) feuille.getRange(1,1,1,entetes.length).setValues([entetes]);
  feuille.setFrozenRows(1);
}

function obtenirClasseurInventaireCDQ_() {
  const props = PropertiesService.getScriptProperties();
  let id = String(props.getProperty(CDQ_INVENTAIRE_PROP_ID_) || '').trim();
  let ss = null;

  // Ouvre d'abord le classeur existant sans verrou lorsque possible.
  if (id) {
    try { ss = SpreadsheetApp.openById(id); } catch(e) { ss = null; }
  }

  // Première création : verrou global pour empêcher deux appels simultanés
  // (inventaire + alerte de fond) de créer deux classeurs concurrents.
  if (!ss) {
    const lock = LockService.getScriptLock();
    lock.waitLock(20000);
    try {
      id = String(props.getProperty(CDQ_INVENTAIRE_PROP_ID_) || '').trim();
      if (id) {
        try { ss = SpreadsheetApp.openById(id); } catch(e) { ss = null; }
      }

      if (!ss) {
        ss = SpreadsheetApp.create(CDQ_INVENTAIRE_SPREADSHEET_NAME_, 100, 12);
        id = ss.getId();
        props.setProperty(CDQ_INVENTAIRE_PROP_ID_, id);
        // Le déplacement est utile mais ne doit jamais empêcher l'inventaire de fonctionner.
        try { DriveApp.getFileById(id).moveTo(obtenirDossierSystemeCDQ_()); } catch(e) {
          console.log('Inventaire créé mais déplacement dans _CDQ_SYSTEME impossible : ' + (e && e.message ? e.message : String(e)));
        }
      }
    } finally {
      try { lock.releaseLock(); } catch(e) {}
    }
  }

  if (!ss) throw new Error('Impossible d’ouvrir ou de créer le classeur d’inventaire CDQ.');

  let articles = ss.getSheetByName('Articles');
  if (!articles) {
    articles = ss.getSheets()[0];
    articles.setName('Articles');
  }
  let stock = ss.getSheetByName('Stock');
  if (!stock) stock = ss.insertSheet('Stock');
  let mouvements = ss.getSheetByName('Mouvements');
  if (!mouvements) mouvements = ss.insertSheet('Mouvements');
  let alertes = ss.getSheetByName('Alertes');
  if (!alertes) alertes = ss.insertSheet('Alertes');

  assurerEntetesInventaireCDQ_(articles, CDQ_INV_HEADERS_ARTICLES_);
  assurerEntetesInventaireCDQ_(stock, CDQ_INV_HEADERS_STOCK_);
  assurerEntetesInventaireCDQ_(mouvements, CDQ_INV_HEADERS_MOUVEMENTS_);
  assurerEntetesInventaireCDQ_(alertes, CDQ_INV_HEADERS_ALERTES_);

  return { ss:ss, articles:articles, stock:stock, mouvements:mouvements, alertes:alertes };
}

function lignesObjetsInventaireCDQ_(feuille, entetes) {
  const lr = feuille.getLastRow();
  if (lr < 2) return [];
  const valeurs = feuille.getRange(2,1,lr-1,entetes.length).getValues();
  return valeurs.map(function(ligne, idx){
    const obj = { _row:idx + 2 };
    entetes.forEach(function(h,i){
      let v = ligne[i];
      if (v instanceof Date) v = v.toISOString();
      obj[h] = v;
    });
    return obj;
  });
}

function libelleUtilisateurInventaireCDQ_(email) {
  email = normaliserEmailCDQ_(email);
  if (!email) return '';
  const local = String(email.split('@')[0] || '')
    .replace(/[._-]+/g,' ')
    .replace(/\s+/g,' ')
    .trim();
  return local.replace(/\b\w/g,function(c){ return c.toUpperCase(); }) || email;
}

function nomEmplacementInventaireCDQ_(id) {
  id = String(id || '');
  if (id === 'SHOP') return 'Shop';
  if (id.indexOf('CAMION:') === 0) {
    const email = id.slice(7);
    return 'Camion — ' + libelleUtilisateurInventaireCDQ_(email);
  }
  if (id === 'AJUSTEMENT') return 'Ajustement';
  return id || 'Emplacement';
}

function emplacementCamionUtilisateurCDQ_(email) {
  return 'CAMION:' + normaliserEmailCDQ_(email);
}

function techniciensInventaireCDQ_() {
  return obtenirUtilisateursAutorises_()
    .filter(function(u){ return u.role === 'technicien' || u.role === 'admin'; })
    .map(function(u){
      return {
        email:u.email,
        role:u.role,
        libelle:libelleUtilisateurInventaireCDQ_(u.email),
        emplacementId:emplacementCamionUtilisateurCDQ_(u.email),
        nom:'Camion — ' + libelleUtilisateurInventaireCDQ_(u.email)
      };
    });
}

function trouverArticleInventaireCDQ_(inv, articleId) {
  articleId = String(articleId || '').trim();
  const articles = lignesObjetsInventaireCDQ_(inv.articles, CDQ_INV_HEADERS_ARTICLES_);
  return articles.find(function(a){ return String(a.articleId) === articleId; }) || null;
}

function trouverStockInventaireCDQ_(inv, emplacementId, articleId) {
  emplacementId = String(emplacementId || '');
  articleId = String(articleId || '');
  const stocks = lignesObjetsInventaireCDQ_(inv.stock, CDQ_INV_HEADERS_STOCK_);
  return stocks.find(function(s){
    return String(s.emplacementId) === emplacementId && String(s.articleId) === articleId;
  }) || null;
}

function ecrireStockInventaireCDQ_(inv, emplacementId, articleId, quantite) {
  const trouve = trouverStockInventaireCDQ_(inv, emplacementId, articleId);
  const now = new Date();
  const ligne = [
    emplacementId,
    nomEmplacementInventaireCDQ_(emplacementId),
    articleId,
    Number(quantite || 0),
    now
  ];
  if (trouve) inv.stock.getRange(trouve._row,1,1,ligne.length).setValues([ligne]);
  else inv.stock.appendRow(ligne);
}

function enregistrerMouvementInventaireCDQ_(inv, article, qte, origineId, destinationId, utilisateur, type, note) {
  inv.mouvements.appendRow([
    new Date(),
    String(article.articleId || ''),
    String(article.numero || ''),
    String(article.description || ''),
    Number(qte || 0),
    String(origineId || ''),
    nomEmplacementInventaireCDQ_(origineId),
    String(destinationId || ''),
    nomEmplacementInventaireCDQ_(destinationId),
    String(utilisateur || ''),
    String(type || 'transfert'),
    String(note || '').slice(0,500)
  ]);
}

function seuilGlobalInventaireCDQ_() {
  const v = Number(PropertiesService.getScriptProperties().getProperty(CDQ_INV_PROP_SEUIL_) || CDQ_INV_SEUIL_DEFAUT_);
  return isFinite(v) && v >= 0 ? Math.floor(v) : CDQ_INV_SEUIL_DEFAUT_;
}

function detecterAcheteurParDefautCDQ_() {
  const utilisateurs = obtenirUtilisateursAutorises_();
  const motifs = ['spintel','s pintel','pintel','pintal','samuel'];
  for (let i=0;i<utilisateurs.length;i++) {
    const email = normaliserEmailCDQ_(utilisateurs[i].email);
    const normalise = email.replace(/[^a-z0-9]/g,'');
    if (motifs.some(function(m){ return normalise.indexOf(m.replace(/[^a-z0-9]/g,'')) >= 0; })) {
      return email;
    }
  }
  return '';
}

function acheteurInventaireCDQ_() {
  const props = PropertiesService.getScriptProperties();
  let email = normaliserEmailCDQ_(props.getProperty(CDQ_INV_PROP_ACHETEUR_));
  if (email && trouverUtilisateurAutoriseParEmail_(email)) return email;

  email = detecterAcheteurParDefautCDQ_();
  if (email) {
    props.setProperty(CDQ_INV_PROP_ACHETEUR_, email);
    return email;
  }
  return '';
}

function obtenirConfigInventaire() {
  const acces = verifierDroit_('lecture');
  const acheteur = acheteurInventaireCDQ_();
  const utilisateurs = obtenirUtilisateursAutorises_().map(function(u){
    return {
      email:u.email,
      role:normaliserRoleCDQ_(u.role),
      libelle:libelleUtilisateurInventaireCDQ_(u.email)
    };
  });
  return {
    acheteurEmail:acheteur,
    acheteurLibelle:acheteur ? libelleUtilisateurInventaireCDQ_(acheteur) : 'S Pintel — à sélectionner',
    acheteurConfigure:!!acheteur,
    seuilGlobal:seuilGlobalInventaireCDQ_(),
    utilisateurs:utilisateurs,
    peutConfigurer:acces.role === 'admin'
  };
}

function enregistrerConfigInventaire(config) {
  verifierDroit_('administration');
  config = config || {};
  const email = normaliserEmailCDQ_(config.acheteurEmail);
  const seuil = Math.floor(Number(config.seuilGlobal));

  if (email && !trouverUtilisateurAutoriseParEmail_(email)) {
    throw new Error('Le destinataire doit être un utilisateur autorisé de l’application.');
  }
  if (!isFinite(seuil) || seuil < 0 || seuil > 9999) {
    throw new Error('Seuil d’alerte invalide.');
  }

  const props = PropertiesService.getScriptProperties();
  if (email) props.setProperty(CDQ_INV_PROP_ACHETEUR_, email);
  else props.deleteProperty(CDQ_INV_PROP_ACHETEUR_);
  props.setProperty(CDQ_INV_PROP_SEUIL_, String(seuil));

  try { mettreAJourAlertesInventaire_(); } catch(e) {
    console.log('Paramètres inventaire enregistrés; mise à jour des alertes différée : ' + (e && e.message ? e.message : String(e)));
  }
  return obtenirConfigInventaire();
}

function initialiserInventaireCDQ() {
  const acces = verifierDroit_('administration');
  const inv = obtenirClasseurInventaireCDQ_();
  return {
    ok:true,
    build:CDQ_V19_BUILD_,
    classeurId:inv.ss.getId(),
    classeurNom:inv.ss.getName(),
    utilisateur:acces.email,
    feuilles:inv.ss.getSheets().map(function(f){ return f.getName(); })
  };
}

function calculTotauxInventaireCDQ_(inv) {
  const totaux = {};
  lignesObjetsInventaireCDQ_(inv.stock, CDQ_INV_HEADERS_STOCK_).forEach(function(s){
    const id = String(s.articleId || '');
    if (!id) return;
    totaux[id] = Number(totaux[id] || 0) + Math.max(0, Number(s.quantite || 0));
  });
  return totaux;
}

function obtenirAlertesInventaireUtilisateur() {
  const acces = verifierDroit_('lecture');
  mettreAJourAlertesInventaire_();
  const config = obtenirConfigInventaire();
  const inv = obtenirClasseurInventaireCDQ_();
  const toutes = lignesObjetsInventaireCDQ_(inv.alertes, CDQ_INV_HEADERS_ALERTES_)
    .filter(function(a){ return String(a.etat || '').toUpperCase() === 'ACTIF'; })
    .map(function(a){
      return {
        alerteId:String(a.alerteId || ''),
        dateCreation:String(a.dateCreation || ''),
        articleId:String(a.articleId || ''),
        numero:String(a.numero || ''),
        description:String(a.description || ''),
        total:Number(a.total || 0),
        seuil:Number(a.seuil || config.seuilGlobal),
        destinataire:String(a.destinataire || config.acheteurEmail || '')
      };
    });

  const estAcheteur = !!config.acheteurEmail &&
    normaliserEmailCDQ_(acces.email) === normaliserEmailCDQ_(config.acheteurEmail);

  return {
    alertes:(estAcheteur || acces.role === 'admin') ? toutes : [],
    nombreActif:toutes.length,
    estAcheteur:estAcheteur,
    acheteurEmail:config.acheteurEmail,
    acheteurLibelle:config.acheteurLibelle,
    seuilGlobal:config.seuilGlobal
  };
}

function obtenirInventaire(options) {
  const acces = verifierDroit_('lecture');
  const inv = obtenirClasseurInventaireCDQ_();
  options = options || {};
  const rapide = !!options.rapide;

  // V21.3 : ne pas recalculer les alertes pendant l'ouverture du stock.
  // Les alertes ont leur propre onglet, sont recalculées après chaque mouvement
  // et seront aussi gérées par le déclencheur Push lorsqu'il sera activé.
  const articles = lignesObjetsInventaireCDQ_(inv.articles, CDQ_INV_HEADERS_ARTICLES_)
    .filter(function(a){ return String(a.articleId || '').trim() && String(a.actif) !== 'false'; })
    .map(function(a){
      return {
        articleId:String(a.articleId),numero:String(a.numero || ''),description:String(a.description || ''),
        categorie:String(a.categorie || 'Autres'),fabricant:String(a.fabricant || 'Non classé'),
        modele:String(a.modele || a.numero || a.description || ''),
        minimumCamion:Number(a.minimumCamion || 0),minimumShop:Number(a.minimumShop || 0),
        actif:String(a.actif) !== 'false',majLe:String(a.majLe || '')
      };
    });

  const stocks = lignesObjetsInventaireCDQ_(inv.stock, CDQ_INV_HEADERS_STOCK_)
    .filter(function(s){ return String(s.articleId || '').trim() && String(s.emplacementId || '').trim(); })
    .map(function(s){
      return {emplacementId:String(s.emplacementId),emplacementNom:String(s.emplacementNom || nomEmplacementInventaireCDQ_(s.emplacementId)),articleId:String(s.articleId),quantite:Number(s.quantite || 0),majLe:String(s.majLe || '')};
    });

  const techniciens = techniciensInventaireCDQ_();
  const monCamion = emplacementCamionUtilisateurCDQ_(acces.email);
  const emplacements = [{ emplacementId:'SHOP', nom:'Shop', type:'shop' }].concat(
    techniciens.map(function(t){return {emplacementId:t.emplacementId,nom:t.email === acces.email ? 'Mon camion — ' + t.libelle : t.nom,type:'camion',email:t.email,libelle:t.libelle,estMonCamion:t.email === acces.email};})
  );

  let mouvements = [];
  if (!rapide) {
    mouvements = lignesObjetsInventaireCDQ_(inv.mouvements, CDQ_INV_HEADERS_MOUVEMENTS_)
      .slice(-250).reverse().map(function(m){
        return {date:String(m.date || ''),articleId:String(m.articleId || ''),numero:String(m.numero || ''),description:String(m.description || ''),quantite:Number(m.quantite || 0),origineId:String(m.origineId || ''),origineNom:String(m.origineNom || ''),destinationId:String(m.destinationId || ''),destinationNom:String(m.destinationNom || ''),utilisateur:String(m.utilisateur || ''),utilisateurLibelle:libelleUtilisateurInventaireCDQ_(m.utilisateur),type:String(m.type || ''),note:String(m.note || '')};
      });
  }

  const totaux = calculTotauxInventaireCDQ_(inv);
  const seuil = seuilGlobalInventaireCDQ_();
  const categories = Array.from(new Set(CDQ_INV_CATEGORIES_DEFAUT_.concat(articles.map(function(a){return a.categorie || 'Autres';})))).filter(Boolean).sort();
  const fabricants = Array.from(new Set(CDQ_INV_FABRICANTS_DEFAUT_.concat(articles.map(function(a){return a.fabricant || 'Non classé';})))).filter(Boolean).sort();
  const modeles = Array.from(new Set(articles.map(function(a){return a.modele || a.numero || a.description || '';}).filter(Boolean))).sort();
  const config = obtenirConfigInventaire();

  return {
    build:CDQ_V19_BUILD_,utilisateur:{email:acces.email,role:acces.role,libelle:libelleUtilisateurInventaireCDQ_(acces.email),monCamion:monCamion},
    articles:articles,stocks:stocks,totaux:totaux,seuilGlobal:seuil,categories:categories,fabricants:fabricants,
    fabricantsParCategorie:CDQ_INV_FABRICANTS_PAR_CATEGORIE_,modeles:modeles,
    emplacements:emplacements,techniciens:techniciens,mouvements:mouvements,historiqueCharge:!rapide,config:config,genereLe:Date.now()
  };
}


function obtenirHistoriqueInventaire(limite) {
  verifierDroit_('lecture');
  const inv = obtenirClasseurInventaireCDQ_();
  limite = Math.max(20, Math.min(250, Math.floor(Number(limite || 150))));
  return lignesObjetsInventaireCDQ_(inv.mouvements, CDQ_INV_HEADERS_MOUVEMENTS_)
    .slice(-limite).reverse().map(function(m){
      return {
        date:String(m.date || ''),articleId:String(m.articleId || ''),numero:String(m.numero || ''),description:String(m.description || ''),
        quantite:Number(m.quantite || 0),origineId:String(m.origineId || ''),origineNom:String(m.origineNom || ''),
        destinationId:String(m.destinationId || ''),destinationNom:String(m.destinationNom || ''),utilisateur:String(m.utilisateur || ''),
        utilisateurLibelle:libelleUtilisateurInventaireCDQ_(m.utilisateur),type:String(m.type || ''),note:String(m.note || '')
      };
    });
}

function enregistrerArticleInventaire(article) {
  // EXPLICITE : seules les personnes administratrices peuvent créer une ligne.
  verifierDroit_('administration');
  article = article || {};
  const inv = obtenirClasseurInventaireCDQ_();

  const id = String(article.articleId || '').trim() || Utilities.getUuid();
  const numero = String(article.numero || '').trim();
  const description = String(article.description || '').trim();
  const categorie = String(article.categorie || 'Autres').trim() || 'Autres';
  const fabricant = String(article.fabricant || 'Non classé').trim() || 'Non classé';
  const modele = String(article.modele || numero || description || '').trim();

  if (!numero && !description) throw new Error('Entrez un numéro de pièce ou une description.');

  const existants = lignesObjetsInventaireCDQ_(inv.articles, CDQ_INV_HEADERS_ARTICLES_);
  const parId = existants.find(function(a){ return String(a.articleId) === id; });
  const parNumero = numero ? existants.find(function(a){
    return String(a.numero).toLowerCase() === numero.toLowerCase() && String(a.articleId) !== id;
  }) : null;
  if (parNumero) throw new Error('Ce numéro de pièce existe déjà.');

  const ligne = [
    id,
    numero,
    description,
    categorie,
    fabricant,
    Math.max(0, Number(article.minimumCamion || 0)),
    Math.max(0, Number(article.minimumShop || 0)),
    article.actif === false ? false : true,
    new Date(),
    modele
  ];

  if (parId) inv.articles.getRange(parId._row,1,1,ligne.length).setValues([ligne]);
  else inv.articles.appendRow(ligne);

  mettreAJourAlertesInventaire_();
  return obtenirInventaire({rapide:true});
}

function creerArticleInventaireAvecStock(article, quantiteShop) {
  verifierDroit_('administration');
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const resultat = enregistrerArticleInventaire(article);
    const articleCree = resultat.articles.find(function(a){
      return String(a.numero || '').toLowerCase() === String((article||{}).numero || '').trim().toLowerCase() &&
             String(a.description || '').toLowerCase() === String((article||{}).description || '').trim().toLowerCase();
    }) || resultat.articles[resultat.articles.length - 1];

    const q = Math.max(0, Math.floor(Number(quantiteShop || 0)));
    if (articleCree && q > 0) {
      const inv = obtenirClasseurInventaireCDQ_();
      ecrireStockInventaireCDQ_(inv,'SHOP',articleCree.articleId,q);
      enregistrerMouvementInventaireCDQ_(
        inv, articleCree, q, 'AJUSTEMENT', 'SHOP',
        verifierAcces_().email, 'entree-shop', 'Stock initial'
      );
    }
    mettreAJourAlertesInventaire_();
    return obtenirInventaire({rapide:true});
  } finally {
    lock.releaseLock();
  }
}

function ajusterStockInventaire(articleId, emplacementId, nouvelleQuantite, note) {
  // EXPLICITE : seul un admin peut ajouter/corriger physiquement un stock.
  const acces = verifierDroit_('administration');
  articleId = String(articleId || '').trim();
  emplacementId = String(emplacementId || '').trim();
  nouvelleQuantite = Number(nouvelleQuantite);

  if (!articleId || !emplacementId) throw new Error('Article ou emplacement invalide.');
  if (!isFinite(nouvelleQuantite) || nouvelleQuantite < 0) throw new Error('Quantité invalide.');

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const inv = obtenirClasseurInventaireCDQ_();
    const article = trouverArticleInventaireCDQ_(inv, articleId);
    if (!article) throw new Error('Article introuvable.');

    const avant = trouverStockInventaireCDQ_(inv, emplacementId, articleId);
    const qAvant = avant ? Number(avant.quantite || 0) : 0;
    ecrireStockInventaireCDQ_(inv, emplacementId, articleId, nouvelleQuantite);
    enregistrerMouvementInventaireCDQ_(
      inv, article, nouvelleQuantite - qAvant,
      'AJUSTEMENT', emplacementId, acces.email, 'ajustement', note || ''
    );
    mettreAJourAlertesInventaire_();
    return obtenirInventaire({rapide:true});
  } finally {
    lock.releaseLock();
  }
}

function estEmplacementCamionInventaireCDQ_(id) {
  return String(id || '').indexOf('CAMION:') === 0;
}

function transfererInventaire(articleId, origineId, destinationId, quantite, note) {
  const acces = verifierDroit_('ecriture');
  articleId = String(articleId || '').trim();
  origineId = String(origineId || '').trim();
  destinationId = String(destinationId || '').trim();
  quantite = Math.floor(Number(quantite || 0));

  if (!articleId || !origineId || !destinationId || origineId === destinationId) {
    throw new Error('Transfert invalide.');
  }
  if (!isFinite(quantite) || quantite <= 0) throw new Error('Quantité invalide.');

  const origineValide = origineId === 'SHOP' || estEmplacementCamionInventaireCDQ_(origineId);
  const destinationValide = destinationId === 'SHOP' || estEmplacementCamionInventaireCDQ_(destinationId);
  if (!origineValide || !destinationValide) throw new Error('Emplacement invalide.');

  const monCamion = emplacementCamionUtilisateurCDQ_(acces.email);

  if (acces.role !== 'admin') {
    // Le technicien peut :
    // Shop -> son camion, son camion -> Shop,
    // autre camion -> son camion, son camion -> autre camion.
    // Il ne peut jamais déplacer du stock entre deux emplacements qui ne sont pas le sien.
    if (origineId !== monCamion && destinationId !== monCamion) {
      throw new Error('Un technicien peut seulement effectuer un transfert qui implique son propre camion.');
    }
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const inv = obtenirClasseurInventaireCDQ_();
    const article = trouverArticleInventaireCDQ_(inv, articleId);
    if (!article) throw new Error('Article introuvable.');

    const sOrigine = trouverStockInventaireCDQ_(inv, origineId, articleId);
    const sDestination = trouverStockInventaireCDQ_(inv, destinationId, articleId);
    const qOrigine = sOrigine ? Number(sOrigine.quantite || 0) : 0;
    const qDestination = sDestination ? Number(sDestination.quantite || 0) : 0;

    if (qOrigine < quantite) {
      throw new Error('Stock insuffisant à l’emplacement source. Disponible : ' + qOrigine);
    }

    ecrireStockInventaireCDQ_(inv, origineId, articleId, qOrigine - quantite);
    ecrireStockInventaireCDQ_(inv, destinationId, articleId, qDestination + quantite);

    enregistrerMouvementInventaireCDQ_(
      inv, article, quantite,
      origineId, destinationId, acces.email, 'transfert', note || ''
    );

    mettreAJourAlertesInventaire_();
    return obtenirInventaire({rapide:true});
  } finally {
    lock.releaseLock();
  }
}

/* =====================================================
   CDQ V21 — PUSH INVENTAIRE (FCM HTTP v1)
   Objectif : notifier l'acheteur même si l'application est fermée.
   Les secrets FCM restent UNIQUEMENT dans Script Properties.
===================================================== */

const CDQ_PUSH_HEADERS_ = [
  'tokenId','email','token','plateforme','appareil',
  'dateCreation','dateMaj','actif','dernierSucces','dernierEchec'
];

const CDQ_PUSH_PROP_PROJECT_ID_ = 'FCM_PROJECT_ID';
const CDQ_PUSH_PROP_CLIENT_EMAIL_ = 'FCM_CLIENT_EMAIL';
const CDQ_PUSH_PROP_PRIVATE_KEY_ = 'FCM_PRIVATE_KEY';
const CDQ_PUSH_PROP_PWA_URL_ = 'CDQ_PWA_URL';
const CDQ_PUSH_DEFAULT_PWA_URL_ = 'https://jprodrigue86.github.io/Rapports--talonnages-CDQ/';
const CDQ_PUSH_SCOPE_ = 'https://www.googleapis.com/auth/firebase.messaging';
const CDQ_PUSH_TOKEN_CACHE_ = 'CDQ_FCM_ACCESS_TOKEN_V21';

function obtenirFeuillePushCDQ_() {
  const inv = obtenirClasseurInventaireCDQ_();
  let feuille = inv.ss.getSheetByName('PushTokens');
  if (!feuille) feuille = inv.ss.insertSheet('PushTokens');
  assurerEntetesInventaireCDQ_(feuille, CDQ_PUSH_HEADERS_);
  return feuille;
}

function normaliserClePriveeFCM_(v) {
  return String(v || '').replace(/\\n/g, '\n').trim();
}

function obtenirConfigFCMCDQ_() {
  const props = PropertiesService.getScriptProperties();
  const projectId = String(props.getProperty(CDQ_PUSH_PROP_PROJECT_ID_) || '').trim();
  const clientEmail = String(props.getProperty(CDQ_PUSH_PROP_CLIENT_EMAIL_) || '').trim();
  const privateKey = normaliserClePriveeFCM_(props.getProperty(CDQ_PUSH_PROP_PRIVATE_KEY_));
  const pwaUrl = String(props.getProperty(CDQ_PUSH_PROP_PWA_URL_) || CDQ_PUSH_DEFAULT_PWA_URL_).trim();

  return {
    projectId:projectId,
    clientEmail:clientEmail,
    privateKey:privateKey,
    pwaUrl:pwaUrl || CDQ_PUSH_DEFAULT_PWA_URL_,
    configure:!!(projectId && clientEmail && privateKey)
  };
}

function verifierConfigurationPushCDQ() {
  const acces = verifierDroit_('lecture');
  const cfg = obtenirConfigFCMCDQ_();
  const etat = obtenirEtatPushUtilisateur();
  return {
    configure:cfg.configure,
    pwaUrl:cfg.pwaUrl,
    tokenCount:etat.tokenCount,
    estAcheteur:etat.estAcheteur,
    acheteurEmail:etat.acheteurEmail,
    role:acces.role
  };
}

function base64UrlCDQ_(bytesOrText) {
  let bytes = bytesOrText;
  if (typeof bytesOrText === 'string') {
    bytes = Utilities.newBlob(bytesOrText).getBytes();
  }
  return Utilities.base64EncodeWebSafe(bytes).replace(/=+$/,'');
}

function obtenirJetonAccesFCMCDQ_() {
  const cache = CacheService.getScriptCache();
  const deja = cache.get(CDQ_PUSH_TOKEN_CACHE_);
  if (deja) return deja;

  const cfg = obtenirConfigFCMCDQ_();
  if (!cfg.configure) {
    throw new Error(
      'Firebase Push n’est pas configuré. Ajoutez FCM_PROJECT_ID, FCM_CLIENT_EMAIL et FCM_PRIVATE_KEY dans les propriétés du script.'
    );
  }

  const now = Math.floor(Date.now()/1000);
  const header = base64UrlCDQ_(JSON.stringify({alg:'RS256',typ:'JWT'}));
  const claims = base64UrlCDQ_(JSON.stringify({
    iss:cfg.clientEmail,
    scope:CDQ_PUSH_SCOPE_,
    aud:'https://oauth2.googleapis.com/token',
    iat:now,
    exp:now + 3600
  }));
  const unsigned = header + '.' + claims;
  const signature = Utilities.computeRsaSha256Signature(unsigned, cfg.privateKey);
  const assertion = unsigned + '.' + base64UrlCDQ_(signature);

  const response = UrlFetchApp.fetch('https://oauth2.googleapis.com/token', {
    method:'post',
    contentType:'application/x-www-form-urlencoded',
    payload:
      'grant_type=' +
      encodeURIComponent('urn:ietf:params:oauth:grant-type:jwt-bearer') +
      '&assertion=' + encodeURIComponent(assertion),
    muteHttpExceptions:true
  });

  const code = response.getResponseCode();
  let data = {};
  try { data = JSON.parse(response.getContentText() || '{}'); } catch(e) {}

  if (code < 200 || code >= 300 || !data.access_token) {
    throw new Error('Impossible d’obtenir le jeton FCM (' + code + '). ' + String(data.error_description || data.error || ''));
  }

  const ttl = Math.max(60, Math.min(3300, Number(data.expires_in || 3600) - 120));
  cache.put(CDQ_PUSH_TOKEN_CACHE_, String(data.access_token), ttl);
  return String(data.access_token);
}

function lignesPushCDQ_() {
  const feuille = obtenirFeuillePushCDQ_();
  return lignesObjetsInventaireCDQ_(feuille, CDQ_PUSH_HEADERS_);
}

function enregistrerTokenPushCDQ(token, info) {
  const acces = verifierDroit_('lecture');
  token = String(token || '').trim();
  info = info || {};

  if (token.length < 30 || token.length > 4096) {
    throw new Error('Jeton Push invalide.');
  }

  const feuille = obtenirFeuillePushCDQ_();
  const lignes = lignesObjetsInventaireCDQ_(feuille, CDQ_PUSH_HEADERS_);
  const existant = lignes.find(function(x){ return String(x.token) === token; });
  const now = new Date();

  const ligne = [
    existant ? String(existant.tokenId || Utilities.getUuid()) : Utilities.getUuid(),
    normaliserEmailCDQ_(acces.email),
    token,
    String(info.plateforme || '').slice(0,100),
    String(info.appareil || '').slice(0,250),
    existant && existant.dateCreation ? new Date(existant.dateCreation) : now,
    now,
    true,
    existant && existant.dernierSucces ? new Date(existant.dernierSucces) : '',
    existant && existant.dernierEchec ? new Date(existant.dernierEchec) : ''
  ];

  if (existant) feuille.getRange(existant._row,1,1,ligne.length).setValues([ligne]);
  else feuille.appendRow(ligne);

  return obtenirEtatPushUtilisateur();
}

function desactiverTokenPushCDQ(token) {
  const acces = verifierDroit_('lecture');
  token = String(token || '').trim();
  const feuille = obtenirFeuillePushCDQ_();
  const lignes = lignesObjetsInventaireCDQ_(feuille, CDQ_PUSH_HEADERS_);
  const x = lignes.find(function(r){
    return String(r.token) === token &&
      normaliserEmailCDQ_(r.email) === normaliserEmailCDQ_(acces.email);
  });
  if (x) {
    feuille.getRange(x._row,8).setValue(false);
    feuille.getRange(x._row,7).setValue(new Date());
  }
  return obtenirEtatPushUtilisateur();
}

function obtenirEtatPushUtilisateur() {
  const acces = verifierDroit_('lecture');
  const email = normaliserEmailCDQ_(acces.email);
  const lignes = lignesPushCDQ_().filter(function(x){
    return normaliserEmailCDQ_(x.email) === email && String(x.actif) !== 'false';
  });
  const cfgInv = obtenirConfigInventaire();
  return {
    tokenCount:lignes.length,
    estAcheteur:!!cfgInv.acheteurEmail &&
      normaliserEmailCDQ_(cfgInv.acheteurEmail) === email,
    acheteurEmail:cfgInv.acheteurEmail || '',
    acheteurLibelle:cfgInv.acheteurLibelle || '',
    firebaseConfigure:obtenirConfigFCMCDQ_().configure
  };
}

function marquerEtatTokenPushCDQ_(token, succes, invalide) {
  try {
    const feuille = obtenirFeuillePushCDQ_();
    const lignes = lignesObjetsInventaireCDQ_(feuille, CDQ_PUSH_HEADERS_);
    const x = lignes.find(function(r){ return String(r.token) === String(token); });
    if (!x) return;
    feuille.getRange(x._row,7).setValue(new Date());
    if (succes) feuille.getRange(x._row,9).setValue(new Date());
    else feuille.getRange(x._row,10).setValue(new Date());
    if (invalide) feuille.getRange(x._row,8).setValue(false);
  } catch(e) {}
}

function envoyerFCMTokenCDQ_(token, titre, corps, data) {
  const cfg = obtenirConfigFCMCDQ_();
  const accessToken = obtenirJetonAccesFCMCDQ_();
  const articleId = String((data || {}).articleId || '');
  const tag = 'cdq-inventory-' + (articleId || 'alert');

  const payload = {
    message:{
      token:String(token),
      notification:{
        title:String(titre || 'CDQ — Inventaire'),
        body:String(corps || 'Alerte inventaire.')
      },
      data:Object.keys(data || {}).reduce(function(acc,k){
        acc[k] = String(data[k] == null ? '' : data[k]);
        return acc;
      },{}),
      webpush:{
        headers:{ Urgency:'high' },
        notification:{
          icon:cfg.pwaUrl + 'icons/icon-heavy-v3-192.png',
          badge:cfg.pwaUrl + 'icons/icon-heavy-v3-192.png',
          tag:tag,
          renotify:false,
          requireInteraction:true
        },
        fcm_options:{
          link:cfg.pwaUrl
        }
      }
    }
  };

  const url = 'https://fcm.googleapis.com/v1/projects/' +
    encodeURIComponent(cfg.projectId) + '/messages:send';

  const response = UrlFetchApp.fetch(url, {
    method:'post',
    contentType:'application/json',
    headers:{Authorization:'Bearer ' + accessToken},
    payload:JSON.stringify(payload),
    muteHttpExceptions:true
  });

  const http = response.getResponseCode();
  const body = response.getContentText() || '';
  const ok = http >= 200 && http < 300;
  const invalide = !ok && (
    body.indexOf('UNREGISTERED') >= 0 ||
    body.indexOf('registration-token-not-registered') >= 0 ||
    body.indexOf('Requested entity was not found') >= 0
  );

  marquerEtatTokenPushCDQ_(token, ok, invalide);

  return {ok:ok,http:http,invalide:invalide,body:body.slice(0,1000)};
}

function envoyerPushUtilisateurCDQ_(email, titre, corps, data) {
  email = normaliserEmailCDQ_(email);
  if (!email) return {envoyes:0,echecs:0,raison:'aucun-destinataire'};

  const cfg = obtenirConfigFCMCDQ_();
  if (!cfg.configure) return {envoyes:0,echecs:0,raison:'firebase-non-configure'};

  const tokens = lignesPushCDQ_().filter(function(x){
    return normaliserEmailCDQ_(x.email) === email && String(x.actif) !== 'false';
  });

  let envoyes = 0;
  let echecs = 0;

  tokens.forEach(function(x){
    try {
      const r = envoyerFCMTokenCDQ_(x.token,titre,corps,data || {});
      if (r.ok) envoyes++;
      else echecs++;
    } catch(e) {
      echecs++;
      marquerEtatTokenPushCDQ_(x.token,false,false);
    }
  });

  return {envoyes:envoyes,echecs:echecs,tokens:tokens.length};
}

function envoyerPushInventaireBasCDQ_(article, total, seuil, destinataire, alerteId) {
  const numero = String(article.numero || '');
  const description = String(article.description || 'Article');
  const label = numero ? ('#' + numero + ' — ' + description) : description;

  return envoyerPushUtilisateurCDQ_(
    destinataire,
    '⚠ CDQ — Inventaire bas',
    label + ' : ' + total + ' restant(s) au total. Seuil : ' + seuil + '.',
    {
      type:'inventory-low',
      articleId:String(article.articleId || ''),
      numero:numero,
      description:description,
      total:String(total),
      seuil:String(seuil),
      alerteId:String(alerteId || '')
    }
  );
}

/* Remplacement V21 de la fonction d'alertes :
   un Push est envoyé SEULEMENT lorsqu'un article entre en état bas.
   Aucun spam à chaque vérification périodique.
*/
function mettreAJourAlertesInventaire_() {
  const inv = obtenirClasseurInventaireCDQ_();
  const seuil = seuilGlobalInventaireCDQ_();
  const destinataire = acheteurInventaireCDQ_();
  const articles = lignesObjetsInventaireCDQ_(inv.articles, CDQ_INV_HEADERS_ARTICLES_)
    .filter(function(a){ return String(a.articleId || '').trim() && String(a.actif) !== 'false'; });
  const totaux = calculTotauxInventaireCDQ_(inv);
  const alertes = lignesObjetsInventaireCDQ_(inv.alertes, CDQ_INV_HEADERS_ALERTES_);
  const now = new Date();

  articles.forEach(function(article){
    const articleId = String(article.articleId);
    const total = Number(totaux[articleId] || 0);
    const active = alertes.find(function(a){
      return String(a.articleId) === articleId && String(a.etat || '').toUpperCase() === 'ACTIF';
    });

    if (total < seuil) {
      if (active) {
        inv.alertes.getRange(active._row,1,1,CDQ_INV_HEADERS_ALERTES_.length).setValues([[
          String(active.alerteId || Utilities.getUuid()),
          active.dateCreation ? new Date(active.dateCreation) : now,
          now,
          articleId,
          String(article.numero || ''),
          String(article.description || ''),
          total,
          seuil,
          destinataire,
          'ACTIF',
          ''
        ]]);
      } else {
        const alerteId = Utilities.getUuid();
        inv.alertes.appendRow([
          alerteId,
          now,
          now,
          articleId,
          String(article.numero || ''),
          String(article.description || ''),
          total,
          seuil,
          destinataire,
          'ACTIF',
          ''
        ]);

        if (destinataire) {
          try {
            envoyerPushInventaireBasCDQ_(article,total,seuil,destinataire,alerteId);
          } catch(e) {
            console.log('Push inventaire non envoyé : ' + e.message);
          }
        }
      }
    } else if (active) {
      inv.alertes.getRange(active._row,1,1,CDQ_INV_HEADERS_ALERTES_.length).setValues([[
        String(active.alerteId || Utilities.getUuid()),
        active.dateCreation ? new Date(active.dateCreation) : now,
        now,
        articleId,
        String(article.numero || ''),
        String(article.description || ''),
        total,
        seuil,
        String(active.destinataire || destinataire),
        'RESOLU',
        now
      ]]);
    }
  });

  return true;
}

function verifierAlertesInventairePushPeriodique_() {
  mettreAJourAlertesInventaire_();
}

function assurerDeclencheurAlertesPushCDQ_() {
  const nom = 'verifierAlertesInventairePushPeriodique_';
  const ancienNom = 'verifierAlertesInventairePushPeriodique';
  ScriptApp.getProjectTriggers().forEach(function(t){
    if (t.getHandlerFunction() === ancienNom) ScriptApp.deleteTrigger(t);
  });
  const deja = ScriptApp.getProjectTriggers().some(function(t){
    return t.getHandlerFunction() === nom;
  });
  if (!deja) {
    ScriptApp.newTrigger(nom).timeBased().everyMinutes(5).create();
  }
  return true;
}

function initialiserPushInventaireCDQ() {
  verifierDroit_('administration');
  const cfg = obtenirConfigFCMCDQ_();
  if (!cfg.configure) {
    throw new Error(
      'Configurez d’abord FCM_PROJECT_ID, FCM_CLIENT_EMAIL et FCM_PRIVATE_KEY dans Paramètres du projet > Propriétés du script.'
    );
  }
  assurerDeclencheurAlertesPushCDQ_();
  return {
    ok:true,
    firebaseConfigure:true,
    pwaUrl:cfg.pwaUrl,
    triggerMinutes:5
  };
}

function testerPushInventaireCDQ() {
  const acces = verifierDroit_('administration');
  const cfgInv = obtenirConfigInventaire();
  const destinataire = cfgInv.acheteurEmail;
  if (!destinataire) throw new Error('Aucun acheteur n’est configuré dans Inventaire > Paramètres.');

  const r = envoyerPushUtilisateurCDQ_(
    destinataire,
    '✅ CDQ — Test notification Push',
    'Les notifications d’inventaire fonctionnent même lorsque l’application est fermée.',
    {type:'inventory-test',date:new Date().toISOString(),admin:acces.email}
  );

  if (!r.envoyes) {
    throw new Error(
      'Aucune notification envoyée. Vérifiez Firebase et assurez-vous que l’acheteur a activé les notifications Push sur son téléphone.'
    );
  }
  return r;
}


// Diagnostic réservé à l’éditeur. Aucun envoi, création ou changement de données.
function diagnostiquerCDQDepuisEditeur_() {
  const resultat = {
    versionBackend: CDQ_BACKEND_BUILD_, versionSelector: null,
    driveAvance: typeof Drive !== 'undefined' && !!Drive.Files && typeof Drive.Files.create === 'function',
    dossierPrincipal: false, ressources: [], erreurs: [],
    firebaseServeurConfigure: false, pretPourTests: false
  };
  try {
    const html = HtmlService.createHtmlOutputFromFile('Selector').getContent();
    const version = html.match(/const CDQ_BUILD\s*=\s*["']([^"']+)["']/);
    resultat.versionSelector = version ? version[1] : null;
    if (resultat.versionSelector !== resultat.versionBackend) resultat.erreurs.push('Code.gs et Selector.html ne sont pas de la même version.');
  } catch (e) { resultat.erreurs.push('Selector : '+e.message); }
  try { DriveApp.getFolderById(CONFIG.MASTER_FOLDER_ID).getName(); resultat.dossierPrincipal=true; }
  catch (e) { resultat.erreurs.push('Dossier principal : '+e.message); }
  if (typeof CDQ_MODELES_EMBARQUES_ === 'undefined') {
    resultat.erreurs.push('CDQTemplates.gs est manquant.');
  } else {
    Object.keys(CDQ_MODELES_EMBARQUES_).forEach(function(cle) {
      const m=CDQ_MODELES_EMBARQUES_[cle]; let presents=0;
      m.assets.forEach(function(asset) {
        try {
          if (!HtmlService.createHtmlOutputFromFile(asset).getContent().trim()) throw new Error('ressource vide');
          presents++;
        } catch (e) { resultat.erreurs.push(asset+'.html : '+e.message); }
      });
      resultat.ressources.push({modele:cle, attendues:m.assets.length, presentes:presents});
    });
  }
  const props=PropertiesService.getScriptProperties();
  resultat.firebaseServeurConfigure=['FCM_PROJECT_ID','FCM_CLIENT_EMAIL','FCM_PRIVATE_KEY'].every(function(cle) {
    return !!String(props.getProperty(cle)||'').trim();
  });
  if (!resultat.driveAvance) resultat.erreurs.push('Service avancé Drive API v3 absent.');
  resultat.pretPourTests=resultat.erreurs.length===0 && resultat.dossierPrincipal;
  // Ce diagnostic ne teste ni la connexion réelle des techniciens ni les notifications.
  Logger.log(JSON.stringify(resultat)); return resultat;
}

// Lecture seule. Reconstitue chaque PDF intégré et le compare à son maître Drive.
// Aucun fichier, propriété, NIP, autorisation ou notification n'est modifié.
function verifierModelesIntegresCDQDepuisEditeur_() {
  if (typeof CDQ_MODELES_EMBARQUES_ === 'undefined') throw new Error('CDQTemplates.gs est manquant.');
  const resultat=[];
  function sha(bytes) {
    return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,bytes)
      .map(function(b){return ('0'+((b+256)%256).toString(16)).slice(-2);}).join('');
  }
  Object.keys(CDQ_MODELES_EMBARQUES_).forEach(function(cle) {
    const m=CDQ_MODELES_EMBARQUES_[cle]; const r={modele:cle,nom:m.nom,integreValide:false,maitreDrive:'non vérifié'};
    try {
      const bytes=cdqBlobEmbarque_(cle).getBytes();
      r.integreValide=bytes.length===m.taille && sha(bytes)===m.sha256;
      r.sha256=m.sha256; r.octets=bytes.length;
    } catch(e) {r.erreurIntegre=e.message;}
    try {
      const f=DriveApp.getFileById(obtenirModeleIntermediaireCDQ_(cle).id);
      if(f.isTrashed() || f.getMimeType()!=='application/pdf') throw new Error('Maître PDF introuvable.');
      r.idMaitre=f.getId(); r.maitreDrive=sha(f.getBlob().getBytes())===m.sha256 ? 'identique' : 'DIFFÉRENT — ne pas remplacer sans vérifier la version';
    } catch(e) {r.maitreDrive='ERREUR : '+e.message;}
    resultat.push(r);
  });
  Logger.log(JSON.stringify(resultat)); return resultat;
}

/* V21.26 — Documents originaux. Aucun export HTML ni aplatissement PDF. */
const CDQ_DOCUMENT_MAX_BYTES_ = 32 * 1024 * 1024;
const CDQ_DOCUMENT_CHUNK_BYTES_ = 3 * 1024 * 1024;

// V23.18 — chemin rapide de lecture PDF.
// Ne remonte pas l'arborescence client à chaque bloc; les droits Balance CDQ
// sont vérifiés et le fichier lui-même est strictement validé.
function obtenirMetaDocumentPdfRapideCDQ(id) {
  verifierDroit_('lecture');

  id = String(id || '').trim();
  if (!/^[A-Za-z0-9_-]{10,200}$/.test(id)) throw new Error('Identifiant PDF invalide.');

  const f = DriveApp.getFileById(id);
  if (f.isTrashed() || f.getMimeType() !== 'application/pdf') {
    throw new Error('PDF introuvable ou invalide.');
  }

  const taille = Number(f.getSize() || 0);
  if (!taille || taille > CDQ_DOCUMENT_MAX_BYTES_) {
    throw new Error('Ce PDF dépasse la limite de 15 Mo.');
  }

  const revision = f.getLastUpdated().toISOString();
  return {
    id: f.getId(),
    nom: f.getName(),
    type: 'PDF',
    taille: taille,
    revision: revision,
    chunks: Math.ceil(taille / CDQ_DOCUMENT_CHUNK_BYTES_)
  };
}

function obtenirChunkDocumentPdfRapideCDQ(id, revision, index) {
  verifierDroit_('lecture');

  id = String(id || '').trim();
  if (!/^[A-Za-z0-9_-]{10,200}$/.test(id)) throw new Error('Identifiant PDF invalide.');
  if (!Number.isInteger(index) || index < 0) throw new Error('Segment PDF invalide.');

  const f = DriveApp.getFileById(id);
  if (f.isTrashed() || f.getMimeType() !== 'application/pdf') {
    throw new Error('PDF introuvable ou invalide.');
  }

  const taille = Number(f.getSize() || 0);
  if (!taille || taille > CDQ_DOCUMENT_MAX_BYTES_) {
    throw new Error('Ce PDF dépasse la limite de 15 Mo.');
  }

  const actuelle = f.getLastUpdated().toISOString();
  if (actuelle !== String(revision || '')) {
    throw new Error('Le PDF a changé. Recommencez son ouverture.');
  }

  const debut = index * CDQ_DOCUMENT_CHUNK_BYTES_;
  if (debut >= taille) throw new Error('Segment PDF inexistant.');

  const bytes = f.getBlob().getBytes();
  return {
    revision: actuelle,
    base64: Utilities.base64Encode(
      bytes.slice(debut, debut + CDQ_DOCUMENT_CHUNK_BYTES_)
    )
  };
}


const CDQ_PDF_OPEN_V24_PREFIX_ = 'CDQ_PDF_OPEN_V24_';
const CDQ_PDF_OPEN_V24_CHUNK_BYTES_ = 2 * 1024 * 1024;
const CDQ_PDF_OPEN_V24_TTL_ = 180;

function clePdfOuvertureV24_(token) {
  return CDQ_PDF_OPEN_V24_PREFIX_ + empreinteCDQ_(String(token || '')).slice(0, 48);
}

function preparerPdfOuvertureCDQV24(id) {
  const acces = verifierDroit_('lecture');
  id = String(id || '').trim();
  if (!/^[A-Za-z0-9_-]{10,200}$/.test(id)) throw new Error('Identifiant PDF invalide.');

  verifierCibleDansMasterCDQ_('fichier', id);
  const f = DriveApp.getFileById(id);
  if (f.isTrashed() || f.getMimeType() !== 'application/pdf') throw new Error('PDF introuvable ou invalide.');

  const taille = Number(f.getSize() || 0);
  if (!taille || taille > CDQ_DOCUMENT_MAX_BYTES_) throw new Error('Ce PDF dépasse la limite de 15 Mo.');

  const revision = f.getLastUpdated().toISOString();
  const token = Utilities.getUuid() + '-' + Utilities.getUuid();
  CacheService.getScriptCache().put(
    clePdfOuvertureV24_(token),
    JSON.stringify({
      id: id,
      revision: revision,
      taille: taille,
      email: String(acces.email || '').toLowerCase(),
      expiresAt: Date.now() + CDQ_PDF_OPEN_V24_TTL_ * 1000
    }),
    CDQ_PDF_OPEN_V24_TTL_
  );

  return {
    ok: true,
    token: token,
    id: id,
    nom: f.getName(),
    taille: taille,
    revision: revision,
    chunkBytes: CDQ_PDF_OPEN_V24_CHUNK_BYTES_,
    chunks: Math.ceil(taille / CDQ_PDF_OPEN_V24_CHUNK_BYTES_)
  };
}

function obtenirBlocPdfOuvertureCDQV24(token, index) {
  const acces = verifierDroit_('lecture');
  token = String(token || '').trim();
  index = Number(index);
  if (!token || token.length > 160 || !Number.isInteger(index) || index < 0) throw new Error('Demande PDF invalide.');

  const cache = CacheService.getScriptCache();
  const cle = clePdfOuvertureV24_(token);
  const brut = cache.get(cle);
  if (!brut) throw new Error('La préparation du PDF a expiré. Touchez le fichier de nouveau.');

  let session;
  try { session = JSON.parse(brut); }
  catch (e) { cache.remove(cle); throw new Error('Session PDF invalide.'); }

  if (!session || Number(session.expiresAt || 0) < Date.now()) {
    cache.remove(cle);
    throw new Error('La préparation du PDF a expiré. Touchez le fichier de nouveau.');
  }
  if (String(session.email || '').toLowerCase() !== String(acces.email || '').toLowerCase()) {
    throw new Error('Cette session PDF appartient à un autre utilisateur.');
  }

  const f = DriveApp.getFileById(String(session.id || ''));
  if (f.isTrashed() || f.getMimeType() !== 'application/pdf') throw new Error('PDF introuvable ou invalide.');
  if (f.getLastUpdated().toISOString() !== String(session.revision || '')) throw new Error('Le PDF a changé. Touchez le fichier de nouveau.');

  const taille = Number(f.getSize() || 0);
  if (taille !== Number(session.taille || 0) || !taille || taille > CDQ_DOCUMENT_MAX_BYTES_) throw new Error('La taille du PDF a changé.');

  const debut = index * CDQ_PDF_OPEN_V24_CHUNK_BYTES_;
  if (debut >= taille) throw new Error('Segment PDF inexistant.');
  const fin = Math.min(taille, debut + CDQ_PDF_OPEN_V24_CHUNK_BYTES_);
  const bytes = f.getBlob().getBytes();

  return {
    ok: true,
    index: index,
    revision: session.revision,
    base64: Utilities.base64Encode(bytes.slice(debut, fin)),
    last: fin >= taille
  };
}

function enregistrerPdfRempliCDQV24(id, base64, uploadId) {
  return enregistrerPdfRempliCDQ(id, base64, uploadId);
}

function obtenirPdfClientCDQ_(id) {return obtenirPdfAutoriseCDQV2523_(id);}
function obtenirMetaDocumentPdfCDQ(id) {
  verifierDroit_('lecture');
  const cible = obtenirPdfClientCDQ_(id), f = cible.fichier;
  const taille = Number(f.getSize());
  if (!taille || taille > CDQ_DOCUMENT_MAX_BYTES_) throw new Error('Ce PDF dépasse la limite de 32 Mo pour la copie hors ligne.');
  return {id:f.getId(),nom:f.getName(),clientId:cible.client.getId(),type:'PDF',taille:taille,
    revision:f.getLastUpdated().toISOString(),chunkSize:CDQ_DOCUMENT_CHUNK_BYTES_,chunks:Math.ceil(taille/CDQ_DOCUMENT_CHUNK_BYTES_)};
}
/* V22.85 : ancien transport PDF V22.68 supprimé; ouverture directe Drive OAuth dans la PWA. */
function obtenirChunkDocumentPdfCDQ(id, revision, index) {
  verifierDroit_('lecture');
  const f = obtenirPdfClientCDQ_(id).fichier;
  const revisionCourante = f.getLastUpdated().toISOString();
  const taille = Number(f.getSize());
  if (revisionCourante !== String(revision)) throw new Error('Le PDF a changé. Recommencez son téléchargement.');
  if (!Number.isInteger(index) || index < 0 || !taille || taille > CDQ_DOCUMENT_MAX_BYTES_) throw new Error('Segment PDF invalide.');

  const debut = index * CDQ_DOCUMENT_CHUNK_BYTES_;
  if (debut >= taille) throw new Error('Segment PDF inexistant.');
  const fin = Math.min(taille - 1, debut + CDQ_DOCUMENT_CHUNK_BYTES_ - 1);

  const url = 'https://www.googleapis.com/drive/v3/files/' +
    encodeURIComponent(f.getId()) + '?alt=media&supportsAllDrives=true';
  const response = UrlFetchApp.fetch(url, {
    method:'get',
    headers:{
      Authorization:'Bearer ' + ScriptApp.getOAuthToken(),
      Range:'bytes=' + debut + '-' + fin
    },
    muteHttpExceptions:true,
    followRedirects:true
  });

  const code = response.getResponseCode();
  let bytes = response.getContent();
  if (code === 200 && bytes.length === taille) {
    // Sécurité si Google ignore Range.
    bytes = bytes.slice(debut, fin + 1);
  } else if (code !== 206 && code !== 200) {
    throw new Error('Lecture rapide du PDF impossible (' + code + ').');
  }
  const attendu = fin - debut + 1;
  if (bytes.length !== attendu) throw new Error('Segment PDF incomplet.');
  if (f.getLastUpdated().toISOString() !== String(revision)) throw new Error('Le PDF a changé pendant la lecture.');
  return {
    revision:revision,
    index:index,
    debut:debut,
    fin:fin,
    base64:Utilities.base64Encode(bytes)
  };
}
function enregistrerPdfRempliCDQ(id, base64, uploadId) {
  const acces = verifierDroit_('ecriture');
  uploadId = String(uploadId || '');
  if (!/^[a-zA-Z0-9_-]{8,100}$/.test(uploadId)) throw new Error('Identifiant d’envoi PDF invalide.');
  if (typeof base64 !== 'string' || base64.length > Math.ceil(CDQ_DOCUMENT_MAX_BYTES_/3)*4 || !/^[A-Za-z0-9+/]*={0,2}$/.test(base64)) throw new Error('Contenu PDF invalide ou trop volumineux.');
  const bytes = Utilities.base64Decode(base64);
  if (bytes.length < 8 || bytes.length > CDQ_DOCUMENT_MAX_BYTES_ || bytes.slice(0,5).map(function(b){return String.fromCharCode(b);}).join('') !== '%PDF-') throw new Error('Choisissez un véritable fichier PDF (32 Mo maximum).');
  const empreinte = Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,bytes));
  const lock = LockService.getScriptLock(); lock.waitLock(30000);
  try {
    const cible = obtenirPdfClientCDQ_(id), f = cible.fichier, parents = f.getParents();
    if (!parents.hasNext()) throw new Error('Dossier du PDF introuvable.');
    const dossier = parents.next(), fichiers = dossier.getFiles();
    while (fichiers.hasNext()) {
      const existant = fichiers.next(); let meta = {};
      try {meta = JSON.parse(existant.getDescription() || '{}');} catch(e) {}
      if (meta.cdqPdfUploadId === uploadId && meta.cdqPdfSourceId === String(id) && meta.cdqPdfAuteur === acces.email) {
        if (meta.cdqPdfSha256 !== empreinte) throw new Error('Cet envoi existe déjà avec un autre contenu.');
        return {ok:true,id:existant.getId(),nom:existant.getName(),clientId:cible.client.getId()};
      }
    }
    const stamp = Utilities.formatDate(new Date(),Session.getScriptTimeZone(),'yyyyMMdd_HHmmss');
    const nom = f.getName().replace(/\.pdf$/i,'') + ' — rempli ' + stamp + '.pdf';
    // Contenu et identifiant d'envoi créés ensemble : une réponse réseau perdue ne duplique pas le rapport.
    const copie = Drive.Files.create({name:nom,mimeType:'application/pdf',parents:[dossier.getId()],
      description:JSON.stringify({cdqPdfUploadId:uploadId,cdqPdfSourceId:String(id),cdqPdfAuteur:acces.email,cdqPdfSha256:empreinte})},
      Utilities.newBlob(bytes,'application/pdf',nom),{fields:'id,name'});
    invaliderCacheContenuClient_(cible.client.getId()); invaliderCacheCompagnies_();
    return {ok:true,id:copie.id,nom:copie.name,clientId:cible.client.getId()};
  } finally {lock.releaseLock();}
}

// Compatibilité du pont Balance à camion publié en parallèle.
// Un seul moteur conserve la vérification des droits et la copie atomique sans doublon.
function copierTemplateHorsLigneCDQ(requestId,idCompagnie,dossierDestinationId,modeleId,templateId,modifieLe){
  const revision=templateId?{templateId:String(templateId),modifieLe:Number(modifieLe)}:null;
  return copierTemplateBalanceIntermediaire(idCompagnie,dossierDestinationId,modeleId,requestId,revision);
}


/* =====================================================
   INTERFACE PC METAL COMPLETE — INDEX DE CONFORMITE
   PC uniquement côté interface. Android/iPhone ne changent pas.
   Les valeurs sont extraites côté navigateur avec pdf-lib, puis l'état
   est mémorisé avec la révision Drive du PDF afin d'éviter un faux statut
   après modification du fichier.
===================================================== */
const CDQ_PC_STATUS_VERSION_ = 3;
const CDQ_PC_STATUS_PREFIX_ = 'CDQ_PC_PDF_STATUS_V3_';
const CDQ_PC_RESUME_PREFIX_ = 'CDQ_PC_CLIENT_RESUME_V3_';

function cleStatutPdfPC_(fileId){return CDQ_PC_STATUS_PREFIX_+empreinteCDQ_(String(fileId||'')).slice(0,42);}
function cleResumeClientPC_(clientId){return CDQ_PC_RESUME_PREFIX_+empreinteCDQ_(String(clientId||'')).slice(0,42);}
function normaliserStatutPC_(v){v=String(v||'').trim().toLowerCase().replace(/[\s-]+/g,'_');if(v==='non_conforme'||v==='nonconforme'||v==='nc')return'non_conforme';if(v==='conforme'||v==='ok')return'conforme';return'inconnu';}
function lireStatutPdfPC_(props,file){
  const brut=props[cleStatutPdfPC_(file.getId())];if(!brut)return null;
  try{const x=JSON.parse(brut);if(!x||String(x.fileId)!==file.getId())return null;if(String(x.revision||'')!==file.getLastUpdated().toISOString())return null;return x;}catch(e){return null;}
}
function collecterFichiersPc_(folder,path,out){
  path=path||'';out=out||{pdf:[],totalFichiers:0};
  const fs=folder.getFiles();
  while(fs.hasNext()){
    const f=fs.next(),nom=f.getName(),mime=f.getMimeType(),ext=nom.indexOf('.')>=0?nom.split('.').pop().toLowerCase():'';
    const pdf=mime===MimeType.PDF||ext==='pdf',sheet=mime===MimeType.GOOGLE_SHEETS||ext==='xlsx'||ext==='xls';
    if(!pdf&&!sheet)continue;out.totalFichiers++;
    if(pdf)out.pdf.push({id:f.getId(),nom:nom,revision:f.getLastUpdated().toISOString(),path:path||'/'});
  }
  const ds=folder.getFolders();while(ds.hasNext()){const d=ds.next();collecterFichiersPc_(d,path?(path+' / '+d.getName()):d.getName(),out);}return out;
}
function recalculerResumeConformiteClientPC_(idCompagnie){
  idCompagnie=String(idCompagnie||'').trim();if(!idCompagnie)throw new Error('Client introuvable.');
  const collecte=collecterFichiersPc_(DriveApp.getFolderById(idCompagnie),'',{pdf:[],totalFichiers:0});
  const props=PropertiesService.getScriptProperties().getProperties();
  const resultat={idCompagnie:idCompagnie,genereLe:Date.now(),totalFichiers:collecte.totalFichiers,totalPdf:collecte.pdf.length,conformes:0,nonConformes:0,inconnus:0,fichiers:{}};
  collecte.pdf.forEach(function(info){
    const f=DriveApp.getFileById(info.id),x=lireStatutPdfPC_(props,f),statut=x?normaliserStatutPC_(x.statut):'inconnu';
    resultat.fichiers[info.id]={id:info.id,nom:info.nom,statut:statut,revision:info.revision,chemin:info.path,analyseLe:x?Number(x.analyseLe||0):0};
    if(statut==='non_conforme')resultat.nonConformes++;else if(statut==='conforme')resultat.conformes++;else resultat.inconnus++;
  });
  try{PropertiesService.getScriptProperties().setProperty(cleResumeClientPC_(idCompagnie),JSON.stringify({idCompagnie:idCompagnie,genereLe:resultat.genereLe,totalFichiers:resultat.totalFichiers,totalPdf:resultat.totalPdf,conformes:resultat.conformes,nonConformes:resultat.nonConformes,inconnus:resultat.inconnus}));}catch(e){}
  return resultat;
}
function obtenirResumeConformiteClientCDQ(idCompagnie){verifierDroit_('lecture');return recalculerResumeConformiteClientPC_(idCompagnie);}
function obtenirResumesConformiteClientsCDQ(ids){
  verifierDroit_('lecture');const props=PropertiesService.getScriptProperties().getProperties(),r={};
  (Array.isArray(ids)?ids:[]).slice(0,400).forEach(function(id){id=String(id||'');if(!id)return;const brut=props[cleResumeClientPC_(id)];if(!brut)return;try{r[id]=JSON.parse(brut);}catch(e){}});return r;
}
function enregistrerStatutsConformitePC(records,idCompagnie){
  const acces=verifierDroit_('ecriture');idCompagnie=String(idCompagnie||'').trim();if(!idCompagnie)throw new Error('Client introuvable.');
  const recs=Array.isArray(records)?records.slice(0,80):[],toSet={},acceptes=[],transitions=[];
  const propsService=PropertiesService.getScriptProperties(),props=propsService.getProperties();
  let clientNom='';try{clientNom=DriveApp.getFolderById(idCompagnie).getName();}catch(e){}
  recs.forEach(function(rec){
    const id=String(rec&&rec.id||'').trim(),statut=normaliserStatutPC_(rec&&rec.statut),revision=String(rec&&rec.revision||'');if(!id)return;
    const f=DriveApp.getFileById(id);if(!fichierEstDansClientCDQ_(f,idCompagnie))throw new Error('Un fichier ne fait pas partie du client sélectionné.');
    if(f.getMimeType()!==MimeType.PDF&&!/\.pdf$/i.test(f.getName()))return;
    if(revision!==f.getLastUpdated().toISOString())return;
    let old='inconnu';try{const prev=lireStatutPdfPC_(props,f);if(prev)old=normaliserStatutPC_(prev.statut);}catch(e){}
    const data={version:CDQ_PC_STATUS_VERSION_,fileId:id,clientId:idCompagnie,revision:revision,statut:statut,analyseLe:Date.now(),auteur:acces.email};
    toSet[cleStatutPdfPC_(id)]=JSON.stringify(data);acceptes.push(data);
    if(old!==statut)transitions.push({fileId:id,clientId:idCompagnie,clientNom:clientNom,reportNom:f.getName(),ancien:old,nouveau:statut,auteur:acces.email,date:data.analyseLe,raison:String(rec&&rec.raison||'')});
  });
  if(Object.keys(toSet).length)propsService.setProperties(toSet,false);
  transitions.forEach(function(t){try{enregistrerTransitionConformiteV72_(t);}catch(e){console.log('Suivi technique V72: '+e.message);}});
  const resume=recalculerResumeConformiteClientPC_(idCompagnie);return{ok:true,acceptes:acceptes.length,resume:resume};
}
// PC V3 : cache court + forceRefresh utilisé à l'ouverture, au retour au premier plan et toutes les 60 s.
function obtenirContenuClientPC(idCompagnie,forceRefresh){
  verifierDroit_('lecture');idCompagnie=String(idCompagnie||'').trim();if(!idCompagnie)throw new Error('Client introuvable.');assurerStructureClientAIOuverture_(idCompagnie);
  const cle='CDQ_PC_CONTENT_COMPLET_V1_'+empreinteCDQ_(idCompagnie).slice(0,36),cache=CacheService.getScriptCache();
  if(!forceRefresh){const brut=cache.get(cle);if(brut){try{return JSON.parse(brut);}catch(e){}}}
  const photo=construireIndexPhotosCDQ_(),contenu=lireDossierRecursif_(DriveApp.getFolderById(idCompagnie),photo);contenu.photoPresente=photoPresenteDansIndexCDQ_(photo,'client',idCompagnie);
  const r={contenu:contenu,genereLe:Date.now(),source:'drive',pcComplet:true};try{const j=JSON.stringify(r);if(j.length<90000)cache.put(cle,j,60);}catch(e){}return r;
}
function obtenirApercuFichierPC(fileId){
  verifierDroit_('lecture');fileId=String(fileId||'').trim();if(!fileId)throw new Error('Fichier introuvable.');const f=DriveApp.getFileById(fileId);
  const meta={id:f.getId(),nom:f.getName(),mimeType:f.getMimeType(),taille:Number(f.getSize()||0),dateModification:f.getLastUpdated().toISOString(),thumbnail:''};
  try{const dr=Drive.Files.get(fileId,{fields:'id,name,mimeType,thumbnailLink'});if(dr&&dr.thumbnailLink){const rr=UrlFetchApp.fetch(dr.thumbnailLink,{headers:{Authorization:'Bearer '+ScriptApp.getOAuthToken()},muteHttpExceptions:true,followRedirects:true});if(rr.getResponseCode()===200){const b=rr.getBlob(),bytes=b.getBytes();if(bytes.length<700000)meta.thumbnail='data:'+(b.getContentType()||'image/png')+';base64,'+Utilities.base64Encode(bytes);}}}catch(e){}
  return meta;
}


/* =====================================================
   PC V15 — RAPPORTS RECENTS GLOBAUX
   Lecture en cache des derniers PDF/Sheets appartenant au dossier maître.
===================================================== */
const CDQ_PC_RECENTS_CACHE_V15_ = 'CDQ_PC_RECENTS_V15';
function typeBalanceDepuisNomPCV15_(nom){
  const n=String(nom||'').toLowerCase();
  if(/camion|truck|pont.?bascule/.test(n)) return 'Camion';
  if(/plancher|plateforme|floor/.test(n)) return 'Plancher';
  if(/precision|précision|laboratoire|\blab\b/.test(n)) return 'Laboratoire';
  if(/cuve|tank|reservoir|réservoir/.test(n)) return 'Cuve';
  if(/production|convoyeur|conveyor|tr[eé]mie|doseuse/.test(n)) return 'Production';
  return 'Données';
}
function numeroRapportDepuisNomPCV15_(nom){
  const base=String(nom||'').replace(/\.[^.]+$/,'');
  const m=base.match(/R[-_ ]?\d[\d_-]*/i);
  return m?m[0].replace(/_/g,'-'):base.slice(0,30);
}
function obtenirRapportsRecentsPC(limite,forceRefresh){
  verifierDroit_('lecture');
  limite=Math.max(5,Math.min(50,Number(limite)||28));
  const cache=CacheService.getScriptCache();
  if(!forceRefresh){
    const brut=cache.get(CDQ_PC_RECENTS_CACHE_V15_);
    if(brut){try{return JSON.parse(brut).slice(0,limite);}catch(e){}}
  }
  const master=DriveApp.getFolderById(CONFIG.MASTER_FOLDER_ID), clients={}, dossiers=master.getFolders();
  while(dossiers.hasNext()){const d=dossiers.next();clients[d.getId()]={id:d.getId(),nom:d.getName()};}
  const resolutionCache={};
  function clientDepuisDossier_(folderId){
    folderId=String(folderId||'');
    if(!folderId)return null;
    if(Object.prototype.hasOwnProperty.call(resolutionCache,folderId))return resolutionCache[folderId];
    if(clients[folderId])return resolutionCache[folderId]=clients[folderId];
    let courant=folderId,visites={};
    for(let i=0;i<9&&courant&&!visites[courant];i++){
      visites[courant]=true;
      if(clients[courant])return resolutionCache[folderId]=clients[courant];
      if(courant===CONFIG.MASTER_FOLDER_ID)break;
      let folder;try{folder=DriveApp.getFolderById(courant);}catch(e){break;}
      const ps=folder.getParents();if(!ps.hasNext())break;
      const p=ps.next();courant=p.getId();
      if(clients[courant])return resolutionCache[folderId]=clients[courant];
    }
    resolutionCache[folderId]=null;return null;
  }
  const props=PropertiesService.getScriptProperties().getProperties(), out=[];
  let token=null,pages=0;
  do{
    const r=Drive.Files.list({q:'trashed = false',orderBy:'modifiedTime desc',pageSize:100,pageToken:token||undefined,fields:'nextPageToken,files(id,name,mimeType,modifiedTime,parents,size)'});
    const fs=(r&&r.files)||[];
    for(let i=0;i<fs.length&&out.length<Math.max(limite,28);i++){
      const meta=fs[i],nom=String(meta.name||''),mime=String(meta.mimeType||''),low=nom.toLowerCase();
      const compatible=mime==='application/pdf'||mime==='application/vnd.google-apps.spreadsheet'||/\.(xlsx?|xlsm|csv)$/.test(low);
      if(!compatible)continue;
      const parentId=meta.parents&&meta.parents.length?String(meta.parents[0]):'';
      const client=clientDepuisDossier_(parentId);if(!client)continue;
      let statut='inconnu';
      if(mime==='application/pdf'||/\.pdf$/i.test(nom)){
        try{const file=DriveApp.getFileById(meta.id),x=lireStatutPdfPC_(props,file);if(x)statut=normaliserStatutPC_(x.statut);}catch(e){}
      }
      out.push({id:String(meta.id),nom:nom,mimeType:mime,dateModification:String(meta.modifiedTime||''),clientId:client.id,clientNom:client.nom,statut:statut,typeBalance:typeBalanceDepuisNomPCV15_(nom),numeroRapport:numeroRapportDepuisNomPCV15_(nom),technicien:''});
    }
    token=r&&r.nextPageToken?r.nextPageToken:null;pages++;
  }while(token&&pages<4&&out.length<Math.max(limite,28));
  try{const j=JSON.stringify(out);if(j.length<95000)cache.put(CDQ_PC_RECENTS_CACHE_V15_,j,90);}catch(e){}
  return out.slice(0,limite);
}


/* =====================================================
   CDQ PC V21.65 — IMPORT / TÉLÉCHARGEMENT PC
===================================================== */
function importerFichierClientPC(idCompagnie, nomFichier, mimeType, base64) {
  verifierDroit_('ecriture');
  idCompagnie = String(idCompagnie || '').trim();
  nomFichier = String(nomFichier || '').replace(/[\\/:*?"<>|\u0000-\u001F]/g, '_').trim();
  mimeType = String(mimeType || 'application/octet-stream').trim();
  base64 = String(base64 || '').trim();

  if (!idCompagnie) throw new Error('Choisissez un client avant l’importation.');
  if (!nomFichier) throw new Error('Nom de fichier invalide.');
  if (!base64) throw new Error('Le fichier est vide.');

  const dossier = DriveApp.getFolderById(idCompagnie);
  if (!verifierDossierClientDirect_(dossier)) {
    throw new Error('Le dossier sélectionné n’est pas un client CDQ autorisé.');
  }

  let bytes;
  try { bytes = Utilities.base64Decode(base64); }
  catch(e) { throw new Error('Le contenu du fichier est invalide.'); }

  if (!bytes.length) throw new Error('Le fichier est vide.');
  if (bytes.length > 12 * 1024 * 1024) throw new Error('Le fichier dépasse la limite PC de 12 Mo.');

  const blob = Utilities.newBlob(bytes, mimeType, nomFichier);
  const fichier = dossier.createFile(blob);

  return {
    ok:true,
    id:fichier.getId(),
    nom:fichier.getName(),
    mimeType:fichier.getMimeType(),
    taille:Number(fichier.getSize() || 0),
    dateModification:fichier.getLastUpdated().toISOString()
  };
}

function obtenirLienTelechargementPCV2518(fichierId){
  verifierDroit_('lecture');
  fichierId=String(fichierId||'').trim();if(!fichierId)throw new Error('Fichier introuvable.');
  verifierCibleDansMasterCDQ_('fichier',fichierId);
  const f=DriveApp.getFileById(fichierId),mime=f.getMimeType(),id=encodeURIComponent(fichierId);
  let url='https://drive.google.com/uc?export=download&id='+id;
  if(mime==='application/vnd.google-apps.spreadsheet')url='https://docs.google.com/spreadsheets/d/'+id+'/export?format=xlsx';
  else if(mime==='application/vnd.google-apps.document')url='https://docs.google.com/document/d/'+id+'/export?format=docx';
  else if(mime==='application/vnd.google-apps.presentation')url='https://docs.google.com/presentation/d/'+id+'/export/pptx';
  else if(mime.indexOf('application/vnd.google-apps.')===0)url='https://drive.google.com/file/d/'+id+'/view';
  return{ok:true,nom:f.getName(),url:url};
}

function telechargerFichierPC(fichierId) {
  verifierDroit_('lecture');
  fichierId = String(fichierId || '').trim();
  if (!fichierId) throw new Error('Fichier introuvable.');

  verifierCibleDansMasterCDQ_('fichier', fichierId);
  const fichier = DriveApp.getFileById(fichierId);
  let blob = obtenirBlobOriginalPourEnvoi_(fichier);
  const taille = Number(blob.getBytes().length || 0);

  // Apps Script devient instable avec de très grosses réponses base64.
  // Pour les gros fichiers, ouvrir Drive plutôt que d’échouer silencieusement.
  if (taille > 12 * 1024 * 1024) {
    return {
      ok:true,
      nom:blob.getName() || fichier.getName(),
      mimeType:blob.getContentType() || fichier.getMimeType(),
      taille:taille,
      driveUrl:'https://drive.google.com/file/d/' + encodeURIComponent(fichierId) + '/view'
    };
  }

  return {
    ok:true,
    nom:blob.getName() || fichier.getName(),
    mimeType:blob.getContentType() || fichier.getMimeType() || 'application/octet-stream',
    taille:taille,
    base64:Utilities.base64Encode(blob.getBytes())
  };
}


/* =====================================================
   CDQ PC V21.69 — PERFORMANCE CLIENTS / RAPPORTS
===================================================== */
function obtenirDossiersClientsPCLeger(forceRefresh) {
  verifierDroit_('lecture');
  const cache = CacheService.getScriptCache();
  const cle = 'CDQ_PC_CLIENTS_LEGERS_V2169';
  if (!forceRefresh) {
    const brut = cache.get(cle);
    if (brut) {
      try { return JSON.parse(brut); } catch(e) {}
    }
  }

  const master = DriveApp.getFolderById(CONFIG.MASTER_FOLDER_ID);
  const it = master.getFolders();
  const out = [];
  while (it.hasNext()) {
    const d = it.next();
    if (estDossierSystemeCDQ_(d)) continue;
    out.push({id:d.getId(), nom:d.getName()});
  }
  out.sort(function(a,b){return a.nom.localeCompare(b.nom,'fr',{sensitivity:'base'});});
  try { cache.put(cle, JSON.stringify(out), 600); } catch(e) {}
  return out;
}

function cdqRapportMetaPCLeger_(fichier, clientId, clientNom, chemin) {
  const nom = String(fichier.getName() || '');
  const low = nom.toLowerCase();
  const mime = String(fichier.getMimeType() || '');
  let type = '';
  if (mime === 'application/pdf' || /\.pdf$/i.test(nom)) type = 'PDF';
  else if (mime === MimeType.GOOGLE_SHEETS ||
           /spreadsheet|excel|officedocument\.spreadsheetml/.test(mime) ||
           /\.(xlsx?|xlsm|csv)$/i.test(nom)) type = 'EXCEL';
  else return null;

  return {
    id:fichier.getId(),
    nom:nom,
    type:type,
    mimeType:mime,
    taille:Number(fichier.getSize() || 0),
    dateModification:fichier.getLastUpdated().toISOString(),
    clientId:String(clientId || ''),
    clientNom:String(clientNom || ''),
    pcPath:String(chemin || '/')
  };
}

function obtenirRapportsClientPCRapide(idCompagnie, forceRefresh) {
  verifierDroit_('lecture');
  idCompagnie = String(idCompagnie || '').trim();
  if (!idCompagnie) throw new Error('Client introuvable.');

  const cache = CacheService.getScriptCache();
  const cle = 'CDQ_PC_RAPPORTS_FAST_V2169_' + empreinteCDQ_(idCompagnie).slice(0,36);
  if (!forceRefresh) {
    const brut = cache.get(cle);
    if (brut) {
      try { return JSON.parse(brut); } catch(e) {}
    }
  }

  const client = DriveApp.getFolderById(idCompagnie);
  if (!verifierDossierClientDirect_(client)) throw new Error('Client CDQ non autorisé.');
  const clientNom = client.getName();
  const out = [];

  function scan(dossier, chemin, profondeur) {
    if (profondeur > 8) return;
    const fichiers = dossier.getFiles();
    while (fichiers.hasNext()) {
      const f = fichiers.next();
      const meta = cdqRapportMetaPCLeger_(f, idCompagnie, clientNom, chemin);
      if (meta) out.push(meta);
    }
    const dirs = dossier.getFolders();
    while (dirs.hasNext()) {
      const d = dirs.next();
      const nom = String(d.getName() || '');
      if (/^_CDQ/i.test(nom) || /^photos?$/i.test(nom)) continue;
      scan(d, chemin ? chemin + ' / ' + nom : nom, profondeur + 1);
    }
  }

  scan(client, '', 0);
  out.sort(function(a,b){return new Date(b.dateModification)-new Date(a.dateModification);});
  const resultat = {fichiers:out, clientId:idCompagnie, clientNom:clientNom, genereLe:Date.now(), source:'drive-fast'};
  try {
    const j = JSON.stringify(resultat);
    if (j.length < 95000) cache.put(cle, j, 180);
  } catch(e) {}
  return resultat;
}

function copierFichierVersClientPC(fichierId, idClientDestination) {
  verifierDroit_('ecriture');
  fichierId = String(fichierId || '').trim();
  idClientDestination = String(idClientDestination || '').trim();
  if (!fichierId || !idClientDestination) throw new Error('Fichier ou client destination invalide.');

  verifierCibleDansMasterCDQ_('fichier', fichierId);
  const destination = DriveApp.getFolderById(idClientDestination);
  if (!verifierDossierClientDirect_(destination)) throw new Error('Le client destination n’est pas autorisé.');

  const source = DriveApp.getFileById(fichierId);
  const nom = source.getName();
  const point = nom.lastIndexOf('.');
  const base = point > 0 ? nom.substring(0, point) : nom;
  const ext = point > 0 ? nom.substring(point) : '';
  let nouveauNom = nom, n = 1;
  while (destination.getFilesByName(nouveauNom).hasNext()) {
    nouveauNom = base + ' - Copie' + (n > 1 ? ' ' + n : '') + ext;
    n++;
  }
  const copie = source.makeCopy(nouveauNom, destination);
  return {
    ok:true,
    id:copie.getId(),
    nom:copie.getName(),
    clientId:idClientDestination,
    dateModification:copie.getLastUpdated().toISOString(),
    message:'Rapport copié vers « ' + destination.getName() + ' ».'
  };
}


/* =====================================================
   CDQ V21.72 — EXPLORATEUR DOSSIERS / SUIVI / PRÉFÉRENCES
===================================================== */
const CDQ_V72_SUIVI_FILE_PROP_ = 'CDQ_V72_SUIVI_SHEET_ID';
const CDQ_V72_PREF_PREFIX_ = 'CDQ_V72_PREF_';

function cdqV72Hash_(texte) {
  const raw = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(texte || ''), Utilities.Charset.UTF_8);
  return raw.map(function(b){return ('0'+((b<0?b+256:b).toString(16))).slice(-2);}).join('').slice(0,40);
}

function cdqV72Email_() {
  const acces = verifierAcces_();
  return normaliserEmailCDQ_(acces && acces.email || '');
}

// BEGIN CDQ_ICON_PREFERENCES_V2514
// Personal navigation artwork, stored separately from legacy display settings.
function cdqIconPreferenceOwnerV2514_(expectedEmail) {
  const email = cdqV72Email_();
  if (!email || email !== String(expectedEmail || '').trim().toLowerCase()) {
    throw new Error('Le compte a changé. Rouvrez les réglages.');
  }
  return email;
}
function cdqReadIconPreferenceV2514_(email) {
  let value = {};
  try {
    value = JSON.parse(PropertiesService.getScriptProperties().getProperty('CDQ_ICON_V2514_' + cdqV72Hash_(email)) || '{}') || {};
  } catch (error) {}
  const allowed = ['current', 'minimal', 'dark-pro', 'metal-music', 'isometric', 'aurora', 'obsidian', 'titanium', 'solar', 'cyberwave'];
  return {
    email: email,
    style: allowed.indexOf(value.style) >= 0 ? value.style : 'current',
    revision: Number.isSafeInteger(value.revision) && value.revision > 0 ? value.revision : 0
  };
}
function obtenirStyleIconesCDQV2514(expectedEmail) {
  return cdqReadIconPreferenceV2514_(cdqIconPreferenceOwnerV2514_(expectedEmail));
}
function enregistrerStyleIconesCDQV2514(expectedEmail, value) {
  const email = cdqIconPreferenceOwnerV2514_(expectedEmail);
  value = value && typeof value === 'object' ? value : {};
  if (['current', 'minimal', 'dark-pro', 'metal-music', 'isometric', 'aurora', 'obsidian', 'titanium', 'solar', 'cyberwave'].indexOf(value.style) < 0 ||
      !Number.isSafeInteger(value.revision) || value.revision <= 0) {
    throw new Error('Choix d’icônes invalide.');
  }
  const lock = LockService.getScriptLock();
  lock.waitLock(5000);
  try {
    const previous = cdqReadIconPreferenceV2514_(email);
    if (value.revision > previous.revision) {
      PropertiesService.getScriptProperties().setProperty('CDQ_ICON_V2514_' + cdqV72Hash_(email),
        JSON.stringify({style: value.style, revision: value.revision}));
      return {email: email, style: value.style, revision: value.revision};
    }
    return previous;
  } finally {
    lock.releaseLock();
  }
}
// END CDQ_ICON_PREFERENCES_V2514

function obtenirPreferencesUtilisateurCDQV72() {
  const email = cdqV72Email_();
  const key = CDQ_V72_PREF_PREFIX_ + cdqV72Hash_(email);
  const props = PropertiesService.getScriptProperties();
  let obj = {};
  try { obj = JSON.parse(props.getProperty(key) || '{}') || {}; } catch(e) {}

  // V22.03 : migration serveur UNE SEULE FOIS.
  // Ancienne échelle : 100 = rendu que nous voulons désormais appeler 75.
  if (!Number(obj.uiUpdatedAt || 0)) {
    obj.uiUpdatedAt = Date.now();
    try { props.setProperty(key, JSON.stringify(obj)); } catch(e) {}
  }

  const mapVersion = Number(obj.uiScaleMapVersion || 0);
  if (mapVersion < 2202) {
    let v = Number(obj.uiScale);
    if (!isFinite(v)) v = 50;
    v = Math.max(0, Math.min(100, Math.round(v)));
    if (v > 50) v = Math.round(50 + (v - 50) / 2);

    obj.uiScale = v;
    obj.uiScaleMapVersion = 2202;
    obj.updatedAt = new Date().toISOString();

    try { props.setProperty(key, JSON.stringify(obj)); } catch(e) {}
  }

  return obj;
}
function enregistrerPreferencesUtilisateurCDQV72(prefs) {
  const email = cdqV72Email_();
  prefs = prefs && typeof prefs === 'object' ? prefs : {};
  const props = PropertiesService.getScriptProperties();
  const key = CDQ_V72_PREF_PREFIX_ + cdqV72Hash_(email);

  let previous = {};
  try { previous = JSON.parse(props.getProperty(key) || '{}') || {}; } catch(e) {}

  const incomingRevision = (function(v){
    v=Number(v); return isFinite(v)&&v>0 ? Math.round(v) : Date.now();
  })(prefs.uiUpdatedAt);
  const previousRevision = (function(v){
    v=Number(v); return isFinite(v)&&v>0 ? Math.round(v) : 0;
  })(previous.uiUpdatedAt);

  const displayIsNewer = incomingRevision >= previousRevision;

  function scale(v,fallback){
    v=Number(v);
    if(isFinite(v))return Math.max(0,Math.min(100,Math.round(v)));
    fallback=Number(fallback);
    return isFinite(fallback)?Math.max(0,Math.min(100,Math.round(fallback))):50;
  }

  const out = {
    theme: ['dark','light','metal','electric','steel','violet'].indexOf(String(prefs.theme))>=0 ? String(prefs.theme) : String(previous.theme||'dark'),
    textSize: ['small','normal','large','xlarge'].indexOf(String(prefs.textSize))>=0 ? String(prefs.textSize) : String(previous.textSize||'normal'),
    density: ['compact','normal','comfortable'].indexOf(String(prefs.density))>=0 ? String(prefs.density) : String(previous.density||'normal'),

    uiScale: displayIsNewer ? scale(prefs.uiScale,previous.uiScale) : scale(previous.uiScale,50),
    uiScaleMapVersion: 2202,
    uiTextScale: displayIsNewer ? scale(prefs.uiTextScale,previous.uiTextScale) : scale(previous.uiTextScale,50),
    uiIconScale: displayIsNewer ? scale(prefs.uiIconScale,previous.uiIconScale) : scale(previous.uiIconScale,50),
    uiUpdatedAt: displayIsNewer ? incomingRevision : previousRevision,

    longPressMs: ['700','1000','1300'].indexOf(String(prefs.longPressMs))>=0 ? String(prefs.longPressMs) : String(previous.longPressMs||'1000'),
    swipeSensitivity: ['souple','normal','ferme'].indexOf(String(prefs.swipeSensitivity))>=0 ? String(prefs.swipeSensitivity) : String(previous.swipeSensitivity||'normal'),
    pdfReader: ['ask','cdq','ilovepdf','acrobat'].indexOf(String(prefs.pdfReader))>=0 ? String(prefs.pdfReader) : String(previous.pdfReader||'ask'),
    updatedAt: new Date().toISOString()
  };

  props.setProperty(key, JSON.stringify(out));
  return out;
}

function cdqV72MimeLabel_(mime,nom) {
  mime=String(mime||'');nom=String(nom||'');
  if(mime===MimeType.GOOGLE_SHEETS)return 'Google Sheets';
  if(mime==='application/pdf'||/\.pdf$/i.test(nom))return 'PDF';
  if(/spreadsheet|excel|officedocument\.spreadsheetml/.test(mime)||/\.(xlsx?|xlsm)$/i.test(nom))return 'Excel';
  if(/csv/.test(mime)||/\.csv$/i.test(nom))return 'CSV';
  return 'Fichier';
}
function cdqV72Compatible_(f) {
  const n=String(f.getName()||''),m=String(f.getMimeType()||'');
  return m===MimeType.GOOGLE_SHEETS||m==='application/pdf'||/spreadsheet|excel|officedocument\.spreadsheetml|csv/.test(m)||/\.(pdf|xlsx?|xlsm|csv)$/i.test(n);
}
function cdqV72Crumbs_(dossier,client) {
  const out=[],clientId=String(client.getId()),seen={};
  let cur=dossier,guard=0;
  while(cur&&guard++<30) {
    const id=String(cur.getId()); if(seen[id])break; seen[id]=true;
    out.unshift({id:id,nom:cur.getName()});
    if(id===clientId)break;
    let parent=null,ps=cur.getParents();
    while(ps.hasNext()){const p=ps.next();if(dossierEstSousAncetreCDQ_(p,clientId)){parent=p;break;}}
    cur=parent;
  }
  if(!out.length||String(out[0].id)!==clientId)out.unshift({id:clientId,nom:client.getName()});
  return out;
}
function obtenirContenuDossierPCRapideV72(dossierId,clientId,forceRefresh) {
  verifierDroit_('lecture');
  dossierId=String(dossierId||'').trim();clientId=String(clientId||'').trim();
  if(!dossierId||!clientId)throw new Error('Dossier ou client invalide.');
  const client=DriveApp.getFolderById(clientId);
  if(!verifierDossierClientDirect_(client))throw new Error('Client non autorisé.');
  const dossier=DriveApp.getFolderById(dossierId);
  if(!dossierEstSousAncetreCDQ_(dossier,clientId))throw new Error('Dossier hors du client sélectionné.');
  const cache=CacheService.getScriptCache(),key='CDQ_V72_FOLDER_'+cdqV72Hash_(clientId+'|'+dossierId);
  if(!forceRefresh){const hit=cache.get(key);if(hit){try{return JSON.parse(hit);}catch(e){}}}
  const items=[];
  const ds=dossier.getFolders();
  while(ds.hasNext()){const d=ds.next();if(estDossierSystemeCDQ_(d))continue;items.push({kind:'folder',id:d.getId(),nom:d.getName(),type:'Dossier'});}
  const fs=dossier.getFiles();
  while(fs.hasNext()){const f=fs.next();if(!cdqV72Compatible_(f))continue;items.push({kind:'file',id:f.getId(),nom:f.getName(),mimeType:f.getMimeType(),mimeLabel:cdqV72MimeLabel_(f.getMimeType(),f.getName()),type:cdqV72MimeLabel_(f.getMimeType(),f.getName()),dateModification:f.getLastUpdated().toISOString(),taille:Number(f.getSize()||0)});}
  items.sort(function(a,b){if(a.kind!==b.kind)return a.kind==='folder'?-1:1;return String(a.nom).localeCompare(String(b.nom),'fr',{sensitivity:'base'});});
  const out={clientId:clientId,clientNom:client.getName(),dossierId:dossierId,dossierNom:dossier.getName(),crumbs:cdqV72Crumbs_(dossier,client),items:items};
  try{const j=JSON.stringify(out);if(j.length<95000)cache.put(key,j,120);}catch(e){}
  return out;
}

/* ---------- Suivi technique ---------- */
const CDQ_V72_NC_HEADERS_=['eventId','clientId','clientNom','fileId','reportNom','dateOuverture','auteur','raison','etat','dateFermeture','derniereMaj'];
const CDQ_V72_W_HEADERS_=['watchId','clientId','clientNom','fileId','reportNom','titre','note','dateCreation','auteur','etat','dateFermeture','derniereMaj'];
const CDQ_V72_NOTE_HEADERS_=['noteId','type','targetId','clientId','texte','dateCreation','auteur'];

function cdqV72SuiviBook_() {
  if(PropertiesService.getScriptProperties().getProperty('CDQ_SYSTEM_FOLLOWUP_V1')==='on')return cdqSuiviBookCloudV20261113_();
  const props=PropertiesService.getScriptProperties();let id=String(props.getProperty(CDQ_V72_SUIVI_FILE_PROP_)||''),ss=null;
  if(id){try{ss=SpreadsheetApp.openById(id);}catch(e){}}
  if(!ss){
    const lock=LockService.getScriptLock();lock.waitLock(20000);
    try{
      id=String(props.getProperty(CDQ_V72_SUIVI_FILE_PROP_)||'');if(id){try{ss=SpreadsheetApp.openById(id);}catch(e){}}
      if(!ss){ss=SpreadsheetApp.create('_CDQ_Suivi_Technique',200,14);props.setProperty(CDQ_V72_SUIVI_FILE_PROP_,ss.getId());try{DriveApp.getFileById(ss.getId()).moveTo(obtenirDossierSystemeCDQ_());}catch(e){}}
    } finally {try{lock.releaseLock();}catch(e){}}
  }
  function sh(name,headers){
    let s=ss.getSheetByName(name);if(!s){s=ss.insertSheet(name);}
    if(s.getMaxColumns()<headers.length)s.insertColumnsAfter(s.getMaxColumns(),headers.length-s.getMaxColumns());
    s.getRange(1,1,1,headers.length).setValues([headers]);s.setFrozenRows(1);return s;
  }
  return {ss:ss,nc:sh('NonConformites',CDQ_V72_NC_HEADERS_),w:sh('Surveillances',CDQ_V72_W_HEADERS_),notes:sh('Notes',CDQ_V72_NOTE_HEADERS_)};
}
function cdqV72Rows_(sh,headers){
  const lr=sh.getLastRow();if(lr<2)return[];
  return sh.getRange(2,1,lr-1,headers.length).getValues().map(function(row,i){const o={_row:i+2};headers.forEach(function(h,j){let v=row[j];if(v instanceof Date)v=v.toISOString();o[h]=v;});return o;});
}
function cdqV72UserLabel_(email){
  email=normaliserEmailCDQ_(email);if(!email)return'';
  try{return libelleUtilisateurInventaireCDQ_(email);}catch(e){}
  return String(email.split('@')[0]||'').replace(/[._-]+/g,' ').replace(/\b\w/g,function(c){return c.toUpperCase();});
}
function cdqV72NotesMap_(rows){
  const map={};rows.forEach(function(n){const k=String(n.type)+':'+String(n.targetId);if(!map[k])map[k]=[];map[k].push({noteId:String(n.noteId||''),texte:String(n.texte||''),dateCreation:String(n.dateCreation||''),auteur:String(n.auteur||''),auteurLibelle:cdqV72UserLabel_(n.auteur)});});
  Object.keys(map).forEach(function(k){map[k].sort(function(a,b){return new Date(b.dateCreation)-new Date(a.dateCreation);});});return map;
}
function cdqV72OpenNcByFile_(rows,fileId){for(let i=rows.length-1;i>=0;i--){if(String(rows[i].fileId)===String(fileId)&&String(rows[i].etat).toUpperCase()==='ACTIVE')return rows[i];}return null;}
function enregistrerTransitionConformiteV72_(t){
 return cdqFollowupTxnV20261113_('enregistrerTransitionConformiteV72_',function(){
  const b=cdqV72SuiviBook_(),rows=cdqV72Rows_(b.nc,CDQ_V72_NC_HEADERS_),now=new Date(),open=cdqV72OpenNcByFile_(rows,t.fileId);
  if(t.nouveau==='non_conforme'&&t.ancien!=='non_conforme'&&!open){
    b.nc.appendRow([Utilities.getUuid(),t.clientId,t.clientNom||'',t.fileId,t.reportNom||'',new Date(t.date||Date.now()),t.auteur||'',t.raison||'','ACTIVE','',now]);
  } else if(t.ancien==='non_conforme'&&t.nouveau!=='non_conforme'&&open){
    b.nc.getRange(open._row,9).setValue('REGLEE');b.nc.getRange(open._row,10).setValue(now);b.nc.getRange(open._row,11).setValue(now);
  }
 });
}
function cdqV72SyncCurrentNc_(){
 return cdqFollowupTxnV20261113_('cdqV72SyncCurrentNc_',function(){
  const props=PropertiesService.getScriptProperties().getProperties(),b=cdqV72SuiviBook_(),rows=cdqV72Rows_(b.nc,CDQ_V72_NC_HEADERS_);
  const open={};rows.forEach(function(r){if(String(r.etat).toUpperCase()==='ACTIVE')open[String(r.fileId)]=r;});
  Object.keys(props).forEach(function(k){
    if(k.indexOf(CDQ_PC_STATUS_PREFIX_)!==0)return;let x;try{x=JSON.parse(props[k]);}catch(e){return;}if(!x||!x.fileId)return;
    const s=normaliserStatutPC_(x.statut),fid=String(x.fileId);
    if(s==='non_conforme'&&!open[fid]){
      let cn='',rn='';try{cn=DriveApp.getFolderById(String(x.clientId||'')).getName();}catch(e){}try{rn=DriveApp.getFileById(fid).getName();}catch(e){}
      b.nc.appendRow([Utilities.getUuid(),String(x.clientId||''),cn,fid,rn,new Date(Number(x.analyseLe)||Date.now()),String(x.auteur||''),'','ACTIVE','',new Date()]);
    }
  });
 });
}
function obtenirResumeSuiviTechniqueCDQV72(){
 return cdqFollowupTxnV20261113_('obtenirResumeSuiviTechniqueCDQV72',function(){
  verifierDroit_('lecture');
  try{cdqV72SyncCurrentNc_();}catch(e){}
  const b=cdqV72SuiviBook_(),nc=cdqV72Rows_(b.nc,CDQ_V72_NC_HEADERS_),w=cdqV72Rows_(b.w,CDQ_V72_W_HEADERS_);
  const nca=nc.filter(function(x){return String(x.etat).toUpperCase()==='ACTIVE';}),wa=w.filter(function(x){return String(x.etat).toUpperCase()==='ACTIVE';}),clients={};
  wa.forEach(function(x){if(x.clientId)clients[String(x.clientId)]=1;});
  return {nonConformitesActives:nca.length,surveillancesActives:wa.length,clientsSurveilles:Object.keys(clients).length};
 });
}
function obtenirNonConformitesGroupeesCDQV72(){
 return cdqFollowupTxnV20261113_('obtenirNonConformitesGroupeesCDQV72',function(){
  verifierDroit_('lecture');cdqV72SyncCurrentNc_();const b=cdqV72SuiviBook_(),notes=cdqV72NotesMap_(cdqV72Rows_(b.notes,CDQ_V72_NOTE_HEADERS_));
  return cdqV72Rows_(b.nc,CDQ_V72_NC_HEADERS_).map(function(x){const ns=notes['nc:'+String(x.eventId)]||[];return {eventId:String(x.eventId||''),clientId:String(x.clientId||''),clientNom:String(x.clientNom||''),fileId:String(x.fileId||''),reportNom:String(x.reportNom||''),dateOuverture:String(x.dateOuverture||''),auteur:String(x.auteur||''),auteurLibelle:cdqV72UserLabel_(x.auteur),raison:String(x.raison||''),etat:String(x.etat||'ACTIVE'),dateFermeture:String(x.dateFermeture||''),notes:ns,derniereNote:ns.length?ns[0].texte:''};}).sort(function(a,b){return new Date(b.dateOuverture)-new Date(a.dateOuverture);});
 });
}
function mettreAJourRaisonNonConformiteV72(eventId,raison){
 return cdqFollowupTxnV20261113_('mettreAJourRaisonNonConformiteV72',function(){
  verifierDroit_('ecriture');eventId=String(eventId||'');raison=String(raison||'').trim();if(raison.length>2500)throw new Error('Raison trop longue.');
  const b=cdqV72SuiviBook_(),rows=cdqV72Rows_(b.nc,CDQ_V72_NC_HEADERS_),x=rows.find(function(r){return String(r.eventId)===eventId;});if(!x)throw new Error('Non-conformité introuvable.');
  b.nc.getRange(x._row,8).setValue(raison);b.nc.getRange(x._row,11).setValue(new Date());return{ok:true};
 });
}
function ajouterNoteSuiviV72(type,targetId,clientId,texte){
 return cdqFollowupTxnV20261113_('ajouterNoteSuiviV72',function(){
  const acces=verifierDroit_('ecriture');type=String(type||'');targetId=String(targetId||'');texte=String(texte||'').trim();if(['nc','watch'].indexOf(type)<0||!targetId||!texte)throw new Error('Note invalide.');if(texte.length>3000)throw new Error('Note trop longue.');
  const b=cdqV72SuiviBook_(),now=new Date(),id=Utilities.getUuid();b.notes.appendRow([id,type,targetId,String(clientId||''),texte,now,acces.email]);return{ok:true,noteId:id};
 });
}
function obtenirSurveillancesGroupeesCDQV72(){
 return cdqFollowupTxnV20261113_('obtenirSurveillancesGroupeesCDQV72',function(){
  verifierDroit_('lecture');const b=cdqV72SuiviBook_(),notes=cdqV72NotesMap_(cdqV72Rows_(b.notes,CDQ_V72_NOTE_HEADERS_));
  return cdqV72Rows_(b.w,CDQ_V72_W_HEADERS_).map(function(x){const ns=notes['watch:'+String(x.watchId)]||[];return {watchId:String(x.watchId||''),clientId:String(x.clientId||''),clientNom:String(x.clientNom||''),fileId:String(x.fileId||''),reportNom:String(x.reportNom||''),titre:String(x.titre||''),note:String(x.note||''),dateCreation:String(x.dateCreation||''),auteur:String(x.auteur||''),auteurLibelle:cdqV72UserLabel_(x.auteur),etat:String(x.etat||'ACTIVE'),dateFermeture:String(x.dateFermeture||''),notes:ns,derniereNote:ns.length?ns[0].texte:''};}).sort(function(a,b){return new Date(b.dateCreation)-new Date(a.dateCreation);});
 });
}
function ajouterSurveillanceV72(clientId,titre,note,fileId,reportNom){
 return cdqFollowupTxnV20261113_('ajouterSurveillanceV72',function(){
  const acces=verifierDroit_('ecriture');clientId=String(clientId||'');titre=String(titre||'').trim();note=String(note||'').trim();fileId=String(fileId||'');reportNom=String(reportNom||'');
  if(!clientId)throw new Error('Choisissez un client.');if(!titre&&!note)throw new Error('Décrivez ce qui doit être surveillé.');
  const c=DriveApp.getFolderById(clientId);if(!verifierDossierClientDirect_(c))throw new Error('Client non autorisé.');if(fileId){const f=DriveApp.getFileById(fileId);if(!fichierEstDansClientCDQ_(f,clientId))throw new Error('Rapport hors de ce client.');if(!reportNom)reportNom=f.getName();}
  const b=cdqV72SuiviBook_(),now=new Date(),id=Utilities.getUuid();b.w.appendRow([id,clientId,c.getName(),fileId,reportNom,titre,note,now,acces.email,'ACTIVE','',now]);return{ok:true,watchId:id};
 });
}
function cloturerSurveillanceCDQV72(watchId,note){
 return cdqFollowupTxnV20261113_('cloturerSurveillanceCDQV72',function(){
  const acces=verifierDroit_('ecriture');watchId=String(watchId||'');const b=cdqV72SuiviBook_(),rows=cdqV72Rows_(b.w,CDQ_V72_W_HEADERS_),x=rows.find(function(r){return String(r.watchId)===watchId;});if(!x)throw new Error('Suivi introuvable.');
  const now=new Date();b.w.getRange(x._row,10).setValue('REGLEE');b.w.getRange(x._row,11).setValue(now);b.w.getRange(x._row,12).setValue(now);if(String(note||'').trim())ajouterNoteSuiviV72('watch',watchId,String(x.clientId||''),String(note||''));return{ok:true};
 });
}


/* =====================================================
   PC V21.79 — OUVERTURE DE DOSSIER CLIENT ROBUSTE
===================================================== */
function obtenirContenuDossierPCRapideV79(dossierId, clientId, forceRefresh) {
  verifierDroit_('lecture');
  dossierId=String(dossierId||'').trim();clientId=String(clientId||'').trim();
  if(!dossierId||!clientId)throw new Error('Dossier ou client invalide.');
  let client,dossier;
  try{client=DriveApp.getFolderById(clientId);}catch(e){throw new Error('Le dossier du client est introuvable dans Drive.');}
  try{dossier=DriveApp.getFolderById(dossierId);}catch(e){throw new Error('Le dossier demandé est introuvable dans Drive.');}
  // Autoriser explicitement la racine du client; pour un sous-dossier vérifier l'ascendance.
  if(dossierId!==clientId&&!dossierEstSousAncetreCDQ_(dossier,clientId))throw new Error('Ce dossier ne fait pas partie du client sélectionné.');
  // Vérifier que le client appartient bien au dossier maître, sans exiger un seul parent Drive.
  if(!dossierEstSousAncetreCDQ_(client,String(CONFIG.MASTER_FOLDER_ID||'')))throw new Error('Le client sélectionné est hors de CDQ Système.');
  const cache=CacheService.getScriptCache(),key='CDQ_V79_FOLDER_'+empreinteCDQ_(clientId+'|'+dossierId).slice(0,44);
  if(!forceRefresh){const hit=cache.get(key);if(hit){try{return JSON.parse(hit);}catch(e){}}}
  const items=[];
  try{
    let pageToken;
    do{
      const options={q:"'"+dossierId.replace(/'/g,"\\'")+"' in parents and trashed = false",fields:'nextPageToken,files(id,name,mimeType,modifiedTime,size)',pageSize:1000,supportsAllDrives:true,includeItemsFromAllDrives:true};
      if(pageToken)options.pageToken=pageToken;
      const page=Drive.Files.list(options);
      (page.files||[]).forEach(function(f){
        const meta={getName:function(){return f.name||''},getMimeType:function(){return f.mimeType||''}};
        if(f.mimeType==='application/vnd.google-apps.folder'){
          if(!estDossierSystemeCDQ_(meta))items.push({kind:'folder',id:f.id,nom:f.name,type:'Dossier'});
        }else if(cdqV72Compatible_(meta))items.push({kind:'file',id:f.id,nom:f.name,mimeType:f.mimeType,mimeLabel:cdqV72MimeLabel_(f.mimeType,f.name),type:cdqV72MimeLabel_(f.mimeType,f.name),dateModification:f.modifiedTime||'',taille:Number(f.size||0)});
      });
      pageToken=page.nextPageToken;
    }while(pageToken);
  }catch(e){
    // Keep compatibility when the advanced Drive service is not enabled.
    items.length=0;
  const ds=dossier.getFolders();while(ds.hasNext()){const d=ds.next();if(estDossierSystemeCDQ_(d))continue;items.push({kind:'folder',id:d.getId(),nom:d.getName(),type:'Dossier'});}
  const fs=dossier.getFiles();while(fs.hasNext()){const f=fs.next();if(!cdqV72Compatible_(f))continue;items.push({kind:'file',id:f.getId(),nom:f.getName(),mimeType:f.getMimeType(),mimeLabel:cdqV72MimeLabel_(f.getMimeType(),f.getName()),type:cdqV72MimeLabel_(f.getMimeType(),f.getName()),dateModification:f.getLastUpdated().toISOString(),taille:Number(f.getSize()||0)});}
  }
  items.sort(function(a,b){if(a.kind!==b.kind)return a.kind==='folder'?-1:1;return String(a.nom).localeCompare(String(b.nom),'fr',{sensitivity:'base'});});
  const crumbs=cdqV72Crumbs_(dossier,client);
  const out={ok:true,clientId:clientId,clientNom:client.getName(),dossierId:dossierId,dossierNom:dossier.getName(),crumbs:crumbs,items:items};
  try{const j=JSON.stringify(out);if(j.length<95000)cache.put(key,j,120);}catch(e){}
  return out;
}


/* =====================================================
   CDQ V21.84 — FACTURES PARTAGÉES PC / ANDROID
===================================================== */
const CDQ_FACTURES_PROP_ID_ = 'CDQ_FACTURES_SHEET_ID_V1';
const CDQ_FACTURES_HEADERS_ = ['factureId','numero','clientId','clientNom','date','montant','statut','note','creePar','creeLe','modifieLe'];
function obtenirClasseurFacturesCDQ_(){const props=PropertiesService.getScriptProperties();let id=String(props.getProperty(CDQ_FACTURES_PROP_ID_)||''),ss=null;if(id){try{ss=SpreadsheetApp.openById(id);}catch(e){}}if(!ss){const lock=LockService.getScriptLock();lock.waitLock(20000);try{id=String(props.getProperty(CDQ_FACTURES_PROP_ID_)||'');if(id){try{ss=SpreadsheetApp.openById(id);}catch(e){}}if(!ss){ss=SpreadsheetApp.create('_CDQ_Factures',300,CDQ_FACTURES_HEADERS_.length);props.setProperty(CDQ_FACTURES_PROP_ID_,ss.getId());try{DriveApp.getFileById(ss.getId()).moveTo(obtenirDossierSystemeCDQ_());}catch(e){}}}finally{try{lock.releaseLock();}catch(e){}}}let sh=ss.getSheetByName('Factures');if(!sh){sh=ss.getSheets()[0];sh.setName('Factures')}if(sh.getMaxColumns()<CDQ_FACTURES_HEADERS_.length)sh.insertColumnsAfter(sh.getMaxColumns(),CDQ_FACTURES_HEADERS_.length-sh.getMaxColumns());sh.getRange(1,1,1,CDQ_FACTURES_HEADERS_.length).setValues([CDQ_FACTURES_HEADERS_]);sh.setFrozenRows(1);return{ss:ss,sh:sh}}
function normaliserStatutFactureCDQ_(s){s=String(s||'BROUILLON').trim().toUpperCase().replace(/\s+/g,'_');return['BROUILLON','ENVOYEE','PAYEE','EN_RETARD'].indexOf(s)>=0?s:'BROUILLON'}
function lignesFacturesCDQ_(){const sh=obtenirClasseurFacturesCDQ_().sh,lr=sh.getLastRow();if(lr<2)return[];return sh.getRange(2,1,lr-1,CDQ_FACTURES_HEADERS_.length).getValues().map(function(r,i){const o={_row:i+2};CDQ_FACTURES_HEADERS_.forEach(function(h,j){let v=r[j];if(v instanceof Date)v=v.toISOString();o[h]=v});return o})}
function obtenirFacturesCDQ(limit){verifierDroit_('lecture');limit=Math.max(1,Math.min(1000,Number(limit)||500));return lignesFacturesCDQ_().sort(function(a,b){return new Date(b.date||b.creeLe)-new Date(a.date||a.creeLe)}).slice(0,limit).map(function(x){delete x._row;return x})}
function numeroFactureAutoCDQ_(){const d=Utilities.formatDate(new Date(),Session.getScriptTimeZone()||'America/Toronto','yyyyMMdd'),suffix=Utilities.getUuid().replace(/-/g,'').slice(0,4).toUpperCase();return'FAC-'+d+'-'+suffix}
function ajouterFactureCDQ(data){const acces=verifierDroit_('ecriture');data=data&&typeof data==='object'?data:{};let clientId=String(data.clientId||'').trim(),clientNom=String(data.clientNomLibre||'').trim();if(clientId){try{const d=DriveApp.getFolderById(clientId);if(!verifierDossierClientDirect_(d))throw new Error('Client non autorisé.');clientNom=d.getName()}catch(e){throw new Error('Client introuvable.')}}if(!clientNom)throw new Error('Choisissez ou écrivez un client.');const numero=String(data.numero||'').trim()||numeroFactureAutoCDQ_(),date=String(data.date||'').trim()||Utilities.formatDate(new Date(),Session.getScriptTimeZone()||'America/Toronto','yyyy-MM-dd'),montant=Math.max(0,Number(data.montant||0)||0),statut=normaliserStatutFactureCDQ_(data.statut),note=String(data.note||'').trim().slice(0,2000),now=new Date(),id=Utilities.getUuid();obtenirClasseurFacturesCDQ_().sh.appendRow([id,numero,clientId,clientNom,date,montant,statut,note,acces.email,now,now]);return{ok:true,factureId:id,numero:numero}}
function mettreAJourStatutFactureCDQ(factureId,statut){verifierDroit_('ecriture');factureId=String(factureId||'').trim();statut=normaliserStatutFactureCDQ_(statut);const x=lignesFacturesCDQ_().find(function(r){return String(r.factureId)===factureId});if(!x)throw new Error('Facture introuvable.');const sh=obtenirClasseurFacturesCDQ_().sh;sh.getRange(x._row,7).setValue(statut);sh.getRange(x._row,11).setValue(new Date());return{ok:true,statut:statut}}
