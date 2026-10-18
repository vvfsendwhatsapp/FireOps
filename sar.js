/*!
 * FireOps VVF — sar.js — SAR · Gestione ricerca persona (sala operativa)
 * Dipendenze: Leaflet 1.9 · Geoman 2.15 · fireops-core.js · fireops-sfondi.js · qrcode.js (FireOpsQR)
 * Markup:     sezione #sar-gestione di index-bis.html (il contenuto lo costruisce questo file dentro #sar-app)
 * Stile:      style.css, sezione MODULI AGGIUNTIVI ("SAR - GESTIONE RICERCA")
 * Backend:    Web App Apps Script di Messaggistica/Locator, file apps-script/registrazioni.gs
 *             (fogli DB_Ricerche_Gestione, DB_Registrazioni, DB_SAR_Stato)
 *
 * SCHEDE
 *  - Ricerche aperte: elenco del Comando attivo, nuova ricerca (ID nel formato di Messaggistica
 *    00000456_2026_ComFC), QR di registrazione (della ricerca e fisso del Comando) da scaricare.
 *  - Personale: giorno per giorno chi c'e', aggiunto a mano o registrato con il QR.
 *  - Squadre: personale del giorno in squadre, con ID squadra, canale radio, GPS e team leader.
 *  - Zone: zonizzazione (griglia attorno al PUA o disegno a mano), assegnazione squadra-zona,
 *    esportazione GPX/KML della zona con orario di assegnazione, carta per giorno e per livello.
 *  - Orari: rientro delle squadre dalle zone, bonificata si'/no.
 *
 * DATI CONDIVISI
 * Lo stato della ricerca sta sul foglio (DB_SAR_Stato) e in copia su questo PC. Ogni elemento
 * (persona, squadra, zona, assegnazione) ha un id e l'ora dell'ultima modifica "t": il foglio
 * fonde elemento per elemento, quindi piu' PC possono lavorare insieme. Senza rete si continua
 * a lavorare: le modifiche partono appena torna la connessione.
 * Per leggere e scrivere serve la "chiave" della ricerca: ce l'ha il PC che l'ha creata; agli
 * altri si passa come "codice di accesso" (scheda Ricerche aperte).
 */
(function () {
'use strict';
const NS = (window.FireOps = window.FireOps || {});
if (NS.SAR) return;

/* ============================== COSTANTI ============================== */

const WEBAPP = 'https://script.google.com/macros/s/AKfycbyp6jQ331Yk5q7_hkM74ZyhUh1c3zQUJG7SpuoE18HslBO36YKSTYIQf-z7gSwXR4Yv/exec';
const URL_REGISTRAZIONE = 'https://vvfsendwhatsapp.github.io/FireOps/app/registrazione.html';

// stesso ordine dell'app (app/js/moduli/gestione.js) e della pagina di registrazione
const ENTI = ['VVF', 'CRI', 'Protezione Civile', 'Carabinieri', 'Carabinieri Forestali', 'Guardia di Finanza', 'Polizia di Stato', 'Polizia Locale', 'CNSAS', 'Altro volontariato', 'Altro'];
const QUALIFICHE = [
  ['Vigili del fuoco', [['VF', 'Vigile del fuoco'], ['VE', 'Vigile del fuoco esperto'], ['VESC', 'Vigile del fuoco esperto scatto convenzionale'], ['VC', 'Vigile del fuoco coordinatore']]],
  ['Capi squadra e capi reparto', [['CS', 'Capo squadra'], ['CSE', 'Capo squadra esperto'], ['CR', 'Capo reparto']]],
  ['Ispettori e sostituti direttori', [['Viceispettore antincendi', 'Viceispettore antincendi'], ['IA', 'Ispettore antincendi'], ['Ispettore antincendi esperto', 'Ispettore antincendi esperto'],
    ['Sostituto direttore antincendi', 'Sostituto direttore antincendi'], ['Sostituto direttore antincendi capo', 'Sostituto direttore antincendi capo'], ['Sostituto direttore antincendi capo esperto', 'Sostituto direttore antincendi capo esperto']]],
  ['Direttivi', [['Vice direttore', 'Vice direttore'], ['D', 'Direttore'], ['Direttore vice dirigente', 'Direttore vice dirigente']]],
  ['Dirigenti', [['Primo dirigente', 'Primo dirigente'], ['Dirigente superiore', 'Dirigente superiore'], ['Dirigente generale', 'Dirigente generale']]],
  ['Volontari', [['Vigile del fuoco volontario', 'Vigile del fuoco volontario'], ['Capo squadra volontario', 'Capo squadra volontario'], ['Capo reparto volontario', 'Capo reparto volontario']]]
];
const SPEC = [['cinofilo', 'Cinofilo'], ['smzt', 'SMZT'], ['saf', 'SAF']];
// livelli di ricerca = tipo di squadra; ogni zona si bonifica livello per livello
const LIVELLI = [['ordinaria', 'Squadra a terra'], ['cinofila', 'K9 cinofili'], ['drone', 'Drone APR'], ['elicottero', 'Elicottero'], ['saf', 'SAF'], ['smzt', 'SMZT']];
const ESITI = [['bonificata', 'Bonificata'], ['parziale', 'Bonificata in parte'], ['non_bonificata', 'Non bonificata']];
// colori dello stato delle zone sulla carta
const COLORI = {aperta: '#9aa6b4', assegnata: '#ffd700', bonificata: '#2fbf71', parziale: '#ff9f1c', non_bonificata: '#e5484d', conclusa: '#4f8cff'};
const NOMI_STATO = {aperta: 'Aperta', assegnata: 'Squadra in zona', bonificata: 'Bonificata', parziale: 'Bonificata in parte', non_bonificata: 'Non bonificata', conclusa: 'Conclusa'};

const LS_CHIAVI = 'fireops_sar_chiavi';      // {idRicerca: chiave}
const LS_ATTIVA = 'fireops_sar_attiva';      // id della ricerca aperta su questo PC
const LS_STATO = 'fireops_sar_stato_';       // + id: {versione, sporco, stato}
const SYNC_MS = 20000;                       // controllo novita' dal foglio
const REG_MS = 60000;                        // scarico dei registrati con il QR

/* ============================== UTILITA' ============================== */

const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const nuovoId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const ora = () => Date.now();
const leggi = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k) || 'null'); return v == null ? d : v; } catch (e) { return d; } };
const scrivi = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } };
const due = n => String(n).padStart(2, '0');
const giornoDi = d => d.getFullYear() + '-' + due(d.getMonth() + 1) + '-' + due(d.getDate());
const oggi = () => giornoDi(new Date());
const fmtGiorno = g => { const [a, m, d] = g.split('-'); return d + '/' + m + '/' + a; };
const fmtOra = iso => { if (!iso) return ''; const d = new Date(iso); return isNaN(d) ? '' : due(d.getHours()) + ':' + due(d.getMinutes()); };
const nomeLivello = k => (LIVELLI.find(x => x[0] === k) || [, k])[1];
const nomeEsito = k => (ESITI.find(x => x[0] === k) || [, k])[1];
const nomeP = p => p ? ((p.qual ? p.qual + ' ' : '') + (p.cognome + ' ' + (p.nome || '')).trim()).trim() : '?';
const vivi = arr => (arr || []).filter(e => !e.del);

function nuovaChiave() {
  const a = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789', r = new Uint32Array(20);
  crypto.getRandomValues(r);
  return Array.from(r, x => a[x % a.length]).join('');
}
function idRicerca(numero, anno, sigla) {
  return String(numero || '').replace(/\D/g, '').padStart(8, '0').slice(-8) + '_' + anno + '_' + sigla;
}
function siglaComando() {
  const c = window.FireOpsComandoAttivo;
  return c && c.Provincia ? 'Com' + String(c.Provincia).trim().toUpperCase() : '';
}
function nomeComando() { const c = window.FireOpsComandoAttivo; return c ? c.Comando : ''; }

// stessa fusione del foglio (registrazioni.gs, grFondi_): vince l'elemento con "t" piu' recente
const RACCOLTE = ['pers', 'sq', 'zone', 'ass'];
function fondi(a, b) {
  a = a || {}; b = b || {};
  const out = {v: 1};
  const ia = a.info || {}, ib = b.info || {};
  out.info = (Number(ib.t) || 0) >= (Number(ia.t) || 0) ? ib : ia;
  RACCOLTE.forEach(k => {
    const m = new Map();
    (a[k] || []).forEach(e => { if (e && e.id) m.set(e.id, e); });
    (b[k] || []).forEach(e => { if (!e || !e.id) return; const g = m.get(e.id); if (!g || (Number(e.t) || 0) >= (Number(g.t) || 0)) m.set(e.id, e); });
    out[k] = [...m.values()];
  });
  return out;
}
const statoVuoto = () => ({v: 1, info: {t: 0}, pers: [], sq: [], zone: [], ass: []});

async function getJson(params, ms = 20000) {
  const ctrl = new AbortController(), tm = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(WEBAPP + '?' + new URLSearchParams(params), {signal: ctrl.signal});
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return await r.json();
  } finally { clearTimeout(tm); }
}
async function postJson(corpo, ms = 30000) {
  const ctrl = new AbortController(), tm = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(WEBAPP, {method: 'POST', headers: {'Content-Type': 'text/plain;charset=utf-8'}, body: JSON.stringify(corpo), signal: ctrl.signal});
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return await r.json();
  } finally { clearTimeout(tm); }
}

function scarica(nome, contenuto, tipo) {
  const a = document.createElement('a');
  a.href = contenuto instanceof Blob ? URL.createObjectURL(contenuto) : URL.createObjectURL(new Blob([contenuto], {type: tipo || 'text/plain'}));
  a.download = nome; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
const nomeFile = s => String(s).replace(/[^\w\-]+/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');

/* ============================== STATO DEL MODULO ============================== */

let root = null;
let scheda = 'ricerche';
let ricerca = null;          // {id, nome, sigla, comando, stato}
let chiave = '';
let st = statoVuoto();       // stato condiviso della ricerca
let versione = 0;
let sporco = false;          // modifiche locali non ancora sul foglio
let giorno = oggi();
let sync = {fase: 'off', msg: '', ultimo: null};
let timerSalva = null, timerSync = null, timerReg = null, salvataggioInCorso = false;
let elenco = {caricato: false, ricerche: [], errore: ''};
let modifica = null;         // {tipo, id} modulo aperto nelle schede
let filtroPers = '', tuttiPers = false, msgReg = '';
let livelloMappa = '';       // '' = tutti i livelli
let mappa = null, livZone = null, mkPua = null, posaPua = false;

const chiavi = () => leggi(LS_CHIAVI, {});
function salvaChiave(id, k) { const c = chiavi(); c[id] = k; scrivi(LS_CHIAVI, c); }

/* ============================== SINCRONIZZAZIONE ============================== */

function salvaLocale() {
  if (!ricerca) return;
  scrivi(LS_STATO + ricerca.id, {versione, sporco, stato: st, ricerca});
}

// ogni modifica passa da qui: ora della modifica, copia locale, invio al foglio poco dopo
function cambia(raccolta, el) {
  el.t = ora();
  if (raccolta === 'info') st.info = el;
  else {
    const i = st[raccolta].findIndex(x => x.id === el.id);
    if (i >= 0) st[raccolta][i] = el; else st[raccolta].push(el);
  }
  sporco = true; salvaLocale();
  clearTimeout(timerSalva); timerSalva = setTimeout(salvaSulFoglio, 1200);
  disegnaStatoSync();
}
function elimina(raccolta, id) {
  const e = st[raccolta].find(x => x.id === id);
  if (e) cambia(raccolta, Object.assign({}, e, {del: true}));
}

async function salvaSulFoglio() {
  if (!ricerca || !chiave || !sporco) return;
  if (salvataggioInCorso) { clearTimeout(timerSalva); timerSalva = setTimeout(salvaSulFoglio, 1500); return; }
  salvataggioInCorso = true;
  sync = {fase: 'salva', msg: 'Salvataggio…', ultimo: sync.ultimo}; disegnaStatoSync();
  const inviato = JSON.stringify(st);
  try {
    const j = await postJson({foglio: 'DB_SAR_Stato', id: ricerca.id, chiave, stato: st});
    if (!j || !j.ok) throw new Error((j && j.errore) || 'risposta');
    versione = j.versione;
    // modifiche fatte mentre si salvava: restano (vincono per "t") e ripartono
    const cambiatoNelFrattempo = JSON.stringify(st) !== inviato;
    st = fondi(j.stato, st);
    sporco = cambiatoNelFrattempo;
    sync = {fase: 'ok', msg: '', ultimo: new Date()};
    salvaLocale(); ridisegnaSeLibero();
    if (sporco) { clearTimeout(timerSalva); timerSalva = setTimeout(salvaSulFoglio, 800); }
  } catch (e) {
    sync = {fase: 'err', msg: /chiave/.test(e.message) ? 'Il foglio non riconosce la chiave di questa ricerca' : 'Non in linea: modifiche salvate su questo PC, riprovo', ultimo: sync.ultimo};
    clearTimeout(timerSalva); timerSalva = setTimeout(salvaSulFoglio, 15000);
  } finally {
    salvataggioInCorso = false; disegnaStatoSync();
  }
}

async function leggiDalFoglio() {
  if (!ricerca || !chiave || salvataggioInCorso) return;
  try {
    const j = await getJson({sarStato: ricerca.id, chiave, v: versione});
    if (!j || !j.ok) throw new Error((j && j.errore) || 'risposta');
    if (j.statoRicerca && ricerca.stato !== j.statoRicerca) { ricerca.stato = j.statoRicerca; salvaLocale(); }
    if (!j.invariato) {
      versione = j.versione;
      st = fondi(j.stato, st);   // le mie modifiche non ancora salvate restano
      salvaLocale(); ridisegnaSeLibero();
    }
    if (sync.fase !== 'salva') sync = {fase: sporco ? 'err' : 'ok', msg: sporco ? 'Modifiche da inviare' : '', ultimo: new Date()};
    if (sporco) salvaSulFoglio();
  } catch (e) {
    if (sync.fase !== 'salva') sync = {fase: 'err', msg: /chiave/.test(e.message) ? 'Il foglio non riconosce la chiave di questa ricerca' : 'Non in linea: lavoro su questo PC', ultimo: sync.ultimo};
  }
  disegnaStatoSync();
}

function avviaTimer() {
  clearInterval(timerSync); clearInterval(timerReg);
  timerSync = setInterval(() => { if (document.visibilityState !== 'hidden') leggiDalFoglio(); }, SYNC_MS);
  timerReg = setInterval(() => { if (document.visibilityState !== 'hidden') scaricaRegistrati(true); }, REG_MS);
}

function disegnaStatoSync() {
  const el = root && root.querySelector('#sar-sync');
  if (!el) return;
  if (!ricerca) { el.textContent = ''; el.className = 'sar-sync'; return; }
  const u = sync.ultimo ? ' ' + due(sync.ultimo.getHours()) + ':' + due(sync.ultimo.getMinutes()) : '';
  const t = sync.fase === 'salva' ? '⟳ Salvataggio…' : sync.fase === 'err' ? '⚠ ' + sync.msg : sporco ? '⟳ Modifiche da inviare' : '✔ Sincronizzato' + u;
  el.textContent = t;
  el.className = 'sar-sync' + (sync.fase === 'err' ? ' err' : sync.fase === 'ok' && !sporco ? ' ok' : '');
}

/* Apertura di una ricerca su questo PC */
async function attiva(meta, k) {
  ricerca = Object.assign({}, meta); chiave = k;
  salvaChiave(meta.id, k); scrivi(LS_ATTIVA, meta.id);
  const loc = leggi(LS_STATO + meta.id, null);
  st = loc && loc.stato ? fondi(statoVuoto(), loc.stato) : statoVuoto();
  versione = loc ? loc.versione || 0 : 0;
  sporco = !!(loc && loc.sporco);
  if (!st.info.inizio) { st.info = Object.assign({}, st.info, {inizio: oggi(), nome: meta.nome || ''}); st.info.t = 0; }
  sync = {fase: 'off', msg: '', ultimo: null};
  modifica = null;
  disegna();
  await leggiDalFoglio();
  scaricaRegistrati(true);
  avviaTimer();
}
function disattiva() {
  clearInterval(timerSync); clearInterval(timerReg); clearTimeout(timerSalva);
  ricerca = null; chiave = ''; st = statoVuoto(); versione = 0; sporco = false;
  try { localStorage.removeItem(LS_ATTIVA); } catch (e) {}
}

/* ============================== REGISTRATI CON IL QR ============================== */

async function scaricaRegistrati(silenzioso) {
  if (!ricerca || !chiave) return;
  const out = root.querySelector('#sar-reg-stato');
  if (out && !silenzioso) out.textContent = 'Scarico i registrati…';
  try {
    const j = await getJson({registrazioni: ricerca.id, chiave});
    if (!j || !Array.isArray(j.persone)) throw new Error((j && j.errore) || 'risposta');
    let nuovi = 0, agg = 0;
    const chiaveNome = p => (p.cognome + '|' + (p.nome || '')).toLowerCase().replace(/\s+/g, ' ').trim();
    j.persone.forEach(r => {
      if (!r.id || !r.cognome) return;
      const g = r.registrata ? giornoDi(new Date(r.registrata)) : oggi();
      const d = {cognome: r.cognome, nome: r.nome || '', ente: ENTI.includes(r.ente) ? r.ente : (r.ente ? 'Altro' : 'VVF'),
        qual: r.ente === 'VVF' ? (r.qual || '') : '', ruolo: r.ente === 'VVF' ? '' : (r.ruolo || ''), tel: r.tel || '',
        spec: (r.spec || []).filter(k => SPEC.some(x => x[0] === k))};
      const p = vivi(st.pers).find(x => x.reg === r.id) || vivi(st.pers).find(x => !x.reg && chiaveNome(x) === chiaveNome(d));
      if (p) {
        const giorni = Object.assign({}, p.giorni); const nuovoGiorno = !giorni[g]; giorni[g] = true;
        const prima = JSON.stringify([p.cognome, p.nome, p.ente, p.qual, p.ruolo, p.tel, p.spec, p.reg]);
        const dopo = Object.assign({}, p, d, {reg: r.id, giorni});
        if (JSON.stringify([dopo.cognome, dopo.nome, dopo.ente, dopo.qual, dopo.ruolo, dopo.tel, dopo.spec, dopo.reg]) !== prima || nuovoGiorno) { cambia('pers', dopo); agg++; }
      } else {
        cambia('pers', Object.assign({id: nuovoId(), reg: r.id, note: r.note || '', giorni: {[g]: true}}, d)); nuovi++;
      }
    });
    const msg = j.persone.length + (j.persone.length === 1 ? ' registrata con il QR' : ' registrate con il QR') +
      (nuovi ? ' · ' + nuovi + ' nuove' : '') + (agg ? ' · ' + agg + ' aggiornate' : '');
    msgReg = msg + ' (' + fmtOra(new Date().toISOString()) + ')';
    const o2 = root.querySelector('#sar-reg-stato'); if (o2) o2.textContent = msgReg;
    if (nuovi || agg) ridisegnaSeLibero();
  } catch (e) {
    const o2 = root.querySelector('#sar-reg-stato');
    if (o2 && !silenzioso) o2.textContent = 'Registrati non disponibili: serve la connessione e lo script Apps Script aggiornato.';
  }
}

/* ============================== QR ============================== */

function linkRegistrazione(tipo) {
  const u = new URL(URL_REGISTRAZIONE);
  if (tipo === 'comando') u.searchParams.set('c', ricerca ? ricerca.sigla : siglaComando());
  else u.searchParams.set('r', tipo);
  return u.toString();
}
// PNG con il QR e due righe di testo sotto: si stampa o si manda in chat
function pngQR(testo, titolo, sotto) {
  const qr = window.FireOpsQR.genera(testo, 'M');
  const n = qr.dimensione, scala = 10, bordo = 4, lato = (n + bordo * 2) * scala, alto = lato + 90;
  const cv = document.createElement('canvas'); cv.width = lato; cv.height = alto;
  const c = cv.getContext('2d');
  c.fillStyle = '#fff'; c.fillRect(0, 0, lato, alto); c.fillStyle = '#000';
  for (let r = 0; r < n; r++) for (let k = 0; k < n; k++) if (qr.moduli[r][k]) c.fillRect((k + bordo) * scala, (r + bordo) * scala, scala, scala);
  c.textAlign = 'center';
  c.font = 'bold 24px system-ui, sans-serif'; c.fillText(titolo, lato / 2, lato + 30, lato - 20);
  c.font = '18px system-ui, sans-serif'; c.fillText(sotto, lato / 2, lato + 62, lato - 20);
  return new Promise(ok => cv.toBlob(ok, 'image/png'));
}
async function scaricaQR(tipo, meta) {
  if (!window.FireOpsQR) { alert('Generatore QR non caricato.'); return; }
  if (tipo === 'comando') {
    const sigla = (meta && meta.sigla) || siglaComando();
    if (!sigla) { alert('Scegli prima il Comando.'); return; }
    const b = await pngQR(linkRegistrazione('comando'), 'Registrazione personale SAR', 'Comando ' + ((meta && meta.comando) || nomeComando()) + ' · ricerche aperte');
    scarica('QR_registrazione_' + sigla + '.png', b);
  } else {
    const b = await pngQR(linkRegistrazione(meta.id), 'Registrazione ' + (meta.nome || 'ricerca persona'), 'ID ' + meta.id);
    scarica('QR_registrazione_' + meta.id + '.png', b);
  }
}

/* ============================== IMPIANTO ============================== */

function costruisci() {
  root.innerHTML =
    '<div class="sar-testa">' +
      '<div class="sar-ric" id="sar-ric"></div>' +
      '<div class="sar-giorno" id="sar-giorno-box"><button type="button" class="sar-mini" data-a="g-prima" title="Giorno prima">◀</button>' +
        '<input type="date" id="sar-giorno" aria-label="Giorno"><button type="button" class="sar-mini" data-a="g-dopo" title="Giorno dopo">▶</button>' +
        '<button type="button" class="sar-mini" data-a="g-oggi">Oggi</button></div>' +
      '<div class="sar-sync" id="sar-sync" role="status"></div>' +
    '</div>' +
    '<div class="sar-tabs" role="tablist">' +
      [['ricerche', 'Ricerche aperte'], ['pers', 'Gestione personale'], ['sq', 'Gestione squadre'], ['zone', 'Gestione zone'], ['orari', 'Gestione orari']]
        .map(([k, t]) => '<button type="button" class="sar-tab" role="tab" data-scheda="' + k + '">' + t + '</button>').join('') +
    '</div>' +
    '<div class="sar-corpo" id="sar-corpo-ricerche"></div>' +
    '<div class="sar-corpo" id="sar-corpo-pers"></div>' +
    '<div class="sar-corpo" id="sar-corpo-sq"></div>' +
    '<div class="sar-corpo sar-corpo-zone" id="sar-corpo-zone"><div class="sar-zone-mappa"><div id="sar-mappa"></div><div class="sar-legenda" id="sar-legenda"></div></div><div class="sar-zone-lato" id="sar-zone-lato"></div></div>' +
    '<div class="sar-corpo" id="sar-corpo-orari"></div>' +
    '<div class="sar-msg" id="sar-msg" role="status"></div>';
}

function messaggio(t, ok) {
  const el = root.querySelector('#sar-msg');
  el.textContent = t || ''; el.classList.toggle('ok', !!ok); el.classList.toggle('vis', !!t);
  clearTimeout(messaggio.h); if (t) messaggio.h = setTimeout(() => el.classList.remove('vis'), 5000);
}

// non si ridisegna sotto le mani di chi sta compilando un modulo
function ridisegnaSeLibero() {
  const att = document.activeElement;
  if (modifica || (att && root.contains(att) && /INPUT|SELECT|TEXTAREA/.test(att.tagName) && !att.closest('.sar-testa'))) { disegnaTesta(); return; }
  disegna();
}

function disegnaTesta() {
  const r = root.querySelector('#sar-ric');
  r.innerHTML = ricerca
    ? '<b>' + esc(st.info.nome || ricerca.nome || 'Ricerca persona') + '</b><span>ID ' + esc(ricerca.id) + (ricerca.stato === 'chiusa' ? ' · <em>chiusa</em>' : '') + '</span>'
    : '<b>Nessuna ricerca aperta su questo PC</b><span>Scegline una o creane una nuova</span>';
  root.querySelector('#sar-giorno').value = giorno;
  root.querySelector('#sar-giorno-box').style.visibility = ricerca ? '' : 'hidden';
  root.querySelectorAll('.sar-tab').forEach(b => {
    b.classList.toggle('on', b.dataset.scheda === scheda);
    b.disabled = !ricerca && b.dataset.scheda !== 'ricerche';
  });
  disegnaStatoSync();
}

function disegna() {
  if (!root) return;
  if (!ricerca && scheda !== 'ricerche') scheda = 'ricerche';
  disegnaTesta();
  root.querySelectorAll('.sar-corpo').forEach(c => { c.hidden = c.id !== 'sar-corpo-' + scheda; });
  if (scheda === 'ricerche') root.querySelector('#sar-corpo-ricerche').innerHTML = vistaRicerche();
  else if (scheda === 'pers') root.querySelector('#sar-corpo-pers').innerHTML = vistaPersonale();
  else if (scheda === 'sq') root.querySelector('#sar-corpo-sq').innerHTML = vistaSquadre();
  else if (scheda === 'zone') { root.querySelector('#sar-zone-lato').innerHTML = vistaZone(); preparaMappa(); disegnaZone(); }
  else if (scheda === 'orari') root.querySelector('#sar-corpo-orari').innerHTML = vistaOrari();
}

/* ============================== RICERCHE APERTE ============================== */

async function caricaElenco() {
  const sigla = siglaComando();
  if (!sigla) { elenco = {caricato: true, ricerche: [], errore: 'Scegli il Comando dal menu in alto.'}; disegna(); return; }
  elenco.errore = ''; elenco.inCorso = true; if (scheda === 'ricerche' && !modifica) disegna();
  try {
    const j = await getJson({ricercheAperte: sigla, tutte: '1'});
    if (!j || !Array.isArray(j.ricerche)) throw new Error('risposta');
    elenco = {caricato: true, ricerche: j.ricerche, errore: '', sigla};
  } catch (e) {
    elenco = {caricato: true, ricerche: elenco.ricerche || [], errore: 'Elenco non disponibile: serve la connessione e lo script Apps Script aggiornato (apps-script/registrazioni.gs).'};
  }
  if (scheda === 'ricerche' && !modifica) disegna();
}

function vistaRicerche() {
  const sigla = siglaComando(), k = chiavi();
  let h = '<div class="sar-box"><div class="sar-box-t"><h4>Ricerche del Comando ' + esc(nomeComando() || '—') + (sigla ? ' <small>(' + sigla + ')</small>' : '') + '</h4>' +
    '<button type="button" class="sar-mini" data-a="elenco">⟳ Aggiorna</button></div>';
  if (elenco.inCorso && !elenco.ricerche.length) h += '<p class="sar-nota">Carico l’elenco…</p>';
  if (elenco.errore) h += '<p class="sar-nota err">' + esc(elenco.errore) + '</p>';
  const aperte = elenco.ricerche.filter(r => r.stato !== 'chiusa'), chiuse = elenco.ricerche.filter(r => r.stato === 'chiusa');
  if (elenco.caricato && !elenco.errore && !elenco.ricerche.length) h += '<p class="sar-nota">Nessuna ricerca aperta per questo Comando.</p>';
  const riga = r => {
    const mia = !!k[r.id], attiva = ricerca && ricerca.id === r.id;
    return '<tr class="' + (attiva ? 'sel' : '') + (r.stato === 'chiusa' ? ' chiusa' : '') + '"><td><b>' + esc(r.nome || 'Ricerca persona') + '</b><br><code>' + esc(r.id) + '</code></td>' +
      '<td>' + (r.aperta ? esc(new Date(r.aperta).toLocaleString('it-IT', {day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'})) : '') +
      (r.stato === 'chiusa' ? '<br><small>chiusa ' + esc(r.chiusa ? new Date(r.chiusa).toLocaleDateString('it-IT') : '') + '</small>' : '') + '</td>' +
      '<td class="sar-az">' + (attiva ? '<span class="sar-chip on">Aperta qui</span>' : '<button type="button" class="sar-btn sm pri" data-a="ric-usa" data-id="' + esc(r.id) + '">Gestisci</button>') +
      (r.stato !== 'chiusa' ? ' <button type="button" class="sar-btn sm" data-a="qr-ric" data-id="' + esc(r.id) + '" title="Scarica il QR di registrazione (PNG)">⬇ QR</button>' : '') +
      (mia ? (r.stato === 'chiusa' ? ' <button type="button" class="sar-btn sm" data-a="ric-riapri" data-id="' + esc(r.id) + '">Riapri</button>'
        : ' <button type="button" class="sar-btn sm danger" data-a="ric-chiudi" data-id="' + esc(r.id) + '">Chiudi</button>') : '') + '</td></tr>';
  };
  if (aperte.length) h += '<table class="sar-tab-dati"><thead><tr><th>Ricerca</th><th>Aperta</th><th></th></tr></thead><tbody>' + aperte.map(riga).join('') + '</tbody></table>';
  if (chiuse.length) h += '<details class="sar-chiuse"><summary>Chiuse negli ultimi 30 giorni (' + chiuse.length + ')</summary><table class="sar-tab-dati"><tbody>' + chiuse.map(riga).join('') + '</tbody></table></details>';
  h += '<div class="sar-azioni"><button type="button" class="sar-btn" data-a="qr-comando"' + (sigla ? '' : ' disabled') + '>⬇ QR fisso del Comando (PNG)</button></div>' +
    '<p class="sar-nota">Il QR fisso del Comando vale sempre: chi lo inquadra sceglie fra le ricerche aperte. Il QR della ricerca porta diretto a quella.</p></div>';

  // nuova ricerca
  const anno = String(new Date().getFullYear());
  h += '<div class="sar-box"><h4>Nuova ricerca</h4>' +
    '<div class="sar-griglia">' +
    '<label>Numero intervento<input type="text" id="sar-n-num" inputmode="numeric" placeholder="es. 456" autocomplete="off"></label>' +
    '<label>Anno<input type="text" id="sar-n-anno" inputmode="numeric" value="' + anno + '"></label>' +
    '<label class="largo">Nome della ricerca<input type="text" id="sar-n-nome" placeholder="es. Ricerca Campigna – Mario Rossi" autocomplete="off"></label>' +
    '</div><p class="sar-nota" id="sar-n-id">ID: formato di Messaggistica (numero a 8 cifre _ anno _ ' + esc(sigla || 'ComXX') + '). Il numero può essere diverso da quello del messaggio.</p>' +
    '<div class="sar-azioni"><button type="button" class="sar-btn pri" data-a="ric-nuova"' + (sigla ? '' : ' disabled') + '>Crea e apri la ricerca</button></div></div>';

  // accesso da altri PC
  if (ricerca) {
    h += '<div class="sar-box"><h4>Lavorare su questa ricerca da un altro PC</h4>' +
      '<p class="sar-nota">Sull’altro PC: scheda Ricerche aperte → “Gestisci” → inserisci questo codice di accesso. Dallo stesso codice dipende la lettura di nomi e cellulari: dallo solo a chi lavora alla ricerca.</p>' +
      '<div class="sar-codice"><code id="sar-codice">' + esc(chiave) + '</code><button type="button" class="sar-btn sm" data-a="copia-codice">Copia</button></div></div>';
  }
  h += '<div class="sar-box"><h4>Dati su questo PC</h4><p class="sar-nota">“Reset dati” toglie da questo PC le ricerche, le copie locali e i codici di accesso. Sul foglio non cambia nulla: con il codice si riprendono.</p>' +
    '<div class="sar-azioni"><button type="button" class="sar-btn danger" data-a="reset">Reset dati</button></div></div>';
  return h;
}

async function nuovaRicerca() {
  const sigla = siglaComando();
  const num = root.querySelector('#sar-n-num').value.replace(/\D/g, ''), anno = root.querySelector('#sar-n-anno').value.replace(/\D/g, '');
  const nome = root.querySelector('#sar-n-nome').value.trim();
  if (!num) return messaggio('Scrivi il numero intervento.');
  if (!/^\d{4}$/.test(anno)) return messaggio('Anno non valido.');
  const meta = {id: idRicerca(num, anno, sigla), nome, sigla, comando: nomeComando(), stato: 'aperta'};
  const k = chiavi()[meta.id] || nuovaChiave();
  messaggio('Creo la ricerca ' + meta.id + '…', true);
  try {
    const j = await postJson({foglio: 'DB_Ricerche_Gestione', azione: 'apri', id: meta.id, chiave: k, nome, sigla, comando: meta.comando});
    if (!j || !j.ok) throw new Error((j && j.errore) || 'risposta');
  } catch (e) {
    return messaggio(/usato/.test(e.message) ? 'L’ID ' + meta.id + ' è già usato da un’altra ricerca: se è la tua, usa “Gestisci” con il codice di accesso; altrimenti cambia il numero.'
      : 'Impossibile creare la ricerca: serve la connessione e lo script Apps Script aggiornato.');
  }
  await attiva(meta, k);
  cambia('info', Object.assign({}, st.info, {nome, inizio: st.info.inizio || oggi()}));
  messaggio('Ricerca ' + meta.id + ' creata e aperta.', true);
  caricaElenco();
}

async function usaRicerca(id) {
  const meta = elenco.ricerche.find(r => r.id === id) || {id};
  let k = chiavi()[id];
  if (!k) {
    k = (prompt('Codice di accesso della ricerca ' + id + '\n(lo trovi sul PC che l’ha creata, scheda Ricerche aperte):') || '').trim();
    if (!k) return;
  }
  messaggio('Apro la ricerca…', true);
  try {
    const j = await getJson({sarStato: id, chiave: k});
    if (!j || !j.ok) { if (j && /chiave/.test(j.errore || '')) return messaggio('Codice di accesso non valido per ' + id + '.'); throw new Error('risposta'); }
  } catch (e) {
    if (!chiavi()[id]) return messaggio('Impossibile verificare il codice: serve la connessione.');
  }
  await attiva(Object.assign({sigla: id.split('_').pop(), stato: 'aperta'}, meta), k);
  scheda = 'pers'; disegna();
}

async function chiudiRiapri(id, azione) {
  const k = chiavi()[id]; if (!k) return;
  const meta = elenco.ricerche.find(r => r.id === id) || {id};
  if (azione === 'chiudi' && !confirm('Chiudere la ricerca ' + id + '?\nNessuno potrà più registrarsi con il QR. I dati restano e si possono ancora consultare.')) return;
  try {
    const j = await postJson({foglio: 'DB_Ricerche_Gestione', azione: azione === 'chiudi' ? 'chiudi' : 'apri', id, chiave: k, nome: meta.nome || '', sigla: meta.sigla || '', comando: meta.comando || ''});
    if (!j || !j.ok) throw new Error('risposta');
    if (ricerca && ricerca.id === id) { ricerca.stato = azione === 'chiudi' ? 'chiusa' : 'aperta'; salvaLocale(); }
    messaggio(azione === 'chiudi' ? 'Ricerca chiusa.' : 'Ricerca riaperta.', true);
  } catch (e) { messaggio('Operazione non riuscita: serve la connessione.'); }
  caricaElenco();
}

/* ============================== PERSONALE ============================== */

const presente = (p, g) => !!(p.giorni && p.giorni[g]);
const squadreDelGiorno = g => vivi(st.sq).filter(s => s.giorno === g);
const squadraDi = (pid, g) => squadreDelGiorno(g).find(s => s.leader === pid || (s.membri || []).includes(pid));
const chipSpec = p => (p.spec || []).map(k => '<span class="sar-chip">' + esc((SPEC.find(x => x[0] === k) || [, k])[1]) + '</span>').join('');

function vistaPersonale() {
  if (modifica && modifica.tipo === 'pers') return formPersona();
  const tutte = vivi(st.pers);
  const delGiorno = tutte.filter(p => presente(p, giorno));
  const inSq = delGiorno.filter(p => squadraDi(p.id, giorno)).length;
  const f = filtroPers.toLowerCase();
  const lista = (tuttiPers ? tutte : delGiorno).filter(p => !f || (nomeP(p) + ' ' + p.ente + ' ' + (p.ruolo || '') + ' ' + (p.tel || '')).toLowerCase().includes(f))
    .sort((a, b) => (presente(b, giorno) - presente(a, giorno)) || a.cognome.localeCompare(b.cognome, 'it'));
  let h = '<div class="sar-num"><div><b>' + delGiorno.length + '</b><span>presenti il ' + fmtGiorno(giorno) + '</span></div><div><b>' + inSq + '</b><span>in squadra</span></div>' +
    '<div><b>' + (delGiorno.length - inSq) + '</b><span>liberi</span></div><div><b>' + tutte.length + '</b><span>in tutta la ricerca</span></div></div>';
  h += '<div class="sar-barra"><button type="button" class="sar-btn pri" data-a="p-nuova">+ Aggiungi persona</button>' +
    '<button type="button" class="sar-btn" data-a="reg-scarica">⟳ Registrati con il QR</button>' +
    '<input type="search" id="sar-p-filtro" placeholder="Cerca nome, ente, cellulare" value="' + esc(filtroPers) + '">' +
    '<label class="sar-chk"><input type="checkbox" id="sar-p-tutti"' + (tuttiPers ? ' checked' : '') + '>Mostra tutta la ricerca</label></div>' +
    '<p class="sar-nota" id="sar-reg-stato">' + esc(msgReg) + '</p>';
  if (!lista.length) h += '<div class="sar-vuoto">' + (tutte.length ? 'Nessuno presente in questo giorno: spunta “Mostra tutta la ricerca” per segnare i presenti.' : 'Nessuna persona: aggiungila a mano o falle registrare con il QR (scheda Ricerche aperte).') + '</div>';
  else {
    h += '<table class="sar-tab-dati"><thead><tr><th title="Presente nel giorno scelto">Pres.</th><th>Nome</th><th>Ente</th><th>Cellulare</th><th>Specialità</th><th>Squadra</th><th></th></tr></thead><tbody>' +
      lista.map(p => {
        const s = squadraDi(p.id, giorno);
        return '<tr' + (presente(p, giorno) ? '' : ' class="assente"') + '><td><input type="checkbox" data-a="p-pres" data-id="' + p.id + '"' + (presente(p, giorno) ? ' checked' : '') + ' aria-label="Presente"></td>' +
          '<td><b>' + esc(nomeP(p)) + '</b>' + (p.reg ? ' <span class="sar-chip" title="Registrato dal proprio telefono con il QR">📱 QR</span>' : '') + (p.note ? '<br><small>' + esc(p.note) + '</small>' : '') + '</td>' +
          '<td>' + esc(p.ente) + (p.ruolo ? '<br><small>' + esc(p.ruolo) + '</small>' : '') + '</td>' +
          '<td>' + (p.tel ? '<a href="tel:' + esc(p.tel.replace(/[^\d+]/g, '')) + '">' + esc(p.tel) + '</a>' : '') + '</td>' +
          '<td>' + chipSpec(p) + '</td><td>' + (s ? esc(s.sigla) + (s.leader === p.id ? ' <small>(TL)</small>' : '') : '') + '</td>' +
          '<td class="sar-az"><button type="button" class="sar-btn sm" data-a="p-mod" data-id="' + p.id + '">Modifica</button></td></tr>';
      }).join('') + '</tbody></table>';
  }
  return h;
}

function formPersona() {
  const p = modifica.id ? st.pers.find(x => x.id === modifica.id) : {cognome: '', nome: '', ente: 'VVF', qual: '', ruolo: '', tel: '', spec: [], note: ''};
  const ente = p.ente || 'VVF';
  const q = '<option value="">–</option>' + QUALIFICHE.map(g => '<optgroup label="' + esc(g[0]) + '">' + g[1].map(x => '<option value="' + esc(x[0]) + '"' + (p.qual === x[0] ? ' selected' : '') + '>' +
    esc(x[1] === x[0] ? x[1] : x[1] + ' (' + x[0] + ')') + '</option>').join('') + '</optgroup>').join('');
  return '<div class="sar-box"><h4>' + (modifica.id ? 'Modifica persona' : 'Nuova persona (presente il ' + fmtGiorno(giorno) + ')') + '</h4><div class="sar-griglia">' +
    '<label>Ente<select id="sar-p-ente">' + ENTI.map(x => '<option' + (ente === x ? ' selected' : '') + '>' + x + '</option>').join('') + '</select></label>' +
    '<label>Cognome<input type="text" id="sar-p-cog" value="' + esc(p.cognome) + '" autocomplete="off"></label>' +
    '<label>Nome<input type="text" id="sar-p-nom" value="' + esc(p.nome) + '" autocomplete="off"></label>' +
    '<label id="sar-p-bq"' + (ente === 'VVF' ? '' : ' hidden') + '>Qualifica<select id="sar-p-qual">' + q + '</select></label>' +
    '<label id="sar-p-br"' + (ente === 'VVF' ? ' hidden' : '') + '>Ruolo<input type="text" id="sar-p-ruolo" list="sar-ruoli" value="' + esc(p.ruolo || '') + '" placeholder="es. Volontario SAS">' +
    '<datalist id="sar-ruoli"><option value="Volontario"><option value="Volontario SAS"></datalist></label>' +
    '<label>Cellulare<input type="tel" id="sar-p-tel" value="' + esc(p.tel) + '" autocomplete="off"></label>' +
    '<div class="largo sar-spec">Specialità ' + SPEC.map(s => '<label class="sar-chk"><input type="checkbox" data-spec="' + s[0] + '"' + ((p.spec || []).includes(s[0]) ? ' checked' : '') + '>' + s[1] + '</label>').join('') + '</div>' +
    '<label class="largo">Note<input type="text" id="sar-p-note" value="' + esc(p.note) + '" autocomplete="off"></label></div>' +
    '<div class="sar-azioni"><button type="button" class="sar-btn pri" data-a="p-salva">Salva</button><button type="button" class="sar-btn" data-a="annulla">Annulla</button>' +
    (modifica.id ? '<button type="button" class="sar-btn danger" data-a="p-del">Elimina dalla ricerca</button>' : '') + '</div></div>';
}

function salvaPersona() {
  const cog = root.querySelector('#sar-p-cog').value.trim();
  if (!cog) return messaggio('Scrivi almeno il cognome.');
  const ente = root.querySelector('#sar-p-ente').value;
  const d = {cognome: cog, nome: root.querySelector('#sar-p-nom').value.trim(), ente,
    qual: ente === 'VVF' ? root.querySelector('#sar-p-qual').value : '', ruolo: ente === 'VVF' ? '' : root.querySelector('#sar-p-ruolo').value.trim(),
    tel: root.querySelector('#sar-p-tel').value.trim(), note: root.querySelector('#sar-p-note').value.trim(),
    spec: [...root.querySelectorAll('[data-spec]:checked')].map(c => c.dataset.spec)};
  if (modifica.id) cambia('pers', Object.assign({}, st.pers.find(x => x.id === modifica.id), d));
  else cambia('pers', Object.assign({id: nuovoId(), giorni: {[giorno]: true}}, d));
  modifica = null; disegna(); messaggio('Salvato.', true);
}

/* ============================== SQUADRE ============================== */

function inZona(sqId) { return vivi(st.ass).find(a => a.squadra === sqId && !a.fine); }
function prossimaSigla() {
  const usate = new Set(squadreDelGiorno(giorno).map(s => s.sigla));
  for (let i = 1; ; i++) { const s = 'S' + due(i); if (!usate.has(s)) return s; }
}

function vistaSquadre() {
  if (modifica && modifica.tipo === 'sq') return formSquadra();
  const sqs = squadreDelGiorno(giorno).sort((a, b) => a.sigla.localeCompare(b.sigla, 'it', {numeric: true}));
  const pres = vivi(st.pers).filter(p => presente(p, giorno));
  const liberi = pres.filter(p => !squadraDi(p.id, giorno));
  let h = '<div class="sar-barra"><button type="button" class="sar-btn pri" data-a="s-nuova">+ Nuova squadra</button>' +
    '<button type="button" class="sar-btn" data-a="s-copia" title="Ricrea le squadre del giorno precedente con le persone presenti oggi">Copia squadre dal giorno prima</button>' +
    '<span class="sar-nota">' + sqs.length + ' squadre il ' + fmtGiorno(giorno) + ' · ' + liberi.length + ' persone libere</span></div>';
  if (!sqs.length) h += '<div class="sar-vuoto">Nessuna squadra in questo giorno.' + (pres.length ? '' : ' Segna prima i presenti in Gestione personale.') + '</div>';
  h += '<div class="sar-carte">' + sqs.map(s => {
    const tl = st.pers.find(p => p.id === s.leader), mem = (s.membri || []).map(id => st.pers.find(p => p.id === id)).filter(p => p && !p.del);
    const a = inZona(s.id), z = a && st.zone.find(x => x.id === a.zona);
    return '<div class="sar-carta"><div class="sar-carta-t"><b>' + esc(s.sigla) + '</b><span class="sar-chip liv-' + s.tipo + '">' + esc(nomeLivello(s.tipo)) + '</span>' + (s.ente ? '<span class="sar-chip">' + esc(s.ente) + '</span>' : '') +
      '<button type="button" class="sar-btn sm" data-a="s-mod" data-id="' + s.id + '">Modifica</button></div>' +
      '<div class="sar-carta-r">📻 ' + esc(s.radio || '—') + ' · 🛰 GPS ' + esc(s.gps || '—') + '</div>' +
      '<div class="sar-carta-r">TL: <b>' + (tl ? esc(nomeP(tl)) : '—') + '</b>' + (tl && tl.tel ? ' · <a href="tel:' + esc(tl.tel.replace(/[^\d+]/g, '')) + '">' + esc(tl.tel) + '</a>' : '') + '</div>' +
      '<div class="sar-carta-r"><small>' + (mem.length ? mem.map(m => esc(nomeP(m))).join(', ') : 'Nessun componente') + '</small></div>' +
      '<div class="sar-carta-r">' + (a ? '<span class="sar-chip on">In zona ' + esc(z ? z.nome : '?') + ' dalle ' + fmtOra(a.inizio) + '</span>' : '<span class="sar-chip">Disponibile</span>') + '</div></div>';
  }).join('') + '</div>';
  return h;
}

function formSquadra() {
  const s = modifica.id ? st.sq.find(x => x.id === modifica.id) : {sigla: prossimaSigla(), tipo: 'ordinaria', ente: 'VVF', radio: '', gps: '', leader: '', membri: [], note: ''};
  const disp = vivi(st.pers).filter(p => presente(p, giorno) && (!squadraDi(p.id, giorno) || squadraDi(p.id, giorno).id === s.id))
    .sort((a, b) => a.cognome.localeCompare(b.cognome, 'it'));
  return '<div class="sar-box"><h4>' + (modifica.id ? 'Modifica squadra' : 'Nuova squadra del ' + fmtGiorno(giorno)) + '</h4><div class="sar-griglia">' +
    '<label>ID squadra<input type="text" id="sar-s-sigla" value="' + esc(s.sigla) + '" autocomplete="off"></label>' +
    '<label>Livello / tipo<select id="sar-s-tipo">' + LIVELLI.map(t => '<option value="' + t[0] + '"' + (s.tipo === t[0] ? ' selected' : '') + '>' + t[1] + '</option>').join('') + '</select></label>' +
    '<label>Ente<select id="sar-s-ente">' + ENTI.map(x => '<option' + ((s.ente || 'VVF') === x ? ' selected' : '') + '>' + x + '</option>').join('') + '</select></label>' +
    '<label>Canale radio<input type="text" id="sar-s-radio" value="' + esc(s.radio) + '" placeholder="es. 038 / DMR TG 2222" autocomplete="off"></label>' +
    '<label>GPS<input type="text" id="sar-s-gps" value="' + esc(s.gps) + '" placeholder="es. Garmin 3 / ID tracker" autocomplete="off"></label>' +
    '<label>Team leader<select id="sar-s-tl"><option value="">–</option>' + disp.map(p => '<option value="' + p.id + '"' + (s.leader === p.id ? ' selected' : '') + '>' + esc(nomeP(p)) + '</option>').join('') + '</select></label>' +
    '<div class="largo"><span class="sar-lab">Componenti (presenti e liberi)</span><div class="sar-membri">' +
    (disp.length ? disp.map(p => '<label class="sar-chk"><input type="checkbox" data-mem="' + p.id + '"' + ((s.membri || []).includes(p.id) || s.leader === p.id ? ' checked' : '') + '>' + esc(nomeP(p)) + ' <small>' + esc(p.ente) + '</small> ' + chipSpec(p) + '</label>').join('')
      : '<span class="sar-nota">Nessuna persona libera in questo giorno.</span>') + '</div></div>' +
    '<label class="largo">Note<input type="text" id="sar-s-note" value="' + esc(s.note) + '" autocomplete="off"></label></div>' +
    '<div class="sar-azioni"><button type="button" class="sar-btn pri" data-a="s-salva">Salva</button><button type="button" class="sar-btn" data-a="annulla">Annulla</button>' +
    (modifica.id ? '<button type="button" class="sar-btn danger" data-a="s-del">Elimina squadra</button>' : '') + '</div></div>';
}

function salvaSquadra() {
  const sigla = root.querySelector('#sar-s-sigla').value.trim();
  if (!sigla) return messaggio('Scrivi l’ID della squadra.');
  if (squadreDelGiorno(giorno).some(s => s.sigla.toLowerCase() === sigla.toLowerCase() && s.id !== modifica.id)) return messaggio('ID squadra già usato in questo giorno.');
  const leader = root.querySelector('#sar-s-tl').value;
  const d = {sigla, tipo: root.querySelector('#sar-s-tipo').value, ente: root.querySelector('#sar-s-ente').value, radio: root.querySelector('#sar-s-radio').value.trim(),
    gps: root.querySelector('#sar-s-gps').value.trim(), leader, note: root.querySelector('#sar-s-note').value.trim(),
    membri: [...root.querySelectorAll('[data-mem]:checked')].map(c => c.dataset.mem).filter(id => id !== leader)};
  if (modifica.id) cambia('sq', Object.assign({}, st.sq.find(x => x.id === modifica.id), d));
  else cambia('sq', Object.assign({id: nuovoId(), giorno}, d));
  modifica = null; disegna(); messaggio('Squadra salvata.', true);
}

function copiaSquadre() {
  const giorni = [...new Set(vivi(st.sq).map(s => s.giorno))].filter(g => g < giorno).sort();
  const prima = giorni.pop();
  if (!prima) return messaggio('Non ci sono squadre nei giorni precedenti.');
  const gia = new Set(squadreDelGiorno(giorno).map(s => s.sigla));
  let n = 0;
  squadreDelGiorno(prima).forEach(s => {
    if (gia.has(s.sigla)) return;
    const ok = id => { const p = st.pers.find(x => x.id === id); return p && !p.del && presente(p, giorno) && !squadraDi(id, giorno); };
    cambia('sq', {id: nuovoId(), giorno, sigla: s.sigla, tipo: s.tipo, ente: s.ente, radio: s.radio, gps: s.gps, note: s.note,
      leader: ok(s.leader) ? s.leader : '', membri: (s.membri || []).filter(ok)});
    n++;
  });
  disegna(); messaggio(n ? n + ' squadre copiate dal ' + fmtGiorno(prima) + ' (solo le persone presenti oggi).' : 'Le squadre del ' + fmtGiorno(prima) + ' ci sono già.', !!n);
}

/* ============================== ZONE ============================== */

// stato della zona fino al giorno scelto, per un livello o per tutti
function statoZona(z, liv) {
  if (z.conclusa && (!z.conclusaIl || z.conclusaIl <= giorno)) return 'conclusa';
  const as = vivi(st.ass).filter(a => a.zona === z.id && a.giorno <= giorno && (!liv || a.livello === liv))
    .sort((a, b) => String(a.inizio).localeCompare(String(b.inizio)));
  if (!as.length) return 'aperta';
  if (as.some(a => !a.fine && a.giorno === giorno)) return 'assegnata';
  if (liv) { const u = as.filter(a => a.fine).pop(); return u ? (u.esito || 'non_bonificata') : 'aperta'; }
  // tutti i livelli: bonificata se almeno un livello ha bonificato e nessuno ha l'ultimo esito negativo
  const ultimi = {};
  as.filter(a => a.fine).forEach(a => { ultimi[a.livello] = a.esito || 'non_bonificata'; });
  const v = Object.values(ultimi);
  if (!v.length) return 'aperta';
  if (v.includes('bonificata') && v.every(x => x === 'bonificata')) return 'bonificata';
  if (v.includes('bonificata') || v.includes('parziale')) return 'parziale';
  return 'non_bonificata';
}
function areaHa(pts) {
  if (!pts || pts.length < 3) return 0;
  const lat0 = pts.reduce((s, p) => s + p[0], 0) / pts.length, kx = 111320 * Math.cos(lat0 * Math.PI / 180), ky = 110540;
  let a = 0;
  for (let i = 0; i < pts.length; i++) { const p = pts[i], q = pts[(i + 1) % pts.length]; a += p[1] * kx * q[0] * ky - q[1] * kx * p[0] * ky; }
  return Math.abs(a / 2) / 10000;
}
function centro(pts) { return [pts.reduce((s, p) => s + p[0], 0) / pts.length, pts.reduce((s, p) => s + p[1], 0) / pts.length]; }

function vistaZone() {
  if (modifica && modifica.tipo === 'ass') return formAssegna();
  if (modifica && modifica.tipo === 'zona') return formZona();
  const zone = vivi(st.zone).sort((a, b) => a.nome.localeCompare(b.nome, 'it', {numeric: true}));
  const pua = st.info.pua;
  const conta = {}; zone.forEach(z => { const s = statoZona(z, livelloMappa); conta[s] = (conta[s] || 0) + 1; });
  let h = '<div class="sar-box"><h4>PUA e zonizzazione</h4>' +
    '<p class="sar-nota">PUA: ' + (pua ? '<b>' + pua.lat.toFixed(5) + ', ' + pua.lon.toFixed(5) + '</b>' : 'non impostato') + '</p>' +
    '<div class="sar-azioni"><button type="button" class="sar-btn' + (posaPua ? ' pri' : '') + '" data-a="pua-posa">' + (posaPua ? 'Clicca sulla carta…' : '📍 Imposta PUA sulla carta') + '</button>' +
    '<input type="text" id="sar-pua-coord" placeholder="oppure lat, lon" style="flex:1;min-width:120px"><button type="button" class="sar-btn sm" data-a="pua-coord">Usa</button></div>' +
    '<div class="sar-griglia" style="margin-top:8px"><label>Lato area (km)<input type="number" id="sar-z-lato" min="0.2" max="20" step="0.1" value="1"></label>' +
    '<label>Zone per lato<input type="number" id="sar-z-n" min="1" max="12" step="1" value="4"></label></div>' +
    '<div class="sar-azioni"><button type="button" class="sar-btn pri" data-a="z-griglia"' + (pua ? '' : ' disabled') + '>Zonizza attorno al PUA</button>' +
    '<button type="button" class="sar-btn" data-a="z-disegna" title="Disegna a mano una zona (es. area impervia per SAF)">✏️ Disegna zona</button></div>' +
    '<p class="sar-nota">Griglia quadrata centrata sul PUA (es. 1 km diviso in 4×4 zone da 250 m). Le zone a mano servono per aree particolari (impervie, corsi d’acqua).</p></div>';
  h += '<div class="sar-box"><div class="sar-box-t"><h4>Zone (' + zone.length + ')</h4><label class="sar-sel">Livello <select id="sar-z-liv"><option value="">Tutti</option>' +
    LIVELLI.map(l => '<option value="' + l[0] + '"' + (livelloMappa === l[0] ? ' selected' : '') + '>' + l[1] + '</option>').join('') + '</select></label></div>' +
    '<p class="sar-nota">Stato al ' + fmtGiorno(giorno) + ': ' + Object.keys(NOMI_STATO).filter(k => conta[k]).map(k => '<span class="sar-pallino" style="background:' + COLORI[k] + '"></span>' + NOMI_STATO[k] + ' ' + conta[k]).join(' · ') + '</p>';
  if (!zone.length) h += '<div class="sar-vuoto">Nessuna zona: imposta il PUA e zonizza, oppure disegnane una.</div>';
  else h += '<div class="sar-zone-elenco">' + zone.map(z => {
    const s = statoZona(z, livelloMappa);
    const as = vivi(st.ass).filter(a => a.zona === z.id && a.giorno === giorno);
    return '<div class="sar-zona" data-zona="' + z.id + '"><div class="sar-zona-t"><span class="sar-pallino" style="background:' + COLORI[s] + '"></span><b>' + esc(z.nome) + '</b>' +
      '<small>' + areaHa(z.punti).toFixed(1) + ' ha · ' + NOMI_STATO[s] + '</small></div>' +
      (as.length ? '<div class="sar-zona-r">' + as.map(a => { const q = st.sq.find(x => x.id === a.squadra); return '<span class="sar-chip' + (a.fine ? '' : ' on') + '">' + esc(q ? q.sigla : '?') + ' ' + fmtOra(a.inizio) + (a.fine ? '–' + fmtOra(a.fine) + ' ' + esc(nomeEsito(a.esito)) : ' in zona') + '</span>'; }).join('') + '</div>' : '') +
      '<div class="sar-zona-r"><button type="button" class="sar-btn sm pri" data-a="z-assegna" data-id="' + z.id + '"' + (z.conclusa ? ' disabled' : '') + '>Assegna squadra</button>' +
      '<button type="button" class="sar-btn sm" data-a="z-gpx" data-id="' + z.id + '">GPX</button><button type="button" class="sar-btn sm" data-a="z-kml" data-id="' + z.id + '">KML</button>' +
      '<button type="button" class="sar-btn sm" data-a="z-mod" data-id="' + z.id + '">Modifica</button></div></div>';
  }).join('') + '</div>';
  h += '<div class="sar-azioni"><button type="button" class="sar-btn" data-a="z-kml-tutte"' + (zone.length ? '' : ' disabled') + '>⬇ Tutte le zone (KML con stato)</button></div></div>';
  return h;
}

function formZona() {
  const z = st.zone.find(x => x.id === modifica.id);
  return '<div class="sar-box"><h4>Zona ' + esc(z.nome) + '</h4><div class="sar-griglia">' +
    '<label>Nome<input type="text" id="sar-zf-nome" value="' + esc(z.nome) + '"></label>' +
    '<label class="largo">Note<input type="text" id="sar-zf-note" value="' + esc(z.note || '') + '" placeholder="es. bosco fitto, torrente"></label>' +
    '<label class="sar-chk largo"><input type="checkbox" id="sar-zf-concl"' + (z.conclusa ? ' checked' : '') + '>Zona conclusa (non si assegna più)</label></div>' +
    '<p class="sar-nota">Per spostare i vertici: “Modifica sulla carta”, trascina, poi “Fine modifica” sulla carta.</p>' +
    '<div class="sar-azioni"><button type="button" class="sar-btn pri" data-a="zf-salva">Salva</button><button type="button" class="sar-btn" data-a="zf-vertici">Modifica sulla carta</button>' +
    '<button type="button" class="sar-btn" data-a="annulla">Annulla</button><button type="button" class="sar-btn danger" data-a="zf-del">Elimina zona</button></div></div>';
}

function formAssegna() {
  const z = st.zone.find(x => x.id === modifica.id);
  const sqs = squadreDelGiorno(giorno).sort((a, b) => a.sigla.localeCompare(b.sigla, 'it', {numeric: true}));
  const d = new Date();
  return '<div class="sar-box"><h4>Assegna la zona ' + esc(z.nome) + '</h4>' +
    (sqs.length ? '<div class="sar-griglia"><label>Squadra<select id="sar-a-sq">' + sqs.map(s => { const a = inZona(s.id); return '<option value="' + s.id + '"' + (a ? ' disabled' : '') + '>' + esc(s.sigla) + ' · ' + esc(nomeLivello(s.tipo)) + (a ? ' (già in zona)' : '') + '</option>'; }).join('') + '</select></label>' +
      '<label>Orario di assegnazione<input type="time" id="sar-a-ora" value="' + due(d.getHours()) + ':' + due(d.getMinutes()) + '"></label>' +
      '<label class="largo">Note<input type="text" id="sar-a-note" placeholder="es. priorità al versante nord"></label>' +
      '<label class="sar-chk largo"><input type="checkbox" id="sar-a-gpx" checked>Scarica subito il GPX della zona per il GPS della squadra</label></div>'
      : '<div class="sar-vuoto">Nessuna squadra nel ' + fmtGiorno(giorno) + ': creale in Gestione squadre.</div>') +
    '<div class="sar-azioni">' + (sqs.length ? '<button type="button" class="sar-btn pri" data-a="a-salva">Assegna</button>' : '') + '<button type="button" class="sar-btn" data-a="annulla">Annulla</button></div></div>';
}

function salvaAssegna() {
  const sqId = root.querySelector('#sar-a-sq').value, s = st.sq.find(x => x.id === sqId);
  if (!s || inZona(sqId)) return messaggio('Scegli una squadra disponibile.');
  const [hh, mm] = (root.querySelector('#sar-a-ora').value || '00:00').split(':').map(Number);
  const [a, m, g] = giorno.split('-').map(Number);
  const inizio = new Date(a, m - 1, g, hh, mm).toISOString();
  const ass = {id: nuovoId(), zona: modifica.id, squadra: sqId, livello: s.tipo, giorno, inizio, fine: '', esito: '', note: root.querySelector('#sar-a-note').value.trim()};
  cambia('ass', ass);
  if (root.querySelector('#sar-a-gpx').checked) esportaZona(modifica.id, 'gpx', ass);
  modifica = null; disegna(); messaggio('Zona assegnata a ' + s.sigla + ' dalle ' + fmtOra(inizio) + '.', true);
}

/* --- carta --- */
function preparaMappa() {
  const el = root.querySelector('#sar-mappa');
  if (!el) return;
  if (typeof L === 'undefined') { el.innerHTML = '<div class="sar-vuoto">Carta non disponibile: la libreria delle mappe non si è caricata (rete o filtro di navigazione).</div>'; return; }
  if (!mappa) {
    mappa = L.map(el, {zoomControl: true}).setView([42.5, 12.5], 6);
    const osm = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {maxZoom: 19, attribution: '© OpenStreetMap'}).addTo(mappa);
    if (window.FireOpsSfondi) window.FireOpsSfondi.aggiungi(mappa, {sostituisci: [osm], posizione: 'topright'});
    L.control.scale({imperial: false}).addTo(mappa);
    livZone = L.featureGroup().addTo(mappa);
    mappa.on('click', e => {
      if (!posaPua) return;
      posaPua = false; root.querySelector('#sar-mappa').classList.remove('sar-mirino');
      cambia('info', Object.assign({}, st.info, {pua: {lat: e.latlng.lat, lon: e.latlng.lng}}));
      disegna();
    });
    mappa.on('pm:create', e => {
      const pts = e.layer.getLatLngs()[0].map(p => [p.lat, p.lng]);
      mappa.removeLayer(e.layer);
      if (pts.length < 3) return;
      const nome = (prompt('Nome della nuova zona:', 'M' + due(vivi(st.zone).filter(z => z.mano).length + 1)) || '').trim();
      if (!nome) return;
      cambia('zone', {id: nuovoId(), nome, punti: pts, mano: true, note: ''});
      disegna();
    });
    new ResizeObserver(() => mappa.invalidateSize()).observe(el);
    centraMappa();
  }
  setTimeout(() => mappa.invalidateSize(), 50);
}
function centraMappa() {
  if (!mappa) return;
  const zone = vivi(st.zone);
  if (zone.length) mappa.fitBounds(L.latLngBounds(zone.flatMap(z => z.punti)).pad(0.15));
  else if (st.info.pua) mappa.setView([st.info.pua.lat, st.info.pua.lon], 15);
  else { const c = window.FireOpsComandoAttivo; const lat = c && parseFloat(c.Latitudine), lon = c && parseFloat(c.Longitudine); if (isFinite(lat) && isFinite(lon)) mappa.setView([lat, lon], 11); }
}
let ultimaZonaCentrata = null;
function disegnaZone() {
  if (!mappa || typeof L === 'undefined') return;
  livZone.clearLayers();
  const pua = st.info.pua;
  if (pua) L.marker([pua.lat, pua.lon], {icon: L.divIcon({className: 'sar-pua', html: 'PUA', iconSize: [40, 22], iconAnchor: [20, 11]}), zIndexOffset: 1000}).addTo(livZone).bindTooltip('Punto ultimo avvistamento');
  vivi(st.zone).forEach(z => {
    const s = statoZona(z, livelloMappa), col = COLORI[s];
    const as = vivi(st.ass).filter(a => a.zona === z.id && a.giorno === giorno);
    const pol = L.polygon(z.punti, {color: col, weight: s === 'assegnata' ? 3 : 2, fillColor: col, fillOpacity: s === 'aperta' ? 0.08 : 0.3, sarZona: z.id}).addTo(livZone);
    pol.bindTooltip('<b>' + esc(z.nome) + '</b>', {permanent: true, direction: 'center', className: 'sar-etich'});
    pol.bindPopup('<b>Zona ' + esc(z.nome) + '</b><br>' + NOMI_STATO[s] + (livelloMappa ? ' (' + esc(nomeLivello(livelloMappa)) + ')' : '') + ' · ' + areaHa(z.punti).toFixed(1) + ' ha' +
      (as.length ? '<br>' + as.map(a => { const q = st.sq.find(x => x.id === a.squadra); return esc(q ? q.sigla : '?') + ' ' + fmtOra(a.inizio) + (a.fine ? '–' + fmtOra(a.fine) + ' ' + esc(nomeEsito(a.esito)) : ' in zona'); }).join('<br>') : '') +
      (z.note ? '<br><i>' + esc(z.note) + '</i>' : ''));
    pol.on('click', () => { const el = root.querySelector('.sar-zona[data-zona="' + z.id + '"]'); if (el) { el.scrollIntoView({block: 'nearest'}); el.classList.add('lampo'); setTimeout(() => el.classList.remove('lampo'), 1200); } });
  });
  const leg = root.querySelector('#sar-legenda');
  if (leg) leg.innerHTML = Object.keys(NOMI_STATO).map(k => '<span><i style="background:' + COLORI[k] + '"></i>' + NOMI_STATO[k] + '</span>').join('');
  const firma = ricerca && ricerca.id;
  if (ultimaZonaCentrata !== firma) { ultimaZonaCentrata = firma; centraMappa(); }
}

function zonizza() {
  const pua = st.info.pua; if (!pua) return;
  const lato = Math.max(0.1, parseFloat(root.querySelector('#sar-z-lato').value) || 1), n = Math.max(1, Math.min(12, parseInt(root.querySelector('#sar-z-n').value, 10) || 4));
  const auto = vivi(st.zone).filter(z => z.auto);
  if (auto.length) {
    const usate = auto.filter(z => vivi(st.ass).some(a => a.zona === z.id));
    if (!confirm('Ci sono già ' + auto.length + ' zone della griglia' + (usate.length ? ' (' + usate.length + ' con squadre assegnate: restano)' : '') + '. Sostituire la griglia?')) return;
    auto.filter(z => !usate.includes(z)).forEach(z => elimina('zone', z.id));
  }
  const dLat = lato / 110.574, dLon = lato / (111.320 * Math.cos(pua.lat * Math.PI / 180));
  const lat0 = pua.lat + dLat / 2, lon0 = pua.lon - dLon / 2, sLat = dLat / n, sLon = dLon / n;
  const nomi = new Set(vivi(st.zone).map(z => z.nome));
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
    let nome = String.fromCharCode(65 + r) + (c + 1);
    while (nomi.has(nome)) nome += "'";
    nomi.add(nome);
    const N = lat0 - r * sLat, S = N - sLat, W = lon0 + c * sLon, E = W + sLon;
    cambia('zone', {id: nuovoId(), nome, auto: true, punti: [[N, W], [N, E], [S, E], [S, W]], note: ''});
  }
  ultimaZonaCentrata = null; disegna();
  messaggio(n * n + ' zone create (' + (lato * 1000 / n).toFixed(0) + ' m di lato), nominate per riga (A, B…) e colonna (1, 2…) da nord-ovest.', true);
}

/* --- esportazione GPS --- */
const xml = s => esc(s);
function esportaZona(id, formato, assegnazione) {
  const z = st.zone.find(x => x.id === id); if (!z) return;
  const a = assegnazione || vivi(st.ass).filter(x => x.zona === id && x.giorno === giorno).sort((p, q) => String(q.inizio).localeCompare(String(p.inizio)))[0];
  const s = a && st.sq.find(x => x.id === a.squadra);
  const titolo = 'Zona ' + z.nome + (s ? ' - ' + s.sigla : '') + (a ? ' - assegnata ' + fmtGiorno(a.giorno) + ' ' + fmtOra(a.inizio) : '');
  const desc = (ricerca ? (st.info.nome ? st.info.nome + ' · ' : '') + 'ID ricerca ' + ricerca.id + '. ' : '') + (a ? 'Assegnata alle ' + fmtOra(a.inizio) + ' del ' + fmtGiorno(a.giorno) + (s ? ' a ' + s.sigla + ' (' + nomeLivello(s.tipo) + ', radio ' + (s.radio || '-') + ')' : '') + '. ' : '') + (a && a.note ? a.note + '. ' : '') + (z.note || '');
  const anello = z.punti.concat([z.punti[0]]);
  const file = nomeFile((ricerca ? ricerca.id + '_' : '') + 'zona_' + z.nome + (s ? '_' + s.sigla : '') + (a ? '_' + fmtOra(a.inizio).replace(':', '') : ''));
  if (formato === 'gpx') {
    const c = centro(z.punti);
    const t = a ? a.inizio : new Date().toISOString();
    const gpx = '<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="FireOps VVF" xmlns="http://www.topografix.com/GPX/1/1">\n' +
      '<metadata><name>' + xml(titolo) + '</name><desc>' + xml(desc) + '</desc><time>' + t + '</time></metadata>\n' +
      '<wpt lat="' + c[0].toFixed(6) + '" lon="' + c[1].toFixed(6) + '"><time>' + t + '</time><name>' + xml(z.nome + (s ? ' ' + s.sigla : '')) + '</name><desc>' + xml(desc) + '</desc></wpt>\n' +
      (st.info.pua ? '<wpt lat="' + st.info.pua.lat.toFixed(6) + '" lon="' + st.info.pua.lon.toFixed(6) + '"><name>PUA</name></wpt>\n' : '') +
      '<trk><name>' + xml(titolo) + '</name><desc>' + xml(desc) + '</desc><trkseg>\n' + anello.map(p => '<trkpt lat="' + p[0].toFixed(6) + '" lon="' + p[1].toFixed(6) + '"></trkpt>').join('\n') + '\n</trkseg></trk>\n</gpx>\n';
    scarica(file + '.gpx', gpx, 'application/gpx+xml');
  } else {
    scarica(file + '.kml', kml([z], titolo, desc), 'application/vnd.google-earth.kml+xml');
  }
}
function kml(zone, titolo, desc) {
  const hex = c => 'ff' + c.slice(5, 7) + c.slice(3, 5) + c.slice(1, 3), fill = c => '66' + c.slice(5, 7) + c.slice(3, 5) + c.slice(1, 3);
  return '<?xml version="1.0" encoding="UTF-8"?>\n<kml xmlns="http://www.opengis.net/kml/2.2"><Document><name>' + xml(titolo) + '</name>' + (desc ? '<description>' + xml(desc) + '</description>' : '') +
    Object.keys(COLORI).map(k => '<Style id="' + k + '"><LineStyle><color>' + hex(COLORI[k]) + '</color><width>2</width></LineStyle><PolyStyle><color>' + fill(COLORI[k]) + '</color></PolyStyle></Style>').join('') +
    (st.info.pua ? '<Placemark><name>PUA</name><Point><coordinates>' + st.info.pua.lon.toFixed(6) + ',' + st.info.pua.lat.toFixed(6) + ',0</coordinates></Point></Placemark>' : '') +
    zone.map(z => {
      const s = statoZona(z, livelloMappa);
      const as = vivi(st.ass).filter(a => a.zona === z.id).map(a => { const q = st.sq.find(x => x.id === a.squadra); return fmtGiorno(a.giorno) + ' ' + fmtOra(a.inizio) + (a.fine ? '-' + fmtOra(a.fine) : '') + ' ' + (q ? q.sigla : '') + ' ' + nomeLivello(a.livello) + (a.esito ? ' ' + nomeEsito(a.esito) : ''); });
      return '<Placemark><name>' + xml(z.nome) + '</name><description>' + xml(NOMI_STATO[s] + '. ' + as.join('; ') + (z.note ? '. ' + z.note : '')) + '</description><styleUrl>#' + s + '</styleUrl>' +
        '<ExtendedData><Data name="stato"><value>' + s + '</value></Data><Data name="area_ha"><value>' + areaHa(z.punti).toFixed(2) + '</value></Data></ExtendedData>' +
        '<Polygon><outerBoundaryIs><LinearRing><coordinates>' + z.punti.concat([z.punti[0]]).map(p => p[1].toFixed(6) + ',' + p[0].toFixed(6) + ',0').join(' ') + '</coordinates></LinearRing></outerBoundaryIs></Polygon></Placemark>';
    }).join('') + '</Document></kml>\n';
}

/* ============================== ORARI ============================== */

function vistaOrari() {
  // ordine fisso per ora di uscita: segnando un rientro la riga non si sposta
  const as = vivi(st.ass).filter(a => a.giorno === giorno).sort((a, b) => String(a.inizio).localeCompare(String(b.inizio)) || String(a.id).localeCompare(String(b.id)));
  const sqs = squadreDelGiorno(giorno);
  const disp = sqs.filter(s => !inZona(s.id));
  let h = '<p class="sar-nota">Squadre del ' + fmtGiorno(giorno) + ': ' + sqs.length + ' · in zona ' + (sqs.length - disp.length) + ' · disponibili ' + disp.length +
    (disp.length ? ' (' + disp.map(s => esc(s.sigla)).join(', ') + ')' : '') + '</p>';
  if (!as.length) return h + '<div class="sar-vuoto">Nessuna squadra assegnata a una zona in questo giorno (Gestione zone → Assegna squadra).</div>';
  h += '<table class="sar-tab-dati sar-orari"><thead><tr><th>Squadra</th><th>Zona</th><th>Livello</th><th>Uscita</th><th>Rientro</th><th>Esito</th><th>Note</th><th></th></tr></thead><tbody>' +
    as.map(a => {
      const s = st.sq.find(x => x.id === a.squadra), z = st.zone.find(x => x.id === a.zona);
      return '<tr class="' + (a.fine ? (a.esito ? 'fatta' : 'senza-esito') : 'aperta') + '" data-ass="' + a.id + '"><td><b>' + esc(s ? s.sigla : '?') + '</b>' + (s && s.radio ? '<br><small>📻 ' + esc(s.radio) + '</small>' : '') + '</td>' +
        '<td>' + esc(z ? z.nome : '?') + '</td><td>' + esc(nomeLivello(a.livello)) + '</td>' +
        '<td><input type="time" data-o="inizio" value="' + fmtOra(a.inizio) + '"></td>' +
        '<td><div class="sar-ora"><input type="time" data-o="fine" value="' + fmtOra(a.fine) + '">' + (a.fine ? '' : '<button type="button" class="sar-btn sm" data-a="o-ora" data-id="' + a.id + '" title="Rientro adesso">Ora</button>') + '</div></td>' +
        '<td><select data-o="esito"><option value="">' + (a.fine ? '– scegli –' : 'In zona') + '</option>' + ESITI.map(e => '<option value="' + e[0] + '"' + (a.esito === e[0] ? ' selected' : '') + '>' + e[1] + '</option>').join('') + '</select></td>' +
        '<td><input type="text" data-o="note" value="' + esc(a.note || '') + '"></td>' +
        '<td class="sar-az"><button type="button" class="sar-btn sm" data-a="z-gpx" data-id="' + a.zona + '" title="GPX della zona">GPX</button><button type="button" class="sar-btn sm danger" data-a="o-del" data-id="' + a.id + '" title="Annulla l’assegnazione">✕</button></td></tr>';
    }).join('') + '</tbody></table>' +
    '<p class="sar-nota">Al rientro: scrivi l’ora (o “Ora”) e scegli l’esito. La zona cambia colore in Gestione zone.</p>';
  return h;
}

function aggiornaOrario(tr, campo, valore) {
  const a = st.ass.find(x => x.id === tr.dataset.ass); if (!a) return;
  const d = Object.assign({}, a);
  if (campo === 'inizio' || campo === 'fine') {
    if (!valore) { d[campo] = ''; }
    else { const [hh, mm] = valore.split(':').map(Number), [y, m, g] = a.giorno.split('-').map(Number); d[campo] = new Date(y, m - 1, g, hh, mm).toISOString(); }
    if (campo === 'fine' && d.fine && !d.esito) messaggio('Rientro segnato: scegli l’esito (bonificata o no).');
  } else d[campo] = valore;
  if (campo === 'esito' && valore && !d.fine) d.fine = new Date().toISOString();
  cambia('ass', d);
  disegna();
}

/* ============================== EVENTI ============================== */

function eventi() {
  root.addEventListener('click', e => {
    const t = e.target.closest('[data-scheda],[data-a]');
    if (!t || t.disabled) return;
    if (t.dataset.scheda) { scheda = t.dataset.scheda; modifica = null; posaPua = false; if (scheda === 'ricerche') caricaElenco(); disegna(); return; }
    const a = t.dataset.a, id = t.dataset.id;
    if (t.tagName === 'INPUT') { if (a === 'p-pres') { const p = st.pers.find(x => x.id === id); const g = Object.assign({}, p.giorni); if (t.checked) g[giorno] = true; else delete g[giorno]; cambia('pers', Object.assign({}, p, {giorni: g})); disegna(); } return; }
    switch (a) {
      case 'g-prima': case 'g-dopo': { const d = new Date(giorno + 'T12:00:00'); d.setDate(d.getDate() + (a === 'g-prima' ? -1 : 1)); giorno = giornoDi(d); modifica = null; disegna(); break; }
      case 'g-oggi': giorno = oggi(); modifica = null; disegna(); break;
      case 'elenco': caricaElenco(); break;
      case 'ric-nuova': nuovaRicerca(); break;
      case 'ric-usa': usaRicerca(id); break;
      case 'ric-chiudi': chiudiRiapri(id, 'chiudi'); break;
      case 'ric-riapri': chiudiRiapri(id, 'riapri'); break;
      case 'qr-ric': scaricaQR('ricerca', elenco.ricerche.find(r => r.id === id) || {id}); break;
      case 'qr-comando': scaricaQR('comando', ricerca); break;
      case 'copia-codice': FireOps.copiaTesto ? FireOps.copiaTesto(chiave) : navigator.clipboard.writeText(chiave); messaggio('Codice di accesso copiato.', true); break;
      case 'reset':
        if (!confirm('Togliere da questo PC tutte le ricerche SAR, le copie locali e i codici di accesso?\nSul foglio non cambia nulla.' + (sporco ? '\n\nATTENZIONE: ci sono modifiche non ancora salvate sul foglio, andranno perse.' : ''))) break;
        disattiva();
        Object.keys(localStorage).filter(k => k.startsWith('fireops_sar_')).forEach(k => { try { localStorage.removeItem(k); } catch (x) {} });
        disegna(); messaggio('Dati SAR tolti da questo PC.', true); break;
      case 'annulla': modifica = null; disegna(); break;
      case 'reg-scarica': scaricaRegistrati(false); break;
      case 'p-nuova': modifica = {tipo: 'pers', id: null}; disegna(); break;
      case 'p-mod': modifica = {tipo: 'pers', id}; disegna(); break;
      case 'p-salva': salvaPersona(); break;
      case 'p-del':
        if (!confirm('Eliminare questa persona dalla ricerca (tutti i giorni)?')) break;
        vivi(st.sq).forEach(s => { if (s.leader === modifica.id || (s.membri || []).includes(modifica.id)) cambia('sq', Object.assign({}, s, {leader: s.leader === modifica.id ? '' : s.leader, membri: (s.membri || []).filter(x => x !== modifica.id)})); });
        elimina('pers', modifica.id); modifica = null; disegna(); break;
      case 's-nuova': modifica = {tipo: 'sq', id: null}; disegna(); break;
      case 's-mod': modifica = {tipo: 'sq', id}; disegna(); break;
      case 's-salva': salvaSquadra(); break;
      case 's-copia': copiaSquadre(); break;
      case 's-del':
        if (inZona(modifica.id)) { messaggio('La squadra è in zona: segna prima il rientro in Gestione orari.'); break; }
        if (!confirm('Eliminare questa squadra? Le persone tornano libere.')) break;
        elimina('sq', modifica.id); modifica = null; disegna(); break;
      case 'pua-posa': posaPua = !posaPua; root.querySelector('#sar-mappa').classList.toggle('sar-mirino', posaPua); disegna(); break;
      case 'pua-coord': {
        const m = (root.querySelector('#sar-pua-coord').value || '').match(/(-?\d+(?:[.,]\d+)?)\s*[,;\s]\s*(-?\d+(?:[.,]\d+)?)/);
        if (!m) { messaggio('Scrivi le coordinate come “44.12345, 11.98765”.'); break; }
        const lat = parseFloat(m[1].replace(',', '.')), lon = parseFloat(m[2].replace(',', '.'));
        if (!(Math.abs(lat) <= 90 && Math.abs(lon) <= 180)) { messaggio('Coordinate fuori scala.'); break; }
        cambia('info', Object.assign({}, st.info, {pua: {lat, lon}})); if (mappa) mappa.setView([lat, lon], 15); disegna(); break;
      }
      case 'z-griglia': zonizza(); break;
      case 'z-disegna':
        if (!mappa || !mappa.pm) { messaggio('Strumento di disegno non disponibile.'); break; }
        mappa.pm.enableDraw('Polygon', {snappable: true, templineStyle: {color: '#ffd700'}, hintlineStyle: {color: '#ffd700', dashArray: '4 4'}});
        messaggio('Clicca i vertici della zona sulla carta; clic sul primo punto per chiudere.', true); break;
      case 'z-assegna': modifica = {tipo: 'ass', id}; disegna(); break;
      case 'a-salva': salvaAssegna(); break;
      case 'z-gpx': esportaZona(id, 'gpx'); break;
      case 'z-kml': esportaZona(id, 'kml'); break;
      case 'z-kml-tutte': scarica(nomeFile((ricerca ? ricerca.id : 'ricerca') + '_zone_' + giorno) + '.kml', kml(vivi(st.zone), 'Zone ' + (st.info.nome || '') + ' al ' + fmtGiorno(giorno), ''), 'application/vnd.google-earth.kml+xml'); break;
      case 'z-mod': modifica = {tipo: 'zona', id}; disegna(); break;
      case 'zf-salva': {
        const z = st.zone.find(x => x.id === modifica.id), nome = root.querySelector('#sar-zf-nome').value.trim();
        if (!nome) { messaggio('Il nome non può essere vuoto.'); break; }
        const concl = root.querySelector('#sar-zf-concl').checked;
        cambia('zone', Object.assign({}, z, {nome, note: root.querySelector('#sar-zf-note').value.trim(), conclusa: concl, conclusaIl: concl ? (z.conclusaIl || giorno) : ''}));
        modifica = null; disegna(); break;
      }
      case 'zf-vertici': {
        const zid = modifica.id; let pol = null;
        livZone.eachLayer(l => { if (l.options && l.options.sarZona === zid) pol = l; });
        if (!pol || !pol.pm) break;
        pol.unbindTooltip(); pol.pm.enable({allowSelfIntersection: false});
        const fine = L.control({position: 'topleft'});
        fine.onAdd = () => { const b = L.DomUtil.create('button', 'sar-btn pri sar-fine'); b.textContent = 'Fine modifica'; L.DomEvent.disableClickPropagation(b);
          b.onclick = () => { pol.pm.disable(); const pts = pol.getLatLngs()[0].map(p => [p.lat, p.lng]); fine.remove();
            cambia('zone', Object.assign({}, st.zone.find(x => x.id === zid), {punti: pts})); modifica = null; disegna(); }; return b; };
        fine.addTo(mappa); messaggio('Trascina i vertici, poi “Fine modifica” sulla carta.', true); break;
      }
      case 'zf-del':
        if (vivi(st.ass).some(x => x.zona === modifica.id) && !confirm('La zona ha assegnazioni registrate: eliminarla comunque (resta nello storico solo come orario)?')) break;
        if (!confirm('Eliminare la zona?')) break;
        elimina('zone', modifica.id); modifica = null; disegna(); break;
      case 'o-ora': { const tr = t.closest('tr'); const d = new Date(); aggiornaOrario(tr, 'fine', due(d.getHours()) + ':' + due(d.getMinutes())); break; }
      case 'o-del': if (confirm('Annullare questa assegnazione?')) { elimina('ass', id); disegna(); } break;
    }
  });
  root.addEventListener('change', e => {
    const t = e.target;
    if (t.id === 'sar-giorno') { if (t.value) { giorno = t.value; modifica = null; disegna(); } return; }
    if (t.id === 'sar-p-ente') { const v = t.value === 'VVF'; root.querySelector('#sar-p-bq').hidden = !v; root.querySelector('#sar-p-br').hidden = v; return; }
    if (t.id === 'sar-p-tutti') { tuttiPers = t.checked; disegna(); return; }
    if (t.id === 'sar-z-liv') { livelloMappa = t.value; disegna(); return; }
    if (t.id === 'sar-s-tl' && t.value) { const c = root.querySelector('[data-mem="' + t.value + '"]'); if (c) c.checked = true; return; }
    if (t.id === 'sar-n-num' || t.id === 'sar-n-anno') {
      const n = root.querySelector('#sar-n-num').value.replace(/\D/g, ''), an = root.querySelector('#sar-n-anno').value.replace(/\D/g, '');
      const o = root.querySelector('#sar-n-id'); if (o && n) o.innerHTML = 'ID: <b>' + esc(idRicerca(n, an, siglaComando())) + '</b>';
      return;
    }
    const tr = t.closest('tr[data-ass]');
    if (tr && t.dataset.o) aggiornaOrario(tr, t.dataset.o, t.value);
  });
  root.addEventListener('input', e => {
    if (e.target.id === 'sar-p-filtro') {
      filtroPers = e.target.value; const pos = e.target.selectionStart;
      disegna(); const f = root.querySelector('#sar-p-filtro'); if (f) { f.focus(); f.setSelectionRange(pos, pos); }
    }
  });
  document.addEventListener('fireops:comando-attivo-cambiato', () => { elenco = {caricato: false, ricerche: [], errore: ''}; if (scheda === 'ricerche') caricaElenco(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && posaPua) { posaPua = false; root.querySelector('#sar-mappa').classList.remove('sar-mirino'); disegna(); } });
  window.addEventListener('online', () => { if (sporco) salvaSulFoglio(); });
}

/* ============================== AVVIO ============================== */

function avvia() {
  root = document.getElementById('sar-app');
  if (!root) return;
  costruisci(); eventi();
  // ricerca gia' aperta su questo PC: si riprende dalla copia locale
  const id = leggi(LS_ATTIVA, null), k = id && chiavi()[id], loc = id && leggi(LS_STATO + id, null);
  if (id && k) { attiva((loc && loc.ricerca) || {id, sigla: id.split('_').pop(), stato: 'aperta'}, k).then(() => { if (scheda === 'ricerche') caricaElenco(); }); }
  disegna();
  if (window.FireOpsComandoAttivo) caricaElenco(); else setTimeout(caricaElenco, 2500);
}

NS.SAR = {avvia, _stato: () => ({ricerca, st, versione, sporco, giorno, chiave})};
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', avvia); else avvia();
})();
