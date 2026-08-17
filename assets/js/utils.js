/* UniNettuno Study Camp — utils.js
   Funzioni pure: date, id, formattazione, costanti condivise. */
(function (global) {
  'use strict';

  var US = global.US = global.US || {};

  /* ---------- ID ---------- */
  function uid(prefix) {
    return (prefix || 'id') + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  /* ---------- Date ---------- */
  function todayISO() {
    return dateToISO(new Date());
  }
  function dateToISO(d) {
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
  }
  function addDays(iso, n) {
    var d = new Date(iso + 'T00:00:00');
    d.setDate(d.getDate() + n);
    return dateToISO(d);
  }
  function daysBetween(isoA, isoB) {
    var a = new Date(isoA + 'T00:00:00');
    var b = new Date(isoB + 'T00:00:00');
    return Math.round((b - a) / 86400000);
  }
  function isPast(iso) {
    return iso < todayISO();
  }
  function isToday(iso) {
    return iso === todayISO();
  }
  var GIORNI_IT = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
  var GIORNI_BREVI = ['dom', 'lun', 'mar', 'mer', 'gio', 'ven', 'sab'];
  var MESI_IT = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
  function weekdayKey(iso) {
    var keys = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    var d = new Date(iso + 'T00:00:00');
    return keys[d.getDay()];
  }
  function formatDateIt(iso, opts) {
    if (!iso) return '';
    var d = new Date(iso + 'T00:00:00');
    var giorno = GIORNI_IT[d.getDay()];
    var s = d.getDate() + ' ' + MESI_IT[d.getMonth()] + ' ' + d.getFullYear();
    if (opts && opts.weekday) s = giorno + ' ' + s;
    return s;
  }
  function formatDateShort(iso) {
    if (!iso) return '';
    var d = new Date(iso + 'T00:00:00');
    return String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0');
  }
  function startOfWeek(iso) {
    var d = new Date(iso + 'T00:00:00');
    var day = d.getDay(); // 0 dom - 6 sab
    var diff = (day === 0 ? -6 : 1 - day); // lunedì come inizio settimana
    d.setDate(d.getDate() + diff);
    return dateToISO(d);
  }
  function weekDates(mondayIso) {
    var out = [];
    for (var i = 0; i < 7; i++) out.push(addDays(mondayIso, i));
    return out;
  }
  function formatMinutes(min) {
    if (min == null) return '';
    if (min < 60) return min + ' min';
    var h = Math.floor(min / 60);
    var m = min % 60;
    return h + 'h' + (m ? ' ' + m + 'min' : '');
  }
  function nowISOTime() {
    return new Date().toISOString();
  }

  /* ---------- Testo ---------- */
  function escapeHTML(s) {
    if (s == null) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
  function truncate(s, n) {
    if (!s) return '';
    return s.length > n ? s.slice(0, n - 1) + '…' : s;
  }
  function clamp(n, min, max) {
    return Math.min(max, Math.max(min, n));
  }
  function el(html) {
    var t = document.createElement('template');
    t.innerHTML = html.trim();
    return t.content.firstElementChild;
  }
  function qs(sel, root) { return (root || document).querySelector(sel); }
  function qsa(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  /* ---------- Costanti di dominio ---------- */
  US.MASTERY_LEVELS = [
    { id: 'mai_visto', label: 'Mai visto', weight: 0 },
    { id: 'esposizione_iniziale', label: 'Esposizione iniziale', weight: 1 },
    { id: 'capisco_con_appunti', label: 'Capisco con appunti', weight: 2 },
    { id: 'risolvo_con_aiuto', label: 'Risolvo con aiuto', weight: 3 },
    { id: 'autonomo', label: 'Autonomo', weight: 4 },
    { id: 'so_spiegare', label: 'So spiegare', weight: 5 },
    { id: 'da_ripassare', label: 'Da ripassare', weight: 2 }
  ];
  US.TASK_TYPES = [
    { id: 'videolezione', label: 'Videolezione', icon: '▶' },
    { id: 'lettura', label: 'Lettura/dispensa', icon: '📖' },
    { id: 'teoria', label: 'Teoria', icon: '🧠' },
    { id: 'esercizi', label: 'Esercizi', icon: '✏️' },
    { id: 'coding', label: 'Coding', icon: '💻' },
    { id: 'recall', label: 'Recall', icon: '🔁' },
    { id: 'flashcard', label: 'Flashcard', icon: '🗂' },
    { id: 'revisione_errori', label: 'Revisione errori', icon: '⚠' },
    { id: 'simulazione', label: 'Simulazione', icon: '🎯' }
  ];
  US.DURATIONS = [10, 15, 25, 45, 60, 90];
  US.EXAM_TYPES = [
    { id: 'scritto', label: 'Scritto' },
    { id: 'orale', label: 'Orale' },
    { id: 'scritto_orale', label: 'Scritto + orale' },
    { id: 'progetto', label: 'Progetto' }
  ];
  US.PRIORITIES = [
    { id: 'alta', label: 'Alta' },
    { id: 'media', label: 'Media' },
    { id: 'bassa', label: 'Bassa' }
  ];
  US.EXAM_STATUSES = [
    { id: 'non_iniziato', label: 'Non iniziato' },
    { id: 'in_corso', label: 'In corso' },
    { id: 'pronto_simulazione', label: 'Pronto per simulazione' },
    { id: 'sostenuto', label: 'Sostenuto' }
  ];
  US.TASK_STATUSES = [
    { id: 'da_fare', label: 'Da fare' },
    { id: 'in_corso', label: 'In corso' },
    { id: 'completato', label: 'Completato' },
    { id: 'saltato', label: 'Saltato' },
    { id: 'ripianificato', label: 'Ripianificato' }
  ];
  US.MATERIAL_CATEGORIES = [
    { id: 'videolezione', label: 'Videolezione' },
    { id: 'slide', label: 'Slide' },
    { id: 'pdf', label: 'PDF/dispensa' },
    { id: 'libro', label: 'Libro' },
    { id: 'eserciziario', label: 'Eserciziario' },
    { id: 'prova_esame', label: 'Prova d\'esame' },
    { id: 'codice', label: 'Codice/repository' },
    { id: 'link', label: 'Link esterno' }
  ];
  US.ERROR_TYPES = [
    { id: 'concetto', label: 'Concetto' },
    { id: 'formula', label: 'Formula' },
    { id: 'procedura', label: 'Procedura' },
    { id: 'calcolo', label: 'Algebra/calcolo' },
    { id: 'traccia', label: 'Interpretazione traccia' },
    { id: 'distrazione', label: 'Distrazione' },
    { id: 'codice', label: 'Codice/debug' },
    { id: 'tempo', label: 'Gestione tempo' },
    { id: 'orale', label: 'Orale/esposizione' }
  ];
  US.ERROR_STATUSES = [
    { id: 'aperto', label: 'Aperto' },
    { id: 'in_revisione', label: 'In revisione' },
    { id: 'risolto', label: 'Risolto' }
  ];
  US.SIM_TYPES = [
    { id: 'mini', label: 'Mini-simulazione (15-30 min)' },
    { id: 'scritta', label: 'Simulazione scritta (45-120 min)' },
    { id: 'orale', label: 'Simulazione orale' },
    { id: 'coding', label: 'Prova coding' }
  ];
  US.RECALL_GRADES = [
    { id: 0, label: 'Non ricordo', next: 1 },
    { id: 1, label: 'Ricordo con aiuto', next: 2 },
    { id: 2, label: 'Autonomo', next: 6 },
    { id: 3, label: 'So spiegare e applicare', next: 14 }
  ];

  US.utils = {
    uid: uid, todayISO: todayISO, dateToISO: dateToISO, addDays: addDays,
    daysBetween: daysBetween, isPast: isPast, isToday: isToday,
    formatDateIt: formatDateIt, formatDateShort: formatDateShort,
    startOfWeek: startOfWeek, weekDates: weekDates, weekdayKey: weekdayKey,
    formatMinutes: formatMinutes, nowISOTime: nowISOTime,
    escapeHTML: escapeHTML, truncate: truncate, clamp: clamp,
    el: el, qs: qs, qsa: qsa,
    GIORNI_IT: GIORNI_IT, GIORNI_BREVI: GIORNI_BREVI
  };
})(window);
