/* V25.55 — optimistic PDF copy row.
 * The client sees the new report immediately while the durable Drive copy
 * finishes in the background. The row is replaced by the confirmed file
 * through the existing V25.48/V25.30 confirmation path.
 */
(() => {
  'use strict';
  if (window.cdqCopyRefreshV2555) return;

  const pending = new Map();

  const esc = value => (window.CSS && typeof CSS.escape === 'function')
    ? CSS.escape(String(value))
    : String(value).replace(/["\\]/g, '\\$&');

  function visibleHost(clientId, parentId) {
    if (String(typeof compagnieSelectionnee === 'undefined' ? '' : compagnieSelectionnee) !== String(clientId || '')) return null;
    const rootHost = document.getElementById('filesContainer');
    if (String(parentId || clientId) === String(clientId)) return rootHost;
    const folder = document.querySelector('.folder[data-folder-id="' + esc(parentId) + '"]');
    if (!folder || !folder.classList.contains('open')) return null;
    return folder.querySelector(':scope > .folder-content');
  }

  function currentContext() {
    try {
      const type = String(typeof typeCopieEnAttente === 'undefined' ? '' : typeCopieEnAttente || '');
      const model = (type === 'precision' || type === 'camion')
        ? type
        : String(typeof modeleCopieEnAttente === 'undefined' ? '' : modeleCopieEnAttente || '');
      const clientId = String(typeof compagnieSelectionnee === 'undefined' ? '' : compagnieSelectionnee || '');
      const parentId = String(typeof cdqDestinationCreationId === 'function' ? cdqDestinationCreationId() : clientId);
      const names = typeof CDQ_MODELES_INTERMEDIAIRES === 'undefined' ? null : CDQ_MODELES_INTERMEDIAIRES;
      const name = String(names?.[model] || document.getElementById('copyTemplateName')?.textContent || 'Nouveau rapport')
        .replace(/[«»"]/g, '').trim();
      return {type, model, clientId, parentId, name};
    } catch (_) {
      return null;
    }
  }

  function remove(requestId) {
    const item = pending.get(String(requestId || ''));
    if (!item) return false;
    clearTimeout(item.timer);
    item.row?.remove();
    pending.delete(item.requestId);
    return true;
  }

  function removeMatching(clientId, parentId) {
    for (const item of pending.values()) {
      if (String(item.clientId) !== String(clientId || '')) continue;
      if (String(item.parentId) !== String(parentId || clientId || '')) continue;
      remove(item.requestId);
      return true;
    }
    return false;
  }

  function paint(context, requestId) {
    if (!context?.clientId || !context?.parentId || !requestId || typeof creerLigneFichier !== 'function') return null;
    const host = visibleHost(context.clientId, context.parentId);
    if (!host) return null;

    remove(requestId);
    const meta = {
      id: '__cdq_pending_copy_v2555_' + requestId,
      nom: context.name + ' — création…',
      type: 'PDF',
      mimeType: 'application/pdf',
      dateModification: new Date().toISOString()
    };
    const row = creerLigneFichier(meta);
    row.classList.add('cdq-pending-copy-v2555');
    row.dataset.cdqPendingCopyV2555 = '1';
    const checkbox = row.querySelector('.file-checkbox');
    if (checkbox) checkbox.disabled = true;
    const date = row.querySelector('.file-date');
    if (date) date.textContent = 'Création en cours…';

    const stop = event => {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      try { afficherMessage('Création du PDF en cours…', false); } catch (_) {}
    };
    row.addEventListener('pointerdown', stop, true);
    row.addEventListener('click', stop, true);
    host.prepend(row);

    const item = {
      requestId: String(requestId),
      clientId: String(context.clientId),
      parentId: String(context.parentId),
      row,
      timer: setTimeout(() => {
        const current = pending.get(String(requestId));
        if (!current) return;
        const label = current.row?.querySelector('.file-date');
        if (label) label.textContent = 'Synchronisation en arrière-plan…';
      }, 12000)
    };
    pending.set(item.requestId, item);
    return row;
  }

  if (window.cdqInstantFiles2530 && typeof window.cdqInstantFiles2530.confirm === 'function') {
    const previousConfirm = window.cdqInstantFiles2530.confirm.bind(window.cdqInstantFiles2530);
    window.cdqInstantFiles2530.confirm = function(result, clientId, parentId, fallback) {
      const value = previousConfirm(result, clientId, parentId, fallback);
      const supplied = result?.meta || result?.fichier || result || {};
      const pdf = fallback?.type === 'PDF' ||
        String(supplied.type || '').toUpperCase() === 'PDF' ||
        String(supplied.mimeType || '').toLowerCase() === 'application/pdf' ||
        /\.pdf$/i.test(String(supplied.nom || result?.nom || ''));
      if (result?.id && result?.ok !== false && pdf) removeMatching(clientId, parentId);
      return value;
    };
  }

  if (typeof confirmerCopie === 'function') {
    const previousCopy = confirmerCopie;
    confirmerCopie = async function() {
      const context = currentContext();
      const promise = previousCopy.apply(this, arguments);

      let requestId = '';
      try {
        if (typeof cdqCopieEnCours !== 'undefined' && cdqCopieEnCours &&
            typeof cdqCopieRequestId !== 'undefined') {
          requestId = String(cdqCopieRequestId || '');
          if (requestId) paint(context, requestId);
        }
      } catch (_) {}

      try {
        const result = await promise;
        const status = document.getElementById('copyModalStatus');
        if (requestId && status?.classList.contains('error')) remove(requestId);
        return result;
      } catch (error) {
        if (requestId) remove(requestId);
        throw error;
      }
    };
    window.confirmerCopie = confirmerCopie;
  }

  const style = document.createElement('style');
  style.id = 'cdq-copy-refresh-v2555-style';
  style.textContent = `
.file-row.cdq-pending-copy-v2555{
  opacity:.78!important;
  border:1px dashed rgba(86,220,255,.72)!important;
  box-shadow:inset 3px 0 0 rgba(86,220,255,.72)!important;
  cursor:progress!important;
}
.file-row.cdq-pending-copy-v2555 .file-date{
  color:#70ddff!important;
  font-weight:800!important;
}
.file-row.cdq-pending-copy-v2555 .file-actions{
  visibility:hidden!important;
}
`;
  document.head.appendChild(style);

  window.cdqCopyRefreshV2555 = {
    paint, remove, removeMatching,
    state: pending,
    version: '25.55'
  };
})();
