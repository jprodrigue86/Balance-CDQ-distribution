/* V25.48 — close the template picker while creating and surface the new PDF immediately.
 * Keeps the accepted V25.46 viewer and the V25.44 integrated progress bar unchanged.
 */
(() => {
  'use strict';
  if (window.cdqCopyRefreshV2548) return;

  const esc = value => (window.CSS && typeof CSS.escape === 'function')
    ? CSS.escape(String(value))
    : String(value).replace(/["\\]/g, '\\$&');

  function findFolder(node, id) {
    if (!node) return null;
    if (String(node.id || '') === String(id || '')) return node;
    for (const child of (node.dossiers || [])) {
      const found = findFolder(child, id);
      if (found) return found;
    }
    return null;
  }

  function inferredName(result) {
    // Keep a local Drive status suffix OUT of the actual filename.
    const clean = value => String(value || '')
      .replace(/\s+[—–-]\s*⚠\s*Drive non confirmé(?:\.pdf)?\s*$/iu, '')
      .trim();
    const direct = clean(result?.nom || result?.name);
    if (direct) return /\.pdf$/i.test(direct) ? direct : direct + '.pdf';
    let label = String(document.getElementById('copyTemplateName')?.textContent || '')
      .replace(/[«»"]/g, '').trim();
    label = clean(label);
    if (!label) label = 'Nouveau rapport';
    return /\.pdf$/i.test(label) ? label : label + '.pdf';
  }

  function fileMeta(result, fallback = {}, existing = {}) {
    const supplied = result?.meta || result?.fichier || result || {};
    // Only the server revision identifies a modification; consultation time
    // must never become a sort key.
    const serverIdentity = supplied.revision || supplied.modifiedTime || supplied.dateModification ||
      result?.revision || result?.modifiedTime || result?.dateModification || '';
    const dateModification = serverIdentity || existing.dateModification || existing.modifiedTime || existing.revision ||
      fallback.dateModification || fallback.modifiedTime || fallback.revision || '';
    return {
      ...fallback,
      ...supplied,
      id: String(result?.id || ''),
      nom: inferredName(result),
      type: 'PDF',
      mimeType: 'application/pdf',
      dateModification,
      // Partial acknowledgements must also supersede older aliases retained
      // by the row merge; every reader compares the same confirmed identity.
      ...(serverIdentity ? {revision:serverIdentity, modifiedTime:serverIdentity} : {}),
      favori: !!(result?.favori || result?.starred),
      notePresente: !!result?.notePresente,
      photoPresente: !!result?.photoPresente
    };
  }

  function visibleHost(clientId, parentId) {
    if (String(typeof compagnieSelectionnee === 'undefined' ? '' : compagnieSelectionnee) !== String(clientId)) return null;
    const rootHost = document.getElementById('filesContainer');
    if (String(parentId) === String(clientId)) return rootHost;

    const folder = document.querySelector('.folder[data-folder-id="' + esc(parentId) + '"]');
    if (!folder || !folder.classList.contains('open')) return null;
    return folder.querySelector(':scope > .folder-content');
  }

  function removeExistingVisibleRow(id) {
    for (const checkbox of document.querySelectorAll('.file-checkbox')) {
      if (String(checkbox.dataset.fileId || '') !== String(id)) continue;
      checkbox.closest('.file-row')?.remove();
    }
  }

  function paintVisible(meta, clientId, parentId) {
    const host = visibleHost(clientId, parentId);
    if (!host || typeof creerLigneFichier !== 'function') return false;
    removeExistingVisibleRow(meta.id);
    const row = creerLigneFichier(meta);
    // Use the same modification order as a complete listing, including a
    // genuinely saved local edit awaiting Drive. Never rank by last opened.
    const root = cacheContenuCompagnies[clientId], parent = findFolder(root, parentId);
    const ordered = (parent?.fichiers || []).slice().sort((a,b)=>fileSortTimeV2782(b)-fileSortTimeV2782(a));
    const rank = ordered.findIndex(file=>String(file.id)===String(meta.id));
    const following = new Set(ordered.slice(rank+1).map(file=>String(file.id)));
    const next = Array.from(host.children).find(el=>following.has(String(el.querySelector('.file-checkbox')?.dataset.fileId||'')));
    const folder = Array.from(host.children).find(el=>el.matches('.folder'));
    host.insertBefore(row, next || folder || null);
    try { cdqEnhanceMobileFolders?.(); } catch (_) {}
    try { appliquerFiltresFichiers?.(); } catch (_) {}
    try { mettreAJourInterface?.(); } catch (_) {}
    try { cdqSchedulePhotoPresenceRefresh?.(); } catch (_) {}
    return true;
  }

  function inject(result, clientId, parentId, fallback = {}) {
    const id = String(result?.id || '');
    clientId = String(clientId || '');
    parentId = String(parentId || clientId);
    if (!id || !clientId || typeof cacheContenuCompagnies === 'undefined') return false;

    const root = cacheContenuCompagnies[clientId];
    if (!root) return false;
    const parent = findFolder(root, parentId) || (String(root.id || '') === clientId ? root : null);
    if (!parent) return false;

    parent.fichiers ||= [];
    const existing = parent.fichiers.findIndex(f => String(f.id || '') === id);
    const meta = fileMeta(result, fallback, existing >= 0 ? parent.fichiers[existing] : {});
    if (existing >= 0) parent.fichiers[existing] = { ...parent.fichiers[existing], ...meta };
    else parent.fichiers.unshift(meta);

    try { window.cdqInstantFiles2530?.keep?.(clientId, meta, parent.id); } catch (_) {}
    try {
      sauvegarderCachePersistantClient(
        clientId,
        root,
        (typeof cacheDerniereVerificationCompagnies !== 'undefined' && cacheDerniereVerificationCompagnies[clientId]) || Date.now()
      );
    } catch (_) {}

    return paintVisible(meta, clientId, parent.id);
  }

  // Keep the V25.30 receipt/reconciliation behavior, but avoid a full client-tree
  // redraw for the immediate confirmation. The new row is painted directly.
  if (window.cdqInstantFiles2530 && typeof window.cdqInstantFiles2530.confirm === 'function') {
    const previousConfirm = window.cdqInstantFiles2530.confirm.bind(window.cdqInstantFiles2530);
    window.cdqInstantFiles2530.confirm = function(result, clientId, parentId, fallback = {}) {
      const selected = String(typeof compagnieSelectionnee === 'undefined' ? '' : compagnieSelectionnee) === String(clientId || '');
      const savedLexical = typeof afficherContenu === 'function' ? afficherContenu : null;
      const savedWindow = window.afficherContenu;
      let confirmed = false;

      try {
        if (selected && savedLexical) {
          afficherContenu = function() {};
          window.afficherContenu = afficherContenu;
        }
        confirmed = !!previousConfirm(result, clientId, parentId, fallback);
      } finally {
        if (selected && savedLexical) {
          afficherContenu = savedLexical;
          window.afficherContenu = savedWindow || savedLexical;
        }
      }

      // Original confirmation is authoritative. Rejected old receipts must
      // never be reinserted by this faster presentation wrapper.
      if (!confirmed) return false;
      // Reuse the authoritative merged row: reinjecting the partial receipt
      // would lose pending/conflict markers and force every file to PDF.
      const locate = node => {
        if (!node) return null;
        const meta = (node.fichiers || []).find(file=>String(file.id)===String(result.id));
        return meta ? {meta,parentId:node.id} : (node.dossiers || []).map(locate).find(Boolean);
      };
      const stored = locate(cacheContenuCompagnies[String(clientId)]);
      const painted = stored && paintVisible(stored.meta, String(clientId), String(stored.parentId));
      if (selected && !painted && savedLexical && typeof cacheContenuCompagnies !== 'undefined') {
        const root = cacheContenuCompagnies[String(clientId || '')];
        if (root) savedLexical(root);
      }
      return confirmed;
    };
  }

  // The existing V25.44 progress wrapper already starts the integrated bar.
  // Once the original function passes validation it sets cdqCopieEnCours=true;
  // hide only then. On validation/server failure the modal is restored.
  if (typeof confirmerCopie === 'function') {
    const previousCopy = confirmerCopie;
    confirmerCopie = async function() {
      const overlay = document.getElementById('copyModalOverlay');
      const status = document.getElementById('copyModalStatus');
      const promise = previousCopy.apply(this, arguments);

      if (typeof cdqCopieEnCours !== 'undefined' && cdqCopieEnCours && overlay) {
        overlay.style.display = 'none';
      }

      const result = await promise;
      if (overlay && status?.classList.contains('error')) {
        overlay.style.display = 'flex';
      }
      return result;
    };
    window.confirmerCopie = confirmerCopie;
  }

  window.cdqCopyRefreshV2548 = { inject, version: '25.48' };
})();
