/* UniNettuno Study Camp — views/settings.js (Impostazioni / Backup / Disponibilità) */
(function (global) {
  'use strict';
  var US = global.US;
  var u = US.utils;
  var store = US.store;

  var DAY_LABELS = [
    { key: 'mon', label: 'Lunedì' }, { key: 'tue', label: 'Martedì' }, { key: 'wed', label: 'Mercoledì' },
    { key: 'thu', label: 'Giovedì' }, { key: 'fri', label: 'Venerdì' }, { key: 'sat', label: 'Sabato' }, { key: 'sun', label: 'Domenica' }
  ];
  var OPTIONS = [0, 25, 45, 60, 90, 120];

  function render(root) {
    var d = store.getData();
    root.innerHTML =
      '<div class="view-header"><div><h1>Impostazioni / Backup</h1><p class="muted">Disponibilità realistica, dati locali ed esportazione.</p></div></div>' +

      '<section class="card privacy-box">' +
        '<p>I dati restano in questo browser. GitHub Pages non riceve i tuoi progressi. Per trasferire i dati su un altro dispositivo usa Esporta/Importa.</p>' +
      '</section>' +

      '<div class="view-header sub"><h2>Disponibilità settimanale</h2></div>' +
      '<section class="card">' +
        '<p class="muted small">Imposta i minuti realistici disponibili per ciascun giorno. Il lavoro (8:00–17:00) e il recupero sono già considerati: non serve forzare 3 ore ogni sera.</p>' +
        '<div class="availability-grid" id="availability-grid"></div>' +
        '<p class="muted small">Segna i giorni di allenamento duro: in quei giorni verranno proposti al massimo 25–45 min di recall/flashcard/error log.</p>' +
      '</section>' +

      '<div class="view-header sub"><h2>Dati e backup</h2></div>' +
      '<section class="card backup-actions">' +
        '<button type="button" class="btn btn-ghost" id="btn-export">⬇ Esporta dati (JSON)</button>' +
        '<label class="btn btn-ghost file-btn">⬆ Importa dati (JSON)<input type="file" accept="application/json" id="import-input" class="visually-hidden"></label>' +
        '<button type="button" class="btn btn-ghost" id="btn-restore-backup">Ripristina ultimo backup automatico</button>' +
        '<button type="button" class="btn btn-ghost" id="btn-demo">Ripristina dati demo</button>' +
        '<button type="button" class="btn btn-danger" id="btn-wipe">Cancella tutti i dati locali</button>' +
      '</section>' +
      '<p class="muted small">Consiglio: usa "Esporta dati" prima di aggiornare l\'app o cambiare browser/dispositivo.</p>';

    renderAvailability(u.qs('#availability-grid', root), d);
    wireBackup(root);
  }

  function renderAvailability(container, d) {
    container.innerHTML = DAY_LABELS.map(function (day) {
      var current = d.availability[day.key] != null ? d.availability[day.key] : 45;
      var isTraining = (d.availability.trainingDays || []).indexOf(day.key) !== -1;
      return '<div class="avail-row">' +
        '<span class="avail-day">' + day.label + '</span>' +
        '<select class="input input-sm" data-day="' + day.key + '" data-role="minutes">' +
          OPTIONS.map(function (m) { return '<option value="' + m + '"' + (m === current ? ' selected' : '') + '>' + (m === 0 ? 'Nessuna' : m + ' min') + '</option>'; }).join('') +
        '</select>' +
        '<label class="avail-training"><input type="checkbox" data-day="' + day.key + '" data-role="training"' + (isTraining ? ' checked' : '') + '> Allenamento duro</label>' +
      '</div>';
    }).join('');
    container.addEventListener('change', function (e) {
      var day = e.target.dataset.day;
      if (!day) return;
      var data = store.getData();
      if (e.target.dataset.role === 'minutes') data.availability[day] = Number(e.target.value);
      if (e.target.dataset.role === 'training') {
        var set = new Set(data.availability.trainingDays || []);
        if (e.target.checked) set.add(day); else set.delete(day);
        data.availability.trainingDays = Array.from(set);
      }
      store.save();
      US.ui.toast('Disponibilità aggiornata.', 'success');
    });
  }

  function wireBackup(root) {
    u.qs('#btn-export', root).addEventListener('click', function () { store.exportJSON(); US.ui.toast('Esportazione avviata.', 'success'); });

    u.qs('#import-input', root).addEventListener('change', function (e) {
      var file = e.target.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function () {
        var parsed;
        try { parsed = JSON.parse(reader.result); }
        catch (err) { US.ui.toast('File non valido: non è un JSON leggibile.', 'warn'); return; }
        var check = store.validateImport(parsed);
        if (!check.valid) { US.ui.toast('Import rifiutato: ' + check.errors.join(' '), 'warn'); return; }
        openImportPreview(parsed, root);
      };
      reader.readAsText(file);
      e.target.value = '';
    });

    u.qs('#btn-restore-backup', root).addEventListener('click', function () {
      US.ui.confirmDialog({ title: 'Ripristinare l\'ultimo backup automatico?', message: 'I dati attuali verranno sostituiti con l\'ultimo backup salvato automaticamente prima dell\'ultima modifica.', danger: true, confirmLabel: 'Ripristina' })
        .then(function (ok) {
          if (!ok) return;
          var restored = store.restoreBackup();
          US.ui.toast(restored ? 'Backup ripristinato.' : 'Nessun backup disponibile.', restored ? 'success' : 'warn');
          render(root);
        });
    });

    u.qs('#btn-demo', root).addEventListener('click', function () {
      US.ui.confirmDialog({ title: 'Ripristinare i dati demo?', message: 'I dati attuali verranno sostituiti con un set di esempio (Analisi Matematica, Sistemi Intelligenti...).', danger: true, confirmLabel: 'Sostituisci' })
        .then(function (ok) {
          if (!ok) return;
          store.loadDemoData();
          US.ui.toast('Dati demo caricati.', 'success');
          render(root);
        });
    });

    u.qs('#btn-wipe', root).addEventListener('click', function () {
      US.ui.doubleConfirmText({ title: 'Cancellare tutti i dati locali?', message: 'Questa azione è irreversibile e rimuove esami, task, materiali, errori, simulazioni e statistiche da questo browser.', phrase: 'ELIMINA' })
        .then(function (ok) {
          if (!ok) return;
          store.wipeAll();
          US.ui.toast('Tutti i dati locali sono stati cancellati.', 'info');
          render(root);
        });
    });
  }

  function openImportPreview(parsed, root) {
    var summary = {
      exams: (parsed.exams || []).length, tasks: (parsed.tasks || []).length,
      materials: (parsed.materials || []).length, flashcards: (parsed.flashcards || []).length,
      errors: (parsed.errors || []).length, simulations: (parsed.simulations || []).length
    };
    US.ui.openModal({
      title: 'Anteprima import', size: 'lg',
      body:
        '<p>Il file contiene:</p>' +
        '<ul class="stat-list">' +
          '<li><span>Esami</span><b>' + summary.exams + '</b></li>' +
          '<li><span>Task</span><b>' + summary.tasks + '</b></li>' +
          '<li><span>Materiali</span><b>' + summary.materials + '</b></li>' +
          '<li><span>Flashcard</span><b>' + summary.flashcards + '</b></li>' +
          '<li><span>Errori</span><b>' + summary.errors + '</b></li>' +
          '<li><span>Simulazioni</span><b>' + summary.simulations + '</b></li>' +
        '</ul>' +
        '<p class="text-warn">Importando sovrascriverai tutti i dati attuali in questo browser.</p>' +
        '<div class="modal-actions"><button type="button" class="btn btn-ghost" data-act="cancel">Annulla</button><button type="button" class="btn btn-primary" data-act="confirm">Importa e sovrascrivi</button></div>',
      onMount: function (body, close) {
        body.querySelector('[data-act="cancel"]').addEventListener('click', close);
        body.querySelector('[data-act="confirm"]').addEventListener('click', function () {
          var res = store.importJSON(parsed);
          close();
          if (res.valid) { US.ui.toast('Import completato.', 'success'); render(root); }
          else US.ui.toast('Import fallito: ' + res.errors.join(' '), 'warn');
        });
      }
    });
  }

  US.views = US.views || {};
  US.views.settings = { render: render };
})(window);
