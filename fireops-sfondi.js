/*!
 * FireOps VVF — fireops-sfondi.js — selettore sfondi condiviso dalle mappe
 *
 * Un pulsante 🗺 sulla carta apre un piccolo pannello:
 *   - Sfondo: OpenStreetMap, Satellite (con nomi di strade e località), OpenTopoMap;
 *   - In trasparenza: un secondo sfondo sopra il primo, con un cursore
 *     da trasparente a opaco (es. satellite che sfuma sulla topografica).
 * La scelta si ricorda nel browser e vale per tutte le mappe di FireOps:
 * è lo "sfondo predefinito" con cui si aprono.
 *
 * Uso:
 *   FireOpsSfondi.aggiungi(map, {
 *     sostituisci: [vecchioSfondo],   // sfondi propri del modulo da togliere
 *     imposta: chiave => {...},       // facoltativo: il modulo cambia lo sfondo da sé
 *     onCambio: chiave => {...},      // facoltativo: avviso dopo ogni cambio
 *     posizione: 'topright'
 *   });
 * Non serve Leaflet al caricamento del file: l'app lo carica solo quando
 * apre una mappa, quindi tutto ciò che usa L sta dentro aggiungi().
 */
(function () {
  'use strict';
  if (window.FireOpsSfondi) return;

  var ESRI = 'https://server.arcgisonline.com/ArcGIS/rest/services/';
  var CATALOGO = {
    osm: {nome: 'OpenStreetMap', breve: 'Stradale', icona: '🗺',
      url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      opz: {maxZoom: 19, attribution: '© OpenStreetMap'}},
    sat: {nome: 'Satellite', breve: 'Satellite', icona: '🛰', etichette: true,
      url: ESRI + 'World_Imagery/MapServer/tile/{z}/{y}/{x}',
      opz: {maxZoom: 19, attribution: 'Immagini © Esri, Maxar, Earthstar Geographics'}},
    topo: {nome: 'OpenTopoMap', breve: 'Topografica', icona: '⛰',
      url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
      opz: {maxZoom: 19, maxNativeZoom: 17, attribution: '© OpenStreetMap, SRTM · stile © OpenTopoMap (CC-BY-SA)'}}
  };
  var CHIAVI = ['osm', 'sat', 'topo'];
  var PREF = 'fireops-sfondi-v1';

  function leggi() {
    try { return JSON.parse(localStorage.getItem(PREF) || '{}') || {}; } catch (e) { return {}; }
  }
  function salva(p) {
    try { localStorage.setItem(PREF, JSON.stringify(p)); } catch (e) {}
  }

  function pannello(map, nome, z) {
    var p = map.getPane(nome) || map.createPane(nome);
    p.style.zIndex = z;
    p.style.pointerEvents = 'none';
    return p;
  }

  // strade con i nomi, località e confini sopra la foto satellitare
  function etichetteSat() {
    return ['World_Transportation', 'World_Boundaries_and_Places'].map(function (n) {
      return L.tileLayer(ESRI + 'Reference/' + n + '/MapServer/tile/{z}/{y}/{x}', {maxZoom: 19, pane: 'etichetteSat'});
    });
  }

  function crea(chiave, pane) {
    var c = CATALOGO[chiave];
    var o = {};
    for (var k in c.opz) o[k] = c.opz[k];
    if (pane) o.pane = pane;
    return L.tileLayer(c.url, o);
  }

  var CSS = '' +
    '.fos{background:#1b1f24;color:#e8eaed;border-radius:8px;box-shadow:0 2px 10px rgba(0,0,0,.45);font:13px/1.3 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}' +
    '.fos-btn{display:block;width:36px;height:36px;border:0;border-radius:8px;background:#1b1f24;color:#fff;font-size:19px;cursor:pointer;line-height:36px;text-align:center;padding:0}' +
    '.fos-pan{display:none;padding:10px 10px 8px;width:268px;max-width:calc(100vw - 70px)}' +
    '.fos.aperto .fos-btn{display:none}.fos.aperto .fos-pan{display:block}' +
    '.fos-tit{display:flex;align-items:center;justify-content:space-between;font-weight:700;margin-bottom:6px}' +
    '.fos-x{border:0;background:none;color:#aaa;font-size:20px;cursor:pointer;line-height:1;padding:0 2px}' +
    '.fos-lbl{font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:#9aa3ad;margin:8px 0 4px}' +
    '.fos-sc{display:flex;gap:4px}' +
    '.fos-sc button{flex:1;min-width:0;padding:7px 1px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;border:1px solid #3a414a;border-radius:6px;background:#262b31;color:#e8eaed;cursor:pointer;font-size:12px;line-height:1.15}' +
    '.fos-sc button b{display:block;font-size:15px;font-weight:400}' +
    '.fos-sc button.on{background:#c8102e;border-color:#c8102e;color:#fff}' +
    '.fos-sc button:disabled{opacity:.35;cursor:default}' +
    '.fos-cur{display:flex;align-items:center;gap:6px;margin-top:8px;font-size:11px;color:#9aa3ad}' +
    '.fos-cur input{flex:1;min-width:0;accent-color:#c8102e}' +
    '.fos-cur output{width:34px;text-align:right;color:#e8eaed;font-variant-numeric:tabular-nums}' +
    '.fos-cur.spento{opacity:.4}';

  function stile() {
    if (document.getElementById('fireops-sfondi-css')) return;
    var s = document.createElement('style');
    s.id = 'fireops-sfondi-css';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  function aggiungi(map, opz) {
    opz = opz || {};
    if (typeof L === 'undefined' || !map) return null;
    stile();
    pannello(map, 'fireopsSopra', 205);      // sopra le tile dello sfondo (200)
    pannello(map, 'etichetteSat', 250);      // scritte del satellite, sotto le geometrie (400)

    var pref = leggi();
    if (!pref.base) {   // scelta fatta con il vecchio selettore di Localizzati
      try { pref.base = {Stradale: 'osm', Topografica: 'topo', Satellite: 'sat'}[localStorage.getItem('fireops_basemap')]; } catch (e) {}
    }
    var stato = {
      base: CHIAVI.indexOf(pref.base) >= 0 ? pref.base : (opz.predefinito || 'osm'),
      sopra: CHIAVI.indexOf(pref.sopra) >= 0 ? pref.sopra : '',
      opacita: typeof pref.opacita === 'number' ? pref.opacita : 0.5
    };
    var proprio = typeof opz.imposta === 'function';   // il modulo gestisce lo sfondo da sé
    var lBase = null, lEtichette = [], lSopra = null;

    (opz.sostituisci || []).forEach(function (l) { if (l && map.hasLayer(l)) map.removeLayer(l); });

    function mettiBase(chiave) {
      if (proprio) { opz.imposta(chiave); return; }
      if (lBase) map.removeLayer(lBase);
      lEtichette.forEach(function (l) { map.removeLayer(l); });
      lEtichette = [];
      lBase = crea(chiave).addTo(map);
      lBase.bringToBack();
      if (CATALOGO[chiave].etichette) lEtichette = etichetteSat().map(function (l) { return l.addTo(map); });
    }
    function mettiSopra() {
      if (lSopra) { map.removeLayer(lSopra); lSopra = null; }
      if (stato.sopra && stato.sopra !== stato.base) {
        lSopra = crea(stato.sopra, 'fireopsSopra').addTo(map);
        lSopra.setOpacity(stato.opacita);
      }
    }

    // ---------------------------------------------------------------- pannello
    var Ctl = L.Control.extend({
      options: {position: opz.posizione || 'topright'},
      onAdd: function () {
        var box = L.DomUtil.create('div', 'fos leaflet-control');
        var bott = function (k, tipo) {
          var c = CATALOGO[k];
          return '<button type="button" data-' + tipo + '="' + k + '" title="' + c.nome + '"><b>' + c.icona + '</b>' + c.breve + '</button>';
        };
        box.innerHTML =
          '<button type="button" class="fos-btn" title="Sfondi della carta" aria-label="Sfondi della carta">🗺</button>' +
          '<div class="fos-pan">' +
            '<div class="fos-tit">Sfondi <button type="button" class="fos-x" aria-label="Chiudi">×</button></div>' +
            '<div class="fos-lbl">Sfondo</div>' +
            '<div class="fos-sc fos-base">' + CHIAVI.map(function (k) { return bott(k, 'b'); }).join('') + '</div>' +
            '<div class="fos-lbl">In trasparenza sopra</div>' +
            '<div class="fos-sc fos-sopra"><button type="button" data-s=""><b>∅</b>Nessuno</button>' +
              CHIAVI.map(function (k) { return bott(k, 's'); }).join('') + '</div>' +
            '<label class="fos-cur"><span>Trasparente</span><input type="range" min="0" max="100" step="5"><span>Opaco</span><output></output></label>' +
          '</div>';
        L.DomEvent.disableClickPropagation(box);
        L.DomEvent.disableScrollPropagation(box);
        var cur = box.querySelector('input'), out = box.querySelector('output');

        function aggiorna() {
          box.querySelectorAll('[data-b]').forEach(function (b) { b.classList.toggle('on', b.dataset.b === stato.base); });
          box.querySelectorAll('[data-s]').forEach(function (b) {
            b.classList.toggle('on', b.dataset.s === (stato.sopra === stato.base ? '' : stato.sopra));
            b.disabled = !!b.dataset.s && b.dataset.s === stato.base;
          });
          cur.value = Math.round(stato.opacita * 100);
          out.textContent = cur.value + '%';
          box.querySelector('.fos-cur').classList.toggle('spento', !lSopra);
          cur.disabled = !lSopra;
        }
        box.addEventListener('click', function (e) {
          var t = e.target.closest('button');
          if (!t) return;
          if (t.classList.contains('fos-btn')) { box.classList.add('aperto'); return; }
          if (t.classList.contains('fos-x')) { box.classList.remove('aperto'); return; }
          if (t.dataset.b !== undefined) api.imposta(t.dataset.b);
          else if (t.dataset.s !== undefined) api.sopra(t.dataset.s);
        });
        cur.addEventListener('input', function () { api.opacita(cur.value / 100); });
        // tocco sulla carta: il pannello si chiude
        map.on('click', function () { box.classList.remove('aperto'); });
        this._aggiorna = aggiorna;
        aggiorna();
        return box;
      }
    });
    var ctl = new Ctl();

    var api = {
      sfondo: function () { return stato.base; },
      imposta: function (chiave) {
        if (CHIAVI.indexOf(chiave) < 0) return;
        stato.base = chiave;
        mettiBase(chiave);
        mettiSopra();                       // lo stesso sfondo sopra e sotto non ha senso
        salva(stato);
        if (ctl._aggiorna) ctl._aggiorna();
        if (opz.onCambio) opz.onCambio(chiave);
      },
      sopra: function (chiave) {
        stato.sopra = CHIAVI.indexOf(chiave) >= 0 ? chiave : '';
        mettiSopra();
        salva(stato);
        if (ctl._aggiorna) ctl._aggiorna();
      },
      opacita: function (v) {
        stato.opacita = Math.max(0, Math.min(1, +v || 0));
        if (lSopra) lSopra.setOpacity(stato.opacita);
        salva(stato);
        if (ctl._aggiorna) ctl._aggiorna();
      },
      controllo: ctl
    };

    mettiBase(stato.base);
    mettiSopra();
    ctl.addTo(map);
    if (opz.onCambio) opz.onCambio(stato.base);
    return api;
  }

  window.FireOpsSfondi = {aggiungi: aggiungi, crea: crea, CATALOGO: CATALOGO, CHIAVI: CHIAVI};
})();
