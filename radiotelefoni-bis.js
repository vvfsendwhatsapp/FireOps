/*!
 * FireOps VVF — radiotelefoni-bis.js — Radio e telefoni delle Sale Operative
 *
 * BIS: copia di radiotelefoni.js con in più i canali aeronautici TBT della
 * Direttiva COAU (AERONAUTICI, bloccoAero). Lo stile del riquadro sta in
 * style-bis.css. Per passarla in produzione: questo file sostituisce
 * radiotelefoni.js, le regole di style-bis.css vanno in style.css e il
 * <div id="rt-aero"> va aggiunto anche in index.html.
 *
 * Elenco nazionale delle SO dei Comandi e delle Direzioni con canale VHF
 * e telefono, raggruppato per Direzione, più CON e SOCAV e i canali
 * aeronautici Terra-Bordo-Terra della Direttiva COAU. A video si
 * cerca e si copia il numero con un clic; su carta esce su un solo foglio
 * A4 fronte e retro, da tenere accanto alla consolle.
 *
 * DA DOVE VENGONO I DATI
 * Da window.FireOpsComandi, che script.js pubblica dopo aver letto
 * comandi.json: un secondo fetch prima o poi andrebbe fuori passo. Anche
 * le Direzioni si leggono da lì, perché ogni riga di Comando porta canale
 * e telefono della propria Direzione: direzioni.json non serve.
 * I canali aeronautici TBT (DOS ↔ aeromobili AIB) non sono in comandi.json:
 * vengono dalla Direttiva COAU e stanno in AERONAUTICI, qui sotto.
 * Le selettive (CHS) per ora restano fuori. Per rimetterle: una colonna in
 * COLONNE e TESTATA, una cella in rigaDir e rigaCom, e le larghezze nel CSS.
 * Se due Comandi della stessa Direzione riportano valori diversi vince il
 * più frequente: un refuso su una riga non deve finire sulla carta.
 *
 * IMPAGINAZIONE
 * Quattro colonne, due per facciata. Una Direzione spezzata fra due colonne
 * ripete la testata con "segue", e una testata non resta mai sola in fondo
 * a una colonna. L'altezza delle righe si adatta al loro numero: il foglio
 * si riempie invece di lasciare un terzo bianco, e il corpo del testo
 * cresce con lei fino a 10 pt.
 */
(function () {
'use strict';

/* I nomi delle colonne di comandi.json, scritti una volta sola. */
const CAMPI = {
  comCh: 'Canale Radio Comando', comTel: 'Telefono SO Comando',
  dir: 'Direzione VVF',
  dirCh: 'Canale Radio Direzione', dirTel: 'Telefono SO Direzione',
  conCh: 'Canale Radio CON', conTel: 'Telefono SO CON',
  socavTel: 'Telefono SOCAV',
  confinanti: 'Concatena Comandi Confinanti'
};

/* Misure del foglio stampato, in millimetri. Devono restare allineate al
   CSS (.rt-foglio): `area` è l'altezza utile per le righe, tolte testata,
   piede e intestazione delle colonne, con un paio di millimetri di scorta;
   `naz` è quanto occupa il riquadro CON/SOCAV sulla prima facciata, `aero`
   quello dei canali aeronautici sulla seconda. */
const FOGLIO = {area: 250, naz: 24, aero: 34.5, rigaMax: 8};
const CANALE_NAZIONALE = '100';

/* CANALI AERONAUTICI TBT — Direttiva COAU 2026, § 7.2.
   Frequenze VHF aeronautiche (AM, spaziatura 25 kHz) per i collegamenti
   Terra-Bordo-Terra fra DOS e Comandante / Capo equipaggio degli
   aeromobili AIB. Non stanno in comandi.json perché non sono di un
   Comando: sono della Direttiva, e si cambiano qui quando esce quella
   dell'anno nuovo. Le regioni sono scritte come nel campo Regione di
   comandi.json: così la riga della propria regione si accende da sola.
   `breve` è il testo per la carta, dove la colonna è stretta. */
const AERO_FONTE = 'Direttiva COAU 2026, § 7.2';
/* Frequenza aeronautica internazionale di emergenza (ICAO, "guard"): MAYDAY e PAN PAN. */
const EMERGENZA_AERO = '121.500';
const AERONAUTICI = [
  {mhz: ['122.150', '122.350'], area: 'Tutto il territorio nazionale', breve: 'Nazionale', naz: true},
  {mhz: ['134.550'], regioni: ['Lombardia', 'Emilia-Romagna']},
  {mhz: ['128.500'], regioni: ["Valle d'Aosta", 'Piemonte', 'Liguria', 'Sicilia'],
    breve: "V. d'Aosta, Piemonte, Liguria, Sicilia"},
  {mhz: ['118.775'], regioni: ['Toscana', 'Umbria']},
  {mhz: ['118.525'], regioni: ['Sardegna', 'Calabria', 'Puglia', 'Basilicata']},
  {mhz: ['119.025'], regioni: ['Lazio']},
  {mhz: ['118.625'], regioni: ['Campania']},
  {mhz: ['118.925'], regioni: ['Abruzzo', 'Molise', 'Marche']},
  {mhz: ['141.100', '142.500'], area: 'Tutto il territorio nazionale — militare, secondaria',
    breve: 'Nazionale, militare (secondaria)'},
  {mhz: ['156.800'], mod: 'FM', area: 'Primo contatto con la Capitaneria di Porto (canale 16 nautico)',
    breve: 'Cap. di Porto, 1° contatto (ch 16)'}
];

const val = v => (v == null ? '' : String(v).trim());
const esc = s => val(s).replace(/[<>&"]/g,
  c => ({'<':'&lt;', '>':'&gt;', '&':'&amp;', '"':'&quot;'}[c]));
const norm = s => val(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const oTrattino = v => val(v) || '\u2014';

function moda(valori){
  const conta = new Map();
  valori.map(val).filter(Boolean).forEach(v => conta.set(v, (conta.get(v) || 0) + 1));
  let migliore = '', volte = 0;
  conta.forEach((n, v) => { if (n > volte){ volte = n; migliore = v; } });
  return migliore;
}

/* =====================================================================
   DATI
   ===================================================================== */
function raggruppa(comandi){
  const gruppi = new Map();
  comandi.filter(c => c && val(c.Comando)).forEach(c => {
    const d = val(c[CAMPI.dir]);
    if (!gruppi.has(d)) gruppi.set(d, []);
    gruppi.get(d).push(c);
  });
  return [...gruppi.entries()]
    .sort((a, b) => a[0].localeCompare(b[0], 'it'))
    .map(([nome, lista]) => ({
      nome,
      ch:  moda(lista.map(c => c[CAMPI.dirCh])),
      tel: moda(lista.map(c => c[CAMPI.dirTel])),
      comandi: lista.slice().sort((a, b) =>
        val(a.Comando).localeCompare(val(b.Comando), 'it'))
    }));
}

function nazionali(comandi){
  const di = k => moda(comandi.map(c => c && c[k]));
  return {
    con:   {ch: di(CAMPI.conCh), tel: di(CAMPI.conTel)},
    socav: {tel: di(CAMPI.socavTel)}
  };
}

/* La SO che sta usando la pagina e i suoi confinanti: in una sala il
   primo numero che si cerca è quasi sempre di un vicino. */
function statoAttivo(){
  const a = window.FireOpsComandoAttivo;
  const lim = new Set(val(a && a[CAMPI.confinanti]).split(';').map(s => s.trim()).filter(Boolean));
  const eDir = !!(a && a.tipo === 'direzione');
  return {
    nome: val(a && a.Comando),
    regione: val(a && a.Regione),
    lim, eDir, record: a || null, dir: val(a && a[CAMPI.dir]),
    // con una Direzione regionale attiva: i suoi Comandi e le Direzioni confinanti
    comDir: new Set(eDir ? (a.comandiDirezione || []) : []),
    limDir: new Set(eDir ? Array.from(lim).map(n => regione(n)) : [])
  };
}
/* Le frequenze TBT di una regione, per la Home di script.js (stessa fonte, una sola). */
function aeronauticiPer(reg){
  const r = norm(reg);
  return {
    regionale: AERONAUTICI.filter(v => (v.regioni || []).some(y => norm(y) === r)).flatMap(v => v.mhz),
    nazionale: (AERONAUTICI.find(v => v.naz && !v.mod && !/militare/i.test(v.area || '')) || {}).mhz || [],
    militare: (AERONAUTICI.find(v => /militare/i.test(v.area || '')) || {}).mhz || [],
    capitaneria: ((AERONAUTICI.find(v => v.mod === 'FM') || {}).mhz || []).map(f => f + ' MHz FM'),
    emergenza: EMERGENZA_AERO,
    fonte: AERO_FONTE
  };
}
window.FireOpsAeronautici = aeronauticiPer;

function trovaComando(nome){
  const n = norm(nome);
  if (!n) return null;
  const comandi = Array.isArray(window.FireOpsComandi) ? window.FireOpsComandi : [];
  return comandi.find(c => c && norm(val(c.Comando)) === n) || null;
}

function limitrofiDi(comandoRecord){
  return new Set(val(comandoRecord && comandoRecord[CAMPI.confinanti])
    .split(';').map(s => s.trim()).filter(Boolean));
}

function aggiornaCheckboxVicini(selezionato){
  const cb = $('rt-solo-vicini');
  if (!cb) return;
  cb.disabled = !selezionato;
  if (!selezionato) cb.checked = false;
}

/* Il nome della Direzione si riduce alla regione, comunque sia scritto in
   comandi.json ("Direzione Regionale Lazio", "DIR Lazio", "Lazio"). A video
   ci sta la parola intera; su carta la colonna è stretta, e la fascia grigia
   dice già che quella riga è una Direzione. */
const regione = n => val(n).replace(/^(direzione(\s+regionale)?|dir\.?)(\s+vvf)?\s+/i, '');
const nomeDirezione = (n, schermo) => {
  const r = regione(n);
  if (!r) return 'Senza Direzione indicata';
  return schermo ? 'Direzione ' + r : r;
};

/* =====================================================================
   RIGHE — le stesse per lo schermo e per la carta. A video il telefono
   è lo stesso .telefono-cliccabile del riepilogo e dei popup: azzurro,
   con il segno 📋, e copiato con lo zero davanti. Su carta è testo.
   ===================================================================== */
function numeroCopiabile(v){
  const t = val(v);
  const copia = typeof window.formattaTelefonoPerCopia === 'function'
    ? window.formattaTelefonoPerCopia(t) : t.replace(/\s+/g, '');
  return `<span class="telefono-cliccabile" data-copia="${esc(copia)}">${esc(t)}</span>`;
}

function cellaNumero(v, schermo){
  const t = val(v);
  if (!t) return '<td class="rt-num rt-manca">\u2014</td>';
  return `<td class="rt-num">${schermo ? numeroCopiabile(t) : esc(t)}</td>`;
}

function rigaDir(g, schermo, segue, st){
  const r = regione(g.nome);
  const mia = !!(schermo && st && st.dir && regione(st.dir) === r);
  const lim = !!(schermo && st && st.limDir && st.limDir.has(r));
  const tag = mia ? ` <span class="rt-tag rt-tag-mia">${st.eDir ? 'SO attiva' : 'la tua Direzione'}</span>` : lim ? ' <span class="rt-tag rt-tag-lim">confinante</span>' : '';
  return `<tr class="rt-dir${segue ? ' rt-segue' : ''}${mia ? ' rt-dir-mia' : ''}${lim ? ' rt-dir-lim' : ''}">`
    + `<th scope="rowgroup">${esc(nomeDirezione(g.nome, schermo))}${tag}`
    + (segue ? ' <span class="rt-segue-et">segue</span>' : '') + `</th>`
    + `<td class="rt-ch">${esc(oTrattino(g.ch))}</td>`
    + cellaNumero(g.tel, schermo)
    + `</tr>`;
}

function rigaCom(c, st, schermo){
  const nome = val(c.Comando);
  const attivo = nome === st.nome, lim = st.lim.has(nome), dellaDir = !!(st.comDir && st.comDir.has(nome));
  const classe = (attivo ? ' rt-attivo' : '') + (lim ? ' rt-limitrofo' : '') + (dellaDir ? ' rt-della-dir' : '');
  const tag = !schermo ? '' : attivo ? ' <span class="rt-tag rt-tag-mia">SO attiva</span>'
    : lim ? ' <span class="rt-tag rt-tag-lim">confinante</span>' : dellaDir ? ' <span class="rt-tag rt-tag-dir">della Direzione</span>' : '';
  const cerca = schermo ? ` data-cerca="${esc(norm([nome, c.Provincia, c[CAMPI.comCh],
    c[CAMPI.comTel]].join(' ')))}" data-nome="${esc(nome)}"` : '';
  return `<tr class="rt-com${classe}"${cerca}>`
    + `<td class="rt-nome">${esc(nome)}${tag}</td>`
    + `<td class="rt-ch">${esc(oTrattino(c[CAMPI.comCh]))}</td>`
    + cellaNumero(c[CAMPI.comTel], schermo)
    + `</tr>`;
}

const COLONNE = `<colgroup><col class="rt-c-nome"><col class="rt-c-ch">`
  + `<col class="rt-c-tel"></colgroup>`;
const TESTATA = `<thead><tr><th scope="col">Sala operativa</th>`
  + `<th scope="col" class="rt-ch">CH VHF</th><th scope="col">TEL SO</th></tr></thead>`;

/* Quattro celle per riga, anche dove il dato manca: il riquadro è una
   griglia, e la SOCAV senza canale deve lasciare vuota la colonna del
   canale invece di far scivolare il telefono sotto quello del CON. */
function bloccoNaz(n, schermo){
  const tel = (et, v) => `<span class="rt-naz-dato"><span class="rt-naz-et">${et}</span>`
    + (val(v) ? (schermo ? numeroCopiabile(v) : `<b>${esc(v)}</b>`) : '\u2014') + `</span>`;
  const ch = v => `<span class="rt-naz-dato"><span class="rt-naz-et">CH VHF</span>`
    + `<b class="rt-naz-ch">${esc(oTrattino(v))}</b></span>`;
  return `<div class="rt-naz">`
    + `<div class="rt-naz-voce"><span class="rt-naz-nome">CON</span>`
    + `<span class="rt-naz-desc">Centro Operativo Nazionale</span>`
    + ch(n.con.ch) + tel('TEL SO', n.con.tel)
    + `</div><div class="rt-naz-voce"><span class="rt-naz-nome">CANALE NAZIONALE</span>`
    + `<span class="rt-naz-desc">CMR</span>`
    + ch(CANALE_NAZIONALE) + `<span></span>`
    + `</div><div class="rt-naz-voce"><span class="rt-naz-nome">SOCAV</span>`
    + `<span class="rt-naz-desc">Assistenza al volo</span>`
    + `<span></span>` + tel('TEL', n.socav.tel)
    + `</div>` + (schermo ? vociAeroNaz() : '') + `</div>`
    + (schermo ? `<p class="rt-naz-nota">TBT = DOS ↔ aeromobili AIB, VHF AM (${esc(AERO_FONTE)}). `
      + `Sullo stesso incendio tutti gli aeromobili usano la frequenza della scheda di richiesta di concorso AIB. `
      + `La frequenza regionale è nella scheda di ogni Direzione.</p>` : '');
}

/* A video, accanto a CON e SOCAV, le frequenze che valgono ovunque:
   TBT nazionale e militare, Capitaneria ed emergenza aeronautica. */
function vociAeroNaz(){
  const a = aeronauticiPer('');
  const mhz = (v, mod) => `<span class="rt-naz-dato"><span class="rt-naz-et">FREQ</span>`
    + `<b class="rt-naz-ch rt-naz-mhz">${esc(v)}</b><span class="rt-um">${mod || 'MHz AM'}</span></span>`;
  const voce = (nome, desc, v, mod, cl) => `<div class="rt-naz-voce${cl ? ' ' + cl : ''}"><span class="rt-naz-nome">${nome}</span>`
    + `<span class="rt-naz-desc">${desc}</span>${mhz(v, mod)}<span></span></div>`;
  return voce('TBT NAZIONALE', 'Aeromobili AIB, tutto il territorio', a.nazionale.join(' · '))
    + voce('TBT MILITARE', 'Secondaria, tutto il territorio', a.militare.join(' · '))
    + voce('EMERGENZA AERO', 'MAYDAY · PAN PAN, frequenza internazionale', EMERGENZA_AERO, 'MHz AM', 'rt-naz-emerg')
    + voce('CAPITANERIA', 'Primo contatto, canale 16 nautico', '156.800', 'MHz FM');
}

/* Le frequenze TBT. Si accende la riga della regione del Comando attivo;
   se la Direttiva non le assegna una frequenza propria (Veneto, Friuli,
   Trentino-Alto Adige) si accende la nazionale e la nota lo dice, perché
   una riga spenta lascerebbe il dubbio che il dato manchi. */
function voceAccesa(v, regione){
  const r = norm(regione);
  if (!r) return false;
  if (AERONAUTICI.some(x => (x.regioni || []).some(y => norm(y) === r)))
    return (v.regioni || []).some(y => norm(y) === r);
  return !!v.naz;
}

function bloccoAero(regione, schermo){
  const senzaPropria = val(regione) && !AERONAUTICI.some(x =>
    (x.regioni || []).some(y => norm(y) === norm(regione)));
  const nota = 'Sullo stesso incendio tutti gli aeromobili usano la frequenza della scheda di '
    + 'richiesta di concorso AIB.'
    + (senzaPropria ? ` Per ${esc(regione)} la Direttiva non assegna una frequenza regionale.` : '');
  const voce = v => {
    const testo = schermo ? (v.area || v.regioni.join(', ')) : (v.breve || v.area || v.regioni.join(', '));
    return `<div class="rt-aero-voce${voceAccesa(v, regione) ? ' rt-attivo' : ''}">`
      + `<span class="rt-aero-mhz">` + v.mhz.map((f, i) => `<span class="rt-aero-fq">${esc(f)}`
        + (v.mod && i === v.mhz.length - 1 ? ` <span class="rt-aero-mod">${esc(v.mod)}</span>` : '')
        + `</span>`).join('<span class="rt-aero-sep"> · </span>') + `</span>`
      + `<span class="rt-aero-area">${esc(testo)}</span></div>`;
  };
  const titolo = `<span class="rt-aero-tit">Canali aeronautici TBT</span>`
    + `<span class="rt-aero-sub">DOS ↔ aeromobili AIB · VHF AM, MHz · ${esc(AERO_FONTE)}</span>`;
  const elenco = `<div class="rt-aero-elenco">${AERONAUTICI.map(voce).join('')}</div>`;
  /* A video è un <details> aperto: chi non fa AIB lo chiude con un
     clic e l'elenco delle SO risale. */
  return schermo
    ? `<details class="rt-aero" open><summary>${titolo}</summary>${elenco}`
      + `<p class="rt-aero-nota">${nota}</p></details>`
    : `<div class="rt-aero"><div class="rt-aero-testa">${titolo}</div>${elenco}`
      + `<p class="rt-aero-nota">${nota}</p></div>`;
}

/* =====================================================================
   IMPAGINAZIONE DEL FOGLIO
   ===================================================================== */
function righeDi(gruppi){
  const r = [];
  gruppi.forEach(g => {
    r.push({tipo:'dir', g});
    g.comandi.forEach(c => r.push({tipo:'com', g, c}));
  });
  return r;
}

/* Stende le righe su colonne con i limiti dati; null se non ci stanno. */
function stendi(righe, limiti){
  const col = limiti.map(() => []);
  let i = 0, k = 0;
  while (i < righe.length){
    if (k >= col.length) return null;
    const c = col[k], lim = limiti[k], r = righe[i];
    /* Colonna nuova a Direzione aperta: la testata si ripete, o chi legge
       la seconda metà del gruppo non sa di che Direzione sono. */
    if (!c.length && r.tipo === 'com') c.push({tipo:'dir', g:r.g, segue:true});
    if (c.length >= lim){ k++; continue; }
    /* Una testata nell'ultima riga libera resterebbe sola: va a capo. */
    if (r.tipo === 'dir' && c.length + 1 >= lim){ k++; continue; }
    c.push(r); i++;
  }
  return col;
}

/* Si cerca il numero di righe per colonna più basso con cui tutto entra:
   è quello che dà le righe più alte e il testo più grande. La prima
   facciata ne perde qualcuna al riquadro nazionale, la seconda a quello
   dei canali aeronautici. */
function impagina(gruppi){
  const righe = righeDi(gruppi);
  for (let b = Math.max(3, Math.ceil(righe.length / 4)); b <= righe.length + 8; b++){
    const riga = Math.min(FOGLIO.rigaMax, FOGLIO.area / b);
    const sNaz = Math.ceil(FOGLIO.naz / riga), sAero = Math.ceil(FOGLIO.aero / riga);
    const col = stendi(righe, [b - sNaz, b - sNaz, b - sAero, b - sAero]);
    if (col) return {col, riga, perColonna: b, totale: righe.length};
  }
  return null;
}

function htmlStampa(gruppi, naz, st){
  const imp = impagina(gruppi);
  if (!imp) return '';
  /* Il corpo segue l'altezza della riga fino a 10 pt: oltre, i nomi lunghi
     ("Monza e della Brianza") non entrano più nella loro colonna.
     Le righe invece crescono fino a 8 mm, così il foglio si riempie e fra
     una riga e l'altra resta l'aria che serve a seguirla con gli occhi. */
  const stile = `--rt-riga:${imp.riga.toFixed(2)}mm;`
    + `--rt-corpo:${Math.min(10, imp.riga * 1.35).toFixed(1)}pt`;
  const tabella = col => col.length
    ? `<table class="rt-f-tab">${COLONNE}${TESTATA}<tbody>`
      + col.map(r => r.tipo === 'dir' ? rigaDir(r.g, false, r.segue) : rigaCom(r.c, st, false)).join('')
      + `</tbody></table>`
    : '<div></div>';

  const quando = new Intl.DateTimeFormat('it-IT', {dateStyle:'short', timeStyle:'short',
    timeZone:'Europe/Rome'}).format(new Date());
  const v = window.FIREOPS_VERSIONE;
  const versione = v ? `, FireOps v. ${esc(String(v).replace(/^(\d{4})(\d\d)(\d\d)(\d\d)(\d\d)$/, '$3$2$1$4$5'))}` : '';
  const legenda = 'In grigio le Direzioni regionali.' + (st.nome
    ? ` Fra due filetti la SO di ${esc(st.nome)}, con il filetto a sinistra i Comandi confinanti.`
    : '');
  const testa = n => `<header class="rt-f-testa"><h1>Radio e telefoni delle Sale Operative VVF</h1>`
    + `<p>Facciata ${n} di 2</p></header>`;
  const piede = `<footer class="rt-f-piede"><span>${legenda}</span>`
    + `<span>Stampato il ${esc(quando)}${versione}</span></footer>`;

  return `<section class="rt-foglio" style="${stile}">${testa(1)}${bloccoNaz(naz, false)}`
    + `<div class="rt-f-colonne">${tabella(imp.col[0])}${tabella(imp.col[1])}</div>${piede}</section>`
    + `<section class="rt-foglio" style="${stile}">${testa(2)}${bloccoAero(st.regione, false)}`
    + `<div class="rt-f-colonne">${tabella(imp.col[2])}${tabella(imp.col[3])}</div>${piede}</section>`;
}

/* =====================================================================
   PAGINA

   Gli ascoltatori stanno sul DOCUMENTO e gli elementi si cercano per id a
   ogni gesto, invece di agganciarsi una volta sola ai nodi della sezione.
   Un ascoltatore attaccato a un nodo muore con lui: se la sezione viene
   ricostruita — un innerHTML su un contenitore, una copia, un secondo
   caricamento del markup — l'elenco resta a schermo come testo, ma
   pulsante, ricerca e numeri smettono di rispondere senza un errore.
   Delegando al documento funzionano con qualunque copia sia a schermo.
   ===================================================================== */
const $ = id => document.getElementById(id);
let gruppi = null, naz = null;

/* A tutto schermo l'elenco si legge in due modi, a scelta (ricordata):
   "schede" = una scheda per Direzione con i suoi Comandi, affiancate;
   "tabella" = una riga per Direzione: canale regionale, telefono, TBT e Comandi. */
const LS_VISTA = 'fireops_rt_vista';
let vista = (() => { try { return localStorage.getItem(LS_VISTA) || 'schede'; } catch (e) { return 'schede'; } })();

/* Le frequenze TBT delle regioni di una Direzione (Veneto e TAA ne ha due). */
function regioniDi(g){
  return [...new Set(g.comandi.map(c => val(c.Regione)).filter(Boolean))];
}
/* TBT di una Direzione: la regionale (una sola voce anche se la Direzione ha
   più regioni con la stessa frequenza) e sempre anche la nazionale. Dove la
   Direttiva non dà una regionale (Veneto, Trentino-Alto Adige, Friuli) resta
   la nazionale, scritta come tale. */
function htmlTbt(g){
  const regs = regioniDi(g);
  const naz = aeronauticiPer('').nazionale.join(' · ');
  const perFq = new Map();
  regs.forEach(r => {
    const f = aeronauticiPer(r).regionale.join(' · ');
    if (!perFq.has(f)) perFq.set(f, []);
    perFq.get(f).push(r);
  });
  const piu = perFq.size > 1;
  const voci = [...perFq.entries()].map(([f, rr]) => f
    ? `<span class="rt-tbt-voce"><b class="rt-tbt-fq">${esc(f)}</b> <span class="rt-um">MHz</span>${piu ? ` <span class="rt-tbt-reg">${esc(rr.join(', '))}</span>` : ''}</span>`
    : `<span class="rt-tbt-voce"><b class="rt-tbt-fq">${esc(naz)}</b> <span class="rt-um">MHz</span> <span class="rt-tbt-reg">(nazionale${piu ? ' · ' + esc(rr.join(', ')) : ''})</span></span>`);
  const soloNaz = !regs.length || [...perFq.keys()].every(f => !f);
  return voci.join('') + (soloNaz ? '' : `<span class="rt-tbt-voce rt-tbt-piu">+ naz. ${esc(naz)} MHz</span>`);
}

/* Testata della scheda: il nome su tutta la larghezza, sotto canale regionale,
   telefono della SO di Direzione e TBT, ciascuno con la sua etichetta. */
function testaScheda(g, st){
  const r = regione(g.nome);
  const mia = !!(st.dir && regione(st.dir) === r), lim = !!(st.limDir && st.limDir.has(r));
  const cl = (mia ? ' rt-dir-mia' : '') + (lim ? ' rt-dir-lim' : '');
  const tag = mia ? ` <span class="rt-tag rt-tag-mia">${st.eDir ? 'SO attiva' : 'la tua Direzione'}</span>` : lim ? ' <span class="rt-tag rt-tag-lim">confinante</span>' : '';
  return `<tr class="rt-dir${cl}"><th scope="rowgroup" colspan="3">${esc(nomeDirezione(g.nome, true))}${tag}</th></tr>`
    + `<tr class="rt-dir rt-dir-tbt${cl}"><td colspan="3"><span class="rt-dati-dir">`
    + `<span><span class="rt-tbt-et">CH</span><b class="rt-tbt-fq">${esc(oTrattino(g.ch))}</b></span>`
    + `<span><span class="rt-tbt-et">TEL SO</span>${g.tel ? numeroCopiabile(g.tel) : '\u2014'}</span>`
    + `<span><span class="rt-tbt-et">TBT</span>${htmlTbt(g)}</span></span></td></tr>`;
}

function htmlSchede(st){
  return `<div class="rt-schede">` + gruppi.map(g =>
    `<table class="rt-tab rt-scheda">${COLONNE}`
    + `<tbody class="rt-gruppo" data-cerca="${esc(norm([g.nome, g.ch, g.tel].join(' ')))}">`
    + testaScheda(g, st)
    + g.comandi.map(c => rigaCom(c, st, true)).join('')
    + `</tbody></table>`).join('') + `</div>`;
}

function htmlTabellaDir(st){
  const testa = `<thead><tr><th scope="col">Direzione</th><th scope="col" class="rt-ch">CH radio regionale</th>`
    + `<th scope="col">Telefono SO Direzione</th><th scope="col">TBT regionale</th><th scope="col">Comandi · CH VHF · telefono</th></tr></thead>`;
  const righe = gruppi.map(g => {
    const r = regione(g.nome);
    const mia = !!(st.dir && regione(st.dir) === r), lim = !!(st.limDir && st.limDir.has(r));
    const tag = mia ? ` <span class="rt-tag rt-tag-mia">${st.eDir ? 'SO attiva' : 'la tua Direzione'}</span>` : lim ? ' <span class="rt-tag rt-tag-lim">confinante</span>' : '';
    const com = g.comandi.map(c => {
      const n = val(c.Comando);
      const cl = n === st.nome ? ' rt-attivo' : st.lim.has(n) ? ' rt-limitrofo' : (st.comDir && st.comDir.has(n)) ? ' rt-della-dir' : '';
      const tel = val(c[CAMPI.comTel]);
      return `<span class="rt-chip${cl}" title="${esc(n)}${tel ? ' · ' + esc(tel) : ''}">${esc(n)} <b>${esc(oTrattino(c[CAMPI.comCh]))}</b>`
        + (tel ? ` ${numeroCopiabile(tel)}` : '') + `</span>`;
    }).join('');
    const cerca = norm([g.nome, g.ch, g.tel, ...g.comandi.map(c => [c.Comando, c.Provincia, c[CAMPI.comCh], c[CAMPI.comTel]].join(' '))].join(' '));
    return `<tbody class="rt-gruppo" data-cerca="${esc(cerca)}" data-nomi="${esc(g.comandi.map(c => val(c.Comando)).join('|'))}">`
      + `<tr class="${mia ? 'rt-dir-mia' : ''}${lim ? ' rt-dir-lim' : ''}">`
      + `<th scope="row" class="rt-tdir-nome">${esc(nomeDirezione(g.nome, true))}${tag}</th>`
      + `<td class="rt-ch">${esc(oTrattino(g.ch))}</td>${cellaNumero(g.tel, true)}`
      + `<td class="rt-tdir-tbt">${htmlTbt(g)}</td><td class="rt-tdir-com">${com}</td></tr></tbody>`;
  }).join('');
  return `<table class="rt-tab rt-tab-dir"><colgroup><col style="width:17%"><col style="width:9%"><col style="width:15%"><col style="width:14%"><col></colgroup>`
    + testa + righe + `</table>`;
}

function barraVista(){
  const b = (v, t) => `<button type="button" class="btn-toggle-radar${vista === v ? ' attivo' : ''}" data-rt-vista="${v}">${t}</button>`;
  return `<div class="rt-vista">${b('schede', '🗂 Schede per Direzione')}${b('tabella', '📋 Tabella Direzioni')}</div>`;
}

function aggiorna(){
  const elenco = $('rt-elenco'), boxNaz = $('rt-nazionali');
  if (!elenco || !boxNaz) return false;
  const st = statoAttivo();
  /* I canali aeronautici non dipendono da comandi.json: ci sono anche
     prima che arrivino i dati. Il riquadro si riscrive solo se cambia la
     regione, e chi l'aveva chiuso lo ritrova chiuso. */
  const boxAero = $('rt-aero');
  if (boxAero) boxAero.innerHTML = '';
  if (false){
    const chiuso = boxAero.querySelector('details:not([open])');
    boxAero.innerHTML = bloccoAero(st.regione, true);
    if (chiuso) boxAero.querySelector('details').open = false;
    boxAero.dataset.regione = st.regione + '|';
  }
  const comandi = Array.isArray(window.FireOpsComandi) ? window.FireOpsComandi : [];
  if (!comandi.length) return false;
  gruppi = raggruppa(comandi);
  naz = nazionali(comandi);
  const cbVicini = $('rt-solo-vicini');
  if (cbVicini){
    cbVicini.disabled = !st.nome;
    if (!st.nome) cbVicini.checked = false;
  }
  boxNaz.innerHTML = bloccoNaz(naz, true);
  /* La legenda c'è solo se c'è qualcosa da spiegare: senza Comando
     attivo non ci sono evidenze in tabella. */
  const legenda = st.nome
    ? `<p class="rt-legenda"><span class="rt-legenda-voce"><i class="rt-campione rt-campione-attivo"></i>`
      + `SO di ${esc(st.nome)}</span><span class="rt-legenda-voce">`
      + `<i class="rt-campione rt-campione-lim"></i>Comandi confinanti</span></p>`
    : '';
  elenco.innerHTML = riquadroMio(st) + barraVista()
    + (vista === 'tabella' ? htmlTabellaDir(st) : htmlSchede(st))
    + `<p class="rt-vuoto pagina-nota" hidden></p>`;
  const datalist = $('rt-comandi-list');
  if (datalist){
    datalist.innerHTML = comandi.filter(c => c && val(c.Comando))
      .map(c => `<option value="${esc(val(c.Comando))}">`).join('');
  }
  aggiornaCheckboxVicini(null);
  filtra();
  return true;
}



/* In cima all'elenco, "La tua Sala Operativa": canale e telefono della SO attiva, della sua
   Direzione, i confinanti col loro canale e la frequenza TBT della regione. */
function riquadroMio(st){
  if (!st.nome || !st.record) return '';
  const a = st.record, comandi = Array.isArray(window.FireOpsComandi) ? window.FireOpsComandi : [];
  const voce = (et, nome, ch, tel) => `<div class="rt-mio-voce"><span class="rt-mio-et">${et}</span><b>${esc(nome)}</b>`
    + `<span class="rt-mio-ch">CH ${esc(oTrattino(ch))}</span>${tel ? numeroCopiabile(tel) : ''}</div>`;
  const lim = Array.from(st.lim).map(n => {
    const c = comandi.find(x => val(x.Comando) === n) || (window.FireOpsDirezioniAttivabili || []).find(x => val(x.Comando) === n);
    return `<span class="rt-mio-lim">${esc(n)}${c ? ` <b>${esc(oTrattino(c[CAMPI.comCh]))}</b>` : ''}</span>`;
  }).join('');
  const gMio = (gruppi || []).find(g => regione(g.nome) === regione(st.dir));
  const tbt = gMio ? htmlTbt(gMio) : '';
  return `<div class="rt-mio">`
    + voce('SO attiva', st.nome, a[CAMPI.comCh], a[CAMPI.comTel])
    + (st.eDir ? '' : voce('Direzione', 'Direzione ' + regione(st.dir), a[CAMPI.dirCh], a[CAMPI.dirTel]))
    + (lim ? `<div class="rt-mio-voce rt-mio-limiti"><span class="rt-mio-et">${st.eDir ? 'Direzioni confinanti' : 'Comandi confinanti'}</span>${lim}</div>` : '')
    + (tbt ? `<div class="rt-mio-tbt"><span class="rt-mio-et">TBT della Direzione</span>${tbt}</div>` : '')
    + `</div>`;
}

/* Se l'elenco non c'è ancora — dati arrivati prima che la sezione fosse
   nel DOM, o un avvio andato storto — il primo gesto lo costruisce. */
const pronto = () => !!document.querySelector('#rt-elenco .rt-tab') || aggiorna();

function avvisaDatiMancanti(){
  const elenco = $('rt-elenco');
  if (elenco) elenco.innerHTML = '<p class="pagina-nota">I dati dei Comandi non sono ancora '
    + 'caricati: scegli il Comando attivo dal menu \u2630 e riprova.</p>';
}

/* Cercando il nome di una Direzione si vede tutto il gruppo; cercando
   un Comando, un canale o un numero si vede la riga con la sua testata. */
function soloVicini(){
  const cb = $('rt-solo-vicini');
  return !!(cb && !cb.disabled && cb.checked);
}

function filtra(){
  const cerca = $('rt-cerca'), elenco = $('rt-elenco');
  if (!cerca || !elenco) return;
  const testo = cerca.value;
  const t = norm(testo);
  const selezionato = trovaComando(testo);
  aggiornaCheckboxVicini(selezionato);
  const vic = soloVicini();
  const lim = selezionato ? limitrofiDi(selezionato) : new Set();
  const nomeSel = selezionato ? val(selezionato.Comando) : '';

  let visibili = 0;
  elenco.querySelectorAll('tbody.rt-gruppo').forEach(tb => {
    let qui = 0;
    if (!tb.querySelector('tr.rt-com')){
      const nomi = (tb.dataset.nomi || '').split('|');
      const ok = vic && selezionato ? nomi.some(n => n === nomeSel || lim.has(n))
        : (!t || (tb.dataset.cerca || '').includes(t));
      tb.hidden = !ok;
      if (ok) visibili++;
      return;
    }
    tb.querySelectorAll('tr.rt-com').forEach(tr => {
      const nomeRiga = tr.dataset.nome;
      const ok = vic && selezionato
        ? (nomeRiga === nomeSel || lim.has(nomeRiga))
        : (!t || (tb.dataset.cerca || '').includes(t) || (tr.dataset.cerca || '').includes(t));
      tr.hidden = !ok;
      if (ok) qui++;
    });
    tb.hidden = qui === 0;
    const tab = tb.closest('table.rt-scheda');
    if (tab) tab.hidden = tb.hidden;
    if (!tb.hidden) visibili++;
  });
  const vuoto = elenco.querySelector('.rt-vuoto');
  if (vuoto){
    vuoto.hidden = visibili > 0;
    vuoto.textContent = vic && selezionato
      ? `Nessun Comando confinante indicato per ${esc(nomeSel)}.`
      : `Nessuna sala corrisponde a \u00ab${cerca.value.trim()}\u00bb.`;
  }
}

/* Il foglio è costruito a parte e appeso al body per il tempo della
   stampa: la pagina a video vive dentro un pannello a mezza larghezza,
   e da lì non uscirebbe mai un A4 pulito. Il titolo del documento è il
   nome che la finestra di stampa propone per il PDF. */
function stampa(){
  if (!gruppi && !aggiorna()) return avvisaDatiMancanti();
  let doc = $('rt-stampa-doc');
  if (!doc){
    doc = document.createElement('div');
    doc.id = 'rt-stampa-doc';
    document.body.appendChild(doc);
  }
  doc.innerHTML = htmlStampa(gruppi, naz, statoAttivo());
  const titolo = document.title;
  const oggi = new Intl.DateTimeFormat('sv-SE', {timeZone:'Europe/Rome'}).format(new Date());
  document.title = `Radio-telefoni-SO-VVF_${oggi}`;
  document.body.classList.add('rt-stampa');
  const fine = () => {
    window.removeEventListener('afterprint', fine);
    document.body.classList.remove('rt-stampa');
    document.title = titolo;
  };
  window.addEventListener('afterprint', fine);
  window.print();
}

/* copiaTesto si legge al momento del clic e non all'avvio: se il core
   ricrea window.FireOps dopo questo file, un riferimento preso prima
   punterebbe a un oggetto vuoto e la copia avverrebbe senza conferma. */
function copia(ev, testo){
  const F = window.FireOps;
  if (F && typeof F.copiaTesto === 'function') F.copiaTesto(ev, testo);
  else if (navigator.clipboard) navigator.clipboard.writeText(testo).catch(() => {});
}

function avvia(){
  document.addEventListener('click', ev => {
    const t = ev.target;
    if (!t || !t.closest) return;
    if (t.closest('#rt-bStampa')){ stampa(); return; }
    const bv = t.closest('#radio-telefoni [data-rt-vista]');
    if (bv){
      vista = bv.dataset.rtVista;
      try { localStorage.setItem(LS_VISTA, vista); } catch (e) {}
      aggiorna();
      return;
    }
    const n = t.closest('#radio-telefoni .telefono-cliccabile');
    if (n) copia(ev, n.dataset.copia);
  });

  document.addEventListener('input', ev => {
    if (!ev.target || ev.target.id !== 'rt-cerca') return;
    if (pronto()) filtra();
    else avvisaDatiMancanti();
  });

  document.addEventListener('change', ev => {
  if (!ev.target || ev.target.id !== 'rt-solo-vicini') return;
  if (pronto()) filtra();
});

  /* script.js annuncia qui il Comando attivo, e lo fa dopo aver caricato
     comandi.json: lo stesso segnale porta i dati la prima volta e sposta
     l'evidenza della propria SO le volte successive. */
  document.addEventListener('fireops:comando-attivo-cambiato', aggiorna);
  aggiorna();

  (window.FireOps = window.FireOps || {}).RadioTelefoni = {aggiorna, stampa};
}

/* Esposte per le prove: nessun effetto sulla pagina. */
(window.FireOps = window.FireOps || {}).RadioTelefoniInterni = {raggruppa, impagina, stendi, righeDi, htmlStampa, nazionali,
  bloccoAero, voceAccesa, AERONAUTICI};

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', avvia);
else avvia();
})();
