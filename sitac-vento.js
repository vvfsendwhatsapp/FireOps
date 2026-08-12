/*!
 * FireOps VVF — sitac-vento.js — vento e cono di propagazione
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
 * tabella 1 della pubblicazione, e servono da verifica.
 *
 * DA DOVE VIENE, DOVE VA
 * Le API meteorologiche danno la direzione DA CUI spira il vento (uso
 * meteorologico: 0 = da nord). Il fuoco corre nella direzione OPPOSTA, e
 * la freccia della tavola punta dove il vento va. Qui la conversione si fa
 * una volta sola, in `versoPropagazione`: è l'errore che ribalta il cono
 * di 180° e manda le squadre dalla parte sbagliata.
 */
(function () {
'use strict';
const NS = (window.FireOps = window.FireOps || {});

const APERTURA = 30;          // gradi totali del cono (±15 sulla bisettrice)
const QUOTA_VENTO = 0.03;     // la propagazione è il 3% della velocità del vento
const MINUTI = [15, 30, 60];  // archi previsti dalla pubblicazione

const R_TERRA = 6378137;
const rad = x => x * Math.PI / 180;
const gra = x => x * 180 / Math.PI;

/* =======================================================================
   1. LETTURA DEL VENTO
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

/* Intensità secondo la scala della tavola: debole, moderata, forte.
   La pubblicazione non fissa le soglie, quindi si usa Beaufort — sotto i
   20 km/h brezza leggera, oltre i 40 vento fresco. */
function simboloVento(kmh){
  if (kmh < 20) return 'vento_debole';
  if (kmh < 40) return 'vento_moderato';
  return 'vento_forte';
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

/* =======================================================================
   3. DISEGNO
   Restituisce un LayerGroup: chi lo chiama decide dove metterlo e quando
   toglierlo. Nulla di questo va nel GeoJSON esportato — è una previsione,
   non un rilievo, e si ricalcola quando cambia il vento.
   ===================================================================== */
function disegnaCono(origine, vento, opz){
  const o = opz || {};
  const col = o.colore || '#cc0000';
  const g = L.layerGroup();
  const verso = vento.verso;
  const massima = distanzaFronte(vento.velocita, Math.max.apply(null, MINUTI));
  const etichetta = o.etichetta || (m => `T+${m}`);

  /* Il settore: due lati dal punto di origine e l'arco esterno a chiuderli.
     Campitura leggerissima — sotto ci deve restare leggibile la carta. */
  const settore = [origine].concat(arco(origine, verso, massima)).concat([origine]);
  g.addLayer(L.polygon(settore, {color: col, weight: 1.5, dashArray: '6,5',
    fillColor: col, fillOpacity: .07, interactive: false}));

  /* La bisettrice è la direzione del vento: è l'asse su cui si ragiona. */
  g.addLayer(L.polyline([origine, puntoDaAzimut(origine, verso, massima)],
    {color: col, weight: 2, dashArray: '10,6', interactive: false}));

  /* Un arco per ciascun tempo, con quanto avrà percorso il fronte. */
  MINUTI.forEach(m => {
    const d = distanzaFronte(vento.velocita, m);
    if (d < 1) return;
    const linea = L.polyline(arco(origine, verso, d),
      {color: col, weight: 2.5, interactive: false});
    linea.bindTooltip(`${etichetta(m)} — ${Math.round(d)} m`,
      {permanent: true, direction: 'center', className: 'sitac-tip sitac-tip-arco'});
    g.addLayer(linea);
  });

  return g;
}

NS.SitacVento = {
  APERTURA, QUOTA_VENTO, MINUTI,
  leggi: leggiVento,
  chiaveOWM,
  simboloVento,
  versoPropagazione,
  distanzaFronte,
  disegnaCono
};

})();