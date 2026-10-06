/* FireOps VVF - modulo Comunicazioni
 * Missioni per soccorso e mancate timbrature via email.
 * Si registra con FireOps.registra({id, css, html, init}); vedi app/js/fireops-app.js.
 *
 * Dati comando: usa FireOps.comandi() (db/comandi.json, già nel formato corto).
 * Le direzioni regionali non sono ancora in un file dati condiviso: restano qui
 * sotto DIREZIONI, da spostare in db/direzioni.json quando esisterà.
 *
 * Revisione mobile del wizard: campi a 16px (niente zoom su iOS), righe a colonna sotto i 520px,
 * barra Indietro/Avanti fissa in basso, avvisi nel punto in cui si guarda (non più alert()),
 * tasto Indietro del telefono che torna al passo precedente, copia e condividi il testo.
 */
(function () {
  "use strict";

  // Personale del turno B: "Cognome Nome" e qualifica (senza patenti). Da spostare in db/ quando ci sarà un file condiviso.
  const TURNO_B = [
    ["ANGELONE LEONARDO", "VP"],
    ["ANTONIOLI MARCO", "CS"],
    ["ARFELLI STEFANO", "CRE"],
    ["BALDACCI ANDREA", "VE"],
    ["BALZANI ANDREA", "CS"],
    ["BARDI ALFIERO", "CS"],
    ["BATTISTINI CHRISTIAN", "CS"],
    ["BAZZOCCHI MASSIMO", "CR"],
    ["BERTOZZI CLAUDIO", "VC"],
    ["BONETTI MASSIMILIANO", "CS"],
    ["CANDUCCI DENIS", "VC"],
    ["CAPACCI LUCA", "VE"],
    ["CASTAGNOLI MARCO", "VC"],
    ["CASTROGIOVANNI ANDRE", "VE"],
    ["CECCARONI STEFANO", "VC"],
    ["D'ATTARDI GIOVANNI", "VP"],
    ["DALLA BELLA MARCO", "VE"],
    ["DE LORENZI ENRICO", "VE"],
    ["DE VITO ISRAEL", "CS"],
    ["DI CANDIA MICHELE", "VE"],
    ["DI CAPRIO GIOVANNI", "VPE"],
    ["DI NICOLA MASSIMO", "VPC"],
    ["DOGANA MARCO", "VC"],
    ["FORTE GIANNI", "VF"],
    ["GHETTI GABRIELE", "VC"],
    ["GIARDINI LUCA", "CSE"],
    ["GIULIANINI MAURO", "VC"],
    ["GIUNCHI CLAUDIO", "VE"],
    ["GORI FABIO", "VE"],
    ["GRAZIANI CRISTIAN", "VC"],
    ["GUIDI MARCO", "CSE"],
    ["LA ROCCA VINCENZO", "VP"],
    ["LEONI VINCENZO", "CSE"],
    ["LIPPOLIS NICOLA", "VF"],
    ["MANUZZI GIANLUCA", "CR"],
    ["MANUZZI MICHELE", "VP"],
    ["MARALDI MAURO", "CS"],
    ["MARGHERITA MARCO", "VC"],
    ["MARIANI MASSIMO", "VP"],
    ["MARINO ANTONIO", "VE"],
    ["MONCASTELLI ROBERTO", "CRE"],
    ["MONTI DANILO", "VPC"],
    ["MONTINI LORENZO", "VE"],
    ["MORRI MAURO", "VF"],
    ["OLIVUCCI ROBERT", "VE"],
    ["PASSERI MIRKO", "VP"],
    ["PELIZZA ANDREA", "VE"],
    ["PENTOLI LUCA", "VE"],
    ["PENTOLI MASSIMILIANO", "CSE"],
    ["POLVERELLI IVAN", "VP"],
    ["RIDOLFO DORIANO", "VP"],
    ["RUFFILLI MASSIMILIANO", "CS"],
    ["RUGGIERO FRANCESCO", "VE"],
    ["SARDI SAMUELE", "VP"],
    ["SPADAFINA FRANCESCO", "VP"],
    ["TASSINARI PAOLO", "VC"],
    ["TEDALDI NICOLA", "VC"],
    ["VANDI CLAUDIO", "CSE"],
    ["VANIGLINI ALAN", "CS"],
    ["VITALI GIUSEPPE", "CSE"],
    ["ZANELLI FABIO", "VPC"],
    ["ZOFFOLI NICOLO'", "VF"]
  ];
  // "DE LORENZI ENRICO" -> "De Lorenzi Enrico (VE)"; "NICOLO'" -> "Nicolò"
  const nominativo = (nome, qual) => nome.replace(/\s+/g, " ").trim().toLowerCase()
    .replace(/(^|[ '])([a-zàèéìòù])/g, (m, a, b) => a + b.toUpperCase()).replace(/o'$/, "ò") + " (" + qual + ")";
  const PERSONALE = TURNO_B.map(([n, q]) => nominativo(n, q));
  const MOTIVI_TIMBRATURA = {dimenticanza: "Dimenticanza", senzabadge: "Senza badge"};

  const TIPOLOGIE = [
    "Incendio fabbricato", "Incendio boschivo / vegetazione", "Incendio veicolo",
    "Incidente stradale", "Dissesto statico", "Soccorso a persona",
    "Ascensore bloccato con persona", "Apertura porta", "Recupero animale",
    "Perdita gas", "Dispersione liquidi pericolosi", "Allagamento", "Danni d'acqua",
    "Rimozione neve / ghiaccio", "Bonifica ordigno bellico",
    "Esercitazione / servizio di vigilanza", "Altro (specificare in località)"
  ];

  // Direzioni regionali: indirizzo generale (dir.xxx@vigilfuoco.it). Valle d'Aosta non ne ha uno pubblicato.
  const DIREZIONI = [
    {c: "Direzione Regionale Abruzzo", rg: "Abruzzo", email: "dir.abruzzo@vigilfuoco.it"},
    {c: "Direzione Regionale Basilicata", rg: "Basilicata", email: "dir.basilicata@vigilfuoco.it"},
    {c: "Direzione Regionale Calabria", rg: "Calabria", email: "dir.calabria@vigilfuoco.it"},
    {c: "Direzione Regionale Campania", rg: "Campania", email: "dir.campania@vigilfuoco.it"},
    {c: "Direzione Regionale Emilia-Romagna", rg: "Emilia-Romagna", email: "dir.emiliaromagna@vigilfuoco.it"},
    {c: "Direzione Regionale Friuli Venezia Giulia", rg: "Friuli Venezia Giulia", email: "dir.friuliveneziagiulia@vigilfuoco.it"},
    {c: "Direzione Regionale Lazio", rg: "Lazio", email: "dir.lazio@vigilfuoco.it"},
    {c: "Direzione Regionale Liguria", rg: "Liguria", email: "dir.liguria@vigilfuoco.it"},
    {c: "Direzione Regionale Lombardia", rg: "Lombardia", email: "dir.lombardia@vigilfuoco.it"},
    {c: "Direzione Regionale Marche", rg: "Marche", email: "dir.marche@vigilfuoco.it"},
    {c: "Direzione Regionale Molise", rg: "Molise", email: "dir.molise@vigilfuoco.it"},
    {c: "Direzione Regionale Piemonte", rg: "Piemonte", email: "dir.piemonte@vigilfuoco.it"},
    {c: "Direzione Regionale Puglia", rg: "Puglia", email: "dir.puglia@vigilfuoco.it"},
    {c: "Direzione Regionale Sardegna", rg: "Sardegna", email: "dir.sardegna@vigilfuoco.it"},
    {c: "Direzione Regionale Sicilia", rg: "Sicilia", email: "dir.sicilia@vigilfuoco.it"},
    {c: "Direzione Regionale Toscana", rg: "Toscana", email: "dir.toscana@vigilfuoco.it"},
    {c: "Direzione Regionale Umbria", rg: "Umbria", email: "dir.umbria@vigilfuoco.it"},
    {c: "Direzione Regionale Valle d'Aosta", rg: "Valle d'Aosta", email: ""},
    {c: "Direzione Interregionale Veneto e Trentino-Alto Adige", rg: "Veneto", email: "dir.veneto@vigilfuoco.it", x: "trentino alto adige taa"}
  ].map(d => Object.assign({dir: true, pr: ""}, d));

  /* =====================================================================
   * Stile (scopato sotto .pg-comunicazioni, variabili condivise dell'app; stessa impostazione di Trigo)
   * ===================================================================== */
  const css = `
.pg-comunicazioni {
  --line2: #3a4552;
  --cm-acc: var(--ics-amministrazione, #2b73d6);
  --cm-warn: var(--yellow, #e8a33d);
  --cm-ok: #3fa66b;
  --cm-err: #e8734a;
  max-width: 640px;
  margin: 0 auto;
  padding: 12px 16px calc(24px + env(safe-area-inset-bottom, 0px));
}
.pg-comunicazioni * { box-sizing: border-box; }


.pg-comunicazioni .cm-stepsbar { display: grid; grid-template-columns: repeat(5, 1fr); border: 1px solid var(--line); border-radius: 8px; overflow: hidden; }
.pg-comunicazioni .cm-dot { background: var(--panel); border: 0; border-right: 1px solid var(--line); min-height: 44px; display: flex; align-items: center; justify-content: center; color: var(--text-dim); font: 600 14px var(--sans); cursor: default; padding: 0; }
.pg-comunicazioni .cm-dot:last-child { border-right: 0; }
.pg-comunicazioni .cm-dot b { display: inline-grid; place-items: center; width: 22px; height: 22px; border: 1.5px solid currentColor; border-radius: 50%; font-size: 12px; }
.pg-comunicazioni .cm-dot.done { cursor: pointer; }
.pg-comunicazioni .cm-dot.done b { background: var(--cm-ok); border-color: var(--cm-ok); color: #000; }
.pg-comunicazioni .cm-dot.active { background: var(--yellow); color: #000; }
.pg-comunicazioni .cm-steplabel { padding: 8px 0 0; font-size: 13px; color: var(--text-dim); text-align: center; }

.pg-comunicazioni .cm-step { margin-top: 14px; }

.pg-comunicazioni .panel { background: var(--panel); border: 1px solid var(--line); border-radius: 8px; overflow: hidden; }
.pg-comunicazioni .panel + .panel { margin-top: 10px; }
.pg-comunicazioni .row-group-label { padding: 12px 14px 2px; font-size: 15px; font-weight: 700; color: var(--text); }

.pg-comunicazioni .field { padding: 10px 14px; min-width: 0; }
.pg-comunicazioni .field label { display: block; font-size: 13px; color: var(--text-dim); margin-bottom: 5px; }
/* 16px: sotto questa soglia iOS ingrandisce la pagina quando si tocca un campo */
.pg-comunicazioni .field input:not([type=checkbox]), .pg-comunicazioni .field select, .pg-comunicazioni .field textarea {
  display: block; width: 100%; min-width: 0; max-width: 100%; min-height: 46px; padding: 11px 12px; font-size: 16px;
  background: var(--bg); border: 1px solid var(--line); border-radius: 6px; color: var(--text); font-family: var(--sans);
}
.pg-comunicazioni .field input[type=datetime-local], .pg-comunicazioni .field input[type=date], .pg-comunicazioni .field input[type=time] {
  -webkit-appearance: none; appearance: none; text-align: left;
}
.pg-comunicazioni .field textarea { min-height: 0; font-family: var(--mono); font-size: 16px; line-height: 1.4; resize: vertical; }
.pg-comunicazioni .field input:focus, .pg-comunicazioni .field select:focus, .pg-comunicazioni .field textarea:focus {
  outline: none; border-color: var(--cm-warn);
}
.pg-comunicazioni .field-row { display: flex; gap: 8px; }
.pg-comunicazioni .field-row .field { flex: 1; padding-left: 0; }
.pg-comunicazioni .field-row .field:first-child { padding-left: 14px; }
.pg-comunicazioni .field-row .field:last-child { padding-right: 14px; }
.pg-comunicazioni .field-check { display: flex; align-items: center; gap: 12px; padding: 4px 14px; min-height: 52px; font-size: 15px; }
.pg-comunicazioni .field-check input { width: 22px; height: 22px; flex: none; }
.pg-comunicazioni .field-check label { flex: 1; padding: 10px 0; }
.pg-comunicazioni .hint { font-size: 12px; color: var(--text-dim); padding: 0 14px 10px; margin-top: -4px; }

.pg-comunicazioni .comando-current { padding: 8px 14px 14px; font-size: 13px; color: var(--text-dim); line-height: 1.5; overflow-wrap: anywhere; }
.pg-comunicazioni .comando-current b { color: var(--text); font-weight: 600; }

.pg-comunicazioni .tile-grid { display: flex; flex-wrap: wrap; gap: 8px; padding: 12px 14px 14px; }
.pg-comunicazioni .tile {
  flex: 1 1 calc(50% - 8px); min-width: 130px; min-height: 60px; padding: 12px 10px; background: var(--panel-2);
  border: 1px solid var(--line); border-radius: 6px; color: var(--text-dim); font-size: 13.5px;
  font-weight: 600; text-align: center; cursor: pointer; line-height: 1.3;
  display: flex; align-items: center; justify-content: center;
}
.pg-comunicazioni .tile.selected { background: var(--yellow); border-color: var(--yellow); color: #000; }
.pg-comunicazioni .tile:active { opacity: .85; }
.pg-comunicazioni .tile-grid.need { outline: 2px solid var(--cm-err); outline-offset: -2px; border-radius: 6px; }

.pg-comunicazioni .dyn-list { padding: 4px 14px 6px; }
.pg-comunicazioni .person-row, .pg-comunicazioni .timb-row, .pg-comunicazioni .leg-row {
  display: flex; gap: 8px; align-items: flex-start; padding: 6px 0;
}
.pg-comunicazioni .person-row input.person-input {
  flex: 1; min-width: 0; min-height: 46px; padding: 11px 12px; font-size: 16px; background: var(--panel-2); border: 1px solid var(--line);
  border-radius: 6px; color: var(--text); font-family: var(--sans);
}
.pg-comunicazioni .timb-row, .pg-comunicazioni .leg-row {
  flex-wrap: wrap; background: var(--panel-2); border: 1px solid var(--line); border-radius: 6px;
  padding: 10px; margin-bottom: 8px;
}
.pg-comunicazioni .timb-row .tfield, .pg-comunicazioni .leg-row .lfield { flex: 1 1 150px; min-width: 0; }
.pg-comunicazioni .timb-row .tfield label, .pg-comunicazioni .leg-row .lfield label {
  font-size: 12px; color: var(--text-dim); margin-bottom: 4px; display: block;
}
.pg-comunicazioni .timb-row input, .pg-comunicazioni .leg-row input, .pg-comunicazioni .leg-row select {
  display: block; width: 100%; min-width: 0; min-height: 46px; padding: 10px; font-size: 16px; background: var(--panel); border: 1px solid var(--line);
  border-radius: 6px; color: var(--text); font-family: var(--sans); -webkit-appearance: none; appearance: none;
}
.pg-comunicazioni .leg-row select { -webkit-appearance: menulist; appearance: menulist; }
.pg-comunicazioni .row-remove-btn {
  flex: none; width: 46px; height: 46px; border-radius: 6px; background: var(--panel-2);
  border: 1px solid var(--line); color: var(--text-dim); cursor: pointer; font-size: 17px; line-height: 1;
}
.pg-comunicazioni .timb-row .row-remove-btn, .pg-comunicazioni .leg-row .row-remove-btn { flex: 1 1 100%; width: auto; height: 40px; font-size: 13px; font-weight: 600; }
.pg-comunicazioni .row-remove-btn:active { border-color: var(--cm-err); color: var(--cm-err); }

.pg-comunicazioni .add-row-btn { display: block; width: calc(100% - 28px); min-height: 48px; margin: 4px 14px 12px; padding: 12px; background: var(--panel-2); border: 1px solid var(--line); border-radius: 8px; color: var(--text); font-size: 14.5px; font-weight: 600; cursor: pointer; }
.pg-comunicazioni .add-row-btn:active { border-color: var(--cm-warn); }

/* barra di navigazione del wizard: resta sempre a portata di pollice */
.pg-comunicazioni .nav-row {
  position: sticky; bottom: 0; z-index: 20; display: flex; gap: 8px;
  margin: 14px -16px 0; padding: 12px 16px calc(12px + env(safe-area-inset-bottom, 0px));
  background: linear-gradient(to top, var(--bg) 80%, rgba(16, 20, 26, 0));
}
.pg-comunicazioni .nav-btn { flex: 1; min-height: 52px; padding: 14px; border: none; border-radius: 8px; font-size: 15.5px; font-weight: 700; cursor: pointer; }
.pg-comunicazioni .nav-back { background: var(--panel-2); border: 1px solid var(--line) !important; color: var(--text); flex: 0 0 34%; }
.pg-comunicazioni .nav-next { background: var(--cm-acc); color: #fff; }
.pg-comunicazioni .nav-btn:active { opacity: .85; }

.pg-comunicazioni .preview-actions { display: flex; flex-wrap: wrap; gap: 8px; padding: 0 14px 14px; }
.pg-comunicazioni .preview-actions button { flex: 1 1 140px; min-height: 50px; padding: 12px 10px; border: none; border-radius: 8px; font-size: 14.5px; font-weight: 700; cursor: pointer; }
.pg-comunicazioni .btn-mailto { background: var(--cm-acc); color: #fff; }
.pg-comunicazioni .btn-eml, .pg-comunicazioni .btn-copy, .pg-comunicazioni .btn-share { background: var(--panel-2); border: 1px solid var(--line) !important; color: var(--text); }

.pg-comunicazioni .security-note { margin-top: 10px; padding: 10px 12px; background: transparent; border: 1px solid var(--line2, #3a4552); border-radius: 6px; font-size: 13px; color: var(--text-dim); line-height: 1.55; }
.pg-comunicazioni .security-note strong { color: var(--text); }

/* avviso: compare sopra la barra di navigazione, dove si guarda */
.pg-comunicazioni .cm-msg { position: fixed; left: 12px; right: 12px; bottom: calc(84px + env(safe-area-inset-bottom, 0px)); z-index: 2500; max-width: 616px; margin: 0 auto; padding: 12px 14px; border-radius: 8px; background: var(--yellow); color: #000; font-size: 14px; font-weight: 600; line-height: 1.4; box-shadow: 0 6px 20px rgba(0, 0, 0, .45); }

/* utente registrato */
.pg-comunicazioni .prof-details summary {
  padding: 14px; min-height: 48px; font-size: 14px; color: var(--cm-warn); font-weight: 700; cursor: pointer;
  border-top: 1px solid var(--line); list-style: none;
}
.pg-comunicazioni .prof-details summary::-webkit-details-marker { display: none; }
.pg-comunicazioni .prof-details[open] summary { border-bottom: 1px solid var(--line); margin-bottom: 4px; }
.pg-comunicazioni .prof-actions { display: flex; gap: 8px; padding: 6px 14px 4px; }
.pg-comunicazioni .prof-save { flex: 1; min-height: 48px; padding: 12px; border: none; border-radius: 8px; background: var(--cm-acc); color: #fff; font-size: 14.5px; font-weight: 700; cursor: pointer; }
.pg-comunicazioni .prof-del { flex: none; min-height: 48px; padding: 12px 16px; border-radius: 6px; background: var(--panel-2); border: 1px solid var(--line); color: var(--text-dim); font-size: 14px; font-weight: 700; cursor: pointer; }
.pg-comunicazioni .prof-del:active { border-color: var(--cm-err); color: var(--cm-err); }

/* ricerca comando */
.pg-comunicazioni .cbx-box { position: relative; }
.pg-comunicazioni .cbx-field input[type=text] { padding-right: 48px; }
.pg-comunicazioni .cbx-clear { position: absolute; right: 0; top: 50%; transform: translateY(-50%); width: 46px; height: 46px; background: none; border: none; color: var(--text-dim); font-size: 17px; cursor: pointer; }
.pg-comunicazioni .cbx-results { margin-top: 8px; max-height: min(264px, 42vh); overflow-y: auto; border: 1px solid var(--line); border-radius: 6px; background: var(--panel-2); -webkit-overflow-scrolling: touch; overscroll-behavior: contain; }
.pg-comunicazioni .cbx-item { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: baseline; gap: 2px 10px; padding: 13px 14px; min-height: 48px; border-bottom: 1px solid var(--line); cursor: pointer; }
.pg-comunicazioni .cbx-item:last-child { border-bottom: none; }
.pg-comunicazioni .cbx-item b { font-size: 15px; font-weight: 600; }
.pg-comunicazioni .cbx-item span { font-size: 12.5px; color: var(--text-dim); }
.pg-comunicazioni .cbx-item.active, .pg-comunicazioni .cbx-item:active { background: #241d10; }
.pg-comunicazioni .cbx-empty { padding: 14px; font-size: 13px; color: var(--text-dim); line-height: 1.5; }
.pg-comunicazioni .cbx-tools { display: flex; gap: 8px; padding: 0 14px 8px; }
.pg-comunicazioni .cbx-tools select { flex: 1; min-width: 0; min-height: 46px; padding: 10px 12px; font-size: 16px; background: var(--bg); border: 1px solid var(--line); border-radius: 6px; color: var(--text); font-family: var(--sans); }
.pg-comunicazioni .cbx-tools select:focus { outline: none; border-color: var(--cm-warn); }
.pg-comunicazioni .cbx-geo { flex: none; min-height: 46px; padding: 10px 14px; background: var(--panel-2); border: 1px solid var(--line); border-radius: 6px; color: var(--text); font-size: 14px; font-weight: 700; cursor: pointer; }
.pg-comunicazioni .cbx-geo:disabled { opacity: .6; }
.pg-comunicazioni .cbx-recents { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; padding: 2px 14px 8px; }
.pg-comunicazioni .cbx-recents-label { font-size: 12.5px; color: var(--text-dim); }
.pg-comunicazioni .cbx-chip { min-height: 40px; padding: 8px 14px; border-radius: 20px; border: 1px solid var(--line); background: var(--panel-2); color: var(--text); font-size: 13.5px; font-weight: 600; cursor: pointer; }
.pg-comunicazioni .cbx-chip:active { border-color: var(--cm-warn); }
.pg-comunicazioni .cbx-off { opacity: .45; pointer-events: none; }

.pg-comunicazioni button:focus-visible, .pg-comunicazioni summary:focus-visible { outline: 2px solid var(--text); outline-offset: 2px; }

/* schermi stretti: date e coppie di campi una sotto l'altra, tutto a larghezza piena */
@media (max-width: 520px) {
  .pg-comunicazioni .field-row { flex-direction: column; gap: 0; }
  .pg-comunicazioni .field-row .field, .pg-comunicazioni .field-row .field:first-child, .pg-comunicazioni .field-row .field:last-child {
    padding-left: 14px; padding-right: 14px;
  }
  .pg-comunicazioni .timb-row .tfield, .pg-comunicazioni .leg-row .lfield { flex-basis: 100%; }
  .pg-comunicazioni .cbx-tools { flex-wrap: wrap; }
  .pg-comunicazioni .cbx-geo { flex: 1 1 100%; }
  .pg-comunicazioni .nav-back { flex-basis: 32%; }
}
@media (max-width: 360px) {
  .pg-comunicazioni { padding-left: 12px; padding-right: 12px; }
  .pg-comunicazioni .nav-row { margin-left: -12px; margin-right: -12px; padding-left: 12px; padding-right: 12px; }
  .pg-comunicazioni .tile { flex-basis: 100%; }
}
@media (prefers-reduced-motion: reduce) { .pg-comunicazioni * { scroll-behavior: auto !important; } }

/* scelta singola (come le altre selezioni: giallo) */
.pg-comunicazioni .radio-list { display: flex; flex-direction: column; gap: 8px; padding: 6px 14px 12px; }
.pg-comunicazioni .radio { display: flex; align-items: center; gap: 12px; min-height: 52px; padding: 0 14px; background: var(--bg); border: 1px solid var(--line); border-radius: 8px; font-size: 15px; font-weight: 600; cursor: pointer; }
.pg-comunicazioni .radio input { width: 22px; height: 22px; flex: none; accent-color: var(--yellow); }
.pg-comunicazioni .radio.selected { border-color: var(--yellow); }

/* nominativi: menu del turno B, con "Altro" in fondo */
.pg-comunicazioni .person-fields { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 8px; }
.pg-comunicazioni .person-sel { display: block; width: 100%; min-width: 0; min-height: 46px; padding: 10px 12px; font-size: 16px; background: var(--bg); border: 1px solid var(--line); border-radius: 6px; color: var(--text); font-family: var(--sans); }
.pg-comunicazioni .person-sel:focus { outline: none; border-color: var(--cm-warn); }

.pg-comunicazioni .hidden { display: none !important; }
`;

  /* =====================================================================
   * Markup
   * ===================================================================== */
  const QUALIFICHE = [
    ["VVF", "Vigile del Fuoco (VVF)"], ["VVFC", "Vigile del Fuoco Coordinatore (VVFC)"],
    ["VE", "Vigile Esperto (VE)"], ["VEC", "Vigile Esperto Coordinatore (VEC)"], ["VESC", "VESC"],
    ["CS", "Capo Squadra (CS)"], ["CSC", "Capo Squadra Coordinatore (CSC)"],
    ["CR", "Capo Reparto (CR)"], ["CRC", "Capo Reparto Coordinatore (CRC)"],
    ["Funzionario", "Funzionario"], ["Direttivo/Dirigente", "Direttivo / Dirigente"]
  ];
  const qualificaOptions = QUALIFICHE.map(([v, t], i) =>
    '<option value="' + v + '"' + (v === "VE" ? " selected" : "") + ">" + t + "</option>").join("");

  function comandoPickerHtml(prefix, withGeoRecents) {
    return '' +
      '<div class="field cbx-field" id="' + prefix + 'Box">' +
      '<div class="cbx-box">' +
      '<input type="text" id="' + prefix + 'Input" placeholder="Cerca: capoluogo, provincia o sigla (es. RM)" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" enterkeyhint="search" role="combobox" aria-expanded="false" aria-controls="' + prefix + 'Results" aria-autocomplete="list" disabled>' +
      '<button type="button" class="cbx-clear hidden" id="' + prefix + 'Clear" aria-label="Cancella">&#10005;</button>' +
      '</div>' +
      '<div class="cbx-results hidden" id="' + prefix + 'Results" role="listbox"></div>' +
      '</div>' +
      '<div class="cbx-tools">' +
      '<select id="' + prefix + 'Regione" aria-label="Filtra per regione" disabled><option value="">Tutte le regioni</option></select>' +
      (withGeoRecents ? '<button type="button" class="cbx-geo" id="' + prefix + 'Geo" disabled>Il piu vicino a me</button>' : '') +
      '</div>' +
      (withGeoRecents ? '<div class="cbx-recents hidden" id="' + prefix + 'Recents"></div>' : '') +
      '<div class="comando-current" id="' + prefix + 'Current">Caricamento elenco comandi...</div>';
  }

  const html = `
<div class="cm-stepsbar" id="fcStepsBar"></div>
<div class="cm-steplabel" id="fcStepLabel"></div>

<!-- STEP 1 -->
<section class="cm-step" id="fcStep1">
  <div class="panel">
    <div class="row-group-label">Utente</div>
    <div class="field">
      <label for="fcProfiloSelect">Utente registrato</label>
      <select id="fcProfiloSelect"></select>
    </div>
    <details id="fcProfDetails" class="prof-details">
      <summary>Dati utente</summary>
      <div class="field-row">
        <div class="field"><label for="fcUCognome">Cognome</label><input type="text" id="fcUCognome" autocomplete="off" autocapitalize="words" enterkeyhint="next"></div>
        <div class="field"><label for="fcUNome">Nome</label><input type="text" id="fcUNome" autocomplete="off" autocapitalize="words" enterkeyhint="next"></div>
      </div>
      <div class="field"><label for="fcUCf">Codice fiscale</label><input type="text" id="fcUCf" maxlength="16" autocomplete="off" autocapitalize="characters" autocorrect="off" spellcheck="false" enterkeyhint="next"></div>
      <div class="field"><label for="fcUEmail">Email istituzionale</label><input type="email" id="fcUEmail" inputmode="email" placeholder="nome.cognome@vigilfuoco.it" autocomplete="off" autocapitalize="none" autocorrect="off" spellcheck="false" enterkeyhint="done"></div>
      <div class="field"><label for="fcQualifica">Qualifica</label><select id="fcQualifica">${qualificaOptions}</select></div>
      <div class="field-row">
        <div class="field"><label for="fcTurnoL">Turno</label>
          <select id="fcTurnoL"><option value="">-</option><option>A</option><option>B</option><option>C</option><option>D</option><option>G</option></select>
        </div>
        <div class="field"><label for="fcTurnoS">Salto turno</label>
          <select id="fcTurnoS"><option value="">-</option><option>1</option><option>2</option><option>3</option><option>4</option><option>5</option><option>6</option><option>7</option><option>8</option></select>
        </div>
      </div>
      <div class="field"><label for="fcSede">Sede</label><input type="text" id="fcSede" placeholder="es. CENTRALE" value="CENTRALE" autocapitalize="characters"></div>

      <div class="row-group-label">Comando di appartenenza</div>
      ${comandoPickerHtml("fcHome", false)}

      <div class="prof-actions">
        <button type="button" class="prof-save" id="fcProfSave">Salva utente</button>
        <button type="button" class="prof-del" id="fcProfDel">Elimina</button>
      </div>
      <div class="hint" id="fcProfMsg" role="status"></div>
    </details>
  </div>

  <div class="panel">
    <div class="row-group-label">Destinatario</div>
    <div class="field-check">
      <input type="checkbox" id="fcStesso" checked>
      <label for="fcStesso">Spedire la mail allo stesso comando di appartenenza</label>
    </div>
    ${comandoPickerHtml("fcDest", true)}
  </div>

  <div class="nav-row"><button type="button" class="nav-btn nav-next" data-next>Avanti</button></div>
</section>

<!-- STEP 2 -->
<section class="cm-step hidden" id="fcStep2">
  <div class="panel">
    <div class="row-group-label">Tipo di comunicazione</div>
    <div class="tile-grid" id="fcTipoTiles" role="radiogroup" aria-label="Tipo di comunicazione">
      <div class="tile" role="radio" tabindex="0" aria-checked="false" data-tipo="timbratura">Mancata timbratura</div>
      <div class="tile" role="radio" tabindex="0" aria-checked="false" data-tipo="missione">Missione per soccorso</div>
      <div class="tile" role="radio" tabindex="0" aria-checked="false" data-tipo="straaltre">Straord. altre attivita</div>
      <div class="tile" role="radio" tabindex="0" aria-checked="false" data-tipo="straguida">Straord. guida / sostituzione</div>
      <div class="tile" role="radio" tabindex="0" aria-checked="false" data-tipo="strasoccorso">Straord. per soccorso</div>
      <div class="tile" role="radio" tabindex="0" aria-checked="false" data-tipo="strarinforzo">Straord. rinforzo personale</div>
    </div>
  </div>
  <div class="nav-row">
    <button type="button" class="nav-btn nav-back" data-back>Indietro</button>
    <button type="button" class="nav-btn nav-next" data-next>Avanti</button>
  </div>
</section>

<!-- STEP 3 -->
<section class="cm-step hidden" id="fcStep3">

  <div class="detail-block hidden" id="fcDetMissione">
    <div class="panel">
      <div class="row-group-label tep">Dati intervento</div>
      <div class="field-row">
        <div class="field"><label for="fcMsInizio">Data/ora inizio intervento</label><input type="datetime-local" id="fcMsInizio"></div>
        <div class="field"><label for="fcMsFine">Data/ora fine intervento</label><input type="datetime-local" id="fcMsFine"></div>
      </div>
      <div class="field-row">
        <div class="field"><label for="fcMsNumero">Numero intervento</label><input type="text" id="fcMsNumero" autocomplete="off"></div>
        <div class="field"><label for="fcMsProgressivo">Progressivo intervento</label><input type="text" id="fcMsProgressivo" autocomplete="off"></div>
      </div>
      <div class="field"><label for="fcMsLocalita">Localita</label><input type="text" id="fcMsLocalita" autocapitalize="words"></div>
      <div class="field"><label for="fcMsTipologia">Tipologia intervento</label><select id="fcMsTipologia"></select></div>
    </div>
    <div class="panel">
      <div class="row-group-label pers">Personale intervenuto</div>
      <div class="dyn-list" id="fcMsPersonaleList"></div>
      <button type="button" class="add-row-btn" data-add="person" data-target="fcMsPersonaleList">+ Aggiungi personale</button>
    </div>
  </div>

  <div class="detail-block hidden" id="fcDetTimbratura">
    <div class="panel">
      <div class="row-group-label pers">Motivo della mancata timbratura</div>
      <div class="radio-list" role="radiogroup" aria-label="Motivo della mancata timbratura">
        <label class="radio selected"><input type="radio" name="fcTmTipo" value="dimenticanza" checked><span>Dimenticanza</span></label>
        <label class="radio"><input type="radio" name="fcTmTipo" value="senzabadge"><span>Senza badge</span></label>
        <label class="radio"><input type="radio" name="fcTmTipo" value="altro"><span>Altro</span></label>
      </div>
      <div class="field hidden" id="fcTmAltroBox"><label for="fcTmMotivo">Specifica il motivo</label><textarea id="fcTmMotivo" rows="3"></textarea></div>
    </div>
    <div class="panel">
      <div class="row-group-label pers">Date interessate</div>
      <div class="dyn-list" id="fcTmDateList"></div>
      <button type="button" class="add-row-btn" data-add="timbratura" data-target="fcTmDateList">+ Aggiungi data</button>
    </div>
  </div>

  <div class="detail-block hidden" id="fcDetStrasoccorso">
    <div class="panel">
      <div class="row-group-label tep">Dati intervento</div>
      <div class="field-row">
        <div class="field"><label for="fcSsInizio">Data/ora inizio intervento</label><input type="datetime-local" id="fcSsInizio"></div>
        <div class="field"><label for="fcSsFine">Data/ora fine intervento</label><input type="datetime-local" id="fcSsFine"></div>
      </div>
      <div class="field-row">
        <div class="field"><label for="fcSsNumero">Numero intervento</label><input type="text" id="fcSsNumero" autocomplete="off"></div>
        <div class="field"><label for="fcSsProgressivo">Progressivo intervento</label><input type="text" id="fcSsProgressivo" autocomplete="off"></div>
      </div>
      <div class="field"><label for="fcSsLocalita">Localita</label><input type="text" id="fcSsLocalita" autocapitalize="words"></div>
      <div class="field"><label for="fcSsTipologia">Tipologia intervento</label><select id="fcSsTipologia"></select></div>
    </div>
    <div class="panel">
      <div class="row-group-label pers">Personale intervenuto</div>
      <div class="dyn-list" id="fcSsPersonaleList"></div>
      <button type="button" class="add-row-btn" data-add="person" data-target="fcSsPersonaleList">+ Aggiungi personale</button>
    </div>
  </div>

  <div class="detail-block hidden" id="fcDetStrarinforzo">
    <div class="panel">
      <div class="row-group-label tep">Dati rinforzo</div>
      <div class="field-row">
        <div class="field"><label for="fcSrInizio">Data/ora inizio</label><input type="datetime-local" id="fcSrInizio"></div>
        <div class="field"><label for="fcSrFine">Data/ora fine</label><input type="datetime-local" id="fcSrFine"></div>
      </div>
      <div class="field"><label for="fcSrSede">Sede / comando di rinforzo</label><input type="text" id="fcSrSede" autocapitalize="words"></div>
      <div class="field"><label for="fcSrMotivo">Motivo del rinforzo</label><textarea id="fcSrMotivo" rows="2"></textarea></div>
    </div>
    <div class="panel">
      <div class="row-group-label pers">Personale coinvolto</div>
      <div class="dyn-list" id="fcSrPersonaleList"></div>
      <button type="button" class="add-row-btn" data-add="person" data-target="fcSrPersonaleList">+ Aggiungi personale</button>
    </div>
  </div>

  <div class="detail-block hidden" id="fcDetStraaltre">
    <div class="panel">
      <div class="row-group-label tep">Dati attivita</div>
      <div class="field-row">
        <div class="field"><label for="fcSaInizio">Data/ora inizio</label><input type="datetime-local" id="fcSaInizio"></div>
        <div class="field"><label for="fcSaFine">Data/ora fine</label><input type="datetime-local" id="fcSaFine"></div>
      </div>
      <div class="field"><label for="fcSaDescrizione">Descrizione attivita</label><textarea id="fcSaDescrizione" rows="3"></textarea></div>
    </div>
  </div>

  <div class="detail-block hidden" id="fcDetStraguida">
    <div class="panel">
      <div class="row-group-label tep">Tratte guida</div>
      <div class="dyn-list" id="fcGdLegList"></div>
      <button type="button" class="add-row-btn" data-add="leg" data-target="fcGdLegList">+ Aggiungi tratta (andata/ritorno)</button>
    </div>
    <div class="panel">
      <div class="field-check">
        <input type="checkbox" id="fcGdIncludiMissione">
        <label for="fcGdIncludiMissione">Includi anche i dati di una missione per soccorso</label>
      </div>
      <div id="fcGdMissioneBox" class="hidden">
        <div class="field-row">
          <div class="field"><label for="fcGdNumero">Numero intervento</label><input type="text" id="fcGdNumero" autocomplete="off"></div>
          <div class="field"><label for="fcGdProgressivo">Progressivo intervento</label><input type="text" id="fcGdProgressivo" autocomplete="off"></div>
        </div>
        <div class="field"><label for="fcGdLocalita">Localita</label><input type="text" id="fcGdLocalita" autocapitalize="words"></div>
        <div class="field"><label for="fcGdTipologia">Tipologia intervento</label><select id="fcGdTipologia"></select></div>
      </div>
    </div>
  </div>

  <div class="nav-row">
    <button type="button" class="nav-btn nav-back" data-back>Indietro</button>
    <button type="button" class="nav-btn nav-next" data-next>Avanti</button>
  </div>
</section>

<!-- STEP 4 -->
<section class="cm-step hidden" id="fcStep4">
  <div class="panel">
    <div class="row-group-label">Note</div>
    <div class="field"><textarea id="fcNote" rows="3" placeholder="Note aggiuntive (facoltative)" aria-label="Note"></textarea></div>
  </div>
  <div class="panel hidden" id="fcBuonoPastoBox">
    <div class="field-check"><input type="checkbox" id="fcBuonoPasto"><label for="fcBuonoPasto">Richiedo il secondo buono pasto</label></div>
  </div>
  <div class="nav-row">
    <button type="button" class="nav-btn nav-back" data-back>Indietro</button>
    <button type="button" class="nav-btn nav-next" id="fcGoSummary">Vai al riepilogo</button>
  </div>
</section>

<!-- STEP 5 -->
<section class="cm-step hidden" id="fcStep5">
  <div class="panel">
    <div class="row-group-label">Destinatario</div>
    <div class="field"><label for="fcPrevTo">A: (verifica prima di inviare)</label><input type="email" id="fcPrevTo" inputmode="email" autocapitalize="none" autocorrect="off" spellcheck="false"></div>
    <div class="field"><label for="fcPrevSubject">Oggetto</label><input type="text" id="fcPrevSubject"></div>
  </div>
  <div class="panel">
    <div class="row-group-label">Anteprima</div>
    <div class="field"><textarea id="fcPrevBody" rows="14" aria-label="Testo della mail"></textarea></div>
    <div class="preview-actions">
      <button type="button" class="btn-mailto" id="fcBtnMailto">Apri nel client di posta</button>
      <button type="button" class="btn-copy" id="fcBtnCopy">Copia testo</button>
      <button type="button" class="btn-share hidden" id="fcBtnShare">Condividi</button>
      <button type="button" class="btn-eml" id="fcBtnEml">Scarica .eml</button>
    </div>
  </div>
  <div class="security-note">
    <strong>Come funziona l'invio.</strong> Nessuna password e presente in questo file. "Apri nel client di posta" prepara l'email e la apre nel tuo programma di posta gia collegato al tuo account: l'invio lo fai tu. Se il testo e lungo e il programma di posta lo tronca, usa "Copia testo" o "Condividi". "Scarica .eml" fa lo stesso come file.
  </div>
  <div class="nav-row">
    <button type="button" class="nav-btn nav-back" data-back>Indietro</button>
    <button type="button" class="nav-btn nav-back" id="fcRestart" style="flex:1">Ricomincia</button>
  </div>
</section>

<div class="cm-msg hidden" id="fcMsg" role="alert"></div>
`;

  /* =====================================================================
   * Logica
   * ===================================================================== */
  function init(root) {
    const $ = id => root.querySelector("#" + id);
    const STEP_LABELS = ["Mittente e comando", "Tipo di comunicazione", "Dettaglio", "Opzioni e note", "Riepilogo e invio"];

    const MITTENTE = {nome: "", cognome: "", cf: "", email: ""};
    let currentStep = 1, currentTipo = null, currentComando = null;
    let TUTTI = [], COMANDI = [];

    const normTxt = s => (s || "").toString().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();

    /* ---------- avvisi (al posto di alert) ---------- */
    let msgTimer = 0;
    function avviso(testo, el) {
      const m = $("fcMsg");
      m.textContent = testo;
      m.classList.remove("hidden");
      clearTimeout(msgTimer);
      msgTimer = setTimeout(() => m.classList.add("hidden"), 6000);
      if (el) {
        el.scrollIntoView({block: "center", behavior: "smooth"});
        try { el.focus({preventScroll: true}); } catch (e) {}
      }
    }
    function nascondiAvviso() { clearTimeout(msgTimer); $("fcMsg").classList.add("hidden"); }

    function comandoSlug(record) {
      if (record && record.esc && /@vigilfuoco\.it$/i.test(record.esc)) {
        const local = record.esc.split("@")[0];
        const parts = local.split(".");
        return {slug: parts[parts.length - 1], ok: true};
      }
      const fallback = (record ? record.cm || record.c : "").toString().toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z]/g, "");
      return {slug: fallback, ok: false};
    }
    function comandoAddresses(record) {
      if (!record) return {tep: "", personale: "", ok: false};
      if (record.dir) return {tep: record.email || "", personale: record.email || "", ok: !!record.email};
      const s = comandoSlug(record);
      return {
        tep: s.slug ? ("tep." + s.slug + "@vigilfuoco.it") : "",
        personale: s.slug ? ("personale." + s.slug + "@vigilfuoco.it") : "",
        ok: s.ok
      };
    }

    /* ---------- tipologia select ---------- */
    ["fcMsTipologia", "fcSsTipologia", "fcGdTipologia"].forEach(id => {
      const sel = $(id);
      TIPOLOGIE.forEach(t => { const o = document.createElement("option"); o.value = t; o.textContent = t; sel.appendChild(o); });
    });

    /* ---------- selettore comando con ricerca ---------- */
    function cbKm(lat1, lon1, lat2, lon2) {
      const R = 6371, t = x => x * Math.PI / 180, dLat = t(lat2 - lat1), dLon = t(lon2 - lon1);
      const h = Math.sin(dLat / 2) ** 2 + Math.cos(t(lat1)) * Math.cos(t(lat2)) * Math.sin(dLon / 2) ** 2;
      return 2 * R * Math.asin(Math.sqrt(h));
    }

    function makeComandoPicker(prefix, opt) {
      opt = opt || {};
      const inp = $(prefix + "Input"), res = $(prefix + "Results"), clr = $(prefix + "Clear"),
        reg = $(prefix + "Regione"), cur = $(prefix + "Current"), box = $(prefix + "Box");
      const geo = opt.geo ? $(prefix + "Geo") : null;
      const rcn = opt.recents ? $(prefix + "Recents") : null;
      const RKEY = "fireops_com_comandi_recenti";
      const P = {rec: null, onChange: function () {}, input: inp};
      let items = [], active = -1, pronto = false;

      function search() {
        const q = normTxt(inp.value), rg = reg.value;
        let list = TUTTI.filter(r => !rg || r.rg === rg);
        if (q) {
          list = list.map(r => {
            let s = 99;
            if (r._p && r._p === q) s = 0;
            else if (r._n.startsWith(q)) s = 1;
            else if (r._k.split(" ").some(w => w.startsWith(q))) s = 2;
            else if (r._k.includes(q)) s = 3;
            return {r, s};
          }).filter(x => x.s < 99).sort((a, b) => a.s - b.s || a.r.c.localeCompare(b.r.c, "it")).map(x => x.r);
        } else if (!rg) {
          list = [];
        } else {
          list.sort((a, b) => (!!b.dir - !!a.dir) || a.c.localeCompare(b.c, "it"));
        }
        return list;
      }
      function mark() {
        Array.from(res.children).forEach((el, i) => {
          el.classList.toggle("active", i === active);
          if (i === active) el.scrollIntoView({block: "nearest"});
        });
      }
      function render() {
        if (!pronto) return;
        items = search();
        res.innerHTML = "";
        if (!inp.value.trim() && !reg.value) { res.classList.add("hidden"); inp.setAttribute("aria-expanded", "false"); return; }
        res.classList.remove("hidden");
        inp.setAttribute("aria-expanded", "true");
        if (!items.length) {
          const d = document.createElement("div");
          d.className = "cbx-empty";
          d.textContent = "Nessun risultato. Prova con il capoluogo o la sigla (es. RM).";
          res.appendChild(d);
          active = -1;
          return;
        }
        items.forEach(r => {
          const row = document.createElement("div");
          row.className = "cbx-item";
          row.setAttribute("role", "option");
          const b = document.createElement("b"); b.textContent = r.c;
          const s = document.createElement("span"); s.textContent = r.dir ? "Direzione" : (r.pr + " - " + r.rg);
          row.appendChild(b); row.appendChild(s);
          row.addEventListener("click", () => P.select(r));
          res.appendChild(row);
        });
        active = inp.value.trim() ? 0 : -1;
        mark();
      }

      P.update = function (note, rec) {
        rec = (rec === undefined) ? P.rec : rec;
        if (!pronto) { cur.textContent = "Caricamento elenco comandi..."; return; }
        if (!rec) { cur.textContent = note || "Nessun comando selezionato."; return; }
        const dir = !!rec.dir;
        const addr = comandoAddresses(rec);
        let out = (dir ? "Direzione: <b>" : "Comando: <b>") + rec.c + "</b> (" + rec.rg + ")";
        if (addr.tep) out += "<br>" + (dir ? "Indirizzo: " : "TEP: ") + addr.tep;
        if (dir) out += "<br>" + (addr.ok ? "Uso l'indirizzo generale della direzione, verificalo al riepilogo." : "Indirizzo non disponibile: inseriscilo al riepilogo.");
        else if (!addr.ok) out += "<br>Indirizzo dedotto automaticamente, verificalo al riepilogo.";
        if (note) out += "<br>" + note;
        cur.innerHTML = out;
      };

      function rLoad() { try { return JSON.parse(localStorage.getItem(RKEY) || "[]"); } catch (e) { return []; } }
      function rSave(rec) {
        try { const l = rLoad().filter(n => n !== rec.c); l.unshift(rec.c); localStorage.setItem(RKEY, JSON.stringify(l.slice(0, 5))); } catch (e) {}
      }
      function rRender() {
        if (!rcn) return;
        const recs = rLoad().map(n => TUTTI.find(r => r.c === n)).filter(Boolean);
        rcn.innerHTML = "";
        rcn.classList.toggle("hidden", !recs.length);
        if (!recs.length) return;
        const lab = document.createElement("span"); lab.className = "cbx-recents-label"; lab.textContent = "Recenti:";
        rcn.appendChild(lab);
        recs.forEach(r => {
          const c = document.createElement("button");
          c.type = "button"; c.className = "cbx-chip"; c.textContent = r.c;
          c.addEventListener("click", () => P.select(r));
          rcn.appendChild(c);
        });
      }

      P.select = function (rec, note, skipRecent) {
        P.rec = rec;
        inp.value = rec.c;
        clr.classList.remove("hidden");
        res.classList.add("hidden");
        inp.setAttribute("aria-expanded", "false");
        reg.value = "";
        P.update(note);
        if (rcn && !skipRecent) { rSave(rec); rRender(); }
        P.onChange(rec);
      };
      P.clear = function () {
        inp.value = ""; P.rec = null;
        clr.classList.add("hidden");
        P.update(); render();
        P.onChange(null);
      };
      P.setDisabled = function (d) {
        inp.disabled = d || !pronto; reg.disabled = d || !pronto; clr.disabled = d;
        if (geo) geo.disabled = d || !pronto;
        box.classList.toggle("cbx-off", d);
        res.classList.add("hidden");
      };

      P.setData = function (list) {
        pronto = true;
        inp.disabled = false; reg.disabled = false;
        if (geo) geo.disabled = false;
        Array.from(new Set(list.map(r => r.rg))).sort((a, b) => a.localeCompare(b, "it")).forEach(rg => {
          const o = document.createElement("option"); o.value = rg; o.textContent = rg; reg.appendChild(o);
        });
        rRender();
        P.update();
      };

      inp.addEventListener("input", () => {
        if (P.rec && inp.value !== P.rec.c) { P.rec = null; P.update(); P.onChange(null); }
        clr.classList.toggle("hidden", !inp.value);
        render();
      });
      inp.addEventListener("focus", () => {
        if (P.rec && inp.value === P.rec.c) inp.select(); else render();
        // con la tastiera aperta i risultati devono restare visibili
        setTimeout(() => { try { inp.scrollIntoView({block: "center", behavior: "smooth"}); } catch (e) {} }, 250);
      });
      inp.addEventListener("keydown", e => {
        if (e.key === "ArrowDown") { e.preventDefault(); if (items.length) { active = Math.min(items.length - 1, active + 1); mark(); } }
        else if (e.key === "ArrowUp") { e.preventDefault(); if (items.length) { active = Math.max(0, active - 1); mark(); } }
        else if (e.key === "Enter") { e.preventDefault(); if (items[active]) P.select(items[active]); inp.blur(); }
        else if (e.key === "Escape") { res.classList.add("hidden"); }
      });
      clr.addEventListener("click", () => { P.clear(); inp.focus(); });
      reg.addEventListener("change", render);
      document.addEventListener("click", e => { if (!e.target.closest("#" + prefix + "Box")) res.classList.add("hidden"); });

      if (geo) {
        geo.addEventListener("click", () => {
          if (!navigator.geolocation) { P.update("Geolocalizzazione non disponibile su questo dispositivo."); return; }
          geo.disabled = true; geo.textContent = "Cerco...";
          navigator.geolocation.getCurrentPosition(p => {
            let best = null, bd = Infinity;
            COMANDI.forEach(r => { const d = cbKm(p.coords.latitude, p.coords.longitude, r.lat, r.lon); if (d < bd) { bd = d; best = r; } });
            geo.disabled = false; geo.textContent = "Il piu vicino a me";
            if (best) P.select(best, "Sede piu vicina alla tua posizione (circa " + Math.round(bd) + " km). Verifica che sia il comando competente.");
          }, () => {
            geo.disabled = false; geo.textContent = "Il piu vicino a me";
            P.update("Posizione non disponibile: controlla i permessi del browser.");
          }, {enableHighAccuracy: false, timeout: 10000, maximumAge: 300000});
        });
      }

      P.update();
      return P;
    }

    const home = makeComandoPicker("fcHome", {});
    const dest = makeComandoPicker("fcDest", {geo: true, recents: true});
    const stessoChk = $("fcStesso");

    function applyDestinazione() {
      const same = stessoChk.checked;
      dest.setDisabled(same);
      if (same) {
        currentComando = home.rec;
        dest.update(home.rec ? "Invio allo stesso comando di appartenenza." : "Imposta il comando di appartenenza in Dati utente.", home.rec);
      } else {
        currentComando = dest.rec;
        dest.update();
      }
    }
    let suggerisciDaPosizione = false;
    home.onChange = function () { suggerisciDaPosizione = false; if (stessoChk.checked) applyDestinazione(); };
    dest.onChange = function (r) { if (!stessoChk.checked) currentComando = r; };
    stessoChk.addEventListener("change", applyDestinazione);

    /* ---------- utenti registrati (salvati nel browser di questo dispositivo) ---------- */
    const PROF_KEY = "fireops_com_utenti";
    const PROF_ACT = "fireops_com_utente_attivo";
    const profSel = $("fcProfiloSelect");
    const profDet = $("fcProfDetails");
    let profActiveId = "";

    function val(id) { const el = $(id); return el ? el.value.trim() : ""; }
    function profLoad() { try { return JSON.parse(localStorage.getItem(PROF_KEY) || "[]"); } catch (e) { return []; } }
    function profStore(list) { try { localStorage.setItem(PROF_KEY, JSON.stringify(list)); return true; } catch (e) { return false; } }
    function profSetActive(id) { try { localStorage.setItem(PROF_ACT, id || ""); } catch (e) {} }
    function profMsg(t) { $("fcProfMsg").textContent = t || ""; }

    function syncMittente() {
      MITTENTE.nome = val("fcUNome");
      MITTENTE.cognome = val("fcUCognome");
      MITTENTE.cf = val("fcUCf").toUpperCase();
      MITTENTE.email = val("fcUEmail");
    }
    function turnoStr() { return val("fcTurnoL") + val("fcTurnoS"); }
    function qualificaLabel() { return $("fcQualifica").value; }

    function profFromForm() {
      return {
        id: profActiveId || ("u" + Date.now().toString(36)),
        nome: val("fcUNome"), cognome: val("fcUCognome"),
        cf: val("fcUCf").toUpperCase(), email: val("fcUEmail"),
        qualifica: $("fcQualifica").value,
        sede: val("fcSede"),
        turnoL: val("fcTurnoL"), turnoS: val("fcTurnoS"),
        comando: home.rec ? home.rec.c : "",
        stesso: stessoChk.checked
      };
    }
    function profFill(p) {
      $("fcUNome").value = p.nome || "";
      $("fcUCognome").value = p.cognome || "";
      $("fcUCf").value = p.cf || "";
      $("fcUEmail").value = p.email || "";
      $("fcQualifica").value = p.qualifica || "VE";
      $("fcSede").value = p.sede || "";
      $("fcTurnoL").value = p.turnoL || "";
      $("fcTurnoS").value = p.turnoS || "";
      suggerisciDaPosizione = false;
      const rec = TUTTI.find(r => r.c === p.comando);
      if (rec) home.select(rec, null, true); else home.clear();
      stessoChk.checked = (p.stesso !== false);
      applyDestinazione();
      syncMittente();
    }
    function profBlank() {
      profFill({qualifica: "VE", sede: "CENTRALE"});
      // niente comando salvato: prova a suggerirlo dalla posizione rilevata dall'app
      suggerisciDaPosizione = true;
      provaSuggerimentoPosizione();
    }
    function provaSuggerimentoPosizione() {
      if (!suggerisciDaPosizione || home.rec) return;
      const pos = window.FireOps && window.FireOps.posizione ? window.FireOps.posizione() : null;
      if (pos && pos.comando) {
        home.select(pos.comando, "Suggerito dalla tua posizione attuale. Verifica che sia corretto.");
        applyDestinazione();
      }
    }
    document.addEventListener("fireops:posizione", provaSuggerimentoPosizione);

    function profRenderSelect() {
      const list = profLoad().sort((a, b) => (a.cognome + a.nome).localeCompare(b.cognome + b.nome, "it"));
      profSel.innerHTML = "";
      const add = (v, t) => { const o = document.createElement("option"); o.value = v; o.textContent = t; profSel.appendChild(o); };
      add("", list.length ? "Scegli utente registrato" : "Nessun utente registrato");
      list.forEach(p => add(p.id, p.cognome.toUpperCase() + " " + p.nome + (p.qualifica ? " (" + p.qualifica + ")" : "")));
      add("__new__", "+ Nuovo utente");
      profSel.value = profActiveId || "";
    }

    profSel.addEventListener("change", () => {
      const v = profSel.value;
      if (v === "") return;
      if (v === "__new__") {
        profActiveId = ""; profSetActive("");
        profBlank();
        profSel.value = "";
        profDet.open = true;
        $("fcUCognome").focus();
        profMsg("Compila i dati e premi Salva utente.");
        return;
      }
      const p = profLoad().find(x => x.id === v);
      if (!p) return;
      profActiveId = p.id; profSetActive(p.id);
      profFill(p);
      profDet.open = false;
      profMsg("");
    });

    $("fcProfSave").addEventListener("click", () => {
      syncMittente();
      const list = profLoad();
      if (!profActiveId) {
        const dup = list.find(x => x.cognome.toLowerCase() === val("fcUCognome").toLowerCase() && x.nome.toLowerCase() === val("fcUNome").toLowerCase());
        if (dup) profActiveId = dup.id;
      }
      const p = profFromForm();
      if (!p.nome || !p.cognome) { profMsg("Inserisci almeno nome e cognome."); avviso("Inserisci almeno nome e cognome.", p.cognome ? $("fcUNome") : $("fcUCognome")); return; }
      if (!p.comando) { profMsg("Scegli il comando di appartenenza."); avviso("Scegli il comando di appartenenza.", home.input); return; }
      if (p.cf && !/^[A-Z0-9]{16}$/.test(p.cf)) { profMsg("Il codice fiscale deve avere 16 caratteri."); avviso("Il codice fiscale deve avere 16 caratteri.", $("fcUCf")); return; }
      const i = list.findIndex(x => x.id === p.id);
      if (i >= 0) list[i] = p; else list.push(p);
      if (!profStore(list)) { profMsg("Impossibile salvare: il browser blocca la memoria locale."); return; }
      profActiveId = p.id; profSetActive(p.id);
      profRenderSelect();
      profMsg("Utente salvato su questo dispositivo.");
      avviso("Utente salvato su questo dispositivo.");
    });

    $("fcProfDel").addEventListener("click", () => {
      if (!profActiveId) { profMsg("Nessun utente selezionato."); return; }
      const list = profLoad();
      const p = list.find(x => x.id === profActiveId);
      if (!p || !confirm("Eliminare " + p.cognome + " " + p.nome + " da questo dispositivo?")) return;
      profStore(list.filter(x => x.id !== profActiveId));
      profActiveId = ""; profSetActive("");
      profRenderSelect(); profBlank();
      profMsg("Utente eliminato.");
    });

    ["fcUNome", "fcUCognome", "fcUEmail"].forEach(id => $(id).addEventListener("input", syncMittente));
    $("fcUCf").addEventListener("input", function () { this.value = this.value.toUpperCase().replace(/[^A-Z0-9]/g, ""); syncMittente(); });

    /* ---------- caricamento comandi (db/comandi.json via FireOps) ---------- */
    function avviaDati() {
      if (!(window.FireOps && window.FireOps.comandi)) {
        home.update("Elenco comandi non disponibile in questa pagina.");
        dest.update("Elenco comandi non disponibile in questa pagina.");
        return;
      }
      window.FireOps.comandi().then(list => {
        COMANDI = list;
        TUTTI = COMANDI.concat(DIREZIONI);
        TUTTI.forEach(r => {
          r._n = normTxt(r.c);
          r._p = normTxt(r.pr);
          r._k = normTxt([r.c, r.cm, r.pr, r.rg, r.x].join(" "));
        });
        home.setData(TUTTI);
        dest.setData(TUTTI);

        const list2 = profLoad();
        let act = ""; try { act = localStorage.getItem(PROF_ACT) || ""; } catch (e) {}
        const p = list2.find(x => x.id === act) || (list2.length === 1 ? list2[0] : null);
        if (p) { profActiveId = p.id; profFill(p); }
        else { profBlank(); profDet.open = true; }
        profRenderSelect();
        applyDestinazione();
      }).catch(() => {
        home.update("Impossibile caricare l'elenco comandi. Riprova più tardi.");
        dest.update("Impossibile caricare l'elenco comandi. Riprova più tardi.");
      });
    }
    avviaDati();

    /* ---------- step 2: tile ---------- */
    const tiles = Array.from(root.querySelectorAll("#fcTipoTiles .tile"));
    function sceltaTipo(t) {
      currentTipo = t.dataset.tipo;
      tiles.forEach(x => { const on = x === t; x.classList.toggle("selected", on); x.setAttribute("aria-checked", on ? "true" : "false"); });
      $("fcTipoTiles").classList.remove("need");
      nascondiAvviso();
    }
    tiles.forEach(t => {
      t.addEventListener("click", () => sceltaTipo(t));
      t.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); sceltaTipo(t); } });
    });

    /* ---------- motivo della mancata timbratura ---------- */
    const tmRadios = Array.from(root.querySelectorAll('input[name="fcTmTipo"]'));
    function tipoMotivo() { const c = tmRadios.find(r => r.checked); return c ? c.value : "dimenticanza"; }
    function motivoTimbratura() { return tipoMotivo() === "altro" ? val("fcTmMotivo") : MOTIVI_TIMBRATURA[tipoMotivo()]; }
    tmRadios.forEach(r => r.addEventListener("change", () => {
      tmRadios.forEach(x => x.closest(".radio").classList.toggle("selected", x.checked));
      const altro = tipoMotivo() === "altro";
      $("fcTmAltroBox").classList.toggle("hidden", !altro);
      if (altro) $("fcTmMotivo").focus({preventScroll: true});
    }));

    /* ---------- righe dinamiche ---------- */
    const personaleOptions = '<option value="">Scegli nominativo</option>'
      + PERSONALE.map(n => '<option value="' + n.replace(/"/g, "&quot;") + '">' + n + "</option>").join("")
      + '<option value="__altro__">Altro</option>';
    function addPersonRow(targetId) {
      const list = $(targetId);
      const row = document.createElement("div");
      row.className = "person-row";
      row.innerHTML = '<div class="person-fields"><select class="person-sel" aria-label="Nominativo">' + personaleOptions + '</select>'
        + '<input type="text" class="person-input hidden" placeholder="Nome Cognome (qualifica)" autocapitalize="words" enterkeyhint="done" aria-label="Nominativo (altro)"></div>'
        + '<button type="button" class="row-remove-btn" aria-label="Rimuovi">\u2715</button>';
      const sel = row.querySelector(".person-sel"), inp = row.querySelector(".person-input");
      sel.addEventListener("change", () => {
        const altro = sel.value === "__altro__";
        inp.classList.toggle("hidden", !altro);
        if (altro) inp.focus();
      });
      row.querySelector(".row-remove-btn").addEventListener("click", () => row.remove());
      list.appendChild(row);
      return row;
    }
    function addTimbraturaRow(targetId) {
      const list = $(targetId);
      const row = document.createElement("div");
      row.className = "timb-row";
      row.innerHTML = '<div class="tfield"><label>Data/ora ingresso</label><input type="datetime-local" class="timb-in"></div>'
        + '<div class="tfield"><label>Data/ora uscita</label><input type="datetime-local" class="timb-out"></div>'
        + '<button type="button" class="row-remove-btn" aria-label="Rimuovi questa data">Rimuovi questa data</button>';
      row.querySelector(".row-remove-btn").addEventListener("click", () => row.remove());
      list.appendChild(row);
      return row;
    }
    function addLegRow(targetId, tipo) {
      const list = $(targetId);
      const row = document.createElement("div");
      row.className = "leg-row";
      row.innerHTML = '<div class="lfield"><label>Tipo</label><select class="leg-tipo"><option value="Andata">Andata</option><option value="Ritorno">Ritorno</option></select></div>'
        + '<div class="lfield"><label>Sede partenza</label><input type="text" class="leg-partenza"></div>'
        + '<div class="lfield"><label>Sede arrivo</label><input type="text" class="leg-arrivo"></div>'
        + '<div class="lfield"><label>Data/ora inizio</label><input type="datetime-local" class="leg-inizio"></div>'
        + '<div class="lfield"><label>Data/ora fine</label><input type="datetime-local" class="leg-fine"></div>'
        + '<button type="button" class="row-remove-btn" aria-label="Rimuovi questa tratta">Rimuovi questa tratta</button>';
      if (tipo) row.querySelector(".leg-tipo").value = tipo;
      row.querySelector(".row-remove-btn").addEventListener("click", () => row.remove());
      list.appendChild(row);
      return row;
    }
    root.querySelectorAll(".add-row-btn[data-add]").forEach(btn => {
      btn.addEventListener("click", function () {
        const kind = this.dataset.add, target = this.dataset.target;
        let row = null;
        if (kind === "person") row = addPersonRow(target);
        else if (kind === "timbratura") row = addTimbraturaRow(target);
        else if (kind === "leg") row = addLegRow(target);
        // la riga nuova va in vista e, per i nominativi, apre subito la tastiera
        if (row) {
          row.scrollIntoView({block: "center", behavior: "smooth"});
          const f = row.querySelector(".person-sel");
          if (f) f.focus({preventScroll: true});
        }
      });
    });
    addPersonRow("fcMsPersonaleList");
    addPersonRow("fcSsPersonaleList");
    addPersonRow("fcSrPersonaleList");
    addTimbraturaRow("fcTmDateList");
    addLegRow("fcGdLegList", "Andata");
    addLegRow("fcGdLegList", "Ritorno");

    $("fcGdIncludiMissione").addEventListener("change", function () { $("fcGdMissioneBox").classList.toggle("hidden", !this.checked); });

    function getPersonList(listId) {
      return Array.from(root.querySelectorAll("#" + listId + " .person-row")).map(r => {
        const sel = r.querySelector(".person-sel");
        return sel.value === "__altro__" ? r.querySelector(".person-input").value.trim() : sel.value;
      }).filter(Boolean);
    }

    /* ---------- navigazione ---------- */
    const stepsBar = $("fcStepsBar");
    for (let i = 1; i <= 5; i++) {
      const d = document.createElement("button");
      d.type = "button"; d.className = "cm-dot"; d.dataset.step = i;
      d.innerHTML = "<b>" + i + "</b>";
      stepsBar.appendChild(d);
    }
    // i passi già fatti sono cliccabili per tornare indietro
    stepsBar.addEventListener("click", e => {
      const b = e.target.closest(".cm-dot");
      if (!b) return;
      const n = Number(b.dataset.step);
      if (n < currentStep) vaiA(n);
    });
    function vaiA(n) {
      if (history.state && history.state.fcStep === currentStep) history.go(n - currentStep);
      else showStep(n, true);
    }

    function renderStepsBar() {
      stepsBar.querySelectorAll(".cm-dot").forEach(d => {
        const n = Number(d.dataset.step);
        d.classList.toggle("done", n < currentStep);
        d.classList.toggle("active", n === currentStep);
        d.setAttribute("aria-label", "Passo " + n + ": " + STEP_LABELS[n - 1]);
        if (n === currentStep) d.setAttribute("aria-current", "step"); else d.removeAttribute("aria-current");
      });
      $("fcStepLabel").textContent = "Passo " + currentStep + " di 5 - " + STEP_LABELS[currentStep - 1];
    }

    function showDetailBlock() {
      root.querySelectorAll(".detail-block").forEach(b => b.classList.add("hidden"));
      if (currentTipo) {
        const map = {missione: "fcDetMissione", timbratura: "fcDetTimbratura", strasoccorso: "fcDetStrasoccorso",
          strarinforzo: "fcDetStrarinforzo", straaltre: "fcDetStraaltre", straguida: "fcDetStraguida"};
        const el = $(map[currentTipo]);
        if (el) el.classList.remove("hidden");
      }
    }
    function showOptionsBlocks() {
      const withBuono = ["strasoccorso", "strarinforzo", "straaltre", "straguida"];
      $("fcBuonoPastoBox").classList.toggle("hidden", !withBuono.includes(currentTipo));
    }

    // l'intestazione dell'app resta fissa in alto: la barra dei passi va portata sotto di essa
    function scrollAiPassi() {
      const h = document.querySelector(".foh");
      const y = stepsBar.getBoundingClientRect().top + window.pageYOffset - (h ? h.offsetHeight : 0) - 12;
      window.scrollTo({top: Math.max(0, y), behavior: "smooth"});
    }

    function showStep(n, daCronologia, silenzioso) {
      const prima = currentStep;
      currentStep = n;
      nascondiAvviso();
      // un passo avanti = una voce di cronologia: il tasto Indietro del telefono torna al passo precedente
      if (!daCronologia && n > prima) { try { history.pushState({fcStep: n}, "", location.href); } catch (e) {} }
      root.querySelectorAll(".cm-step").forEach(s => s.classList.toggle("hidden", s.id !== "fcStep" + n));
      if (n === 3) showDetailBlock();
      if (n === 4) showOptionsBlocks();
      if (n === 5) generatePreview();
      renderStepsBar();
      if (!silenzioso) scrollAiPassi();
    }

    function goNext() {
      if (currentStep === 1) {
        syncMittente();
        if (!MITTENTE.nome || !MITTENTE.cognome) {
          profDet.open = true;
          avviso("Scegli un utente o inserisci nome e cognome.", MITTENTE.cognome ? $("fcUNome") : $("fcUCognome"));
          return;
        }
        if (!currentComando) {
          if (stessoChk.checked) { profDet.open = true; avviso("Imposta il comando di appartenenza in Dati utente, oppure togli la spunta e scegli un altro comando.", home.input); }
          else avviso("Seleziona il comando destinatario.", dest.input);
          return;
        }
      }
      if (currentStep === 2 && !currentTipo) {
        $("fcTipoTiles").classList.add("need");
        avviso("Seleziona il tipo di comunicazione.", tiles[0]);
        return;
      }
      if (currentStep === 3 && currentTipo === "timbratura" && tipoMotivo() === "altro" && !val("fcTmMotivo")) {
        avviso("Specifica il motivo della mancata timbratura.", $("fcTmMotivo"));
        return;
      }
      showStep(Math.min(5, currentStep + 1));
    }
    function goBack() {
      if (currentStep <= 1) return;
      if (history.state && history.state.fcStep === currentStep) history.back();   // popstate mostra il passo precedente
      else showStep(currentStep - 1, true);
    }
    function ricomincia() {
      if (currentStep > 1 && history.state && history.state.fcStep) history.go(-(currentStep - 1));
      else showStep(1, true);
    }
    window.addEventListener("popstate", e => {
      if (window.FireOps && window.FireOps.attivo && window.FireOps.attivo() !== "comunicazioni") return;
      showStep((e.state && e.state.fcStep) || 1, true);
    });

    root.querySelectorAll("[data-next]").forEach(b => b.addEventListener("click", goNext));
    root.querySelectorAll("[data-back]").forEach(b => b.addEventListener("click", goBack));
    $("fcGoSummary").addEventListener("click", goNext);
    $("fcRestart").addEventListener("click", ricomincia);

    /* ---------- testo email ---------- */
    function pad2(n) { return String(n).padStart(2, "0"); }
    function fmtDT(v) {
      if (!v) return "-";
      const d = new Date(v);
      if (isNaN(d)) return v;
      return pad2(d.getDate()) + "/" + pad2(d.getMonth() + 1) + "/" + d.getFullYear() + " " + pad2(d.getHours()) + ":" + pad2(d.getMinutes());
    }
    function mittenteHeader() {
      syncMittente();
      let h = MITTENTE.cognome + " " + MITTENTE.nome + " (" + qualificaLabel() + ")";
      if (MITTENTE.cf) h += " - CF " + MITTENTE.cf;
      const t = turnoStr(), s = val("fcSede");
      if (t) h += " - turno " + t;
      if (s) h += " - sede " + s;
      if (home.rec && currentComando && currentComando !== home.rec) h += " - in servizio presso " + home.rec.c;
      return h;
    }

    function buildIntervento(prefix, isStraordinario) {
      const inizio = fmtDT(val(prefix + "Inizio")), fine = fmtDT(val(prefix + "Fine"));
      const numero = val(prefix + "Numero"), progressivo = val(prefix + "Progressivo"), localita = val(prefix + "Localita");
      const tipSel = $(prefix + "Tipologia"); const tipologia = tipSel ? tipSel.value : "";
      const personale = getPersonList(prefix + "PersonaleList");
      const bp2 = isStraordinario ? $("fcBuonoPasto").checked : false;
      const lines = [];
      lines.push(isStraordinario ? "Richiesta di straordinario per soccorso." : "Comunicazione di missione per soccorso.");
      lines.push("");
      lines.push("Richiedente: " + mittenteHeader());
      lines.push("Comando: " + (currentComando ? currentComando.c + " (" + currentComando.rg + ")" : "- non selezionato -"));
      lines.push("");
      lines.push("Data/ora inizio intervento: " + inizio);
      lines.push("Data/ora fine intervento: " + fine);
      lines.push("Numero intervento: " + (numero || "-"));
      lines.push("Progressivo intervento: " + (progressivo || "-"));
      lines.push("Localita: " + (localita || "-"));
      lines.push("Tipologia intervento: " + (tipologia || "-"));
      lines.push("");
      lines.push("Personale intervenuto:");
      if (personale.length) personale.forEach((p, i) => lines.push("  " + (i + 1) + ". " + p));
      else lines.push("  (nessun nominativo inserito)");
      if (isStraordinario) {
        lines.push("");
        lines.push(bp2 ? "Si richiede l'erogazione del secondo buono pasto." : "Non si richiede il secondo buono pasto.");
      }
      const note = val("fcNote");
      if (note) { lines.push(""); lines.push("Note: " + note); }
      lines.push("");
      lines.push("Distinti saluti.");
      lines.push(MITTENTE.cognome + " " + MITTENTE.nome);
      const dataBreve = val(prefix + "Inizio") ? inizio.split(" ")[0] : "";
      const subject = (isStraordinario ? "Straordinario per soccorso" : "Missione per soccorso") + " - " + MITTENTE.cognome + " " + MITTENTE.nome + " - interv. n. " + (numero || "s.n.") + (dataBreve ? " del " + dataBreve : "");
      return {subject, body: lines.join("\n")};
    }
    function buildTimbratura() {
      const motivo = motivoTimbratura();
      const rows = Array.from(root.querySelectorAll("#fcTmDateList .timb-row")).map(r => ({in: r.querySelector(".timb-in").value, out: r.querySelector(".timb-out").value}));
      const lines = [];
      lines.push("Comunicazione di mancata timbratura.");
      lines.push("");
      lines.push("Richiedente: " + mittenteHeader());
      lines.push("Comando: " + (currentComando ? currentComando.c + " (" + currentComando.rg + ")" : "- non selezionato -"));
      lines.push("");
      lines.push("Motivo: " + (motivo || "-"));
      lines.push("");
      lines.push("Date interessate:");
      if (rows.length) rows.forEach((r, i) => lines.push("  " + (i + 1) + ". Ingresso: " + fmtDT(r.in) + "  -  Uscita: " + fmtDT(r.out)));
      else lines.push("  (nessuna data inserita)");
      const note = val("fcNote");
      if (note) { lines.push(""); lines.push("Note: " + note); }
      lines.push("");
      lines.push("Distinti saluti.");
      lines.push(MITTENTE.cognome + " " + MITTENTE.nome);
      const primaData = rows.length && rows[0].in ? fmtDT(rows[0].in).split(" ")[0] : "";
      const subject = "Mancata timbratura - " + MITTENTE.cognome + " " + MITTENTE.nome + (primaData ? " - " + primaData : "");
      return {subject, body: lines.join("\n")};
    }
    function buildRinforzo() {
      const inizio = fmtDT(val("fcSrInizio")), fine = fmtDT(val("fcSrFine")), sede = val("fcSrSede"), motivo = val("fcSrMotivo");
      const personale = getPersonList("fcSrPersonaleList");
      const bp2 = $("fcBuonoPasto").checked;
      const lines = [];
      lines.push("Richiesta di straordinario per rinforzo personale.");
      lines.push("");
      lines.push("Richiedente: " + mittenteHeader());
      lines.push("Comando: " + (currentComando ? currentComando.c + " (" + currentComando.rg + ")" : "- non selezionato -"));
      lines.push("");
      lines.push("Data/ora inizio: " + inizio);
      lines.push("Data/ora fine: " + fine);
      lines.push("Sede / comando di rinforzo: " + (sede || "-"));
      lines.push("Motivo: " + (motivo || "-"));
      lines.push("");
      lines.push("Personale coinvolto:");
      if (personale.length) personale.forEach((p, i) => lines.push("  " + (i + 1) + ". " + p));
      else lines.push("  (nessun nominativo inserito)");
      lines.push("");
      lines.push(bp2 ? "Si richiede l'erogazione del secondo buono pasto." : "Non si richiede il secondo buono pasto.");
      const note = val("fcNote");
      if (note) { lines.push(""); lines.push("Note: " + note); }
      lines.push("");
      lines.push("Distinti saluti.");
      lines.push(MITTENTE.cognome + " " + MITTENTE.nome);
      const dataBreve = val("fcSrInizio") ? inizio.split(" ")[0] : "";
      const subject = "Straordinario rinforzo personale - " + MITTENTE.cognome + " " + MITTENTE.nome + (dataBreve ? " - " + dataBreve : "");
      return {subject, body: lines.join("\n")};
    }
    function buildAltre() {
      const inizio = fmtDT(val("fcSaInizio")), fine = fmtDT(val("fcSaFine")), descr = val("fcSaDescrizione");
      const bp2 = $("fcBuonoPasto").checked;
      const lines = [];
      lines.push("Richiesta di straordinario per altre attivita.");
      lines.push("");
      lines.push("Richiedente: " + mittenteHeader());
      lines.push("Comando: " + (currentComando ? currentComando.c + " (" + currentComando.rg + ")" : "- non selezionato -"));
      lines.push("");
      lines.push("Data/ora inizio: " + inizio);
      lines.push("Data/ora fine: " + fine);
      lines.push("Descrizione attivita: " + (descr || "-"));
      lines.push("");
      lines.push(bp2 ? "Si richiede l'erogazione del secondo buono pasto." : "Non si richiede il secondo buono pasto.");
      const note = val("fcNote");
      if (note) { lines.push(""); lines.push("Note: " + note); }
      lines.push("");
      lines.push("Distinti saluti.");
      lines.push(MITTENTE.cognome + " " + MITTENTE.nome);
      const dataBreve = val("fcSaInizio") ? inizio.split(" ")[0] : "";
      const subject = "Straordinario altre attivita - " + MITTENTE.cognome + " " + MITTENTE.nome + (dataBreve ? " - " + dataBreve : "");
      return {subject, body: lines.join("\n")};
    }
    function buildGuida() {
      const legs = Array.from(root.querySelectorAll("#fcGdLegList .leg-row")).map(r => ({
        tipo: r.querySelector(".leg-tipo").value, partenza: r.querySelector(".leg-partenza").value.trim(),
        arrivo: r.querySelector(".leg-arrivo").value.trim(), inizio: r.querySelector(".leg-inizio").value, fine: r.querySelector(".leg-fine").value
      }));
      const bp2 = $("fcBuonoPasto").checked;
      const includiMissione = $("fcGdIncludiMissione").checked;
      const lines = [];
      lines.push("Richiesta di straordinario per guida / sostituzione personale.");
      lines.push("");
      lines.push("Richiedente: " + mittenteHeader());
      lines.push("Comando: " + (currentComando ? currentComando.c + " (" + currentComando.rg + ")" : "- non selezionato -"));
      lines.push("");
      lines.push("Tratte:");
      if (legs.length) legs.forEach((l, i) => lines.push("  " + (i + 1) + ". " + l.tipo + ": " + (l.partenza || "-") + " -> " + (l.arrivo || "-") + "  |  " + fmtDT(l.inizio) + " - " + fmtDT(l.fine)));
      else lines.push("  (nessuna tratta inserita)");
      if (includiMissione) {
        lines.push("");
        lines.push("Dati missione per soccorso collegata:");
        lines.push("  Numero intervento: " + (val("fcGdNumero") || "-"));
        lines.push("  Progressivo intervento: " + (val("fcGdProgressivo") || "-"));
        lines.push("  Localita: " + (val("fcGdLocalita") || "-"));
        lines.push("  Tipologia intervento: " + ($("fcGdTipologia").value || "-"));
      }
      lines.push("");
      lines.push(bp2 ? "Si richiede l'erogazione del secondo buono pasto." : "Non si richiede il secondo buono pasto.");
      const note = val("fcNote");
      if (note) { lines.push(""); lines.push("Note: " + note); }
      lines.push("");
      lines.push("Distinti saluti.");
      lines.push(MITTENTE.cognome + " " + MITTENTE.nome);
      const dataBreve = legs.length && legs[0].inizio ? fmtDT(legs[0].inizio).split(" ")[0] : "";
      const subject = "Straordinario guida/sostituzione - " + MITTENTE.cognome + " " + MITTENTE.nome + (dataBreve ? " - " + dataBreve : "");
      return {subject, body: lines.join("\n")};
    }

    function recipientFor(tipo) {
      const addr = comandoAddresses(currentComando);
      return tipo === "timbratura" ? addr.personale : addr.tep;
    }
    function generatePreview() {
      let built;
      switch (currentTipo) {
        case "missione": built = buildIntervento("fcMs", false); break;
        case "timbratura": built = buildTimbratura(); break;
        case "strasoccorso": built = buildIntervento("fcSs", true); break;
        case "strarinforzo": built = buildRinforzo(); break;
        case "straaltre": built = buildAltre(); break;
        case "straguida": built = buildGuida(); break;
        default: built = {subject: "", body: ""};
      }
      const realTo = recipientFor(currentTipo);
      $("fcPrevTo").value = realTo || "";
      $("fcPrevSubject").value = built.subject || "";
      $("fcPrevBody").value = built.body || "";
    }

    /* ---------- invio ---------- */
    $("fcBtnMailto").addEventListener("click", () => {
      generatePreview();
      const to = $("fcPrevTo").value, subject = $("fcPrevSubject").value, body = $("fcPrevBody").value;
      if (!to) { avviso('Manca il destinatario: scrivilo nel campo "A:" oppure scegli un comando al passo 1.', $("fcPrevTo")); return; }
      const url = "mailto:" + encodeURIComponent(to) + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
      if (url.length > 1900) avviso('Testo lungo: se la posta lo tronca usa "Copia testo" o "Condividi".');
      window.location.href = url;
    });
    function testoCompleto() { return "A: " + $("fcPrevTo").value + "\nOggetto: " + $("fcPrevSubject").value + "\n\n" + $("fcPrevBody").value; }
    $("fcBtnCopy").addEventListener("click", async () => {
      generatePreview();
      const t = testoCompleto();
      try { await navigator.clipboard.writeText(t); avviso("Testo copiato."); }
      catch (e) {
        const ta = $("fcPrevBody"); ta.focus(); ta.select();
        try { document.execCommand("copy"); avviso("Testo del messaggio copiato."); } catch (e2) { avviso("Copia non riuscita: tieni premuto sul testo per selezionarlo."); }
      }
    });
    if (navigator.share) {
      $("fcBtnShare").classList.remove("hidden");
      $("fcBtnShare").addEventListener("click", async () => {
        generatePreview();
        try { await navigator.share({title: $("fcPrevSubject").value, text: testoCompleto()}); } catch (e) { /* annullato */ }
      });
    }
    $("fcBtnEml").addEventListener("click", () => {
      generatePreview();
      const to = $("fcPrevTo").value, subject = $("fcPrevSubject").value, body = $("fcPrevBody").value;
      const fromLine = MITTENTE.email ? "From: " + MITTENTE.cognome + " " + MITTENTE.nome + " <" + MITTENTE.email + ">\r\n" : "";
      const eml = fromLine + "To: " + to + "\r\nSubject: " + subject + "\r\nDate: " + new Date().toUTCString() + "\r\nMIME-Version: 1.0\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\n" + body;
      const blob = new Blob([eml], {type: "message/rfc822"});
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = (subject || "email").replace(/[^a-z0-9 _-]/gi, "").slice(0, 60).trim() + ".eml";
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    });

    root.addEventListener("change", () => { if (currentStep === 5) generatePreview(); });

    renderStepsBar();
    showStep(1, true, true);
  }

  if (window.FireOps && window.FireOps.registra) {
    window.FireOps.registra({id: "comunicazioni", css, html, init});
  }
})();