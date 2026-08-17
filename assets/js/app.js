/* UniNettuno Study Camp — app.js
   Bootstrap: inizializza dati, UI, router. */
(function (global) {
  'use strict';
  var US = global.US;

  function boot() {
    US.store.load();
    US.ui.init();

    US.router.register('/dashboard', US.views.dashboard.render);
    US.router.register('/esami', US.views.exams.render);
    US.router.register('/esami/:id', US.views.exams.render);
    US.router.register('/sessione', US.views.session.render);
    US.router.register('/ripassi', US.views.reviews.render);
    US.router.register('/errori', US.views.errors.render);
    US.router.register('/simulazioni', US.views.simulations.render);
    US.router.register('/materiali', US.views.materials.render);
    US.router.register('/statistiche', US.views.stats.render);
    US.router.register('/impostazioni', US.views.settings.render);

    US.router.init(document.getElementById('view-root'));

    document.addEventListener('unisc:viewchange', function () {
      document.body.classList.remove('focus-mode');
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})(window);
