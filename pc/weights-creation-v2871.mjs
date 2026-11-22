// New certificates choose their visible rows before their durable identity is created.
// Existing copies retain their own PDF and their saved dates.
import {weightsToday} from './reader-weights-v2871.mjs';
import {weightSelectionPrefillV2872} from './weights-catalog-v2872.mjs';
export {renderWeightsCountV2871} from './weights-creation-ui-v2872.mjs';

export function weightRowsV2871(value=14){
  const count=Number(value);
  if(!Number.isInteger(count)||count<1||count>14)throw Error('Choisissez entre 1 et 14 poids.');
  return count;
}

export function weightsInitialValuesV2871(values,now=new Date()){
  const allowed=/^(client_(nom|telephone|technicien|adresse|ville|province|code_postal)|date_etalonnage)$/;
  const result={};
  for(const [name,value] of Object.entries(values||{})){
    if(!allowed.test(name)||typeof value!=='string'||value.length>1000)return null;
    if(value.trim())result[name]=value;
  }
  if(!result.date_etalonnage)result.date_etalonnage=weightsToday(now);
  return result;
}

export function weightCreationValuesV2872(values,options={},now=new Date()){
  const identity=weightsInitialValuesV2871(values,now);
  if(!identity)throw Error('Les coordonnées du nouveau certificat sont invalides.');
  const count=weightRowsV2871(options.weightRowsV2871);
  return {...identity,...weightSelectionPrefillV2872(options.weightSelectionV2872,count)};
}

// Included in the existing weights-creation module on both clients.
const certificateFolderName = 'Certificats de poids étalons';
function isWeightFolder(name) {
  const normalized = String(name || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .trim().toLowerCase().replace(/\s+/g, ' ');
  return /^(?:certificats?|certficats?) (?:de )?poids? etalons?$/.test(normalized);
}

function certificateChild(root, clientId) {
  if (!root || String(root.id) !== clientId || !Array.isArray(root.dossiers) ||
      root.charge === false || root.complete === false || root.partial || root.truncated ||
      root.tronque || root.incomplete || root.nextPageToken) return null;
  const matches = root.dossiers.filter(folder => isWeightFolder(folder.nom || folder.name));
  if (matches.length > 1) throw Error('Plusieurs dossiers de certificats existent pour ce client. Vérifiez leur classement dans Drive.');
  const folder = matches[0];
  if (!folder) return null;
  if (!folder.id || String(folder.id) === clientId ||
      (folder.parents && (folder.parents.length !== 1 || String(folder.parents[0]) !== clientId)))
    throw Error('Le dossier de certificats ne correspond pas au client.');
  return folder;
}

export async function resolveWeightDestination({clientId, cachedRoot, online, readRoot, ensureFolder, guard}) {
  guard();
  if (!online) {
    const existing = certificateChild(cachedRoot, clientId);
    if (existing) return String(existing.id);
    throw Error('Connectez Drive une première fois pour retrouver le dossier de certificats de ce client.');
  }
  const read = async () => {
    guard();
    const reply = await readRoot(clientId);
    guard();
    const root = reply?.contenu;
    if (reply?.ok === false || reply?.partial || reply?.incomplete || reply?.nextPageToken ||
        reply?.complete === false || (reply?.source && String(reply.source).toLowerCase() !== 'drive') ||
        !root || String(root.id) !== clientId || !Array.isArray(root.dossiers) ||
        !Array.isArray(root.fichiers) || root.charge === false || root.complete === false ||
        root.partial || root.incomplete || root.tronque || root.truncated || root.nextPageToken)
      throw Error('Drive n’a pas confirmé le dossier client pour ce certificat.');
    return certificateChild(root, clientId);
  };
  const existing = await read();
  if (existing) return String(existing.id);
  guard();
  // This RPC reserves the (parent, name) pair across technicians and devices.
  const made = await ensureFolder(clientId, certificateFolderName);
  guard();
  if (!made?.id || String(made.clientId) !== clientId || String(made.parentId) !== clientId ||
      made.nom !== certificateFolderName) throw Error('Création du dossier de certificats non confirmée.');
  const confirmed = await read();
  if (String(confirmed?.id || '') !== String(made.id))
    throw Error('Drive n’a pas confirmé la destination du certificat.');
  return String(confirmed.id);
}
