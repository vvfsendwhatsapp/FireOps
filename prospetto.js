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
 *    con una copia locale per lavorare anche senza rete. Con la data e la fascia scelte, la sequenza
 *    dei turni di fireops-core.js dice chi e' in servizio, chi e' di salto e chi e' libero.
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
const TURNI = ['A', 'B', 'C', 'D', 'G'];
const SALTI = ['1', '2', '3', '4', '5', '6', '7', '8'];
const ORDINE_QUAL = ['D', 'DS', 'IA', 'CR', 'CSE', 'CS', 'VC', 'VESC', 'VE', 'VF'];
const NOMI_STATO = {servizio: 'In servizio', salto: 'Salto turno', libero: 'Libero', nd: 'Turno da impostare'};

/* ============================== STATO ============================== */

let root = null;
let righe = [];            // personale letto da PUMA (deduplicato)
let carico = {stato: 'vuoto', errore: '', ora: null};
let turni = leggi(LS_TURNI, {});
let coda = leggi(LS_CODA, []);                // [chiave, ...]
let sync = {stato: '', errore: '', ora: null};
let nomi = {};                                // chiave → {comando, cognome, nome} per l'invio al foglio
const f = Object.assign({comando: '', data: '', fascia: fasciaAdesso(), corso: '', qual: '', testo: '', stato: ''},
  leggi(LS_FILTRI, {}), {data: dataAdesso(), fascia: fasciaAdesso()});
delete f.corsi; delete f.tutti;   // filtri della prima versione (piu' corsi insieme)

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
function salvaFiltri() { scrivi(LS_FILTRI, {comando: f.comando, corso: f.corso, qual: f.qual, stato: f.stato}); }
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
  return out.map(x => x.replace(/\s+/g, ' '));
}
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
    righe = Array.from(mappa.values());
    righe.forEach(p => { nomi[p.k] = {comando: p.comando, cognome: p.cognome, nome: p.nome}; });
    scrivi(LS_TURNI, turni);
    carico = {stato: 'ok', errore: '', ora: new Date()};
    if (!f.comando) f.comando = comandoDefault();
  } catch (e) {
    carico = {stato: 'err', errore: e.message || String(e), ora: carico.ora};
  }
  disegna();
  if (carico.stato === 'ok') { scaricaTurni(); invia(); }
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
      if (!loc || (v.ts || 0) > (loc.ts || 0)) { turni[k] = {t: v.t || '', s: v.s || '', ts: v.ts || 0}; cambi++; }
    });
    if (cambi) scrivi(LS_TURNI, turni);
    sync = {stato: coda.length ? 'attesa' : 'ok', errore: '', ora: new Date()};
  } catch (e) {
    sync = {stato: 'err', errore: e.name === 'AbortError' ? 'tempo scaduto' : (e.message || String(e)), ora: sync.ora};
  }
  disegna();
}
let timerInvio = null, inviando = false;
function programmaInvio() { clearTimeout(timerInvio); timerInvio = setTimeout(invia, 1500); }
async function invia() {
  if (inviando || !coda.length) return;
  inviando = true;
  const chiavi = coda.slice(0, 500);
  const voci = chiavi.map(k => {
    const v = turni[k] || {t: '', s: '', ts: Date.now()}, n = nomi[k] || {};
    return {k, comando: n.comando || '', cognome: n.cognome || '', nome: n.nome || '', t: v.t || '', s: v.s || '', ts: v.ts || Date.now()};
  });
  sync.stato = 'invio'; disegna();
  try {
    await chiedi(WEBAPP, {method: 'POST', headers: {'Content-Type': 'text/plain;charset=utf-8'}, body: JSON.stringify({foglio: 'DB_Turni_Personale', voci})}, 30000);
    coda = coda.filter(k => !chiavi.includes(k)); scrivi(LS_CODA, coda);
    sync = {stato: coda.length ? 'attesa' : 'ok', errore: '', ora: new Date()};
  } catch (e) {
    sync = {stato: 'err', errore: e.name === 'AbortError' ? 'tempo scaduto' : (e.message || String(e)), ora: sync.ora};
  } finally { inviando = false; }
  disegna();
  if (coda.length && sync.stato !== 'err') programmaInvio();
}
// modifica di turno/salto di una persona: copia locale subito, foglio appena possibile
function impostaTurno(k, t, s) {
  turni[k] = {t: t || '', s: t === 'G' ? '' : (s || ''), ts: Date.now()};
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
  if (t.t === 'G') {
    const gs = new Date(f.data + 'T12:00:00Z').getUTCDay();
    return (f.fascia === 'giorno' && gs >= 1 && gs <= 5) ? 'servizio' : 'libero';
  }
  if (!sigla) return 'nd';
  if (sigla.charAt(0).toUpperCase() !== t.t) return 'libero';
  return (t.s && sigla.slice(1) === String(t.s)) ? 'salto' : 'servizio';
}

/* ============================== FILTRI ============================== */

function delComando() { const n = normComando(f.comando); return n ? righe.filter(p => normComando(p.comando) === n) : righe; }
function filtrati(sigla) {
  const testo = norm(f.testo);
  return delComando().filter(p => {
    if (f.qual && p.qual !== f.qual) return false;
    if (f.corso && !p.corsi.includes(f.corso)) return false;
    if (testo && !norm(p.cognome + p.nome + p.cell).includes(testo)) return false;
    if (f.stato && statoPersona(p, sigla) !== f.stato) return false;
    return true;
  }).sort((a, b) => {
    const qa = ORDINE_QUAL.indexOf(a.qual), qb = ORDINE_QUAL.indexOf(b.qual);
    return (qa < 0 ? 99 : qa) - (qb < 0 ? 99 : qb) || a.cognome.localeCompare(b.cognome, 'it') || a.nome.localeCompare(b.nome, 'it');
  });
}

/* ============================== DISEGNO ============================== */

function disegna() {
  if (!root) return;
  const sigla = siglaFascia();
  const elenco = filtrati(sigla);
  const base = delComando();
  const corsiDisp = Array.from(new Set(base.flatMap(p => p.corsi))).sort((a, b) => a.localeCompare(b, 'it'));
  const qualDisp = Array.from(new Set(base.map(p => p.qual).filter(Boolean))).sort((a, b) => {
    const qa = ORDINE_QUAL.indexOf(a), qb = ORDINE_QUAL.indexOf(b); return (qa < 0 ? 99 : qa) - (qb < 0 ? 99 : qb) || a.localeCompare(b);
  });
  const conta = {servizio: 0, salto: 0, libero: 0, nd: 0};
  const senzaStato = (() => { const s = f.stato; f.stato = ''; const l = filtrati(sigla); f.stato = s; return l; })();
  senzaStato.forEach(p => conta[statoPersona(p, sigla)]++);

  // corsi fra chi e' in servizio
  const perCorso = {};
  senzaStato.filter(p => statoPersona(p, sigla) === 'servizio').forEach(p => p.corsi.forEach(c => { perCorso[c] = (perCorso[c] || 0) + 1; }));
  const corsiServizio = Object.entries(perCorso).sort((a, b) => b[1] - a[1]);

  const statoCarico = carico.stato === 'carico' ? '<span class="pros-sync">⏳ Lettura da PUMA…</span>'
    : carico.stato === 'err' ? '<span class="pros-sync err">⚠️ PUMA non raggiungibile: ' + esc(carico.errore) + '</span>'
    : carico.ora ? '<span class="pros-sync ok">✓ PUMA · ' + righe.length + ' persone · ' + carico.ora.toLocaleTimeString('it-IT', {hour: '2-digit', minute: '2-digit'}) + '</span>' : '';
  const ora = d => d ? ' · ' + d.toLocaleTimeString('it-IT', {hour: '2-digit', minute: '2-digit'}) : '';
  const statoSync = sync.stato === 'err' ? '<span class="pros-sync err">⚠️ Foglio turni non raggiungibile (' + esc(sync.errore) + ')' + (coda.length ? ': ' + coda.length + ' modifiche in attesa' : '') + '</span>'
    : sync.stato === 'invio' ? '<span class="pros-sync">⏳ Salvo i turni sul foglio…</span>'
    : coda.length ? '<span class="pros-sync">⏳ ' + coda.length + ' modifiche da salvare</span>'
    : sync.stato === 'ok' ? '<span class="pros-sync ok">✓ Turni sul foglio' + ora(sync.ora) + '</span>' : '';

  const lettera = sigla.charAt(0).toUpperCase(), num = sigla.slice(1);
  root.innerHTML = `
  <div class="pros-avviso">🚧 Sezione in costruzione. Personale e corsi arrivano da PUMA; <b>turno e salto turno</b> non sono su PUMA: si impostano qui e si salvano sul foglio Google (DB_Turni_Personale), così li ritrovano tutti i PC.</div>
  <div class="pros-testa">
    <label>Comando
      <select id="pros-comando"><option value="">Tutti i comandi</option>${comandi().map(c => `<option${c === f.comando ? ' selected' : ''}>${esc(c)}</option>`).join('')}</select></label>
    <label>Data <input type="date" id="pros-data" value="${esc(f.data)}"></label>
    <div class="pros-fasce">
      <button type="button" class="pros-fascia${f.fascia === 'giorno' ? ' on' : ''}" data-fascia="giorno">☀️ Giorno 08-20</button>
      <button type="button" class="pros-fascia${f.fascia === 'notte' ? ' on' : ''}" data-fascia="notte">🌙 Notte 20-08</button>
    </div>
    <div class="pros-sigla">${sigla ? `In servizio: <b>turno ${esc(lettera)}</b>, salta il <b>${esc(num)}</b> <span>(${esc(sigla)})</span>` : 'Turno non calcolabile'}</div>
    <div class="pros-stati">${statoCarico}${statoSync}</div>
  </div>

  <div class="pros-box pros-box-corso">
    <label class="pros-corso">Corso
      <select id="pros-corso"${corsiDisp.length ? '' : ' disabled'}>
        <option value="">${corsiDisp.length ? 'Tutti i corsi (' + corsiDisp.length + ')' : (carico.stato === 'ok' ? 'Nessun corso registrato' : 'In attesa dei dati PUMA')}</option>
        ${corsiDisp.map(c => `<option value="${esc(c)}"${c === f.corso ? ' selected' : ''}>${esc(c)} — ${base.filter(p => p.corsi.includes(c)).length}</option>`).join('')}
      </select></label>
  </div>

  <div class="pros-conta">
    ${['servizio', 'salto', 'libero', 'nd'].map(s => `<button type="button" class="pros-kpi st-${s}${f.stato === s ? ' on' : ''}" data-stato="${s}"><b>${conta[s]}</b><span>${NOMI_STATO[s]}</span></button>`).join('')}
  </div>
  ${corsiServizio.length ? `<div class="pros-servizio-corsi"><span class="pros-lab">Corsi fra chi è in servizio:</span> ${corsiServizio.map(([c, n]) => `<span class="pros-chip on" title="${esc(c)}">${esc(siglaCorso(c))} · ${n}</span>`).join('')}</div>` : ''}

  <div class="pros-barra">
    <input type="search" id="pros-testo" placeholder="Cerca cognome, nome o cellulare" value="${esc(f.testo)}">
    <select id="pros-qual"><option value="">Tutte le qualifiche</option>${qualDisp.map(q => `<option${q === f.qual ? ' selected' : ''}>${esc(q)}</option>`).join('')}</select>
    <button type="button" class="pros-btn" id="pros-aggiorna">🔄 Aggiorna da PUMA</button>
    <button type="button" class="pros-btn" id="pros-csv"${elenco.length ? '' : ' disabled'}>⬇️ CSV prospetto</button>
    <button type="button" class="pros-btn" id="pros-esporta">💾 Esporta turni</button>
    <button type="button" class="pros-btn" id="pros-importa">📂 Importa turni</button>
    <button type="button" class="pros-btn danger" id="pros-reset">🗑️ Reset dati</button>
    <input type="file" id="pros-file" accept=".json,application/json" hidden>
  </div>

  ${elenco.length ? `
  <div class="pros-tabwrap"><table class="pros-tab">
    <thead><tr><th>Personale</th><th>Qual.</th><th>Corsi</th><th>Cellulare</th><th>Turno</th><th>Salto</th><th>Stato</th></tr></thead>
    <tbody>${elenco.map(p => {
      const t = turni[p.k] || {}, st = statoPersona(p, sigla);
      return `<tr class="st-${st}" data-k="${esc(p.k)}">
        <td data-l="Personale"><b>${esc(p.cognome)}</b> ${esc(p.nome)}${f.comando ? '' : `<div class="pros-com">${esc(p.comando)}</div>`}</td>
        <td data-l="Qualifica">${esc(p.qual)}</td>
        <td data-l="Corsi">${p.corsi.map(c => `<span class="pros-chip${c === f.corso ? ' on' : ''}" title="${esc(c)}">${esc(siglaCorso(c))}</span>`).join('') || '<span class="pros-nota">—</span>'}</td>
        <td data-l="Cellulare">${p.cell ? `<a href="tel:${esc(p.cell)}">${esc(p.cell)}</a>` : ''}</td>
        <td data-l="Turno"><select data-campo="t"><option value="">—</option>${TURNI.map(x => `<option${x === t.t ? ' selected' : ''}>${x}</option>`).join('')}</select></td>
        <td data-l="Salto"><select data-campo="s"${t.t === 'G' ? ' disabled' : ''}><option value="">—</option>${SALTI.map(x => `<option${x === String(t.s || '') ? ' selected' : ''}>${x}</option>`).join('')}</select></td>
        <td data-l="Stato"><span class="pros-stato st-${st}">${NOMI_STATO[st]}</span></td>
      </tr>`;
    }).join('')}</tbody></table></div>`
    : `<div class="pros-vuoto">${carico.stato === 'ok' ? 'Nessuna persona con questi filtri.' : carico.stato === 'err' ? 'Dati PUMA non disponibili.' : 'Caricamento…'}</div>`}`;
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
  const righeCsv = [['Cognome', 'Nome', 'Qualifica', 'Comando', 'Cellulare', 'Corsi', 'Turno', 'Salto', 'Stato'].map(q).join(';')];
  filtrati(sigla).forEach(p => { const t = turni[p.k] || {}; righeCsv.push([p.cognome, p.nome, p.qual, p.comando, p.cell, p.corsi.join(' | '), t.t || '', t.s || '', NOMI_STATO[statoPersona(p, sigla)]].map(q).join(';')); });
  scarica('prospetto_' + f.data + '_' + f.fascia + '.csv', '﻿' + righeCsv.join('\r\n'), 'text/csv;charset=utf-8');
}
function importa(file) {
  const r = new FileReader();
  r.onload = () => {
    try {
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
    if (b.dataset.stato) { f.stato = f.stato === b.dataset.stato ? '' : b.dataset.stato; salvaFiltri(); disegna(); return; }
    switch (b.id) {
      case 'pros-aggiorna': carica(); break;
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
    if (t.id === 'pros-comando') { f.comando = t.value; f.corso = ''; f.qual = ''; salvaFiltri(); disegna(); scaricaTurni(); return; }
    if (t.id === 'pros-corso') { f.corso = t.value; salvaFiltri(); disegna(); return; }
    if (t.id === 'pros-data') { if (t.value) { f.data = t.value; disegna(); } return; }
    if (t.id === 'pros-qual') { f.qual = t.value; salvaFiltri(); disegna(); return; }
    if (t.id === 'pros-file') { if (t.files[0]) importa(t.files[0]); t.value = ''; return; }
    const tr = t.closest('tr[data-k]');
    if (tr && t.dataset.campo) {
      const k = tr.dataset.k, v = Object.assign({t: '', s: ''}, turni[k]);
      v[t.dataset.campo] = t.value;
      impostaTurno(k, v.t, v.s); disegna();
    }
  });
  root.addEventListener('input', e => {
    if (e.target.id === 'pros-testo') {
      f.testo = e.target.value; const pos = e.target.selectionStart;
      disegna(); const x = root.querySelector('#pros-testo'); if (x) { x.focus(); x.setSelectionRange(pos, pos); }
    }
  });
  document.addEventListener('fireops:comando-attivo-cambiato', () => { const c = comandoDefault(); if (c) { f.comando = c; f.corso = ''; f.qual = ''; salvaFiltri(); disegna(); scaricaTurni(); } });
  window.addEventListener('online', () => { if (coda.length) invia(); });
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
  eventi(); disegna();
  // si legge PUMA solo quando la scheda viene aperta la prima volta: sono migliaia di righe
  const sez = document.getElementById('prospetto-disponibilita');
  const parti = () => { if (carico.stato === 'vuoto') carica(); };
  if (sez && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver(v => { if (v.some(x => x.isIntersecting)) { io.disconnect(); parti(); } });
    io.observe(sez);
  } else parti();
}

NS.Prospetto = {avvia, carica, scaricaTurni, _dati: () => ({righe, turni, f, carico, coda, sync})};
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', avvia); else avvia();
})();
