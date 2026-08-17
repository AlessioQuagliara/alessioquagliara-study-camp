/* UniNettuno Study Camp — views/materials.js (Libreria materiali) */
(function (global) {
  'use strict';
  var US = global.US;
  var u = US.utils;
  var store = US.store;

  function labelFor(list, id) { var m = list.find(function (x) { return x.id === id; }); return m ? m.label : id; }
  function examName(id) { var ex = store.getExam(id); return ex ? ex.name : '—'; }

  var filter = { examId: '', category: '' };

  function render(root) {
    var d = store.getData();
    var params = parseQuery();
    if (params.exam) filter.examId = params.exam;

    root.innerHTML =
      '<div class="view-header"><div><h1>Materiali</h1><p class="muted">Videolezioni, slide, dispense, eserciziari e prove d\'esame in un unico posto.</p></div>' +
      '<div class="header-actions"><button type="button" class="btn btn-primary" id="btn-new-material">+ Nuovo materiale</button></div></div>' +
      '<p class="privacy-note">I file caricati localmente sono referenziabili solo nella sessione corrente del browser: non vengono conservati in modo affidabile tra sessioni o dispositivi. Per persistenza usa link pubblici o Esporta/Importa.</p>' +
      '<div class="filters-row" id="mat-filters"></div>' +
      '<div class="task-table" id="mat-list"></div>';

    renderFilters(u.qs('#mat-filters', root), d);
    renderList(u.qs('#mat-list', root), d);
    u.qs('#btn-new-material', root).addEventListener('click', function () { openMaterialForm(null, function () { render(root); }); });
  }

  function parseQuery() {
    var h = global.location.hash;
    var qi = h.indexOf('?');
    var out = {};
    if (qi === -1) return out;
    new URLSearchParams(h.slice(qi + 1)).forEach(function (v, k) { out[k] = v; });
    return out;
  }

  function renderFilters(container, d) {
    container.innerHTML =
      '<select class="input" id="mf-exam"><option value="">Tutti gli esami</option>' +
        d.exams.map(function (ex) { return '<option value="' + ex.id + '"' + (ex.id === filter.examId ? ' selected' : '') + '>' + u.escapeHTML(ex.name) + '</option>'; }).join('') + '</select>' +
      '<select class="input" id="mf-cat"><option value="">Tutte le categorie</option>' +
        US.MATERIAL_CATEGORIES.map(function (c) { return '<option value="' + c.id + '"' + (c.id === filter.category ? ' selected' : '') + '>' + c.label + '</option>'; }).join('') + '</select>';
    u.qs('#mf-exam', container).addEventListener('change', function (e) { filter.examId = e.target.value; renderList(document.getElementById('mat-list'), store.getData()); });
    u.qs('#mf-cat', container).addEventListener('change', function (e) { filter.category = e.target.value; renderList(document.getElementById('mat-list'), store.getData()); });
  }

  function renderList(container, d) {
    var items = d.materials.filter(function (m) {
      return (!filter.examId || m.examId === filter.examId) && (!filter.category || m.category === filter.category);
    });
    if (!items.length) { container.innerHTML = '<div class="empty-state"><p>Nessun materiale con questi filtri.</p></div>'; return; }
    var head = '<div class="task-row task-row-head"><span>Titolo</span><span>Categoria</span><span>Esame</span><span>Stato</span><span></span></div>';
    container.innerHTML = head;
    items.forEach(function (m) { container.appendChild(materialRow(m)); });
  }

  function materialRow(m) {
    var isVideo = m.category === 'videolezione';
    var row = u.el(
      '<div class="task-row" data-id="' + m.id + '">' +
        '<span>' + u.escapeHTML(m.title) + (isVideo && m.lessonNumber ? ' (lez. ' + m.lessonNumber + ')' : '') + '</span>' +
        '<span>' + labelFor(US.MATERIAL_CATEGORIES, m.category) + '</span>' +
        '<span>' + examName(m.examId) + '</span>' +
        '<span class="badge">' + (isVideo ? labelFor(watchStates, m.watchState) : labelFor(genericStates, m.status)) + '</span>' +
        '<span class="mat-row-actions"></span>' +
      '</div>'
    );
    var actions = row.querySelector('.mat-row-actions');
    if (m.link) { var a = u.el('<a class="btn btn-sm btn-ghost" target="_blank" rel="noopener">Apri</a>'); a.href = m.link; actions.appendChild(a); }
    if (isVideo) {
      var genBtn = u.el('<button type="button" class="btn btn-sm btn-ghost">Genera task</button>');
      genBtn.addEventListener('click', function () { generateVideoTasks(m); });
      actions.appendChild(genBtn);
    }
    var editBtn = u.el('<button type="button" class="btn-icon" aria-label="Modifica">✎</button>');
    editBtn.addEventListener('click', function () { openMaterialForm(m, function () { render(document.getElementById('view-root')); }); });
    actions.appendChild(editBtn);
    var delBtn = u.el('<button type="button" class="btn-icon" aria-label="Elimina">✕</button>');
    delBtn.addEventListener('click', function () {
      US.ui.confirmDialog({ title: 'Eliminare il materiale?', message: m.title, danger: true }).then(function (ok) {
        if (ok) { store.deleteMaterial(m.id); render(document.getElementById('view-root')); }
      });
    });
    actions.appendChild(delBtn);
    return row;
  }

  var watchStates = [{ id: 'da_vedere', label: 'Da vedere' }, { id: 'vista', label: 'Vista' }, { id: 'da_ripassare', label: 'Da ripassare' }];
  var genericStates = [{ id: 'da_usare', label: 'Da usare' }, { id: 'in_uso', label: 'In uso' }, { id: 'completato', label: 'Completato' }];

  function generateVideoTasks(m) {
    var duration = m.durationMin || 60;
    var segLen = 25;
    var segments = Math.max(1, Math.ceil(duration / segLen));
    var baseDate = u.todayISO();
    for (var i = 0; i < segments; i++) {
      var start = i * segLen;
      var end = Math.min(duration, (i + 1) * segLen);
      store.addTask({
        examId: m.examId, moduleId: null, topicId: (m.topicIds && m.topicIds[0]) || null, microTopicId: null,
        type: 'videolezione', title: m.title + ' — segmento ' + start + '–' + end + ' min', durationMin: (end - start) + 10,
        difficulty: 3, prerequisites: '', output: 'Guardare il segmento e prendere appunti propri (non trascrizione).',
        status: 'da_fare', dateSuggested: u.addDays(baseDate, i), dateActual: null, notes: 'Generato da materiale videolezione (visione + note incluse nel tempo).'
      });
    }
    store.addTask({
      examId: m.examId, moduleId: null, topicId: (m.topicIds && m.topicIds[0]) || null, microTopicId: null,
      type: 'recall', title: m.title + ' — recall finale', durationMin: 15, difficulty: 3,
      prerequisites: '', output: 'Ricostruire a voce i punti chiave della videolezione senza guardare gli appunti.',
      status: 'da_fare', dateSuggested: u.addDays(baseDate, segments), dateActual: null, notes: 'Generato da materiale videolezione.'
    });
    US.ui.toast(segments + ' segmenti + 1 recall creati (tempo reale: visione + note, non solo durata video).', 'success');
  }

  function openMaterialForm(m, onDone) {
    var isEdit = !!m;
    m = m || { category: 'videolezione', priority: 'media', status: 'da_usare', watchState: 'da_vedere' };
    var exams = store.getData().exams;
    var isVideo = m.category === 'videolezione';
    US.ui.openModal({
      title: isEdit ? 'Modifica materiale' : 'Nuovo materiale', size: 'lg',
      body:
        '<form id="mat-form" class="form-grid">' +
          field('Titolo', '<input class="input" name="title" required value="' + (m.title ? u.escapeHTML(m.title) : '') + '">', true) +
          field('Categoria', '<select class="input" name="category" id="mat-cat-select">' + US.MATERIAL_CATEGORIES.map(function (c) { return '<option value="' + c.id + '"' + (c.id === m.category ? ' selected' : '') + '>' + c.label + '</option>'; }).join('') + '</select>') +
          field('Esame', '<select class="input" name="examId"><option value="">— nessuno —</option>' + exams.map(function (ex) { return '<option value="' + ex.id + '"' + (ex.id === m.examId ? ' selected' : '') + '>' + u.escapeHTML(ex.name) + '</option>'; }).join('') + '</select>') +
          field('Link (URL pubblico, opzionale)', '<input class="input" type="url" name="link" value="' + (m.link ? u.escapeHTML(m.link) : '') + '">', true) +
          field('File locale (solo sessione corrente)', '<input class="input file-input" type="file" id="mat-file-input">', true) +
          field('Priorità', '<select class="input" name="priority">' + US.PRIORITIES.map(function (p) { return '<option value="' + p.id + '"' + (p.id === m.priority ? ' selected' : '') + '>' + p.label + '</option>'; }).join('') + '</select>') +
          '<div id="mat-video-fields"></div>' +
          '<div id="mat-generic-status">' + field('Stato', '<select class="input" name="status">' + genericStates.map(function (s) { return '<option value="' + s.id + '"' + (s.id === m.status ? ' selected' : '') + '>' + s.label + '</option>'; }).join('')) + '</div>' +
          field('Note', '<textarea class="input" name="notes" rows="2">' + (m.notes ? u.escapeHTML(m.notes) : '') + '</textarea>', true) +
          '<div class="modal-actions"><button type="button" class="btn btn-ghost" data-act="cancel">Annulla</button><button type="submit" class="btn btn-primary">' + (isEdit ? 'Salva' : 'Aggiungi materiale') + '</button></div>' +
        '</form>',
      onMount: function (body, close) {
        var catSelect = body.querySelector('#mat-cat-select');
        var videoFieldsWrap = body.querySelector('#mat-video-fields');
        var genericWrap = body.querySelector('#mat-generic-status');
        function drawVideoFields() {
          var show = catSelect.value === 'videolezione';
          videoFieldsWrap.innerHTML = show ?
            field('Numero lezione', '<input class="input" type="number" name="lessonNumber" value="' + (m.lessonNumber || '') + '">') +
            field('Durata (min)', '<input class="input" type="number" name="durationMin" value="' + (m.durationMin || 60) + '">') +
            field('Stato visione', '<select class="input" name="watchState">' + watchStates.map(function (s) { return '<option value="' + s.id + '"' + (s.id === m.watchState ? ' selected' : '') + '>' + s.label + '</option>'; }).join('') + '</select>') +
            field('Timestamp importante (opz.)', '<input class="input" name="timestampNote" value="' + (m.timestampNote ? u.escapeHTML(m.timestampNote) : '') + '">')
            : '';
          genericWrap.style.display = show ? 'none' : '';
        }
        drawVideoFields();
        catSelect.addEventListener('change', drawVideoFields);
        body.querySelector('#mat-file-input').addEventListener('change', function (e) {
          var f = e.target.files[0];
          if (!f) return;
          var url = URL.createObjectURL(f);
          body.querySelector('[name="link"]').value = url;
          US.ui.toast('File collegato solo per questa sessione: "' + f.name + '".', 'warn');
        });
        body.querySelector('[data-act="cancel"]').addEventListener('click', close);
        body.querySelector('#mat-form').addEventListener('submit', function (e) {
          e.preventDefault();
          var f = new FormData(e.target);
          var payload = {
            title: f.get('title').trim(), category: f.get('category'), examId: f.get('examId') || null,
            link: f.get('link').trim(), priority: f.get('priority'), notes: f.get('notes').trim(), topicIds: m.topicIds || []
          };
          if (payload.category === 'videolezione') {
            payload.lessonNumber = f.get('lessonNumber') ? Number(f.get('lessonNumber')) : null;
            payload.durationMin = f.get('durationMin') ? Number(f.get('durationMin')) : 60;
            payload.watchState = f.get('watchState') || 'da_vedere';
            payload.timestampNote = (f.get('timestampNote') || '').trim();
            payload.status = payload.watchState;
          } else {
            payload.status = f.get('status') || 'da_usare';
          }
          if (!payload.title) return;
          if (isEdit) store.updateMaterial(m.id, payload); else store.addMaterial(payload);
          close();
          US.ui.toast(isEdit ? 'Materiale aggiornato.' : 'Materiale aggiunto.', 'success');
          if (onDone) onDone();
        });
      }
    });
  }

  function field(label, inputHTML, full) { return '<div class="field' + (full ? ' field-full' : '') + '"><label>' + label + inputHTML + '</label></div>'; }

  US.views = US.views || {};
  US.views.materials = { render: render };
})(window);
