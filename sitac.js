/*!
 * FireOps VVF — sitac.js — SITAC incendio boschivo
 * Dipendenze (nell'ordine): Leaflet 1.9 · Geoman 2.15 · PolylineDecorator 1.6
 * Markup: sezione #sitac-aib di index.html
 * Stile:  style.css, sezione MODULI AGGIUNTIVI
 *
 * Tutto vive dentro #sitac-app: nessuna variabile globale. Si aggancia
 * al pannello con un ResizeObserver,
 * come convertitore.js, perché Leaflet nasce con altezza zero se la sezione
 * è ancora nel magazzino.
 */
(function () {
'use strict';
const NS = (window.FireOps = window.FireOps || {});
if (NS.Sitac) return;

/* ---------------------------------------------------------------------
   CSS: ogni selettore parte da #sitac-app. Le variabili sono ridefinite
   qui e non su :root, così il tema di FireOps resta intatto.
   ------------------------------------------------------------------- */

function avvia(app){
  const q  = s => app.querySelector(s);
  const qq = s => app.querySelectorAll(s);


  /* =======================================================================
     0. LINGUE
     La chiave `tipo` nel GeoJSON resta sempre in italiano: è l'identificativo
     tecnico, non un'etichetta. Cambiare lingua non tocca i file esportati.
     ===================================================================== */
  const BANDIERE = {
    it:'<svg viewBox="0 0 9 6"><rect width="3" height="6" fill="#008C45"/><rect x="3" width="3" height="6" fill="#F4F5F0"/><rect x="6" width="3" height="6" fill="#CD212A"/></svg>',
    en:'<svg viewBox="0 0 60 30"><clipPath id="cUk"><rect width="60" height="30"/></clipPath><g clip-path="url(#cUk)"><rect width="60" height="30" fill="#012169"/><path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" stroke-width="6"/><path d="M0,0 L60,30 M60,0 L0,30" stroke="#C8102E" stroke-width="3"/><path d="M30,0 v30 M0,15 h60" stroke="#fff" stroke-width="10"/><path d="M30,0 v30 M0,15 h60" stroke="#C8102E" stroke-width="6"/></g></svg>',
    fr:'<svg viewBox="0 0 9 6"><rect width="3" height="6" fill="#002395"/><rect x="3" width="3" height="6" fill="#fff"/><rect x="6" width="3" height="6" fill="#ED2939"/></svg>',
    es:'<svg viewBox="0 0 12 8"><rect width="12" height="8" fill="#AA151B"/><rect y="2" width="12" height="4" fill="#F1BF00"/></svg>'
  };

  const L10N = {
    it:{
      doc:'SITAC — Incendio boschivo', titolo:'SITAC boschivo',
      sub:'Scegli uno strumento, poi disegna sulla mappa. Doppio clic o Invio per chiudere una linea.',
      gLinee:'Linee', gAree:'Aree', gSimboli:'Simboli', gModifica:'Modifica',
      gMappa:'Mappa e dati', gEsporta:'Esporta', legenda:'Legenda',
      bSposta:'Sposta', bElimina:'Elimina', bAnnulla:'Annulla ultimo', bPulisci:'Cancella tutto',
      bSfondo:'Sfondo', bDoveSono:'Dove sono', bImporta:'Importa', bStampa:'Stampa',
      pronto:'Pronto.\nScegli uno strumento a sinistra.',
      spento:'Strumento disattivato.',
      suggLinea:'Clic per i vertici, doppio clic per chiudere.',
      suggArea:'Clic per i vertici, clic sul primo per chiudere.',
      suggSimbolo:'Clic sulla mappa per posizionare.',
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
      promptEtichetta:'Testo dell\'etichetta:',
      kmlDoc:'SITAC incendio boschivo', kmlAree:'Aree', kmlLinee:'Linee', kmlSimboli:'Simboli',
      sfSat:'Satellite', sfTopo:'Topografico', sfScuro:'Scuro', sfStrada:'Stradale'
    },
    en:{
      doc:'SITAC — Wildfire', titolo:'Wildfire SITAC',
      sub:'Pick a tool, then draw on the map. Double-click or Enter closes a line.',
      gLinee:'Lines', gAree:'Areas', gSimboli:'Symbols', gModifica:'Edit',
      gMappa:'Map and data', gEsporta:'Export', legenda:'Legend',
      bSposta:'Move', bElimina:'Delete', bAnnulla:'Undo last', bPulisci:'Clear all',
      bSfondo:'Basemap', bDoveSono:'Locate me', bImporta:'Import', bStampa:'Print',
      pronto:'Ready.\nPick a tool on the left.',
      spento:'Tool switched off.',
      suggLinea:'Click each vertex, double-click to close.',
      suggArea:'Click each vertex, click the first one to close.',
      suggSimbolo:'Click the map to place it.',
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
      promptEtichetta:'Label text:',
      kmlDoc:'Wildfire SITAC', kmlAree:'Areas', kmlLinee:'Lines', kmlSimboli:'Symbols',
      sfSat:'Satellite', sfTopo:'Topographic', sfScuro:'Dark', sfStrada:'Street'
    },
    fr:{
      doc:'SITAC — Feu de forêt', titolo:'SITAC feu de forêt',
      sub:'Choisissez un outil, puis dessinez sur la carte. Double-clic ou Entrée pour fermer une ligne.',
      gLinee:'Lignes', gAree:'Zones', gSimboli:'Symboles', gModifica:'Modifier',
      gMappa:'Carte et données', gEsporta:'Exporter', legenda:'Légende',
      bSposta:'Déplacer', bElimina:'Supprimer', bAnnulla:'Annuler le dernier', bPulisci:'Tout effacer',
      bSfondo:'Fond de carte', bDoveSono:'Ma position', bImporta:'Importer', bStampa:'Imprimer',
      pronto:'Prêt.\nChoisissez un outil à gauche.',
      spento:'Outil désactivé.',
      suggLinea:'Cliquez chaque sommet, double-clic pour fermer.',
      suggArea:'Cliquez chaque sommet, cliquez le premier pour fermer.',
      suggSimbolo:'Cliquez sur la carte pour le poser.',
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
      promptEtichetta:'Texte de l\'étiquette :',
      kmlDoc:'SITAC feu de forêt', kmlAree:'Zones', kmlLinee:'Lignes', kmlSimboli:'Symboles',
      sfSat:'Satellite', sfTopo:'Topographique', sfScuro:'Sombre', sfStrada:'Routier'
    },
    es:{
      doc:'SITAC — Incendio forestal', titolo:'SITAC forestal',
      sub:'Elige una herramienta y dibuja en el mapa. Doble clic o Intro para cerrar una línea.',
      gLinee:'Líneas', gAree:'Áreas', gSimboli:'Símbolos', gModifica:'Editar',
      gMappa:'Mapa y datos', gEsporta:'Exportar', legenda:'Leyenda',
      bSposta:'Mover', bElimina:'Eliminar', bAnnulla:'Deshacer último', bPulisci:'Borrar todo',
      bSfondo:'Fondo', bDoveSono:'Mi ubicación', bImporta:'Importar', bStampa:'Imprimir',
      pronto:'Listo.\nElige una herramienta a la izquierda.',
      spento:'Herramienta desactivada.',
      suggLinea:'Haz clic en cada vértice, doble clic para cerrar.',
      suggArea:'Haz clic en cada vértice, clic en el primero para cerrar.',
      suggSimbolo:'Haz clic en el mapa para colocarlo.',
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
      promptEtichetta:'Texto de la etiqueta:',
      kmlDoc:'SITAC incendio forestal', kmlAree:'Áreas', kmlLinee:'Líneas', kmlSimboli:'Símbolos',
      sfSat:'Satélite', sfTopo:'Topográfico', sfScuro:'Oscuro', sfStrada:'Callejero'
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
  const nm = d => (d && d.nome && (d.nome[lingua] || d.nome.it)) || '';

  /* =======================================================================
     1. DEFINIZIONI TATTICHE
     Ogni voce ha un `tipo` che viaggia nel GeoJSON: è la chiave che permette
     di ricostruire stile e simbolo al reimport. Il nome è solo un'etichetta.
     ===================================================================== */
  const LINEE = {
    fronte:      {color:'#ff2d20', weight:5, freccia:'dente',
      nome:{it:'Fronte di fiamma', en:'Fire front', fr:'Front de flammes', es:'Frente de llamas'}},
    propagazione:{color:'#ff8c00', weight:4, freccia:'punta', dashArray:'1,10', lineCap:'round',
      nome:{it:'Propagazione', en:'Spread direction', fr:'Propagation', es:'Propagación'}},
    attacco:     {color:'#2f81f7', weight:4, freccia:'punta',
      nome:{it:'Asse di attacco', en:'Attack line', fr:'Axe d\'attaque', es:'Eje de ataque'}},
    tagliafuoco: {color:'#ffd700', weight:4, dashArray:'12,7',
      nome:{it:'Linea tagliafuoco', en:'Firebreak line', fr:'Coupure de combustible', es:'Línea cortafuegos'}},
    accesso:     {color:'#4ade80', weight:3, dashArray:'6,6',
      nome:{it:'Via di accesso', en:'Access route', fr:'Itinéraire d\'accès', es:'Vía de acceso'}},
    fuga:        {color:'#ffffff', weight:3, freccia:'punta', dashArray:'2,8', lineCap:'round',
      nome:{it:'Via di fuga', en:'Escape route', fr:'Itinéraire de repli', es:'Vía de escape'}}
  };
  const AREE = {
    bruciato:   {color:'#8b8f98', fillColor:'#3a3a3a', fillOpacity:.55, dashArray:'8,6', weight:2,
      nome:{it:'Percorso dal fuoco', en:'Burned area', fr:'Surface parcourue', es:'Superficie quemada'}},
    incorso:    {color:'#ff2d20', fillColor:'#ff2d20', fillOpacity:.30, weight:3,
      nome:{it:'Fuoco attivo', en:'Active fire', fr:'Feu actif', es:'Fuego activo'}},
    minacciato: {color:'#ffd700', fillColor:'#ffd700', fillOpacity:.15, weight:2, dashArray:'4,5',
      nome:{it:'Zona minacciata', en:'Threatened area', fr:'Zone menacée', es:'Zona amenazada'}},
    sensibile:  {color:'#c084fc', fillColor:'#c084fc', fillOpacity:.22, weight:2,
      nome:{it:'Obiettivo sensibile', en:'Sensitive site', fr:'Point sensible', es:'Punto sensible'}},
    bonificato: {color:'#4ade80', fillColor:'#4ade80', fillOpacity:.18, weight:2,
      nome:{it:'Bonificato', en:'Mopped up', fr:'Zone noyée', es:'Zona liquidada'}}
  };

  /* Simboli: SVG 32x32 disegnati a mano, scalabili e stampabili.
     `sigla` è fissa in tutte le lingue: è un codice operativo, non una parola. */
  const SIMBOLI = {
    dos:     {colore:'#ffd700', sigla:'DOS', forma:'quadro',
      nome:{it:'Direttore operazioni spegnimento', en:'Fire operations director', fr:'Directeur des opérations', es:'Director de extinción'}},
    ros:     {colore:'#ff8c00', sigla:'ROS', forma:'quadro',
      nome:{it:'Responsabile operazioni soccorso', en:'Rescue operations chief', fr:'Chef des secours', es:'Jefe de intervención'}},
    pca:     {colore:'#ffd700', forma:'bandiera',
      nome:{it:'Posto comando', en:'Command post', fr:'Poste de commandement', es:'Puesto de mando'}},
    aps:     {colore:'#ff2d20', sigla:'APS', forma:'tondo',
      nome:{it:'Autopompaserbatoio', en:'Pumper', fr:'Fourgon pompe-tonne', es:'Autobomba'}},
    abp:     {colore:'#ff2d20', sigla:'ABP', forma:'tondo',
      nome:{it:'Autobotte', en:'Water tanker', fr:'Camion-citerne', es:'Camión cisterna'}},
    acqua:   {colore:'#2f81f7', forma:'goccia',
      nome:{it:'Punto acqua', en:'Water point', fr:'Point d\'eau', es:'Punto de agua'}},
    eli:     {colore:'#4ade80', forma:'elicottero',
      nome:{it:'Elisuperficie', en:'Helispot', fr:'Hélisurface', es:'Helisuperficie'}},
    pma:     {colore:'#ffffff', forma:'croce',
      nome:{it:'Posto medico avanzato', en:'Casualty station', fr:'PMA', es:'Puesto médico avanzado'}},
    raccolta:{colore:'#4ade80', sigla:'PR', forma:'tondo',
      nome:{it:'Punto raccolta', en:'Assembly point', fr:'Point de rassemblement', es:'Punto de reunión'}},
    blocco:  {colore:'#c084fc', forma:'sbarra',
      nome:{it:'Posto di blocco', en:'Road block', fr:'Point de contrôle', es:'Control de acceso'}},
    innesco: {colore:'#ff2d20', forma:'stella',
      nome:{it:'Innesco', en:'Ignition point', fr:'Point d\'éclosion', es:'Punto de inicio'}},
    etichetta:{colore:'#ffffff', forma:'testo',
      nome:{it:'Etichetta', en:'Label', fr:'Étiquette', es:'Etiqueta'}}
  };

  /* --- generatori SVG --- */
  const G = dentro => `<svg viewBox="0 0 32 32" width="30" height="30">${dentro}</svg>`;
  const FORME = {
    quadro: (c,s) => G(`<rect x="4" y="4" width="24" height="24" rx="3" fill="#0b0e13" stroke="${c}" stroke-width="2.5"/>
      <text x="16" y="20.5" text-anchor="middle" font-size="9.5" font-weight="700" fill="${c}" font-family="system-ui">${s}</text>`),
    tondo: (c,s) => G(`<circle cx="16" cy="16" r="12" fill="#0b0e13" stroke="${c}" stroke-width="2.5"/>
      <text x="16" y="20" text-anchor="middle" font-size="9" font-weight="700" fill="${c}" font-family="system-ui">${s}</text>`),
    bandiera: c => G(`<path d="M9 28V5" stroke="${c}" stroke-width="2.5" stroke-linecap="round"/>
      <path d="M10 6h16l-4 5 4 5H10z" fill="${c}"/>`),
    goccia: c => G(`<path d="M16 4c6 8 9 11 9 15a9 9 0 0 1-18 0c0-4 3-7 9-15z" fill="#0b0e13" stroke="${c}" stroke-width="2.5"/>
      <path d="M12 19a4 4 0 0 0 4 4" stroke="${c}" stroke-width="2" fill="none" stroke-linecap="round"/>`),
    elicottero: c => G(`<circle cx="16" cy="16" r="12" fill="#0b0e13" stroke="${c}" stroke-width="2.5"/>
      <path d="M16 8v16M8 16h16" stroke="${c}" stroke-width="2.5" stroke-linecap="round"/>
      <text x="16" y="19.5" text-anchor="middle" font-size="8" font-weight="700" fill="${c}" font-family="system-ui">H</text>`),
    croce: c => G(`<rect x="4" y="4" width="24" height="24" rx="3" fill="#0b0e13" stroke="${c}" stroke-width="2.5"/>
      <path d="M16 9v14M9 16h14" stroke="#ff2d20" stroke-width="4" stroke-linecap="round"/>`),
    sbarra: c => G(`<circle cx="16" cy="16" r="12" fill="#0b0e13" stroke="${c}" stroke-width="2.5"/>
      <path d="M8 20h16M10 20l3-8h6l3 8" stroke="${c}" stroke-width="2" fill="none" stroke-linejoin="round"/>`),
    stella: c => G(`<path d="M16 3l3.4 7.6L27 12l-5.5 5.2 1.4 8.1L16 21.5 9.1 25.3l1.4-8.1L5 12l7.6-1.4z"
      fill="${c}" stroke="#0b0e13" stroke-width="1.5"/>`),
    testo: c => G(`<rect x="3" y="9" width="26" height="14" rx="2" fill="#0b0e13" stroke="${c}" stroke-width="2"/>
      <path d="M9 13h14M9 17h9" stroke="${c}" stroke-width="2" stroke-linecap="round"/>`)
  };

  function svgSimbolo(chiave){
    const d = SIMBOLI[chiave];
    return FORME[d.forma](d.colore, d.sigla || '');
  }
  function iconaSimbolo(chiave){
    return L.divIcon({className:'sitac-sim', html: svgSimbolo(chiave),
      iconSize:[30,30], iconAnchor:[15,15], popupAnchor:[0,-14]});
  }
  /* le opzioni di stile senza `nome` e `freccia`, che Leaflet non deve vedere */
  function stile(d){
    const {nome, freccia, ...resto} = d;
    return resto;
  }

  /* =======================================================================
     2. MAPPA
     ===================================================================== */
  /* OSM come predefinito: è lo sfondo con cui si lavora normalmente in SO.
     Topografico per la quota e i sentieri, satellite per la vegetazione. */
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
  const decori  = L.layerGroup().addTo(map);     // solo frecce: mai esportato
  map.pm.setGlobalOptions({layerGroup: disegni, snappable:true, snapDistance:15,
    templineStyle:{color:'#ffd700'}, hintlineStyle:{color:'#ffd700', dashArray:'5,5'}});

  /* =======================================================================
     3. DECORAZIONI (frecce lungo le linee)
     ===================================================================== */
  function decora(layer){
    if (layer._deco){ decori.removeLayer(layer._deco); layer._deco = null; }
    const def = LINEE[layer._tipo];
    if (!def || !def.freccia) return;
    const p = def.freccia === 'dente'
      ? {offset:'3%', repeat:28, symbol:L.Symbol.arrowHead({pixelSize:10, headAngle:150, polygon:false,
          pathOptions:{color:def.color, weight:3, opacity:1}})}
      : {offset:'10%', repeat:'25%', symbol:L.Symbol.arrowHead({pixelSize:14, headAngle:55, polygon:true,
          pathOptions:{color:def.color, fillColor:def.color, fillOpacity:1, weight:1}})};
    layer._deco = L.polylineDecorator(layer, {patterns:[p]});
    decori.addLayer(layer._deco);
  }
  function scollega(layer){
    if (layer && layer._deco){ decori.removeLayer(layer._deco); layer._deco = null; }
  }
  /* la modalità elimina globale rimuove il layer: la freccia va tolta con lui */
  map.on('pm:remove', e => scollega(e.layer));

  /* =======================================================================
     4. STRUMENTI
     ===================================================================== */
  let strumento = null;

  function creaPulsanti(){
    const linee = q('#sitac-tLinee');
    linee.innerHTML = '';
    Object.entries(LINEE).forEach(([k,d]) => {
      const b = document.createElement('button');
      b.dataset.genere = 'linea'; b.dataset.chiave = k;
      b.innerHTML = `<i class="sitac-tratto" style="background:${d.color};
        ${d.dashArray?'background-image:repeating-linear-gradient(90deg,#0000 0 3px,'+ 'rgba(0,0,0,.65) 3px 6px)':''}"></i>${nm(d)}`;
      b.onclick = () => attiva('linea', k, b);
      linee.appendChild(b);
    });
    const aree = q('#sitac-tAree');
    aree.innerHTML = '';
    Object.entries(AREE).forEach(([k,d]) => {
      const b = document.createElement('button');
      b.dataset.genere = 'area'; b.dataset.chiave = k;
      b.innerHTML = `<i class="sitac-tratto" style="height:12px;border-radius:2px;
        background:${d.fillColor};opacity:.75;border:1.5px solid ${d.color}"></i>${nm(d)}`;
      b.onclick = () => attiva('area', k, b);
      aree.appendChild(b);
    });
    const sim = q('#sitac-tSimboli');
    sim.innerHTML = '';
    Object.entries(SIMBOLI).forEach(([k,d]) => {
      const b = document.createElement('button');
      b.dataset.genere = 'simbolo'; b.dataset.chiave = k;
      b.title = nm(d);
      b.innerHTML = svgSimbolo(k);
      b.onclick = () => attiva('simbolo', k, b);
      sim.appendChild(b);
    });
    // legenda: linee e aree
    const leg = q('#sitac-legVoci');
    leg.innerHTML = '';
    Object.values(LINEE).forEach(d => {
      leg.insertAdjacentHTML('beforeend',
        `<div><i class="sitac-tratto" style="background:${d.color}"></i>${nm(d)}</div>`);
    });
    Object.values(AREE).forEach(d => {
      leg.insertAdjacentHTML('beforeend',
        `<div><i class="sitac-tratto" style="height:11px;border-radius:2px;background:${d.fillColor};
          opacity:.8;border:1.5px solid ${d.color}"></i>${nm(d)}</div>`);
    });
    // ripristina l'evidenza dello strumento in uso dopo un cambio lingua
    if (strumento) marcaAttivo(strumento.genere, strumento.chiave);
  }
  function marcaAttivo(genere, chiave){
    const b = q(`#sitac-barra button[data-genere="${genere}"][data-chiave="${chiave}"]`);
    if (b) b.classList.add('attivo');
  }

  function spegniPulsanti(){
    qq('#sitac-barra button').forEach(b => b.classList.remove('attivo'));
    qq('#sitac-lingue button').forEach(b => {
      if (b.dataset.lingua === lingua) b.classList.add('attivo');
    });
  }
  function attiva(genere, chiave, bottone){
    const giaAttivo = bottone && bottone.classList.contains('attivo');
    fermaTutto();
    if (giaAttivo){ spegniPulsanti(); stato(t('spento')); return; }
    spegniPulsanti();
    if (bottone) bottone.classList.add('attivo');
    strumento = {genere, chiave};

    if (genere === 'linea'){
      const d = LINEE[chiave];
      map.pm.enableDraw('Line', {pathOptions: stile(d), continueDrawing:true});
      stato(`${nm(d)}\n${t('suggLinea')}`);
    } else if (genere === 'area'){
      const d = AREE[chiave];
      map.pm.enableDraw('Polygon', {pathOptions: stile(d), continueDrawing:true});
      stato(`${nm(d)}\n${t('suggArea')}`);
    } else {
      map.pm.enableDraw('Marker', {markerStyle:{icon: iconaSimbolo(chiave), draggable:true},
        continueDrawing:true});
      stato(`${nm(SIMBOLI[chiave])}\n${t('suggSimbolo')}`);
    }
  }
  function fermaTutto(){
    map.pm.disableDraw();
    map.pm.disableGlobalEditMode();
    map.pm.disableGlobalRemovalMode();
    strumento = null;
  }

  /* creazione */
  map.on('pm:create', e => {
    const layer = e.layer;
    if (!strumento) return;
    layer._tipo = strumento.chiave;
    layer._genere = strumento.genere;

    if (strumento.genere === 'linea'){
      decora(layer);
      layer.on('pm:edit', () => decora(layer));
      layer.on('pm:remove', () => scollega(layer));
    }
    if (strumento.genere === 'simbolo'){
      if (strumento.chiave === 'etichetta'){
        const testo = (prompt(t('promptEtichetta')) || '').trim();
        if (!testo){ disegni.removeLayer(layer); return; }
        layer.setIcon(L.divIcon({className:'sitac-etichetta', html: testo,
          iconSize:null, iconAnchor:[0,10]}));
        layer._testo = testo;
      } else {
        layer.bindTooltip(nm(SIMBOLI[strumento.chiave]), {direction:'top', offset:[0,-14]});
      }
    }
    aggiornaStato();
  });

  /* =======================================================================
     5. AZIONI
     ===================================================================== */
  const $ = id => q('#sitac-' + id);

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
      fillColor:'#2f81f7', fillOpacity:1}).addTo(decori);
    stato(t('posizione', {lat:e.latlng.lat.toFixed(5), lon:e.latlng.lng.toFixed(5), m:Math.round(e.accuracy)}));
  });
  map.on('locationerror', () => stato(t('posErrore')));
  $('bStampa').onclick = stampa;

  /* --- raccolta comune --- */
  function raccogli(){
    return disegni.getLayers().map(l => {
      const f = l.toGeoJSON();
      f.properties = {tipo:l._tipo || null, genere:l._genere || null, testo:l._testo || null};
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
      properties:{applicazione:'FireOps SITAC', lingua, creato:new Date().toISOString()}};
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
     I nomi dei Placemark seguono la lingua scelta; gli id di stile no.      */
  function kmlCol(hex, alfa = 1){
    const h = hex.replace('#','');
    const a = Math.round(Math.max(0,Math.min(1,alfa)) * 255).toString(16).padStart(2,'0');
    return a + h.slice(4,6) + h.slice(2,4) + h.slice(0,2);
  }
  const esc = s => String(s ?? '').replace(/[<>&'"]/g,
    c => ({'<':'&lt;','>':'&gt;','&':'&amp;',"'":'&apos;','"':'&quot;'}[c]));

  function costruisciKml(feat){
    const stili = [];
    // uno stile per ogni tipo tattico definito
    Object.entries(LINEE).forEach(([k,d]) => stili.push(
      `<Style id="${k}"><LineStyle><color>${kmlCol(d.color)}</color>`
      + `<width>${d.weight||3}</width></LineStyle></Style>`));
    Object.entries(AREE).forEach(([k,d]) => stili.push(
      `<Style id="${k}"><LineStyle><color>${kmlCol(d.color)}</color>`
      + `<width>${d.weight||2}</width></LineStyle>`
      + `<PolyStyle><color>${kmlCol(d.fillColor, d.fillOpacity)}</color><fill>1</fill>`
      + `<outline>1</outline></PolyStyle></Style>`));
    Object.entries(SIMBOLI).forEach(([k,d]) => stili.push(
      `<Style id="${k}"><IconStyle><color>${kmlCol(d.colore)}</color><scale>1.1</scale>`
      + `<Icon><href>https://maps.google.com/mapfiles/kml/shapes/placemark_circle.png</href></Icon>`
      + `</IconStyle><LabelStyle><color>${kmlCol(d.colore)}</color></LabelStyle></Style>`));

    const segna = feat.map(f => {
      const tp = f.properties.tipo;
      const def = LINEE[tp] || AREE[tp] || SIMBOLI[tp] || null;
      const nome = f.properties.testo || (def ? nm(def) : '') || tp || 'elemento';
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
        + `<Data name="genere"><value>${esc(f.properties.genere)}</value></Data></ExtendedData>`
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
  ${cartella(t('kmlLinee'),   f => LINEE[f.properties.tipo])}
  ${cartella(t('kmlSimboli'), f => SIMBOLI[f.properties.tipo])}
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
        const tp = feat.properties?.tipo;
        if (tp === 'etichetta'){
          const m = L.marker(latlng, {icon:L.divIcon({className:'sitac-etichetta',
            html: feat.properties.testo || '', iconSize:null, iconAnchor:[0,10]})});
          m._testo = feat.properties.testo; return m;
        }
        return L.marker(latlng, {icon: iconaSimbolo(SIMBOLI[tp] ? tp : 'ros'), draggable:true});
      },
      style: feat => {
        const tp = feat.properties?.tipo;
        const d = LINEE[tp] || AREE[tp];
        return d ? stile(d) : {color:'#ffd700'};
      },
      onEachFeature: (feat, layer) => {
        layer._tipo = feat.properties?.tipo;
        layer._genere = feat.properties?.genere;
        disegni.addLayer(layer);
        if (LINEE[layer._tipo]){
          decora(layer);
          layer.on('pm:edit', () => decora(layer));
          layer.on('pm:remove', () => scollega(layer));
        }
        if (SIMBOLI[layer._tipo] && layer._tipo !== 'etichetta')
          layer.bindTooltip(nm(SIMBOLI[layer._tipo]), {direction:'top', offset:[0,-14]});
        n++;
      }
    });
    if (n && disegni.getBounds().isValid())
      map.fitBounds(disegni.getBounds(), {padding:[40,40]});
    aggiornaStato();
    stato(t('importati', {n}));
  }

  /* --- stato --- */
  function stato(x){ $('stato').textContent = x; }
  function aggiornaStato(){
    const l = disegni.getLayers();
    const linee = l.filter(x => LINEE[x._tipo]).length;
    const aree  = l.filter(x => AREE[x._tipo]).length;
    const sim   = l.length - linee - aree;
    let sup = 0;
    l.filter(x => AREE[x._tipo] && x.getLatLngs).forEach(x => { sup += areaMq(x); });
    stato(t('conteggio', {l:linee, a:aree, s:sim})
      + (sup ? t('superficie', {v:(sup/10000).toFixed(1)}) : ''));
  }
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
    app.setAttribute('lang', lingua);
    qq('[data-t]').forEach(e => { e.textContent = t(e.dataset.t); });
    qq('#sitac-lingue button').forEach(b =>
      b.classList.toggle('attivo', b.dataset.lingua === lingua));
    creaPulsanti();
    // i tooltip già posati vanno riscritti nella nuova lingua
    disegni.eachLayer(l => {
      if (SIMBOLI[l._tipo] && l._tipo !== 'etichetta'){
        l.unbindTooltip();
        l.bindTooltip(nm(SIMBOLI[l._tipo]), {direction:'top', offset:[0,-14]});
      }
    });
    if (strumento){
      const d = strumento.genere === 'linea' ? LINEE[strumento.chiave]
              : strumento.genere === 'area'  ? AREE[strumento.chiave]
              : SIMBOLI[strumento.chiave];
      const sugg = strumento.genere === 'linea' ? 'suggLinea'
                 : strumento.genere === 'area'  ? 'suggArea' : 'suggSimbolo';
      stato(`${nm(d)}\n${t(sugg)}`);
    } else if (disegni.getLayers().length){
      aggiornaStato();
    } else {
      stato(t('pronto'));
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
    const la = parseFloat(d.lat ?? d.latitudine), lo = parseFloat(d.lon ?? d.longitudine);
    if (!isNaN(la) && !isNaN(lo) && !disegni.getLayers().length) map.setView([la, lo], 12);
  });

  return {
    map, disegni,
    lingua: lg => cambiaLingua(lg),
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

    for (const id of ['sitac-barra','sitac-mappa','sitac-tLinee','sitac-tAree',
                      'sitac-tSimboli','sitac-legVoci','sitac-stato','sitac-lingue']){
      if (!app.querySelector('#' + id)){
        console.error('[SITAC] manca #' + id + ' nel markup della sezione.');
        return null;
      }
    }
    if (typeof L === 'undefined' || !L.PM || !L.Symbol || !L.Symbol.arrowHead){
      app.querySelector('#sitac-stato').textContent =
        'Librerie mancanti: servono Leaflet, Geoman e PolylineDecorator.';
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