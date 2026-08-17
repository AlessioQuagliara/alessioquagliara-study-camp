/* UniNettuno Study Camp — parser.js
   Parsing euristico locale di un programma d'esame incollato come testo.
   Non è un parser semantico: propone SEMPRE una bozza da rivedere manualmente. */
(function (global) {
  'use strict';
  var US = global.US;

  var MODULE_WORD = /^(modulo|capitolo|unit[aà]|parte|sezione)\s+\d+/i;
  var NUMBERED = /^(\d+(?:\.\d+)*)[.)]?\s+(.+)$/;
  var BULLET = /^[-*•]\s+(.+)$/;

  function parseProgramText(text) {
    var lines = text.split(/\r?\n/).map(function (l) { return l.trim(); }).filter(Boolean);
    var modules = [];
    var currentModule = null;

    function ensureModule(name) {
      currentModule = { name: name, topics: [] };
      modules.push(currentModule);
      return currentModule;
    }

    lines.forEach(function (line) {
      var numMatch = line.match(NUMBERED);
      var bulletMatch = line.match(BULLET);
      var isModuleWord = MODULE_WORD.test(line);
      var isHeadingLike = line.length <= 70 && /^[A-ZÀÈÉÌÒÙ0-9]/.test(line) && (line === line.toUpperCase() || isModuleWord);

      if (isModuleWord) {
        ensureModule(line.replace(/^[-*•]\s+/, ''));
        return;
      }
      if (numMatch) {
        var num = numMatch[1];
        var depth = num.split('.').length;
        var label = numMatch[2];
        if (depth === 1) {
          ensureModule(label);
        } else {
          if (!currentModule) ensureModule('Programma');
          currentModule.topics.push(label);
        }
        return;
      }
      if (bulletMatch) {
        if (!currentModule) ensureModule('Programma');
        currentModule.topics.push(bulletMatch[1]);
        return;
      }
      if (isHeadingLike && line === line.toUpperCase() && line.length > 2) {
        ensureModule(toTitleCase(line));
        return;
      }
      // riga semplice: topic sotto il modulo corrente
      if (!currentModule) ensureModule('Programma');
      currentModule.topics.push(line);
    });

    // rimuove moduli vuoti anomali
    modules = modules.filter(function (m) { return m.name; });
    return { modules: modules, lineCount: lines.length };
  }

  function toTitleCase(s) {
    return s.toLowerCase().replace(/(^|\s)\S/g, function (c) { return c.toUpperCase(); });
  }

  US.parser = { parseProgramText: parseProgramText };
})(window);
