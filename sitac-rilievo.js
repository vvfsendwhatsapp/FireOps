/*!
 * FireOps VVF — sitac-rilievo.js — profilo altimetrico e pendenza
 * Dipendenze: nessuna (usa fetch e Math). Va caricato PRIMA di sitac.js.
 * Espone: window.FireOps.SitacRilievo
 *
 * A COSA SERVE
 * Il cono di propagazione della pubblicazione SI.TA.C. si costruisce sul
 * vento e basta: è una carta, e su carta la pendenza la si legge dalle
 * curve di livello. Qui il rilievo c'è già in forma numerica, e lasciarlo
 * fuori significa disegnare lo stesso cono su un pianoro e su un versante
 * a 25°, dove il fuoco ci mette un quarto del tempo.
 *
 * ATTENZIONE — QUESTO NON È SI.TA.C.
 * La correzione applicata è la regola pratica AIB per cui la velocità di
 * propagazione raddoppia all'incirca ogni 10° di pendenza in salita:
 *
 *     k = 2^(alfa / 10)
 *
 * È una regola empirica da manuale, non un modello di comportamento del
 * fuoco e non una prescrizione della pubblicazione 2021. Un cono corretto
 * NON è un cono SI.TA.C.: chi lo stampa deve dirlo sulla carta, o fra sei
 * mesi qualcuno lo legge come se fosse standard.
 *
 * IL DATO SOTTO
 * Open-Meteo serve il DEM Copernicus GLO-90: celle da circa 90 m. Su un
 * cono da due chilometri le celle vere sono una ventina. Campionare
 * quaranta punti non aggiunge informazione, aggiunge solo interpolazione:
 * un profilo più liscio che sembra più preciso e non lo è.
 */
(function () {
'use strict';
const NS = (window.FireOps = window.FireOps || {});
if (NS.SitacRilievo) return;

const R_TERRA = 6378137;
const rad = x => x * Math.PI / 180;
const gra = x => x * 180 / Math.PI;

/* Stesso calcolo di sitac.js, ripetuto qui per non dipendere da quel file:
   questo modulo si carica prima ed è usabile da solo. */
function puntoDaAzimut(lat, lon, gradi, metri){
  const d = metri / R_TERRA, br = rad(gradi), la = rad(lat), lo = rad(lon);
  const la2 = Math.asin(Math.sin(la)*Math.cos(d) + Math.cos(la)*Math.sin(d)*Math.cos(br));
  const lo2 = lo + Math.atan2(Math.sin(br)*Math.sin(d)*Math.cos(la),
    Math.cos(d) - Math.sin(la)*Math.sin(la2));
  return {lat: gra(la2), lon: gra(lo2)};
}

/* ---------------------------------------------------------------------
   LETTURA DELLE QUOTE
   Un solo fetch per profilo: l'endpoint accetta fino a 100 coppie e
   restituisce le quote nello stesso ordine. Spezzare in una chiamata per
   punto significa venti richieste per un cono, e un 429 al terzo cono.
   ------------------------------------------------------------------- */
const MAX_PUNTI = 100;
const cache = new Map();          // chiave arrotondata -> quota
const chiave = (la, lo) => la.toFixed(4) + ',' + lo.toFixed(4);

async function quote(punti){
  const mancanti = punti.filter(p => !cache.has(chiave(p.lat, p.lon)));
  for (let i = 0; i < mancanti.length; i += MAX_PUNTI){
    const lotto = mancanti.slice(i, i + MAX_PUNTI);
    const u = 'https://api.open-meteo.com/v1/elevation'
      + '?latitude='  + lotto.map(p => p.lat.toFixed(5)).join(',')
      + '&longitude=' + lotto.map(p => p.lon.toFixed(5)).join(',');
    const r = await fetch(u);
    if (!r.ok) throw new Error('open-meteo elevation ' + r.status);
    const q = (await r.json()).elevation;
    if (!Array.isArray(q) || q.length !== lotto.length)
      throw new Error('quote incomplete');
    lotto.forEach((p, j) => cache.set(chiave(p.lat, p.lon), q[j]));
  }
  return punti.map(p => cache.get(chiave(p.lat, p.lon)));
}

/* ---------------------------------------------------------------------
   PROFILO LUNGO L'ASSE
   Si campiona la linea di avanzamento — origine, direzione del vento,
   distanza nominale a 60 minuti — e si tiene il profilo intero: da lì si
   ricavano le pendenze parziali per ogni arco senza rileggere niente.
   ------------------------------------------------------------------- */
const N_CAMPIONI = 24;

async function profilo(origine, azimut, metri, n){
  const passo = metri / (n || N_CAMPIONI);
  const punti = [];
  for (let i = 0; i <= (n || N_CAMPIONI); i++)
    punti.push(i === 0 ? {lat: origine.lat, lon: origine.lng != null ? origine.lng : origine.lon}
                       : puntoDaAzimut(origine.lat,
                           origine.lng != null ? origine.lng : origine.lon,
                           azimut, passo * i));
  const z = await quote(punti);
  return {punti, quote: z, passo, lunghezza: metri};
}

/* ---------------------------------------------------------------------
   PENDENZA E FATTORE
   La pendenza che conta per un arco non è quella del punto d'arrivo ma
   quella MEDIA del tratto percorso fino a lì: il fronte attraversa tutto
   il versante, non solo l'ultimo metro. Si prende quindi il dislivello
   cumulato fra origine e arco, diviso la distanza orizzontale.
   ------------------------------------------------------------------- */
const CAP_SU  = 4;     // ≈ 20°: oltre, il numero smette di dire qualcosa
const CAP_GIU = 0.5;   // in discesa il fuoco rallenta, non si spegne

function pendenzaFinoA(prof, metri){
  const i = Math.max(1, Math.min(prof.quote.length - 1,
    Math.round(metri / prof.passo)));
  const dz = prof.quote[i] - prof.quote[0];
  const dx = prof.passo * i;
  return gra(Math.atan2(dz, dx));
}

/* Il fattore è tagliato agli estremi, e `tagliato` lo dice: l'etichetta
   dell'arco deve poter segnalare che il valore mostrato non è quello
   calcolato, altrimenti il taglio è una bugia silenziosa. */
function fattore(gradiPendenza){
  const grezzo = Math.pow(2, gradiPendenza / 10);
  const k = Math.min(CAP_SU, Math.max(CAP_GIU, grezzo));
  return {k, grezzo, tagliato: Math.abs(k - grezzo) > 1e-6,
    pendenza: Math.round(gradiPendenza * 10) / 10};
}

/* ---------------------------------------------------------------------
   USO TIPICO
   `analizza` restituisce un fattore per ciascun tempo richiesto, a
   partire dalle distanze nominali che il chiamante ha già calcolato con
   distanzaFronte(). Nessuna geometria qui dentro: questo modulo legge il
   terreno e restituisce numeri, il disegno resta di sitac-vento.js.

   LIMITE DICHIARATO: il profilo è campionato sulle distanze NOMINALI. Se
   la correzione allunga l'arco oltre il tratto letto, il k applicato è
   quello del terreno nominalmente attraversato, non di quello vero più
   avanti. In salita costante la differenza è piccola; su un versante che
   cambia pendenza a metà, no. Passare `iterazioni:2` per rileggere sulle
   distanze corrette.
   ------------------------------------------------------------------- */
async function analizza(origine, azimut, distanze, opz){
  const o = opz || {};
  const max = Math.max.apply(null, distanze);
  let prof = await profilo(origine, azimut, max, o.campioni);
  let out = distanze.map(d => fattore(pendenzaFinoA(prof, d)));

  if (o.iterazioni > 1){
    const corrette = distanze.map((d, i) => d * out[i].k);
    prof = await profilo(origine, azimut, Math.max.apply(null, corrette), o.campioni);
    out = corrette.map(d => fattore(pendenzaFinoA(prof, d)));
  }
  return {profilo: prof, fattori: out};
}

NS.SitacRilievo = {
  quote, profilo, analizza, fattore, pendenzaFinoA,
  CAP_SU, CAP_GIU,
  /* Per la nota in legenda e sulla carta stampata: chi guarda deve sapere
     che sta leggendo una stima empirica, non la tavola. */
  avvertenza: {
    it: 'Raggi corretti per pendenza — stima empirica (2^(α/10)), non SI.TA.C.',
    en: 'Radii corrected for slope — empirical estimate (2^(α/10)), not SI.TA.C.',
    fr: 'Rayons corrigés de la pente — estimation empirique (2^(α/10)), hors SI.TA.C.',
    es: 'Radios corregidos por pendiente — estimación empírica (2^(α/10)), no SI.TA.C.'
  }
};

})();