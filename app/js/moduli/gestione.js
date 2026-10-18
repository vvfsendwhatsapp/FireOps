/* FireOps VVF - modulo "Gestione ricerca" (funzione Operazioni) - tappa 1: personale e squadre.
 * Tutto resta su questo telefono (localStorage "fireops_gestione") e funziona senza rete.
 * Per passare i dati a un altro telefono: Esporta / Importa (file JSON). La sincronizzazione arriva dopo.
 * Prossime tappe: mappa offline con waypoint e tracce, zonizzazione automatica, esportazione KMZ.
 */
FireOps.registra({
  id: "gestione",

  css: `
.pg-gestione { max-width: 640px; margin: 0 auto; padding: 14px 16px 40px; color: var(--text); }
.pg-gestione .tabs { display: flex; gap: 6px; margin-bottom: 12px; }
.pg-gestione .tab { flex: 1; min-height: 44px; border-radius: 6px; border: 1px solid var(--line); background: var(--panel); color: var(--text-dim);
  font-size: 14px; font-weight: 700; font-family: inherit; cursor: pointer; }
.pg-gestione .tab.on { background: var(--yellow); border-color: var(--yellow); color: #000; }
.pg-gestione .card { background: var(--panel); border: 1px solid var(--line); border-radius: 8px; padding: 12px 14px; margin-bottom: 10px; }
.pg-gestione h3 { margin: 0 0 10px; font-size: 14px; letter-spacing: .02em; text-transform: uppercase; color: var(--text-dim); }
.pg-gestione .lead { margin: 0 0 12px; font-size: 13.5px; line-height: 1.5; color: var(--text-dim); }
.pg-gestione .f { display: block; margin: 12px 0 5px; font-size: 12.5px; color: var(--text-dim); }
.pg-gestione input[type=text], .pg-gestione input[type=tel], .pg-gestione input[type=date], .pg-gestione select, .pg-gestione textarea {
  width: 100%; min-height: 46px; padding: 10px 12px; font-size: 16px; font-family: inherit; box-sizing: border-box;
  background: var(--bg); color: var(--text); border: 1px solid var(--line); border-radius: 6px; }
.pg-gestione textarea { min-height: 70px; resize: vertical; }
.pg-gestione input:focus, .pg-gestione select:focus, .pg-gestione textarea:focus { outline: none; border-color: var(--yellow); }
.pg-gestione .row { display: flex; gap: 10px; }
.pg-gestione .row > * { flex: 1; min-width: 0; }
.pg-gestione .btn { min-height: 44px; padding: 0 14px; border-radius: 6px; border: 1px solid var(--line); background: var(--panel-2);
  color: var(--text); font-size: 14px; font-weight: 700; cursor: pointer; font-family: inherit; }
.pg-gestione .btn.pri { background: var(--yellow); border-color: var(--yellow); color: #000; }
.pg-gestione .btn.danger { color: #ff8a73; }
.pg-gestione .btn.sm { min-height: 36px; padding: 0 12px; font-size: 13px; }
.pg-gestione .acts { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 12px; }
.pg-gestione .acts .btn { flex: 1 1 auto; }
.pg-gestione .it { display: flex; align-items: center; gap: 10px; padding: 10px 0; border-top: 1px solid var(--line); }
.pg-gestione .it:first-of-type { border-top: 0; }
.pg-gestione .it .tx { flex: 1; min-width: 0; font-size: 14.5px; line-height: 1.35; }
.pg-gestione .it .tx small { display: block; color: var(--text-dim); font-size: 12.5px; }
.pg-gestione .chip { display: inline-block; padding: 1px 8px; margin: 3px 4px 0 0; border-radius: 10px; font-size: 11.5px; font-weight: 700;
  background: var(--panel-2); border: 1px solid var(--line); color: var(--text-dim); }
.pg-gestione .chip.t-ordinaria { border-color: #5b8def; color: #8fb2ff; }
.pg-gestione .chip.t-cinofila { border-color: #e0a030; color: #f0c060; }
.pg-gestione .chip.t-smzt { border-color: #3fb68b; color: #6fd8b0; }
.pg-gestione .chip.t-drone, .pg-gestione .chip.t-elicottero { border-color: #a07be0; color: #c4a8ff; }
.pg-gestione .chip.t-saf { border-color: #d8262f; color: #ff8a73; }
.pg-gestione .sqh { display: flex; align-items: center; gap: 8px; }
.pg-gestione .sqh b { flex: 1; font-size: 15.5px; }
.pg-gestione .chk { display: flex; align-items: center; gap: 10px; min-height: 40px; font-size: 14.5px; }
.pg-gestione .chk input { width: 20px; height: 20px; flex: none; accent-color: var(--yellow); }
.pg-gestione .vuoto { padding: 16px 4px; text-align: center; color: var(--text-dim); font-size: 13.5px; }
.pg-gestione .stato { min-height: 20px; margin-top: 8px; font-size: 13px; color: var(--text-dim); }
.pg-gestione .stato.ok { color: #6bd68a; }
.pg-gestione .nota { font-size: 12px; color: var(--text-dim); line-height: 1.45; margin-top: 8px; }
.pg-gestione .num { display: flex; gap: 8px; margin-bottom: 10px; }
.pg-gestione .num div { flex: 1; text-align: center; padding: 8px 4px; background: var(--panel); border: 1px solid var(--line); border-radius: 8px; }
.pg-gestione .num b { display: block; font-size: 20px; }
.pg-gestione .num span { font-size: 11.5px; color: var(--text-dim); }
`,

  html: `
<div class="tabs">
  <button type="button" class="tab on" data-tab="pers">Personale</button>
  <button type="button" class="tab" data-tab="sq">Squadre</button>
  <button type="button" class="tab" data-tab="op">Operazione</button>
</div>
<div id="ge-corpo"></div>
<div class="stato" id="ge-stato" role="status"></div>
`,

  init(root) {
    "use strict";
    const KEY = "fireops_gestione";
    const SPEC = [["cinofilo", "Cinofilo"], ["smzt", "SMZT (sommozzatori)"], ["saf", "SAF"]];
    // livelli (tipo di mezzo/squadra) e enti: la ricerca e' multi agenzia, sotto il coordinamento dei VVF
    const TIPI = [["drone", "Drone APR"], ["elicottero", "Elicottero"], ["cinofila", "K9 cinofili"], ["ordinaria", "Squadra a terra"], ["saf", "SAF (aree impervie)"], ["smzt", "SMZT (sommozzatori)"]];
    // CNSAS in fondo, subito prima di "Altro volontariato" (stesso ordine in app/registrazione.html)
    const ENTI = ["VVF", "CRI", "Protezione Civile", "Carabinieri", "Carabinieri Forestali", "Guardia di Finanza", "Polizia di Stato", "Polizia Locale", "CNSAS", "Altro volontariato", "Altro"];
    // Registrazione dal telefono di ognuno (app/registrazione.html): passa dal foglio "DB_Registrazioni"
    // della Web App di Apps Script (apps-script/registrazioni.gs)
    const WEBAPP = "https://script.google.com/macros/s/AKfycbyp6jQ331Yk5q7_hkM74ZyhUh1c3zQUJG7SpuoE18HslBO36YKSTYIQf-z7gSwXR4Yv/exec";
    let timerReg = null;
    // per gli enti diversi dai VVF non si usano le qualifiche: un solo campo libero (con suggerimenti)
    const RUOLI = ["Volontario", "Volontario SAS"];   // suggerimenti: il campo resta libero
    const STATI = ["Disponibile", "In movimento", "In zona", "Rientrata"];
    const QUALIFICHE = FireOps.qualifiche || [];

    const $ = s => root.querySelector(s);
    const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;"}[c]));
    const nuovoId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const nomeTipo = t => (TIPI.find(x => x[0] === t) || [, t])[1];

    const vuoto = () => ({v: 1, op: {nome: "", data: new Date().toISOString().slice(0, 10), pua: null, note: ""}, pers: [], sq: []});
    let db;
    try { db = JSON.parse(localStorage.getItem(KEY) || "null") || vuoto(); } catch (e) { db = vuoto(); }
    if (!db.pers) db.pers = []; if (!db.sq) db.sq = []; if (!db.op) db.op = vuoto().op;

    let tab = "pers";      // scheda aperta
    let modifica = null;   // {tipo:"pers"|"sq", id|null}: modulo aperto

    const stato = (t, ok) => { const el = $("#ge-stato"); el.textContent = t || ""; el.classList.toggle("ok", !!ok); };
    const salva = () => {
      try { localStorage.setItem(KEY, JSON.stringify(db)); return true; }
      catch (e) { stato("Impossibile salvare: il browser blocca la memoria locale.", false); return false; }
    };

    const pers = id => db.pers.find(p => p.id === id);
    const sqDi = pid => db.sq.find(s => s.capo === pid || (s.membri || []).includes(pid));
    const nomeP = p => ((p.qual ? p.qual + " " : "") + (p.cognome + " " + (p.nome || "")).trim()).trim();

    function chipSpec(p) {
      return (p.spec || []).map(k => '<span class="chip">' + esc((SPEC.find(x => x[0] === k) || [, k])[1]) + "</span>").join("");
    }

    /* ---------------- Personale ---------------- */
    function vistaPers() {
      if (modifica && modifica.tipo === "pers") return formPers();
      if (modifica && modifica.tipo === "reg") return vistaReg();
      const liberi = db.pers.filter(p => p.presente !== false && !sqDi(p.id)).length;
      const pres = db.pers.filter(p => p.presente !== false).length;
      let h = '<div class="num"><div><b>' + pres + "</b><span>presenti</span></div><div><b>" + (pres - liberi) +
        "</b><span>in squadra</span></div><div><b>" + liberi + "</b><span>liberi</span></div></div>";
      h += '<div class="card">';
      if (!db.pers.length) h += '<div class="vuoto">Nessuna persona inserita.</div>';
      db.pers.slice().sort((a, b) => a.cognome.localeCompare(b.cognome, "it")).forEach(p => {
        const s = sqDi(p.id);
        h += '<div class="it"><div class="tx"><b' + (p.presente === false ? ' style="opacity:.5"' : "") + ">" + esc(nomeP(p)) + "</b>" +
          '<small>' + (p.ente && p.ente !== "VVF" ? esc(p.ente) + (p.ruolo ? " (" + esc(p.ruolo) + ")" : "") + " · " : "") + (p.presente === false ? "Non presente" : s ? "Squadra: " + esc(s.nome) : "Libero") +
          (p.tel ? " · " + esc(p.tel) : "") + "</small>" + (p.reg ? '<span class="chip" title="Registrato dal proprio telefono con il QR">📱 registrato</span>' : "") + chipSpec(p) + "</div>" +
          '<button type="button" class="btn sm" data-a="mod-p" data-id="' + p.id + '">Modifica</button></div>';
      });
      h += "</div>";
      h += '<div class="acts"><button type="button" class="btn pri" data-a="nuovo-p">+ Aggiungi persona</button>' +
        '<button type="button" class="btn" data-a="io">Aggiungi me</button></div>';
      h += '<div class="acts" style="margin-top:8px"><button type="button" class="btn" data-a="reg">📱 QR per la registrazione del personale</button></div>';
      h += '<p class="nota">“Aggiungi me” usa i dati dell’Area personale. Con il QR ognuno si registra dal proprio telefono e compare qui.</p>';
      return h;
    }

    function formPers() {
      const p = modifica.id ? pers(modifica.id) : {cognome: "", nome: "", qual: "", tel: "", spec: [], presente: true, note: "", ente: "VVF"};
      const q = '<option value="">–</option>' + QUALIFICHE.map(g => '<optgroup label="' + esc(g[0]) + '">' +
        g[1].map(x => '<option value="' + esc(x[0]) + '"' + (p.qual === x[0] ? " selected" : "") + ">" + esc(x[1] === x[0] ? x[1] : x[1] + " (" + x[0] + ")") + "</option>").join("") + "</optgroup>").join("");
      const ente = p.ente || "VVF";
      return '<div class="card"><h3>' + (modifica.id ? "Modifica persona" : "Nuova persona") + "</h3>" +
        '<label class="f" for="gp-ente" style="margin-top:0">Ente</label><select id="gp-ente">' + ENTI.map(x => "<option" + (ente === x ? " selected" : "") + ">" + x + "</option>").join("") + '</select>' +
        '<div class="row" style="margin-top:12px"><div><label class="f" for="gp-cog" style="margin-top:0">Cognome</label><input type="text" id="gp-cog" autocapitalize="words" autocomplete="off" value="' + esc(p.cognome) + '"></div>' +
        '<div><label class="f" for="gp-nom" style="margin-top:0">Nome</label><input type="text" id="gp-nom" autocapitalize="words" autocomplete="off" value="' + esc(p.nome) + '"></div></div>' +
        // Qualifica solo per i VVF; per gli altri enti si distingue soltanto il tipo di volontario
        '<div id="gp-bq"' + (ente === "VVF" ? "" : " hidden") + '><label class="f" for="gp-qual">Qualifica</label><select id="gp-qual">' + q + "</select></div>" +
        '<div id="gp-br"' + (ente === "VVF" ? " hidden" : "") + '><label class="f" for="gp-ruolo">Ruolo (facoltativo, a mano)</label><input type="text" id="gp-ruolo" list="gp-ruoli" autocomplete="off" placeholder="es. Volontario" value="' + esc(p.ruolo || "") + '">' +
        '<datalist id="gp-ruoli">' + RUOLI.map(x => '<option value="' + x + '">').join("") + "</datalist></div>" +
        '<label class="f" for="gp-tel">Cellulare</label><input type="tel" id="gp-tel" inputmode="tel" autocomplete="off" value="' + esc(p.tel) + '">' +
        '<label class="f">Specialità</label>' + SPEC.map(s => '<label class="chk"><input type="checkbox" data-spec="' + s[0] + '"' + ((p.spec || []).includes(s[0]) ? " checked" : "") + ">" + s[1] + "</label>").join("") +
        '<label class="chk" style="margin-top:6px"><input type="checkbox" id="gp-pres"' + (p.presente !== false ? " checked" : "") + ">Presente</label>" +
        '<label class="f" for="gp-note">Note</label><textarea id="gp-note">' + esc(p.note) + "</textarea>" +
        '<div class="acts"><button type="button" class="btn pri" data-a="salva-p">Salva</button><button type="button" class="btn" data-a="annulla">Annulla</button>' +
        (modifica.id ? '<button type="button" class="btn danger" data-a="del-p">Elimina</button>' : "") + "</div></div>";
    }

    function leggiPers() {
      const cog = $("#gp-cog").value.trim();
      if (!cog) { stato("Scrivi almeno il cognome.", false); return; }
      const d = {
        cognome: cog, nome: $("#gp-nom").value.trim(), ente: $("#gp-ente").value, qual: $("#gp-ente").value === "VVF" ? $("#gp-qual").value : "", ruolo: $("#gp-ente").value === "VVF" ? "" : $("#gp-ruolo").value.trim(), tel: $("#gp-tel").value.trim(),
        spec: Array.from(root.querySelectorAll("[data-spec]:checked")).map(e => e.dataset.spec),
        presente: $("#gp-pres").checked, note: $("#gp-note").value.trim()
      };
      if (modifica.id) Object.assign(pers(modifica.id), d);
      else db.pers.push(Object.assign({id: nuovoId()}, d));
      if (!d.presente) db.sq.forEach(s => { s.membri = (s.membri || []).filter(x => x !== modifica.id); if (s.capo === modifica.id) s.capo = ""; });
      salva(); modifica = null; stato("Salvato su questo telefono.", true); disegna();
    }

    function aggiungiMe() {
      const me = (FireOps.personale && FireOps.personale()) || {};
      if (!me.cognome) { stato("Compila prima l’Area personale.", false); return; }
      const gia = db.pers.find(p => p.cognome.toLowerCase() === me.cognome.toLowerCase() && (p.nome || "").toLowerCase() === (me.nome || "").toLowerCase());
      if (gia) { stato("Sei già nell’elenco.", false); return; }
      db.pers.push({id: nuovoId(), cognome: me.cognome, nome: me.nome || "", qual: me.qualifica || "", tel: me.telefono || "", spec: [], presente: true, note: ""});
      salva(); stato("Aggiunto: " + me.cognome + ".", true); disegna();
    }

    /* ---------------- ID ricerca (ricerca aperta su tutti i telefoni) ----------------
     * Stesso formato dell'ID di Messaggistica: numero intervento a 8 cifre _ anno _ sigla Comando
     * (es. 00000456_2026_ComFC). Non e' detto che sia lo stesso intervento: lo sceglie il coordinatore.
     * "Apri" la registra nel foglio DB_Ricerche_Gestione con una chiave segreta (solo su questo telefono
     * e nei file esportati): con la chiave si leggono i registrati e si chiude la ricerca. */
    const siglaDi = c => c && c.pr ? "Com" + c.pr : "";
    function comandoAttuale() { const p = FireOps.posizione && FireOps.posizione(); return p && p.comando ? p.comando : null; }
    function idRicerca(numero, anno, sigla) {
      const n = String(numero || "").replace(/\D/g, "").padStart(8, "0").slice(-8);
      return n + "_" + anno + "_" + sigla;
    }
    function nuovaChiave() {
      const a = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789", r = new Uint32Array(20);
      crypto.getRandomValues(r);
      return Array.from(r, x => a[x % a.length]).join("");
    }
    async function postRicerca(azione) {
      const o = db.op;
      const r = await fetch(WEBAPP, {method: "POST", headers: {"Content-Type": "text/plain;charset=utf-8"},
        body: JSON.stringify({foglio: "DB_Ricerche_Gestione", azione, id: o.id, chiave: o.chiave, nome: o.nome, sigla: o.sigla, comando: o.comando})});
      const j = await r.json();
      if (!j || !j.ok) throw new Error((j && j.errore) || "risposta");
      return j;
    }
    async function ricercheAperte(sigla) {
      const r = await fetch(WEBAPP + "?" + new URLSearchParams({ricercheAperte: sigla || ""}));
      const j = await r.json();
      if (!j || !Array.isArray(j.ricerche)) throw new Error("risposta");
      return j.ricerche;
    }

    function cardIdRicerca() {
      const o = db.op;
      if (o.aperta) {
        return '<div class="card" style="border-left:3px solid var(--yellow)"><h3>ID ricerca · aperta</h3>' +
          '<div style="font:700 19px/1.3 ui-monospace,Menlo,monospace;letter-spacing:.02em;word-break:break-all">' + esc(o.id) + "</div>" +
          '<div class="nota" style="margin-top:4px">' + esc(o.comando || o.sigla) + " · il personale si registra con il QR (scheda Personale)</div>" +
          '<div class="acts"><button type="button" class="btn" data-a="ric-qr">📱 QR registrazione</button><button type="button" class="btn danger" data-a="ric-chiudi">Chiudi la ricerca</button></div>' +
          '<div class="stato" id="go-ric-stato"></div><div id="go-aperte"></div></div>';
      }
      const c = comandoAttuale();
      const anno = o.anno || String(new Date().getFullYear());
      const sigla = o.sigla || siglaDi(c);
      const anteprima = o.numero && sigla ? idRicerca(o.numero, anno, sigla) : "";
      return '<div class="card"><h3>ID ricerca</h3>' +
        '<p class="lead">Apri la ricerca per far registrare il personale con il QR. Formato come Messaggistica: numero intervento, anno, Comando' +
        " (il numero può essere diverso da quello del messaggio).</p>" +
        '<div class="row"><div><label class="f" for="go-num" style="margin-top:0">Numero intervento</label><input type="text" id="go-num" inputmode="numeric" autocomplete="off" placeholder="es. 456" value="' + esc(o.numero || "") + '"></div>' +
        '<div><label class="f" for="go-anno" style="margin-top:0">Anno</label><input type="text" id="go-anno" inputmode="numeric" autocomplete="off" value="' + esc(anno) + '"></div></div>' +
        '<label class="f">Comando</label><div class="nota" style="margin:0">' + (sigla ? esc((o.comando || (c && c.c) || "") + " (" + sigla + ")") : "In attesa del Comando: localizzati o sceglilo dal menu in alto.") + "</div>" +
        (anteprima ? '<div style="margin-top:10px;font:700 17px ui-monospace,Menlo,monospace">' + esc(anteprima) + "</div>" : "") +
        '<div class="acts"><button type="button" class="btn pri" data-a="ric-apri"' + (sigla ? "" : " disabled") + ">Apri la ricerca</button></div>" +
        '<div class="stato" id="go-ric-stato"></div><div id="go-aperte"></div></div>';
    }

    // Altre ricerche aperte dello stesso Comando (solo per vederle: si gestiscono dal telefono che le ha aperte)
    async function mostraAperte() {
      const box = $("#go-aperte"), sigla = db.op.sigla || siglaDi(comandoAttuale());
      if (!box || !sigla) return;
      try {
        const l = (await ricercheAperte(sigla)).filter(r => r.id !== db.op.id);
        if (!$("#go-aperte")) return;
        box.innerHTML = l.length ? '<label class="f">Altre ricerche aperte del Comando</label>' + l.map(r => '<div class="nota" style="margin-top:4px"><b>' + esc(r.id) + "</b>" +
          (r.nome ? " · " + esc(r.nome) : "") + "</div>").join("") : "";
      } catch (e) { }
    }

    async function apriRicerca() {
      const o = db.op, c = comandoAttuale();
      const numero = $("#go-num").value.replace(/\D/g, ""), anno = $("#go-anno").value.replace(/\D/g, "");
      if (!numero) return stato("Scrivi il numero intervento.", false);
      if (!/^\d{4}$/.test(anno)) return stato("Anno non valido.", false);
      if (!o.sigla) { if (!c) return stato("Serve il Comando: localizzati o sceglilo dal menu in alto.", false); o.sigla = siglaDi(c); o.comando = c.c; }
      o.numero = numero; o.anno = anno; o.id = idRicerca(numero, anno, o.sigla);
      if (!o.chiave) o.chiave = nuovaChiave();
      salva();
      const st = $("#go-ric-stato"); if (st) st.textContent = "Apro la ricerca…";
      try {
        await postRicerca("apri");
        o.aperta = true; salva(); disegna(); stato("Ricerca " + o.id + " aperta: ora il personale può registrarsi.", true);
      } catch (e) {
        const msg = /usato/.test(e.message) ? "Questo ID è già usato da un’altra ricerca aperta da un altro telefono: cambia il numero." :
          "Impossibile aprire la ricerca: serve la connessione e lo script Apps Script aggiornato (apps-script/registrazioni.gs).";
        if (/usato/.test(e.message)) { o.chiave = ""; salva(); }
        if (st) st.textContent = msg; else stato(msg, false);
      }
    }

    async function chiudiRicerca(silenziosa) {
      if (!db.op.aperta) return true;
      if (!silenziosa && !confirm("Chiudere la ricerca " + db.op.id + "? Nessuno potrà più registrarsi. Personale e squadre restano su questo telefono.")) return false;
      try { await postRicerca("chiudi"); }
      catch (e) { if (!confirm("Non riesco a chiuderla sul foglio (rete?). Chiuderla solo su questo telefono? Resterà nell’elenco delle ricerche aperte.")) return false; }
      db.op.aperta = false; salva();
      return true;
    }

    /* ---------------- Registrazione con QR ---------------- */
    let tipoQR = "ricerca";   // "ricerca" (questa ricerca) | "comando" (QR fisso: sceglie fra le ricerche aperte)
    function linkReg() {
      const u = new URL("registrazione.html", location.href);
      u.search = ""; u.hash = "";
      if (tipoQR === "comando") { u.searchParams.set("c", db.op.sigla); return u.toString(); }
      u.searchParams.set("r", db.op.id);
      const tel = (db.op.telReg || "").replace(/[^\d+]/g, "");
      if (tel) u.searchParams.set("t", tel);
      return u.toString();
    }

    function vistaReg() {
      if (!db.op.aperta) {
        return '<div class="card"><h3>Registrazione del personale</h3><p class="lead">Prima apri la ricerca con il suo ID (scheda Operazione): il QR porta a quella ricerca.</p>' +
          '<div class="acts"><button type="button" class="btn pri" data-tab="op">Vai a Operazione</button><button type="button" class="btn" data-a="annulla">Chiudi</button></div></div>';
      }
      if (db.op.telReg == null) db.op.telReg = ((FireOps.personale && FireOps.personale()) || {}).telefono || "";
      const link = linkReg();
      const n = db.pers.filter(p => p.reg).length;
      const tabQR = (k, t) => '<button type="button" class="tab' + (tipoQR === k ? " on" : "") + '" data-a="qr-tipo" data-k="' + k + '" style="min-height:38px;font-size:13px">' + t + "</button>";
      return '<div class="card"><h3>Registrazione del personale</h3>' +
        '<div class="tabs" style="margin-bottom:8px">' + tabQR("ricerca", "QR di questa ricerca") + tabQR("comando", "QR fisso del Comando") + "</div>" +
        '<p class="lead">' + (tipoQR === "comando"
          ? "QR da stampare e tenere sul mezzo o in UCL: vale sempre. Chi lo inquadra vede le ricerche aperte del Comando di " + esc(db.op.comando || db.op.sigla) + " e sceglie la sua."
          : "Porta direttamente alla ricerca <b>" + esc(db.op.id) + "</b>" + (db.op.nome ? " (" + esc(db.op.nome) + ")" : "") + ". Vale finché la ricerca resta aperta.") + "</p>" +
        '<div style="text-align:center;background:#fff;border-radius:8px;padding:14px;margin:4px 0 10px"><canvas id="gr-qr" style="width:100%;max-width:300px;image-rendering:pixelated" aria-label="QR code per la registrazione"></canvas></div>' +
        '<div class="nota" style="word-break:break-all;margin-top:0">' + esc(link) + "</div>" +
        '<div class="acts"><button type="button" class="btn pri" data-a="reg-condividi">Condividi il link</button><button type="button" class="btn" data-a="reg-scarica">Scarica i registrati</button></div>' +
        '<div class="stato" id="gr-stato">' + (n ? n + (n === 1 ? " persona registrata" : " persone registrate") + " nell’elenco." : "") + "</div>" +
        '<label class="f" for="gr-tel">Cellulare per le registrazioni senza rete (SMS / WhatsApp)</label>' +
        '<input type="tel" id="gr-tel" inputmode="tel" autocomplete="off" placeholder="il tuo numero" value="' + esc(db.op.telReg) + '">' +
        '<p class="nota">Se a chi si registra manca la connessione dati, la pagina gli propone di mandarti la registrazione con un messaggio: incollalo qui sotto. Il numero è nel QR di questa ricerca, non in quello fisso.</p>' +
        '<label class="f" for="gr-incolla">Incolla registrazioni ricevute per messaggio</label>' +
        '<textarea id="gr-incolla" placeholder="Incolla uno o più messaggi “Registrazione ricerca …”"></textarea>' +
        '<div class="acts"><button type="button" class="btn" data-a="reg-incolla">Aggiungi dai messaggi</button><button type="button" class="btn" data-a="annulla">Chiudi</button></div></div>';
    }

    async function disegnaQR() {
      const cv = $("#gr-qr");
      if (!cv) return;
      try {
        if (!window.FireOpsQR) await FireOps.carica("../qrcode.js?v=" + (window.FIREOPS_VERSIONE || ""));
        const qr = FireOpsQR.genera(linkReg(), "M"), n = qr.dimensione, bordo = 2, scala = 8;
        cv.width = cv.height = (n + bordo * 2) * scala;
        const c = cv.getContext("2d");
        c.fillStyle = "#fff"; c.fillRect(0, 0, cv.width, cv.height); c.fillStyle = "#000";
        for (let r = 0; r < n; r++) for (let k = 0; k < n; k++) if (qr.moduli[r][k]) c.fillRect((k + bordo) * scala, (r + bordo) * scala, scala, scala);
      } catch (e) {
        cv.replaceWith(Object.assign(document.createElement("div"), {textContent: "QR non disponibile: condividi il link.", style: "color:#000;padding:20px"}));
      }
    }

    // Unisce le persone registrate all'elenco: la stessa persona (stesso id di registrazione,
    // o stesso cognome e nome inserito a mano) si aggiorna, non si duplica
    function unisciRegistrati(lista) {
      let nuovi = 0, aggiornati = 0;
      lista.forEach(r => {
        if (!r || !r.id || !r.cognome) return;
        const d = {cognome: r.cognome, nome: r.nome || "", ente: ENTI.includes(r.ente) ? r.ente : (r.ente ? "Altro" : "VVF"),
          qual: r.ente === "VVF" ? (r.qual || "") : "", ruolo: r.ente === "VVF" ? "" : (r.ruolo || (ENTI.includes(r.ente) ? "" : r.ente || "")),
          tel: r.tel || "", spec: (Array.isArray(r.spec) ? r.spec : []).filter(k => SPEC.some(x => x[0] === k))};
        const chiave = p => (p.cognome + "|" + (p.nome || "")).toLowerCase().replace(/\s+/g, " ").trim();
        let p = db.pers.find(x => x.reg === r.id) || db.pers.find(x => !x.reg && chiave(x) === chiave(d));
        if (p) {
          const prima = JSON.stringify([p.cognome, p.nome, p.ente, p.qual, p.ruolo, p.tel, p.spec]);
          Object.assign(p, d, {reg: r.id});
          if (r.note && !(p.note || "").includes(r.note)) p.note = (p.note ? p.note + " · " : "") + r.note;
          if (JSON.stringify([p.cognome, p.nome, p.ente, p.qual, p.ruolo, p.tel, p.spec]) !== prima) aggiornati++;
        } else {
          db.pers.push(Object.assign({id: nuovoId(), reg: r.id, presente: true, note: r.note || ""}, d));
          nuovi++;
        }
      });
      if (nuovi || aggiornati) salva();
      return {nuovi, aggiornati};
    }

    async function scaricaRegistrati(silenzioso) {
      const st = $("#gr-stato");
      if (st && !silenzioso) st.textContent = "Scarico i registrati…";
      try {
        if (!db.op.id || !db.op.chiave) throw new Error("ricerca non aperta");
        const r = await fetch(WEBAPP + "?" + new URLSearchParams({registrazioni: db.op.id, chiave: db.op.chiave}));
        const j = r.ok ? await r.json() : null;
        if (j && j.errore === "chiave non valida") { if (st && !silenzioso) st.textContent = "Il foglio non riconosce questa ricerca da questo telefono (chiave diversa)."; return; }
        if (!j || !Array.isArray(j.persone)) throw new Error("risposta");
        const {nuovi, aggiornati} = unisciRegistrati(j.persone);
        const msg = j.persone.length + (j.persone.length === 1 ? " registrata" : " registrate") +
          (nuovi ? " · " + nuovi + (nuovi === 1 ? " nuova aggiunta" : " nuove aggiunte") + " al Personale" : "") +
          (aggiornati ? " · " + aggiornati + " aggiornate" : "") + (nuovi || aggiornati ? "" : " · nessuna novità");
        if (st && (!silenzioso || nuovi || aggiornati)) { st.textContent = msg + " (" + new Date().toLocaleTimeString("it-IT", {hour: "2-digit", minute: "2-digit"}) + ")"; st.classList.toggle("ok", !!(nuovi || aggiornati)); }
      } catch (e) {
        if (st && !silenzioso) { st.textContent = "Registrati non disponibili: serve la connessione e lo script Apps Script aggiornato (apps-script/registrazioni.gs)."; st.classList.remove("ok"); }
      }
    }

    function incollaRegistrazioni() {
      const testo = $("#gr-incolla").value, lista = [];
      (testo.match(/FOREG1\s+[A-Za-z0-9_-]+/g) || []).forEach(m => {
        try {
          const b = m.split(/\s+/)[1].replace(/-/g, "+").replace(/_/g, "/");
          const o = JSON.parse(decodeURIComponent(escape(atob(b + "===".slice((b.length + 3) % 4)))));
          if (o.r && o.r !== db.op.id && !confirm("La registrazione di " + o.c + " è di un’altra ricerca. Aggiungerla comunque?")) return;
          lista.push({id: o.i, ente: o.e, cognome: o.c, nome: o.n, qual: o.q, ruolo: o.u, tel: o.t, spec: o.s, note: o.o});
        } catch (e) { }
      });
      if (!lista.length) { stato("Nessuna registrazione riconosciuta nel testo incollato.", false); return; }
      const {nuovi, aggiornati} = unisciRegistrati(lista);
      $("#gr-incolla").value = "";
      stato(lista.length + (lista.length === 1 ? " registrazione letta" : " registrazioni lette") + ": " + nuovi + " nuove, " + aggiornati + " aggiornate.", true);
    }

    /* ---------------- Squadre ---------------- */
    function vistaSq() {
      if (modifica && modifica.tipo === "sq") return formSq();
      let h = "";
      if (!db.sq.length) h += '<div class="card"><div class="vuoto">Nessuna squadra. ' + (db.pers.length ? "Creane una." : "Inserisci prima il personale.") + "</div></div>";
      const ord = t => TIPI.findIndex(x => x[0] === t);
      let ultimo = "";
      db.sq.slice().sort((x, y) => ord(x.tipo) - ord(y.tipo)).forEach(s => {
        if (s.tipo !== ultimo) { ultimo = s.tipo; h += '<h3 style="margin:14px 2px 8px">' + esc(nomeTipo(s.tipo)) + " (" + db.sq.filter(z => z.tipo === s.tipo).length + ")</h3>"; }
        const capo = pers(s.capo);
        const mem = (s.membri || []).map(pers).filter(Boolean);
        h += '<div class="card"><div class="sqh"><b>' + esc(s.nome) + '</b><span class="chip t-' + s.tipo + '">' + esc(nomeTipo(s.tipo)) + "</span>" + (s.ente ? '<span class="chip">' + esc(s.ente) + "</span>" : "") +
          '<button type="button" class="btn sm" data-a="mod-s" data-id="' + s.id + '">Modifica</button></div>' +
          '<div class="tx" style="margin-top:6px;font-size:14px;line-height:1.5">' +
          (capo ? "Capo: <b>" + esc(nomeP(capo)) + "</b>" + (capo.tel ? " · " + esc(capo.tel) : "") + "<br>" : "") +
          (mem.length ? mem.map(m => esc(nomeP(m))).join(", ") : '<span style="color:var(--text-dim)">Nessun componente</span>') + "</div>" +
          '<div class="row" style="margin-top:10px"><select data-a="stato-s" data-id="' + s.id + '" aria-label="Stato squadra">' +
          STATI.map(x => "<option" + (s.stato === x ? " selected" : "") + ">" + x + "</option>").join("") + "</select></div>" +
          (s.rad ? '<div class="nota">Radio/tel: ' + esc(s.rad) + "</div>" : "") + (s.note ? '<div class="nota">' + esc(s.note) + "</div>" : "") + "</div>";
      });
      h += '<div class="acts"><button type="button" class="btn pri" data-a="nuovo-s">+ Nuova squadra</button></div>';
      return h;
    }

    function formSq() {
      const s = modifica.id ? db.sq.find(x => x.id === modifica.id) : {nome: "", tipo: "ordinaria", capo: "", membri: [], stato: "Disponibile", rad: "", note: "", ente: "VVF"};
      // scegliibili: presenti e non già in un'altra squadra
      const disp = db.pers.filter(p => p.presente !== false && (!sqDi(p.id) || sqDi(p.id).id === s.id));
      return '<div class="card"><h3>' + (modifica.id ? "Modifica squadra" : "Nuova squadra") + "</h3>" +
        '<label class="f" for="gs-nome" style="margin-top:0">Nome</label><input type="text" id="gs-nome" autocomplete="off" placeholder="es. Alfa 1" value="' + esc(s.nome) + '">' +
        '<label class="f" for="gs-tipo">Tipo</label><select id="gs-tipo">' + TIPI.map(t => '<option value="' + t[0] + '"' + (s.tipo === t[0] ? " selected" : "") + ">" + t[1] + "</option>").join("") + "</select>" +
        '<label class="f" for="gs-ente">Ente</label><select id="gs-ente">' + ENTI.map(x => "<option" + ((s.ente || "VVF") === x ? " selected" : "") + ">" + x + "</option>").join("") + '</select>' +
        '<label class="f" for="gs-capo">Capo squadra / pilota / conduttore</label><select id="gs-capo"><option value="">–</option>' +
        disp.map(p => '<option value="' + p.id + '"' + (s.capo === p.id ? " selected" : "") + ">" + esc(nomeP(p)) + "</option>").join("") + "</select>" +
        '<label class="f">Componenti</label>' +
        (disp.length ? disp.map(p => '<label class="chk"><input type="checkbox" data-mem="' + p.id + '"' + ((s.membri || []).includes(p.id) ? " checked" : "") + ">" + esc(nomeP(p)) + " " + chipSpec(p) + "</label>").join("")
          : '<div class="vuoto">Nessuna persona libera.</div>') +
        '<label class="f" for="gs-rad">Radio / telefono della squadra</label><input type="text" id="gs-rad" autocomplete="off" value="' + esc(s.rad) + '">' +
        '<label class="f" for="gs-note">Note</label><textarea id="gs-note">' + esc(s.note) + "</textarea>" +
        '<div class="acts"><button type="button" class="btn pri" data-a="salva-s">Salva</button><button type="button" class="btn" data-a="annulla">Annulla</button>' +
        (modifica.id ? '<button type="button" class="btn danger" data-a="del-s">Elimina</button>' : "") + "</div></div>";
    }

    function leggiSq() {
      const nome = $("#gs-nome").value.trim();
      if (!nome) { stato("Dai un nome alla squadra.", false); return; }
      const capo = $("#gs-capo").value;
      const membri = Array.from(root.querySelectorAll("[data-mem]:checked")).map(e => e.dataset.mem).filter(x => x !== capo);
      const d = {nome, tipo: $("#gs-tipo").value, ente: $("#gs-ente").value, capo, membri, rad: $("#gs-rad").value.trim(), note: $("#gs-note").value.trim()};
      if (modifica.id) Object.assign(db.sq.find(x => x.id === modifica.id), d);
      else db.sq.push(Object.assign({id: nuovoId(), stato: "Disponibile"}, d));
      salva(); modifica = null; stato("Salvato su questo telefono.", true); disegna();
    }

    /* ---------------- Operazione ---------------- */
    function vistaOp() {
      const o = db.op;
      const pua = o.pua ? o.pua.lat.toFixed(5) + ", " + o.pua.lon.toFixed(5) : "non impostato";
      return cardIdRicerca() + '<div class="card"><h3>Ricerca</h3>' +
        '<label class="f" for="go-nome" style="margin-top:0">Nome della ricerca</label><input type="text" id="go-nome" autocomplete="off" placeholder="es. Ricerca Campigna" value="' + esc(o.nome) + '">' +
        '<label class="f" for="go-data">Data</label><input type="date" id="go-data" value="' + esc(o.data) + '">' +
        '<label class="f">PUA (punto ultimo avvistamento)</label><div class="nota" style="margin:0 0 8px" id="go-pua">' + pua + "</div>" +
        '<div class="acts" style="margin-top:0"><button type="button" class="btn" data-a="pua-gps">Usa la mia posizione</button>' +
        (o.pua ? '<button type="button" class="btn" data-a="pua-no">Togli</button>' : "") + "</div>" +
        '<label class="f" for="go-note">Note</label><textarea id="go-note">' + esc(o.note) + "</textarea></div>" +
        '<div class="card"><h3>Dati</h3><p class="nota" style="margin-top:0">Per passare personale e squadre a un altro telefono: esporta il file e importalo di là. Nessun dato esce da questo telefono se non lo fai tu.</p>' +
        '<div class="acts"><button type="button" class="btn" data-a="esporta">Esporta</button><button type="button" class="btn" data-a="importa">Importa</button>' +
        '<button type="button" class="btn danger" data-a="reset">Nuova ricerca</button></div>' +
        '<input type="file" id="go-file" accept=".json,application/json" hidden></div>';
    }

    function leggiOp() {
      const prima = db.op.nome;
      db.op.nome = $("#go-nome").value.trim();
      // il nome si vede in chi si registra: si aggiorna anche sul foglio
      if (db.op.aperta && db.op.nome !== prima) postRicerca("rinomina").catch(() => {});
      db.op.data = $("#go-data").value;
      db.op.note = $("#go-note").value.trim();
      salva();
    }

    /* ---------------- disegno e azioni ---------------- */
    function disegna() {
      root.querySelectorAll(".tab").forEach(b => b.classList.toggle("on", b.dataset.tab === tab));
      $("#ge-corpo").innerHTML = tab === "pers" ? vistaPers() : tab === "sq" ? vistaSq() : vistaOp();
      // QR aperto: si disegna e ogni 30 s si scaricano i nuovi registrati
      clearInterval(timerReg); timerReg = null;
      if (tab === "op") mostraAperte();
      if (tab === "pers" && modifica && modifica.tipo === "reg") {
        disegnaQR();
        timerReg = setInterval(() => { if (root.isConnected && $("#gr-qr")) scaricaRegistrati(true); else { clearInterval(timerReg); timerReg = null; } }, 30000);
      }
    }

    function scarica(nome, testo) {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([testo], {type: "application/json"}));
      a.download = nome; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    }

    root.addEventListener("click", e => {
      const t = e.target.closest("[data-tab],[data-a]");
      if (!t || t.tagName === "SELECT") return;
      stato("");
      if (t.dataset.tab) { tab = t.dataset.tab; modifica = null; return disegna(); }
      const a = t.dataset.a, id = t.dataset.id;
      if (a === "nuovo-p") { modifica = {tipo: "pers", id: null}; disegna(); }
      else if (a === "mod-p") { modifica = {tipo: "pers", id}; disegna(); }
      else if (a === "salva-p") leggiPers();
      else if (a === "del-p") {
        if (!confirm("Eliminare questa persona?")) return;
        db.pers = db.pers.filter(p => p.id !== modifica.id);
        db.sq.forEach(s => { s.membri = (s.membri || []).filter(x => x !== modifica.id); if (s.capo === modifica.id) s.capo = ""; });
        salva(); modifica = null; disegna();
      }
      else if (a === "io") aggiungiMe();
      else if (a === "reg") { modifica = {tipo: "reg"}; disegna(); if (db.op.aperta) scaricaRegistrati(true); }
      else if (a === "qr-tipo") { tipoQR = t.dataset.k; disegna(); }
      else if (a === "ric-apri") apriRicerca();
      else if (a === "ric-chiudi") chiudiRicerca(false).then(ok => { if (ok) { disegna(); stato("Ricerca chiusa.", true); } });
      else if (a === "ric-qr") { tab = "pers"; modifica = {tipo: "reg"}; disegna(); scaricaRegistrati(true); }
      else if (a === "reg-scarica") scaricaRegistrati(false);
      else if (a === "reg-incolla") incollaRegistrazioni();
      else if (a === "reg-condividi") {
        const link = linkReg(), titolo = "Registrazione " + (db.op.nome || "ricerca persona");
        if (navigator.share) navigator.share({title: titolo, text: titolo + ": registrati con questo link", url: link}).catch(() => {});
        else (navigator.clipboard ? navigator.clipboard.writeText(link) : Promise.reject()).then(() => stato("Link copiato.", true), () => prompt("Copia il link:", link));
      }
      else if (a === "nuovo-s") { modifica = {tipo: "sq", id: null}; disegna(); }
      else if (a === "mod-s") { modifica = {tipo: "sq", id}; disegna(); }
      else if (a === "salva-s") leggiSq();
      else if (a === "del-s") {
        if (!confirm("Eliminare questa squadra? Le persone tornano libere.")) return;
        db.sq = db.sq.filter(s => s.id !== modifica.id); salva(); modifica = null; disegna();
      }
      else if (a === "annulla") { modifica = null; disegna(); }
      else if (a === "pua-gps") {
        stato("Rilevo la posizione…");
        const ok = p => { if (p && p.lat != null) { db.op.pua = {lat: p.lat, lon: p.lon}; salva(); stato("PUA impostato.", true); disegna(); return true; } return false; };
        Promise.resolve(FireOps.localizza && FireOps.localizza()).then(p => { if (!ok(p) && !ok(FireOps.posizione())) stato("Posizione non disponibile.", false); });
      }
      else if (a === "pua-no") { db.op.pua = null; salva(); disegna(); }
      else if (a === "esporta") { leggiOp(); scarica("ricerca-" + (db.op.data || "dati") + ".json", JSON.stringify(db, null, 1)); stato("File esportato.", true); }
      else if (a === "importa") $("#go-file").click();
      else if (a === "reset") {
        if (!confirm("Cancellare personale, squadre e dati della ricerca da questo telefono? Esporta prima se ti servono." +
          (db.op.aperta ? "\nLa ricerca " + db.op.id + " viene anche chiusa." : ""))) return;
        chiudiRicerca(true).then(ok => { if (!ok) return; db = vuoto(); salva(); stato("Nuova ricerca pronta.", true); disegna(); });
      }
    });

    root.addEventListener("change", e => {
      const t = e.target;
      if (t.id === "gr-tel") { db.op.telReg = t.value.trim(); salva(); disegna(); return; }
      if (t.id === "gp-ente") {
        const vvf = t.value === "VVF";
        $("#gp-bq").hidden = !vvf; $("#gp-br").hidden = vvf;
      }
      else if (t.dataset && t.dataset.a === "stato-s") { const s = db.sq.find(x => x.id === t.dataset.id); if (s) { s.stato = t.value; salva(); } }
      else if (t.id === "go-num" || t.id === "go-anno") { db.op.numero = $("#go-num").value.replace(/\D/g, ""); db.op.anno = $("#go-anno").value.replace(/\D/g, ""); salva(); disegna(); }
      else if (t.id && t.id.indexOf("go-") === 0 && t.id !== "go-file") leggiOp();
      else if (t.id === "go-file" && t.files[0]) {
        const r = new FileReader();
        r.onload = () => {
          try {
            const d = JSON.parse(r.result);
            if (!d || !Array.isArray(d.pers) || !Array.isArray(d.sq)) throw new Error("formato");
            if (!confirm("Importare " + d.pers.length + " persone e " + d.sq.length + " squadre? Sostituisce i dati di questo telefono.")) return;
            db = Object.assign(vuoto(), d); salva(); stato("Importato.", true); disegna();
          } catch (err) { stato("File non valido.", false); }
        };
        r.readAsText(t.files[0]); t.value = "";
      }
    });

    disegna();
  }
});
