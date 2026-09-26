/* FireOps VVF - modulo "ricerche" (funzione Operazioni)
 * Ricerche in corso nate da Messaggistica: messaggi con link del Locator e posizioni ricevute.
 * Dati: stessa Web App Apps Script di messaggistica.js (GET ?comandi=A,B&ore=24),
 *   risposta { messaggi: [...DB_ID_Search], posizioni: [...DB_Locator_People] }.
 * Filtro:
 *   - tutte le ricerche del comando attuale (quello mostrato nell'intestazione);
 *   - dei comandi limitrofi solo quelle con una posizione entro RAGGIO_KM dalla mia posizione GPS.
 * Sola lettura: l'archiviazione resta in Messaggistica.
 */
FireOps.registra({
  id: "ricerche",

  css: `
.pg-ricerche { padding-bottom: 40px; }
.pg-ricerche .wrap { max-width: 640px; margin: 0 auto; padding: 0 16px; }

.pg-ricerche .bar {
  margin-top: 14px;
  padding: 12px 14px;
  background: var(--panel);
  border: 1px solid var(--line);
  border-left: 3px solid var(--ics-operazioni);
  border-radius: 6px;
}
.pg-ricerche .bar-top { display: flex; align-items: center; gap: 10px; }
.pg-ricerche .bar-txt { flex: 1; min-width: 0; font-size: 13.5px; line-height: 1.45; }
.pg-ricerche .bar-txt b { color: var(--text); }
.pg-ricerche .bar-sub { display: block; font-size: 12px; color: var(--text-dim); margin-top: 2px; }
.pg-ricerche .btn-agg {
  flex: none; width: 38px; height: 38px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  background: var(--panel-2); border: 1px solid var(--line); color: var(--text); cursor: pointer;
}
.pg-ricerche .btn-agg.spin svg { animation: ric-spin 1s linear infinite; }
@keyframes ric-spin { to { transform: rotate(360deg); } }
.pg-ricerche .opts { display: flex; flex-wrap: wrap; gap: 8px 16px; margin-top: 10px; }
.pg-ricerche .opts label { display: flex; align-items: center; gap: 7px; font-size: 13px; color: var(--text-dim); cursor: pointer; }
.pg-ricerche .opts input { width: 18px; height: 18px; margin: 0; }

.pg-ricerche .map-box {
  margin-top: 10px; border: 1px solid var(--line); border-radius: 6px; overflow: hidden; background: var(--panel);
}
.pg-ricerche #ricMap { height: 260px; background: #1d242e; }
.pg-ricerche .map-box { position: relative; }
.pg-ricerche .map-btns { position: absolute; top: 10px; right: 10px; z-index: 1000; display: flex; gap: 6px; }
.pg-ricerche .map-btn {
  width: 36px; height: 36px; padding: 0; border-radius: 6px; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  background: var(--panel); border: 1px solid var(--line); color: var(--text);
  box-shadow: 0 2px 6px rgba(0,0,0,.35);
}
.pg-ricerche .map-btn:active { background: var(--panel-2); }
.pg-ricerche .map-btn.busy svg { animation: ric-spin 1s linear infinite; }
.pg-ricerche .map-info {
  position: absolute; left: 10px; bottom: 22px; z-index: 1000; max-width: calc(100% - 20px);
  padding: 6px 10px; border-radius: 6px; font-size: 12.5px; line-height: 1.4;
  background: rgba(16,20,26,.9); border: 1px solid var(--line); border-left: 4px solid var(--gc, #ffd700); color: var(--text);
}
.pg-ricerche .map-info button { margin-left: 8px; background: none; border: none; color: var(--text-dim); font-size: 14px; cursor: pointer; }
/* mappa a schermo intero: copre anche l'intestazione */
.pg-ricerche .map-box.full {
  position: fixed; inset: 0; z-index: 9999; margin: 0; border: none; border-radius: 0;
  padding-top: env(safe-area-inset-top, 0px); padding-bottom: env(safe-area-inset-bottom, 0px); background: var(--bg);
}
.pg-ricerche .map-box.full #ricMap { height: 100%; }
.pg-ricerche .map-box.full .map-btns { top: calc(10px + env(safe-area-inset-top, 0px)); }
.pg-ricerche .map-msg { padding: 12px 14px; font-size: 12.5px; color: var(--text-dim); }

.pg-ricerche .stato {
  margin-top: 14px; padding: 16px 14px; text-align: center; font-size: 13.5px; color: var(--text-dim);
  background: var(--panel); border: 1px dashed var(--line); border-radius: 6px; line-height: 1.5;
}
.pg-ricerche .stato.err { color: #e8734a; border-color: #5a3326; }

.pg-ricerche .lista { margin-top: 10px; display: flex; flex-direction: column; gap: 10px; }

/* ogni ricerca (intervento) ha il suo colore: bordo, numero e segnaposto in mappa */
.pg-ricerche .ric {
  --gc: var(--text-dim);
  background: var(--panel); border: 1px solid var(--line); border-radius: 6px; overflow: hidden;
  border-left: 5px solid var(--gc);
}
.pg-ricerche .ric.arch { opacity: .55; }
.pg-ricerche .ric.flash { box-shadow: 0 0 0 2px var(--gc); }

.pg-ricerche .ric-head { display: flex; align-items: flex-start; gap: 10px; padding: 12px 14px 6px; }
.pg-ricerche .ric-num {
  flex: none; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
  background: var(--gc); color: #fff; font-size: 13px; font-weight: 800; text-shadow: 0 0 2px rgba(0,0,0,.5);
}
.pg-ricerche .ric.wait .ric-num { background: transparent; color: var(--gc); border: 2px dashed var(--gc); }
.pg-ricerche .badge {
  display: inline-block; margin-left: 6px; padding: 1px 7px; border-radius: 9px; font-size: 11px; font-weight: 700;
  vertical-align: 1px;
}
.pg-ricerche .badge.ok { background: #1f3b2a; color: #6fd39a; }
.pg-ricerche .badge.wait { background: #3a3320; color: #e6c200; }

/* messaggi dello stesso intervento, qualunque canale */
.pg-ricerche .msgs { margin: 0 14px 10px; border-top: 1px solid var(--line); }
.pg-ricerche .msg { display: flex; align-items: center; gap: 8px; padding: 7px 0; border-bottom: 1px solid var(--line); font-size: 12.5px; }
.pg-ricerche .msg-can {
  flex: none; min-width: 74px; text-align: center; padding: 2px 6px; border-radius: 4px;
  font-size: 11px; font-weight: 700; background: var(--panel-2); color: var(--text-dim);
}
.pg-ricerche .msg-can.wa { background: #173a26; color: #5fd88b; }
.pg-ricerche .msg-can.tg { background: #14324a; color: #6cc3f2; }
.pg-ricerche .msg-can.sms { background: #2d2a40; color: #b7a8f0; }
.pg-ricerche .msg-num { flex: 1; min-width: 0; font-family: var(--mono); color: var(--text); }
.pg-ricerche .msg-ora { flex: none; color: var(--text-dim); }
.pg-ricerche .msg-arch { flex: none; font-size: 11px; color: var(--text-dim); }
.pg-ricerche .pos-tit { font-size: 11.5px; font-weight: 700; color: var(--gc); text-transform: uppercase; letter-spacing: .3px; margin-bottom: 4px; }
.pg-ricerche .ric-t { flex: 1; min-width: 0; }
.pg-ricerche .ric-stato { font-size: 14.5px; font-weight: 700; }
.pg-ricerche .ric-meta { font-size: 12px; color: var(--text-dim); margin-top: 2px; }
.pg-ricerche .tag {
  flex: none; font-size: 11px; font-weight: 700; padding: 3px 8px; border-radius: 10px;
  background: var(--panel-2); border: 1px solid var(--line); color: var(--text-dim); white-space: nowrap;
}
.pg-ricerche .tag.mio { color: #000; background: #e6c200; border-color: #e6c200; }

.pg-ricerche .ric-body { padding: 4px 14px 12px; font-size: 13px; color: var(--text-dim); line-height: 1.6; }
.pg-ricerche .ric-body b { color: var(--text); font-weight: 600; }
.pg-ricerche .ric-id { font-family: var(--mono); font-size: 12px; }

.pg-ricerche .pos {
  margin: 0 14px 12px; padding: 10px 12px; background: var(--panel-2); border: 1px solid var(--line); border-radius: 6px;
}
.pg-ricerche .pos-row { display: flex; justify-content: space-between; gap: 10px; font-size: 13px; padding: 3px 0; }
.pg-ricerche .pos-row span:first-child { color: var(--text-dim); }
.pg-ricerche .pos-row span:last-child { font-family: var(--mono); text-align: right; }
.pg-ricerche .copia { cursor: pointer; }
.pg-ricerche .copia::after { content: " ⧉"; color: var(--text-dim); }
.pg-ricerche .copia.fatto::after { content: " ✓"; color: #3fa66b; }

.pg-ricerche .ric-act { display: flex; gap: 8px; padding: 0 14px 12px; }
.pg-ricerche .ric-act button {
  flex: 1; padding: 10px 6px; border-radius: 6px; font-size: 13px; font-weight: 700; cursor: pointer;
  background: var(--panel-2); border: 1px solid var(--line); color: var(--text);
}
.pg-ricerche .ric-route { display: flex; gap: 8px; padding: 0 14px 10px; }
.pg-ricerche .ric-route button {
  flex: 1; padding: 9px 6px; border-radius: 6px; font-size: 13px; font-weight: 700; cursor: pointer;
  background: var(--panel-2); border: 1px solid var(--line); color: var(--text);
}
.pg-ricerche .ric-route .piedi { border-color: #3fa66b; }
.pg-ricerche .ric-route .auto { border-color: #29a9eb; }
.pg-ricerche .ric-route button:disabled { opacity: .6; cursor: default; }
.pg-ricerche .route-info { margin: -2px 14px 12px; font-size: 12.5px; line-height: 1.5; color: var(--text-dim); }
.pg-ricerche .route-info b { color: var(--text); }
.pg-ricerche .route-info.err { color: #e8734a; }
.pg-ricerche .ric-act .nav { background: var(--gc); border-color: var(--gc); color: #fff; text-shadow: 0 0 2px rgba(0,0,0,.4); }

.pg-ricerche .nota { margin-top: 10px; font-size: 12px; color: var(--text-dim); line-height: 1.5; }

.pg-ricerche .ric-ico { width: 26px; height: 26px; }
@media (prefers-reduced-motion: reduce) { .pg-ricerche .btn-agg.spin svg { animation: none; } }
`,

  html: `
<div class="wrap">
  <div class="bar">
    <div class="bar-top">
      <div class="bar-txt" id="ricAmbito">In attesa del comando…<span class="bar-sub" id="ricAgg"></span></div>
      <button type="button" class="btn-agg" id="ricAggiorna" aria-label="Aggiorna" title="Aggiorna">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"
          stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 11-3-6.7L21 8"/><path d="M21 3v5h-5"/></svg>
      </button>
    </div>
    <div class="opts">
      <label><input type="checkbox" id="ricLimitrofi" checked> Limitrofi entro 50 km</label>
      <label><input type="checkbox" id="ricArchiviate"> Mostra archiviate</label>
    </div>
  </div>

  <div class="map-box" id="ricMapBox" hidden>
    <div id="ricMap"></div>
    <div class="map-btns">
      <button type="button" class="map-btn" id="ricMe" title="Centra sulla mia posizione" aria-label="Centra sulla mia posizione">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <circle cx="12" cy="12" r="3.5"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg>
      </button>
      <button type="button" class="map-btn" id="ricTutti" title="Mostra tutte le ricerche" aria-label="Mostra tutte le ricerche">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="9" r="1.5"/><circle cx="15.5" cy="15" r="1.5"/></svg>
      </button>
      <button type="button" class="map-btn" id="ricEspandi" title="Espandi mappa" aria-label="Espandi mappa"></button>
    </div>
    <div class="map-info" id="ricMapInfo" hidden></div>
  </div>

  <div class="stato" id="ricStato">Caricamento…</div>
  <div class="lista" id="ricLista"></div>
  <div class="nota" id="ricNota"></div>
</div>
`,

  async init(root) {
    // Stessa Web App di messaggistica.js (WEBAPP_URL_ID_SEARCH)
    const WEBAPP = "https://script.google.com/macros/s/AKfycbwS8Vtq5MbfPG-lLdobd8IpFqh2Mi90mTciotejfh9L1E7cUkMjdQko-zcj0thYOZ44/exec";
    const ORE = 24;
    const RAGGIO_KM = 50;
    const AGGIORNA_MS = 60000;

    const $ = id => document.getElementById(id);
    const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;"}[c]));

    // ---------- utilità ----------
    // Il foglio può restituire numeri con la virgola ("44,21")
    function num(v) {
      if (v === null || v === undefined || v === "") return NaN;
      const n = Number(v);
      return isFinite(n) ? n : Number(String(v).replace(",", "."));
    }

    // Date ISO oppure "26/9/2026, 14:32:10" (toLocaleString italiano del Locator)
    function data(v) {
      if (!v) return null;
      if (v instanceof Date) return v;
      let d = new Date(v);
      if (!isNaN(d)) return d;
      const m = String(v).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4}),?\s+(\d{1,2}):(\d{2})(?::(\d{2}))?/);
      if (m) {
        d = new Date(+m[3], +m[2] - 1, +m[1], +m[4], +m[5], +(m[6] || 0));
        if (!isNaN(d)) return d;
      }
      return null;
    }

    function ora(d) {
      if (!d) return "-";
      const oggi = new Date();
      const hm = d.toLocaleTimeString("it-IT", {hour: "2-digit", minute: "2-digit"});
      return d.toDateString() === oggi.toDateString() ? hm : d.toLocaleDateString("it-IT", {day: "2-digit", month: "2-digit"}) + " " + hm;
    }

    function fa(d) {
      if (!d) return "";
      const min = Math.round((Date.now() - d.getTime()) / 60000);
      if (min < 1) return "adesso";
      if (min < 60) return min + " min fa";
      const h = Math.floor(min / 60);
      return h + " h" + (min % 60 ? " " + (min % 60) + " min" : "") + " fa";
    }

    function km(a, b, c, d) {
      const R = 6371, r = Math.PI / 180;
      const x = Math.sin((c - a) * r / 2) ** 2 + Math.cos(a * r) * Math.cos(c * r) * Math.sin((d - b) * r / 2) ** 2;
      return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
    }

    function fmtKm(k) {
      return k < 1 ? Math.round(k * 1000) + " m" : k.toFixed(1) + " km";
    }

    const ROSA = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSO", "SO", "OSO", "O", "ONO", "NO", "NNO"];
    function az(lat1, lon1, lat2, lon2) {
      const r = Math.PI / 180, p1 = lat1 * r, p2 = lat2 * r, dl = (lon2 - lon1) * r;
      const y = Math.sin(dl) * Math.cos(p2);
      const x = Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl);
      const g = (Math.atan2(y, x) / r + 360) % 360;
      return String(Math.round(g) % 360).padStart(3, "0") + "° " + ROSA[Math.round(g / 22.5) % 16];
    }

    // Mai il numero intero a schermo in sala
    function maschera(n) {
      const p = String(n || "").replace(/\D/g, "");
      return p.length <= 4 ? p : "•".repeat(p.length - 4) + p.slice(-4);
    }

    function copia(el, testo) {
      const ok = () => {
        el.classList.add("fatto");
        setTimeout(() => el.classList.remove("fatto"), 1500);
      };
      if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(testo).then(ok, () => window.prompt("Copia:", testo));
      else window.prompt("Copia:", testo);
    }

    // ---------- stato ----------
    let timer = null;
    let inCorso = false;
    let ultimoDato = null;       // {messaggi, posizioni, comandi}
    let mappa = null, strato = null, stratoRotta = null, stratoMe = null;
    let meLive = null, watchId = null;
    let ultimoFit = null, puntiRicerche = [];
    const schede = new Map();    // IdRicerca -> elemento

    function contesto() {
      const p = FireOps.posizione();
      if (!p || !p.comando) return null;
      const me = (isFinite(p.lat) && isFinite(p.lon) && p.lat !== null) ? {lat: p.lat, lon: p.lon} : null;
      return {comando: p.comando, me};
    }

    async function comandiDaChiedere(ctx) {
      const nomi = [ctx.comando.c];
      if ($("ricLimitrofi").checked && ctx.me) {
        // confinanti dichiarati + qualunque sede entro raggio (le ricerche possono stare oltre il confine)
        const tutti = await FireOps.comandi().catch(() => []);
        (ctx.comando.conf || []).forEach(n => nomi.push(n));
        tutti.forEach(c => { if (km(ctx.me.lat, ctx.me.lon, c.lat, c.lon) <= RAGGIO_KM + 40) nomi.push(c.c); });
      }
      return [...new Set(nomi)];
    }

    // ---------- caricamento ----------
    async function carica() {
      if (inCorso) return;
      const ctx = contesto();
      if (!ctx) {
        mostraStato("Serve il comando: attendi la localizzazione in alto oppure sceglilo dal menu.");
        scriviAmbito("In attesa del comando…");
        return;
      }

      inCorso = true;
      $("ricAggiorna").classList.add("spin");
      aggiornaAmbito(ctx);
      if (!schede.size) mostraStato("Caricamento ricerche…");

      try {
        const nomi = await comandiDaChiedere(ctx);
        const url = WEBAPP + "?" + new URLSearchParams({comandi: nomi.join(","), ore: String(ORE)});
        const ctrl = new AbortController();
        const tmo = setTimeout(() => ctrl.abort(), 20000);
        const r = await fetch(url, {signal: ctrl.signal});
        clearTimeout(tmo);
        if (!r.ok) throw new Error("HTTP " + r.status);
        const d = await r.json();
        ultimoDato = {messaggi: d.messaggi || [], posizioni: d.posizioni || [], ctx};
        disegna();
        $("ricAgg").textContent = "Aggiornato alle " + new Date().toLocaleTimeString("it-IT", {hour: "2-digit", minute: "2-digit"}) + " · automatico ogni minuto";
      } catch (e) {
        console.warn("Ricerche:", e);
        if (!schede.size) mostraStato("Impossibile leggere le ricerche (" + (e.name === "AbortError" ? "tempo scaduto" : e.message) + "). Riprova con ⟳.", true);
        else $("ricAgg").textContent = "Ultimo aggiornamento non riuscito, riprovo tra un minuto";
      } finally {
        inCorso = false;
        $("ricAggiorna").classList.remove("spin");
      }
    }

    // Riga "Comando X + limitrofi": la sottoriga dell'ultimo aggiornamento resta com'è
    function scriviAmbito(html) {
      const amb = $("ricAmbito"), sub = $("ricAgg");
      amb.innerHTML = html;
      amb.appendChild(sub);
    }

    function aggiornaAmbito(ctx) {
      const lim = $("ricLimitrofi").checked;
      let t = "Comando <b>" + esc(ctx.comando.c) + "</b>";
      if (lim && ctx.me) t += " + limitrofi entro " + RAGGIO_KM + " km";
      else if (lim && !ctx.me) t += " · limitrofi solo con la posizione GPS";
      scriviAmbito(t);
    }

    function mostraStato(testo, errore) {
      const s = $("ricStato");
      s.hidden = false;
      s.classList.toggle("err", !!errore);
      s.textContent = testo;
      $("ricLista").innerHTML = "";
      schede.clear();
    }

    // ---------- raggruppamento ----------
    // Una ricerca = un intervento (comando + numero + anno), qualunque sia il canale
    // (WhatsApp Web, WhatsApp desktop, Telegram, SMS...). Senza numero intervento si usa l'ID ricerca.
    function chiaveGruppo(m) {
      const n = String(m.NumeroIntervento || "").replace(/\D/g, "").replace(/^0+/, "");
      if (n) return [m.Comando || "", n, m.AnnoIntervento || ""].join("|");
      return "id|" + (m.IdRicerca || String(m.NumeroTelefono || "") + "@" + String(m.Timestamp || ""));
    }

    // Colori ben distinguibili fra loro e dal giallo della mia posizione
    const PALETTE = ["#d8262f", "#2b73d6", "#2f9e5b", "#8e44ad", "#e67e22", "#16a085",
      "#d63384", "#6d4c41", "#0097a7", "#7cb342", "#c2185b", "#5c6bc0"];
    const coloreDi = new Map();     // chiave gruppo -> colore, stabile fra un aggiornamento e l'altro
    function colore(chiave) {
      if (!coloreDi.has(chiave)) {
        const usati = new Set(coloreDi.values());
        const libero = PALETTE.find(c => !usati.has(c)) || PALETTE[coloreDi.size % PALETTE.length];
        coloreDi.set(chiave, libero);
      }
      return coloreDi.get(chiave);
    }

    function tipoCanale(c) {
      const t = String(c || "").toLowerCase();
      if (t.includes("whats")) return "wa";
      if (t.includes("tele")) return "tg";
      if (t.includes("sms")) return "sms";
      return "";
    }

    // Posizione migliore = precisione più piccola; a parità, la più recente
    function migliore(pos) {
      return pos.reduce((best, p) => {
        if (!best) return p;
        const a = isFinite(p._acc) ? p._acc : Infinity, b = isFinite(best._acc) ? best._acc : Infinity;
        if (a < b) return p;
        if (a === b && (p._t ? p._t.getTime() : 0) > (best._t ? best._t.getTime() : 0)) return p;
        return best;
      }, null);
    }

    // ---------- elaborazione ----------
    function elabora() {
      const {messaggi, posizioni, ctx} = ultimoDato;
      const mio = ctx.comando.c;
      const mostraArch = $("ricArchiviate").checked;
      const lim = $("ricLimitrofi").checked;
      let escluseAttesa = 0, escluseLontane = 0;

      // posizioni pulite, indicizzate per IdRicerca
      const perId = new Map();
      posizioni.forEach(p => {
        const q = {...p, _lat: num(p.Lat), _lon: num(p.Lng), _acc: num(p.Accuratezza), _t: data(p.Timestamp)};
        if (!p.IdRicerca || !isFinite(q._lat) || !isFinite(q._lon)) return;
        if (!perId.has(p.IdRicerca)) perId.set(p.IdRicerca, []);
        perId.get(p.IdRicerca).push(q);
      });

      // gruppi per intervento
      const gruppi = new Map();
      messaggi.forEach(m => {
        const k = chiaveGruppo(m);
        if (!gruppi.has(k)) gruppi.set(k, {chiave: k, messaggi: []});
        gruppi.get(k).messaggi.push({...m, _t: data(m.Timestamp), _arch: String(m.Archiviata).toUpperCase() === "TRUE"});
      });

      const lista = [];
      gruppi.forEach(g => {
        g.messaggi.sort((a, b) => (b._t ? b._t.getTime() : 0) - (a._t ? a._t.getTime() : 0));
        g.archiviata = g.messaggi.every(m => m._arch);
        if (g.archiviata && !mostraArch) return;

        const primo = g.messaggi[0];
        g.comando = primo.Comando || "";
        g.numero = primo.NumeroIntervento || "";
        g.anno = primo.AnnoIntervento || "";
        g.t = primo._t;                                          // ultimo invio

        // tutte le posizioni dei suoi ID (senza doppioni)
        const visti = new Set();
        g.pos = [];
        new Set(g.messaggi.map(m => m.IdRicerca).filter(Boolean)).forEach(id => {
          (perId.get(id) || []).forEach(p => {
            const f = [p._lat, p._lon, p._acc, p._t ? p._t.getTime() : ""].join("|");
            if (!visti.has(f)) { visti.add(f); g.pos.push(p); }
          });
        });
        g.best = migliore(g.pos);
        g.eMio = g.comando === mio;
        g.dist = g.best && ctx.me ? km(ctx.me.lat, ctx.me.lon, g.best._lat, g.best._lon) : null;

        if (!g.eMio) {
          if (!lim || !ctx.me) return;
          if (!g.best) { escluseAttesa++; return; }
          if (g.dist > RAGGIO_KM) { escluseLontane++; return; }
        }
        g.colore = colore(g.chiave);
        lista.push(g);
      });

      // con posizione prima, poi in attesa; archiviate in fondo; più recenti in cima
      lista.sort((a, b) => {
        if (a.archiviata !== b.archiviata) return a.archiviata ? 1 : -1;
        if (!!a.best !== !!b.best) return a.best ? -1 : 1;
        return (b.t ? b.t.getTime() : 0) - (a.t ? a.t.getTime() : 0);
      });
      return {lista, escluseAttesa, escluseLontane, ctx};
    }

    // ---------- disegno ----------
    function disegna() {
      if (!ultimoDato) return;
      const {lista, escluseAttesa, escluseLontane, ctx} = elabora();

      const note = [];
      if (escluseAttesa) note.push(escluseAttesa + (escluseAttesa === 1 ? " ricerca" : " ricerche") + " dei limitrofi ancora senza posizione: non si può sapere se è entro " + RAGGIO_KM + " km.");
      if (escluseLontane) note.push(escluseLontane + " dei limitrofi oltre " + RAGGIO_KM + " km non mostrate.");
      note.push("Messaggi raggruppati per intervento, qualunque canale. Posizione migliore = precisione più alta. Periodo: ultime " + ORE + " ore. Per archiviare usa Messaggistica.");
      $("ricNota").textContent = note.join(" ");

      if (!lista.length) {
        mostraStato("Nessuna ricerca in corso per " + ctx.comando.c +
          ($("ricLimitrofi").checked && ctx.me ? " e per i limitrofi entro " + RAGGIO_KM + " km" : "") + " nelle ultime " + ORE + " ore.");
        disegnaMappa([], ctx);
        return;
      }
      $("ricStato").hidden = true;

      const nuove = new Map();
      const elementi = lista.map((g, i) => {
        const firma = [g.messaggi.length, g.messaggi.filter(m => m._arch).length, g.pos.length,
          g.best ? g.best._acc : "", g.archiviata, g.dist == null ? "" : Math.round(g.dist * 10), i + 1, g.colore].join("|");
        const ex = schede.get(g.chiave);
        const el = ex && ex.firma === firma ? ex.el : scheda(g, i + 1, ctx);
        nuove.set(g.chiave, {el, firma});
        return el;
      });
      schede.clear();
      nuove.forEach((v, k) => schede.set(k, v));
      $("ricLista").replaceChildren(...elementi);
      disegnaMappa(lista, ctx);
    }

    function scheda(g, n, ctx) {
      const el = document.createElement("div");
      el.className = "ric " + (g.best ? "ok" : "wait") + (g.archiviata ? " arch" : "");
      el.style.setProperty("--gc", g.colore);
      el.dataset.chiave = g.chiave;

      const titolo = g.numero
        ? "Intervento " + esc(g.numero) + (g.anno ? "/" + esc(g.anno) : "")
        : "Ricerca senza n° intervento";
      const badge = g.best
        ? '<span class="badge ok">' + g.pos.length + (g.pos.length === 1 ? " posizione" : " posizioni") + '</span>'
        : '<span class="badge wait">in attesa</span>';
      const nMsg = g.messaggi.length;

      let h =
        '<div class="ric-head">' +
          '<div class="ric-num">' + n + '</div>' +
          '<div class="ric-t"><div class="ric-stato">' + titolo + badge + '</div>' +
          '<div class="ric-meta">' + nMsg + (nMsg === 1 ? " messaggio" : " messaggi") +
            ' · ultimo invio ' + ora(g.t) + (g.t ? " (" + fa(g.t) + ")" : "") + (g.archiviata ? " · archiviata" : "") + '</div></div>' +
          '<span class="tag' + (g.eMio ? " mio" : "") + '">' + (g.eMio ? "Mio comando" : esc(g.comando || "Limitrofo")) + '</span>' +
        '</div>' +
        '<div class="msgs">' +
          g.messaggi.map(m =>
            '<div class="msg">' +
              '<span class="msg-can ' + tipoCanale(m.Canale) + '">' + esc(m.Canale || "—") + '</span>' +
              '<span class="msg-num">' + esc(maschera(m.NumeroTelefono)) + '</span>' +
              (m._arch ? '<span class="msg-arch">archiviato</span>' : '') +
              '<span class="msg-ora">' + ora(m._t) + '</span>' +
            '</div>').join("") +
        '</div>';

      if (g.best) {
        const b = g.best;
        const coord = b._lat.toFixed(6) + ", " + b._lon.toFixed(6);
        h +=
          '<div class="pos">' +
            '<div class="pos-tit">Posizione migliore' + (g.pos.length > 1 ? ' (su ' + g.pos.length + ')' : '') + '</div>' +
            '<div class="pos-row"><span>Coordinate</span><span class="copia" data-copia="' + coord + '">' + coord + '</span></div>' +
            (isFinite(b._acc) ? '<div class="pos-row"><span>Precisione</span><span>±' + Math.round(b._acc) + ' m' + (b.Fonte ? ' · ' + esc(b.Fonte) : '') + '</span></div>' : '') +
            '<div class="pos-row"><span>Ricevuta</span><span>' + ora(b._t) + (b._t ? ' (' + fa(b._t) + ')' : '') + '</span></div>' +
            (ctx.me ? '<div class="pos-row"><span>Da me</span><span>' + fmtKm(g.dist) + ' · ' + az(ctx.me.lat, ctx.me.lon, b._lat, b._lon) + '</span></div>' : '') +
          '</div>' +
          '<div class="ric-route">' +
            '<button type="button" class="piedi">🥾 A piedi</button>' +
            '<button type="button" class="auto">🚗 In auto</button>' +
          '</div>' +
          '<div class="route-info" hidden></div>' +
          '<div class="ric-act">' +
            '<button type="button" class="nav">Naviga</button>' +
            '<button type="button" class="vedi">Sulla mappa</button>' +
          '</div>';
      } else {
        h += '<div class="ric-body">Nessuna posizione ancora ricevuta per questo intervento.</div>';
      }
      el.innerHTML = h;

      const c = el.querySelector(".copia");
      if (c) c.addEventListener("click", () => copia(c, c.dataset.copia));
      const nav = el.querySelector(".nav");
      if (nav) nav.addEventListener("click", () => {
        window.open("https://www.google.com/maps/dir/?api=1&destination=" + g.best._lat.toFixed(6) + "," + g.best._lon.toFixed(6) +
          "&travelmode=driving&dir_action=navigate", "_blank", "noopener");
      });
      const vedi = el.querySelector(".vedi");
      if (vedi) vedi.addEventListener("click", () => {
        if (!mappa) return;
        $("ricMapBox").scrollIntoView({behavior: "smooth", block: "center"});
        mappa.setView([g.best._lat, g.best._lon], Math.max(mappa.getZoom(), 15));
      });
      const piedi = el.querySelector(".piedi"), auto = el.querySelector(".auto");
      if (piedi) piedi.addEventListener("click", () => percorso(g, "piedi", el));
      if (auto) auto.addEventListener("click", () => percorso(g, "auto", el));
      return el;
    }

    // ---------- mappa ----------
    function icona(n, colore) {
      return L.divIcon({
        className: "", iconSize: [28, 28], iconAnchor: [14, 14],
        html: '<div style="width:28px;height:28px;border-radius:50%;background:' + colore +
          ';color:#fff;border:2px solid #10141a;box-shadow:0 0 0 2px #fff;display:flex;align-items:center;justify-content:center;' +
          'font:800 12px system-ui;text-shadow:0 0 2px rgba(0,0,0,.5)">' + n + '</div>'
      });
    }

    async function disegnaMappa(lista, ctx) {
      const conPos = lista.filter(g => g.best);
      const box = $("ricMapBox");
      if (!conPos.length) { box.hidden = true; return; }
      if (!(await FireOps.leaflet())) { box.hidden = true; return; }
      box.hidden = false;

      if (!mappa) {
        mappa = L.map("ricMap", {zoomControl: true, attributionControl: true});
        L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>'
        }).addTo(mappa);
        strato = L.layerGroup().addTo(mappa);
        stratoRotta = L.layerGroup().addTo(mappa);
        stratoMe = L.layerGroup().addTo(mappa);
      }
      strato.clearLayers();
      const punti = [];

      if (ctx.me && $("ricLimitrofi").checked) {
        L.circle([ctx.me.lat, ctx.me.lon], {radius: RAGGIO_KM * 1000, color: "#ffd700", weight: 1, opacity: .5, fillOpacity: .03, dashArray: "4,6", interactive: false}).addTo(strato);
      }
      disegnaMe();

      lista.forEach((g, i) => {
        if (!g.best) return;
        const n = i + 1, b = g.best, col = g.archiviata ? "#8b96a3" : g.colore;
        // letture meno precise: puntini piccoli dello stesso colore
        g.pos.forEach(p => {
          if (p === b) return;
          L.circleMarker([p._lat, p._lon], {radius: 4, color: col, weight: 1, fillColor: col, fillOpacity: .45, interactive: false}).addTo(strato);
        });
        if (isFinite(b._acc) && b._acc > 0) {
          L.circle([b._lat, b._lon], {radius: b._acc, color: col, weight: 1.5, fillColor: col, fillOpacity: .15, interactive: false}).addTo(strato);
        }
        L.marker([b._lat, b._lon], {icon: icona(n, col), zIndexOffset: 1000})
          .bindPopup("<b>" + n + ". " + (g.numero ? "Intervento " + esc(g.numero) : "Ricerca") + "</b><br>" + esc(g.comando) +
            "<br>" + b._lat.toFixed(6) + ", " + b._lon.toFixed(6) + (isFinite(b._acc) ? "<br>±" + Math.round(b._acc) + " m (migliore)" : "") +
            "<br>" + ora(b._t))
          .on("click", () => {
            const el = [...$("ricLista").children].find(x => x.dataset.chiave === g.chiave);
            if (el) {
              el.scrollIntoView({behavior: "smooth", block: "center"});
              el.classList.add("flash");
              setTimeout(() => el.classList.remove("flash"), 1600);
            }
          })
          .addTo(strato);
        punti.push([b._lat, b._lon]);
      });

      // Inquadra solo al primo disegno o quando compaiono ricerche nuove:
      // l'aggiornamento automatico non deve spostare la mappa che stai guardando
      puntiRicerche = punti.slice();
      const chiaveFit = punti.map(p => p.join(",")).sort().join(";");
      const rifai = chiaveFit !== ultimoFit;
      ultimoFit = chiaveFit;
      setTimeout(() => {
        mappa.invalidateSize();
        if (rifai) inquadraTutto();
      }, 50);
    }

    function inquadraTutto() {
      if (!mappa) return;
      const pt = puntiRicerche.slice();
      const me = mioPunto();
      if (me) pt.push([me.lat, me.lon]);
      if (!pt.length) return;
      if (pt.length === 1) mappa.setView(pt[0], 14);
      else mappa.fitBounds(L.latLngBounds(pt), {padding: [40, 40], maxZoom: 15});
    }

    // ---------- mia posizione (GPS seguito mentre il modulo è aperto) ----------
    function mioPunto() {
      if (meLive) return meLive;
      const c = contesto();
      return c && c.me ? c.me : null;
    }

    function disegnaMe() {
      if (!mappa || !stratoMe) return;
      stratoMe.clearLayers();
      const me = mioPunto();
      if (!me) return;
      if (isFinite(me.acc) && me.acc > 0 && me.acc < 2000) {
        L.circle([me.lat, me.lon], {radius: me.acc, color: "#ffd700", weight: 1, fillColor: "#ffd700", fillOpacity: .12, interactive: false}).addTo(stratoMe);
      }
      L.circleMarker([me.lat, me.lon], {radius: 8, color: "#10141a", weight: 2.5, fillColor: "#ffd700", fillOpacity: 1})
        .bindPopup("La mia posizione" + (isFinite(me.acc) ? "<br>±" + Math.round(me.acc) + " m" : "")).addTo(stratoMe);
    }

    function avviaGps() {
      if (watchId !== null || !navigator.geolocation) return;
      watchId = navigator.geolocation.watchPosition(p => {
        meLive = {lat: p.coords.latitude, lon: p.coords.longitude, acc: p.coords.accuracy};
        disegnaMe();
      }, () => { }, {enableHighAccuracy: true, maximumAge: 10000, timeout: 20000});
    }
    function fermaGps() {
      if (watchId !== null) { navigator.geolocation.clearWatch(watchId); watchId = null; }
    }

    // Aspetta una posizione per al massimo "ms" (serve ai percorsi quando il GPS è appena partito)
    function attendiMe(ms) {
      const subito = mioPunto();
      if (subito) return Promise.resolve(subito);
      avviaGps();
      return new Promise(res => {
        const t0 = Date.now();
        const iv = setInterval(() => {
          const me = mioPunto();
          if (me || Date.now() - t0 > ms) { clearInterval(iv); res(me); }
        }, 300);
      });
    }

    // ---------- percorsi a piedi / in auto (BRouter, come Localizzati) ----------
    function durata(sec) {
      const m = Math.round(sec / 60);
      return m < 60 ? m + " min" : Math.floor(m / 60) + " h " + String(m % 60).padStart(2, "0") + " min";
    }

    function infoMappa(html, colore) {
      const box = $("ricMapInfo");
      if (!html) { box.hidden = true; return; }
      box.style.setProperty("--gc", colore || "#ffd700");
      box.innerHTML = html + '<button type="button" aria-label="Togli percorso" title="Togli percorso">✕</button>';
      box.hidden = false;
      box.querySelector("button").addEventListener("click", () => {
        if (stratoRotta) stratoRotta.clearLayers();
        box.hidden = true;
      });
    }

    async function percorso(g, modo, el) {
      const info = el.querySelector(".route-info");
      const btns = el.querySelectorAll(".ric-route button");
      const etichetta = modo === "piedi" ? "A piedi" : "In auto";
      info.hidden = false;
      info.classList.remove("err");
      info.textContent = "Cerco la mia posizione…";
      btns.forEach(b => b.disabled = true);

      try {
        const me = await attendiMe(12000);
        if (!me) throw new Error("posizione GPS non disponibile");
        info.textContent = "Calcolo del percorso " + etichetta.toLowerCase() + "…";

        const url = "https://brouter.de/brouter?lonlats=" +
          me.lon.toFixed(6) + "," + me.lat.toFixed(6) + "|" + g.best._lon.toFixed(6) + "," + g.best._lat.toFixed(6) +
          "&profile=" + (modo === "piedi" ? "hiking-mountain" : "car-fast") + "&alternativeidx=0&format=geojson";
        const ctrl = new AbortController();
        const tmo = setTimeout(() => ctrl.abort(), 20000);
        const r = await fetch(url, {signal: ctrl.signal});
        clearTimeout(tmo);
        if (!r.ok) throw new Error(((await r.text()).trim().slice(0, 100)) || "HTTP " + r.status);
        const f = (await r.json()).features;
        if (!f || !f[0]) throw new Error("nessun percorso trovato");

        const pr = f[0].properties || {};
        const coords = f[0].geometry.coordinates.map(c => [c[1], c[0]]);
        const kmTot = (parseFloat(pr["track-length"]) / 1000).toFixed(1);
        const sal = pr["filtered ascend"] != null ? Math.round(parseFloat(pr["filtered ascend"])) : null;
        const testo = "<b>" + etichetta + "</b>: " + kmTot + " km · " + durata(parseFloat(pr["total-time"])) +
          (sal != null ? " · dislivello +" + sal + " m" : "");
        info.innerHTML = testo + "<br>Calcolato da BRouter alle " +
          new Date().toLocaleTimeString("it-IT", {hour: "2-digit", minute: "2-digit"}) + ", senza traffico.";

        if (mappa && stratoRotta) {
          stratoRotta.clearLayers();
          L.polyline(coords, {color: "#10141a", weight: 8, opacity: .55, interactive: false}).addTo(stratoRotta);
          const linea = L.polyline(coords, {color: g.colore, weight: 5, opacity: .95,
            dashArray: modo === "piedi" ? "2,9" : null, lineCap: "round", interactive: false}).addTo(stratoRotta);
          infoMappa((g.numero ? "Int. " + esc(g.numero) + " · " : "") + testo, g.colore);
          $("ricMapBox").scrollIntoView({behavior: "smooth", block: "center"});
          setTimeout(() => mappa.fitBounds(linea.getBounds(), {padding: [40, 40]}), 250);
        }
      } catch (e) {
        info.classList.add("err");
        info.textContent = "Percorso non disponibile (" + (e.name === "AbortError" ? "tempo scaduto" : e.message) + ").";
      } finally {
        btns.forEach(b => b.disabled = false);
      }
    }

    // ---------- schermo intero ----------
    const ICO_ESPANDI = '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9V3h6M3 3l6 6M21 9V3h-6M21 3l-6 6M3 15v6h6M3 21l6-6M21 15v6h-6M21 21l-6-6"/></svg>';
    const ICO_RIDUCI = '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3v6H3M9 9L3 3M15 3v6h6M15 9l6-6M9 21v-6H3M9 15l-6 6M15 21v-6h6M15 15l6 6"/></svg>';
    let intero = false;

    function schermoIntero(on) {
      intero = on;
      $("ricMapBox").classList.toggle("full", on);
      document.body.style.overflow = on ? "hidden" : "";
      const b = $("ricEspandi");
      b.innerHTML = on ? ICO_RIDUCI : ICO_ESPANDI;
      b.title = on ? "Riduci mappa" : "Espandi mappa";
      b.setAttribute("aria-label", b.title);
      setTimeout(() => { if (mappa) mappa.invalidateSize(); }, 120);
    }

    // ---------- eventi ----------
    $("ricAggiorna").addEventListener("click", carica);
    $("ricEspandi").innerHTML = ICO_ESPANDI;
    $("ricEspandi").addEventListener("click", () => schermoIntero(!intero));
    $("ricTutti").addEventListener("click", inquadraTutto);
    $("ricMe").addEventListener("click", async () => {
      const b = $("ricMe");
      b.classList.add("busy");
      const me = await attendiMe(12000);
      b.classList.remove("busy");
      if (me && mappa) {
        disegnaMe();
        mappa.setView([me.lat, me.lon], Math.max(mappa.getZoom(), 15));
      } else if (!me) {
        infoMappa("Posizione GPS non disponibile: controlla il permesso di localizzazione.", "#e8734a");
      }
    });
    document.addEventListener("keydown", e => { if (e.key === "Escape" && intero) schermoIntero(false); });
    $("ricLimitrofi").addEventListener("change", () => { schede.clear(); carica(); });
    $("ricArchiviate").addEventListener("change", () => { schede.clear(); disegna(); });

    // Nuovo comando o nuova posizione dall'intestazione: si ricarica
    document.addEventListener("fireops:posizione", () => {
      if (FireOps.attivo() === "ricerche") { schede.clear(); carica(); }
    });

    function avviaTimer() {
      fermaTimer();
      timer = setInterval(() => {
        if (FireOps.attivo() === "ricerche" && document.visibilityState === "visible") carica();
      }, AGGIORNA_MS);
    }
    function fermaTimer() { if (timer) { clearInterval(timer); timer = null; } }

    FireOps.onShow("ricerche", () => {
      carica();
      avviaTimer();
      avviaGps();
      if (mappa) setTimeout(() => mappa.invalidateSize(), 60);
    });
    FireOps.onHide("ricerche", () => {
      fermaTimer();
      fermaGps();
      if (intero) schermoIntero(false);
    });
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible" && FireOps.attivo() === "ricerche") carica();
    });
  }
});