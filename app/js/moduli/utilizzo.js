/* FireOps VVF - modulo "Info Comandi"
 * Quali Comandi si sono collegati a FireOps DESKTOP (non all'app), con versione e ultimo accesso.
 * Serve a capire chi avvisare di aggiornare con F5. Legge il foglio DB_Utilizzo
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
<p class="lead">I Comandi che si sono collegati a <b>FireOps desktop</b> negli ultimi 90 giorni. Quelli con una versione vecchia vanno avvisati di aggiornare con F5.</p>
<div id="ut-num"></div>
<div class="card" id="ut-elenco"><div class="vuoto">Carico l’elenco…</div></div>
<div class="acts">
  <button type="button" class="btn pri" id="ut-agg">Aggiorna</button>
  <button type="button" class="btn" id="ut-copia" hidden>Copia i Comandi da avvisare</button>
</div>
<p class="nota" id="ut-nota"></p>
`,

  init(root) {
    "use strict";
    const WEBAPP = "https://script.google.com/macros/s/AKfycbyp6jQ331Yk5q7_hkM74ZyhUh1c3zQUJG7SpuoE18HslBO36YKSTYIQf-z7gSwXR4Yv/exec";
    const $ = s => root.querySelector(s);
    const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;"}[c]));
    let daAvvisare = [];

    function fa(iso) {
      const m = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
      if (m < 60) return m + " min fa";
      if (m < 1440) return Math.round(m / 60) + " h fa";
      return Math.round(m / 1440) + " gg fa";
    }

    // versione attuale di FireOps desktop: sta in /FireOps/versione.js (l'app e' in /FireOps/app/)
    async function versioneDesktop() {
      try {
        const r = await fetch("../versione.js?t=" + Date.now(), {cache: "no-store"});
        const m = (await r.text()).match(/FIREOPS_VERSIONE\s*=\s*["']([^"']+)["']/);
        return m ? m[1] : "";
      } catch (e) { return ""; }
    }

    async function carica() {
      $("#ut-elenco").innerHTML = '<div class="vuoto">Carico l’elenco…</div>';
      $("#ut-copia").hidden = true; $("#ut-num").innerHTML = ""; $("#ut-nota").textContent = "";
      let dati = null;
      const [ver, risp] = await Promise.all([
        versioneDesktop(),
        fetch(WEBAPP + "?" + new URLSearchParams({utilizzo: "1", giorni: "90"})).then(r => r.ok ? r.json() : null).catch(() => null)
      ]);
      if (risp && Array.isArray(risp.comandi)) dati = risp.comandi.filter(r => r.piattaforma === "desktop");
      if (!dati) {
        $("#ut-elenco").innerHTML = '<div class="vuoto">Elenco non disponibile.<br>Serve la connessione e lo script Apps Script aggiornato (apps-script/utilizzo.gs).</div>';
        return;
      }
      if (!dati.length) { $("#ut-elenco").innerHTML = '<div class="vuoto">Nessun Comando collegato a FireOps desktop negli ultimi 90 giorni.</div>'; return; }
      const vecchio = r => ver && r.versione !== ver;
      daAvvisare = dati.filter(vecchio).map(r => r.comando);
      $("#ut-num").innerHTML = '<div class="num"><div><b>' + dati.length + "</b><span>Comandi</span></div><div><b>" + (dati.length - daAvvisare.length) +
        "</b><span>aggiornati</span></div><div><b>" + daAvvisare.length + "</b><span>da avvisare</span></div></div>";
      $("#ut-elenco").innerHTML = dati.map(r => '<div class="it' + (vecchio(r) ? " vecchia" : "") + '"><div class="tx"><b>' + esc(r.comando) + "</b><small>Ultimo accesso " + fa(r.ultimo) +
        " · " + r.aperture + (r.aperture === 1 ? " apertura" : " aperture") + "</small></div><div class=\"st\">" + (vecchio(r) ? "⚠️ da aggiornare" : "✅ aggiornato") + "</div></div>").join("");
      $("#ut-copia").hidden = !daAvvisare.length;
      $("#ut-nota").textContent = ver ? "Versione attuale di FireOps desktop: " + ver : "Versione attuale non rilevata: non si può dire chi è da aggiornare.";
    }

    $("#ut-agg").addEventListener("click", carica);
    $("#ut-copia").addEventListener("click", () => {
      const t = Array.from(new Set(daAvvisare)).join("\n"), b = $("#ut-copia");
      (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(() => { b.textContent = "Copiato ✔"; }).catch(() => { b.textContent = t.replace(/\n/g, ", "); });
    });
    carica();
  }
});
