/* FireOps VVF - modulo "paranchi" (funzione SAF)
 * Vantaggio meccanico dei sistemi di recupero: teorico e reale (con gli attriti delle pulegge),
 * tiro da fare, forze sugli ancoraggi e schema disegnato.
 *
 * Modello: ogni stadio ha n capi di corda che sostengono il blocco mobile. Il capo morto sta sul blocco
 * mobile se n e' dispari, sul blocco fisso se n e' pari; il capo di tiro esce sempre dal blocco fisso.
 * Ogni passaggio su carrucola moltiplica il tiro per 1/eta (eta = rendimento). Lungo la corda, dal capo morto
 * al capo di tiro, si incontrano n carrucole, quindi il carico e' W = T * (eta + eta^2 + ... + eta^n).
 * Negli stadi composti il tiro dello stadio al carico e' il carico dello stadio in testa.
 * Forza sul punto di ancoraggio di uno stadio ~ carico dello stadio + tiro (caso peggiore: capo di tiro parallelo).
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
.pg-paranchi .tab { width: 100%; border-collapse: collapse; font-size: 13.5px; }
.pg-paranchi .tab td { padding: 6px 4px; border-top: 1px solid var(--line); }
.pg-paranchi .tab td:last-child { text-align: right; font-weight: 700; font-variant-numeric: tabular-nums; }
`,

  html: `
<div class="blocco">
  <h2 class="tit">Sistema</h2>
  <div class="chips" id="pa-pre"></div>
  <div class="riga">
    <div><label for="pa-n1">Stadio al carico (capi)</label><select id="pa-n1"></select></div>
    <div><label for="pa-n2">Stadio in testa (composto)</label><select id="pa-n2"></select></div>
  </div>
  <label class="chk"><input type="checkbox" id="pa-rinvio"> Rinvio finale a terra (carrucola in più sul capo di tiro)</label>
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
  <h2 class="tit">Forze sugli ancoraggi</h2>
  <table class="tab" id="pa-anc"></table>
  <p class="nota">Caso peggiore: capo di tiro parallelo al carico. Se si tira con un angolo, la forza sul punto cambia: ricalcolala. I valori non sostituiscono la verifica del tuo istruttore SAF.</p>
</div>

<div class="blocco">
  <h2 class="tit">Schema</h2>
  <div class="schemi" id="pa-sch"></div>
  <p class="nota">Il blocco in alto è fisso, quello in basso è mobile (sul carico). Il quadratino è il capo morto, la freccia è il capo di tiro.</p>
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

    function calcola() {
      const stadi = stati();
      const kg = Math.max(0, Number($("#pa-kg").value) || 0), h = Math.max(0, Number($("#pa-h").value) || 0);
      const eta = Math.min(1, Math.max(0.3, Number($("#pa-eta").value) || 0.95));
      const R = Math.max(0, Number($("#pa-r").value) || 0);
      const rinvio = $("#pa-rinvio").checked || (stadi.length === 1 && stadi[0] === 1);
      const W = kg * G;                          // N
      let L = W, vmTeo = 1;
      const out = [];
      stadi.forEach(n => {
        const T = tiro(L, n, eta);
        out.push({n, carico: L, tiro: T, anc: L + T});
        L = T; vmTeo *= n;
      });
      let Tf = L, ancRinvio = 0;
      if (rinvio) { const Tu = Tf / eta; ancRinvio = Tf + Tu; Tf = Tu; }
      const vmReale = W > 0 ? W / Tf : vmTeo;
      const corda = h * vmTeo;

      // pareggio: se si tira il capo morto senza perdite il tiro sarebbe W / vmTeo
      const ideale = W / vmTeo;
      const kN = v => fmt(v / 1000, 2);
      const daN = v => fmt(v / 10, 0);

      $("#pa-ris").innerHTML =
        '<div class="vcell"><div class="k">Vantaggio teorico</div><div class="v">' + vmTeo + ':1</div></div>' +
        '<div class="vcell"><div class="k">Vantaggio reale</div><div class="v">' + fmt(vmReale, 2) + ':1</div></div>' +
        '<div class="vcell"><div class="k">Tiro da fare</div><div class="v">' + daN(Tf) + ' <small>daN</small></div><div class="k">' + kN(Tf) + ' kN, circa ' + fmt(Tf / G, 0) + ' kg</div></div>' +
        '<div class="vcell"><div class="k">Perdita per attriti</div><div class="v">' + fmt(ideale > 0 ? (Tf / ideale - 1) * 100 : 0, 0) + ' <small>%</small></div><div class="k">tiro senza attriti: ' + daN(ideale) + ' daN</div></div>' +
        '<div class="vcell g"><div class="k">Corda da recuperare per ' + fmt(h, 1) + ' m di sollevamento</div><div class="v">' + fmt(corda, 1) + ' <small>m</small></div></div>';

      const avv = [];
      if (eta < 0.8 && vmTeo >= 4) avv.push("Con questi rendimenti i sistemi con molti capi perdono molto: valuta carrucole su cuscinetti.");
      if (Tf / G > 60) avv.push("Il tiro supera 60 kg: serve più di una persona o un sistema con più vantaggio.");
      $("#pa-avv").innerHTML = avv.map(t => '<div class="avv">' + t + '</div>').join("");

      let righe = "";
      out.forEach((o, i) => {
        const sf = R > 0 ? R * 1000 / o.anc : 0;
        righe += '<tr><td>' + (out.length > 1 ? "Stadio " + (i + 1) + (i === 0 ? " (al carico)" : " (in testa)") : "Ancoraggio del paranco") + '</td><td>' + kN(o.anc) + ' kN</td></tr>';
        righe += '<tr><td>&nbsp;&nbsp;coefficiente su ' + fmt(R, 0) + ' kN</td><td>' + fmt(sf, 1) + '</td></tr>';
      });
      if (ancRinvio) righe += '<tr><td>Carrucola di rinvio</td><td>' + kN(ancRinvio) + ' kN</td></tr>';
      righe += '<tr><td>Carico sollevato</td><td>' + kN(W) + ' kN</td></tr>';
      $("#pa-anc").innerHTML = righe;

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
    root.addEventListener("input", calcola);
    root.addEventListener("change", calcola);
    calcola();
  }
});
