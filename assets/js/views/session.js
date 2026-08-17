/* UniNettuno Study Camp — views/session.js (Session Runner) */
(function (global) {
  'use strict';
  var US = global.US;
  var u = US.utils;
  var store = US.store;

  var timer = null; // {intervalId, remaining, phase, workSec, breakSec, running}
  var runnerState = null; // {task, exam, doubts:[], notesText, checklist:[]}

  function parseQuery() {
    var h = global.location.hash;
    var qIndex = h.indexOf('?');
    var out = {};
    if (qIndex === -1) return out;
    new URLSearchParams(h.slice(qIndex + 1)).forEach(function (v, k) { out[k] = v; });
    return out;
  }

  function stopTimer() {
    if (timer && timer.intervalId) clearInterval(timer.intervalId);
    timer = null;
  }

  function render(root) {
    document.addEventListener('unisc:viewchange', stopTimer, { once: true });
    var q = parseQuery();
    var d = store.getData();
    var task = q.task ? store.getTask(q.task) : null;
    var exam = task ? store.getExam(task.examId) : null;

    if (!task) {
      renderPicker(root, d);
      return;
    }
    runnerState = { task: task, exam: exam, doubts: [], notesText: '', startedAt: u.nowISOTime() };
    renderRunner(root, task, exam);
  }

  function renderPicker(root, d) {
    var today = u.todayISO();
    var todays = US.planner.todayTasks(d, today);
    var overdue = US.planner.overdueReviewTasks(d, today);
    root.innerHTML =
      '<div class="view-header"><div><h1>Sessione studio</h1><p class="muted">Scegli un task da avviare, oppure vai in un esame per crearne uno nuovo.</p></div></div>' +
      (overdue.total ? '<section class="card"><p class="eyebrow">Ripassi in ritardo</p><div class="task-picker-list" id="overdue-list"></div></section>' : '') +
      '<section class="card"><p class="eyebrow">Task di oggi</p><div class="task-picker-list" id="today-list"></div></section>';

    if (overdue.total) {
      var overdueWrap = u.qs('#overdue-list', root);
      overdue.tasks.forEach(function (t) { overdueWrap.appendChild(pickerRow(t)); });
    }
    var todayWrap = u.qs('#today-list', root);
    if (!todays.length) todayWrap.innerHTML = '<p class="muted">Nessun task pianificato per oggi.</p>';
    else todays.forEach(function (t) { todayWrap.appendChild(pickerRow(t)); });
  }

  function pickerRow(t) {
    var meta = US.TASK_TYPES.find(function (x) { return x.id === t.type; }) || { icon: '•', label: t.type };
    return u.el(
      '<a class="task-picker-row" href="#/sessione?task=' + t.id + '">' +
        '<span class="ti-icon" aria-hidden="true">' + meta.icon + '</span>' +
        '<span class="ti-title">' + u.escapeHTML(t.title) + '</span>' +
        '<span class="ti-dur">' + u.formatMinutes(t.durationMin) + '</span>' +
      '</a>'
    );
  }

  function renderRunner(root, task, exam) {
    var typeMeta = US.TASK_TYPES.find(function (x) { return x.id === task.type; }) || { label: task.type };
    root.innerHTML =
      '<div class="runner">' +
        '<div class="runner-topbar">' +
          '<button type="button" class="btn btn-ghost btn-sm" id="btn-exit-runner">← Esci</button>' +
          '<button type="button" class="btn btn-ghost btn-sm" id="btn-focus-toggle">Modalità focus</button>' +
        '</div>' +
        '<div class="runner-header">' +
          '<p class="eyebrow">' + typeMeta.label + (exam ? ' · ' + u.escapeHTML(exam.name) : '') + '</p>' +
          '<h1 id="runner-title">' + u.escapeHTML(task.title) + '</h1>' +
          '<p class="runner-goal">' + (task.output ? u.escapeHTML(task.output) : 'Nessun output verificabile specificato per questo task.') + '</p>' +
        '</div>' +

        '<section class="card timer-card">' +
          '<div class="pomodoro-presets" id="pomodoro-presets" role="radiogroup" aria-label="Modalità pomodoro">' +
            presetBtn(25, 5, true) + presetBtn(45, 10, false) + presetBtn(60, 10, false) +
            '<button type="button" class="chip" id="preset-custom" role="radio" aria-checked="false">Personalizzato</button>' +
          '</div>' +
          '<div id="custom-timer-fields" class="custom-timer-fields hidden">' +
            '<label>Lavoro (min) <input type="number" min="5" max="180" value="' + task.durationMin + '" id="custom-work"></label>' +
            '<label>Pausa (min) <input type="number" min="0" max="60" value="5" id="custom-break"></label>' +
          '</div>' +
          '<div class="timer-display" id="timer-display" aria-live="polite">' + fmtTime((task.durationMin || 25) * 60) + '</div>' +
          '<p class="timer-phase" id="timer-phase">Fase: lavoro</p>' +
          '<div class="timer-controls">' +
            '<button type="button" class="btn btn-primary" id="btn-timer-start">Avvia</button>' +
            '<button type="button" class="btn btn-ghost" id="btn-timer-pause" disabled>Pausa</button>' +
            '<button type="button" class="btn btn-ghost" id="btn-timer-reset">Reset</button>' +
          '</div>' +
        '</section>' +

        '<section class="card">' +
          '<p class="eyebrow">Checklist</p>' +
          '<ul class="checklist" id="checklist"></ul>' +
          '<form id="checklist-form" class="inline-form"><input class="input" id="checklist-input" placeholder="Aggiungi voce alla checklist"><button class="btn btn-ghost btn-sm" type="submit">+</button></form>' +
        '</section>' +

        '<section class="card">' +
          '<p class="eyebrow">Appunti rapidi</p>' +
          '<textarea class="input" id="runner-notes" rows="4" placeholder="Scrivi qui appunti, formule, intuizioni…"></textarea>' +
        '</section>' +

        '<section class="card runner-actions">' +
          '<button type="button" class="btn btn-ghost" id="btn-doubt">? Segna dubbio</button>' +
          '<button type="button" class="btn btn-ghost" id="btn-add-error">⚠ Aggiungi errore</button>' +
          '<button type="button" class="btn btn-ghost" id="btn-to-recall">🔁 Passa a recall</button>' +
        '</section>' +

        '<section class="card" id="doubts-card" style="display:none">' +
          '<p class="eyebrow">Dubbi segnati</p><ul id="doubts-list" class="doubts-list"></ul>' +
        '</section>' +

        '<button type="button" class="btn btn-primary btn-lg btn-end-session" id="btn-end-session">Termina sessione</button>' +
      '</div>';

    renderChecklist(root, task);
    wireRunner(root, task, exam);
  }

  function presetBtn(work, brk, selected) {
    return '<button type="button" class="chip' + (selected ? ' selected' : '') + '" data-work="' + work + '" data-break="' + brk + '" role="radio" aria-checked="' + selected + '">' + work + '/' + brk + '</button>';
  }

  function fmtTime(sec) {
    var m = Math.floor(sec / 60);
    var s = sec % 60;
    return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
  }

  function renderChecklist(root, task) {
    var list = u.qs('#checklist', root);
    var defaultItems = deriveChecklist(task);
    runnerState.checklist = defaultItems.map(function (t) { return { text: t, done: false }; });
    drawChecklist(list);
  }
  function deriveChecklist(task) {
    var out = [];
    if (task.output) {
      task.output.split(/\n|;/).map(function (s) { return s.trim(); }).filter(Boolean).forEach(function (s) { out.push(s); });
    }
    if (!out.length) out.push('Completa: ' + task.title);
    return out;
  }
  function drawChecklist(list) {
    list.innerHTML = '';
    runnerState.checklist.forEach(function (item, i) {
      var li = u.el('<li class="checklist-item"><label><input type="checkbox" ' + (item.done ? 'checked' : '') + ' data-i="' + i + '"> <span>' + u.escapeHTML(item.text) + '</span></label></li>');
      li.querySelector('input').addEventListener('change', function (e) { runnerState.checklist[i].done = e.target.checked; });
      list.appendChild(li);
    });
  }

  function wireRunner(root, task, exam) {
    u.qs('#btn-exit-runner', root).addEventListener('click', function () {
      stopTimer();
      document.body.classList.remove('focus-mode');
      US.router.navigate('#/dashboard');
    });
    u.qs('#btn-focus-toggle', root).addEventListener('click', function () {
      document.body.classList.toggle('focus-mode');
    });

    /* Timer */
    var workSec = (task.durationMin || 25) * 60;
    var breakSec = 5 * 60;
    var display = u.qs('#timer-display', root);
    var phaseLabel = u.qs('#timer-phase', root);
    var startBtn = u.qs('#btn-timer-start', root), pauseBtn = u.qs('#btn-timer-pause', root), resetBtn = u.qs('#btn-timer-reset', root);

    u.qsa('#pomodoro-presets .chip', root).forEach(function (chip) {
      chip.addEventListener('click', function () {
        u.qsa('#pomodoro-presets .chip', root).forEach(function (c) { c.classList.remove('selected'); c.setAttribute('aria-checked', 'false'); });
        chip.classList.add('selected');
        chip.setAttribute('aria-checked', 'true');
        var customFields = u.qs('#custom-timer-fields', root);
        if (chip.id === 'preset-custom') {
          customFields.classList.remove('hidden');
          workSec = Number(u.qs('#custom-work', root).value || task.durationMin) * 60;
          breakSec = Number(u.qs('#custom-break', root).value || 5) * 60;
        } else {
          customFields.classList.add('hidden');
          workSec = Number(chip.dataset.work) * 60;
          breakSec = Number(chip.dataset.break) * 60;
        }
        if (!timer) display.textContent = fmtTime(workSec);
      });
    });
    ['custom-work', 'custom-break'].forEach(function (id) {
      var f = u.qs('#' + id, root);
      if (f) f.addEventListener('input', function () {
        if (u.qs('#preset-custom', root).classList.contains('selected')) {
          workSec = Number(u.qs('#custom-work', root).value || task.durationMin) * 60;
          breakSec = Number(u.qs('#custom-break', root).value || 5) * 60;
          if (!timer) display.textContent = fmtTime(workSec);
        }
      });
    });

    function tick() {
      timer.remaining--;
      display.textContent = fmtTime(Math.max(0, timer.remaining));
      if (timer.remaining <= 0) {
        if (timer.phase === 'work') {
          timer.phase = 'break';
          timer.remaining = breakSec;
          phaseLabel.textContent = 'Fase: pausa';
          US.ui.toast('Tempo di lavoro concluso. Inizia la pausa.', 'success');
        } else {
          timer.phase = 'work';
          timer.remaining = workSec;
          phaseLabel.textContent = 'Fase: lavoro';
          US.ui.toast('Pausa finita. Si riprende.', 'info');
        }
      }
    }
    startBtn.addEventListener('click', function () {
      if (!timer) timer = { phase: 'work', remaining: workSec };
      timer.intervalId = setInterval(tick, 1000);
      startBtn.disabled = true; pauseBtn.disabled = false;
    });
    pauseBtn.addEventListener('click', function () {
      if (timer && timer.intervalId) { clearInterval(timer.intervalId); timer.intervalId = null; }
      startBtn.disabled = false; pauseBtn.disabled = true;
    });
    resetBtn.addEventListener('click', function () {
      stopTimer();
      timer = null;
      display.textContent = fmtTime(workSec);
      phaseLabel.textContent = 'Fase: lavoro';
      startBtn.disabled = false; pauseBtn.disabled = true;
    });

    /* Checklist */
    u.qs('#checklist-form', root).addEventListener('submit', function (e) {
      e.preventDefault();
      var input = u.qs('#checklist-input', root);
      var v = input.value.trim();
      if (!v) return;
      runnerState.checklist.push({ text: v, done: false });
      drawChecklist(u.qs('#checklist', root));
      input.value = '';
    });

    /* Note */
    u.qs('#runner-notes', root).addEventListener('input', function (e) { runnerState.notesText = e.target.value; });

    /* Dubbio */
    u.qs('#btn-doubt', root).addEventListener('click', function () {
      US.ui.promptText({ title: 'Segna un dubbio', placeholder: 'Cosa non ti è chiaro?' }).then(function (v) {
        if (!v) return;
        runnerState.doubts.push(v);
        var card = u.qs('#doubts-card', root);
        card.style.display = '';
        var li = u.el('<li>' + u.escapeHTML(v) + '</li>');
        u.qs('#doubts-list', root).appendChild(li);
        US.ui.toast('Dubbio registrato.', 'info');
      });
    });

    /* Aggiungi errore */
    u.qs('#btn-add-error', root).addEventListener('click', function () {
      openQuickErrorForm(task, exam);
    });

    /* Passa a recall */
    u.qs('#btn-to-recall', root).addEventListener('click', function () {
      u.qs('#runner-title', root).textContent = 'Recall — ' + task.title;
      u.qs('.runner-goal', root).textContent = 'Richiama il contenuto senza guardare gli appunti: spiega a voce alta, poi verifica.';
      US.ui.toast('Passato in modalità recall per questa sessione.', 'info');
    });

    /* Termina sessione */
    u.qs('#btn-end-session', root).addEventListener('click', function () {
      stopTimer();
      openEndSessionModal(task, exam);
    });
  }

  function openQuickErrorForm(task, exam) {
    US.ui.openModal({
      title: 'Aggiungi errore', size: 'lg',
      body:
        '<form id="quick-error-form" class="form-grid">' +
          '<div class="field field-full"><label>Descrizione errore<textarea class="input" name="description" rows="2" required></textarea></label></div>' +
          '<div class="field"><label>Tipo<select class="input" name="type">' + US.ERROR_TYPES.map(function (t) { return '<option value="' + t.id + '">' + t.label + '</option>'; }).join('') + '</select></label></div>' +
          '<div class="field"><label>Priorità<select class="input" name="priority">' + US.PRIORITIES.map(function (p) { return '<option value="' + p.id + '"' + (p.id === 'media' ? ' selected' : '') + '>' + p.label + '</option>'; }).join('') + '</select></label></div>' +
          '<div class="field field-full"><label>Causa probabile<input class="input" name="cause"></label></div>' +
          '<div class="field field-full"><label>Correzione/regola<input class="input" name="correction"></label></div>' +
          '<div class="field field-full"><label>Mini-esercizio di rivincita<input class="input" name="retryExercise"></label></div>' +
          '<div class="modal-actions"><button type="button" class="btn btn-ghost" data-act="cancel">Annulla</button><button type="submit" class="btn btn-primary">Salva errore</button></div>' +
        '</form>',
      onMount: function (body, close) {
        body.querySelector('[data-act="cancel"]').addEventListener('click', close);
        body.querySelector('#quick-error-form').addEventListener('submit', function (e) {
          e.preventDefault();
          var fd = new FormData(e.target);
          store.addError({
            examId: task.examId, topicId: task.topicId, type: fd.get('type'),
            description: fd.get('description').trim(), cause: fd.get('cause').trim(),
            correction: fd.get('correction').trim(), retryExercise: fd.get('retryExercise').trim(),
            priority: fd.get('priority'), status: 'aperto', nextReview: u.addDays(u.todayISO(), 1)
          });
          close();
          US.ui.toast('Errore registrato nell\'error log.', 'success');
        });
      }
    });
  }

  function openEndSessionModal(task, exam) {
    US.ui.openModal({
      title: 'Fine sessione', size: 'lg',
      body:
        '<form id="end-session-form" class="form-grid">' +
          '<div class="field field-full"><label>Hai completato l\'output verificabile?' +
            '<select class="input" name="outcome">' +
              '<option value="no">No</option>' +
              '<option value="aiuto">Con aiuto</option>' +
              '<option value="autonomo" selected>Sì, autonomamente</option>' +
              '<option value="spiega">Sì, e so anche spiegarlo</option>' +
            '</select></label></div>' +
          '<div class="field"><label>Difficoltà (1-5)<input class="input" type="number" min="1" max="5" name="difficulty" value="3"></label></div>' +
          '<div class="field"><label>Energia finale (1-5)<input class="input" type="number" min="1" max="5" name="energyAfter" value="3"></label></div>' +
          '<div class="field field-full"><label>Cosa ti ha bloccato? (opzionale)<input class="input" name="blocker"></label></div>' +
          '<div class="field field-full"><label>Nota facoltativa<textarea class="input" name="note" rows="2"></textarea></label></div>' +
          '<div class="modal-actions"><button type="submit" class="btn btn-primary">Salva e chiudi sessione</button></div>' +
        '</form>',
      onMount: function (body, close) {
        body.querySelector('#end-session-form').addEventListener('submit', function (e) {
          e.preventDefault();
          var fd = new FormData(e.target);
          finalizeSession(task, exam, {
            outcome: fd.get('outcome'), difficulty: Number(fd.get('difficulty')),
            energyAfter: Number(fd.get('energyAfter')), blocker: fd.get('blocker').trim(), note: fd.get('note').trim()
          });
          close();
        });
      }
    });
  }

  function finalizeSession(task, exam, answers) {
    var checklistDone = runnerState.checklist.filter(function (c) { return c.done; }).length;
    var startedAt = runnerState.startedAt;
    var endedAt = u.nowISOTime();
    var plannedDuration = task.durationMin;
    var actualDuration = Math.max(1, Math.round((new Date(endedAt) - new Date(startedAt)) / 60000)) || plannedDuration;

    store.addSession({
      taskId: task.id, examId: task.examId, startedAt: startedAt, endedAt: endedAt,
      plannedDuration: plannedDuration, actualDuration: actualDuration <= 0 ? plannedDuration : actualDuration,
      outcome: answers.outcome, difficultyRating: answers.difficulty, energyAfter: answers.energyAfter,
      blocker: answers.blocker, notes: runnerState.notesText, doubts: runnerState.doubts,
      checklistDone: checklistDone, checklistTotal: runnerState.checklist.length
    });

    var grade = answers.outcome === 'no' ? 0 : answers.outcome === 'aiuto' ? 1 : answers.outcome === 'autonomo' ? 2 : 3;

    if (answers.outcome === 'no') {
      store.updateTask(task.id, { status: 'ripianificato', dateSuggested: u.addDays(u.todayISO(), 1), notes: (task.notes || '') + '\nRipianificato dopo sessione non completata.' });
      US.ui.toast('Task ripianificato a domani: nessun fallimento, solo un ripasso rimandato.', 'info');
    } else {
      store.updateTask(task.id, { status: 'completato', dateActual: u.todayISO() });
      var nextDate = US.planner.nextReviewDateFromGrade(grade, u.todayISO());
      store.addTask({
        examId: task.examId, moduleId: task.moduleId, topicId: task.topicId, microTopicId: task.microTopicId,
        type: 'recall', title: 'Ripasso — ' + task.title, durationMin: 15, difficulty: task.difficulty || 3,
        prerequisites: '', output: 'Richiamare senza appunti i punti chiave di "' + task.title + '".',
        status: 'da_fare', dateSuggested: nextDate, dateActual: null, notes: 'Generato automaticamente da esito sessione.'
      });
      US.ui.toast('Sessione completata. Ripasso pianificato per il ' + u.formatDateShort(nextDate) + '.', 'success');
    }

    document.body.classList.remove('focus-mode');
    runnerState = null;
    US.router.navigate('#/dashboard');
  }

  US.views = US.views || {};
  US.views.session = { render: render };
})(window);
