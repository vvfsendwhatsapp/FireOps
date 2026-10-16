/* FireOps VVF - modulo Co.Em. Comunicato
 * Riscrive con l'intelligenza artificiale il testo di un intervento in forma di comunicato stampa,
 * con intestazione e chiusura fisse (modificabili). Tutto resta sul telefono: chiavi e testi si salvano
 * in localStorage; il testo parte solo verso il servizio AI scelto, e solo quando premi "Riscrivi".
 */
(function () {
  "use strict";

  const K_AI = "fireops_ai", K_CMT = "fireops_comunicato";
  const PROVIDERS = {
    gemini: {nome: "Google Gemini", modello: "gemini-2.0-flash"},
    groq: {nome: "Groq", modello: "llama-3.3-70b-versatile"},
    mistral: {nome: "Mistral", modello: "mistral-small-latest"}
  };
  const ORDINE = ["gemini", "groq", "mistral"];
  const HEAD0 = "🚒 VIGILI DEL FUOCO – {COMANDO}\nCOMUNICATO STAMPA – {DATA}";
  const FOOT0 = "Vigili del Fuoco – Sala Operativa {COMANDO}\nSoccorso pubblico: 115";
  const TONI = {
    sintetico: "Sii molto sintetico: 2-3 frasi.",
    standard: "Scrivi un breve testo di 4-6 frasi.",
    dettagliato: "Scrivi un testo più articolato, in 2-3 brevi paragrafi."
  };

  const CSS = `
.pg-comunicato { max-width: 640px; margin: 0 auto; padding: 14px 16px 40px; color: var(--text); }
.pg-comunicato .lead { margin: 0 0 14px; font-size: 13.5px; line-height: 1.5; color: var(--text-dim); }
.pg-comunicato .card { background: var(--panel); border: 1px solid var(--line); border-radius: 8px; padding: 14px; margin-bottom: 12px; }
.pg-comunicato h3 { margin: 0 0 10px; font-size: 14px; letter-spacing: .02em; text-transform: uppercase; color: var(--text-dim); }
.pg-comunicato .f { display: block; margin: 10px 0 4px; font-size: 12.5px; color: var(--text-dim); }
.pg-comunicato .f:first-of-type { margin-top: 0; }
.pg-comunicato textarea, .pg-comunicato input, .pg-comunicato select {
  width: 100%; padding: 10px 12px; font-size: 16px; font-family: inherit; box-sizing: border-box;
  background: var(--bg); color: var(--text); border: 1px solid var(--line); border-radius: 6px;
}
.pg-comunicato input, .pg-comunicato select { min-height: 46px; }
.pg-comunicato textarea { min-height: 130px; line-height: 1.45; resize: vertical; }
.pg-comunicato textarea.out { min-height: 260px; }
.pg-comunicato textarea.sm { min-height: 70px; }
.pg-comunicato textarea:focus, .pg-comunicato input:focus, .pg-comunicato select:focus { outline: none; border-color: var(--yellow); }
.pg-comunicato .btn {
  min-height: 46px; padding: 0 16px; border-radius: 6px; border: 1px solid var(--line);
  background: var(--panel-2); color: var(--text); font-size: 14.5px; font-weight: 700; cursor: pointer; font-family: inherit;
}
.pg-comunicato .btn.pri { background: var(--yellow); border-color: var(--yellow); color: #000; }
.pg-comunicato .btn.big { width: 100%; margin-top: 12px; }
.pg-comunicato .btn:disabled { opacity: .5; }
.pg-comunicato .acts { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 10px; }
.pg-comunicato .acts .btn { flex: 1 1 auto; }
.pg-comunicato .stato { min-height: 20px; margin-top: 8px; font-size: 13px; color: var(--text-dim); }
.pg-comunicato .stato.ok { color: #6bd68a; }
.pg-comunicato .stato.err { color: #ff8a73; }
.pg-comunicato .nota { font-size: 12px; color: var(--text-dim); line-height: 1.45; margin-top: 8px; }
.pg-comunicato details { margin-bottom: 12px; }
.pg-comunicato summary { cursor: pointer; padding: 12px 14px; background: var(--panel); border: 1px solid var(--line); border-radius: 8px; font-weight: 700; font-size: 14px; }
.pg-comunicato details[open] summary { border-radius: 8px 8px 0 0; }
.pg-comunicato details .card { border-radius: 0 0 8px 8px; border-top: 0; margin-bottom: 0; }
`;

  const HTML = `
<p class="lead">Scrivi i fatti dell’intervento come ti vengono: l’AI li riscrive in forma di comunicato, con intestazione e chiusura fisse. Controlla sempre il testo prima di diffonderlo.</p>

<div class="card">
  <h3>1 · Cosa è successo</h3>
  <label class="f" for="cm-src">Fatti dell’intervento (luogo, ora, mezzi, esito)</label>
  <textarea id="cm-src" placeholder="es. alle 14:20 in via Roma a Cesena incendio di un camper, 2 squadre, nessun ferito, spento alle 15:10"></textarea>
  <label class="f" for="cm-tono">Lunghezza</label>
  <select id="cm-tono"><option value="sintetico">Sintetico</option><option value="standard" selected>Standard</option><option value="dettagliato">Dettagliato</option></select>
  <button type="button" class="btn pri big" id="cm-gen">Riscrivi con l’AI</button>
  <div class="acts"><button type="button" class="btn" id="cm-noai">Senza AI: usa il testo così com’è</button></div>
  <div class="stato" id="cm-stato" role="status"></div>
  <p class="nota">Non scrivere nomi di persone coinvolte: il testo viene inviato al servizio AI scelto nelle impostazioni.</p>
</div>

<div class="card">
  <h3>2 · Comunicato</h3>
  <textarea id="cm-out" class="out" aria-label="Comunicato" placeholder="Qui compare il comunicato, modificabile a mano."></textarea>
  <div class="acts">
    <button type="button" class="btn pri" id="cm-copia">Copia</button>
    <button type="button" class="btn" id="cm-wa">WhatsApp</button>
    <button type="button" class="btn" id="cm-tg">Telegram</button>
    <button type="button" class="btn" id="cm-sh">Condividi</button>
  </div>
</div>

<details>
  <summary>Intestazione, chiusura e AI</summary>
  <div class="card">
    <label class="f" for="cm-head">Intestazione</label>
    <textarea id="cm-head" class="sm"></textarea>
    <label class="f" for="cm-foot">Chiusura</label>
    <textarea id="cm-foot" class="sm"></textarea>
    <p class="nota">Segnaposto: {COMANDO} (dall’Area personale o dalla posizione), {DATA}, {ORA}.</p>
    <div class="acts"><button type="button" class="btn" id="cm-hfdef">Ripristina intestazione e chiusura</button></div>
    <label class="f" for="cm-prov">Servizio AI preferito</label>
    <select id="cm-prov"><option value="">Automatico (il primo con chiave)</option>${ORDINE.map(p => '<option value="' + p + '">' + PROVIDERS[p].nome + "</option>").join("")}</select>
    ${ORDINE.map(p => '<label class="f" for="cm-k-' + p + '">Chiave ' + PROVIDERS[p].nome + '</label><input id="cm-k-' + p + '" data-p="' + p + '" type="password" autocomplete="off" autocapitalize="none" spellcheck="false" placeholder="incolla la chiave API">').join("")}
    <p class="nota">Le chiavi restano solo su questo telefono. Se un servizio fallisce o ha finito la quota, si prova il successivo che ha una chiave.</p>
    <div class="acts"><button type="button" class="btn" id="cm-reset">Reset dati</button></div>
  </div>
</details>
`;

  function chiamaAI(p, chiave, sistema, utente) {
    if (p === "gemini") {
      return fetch("https://generativelanguage.googleapis.com/v1beta/models/" + PROVIDERS.gemini.modello + ":generateContent?key=" + encodeURIComponent(chiave), {
        method: "POST", headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
          systemInstruction: {parts: [{text: sistema}]},
          contents: [{role: "user", parts: [{text: utente}]}],
          generationConfig: {temperature: 0.3}
        })
      }).then(r => r.json().then(j => {
        if (!r.ok) throw new Error((j.error && j.error.message) || "HTTP " + r.status);
        const t = j.candidates && j.candidates[0] && j.candidates[0].content && j.candidates[0].content.parts;
        if (!t || !t.length) throw new Error("risposta vuota");
        return t.map(x => x.text || "").join("");
      }));
    }
    const url = p === "groq" ? "https://api.groq.com/openai/v1/chat/completions" : "https://api.mistral.ai/v1/chat/completions";
    return fetch(url, {
      method: "POST", headers: {"Content-Type": "application/json", "Authorization": "Bearer " + chiave},
      body: JSON.stringify({
        model: PROVIDERS[p].modello, temperature: 0.3,
        messages: [{role: "system", content: sistema}, {role: "user", content: utente}]
      })
    }).then(r => r.json().then(j => {
      if (!r.ok) throw new Error((j.error && (j.error.message || j.error)) || "HTTP " + r.status);
      const t = j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content;
      if (!t) throw new Error("risposta vuota");
      return t;
    }));
  }

  FireOps.registra({
    id: "comunicato", css: CSS, html: HTML,
    init(root) {
      const $ = s => root.querySelector(s);
      const jget = k => { try { return JSON.parse(localStorage.getItem(k) || "{}") || {}; } catch (e) { return {}; } };
      const jset = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } };
      let cfg = jget(K_CMT), ai = jget(K_AI);
      let corpo = "";   // testo del comunicato senza intestazione/chiusura

      const stato = (t, cls) => { const el = $("#cm-stato"); el.textContent = t || ""; el.className = "stato" + (cls ? " " + cls : ""); };
      const comando = () => {
        const p = (FireOps.personale && FireOps.personale()) || {};
        if (p.comando) return p.comando;
        const pos = FireOps.posizione && FireOps.posizione();
        return (pos && pos.comando && pos.comando.c) || "";
      };
      const riempi = t => {
        const d = new Date(), pad = n => String(n).padStart(2, "0");
        return String(t || "").replace(/\{COMANDO\}/gi, comando() || "COMANDO")
          .replace(/\{DATA\}/gi, pad(d.getDate()) + "/" + pad(d.getMonth() + 1) + "/" + d.getFullYear())
          .replace(/\{ORA\}/gi, pad(d.getHours()) + ":" + pad(d.getMinutes()));
      };
      const compone = c => [riempi($("#cm-head").value).trim(), String(c || "").trim(), riempi($("#cm-foot").value).trim()].filter(Boolean).join("\n\n");

      $("#cm-head").value = cfg.head != null ? cfg.head : HEAD0;
      $("#cm-foot").value = cfg.foot != null ? cfg.foot : FOOT0;
      $("#cm-prov").value = ai.pref || "";
      ORDINE.forEach(p => { $("#cm-k-" + p).value = (ai.keys && ai.keys[p]) || ""; });

      const salvaCfg = () => {
        cfg = {head: $("#cm-head").value, foot: $("#cm-foot").value};
        const keys = {};
        ORDINE.forEach(p => { const v = $("#cm-k-" + p).value.trim(); if (v) keys[p] = v; });
        ai = {pref: $("#cm-prov").value, keys};
        jset(K_CMT, cfg); jset(K_AI, ai);
      };
      root.addEventListener("change", e => { if (e.target.closest("details")) salvaCfg(); });
      root.addEventListener("input", e => { if (e.target.id === "cm-head" || e.target.id === "cm-foot") salvaCfg(); });
      $("#cm-hfdef").addEventListener("click", () => { $("#cm-head").value = HEAD0; $("#cm-foot").value = FOOT0; salvaCfg(); });

      const mostra = c => { corpo = c; $("#cm-out").value = compone(c); };

      $("#cm-noai").addEventListener("click", () => {
        const t = $("#cm-src").value.trim();
        if (!t) { stato("Scrivi prima i fatti dell’intervento.", "err"); return; }
        mostra(t); stato("Testo inserito senza AI.", "ok");
      });

      $("#cm-gen").addEventListener("click", async () => {
        const t = $("#cm-src").value.trim();
        if (!t) { stato("Scrivi prima i fatti dell’intervento.", "err"); return; }
        salvaCfg();
        const con = ORDINE.filter(p => ai.keys && ai.keys[p]);
        if (!con.length) { stato("Manca la chiave AI: aprila da “Intestazione, chiusura e AI”.", "err"); $("details").open = true; return; }
        const ordine = ai.pref && con.includes(ai.pref) ? [ai.pref].concat(con.filter(p => p !== ai.pref)) : con;
        const sistema = "Sei l'addetto stampa dei Vigili del Fuoco italiani. Riscrivi i fatti forniti come corpo di un comunicato stampa in italiano, " +
          "tono istituzionale, sobrio e chiaro, al passato. Usa SOLO le informazioni fornite: non inventare luoghi, orari, numeri, cause o esiti. " +
          "Non citare nomi di persone coinvolte (usa 'un uomo di 40 anni', 'una donna') e non fare ipotesi sulle responsabilità. " +
          TONI[$("#cm-tono").value] + " Restituisci solo il testo del corpo, senza titolo, intestazione, saluti, elenchi o commenti.";
        const b = $("#cm-gen"); b.disabled = true;
        let ultimo = "";
        for (const p of ordine) {
          stato("Riscrivo con " + PROVIDERS[p].nome + "…");
          try {
            const r = await chiamaAI(p, ai.keys[p], sistema, t);
            mostra(r.trim());
            stato("Fatto con " + PROVIDERS[p].nome + ". Controlla il testo prima di diffonderlo.", "ok");
            b.disabled = false; return;
          } catch (e) { ultimo = PROVIDERS[p].nome + ": " + (e && e.message || e); }
        }
        b.disabled = false;
        stato("Non è riuscito (" + ultimo + "). Puoi riprovare o usare “Senza AI”.", "err");
      });

      // se cambio intestazione/chiusura dopo aver generato, aggiorno il testo completo
      const ricompone = () => { if (corpo) $("#cm-out").value = compone(corpo); };
      $("#cm-head").addEventListener("input", ricompone);
      $("#cm-foot").addEventListener("input", ricompone);
      // modifiche a mano nel comunicato: diventano il nuovo testo (intestazione e chiusura incluse)
      $("#cm-out").addEventListener("input", () => { corpo = ""; });

      const testo = () => $("#cm-out").value.trim();
      $("#cm-copia").addEventListener("click", async () => {
        if (!testo()) return;
        try { await navigator.clipboard.writeText(testo()); stato("Copiato negli appunti.", "ok"); }
        catch (e) { const o = $("#cm-out"); o.focus(); o.select(); stato("Selezionato: usa Copia del telefono.", ""); }
      });
      $("#cm-wa").addEventListener("click", () => { if (testo()) window.open("https://wa.me/?text=" + encodeURIComponent(testo()), "_blank", "noopener"); });
      $("#cm-tg").addEventListener("click", () => { if (testo()) window.open("https://t.me/share/url?url=%20&text=" + encodeURIComponent(testo()), "_blank", "noopener"); });
      $("#cm-sh").addEventListener("click", async () => {
        if (!testo()) return;
        if (navigator.share) { try { await navigator.share({text: testo()}); } catch (e) { } }
        else $("#cm-copia").click();
      });

      $("#cm-reset").addEventListener("click", () => {
        if (!confirm("Cancellare testi, intestazione, chiusura e chiavi AI salvati su questo telefono?")) return;
        try { localStorage.removeItem(K_AI); localStorage.removeItem(K_CMT); } catch (e) { }
        cfg = {}; ai = {}; corpo = "";
        $("#cm-head").value = HEAD0; $("#cm-foot").value = FOOT0; $("#cm-prov").value = "";
        ORDINE.forEach(p => { $("#cm-k-" + p).value = ""; });
        $("#cm-src").value = ""; $("#cm-out").value = ""; stato("Dati cancellati.", "ok");
      });
    }
  });
})();
