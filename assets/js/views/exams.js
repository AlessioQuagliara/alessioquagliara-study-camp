/* UniNettuno Study Camp — views/exams.js */
(function (global) {
  'use strict';
  var US = global.US;
  var u = US.utils;
  var store = US.store;

  function labelFor(list, id) {
    var m = list.find(function (x) { return x.id === id; });
    return m ? m.label : id;
  }

  function render(root, params) {
    if (params && params.id) renderDetail(root, params.id);
    else renderList(root);
  }

  /* ============ LISTA ESAMI ============ */
  function renderList(root) {
    var d = store.getData();
    root.innerHTML =
      '<div class="view-header">' +
        '<div><h1>Esami</h1><p class="muted">Gestisci i tuoi esami e la loro gerarchia di studio.</p></div>' +
        '<div class="header-actions">' +
          '<button type="button" class="btn btn-ghost" id="btn-wizard">Crea esame da programma</button>' +
          '<button type="button" class="btn btn-primary" id="btn-new-exam">+ Nuovo esame</button>' +
        '</div>' +
      '</div>' +
      '<div class="card-grid" id="exam-cards"></div>';

    var wrap = u.qs('#exam-cards', root);
    if (!d.exams.length) {
      wrap.innerHTML = '<div class="empty-state"><p>Nessun esame ancora. Crea il primo esame o importa un programma.</p></div>';
    } else {
      d.exams.slice().sort(function (a, b) { return US.planner.priorityWeight(b.priority) - US.planner.priorityWeight(a.priority); })
        .forEach(function (ex) { wrap.appendChild(examCard(ex)); });
    }

    u.qs('#btn-new-exam', root).addEventListener('click', function () { openExamForm(null, function () { render(root); }); });
    u.qs('#btn-wizard', root).addEventListener('click', function () { openProgramWizard(function () { render(root); }); });
  }

  function examCard(ex) {
    var readiness = US.planner.examReadiness(store.getData(), ex.id);
    var daysToExam = ex.examDate ? u.daysBetween(u.todayISO(), ex.examDate) : null;
    var card = u.el(
      '<a class="card exam-card" href="#/esami/' + ex.id + '">' +
        '<div class="exam-card-top">' +
          '<span class="badge badge-priority-' + ex.priority + '">' + labelFor(US.PRIORITIES, ex.priority) + '</span>' +
          '<span class="badge">' + labelFor(US.EXAM_STATUSES, ex.status) + '</span>' +
        '</div>' +
        '<h3>' + u.escapeHTML(ex.name) + '</h3>' +
        '<p class="muted">' + u.escapeHTML(ex.course || '') + (ex.cfu ? ' · ' + ex.cfu + ' CFU' : '') + '</p>' +
        (daysToExam != null ? '<p class="exam-card-days">' + (daysToExam >= 0 ? daysToExam + ' giorni all\'appello' : 'Appello passato') + '</p>' : '<p class="muted">Data appello non impostata</p>') +
        '<div class="readiness-bar"><div class="readiness-fill" style="width:' + readiness.percent + '%"></div></div>' +
        '<p class="muted small">' + readiness.percent + '% argomenti autonomi' + (readiness.ready ? ' · pronto per simulazione' : '') + '</p>' +
      '</a>'
    );
    return card;
  }

  /* ============ FORM ESAME (crea/modifica) ============ */
  function openExamForm(exam, onDone) {
    var isEdit = !!exam;
    exam = exam || { priority: 'media', status: 'non_iniziato', type: 'scritto' };
    US.ui.openModal({
      title: isEdit ? 'Modifica esame' : 'Nuovo esame',
      size: 'lg',
      body:
        '<form id="exam-form" class="form-grid">' +
          field('Nome esame', '<input class="input" name="name" required value="' + attr(exam.name) + '">') +
          field('Corso / docente', '<input class="input" name="course" value="' + attr(exam.course) + '">') +
          field('Tipo', selectHTML('type', US.EXAM_TYPES, exam.type)) +
          field('CFU (opzionale)', '<input class="input" type="number" min="1" name="cfu" value="' + attr(exam.cfu) + '">') +
          field('Data appello (opzionale)', '<input class="input" type="date" name="examDate" value="' + attr(exam.examDate) + '">') +
          field('Finestra stimata (se niente data)', '<input class="input" name="dateWindow" placeholder="es. metà gennaio" value="' + attr(exam.dateWindow) + '">') +
          field('Priorità', selectHTML('priority', US.PRIORITIES, exam.priority)) +
          field('Stato', selectHTML('status', US.EXAM_STATUSES, exam.status)) +
          field('Obiettivo voto (opzionale)', '<input class="input" type="number" min="18" max="31" name="targetGrade" value="' + attr(exam.targetGrade) + '">') +
          field('Ore settimanali realistiche', '<input class="input" type="number" min="0" step="0.5" name="weeklyHours" value="' + attr(exam.weeklyHours) + '">') +
          field('Note', '<textarea class="input" name="notes" rows="2">' + (exam.notes ? u.escapeHTML(exam.notes) : '') + '</textarea>', true) +
          '<div class="modal-actions">' +
            '<button type="button" class="btn btn-ghost" data-act="cancel">Annulla</button>' +
            '<button type="submit" class="btn btn-primary">' + (isEdit ? 'Salva modifiche' : 'Crea esame') + '</button>' +
          '</div>' +
        '</form>',
      onMount: function (body, close) {
        body.querySelector('[data-act="cancel"]').addEventListener('click', close);
        body.querySelector('#exam-form').addEventListener('submit', function (e) {
          e.preventDefault();
          var fd = new FormData(e.target);
          var payload = {
            name: fd.get('name').trim(),
            course: fd.get('course').trim(),
            type: fd.get('type'),
            cfu: fd.get('cfu') ? Number(fd.get('cfu')) : null,
            examDate: fd.get('examDate') || null,
            dateWindow: fd.get('dateWindow').trim(),
            priority: fd.get('priority'),
            status: fd.get('status'),
            targetGrade: fd.get('targetGrade') ? Number(fd.get('targetGrade')) : null,
            weeklyHours: fd.get('weeklyHours') ? Number(fd.get('weeklyHours')) : null,
            notes: fd.get('notes').trim()
          };
          if (!payload.name) return;
          if (isEdit) store.updateExam(exam.id, payload);
          else store.addExam(payload);
          close();
          US.ui.toast(isEdit ? 'Esame aggiornato.' : 'Esame creato.', 'success');
          if (onDone) onDone();
        });
      }
    });
  }

  function field(label, inputHTML, full) {
    return '<div class="field' + (full ? ' field-full' : '') + '"><label>' + label + inputHTML + '</label></div>';
  }
  function attr(v) { return v == null ? '' : u.escapeHTML(String(v)); }
  function selectHTML(name, options, current) {
    return '<select class="input" name="' + name + '">' + options.map(function (o) {
      return '<option value="' + o.id + '"' + (o.id === current ? ' selected' : '') + '>' + o.label + '</option>';
    }).join('') + '</select>';
  }

  /* ============ WIZARD PROGRAMMA ============ */
  function openProgramWizard(onDone) {
    var state = { step: 1, meta: { name: '', course: '', priority: 'media', status: 'non_iniziato', type: 'scritto' }, raw: '', parsed: null };

    var close = US.ui.openModal({ title: 'Crea esame da programma', size: 'lg', body: '<div id="wizard-body"></div>', onMount: function (body, closeFn) {
      state.close = closeFn;
      renderStep(body.querySelector('#wizard-body'));
    }});

    function renderStep(container) {
      if (state.step === 1) return step1(container);
      if (state.step === 2) return step2(container);
      return step3(container);
    }

    function step1(container) {
      container.innerHTML =
        '<p class="wizard-step">Passo 1 di 3 · Dati esame</p>' +
        '<form id="wz-meta" class="form-grid">' +
          field('Nome esame', '<input class="input" name="name" required value="' + attr(state.meta.name) + '">') +
          field('Corso / docente', '<input class="input" name="course" value="' + attr(state.meta.course) + '">') +
          field('Priorità', selectHTML('priority', US.PRIORITIES, state.meta.priority)) +
          '<div class="modal-actions"><button type="button" class="btn btn-ghost" data-act="cancel">Annulla</button>' +
          '<button type="submit" class="btn btn-primary">Avanti</button></div>' +
        '</form>';
      container.querySelector('[data-act="cancel"]').addEventListener('click', state.close);
      container.querySelector('#wz-meta').addEventListener('submit', function (e) {
        e.preventDefault();
        var fd = new FormData(e.target);
        state.meta.name = fd.get('name').trim();
        state.meta.course = fd.get('course').trim();
        state.meta.priority = fd.get('priority');
        if (!state.meta.name) return;
        state.step = 2;
        renderStep(container);
      });
    }

    function step2(container) {
      container.innerHTML =
        '<p class="wizard-step">Passo 2 di 3 · Incolla il programma</p>' +
        '<p class="muted small">Incolla il testo del programma (o carica un file .txt/.md). Il riconoscimento è euristico: righe numerate, "Modulo N", elenchi puntati. Rivedrai e correggerai tutto al passo successivo.</p>' +
        '<textarea class="input" id="wz-text" rows="10" placeholder="1. Limiti e continuità&#10;1.1 Limite notevole sin(x)/x&#10;2. Derivate&#10;2.1 Regola della catena">' + u.escapeHTML(state.raw) + '</textarea>' +
        '<input type="file" id="wz-file" accept=".txt,.md" class="input file-input">' +
        '<div class="modal-actions">' +
          '<button type="button" class="btn btn-ghost" data-act="back">Indietro</button>' +
          '<button type="button" class="btn btn-primary" data-act="analyze">Analizza testo</button>' +
        '</div>';
      container.querySelector('[data-act="back"]').addEventListener('click', function () { state.step = 1; renderStep(container); });
      container.querySelector('#wz-file').addEventListener('change', function (e) {
        var file = e.target.files[0];
        if (!file) return;
        var reader = new FileReader();
        reader.onload = function () { container.querySelector('#wz-text').value = reader.result; };
        reader.readAsText(file);
      });
      container.querySelector('[data-act="analyze"]').addEventListener('click', function () {
        state.raw = container.querySelector('#wz-text').value;
        if (!state.raw.trim()) { US.ui.toast('Incolla del testo prima di analizzare.', 'warn'); return; }
        state.parsed = US.parser.parseProgramText(state.raw);
        state.step = 3;
        renderStep(container);
      });
    }

    function step3(container) {
      var modules = state.parsed.modules;
      container.innerHTML =
        '<p class="wizard-step">Passo 3 di 3 · Rivedi e correggi</p>' +
        '<p class="muted small">Bozza generata automaticamente (' + modules.length + ' moduli riconosciuti su ' + state.parsed.lineCount + ' righe). Correggi nomi, unisci o elimina prima di salvare: il parsing non è garantito perfetto.</p>' +
        '<div id="wz-modules" class="wizard-modules"></div>' +
        '<button type="button" class="btn btn-ghost btn-sm" id="wz-add-module">+ Aggiungi modulo</button>' +
        '<div class="modal-actions">' +
          '<button type="button" class="btn btn-ghost" data-act="back">Indietro</button>' +
          '<button type="button" class="btn btn-primary" data-act="save">Crea esame con questa struttura</button>' +
        '</div>';
      var list = container.querySelector('#wz-modules');
      function drawModules() {
        list.innerHTML = '';
        modules.forEach(function (mod, mi) {
          var block = u.el(
            '<div class="wizard-module">' +
              '<div class="wizard-module-head">' +
                '<input class="input" data-mi="' + mi + '" data-f="modname" value="' + attr(mod.name) + '">' +
                '<button type="button" class="btn-icon" data-mi="' + mi + '" data-act="del-module" aria-label="Elimina modulo">✕</button>' +
              '</div>' +
              '<ul class="wizard-topics"></ul>' +
              '<button type="button" class="btn btn-ghost btn-xs" data-mi="' + mi + '" data-act="add-topic">+ argomento</button>' +
            '</div>'
          );
          var topicList = block.querySelector('.wizard-topics');
          mod.topics.forEach(function (topic, ti) {
            var li = u.el(
              '<li><input class="input input-sm" data-mi="' + mi + '" data-ti="' + ti + '" data-f="topicname" value="' + attr(topic) + '">' +
              '<button type="button" class="btn-icon" data-mi="' + mi + '" data-ti="' + ti + '" data-act="del-topic" aria-label="Elimina argomento">✕</button></li>'
            );
            topicList.appendChild(li);
          });
          list.appendChild(block);
        });
      }
      drawModules();
      list.addEventListener('input', function (e) {
        var t = e.target;
        var mi = t.dataset.mi != null ? Number(t.dataset.mi) : null;
        if (t.dataset.f === 'modname') modules[mi].name = t.value;
        if (t.dataset.f === 'topicname') modules[mi].topics[Number(t.dataset.ti)] = t.value;
      });
      list.addEventListener('click', function (e) {
        var t = e.target;
        if (t.dataset.act === 'del-module') { modules.splice(Number(t.dataset.mi), 1); drawModules(); }
        if (t.dataset.act === 'del-topic') { modules[Number(t.dataset.mi)].topics.splice(Number(t.dataset.ti), 1); drawModules(); }
        if (t.dataset.act === 'add-topic') { modules[Number(t.dataset.mi)].topics.push('Nuovo argomento'); drawModules(); }
      });
      container.querySelector('#wz-add-module').addEventListener('click', function () {
        modules.push({ name: 'Nuovo modulo', topics: [] });
        drawModules();
      });
      container.querySelector('[data-act="back"]').addEventListener('click', function () { state.step = 2; renderStep(container); });
      container.querySelector('[data-act="save"]').addEventListener('click', function () {
        var exam = store.addExam({
          name: state.meta.name, course: state.meta.course, type: 'scritto', priority: state.meta.priority,
          status: 'non_iniziato', cfu: null, examDate: null, targetGrade: null, weeklyHours: null, notes: 'Creato da wizard programma.'
        });
        modules.forEach(function (mod) {
          if (!mod.name.trim()) return;
          var m = store.addModule(exam.id, mod.name.trim());
          mod.topics.forEach(function (topicName) {
            if (topicName.trim()) store.addTopic(exam.id, m.id, topicName.trim());
          });
        });
        state.close();
        US.ui.toast('Esame creato dal programma importato.', 'success');
        US.router.navigate('#/esami/' + exam.id);
        if (onDone) onDone();
      });
    }
  }

  /* ============ DETTAGLIO ESAME ============ */
  function renderDetail(root, examId) {
    var d = store.getData();
    var exam = store.getExam(examId);
    if (!exam) {
      root.innerHTML = '<div class="empty-state"><p>Esame non trovato.</p><a class="btn btn-ghost" href="#/esami">Torna agli esami</a></div>';
      return;
    }
    var readiness = US.planner.examReadiness(d, examId);
    var examTasks = d.tasks.filter(function (t) { return t.examId === examId; }).sort(function (a, b) { return a.dateSuggested < b.dateSuggested ? -1 : 1; });
    var daysToExam = exam.examDate ? u.daysBetween(u.todayISO(), exam.examDate) : null;

    root.innerHTML =
      '<div class="view-header">' +
        '<div><a class="back-link" href="#/esami">← Esami</a><h1>' + u.escapeHTML(exam.name) + '</h1>' +
        '<p class="muted">' + u.escapeHTML(exam.course || '') + ' · ' + labelFor(US.EXAM_TYPES, exam.type) + (exam.cfu ? ' · ' + exam.cfu + ' CFU' : '') + '</p></div>' +
        '<div class="header-actions">' +
          '<button type="button" class="btn btn-ghost" id="btn-edit-exam">Modifica</button>' +
          '<button type="button" class="btn btn-danger" id="btn-del-exam">Elimina</button>' +
        '</div>' +
      '</div>' +

      '<section class="card readiness-card">' +
        '<p class="eyebrow">Pronto per simulazione?</p>' +
        '<div class="readiness-bar lg"><div class="readiness-fill" style="width:' + readiness.percent + '%"></div></div>' +
        '<p>' + (readiness.ready ? '<strong class="text-good">Sì</strong> — ' : '<strong>Non ancora</strong> — ') + u.escapeHTML(readiness.reason) + '</p>' +
        (daysToExam != null ? '<p class="muted">' + (daysToExam >= 0 ? daysToExam + ' giorni al prossimo appello' : 'Appello passato') + '</p>' : '') +
        (exam.notes ? '<p class="muted"><em>' + u.escapeHTML(exam.notes) + '</em></p>' : '') +
      '</section>' +

      '<div class="view-header sub">' +
        '<h2>Struttura</h2>' +
        '<button type="button" class="btn btn-ghost btn-sm" id="btn-add-module">+ Modulo</button>' +
      '</div>' +
      '<div id="module-tree"></div>' +

      '<div class="view-header sub">' +
        '<h2>Task (' + examTasks.length + ')</h2>' +
        '<button type="button" class="btn btn-ghost btn-sm" id="btn-add-task">+ Task manuale</button>' +
      '</div>' +
      '<div class="task-table" id="exam-task-list"></div>' +

      '<div class="view-header sub"><h2>Materiali collegati</h2></div>' +
      '<p class="muted small"><a href="#/materiali">Vai alla libreria materiali filtrando per questo esame →</a></p>';

    renderModuleTree(u.qs('#module-tree', root), exam);
    renderExamTasks(u.qs('#exam-task-list', root), examTasks, exam);

    u.qs('#btn-edit-exam', root).addEventListener('click', function () { openExamForm(exam, function () { renderDetail(root, examId); }); });
    u.qs('#btn-del-exam', root).addEventListener('click', function () {
      US.ui.confirmDialog({ title: 'Eliminare l\'esame?', message: 'Verranno eliminati anche moduli, task, materiali, errori e simulazioni collegati a "' + exam.name + '".', danger: true, confirmLabel: 'Elimina' })
        .then(function (ok) { if (ok) { store.deleteExam(examId); US.ui.toast('Esame eliminato.', 'info'); US.router.navigate('#/esami'); } });
    });
    u.qs('#btn-add-module', root).addEventListener('click', function () {
      quickPrompt('Nome del nuovo modulo', function (name) {
        if (name) { store.addModule(examId, name); renderDetail(root, examId); }
      });
    });
    u.qs('#btn-add-task', root).addEventListener('click', function () { openTaskForm(exam, null, function () { renderDetail(root, examId); }); });
  }

  function quickPrompt(label, cb) {
    US.ui.openModal({
      title: label, size: 'sm',
      body: '<form id="qp-form"><input class="input" name="v" autofocus required><div class="modal-actions">' +
        '<button type="button" class="btn btn-ghost" data-act="cancel">Annulla</button>' +
        '<button type="submit" class="btn btn-primary">Aggiungi</button></div></form>',
      onMount: function (body, close) {
        body.querySelector('[data-act="cancel"]').addEventListener('click', close);
        body.querySelector('#qp-form').addEventListener('submit', function (e) {
          e.preventDefault();
          var v = new FormData(e.target).get('v').trim();
          close();
          if (v) cb(v);
        });
      }
    });
  }

  function renderModuleTree(container, exam) {
    container.innerHTML = '';
    if (!exam.modules.length) {
      container.innerHTML = '<p class="muted">Nessun modulo ancora. Aggiungine uno o usa il wizard "Crea esame da programma".</p>';
      return;
    }
    exam.modules.forEach(function (mod) {
      var modEl = u.el(
        '<div class="module-block">' +
          '<div class="module-head"><h3>' + u.escapeHTML(mod.name) + '</h3>' +
          '<div><button type="button" class="btn btn-ghost btn-xs" data-act="add-topic">+ argomento</button>' +
          '<button type="button" class="btn-icon" data-act="del-module" aria-label="Elimina modulo">✕</button></div></div>' +
          '<div class="topic-list"></div>' +
        '</div>'
      );
      var topicListEl = modEl.querySelector('.topic-list');
      (mod.topics || []).forEach(function (topic) { topicListEl.appendChild(topicRow(exam, mod, topic)); });
      modEl.querySelector('[data-act="add-topic"]').addEventListener('click', function () {
        quickPrompt('Nome del nuovo argomento', function (name) {
          if (name) { store.addTopic(exam.id, mod.id, name); renderModuleTree(container, store.getExam(exam.id)); }
        });
      });
      modEl.querySelector('[data-act="del-module"]').addEventListener('click', function () {
        US.ui.confirmDialog({ title: 'Eliminare il modulo?', message: '"' + mod.name + '" e i suoi argomenti verranno rimossi.', danger: true }).then(function (ok) {
          if (ok) { store.deleteModule(exam.id, mod.id); renderModuleTree(container, store.getExam(exam.id)); }
        });
      });
      container.appendChild(modEl);
    });
  }

  function topicRow(exam, mod, topic) {
    var row = u.el(
      '<div class="topic-row">' +
        '<div class="topic-row-head">' +
          '<span class="topic-name">' + u.escapeHTML(topic.name) + '</span>' +
          '<select class="input input-sm mastery-select">' + US.MASTERY_LEVELS.map(function (m) {
            return '<option value="' + m.id + '"' + (m.id === topic.mastery ? ' selected' : '') + '>' + m.label + '</option>';
          }).join('') + '</select>' +
          '<button type="button" class="btn btn-ghost btn-xs" data-act="gen">Genera micro-task</button>' +
          '<button type="button" class="btn btn-ghost btn-xs" data-act="add-micro">+ micro</button>' +
          '<button type="button" class="btn-icon" data-act="del" aria-label="Elimina argomento">✕</button>' +
        '</div>' +
        '<div class="micro-list"></div>' +
      '</div>'
    );
    var microList = row.querySelector('.micro-list');
    (topic.microTopics || []).forEach(function (mt) {
      var mtRow = u.el(
        '<div class="micro-row"><span>' + u.escapeHTML(mt.name) + '</span>' +
        '<select class="input input-sm mastery-select-micro">' + US.MASTERY_LEVELS.map(function (m) {
          return '<option value="' + m.id + '"' + (m.id === mt.mastery ? ' selected' : '') + '>' + m.label + '</option>';
        }).join('') + '</select>' +
        '<button type="button" class="btn-icon" data-act="del-micro" aria-label="Elimina micro-argomento">✕</button></div>'
      );
      mtRow.querySelector('.mastery-select-micro').addEventListener('change', function (e) {
        store.setMicroTopicMastery(exam.id, mod.id, topic.id, mt.id, e.target.value);
        US.ui.toast('Padronanza aggiornata.', 'success');
      });
      mtRow.querySelector('[data-act="del-micro"]').addEventListener('click', function () {
        store.deleteMicroTopic(exam.id, mod.id, topic.id, mt.id);
        mtRow.remove();
      });
      microList.appendChild(mtRow);
    });
    row.querySelector('.mastery-select').addEventListener('change', function (e) {
      store.setTopicMastery(exam.id, mod.id, topic.id, e.target.value);
      US.ui.toast('Padronanza aggiornata: ' + labelFor(US.MASTERY_LEVELS, e.target.value) + '.', 'success');
    });
    row.querySelector('[data-act="gen"]').addEventListener('click', function () {
      US.planner.generateMicroTasksForTopic(exam.id, mod.id, topic.id, topic.name);
      US.ui.toast('5 micro-task generati per "' + topic.name + '".', 'success');
      US.views.exams.render(document.getElementById('view-root'), { id: exam.id });
    });
    row.querySelector('[data-act="add-micro"]').addEventListener('click', function () {
      quickPrompt('Nome del micro-argomento', function (name) {
        if (name) { store.addMicroTopic(exam.id, mod.id, topic.id, name); US.views.exams.render(document.getElementById('view-root'), { id: exam.id }); }
      });
    });
    row.querySelector('[data-act="del"]').addEventListener('click', function () {
      US.ui.confirmDialog({ title: 'Eliminare l\'argomento?', message: '"' + topic.name + '" verrà rimosso.', danger: true }).then(function (ok) {
        if (ok) { store.deleteTopic(exam.id, mod.id, topic.id); US.views.exams.render(document.getElementById('view-root'), { id: exam.id }); }
      });
    });
    return row;
  }

  /* ============ TASK ============ */
  function taskTypeLabel(t) { return labelFor(US.TASK_TYPES, t); }

  function renderExamTasks(container, tasks, exam) {
    if (!tasks.length) { container.innerHTML = '<p class="muted">Nessun task ancora per questo esame.</p>'; return; }
    var head = '<div class="task-row task-row-head"><span>Titolo</span><span>Tipo</span><span>Durata</span><span>Data</span><span>Stato</span><span></span></div>';
    var rows = tasks.map(function (t) {
      return '<div class="task-row" data-id="' + t.id + '">' +
        '<span>' + u.escapeHTML(t.title) + '</span>' +
        '<span>' + taskTypeLabel(t.type) + '</span>' +
        '<span>' + u.formatMinutes(t.durationMin) + '</span>' +
        '<span>' + u.formatDateShort(t.dateSuggested) + '</span>' +
        '<span class="badge badge-status-' + t.status + '">' + labelFor(US.TASK_STATUSES, t.status) + '</span>' +
        '<span><a class="btn btn-sm btn-ghost" href="#/sessione?task=' + t.id + '">Avvia</a> <button type="button" class="btn-icon" data-act="del-task" aria-label="Elimina task">✕</button></span>' +
        '</div>';
    }).join('');
    container.innerHTML = head + rows;
    container.addEventListener('click', function (e) {
      if (e.target.dataset.act === 'del-task') {
        var row = e.target.closest('.task-row');
        var id = row.dataset.id;
        store.deleteTask(id);
        row.remove();
      }
    });
  }

  function openTaskForm(exam, task, onDone) {
    var isEdit = !!task;
    task = task || { type: 'teoria', durationMin: 25, status: 'da_fare', dateSuggested: u.todayISO() };
    var topics = US.store.allTopicsFlat(exam);
    US.ui.openModal({
      title: isEdit ? 'Modifica task' : 'Nuovo task manuale',
      size: 'lg',
      body:
        '<form id="task-form" class="form-grid">' +
          field('Titolo', '<input class="input" name="title" required value="' + attr(task.title) + '">', true) +
          field('Tipo', selectHTML('type', US.TASK_TYPES, task.type)) +
          field('Durata', '<select class="input" name="durationMin">' + US.DURATIONS.map(function (m) {
            return '<option value="' + m + '"' + (m === task.durationMin ? ' selected' : '') + '>' + m + ' min</option>';
          }).join('') + '</select>') +
          field('Argomento (opzionale)', '<select class="input" name="topicId"><option value="">— nessuno —</option>' + topics.map(function (t) {
            return '<option value="' + t.topicId + '"' + (t.topicId === task.topicId ? ' selected' : '') + '>' + u.escapeHTML(t.moduleName) + ' / ' + u.escapeHTML(t.topicName) + '</option>';
          }).join('') + '</select>') +
          field('Difficoltà percepita (1-5)', '<input class="input" type="number" min="1" max="5" name="difficulty" value="' + attr(task.difficulty || 3) + '">') +
          field('Prerequisiti', '<input class="input" name="prerequisites" value="' + attr(task.prerequisites) + '">') +
          field('Data suggerita', '<input class="input" type="date" name="dateSuggested" value="' + attr(task.dateSuggested) + '">') +
          field('Output verificabile', '<textarea class="input" name="output" rows="2">' + (task.output ? u.escapeHTML(task.output) : '') + '</textarea>', true) +
          field('Note', '<textarea class="input" name="notes" rows="2">' + (task.notes ? u.escapeHTML(task.notes) : '') + '</textarea>', true) +
          '<div class="modal-actions">' +
            '<button type="button" class="btn btn-ghost" data-act="cancel">Annulla</button>' +
            '<button type="submit" class="btn btn-primary">' + (isEdit ? 'Salva' : 'Crea task') + '</button>' +
          '</div>' +
        '</form>',
      onMount: function (body, close) {
        body.querySelector('[data-act="cancel"]').addEventListener('click', close);
        body.querySelector('#task-form').addEventListener('submit', function (e) {
          e.preventDefault();
          var fd = new FormData(e.target);
          var topicId = fd.get('topicId') || null;
          var topicMeta = topics.find(function (t) { return t.topicId === topicId; });
          var payload = {
            examId: exam.id, moduleId: topicMeta ? topicMeta.moduleId : null, topicId: topicId, microTopicId: null,
            title: fd.get('title').trim(), type: fd.get('type'), durationMin: Number(fd.get('durationMin')),
            difficulty: Number(fd.get('difficulty')) || 3, prerequisites: fd.get('prerequisites').trim(),
            dateSuggested: fd.get('dateSuggested') || u.todayISO(), output: fd.get('output').trim(), notes: fd.get('notes').trim()
          };
          if (!payload.title) return;
          if (isEdit) store.updateTask(task.id, payload); else store.addTask(payload);
          close();
          US.ui.toast(isEdit ? 'Task aggiornato.' : 'Task creato.', 'success');
          if (onDone) onDone();
        });
      }
    });
  }

  US.views = US.views || {};
  US.views.exams = { render: render, openExamForm: openExamForm, openTaskForm: openTaskForm };
})(window);
