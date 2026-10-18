/* FireOps VVF - modulo "palo" (funzione SAF): palo pescante in 3D con le forze.
 * Modello statico (testa del palo in equilibrio, base a cerniera sul terreno):
 *   C*a + sum(t_i*s_i) + T*h + W*(0,0,-1) = 0
 * a = asse del palo (dalla base alla testa), s_i = versori dalla testa verso gli ancoraggi dei tiranti (posizione e quota
 * di ciascuno a scelta), h = versore verso il punto di recupero, W = carico, T = W / rendimento della carrucola in testa.
 * Con 2 tiranti il sistema e' determinato; con 3 o 4 la ripartizione e' stimata a minimo sforzo (somma dei quadrati dei tiri
 * minima, tiri mai negativi). Assi: x = verso lo sbalzo (il vuoto), y = laterale, z = verso l'alto, origine = base del palo.
 * Angolo di un ancoraggio: 0 = dietro il palo (opposto al vuoto), positivo a destra guardando verso il vuoto.
 * Viste: 3D, pianta e profilo, tutte disegnate a mano (nessuna libreria), funzionano anche offline.
 */
FireOps.registra({
  id: "palo",

  css: `
.pg-palo { --acc: var(--ics-operazioni); max-width: 640px; margin: 0 auto; padding: 12px 16px calc(24px + env(safe-area-inset-bottom, 0px)); color: var(--text); font-family: var(--sans); }
.pg-palo * { box-sizing: border-box; }
.pg-palo .blocco { margin-bottom: 10px; background: var(--panel); border: 1px solid var(--line); border-radius: 8px; padding: 12px; }
.pg-palo .tit { margin: 0 0 8px; font-size: 15px; font-weight: 700; }
.pg-palo .nota { font-size: 12.5px; line-height: 1.45; color: var(--text-dim); margin: 8px 0 0; }
.pg-palo .vista { position: relative; background: var(--bg); border: 1px solid var(--line); border-radius: 8px; overflow: hidden; touch-action: none; }
.pg-palo canvas { display: block; width: 100%; height: 300px; cursor: grab; }
.pg-palo .barra { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 8px; }
.pg-palo .barra button { flex: 1 1 auto; min-height: 44px; padding: 0 10px; border: 1px solid var(--line); border-radius: 8px; background: var(--panel-2); color: var(--text); font: inherit; font-size: 14px; font-weight: 700; cursor: pointer; }
.pg-palo .riga { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 10px; }
.pg-palo .riga3, .pg-palo .riga4 { display: grid; gap: 8px; margin-top: 8px; align-items: center; }
.pg-palo .riga3 { grid-template-columns: 1fr 1fr 1fr; }
.pg-palo .riga4 { grid-template-columns: 68px 1fr 1fr 1fr; font-size: 13px; }
.pg-palo .riga3.tt { grid-template-columns: 68px 1fr 1fr 1fr; font-size: 11.5px; color: var(--text-dim); margin-top: 0; }
.pg-palo canvas.pi { height: 260px; cursor: default; }
.pg-palo .geo { width: 100%; border-collapse: collapse; font-size: 13px; margin-top: 8px; }
.pg-palo .geo td, .pg-palo .geo th { padding: 5px 3px; border-top: 1px solid var(--line); text-align: right; font-weight: 600; }
.pg-palo .geo th { color: var(--text-dim); font-size: 11.5px; font-weight: 400; }
.pg-palo .geo td:first-child, .pg-palo .geo th:first-child { text-align: left; }
.pg-palo .riga:first-of-type { margin-top: 0; }
.pg-palo label { display: block; font-size: 12.5px; color: var(--text-dim); margin-bottom: 4px; }
.pg-palo select, .pg-palo input[type=number] { width: 100%; min-height: 44px; padding: 0 10px; border-radius: 6px; border: 1px solid var(--line); background: var(--bg); color: var(--text); font: inherit; font-size: 16px; }
.pg-palo select:focus-visible, .pg-palo input:focus-visible, .pg-palo button:focus-visible, .pg-palo canvas:focus-visible { outline: 2px solid var(--text); outline-offset: 2px; }
.pg-palo .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.pg-palo .vcell { background: var(--bg); border: 1px solid var(--line); border-radius: 8px; padding: 10px 12px; }
.pg-palo .vcell .k { font-size: 12px; color: var(--text-dim); }
.pg-palo .vcell .v { font-size: 21px; font-weight: 800; margin-top: 2px; font-variant-numeric: tabular-nums; }
.pg-palo .vcell .v small { font-size: 13px; font-weight: 600; color: var(--text-dim); }
.pg-palo .vcell.ko { border-color: #e8734a; }
.pg-palo .vcell.ko .v { color: #e8734a; }
.pg-palo .avv { margin-top: 8px; padding: 8px 10px; border-radius: 8px; border: 1px solid #e8734a; background: rgba(232,115,74,.1); font-size: 13px; line-height: 1.4; }
.pg-palo .leg { display: flex; flex-wrap: wrap; gap: 4px 12px; font-size: 12px; color: var(--text-dim); margin-top: 6px; }
.pg-palo .leg i { display: inline-block; width: 10px; height: 10px; border-radius: 2px; margin-right: 4px; vertical-align: -1px; }
`,

  html: `
<div class="blocco">
  <h2 class="tit">Pianta</h2>
  <div class="vista"><canvas id="pl-pi" class="pi" role="img" aria-label="Pianta del montaggio: trascina i punti"></canvas></div>
  <p class="nota">Trascina i punti blu (ancoraggi dei tiranti) e verde (recupero). Distanze e direzioni si aggiornano, le quote le scrivi qui sotto. Direzione: 0° verso il vuoto, 90° a sinistra guardando il vuoto, 180° dietro.</p>
</div>

<div class="blocco">
  <h2 class="tit">Vista 3D</h2>
  <div class="vista"><canvas id="pl-cv" tabindex="0" role="img" aria-label="Palo pescante in 3D: trascina per ruotare"></canvas></div>
  <div class="barra">
    <button type="button" id="pl-lato">Di lato</button>
    <button type="button" id="pl-alto">Dall’alto</button>
    <button type="button" id="pl-iso">3D</button>
    <button type="button" id="pl-zm" aria-label="Allontana">−</button>
    <button type="button" id="pl-zp" aria-label="Avvicina">+</button>
  </div>
  <div class="leg"><span><i style="background:#ffd700"></i>palo</span><span><i style="background:#4A93C8"></i>tiranti</span><span><i style="background:#e8734a"></i>carico</span><span><i style="background:#2f9e5b"></i>capo di recupero</span></div>
  <p class="nota">Trascina per ruotare. Lo sbalzo è verso destra nella vista di lato.</p>
</div>

<div class="blocco">
  <h2 class="tit">Palo</h2>
  <div class="riga3">
    <div><label for="pl-L">Lunghezza (m)</label><input type="number" id="pl-L" inputmode="decimal" min="1" max="12" step="0.1" value="4"></div>
    <div><label for="pl-th">Inclinazione (°)</label><input type="number" id="pl-th" inputmode="decimal" min="0" max="45" step="1" value="10"></div>
    <div><label for="pl-ph">Verso (°)</label><input type="number" id="pl-ph" inputmode="decimal" min="-180" max="360" step="5" value="0"></div>
  </div>
  <p class="nota">Inclinazione dalla verticale. Verso: 0° = inclinato verso il vuoto.</p>
</div>

<div class="blocco">
  <h2 class="tit">Ancoraggi e recupero</h2>
  <div class="riga3 tt"><span></span><span>Distanza dalla base (m)</span><span>Direzione (°)</span><span>Quota sulla base (m)</span></div>
  <div class="riga4"><b style="color:#4A93C8">Tirante 1</b>
    <input type="number" id="pl-a1d" inputmode="decimal" min="0.3" step="0.1" value="5" aria-label="Distanza tirante 1">
    <input type="number" id="pl-a1a" inputmode="decimal" step="1" value="145" aria-label="Direzione tirante 1">
    <input type="number" id="pl-a1z" inputmode="decimal" step="0.1" value="0" aria-label="Quota tirante 1"></div>
  <div class="riga4"><b style="color:#4A93C8">Tirante 2</b>
    <input type="number" id="pl-a2d" inputmode="decimal" min="0.3" step="0.1" value="5" aria-label="Distanza tirante 2">
    <input type="number" id="pl-a2a" inputmode="decimal" step="1" value="215" aria-label="Direzione tirante 2">
    <input type="number" id="pl-a2z" inputmode="decimal" step="0.1" value="0" aria-label="Quota tirante 2"></div>
  <div class="riga4"><b style="color:#2f9e5b">Recupero</b>
    <input type="number" id="pl-pd" inputmode="decimal" min="0" step="0.1" value="0" aria-label="Distanza punto di recupero">
    <input type="number" id="pl-pa" inputmode="decimal" step="1" value="180" aria-label="Direzione punto di recupero">
    <input type="number" id="pl-pz" inputmode="decimal" step="0.1" value="0" aria-label="Quota punto di recupero"></div>
  <p class="nota">Ogni ancoraggio ha la sua distanza, direzione e quota (+ sopra la base, − sotto): puoi metterli a quote diverse, per esempio uno su un albero e uno a terra.</p>
  <div id="pl-geo"></div>
</div>

<div class="blocco">
  <h2 class="tit">Carico e materiali</h2>
  <div class="riga">
    <div><label for="pl-kg">Carico (kg)</label><input type="number" id="pl-kg" inputmode="decimal" min="1" step="1" value="200"></div>
    <div><label for="pl-eta">Rendimento carrucola in testa</label><input type="number" id="pl-eta" inputmode="decimal" min="0.5" max="1" step="0.01" value="0.95"></div>
  </div>
  <div class="riga">
    <div><label for="pl-mat">Palo</label>
      <select id="pl-mat"><option value="70">Alluminio</option><option value="210">Acciaio</option></select></div>
    <div><label for="pl-r">Resistenza minima di tiranti e ancoraggi (kN)</label><input type="number" id="pl-r" inputmode="decimal" min="1" step="1" value="22"></div>
  </div>
  <div class="riga">
    <div><label for="pl-D">Diametro esterno del palo (mm)</label><input type="number" id="pl-D" inputmode="decimal" min="20" step="1" value="80"></div>
    <div><label for="pl-s">Spessore del tubo (mm)</label><input type="number" id="pl-s" inputmode="decimal" min="1" step="0.5" value="4"></div>
  </div>
</div>

<div class="blocco">
  <h2 class="tit">Forze</h2>
  <div class="grid" id="pl-ris"></div>
  <div id="pl-avv"></div>
  <p class="nota">Modello semplificato: palo a cerniera alla base, tiranti e capo di recupero senza elasticità, nessuna forza dinamica né vento. Il carico di instabilità è quello di Eulero per tubo pieno di materiale ideale. Non sostituisce la verifica del produttore e dell’istruttore SAF.</p>
</div>
`,

  init(root) {
    "use strict";
    const $ = s => root.querySelector(s);
    const G = 9.80665, RAD = Math.PI / 180;
    const num = (id, d) => { const v = parseFloat($(id).value); return isFinite(v) ? v : d; };
    const fmt = (v, d) => Number(v).toLocaleString("it-IT", {minimumFractionDigits: d, maximumFractionDigits: d});
    const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
    const len = a => Math.hypot(a[0], a[1], a[2]);
    const uni = a => { const l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
    const det = (a, b, c) => a[0] * (b[1] * c[2] - b[2] * c[1]) - a[1] * (b[0] * c[2] - b[2] * c[0]) + a[2] * (b[0] * c[1] - b[1] * c[0]);

    let geo = null;   // ultimo calcolo, usato dal disegno

    function calcola() {
      const L = Math.max(0.5, num("#pl-L", 4)), th = Math.min(60, Math.max(0, num("#pl-th", 10))) * RAD, ph = num("#pl-ph", 0) * RAD;
      const kg = Math.max(0, num("#pl-kg", 200)), eta = Math.min(1, Math.max(0.5, num("#pl-eta", 0.95)));
      const E = num("#pl-mat", 70) * 1e9, Dm = Math.max(10, num("#pl-D", 80)) / 1000, sp = Math.min(Dm / 2 - 0.0005, Math.max(0.5, num("#pl-s", 4)) / 1000);
      const R = Math.max(0, num("#pl-r", 22));
      const polare = (id, dmin) => { const d = Math.max(dmin, num("#pl-" + id + "d", 5)), an = num("#pl-" + id + "a", 0) * RAD; return [d * Math.cos(an), d * Math.sin(an), num("#pl-" + id + "z", 0)]; };

      const B = [0, 0, 0], H = [L * Math.sin(th) * Math.cos(ph), L * Math.sin(th) * Math.sin(ph), L * Math.cos(th)];
      const A1 = polare("a1", 0.3), A2 = polare("a2", 0.3), P = polare("p", 0);
      const W = kg * G, T = W / eta;
      const a = uni(sub(H, B)), s1 = uni(sub(A1, H)), s2 = uni(sub(A2, H)), h = uni(sub(P, H));
      // C*a + t1*s1 + t2*s2 = -(T*h + W*(0,0,-1))
      const rhs = [-(T * h[0]), -(T * h[1]), -(T * h[2] - W)];
      const D0 = det(a, s1, s2);
      let C = NaN, t1 = NaN, t2 = NaN;
      if (Math.abs(D0) > 1e-9) {
        C = det(rhs, s1, s2) / D0; t1 = det(a, rhs, s2) / D0; t2 = det(a, s1, rhs) / D0;
      }
      // reazione alla base: il palo spinge sul terreno con -C*a ... piu' la componente del tiro di recupero se arriva alla base
      const Hb = Math.hypot(C * a[0], C * a[1]), Vb = C * a[2];
      const attr = Vb > 0 ? Hb / Vb : Infinity;
      const I = Math.PI / 64 * (Math.pow(Dm, 4) - Math.pow(Dm - 2 * sp, 4));
      const Pcr = Math.PI * Math.PI * E * I / (L * L);
      geo = {B, H, A1, A2, P, L, W, T, ok: isFinite(C) && t1 > 0 && t2 > 0 && C > 0};
      tabellaGeo(H, A1, A2, P, t1, t2);

      const avv = [];
      if (!isFinite(C)) avv.push("Configurazione indeterminata: i tiranti sono allineati con il palo. Cambia apertura o distanza.");
      else {
        if (t1 <= 0 || t2 <= 0) avv.push("Un tirante risulta scarico: con questa inclinazione il capo di recupero tira il palo all’indietro più di quanto lo sbalzo lo spinga in fuori, e il palo tenderebbe a tornare verso la verticale. Aumenta l’inclinazione o avvicina il punto di recupero alla base.");
        if (C <= 0) avv.push("Il palo risulta teso invece che compresso: controlla i dati.");
        const el = Math.max(...[A1, A2].map(q => Math.atan2(H[2] - q[2], Math.hypot(H[0] - q[0], H[1] - q[1])) / RAD));
        if (el > 60) avv.push("I tiranti sono molto ripidi (" + fmt(el, 0) + "° sull’orizzontale): lavorano male. Allontana gli ancoraggi.");
        if (Pcr > 0 && C > Pcr / 3) avv.push("La compressione supera un terzo del carico di instabilità del palo: usa un tubo più robusto o più corto.");
        if (R > 0 && Math.max(t1, t2) / 1000 > R / 3) avv.push("Il tirante più carico supera un terzo della resistenza indicata per ancoraggi e tiranti.");
        if (attr > 0.5) avv.push("La base spinge molto di lato rispetto al verticale: serve un arresto o un ancoraggio della base contro lo scivolamento.");
      }
      const k = v => fmt(v / 1000, 2) + ' <small>kN</small>';
      const elemento = (kk, v, ko) => '<div class="vcell' + (ko ? " ko" : "") + '"><div class="k">' + kk + '</div><div class="v">' + v + "</div></div>";
      $("#pl-ris").innerHTML =
        elemento("Compressione nel palo", isFinite(C) ? k(C) : "—", !isFinite(C) || C <= 0) +
        elemento("Carico di instabilità (Eulero)", k(Pcr)) +
        elemento("Tirante 1", isFinite(t1) ? k(t1) : "—", !(t1 > 0)) +
        elemento("Tirante 2", isFinite(t2) ? k(t2) : "—", !(t2 > 0)) +
        elemento("Capo di recupero", k(T)) +
        elemento("Coefficiente del tirante", isFinite(t1) && R > 0 && Math.max(t1, t2) > 0 ? fmt(R * 1000 / Math.max(t1, t2), 1) : "—") +
        elemento("Spinta orizzontale alla base", isFinite(C) ? k(Hb) : "—") +
        elemento("Coefficiente del palo", isFinite(C) && C > 0 ? fmt(Pcr / C, 1) : "—");
      $("#pl-avv").innerHTML = avv.map(t => '<div class="avv">' + t + "</div>").join("");
      disegna();
    }

    // ---------- pianta e angoli ----------
    let pianta = null;
    function tabellaGeo(H, A1, A2, P, t1, t2) {
      const el = q => Math.atan2(H[2] - q[2], Math.hypot(H[0] - q[0], H[1] - q[1])) / RAD;
      const lung = q => len(sub(q, H));
      const dirPalo = Math.atan2(H[1], H[0]) / RAD;
      const ang = (a, b) => { let d = Math.abs(Math.atan2(a[1], a[0]) - Math.atan2(b[1], b[0])) / RAD; return d > 180 ? 360 - d : d; };
      const riga = (n, q, col, t) => '<tr><td style="color:' + col + '">' + n + '</td><td>' + fmt(lung(q), 2) + ' m</td><td>' + fmt(el(q), 0) + '°</td><td>' + (isFinite(t) ? fmt(t / 1000, 2) + " kN" : "—") + "</td></tr>";
      $("#pl-geo").innerHTML = '<table class="geo"><tr><th></th><th>Lunghezza</th><th>Angolo sull’orizzontale</th><th>Tiro</th></tr>' +
        riga("Tirante 1", A1, "#4A93C8", t1) + riga("Tirante 2", A2, "#4A93C8", t2) + riga("Recupero", P, "#2f9e5b", geo ? geo.T : NaN) + "</table>" +
        '<p class="nota">Angolo tra i due tiranti in pianta: ' + fmt(ang(A1, A2), 0) + "°. Altezza della testa: " + fmt(H[2], 2) + " m.</p>";
      if (!pianta) return;
      const pr = (id, q, col, nome) => ({id, x: q[0], y: q[1], col, nome, sotto: (q[2] >= 0 ? "+" : "") + fmt(q[2], 1) + " m"});
      pianta.set([
        {id: "B", x: 0, y: 0, fisso: true, col: "#eceff3", nome: "Base", ly: 30},
        {id: "H", x: H[0], y: H[1], fisso: true, col: "#ffd700", nome: "Testa", sotto: "+" + fmt(H[2], 1) + " m", ly: -30},
        pr("a1", A1, "#4A93C8", "T1"), pr("a2", A2, "#4A93C8", "T2"), Object.assign(pr("p", P, "#2f9e5b", "Recupero"), {ly: 60})
      ], [
        {a: "B", b: "H", col: "#ffd700", lw: 5},
        {a: "H", b: "a1", col: "#4A93C8", dash: [6, 4], testo: fmt(lung(A1), 1) + " m"},
        {a: "H", b: "a2", col: "#4A93C8", dash: [6, 4], testo: fmt(lung(A2), 1) + " m"},
        {a: "H", b: "p", col: "#2f9e5b", dash: [6, 4]}
      ]);
    }
    const sincro = (id, x, y) => {
      const d = Math.hypot(x, y), an = Math.atan2(y, x) / RAD;
      $("#pl-" + id + "d").value = fmt(d, 1).replace(",", ".");
      $("#pl-" + id + "a").value = String(Math.round(an < 0 ? an + 360 : an));
      calcola();
    };
    const avviaPianta = () => { pianta = SafPianta.crea($("#pl-pi"), {onMove: sincro}); calcola(); };

    // ---------- vista 3D ----------
    const cv = $("#pl-cv"), ctx = cv.getContext("2d");
    let yaw = -0.7, pitch = 0.45, zoom = 1;
    function proietta(pt, c) {
      // ruota attorno a z (yaw) poi inclina (pitch): x destra, y profondita', z su
      let x = pt[0] - c[0], y = pt[1] - c[1], z = pt[2] - c[2];
      const cy = Math.cos(yaw), sy = Math.sin(yaw);
      const x1 = x * cy - y * sy, y1 = x * sy + y * cy;
      const cp = Math.cos(pitch), sp = Math.sin(pitch);
      const Y = y1 * cp + z * sp, Z = z * cp - y1 * sp;
      return [x1, Y, Z];
    }
    function disegna() {
      if (!geo) return;
      const w = cv.clientWidth || 320, h = cv.clientHeight || 300, dpr = window.devicePixelRatio || 1;
      if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const {B, H, A1, A2, P, L} = geo;
      const pts = [B, H, A1, A2, P, [H[0], H[1], H[2] - 1]];
      let mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9];
      pts.forEach(q => q.forEach((v, i) => { mn[i] = Math.min(mn[i], v); mx[i] = Math.max(mx[i], v); }));
      const c = [(mn[0] + mx[0]) / 2, (mn[1] + mx[1]) / 2, (mn[2] + mx[2]) / 2];
      const raggio = Math.max(2, Math.hypot(mx[0] - mn[0], mx[1] - mn[1], mx[2] - mn[2]) / 2);
      const sc = Math.min(w, h) / (raggio * 2.3) * zoom;
      const dist = raggio * 4;
      const pr = q => {
        const r = proietta(q, c), f = dist / (dist + r[1]);      // prospettiva leggera
        return [w / 2 + r[0] * sc * f, h / 2 - r[2] * sc * f + 8, f];
      };
      const linea = (a, b, col, lw, dash) => {
        const p1 = pr(a), p2 = pr(b);
        ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.setLineDash(dash || []);
        ctx.beginPath(); ctx.moveTo(p1[0], p1[1]); ctx.lineTo(p2[0], p2[1]); ctx.stroke(); ctx.setLineDash([]);
      };
      // terreno: griglia
      const g = Math.max(1, Math.round(raggio / 4));
      const x0 = Math.floor(mn[0] / g - 1) * g, x1 = Math.ceil(mx[0] / g + 1) * g, y0 = Math.floor(mn[1] / g - 1) * g, y1 = Math.ceil(mx[1] / g + 1) * g;
      for (let x = x0; x <= x1; x += g) linea([x, y0, 0], [x, y1, 0], "#2a323d", 1);
      for (let y = y0; y <= y1; y += g) linea([x0, y, 0], [x1, y, 0], "#2a323d", 1);
      // assi
      linea(B, [g, 0, 0], "#d8262f", 1.5); linea(B, [0, g, 0], "#2f9e5b", 1.5);
      // tiranti
      linea(H, A1, geo.ok ? "#4A93C8" : "#e8734a", 2); linea(H, A2, geo.ok ? "#4A93C8" : "#e8734a", 2);
      [A1, A2].forEach(q => { const t = pr(q); ctx.fillStyle = "#4A93C8"; ctx.fillRect(t[0] - 4, t[1] - 4, 8, 8); linea(q, [q[0], q[1], 0], "#2a323d", 1, [3, 3]); });
      // capo di recupero e punto di tiro
      linea(H, P, "#2f9e5b", 2);
      const tp = pr(P); ctx.fillStyle = "#2f9e5b"; ctx.beginPath(); ctx.arc(tp[0], tp[1], 5, 0, 7); ctx.fill();
      // carico appeso
      const Cd = [H[0], H[1], H[2] - Math.min(1, L / 4)];
      linea(H, Cd, "#e8734a", 2);
      const tc = pr(Cd); ctx.fillStyle = "#e8734a"; ctx.fillRect(tc[0] - 7, tc[1] - 1, 14, 14);
      // palo
      linea(B, H, "#ffd700", 6);
      const th = pr(H), tb = pr(B);
      ctx.fillStyle = "#10141a"; ctx.strokeStyle = "#eceff3"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(th[0], th[1], 6, 0, 7); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#eceff3"; ctx.beginPath(); ctx.arc(tb[0], tb[1], 4, 0, 7); ctx.fill();
      ctx.fillStyle = "#8b96a3"; ctx.font = "12px sans-serif";
      ctx.fillText("L = " + fmt(L, 1) + " m", th[0] + 10, th[1] - 6);
    }

    // rotazione col dito/mouse + pizzico per lo zoom
    const dita = new Map();
    let ultimo = null, dpz = 0;
    cv.addEventListener("pointerdown", e => { cv.setPointerCapture(e.pointerId); dita.set(e.pointerId, [e.clientX, e.clientY]); ultimo = [e.clientX, e.clientY]; dpz = 0; cv.style.cursor = "grabbing"; });
    cv.addEventListener("pointermove", e => {
      if (!dita.has(e.pointerId)) return;
      dita.set(e.pointerId, [e.clientX, e.clientY]);
      if (dita.size === 2) {
        const [p1, p2] = [...dita.values()], dd = Math.hypot(p1[0] - p2[0], p1[1] - p2[1]);
        if (dpz) zoom = Math.min(4, Math.max(0.4, zoom * dd / dpz));
        dpz = dd; disegna(); return;
      }
      yaw += (e.clientX - ultimo[0]) * 0.01;
      pitch = Math.min(1.5, Math.max(-0.1, pitch + (e.clientY - ultimo[1]) * 0.01));
      ultimo = [e.clientX, e.clientY]; disegna();
    });
    const fine = e => { dita.delete(e.pointerId); dpz = 0; ultimo = dita.size ? [...dita.values()][0] : null; cv.style.cursor = "grab"; };
    cv.addEventListener("pointerup", fine); cv.addEventListener("pointercancel", fine);
    cv.addEventListener("wheel", e => { e.preventDefault(); zoom = Math.min(4, Math.max(0.4, zoom * (e.deltaY < 0 ? 1.1 : 0.9))); disegna(); }, {passive: false});
    cv.addEventListener("keydown", e => {
      const m = {ArrowLeft: [-0.1, 0], ArrowRight: [0.1, 0], ArrowUp: [0, -0.1], ArrowDown: [0, 0.1]}[e.key];
      if (m) { e.preventDefault(); yaw += m[0]; pitch = Math.min(1.5, Math.max(-0.1, pitch + m[1])); disegna(); }
    });
    const vista = (y, p) => () => { yaw = y; pitch = p; zoom = 1; disegna(); };
    $("#pl-lato").addEventListener("click", vista(0, 0));
    $("#pl-alto").addEventListener("click", vista(0, 1.5));
    $("#pl-iso").addEventListener("click", vista(-0.7, 0.45));
    $("#pl-zp").addEventListener("click", () => { zoom = Math.min(4, zoom * 1.25); disegna(); });
    $("#pl-zm").addEventListener("click", () => { zoom = Math.max(0.4, zoom / 1.25); disegna(); });

    root.addEventListener("input", calcola);
    root.addEventListener("change", calcola);
    window.addEventListener("resize", () => { disegna(); if (pianta) pianta.disegna(); });
    calcola();
    setTimeout(disegna, 100);
    if (window.SafPianta) avviaPianta();
    else { const sc = document.createElement("script"); sc.src = "js/saf-pianta.js?v=" + (window.FIREOPS_VERSIONE || ""); sc.onload = avviaPianta; document.head.appendChild(sc); }
  }
});
