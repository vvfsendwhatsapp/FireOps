/*!
 * FireOps VVF — sitac-simboli.js — simbologia SI.TA.C.
 *
 * Fonte: "SI.TA.C. — Cartografia Operativa", Corpo Nazionale dei Vigili del
 * Fuoco, Direzione Centrale per l'Emergenza, il Soccorso Tecnico e
 * l'Antincendio Boschivo, Ufficio Pianificazione e Coordinamento Servizio
 * AIB, Roma 2021. A cura di Gianfilippo Micillo e Luca Torrini.
 *
 * I simboli della tavola sono qui ridisegnati in SVG: sono forme geometriche
 * regolari — la pubblicazione dice esplicitamente che sono studiati per poter
 * essere tracciati a mano su carta — quindi si generano da poche primitive
 * invece di ricalcare un tracciato per volta.
 *
 * LE QUATTRO TAVOLE
 * L'originale è diviso in quattro fogli, e questo file mantiene la stessa
 * partizione: la zona di intervento, l'evoluzione dell'incendio, il
 * dispositivo di intervento, le azioni. `g` è la tavola, `sg` il riquadro
 * interno (Dispositivo aereo, Squadre a terra, Evacuazione…).
 *
 * DUE STATI, NON DUE SIMBOLI
 * La tavola distingue sistematicamente i due momenti, ma con parole diverse:
 * previsto/attivo per i mezzi, prevista/attiva per il DOS e le squadre,
 * prevista/effettuata per tutte le azioni. Qui non sono due voci ma un
 * parametro `stato`; le parole le sceglie sitac.js leggendo `g` e `f`.
 *
 * PENDENZE E VENTO SONO TRACCIATI, NON PUNTI
 * Una pendenza e una direzione di vento hanno un verso e una lunghezza sul
 * terreno: come punto orientabile si leggevano solo dopo aver trascinato una
 * maniglia, e in stampa non dicevano da dove a dove. Adesso sono linee con
 * la freccia in punta e le codine in coda — a T per la pendenza, a 45° per
 * il vento — una, due o tre secondo l'intensità. La chiave NON cambia
 * (`pend_lieve`, `vento_forte`…): i GeoJSON vecchi restano leggibili, ma la
 * geometria che si esporta ora è una LineString invece di un Point.
 *
 * COSA VIAGGIA NEL GEOJSON
 * La chiave (`vvf`, `origine`, `lancio_pesante_acqua`…), lo stato e
 * l'eventuale testo. Le chiavi sono identificativi tecnici: non vanno
 * tradotte né rinominate, o i file salvati diventano illeggibili.
 *
 * I FLAG
 * `r` i simboli che vanno orientati; `e` quelli che la tavola vuole
 * accompagnati da un testo (la matricola del mezzo, il numero della
 * squadra: nella tavola sono i puntini di "CAN ......."); `s` quelli che
 * hanno i due stati; `f` quelli di genere femminile, che al posto di
 * previsto/attivo leggono prevista/attiva.
 *
 * I colori sono normativi: rosso il dispositivo VVF e il fuoco, verde il
 * soccorso sanitario e l'evacuazione, azzurro l'acqua e le forze di polizia,
 * nero il terreno e le infrastrutture. Non vanno rimappati sulla palette di
 * FireOps: qui distinguono un lancio d'acqua da uno di ritardante.
 */
(function () {
'use strict';
const NS = (window.FireOps = window.FireOps || {});

const C = {
  rosso:  '#cc0000',
  verde:  '#009900',
  acqua:  '#29abe2',
  polizia:'#00a0e3',
  giallo: '#ffe000',
  nero:   '#000000'
};

/* Tutti i simboli puntuali vivono in una tela 64x64: un unico sistema di
   coordinate rende confrontabili gli ingombri e semplifica l'ancoraggio. */
const T = dentro => `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">${dentro}</svg>`;
const esc = s => String(s == null ? '' : s).replace(/[<>&"]/g,
  c => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;'}[c]));
const attivo = o => (o && o.stato) === 'attivo';

/* La tavola lascia sulla carta lo spazio per una matricola breve: quattro
   caratteri sono il massimo che sta nella banda senza rimpicciolire il
   simbolo. Il taglio va fatto qui e non solo nell'input, o un GeoJSON
   arrivato da fuori sfonda comunque il riquadro. */
const ID_MAX = 6;
const idTesto = o => String((o && o.testo) || '').trim().slice(0, ID_MAX);

/* Lo stesso simbolo può comparire nel pannello e sulla mappa: con un id
   fisso il browser risolve url(#...) sulla prima occorrenza nel documento
   e le altre restano senza campitura appena quella viene rimossa dal DOM. */
let seq = 0;
const uid = p => `sitac-${p}-${++seq}`;

function txt(x, y, s, col, dim, ancora, trasforma){
  return `<text x="${x}" y="${y}" text-anchor="${ancora || 'middle'}" font-size="${dim || 13}"`
    + (trasforma ? ` transform="${trasforma}"` : '')
    + ` font-family="Arial,Helvetica,sans-serif" font-weight="700" fill="${col}">${esc(s)}</text>`;
}
/* La riga di puntini è il posto dove sulla carta si scrive a penna il
   numero della squadra o la matricola del mezzo: va lasciata anche a video. */
const puntini = (x1, x2, y, col) =>
  `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${col}" stroke-width="1.6" stroke-dasharray="1.5,2.5"/>`;

const RIG = (id, col, largo) => `<pattern id="${id}" width="7" height="7" patternUnits="userSpaceOnUse"`
  + ` patternTransform="rotate(45)"><line x1="3.5" y1="0" x2="3.5" y2="7" stroke="${col}" stroke-width="${largo}"/></pattern>`;

/* =====================================================================
   1. FAMIGLIE
   ===================================================================== */

/* Dispositivo aereo: riquadro con le diagonali e una banda in basso. La
   sigla è FISSA (CAN, S64, Boss): quello che si digita finisce sui
   puntini accanto, che sulla carta è dove si scrive la matricola. */
function mezzoAereo(sigla){
  return o => {
    const p = attivo(o), R = C.rosso;
    const x1 = 2, y1 = 9, x2 = 62, y2 = 41, ym = 55;
    const cx = (x1 + x2) / 2, cy = (y1 + y2) / 2;
    const dia = `<path d="M${x1} ${y1}L${x2} ${y2}M${x2} ${y1}L${x1} ${y2}" stroke="${R}" stroke-width="2.2" fill="none"/>`;
    const corpo = (p ? `<path d="M${x1} ${y1}V${y2}L${cx} ${cy}ZM${x2} ${y1}V${y2}L${cx} ${cy}Z" fill="${R}"/>` : '') + dia;

    const s = sigla || '';
    const n = idTesto(o);
    const bx1 = x1 + 3, bx2 = x2 - 3, base = ym - 4;
    const dim = (t, max, cap) => Math.min(max, cap / (t.length * 0.58));
    let banda;
    if (s){
      const dimS = dim(s, 12, 38), xn = bx1 + s.length * dimS * 0.58 + 3;
      banda = txt(bx1, base, s, R, dimS, 'start')
        + (n ? txt(xn, base, n, R, dim(n, 10, bx2 - xn), 'start')
             : puntini(xn, bx2, base - 4, R));
    } else {
      banda = n ? txt(bx1, base, n, R, dim(n, 12, bx2 - bx1), 'start')
                : puntini(bx1, bx2, base - 4, R);
    }
    return T(`<rect x="${x1}" y="${y1}" width="${x2-x1}" height="${y2-y1}" fill="#fff" stroke="${R}" stroke-width="2.8"/>
      ${corpo}
      <rect x="${x1}" y="${y2}" width="${x2-x1}" height="${ym-y2}" fill="#fff" stroke="${R}" stroke-width="2.8"/>
      ${banda}`);
  };
}

/* Dispositivo terrestre: riquadro con la sigla al centro e l'asta sopra
   che conta il livello — una per la squadra, due per il modulo/gruppo, tre
   per il modulo UE/colonna. Attivo = triangolo pieno a destra. */
function mezzoTerra(sigla, aste, col){
  return o => {
    const p = attivo(o), K = col || C.rosso;
    const x1 = 3, y1 = 20, x2 = 61, y2 = 46, xc = (x1 + x2) / 2;
    let a = '';
    for (let i = 0; i < aste; i++){
      const x = (xc - (aste - 1) * 4 + i * 8).toFixed(1);
      a += `<line x1="${x}" y1="${y1}" x2="${x}" y2="${y1-8}" stroke="${K}" stroke-width="2.2"/>`;
    }
    const s = sigla || '';
    const n = idTesto(o);
    const et = s ? (n ? s + ' ' + n : s) : n;
    const largo = (p ? x2 - 16 : x2) - x1 - 8;
    const dim = et ? Math.min(15, largo / (et.length * 0.6)) : 15;
    return T(`${a}
      <rect x="${x1}" y="${y1}" width="${x2-x1}" height="${y2-y1}" fill="#fff" stroke="${K}" stroke-width="2.6"/>
      ${p ? `<path d="M${x2-(y2-y1)} ${y2}H${x2}V${y1}Z" fill="${K}"/>` : ''}
      ${et ? txt(p ? xc - 5 : xc, y2 - 8, et, K, dim) : ''}`);
  };
}

/* Lanci: ellisse per i mezzi pesanti, cerchio per gli elicotteri; rigato
   per il ritardante, vuoto per l'acqua. Prevista = tratteggiata. */
function lancio(grande, ritardante){
  return o => {
    const p = attivo(o), K = ritardante ? C.rosso : C.acqua;
    const tratto = p ? '' : ' stroke-dasharray="5,4"';
    const forma = grande ? `<ellipse cx="32" cy="32" rx="29" ry="14"` : `<circle cx="32" cy="32" r="17"`;
    const id = uid('rig');
    return T((ritardante ? `<defs>${RIG(id, C.rosso, 2.2)}</defs>` : '')
      + `${forma} fill="${ritardante ? `url(#${id})` : 'none'}" stroke="${K}" stroke-width="2.6"${tratto}/>`);
  };
}

/* Il vento resta disponibile anche come GLIFO puntuale, ma solo per il
   quadro fisso in alto a sinistra sulla carta: lì non c'è un tracciato da
   decorare, c'è un dato di scenario da mostrare. Sulla tavola invece il
   vento è una linea (vedi sezione 3). */
function glifoVento(n){
  return o => {
    let b = '';
    for (let i = 0; i < n; i++){
      const x = 52 - i * 6;
      b += `<line x1="${x}" y1="30" x2="${x-8}" y2="41" stroke="${C.nero}" stroke-width="3"/>`;
    }
    return T(`<line x1="56" y1="35" x2="14" y2="35" stroke="${C.nero}" stroke-width="2.6"/>
      <path d="M5 35l13-6.5v13Z" fill="${C.nero}"/>${b}
      ${(o && o.senzaTesto) ? '' :
        txt(34, 22, (o && o.testo) ? o.testo + ' Km/h' : '(.....Km/h)', C.nero, 10)}`);
  };
}

/* Tipo di incendio: tre rami, il pieno dice a che quota corre il fuoco —
   chioma in alto, radente in mezzo, sotterraneo in basso. */
function quotaFuoco(pieno){
  return () => {
    let c = '';
    [16, 32, 48].forEach((yy, i) => {
      c += `<line x1="12" y1="32" x2="45" y2="${yy}" stroke="${C.nero}" stroke-width="2.2"/>`;
      c += `<circle cx="49" cy="${yy}" r="6" fill="${i === pieno ? C.nero : '#fff'}" stroke="${C.nero}" stroke-width="2.2"/>`;
    });
    return T(c);
  };
}

/* Cerchio con sigla: Area da evacuare (Ev) e Zona Sicura (SZ), entrambe
   verdi. Effettuata = cerchio interamente pieno con la sigla in bianco. */
function tondoSigla(sigla, col){
  return o => {
    const p = attivo(o);
    return T(`<circle cx="32" cy="32" r="19" fill="${p ? col : '#fff'}" stroke="${col}" stroke-width="3"/>
      ${txt(32, 38, sigla, p ? '#fff' : col, 17)}`);
  };
}

/* =====================================================================
   2. SIMBOLI PUNTUALI
   ===================================================================== */
const S = {};
const agg = (k, g, sg, it, en, svg, extra) => {
  S[k] = Object.assign({g, sg, n:{it, en}, svg}, extra || {});
};

/* ---- TAVOLA 1: la zona di intervento ---- */
agg('acqua','zona',null,'Punto d\u2019acqua per mezzi terrestri','Water point, ground means',
  () => T(`<circle cx="32" cy="32" r="21" fill="${C.acqua}"/>`));
agg('acqua_aerei','zona',null,'Punto d\u2019acqua per mezzi aerei','Water point, air means',
    o => { const id = uid('clip');
    return T(`<clipPath id="${id}"><circle cx="32" cy="28" r="19"/></clipPath>
    <circle cx="32" cy="28" r="19" fill="#fff" stroke="${C.acqua}" stroke-width="1.6"/>
    <path d="M13 9h38L13 47h38Z" fill="${C.acqua}" clip-path="url(#${id})"/>
    ${txt(32, 60, (o && o.testo) || 'Eli/CAN', C.acqua, 12)}`); }, {e:1});

agg('sensibile','zona',null,'Punto sensibile','Sensitive point',
  () => T(`<path d="M6 12h52L32 57Z" fill="${C.rosso}"/>`));
agg('sensibile_wui','zona',null,'Punto sensibile per interfaccia','Sensitive point for WUI',
  () => { const id = uid('rig');
    return T(`<defs>${RIG(id, C.verde, 1.6)}</defs>
      <path d="M6 12h52L32 57Z" fill="url(#${id})" stroke="${C.verde}" stroke-width="2.2"/>`); });

agg('elisuperficie','zona',null,'Piazzola per elicottero','Helispot',
  () => T(`<circle cx="32" cy="32" r="20" fill="#fff" stroke="${C.nero}" stroke-width="2.8"/>
    ${txt(32, 40, 'H', C.nero, 24)}`));
agg('ripetitore','zona',null,'Ripetitori, antenne, pale eoliche, ecc.','Masts, antennas, wind turbines',
  () => T(`<circle cx="32" cy="11" r="6" fill="${C.nero}"/>
    <path d="M32 15L20 56h24Z" fill="none" stroke="${C.nero}" stroke-width="2.6" stroke-linejoin="round"/>
    <line x1="32" y1="15" x2="32" y2="56" stroke="${C.nero}" stroke-width="2"/>`));

/* ---- TAVOLA 2: l'evoluzione dell'incendio ---- */
/* "Punto d'innesco" e non "Area d'origine": sulla carta è un punto, e la
   parola che si usa per radio è innesco. */
agg('origine','evoluzione',null,'Punto d\u2019innesco','Point of origin',
  () => T(`<path d="M32 4l7.7 17.3L58 23.6 44.9 36.1 48.4 54 32 45 15.6 54l3.5-17.9L6 23.6l18.3-2.3Z" fill="${C.rosso}"/>`));
agg('inc_chioma','evoluzione',null,'Incendio di chioma','Crown fire', quotaFuoco(0));
agg('inc_radente','evoluzione',null,'Incendio radente','Surface fire', quotaFuoco(1));
agg('inc_sotterraneo','evoluzione',null,'Incendio sotterraneo','Ground fire', quotaFuoco(2));

/* ---- TAVOLA 3: il dispositivo di intervento ---- */
agg('can','dispositivo','sgAereo','Canadair','Canadair', mezzoAereo('CAN'), {s:1, e:1, lbl:'ID CAN'});
agg('s64','dispositivo','sgAereo','S 64','S 64', mezzoAereo('S64'), {s:1, e:1, lbl:'ID S64'});
agg('fireboss','dispositivo','sgAereo','Fireboss','Fireboss', mezzoAereo('Boss'), {s:1, e:1, lbl:'ID Boss'});
agg('eli','dispositivo','sgAereo','Elicotteri medi e leggeri','Light and medium helicopters', mezzoAereo('Eli'), {s:1, e:1, lbl:'ID Eli'});
agg('eli_com','dispositivo','sgAereo','Elicottero Comando','Command helicopter', mezzoAereo('Eli Com'), {s:1, e:1, lbl:'ID Eli Com'});
agg('aereo_altro','dispositivo','sgAereo','Altro mezzo aereo','Other air means', mezzoAereo(''), {s:1, e:1, lbl:'ID mezzo'});

agg('dos','dispositivo','sgTerra','DOS — Direttore Operazioni Spegnimento','Fire operations director',
  o => {
    const p = attivo(o), K = C.rosso;
    const x1 = 2, y1 = 18, x2 = 62, y2 = 48, xc = 32;
    return T(`<line x1="${xc}" y1="${y1}" x2="${xc}" y2="${y1-9}" stroke="${K}" stroke-width="2.6"/>
      <rect x="${x1}" y="${y1}" width="${x2-x1}" height="${y2-y1}" fill="#fff" stroke="${K}" stroke-width="3"/>
      ${p ? `<path d="M${x2-(y2-y1)} ${y2}H${x2}V${y1}Z" fill="${K}"/>` : ''}
      ${txt(p ? 27 : 32, y2-8, 'DOS', K, 21)}`);
  }, {s:1, f:1});
agg('vvf','dispositivo','sgTerra','Squadra VVF','VVF crew', mezzoTerra('VVF', 1), {s:1, e:1, f:1});
agg('vol','dispositivo','sgTerra','Squadra VOL','Volunteer crew', mezzoTerra('VOL', 1), {s:1, e:1, f:1});
agg('gos','dispositivo','sgTerra','Squadra GOS','GOS crew', mezzoTerra('GOS', 1), {s:1, e:1, f:1});
agg('sai','dispositivo','sgTerra','Squadra SAI','SAI crew', mezzoTerra('SAI', 1), {s:1, e:1, f:1});
agg('squadra_altra','dispositivo','sgTerra','Squadra\u2026','Other crew', mezzoTerra('', 1), {s:1, e:1, f:1});
agg('modulo_vvf','dispositivo','sgTerra','Modulo VVF / Gruppo','VVF module / Group', mezzoTerra('', 2), {s:1, e:1});
agg('modulo_ue','dispositivo','sgTerra','Modulo UE / Colonna','EU module / Column', mezzoTerra('', 3), {s:1, e:1});
agg('cp','dispositivo','sgTerra','Posto di Comando','Command post', mezzoTerra('CP', 0, C.rosso), {s:1});
agg('ss','dispositivo','sgTerra','Soccorso Sanitario','Ambulance', mezzoTerra('SS', 0, C.verde), {s:1});
agg('pol','dispositivo','sgTerra','Forze di Polizia','Police forces', mezzoTerra('Pol', 0, C.polizia), {s:1, f:1});

agg('tp','dispositivo','sgTerra','Transit Point','Transit point', o => {
  const R = C.rosso, p = attivo(o);
  return T(`<circle cx="32" cy="32" r="22" fill="${p ? R : '#fff'}" stroke="${R}" stroke-width="3"/>
    ${txt(32, 38, 'TP', p ? '#fff' : R, 18)}`);
}, {s:1, r:1, r0:0});

/* ---- TAVOLA 4: le azioni ---- */
agg('lancio_pesante_ritardante','azioni','sgAereo','Lancio mezzi aerei pesanti con ritardante','Retardant drop, heavy means', lancio(1,1), {s:1, poly:{a:125, b:20}});
agg('lancio_pesante_acqua','azioni','sgAereo','Lancio mezzi aerei pesanti con acqua','Water drop, heavy means', lancio(1,0), {s:1, poly:{a:125, b:20}});
agg('lancio_leggero_ritardante','azioni','sgAereo','Lancio elicotteri medi e leggeri con ritardante','Retardant drop, light helicopters', lancio(0,1), {s:1, poly:{a:35, b:35}});
agg('lancio_leggero_acqua','azioni','sgAereo','Lancio elicotteri medi e leggeri con acqua','Water drop, light helicopters', lancio(0,0), {s:1, poly:{a:35, b:35}});

/* Difesa perimetrale: stella a otto punte formata da DUE QUADRATI ruotati
   di 45° l'uno rispetto all'altro. Punte piene = effettuata, vuote =
   prevista: è il riempimento a cambiare, non il tratto, perché a
   dimensione di simbolo un tratteggio su otto punte diventa una nuvola. */
agg('difesa_perimetrale','azioni','sgTerra','Difesa perimetrale','Perimeter defence', o => {
  const R = C.rosso, p = attivo(o), r = 27;
  const quadrato = a0 => {
    let d = '';
    for (let i = 0; i < 4; i++){
      const a = (a0 + i * 90) * Math.PI / 180;
      d += (i ? 'L' : 'M') + (32 + r * Math.cos(a)).toFixed(1)
                     + ' ' + (32 + r * Math.sin(a)).toFixed(1);
    }
    return d + 'Z';
  };
  const st = ` fill="${p ? R : '#fff'}" stroke="${R}" stroke-width="2.6" stroke-linejoin="round"`;
  return T(`<path d="${quadrato(45)}"${st}/><path d="${quadrato(0)}"${st}/>`);
}, {s:1});

agg('accensione_punti','azioni','sgControfuoco','Accensione per punti','Ignition by points', o => T(
  `<circle cx="32" cy="23" r="16" fill="${attivo(o) ? C.rosso : '#fff'}" stroke="${C.rosso}" stroke-width="2.8"/>
   <line x1="32" y1="39" x2="32" y2="50" stroke="${C.rosso}" stroke-width="2.8"/>
   <path d="M25 48l7 12 7-12Z" fill="${C.rosso}"/>`), {s:1});

agg('area_evacuare','azioni','sgEvacuazione','Area da evacuare','Area to evacuate', tondoSigla('Ev', C.verde), {s:1});
agg('zona_sicura','azioni','sgEvacuazione','Zona Sicura','Safety zone', tondoSigla('SZ', C.verde), {s:1});

/* =====================================================================
   3. MOTIVI RIPETUTI LUNGO LE LINEE

   CONVENZIONE — vale per OGNI glifo qui sotto, ed è l'unica cosa da tenere
   a mente per aggiungerne di nuovi:
     · la linea attraversa il glifo IN VERTICALE, dal basso verso l'alto;
     · "in alto" è il verso di percorrenza (PolylineDecorator ruota il
       marcatore secondo la direzione del tracciato, e l'angolo 0 è il nord);
     · l'asse x è la PERPENDICOLARE alla linea;
     · il centro dell'icona (w/2, h/2) sta sul tracciato ed è anche il centro
       di rotazione: quello che si disegna lì finisce esattamente sul punto.

   Da questo discende la regola delle frecce: la punta va disegnata sul
   CENTRO del glifo e il resto in coda, verso il basso. Così, con offset
   '100%', la punta cade sull'ultimo vertice del tracciato invece di
   sporgere oltre o restare indietro.

   `h` è anche il passo di ripetizione dei motivi contigui (triangoli,
   denti, greca): chi li usa passa `passo:'auto'` e sitac.js legge di qui.
   ===================================================================== */

/* `dim` è la misura caratteristica del motivo e cambia significato con il
   tipo — è la base del triangolo, il lato della greca, l'apertura della
   freccia. Sta scritto accanto a ogni caso. */
function decoGlifo(tipo, opz){
  const o = opz || {};
  const col = o.col || C.nero;
  const pieno = !!o.pieno;
  const n = Math.max(1, o.n || 1);
  const dim = o.dim || 14;
  const riempi = pieno ? col : '#fff';
  const f = x => (+x).toFixed(1);
  let w, h, d = '';

  /* Altezza (= estensione lungo la linea) e larghezza dipendono dal tipo:
     si fissano prima, perché tutto il disegno è riferito al centro. */
  const alt = dim * 0.866;                       // altezza del triangolo equilatero

  switch (tipo){

    /* Difesa in linea — triangoli equilateri CONTIGUI appoggiati sulla
       linea: la base è un pezzo di linea, l'apice sta di lato. `dim` è la
       base, e coincide col passo, così due triangoli si toccano. */
    case 'triangoloBase': {
      h = dim; w = Math.ceil(alt * 2) + 2;
      const cx = w / 2, cy = h / 2;
      d = `<path d="M${f(cx)} ${f(cy - dim/2)}L${f(cx - alt)} ${f(cy)}L${f(cx)} ${f(cy + dim/2)}Z"`
        + ` fill="${riempi}" stroke="${col}" stroke-width="1.8" stroke-linejoin="round"/>`;
      break;
    }

    /* Creazione linea di sicurezza — DUE serie di triangoli consecutivi con
       la base in comune: la linea è la base, e i triangoli stanno di qua e
       di là. Stesso passo dei precedenti. */
    case 'bifronte': {
      h = dim; w = Math.ceil(alt * 2) + 2;
      const cx = w / 2, cy = h / 2;
      const tri = seg => `<path d="M${f(cx)} ${f(cy - dim/2)}L${f(cx + seg * alt)} ${f(cy)}`
        + `L${f(cx)} ${f(cy + dim/2)}Z" fill="${riempi}" stroke="${col}"`
        + ` stroke-width="1.6" stroke-linejoin="round"/>`;
      d = tri(-1) + tri(1);
      break;
    }

    /* Ricognizione — greca a omega quadra: il tracciato resta dritto e il
       motivo gli aggiunge la sporgenza quadra, ripetuta senza stacchi.
       `dim` è il lato del quadro. */
    case 'omega': {
      h = dim; w = dim * 2 + 6;
      const cx = w / 2, cy = h / 2, s = dim * 0.62;
      d = `<path d="M${f(cx)} ${f(cy + dim/2)}V${f(cy + s/2)}H${f(cx - s)}V${f(cy - s/2)}`
        + `H${f(cx)}V${f(cy - dim/2)}" fill="none" stroke="${col}" stroke-width="2.4"`
        + ` stroke-linejoin="round"/>`;
      break;
    }

    /* Fronte dell'incendio — doppia linea parallela unita da lineette. Il
       tracciato vero è una delle due; il motivo disegna l'altra, affiancata,
       e le traversine che le legano. Passo corto: le lineette devono essere
       tante, o non si legge come un fronte dentato. `dim` è la distanza fra
       le due linee. */
    case 'denti': {
      h = Math.max(6, Math.round(dim * 0.62)); w = dim * 2 + 8;
      const cx = w / 2, cy = h / 2;
      d = `<line x1="${f(cx + dim)}" y1="0" x2="${f(cx + dim)}" y2="${h}"`
        + ` stroke="${col}" stroke-width="2.6"/>`
        + `<line x1="${f(cx)}" y1="${f(cy)}" x2="${f(cx + dim)}" y2="${f(cy)}"`
        + ` stroke="${col}" stroke-width="2"/>`;
      break;
    }

    /* Pendenze e vento — freccia in punta con le codine in coda: a T
       (perpendicolari) per la pendenza, a 45° per il vento. Una, due o tre
       secondo l'intensità. `dim` è la larghezza della freccia. */
    case 'fine': {
      const la = dim * 0.9, wa = dim / 2, passo = dim * 0.52, stacco = dim * 0.35;
      const coda = la + stacco + (n - 1) * passo + (o.forma === '45' ? wa : 0);
      w = Math.ceil(dim + wa * 1.6) + 2;
      h = Math.ceil(coda * 2) + 4;
      const cx = w / 2, cy = h / 2;
      d = `<path d="M${f(cx)} ${f(cy)}L${f(cx + wa)} ${f(cy + la)}`
        + `L${f(cx)} ${f(cy + la * 0.74)}L${f(cx - wa)} ${f(cy + la)}Z" fill="${col}"/>`;
      for (let i = 0; i < n; i++){
        const y = cy + la + stacco + i * passo;
        d += (o.forma === '45')
          ? `<line x1="${f(cx)}" y1="${f(y)}" x2="${f(cx + wa * 1.3)}" y2="${f(y + wa * 1.3)}"`
            + ` stroke="${col}" stroke-width="2.8" stroke-linecap="round"/>`
          : `<line x1="${f(cx - wa)}" y1="${f(y)}" x2="${f(cx + wa)}" y2="${f(y)}"`
            + ` stroke="${col}" stroke-width="2.8" stroke-linecap="round"/>`;
      }
      break;
    }

    /* Attacco sui fianchi — freccia inclinata di 45° sulla linea, che parte
       dal tracciato e punta avanti-fuori. `dim` è la lunghezza dell'asta. */
    case 'freccia45': {
      w = Math.ceil(dim * 1.5); h = Math.ceil(dim * 1.5);
      const cx = w / 2, cy = h / 2, k = dim * 0.707;
      const tx = cx + k, ty = cy - k;
      const bx = cx + k * 0.62, by = cy - k * 0.62;
      const p = dim * 0.2;
      d = `<line x1="${f(cx)}" y1="${f(cy)}" x2="${f(tx)}" y2="${f(ty)}"`
        + ` stroke="${col}" stroke-width="2.6"/>`
        + `<path d="M${f(tx)} ${f(ty)}L${f(bx - p)} ${f(by - p)}L${f(bx + p)} ${f(by + p)}Z"`
        + ` fill="${pieno ? col : '#fff'}" stroke="${col}" stroke-width="1.6" stroke-linejoin="round"/>`;
      break;
    }

    /* Via di fuga — chevron rivolto nel verso di percorrenza. Mancava del
       tutto: il tracciato usciva senza alcun segno. */
    case 'chevron': {
      w = dim + 6; h = dim;
      const cx = w / 2, cy = h / 2, b = dim * 0.42;
      d = `<path d="M${f(cx - b)} ${f(cy + b * 0.7)}L${f(cx)} ${f(cy - b * 0.7)}`
        + `L${f(cx + b)} ${f(cy + b * 0.7)}" fill="none" stroke="${col}"`
        + ` stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>`;
      break;
    }

    /* Accesso interrotto — croce sul tracciato, simmetrica: la rotazione non
       la cambia. */
    case 'croce': {
      w = h = dim;
      d = `<path d="M2 2L${dim-2} ${dim-2}M${dim-2} 2L2 ${dim-2}" stroke="${col}" stroke-width="2.6"/>`;
      break;
    }

    /* Fili a sbalzo — il pilone: sta dritto sulla pagina, non ruota. */
    case 'pilone': {
      w = h = dim;
      const cx = dim / 2;
      d = `<line x1="${cx}" y1="2" x2="${cx}" y2="${dim-7}" stroke="${col}" stroke-width="2.4"/>`
        + `<rect x="${cx-4}" y="${dim-8}" width="8" height="6" fill="${col}"/>`;
      break;
    }

    /* Linea elettrica: il fulmine sta dritto sulla pagina. Ruotato lungo la
       campata finirebbe capovolto sui tratti verso ovest, e un fulmine a
       testa in giù non lo riconosce nessuno. */
    case 'fulmine':
    case 'fulmineOff': {
      w = h = dim;
      d = `<g transform="scale(${(dim/64).toFixed(3)})">`
        + `<path d="M38 5L17 35h11l-5 24 25-33H36l8-21Z" fill="${C.giallo}" stroke="${col}" stroke-width="4" stroke-linejoin="round"/>`
        + (tipo === 'fulmineOff'
            ? `<path d="M9 9L55 55M55 9L9 55" stroke="${col}" stroke-width="5"/>` : '')
        + `</g>`;
      break;
    }

    default:
      w = h = dim;
  }

  return {w, h, html: d};
}

/* Icona pronta per PolylineDecorator / per l'anteprima. */
const decoSvg = g =>
  `<svg viewBox="0 0 ${g.w} ${g.h}" width="${g.w}" height="${g.h}" xmlns="http://www.w3.org/2000/svg">${g.html}</svg>`;

/* I motivi che si toccano fra loro: il passo è l'altezza del glifo. */
const DECO_CONTIGUI = ['triangoloBase', 'bifronte', 'omega', 'denti'];

/* =====================================================================
   4. LINEE
   Metà della tavola sono tracciati. Ognuno porta lo stile Leaflet e, dove
   serve, il motivo ripetuto che sitac.js passa a PolylineDecorator:
   {tipo, passo, dim, n, forma, pieno, offset}.
   `stati:1` dice che il tracciato ha prevista/effettuata: tratteggiato
   quando è prevista, pieno quando è fatta.
   ===================================================================== */
const L = {};
const aggL = (k, g, sg, it, en, stile, extra) => {
  L[k] = Object.assign({g, sg, n:{it, en}}, stile, extra || {});
};

/* ---- TAVOLA 1: pendenze, viabilità, infrastrutture ---- */
/* La pendenza si traccia da monte a valle come la si legge sulla carta: la
   freccia sta a valle, le codine dicono quanto è ripido. */
aggL('pend_lieve','zona',null,'Pendenza lieve','Light slope',
  {color:C.nero, weight:2.8},
  {deco:{tipo:'fine', forma:'T', n:1, dim:22, passo:0, offset:'100%'}});
aggL('pend_moderata','zona',null,'Pendenza moderata','Moderate slope',
  {color:C.nero, weight:2.8},
  {deco:{tipo:'fine', forma:'T', n:2, dim:22, passo:0, offset:'100%'}});
aggL('pend_forte','zona',null,'Pendenza forte','Steep slope',
  {color:C.nero, weight:2.8},
  {deco:{tipo:'fine', forma:'T', n:3, dim:22, passo:0, offset:'100%'}});

aggL('sentiero','zona',null,'Sentiero o mulattiera','Trail',
  {color:C.nero, weight:3, dashArray:'14,5,3,5'});
aggL('strada_leggeri','zona',null,'Strada per mezzi leggeri','Light means road',
  {color:C.nero, weight:3, dashArray:'11,8'});
aggL('sterrata_leggeri','zona',null,'Strada sterrata per mezzi leggeri','Unpaved road, light means',
  {color:C.nero, weight:3, dashArray:'11,8'}, {badge:'4x4'});
aggL('strada_pesanti','zona',null,'Strada per mezzi pesanti','Heavy means road',
  {color:C.nero, weight:3.5});
aggL('sterrata_pesanti','zona',null,'Strada sterrata per mezzi pesanti','Unpaved road, heavy means',
  {color:C.nero, weight:3.5}, {badge:'4x4'});
aggL('senso_unico','zona',null,'Senso di marcia obbligatorio','One way only',
  {color:C.nero, weight:3}, {deco:{tipo:'freccia', passo:'25%', dim:13}});
aggL('accesso_interrotto','zona',null,'Accesso interrotto','Road closed',
  {color:C.nero, weight:3.5}, {deco:{tipo:'croce', passo:'50%', dim:18}});
aggL('fune_sbalzo','zona',null,'Funivie, fili a sbalzo, ecc.','Cableways and aerial wires',
  {color:C.nero, weight:2.6}, {deco:{tipo:'pilone', passo:'50%', dim:22, dritto:1}});
aggL('elettrodotto','zona',null,'Linea elettrica attiva','Power line on',
  {color:C.nero, weight:2.4, dashArray:'14,5,3,5'}, {deco:{tipo:'fulmine', passo:70, dim:24, dritto:1}});
aggL('elettrodotto_off','zona',null,'Linea elettrica disattivata','Power line off',
  {color:C.nero, weight:2.4, dashArray:'14,5,3,5'}, {deco:{tipo:'fulmineOff', passo:70, dim:24, dritto:1}});

/* ---- TAVOLA 2: vento, assi di sviluppo, fronte ---- */
/* La freccia dice dove VA il vento; le codine a 45° l'intensità. */
aggL('vento_debole','evoluzione',null,'Direzione del vento, intensit\u00e0 debole','Wind direction, light',
  {color:C.nero, weight:2.6},
  {deco:{tipo:'fine', forma:'45', n:1, dim:22, passo:0, offset:'100%'}});
aggL('vento_moderato','evoluzione',null,'Direzione del vento, intensit\u00e0 moderata','Wind direction, moderate',
  {color:C.nero, weight:2.6},
  {deco:{tipo:'fine', forma:'45', n:2, dim:22, passo:0, offset:'100%'}});
aggL('vento_forte','evoluzione',null,'Direzione del vento, intensit\u00e0 forte','Wind direction, strong',
  {color:C.nero, weight:2.6},
  {deco:{tipo:'fine', forma:'45', n:3, dim:22, passo:0, offset:'100%'}});

aggL('asse_principale','evoluzione',null,'Asse di sviluppo principale','Head of the fire',
  {color:C.rosso, weight:10, lineCap:'butt'}, {deco:{tipo:'punta', passo:'100%', dim:34, pieno:1}});
aggL('asse_veloce','evoluzione',null,'Asse secondario (veloce)','Secondary axis (fast)',
  {color:C.rosso, weight:3}, {deco:{tipo:'punta', passo:'100%', dim:22}});
aggL('asse_lento','evoluzione',null,'Asse secondario (lento)','Secondary axis (slow)',
  {color:C.rosso, weight:2.5}, {deco:{tipo:'punta', passo:'100%', dim:14}});
/* Doppia linea parallela a denti: il tracciato è la linea di monte, il
   motivo aggiunge quella affiancata e le traversine. */
aggL('fronte','evoluzione',null,'Fronte dell\u2019incendio','Fire front',
  {color:C.rosso, weight:3}, {deco:{tipo:'denti', passo:'auto', dim:9}});

/* ---- TAVOLA 4: azioni su linea ---- */
aggL('ricognizione','azioni','sgTerra','Ricognizione','Patrol',
  {color:C.rosso, weight:2.6}, {stati:1, deco:{tipo:'omega', passo:'auto', dim:16}});
aggL('difesa_linea','azioni','sgTerra','Difesa in linea','Defence on a line',
  {color:C.rosso, weight:3}, {stati:1, deco:{tipo:'triangoloBase', passo:'auto', dim:13, pieno:1}});
aggL('attacco_fianchi','azioni','sgTerra','Attacco sui fianchi','Containment attack',
  {color:C.rosso, weight:2.8},
  {stati:1, deco:{tipo:'freccia45', dim:20, offset:'20%', passo:'30%', pieno:1}});
aggL('attacco_localizzato','azioni','sgTerra','Attacco localizzato','Hot spotting',
  {color:C.rosso, weight:2}, {stati:1, deco:{tipo:'punta', passo:'100%', dim:18, pieno:1}});
/* Il quadro con la B è il badge in testa: quadrato, non tondo. */
aggL('bonifica','azioni','sgTerra','Bonifica','Mop up',
  {color:C.rosso, weight:2.8},
  {stati:1, deco:{tipo:'punta', passo:'100%', dim:20, pieno:1}, badge:'B', badgeQuadro:1});
aggL('linea_sicurezza','azioni','sgControfuoco','Creazione linea di sicurezza','Creation of a safety line',
  {color:C.rosso, weight:3}, {stati:1, deco:{tipo:'bifronte', passo:'auto', dim:12, pieno:1}});
aggL('accensione_linee','azioni','sgControfuoco','Accensione per linee','Ignition by lines',
  {color:C.rosso, weight:7}, {stati:1, deco:{tipo:'punta', passo:'100%', dim:24, pieno:1}});
aggL('via_fuga','azioni','sgEvacuazione','Via di fuga per evacuazione','Evacuation escape route',
  {color:C.nero, weight:2.6}, {stati:1, deco:{tipo:'chevron', passo:'33%', dim:16}});

/* =====================================================================
   5. ANTEPRIMA DI UNA LINEA
   Serve nella colonna di sinistra, nella legenda a video e in quella
   stampata. Una barretta colorata non basta più: due tracciati rossi dello
   stesso peso si distinguono SOLO per il motivo, ed è quello che va visto
   prima di premere il pulsante — 4x4 compreso.

   Il glifo è disegnato con la linea verticale; qui la linea è orizzontale,
   quindi si ruota di 90° attorno al punto in cui va posato. Dopo la
   rotazione l'altezza del glifo (lungo la linea) diventa la sua larghezza
   sullo schermo, e la larghezza diventa l'altezza: la scala si calcola su
   entrambe, o un motivo alto esce dal riquadro.
   ===================================================================== */
const A_W = 64, A_H = 30;

function anteprimaLinea(k, stato){
  const d = L[k];
  if (!d) return '';
  const y = A_H / 2, col = d.color || C.rosso;
  const previsto = !!(d.stati && stato !== 'attivo');
  const tratto = previsto ? '8,6' : (d.dashArray || null);
  const peso = Math.min(d.weight || 3, 5);
  let s = `<line x1="1" y1="${y}" x2="${A_W - 1}" y2="${y}" stroke="${col}"`
    + ` stroke-width="${peso}"` + (tratto ? ` stroke-dasharray="${tratto}"` : '') + `/>`;

  const dc = d.deco;
  if (dc){
    const pieno = !!(dc.pieno && !previsto);
    if (dc.tipo === 'punta' || dc.tipo === 'freccia'){
      /* arrowHead di PolylineDecorator: qui basta ridisegnarne la punta. */
      const lu = 12, la = 7, x = A_W - 1;
      s += `<path d="M${x} ${y}L${x - lu} ${y - la}${pieno ? '' : `M${x} ${y}`}L${x - lu} ${y + la}${pieno ? 'Z' : ''}"`
        + ` fill="${pieno ? col : 'none'}" stroke="${col}" stroke-width="2.2" stroke-linejoin="round"/>`;
    } else {
      const g = decoGlifo(dc.tipo, {col, pieno, n:dc.n, forma:dc.forma, dim:dc.dim});
      const sc = Math.min(1, (A_H - 2) / g.w, (A_W - 2) / g.h);
      const posa = px => `<g transform="translate(${px.toFixed(1)} ${y}) rotate(90) `
        + `scale(${sc.toFixed(3)}) translate(${-g.w/2} ${-g.h/2})">${g.html}</g>`;
      if (dc.tipo === 'fine'){
        s += posa(A_W - 1);                       // la punta sull'estremità
      } else if (DECO_CONTIGUI.indexOf(dc.tipo) >= 0){
        const passo = g.h * sc;
        for (let x = passo / 2; x < A_W; x += passo) s += posa(x);
      } else {
        s += posa(A_W * 0.34) + posa(A_W * 0.72);
      }
    }
  }
  if (d.badge){
    const bw = d.badge.length > 1 ? 20 : 14;
    s += `<rect x="2" y="${y - 8}" width="${bw}" height="16" rx="${d.badgeQuadro ? 2 : 8}"`
      + ` fill="#fff" stroke="#000" stroke-width="1.8"/>`
      + `<text x="${2 + bw/2}" y="${y + 4}" text-anchor="middle" font-size="10"`
      + ` font-family="Arial,Helvetica,sans-serif" font-weight="700" fill="#000">${esc(d.badge)}</text>`;
  }
  return `<svg viewBox="0 0 ${A_W} ${A_H}" xmlns="http://www.w3.org/2000/svg">${s}</svg>`;
}

/* =====================================================================
   6. TAVOLE E RIQUADRI
   L'ordine è quello della pubblicazione.
   ===================================================================== */
NS.SITAC_SIMBOLI = S;
NS.SITAC_LINEE   = L;
NS.SITAC_COLORI  = C;
NS.SITAC_TAVOLE  = [
  {k:'zona',       n:{it:'La zona di intervento', en:'The operating area'}},
  {k:'evoluzione', n:{it:'L\u2019evoluzione dell\u2019incendio', en:'Fire progression'}},
  {k:'dispositivo',n:{it:'Il dispositivo di intervento', en:'The deployed means'}},
  {k:'azioni',     n:{it:'Le azioni', en:'The actions'}}
];
NS.SITAC_RIQUADRI = {
  sgAereo:      {it:'Dispositivo aereo', en:'Air means'},
  sgTerra:      {it:'Squadre a terra', en:'Ground crews'},
  sgControfuoco:{it:'Controfuoco e fuoco prescritto', en:'Backfire and prescribed fire'},
  sgEvacuazione:{it:'Evacuazione', en:'Evacuation'}
};

/* Motivi, anteprime e glifo del vento: li consuma sitac.js. */
NS.SITAC_DECO          = decoGlifo;
NS.SITAC_DECO_SVG      = decoSvg;
NS.SITAC_DECO_CONTIGUI = DECO_CONTIGUI;
NS.SITAC_ANTEPRIMA     = anteprimaLinea;

/* Il quadro del vento in alto a sinistra sulla carta non è un elemento
   della tavola ma un dato di scenario: lì il vento resta un glifo. */
NS.SITAC_GLIFI = {
  vento_debole:   glifoVento(1),
  vento_moderato: glifoVento(2),
  vento_forte:    glifoVento(3)
};

/* Etichetta e lunghezza per la finestra di inserimento: la chiede sitac.js
   quando si posa un simbolo con il flag `e`. */
NS.SITAC_ID_MAX = ID_MAX;

/* Compatibilità con le versioni precedenti del modulo: i vecchi GeoJSON
   rientrano ricondotti alle chiavi nuove. Pendenze e vento NON stanno qui:
   la chiave è la stessa, cambia solo la geometria, e l'import se ne accorge
   da sé trovando un Point dove ora c'è una linea. */
NS.SITAC_VECCHI = {gruppo:'modulo_vvf', colonna:'modulo_ue', acqua_eli:'acqua_aerei',
  ostacolo_volo:'fune_sbalzo', evacuazione:'area_evacuare'};

})();