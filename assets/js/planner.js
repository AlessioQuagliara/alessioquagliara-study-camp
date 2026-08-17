/* UniNettuno Study Camp — planner.js
   Motore di pianificazione: prossima azione, alert, generatore micro-task,
   spaced repetition, generazione settimana realistica, readiness esame. */
(function (global) {
  'use strict';
  var US = global.US;
  var u = US.utils;

  function activeExams(d) {
    return d.exams.filter(function (e) { return e.status !== 'sostenuto'; });
  }

  function overdueReviewTasks(d, today) {
    today = today || u.todayISO();
    var tasks = d.tasks.filter(function (t) {
      return (t.type === 'recall' || t.type === 'revisione_errori') && t.status !== 'completato' && t.dateSuggested && t.dateSuggested < today;
    });
    var fc = d.flashcards.filter(function (f) { return f.nextReview && f.nextReview < today; });
    var errs = d.errors.filter(function (e) { return e.status !== 'risolto' && e.nextReview && e.nextReview < today; });
    return { tasks: tasks, flashcards: fc, errors: errs, total: tasks.length + fc.length + errs.length };
  }

  function todayTasks(d, today) {
    today = today || u.todayISO();
    return d.tasks.filter(function (t) { return t.dateSuggested === today && t.status !== 'completato'; });
  }

  /* ---------- Prossima azione utile ---------- */
  function nextAction(d) {
    var today = u.todayISO();
    var overdue = overdueReviewTasks(d, today);
    if (overdue.errors.length) {
      var e = overdue.errors[0];
      return { kind: 'error', ref: e, label: 'Rivedi un errore in ritardo', title: e.description, sub: 'Priorità: recupero errore aperto' };
    }
    if (overdue.tasks.length) {
      var t = overdue.tasks[0];
      return { kind: 'task', ref: t, label: 'Ripasso in ritardo', title: t.title, sub: US.utils.formatMinutes(t.durationMin) };
    }
    if (overdue.flashcards.length) {
      var f = overdue.flashcards[0];
      return { kind: 'flashcard', ref: f, label: 'Flashcard in scadenza', title: f.question, sub: 'Ripasso rapido' };
    }
    var todays = todayTasks(d, today);
    if (todays.length) {
      // priorità: esame con priorità alta prima
      todays.sort(function (a, b) { return examPriorityWeight(d, b.examId) - examPriorityWeight(d, a.examId); });
      var tt = todays[0];
      return { kind: 'task', ref: tt, label: 'Task di oggi', title: tt.title, sub: US.utils.formatMinutes(tt.durationMin) };
    }
    // nessun task pianificato: suggerisci esame prioritario
    var exams = activeExams(d).slice().sort(function (a, b) { return priorityWeight(b.priority) - priorityWeight(a.priority); });
    if (exams.length) {
      return { kind: 'exam', ref: exams[0], label: 'Nessun task pianificato', title: 'Pianifica il prossimo passo per ' + exams[0].name, sub: 'Vai alla scheda esame' };
    }
    return { kind: 'empty', label: 'Tutto libero', title: 'Crea il tuo primo esame per iniziare', sub: '' };
  }

  function priorityWeight(p) { return p === 'alta' ? 3 : p === 'media' ? 2 : 1; }
  function examPriorityWeight(d, examId) {
    var ex = d.exams.find(function (x) { return x.id === examId; });
    return ex ? priorityWeight(ex.priority) : 0;
  }

  /* ---------- Adattamento tempo/energia ---------- */
  function suggestTaskForContext(d, minutes, energy) {
    var today = u.todayISO();
    var overdue = overdueReviewTasks(d, today);
    var lowEnergy = energy <= 2;
    if (lowEnergy || minutes <= 25) {
      if (overdue.errors.length) return { kind: 'error', ref: overdue.errors[0] };
      if (overdue.flashcards.length) return { kind: 'flashcard', ref: overdue.flashcards[0] };
      if (overdue.tasks.length) return { kind: 'task', ref: overdue.tasks.filter(function(t){return t.type==='recall';})[0] || overdue.tasks[0] };
      var recallCandidates = d.tasks.filter(function (t) { return (t.type === 'recall' || t.type === 'flashcard') && t.status !== 'completato'; });
      if (recallCandidates.length) return { kind: 'task', ref: recallCandidates[0] };
      return { kind: 'empty', label: 'Nessun recall in coda: aggiungi flashcard o errori da ripassare.' };
    }
    // energia buona + tempo ampio: nuovo argomento + esercizi + recall
    var candidates = d.tasks.filter(function (t) {
      return t.status !== 'completato' && t.dateSuggested <= today && t.durationMin <= minutes + 15;
    });
    candidates.sort(function (a, b) {
      var order = { teoria: 0, videolezione: 0, lettura: 0, esercizi: 1, coding: 1, recall: 2, revisione_errori: 2, flashcard: 2, simulazione: 3 };
      return (order[a.type] || 9) - (order[b.type] || 9);
    });
    if (candidates.length) return { kind: 'task', ref: candidates[0] };
    if (overdue.total) return { kind: 'task', ref: overdue.tasks[0] || null, fallback: overdue };
    return { kind: 'empty', label: 'Nessun task pronto: crea nuovi micro-obiettivi da un esame.' };
  }

  /* ---------- Stato settimanale ---------- */
  function weekStatus(d) {
    var monday = u.startOfWeek(u.todayISO());
    var days = u.weekDates(monday);
    var sunday = days[6];
    var plannedTasks = d.tasks.filter(function (t) { return t.dateSuggested >= monday && t.dateSuggested <= sunday; });
    var completedTasks = plannedTasks.filter(function (t) { return t.status === 'completato'; });
    var sessionsThisWeek = d.sessions.filter(function (s) { return s.startedAt && s.startedAt.slice(0, 10) >= monday && s.startedAt.slice(0, 10) <= sunday; });
    var minutes = sessionsThisWeek.reduce(function (sum, s) { return sum + (s.actualDuration || 0); }, 0);
    var topicsAdvanced = 0;
    d.exams.forEach(function (ex) {
      US.store.allTopicsFlat(ex).forEach(function (t) {
        if (t.masteryUpdatedAt && t.masteryUpdatedAt.slice(0, 10) >= monday && t.masteryUpdatedAt.slice(0, 10) <= sunday) {
          topicsAdvanced++;
        }
      });
    });
    var overdue = overdueReviewTasks(d, u.todayISO());
    return {
      monday: monday, sunday: sunday,
      planned: plannedTasks.length, completed: completedTasks.length,
      minutes: minutes, sessionsCompleted: sessionsThisWeek.length,
      topicsAdvanced: topicsAdvanced,
      reviewsDue: overdue.total
    };
  }

  /* ---------- Continuità (streak) ---------- */
  function continuityDays(d) {
    var doneDates = {};
    d.sessions.forEach(function (s) { if (s.startedAt && s.outcome && s.outcome !== 'no') doneDates[s.startedAt.slice(0, 10)] = true; });
    var count = 0;
    var cursor = u.todayISO();
    while (doneDates[cursor]) {
      count++;
      cursor = u.addDays(cursor, -1);
    }
    return count;
  }

  /* ---------- Alert dashboard ---------- */
  function alerts(d) {
    var out = [];
    var overdue = overdueReviewTasks(d, u.todayISO());
    if (overdue.total >= 3) {
      out.push({ level: 'warn', text: 'Hai ' + overdue.total + ' ripassi in ritardo: fai prima una sessione di recupero.' });
    }
    var recallCount = d.tasks.filter(function (t) { return t.type === 'recall' && t.status === 'completato'; }).length;
    var passiveCount = d.tasks.filter(function (t) { return (t.type === 'videolezione' || t.type === 'lettura') && t.status === 'completato'; }).length;
    if (passiveCount >= 4 && recallCount < Math.ceil(passiveCount / 3)) {
      out.push({ level: 'warn', text: 'Hai letto/guardato molto ma hai pochi test di richiamo: aggiungi recall.' });
    }
    var today = u.todayISO();
    var tomorrow = u.addDays(today, 1);
    var tomorrowLoad = d.tasks.filter(function (t) { return t.dateSuggested === tomorrow && t.status !== 'completato'; })
      .reduce(function (s, t) { return s + (t.durationMin || 0); }, 0);
    if (tomorrowLoad > 150) {
      out.push({ level: 'warn', text: 'Stai pianificando troppo per domani (' + u.formatMinutes(tomorrowLoad) + '): riduci i task.' });
    }
    var autonomiCount = 0, total = 0;
    d.exams.forEach(function (ex) {
      US.store.allTopicsFlat(ex).forEach(function (t) {
        total++;
        if (t.mastery === 'autonomo' || t.mastery === 'so_spiegare') autonomiCount++;
      });
    });
    if (total >= 3 && autonomiCount / total >= 0.4 && overdue.total === 0) {
      out.push({ level: 'good', text: 'Buona traiettoria: gli argomenti autonomi sono in crescita.' });
    }
    if (out.length === 0) {
      out.push({ level: 'neutral', text: 'Nessun segnale critico oggi. Procedi con il prossimo task.' });
    }
    return out;
  }

  /* ---------- Generatore micro-task ---------- */
  function generateMicroTasksForTopic(examId, moduleId, topicId, topicName, baseDate) {
    baseDate = baseDate || u.todayISO();
    var defs = [
      { type: 'teoria', title: topicName + ' — prima esposizione', durationMin: 25, offset: 0,
        output: 'Ricostruire la definizione e un esempio senza guardare gli appunti.' },
      { type: 'esercizi', title: topicName + ' — esercizi applicativi', durationMin: 25, offset: 1,
        output: 'Risolvere 5 esercizi graduati sull\'argomento.' },
      { type: 'recall', title: topicName + ' — recall senza appunti', durationMin: 15, offset: 2,
        output: 'Spiegare l\'argomento a voce alta in 90 secondi, poi scrivere i 2 errori più probabili.' },
      { type: 'revisione_errori', title: topicName + ' — ripasso distribuito', durationMin: 15, offset: 5,
        output: 'Rivedere gli errori raccolti e rifare gli esercizi sbagliati.' },
      { type: 'simulazione', title: topicName + ' — verifica breve', durationMin: 20, offset: 7,
        output: 'Mini-verifica a tempo su questo argomento, senza materiale di supporto.' }
    ];
    var created = defs.map(function (def) {
      return US.store.addTask({
        examId: examId, moduleId: moduleId, topicId: topicId, microTopicId: null,
        type: def.type, title: def.title, durationMin: def.durationMin, difficulty: 3,
        prerequisites: '', output: def.output, status: 'da_fare',
        dateSuggested: u.addDays(baseDate, def.offset), dateActual: null, notes: ''
      });
    });
    return created;
  }

  /* ---------- Spaced repetition ---------- */
  function nextReviewDateFromGrade(grade, fromDate) {
    fromDate = fromDate || u.todayISO();
    var g = US.RECALL_GRADES.find(function (x) { return x.id === grade; }) || US.RECALL_GRADES[0];
    return u.addDays(fromDate, g.next);
  }

  /* ---------- Readiness esame ---------- */
  function examReadiness(d, examId) {
    var ex = d.exams.find(function (x) { return x.id === examId; });
    if (!ex) return { ready: false, percent: 0, reason: 'Esame non trovato.' };
    var topics = US.store.allTopicsFlat(ex);
    if (!topics.length) return { ready: false, percent: 0, reason: 'Nessun argomento definito.' };
    var goodStates = { autonomo: 1, so_spiegare: 1 };
    var goodCount = topics.filter(function (t) { return goodStates[t.mastery]; }).length;
    var percent = Math.round((goodCount / topics.length) * 100);
    var recentRecall = d.tasks.some(function (t) {
      return t.examId === examId && t.type === 'recall' && t.status === 'completato' &&
        u.daysBetween(t.dateActual || t.dateSuggested, u.todayISO()) <= 10;
    });
    var openErrors = d.errors.filter(function (e) { return e.examId === examId && e.status === 'aperto'; }).length;
    var ready = percent >= 60 && recentRecall && openErrors === 0;
    var reason = ready ? 'La maggior parte degli argomenti è autonoma, con richiami recenti e nessun errore aperto.' :
      (percent < 60 ? 'Meno del 60% degli argomenti è autonomo (' + percent + '%).' :
      (!recentRecall ? 'Mancano richiami (recall) recenti.' : 'Ci sono ' + openErrors + ' errori ancora aperti.'));
    return { ready: ready, percent: percent, reason: reason, openErrors: openErrors };
  }

  /* ---------- Generazione settimana realistica ---------- */
  function generateRealisticWeek(d) {
    var monday = u.startOfWeek(u.addDays(u.todayISO(), 7 - (new Date(u.todayISO()).getDay() === 1 ? 0 : 0)));
    // usa la settimana che inizia col prossimo lunedì se oggi non è lunedì? Per semplicità: settimana corrente da oggi in poi.
    var start = u.todayISO();
    var days = [];
    for (var i = 0; i < 7; i++) days.push(u.addDays(start, i));

    var overdue = overdueReviewTasks(d, u.todayISO());
    var reviewQueue = overdue.tasks.concat(
      overdue.errors.map(function (e) { return { kind: 'error', ref: e, durationMin: 15, title: 'Rivincita errore: ' + u.truncate(e.description, 40) }; }),
      overdue.flashcards.map(function (f) { return { kind: 'flashcard', ref: f, durationMin: 10, title: 'Flashcard: ' + u.truncate(f.question, 40) }; })
    );
    var newQueue = d.tasks.filter(function (t) { return t.status === 'da_fare' && t.type !== 'recall' && t.type !== 'revisione_errori'; });

    var plan = {};
    days.forEach(function (day) {
      var dayKey = u.weekdayKey(day);
      var isTraining = (d.availability.trainingDays || []).indexOf(dayKey) !== -1;
      var avail = d.availability[dayKey] != null ? d.availability[dayKey] : 45;
      var remaining = isTraining ? Math.min(avail, 45) : avail;
      var items = [];
      if (remaining <= 0) { plan[day] = items; return; }

      // Priorità 1: ripassi urgenti (sempre permessi anche in giorno allenamento)
      while (remaining > 0 && reviewQueue.length) {
        var rq = reviewQueue[0];
        var dur = rq.durationMin || 15;
        if (dur > remaining) break;
        items.push({ kind: rq.kind || 'task', ref: rq.ref || rq, durationMin: dur, title: rq.title || (rq.ref && rq.ref.title) });
        remaining -= dur;
        reviewQueue.shift();
      }
      // Priorità 2: nuovi contenuti, solo se non è giorno di allenamento duro o rimane tempo ampio
      if (!isTraining) {
        while (remaining > 0 && newQueue.length) {
          var nt = newQueue[0];
          if (nt.durationMin > remaining) break;
          items.push({ kind: 'task', ref: nt, durationMin: nt.durationMin, title: nt.title });
          remaining -= nt.durationMin;
          newQueue.shift();
        }
      }
      // Priorità 3: momento di review se avanza tempo ed è weekend
      if (remaining >= 15 && (dayKey === 'sat' || dayKey === 'sun')) {
        items.push({ kind: 'review', title: 'Momento di review settimanale', durationMin: 15 });
        remaining -= 15;
      }
      plan[day] = items;
    });
    return { days: days, plan: plan };
  }

  US.planner = {
    activeExams: activeExams, overdueReviewTasks: overdueReviewTasks, todayTasks: todayTasks,
    nextAction: nextAction, suggestTaskForContext: suggestTaskForContext,
    weekStatus: weekStatus, continuityDays: continuityDays, alerts: alerts,
    generateMicroTasksForTopic: generateMicroTasksForTopic,
    nextReviewDateFromGrade: nextReviewDateFromGrade,
    examReadiness: examReadiness, generateRealisticWeek: generateRealisticWeek,
    priorityWeight: priorityWeight
  };
})(window);
