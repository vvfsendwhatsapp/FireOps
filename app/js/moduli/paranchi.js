/* FireOps VVF - modulo "paranchi" (funzione SAF)
 * Vantaggio meccanico dei sistemi di recupero: teorico e reale (con gli attriti delle pulegge),
 * tiro da fare, forze sugli ancoraggi e schema disegnato.
 *
 * Modello: ogni stadio ha n capi di corda che sostengono il blocco mobile. Il capo morto sta sul blocco
 * mobile se n e' dispari, sul blocco fisso se n e' pari; il capo di tiro esce sempre dal blocco fisso.
 * Ogni passaggio su carrucola moltiplica il tiro per 1/eta (eta = rendimento). Lungo la corda, dal capo morto
 * al capo di tiro, si incontrano n carrucole, quindi il carico e' W = T * (eta + eta^2 + ... + eta^n).
 * Negli stadi composti il tiro dello stadio al carico e' il carico dello stadio in testa.
 * Disposizione in pianta: il carico pende dal rinvio al ciglio E (origine); da E la corda va al paranco, ancorato in A
 * (con A2 se composto); il capo di tiro va agli operatori, eventualmente passando da un rinvio R.
 * Le forze sui punti sono somme vettoriali in 3D (posizione in pianta + quota), quindi dipendono dagli angoli tra le corde.
 */
FireOps.registra({
  id: "paranchi",

  css: `
.pg-paranchi { --acc: var(--ics-operazioni); max-width: 640px; margin: 0 auto; padding: 12px 16px calc(24px + env(safe-area-inset-bottom, 0px)); color: var(--text); font-family: var(--sans); }
.pg-paranchi * { box-sizing: border-box; }
.pg-paranchi .blocco { margin-bottom: 10px; background: var(--panel); border: 1px solid var(--line); border-radius: 8px; padding: 12px; }
.pg-paranchi .tit { margin: 0 0 8px; font-size: 15px; font-weight: 700; }
.pg-paranchi .nota { font-size: 12.5px; line-height: 1.45; color: var(--text-dim); margin: 8px 0 0; }
.pg-paranchi .chips { display: flex; flex-wrap: wrap; gap: 6px; }
.pg-paranchi .chips button { min-height: 44px; padding: 0 12px; border: 1px solid var(--line); border-radius: 8px; background: var(--panel-2); color: var(--text-dim); font: inherit; font-size: 14px; font-weight: 700; cursor: pointer; }
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
.pg-paranchi .riga4 { display: grid; grid-template-columns: 62px 1fr 1fr 1.9fr; gap: 8px; margin-top: 8px; align-items: center; font-size: 13px; }
.pg-paranchi .riga4.tt { font-size: 11.5px; color: var(--text-dim); margin-top: 0; }
.pg-paranchi .riga4[hidden] { display: none; }
.pg-paranchi canvas.pi { display: block; width: 100%; height: 280px; background: var(--bg); border: 1px solid var(--line); border-radius: 8px; touch-action: none; }
.pg-paranchi .st { display: flex; gap: 4px; align-items: center; }
.pg-paranchi .st input { min-width: 0; width: auto; flex: 1 1 0; padding: 0 6px; }
.pg-paranchi .st button { flex: none; width: 31px; padding: 0; min-height: 44px; border: 1px solid var(--line); border-radius: 6px; background: var(--panel-2); color: var(--text); font: inherit; font-size: 18px; font-weight: 800; cursor: pointer; }
.pg-paranchi .tab { width: 100%; border-collapse: collapse; font-size: 13.5px; }
.pg-paranchi .tab td { padding: 6px 4px; border-top: 1px solid var(--line); }
.pg-paranchi .tab td:last-child { text-align: right; font-weight: 700; font-variant-numeric: tabular-nums; }
`,

  html: `
<div class="blocco">
  <h2 class="tit">Pianta del sistema di recupero</h2>
  <canvas id="pa-pi" class="pi" role="img" aria-label="Pianta del sistema di recupero: trascina gli ancoraggi"></canvas>
  <p class="nota">Il carico pende dal ciglio (quadrato). Le frecce arancioni sono le risultanti sui punti (in pianta, con i kN). Trascina gli ancoraggi sulla pianta, poi alzali o abbassali con + e −: l’altezza è rispetto al ciglio. Direzione: 0° verso il vuoto, 90° a sinistra guardando il vuoto, 180° dietro il ciglio.</p>
  <div class="riga4 tt"><span></span><span>Distanza dal ciglio (m)</span><span>Direzione (°)</span><span>Altezza sul ciglio (m)</span></div>
  <div class="riga4"><b style="color:#ffd700">Ancoraggio</b>
    <input type="number" id="pa-ad" inputmode="decimal" min="0.3" step="0.1" value="6" aria-label="Distanza ancoraggio">
    <input type="number" id="pa-aa" inputmode="decimal" step="1" value="180" aria-label="Direzione ancoraggio">
    <input type="number" id="pa-az" inputmode="decimal" step="0.1" value="0" aria-label="Quota ancoraggio"></div>
  <div class="riga4" id="pa-rb" hidden><b style="color:#ffd700">Ancor. 2</b>
    <input type="number" id="pa-bd" inputmode="decimal" min="0.3" step="0.1" value="10" aria-label="Distanza secondo ancoraggio">
    <input type="number" id="pa-ba" inputmode="decimal" step="1" value="160" aria-label="Direzione secondo ancoraggio">
    <input type="number" id="pa-bz" inputmode="decimal" step="0.1" value="0" aria-label="Quota secondo ancoraggio"></div>
  <div class="riga4" id="pa-rr" hidden><b style="color:#4A93C8">Rinvio</b>
    <input type="number" id="pa-rd" inputmode="decimal" min="0.3" step="0.1" value="8" aria-label="Distanza rinvio">
    <input type="number" id="pa-ra" inputmode="decimal" step="1" value="200" aria-label="Direzione rinvio">
    <input type="number" id="pa-rz" inputmode="decimal" step="0.1" value="0" aria-label="Quota rinvio"></div>
  <div class="riga4"><b style="color:#2f9e5b">Operatori</b>
    <input type="number" id="pa-od" inputmode="decimal" step="1" value="180" aria-label="Direzione di tiro">
    <input type="number" id="pa-os" inputmode="decimal" min="-90" max="90" step="1" value="0" aria-label="Pendenza di tiro">
    <span style="font-size:11.5px;color:var(--text-dim)">direzione e pendenza (°) del tiro</span></div>
</div>

<div class="blocco">
  <h2 class="tit">Schema</h2>
  <div class="schemi" id="pa-sch"></div>
  <p class="nota">Il blocco in alto è fisso, quello in basso è mobile (sul carico). Il quadratino è il capo morto, la freccia è il capo di tiro.</p>
</div><div class="blocco">
  <h2 class="tit">Sistema</h2>
  <div class="chips" id="pa-pre"></div>
  <div class="riga">
    <div><label for="pa-n1">Stadio al carico (capi)</label><select id="pa-n1"></select></div>
    <div><label for="pa-n2">Stadio in testa (composto)</label><select id="pa-n2"></select></div>
  </div>
  <label class="chk"><input type="checkbox" id="pa-rinvio"> Rinvio sul capo di tiro (carrucola in più prima degli operatori)</label>
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
  <div class="riga uno">
    <div><label for="pa-r">Resistenza minima del punto di ancoraggio (kN)</label><input type="number" id="pa-r" inputmode="decimal" min="1" step="1" value="22"></div>
  </div>
  <p class="nota">I rendimenti sono valori indicativi: dipendono da carrucola, corda e diametro. Cambiali se conosci i tuoi.</p>
</div>

<div class="blocco">
  <h2 class="tit">Risultato</h2>
  <div class="grid" id="pa-ris"></div>
  <div id="pa-avv"></div>
</div>

<div class="blocco">
  <h2 class="tit">Forze sui punti</h2>
  <table class="tab" id="pa-anc"></table>
  <p class="nota">Somma vettoriale delle corde che arrivano al punto: l’angolo tra le corde conta, più è stretto più il punto è caricato. Il coefficiente è rispetto alla resistenza che hai indicato. I valori non sostituiscono la verifica del tuo istruttore SAF.</p>
</div>


`,

  init(root) {
    "use strict";
    const $ = s => root.querySelector(s);
    const G = 9.80665;
    const PRESET = [
      ["1:1", [1]], ["2:1", [2]], ["3:1", [3]], ["4:1", [4]], ["5:1", [5]],
      ["4:1 comp.", [2, 2]], ["6:1 comp.", [3, 2]], ["9:1 comp.", [3, 3]]
    ];

    // Tiro T necessario per un carico L con n capi e rendimento eta (la formula e' nel commento in testa)
    function tiro(L, n, eta) {
      if (eta >= 0.9999) return L / n;
      return L * (1 - eta) / (eta * (1 - Math.pow(eta, n)));
    }

    function schema(n) {
      const sp = Math.max(18, Math.min(30, 140 / n)), x0 = 24, W = x0 * 2 + sp * (n + 1);
      const yT = 40, yB = 150, r = Math.min(8, sp / 2 - 2);
      const xs = i => x0 + i * sp;
      let s = '<svg viewBox="0 0 ' + W + ' 235" role="img" aria-label="Schema del paranco a ' + n + ' capi">';
      s += '<rect x="' + (xs(0) - 12) + '" y="' + (yT - 22) + '" width="' + (sp * (n + 1) + 24) + '" height="10" rx="3" fill="#8b96a3"/>';
      s += '<rect x="' + (xs(0) - 12) + '" y="' + (yB + 14) + '" width="' + (sp * n + 24) + '" height="10" rx="3" fill="#ffd700"/>';
      s += '<path d="M' + (xs(0) + sp * (n - 1) / 2) + ' ' + (yB + 24) + 'v18" stroke="#eceff3" stroke-width="2"/><text x="' + (xs(0) + sp * (n - 1) / 2) + '" y="' + (yB + 54) + '" font-size="12" fill="#eceff3" text-anchor="middle" font-weight="700">carico</text>';
      s += '<g fill="none" stroke="#e8734a" stroke-width="2.2" stroke-linecap="round">';
      const giu = k => (n % 2 === 0) === (k % 2 === 0);   // il capo k scende?
      for (let k = 0; k < n; k++) {
        s += '<path d="M' + xs(k) + ' ' + yT + 'V' + yB + '"/>';
        if (k < n - 1) {
          const sopra = !giu(k), y = sopra ? yT : yB;
          s += '<path d="M' + xs(k) + ' ' + y + 'A' + sp / 2 + ' ' + sp / 2 + ' 0 0 ' + (sopra ? 1 : 0) + ' ' + xs(k + 1) + ' ' + y + '"/>';
        }
      }
      // uscita: ultimo capo sale, passa su una carrucola in alto e scende verso chi tira
      const xu = xs(n - 1);
      s += '<path d="M' + xu + ' ' + yT + 'A' + sp / 2 + ' ' + sp / 2 + ' 0 0 1 ' + (xu + sp) + ' ' + yT + 'V' + (yB + 40) + '"/>';
      s += '</g>';
      // carrucole
      s += '<g fill="#10141a" stroke="#eceff3" stroke-width="1.6">';
      for (let k = 0; k < n - 1; k++) {
        const sopra = !giu(k);
        s += '<circle cx="' + (xs(k) + sp / 2) + '" cy="' + (sopra ? yT : yB) + '" r="' + r + '"/>';
      }
      s += '<circle cx="' + (xu + sp / 2) + '" cy="' + yT + '" r="' + r + '"/></g>';
      // capo morto
      const mortoSopra = n % 2 === 0;
      s += '<rect x="' + (xs(0) - 4) + '" y="' + ((mortoSopra ? yT : yB) - 4) + '" width="8" height="8" fill="#eceff3"/>';
      // freccia di tiro
      const xh = xu + sp;
      s += '<path d="M' + xh + ' ' + (yB + 44) + 'l-6 -10h12z" fill="#2f9e5b"/><text x="' + xh + '" y="' + (yB + 58) + '" font-size="12" fill="#2f9e5b" text-anchor="middle" font-weight="700">tiro</text>';
      s += '</svg>';
      return s;
    }

    const fmt = (v, d) => Number(v).toLocaleString("it-IT", {minimumFractionDigits: d, maximumFractionDigits: d});

    function stati() {
      const n1 = Number($("#pa-n1").value), n2 = Number($("#pa-n2").value);
      return n2 ? [n1, n2] : [n1];
    }

    const RAD = Math.PI / 180;
    let pianta = null;
    const nm = id => { const v = parseFloat($(id).value); return isFinite(v) ? v : 0; };
    const pol = (k, dmin) => { const d = Math.max(dmin, nm("#pa-" + k + "d")), an = nm("#pa-" + k + "a") * RAD; return [d * Math.cos(an), d * Math.sin(an), nm("#pa-" + k + "z")]; };
    const dir = (a, b) => { const v = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
    const per = (v, k) => [v[0] * k, v[1] * k, v[2] * k];
    const somma = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
    const modulo = v => Math.hypot(v[0], v[1], v[2]);
    const angolo = (u, v) => Math.acos(Math.max(-1, Math.min(1, u[0] * v[0] + u[1] * v[1] + u[2] * v[2]))) / RAD;

    function calcola() {
      const stadi = stati();
      const kg = Math.max(0, Number($("#pa-kg").value) || 0), h = Math.max(0, Number($("#pa-h").value) || 0);
      const eta = Math.min(1, Math.max(0.3, Number($("#pa-eta").value) || 0.95));
      const R = Math.max(0, Number($("#pa-r").value) || 0);
      const rinvio = $("#pa-rinvio").checked;
      $("#pa-rb").hidden = stadi.length < 2;
      $("#pa-rr").hidden = !rinvio;
      const W = kg * G;                          // N
      const Tn = W / eta;                        // tiro nella corda che dal ciglio va al paranco (rinvio al ciglio)
      let L = Tn, vmTeo = 1;
      const out = [];
      stadi.forEach(n => {
        const T = tiro(L, n, eta);
        out.push({n, carico: L, tiro: T});
        L = T; vmTeo *= n;
      });
      const Tlast = L;
      const Tf = rinvio ? Tlast / eta : Tlast;
      const vmReale = W > 0 ? W / Tf : vmTeo;
      const corda = h * vmTeo;
      const ideale = W / vmTeo;
      const kN = v => fmt(v / 1000, 2);
      const daN = v => fmt(v / 10, 0);

      $("#pa-ris").innerHTML =
        '<div class="vcell"><div class="k">Vantaggio teorico</div><div class="v">' + vmTeo + ':1</div></div>' +
        '<div class="vcell"><div class="k">Vantaggio reale</div><div class="v">' + fmt(vmReale, 2) + ':1</div></div>' +
        '<div class="vcell"><div class="k">Tiro da fare</div><div class="v">' + daN(Tf) + ' <small>daN</small></div><div class="k">' + kN(Tf) + ' kN, circa ' + fmt(Tf / G, 0) + ' kg</div></div>' +
        '<div class="vcell"><div class="k">Perdita per attriti</div><div class="v">' + fmt(ideale > 0 ? (Tf / ideale - 1) * 100 : 0, 0) + ' <small>%</small></div><div class="k">tiro senza attriti: ' + daN(ideale) + ' daN</div></div>' +
        '<div class="vcell g"><div class="k">Corda da recuperare per ' + fmt(h, 1) + ' m di sollevamento</div><div class="v">' + fmt(corda, 1) + ' <small>m</small></div></div>';

      // ---- geometria in pianta e forze sui punti ----
      const E = [0, 0, 0], A = pol("a", 0.3), A2 = pol("b", 0.3), Rv = pol("r", 0.3);
      const od = nm("#pa-od") * RAD, os = Math.max(-90, Math.min(90, nm("#pa-os"))) * RAD;
      const uop = [Math.cos(os) * Math.cos(od), Math.cos(os) * Math.sin(od), Math.sin(os)];
      const ancore = [A, A2].slice(0, stadi.length);
      const nodi = [];     // {nome, pos, F, ang}
      const giu = [0, 0, -1];
      nodi.push({nome: "Ciglio (rinvio, carico appeso)", id: "e", pos: E, F: somma(per(giu, W), per(dir(E, A), Tn)), ang: angolo(giu, dir(E, A))});
      ancore.forEach((q, i) => {
        const prec = i === 0 ? E : ancore[i - 1];
        const succ = i < ancore.length - 1 ? ancore[i + 1] : (rinvio ? Rv : null);
        const dsu = dir(q, prec), dha = succ ? dir(q, succ) : uop;
        nodi.push({nome: stadi.length > 1 ? "Ancoraggio stadio " + (i + 1) : "Ancoraggio del paranco", id: i ? "b" : "a", pos: q,
          F: somma(per(dsu, out[i].carico), per(dha, out[i].tiro)), ang: angolo(dsu, dha)});
      });
      if (rinvio) {
        const arr = dir(Rv, ancore[ancore.length - 1]);
        nodi.push({nome: "Carrucola di rinvio", id: "r", pos: Rv, F: somma(per(arr, Tlast), per(uop, Tf)), ang: angolo(arr, uop)});
      }
      let righe = "";
      nodi.forEach(n => {
        n.mod = modulo(n.F);
        const sf = R > 0 && n.id !== "e" ? fmt(R * 1000 / n.mod, 1) : "";
        righe += '<tr><td>' + n.nome + '<br><small style="color:var(--text-dim)">angolo tra le corde ' + fmt(n.ang, 0) + '°' + (sf ? " · coeff. " + sf : "") + '</small></td><td>' + kN(n.mod) + ' kN</td></tr>';
      });
      righe += '<tr><td>Carico sollevato</td><td>' + kN(W) + ' kN</td></tr>';
      $("#pa-anc").innerHTML = righe;

      const avv = [];
      if (eta < 0.8 && vmTeo >= 4) avv.push("Con questi rendimenti i sistemi con molti capi perdono molto: valuta carrucole su cuscinetti.");
      if (Tf / G > 60) avv.push("Il tiro supera 60 kg: serve più di una persona o un sistema con più vantaggio.");
      nodi.forEach(n => { if (n.id !== "e" && n.ang < 30) avv.push(n.nome + ": le due corde formano solo " + fmt(n.ang, 0) + "°, il punto è caricato quasi come la somma dei due tiri."); });
      nodi.forEach(n => { if (n.id !== "e" && R > 0 && n.mod / 1000 > R / 3) avv.push(n.nome + ": il carico supera un terzo della resistenza indicata (" + fmt(R, 0) + " kN)."); });
      $("#pa-avv").innerHTML = avv.map(t => '<div class="avv">' + t + '</div>').join("");

      if (pianta) {
        const lung = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
        const pr = (n, col, nome) => ({id: n.id, x: n.pos[0], y: n.pos[1], col, nome, sotto: kN(n.mod) + " kN · " + (n.pos[2] >= 0 ? "+" : "") + fmt(n.pos[2], 1) + " m"});
        const pts = [{id: "e", x: 0, y: 0, fisso: true, col: "#e8734a", nome: "Ciglio", sotto: "carico " + kN(W) + " kN", ly: 30}];
        const lin = [];
        ancore.forEach((q, i) => pts.push(pr(nodi[i + 1], "#ffd700", stadi.length > 1 ? "Ancor. " + (i + 1) : "Ancoraggio")));
        if (rinvio) pts.push(pr(nodi[nodi.length - 1], "#4A93C8", "Rinvio"));
        const seq = [E].concat(ancore, rinvio ? [Rv] : []);
        const ids = ["e"].concat(ancore.map((_, i) => i ? "b" : "a"), rinvio ? ["r"] : []);
        for (let i = 0; i < seq.length - 1; i++) lin.push({a: ids[i], b: ids[i + 1], col: i === seq.length - 2 && rinvio ? "#4A93C8" : "#e8734a", lw: 2.5, testo: fmt(lung(seq[i], seq[i + 1]), 1) + " m"});
        const ult = seq[seq.length - 1], lp = Math.max(0.8, 2.5 * Math.cos(os));
        pts.push({id: "o", x: ult[0] + lp * Math.cos(od), y: ult[1] + lp * Math.sin(od), fisso: true, col: "#2f9e5b", nome: "Tiro", sotto: kN(Tf) + " kN"});
        lin.push({a: ids[ids.length - 1], b: "o", col: "#2f9e5b", lw: 3, freccia: true});
        // risultante su ciglio, ancoraggi e rinvio: proiezione in pianta della somma delle corde
        const fmax = Math.max(1, ...nodi.map(n => n.mod));
        nodi.forEach((n, i) => {
          const fh = Math.hypot(n.F[0], n.F[1]);
          if (fh < 1) return;
          const l = Math.max(0.4, 2.2 * fh / fmax);
          pts.push({id: "fa" + i, x: n.pos[0] + l * n.F[0] / fh, y: n.pos[1] + l * n.F[1] / fh, fisso: true, col: "#ff9f1c", nome: "", sotto: "", nascosto: true});
          lin.push({a: [n.pos[0], n.pos[1]], b: "fa" + i, col: "#ff9f1c", lw: 3.5, freccia: true, testo: kN(n.mod) + " kN"});
        });
        pianta.set(pts, lin);
      }

      $("#pa-sch").innerHTML = stadi.map((n, i) =>
        '<figure>' + schema(n) + '<figcaption>' + (stadi.length > 1 ? "Stadio " + (i + 1) + (i === 0 ? " al carico" : " in testa") + ": " : "") + n + ':1</figcaption></figure>').join("");

      [...$("#pa-pre").children].forEach((b, i) => b.setAttribute("aria-pressed", String(JSON.stringify(PRESET[i][1]) === JSON.stringify(stadi))));
    }

    // preset
    $("#pa-pre").innerHTML = PRESET.map((p, i) => '<button type="button" data-i="' + i + '" aria-pressed="false">' + p[0] + "</button>").join("");
    $("#pa-pre").addEventListener("click", e => {
      const b = e.target.closest("button"); if (!b) return;
      const st = PRESET[Number(b.dataset.i)][1];
      $("#pa-n1").value = st[0]; $("#pa-n2").value = st[1] || 0;
      calcola();
    });
    $("#pa-n1").innerHTML = [1, 2, 3, 4, 5, 6, 7].map(n => '<option value="' + n + '">' + n + (n === 1 ? " capo" : " capi") + "</option>").join("");
    $("#pa-n2").innerHTML = '<option value="0">Nessuno</option>' + [2, 3, 4, 5].map(n => '<option value="' + n + '">' + n + " capi</option>").join("");
    $("#pa-n1").value = 3;
    $("#pa-tipo").addEventListener("change", () => {
      const v = $("#pa-tipo").value;
      if (v !== "x") $("#pa-eta").value = v;
      calcola();
    });
    $("#pa-eta").addEventListener("input", () => { $("#pa-tipo").value = "x"; });
    root.querySelectorAll('input[id$="z"]').forEach(inp => {
      const w = document.createElement("div"); w.className = "st";
      inp.parentNode.insertBefore(w, inp);
      const bm = document.createElement("button"), bp = document.createElement("button");
      bm.type = bp.type = "button"; bm.textContent = "−"; bp.textContent = "+"; bm.setAttribute("aria-label", "Abbassa"); bp.setAttribute("aria-label", "Solleva");
      const passo = d => () => { inp.value = String(Math.round((nm("#" + inp.id) + d) * 10) / 10); calcola(); };
      bm.addEventListener("click", passo(-0.5)); bp.addEventListener("click", passo(0.5));
      w.append(bm, inp, bp);
    });
    const sincro = (id, x, y) => {
      const an = Math.atan2(y, x) / RAD;
      $("#pa-" + id + "d").value = fmt(Math.hypot(x, y), 1).replace(",", ".");
      $("#pa-" + id + "a").value = String(Math.round(an < 0 ? an + 360 : an));
      calcola();
    };
    const avviaPianta = () => { pianta = SafPianta.crea($("#pa-pi"), {onMove: sincro}); calcola(); };
    root.addEventListener("input", calcola);
    root.addEventListener("change", calcola);
    window.addEventListener("resize", () => { if (pianta) pianta.disegna(); });
    calcola();
    if (window.SafPianta) avviaPianta();
    else { const sc = document.createElement("script"); sc.src = "js/saf-pianta.js?v=" + (window.FIREOPS_VERSIONE || ""); sc.onload = avviaPianta; document.head.appendChild(sc); }
  }
});
