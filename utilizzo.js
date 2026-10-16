/* FireOps desktop - utilizzo e aggiornamento.
 * 1) Registra il Comando scelto al login ("Conferma e Accedi" e cambio Comando dal menu ☰),
 *    al massimo una volta ogni 6 ore per Comando. Solo il nome: nessun dato personale.
 * 2) Nel modale "Aiuto e contatti" mostra solo i nomi dei Comandi collegati a FireOps desktop.
 * 3) Controlla ogni 5 minuti se esiste una versione nuova e mostra la barra "Aggiorna".
 * Il registro sta nel foglio DB_Utilizzo (vedi apps-script/utilizzo.gs).
 */
(function () {
  "use strict";
  const WEBAPP = "https://script.google.com/macros/s/AKfycbyp6jQ331Yk5q7_hkM74ZyhUh1c3zQUJG7SpuoE18HslBO36YKSTYIQf-z7gSwXR4Yv/exec";
  const CHIAVE_COMANDO = "fireops_comando_selezionato";
  const CHIAVE_PING = "fireops_utilizzo_ping";
  const ORE_TRA_PING = 6;
  const versione = String(window.FIREOPS_VERSIONE || "n/d");
  const mobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);

  const esc = s => String(s).replace(/[&<>"]/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;"}[c]));
  const leggi = k => { try { return sessionStorage.getItem(k); } catch (e) { return null; } };

  /* ---------- 1) registrazione ---------- */
  // La registrazione parte solo se lo script Apps Script e' stato aggiornato (risponde a ?utilizzo=1):
  // altrimenti un foglio sconosciuto potrebbe finire nei fogli sbagliati.
  let scriptPronto = null;
  function verificaScript() {
    if (!scriptPronto) {
      scriptPronto = fetch(WEBAPP + "?" + new URLSearchParams({utilizzo: "1", giorni: "1"}))
        .then(r => r.ok ? r.json() : null).then(j => !!(j && Array.isArray(j.comandi))).catch(() => false);
    }
    return scriptPronto;
  }
  function ping(comando) {
    comando = String(comando || "").trim();
    if (!comando) return;
    verificaScript().then(ok => { if (ok) invia(comando); });
  }
  function invia(comando) {
    let reg = {};
    try { reg = JSON.parse(localStorage.getItem(CHIAVE_PING) || "{}") || {}; } catch (e) { }
    if (reg[comando] && Date.now() - reg[comando] < ORE_TRA_PING * 3600000) return;
    reg[comando] = Date.now();
    try { localStorage.setItem(CHIAVE_PING, JSON.stringify(reg)); } catch (e) { }
    try {
      fetch(WEBAPP, {
        method: "POST", mode: "no-cors", headers: {"Content-Type": "text/plain"},
        body: JSON.stringify({foglio: "DB_Utilizzo", comando, versione, piattaforma: mobile ? "mobile" : "desktop"})
      }).catch(() => { });
    } catch (e) { }
  }
  document.addEventListener("fireops:comando-attivo-cambiato", e => ping(e.detail && e.detail.Comando ? e.detail.Comando : e.detail || leggi(CHIAVE_COMANDO)));

  /* ---------- 2) elenco nel modale ---------- */
  const modale = document.getElementById("modal-help");
  const box = document.getElementById("utilizzo-comandi");
  let ultimoCaricamento = 0, dati = null;

  function disegna() {
    if (!box) return;
    if (!dati) { box.innerHTML = '<div class="ut-nota">Elenco non disponibile.</div>'; return; }
    const nomi = Array.from(new Set(dati.filter(r => r.piattaforma === "desktop").map(r => r.comando))).sort((a, b) => a.localeCompare(b, "it"));
    let h = '<div class="ut-tit">🖥️ Comandi collegati a FireOps desktop</div>';
    if (!nomi.length) h += '<div class="ut-nota">Nessun Comando negli ultimi 90 giorni.</div>';
    else {
      h += '<div class="ut-elenco">' + nomi.map(n => '<div class="ut-riga"><span>' + esc(n) + "</span></div>").join("") + "</div>" +
        '<div class="ut-nota">' + nomi.length + (nomi.length === 1 ? " Comando" : " Comandi") + '</div><button type="button" class="ut-btn" id="ut-copia">Copia l’elenco</button>';
    }
    box.innerHTML = h;
    const bt = box.querySelector("#ut-copia");
    if (bt) bt.addEventListener("click", () => {
      const t = nomi.join("\n");
      (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(() => { bt.textContent = "Copiato ✔"; }).catch(() => { bt.textContent = t.replace(/\n/g, ", "); });
    });
  }

  async function carica() {
    if (!box || Date.now() - ultimoCaricamento < 60000) return;
    ultimoCaricamento = Date.now();
    box.innerHTML = '<div class="ut-nota">Carico l’elenco…</div>';
    try {
      const r = await fetch(WEBAPP + "?" + new URLSearchParams({utilizzo: "1", giorni: "90"}));
      if (!r.ok) throw new Error("HTTP " + r.status);
      const j = await r.json();
      dati = Array.isArray(j.comandi) ? j.comandi : null;
    } catch (e) { dati = null; ultimoCaricamento = 0; }
    disegna();
  }

  if (modale && box) {
    new MutationObserver(() => { if (modale.style.display !== "none") carica(); }).observe(modale, {attributes: true, attributeFilter: ["style", "class"]});
  }

  /* ---------- 3) nuova versione ---------- */
  let barra = null;
  function mostraBarra() {
    if (barra) return;
    barra = document.createElement("div");
    barra.setAttribute("role", "status");
    barra.style.cssText = "position:fixed;left:12px;right:12px;bottom:12px;z-index:99999;max-width:520px;margin:0 auto;display:flex;align-items:center;gap:10px;padding:12px 14px;background:#ffd700;color:#000;border-radius:10px;font:600 14px/1.3 system-ui,sans-serif;box-shadow:0 4px 18px rgba(0,0,0,.5)";
    barra.innerHTML = '<span style="flex:1">Nuova versione di FireOps disponibile</span><button type="button" style="min-height:40px;padding:0 16px;border:0;border-radius:8px;background:#10141a;color:#ffd700;font:700 14px system-ui,sans-serif;cursor:pointer">Aggiorna</button>';
    barra.querySelector("button").addEventListener("click", () => location.reload());
    document.body.appendChild(barra);
  }
  async function controllaVersione() {
    if (document.hidden) return;
    try {
      const r = await fetch("versione.js?t=" + Date.now(), {cache: "no-store"});
      if (!r.ok) return;
      const m = (await r.text()).match(/FIREOPS_VERSIONE\s*=\s*["']([^"']+)["']/);
      if (m && m[1] !== versione) mostraBarra();
    } catch (e) { }
  }
  document.addEventListener("visibilitychange", controllaVersione);
  setInterval(controllaVersione, 5 * 60 * 1000);
  setTimeout(controllaVersione, 20000);
})();
