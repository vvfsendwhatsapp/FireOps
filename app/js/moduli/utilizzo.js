/* FireOps VVF - modulo "Info Comandi"
 * Elenco unico e storico dei Comandi che usano FireOps: solo i nomi. Legge il foglio DB_Utilizzo
 * dalla Web App Apps Script (vedi apps-script/utilizzo.gs): GET ?utilizzo=1&giorni=N.
 * L'app non registra nulla su di se': la registrazione la fa solo FireOps desktop (utilizzo.js in radice).
 */
FireOps.registra({
  id: "utilizzo",

  css: `
.pg-utilizzo { max-width: 640px; margin: 0 auto; padding: 14px 16px 40px; color: var(--text); }
.pg-utilizzo .lead { margin: 0 0 12px; font-size: 13.5px; line-height: 1.5; color: var(--text-dim); }
.pg-utilizzo .card { background: var(--panel); border: 1px solid var(--line); border-radius: 8px; padding: 12px 14px; margin-bottom: 10px; }
.pg-utilizzo .num { display: flex; gap: 8px; margin-bottom: 10px; }
.pg-utilizzo .num div { flex: 1; text-align: center; padding: 8px 4px; background: var(--panel); border: 1px solid var(--line); border-radius: 8px; }
.pg-utilizzo .num b { display: block; font-size: 20px; }
.pg-utilizzo .num span { font-size: 11.5px; color: var(--text-dim); }
.pg-utilizzo .it { display: flex; align-items: center; gap: 10px; padding: 10px 0; border-top: 1px solid var(--line); }
.pg-utilizzo .it:first-of-type { border-top: 0; }
.pg-utilizzo .it .tx { flex: 1; min-width: 0; font-size: 14.5px; line-height: 1.35; }
.pg-utilizzo .it .tx small { display: block; color: var(--text-dim); font-size: 12.5px; }
.pg-utilizzo .it.vecchia .st { color: var(--yellow); }
.pg-utilizzo .st { font-size: 13px; font-weight: 700; white-space: nowrap; }
.pg-utilizzo .btn { min-height: 44px; padding: 0 14px; border-radius: 6px; border: 1px solid var(--line); background: var(--panel-2);
  color: var(--text); font-size: 14px; font-weight: 700; cursor: pointer; font-family: inherit; }
.pg-utilizzo .btn.pri { background: var(--yellow); border-color: var(--yellow); color: #000; }
.pg-utilizzo .acts { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 10px; }
.pg-utilizzo .acts .btn { flex: 1 1 auto; }
.pg-utilizzo .vuoto { padding: 14px 4px; text-align: center; color: var(--text-dim); font-size: 13.5px; }
.pg-utilizzo .nota { font-size: 12px; color: var(--text-dim); line-height: 1.45; margin-top: 8px; }
`,

  html: `
<p class="lead">Tutti i Comandi che hanno usato <b>FireOps</b> (storico: login e invii di Messaggistica).</p>
<div class="card" id="ut-elenco"><div class="vuoto">Carico l’elenco…</div></div>
<div class="acts">
  <button type="button" class="btn pri" id="ut-agg">Aggiorna</button>
  <button type="button" class="btn" id="ut-copia" hidden>Copia l’elenco</button>
</div>
<p class="nota" id="ut-nota"></p>
`,

  init(root) {
    "use strict";
    const WEBAPP = "https://script.google.com/macros/s/AKfycbyp6jQ331Yk5q7_hkM74ZyhUh1c3zQUJG7SpuoE18HslBO36YKSTYIQf-z7gSwXR4Yv/exec";
    const $ = s => root.querySelector(s);
    const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;"}[c]));
    let nomi = [];

    async function carica() {
      $("#ut-elenco").innerHTML = '<div class="vuoto">Carico l’elenco…</div>';
      $("#ut-copia").hidden = true; $("#ut-nota").textContent = "";
      let dati = null;
      try {
        const r = await fetch(WEBAPP + "?" + new URLSearchParams({utilizzo: "1"}));
        const j = r.ok ? await r.json() : null;
        if (j && Array.isArray(j.comandi)) dati = j.comandi;
      } catch (e) { }
      if (!dati) {
        $("#ut-elenco").innerHTML = '<div class="vuoto">Elenco non disponibile.<br>Serve la connessione e lo script Apps Script aggiornato (apps-script/utilizzo.gs).</div>';
        return;
      }
      nomi = Array.from(new Set(dati.map(x => x.comando))).sort((a, b) => a.localeCompare(b, "it"));
      if (!nomi.length) { $("#ut-elenco").innerHTML = '<div class="vuoto">Nessun Comando registrato.</div>'; return; }
      $("#ut-elenco").innerHTML = nomi.map(n => '<div class="it"><div class="tx"><b>' + esc(n) + "</b></div></div>").join("");
      $("#ut-nota").textContent = nomi.length + (nomi.length === 1 ? " Comando" : " Comandi");
      $("#ut-copia").hidden = false;
    }

    $("#ut-agg").addEventListener("click", carica);
    $("#ut-copia").addEventListener("click", () => {
      const t = nomi.join("\n"), b = $("#ut-copia");
      (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(() => { b.textContent = "Copiato ✔"; }).catch(() => { b.textContent = t.replace(/\n/g, ", "); });
    });
    carica();
  }
});
