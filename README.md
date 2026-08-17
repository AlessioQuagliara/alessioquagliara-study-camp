# UniNettuno Study Camp

Dashboard di studio personale per uno studente lavoratore di Ingegneria Informatica / Sistemi Intelligenti (Università Telematica Internazionale UniNettuno).

**Pianifica. Studia attivamente. Recupera. Passa l'esame.**

Principio guida: *non conta aver guardato una lezione, conta saper richiamare, spiegare e applicare il contenuto.* L'app non misura ore di studio: misura esercizi risolti, richiami (recall) superati, errori corretti e simulazioni svolte.

## Cos'è

Una web app **statica**, pensata per chi lavora circa 8:00–17:00, si allena con costanza e non può seguire routine irrealistiche da 8–10 ore al giorno. Trasforma un programma d'esame, videolezioni, slide ed esercizi in micro-obiettivi da 10–90 minuti, ripassi distribuiti nel tempo, un error log e simulazioni d'esame — con una pianificazione settimanale realistica.

Sezioni: Dashboard, Esami, Sessione studio, Ripassi, Error log, Simulazioni, Materiali, Statistiche, Impostazioni/Backup.

## Installazione locale

Non serve alcuna build. Due opzioni:

1. **Apertura diretta**: apri `index.html` con doppio click / dal browser (funziona anche via `file://`).
2. **Server locale** (consigliato per test più fedeli a GitHub Pages):
   ```bash
   npx serve .
   # oppure
   python -m http.server 8080
   ```
   poi apri `http://localhost:8080`.

## Pubblicazione su GitHub Pages

1. Fai push del repository su GitHub.
2. Settings → Pages → Source: branch `main`, cartella `/ (root)`.
3. L'app sarà disponibile su `https://<utente>.github.io/<repo>/`.

Nessun backend, nessuna build, nessuna variabile d'ambiente da configurare.

## Struttura file

```
index.html                  Shell dell'app: sidebar, bottom nav, contenitori modali/toast
assets/css/style.css         Tema dark tecnico, layout responsive, componenti UI
assets/js/utils.js           Date, id, formattazione, costanti di dominio (tipi task, stati, ecc.)
assets/js/store.js           Persistenza localStorage, CRUD, export/import, backup, dati demo
assets/js/planner.js         Prossima azione, alert, generatore micro-task, spaced repetition,
                              readiness esame, generatore settimana realistica
assets/js/parser.js          Parsing euristico locale del programma d'esame incollato
assets/js/charts.js          Grafici SVG (barre, sparkline, donut) senza dipendenze
assets/js/ui.js              Toast, modali accessibili, conferme, doppia conferma testuale
assets/js/router.js          Router hash-based
assets/js/app.js             Bootstrap: carica dati, registra le viste, avvia il router
assets/js/views/*.js         Una vista per sezione (dashboard, esami, sessione, ripassi,
                              errori, simulazioni, materiali, statistiche, impostazioni)
```

Nessun framework, nessun bundler, nessuna dipendenza CDN: solo HTML/CSS/JS vanilla caricati come script separati.

## Dati locali (localStorage)

Tutti i dati (esami, moduli/argomenti, task, materiali, flashcard, errori, simulazioni, sessioni, check-in, disponibilità settimanale, review) sono salvati in `localStorage` sotto la chiave `unisc_data_v1`, con un campo `schemaVersion` per future migrazioni. Prima di ogni salvataggio viene scritta una copia di backup (`unisc_backup_v1`), ripristinabile da Impostazioni.

**I dati restano nel browser in cui li inserisci.** GitHub Pages non riceve né conserva i tuoi progressi.

## Export / Import

- **Esporta dati**: da Impostazioni, scarica un file JSON con l'intero stato dell'app (utile prima di aggiornare l'app, cambiare browser o dispositivo).
- **Importa dati**: carica un file JSON precedentemente esportato. Viene mostrata un'anteprima (numero di esami, task, materiali, ecc.) prima di sovrascrivere i dati correnti.
- **Ripristina dati demo**: sostituisce i dati correnti con un set di esempio.
- **Cancella tutti i dati locali**: richiede doppia conferma testuale (si deve scrivere "ELIMINA"), azione irreversibile.

## Limiti di privacy e funzionali (deliberati)

- **Nessun login UniNettuno**: l'app non si collega, non effettua scraping né automazioni verso il portale UniNettuno. Titoli, link e programmi vanno inseriti manualmente dall'utente.
- **Nessuno scraping** di contenuti protetti da credenziali.
- **Nessuna sincronizzazione multi-dispositivo senza backend**: per portare i dati su un altro dispositivo/browser si usa Esporta/Importa JSON.
- **Nessuna IA generativa integrata**: il parsing del programma d'esame è euristico (riconosce numerazioni, elenchi, parole come "Modulo N") e propone sempre una bozza da rivedere manualmente — non è garantito "capire" il documento.
- **File caricati localmente** (PDF, ecc.) sono referenziabili solo nella sessione corrente del browser tramite URL temporanei: non vengono conservati in modo affidabile tra refresh, sessioni o dispositivi. Per persistenza, usare link pubblici o l'export/import JSON.

## Changelog

### v1.0.0 — 2026-08-17
Prima versione: dashboard adattiva (prossima azione, check-in energia/tempo, alert), gestione esami con gerarchia moduli → argomenti → micro-argomenti → task e stati di padronanza, wizard di import programma con parsing euristico, motore di micro-obiettivi, session runner con timer pomodoro flessibile e modalità focus, motore di ripassi distribuiti con flashcard, error log con mini-esercizi di rivincita, simulazioni scritte/orali/coding con valutazione e generazione automatica di task di correzione e re-test, libreria materiali, statistiche con grafici SVG, generatore di settimana realistica basato su disponibilità e giorni di allenamento, review settimanale guidata, backup/export/import JSON.
