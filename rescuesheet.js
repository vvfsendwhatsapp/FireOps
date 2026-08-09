/* ============================================================
   rescuesheet.js — FireOps VVF
   Ricerca schede di soccorso (rescue sheet, ISO 17840)
   per marca / modello / anno di immatricolazione.

   Uso:
     <div id="rescuesheet"></div>
     <script src="rescuesheet.js"></script>
     <script>FireOps.RescueSheet.init('rescuesheet');</script>

   Nessuna dipendenza. Non ospita né copia PDF: costruisce
   query di ricerca e apre i risultati sui siti dei costruttori.
   ============================================================ */

(function (global) {
  'use strict';

  var NS = global.FireOps = global.FireOps || {};
  var STORAGE_KEY = 'fireops.rescuesheet';

  /* ---------- dati ---------- */

  var MARCHE = [
    // Diffuse in Italia
    'Abarth', 'Alfa Romeo', 'Audi', 'BMW', 'Citroën', 'Cupra', 'Dacia', 'DS',
    'Fiat', 'Fiat Professional', 'Ford', 'Honda', 'Hyundai', 'Jeep', 'Kia',
    'Lancia', 'Land Rover', 'Mazda', 'Mercedes-Benz', 'Mini', 'Mitsubishi',
    'Nissan', 'Opel', 'Peugeot', 'Renault', 'Seat', 'Škoda', 'Smart',
    'Subaru', 'Suzuki', 'Tesla', 'Toyota', 'Volkswagen', 'Volvo',

    // Meno frequenti ma presenti
    'Alpine', 'Aixam', 'Chevrolet', 'Chrysler', 'Dodge', 'Ferrari', 'Infiniti',
    'Isuzu', 'Jaguar', 'Lamborghini', 'Lexus', 'Ligier', 'Maserati',
    'Microcar', 'Porsche', 'SsangYong', 'SEVIC', 'Tata',

    // Marchi cinesi in crescita
    'Aiways', 'BYD', 'Chery', 'DFSK', 'DR', 'EVO', 'Forthing', 'GWM / Ora',
    'Jaecoo', 'Leapmotor', 'Lynk & Co', 'MG', 'Omoda', 'Polestar', 'Seres',
    'Sportequipe', 'Xpeng', 'Zeekr',

    // Storici ancora circolanti
    'Autobianchi', 'Daewoo', 'Daihatsu', 'Innocenti', 'Lada', 'Rover', 'Saab',
    'Talbot',

    // Veicoli pesanti, bus e commerciali
    'DAF', 'Iveco', 'Iveco Bus', 'MAN', 'Mercedes-Benz Trucks', 'Otokar',
    'Renault Trucks', 'Scania', 'Setra', 'Solaris', 'Volvo Trucks',

    // Due ruote e quadricicli
    'Aprilia', 'Ducati', 'Harley-Davidson', 'Kawasaki', 'KTM', 'Moto Guzzi',
    'Piaggio', 'Vespa', 'Yamaha'
  ];

  // Termini con cui le schede sono intitolate nei vari mercati.
  var TERMINI = [
    '"rescue sheet"',
    '"Rettungskarte"',
    '"Rettungsdatenblatt"',
    '"scheda di soccorso"',
    '"fiche de desincarceration"',
    '"emergency response guide"'
  ];

  // Portali e app indice. Nessuno di questi ospita copie: sono rimandi
  // ai siti dei costruttori o app ufficiali per soccorritori.
  var PORTALI = [
    { nome: 'Euro Rescue', url: 'https://rescue.euroncap.com/',
      nota: 'App web ufficiale Euro NCAP / CTIF' },
    { nome: 'TCS', url: 'https://www.tcs.ch/it/test-consigli/consigli/tutti-i-temi/schede-soccorso.php',
      nota: 'Indice in italiano, link per costruttore' },
    { nome: 'ADAC', url: 'https://www.adac.de/rund-ums-fahrzeug/unfall-schaden-panne/rettungskarte/',
      nota: 'Indice link per costruttore' },
    { nome: 'DEKRA', url: 'https://www.dekra.de/de/download-rettungskarte/',
      nota: 'Indice link per costruttore' }
  ];

  /* ---------- costruzione query ---------- */

  function elencoAnni(da, a) {
    var out = [];
    for (var y = da; y <= a; y++) out.push(y);
    return out.join(' OR ');
  }

  /**
   * @param {object} o
   * @param {string} o.marca
   * @param {string} o.modello
   * @param {number} [o.da]      primo anno della finestra
   * @param {number} [o.a]       ultimo anno della finestra
   * @param {boolean} [o.usaRange=true]  true = "2014..2018", false = "(2014 OR 2015 ...)"
   * @param {boolean} [o.soloPdf=true]
   */
  function costruisciQuery(o) {
    var p = [];
    var veicolo = [o.marca, o.modello].filter(Boolean).join(' ').trim();
    if (!veicolo) return '';

    p.push('"' + veicolo + '"');

    if (o.da && o.a) {
      p.push(o.usaRange === false
        ? '(' + elencoAnni(o.da, o.a) + ')'
        : o.da + '..' + o.a);
    }

    p.push('(' + TERMINI.join(' OR ') + ')');
    if (o.soloPdf !== false) p.push('filetype:pdf');

    return p.join(' ');
  }

  function urlGoogle(query) {
    return 'https://www.google.com/search?q=' + encodeURIComponent(query);
  }

  /* ---------- finestra anni ----------
     Una generazione comincia PRIMA dell'immatricolazione, mai dopo:
     finestra asimmetrica all'indietro.                              */

  function finestra(anno, ampiezza) {
    var oggi = new Date().getFullYear();
    return {
      da: Math.max(1990, anno - ampiezza),
      a: Math.min(oggi, anno + 1)
    };
  }

  /* ---------- stato ---------- */

  function leggiStato() {
    try { return JSON.parse(sessionStorage.getItem(STORAGE_KEY)) || {}; }
    catch (e) { return {}; }
  }

  function salvaStato(s) {
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(s)); }
    catch (e) { /* sessionStorage non disponibile: si prosegue senza */ }
  }

  /* ---------- stile ---------- */

  var CSS = [
    '.rs-wrap{display:flex;flex-direction:column;gap:1rem;max-width:46rem}',
    '.rs-griglia{display:grid;grid-template-columns:repeat(auto-fit,minmax(11rem,1fr));gap:.75rem}',
    '.rs-campo{display:flex;flex-direction:column;gap:.25rem}',
    '.rs-campo label{font-size:.8rem;font-weight:600;letter-spacing:.02em;opacity:.75}',
    '.rs-campo input,.rs-campo select{padding:.5rem .6rem;font:inherit;font-size:.95rem;',
    'border:1px solid var(--bordo,#c3c8d0);border-radius:.35rem;background:var(--sfondo-input,#fff);color:inherit}',
    '.rs-campo input:focus-visible,.rs-campo select:focus-visible,.rs-azioni button:focus-visible,',
    '.rs-portali a:focus-visible{outline:2px solid var(--accento,#c0392b);outline-offset:2px}',
    '.rs-azioni{display:flex;flex-wrap:wrap;gap:.5rem}',
    '.rs-azioni button{padding:.55rem .9rem;font:inherit;font-size:.9rem;font-weight:600;cursor:pointer;',
    'border:1px solid var(--bordo,#c3c8d0);border-radius:.35rem;background:var(--sfondo-input,#fff);color:inherit}',
    '.rs-azioni button:hover:not(:disabled){border-color:var(--accento,#c0392b)}',
    '.rs-azioni button:disabled{opacity:.45;cursor:not-allowed}',
    '.rs-azioni button.rs-primario{background:var(--accento,#c0392b);border-color:var(--accento,#c0392b);color:#fff}',
    '.rs-avviso{padding:.6rem .75rem;font-size:.85rem;line-height:1.45;border-radius:.35rem;',
    'border-left:3px solid var(--attenzione,#e08a1e);background:var(--sfondo-avviso,rgba(224,138,30,.1))}',
    '.rs-anteprima{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:.75rem;line-height:1.5;',
    'word-break:break-word;opacity:.7;padding:.5rem .6rem;border-radius:.35rem;background:var(--sfondo-alt,rgba(127,127,127,.08))}',
    '.rs-portali{display:flex;flex-wrap:wrap;gap:.5rem;align-items:center}',
    '.rs-portali span{font-size:.8rem;font-weight:600;opacity:.75}',
    '.rs-portali a{font-size:.85rem;padding:.35rem .6rem;border-radius:.35rem;text-decoration:none;color:inherit;',
    'border:1px solid var(--bordo,#c3c8d0)}',
    '.rs-portali a:hover{border-color:var(--accento,#c0392b)}',
    '.rs-riga-check{display:flex;align-items:center;gap:.4rem;font-size:.85rem;opacity:.8}',
    '@media (max-width:480px){.rs-azioni button{flex:1 1 100%}}'
  ].join('');

  function iniettaCss() {
    if (document.getElementById('rs-stile')) return;
    var s = document.createElement('style');
    s.id = 'rs-stile';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  /* ---------- markup ---------- */

  function markup() {
    var opzioni = MARCHE.map(function (m) {
      return '<option value="' + m + '"></option>';
    }).join('');

    return '' +
    '<div class="rs-wrap">' +
      '<div class="rs-avviso">' +
        'La ricerca restituisce <strong>risultati probabili</strong>, non la scheda certa del veicolo. ' +
        'Verificare modello, generazione e anno sul PDF prima di usarlo in intervento. ' +
        'Le schede vengono aggiornate dai costruttori: usare sempre il file scaricato dal sito ufficiale.' +
      '</div>' +

      '<div class="rs-griglia">' +
        '<div class="rs-campo">' +
          '<label for="rs-marca">Marca</label>' +
          '<input id="rs-marca" list="rs-marche" autocomplete="off" placeholder="es. Fiat">' +
          '<datalist id="rs-marche">' + opzioni + '</datalist>' +
        '</div>' +
        '<div class="rs-campo">' +
          '<label for="rs-modello">Modello</label>' +
          '<input id="rs-modello" autocomplete="off" placeholder="es. 500">' +
        '</div>' +
        '<div class="rs-campo">' +
          '<label for="rs-anno">Anno di immatricolazione</label>' +
          '<input id="rs-anno" type="number" min="1990" max="2100" inputmode="numeric" placeholder="es. 2018">' +
        '</div>' +
        '<div class="rs-campo">' +
          '<label for="rs-alim">Alimentazione</label>' +
          '<select id="rs-alim">' +
            '<option value="">Non specificata</option>' +
            '<option>Benzina</option><option>Gasolio</option>' +
            '<option>GPL</option><option>Metano</option>' +
            '<option>Ibrido</option><option>Ibrido plug-in</option>' +
            '<option>Elettrico</option><option>Idrogeno</option>' +
          '</select>' +
        '</div>' +
      '</div>' +

      '<div class="rs-azioni">' +
        '<button type="button" id="rs-cerca" class="rs-primario">Cerca</button>' +
        '<button type="button" id="rs-allarga">Allarga gli anni</button>' +
        '<button type="button" id="rs-senza">Cerca senza anni</button>' +
        '<button type="button" id="rs-pulisci">Svuota</button>' +
      '</div>' +

      '<label class="rs-riga-check">' +
        '<input type="checkbox" id="rs-or">' +
        'Elenca gli anni invece di usare l\'intervallo (se l\'operatore <code>..</code> non filtra)' +
      '</label>' +

      '<div class="rs-anteprima" id="rs-anteprima" aria-live="polite">' +
        'Inserisci marca e modello per comporre la ricerca.' +
      '</div>' +

      '<div class="rs-portali">' +
        '<span>Se la ricerca non trova nulla:</span>' +
        PORTALI.map(function (p) {
          return '<a href="' + p.url + '" target="_blank" rel="noopener noreferrer" title="' +
                 p.nota + '">' + p.nome + '</a>';
        }).join('') +
      '</div>' +
    '</div>';
  }

  /* ---------- init ---------- */

  function init(idContenitore) {
    var box = document.getElementById(idContenitore);
    if (!box) {
      console.warn('[rescuesheet] contenitore #' + idContenitore + ' non trovato');
      return;
    }

    iniettaCss();
    box.innerHTML = markup();

    var elMarca   = box.querySelector('#rs-marca');
    var elModello = box.querySelector('#rs-modello');
    var elAnno    = box.querySelector('#rs-anno');
    var elAlim    = box.querySelector('#rs-alim');
    var elOr      = box.querySelector('#rs-or');
    var elPrev    = box.querySelector('#rs-anteprima');
    var btnCerca  = box.querySelector('#rs-cerca');

    var AMPIEZZA_STRETTA = 4;
    var AMPIEZZA_LARGA  = 10;

    function valori() {
      return {
        marca:   elMarca.value.trim(),
        modello: elModello.value.trim(),
        anno:    parseInt(elAnno.value, 10) || null,
        alim:    elAlim.value,
        usaOr:   elOr.checked
      };
    }

    function query(modo) {
      var v = valori();
      var o = {
        marca: v.marca,
        modello: v.modello,
        usaRange: !v.usaOr
      };
      if (modo !== 'senza' && v.anno) {
        var f = finestra(v.anno, modo === 'larga' ? AMPIEZZA_LARGA : AMPIEZZA_STRETTA);
        o.da = f.da;
        o.a = f.a;
      }
      return costruisciQuery(o);
    }

    function aggiorna() {
      var v = valori();
      var q = query('stretta');

      btnCerca.disabled = !q;
      elPrev.textContent = q || 'Inserisci marca e modello per comporre la ricerca.';

      salvaStato(v);

      // Aggancio per la scheda procedurale (BEV, GPL, metano, idrogeno…)
      if (v.alim) {
        document.dispatchEvent(new CustomEvent('fireops:alimentazione', {
          detail: { alimentazione: v.alim, marca: v.marca, modello: v.modello }
        }));
      }
    }

    function apri(modo) {
      var q = query(modo);
      if (!q) { elMarca.focus(); return; }
      window.open(urlGoogle(q), '_blank', 'noopener');
    }

    ['input', 'change'].forEach(function (ev) {
      box.addEventListener(ev, aggiorna);
    });

    box.querySelector('#rs-cerca').addEventListener('click', function () { apri('stretta'); });
    box.querySelector('#rs-allarga').addEventListener('click', function () { apri('larga'); });
    box.querySelector('#rs-senza').addEventListener('click', function () { apri('senza'); });
    box.querySelector('#rs-pulisci').addEventListener('click', function () {
      elMarca.value = elModello.value = elAnno.value = '';
      elAlim.value = '';
      sessionStorage.removeItem(STORAGE_KEY);
      aggiorna();
      elMarca.focus();
    });

    // Invio in un campo qualsiasi = ricerca stretta
    box.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && e.target.tagName === 'INPUT') {
        e.preventDefault();
        apri('stretta');
      }
    });

    // Ripristino sessione
    var s = leggiStato();
    if (s.marca)   elMarca.value   = s.marca;
    if (s.modello) elModello.value = s.modello;
    if (s.anno)    elAnno.value    = s.anno;
    if (s.alim)    elAlim.value    = s.alim;
    if (s.usaOr)   elOr.checked    = true;

    aggiorna();
  }

  /* ---------- API pubblica ---------- */

  NS.RescueSheet = {
    init: init,
    costruisciQuery: costruisciQuery,
    urlGoogle: urlGoogle,
    finestra: finestra,
    MARCHE: MARCHE
  };

})(window);