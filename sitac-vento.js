/*!
 * FireOps VVF — sitac-vento.js — vento, cono di propagazione, fronti
 *
 * Metodo e numeri sono quelli della pubblicazione SI.TA.C. 2021 del CNVVF:
 *
 *   «si considera che il cono di propagazione teorica sia compreso in un
 *    angolo di 30° avente come vertice il punto di origine dell'incendio e
 *    bisettrice la direzione del vento»
 *
 *   «la velocità di propagazione del fuoco può essere considerata pari al
 *    3% di quella del vento»
 *
 * L'apertura è dunque 30° TOTALI, cioè 15° per lato — le figure 1, 4 e 5
 * della pubblicazione lo mostrano esplicitamente. Se serve cambiarla, si
 * cambia APERTURA qui sotto e basta: non è ripetuta altrove.
 *
 * Con vento a 30 km/h il fuoco avanza a 900 m/h, quindi 225 m in 15
 * minuti, 450 in 30 e 900 in un'ora: sono esattamente i valori della
 * tabella 1 della pubblicazione, e servono da verifica. SCALA è la colonna
 * sinistra della stessa tabella, 10÷110 km/h di dieci in dieci.
 *
 * DA DOVE VIENE, DOVE VA
 * Le API meteorologiche danno la direzione DA CUI spira il vento (uso
 * meteorologico: 0 = da nord). Il fuoco corre nella direzione OPPOSTA, e
 * la freccia della tavola punta dove il vento va. Qui la conversione si fa
 * una volta sola, in `versoPropagazione`: è l'errore che ribalta il cono
 * di 180° e manda le squadre dalla parte sbagliata.
 *
 * LA BUSSOLA NON VA CONVERTITA
 * Puntando il telefono verso il fumo si legge già il VERSO di propagazione,
 * non la provenienza: `leggiBussola` restituisce quindi un verso, e chi lo
 * usa ricava la provenienza al contrario. Sbagliare qui ribalta il cono
 * esattamente come sopra.
 *
 * DUE GEOMETRIE
 * `disegnaCono`  — settore circolare dal punto d'innesco, con raggio
 *                  iniziale opzionale (dove sta il fronte adesso, T0).
 * `disegnaFronti`— la linea del fronte rilevata a T0, traslata lungo la
 *                  direzione del vento di quanto avanza in 15/30/60 minuti.
 * Nessuna delle due è un rilievo: sono stime, stanno nei decori e non
 * finiscono nel GeoJSON esportato.
 */
(function () {
'use strict';
const NS = (window.FireOps = window.FireOps || {});

const APERTURA = 30;          // gradi totali del cono (±15 sulla bisettrice)
const QUOTA_VENTO = 0.03;     // la propagazione è il 3% della velocità del vento
const MINUTI = [15, 30, 60];  // archi previsti dalla pubblicazione
const SCALA = [10,20,30,40,50,60,70,80,90,100,110];   // colonna km/h di tab. 1

const R_TERRA = 6378137;
const rad = x => x * Math.PI / 180;
const gra = x => x * 180 / Math.PI;

/* =======================================================================
   1. LETTURA DEL VENTO DA SERVIZIO
   Tre servizi in cascata. Open-Meteo per primo perché non chiede chiavi e
   risponde in CORS: è l'unico che funziona su GitHub Pages senza altro.
   ===================================================================== */

/* OpenWeatherMap richiede una chiave personale. Non è scritta nel codice —
   finirebbe pubblica su GitHub Pages, e la chiave verrebbe revocata. Chi ne
   ha una la mette una volta con FireOps.SitacVento.chiaveOWM('...'). */
const CHIAVE = 'fireops_owm_key';
function chiaveOWM(v){
  try {
    if (v === undefined) return localStorage.getItem(CHIAVE) || '';
    if (v) localStorage.setItem(CHIAVE, v); else localStorage.removeItem(CHIAVE);
    return v || '';
  } catch(e){ return ''; }
}

async function daOpenMeteo(lat, lon){
  const u = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}`
    + `&current=wind_speed_10m,wind_direction_10m&wind_speed_unit=kmh`;
  const r = await fetch(u);
  if (!r.ok) throw new Error('open-meteo ' + r.status);
  const j = await r.json();
  const c = j.current || {};
  if (c.wind_speed_10m == null) throw new Error('open-meteo: dato assente');
  return {velocita: c.wind_speed_10m, provenienza: c.wind_direction_10m,
    fonte: 'Open-Meteo', quando: c.time || null};
}

/* met.no chiede di identificarsi con uno User-Agent, che dal browser non è
   impostabile: se l'istituto risponde comunque bene, altrimenti si passa
   oltre senza far rumore. Le velocità arrivano in m/s. */
async function daMetNo(lat, lon){
  const u = `https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${lat}&lon=${lon}`;
  const r = await fetch(u);
  if (!r.ok) throw new Error('met.no ' + r.status);
  const j = await r.json();
  const p = j.properties.timeseries[0];
  const d = p.data.instant.details;
  if (d.wind_speed == null) throw new Error('met.no: dato assente');
  return {velocita: d.wind_speed * 3.6, provenienza: d.wind_from_direction,
    fonte: 'MET Norway', quando: p.time};
}

async function daOpenWeather(lat, lon){
  const k = chiaveOWM();
  if (!k) throw new Error('OpenWeatherMap: nessuna chiave impostata');
  const u = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}`
    + `&appid=${encodeURIComponent(k)}&units=metric`;
  const r = await fetch(u);
  if (!r.ok) throw new Error('openweathermap ' + r.status);
  const j = await r.json();
  if (!j.wind || j.wind.speed == null) throw new Error('openweathermap: dato assente');
  return {velocita: j.wind.speed * 3.6, provenienza: j.wind.deg,   // m/s -> km/h
    fonte: 'OpenWeatherMap', quando: null};
}

async function leggiVento(lat, lon){
  const errori = [];
  for (const f of [daOpenMeteo, daMetNo, daOpenWeather]){
    try {
      const v = await f(lat, lon);
      v.velocita = Math.round(v.velocita * 10) / 10;
      v.provenienza = Math.round(v.provenienza);
      v.verso = versoPropagazione(v.provenienza);
      return v;
    } catch(e){ errori.push(e.message); }
  }
  throw new Error(errori.join(' · '));
}

/* Meteorologia: 0 gradi vuol dire "da nord", cioè il vento va verso sud. */
const versoPropagazione = provenienza => (provenienza + 180) % 360;

/* La tabella 1 ragiona per decine di km/h. Arrotondare in eccesso è la
   scelta prudente: il fronte previsto sta un po' più avanti del reale, non
   un po' più indietro. */
const arrotondaDecine = v => Math.min(110, Math.max(10, Math.ceil((+v || 0) / 10) * 10));

/* Intensità secondo la scala della tavola: debole, moderata, forte.
   La pubblicazione non fissa le soglie, quindi si usa Beaufort — sotto i
   20 km/h brezza leggera, oltre i 40 vento fresco. */
function simboloVento(kmh){
  if (kmh < 20) return 'vento_debole';
  if (kmh < 40) return 'vento_moderato';
  return 'vento_forte';
}

/* =======================================================================
   1bis. LETTURA DEL VENTO DALLA BUSSOLA
   Si punta il telefono verso il fumo. Quello che si legge è già il VERSO
   di propagazione: nessuna somma di 180 gradi, qui.
   Serve HTTPS (su GitHub Pages c'è). Su iOS il permesso va chiesto dentro
   il gesto dell'utente: `leggiBussola` va quindi chiamata subito dopo il
   clic sul pulsante, senza attese in mezzo.
   ===================================================================== */
function bussolaDisponibile(){
  return typeof window.DeviceOrientationEvent !== 'undefined'
    && window.isSecureContext !== false;
}

function leggiBussola(attesa){
  return new Promise((risolvi, rifiuta) => {
    if (!bussolaDisponibile())
      return rifiuta(new Error('bussola non disponibile su questo dispositivo'));

    const avvia = () => {
      let ultimo = null, chiuso = false;
      const su = ev => {
        let h = null;
        /* iOS dà la prua magnetica già pronta; Android la ricava da alpha,
           ma solo se l'evento è assoluto — altrimenti è relativa a dove il
           telefono era acceso, e non vuol dire niente. */
        if (typeof ev.webkitCompassHeading === 'number') h = ev.webkitCompassHeading;
        else if (ev.absolute && typeof ev.alpha === 'number') h = (360 - ev.alpha) % 360;
        if (h == null || isNaN(h)) return;
        ultimo = (h + 360) % 360;
      };
      const chiudi = () => {
        if (chiuso) return; chiuso = true;
        window.removeEventListener('deviceorientationabsolute', su, true);
        window.removeEventListener('deviceorientation', su, true);
        clearTimeout(tempo);
        if (ultimo == null) rifiuta(new Error('nessuna lettura dalla bussola'));
        else risolvi(Math.round(ultimo));
      };
      window.addEventListener('deviceorientationabsolute', su, true);
      window.addEventListener('deviceorientation', su, true);
      const tempo = setTimeout(chiudi, attesa || 2500);
    };

    const DOE = window.DeviceOrientationEvent;
    if (typeof DOE.requestPermission === 'function')
      DOE.requestPermission().then(
        p => p === 'granted' ? avvia() : rifiuta(new Error('permesso bussola negato')),
        e => rifiuta(e));
    else avvia();
  });
}

/* Un vento costruito a mano vale quanto uno letto da un servizio: stessa
   forma, così chi disegna non deve sapere da dove viene. */
function ventoDa(velocita, verso, fonte){
  const vs = ((Math.round(verso) % 360) + 360) % 360;
  return {velocita: Math.round(velocita * 10) / 10, verso: vs,
    provenienza: (vs + 180) % 360, fonte: fonte || '—', quando: null};
}

/* =======================================================================
   2. GEOMETRIA
   ===================================================================== */
function puntoDaAzimut(c, gradi, metri){
  const d = metri / R_TERRA, br = rad(gradi), la = rad(c.lat), lo = rad(c.lng);
  const lat2 = Math.asin(Math.sin(la)*Math.cos(d) + Math.cos(la)*Math.sin(d)*Math.cos(br));
  const lon2 = lo + Math.atan2(Math.sin(br)*Math.sin(d)*Math.cos(la),
    Math.cos(d) - Math.sin(la)*Math.sin(lat2));
  return L.latLng(gra(lat2), gra(lon2));
}

/* Distanza percorsa dal fronte in un dato numero di minuti, in metri.
   30 km/h per 60 minuti = 900 m, come da tabella 1. */
const distanzaFronte = (kmh, minuti) => kmh * QUOTA_VENTO * 1000 * (minuti / 60);

/* Arco a passo fitto: a 15° per lato un arco a tre punti sarebbe un
   triangolo, e la previsione sembrerebbe più precisa di quanto sia. */
function arco(centro, verso, metri, passo){
  const p = [];
  for (let a = -APERTURA/2; a <= APERTURA/2 + 0.001; a += (passo || 2))
    p.push(puntoDaAzimut(centro, verso + a, metri));
  return p;
}

/* Il centro del fronte serve da origine del riferimento locale: si prende
   la media dei vertici, che su qualche centinaio di metri va benissimo. */
function centroide(punti){
  let la = 0, lo = 0;
  punti.forEach(p => { la += p.lat; lo += p.lng; });
  return L.latLng(la / punti.length, lo / punti.length);
}

function azimut(a, b){
  const dLon = rad(b.lng - a.lng);
  const y = Math.sin(dLon) * Math.cos(rad(b.lat));
  const x = Math.cos(rad(a.lat)) * Math.sin(rad(b.lat))
          - Math.sin(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.cos(dLon);
  return (gra(Math.atan2(y, x)) + 360) % 360;
}

/* Il fronte non si limita a traslare: si allarga anche di lato, 15° per
   parte come il cono, perché ai due estremi il fuoco corre uguale.
   In un riferimento locale — y lungo il vento, x di traverso — ogni tempo
   si ricalcola SEMPRE dal fronte di T0, mai a catena: incatenare gli
   offset somma gli errori e la mezz'ora è il doppio sbagliata dei quindici
   minuti.
   Poi si ripulisce. Un fronte concavo, che torna indietro su sé stesso,
   allargandosi si incrocerebbe; le x si forzano monotone lungo il
   tracciato, e la piega si appiattisce invece di annodarsi. */
function frontePiu(punti, verso, metri){
  const c = centroide(punti);
  const apre = metri * Math.tan(rad(APERTURA / 2));
  const loc = punti.map(p => {
    const d = c.distanceTo(p), a = rad(azimut(c, p) - verso);
    return {x: d * Math.sin(a), y: d * Math.cos(a)};
  });
  const larghezza = Math.max.apply(null, loc.map(p => Math.abs(p.x)));
  const k = larghezza > 1 ? (larghezza + apre) / larghezza : 1;
  const x = loc.map(p => p.x * k);
  const avanti = x[x.length - 1] >= x[0];
  for (let i = 1; i < x.length; i++)
    x[i] = avanti ? Math.max(x[i], x[i-1]) : Math.min(x[i], x[i-1]);
  return loc.map((p, i) => {
    const y = p.y + metri;
    return puntoDaAzimut(c, verso + gra(Math.atan2(x[i], y)),
      Math.sqrt(x[i]*x[i] + y*y));
  });
}

/* Il fronte non è il perimetro: di un'area percorsa quello che avanza è
   solo il bordo sottovento. Si porta tutto nel riferimento locale — x di
   traverso al vento, y lungo il vento — si prendono i due vertici estremi
   in x, e delle due catene di bordo che li uniscono si tiene quella che
   sta più avanti. L'altra è coda e fianchi, già percorsi. */
function fronteSottovento(vertici, verso){
  const punti = vertici.map(p => L.latLng(p.lat, p.lng));
  if (punti.length < 3) return punti;
  const c = centroide(punti);
  const loc = punti.map(p => {
    const d = c.distanceTo(p), a = rad(azimut(c, p) - verso);
    return {x: d * Math.sin(a), y: d * Math.cos(a)};
  });
  let iMin = 0, iMax = 0;
  loc.forEach((p, i) => {
    if (p.x < loc[iMin].x) iMin = i;
    if (p.x > loc[iMax].x) iMax = i;
  });
  /* L'anello è chiuso: da un estremo all'altro si può girare in due sensi. */
  const catena = (da, a) => {
    const r = [];
    for (let i = da; ; i = (i + 1) % punti.length){ r.push(i); if (i === a) break; }
    return r;
  };
  const c1 = catena(iMin, iMax), c2 = catena(iMax, iMin);
  const media = ind => ind.reduce((s, i) => s + loc[i].y, 0) / ind.length;
  const scelta = media(c1) >= media(c2) ? c1 : c2.slice().reverse();
  return scelta.map(i => punti[i]);
}

/* Modo 2 — la linea del fronte rilevata a T0, allargata e spinta avanti.
   Serve quando il fuoco è già lungo e il punto d'innesco non dice più
   niente: quello che conta è dov'è il fronte adesso. */
function disegnaFronti(vertici, vento, opz){
  const o = opz || {};
  const col = o.colore || '#cc0000';
  const g = L.layerGroup();
  const verso = vento.verso;
  const minuti = o.minuti || MINUTI;
  const etichetta = o.etichetta || (m => 'T+' + m);
  const punti = vertici.map(p => L.latLng(p.lat, p.lng));
  const centro = centroide(punti);
  const massima = distanzaFronte(vento.velocita, Math.max.apply(null, minuti));

  /* Il corridoio fra il fronte di adesso e quello finale: dice quale
     porzione di terreno è in gioco nell'ora che viene. Si chiude sul
     fronte allargato, quindi è un trapezio, non una striscia. */
  if (massima > 1)
    g.addLayer(L.polygon(punti.concat(frontePiu(punti, verso, massima).reverse()),
      {color: col, weight: 1, dashArray: '6,5', fillColor: col, fillOpacity: .07,
       interactive: false}));

  /* T0: rilevato, quindi continuo, grosso e non ritoccato. */
  const l0 = L.polyline(punti, {color: col, weight: 3.5, interactive: false});
  l0.bindTooltip(o.etichetta0 || 'T0',
    {permanent: true, direction: 'center', className: 'sitac-tip sitac-tip-arco'});
  g.addLayer(l0);

  if (massima > 1)
    g.addLayer(L.polyline([centro, puntoDaAzimut(centro, verso, massima)],
      {color: col, weight: 2, dashArray: '10,6', interactive: false}));

  minuti.forEach(m => {
    const d = distanzaFronte(vento.velocita, m);
    if (d < 1) return;
    const linea = L.polyline(frontePiu(punti, verso, d),
      {color: col, weight: 2.5, interactive: false});
    linea.bindTooltip(`${etichetta(m)} — ${Math.round(d)} m`,
      {permanent: true, direction: 'center', className: 'sitac-tip sitac-tip-arco'});
    g.addLayer(linea);
  });

  return g;
}

/* =======================================================================
   3. DISEGNO
   Restituiscono un LayerGroup: chi lo chiama decide dove metterlo e quando
   toglierlo. Nulla di questo va nel GeoJSON esportato — è una previsione,
   non un rilievo, e si ricalcola quando cambia il vento.
   ===================================================================== */

/* Modo 1 — settore circolare dal punto d'innesco.
   `raggio0` è la distanza a cui sta il fronte adesso: se vale 0 il cono
   parte dal vertice, come in figura 1; se vale qualcosa il primo arco è il
   fronte rilevato (T0) e gli altri partono da lì. */
function disegnaCono(origine, vento, opz){
  const o = opz || {};
  const col = o.colore || '#cc0000';
  const g = L.layerGroup();
  const verso = vento.verso;
  const r0 = Math.max(0, o.raggio0 || 0);
  const minuti = o.minuti || MINUTI;
  const massima = r0 + distanzaFronte(vento.velocita, Math.max.apply(null, minuti));
  const etichetta = o.etichetta || (m => 'T+' + m);

  /* Il settore: due lati dal punto di origine e l'arco esterno a chiuderli.
     Campitura leggerissima — sotto ci deve restare leggibile la carta. */
  const settore = [origine].concat(arco(origine, verso, massima)).concat([origine]);
  g.addLayer(L.polygon(settore, {color: col, weight: 1.5, dashArray: '6,5',
    fillColor: col, fillOpacity: .07, interactive: false}));

  /* La bisettrice è la direzione del vento: è l'asse su cui si ragiona. */
  g.addLayer(L.polyline([origine, puntoDaAzimut(origine, verso, massima)],
    {color: col, weight: 2, dashArray: '10,6', interactive: false}));

  /* Il fronte di adesso, quando è stato indicato: tratto grosso e continuo,
     perché quello è rilevato e non stimato. */
  if (r0 > 1){
    const l0 = L.polyline(arco(origine, verso, r0),
      {color: col, weight: 3.5, interactive: false});
    l0.bindTooltip(`${o.etichetta0 || 'T0'} — ${Math.round(r0)} m`,
      {permanent: true, direction: 'center', className: 'sitac-tip sitac-tip-arco'});
    g.addLayer(l0);
  }

  /* Un arco per ciascun tempo, con quanto avrà percorso il fronte. */
  minuti.forEach(m => {
    const d = distanzaFronte(vento.velocita, m);
    if (d < 1) return;
    const linea = L.polyline(arco(origine, verso, r0 + d),
      {color: col, weight: 2.5, interactive: false});
    linea.bindTooltip(`${etichetta(m)} — ${Math.round(d)} m`,
      {permanent: true, direction: 'center', className: 'sitac-tip sitac-tip-arco'});
    g.addLayer(linea);
  });

  return g;
}

NS.SitacVento = {
  APERTURA, QUOTA_VENTO, MINUTI, SCALA,
  leggi: leggiVento,
  chiaveOWM,
  simboloVento,
  versoPropagazione,
  arrotondaDecine,
  bussolaDisponibile,
  leggiBussola,
  ventoDa,
  distanzaFronte,
  puntoDaAzimut,
  disegnaCono,
  fronteSottovento,
  disegnaFronti
};

})();