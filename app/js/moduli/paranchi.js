/* FireOps VVF - modulo "paranchi" (funzione SAF)
 * Si disegna il sistema di recupero con carrucole, bloccanti, ancoraggi, carico e operatori, si traccia la corda
 * (capo morto -> carrucole -> capo di tiro) e si ricavano vantaggio teorico e reale, tiro e forze sui punti.
 *
 * Modello (corde ideali, tratti paralleli alla verticale del disegno):
 *  - ogni corda ha un capo morto (primo punto) e un capo di tiro (ultimo punto); il tiro cresce di 1/eta a ogni
 *    passaggio su carrucola (o bloccante con puleggia), andando dal capo morto al capo di tiro;
 *  - un corpo e' il carico (con le carrucole fissate a lui), oppure una carrucola libera (con quelle fissate a lei);
 *    ogni corpo libero e' in equilibrio verticale: somma dei tratti che lo tirano in su - in giu = peso (solo il carico);
 *  - le incognite sono i tiri delle corde: sistema lineare, risolto con eliminazione di Gauss;
 *  - vantaggio = peso / tiro al capo che va agli operatori; teorico con eta = 1, reale con l'eta scelto.
 */
FireOps.registra({
  id: "paranchi",

  css: `
.pg-paranchi { --acc: var(--ics-operazioni); max-width: 640px; margin: 0 auto; padding: 12px 16px calc(24px + env(safe-area-inset-bottom, 0px)); color: var(--text); font-family: var(--sans); }
.pg-paranchi * { box-sizing: border-box; }
.pg-paranchi .blocco { margin-bottom: 10px; background: var(--panel); border: 1px solid var(--line); border-radius: 8px; padding: 12px; }
.pg-paranchi .tit { margin: 0 0 8px; font-size: 15px; font-weight: 700; }
.pg-paranchi .nota { font-size: 12.5px; line-height: 1.45; color: var(--text-dim); margin: 8px 0 0; }
.pg-paranchi .chips { display: flex; flex-wrap: wrap; gap: 8px; }
.pg-paranchi .chips button { min-height: 48px; min-width: 52px; padding: 0 12px; border: 1px solid var(--line); border-radius: 8px; background: var(--panel-2); color: var(--text-dim); font: inherit; font-size: 14px; font-weight: 700; cursor: pointer; }
.pg-paranchi .chips button[aria-pressed="true"] { background: var(--yellow); color: #000; border-color: var(--yellow); }
.pg-paranchi .riga { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 10px; }
.pg-paranchi .riga.uno { grid-template-columns: 1fr; }
.pg-paranchi label { display: block; font-size: 12.5px; color: var(--text-dim); margin-bottom: 4px; }
.pg-paranchi select, .pg-paranchi input[type=number] { width: 100%; min-height: 44px; padding: 0 10px; border-radius: 6px; border: 1px solid var(--line); background: var(--bg); color: var(--text); font: inherit; font-size: 16px; }
.pg-paranchi select:focus-visible, .pg-paranchi input:focus-visible, .pg-paranchi button:focus-visible { outline: 2px solid var(--text); outline-offset: 2px; }
.pg-paranchi .chk { display: flex; align-items: center; gap: 8px; min-height: 44px; font-size: 14px; color: var(--text); margin-top: 6px; }
.pg-paranchi .chk input { width: 22px; height: 22px; }
.pg-paranchi .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.pg-paranchi .vcell { background: var(--bg); border: 1px solid var(--line); border-radius: 8px; padding: 10px 12px; }
.pg-paranchi .vcell .k { font-size: 12px; color: var(--text-dim); }
.pg-paranchi .vcell .v { font-size: 22px; font-weight: 800; margin-top: 2px; font-variant-numeric: tabular-nums; }
.pg-paranchi .vcell .v small { font-size: 13px; font-weight: 600; color: var(--text-dim); }
.pg-paranchi .vcell.g { grid-column: 1 / -1; }
.pg-paranchi .schemi { display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; }
.pg-paranchi .schemi figure { margin: 0; text-align: center; flex: 1 1 140px; max-width: 260px; }
.pg-paranchi .schemi figcaption { font-size: 12px; color: var(--text-dim); margin-top: 2px; }
.pg-paranchi svg { width: 100%; height: auto; }
.pg-paranchi .avv { margin-top: 8px; padding: 8px 10px; border-radius: 8px; border: 1px solid var(--yellow); background: rgba(255,215,0,.08); font-size: 13px; line-height: 1.4; }
.pg-paranchi .riga4 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 10px; margin-top: 10px; align-items: end; font-size: 13px; padding-top: 10px; border-top: 1px solid var(--line); }
.pg-paranchi .riga4 > b { grid-column: 1 / -1; font-size: 14px; }
.pg-paranchi .riga4 .zc { grid-column: 1 / -1; }
.pg-paranchi .riga4.tt { font-size: 11.5px; color: var(--text-dim); margin-top: 0; }
.pg-paranchi .riga4[hidden] { display: none; }
.pg-paranchi canvas.pi { display: block; width: 100%; height: 280px; background: var(--bg); border: 1px solid var(--line); border-radius: 8px; touch-action: none; }
.pg-paranchi .st { display: flex; gap: 4px; align-items: center; }
.pg-paranchi .st input { order: 1; text-align: center; min-width: 0; width: auto; flex: 2 1 0; padding: 0 6px; }
.pg-paranchi .st button { order: 2; flex: 1 1 0; min-width: 48px; width: auto; min-height: 48px; padding: 0; min-height: 44px; border: 1px solid var(--line); border-radius: 6px; background: var(--panel-2); color: var(--text); font: inherit; font-size: 18px; font-weight: 800; cursor: pointer; }
.pg-paranchi .el { margin-top: 10px; padding: 10px; border: 1px solid var(--line); border-radius: 8px; background: var(--panel-2); }
.pg-paranchi .elh { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.pg-paranchi .ctl { display: flex; gap: 6px; }
.pg-paranchi .ctl button { min-width: 48px; min-height: 48px; border: 1px solid var(--line); border-radius: 6px; background: var(--bg); color: var(--text); font: inherit; font-size: 16px; cursor: pointer; }
.pg-paranchi .el .riga4 { border-top: 0; margin-top: 4px; padding-top: 4px; }
.pg-paranchi .tab { width: 100%; border-collapse: collapse; font-size: 13.5px; }
.pg-paranchi .tab td { padding: 6px 4px; border-top: 1px solid var(--line); }
.pg-paranchi .tab td:last-child { text-align: right; font-weight: 700; font-variant-numeric: tabular-nums; }
.pg-paranchi .chips button.acc { background: var(--yellow); color: #000; border-color: var(--yellow); }
.pg-paranchi canvas.pi { height: auto; }
`,

  html: `
<div class="blocco">
  <h2 class="tit">Disegno del sistema</h2>
  <div class="chips" id="pa-pre" aria-label="Sistemi pronti"></div>
  <canvas id="pa-cv" class="pi" role="img" aria-label="Disegno del sistema di recupero: trascina carrucole, bloccanti e ancoraggi"></canvas>
  <div class="chips" id="pa-add" style="margin-top:10px">
    <button type="button" data-t="anc">+ Ancoraggio</button><button type="button" data-t="pul">+ Carrucola</button><button type="button" data-t="blo" data-p="0">+ Bloccante</button><button type="button" data-t="blo" data-p="1">+ Carrucola bloccante</button><button type="button" data-t="dis">+ Discensore</button><button type="button" id="pa-cd" class="acc">Disegna corda</button>
  </div>
  <div class="chips" style="margin-top:8px"><button type="button" id="pa-calc" class="acc">Calcola vantaggio</button><button type="button" id="pa-reset">Reset</button></div>
  <div class="avv" id="pa-mini" style="border-color:var(--line);background:var(--panel-2)"></div>
  <p class="nota" id="pa-hint"><b>1</b> Aggiungi punti e trascinali. <b>2</b> Fissa ogni carrucola: trascinala vicino a un ancoraggio o al carico (si aggancia), oppure toccala e usa “Fissa a…”. <b>3</b> “Disegna corda” e tocca i punti nell’ordine di passaggio.</p>
  <div id="pa-sel"></div>
  <div id="pa-corde"></div>
</div>

<div class="blocco">
  <h2 class="tit">Dati</h2>
  <div class="riga">
    <div><label for="pa-kg">Carico (kg)</label><input type="number" id="pa-kg" inputmode="decimal" min="1" step="1" value="200"></div>
    <div><label for="pa-h">Sollevamento (m)</label><input type="number" id="pa-h" inputmode="decimal" min="0" step="0.5" value="5"></div>
  </div>
  <div class="riga">
    <div><label for="pa-tipo">Carrucole</label>
      <select id="pa-tipo">
        <option value="0.95">Cuscinetti 0,95</option>
        <option value="0.90">Bronzina 0,90</option>
        <option value="0.70">Moschettone 0,70</option>
        <option value="x">Altro…</option>
      </select></div>
    <div><label for="pa-eta">Rendimento per passaggio</label><input type="number" id="pa-eta" inputmode="decimal" min="0.3" max="1" step="0.01" value="0.95"></div>
  </div>
  <p class="nota">I rendimenti sono valori indicativi: dipendono da carrucola, corda e diametro. Cambiali se conosci i tuoi.</p>
</div>

<div class="blocco">
  <h2 class="tit">Risultato</h2>
  <div class="grid" id="pa-ris"></div>
  <div id="pa-avv"></div>
</div>

<div class="blocco">
  <h2 class="tit">Tiri e forze sui punti</h2>
  <table class="tab" id="pa-anc"></table>
  <p class="nota">Forza verticale su ogni punto (somma dei tratti di corda che lo tirano). Valori indicativi: non sostituiscono la verifica del tuo istruttore SAF.</p>
</div>
`,

  init(root) {
    "use strict";
    const $ = s => root.querySelector(s);
    const G = 9.80665, R = 4.5, VW = 100, VH = 130, HIT = 20;
    const fmt = (v, d) => Number(v).toLocaleString("it-IT", {minimumFractionDigits: d, maximumFractionDigits: d});
    const kN = v => fmt(v / 1000, 2), daN = v => fmt(v / 10, 0);

    let items = [], corde = [], sel = null, tracc = null, uid = 0, cnt = {anc: 0, pul: 0, blo: 0, dis: 0};
    const HINT = "<b>1</b> Aggiungi punti e trascinali. <b>2</b> Fissa ogni carrucola: trascinala vicino a un ancoraggio o al carico (si aggancia), oppure toccala e usa “Fissa a…”. <b>3</b> “Disegna corda” e tocca i punti nell’ordine di passaggio.";
    let fissa = null;
    const byId = id => items.find(i => i.id === id);
    const nome = it => it.t === "car" ? "Carico" : it.t === "op" ? "Operatori" : it.nome;
    function add(t, x, y, extra) {
      const it = Object.assign({id: "i" + (++uid), t, x, y, f: "", p: true, e: 0.6}, extra || {});
      if (t === "anc") it.nome = "A" + (++cnt.anc);
      if (t === "pul") it.nome = "C" + (++cnt.pul);
      if (t === "blo") it.nome = "B" + (++cnt.blo);
      if (t === "dis") it.nome = "D" + (++cnt.dis);
      items.push(it);
      return it;
    }
    function azzera() { items = []; corde = []; sel = null; tracc = null; fissa = null; cnt = {anc: 0, pul: 0, blo: 0, dis: 0}; }

    // ---------- sistemi pronti: tackle a n capi (il capo di tiro esce sempre dal blocco fisso) ----------
    // yF = quota del blocco fisso, yM = quota del blocco mobile; radice = carico (primo stadio) o prima carrucola libera
    function tackle(n, xc, yF, yM, car) {
      const xs = k => xc + (k - n / 2) * 2 * R;
      const su = k => (n - 1 - k) % 2 === 0;
      const dF = yF < yM ? -1 : 1;
      const anc = add("anc", xc, yF + dF * 12);
      let root = car, moving = [];
      const nodi = [];
      const turni = [];
      for (let k = 0; k < n - 1; k++) turni.push({k, fisso: su(k)});
      const pf = [], pm = [];
      turni.forEach(t => {
        const x = (xs(t.k) + xs(t.k + 1)) / 2;
        if (t.fisso) pf[t.k] = add("pul", x, yF, {f: anc.id});
        else {
          const m = add("pul", x, yM, {});
          if (!root) { root = m; } else m.f = root.id;
          pm[t.k] = m;
        }
      });
      const ex = add("pul", (xs(n - 1) + xs(n)) / 2, yF, {f: anc.id});
      if (car) {
        car.x = n % 2 ? xs(0) : (pm.filter(Boolean).length ? pm.filter(Boolean).reduce((a, m) => a + m.x, 0) / pm.filter(Boolean).length : xs(0));
        car.y = yM + 16;
        pm.forEach(m => { if (m) m.f = "car"; });
      }
      nodi.push(n % 2 ? (car ? car.id : root.id) : anc.id);
      for (let k = 0; k < n - 1; k++) nodi.push((su(k) ? pf[k] : pm[k]).id);
      nodi.push(ex.id);
      return {nodi, root, ex, xout: xs(n)};
    }
    function sistema(stadi) {
      azzera();
      const car = add("car", 25, 88);
      const n1 = stadi[0];
      const t1 = tackle(n1, 25, 18, 66, car);
      if (stadi.length === 1) {
        const op = add("op", t1.xout, 122);
        corde.push(t1.nodi.concat(op.id));
      } else {
        const t2 = tackle(stadi[1], 72, 100, 52, null);
        const op = add("op", t2.xout, 124);
        corde.push(t1.nodi.concat(t2.root.id));
        corde.push(t2.nodi.concat(op.id));
      }
      sel = null;
    }
    const PRESET = [["1:1", [1]], ["1:2", [2]], ["1:3", [3]], ["1:4", [4]], ["1:5", [5]], ["1:4 comp.", [2, 2]], ["1:6 comp.", [3, 2]], ["1:9 comp.", [3, 3]]];

    // ---------- calcolo ----------
    function corpo(it) {
      let cur = it;
      for (let g = 0; g < 12; g++) {
        if (cur.t === "anc" || cur.t === "op") return "fix";
        if (cur.t === "car") return "car";
        if (!cur.f) return cur.id;
        if (cur.f === "car") return "car";
        const nx = byId(cur.f);
        if (!nx) return cur.id;
        cur = nx;
      }
      return it.id;
    }
    const vs = (a, b) => { const d = a.y - b.y; return d > 0.5 ? 1 : d < -0.5 ? -1 : 0; };
    const fatt = (it, eta) => !it ? 1 : it.t === "pul" || (it.t === "blo" && it.p) ? 1 / eta : it.t === "dis" ? (eta >= 1 ? 1 : 1 / it.e) : 1;
    function risolvi(eta, W) {
      const nR = corde.length;
      if (!nR) return {err: "Disegna la corda: tocca “Disegna corda” e poi i punti in ordine, dal capo morto al capo di tiro."};
      const righe = {car: new Array(nR).fill(0)}, forza = {}, coefs = [];
      let orizz = 0;
      corde.forEach((c, ri) => {
        const nodi = c.map(byId);
        if (nodi.length < 2 || nodi.some(n => !n)) { coefs.push([]); return; }
        const cf = []; let f = 1;
        for (let k = 0; k < nodi.length - 1; k++) {
          if (k > 0) f *= fatt(nodi[k], eta);
          cf.push(f);
          const a = nodi[k], b = nodi[k + 1];
          [[a, b], [b, a]].forEach(([x, y]) => {
            const v = vs(x, y);
            if (!v) { orizz++; return; }
            const key = corpo(x);
            if (key !== "fix") { (righe[key] = righe[key] || new Array(nR).fill(0))[ri] += f * v; }
            (forza[x.id] = forza[x.id] || new Array(nR).fill(0))[ri] += f * v;
          });
        }
        coefs.push(cf);
      });
      const chiavi = Object.keys(righe).filter(k => k === "car" || righe[k].some(v => Math.abs(v) > 1e-9));
      const colu = [];
      for (let j = 0; j < nR; j++) if (chiavi.some(k => Math.abs(righe[k][j]) > 1e-9)) colu.push(j);
      const op = corde.findIndex(c => { const l = byId(c[c.length - 1]); return l && l.t === "op"; });
      if (op < 0) return {err: "Nessuna corda arriva agli operatori: termina una corda sul punto “Operatori”."};
      if (!colu.includes(op)) return {err: "La corda degli operatori non è collegata al carico: controlla i collegamenti."};
      if (!righe.car.some(v => Math.abs(v) > 1e-9)) return {err: "Il carico non è sostenuto da nessuna corda."};
      if (chiavi.length !== colu.length) return {err: "Sistema non determinato: " + chiavi.length + " corpi mobili (carico e carrucole libere) e " + colu.length + " corde. Servono tante corde quanti sono i corpi mobili."};
      const n = chiavi.length;
      const M = chiavi.map(k => colu.map(j => righe[k][j]).concat(k === "car" ? W : 0));
      for (let c = 0; c < n; c++) {
        let p = c;
        for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
        if (Math.abs(M[p][c]) < 1e-9) return {err: "Sistema non risolvibile: i collegamenti lasciano un corpo non vincolato."};
        [M[c], M[p]] = [M[p], M[c]];
        for (let r = 0; r < n; r++) if (r !== c) { const q = M[r][c] / M[c][c]; for (let j = c; j <= n; j++) M[r][j] -= q * M[c][j]; }
      }
      const T = new Array(nR).fill(0);
      colu.forEach((j, i) => { T[j] = M[i][n] / M[i][i]; });
      if (T.some(t => t < -1e-6)) return {err: "Disposizione impossibile: una corda dovrebbe spingere. Controlla da che parte stanno i punti e i fulcri."};
      const seg = corde.map((c, ri) => coefs[ri].map(f => f * T[ri]));
      const tiro = seg[op][seg[op].length - 1];
      return {T, seg, tiro, forza, op, orizz};
    }

    // ---------- disegno ----------
    const lung = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
    function geom(c) {   // punti di passaggio di una corda
      const nodi = c.map(byId);
      return nodi.map((p, j) => {
        if (!p) return null;
        if (j === 0 || j === nodi.length - 1 || !(p.t === "pul" || p.t === "blo" || p.t === "dis")) return {p, i: [p.x, p.y], o: [p.x, p.y], arco: null};
        const pv = nodi[j - 1], nx = nodi[j + 1];
        const sin = pv && pv.x > p.x + 0.01 ? 1 : -1;
        const aIn = sin > 0 ? 0 : Math.PI;
        const sotto = pv && nx ? (pv.y + nx.y) / 2 < p.y : true;
        const sg = (sotto ? 1 : -1) * (aIn === Math.PI ? -1 : 1);
        const arco = [];
        for (let k = 0; k <= 12; k++) { const a = aIn + sg * Math.PI * k / 12; arco.push([p.x + R * Math.cos(a), p.y + R * Math.sin(a)]); }
        return {p, i: arco[0], o: arco[12], arco};
      });
    }
    function disegna(ris) {
      const cv = $("#pa-cv"), w = cv.clientWidth || 320, h = Math.round(w * VH / VW), pr = window.devicePixelRatio || 1;
      if (cv.width !== Math.round(w * pr) || cv.height !== Math.round(h * pr)) { cv.width = Math.round(w * pr); cv.height = Math.round(h * pr); cv.style.height = h + "px"; }
      const ctx = cv.getContext("2d"); ctx.setTransform(pr, 0, 0, pr, 0, 0); ctx.clearRect(0, 0, w, h);
      const u = w / VW, cs = getComputedStyle(root);
      const txt = cs.getPropertyValue("--text").trim() || "#eceff3", dim = cs.getPropertyValue("--text-dim").trim() || "#8b96a3", bg = cs.getPropertyValue("--bg").trim() || "#10141a", ln = cs.getPropertyValue("--line").trim() || "#2a3139";
      const X = x => x * u, Y = y => y * u;
      ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.font = "11px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      // griglia leggera
      ctx.strokeStyle = ln; ctx.lineWidth = 0.5;
      for (let x = 10; x < VW; x += 10) { ctx.beginPath(); ctx.moveTo(X(x), 0); ctx.lineTo(X(x), h); ctx.stroke(); }
      for (let y = 10; y < VH; y += 10) { ctx.beginPath(); ctx.moveTo(0, Y(y)); ctx.lineTo(w, Y(y)); ctx.stroke(); }
      // fulcri
      ctx.setLineDash([4, 3]); ctx.strokeStyle = dim; ctx.lineWidth = 1.2;
      items.forEach(it => {
        if (!it.f) return;
        const t = it.f === "car" ? items.find(i => i.t === "car") : byId(it.f);
        if (!t) return;
        ctx.beginPath(); ctx.moveTo(X(it.x), Y(it.y)); ctx.lineTo(X(t.x), Y(t.y)); ctx.stroke();
      });
      ctx.setLineDash([]);
      // carrucole e bloccanti
      items.forEach(it => {
        if (it.t !== "pul" && it.t !== "blo" && it.t !== "dis") return;
        ctx.fillStyle = bg; ctx.strokeStyle = it.t === "pul" ? "#4A93C8" : it.t === "dis" ? "#ff6b6b" : "#c77dff"; ctx.lineWidth = 2.4;
        ctx.beginPath();
        if ((it.t === "blo" && !it.p) || it.t === "dis") ctx.rect(X(it.x - R), Y(it.y - R), 2 * R * u, 2 * R * u); else ctx.arc(X(it.x), Y(it.y), R * u, 0, 7);
        ctx.fill(); ctx.stroke();
        ctx.fillStyle = txt; ctx.fillText(it.nome, X(it.x), Y(it.y));
      });
      // corde
      corde.forEach((c, ri) => {
        const g = geom(c); if (g.some(x => !x)) return;
        ctx.strokeStyle = "#e8734a"; ctx.lineWidth = 2.6; ctx.beginPath();
        ctx.moveTo(X(g[0].o[0]), Y(g[0].o[1]));
        for (let j = 1; j < g.length; j++) {
          ctx.lineTo(X(g[j].i[0]), Y(g[j].i[1]));
          if (g[j].arco) g[j].arco.forEach(q => ctx.lineTo(X(q[0]), Y(q[1])));
        }
        ctx.stroke();
        const L = g[g.length - 1].i, P = g[g.length - 2].o, an = Math.atan2(L[1] - P[1], L[0] - P[0]);
        ctx.fillStyle = "#e8734a"; ctx.beginPath();
        ctx.moveTo(X(L[0]) - 9 * Math.cos(an) + 5 * Math.sin(an), Y(L[1]) - 9 * Math.sin(an) - 5 * Math.cos(an));
        ctx.lineTo(X(L[0]), Y(L[1]));
        ctx.lineTo(X(L[0]) - 9 * Math.cos(an) - 5 * Math.sin(an), Y(L[1]) - 9 * Math.sin(an) + 5 * Math.cos(an)); ctx.fill();
        if (ris && ris.seg && ris.seg[ri]) {
          ctx.font = "bold 10px sans-serif";
          for (let k = 0; k < g.length - 1; k++) {
            const a = g[k].o, b = g[k + 1].i, t = ris.seg[ri][k];
            if (!(t > 0) || Math.hypot(a[0] - b[0], a[1] - b[1]) < 9) continue;
            const mx = X((a[0] + b[0]) / 2), my = Y((a[1] + b[1]) / 2), s = kN(t);
            ctx.fillStyle = bg; ctx.fillRect(mx - 17, my - 7, 34, 14);
            ctx.fillStyle = "#ff9f1c"; ctx.fillText(s, mx, my);
          }
          ctx.font = "11px sans-serif";
        }
      });
      // corda in tracciamento
      if (tracc && tracc.length) {
        ctx.setLineDash([5, 4]); ctx.strokeStyle = "#ffd700"; ctx.lineWidth = 2.2; ctx.beginPath();
        tracc.map(byId).forEach((p, j) => { if (!p) return; j ? ctx.lineTo(X(p.x), Y(p.y)) : ctx.moveTo(X(p.x), Y(p.y)); });
        ctx.stroke(); ctx.setLineDash([]);
      }
      // ancoraggi, carico, operatori
      items.forEach(it => {
        if (it.t === "anc") {
          ctx.fillStyle = "#8b96a3"; ctx.fillRect(X(it.x) - 9, Y(it.y) - 9, 18, 18);
          ctx.fillStyle = "#10141a"; ctx.fillText(it.nome, X(it.x), Y(it.y));
        } else if (it.t === "car") {
          ctx.fillStyle = "#ffd700"; ctx.fillRect(X(it.x) - 24, Y(it.y) - 12, 48, 24);
          ctx.fillStyle = "#000"; ctx.font = "bold 11px sans-serif"; ctx.fillText((Number($("#pa-kg").value) || 0) + " kg", X(it.x), Y(it.y)); ctx.font = "11px sans-serif";
        } else if (it.t === "op") {
          ctx.fillStyle = "#2f9e5b"; ctx.beginPath(); ctx.moveTo(X(it.x) - 11, Y(it.y) - 9); ctx.lineTo(X(it.x) + 11, Y(it.y) - 9); ctx.lineTo(X(it.x), Y(it.y) + 11); ctx.fill();
          ctx.fillStyle = "#2f9e5b"; ctx.fillText("Operatori", X(it.x), Y(it.y) - 16);
        }
        if (it.id === sel || it.id === fissa || (tracc && tracc.includes(it.id))) {
          ctx.strokeStyle = "#ffd700"; ctx.lineWidth = 2; ctx.setLineDash([3, 2]);
          ctx.beginPath(); ctx.arc(X(it.x), Y(it.y), (it.t === "car" ? 28 : 19), 0, 7); ctx.stroke(); ctx.setLineDash([]);
        }
      });
    }

    // ---------- pannelli ----------
    function pannelloSel() {
      const it = sel && byId(sel), box = $("#pa-sel");
      if (!it) { box.innerHTML = ""; return; }
      let h = '<div class="el"><div class="elh"><b>' + nome(it) + '</b>' + ((it.t === "car" || it.t === "op") ? "" : '<span class="ctl"><button type="button" id="pa-sx" aria-label="Elimina">✕</button></span>') + '</div>';
      if (it.t === "pul" || it.t === "blo" || it.t === "dis") {
        const fo = it.f ? (it.f === "car" ? "il carico" : (byId(it.f) || {nome: "?"}).nome) : null;
        h += '<p class="nota" style="margin-top:8px">Fulcro: ' + (fo ? "<b>fissata a " + fo + "</b>" : "<b>libera</b> (si muove con la corda)") + '</p>' +
          '<div class="chips"><button type="button" id="pa-sc" class="acc">' + (fissa === it.id ? "Tocca il punto…" : "Fissa a…") + '</button>' + (it.f ? '<button type="button" id="pa-sl">Libera</button>' : "") + '</div>';
      }
      if (it.t === "blo") h += '<label class="chk"><input type="checkbox" id="pa-sp"' + (it.p ? " checked" : "") + '> Con puleggia (conta come un passaggio)</label>';
      if (it.t === "dis") h += '<label for="pa-se" style="margin-top:8px">Rendimento di passaggio del discensore (0,1–1)</label><input type="number" id="pa-se" inputmode="decimal" min="0.1" max="1" step="0.05" value="' + it.e + '"><p class="nota">Il discensore conta come un passaggio con questo rendimento (più basso = più attrito). Con attriti disattivati vale 1.</p>';
      if (it.t === "car") h += '<p class="nota">Il peso si imposta in “Dati”.</p>';
      if (it.t === "op") h += '<p class="nota">Capo di tiro: la corda deve finire qui.</p>';
      box.innerHTML = h + "</div>";
      if ($("#pa-sf")) $("#pa-sf").value = it.f;
    }
    function elencoCorde() {
      $("#pa-corde").innerHTML = corde.length ? '<div class="nota" style="margin-bottom:4px">Corde (dal capo morto al capo di tiro):</div>' + corde.map((c, i) =>
        '<div class="el"><div class="elh"><span>' + (i + 1) + " · " + c.map(id => { const o = byId(id); return o ? nome(o) : "?"; }).join(" → ") + '</span><span class="ctl"><button type="button" data-a="inv" data-i="' + i + '" aria-label="Inverti">⇄</button><button type="button" data-a="del" data-i="' + i + '" aria-label="Elimina corda">✕</button></span></div></div>').join("") : "";
    }

    function calcola() {
      const kg = Math.max(0, Number($("#pa-kg").value) || 0), h = Math.max(0, Number($("#pa-h").value) || 0);
      const eta = Math.min(1, Math.max(0.3, Number($("#pa-eta").value) || 0.95));
      const W = kg * G;
      const re = risolvi(eta, W), id = risolvi(1, W);
      const avv = [];
      if (re.err || id.err) {
        $("#pa-ris").innerHTML = ""; $("#pa-anc").innerHTML = ""; $("#pa-mini").innerHTML = "Vantaggio non calcolabile: vedi l’avviso sotto.";
        avv.push(re.err || id.err);
        disegna(null);
      } else {
        const vmTeo = W / id.tiro, vmReale = W / re.tiro, ideale = id.tiro;
        const vt = Math.abs(vmTeo - Math.round(vmTeo)) < 0.005 ? String(Math.round(vmTeo)) : fmt(vmTeo, 2);
        const pc = fmt(ideale > 0 ? (re.tiro / ideale - 1) * 100 : 0, 0);
        $("#pa-mini").innerHTML = "Senza attriti: <b>1:" + vt + "</b> (tiro " + daN(ideale) + " daN)<br>Con attriti (" + fmt(eta, 2) + "): <b>1:" + fmt(vmReale, 2) + "</b> (tiro " + daN(re.tiro) + " daN)";
        $("#pa-ris").innerHTML =
          '<div class="vcell"><div class="k">Senza attriti (rendimento 1)</div><div class="v">1:' + vt + '</div><div class="k">tiro ' + daN(ideale) + ' daN · ' + kN(ideale) + ' kN</div></div>' +
          '<div class="vcell"><div class="k">Con attriti (rendimento ' + fmt(eta, 2) + ')</div><div class="v">1:' + fmt(vmReale, 2) + '</div><div class="k">tiro ' + daN(re.tiro) + ' daN · ' + kN(re.tiro) + ' kN</div></div>' +
          '<div class="vcell"><div class="k">Tiro da fare (con attriti)</div><div class="v">' + daN(re.tiro) + ' <small>daN</small></div><div class="k">circa ' + fmt(re.tiro / G, 0) + ' kg</div></div>' +
          '<div class="vcell"><div class="k">Perdita per attriti</div><div class="v">' + pc + ' <small>%</small></div></div>' +
          '<div class="vcell g"><div class="k">Corda da recuperare per ' + fmt(h, 1) + ' m di sollevamento</div><div class="v">' + fmt(h * vmTeo, 1) + ' <small>m</small></div></div>';
        let righe = '<tr><td>Carico sollevato</td><td>' + kN(W) + ' kN</td></tr>';
        corde.forEach((c, i) => {
          const s = re.seg[i]; if (!s || !s.length || !(re.T[i] > 0)) return;
          righe += '<tr><td>Corda ' + (i + 1) + '<br><small style="color:var(--text-dim)">capo morto ' + kN(s[0]) + ' kN · capo di tiro ' + kN(s[s.length - 1]) + ' kN</small></td><td>' + daN(s[s.length - 1]) + ' daN</td></tr>';
        });
        items.forEach(it => {
          if (!(it.t === "pul" || it.t === "blo" || it.t === "dis" || it.t === "anc")) return;
          let F = 0;
          const v = re.forza[it.id];
          if (v) F = v.reduce((a, c, ri) => a + c * re.T[ri], 0);
          if (it.t === "anc") {      // forza sull'ancoraggio: somma di quanto trattengono i punti fissati a lui
            items.forEach(o => { if (o.f === it.id && re.forza[o.id]) F += re.forza[o.id].reduce((a, c, ri) => a + c * re.T[ri], 0); });
          }
          if (Math.abs(F) < 1) return;
          righe += '<tr><td>' + it.nome + (it.t !== "anc" ? '<br><small style="color:var(--text-dim)">fulcro: ' + (it.f ? (it.f === "car" ? "carico" : (byId(it.f) || {nome: "?"}).nome) : "libero") + '</small>' : "") + '</td><td>' + kN(Math.abs(F)) + ' kN</td></tr>';
        });
        $("#pa-anc").innerHTML = righe;
        if (eta < 0.8 && vmTeo >= 4) avv.push("Con questi rendimenti i sistemi con molti capi perdono molto: valuta carrucole su cuscinetti.");
        if (re.tiro / G > 60) avv.push("Il tiro supera 60 kg: serve più di una persona o un sistema con più vantaggio.");
        if (re.orizz) avv.push("Qualche tratto di corda è orizzontale: nel calcolo conta solo la componente verticale, quindi disegnalo in verticale.");
        disegna(re);
      }
      $("#pa-avv").innerHTML = avv.map(t => '<div class="avv">' + t + '</div>').join("");
    }
    function tutto() { pannelloSel(); elencoCorde(); calcola(); }

    // ---------- interazione ----------
    const cv = $("#pa-cv");
    const pos = e => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * VW / r.width, (e.clientY - r.top) * VW / r.width]; };
    const trova = (x, y) => {
      const r = cv.getBoundingClientRect(), k = VW / r.width, rad = HIT * k;
      let best = null, bd = 1e9;
      items.forEach(it => { const d = Math.hypot(it.x - x, it.y - y); if (d < rad && d < bd) { bd = d; best = it; } });
      return best;
    };
    let drag = null;
    cv.addEventListener("pointerdown", e => {
      const [x, y] = pos(e), it = trova(x, y);
      if (fissa) {
        const src = byId(fissa);
        if (it && src && it.id !== fissa && (it.t === "anc" || it.t === "car" || it.t === "pul" || it.t === "blo" || it.t === "dis")) {
          src.f = it.t === "car" ? "car" : it.id;
          $("#pa-hint").textContent = nome(src) + " fissata a " + nome(it) + ".";
        } else $("#pa-hint").innerHTML = HINT;
        fissa = null; tutto(); return;
      }
      if (tracc) {
        if (it) { if (tracc[tracc.length - 1] !== it.id) tracc.push(it.id); calcola(); $("#pa-hint").textContent = "Corda: " + tracc.map(id => nome(byId(id))).join(" → ") + ". Tocca il punto successivo, poi “Fine corda”."; }
        return;
      }
      if (!it) { if (sel) { sel = null; tutto(); } return; }
      drag = {it, dx: it.x - x, dy: it.y - y, mosso: false};
      cv.setPointerCapture(e.pointerId);
      if (sel !== it.id) { sel = it.id; pannelloSel(); calcola(); }
    });
    cv.addEventListener("pointermove", e => {
      if (!drag) return;
      const [x, y] = pos(e);
      drag.mosso = true;
      drag.it.x = Math.max(3, Math.min(VW - 3, x + drag.dx)); drag.it.y = Math.max(3, Math.min(VH - 3, y + drag.dy));
      calcola();
    });
    const fine = () => {
      const d = drag; drag = null;
      if (d && d.mosso && (d.it.t === "pul" || d.it.t === "blo" || d.it.t === "dis") && !d.it.f) {
        let best = null, bd = 8;
        items.forEach(o => { if (o === d.it || !(o.t === "anc" || o.t === "car")) return; const k = Math.hypot(o.x - d.it.x, o.y - d.it.y); if (k < bd) { bd = k; best = o; } });
        if (best) { d.it.f = best.t === "car" ? "car" : best.id; $("#pa-hint").textContent = nome(d.it) + " fissata a " + nome(best) + "."; tutto(); }
      }
    };
    cv.addEventListener("pointerup", fine); cv.addEventListener("pointercancel", fine);

    $("#pa-add").addEventListener("click", e => {
      const b = e.target.closest("button[data-t]"); if (!b) return;
      const t = b.dataset.t, n = items.filter(i => i.t === t).length;
      const it = add(t, 50 + (n % 4) * 8 - 12, t === "anc" ? 8 : 40 + (n % 5) * 8, t === "blo" ? {p: b.dataset.p === "1"} : {});
      sel = it.id; tutto();
    });
    $("#pa-reset").addEventListener("click", () => {
      azzera(); add("car", 25, 88); add("op", 75, 122);
      $("#pa-cd").textContent = "Disegna corda"; $("#pa-hint").innerHTML = "Sistema azzerato. " + HINT;
      tutto();
    });
    $("#pa-calc").addEventListener("click", () => { calcola(); $("#pa-mini").scrollIntoView({block: "nearest"}); });
    $("#pa-cd").addEventListener("click", () => {
      const b = $("#pa-cd");
      if (!tracc) {
        tracc = []; sel = null; b.textContent = "Fine corda";
        $("#pa-hint").textContent = "Tocca in ordine: capo morto, carrucole e bloccanti attraversati, e per ultimo il capo di tiro (Operatori, oppure il punto a cui è legata).";
        tutto();
      } else {
        if (tracc.length >= 2) corde.push(tracc.slice());
        tracc = null; b.textContent = "Disegna corda";
        $("#pa-hint").innerHTML = HINT;
        tutto();
      }
    });
    $("#pa-sel").addEventListener("change", e => {
      const it = byId(sel); if (!it) return;
      if (e.target.id === "pa-sp") it.p = e.target.checked;
      if (e.target.id === "pa-se") it.e = Math.min(1, Math.max(0.1, parseFloat(String(e.target.value).replace(",", ".")) || 0.6));
      tutto();
    });
    $("#pa-sel").addEventListener("click", e => {
      const itc = byId(sel);
      if (itc && e.target.closest("#pa-sc")) {
        fissa = fissa === itc.id ? null : itc.id;
        $("#pa-hint").innerHTML = fissa ? "Tocca l’ancoraggio, il carico o la carrucola a cui è fissata <b>" + nome(itc) + "</b>. Tocca uno spazio vuoto per annullare." : HINT;
        tutto(); return;
      }
      if (itc && e.target.closest("#pa-sl")) { itc.f = ""; tutto(); return; }
      if (!e.target.closest("#pa-sx")) return;
      const id = sel;
      items = items.filter(i => i.id !== id);
      items.forEach(i => { if (i.f === id) i.f = ""; });
      corde = corde.map(c => c.filter(x => x !== id)).filter(c => c.length >= 2);
      sel = null; tutto();
    });
    $("#pa-corde").addEventListener("click", e => {
      const b = e.target.closest("button[data-a]"); if (!b) return;
      const i = Number(b.dataset.i);
      if (b.dataset.a === "del") corde.splice(i, 1); else corde[i].reverse();
      tutto();
    });

    $("#pa-pre").innerHTML = PRESET.map((p, i) => '<button type="button" data-i="' + i + '">' + p[0] + "</button>").join("");
    $("#pa-pre").addEventListener("click", e => {
      const b = e.target.closest("button"); if (!b) return;
      if (tracc) { tracc = null; $("#pa-cd").textContent = "Disegna corda"; }
      sistema(PRESET[Number(b.dataset.i)][1]); tutto();
    });
    $("#pa-tipo").addEventListener("change", () => {
      const v = $("#pa-tipo").value;
      if (v !== "x") $("#pa-eta").value = v;
      calcola();
    });
    $("#pa-eta").addEventListener("input", () => { $("#pa-tipo").value = "x"; });
    root.addEventListener("input", e => { if (e.target.closest("#pa-sel")) return; calcola(); });
    window.addEventListener("resize", () => calcola());
    $("#pa-hint").innerHTML = HINT;
    sistema([3]);
    tutto();
  }
});
