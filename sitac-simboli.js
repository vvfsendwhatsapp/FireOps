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
 * COSA VIAGGIA NEL GEOJSON
 * La chiave (`vvf`, `origine`, `lancio_pesante_acqua`…), lo stato e
 * l'eventuale testo. Le chiavi sono identificativi tecnici: non vanno
 * tradotte né rinominate, o i file salvati diventano illeggibili.
 *
 * I FLAG
 * `r` i simboli che vanno orientati; `e` quelli che la tavola vuole
 * accompagnati da un testo (la matricola del mezzo, il numero della
 * squadra, i km/h del vento: nella tavola sono i puntini di "CAN ......."
 * e di "(.........Km/h)"); `s` quelli che hanno i due stati; `f` quelli
 * di genere femminile, che al posto di previsto/attivo leggono
 * prevista/attiva.
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

function txt(x, y, s, col, dim, ancora){
  return `<text x="${x}" y="${y}" text-anchor="${ancora || 'middle'}" font-size="${dim || 13}"`
    + ` font-family="Arial,Helvetica,sans-serif" font-weight="700" fill="${col}">${esc(s)}</text>`;
}
/* La riga di puntini è il posto dove sulla carta si scrive a penna il
   numero della squadra o la matricola del mezzo: va lasciata anche a video. */
const puntini = (x1, x2, y, col) =>
  `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${col}" stroke-width="1.6" stroke-dasharray="1.5,2.5"/>`;

const RIG = (id, col, largo) => `<pattern id="${id}" width="7" height="7" patternUnits="userSpaceOnUse"`
  + ` patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke="${col}" stroke-width="${largo}"/></pattern>`;

/* =====================================================================
   1. FAMIGLIE
   ===================================================================== */

/* Dispositivo aereo: riquadro con le diagonali e una banda in basso. La
   sigla è FISSA (CAN, S64, Boss): quello che si digita finisce sui
   puntini accanto, che sulla carta è dove si scrive la matricola. */
function mezzoAereo(sigla){
  return o => {
    const p = attivo(o), R = C.rosso;
    const x1 = 5, y1 = 14, x2 = 59, y2 = 42, ym = 51;
    const corpo = p
      ? `<path d="M${x1} ${y1}H${x2}L${x1} ${y2}H${x2}Z" fill="${R}"/>`
      : `<path d="M${x1} ${y1}L${x2} ${y2}M${x2} ${y1}L${x1} ${y2}" stroke="${R}" stroke-width="2" fill="none"/>`;
    const s = sigla || '';
    const n = (o && o.testo) || '';
    const dimS = s.length > 5 ? 8.5 : 10;
    const xn = s ? x1 + 5 + s.length * dimS * 0.62 : x1 + 4;
    return T(`<rect x="${x1}" y="${y1}" width="${x2-x1}" height="${y2-y1}" fill="#fff" stroke="${R}" stroke-width="2.6"/>
      ${corpo}
      <rect x="${x1}" y="${y2}" width="${x2-x1}" height="${ym-y2}" fill="#fff" stroke="${R}" stroke-width="2.6"/>
      ${s ? txt(x1+3, ym-2.5, s, R, dimS, 'start') : ''}
      ${n ? txt(xn, ym-2.5, n, R, 9.5, 'start') : puntini(xn, x2-3, ym-3.5, R)}`);
  };
}

/* Dispositivo terrestre: nel quarto di sinistra la sigla fissa, e sotto la
   riga su cui si scrive il numero. Dove la sigla non c'è (Squadra.....,
   Modulo, Colonna) è il testo digitato a occupare il posto della sigla.
   L'asta sopra il divisorio conta il livello: una per la squadra, due per
   il modulo/gruppo, tre per il modulo UE/colonna.
   Attivo = triangolo pieno nella metà destra. */
function mezzoTerra(sigla, aste, col, senzaDivisione){
  return o => {
    const p = attivo(o), K = col || C.rosso;
    const x1 = 3, y1 = 20, x2 = 61, y2 = 46, xd = 30, ym = 33;
    let a = '';
    for (let i = 0; i < aste; i++){
      const x = (xd - (aste - 1) * 4 + i * 8).toFixed(1);
      a += `<line x1="${x}" y1="${y1}" x2="${x}" y2="${y1-8}" stroke="${K}" stroke-width="2.2"/>`;
    }
    const s = sigla || (o && o.testo) || '';
    const n = sigla ? ((o && o.testo) || '') : '';
    if (senzaDivisione)
      return T(`${a}<rect x="${x1}" y="${y1}" width="${x2-x1}" height="${y2-y1}" fill="#fff" stroke="${K}" stroke-width="2.6"/>
        ${p ? `<path d="M${x2-(y2-y1)} ${y2}H${x2}V${y1}Z" fill="${K}"/>` : ''}
        ${txt(p ? 28 : 32, y2-8, sigla, K, 15)}`);
    return T(`${a}
      <rect x="${x1}" y="${y1}" width="${x2-x1}" height="${y2-y1}" fill="#fff" stroke="${K}" stroke-width="2.6"/>
      ${p ? `<path d="M${xd} ${y2}L${x2} ${y1}V${y2}Z" fill="${K}"/>` : ''}
      <line x1="${xd}" y1="${y1}" x2="${xd}" y2="${y2}" stroke="${K}" stroke-width="2.2"/>
      <line x1="${x1}" y1="${ym}" x2="${xd}" y2="${ym}" stroke="${K}" stroke-width="2.2"/>
      ${s ? txt((x1+xd)/2, ym-3, s, K, 11) : ''}
      ${n ? txt((x1+xd)/2, y2-7, n, K, 10) : puntini(x1+3, xd-3, y2-8, K)}`);
  };
}

/* Lanci: ellisse per i mezzi pesanti, cerchio per gli elicotteri; rigato
   per il ritardante, vuoto per l'acqua. Prevista = tratteggiata. */
function lancio(grande, ritardante){
  return o => {
    const p = attivo(o), K = ritardante ? C.rosso : C.acqua;
    const tratto = p ? '' : ' stroke-dasharray="5,4"';
    const forma = grande ? `<ellipse cx="32" cy="32" rx="29" ry="14"` : `<circle cx="32" cy="32" r="17"`;
    return T((ritardante ? `<defs>${RIG('sitacRigR', C.rosso, 2.2)}</defs>` : '')
      + `${forma} fill="${ritardante ? 'url(#sitacRigR)' : 'none'}" stroke="${K}" stroke-width="2.6"${tratto}/>`);
  };
}

/* Pendenze: freccia che punta a valle, con tante barrette quanto è ripido.
   Va orientata secondo la linea di massima pendenza. */
function pendenza(n){
  return () => {
    let b = '';
    for (let i = 0; i < n; i++){
      const t = 0.84 - i * 0.12;
      const x = 12 + 44 * t, y = 52 - 42 * t;
      b += `<line x1="${(x-5.5).toFixed(1)}" y1="${(y-5).toFixed(1)}" x2="${(x+5).toFixed(1)}" y2="${(y+5.5).toFixed(1)}" stroke="${C.nero}" stroke-width="2.6"/>`;
    }
    return T(`<line x1="56" y1="10" x2="15" y2="49" stroke="${C.nero}" stroke-width="2.6"/>
      <path d="M8 56l3.5-14.5 10.5 4Z" fill="${C.nero}"/>${b}`);
  };
}

/* Vento: la freccia dice dove va, le barrette in coda l'intensità, il testo
   la velocità — nella tavola è il "(.........Km/h)" sopra l'asta. */
function vento(n){
  return o => {
    let b = '';
    for (let i = 0; i < n; i++){
      const x = 52 - i * 6;
      b += `<line x1="${x}" y1="30" x2="${x-8}" y2="41" stroke="${C.nero}" stroke-width="3"/>`;
    }
    /* Nel quadro fisso il testo sta fuori dal glifo: ruotandolo con la
       freccia diventerebbe illeggibile. */
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
   verdi. Effettuata = cerchio interamente pieno con la sigla in bianco,
   come nella tavola. */
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
agg('pend_lieve','zona',null,'Pendenza lieve','Light slope', pendenza(1), {r:1, r0:226});
agg('pend_moderata','zona',null,'Pendenza moderata','Moderate slope', pendenza(2), {r:1, r0:226});
agg('pend_forte','zona',null,'Pendenza forte','Steep slope', pendenza(3), {r:1, r0:226});

agg('acqua','zona',null,'Punto d\u2019acqua per mezzi terrestri','Water point, ground means',
  () => T(`<circle cx="32" cy="32" r="21" fill="${C.acqua}"/>`));
/* Il punto d'acqua per mezzi aerei porta scritto Eli/CAN sotto il simbolo:
   dice quale macchina ci si può approvvigionare. */
agg('acqua_aerei','zona',null,'Punto d\u2019acqua per mezzi aerei','Water point, air means',
  o => T(`<clipPath id="sitacTondo"><circle cx="32" cy="28" r="19"/></clipPath>
    <circle cx="32" cy="28" r="19" fill="#fff" stroke="${C.acqua}" stroke-width="1.6"/>
    <path d="M13 9h38L13 47h38Z" fill="${C.acqua}" clip-path="url(#sitacTondo)"/>
    ${txt(32, 60, (o && o.testo) || 'Eli/CAN', C.acqua, 12)}`), {e:1});

agg('sensibile','zona',null,'Punto sensibile','Sensitive point',
  () => T(`<path d="M6 12h52L32 57Z" fill="${C.rosso}"/>`));
agg('sensibile_wui','zona',null,'Punto sensibile per interfaccia','Sensitive point for WUI',
  () => T(`<defs>${RIG('sitacRigV', C.verde, 1.6)}</defs>
    <path d="M6 12h52L32 57Z" fill="url(#sitacRigV)" stroke="${C.verde}" stroke-width="2.2"/>`));

agg('elisuperficie','zona',null,'Piazzola per elicottero','Helispot',
  () => T(`<circle cx="32" cy="32" r="20" fill="#fff" stroke="${C.nero}" stroke-width="2.8"/>
    ${txt(32, 40, 'H', C.nero, 24)}`));
/* Traliccio: la tavola 2021 lo aggiunge accanto ai fili a sbalzo, ed è
   l'ostacolo che conta di più per l'elicottero in avvicinamento. */
agg('ripetitore','zona',null,'Ripetitori, antenne, pale eoliche, ecc.','Masts, antennas, wind turbines',
  () => T(`<circle cx="32" cy="11" r="6" fill="${C.nero}"/>
    <path d="M32 15L20 56h24Z" fill="none" stroke="${C.nero}" stroke-width="2.6" stroke-linejoin="round"/>
    <line x1="32" y1="15" x2="32" y2="56" stroke="${C.nero}" stroke-width="2"/>`));
/* La tavola disegna la linea elettrica come un tracciato tratto-punto col
   fulmine sopra: è un attraversamento, non un punto. */
aggL('elettrodotto','zona',null,'Linea elettrica attiva','Power line on',
  {color:C.nero, weight:2.4, dashArray:'14,5,3,5'}, {deco:{tipo:'fulmine', passo:70, dim:24}});
aggL('elettrodotto_off','zona',null,'Linea elettrica disattivata','Power line off',
  {color:C.nero, weight:2.4, dashArray:'14,5,3,5'}, {deco:{tipo:'fulmineOff', passo:70, dim:24}});

/* ---- TAVOLA 2: l'evoluzione dell'incendio ---- */
agg('origine','evoluzione',null,'Area d\u2019origine','Area of origin',
  () => T(`<path d="M32 4l7.7 17.3L58 23.6 44.9 36.1 48.4 54 32 45 15.6 54l3.5-17.9L6 23.6l18.3-2.3Z" fill="${C.rosso}"/>`));
agg('vento_debole','evoluzione',null,'Direzione del vento, intensit\u00e0 debole','Wind direction, light', vento(1), {r:1, e:1, r0:270});
agg('vento_moderato','evoluzione',null,'Direzione del vento, intensit\u00e0 moderata','Wind direction, moderate', vento(2), {r:1, e:1, r0:270});
agg('vento_forte','evoluzione',null,'Direzione del vento, intensit\u00e0 forte','Wind direction, strong', vento(3), {r:1, e:1, r0:270});
agg('inc_chioma','evoluzione',null,'Incendio di chioma','Crown fire', quotaFuoco(0));
agg('inc_radente','evoluzione',null,'Incendio radente','Surface fire', quotaFuoco(1));
agg('inc_sotterraneo','evoluzione',null,'Incendio sotterraneo','Ground fire', quotaFuoco(2));

/* ---- TAVOLA 3: il dispositivo di intervento ---- */
agg('can','dispositivo','sgAereo','Canadair','Canadair', mezzoAereo('CAN'), {s:1, e:1});
agg('s64','dispositivo','sgAereo','S 64','S 64', mezzoAereo('S64'), {s:1, e:1});
agg('fireboss','dispositivo','sgAereo','Fireboss','Fireboss', mezzoAereo('Boss'), {s:1, e:1});
agg('eli','dispositivo','sgAereo','Elicotteri medi e leggeri','Light and medium helicopters', mezzoAereo('Eli'), {s:1, e:1});
agg('eli_com','dispositivo','sgAereo','Elicottero Comando','Command helicopter', mezzoAereo('Eli Com'), {s:1, e:1});
agg('aereo_altro','dispositivo','sgAereo','Altro mezzo aereo','Other air means', mezzoAereo(''), {s:1, e:1});

/* DOS e squadre sono femminili nella tavola: prevista / attiva. */
agg('dos','dispositivo','sgTerra','DOS — Direttore Operazioni Spegnimento','Fire operations director', mezzoTerra('DOS', 1), {s:1, e:1, f:1});
agg('vvf','dispositivo','sgTerra','Squadra VVF','VVF crew', mezzoTerra('VVF', 1), {s:1, e:1, f:1});
agg('vol','dispositivo','sgTerra','Squadra VOL','Volunteer crew', mezzoTerra('VOL', 1), {s:1, e:1, f:1});
agg('gos','dispositivo','sgTerra','Squadra GOS','GOS crew', mezzoTerra('GOS', 1), {s:1, e:1, f:1});
agg('sai','dispositivo','sgTerra','Squadra SAI','SAI crew', mezzoTerra('SAI', 1), {s:1, e:1, f:1});
agg('squadra_altra','dispositivo','sgTerra','Squadra\u2026','Other crew', mezzoTerra('', 1), {s:1, e:1, f:1});
agg('modulo_vvf','dispositivo','sgTerra','Modulo VVF / Gruppo','VVF module / Group', mezzoTerra('', 2), {s:1, e:1});
agg('modulo_ue','dispositivo','sgTerra','Modulo UE / Colonna','EU module / Column', mezzoTerra('', 3), {s:1, e:1});
/* CP, SS e Pol nella tavola non hanno la riga di puntini: nessun testo. */
agg('cp','dispositivo','sgTerra','Posto di Comando','Command post', mezzoTerra('CP', 0, C.rosso, 1), {s:1});
agg('ss','dispositivo','sgTerra','Soccorso Sanitario','Ambulance', mezzoTerra('SS', 0, C.verde, 1), {s:1});
agg('pol','dispositivo','sgTerra','Forze di Polizia','Police forces', mezzoTerra('Pol', 0, C.polizia, 1), {s:1});

/* Transit Point: il cerchio sta su una linea di transito e la freccia dice
   da che parte si entra in zona, quindi va orientato. Attivo = cerchio
   interamente pieno, come nella tavola. */
agg('tp','dispositivo','sgTerra','Transit Point','Transit point', o => {
  const R = C.rosso, p = attivo(o);
  return T(`<line x1="2" y1="32" x2="58" y2="32" stroke="${R}" stroke-width="2.6"/>
    <path d="M50 25l12 7-12 7Z" fill="${R}"/>
    <circle cx="28" cy="32" r="13" fill="${p ? R : '#fff'}" stroke="${R}" stroke-width="2.6"/>
    ${txt(28, 36, (o && o.testo) || 'TP', p ? '#fff' : R, 13)}`);
}, {s:1, r:1, r0:90});

/* ---- TAVOLA 4: le azioni ---- */
/* I lanci pesanti sono ellissi: hanno un asse, e va orientato lungo la
   direzione di lancio. Quelli leggeri sono cerchi e non serve. */
agg('lancio_pesante_ritardante','azioni','sgAereo','Lancio mezzi aerei pesanti con ritardante','Retardant drop, heavy means', lancio(1,1), {s:1, r:1, r0:90});
agg('lancio_pesante_acqua','azioni','sgAereo','Lancio mezzi aerei pesanti con acqua','Water drop, heavy means', lancio(1,0), {s:1, r:1, r0:90});
agg('lancio_leggero_ritardante','azioni','sgAereo','Lancio elicotteri medi e leggeri con ritardante','Retardant drop, light helicopters', lancio(0,1), {s:1});
agg('lancio_leggero_acqua','azioni','sgAereo','Lancio elicotteri medi e leggeri con acqua','Water drop, light helicopters', lancio(0,0), {s:1});

/* Difesa perimetrale: nella tavola 2021 è una raggiera a otto punte attorno
   a uno spazio libero, non la stella a sei della versione precedente. Fra
   prevista ed effettuata cambia il tratto — tratteggiato o continuo — non
   il riempimento: la raggiera resta sempre vuota. */
agg('difesa_perimetrale','azioni','sgTerra','Difesa perimetrale','Perimeter defence', o => {
  const R = C.rosso, p = attivo(o);
  let d = '';
  for (let i = 0; i < 8; i++){
    const a = i * Math.PI / 4, b = a + Math.PI / 8, c = a - Math.PI / 8;
    const px = 32 + 26 * Math.cos(a), py = 32 + 26 * Math.sin(a);
    const bx = 32 + 14 * Math.cos(b), by = 32 + 14 * Math.sin(b);
    const cx = 32 + 14 * Math.cos(c), cy = 32 + 14 * Math.sin(c);
    d += `M${cx.toFixed(1)} ${cy.toFixed(1)}L${px.toFixed(1)} ${py.toFixed(1)}L${bx.toFixed(1)} ${by.toFixed(1)}`;
  }
  const tr = p ? '' : ' stroke-dasharray="4,3"';
  return T(`<path d="${d}Z" fill="none" stroke="${R}" stroke-width="2.4" stroke-linejoin="round"${tr}/>
    <circle cx="32" cy="32" r="9" fill="none" stroke="${R}" stroke-width="2.4"${tr}/>`);
}, {s:1});

agg('accensione_punti','azioni','sgControfuoco','Accensione per punti','Ignition by points', o => T(
  `<circle cx="32" cy="23" r="16" fill="${attivo(o) ? C.rosso : '#fff'}" stroke="${C.rosso}" stroke-width="2.8"/>
   <line x1="32" y1="39" x2="32" y2="50" stroke="${C.rosso}" stroke-width="2.8"/>
   <path d="M25 48l7 12 7-12Z" fill="${C.rosso}"/>`), {s:1});

agg('area_evacuare','azioni','sgEvacuazione','Area da evacuare','Area to evacuate', tondoSigla('Ev', C.verde), {s:1});
agg('zona_sicura','azioni','sgEvacuazione','Zona Sicura','Safety zone', tondoSigla('SZ', C.verde), {s:1});

/* =====================================================================
   3. LINEE
   Metà della tavola sono tracciati. Ognuno porta lo stile Leaflet e, dove
   serve, il motivo ripetuto che sitac.js passa a PolylineDecorator:
   {tipo, passo, dim, pieno}.
   ===================================================================== */
const L = {};
const aggL = (k, g, sg, it, en, stile, extra) => {
  L[k] = Object.assign({g, sg, n:{it, en}}, stile, extra || {});
};

/* ---- TAVOLA 1: viabilità e infrastrutture ---- */
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

/* ---- TAVOLA 2: assi di sviluppo e fronte ---- */
aggL('asse_principale','evoluzione',null,'Asse di sviluppo principale','Head of the fire',
  {color:C.rosso, weight:10, lineCap:'butt'}, {deco:{tipo:'punta', passo:'100%', dim:34, pieno:1}});
aggL('asse_veloce','evoluzione',null,'Asse secondario (veloce)','Secondary axis (fast)',
  {color:C.rosso, weight:3}, {deco:{tipo:'punta', passo:'100%', dim:22}});
aggL('asse_lento','evoluzione',null,'Asse secondario (lento)','Secondary axis (slow)',
  {color:C.rosso, weight:2.5}, {deco:{tipo:'punta', passo:'100%', dim:14}});
aggL('fronte','evoluzione',null,'Fronte dell\u2019incendio','Fire front',
  {color:C.rosso, weight:3}, {deco:{tipo:'scaletta', passo:15, dim:12}});

/* ---- TAVOLA 4: azioni su linea ----
   `stati:1` dice che il tracciato ha prevista/effettuata: tratteggiato
   quando è prevista, pieno quando è fatta. */
aggL('ricognizione','azioni','sgTerra','Ricognizione','Patrol',
  {color:C.rosso, weight:3}, {stati:1, deco:{tipo:'onda', passo:36, dim:13}});
aggL('difesa_linea','azioni','sgTerra','Difesa in linea','Defence on a line',
  {color:C.rosso, weight:3}, {stati:1, deco:{tipo:'triangolo', passo:19, dim:13}});
aggL('attacco_fianchi','azioni','sgTerra','Attacco sui fianchi','Containment attack',
  {color:C.rosso, weight:3}, {stati:1, deco:{tipo:'obliqua', passo:24, dim:14}});
aggL('attacco_localizzato','azioni','sgTerra','Attacco localizzato','Hot spotting',
  {color:C.rosso, weight:4}, {stati:1, deco:{tipo:'punta', passo:'100%', dim:20, pieno:1}});
aggL('bonifica','azioni','sgTerra','Bonifica','Mop up',
  {color:C.rosso, weight:3}, {stati:1, deco:{tipo:'onda', passo:36, dim:13}, badge:'B'});
aggL('linea_sicurezza','azioni','sgControfuoco','Creazione linea di sicurezza','Creation of a safety line',
  {color:C.rosso, weight:3}, {stati:1, deco:{tipo:'rombo', passo:21, dim:14}});
aggL('accensione_linee','azioni','sgControfuoco','Accensione per linee','Ignition by lines',
  {color:C.rosso, weight:7}, {stati:1, deco:{tipo:'punta', passo:'100%', dim:24, pieno:1}});
/* Via di fuga: nera con i chevron. Prevista uno, effettuata tre — è
   l'unico tracciato della tavola in cui cambia il numero di segni. */
aggL('via_fuga','azioni','sgEvacuazione','Via di fuga per evacuazione','Evacuation escape route',
  {color:C.nero, weight:2.6}, {stati:1, deco:{tipo:'chevron', passo:'33%', dim:16}});

/* =====================================================================
   4. TAVOLE E RIQUADRI
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

/* Compatibilità con la versione precedente del modulo: i vecchi GeoJSON
   rientrano ricondotti alle chiavi nuove. */
NS.SITAC_VECCHI = {gruppo:'modulo_vvf', colonna:'modulo_ue', acqua_eli:'acqua_aerei',
  ostacolo_volo:'fune_sbalzo', evacuazione:'area_evacuare'};

})();