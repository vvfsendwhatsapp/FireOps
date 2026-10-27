/*!
 * FireOps VVF — prospetto.js — Prospetto disponibilità (solo index-bis.html, IN COSTRUZIONE)
 * Dipendenze: fireops-core.js (window.FireOps.turniDelGiorno) · script.js (window.FireOpsComandoAttivo)
 * Markup:     sezione #prospetto-disponibilita di index-bis.html (il contenuto lo costruisce questo file in #pros-app)
 * Stile:      style.css, sezione "PROSPETTO DISPONIBILITA'"
 *
 * COSA FA
 *  - Legge da PUMA (foglio "PUMA VVF Database Personale", scheda "Elenco_Personale", tutti i comandi)
 *    il personale con qualifica, comando e corsi in possesso; per chi si e' registrato piu' volte vale
 *    la registrazione piu' recente. L'email non si chiede; il codice fiscale (attaccato al nominativo
 *    nella colonna B) serve solo a riconoscere i doppioni e viene scartato subito.
 *  - Filtra per comando, un corso alla volta (elenco a comparsa), qualifica e testo.
 *  - Turno e salto turno su PUMA non ci sono: si impostano qui, persona per persona, e si salvano
 *    sul foglio Google "DB_Turni_Personale" (apps-script/prospetto.gs, Web App di Messaggistica),
 *    con una copia locale per lavorare anche senza rete. Modificare turni e salti richiede la password
 *    (scheda "Gestione personale"), che controlla lo script sul foglio.
 *  - Nella Gestione personale ogni persona ha, settore per settore (SAF, SSA, NBCR, ...), i ruoli Magazziniere,
 *    Magazziniere di turno, Responsabile operativo provinciale o Non operativo; il non operativo di un settore
 *    esce da prospetto e richiamo quando si sceglie un corso di quel settore.
 *  - Nella Gestione personale si aggiungono anche nominativi che non sono su PUMA, con qualifica, cellulare e corsi.
 *  - Schede, in quest'ordine: Gestione personale, Prospetto, Richiamo. Prospetto (colonne A, B, C, D, G, N.O. con qualifica e nominativo), Gestione personale (turni e salti, con password),
 *    Richiamo specializzati (adesso / +12 / +24 ore: turno libero e salti del turno, del precedente e del seguente).
 */
(function () {
'use strict';
const NS = (window.FireOps = window.FireOps || {});
if (NS.Prospetto) return;

/* ============================== COSTANTI ============================== */

const SHEET_ID = '1WHGKaawomU_jMuO6FnwzYidou-fmpc0ndeE0aiEMYP4';
// scheda "Elenco_Personale": tutti i comandi, una riga per registrazione, la piu' recente in alto
const GID = '84413100';
// A Data · B "Cognome Nome - Codice Fiscale" · C Comando · D Qualifica · F Cellulare · G Corsi (l'email, colonna E, non si chiede)
const QUERY = 'select A,B,C,D,F,G';
const URL_PUMA = 'https://docs.google.com/spreadsheets/d/' + SHEET_ID + '/gviz/tq?tqx=out:csv&headers=1&gid=' + GID +
  '&tq=' + encodeURIComponent(QUERY);

const WEBAPP = 'https://script.google.com/macros/s/AKfycbyp6jQ331Yk5q7_hkM74ZyhUh1c3zQUJG7SpuoE18HslBO36YKSTYIQf-z7gSwXR4Yv/exec';
const LS_TURNI = 'fireops_prospetto_turni';   // copia locale {chiavePersona: {t: 'A', s: '4', ts: ms}}
const LS_CODA = 'fireops_prospetto_coda';     // chiavi modificate e non ancora salvate sul foglio
const SYNC_MS = 120000;                       // ogni quanto si rilegge il foglio
const LS_FILTRI = 'fireops_prospetto_filtri';
const TURNI = ['A', 'B', 'C', 'D', 'G', 'NO'];          // NO = Non Operativo
const NOME_TURNO = t => t === 'NO' ? 'N.O.' : t;
const SENZA_SALTO = t => t === 'G' || t === 'NO';
const SS_PWD = 'fireops_prospetto_pwd2';                  // password per Comando della Gestione personale (solo per questa sessione)
const SALTI = ['1', '2', '3', '4', '5', '6', '7', '8'];
const ORDINE_QUAL = ['D', 'DS', 'IA', 'CR', 'CSE', 'CS', 'VC', 'VESC', 'VE', 'VF'];
// SETTORI (come la colonna "Categoria" della scheda Formazione di PUMA): ogni corso appartiene a un settore
const SETTORI = [
  ['SAF', 'SAF (Speleo Alpino Fluviale)', /^(saf|negh|evac)/],
  ['SSA', 'SSA (Soccorso Subacqueo e Acquatico)', /^(atp|sfa|smzt)/],
  ['USAR', 'USAR (Urban Search And Rescue)', /^usar/],
  ['TPSS', 'TPSS (Primo Soccorso Sanitario)', /^tpss/],
  ['OSO', 'OSO (Operatore Sala Operativa)', /^oso/],
  ['TAS', 'TAS (Topografia Applicata al Soccorso)', /^tas/],
  ['CFBT', 'CFBT (Compartment Fire Behaviour)', /^cfbt/],
  ['NBCR', 'NBCR (Nucleare Biologico Chimico Radiologico)', /^nbcr/],
  ['APR', 'APR (Aeromobili a Pilotaggio Remoto)', /^apr/],
  ['K9', 'Cinofili K9', /^cinofil/],
  ['PT', 'Patenti terrestri', /^patenteterrestre/],
  ['MMT', 'Macchine movimento terra', /^mmt|^movimentoterra/],
  ['PN', 'Patenti nautiche', /^patentenautica/]
];
const NOME_SETTORE = Object.fromEntries(SETTORI.map(([k, n]) => [k, n]));
function settoreDi(corso) {
  // si guarda la sigla prima della parentesi: "SA (Soccorritore Acquatico)" -> "sa"
  const sig = norm(String(corso || '').split('(')[0]), tutto = norm(corso);
  if (sig === 'sa' || sig === 'atp' || sig === 'sfa' || sig === 'smzt') return 'SSA';
  for (const [k, , re] of SETTORI) if (re.test(sig) || re.test(tutto)) return k;
  return '';
}
function settoriDi(p) { return Array.from(new Set(p.corsi.map(settoreDi).filter(Boolean))); }
// RUOLI per settore: una persona puo' averne piu' d'uno; N.O. (non operativo per quel settore) esclude gli altri
// in quest'ordine anche negli elenchi: col settore scelto, prima il funzionario, poi ROP, magazziniere generale, magazziniere di turno
const RUOLI = [['FUN', 'Funzionario di settore', 'Funz.'], ['ROP', 'Responsabile operativo provinciale', 'ROP'], ['MAG', 'Magazziniere generale', 'Mag. gen.'], ['MAGT', 'Magazziniere di turno', 'Mag. turno'], ['NO', 'Non operativo', 'N.O.']];
const ORDINE_RUOLI = ['FUN', 'ROP', 'MAG', 'MAGT'];
// posizione di una persona negli elenchi del settore scelto: il suo ruolo piu' alto (99 = nessun ruolo)
function rangoRuolo(p, settore) {
  if (!settore) return 99;
  const l = ruoliDi(p, settore), i = ORDINE_RUOLI.findIndex(x => l.includes(x));
  return i < 0 ? 99 : i;
}
const NOME_RUOLO = Object.fromEntries(RUOLI.map(([k, n]) => [k, n]));
const SIGLA_RUOLO = Object.fromEntries(RUOLI.map(([k, , s]) => [k, s]));
function ruoliDi(p, settore) { const r = (turni[p.k] || {}).r || {}; return settore ? (r[settore] || []) : r; }
function nonOperativo(p, settore) { return !!settore && ruoliDi(p, settore).includes('NO'); }
// etichette dei ruoli: per un settore solo i suoi, senza settore tutti con la sigla del settore
function htmlRuoli(p, settore) {
  if (settore) return ruoliDi(p, settore).map(x => `<span class="pros-ruolo r-${x}" title="${esc(NOME_RUOLO[x] + ' · ' + NOME_SETTORE[settore])}">${esc(SIGLA_RUOLO[x])}</span>`).join('');
  return Object.entries(ruoliDi(p)).flatMap(([st, l]) => l.map(x => `<span class="pros-ruolo r-${x}" title="${esc(NOME_RUOLO[x] + ' · ' + (NOME_SETTORE[st] || st))}">${esc(SIGLA_RUOLO[x])} ${esc(st)}</span>`)).join('');
}
function testoRuoli(p, settore) {
  const r = ruoliDi(p);
  return Object.entries(r).filter(([st]) => !settore || st === settore).flatMap(([st, l]) => l.map(x => NOME_RUOLO[x] + ' ' + st)).join(', ');
}
let modRuoli = null;       // gestione: chiave della persona di cui si stanno modificando i ruoli per settore
const NOMI_STATO = {servizio: 'In servizio', salto: 'Salto turno', libero: 'Libero', no: 'Non operativo', nd: 'Turno da impostare'};

/* ============================== STATO ============================== */

let root = null;
let righePuma = [];        // personale letto da PUMA (deduplicato)
let righe = [];            // PUMA + nominativi aggiunti a mano (vedi ricomponi)
let modMan = null;         // gestione: chiave del nominativo manuale in modifica, 'nuovo' per uno nuovo
let carico = {stato: 'vuoto', errore: '', ora: null};
let turni = leggi(LS_TURNI, {});
let coda = leggi(LS_CODA, []);                // [chiave, ...]
let sync = {stato: '', errore: '', ora: null};
let nomi = {};                                // chiave → {comando, cognome, nome} per l'invio al foglio
// password per Comando: {comandoNormalizzato: password, '*': password generale}; restano solo in questa sessione
let pwds = (() => { try { return JSON.parse(sessionStorage.getItem(SS_PWD) || '{}') || {}; } catch (e) { return {}; } })();
let sblocco = {stato: '', errore: ''};   // '', 'verifica', 'ok', 'err'
function comandoDiChiave(k) { return String(k || '').split('|')[2] || ''; }
function pwdPer(cn) { return pwds[cn] || pwds['*'] || ''; }
function puoModificare(k) { return !!pwdPer(comandoDiChiave(k)); }
function sbloccato() { return !!pwdPer(normComando(f.comando)); }
let cella = null;                                     // prospetto: {corso, turno} di cui mostrare i nomi
const f = Object.assign({comando: '', data: '', fascia: fasciaAdesso(), corso: '', qual: '', testo: '', stato: '', scheda: 'prospetto', quando: 0, senzaTurno: false},
  leggi(LS_FILTRI, {}), {data: dataAdesso(), fascia: fasciaAdesso()});
delete f.corsi; delete f.tutti;   // filtri della prima versione (piu' corsi insieme)
f.stato = '';   // il filtro per stato della prima versione non c'e' piu'

/* ============================== UTILITA' ============================== */

function leggi(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
function scrivi(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage pieno o bloccato */ } }
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c])); }
function norm(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, ''); }
function normComando(s) { return norm(String(s || '').replace(/^\s*(comando|direzione)\s+(provinciale\s+)?(vvf\s+)?(di\s+)?/i, '')); }
function oggiISO() { return new Date().toLocaleDateString('sv-SE', {timeZone: 'Europe/Rome'}); }
function oraRoma() { return +new Date().toLocaleString('en-GB', {timeZone: 'Europe/Rome', hour: '2-digit', hour12: false}) % 24; }
function fasciaAdesso() { const h = oraRoma(); return (h >= 8 && h < 20) ? 'giorno' : 'notte'; }
// fra mezzanotte e le 8 il turno di notte in corso e' quello montato la sera prima
function dataAdesso() { return oraRoma() < 8 ? new Date(Date.now() - 864e5).toLocaleDateString('sv-SE', {timeZone: 'Europe/Rome'}) : oggiISO(); }
function salvaFiltri() { scrivi(LS_FILTRI, {comando: f.comando, corso: f.corso, qual: f.qual, stato: f.stato, scheda: f.scheda}); }
// chiave della persona: cognome|nome|comando (niente cellulare: la chiave finisce sul foglio)
function chiave(p) { return norm(p.cognome).slice(0, 60) + '|' + norm(p.nome).slice(0, 60) + '|' + normComando(p.comando).slice(0, 60); }
function titolo(s) { return String(s || '').trim().toLowerCase().replace(/(^|[\s'’-])(\p{L})/gu, (m, a, b) => a + b.toUpperCase()); }

// CSV con virgolette (formato gviz)
function parseCSV(t) {
  const out = []; let r = [], c = '', q = false;
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    if (q) { if (ch === '"') { if (t[i + 1] === '"') { c += '"'; i++; } else q = false; } else c += ch; }
    else if (ch === '"') q = true;
    else if (ch === ',') { r.push(c); c = ''; }
    else if (ch === '\n') { r.push(c); out.push(r); r = []; c = ''; }
    else if (ch !== '\r') c += ch;
  }
  if (c || r.length) { r.push(c); out.push(r); }
  return out;
}

// "TPSS (Tecniche ..., ...), SAF (...) BASICO, " → ['TPSS (...)', 'SAF (...) BASICO']
// le virgole dentro le parentesi non separano
function dividiCorsi(s) {
  const out = []; let liv = 0, c = '';
  for (const ch of String(s || '')) {
    if (ch === '(') liv++;
    if (ch === ')') liv = Math.max(0, liv - 1);
    if ((ch === ',' || ch === ';') && liv === 0) { if (c.trim()) out.push(c.trim()); c = ''; } else c += ch;
  }
  if (c.trim()) out.push(c.trim());
  return out.map(x => x.replace(/\s+/g, ' ')).filter(c => !corsoEscluso(c));
}
// corsi di PUMA da non usare nel prospetto (non si mostrano e non si filtrano)
const CORSI_ESCLUSI = ['saf1a'];
function corsoEscluso(c) { const n = norm(c); return CORSI_ESCLUSI.some(x => n.includes(x)); }
function siglaCorso(c) { const m = String(c).match(/^([^(]+?)\s*\(/); const rest = String(c).replace(/\([^)]*\)/g, '').replace(/\s+/g, ' ').trim(); return m ? rest : c; }

/* ============================== DATI PUMA ============================== */

async function carica() {
  carico = {stato: 'carico', errore: '', ora: carico.ora}; disegna();
  try {
    const r = await fetch(URL_PUMA + '&_=' + Date.now(), {cache: 'no-store'});
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const testo = await r.text();
    if (/^\s*</.test(testo)) throw new Error('il foglio PUMA non e\' leggibile (non condiviso con link?)');
    const tab = parseCSV(testo);
    const mappa = new Map(), visti = new Set();
    tab.slice(1).forEach(c => {
      // "Cognome Nome - CODICEFISCALE": il codice fiscale serve solo a riconoscere le registrazioni
      // ripetute della stessa persona e poi si butta (non si mostra, non si salva)
      const nc = String(c[1] || ''), i = nc.lastIndexOf(' - ');
      const nominativo = (i > 0 ? nc.slice(0, i) : nc).trim(), cf = (i > 0 ? nc.slice(i + 3) : '').trim().toUpperCase();
      if (!nominativo) return;
      const id = cf || norm(nominativo);
      if (visti.has(id)) return;              // c'e' gia' la registrazione piu' recente (il foglio e' ordinato dalla piu' nuova)
      visti.add(id);
      const p = {cognome: titolo(nominativo), nome: '', cell: String(c[4] || '').replace(/[^\d+]/g, ''),
        qual: (c[3] || '').trim().toUpperCase(), comando: (c[2] || '').trim().replace(/\s+/g, ' '), corsi: dividiCorsi(c[5])};
      p.k = chiave(p);
      if (!mappa.has(p.k)) mappa.set(p.k, p);
    });
    righePuma = Array.from(mappa.values());
    ricomponi();
    scrivi(LS_TURNI, turni);
    carico = {stato: 'ok', errore: '', ora: new Date()};
    if (!f.comando) f.comando = comandoDefault();
    if (corsoEscluso(f.corso)) f.corso = '';   // filtro salvato su un corso che non si usa piu'
  } catch (e) {
    carico = {stato: 'err', errore: e.message || String(e), ora: carico.ora};
  }
  disegna();
  if (carico.stato === 'ok') { scaricaTurni(); invia(); }
}

/* ============================== NOMINATIVI AGGIUNTI A MANO ==============================
 * Chi non e' su PUMA si aggiunge dalla Gestione personale. Sta nella stessa voce dei turni, con in piu'
 *   m: '1' (attivo) / '0' (eliminato) · n: nominativo · com: comando · q: qualifica · c: cellulare · corsi: [..]
 * e viaggia sul foglio come le altre voci (vince la modifica piu' recente).
 */
function corsiDaTesto(v) { return (Array.isArray(v) ? v : String(v || '').split('|').map(x => x.trim()).filter(Boolean)).filter(c => !corsoEscluso(c)); }
function ricomponi() {
  const man = Object.entries(turni).filter(([, v]) => v && v.m === '1').map(([k, v]) => ({
    k, manuale: true, cognome: v.n || '', nome: '', cell: v.c || '', qual: String(v.q || '').toUpperCase(), comando: v.com || '', corsi: corsiDaTesto(v.corsi)
  }));
  const pumaK = new Set(righePuma.map(p => p.k));
  righe = righePuma.concat(man.filter(p => !pumaK.has(p.k)));
  righe.forEach(p => { nomi[p.k] = {comando: p.comando, cognome: p.cognome, nome: p.nome}; });
}
function chiaveManuale(nominativo, comando) {
  return norm(nominativo).slice(0, 50) + '|m' + Date.now().toString(36) + '|' + normComando(comando).slice(0, 60);
}
function salvaManuale(k, d) {
  if (!puoModificare(k)) return false;
  const prima = turni[k] || {};
  turni[k] = {t: d.t || '', s: SENZA_SALTO(d.t) ? '' : (d.s || ''), ts: Date.now(), m: '1',
    n: d.n, com: d.com, q: d.q, c: d.c, corsi: d.corsi};
  if (prima.r) turni[k].r = prima.r;
  if (prima.m === '1' && prima.t === turni[k].t && prima.s === turni[k].s) { /* solo anagrafica */ }
  scrivi(LS_TURNI, turni); metti(k); ricomponi(); programmaInvio();
  return true;
}
function eliminaManuale(k) {
  if (!puoModificare(k) || !turni[k] || turni[k].m !== '1') return;
  turni[k] = Object.assign({}, turni[k], {m: '0', t: '', s: '', ts: Date.now()});
  scrivi(LS_TURNI, turni); metti(k); ricomponi(); programmaInvio();
}

/* ============================== FOGLIO TURNI (Apps Script) ============================== */

function metti(k) { if (!coda.includes(k)) coda.push(k); scrivi(LS_CODA, coda); }
async function chiedi(url, opz, ms) {
  const ctrl = new AbortController(), tm = setTimeout(() => ctrl.abort(), ms || 20000);
  try {
    const r = await fetch(url, Object.assign({signal: ctrl.signal}, opz));
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const j = await r.json();
    if (!j || !j.ok) throw new Error((j && j.errore) || 'risposta non valida');
    return j;
  } finally { clearTimeout(tm); }
}
// legge dal foglio i turni del comando scelto; per ogni persona vince la modifica piu' recente
async function scaricaTurni() {
  try {
    const j = await chiedi(WEBAPP + '?turniPersonale=' + encodeURIComponent(normComando(f.comando)) + '&_=' + Date.now(), {cache: 'no-store'});
    let cambi = 0;
    Object.entries(j.turni || {}).forEach(([k, v]) => {
      const loc = turni[k];
      if (coda.includes(k) && loc && (loc.ts || 0) >= (v.ts || 0)) return;   // la mia modifica deve ancora partire
      if (!loc || (v.ts || 0) > (loc.ts || 0)) {
        turni[k] = {t: v.t || '', s: v.s || '', ts: v.ts || 0};
        if (v.r && typeof v.r === 'object' && Object.keys(v.r).length) turni[k].r = v.r;
        if (v.m === '1' || v.m === '0') Object.assign(turni[k], {m: v.m, n: v.n || '', com: v.com || '', q: v.q || '', c: v.c || '', corsi: corsiDaTesto(v.corsi)});
        cambi++;
      }
    });
    if (cambi) { scrivi(LS_TURNI, turni); ricomponi(); }
    sync = {stato: coda.length ? 'attesa' : 'ok', errore: '', ora: new Date()};
  } catch (e) {
    sync = {stato: 'err', errore: e.name === 'AbortError' ? 'tempo scaduto' : (e.message || String(e)), ora: sync.ora};
  }
  ridisegna();
}
let timerInvio = null, inviando = false;
// ridisegno chiesto dalla sincronizzazione: non mentre si compila il modulo del nominativo (si perderebbe quanto scritto)
function ridisegna() {
  if (modMan && root && root.querySelector('#pros-man-form')) return;
  if (root && root.contains(document.activeElement) && document.activeElement.tagName === 'SELECT') return;   // menu aperto
  disegna();
}
function programmaInvio() { clearTimeout(timerInvio); timerInvio = setTimeout(invia, 1500); }
function salvaPwds() { try { sessionStorage.setItem(SS_PWD, JSON.stringify(pwds)); } catch (e) { /* niente */ } }
async function sblocca(v) {
  const cn = normComando(f.comando);
  if (!v) return;
  sblocco = {stato: 'verifica', errore: ''}; disegna();
  try {
    const j = await chiedi(WEBAPP, {method: 'POST', headers: {'Content-Type': 'text/plain;charset=utf-8'}, body: JSON.stringify({foglio: 'DB_Turni_Personale', comando: cn, password: v, verifica: true})}, 20000);
    pwds[j.generale ? '*' : cn] = v; salvaPwds(); sblocco = {stato: 'ok', errore: ''};
    if (coda.length) invia();
  } catch (e) {
    sblocco = {stato: 'err', errore: e.name === 'AbortError' ? 'tempo scaduto' : (e.message || String(e))};
  }
  disegna();
}
// blocca il Comando scelto (e la password generale, se c'era)
function blocca() { delete pwds[normComando(f.comando)]; delete pwds['*']; salvaPwds(); sblocco = {stato: '', errore: ''}; modMan = null; modRuoli = null; disegna(); }
function scorriForm() { const x = root.querySelector('#pros-man-form'); if (x) { x.scrollIntoView({block: 'nearest'}); const i = x.querySelector('input[name=n]'); if (i) i.focus(); } }
async function invia() {
  if (inviando || !coda.length) return;
  // le modifiche partono Comando per Comando, ognuno con la sua password; senza password restano in attesa
  const gruppi = {};
  coda.forEach(k => { const cn = comandoDiChiave(k); if (pwdPer(cn)) (gruppi[cn] = gruppi[cn] || []).push(k); });
  if (!Object.keys(gruppi).length) return;
  inviando = true;
  sync.stato = 'invio'; ridisegna();
  let errore = '';
  for (const [cn, tutte] of Object.entries(gruppi)) {
    const chiavi = tutte.slice(0, 500);
    const voci = chiavi.map(k => {
      const v = turni[k] || {t: '', s: '', ts: Date.now()}, n = nomi[k] || {};
      const voce = {k, comando: n.comando || v.com || '', cognome: n.cognome || v.n || '', nome: n.nome || '', t: v.t || '', s: v.s || '', ts: v.ts || Date.now(), r: v.r || {}};
      if (v.m === '1' || v.m === '0') Object.assign(voce, {m: v.m, comando: v.com || '', cognome: v.n || '', q: v.q || '', c: v.c || '', corsi: corsiDaTesto(v.corsi)});
      return voce;
    });
    try {
      await chiedi(WEBAPP, {method: 'POST', headers: {'Content-Type': 'text/plain;charset=utf-8'}, body: JSON.stringify({foglio: 'DB_Turni_Personale', comando: cn, password: pwdPer(cn), voci})}, 30000);
      coda = coda.filter(k => !chiavi.includes(k)); scrivi(LS_CODA, coda);
    } catch (e) {
      errore = e.name === 'AbortError' ? 'tempo scaduto' : (e.message || String(e));
      if (/password/i.test(errore)) { delete pwds[pwds[cn] ? cn : '*']; salvaPwds(); sblocco = {stato: 'err', errore}; }   // password cambiata sul foglio: si richiede
    }
  }
  inviando = false;
  sync = errore ? {stato: 'err', errore, ora: sync.ora} : {stato: coda.length ? 'attesa' : 'ok', errore: '', ora: new Date()};
  ridisegna();
  if (!errore && coda.some(k => pwdPer(comandoDiChiave(k)))) programmaInvio();
}
// ruoli di una persona in un settore (lista vuota = nessun ruolo)
function impostaRuoli(k, settore, lista) {
  if (!puoModificare(k) || !settore) return;
  const r = Object.assign({}, (turni[k] || {}).r);
  const l = lista.includes('NO') ? ['NO'] : RUOLI.map(x => x[0]).filter(x => lista.includes(x));
  if (l.length) r[settore] = l; else delete r[settore];
  turni[k] = Object.assign({t: '', s: ''}, turni[k], {r, ts: Date.now()});
  scrivi(LS_TURNI, turni); metti(k); programmaInvio();
}
// modifica di turno/salto di una persona: copia locale subito, foglio appena possibile
function impostaTurno(k, t, s) {
  if (!puoModificare(k)) return;
  turni[k] = Object.assign({}, turni[k], {t: t || '', s: SENZA_SALTO(t) ? '' : (s || ''), ts: Date.now()});
  scrivi(LS_TURNI, turni); metti(k); programmaInvio();
}

function comandoDefault() {
  const a = window.FireOpsComandoAttivo, n = a && normComando(a.Comando);
  if (!n) return '';
  const trovato = comandi().find(c => normComando(c) === n);
  return trovato || '';
}
function comandi() {
  const s = new Map();
  righe.forEach(p => { const n = normComando(p.comando); if (n && !s.has(n)) s.set(n, p.comando); });
  return Array.from(s.values()).sort((a, b) => a.localeCompare(b, 'it'));
}

/* ============================== TURNI ============================== */

function siglaFascia() {
  const [a, m, g] = f.data.split('-').map(Number);
  const T = NS.turniDelGiorno ? NS.turniDelGiorno(a, m, g) : null;
  return T ? String(T[f.fascia] || '') : '';
}
function statoPersona(p, sigla) {
  const t = turni[p.k];
  if (!t || !t.t) return 'nd';
  if (t.t === 'NO') return 'no';
  if (t.t === 'G') {
    const gs = new Date(f.data + 'T12:00:00Z').getUTCDay();
    return (f.fascia === 'giorno' && gs >= 1 && gs <= 5) ? 'servizio' : 'libero';
  }
  if (!sigla) return 'nd';
  if (sigla.charAt(0).toUpperCase() !== t.t) return 'libero';
  return (t.s && sigla.slice(1) === String(t.s)) ? 'salto' : 'servizio';
}

/* ============================== RICHIAMO SPECIALIZZATI ============================== */
// I turni sono di 12 ore: giorno 08-20 e notte 20-08. Per un istante si cercano il turno in
// servizio, quello prima (smontante) e quello dopo (montante); la lettera che manca e' il turno libero.

const GIORNI_BREVI = ['dom', 'lun', 'mar', 'mer', 'gio', 'ven', 'sab'];
function spostaGiorno(iso, n) { const [a, m, g] = iso.split('-').map(Number); return new Date(Date.UTC(a, m - 1, g + n)).toISOString().slice(0, 10); }
function siglaDi(iso, fascia) {
  const [a, m, g] = iso.split('-').map(Number);
  const T = NS.turniDelGiorno ? NS.turniDelGiorno(a, m, g) : null;
  return T ? String(T[fascia] || '').toUpperCase() : '';
}
// componenti dell'ora di Roma per un istante
function romaDi(ms) {
  const parti = {};
  new Intl.DateTimeFormat('en-GB', {timeZone: 'Europe/Rome', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'})
    .formatToParts(new Date(ms)).forEach(x => { parti[x.type] = x.value; });
  return {iso: parti.year + '-' + parti.month + '-' + parti.day, h: +parti.hour % 24, min: parti.minute};
}
function turnoAlMomento(ms) {
  const r = romaDi(ms);
  let iso = r.iso, fascia;
  if (r.h < 8) { iso = spostaGiorno(r.iso, -1); fascia = 'notte'; }   // la notte e' del giorno in cui e' montata
  else fascia = r.h < 20 ? 'giorno' : 'notte';
  const prec = fascia === 'giorno' ? {iso: spostaGiorno(iso, -1), fascia: 'notte'} : {iso, fascia: 'giorno'};
  const succ = fascia === 'giorno' ? {iso, fascia: 'notte'} : {iso: spostaGiorno(iso, 1), fascia: 'giorno'};
  const sel = {iso, fascia};
  [sel, prec, succ].forEach(x => { x.sigla = siglaDi(x.iso, x.fascia); x.l = x.sigla.charAt(0); x.n = x.sigla.slice(1); });
  const liberi = ['A', 'B', 'C', 'D'].filter(l => ![sel.l, prec.l, succ.l].includes(l));
  const gs = new Date(iso + 'T12:00:00Z').getUTCDay();
  // giornalieri G: richiamabili di giorno (tutti i giorni) e il sabato notte; non le altre notti,
  // per lo stacco di 12 ore prima del rientro (finestra del fine settimana: sabato 08:00 - domenica 20:00)
  const gRichiamo = fascia === 'giorno' || gs === 6;
  return {ms, roma: r, sel, prec, succ, liberi, gServizio: fascia === 'giorno' && gs >= 1 && gs <= 5, gRichiamo};
}
// gruppo di richiamo di una persona: libero, saltoSel, saltoPrec, saltoSucc, oppure non richiamabile
function gruppoRichiamo(p, T) {
  const t = turni[p.k];
  if (!t || !t.t) return 'nd';
  if (t.t === 'NO') return 'no';                  // non operativo: non si richiama
  if (t.t === 'G') return T.gRichiamo ? 'libero' : 'stacco';
  const s = String(t.s || '');
  if (t.t === T.sel.l) return s && s === T.sel.n ? 'saltoSel' : 'servizio';
  if (t.t === T.prec.l) return s && s === T.prec.n ? 'saltoPrec' : 'smontante';
  if (t.t === T.succ.l) return s && s === T.succ.n ? 'saltoSucc' : 'montante';
  return 'libero';
}
function etichettaTurno(x) { return x.l ? 'turno ' + x.l + ' ' + (x.fascia === 'giorno' ? 'diurno' : 'notturno') + ' (' + x.sigla + ')' : '—'; }
function quandoTesto(T) {
  const d = new Date(T.roma.iso + 'T12:00:00Z');
  return GIORNI_BREVI[d.getUTCDay()] + ' ' + T.roma.iso.slice(8, 10) + '/' + T.roma.iso.slice(5, 7) + ' ore ' + String(T.roma.h).padStart(2, '0') + ':' + T.roma.min;
}

/* ============================== FILTRI ============================== */

function delComando() { const n = normComando(f.comando); return n ? righe.filter(p => normComando(p.comando) === n) : righe; }
function filtrati(sigla) {
  const testo = norm(f.testo);
  const l = delComando().filter(p => {
    if (f.qual && p.qual !== f.qual) return false;
    if (f.corso && !p.corsi.includes(f.corso)) return false;
    if (testo && !norm(p.cognome + p.nome + p.cell).includes(testo)) return false;
    if (f.stato && statoPersona(p, sigla) !== f.stato) return false;
    return true;
  });
  return ordina(l);
}

/* ============================== DISEGNO ============================== */

function disegna() {
  if (!root) return;
  const base = delComando();
  const corsiDisp = Array.from(new Set(base.flatMap(p => p.corsi))).sort((a, b) => a.localeCompare(b, 'it'));
  const qualDisp = Array.from(new Set(base.map(p => p.qual).filter(Boolean))).sort((a, b) => {
    const qa = ORDINE_QUAL.indexOf(a), qb = ORDINE_QUAL.indexOf(b); return (qa < 0 ? 99 : qa) - (qb < 0 ? 99 : qb) || a.localeCompare(b);
  });
  const statoCarico = carico.stato === 'carico' ? '<span class="pros-sync">⏳ Lettura da PUMA…</span>'
    : carico.stato === 'err' ? '<span class="pros-sync err">⚠️ PUMA non raggiungibile: ' + esc(carico.errore) + '</span>'
    : carico.ora ? '<span class="pros-sync ok">✓ PUMA · ' + righe.length + ' persone · ' + carico.ora.toLocaleTimeString('it-IT', {hour: '2-digit', minute: '2-digit'}) + '</span>' : '';
  const ora = d => d ? ' · ' + d.toLocaleTimeString('it-IT', {hour: '2-digit', minute: '2-digit'}) : '';
  const statoSync = sync.stato === 'err' ? '<span class="pros-sync err">⚠️ Foglio turni: ' + esc(sync.errore) + (coda.length ? ' (' + coda.length + ' modifiche in attesa)' : '') + '</span>'
    : sync.stato === 'invio' ? '<span class="pros-sync">⏳ Salvo i turni sul foglio…</span>'
    : coda.length ? '<span class="pros-sync">⏳ ' + coda.length + ' modifiche da salvare' + (coda.some(k => !pwdPer(comandoDiChiave(k))) ? ' (sblocca il Comando nella Gestione personale)' : '') + '</span>'
    : sync.stato === 'ok' ? '<span class="pros-sync ok">✓ Turni sul foglio' + ora(sync.ora) + '</span>' : '';
  const stati = statoCarico + statoSync;
  const schede = `<div class="pros-schede" role="tablist">
    <button type="button" class="pros-scheda${f.scheda === 'gestione' ? ' on' : ''}" data-scheda="gestione">${sbloccato() ? '🔓' : '🔒'} Gestione personale</button>
    <button type="button" class="pros-scheda${f.scheda === 'prospetto' ? ' on' : ''}" data-scheda="prospetto">📋 Prospetto disponibilità</button>
    <button type="button" class="pros-scheda${f.scheda === 'richiamo' ? ' on' : ''}" data-scheda="richiamo">📞 Richiamo specializzati</button>
  </div>`;
  const corpo = f.scheda === 'richiamo' ? htmlRichiamo(corsiDisp, qualDisp, base, stati)
    : f.scheda === 'gestione' ? htmlGestione(corsiDisp, qualDisp, base, stati)
    : htmlProspetto(corsiDisp, qualDisp, base, stati);
  root.innerHTML = schede + corpo;
}

/* ---------- scheda PROSPETTO: colonne A, B, C, D, G, N.O. con sotto qualifica e nominativo ---------- */
const COLONNE = ['A', 'B', 'C', 'D', 'G', 'NO', ''];   // '' = turno non impostato
function htmlProspetto(corsiDisp, qualDisp, base, stati) {
  const settore = settoreDi(f.corso);
  // con un settore scelto: funzionari, ROP e magazzinieri generali del settore vanno nella FASCIA in alto
  // (anche senza il corso preciso), i magazzinieri di turno in testa alla colonna del loro turno
  const ruoloAlto = p => settore && !nonOperativo(p, settore) && rangoRuolo(p, settore) <= 2;
  const fascia = settore ? ordina(base.filter(ruoloAlto)) : [];
  const inFascia = new Set(fascia.map(p => p.k));
  const pers = base.filter(p => !inFascia.has(p.k) && (!f.qual || p.qual === f.qual) && (!f.corso || p.corsi.includes(f.corso)));
  // con un corso scelto, chi e' non operativo per il suo settore va nella colonna N.O.
  const turnoDi = p => { if (nonOperativo(p, settore)) return 'NO'; const t = turni[p.k]; return t && TURNI.includes(t.t) ? t.t : ''; };
  const col = {}; COLONNE.forEach(t => { col[t] = []; });
  pers.forEach(p => col[turnoDi(p)].push(p));
  const adesso = turnoAlMomento(Date.now());
  const intest = t => t === '' ? 'Senza turno' : NOME_TURNO(t);
  const colonne = COLONNE.filter(t => t !== '' || col[''].length);
  const turnoTesto = p => { const t = turni[p.k] || {}; return t.t ? NOME_TURNO(t.t) + (t.s || '') : '—'; };
  const voce = (p, t, extra) => {
    const tt = turni[p.k] || {}, inSalto = t === adesso.sel.l && tt.s && String(tt.s) === adesso.sel.n;
    return `<li class="${inSalto ? 'salto' : ''}${extra ? ' ' + extra : ''}" title="${esc(p.corsi.join(', '))}"><span class="q">${esc(p.qual)}</span> <span class="n">${esc(p.cognome)}${p.manuale ? ' ✍️' : ''}</span>${tt.s && t !== 'NO' ? `<span class="s">${esc(t + tt.s)}</span>` : ''}${t === 'NO' && tt.t && tt.t !== 'NO' ? `<span class="s" title="Turno ${esc(NOME_TURNO(tt.t))}${tt.s ? ', salto ' + esc(tt.s) : ''}: non operativo per ${esc(NOME_SETTORE[settore] || '')}">${esc(NOME_TURNO(tt.t) + (tt.s || ''))}</span>` : ''}<span class="rl">${htmlRuoli(p, settore)}</span>${f.comando ? '' : `<span class="c">${esc(p.comando)}</span>`}</li>`;
  };
  const righeFascia = [['FUN', 'Funzionari del settore'], ['ROP', 'Responsabile operativo provinciale'], ['MAG', 'Magazziniere generale']]
    .map(([r, tit]) => [tit, fascia.filter(p => ORDINE_RUOLI[rangoRuolo(p, settore)] === r)]);
  const htmlFascia = settore ? `
  <div class="pros-fascia-settore">
    <div class="tit">Settore <b>${esc(NOME_SETTORE[settore])}</b></div>
    ${righeFascia.map(([tit, l]) => `
    <div class="riga"><div class="ruolo">${esc(tit)}</div><div class="nomi">${l.length ? l.map(p => `<span class="pers" title="${esc(p.corsi.join(', '))}"><span class="q">${esc(p.qual)}</span> <b>${esc(p.cognome)}</b>${p.manuale ? ' ✍️' : ''} <span class="t">${esc(turnoTesto(p))}</span>${p.cell ? ` <a href="tel:${esc(p.cell)}">📞 ${esc(p.cell)}</a>` : ''}${f.comando ? '' : ` <span class="c">${esc(p.comando)}</span>`}</span>`).join('') : '<span class="pros-nota">— non assegnato (scheda Gestione personale, ✏️ Ruoli)</span>'}</div></div>`).join('')}
  </div>` : '';
  return `
  <div class="pros-testa">
    ${selectComando()}
    <label>Qualifica <select id="pros-qual"><option value="">Tutte</option>${qualDisp.map(q => `<option${q === f.qual ? ' selected' : ''}>${esc(q)}</option>`).join('')}</select></label>
    <div class="pros-sigla">Adesso: <b>${esc(etichettaTurno(adesso.sel))}</b></div>
    <div class="pros-stati">${stati}</div>
  </div>
  ${selectCorso(corsiDisp, base)}
  ${htmlFascia}
  ${pers.length || fascia.length ? `
  <div class="pros-colonne" style="--n:${colonne.length}">
    ${colonne.map(t => {
      // in testa alla colonna il magazziniere di turno del settore, poi il resto del personale
      const magt = settore ? ordina(col[t].filter(p => ruoliDi(p, settore).includes('MAGT'))) : [];
      const resto = ordina(col[t].filter(p => !magt.includes(p)));
      return `
    <div class="pros-col t-${t || 'nd'}${t === 'NO' ? ' no' : ''}${t === '' ? ' nd' : ''}${t === adesso.sel.l ? ' servizio' : ''}">
      <h4>${esc(intest(t))} <span class="pros-quanti">${col[t].length}</span>${t === adesso.sel.l ? '<small>in servizio · salta il ' + esc(adesso.sel.n) + '</small>' : ''}</h4>
      ${settore && !['NO', ''].includes(t) ? `<div class="pros-magt"><div class="et">Magazziniere di turno</div>${magt.length ? `<ol>${magt.map(p => voce(p, t, 'magt')).join('')}</ol>` : '<div class="vuoto">—</div>'}</div>` : ''}
      <ol class="pros-resto">${resto.map(p => voce(p, t)).join('') || '<li class="vuota">—</li>'}</ol>
    </div>`; }).join('')}
  </div>
  <p class="pros-nota">${pers.length + fascia.length} persone${f.corso ? ' con ' + esc(f.corso) + ' (settore ' + esc(NOME_SETTORE[settore] || '—') + '): in alto funzionari, ROP e magazziniere generale del settore; in testa a ogni turno il magazziniere di turno; chi è non operativo per il settore sta nella colonna N.O.' : ''}. In grigio chi adesso è in salto turno. Turni, salti e ruoli si impostano nella scheda 🔒 Gestione personale.</p>`
  : `<div class="pros-vuoto">${carico.stato === 'ok' ? 'Nessuna persona con questi filtri.' : carico.stato === 'err' ? 'Dati PUMA non disponibili.' : 'Caricamento…'}</div>`}`;
}
// ordine degli elenchi: col corso scelto prima i ruoli del settore (funzionario, ROP, mag. generale, mag. di turno),
// poi per qualifica e cognome
function ordina(l) {
  const settore = settoreDi(f.corso);
  return l.slice().sort((a, b) => {
    const ra = rangoRuolo(a, settore), rb = rangoRuolo(b, settore);
    if (ra !== rb) return ra - rb;
    const qa = ORDINE_QUAL.indexOf(a.qual), qb = ORDINE_QUAL.indexOf(b.qual);
    return (qa < 0 ? 99 : qa) - (qb < 0 ? 99 : qb) || a.cognome.localeCompare(b.cognome, 'it');
  });
}

/* ---------- scheda GESTIONE PERSONALE: turno e salto, modificabili con la password ---------- */
function htmlGestione(corsiDisp, qualDisp, base, stati) {
  let elenco = filtrati('');
  if (f.senzaTurno) elenco = elenco.filter(p => !(turni[p.k] && turni[p.k].t));
  const cn = normComando(f.comando), aperto = sbloccato();
  const lucchetto = aperto
    ? `<div class="pros-lucchetto ok">🔓 Modifiche abilitate per ${pwds['*'] ? 'tutti i Comandi (password generale)' : esc(f.comando)} in questa sessione <button type="button" class="pros-mini" id="pros-blocca">🔒 Blocca</button></div>`
    : !cn ? `<div class="pros-lucchetto">🔒 Scegli un Comando qui sotto per sbloccare le modifiche con la sua password.</div>`
    : `<form class="pros-lucchetto" id="pros-sblocca" autocomplete="off">🔒 Per modificare turni e salti di <b>${esc(f.comando)}</b> inserisci la password del Comando
        <input type="password" id="pros-pwd" placeholder="Password" autocomplete="current-password"${sblocco.stato === 'verifica' ? ' disabled' : ''}>
        <button type="submit" class="pros-btn"${sblocco.stato === 'verifica' ? ' disabled' : ''}>${sblocco.stato === 'verifica' ? '⏳ Verifico…' : 'Sblocca'}</button>
        ${sblocco.stato === 'err' ? '<span class="pros-sync err">⚠️ ' + esc(sblocco.errore) + '</span>' : ''}</form>`;
  const dis = aperto ? '' : ' disabled';
  const tuttiCorsi = Array.from(new Set(righe.flatMap(p => p.corsi))).sort((a, b) => a.localeCompare(b, 'it'));
  return `
  <div class="pros-avviso">🚧 Sezione in costruzione. Personale e corsi arrivano da PUMA; <b>turno e salto turno</b> non sono su PUMA: si impostano qui e si salvano sul foglio Google (DB_Turni_Personale), così li ritrovano tutti i PC.</div>
  ${lucchetto}
  <div class="pros-testa">
    ${selectComando()}
    <div class="pros-stati">${stati}</div>
  </div>
  ${selectCorso(corsiDisp, base)}
  <div class="pros-barra">
    <input type="search" id="pros-testo" placeholder="Cerca cognome, nome o cellulare" value="${esc(f.testo)}">
    <select id="pros-qual"><option value="">Tutte le qualifiche</option>${qualDisp.map(q => `<option${q === f.qual ? ' selected' : ''}>${esc(q)}</option>`).join('')}</select>
    <label class="pros-chk"><input type="checkbox" id="pros-senza"${f.senzaTurno ? ' checked' : ''}> solo senza turno</label>
    <button type="button" class="pros-btn" id="pros-aggiorna">🔄 Aggiorna da PUMA</button>
    <button type="button" class="pros-btn" id="pros-csv"${elenco.length ? '' : ' disabled'}>⬇️ CSV</button>
    <button type="button" class="pros-btn" id="pros-esporta">💾 Esporta turni</button>
    <button type="button" class="pros-btn" id="pros-importa"${dis}>📂 Importa turni</button>
    <button type="button" class="pros-btn danger" id="pros-reset">🗑️ Reset dati</button>
    <input type="file" id="pros-file" accept=".json,application/json" hidden>
    <button type="button" class="pros-btn pri" id="pros-man-nuovo"${dis}>➕ Aggiungi nominativo</button>
  </div>
  ${aperto && modMan ? htmlFormManuale(tuttiCorsi) : ''}
  ${elenco.length ? `
  <div class="pros-tabwrap"><table class="pros-tab${aperto ? '' : ' bloccata'}">
    <thead><tr><th>Personale</th><th>Qual.</th><th>Corsi</th><th>Cellulare</th><th>Turno</th><th>Salto</th><th>Ruoli per settore</th></tr></thead>
    <tbody>${elenco.map(p => {
      const t = turni[p.k] || {};
      return `<tr data-k="${esc(p.k)}" class="${t.t === 'NO' ? 'st-no' : t.t ? '' : 'st-nd'}${modRuoli === p.k ? ' aperta' : ''}">
        <td data-l="Personale"><b>${esc(p.cognome)}</b> ${esc(p.nome)}${p.manuale ? ` <span class="pros-man">✍️ aggiunto a mano</span>${aperto ? ` <button type="button" class="pros-mini" data-man-mod="${esc(p.k)}" title="Modifica">✏️</button> <button type="button" class="pros-mini danger" data-man-del="${esc(p.k)}" title="Elimina">🗑️</button>` : ''}` : ''}${f.comando ? '' : `<div class="pros-com">${esc(p.comando)}</div>`}</td>
        <td data-l="Qualifica">${esc(p.qual)}</td>
        <td data-l="Corsi">${p.corsi.map(c => `<span class="pros-chip${c === f.corso ? ' on' : ''}" title="${esc(c)}">${esc(siglaCorso(c))}</span>`).join('') || '<span class="pros-nota">—</span>'}</td>
        <td data-l="Cellulare">${p.cell ? `<a href="tel:${esc(p.cell)}">${esc(p.cell)}</a>` : ''}</td>
        <td data-l="Turno"><select data-campo="t"${dis}><option value="">—</option>${TURNI.map(x => `<option value="${x}"${x === t.t ? ' selected' : ''}>${NOME_TURNO(x)}</option>`).join('')}</select></td>
        <td data-l="Salto"><select data-campo="s"${SENZA_SALTO(t.t) || !aperto ? ' disabled' : ''}><option value="">—</option>${SALTI.map(x => `<option${x === String(t.s || '') ? ' selected' : ''}>${x}</option>`).join('')}</select></td>
        <td data-l="Ruoli"><div class="pros-ruoli-cella">${htmlRuoli(p, '') || '<span class="pros-nota">—</span>'}${aperto ? ` <button type="button" class="pros-mini" data-ruoli="${esc(p.k)}" title="Ruoli per settore">${modRuoli === p.k ? '✕ Chiudi' : '✏️ Ruoli'}</button>` : ''}</div></td>
      </tr>${aperto && modRuoli === p.k ? htmlRigaRuoli(p) : ''}`;
    }).join('')}</tbody></table></div>`
    : `<div class="pros-vuoto">${carico.stato === 'ok' ? 'Nessuna persona con questi filtri.' : carico.stato === 'err' ? 'Dati PUMA non disponibili.' : 'Caricamento…'}</div>`}`;
}

// riga sotto la persona: per ogni settore Magazziniere / Mag. di turno / ROP / Non operativo
function htmlRigaRuoli(p) {
  const propri = settoriDi(p), r = ruoliDi(p);
  const altri = SETTORI.map(x => x[0]).filter(k => !propri.includes(k));
  const riga = k => {
    const l = r[k] || [], no = l.includes('NO');
    return `<div class="pros-settore${no ? ' no' : ''}${l.length && !no ? ' ha' : ''}" data-settore="${k}">
      <div class="nome"><b>${esc(k)}</b> <small>${esc(NOME_SETTORE[k].replace(/^\S+\s*/, '').replace(/[()]/g, ''))}</small></div>
      <div class="scelte">${RUOLI.map(([x, n]) => `<label class="pros-chk r-${x}"><input type="checkbox" data-ruolo="${x}"${l.includes(x) ? ' checked' : ''}${no && x !== 'NO' ? ' disabled' : ''}> ${esc(n)}</label>`).join('')}</div>
    </div>`;
  };
  return `<tr class="pros-riga-ruoli" data-k="${esc(p.k)}"><td colspan="7">
    <div class="pros-ruoli-box">
      <div class="pros-ruoli-tit">Ruoli per settore di <b>${esc(p.cognome)}</b> <span class="pros-nota">— "Non operativo" toglie la persona dal prospetto e dal richiamo di quel settore</span></div>
      ${propri.length ? propri.map(riga).join('') : '<div class="pros-nota">Nessun settore dai corsi di PUMA.</div>'}
      ${altri.length ? `<details${altri.some(k => r[k]) ? ' open' : ''}><summary>Altri settori (senza corsi)</summary>${altri.map(riga).join('')}</details>` : ''}
    </div></td></tr>`;
}
// modulo per aggiungere (o modificare) un nominativo che non e' su PUMA
const QUAL_MAN = ['VF', 'VE', 'VESC', 'VC', 'CS', 'CSE', 'CR', 'IA', 'DS', 'D'];
function htmlFormManuale(tuttiCorsi) {
  const v = modMan !== 'nuovo' && turni[modMan] ? turni[modMan] : {};
  const com = v.com || f.comando || comandoDefault() || '';
  const scelti = new Set(corsiDaTesto(v.corsi));
  const extra = Array.from(scelti).filter(c => !tuttiCorsi.includes(c));
  return `<form class="pros-box pros-man-form" id="pros-man-form" autocomplete="off">
    <h4>${modMan === 'nuovo' ? '➕ Nuovo nominativo' : '✏️ Modifica nominativo'} <small>(per chi non è su PUMA)</small></h4>
    <div class="pros-griglia">
      <label>Cognome e nome <input type="text" name="n" required maxlength="80" value="${esc(v.n || '')}" placeholder="Rossi Mario"></label>
      <label>Qualifica <select name="q">${QUAL_MAN.map(q => `<option${q === String(v.q || 'VF').toUpperCase() ? ' selected' : ''}>${q}</option>`).join('')}</select></label>
      <label>Cellulare <input type="tel" name="c" maxlength="20" value="${esc(v.c || '')}" placeholder="333 1234567"></label>
      <label>Comando <select name="com">${Array.from(new Set(comandi().concat(com ? [com] : []))).filter(c => pwdPer(normComando(c))).sort((a, b) => a.localeCompare(b, 'it')).map(c => `<option${c === com ? ' selected' : ''}>${esc(c)}</option>`).join('')}</select></label>
      <label>Turno <select name="t"><option value="">—</option>${TURNI.map(x => `<option value="${x}"${x === v.t ? ' selected' : ''}>${NOME_TURNO(x)}</option>`).join('')}</select></label>
      <label>Salto <select name="s"><option value="">—</option>${SALTI.map(x => `<option${x === String(v.s || '') ? ' selected' : ''}>${x}</option>`).join('')}</select></label>
    </div>
    <div class="pros-lab">Corsi</div>
    <div class="pros-man-corsi">${tuttiCorsi.concat(extra).map(c => `<label class="pros-chk"><input type="checkbox" name="corso" value="${esc(c)}"${scelti.has(c) ? ' checked' : ''}> ${esc(c)}</label>`).join('')}</div>
    <label class="pros-man-altro">Altro corso non in elenco <input type="text" name="altro" maxlength="120" placeholder="es. TAS2 (Topografia Applicata al Soccorso)"></label>
    <div class="pros-barra">
      <button type="submit" class="pros-btn pri">💾 Salva</button>
      <button type="button" class="pros-btn" id="pros-man-annulla">Annulla</button>
    </div>
  </form>`;
}
function selectComando() {
  return `<label>Comando
      <select id="pros-comando"><option value="">Tutti i comandi</option>${comandi().map(c => `<option${c === f.comando ? ' selected' : ''}>${esc(c)}</option>`).join('')}</select></label>`;
}
function selectCorso(corsiDisp, base) {
  return `<div class="pros-box pros-box-corso">
    <label class="pros-corso">Corso
      <select id="pros-corso"${corsiDisp.length ? '' : ' disabled'}>
        <option value="">${corsiDisp.length ? 'Tutti i corsi (' + corsiDisp.length + ')' : (carico.stato === 'ok' ? 'Nessun corso registrato' : 'In attesa dei dati PUMA')}</option>
        ${corsiDisp.map(c => `<option value="${esc(c)}"${c === f.corso ? ' selected' : ''}>${esc(c)} — ${base.filter(p => p.corsi.includes(c)).length}</option>`).join('')}
      </select></label>
  </div>`;
}
const GRUPPI_RICHIAMO = ['libero', 'saltoSel', 'saltoPrec', 'saltoSucc'];
function elencoRichiamo(T) {
  const g = {libero: [], saltoSel: [], saltoPrec: [], saltoSucc: [], nd: []};
  const s = f.stato; f.stato = ''; const l = filtrati(''); f.stato = s;
  const settore = settoreDi(f.corso);
  l.forEach(p => { if (nonOperativo(p, settore)) return; const x = gruppoRichiamo(p, T); if (g[x]) g[x].push(p); });
  return g;
}
function titoliRichiamo(T) {
  return {
    libero: 'Personale in turno libero: <b>' + (T.liberi.join(', ') || '—') + '</b> (tutti i salti)' + (T.gRichiamo ? ' e giornalieri G' : ''),
    saltoSel: 'Personale in salto turno del turno selezionato: <b>' + esc(T.sel.sigla) + '</b>',
    saltoPrec: 'Personale in salto turno del turno precedente: <b>' + esc(T.prec.sigla) + '</b>',
    saltoSucc: 'Personale in salto turno del turno seguente: <b>' + esc(T.succ.sigla) + '</b>'
  };
}
function htmlRichiamo(corsiDisp, qualDisp, base, stati) {
  const T = turnoAlMomento(Date.now() + f.quando * 3600e3);
  const g = elencoRichiamo(T), tit = titoliRichiamo(T);
  const totale = GRUPPI_RICHIAMO.reduce((n, k) => n + g[k].length, 0);
  const riga = p => {
    const t = turni[p.k] || {};
    return `<tr><td data-l="Qualifica" class="q">${esc(p.qual)}</td>
      <td data-l="Nome" title="${esc(p.corsi.join(', '))}"><b>${esc(p.cognome)}</b> ${esc(p.nome)}${p.manuale ? ' ✍️' : ''} ${htmlRuoli(p, settoreDi(f.corso))}${f.comando ? '' : `<div class="pros-com">${esc(p.comando)}</div>`}</td>
      <td data-l="Numero">${p.cell ? `<a href="tel:${esc(p.cell)}">📞 ${esc(p.cell)}</a>` : '<span class="pros-nota">—</span>'}</td>
      <td data-l="Turno" class="c">${esc(NOME_TURNO(t.t || '—'))}</td>
      <td data-l="Salto" class="c">${esc(t.s || '—')}</td></tr>`;
  };
  return `
  <div class="pros-testa">
    ${selectComando()}
    <div class="pros-fasce">
      ${[[0, 'Adesso'], [12, '+12 ore'], [24, '+24 ore']].map(([h, n]) => `<button type="button" class="pros-fascia${f.quando === h ? ' on' : ''}" data-quando="${h}">${n}</button>`).join('')}
    </div>
    <div class="pros-sigla">${esc(quandoTesto(T))}: <b>${esc(etichettaTurno(T.sel))}</b>
      <span>· prima ${esc(T.prec.sigla)} · dopo ${esc(T.succ.sigla)}</span></div>
    <div class="pros-stati">${stati}</div>
  </div>
  ${selectCorso(corsiDisp, base)}
  <div class="pros-barra">
    <select id="pros-qual"><option value="">Tutte le qualifiche</option>${qualDisp.map(q => `<option${q === f.qual ? ' selected' : ''}>${esc(q)}</option>`).join('')}</select>
    <span class="pros-nota">${totale} richiamabili${f.corso ? ' con ' + esc(siglaCorso(f.corso)) + ' (esclusi i non operativi del settore ' + esc(settoreDi(f.corso) || '—') + ')' : ''}${g.nd.length ? ' · <b>' + g.nd.length + '</b> senza turno impostato (scheda Gestione personale)' : ''}</span>
    <button type="button" class="pros-btn" id="pros-csv-richiamo"${totale ? '' : ' disabled'}>⬇️ CSV richiamo</button>
  </div>
  ${GRUPPI_RICHIAMO.map(k => `
  <div class="pros-gruppo pros-g-${k}">
    <h4>${tit[k]} <span class="pros-quanti">${g[k].length}</span></h4>
    ${g[k].length ? `<div class="pros-tabwrap"><table class="pros-tab pros-tab-r"><thead><tr><th>Qualifica</th><th>Nome</th><th>Numero</th><th>Turno</th><th>Salto</th></tr></thead><tbody>${ordina(g[k]).map(riga).join('')}</tbody></table></div>`
      : '<div class="pros-nota pros-nessuno">Nessuno' + (carico.stato === 'ok' ? '' : ' (in attesa dei dati PUMA)') + '</div>'}
  </div>`).join('')}`;
}
function esportaRichiamo() {
  const T = turnoAlMomento(Date.now() + f.quando * 3600e3), g = elencoRichiamo(T), tit = titoliRichiamo(T);
  const q = v => '"' + String(v == null ? '' : v).replace(/<[^>]+>/g, '').replace(/"/g, '""') + '"';
  const out = [[quandoTesto(T) + ' - ' + etichettaTurno(T.sel) + (f.corso ? ' - corso ' + f.corso : '')].map(q).join(';'),
    ['Gruppo', 'Qualifica', 'Nome', 'Numero', 'Turno', 'Salto', 'Ruoli', 'Comando', 'Corsi'].map(q).join(';')];
  const st = settoreDi(f.corso);
  GRUPPI_RICHIAMO.forEach(k => ordina(g[k]).forEach(p => { const t = turni[p.k] || {}; out.push([tit[k], p.qual, p.cognome, p.cell, NOME_TURNO(t.t || ''), t.s || '', testoRuoli(p, st), p.comando, p.corsi.join(' | ')].map(q).join(';')); }));
  scarica('richiamo_' + T.roma.iso + '_' + String(T.roma.h).padStart(2, '0') + '.csv', '\ufeff' + out.join('\r\n'), 'text/csv;charset=utf-8');
}

/* ============================== AZIONI ============================== */

function scarica(nome, testo, tipo) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([testo], {type: tipo}));
  a.download = nome; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}
function esportaCSV() {
  const sigla = siglaFascia();
  const q = v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
  const righeCsv = [['Personale', 'Qualifica', 'Comando', 'Cellulare', 'Corsi', 'Turno', 'Salto', 'Ruoli per settore'].map(q).join(';')];
  filtrati(sigla).forEach(p => { const t = turni[p.k] || {}; righeCsv.push([p.cognome, p.qual, p.comando, p.cell, p.corsi.join(' | '), NOME_TURNO(t.t || ''), t.s || '', testoRuoli(p, '')].map(q).join(';')); });
  scarica('personale_turni_' + oggiISO() + '.csv', '﻿' + righeCsv.join('\r\n'), 'text/csv;charset=utf-8');
}
function importa(file) {
  const r = new FileReader();
  r.onload = () => {
    try {
      if (!sbloccato()) throw new Error('sblocca prima il Comando nella Gestione personale con la sua password');
      const d = JSON.parse(r.result), dati = d && d.turni ? d.turni : d;
      if (!dati || typeof dati !== 'object') throw new Error('file non valido');
      let n = 0;
      const valide = new Set(righe.map(p => p.k));
      Object.entries(dati).forEach(([k, v]) => {
        if (!v || !TURNI.includes(v.t) || !valide.has(k)) return;   // solo persone presenti su PUMA, con la chiave attuale
        impostaTurno(k, v.t, SALTI.includes(String(v.s)) ? String(v.s) : ''); n++;
      });
      disegna(); alert('Importati i turni di ' + n + ' persone: vengono salvati anche sul foglio.');
    } catch (e) { alert('Importazione non riuscita: ' + e.message); }
  };
  r.readAsText(file);
}

function eventi() {
  root.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.fascia) { f.fascia = b.dataset.fascia; disegna(); return; }
    if (b.dataset.scheda) { f.scheda = b.dataset.scheda; salvaFiltri(); disegna(); return; }
    if (b.dataset.cella !== undefined) {
      const c = {corso: b.dataset.ccorso, turno: b.dataset.cella};
      cella = cella && cella.corso === c.corso && cella.turno === c.turno ? null : c; disegna(); return;
    }
    if (b.dataset.quando !== undefined) { f.quando = +b.dataset.quando; disegna(); return; }
    if (b.dataset.stato) { f.stato = f.stato === b.dataset.stato ? '' : b.dataset.stato; salvaFiltri(); disegna(); return; }
    if (b.dataset.ruoli) { modRuoli = modRuoli === b.dataset.ruoli ? null : b.dataset.ruoli; disegna(); return; }
    if (b.dataset.manMod) { modMan = b.dataset.manMod; disegna(); scorriForm(); return; }
    if (b.dataset.manDel) {
      const v = turni[b.dataset.manDel];
      if (v && confirm('Eliminare ' + (v.n || 'questo nominativo') + ' dal personale aggiunto a mano?')) { eliminaManuale(b.dataset.manDel); if (modMan === b.dataset.manDel) modMan = null; disegna(); }
      return;
    }
    switch (b.id) {
      case 'pros-man-nuovo': modMan = 'nuovo'; disegna(); scorriForm(); break;
      case 'pros-man-annulla': modMan = null; disegna(); break;
      case 'pros-aggiorna': carica(); break;
      case 'pros-blocca': blocca(); break;
      case 'pros-csv-richiamo': esportaRichiamo(); break;
      case 'pros-csv': esportaCSV(); break;
      case 'pros-esporta': scarica('fireops_turni_personale_' + oggiISO() + '.json', JSON.stringify({tipo: 'fireops-prospetto-turni', creato: new Date().toISOString(), turni}, null, 1), 'application/json'); break;
      case 'pros-importa': root.querySelector('#pros-file').click(); break;
      case 'pros-reset':
        // azzera filtri e copia locale; i turni sul foglio restano e si riscaricano
        if (confirm('Azzerare filtri e copia locale dei turni? I turni salvati sul foglio Google restano e vengono riscaricati.' + (coda.length ? '\n\nATTENZIONE: ' + coda.length + ' modifiche non ancora salvate sul foglio andranno perse.' : ''))) {
          turni = {}; coda = []; scrivi(LS_TURNI, turni); scrivi(LS_CODA, coda);
          Object.assign(f, {corso: '', qual: '', testo: '', stato: '', data: dataAdesso(), fascia: fasciaAdesso(), comando: comandoDefault()});
          try { localStorage.removeItem(LS_FILTRI); } catch (er) { /* niente */ }
          disegna(); scaricaTurni();
        }
        break;
    }
  });
  root.addEventListener('change', e => {
    const t = e.target;
    if (t.id === 'pros-comando') { sblocco = {stato: '', errore: ''}; f.comando = t.value; f.corso = ''; f.qual = ''; cella = null; salvaFiltri(); disegna(); scaricaTurni(); return; }
    if (t.id === 'pros-corso') { f.corso = t.value; cella = null; salvaFiltri(); disegna(); return; }
    if (t.id === 'pros-senza') { f.senzaTurno = t.checked; disegna(); return; }
    if (t.id === 'pros-data') { if (t.value) { f.data = t.value; disegna(); } return; }
    if (t.id === 'pros-qual') { f.qual = t.value; salvaFiltri(); disegna(); return; }
    if (t.id === 'pros-file') { if (t.files[0]) importa(t.files[0]); t.value = ''; return; }
    if (t.dataset.ruolo) {
      const box = t.closest('.pros-settore'), tr2 = t.closest('tr[data-k]');
      if (!box || !tr2) return;
      let lista = Array.from(box.querySelectorAll('input[data-ruolo]:checked')).map(x => x.dataset.ruolo);
      if (t.dataset.ruolo === 'NO' && t.checked) lista = ['NO'];
      impostaRuoli(tr2.dataset.k, box.dataset.settore, lista); disegna();
      return;
    }
    const tr = t.closest('tr[data-k]');
    if (tr && t.dataset.campo) {
      const k = tr.dataset.k, v = Object.assign({t: '', s: ''}, turni[k]);
      v[t.dataset.campo] = t.value;
      impostaTurno(k, v.t, v.s); disegna();
    }
  });
  root.addEventListener('submit', e => {
    if (e.target.id === 'pros-man-form') {
      e.preventDefault();
      const fd = new FormData(e.target), n = String(fd.get('n') || '').trim().replace(/\s+/g, ' ');
      if (!n) return;
      const corsi = fd.getAll('corso').map(String);
      String(fd.get('altro') || '').split(/[,;]/).map(x => x.trim()).filter(Boolean).forEach(x => { if (!corsi.includes(x)) corsi.push(x); });
      const com = String(fd.get('com') || '');
      const k = modMan === 'nuovo' ? chiaveManuale(n, com) : modMan;
      salvaManuale(k, {n: titolo(n), q: String(fd.get('q') || ''), c: String(fd.get('c') || '').replace(/[^\d+ ]/g, '').trim(), com, t: String(fd.get('t') || ''), s: String(fd.get('s') || ''), corsi});
      modMan = null; disegna();
      return;
    }
    if (e.target.id !== 'pros-sblocca') return;
    e.preventDefault();
    const x = root.querySelector('#pros-pwd'); sblocca(x ? x.value : '');
  });
  root.addEventListener('input', e => {
    if (e.target.id === 'pros-testo') {
      f.testo = e.target.value; const pos = e.target.selectionStart;
      disegna(); const x = root.querySelector('#pros-testo'); if (x) { x.focus(); x.setSelectionRange(pos, pos); }
    }
  });
  document.addEventListener('fireops:comando-attivo-cambiato', () => { const c = comandoDefault(); if (c) { f.comando = c; f.corso = ''; f.qual = ''; salvaFiltri(); disegna(); scaricaTurni(); } });
  window.addEventListener('online', () => { if (coda.length) invia(); });
  // nel richiamo "adesso" scorre: si ridisegna ogni minuto (solo se la scheda e' visibile e nessun menu e' aperto)
  setInterval(() => {
    const sez = document.getElementById('prospetto-disponibilita');
    if (f.scheda === 'richiamo' && sez && sez.offsetParent !== null && !root.contains(document.activeElement)) disegna();
  }, 60000);
  // il foglio si rilegge ogni tanto (altri PC possono aver cambiato i turni) e si ritenta l'invio
  setInterval(() => {
    if (carico.stato !== 'ok' || document.hidden) return;
    if (coda.length) invia();
    const sez = document.getElementById('prospetto-disponibilita');
    if (sez && sez.offsetParent !== null) scaricaTurni();
  }, SYNC_MS);
}

/* ============================== AVVIO ============================== */

let avviato = false;
function avvia() {
  root = document.getElementById('pros-app');
  if (!root || avviato) return;
  avviato = true;
  ricomponi(); eventi(); disegna();
  // si legge PUMA solo quando la scheda viene aperta la prima volta: sono migliaia di righe
  const sez = document.getElementById('prospetto-disponibilita');
  const parti = () => { if (carico.stato === 'vuoto') carica(); };
  if (sez && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver(v => { if (v.some(x => x.isIntersecting)) { io.disconnect(); parti(); } });
    io.observe(sez);
  } else parti();
}

NS.Prospetto = {avvia, carica, scaricaTurni, _turno: turnoAlMomento, _dati: () => ({righe, turni, f, carico, coda, sync})};
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', avvia); else avvia();
})();
