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
    <button type="button" id="pl-dietro">Da dietro</button>
    <button type="button" id="pl-vuoto">Dal vuoto</button>
    <button type="button" id="pl-iso">3D</button>
    <button type="button" id="pl-zm" aria-label="Allontana">−</button>
    <button type="button" id="pl-zp" aria-label="Avvicina">+</button>
  </div>
  <div class="leg"><span><i style="background:#ffd700"></i>palo</span><span><i style="background:#4A93C8"></i>tiranti</span><span><i style="background:#e8734a"></i>carico</span><span><i style="background:#2f9e5b"></i>capo di recupero</span><span><i style="background:#d8262f"></i>risultante sulla testa</span></div>
  <p class="nota">Trascina per ruotare. La zona rossa a terra è il vuoto (davanti), l’altra è il retro con gli ancoraggi. Gli elementi più vicini sono più marcati, quelli lontani più sbiaditi.</p>
</div>

<div class="blocco">
  <h2 class="tit">Palo</h2>
  <div class="riga">
    <div><label for="pl-cf">Configurazione</label><select id="pl-cf"><option value="A">A: 2 venti</option><option value="B">B: 1 vento, 2 laterali</option></select></div>
    <div><label for="pl-rc">Recupero</label><select id="pl-rc"><option value="E">Esterno al palo</option><option value="I">Interno (winch)</option></select></div>
  </div>
  <div class="riga3">
    <div><label for="pl-L">Lunghezza (m)</label><input type="number" id="pl-L" inputmode="decimal" min="1" max="12" step="0.1" value="4"></div>
    <div><label for="pl-th">Inclinazione (°)</label><input type="number" id="pl-th" inputmode="decimal" min="0" max="45" step="1" value="10"></div>
    <div><label for="pl-ph">Verso (°)</label><input type="number" id="pl-ph" inputmode="decimal" min="-180" max="360" step="5" value="0"></div>
  </div>
  <p class="nota">Inclinazione dalla verticale. Verso: 0° = inclinato verso il vuoto. Con 3 cavi (B) il sistema è iperstatico: i tiri sono ripartiti nel modo più uniforme possibile e i cavi che resterebbero compressi vengono considerati scarichi.</p>
</div>

<div class="blocco">
  <h2 class="tit">Ancoraggi e recupero</h2>
  <div class="riga3 tt"><span></span><span>Distanza dalla base (m)</span><span>Direzione (°)</span><span>Quota sulla base (m)</span></div>
  <div class="riga4"><b id="pl-n1" style="color:#4A93C8">Vento 1</b>
    <input type="number" id="pl-a1d" inputmode="decimal" min="0.3" step="0.1" value="5" aria-label="Distanza primo cavo">
    <input type="number" id="pl-a1a" inputmode="decimal" step="1" value="145" aria-label="Direzione primo cavo">
    <input type="number" id="pl-a1z" inputmode="decimal" step="0.1" value="0" aria-label="Quota primo cavo"></div>
  <div class="riga4"><b id="pl-n2" style="color:#4A93C8">Vento 2</b>
    <input type="number" id="pl-a2d" inputmode="decimal" min="0.3" step="0.1" value="5" aria-label="Distanza secondo cavo">
    <input type="number" id="pl-a2a" inputmode="decimal" step="1" value="215" aria-label="Direzione secondo cavo">
    <input type="number" id="pl-a2z" inputmode="decimal" step="0.1" value="0" aria-label="Quota secondo cavo"></div>
  <div class="riga4" id="pl-r3" hidden><b id="pl-n3" style="color:#27c4c4">Laterale 2</b>
    <input type="number" id="pl-a3d" inputmode="decimal" min="0.3" step="0.1" value="3" aria-label="Distanza terzo cavo">
    <input type="number" id="pl-a3a" inputmode="decimal" step="1" value="270" aria-label="Direzione terzo cavo">
    <input type="number" id="pl-a3z" inputmode="decimal" step="0.1" value="0" aria-label="Quota terzo cavo"></div>
  <div class="riga4" id="pl-rp"><b style="color:#2f9e5b">Recupero</b>
    <input type="number" id="pl-pd" inputmode="decimal" min="0" step="0.1" value="0" aria-label="Distanza punto di recupero">
    <input type="number" id="pl-pa" inputmode="decimal" step="1" value="180" aria-label="Direzione punto di recupero">
    <input type="number" id="pl-pz" inputmode="decimal" step="0.1" value="0" aria-label="Quota punto di recupero"></div>
  <p class="nota" id="pl-nr">Ogni ancoraggio ha la sua distanza, direzione e quota (+ sopra la base, − sotto): puoi metterli a quote diverse, per esempio uno su un albero e uno a terra.</p>
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
    let pianta = null;

    // Risolve C*a + somma(t_i * s_i) = rhs. Cavi in eccesso (3): minimo di somma dei tiri al quadrato, palo "gratis".
    // I cavi con tiro negativo vengono tolti e si risolve di nuovo. Restituisce {C, t: [...], attivi: [bool]} oppure null.
    function solve3(M, b) {
      const d = det(M[0], M[1], M[2]);
      if (!(Math.abs(d) > 0)) return null;
      const A = [M[0], M[1], M[2]];
      const rep = j => A.map((r, i) => r.map((v, k) => (k === j ? b[i] : v)));
      return [0, 1, 2].map(j => { const m = rep(j); return det(m[0], m[1], m[2]) / d; });
    }
    function risolvi(a, cavi, rhs, esatto) {
      let att = cavi.map((_, i) => i);
      for (let giro = 0; giro < 4; giro++) {
        const vett = [a].concat(att.map(i => cavi[i].s)), w = [1e-4].concat(att.map(() => 1));
        // M = V W^-1 V^T (3x3) con un velo di regolarizzazione, poi x = W^-1 V^T y con M y = rhs
        const M = [0, 1, 2].map(r => [0, 1, 2].map(c => vett.reduce((acc, v, k) => acc + v[r] * v[c] / w[k], 0)));
        const lam = 1e-10 * (M[0][0] + M[1][1] + M[2][2]);
        for (let i = 0; i < 3; i++) M[i][i] += lam;
        const y = solve3(M, rhs);
        if (!y) return null;
        const x = vett.map((v, k) => (v[0] * y[0] + v[1] * y[1] + v[2] * y[2]) / w[k]);
        // residuo: se le forze non si equilibrano (carico fuori dal piano dei cavi) il sistema non regge
        const res = [0, 1, 2].map(r => vett.reduce((acc, v, k) => acc + v[r] * x[k], 0) - rhs[r]);
        if (Math.hypot(res[0], res[1], res[2]) > 1e-3 * (Math.hypot(rhs[0], rhs[1], rhs[2]) || 1)) return null;
        const neg = att.filter((i, k) => x[k + 1] < -1e-6);
        if (esatto || !neg.length) {
          const t = cavi.map(() => 0);
          att.forEach((i, k) => { t[i] = x[k + 1]; });
          return {C: x[0], t, attivi: cavi.map((_, i) => att.includes(i))};
        }
        att = att.filter(i => !neg.includes(i));
      }
      return null;
    }

    function calcola() {
      const cfgB = $("#pl-cf").value === "B", interno = $("#pl-rc").value === "I";
      $("#pl-r3").hidden = !cfgB;
      $("#pl-rp").hidden = interno;
      $("#pl-n1").textContent = cfgB ? "Vento" : "Vento 1";
      $("#pl-n2").textContent = cfgB ? "Laterale 1" : "Vento 2";
      $("#pl-n2").style.color = cfgB ? "#27c4c4" : "#4A93C8";
      $("#pl-nr").textContent = interno ? "Recupero interno: il verricello è sul palo, il capo di recupero scende lungo il palo fino alla base. Ogni ancoraggio ha la sua distanza, direzione e quota (+ sopra la base, − sotto)."
        : "Recupero esterno: il capo di recupero va a un punto a parte (verricello o squadra), con la sua posizione e quota. Ogni ancoraggio ha la sua distanza, direzione e quota (+ sopra la base, − sotto).";

      const L = Math.max(0.5, num("#pl-L", 4)), th = Math.min(60, Math.max(0, num("#pl-th", 10))) * RAD, ph = num("#pl-ph", 0) * RAD;
      const kg = Math.max(0, num("#pl-kg", 200)), eta = Math.min(1, Math.max(0.5, num("#pl-eta", 0.95)));
      const E = num("#pl-mat", 70) * 1e9, Dm = Math.max(10, num("#pl-D", 80)) / 1000, sp = Math.min(Dm / 2 - 0.0005, Math.max(0.5, num("#pl-s", 4)) / 1000);
      const R = Math.max(0, num("#pl-r", 22));
      const polare = (id, dmin) => { const d = Math.max(dmin, num("#pl-" + id + "d", 5)), an = num("#pl-" + id + "a", 0) * RAD; return [d * Math.cos(an), d * Math.sin(an), num("#pl-" + id + "z", 0)]; };

      const B = [0, 0, 0], H = [L * Math.sin(th) * Math.cos(ph), L * Math.sin(th) * Math.sin(ph), L * Math.cos(th)];
      const P = interno ? B : polare("p", 0);
      const nomi = cfgB ? ["Vento", "Laterale 1", "Laterale 2"] : ["Vento 1", "Vento 2"];
      const cavi = nomi.map((nome, i) => {
        const pos = polare("a" + (i + 1), 0.3);
        return {id: "a" + (i + 1), nome, pos, s: uni(sub(pos, H)), col: cfgB && i > 0 ? "#27c4c4" : "#4A93C8"};
      });
      const W = kg * G, T = W / eta;
      const a = uni(sub(H, B)), h = uni(sub(P, H));
      const Fc = [T * h[0], T * h[1], T * h[2] - W];          // risultante sulla testa: carico appeso + capo di recupero
      const rhs = [-Fc[0], -Fc[1], -Fc[2]];
      const ris = risolvi(a, cavi, rhs, !cfgB);
      const C = ris ? ris.C : NaN, t = ris ? ris.t : cavi.map(() => NaN);
      const Fmod = len(Fc), angV = Fmod > 0 ? Math.acos(Math.max(-1, Math.min(1, -Fc[2] / Fmod))) / RAD : 0;
      // reazione a terra: se il recupero e' interno il tiro del verricello e' interno al sistema
      const Cg = interno ? C - T : C;
      const Hb = Math.hypot(Cg * a[0], Cg * a[1]), Vb = Cg * a[2];
      const attr = Vb > 0 ? Hb / Vb : Infinity;
      const I = Math.PI / 64 * (Math.pow(Dm, 4) - Math.pow(Dm - 2 * sp, 4));
      const Pcr = Math.PI * Math.PI * E * I / (L * L);
      const ok = !!ris && C > 0 && cavi.every((c, i) => !isNaN(t[i]) && (cfgB || t[i] > 0));
      geo = {B, H, cavi, P, interno, L, W, T, Fc, ok, t};
      tabellaGeo(H, cavi, P, t, T, interno);

      const avv = [];
      if (!ris) avv.push(cfgB ? "Con questi cavi il sistema non regge: serve almeno un cavo che trattenga il carico, oppure cambia posizioni." : "Configurazione indeterminata: i tiranti sono allineati con il palo. Cambia apertura o distanza.");
      else {
        if (!cfgB && t.some(v => v <= 0)) avv.push("Un tirante risulta scarico: con questa inclinazione il capo di recupero tira il palo all’indietro più di quanto lo sbalzo lo spinga in fuori, e il palo tenderebbe a tornare verso la verticale. Aumenta l’inclinazione o avvicina il punto di recupero alla base.");
        if (cfgB) cavi.forEach((c, i) => { if (!ris.attivi[i]) avv.push(c.nome + " risulta scarico (non lavora in questa condizione): serve solo se il carico cambia direzione."); });
        if (C <= 0) avv.push("Il palo risulta teso invece che compresso: controlla i dati.");
        const el = Math.max(...cavi.map(c => Math.atan2(H[2] - c.pos[2], Math.hypot(H[0] - c.pos[0], H[1] - c.pos[1])) / RAD));
        if (el > 60) avv.push("I cavi sono molto ripidi (" + fmt(el, 0) + "° sull’orizzontale): lavorano male. Allontana gli ancoraggi.");
        if (Pcr > 0 && C > Pcr / 3) avv.push("La compressione supera un terzo del carico di instabilità del palo: usa un tubo più robusto o più corto.");
        if (R > 0 && Math.max(...t.filter(v => isFinite(v))) / 1000 > R / 3) avv.push("Il cavo più carico supera un terzo della resistenza indicata per ancoraggi e tiranti.");
        if (attr > 0.5) avv.push("La base spinge molto di lato rispetto al verticale: serve un arresto o un ancoraggio della base contro lo scivolamento.");
        if (!interno && R > 0 && T / 1000 > R / 3) avv.push("Il capo di recupero carica il suo punto oltre un terzo della resistenza indicata.");
      }
      const k = v => fmt(v / 1000, 2) + ' <small>kN</small>';
      const elemento = (kk, v, ko) => '<div class="vcell' + (ko ? " ko" : "") + '"><div class="k">' + kk + '</div><div class="v">' + v + "</div></div>";
      const tmax = Math.max.apply(null, t.filter(v => isFinite(v)).concat([0]));
      $("#pl-ris").innerHTML =
        elemento("Risultante sulla testa", k(Fmod) + ' <small>' + fmt(angV, 0) + '° dalla verticale</small>') +
        elemento("Compressione nel palo", isFinite(C) ? k(C) : "—", !isFinite(C) || C <= 0) +
        elemento("Carico di instabilità (Eulero)", k(Pcr)) +
        elemento("Coefficiente del palo", isFinite(C) && C > 0 ? fmt(Pcr / C, 1) : "—") +
        cavi.map((c, i) => elemento(c.nome, isFinite(t[i]) ? k(Math.max(0, t[i])) : "—", !cfgB && !(t[i] > 0))).join("") +
        elemento("Capo di recupero", k(T)) +
        elemento("Coefficiente dei cavi", R > 0 && tmax > 0 ? fmt(R * 1000 / tmax, 1) : "—") +
        elemento(interno ? "Reazione a terra (C − T)" : "Reazione a terra", isFinite(Cg) ? k(Math.abs(Cg)) : "—") +
        elemento("Spinta orizzontale alla base", isFinite(Cg) ? k(Hb) : "—");
      $("#pl-avv").innerHTML = avv.map(x => '<div class="avv">' + x + "</div>").join("");
      disegna();
    }

    // ---------- pianta e angoli ----------
    function tabellaGeo(H, cavi, P, t, T, interno) {
      const el = q => Math.atan2(H[2] - q[2], Math.hypot(H[0] - q[0], H[1] - q[1])) / RAD;
      const lung = q => len(sub(q, H));
      const ang = (a, b) => { let d = Math.abs(Math.atan2(a[1], a[0]) - Math.atan2(b[1], b[0])) / RAD; return d > 180 ? 360 - d : d; };
      const riga = (n, q, col, tt) => '<tr><td style="color:' + col + '">' + n + '</td><td>' + fmt(lung(q), 2) + ' m</td><td>' + fmt(el(q), 0) + '°</td><td>' + (isFinite(tt) ? fmt(Math.max(0, tt) / 1000, 2) + " kN" : "—") + "</td></tr>";
      const Fc = geo.Fc, Fh = Math.hypot(Fc[0], Fc[1]);
      $("#pl-geo").innerHTML = '<table class="geo"><tr><th></th><th>Lunghezza</th><th>Angolo sull’orizzontale</th><th>Tiro</th></tr>' +
        cavi.map((c, i) => riga(c.nome, c.pos, c.col, t[i])).join("") + riga("Recupero", P, "#2f9e5b", T) + "</table>" +
        '<p class="nota">' + (cavi.length > 1 ? "Angolo in pianta tra " + cavi[0].nome + " e " + cavi[1].nome + ": " + fmt(ang(cavi[0].pos, cavi[1].pos), 0) + "°. " : "") +
        "Altezza della testa: " + fmt(H[2], 2) + " m. Risultante sulla testa: componente orizzontale " + fmt(Fh / 1000, 2) + " kN" + (Fh > 1 ? " verso " + fmt(((Math.atan2(Fc[1], Fc[0]) / RAD) + 360) % 360, 0) + "°" : "") + ", verticale " + fmt(Fc[2] / 1000, 2) + " kN.</p>";
      if (!pianta) return;
      const pr = (id, q, col, nome) => ({id, x: q[0], y: q[1], col, nome, sotto: (q[2] >= 0 ? "+" : "") + fmt(q[2], 1) + " m"});
      const pts = [
        {id: "B", x: 0, y: 0, fisso: true, col: "#eceff3", nome: "Base", ly: 30},
        {id: "H", x: H[0], y: H[1], fisso: true, col: "#ffd700", nome: "Testa", sotto: "+" + fmt(H[2], 1) + " m", ly: -30}
      ];
      const lin = [{a: "B", b: "H", col: "#ffd700", lw: 5}];
      cavi.forEach(c => { pts.push(pr(c.id, c.pos, c.col, c.nome)); lin.push({a: "H", b: c.id, col: c.col, dash: [6, 4], testo: fmt(lung(c.pos), 1) + " m"}); });
      if (!interno) { pts.push(Object.assign(pr("p", P, "#2f9e5b", "Recupero"), {ly: 60})); lin.push({a: "H", b: "p", col: "#2f9e5b", dash: [6, 4]}); }
      if (Fh > 1) {
        const lf = Math.max(1, geo.L * 0.5);
        pts.push({id: "F", x: H[0] + lf * Fc[0] / Fh, y: H[1] + lf * Fc[1] / Fh, fisso: true, col: "#d8262f", nome: "Risultante", sotto: fmt(len(Fc) / 1000, 2) + " kN (orizz. " + fmt(Fh / 1000, 2) + ")", ly: 0});
        lin.push({a: "H", b: "F", col: "#d8262f", lw: 3, freccia: true});
      }
      pianta.set(pts, lin);
    }
    const sincro = (id, x, y) => {
      const d = Math.hypot(x, y), an = Math.atan2(y, x) / RAD;
      $("#pl-" + id + "d").value = fmt(d, 1).replace(",", ".");
      $("#pl-" + id + "a").value = String(Math.round(an < 0 ? an + 360 : an));
      calcola();
    };
    const avviaPianta = () => { pianta = SafPianta.crea($("#pl-pi"), {onMove: sincro}); calcola(); };

    // valori di partenza per configurazione
    $("#pl-cf").addEventListener("change", () => {
      const v = $("#pl-cf").value === "B" ? [[5, 180], [3, 90], [3, 270]] : [[5, 145], [5, 215]];
      v.forEach((q, i) => { $("#pl-a" + (i + 1) + "d").value = q[0]; $("#pl-a" + (i + 1) + "a").value = q[1]; });
    });

    // ---------- vista 3D ----------
    const cv = $("#pl-cv"), ctx = cv.getContext("2d");
    let yaw = -0.7, pitch = 0.45, zoom = 1;
    function proietta(pt, c) {
      // ruota attorno a z (yaw) poi inclina (pitch): x destra, Y profondita' (positivo = lontano), Z su; camera sopra il piano
      let x = pt[0] - c[0], y = pt[1] - c[1], z = pt[2] - c[2];
      const cy = Math.cos(yaw), sy = Math.sin(yaw);
      const x1 = x * cy - y * sy, y1 = x * sy + y * cy;
      const cp = Math.cos(pitch), sp = Math.sin(pitch);
      const Y = y1 * cp - z * sp, Z = z * cp + y1 * sp;
      return [x1, Y, Z];
    }
    function disegna() {
      if (!geo) return;
      const w = cv.clientWidth || 320, h = cv.clientHeight || 300, dpr = window.devicePixelRatio || 1;
      if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const {B, H, cavi, P, L, Fc, interno} = geo;
      const Fm = len(Fc) || 1, Fp = [H[0] + L * 0.5 * Fc[0] / Fm, H[1] + L * 0.5 * Fc[1] / Fm, H[2] + L * 0.5 * Fc[2] / Fm];
      const pts = [B, H, P, Fp, [H[0], H[1], H[2] - 1]].concat(cavi.map(c => c.pos));
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
      // profondita': f vicino a 1.33 = vicino all'osservatore, 0.8 = lontano; linee lontane piu' sottili e sbiadite
      const chiaro = f => Math.max(0.3, Math.min(1, 0.3 + 0.7 * (f - 0.8) / 0.53));
      const linea = (a, b, col, lw, dash) => {
        const p1 = pr(a), p2 = pr(b), f = (p1[2] + p2[2]) / 2, k = chiaro(f);
        ctx.globalAlpha = k; ctx.strokeStyle = col; ctx.lineWidth = lw * (0.6 + 0.4 * k); ctx.setLineDash(dash || []);
        ctx.beginPath(); ctx.moveTo(p1[0], p1[1]); ctx.lineTo(p2[0], p2[1]); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
      };
      const etichetta = (q, txt, col) => { const t = pr(q); ctx.globalAlpha = Math.max(0.6, chiaro(t[2])); ctx.fillStyle = col; ctx.font = "bold 12px sans-serif"; ctx.textAlign = "center"; ctx.fillText(txt, t[0], t[1]); ctx.globalAlpha = 1; ctx.textAlign = "left"; };
      // terreno: griglia
      const g = Math.max(1, Math.round(raggio / 4));
      const x0 = Math.floor(mn[0] / g - 1) * g, x1 = Math.ceil(mx[0] / g + 1) * g, y0 = Math.floor(mn[1] / g - 1) * g, y1 = Math.ceil(mx[1] / g + 1) * g;
      // zona del vuoto (davanti, x > 0) in rosso, retro in grigio; il ciglio e' la linea x = 0
      const quad = (xa, xb, col) => { const q = [[xa, y0], [xb, y0], [xb, y1], [xa, y1]].map(v => pr([v[0], v[1], 0])); ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(q[0][0], q[0][1]); q.slice(1).forEach(v => ctx.lineTo(v[0], v[1])); ctx.closePath(); ctx.fill(); };
      quad(0, x1, "rgba(216,38,47,.16)"); quad(x0, 0, "rgba(139,150,163,.07)");
      for (let x = x0; x <= x1; x += g) linea([x, y0, 0], [x, y1, 0], "#2a323d", 1);
      for (let y = y0; y <= y1; y += g) linea([x0, y, 0], [x1, y, 0], "#2a323d", 1);
      linea([0, y0, 0], [0, y1, 0], "#d8262f", 2, [8, 5]);
      linea(B, [g, 0, 0], "#d8262f", 2); linea(B, [0, g, 0], "#2f9e5b", 2);
      etichetta([x1 - g * 0.6, 0, 0], "VUOTO", "#e8734a"); etichetta([x0 + g * 0.6, 0, 0], "RETRO", "#8b96a3");
      etichetta([g * 1.25, 0, 0], "x", "#d8262f"); etichetta([0, g * 1.25, 0], "sinistra", "#2f9e5b");
      // cavi
      cavi.forEach((cv_, i) => {
        const att = geo.ok || cv_.col; const scarico = geo.t && !(geo.t[i] > 1e-6);
        linea(H, cv_.pos, scarico ? "#e8734a" : cv_.col, 2, scarico ? [5, 4] : null);
        const t = pr(cv_.pos); ctx.fillStyle = cv_.col; ctx.fillRect(t[0] - 4, t[1] - 4, 8, 8);
        linea(cv_.pos, [cv_.pos[0], cv_.pos[1], 0], "#2a323d", 1, [3, 3]);
      });
      // capo di recupero
      if (!interno) { linea(H, P, "#2f9e5b", 2); const tp = pr(P); ctx.fillStyle = "#2f9e5b"; ctx.beginPath(); ctx.arc(tp[0], tp[1], 5, 0, 7); ctx.fill(); }
      else linea(H, B, "#2f9e5b", 2, [2, 3]);
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
      // risultante sulla testa (freccia)
      const tf = pr(Fp), an = Math.atan2(tf[1] - th[1], tf[0] - th[0]);
      ctx.strokeStyle = "#d8262f"; ctx.fillStyle = "#d8262f"; ctx.lineWidth = 3.5;
      ctx.beginPath(); ctx.moveTo(th[0], th[1]); ctx.lineTo(tf[0], tf[1]); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(tf[0], tf[1]); ctx.lineTo(tf[0] - 11 * Math.cos(an - 0.4), tf[1] - 11 * Math.sin(an - 0.4)); ctx.lineTo(tf[0] - 11 * Math.cos(an + 0.4), tf[1] - 11 * Math.sin(an + 0.4)); ctx.fill();
      ctx.font = "bold 12px sans-serif"; ctx.fillText(fmt(Fm / 1000, 2) + " kN", tf[0] + 8, tf[1] + 4);
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
    $("#pl-dietro").addEventListener("click", vista(Math.PI / 2, 0.3));
    $("#pl-vuoto").addEventListener("click", vista(-Math.PI / 2, 0.3));
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
