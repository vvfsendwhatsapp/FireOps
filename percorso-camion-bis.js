/*!
 * FireOps VVF — percorso-camion-bis.js — SOLO index-bis (modalità test)
 *
 * Percorso di soccorso del Convertitore coordinate: controllo del camion.
 *  - Segnala sottopassi, gallerie, passaggi sotto edifici e limiti di altezza/larghezza
 *    che il tratto col mezzo attraversa (dati OpenStreetMap, letti via Overpass lungo
 *    il percorso).
 *  - Con la spunta "Camion" e le misure del mezzo (altezza, larghezza), gli ostacoli
 *    più bassi o più stretti del mezzo si evitano: il percorso si ricalcola con BRouter
 *    vietando quei punti (nogos), fino a tre volte.
 *  - Senza spunta: solo segnalazione, il percorso non cambia.
 * convertitore.js chiama window.FireOps.PercorsoCamion.controlla / disegna / righe solo
 * se questo file è caricato: in produzione (index.html) non c'è e nulla cambia.
 */
(function () {
  'use strict';
  const NS = (window.FireOps = window.FireOps || {});
  if (NS.PercorsoCamion) return;

  const PREF = 'fireops-camion-test-v1';
  const OVERPASS = 'https://overpass-api.de/api/interpreter';
  let pref = {attivo: true, altezza: 3.5, larghezza: 2.55};
  try { Object.assign(pref, JSON.parse(localStorage.getItem(PREF) || '{}')); } catch (e) {}
  const salva = () => { try { localStorage.setItem(PREF, JSON.stringify(pref)); } catch (e) {} };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));

  /* ------------------------------------------------------------ pannello */
  function pannello() {
    const box = document.querySelector('#coord-tab-content-mappa .coord-mappa-pulsantiera');
    if (!box || document.getElementById('camion-test')) return;
    const d = document.createElement('div');
    d.id = 'camion-test';
    d.innerHTML = `
      <style>
        #camion-test{display:flex;flex-wrap:wrap;align-items:center;gap:8px 12px;margin:8px 0 2px;padding:8px 10px;
          border:1px dashed #e0a800;border-radius:8px;font-size:13px}
        #camion-test .tag{background:#e0a800;color:#121212;font-weight:700;font-size:10px;padding:2px 6px;border-radius:99px;letter-spacing:.04em}
        #camion-test label{display:flex;align-items:center;gap:6px;white-space:nowrap}
        #camion-test input[type=number]{width:72px;padding:5px 6px;border-radius:6px;border:1px solid #555;background:transparent;color:inherit}
        #camion-test input:disabled{opacity:.4}
        #camion-test .nota{flex:1 1 100%;font-size:11px;opacity:.75}
      </style>
      <span class="tag">TEST</span>
      <label><input type="checkbox" id="camion-attivo"> 🚒 Camion</label>
      <label>Altezza <input type="number" id="camion-h" min="1.5" max="5" step="0.05"> m</label>
      <label>Larghezza <input type="number" id="camion-w" min="1.5" max="4" step="0.05"> m</label>
      <div class="nota">Soccorso / Solo mezzo: segnala sottopassi e limiti sul percorso; con "Camion" evita quelli più bassi o stretti del mezzo.</div>`;
    box.appendChild(d);
    const cb = d.querySelector('#camion-attivo'), h = d.querySelector('#camion-h'), w = d.querySelector('#camion-w');
    cb.checked = !!pref.attivo; h.value = pref.altezza; w.value = pref.larghezza;
    const aggiorna = () => { h.disabled = w.disabled = !cb.checked; };
    aggiorna();
    cb.onchange = () => { pref.attivo = cb.checked; salva(); aggiorna(); };
    h.onchange = () => { const v = parseFloat(String(h.value).replace(',', '.')); if (v > 0) { pref.altezza = v; salva(); } else h.value = pref.altezza; };
    w.onchange = () => { const v = parseFloat(String(w.value).replace(',', '.')); if (v > 0) { pref.larghezza = v; salva(); } else w.value = pref.larghezza; };
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', pannello); else pannello();
  // la scheda mappa può essere costruita dopo: riprova finché non c'è
  let tentativi = 0;
  const t = setInterval(() => { pannello(); if (document.getElementById('camion-test') || ++tentativi > 60) clearInterval(t); }, 1000);

  /* ------------------------------------------------------------ geometria */
  const R = 6371000, rad = x => x * Math.PI / 180;
  // proiezione locale in metri attorno a una latitudine di riferimento
  const proiettore = lat0 => { const kx = Math.cos(rad(lat0)) * R * Math.PI / 180, ky = R * Math.PI / 180;
    return (lat, lon) => [lon * kx, lat * ky]; };
  function distSeg(p, a, b) {
    const dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy;
    let t = l2 ? ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2 : 0;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
  }
  function distPolilinea(p, linea) {
    let m = Infinity;
    for (let i = 1; i < linea.length; i++) m = Math.min(m, distSeg(p, linea[i - 1], linea[i]));
    return m;
  }
  function vicinoPercorso(p, linea) {   // distanza e direzione del segmento più vicino
    let m = Infinity, dir = 0;
    for (let i = 1; i < linea.length; i++) {
      const d = distSeg(p, linea[i - 1], linea[i]);
      if (d < m) { m = d; dir = Math.atan2(linea[i][1] - linea[i - 1][1], linea[i][0] - linea[i - 1][0]); }
    }
    return {d: m, dir};
  }
  function angolo(a, b) {   // differenza fra direzioni, senza verso (0..90°)
    let d = Math.abs(a - b) % Math.PI;
    if (d > Math.PI / 2) d = Math.PI - d;
    return d * 180 / Math.PI;
  }
  // al massimo n punti, presi a distanza regolare (per la query "around" di Overpass)
  function sfoltisci(coord, n) {
    if (coord.length <= n) return coord;
    const out = [], passo = (coord.length - 1) / (n - 1);
    for (let i = 0; i < n; i++) out.push(coord[Math.round(i * passo)]);
    return out;
  }

  /* ------------------------------------------------------------ altezza / larghezza */
  function metri(v) {
    v = String(v || '').trim().toLowerCase().replace(',', '.');
    let m = v.match(/^(\d+(?:\.\d+)?)\s*(m)?$/);
    if (m) return parseFloat(m[1]);
    m = v.match(/^(\d+)\s*'\s*(?:(\d+)\s*")?$/);
    if (m) return Math.round((+m[1] * 0.3048 + (+m[2] || 0) * 0.0254) * 100) / 100;
    return null;
  }

  /* ------------------------------------------------------------ ostacoli lungo il percorso */
  async function ostacoli(coord) {
    if (!coord || coord.length < 2) return [];
    const ll = coord.map(c => [c[1], c[0]]);          // [lat, lon]
    const linea = sfoltisci(ll, 180).map(p => p[0].toFixed(5) + ',' + p[1].toFixed(5)).join(',');
    const A = `(around:15,${linea})`;
    const q = `[out:json][timeout:25];(
      way${A}["highway"]["tunnel"~"^(yes|building_passage|avalanche_protector)$"];
      way${A}["highway"]["covered"="yes"];
      way${A}["highway"]["maxheight"]; way${A}["highway"]["maxheight:physical"];
      way${A}["highway"]["maxwidth"]; way${A}["highway"]["maxwidth:physical"];
      node${A}["maxheight"]; node${A}["maxheight:physical"]; node${A}["maxwidth"];
      node${A}["barrier"="height_restrictor"];
    );out tags geom;`;
    const ac = new AbortController(), tmo = setTimeout(() => ac.abort(), 30000);
    let j;
    try {
      const r = await fetch(OVERPASS, {method: 'POST', body: 'data=' + encodeURIComponent(q), signal: ac.signal});
      if (!r.ok) throw new Error('Overpass HTTP ' + r.status);
      j = await r.json();
    } finally { clearTimeout(tmo); }
    const P = proiettore(ll[0][0]);
    const lineaM = ll.map(p => P(p[0], p[1]));
    const out = [];
    for (const e of j.elements || []) {
      const t = e.tags || {};
      let vicino = null, geom = null;
      if (e.type === 'node') {
        const d = distPolilinea(P(e.lat, e.lon), lineaM);
        if (d > 10) continue;                                  // nodo non sul percorso
        vicino = [e.lat, e.lon];
      } else {
        geom = (e.geometry || []).map(g => [g.lat, g.lon]);
        if (geom.length < 2) continue;
        // la via deve CORRERE lungo il percorso (non solo incrociarlo: un sottopasso che si
        // scavalca su un ponte non è un ostacolo)
        // campioni ogni ~5 m: contano solo quelli entro 12 m dal percorso E nella stessa
        // direzione (±35°); una via che lo incrocia di traverso resta fuori
        let tot = 0, dentro = 0, best = null, bd = Infinity;
        for (let i = 1; i < geom.length; i++) {
          const a = P(...geom[i - 1]), b = P(...geom[i]);
          const l = Math.hypot(b[0] - a[0], b[1] - a[1]), dirV = Math.atan2(b[1] - a[1], b[0] - a[0]);
          const n = Math.max(1, Math.ceil(l / 5));
          tot += l;
          for (let k = 0; k < n; k++) {
            const f = (k + 0.5) / n, q = [a[0] + f * (b[0] - a[0]), a[1] + f * (b[1] - a[1])];
            const v = vicinoPercorso(q, lineaM);
            if (v.d <= 12 && angolo(v.dir, dirV) <= 35) {
              dentro += l / n;
              if (v.d < bd) { bd = v.d; best = [geom[i - 1][0] + f * (geom[i][0] - geom[i - 1][0]), geom[i - 1][1] + f * (geom[i][1] - geom[i - 1][1])]; }
            }
          }
        }
        if (!best || dentro < Math.min(20, 0.6 * tot)) continue;
        vicino = best;
      }
      const h = metri(t['maxheight:physical']) ?? metri(t.maxheight);
      const w = metri(t['maxwidth:physical']) ?? metri(t.maxwidth);
      const tipo = e.type === 'node' ? (t.barrier === 'height_restrictor' ? 'barriera di altezza' : 'limite')
        : t.tunnel === 'building_passage' ? 'passaggio sotto edificio'
        : t.tunnel ? 'sottopasso / galleria' : t.covered === 'yes' ? 'tratto coperto' : 'limite';
      out.push({id: e.type + '/' + e.id, tipo, nome: t.name || t.ref || '', h, w, lat: vicino[0], lon: vicino[1], geom,
        allagabile: t.flood_prone === 'yes'});
    }
    return out;
  }
  async function daGeojson(coord) {
    if (!window.FireOpsSottopassi) return null;
    try {
      const t = await window.FireOpsSottopassi.sulPercorso(coord);
      return t.map(x => ({id: String(x.p.osm || '').replace(/^.*openstreetmap\.org\//, ''), tipo: x.p.tipo || 'sottopasso',
        nome: x.p.nome || '', h: x.p.altezza_m ?? null, w: null, lat: x.lat, lon: x.lon, geom: null, allagabile: !!x.p.allagabile}));
    } catch (e) { return null; }
  }
  const blocca = o => pref.attivo && ((o.h != null && o.h < pref.altezza) || (o.w != null && o.w < pref.larghezza));

  /* ------------------------------------------------------------ API per convertitore.js */
  async function controlla(coordAuto, ricalcola) {
    const evitati = [];
    let lista, fonte = 'OSM live';
    try { lista = await ostacoli(coordAuto); }
    catch (e) {
      // Overpass non risponde: ripiego sul GeoJSON sottopassi delle competenze (solo province calcolate)
      lista = await daGeojson(coordAuto);
      if (!lista) return {errore: 'sottopassi non verificati (Overpass non raggiungibile)', ostacoli: [], evitati};
      fonte = 'GeoJSON competenze';
    }
    let auto = null;
    for (let giro = 0; giro < 3 && pref.attivo; giro++) {
      const bloccanti = lista.filter(blocca);
      if (!bloccanti.length) break;
      evitati.push(...bloccanti.filter(b => !evitati.some(x => x.id === b.id)));
      const nogos = evitati.map(o => ({lat: o.lat, lon: o.lon, r: 12}));
      const nuovo = await ricalcola(nogos).catch(() => null);
      const c = nuovo && nuovo.geojson && nuovo.geojson.features && nuovo.geojson.features[0]
        && nuovo.geojson.features[0].geometry.coordinates;
      if (!c || !c.length) break;
      auto = nuovo;
      try { lista = await ostacoli(c); } catch (e) { lista = (await daGeojson(c)) || []; fonte = 'GeoJSON competenze'; }
    }
    return {ostacoli: lista, evitati, auto, fonte, camion: {attivo: pref.attivo, h: pref.altezza, w: pref.larghezza}};
  }

  function descr(o) {
    return [o.h != null ? `h ${o.h} m` : '', o.w != null ? `l ${o.w} m` : ''].filter(Boolean).join(' · ') || 'misure non indicate';
  }
  function popup(o, stato) {
    return `<strong>${esc(o.tipo[0].toUpperCase() + o.tipo.slice(1))}</strong>${o.nome ? ' · ' + esc(o.nome) : ''}<br>${esc(descr(o))}`
      + (stato ? `<br><b>${esc(stato)}</b>` : '') + (o.allagabile ? '<br>⚠ Segnalato come allagabile' : '')
      + `<br><a href="https://www.openstreetmap.org/${esc(o.id)}" target="_blank" rel="noopener">Vedi su OSM</a>`;
  }
  function icona(colore, testo) {
    return L.divIcon({className: '', iconSize: [24, 24], iconAnchor: [12, 12],
      html: `<div style="width:24px;height:24px;border-radius:50%;background:${colore};border:2px solid #fff;display:flex;align-items:center;justify-content:center;font-size:12px;box-shadow:0 0 6px rgba(0,0,0,.6)">${testo}</div>`});
  }
  function disegna(ris, gruppo) {
    if (!ris) return;
    (ris.ostacoli || []).forEach(o => {
      const b = blocca(o);
      if (o.geom) L.polyline(o.geom, {color: b ? '#c8102e' : '#e0a800', weight: 9, opacity: .55, interactive: false}).addTo(gruppo);
      L.marker([o.lat, o.lon], {icon: icona(b ? '#c8102e' : '#e0a800', b ? '⛔' : '🚧'), zIndexOffset: 500, title: o.tipo})
        .bindPopup(popup(o, b ? `Il camion (h ${pref.altezza} m, l ${pref.larghezza} m) NON passa: nessuna alternativa trovata` : 'Sul percorso: verificare'))
        .addTo(gruppo);
    });
    (ris.evitati || []).forEach(o => {
      L.marker([o.lat, o.lon], {icon: icona('#5c6670', '✖'), title: 'Evitato'})
        .bindPopup(popup(o, `Evitato: troppo basso/stretto per il camion (h ${pref.altezza} m, l ${pref.larghezza} m)`)).addTo(gruppo);
    });
  }
  function righe(ris) {
    if (!ris) return [];
    if (ris.errore) return [`⚠️ ${ris.errore}`];
    const r = [], os = ris.ostacoli || [];
    const bloccanti = os.filter(blocca), senzaMisure = os.filter(o => o.h == null && o.w == null).length;
    if (os.length) r.push(`🚧 Sottopassi/limiti: ${os.length}` + (senzaMisure ? ` (${senzaMisure} senza misure)` : ''));
    else r.push('🚧 Nessun sottopasso');
    if (ris.evitati && ris.evitati.length) r.push(`✖ Evitati per il camion: ${ris.evitati.length}`);
    if (bloccanti.length) r.push(`⛔ NON passa: ${bloccanti.length} (vedi carta)`);
    if (ris.camion) r.push((ris.camion.attivo ? `🚒 h ${ris.camion.h} · l ${ris.camion.w} m` : '🚒 Camion spento') + (ris.fonte === 'OSM live' ? ' (test)' : ' (test, offline)'));
    return r;
  }

  NS.PercorsoCamion = {controlla, disegna, righe, ostacoli, _metri: metri};
})();
