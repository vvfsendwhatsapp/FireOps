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
.pg-paranchi .sez { margin: 12px 0 6px; font-size: 12px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; color: var(--text-dim); }
.pg-paranchi .tb { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.pg-paranchi .tb#pa-add { grid-template-columns: 1fr 1fr 1fr; }
.pg-paranchi .tb.tre { grid-template-columns: 2fr 1fr 1fr; }
.pg-paranchi .tb button { min-height: 48px; padding: 0 10px; border: 1px solid var(--line); border-radius: 8px; background: var(--panel-2); color: var(--text); font: inherit; font-size: 14px; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; }
.pg-paranchi .tb button i { width: 12px; height: 12px; border-radius: 50%; flex: none; }
.pg-paranchi .tb button.acc { background: var(--yellow); color: #000; border-color: var(--yellow); }
.pg-paranchi .cvwrap { position: relative; }
.pg-paranchi canvas.pi { -webkit-touch-callout: none; -webkit-user-select: none; user-select: none; }
.pg-paranchi #pa-ban { position: absolute; left: 6px; right: 6px; top: 6px; z-index: 2; display: flex; align-items: center; gap: 8px; padding: 6px 8px; border: 1px solid var(--yellow); border-radius: 8px; background: rgba(16,20,26,.92); color: var(--text); font-size: 12.5px; line-height: 1.3; pointer-events: none; }
.pg-paranchi #pa-ban[hidden], .pg-paranchi #pa-menu[hidden] { display: none; }
.pg-paranchi #pa-ban span { flex: 1; }
.pg-paranchi #pa-ban button { pointer-events: auto; min-height: 44px; padding: 0 12px; border: 1px solid var(--line); border-radius: 8px; background: var(--panel-2); color: var(--text); font: inherit; cursor: pointer; }
.pg-paranchi #pa-ban button.acc { background: var(--yellow); color: #000; border-color: var(--yellow); }
.pg-paranchi #pa-menu { position: absolute; z-index: 3; display: flex; flex-direction: column; gap: 6px; min-width: 190px; padding: 8px; border: 1px solid var(--line); border-radius: 10px; background: var(--panel); box-shadow: 0 6px 22px rgba(0,0,0,.5); }
.pg-paranchi #pa-menu b { font-size: 14px; padding: 0 2px; }
.pg-paranchi #pa-menu button { min-height: 48px; padding: 0 12px; border: 1px solid var(--line); border-radius: 8px; background: var(--panel-2); color: var(--text); font: inherit; font-size: 15px; text-align: left; cursor: pointer; }
.pg-paranchi #pa-menu button.acc { background: var(--yellow); color: #000; border-color: var(--yellow); font-weight: 700; }
.pg-paranchi #pa-menu .rg { display: flex; gap: 6px; align-items: center; }
.pg-paranchi #pa-menu .rg button { flex: 1; text-align: center; }
.pg-paranchi #pa-menu button[aria-pressed="true"] { background: var(--yellow); color: #000; border-color: var(--yellow); font-weight: 700; }
.pg-paranchi #pa-menu .rg span { flex: 2; text-align: center; font-size: 14px; }
.pg-paranchi .chips button.acc { background: var(--yellow); color: #000; border-color: var(--yellow); }
.pg-paranchi canvas.pi { height: auto; }
`,

  html: `
<div class="blocco">
  <h2 class="tit">Disegno del sistema</h2>
  <div class="cvwrap"><canvas id="pa-cv" class="pi" role="img" aria-label="Disegno del sistema di recupero: trascina carrucole, bloccanti e ancoraggi. Tieni premuto su un punto per il menu."></canvas><div id="pa-ban" hidden></div><div id="pa-menu" hidden></div></div>
  <div class="avv" id="pa-mini" style="border-color:var(--line);background:var(--panel-2);margin:8px 0 0"></div>
  <div class="sez">Aggiungi</div>
  <div class="tb" id="pa-add">
    <button type="button" data-t="anc"><i style="background:#8b96a3"></i>Ancoraggio</button><button type="button" data-t="pul"><i style="background:#4A93C8"></i>Carrucola</button><button type="button" data-t="pul2"><i style="background:#4A93C8"></i>Doppia</button><button type="button" data-t="blo"><i style="background:#c77dff"></i>Bloccante</button><button type="button" data-t="dis"><i style="background:#ff6b6b"></i>Discensore</button>
  </div>
  <div class="sez">Corda e calcolo</div>
  <div class="tb tre">
    <button type="button" id="pa-cd" class="acc">Disegna corda</button><button type="button" id="pa-calc">Calcola</button><button type="button" id="pa-reset">Reset</button>
  </div>
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
    const G = 9.80665, R = 4.5, VW = 100, VH = 142, HIT = 20;
    const fmt = (v, d) => Number(v).toLocaleString("it-IT", {minimumFractionDigits: d, maximumFractionDigits: d});
    const kN = v => fmt(v / 1000, 2), daN = v => fmt(v / 10, 0);

    let items = [], corde = [], sel = null, tracc = null, uid = 0, cnt = {anc: 0, pul: 0, blo: 0, dis: 0};
    const HINT = "<b>1</b> Aggiungi punti e trascinali. <b>2</b> Fissa ogni carrucola: trascinala vicino a un ancoraggio o al carico (si aggancia), oppure toccala e usa “Fissa a…”. <b>3</b> “Disegna corda” e tocca i punti nell’ordine di passaggio.";
    let fissa = null, menu = null, menuC = null, pressT = null, nuova = false, ins = null, nsel = null;
    const isP = it => !!it && (it.t === "pul" || it.t === "pul2");
    const base = id => String(id).split(":")[0], sh = id => String(id).split(":")[1] || null;   // un nodo di corda puo' essere "i7:A" = puleggia A della doppia
    const byId = id => items.find(i => i.id === base(id));
    const nomeNodo = id => { const it = byId(id); return it ? nome(it) + (sh(id) || "") : "?"; };
    const nome = it => it.t === "car" ? "Carico" : it.t === "op" ? "Operatori" : it.nome;
    function add(t, x, y, extra) {
      const it = Object.assign({id: "i" + (++uid), t, x, y, f: "", p: true, e: 0.6, v: "cam"}, extra || {});
      if (t === "anc") it.nome = "A" + (++cnt.anc);
      if (t === "pul" || t === "pul2") it.nome = "C" + (++cnt.pul);
      if (t === "blo") { it.nome = "B" + (++cnt.blo); it.p = false; }
      if (t === "dis") it.nome = "D" + (++cnt.dis);
      items.push(it);
      return it;
    }
    function azzera() { items = []; corde = []; sel = null; tracc = null; fissa = null; ins = null; nsel = null; nuova = false; cnt = {anc: 0, pul: 0, blo: 0, dis: 0}; }

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
    // sistema di partenza: carico appeso a una corda che passa nel discensore fissato all'ancoraggio, e gli operatori tirano
    function avvio() {
      azzera();
      const car = add("car", 31.7, 88), anc = add("anc", 38, 10), dis = add("dis", 38, 26, {f: anc.id}), op = add("op", 44.3, 118);
      corde.push([car.id, dis.id, op.id]);
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
    const fatt = (it, eta) => !it ? 1 : isP(it) || (it.t === "blo" && it.p) ? 1 / eta : it.t === "dis" ? (eta >= 1 ? 1 : 1 / it.e) : 1;
    // bloccante che morde la corda (non fissato a un punto fermo): la corda si interrompe li' e le due parti sono legate al bloccante
    const morde = it => it && it.t === "blo" && !it.p && corpo(it) !== "fix";
    function risolvi(eta, W) {
      const eff = [], orig = [], primo = [], ultimo = [];
      corde.forEach((c, oi) => {
        let cur = c.length ? [c[0]] : [];
        primo[oi] = eff.length;
        for (let j = 1; j < c.length; j++) {
          cur.push(c[j]);
          if (j < c.length - 1 && morde(byId(c[j]))) { eff.push(cur); orig.push(oi); cur = [c[j]]; }
        }
        eff.push(cur); orig.push(oi); ultimo[oi] = eff.length - 1;
      });
      const nR = eff.length;
      if (!corde.length) return {err: "Disegna la corda: tocca “Disegna corda” e poi i punti in ordine, dal capo morto al capo di tiro."};
      const righe = {car: new Array(nR).fill(0)}, forza = {}, coefs = [];
      let orizz = 0;
      eff.forEach((c, ri) => {
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
      if (!colu.includes(ultimo[op])) return {err: "La corda degli operatori non è collegata al carico: controlla i collegamenti."};
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
      const seg = corde.map(() => []);
      eff.forEach((c, ri) => { coefs[ri].forEach(f => seg[orig[ri]].push(f * T[ri])); });
      const Tr = corde.map((c, oi) => T[primo[oi]]);
      const tiro = seg[op][seg[op].length - 1];
      return {T, Tr, seg, tiro, forza, op, orizz};
    }

    // ---------- disegno ----------
    const lung = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
    const rg = it => it.t === "dis" && it.v === "cam" ? 1.4 * R : 1.2 * R;   // raggio del giro della corda: la camma e' piu' grande
    function assegna() {   // carrucola doppia: il 1° passaggio usa la puleggia di sinistra, il 2° quella di destra, e cosi' via
      const m = {}, n = {};
      corde.forEach((c, ri) => c.forEach((id, j) => {
        const it = byId(id);
        if (it && it.t === "pul2" && !sh(id) && j > 0 && j < c.length - 1) { n[id] = (n[id] || 0) + 1; m[ri + ":" + j] = n[id] % 2 === 1 ? -1 : 1; }
      }));
      return m;
    }
    function geom(c) {   // punti di passaggio di una corda
      const nodi = c.map(byId), ass = assegna(), ri = corde.indexOf(c);
      return nodi.map((p, j) => {
        if (!p) return null;
        if (j === 0 || j === nodi.length - 1 || !(isP(p) || p.t === "blo" || p.t === "dis") || (p.t === "blo" && !p.p)) return {p, i: [p.x, p.y], o: [p.x, p.y], arco: null};   // il bloccante puro prende la corda e la lascia passare dritta
        const pv = nodi[j - 1], nx = nodi[j + 1];
        const rr = rg(p), cxs = p.t === "pul2" ? p.x + (sh(c[j]) ? (sh(c[j]) === "A" ? -1 : 1) : (ass[ri + ":" + j] || -1)) * 1.15 * rr : p.x;
        const sin = pv && pv.x > (p.t === "pul2" ? cxs : p.x) + 0.01 ? 1 : -1;
        const aIn = sin > 0 ? 0 : Math.PI;
        const sotto = pv && nx ? (pv.y + nx.y) / 2 < p.y : true;
        const sg = (sotto ? 1 : -1) * (aIn === Math.PI ? -1 : 1);
        const arco = [];
        for (let k = 0; k <= 12; k++) { const a = aIn + sg * Math.PI * k / 12; arco.push([cxs + rr * Math.cos(a), p.y + rr * Math.sin(a)]); }
        return {p, i: arco[0], o: arco[12], arco, sotto};
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
      const via = {};   // da che parte gira la corda sui discensori (sotto = true)
      corde.forEach(c => geom(c).forEach(g => { if (g && g.arco) via[g.p.id] = g.sotto; }));
      // carrucole e bloccanti
      items.forEach(it => {
        if (!isP(it) && it.t !== "blo" && it.t !== "dis") return;
        ctx.fillStyle = bg; ctx.strokeStyle = isP(it) ? "#4A93C8" : it.t === "dis" ? "#ff6b6b" : "#c77dff"; ctx.lineWidth = 2.4;
        if (it.t === "pul2") {
          const rr = rg(it), b = 0.72 * rr * u, d = 1.15 * rr * u, pr = b + 3, cx = X(it.x), cy = Y(it.y);
          const forma = () => { ctx.beginPath(); [cx - d, cx + d].forEach(x => { ctx.moveTo(x + pr, cy); ctx.arc(x, cy, pr, 0, 7); }); ctx.moveTo(cx - d - pr * 0.75, cy + pr * 0.65); ctx.lineTo(cx + d + pr * 0.75, cy + pr * 0.65); ctx.lineTo(cx, cy + pr * 2.1); ctx.closePath(); };
          ctx.lineJoin = "round"; ctx.lineWidth = 5; forma(); ctx.stroke(); forma(); ctx.fill();    // carcassa a cuore
          ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(cx - d, cy, b, 0, 7); ctx.moveTo(cx + d + b, cy); ctx.arc(cx + d, cy, b, 0, 7); ctx.stroke();   // le due pulegge
          ctx.fillStyle = txt; ctx.font = "bold 9px sans-serif"; ctx.fillText(it.nome + "A", cx - d, cy); ctx.fillText(it.nome + "B", cx + d, cy); ctx.font = "11px sans-serif";
          return;
        }
        ctx.beginPath();
        if (it.t === "dis" && it.v === "cam") {
          // camma: goccia asimmetrica, la corda le gira intorno all'esterno
          const r = 0.68 * rg(it) * u, L = 0.97 * rg(it) * u, al = (via[it.id] === false ? Math.PI / 2 - 0.5 : -Math.PI / 2 + 0.5), ph = Math.acos(r / L), cx = X(it.x), cy = Y(it.y);
          ctx.moveTo(cx + L * Math.cos(al), cy + L * Math.sin(al));
          ctx.lineTo(cx + r * Math.cos(al + ph), cy + r * Math.sin(al + ph));
          ctx.arc(cx, cy, r, al + ph, al - ph + 2 * Math.PI);
          ctx.closePath();
          ctx.fill(); ctx.stroke();
          ctx.fillStyle = txt; ctx.font = "bold 10px sans-serif"; ctx.fillText(it.nome, cx, cy + (via[it.id] === false ? -3 : 3)); ctx.font = "11px sans-serif";
          return;
        }
        if (it.t === "blo" && !it.p) ctx.rect(X(it.x - R), Y(it.y - R), 2 * R * u, 2 * R * u); else ctx.arc(X(it.x), Y(it.y), 0.72 * rg(it) * u, 0, 7);   // il corpo e' piu' piccolo del giro: la corda passa all'esterno
        ctx.fill(); ctx.stroke();
        ctx.fillStyle = txt; ctx.fillText(it.nome, X(it.x), Y(it.y));
      });
      // corde
      corde.forEach((c, ri) => {
        const g = geom(c); if (g.length < 2 || g.some(x => !x)) return;
        ctx.strokeStyle = ri === menuC ? "#ffb27a" : "#e8734a"; ctx.lineWidth = ri === menuC ? 5 : 2.6; ctx.beginPath();
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
          // pompiere che tira: le mani sono sul capo della corda (centro del punto)
          const cx = 0, cy = 0;
          ctx.save(); ctx.translate(X(it.x), Y(it.y)); ctx.scale(1.4, 1.4);
          ctx.lineCap = "round"; ctx.lineJoin = "round";
          ctx.strokeStyle = "#2f9e5b"; ctx.lineWidth = 5;
          ctx.beginPath(); ctx.moveTo(cx + 3, cy - 10); ctx.lineTo(cx + 4, cy + 12); ctx.stroke();                     // busto
          ctx.lineWidth = 4;
          ctx.beginPath(); ctx.moveTo(cx + 4, cy + 12); ctx.lineTo(cx - 3, cy + 30); ctx.moveTo(cx + 4, cy + 12); ctx.lineTo(cx + 12, cy + 30); ctx.stroke();   // gambe
          ctx.lineWidth = 3.5;
          ctx.beginPath(); ctx.moveTo(cx + 3, cy - 7); ctx.lineTo(cx + 1, cy - 1); ctx.lineTo(cx, cy); ctx.moveTo(cx + 3, cy - 5); ctx.lineTo(cx + 6, cy + 3); ctx.lineTo(cx, cy + 3); ctx.stroke();   // braccia
          ctx.fillStyle = "#f1c9a5"; ctx.beginPath(); ctx.arc(cx + 3, cy - 16, 5, 0, 7); ctx.fill();                  // testa
          ctx.fillStyle = "#d62828"; ctx.beginPath(); ctx.arc(cx + 3, cy - 17, 6.5, Math.PI, 2 * Math.PI); ctx.fill(); // elmo
          ctx.fillRect(cx - 5, cy - 17.5, 17, 2.5); ctx.fillStyle = "#ffd700"; ctx.fillRect(cx - 1, cy - 22, 8, 2);   // tesa e fascia
          ctx.fillStyle = "#2f9e5b"; ctx.font = "bold 10px sans-serif"; ctx.fillText("Operatori", cx + 3, cy - 33); ctx.font = "11px sans-serif"; ctx.restore();
        }
        if (it.id === sel || it.id === fissa || (tracc && tracc.some(x => base(x) === it.id))) {
          ctx.strokeStyle = "#ffd700"; ctx.lineWidth = 2; ctx.setLineDash([3, 2]);
          ctx.beginPath(); ctx.arc(X(it.x), Y(it.y), (it.t === "car" ? 28 : 19), 0, 7); ctx.stroke(); ctx.setLineDash([]);
        }
      });
    }

    // ---------- pannelli ----------
    function stato(it) {   // spiega perche' un punto senza fulcro non e' bloccato
      const legata = [], passa = [];
      corde.forEach((c, i) => { if (base(c[0]) === it.id || base(c[c.length - 1]) === it.id) legata.push(i + 1); if (c.slice(1, -1).some(x => base(x) === it.id)) passa.push(i + 1); });
      if (legata.length) return "<b>non fissata a niente</b>: la tiene la corda " + legata.join(", ") + " (è legata lì). Se è una carrucola mobile va bene così.";
      if (passa.length && it.t === "blo") return "<b>sulla corda " + passa.join(", ") + "</b>: la corda passa dritta nel bloccante e il tiro non cambia. Per vincolarlo premi “Fissa a…” (ancoraggio, carico o carrucola).";
      if (passa.length) return "<b>non fissata a niente</b>: la tiene solo la corda " + passa.join(", ") + " che ci passa. È giusto per una carrucola mobile; per una fissa premi “Fissa a…”.";
      return "<b>non fissata a niente</b>: premi “Fissa a…” per attaccarla a un ancoraggio, al carico o a un’altra carrucola.";
    }
    function pannelloSel() {
      const it = sel && byId(sel), box = $("#pa-sel");
      if (!it) { box.innerHTML = ""; return; }
      let h = '<div class="el"><div class="elh"><b>' + nome(it) + '</b>' + ((it.t === "car" || it.t === "op") ? "" : '<span class="ctl"><button type="button" id="pa-sx" aria-label="Elimina">✕</button></span>') + '</div>';
      if (isP(it) || it.t === "blo" || it.t === "dis") {
        const fo = it.f ? (it.f === "car" ? "il carico" : (byId(it.f) || {nome: "?"}).nome) : null;
        h += '<p class="nota" style="margin-top:8px">Fulcro: ' + (fo ? "<b>fissata a " + fo + "</b>" : stato(it)) + '</p>' +
          '<div class="chips"><button type="button" id="pa-sc" class="acc">' + (fissa === it.id ? "Tocca il punto…" : "Fissa a…") + '</button>' + (it.f ? '<button type="button" id="pa-sl">Libera</button>' : "") + '</div>';
      }
      if (it.t === "blo") h += '<p class="nota">Il bloccante morde la corda e la lascia passare dritta, senza puleggia e senza perdite.</p>';
      if (it.t === "dis") h += '<div class="chips" style="margin-top:8px"><button type="button" data-dt="pul" aria-pressed="' + (it.v === "pul") + '">Con puleggia</button><button type="button" data-dt="cam" aria-pressed="' + (it.v !== "pul") + '">A camma</button></div>';
      if (it.t === "dis") h += '<label for="pa-se" style="margin-top:8px">Rendimento di passaggio del discensore (0,1–1)</label><input type="number" id="pa-se" inputmode="decimal" min="0.1" max="1" step="0.05" value="' + it.e + '"><p class="nota">Con puleggia: la corda gira intorno (rendimento di partenza 0,85). A camma: autofrenante, la corda passa dritta (rendimento di partenza 0,6). Il rendimento è modificabile; senza attriti vale 1.</p>';
      if (it.t === "car") h += '<p class="nota">Il peso si imposta in “Dati”.</p>';
      if (it.t === "op") h += '<p class="nota">Capo di tiro: la corda deve finire qui.</p>';
      box.innerHTML = h + "</div>";
      if ($("#pa-sf")) $("#pa-sf").value = it.f;
    }
    function elencoCorde() {
      if (!corde.length) { $("#pa-corde").innerHTML = ""; return; }
      $("#pa-corde").innerHTML = '<div class="nota" style="margin-bottom:4px">Corde, dal capo morto al capo di tiro. Tocca un punto della corda per spostarlo, toglierlo o inserire altri punti dopo di lui.</div>' + corde.map((c, i) => {
        const inMod = tracc === c;
        let h = '<div class="el"><div class="elh"><b>Corda ' + (i + 1) + (inMod ? " · in modifica" : "") + '</b><span class="ctl"><button type="button" data-a="mod" data-i="' + i + '" aria-label="Modifica corda">✎</button><button type="button" data-a="inv" data-i="' + i + '" aria-label="Inverti">⇄</button><button type="button" data-a="del" data-i="' + i + '" aria-label="Elimina corda">✕</button></span></div>';
        h += '<div class="chips nodi" style="margin-top:6px">' + (c.length ? c.map((id, k) => { const o = byId(id); return '<button type="button" data-i="' + i + '" data-k="' + k + '" aria-pressed="' + String(!!nsel && nsel.i === i && nsel.k === k) + '">' + (k + 1) + " " + nomeNodo(id) + "</button>"; }).join("") : '<span class="nota">nessun punto</span>') + "</div>";
        if (nsel && nsel.i === i && c[nsel.k]) {
          h += '<div class="ctl" style="margin-top:6px;flex-wrap:wrap"><button type="button" data-n="su" data-i="' + i + '" aria-label="Sposta prima">◀</button><button type="button" data-n="giu" data-i="' + i + '" aria-label="Sposta dopo">▶</button><button type="button" data-n="ins" data-i="' + i + '" style="min-width:auto;padding:0 12px">＋ Inserisci dopo</button><button type="button" data-n="del" data-i="' + i + '" aria-label="Togli punto">✕</button></div>';
        }
        return h + "</div>";
      }).join("");
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
          const s = re.seg[i]; if (!s || !s.length || !(re.Tr[i] > 0)) return;
          righe += '<tr><td>Corda ' + (i + 1) + '<br><small style="color:var(--text-dim)">capo morto ' + kN(s[0]) + ' kN · capo di tiro ' + kN(s[s.length - 1]) + ' kN</small></td><td>' + daN(s[s.length - 1]) + ' daN</td></tr>';
        });
        items.forEach(it => {
          if (!(isP(it) || it.t === "blo" || it.t === "dis" || it.t === "anc")) return;
          let F = 0;
          const v = re.forza[it.id];
          if (v) F = v.reduce((a, c, ri) => a + c * re.T[ri], 0);
          if (it.t === "anc") {      // forza sull'ancoraggio: somma di quanto trattengono i punti fissati a lui
            items.forEach(o => { if (o.f === it.id && re.forza[o.id]) F += re.forza[o.id].reduce((a, c, ri) => a + c * re.T[ri], 0); });
          }
          if (Math.abs(F) < 1) return;
          righe += '<tr><td>' + it.nome + (it.t !== "anc" ? '<br><small style="color:var(--text-dim)">fulcro: ' + (it.f ? (it.f === "car" ? "carico" : (byId(it.f) || {nome: "?"}).nome) : "mobile, retta dalla corda") + '</small>' : "") + '</td><td>' + kN(Math.abs(F)) + ' kN</td></tr>';
        });
        $("#pa-anc").innerHTML = righe;
        if (eta < 0.8 && vmTeo >= 4) avv.push("Con questi rendimenti i sistemi con molti capi perdono molto: valuta carrucole su cuscinetti.");
        if (re.tiro / G > 60) avv.push("Il tiro supera 60 kg: serve più di una persona o un sistema con più vantaggio.");
        if (re.orizz) avv.push("Qualche tratto di corda è orizzontale: nel calcolo conta solo la componente verticale, quindi disegnalo in verticale.");
        disegna(re);
      }
      $("#pa-avv").innerHTML = avv.map(t => '<div class="avv">' + t + '</div>').join("");
    }
    function aggBan() {
      const b = $("#pa-ban");
      if (fissa) {
        const it = byId(fissa);
        b.innerHTML = "<span>Tocca l’ancoraggio, il carico o la carrucola a cui fissare <b>" + (it ? nome(it) : "") + "</b>" + (it && it.t === "blo" ? ", oppure un punto sulla corda" : "") + "</span><button type=\"button\" data-b=\"annf\">Annulla</button>";
        b.hidden = false;
      } else if (tracc) {
        const i = corde.indexOf(tracc) + 1;
        const testo = ins !== null ? "Inserisci nella corda " + i + " dopo il punto " + (ins + 1) + ": tocca i punti" : "Corda " + i + ": " + (tracc.length ? tracc.map(nomeNodo).join(" → ") : "tocca il capo morto");
        b.innerHTML = "<span>" + testo + "</span>" + (tracc.length ? '<button type="button" data-b="undo" aria-label="Togli ultimo">↶</button>' : "") +
          '<button type="button" class="acc" data-b="finec">Fine</button>' + (nuova ? '<button type="button" data-b="annc">Annulla</button>' : "");
        b.hidden = false;
      } else b.hidden = true;
    }
    function percorso(c) {   // punti disegnati della corda, con l'indice del nodo da cui parte ogni tratto
      const g = geom(c); if (g.length < 2 || g.some(x => !x)) return [];
      const pts = [{p: g[0].o, k: 0}];
      for (let j = 1; j < g.length; j++) {
        pts.push({p: g[j].i, k: j - 1});
        if (g[j].arco) g[j].arco.forEach(q => pts.push({p: q, k: j}));
        if (j < g.length - 1) pts.push({p: g[j].o, k: j});
      }
      return pts;
    }
    function trovaCorda(x, y) {
      const r = cv.getBoundingClientRect(), tol = 14 * VW / r.width;
      let best = null, bd = tol;
      corde.forEach((c, i) => {
        const P = percorso(c);
        for (let a = 0; a + 1 < P.length; a++) {
          const [ax, ay] = P[a].p, [bx, by] = P[a + 1].p, dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
          const t = l2 ? Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / l2)) : 0;
          const px = ax + t * dx, py = ay + t * dy, d = Math.hypot(x - px, y - py);
          if (d < bd) { bd = d; best = {i, k: P[a].k, x: px, y: py}; }
        }
      });
      return best;
    }
    function apriMenuCorda(rc) {
      chiudiMenu(); menuC = rc.i; sel = null;
      const m = $("#pa-menu");
      m.innerHTML = "<b>Corda " + (rc.i + 1) + "</b>" +
        '<button type="button" class="acc" data-m="rmod">Modifica corda</button><button type="button" data-m="rinv">Inverti (capo morto ⇄ capo di tiro)</button><button type="button" data-m="rdel">Elimina corda</button><button type="button" data-m="chiudi">Chiudi</button>';
      m.hidden = false;
      const cw = cv.clientWidth, ch = cv.clientHeight, u = cw / VW;
      m.style.left = Math.max(4, Math.min(cw - m.offsetWidth - 4, rc.x * u + 12)) + "px";
      m.style.top = Math.max(4, Math.min(ch - m.offsetHeight - 4, rc.y * u - 20)) + "px";
      tutto();
    }
    function chiudiMenu() { const era = menuC !== null; $("#pa-menu").hidden = true; menu = null; menuC = null; if (era) calcola(); }
    function apriMenu(it) {
      if (!(isP(it) || it.t === "blo" || it.t === "dis" || it.t === "anc")) return;
      menu = it.id;
      let h = "<b>" + nome(it) + "</b>";
      if (it.t !== "anc") {
        h += '<button type="button" class="acc" data-m="fissa">Fissa a…</button>';
        if (it.f) h += '<button type="button" data-m="libera">Libera (togli fulcro)</button>';
      }
      if (it.t === "dis") h += '<div class="rg"><button type="button" data-m="dpul" aria-pressed="' + (it.v === "pul") + '">Con puleggia</button><button type="button" data-m="dcam" aria-pressed="' + (it.v !== "pul") + '">A camma</button></div>';
      if (it.t === "dis") h += '<div class="rg"><button type="button" data-m="em" aria-label="Meno rendimento">−</button><span>rendimento ' + fmt(it.e, 2) + '</span><button type="button" data-m="ep" aria-label="Più rendimento">+</button></div>';
      if (it.t === "pul") h += '<button type="button" data-m="tdop">Trasforma in carrucola doppia</button>';
      if (it.t === "pul2") h += '<button type="button" data-m="tpul">Trasforma in carrucola singola</button>';
      if (isP(it) || it.t === "blo") h += '<button type="button" data-m="tdis">Trasforma in discensore</button>';
      if (it.t === "dis" || it.t === "blo") h += '<button type="button" data-m="tpul">Trasforma in carrucola</button>';
      h += '<button type="button" data-m="elimina">Elimina</button><button type="button" data-m="chiudi">Chiudi</button>';
      const m = $("#pa-menu"); m.innerHTML = h; m.hidden = false;
      const cw = cv.clientWidth, ch = cv.clientHeight, u = cw / VW;
      m.style.left = Math.max(4, Math.min(cw - m.offsetWidth - 4, it.x * u + 16)) + "px";
      m.style.top = Math.max(4, Math.min(ch - m.offsetHeight - 4, it.y * u - 24)) + "px";
    }
    function avviaFissa(it) {
      fissa = it.id; chiudiMenu();
      $("#pa-hint").innerHTML = "Tocca l’ancoraggio, il carico o la carrucola a cui è fissata <b>" + nome(it) + "</b>.";
      tutto();
    }
    function tutto() { pannelloSel(); elencoCorde(); calcola(); aggBan(); }

    // ---------- interazione ----------
    const cv = $("#pa-cv");
    const pos = e => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * VW / r.width, (e.clientY - r.top) * VW / r.width]; };
    const trova = (x, y) => {
      const r = cv.getBoundingClientRect(), k = VW / r.width, rad = HIT * k;
      let best = null, bd = 1e9;
      const u = r.width / VW;
      items.forEach(it => {
        let d = Math.hypot(it.x - x, it.y - y);
        if (it.t === "op") { const ay = (it.y - y) * u; d = Math.hypot(Math.max(0, Math.abs(it.x - x) * u - 16), Math.max(0, ay > 46 ? ay - 46 : ay < -44 ? -44 - ay : 0)) / u; }   // il pompiere si afferra da tutta la figura
        if (it.t === "pul2") d = Math.hypot(Math.max(0, Math.abs(it.x - x) * u - 24), (it.y - y) * u + 6) / u;   // la doppia e' larga: si afferra da tutta la sagoma
        if (it.t === "car") d = Math.hypot(Math.max(0, Math.abs(it.x - x) * u - 24), Math.max(0, Math.abs(it.y - y) * u - 12)) / u;   // il peso e' un rettangolo: si afferra da tutta la sagoma
        if (d < rad && d < bd) { bd = d; best = it; }
      });
      return best;
    };
    let drag = null;
    cv.addEventListener("pointerdown", e => {
      const [x, y] = pos(e), it = trova(x, y);
      if (menu || menuC !== null) { chiudiMenu(); }
      if (fissa) {
        const src = byId(fissa);
        const rc = !it && src && src.t === "blo" ? trovaCorda(x, y) : null;
        if (it && src && it.id !== fissa && (it.t === "anc" || it.t === "car" || isP(it) || it.t === "blo" || it.t === "dis")) {
          src.f = it.t === "car" ? "car" : it.id;
          $("#pa-hint").textContent = nome(src) + " fissata a " + nome(it) + ".";
        } else if (rc) {
          corde.forEach(c => { const q = c.indexOf(src.id); if (q > 0 && q < c.length - 1) c.splice(q, 1); });
          const c = corde[rc.i], k = Math.min(rc.k, c.length - 2), kk = c.indexOf(src.id);
          if (kk < 0 && c.length >= 2) {
            c.splice(Math.max(1, k + 1), 0, src.id);
            src.x = rc.x; src.y = rc.y;
            $("#pa-hint").textContent = nome(src) + " fissato sulla corda " + (rc.i + 1) + ": la corda ci passa dritta.";
          }
        } else $("#pa-hint").innerHTML = HINT;
        fissa = null; tutto(); return;
      }
      if (tracc) {
        if (it) {
          const nid = it.t === "pul2" ? it.id + (x < it.x ? ":A" : ":B") : it.id;   // sulla doppia si sceglie la puleggia A o B
          if (ins !== null) { tracc.splice(ins + 1, 0, nid); ins++; }
          else if (tracc[tracc.length - 1] !== nid) tracc.push(nid);
          tutto();
        }
        return;
      }
      if (!it) {
        const rc = trovaCorda(x, y);
        if (rc) { apriMenuCorda(rc); return; }
        if (sel) { sel = null; tutto(); }
        return;
      }
      drag = {it, dx: it.x - x, dy: it.y - y, mosso: false};
      cv.setPointerCapture(e.pointerId);
      if (sel !== it.id) { sel = it.id; pannelloSel(); calcola(); }
      clearTimeout(pressT);
      pressT = setTimeout(() => { if (drag && !drag.mosso) { const t = drag.it; drag = null; apriMenu(t); } }, 450);
    });
    cv.addEventListener("pointermove", e => {
      if (!drag) return;
      const [x, y] = pos(e);
      if (!drag.mosso && Math.hypot(x + drag.dx - drag.it.x, y + drag.dy - drag.it.y) < 1.2) return;
      drag.mosso = true; clearTimeout(pressT);
      drag.it.x = Math.max(3, Math.min(VW - 3, x + drag.dx)); drag.it.y = Math.max(3, Math.min(VH - 3, y + drag.dy));
      calcola();
    });
    cv.addEventListener("contextmenu", e => e.preventDefault());
    const fine = () => {
      clearTimeout(pressT);
      const d = drag; drag = null;
      if (d && d.mosso && (isP(d.it) || d.it.t === "blo" || d.it.t === "dis") && !d.it.f) {
        let best = null, bd = 8;
        items.forEach(o => { if (o === d.it || !(o.t === "anc" || o.t === "car")) return; const k = Math.hypot(o.x - d.it.x, o.y - d.it.y); if (k < bd) { bd = k; best = o; } });
        if (best) { d.it.f = best.t === "car" ? "car" : best.id; $("#pa-hint").textContent = nome(d.it) + " fissata a " + nome(best) + "."; tutto(); }
      }
    };
    cv.addEventListener("pointerup", fine); cv.addEventListener("pointercancel", fine);

    $("#pa-add").addEventListener("click", e => {
      const b = e.target.closest("button[data-t]"); if (!b) return;
      const t = b.dataset.t, n = items.filter(i => i.t === t).length;
      const it = add(t, 50 + (n % 4) * 8 - 12, t === "anc" ? 8 : 40 + (n % 5) * 8, t === "dis" ? {v: "cam", e: 0.6} : {});
      sel = it.id; tutto();
    });
    $("#pa-reset").addEventListener("click", () => {
      chiudiMenu(); avvio();
      $("#pa-cd").textContent = "Disegna corda"; $("#pa-hint").innerHTML = "Sistema riportato alla partenza. " + HINT;
      tutto();
    });
    $("#pa-calc").addEventListener("click", () => { calcola(); $("#pa-mini").scrollIntoView({block: "nearest"}); });
    function chiudiCorda(salva) {
      if (tracc) {
        const i = corde.indexOf(tracc);
        if (i >= 0 && ((!salva && nuova) || tracc.length < 2)) corde.splice(i, 1);
      }
      tracc = null; nuova = false; ins = null; nsel = null;
      $("#pa-cd").textContent = "Disegna corda"; $("#pa-hint").innerHTML = HINT; tutto();
    }
    $("#pa-cd").addEventListener("click", () => {
      if (!tracc) {
        corde.push([]); tracc = corde[corde.length - 1]; nuova = true; ins = null; nsel = null; sel = null; fissa = null; chiudiMenu(); $("#pa-cd").textContent = "Fine corda";
        $("#pa-hint").textContent = "Tocca in ordine: capo morto, carrucole e bloccanti attraversati, e per ultimo il capo di tiro (Operatori, oppure il punto a cui è legata). Sulla carrucola doppia tocca la puleggia A (sinistra) o B (destra). Puoi modificarla dopo.";
        tutto();
      } else chiudiCorda(true);
    });
    $("#pa-ban").addEventListener("click", e => {
      const b = e.target.closest("button[data-b]"); if (!b) return;
      if (b.dataset.b === "annf") { fissa = null; $("#pa-hint").innerHTML = HINT; tutto(); }
      else if (b.dataset.b === "undo") {
        if (tracc) { if (ins !== null && ins >= 0) { tracc.splice(ins, 1); ins--; } else tracc.pop(); }
        tutto();
      } else chiudiCorda(b.dataset.b === "finec");
    });
    $("#pa-menu").addEventListener("click", e => {
      const b = e.target.closest("button[data-m]"); if (!b) return;
      if (menuC !== null) {
        const i = menuC, m = b.dataset.m; chiudiMenu();
        if (m === "rmod" && corde[i]) { if (tracc) chiudiCorda(true); entraModifica(i, null); }
        else if (m === "rinv" && corde[i]) { if (tracc) chiudiCorda(true); corde[i].reverse(); tutto(); }
        else if (m === "rdel" && corde[i]) { if (tracc) chiudiCorda(true); corde.splice(i, 1); nsel = null; tutto(); }
        return;
      }
      const it = menu && byId(menu); if (!it) return;
      const m = b.dataset.m;
      if (m === "fissa") { sel = it.id; avviaFissa(it); return; }
      if (m === "libera") it.f = "";
      else if (m === "dpul" || m === "dcam") { const nv = m === "dpul" ? "pul" : "cam"; if (it.v !== nv) { if (Math.abs(it.e - (it.v === "pul" ? 0.85 : 0.6)) < 1e-6) it.e = nv === "pul" ? 0.85 : 0.6; it.v = nv; } }
      else if (m === "tdis") { it.t = "dis"; it.nome = "D" + (++cnt.dis); it.v = it.v || "cam"; it.e = it.e || 0.6; }
      else if (m === "tpul") { if (it.t !== "pul2") it.nome = "C" + (++cnt.pul); it.t = "pul"; }
      else if (m === "tdop") { it.t = "pul2"; }
      else if (m === "em" || m === "ep") { it.e = Math.round(Math.min(1, Math.max(0.1, it.e + (m === "ep" ? 0.05 : -0.05))) * 100) / 100; apriMenu(it); tutto(); return; }
      else if (m === "elimina") {
        const id = it.id;
        items = items.filter(i => i.id !== id);
        items.forEach(i => { if (i.f === id) i.f = ""; });
        corde = corde.map(c => c.filter(x => base(x) !== id)).filter(c => c.length >= 2);
        if (sel === id) sel = null;
      }
      chiudiMenu(); tutto();
    });
    $("#pa-sel").addEventListener("change", e => {
      const it = byId(sel); if (!it) return;
      if (e.target.id === "pa-se") it.e = Math.min(1, Math.max(0.1, parseFloat(String(e.target.value).replace(",", ".")) || 0.6));
      tutto();
    });
    $("#pa-sel").addEventListener("click", e => {
      const itc = byId(sel);
      const dtb = e.target.closest("button[data-dt]");
      if (itc && dtb) { const nv = dtb.dataset.dt; if (itc.v !== nv) { if (Math.abs(itc.e - (itc.v === "pul" ? 0.85 : 0.6)) < 1e-6) itc.e = nv === "pul" ? 0.85 : 0.6; itc.v = nv; } tutto(); return; }
      if (itc && e.target.closest("#pa-sc")) { if (fissa === itc.id) { fissa = null; $("#pa-hint").innerHTML = HINT; tutto(); } else avviaFissa(itc); return; }
      if (itc && e.target.closest("#pa-sl")) { itc.f = ""; tutto(); return; }
      if (!e.target.closest("#pa-sx")) return;
      const id = sel;
      items = items.filter(i => i.id !== id);
      items.forEach(i => { if (i.f === id) i.f = ""; });
      corde = corde.map(c => c.filter(x => base(x) !== id)).filter(c => c.length >= 2);
      sel = null; tutto();
    });
    function entraModifica(i, inserisciDopo) {
      tracc = corde[i]; nuova = false; ins = inserisciDopo; sel = null; fissa = null; chiudiMenu();
      $("#pa-cd").textContent = "Fine corda";
      $("#pa-hint").textContent = ins === null ? "Modifica corda " + (i + 1) + ": tocca i punti da aggiungere in fondo." : "Tocca i punti da inserire nella corda " + (i + 1) + ", uno dopo l’altro.";
      tutto();
    }
    $("#pa-corde").addEventListener("click", e => {
      const n = e.target.closest("button[data-n]"), a = e.target.closest("button[data-a]"), kk = e.target.closest("button[data-k]");
      if (kk) { const i = Number(kk.dataset.i), k = Number(kk.dataset.k); nsel = nsel && nsel.i === i && nsel.k === k ? null : {i, k}; elencoCorde(); return; }
      if (n && nsel) {
        const i = Number(n.dataset.i), c = corde[i]; if (!c) return;
        if (n.dataset.n === "su" && nsel.k > 0) { [c[nsel.k - 1], c[nsel.k]] = [c[nsel.k], c[nsel.k - 1]]; nsel.k--; }
        else if (n.dataset.n === "giu" && nsel.k < c.length - 1) { [c[nsel.k + 1], c[nsel.k]] = [c[nsel.k], c[nsel.k + 1]]; nsel.k++; }
        else if (n.dataset.n === "del") { c.splice(nsel.k, 1); nsel = null; if (ins !== null && tracc === c) ins = null; }
        else if (n.dataset.n === "ins") { const k = nsel.k; nsel = null; entraModifica(i, k); return; }
        tutto(); return;
      }
      if (!a) return;
      const i = Number(a.dataset.i);
      if (a.dataset.a === "mod") { if (tracc === corde[i]) chiudiCorda(true); else { if (tracc) chiudiCorda(true); entraModifica(i, null); } return; }
      if (tracc) chiudiCorda(true);
      nsel = null;
      if (a.dataset.a === "del") corde.splice(i, 1); else corde[i].reverse();
      tutto();
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
    avvio();
    tutto();
  }
});
