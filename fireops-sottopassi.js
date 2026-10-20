/*!
 * FireOps VVF — fireops-sottopassi.js — sottopassi e limiti di altezza lungo un percorso
 *
 * I dati sono i GeoJSON db/competenze/<SIGLA>_sottopassi.geojson, prodotti dal calcolo
 * delle competenze (OpenStreetMap: sottopassi, gallerie, passaggi sotto edifici, coperture,
 * portali e sbarre di altezza). Si caricano alla prima richiesta e restano in memoria.
 *
 *   FireOpsSottopassi.sulPercorso(coords)  -> Promise<[{p, lat, lon}]>
 *     coords: [[lon, lat, ...], ...] del tratto percorso dal MEZZO
 *     p: properties del sottopasso (tipo, nome, altezza_m, critico, allagabile, osm, ...)
 *   FireOpsSottopassi.icona(p)   -> L.divIcon per la carta (serve Leaflet)
 *   FireOpsSottopassi.testo(p)   -> descrizione breve "sottopasso Via X h 2,8 m"
 *
 * Un sottopasso conta se il percorso ci passa DENTRO: entro 12 m e con la stessa
 * direzione (±35°). Così un ponte che il percorso attraversa sopra non viene segnalato.
 */
(function () {
  'use strict';
  if (window.FireOpsSottopassi) return;

  // cartella db/competenze/ rispetto a questo file (root del sito)
  var src = (document.currentScript && document.currentScript.src) || location.href;
  var BASE = src.replace(/[^/]*(\?.*)?$/, '') + 'db/competenze/';
  var dati = null;   // Promise<[feature]>

  function carica() {
    if (dati) return dati;
    dati = fetch(BASE + 'index.json', {cache: 'no-cache'})
      .then(function (r) { return r.json(); })
      .then(function (idx) {
        var sigle = Object.keys((idx && idx.province) || {});
        return Promise.all(sigle.map(function (s) {
          return fetch(BASE + encodeURIComponent(s) + '_sottopassi.geojson', {cache: 'no-cache'})
            .then(function (r) { return r.ok ? r.json() : {features: []}; })
            .then(function (g) {
              (g.features || []).forEach(function (f) { f.properties.altezza_mezzo_m = g.altezza_mezzo_m || 3.5; });
              return g.features || [];
            })
            .catch(function () { return []; });
        }));
      })
      .then(function (liste) { return [].concat.apply([], liste); })
      .catch(function (e) { console.warn('Sottopassi non disponibili', e); dati = null; return []; });
    return dati;
  }

  // piano locale in metri attorno a una latitudine
  function proiettore(lat0) {
    var kx = 111320 * Math.cos(lat0 * Math.PI / 180), ky = 110540;
    return function (lon, lat) { return [lon * kx, lat * ky]; };
  }
  function distSeg(p, a, b) {
    var dx = b[0] - a[0], dy = b[1] - a[1], l = dx * dx + dy * dy;
    var t = l ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l)) : 0;
    var x = a[0] + t * dx - p[0], y = a[1] + t * dy - p[1];
    return {d: Math.sqrt(x * x + y * y), dir: Math.atan2(dy, dx)};
  }
  function angolo(a, b) {   // differenza fra direzioni, senza verso (0..90°)
    var d = Math.abs(a - b) % Math.PI;
    if (d > Math.PI / 2) d = Math.PI - d;
    return d * 180 / Math.PI;
  }

  function sulPercorso(coords) {
    if (!coords || coords.length < 2) return Promise.resolve([]);
    return carica().then(function (feats) {
      var lat0 = coords[0][1], P = proiettore(lat0);
      var R = coords.map(function (c) { return P(c[0], c[1]); });
      var minx = Infinity, miny = Infinity, maxx = -Infinity, maxy = -Infinity;
      R.forEach(function (q) { minx = Math.min(minx, q[0]); maxx = Math.max(maxx, q[0]); miny = Math.min(miny, q[1]); maxy = Math.max(maxy, q[1]); });
      var M = 30;
      var vicino = function (q, conDir, dirF) {
        if (q[0] < minx - M || q[0] > maxx + M || q[1] < miny - M || q[1] > maxy + M) return false;
        for (var i = 0; i + 1 < R.length; i++) {
          var s = distSeg(q, R[i], R[i + 1]);
          if (s.d <= (conDir ? 12 : 10) && (!conDir || angolo(s.dir, dirF) <= 35)) return true;
        }
        return false;
      };
      var trovati = [];
      feats.forEach(function (f) {
        var g = f.geometry, ok = false, punto = null;
        if (g.type === 'Point') {
          var q = P(g.coordinates[0], g.coordinates[1]);
          ok = vicino(q, false);
          punto = g.coordinates;
        } else if (g.type === 'LineString') {
          var L2 = g.coordinates.map(function (c) { return P(c[0], c[1]); });
          for (var k = 0; k + 1 < L2.length && !ok; k++) {
            var dirF = Math.atan2(L2[k + 1][1] - L2[k][1], L2[k + 1][0] - L2[k][0]);
            var m = [(L2[k][0] + L2[k + 1][0]) / 2, (L2[k][1] + L2[k + 1][1]) / 2];
            if (vicino(L2[k], true, dirF) || vicino(m, true, dirF) || vicino(L2[k + 1], true, dirF)) {
              ok = true;
              var c0 = g.coordinates[k], c1 = g.coordinates[k + 1];
              punto = [(c0[0] + c1[0]) / 2, (c0[1] + c1[1]) / 2];
            }
          }
        }
        if (ok) trovati.push({p: f.properties, lat: punto[1], lon: punto[0]});
      });
      // in ordine di percorso: prima quello piu' vicino alla partenza
      var pos = function (t) {
        var q = P(t.lon, t.lat), best = 0, bd = Infinity;
        for (var i = 0; i < R.length; i++) { var d = Math.hypot(R[i][0] - q[0], R[i][1] - q[1]); if (d < bd) { bd = d; best = i; } }
        return best;
      };
      trovati.forEach(function (t) { t.ordine = pos(t); });
      trovati.sort(function (a, b) { return a.ordine - b.ordine; });
      return trovati;
    });
  }

  function testo(p) {
    var h = p.altezza_m != null ? ' h ' + String(p.altezza_m).replace('.', ',') + ' m' : ' (altezza non indicata)';
    return p.tipo + (p.nome ? ' ' + p.nome : '') + h + (p.critico ? ' — NON PASSA' : '') + (p.allagabile ? ' — allagabile' : '');
  }

  function icona(p) {
    var col = p.critico ? '#c8102e' : (p.altezza_m == null ? '#e8790c' : '#7b4bc4');
    var h = p.altezza_m != null ? String(p.altezza_m).replace('.', ',') : '?';
    return L.divIcon({className: '', iconSize: [34, 22], iconAnchor: [17, 11],
      html: '<div style="min-width:30px;height:20px;padding:0 4px;border-radius:4px;background:' + col +
        ';color:#fff;font:700 11px/20px system-ui,sans-serif;text-align:center;border:2px solid #fff;box-shadow:0 0 4px rgba(0,0,0,.6);white-space:nowrap">⛔' + h + '</div>'});
  }

  function popup(p) {
    var e = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]; }); };
    return '<b>' + e(p.tipo.charAt(0).toUpperCase() + p.tipo.slice(1)) + '</b>' + (p.nome ? ' · ' + e(p.nome) : '') + '<br>' +
      (p.altezza_m != null ? 'Altezza <b>' + e(p.altezza_m) + ' m</b>' + (p.critico ? ' — il mezzo (' + e(p.altezza_mezzo_m) + ' m) <b>NON passa</b>' : '')
        : 'Altezza non indicata: verificare') +
      (p.allagabile ? '<br>⚠ Allagabile' : '') + (p.lunghezza_m ? '<br>Lunghezza ' + e(p.lunghezza_m) + ' m' : '') +
      '<br><a href="' + e(p.osm) + '" target="_blank" rel="noopener">Vedi su OSM</a>';
  }

  window.FireOpsSottopassi = {sulPercorso: sulPercorso, icona: icona, popup: popup, testo: testo, carica: carica};
})();
