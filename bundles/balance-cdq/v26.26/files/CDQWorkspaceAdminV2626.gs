// V26.26: promotion ponctuelle explicitement demandée par le propriétaire.
// Aucun changement du compte propriétaire Apps Script ni des permissions Drive.
function cdqEnsureWorkspaceAdminV2626_() {
  const key = 'CDQ_WORKSPACE_ADMIN_APPLIED_V2626';
  const target = 'jprodrigue@groupecdq.com';
  const props = PropertiesService.getScriptProperties();
  if (props.getProperty(key)) return;
  if (obtenirAdministrateurPrincipal_() !== 'jp.rodrigue86@gmail.com') {
    throw new Error('Le correctif administrateur V26.26 vise un autre propriétaire.');
  }
  const lock = LockService.getScriptLock();
  const alreadyHeld = lock.hasLock();
  if (!alreadyHeld) lock.waitLock(15000);
  try {
    if (props.getProperty(key)) return;
    // Relire sous verrou, sans réutiliser une liste provenant du navigateur.
    const users = lireUtilisateursStockesCDQ_();
    let user = users.find(function(u) { return u.email === target; });
    const present = !!user;
    const previousRole = user ? user.role : null;
    if (!user) {
      user = {email: target, role: 'admin'};
      users.push(user);
    } else {
      // Conserver son NIP, son code d'activation et ses sessions existants.
      user.role = 'admin';
    }
    sauvegarderUtilisateursStockesCDQ_(users);
    props.setProperty(key, JSON.stringify({
      email: target, previousRole: previousRole, wasPresent: present,
      appliedAt: new Date().toISOString(), version: '26.26'
    }));
    // Le marqueur rend l'opération unique: une révocation ultérieure décidée
    // dans Gestion des utilisateurs ne sera pas annulée à la connexion.
  } finally {
    if (!alreadyHeld) lock.releaseLock();
  }
}
