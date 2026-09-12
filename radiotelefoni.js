/*!
 * FireOps VVF — radiotelefoni.js — Radio e telefoni delle Sale Operative
 *
 * Elenco nazionale delle SO dei Comandi e delle Direzioni con canale VHF
 * e telefono, raggruppato per Direzione, più CON e SOCAV. A video si
 * cerca e si copia il numero con un clic; su carta esce su un solo foglio
 * A4 fronte e retro, da tenere accanto alla consolle.
 *
 * DA DOVE VENGONO I DATI
 * Da window.FireOpsComandi, che script.js pubblica dopo aver letto
 * comandi.json: un secondo fetch prima o poi andrebbe fuori passo. Anche
 * le Direzioni si leggono da lì, perché ogni riga di Comando porta canale
 * e telefono della propria Direzione: direzioni.json non serve.
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
   `naz` è quanto occupa il riquadro CON/SOCAV sulla prima facciata. */
const FOGLIO = {area: 250, naz: 24, rigaMax: 8};
const CANALE_NAZIONALE = '100';

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
  return {
    nome: val(a && a.Comando),
    lim: new Set(val(a && a[CAMPI.confinanti]).split(';').map(s => s.trim()).filter(Boolean))
  };
}

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

function rigaDir(g, schermo, segue){
  return `<tr class="rt-dir${segue ? ' rt-segue' : ''}">`
    + `<th scope="rowgroup">${esc(nomeDirezione(g.nome, schermo))}`
    + (segue ? ' <span class="rt-segue-et">segue</span>' : '') + `</th>`
    + `<td class="rt-ch">${esc(oTrattino(g.ch))}</td>`
    + cellaNumero(g.tel, schermo)
    + `</tr>`;
}

function rigaCom(c, st, schermo){
  const nome = val(c.Comando);
  const classe = (nome === st.nome ? ' rt-attivo' : '') + (st.lim.has(nome) ? ' rt-limitrofo' : '');
  const cerca = schermo ? ` data-cerca="${esc(norm([nome, c.Provincia, c[CAMPI.comCh],
    c[CAMPI.comTel]].join(' ')))}" data-nome="${esc(nome)}"` : '';
  return `<tr class="rt-com${classe}"${cerca}>`
    + `<td class="rt-nome">${esc(nome)}</td>`
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
    + `</div></div>`;
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
   facciata ne perde qualcuna al riquadro nazionale. */
function impagina(gruppi){
  const righe = righeDi(gruppi);
  for (let b = Math.max(3, Math.ceil(righe.length / 4)); b <= righe.length + 8; b++){
    const riga = Math.min(FOGLIO.rigaMax, FOGLIO.area / b);
    const sottratte = Math.ceil(FOGLIO.naz / riga);
    const col = stendi(righe, [b - sottratte, b - sottratte, b, b]);
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
    + `<section class="rt-foglio" style="${stile}">${testa(2)}`
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

function aggiorna(){
  const elenco = $('rt-elenco'), boxNaz = $('rt-nazionali');
  if (!elenco || !boxNaz) return false;
  const comandi = Array.isArray(window.FireOpsComandi) ? window.FireOpsComandi : [];
  if (!comandi.length) return false;
  gruppi = raggruppa(comandi);
  naz = nazionali(comandi);
  const st = statoAttivo();
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
  elenco.innerHTML = legenda + `<table class="rt-tab">${COLONNE}${TESTATA}`
    + gruppi.map(g => `<tbody class="rt-gruppo" data-cerca="${esc(norm([g.nome, g.ch, g.tel].join(' ')))}">`
      + rigaDir(g, true, false)
      + g.comandi.map(c => rigaCom(c, st, true)).join('')
      + `</tbody>`).join('')
    + `</table><p class="rt-vuoto pagina-nota" hidden></p>`;
  const datalist = $('rt-comandi-list');
  if (datalist){
    datalist.innerHTML = comandi.filter(c => c && val(c.Comando))
      .map(c => `<option value="${esc(val(c.Comando))}">`).join('');
  }
  aggiornaCheckboxVicini(null);
  filtra();
  return true;
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
    tb.querySelectorAll('tr.rt-com').forEach(tr => {
      const nomeRiga = tr.dataset.nome;
      const ok = vic && selezionato
        ? (nomeRiga === nomeSel || lim.has(nomeRiga))
        : (!t || (tb.dataset.cerca || '').includes(t) || (tr.dataset.cerca || '').includes(t));
      tr.hidden = !ok;
      if (ok) qui++;
    });
    tb.hidden = qui === 0;
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
(window.FireOps = window.FireOps || {}).RadioTelefoniInterni = {raggruppa, impagina, stendi, righeDi, htmlStampa, nazionali};

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', avvia);
else avvia();
})();