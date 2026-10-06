/* FireOps VVF - modulo Comunicazioni
 * Missioni per soccorso e mancate timbrature via email.
 * Si registra con FireOps.registra({id, css, html, init}); vedi app/js/fireops-app.js.
 *
 * Dati comando: usa FireOps.comandi() (db/comandi.json, già nel formato corto).
 * Le direzioni regionali non sono ancora in un file dati condiviso: restano qui
 * sotto DIREZIONI, da spostare in db/direzioni.json quando esisterà.
 */
(function () {
  "use strict";

  const TEST_ADDRESS = "andrea.pelizza.vvf@gmail.com";

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
   * Stile (scopato sotto .pg-comunicazioni, variabili condivise dell'app)
   * ===================================================================== */
  const css = `
.pg-comunicazioni {
  --cm-acc: var(--ics-amministrazione, #2b73d6);
  --cm-warn: var(--yellow, #e8a33d);
  --cm-ok: #3fa66b;
  --cm-err: #e8734a;
  max-width: 640px;
  margin: 0 auto;
  padding: 12px 16px calc(24px + env(safe-area-inset-bottom, 0px));
}

.pg-comunicazioni .cm-test {
  display: flex; align-items: center; justify-content: space-between; gap: 10px;
  padding: 9px 12px; margin-bottom: 12px; border-radius: 6px;
  background: var(--cm-warn); color: #1a1400; font-size: 12.5px; font-weight: 700;
}
.pg-comunicazioni .cm-test.off { background: var(--panel-2); color: var(--text-dim); border: 1px solid var(--line); }
.pg-comunicazioni .cm-test button {
  flex: none; background: #1a1400; color: var(--cm-warn); border: none; border-radius: 14px;
  padding: 5px 12px; font-size: 11.5px; font-weight: 700; cursor: pointer;
}
.pg-comunicazioni .cm-test.off button { background: var(--cm-err); color: #fff; }

.pg-comunicazioni .cm-stepsbar { display: flex; gap: 5px; }
.pg-comunicazioni .cm-dot { flex: 1; height: 4px; border-radius: 2px; background: var(--line); }
.pg-comunicazioni .cm-dot.done { background: var(--cm-ok); }
.pg-comunicazioni .cm-dot.active { background: var(--cm-warn); }
.pg-comunicazioni .cm-steplabel { padding: 8px 0 0; font-size: 12.5px; color: var(--text-dim); text-align: center; }

.pg-comunicazioni .cm-step { margin-top: 14px; }

.pg-comunicazioni .panel { background: var(--panel); border: 1px solid var(--line); border-radius: 6px; overflow: hidden; }
.pg-comunicazioni .panel + .panel { margin-top: 10px; }
.pg-comunicazioni .row-group-label { padding: 10px 14px 6px; font-size: 12.5px; color: var(--text-dim); border-left: 3px solid var(--line); }
.pg-comunicazioni .row-group-label.tep { border-left-color: var(--cm-warn); }
.pg-comunicazioni .row-group-label.pers { border-left-color: var(--cm-ok); }

.pg-comunicazioni .field { padding: 10px 14px; }
.pg-comunicazioni .field label { display: block; font-size: 12.5px; color: var(--text-dim); margin-bottom: 5px; }
.pg-comunicazioni .field input[type=text], .pg-comunicazioni .field input[type=date],
.pg-comunicazioni .field input[type=time], .pg-comunicazioni .field input[type=datetime-local],
.pg-comunicazioni .field select, .pg-comunicazioni .field textarea {
  width: 100%; padding: 11px 12px; font-size: 15px; background: var(--panel-2); border: 1px solid var(--line);
  border-radius: 6px; color: var(--text); font-family: var(--sans);
}
.pg-comunicazioni .field textarea { font-family: var(--mono); font-size: 13px; resize: vertical; }
.pg-comunicazioni .field input:focus, .pg-comunicazioni .field select:focus, .pg-comunicazioni .field textarea:focus {
  outline: none; border-color: var(--cm-warn);
}
.pg-comunicazioni .field-row { display: flex; gap: 8px; }
.pg-comunicazioni .field-row .field { flex: 1; padding-left: 0; }
.pg-comunicazioni .field-row .field:first-child { padding-left: 14px; }
.pg-comunicazioni .field-row .field:last-child { padding-right: 14px; }
.pg-comunicazioni .field-check { display: flex; align-items: center; gap: 8px; padding: 12px 14px; font-size: 14px; }
.pg-comunicazioni .field-check input { width: 18px; height: 18px; flex: none; }
.pg-comunicazioni .hint { font-size: 11.5px; color: var(--text-dim); padding: 0 14px 10px; margin-top: -4px; }

.pg-comunicazioni .comando-current { padding: 8px 14px 14px; font-size: 12.5px; color: var(--text-dim); line-height: 1.5; }
.pg-comunicazioni .comando-current b { color: var(--text); font-weight: 600; }

.pg-comunicazioni .tile-grid { display: flex; flex-wrap: wrap; gap: 8px; padding: 12px 14px 14px; }
.pg-comunicazioni .tile {
  flex: 1 1 calc(50% - 8px); min-width: 150px; padding: 13px 10px; background: var(--panel-2);
  border: 1px solid var(--line); border-radius: 6px; color: var(--text-dim); font-size: 12.5px;
  font-weight: 600; text-align: center; cursor: pointer; line-height: 1.3;
}
.pg-comunicazioni .tile.selected { background: var(--cm-acc); border-color: var(--cm-acc); color: #fff; }
.pg-comunicazioni .tile:active { opacity: .85; }

.pg-comunicazioni .choice-list { padding: 6px 14px 14px; }
.pg-comunicazioni .choice {
  display: flex; align-items: center; gap: 10px; padding: 13px 14px; margin-top: 8px;
  background: var(--panel-2); border: 1px solid var(--line); border-radius: 6px; cursor: pointer;
}
.pg-comunicazioni .choice:first-child { margin-top: 0; }
.pg-comunicazioni .choice input { width: 18px; height: 18px; flex: none; }
.pg-comunicazioni .choice span { font-size: 14.5px; font-weight: 600; }
.pg-comunicazioni .choice.selected { border-color: var(--cm-warn); background: #241d10; }

.pg-comunicazioni .dyn-list { padding: 4px 14px 6px; }
.pg-comunicazioni .person-row, .pg-comunicazioni .timb-row, .pg-comunicazioni .leg-row {
  display: flex; gap: 8px; align-items: flex-start; padding: 6px 0;
}
.pg-comunicazioni .person-row input.person-input {
  flex: 1; padding: 11px 12px; font-size: 15px; background: var(--panel-2); border: 1px solid var(--line);
  border-radius: 6px; color: var(--text);
}
.pg-comunicazioni .timb-row, .pg-comunicazioni .leg-row {
  flex-wrap: wrap; background: var(--panel-2); border: 1px solid var(--line); border-radius: 6px;
  padding: 10px; margin-bottom: 8px;
}
.pg-comunicazioni .timb-row .tfield, .pg-comunicazioni .leg-row .lfield { flex: 1; min-width: 140px; }
.pg-comunicazioni .timb-row .tfield label, .pg-comunicazioni .leg-row .lfield label {
  font-size: 11px; color: var(--text-dim); margin-bottom: 4px; display: block;
}
.pg-comunicazioni .timb-row input, .pg-comunicazioni .leg-row input, .pg-comunicazioni .leg-row select {
  width: 100%; padding: 10px; font-size: 14px; background: var(--panel); border: 1px solid var(--line);
  border-radius: 6px; color: var(--text);
}
.pg-comunicazioni .row-remove-btn {
  flex: none; width: 34px; height: 34px; border-radius: 6px; background: var(--panel-2);
  border: 1px solid var(--line); color: var(--text-dim); cursor: pointer; font-size: 16px; line-height: 1;
}
.pg-comunicazioni .timb-row .row-remove-btn, .pg-comunicazioni .leg-row .row-remove-btn { align-self: center; margin-top: 14px; }
.pg-comunicazioni .row-remove-btn:active { border-color: var(--cm-err); color: var(--cm-err); }

.pg-comunicazioni .add-row-btn {
  width: calc(100% - 28px); margin: 4px 14px 12px; padding: 11px; background: var(--panel-2);
  border: 1px dashed var(--line); border-radius: 6px; color: var(--cm-warn); font-size: 13.5px;
  font-weight: 600; cursor: pointer;
}
.pg-comunicazioni .add-row-btn:active { border-color: var(--cm-warn); }

.pg-comunicazioni .nav-row { display: flex; gap: 8px; padding: 16px 0 4px; }
.pg-comunicazioni .nav-btn { flex: 1; padding: 14px; border: none; border-radius: 6px; font-size: 14.5px; font-weight: 700; cursor: pointer; }
.pg-comunicazioni .nav-back { background: var(--panel-2); border: 1px solid var(--line) !important; color: var(--text); }
.pg-comunicazioni .nav-next { background: var(--cm-acc); color: #fff; }
.pg-comunicazioni .nav-btn:active { opacity: .85; }

.pg-comunicazioni .preview-actions { display: flex; gap: 8px; padding: 0 14px 14px; }
.pg-comunicazioni .preview-actions button { flex: 1; padding: 13px 10px; border: none; border-radius: 6px; font-size: 13.5px; font-weight: 700; cursor: pointer; }
.pg-comunicazioni .btn-mailto { background: var(--cm-ok); color: #fff; }
.pg-comunicazioni .btn-eml { background: var(--panel-2); border: 1px solid var(--cm-warn) !important; color: var(--cm-warn); }

.pg-comunicazioni .security-note {
  margin-top: 10px; padding: 12px 14px; background: var(--panel-2); border: 1px solid var(--line);
  border-left: 3px solid var(--cm-ok); border-radius: 6px; font-size: 12.5px; color: var(--text-dim); line-height: 1.55;
}
.pg-comunicazioni .security-note strong { color: var(--text); }

/* utente registrato */
.pg-comunicazioni .prof-details summary {
  padding: 10px 14px; font-size: 13px; color: var(--cm-warn); font-weight: 700; cursor: pointer;
  border-top: 1px solid var(--line); list-style: none;
}
.pg-comunicazioni .prof-details summary::-webkit-details-marker { display: none; }
.pg-comunicazioni .prof-details[open] summary { border-bottom: 1px solid var(--line); margin-bottom: 4px; }
.pg-comunicazioni .prof-actions { display: flex; gap: 8px; padding: 6px 14px 4px; }
.pg-comunicazioni .prof-save { flex: 1; padding: 12px; border: none; border-radius: 6px; background: var(--cm-ok); color: #fff; font-size: 13.5px; font-weight: 700; cursor: pointer; }
.pg-comunicazioni .prof-del { flex: none; padding: 12px 16px; border-radius: 6px; background: var(--panel-2); border: 1px solid var(--line); color: var(--text-dim); font-size: 13px; font-weight: 700; cursor: pointer; }
.pg-comunicazioni .prof-del:active { border-color: var(--cm-err); color: var(--cm-err); }

/* ricerca comando */
.pg-comunicazioni .cbx-box { position: relative; }
.pg-comunicazioni .cbx-field input[type=text] { padding-right: 42px; }
.pg-comunicazioni .cbx-clear { position: absolute; right: 2px; top: 50%; transform: translateY(-50%); width: 38px; height: 38px; background: none; border: none; color: var(--text-dim); font-size: 16px; cursor: pointer; }
.pg-comunicazioni .cbx-results { margin-top: 8px; max-height: 264px; overflow-y: auto; border: 1px solid var(--line); border-radius: 6px; background: var(--panel-2); -webkit-overflow-scrolling: touch; }
.pg-comunicazioni .cbx-item { display: flex; justify-content: space-between; align-items: baseline; gap: 10px; padding: 12px 14px; border-bottom: 1px solid var(--line); cursor: pointer; }
.pg-comunicazioni .cbx-item:last-child { border-bottom: none; }
.pg-comunicazioni .cbx-item b { font-size: 14.5px; font-weight: 600; }
.pg-comunicazioni .cbx-item span { font-size: 12px; color: var(--text-dim); white-space: nowrap; }
.pg-comunicazioni .cbx-item.active, .pg-comunicazioni .cbx-item:active { background: #241d10; }
.pg-comunicazioni .cbx-empty { padding: 14px; font-size: 12.5px; color: var(--text-dim); line-height: 1.5; }
.pg-comunicazioni .cbx-tools { display: flex; gap: 8px; padding: 0 14px 8px; }
.pg-comunicazioni .cbx-tools select { flex: 1; min-width: 0; padding: 10px 12px; font-size: 14px; background: var(--panel-2); border: 1px solid var(--line); border-radius: 6px; color: var(--text); font-family: var(--sans); }
.pg-comunicazioni .cbx-tools select:focus { outline: none; border-color: var(--cm-warn); }
.pg-comunicazioni .cbx-geo { flex: none; padding: 10px 14px; background: var(--panel-2); border: 1px solid var(--cm-warn); border-radius: 6px; color: var(--cm-warn); font-size: 13px; font-weight: 700; cursor: pointer; }
.pg-comunicazioni .cbx-geo:disabled { opacity: .6; }
.pg-comunicazioni .cbx-recents { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; padding: 2px 14px 8px; }
.pg-comunicazioni .cbx-recents-label { font-size: 12px; color: var(--text-dim); }
.pg-comunicazioni .cbx-chip { padding: 7px 12px; border-radius: 16px; border: 1px solid var(--line); background: var(--panel-2); color: var(--text); font-size: 12.5px; font-weight: 600; cursor: pointer; }
.pg-comunicazioni .cbx-chip:active { border-color: var(--cm-warn); }
.pg-comunicazioni .cbx-off { opacity: .45; pointer-events: none; }

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
      '<input type="text" id="' + prefix + 'Input" placeholder="Cerca: capoluogo, provincia o sigla (es. RM)" autocomplete="off" autocapitalize="off" spellcheck="false" role="combobox" aria-expanded="false" aria-controls="' + prefix + 'Results" aria-autocomplete="list" disabled>' +
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
<div class="cm-test" id="fcTestBar">
  <span id="fcTestLabel">MODALITA TEST ATTIVA</span>
  <button type="button" id="fcTestToggle">Disattiva TEST</button>
</div>

<div class="cm-stepsbar" id="fcStepsBar"></div>
<div class="cm-steplabel" id="fcStepLabel"></div>

<!-- STEP 1 -->
<section class="cm-step" id="fcStep1">
  <div class="panel">
    <div class="row-group-label">Utente</div>
    <div class="field">
      <label>Utente registrato</label>
      <select id="fcProfiloSelect"></select>
    </div>
    <details id="fcProfDetails" class="prof-details">
      <summary>Dati utente</summary>
      <div class="field-row">
        <div class="field"><label>Cognome</label><input type="text" id="fcUCognome" autocomplete="off"></div>
        <div class="field"><label>Nome</label><input type="text" id="fcUNome" autocomplete="off"></div>
      </div>
      <div class="field"><label>Codice fiscale</label><input type="text" id="fcUCf" maxlength="16" autocomplete="off" autocapitalize="characters"></div>
      <div class="field"><label>Email istituzionale</label><input type="text" id="fcUEmail" placeholder="nome.cognome@vigilfuoco.it" autocomplete="off"></div>
      <div class="field"><label>Qualifica</label><select id="fcQualifica">${qualificaOptions}</select></div>
      <div class="field-row">
        <div class="field"><label>Turno</label>
          <select id="fcTurnoL"><option value="">-</option><option>A</option><option>B</option><option>C</option><option>D</option><option>G</option></select>
        </div>
        <div class="field"><label>Salto turno</label>
          <select id="fcTurnoS"><option value="">-</option><option>1</option><option>2</option><option>3</option><option>4</option><option>5</option><option>6</option><option>7</option><option>8</option></select>
        </div>
      </div>
      <div class="field"><label>Sede</label><input type="text" id="fcSede" placeholder="es. CENTRALE" value="CENTRALE"></div>

      <div class="row-group-label">Comando di appartenenza</div>
      ${comandoPickerHtml("fcHome", false)}

      <div class="prof-actions">
        <button type="button" class="prof-save" id="fcProfSave">Salva utente</button>
        <button type="button" class="prof-del" id="fcProfDel">Elimina</button>
      </div>
      <div class="hint" id="fcProfMsg"></div>
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
    <div class="tile-grid" id="fcTipoTiles">
      <div class="tile" data-tipo="timbratura">Mancata timbratura</div>
      <div class="tile" data-tipo="missione">Missione per soccorso</div>
      <div class="tile" data-tipo="straaltre">Straord. altre attivita</div>
      <div class="tile" data-tipo="straguida">Straord. guida / sostituzione</div>
      <div class="tile" data-tipo="strasoccorso">Straord. per soccorso</div>
      <div class="tile" data-tipo="strarinforzo">Straord. rinforzo personale</div>
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
        <div class="field"><label>Data/ora inizio intervento</label><input type="datetime-local" id="fcMsInizio"></div>
        <div class="field"><label>Data/ora fine intervento</label><input type="datetime-local" id="fcMsFine"></div>
      </div>
      <div class="field-row">
        <div class="field"><label>Numero intervento</label><input type="text" id="fcMsNumero"></div>
        <div class="field"><label>Progressivo intervento</label><input type="text" id="fcMsProgressivo"></div>
      </div>
      <div class="field"><label>Localita</label><input type="text" id="fcMsLocalita"></div>
      <div class="field"><label>Tipologia intervento</label><select id="fcMsTipologia"></select></div>
    </div>
    <div class="panel">
      <div class="row-group-label pers">Personale intervenuto</div>
      <div class="dyn-list" id="fcMsPersonaleList"></div>
      <button type="button" class="add-row-btn" data-add="person" data-target="fcMsPersonaleList">+ Aggiungi personale</button>
    </div>
  </div>

  <div class="detail-block hidden" id="fcDetTimbratura">
    <div class="panel">
      <div class="row-group-label pers">Motivo</div>
      <div class="field"><label>Motivo mancata timbratura</label><textarea id="fcTmMotivo" rows="3"></textarea></div>
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
        <div class="field"><label>Data/ora inizio intervento</label><input type="datetime-local" id="fcSsInizio"></div>
        <div class="field"><label>Data/ora fine intervento</label><input type="datetime-local" id="fcSsFine"></div>
      </div>
      <div class="field-row">
        <div class="field"><label>Numero intervento</label><input type="text" id="fcSsNumero"></div>
        <div class="field"><label>Progressivo intervento</label><input type="text" id="fcSsProgressivo"></div>
      </div>
      <div class="field"><label>Localita</label><input type="text" id="fcSsLocalita"></div>
      <div class="field"><label>Tipologia intervento</label><select id="fcSsTipologia"></select></div>
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
        <div class="field"><label>Data/ora inizio</label><input type="datetime-local" id="fcSrInizio"></div>
        <div class="field"><label>Data/ora fine</label><input type="datetime-local" id="fcSrFine"></div>
      </div>
      <div class="field"><label>Sede / comando di rinforzo</label><input type="text" id="fcSrSede"></div>
      <div class="field"><label>Motivo del rinforzo</label><textarea id="fcSrMotivo" rows="2"></textarea></div>
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
        <div class="field"><label>Data/ora inizio</label><input type="datetime-local" id="fcSaInizio"></div>
        <div class="field"><label>Data/ora fine</label><input type="datetime-local" id="fcSaFine"></div>
      </div>
      <div class="field"><label>Descrizione attivita</label><textarea id="fcSaDescrizione" rows="3"></textarea></div>
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
          <div class="field"><label>Numero intervento</label><input type="text" id="fcGdNumero"></div>
          <div class="field"><label>Progressivo intervento</label><input type="text" id="fcGdProgressivo"></div>
        </div>
        <div class="field"><label>Localita</label><input type="text" id="fcGdLocalita"></div>
        <div class="field"><label>Tipologia intervento</label><select id="fcGdTipologia"></select></div>
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
    <div class="field"><textarea id="fcNote" rows="2" placeholder="Note aggiuntive (facoltative)"></textarea></div>
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
    <div class="field"><label>A: (verifica prima di inviare)</label><input type="text" id="fcPrevTo"></div>
    <div class="field"><label>Oggetto</label><input type="text" id="fcPrevSubject"></div>
  </div>
  <div class="panel">
    <div class="row-group-label">Anteprima</div>
    <div class="field"><textarea id="fcPrevBody" rows="16"></textarea></div>
    <div class="preview-actions">
      <button type="button" class="btn-mailto" id="fcBtnMailto">Apri nel client di posta</button>
      <button type="button" class="btn-eml" id="fcBtnEml">Scarica .eml</button>
    </div>
  </div>
  <div class="security-note">
    <strong>Come funziona l'invio.</strong> Nessuna password e presente in questo file. "Apri nel client di posta" prepara l'email e la apre nel tuo programma di posta gia collegato al tuo account: l'invio lo fai tu. "Scarica .eml" fa lo stesso come file, utile per testi lunghi.
  </div>
  <div class="nav-row">
    <button type="button" class="nav-btn nav-back" data-back>Indietro</button>
    <button type="button" class="nav-btn nav-back" id="fcRestart">Ricomincia</button>
  </div>
</section>
`;

  /* =====================================================================
   * Logica
   * ===================================================================== */
  function init(root) {
    const $ = id => root.querySelector("#" + id);
    const STEP_LABELS = ["Mittente e comando", "Tipo di comunicazione", "Dettaglio", "Opzioni e note", "Riepilogo e invio"];

    const MITTENTE = {nome: "", cognome: "", cf: "", email: ""};
    let currentStep = 1, currentTipo = null, currentComando = null, testMode = true;
    let TUTTI = [], COMANDI = [];

    const normTxt = s => (s || "").toString().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();

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
      const P = {rec: null, onChange: function () {}};
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
        inp.disabled = d; reg.disabled = d; clr.disabled = d;
        if (geo) geo.disabled = d;
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
      inp.addEventListener("focus", () => { if (P.rec && inp.value === P.rec.c) inp.select(); else render(); });
      inp.addEventListener("keydown", e => {
        if (e.key === "ArrowDown") { e.preventDefault(); if (items.length) { active = Math.min(items.length - 1, active + 1); mark(); } }
        else if (e.key === "ArrowUp") { e.preventDefault(); if (items.length) { active = Math.max(0, active - 1); mark(); } }
        else if (e.key === "Enter") { e.preventDefault(); if (items[active]) P.select(items[active]); }
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
      if (!p.nome || !p.cognome) { profMsg("Inserisci almeno nome e cognome."); return; }
      if (!p.comando) { profMsg("Scegli il comando di appartenenza."); return; }
      if (p.cf && !/^[A-Z0-9]{16}$/.test(p.cf)) { profMsg("Il codice fiscale deve avere 16 caratteri."); return; }
      const i = list.findIndex(x => x.id === p.id);
      if (i >= 0) list[i] = p; else list.push(p);
      if (!profStore(list)) { profMsg("Impossibile salvare: il browser blocca la memoria locale."); return; }
      profActiveId = p.id; profSetActive(p.id);
      profRenderSelect();
      profMsg("Utente salvato su questo dispositivo.");
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
      }).catch(() => {
        home.update("Impossibile caricare l'elenco comandi. Riprova più tardi.");
        dest.update("Impossibile caricare l'elenco comandi. Riprova più tardi.");
      });
    }
    avviaDati();

    /* ---------- step 2: tile ---------- */
    root.querySelectorAll("#fcTipoTiles .tile").forEach(t => {
      t.addEventListener("click", function () {
        currentTipo = this.dataset.tipo;
        root.querySelectorAll("#fcTipoTiles .tile").forEach(x => x.classList.toggle("selected", x === this));
      });
    });

    /* ---------- righe dinamiche ---------- */
    function addPersonRow(targetId) {
      const list = $(targetId);
      const row = document.createElement("div");
      row.className = "person-row";
      row.innerHTML = '<input type="text" class="person-input" placeholder="Nome Cognome (qualifica)">'
        + '<button type="button" class="row-remove-btn" aria-label="Rimuovi">\u2715</button>';
      row.querySelector(".row-remove-btn").addEventListener("click", () => row.remove());
      list.appendChild(row);
    }
    function addTimbraturaRow(targetId) {
      const list = $(targetId);
      const row = document.createElement("div");
      row.className = "timb-row";
      row.innerHTML = '<div class="tfield"><label>Data/ora ingresso</label><input type="datetime-local" class="timb-in"></div>'
        + '<div class="tfield"><label>Data/ora uscita</label><input type="datetime-local" class="timb-out"></div>'
        + '<button type="button" class="row-remove-btn" aria-label="Rimuovi">\u2715</button>';
      row.querySelector(".row-remove-btn").addEventListener("click", () => row.remove());
      list.appendChild(row);
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
        + '<button type="button" class="row-remove-btn" aria-label="Rimuovi">\u2715</button>';
      if (tipo) row.querySelector(".leg-tipo").value = tipo;
      row.querySelector(".row-remove-btn").addEventListener("click", () => row.remove());
      list.appendChild(row);
    }
    root.querySelectorAll(".add-row-btn[data-add]").forEach(btn => {
      btn.addEventListener("click", function () {
        const kind = this.dataset.add, target = this.dataset.target;
        if (kind === "person") addPersonRow(target);
        else if (kind === "timbratura") addTimbraturaRow(target);
        else if (kind === "leg") addLegRow(target);
      });
    });
    addPersonRow("fcMsPersonaleList");
    addPersonRow("fcSsPersonaleList");
    addPersonRow("fcSrPersonaleList");
    addTimbraturaRow("fcTmDateList");
    addLegRow("fcGdLegList", "Andata");
    addLegRow("fcGdLegList", "Ritorno");

    $("fcGdIncludiMissione").addEventListener("change", function () { $("fcGdMissioneBox").classList.toggle("hidden", !this.checked); });

    function getPersonList(listId) { return Array.from(root.querySelectorAll("#" + listId + " .person-input")).map(i => i.value.trim()).filter(Boolean); }

    /* ---------- navigazione ---------- */
    const stepsBar = $("fcStepsBar");
    for (let i = 1; i <= 5; i++) { const d = document.createElement("div"); d.className = "cm-dot"; d.dataset.step = i; stepsBar.appendChild(d); }

    function renderStepsBar() {
      stepsBar.querySelectorAll(".cm-dot").forEach(d => {
        const n = Number(d.dataset.step);
        d.classList.toggle("done", n < currentStep);
        d.classList.toggle("active", n === currentStep);
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

    function showStep(n) {
      currentStep = n;
      root.querySelectorAll(".cm-step").forEach(s => s.classList.toggle("hidden", s.id !== "fcStep" + n));
      if (n === 3) showDetailBlock();
      if (n === 4) showOptionsBlocks();
      if (n === 5) generatePreview();
      renderStepsBar();
      root.scrollIntoView({block: "start", behavior: "smooth"});
    }

    function goNext() {
      if (currentStep === 1) {
        syncMittente();
        if (!MITTENTE.nome || !MITTENTE.cognome) { profDet.open = true; alert("Scegli un utente o inserisci nome e cognome."); return; }
        if (!currentComando) {
          if (stessoChk.checked) { profDet.open = true; alert("Imposta il comando di appartenenza in Dati utente, oppure togli la spunta e scegli un altro comando."); }
          else alert("Seleziona il comando destinatario.");
          return;
        }
      }
      if (currentStep === 2 && !currentTipo) { alert("Seleziona il tipo di comunicazione."); return; }
      showStep(Math.min(5, currentStep + 1));
    }
    function goBack() { showStep(Math.max(1, currentStep - 1)); }

    root.querySelectorAll("[data-next]").forEach(b => b.addEventListener("click", goNext));
    root.querySelectorAll("[data-back]").forEach(b => b.addEventListener("click", goBack));
    $("fcGoSummary").addEventListener("click", goNext);
    $("fcRestart").addEventListener("click", () => showStep(1));

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
      const motivo = val("fcTmMotivo");
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
      const to = testMode ? TEST_ADDRESS : realTo;
      const subject = testMode ? "[TEST] " + built.subject : built.subject;
      let body = built.body;
      if (testMode) body = "*** MODALITA TEST - destinatario reale sarebbe: " + (realTo || "- non determinato -") + " ***\n\n" + body;
      $("fcPrevTo").value = to || "";
      $("fcPrevSubject").value = subject || "";
      $("fcPrevBody").value = body || "";
    }

    /* ---------- modalita TEST ---------- */
    const testBar = $("fcTestBar"), testToggle = $("fcTestToggle"), testLabel = $("fcTestLabel");
    function applyTestUi() {
      testBar.classList.toggle("off", !testMode);
      testToggle.textContent = testMode ? "Disattiva TEST" : "Attiva TEST";
      testLabel.textContent = testMode ? "MODALITA TEST ATTIVA - le email vanno a " + TEST_ADDRESS : "Modalita reale - le email vanno ai destinatari effettivi";
    }
    testToggle.addEventListener("click", () => { testMode = !testMode; applyTestUi(); if (currentStep === 5) generatePreview(); });
    applyTestUi();

    /* ---------- invio ---------- */
    $("fcBtnMailto").addEventListener("click", () => {
      generatePreview();
      const to = $("fcPrevTo").value, subject = $("fcPrevSubject").value, body = $("fcPrevBody").value;
      if (!to) { alert('Seleziona prima un comando (passo 1) o verifica il campo "A:".'); return; }
      window.location.href = "mailto:" + encodeURIComponent(to) + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
    });
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
    showStep(1);
  }

  if (window.FireOps && window.FireOps.registra) {
    window.FireOps.registra({id: "comunicazioni", css, html, init});
  }
})();