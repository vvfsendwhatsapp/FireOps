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
`,

  html: `
<div class="blocco">
  <h2 class="tit">Schema</h2>
  <div class="schemi" id="pa-sch"></div>
  <p class="nota">Il blocco in alto è fisso, quello in basso è mobile (sul carico). Il quadratino è il capo morto, la freccia è il capo di tiro.</p>
</div><div class="blocco">
  <h2 class="tit">Sistema: catena di blocchi</h2>
  <div class="chips" id="pa-pre" aria-label="Sistemi pronti"></div>
  <p class="nota" style="margin-top:10px">Dal carico verso gli operatori, in serie: il capo di tiro di un blocco va al blocco successivo. Aggiungi, sposta ▲▼ o togli ✕ i blocchi.</p>
  <div id="pa-cat"></div>
  <div class="chips" id="pa-add" style="margin-top:10px">
    <button type="button" data-t="p" data-n="2">+ Paranco 1:2</button><button type="button" data-t="p" data-n="3">+ Paranco 1:3</button><button type="button" data-t="p" data-n="4">+ Paranco 1:4</button><button type="button" data-t="p" data-n="5">+ Paranco 1:5</button><button type="button" data-t="r">+ Rinvio 1:1</button><button type="button" data-t="b">+ Bloccante</button>
  </div>
  <p class="nota">Rinvio 1:1: una carrucola che cambia direzione (non dà vantaggio, costa un passaggio). Bloccante: ritenuta del carico (capture); se ha la puleggia conta come un passaggio, altrimenti non perde nulla. </p>
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
  <h2 class="tit">Tiro in ogni blocco</h2>
  <table class="tab" id="pa-anc"></table>
  <p class="nota">Tensione della corda che entra (lato carico) e che esce (lato operatori) da ciascun blocco. Valori indicativi, non sostituiscono la verifica del tuo istruttore SAF.</p>
</div>
`,

  init(root) {
    "use strict";
    const $ = s => root.querySelector(s);
    const G = 9.80665;
    const P = n => ({t: "p", n}), RIN = {t: "r"}, BLO = {t: "b", p: true};
    const PRESET = [
      ["1:1", [RIN]], ["1:2", [P(2)]], ["1:3", [P(3)]], ["1:4", [P(4)]], ["1:5", [P(5)]],
      ["1:4 comp.", [P(2), P(2)]], ["1:6 comp.", [P(3), P(2)]], ["1:9 comp.", [P(3), P(3)]],
      ["1:3 + bloccante", [BLO, P(3)]]
    ];
    const MAXEL = 8;
    let catena = [];
    const nuovo = (def, i) => Object.assign({}, def);
    const sig = c => c.map(e => e.t + (e.n || "")).join();
    const nomeEl = e => e.t === "p" ? "Paranco 1:" + e.n : e.t === "r" ? "Rinvio 1:1" : "Bloccante";
    const colEl = e => e.t === "p" ? "#ffd700" : e.t === "r" ? "#4A93C8" : "#c77dff";

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

    const RAD = Math.PI / 180;
    const nm = id => { const v = parseFloat($(id).value); return isFinite(v) ? v : 0; };
    function leggi() {
      catena.forEach((e, i) => { const c = $("#pa-k" + i + "p"); if (c) e.p = c.checked; });
    }
    function build() {
      $("#pa-cat").innerHTML = catena.map((e, i) =>
        '<div class="el"><div class="elh"><b style="color:' + colEl(e) + '">' + (i + 1) + " · " + nomeEl(e) + '</b><span class="ctl">' +
        '<button type="button" data-i="' + i + '" data-a="su" aria-label="Sposta verso il carico">▲</button>' +
        '<button type="button" data-i="' + i + '" data-a="giu" aria-label="Sposta verso gli operatori">▼</button>' +
        '<button type="button" data-i="' + i + '" data-a="del" aria-label="Togli">✕</button></span></div>' +
        (e.t === "b" ? '<label class="chk"><input type="checkbox" id="pa-k' + i + 'p"' + (e.p ? " checked" : "") + '> Con puleggia (conta come un passaggio)</label>' : "") +
        '</div>').join("") ||
        '<p class="nota">Nessun blocco: la corda va dal ciglio direttamente agli operatori.</p>';
    }

    function calcola() {
      leggi();
      const kg = Math.max(0, Number($("#pa-kg").value) || 0), h = Math.max(0, Number($("#pa-h").value) || 0);
      const eta = Math.min(1, Math.max(0.3, Number($("#pa-eta").value) || 0.95));
      const W = kg * G;                          // N
      const Tn = W / eta;                        // tiro nella corda che dal ciglio (rinvio al ciglio) va al primo blocco
      let L = Tn, vmTeo = 1;
      const out = [];
      catena.forEach(e => {
        let T;
        if (e.t === "p") { T = tiro(L, e.n, eta); vmTeo *= e.n; }
        else if (e.t === "r") T = L / eta;
        else T = e.p ? L / eta : L;
        out.push({carico: L, tiro: T});
        L = T;
      });
      const Tf = L;
      const vmReale = W > 0 ? W / Tf : vmTeo;
      const corda = h * vmTeo;
      const ideale = W / vmTeo;
      const kN = v => fmt(v / 1000, 2);
      const daN = v => fmt(v / 10, 0);

      $("#pa-ris").innerHTML =
        '<div class="vcell"><div class="k">Vantaggio teorico</div><div class="v">1:' + vmTeo + '</div></div>' +
        '<div class="vcell"><div class="k">Vantaggio reale</div><div class="v">1:' + fmt(vmReale, 2) + '</div></div>' +
        '<div class="vcell"><div class="k">Tiro da fare</div><div class="v">' + daN(Tf) + ' <small>daN</small></div><div class="k">' + kN(Tf) + ' kN, circa ' + fmt(Tf / G, 0) + ' kg</div></div>' +
        '<div class="vcell"><div class="k">Perdita per attriti</div><div class="v">' + fmt(ideale > 0 ? (Tf / ideale - 1) * 100 : 0, 0) + ' <small>%</small></div><div class="k">tiro senza attriti: ' + daN(ideale) + ' daN</div></div>' +
        '<div class="vcell g"><div class="k">Corda da recuperare per ' + fmt(h, 1) + ' m di sollevamento</div><div class="v">' + fmt(corda, 1) + ' <small>m</small></div></div>';

      let righe = '<tr><td>Carico sollevato</td><td>' + kN(W) + ' kN</td></tr>' +
        '<tr><td>Corda dal ciglio al 1° blocco</td><td>' + kN(Tn) + ' kN</td></tr>';
      catena.forEach((e, i) => {
        righe += '<tr><td>' + (i + 1) + ' · ' + nomeEl(e) + '<br><small style="color:var(--text-dim)">entra ' + kN(out[i].carico) + ' kN · esce ' + kN(out[i].tiro) + ' kN</small></td><td>' + daN(out[i].tiro) + ' daN</td></tr>';
      });
      $("#pa-anc").innerHTML = righe;
      const avv = [];
      if (eta < 0.8 && vmTeo >= 4) avv.push("Con questi rendimenti i sistemi con molti capi perdono molto: valuta carrucole su cuscinetti.");
      if (Tf / G > 60) avv.push("Il tiro supera 60 kg: serve più di una persona o un sistema con più vantaggio.");
      $("#pa-avv").innerHTML = avv.map(t => '<div class="avv">' + t + '</div>').join("");

      const pp = catena.filter(e => e.t === "p");
      $("#pa-sch").innerHTML = pp.length ? pp.map(e =>
        '<figure>' + schema(e.n) + '<figcaption>' + nomeEl(e) + '</figcaption></figure>').join("") : '<p class="nota">Nessun paranco nella catena.</p>';
      [...$("#pa-pre").children].forEach((b, i) => b.setAttribute("aria-pressed", String(sig(PRESET[i][1]) === sig(catena))));
    }

    // preset e catena
    $("#pa-pre").innerHTML = PRESET.map((p, i) => '<button type="button" data-i="' + i + '" aria-pressed="false">' + p[0] + "</button>").join("");
    $("#pa-pre").addEventListener("click", e => {
      const b = e.target.closest("button"); if (!b) return;
      catena = PRESET[Number(b.dataset.i)][1].map((d, i) => nuovo(d, i));
      build(); calcola();
    });
    $("#pa-add").addEventListener("click", e => {
      const b = e.target.closest("button"); if (!b) return;
      leggi();
      if (catena.length >= MAXEL) return;
      const def = b.dataset.t === "p" ? P(Number(b.dataset.n)) : b.dataset.t === "r" ? RIN : BLO;
      catena.push(nuovo(def, catena.length));
      build(); calcola();
    });
    $("#pa-cat").addEventListener("click", e => {
      const b = e.target.closest("button[data-a]"); if (!b) return;
      leggi();
      const i = Number(b.dataset.i);
      if (b.dataset.a === "del") catena.splice(i, 1);
      else {
        const j = b.dataset.a === "su" ? i - 1 : i + 1;
        if (j < 0 || j >= catena.length) return;
        [catena[i], catena[j]] = [catena[j], catena[i]];
      }
      build(); calcola();
    });
    catena = [nuovo(P(3), 0)];
    build();
    $("#pa-tipo").addEventListener("change", () => {
      const v = $("#pa-tipo").value;
      if (v !== "x") $("#pa-eta").value = v;
      calcola();
    });
    $("#pa-eta").addEventListener("input", () => { $("#pa-tipo").value = "x"; });
    root.addEventListener("input", calcola);
    root.addEventListener("change", calcola);
    calcola();
  }
});
