/* ==========================================================
   TRIAGE SCHEDE DIFFERIBILI — differibili.js
   Da incollare in fondo a style.css, sezione MODULI AGGIUNTIVI.
   ========================================================== */

#differibili .pagina-box { display: flex; flex-direction: column; gap: 10px; }
#diff-app { display: flex; flex-direction: column; gap: 10px; min-height: 0; flex: 1 1 auto; }

/* Ruoli: la DR non vede i comandi di scrittura, il Comando non vede il
   filtro per Comando. Il backend rifiuta comunque, questo è solo ordine. */
#diff-app .diff-solo-dr { display: none; }
#diff-app.diff-ruolo-dr .diff-solo-dr { display: flex; }
#diff-app.diff-ruolo-dr .diff-solo-comando,
#diff-app:not(.diff-ruolo-comando) .diff-solo-comando { display: none; }

/* Barra: a sinistra cosa si guarda, a destra cosa si fa. Va a capo da
   sola quando il pannello è stretto, senza tagliare i pulsanti. */
.diff-barra { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between;
  gap: 8px 16px; }
.diff-barra-sx { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; min-width: 0; }
.diff-sel-emergenza { min-width: 260px; font-weight: bold; }
.diff-ruolo { font-size: 13px; padding: 4px 8px; border-radius: 6px;
  border: 1px solid var(--border-color, #555); }
.diff-check { margin: 4px 0; font-size: 13px; }
.diff-azioni { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; }
.diff-azioni button { white-space: nowrap; }
.diff-azioni button:disabled { opacity: .45; cursor: not-allowed; }
.diff-sep { width: 1px; align-self: stretch; background: var(--border-color, #555); margin: 0 4px; }
.diff-rosso { border-color: var(--danger-color, #AF2B1E) !important; color: var(--danger-color, #e57368) !important; }
.btn-whatsapp.diff-rosso { background: var(--danger-color, #AF2B1E) !important; color: #fff !important; }
.diff-errore { color: var(--danger-color, #e57368); font-size: 13px; margin: 4px 0; }
.diff-riga { display: flex; gap: 6px; }
.diff-riga input { flex: 1 1 auto; min-width: 0; }

/* Riquadri sopra la carta: l'import e la carta vuota non spostano il layout. */
.diff-card { position: absolute; z-index: 700; top: 12px; left: 56px; width: min(440px, calc(100% - 80px));
  max-height: calc(100% - 24px); overflow-y: auto; padding: 12px 14px; border-radius: 10px;
  background: var(--dark-color, #1e1e1e); border: 1px solid var(--border-color, #555);
  box-shadow: 0 4px 18px rgba(0, 0, 0, .5); }
.diff-card[hidden] { display: none; }
.diff-card-testa { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.diff-x { background: none; border: 0; color: inherit; font-size: 20px; cursor: pointer; line-height: 1; }
.diff-passo { display: flex; gap: 10px; margin: 10px 0; }
.diff-passo-n { flex: 0 0 22px; height: 22px; border-radius: 50%; display: flex; align-items: center;
  justify-content: center; font-size: 12px; font-weight: bold; background: #fdd835; color: #000; }
.diff-passo-corpo { flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; gap: 5px; }
.diff-passo-corpo label { font-size: 13px; }
.diff-oppure { opacity: .8; margin-top: 4px; }
.diff-anteprima { font-size: 13px; margin: 6px 0 6px 32px; }
.diff-anteprima ul { margin: 4px 0 0 18px; padding: 0; }
.diff-vuoto { text-align: center; left: 50%; top: 50%; transform: translate(-50%, -50%); width: min(360px, 90%); }
.diff-vuoto p { margin: 6px 0 12px; font-size: 13px; opacity: .85; }
.diff-guida { position: absolute; z-index: 650; left: 50%; bottom: 28px; transform: translateX(-50%);
  padding: 7px 12px; border-radius: 8px; font-size: 13px; background: rgba(0, 0, 0, .78); color: #fff;
  max-width: calc(100% - 40px); text-align: center; }
.diff-guida[hidden] { display: none; }
.diff-sfondo { position: absolute; z-index: 500; top: 10px; right: 10px; }

/* La carta prende tutta l'altezza che resta sotto la barra. */
/* L'altezza la imposta differibili.js (adattaAltezza) sullo spazio
   rimasto fino al fondo della finestra: qui resta solo un minimo. */
/* Carta 2/3, colonna dei settori 1/3. */
.diff-corpo { display: grid; grid-template-columns: minmax(0, 2fr) minmax(300px, 1fr); gap: 12px;
  align-items: start; }
.diff-mapwrap { position: relative; height: 480px; min-height: 320px; border-radius: 8px;
  overflow: hidden; border: 1px solid var(--border-color, #555); }
#diff-mappa { position: absolute; inset: 0; }

.diff-lato { overflow-y: auto; font-size: 13px; }
.diff-lato h4 { margin: 12px 0 6px; }
.diff-numeri { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; margin-bottom: 8px; }
.diff-numeri div { border: 1px solid var(--border-color, #555); border-radius: 6px; padding: 6px;
  text-align: center; }
.diff-numeri b { display: block; font-size: 20px; }
.diff-numeri span { font-size: 11px; opacity: .8; }
.diff-leg { display: grid; grid-template-columns: auto 12px 1fr auto; align-items: center;
  gap: 6px; padding: 3px 0; cursor: pointer; }
.diff-leg i, .diff-gruppo > i { width: 12px; height: 12px; border-radius: 50%; border: 1.5px solid #fff; }
.diff-gruppo { display: flex; align-items: center; gap: 6px; padding: 5px 0;
  border-bottom: 1px solid var(--border-color, #444); }
.diff-gruppo > i { border-radius: 3px; flex: 0 0 auto; }
.diff-gruppo span { flex: 1 1 auto; min-width: 0; }
.diff-gruppo small { display: block; opacity: .75; }
.diff-gruppo button { padding: 3px 6px; }
.diff-stato { white-space: pre-line; min-height: 1.2em; margin: 0; }

/* Il popup Leaflet è chiaro: il testo resta scuro anche col tema scuro. */
.diff-pop { color: #222; font-size: 12.5px; line-height: 1.45; }
.diff-pop b { font-size: 13px; }
.diff-pop-note { font-style: italic; margin: 3px 0; }
.diff-pop-dati { display: flex; flex-direction: column; margin: 5px 0; color: #555; }
.diff-badge { background: #AF2B1E; color: #fff; font-size: 10.5px; padding: 1px 5px;
  border-radius: 3px; margin-left: 4px; }

.diff-num span { display: flex; align-items: center; justify-content: center; width: 22px;
  height: 22px; border-radius: 50%; color: #fff; font: bold 11px/1 sans-serif;
  border: 1.5px solid #fff; box-shadow: 0 0 0 1px #000; }

.diff-modale { position: fixed; inset: 0; z-index: 3000; background: rgba(0, 0, 0, .55);
  display: flex; align-items: center; justify-content: center; }
.diff-modale[hidden] { display: none; }
.diff-modale-box { background: var(--dark-color, #1e1e1e); border: 1px solid var(--border-color, #555);
  border-radius: 10px; padding: 16px; width: min(420px, 92vw); display: flex;
  flex-direction: column; gap: 10px; }
.diff-modale-titolo { font-weight: bold; }
.diff-modale-testo { white-space: pre-line; }
.diff-modale-azioni { display: flex; justify-content: flex-end; gap: 8px; }

/* In fullscreen la carta prende tutta l'altezza disponibile. */
.pannello-fullscreen #differibili .pagina-box { height: 100%; }
.pannello-fullscreen .diff-corpo { min-height: 0; }

@media (max-width: 760px) {
  .diff-corpo { grid-template-columns: 1fr; }
  .diff-campo select { min-width: 0; width: 100%; }
}

/* ---------------------------- STAMPA ----------------------------
   A4 orizzontale, margini 10 mm: area utile 277 × 190 mm. La prima pagina
   è testata + carta a riempire il resto; la seconda la tabella.
   Le misure valgono anche a schermo: durante la preparazione (diff-prep)
   il foglio esiste fuori vista con queste stesse dimensioni, e la carta
   si inquadra sulle misure vere della pagina. */
#diff-stampa-doc { display: none; color: #000; background: #fff; }
body.diff-prep #diff-stampa-doc { display: block; position: fixed; left: -30000px; top: 0; width: 277mm; }
/* Prima pagina: solo la carta, a pagina piena. Titolo e dati stanno in un
   cartiglio dentro la carta, in basso a sinistra, che non occupa spazio. */
#diff-stampa-doc .dp-pagina-carta { height: 190mm; position: relative; }
#diff-stampa-doc .dp-pagina-carta .dp-mappa { position: absolute; inset: 0; }
#diff-stampa-doc .dp-cartiglio { position: absolute; left: 3mm; bottom: 3mm; z-index: 1000;
  padding: 1.2mm 2.5mm; background: rgba(255, 255, 255, .92); border: .3mm solid #000;
  font: 8.5pt/1.3 sans-serif; color: #000; max-width: 70%; }
#diff-stampa-doc .dp-testata { flex: 0 0 auto; height: 16mm; overflow: hidden; }
#diff-stampa-doc .dp-testata h1 { font-size: 15pt; margin: 0 0 1.5mm; white-space: nowrap;
  overflow: hidden; text-overflow: ellipsis; }
#diff-stampa-doc .dp-testata p { font-size: 9pt; margin: 0; }
#diff-stampa-doc .dp-mappa { flex: 1 1 auto; position: relative; min-height: 0; }
#diff-stampa-doc .diff-mapwrap { position: absolute; inset: 0; border: .3mm solid #000;
  min-height: 0; height: auto !important; }
#diff-stampa-doc .diff-sfondo, #diff-stampa-doc .diff-card, #diff-stampa-doc .diff-guida,
#diff-stampa-doc .diff-avviso, #diff-stampa-doc .leaflet-control-zoom { display: none !important; }
#diff-stampa-doc .dp-tab { width: 100%; border-collapse: collapse; font-size: 8pt; }
#diff-stampa-doc .dp-tab th, #diff-stampa-doc .dp-tab td { border: .2mm solid #888;
  padding: 1mm 1.5mm; vertical-align: top; text-align: left; }
#diff-stampa-doc .dp-tab thead { display: table-header-group; }
#diff-stampa-doc .dp-tab tr { break-inside: avoid; }
#diff-stampa-doc .dp-n span { display: inline-block; min-width: 5mm; text-align: center;
  color: #fff; border-radius: 3mm; font-weight: bold; }
@page differibili { size: A4 landscape; margin: 10mm; }
@media print {
  body.diff-stampa > *:not(#diff-stampa-doc) { display: none !important; }
  /* La testata fissa di FireOps lascia al body un margine in alto: in
     stampa va azzerato, o la carta parte a metà pagina. */
  html, body.diff-stampa { margin: 0 !important; padding: 0 !important; height: auto !important;
    min-height: 0 !important; overflow: visible !important; background: #fff !important; }
  body.diff-stampa #diff-stampa-doc { display: block; position: static; left: auto; width: auto; }
  #diff-stampa-doc .dp-pagina { page: differibili; break-after: page; }
  #diff-stampa-doc .dp-pagina:last-child { break-after: auto; }
  #diff-stampa-doc .dp-n span, #diff-stampa-doc .diff-num span, .diff-etichetta-gruppo span {
    -webkit-print-color-adjust: exact; print-color-adjust: exact; }
}

/* --- aggiunte: scelta emergenza nell'import e pulsanti del modale --- */
.diff-emergenza-scelta b { font-size: 14px; }
.diff-derivato-breve { opacity: .8; font-size: 13px; }
.diff-modale-scelte { display: flex; flex-direction: column; gap: 6px; }
.diff-modale-scelte:empty { display: none; }
.diff-scelta { display: flex; flex-direction: column; align-items: flex-start; gap: 2px;
  text-align: left; padding: 8px 10px; border-radius: 6px; cursor: pointer;
  background: transparent; color: inherit; border: 1px solid var(--border-color, #555); }
.diff-scelta:hover, .diff-scelta:focus-visible { border-color: #fdd835; }
.diff-scelta span { font-size: 12px; opacity: .8; }

/* Sempre a schermo intero come la SITAC: niente "Espandi/Riduci", si esce
   con "Chiudi" nella barra. Il pulsante resta nel DOM perché è quello che
   differibili.js preme per entrare in modalità esclusiva. */
#differibili .btn-fullscreen-pagina { display: none !important; }
#differibili .pagina-box { padding-bottom: 6px; }
#differibili .pagina-box-header { margin-bottom: 4px; }
.diff-stato { margin-top: -4px; }

/* Avviso di aggiornamento sulla carta */
.diff-avviso { position: absolute; left: 50%; top: 10px; transform: translateX(-50%); z-index: 600;
  display: flex; align-items: center; gap: 10px; padding: 7px 10px 7px 14px; border-radius: 8px;
  background: var(--dark-color, #1e1e1e); border: 1.5px solid #fdd835; font-size: 13px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, .45); max-width: calc(100% - 140px); }
.diff-avviso[hidden] { display: none; }
.diff-avviso button { padding: 3px 8px; }
.diff-avviso-x { background: none; border: 0; color: inherit; font-size: 18px; cursor: pointer; }

/* Nota e intestazione della sezione non servono a schermo intero. */
#differibili .pagina-box-header { display: none; }

/* --- Settori e sottosettori --- */
.diff-settore { display: flex; align-items: center; gap: 6px; padding: 7px 0 4px; margin-top: 4px;
  border-top: 1px solid var(--border-color, #444); }
.diff-settore > i { width: 12px; height: 12px; border-radius: 3px; flex: 0 0 auto; border: 1.5px solid #fff; }
.diff-settore span { flex: 1 1 auto; min-width: 0; }
.diff-settore small, .diff-gruppo small { display: block; opacity: .75; }
.diff-lato .diff-gruppo { padding: 3px 0 3px 18px; border-bottom: 0; }
.diff-etichetta-gruppo span { display: inline-block; transform: translate(-50%, -50%); white-space: nowrap;
  padding: 2px 7px; border-radius: 5px; border: 2px solid; background: rgba(255, 255, 255, .9);
  color: #111; font: bold 12px/1.2 sans-serif; box-shadow: 0 1px 4px rgba(0, 0, 0, .35); }

/* --- Pulsanti tutti uguali, come "Chiudi": stessa altezza, stesso corpo --- */
.diff-azioni .btn-toggle-radar { height: 34px; padding: 0 12px; font-size: 13px; line-height: 1;
  display: inline-flex; align-items: center; gap: 6px; }
.diff-mini { height: 26px; min-width: 30px; padding: 0 6px !important; font-size: 13px;
  display: inline-flex; align-items: center; justify-content: center; }

/* --- Selettore dell'emergenza a larghezza fissa: il CODEM si legge intero --- */
.diff-sel-emergenza { width: 380px; min-width: 380px; max-width: 100%;
  font-family: ui-monospace, Consolas, monospace; letter-spacing: .02em; }
@media (max-width: 760px) { .diff-sel-emergenza { width: 100%; min-width: 0; } }
@media print { .diff-etichetta-gruppo span { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }

/* --- Menu del tasto destro sulle schede --- */
.diff-menu { position: absolute; z-index: 800; min-width: 210px; max-width: 280px; padding: 4px 0;
  border-radius: 8px; background: var(--dark-color, #1e1e1e); border: 1px solid var(--border-color, #555);
  box-shadow: 0 4px 16px rgba(0, 0, 0, .5); font-size: 13px; }
.diff-menu[hidden] { display: none; }
.diff-menu button { display: block; width: 100%; text-align: left; padding: 6px 12px; border: 0;
  background: none; color: inherit; cursor: pointer; font-size: 13px; }
.diff-menu button:hover { background: rgba(255, 255, 255, .08); }
.diff-menu-tit { margin: 4px 0 2px; padding: 4px 12px 2px; font-weight: bold; opacity: .85;
  border-top: 1px solid var(--border-color, #444); }
.diff-menu-tit:first-child { border-top: 0; }
.diff-menu-nota { margin: 2px 12px 6px; opacity: .7; font-size: 12px; }

/* --- Punti aggregati: badge col numero di schede, più grande e più caldo
   man mano che crescono (d1 < 10, d2 < 50, d3 < 100, d4 < 250, d5 oltre) --- */
.diff-cluster span { display: flex; align-items: center; justify-content: center; width: 100%; height: 100%;
  border-radius: 50%; color: #fff; font: bold 12px/1 sans-serif; border: 2px solid rgba(255, 255, 255, .9);
  cursor: pointer; text-shadow: 0 1px 2px rgba(0, 0, 0, .5); }
.diff-cluster.d1 span { background: rgba(46, 125, 50, .9); }
.diff-cluster.d2 span { background: rgba(249, 168, 37, .92); font-size: 13px; }
.diff-cluster.d3 span { background: rgba(245, 124, 0, .92); font-size: 14px; }
.diff-cluster.d4 span { background: rgba(229, 57, 53, .92); font-size: 15px; }
.diff-cluster.d5 span { background: rgba(142, 36, 170, .92); font-size: 16px; }
.diff-cluster:hover span { filter: brightness(1.12); }

/* --- Tabella dei settori: Settore → Worksite → Sotto-settore --- */
.diff-tab-settori { width: 100%; border-collapse: collapse; font-size: 13px; }
.diff-tab-settori th { text-align: left; font-size: 11px; font-weight: normal; opacity: .7;
  padding: 4px 6px; border-bottom: 1px solid var(--border-color, #555); }
.diff-tab-settori td { padding: 4px 6px; vertical-align: middle; border-bottom: 1px solid rgba(255, 255, 255, .06); }
.diff-tab-nome { cursor: pointer; }
.diff-tab-nome:hover { text-decoration: underline; }
.diff-tab-nome i { display: inline-block; width: 11px; height: 11px; border-radius: 3px; margin-right: 6px;
  vertical-align: -1px; border: 1.5px solid #fff; }
.diff-tab-num { text-align: right; font-variant-numeric: tabular-nums; width: 3.5em; }
.diff-tab-azioni { text-align: right; white-space: nowrap; width: 1%; }
.diff-tab-azioni .diff-mini { margin-left: 3px; }
.diff-liv-settore td { background: rgba(255, 255, 255, .06); font-size: 14px; padding-top: 7px; padding-bottom: 7px; }
.diff-liv-ws .diff-tab-nome { padding-left: 20px; }
.diff-liv-ss .diff-tab-nome { padding-left: 36px; opacity: .95; }
.diff-tab-settori tr.sel td { background: rgba(253, 216, 53, .18); }
.diff-tab-settori tr.sel .diff-tab-nome { color: #fdd835; }
.diff-etichetta-gruppo { cursor: pointer; }
.diff-etichetta-gruppo.sel span { background: #fdd835; box-shadow: 0 0 0 2px #000, 0 2px 6px rgba(0, 0, 0, .5); }

/* --- Modifica del perimetro: barra Salva/Annulla in alto al centro --- */
.diff-barra-modifica { position: absolute; z-index: 760; top: 10px; left: 50%; transform: translateX(-50%);
  display: flex; gap: 8px; padding: 6px; border-radius: 8px; background: var(--dark-color, #1e1e1e);
  border: 1.5px solid #fdd835; box-shadow: 0 2px 10px rgba(0, 0, 0, .5); }
.diff-barra-modifica[hidden] { display: none; }
.diff-barra-modifica .btn-toggle-radar { height: 32px; padding: 0 12px; }