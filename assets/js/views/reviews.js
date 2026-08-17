/* UniNettuno Study Camp — views/reviews.js (Ripassi distribuiti + Flashcard) */
(function (global) {
  'use strict';
  var US = global.US;
  var u = US.utils;
  var store = US.store;

  function examName(id) {
    var ex = store.getExam(id);
    return ex ? ex.name : '—';
  }

  function render(root) {
    var d = store.getData();
    var today = u.todayISO();
    var overdue = US.planner.overdueReviewTasks(d, today);
    var dueFlashcards = d.flashcards.filter(function (f) { return f.nextReview <= today; });
    var dueRecallTasks = d.tasks.filter(function (t) { return (t.type === 'recall' || t.type === 'revisione_errori') && t.status !== 'completato' && t.dateSuggested <= today; });
    var upcoming = upcomingByDate(d);

    root.innerHTML =
      '<div class="view-header"><div><h1>Ripassi</h1><p class="muted">Recall attivo e ripetizione distribuita: valuta cosa ricordi davvero.</p></div>' +
      '<div class="header-actions"><button type="button" class="btn btn-primary" id="btn-new-flashcard">+ Flashcard</button></div></div>' +

      (overdue.total >= 3 ? '<section class="card alert alert-warn">Hai ' + overdue.total + ' ripassi in ritardo: completa prima questi prima di aggiungere nuovo materiale.</section>' : '') +

      '<div class="view-header sub"><h2>Task di recall da fare (' + dueRecallTasks.length + ')</h2></div>' +
      '<div id="recall-tasks"></div>' +

      '<div class="view-header sub"><h2>Flashcard da ripassare (' + dueFlashcards.length + ')</h2></div>' +
      '<div id="flashcards-due"></div>' +

      '<div class="view-header sub"><h2>Prossimi ripassi pianificati</h2></div>' +
      '<div class="card" id="upcoming-card"></div>' +

      '<div class="view-header sub"><h2>Libreria flashcard (' + d.flashcards.length + ')</h2></div>' +
      '<div class="task-table" id="flashcard-library"></div>';

    renderRecallTasks(u.qs('#recall-tasks', root), dueRecallTasks);
    renderDueFlashcards(u.qs('#flashcards-due', root), dueFlashcards);
    renderUpcoming(u.qs('#upcoming-card', root), upcoming);
    renderFlashcardLibrary(u.qs('#flashcard-library', root), d.flashcards);

    u.qs('#btn-new-flashcard', root).addEventListener('click', function () { openFlashcardForm(null, function () { render(root); }); });
  }

  function upcomingByDate(d) {
    var today = u.todayISO();
    var horizon = u.addDays(today, 14);
    var byDate = {};
    d.tasks.filter(function (t) { return (t.type === 'recall' || t.type === 'revisione_errori') && t.status !== 'completato' && t.dateSuggested > today && t.dateSuggested <= horizon; })
      .forEach(function (t) { (byDate[t.dateSuggested] = byDate[t.dateSuggested] || []).push(t.title); });
    d.flashcards.filter(function (f) { return f.nextReview > today && f.nextReview <= horizon; })
      .forEach(function (f) { (byDate[f.nextReview] = byDate[f.nextReview] || []).push('Flashcard: ' + u.truncate(f.question, 40)); });
    return byDate;
  }

  function renderRecallTasks(container, tasks) {
    if (!tasks.length) { container.innerHTML = '<p class="muted">Nessun recall in coda. Ottimo segnale se hai già ripassato tutto.</p>'; return; }
    tasks.forEach(function (t) {
      var row = u.el(
        '<div class="card recall-row">' +
          '<div><p class="eyebrow">' + examName(t.examId) + '</p><h3>' + u.escapeHTML(t.title) + '</h3>' +
          (t.output ? '<p class="muted">' + u.escapeHTML(t.output) + '</p>' : '') + '</div>' +
          '<div class="grade-buttons" role="group" aria-label="Valuta il richiamo"></div>' +
        '</div>'
      );
      var gradeWrap = row.querySelector('.grade-buttons');
      US.RECALL_GRADES.forEach(function (g) {
        var btn = u.el('<button type="button" class="btn btn-ghost btn-sm">' + g.id + ' — ' + g.label + '</button>');
        btn.addEventListener('click', function () { gradeRecallTask(t, g.id); container.dispatchEvent(new CustomEvent('unisc:refresh')); render(document.getElementById('view-root')); });
        gradeWrap.appendChild(btn);
      });
      container.appendChild(row);
    });
  }

  function gradeRecallTask(task, grade) {
    var nextDate = US.planner.nextReviewDateFromGrade(grade, u.todayISO());
    store.updateTask(task.id, { status: 'completato', dateActual: u.todayISO() });
    if (grade <= 1) {
      store.addTask({
        examId: task.examId, moduleId: task.moduleId, topicId: task.topicId, microTopicId: task.microTopicId,
        type: 'revisione_errori', title: task.title, durationMin: 15, difficulty: task.difficulty || 3,
        prerequisites: '', output: task.output, status: 'da_fare', dateSuggested: nextDate, dateActual: null,
        notes: 'Ripianificato automaticamente dopo valutazione recall (voto ' + grade + ').'
      });
    } else {
      store.addTask({
        examId: task.examId, moduleId: task.moduleId, topicId: task.topicId, microTopicId: task.microTopicId,
        type: 'recall', title: task.title, durationMin: 15, difficulty: task.difficulty || 3,
        prerequisites: '', output: task.output, status: 'da_fare', dateSuggested: nextDate, dateActual: null,
        notes: 'Ripasso distribuito programmato dopo valutazione (voto ' + grade + ').'
      });
    }
    US.ui.toast('Valutato. Prossimo ripasso: ' + u.formatDateIt(nextDate) + '.', 'success');
  }

  function renderDueFlashcards(container, cards) {
    if (!cards.length) { container.innerHTML = '<p class="muted">Nessuna flashcard in scadenza.</p>'; return; }
    cards.forEach(function (fc) {
      var box = u.el(
        '<div class="card flashcard-box">' +
          '<p class="eyebrow">' + examName(fc.examId) + (fc.tag ? ' · ' + u.escapeHTML(fc.tag) : '') + '</p>' +
          '<p class="flashcard-q">' + u.escapeHTML(fc.question) + '</p>' +
          '<button type="button" class="btn btn-ghost btn-sm" data-act="flip">Mostra risposta</button>' +
          '<p class="flashcard-a hidden">' + u.escapeHTML(fc.answer) + '</p>' +
          '<div class="grade-buttons hidden" role="group" aria-label="Valuta il richiamo"></div>' +
        '</div>'
      );
      var answerEl = box.querySelector('.flashcard-a');
      var gradeWrap = box.querySelector('.grade-buttons');
      box.querySelector('[data-act="flip"]').addEventListener('click', function (e) {
        answerEl.classList.remove('hidden');
        gradeWrap.classList.remove('hidden');
        e.target.classList.add('hidden');
      });
      US.RECALL_GRADES.forEach(function (g) {
        var btn = u.el('<button type="button" class="btn btn-ghost btn-sm">' + g.id + ' — ' + g.label + '</button>');
        btn.addEventListener('click', function () {
          var nextDate = US.planner.nextReviewDateFromGrade(g.id, u.todayISO());
          var history = (fc.history || []).concat([{ date: u.todayISO(), grade: g.id }]);
          store.updateFlashcard(fc.id, { nextReview: nextDate, history: history, difficulty: g.id <= 1 ? Math.min(5, (fc.difficulty || 3) + 1) : Math.max(1, (fc.difficulty || 3) - 1) });
          US.ui.toast('Flashcard rivalutata. Prossimo ripasso: ' + u.formatDateIt(nextDate) + '.', 'success');
          render(document.getElementById('view-root'));
        });
        gradeWrap.appendChild(btn);
      });
      container.appendChild(box);
    });
  }

  function renderUpcoming(container, byDate) {
    var dates = Object.keys(byDate).sort();
    if (!dates.length) { container.innerHTML = '<p class="muted">Nessun ripasso pianificato nei prossimi 14 giorni.</p>'; return; }
    container.innerHTML = '<ul class="upcoming-list">' + dates.map(function (date) {
      return '<li><strong>' + u.formatDateIt(date) + '</strong><ul>' + byDate[date].map(function (t) { return '<li>' + u.escapeHTML(t) + '</li>'; }).join('') + '</ul></li>';
    }).join('') + '</ul>';
  }

  function renderFlashcardLibrary(container, cards) {
    if (!cards.length) { container.innerHTML = '<p class="muted">Nessuna flashcard creata ancora.</p>'; return; }
    var head = '<div class="task-row task-row-head"><span>Domanda</span><span>Esame</span><span>Tag</span><span>Prossimo ripasso</span><span></span></div>';
    var rows = cards.map(function (fc) {
      return '<div class="task-row" data-id="' + fc.id + '">' +
        '<span>' + u.escapeHTML(u.truncate(fc.question, 60)) + '</span>' +
        '<span>' + examName(fc.examId) + '</span>' +
        '<span>' + u.escapeHTML(fc.tag || '—') + '</span>' +
        '<span>' + u.formatDateShort(fc.nextReview) + '</span>' +
        '<span><button type="button" class="btn-icon" data-act="edit" aria-label="Modifica">✎</button>' +
        '<button type="button" class="btn-icon" data-act="del" aria-label="Elimina">✕</button></span>' +
        '</div>';
    }).join('');
    container.innerHTML = head + rows;
    container.addEventListener('click', function (e) {
      var row = e.target.closest('.task-row');
      if (!row || !row.dataset.id) return;
      var fc = store.getData().flashcards.find(function (x) { return x.id === row.dataset.id; });
      if (e.target.dataset.act === 'edit') openFlashcardForm(fc, function () { render(document.getElementById('view-root')); });
      if (e.target.dataset.act === 'del') {
        US.ui.confirmDialog({ title: 'Eliminare la flashcard?', message: u.truncate(fc.question, 80), danger: true }).then(function (ok) {
          if (ok) { store.deleteFlashcard(fc.id); render(document.getElementById('view-root')); }
        });
      }
    });
  }

  function openFlashcardForm(fc, onDone) {
    var isEdit = !!fc;
    fc = fc || { difficulty: 3, nextReview: u.todayISO() };
    var exams = store.getData().exams;
    US.ui.openModal({
      title: isEdit ? 'Modifica flashcard' : 'Nuova flashcard',
      size: 'lg',
      body:
        '<form id="fc-form" class="form-grid">' +
          '<div class="field field-full"><label>Domanda<textarea class="input" name="question" rows="2" required>' + (fc.question ? u.escapeHTML(fc.question) : '') + '</textarea></label></div>' +
          '<div class="field field-full"><label>Risposta<textarea class="input" name="answer" rows="2" required>' + (fc.answer ? u.escapeHTML(fc.answer) : '') + '</textarea></label></div>' +
          '<div class="field"><label>Esame<select class="input" name="examId"><option value="">— nessuno —</option>' +
            exams.map(function (ex) { return '<option value="' + ex.id + '"' + (ex.id === fc.examId ? ' selected' : '') + '>' + u.escapeHTML(ex.name) + '</option>'; }).join('') +
          '</select></label></div>' +
          '<div class="field"><label>Tag<input class="input" name="tag" value="' + (fc.tag ? u.escapeHTML(fc.tag) : '') + '"></label></div>' +
          '<div class="field"><label>Difficoltà (1-5)<input class="input" type="number" min="1" max="5" name="difficulty" value="' + (fc.difficulty || 3) + '"></label></div>' +
          '<div class="field"><label>Prossimo ripasso<input class="input" type="date" name="nextReview" value="' + (fc.nextReview || u.todayISO()) + '"></label></div>' +
          '<div class="modal-actions"><button type="button" class="btn btn-ghost" data-act="cancel">Annulla</button><button type="submit" class="btn btn-primary">' + (isEdit ? 'Salva' : 'Crea flashcard') + '</button></div>' +
        '</form>',
      onMount: function (body, close) {
        body.querySelector('[data-act="cancel"]').addEventListener('click', close);
        body.querySelector('#fc-form').addEventListener('submit', function (e) {
          e.preventDefault();
          var f = new FormData(e.target);
          var payload = {
            question: f.get('question').trim(), answer: f.get('answer').trim(),
            examId: f.get('examId') || null, tag: f.get('tag').trim(),
            difficulty: Number(f.get('difficulty')) || 3, nextReview: f.get('nextReview') || u.todayISO()
          };
          if (!payload.question || !payload.answer) return;
          if (isEdit) store.updateFlashcard(fc.id, payload); else store.addFlashcard(payload);
          close();
          US.ui.toast(isEdit ? 'Flashcard aggiornata.' : 'Flashcard creata.', 'success');
          if (onDone) onDone();
        });
      }
    });
  }

  US.views = US.views || {};
  US.views.reviews = { render: render };
})(window);
