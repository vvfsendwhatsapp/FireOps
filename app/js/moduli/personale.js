/* FireOps VVF - modulo Area personale
 * I dati dell'utente restano solo su questo telefono (localStorage, chiave "fireops_personale").
 * Gli altri moduli li leggono con FireOps.personale() (es. Comunicazioni precompila l'utente).
 */
(function () {
  "use strict";

  const KEY = "fireops_personale";

  // elenco delle qualifiche: condiviso con Comunicazioni, definito nella shell
  const QUALIFICHE = (window.FireOps && window.FireOps.qualifiche) || [];

  const CSS = `
.pg-personale { max-width: 640px; margin: 0 auto; padding: 14px 16px 40px; color: var(--text); }
.pg-personale .lead { margin: 0 0 14px; font-size: 13.5px; line-height: 1.5; color: var(--text-dim); }
.pg-personale .card { background: var(--panel); border: 1px solid var(--line); border-radius: 8px; padding: 14px; margin-bottom: 12px; }
.pg-personale h3 { margin: 0 0 10px; font-size: 14px; letter-spacing: .02em; text-transform: uppercase; color: var(--text-dim); }
.pg-personale .f { display: block; margin: 0 0 5px; font-size: 12.5px; color: var(--text-dim); }
.pg-personale .fld { margin-top: 14px; min-width: 0; }
.pg-personale h3 + .fld, .pg-personale h3 + .row { margin-top: 0; }
.pg-personale input, .pg-personale select {
  width: 100%; min-height: 46px; padding: 10px 12px; font-size: 16px; font-family: inherit;
  background: var(--bg); color: var(--text); border: 1px solid var(--line); border-radius: 6px;
}
.pg-personale input:focus, .pg-personale select:focus { outline: none; border-color: var(--yellow); }
.pg-personale .row { display: flex; gap: 10px; margin-top: 14px; }
.pg-personale .row > .fld { flex: 1; margin-top: 0; }
.pg-personale .btn {
  min-height: 46px; padding: 0 16px; border-radius: 6px; border: 1px solid var(--line);
  background: var(--panel-2); color: var(--text); font-size: 14.5px; font-weight: 700; cursor: pointer; font-family: inherit;
}
.pg-personale .btn.pri { background: var(--yellow); border-color: var(--yellow); color: #000; }
.pg-personale .btn.danger { color: #ff8a73; }
.pg-personale .acts { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 14px; }
.pg-personale .acts .btn { flex: 1 1 auto; }
.pg-personale .stato { min-height: 20px; margin-top: 10px; font-size: 13px; color: var(--text-dim); }
.pg-personale .stato.ok { color: #6bd68a; }
.pg-personale .nota { font-size: 12px; color: var(--text-dim); line-height: 1.45; margin-top: 8px; }
`;

  const HTML = `
<p class="lead">Inserisci i tuoi dati una volta sola: restano <b>solo su questo telefono</b>, non vengono inviati a nessuno.
Gli altri moduli li usano per precompilare i moduli (ad esempio Comunicazioni).</p>

<div class="card">
  <h3>Chi sei</h3>
  <div class="row">
    <div class="fld"><label class="f" for="pe-cognome">Cognome</label><input id="pe-cognome" data-k="cognome" autocomplete="off" autocapitalize="words"></div>
    <div class="fld"><label class="f" for="pe-nome">Nome</label><input id="pe-nome" data-k="nome" autocomplete="off" autocapitalize="words"></div>
  </div>
  <div class="fld"><label class="f" for="pe-qual">Qualifica</label>
    <select id="pe-qual" data-k="qualifica"><option value="">Scegli la qualifica…</option>${QUALIFICHE.map(g => '<optgroup label="' + g[0] + '">' + g[1].map(q => '<option value="' + q[0].replace(/"/g, "&quot;") + '">' + (q[1] === q[0] ? q[1] : q[1] + ' (' + q[0] + ')') + '</option>').join("") + "</optgroup>").join("")}</select></div>
  <div class="fld"><label class="f" for="pe-cf">Codice fiscale</label>
    <input id="pe-cf" data-k="cf" maxlength="16" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="16 caratteri"></div>
</div>

<div class="card">
  <h3>Contatti</h3>
  <div class="fld"><label class="f" for="pe-email">Email istituzionale</label>
    <input id="pe-email" data-k="email" type="email" inputmode="email" autocomplete="off" autocapitalize="none" placeholder="nome.cognome@vigilfuoco.it"></div>
  <div class="fld"><label class="f" for="pe-email2">Email personale (facoltativa)</label>
    <input id="pe-email2" data-k="emailPers" type="email" inputmode="email" autocomplete="off" autocapitalize="none" placeholder="nome@gmail.com"></div>
  <div class="fld"><label class="f" for="pe-tel">Cellulare</label>
    <input id="pe-tel" data-k="telefono" type="tel" inputmode="tel" autocomplete="off" placeholder="+39 333 1234567"></div>
</div>

<div class="card">
  <h3>Servizio</h3>
  <div class="fld"><label class="f" for="pe-cmd">Comando di appartenenza</label>
    <select id="pe-cmd" data-k="comando"><option value="">Caricamento comandi…</option></select></div>
  <div class="acts" style="margin-top:10px"><button type="button" class="btn" id="pe-pos">Usa il comando rilevato dalla posizione</button></div>
  <div class="row">
    <div class="fld"><label class="f" for="pe-tl">Turno</label>
      <select id="pe-tl" data-k="turnoL"><option value="">–</option><option>A</option><option>B</option><option>C</option><option>D</option><option>G</option></select></div>
    <div class="fld"><label class="f" for="pe-ts">Salto turno</label>
      <select id="pe-ts" data-k="turnoS"><option value="">–</option><option>1</option><option>2</option><option>3</option><option>4</option><option>5</option><option>6</option><option>7</option><option>8</option></select></div>
  </div>
  <div class="fld"><label class="f" for="pe-sede">Sede</label>
    <input id="pe-sede" data-k="sede" autocomplete="off" autocapitalize="characters" placeholder="es. CENTRALE"></div>
  <p class="nota">Con turno B e comando di Forlì-Cesena, in Comunicazioni compare l’elenco dei nominativi del turno. Negli altri casi i nominativi si scrivono a mano.</p>
</div>

<div class="acts">
  <button type="button" class="btn pri" id="pe-salva">Salva</button>
  <button type="button" class="btn danger" id="pe-canc">Cancella i miei dati</button>
</div>
<div class="stato" id="pe-stato" role="status"></div>
`;

  FireOps.registra({
    id: "personale", css: CSS, html: HTML,
    async init(root) {
      const $ = s => root.querySelector(s);
      const campi = Array.from(root.querySelectorAll("[data-k]"));
      const leggi = () => { try { return JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch (e) { return {}; } };
      const stato = (t, ok) => { const el = $("#pe-stato"); el.textContent = t || ""; el.classList.toggle("ok", !!ok); };

      let elenco = [];
      try { elenco = await FireOps.comandi(); } catch (e) { /* senza rete resta il campo vuoto */ }
      const sel = $("#pe-cmd");
      sel.innerHTML = '<option value="">' + (elenco.length ? "Scegli il comando…" : "Elenco comandi non disponibile") + "</option>" +
        elenco.slice().sort((a, b) => a.c.localeCompare(b.c, "it")).map(c => {
          const t = c.c.replace(/"/g, "&quot;");
          return '<option value="' + t + '">' + c.c + (c.pr ? " (" + c.pr + ")" : "") + "</option>";
        }).join("");

      const compila = d => campi.forEach(el => {
        const v = d[el.dataset.k] || "";
        if (el.tagName === "SELECT" && v && !Array.from(el.options).some(o => o.value === v)) el.appendChild(new Option(v, v));
        el.value = v;
      });
      const raccogli = () => {
        const d = {};
        campi.forEach(el => { d[el.dataset.k] = el.value.trim(); });
        d.cf = (d.cf || "").toUpperCase();
        return d;
      };
      const salva = msg => {
        const d = raccogli();
        if (d.cf && !/^[A-Z0-9]{16}$/.test(d.cf)) { stato("Il codice fiscale deve avere 16 caratteri.", false); return false; }
        try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) { stato("Impossibile salvare: il browser blocca la memoria locale.", false); return false; }
        stato(msg || "Salvato su questo telefono.", true);
        return true;
      };

      compila(leggi());

      // salvataggio automatico a ogni modifica
      root.addEventListener("change", e => { if (e.target.dataset && e.target.dataset.k) salva("Salvato."); });
      $("#pe-salva").addEventListener("click", () => salva());

      $("#pe-pos").addEventListener("click", async () => {
        stato("Rilevo la posizione…");
        const p = await FireOps.localizza();
        const pos = p || FireOps.posizione();
        if (pos && pos.comando) { sel.value = pos.comando.c; salva("Comando impostato: " + pos.comando.c); }
        else stato("Posizione non disponibile: scegli il comando dall’elenco.", false);
      });

      $("#pe-canc").addEventListener("click", () => {
        if (!confirm("Cancellare tutti i dati personali salvati su questo telefono?")) return;
        try { localStorage.removeItem(KEY); } catch (e) { }
        compila({});
        stato("Dati cancellati.", true);
      });
    }
  });
})();
