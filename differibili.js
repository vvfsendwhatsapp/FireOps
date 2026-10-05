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

const URL_BACKEND = 'https://script.google.com/macros/s/AKfycbwA2AkQyC8eQGn6ykJbmIvcuyumt_TcU9Ek15CgKIk1A1C7z6vJqYwbXOaaTEHyBe78KA/exec';

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
   è uguale per tutte le differibili e non dice niente, quindi si toglie. */
/* PRIORITÀ: una differibile che parla di persone o di soccorso non è una
   differibile come le altre. Si guarda la tipologia e le note brevi
   (ADD_INFO); il controllo è sulla parola intera. */
/* Parole che rendono una differibile prioritaria: persone coinvolte,
   soccorso, fuoco, gas. Si cercano come parole intere nella tipologia e
   nelle note brevi. Stessa lista in differibili.js e differibili-campo.html. */
const RE_PRIORITA = /\b(persona|persone|soccorso|ferit[oaie]|intrappolat[oaie]|incendi[oa]?|fuoco|fiamme|fumo|esplosion[ei]|fuga\s+(di\s+)?gas|odore\s+(di\s+)?gas|gas)\b/i;
const prioritaria = s => RE_PRIORITA.test([s.DESCRIZIONE_TRIAGE, s.ADD_INFO].filter(Boolean).join(' '));

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
  let h = 0;
  for (const ch of desc) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const noto = COLORI_NOTI.find(x => x.re.test(desc));
  const c = !desc ? '#9e9e9e' : noto ? noto.c : COLORI_TIPO[h % COLORI_TIPO.length];
  const n = desc || 'Tipologia non indicata';
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
/* TRE LIVELLI
   Settore geografico generale (Alfa, Bravo…) → Worksite specifico (1, 2…)
   → Sotto-settore (a, b…). Si disegna solo il sotto-settore; worksite e
   settore sono l'insieme dei loro figli. Nel foglio il NOME è il codice
   radio "A2b": iniziale del settore, numero del worksite, lettera del
   sotto-settore. Le iniziali dell'alfabeto NATO sono tutte diverse, quindi
   dall'iniziale si risale al settore. I nomi dei formati precedenti
   ("Alfa 2.3", "Bravo 2") si leggono come A2c e B1b. */
const lettera = n => { let t = ''; for (; n > 0; n = Math.floor((n - 1) / 26)) t = String.fromCharCode(97 + (n - 1) % 26) + t; return t; };
const daLettera = t => [...t].reduce((a, c) => a * 26 + (c.charCodeAt(0) - 96), 0);
const inizialeDi = settore => String(settore).charAt(0).toUpperCase();
const settoreDaIniziale = c => SETTORI.find(n => n.charAt(0) === c) || c;
function livelli(g){
  const n = String(g.NOME || '').trim();
  let m = /^([A-Z])(\d+)([a-z]+)$/.exec(n);
  if (m) return {settore: settoreDaIniziale(m[1]), ws: +m[2], ss: daLettera(m[3])};
  m = /^(.+?)\s+(\d+)\.(\d+)$/.exec(n);
  if (m) return {settore: m[1], ws: +m[2], ss: +m[3]};
  m = /^(.+?)\s+(\d+)$/.exec(n);
  if (m) return {settore: m[1], ws: 1, ss: +m[2]};
  return {settore: n || '—', ws: 1, ss: 1};
}
const codiceWs = (settore, ws) => `${inizialeDi(settore)}${ws}`;
const nomeSS = (settore, ws, ss) => `${codiceWs(settore, ws)}${lettera(ss)}`;
/* Etichetta da mostrare: il codice anche per i nomi vecchi. */
const codiceDi = g => { const x = livelli(g); return nomeSS(x.settore, x.ws, x.ss); };
const ordineSettore = x => { const i = SETTORI.indexOf(x); return i < 0 ? 99 : i; };


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
const LETTURE = new Set(['emergenze', 'schede', 'gruppi', 'punti', 'valutazioni', 'dettaglio', 'leggiFoto']);

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

/* Nessuna richiesta può restare appesa: la coda è una sola, e una chiamata
   che non torna mai fermava tutte quelle dopo — è il "si blocca". */
const ATTESA_MAX = 25000;
async function fetchConTempo(url, opz){
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), ATTESA_MAX);
  try { return await fetch(url, Object.assign({}, opz, {signal: ac.signal})); }
  catch(e){
    /* "Failed to fetch" da solo non dice niente: si aggiunge DA DOVE.
       Foglio → di solito non è condiviso "chiunque abbia il link" (Google
       risponde con la pagina di accesso, senza permessi CORS).
       Apps Script → di solito una versione pubblicata che va in errore o
       chiede un'autorizzazione: anche lì la risposta è una pagina HTML. */
    if (e.name === 'AbortError') throw new Error('nessuna risposta in ' + ATTESA_MAX / 1000 + ' s');
    const da = /docs\.google\.com/.test(url) ? 'foglio Google: controlla che sia condiviso "chiunque abbia il link"'
      : /script\.google/.test(url) ? 'Apps Script: controlla le Esecuzioni e che il deployment sia pubblicato'
      : new URL(url).host;
    throw new Error(`${e.message} — ${da}`);
  }
  finally { clearTimeout(t); }
}

function api(id, azione, dati){
  const esegui = async () => {
    const tentativi = LETTURE.has(azione) ? 2 : 1;
    let ultimo;
    for (let t = 0; t < tentativi; t++){
      if (t) await new Promise(ok => setTimeout(ok, 1200));
      try {
        const r = await fetchConTempo(urlRichiesta(id, azione, dati), {cache: 'no-store'});
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
  const r = await fetchConTempo(u, {cache: 'no-store'});
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
/* LETTURA A DUE LIVELLI
   Per la carta bastano posizione, tipologia, settore e poco altro: sono
   CAMPI_PUNTI, un quinto del peso della scheda intera (le note AREU e i
   poligoni di localizzazione sono la parte grossa). Il resto — chiamante,
   telefono, indirizzo, note, poligono — si chiede per la singola scheda
   quando la si apre o col tasto destro, e resta in memoria. Per la stampa
   si leggono intere le sole schede da stampare. */
const CAMPI_PUNTI = ['CODEM', 'ID_CONTATTO', 'ALTROENTE_IDSCHEDA', 'CITTA', 'LAT', 'LON',
  'SHAPE', 'RMAX', 'RMIN', 'ANGOLO', 'DATA_INS', 'DESCRIZIONE_TRIAGE', 'DIFFERIBILE', 'GRUPPO', 'ADD_INFO'];
/* Lettere delle stesse colonne nel foglio Schede (A=CODEM, poi CAMPI, poi servizio). */
const COLONNE_PUNTI = 'A, B, C, K, L, O, P, Q, R, S, T, V, W, X, Z';
const daRighe = r => (r && r.righe) ? r.righe.map(v => {
  const o = {}; r.campi.forEach((k, i) => { o[k] = v[i] == null ? '' : String(v[i]); }); return o;
}) : (r || []);

/* Backend pubblicato più vecchio, senza "punti": si legge la scheda intera
   come prima. Più lento, ma funziona finché non si pubblica il .gs nuovo. */
let backendSenzaPunti = false;
async function leggiSchede(id, codem, emergenze, arch){
  if (!ID_FOGLIO){
    if (!backendSenzaPunti){
      try { return daRighe(await api(id, 'punti', {codem, includiArchiviate: arch})); }
      catch(e){ if (!/Azione non valida/.test(e.message)) throw e; backendSenzaPunti = true; }
    }
    const r = await api(id, 'schede', {codem, includiArchiviate: arch});
    r.forEach(x => { delete x.HASH; });
    return r;
  }
  const elenco = codem ? [codem] : emergenze.map(e => e.CODEM);
  if (!elenco.length) return [];
  return gviz('Schede', `select ${COLONNE_PUNTI} where A matches '${alternanza(elenco)}'`);
}
async function leggiSchedeComplete(id, codem){
  const r = ID_FOGLIO ? await gviz('Schede', `select * where A = '${alternanza([codem])}'`)
    : await api(id, 'schede', {codem, includiArchiviate: true});
  r.forEach(s => { delete s.HASH; });
  return r;
}
const dettagli = new Map();          // CODEM|ID -> scheda intera
async function leggiDettaglio(id, s){
  const k = s.CODEM + '|' + s.ID_CONTATTO;
  if (dettagli.has(k)) return dettagli.get(k);
  if ('NOME' in s) return s;        // già intera (backend senza "punti")
  let d;
  if (ID_FOGLIO){
    const r = await gviz('Schede', `select * where A = '${alternanza([s.CODEM])}' and B = '${alternanza([s.ID_CONTATTO])}'`);
    d = r[0];
  } else d = await api(id, 'dettaglio', {codem: s.CODEM, idContatto: s.ID_CONTATTO});
  if (!d) throw new Error('scheda non trovata');
  delete d.HASH;
  d = Object.assign({}, s, d);
  /* la scheda intera ha le coordinate del NUE: se il campo le ha corrette,
     valgono quelle corrette */
  if (s.LAT_NUE) Object.assign(d, {LAT: s.LAT, LON: s.LON, LAT_NUE: s.LAT_NUE, LON_NUE: s.LON_NUE});
  dettagli.set(k, d);
  return d;
}
/* Valutazioni dal campo (differibili-assessment.js). Foglio non ancora
   creato o backend vecchio: nessuna valutazione, senza errore. */
const FA = () => (window.FireOps && window.FireOps.Assessment) || null;
/* differibili-assessment.js serve anche qui: senza, le valutazioni non si
   leggono e la Sala non le mostra. Se index-bis.html non lo carica (manca in
   MODULI) lo si carica da qui, dalla stessa cartella e con la stessa
   versione di questo file. */
const assessmentPronto = new Promise(ok => {
  if (FA()) return ok(true);
  const io = [...document.scripts].find(x => /differibili\.js(\?|$)/.test(x.src));
  const v = io && /\?v=([^&]+)/.exec(io.src);
  const sc = document.createElement('script');
  sc.src = 'differibili-assessment.js' + (v ? '?v=' + v[1] : '');
  sc.onload = () => ok(!!FA());
  sc.onerror = () => { console.warn('[Differibili] differibili-assessment.js non trovato'); ok(false); };
  document.head.appendChild(sc);
});
let avvisoValutazioni = '';
async function leggiValutazioni(id, codem, emergenze, arch){
  await assessmentPronto;
  try {
    if (!ID_FOGLIO) return await api(id, 'valutazioni', {codem, includiArchiviate: arch});
    const elenco = codem ? [codem] : emergenze.map(e => e.CODEM);
    if (!elenco.length) return [];
    const r = await gviz('Assessment', `select * where B matches '${alternanza(elenco)}'`);
    r.forEach(v => { try { v.DETTAGLI = JSON.parse(v.DETTAGLI || '{}'); } catch(e){ v.DETTAGLI = {}; } });
    avvisoValutazioni = '';
    return r;
  } catch(e){
    /* Foglio Assessment non ancora creato: normale, nessun avviso.
       Qualsiasi altro errore si dice, invece di sparire in silenzio. */
    avvisoValutazioni = /Assessment|non leggibile|Nessuna valutazione/i.test(e.message) && ID_FOGLIO ? ''
      : 'Valutazioni non lette: ' + e.message;
    if (avvisoValutazioni) console.warn('[Differibili]', avvisoValutazioni);
    return [];
  }
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
  /* Ordine dei livelli: perimetri dei settori sotto, schede sopra. */
  map.createPane('diffGruppi').style.zIndex = 390;
  map.createPane('diffSchede').style.zIndex = 450;
  map.createPane('diffEtichette').style.zIndex = 620;
  const tela = L.canvas({padding: .5, pane: 'diffSchede'});
  const livGruppi = L.featureGroup().addTo(map);
  const livAree = L.layerGroup().addTo(map);
  const livSchede = L.layerGroup().addTo(map);
  const livScelta = L.layerGroup().addTo(map);
  const livCluster = L.layerGroup().addTo(map);   // badge dei punti aggregati
  const livPriorita = L.layerGroup().addTo(map);  // aloni rossi delle schede con persone
  const livValutate = L.layerGroup().addTo(map);  // badge di priorità delle schede valutate

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

  /* Una scheda valutata "duplicato" dal campo sparisce dalla carta e dai
     conteggi della Sala: la situazione è già in un'altra scheda. */
  const duplicata = s => !!(s.VAL && s.VAL.ESITO === 'duplicato');
  function visibili(){
    const sig = $('selComando').value;
    return schede.filter(s => !duplicata(s) && !nascoste.has(categoria(s).k)
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
      ${prioritaria(s) ? '<span class="diff-badge">⚠ PERSONE / SOCCORSO</span>' : ''}
      ${s.DIFFERIBILE && s.DIFFERIBILE !== 'S' ? '<span class="diff-badge">non differibile</span>' : ''}
      <div>${esc(indirizzo(s))}</div>
      <div>${esc(s.CITTA)}${s.DISTRETTO ? ' — ' + esc(s.DISTRETTO) : ''}</div>
      ${s.ADD_INFO ? `<div class="diff-pop-note">${esc(s.ADD_INFO)}</div>` : ''}
      <div class="diff-pop-dati">
        <span>Inserita ${esc(s.DATA_INS)}</span>
        ${s.LAT_NUE ? '<span>📍 posizione corretta dal campo</span>'
          : s.RMAX ? `<span>precisione ±${esc(Math.round(num(s.RMAX)))} m</span>` : ''}
        <span>${esc(chiamante(s))}${s.CLI ? ' · <a href="#" class="diff-cli">' + esc(s.CLI) + '</a>' : ''}</span>
        <span>Contatto ${esc(s.ID_CONTATTO)} · scheda NUE ${esc(s.ALTROENTE_IDSCHEDA)}${stessa > 1 ? ` (${stessa} chiamate)` : ''}</span>
        <span>${esc(s.CODEM)}${g ? ' · <b>' + esc(codiceDi(g)) + '</b>' : ''}</span>
      </div>
      ${valutazioneHtml(s)}
      ${valutabileDaSala(s) ? '<a href="#" class="diff-valuta-sala">📝 Valuta dalla Sala</a><br>' : ''}
      <a href="https://www.google.com/maps?q=${la},${lo}" target="_blank" rel="noopener">Apri in Google Maps</a>
    </div>`;
  }

  function valutazioneHtml(s){
    const v = s.VAL, A = FA();
    if (!v || !A) return '';
    const p = +v.PRIORITA || 0;
    return `<div class="diff-pop-val" style="border-color:${A.COLORI[p]}">
      <b>${esc(A.tipo(v.TIPO).ic + ' ' + A.tipo(v.TIPO).n)}</b>
      <span style="color:${A.COLORI[p]}">${A.stelle(p)} ${esc(A.PRIORITA[p])}</span>
      <span>${esc(A.esito(v.ESITO))} · ${esc(A.ora(v.TS))}</span>
      <span>👤 <b>${esc(v.NOMINATIVO || '—')}</b>${v.SQUADRA ? ' · ' + esc(v.SQUADRA) : ''}</span>
      ${A.dettagli(v).map(([k, x]) => `<span>${esc(k)}: <b>${esc(x)}</b></span>`).join('')}
      ${v.NOTE ? `<i>${esc(v.NOTE)}</i>` : ''}
      ${v.FOTO_ID ? `<div class="diff-foto" data-codem="${esc(v.CODEM)}" data-ass="${esc(v.ID_ASS)}">📷 caricamento della foto…</div>` : ''}
      ${sbloccabile(s) ? '<a href="#" class="diff-sblocca">🔓 Sblocca: il campo potrà rivalutarla</a>' : ''}</div>`;
  }
  /* VALUTAZIONE DIRETTA DALLA SALA
     Per le schede prioritarie (persone, soccorso, fuoco, gas) la Sala può
     compilare la valutazione senza aspettare il campo: stesso modulo e
     stesse regole (tipo, campi, enti, priorità, esito), firmata col
     nominativo dell'operatore. Vale una volta sola, come dal campo. */
  const valutabileDaSala = s => !!(FA() && !s.VAL && prioritaria(s) && id && id.ruolo === 'COMANDO'
    && (emergenze.find(e => e.CODEM === s.CODEM) || {}).STATO === 'ATTIVA');
  let boxVal = null;
  function valutaDaSala(s){
    const A = FA();
    if (!A) return;
    if (!boxVal){
      boxVal = document.createElement('div');
      boxVal.className = 'diff-modale';
      boxVal.innerHTML = `<div class="diff-modale-box diff-vsala">
        <div class="diff-modale-titolo">📝 Valutazione dalla Sala</div>
        <div class="diff-vsala-scheda"></div>
        <label>Esito<select data-f="esito"></select></label>
        <div data-blocco="tipo"><span class="diff-vsala-lab">Tipo</span><div class="diff-vsala-scelte" data-f="tipi"></div></div>
        <div data-f="campi"></div>
        <div data-blocco="prio"><span class="diff-vsala-lab">Priorità (0 nessun intervento · 5 urgentissima)</span>
          <div class="diff-vsala-scelte" data-f="prio"></div><small data-f="prioNome"></small></div>
        <label>Note<textarea data-f="note" maxlength="1000" rows="3"></textarea></label>
        <label>Nominativo dell'operatore *<input type="text" data-f="nominativo" maxlength="80"></label>
        <p class="diff-errore" data-f="err"></p>
        <div class="diff-modale-azioni">
          <button type="button" class="btn-toggle-radar" data-a="no">Annulla</button>
          <button type="button" class="btn-whatsapp" data-a="ok">💾 Salva valutazione</button></div>
      </div>`;
      app.appendChild(boxVal);
    }
    const q = k => boxVal.querySelector(`[data-f="${k}"]`);
    const st = {tipo: A.suggerisci(s.DESCRIZIONE_TRIAGE), prio: 4, det: {}};
    boxVal.querySelector('.diff-vsala-scheda').textContent =
      `${categoria(s).n} · ${indirizzo(s) || ''} ${s.CITTA || ''}${s.ADD_INFO ? ' · ' + s.ADD_INFO : ''}`;
    q('esito').innerHTML = A.ESITI.map(e => `<option value="${e.k}">${esc(e.n)}</option>`).join('');
    q('note').value = '';
    try { q('nominativo').value = localStorage.getItem('fireops_sala_nominativo') || ''; } catch(e){}
    q('err').textContent = '';
    const disegnaV = () => {
      const dup = q('esito').value === 'duplicato';
      boxVal.querySelector('[data-blocco="tipo"]').hidden = dup;
      boxVal.querySelector('[data-blocco="prio"]').hidden = dup;
      q('campi').hidden = dup;
      q('tipi').innerHTML = A.TIPI.map(t => `<button type="button" data-t="${t.k}" class="${t.k === st.tipo ? 'attivo' : ''}">${t.ic} ${esc(t.n)}</button>`).join('');
      q('tipi').querySelectorAll('button').forEach(b => b.onclick = () => { st.tipo = b.dataset.t; st.det = {}; disegnaV(); });
      q('prio').innerHTML = [0, 1, 2, 3, 4, 5].map(p => `<button type="button" data-p="${p}"
        style="${p === st.prio ? `background:${A.COLORI[p]};color:#fff;border-color:${A.COLORI[p]}` : ''}">${p ? '★'.repeat(p) : '0'}</button>`).join('');
      q('prio').querySelectorAll('button').forEach(b => b.onclick = () => { st.prio = +b.dataset.p; disegnaV(); });
      q('prioNome').textContent = A.PRIORITA[st.prio];
      q('campi').innerHTML = A.campi(st.tipo).map(c => {
        const v = st.det[c.k];
        const h = c.t === 'scelta' ? `<select data-c="${c.k}"><option value="">—</option>${c.v.map(o => `<option${v === o ? ' selected' : ''}>${esc(o)}</option>`).join('')}</select>`
          : c.t === 'multi' ? `<div class="diff-vsala-scelte">${c.v.map(o => `<button type="button" data-m="${c.k}" data-v="${esc(o)}" class="${(v || []).includes(o) ? 'attivo' : ''}">${esc(o)}</button>`).join('')}</div>`
          : c.t === 'si_no' ? `<div class="diff-vsala-scelte">${['si', 'no'].map(o => `<button type="button" data-sn="${c.k}" data-v="${o}" class="${v === o ? 'attivo' : ''}">${o === 'si' ? 'Sì' : 'No'}</button>`).join('')}</div>`
          : c.t === 'numero' ? `<input type="number" min="0" step="any" data-c="${c.k}" value="${esc(v == null ? '' : v)}">`
          : `<textarea data-c="${c.k}" rows="2">${esc(v || '')}</textarea>`;
        return `<div class="diff-vsala-campo"><span class="diff-vsala-lab">${esc(c.n)}${c.obbligatorio ? ' *' : ''}</span>${h}</div>`;
      }).join('');
      q('campi').querySelectorAll('[data-c]').forEach(el => el.oninput = el.onchange = () => {
        st.det[el.dataset.c] = el.type === 'number' ? (el.value === '' ? '' : +el.value) : el.value; });
      q('campi').querySelectorAll('[data-m]').forEach(b => b.onclick = () => {
        const a = new Set(st.det[b.dataset.m] || []); a.has(b.dataset.v) ? a.delete(b.dataset.v) : a.add(b.dataset.v);
        st.det[b.dataset.m] = [...a]; b.classList.toggle('attivo'); });
      q('campi').querySelectorAll('[data-sn]').forEach(b => b.onclick = () => {
        st.det[b.dataset.sn] = b.dataset.v;
        q('campi').querySelectorAll(`[data-sn="${b.dataset.sn}"]`).forEach(x => x.classList.toggle('attivo', x === b)); });
    };
    q('esito').onchange = disegnaV;
    disegnaV();
    const chiudi = () => { boxVal.hidden = true; };
    boxVal.querySelector('[data-a="no"]').onclick = chiudi;
    boxVal.querySelector('[data-a="ok"]').onclick = async () => {
      const dup = q('esito').value === 'duplicato';
      const nom = q('nominativo').value.trim();
      if (!nom) return q('err').textContent = 'Indica il nominativo dell\u2019operatore.';
      const manca = !dup && A.campi(st.tipo).find(c => c.obbligatorio && !String(st.det[c.k] || '').trim());
      if (manca) return q('err').textContent = `Compila "${manca.n}".`;
      try { localStorage.setItem('fireops_sala_nominativo', nom); } catch(e){}
      const b = boxVal.querySelector('[data-a="ok"]');
      b.disabled = true; b.textContent = '⏳ Salvataggio…';
      try {
        await api(id, 'valutaSala', {codem: s.CODEM, idContatto: s.ID_CONTATTO, esito: q('esito').value,
          tipo: dup ? 'altro' : st.tipo, priorita: dup ? 0 : st.prio, dettagli: dup ? {} : st.det,
          note: q('note').value.trim(), nominativo: nom});
        chiudi();
        await ricarica(true);
        stato('Valutazione dalla Sala salvata.');
      } catch(e){ q('err').textContent = 'Non salvata: ' + e.message; }
      finally { b.disabled = false; b.textContent = '💾 Salva valutazione'; }
    };
    boxVal.hidden = false;
  }

  /* Foto della valutazione: privata nel Drive del backend, arriva solo
     attraverso il backend e solo alla Sala. Si tiene in memoria. */
  const fotoCache = new Map();
  async function mostraFoto(box, popup){
    const k = box.dataset.ass;
    try {
      if (!fotoCache.has(k)){
        const r = await api(id, 'leggiFoto', {codem: box.dataset.codem, idAss: k});
        fotoCache.set(k, `data:${r.mime};base64,${r.dati}`);
      }
      if (!popup.isOpen()) return;
      box.innerHTML = `<img src="${fotoCache.get(k)}" alt="Foto dal campo" title="Clic per ingrandire">`;
      box.querySelector('img').onload = () => popup.update();
      box.querySelector('img').onclick = () => fotoGrande(fotoCache.get(k));
    } catch(e){ box.textContent = '📷 foto non disponibile: ' + e.message; }
  }
  function fotoGrande(src){
    const d = document.createElement('div');
    d.className = 'diff-foto-grande';
    d.innerHTML = `<img src="${src}" alt=""><button type="button" class="diff-avviso-x" title="Chiudi">×</button>`;
    const chiudi = () => { d.remove(); document.removeEventListener('keydown', esc_); };
    const esc_ = e => { if (e.key === 'Escape') chiudi(); };
    d.onclick = chiudi;
    document.addEventListener('keydown', esc_);
    document.body.appendChild(d);
  }

  const sbloccabile = s => !!(s.VAL && id && id.ruolo === 'COMANDO'
    && (emergenze.find(e => e.CODEM === s.CODEM) || {}).STATO === 'ATTIVA');

  /* Riapre una scheda valutata: la valutazione resta nella storia, la
     scheda torna "da valutare" e il campo può compilarla di nuovo. */
  async function sbloccaScheda(s){
    const v = s.VAL;
    if (!await chiedi({ok: '🔓 Sblocca', testo: `Riaprire la valutazione di questa scheda?\n`
      + `${FA() ? FA().riassunto(v) : ''}\n${v.NOMINATIVO || ''} ${v.SQUADRA ? '— ' + v.SQUADRA : ''} · ${FA() ? FA().ora(v.TS) : ''}\n\n`
      + 'Sul campo tornerà valutabile; la valutazione attuale resta nella storia.'})) return;
    map.closePopup();
    stato('Sblocco della scheda…');
    try {
      await api(id, 'sblocca', {codem: s.CODEM, idContatto: s.ID_CONTATTO});
      await ricarica(true);
      stato('Scheda sbloccata: sul campo è di nuovo valutabile.');
    } catch(e){ stato('Sblocco non riuscito: ' + e.message); }
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
  const firma = s => CAMPI.map(k => s[k]).join('\u241F') + '\u241F' + (s.GRUPPO || '')
    + '\u241F' + (s.VAL ? s.VAL.ID_ASS : '');
  const chiavePunto = s => num(s.LAT).toFixed(5) + ',' + num(s.LON).toFixed(5);

  function passaFiltri(s){
    const sig = $('selComando').value;
    return !duplicata(s) && !nascoste.has(categoria(s).k) && (!sig || String(s.CODEM).slice(-10, -8) === sig);
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
    pile.forEach(el => el.forEach((x, i) => {
      const p = offsetPila(num(x.s.LAT), num(x.s.LON), i, el.length);
      x.m.setLatLng(p);
      if (x.alone) x.alone.setLatLng(p);
      if (x.badge) x.badge.setLatLng(p);
    }));
  }
  /* ---------------------------- aggregazione ----------------------------
     Sotto lo zoom SOGLIA_CLUSTER i punti vicini sullo schermo si fondono in
     un badge col numero di schede. Griglia in pixel sulla proiezione allo
     zoom corrente: non dipende dallo spostamento della carta, solo dallo
     zoom, quindi si ricalcola a fine zoom e quando cambiano i dati.
     Colore e misura del badge crescono col numero; il bordo prende il
     colore del settore se tutte le schede del badge ne fanno parte.
     Clic sul badge: si ingrandisce sulle sue schede. */
  const SOGLIA_CLUSTER = 16, CELLA = 70;
  const classeBadge = n => n < 10 ? 'd1' : n < 50 ? 'd2' : n < 100 ? 'd3' : n < 250 ? 'd4' : 'd5';
  function raggruppa(){
    livCluster.clearLayers();
    const z = map.getZoom();
    const vivi = [];
    /* Le schede con persone non finiscono mai dentro un badge: restano
       sempre visibili una per una, con il loro alone. */
    marcatori.forEach(x => { if (x.m){ if (!livSchede.hasLayer(x.m)) livSchede.addLayer(x.m);
      if (!x.alone) vivi.push(x); } });
    if (z >= SOGLIA_CLUSTER) return;
    const celle = new Map();
    vivi.forEach(x => {
      const p = map.project([num(x.s.LAT), num(x.s.LON)], z);
      const k = Math.floor(p.x / CELLA) + ':' + Math.floor(p.y / CELLA);
      if (!celle.has(k)) celle.set(k, []);
      celle.get(k).push(x);
    });
    celle.forEach(el => {
      if (el.length < 2) return;
      el.forEach(x => livSchede.removeLayer(x.m));
      let la = 0, lo = 0;
      const tipi = new Map(), settori = new Set();
      el.forEach(x => {
        la += num(x.s.LAT); lo += num(x.s.LON);
        const n = categoria(x.s).n; tipi.set(n, (tipi.get(n) || 0) + 1);
        settori.add(x.s.GRUPPO || '');
      });
      const g = settori.size === 1 ? gruppoDi(el[0].s) : null;
      const n = el.length;
      const pMax = Math.max(-1, ...el.map(x => x.s.VAL ? +x.s.VAL.PRIORITA || 0 : -1));
      const lato = n < 10 ? 30 : n < 50 ? 36 : n < 100 ? 42 : n < 250 ? 48 : 56;
      const b = L.marker([la / n, lo / n], {pmIgnore: true, snapIgnore: true, icon: L.divIcon({
        className: 'diff-cluster ' + classeBadge(n) + (pMax >= 4 ? ' diff-cluster-urgente' : ''), iconSize: [lato, lato], iconAnchor: [lato / 2, lato / 2],
        html: `<span${g ? ` style="box-shadow:0 0 0 3px ${esc(g.COLORE)}"` : ''}>${n}</span>`})});
      b.bindTooltip([...tipi].sort((a, c) => c[1] - a[1]).map(([t, c]) => `${c} · ${esc(t)}`).join('<br>')
        + (g ? `<br><b>${esc(codiceDi(g))}</b>` : ''), {direction: 'top'});
      b.on('click', () => {
        const bb = L.latLngBounds(el.map(x => [num(x.s.LAT), num(x.s.LON)]));
        const piatto = bb.getNorthEast().distanceTo(bb.getSouthWest()) < 5;
        if (piatto) map.setView(bb.getCenter(), SOGLIA_CLUSTER);
        else map.fitBounds(bb, {padding: [50, 50], maxZoom: SOGLIA_CLUSTER});
      });
      livCluster.addLayer(b);
    });
  }
  const aggiornaVista = () => {
    raggruppa();
    marcatori.forEach(x => { if (x.badge){
      const vis = x.m && livSchede.hasLayer(x.m);
      if (vis && !livValutate.hasLayer(x.badge)) livValutate.addLayer(x.badge);
      if (!vis && livValutate.hasLayer(x.badge)) livValutate.removeLayer(x.badge);
    } });
    posizionaPile();
  };
  map.on('zoomend', aggiornaVista);

  function creaMarcatore(s){
    const g = gruppoDi(s), cat = categoria(s);
    const m = L.circleMarker([num(s.LAT), num(s.LON)], {renderer: tela, radius: 6.5, snapIgnore: true, pmIgnore: true,
      bubblingMouseEvents: false,
      fillColor: cat.c, fillOpacity: .95, color: g ? g.COLORE : '#ffffff',
      weight: g ? 3 : 1.5, dashArray: s.DIFFERIBILE && s.DIFFERIBILE !== 'S' ? '2,2' : null});
    m.bindPopup(() => `<div class="diff-pop"><b style="color:${categoria(s).c}">${esc(categoria(s).n)}</b>
      <div>${esc(s.CITTA)}</div><div class="diff-pop-dati"><span>⏳ caricamento della scheda…</span></div></div>`,
      {maxWidth: 320});
    m.on('popupopen', async ev => {
      livScelta.clearLayers();
      const f0 = formaLocalizzazione(s);
      if (f0) livScelta.addLayer(f0);
      try {
        const d = await leggiDettaglio(id, s);
        if (!ev.popup.isOpen()) return;
        ev.popup.setContent(popup(d));
        const f = formaLocalizzazione(d);
        livScelta.clearLayers();
        if (f) livScelta.addLayer(f);
        const a = ev.popup.getElement().querySelector('.diff-cli');
        if (a) a.onclick = e => { e.preventDefault(); NS.copiaTesto(e, d.CLI); };
        const sb = ev.popup.getElement().querySelector('.diff-sblocca');
        if (sb) sb.onclick = e => { e.preventDefault(); sbloccaScheda(s); };
        const vs = ev.popup.getElement().querySelector('.diff-valuta-sala');
        if (vs) vs.onclick = e => { e.preventDefault(); map.closePopup(); valutaDaSala(d); };
        const ft = ev.popup.getElement().querySelector('.diff-foto');
        if (ft) mostraFoto(ft, ev.popup);
      } catch(e){
        if (ev.popup.isOpen()) ev.popup.setContent(`<div class="diff-pop"><b>${esc(categoria(s).n)}</b>
          <div class="diff-errore">Dettaglio non disponibile: ${esc(e.message)}</div></div>`);
      }
    });
    m.on('popupclose', () => livScelta.clearLayers());
    m.on('contextmenu', ev => {
      if (ev.originalEvent) L.DomEvent.preventDefault(ev.originalEvent);
      if (map.pm.globalDrawModeEnabled && map.pm.globalDrawModeEnabled()) return;
      menuScheda(s, ev.containerPoint);
    });
    return m;
  }

  function togliMarcatore(k){
    const x = marcatori.get(k);
    if (!x) return;
    if (x.m) livSchede.removeLayer(x.m);
    if (x.area) livAree.removeLayer(x.area);
    if (x.alone) livPriorita.removeLayer(x.alone);
    if (x.badge) livValutate.removeLayer(x.badge);
    marcatori.delete(k);
  }

  function metti(s){
    const x = {s, firma: firma(s), m: null, area: null};
    if (conPosizione(s) && passaFiltri(s)){
      x.m = creaMarcatore(s);
      livSchede.addLayer(x.m);
      if (prioritaria(s)){
        x.alone = L.marker([num(s.LAT), num(s.LON)], {pane: 'diffEtichette', interactive: false,
          pmIgnore: true, snapIgnore: true, icon: L.divIcon({className: 'diff-alone', iconSize: [34, 34],
            iconAnchor: [17, 17], html: '<span></span>'})});
        livPriorita.addLayer(x.alone);
      }
      if (s.VAL && FA()){
        const p = +s.VAL.PRIORITA || 0;
        /* Dopo la valutazione il punto cambia forma (differibili-assessment.js):
           stella nera per la priorità 5, rombo del colore del settore con le
           stelle sopra per le altre. Il pallino sotto resta, invisibile, per
           clic e tasto destro. */
        const g = gruppoDi(s);
        x.badge = L.marker([num(s.LAT), num(s.LON)], {pane: 'diffEtichette', interactive: false,
          pmIgnore: true, snapIgnore: true, icon: L.divIcon(FA().simbolo(s.VAL, g ? g.COLORE : null, ''))});
        x.m.setStyle({opacity: 0, fillOpacity: 0});
        livValutate.addLayer(x.badge);
      }
      if ($('aree').checked){ x.area = formaLocalizzazione(s); if (x.area) livAree.addLayer(x.area); }
    }
    marcatori.set(chiave(s), x);
  }

  function disegnaGruppi(){
    livGruppi.clearLayers();
    gruppi.forEach(g => {
      if (!g.GEOJSON || g.ID_GRUPPO === inModifica) return;
      /* Il perimetro non intercetta il puntatore: stava sopra la tela dei
         punti e rubava clic e tasto destro. Il nome lo dice l'etichetta al
         centro. Lo snap funziona lo stesso, perché guarda la geometria. */
      const l = L.geoJSON(g.GEOJSON, {interactive: false, pane: 'diffGruppi',
        style: {color: g.COLORE, weight: 2.5, fillColor: g.COLORE, fillOpacity: .07,
          dashArray: g.provvisorio ? '6,5' : null}});
      livGruppi.addLayer(l);
      const b = l.getBounds();
      const sel = inSelezione(g);
      if (sel || selezione) l.setStyle(sel ? {weight: 4.5, fillOpacity: .2} : {weight: 1.5, fillOpacity: .03, opacity: .5});
      if (b.isValid()){
        const et = L.marker(b.getCenter(), {pane: 'diffEtichette', pmIgnore: true, snapIgnore: true,
          icon: L.divIcon({className: 'diff-etichetta-gruppo' + (sel ? ' sel' : ''), iconSize: null,
            html: `<span style="border-color:${esc(g.COLORE)}">${esc(codiceDi(g))}${g.provvisorio ? ' ⏳' : ''}</span>`})});
        et.on('click', ev => { selezionaSenzaSpostare(g); menuGruppo(g, ev.containerPoint); });
        et.on('contextmenu', ev => { selezionaSenzaSpostare(g); menuGruppo(g, ev.containerPoint); });
        livGruppi.addLayer(et);
      }
    });
  }

  /* ------------------------------ selezione ------------------------------
     Si seleziona un nodo dell'albero (settore, worksite o sotto-settore)
     dalla tabella o cliccando l'etichetta sulla carta: il suo perimetro si
     evidenzia, gli altri si attenuano, la carta ci si porta sopra. Un
     secondo clic sullo stesso nodo toglie la selezione. */
  let selezione = null;   // {tipo:'settore'|'ws'|'ss', settore, ws, id}
  const provvisori = new Map();   // nome -> sotto-settore non ancora tornato dal foglio
  let inModifica = null;          // ID_GRUPPO del perimetro in modifica
  function membriDi(sel){
    if (!sel) return [];
    return gruppi.filter(g => {
      const x = livelli(g);
      if (sel.tipo === 'ss') return g.ID_GRUPPO === sel.id;
      if (sel.tipo === 'ws') return x.settore === sel.settore && x.ws === sel.ws;
      return x.settore === sel.settore;
    });
  }
  const inSelezione = g => !!selezione && membriDi(selezione).includes(g);
  const stessaSelezione = (a, b) => !!a && !!b && a.tipo === b.tipo && a.settore === b.settore
    && a.ws === b.ws && a.id === b.id;
  function limitiDi(gg){
    let b = null;
    gg.forEach(g => { const x = L.geoJSON(g.GEOJSON).getBounds();
      if (x.isValid()) b = b ? b.extend(x) : L.latLngBounds(x.getSouthWest(), x.getNorthEast()); });
    return b;
  }
  /* Clic sulla carta, fuori dai punti: se cade dentro un sotto-settore lo
     seleziona (il più piccolo, se più perimetri si sovrappongono); fuori da
     tutti, toglie la selezione. Durante il disegno non fa niente. */
  map.on('click', e => {
    if (map.pm.globalDrawModeEnabled && map.pm.globalDrawModeEnabled()) return;
    if (inModifica) return;
    const dentroA = gruppi.filter(g => {
      const geo = g.GEOJSON && (g.GEOJSON.geometry || g.GEOJSON);
      const c = geo && geo.coordinates && geo.coordinates[0];
      return c && dentro(e.latlng.lat, e.latlng.lng, c.map(p => ({lat: p[1], lng: p[0]})));
    });
    if (!dentroA.length){ if (selezione){ selezione = null; disegnaGruppi(); elencoGruppi(); } return; }
    const area = g => { const b = limitiDi([g]); return b ? (b.getNorth() - b.getSouth()) * (b.getEast() - b.getWest()) : 0; };
    const g = dentroA.sort((a, b) => area(a) - area(b))[0];
    selezionaSenzaSpostare(g);
    menuGruppo(g, e.containerPoint);
  });
  /* Tasto destro dentro un perimetro (fuori dai punti): stesso menu. */
  map.on('contextmenu', e => {
    if (map.pm.globalDrawModeEnabled && map.pm.globalDrawModeEnabled()) return;
    if (inModifica) return;
    const g = gruppoInPunto(e.latlng);
    if (!g) return;
    if (e.originalEvent) L.DomEvent.preventDefault(e.originalEvent);
    selezionaSenzaSpostare(g);
    menuGruppo(g, e.containerPoint);
  });
  function gruppoInPunto(ll){
    const dentroA = gruppi.filter(g => {
      const geo = g.GEOJSON && (g.GEOJSON.geometry || g.GEOJSON);
      const c = geo && geo.coordinates && geo.coordinates[0];
      return c && dentro(ll.lat, ll.lng, c.map(p => ({lat: p[1], lng: p[0]})));
    });
    const area = g => { const b = limitiDi([g]); return b ? (b.getNorth() - b.getSouth()) * (b.getEast() - b.getWest()) : 0; };
    return dentroA.sort((a, b) => area(a) - area(b))[0] || null;
  }
  function selezionaSenzaSpostare(g){
    selezione = {tipo: 'ss', id: g.ID_GRUPPO};
    disegnaGruppi(); elencoGruppi();
  }

  function seleziona(sel){
    selezione = stessaSelezione(selezione, sel) ? null : sel;
    disegnaGruppi();
    elencoGruppi();
    const b = selezione && limitiDi(membriDi(selezione));
    if (b) map.fitBounds(b, {padding: [40, 40], maxZoom: 17});
  }

  /* Ridisegno completo: al primo caricamento, al cambio di emergenza o di
     filtri, quando cambia quello che si vuole vedere e non i dati. */
  function disegna(){
    livSchede.clearLayers(); livAree.clearLayers(); livScelta.clearLayers(); livPriorita.clearLayers(); livValutate.clearLayers();
    marcatori.clear();
    schede.forEach(metti);
    aggiornaVista();
    disegnaGruppi();
    riepilogo(visibili());
    elencoGruppi();
    allarme();
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
      else if (x.firma !== firma(s)){ dettagli.delete(k); togliMarcatore(k); metti(s); cambiate.push(s); }
    });
    schede = nuoveSchede;
    if (nuove.length || cambiate.length || tolte) aggiornaVista();
    disegnaGruppi();
    riepilogo(visibili());
    elencoGruppi();
    allarme(nuove.some(prioritaria));
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

  /* ALLARME PERSONE
     Riquadro rosso fisso sulla carta finché ci sono schede con persone o
     soccorso nella vista. Si chiude, ma si riapre — lampeggiando — se ne
     arriva una nuova. "Mostra" porta la carta su di loro. */
  let allarmeChiuso = new Set();
  function allarme(nuovaArrivata){
    const pr = visibili().filter(prioritaria);
    let box = app.querySelector('.diff-allarme');
    if (!box){
      box = document.createElement('div');
      box.className = 'diff-allarme';
      app.querySelector('.diff-mapwrap').appendChild(box);
    }
    const chiavi = pr.map(chiave);
    const nonViste = chiavi.filter(k => !allarmeChiuso.has(k));
    if (!pr.length || !nonViste.length){ box.hidden = true; return; }
    box.innerHTML = `<b>⚠ ${pr.length} ${pr.length === 1 ? 'scheda' : 'schede'} con PERSONE / SOCCORSO</b>
      <span>${esc([...new Set(pr.map(s => categoria(s).n))].join(' · '))}</span>
      <button type="button" class="btn-toggle-radar" data-a="vedi">Mostra</button>
      <button type="button" class="diff-avviso-x" data-a="x" title="Chiudi">×</button>`;
    box.hidden = false;
    box.classList.toggle('lampeggia', !!nuovaArrivata);
    box.querySelector('[data-a="x"]').onclick = () => { chiavi.forEach(k => allarmeChiuso.add(k)); box.hidden = true; };
    box.querySelector('[data-a="vedi"]').onclick = () => {
      const p = pr.filter(conPosizione).map(s => [num(s.LAT), num(s.LON)]);
      if (p.length) map.fitBounds(L.latLngBounds(p), {padding: [60, 60], maxZoom: 16});
    };
  }

  function riepilogo(v){
    const conteggi = new Map(), tipi = new Map();
    schede.filter(s => !duplicata(s)).forEach(s => { const c = categoria(s); tipi.set(c.k, c); conteggi.set(c.k, (conteggi.get(c.k) || 0) + 1); });
    const dup = schede.filter(duplicata).length;
    const senza = v.filter(s => !conPosizione(s)).length;
    const inGruppo = v.filter(s => s.GRUPPO).length;
    const nue = new Set(v.map(s => s.ALTROENTE_IDSCHEDA).filter(Boolean)).size;
    const voci = [...tipi.values()].sort((a, b) => conteggi.get(b.k) - conteggi.get(a.k)).map(c =>
      `<label class="diff-leg${RE_PRIORITA.test(c.n) ? ' diff-leg-pr' : ''}"><input type="checkbox" data-cat="${esc(c.k)}"${nascoste.has(c.k) ? '' : ' checked'}>
        <i style="background:${c.c}"></i><span>${esc(c.n)}</span><b title="schede">${conteggi.get(c.k)}</b></label>`).join('');
    $('riepilogo').innerHTML = `
      <div class="diff-numeri">
        <div><b>${v.length}</b><span>schede</span></div>
        <div><b>${nue}</b><span>schede NUE</span></div>
        <div><b>${inGruppo}</b><span>nei settori</span></div>
      </div>
      ${dup ? `<p class="pagina-nota" style="margin:0 0 6px">⧉ ${dup} ${dup === 1 ? 'duplicato nascosto' : 'duplicati nascosti'} dalla carta</p>` : ''}
      ${v.some(prioritaria) ? `<p class="diff-pr-riga">⚠ ${v.filter(prioritaria).length} con persone / soccorso</p>` : ''}
      ${(() => { const val = v.filter(s => s.VAL); if (!val.length) return '';
        const urg = val.filter(s => +s.VAL.PRIORITA >= 4 && s.VAL.ESITO === 'da_intervenire').length;
        const da = val.filter(s => s.VAL.ESITO === 'da_intervenire').length;
        return `<p class="diff-val-riga">📝 ${val.length} valutate su ${v.length} · ${da} da intervenire`
          + `${urg ? ` · <b>${urg} con priorità 4-5</b>` : ''}</p>`; })()}
      ${senza ? `<p class="diff-errore">${senza} senza coordinate: non compaiono sulla carta.</p>` : ''}
      <div class="diff-legenda">${voci || '<p class="pagina-nota">Nessuna scheda per la selezione.</p>'}</div>`;
    $('riepilogo').querySelectorAll('input[data-cat]').forEach(i => {
      i.onchange = () => { i.checked ? nascoste.delete(i.dataset.cat) : nascoste.add(i.dataset.cat); disegna(); };
    });
  }

  /* Tabella dei settori: una riga per livello, con i totali. Il nome si
     clicca per selezionare; a destra inquadra, PDF ed elimina. Eliminare un
     settore o un worksite elimina tutti i suoi sotto-settori, dopo conferma. */
  function elencoGruppi(){
    const box = $('gruppi');
    const cmd = id && id.ruolo === 'COMANDO';
    const scrivibile = g => cmd && (emergenze.find(e => e.CODEM === g.CODEM) || {}).STATO === 'ATTIVA';
    if (!gruppi.length){
      box.innerHTML = `<p class="pagina-nota">${cmd
        ? 'Nessun settore: premi "Crea settore" e disegna il perimetro del primo sotto-settore.'
        : 'Nessun settore.'}</p>`;
      return;
    }
    const albero = new Map();
    gruppi.forEach(g => {
      const x = livelli(g);
      if (!albero.has(x.settore)) albero.set(x.settore, new Map());
      const w = albero.get(x.settore);
      if (!w.has(x.ws)) w.set(x.ws, []);
      w.get(x.ws).push(g);
    });
    const conta = gg => gg.reduce((a, g) => a + (+g.N_SCHEDE || 0), 0);
    const schedeDi = gg => schede.filter(s => gg.some(g => g.ID_GRUPPO === s.GRUPPO));

    const tab = document.createElement('table');
    tab.className = 'diff-tab-settori';
    tab.innerHTML = '<thead><tr><th>Settore · Worksite · Sotto-settore</th><th>Schede</th><th></th></tr></thead>';
    const corpo = document.createElement('tbody');
    tab.appendChild(corpo);

    const riga = (livello, sel, etichetta, gg, colore) => {
      const tr = document.createElement('tr');
      tr.className = 'diff-liv-' + livello + (stessaSelezione(selezione, sel) ? ' sel' : '');
      const n = document.createElement('td');
      n.className = 'diff-tab-nome';
      const pr = schedeDi(gg).filter(prioritaria).length;
      n.innerHTML = (colore ? `<i style="background:${esc(colore)}"></i>` : '') + etichetta
        + (pr ? ` <span class="diff-pr" title="schede con persone / soccorso">⚠ ${pr}</span>` : '');
      n.title = 'Seleziona';
      n.onclick = () => seleziona(sel);
      const c = document.createElement('td');
      c.className = 'diff-tab-num';
      const sg = schedeDi(gg), fatte = sg.filter(x => x.VAL).length;
      c.innerHTML = `${conta(gg)}${fatte ? `<small title="valutate">✓${fatte}</small>` : ''}`;
      const a = document.createElement('td');
      a.className = 'diff-tab-azioni';
      const btn = (t, tit, f, cls) => {
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'btn-toggle-radar diff-mini' + (cls ? ' ' + cls : '');
        b.textContent = t; b.title = tit;
        b.onclick = ev => { ev.stopPropagation(); f(); };
        a.appendChild(b);
      };
      btn('🔍', 'Inquadra', () => { const b = limitiDi(gg); if (b) map.fitBounds(b, {padding: [40, 40], maxZoom: 17}); });
      if (cmd) btn('🖨', 'PDF', () => stampa(schedeDi(gg), sel.tipo === 'ss' ? codiceDi(gg[0])
        : sel.tipo === 'ws' ? `Worksite ${codiceWs(sel.settore, sel.ws)}` : 'Settore ' + sel.settore, gg));
      if (cmd) btn('🔗', 'Link alla pagina da campo di questa zona', () => linkCampo(gg,
        sel.tipo === 'ss' ? codiceDi(gg[0]) : sel.tipo === 'ws' ? `Worksite ${codiceWs(sel.settore, sel.ws)}`
          : 'Settore ' + sel.settore));
      if (gg.every(scrivibile)) btn('🗑', 'Elimina', () => eliminaGruppi(gg, etichetta.replace(/<[^>]+>/g, '')), 'diff-rosso');
      tr.append(n, c, a);
      corpo.appendChild(tr);
    };

    [...albero.keys()].sort((a, b) => ordineSettore(a) - ordineSettore(b) || a.localeCompare(b)).forEach(st => {
      const w = albero.get(st);
      const tutti = [...w.values()].flat();
      riga('settore', {tipo: 'settore', settore: st}, `<b>Settore ${esc(st)}</b> <small>(${esc(inizialeDi(st))})</small>`, tutti, tutti[0].COLORE);
      [...w.keys()].sort((a, b) => a - b).forEach(ws => {
        const gg = w.get(ws).sort((a, b) => livelli(a).ss - livelli(b).ss);
        riga('ws', {tipo: 'ws', settore: st, ws}, `Worksite <b>${esc(codiceWs(st, ws))}</b>`, gg);
        gg.forEach(g => riga('ss', {tipo: 'ss', id: g.ID_GRUPPO},
          `${esc(codiceWs(st, ws))}<b>${lettera(livelli(g).ss)}</b>`, [g]));
      });
    });
    box.innerHTML = '';
    box.appendChild(tab);
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
  let inquadraProssimo = true; // il prossimo aggiornamento porta la carta sulle schede
  /* Un solo aggiornamento alla volta: il rifresco automatico che parte
     mentre il precedente è ancora in volo raddoppiava le chiamate. Chi
     chiede mentre uno è in corso aspetta quello, poi ne parte uno nuovo. */
  let ricaricaInCorso = null, ricaricaDiNuovo = false;
  function ricarica(silenzioso){
    if (ricaricaInCorso){
      if (!silenzioso) ricaricaDiNuovo = true;
      return ricaricaInCorso;
    }
    ricaricaInCorso = ricaricaVera(silenzioso).finally(() => {
      ricaricaInCorso = null;
      if (ricaricaDiNuovo){ ricaricaDiNuovo = false; ricarica(true); }
    });
    return ricaricaInCorso;
  }
  async function ricaricaVera(silenzioso){
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
      const vals = await leggiValutazioni(id, codem, emergenze, arch);
      const ult = FA() ? FA().ultime(vals) : new Map();
      lette.forEach(s => {
        s.VAL = ult.get(s.CODEM + '|' + s.ID_CONTATTO) || null;
        /* Posizione corretta dal campo: vale al posto di quella del NUE. */
        if (s.VAL && s.VAL.LAT_CORRETTA && s.VAL.LON_CORRETTA){
          s.LAT_NUE = s.LAT; s.LON_NUE = s.LON;
          s.LAT = String(s.VAL.LAT_CORRETTA); s.LON = String(s.VAL.LON_CORRETTA);
        }
      });
      controllaPriorita5([...ult.values()], lette);
      /* I sotto-settori appena creati si vedono subito, prima che il foglio
         li restituisca: restano "provvisori" finché la lettura non li trova. */
      provvisori.forEach((g, k) => { if (gr.some(x => x.CODEM === g.CODEM && x.NOME === g.NOME)) provvisori.delete(k); });
      gruppi = gr.concat([...provvisori.values()]);
      /* Stessa vista di prima: solo le differenze, la carta resta dov'è.
         Vista nuova: ridisegno e inquadratura sulle schede. */
      const nuovaVista = vista !== vistaDisegnata;
      if (!nuovaVista) avvisa(aggiornaDifferenze(lette));
      else { schede = lette; disegna(); vistaDisegnata = vista; }
      aggiornaPulsanti();
      /* La carta si inquadra solo quando lo chiede chi la usa: primo
         avvio, cambio di emergenza dal menu, archiviate, vista Direzione.
         Un rifresco — anche dopo un salvataggio — la lascia dov'è. */
      if (inquadraProssimo){ inquadraProssimo = false; inquadra(); }
      caricato = true; erroreLettura = '';
      aggiornaVuoto();
      stato(`${schede.length} schede · aggiornato alle ${NS.oraBreve ? NS.oraBreve(new Date()) : ''}`
        + (avvisoValutazioni ? ' · ⚠ ' + avvisoValutazioni : '')
        + (FA() ? '' : ' · ⚠ differibili-assessment.js non caricato: valutazioni non visibili'));
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
  $('archiviate').onchange = () => { $('selEmergenza').value = ''; inquadraProssimo = true; ricarica(); };
  $('selEmergenza').onchange = () => {
    inquadraProssimo = true;
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
        /* Un giro che fallisce (foglio non ancora aggiornato, rete) non
           interrompe il caricamento: si riprova al giro dopo. */
        try { dopo = new Set((await leggiSchede(id, v.codem, [], true)).map(x => String(x.ID_CONTATTO))); }
        catch(e){ stato('Verifica: ' + e.message + ' — riprovo…'); }
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

  /* Il perimetro appena chiuso resta sulla carta come anteprima per tutta
     la scelta di settore, worksite e codice: si vede cosa si sta creando, e
     le schede che contiene si illuminano. Sparisce solo quando al suo posto
     compare il sotto-settore provvisorio, o se si annulla. */
  map.on('pm:create', async e => {
    const poli = e.layer;
    const anteprima = L.layerGroup().addTo(map);
    try { await creaDaPerimetro(poli, anteprima); }
    finally {
      if (map.hasLayer(poli)) map.removeLayer(poli);
      map.removeLayer(anteprima);
    }
  });
  async function creaDaPerimetro(poli, anteprima){
    const anello = poli.getLatLngs()[0];
    const geo = poli.toGeoJSON();
    poli.setStyle({color: '#fdd835', weight: 3, dashArray: '8,6', fillColor: '#fdd835', fillOpacity: .15});
    if (poli.pm) poli.pm.disable();
    poli.options.pmIgnore = true; poli.options.snapIgnore = true;
    const em = emergenzaScelta();
    const presi = visibili().filter(s => s.CODEM === em.CODEM && conPosizione(s)
      && dentro(num(s.LAT), num(s.LON), anello));
    if (!presi.length) return stato('Nessuna scheda dentro il poligono.');
    presi.forEach(s => anteprima.addLayer(L.circleMarker([num(s.LAT), num(s.LON)], {
      renderer: tela, radius: 9, color: '#fdd835', weight: 3, fill: false,
      interactive: false, pmIgnore: true, snapIgnore: true})));
    const altrove = presi.filter(s => s.GRUPPO).length;
    /* Albero esistente di questa emergenza: settore → worksite → ultimo sotto-settore. */
    const albero = new Map();
    gruppi.filter(g => g.CODEM === em.CODEM).forEach(g => {
      const x = livelli(g);
      if (!albero.has(x.settore)) albero.set(x.settore, new Map());
      const w = albero.get(x.settore);
      w.set(x.ws, Math.max(w.get(x.ws) || 0, x.ss));
    });
    /* Se c'è una selezione la si propone per prima: chi ha selezionato
       "Alfa worksite 2" vuole aggiungere lì il prossimo sotto-settore. */
    const pre = selezione && selezione.tipo !== 'ss' ? selezione
      : selezione ? Object.assign({tipo: 'ws'}, livelli(membriDi(selezione)[0] || {})) : null;
    const testa = `${presi.length} schede nel perimetro`
      + (altrove ? `, di cui ${altrove} già in un altro sotto-settore: passano a questo.` : '.');

    const nuovoSett = SETTORI.find(n => !albero.has(n)) || 'Settore ' + (albero.size + 1);
    const vociSett = [...albero.keys()].sort((a, b) => ordineSettore(a) - ordineSettore(b)).map(n => ({
      k: n, et: `Settore ${n}`, nota: `${albero.get(n).size} worksite`}))
      .concat([{k: '+', et: `➕ Nuovo settore ${nuovoSett}`, nota: 'settore geografico generale'}]);
    let settore = pre && albero.has(pre.settore) ? pre.settore : null;
    if (!settore){
      const k = await chiedi({voci: vociSett, testo: testa + '\n1/2 · Settore geografico generale:'});
      if (!k) return stato('Settore annullato.');
      settore = k === '+' ? nuovoSett : k;
    }
    const wsEsistenti = albero.get(settore) || new Map();
    let ws = pre && pre.tipo === 'ws' && pre.settore === settore && wsEsistenti.has(pre.ws) ? pre.ws : null;
    if (ws == null){
      const nuovoWs = Math.max(0, ...wsEsistenti.keys()) + 1;
      const vociWs = [...wsEsistenti.keys()].sort((a, b) => a - b).map(w => ({k: String(w),
        et: `Worksite ${codiceWs(settore, w)}`, nota: `aggiunge il sotto-settore ${nomeSS(settore, w, wsEsistenti.get(w) + 1)}`}))
        .concat([{k: '+', et: `➕ Nuovo worksite ${codiceWs(settore, nuovoWs)}`, nota: `crea ${nomeSS(settore, nuovoWs, 1)}`}]);
      const k = await chiedi({voci: vociWs, testo: testa + `\n2/2 · Worksite nel settore ${settore}:`});
      if (!k) return stato('Settore annullato.');
      ws = k === '+' ? nuovoWs : +k;
    }
    const proposto = nomeSS(settore, ws, (wsEsistenti.get(ws) || 0) + 1);
    /* Ultimo passo: il codice proposto si può cambiare prima di salvare. */
    const nome = await chiediCodice(em.CODEM, proposto, testa + `\nCodice del sotto-settore (proposto ${proposto}):`);
    if (!nome) return stato('Settore annullato.');
    const colore = coloreSettore(livelli({NOME: nome}).settore);
    const tmp = {ID_GRUPPO: 'tmp-' + Date.now(), CODEM: em.CODEM, NOME: nome, COLORE: colore,
      GEOJSON: geo, N_SCHEDE: presi.length, provvisorio: true};
    provvisori.set(nome, tmp);
    gruppi = gruppi.concat([tmp]);
    map.removeLayer(poli); anteprima.clearLayers();
    disegnaGruppi(); elencoGruppi();
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
        ok = gruppi.some(x => x.CODEM === em.CODEM && x.NOME === nome && !x.provvisorio);
      }
      stato(ok ? `${nome} creato con ${presi.length} schede.`
        : `${nome} inviato ma non ancora confermato dal foglio: resta tratteggiato finché non arriva.`);
    } catch(err){
      provvisori.delete(nome);
      gruppi = gruppi.filter(x => x !== tmp);
      disegnaGruppi(); elencoGruppi();
      stato(`${nome} non salvato: ` + err.message);
    }
  }

  /* ------------------------- link per il campo -------------------------
     Un indirizzo della pagina differibili-campo.html con il CODEM, gli ID
     dei sotto-settori della zona e il nome da mostrare. La pagina legge da
     sé le schede di quei sotto-settori: chi la apre non deve avere FireOps.
     Il link vale finché l'emergenza è in corso. */
  async function linkCampo(gg, nome){
    const veri = gg.filter(g => !g.provvisorio);
    if (!veri.length) return stato('Il sotto-settore è ancora in salvataggio: riprova tra poco.');
    const u = new URL('differibili-campo.html', location.href);
    u.search = new URLSearchParams({c: veri[0].CODEM, g: veri.map(g => g.ID_GRUPPO).join(','), n: nome}).toString();
    const link = u.toString();
    const n = schede.filter(s => veri.some(g => g.ID_GRUPPO === s.GRUPPO)).length;
    const testo = `FireOps VVF — ${nome} (${veri[0].CODEM}): ${n} schede differibili.\n${link}`;
    inviaLink(nome, n, veri.length, testo);
  }

  /* Invio come in Messaggistica: prefisso e numero, poi WhatsApp Desktop,
     WhatsApp Web o Telegram. I pulsanti si accendono quando il numero è
     plausibile. Telegram non accetta un testo precompilato verso un numero:
     il messaggio si copia negli appunti e si apre la chat, basta incollare. */
  let boxInvio = null;
  function inviaLink(nome, n, nSS, testo){
    if (!boxInvio){
      boxInvio = document.createElement('div');
      boxInvio.className = 'diff-modale';
      boxInvio.innerHTML = `<div class="diff-modale-box diff-invio">
        <div class="diff-modale-titolo"></div>
        <div class="diff-invio-riga">
          <label>Prefisso<input type="text" class="pref" value="+39" inputmode="tel" autocomplete="off"></label>
          <label>Numero di telefono<input type="tel" class="tel" placeholder="Es. 3331234567" autocomplete="off"></label>
        </div>
        <textarea class="anteprima" rows="4" readonly></textarea>
        <div class="diff-invio-azioni">
          <button type="button" class="btn-whatsapp" data-a="wd" disabled>💻 WhatsApp Desktop</button>
          <button type="button" class="btn-whatsapp" data-a="ww" disabled>📱 WhatsApp Web</button>
          <button type="button" class="btn-telegram" data-a="tg" disabled>✈️ Telegram</button>
        </div>
        <div class="diff-modale-azioni"><button type="button" class="btn-toggle-radar" data-a="no">Chiudi</button></div>
      </div>`;
      app.appendChild(boxInvio);
    }
    const b = boxInvio;
    b.querySelector('.diff-modale-titolo').textContent = `Invia il link — ${nome} · ${n} schede, ${nSS} sotto-settori`;
    b.querySelector('.anteprima').value = testo;
    const pref = b.querySelector('.pref'), tel = b.querySelector('.tel');
    const numero = () => {
      const p = pref.value.replace(/\D/g, '').replace(/^00/, '');
      const t = tel.value.replace(/\D/g, '');
      return p && t.length >= 6 ? p + t : '';
    };
    const pulsanti = b.querySelectorAll('.diff-invio-azioni button');
    const controlla = () => {
      const ok = !!numero();
      pulsanti.forEach(x => { x.disabled = !ok; });
      tel.classList.toggle('campo-mancante', !!tel.value && !ok);
    };
    pref.oninput = tel.oninput = controlla;
    controlla();
    const chiudi = () => { b.hidden = true; document.removeEventListener('keydown', esc_); };
    const esc_ = e => { if (e.key === 'Escape') chiudi(); };
    document.addEventListener('keydown', esc_);
    b.querySelector('[data-a="no"]').onclick = chiudi;
    const t = encodeURIComponent(testo);
    b.querySelector('[data-a="wd"]').onclick = () => {
      location.href = `whatsapp://send?phone=${numero()}&text=${t}`;
      stato(`Link di ${nome} aperto in WhatsApp Desktop per +${numero()}.`); chiudi();
    };
    b.querySelector('[data-a="ww"]').onclick = () => {
      window.open(`https://web.whatsapp.com/send?phone=${numero()}&text=${t}`, '_blank', 'noopener');
      stato(`Link di ${nome} aperto in WhatsApp Web per +${numero()}.`); chiudi();
    };
    b.querySelector('[data-a="tg"]').onclick = async () => {
      try { await navigator.clipboard.writeText(testo); } catch(e){}
      window.open(`https://t.me/+${numero()}`, '_blank', 'noopener');
      stato(`Messaggio copiato: incollalo nella chat Telegram di +${numero()}.`); chiudi();
    };
    b.hidden = false;
    setTimeout(() => tel.focus(), 30);
  }

  /* --------------------------- sotto-settori ---------------------------
     Codice, menu del perimetro, rinomina e modifica dei vertici. Le
     scritture passano in POST senza leggere la risposta; la carta si
     aggiorna subito in locale e la lettura successiva conferma. */
  const RE_CODICE = /^[A-Z]\d+[a-z]+$/;
  async function chiediCodice(codem, valore, testo, escluso){
    let errore = '';
    for (;;){
      const v = await chiedi({campo: 1, valore, ok: 'Conferma', segnaposto: 'es. A2b',
        testo: (errore ? errore + '\n\n' : '') + testo});
      if (v === null) return null;
      const c = v.trim().charAt(0).toUpperCase() + v.trim().slice(1).toLowerCase();
      if (!RE_CODICE.test(c)){ errore = 'Formato: iniziale del settore, numero del worksite, lettera (es. A2b, B1a).'; valore = v; continue; }
      if (gruppi.some(g => g.CODEM === codem && codiceDi(g) === c && g !== escluso)){
        errore = `${c} esiste già in questa emergenza.`; valore = v; continue;
      }
      return c;
    }
  }
  const postSenzaRisposta = corpo => fetch(URL_BACKEND, {method: 'POST', mode: 'no-cors',
    headers: {'Content-Type': 'text/plain;charset=utf-8'},
    body: JSON.stringify(Object.assign({utente: id.utente}, corpo))});
  const membriGruppo = g => schede.filter(x => x.GRUPPO === g.ID_GRUPPO).map(x => String(x.ID_CONTATTO));

  function menuGruppo(g, pt){
    const em = emergenze.find(e => e.CODEM === g.CODEM);
    const scrivibile = id && id.ruolo === 'COMANDO' && em && em.STATO === 'ATTIVA' && !g.provvisorio;
    const x = livelli(g);
    const voci = [
      {t: 'titolo', et: `${codiceDi(g)} · settore ${x.settore}, worksite ${codiceWs(x.settore, x.ws)}`},
      {t: 'nota', et: `${g.N_SCHEDE} schede${g.provvisorio ? ' · ⏳ in salvataggio' : ''}`},
      {et: '🔍 Inquadra', f: () => { const b = limitiDi([g]); if (b) map.fitBounds(b, {padding: [40, 40], maxZoom: 17}); }}
    ];
    if (id && id.ruolo === 'COMANDO' && !g.provvisorio)
      voci.push({et: '🖨 PDF del sotto-settore', f: () => stampa(schede.filter(s => s.GRUPPO === g.ID_GRUPPO), codiceDi(g), [g])});
    if (id && id.ruolo === 'COMANDO' && !g.provvisorio){
      voci.push({et: `🔗 Link per il campo (${codiceDi(g)})`, f: () => linkCampo([g], codiceDi(g))});
      const ws = gruppi.filter(y => y.CODEM === g.CODEM && livelli(y).settore === x.settore && livelli(y).ws === x.ws);
      voci.push({et: `🔗 Link per il campo (worksite ${codiceWs(x.settore, x.ws)})`,
        f: () => linkCampo(ws, `Worksite ${codiceWs(x.settore, x.ws)}`)});
    }
    if (scrivibile){
      voci.push({et: '✏️ Modifica il perimetro', f: () => modificaPerimetro(g)});
      voci.push({et: '🏷 Cambia codice', f: () => rinominaGruppo(g)});
      voci.push({et: '🗑 Elimina', rosso: 1, f: () => eliminaGruppi([g], codiceDi(g))});
    }
    apriMenu(voci, pt);
  }

  async function rinominaGruppo(g){
    const nuovo = await chiediCodice(g.CODEM, codiceDi(g), `Nuovo codice per ${codiceDi(g)}:`, g);
    if (!nuovo || nuovo === codiceDi(g)) return;
    const prima = {NOME: g.NOME, COLORE: g.COLORE};
    g.NOME = nuovo; g.COLORE = coloreSettore(livelli(g).settore);
    disegnaGruppi(); elencoGruppi();
    stato(`Cambio codice in ${nuovo}…`);
    try {
      await postSenzaRisposta({azione: 'salvaGruppo', codem: g.CODEM, idGruppo: g.ID_GRUPPO,
        nome: nuovo, colore: g.COLORE, geojson: g.GEOJSON, idContatti: membriGruppo(g)});
      await ricarica(true);
      stato(`${prima.NOME === nuovo ? '' : codiceDi({NOME: prima.NOME}) + ' → '}${nuovo}.`);
    } catch(e){ Object.assign(g, prima); disegnaGruppi(); elencoGruppi(); stato('Codice non cambiato: ' + e.message); }
  }

  /* Modifica dei vertici: si lavora su una copia modificabile del perimetro,
     con lo snap sugli altri. Salvando, le schede si ricalcolano: entrano
     quelle ora dentro, escono quelle rimaste fuori. */
  let barraModifica = null;
  function modificaPerimetro(g){
    if (inModifica) return;
    const geo = g.GEOJSON.geometry || g.GEOJSON;
    const ll = geo.coordinates[0].map(p => [p[1], p[0]]);
    if (ll.length > 1 && ll[0][0] === ll[ll.length - 1][0] && ll[0][1] === ll[ll.length - 1][1]) ll.pop();
    inModifica = g.ID_GRUPPO;
    occupato = true;
    disegnaGruppi();
    const ed = L.polygon(ll, {color: g.COLORE, weight: 3, fillOpacity: .12}).addTo(map);
    ed.pm.enable({allowSelfIntersection: false, snappable: true, snapDistance: 22});
    guida(`Modifica ${codiceDi(g)}: trascina i vertici, clic su un punto medio per aggiungerne uno, tasto destro su un vertice per toglierlo.`);
    if (!barraModifica){
      barraModifica = document.createElement('div');
      barraModifica.className = 'diff-barra-modifica';
      app.querySelector('.diff-mapwrap').appendChild(barraModifica);
    }
    barraModifica.innerHTML = '<button type="button" class="btn-toggle-radar" data-a="ok">✔ Salva perimetro</button>'
      + '<button type="button" class="btn-toggle-radar diff-rosso" data-a="no">✖ Annulla</button>';
    barraModifica.hidden = false;
    const fine = () => {
      ed.pm.disable(); map.removeLayer(ed);
      inModifica = null; occupato = false;
      barraModifica.hidden = true; guida('');
      document.removeEventListener('keydown', tasti);
      disegnaGruppi();
    };
    const tasti = e => { if (e.key === 'Escape'){ fine(); stato('Modifica annullata.'); } };
    document.addEventListener('keydown', tasti);
    barraModifica.querySelector('[data-a="no"]').onclick = () => { fine(); stato('Modifica annullata.'); };
    barraModifica.querySelector('[data-a="ok"]').onclick = async () => {
      const anello = ed.getLatLngs()[0];
      const nuovoGeo = ed.toGeoJSON();
      const dentroOra = schede.filter(s => s.CODEM === g.CODEM && conPosizione(s)
        && dentro(num(s.LAT), num(s.LON), anello));
      if (!dentroOra.length) return stato('Il perimetro non contiene schede: allargalo o annulla.');
      fine();
      /* In locale subito: perimetro nuovo e schede riassegnate. */
      const ids = new Set(dentroOra.map(s => String(s.ID_CONTATTO)));
      schede.forEach(s => {
        if (s.CODEM !== g.CODEM) return;
        if (ids.has(String(s.ID_CONTATTO))) s.GRUPPO = g.ID_GRUPPO;
        else if (s.GRUPPO === g.ID_GRUPPO) s.GRUPPO = '';
      });
      g.GEOJSON = nuovoGeo; g.N_SCHEDE = ids.size;
      disegna();
      stato(`Salvataggio del perimetro di ${codiceDi(g)}…`);
      try {
        await postSenzaRisposta({azione: 'salvaGruppo', codem: g.CODEM, idGruppo: g.ID_GRUPPO,
          nome: g.NOME, colore: g.COLORE, geojson: nuovoGeo, idContatti: [...ids]});
        await ricarica(true);
        stato(`${codiceDi(g)}: perimetro salvato, ${ids.size} schede.`);
      } catch(e){ await ricarica(true); stato('Perimetro non salvato: ' + e.message); }
    };
  }

  /* ------------------------ menu del tasto destro ------------------------
     Sulla scheda: aprirla, copiare il telefono, aprire la navigazione e —
     per il Comando, su emergenza in corso — spostarla in un sottosettore o
     toglierla dal suo, senza ridisegnare il perimetro. */
  let menuBox = null;
  const chiudiMenu = () => { if (menuBox) menuBox.hidden = true; };
  /* Il clic che apre il menu di un perimetro arriva anche qui: il menu
     appena aperto non va richiuso dallo stesso clic. */
  map.on('click movestart zoomstart', () => {
    if (menuBox && Date.now() - (menuBox._aperto || 0) < 250) return;
    chiudiMenu();
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') chiudiMenu(); });

  /* Il menu compare subito con quello che c'è; i dati della scheda
     (indirizzo, telefono) arrivano col dettaglio e lo completano. */
  function menuScheda(s, pt){
    const k = s.CODEM + '|' + s.ID_CONTATTO;
    const d = dettagli.get(k);
    disegnaMenu(d || s, pt, !d);
    if (menuBox) menuBox._k = k;
    if (!d) leggiDettaglio(id, s).then(dd => {
      if (menuBox && !menuBox.hidden && menuBox._k === k) disegnaMenu(dd, pt, false);
    }).catch(() => {});
  }
  function disegnaMenu(s, pt, carico){
    if (!menuBox){
      menuBox = document.createElement('div');
      menuBox.className = 'diff-menu';
      app.querySelector('.diff-mapwrap').appendChild(menuBox);
    }
    const g = gruppoDi(s);
    const em = emergenze.find(e => e.CODEM === s.CODEM);
    const scrivibile = id && id.ruolo === 'COMANDO' && em && em.STATO === 'ATTIVA';
    const altri = gruppi.filter(x => x.CODEM === s.CODEM && x !== g)
      .sort((a, b) => codiceDi(a).localeCompare(codiceDi(b), 'it', {numeric: true}));
    const voci = [
      {t: 'titolo', et: indirizzo(s) || s.CITTA || s.ID_CONTATTO},
      {et: '📄 Apri la scheda', f: () => {
        const x = marcatori.get(chiave(s)); if (x && x.m) x.m.openPopup(); }},
      carico ? {t: 'nota', et: '⏳ carico i dati della scheda…'}
        : s.CLI ? {et: '📋 Copia il telefono', f: ev => NS.copiaTesto(ev, s.CLI)} : null,
      {et: '🧭 Apri in Google Maps', f: () => window.open(
        `https://www.google.com/maps?q=${num(s.LAT)},${num(s.LON)}`, '_blank', 'noopener')}
    ];
    if (sbloccabile(s)) voci.push({et: '🔓 Sblocca la valutazione', f: () => sbloccaScheda(s)});
    if (valutabileDaSala(s)) voci.push({et: '📝 Valuta dalla Sala', f: () => valutaDaSala(s)});
    if (scrivibile){
      voci.push({t: 'titolo', et: g ? 'In ' + codiceDi(g) : 'Senza settore'});
      altri.forEach(x => voci.push({et: `➜ Sposta in ${codiceDi(x)}`, f: () => spostaScheda(s, x)}));
      if (g) voci.push({et: '✖ Togli da ' + codiceDi(g), rosso: 1, f: () => spostaScheda(s, null)});
      if (!altri.length && !g) voci.push({t: 'nota', et: 'Nessun settore: disegnane uno con "Crea settore".'});
    }
    apriMenu(voci, pt);
  }
  function apriMenu(voci, pt){
    if (!menuBox){
      menuBox = document.createElement('div');
      menuBox.className = 'diff-menu';
      app.querySelector('.diff-mapwrap').appendChild(menuBox);
    }
    menuBox.innerHTML = '';
    voci.filter(Boolean).forEach(v => {
      if (v.t){
        const p = document.createElement('p');
        p.className = v.t === 'titolo' ? 'diff-menu-tit' : 'diff-menu-nota';
        p.textContent = v.et;
        menuBox.appendChild(p);
        return;
      }
      const b = document.createElement('button');
      b.type = 'button'; b.textContent = v.et;
      if (v.rosso) b.className = 'diff-rosso';
      b.onclick = ev => { chiudiMenu(); v.f(ev); };
      menuBox.appendChild(b);
    });
    menuBox.hidden = false;
    menuBox._aperto = Date.now();
    const sz = map.getSize(), w = menuBox.offsetWidth, h = menuBox.offsetHeight;
    menuBox.style.left = Math.max(4, Math.min(sz.x - w - 4, pt.x + 4)) + 'px';
    menuBox.style.top = Math.max(4, Math.min(sz.y - h - 4, pt.y + 4)) + 'px';
  }

  /* Cambiare settore a una scheda è salvare di nuovo il sottosettore con
     l'elenco aggiornato: il backend assegna gli ID elencati e libera quelli
     tolti. Si passa in POST senza risposta, come la creazione. */
  async function salvaMembri(g, ids){
    await fetch(URL_BACKEND, {method: 'POST', mode: 'no-cors',
      headers: {'Content-Type': 'text/plain;charset=utf-8'},
      body: JSON.stringify({azione: 'salvaGruppo', utente: id.utente, codem: g.CODEM, idGruppo: g.ID_GRUPPO,
        nome: g.NOME, colore: g.COLORE, geojson: g.GEOJSON, idContatti: ids})});
  }
  async function spostaScheda(s, verso){
    const da = gruppoDi(s);
    const idS = String(s.ID_CONTATTO);
    const membri = g => schede.filter(x => x.GRUPPO === g.ID_GRUPPO).map(x => String(x.ID_CONTATTO));
    if (da && !verso && membri(da).length <= 1)
      return stato(`${codiceDi(da)} ha solo questa scheda: per toglierla elimina il sottosettore.`);
    stato('Aggiornamento del settore…');
    try {
      if (verso) await salvaMembri(verso, [...new Set(membri(verso).concat(idS))]);
      else await salvaMembri(da, membri(da).filter(x => x !== idS));
      await ricarica(true);
      stato(verso ? `Scheda spostata in ${codiceDi(verso)}.` : `Scheda tolta da ${codiceDi(da)}.`);
    } catch(e){ stato('Spostamento non riuscito: ' + e.message); }
  }

  /* Eliminazione come la creazione: POST senza leggere la risposta (in GET
     a volte la risposta si perde anche quando lo script ha eseguito), poi si
     rilegge finché i sotto-settori non sono spariti. */
  async function eliminaSuServer(gg){
    for (const [i, g] of gg.entries()){
      stato(gg.length > 1 ? `Eliminazione ${i + 1} di ${gg.length}…` : `Eliminazione di ${codiceDi(g)}…`);
      await fetch(URL_BACKEND, {method: 'POST', mode: 'no-cors',
        headers: {'Content-Type': 'text/plain;charset=utf-8'},
        body: JSON.stringify({azione: 'eliminaGruppo', utente: id.utente, codem: g.CODEM, idGruppo: g.ID_GRUPPO})});
    }
    const via = new Set(gg.map(g => g.ID_GRUPPO));
    for (let t = 0; t < 5; t++){
      if (t) await new Promise(r => setTimeout(r, 1500));
      await ricarica(true);
      if (!gruppi.some(g => via.has(g.ID_GRUPPO))) return true;
    }
    return false;
  }

  async function eliminaGruppi(gg, etichetta){
    const n = gg.reduce((a, g) => a + (+g.N_SCHEDE || 0), 0);
    const testo = gg.length === 1
      ? `Eliminare il sotto-settore ${codiceDi(gg[0])}?\nLe ${n} schede restano e tornano senza settore.`
      : `Eliminare ${etichetta}?\nSono ${gg.length} sotto-settori (${gg.map(g => codiceDi(g)).join(', ')}).\n`
        + `Le ${n} schede restano e tornano senza settore.`;
    if (!await chiedi({ok: gg.length === 1 ? 'Elimina' : 'Elimina tutto', rosso: 1, testo})) return;
    try {
      const ok = await eliminaSuServer(gg);
      selezione = null;
      disegnaGruppi(); elencoGruppi();
      stato(ok ? `${gg.length === 1 ? codiceDi(gg[0]) : etichetta} eliminato.`
        : 'Eliminazione inviata ma non ancora visibile: premi Aggiorna tra qualche secondo.');
    } catch(e){ await ricarica(true); stato('Eliminazione non riuscita: ' + e.message); }
  }
  const eliminaGruppo = g => eliminaGruppi([g], codiceDi(g));


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

  /* Si stampa solo quando le tile della vista di stampa sono arrivate:
     si controlla lo stato del livello, non un evento che potrebbe essere
     già passato. Massimo ms, poi si stampa comunque. */
  const attendiTile = ms => new Promise(ok => {
    const l = sfondi[iSfondo].l, t0 = Date.now();
    const giro = () => {
      const carica = typeof l.isLoading === 'function' ? l.isLoading() : !!l._loading;
      if (!carica || Date.now() - t0 > ms) return setTimeout(ok, 250);
      setTimeout(giro, 150);
    };
    setTimeout(giro, 200);
  });

  async function stampa(lista, titolo, gruppo){
    if (!id || id.ruolo !== 'COMANDO') return;
    if (!lista.length) return stato('Nessuna scheda da stampare.');
    occupato = true;
    map.closePopup();

    /* Prima di tutto la carta a schermo va sul settore da stampare (o
       sull'estensione delle schede, nella stampa generale): chi preme 🖨
       vede subito che cosa finirà sul foglio, e ci resta anche dopo. */
    const limiti = () => {
      let x = null;
      [].concat(gruppo || []).filter(g => g && g.GEOJSON).forEach(g => {
        const gb = L.geoJSON(g.GEOJSON).getBounds();
        if (gb.isValid()) x = x ? x.extend(gb) : L.latLngBounds(gb.getSouthWest(), gb.getNorthEast());
      });
      const p = lista.filter(conPosizione).map(s => [num(s.LAT), num(s.LON)]);
      return x || (p.length ? L.latLngBounds(p) : null);
    };
    const inquadraSettore = () => {
      const x = limiti();
      if (x && x.isValid()) map.fitBounds(x, {padding: [40, 40], maxZoom: 17, animate: false});
    };
    inquadraSettore();
    await new Promise(r => setTimeout(r, 350));

    /* La carta ha solo i dati leggeri: per la tabella servono le schede
       intere, che si leggono ora, una lettura per emergenza. */
    try {
      stato('Preparazione della stampa…');
      const intere = new Map();
      for (const c of new Set(lista.map(x => x.CODEM)))
        (await leggiSchedeComplete(id, c)).forEach(x => {
          const k = x.CODEM + '|' + x.ID_CONTATTO;
          intere.set(k, x); dettagli.set(k, Object.assign({}, x));
        });
      lista = lista.map(x => {
        const y = Object.assign({}, x, intere.get(x.CODEM + '|' + x.ID_CONTATTO) || {});
        if (x.LAT_NUE) Object.assign(y, {LAT: x.LAT, LON: x.LON});
        return y;
      });
      stato('');
    } catch(e){
      occupato = false;
      return stato('Stampa non preparata: ' + e.message);
    }
    const ord = lista.slice().sort((a, b) =>
      (a.CITTA || '').localeCompare(b.CITTA || '', 'it')
      || (a.INDIRIZZO || '').localeCompare(b.INDIRIZZO || '', 'it')
      || (parseInt(a.CIVICO, 10) || 0) - (parseInt(b.CIVICO, 10) || 0));
    const quando = new Date().toLocaleString('it-IT', {timeZone: 'Europe/Rome'});
    const righe = ord.map((s, i) => `<tr${prioritaria(s) ? ' class="dp-pr"' : ''}>
      <td class="dp-n"><span style="background:${categoria(s).c}">${i + 1}</span>${prioritaria(s) ? ' ⚠' : ''}</td>
      <td>${esc(categoria(s).n)}</td>
      <td>${esc(indirizzo(s))}</td>
      <td>${esc(s.CITTA)}${s.DISTRETTO ? '<br><small>' + esc(s.DISTRETTO) + '</small>' : ''}</td>
      <td>${esc(s.ADD_INFO)}</td>
      <td>${esc(chiamante(s))}</td>
      <td>${esc(s.CLI)}</td>
      <td>${esc(s.DATA_INS)}</td>
      <td>${s.RMAX ? '±' + esc(Math.round(num(s.RMAX))) + ' m' : '—'}</td>
      <td>${s.VAL && FA() ? esc(FA().stelle(+s.VAL.PRIORITA || 0) + ' ' + FA().tipo(s.VAL.TIPO).n + ' · '
        + FA().esito(s.VAL.ESITO)) : ''}</td>
      <td>${esc(s.ID_CONTATTO)}</td></tr>`).join('');
    const doc = document.createElement('div');
    doc.id = 'diff-stampa-doc';
    doc.innerHTML = `
      <section class="dp-pagina dp-pagina-carta">
        <div class="dp-mappa"></div>
        <div class="dp-cartiglio"><b>${esc(titolo)}</b> · ${esc(ord[0].CODEM)} · ${ord.length} schede · ${esc(quando)}</div>
      </section>
      <section class="dp-pagina dp-pagina-tab">
        <header class="dp-testata"><h1>Elenco schede — ${esc(titolo)}</h1>
          <p>${esc(ord[0].CODEM)} · ordinate per comune e indirizzo</p></header>
        <table class="dp-tab"><thead><tr><th>N.</th><th>Triage</th><th>Indirizzo</th><th>Comune</th>
          <th>Note</th><th>Chiamante</th><th>Telefono</th><th>Inserita</th><th>Precisione</th><th>Valutazione</th><th>Contatto</th>
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

    [livSchede, livAree, livScelta, livGruppi, livCluster, livPriorita, livValutate].forEach(l => map.removeLayer(l));
    const tmp = L.featureGroup().addTo(map);
    const gg = [].concat(gruppo || []).filter(g => g && g.GEOJSON);
    gg.forEach(g => {
      const l = L.geoJSON(g.GEOJSON, {style: {color: g.COLORE, weight: 3, fillOpacity: .05}}).addTo(tmp);
      const c = l.getBounds();
      if (gg.length > 1 && c.isValid()) L.marker(c.getCenter(), {interactive: false,
        icon: L.divIcon({className: 'diff-etichetta-gruppo', iconSize: null,
          html: `<span style="border-color:${esc(g.COLORE)}">${esc(codiceDi(g))}</span>`})}).addTo(tmp);
    });
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
      L.marker(pos, {interactive: false, icon: L.divIcon({className: 'diff-num' + (prioritaria(s) ? ' diff-num-pr' : ''),
        html: `<span style="background:${categoria(s).c}">${i + 1}</span>`,
        iconSize: [22, 22], iconAnchor: [11, 11]})}).addTo(tmp);
    }));
    await attendiTile(6000);

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
      [livGruppi, livAree, livSchede, livScelta, livCluster, livPriorita, livValutate].forEach(l => map.addLayer(l));
      occupato = false;
      setTimeout(() => { map.invalidateSize(); inquadraSettore(); }, 60);
    };
    window.addEventListener('afterprint', ripristina);
    /* Niente nuova inquadratura all'apertura della stampa: la finestra di
       stampa fotografa la pagina subito, e le tile di una vista nuova non
       farebbero in tempo ad arrivare — la carta usciva bianca. Il foglio è
       già preparato alla misura esatta della pagina (277 mm, vedi CSS),
       quindi la vista calcolata prima è quella giusta. */
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
    inquadraProssimo = true;
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

  /* PRIORITÀ 5 — "forza aggiornamento"
     La pagina da campo non può spingere niente alla Sala: è la Sala che
     controlla più spesso. Ogni SENTINELLA_MS si leggono le sole
     valutazioni (poche righe); se ne compare una nuova con priorità 5 si
     ricarica subito tutto e scatta l'allarme viola con un segnale sonoro.
     Le priorità 5 già presenti all'apertura non suonano. */
  const SENTINELLA_MS = 20000;
  let visti5 = null;
  function controllaPriorita5(vals, elenco){
    const p5 = vals.filter(v => +v.PRIORITA === 5 && v.ESITO !== 'duplicato');
    if (!visti5){ visti5 = new Set(p5.map(v => v.ID_ASS)); return false; }
    const nuove = p5.filter(v => !visti5.has(v.ID_ASS));
    nuove.forEach(v => visti5.add(v.ID_ASS));
    if (nuove.length) allarme5(nuove, elenco || schede);
    return nuove.length > 0;
  }
  function suona(){
    try {
      const ac = new (window.AudioContext || window.webkitAudioContext)();
      [0, .35, .7].forEach(t => {
        const o = ac.createOscillator(), g = ac.createGain();
        o.frequency.value = 880; o.connect(g); g.connect(ac.destination);
        g.gain.setValueAtTime(.25, ac.currentTime + t); g.gain.setValueAtTime(0, ac.currentTime + t + .22);
        o.start(ac.currentTime + t); o.stop(ac.currentTime + t + .25);
      });
    } catch(e){}
  }
  function allarme5(nuove, elenco){
    let box = app.querySelector('.diff-allarme5');
    if (!box){
      box = document.createElement('div');
      box.className = 'diff-allarme5';
      app.querySelector('.diff-mapwrap').appendChild(box);
    }
    const righe = nuove.map(v => {
      const s = elenco.find(x => x.CODEM === v.CODEM && String(x.ID_CONTATTO) === String(v.ID_CONTATTO)) || {};
      const g = gruppi.find(x => x.ID_GRUPPO === v.GRUPPO);
      return `${g ? '<b>' + esc(codiceDi(g)) + '</b> · ' : ''}${esc(FA() ? FA().tipo(v.TIPO).n : v.TIPO)}`
        + ` · ${esc(s.CITTA || '')} · ${esc([v.NOMINATIVO, v.SQUADRA].filter(Boolean).join(' — '))}`;
    });
    box.innerHTML = `<b>🚨 PRIORITÀ 5 — URGENTISSIMA</b><span>${righe.join('<br>')}</span>
      <button type="button" class="btn-toggle-radar" data-a="vedi">Mostra</button>
      <button type="button" class="diff-avviso-x" data-a="x" title="Chiudi">×</button>`;
    box.hidden = false;
    box.querySelector('[data-a="x"]').onclick = () => { box.hidden = true; };
    box.querySelector('[data-a="vedi"]').onclick = () => {
      const p = nuove.map(v => elenco.find(x => x.CODEM === v.CODEM && String(x.ID_CONTATTO) === String(v.ID_CONTATTO)))
        .filter(x => x && conPosizione(x)).map(x => [num(x.LAT), num(x.LON)]);
      if (p.length) map.fitBounds(L.latLngBounds(p), {padding: [80, 80], maxZoom: 17});
    };
    suona();
  }
  setInterval(async () => {
    if (app.offsetParent === null || !id || id.errore || !caricato || ricaricaInCorso) return;
    const codem = $('selEmergenza').value || undefined;
    const vals = await leggiValutazioni(id, codem, emergenze, $('archiviate').checked);
    if (controllaPriorita5(vals) && !occupato) ricarica(true);
  }, SENTINELLA_MS);

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