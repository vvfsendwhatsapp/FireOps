/* FireOps VVF - modulo "taglio" (funzione Operazioni)
 * Taglio di tronchi e rami a terra o ancora attaccati: dove sono compresse e tese le fibre,
 * dove fare lo scarico e quanto profondo, in che ordine tagliare.
 * Versione semplificata per smartphone dello strumento "Sezionatura":
 * asse orizzontale, solo peso proprio, trave elastica a sezione circolare piena.
 * Stile: lo stesso di Trigo (schede con titolo, avvisi a riquadro, selezione gialla, accento della sezione).
 */
FireOps.registra({
  id: "taglio",

  css: `
.pg-taglio {
  --acc: var(--ics-operazioni);
  --compr: #E4572E; --traz: #4A93C8; --legno: #C9A227; --ok: #3fa66b; --bad: #e8734a; --line2: #3a4552;
  max-width: 640px; margin: 0 auto; padding: 12px 16px calc(24px + env(safe-area-inset-bottom, 0px));
  color: var(--text); font-family: var(--sans);
}
.pg-taglio * { box-sizing: border-box; }
.pg-taglio .wrap { padding: 0; }

/* schede */
.pg-taglio .blocco { margin-bottom: 10px; background: var(--panel); border: 1px solid var(--line); border-radius: 8px; padding: 12px; overflow: hidden; }
.pg-taglio .tit { margin: 0 0 8px; font-size: 15px; font-weight: 700; color: var(--text); }

/* scelta vincolo: segmentato, selezione gialla */
.pg-taglio .seg { display: flex; border: 1px solid var(--line); border-radius: 8px; overflow: hidden; }
.pg-taglio .seg button {
  flex: 1; min-height: 56px; padding: 8px 6px; background: var(--panel-2); border: 0; border-right: 1px solid var(--line);
  font: inherit; font-size: 14px; font-weight: 600; color: var(--text-dim); cursor: pointer; line-height: 1.25;
}
.pg-taglio .seg button:last-child { border-right: 0; }
.pg-taglio .seg button small { display: block; font-weight: 400; font-size: 11.5px; margin-top: 2px; }
.pg-taglio .seg button[aria-pressed="true"] { background: var(--yellow); color: #000; }
.pg-taglio .seg button:focus-visible, .pg-taglio select:focus-visible, .pg-taglio input:focus-visible { outline: 2px solid var(--text); outline-offset: 2px; }

/* esito principale: due riquadri come la barra dei valori di Trigo */
.pg-taglio .verdetto { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.pg-taglio .vcell { background: var(--bg); border: 1px solid var(--line); border-radius: 8px; padding: 10px 12px; }
.pg-taglio .vcell .n {
  display: inline-flex; width: 22px; height: 22px; border-radius: 50%; align-items: center; justify-content: center;
  font-weight: 800; font-size: 12px; color: #10141a; margin-right: 6px; vertical-align: 1px;
}
.pg-taglio .vcell .lbl { font-size: 12.5px; color: var(--text-dim); }
.pg-taglio .vcell .big { font-size: 21px; font-weight: 800; margin-top: 4px; line-height: 1.15; }
.pg-taglio .vcell .sub { font-size: 12.5px; color: var(--text-dim); margin-top: 3px; }
.pg-taglio .vcell.c1 .n { background: var(--compr); } .pg-taglio .vcell.c1 .big { color: var(--compr); }
.pg-taglio .vcell.c2 .n { background: var(--traz); } .pg-taglio .vcell.c2 .big { color: var(--traz); }
.pg-taglio .vcell.unico { grid-column: 1 / -1; }
.pg-taglio .vcell.unico .n { background: var(--ok); } .pg-taglio .vcell.unico .big { color: var(--ok); }

.pg-taglio svg { display: block; width: 100%; height: auto; }
.pg-taglio .legenda { display: flex; flex-wrap: wrap; gap: 6px 14px; padding: 8px 0 0; font-size: 12.5px; color: var(--text-dim); }
.pg-taglio .legenda i { display: inline-block; width: 10px; height: 10px; border-radius: 2px; margin-right: 5px; vertical-align: -1px; }

/* controlli */
.pg-taglio .ctl { padding: 10px 0; }
.pg-taglio .ctl + .ctl { border-top: 1px solid var(--line); }
.pg-taglio .ctl label { display: flex; justify-content: space-between; align-items: baseline; font-size: 13px; color: var(--text-dim); }
.pg-taglio .ctl label b { font-family: var(--mono); font-size: 15px; color: var(--text); }
.pg-taglio .ctl input[type=range] { width: 100%; margin: 8px 0 2px; accent-color: var(--yellow); height: 28px; padding: 0; }
.pg-taglio .ctl select {
  width: 100%; min-height: 46px; margin-top: 6px; padding: 10px 12px; font-size: 16px; border-radius: 6px;
  background: var(--bg); border: 1px solid var(--line); color: var(--text); font-family: var(--sans);
}
.pg-taglio .ctl select:focus { outline: none; border-color: var(--yellow); }
.pg-taglio .ctl .h { font-size: 12.5px; color: var(--text-dim); margin-top: 2px; }

/* avvisi: riquadri come le note di Trigo */
.pg-taglio .avv { margin-bottom: 10px; padding: 10px 12px; border-radius: 6px; font-size: 13px; line-height: 1.45;
  border: 1px solid var(--yellow); background: transparent; color: var(--text); }
.pg-taglio .avv.grave { border-color: var(--bad); color: var(--bad); }
.pg-taglio .avv.ok { border-color: var(--ok); color: var(--ok); }
.pg-taglio .avv b { display: block; font-size: 13px; margin-bottom: 2px; }

/* sequenza */
.pg-taglio .passo { display: grid; grid-template-columns: 34px 1fr; gap: 10px; padding: 10px 0; border-top: 1px solid var(--line); }
.pg-taglio .passo:first-child { border-top: 0; padding-top: 2px; }
.pg-taglio .passo .pn { display: inline-grid; place-items: center; width: 30px; height: 30px; border: 2px solid currentColor; border-radius: 50%; font-size: 14px; font-weight: 800; }
.pg-taglio .passo .pt { font-size: 13px; color: var(--text-dim); line-height: 1.45; min-width: 0; }
.pg-taglio .passo .pt h4 { margin: 0 0 2px; font-size: 14px; color: var(--text); }
.pg-taglio .passo .pt b { color: var(--text); font-family: var(--mono); }

.pg-taglio .dati { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; margin-top: 10px; }
.pg-taglio .dati div { background: var(--bg); border: 1px solid var(--line); border-radius: 8px; padding: 8px 10px; font-size: 12px; color: var(--text-dim); }
.pg-taglio .dati b { display: block; font: 700 16px var(--mono); color: var(--text); margin-top: 2px; }

.pg-taglio .limiti { margin-top: 12px; font-size: 12.5px; color: var(--text-dim); line-height: 1.5; }

@media (max-width: 400px) {
  .pg-taglio .verdetto { grid-template-columns: 1fr; }
  .pg-taglio .dati { grid-template-columns: 1fr 1fr; }
}
`,

  html: `
<div class="wrap">

  <div class="blocco">
    <div class="tit">Come sta il tronco</div>
    <div class="seg" role="group" aria-label="Vincolo">
      <button type="button" id="tgAppoggi" aria-pressed="true">Su due appoggi<small>a terra o su cavalletti</small></button>
      <button type="button" id="tgSbalzo" aria-pressed="false">Attaccato<small>alla pianta, a sbalzo</small></button>
    </div>
  </div>

  <div class="blocco" id="tgVerdetto"></div>

  <div class="blocco">
    <div class="tit">Forze lungo il tronco</div>
    <svg id="tgLat" viewBox="0 0 360 200" role="img" aria-label="Tronco con fibre compresse e tese e linee di taglio"></svg>
    <div class="legenda">
      <span><i style="background:var(--compr)"></i>compresse: il taglio si chiude</span>
      <span><i style="background:var(--traz)"></i>tese: il taglio si apre</span>
      <span><i style="background:var(--legno)"></i>0 = punto scarico</span>
    </div>
  </div>

  <div class="blocco">
    <div class="tit">Sezione al taglio</div>
    <svg id="tgSez" viewBox="0 0 360 210" role="img" aria-label="Sezione del tronco con profondità dello scarico"></svg>
    <div class="dati" id="tgDati"></div>
  </div>

  <div id="tgAvvisi"></div>

  <div class="blocco">
    <div class="tit">Sequenza</div>
    <div id="tgSeq"></div>
  </div>

  <div class="blocco">
    <div class="tit">Dati</div>
    <div class="ctl"><label for="tgD">Diametro <b><span id="tgDv">30</span> cm</b></label>
      <input type="range" id="tgD" min="8" max="100" step="1" value="30"></div>
    <div class="ctl"><label for="tgL">Lunghezza <b><span id="tgLv">6.0</span> m</b></label>
      <input type="range" id="tgL" min="1" max="25" step="0.1" value="6"></div>
    <div class="ctl"><label for="tgI">Inclinazione dell'asse <b><span id="tgIv">0</span>°</b></label>
      <input type="range" id="tgI" min="0" max="70" step="1" value="0">
      <div class="h">0° = tronco orizzontale. Misurala rispetto all'orizzontale, in salita o in discesa è lo stesso.</div></div>
    <div class="ctl" id="tgWA"><label for="tgA">Appoggio A <b><span id="tgAv">0.5</span> m</b></label>
      <input type="range" id="tgA" min="0" max="6" step="0.05" value="0.5"></div>
    <div class="ctl" id="tgWB"><label for="tgB">Appoggio B <b><span id="tgBv">4.0</span> m</b></label>
      <input type="range" id="tgB" min="0" max="6" step="0.05" value="4"></div>
    <div class="ctl" id="tgWR"><label for="tgR">Appoggio a terra <b><span id="tgRv">nessuno</span></b></label>
      <input type="range" id="tgR" min="0" max="6" step="0.05" value="0">
      <div class="h">Tutto a sinistra = nessun appoggio, ramo libero a sbalzo.</div></div>
    <div class="ctl"><label for="tgT">Posizione del taglio <b><span id="tgTv">5.0</span> m</b></label>
      <input type="range" id="tgT" min="0" max="6" step="0.05" value="5"></div>
    <div class="ctl"><label for="tgE">Essenza (legno fresco)</label>
      <select id="tgE">
        <option value="750">Conifera: abete, pino</option>
        <option value="800" selected>Pioppo, salice</option>
        <option value="900">Castagno</option>
        <option value="1000">Faggio, robinia</option>
        <option value="1080">Quercia, roverella</option>
        <option value="1100">Eucalipto, platano</option>
      </select></div>
    <div class="ctl"><label for="tgF">Stato del legno</label>
      <select id="tgF">
        <option value="12">Nodoso o degradato</option>
        <option value="20" selected>Fusto verde sano</option>
        <option value="30">Legno netto</option>
      </select></div>
  </div>

  <div class="limiti">
    Modello semplificato: asse dritto con inclinazione costante (0° = orizzontale), solo peso proprio, legno omogeneo. Con l'inclinazione la compressione lungo l'asse è sommata in modo prudente alla flessione. Non vede nodi, marciumi,
    tensioni di crescita, rami piegati a molla, pendenza del terreno né carichi sopra il tronco.
    Un ramo piegato a molla ha le fibre compresse sul lato interno della curva: lì va lo scarico, a fette.
    Valutazione dell'operatore, posizione, via di fuga e DPI restano ciò che decide.
  </div>
</div>
`,

  init(root) {
    const $ = id => root.querySelector("#" + id);
    const g = 9.81;
    let modo = "appoggi";
    const C = {compr: "#E4572E", traz: "#4A93C8", legno: "#C9A227", testo: "#eceff3", tenue: "#8b96a3", linea: "#2a323d", fondo: "#171d25", ok: "#7FB069"};

    // ---------------- statica ----------------
    function stato() {
      const D = (+$("tgD").value) / 100, L = +$("tgL").value;
      const rho = +$("tgE").value, A = Math.PI * D * D / 4;
      let x1 = Math.min(L, +$("tgA").value), x2 = Math.min(L, +$("tgB").value);
      if (x2 < x1) [x1, x2] = [x2, x1];
      if (x2 - x1 < 0.05) x2 = Math.min(L, x1 + 0.05);
      const s = {D, L, rho, A, q: rho * g * A, x1, x2, xa: Math.min(L, +$("tgR").value), xt: Math.min(L, +$("tgT").value), fm: (+$("tgF").value) * 1e6};
      const th = (+$("tgI").value) * Math.PI / 180;
      s.th = th; s.qp = s.q * Math.cos(th); s.qa = s.q * Math.sin(th);   // carico perpendicolare (flette) e lungo l'asse (comprime)
      s.R = reazione(s);
      return s;
    }

    // sbalzo incastrato a x=0 con appoggio semplice in xa: reazione per congruenza (freccia nulla in xa)
    function reazione(s) {
      const a = s.xa, L = s.L;
      if (a < 0.02 * L) return 0;
      return Math.max(0, 3 * (s.qp * a * a * (6 * L * L - 4 * L * a + a * a) / 24) / (a * a * a));
    }

    // M > 0 = fibre in alto compresse
    function momento(s, x) {
      const {L, x1, x2} = s, q = s.qp;
      if (modo === "sbalzo") {
        let M = -q * (L - x) * (L - x) / 2;
        if (s.xa >= x) M += s.R * (s.xa - x);
        return M;
      }
      const R2 = q * L * (L / 2 - x1) / (x2 - x1), R1 = q * L - R2;
      const mac = v => v > 0 ? v : 0;
      return R1 * mac(x - x1) + R2 * mac(x - x2) - q * x * x / 2;
    }

    // sforzo assiale (valore assoluto, prudente): peso del tratto che scarica lungo l'asse
    function assiale(s, x) { return s.qa * (modo === "sbalzo" ? (s.L - x) : Math.max(x, s.L - x)); }

    // sezione circolare dopo lo scarico di profondità p (tolta la fascia sul lato compresso)
    function residua(D, p) {
      const R = D / 2, n = 400, y0 = -R, y1 = R - p;
      if (y1 <= y0) return null;
      const h = (y1 - y0) / n;
      let A = 0, S = 0, I0 = 0;
      for (let i = 0; i < n; i++) {
        const y = y0 + (i + .5) * h, b = 2 * Math.sqrt(Math.max(0, R * R - y * y));
        A += b * h; S += y * b * h; I0 += y * y * b * h;
      }
      const yc = S / A, I = I0 - A * yc * yc;
      return {A, W: I / Math.max(Math.abs(-R - yc), Math.abs(y1 - yc))};
    }

    let tab = {D: null, t: null};
    function tabella(D) {
      if (tab.D === D) return tab.t;
      const t = [];
      for (let i = 0; i <= 60; i++) { const p = .49 * D * i / 60, r = residua(D, p); t.push({p, W: r ? r.W : 0, A: r ? r.A : 0}); }
      tab = {D, t};
      return t;
    }

    // profondità massima prima che la sezione residua superi la resistenza
    function pMax(s, M, N) {
      const t = tabella(s.D), sig = e => e.W > 0 ? Math.abs(M) / e.W + N / e.A : Infinity;
      if (sig(t[0]) >= s.fm) return 0;
      for (let i = 1; i < t.length; i++) {
        if (sig(t[i]) >= s.fm) {
          const a = t[i - 1], b = t[i], f = (s.fm - sig(a)) / (sig(b) - sig(a));
          return a.p + f * (b.p - a.p);
        }
      }
      return .49 * s.D;
    }

    function zeri(s) {
      const n = 500, out = [];
      let prev = momento(s, 0);
      for (let i = 1; i <= n; i++) {
        const x = s.L * i / n, m = momento(s, x);
        if ((prev < 0 && m > 0) || (prev > 0 && m < 0)) {
          let a = s.L * (i - 1) / n, b = x;
          for (let k = 0; k < 30; k++) { const c = (a + b) / 2; if ((momento(s, a) < 0) === (momento(s, c) < 0)) a = c; else b = c; }
          out.push((a + b) / 2);
        }
        prev = m;
      }
      return out.filter(z => z > .02 * s.L && z < .98 * s.L);
    }

    // ---------------- disegno ----------------
    const NS = "http://www.w3.org/2000/svg";
    const mk = (t, a) => { const e = document.createElementNS(NS, t); for (const k in a) e.setAttribute(k, a[k]); return e; };
    const tx = (x, y, s, a = {}) => {
      const e = mk("text", Object.assign({x, y, fill: C.tenue, "font-size": 11, "font-family": "system-ui,sans-serif"}, a));
      e.textContent = s; return e;
    };

    function appoggio(sv, X, y) {
      sv.appendChild(mk("path", {d: `M${X - 9} ${y + 15} L${X} ${y} L${X + 9} ${y + 15} Z`, fill: C.tenue}));
      sv.appendChild(mk("line", {x1: X - 13, y1: y + 15, x2: X + 13, y2: y + 15, stroke: C.tenue, "stroke-width": 2}));
    }

    function freccia(sv, X, yPunta, verso, col, n) {
      // verso = +1 punta verso il basso, -1 verso l'alto
      const yCoda = yPunta - verso * 24;
      sv.appendChild(mk("line", {x1: X, y1: yCoda, x2: X, y2: yPunta, stroke: col, "stroke-width": 3}));
      sv.appendChild(mk("path", {d: `M${X - 5} ${yPunta - verso * 7} L${X} ${yPunta} L${X + 5} ${yPunta - verso * 7}`, fill: "none", stroke: col, "stroke-width": 3}));
      sv.appendChild(mk("circle", {cx: X + 15, cy: (yCoda + yPunta) / 2, r: 9, fill: col}));
      sv.appendChild(tx(X + 15, (yCoda + yPunta) / 2 + 4, n, {fill: "#10141a", "text-anchor": "middle", "font-size": 12, "font-weight": 800}));
    }

    function laterale(s, d) {
      const sv = $("tgLat"); sv.textContent = "";
      const W = 360, ml = 22, mr = 22, y0 = 78;
      const sx = x => ml + x / s.L * (W - ml - mr);
      const hh = Math.max(8, Math.min(17, s.D * 45));

      // fibre sopra/sotto colorate con intensità ~ |M|
      const n = 120, vals = [];
      for (let i = 0; i <= n; i++) vals.push(momento(s, s.L * i / n));
      const Mmax = Math.max(1e-9, ...vals.map(Math.abs));
      for (let i = 0; i < n; i++) {
        const M = (vals[i] + vals[i + 1]) / 2, op = .15 + .75 * Math.min(1, Math.abs(M) / Mmax);
        const x = sx(s.L * i / n), w = sx(s.L * (i + 1) / n) - x + .5;
        sv.appendChild(mk("rect", {x, y: y0 - hh, width: w, height: hh, fill: M > 0 ? C.compr : C.traz, opacity: op}));
        sv.appendChild(mk("rect", {x, y: y0, width: w, height: hh, fill: M > 0 ? C.traz : C.compr, opacity: op}));
      }
      sv.appendChild(mk("rect", {x: sx(0), y: y0 - hh, width: sx(s.L) - sx(0), height: 2 * hh, fill: "none", stroke: C.testo, "stroke-width": 1.3, rx: 2}));

      // vincoli
      if (modo === "appoggi") {
        appoggio(sv, sx(s.x1), y0 + hh); appoggio(sv, sx(s.x2), y0 + hh);
        sv.appendChild(tx(sx(s.x1), y0 + hh + 28, "A", {"text-anchor": "middle"}));
        sv.appendChild(tx(sx(s.x2), y0 + hh + 28, "B", {"text-anchor": "middle"}));
      } else {
        sv.appendChild(mk("rect", {x: sx(0) - 10, y: y0 - hh - 10, width: 9, height: 2 * hh + 20, fill: C.tenue}));
        for (let i = 0; i < 6; i++) sv.appendChild(mk("line", {x1: sx(0) - 10, y1: y0 - hh - 10 + i * (2 * hh + 20) / 5, x2: sx(0) - 18, y2: y0 - hh - 2 + i * (2 * hh + 20) / 5, stroke: C.tenue, "stroke-width": 1.4}));
        sv.appendChild(tx(sx(0) - 4, y0 - hh - 16, "pianta", {"font-size": 10}));
        if (s.R > 0) appoggio(sv, sx(s.xa), y0 + hh);
      }

      // punti scarichi (M = 0)
      d.zeri.forEach(z => {
        sv.appendChild(mk("line", {x1: sx(z), y1: y0 - hh - 6, x2: sx(z), y2: y0 + hh + 6, stroke: C.legno, "stroke-width": 2}));
        sv.appendChild(tx(sx(z), y0 - hh - 9, "0", {fill: C.legno, "text-anchor": "middle", "font-weight": 800, "font-size": 12}));
      });

      // linea di taglio e frecce dei due tagli
      const X = sx(s.xt);
      sv.appendChild(mk("line", {x1: X, y1: y0 - hh - 34, x2: X, y2: y0 + hh + 34, stroke: C.testo, "stroke-width": 1.6, "stroke-dasharray": "5 4"}));
      if (d.unico) {
        freccia(sv, X, y0 - hh - 4, 1, C.ok, "1");
      } else if (d.comprSopra) {
        freccia(sv, X, y0 - hh - 4, 1, C.compr, "1");
        freccia(sv, X, y0 + hh + 4, -1, C.traz, "2");
      } else {
        freccia(sv, X, y0 + hh + 4, -1, C.compr, "1");
        freccia(sv, X, y0 - hh - 4, 1, C.traz, "2");
      }

      // diagramma del momento, compatto sotto il tronco
      const yb = 168, amp = 22;
      const sy = m => yb + m / Mmax * amp;         // M > 0 verso il basso (lato teso)
      let area = `M${sx(0)} ${yb}`, linea = "";
      vals.forEach((m, i) => { const p = `${sx(s.L * i / n).toFixed(1)} ${sy(m).toFixed(1)}`; area += " L" + p; linea += (i ? " L" : "M") + p; });
      area += ` L${sx(s.L)} ${yb} Z`;
      sv.appendChild(mk("path", {d: area, fill: C.traz, opacity: .25}));
      sv.appendChild(mk("path", {d: linea, fill: "none", stroke: C.testo, "stroke-width": 1.5}));
      sv.appendChild(mk("line", {x1: sx(0), y1: yb, x2: sx(s.L), y2: yb, stroke: C.tenue, "stroke-width": 1}));
      sv.appendChild(mk("line", {x1: X, y1: yb - amp - 4, x2: X, y2: yb + amp + 4, stroke: C.testo, "stroke-width": 1, "stroke-dasharray": "3 3", opacity: .7}));
      sv.appendChild(mk("circle", {cx: X, cy: sy(d.M), r: 3.5, fill: C.testo}));
      sv.appendChild(tx(ml, yb - amp - 6, "momento flettente", {"font-size": 10}));
      sv.appendChild(tx(W - mr, yb - amp - 6, (Math.abs(d.M) / 1000).toFixed(2) + " kN·m al taglio", {"font-size": 10, "text-anchor": "end", fill: C.testo}));
      sv.appendChild(tx(ml, 14, "0 m", {"font-size": 10}));
      if (s.th > .01) sv.appendChild(tx(W / 2, 14, "asse inclinato di " + Math.round(s.th * 180 / Math.PI) + "°", {"font-size": 10, "text-anchor": "middle", fill: C.testo}));
      sv.appendChild(tx(W - mr, 14, s.L.toFixed(1) + " m", {"font-size": 10, "text-anchor": "end"}));
    }

    function sezione(s, d) {
      const sv = $("tgSez"); sv.textContent = "";
      const cx = 130, cy = 105, R = 76, k = R / (s.D / 2);
      const up = d.comprSopra, p = d.p * k;
      const seg = (yc, sopra) => {
        const dy = yc - cy, hc = Math.sqrt(Math.max(0, R * R - dy * dy));
        const large = sopra ? (dy > 0 ? 1 : 0) : (dy < 0 ? 1 : 0);
        return `M${cx - hc} ${yc} A${R} ${R} 0 ${large} ${sopra ? 1 : 0} ${cx + hc} ${yc} Z`;
      };

      if (d.unico) {
        sv.appendChild(mk("circle", {cx, cy, r: R, fill: C.ok, opacity: .18}));
      } else {
        sv.appendChild(mk("path", {d: seg(cy, up), fill: C.compr, opacity: .28}));
        sv.appendChild(mk("path", {d: seg(cy, !up), fill: C.traz, opacity: .28}));
        sv.appendChild(mk("line", {x1: cx - R - 6, y1: cy, x2: cx + R + 6, y2: cy, stroke: C.tenue, "stroke-width": 1, "stroke-dasharray": "4 3"}));
        const yCut = up ? cy - R + p : cy + R - p;
        if (p > .5) {
          // parte asportata dallo scarico: vuota, bordo rosso tratteggiato
          sv.appendChild(mk("path", {d: seg(yCut, up), fill: C.fondo, stroke: C.compr, "stroke-width": 2, "stroke-dasharray": "5 3"}));
          if (p > 16) sv.appendChild(tx(cx, up ? cy - R + p / 2 + 4 : cy + R - p / 2 + 4, "scarico", {fill: C.compr, "text-anchor": "middle", "font-size": 11, "font-weight": 700}));
          sv.appendChild(mk("line", {x1: cx - R, y1: yCut, x2: cx + R, y2: yCut, stroke: C.compr, "stroke-width": 2.5}));
        }
        // quota scarico
        const qx = cx - R - 10, ya = up ? cy - R : cy + R;
        sv.appendChild(mk("line", {x1: qx, y1: ya, x2: qx, y2: yCut, stroke: C.compr, "stroke-width": 2}));
        sv.appendChild(tx(qx - 4, (ya + yCut) / 2 + 4, (d.p * 100).toFixed(1), {fill: C.compr, "text-anchor": "end", "font-size": 13, "font-weight": 800}));
        // frecce dei tagli
        const y1 = up ? cy - R - 6 : cy + R + 6, y2 = up ? cy + R + 6 : cy - R - 6;
        sv.appendChild(mk("path", {d: `M${cx} ${y1 + (up ? -16 : 16)} L${cx} ${y1}`, stroke: C.compr, "stroke-width": 3}));
        sv.appendChild(mk("path", {d: `M${cx} ${y2 + (up ? 16 : -16)} L${cx} ${y2}`, stroke: C.traz, "stroke-width": 3}));
      }
      sv.appendChild(mk("circle", {cx, cy, r: R, fill: "none", stroke: C.testo, "stroke-width": 1.8}));
      // riepilogo a destra
      const X = 214;
      const riga = (y, t, v, col) => {
        sv.appendChild(tx(X, y, t, {"font-size": 10, "letter-spacing": ".6"}));
        sv.appendChild(tx(X, y + 19, v, {fill: col, "font-size": 15, "font-weight": 800}));
      };
      if (d.unico) {
        riga(60, "TAGLIO UNICO", "sezione scarica", C.ok);
      } else {
        riga(30, "1 · SCARICO", (d.p * 100).toFixed(1) + " cm", C.compr);
        sv.appendChild(tx(X, 64, "da " + (up ? "alto" : "basso"), {"font-size": 11}));
        riga(84, "2 · CHIUSURA", "da " + (up ? "basso" : "alto"), C.traz);
        sv.appendChild(tx(X, 118, "fino a incontro", {"font-size": 11}));
        riga(138, "NON OLTRE", (d.pmax * 100).toFixed(1) + " cm", C.legno);
      }
      riga(180, "DIAMETRO", "Ø " + (s.D * 100).toFixed(0) + " cm", C.testo);
    }

    // ---------------- calcolo e testi ----------------
    function aggiorna() {
      // i cursori di posizione seguono la lunghezza
      const L = +$("tgL").value;
      ["tgA", "tgB", "tgR", "tgT"].forEach(id => { $(id).max = L; if (+$(id).value > L) $(id).value = L; });

      const s = stato();
      const M = momento(s, s.xt);
      const z = zeri(s);
      // taglio unico solo se il taglio cade davvero su un punto scarico (o M trascurabile in assoluto)
      const unico = Math.abs(M) < 1 || z.some(x => Math.abs(x - s.xt) < .015 * s.L);
      const N = assiale(s, s.xt);
      const pmax = pMax(s, M, N);
      const p = Math.max(0, Math.min(s.D / 3, .75 * pmax, .45 * s.D));
      const r = residua(s.D, p);
      const sigma = r ? Math.abs(M) / r.W + N / r.A : Infinity;
      const FS = sigma > 0 ? s.fm / sigma : 999;
      const d = {M, N, comprSopra: M > 0, unico, pmax, p, FS, zeri: z};

      $("tgDv").textContent = (s.D * 100).toFixed(0);
      $("tgLv").textContent = s.L.toFixed(1);
      $("tgIv").textContent = (+$("tgI").value).toFixed(0);
      $("tgAv").textContent = (+$("tgA").value).toFixed(2);
      $("tgBv").textContent = (+$("tgB").value).toFixed(2);
      $("tgTv").textContent = s.xt.toFixed(2);
      $("tgRv").textContent = s.xa < .02 * s.L ? "nessuno" : s.xa.toFixed(2) + " m";
      $("tgWA").hidden = $("tgWB").hidden = modo !== "appoggi";
      $("tgWR").hidden = modo !== "sbalzo";

      laterale(s, d);
      sezione(s, d);

      const alto = d.comprSopra ? "ALTO" : "BASSO", basso = d.comprSopra ? "BASSO" : "ALTO";
      $("tgVerdetto").innerHTML = unico
        ? '<div class="tit">Esito</div><div class="verdetto"><div class="vcell unico"><span class="n">1</span><span class="lbl">Punto scarico</span>' +
          '<div class="big">Taglio unico</div><div class="sub">Qui le fibre non spingono né tirano. Attento solo a come rotola il pezzo.</div></div></div>'
        : '<div class="tit">Esito</div><div class="verdetto">' +
            '<div class="vcell c1"><span class="n">1</span><span class="lbl">Scarico</span>' +
              '<div class="big">da ' + alto + '<br>' + (p * 100).toFixed(1) + ' cm</div>' +
              '<div class="sub">fibre compresse · ' + Math.round(p / s.D * 100) + '% del Ø</div></div>' +
            '<div class="vcell c2"><span class="n">2</span><span class="lbl">Chiusura</span>' +
              '<div class="big">da ' + basso + '<br>fino a incontro</div>' +
              '<div class="sub">fibre tese · stesso piano</div></div>' +
          '</div>';

      const massaTot = s.rho * s.A * s.L, massaOltre = s.rho * s.A * (s.L - s.xt);
      $("tgDati").innerHTML =
        '<div>Massa tronco<b>' + massaTot.toFixed(0) + ' kg</b></div>' +
        '<div>Oltre il taglio<b>' + massaOltre.toFixed(0) + ' kg</b></div>' +
        '<div>Sicurezza<b style="color:' + (FS < 1.5 ? "#e8734a" : FS < 2 ? "#ffd700" : "inherit") + '">' + (FS > 99 ? "> 99" : FS.toFixed(1)) + '</b></div>';

      // avvisi, dal più grave
      const av = [];
      const sbalzoLibero = modo === "sbalzo" ? (s.R <= 0 || s.xt >= s.xa) : (s.xt > s.x2 || s.xt < s.x1);
      if (pmax <= .001) av.push(["grave", "Rottura imminente", "Il tronco qui è già oltre la resistenza: può cedere durante il taglio. Non tagliare qui: sostieni, riduci la luce o allontanati e rivaluta."]);
      else if (pmax < s.D / 3) av.push(["", "Sezione molto caricata", "Lo scarico è stato ridotto a " + (p * 100).toFixed(1) + " cm. Meglio mettere un appoggio o un cuneo vicino al taglio prima di iniziare."]);
      if (FS < 2 && pmax > .001 && !unico) av.push(["", "Margine ridotto", "Fai il taglio 2 subito dopo il taglio 1, senza soste, e non lasciare la sezione aperta."]);
      if (sbalzoLibero && massaOltre > 80 && !unico) av.push(["", "Parte pesante che si stacca", massaOltre.toFixed(0) + " kg si liberano al taglio 2. Decidi prima dove cadono e da che parte esci."]);
      if (modo === "sbalzo" && s.R > 0 && s.xt < s.xa) av.push(["", "Il ramo farà leva sull'appoggio", "Tagliando qui il ramo resta sull'appoggio a " + s.xa.toFixed(2) + " m come su un fulcro: una parte scende, l'altra si alza. Guarda da che lato pende prima del taglio 2."]);
      if (modo === "appoggi" && !sbalzoLibero && !unico) av.push(["", "Taglio fra gli appoggi", "Le due parti restano appoggiate e tendono a chiudersi verso il basso: attento al pizzicamento a fine corsa."]);
      const gradi = Math.round(s.th * 180 / Math.PI);
      if (gradi >= 10) av.push(["", "Tronco inclinato di " + gradi + "°", "Il momento che flette è ridotto (× " + Math.cos(s.th).toFixed(2) + ") ma la sezione lavora anche a compressione lungo l'asse (" + (d.N / 1000).toFixed(2) + " kN al taglio). Il pezzo reciso tende a scivolare verso il basso lungo l'asse: libera la zona a valle."]);
      if (gradi >= 45 && modo === "appoggi") av.push(["", "Inclinazione forte su appoggi", "Un tronco così inclinato non resta appoggiato da solo: il modello vale solo se è davvero trattenuto ai due punti. Se è attaccato alla pianta usa \"Attaccato\"."]);
      if (d.zeri.length && !unico) av.push(["ok", "Punti scarichi", "Momento nullo a " + d.zeri.map(z => z.toFixed(2) + " m").join(", ") + ": tagliando lì basta un taglio unico."]);
      $("tgAvvisi").innerHTML = av.map(([c, t, x]) => '<div class="avv ' + c + '"><b>' + t + '</b>' + x + '</div>').join("");

      const passi = unico
        ? [["1", C.ok, "Taglio unico", "Una sola passata, meglio dall'alto. Controlla che il pezzo reciso non rotoli verso di te."]]
        : [
          ["1", C.compr, "Scarico da " + alto.toLowerCase() + " · " + (p * 100).toFixed(1) + " cm",
            "Sul lato delle fibre compresse. Affonda <b>" + (p * 100).toFixed(1) + " cm</b> su Ø " + (s.D * 100).toFixed(0) + " cm e fermati: oltre <b>" + (pmax * 100).toFixed(1) + " cm</b> la sezione non regge e la barra viene pinzata."],
          ["2", C.traz, "Chiusura da " + basso.toLowerCase(),
            "Sul lato delle fibre tese, sullo stesso piano del taglio 1, fino a incontrarlo. Il taglio si apre e la barra resta libera."]
        ];
      $("tgSeq").innerHTML = passi.map(([n, col, h, t]) =>
        '<div class="passo"><div class="pn" style="color:' + col + '">' + n + '</div><div class="pt"><h4>' + h + '</h4>' + t + '</div></div>').join("");
    }

    // ---------------- eventi ----------------
    function scegli(m) {
      modo = m;
      $("tgAppoggi").setAttribute("aria-pressed", m === "appoggi" ? "true" : "false");
      $("tgSbalzo").setAttribute("aria-pressed", m === "sbalzo" ? "true" : "false");
      if (m === "sbalzo" && +$("tgT").value < .05) $("tgT").value = +$("tgL").value / 2;
      aggiorna();
    }
    $("tgAppoggi").addEventListener("click", () => scegli("appoggi"));
    $("tgSbalzo").addEventListener("click", () => scegli("sbalzo"));
    ["tgD", "tgL", "tgI", "tgA", "tgB", "tgR", "tgT", "tgE", "tgF"].forEach(id => $(id).addEventListener("input", aggiorna));
    aggiorna();
  }
});