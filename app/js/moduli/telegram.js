/* FireOps VVF - modulo Telegram
 * Legge i messaggi di un canale (o gruppo) Telegram con il TUO account, in una sezione a parte.
 * - L'accesso usa le API di Telegram (libreria GramJS, js/vendor/gramjs.bundle.js, caricata solo qui).
 * - La sessione (api_id, api_hash e chiave di accesso) è cifrata con una passphrase (AES-GCM) e resta
 *   solo su questo telefono. Senza la passphrase non si può usare.
 * - I messaggi non vengono salvati: si leggono dal canale ogni volta e restano solo in memoria.
 */
(function () {
  "use strict";

  const K_CFG = "fireops_tg_cfg";   // canale scelto (non segreto)
  const K_SES = "fireops_tg_ses";   // sessione cifrata
  const POLL_MS = 8000;
  const N_MSG = 40;

  const CSS = `
.pg-telegram { max-width: 640px; margin: 0 auto; padding: 14px 16px 40px; color: var(--text); }
.pg-telegram .lead { margin: 0 0 14px; font-size: 13.5px; line-height: 1.5; color: var(--text-dim); }
.pg-telegram .card { background: var(--panel); border: 1px solid var(--line); border-radius: 8px; padding: 14px; margin-bottom: 12px; }
.pg-telegram h3 { margin: 0 0 10px; font-size: 14px; letter-spacing: .02em; text-transform: uppercase; color: var(--text-dim); }
.pg-telegram .f { display: block; margin: 0 0 5px; font-size: 12.5px; color: var(--text-dim); }
.pg-telegram .fld { margin-top: 14px; }
.pg-telegram h3 + .fld { margin-top: 0; }
.pg-telegram input, .pg-telegram select {
  width: 100%; min-height: 46px; padding: 10px 12px; font-size: 16px; font-family: inherit; box-sizing: border-box;
  background: var(--bg); color: var(--text); border: 1px solid var(--line); border-radius: 6px;
}
.pg-telegram input:focus, .pg-telegram select:focus { outline: none; border-color: var(--yellow); }
.pg-telegram .btn {
  min-height: 46px; padding: 0 16px; border-radius: 6px; border: 1px solid var(--line);
  background: var(--panel-2); color: var(--text); font-size: 14.5px; font-weight: 700; cursor: pointer; font-family: inherit;
}
.pg-telegram .btn.pri { background: var(--yellow); border-color: var(--yellow); color: #000; }
.pg-telegram .btn.sm { min-height: 38px; padding: 0 12px; font-size: 13px; }
.pg-telegram .btn:disabled { opacity: .5; }
.pg-telegram .acts { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 14px; }
.pg-telegram .acts .btn { flex: 1 1 auto; }
.pg-telegram .stato { min-height: 20px; margin-top: 10px; font-size: 13px; color: var(--text-dim); }
.pg-telegram .stato.ok { color: #6bd68a; }
.pg-telegram .stato.err { color: #ff8a73; }
.pg-telegram .nota { font-size: 12px; color: var(--text-dim); line-height: 1.5; margin: 10px 0 0; }
.pg-telegram .nota a { color: var(--yellow); }
.pg-telegram .barra { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
.pg-telegram .barra b { flex: 1; min-width: 0; font-size: 15px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pg-telegram .msg { background: var(--panel); border: 1px solid var(--line); border-radius: 8px; padding: 10px 12px; margin-bottom: 8px; }
.pg-telegram .msg-h { display: flex; justify-content: space-between; gap: 8px; font-size: 12px; color: var(--text-dim); margin-bottom: 4px; }
.pg-telegram .msg-h a { color: var(--text-dim); }
.pg-telegram .msg-t { font-size: 15px; line-height: 1.45; white-space: pre-wrap; word-break: break-word; }
.pg-telegram .msg-t a { color: var(--yellow); }
.pg-telegram .msg img { display: block; max-width: 100%; border-radius: 6px; margin-top: 8px; }
.pg-telegram .msg .btn { margin-top: 8px; }
.pg-telegram .vuoto { text-align: center; color: var(--text-dim); padding: 30px 10px; font-size: 14px; }
.pg-telegram .live { display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #6bd68a; margin-right: 6px; }
`;

  const HTML = `
<div id="tg-setup" hidden>
  <p class="lead">Collega il tuo account Telegram per leggere qui i messaggi di un canale. Serve fare l’accesso una volta sola.</p>
  <div class="card">
    <h3>1 · Chiavi di Telegram</h3>
    <div class="fld"><label class="f" for="tg-id">api_id</label><input id="tg-id" inputmode="numeric" autocomplete="off" placeholder="numero di 7-8 cifre"></div>
    <div class="fld"><label class="f" for="tg-hash">api_hash</label><input id="tg-hash" autocomplete="off" autocapitalize="none" spellcheck="false" placeholder="32 caratteri"></div>
    <p class="nota">Si ottengono gratis da un computer: apri <a href="https://my.telegram.org" target="_blank" rel="noopener">my.telegram.org</a>, accedi con il tuo numero, scegli “API development tools” e crea un’applicazione (nome a piacere, ad esempio FireOps).</p>
  </div>
  <div class="card">
    <h3>2 · Passphrase</h3>
    <div class="fld"><label class="f" for="tg-pp">Scegli una passphrase</label><input id="tg-pp" type="password" autocomplete="new-password" placeholder="almeno 6 caratteri"></div>
    <div class="fld"><label class="f" for="tg-pp2">Ripetila</label><input id="tg-pp2" type="password" autocomplete="new-password"></div>
    <p class="nota">Cifra l’accesso salvato su questo telefono. Se qualcuno prende il telefono, senza la passphrase non può usare il tuo Telegram. Non si può recuperare: se la perdi, scolleghi e rifai l’accesso.</p>
  </div>
  <div class="card">
    <h3>3 · Il tuo numero</h3>
    <div class="fld"><label class="f" for="tg-ph">Numero di telefono</label><input id="tg-ph" type="tel" inputmode="tel" autocomplete="off" placeholder="+39 333 1234567"></div>
    <div class="acts"><button type="button" class="btn pri" id="tg-collega">Collega Telegram</button></div>
    <div id="tg-ask" hidden>
      <div class="fld"><label class="f" for="tg-ask-i" id="tg-ask-l">Codice</label><input id="tg-ask-i" autocomplete="one-time-code" inputmode="numeric"></div>
      <div class="acts"><button type="button" class="btn pri" id="tg-ask-ok">Conferma</button></div>
    </div>
    <div class="stato" id="tg-st1" role="status"></div>
  </div>
</div>

<div id="tg-lock" hidden>
  <div class="card">
    <h3>Telegram collegato</h3>
    <div class="fld"><label class="f" for="tg-pu">Passphrase</label><input id="tg-pu" type="password" autocomplete="current-password"></div>
    <div class="acts"><button type="button" class="btn pri" id="tg-sblocca">Sblocca</button></div>
    <div class="stato" id="tg-st2" role="status"></div>
  </div>
</div>

<div id="tg-scelta" hidden>
  <div class="card">
    <h3>Scegli il canale</h3>
    <div class="fld"><label class="f" for="tg-chan">Canali e gruppi del tuo account</label><select id="tg-chan"></select></div>
    <div class="acts"><button type="button" class="btn pri" id="tg-usa">Usa questo canale</button></div>
  </div>
</div>

<div id="tg-feed" hidden>
  <div class="barra"><b id="tg-tit"></b><button type="button" class="btn sm" id="tg-agg">Aggiorna</button><button type="button" class="btn sm" id="tg-cambia">Cambia</button></div>
  <div id="tg-list"></div>
  <div class="stato" id="tg-st3" role="status"></div>
</div>

<div id="tg-foot" hidden>
  <div class="acts"><button type="button" class="btn sm" id="tg-reset">Reset dati (scollega)</button></div>
</div>
`;

  /* ---------- cifratura della sessione ---------- */
  const enc = new TextEncoder(), dec = new TextDecoder();
  const b64 = u8 => btoa(String.fromCharCode.apply(null, Array.from(u8)));
  const unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
  async function chiave(pass, salt) {
    const base = await crypto.subtle.importKey("raw", enc.encode(pass), "PBKDF2", false, ["deriveKey"]);
    return crypto.subtle.deriveKey({name: "PBKDF2", salt, iterations: 200000, hash: "SHA-256"}, base,
      {name: "AES-GCM", length: 256}, false, ["encrypt", "decrypt"]);
  }
  async function cifra(pass, obj) {
    const salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = await crypto.subtle.encrypt({name: "AES-GCM", iv}, await chiave(pass, salt), enc.encode(JSON.stringify(obj)));
    return {s: b64(salt), i: b64(iv), c: b64(new Uint8Array(ct))};
  }
  async function decifra(pass, rec) {
    const pt = await crypto.subtle.decrypt({name: "AES-GCM", iv: unb64(rec.i)}, await chiave(pass, unb64(rec.s)), unb64(rec.c));
    return JSON.parse(dec.decode(pt));
  }

  /* ---------- libreria Telegram (si scarica solo quando serve) ---------- */
  let libPromise = null;
  function caricaLib() {
    if (window.GramJS) return Promise.resolve(window.GramJS);
    if (libPromise) return libPromise;
    libPromise = new Promise((ok, ko) => {
      const sc = document.createElement("script");
      sc.src = "js/vendor/gramjs.bundle.js?v=" + (window.FIREOPS_VERSIONE || "1");
      sc.onload = () => window.GramJS ? ok(window.GramJS) : ko(new Error("libreria Telegram non valida"));
      sc.onerror = () => { libPromise = null; ko(new Error("libreria Telegram non scaricabile")); };
      document.head.appendChild(sc);
    });
    return libPromise;
  }

  // se Telegram non risponde (rete che lo blocca, niente campo) non resta in attesa all'infinito
  const entro = (pr, ms, msg) => Promise.race([pr, new Promise((_, ko) => setTimeout(() => ko(new Error(msg)), ms))]);
  const MSG_RETE = "Telegram non risponde: controlla la connessione (alcune reti lo bloccano)";

  const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;"}[c]));
  const linkify = s => esc(s).replace(/(https?:\/\/[^\s<]+)/g, u => '<a href="' + u + '" target="_blank" rel="noopener">' + u + "</a>");
  const quando = sec => {
    const d = new Date(sec * 1000), p = n => String(n).padStart(2, "0");
    const oggi = new Date();
    const g = d.toDateString() === oggi.toDateString() ? "oggi" : p(d.getDate()) + "/" + p(d.getMonth() + 1);
    return g + " " + p(d.getHours()) + ":" + p(d.getMinutes());
  };

  FireOps.registra({
    id: "telegram", css: CSS, html: HTML,
    init(root) {
      const $ = s => root.querySelector(s);
      const mostra = (...ids) => ["setup", "lock", "scelta", "feed", "foot"].forEach(k => { $("#tg-" + k).hidden = !ids.includes(k); });
      const st = (id, t, cls) => { const e = $(id); e.textContent = t || ""; e.className = "stato" + (cls ? " " + cls : ""); };
      const jget = k => { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch (e) { return null; } };
      const jset = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } };

      let creds = null, pass = "", client = null, cfg = jget(K_CFG) || {}, entity = null;
      let timer = null, visibile = false, firma = "", fotoUrl = {}, caricando = false;

      /* ---------- collegamento ---------- */
      let rispondi = null;
      const chiedi = (etichetta, tipo) => new Promise(ok => {
        $("#tg-ask-l").textContent = etichetta;
        const i = $("#tg-ask-i"); i.type = tipo || "text"; i.value = "";
        $("#tg-ask").hidden = false; i.focus();
        rispondi = v => { $("#tg-ask").hidden = true; ok(v); };
      });
      $("#tg-ask-ok").addEventListener("click", () => { if (rispondi) { const f = rispondi; rispondi = null; f($("#tg-ask-i").value.trim()); } });

      async function nuovoClient(c, sessione) {
        const G = await caricaLib();
        const cl = new G.TelegramClient(new G.StringSession(sessione || ""), +c.id, c.hash,
          {connectionRetries: 3, useWSS: true, deviceModel: "FireOps VVF", appVersion: "1.0"});
        return cl;
      }

      $("#tg-collega").addEventListener("click", async () => {
        const id = $("#tg-id").value.trim(), hash = $("#tg-hash").value.trim(), pp = $("#tg-pp").value, pp2 = $("#tg-pp2").value;
        const ph = $("#tg-ph").value.replace(/[^\d+]/g, "");
        if (!/^\d{4,10}$/.test(id)) return st("#tg-st1", "L’api_id è un numero (da my.telegram.org).", "err");
        if (!/^[0-9a-f]{32}$/i.test(hash)) return st("#tg-st1", "L’api_hash ha 32 caratteri (cifre e lettere a-f).", "err");
        if (pp.length < 6) return st("#tg-st1", "La passphrase deve avere almeno 6 caratteri.", "err");
        if (pp !== pp2) return st("#tg-st1", "Le due passphrase non coincidono.", "err");
        if (ph.replace(/\D/g, "").length < 8) return st("#tg-st1", "Scrivi il numero con il prefisso, ad esempio +39 333 1234567.", "err");
        const b = $("#tg-collega"); b.disabled = true;
        try {
          st("#tg-st1", "Mi collego a Telegram…");
          const c = {id, hash};
          let errori = 0;
          const cl = await nuovoClient(c, "");
          await entro(cl.connect(), 25000, MSG_RETE);
          await cl.start({
            phoneNumber: async () => ph,
            phoneCode: async () => { st("#tg-st1", "Telegram ha inviato un codice alla tua app (o per SMS)."); return chiedi("Codice ricevuto"); },
            password: async () => { st("#tg-st1", "L’account ha la verifica in due passaggi."); return chiedi("Password di Telegram", "password"); },
            // dopo 3 errori si ferma (es. api_id sbagliato), per non martellare Telegram con tentativi uguali
            onError: async e => { errori++; st("#tg-st1", "Telegram: " + (e && e.message || e) + (errori >= 3 ? ". Controlla i dati e riprova." : ". Riprova."), "err"); return errori >= 3; }
          });
          creds = {id, hash, session: cl.session.save()};
          pass = pp;
          jset(K_SES, await cifra(pass, creds));
          client = cl;
          st("#tg-st1", "Collegato.", "ok");
          $("#tg-pp").value = $("#tg-pp2").value = $("#tg-hash").value = "";
          await dopoAccesso();
        } catch (e) {
          st("#tg-st1", "Collegamento non riuscito: " + (e && e.message || e) + ". Controlla la rete (alcune reti bloccano Telegram) e riprova.", "err");
        } finally { b.disabled = false; $("#tg-ask").hidden = true; }
      });

      $("#tg-sblocca").addEventListener("click", async () => {
        const rec = jget(K_SES), p = $("#tg-pu").value;
        if (!rec || !p) return;
        const b = $("#tg-sblocca"); b.disabled = true;
        try {
          try { creds = await decifra(p, rec); } catch (e) { st("#tg-st2", "Passphrase errata.", "err"); return; }
          pass = p;
          st("#tg-st2", "Mi collego a Telegram…");
          client = await nuovoClient(creds, creds.session);
          await entro(client.connect(), 25000, MSG_RETE);
          $("#tg-pu").value = "";
          st("#tg-st2", "");
          await dopoAccesso();
        } catch (e) {
          st("#tg-st2", "Impossibile collegarsi: " + (e && e.message || e) + ".", "err");
        } finally { b.disabled = false; }
      });

      /* ---------- canale ---------- */
      let dialoghi = [];
      async function dopoAccesso() {
        mostra("feed", "foot");
        $("#tg-tit").textContent = "Carico i canali…";
        st("#tg-st3", "");
        dialoghi = (await client.getDialogs({limit: 200})).filter(d => d.isChannel || d.isGroup);
        const idc = cfg.id && dialoghi.find(d => String(d.entity.id) === cfg.id);
        if (idc) { entity = idc.entity; avviaFeed(); }
        else { riempiScelta(); mostra("scelta", "foot"); }
      }
      function riempiScelta() {
        const sel = $("#tg-chan");
        sel.innerHTML = dialoghi.length
          ? dialoghi.map((d, i) => '<option value="' + i + '">' + esc(d.title || d.name || "(senza nome)") + (d.entity && d.entity.broadcast ? "" : " · gruppo") + "</option>").join("")
          : '<option value="">Nessun canale trovato</option>';
      }
      $("#tg-usa").addEventListener("click", () => {
        const d = dialoghi[+$("#tg-chan").value];
        if (!d) return;
        entity = d.entity;
        cfg = {id: String(d.entity.id), titolo: d.title || d.name || "", user: d.entity.username || ""};
        jset(K_CFG, cfg);
        avviaFeed();
      });
      $("#tg-cambia").addEventListener("click", () => { fermaPoll(); riempiScelta(); mostra("scelta", "foot"); });

      /* ---------- messaggi ---------- */
      function avviaFeed() {
        mostra("feed", "foot");
        $("#tg-tit").innerHTML = '<span class="live"></span>' + esc(cfg.titolo || "Canale");
        firma = ""; fotoUrl = {};
        aggiorna();
        if (visibile) avviaPoll();
      }
      function avviaPoll() { fermaPoll(); if (entity && client) timer = setInterval(aggiorna, POLL_MS); }
      function fermaPoll() { if (timer) { clearInterval(timer); timer = null; } }

      function linkMsg(m) {
        if (cfg.user) return "https://t.me/" + cfg.user + "/" + m.id;
        return "https://t.me/c/" + cfg.id.replace(/^-100/, "") + "/" + m.id;
      }
      async function aggiorna() {
        if (!client || !entity || caricando) return;
        caricando = true;
        try {
          const msgs = await client.getMessages(entity, {limit: N_MSG});
          const sig = msgs.map(m => m.id + ":" + (m.editDate || 0)).join(",");
          if (sig !== firma) { firma = sig; disegna(msgs); }
          st("#tg-st3", "Aggiornato alle " + quando(Date.now() / 1000).split(" ")[1] + ". Si aggiorna da solo ogni " + POLL_MS / 1000 + " secondi.");
        } catch (e) {
          st("#tg-st3", "Non riesco a leggere i messaggi: " + (e && e.message || e), "err");
        } finally { caricando = false; }
      }
      function disegna(msgs) {
        const box = $("#tg-list");
        if (!msgs.length) { box.innerHTML = '<div class="vuoto">Nessun messaggio.</div>'; return; }
        box.innerHTML = msgs.map(m => {
          const foto = m.photo ? (fotoUrl[m.id] ? '<img src="' + fotoUrl[m.id] + '" alt="">' : '<button type="button" class="btn sm" data-foto="' + m.id + '">Mostra foto</button>') : "";
          const altro = (!m.photo && m.media) ? '<div class="msg-t" style="color:var(--text-dim)">📎 Allegato: aprilo in Telegram.</div>' : "";
          return '<div class="msg"><div class="msg-h"><span>' + quando(m.date) + (m.editDate ? " · modificato" : "") + '</span><a href="' + linkMsg(m) + '" target="_blank" rel="noopener">Apri in Telegram</a></div>' +
            (m.message ? '<div class="msg-t">' + linkify(m.message) + "</div>" : "") + foto + altro + "</div>";
        }).join("");
        box._msgs = msgs;
      }
      $("#tg-list").addEventListener("click", async e => {
        const b = e.target.closest("[data-foto]"); if (!b) return;
        const m = ($("#tg-list")._msgs || []).find(x => String(x.id) === b.dataset.foto);
        if (!m) return;
        b.disabled = true; b.textContent = "Scarico…";
        try {
          const buf = await client.downloadMedia(m, {});
          fotoUrl[m.id] = URL.createObjectURL(new Blob([buf], {type: "image/jpeg"}));
          firma = ""; aggiorna();
        } catch (err) { b.disabled = false; b.textContent = "Foto non scaricabile, riprova"; }
      });
      $("#tg-agg").addEventListener("click", () => { firma = ""; aggiorna(); });

      /* ---------- scollega ---------- */
      $("#tg-reset").addEventListener("click", async () => {
        if (!confirm("Scollegare Telegram e cancellare da questo telefono sessione, chiavi e canale scelto?")) return;
        fermaPoll();
        try { if (client) await client.invoke(new window.GramJS.Api.auth.LogOut()); } catch (e) { }   // chiude l’accesso su Telegram
        try { if (client) await client.disconnect(); } catch (e) { }
        try { localStorage.removeItem(K_SES); localStorage.removeItem(K_CFG); } catch (e) { }
        client = null; creds = null; pass = ""; entity = null; cfg = {}; firma = ""; fotoUrl = {};
        $("#tg-list").innerHTML = "";
        st("#tg-st1", "Scollegato. Per revocare del tutto l’accesso apri Telegram › Impostazioni › Dispositivi.", "ok");
        mostra("setup");
      });

      /* ---------- vita del modulo ---------- */
      FireOps.onShow("telegram", () => { visibile = true; if (client && entity) { aggiorna(); avviaPoll(); } });
      FireOps.onHide("telegram", () => { visibile = false; fermaPoll(); });
      visibile = true;

      if (jget(K_SES)) mostra("lock", "foot"); else mostra("setup");
    }
  });
})();
