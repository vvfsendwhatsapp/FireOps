/*!
 * FireOps VVF — differibili.js — Triage Schede Differibili
 * Dipendenze: Leaflet 1.9 · Geoman 2.15 · fireops-core.js
 * Markup:     sezione #differibili di index-bis.html (il contenuto lo
 *             costruisce questo file dentro #diff-app)
 * Stile:      style.css, sezione MODULI AGGIUNTIVI
 * Backend:    Apps Script "FireOps Differibili" (differibili-backend.gs)
 *
 * IMPIANTO
 * Il Comando carica l'export delle schede differibili (CSV, JSON o un
 * Google Sheet) sotto un CODEM, le vede sulla carta, le raggruppa
 * disegnando poligoni e stampa ogni gruppo (carta + tabella). Ricaricando
 * lo stesso CODEM le schede nuove si accodano: la chiave è ID_CONTATTO.
 * La Direzione Regionale vede le emergenze in corso dei suoi Comandi, in
 * sola lettura: niente import, gruppi, stampa o archiviazione.
 *
 * CHI È L'UTENTE
 * Lo dice il Comando attivo di FireOps, niente token. È tutto in
 * identita(): se un domani servisse un controllo vincolante si cambia lì
 * e in identifica_ del backend, il resto non se ne accorge.
 * Le Direzioni non stanno in comandi.json e non si scelgono dal menu ☰:
 * la sala della DR sceglie un qualsiasi Comando della sua regione e
 * spunta "Vista Direzione". Vede così tutti i Comandi con la stessa
 * "Direzione VVF", in sola lettura, e non quelli delle altre regioni.
 *
 * IL CSV
 * L'export arriva con due vizi noti:
 *  - coordinate con la virgola decimale;
 *  - il campo POLYLINE non racchiuso tra virgolette: "5;lon;lat;…" si
 *    spezza in 2n+1 campi e fa scivolare tutte le colonne successive.
 * Il parser legge n, prende i 2n valori come vertici e riallinea la riga.
 */
(function () {
'use strict';
const NS = (window.FireOps = window.FireOps || {});
if (NS.Differibili) return;

/* ============================== COSTANTI ============================== */

const URL_BACKEND = 'https://script.google.com/macros/s/AKfycby7ZTvBPlzlKOXqAi8RJEyFIzOGEaNecpDxdNtAvgTLfpaYU-g3afKswzt2g9wZaPr0xg/exec';

/* LETTURE DAL FOGLIO — scelta del Comando: il foglio del backend è
   condiviso "chiunque abbia il link: visualizzatore" e la pagina lo legge
   direttamente con l'endpoint gviz, filtrando nella richiesta. Apps Script
   resta solo per le scritture (carica, gruppi, archivia).
   Nota: così chiunque conosca questo ID legge tutte le schede, compresi
   nomi e telefoni dei chiamanti. È una scelta consapevole.
   ID vuoto = letture tramite Apps Script, come prima. */
const ID_FOGLIO = '';          // ← ID del Google Sheet del backend (dall'URL /d/<ID>/edit)

/* Ripiego se script.js non espone window.FireOpsComandi: da verificare
   sul percorso vero del repo. */
const PERCORSO_COMANDI = 'db/comandi.json';

/* Gli stessi campi della whitelist del backend: tutto il resto dell'export
   (INFO_XML in testa, che è metà del file) non esce dal browser. */
const CAMPI = [
  'ID_CONTATTO', 'ALTROENTE_IDSCHEDA',
  'NOME', 'COGNOME', 'RAG_SOCIALE', 'CLI',
  'TOPONIMO', 'INDIRIZZO', 'CIVICO', 'ADD_INFO', 'CITTA', 'DISTRETTO', 'PROVINCIA',
  'LAT', 'LON', 'SHAPE', 'RMAX', 'RMIN', 'ANGOLO', 'POLYLINE',
  'DATA_INS', 'DESCRIZIONE_TRIAGE', 'DIFFERIBILE', 'NOTE_AREU'
];

const RE_CODEM = /^[A-Z0-9]+?([A-Z]{2})(\d{2})(\d{2})(\d{4})$/;
const RIFRESCO_MS = 120000;         // la DR segue le emergenze in corso

/* Il colore dice la categoria di triage, il bordo il gruppo: sono le due
   domande che si fanno guardando la carta, e con un colore solo si
   perderebbe una delle due. COD_TRIAGE è troncato a quattro lettere,
   quindi si legge la descrizione. */
/* Una voce per ogni tipologia. DESCRIZIONE_TRIAGE arriva come
   "Alberi/tralicci caduti o pericolanti - SOLO SK": il suffisso " - SOLO SK"
   è uguale per tutte le differibili e non dice niente, quindi si toglie.
   Il codice davanti ("0001 - Soccorso a persona…") viene da CODICI_TIPOLOGIA:
   l'export non ne porta uno (COD_TRIAGE sono solo le prime quattro lettere
   della descrizione). Una tipologia che non è in tabella resta senza codice. */
const CODICI_TIPOLOGIA = {
  'Soccorso a persona (per soccorso tecnico)': '0001'
  // 'Alberi/tralicci caduti o pericolanti': '00xx',
  // 'Crolli/dissesti/cedimenti': '00xx',
  // 'Allagamenti/esondazioni': '00xx',
};
const COLORI_NOTI = [
  {re:/alber|tralic/i, c:'#2e7d32'}, {re:/croll|disses|ceden/i, c:'#8d5a3c'},
  {re:/allag|esond/i, c:'#1e88e5'}, {re:/soccorso a persona/i, c:'#d81b60'}];
const COLORI_TIPO = ['#f4511e', '#8e24aa', '#00acc1', '#c0ca33', '#5e35b1', '#fb8c00',
  '#43a047', '#e91e63', '#3949ab', '#6d4c41', '#00897b', '#fdd835'];
const cacheTipi = new Map();
function categoria(s){
  const tutto = String(s.DESCRIZIONE_TRIAGE || '').trim();
  if (cacheTipi.has(tutto)) return cacheTipi.get(tutto);
  const desc = tutto.replace(/\s*-?\s*SOLO\s+SK\s*$/i, '').replace(/^-\s*/, '').trim();
  const cod = CODICI_TIPOLOGIA[desc] || '';
  let h = 0;
  for (const ch of desc) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const noto = COLORI_NOTI.find(x => x.re.test(desc));
  const c = !desc ? '#9e9e9e' : noto ? noto.c : COLORI_TIPO[h % COLORI_TIPO.length];
  const n = !desc ? 'Tipologia non indicata' : cod ? `${cod} - ${desc}` : desc;
  const t = {k: tutto || '—', c, n};
  cacheTipi.set(tutto, t);
  return t;
}
/* Gruppi = settori e sottosettori. Il settore ha il nome dell'alfabeto
   fonetico NATO e un colore; il sottosettore è un numero, ed è quello che
   si dice per radio: "Bravo 2". Nel foglio resta un solo campo NOME
   ("Bravo 2"), così il backend non cambia: settore e numero si ricavano. */
const SETTORI = ['Alfa', 'Bravo', 'Charlie', 'Delta', 'Echo', 'Foxtrot', 'Golf', 'Hotel',
  'India', 'Juliett', 'Kilo', 'Lima', 'Mike', 'November', 'Oscar', 'Papa', 'Quebec',
  'Romeo', 'Sierra', 'Tango', 'Uniform', 'Victor', 'Whiskey', 'X-ray', 'Yankee', 'Zulu'];
const COLORI_SETTORE = ['#e53935', '#1e88e5', '#fb8c00', '#8e24aa', '#00897b', '#fdd835',
  '#6d4c41', '#d81b60', '#3949ab', '#7cb342'];
const coloreSettore = nome => {
  const i = SETTORI.indexOf(nome);
  return COLORI_SETTORE[(i < 0 ? SETTORI.length : i) % COLORI_SETTORE.length];
};
/* "Bravo 2" → {settore:'Bravo', n:2}; un nome libero resta settore senza numero. */
function settoreDi(g){
  const m = /^(.+?)\s+(\d+)$/.exec(String(g.NOME || '').trim());
  return m ? {settore: m[1], n: +m[2]} : {settore: String(g.NOME || '—'), n: 0};
}


/* ============================== UTILITÀ =============================== */

const esc = s => String(s == null ? '' : s).replace(/[<>&"]/g,
  c => ({'<':'&lt;', '>':'&gt;', '&':'&amp;', '"':'&quot;'}[c]));
const num = v => parseFloat(String(v == null ? '' : v).trim().replace(',', '.'));
/* L'Italia sta fra 35-48 di latitudine e 6-19 di longitudine: le due fasce
   non si sovrappongono, ed è così che si capisce l'ordine dei vertici. */
const eLat = v => v >= 35 && v <= 48;
const eLon = v => v >= 6 && v <= 19;
const inItalia = (la, lo) => eLat(la) && eLon(lo);

const R_TERRA = 6378137;
const rad = x => x * Math.PI / 180, gra = x => x * 180 / Math.PI;
function puntoDaAzimut(lat, lon, gradi, metri){
  const d = metri / R_TERRA, br = rad(gradi), la = rad(lat), lo = rad(lon);
  const la2 = Math.asin(Math.sin(la) * Math.cos(d) + Math.cos(la) * Math.sin(d) * Math.cos(br));
  const lo2 = lo + Math.atan2(Math.sin(br) * Math.sin(d) * Math.cos(la),
    Math.cos(d) - Math.sin(la) * Math.sin(la2));
  return [gra(la2), gra(lo2)];
}

/* Punto nel poligono sul piano lat/lon: a scala di provincia l'errore è
   trascurabile, e un gruppo non attraversa mezzo emisfero. */
function dentro(lat, lon, anello){
  let d = false;
  for (let i = 0, j = anello.length - 1; i < anello.length; j = i++){
    const yi = anello[i].lat, xi = anello[i].lng, yj = anello[j].lat, xj = anello[j].lng;
    if ((yi > lat) !== (yj > lat) && lon < (xj - xi) * (lat - yi) / (yj - yi) + xi) d = !d;
  }
  return d;
}

/* ============================ LETTURA CSV ============================= */

/* Separatore: si contano ; e , fuori dalle virgolette nella prima riga.
   L'export originale è a punto e virgola (le coordinate hanno la virgola),
   quello passato da Google Sheet a virgola. */
function separatore(testo){
  const riga = testo.slice(0, testo.indexOf('\n') > 0 ? testo.indexOf('\n') : testo.length);
  let pv = 0, v = 0, tab = 0, dentroQ = false;
  for (const ch of riga){
    if (ch === '"') dentroQ = !dentroQ;
    else if (!dentroQ){ if (ch === ';') pv++; else if (ch === ',') v++; else if (ch === '\t') tab++; }
  }
  return tab > pv && tab > v ? '\t' : (pv >= v ? ';' : ',');
}

function parseCsv(testo, sep){
  const righe = [];
  let riga = [], campo = '', q = false;
  for (let i = 0; i < testo.length; i++){
    const ch = testo[i];
    if (q){
      if (ch === '"'){
        if (testo[i + 1] === '"'){ campo += '"'; i++; } else q = false;
      } else campo += ch;
      continue;
    }
    if (ch === '"' && campo === '') q = true;
    else if (ch === sep){ riga.push(campo); campo = ''; }
    else if (ch === '\n'){ riga.push(campo); righe.push(riga); riga = []; campo = ''; }
    else if (ch !== '\r') campo += ch;
  }
  if (campo !== '' || riga.length){ riga.push(campo); righe.push(riga); }
  return righe.filter(r => r.some(c => String(c).trim() !== ''));
}

/* L'export del sistema NUE esce spesso in Windows-1252: letto come UTF-8
   "FORLÌ" diventa "FORL\uFFFD". Se compare il carattere di sostituzione si
   rilegge nell'altra codifica. */
function leggiFile(file){
  const leggi = cod => new Promise((ok, ko) => {
    const r = new FileReader();
    r.onload = () => ok(r.result);
    r.onerror = () => ko(r.error);
    r.readAsText(file, cod);
  });
  return leggi('utf-8').then(t => t.indexOf('\uFFFD') >= 0 ? leggi('windows-1252') : t)
    .then(t => t.replace(/^\uFEFF/, ''));
}

/* Riallineamento di una riga spezzata da POLYLINE.
   `eccesso` è quanti campi ha in più della riga buona: nel CSV originale
   la riga è semplicemente più lunga dell'intestazione; passando da Google
   Sheet l'intestazione è già allargata con colonne senza nome, e l'eccesso
   si misura sull'ultimo campo pieno rispetto all'ultima colonna con nome. */
function riallinea(intest, r){
  const iP = intest.indexOf('POLYLINE');
  let ultimoNome = -1;
  intest.forEach((h, i) => { if (h) ultimoNome = i; });
  let eccesso;
  if (r.length > intest.length) eccesso = r.length - intest.length;
  else {
    let ultimoPieno = -1;
    r.forEach((c, i) => { if (String(c).trim() !== '') ultimoPieno = i; });
    eccesso = ultimoPieno - ultimoNome;
  }
  if (iP < 0 || eccesso <= 0) return {riga: r, vertici: null, riallineata: false};

  const n = parseInt(r[iP], 10);
  if (!(n > 0) || 2 * n > eccesso) return {riga: r, vertici: null, riallineata: false, dubbia: true};

  const valori = r.slice(iP + 1, iP + 1 + 2 * n).map(num);
  const vertici = [];
  for (let i = 0; i + 1 < valori.length; i += 2){
    const a = valori[i], b = valori[i + 1];
    if (eLat(a) && eLon(b)) vertici.push([a, b]);
    else if (eLon(a) && eLat(b)) vertici.push([b, a]);
  }
  const riga = r.slice(0, iP + 1).concat(r.slice(iP + 1 + eccesso));
  return {riga, vertici: vertici.length >= 3 ? vertici : null, riallineata: true};
}

/* Da un oggetto con le chiavi dell'export a una scheda pulita. Se LAT/LON
   mancano o sono fuori dall'Italia si prova la prima posizione AML scritta
   nelle note: è la localizzazione del telefono, spesso la migliore. */
function schedaDa(o, vertici){
  const s = {};
  CAMPI.forEach(k => { s[k] = o[k] == null ? '' : String(o[k]).trim(); });
  ['NOTE_AREU', 'ADD_INFO'].forEach(k => { if (s[k].length > 900) s[k] = s[k].slice(0, 900) + '…'; });
  let la = num(s.LAT), lo = num(s.LON);
  if (!inItalia(la, lo)){
    const m = /AML@\(\s*([0-9.]+)\s*,\s*([0-9.]+)/.exec(s.NOTE_AREU);
    if (m && inItalia(+m[1], +m[2])){ la = +m[1]; lo = +m[2]; }
  }
  s.LAT = inItalia(la, lo) ? String(la) : '';
  s.LON = inItalia(la, lo) ? String(lo) : '';
  ['RMAX', 'RMIN', 'ANGOLO'].forEach(k => {
    const v = num(s[k]); s[k] = isFinite(v) ? String(v) : '';
  });
  if (vertici) s.POLYLINE = JSON.stringify(vertici);
  else if (!/^\[/.test(s.POLYLINE)) s.POLYLINE = '';
  s.PROVINCIA = s.PROVINCIA.toUpperCase();
  return s;
}

function daCsv(testo){
  const sep = separatore(testo);
  const righe = parseCsv(testo, sep);
  if (righe.length < 2) throw new Error('il file non contiene schede');
  const intest = righe[0].map(h => String(h).trim().toUpperCase());
  if (intest.indexOf('ID_CONTATTO') < 0) throw new Error('manca la colonna ID_CONTATTO');
  let riallineate = 0, dubbie = 0;
  const schede = righe.slice(1).map(r => {
    const x = riallinea(intest, r);
    if (x.riallineata) riallineate++;
    if (x.dubbia) dubbie++;
    const o = {};
    intest.forEach((h, i) => { if (h) o[h] = x.riga[i]; });
    return schedaDa(o, x.vertici);
  });
  return {schede, riallineate, dubbie, separatore: sep};
}

function daJson(testo){
  const j = JSON.parse(testo);
  const elenco = Array.isArray(j) ? j : (j.schede || j.data || j.features || []);
  if (!Array.isArray(elenco) || !elenco.length) throw new Error('nessuna scheda nel JSON');
  const schede = elenco.map(x => {
    const o = {};
    Object.keys(x.properties || x).forEach(k => { o[k.toUpperCase()] = (x.properties || x)[k]; });
    return schedaDa(o, null);
  });
  return {schede, riallineate: 0, dubbie: 0, separatore: null};
}

/* Google Sheet: prima l'export CSV, poi l'endpoint gviz, che risponde con
   CORS ma tipizza le colonne a maggioranza e può svuotare i valori
   minoritari. Serve il foglio condiviso "chiunque abbia il link". */
async function daGoogleSheet(link){
  const id = (/\/d\/([a-zA-Z0-9_-]{20,})/.exec(link) || [])[1];
  if (!id) throw new Error('link Google Sheet non riconosciuto');
  const gid = (/[#&?]gid=(\d+)/.exec(link) || [])[1] || '0';
  const tentativi = [
    `https://docs.google.com/spreadsheets/d/${id}/export?format=csv&gid=${gid}`,
    `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv&gid=${gid}`
  ];
  let ultimo = null;
  for (const u of tentativi){
    try {
      const r = await fetch(u);
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const t = await r.text();
      if (/^\s*<!DOCTYPE|<html/i.test(t)) throw new Error('foglio non condiviso');
      return daCsv(t);
    } catch(e){ ultimo = e; }
  }
  throw new Error('lettura del foglio non riuscita (' + ultimo.message + ')');
}

/* ============================= IDENTITÀ =============================== */

/* In comandi.json la sigla sta in "Provincia" (FC, BO…). */
const siglaDi = c => {
  const v = String((c && c.Provincia) || '').trim().toUpperCase();
  return /^[A-Z]{2}$/.test(v) ? v : '';
};
/* Le righe senza "CHS Comando" non sono Comandi provinciali (es. il COR AIB
   di Curno, che ha Provincia BG come Bergamo): non caricano, e non vanno
   contate due volte fra i Comandi di una Direzione. */
const eComandoProvinciale = c => !!siglaDi(c) && String(c['CHS Comando'] || '').trim() !== '';
const CHIAVE_VISTA_DR = 'fireops_differibili_vista_dr';
const vistaDR = () => { try { return sessionStorage.getItem(CHIAVE_VISTA_DR) === '1'; } catch(e){ return false; } };

async function elencoComandi(){
  const g = window.FireOpsComandi;
  if (Array.isArray(g) && g.length) return g;
  if (g && typeof g === 'object'){
    const v = Object.values(g).find(Array.isArray);
    if (v) return v;
  }
  try {
    const j = await NS.caricaJson(PERCORSO_COMANDI);
    return Array.isArray(j) ? j : (Object.values(j).find(Array.isArray) || []);
  } catch(e){ return []; }
}

/* Unico punto che decide chi è l'utente. Un Comando ha una sigla sola;
   la vista Direzione ha le sigle dei Comandi con la stessa "Direzione VVF"
   del Comando attivo ("Veneto e TAA" comprende quindi Trento e Bolzano). */
async function identita(){
  const c = window.FireOpsComandoAttivo;
  if (!c) return {errore: 'Nessun Comando attivo: sceglilo dal menu ☰.'};
  const comandi = await elencoComandi();
  const dir = String(c['Direzione VVF'] || '').trim();
  if (vistaDR()){
    if (!dir) return {errore: 'Direzione non indicata per ' + c.Comando + '.'};
    const sigle = [...new Set(comandi.filter(x => eComandoProvinciale(x)
      && String(x['Direzione VVF'] || '').trim() === dir).map(siglaDi))].sort();
    if (!sigle.length) return {errore: 'Nessun Comando trovato per la Direzione ' + dir + '.'};
    const ente = 'Direzione VVF ' + dir;
    return {ruolo: 'DR', ente, direzione: dir, sigle, comandi,
      utente: {ruolo: 'DR', ente, sigle}};
  }
  if (!eComandoProvinciale(c))
    return {errore: `${c.Comando} non è un Comando provinciale: può solo usare la vista Direzione.`};
  const sigla = siglaDi(c);
  const ente = 'Comando VVF ' + c.Comando;
  return {ruolo: 'COMANDO', ente, direzione: dir, sigle: [sigla], sigla, comandi,
    utente: {ruolo: 'COMANDO', ente, sigle: [sigla]}};
}

function validaCodem(v, id){
  const codem = String(v || '').toUpperCase().replace(/\s+/g, '');
  if (!codem) return {errore: 'Inserisci il CODEM.'};
  const m = RE_CODEM.exec(codem);
  if (!m) return {errore: 'CODEM non valido: deve finire con la sigla provincia e la data ggmmaaaa.'};
  const [, sigla, gg, mm, aaaa] = m;
  const d = new Date(+aaaa, +mm - 1, +gg);
  if (d.getFullYear() !== +aaaa || d.getMonth() !== +mm - 1 || d.getDate() !== +gg)
    return {errore: `CODEM non valido: la data ${gg}/${mm}/${aaaa} non esiste.`};
  if (!id || id.ruolo !== 'COMANDO')
    return {errore: 'Solo un Comando può caricare schede.'};
  if (sigla !== id.sigla)
    return {errore: `CODEM riferito a ${sigla}, comando attivo ${id.sigla}: caricamento non consentito.`,
      sigla, data: `${gg}/${mm}/${aaaa}`};
  return {codem, sigla, data: `${gg}/${mm}/${aaaa}`};
}

/* ============================== BACKEND =============================== */

/* Le chiamate al backend passano una alla volta: Apps Script risponde con
   un reindirizzamento a un indirizzo "echo" usa-e-getta, e con più
   esecuzioni sovrapposte dallo stesso browser quell'indirizzo a volte
   risponde 404 anche se lo script è andato a buon fine. In coda e con un
   secondo tentativo il problema, se è quello, sparisce.
   Le sole letture si ripetono: una scrittura ripetuta potrebbe essere già
   stata eseguita, e l'accodamento per ID_CONTATTO la renderebbe innocua,
   ma un gruppo creato due volte no. */
const LETTURE = new Set(['emergenze', 'schede', 'gruppi']);

/* Tutto passa in GET, con la richiesta JSON nel parametro q: dalla pagina i
   POST ad Apps Script arrivano allo script ma la risposta si perde nel
   reindirizzamento di Google (404 su .../macros/echo), le GET no.
   Il prezzo è la lunghezza dell'indirizzo: le schede si spediscono
   compatte e a pacchetti che stanno sotto MAX_URL caratteri. */
const MAX_URL = 7500;
const urlRichiesta = (id, azione, dati) => URL_BACKEND + '?q='
  + encodeURIComponent(JSON.stringify(Object.assign({azione, utente: id.utente}, dati || {})))
  + '&t=' + Date.now();

/* Divide le schede in pacchetti che, compattati in righe, stanno in una GET. */
function pacchetti(id, codem, schede){
  const base = urlRichiesta(id, 'carica', {codem, campi: CAMPI, righe: []}).length + 20;
  const out = [];
  let righe = [], lung = base, inizio = 0;
  schede.forEach((sc, i) => {
    const r = CAMPI.map(k => sc[k] == null ? '' : String(sc[k]));
    const l = encodeURIComponent(JSON.stringify(r)).length + 3;
    if (righe.length && lung + l > MAX_URL){
      out.push({inizio, righe}); righe = []; lung = base; inizio = i;
    }
    righe.push(r); lung += l;
  });
  if (righe.length) out.push({inizio, righe});
  return out;
}
let codaApi = Promise.resolve();

function api(id, azione, dati){
  const esegui = async () => {
    const tentativi = LETTURE.has(azione) ? 2 : 1;
    let ultimo;
    for (let t = 0; t < tentativi; t++){
      if (t) await new Promise(ok => setTimeout(ok, 1200));
      try {
        const r = await fetch(urlRichiesta(id, azione, dati), {cache: 'no-store'});
        if (!r.ok) throw new Error(`il server ha risposto ${r.status} (${azione})`);
        const j = await r.json();
        if (!j.ok) return Promise.reject(Object.assign(new Error(j.errore || 'errore del server'), {definitivo: 1}));
        return j.dati;
      } catch(e){
        if (e.definitivo) throw e;
        ultimo = e;
      }
    }
    throw ultimo;
  };
  const p = codaApi.then(esegui, esegui);
  codaApi = p.catch(() => {});
  return p;
}

/* Lettura di un foglio con una query gviz. Risponde righe come oggetti con
   le intestazioni della prima riga. Il foglio Schede è formattato come
   testo da setup(), quindi gviz non tipizza le colonne e non svuota valori. */
async function gviz(foglio, query){
  const u = `https://docs.google.com/spreadsheets/d/${ID_FOGLIO}/gviz/tq?tqx=out:csv&headers=1`
    + `&sheet=${encodeURIComponent(foglio)}&tq=${encodeURIComponent(query)}&_=${Date.now()}`;
  const r = await fetch(u, {cache: 'no-store'});
  if (!r.ok) throw new Error(`foglio ${foglio}: HTTP ${r.status}`);
  const t = (await r.text()).replace(/^\uFEFF/, '');
  if (/^\s*</.test(t)) throw new Error(`foglio ${foglio} non leggibile: va condiviso "chiunque abbia il link"`);
  const righe = parseCsv(t, ',');
  if (!righe.length) return [];
  const intest = righe[0].map(h => String(h).trim());
  return righe.slice(1).map(v => {
    const o = {};
    intest.forEach((h, i) => { if (h) o[h] = v[i] == null ? '' : String(v[i]); });
    return o;
  });
}
const alternanza = valori => valori.map(v => String(v).replace(/[^A-Z0-9]/gi, '')).join('|');

/* Le tre letture, dal foglio se c'è l'ID, altrimenti da Apps Script.
   Colonne: Emergenze A=CODEM B=SIGLA D=STATO · Schede A=CODEM · Gruppi B=CODEM. */
async function leggiEmergenze(id, arch){
  if (!ID_FOGLIO) return api(id, 'emergenze', {includiArchiviate: arch});
  return gviz('Emergenze', `select * where B matches '${alternanza(id.sigle)}'`
    + (arch ? '' : ` and D = 'ATTIVA'`));
}
async function leggiPerCodem(id, azione, foglio, colonna, codem, emergenze, arch){
  if (!ID_FOGLIO) return api(id, azione, {codem, includiArchiviate: arch});
  const elenco = codem ? [codem] : emergenze.map(e => e.CODEM);
  if (!elenco.length) return [];
  return gviz(foglio, `select * where ${colonna} matches '${alternanza(elenco)}'`);
}
async function leggiSchede(id, codem, emergenze, arch){
  const r = await leggiPerCodem(id, 'schede', 'Schede', 'A', codem, emergenze, arch);
  r.forEach(s => { delete s.HASH; });
  return r;
}
async function leggiGruppi(id, codem, emergenze, arch){
  const r = await leggiPerCodem(id, 'gruppi', 'Gruppi', 'B', codem, emergenze, arch);
  r.forEach(g => { if (typeof g.GEOJSON === 'string'){ try { g.GEOJSON = JSON.parse(g.GEOJSON); } catch(e){ g.GEOJSON = null; } } });
  return r;
}

/* =============================== MODULO =============================== */

function avvia(sezione){
  const app = sezione.querySelector('#diff-app');
  app.innerHTML = `
    <div class="diff-barra">
      <div class="diff-barra-sx">
        <select id="diff-selEmergenza" class="diff-sel-emergenza" title="Emergenza da mostrare sulla carta">
          <option value="">⏳ Lettura delle emergenze…</option></select>
        <select id="diff-selComando" class="diff-solo-dr" title="Filtra per Comando"></select>
        <span id="diff-ente" class="diff-ruolo" hidden></span>
      </div>
      <div class="diff-azioni">
        <button type="button" id="diff-bImporta" class="btn-toggle-radar diff-solo-comando"
          title="Carica un CSV, un JSON o un Google Sheet di schede differibili">📥 Carica schede</button>
        <button type="button" id="diff-bGruppo" class="btn-toggle-radar diff-solo-comando"
          title="Disegna un perimetro sulla carta: le schede dentro formano un sottosettore">✏️ Crea settore</button>
        <button type="button" id="diff-bStampa" class="btn-toggle-radar diff-solo-comando"
          title="PDF con carta e tabella delle schede visibili">🖨 PDF</button>
        <button type="button" id="diff-bArchivia" class="btn-toggle-radar diff-solo-comando diff-rosso"
          title="Chiude l'emergenza: sparisce da quelle in corso">🗄 Archivia</button>
        <span class="diff-sep diff-solo-comando"></span>
        <button type="button" id="diff-bAggiorna" class="btn-toggle-radar"
          title="Aggiorna adesso (si aggiorna anche da solo ogni 2 minuti)">🔄 Aggiorna</button>
        <button type="button" id="diff-bChiudi" class="btn-toggle-radar diff-rosso"
          title="Chiudi le schede differibili e torna alla vista a due colonne">✖ Chiudi</button>
      </div>
    </div>

    <div class="diff-corpo">
      <div class="diff-mapwrap">
        <div id="diff-mappa"></div>

        <div id="diff-import" class="diff-card diff-import" hidden>
          <div class="diff-card-testa"><b>Carica schede differibili</b>
            <button type="button" id="diff-bChiudiImport" class="diff-x" title="Chiudi">×</button></div>
          <div class="diff-passo">
            <span class="diff-passo-n">1</span>
            <div class="diff-passo-corpo">
              <label for="diff-file">Scegli il file esportato (CSV o JSON)</label>
              <input type="file" id="diff-file" accept=".csv,.txt,.tsv,.json,text/csv,application/json">
              <label for="diff-link" class="diff-oppure">oppure incolla il link di un Google Sheet</label>
              <div class="diff-riga">
                <input type="text" id="diff-link" placeholder="https://docs.google.com/spreadsheets/d/…" autocomplete="off">
                <button type="button" id="diff-bLink" class="btn-toggle-radar">Leggi</button>
              </div>
            </div>
          </div>
          <div class="diff-passo">
            <span class="diff-passo-n">2</span>
            <div class="diff-passo-corpo diff-emergenza-scelta">
              <label>Emergenza</label>
              <b id="diff-codemScelto">— scegli prima il file</b>
              <span id="diff-dataInizio" class="diff-derivato-breve"></span>
              <button type="button" id="diff-bCambiaCodem" class="btn-toggle-radar" disabled>Cambia</button>
              <input type="hidden" id="diff-codem">
            </div>
          </div>
          <p id="diff-codemErrore" class="diff-errore" hidden></p>
          <div id="diff-anteprima"></div>
          <div class="diff-passo">
            <span class="diff-passo-n">3</span>
            <div class="diff-passo-corpo">
              <button type="button" id="diff-bCarica" class="btn-whatsapp" disabled>⬆️ Carica su FireOps</button>
            </div>
          </div>
        </div>

        <div id="diff-vuoto" class="diff-card diff-vuoto" hidden></div>
        <div id="diff-guida" class="diff-guida" hidden></div>
        <button type="button" id="diff-bSfondo" class="btn-toggle-radar diff-sfondo">🛰 Satellite</button>
      </div>

      <aside class="diff-lato">
        <div id="diff-riepilogo"></div>
        <h4>Settori</h4>
        <div id="diff-gruppi"><p class="pagina-nota">Nessun gruppo.</p></div>
        <h4>Visualizzazione</h4>
        <label class="rt-check diff-check"><input type="checkbox" id="diff-aree"> Aree di localizzazione</label>
        <label class="rt-check diff-check"><input type="checkbox" id="diff-archiviate"> Mostra le emergenze archiviate</label>
        <label class="rt-check diff-check" title="Tutti i Comandi della Direzione del Comando attivo, in sola lettura">
          <input type="checkbox" id="diff-vistaDR"> Vista Direzione</label>
      </aside>
    </div>
    <p id="diff-stato" class="pagina-nota diff-stato"></p>

    <div id="diff-modale" class="diff-modale" hidden>
      <div class="diff-modale-box">
        <div class="diff-modale-titolo">FireOps VVF — Schede differibili</div>
        <div class="diff-modale-testo"></div>
        <div class="diff-modale-scelte"></div>
        <input type="text" id="diff-modale-input" autocomplete="off">
        <div class="diff-modale-azioni">
          <button type="button" id="diff-modale-no" class="btn-toggle-radar">Annulla</button>
          <button type="button" id="diff-modale-ok" class="btn-whatsapp">Conferma</button>
        </div>
      </div>
    </div>`;

  const $ = s => app.querySelector('#diff-' + s);

  /* ---------------------------- stato ---------------------------- */
  let id = null;                // identita()
  let emergenze = [], schede = [], gruppi = [];
  let lettura = null;           // risultato del parser in attesa di caricamento
  const nascoste = new Set();   // categorie spente dalla legenda
  let occupato = false;
  let caricato = false;         // prima lettura dal backend conclusa
  let erroreLettura = '';         // disegno o stampa in corso: niente rifresco

  const stato = t => { $('stato').textContent = t || ''; };

  /* ---------------------------- modale ---------------------------- */
  /* Niente prompt/confirm: intestano la finestra col dominio del sito. */
  /* o.voci = [{k, et, nota}] → scelta a pulsanti, restituisce k.
     o.campo → campo di testo, restituisce il testo. Altrimenti conferma. */
  function chiedi(o){
    return new Promise(ok => {
      const m = $('modale'), inp = $('modale-input');
      const scelte = m.querySelector('.diff-modale-scelte');
      m.querySelector('.diff-modale-testo').textContent = o.testo || '';
      inp.hidden = !o.campo;
      inp.value = o.valore || '';
      inp.placeholder = o.segnaposto || '';
      $('modale-ok').hidden = !!o.voci;
      $('modale-ok').textContent = o.ok || 'Conferma';
      $('modale-ok').classList.toggle('diff-rosso', !!o.rosso);
      scelte.innerHTML = '';
      m.hidden = false;
      const fine = v => { m.hidden = true; document.removeEventListener('keydown', tasti); ok(v); };
      const tasti = e => {
        if (e.key === 'Escape') fine(null);
        if (e.key === 'Enter' && !o.voci){ e.preventDefault(); fine(o.campo ? inp.value.trim() : true); }
      };
      (o.voci || []).forEach(v => {
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'diff-scelta';
        b.innerHTML = `<b>${esc(v.et)}</b>${v.nota ? `<span>${esc(v.nota)}</span>` : ''}`;
        b.onclick = () => fine(v.k);
        scelte.appendChild(b);
      });
      document.addEventListener('keydown', tasti);
      $('modale-ok').onclick = () => fine(o.campo ? inp.value.trim() : true);
      $('modale-no').onclick = () => fine(null);
      setTimeout(() => (o.campo ? inp : (scelte.querySelector('button') || $('modale-no'))).focus(), 30);
    });
  }

  /* ----------------------------- mappa ----------------------------- */
  function centroComando(){
    const c = window.FireOpsComandoAttivo;
    if (!c) return null;
    const k1 = Object.keys(c).find(x => /^lat/i.test(x));
    const k2 = Object.keys(c).find(x => /^(lon|lng)/i.test(x));
    const la = num(k1 && c[k1]), lo = num(k2 && c[k2]);
    return inItalia(la, lo) ? [la, lo] : null;
  }
  const sfondi = [
    {n: '🗺 Stradale', l: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      {maxZoom: 19, attribution: 'OpenStreetMap', crossOrigin: true})},
    {n: '🛰 Satellite', l: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      {maxZoom: 19, attribution: 'Esri'})}
  ];
  let iSfondo = 0;
  const c0 = centroComando();
  const map = L.map($('mappa'), {center: c0 || [42.74, 12.74], zoom: c0 ? 11 : 6,
    layers: [sfondi[0].l], preferCanvas: true});
  L.control.scale({imperial: false, position: 'bottomright'}).addTo(map);
  /* Canvas: centinaia di marcatori in SVG rallentano lo spostamento della
     carta, e un'emergenza meteo ne porta facilmente più di mille. */
  const tela = L.canvas({padding: .5});
  const livGruppi = L.featureGroup().addTo(map);
  const livAree = L.layerGroup().addTo(map);
  const livSchede = L.layerGroup().addTo(map);
  const livScelta = L.layerGroup().addTo(map);

  $('bSfondo').onclick = () => {
    map.removeLayer(sfondi[iSfondo].l);
    iSfondo = (iSfondo + 1) % sfondi.length;
    map.addLayer(sfondi[iSfondo].l);
    sfondi[iSfondo].l.bringToBack();
    $('bSfondo').textContent = sfondi[(iSfondo + 1) % sfondi.length].n;
  };
  $('aree').onchange = disegna;

  /* Area di localizzazione: è l'incertezza del telefono. Un cerchio di un
     chilometro dice che il civico va cercato, non raggiunto. ANGOLO è
     l'orientamento del semiasse maggiore, in gradi da nord in senso orario. */
  function formaLocalizzazione(s){
    const la = num(s.LAT), lo = num(s.LON);
    const stile = {renderer: tela, snapIgnore: true, pmIgnore: true, color: categoria(s).c, weight: 1.2, dashArray: '4,4',
      fillOpacity: .06, interactive: false};
    let v = null;
    try { v = s.POLYLINE ? JSON.parse(s.POLYLINE) : null; } catch(e){}
    if (Array.isArray(v) && v.length >= 3) return L.polygon(v, stile);
    const a = num(s.RMAX), b = num(s.RMIN), ang = num(s.ANGOLO) || 0;
    if (/ellip/i.test(s.SHAPE) && a > 0 && b > 0){
      const p = [];
      for (let g = 0; g < 360; g += 8){
        const x = a * Math.cos(rad(g)), y = b * Math.sin(rad(g));
        p.push(puntoDaAzimut(la, lo, ang + gra(Math.atan2(y, x)), Math.hypot(x, y)));
      }
      return L.polygon(p, stile);
    }
    return a > 0 ? L.circle([la, lo], Object.assign({radius: a}, stile)) : null;
  }

  /* -------------------------- filtri e viste -------------------------- */
  const conPosizione = s => s.LAT !== '' && s.LON !== '' && isFinite(num(s.LAT));
  const gruppoDi = s => gruppi.find(g => g.ID_GRUPPO === s.GRUPPO) || null;
  const emergenzaScelta = () => emergenze.find(e => e.CODEM === $('selEmergenza').value) || null;

  function visibili(){
    const sig = $('selComando').value;
    return schede.filter(s => !nascoste.has(categoria(s).k)
      && (!sig || String(s.CODEM).slice(-10, -8) === sig));
  }

  function indirizzo(s){
    return [s.TOPONIMO, s.INDIRIZZO, s.CIVICO].filter(Boolean).join(' ');
  }
  const chiamante = s => s.RAG_SOCIALE || [s.NOME, s.COGNOME].filter(Boolean).join(' ');

  function popup(s){
    const g = gruppoDi(s);
    const stessa = s.ALTROENTE_IDSCHEDA
      ? schede.filter(x => x.ALTROENTE_IDSCHEDA === s.ALTROENTE_IDSCHEDA).length : 1;
    const la = num(s.LAT).toFixed(6), lo = num(s.LON).toFixed(6);
    return `<div class="diff-pop">
      <b style="color:${categoria(s).c}">${esc(categoria(s).n)}</b>
      ${s.DIFFERIBILE && s.DIFFERIBILE !== 'S' ? '<span class="diff-badge">non differibile</span>' : ''}
      <div>${esc(indirizzo(s))}</div>
      <div>${esc(s.CITTA)}${s.DISTRETTO ? ' — ' + esc(s.DISTRETTO) : ''}</div>
      ${s.ADD_INFO ? `<div class="diff-pop-note">${esc(s.ADD_INFO)}</div>` : ''}
      <div class="diff-pop-dati">
        <span>Inserita ${esc(s.DATA_INS)}</span>
        ${s.RMAX ? `<span>precisione ±${esc(Math.round(num(s.RMAX)))} m</span>` : ''}
        <span>${esc(chiamante(s))}${s.CLI ? ' · <a href="#" class="diff-cli">' + esc(s.CLI) + '</a>' : ''}</span>
        <span>Contatto ${esc(s.ID_CONTATTO)} · scheda NUE ${esc(s.ALTROENTE_IDSCHEDA)}${stessa > 1 ? ` (${stessa} chiamate)` : ''}</span>
        <span>${esc(s.CODEM)}${g ? ' · <b>' + esc(g.NOME) + '</b>' : ''}</span>
      </div>
      <a href="https://www.google.com/maps?q=${la},${lo}" target="_blank" rel="noopener">Apri in Google Maps</a>
    </div>`;
  }

  /* ------------------------- marcatori e pile -------------------------
     Un marcatore per scheda, tenuto per chiave: al rifresco si aggiunge,
     si aggiorna o si toglie solo quello che è cambiato, senza svuotare la
     carta sotto gli occhi di chi la sta guardando.
     Più chiamate dallo stesso punto (stessa scheda NUE, stesso telefono)
     hanno coordinate identiche e si coprirebbero: si dispongono a corona
     attorno al punto vero, a distanza fissa sullo schermo. */
  const marcatori = new Map();          // chiave -> {s, m, area, firma}
  const chiave = s => s.CODEM + '|' + s.ID_CONTATTO;
  const firma = s => CAMPI.map(k => s[k]).join('\u241F') + '\u241F' + (s.GRUPPO || '');
  const chiavePunto = s => num(s.LAT).toFixed(5) + ',' + num(s.LON).toFixed(5);

  function passaFiltri(s){
    const sig = $('selComando').value;
    return !nascoste.has(categoria(s).k) && (!sig || String(s.CODEM).slice(-10, -8) === sig);
  }

  /* Posizione a schermo dell'i-esimo di n punti sovrapposti. */
  function offsetPila(lat, lon, i, n){
    if (n < 2) return L.latLng(lat, lon);
    const r = 9 + Math.max(0, n - 6) * 1.6;
    const a = 2 * Math.PI * i / n - Math.PI / 2;
    const p = map.latLngToLayerPoint([lat, lon]);
    return map.layerPointToLatLng(L.point(p.x + r * Math.cos(a), p.y + r * Math.sin(a)));
  }
  function posizionaPile(){
    const pile = new Map();
    marcatori.forEach(x => {
      if (!x.m || !livSchede.hasLayer(x.m)) return;
      const k = chiavePunto(x.s);
      if (!pile.has(k)) pile.set(k, []);
      pile.get(k).push(x);
    });
    pile.forEach(el => el.forEach((x, i) =>
      x.m.setLatLng(offsetPila(num(x.s.LAT), num(x.s.LON), i, el.length))));
  }
  map.on('zoomend', posizionaPile);

  function creaMarcatore(s){
    const g = gruppoDi(s), cat = categoria(s);
    const m = L.circleMarker([num(s.LAT), num(s.LON)], {renderer: tela, radius: 6.5, snapIgnore: true, pmIgnore: true,
      fillColor: cat.c, fillOpacity: .95, color: g ? g.COLORE : '#ffffff',
      weight: g ? 3 : 1.5, dashArray: s.DIFFERIBILE && s.DIFFERIBILE !== 'S' ? '2,2' : null});
    m.bindPopup(() => popup(s), {maxWidth: 320});
    m.on('popupopen', ev => {
      livScelta.clearLayers();
      const f = formaLocalizzazione(s);
      if (f) livScelta.addLayer(f);
      const a = ev.popup.getElement().querySelector('.diff-cli');
      if (a) a.onclick = e => { e.preventDefault(); NS.copiaTesto(e, s.CLI); };
    });
    m.on('popupclose', () => livScelta.clearLayers());
    return m;
  }

  function togliMarcatore(k){
    const x = marcatori.get(k);
    if (!x) return;
    if (x.m) livSchede.removeLayer(x.m);
    if (x.area) livAree.removeLayer(x.area);
    marcatori.delete(k);
  }

  function metti(s){
    const x = {s, firma: firma(s), m: null, area: null};
    if (conPosizione(s) && passaFiltri(s)){
      x.m = creaMarcatore(s);
      livSchede.addLayer(x.m);
      if ($('aree').checked){ x.area = formaLocalizzazione(s); if (x.area) livAree.addLayer(x.area); }
    }
    marcatori.set(chiave(s), x);
  }

  function disegnaGruppi(){
    livGruppi.clearLayers();
    gruppi.forEach(g => {
      if (!g.GEOJSON) return;
      const l = L.geoJSON(g.GEOJSON, {interactive: true, style: {color: g.COLORE, weight: 2.5,
        fillColor: g.COLORE, fillOpacity: .07}})
        .bindTooltip(`${g.NOME} — ${g.N_SCHEDE} schede`, {sticky: true});
      livGruppi.addLayer(l);
      const b = l.getBounds();
      if (b.isValid()) livGruppi.addLayer(L.marker(b.getCenter(), {interactive: false, pmIgnore: true,
        snapIgnore: true, icon: L.divIcon({className: 'diff-etichetta-gruppo', iconSize: null,
          html: `<span style="border-color:${esc(g.COLORE)}">${esc(g.NOME)}</span>`})}));
    });
  }

  /* Ridisegno completo: al primo caricamento, al cambio di emergenza o di
     filtri, quando cambia quello che si vuole vedere e non i dati. */
  function disegna(){
    livSchede.clearLayers(); livAree.clearLayers(); livScelta.clearLayers();
    marcatori.clear();
    schede.forEach(metti);
    posizionaPile();
    disegnaGruppi();
    riepilogo(visibili());
    elencoGruppi();
  }

  /* Rifresco: solo le differenze. Restituisce le schede nuove, per l'avviso. */
  function aggiornaDifferenze(nuoveSchede){
    const dopo = new Map(nuoveSchede.map(s => [chiave(s), s]));
    const nuove = [], cambiate = [];
    let tolte = 0;
    marcatori.forEach((x, k) => { if (!dopo.has(k)){ togliMarcatore(k); tolte++; } });
    dopo.forEach((s, k) => {
      const x = marcatori.get(k);
      if (!x){ metti(s); nuove.push(s); }
      else if (x.firma !== firma(s)){ togliMarcatore(k); metti(s); cambiate.push(s); }
    });
    schede = nuoveSchede;
    if (nuove.length || cambiate.length || tolte) posizionaPile();
    disegnaGruppi();
    riepilogo(visibili());
    elencoGruppi();
    return {nuove, cambiate, tolte};
  }

  /* Avviso sulla carta: resta finché non lo si chiude o per un minuto, e
     porta con sé le schede nuove per inquadrarle con un clic. */
  function avvisa(d){
    const n = d.nuove.length;
    if (!n) return;          // modifiche e rimozioni si applicano in silenzio
    let box = app.querySelector('.diff-avviso');
    if (!box){
      box = document.createElement('div');
      box.className = 'diff-avviso';
      app.querySelector('.diff-mapwrap').appendChild(box);
    }
    box.innerHTML = `<span>🔔 <b>${n}</b> ${n === 1 ? 'scheda nuova' : 'schede nuove'}</span>`
      + '<button type="button" class="btn-toggle-radar" data-a="vedi">Mostrale</button>' 
      + '<button type="button" class="diff-avviso-x" data-a="x" title="Chiudi">×</button>';
    box.hidden = false;
    box.querySelector('[data-a="x"]').onclick = () => { box.hidden = true; };
    const vedi = box.querySelector('[data-a="vedi"]');
    if (vedi) vedi.onclick = () => {
      const p = d.nuove.filter(conPosizione).map(s => [num(s.LAT), num(s.LON)]);
      if (p.length) map.fitBounds(L.latLngBounds(p), {padding: [40, 40], maxZoom: 16});
    };
    clearTimeout(box._t);
    box._t = setTimeout(() => { box.hidden = true; }, 60000);
  }

  function riepilogo(v){
    const conteggi = new Map(), tipi = new Map();
    schede.forEach(s => { const c = categoria(s); tipi.set(c.k, c); conteggi.set(c.k, (conteggi.get(c.k) || 0) + 1); });
    const senza = v.filter(s => !conPosizione(s)).length;
    const inGruppo = v.filter(s => s.GRUPPO).length;
    const nue = new Set(v.map(s => s.ALTROENTE_IDSCHEDA).filter(Boolean)).size;
    const voci = [...tipi.values()].sort((a, b) => conteggi.get(b.k) - conteggi.get(a.k)).map(c =>
      `<label class="diff-leg"><input type="checkbox" data-cat="${esc(c.k)}"${nascoste.has(c.k) ? '' : ' checked'}>
        <i style="background:${c.c}"></i><span>${esc(c.n)}</span><b>${conteggi.get(c.k)}</b></label>`).join('');
    $('riepilogo').innerHTML = `
      <div class="diff-numeri">
        <div><b>${v.length}</b><span>schede</span></div>
        <div><b>${nue}</b><span>schede NUE</span></div>
        <div><b>${inGruppo}</b><span>nei settori</span></div>
      </div>
      ${senza ? `<p class="diff-errore">${senza} senza coordinate: non compaiono sulla carta.</p>` : ''}
      <div class="diff-legenda">${voci || '<p class="pagina-nota">Nessuna scheda per la selezione.</p>'}</div>`;
    $('riepilogo').querySelectorAll('input[data-cat]').forEach(i => {
      i.onchange = () => { i.checked ? nascoste.delete(i.dataset.cat) : nascoste.add(i.dataset.cat); disegna(); };
    });
  }

  function elencoGruppi(){
    const box = $('gruppi');
    const em = emergenzaScelta();
    const modificabile = id && id.ruolo === 'COMANDO' && em && em.STATO === 'ATTIVA';
    if (!gruppi.length){
      box.innerHTML = `<p class="pagina-nota">${id && id.ruolo === 'COMANDO'
        ? (em ? 'Nessun settore: premi "Crea settore" e disegna il perimetro sulla carta.'
              : 'Scegli un\u2019emergenza per creare i settori.')
        : 'Nessun settore.'}</p>`;
      return;
    }
    box.innerHTML = '';
    const bottone = (dove, t, tit, f, cls) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'btn-toggle-radar diff-mini' + (cls ? ' ' + cls : '');
      b.textContent = t; b.title = tit; b.onclick = f; dove.appendChild(b);
    };
    const inquadra = gg => {
      let b = null;
      gg.forEach(g => { const x = L.geoJSON(g.GEOJSON).getBounds(); if (x.isValid()) b = b ? b.extend(x) : x; });
      if (b) map.fitBounds(b, {padding: [30, 30]});
    };
    const perSettore = new Map();
    gruppi.slice().sort((a, b) => {
      const x = settoreDi(a), y = settoreDi(b);
      return (SETTORI.indexOf(x.settore) - SETTORI.indexOf(y.settore)) || x.settore.localeCompare(y.settore) || x.n - y.n;
    }).forEach(g => {
      const k = settoreDi(g).settore;
      if (!perSettore.has(k)) perSettore.set(k, []);
      perSettore.get(k).push(g);
    });
    perSettore.forEach((gg, nome) => {
      const tot = gg.reduce((a, g) => a + (+g.N_SCHEDE || 0), 0);
      const t = document.createElement('div');
      t.className = 'diff-settore';
      t.innerHTML = `<i style="background:${esc(gg[0].COLORE)}"></i>
        <span><b>Settore ${esc(nome)}</b><small>${gg.length} sottosettori · ${tot} schede</small></span>`;
      bottone(t, '🔍', 'Inquadra il settore', () => inquadra(gg));
      if (id && id.ruolo === 'COMANDO')
        bottone(t, '🖨', 'PDF del settore intero', () => stampa(
          schede.filter(s => gg.some(g => g.ID_GRUPPO === s.GRUPPO)), 'Settore ' + nome, gg));
      box.appendChild(t);
      gg.forEach(g => {
        const r = document.createElement('div');
        r.className = 'diff-gruppo';
        r.innerHTML = `<span><b>${esc(g.NOME)}</b><small>${esc(g.N_SCHEDE)} schede</small></span>`;
        bottone(r, '🔍', 'Inquadra il sottosettore', () => inquadra([g]));
        if (id && id.ruolo === 'COMANDO')
          bottone(r, '🖨', 'PDF del sottosettore', () => stampa(
            schede.filter(s => s.GRUPPO === g.ID_GRUPPO), g.NOME, [g]));
        if (modificabile)
          bottone(r, '🗑', 'Elimina il sottosettore', () => eliminaGruppo(g), 'diff-rosso');
        box.appendChild(r);
      });
    });
  }

  /* --------------------------- caricamento --------------------------- */
  function applicaRuolo(){
    const dr = id && id.ruolo === 'DR';
    const cmd = id && id.ruolo === 'COMANDO';
    app.classList.toggle('diff-ruolo-dr', !!dr);
    app.classList.toggle('diff-ruolo-comando', !!cmd);
    /* Il Comando sa chi è: il cartellino compare solo in vista Direzione,
       per ricordare che si guarda tutta la regione in sola lettura, o se
       qualcosa impedisce di lavorare. */
    const cartellino = id && (id.errore || (dr ? `👁 ${id.ente} · sola lettura` : ''));
    $('ente').hidden = !cartellino;
    $('ente').textContent = cartellino || '';
    $('ente').classList.toggle('diff-errore', !!(id && id.errore));
    if (!cmd) $('import').hidden = true;
    const sel = $('selComando');
    sel.innerHTML = '<option value="">Tutti i Comandi</option>';
    if (dr) id.sigle.forEach(sg => {
      const c = id.comandi.find(x => eComandoProvinciale(x) && siglaDi(x) === sg);
      sel.insertAdjacentHTML('beforeend',
        `<option value="${sg}">${esc(c ? c.Comando : sg)} (${sg})</option>`);
    });
    aggiornaPulsanti();
  }

  const emergenzeAttive = () => emergenze.filter(e => e.STATO === 'ATTIVA'
    && (!id || !id.sigla || e.SIGLA === id.sigla));

  function aggiornaPulsanti(){
    const em = emergenzaScelta();
    const possibili = em ? em.STATO === 'ATTIVA' : emergenzeAttive().length > 0;
    $('bGruppo').disabled = !possibili;
    $('bArchivia').disabled = !possibili;
    $('bStampa').disabled = !visibili().length;
    aggiornaVuoto();
  }

  /* Carta vuota: si dice cosa fare, non solo che non c'è niente. */
  function aggiornaVuoto(){
    const box = $('vuoto');
    /* Finché la prima lettura non torna non si sa ancora se ci sono
       emergenze: si dice che si sta guardando, non che non c'è niente. */
    if (id && !id.errore && (!caricato || erroreLettura) && $('import').hidden){
      box.hidden = false;
      box.innerHTML = !caricato
        ? '<b>⏳ Lettura delle emergenze in corso…</b>'
        : `<b>Lettura non riuscita</b><p>${esc(erroreLettura)}</p>
           <button type="button" class="btn-toggle-radar">🔄 Riprova</button>`;
      const b = box.querySelector('button');
      if (b) b.onclick = () => ricarica();
      return;
    }
    const niente = !!id && !id.errore && !schede.length && $('import').hidden;
    box.hidden = !niente;
    if (!niente) return;
    const em = emergenzaScelta();
    if (id.ruolo === 'COMANDO'){
      box.innerHTML = `<b>${em ? 'Nessuna scheda in ' + esc(em.CODEM) : 'Nessuna emergenza in corso'}</b>
        <p>Carica l'export delle schede differibili: le vedrai qui sulla carta.</p>
        <button type="button" class="btn-whatsapp">📥 Carica schede</button>`;
      box.querySelector('button').onclick = () => $('bImporta').click();
    } else {
      box.innerHTML = `<b>Nessuna emergenza in corso</b>
        <p>Qui compaiono le schede differibili caricate dai Comandi della Direzione.</p>`;
    }
  }

  /* Gruppo e archiviazione valgono per UNA emergenza: se è selezionato
     "Tutte", si chiede quale invece di tenere il pulsante spento. */
  async function emergenzaDaUsare(azione){
    const em = emergenzaScelta();
    if (em) return em.STATO === 'ATTIVA' ? em : null;
    const attive = emergenzeAttive();
    if (!attive.length) return null;
    const k = attive.length === 1 ? attive[0].CODEM : await chiedi({
      testo: `Su quale emergenza vuoi ${azione}?`,
      voci: attive.map(e => ({k: e.CODEM, et: e.CODEM, nota: 'in corso dal ' + e.DATA_INIZIO}))});
    if (!k) return null;
    $('selEmergenza').value = k;
    await ricarica(true);
    return emergenzaScelta();
  }

  let vistaDisegnata = null;   // emergenza + ente + archiviate già sulla carta
  async function ricarica(silenzioso){
    if (!id || id.errore) return;
    if (!silenzioso) stato('Aggiornamento…');
    const bA = $('bAggiorna');
    bA.textContent = '⏳ Aggiorna'; bA.disabled = true;
    try {
      const arch = $('archiviate').checked;
      emergenze = await leggiEmergenze(id, arch);
      emergenze.sort((a, b) => String(b.CODEM).slice(-4) + String(b.CODEM).slice(-6, -4) + String(b.CODEM).slice(-8, -6)
        > String(a.CODEM).slice(-4) + String(a.CODEM).slice(-6, -4) + String(a.CODEM).slice(-8, -6) ? 1 : -1);
      const sel = $('selEmergenza'), prima = sel.value;
      sel.innerHTML = `<option value="">${!emergenze.length ? 'Nessuna emergenza in corso' : arch ? 'Tutte le emergenze' : 'Tutte le emergenze in corso'}</option>`
        + emergenze.map(e => `<option value="${esc(e.CODEM)}">${esc(e.CODEM)} · dal ${esc(e.DATA_INIZIO)}`
          + `${e.STATO === 'ARCHIVIATA' ? ' (archiviata)' : ''}</option>`).join('');
      sel.value = emergenze.some(e => e.CODEM === prima) ? prima : '';
      const codem = sel.value || undefined;
      const vista = [id.ente, codem || '', arch].join('|');
      const lette = await leggiSchede(id, codem, emergenze, arch);
      const gr = await leggiGruppi(id, codem, emergenze, arch);
      gruppi = gr;
      /* Stessa vista di prima: solo le differenze, la carta resta dov'è.
         Vista nuova: ridisegno e inquadratura sulle schede. */
      const nuovaVista = vista !== vistaDisegnata;
      if (!nuovaVista) avvisa(aggiornaDifferenze(lette));
      else { schede = lette; disegna(); vistaDisegnata = vista; }
      aggiornaPulsanti();
      if (nuovaVista) inquadra();
      caricato = true; erroreLettura = '';
      aggiornaVuoto();
      stato(`${schede.length} schede · aggiornato alle ${NS.oraBreve ? NS.oraBreve(new Date()) : ''}`);
    } catch(e){
      caricato = true; erroreLettura = e.message;
      aggiornaVuoto();
      stato('Lettura non riuscita: ' + e.message);
    } finally {
      bA.textContent = '🔄 Aggiorna'; bA.disabled = false;
    }
  }

  function inquadra(){
    const p = visibili().filter(conPosizione).map(s => [num(s.LAT), num(s.LON)]);
    if (p.length) map.fitBounds(L.latLngBounds(p), {padding: [30, 30], maxZoom: 15});
  }

  $('bAggiorna').onclick = () => ricarica();
  $('bChiudi').onclick = () => NS.Differibili.chiudi();
  $('archiviate').onchange = () => { $('selEmergenza').value = ''; ricarica(); };
  $('selEmergenza').onchange = () => {
    const e = emergenzaScelta();
    ricarica();
  };
  $('selComando').onchange = () => { disegna(); aggiornaPulsanti(); inquadra(); };

  /* ----------------------------- import ----------------------------- */
  $('bImporta').onclick = () => {
    if (!id || id.ruolo !== 'COMANDO') return;
    $('import').hidden = !$('import').hidden;
    controllaCodem();
    aggiornaVuoto();
  };
  $('bChiudiImport').onclick = () => { $('import').hidden = true; aggiornaVuoto(); };

  function controllaCodem(){
    const v = validaCodem($('codem').value, id);
    $('codem').value = String($('codem').value).toUpperCase().replace(/\s+/g, '');
    $('dataInizio').textContent = v.data ? 'inizio ' + v.data : '';
    const esiste = emergenze.some(e => e.CODEM === v.codem);
    $('codemScelto').textContent = !$('codem').value ? (lettura ? '— da scegliere' : '— scegli prima il file')
      : $('codem').value + (v.codem ? (esiste ? ' (esistente: accodo)' : ' (nuova)') : '');
    $('bCambiaCodem').disabled = !lettura;
    const err = $('codemErrore');
    const mostra = !!$('codem').value;
    err.hidden = !(v.errore && mostra);
    err.textContent = v.errore || '';
    $('codem').classList.toggle('campo-mancante', !!v.errore && mostra);
    const archiviata = emergenze.find(e => e.CODEM === v.codem && e.STATO === 'ARCHIVIATA');
    if (archiviata){ err.hidden = false; err.textContent = 'Emergenza archiviata: non si possono aggiungere schede.'; }
    $('bCarica').disabled = !!v.errore || !!archiviata || !lettura || !lettura.schede.length;
    return v;
  }
  /* Dopo la lettura del file si sceglie l'emergenza: una di quelle in corso
     del Comando, oppure una nuova col suo CODEM. Se il CODEM digitato
     esiste già si associa a quella, senza crearne un doppione. */
  async function scegliEmergenza(){
    const attive = emergenze.filter(e => e.STATO === 'ATTIVA' && e.SIGLA === id.sigla);
    let codem = null;
    if (attive.length){
      const k = await chiedi({testo: `${lettura ? lettura.schede.length + ' schede lette. ' : ''}`
          + 'A quale emergenza le associo?',
        voci: attive.map(e => ({k: e.CODEM, et: e.CODEM,
          nota: `in corso dal ${e.DATA_INIZIO} · le schede nuove si accodano`}))
          .concat([{k: '+', et: '➕ Nuova emergenza', nota: 'inserisci un CODEM nuovo'}])});
      if (!k) return false;
      if (k !== '+') codem = k;
    }
    let errore = '';
    while (!codem){
      const v = await chiedi({campo: 1, ok: 'Usa questo CODEM', segnaposto: 'I1EMI' + id.sigla + 'ggmmaaaa',
        testo: (errore ? errore + '\n\n' : '') + 'CODEM della nuova emergenza (tipologia + '
          + id.sigla + ' + data di inizio ggmmaaaa):'});
      if (v === null) return false;
      const x = validaCodem(v, id);
      if (x.errore){ errore = x.errore; continue; }
      if (emergenze.some(e => e.CODEM === x.codem && e.STATO === 'ARCHIVIATA')){
        errore = x.codem + ' è archiviata: non si possono aggiungere schede.'; continue;
      }
      codem = x.codem;
    }
    $('codem').value = codem;
    controllaCodem();
    mostraAnteprima();
    return true;
  }
  $('bCambiaCodem').onclick = scegliEmergenza;

  function mostraAnteprima(){
    const box = $('anteprima');
    if (!lettura){ box.innerHTML = ''; return; }
    const s = lettura.schede;
    const conPos = s.filter(conPosizione).length;
    const fuori = id && id.sigla ? s.filter(x => x.PROVINCIA && x.PROVINCIA !== id.sigla).length : 0;
    const nonDiff = s.filter(x => x.DIFFERIBILE && x.DIFFERIBILE !== 'S').length;
    const cod = validaCodem($('codem').value, id).codem;
    const gia = cod ? new Set(schede.filter(x => x.CODEM === cod).map(x => x.ID_CONTATTO)) : new Set();
    const nuove = cod ? s.filter(x => !gia.has(x.ID_CONTATTO)).length : null;
    box.innerHTML = `<div class="diff-anteprima">
      <b>${s.length} schede lette</b>${lettura.fonte ? ' da ' + esc(lettura.fonte) : ''}
      <ul>
        <li>${conPos} con posizione${conPos < s.length ? `, ${s.length - conPos} senza (caricate ma non in carta)` : ''}</li>
        ${lettura.riallineate ? `<li>${lettura.riallineate} righe riallineate (POLYLINE spezzato)</li>` : ''}
        ${lettura.dubbie ? `<li class="diff-errore">${lettura.dubbie} righe con campi in eccesso non riallineabili: controlla il file</li>` : ''}
        ${nonDiff ? `<li>${nonDiff} non marcate come differibili</li>` : ''}
        ${fuori ? `<li class="diff-errore">${fuori} di un'altra provincia: il server le scarterà</li>` : ''}
        ${nuove != null && gia.size ? `<li>${nuove} nuove rispetto alle ${gia.size} già presenti in ${esc(cod)}</li>` : ''}
      </ul></div>`;
  }

  async function dopoLettura(promessa, fonte){
    stato('Lettura del file…');
    try {
      lettura = await promessa;
      lettura.fonte = fonte;
      stato(`${lettura.schede.length} schede pronte da caricare.`);
    } catch(e){
      lettura = null;
      stato('File non valido: ' + e.message);
    }
    mostraAnteprima();
    controllaCodem();
    if (lettura) await scegliEmergenza();
  }

  $('file').onchange = ev => {
    const f = ev.target.files[0];
    if (!f) return;
    dopoLettura(leggiFile(f).then(t => /\.json$/i.test(f.name) || /^\s*[\[{]/.test(t)
      ? daJson(t) : daCsv(t)), f.name);
  };
  $('bLink').onclick = () => {
    const l = $('link').value.trim();
    if (l) dopoLettura(daGoogleSheet(l), 'Google Sheet');
  };

  /* CARICAMENTO IN UN COLPO SOLO
     Il POST arriva allo script e viene eseguito: è solo la RISPOSTA che si
     perde nel reindirizzamento di Google. Quindi si spedisce tutto il file
     in un unico POST "no-cors" — la risposta non la si legge nemmeno — e
     l'esito si ricava rileggendo le schede dell'emergenza: prima e dopo.
     Il fetch si chiude quando lo script ha finito, perché il
     reindirizzamento arriva solo a esecuzione conclusa.
     Gli scarti (ID mancante, doppio nel file, altra provincia) si
     calcolano qui con le stesse regole del backend, così il riepilogo resta
     completo anche senza la risposta del server. */
  async function inviaTutto(codem, valide){
    await fetch(URL_BACKEND, {method: 'POST', mode: 'no-cors',
      headers: {'Content-Type': 'text/plain;charset=utf-8'},
      body: JSON.stringify({azione: 'carica', utente: id.utente, codem, campi: CAMPI,
        righe: valide.map(sc => CAMPI.map(k => sc[k] == null ? '' : String(sc[k])))})});
  }
  async function inviaAPacchetti(codem, valide){
    const pac = pacchetti(id, codem, valide);
    for (const [n, p] of pac.entries()){
      stato(`Caricamento ${p.inizio + p.righe.length} di ${valide.length} (invio ${n + 1} di ${pac.length})…`);
      await api(id, 'carica', {codem, campi: CAMPI, righe: p.righe});
    }
  }

  $('bCarica').onclick = async () => {
    const v = controllaCodem();
    if (v.errore || !lettura) return;
    const tutte = lettura.schede;
    $('bCarica').disabled = true;

    const scartate = [], viste = new Set(), valide = [];
    tutte.forEach((sc, n) => {
      const motivo = !sc.ID_CONTATTO ? 'ID_CONTATTO mancante'
        : viste.has(sc.ID_CONTATTO) ? 'ID_CONTATTO doppio nel file'
        : (sc.PROVINCIA && sc.PROVINCIA !== id.sigla) ? `provincia ${sc.PROVINCIA}` : '';
      if (motivo) scartate.push({riga: n + 1, motivo});
      else { viste.add(sc.ID_CONTATTO); valide.push(sc); }
    });
    if (!valide.length){ stato('Nessuna scheda valida da caricare.'); controllaCodem(); return; }

    try {
      stato(`Controllo delle schede già presenti in ${v.codem}…`);
      /* Emergenza nuova: il backend non la conosce ancora e la lettura fallisce. */
      const prima = new Set((await leggiSchede(id, v.codem, [], true).catch(() => []))
        .map(x => String(x.ID_CONTATTO)));
      const attese = valide.filter(x => !prima.has(String(x.ID_CONTATTO))).length;

      stato(`Invio di ${valide.length} schede…`);
      try { await inviaTutto(v.codem, valide); }
      catch(e){ await inviaAPacchetti(v.codem, valide); }   // rete che blocca il POST: si ripiega

      /* Il foglio può mostrare le righe nuove con un attimo di ritardo. */
      let dopo = prima, giri = 0;
      do {
        if (giri) await new Promise(ok => setTimeout(ok, 1500));
        stato(`Verifica del caricamento${giri ? ' (' + (giri + 1) + ')' : ''}…`);
        dopo = new Set((await leggiSchede(id, v.codem, [], true)).map(x => String(x.ID_CONTATTO)));
      } while (++giri < 6 && [...dopo].filter(x => !prima.has(x)).length < attese);
      const nuove = [...dopo].filter(x => !prima.has(x)).length;

      lettura = null;
      $('file').value = ''; $('link').value = ''; $('codem').value = '';
      mostraAnteprima();
      $('import').hidden = true;
      await ricarica(true);
      $('selEmergenza').value = v.codem;
      await ricarica(true);
      inquadra();
      stato(`${v.codem}: ${nuove} nuove, ${valide.length - attese} già presenti`
        + (nuove < attese ? ` — ${attese - nuove} non ancora visibili: premi Aggiorna tra poco` : '')
        + (scartate.length ? `, ${scartate.length} scartate (${scartate.slice(0, 3)
          .map(x => 'riga ' + x.riga + ': ' + x.motivo).join('; ')}${scartate.length > 3 ? '…' : ''})` : '') + '.');
    } catch(e){
      stato('Caricamento interrotto: ' + e.message + ' — ricaricando il file si accodano le mancanti.');
    }
    controllaCodem();
  };

  /* ----------------------------- gruppi ----------------------------- */
  /* Lo snap aggancia i vertici ai perimetri dei gruppi già disegnati: due
     sottosettori confinanti condividono il bordo invece di lasciare una
     striscia di schede che non appartiene a nessuno o a entrambi. */
  map.pm.setGlobalOptions({snappable: true, snapDistance: 22});
  const guida = t => { $('guida').hidden = !t; $('guida').textContent = t || ''; };
  $('bGruppo').onclick = async () => {
    const em = await emergenzaDaUsare('creare il settore');
    if (!em) return;
    occupato = true;
    map.closePopup();
    guida('Disegna il perimetro: un clic per ogni vertice, doppio clic o tasto destro per chiudere. I vertici si agganciano ai settori vicini. Esc annulla.');
    /* Il poligono si chiude da sé: doppio clic sull'ultimo vertice, oppure
       tasto destro, senza dover tornare a centrare il primo punto. */
    map.pm.enableDraw('Polygon', {pathOptions: {color: '#e53935', weight: 2.5, fillOpacity: .08},
      continueDrawing: false, finishOn: 'dblclick'});
    stato('Disegna il poligono: clic sui vertici, clic sul primo per chiudere. Esc annulla.');
  };
  map.on('pm:drawend', () => { occupato = false; guida(''); });
  /* Tasto destro durante il disegno: chiude il poligono con i vertici già
     posati (almeno tre), come il doppio clic. _finishShape è interno a
     Geoman ma è l'unico modo di chiudere da codice. */
  map.getContainer().addEventListener('contextmenu', ev => {
    if (!(map.pm.globalDrawModeEnabled && map.pm.globalDrawModeEnabled())) return;
    ev.preventDefault(); ev.stopPropagation();
    const h = map.pm.Draw && map.pm.Draw.Polygon;
    const v = h && h._layer && h._layer.getLatLngs ? h._layer.getLatLngs() : [];
    if (v.length >= 3 && typeof h._finishShape === 'function') h._finishShape();
    else { map.pm.disableDraw(); stato('Perimetro annullato: servono almeno tre vertici.'); }
  }, true);

  map.on('pm:create', async e => {
    const poli = e.layer;
    const anello = poli.getLatLngs()[0];
    const geo = poli.toGeoJSON();
    map.removeLayer(poli);
    const em = emergenzaScelta();
    const presi = visibili().filter(s => s.CODEM === em.CODEM && conPosizione(s)
      && dentro(num(s.LAT), num(s.LON), anello));
    if (!presi.length) return stato('Nessuna scheda dentro il poligono.');
    const altrove = presi.filter(s => s.GRUPPO).length;
    /* Settori esistenti di questa emergenza, col prossimo numero libero. */
    const esistenti = new Map();
    gruppi.filter(g => g.CODEM === em.CODEM).forEach(g => {
      const x = settoreDi(g);
      esistenti.set(x.settore, Math.max(esistenti.get(x.settore) || 0, x.n));
    });
    const nuovo = SETTORI.find(n => !esistenti.has(n)) || 'Settore ' + (esistenti.size + 1);
    const voci = [...esistenti].map(([n, max]) => ({k: n, et: `${n} ${max + 1}`,
      nota: `nuovo sottosettore del settore ${n}`}))
      .concat([{k: '+' + nuovo, et: `${nuovo} 1`, nota: 'nuovo settore'}]);
    const k = await chiedi({voci, testo: `${presi.length} schede nel perimetro`
      + (altrove ? `, di cui ${altrove} già in un altro sottosettore: passano a questo.` : '.')
      + '\nIn quale settore?'});
    if (!k) return stato('Settore annullato.');
    const settore = k[0] === '+' ? k.slice(1) : k;
    const nome = `${settore} ${(esistenti.get(settore) || 0) + 1}`;
    const colore = coloreSettore(settore);
    stato(`Salvataggio di ${nome}…`);
    try {
      /* Come il caricamento: in GET un settore grande (centinaia di ID più
         il perimetro) supera la lunghezza massima dell'indirizzo e viene
         rifiutato. Si spedisce in POST senza leggere la risposta, poi si
         controlla che il settore ci sia. */
      await fetch(URL_BACKEND, {method: 'POST', mode: 'no-cors',
        headers: {'Content-Type': 'text/plain;charset=utf-8'},
        body: JSON.stringify({azione: 'salvaGruppo', utente: id.utente, codem: em.CODEM, nome, colore,
          geojson: geo, idContatti: presi.map(s => s.ID_CONTATTO)})});
      let ok = false;
      for (let g = 0; g < 5 && !ok; g++){
        if (g) await new Promise(r => setTimeout(r, 1500));
        await ricarica(true);
        ok = gruppi.some(x => x.CODEM === em.CODEM && x.NOME === nome);
      }
      stato(ok ? `${nome} creato con ${presi.length} schede.`
        : `${nome} inviato ma non ancora visibile: premi Aggiorna tra qualche secondo.`);
    } catch(err){ stato(`${nome} non salvato: ` + err.message); }
  });

  async function eliminaGruppo(g){
    if (!await chiedi({testo: `Eliminare il sottosettore ${g.NOME}?\nLe ${g.N_SCHEDE} schede restano e tornano senza settore.`,
      ok: 'Elimina', rosso: 1})) return;
    try {
      await api(id, 'eliminaGruppo', {codem: g.CODEM, idGruppo: g.ID_GRUPPO});
      await ricarica(true);
      stato(`Gruppo "${g.NOME}" eliminato.`);
    } catch(e){ stato('Eliminazione non riuscita: ' + e.message); }
  }

  /* --------------------------- archiviazione --------------------------- */
  $('bArchivia').onclick = async () => {
    const em = await emergenzaDaUsare('archiviare');
    if (!em) return;
    if (!await chiedi({ok: 'Archivia', rosso: 1, testo: `Archiviare ${em.CODEM}?\n`
      + 'Sparisce dalle emergenze in corso, anche per la Direzione. Le schede restano '
      + 'consultabili con "Archiviate", ma non si potranno più aggiungere schede né gruppi.'})) return;
    try {
      await api(id, 'archivia', {codem: em.CODEM});
      $('selEmergenza').value = '';
      await ricarica();
      stato(`${em.CODEM} archiviata.`);
    } catch(e){ stato('Archiviazione non riuscita: ' + e.message); }
  };

  /* ------------------------------ stampa ------------------------------ */
  /* Come in SITAC: la mappa viva si sposta nel foglio e poi torna dov'era.
     Sulla carta stampata i marcatori diventano numeri, e lo stesso numero
     apre la riga in tabella: la squadra legge la carta e trova la scheda. */
  $('bStampa').onclick = () => {
    const em = emergenzaScelta();
    stampa(visibili(), em ? em.CODEM : 'Vista corrente', null);
  };

  const attendiTile = ms => new Promise(ok => {
    let fatto = false;
    const fine = () => { if (!fatto){ fatto = true; ok(); } };
    sfondi[iSfondo].l.once('load', fine);
    setTimeout(fine, ms);
  });

  async function stampa(lista, titolo, gruppo){
    if (!id || id.ruolo !== 'COMANDO') return;
    if (!lista.length) return stato('Nessuna scheda da stampare.');
    occupato = true;
    map.closePopup();
    const ord = lista.slice().sort((a, b) =>
      (a.CITTA || '').localeCompare(b.CITTA || '', 'it')
      || (a.INDIRIZZO || '').localeCompare(b.INDIRIZZO || '', 'it')
      || (parseInt(a.CIVICO, 10) || 0) - (parseInt(b.CIVICO, 10) || 0));
    const quando = new Date().toLocaleString('it-IT', {timeZone: 'Europe/Rome'});
    const righe = ord.map((s, i) => `<tr>
      <td class="dp-n"><span style="background:${categoria(s).c}">${i + 1}</span></td>
      <td>${esc(categoria(s).n)}</td>
      <td>${esc(indirizzo(s))}</td>
      <td>${esc(s.CITTA)}${s.DISTRETTO ? '<br><small>' + esc(s.DISTRETTO) + '</small>' : ''}</td>
      <td>${esc(s.ADD_INFO)}</td>
      <td>${esc(chiamante(s))}</td>
      <td>${esc(s.CLI)}</td>
      <td>${esc(s.DATA_INS)}</td>
      <td>${s.RMAX ? '±' + esc(Math.round(num(s.RMAX))) + ' m' : '—'}</td>
      <td>${esc(s.ID_CONTATTO)}</td></tr>`).join('');
    const doc = document.createElement('div');
    doc.id = 'diff-stampa-doc';
    doc.innerHTML = `
      <section class="dp-pagina dp-pagina-carta">
        <header class="dp-testata"><h1>Schede differibili — ${esc(titolo)}</h1>
          <p>${esc(id.ente)} · ${esc(ord[0].CODEM)} · ${ord.length} schede · stampato il ${esc(quando)}</p></header>
        <div class="dp-mappa"></div>
      </section>
      <section class="dp-pagina dp-pagina-tab">
        <header class="dp-testata"><h1>Elenco schede — ${esc(titolo)}</h1>
          <p>${esc(ord[0].CODEM)} · ordinate per comune e indirizzo</p></header>
        <table class="dp-tab"><thead><tr><th>N.</th><th>Triage</th><th>Indirizzo</th><th>Comune</th>
          <th>Note</th><th>Chiamante</th><th>Telefono</th><th>Inserita</th><th>Precisione</th><th>Contatto</th>
        </tr></thead><tbody>${righe}</tbody></table>
      </section>`;
    document.body.appendChild(doc);

    const wrap = app.querySelector('.diff-mapwrap');
    const segno = document.createComment('diff-mappa');
    wrap.parentNode.insertBefore(segno, wrap);
    doc.querySelector('.dp-mappa').appendChild(wrap);
    document.body.classList.add('diff-stampa');
    const altezzaPrima = wrap.style.height;
    wrap.style.height = '';

    [livSchede, livAree, livScelta, livGruppi].forEach(l => map.removeLayer(l));
    const tmp = L.featureGroup().addTo(map);
    const gg = [].concat(gruppo || []).filter(g => g && g.GEOJSON);
    gg.forEach(g => {
      const l = L.geoJSON(g.GEOJSON, {style: {color: g.COLORE, weight: 3, fillOpacity: .05}}).addTo(tmp);
      const c = l.getBounds();
      if (gg.length > 1 && c.isValid()) L.marker(c.getCenter(), {interactive: false,
        icon: L.divIcon({className: 'diff-etichetta-gruppo', iconSize: null,
          html: `<span style="border-color:${esc(g.COLORE)}">${esc(g.NOME)}</span>`})}).addTo(tmp);
    });
    const vista = {c: map.getCenter(), z: map.getZoom()};
    /* Il foglio di stampa a schermo è nascosto, e una carta nascosta misura
       zero: l'inquadratura veniva calcolata su un riquadro vuoto e in stampa
       la carta usciva spostata in alto. Durante la preparazione il foglio
       esiste fuori schermo con le misure dell'A4 (classe diff-prep), così
       fitBounds lavora sulle dimensioni vere della carta stampata. */
    document.body.classList.add('diff-prep');
    map.invalidateSize({animate: false});
    const punti = ord.filter(conPosizione).map(s => [num(s.LAT), num(s.LON)]);
    let b = null;
    gg.forEach(g => {
      const gb = L.geoJSON(g.GEOJSON).getBounds();
      if (gb.isValid()) b = b ? b.extend(gb) : L.latLngBounds(gb.getSouthWest(), gb.getNorthEast());
    });
    if (!b && punti.length) b = L.latLngBounds(punti);
    /* Settore: si centra sul suo perimetro. Stampa generale: sull'estensione
       di tutte le schede stampate. */
    if (b && b.isValid()) map.fitBounds(b, {padding: [30, 30], maxZoom: 17, animate: false});
    /* I numeri si posano DOPO l'inquadratura: la corona dei punti
       sovrapposti è in pixel, e va calcolata allo zoom della stampa. Nella
       corona i numeri sono più larghi dei pallini, quindi il raggio cresce. */
    const pile = new Map();
    ord.forEach((s, i) => {
      if (!conPosizione(s)) return;
      const k = chiavePunto(s);
      if (!pile.has(k)) pile.set(k, []);
      pile.get(k).push([s, i]);
    });
    pile.forEach(el => el.forEach(([s, i], j) => {
      const n = el.length;
      let pos = L.latLng(num(s.LAT), num(s.LON));
      if (n > 1){
        const p = map.latLngToLayerPoint(pos), r = 14 + Math.max(0, n - 5) * 3;
        const a = 2 * Math.PI * j / n - Math.PI / 2;
        pos = map.layerPointToLatLng(L.point(p.x + r * Math.cos(a), p.y + r * Math.sin(a)));
      }
      L.marker(pos, {interactive: false, icon: L.divIcon({className: 'diff-num',
        html: `<span style="background:${categoria(s).c}">${i + 1}</span>`,
        iconSize: [22, 22], iconAnchor: [11, 11]})}).addTo(tmp);
    }));
    await attendiTile(2500);

    const titoloPrima = document.title;
    document.title = ['Differibili', ord[0].CODEM, titolo.replace(/[^A-Za-z0-9]+/g, '-')].join('_');
    const ripristina = () => {
      window.removeEventListener('afterprint', ripristina);
      document.title = titoloPrima;
      document.body.classList.remove('diff-stampa', 'diff-prep');
      segno.parentNode.insertBefore(wrap, segno);
      wrap.style.height = altezzaPrima;
      segno.remove();
      doc.remove();
      map.removeLayer(tmp);
      [livGruppi, livAree, livSchede, livScelta].forEach(l => map.addLayer(l));
      occupato = false;
      setTimeout(() => { map.invalidateSize(); map.setView(vista.c, vista.z); }, 60);
    };
    window.addEventListener('afterprint', ripristina);
    window.print();
  }

  /* ------------------------------ avvio ------------------------------ */
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape' || app.offsetParent === null || !$('modale').hidden) return;
    if (map.pm.globalDrawModeEnabled && map.pm.globalDrawModeEnabled()){
      map.pm.disableDraw(); occupato = false; guida(''); stato('Disegno annullato.');
    }
  });

  async function identifica(){
    id = await identita();
    applicaRuolo();
    if (id.errore){ schede = []; gruppi = []; emergenze = []; disegna(); stato(id.errore); return; }
    const c = centroComando();
    if (c && !schede.length) map.setView(c, 11);
    aggiornaVuoto();
    ricarica();
  }
  document.addEventListener('fireops:comando-attivo-cambiato', identifica);
  $('vistaDR').checked = vistaDR();
  $('vistaDR').onchange = () => {
    try { sessionStorage.setItem(CHIAVE_VISTA_DR, $('vistaDR').checked ? '1' : '0'); } catch(e){}
    $('selEmergenza').value = ''; $('selComando').value = '';
    identifica();
  };

  /* La DR segue le emergenze mentre i Comandi caricano: si rilegge ogni due
     minuti, ma solo con la sezione a schermo e nessun lavoro in corso. */
  setInterval(() => {
    if (app.offsetParent !== null && !occupato && $('modale').hidden && $('import').hidden)
      ricarica(true);
  }, RIFRESCO_MS);

  identifica();

  /* La carta arriva fino in fondo alla finestra, meno la riga di stato:
     l'altezza si misura sul posto invece di indovinarla in CSS, perché
     testata, sottotestata e barra cambiano con la larghezza. */
  function adattaAltezza(){
    const w = app.querySelector('.diff-mapwrap');
    if (!w || app.offsetParent === null || document.body.classList.contains('diff-stampa')) return;
    const h = Math.max(320, Math.floor(window.innerHeight - w.getBoundingClientRect().top - 44));
    w.style.height = h + 'px';
    app.querySelector('.diff-lato').style.maxHeight = h + 'px';
    map.invalidateSize();
  }
  window.addEventListener('resize', adattaAltezza);
  setTimeout(adattaAltezza, 150);

  return {
    ridisegna(){ if (app.offsetParent !== null){ adattaAltezza(); map.invalidateSize(); } },
    ricarica,
    map
  };
}

/* ------------------------------ avvio ------------------------------ */
let istanza = null;
NS.Differibili = {
  init(){
    if (istanza){ istanza.ridisegna(); return istanza; }
    const sezione = document.getElementById('differibili');
    if (!sezione || !sezione.querySelector('#diff-app')) return null;
    if (typeof L === 'undefined' || !L.PM){
      console.error('[Differibili] Leaflet o Geoman non caricati.');
      return null;
    }
    istanza = avvia(sezione);
    return istanza;
  },
  get(){ return istanza; },
  /* esposti per i test e per il futuro FireOps Triage da campo */
  _daCsv: daCsv, _validaCodem: validaCodem
};

/* Stesso aggancio della SITAC: la sezione viaggia fra pannelli e magazzino,
   e Leaflet va costruito — o rimisurato — quando torna a schermo. */
function agganciaPannelli(){
  const sezione = document.getElementById('differibili');
  if (!sezione) return;
  /* Come la SITAC, la sezione vive solo a schermo intero: non si riduce,
     si chiude. Il pulsante Espandi della sezione resta nascosto (CSS) e lo
     si preme da qui ogni volta che la sezione è a schermo senza esserlo.
     "Chiudi" riduce e rimette nel pannello la pagina di ripiego di
     schede-bis.js; durante la chiusura la riespansione è sospesa. */
  let chiudendo = false;
  const espansa = () => !!sezione.closest('.pannello-fullscreen')
    || sezione.classList.contains('pannello-fullscreen');
  const pulsante = () => sezione.querySelector('.btn-fullscreen-pagina');
  const espandi = () => setTimeout(() => {
    const b = pulsante();
    if (!chiudendo && b && sezione.offsetParent !== null && !espansa()) b.click();
  }, 60);
  NS.Differibili.chiudi = () => {
    const pan = sezione.closest('.pannello');
    const lato = pan ? pan.id.replace('pannello-', '') : null;
    chiudendo = true;
    const b = pulsante();
    if (b && espansa()) b.click();
    setTimeout(() => {
      const sel = lato && document.getElementById('select-pannello-' + lato);
      const rip = ((window.FireOpsSchede || {}).ripiego || {})[lato];
      if (sel && rip){ sel.value = rip; sel.dispatchEvent(new Event('change', {bubbles: true})); }
      setTimeout(() => { chiudendo = false; }, 200);
    }, 80);
  };
  const risveglia = () => {
    if (sezione.offsetParent === null) return;
    espandi();
    const i = NS.Differibili.init();
    if (i) i.ridisegna();
  };
  ['corpo-sinistra', 'corpo-destra'].forEach(x => {
    const c = document.getElementById(x);
    if (c) new MutationObserver(risveglia).observe(c, {childList: true});
  });
  if (window.ResizeObserver) new ResizeObserver(() => {
    const i = NS.Differibili.get();
    if (i) i.ridisegna();
  }).observe(sezione);
  risveglia();
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', agganciaPannelli);
else agganciaPannelli();

})();