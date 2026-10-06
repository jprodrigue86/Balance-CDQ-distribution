// Reuse an already authenticated session; a device token alone never unlocks it.
function reprendreSessionCourteCDQV2524(jetonSession, jetonAppareil) {
  const token = String(jetonSession || '').trim();
  const props = PropertiesService.getScriptProperties();
  let record;
  try { record = JSON.parse(props.getProperty(cleProprieteSessionRpcCDQ_(token)) || 'null'); } catch (_) {}
  const now = Date.now();
  if (!token || !record || Number(record.expiresAt || 0) <= now)
    return {autorise:false};
  const device = lireUtilisateurDepuisJetonAppareilCDQ_(jetonAppareil);
  if (!device || normaliserEmailCDQ_(device.email) !== normaliserEmailCDQ_(record.email)) return {autorise:false};
  // The device lookup above already read current roles and revocation state.
  // Reuse that result only within this execution; never trust a stored role.
  record.lastSeen=now;
  props.setProperty(cleProprieteSessionRpcCDQ_(token),JSON.stringify(record));
  return cdqStartupCachedV2527_({autorise:true, email:device.email, role:device.role,
    jetonSession:token, sessionExpiresAtV2686:Number(record.expiresAt),
    startupMaintenanceV2686:true});
}
