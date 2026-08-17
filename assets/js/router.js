/* UniNettuno Study Camp — router.js
   Router hash-based leggero, senza dipendenze. */
(function (global) {
  'use strict';
  var US = global.US;

  var routes = [];
  var root;

  function register(pattern, handler) {
    var paramNames = [];
    var regex = new RegExp('^' + pattern.replace(/:[^/]+/g, function (m) {
      paramNames.push(m.slice(1));
      return '([^/]+)';
    }) + '$');
    routes.push({ regex: regex, paramNames: paramNames, handler: handler, pattern: pattern });
  }

  function currentHash() {
    var h = global.location.hash || '#/dashboard';
    return h.replace(/^#/, '') || '/dashboard';
  }

  function resolve() {
    var path = currentHash().split('?')[0];
    for (var i = 0; i < routes.length; i++) {
      var m = path.match(routes[i].regex);
      if (m) {
        var params = {};
        routes[i].paramNames.forEach(function (name, idx) { params[name] = decodeURIComponent(m[idx + 1]); });
        document.dispatchEvent(new CustomEvent('unisc:viewchange'));
        root.setAttribute('tabindex', '-1');
        root.innerHTML = '';
        try {
          routes[i].handler(root, params);
        } catch (e) {
          console.error('Errore nel rendering della vista', e);
          root.innerHTML = '<div class="empty-state"><p>Si è verificato un errore nel caricamento di questa sezione.</p></div>';
        }
        root.focus({ preventScroll: false });
        updateNavActive(routes[i].pattern, path);
        return;
      }
    }
    global.location.hash = '#/dashboard';
  }

  function updateNavActive(pattern, path) {
    var base = '/' + path.split('/')[1];
    US.utils.qsa('[data-nav-link]').forEach(function (a) {
      var target = a.getAttribute('href').replace('#', '');
      var targetBase = '/' + target.split('/')[1];
      a.classList.toggle('active', targetBase === base);
      if (targetBase === base) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
  }

  function init(rootEl) {
    root = rootEl;
    global.addEventListener('hashchange', resolve);
    resolve();
  }

  function navigate(hash) {
    global.location.hash = hash;
  }

  US.router = { register: register, init: init, navigate: navigate };
})(window);
