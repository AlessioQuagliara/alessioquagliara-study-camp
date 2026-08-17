/* UniNettuno Study Camp — views/simulations.js */
(function (global) {
  'use strict';
  var US = global.US;
  var u = US.utils;
  var store = US.store;

  function labelFor(list, id) { var m = list.find(function (x) { return x.id === id; }); return m ? m.label : id; }
  function examName(id) { var ex = store.getExam(id); return ex ? ex.name : '—'; }
  var openTimers = {};

  function render(root) {
    var d = store.getData();
    root.innerHTML =
      '<div class="view-header"><div><h1>Simulazioni</h1><p class="muted">Verifica la preparazione in condizioni realistiche, non solo lo studio.</p></div>' +
      '<div class="header-actions"><button type="button" class="btn btn-primary" id="btn-new-sim">+ Nuova simulazione</button></div></div>' +
      '<div id="sim-list" class="card-grid-lg"></div>';

    var list = u.qs('#sim-list', root);
    if (!d.simulations.length) { list.innerHTML = '<div class="empty-state"><p>Nessuna simulazione ancora. Creane una quando la maggior parte degli argomenti è "autonoma".</p></div>'; }
    else d.simulations.slice().sort(function (a, b) { return (a.datePlanned || '') < (b.datePlanned || '') ? 1 : -1; }).forEach(function (sim) { list.appendChild(simCard(sim)); });

    u.qs('#btn-new-sim', root).addEventListener('click', function () { openSimForm(null, function () { render(root); }); });
  }

  function simCard(sim) {
    var card = u.el(
      '<div class="card sim-card" data-id="' + sim.id + '">' +
        '<div class="exam-card-top"><span class="badge">' + labelFor(US.SIM_TYPES, sim.type) + '</span>' +
        '<span class="badge badge-status-' + sim.status + '">' + sim.status + '</span></div>' +
        '<h3>' + u.escapeHTML(sim.title) + '</h3>' +
        '<p class="muted">' + examName(sim.examId) + (sim.tags && sim.tags.length ? ' · ' + sim.tags.map(u.escapeHTML).join(', ') : '') + '</p>' +
        '<p class="muted small">' + (sim.datePlanned ? u.formatDateIt(sim.datePlanned) : 'Data non fissata') + ' · ' + u.formatMinutes(sim.durationMin) + '</p>' +
        (sim.status === 'completata' ? '<p class="muted small">Esito: ' + (sim.completedPercent != null ? sim.completedPercent + '%' : '—') + ' · fiducia ' + (sim.confidence || '—') + '/5</p>' : '') +
        '<div class="sim-detail" hidden></div>' +
        '<div class="card-actions">' +
          '<button type="button" class="btn btn-ghost btn-sm" data-act="toggle">Apri</button>' +
          (sim.status !== 'completata' ? '<button type="button" class="btn btn-ghost btn-sm" data-act="evaluate">Completa e valuta</button>' : '') +
          '<button type="button" class="btn-icon" data-act="del" aria-label="Elimina">✕</button>' +
        '</div>' +
      '</div>'
    );
    card.querySelector('[data-act="toggle"]').addEventListener('click', function (e) {
      var detail = card.querySelector('.sim-detail');
      detail.hidden = !detail.hidden;
      e.target.textContent = detail.hidden ? 'Apri' : 'Chiudi';
      if (!detail.hidden) renderSimDetail(detail, sim);
    });
    var evalBtn = card.querySelector('[data-act="evaluate"]');
    if (evalBtn) evalBtn.addEventListener('click', function () { openEvaluationForm(sim, function () { render(document.getElementById('view-root')); }); });
    card.querySelector('[data-act="del"]').addEventListener('click', function () {
      US.ui.confirmDialog({ title: 'Eliminare la simulazione?', message: sim.title, danger: true }).then(function (ok) {
        if (ok) { store.deleteSimulation(sim.id); render(document.getElementById('view-root')); }
      });
    });
    return card;
  }

  function renderSimDetail(detail, sim) {
    detail.innerHTML =
      '<ul class="checklist" id="sim-questions-' + sim.id + '"></ul>' +
      '<form class="inline-form" id="sim-q-form-' + sim.id + '"><input class="input" placeholder="Aggiungi domanda/task" id="sim-q-input-' + sim.id + '"><button class="btn btn-ghost btn-sm" type="submit">+</button></form>' +
      '<div class="timer-mini">' +
        '<span id="sim-timer-' + sim.id + '">' + fmtTime((sim.durationMin || 30) * 60) + '</span>' +
        '<button type="button" class="btn btn-ghost btn-sm" data-act="timer-start">Avvia timer</button>' +
        '<button type="button" class="btn btn-ghost btn-sm" data-act="timer-pause">Pausa</button>' +
      '</div>' +
      (sim.type === 'orale' ? oralBlockHTML(sim) : '');

    var qList = detail.querySelector('#sim-questions-' + sim.id);
    (sim.questions || []).forEach(function (q, i) {
      var li = u.el('<li class="checklist-item"><label><input type="checkbox" ' + (q.done ? 'checked' : '') + '><span>' + u.escapeHTML(q.text) + '</span></label></li>');
      li.querySelector('input').addEventListener('change', function (e) {
        var qs = sim.questions.slice(); qs[i].done = e.target.checked;
        store.updateSimulation(sim.id, { questions: qs });
      });
      qList.appendChild(li);
    });
    detail.querySelector('#sim-q-form-' + sim.id).addEventListener('submit', function (e) {
      e.preventDefault();
      var input = detail.querySelector('#sim-q-input-' + sim.id);
      var v = input.value.trim();
      if (!v) return;
      var qs = (sim.questions || []).concat([{ text: v, done: false }]);
      sim.questions = qs;
      store.updateSimulation(sim.id, { questions: qs });
      input.value = '';
      renderSimDetail(detail, sim);
    });

    var display = detail.querySelector('#sim-timer-' + sim.id);
    detail.querySelector('[data-act="timer-start"]').addEventListener('click', function () {
      if (openTimers[sim.id]) return;
      var remaining = (sim.durationMin || 30) * 60;
      openTimers[sim.id] = setInterval(function () {
        remaining--;
        display.textContent = fmtTime(Math.max(0, remaining));
        if (remaining <= 0) { clearInterval(openTimers[sim.id]); delete openTimers[sim.id]; US.ui.toast('Tempo simulazione scaduto.', 'warn'); }
      }, 1000);
    });
    detail.querySelector('[data-act="timer-pause"]').addEventListener('click', function () {
      if (openTimers[sim.id]) { clearInterval(openTimers[sim.id]); delete openTimers[sim.id]; }
    });

    if (sim.type === 'orale') wireOralBlock(detail, sim);
    document.addEventListener('unisc:viewchange', function () {
      Object.keys(openTimers).forEach(function (k) { clearInterval(openTimers[k]); delete openTimers[k]; });
    }, { once: true });
  }

  function oralBlockHTML(sim) {
    return '<div class="oral-block">' +
      '<button type="button" class="btn btn-ghost btn-sm" data-act="random-q">🎲 Domanda casuale</button>' +
      '<p id="oral-current-q-' + sim.id + '" class="muted"></p>' +
      '<div class="field-group"><label>Timer domanda</label>' +
        '<div class="chip-group" id="oral-timer-choice-' + sim.id + '">' +
          [2, 3, 5].map(function (m) { return '<button type="button" class="chip" data-min="' + m + '">' + m + ' min</button>'; }).join('') +
        '</div>' +
      '</div>' +
      '<div class="form-grid">' +
        field('Struttura risposta (1-5)', '<input class="input" type="number" min="1" max="5" id="oral-struttura-' + sim.id + '">') +
        field('Precisione (1-5)', '<input class="input" type="number" min="1" max="5" id="oral-precisione-' + sim.id + '">') +
        field('Sicurezza (1-5)', '<input class="input" type="number" min="1" max="5" id="oral-sicurezza-' + sim.id + '">') +
        field('Lacune emerse', '<input class="input" id="oral-lacune-' + sim.id + '">') +
      '</div>' +
      '<button type="button" class="btn btn-ghost btn-sm" data-act="save-round">Salva valutazione domanda</button>' +
      '<ul class="oral-rounds" id="oral-rounds-' + sim.id + '"></ul>' +
    '</div>';
  }
  function field(label, inputHTML) { return '<div class="field"><label>' + label + inputHTML + '</label></div>'; }

  function wireOralBlock(detail, sim) {
    var currentQEl = detail.querySelector('#oral-current-q-' + sim.id);
    var currentQ = null;
    detail.querySelector('[data-act="random-q"]').addEventListener('click', function () {
      var pool = (sim.questions || []).map(function (q) { return q.text; });
      if (!pool.length) { US.ui.toast('Aggiungi prima delle domande alla simulazione.', 'warn'); return; }
      currentQ = pool[Math.floor(Math.random() * pool.length)];
      currentQEl.textContent = 'Domanda: ' + currentQ;
    });
    var roundsList = detail.querySelector('#oral-rounds-' + sim.id);
    (sim.oralRounds || []).forEach(function (r) { roundsList.appendChild(oralRoundLi(r)); });
    detail.querySelector('[data-act="save-round"]').addEventListener('click', function () {
      var round = {
        question: currentQ || '(nessuna domanda selezionata)',
        struttura: Number(detail.querySelector('#oral-struttura-' + sim.id).value) || null,
        precisione: Number(detail.querySelector('#oral-precisione-' + sim.id).value) || null,
        sicurezza: Number(detail.querySelector('#oral-sicurezza-' + sim.id).value) || null,
        lacune: detail.querySelector('#oral-lacune-' + sim.id).value.trim()
      };
      var rounds = (sim.oralRounds || []).concat([round]);
      sim.oralRounds = rounds;
      store.updateSimulation(sim.id, { oralRounds: rounds });
      roundsList.appendChild(oralRoundLi(round));
      US.ui.toast('Valutazione domanda orale salvata.', 'success');
    });
  }
  function oralRoundLi(r) {
    return u.el('<li>' + u.escapeHTML(r.question) + ' — struttura ' + (r.struttura || '—') + ', precisione ' + (r.precisione || '—') + ', sicurezza ' + (r.sicurezza || '—') + (r.lacune ? ', lacune: ' + u.escapeHTML(r.lacune) : '') + '</li>');
  }

  function fmtTime(sec) { var m = Math.floor(sec / 60), s = sec % 60; return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0'); }

  function openSimForm(sim, onDone) {
    var isEdit = !!sim;
    sim = sim || { type: 'mini', durationMin: 30, status: 'pianificata', questions: [] };
    var exams = store.getData().exams;
    US.ui.openModal({
      title: isEdit ? 'Modifica simulazione' : 'Nuova simulazione', size: 'lg',
      body:
        '<form id="sim-form" class="form-grid">' +
          field('Titolo', '<input class="input" name="title" required value="' + (sim.title ? u.escapeHTML(sim.title) : '') + '">') +
          field('Tipo', '<select class="input" name="type">' + US.SIM_TYPES.map(function (t) { return '<option value="' + t.id + '"' + (t.id === sim.type ? ' selected' : '') + '>' + t.label + '</option>'; }).join('') + '</select>') +
          field('Esame', '<select class="input" name="examId"><option value="">— nessuno —</option>' + exams.map(function (ex) { return '<option value="' + ex.id + '"' + (ex.id === sim.examId ? ' selected' : '') + '>' + u.escapeHTML(ex.name) + '</option>'; }).join('') + '</select>') +
          field('Tag argomenti (separati da virgola)', '<input class="input" name="tags" value="' + (sim.tags ? u.escapeHTML(sim.tags.join(', ')) : '') + '">') +
          field('Data pianificata', '<input class="input" type="date" name="datePlanned" value="' + (sim.datePlanned || '') + '">') +
          field('Durata (min)', '<input class="input" type="number" min="5" name="durationMin" value="' + (sim.durationMin || 30) + '">') +
          '<div class="modal-actions"><button type="button" class="btn btn-ghost" data-act="cancel">Annulla</button><button type="submit" class="btn btn-primary">' + (isEdit ? 'Salva' : 'Crea simulazione') + '</button></div>' +
        '</form>',
      onMount: function (body, close) {
        body.querySelector('[data-act="cancel"]').addEventListener('click', close);
        body.querySelector('#sim-form').addEventListener('submit', function (e) {
          e.preventDefault();
          var f = new FormData(e.target);
          var payload = {
            title: f.get('title').trim(), type: f.get('type'), examId: f.get('examId') || null,
            tags: f.get('tags').split(',').map(function (s) { return s.trim(); }).filter(Boolean),
            datePlanned: f.get('datePlanned') || null, durationMin: Number(f.get('durationMin')) || 30
          };
          if (!payload.title) return;
          if (isEdit) store.updateSimulation(sim.id, payload); else store.addSimulation(payload);
          close();
          US.ui.toast(isEdit ? 'Simulazione aggiornata.' : 'Simulazione creata.', 'success');
          if (onDone) onDone();
        });
      }
    });
  }

  function openEvaluationForm(sim, onDone) {
    US.ui.openModal({
      title: 'Valuta simulazione', size: 'lg',
      body:
        '<form id="eval-form" class="form-grid">' +
          field('Completata?', '<select class="input" name="completed"><option value="si">Sì</option><option value="no">No</option></select>') +
          field('Percentuale stimata', '<input class="input" type="number" min="0" max="100" name="completedPercent" value="70">') +
          field('Fiducia (1-5)', '<input class="input" type="number" min="1" max="5" name="confidence" value="3">') +
          field('Gestione del tempo (1-5)', '<input class="input" type="number" min="1" max="5" name="timeManagement" value="3">') +
          '<div class="field field-full"><label>Errori emersi (uno per riga)<textarea class="input" name="emergedErrors" rows="3" placeholder="Es. errore di segno nel calcolo di un integrale"></textarea></label></div>' +
          '<div class="field field-full"><label>Argomenti da rivedere (uno per riga)<textarea class="input" name="reviewTopics" rows="3"></textarea></label></div>' +
          '<div class="modal-actions"><button type="submit" class="btn btn-primary">Salva valutazione</button></div>' +
        '</form>',
      onMount: function (body, close) {
        body.querySelector('#eval-form').addEventListener('submit', function (e) {
          e.preventDefault();
          var f = new FormData(e.target);
          var errorsLines = f.get('emergedErrors').split('\n').map(function (s) { return s.trim(); }).filter(Boolean);
          var reviewLines = f.get('reviewTopics').split('\n').map(function (s) { return s.trim(); }).filter(Boolean);

          store.updateSimulation(sim.id, {
            status: 'completata', completed: f.get('completed') === 'si',
            completedPercent: Number(f.get('completedPercent')) || 0,
            confidence: Number(f.get('confidence')) || 3,
            timeManagement: Number(f.get('timeManagement')) || 3,
            emergedErrorsRaw: errorsLines, reviewTopicsRaw: reviewLines
          });

          errorsLines.forEach(function (line) {
            store.addError({
              examId: sim.examId, topicId: null, type: 'procedura', description: line,
              cause: '', correction: '', retryExercise: '', priority: 'media', status: 'aperto',
              nextReview: u.addDays(u.todayISO(), 1)
            });
          });
          reviewLines.forEach(function (line) {
            store.addTask({
              examId: sim.examId, moduleId: null, topicId: null, microTopicId: null,
              type: 'revisione_errori', title: 'Correzione post-simulazione — ' + line, durationMin: 25, difficulty: 3,
              prerequisites: '', output: 'Rivedere e consolidare: ' + line, status: 'da_fare',
              dateSuggested: u.addDays(u.todayISO(), 1), dateActual: null, notes: 'Generato da valutazione simulazione.'
            });
          });
          // pianifica re-test
          store.addSimulation({
            title: 'Re-test — ' + sim.title, type: sim.type, examId: sim.examId, tags: sim.tags,
            datePlanned: u.addDays(u.todayISO(), 7), durationMin: sim.durationMin, status: 'pianificata', questions: sim.questions || []
          });

          close();
          US.ui.toast('Valutazione salvata: task di correzione creati e re-test pianificato tra 7 giorni.', 'success');
          if (onDone) onDone();
        });
      }
    });
  }

  US.views = US.views || {};
  US.views.simulations = { render: render };
})(window);
