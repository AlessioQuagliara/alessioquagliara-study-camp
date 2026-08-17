/* UniNettuno Study Camp — views/dashboard.js */
(function (global) {
  'use strict';
  var US = global.US;
  var u = US.utils;
  var store = US.store;
  var planner = US.planner;

  function greeting() {
    var h = new Date().getHours();
    if (h < 6) return 'Ancora sveglio';
    if (h < 12) return 'Buongiorno';
    if (h < 14) return 'Buon proseguimento';
    if (h < 18) return 'Buon pomeriggio';
    if (h < 22) return 'Buonasera';
    return 'Sessione serale';
  }

  function masteryLabel(id) {
    var m = US.MASTERY_LEVELS.find(function (x) { return x.id === id; });
    return m ? m.label : id;
  }

  function taskTypeMeta(type) {
    return US.TASK_TYPES.find(function (t) { return t.id === type; }) || { label: type, icon: '•' };
  }

  function render(root) {
    var d = store.getData();
    var today = u.todayISO();
    var action = planner.nextAction(d);
    var week = planner.weekStatus(d);
    var streak = planner.continuityDays(d);
    var alerts = planner.alerts(d);
    var todays = planner.todayTasks(d, today);
    var priorityExam = planner.activeExams(d).slice().sort(function (a, b) {
      return planner.priorityWeight(b.priority) - planner.priorityWeight(a.priority);
    })[0];

    var daysToExam = null;
    if (priorityExam && priorityExam.examDate) daysToExam = u.daysBetween(today, priorityExam.examDate);

    var todayCard = buildTodayCard(todays);

    root.innerHTML =
      '<div class="view-header">' +
        '<div><h1>' + greeting() + '.</h1><p class="muted">' + u.formatDateIt(today, { weekday: true }) + '</p></div>' +
        '<div class="streak-badge" title="Giorni consecutivi con almeno una micro-sessione utile">' +
          '<span class="streak-flame">◆</span> ' + streak + ' g. di continuità</div>' +
      '</div>' +

      '<section class="card next-action-card">' +
        '<p class="eyebrow">Prossima azione utile</p>' +
        '<h2>' + u.escapeHTML(action.title) + '</h2>' +
        (action.sub ? '<p class="muted">' + u.escapeHTML(action.sub) + '</p>' : '') +
        '<button type="button" class="btn btn-primary btn-lg" id="btn-start-session">▶ Avvia sessione</button>' +
      '</section>' +

      '<div class="grid-2col">' +
        '<section class="card">' +
          '<p class="eyebrow">Esame prioritario</p>' +
          (priorityExam ?
            '<h3>' + u.escapeHTML(priorityExam.name) + '</h3>' +
            '<p class="muted">' + labelFor(US.EXAM_STATUSES, priorityExam.status) + ' · Priorità ' + labelFor(US.PRIORITIES, priorityExam.priority) + '</p>' +
            (daysToExam != null ? '<p class="days-to-exam">' + (daysToExam >= 0 ? daysToExam + ' giorni al prossimo appello' : 'Appello passato') + '</p>' : '<p class="muted">Nessuna data appello inserita.</p>') +
            '<a class="btn btn-ghost" href="#/esami/' + priorityExam.id + '">Apri scheda esame</a>'
            : '<p class="muted">Nessun esame ancora creato.</p><a class="btn btn-ghost" href="#/esami">Crea il primo esame</a>') +
        '</section>' +

        '<section class="card">' +
          '<p class="eyebrow">Stato settimanale</p>' +
          '<ul class="stat-list">' +
            '<li><span>Sessioni pianificate</span><b>' + week.planned + '</b></li>' +
            '<li><span>Sessioni completate</span><b>' + week.completed + '</b></li>' +
            '<li><span>Minuti effettivi</span><b>' + u.formatMinutes(week.minutes) + '</b></li>' +
            '<li><span>Argomenti avanzati</span><b>' + week.topicsAdvanced + '</b></li>' +
            '<li><span>Ripassi in scadenza</span><b class="' + (week.reviewsDue > 0 ? 'text-warn' : '') + '">' + week.reviewsDue + '</b></li>' +
          '</ul>' +
        '</section>' +
      '</div>' +

      todayCard +

      '<section class="card">' +
        '<p class="eyebrow">Check-in rapido</p>' +
        '<form id="checkin-form" class="checkin-form">' +
          '<div class="field-group">' +
            '<label for="ci-energy">Energia</label>' +
            '<input type="range" min="1" max="5" value="3" id="ci-energy">' +
            '<output id="ci-energy-out">3</output>' +
          '</div>' +
          '<div class="field-group">' +
            '<label for="ci-focus">Concentrazione</label>' +
            '<input type="range" min="1" max="5" value="3" id="ci-focus">' +
            '<output id="ci-focus-out">3</output>' +
          '</div>' +
          '<div class="field-group">' +
            '<label>Tempo disponibile</label>' +
            '<div class="chip-group" id="ci-time" role="radiogroup" aria-label="Tempo disponibile">' +
              [25, 45, 60, 90].map(function (m, i) {
                return '<button type="button" class="chip' + (i === 0 ? ' selected' : '') + '" data-min="' + m + '" role="radio" aria-checked="' + (i === 0) + '">' + m + ' min</button>';
              }).join('') +
            '</div>' +
          '</div>' +
          '<button type="submit" class="btn btn-primary">Suggerisci task adatto</button>' +
        '</form>' +
        '<div id="checkin-result"></div>' +
      '</section>' +

      '<section class="card alerts-card">' +
        '<p class="eyebrow">Avvisi</p>' +
        '<ul class="alert-list">' +
          alerts.map(function (a) {
            return '<li class="alert alert-' + a.level + '">' + u.escapeHTML(a.text) + '</li>';
          }).join('') +
        '</ul>' +
      '</section>';

    wire(root, d);
  }

  function labelFor(list, id) {
    var m = list.find(function (x) { return x.id === id; });
    return m ? m.label : id;
  }

  function buildTodayCard(todays) {
    if (!todays.length) {
      return '<section class="card"><p class="eyebrow">Oggi</p><p class="muted">Nessun task pianificato per oggi. Genera micro-obiettivi da un esame o usa "Genera settimana realistica" in Statistiche/Pianificazione.</p></section>';
    }
    var byType = {};
    todays.forEach(function (t) { (byType[t.type] = byType[t.type] || []).push(t); });
    var items = todays.slice(0, 6).map(function (t) {
      var meta = taskTypeMeta(t.type);
      return '<li class="today-item"><span class="ti-icon" aria-hidden="true">' + meta.icon + '</span>' +
        '<span class="ti-title">' + u.escapeHTML(t.title) + '</span>' +
        '<span class="ti-dur">' + u.formatMinutes(t.durationMin) + '</span>' +
        '<a class="btn btn-sm btn-ghost" href="#/sessione?task=' + t.id + '">Avvia</a></li>';
    }).join('');
    return '<section class="card"><p class="eyebrow">Oggi (' + todays.length + ')</p><ul class="today-list">' + items + '</ul></section>';
  }

  function wire(root, d) {
    var startBtn = u.qs('#btn-start-session', root);
    startBtn.addEventListener('click', function () {
      var action = planner.nextAction(d);
      if (action.kind === 'task' && action.ref) US.router.navigate('#/sessione?task=' + action.ref.id);
      else if (action.kind === 'exam') US.router.navigate('#/esami/' + action.ref.id);
      else US.router.navigate('#/sessione');
    });

    var energy = u.qs('#ci-energy', root), energyOut = u.qs('#ci-energy-out', root);
    var focus = u.qs('#ci-focus', root), focusOut = u.qs('#ci-focus-out', root);
    energy.addEventListener('input', function () { energyOut.textContent = energy.value; });
    focus.addEventListener('input', function () { focusOut.textContent = focus.value; });

    var selectedMin = 25;
    u.qsa('.chip', u.qs('#ci-time', root)).forEach(function (chip) {
      chip.addEventListener('click', function () {
        u.qsa('.chip', u.qs('#ci-time', root)).forEach(function (c) { c.classList.remove('selected'); c.setAttribute('aria-checked', 'false'); });
        chip.classList.add('selected');
        chip.setAttribute('aria-checked', 'true');
        selectedMin = parseInt(chip.dataset.min, 10);
      });
    });

    u.qs('#checkin-form', root).addEventListener('submit', function (e) {
      e.preventDefault();
      var energyVal = parseInt(energy.value, 10);
      var focusVal = parseInt(focus.value, 10);
      store.addCheckin({ energy: energyVal, focus: focusVal, timeAvailable: selectedMin });
      var suggestion = planner.suggestTaskForContext(store.getData(), selectedMin, energyVal);
      var resultBox = u.qs('#checkin-result', root);
      if (suggestion.kind === 'empty') {
        resultBox.innerHTML = '<p class="muted">' + u.escapeHTML(suggestion.label || 'Nessun task adatto trovato.') + '</p>';
        return;
      }
      var ref = suggestion.ref;
      var title = suggestion.title || (ref && (ref.title || ref.question || ref.description)) || 'Task';
      var link = suggestion.kind === 'task' && ref ? '#/sessione?task=' + ref.id : '#/sessione';
      resultBox.innerHTML =
        '<div class="suggestion-box">' +
          '<p class="eyebrow">Task suggerito</p>' +
          '<h3>' + u.escapeHTML(title) + '</h3>' +
          '<a class="btn btn-primary" href="' + link + '">Avvia questo task</a>' +
        '</div>';
      US.ui.toast('Check-in registrato.', 'success');
    });
  }

  US.views = US.views || {};
  US.views.dashboard = { render: render };
})(window);
