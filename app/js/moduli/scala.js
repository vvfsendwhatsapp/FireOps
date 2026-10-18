/* FireOps VVF - modulo "scala" (funzione SAF): scala appoggiata al muro con sistema discensore, taglia 2:1.
 * Stato limite di ribaltamento: piede minimo in funzione dell'angolo di uscita della corda.
 * Stesse formule dello strumento "Analisi ribaltamento scala" (html/scala_discensore.html):
 *   T = P/2;  F = T*(cos a, sin a - 2);  |F| = (P/2)*sqrt(5 + 4 sin a)
 *   d_min = L cos a / sqrt(5 + 4 sin a)               (senza peso della scala)
 *   d_min,Wl = L cos a / sqrt(1 + k^2 + 2k sin a),  k = 2 + Wl/P
 *   beta = atan((2 - sin a)/cos a)                     (angolo della scala sull'orizzontale)
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
.pg-scala .tab { width: 100%; border-collapse: collapse; font-size: 12.5px; }
.pg-scala .tab th { color: var(--text-dim); font-weight: 400; font-size: 11px; text-align: right; padding: 4px 2px; }
.pg-scala .tab td { padding: 5px 2px; border-top: 1px solid var(--line); text-align: right; font-variant-numeric: tabular-nums; }
.pg-scala .tab th:first-child, .pg-scala .tab td:first-child { text-align: left; }
.pg-scala .tab tr.cur td { background: rgba(255,215,0,.1); }
.pg-scala .tab td.e { color: #e8734a; font-weight: 700; }
.pg-scala .tab td.w { color: var(--yellow); font-weight: 700; }
`,

  html: `
<div class="blocco">
  <h2 class="tit">Dati</h2>
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
  <h2 class="tit">Schema</h2>
  <div id="sc-sv"></div>
  <p class="nota">Il muro è a sinistra, la testa della scala è ancorata in alto. La freccia rossa è la forza risultante sull’ancoraggio, la linea blu è la corda verso il discensore. Il segno verde a terra è il piede minimo.</p>
</div>

<div class="blocco">
  <h2 class="tit">Stati limite al variare dell’alzo</h2>
  <table class="tab" id="sc-t"></table>
  <p class="nota">In rosso il ribaltamento con il piede impostato, in giallo un margine sotto 0,5 m. Si consiglia un coefficiente di sicurezza almeno 2 sul piede minimo, per gli effetti dinamici.</p>
</div>

<div class="blocco">
  <h2 class="tit">Ipotesi</h2>
  <p class="nota" style="margin-top:0">Analisi statica piana. La scala è appoggiata a un muro liscio (solo reazione normale) e a terra ha attrito. La corda forma una taglia 2:1 dall’ancoraggio in testa: il carico dà T = P/2 in ogni tratto. Si trascurano effetti dinamici. Per verificare l’attrito al piede serve un coefficiente almeno pari a cos α / (2 − sin α). Non sostituisce la verifica del tuo istruttore SAF.</p>
</div>
`,

  init(root) {
    "use strict";
    const $ = s => root.querySelector(s);
    const G = 9.81, RAD = Math.PI / 180;
    const fmt = (v, d) => Number(v).toLocaleString("it-IT", {minimumFractionDigits: d, maximumFractionDigits: d});
    const num = (id, d) => { const v = parseFloat($(id).value); return isFinite(v) ? v : d; };

    function calc(P_kg, Wl_kg, a_deg, L) {
      const P = P_kg * G, Wl = Wl_kg * G, T = P / 2, a = a_deg * RAD, ca = Math.cos(a), sa = Math.sin(a);
      const kw = 2 + Wl / P, d2 = Math.sqrt(Math.max(0, 5 + 4 * sa)), dw = Math.sqrt(Math.max(0, 1 + kw * kw + 2 * kw * sa));
      return {
        piede2: d2 > 0 ? L * ca / d2 : 0, piedeW: dw > 0 ? L * ca / dw : 0,
        beta: Math.atan2(2 - sa, ca) / RAD, Fx: T * ca, Fy: T * (sa - 2), Fmag: T * d2, T, ca, sa
      };
    }

    function schema(L, d, alzo, r) {
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
      // corda al discensore
      const rx = x0 + 70 * Math.cos(a), ry = yh + 70 * Math.sin(a);
      s += '<path d="M' + x0 + ' ' + yh + 'L' + rx + ' ' + ry + '" stroke="#4A93C8" stroke-width="2.5"/><text x="' + (rx + 4) + '" y="' + (ry + (alzo >= 0 ? 12 : -4)) + '" font-size="11" fill="#4A93C8">discensore</text>';
      // due tratti verso il carico
      s += '<path d="M' + (x0 + 6) + ' ' + yh + 'v42M' + (x0 + 14) + ' ' + yh + 'v42" stroke="#8b96a3" stroke-width="2"/><rect x="' + (x0 - 2) + '" y="' + (yh + 42) + '" width="26" height="14" rx="3" fill="#ffd700"/>';
      // forza risultante
      const fx = r.Fx * fs, fy = -r.Fy * fs;
      s += '<path d="M' + x0 + ' ' + yh + 'l' + fx + ' ' + fy + '" stroke="#d8262f" stroke-width="3"/>';
      s += '<circle cx="' + x0 + '" cy="' + yh + '" r="5" fill="#eceff3"/>';
      s += '<text x="' + (x0 + 10) + '" y="' + (yh - 8) + '" font-size="11" fill="#eceff3">|F| ' + fmt(r.Fmag, 0) + ' N</text>';
      return s + "</svg>";
    }

    function aggiorna() {
      const P = Math.max(30, num("#sc-P", 100)), Wl = Math.max(0, num("#sc-Wl", 35)), L = Math.max(2, num("#sc-L", 10.33));
      const d = Math.max(0.3, num("#sc-d", 4)), al = num("#sc-a", 0);
      $("#sc-al").textContent = al + "°";
      const r = calc(P, Wl, al, L), margine = d - r.piede2;
      const cl = margine < 0 ? "err" : margine < 0.5 ? "warn" : "ok";
      $("#sc-st").className = "stato " + cl;
      $("#sc-st").textContent = {ok: "STABILE: margine positivo", warn: "ATTENZIONE: margine sotto 0,5 m", err: "RIBALTAMENTO: aumenta il piede"}[cl];
      const c = (k, v, u) => '<div class="vcell"><div class="k">' + k + '</div><div class="v">' + v + " <small>" + u + "</small></div></div>";
      $("#sc-m").innerHTML = c("Piede minimo senza peso scala", fmt(r.piede2, 2), "m") + c("Piede minimo con peso scala", fmt(r.piedeW, 2), "m") +
        c("Margine", (margine >= 0 ? "+" : "") + fmt(margine, 2), "m") + c("Angolo della scala", fmt(r.beta, 1), "°") +
        c("Forza sull’ancoraggio", fmt(r.Fmag, 0), "N") + c("Tensione della corda", fmt(r.T, 0), "N");
      $("#sc-f").textContent = "F = (" + fmt(r.Fx, 0) + " N, " + fmt(r.Fy, 0) + " N). Attrito richiesto al piede: " + fmt(r.ca / (2 - r.sa), 2) + ".";
      $("#sc-sv").innerHTML = schema(L, d, al, r);
      let t = "<tr><th>Alzo</th><th>Piede min. senza scala</th><th>con scala</th><th>Angolo</th><th>|F| (N)</th></tr>";
      for (let a = -90; a <= 90; a += 15) {
        const q = calc(P, Wl, a, L), m = d - q.piede2, cls = m < 0 ? "e" : m < 0.5 ? "w" : "";
        t += '<tr' + (Math.abs(a - al) < 7.5 ? ' class="cur"' : "") + "><td>" + a + '°</td><td class="' + cls + '">' + fmt(q.piede2, 2) + "</td><td>" + fmt(q.piedeW, 2) + "</td><td>" + fmt(q.beta, 0) + "°</td><td>" + fmt(q.Fmag, 0) + "</td></tr>";
      }
      $("#sc-t").innerHTML = t;
    }
    root.addEventListener("input", aggiorna);
    aggiorna();
  }
});
