/* UniNettuno Study Camp — views/stats.js (Statistiche, pianificazione realistica, review settimanale) */
(function (global) {
  'use strict';
  var US = global.US;
  var u = US.utils;
  var store = US.store;

  function render(root) {
    var d = store.getData();
    root.innerHTML =
      '<div class="view-header"><div><h1>Statistiche</h1><p class="muted">Il sistema si valuta sui dati, non tu sulla persona.</p></div></div>' +

      '<div class="grid-2col">' +
        '<section class="card"><p class="eyebrow">Minuti per esame</p><div id="chart-minutes-exam"></div></section>' +
        '<section class="card"><p class="eyebrow">Argomenti per padronanza</p><div id="chart-mastery"></div></section>' +
      '</div>' +

      '<div class="stat-grid" id="stat-tiles"></div>' +

      '<section class="card"><p class="eyebrow">Andamento minuti — ultimi 30 giorni</p><div id="chart-trend"></div></section>' +

      '<div class="view-header sub"><h2>Pianificazione realistica</h2></div>' +
      '<section class="card">' +
        '<p class="muted small">Genera una bozza per i prossimi 7 giorni rispettando la disponibilità impostata in Impostazioni e i giorni di allenamento.</p>' +
        '<button type="button" class="btn btn-primary" id="btn-gen-week">Genera settimana realistica</button>' +
        '<div id="week-draft"></div>' +
      '</section>' +

      '<div class="view-header sub"><h2>Review settimanale guidata</h2></div>' +
      '<section class="card">' +
        '<form id="weekly-review-form" class="form-grid">' +
          '<div class="field field-full"><label>Cosa hai completato questa settimana?<textarea class="input" name="completed" rows="2"></textarea></label></div>' +
          '<div class="field field-full"><label>Dove ti blocchi?<textarea class="input" name="blockers" rows="2"></textarea></label></div>' +
          '<div class="field field-full"><label>Quali errori si ripetono?<textarea class="input" name="recurringErrors" rows="2"></textarea></label></div>' +
          '<div class="field"><label>Argomento più rischioso<input class="input" name="riskyTopic"></label></div>' +
          '<div class="field"><label>Sessioni realistiche la prossima settimana<input class="input" type="number" min="0" name="nextWeekCapacity" value="5"></label></div>' +
          '<div class="field field-full"><label>Piano successivo (bozza modificabile)<textarea class="input" name="planDraft" rows="3" placeholder="Es. lun-mer: ripassi in ritardo; gio-ven: nuovo modulo; sab: simulazione"></textarea></label></div>' +
          '<div class="modal-actions"><button type="submit" class="btn btn-primary">Salva review</button></div>' +
        '</form>' +
        '<div id="weekly-review-list"></div>' +
      '</section>';

    drawCharts(root, d);
    drawTiles(u.qs('#stat-tiles', root), d);
    wireWeekGenerator(root, d);
    wireWeeklyReview(root, d);
  }

  function drawCharts(root, d) {
    var minutesByExam = {};
    d.sessions.forEach(function (s) {
      if (!s.examId) return;
      minutesByExam[s.examId] = (minutesByExam[s.examId] || 0) + (s.actualDuration || 0);
    });
    var barData = Object.keys(minutesByExam).map(function (examId) {
      var ex = store.getExam(examId);
      return { label: ex ? u.truncate(ex.name, 12) : '—', value: minutesByExam[examId] };
    });
    US.charts.barChart(u.qs('#chart-minutes-exam', root), barData, { ariaLabel: 'Minuti per esame', showValue: true });

    var masteryCounts = {};
    US.MASTERY_LEVELS.forEach(function (m) { masteryCounts[m.id] = 0; });
    d.exams.forEach(function (ex) {
      US.store.allTopicsFlat(ex).forEach(function (t) {
        masteryCounts[t.mastery] = (masteryCounts[t.mastery] || 0) + 1;
        (t.microTopics || []).forEach(function (mt) { masteryCounts[mt.mastery] = (masteryCounts[mt.mastery] || 0) + 1; });
      });
    });
    var donutData = US.MASTERY_LEVELS.map(function (m, i) { return { label: m.label, value: masteryCounts[m.id], cls: 'donut-c' + (i % 6) }; });
    US.charts.donut(u.qs('#chart-mastery', root), donutData, { ariaLabel: 'Distribuzione padronanza' });

    var days = [];
    for (var i = 29; i >= 0; i--) days.push(u.addDays(u.todayISO(), -i));
    var minutesByDay = {};
    d.sessions.forEach(function (s) {
      if (!s.startedAt) return;
      var day = s.startedAt.slice(0, 10);
      minutesByDay[day] = (minutesByDay[day] || 0) + (s.actualDuration || 0);
    });
    var trendValues = days.map(function (day) { return minutesByDay[day] || 0; });
    US.charts.sparkline(u.qs('#chart-trend', root), trendValues, { ariaLabel: 'Andamento minuti ultimi 30 giorni' });
  }

  function drawTiles(container, d) {
    var sessionsCompleted = d.sessions.length;
    var sessionsWithRecall = d.sessions.filter(function (s) {
      var t = store.getTask(s.taskId);
      return t && (t.type === 'recall' || t.type === 'revisione_errori');
    }).length;
    var recallPct = sessionsCompleted ? Math.round((sessionsWithRecall / sessionsCompleted) * 100) : 0;
    var exercisesDone = d.tasks.filter(function (t) { return (t.type === 'esercizi' || t.type === 'coding') && t.status === 'completato'; }).length;
    var reviewsCompleted = d.tasks.filter(function (t) { return (t.type === 'recall' || t.type === 'revisione_errori') && t.status === 'completato'; }).length;
    var overdue = US.planner.overdueReviewTasks(d, u.todayISO());
    var errorsOpen = d.errors.filter(function (e) { return e.status !== 'risolto'; }).length;
    var errorsSolved = d.errors.filter(function (e) { return e.status === 'risolto'; }).length;
    var simsDone = d.simulations.filter(function (s) { return s.status === 'completata'; }).length;
    var streak = US.planner.continuityDays(d);

    var tiles = [
      { label: 'Sessioni completate', value: sessionsCompleted },
      { label: '% sessioni con recall', value: recallPct + '%' },
      { label: 'Esercizi/coding completati', value: exercisesDone },
      { label: 'Ripassi completati', value: reviewsCompleted },
      { label: 'Ripassi in ritardo', value: overdue.total, warn: overdue.total > 0 },
      { label: 'Errori aperti', value: errorsOpen, warn: errorsOpen > 0 },
      { label: 'Errori risolti', value: errorsSolved },
      { label: 'Simulazioni svolte', value: simsDone },
      { label: 'Continuità', value: streak + ' g.' }
    ];
    container.innerHTML = tiles.map(function (t) {
      return '<div class="stat-tile' + (t.warn ? ' stat-tile-warn' : '') + '"><span class="stat-value">' + t.value + '</span><span class="stat-label">' + t.label + '</span></div>';
    }).join('');
  }

  function wireWeekGenerator(root, d) {
    u.qs('#btn-gen-week', root).addEventListener('click', function () {
      var result = US.planner.generateRealisticWeek(store.getData());
      renderWeekDraft(u.qs('#week-draft', root), result);
    });
  }

  function renderWeekDraft(container, result) {
    container.innerHTML = '<div class="week-draft-grid" id="wd-grid"></div><button type="button" class="btn btn-primary" id="btn-apply-week">Applica pianificazione</button>';
    var grid = u.qs('#wd-grid', container);
    result.days.forEach(function (day) {
      var items = result.plan[day] || [];
      var col = u.el(
        '<div class="week-draft-col">' +
          '<h4>' + u.GIORNI_BREVI[new Date(day + 'T00:00:00').getDay()] + ' ' + u.formatDateShort(day) + '</h4>' +
          '<ul>' + (items.length ? items.map(function (it) { return '<li>' + u.escapeHTML(it.title || '') + ' <span class="muted">(' + u.formatMinutes(it.durationMin) + ')</span></li>'; }).join('') : '<li class="muted">Libero</li>') + '</ul>' +
        '</div>'
      );
      grid.appendChild(col);
    });
    u.qs('#btn-apply-week', container).addEventListener('click', function () {
      var count = 0;
      result.days.forEach(function (day) {
        (result.plan[day] || []).forEach(function (item) {
          if (item.kind === 'task' && item.ref && item.ref.id) { store.updateTask(item.ref.id, { dateSuggested: day }); count++; }
          else if (item.kind === 'flashcard' && item.ref && item.ref.id) { store.updateFlashcard(item.ref.id, { nextReview: day }); count++; }
          else if (item.kind === 'error' && item.ref && item.ref.id) { store.updateError(item.ref.id, { nextReview: day }); count++; }
        });
      });
      US.ui.toast('Pianificazione applicata: ' + count + ' elementi ricalendarizzati.', 'success');
    });
  }

  function wireWeeklyReview(root, d) {
    renderWeeklyReviewList(u.qs('#weekly-review-list', root), d);
    u.qs('#weekly-review-form', root).addEventListener('submit', function (e) {
      e.preventDefault();
      var f = new FormData(e.target);
      var entry = {
        id: u.uid('wr'), date: u.todayISO(),
        completed: f.get('completed').trim(), blockers: f.get('blockers').trim(),
        recurringErrors: f.get('recurringErrors').trim(), riskyTopic: f.get('riskyTopic').trim(),
        nextWeekCapacity: Number(f.get('nextWeekCapacity')) || 0, planDraft: f.get('planDraft').trim(),
        createdAt: u.nowISOTime()
      };
      var data = store.getData();
      data.weeklyReviews.push(entry);
      store.save();
      US.ui.toast('Review settimanale salvata.', 'success');
      e.target.reset();
      renderWeeklyReviewList(u.qs('#weekly-review-list', root), store.getData());
    });
  }

  function renderWeeklyReviewList(container, d) {
    var reviews = d.weeklyReviews.slice().sort(function (a, b) { return a.date < b.date ? 1 : -1; }).slice(0, 5);
    if (!reviews.length) { container.innerHTML = '<p class="muted">Nessuna review salvata ancora.</p>'; return; }
    container.innerHTML = '<ul class="review-list">' + reviews.map(function (r) {
      return '<li><strong>' + u.formatDateIt(r.date) + '</strong>' +
        (r.riskyTopic ? ' · argomento a rischio: ' + u.escapeHTML(r.riskyTopic) : '') +
        (r.nextWeekCapacity ? ' · capacità prossima settimana: ' + r.nextWeekCapacity + ' sessioni' : '') + '</li>';
    }).join('') + '</ul>';
  }

  US.views = US.views || {};
  US.views.stats = { render: render };
})(window);
