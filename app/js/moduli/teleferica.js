/* FireOps VVF - modulo "teleferica" (funzione SAF): due corde portanti semistatiche tese tra due ancoraggi, carrello con traenti,
 * eventuale pescante per raggiungere la vittima, anche sotto il punto piu' basso della linea.
 * Modello piano (vista laterale), A = ancoraggio a monte (0,0), B = ancoraggio a valle (L,-D):
 *  - a vuoto ogni portante e' tesa a T0 (tesatura): freccia parabolica f0 = w L^2 / (8 H0), H0 = T0 cos(fi);
 *    lunghezza a riposo (senza tensione) S_u = S0 / (1 + T0/EA); EA ricavata da "allungamento e % al carico di riferimento F".
 *  - sotto carico (meta' del carico per portante) il carrello e' un punto a x: componente orizzontale H uguale sui due tratti,
 *    spostamento verticale rispetto alla corda d = P x (L-x) / (H L); H si trova imponendo che la lunghezza a riposo non cambi:
 *    l1/(1+T1/EA) + l2/(1+T2/EA) = S_u.   (peso proprio trascurato sotto carico, traenti senza componente orizzontale)
 * Unita': metri e kg-forza a video, newton nei calcoli.
 */
FireOps.registra({
  id: "teleferica",

  css: `
.pg-teleferica { --acc: var(--ics-operazioni); max-width: 640px; margin: 0 auto; padding: 12px 16px calc(24px + env(safe-area-inset-bottom, 0px)); color: var(--text); }
.pg-teleferica * { box-sizing: border-box; }
.pg-teleferica .blocco { margin-bottom: 10px; background: var(--panel); border: 1px solid var(--line); border-radius: 8px; padding: 12px; }
.pg-teleferica .tit { margin: 0 0 8px; font-size: 15px; font-weight: 700; }
.pg-teleferica .nota { font-size: 12.5px; line-height: 1.45; color: var(--text-dim); margin: 8px 0 0; }
.pg-teleferica .riga { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 10px; }
.pg-teleferica .riga:first-of-type { margin-top: 0; }
.pg-teleferica label { display: block; font-size: 12.5px; color: var(--text-dim); margin-bottom: 4px; }
.pg-teleferica input[type=number], .pg-teleferica select { width: 100%; min-height: 44px; padding: 0 10px; border-radius: 6px; border: 1px solid var(--line); background: var(--bg); color: var(--text); font: inherit; font-size: 16px; }
.pg-teleferica input[type=range] { width: 100%; min-height: 44px; accent-color: var(--yellow); }
.pg-teleferica input:focus-visible, .pg-teleferica select:focus-visible { outline: 2px solid var(--text); outline-offset: 2px; }
.pg-teleferica .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 10px; }
.pg-teleferica .grid:first-child { margin-top: 0; }
.pg-teleferica .vcell { background: var(--bg); border: 1px solid var(--line); border-radius: 8px; padding: 10px 12px; }
.pg-teleferica .vcell .k { font-size: 12px; color: var(--text-dim); }
.pg-teleferica .vcell .v { font-size: 21px; font-weight: 800; margin-top: 2px; font-variant-numeric: tabular-nums; }
.pg-teleferica .vcell .v small { font-size: 13px; font-weight: 600; color: var(--text-dim); }
.pg-teleferica .vcell.g { grid-column: 1 / -1; }
.pg-teleferica svg { width: 100%; height: auto; display: block; background: var(--bg); border: 1px solid var(--line); border-radius: 8px; }
.pg-teleferica .avv { margin-top: 8px; padding: 10px 12px; border-radius: 8px; border: 2px solid var(--yellow); background: rgba(255,215,0,.08); color: var(--yellow); font-size: 13.5px; font-weight: 700; }
.pg-teleferica .avv.rosso { border-color: #d8262f; background: rgba(216,38,47,.14); color: #ff6b6b; }
.pg-teleferica .sez { font-size: 12.5px; font-weight: 700; color: var(--text-dim); margin: 12px 0 0; text-transform: uppercase; letter-spacing: .04em; }
.pg-teleferica [hidden] { display: none !important; }
`,

  html: `
<div class="blocco">
  <h2 class="tit">Schema (vista laterale)</h2>
  <div id="tf-sv"></div>
  <p class="nota">A a sinistra è l’ancoraggio a monte, B a destra quello a valle. Tratteggio: portante a vuoto (con la freccia del peso della corda). Linea piena: portante sotto carico. Il carrello sta dove indichi con il cursore; sotto c’è la vittima.</p>
</div>

<div class="blocco">
  <h2 class="tit">Geometria</h2>
  <div class="riga">
    <div><label for="tf-L">Distanza orizzontale A–B (m)</label><input type="number" id="tf-L" inputmode="decimal" min="3" max="500" step="0.5" value="40"></div>
    <div><label for="tf-D">Dislivello: B più in basso di A (m)</label><input type="number" id="tf-D" inputmode="decimal" min="-200" max="200" step="0.5" value="4"></div>
  </div>
  <p class="sez">Vittima</p>
  <div class="riga">
    <div><label for="tf-xv">Distanza da A, in orizzontale (m)</label><input type="number" id="tf-xv" inputmode="decimal" step="0.5" value="26"></div>
    <div><label for="tf-zv">Quota rispetto ad A (m, negativa = sotto)</label><input type="number" id="tf-zv" inputmode="decimal" step="0.5" value="-18"></div>
  </div>
  <p class="nota" id="tf-vnota"></p>
  <div style="margin-top:10px"><label for="tf-xc">Traslazione: posizione del carrello <b id="tf-xcl"></b></label>
    <input type="range" id="tf-xc" min="0" max="100" step="1" value="50"></div>
  <p class="nota" style="margin-top:0">Il recupero si fa con il carrello sulla verticale della vittima (anche più in basso del punto più basso della linea); poi soccorritore e vittima vengono traslati sulla linea. Il cursore sceglie dove guardare il carrello durante la traslazione.</p>
</div>

<div class="blocco">
  <h2 class="tit">Carichi</h2>
  <div class="riga">
    <div><label for="tf-Ws">Soccorritore (kg)</label><input type="number" id="tf-Ws" inputmode="decimal" min="30" max="250" step="5" value="100"></div>
    <div><label for="tf-Wv">Vittima (kg)</label><input type="number" id="tf-Wv" inputmode="decimal" min="0" max="250" step="5" value="100"></div>
  </div>
  <p class="nota" style="margin-top:4px">Sul carrello, a recupero fatto, ci sono soccorritore e vittima: <b id="tf-Qt">200 kg</b>. Stanno sempre sulla verticale del carrello.</p>
  <div class="riga">
    <div><label for="tf-T0">Tesatura di ogni portante (kg)</label><input type="number" id="tf-T0" inputmode="decimal" min="20" max="2000" step="10" value="300"></div>
  </div>
  <p class="nota" style="margin-top:4px">Tesatura a mano: due operatori con mezzo barcaiolo e una taglia danno circa 300 kg su ogni portante.</p>
</div>

<div class="blocco">
  <h2 class="tit">Corde e allungamenti</h2>
  <div class="riga">
    <div><label for="tf-e">Allungamento della corda (%)</label><input type="number" id="tf-e" inputmode="decimal" min="0.5" max="20" step="0.5" value="5"></div>
    <div><label for="tf-F">… al carico di riferimento (kg)</label><input type="number" id="tf-F" inputmode="decimal" min="20" max="500" step="10" value="150"></div>
  </div>
  <div class="riga">
    <div><label for="tf-w">Peso della corda (kg/m)</label><input type="number" id="tf-w" inputmode="decimal" min="0.02" max="0.3" step="0.005" value="0.075"></div>
    <div><label for="tf-m">Margine per nodi e ancoraggi (m, per capo)</label><input type="number" id="tf-m" inputmode="decimal" min="0" max="20" step="0.5" value="3"></div>
  </div>
</div>

<div class="blocco">
  <h2 class="tit">Pescante</h2>
  <div class="riga" style="margin-top:0"><div style="grid-column:1/-1"><label for="tf-pm">Tipo</label>
    <select id="tf-pm">
      <option value="1">1 · Diretto da A: la corda passa nel carrello e scende l’operatore</option>
      <option value="2">2 · Con carrucola sul soccorritore: la corda risale al carrello</option>
      <option value="3">3 · Gru edile: A → carrello → carrucola soccorritore → carrello → B</option>
    </select></div></div>
  <div class="riga">
    <div><label for="tf-pm2">Margine corda (m)</label><input type="number" id="tf-pm2" inputmode="decimal" min="0" max="30" step="0.5" value="5"></div>
  </div>
  <p class="nota" id="tf-pnota"></p>
</div>

<div id="tf-av"></div>

<div class="blocco">
  <h2 class="tit">Carichi e forze</h2>
  <div class="grid" id="tf-r1"></div>
</div>

<div class="blocco">
  <h2 class="tit">Frecce e allungamenti</h2>
  <div class="grid" id="tf-r2"></div>
</div>

<div class="blocco">
  <h2 class="tit">Lunghezze delle corde</h2>
  <div class="grid" id="tf-r3"></div>
</div>

<div class="blocco">
  <h2 class="tit">Ipotesi</h2>
  <p class="nota" style="margin-top:0">Analisi statica piana. Le due portanti sono uguali e si dividono il carico a metà. L’allungamento della corda si ricava dal dato «x % al carico di riferimento» (EN 1891 tipo A: meno del 5 % tra 50 e 150 kg) con comportamento elastico lineare. Il carrello scorre senza attrito e i traenti non danno componente orizzontale. Il peso della corda conta solo per la freccia a vuoto. I valori sono una stima per la pianificazione: non sostituiscono la verifica degli ancoraggi, dei carichi di rottura e dei fattori di sicurezza.</p>
</div>
`,

  init(root) {
    const $ = s => root.querySelector(s), G = 9.80665;
    const fmt = (v, d) => (isFinite(v) ? v : 0).toFixed(d).replace(".", ",");
    const num = (id, def) => { const v = parseFloat(String($(id).value).replace(",", ".")); return isFinite(v) ? v : def; };

    function calcola(i) {
      const L = i.L, D = i.D, C = Math.hypot(L, D), cosf = L / C;
      const EA = i.F * G / (i.e / 100), T0 = i.T0 * G, wg = i.w * G;
      const H0 = T0 * cosf, f0 = wg * L * L / (8 * H0), fn = f0 * cosf;
      const S0 = C + 8 * fn * fn / (3 * C), Su = S0 / (1 + T0 / EA);
      // sotto carico, per un carrello a x
      const sotto = x => {
        const P = i.Q * G / 2;
        x = Math.min(L - 0.2, Math.max(0.2, x));
        let lo = Math.log(1), hi = Math.log(1e8), r = null;
        const f = H => {
          const d = P * x * (L - x) / (H * L), yp = -D * x / L - d, l1 = Math.hypot(x, yp), l2 = Math.hypot(L - x, -D - yp), T1 = H * l1 / x, T2 = H * l2 / (L - x);
          return {d, yp, l1, l2, T1, T2, g: l1 / (1 + T1 / EA) + l2 / (1 + T2 / EA) - Su, H};
        };
        for (let k = 0; k < 90; k++) { const m = Math.exp((lo + hi) / 2); r = f(m); if (r.g > 0) lo = Math.log(m); else hi = Math.log(m); }
        r.x = x; r.VA = r.H * (-r.yp) / x; r.VB = r.H * (r.yp + D) / (L - x);   // verticali sugli ancoraggi (positive verso il basso su A; su B vedi segno)
        r.zc = r.yp; r.TA = Math.hypot(r.H, r.VA); r.TB = Math.hypot(r.H, r.VB); r.P = P;
        return r;
      };
      return {L, D, C, EA, S0, Su, f0, H0, T0, sotto};
    }

    function disegna(i, k, ris, rec) {
      const pad = 4;
      const pts = [[0, 0], [i.L, -i.D], [i.xv, i.zv], [rec.x, rec.zc], [ris.x, ris.zc]];
      let x0 = Math.min(...pts.map(p => p[0])) - pad, x1 = Math.max(...pts.map(p => p[0])) + pad, y0 = Math.min(...pts.map(p => p[1])) - pad, y1 = Math.max(...pts.map(p => p[1])) + pad;
      const W = 600, sc = Math.min(W / (x1 - x0), 400 / (y1 - y0)), top = i.pm === "3" ? 14 : 44, Hh = (y1 - y0) * sc + 10 + top;   // spazio in alto per il pescante o la gru (disegnati in pixel)
      const X = x => 10 + (x - x0) * sc, Y = y => top + (y1 - y) * sc;
      let s = '<svg viewBox="0 0 ' + (W + 20) + ' ' + Hh.toFixed(0) + '" role="img" aria-label="Schema laterale della teleferica">';
      // portante a vuoto (parabola)
      let d0 = "";
      for (let n = 0; n <= 40; n++) { const x = i.L * n / 40, y = -i.D * x / i.L - 4 * k.f0 * (x / i.L) * (1 - x / i.L); d0 += (n ? "L" : "M") + X(x).toFixed(1) + " " + Y(y).toFixed(1); }
      s += '<path d="' + d0 + '" fill="none" stroke="#8b96a3" stroke-width="1.6" stroke-dasharray="5 4"/>';
      // portante sotto carico
      s += '<path d="M' + X(0).toFixed(1) + " " + Y(0).toFixed(1) + "L" + X(rec.x).toFixed(1) + " " + Y(rec.zc).toFixed(1) + "L" + X(i.L).toFixed(1) + " " + Y(-i.D).toFixed(1) + '" fill="none" stroke="#e8734a" stroke-width="2.6"/>';
      s += '<path d="M' + X(0).toFixed(1) + " " + Y(0).toFixed(1) + "L" + X(ris.x).toFixed(1) + " " + Y(ris.zc).toFixed(1) + "L" + X(i.L).toFixed(1) + " " + Y(-i.D).toFixed(1) + '" fill="none" stroke="#e8734a" stroke-width="1.2" stroke-dasharray="3 3" opacity=".7"/>';
      // ancoraggi
      [[0, 0, "A"], [i.L, -i.D, "B"]].forEach(a => { s += '<path d="M' + (X(a[0]) - 8) + " " + (Y(a[1]) + 12) + "L" + X(a[0]) + " " + Y(a[1]) + "L" + (X(a[0]) + 8) + " " + (Y(a[1]) + 12) + 'Z" fill="#8b96a3"/><text x="' + (X(a[0]) - (a[2] === "A" ? 14 : -14)) + '" y="' + (Y(a[1]) - 6) + '" fill="#8b96a3" font-size="13" font-weight="700" text-anchor="middle">' + a[2] + "</text>"; });
      // risultanti sugli ancoraggi (due portanti, carrello sulla verticale della vittima): freccia nella direzione della forza
      [[0, 0, "A", 1, rec.H, rec.yp / rec.x * rec.H], [i.L, -i.D, "B", -1, rec.H, (rec.yp + i.D) / (i.L - rec.x) * rec.H]].forEach(a => {
        const fz = a[5] * 2, F = Math.hypot(a[3] * a[4] * 2, fz); if (!(F > 0)) return;
        const ux = a[3] * a[4] * 2 / F, uy = -fz / F, x0 = X(a[0]), y0 = Y(a[1]), x1 = x0 + ux * 34, y1 = y0 + uy * 34, an = Math.atan2(y1 - y0, x1 - x0);
        s += '<path d="M' + x0 + " " + y0 + "L" + x1 + " " + y1 + '" stroke="#ff5d8f" stroke-width="3" fill="none"/><path d="M' + x1 + " " + y1 + "L" + (x1 - 9 * Math.cos(an - 0.45)) + " " + (y1 - 9 * Math.sin(an - 0.45)) + "L" + (x1 - 9 * Math.cos(an + 0.45)) + " " + (y1 - 9 * Math.sin(an + 0.45)) + 'Z" fill="#ff5d8f"/>';
        s += '<text x="' + (a[3] > 0 ? x0 + 6 : x0 - 6) + '" y="' + (y0 - 22) + '" fill="#ff5d8f" font-size="11" font-weight="700" text-anchor="' + (a[3] > 0 ? "start" : "end") + '">R ' + (F / G).toFixed(0) + ' kg</text><text x="' + (a[3] > 0 ? x0 + 6 : x0 - 6) + '" y="' + (y0 - 10) + '" fill="#ff5d8f" font-size="10" text-anchor="' + (a[3] > 0 ? "start" : "end") + '">O ' + (a[4] * 2 / G).toFixed(0) + " · V " + (Math.abs(fz) / G).toFixed(0) + "</text>";
      });
      // corda del pescante: dal punto fisso lungo la portante, nel carrello, poi giu' fino alla vittima (e su per il tipo 2 e 3)
      {
        const gru = i.pm === "3", ax = X(0), ay = Y(0), cx = X(rec.x), cy = Y(rec.zc);
        let px = ax, py = ay;   // punto da cui parte la corda del pescante
        if (!gru) {   // pescante diretto fissato in A: un palo che sporge verso il vuoto
          px = ax + 16; py = ay - 30;
          s += '<path d="M' + ax + " " + ay + "L" + ax + " " + (ay - 30) + "L" + px + " " + py + '" stroke="#c77dff" stroke-width="4" fill="none" stroke-linejoin="round"/><circle cx="' + px + '" cy="' + py + '" r="3.5" fill="#c77dff"/><text x="' + (px + 8) + '" y="' + (py - 4) + '" fill="#c77dff" font-size="10" font-weight="700">pescante</text>';
        }   // tipo 3: la corda parte direttamente da A (nessun palo)
        s += '<path d="M' + px + " " + py + "L" + cx + " " + cy + '" stroke="#4A93C8" stroke-width="2" stroke-dasharray="2 3" fill="none"/>';
        if (gru) s += '<path d="M' + cx + " " + cy + "L" + X(i.L) + " " + Y(-i.D) + '" stroke="#4A93C8" stroke-width="2" stroke-dasharray="2 3" fill="none"/><text x="' + (X(i.L) - 6) + '" y="' + (Y(-i.D) - 6) + '" fill="#4A93C8" font-size="10" font-weight="700" text-anchor="end">corda fissata in B</text>';
        s += '<path d="M' + cx + " " + cy + "L" + X(i.xv) + " " + Y(i.zv) + '" stroke="#4A93C8" stroke-width="2" fill="none"/>';
        if (i.pm !== "1") {   // carrucola sul soccorritore: la corda gira e risale al carrello
          s += '<path d="M' + (cx + 6) + " " + cy + "L" + (X(i.xv) + 6) + " " + Y(i.zv) + '" stroke="#4A93C8" stroke-width="2" fill="none"/><circle cx="' + (X(i.xv) + 3) + '" cy="' + (Y(i.zv) + 2) + '" r="4.5" fill="none" stroke="#4A93C8" stroke-width="2"/>';
        }
        // traenti: dal carrello ai due capi, sotto le portanti, con gli operatori
        const xa = X(0), ya = Y(0) + 7, xb = X(i.L), yb = Y(-i.D) + 7;
        s += '<path d="M' + xa + " " + ya + "L" + cx + " " + (cy + 7) + "L" + xb + " " + yb + '" stroke="#3fa66b" stroke-width="2" stroke-dasharray="6 3" fill="none"/>';
        s += '<text x="' + (xa + 6) + '" y="' + (ya + 14) + '" fill="#3fa66b" font-size="10" font-weight="700">traente A</text><text x="' + (xb - 6) + '" y="' + (yb + 14) + '" fill="#3fa66b" font-size="10" font-weight="700" text-anchor="end">traente B</text>';
      }
      // carrello e vittima
      s += '<rect x="' + (X(rec.x) - 7) + '" y="' + (Y(rec.zc) - 5) + '" width="14" height="10" rx="2" fill="#ffd700"/>';
      s += '<rect x="' + (X(ris.x) - 7) + '" y="' + (Y(ris.zc) - 5) + '" width="14" height="10" rx="2" fill="none" stroke="#ffd700" stroke-dasharray="3 2"/><text x="' + X(ris.x) + '" y="' + (Y(ris.zc) - 10) + '" fill="#ffd700" font-size="10" text-anchor="middle">traslazione</text>';
      if (i.pm === "3") { const dd = Math.max(0, rec.zc - i.zv); s += '<path d="M' + X(ris.x) + " " + Y(ris.zc) + "L" + X(ris.x) + " " + Y(ris.zc - dd) + '" stroke="#4A93C8" stroke-width="1.2" stroke-dasharray="3 3" opacity=".7"/><circle cx="' + X(ris.x) + '" cy="' + Y(ris.zc - dd) + '" r="4" fill="none" stroke="#ff9f1c" stroke-dasharray="2 2"/>'; }
      s += '<circle cx="' + X(i.xv) + '" cy="' + (Y(i.zv) - 6) + '" r="6" fill="#ff9f1c"/><text x="' + (X(i.xv) - 10) + '" y="' + (Y(i.zv) + 14) + '" fill="#ff9f1c" font-size="11" font-weight="700" text-anchor="end">soccorritore</text>';
      s += '<circle cx="' + (X(i.xv) + 22) + '" cy="' + (Y(i.zv) - 5) + '" r="5" fill="#3fa66b"/><text x="' + (X(i.xv) + 30) + '" y="' + (Y(i.zv) + 4) + '" fill="#3fa66b" font-size="12" font-weight="700">vittima</text>';
      s += "</svg>";
      $("#tf-sv").innerHTML = s;
    }

    function aggiorna() {
      const i = {
        L: Math.max(3, num("#tf-L", 40)), D: num("#tf-D", 0), xv: num("#tf-xv", 20), zv: num("#tf-zv", -10),
        Ws: Math.max(1, num("#tf-Ws", 100)), Wv: Math.max(0, num("#tf-Wv", 100)), T0: Math.max(1, num("#tf-T0", 300)), e: Math.max(0.1, num("#tf-e", 5)), F: Math.max(1, num("#tf-F", 150)), w: Math.max(0.001, num("#tf-w", 0.075)), m: Math.max(0, num("#tf-m", 3)),
        pm: $("#tf-pm").value, pm2: num("#tf-pm2", 5)
      };
      i.Q = i.Ws + i.Wv; $("#tf-Qt").textContent = fmt(i.Q, 0) + " kg";
      const xcRaw = num("#tf-xc", 50) / 100 * i.L, k = calcola(i), ris = k.sotto(xcRaw), rec = k.sotto(i.xv);   // ris: carrello in traslazione, rec: carrello sulla verticale della vittima
      $("#tf-xcl").textContent = "· " + fmt(ris.x, 1) + " m da A";
      $("#tf-vnota").textContent = i.xv < 0 || i.xv > i.L ? "La vittima è fuori dalla luce tra A e B: il carrello si ferma al più vicino." : "";
      const av = [];
      // lunghezze
      const kg = n => fmt(n / G, 0), pc = (a, b) => fmt(100 * a / b, 1);
      const mid = k.sotto(i.L / 2), Sload = mid.l1 + mid.l2;
      const lungP = k.Su + 2 * i.m, tr = Sload + 2 * i.m;   // ogni traente copre tutta la luce (come le portanti), legato al carrello e ai due capi
      const quotaCarrello = rec.zc, calata = quotaCarrello - i.zv;
      let TAm = 0, TBm = 0, HAm = 0, VAm = 0, VBm = 0, dMax = 0, TMax = 0;   // massimi lungo la traslazione (compreso il punto di recupero)
      [rec, ris].concat(Array.from({length: 41}, (_, n) => k.sotto(0.5 + (i.L - 1) * n / 40))).forEach(q => { if (q.TA > TAm) { TAm = q.TA; VAm = Math.abs(q.VA); HAm = q.H; } if (q.TB > TBm) { TBm = q.TB; VBm = Math.abs(q.VB); } dMax = Math.max(dMax, q.d); TMax = Math.max(TMax, q.TA, q.TB); });
      // pescante: la corda parte dal punto fisso (A nei tipi 1 e 2, B nel tipo 3), corre lungo la portante fino alla carrucola del carrello e scende
      const gruB = i.pm === "3", lMax = Math.max(rec.l1 + rec.l2, ...Array.from({length: 41}, (_, n) => { const q = k.sotto(0.5 + (i.L - 1) * n / 40); return q.l1 + q.l2; })), tratto = gruB ? lMax : rec.l1, nCalata = i.pm === "1" ? 1 : 2, drop = Math.max(0, calata);
      const corda = tratto + nCalata * drop + i.pm2, div = i.pm === "1" ? 1 : 2, tiroDisc = i.Ws * G / div, tiroRis = i.Q * G / div;
      const cordaTxt = (gruB ? "da A al carrello e a B " + fmt(lMax, 1) + " m (il valore più lungo lungo la traslazione), " : "da A al carrello " + fmt(tratto, 1) + " m, ") + (nCalata === 1 ? "calata " + fmt(drop, 1) + " m" : "calata e risalita " + fmt(drop, 1) + " m + " + fmt(drop, 1) + " m") + ", margine " + fmt(i.pm2, 1) + " m";
      $("#tf-pnota").textContent = i.pm === "1" ? "Corda fissata in A, passa nella carrucola del carrello e scende: il soccorritore arriva alla vittima, che non è collegata al carrello. Vantaggio 1:1." : i.pm === "2" ? "Come il tipo 1, ma sul soccorritore c’è una carrucola: la corda scende, gira e risale fino al carrello dove si fissa. Vantaggio 1:2." : "Gru edile: la corda è fissata in A e in B: parte da A, passa nel carrello, scende alla carrucola del soccorritore, risale al carrello e va a B. Vantaggio 1:2. Con la corda fissa ai due capi la traslazione avviene a quota costante: soccorritore e vittima restano alla stessa distanza sotto il carrello";
      if (calata < 0) av.push("La vittima è più in alto del carrello (" + fmt(-calata, 1) + " m): serve un recupero verso l’alto.");
      if (TMax / G > 1000) av.push("Tensione molto alta su una portante: verifica il carico di rottura della corda e degli ancoraggi.");
      const freccia = ris.d, fr = pc(freccia, i.L);
      const al0 = k.S0 - k.Su, alC = Sload - k.Su;
      const cell = (t, v, u, sub, cls) => '<div class="vcell' + (cls ? " " + cls : "") + '"><div class="k">' + t + '</div><div class="v">' + v + (u ? " <small>" + u + "</small>" : "") + "</div>" + (sub ? '<div class="k">' + sub + "</div>" : "") + "</div>";
      $("#tf-av").innerHTML = av.map(t => '<div class="avv' + (/fuori|non si cala|molto alta/.test(t) ? " rosso" : "") + '">' + t + "</div>").join("");
      $("#tf-r1").innerHTML = cell("Recupero: carrello sulla verticale della vittima", fmt(rec.zc, 2), "m", "quota rispetto ad A · freccia " + fmt(rec.d, 2) + " m (" + pc(rec.d, i.L) + " %) · tensione " + kg(Math.max(rec.TA, rec.TB)) + " kg") +
        cell("Forza massima sull’ancoraggio A", kg(2 * TAm), "kg", "due portanti · orizz. " + kg(2 * HAm) + " kg, vert. " + kg(2 * VAm) + " kg") +
        cell("Forza massima sull’ancoraggio B", kg(2 * TBm), "kg", "due portanti · carrello a " + fmt(i.Q, 0) + " kg") +
        cell("Tiro sulla corda del pescante", kg(tiroDisc) + " → " + kg(tiroRis), "kg", "discesa con il soccorritore → risalita con la vittima · " + (div === 1 ? "1:1" : "1:2, carrucola sul soccorritore"));
      $("#tf-r2").innerHTML = cell("Traslazione: freccia sotto carico al carrello", fmt(ris.d, 2), "m", pc(ris.d, i.L) + " % della distanza · tensione " + kg(Math.max(ris.TA, ris.TB)) + " kg") +
        cell("Freccia massima lungo la linea", fmt(dMax, 2), "m", pc(dMax, i.L) + " % della distanza · tensione massima " + kg(TMax) + " kg (tesatura a vuoto " + fmt(i.T0, 0) + " kg)") +
        cell("Freccia a vuoto (peso corda, al centro)", fmt(k.f0, 2), "m", pc(k.f0, i.L) + " %") +
        cell("Allungamento a tesatura (per portante)", fmt(al0 * 100, 0), "cm", pc(al0, k.Su) + " % della lunghezza a riposo") +
        cell("Allungamento sotto carico (per portante)", fmt(alC * 100, 0), "cm", pc(alC, k.Su) + " % della lunghezza a riposo");
      $("#tf-r3").innerHTML = cell("Lunghezza di ogni portante a riposo", fmt(k.Su, 1), "m", "corda tesa " + fmt(k.S0, 1) + " m · distanza A–B " + fmt(k.C, 1) + " m") +
        cell("Portante da tagliare (con nodi)", fmt(lungP, 1), "m", "più " + fmt(i.m, 1) + " m per capo · ne servono 2") +
        cell("Traenti del carrello (2)", fmt(tr, 1), "m", "ciascuno, come le portanti · legati al carrello, uno tira verso A e uno verso B · in tutto " + fmt(2 * tr, 0) + " m") +
        cell("Corda minima del pescante (tipo " + i.pm + ")", fmt(corda, 1), "m", cordaTxt, "g") +
        cell("Per mandare giù soccorritore e vittima", fmt(nCalata * drop, 1), "m", "corda da lasciar scorrere dal capo, oltre al tratto in linea · " + (nCalata === 1 ? "il soccorritore scende con un solo capo" : "due capi: la carrucola scende di " + fmt(drop, 1) + " m")) +
        cell("Per tirare su", fmt(nCalata * drop, 1), "m", "da recuperare con " + fmt(tiroRis / G, 0) + " kg di tiro (soccorritore + vittima " + fmt(i.Q, 0) + " kg" + (div === 2 ? ", vantaggio 1:2" : "") + ")");
      disegna(i, k, ris, rec);
    }
    root.addEventListener("input", aggiorna);
    root.addEventListener("change", aggiorna);
    aggiorna();
  }
});
