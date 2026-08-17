/* UniNettuno Study Camp — views/errors.js (Error log) */
(function (global) {
  'use strict';
  var US = global.US;
  var u = US.utils;
  var store = US.store;

  function labelFor(list, id) { var m = list.find(function (x) { return x.id === id; }); return m ? m.label : id; }
  function examName(id) { var ex = store.getExam(id); return ex ? ex.name : '—'; }

  var currentFilter = { examId: '', status: '', type: '' };

  function render(root) {
    var d = store.getData();
    var today = u.todayISO();
    var dueToday = d.errors.filter(function (e) { return e.status !== 'risolto' && e.nextReview && e.nextReview <= today; });
    var recurring = findRecurring(d.errors);

    root.innerHTML =
      '<div class="view-header"><div><h1>Error log</h1><p class="muted">Ogni errore è un\'occasione di rivincita: registra, correggi, ripeti.</p></div>' +
      '<div class="header-actions"><button type="button" class="btn btn-primary" id="btn-new-error">+ Nuovo errore</button></div></div>' +

      (dueToday.length ? '<section class="card alert alert-warn">' + dueToday.length + ' errori da ripassare oggi.</section>' : '') +
      (recurring.length ? '<section class="card alert alert-warn">Errori ricorrenti individuati: ' + recurring.map(function (r) { return u.escapeHTML(r.type) + ' (' + r.count + '×)'; }).join(', ') + '.</section>' : '') +

      '<div class="filters-row" id="error-filters"></div>' +
      '<div id="error-list" class="card-grid"></div>';

    renderFilters(u.qs('#error-filters', root), d);
    renderList(u.qs('#error-list', root), d);

    u.qs('#btn-new-error', root).addEventListener('click', function () { openErrorForm(null, function () { render(root); }); });
  }

  function findRecurring(errors) {
    var counts = {};
    errors.forEach(function (e) { counts[e.type] = (counts[e.type] || 0) + 1; });
    return Object.keys(counts).filter(function (t) { return counts[t] >= 2; }).map(function (t) { return { type: labelFor(US.ERROR_TYPES, t), count: counts[t] }; });
  }

  function renderFilters(container, d) {
    container.innerHTML =
      '<select class="input" id="filter-exam"><option value="">Tutti gli esami</option>' +
        d.exams.map(function (ex) { return '<option value="' + ex.id + '">' + u.escapeHTML(ex.name) + '</option>'; }).join('') + '</select>' +
      '<select class="input" id="filter-status"><option value="">Tutti gli stati</option>' +
        US.ERROR_STATUSES.map(function (s) { return '<option value="' + s.id + '">' + s.label + '</option>'; }).join('') + '</select>' +
      '<select class="input" id="filter-type"><option value="">Tutti i tipi</option>' +
        US.ERROR_TYPES.map(function (t) { return '<option value="' + t.id + '">' + t.label + '</option>'; }).join('') + '</select>';
    container.querySelectorAll('select').forEach(function (sel) {
      sel.addEventListener('change', function () {
        currentFilter.examId = u.qs('#filter-exam', container).value;
        currentFilter.status = u.qs('#filter-status', container).value;
        currentFilter.type = u.qs('#filter-type', container).value;
        renderList(u.qs('#error-list', container.parentElement), store.getData());
      });
    });
  }

  function renderList(container, d) {
    var list = d.errors.filter(function (e) {
      return (!currentFilter.examId || e.examId === currentFilter.examId) &&
        (!currentFilter.status || e.status === currentFilter.status) &&
        (!currentFilter.type || e.type === currentFilter.type);
    }).sort(function (a, b) { return (a.nextReview || '') < (b.nextReview || '') ? -1 : 1; });

    if (!list.length) { container.innerHTML = '<div class="empty-state"><p>Nessun errore registrato con questi filtri.</p></div>'; return; }
    container.innerHTML = '';
    list.forEach(function (err) { container.appendChild(errorCard(err)); });
  }

  function errorCard(err) {
    var overdue = err.status !== 'risolto' && err.nextReview && err.nextReview < u.todayISO();
    var card = u.el(
      '<div class="card error-card' + (overdue ? ' error-overdue' : '') + '">' +
        '<div class="exam-card-top">' +
          '<span class="badge badge-priority-' + err.priority + '">' + labelFor(US.PRIORITIES, err.priority) + '</span>' +
          '<span class="badge badge-error-status-' + err.status + '">' + labelFor(US.ERROR_STATUSES, err.status) + '</span>' +
        '</div>' +
        '<p class="eyebrow">' + examName(err.examId) + ' · ' + labelFor(US.ERROR_TYPES, err.type) + '</p>' +
        '<p class="error-desc">' + u.escapeHTML(err.description) + '</p>' +
        (err.cause ? '<p class="muted small"><strong>Causa:</strong> ' + u.escapeHTML(err.cause) + '</p>' : '') +
        (err.correction ? '<p class="muted small"><strong>Correzione:</strong> ' + u.escapeHTML(err.correction) + '</p>' : '') +
        (err.retryExercise ? '<p class="muted small"><strong>Rivincita:</strong> ' + u.escapeHTML(err.retryExercise) + '</p>' : '') +
        '<p class="muted small">Prossima revisione: ' + (err.nextReview ? u.formatDateShort(err.nextReview) : '—') + '</p>' +
        '<div class="card-actions">' +
          '<button type="button" class="btn btn-ghost btn-sm" data-act="retry">Genera task rivincita</button>' +
          '<button type="button" class="btn btn-ghost btn-sm" data-act="edit">Modifica</button>' +
          '<button type="button" class="btn-icon" data-act="del" aria-label="Elimina">✕</button>' +
        '</div>' +
        '<div class="field" style="margin-top:8px"><label>Stato<select class="input input-sm" data-act="status-select">' +
          US.ERROR_STATUSES.map(function (s) { return '<option value="' + s.id + '"' + (s.id === err.status ? ' selected' : '') + '>' + s.label + '</option>'; }).join('') +
        '</select></label></div>' +
      '</div>'
    );
    card.querySelector('[data-act="edit"]').addEventListener('click', function () { openErrorForm(err, function () { render(document.getElementById('view-root')); }); });
    card.querySelector('[data-act="del"]').addEventListener('click', function () {
      US.ui.confirmDialog({ title: 'Eliminare l\'errore?', message: u.truncate(err.description, 80), danger: true }).then(function (ok) {
        if (ok) { store.deleteError(err.id); render(document.getElementById('view-root')); }
      });
    });
    card.querySelector('[data-act="status-select"]').addEventListener('change', function (e) {
      store.updateError(err.id, { status: e.target.value });
      US.ui.toast('Stato errore aggiornato.', 'success');
      render(document.getElementById('view-root'));
    });
    card.querySelector('[data-act="retry"]').addEventListener('click', function () {
      if (!err.retryExercise) { US.ui.toast('Aggiungi prima un mini-esercizio di rivincita.', 'warn'); return; }
      store.addTask({
        examId: err.examId, moduleId: null, topicId: err.topicId, microTopicId: null,
        type: 'esercizi', title: 'Rivincita — ' + u.truncate(err.description, 40), durationMin: 15, difficulty: 3,
        prerequisites: '', output: err.retryExercise, status: 'da_fare', dateSuggested: u.todayISO(), dateActual: null,
        notes: 'Generato dall\'error log.'
      });
      US.ui.toast('Task di rivincita creato per oggi.', 'success');
    });
    return card;
  }

  function openErrorForm(err, onDone) {
    var isEdit = !!err;
    err = err || { priority: 'media', status: 'aperto', nextReview: u.todayISO(), type: 'concetto' };
    var exams = store.getData().exams;
    var topics = err.examId ? US.store.allTopicsFlat(store.getExam(err.examId)) : [];
    US.ui.openModal({
      title: isEdit ? 'Modifica errore' : 'Nuovo errore', size: 'lg',
      body:
        '<form id="error-form" class="form-grid">' +
          '<div class="field"><label>Esame<select class="input" name="examId">' +
            '<option value="">— nessuno —</option>' + exams.map(function (ex) { return '<option value="' + ex.id + '"' + (ex.id === err.examId ? ' selected' : '') + '>' + u.escapeHTML(ex.name) + '</option>'; }).join('') +
          '</select></label></div>' +
          '<div class="field"><label>Tipo<select class="input" name="type">' + US.ERROR_TYPES.map(function (t) { return '<option value="' + t.id + '"' + (t.id === err.type ? ' selected' : '') + '>' + t.label + '</option>'; }).join('') + '</select></label></div>' +
          '<div class="field field-full"><label>Descrizione errore<textarea class="input" name="description" rows="2" required>' + (err.description ? u.escapeHTML(err.description) : '') + '</textarea></label></div>' +
          '<div class="field field-full"><label>Causa probabile<input class="input" name="cause" value="' + (err.cause ? u.escapeHTML(err.cause) : '') + '"></label></div>' +
          '<div class="field field-full"><label>Correzione/regola<input class="input" name="correction" value="' + (err.correction ? u.escapeHTML(err.correction) : '') + '"></label></div>' +
          '<div class="field field-full"><label>Mini-esercizio di rivincita<input class="input" name="retryExercise" value="' + (err.retryExercise ? u.escapeHTML(err.retryExercise) : '') + '"></label></div>' +
          '<div class="field"><label>Priorità<select class="input" name="priority">' + US.PRIORITIES.map(function (p) { return '<option value="' + p.id + '"' + (p.id === err.priority ? ' selected' : '') + '>' + p.label + '</option>'; }).join('') + '</select></label></div>' +
          '<div class="field"><label>Stato<select class="input" name="status">' + US.ERROR_STATUSES.map(function (s) { return '<option value="' + s.id + '"' + (s.id === err.status ? ' selected' : '') + '>' + s.label + '</option>'; }).join('') + '</select></label></div>' +
          '<div class="field"><label>Prossima revisione<input class="input" type="date" name="nextReview" value="' + (err.nextReview || u.todayISO()) + '"></label></div>' +
          '<div class="modal-actions"><button type="button" class="btn btn-ghost" data-act="cancel">Annulla</button><button type="submit" class="btn btn-primary">' + (isEdit ? 'Salva' : 'Registra errore') + '</button></div>' +
        '</form>',
      onMount: function (body, close) {
        body.querySelector('[data-act="cancel"]').addEventListener('click', close);
        body.querySelector('#error-form').addEventListener('submit', function (e) {
          e.preventDefault();
          var f = new FormData(e.target);
          var payload = {
            examId: f.get('examId') || null, type: f.get('type'), description: f.get('description').trim(),
            cause: f.get('cause').trim(), correction: f.get('correction').trim(), retryExercise: f.get('retryExercise').trim(),
            priority: f.get('priority'), status: f.get('status'), nextReview: f.get('nextReview') || u.todayISO()
          };
          if (!payload.description) return;
          if (isEdit) store.updateError(err.id, payload); else store.addError(payload);
          close();
          US.ui.toast(isEdit ? 'Errore aggiornato.' : 'Errore registrato.', 'success');
          if (onDone) onDone();
        });
      }
    });
  }

  US.views = US.views || {};
  US.views.errors = { render: render };
})(window);
