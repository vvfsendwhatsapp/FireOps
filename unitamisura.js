/* ==========================================================================
   FireOps VVF — Convertitore unità di misura
   Modulo a istanze indipendenti: lo stesso convertitore può essere aperto
   contemporaneamente nei due pannelli senza che le istanze si disturbino.

   Uso:
     <div class="um-root" data-unitamisura></div>
     → l'auto-init lo aggancia da solo al caricamento della pagina
     oppure, manualmente:  FireOpsUnitaMisura.init(elemento);

   Il database delle unità sta in unitamisura.json (percorso configurabile
   qui sotto) e viene scaricato una sola volta, condiviso fra le istanze.
   ========================================================================== */
window.FireOpsUnitaMisura = (function(){
"use strict";

/* percorso del JSON — modificare se il file sta in una sottocartella */
var DATA_URL = '/FireOps/db/unitamisura.json';

/* ---------- database condiviso (una sola fetch per tutte le istanze) ---------- */
var dbPromise = null;
function loadDB(){
  if(!dbPromise){
    dbPromise = (window.FireOps && FireOps.caricaJson)
      ? FireOps.caricaJson(DATA_URL)
      : fetch(DATA_URL).then(function(r){
          if(!r.ok) throw new Error('HTTP ' + r.status);
          return r.json();
        });
  }
  return dbPromise;
}

/* ---------- utility ---------- */
function num(v){
  if(typeof v !== 'string') return v;
  v = v.trim().replace(/\s/g,'').replace(',','.');
  if(v === '' || v === '-' || v === '.') return NaN;
  return Number(v);
}
function fmt(x, prec){
  if(x === null || x === undefined || Number.isNaN(x)) return '—';
  if(!isFinite(x)) return (x > 0 ? '∞' : '−∞');
  if(x === 0) return '0';
  var a = Math.abs(x);
  if(a >= 1e13 || a < 1e-6) return x.toExponential(6);
  var s = x.toPrecision(prec || 12);
  if(s.indexOf('e') > -1) return x.toExponential(6);
  if(s.indexOf('.') > -1) s = s.replace(/0+$/,'').replace(/\.$/,'');
  return s;
}
function esc(s){
  return String(s).replace(/[&<>"]/g, function(c){
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];
  });
}
function el(html){ var d = document.createElement('div'); d.innerHTML = html.trim(); return d.firstElementChild; }

/* ---------- toast unico, agganciato al body ---------- */
var toastEl = null;
function toast(){
  if(!toastEl){
    toastEl = document.createElement('div');
    toastEl.className = 'um-toast';
    toastEl.textContent = 'Copiato';
    document.body.appendChild(toastEl);
  }
  toastEl.classList.add('on');
  setTimeout(function(){ toastEl.classList.remove('on'); }, 1100);
}
function copia(txt){
  if(!txt) return;
  if(navigator.clipboard && window.isSecureContext){
    navigator.clipboard.writeText(txt).then(toast, toast);
  } else {
    var ta = document.createElement('textarea');
    ta.value = txt; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    try{ document.execCommand('copy'); }catch(e){}
    document.body.removeChild(ta); toast();
  }
}

/* ==========================================================================
   ISTANZA
   ========================================================================== */
function init(root){
  if(!root || root.dataset.umInit === '1') return;
  root.dataset.umInit = '1';
  root.classList.add('um-root');

  root.innerHTML =
    '<label class="um-lab">Categoria da consultare</label>'+
    '<div class="combo-wrapper um-combo">'+
      '<input type="text" class="combo-input um-cerca" autocomplete="off" '+
        'placeholder="Cerca categoria, unità o simbolo (es. psi, L/min)…">'+
      '<input type="hidden" class="um-cat-val">'+
      '<span class="combo-arrow" aria-hidden="true"></span>'+
      '<div class="combo-dropdown um-cat-dd"></div>'+
    '</div>'+
    '<div class="um-panel"><div class="um-empty">Caricamento del database unità…</div></div>';

  var DOM = {
    cerca : root.querySelector('.um-cerca'),
    val   : root.querySelector('.um-cat-val'),
    dd    : root.querySelector('.um-cat-dd'),
    panel : root.querySelector('.um-panel')
  };

  var DB = null, cur = null;

  /* copia sul click di qualsiasi elemento con data-copy, limitata a questa istanza */
  root.addEventListener('click', function(e){
    var t = e.target.closest('[data-copy]');
    if(t && root.contains(t)) copia(t.dataset.copy || t.textContent.trim());
  });

  /* layout stretto: riconosciuto sulla larghezza del pannello, non della finestra */
  if(window.ResizeObserver){
    new ResizeObserver(function(entries){
      root.classList.toggle('narrow', entries[0].contentRect.width < 560);
    }).observe(root);
  }

  // Testo digitato prima della scelta: serve a riaprire la categoria
  // posizionandosi già sull'unità cercata (digiti "psi" → Pressione con psi
  // selezionato come "Da"). Il combo azzera il campo alla selezione, quindi
  // il valore va intercettato prima.
  var testoDigitato = '';

  function testoRicercabile(c){
    var parti = [c.nome];
    (c.unita || []).forEach(function(u){ parti.push(u.n, u.s); });
    return parti.join(' ');
  }

  function indiceUnitaCercata(c){
    if(!testoDigitato || !c.unita) return -1;
    var i = c.unita.findIndex(function(u){
      return u.s.toLowerCase() === testoDigitato || u.n.toLowerCase() === testoDigitato;
    });
    if(i > -1) return i;
    return c.unita.findIndex(function(u){
      return u.s.toLowerCase().indexOf(testoDigitato) === 0 || u.n.toLowerCase().indexOf(testoDigitato) === 0;
    });
  }

  loadDB().then(function(d){
    DB = d;

    DOM.cerca.addEventListener('input', function(){
      testoDigitato = DOM.cerca.value.trim().toLowerCase();
    });

    FireOps.creaCombo({
      input: DOM.cerca,
      hidden: DOM.val,
      dropdown: DOM.dd,
      elenco: DB.categorie,
      cercaValore: function(c){ return c.id; },
      mostraTesto: function(c){ return c.nome; },
      testoRicerca: testoRicercabile,
      testoSelezionato: function(c){ return c.nome; },
      placeholderOpzione: '-- Seleziona una categoria --',
      onScelta: function(c){
        var i = indiceUnitaCercata(c);
        apri(c.id, i > -1 ? i : undefined);
        testoDigitato = '';
      }
    });

    apri(DB.categorie[0].id);
  }).catch(function(err){
    DOM.panel.innerHTML = '<div class="um-nota">Impossibile caricare <b>' + esc(DATA_URL) + '</b>. '+
      'Verifica che il file sia presente e che la pagina sia servita via HTTP (GitHub Pages o '+
      '<code>python -m http.server</code>), non aperta con doppio clic.</div>';
    console.error('[UnitaMisura]', err);
  });

  function apri(id, unitaIdx){
    cur = DB.categorie.filter(function(c){ return c.id === id; })[0];
    if(!cur) return;
    // Assegnazione diretta, non combo.impostaValore(): quello richiamerebbe
    // onScelta, che richiama apri() — ricorsione infinita.
    if(DOM.cerca) DOM.cerca.value = cur.nome;
    if(DOM.val)   DOM.val.value = cur.id;
    DOM.panel.innerHTML =
      '<div class="um-panel-head">'+
        '<h3 class="um-title">' + esc(cur.nome) + '</h3>' +
        (cur.base ? '<div class="um-base">unità di riferimento: ' + esc(cur.base) + '</div>' : '') +
      '</div>' +
      (cur.nota ? '<div class="um-nota">' + esc(cur.nota) + '</div>' : '') +
      '<div class="um-body"></div>';
    var B = DOM.panel.querySelector('.um-body');
    switch(cur.tipo){
      case 'trig':        viewTrig(B); break;
      case 'temperatura': viewTemp(B); break;
      case 'basi':        viewBasi(B); break;
      case 'cerchio':     viewCerchio(B); break;
      case 'prefissi':    viewPrefissi(B); break;
      case 'alfabeto':    viewAlfabeto(B); break;
      default:            viewFattore(B, unitaIdx);
    }
    DOM.panel.scrollTop = 0;
  }

  function card(k, v, na){
    return '<div class="um-card' + (na ? ' na' : '') + '"><div class="k">' + k +
           '</div><div class="v" data-copy="' + esc(v) + '">' + esc(v) + '</div></div>';
  }

  /* ---------- 1. conversione per fattore ---------- */
  function viewFattore(B, preIdx){
    var u = cur.unita;
    var iDa = (preIdx !== undefined && preIdx !== null && preIdx > -1) ? preIdx : 0;

    B.innerHTML =
     '<div class="um-io um-io-singolo">'+
       '<div class="um-field"><label>Valore</label>'+
         '<input class="f-in" type="text" inputmode="decimal" value="1"></div>'+
       '<div class="um-field"><label>Unità di partenza</label><select class="f-uin">'+
         u.map(function(x,j){
           return '<option value="'+j+'"'+(j===iDa?' selected':'')+'>'+esc(x.n)+' ('+esc(x.s)+')</option>';
         }).join('')+
       '</select></div>'+
     '</div>'+
     '<div class="um-quick"></div>'+
     '<div class="um-tbl"><table><thead><tr><th>Unità</th><th>Simbolo</th>'+
       '<th style="text-align:right">Valore</th></tr></thead><tbody></tbody></table></div>';

    var vIn = B.querySelector('.f-in'),
        uIn = B.querySelector('.f-uin'),
        tb  = B.querySelector('tbody'),
        quick = B.querySelector('.um-quick');

    [1,10,100,1000].forEach(function(n){
      var b = el('<button type="button">'+n+'</button>');
      b.onclick = function(){ vIn.value = n; calc(); };
      quick.appendChild(b);
    });

    function calc(){
      var v = num(vIn.value);
      var base = v * u[+uIn.value].f;
      tb.innerHTML = u.map(function(x,j){
        var val = Number.isNaN(v) ? '' : fmt(base / x.f);
        // La riga dell'unità di partenza è evidenziata: serve a ritrovare a
        // colpo d'occhio da dove si sta convertendo in un elenco lungo.
        return '<tr class="'+(j == uIn.value ? 'hi' : '')+'">'+
               '<td>'+esc(x.n)+'</td><td class="sym">'+esc(x.s)+'</td>'+
               '<td class="val" data-copy="'+val+'">'+(val || '—')+'</td></tr>';
      }).join('');
    }

    vIn.addEventListener('input', calc);
    uIn.addEventListener('change', calc);

    // Clic su una riga (fuori dalla colonna dei valori): quella unità diventa
    // la partenza, portandosi dietro il proprio valore convertito. I numeri a
    // schermo non cambiano — cambia solo da quale unità si sta partendo.
    tb.addEventListener('click', function(e){
      if(e.target.classList.contains('val')) return; // lì il clic copia
      var tr = e.target.closest('tr'); if(!tr) return;
      var j = Array.prototype.indexOf.call(tb.children, tr);
      if(j < 0) return;
      var v = num(vIn.value);
      if(!Number.isNaN(v)) vIn.value = fmt(v * u[+uIn.value].f / u[j].f);
      uIn.value = j;
      calc();
    });

    calc();
  }

  /* ---------- 2. trigonometria ---------- */
  function viewTrig(B){
    var toRad = { gradi: Math.PI/180, radianti: 1, gon: Math.PI/200, mil: 2*Math.PI/6400 };
    B.innerHTML =
     '<div class="um-row">'+
       '<div class="um-field"><label>Angolo</label><input class="f-ang" type="text" inputmode="decimal" value="30"></div>'+
       '<div class="um-field"><label>Unità</label><select class="f-angu">'+
         '<option value="gradi">Gradi (°)</option><option value="radianti">Radianti (rad)</option>'+
         '<option value="gon">Gradi centesimali (gon)</option><option value="mil">Millesimi NATO (mil)</option>'+
       '</select></div>'+
     '</div>'+
     '<div class="um-grid f-gt"></div>'+
     '<div class="um-sect"><h4>Funzioni inverse — da valore ad angolo</h4>'+
       '<div class="um-row"><div class="um-field"><label>Valore</label><input class="f-inv" type="text" inputmode="decimal" value="0.5"></div></div>'+
       '<div class="um-grid f-gi"></div>'+
     '</div>';

    var ang = B.querySelector('.f-ang'), angU = B.querySelector('.f-angu'),
        gT = B.querySelector('.f-gt'), inv = B.querySelector('.f-inv'), gI = B.querySelector('.f-gi');

    function calcT(){
      var a = num(ang.value);
      if(Number.isNaN(a)){ gT.innerHTML = '<div class="um-empty">Inserisci un angolo valido.</div>'; return; }
      var r = a * toRad[angU.value], s = Math.sin(r), c = Math.cos(r);
      var z = function(x){ return Math.abs(x) < 1e-12; };
      var t   = z(c) ? null : s/c,
          ct  = z(s) ? null : c/s,
          sec = z(c) ? null : 1/c,
          csc = z(s) ? null : 1/s;
      var q = function(x){ return x === null ? 'non definito' : fmt(x,10); };
      gT.innerHTML =
        card('sin', fmt(s,10)) + card('cos', fmt(c,10)) +
        card('tan', q(t), t===null) + card('cot', q(ct), ct===null) +
        card('sec', q(sec), sec===null) + card('cosec', q(csc), csc===null) +
        card('Angolo in radianti', fmt(r,10)) +
        card('Angolo in gradi', fmt(r*180/Math.PI,10)) +
        card('Angolo in gon', fmt(r*200/Math.PI,10)) +
        card('Angolo in mil NATO', fmt(r*6400/(2*Math.PI),10));
    }
    function calcI(){
      var x = num(inv.value);
      if(Number.isNaN(x)){ gI.innerHTML = '<div class="um-empty">Inserisci un valore valido.</div>'; return; }
      var D = 180/Math.PI, dom = Math.abs(x) <= 1, dom2 = Math.abs(x) >= 1;
      var asin = dom ? Math.asin(x) : null,
          acos = dom ? Math.acos(x) : null,
          atan = Math.atan(x),
          acot = Math.PI/2 - Math.atan(x),
          asec = dom2 ? Math.acos(1/x) : null,
          acsc = dom2 ? Math.asin(1/x) : null;
      var g = function(v){ return v === null ? 'fuori dominio' : fmt(v*D,10) + '°'; };
      var r = function(v){ return v === null ? 'fuori dominio' : fmt(v,10); };
      gI.innerHTML =
        card('arcsin (°)', g(asin), asin===null)   + card('arcsin (rad)', r(asin), asin===null) +
        card('arccos (°)', g(acos), acos===null)   + card('arccos (rad)', r(acos), acos===null) +
        card('arctan (°)', g(atan))                + card('arctan (rad)', r(atan)) +
        card('arccot (°)', g(acot))                + card('arccot (rad)', r(acot)) +
        card('arcsec (°)', g(asec), asec===null)   + card('arcsec (rad)', r(asec), asec===null) +
        card('arccosec (°)', g(acsc), acsc===null) + card('arccosec (rad)', r(acsc), acsc===null);
    }
    ang.addEventListener('input', calcT);
    angU.addEventListener('change', calcT);
    inv.addEventListener('input', calcI);
    calcT(); calcI();
  }

  /* ---------- 2b. temperatura (conversione affine) ---------- */
  function viewTemp(B){
    var u = cur.unita;                       /* °C = v*k + o */
    var toC   = function(v,x){ return v * x.k + x.o; };
    var fromC = function(c,x){ return (c - x.o) / x.k; };
    function opts(i){
      return u.map(function(x,j){
        return '<option value="'+j+'"'+(j===i?' selected':'')+'>'+esc(x.n)+' ('+esc(x.s)+')</option>';
      }).join('');
    }
    B.innerHTML =
     '<div class="um-io um-io-singolo">'+
       '<div class="um-field"><label>Valore</label>'+
         '<input class="f-in" type="text" inputmode="decimal" value="20"></div>'+
       '<div class="um-field"><label>Scala di partenza</label><select class="f-uin">'+opts(0)+'</select></div>'+
     '</div>'+
     '<div class="um-quick"></div>'+
     '<div class="um-tbl"><table><thead><tr><th>Scala</th><th>Simbolo</th>'+
       '<th style="text-align:right">Valore</th></tr></thead><tbody></tbody></table></div>'+
     '<div class="um-sect"><h4>Punti di riferimento (valori indicativi)</h4>'+
       '<div class="um-tbl" style="max-height:32vh"><table><thead><tr><th>Riferimento</th>'+
         '<th style="text-align:right">°C</th><th style="text-align:right">°F</th>'+
         '<th style="text-align:right">K</th></tr></thead><tbody class="f-rif"></tbody></table></div>'+
     '</div>';

    var tIn = B.querySelector('.f-in'), tU = B.querySelector('.f-uin'),
        tb = B.querySelector('tbody'), quick = B.querySelector('.um-quick');

    [['0 °C',0],['20 °C',20],['37 °C',37],['100 °C',100],['600 °C',600]].forEach(function(p){
      var b = el('<button type="button">'+p[0]+'</button>');
      b.onclick = function(){ tU.value = 0; tIn.value = p[1]; calc(); };
      quick.appendChild(b);
    });

    function calc(){
      var v = num(tIn.value);
      var c = Number.isNaN(v) ? NaN : toC(v, u[+tU.value]);
      tb.innerHTML = u.map(function(x,j){
        var val = Number.isNaN(c) ? '' : fmt(fromC(c,x), 10);
        return '<tr class="'+(j == tU.value ? 'hi' : '')+'">'+
               '<td>'+esc(x.n)+'</td><td class="sym">'+esc(x.s)+'</td>'+
               '<td class="val" data-copy="'+val+'">'+(val || '—')+'</td></tr>';
      }).join('');
    }

    tIn.addEventListener('input', calc);
    tU.addEventListener('change', calc);

    tb.addEventListener('click', function(e){
      if(e.target.classList.contains('val')) return;
      var tr = e.target.closest('tr'); if(!tr) return;
      var j = Array.prototype.indexOf.call(tb.children, tr);
      if(j < 0) return;
      var v = num(tIn.value);
      // Conversione affine: si passa comunque per i °C, non si può moltiplicare
      if(!Number.isNaN(v)) tIn.value = fmt(fromC(toC(v, u[+tU.value]), u[j]), 10);
      tU.value = j;
      calc();
    });

    B.querySelector('.f-rif').innerHTML = (cur.riferimenti || []).slice()
      .sort(function(a,b){ return a.v - b.v; })
      .map(function(r){
        return '<tr><td>'+esc(r.d)+'</td>'+
               '<td class="val" data-copy="'+r.v+'">'+fmt(r.v,8)+'</td>'+
               '<td class="val" data-copy="'+(r.v*9/5+32)+'">'+fmt(r.v*9/5+32,8)+'</td>'+
               '<td class="val" data-copy="'+(r.v+273.15)+'">'+fmt(r.v+273.15,8)+'</td></tr>';
      }).join('');
    calc();
  }

  /* ---------- 3. hex / dec / bin ---------- */
  function viewBasi(B){
    B.innerHTML =
     '<div class="um-row">'+
       '<div class="um-field"><label>Binario (base 2)</label><input class="f-b2" type="text" value="11111111" autocomplete="off"></div>'+
       '<div class="um-field"><label>Ottale (base 8)</label><input class="f-b8" type="text" value="377" autocomplete="off"></div>'+
       '<div class="um-field"><label>Decimale (base 10)</label><input class="f-b10" type="text" value="255" autocomplete="off"></div>'+
       '<div class="um-field"><label>Esadecimale (base 16)</label><input class="f-b16" type="text" value="FF" autocomplete="off"></div>'+
     '</div>'+
     '<div class="um-grid f-gb"></div>';

    var f = { 2:B.querySelector('.f-b2'), 8:B.querySelector('.f-b8'), 10:B.querySelector('.f-b10'), 16:B.querySelector('.f-b16') };
    var gB = B.querySelector('.f-gb');
    var ok = { 2:/^[01]*$/, 8:/^[0-7]*$/, 10:/^[0-9]*$/, 16:/^[0-9a-fA-F]*$/ };

    function agg(n, src){
      for(var b in f){ if(+b !== src) f[b].value = n.toString(+b).toUpperCase(); }
      var bin = n.toString(2);
      var pad = bin.padStart(Math.ceil(bin.length/8)*8, '0');
      var grup = pad.match(/.{1,8}/g).join(' ');
      var car = (n >= 32 && n <= 126) ? String.fromCharCode(n) : '—';
      gB.innerHTML =
        card('Byte (8 bit)', grup) +
        card('Bit necessari', bin.length) +
        card('Byte necessari', Math.ceil(bin.length/8)) +
        card('Carattere ASCII', car) +
        card('Notazione C/hex', '0x' + n.toString(16).toUpperCase()) +
        card('Base 36', n.toString(36).toUpperCase());
    }
    Object.keys(f).forEach(function(b){
      var base = +b;
      f[b].addEventListener('input', function(){
        var v = f[b].value.trim().replace(/\s/g,'');
        if(base === 16) v = v.replace(/^0[xX]/,'');
        if(base === 2)  v = v.replace(/^0[bB]/,'');
        if(!ok[base].test(v)){ f[b].style.borderColor = 'var(--um-rosso)'; return; }
        f[b].style.borderColor = '';
        if(v === ''){ gB.innerHTML = ''; return; }
        var n = parseInt(v, base);
        if(!Number.isSafeInteger(n)){ gB.innerHTML = '<div class="um-empty">Numero troppo grande (oltre 2⁵³).</div>'; return; }
        agg(n, base);
      });
    });
    agg(255, 10);
  }

  /* ---------- 4. cerchio / sfera ---------- */
  function viewCerchio(B){
    var campi = [['r','Raggio (u)'],['d','Diametro (u)'],['C','Circonferenza (u)'],
                 ['A','Area cerchio (u²)'],['S','Superficie sfera (u²)'],['V','Volume sfera (u³)']];
    B.innerHTML = '<div class="um-row">' + campi.map(function(p){
        return '<div class="um-field"><label>'+p[1]+'</label><input class="c-'+p[0]+'" type="text" inputmode="decimal" autocomplete="off"></div>';
      }).join('') + '</div>' +
      '<div class="um-quick"><button type="button" class="f-clear">Pulisci tutto</button></div>';

    var I = {}, P = Math.PI;
    campi.forEach(function(p){ I[p[0]] = B.querySelector('.c-'+p[0]); });

    function raggioDa(k,v){
      switch(k){
        case 'r': return v;
        case 'd': return v/2;
        case 'C': return v/(2*P);
        case 'A': return v < 0 ? NaN : Math.sqrt(v/P);
        case 'S': return v < 0 ? NaN : Math.sqrt(v/(4*P));
        case 'V': return Math.cbrt(v*3/(4*P));
      }
    }
    function agg(src){
      var v = num(I[src].value);
      if(Number.isNaN(v)){ campi.forEach(function(p){ if(p[0] !== src) I[p[0]].value = ''; }); return; }
      var r = raggioDa(src, v);
      if(Number.isNaN(r)) return;
      var out = { r:r, d:2*r, C:2*P*r, A:P*r*r, S:4*P*r*r, V:4/3*P*r*r*r };
      campi.forEach(function(p){ if(p[0] !== src) I[p[0]].value = fmt(out[p[0]]); });
    }
    campi.forEach(function(p){ I[p[0]].addEventListener('input', function(){ agg(p[0]); }); });
    B.querySelector('.f-clear').onclick = function(){ campi.forEach(function(p){ I[p[0]].value = ''; }); };
    I.r.value = '1'; agg('r');
  }

  /* ---------- 5. prefissi SI ---------- */
  function viewPrefissi(B){
    var P = cur.dati;
    function opts(i){
      return P.map(function(p,j){
        return '<option value="'+j+'"'+(j===i?' selected':'')+'>'+esc(p.nome)+' ('+esc(p.simbolo)+') '+esc(p.potenza)+'</option>';
      }).join('');
    }
    var iK = P.findIndex(function(x){ return x.fattore === 1000; });
    var i1 = P.findIndex(function(x){ return x.fattore === 1; });
    B.innerHTML =
     '<div class="um-io">'+
       '<div class="um-field"><label>Da</label><input class="f-in" type="text" inputmode="decimal" value="1"><select class="f-uin">'+opts(iK)+'</select></div>'+
       '<button type="button" class="um-swap" title="Inverti">⇄</button>'+
       '<div class="um-field"><label>A</label><input class="f-out" type="text" readonly><select class="f-uout">'+opts(i1)+'</select></div>'+
     '</div>'+
     '<div class="um-tbl"><table><thead><tr><th>Prefisso</th><th>Simbolo</th><th>Potenza</th><th style="text-align:right">Fattore</th></tr></thead><tbody>'+
       P.map(function(p){
         var f = (p.fattore >= 1e-4 && p.fattore < 1e5) ? p.fattore.toLocaleString('it-IT') : p.fattore.toExponential();
         return '<tr><td>'+esc(p.nome)+'</td><td class="sym">'+esc(p.simbolo)+'</td><td class="mono">'+esc(p.potenza)+'</td>'+
                '<td class="val" data-copy="'+p.fattore+'">'+f+'</td></tr>';
       }).join('')+
     '</tbody></table></div>';

    var pv = B.querySelector('.f-in'), pDa = B.querySelector('.f-uin'),
        pr = B.querySelector('.f-out'), pA = B.querySelector('.f-uout');
    function calc(){
      var v = num(pv.value);
      pr.value = Number.isNaN(v) ? '' : fmt(v * P[+pDa.value].fattore / P[+pA.value].fattore);
      pr.dataset.copy = pr.value;
    }
    pv.addEventListener('input', calc);
    pDa.addEventListener('change', calc);
    pA.addEventListener('change', calc);
    B.querySelector('.um-swap').onclick = function(){
      var a = pDa.value; pDa.value = pA.value; pA.value = a;
      if(pr.value) pv.value = pr.value;
      calc();
    };
    calc();
  }

  /* ---------- 6. alfabeto fonetico + morse ---------- */
  function viewAlfabeto(B){
    var A = cur.dati;
    B.innerHTML =
     '<div class="um-sect first"><h4>Compitazione — scrivi un testo</h4>'+
       '<textarea class="f-txt" placeholder="Es. AB 123 CD">VVF</textarea>'+
       '<div class="um-grid">'+
         '<div class="um-card wide"><div class="k">Fonetico ICAO</div><div class="v f-icao"></div></div>'+
         '<div class="um-card wide"><div class="k">Compitazione italiana</div><div class="v f-ita"></div></div>'+
         '<div class="um-card wide"><div class="k">Morse</div><div class="v um-morse f-morse"></div></div>'+
       '</div>'+
     '</div>'+
     '<div class="um-sect"><h4>Tabella</h4>'+
       '<div class="um-tbl"><table><thead><tr><th>Car.</th><th>Morse</th><th>Codice ICAO</th><th>Pronuncia ICAO</th><th>Italiano</th></tr></thead><tbody>'+
         A.map(function(x){
           return '<tr><td class="mono" style="color:var(--um-rosso2);font-weight:700">'+esc(x.lettera)+'</td>'+
                  '<td class="mono" style="color:var(--um-giallo);letter-spacing:2px">'+esc(x.morse)+'</td>'+
                  '<td>'+esc(x.icao)+'</td><td class="sym">'+esc(x.pronuncia || '—')+'</td><td>'+esc(x.italiano)+'</td></tr>';
         }).join('')+
       '</tbody></table></div></div>';

    var map = {}; A.forEach(function(x){ map[x.lettera] = x; });
    var txt = B.querySelector('.f-txt');
    var oI = B.querySelector('.f-icao'), oT = B.querySelector('.f-ita'), oM = B.querySelector('.f-morse');

    function agg(){
      var s = txt.value.toUpperCase(), icao = [], ita = [], mor = [];
      for(var i = 0; i < s.length; i++){
        var ch = s[i];
        if(ch === ' '){ icao.push('/'); ita.push('/'); mor.push('/'); continue; }
        if(ch === '\n') continue;
        var m = map[ch];
        if(m){ icao.push(m.icao); ita.push(m.italiano); mor.push(m.morse); }
        else { icao.push(ch); ita.push(ch); mor.push('?'); }
      }
      oI.textContent = icao.join(' - ') || '—';
      oT.textContent = ita.join(' - ')  || '—';
      oM.textContent = mor.join('   ')  || '—';
      [oI,oT,oM].forEach(function(e){ e.dataset.copy = e.textContent; });
    }
    txt.addEventListener('input', agg);
    agg();
  }
}

/* ---------- auto-init ---------- */
function autoInit(ctx){
  var scope = ctx || document;
  var nodi = scope.querySelectorAll('[data-unitamisura]');
  Array.prototype.forEach.call(nodi, init);
}
if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function(){ autoInit(); });
else autoInit();

return {
  init: init,
  autoInit: autoInit,
  setDataUrl: function(u){ DATA_URL = u; dbPromise = null; }
};
})();