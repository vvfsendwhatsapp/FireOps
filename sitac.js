/*!
 * FireOps VVF — sitac.js — SITAC incendio boschivo
 * Dipendenze (nell'ordine): Leaflet 1.9 · Geoman 2.15 · PolylineDecorator 1.6
 *                           sitac-simboli.js (dati della simbologia)
 * Markup: sezione #sitac-aib di index.html
 * Stile:  style.css, sezione MODULI AGGIUNTIVI
 *
 * Tutto vive dentro #sitac-app tranne bandiere, descrizione e pulsante
 * Espandi, che stanno nella riga sopra. Nessuna variabile globale: si
 * aggancia al pannello con un ResizeObserver, come convertitore.js, perché
 * Leaflet nasce con altezza zero se la sezione è ancora nel magazzino.
 *
 * SIMBOLOGIA
 * Simboli e tracciati arrivano da sitac-simboli.js e seguono la tavola
 * SITAC del Corpo Nazionale. Qui non se ne ridefinisce nessuno: questo file
 * si occupa solo di disegnarli, salvarli e ricaricarli.
 *
 * STATO PREVISTO / IN ATTO
 * La tavola distingue sistematicamente ciò che è pianificato da ciò che è
 * in atto o completato. Non sono voci separate ma un interruttore in cima
 * alla barra: vale per il prossimo elemento disegnato, e viaggia nel
 * GeoJSON insieme al tipo.
 */
(function () {
'use strict';
const NS = (window.FireOps = window.FireOps || {});
if (NS.Sitac) return;

function avvia(app){
  /* Bandiere, descrizione e pulsante Espandi stanno nella riga sopra
     #sitac-app, fuori dal riquadro: le ricerche partono dalla sezione.
     La classe .sitac-stretto e la stampa restano su #sitac-app. */
  const radice = app.closest('.page-section') || app;
  const q  = s => radice.querySelector(s);
  const qq = s => radice.querySelectorAll(s);

  /* =======================================================================
     0. LINGUE
     La chiave `tipo` nel GeoJSON resta sempre quella tecnica: cambiare
     lingua non tocca in alcun modo i file esportati.
     ===================================================================== */
  const BANDIERE = {
    it:'<svg viewBox="0 0 9 6"><rect width="3" height="6" fill="#008C45"/><rect x="3" width="3" height="6" fill="#F4F5F0"/><rect x="6" width="3" height="6" fill="#CD212A"/></svg>',
    en:'<svg viewBox="0 0 60 30"><clipPath id="cUk"><rect width="60" height="30"/></clipPath><g clip-path="url(#cUk)"><rect width="60" height="30" fill="#012169"/><path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" stroke-width="6"/><path d="M0,0 L60,30 M60,0 L0,30" stroke="#C8102E" stroke-width="3"/><path d="M30,0 v30 M0,15 h60" stroke="#fff" stroke-width="10"/><path d="M30,0 v30 M0,15 h60" stroke="#C8102E" stroke-width="6"/></g></svg>',
    fr:'<svg viewBox="0 0 9 6"><rect width="3" height="6" fill="#002395"/><rect x="3" width="3" height="6" fill="#fff"/><rect x="6" width="3" height="6" fill="#ED2939"/></svg>',
    es:'<svg viewBox="0 0 12 8"><rect width="12" height="8" fill="#AA151B"/><rect y="2" width="12" height="4" fill="#F1BF00"/></svg>'
  };

  const L10N = {
    it:{
      sub:'Scegli lo stato, poi uno strumento, poi disegna sulla mappa. Doppio clic o Invio per chiudere una linea.',
      gStato:'Stato', statoPrevisto:'Previsto', statoAttivo:'In atto',
      gAree:'Aree', gModifica:'Modifica', gMappa:'Mappa e dati', gEsporta:'Esporta',
      areeFuori:'Perimetri fuori tavola SITAC: servono al calcolo della superficie.',
      legenda:'Legenda', legVuota:'Nessun elemento sulla mappa.',
      bSposta:'Sposta', bElimina:'Elimina', bAnnulla:'Annulla ultimo', bPulisci:'Cancella tutto',
      bSfondo:'Sfondo', bDoveSono:'Dove sono', bImporta:'Importa', bStampa:'Stampa',
      pronto:'Pronto.\nScegli uno strumento a sinistra.',
      spento:'Strumento disattivato.',
      suggLinea:'Clic per i vertici, doppio clic per chiudere.',
      suggArea:'Clic per i vertici, clic sul primo per chiudere.',
      suggSimbolo:'Clic sulla mappa per posizionare.',
      promptSigla:'Sigla o testo accanto al simbolo:',
      promptDirezione:'Direzione in gradi (0 = Nord, 90 = Est):',
      promptEtichetta:'Testo dell\'annotazione:',
      modOn:'Modifica attiva.\nTrascina i vertici o i simboli.', modOff:'Modifica disattivata.',
      elimOn:'Eliminazione attiva.\nClic su un elemento per rimuoverlo.', elimOff:'Eliminazione disattivata.',
      nienteAnnulla:'Niente da annullare.', giaVuota:'La mappa è già vuota.',
      confPulisci:'Cancellare tutti gli elementi disegnati?',
      sfondo:'Sfondo: {n}', localizzo:'Localizzazione in corso…',
      posizione:'Posizione: {lat}, {lon}\n±{m} m',
      posErrore:'Posizione non disponibile.\nSu http non locale il GPS è bloccato.',
      nienteExport:'Niente da esportare.',
      geojsonFatto:'GeoJSON: {n} elementi.\nÈ l\'unico formato che rientra qui identico.',
      kmlFatto:'KML: {n} elementi ({a} poligoni).\nApribile in QGIS e Google Earth.',
      fileErrato:'File non valido: {e}', importati:'Importati {n} elementi.',
      conteggio:'{l} linee · {a} aree · {s} simboli', superficie:'\nSuperficie totale: {v} ha',
      kmlDoc:'SITAC incendio boschivo', kmlAree:'Aree', kmlLinee:'Linee', kmlSimboli:'Simboli',
      sfSat:'Satellite', sfTopo:'Topografico', sfStrada:'Stradale'
    },
    en:{
      sub:'Pick a state, then a tool, then draw on the map. Double-click or Enter closes a line.',
      gStato:'State', statoPrevisto:'Planned', statoAttivo:'Active',
      gAree:'Areas', gModifica:'Edit', gMappa:'Map and data', gEsporta:'Export',
      areeFuori:'Polygons outside the SITAC table: used for the area calculation.',
      legenda:'Legend', legVuota:'Nothing on the map yet.',
      bSposta:'Move', bElimina:'Delete', bAnnulla:'Undo last', bPulisci:'Clear all',
      bSfondo:'Basemap', bDoveSono:'Locate me', bImporta:'Import', bStampa:'Print',
      pronto:'Ready.\nPick a tool on the left.',
      spento:'Tool switched off.',
      suggLinea:'Click each vertex, double-click to close.',
      suggArea:'Click each vertex, click the first one to close.',
      suggSimbolo:'Click the map to place it.',
      promptSigla:'Label next to the symbol:',
      promptDirezione:'Direction in degrees (0 = North, 90 = East):',
      promptEtichetta:'Note text:',
      modOn:'Edit mode on.\nDrag vertices or symbols.', modOff:'Edit mode off.',
      elimOn:'Delete mode on.\nClick an element to remove it.', elimOff:'Delete mode off.',
      nienteAnnulla:'Nothing to undo.', giaVuota:'The map is already empty.',
      confPulisci:'Delete every drawn element?',
      sfondo:'Basemap: {n}', localizzo:'Locating…',
      posizione:'Position: {lat}, {lon}\n±{m} m',
      posErrore:'Position unavailable.\nGPS is blocked on non-local http.',
      nienteExport:'Nothing to export.',
      geojsonFatto:'GeoJSON: {n} elements.\nThe only format that comes back in unchanged.',
      kmlFatto:'KML: {n} elements ({a} polygons).\nOpens in QGIS and Google Earth.',
      fileErrato:'Invalid file: {e}', importati:'{n} elements imported.',
      conteggio:'{l} lines · {a} areas · {s} symbols', superficie:'\nTotal area: {v} ha',
      kmlDoc:'Wildfire SITAC', kmlAree:'Areas', kmlLinee:'Lines', kmlSimboli:'Symbols',
      sfSat:'Satellite', sfTopo:'Topographic', sfStrada:'Street'
    },
    fr:{
      sub:'Choisissez un état, puis un outil, puis dessinez sur la carte. Double-clic ou Entrée pour fermer une ligne.',
      gStato:'État', statoPrevisto:'Prévu', statoAttivo:'En cours',
      gAree:'Zones', gModifica:'Modifier', gMappa:'Carte et données', gEsporta:'Exporter',
      areeFuori:'Polygones hors tableau SITAC : ils servent au calcul de la surface.',
      legenda:'Légende', legVuota:'Rien sur la carte pour le moment.',
      bSposta:'Déplacer', bElimina:'Supprimer', bAnnulla:'Annuler le dernier', bPulisci:'Tout effacer',
      bSfondo:'Fond de carte', bDoveSono:'Ma position', bImporta:'Importer', bStampa:'Imprimer',
      pronto:'Prêt.\nChoisissez un outil à gauche.',
      spento:'Outil désactivé.',
      suggLinea:'Cliquez chaque sommet, double-clic pour fermer.',
      suggArea:'Cliquez chaque sommet, cliquez le premier pour fermer.',
      suggSimbolo:'Cliquez sur la carte pour le poser.',
      promptSigla:'Texte à côté du symbole :',
      promptDirezione:'Direction en degrés (0 = Nord, 90 = Est) :',
      promptEtichetta:'Texte de l\'annotation :',
      modOn:'Modification active.\nDéplacez les sommets ou les symboles.', modOff:'Modification désactivée.',
      elimOn:'Suppression active.\nCliquez un élément pour le retirer.', elimOff:'Suppression désactivée.',
      nienteAnnulla:'Rien à annuler.', giaVuota:'La carte est déjà vide.',
      confPulisci:'Supprimer tous les éléments dessinés ?',
      sfondo:'Fond : {n}', localizzo:'Localisation en cours…',
      posizione:'Position : {lat}, {lon}\n±{m} m',
      posErrore:'Position indisponible.\nLe GPS est bloqué en http non local.',
      nienteExport:'Rien à exporter.',
      geojsonFatto:'GeoJSON : {n} éléments.\nSeul format qui revient ici à l\'identique.',
      kmlFatto:'KML : {n} éléments ({a} polygones).\nS\'ouvre dans QGIS et Google Earth.',
      fileErrato:'Fichier invalide : {e}', importati:'{n} éléments importés.',
      conteggio:'{l} lignes · {a} zones · {s} symboles', superficie:'\nSurface totale : {v} ha',
      kmlDoc:'SITAC feu de forêt', kmlAree:'Zones', kmlLinee:'Lignes', kmlSimboli:'Symboles',
      sfSat:'Satellite', sfTopo:'Topographique', sfStrada:'Routier'
    },
    es:{
      sub:'Elige un estado, luego una herramienta y dibuja en el mapa. Doble clic o Intro para cerrar una línea.',
      gStato:'Estado', statoPrevisto:'Previsto', statoAttivo:'En curso',
      gAree:'Áreas', gModifica:'Editar', gMappa:'Mapa y datos', gEsporta:'Exportar',
      areeFuori:'Polígonos fuera de la tabla SITAC: sirven para calcular la superficie.',
      legenda:'Leyenda', legVuota:'Todavía no hay nada en el mapa.',
      bSposta:'Mover', bElimina:'Eliminar', bAnnulla:'Deshacer último', bPulisci:'Borrar todo',
      bSfondo:'Fondo', bDoveSono:'Mi ubicación', bImporta:'Importar', bStampa:'Imprimir',
      pronto:'Listo.\nElige una herramienta a la izquierda.',
      spento:'Herramienta desactivada.',
      suggLinea:'Haz clic en cada vértice, doble clic para cerrar.',
      suggArea:'Haz clic en cada vértice, clic en el primero para cerrar.',
      suggSimbolo:'Haz clic en el mapa para colocarlo.',
      promptSigla:'Texto junto al símbolo:',
      promptDirezione:'Dirección en grados (0 = Norte, 90 = Este):',
      promptEtichetta:'Texto de la anotación:',
      modOn:'Edición activa.\nArrastra los vértices o los símbolos.', modOff:'Edición desactivada.',
      elimOn:'Eliminación activa.\nHaz clic en un elemento para quitarlo.', elimOff:'Eliminación desactivada.',
      nienteAnnulla:'Nada que deshacer.', giaVuota:'El mapa ya está vacío.',
      confPulisci:'¿Borrar todos los elementos dibujados?',
      sfondo:'Fondo: {n}', localizzo:'Localizando…',
      posizione:'Posición: {lat}, {lon}\n±{m} m',
      posErrore:'Posición no disponible.\nEn http no local el GPS está bloqueado.',
      nienteExport:'Nada que exportar.',
      geojsonFatto:'GeoJSON: {n} elementos.\nEl único formato que vuelve aquí idéntico.',
      kmlFatto:'KML: {n} elementos ({a} polígonos).\nSe abre en QGIS y Google Earth.',
      fileErrato:'Archivo no válido: {e}', importati:'{n} elementos importados.',
      conteggio:'{l} líneas · {a} áreas · {s} símbolos', superficie:'\nSuperficie total: {v} ha',
      kmlDoc:'SITAC incendio forestal', kmlAree:'Áreas', kmlLinee:'Líneas', kmlSimboli:'Símbolos',
      sfSat:'Satélite', sfTopo:'Topográfico', sfStrada:'Callejero'
    }
  };

  /* Si parte in italiano: siamo in sala operativa. Per seguire invece la
     lingua del browser: lingua = (navigator.language||'it').slice(0,2); */
  let lingua = 'it';
  if (!L10N[lingua]) lingua = 'it';

  const t = (chiave, val) => {
    let s = (L10N[lingua] && L10N[lingua][chiave]) || L10N.it[chiave] || chiave;
    if (val) Object.keys(val).forEach(k => { s = s.split('{'+k+'}').join(val[k]); });
    return s;
  };
  /* I nomi della tavola esistono in italiano e inglese: per francese e
     spagnolo si ricade sull'italiano, che è la lingua della fonte. */
  const nm = d => { const x = d && d.n; return (x && (x[lingua] || x.it)) || ''; };

  /* =======================================================================
     1. SIMBOLOGIA
     ===================================================================== */
  const SIM  = NS.SITAC_SIMBOLI || {};
  const LIN  = NS.SITAC_LINEE   || {};
  const COL  = NS.SITAC_COLORI  || {rosso:'#cc0000'};

  /* Perimetri: la tavola SITAC non prevede poligoni campiti, ma l'area
     percorsa e il fronte attivo sono ciò che si legge per primo su una
     carta, e la superficie in ettari si calcola solo su un poligono.
     Restano quindi qui, dichiaratamente fuori standard e in un gruppo a
     parte, per non farli passare per simbologia normata. */
  const AREE = {
    percorsa:   {color:'#6b6b6b', fillColor:'#3a3a3a', fillOpacity:.55, dashArray:'8,6', weight:2,
      n:{it:'Superficie percorsa', en:'Burned area', fr:'Surface parcourue', es:'Superficie quemada'}},
    attiva:     {color:COL.rosso, fillColor:COL.rosso, fillOpacity:.28, weight:3,
      n:{it:'Area a fuoco attivo', en:'Active fire area', fr:'Zone en feu', es:'Área en llamas'}},
    minacciata: {color:'#e8a000', fillColor:'#e8a000', fillOpacity:.15, weight:2, dashArray:'4,5',
      n:{it:'Zona minacciata', en:'Threatened area', fr:'Zone menacée', es:'Zona amenazada'}},
    evacuata:   {color:COL.verde || '#009900', fillColor:COL.verde || '#009900', fillOpacity:.16, weight:2,
      n:{it:'Zona evacuata', en:'Evacuated area', fr:'Zone évacuée', es:'Zona evacuada'}},
    bonificata: {color:'#0070c0', fillColor:'#0070c0', fillOpacity:.15, weight:2,
      n:{it:'Zona bonificata', en:'Mopped up area', fr:'Zone noyée', es:'Zona liquidada'}}
  };

  /* Annotazione libera: non è nella tavola, ma scrivere un orario o un
     nome sulla carta è la cosa che si fa più spesso in sala operativa. */
  const NOTA = {libero:1, n:{it:'Annotazione', en:'Note', fr:'Annotation', es:'Anotación'}};

  const GRUPPI = (NS.SITAC_GRUPPI || []).slice();

  const escapeHtml = s => String(s == null ? '' : s).replace(/[<>&"]/g,
    c => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;'}[c]));

  /* Il colore non è un campo dei simboli: sta dentro il disegno, dove
     serve. Per il KML, che vuole un colore solo, si prende il primo del
     tracciato saltando il bianco, che è sempre fondo e mai significato.
     I <defs> vanno scartati prima: contengono la campitura del ritardante
     anche nei lanci d'acqua, che uscirebbero rossi invece che azzurri. */
  function coloreSimbolo(k){
    const d = SIM[k];
    if (!d || !d.svg) return COL.rosso;
    const corpo = d.svg({stato:'attivo'}).replace(/<defs>[\s\S]*?<\/defs>/g, '');
    const tutti = (corpo.match(/#[0-9a-fA-F]{6}/g) || [])
      .filter(c => c.toLowerCase() !== '#ffffff');
    return tutti[0] || COL.rosso;
  }

  function svgSimbolo(k, opz){
    const d = SIM[k];
    return d && d.svg ? d.svg(opz || {}) : '';
  }

  /* L'icona porta con sé stato, rotazione e sigla: sono dati del simbolo,
     non decorazione, e vanno ricostruiti identici al reimport. */
  function iconaSimbolo(k, opz){
    const o = opz || {};
    if (k === 'nota')
      return L.divIcon({className:'sitac-etichetta', html: escapeHtml(o.testo || ''),
        iconSize:null, iconAnchor:[0,10]});
    const gir = o.rotazione ? ` style="transform:rotate(${o.rotazione}deg)"` : '';
    return L.divIcon({className:'sitac-sim',
      html:`<span class="sitac-glifo"${gir}>${svgSimbolo(k, o)}</span>`,
      iconSize:[36,36], iconAnchor:[18,18], popupAnchor:[0,-18]});
  }

  /* Opzioni di stile per Leaflet: le chiavi nostre (n, deco, badge,
     stati, g) non devono arrivargli. Previsto = tratto spezzato. */
  function stileLinea(d, stato){
    const {n, deco, badge, stati, g, ...resto} = d;
    if (stati && stato === 'previsto')
      return Object.assign({}, resto, {dashArray: resto.dashArray || '9,7'});
    return resto;
  }
  function stileArea(d){
    const {n, ...resto} = d;
    return resto;
  }

  /* =======================================================================
     2. MAPPA
     OSM come predefinito: è lo sfondo con cui si lavora normalmente in SO.
     Topografico per quota e sentieri, satellite per la vegetazione.
     ===================================================================== */
  const sfondi = [
    {k:'sfStrada', l:L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        {maxZoom:19, attribution:'OpenStreetMap'})},
    {k:'sfTopo', l:L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
        {maxZoom:17, attribution:'OpenTopoMap'})},
    {k:'sfSat', l:L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        {maxZoom:19, attribution:'Esri'})}
  ];
  let iSfondo = 0;
  const map = L.map(q('#sitac-mappa'), {center:[42.74, 12.74], zoom:13, zoomControl:true, layers:[sfondi[0].l]});
  L.control.scale({imperial:false}).addTo(map);

  const disegni = L.featureGroup().addTo(map);   // esportabile
  const decori  = L.layerGroup().addTo(map);     // solo motivi: mai esportato
  map.pm.setGlobalOptions({layerGroup: disegni, snappable:true, snapDistance:15,
    templineStyle:{color:COL.rosso}, hintlineStyle:{color:COL.rosso, dashArray:'5,5'}});

  /* =======================================================================
     3. MOTIVI RIPETUTI LUNGO LE LINEE
     Metà della tavola sono tracciati con un simbolo ripetuto: i triangoli
     della difesa in linea, i rombi della linea di sicurezza, la scaletta
     del fronte. PolylineDecorator li ripete e li orienta lungo il percorso.
     ===================================================================== */
  function glifoDeco(tipo, dim, col, pieno){
    const riempi = pieno ? col : '#fff';
    const d = dim;
    let dentro = '';
    if (tipo === 'triangolo')
      dentro = `<path d="M2 ${d-2}L${d/2} 2L${d-2} ${d-2}Z" fill="${riempi}" stroke="${col}" stroke-width="2"/>`;
    else if (tipo === 'rombo')
      dentro = `<path d="M${d/2} 1L${d-1} ${d/2}L${d/2} ${d-1}L1 ${d/2}Z" fill="${riempi}" stroke="${col}" stroke-width="2"/>`;
    else if (tipo === 'croce')
      dentro = `<path d="M2 2L${d-2} ${d-2}M${d-2} 2L2 ${d-2}" stroke="${col}" stroke-width="2.6"/>`;
    else if (tipo === 'scaletta')
      dentro = `<path d="M${d/2} 1V${d-1}" stroke="${col}" stroke-width="2.6"/>`;
    else if (tipo === 'onda')
      dentro = `<path d="M1 ${d-2}V3h${d-2}v${d-5}" fill="none" stroke="${col}" stroke-width="2.4"/>`;
    else if (tipo === 'obliqua')
      dentro = `<path d="M1 ${d-2}L${d-3} 3M${d-3} 3l-5 0.5M${d-3} 3l0.5 5" fill="none" stroke="${col}" stroke-width="2.2"/>`;
    return L.divIcon({className:'sitac-deco', iconSize:[d,d], iconAnchor:[d/2,d/2],
      html:`<svg viewBox="0 0 ${d} ${d}" width="${d}" height="${d}">${dentro}</svg>`});
  }

  function motivo(def, stato){
    const dc = def.deco;
    if (!dc) return null;
    const pieno = dc.pieno && !(def.stati && stato === 'previsto');
    const col = def.color || COL.rosso;
    if (dc.tipo === 'punta' || dc.tipo === 'freccia')
      return {offset: dc.tipo === 'punta' ? '100%' : '12%', repeat: dc.passo,
        symbol: L.Symbol.arrowHead({pixelSize: dc.dim, headAngle: 60, polygon: !!pieno,
          pathOptions:{color:col, fillColor:col, fillOpacity: pieno ? 1 : 0, weight: pieno ? 1 : 2.5}})};
    return {offset: dc.passo === '50%' ? '50%' : 8, repeat: dc.passo,
      symbol: L.Symbol.marker({rotate:true,
        markerOptions:{icon: glifoDeco(dc.tipo, dc.dim, col, pieno), interactive:false}})};
  }

  function decora(layer){
    if (layer._deco){ decori.removeLayer(layer._deco); layer._deco = null; }
    const def = LIN[layer._tipo];
    if (!def) return;
    const patterns = [];
    const m = motivo(def, layer._stato);
    if (m) patterns.push(m);
    /* Il badge (4x4, B) sta in testa alla linea: dice di che strada o di
       che azione si tratta, e va letto una volta sola. */
    if (def.badge)
      patterns.push({offset:0, repeat:0, symbol: L.Symbol.marker({rotate:false,
        markerOptions:{interactive:false, icon: L.divIcon({className:'sitac-badge',
          html: escapeHtml(def.badge), iconSize:[26,18], iconAnchor:[13,9]})}})});
    if (!patterns.length) return;
    layer._deco = L.polylineDecorator(layer, {patterns});
    decori.addLayer(layer._deco);
  }
  function scollega(layer){
    if (layer && layer._deco){ decori.removeLayer(layer._deco); layer._deco = null; }
  }
  /* la modalità elimina globale rimuove il layer: il motivo va tolto con lui */
  map.on('pm:remove', e => scollega(e.layer));

  /* =======================================================================
     4. STRUMENTI
     ===================================================================== */
  let strumento = null;
  let statoCorrente = 'previsto';

  function creaPulsanti(){
    /* Un gruppo per ogni sezione della tavola: dentro, prima i tracciati
       in elenco (hanno nomi lunghi) e poi i simboli in griglia. */
    const tav = q('#sitac-tavola');
    tav.innerHTML = '';
    GRUPPI.forEach(gr => {
      const linee   = Object.entries(LIN).filter(([, d]) => d.g === gr.k);
      const simboli = Object.entries(SIM).filter(([, d]) => d.g === gr.k);
      if (!linee.length && !simboli.length) return;

      const box = document.createElement('div');
      box.className = 'sitac-gruppo';
      const titolo = document.createElement('span');
      titolo.textContent = nm(gr);
      box.appendChild(titolo);

      if (linee.length){
        const el = document.createElement('div');
        el.className = 'sitac-strumenti';
        linee.forEach(([k, d]) => {
          const b = document.createElement('button');
          b.type = 'button';
          b.dataset.genere = 'linea'; b.dataset.chiave = k;
          b.innerHTML = `<i class="sitac-tratto" style="background:${d.color};
            height:${Math.min(d.weight || 3, 5)}px${d.dashArray
              ? ';background-image:repeating-linear-gradient(90deg,#0000 0 3px,rgba(255,255,255,.85) 3px 6px)' : ''}"></i>`
            + `<span>${nm(d)}</span>`;
          b.onclick = () => attiva('linea', k, b);
          el.appendChild(b);
        });
        box.appendChild(el);
      }
      if (simboli.length){
        const gr2 = document.createElement('div');
        gr2.className = 'sitac-simboli';
        simboli.forEach(([k, d]) => {
          const b = document.createElement('button');
          b.type = 'button';
          b.dataset.genere = 'simbolo'; b.dataset.chiave = k;
          b.title = nm(d);
          b.innerHTML = svgSimbolo(k, {stato: statoCorrente});
          b.onclick = () => attiva('simbolo', k, b);
          gr2.appendChild(b);
        });
        box.appendChild(gr2);
      }
      tav.appendChild(box);
    });

    /* Perimetri: fuori tavola, quindi in coda e con l'avviso sotto. */
    const aree = q('#sitac-tAree');
    aree.innerHTML = '';
    Object.entries(AREE).forEach(([k, d]) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.dataset.genere = 'area'; b.dataset.chiave = k;
      b.innerHTML = `<i class="sitac-tratto" style="height:12px;border-radius:2px;
        background:${d.fillColor};opacity:.8;border:1.5px solid ${d.color}"></i><span>${nm(d)}</span>`;
      b.onclick = () => attiva('area', k, b);
      aree.appendChild(b);
    });
    const bn = document.createElement('button');
    bn.type = 'button';
    bn.dataset.genere = 'simbolo'; bn.dataset.chiave = 'nota';
    bn.innerHTML = `<i class="sitac-tratto" style="background:none">✎</i><span>${nm(NOTA)}</span>`;
    bn.onclick = () => attiva('simbolo', 'nota', bn);
    aree.appendChild(bn);

    if (strumento) marcaAttivo(strumento.genere, strumento.chiave);
  }

  function marcaAttivo(genere, chiave){
    const b = q(`#sitac-barra button[data-genere="${genere}"][data-chiave="${chiave}"]`);
    if (b) b.classList.add('attivo');
  }
  /* I due pulsanti di stato non sono strumenti: restano accesi sempre. */
  function spegniPulsanti(){
    qq('#sitac-barra button:not(.sitac-stato-btn)').forEach(b => b.classList.remove('attivo'));
  }

  function attiva(genere, chiave, bottone){
    const giaAttivo = bottone && bottone.classList.contains('attivo');
    fermaTutto();
    if (giaAttivo){ spegniPulsanti(); stato(t('spento')); return; }
    spegniPulsanti();
    if (bottone) bottone.classList.add('attivo');
    strumento = {genere, chiave};

    if (genere === 'linea'){
      const d = LIN[chiave];
      map.pm.enableDraw('Line', {pathOptions: stileLinea(d, statoCorrente), continueDrawing:true});
      stato(`${nm(d)}${etichettaStato(d)}\n${t('suggLinea')}`);
    } else if (genere === 'area'){
      const d = AREE[chiave];
      map.pm.enableDraw('Polygon', {pathOptions: stileArea(d), continueDrawing:true});
      stato(`${nm(d)}\n${t('suggArea')}`);
    } else {
      const d = chiave === 'nota' ? NOTA : SIM[chiave];
      map.pm.enableDraw('Marker', {
        markerStyle:{icon: iconaSimbolo(chiave, {stato: statoCorrente}), draggable:true},
        continueDrawing:true});
      stato(`${nm(d)}${etichettaStato(d)}\n${t('suggSimbolo')}`);
    }
  }
  const etichettaStato = d =>
    (d && (d.s || d.stati)) ? ` — ${t(statoCorrente === 'attivo' ? 'statoAttivo' : 'statoPrevisto')}` : '';

  function fermaTutto(){
    map.pm.disableDraw();
    map.pm.disableGlobalEditMode();
    map.pm.disableGlobalRemovalMode();
    strumento = null;
  }

  /* Cambio di stato: se uno strumento è in uso va riacceso, perché lo
     stile del tratto e il disegno del simbolo dipendono dallo stato. */
  function cambiaStato(s){
    if (s === statoCorrente) return;
    statoCorrente = s;
    qq('#sitac-barra .sitac-stato-btn').forEach(b =>
      b.classList.toggle('attivo', b.dataset.stato === s));
    const attuale = strumento;
    creaPulsanti();
    if (attuale){
      const b = q(`#sitac-barra button[data-genere="${attuale.genere}"][data-chiave="${attuale.chiave}"]`);
      strumento = null;
      attiva(attuale.genere, attuale.chiave, b);
    }
  }

  /* creazione */
  map.on('pm:create', e => {
    const layer = e.layer;
    if (!strumento) return;
    layer._tipo = strumento.chiave;
    layer._genere = strumento.genere;
    layer._stato = statoCorrente;

    if (strumento.genere === 'linea'){
      decora(layer);
      layer.on('pm:edit', () => decora(layer));
      layer.on('pm:remove', () => scollega(layer));
    }
    if (strumento.genere === 'simbolo'){
      const k = strumento.chiave;
      const def = k === 'nota' ? NOTA : SIM[k];
      let testo = '', rotazione = 0;
      if (def.libero || def.e){
        testo = (prompt(def.libero ? t('promptEtichetta') : t('promptSigla')) || '').trim();
        if (def.libero && !testo){ disegni.removeLayer(layer); return; }
      }
      if (def.r){
        const g = parseFloat(prompt(t('promptDirezione'), '0'));
        rotazione = isNaN(g) ? 0 : ((g % 360) + 360) % 360;
      }
      layer._testo = testo || null;
      layer._rotazione = rotazione || null;
      layer.setIcon(iconaSimbolo(k, {stato: statoCorrente, testo, rotazione}));
      if (!def.libero) layer.bindTooltip(nm(def) + etichettaStato(def), {direction:'top', offset:[0,-18]});
    }
    aggiornaStato();
  });

  /* =======================================================================
     5. AZIONI
     ===================================================================== */
  const $ = id => q('#sitac-' + id);

  qq('#sitac-barra .sitac-stato-btn').forEach(b => {
    b.onclick = () => cambiaStato(b.dataset.stato);
  });

  $('bModifica').onclick = function(){
    const on = this.classList.contains('attivo');
    fermaTutto(); spegniPulsanti();
    if (!on){ this.classList.add('attivo'); map.pm.enableGlobalEditMode(); stato(t('modOn')); }
    else stato(t('modOff'));
  };
  $('bElimina').onclick = function(){
    const on = this.classList.contains('attivo');
    fermaTutto(); spegniPulsanti();
    if (!on){ this.classList.add('attivo'); map.pm.enableGlobalRemovalMode(); stato(t('elimOn')); }
    else stato(t('elimOff'));
  };
  $('bAnnulla').onclick = () => {
    const l = disegni.getLayers().pop();
    if (!l) return stato(t('nienteAnnulla'));
    scollega(l);
    disegni.removeLayer(l);
    aggiornaStato();
  };
  $('bPulisci').onclick = () => {
    if (!disegni.getLayers().length) return stato(t('giaVuota'));
    if (!confirm(t('confPulisci'))) return;
    disegni.clearLayers(); decori.clearLayers();
    aggiornaStato();
  };
  $('bSfondo').onclick = () => {
    map.removeLayer(sfondi[iSfondo].l);
    iSfondo = (iSfondo + 1) % sfondi.length;
    map.addLayer(sfondi[iSfondo].l);
    sfondi[iSfondo].l.bringToBack();
    stato(t('sfondo', {n: t(sfondi[iSfondo].k)}));
  };
  $('bDoveSono').onclick = () => {
    stato(t('localizzo'));
    map.locate({setView:true, maxZoom:15, enableHighAccuracy:true});
  };
  map.on('locationfound', e => {
    L.circleMarker(e.latlng, {radius:7, color:'#fff', weight:2,
      fillColor:'#0070c0', fillOpacity:1}).addTo(decori);
    stato(t('posizione', {lat:e.latlng.lat.toFixed(5), lon:e.latlng.lng.toFixed(5), m:Math.round(e.accuracy)}));
  });
  map.on('locationerror', () => stato(t('posErrore')));
  $('bStampa').onclick = stampa;

  /* --- raccolta comune --- */
  function raccogli(){
    return disegni.getLayers().map(l => {
      const f = l.toGeoJSON();
      f.properties = {tipo:l._tipo || null, genere:l._genere || null,
        stato:l._stato || null, testo:l._testo || null, rotazione:l._rotazione || null};
      return f;
    });
  }
  function nomeFile(est){
    return `sitac_${new Date().toISOString().slice(0,16).replace(/[:T-]/g,'')}.${est}`;
  }
  function scarica(testo, nome, mime){
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([testo], {type:mime}));
    a.download = nome; a.click(); URL.revokeObjectURL(a.href);
  }

  $('bGeojson').onclick = () => {
    const feat = raccogli();
    if (!feat.length) return stato(t('nienteExport'));
    const fc = {type:'FeatureCollection', features:feat,
      properties:{applicazione:'FireOps SITAC', simbologia:'SITAC CNVVF',
        lingua, creato:new Date().toISOString()}};
    scarica(JSON.stringify(fc,null,1), nomeFile('geojson'), 'application/geo+json');
    stato(t('geojsonFatto', {n:feat.length}));
  };

  $('bKml').onclick = () => {
    const feat = raccogli();
    if (!feat.length) return stato(t('nienteExport'));
    scarica(costruisciKml(feat), nomeFile('kml'), 'application/vnd.google-earth.kml+xml');
    const ar = feat.filter(f => f.geometry.type === 'Polygon').length;
    stato(t('kmlFatto', {n:feat.length, a:ar}));
  };

  /* --- KML ---------------------------------------------------------------
     Il KML vuole i colori in aabbggrr: alfa davanti e i canali RGB invertiti.
     È l'errore classico che fa uscire tutto blu al posto del rosso.
     I nomi dei Placemark seguono la lingua scelta; gli id di stile no.
     Fuori da qui la simbologia si perde: KML disegna una linea colorata,
     non i triangoli della difesa in linea. Per ritrovare la SITAC intatta
     serve il GeoJSON.                                                      */
  function kmlCol(hex, alfa){
    const h = String(hex || '#cc0000').replace('#','');
    const a = Math.round(Math.max(0, Math.min(1, alfa == null ? 1 : alfa)) * 255)
      .toString(16).padStart(2,'0');
    return a + h.slice(4,6) + h.slice(2,4) + h.slice(0,2);
  }
  const esc = s => String(s == null ? '' : s).replace(/[<>&'"]/g,
    c => ({'<':'&lt;','>':'&gt;','&':'&amp;',"'":'&apos;','"':'&quot;'}[c]));

  function costruisciKml(feat){
    const stili = [];
    Object.entries(LIN).forEach(([k,d]) => stili.push(
      `<Style id="${k}"><LineStyle><color>${kmlCol(d.color)}</color>`
      + `<width>${d.weight || 3}</width></LineStyle></Style>`));
    Object.entries(AREE).forEach(([k,d]) => stili.push(
      `<Style id="${k}"><LineStyle><color>${kmlCol(d.color)}</color>`
      + `<width>${d.weight || 2}</width></LineStyle>`
      + `<PolyStyle><color>${kmlCol(d.fillColor, d.fillOpacity)}</color><fill>1</fill>`
      + `<outline>1</outline></PolyStyle></Style>`));
    Object.keys(SIM).forEach(k => {
      const c = kmlCol(coloreSimbolo(k));
      stili.push(`<Style id="${k}"><IconStyle><color>${c}</color><scale>1.1</scale>`
        + `<Icon><href>https://maps.google.com/mapfiles/kml/shapes/placemark_circle.png</href></Icon>`
        + `</IconStyle><LabelStyle><color>${c}</color></LabelStyle></Style>`);
    });

    const segna = feat.map(f => {
      const tp = f.properties.tipo;
      const def = LIN[tp] || AREE[tp] || SIM[tp] || (tp === 'nota' ? NOTA : null);
      let nome = f.properties.testo || (def ? nm(def) : '') || tp || 'elemento';
      if (def && (def.s || def.stati) && f.properties.stato)
        nome += ` (${t(f.properties.stato === 'attivo' ? 'statoAttivo' : 'statoPrevisto')})`;
      const g = f.geometry;
      let geom = '';

      if (g.type === 'Point'){
        geom = `<Point><coordinates>${g.coordinates[0]},${g.coordinates[1]},0</coordinates></Point>`;
      } else if (g.type === 'LineString'){
        geom = `<LineString><tessellate>1</tessellate><coordinates>`
          + g.coordinates.map(c => `${c[0]},${c[1]},0`).join(' ')
          + `</coordinates></LineString>`;
      } else if (g.type === 'Polygon'){
        const anelli = g.coordinates;
        const chiudi = r => {
          const p = r.slice();
          const a = p[0], z = p[p.length-1];
          if (a[0] !== z[0] || a[1] !== z[1]) p.push(a);   // il KML pretende l'anello chiuso
          return p.map(c => `${c[0]},${c[1]},0`).join(' ');
        };
        geom = `<Polygon><tessellate>1</tessellate>`
          + `<outerBoundaryIs><LinearRing><coordinates>${chiudi(anelli[0])}</coordinates></LinearRing></outerBoundaryIs>`
          + anelli.slice(1).map(r =>
              `<innerBoundaryIs><LinearRing><coordinates>${chiudi(r)}</coordinates></LinearRing></innerBoundaryIs>`).join('')
          + `</Polygon>`;
      }
      return `<Placemark><name>${esc(nome)}</name><styleUrl>#${esc(tp)}</styleUrl>`
        + `<ExtendedData><Data name="tipo"><value>${esc(tp)}</value></Data>`
        + `<Data name="genere"><value>${esc(f.properties.genere)}</value></Data>`
        + `<Data name="stato"><value>${esc(f.properties.stato)}</value></Data></ExtendedData>`
        + geom + `</Placemark>`;
    });

    // cartelle separate: in QGIS e Google Earth diventano gruppi distinti
    const cartella = (titolo, filtro) => {
      const dentro = segna.filter((_, i) => filtro(feat[i]));
      return dentro.length ? `<Folder><name>${esc(titolo)}</name>${dentro.join('')}</Folder>` : '';
    };

    return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2"><Document>
<name>${esc(t('kmlDoc'))}</name>
<description>FireOps VVF — ${esc(new Date().toLocaleString(lingua))}</description>
${stili.join('\n')}
${cartella(t('kmlAree'),    f => AREE[f.properties.tipo])}
${cartella(t('kmlLinee'),   f => LIN[f.properties.tipo])}
${cartella(t('kmlSimboli'), f => SIM[f.properties.tipo] || f.properties.tipo === 'nota')}
</Document></kml>`;
  }

  $('bImporta').onclick = () => $('file').click();
  $('file').onchange = ev => {
    const f = ev.target.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      try { carica(JSON.parse(r.result)); }
      catch(e){ stato(t('fileErrato', {e:e.message})); }
      ev.target.value = '';
    };
    r.readAsText(f);
  };

  function carica(fc){
    let n = 0;
    L.geoJSON(fc, {
      pointToLayer: (feat, latlng) => {
        const p = feat.properties || {};
        if (p.tipo !== 'nota' && !SIM[p.tipo]) return L.marker(latlng, {draggable:true});
        return L.marker(latlng, {draggable:true,
          icon: iconaSimbolo(p.tipo, {stato:p.stato || 'previsto', testo:p.testo, rotazione:p.rotazione})});
      },
      style: feat => {
        const p = feat.properties || {};
        if (LIN[p.tipo]) return stileLinea(LIN[p.tipo], p.stato || 'previsto');
        if (AREE[p.tipo]) return stileArea(AREE[p.tipo]);
        return {color: COL.rosso};
      },
      onEachFeature: (feat, layer) => {
        const p = feat.properties || {};
        layer._tipo = p.tipo;
        layer._genere = p.genere;
        layer._stato = p.stato || 'previsto';
        layer._testo = p.testo || null;
        layer._rotazione = p.rotazione || null;
        disegni.addLayer(layer);
        if (LIN[layer._tipo]){
          decora(layer);
          layer.on('pm:edit', () => decora(layer));
          layer.on('pm:remove', () => scollega(layer));
        }
        const def = SIM[layer._tipo];
        if (def) layer.bindTooltip(nm(def) + (def.s
          ? ` — ${t(layer._stato === 'attivo' ? 'statoAttivo' : 'statoPrevisto')}` : ''),
          {direction:'top', offset:[0,-18]});
        n++;
      }
    });
    if (n && disegni.getBounds().isValid())
      map.fitBounds(disegni.getBounds(), {padding:[40,40]});
    aggiornaStato();
    stato(t('importati', {n}));
  }

  /* --- stato e legenda --- */
  function stato(x){ $('stato').textContent = x; }

  function aggiornaStato(){
    const l = disegni.getLayers();
    const linee = l.filter(x => LIN[x._tipo]).length;
    const aree  = l.filter(x => AREE[x._tipo]).length;
    const sim   = l.length - linee - aree;
    let sup = 0;
    l.filter(x => AREE[x._tipo] && x.getLatLngs).forEach(x => { sup += areaMq(x); });
    stato(t('conteggio', {l:linee, a:aree, s:sim})
      + (sup ? t('superficie', {v:(sup/10000).toFixed(1)}) : ''));
    aggiornaLegenda();
  }

  /* La tavola ha 59 voci: una legenda con tutte sarebbe illeggibile e
     inutile. Si elencano solo i tipi effettivamente sulla mappa. */
  function aggiornaLegenda(){
    const leg = q('#sitac-legVoci');
    if (!leg) return;
    leg.innerHTML = '';
    const visti = new Map();
    disegni.eachLayer(x => {
      if (!x._tipo || visti.has(x._tipo + x._stato)) return;
      visti.set(x._tipo + x._stato, x);
    });
    if (!visti.size){
      leg.innerHTML = `<div class="sitac-leg-vuota">${escapeHtml(t('legVuota'))}</div>`;
      return;
    }
    visti.forEach(x => {
      const k = x._tipo;
      if (LIN[k]){
        const d = LIN[k];
        leg.insertAdjacentHTML('beforeend',
          `<div><i class="sitac-tratto" style="background:${d.color};height:${Math.min(d.weight||3,5)}px"></i>`
          + `${escapeHtml(nm(d) + etichettaStatoDi(d, x._stato))}</div>`);
      } else if (AREE[k]){
        const d = AREE[k];
        leg.insertAdjacentHTML('beforeend',
          `<div><i class="sitac-tratto" style="height:11px;border-radius:2px;background:${d.fillColor};
            opacity:.85;border:1.5px solid ${d.color}"></i>${escapeHtml(nm(d))}</div>`);
      } else if (SIM[k]){
        const d = SIM[k];
        leg.insertAdjacentHTML('beforeend',
          `<div><span class="sitac-leg-sim">${svgSimbolo(k, {stato:x._stato})}</span>`
          + `${escapeHtml(nm(d) + etichettaStatoDi(d, x._stato))}</div>`);
      }
    });
  }
  const etichettaStatoDi = (d, s) =>
    (d && (d.s || d.stati)) ? ` — ${t(s === 'attivo' ? 'statoAttivo' : 'statoPrevisto')}` : '';

  // area geodetica approssimata (formula dello shoelace su proiezione locale)
  function areaMq(poly){
    const p = poly.getLatLngs()[0]; if (!p || p.length < 3) return 0;
    const R = 6378137, rad = Math.PI/180;
    let s = 0;
    for (let i=0;i<p.length;i++){
      const j = (i+1)%p.length;
      s += (p[j].lng - p[i].lng)*rad *
           (2 + Math.sin(p[i].lat*rad) + Math.sin(p[j].lat*rad));
    }
    return Math.abs(s * R * R / 2);
  }

  /* =======================================================================
     6. CAMBIO LINGUA
     Ridisegna solo le etichette: geometrie, strumento in uso e modalità
     di modifica restano dove sono.
     ===================================================================== */
  function creaBandiere(){
    const box = q('#sitac-lingue');
    box.innerHTML = '';
    Object.keys(L10N).forEach(lg => {
      const b = document.createElement('button');
      b.type = 'button';
      b.dataset.lingua = lg;
      b.title = lg.toUpperCase();
      b.setAttribute('aria-label', lg.toUpperCase());
      b.innerHTML = BANDIERE[lg];
      if (lg === lingua) b.classList.add('attivo');
      b.onclick = () => cambiaLingua(lg);
      box.appendChild(b);
    });
  }
  function cambiaLingua(lg){
    if (!L10N[lg] || lg === lingua) return;
    lingua = lg;
    applicaLingua();
  }
  function applicaLingua(){
    radice.setAttribute('lang', lingua);
    qq('[data-t]').forEach(e => { e.textContent = t(e.dataset.t); });
    qq('#sitac-lingue button').forEach(b =>
      b.classList.toggle('attivo', b.dataset.lingua === lingua));
    creaPulsanti();
    // i tooltip già posati vanno riscritti nella nuova lingua
    disegni.eachLayer(l => {
      const d = SIM[l._tipo];
      if (!d) return;
      l.unbindTooltip();
      l.bindTooltip(nm(d) + etichettaStatoDi(d, l._stato), {direction:'top', offset:[0,-18]});
    });
    if (strumento){
      const d = strumento.genere === 'linea' ? LIN[strumento.chiave]
              : strumento.genere === 'area'  ? AREE[strumento.chiave]
              : (strumento.chiave === 'nota' ? NOTA : SIM[strumento.chiave]);
      const sugg = strumento.genere === 'linea' ? 'suggLinea'
                 : strumento.genere === 'area'  ? 'suggArea' : 'suggSimbolo';
      stato(`${nm(d)}${etichettaStato(d)}\n${t(sugg)}`);
    } else if (disegni.getLayers().length){
      aggiornaStato();
    } else {
      stato(t('pronto'));
      aggiornaLegenda();
    }
  }

  /* Esc annulla lo strumento corrente */
  document.addEventListener('keydown', e => {
    if (app.offsetParent === null) return;
    if (e.key === 'Escape'){ fermaTutto(); spegniPulsanti(); stato(t('spento')); }
  });

  creaBandiere();
  applicaLingua();
  stato(t('pronto'));
  aggiornaLegenda();

  /* -------------------------------------------------------------------
     Stampa: la sezione viene appesa al body per il tempo della stampa,
     poi torna esattamente dov'era. Senza questo passaggio il pannello
     resta annegato nel layout di index.html e la mappa esce tagliata.
     ----------------------------------------------------------------- */
  function stampa(){
    const segno = document.createComment('sitac');
    app.parentNode.insertBefore(segno, app);
    document.body.appendChild(app);
    document.body.classList.add('sitac-stampa');
    map.invalidateSize();
    const ripristina = () => {
      document.body.classList.remove('sitac-stampa');
      segno.parentNode.insertBefore(app, segno);
      segno.remove();
      setTimeout(() => map.invalidateSize(), 60);
      window.removeEventListener('afterprint', ripristina);
    };
    window.addEventListener('afterprint', ripristina);
    setTimeout(() => window.print(), 250);
  }

  /* La sezione nasce nel magazzino e vive dentro un pannello che cambia
     larghezza: qui si fanno due cose insieme, il ridisegno della mappa e la
     classe .sitac-stretto (stesso criterio di .um-root.narrow, perche' in
     split-screen un pannello puo' essere stretto anche su schermo largo). */
  const LARGHEZZA_STRETTA = 560;
  function adatta(){
    if (app.offsetParent === null) return;          // in magazzino: niente da fare
    app.classList.toggle('sitac-stretto', app.clientWidth < LARGHEZZA_STRETTA);
    map.invalidateSize();
  }
  if (window.ResizeObserver) new ResizeObserver(adatta).observe(app);
  setTimeout(adatta, 150);

  /* comando attivo condiviso con script.js / convertitore.js */
  window.addEventListener('fireops:comando-attivo-cambiato', ev => {
    const d = ev.detail || {};
    const la = parseFloat(d.lat != null ? d.lat : d.latitudine);
    const lo = parseFloat(d.lon != null ? d.lon : d.longitudine);
    if (!isNaN(la) && !isNaN(lo) && !disegni.getLayers().length) map.setView([la, lo], 12);
  });

  return {
    map, disegni,
    lingua: lg => cambiaLingua(lg),
    stato: s => cambiaStato(s),
    esportaGeoJson: raccogli,
    carica,
    pulisci: () => { disegni.clearLayers(); decori.clearLayers(); aggiornaStato(); },
    ridisegna: adatta
  };
}

/* ---------------------------------------------------------------------
   Avvio
   ------------------------------------------------------------------- */
let istanza = null;

NS.Sitac = {
  /* Idempotente: il sistema pannelli sposta la sezione fra pannello e
     magazzino, quindi init() può essere richiamato quante volte serve. */
  init(){
    if (istanza) { istanza.ridisegna(); return istanza; }

    const app = document.getElementById('sitac-app');
    if (!app) return null;                       // sezione non ancora nel DOM

    /* Bandiere e descrizione stanno nella riga sopra #sitac-app, fuori dal
       riquadro: i controlli si cercano a partire dalla sezione. */
    const radice = app.closest('.page-section') || app;

    for (const id of ['sitac-barra','sitac-mappa','sitac-tavola','sitac-tAree',
                      'sitac-legVoci','sitac-stato','sitac-lingue']){
      if (!radice.querySelector('#' + id)){
        console.error('[SITAC] manca #' + id + ' nel markup della sezione.');
        return null;
      }
    }
    const box = radice.querySelector('#sitac-stato');
    if (!NS.SITAC_SIMBOLI || !NS.SITAC_LINEE){
      box.textContent = 'Simbologia mancante: sitac-simboli.js deve precedere sitac.js.';
      console.error('[SITAC] sitac-simboli.js non caricato.');
      return null;
    }
    if (typeof L === 'undefined' || !L.PM || !L.Symbol || !L.Symbol.arrowHead){
      box.textContent = 'Librerie mancanti: servono Leaflet, Geoman e PolylineDecorator.';
      console.error('[SITAC] Geoman o PolylineDecorator non caricati.');
      return null;
    }
    istanza = avvia(app);
    return istanza;
  },
  get(){ return istanza; }
};

/* -----------------------------------------------------------------------
   Aggancio al sistema pannelli.

   La sezione #sitac-aib viaggia fra i due pannelli e il magazzino, e Leaflet
   non sopporta di riapparire senza dimensioni: serve un invalidateSize ogni
   volta che torna a schermo.

   L'osservazione e' limitata ai DUE contenitori dei pannelli, con childList
   e SENZA subtree: le sezioni sono figlie dirette di #corpo-sinistra e
   #corpo-destra, quindi tanto basta. Osservare .split-screen con subtree:true
   sembra piu' sicuro ma e' la scelta sbagliata: ogni tile che Leaflet inserisce
   nella mappa e' una mutazione dentro quel sottoalbero, e ogni spostamento
   della mappa scatenerebbe decine di invalidateSize inutili (misurati: 56 per
   otto spostamenti), ognuno dei quali forza un ricalcolo del layout.
   --------------------------------------------------------------------- */
function agganciaPannelli(){
  const sezione = document.getElementById('sitac-aib');
  if (!sezione) return;

  const risveglia = () => {
    if (sezione.offsetParent === null) return;   // ancora nel magazzino
    const i = NS.Sitac.init();                   // prima apertura: costruisce
    if (i) i.ridisegna();                        // gia' viva: solo ridisegno
  };

  ['corpo-sinistra','corpo-destra'].forEach(id => {
    const corpo = document.getElementById(id);
    if (corpo) new MutationObserver(risveglia).observe(corpo, { childList:true });
  });

  /* Il fullscreen cambia le dimensioni del pannello senza spostare nulla:
     script.js emette un resize dopo la transizione. */
  window.addEventListener('resize', () => {
    const i = NS.Sitac.get();
    if (i && sezione.offsetParent !== null) i.ridisegna();
  });

  risveglia();
}

if (document.readyState === 'loading')
  document.addEventListener('DOMContentLoaded', agganciaPannelli);
else agganciaPannelli();

})();