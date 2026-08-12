/*!
 * FireOps VVF — sitac-simboli.js — simbologia SITAC
 *
 * Fonte: "SITAC Symbology — Standardization of Firefighting Tactical Situation
 * Management", G. Micillo e L. Torrini, Corpo Nazionale dei Vigili del Fuoco.
 * I 59 simboli della tavola sono qui ridisegnati in SVG: sono forme
 * geometriche regolari, quindi si generano da poche primitive invece di
 * ricalcare 59 tracciati a mano.
 *
 * DUE STATI, NON DUE SIMBOLI
 * La tavola distingue sistematicamente previsto/in atto (PLANNED/ACTIVE per i
 * mezzi, PLANNED/DONE per le azioni), e la differenza è sempre la stessa: il
 * contorno diventa pieno. Qui non sono due voci separate ma un solo simbolo
 * con un parametro `stato`: la barra ha un interruttore unico e i pulsanti
 * restano una quarantina invece di ottanta.
 *
 * COSA VIAGGIA NEL GEOJSON
 * La chiave (`vvf`, `origine`, `lancio_pesante_acqua`…), lo stato e
 * l'eventuale etichetta. Le chiavi sono identificativi tecnici: non vanno
 * tradotte né rinominate, o i file salvati diventano illeggibili.
 *
 * `r` marca i simboli che vanno orientati (pendenze, vento): senza rotazione
 * non dicono nulla. `e` quelli che la tavola vuole accompagnati da un testo
 * (sigla del mezzo, velocità del vento). `s` quelli che hanno i due stati.
 *
 * I colori sono normativi e non vanno rimappati sulla palette di FireOps:
 * qui il rosso distingue il ritardante dall'acqua e i VVF dal soccorso
 * sanitario, non è una scelta grafica.
 */
(function () {
'use strict';
const NS = (window.FireOps = window.FireOps || {});

/* ---------------------------------------------------------------------
   Palette della tavola, campionata dall'originale
   ------------------------------------------------------------------- */
const C = {
  rosso:  '#cc0000',
  verde:  '#009900',
  acqua:  '#3fa9f5',
  giallo: '#ffe000',
  nero:   '#000000'
};

/* Tutti i simboli puntuali vivono in una tela 64x64: un unico sistema di
   coordinate rende confrontabili gli ingombri e semplifica l'ancoraggio. */
const T = dentro => `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">${dentro}</svg>`;
const esc = s => String(s == null ? '' : s).replace(/[<>&"]/g,
  c => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;'}[c]));
const attivo = o => (o && o.stato) === 'attivo';

/* Il testo è parte del simbolo: la sigla distingue Canadair da Fireboss. */
function txt(x, y, s, col, dim){
  return `<text x="${x}" y="${y}" text-anchor="middle" font-size="${dim || 13}"`
    + ` font-family="Arial,Helvetica,sans-serif" font-weight="700" fill="${col}">${esc(s)}</text>`;
}

/* Campitura a 45 gradi: nella tavola distingue il ritardante (rigato)
   dall'acqua (vuoto), e il punto sensibile per interfaccia. */
const RIG = (id, col, largo) => `<pattern id="${id}" width="7" height="7" patternUnits="userSpaceOnUse"`
  + ` patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke="${col}" stroke-width="${largo}"/></pattern>`;

/* =====================================================================
   1. FAMIGLIE
   Le voci della tavola sono variazioni di pochi impianti: cambiano la
   sigla, il numero di aste, il colore. Si generano, non si ridisegnano.
   ===================================================================== */

/* Mezzi aerei (30-35): riquadro con le diagonali e una banda in basso per
   la sigla. Da previsto ad attivo le diagonali si riempiono. */
function mezzoAereo(sigla){
  return o => {
    const p = attivo(o), R = C.rosso;
    const x1 = 5, y1 = 14, x2 = 59, y2 = 42, ym = 50;
    const corpo = p
      ? `<path d="M${x1} ${y1}H${x2}L${x1} ${y2}H${x2}Z" fill="${R}"/>`
      : `<path d="M${x1} ${y1}L${x2} ${y2}M${x2} ${y1}L${x1} ${y2}" stroke="${R}" stroke-width="2" fill="none"/>`;
    const s = (o && o.testo) || sigla;
    return T(`<rect x="${x1}" y="${y1}" width="${x2-x1}" height="${y2-y1}" fill="#fff" stroke="${R}" stroke-width="2.6"/>
      ${corpo}
      <rect x="${x1}" y="${y2}" width="${x2-x1}" height="${ym-y2}" fill="#fff" stroke="${R}" stroke-width="2.6"/>
      ${s ? txt(32, ym-2, s, R, s.length > 5 ? 9 : 11)
          : `<line x1="${x1+4}" y1="${ym-3}" x2="${x2-4}" y2="${ym-3}" stroke="${R}" stroke-width="1.6" stroke-dasharray="2,2.5"/>`}`);
  };
}

/* Mezzi a terra (36-45): riquadro con la sigla, una asta sopra per la
   squadra, due per il gruppo, tre per la colonna. Attivo = triangolo
   pieno nell'angolo destro. */
function mezzoTerra(sigla, aste, col){
  return o => {
    const p = attivo(o), K = col || C.rosso;
    const x1 = 4, y1 = 21, x2 = 60, y2 = 45, h = y2 - y1;
    let a = '';
    if (aste < 0){
      /* Posto di comando: non ha le aste dei reparti ma il palo laterale
         che scende, quello che nella tavola lo pianta sul terreno. */
      a = `<line x1="${x1}" y1="${y1}" x2="${x1}" y2="${y2+9}" stroke="${K}" stroke-width="2.6"/>`;
    }
    const passo = (x2 - x1) / (aste + 1);
    for (let i = 1; i <= aste; i++){
      const x = (x1 + passo * i).toFixed(1);
      a += `<line x1="${x}" y1="${y1}" x2="${x}" y2="${y1-10}" stroke="${K}" stroke-width="2.6"/>`;
    }
    const s = (o && o.testo) || sigla;
    return T(`${a}
      <rect x="${x1}" y="${y1}" width="${x2-x1}" height="${h}" fill="#fff" stroke="${K}" stroke-width="2.6"/>
      ${p ? `<path d="M${x2-h} ${y2}H${x2}V${y1}Z" fill="${K}"/>` : ''}
      ${s ? txt(p ? 28 : 32, y2-7, s, K, 15)
          : `<line x1="${x1+5}" y1="${y2-5}" x2="${p ? x2-h-4 : x2-5}" y2="${y2-5}" stroke="${K}" stroke-width="1.8" stroke-dasharray="2,3"/>`}`);
  };
}

/* Lanci (46-49): ellisse per i mezzi pesanti, cerchio per gli elicotteri;
   rigato per il ritardante, vuoto per l'acqua. Previsto = tratteggiato. */
function lancio(grande, ritardante){
  return o => {
    const p = attivo(o), K = ritardante ? C.rosso : C.acqua;
    const tratto = p ? '' : ' stroke-dasharray="5,4"';
    const forma = grande ? `<ellipse cx="32" cy="32" rx="29" ry="16"` : `<circle cx="32" cy="32" r="18"`;
    return T(`<defs>${RIG('sitacRigR', C.rosso, 2.2)}</defs>`
      + `${forma} fill="${ritardante ? 'url(#sitacRigR)' : 'none'}" stroke="${K}" stroke-width="2.6"${tratto}/>`);
  };
}

/* Pendenze (8-10): freccia che punta a valle, con tante barrette quanto
   è ripido. Va orientata secondo la linea di massima pendenza. */
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

/* Vento (24-26): la freccia dice da dove spira, le barrette l'intensità,
   l'etichetta la velocità in km/h. */
function vento(n){
  return o => {
    let b = '';
    for (let i = 0; i < n; i++){
      const x = 52 - i * 6;
      b += `<line x1="${x}" y1="30" x2="${x-8}" y2="41" stroke="${C.nero}" stroke-width="3"/>`;
    }
    return T(`<line x1="56" y1="35" x2="14" y2="35" stroke="${C.nero}" stroke-width="2.6"/>
      <path d="M5 35l13-6.5v13Z" fill="${C.nero}"/>${b}
      ${o && o.testo ? txt(34, 21, o.testo, C.nero, 11) : ''}`);
  };
}

/* Tipo di incendio (27-29): tre rami, il pieno dice a che quota corre il
   fuoco — chioma in alto, radente in mezzo, sotterraneo in basso. */
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

/* =====================================================================
   2. SIMBOLI PUNTUALI
   ===================================================================== */
const S = {};
const agg = (k, g, it, en, svg, extra) => { S[k] = Object.assign({g, n:{it, en}, svg}, extra || {}); };

/* ---- Zona di intervento (8-18) ---- */
agg('pend_lieve','zona','Pendenza lieve','Light slope', pendenza(1), {r:1});
agg('pend_moderata','zona','Pendenza moderata','Moderate slope', pendenza(2), {r:1});
agg('pend_forte','zona','Pendenza forte','Steep slope', pendenza(3), {r:1});

const FULMINE = `<path d="M38 5L17 35h11l-5 24 25-33H36l8-21Z" fill="${C.giallo}" stroke="${C.nero}" stroke-width="2" stroke-linejoin="round"/>`;
agg('elettrodotto','zona','Linea elettrica in tensione','Power line on', () => T(FULMINE));
agg('elettrodotto_off','zona','Linea elettrica disattivata','Power line off',
  () => T(`${FULMINE}<path d="M9 9L55 55M55 9L9 55" stroke="${C.nero}" stroke-width="3"/>`));

agg('acqua','zona','Punto d\u2019acqua','Water point',
  () => T(`<circle cx="32" cy="32" r="21" fill="${C.acqua}"/>`));
agg('acqua_eli','zona','Punto d\u2019acqua per elicotteri','Water point for helicopters',
  () => T(`<clipPath id="sitacTondo"><circle cx="32" cy="32" r="21"/></clipPath>
    <circle cx="32" cy="32" r="21" fill="#fff" stroke="${C.acqua}" stroke-width="1.6"/>
    <path d="M11 11h42L11 53h42Z" fill="${C.acqua}" clip-path="url(#sitacTondo)"/>`));

agg('sensibile','zona','Punto sensibile','Sensitive point',
  () => T(`<path d="M6 12h52L32 57Z" fill="${C.rosso}"/>`));
agg('sensibile_wui','zona','Punto sensibile per interfaccia','Sensitive point for WUI',
  () => T(`<defs>${RIG('sitacRigV', C.verde, 1.6)}</defs>
    <path d="M6 12h52L32 57Z" fill="url(#sitacRigV)" stroke="${C.verde}" stroke-width="2.2"/>`));

agg('elisuperficie','zona','Piazzola per elicottero','Helispot',
  () => T(`<circle cx="32" cy="32" r="20" fill="#fff" stroke="${C.nero}" stroke-width="2.8"/>
    ${txt(32, 40, 'H', C.nero, 24)}`));
agg('ostacolo_volo','zona','Altri ostacoli alla navigazione aerea','Other flight obstacles',
  () => T(`<line x1="6" y1="25" x2="58" y2="34" stroke="${C.nero}" stroke-width="2.6"/>
    <line x1="31" y1="30" x2="31" y2="41" stroke="${C.nero}" stroke-width="2.6"/>
    <rect x="23" y="41" width="16" height="10" fill="${C.nero}"/>`));

/* ---- Evoluzione dell'incendio (22, 24-29) ---- */
agg('origine','incendio','Punto di origine','Point of origin',
  () => T(`<path d="M32 4l7.7 17.3L58 23.6 44.9 36.1 48.4 54 32 45 15.6 54l3.5-17.9L6 23.6l18.3-2.3Z" fill="${C.rosso}"/>`));
agg('vento_debole','incendio','Vento di intensit\u00e0 debole','Wind, light intensity', vento(1), {r:1, e:1});
agg('vento_moderato','incendio','Vento di intensit\u00e0 moderata','Wind, moderate intensity', vento(2), {r:1, e:1});
agg('vento_forte','incendio','Vento di intensit\u00e0 forte','Wind, steep intensity', vento(3), {r:1, e:1});
agg('inc_chioma','incendio','Incendio di chioma','Crown fire', quotaFuoco(0));
agg('inc_radente','incendio','Incendio radente','Surface fire', quotaFuoco(1));
agg('inc_sotterraneo','incendio','Incendio sotterraneo','Ground fire', quotaFuoco(2));

/* ---- Mezzi aerei (30-35) ---- */
agg('can','aerei','Canadair','Canadair', mezzoAereo('CAN'), {s:1, e:1});
agg('s64','aerei','S 64','S 64', mezzoAereo('S 64'), {s:1, e:1});
agg('fireboss','aerei','Fireboss','Fireboss', mezzoAereo('Boss'), {s:1, e:1});
agg('eli','aerei','Elicotteri medi e leggeri','Light and medium helicopter', mezzoAereo('Eli'), {s:1, e:1});
agg('eli_com','aerei','Elicottero Comando','Heli commander', mezzoAereo('Eli Com'), {s:1, e:1});
agg('aereo_altro','aerei','Altro mezzo aereo','Other air means', mezzoAereo(''), {s:1, e:1});

/* ---- Mezzi a terra (36-45) ---- */
agg('vvf','terra','Squadra Vigili del Fuoco','Fire fighting crew', mezzoTerra('VVF', 1), {s:1, e:1});
agg('vol','terra','Squadra Volontari','Volunteer crew', mezzoTerra('VOL', 1), {s:1, e:1});
agg('gos','terra','Squadra GOS','GOS crew', mezzoTerra('GOS', 1), {s:1, e:1});
agg('sai','terra','Squadra SAI','SAI crew', mezzoTerra('SAI', 1), {s:1, e:1});
agg('squadra_altra','terra','Altra squadra','Other crew', mezzoTerra('', 1), {s:1, e:1});
agg('gruppo','terra','Gruppo','Group', mezzoTerra('', 2), {s:1, e:1});
agg('colonna','terra','Colonna','Column', mezzoTerra('', 3), {s:1, e:1});
agg('cp','terra','Posto di comando','Command post', mezzoTerra('CP', -1), {s:1, e:1});
agg('ss','terra','Soccorso sanitario','Ambulance', mezzoTerra('SS', 0, C.verde), {s:1, e:1});

/* Transit point (44): il cerchio sta su una linea di transito e la
   freccia dice da che parte si entra in zona. */
agg('tp','terra','Transit point','Transit point', o => {
  const R = C.rosso;
  return T(`<line x1="2" y1="32" x2="58" y2="32" stroke="${R}" stroke-width="2.6"/>
    <path d="M50 25l12 7-12 7Z" fill="${R}"/>
    <circle cx="28" cy="32" r="13" fill="#fff" stroke="${R}" stroke-width="2.6"/>
    ${attivo(o) ? `<path d="M15 32a13 13 0 0 0 26 0Z" fill="${R}"/>` : ''}
    ${txt(28, 35, (o && o.testo) || 'TP', R, 13)}`);
}, {s:1});

/* ---- Azioni puntuali (46-49, 51, 53, 58) ---- */
agg('lancio_pesante_ritardante','azioni','Lancio mezzi aerei pesanti con ritardante','Fire retardant drop, heavy means', lancio(1,1), {s:1});
agg('lancio_pesante_acqua','azioni','Lancio mezzi aerei pesanti con acqua','Water drop, heavy means', lancio(1,0), {s:1});
agg('lancio_leggero_ritardante','azioni','Lancio elicotteri con ritardante','Retardant drop, light helicopters', lancio(0,1), {s:1});
agg('lancio_leggero_acqua','azioni','Lancio elicotteri con acqua','Water drop, light helicopters', lancio(0,0), {s:1});

agg('evacuazione','azioni','Evacuazione','Evacuation', o => T(
  `<circle cx="32" cy="32" r="20" fill="#fff" stroke="${C.verde}" stroke-width="3"/>
   ${attivo(o) ? `<path d="M12 32a20 20 0 0 0 40 0Z" fill="${C.verde}"/>` : ''}
   ${txt(32, 36, 'Ev', C.verde, 19)}`), {s:1});

agg('difesa_perimetrale','azioni','Difesa perimetrale','Perimeter defence', o => {
  const R = C.rosso, t1 = 'M32 4l24 42H8Z', t2 = 'M32 60L8 18h48Z';
  return attivo(o)
    ? T(`<path d="${t1}" fill="${R}"/><path d="${t2}" fill="${R}"/><circle cx="32" cy="32" r="10" fill="#fff"/>`)
    : T(`<path d="${t1}" fill="none" stroke="${R}" stroke-width="2.8"/><path d="${t2}" fill="none" stroke="${R}" stroke-width="2.8"/>`);
}, {s:1});

agg('accensione_punti','azioni','Accensione per punti','Ignition by points', o => T(
  `<circle cx="32" cy="23" r="16" fill="${attivo(o) ? C.rosso : '#fff'}" stroke="${C.rosso}" stroke-width="2.8"/>
   <line x1="32" y1="39" x2="32" y2="50" stroke="${C.rosso}" stroke-width="2.8"/>
   <path d="M25 48l7 12 7-12Z" fill="${C.rosso}"/>`), {s:1});

/* =====================================================================
   3. LINEE
   Nella tavola metà dei simboli sono tracciati, non punti. Ognuno porta
   lo stile Leaflet e, dove serve, il motivo ripetuto che sitac.js passa a
   PolylineDecorator: {tipo, passo, dim, pieno}.
   ===================================================================== */
const L = {};
const aggL = (k, g, it, en, stile, extra) => { L[k] = Object.assign({g, n:{it, en}}, stile, extra || {}); };

/* Viabilità (1-7): il tratto dice la percorribilità, il badge 4x4 il
   fondo non asfaltato. */
aggL('sentiero','viabilita','Sentiero o mulattiera','Trail',
  {color:C.nero, weight:3, dashArray:'14,5,3,5'});
aggL('strada_leggeri','viabilita','Strada per mezzi leggeri','Light means road',
  {color:C.nero, weight:3, dashArray:'11,8'});
aggL('sterrata_leggeri','viabilita','Strada sterrata per mezzi leggeri','Unpaved road, light means',
  {color:C.nero, weight:3, dashArray:'11,8'}, {badge:'4x4'});
aggL('strada_pesanti','viabilita','Strada per mezzi pesanti','Heavy means road',
  {color:C.nero, weight:3.5});
aggL('sterrata_pesanti','viabilita','Strada sterrata per mezzi pesanti','Unpaved road, heavy means',
  {color:C.nero, weight:3.5}, {badge:'4x4'});
aggL('senso_unico','viabilita','Senso di marcia obbligatorio','One way only',
  {color:C.nero, weight:3}, {deco:{tipo:'freccia', passo:'25%', dim:13}});
aggL('accesso_interrotto','viabilita','Accesso interrotto','Road closed',
  {color:C.nero, weight:3.5}, {deco:{tipo:'croce', passo:'50%', dim:18}});

/* Evoluzione (19-21, 23): l'asse principale è la freccia piena, i
   secondari sono vuoti e si distinguono per il calibro. */
aggL('asse_principale','incendio','Asse di sviluppo principale','Head of the fire',
  {color:C.rosso, weight:10}, {deco:{tipo:'punta', passo:'100%', dim:28, pieno:1}});
aggL('asse_veloce','incendio','Asse di sviluppo secondario veloce','Fire flank, fast',
  {color:C.rosso, weight:3}, {deco:{tipo:'punta', passo:'100%', dim:22}});
aggL('asse_lento','incendio','Asse di sviluppo secondario lento','Fire flank, slow',
  {color:C.rosso, weight:2.5}, {deco:{tipo:'punta', passo:'100%', dim:14}});
aggL('fronte','incendio','Fronte dell\u2019incendio','Fire front',
  {color:C.rosso, weight:3}, {deco:{tipo:'scaletta', passo:15, dim:12}});

/* Azioni su linea (50, 52, 54-57, 59): `stati:1` dice che la linea ha
   previsto/in atto — tratteggiata quando è prevista, piena quando è fatta. */
aggL('ricognizione','azioni','Ricognizione','Patrol',
  {color:C.rosso, weight:3}, {stati:1, deco:{tipo:'onda', passo:36, dim:13}});
aggL('difesa_linea','azioni','Difesa in linea','Defence on a line',
  {color:C.rosso, weight:3}, {stati:1, deco:{tipo:'triangolo', passo:19, dim:13}});
aggL('attacco_fianchi','azioni','Attacco sui fianchi','Containment attack',
  {color:C.rosso, weight:3}, {stati:1, deco:{tipo:'obliqua', passo:24, dim:14}});
aggL('attacco_localizzato','azioni','Attacco localizzato','Hot spotting',
  {color:C.rosso, weight:4}, {stati:1, deco:{tipo:'punta', passo:'100%', dim:20, pieno:1}});
aggL('bonifica','azioni','Bonifica','Mop up',
  {color:C.rosso, weight:3}, {stati:1, deco:{tipo:'onda', passo:36, dim:13}, badge:'B'});
aggL('linea_sicurezza','azioni','Creazione linea di sicurezza','Creation of a safety line',
  {color:C.rosso, weight:3}, {stati:1, deco:{tipo:'rombo', passo:21, dim:14}});
aggL('accensione_linee','azioni','Accensione per linee','Ignition by lines',
  {color:C.rosso, weight:7}, {stati:1, deco:{tipo:'punta', passo:'100%', dim:24, pieno:1}});

/* =====================================================================
   4. GRUPPI
   L'ordine è quello della tavola: prima il terreno su cui si opera, poi
   l'incendio, poi chi interviene, infine cosa fa.
   ===================================================================== */
NS.SITAC_SIMBOLI = S;
NS.SITAC_LINEE   = L;
NS.SITAC_COLORI  = C;
NS.SITAC_GRUPPI  = [
  {k:'viabilita', n:{it:'Viabilit\u00e0', en:'Roads'}},
  {k:'zona',      n:{it:'Zona di intervento', en:'Operating area'}},
  {k:'incendio',  n:{it:'Evoluzione dell\u2019incendio', en:'Fire progression'}},
  {k:'aerei',     n:{it:'Mezzi aerei', en:'Air means'}},
  {k:'terra',     n:{it:'Mezzi a terra', en:'Ground forces'}},
  {k:'azioni',    n:{it:'Azioni', en:'Actions'}}
];

})();