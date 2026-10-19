/* FireOps VVF - modulo "scala" (funzione SAF): scala appoggiata al muro con sistema discensore, con o senza taglia 2:1 sulla barella.
 * Stato limite di ribaltamento: piede minimo in funzione dell'angolo di uscita della corda.
 * Due modalita': con taglia 2:1 sulla barella (n = 2 tratti verticali) o senza taglia (n = 1 tratto).
 *   T = P/n;  F = T*(cos a, -(n + sin a))  (forza sull'ancoraggio, y verso l'alto);  |F| = T*sqrt(1 + n^2 + 2 n sin a)
 *   d_min = L cos a / sqrt(1 + n^2 + 2 n sin a)        (senza peso della scala)
 *   d_min,Wl = L cos a / sqrt(1 + k^2 + 2k sin a),  k = n (1 + Wl/(2P))
 *   beta = atan((n + sin a)/cos a)                     (angolo della scala sull'orizzontale)
 * Con n = 2 coincide con lo strumento "Analisi ribaltamento scala" (html/scala_discensore.html).
 * a = alzo del discensore: positivo verso il basso, negativo verso l'alto.
 */
FireOps.registra({
  id: "scala",

  css: `
.pg-scala { --acc: var(--ics-operazioni); max-width: 640px; margin: 0 auto; padding: 12px 16px calc(24px + env(safe-area-inset-bottom, 0px)); color: var(--text); font-family: var(--sans); }
.pg-scala * { box-sizing: border-box; }
.pg-scala .blocco { margin-bottom: 10px; background: var(--panel); border: 1px solid var(--line); border-radius: 8px; padding: 12px; }
.pg-scala .tit { margin: 0 0 8px; font-size: 15px; font-weight: 700; }
.pg-scala .nota { font-size: 12.5px; line-height: 1.45; color: var(--text-dim); margin: 8px 0 0; }
.pg-scala .riga { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 10px; }
.pg-scala .riga:first-of-type { margin-top: 0; }
.pg-scala label { display: block; font-size: 12.5px; color: var(--text-dim); margin-bottom: 4px; }
.pg-scala input[type=number] { width: 100%; min-height: 44px; padding: 0 10px; border-radius: 6px; border: 1px solid var(--line); background: var(--bg); color: var(--text); font: inherit; font-size: 16px; }
.pg-scala select { width: 100%; min-height: 44px; padding: 0 10px; border-radius: 6px; border: 1px solid var(--line); background: var(--bg); color: var(--text); font: inherit; font-size: 16px; }
.pg-scala input[type=range] { width: 100%; min-height: 44px; accent-color: var(--yellow); }
.pg-scala input:focus-visible { outline: 2px solid var(--text); outline-offset: 2px; }
.pg-scala .stato { padding: 12px; border-radius: 8px; font-weight: 800; font-size: 15px; text-align: center; border: 2px solid; }
.pg-scala .stato.ok { border-color: #3fa66b; color: #3fa66b; background: rgba(63,166,107,.1); }
.pg-scala .stato.warn { border-color: var(--yellow); color: var(--yellow); background: rgba(255,215,0,.08); }
.pg-scala .stato.err { border-color: #e8734a; color: #e8734a; background: rgba(232,115,74,.1); }
.pg-scala .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 10px; }
.pg-scala .vcell { background: var(--bg); border: 1px solid var(--line); border-radius: 8px; padding: 10px 12px; }
.pg-scala .vcell .k { font-size: 12px; color: var(--text-dim); }
.pg-scala .vcell .v { font-size: 21px; font-weight: 800; margin-top: 2px; font-variant-numeric: tabular-nums; }
.pg-scala .vcell .v small { font-size: 13px; font-weight: 600; color: var(--text-dim); }
.pg-scala svg { width: 100%; height: auto; display: block; background: var(--bg); border: 1px solid var(--line); border-radius: 8px; }
.pg-scala .vista { background: var(--bg); border: 1px solid var(--line); border-radius: 8px; overflow: hidden; touch-action: none; }
.pg-scala canvas { display: block; width: 100%; height: 300px; cursor: grab; }
.pg-scala .barra { display: grid; grid-template-columns: repeat(auto-fit, minmax(92px, 1fr)); gap: 8px; margin-top: 8px; }
.pg-scala .barra button { min-height: 48px; padding: 0 10px; border: 1px solid var(--line); border-radius: 8px; background: var(--panel-2); color: var(--text); font: inherit; font-size: 14px; font-weight: 600; cursor: pointer; }
.pg-scala .barra button:focus-visible, .pg-scala canvas:focus-visible { outline: 2px solid var(--text); outline-offset: 2px; }
.pg-scala .allarme { margin-bottom: 10px; padding: 12px 14px; border-radius: 8px; border: 2px solid #d8262f; background: rgba(216,38,47,.16); color: #ff6b6b; font-weight: 800; font-size: 15px; line-height: 1.35; }
.pg-scala .allarme small { display: block; margin-top: 4px; font-weight: 600; font-size: 12.5px; color: var(--text); }
.pg-scala .allarme.giallo { border-color: var(--yellow); background: rgba(255,215,0,.1); color: var(--yellow); }
.pg-scala .allarme[hidden] { display: none; }
.pg-scala .tab { width: 100%; border-collapse: collapse; font-size: 12.5px; }
.pg-scala .tab th { color: var(--text-dim); font-weight: 400; font-size: 11px; text-align: right; padding: 4px 2px; }
.pg-scala .tab td { padding: 5px 2px; border-top: 1px solid var(--line); text-align: right; font-variant-numeric: tabular-nums; }
.pg-scala .tab th:first-child, .pg-scala .tab td:first-child { text-align: left; }
.pg-scala .tab tr.cur td { background: rgba(255,215,0,.1); }
.pg-scala .tab td.e { color: #e8734a; font-weight: 700; }
.pg-scala .tab td.w { color: var(--yellow); font-weight: 700; }
`,

  html: `
<div class="allarme" id="sc-all" role="alert" hidden></div>
<div class="blocco">
  <h2 class="tit">Vista 3D</h2>
  <div class="vista"><canvas id="sc-cv" tabindex="0" role="img" aria-label="Scala appoggiata al muro in 3D: trascina per ruotare"></canvas></div>
  <div class="barra">
    <button type="button" id="sc-lato">Di lato</button>
    <button type="button" id="sc-fronte">Dal muro</button>
    <button type="button" id="sc-alto">Dall’alto</button>
    <button type="button" id="sc-iso">3D</button>
    <button type="button" id="sc-pan" aria-pressed="false">Sposta</button>
    <button type="button" id="sc-zm" aria-label="Allontana">−</button>
    <button type="button" id="sc-zp" aria-label="Avvicina">+</button>
  </div>
  <p class="nota">Trascina per ruotare, pizzica o usa la rotella per lo zoom. Per spostare la vista usa due dita, il tasto destro del mouse (o Maiusc) oppure il pulsante «Sposta». I pulsanti delle viste la riportano al centro. Il centro della vista è la scala; la linea tratteggiata del discensore può uscire dal disegno. Gli anelli bianchi si spostano: quello al piede della scala ne cambia la distanza dal muro, quello sulla corda il suo angolo (alzo). Il muro è il reticolo grigio, il terreno quello più scuro; la freccia rossa è la forza sull’ancoraggio, la linea blu la corda verso il discensore, il segno verde a terra il piede minimo. Gli elementi più vicini sono più marcati.</p>
</div>

<div class="blocco">
  <h2 class="tit">Schema</h2>
  <div id="sc-sv"></div>
  <p class="nota">Il muro è a sinistra, la testa della scala è ancorata in alto. La freccia rossa è la forza risultante sull’ancoraggio, la linea blu è la corda verso il discensore. Il segno verde a terra è il piede minimo.</p>
</div>

<div class="blocco">
  <h2 class="tit">Dati</h2>
  <div class="riga" style="margin-top:0"><div style="grid-column:1/-1"><label for="sc-md">Barella</label>
    <select id="sc-md"><option value="T">Con taglia 2:1 sulla barella (due tratti di corda)</option><option value="S">Senza taglia (un solo tratto, la barella appesa alla corda)</option></select></div></div>
  <div class="riga">
    <div><label for="sc-P">Carico operatore (kg)</label><input type="number" id="sc-P" inputmode="decimal" min="30" max="250" step="1" value="100"></div>
    <div><label for="sc-Wl">Peso della scala (kg)</label><input type="number" id="sc-Wl" inputmode="decimal" min="0" max="120" step="1" value="35"></div>
  </div>
  <div class="riga">
    <div><label for="sc-L">Lunghezza scala (m)</label><input type="number" id="sc-L" inputmode="decimal" min="2" max="20" step="0.01" value="10.33"></div>
    <div><label for="sc-d">Piede dal muro (m)</label><input type="number" id="sc-d" inputmode="decimal" min="0.3" max="12" step="0.1" value="4"></div>
  </div>
  <div style="margin-top:10px"><label for="sc-a">Alzo del discensore: <b id="sc-al">0°</b> (positivo verso il basso, negativo verso l’alto)</label>
    <input type="range" id="sc-a" min="-90" max="90" step="5" value="0"></div>
</div>

<div class="blocco">
  <h2 class="tit">Esito</h2>
  <div class="stato ok" id="sc-st" role="status"></div>
  <div class="grid" id="sc-m"></div>
  <p class="nota" id="sc-f"></p>
</div>

<div class="blocco">
  <h2 class="tit">Stati limite al variare dell’alzo</h2>
  <table class="tab" id="sc-t"></table>
  <p class="nota">In rosso il ribaltamento con il piede impostato, in giallo un margine sotto 0,5 m. Si consiglia un coefficiente di sicurezza almeno 2 sul piede minimo, per gli effetti dinamici.</p>
</div>

<div class="blocco">
  <h2 class="tit">Ipotesi</h2>
  <p class="nota" style="margin-top:0">Analisi statica piana. La scala è appoggiata a un muro liscio (solo reazione normale) e a terra ha attrito. Con la taglia 2:1 sulla barella la corda ha due tratti verticali e T = P/2 in ogni tratto; senza taglia c’è un solo tratto e T = P. La corda passa dall’ancoraggio in testa e va al discensore. Si trascurano effetti dinamici. Per verificare l’attrito al piede serve un coefficiente almeno pari a cos α / (n + sin α), con n = 2 con la taglia e n = 1 senza. Non sostituisce la verifica del tuo istruttore SAF.</p>
</div>
`,

  init(root) {
    "use strict";
    const $ = s => root.querySelector(s);
    const G = 9.81, RAD = Math.PI / 180;
    const fmt = (v, d) => Number(v).toLocaleString("it-IT", {minimumFractionDigits: d, maximumFractionDigits: d});
    const num = (id, d) => { const v = parseFloat($(id).value); return isFinite(v) ? v : d; };

    const hAlt = (L, d) => Math.sqrt(Math.max(0.01, L * L - Math.min(d, L * 0.999) ** 2));
    const nTratti = () => ($("#sc-md").value === "S" ? 1 : 2);
    function calc(P_kg, Wl_kg, a_deg, L, n) {
      n = n || nTratti();
      const P = P_kg * G, Wl = Wl_kg * G, T = P / n, a = a_deg * RAD, ca = Math.cos(a), sa = Math.sin(a);
      const kw = n * (1 + Wl / (2 * P)), d2 = Math.sqrt(Math.max(0, 1 + n * n + 2 * n * sa)), dw = Math.sqrt(Math.max(0, 1 + kw * kw + 2 * kw * sa));
      return {
        piede2: d2 > 0 ? L * ca / d2 : 0, piedeW: dw > 0 ? L * ca / dw : 0,
        beta: Math.atan2(n + sa, ca) / RAD, Fx: T * ca, Fy: -T * (n + sa), Fmag: T * d2, T, ca, sa, n
      };
    }

    function schema(L, d, alzo, r) {
      const n = r.n;
      const W = 300, H = 230, x0 = 46, yg = 200, sc = 160 / L;
      const dd = Math.min(d, L * 0.999), hh = Math.sqrt(L * L - dd * dd), xf = x0 + dd * sc, yh = yg - hh * sc;
      const a = alzo * RAD, fs = 70 / Math.max(r.T, 1);
      let s = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Schema della scala appoggiata al muro con la forza sull’ancoraggio">';
      s += '<path d="M' + x0 + ' 8V' + yg + 'H' + (W - 8) + '" stroke="#8b96a3" stroke-width="2" fill="none"/>';
      s += '<path d="M' + x0 + ' ' + yh + 'L' + xf + ' ' + yg + '" stroke="#e8734a" stroke-width="6" stroke-linecap="round"/>';
      // piede minimo
      const dm = Math.min(r.piede2, L), xm = x0 + dm * sc;
      s += '<path d="M' + xm + ' ' + (yg - 8) + 'V' + (yg + 8) + '" stroke="#3fa66b" stroke-width="3"/><text x="' + xm + '" y="' + (yg - 14) + '" font-size="11" fill="#3fa66b" text-anchor="middle">min ' + fmt(r.piede2, 2) + ' m</text>';
      s += '<text x="' + xf + '" y="' + (yg + 22) + '" font-size="11" fill="#eceff3" text-anchor="middle">piede ' + fmt(d, 2) + ' m</text>';
      // corda al discensore, prolungata tratteggiata fino a terra (o fino al bordo del disegno)
      const rx = x0 + 70 * Math.cos(a), ry = yh + 70 * Math.sin(a);
      let ex = rx, ey = ry;
      if (Math.sin(a) > 0.02) { const t = (yg - yh) / Math.sin(a); ex = x0 + t * Math.cos(a); ey = yg; if (ex > W - 8) { const t2 = (W - 8 - x0) / Math.cos(a); ex = W - 8; ey = yh + t2 * Math.sin(a); } }
      else if (Math.cos(a) > 0.02) { const t2 = (W - 8 - x0) / Math.cos(a); ex = W - 8; ey = Math.max(8, yh + t2 * Math.sin(a)); }
      s += '<path d="M' + rx + ' ' + ry + 'L' + ex + ' ' + ey + '" stroke="#4A93C8" stroke-width="2" stroke-dasharray="6 5" opacity=".8"/>';
      s += '<path d="M' + x0 + ' ' + yh + 'L' + rx + ' ' + ry + '" stroke="#4A93C8" stroke-width="2.5"/><text x="' + (rx + 4) + '" y="' + (ry + (alzo >= 0 ? 12 : -4)) + '" font-size="11" fill="#4A93C8">discensore</text>';
      // tratti verso il carico: due con la taglia, uno senza
      s += n === 2
        ? '<path d="M' + (x0 + 6) + ' ' + yh + 'v42M' + (x0 + 14) + ' ' + yh + 'v42" stroke="#8b96a3" stroke-width="2"/><rect x="' + (x0 - 2) + '" y="' + (yh + 42) + '" width="26" height="14" rx="3" fill="#ffd700"/>'
        : '<path d="M' + (x0 + 10) + ' ' + yh + 'v42" stroke="#8b96a3" stroke-width="2"/><rect x="' + (x0 - 2) + '" y="' + (yh + 42) + '" width="26" height="14" rx="3" fill="#ffd700"/>';
      // forza risultante
      const fx = r.Fx * fs, fy = -r.Fy * fs;
      s += '<path d="M' + x0 + ' ' + yh + 'l' + fx + ' ' + fy + '" stroke="#d8262f" stroke-width="3"/>';
      s += '<circle cx="' + x0 + '" cy="' + yh + '" r="5" fill="#eceff3"/>';
      s += '<text x="' + (x0 + 10) + '" y="' + (yh - 8) + '" font-size="11" fill="#eceff3">|F| ' + fmt(r.Fmag, 0) + ' N</text>';
      return s + "</svg>";
    }

    let aggiorna3 = () => {};
    function aggiorna() {
      const P = Math.max(30, num("#sc-P", 100)), Wl = Math.max(0, num("#sc-Wl", 35)), L = Math.max(2, num("#sc-L", 10.33));
      const d = Math.max(0.3, num("#sc-d", 4)), al = num("#sc-a", 0);
      $("#sc-al").textContent = al + "°";
      const n = nTratti(), r = calc(P, Wl, al, L, n), margine = d - r.piede2;
      const cl = margine < 0 ? "err" : margine < 0.5 ? "warn" : "ok";
      const al3 = $("#sc-all");
      if (margine < 0) { al3.hidden = false; al3.className = "allarme"; al3.innerHTML = "⚠ RIBALTAMENTO DELLA SCALA<small>Il piede è a " + fmt(d, 2) + " m dal muro, sotto il minimo di " + fmt(r.piede2, 2) + " m: la scala si ribalta. Allarga il piede di almeno " + fmt(-margine, 2) + " m o riduci il carico.</small>"; }
      else if (margine < 0.5) { al3.hidden = false; al3.className = "allarme giallo"; al3.innerHTML = "⚠ RISCHIO DI RIBALTAMENTO<small>Il margine sul piede minimo è di soli " + fmt(margine, 2) + " m. Si consiglia almeno 0,5 m, e un coefficiente 2 sul piede minimo per gli effetti dinamici.</small>"; }
      else al3.hidden = true;
      $("#sc-st").className = "stato " + cl;
      $("#sc-st").textContent = {ok: "STABILE: margine positivo", warn: "ATTENZIONE: margine sotto 0,5 m", err: "RIBALTAMENTO: aumenta il piede"}[cl];
      const c = (k, v, u) => '<div class="vcell"><div class="k">' + k + '</div><div class="v">' + v + " <small>" + u + "</small></div></div>";
      $("#sc-m").innerHTML = c("Piede minimo senza peso scala", fmt(r.piede2, 2), "m") + c("Piede minimo con peso scala", fmt(r.piedeW, 2), "m") +
        c("Margine", (margine >= 0 ? "+" : "") + fmt(margine, 2), "m") + c("Angolo della scala", fmt(r.beta, 1), "°") +
        c("Forza sull’ancoraggio", fmt(r.Fmag, 0), "N") + c("Tensione della corda", fmt(r.T, 0), "N");
      $("#sc-f").textContent = (n === 2 ? "Con taglia 2:1: due tratti verticali da P/2. " : "Senza taglia: un tratto da P, il carico pesa tutto sulla corda. ") + (r.sa > 0.02 ? "La linea del discensore arriva a terra a " + fmt(Math.min(hAlt(L, d) / r.sa, 2 * L) * r.ca, 1) + " m dal muro. " : "") + "F = (" + fmt(r.Fx, 0) + " N, " + fmt(r.Fy, 0) + " N). Attrito richiesto al piede: " + fmt(r.ca / (n + r.sa), 2) + ".";
      $("#sc-sv").innerHTML = schema(L, d, al, r);
      aggiorna3(L, d, al, r, P);
      let t = "<tr><th>Alzo</th><th>Piede min. senza scala</th><th>con scala</th><th>Angolo</th><th>|F| (N)</th></tr>";
      for (let a = -90; a <= 90; a += 15) {
        const q = calc(P, Wl, a, L, n), m = d - q.piede2, cls = m < 0 ? "e" : m < 0.5 ? "w" : "";
        t += '<tr' + (Math.abs(a - al) < 7.5 ? ' class="cur"' : "") + "><td>" + a + '°</td><td class="' + cls + '">' + fmt(q.piede2, 2) + "</td><td>" + fmt(q.piedeW, 2) + "</td><td>" + fmt(q.beta, 0) + "°</td><td>" + fmt(q.Fmag, 0) + "</td></tr>";
      }
      $("#sc-t").innerHTML = t;
    }
    // ---------- vista 3D: x = distanza dal muro, y = larghezza, z = altezza ----------
    let q3 = null;
    // punto in cui arriva la linea del discensore: a terra se scende, altrimenti dopo 1,5 L
    const estremo = g => {
      const a = g.al * RAD, ca = Math.cos(a), sa = Math.sin(a);
      if (sa > 0.02) { const t = Math.min(g.hh / sa, 2 * g.L); return [t * ca, 0, g.hh - t * sa]; }
      const t = g.L * 1.5; return [t * ca, 0, g.hh - t * sa];
    };
    let v3 = null;
    const avvia3d = () => { v3 = SafVista3D.crea($("#sc-cv"), {
      trascina: (id, px, py, c) => trascina(id, px, py, c),
      punti: () => { const g = q3 || {L: 10, d: 4, hh: 9}; return [[-0.5, -2.5, 0], [g.d + 2, 2.5, g.hh + 1], [0, 0, g.hh]]; },
      disegna: c => {
        if (!q3) return;
        const {L, d, hh, r, al, P} = q3, {ctx, pr, linea} = c;
        const ph = Math.PI / 180 * al, ym = 0.25;
        const txt = (t, q, col, dx, dy) => { const p = pr(q); ctx.globalAlpha = c.chiaro(p[2]); ctx.fillStyle = col; ctx.font = "bold 12px sans-serif"; ctx.textAlign = "center"; ctx.fillText(t, p[0] + (dx || 0), p[1] + (dy || 0)); ctx.globalAlpha = 1; };
        const W = Math.max(3, L / 3), xe = d + 2;
        // muro (piano x = 0) e terreno (piano z = 0)
        for (let z = 0; z <= hh + 1; z += 1) linea([0, -W, z], [0, W, z], "#4a5460", 1);
        for (let y = -W; y <= W + 1e-6; y += 1) linea([0, y, 0], [0, y, hh + 1], "#4a5460", 1);
        for (let x = 0; x <= xe + 1e-6; x += 1) linea([x, -W, 0], [x, W, 0], "#2e3844", 1);
        for (let y = -W; y <= W + 1e-6; y += 1) linea([0, y, 0], [xe, y, 0], "#2e3844", 1);
        txt("MURO", [0, 0, hh + 1.3], "#8b96a3"); txt("TERRENO", [xe, 0, 0], "#8b96a3", 0, 14);
        // scala: due montanti e pioli
        [-ym, ym].forEach(y => linea([d, y, 0], [0, y, hh], "#e8734a", 5));
        const n = Math.max(3, Math.round(L / 0.3));
        for (let i = 1; i < n; i++) { const t = i / n; linea([d * (1 - t), -ym, hh * t], [d * (1 - t), ym, hh * t], "#e8734a", 2); }
        // piede minimo
        const dm = Math.min(r.piede2, xe);
        linea([dm, -ym - 0.3, 0], [dm, ym + 0.3, 0], "#3fa66b", 3);
        txt("piede min " + fmt(r.piede2, 2) + " m", [dm, 0, 0], "#3fa66b", 0, -8);
        // ancoraggio, due tratti verso il carico, corda al discensore
        const A = [0, 0, hh], zc = Math.max(0.3, hh - 2.5);
        linea(A, [0.04, 0, zc], "#8b96a3", 2); if (r.n === 2) linea([0.14, 0, hh], [0.14, 0, zc], "#8b96a3", 2);
        const pc = pr([0.04, 0, zc]); ctx.fillStyle = "#ffd700"; ctx.fillRect(pc[0] - 9, pc[1] - 5, 18, 12);
        txt(fmt(P, 0) + " kg", [0.04, 0, zc], "#ffd700", 0, 24);
        const ro = Math.min(L * 0.35, 3);
        linea(A, [ro * Math.cos(ph), 0, hh - ro * Math.sin(ph)], "#4A93C8", 3);
        txt("discensore", [ro * Math.cos(ph), 0, hh - ro * Math.sin(ph)], "#4A93C8", 0, -6);
        // prolungamento tratteggiato della linea del discensore, fino a terra se scende
        const E = estremo(q3);
        linea([ro * Math.cos(ph), 0, hh - ro * Math.sin(ph)], E, "#4A93C8", 2, [6, 5]);
        if (E[2] < 0.01 && E[0] < xe + L) { const pe = pr(E); ctx.fillStyle = "#4A93C8"; ctx.beginPath(); ctx.arc(pe[0], pe[1], 4, 0, 7); ctx.fill(); txt("a terra " + fmt(E[0], 1) + " m dal muro", E, "#4A93C8", 0, 16); }
        // forza sull'ancoraggio
        const k = Math.min(L * 0.45, 4.5) / Math.max(r.Fmag, 1);
        const F = [r.Fx * k, 0, r.Fy * k];
        linea(A, [A[0] + F[0], 0, A[2] + F[2]], "#d8262f", 4);
        const pf = pr([A[0] + F[0], 0, A[2] + F[2]]), p0 = pr(A), an = Math.atan2(pf[1] - p0[1], pf[0] - p0[0]);
        ctx.fillStyle = "#d8262f"; ctx.beginPath(); ctx.moveTo(pf[0], pf[1]); ctx.lineTo(pf[0] - 11 * Math.cos(an - 0.4), pf[1] - 11 * Math.sin(an - 0.4)); ctx.lineTo(pf[0] - 11 * Math.cos(an + 0.4), pf[1] - 11 * Math.sin(an + 0.4)); ctx.fill();
        txt(fmt(r.Fmag, 0) + " N", [A[0] + F[0], 0, A[2] + F[2]], "#d8262f", 0, 16);
        c.maniglia("piede", [d, 0, 0], "piede " + fmt(d, 1) + " m");
        c.maniglia("alzo", [ro * Math.cos(ph), 0, hh - ro * Math.sin(ph)], "alzo " + al + "°");
        const pa = pr(A); ctx.fillStyle = "#eceff3"; ctx.beginPath(); ctx.arc(pa[0], pa[1], 5, 0, 7); ctx.fill();
      }
    }); v3.disegna(); };
    if (window.SafVista3D) avvia3d();
    else { const sc = document.createElement("script"); sc.src = "js/saf-vista3d.js?v=" + (window.FIREOPS_VERSIONE || ""); sc.onload = avvia3d; document.head.appendChild(sc); }
    function trascina(id, px, py, c) {
      // trova il valore che porta la maniglia piu' vicina al dito (ricerca sui valori ammessi)
      const L = q3.L, ph = a => a * Math.PI / 180, ro = Math.min(L * 0.35, 3), hhd = dd => Math.sqrt(Math.max(0.01, L * L - dd * dd));
      let bv = null, bd = 1e9;
      if (id === "piede") {
        for (let dd = 0.3; dd <= Math.min(12, L * 0.99); dd += 0.1) { const p = c.pr([dd, 0, 0]), q = Math.hypot(p[0] - px, p[1] - py); if (q < bd) { bd = q; bv = Math.round(dd * 10) / 10; } }
        if (bv != null) $("#sc-d").value = String(bv);
      } else {
        const hh = q3.hh;
        for (let a = -90; a <= 90; a += 5) { const p = c.pr([ro * Math.cos(ph(a)), 0, hh - ro * Math.sin(ph(a))]), q = Math.hypot(p[0] - px, p[1] - py); if (q < bd) { bd = q; bv = a; } }
        if (bv != null) $("#sc-a").value = String(bv);
      }
      aggiorna();
    }
    const vista = (y, p) => () => v3 && v3.vista(y, p);
    $("#sc-lato").addEventListener("click", vista(0, 0.05));
    $("#sc-fronte").addEventListener("click", vista(Math.PI / 2, 0.05));
    $("#sc-alto").addEventListener("click", vista(0, 1.5));
    $("#sc-iso").addEventListener("click", vista(-0.7, 0.45));
    $("#sc-pan").addEventListener("click", () => { const on = $("#sc-pan").getAttribute("aria-pressed") !== "true"; $("#sc-pan").setAttribute("aria-pressed", on); $("#sc-pan").style.background = on ? "var(--yellow)" : ""; $("#sc-pan").style.color = on ? "#10141a" : ""; v3 && v3.modo(on ? "sposta" : "ruota"); });
    $("#sc-zm").addEventListener("click", () => v3 && v3.zoom(0.8)); $("#sc-zp").addEventListener("click", () => v3 && v3.zoom(1.25));
    aggiorna3 = (L, d, al, r, P) => { q3 = {L, d, hh: Math.sqrt(Math.max(0.01, L * L - Math.min(d, L * 0.999) ** 2)), r, al, P}; if (v3) v3.disegna(); };
    root.addEventListener("input", aggiorna);
    aggiorna();
  }
});
