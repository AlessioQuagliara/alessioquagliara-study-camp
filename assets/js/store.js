/* UniNettuno Study Camp — store.js
   Persistenza locale (localStorage), CRUD, export/import, backup, dati demo. */
(function (global) {
  'use strict';
  var US = global.US;
  var u = US.utils;

  var KEY = 'unisc_data_v1';
  var BACKUP_KEY = 'unisc_backup_v1';
  var SCHEMA_VERSION = 1;

  function defaultData() {
    return {
      schemaVersion: SCHEMA_VERSION,
      exams: [],
      tasks: [],
      materials: [],
      flashcards: [],
      errors: [],
      simulations: [],
      sessions: [],
      checkins: [],
      availability: { mon: 45, tue: 45, wed: 45, thu: 45, fri: 45, sat: 90, sun: 60, trainingDays: [] },
      weeklyPlans: [],
      weeklyReviews: [],
      settings: { reduceMotion: 'auto' },
      meta: { createdAt: u.nowISOTime(), lastBackupAt: null }
    };
  }

  var _data = null;

  function migrate(data) {
    if (!data.schemaVersion) data.schemaVersion = 1;
    // Placeholder per future migrazioni incrementali.
    var defaults = defaultData();
    Object.keys(defaults).forEach(function (k) {
      if (data[k] === undefined) data[k] = defaults[k];
    });
    if (!data.availability) data.availability = defaults.availability;
    if (!data.availability.trainingDays) data.availability.trainingDays = [];
    return data;
  }

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) {
        _data = defaultData();
        save();
        return _data;
      }
      var parsed = JSON.parse(raw);
      _data = migrate(parsed);
      return _data;
    } catch (e) {
      console.warn('Impossibile leggere i dati locali, ripristino stato vuoto.', e);
      _data = defaultData();
      return _data;
    }
  }

  function backupBeforeSave() {
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) {
        localStorage.setItem(BACKUP_KEY, raw);
      }
    } catch (e) { /* storage pieno: ignora backup silenziosamente */ }
  }

  function save() {
    if (!_data) return;
    backupBeforeSave();
    try {
      localStorage.setItem(KEY, JSON.stringify(_data));
    } catch (e) {
      console.error('Salvataggio fallito (storage pieno o non disponibile).', e);
      throw e;
    }
    document.dispatchEvent(new CustomEvent('unisc:datachange'));
  }

  function getData() {
    if (!_data) load();
    return _data;
  }

  function restoreBackup() {
    var raw = localStorage.getItem(BACKUP_KEY);
    if (!raw) return false;
    try {
      var parsed = JSON.parse(raw);
      _data = migrate(parsed);
      save();
      return true;
    } catch (e) { return false; }
  }

  function wipeAll() {
    localStorage.removeItem(KEY);
    localStorage.removeItem(BACKUP_KEY);
    _data = defaultData();
    save();
  }

  function exportJSON() {
    var payload = JSON.stringify(_data, null, 2);
    var blob = new Blob([payload], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    var stamp = u.todayISO();
    a.href = url;
    a.download = 'uninettuno-study-camp-backup-' + stamp + '.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
  }

  function validateImport(obj) {
    var errs = [];
    if (!obj || typeof obj !== 'object') errs.push('Il file non contiene un oggetto JSON valido.');
    else {
      if (obj.schemaVersion == null) errs.push('Manca il campo schemaVersion.');
      ['exams', 'tasks', 'materials', 'flashcards', 'errors', 'simulations', 'sessions'].forEach(function (k) {
        if (obj[k] !== undefined && !Array.isArray(obj[k])) errs.push('Il campo "' + k + '" dovrebbe essere una lista.');
      });
    }
    return { valid: errs.length === 0, errors: errs };
  }

  function importJSON(obj) {
    var check = validateImport(obj);
    if (!check.valid) return check;
    _data = migrate(obj);
    save();
    return { valid: true, errors: [] };
  }

  /* ---------- CRUD generico ---------- */
  function genAdd(collection, obj) {
    var d = getData();
    obj.id = obj.id || u.uid(collection.slice(0, 3));
    obj.createdAt = obj.createdAt || u.nowISOTime();
    d[collection].push(obj);
    save();
    return obj;
  }
  function genUpdate(collection, id, patch) {
    var d = getData();
    var item = d[collection].find(function (x) { return x.id === id; });
    if (!item) return null;
    Object.assign(item, patch);
    item.updatedAt = u.nowISOTime();
    save();
    return item;
  }
  function genDelete(collection, id) {
    var d = getData();
    d[collection] = d[collection].filter(function (x) { return x.id !== id; });
    save();
  }
  function genGet(collection, id) {
    return getData()[collection].find(function (x) { return x.id === id; }) || null;
  }

  /* ---------- Esami e gerarchia ---------- */
  function addExam(exam) {
    exam.modules = exam.modules || [];
    exam.status = exam.status || 'non_iniziato';
    exam.priority = exam.priority || 'media';
    return genAdd('exams', exam);
  }
  function updateExam(id, patch) { return genUpdate('exams', id, patch); }
  function deleteExam(id) {
    var d = getData();
    d.exams = d.exams.filter(function (x) { return x.id !== id; });
    d.tasks = d.tasks.filter(function (t) { return t.examId !== id; });
    d.materials = d.materials.filter(function (m) { return m.examId !== id; });
    d.flashcards = d.flashcards.filter(function (f) { return f.examId !== id; });
    d.errors = d.errors.filter(function (e) { return e.examId !== id; });
    d.simulations = d.simulations.filter(function (s) { return s.examId !== id; });
    save();
  }
  function getExam(id) { return genGet('exams', id); }

  function addModule(examId, name) {
    var ex = getExam(examId);
    if (!ex) return null;
    var mod = { id: u.uid('mod'), name: name, topics: [] };
    ex.modules.push(mod);
    save();
    return mod;
  }
  function addTopic(examId, moduleId, name) {
    var ex = getExam(examId);
    if (!ex) return null;
    var mod = ex.modules.find(function (m) { return m.id === moduleId; });
    if (!mod) return null;
    var topic = { id: u.uid('top'), name: name, mastery: 'mai_visto', microTopics: [] };
    mod.topics.push(topic);
    save();
    return topic;
  }
  function addMicroTopic(examId, moduleId, topicId, name) {
    var ex = getExam(examId);
    if (!ex) return null;
    var mod = ex.modules.find(function (m) { return m.id === moduleId; });
    var topic = mod && mod.topics.find(function (t) { return t.id === topicId; });
    if (!topic) return null;
    var mt = { id: u.uid('mt'), name: name, mastery: 'mai_visto' };
    topic.microTopics.push(mt);
    save();
    return mt;
  }
  function setTopicMastery(examId, moduleId, topicId, mastery) {
    var ex = getExam(examId);
    var mod = ex && ex.modules.find(function (m) { return m.id === moduleId; });
    var topic = mod && mod.topics.find(function (t) { return t.id === topicId; });
    if (!topic) return;
    topic.mastery = mastery;
    topic.masteryUpdatedAt = u.nowISOTime();
    save();
  }
  function setMicroTopicMastery(examId, moduleId, topicId, microId, mastery) {
    var ex = getExam(examId);
    var mod = ex && ex.modules.find(function (m) { return m.id === moduleId; });
    var topic = mod && mod.topics.find(function (t) { return t.id === topicId; });
    var mt = topic && topic.microTopics.find(function (x) { return x.id === microId; });
    if (!mt) return;
    mt.mastery = mastery;
    mt.masteryUpdatedAt = u.nowISOTime();
    save();
  }
  function deleteModule(examId, moduleId) {
    var ex = getExam(examId);
    if (!ex) return;
    ex.modules = ex.modules.filter(function (m) { return m.id !== moduleId; });
    save();
  }
  function deleteTopic(examId, moduleId, topicId) {
    var ex = getExam(examId);
    var mod = ex && ex.modules.find(function (m) { return m.id === moduleId; });
    if (!mod) return;
    mod.topics = mod.topics.filter(function (t) { return t.id !== topicId; });
    save();
  }
  function deleteMicroTopic(examId, moduleId, topicId, microId) {
    var ex = getExam(examId);
    var mod = ex && ex.modules.find(function (m) { return m.id === moduleId; });
    var topic = mod && mod.topics.find(function (t) { return t.id === topicId; });
    if (!topic) return;
    topic.microTopics = topic.microTopics.filter(function (x) { return x.id !== microId; });
    save();
  }

  function allTopicsFlat(exam) {
    var out = [];
    (exam.modules || []).forEach(function (mod) {
      (mod.topics || []).forEach(function (topic) {
        out.push({ moduleId: mod.id, moduleName: mod.name, topicId: topic.id, topicName: topic.name, mastery: topic.mastery, masteryUpdatedAt: topic.masteryUpdatedAt, microTopics: topic.microTopics || [] });
      });
    });
    return out;
  }

  /* ---------- Task ---------- */
  function addTask(task) {
    task.status = task.status || 'da_fare';
    task.dateSuggested = task.dateSuggested || u.todayISO();
    return genAdd('tasks', task);
  }
  function updateTask(id, patch) { return genUpdate('tasks', id, patch); }
  function deleteTask(id) { genDelete('tasks', id); }
  function getTask(id) { return genGet('tasks', id); }

  /* ---------- Materiali ---------- */
  function addMaterial(mat) { return genAdd('materials', mat); }
  function updateMaterial(id, patch) { return genUpdate('materials', id, patch); }
  function deleteMaterial(id) { genDelete('materials', id); }

  /* ---------- Flashcard ---------- */
  function addFlashcard(fc) {
    fc.nextReview = fc.nextReview || u.todayISO();
    fc.history = fc.history || [];
    return genAdd('flashcards', fc);
  }
  function updateFlashcard(id, patch) { return genUpdate('flashcards', id, patch); }
  function deleteFlashcard(id) { genDelete('flashcards', id); }

  /* ---------- Errori ---------- */
  function addError(err) {
    err.status = err.status || 'aperto';
    return genAdd('errors', err);
  }
  function updateError(id, patch) { return genUpdate('errors', id, patch); }
  function deleteError(id) { genDelete('errors', id); }

  /* ---------- Simulazioni ---------- */
  function addSimulation(sim) {
    sim.status = sim.status || 'pianificata';
    return genAdd('simulations', sim);
  }
  function updateSimulation(id, patch) { return genUpdate('simulations', id, patch); }
  function deleteSimulation(id) { genDelete('simulations', id); }

  /* ---------- Sessioni ---------- */
  function addSession(session) { return genAdd('sessions', session); }
  function updateSession(id, patch) { return genUpdate('sessions', id, patch); }

  /* ---------- Check-in ---------- */
  function addCheckin(checkin) {
    checkin.date = checkin.date || u.todayISO();
    var d = getData();
    d.checkins.push(checkin);
    save();
    return checkin;
  }

  /* ---------- Dati demo ---------- */
  function loadDemoData() {
    var d = defaultData();
    var today = u.todayISO();
    var examId = u.uid('exam');
    var mod1 = { id: u.uid('mod'), name: 'Analisi Matematica', topics: [] };
    var top1 = { id: u.uid('top'), name: 'Limiti e forme indeterminate', mastery: 'capisco_con_appunti', microTopics: [
      { id: u.uid('mt'), name: 'Limite notevole sin(x)/x', mastery: 'risolvo_con_aiuto' },
      { id: u.uid('mt'), name: 'Forme 0/0 e infinito/infinito', mastery: 'esposizione_iniziale' }
    ] };
    var top2 = { id: u.uid('top'), name: 'Derivate e regola della catena', mastery: 'mai_visto', microTopics: [
      { id: u.uid('mt'), name: 'Derivate di funzioni composte', mastery: 'mai_visto' }
    ] };
    mod1.topics.push(top1, top2);
    var mod2 = { id: u.uid('mod'), name: 'Algoritmi e strutture dati', topics: [] };
    var top3 = { id: u.uid('top'), name: 'Alberi binari di ricerca', mastery: 'autonomo', microTopics: [
      { id: u.uid('mt'), name: 'Inserimento e cancellazione', mastery: 'autonomo' }
    ] };
    mod2.topics.push(top3);

    d.exams.push({
      id: examId, name: 'Analisi Matematica 1', course: 'Analisi Matematica 1', teacher: 'Prof. Rossi',
      type: 'scritto_orale', cfu: 9, examDate: u.addDays(today, 21), priority: 'alta', status: 'in_corso',
      targetGrade: 27, weeklyHours: 6, notes: 'Concentrarsi su limiti e derivate prima dello scritto.',
      modules: [mod1, mod2], createdAt: u.nowISOTime()
    });

    var examId2 = u.uid('exam');
    d.exams.push({
      id: examId2, name: 'Sistemi Intelligenti', course: 'Sistemi Intelligenti', teacher: 'Prof.ssa Bianchi',
      type: 'progetto', cfu: 6, examDate: null, priority: 'media', status: 'non_iniziato',
      targetGrade: null, weeklyHours: 3, notes: '', modules: [], createdAt: u.nowISOTime()
    });

    d.tasks.push(
      { id: u.uid('tsk'), examId: examId, moduleId: mod1.id, topicId: top1.id, microTopicId: null,
        type: 'esercizi', title: 'Limiti notevoli — 5 esercizi graduati', durationMin: 25, difficulty: 3,
        prerequisites: '', output: 'Risolvere 5 esercizi su sin(x)/x senza errori di segno', status: 'da_fare',
        dateSuggested: today, dateActual: null, notes: '', createdAt: u.nowISOTime() },
      { id: u.uid('tsk'), examId: examId, moduleId: mod1.id, topicId: top1.id, microTopicId: null,
        type: 'recall', title: 'Recall — forme indeterminate senza appunti', durationMin: 15, difficulty: 2,
        prerequisites: '', output: 'Spiegare a voce le 3 tecniche principali', status: 'da_fare',
        dateSuggested: today, dateActual: null, notes: '', createdAt: u.nowISOTime() },
      { id: u.uid('tsk'), examId: examId, moduleId: mod1.id, topicId: top2.id, microTopicId: null,
        type: 'videolezione', title: 'Videolezione — Derivate: regola della catena', durationMin: 90, difficulty: 3,
        prerequisites: 'Limiti', output: 'Note personali + 2 esempi ricostruiti a memoria', status: 'da_fare',
        dateSuggested: u.addDays(today, 1), dateActual: null, notes: '', createdAt: u.nowISOTime() }
    );

    d.errors.push({
      id: u.uid('err'), examId: examId, topicId: top1.id, type: 'calcolo',
      description: 'Inverto il segno quando porto un termine dall\'altro lato dell\'equazione.',
      cause: 'Automatismo non controllato, scrittura troppo veloce.',
      correction: 'Scrivi ogni passaggio; verifica per sostituzione finale.',
      retryExercise: '5 equazioni brevi senza calcolatrice.',
      priority: 'alta', status: 'aperto', nextReview: today, createdAt: u.nowISOTime()
    });

    d.flashcards.push({
      id: u.uid('fc'), examId: examId, topicId: top1.id,
      question: 'Quanto vale il limite di sin(x)/x per x che tende a 0?',
      answer: '1 (limite notevole).', tag: 'limiti', difficulty: 2,
      nextReview: today, history: [], createdAt: u.nowISOTime()
    });

    d.materials.push({
      id: u.uid('mat'), category: 'videolezione', title: 'Lezione 4 — Derivate e regola della catena',
      link: '', examId: examId, topicIds: [top2.id], priority: 'alta', status: 'da_vedere',
      notes: '', lessonNumber: 4, durationMin: 60, watchState: 'da_vedere', timestampNote: '', createdAt: u.nowISOTime()
    });

    d.availability = { mon: 45, tue: 45, wed: 25, thu: 45, fri: 45, sat: 90, sun: 60, trainingDays: ['tue', 'thu'] };
    _data = d;
    save();
  }

  US.store = {
    KEY: KEY, SCHEMA_VERSION: SCHEMA_VERSION,
    load: load, save: save, getData: getData,
    exportJSON: exportJSON, importJSON: importJSON, validateImport: validateImport,
    restoreBackup: restoreBackup, wipeAll: wipeAll, loadDemoData: loadDemoData,
    addExam: addExam, updateExam: updateExam, deleteExam: deleteExam, getExam: getExam,
    addModule: addModule, addTopic: addTopic, addMicroTopic: addMicroTopic,
    setTopicMastery: setTopicMastery, setMicroTopicMastery: setMicroTopicMastery,
    deleteModule: deleteModule, deleteTopic: deleteTopic, deleteMicroTopic: deleteMicroTopic,
    allTopicsFlat: allTopicsFlat,
    addTask: addTask, updateTask: updateTask, deleteTask: deleteTask, getTask: getTask,
    addMaterial: addMaterial, updateMaterial: updateMaterial, deleteMaterial: deleteMaterial,
    addFlashcard: addFlashcard, updateFlashcard: updateFlashcard, deleteFlashcard: deleteFlashcard,
    addError: addError, updateError: updateError, deleteError: deleteError,
    addSimulation: addSimulation, updateSimulation: updateSimulation, deleteSimulation: deleteSimulation,
    addSession: addSession, updateSession: updateSession,
    addCheckin: addCheckin
  };
})(window);
