/* UniNettuno Study Camp — ui.js
   Helper condivisi: toast, modali, conferme. */
(function (global) {
  'use strict';
  var US = global.US;
  var u = US.utils;

  var toastRoot, modalRoot;
  function init() {
    toastRoot = document.getElementById('toast-root');
    modalRoot = document.getElementById('modal-root');
  }

  function toast(message, type) {
    if (!toastRoot) init();
    var t = u.el('<div class="toast toast-' + (type || 'info') + '" role="status">' + u.escapeHTML(message) + '</div>');
    toastRoot.appendChild(t);
    requestAnimationFrame(function () { t.classList.add('show'); });
    setTimeout(function () {
      t.classList.remove('show');
      setTimeout(function () { t.remove(); }, 250);
    }, 3200);
  }

  var lastFocused = null;
  function openModal(opts) {
    if (!modalRoot) init();
    lastFocused = document.activeElement;
    modalRoot.innerHTML = '';
    var overlay = u.el('<div class="modal-overlay" role="presentation"></div>');
    var size = opts.size === 'lg' ? ' modal-lg' : (opts.size === 'sm' ? ' modal-sm' : '');
    var modal = u.el(
      '<div class="modal' + size + '" role="dialog" aria-modal="true" aria-labelledby="modal-title-el">' +
      '<div class="modal-header"><h2 id="modal-title-el">' + u.escapeHTML(opts.title || '') + '</h2>' +
      '<button type="button" class="btn-icon modal-close" aria-label="Chiudi">✕</button></div>' +
      '<div class="modal-body"></div></div>'
    );
    var body = modal.querySelector('.modal-body');
    if (typeof opts.body === 'string') body.innerHTML = opts.body;
    else if (opts.body instanceof Node) body.appendChild(opts.body);
    overlay.appendChild(modal);
    modalRoot.appendChild(overlay);
    modalRoot.classList.add('open');
    document.body.classList.add('modal-open');

    function close() {
      modalRoot.classList.remove('open');
      document.body.classList.remove('modal-open');
      modalRoot.innerHTML = '';
      if (lastFocused && lastFocused.focus) lastFocused.focus();
    }
    modal.querySelector('.modal-close').addEventListener('click', close);
    overlay.addEventListener('mousedown', function (e) { if (e.target === overlay) close(); });
    function onKey(e) {
      if (e.key === 'Escape') { close(); document.removeEventListener('keydown', onKey); }
      if (e.key === 'Tab') trapFocus(e, modal);
    }
    document.addEventListener('keydown', onKey);

    if (opts.onMount) opts.onMount(body, close);
    var focusTarget = modal.querySelector('[autofocus]') || modal.querySelector('input,textarea,select,button');
    if (focusTarget) focusTarget.focus();
    return close;
  }

  function trapFocus(e, modal) {
    var focusables = u.qsa('a[href], button, textarea, input, select, [tabindex]:not([tabindex="-1"])', modal)
      .filter(function (el) { return !el.disabled && el.offsetParent !== null; });
    if (!focusables.length) return;
    var first = focusables[0], last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  function confirmDialog(opts) {
    return new Promise(function (resolve) {
      var close = openModal({
        title: opts.title || 'Conferma',
        size: 'sm',
        body: '<p>' + u.escapeHTML(opts.message || '') + '</p>' +
          '<div class="modal-actions">' +
          '<button type="button" class="btn btn-ghost" data-act="cancel">Annulla</button>' +
          '<button type="button" class="btn ' + (opts.danger ? 'btn-danger' : 'btn-primary') + '" data-act="ok">' + u.escapeHTML(opts.confirmLabel || 'Conferma') + '</button>' +
          '</div>',
        onMount: function (body, closeFn) {
          body.querySelector('[data-act="cancel"]').addEventListener('click', function () { closeFn(); resolve(false); });
          body.querySelector('[data-act="ok"]').addEventListener('click', function () { closeFn(); resolve(true); });
        }
      });
    });
  }

  function doubleConfirmText(opts) {
    return new Promise(function (resolve) {
      var phrase = opts.phrase || 'ELIMINA';
      openModal({
        title: opts.title || 'Conferma distruttiva',
        size: 'sm',
        body: '<p>' + u.escapeHTML(opts.message || '') + '</p>' +
          '<p>Scrivi <strong>' + u.escapeHTML(phrase) + '</strong> per confermare.</p>' +
          '<input type="text" class="input" id="confirm-phrase-input" autocomplete="off">' +
          '<div class="modal-actions">' +
          '<button type="button" class="btn btn-ghost" data-act="cancel">Annulla</button>' +
          '<button type="button" class="btn btn-danger" data-act="ok" disabled>Elimina definitivamente</button>' +
          '</div>',
        onMount: function (body, closeFn) {
          var input = body.querySelector('#confirm-phrase-input');
          var okBtn = body.querySelector('[data-act="ok"]');
          input.addEventListener('input', function () { okBtn.disabled = input.value.trim() !== phrase; });
          body.querySelector('[data-act="cancel"]').addEventListener('click', function () { closeFn(); resolve(false); });
          okBtn.addEventListener('click', function () { closeFn(); resolve(true); });
        }
      });
    });
  }

  function promptText(opts) {
    return new Promise(function (resolve) {
      openModal({
        title: opts.title || 'Inserisci un valore', size: 'sm',
        body: '<form id="qp-form"><input class="input" name="v" autofocus required placeholder="' + u.escapeHTML(opts.placeholder || '') + '">' +
          '<div class="modal-actions"><button type="button" class="btn btn-ghost" data-act="cancel">Annulla</button>' +
          '<button type="submit" class="btn btn-primary">' + u.escapeHTML(opts.confirmLabel || 'Aggiungi') + '</button></div></form>',
        onMount: function (body, close) {
          body.querySelector('[data-act="cancel"]').addEventListener('click', function () { close(); resolve(null); });
          body.querySelector('#qp-form').addEventListener('submit', function (e) {
            e.preventDefault();
            var v = new FormData(e.target).get('v').trim();
            close();
            resolve(v || null);
          });
        }
      });
    });
  }

  US.ui = { toast: toast, openModal: openModal, confirmDialog: confirmDialog, doubleConfirmText: doubleConfirmText, promptText: promptText, init: init };
})(window);
