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
.pg-ricerche #ricMap { height: 240px; background: #1d242e; }
.pg-ricerche .map-msg { padding: 12px 14px; font-size: 12.5px; color: var(--text-dim); }

.pg-ricerche .stato {
  margin-top: 14px; padding: 16px 14px; text-align: center; font-size: 13.5px; color: var(--text-dim);
  background: var(--panel); border: 1px dashed var(--line); border-radius: 6px; line-height: 1.5;
}
.pg-ricerche .stato.err { color: #e8734a; border-color: #5a3326; }

.pg-ricerche .lista { margin-top: 10px; display: flex; flex-direction: column; gap: 10px; }

.pg-ricerche .ric {
  background: var(--panel); border: 1px solid var(--line); border-radius: 6px; overflow: hidden;
  border-left: 4px solid var(--text-dim);
}
.pg-ricerche .ric.ok { border-left-color: #3fa66b; }
.pg-ricerche .ric.wait { border-left-color: #e6c200; }
.pg-ricerche .ric.arch { opacity: .55; }
.pg-ricerche .ric.flash { box-shadow: 0 0 0 2px var(--ics-operazioni); }

.pg-ricerche .ric-head { display: flex; align-items: flex-start; gap: 10px; padding: 12px 14px 6px; }
.pg-ricerche .ric-num {
  flex: none; width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
  background: var(--ics-operazioni); color: #fff; font-size: 12.5px; font-weight: 800;
}
.pg-ricerche .ric.wait .ric-num { background: #3a3320; color: #e6c200; }
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
.pg-ricerche .ric-act .nav { background: #e6c200; border-color: #e6c200; color: #000; }

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
    let mappa = null, strato = null;
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

    // ---------- elaborazione ----------
    function elabora() {
      const {messaggi, posizioni, ctx} = ultimoDato;
      const mio = ctx.comando.c;
      const mostraArch = $("ricArchiviate").checked;
      const lim = $("ricLimitrofi").checked;
      let escluseAttesa = 0, escluseLontane = 0;

      const lista = [];
      messaggi.forEach(m => {
        const archiviata = String(m.Archiviata).toUpperCase() === "TRUE";
        if (archiviata && !mostraArch) return;

        const pos = posizioni
          .filter(p => p.IdRicerca && p.IdRicerca === m.IdRicerca)
          .map(p => ({...p, _lat: num(p.Lat), _lon: num(p.Lng), _t: data(p.Timestamp)}))
          .filter(p => isFinite(p._lat) && isFinite(p._lon));
        pos.sort((a, b) => (a._t ? a._t.getTime() : 0) - (b._t ? b._t.getTime() : 0));
        const ultima = pos.length ? pos[pos.length - 1] : null;

        const eMio = m.Comando === mio;
        let dist = null;
        if (ultima && ctx.me) dist = km(ctx.me.lat, ctx.me.lon, ultima._lat, ultima._lon);

        if (!eMio) {
          if (!lim || !ctx.me) return;
          if (!ultima) { escluseAttesa++; return; }
          if (dist > RAGGIO_KM) { escluseLontane++; return; }
        }

        lista.push({m, pos, ultima, eMio, dist, archiviata, t: data(m.Timestamp)});
      });

      // prima quelle con posizione, poi in attesa; archiviate in fondo; più recenti in cima
      lista.sort((a, b) => {
        if (a.archiviata !== b.archiviata) return a.archiviata ? 1 : -1;
        if (!!a.ultima !== !!b.ultima) return a.ultima ? -1 : 1;
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
      note.push("Periodo: ultime " + ORE + " ore. Per archiviare usa Messaggistica.");
      $("ricNota").textContent = note.join(" ");

      if (!lista.length) {
        mostraStato("Nessuna ricerca in corso per " + ctx.comando.c +
          ($("ricLimitrofi").checked && ctx.me ? " e per i limitrofi entro " + RAGGIO_KM + " km" : "") + " nelle ultime " + ORE + " ore.");
        disegnaMappa([], ctx);
        return;
      }
      $("ricStato").hidden = true;

      const nuove = new Map();
      const elementi = lista.map((r, i) => {
        const chiave = r.m.IdRicerca || ("_" + i);
        const firma = [r.pos.length, r.archiviata, r.dist == null ? "" : Math.round(r.dist * 10), i + 1].join("|");
        const ex = schede.get(chiave);
        const el = ex && ex.firma === firma ? ex.el : scheda(r, i + 1, ctx);
        nuove.set(chiave, {el, firma});
        return el;
      });
      schede.clear();
      nuove.forEach((v, k) => schede.set(k, v));
      $("ricLista").replaceChildren(...elementi);
      disegnaMappa(lista, ctx);
    }

    function scheda(r, n, ctx) {
      const {m, pos, ultima, eMio, dist, archiviata} = r;
      const el = document.createElement("div");
      el.className = "ric " + (ultima ? "ok" : "wait") + (archiviata ? " arch" : "");
      el.dataset.id = m.IdRicerca || "";

      const inviato = data(m.Timestamp);
      const stato = ultima
        ? "Posizione ricevuta" + (pos.length > 1 ? " (" + pos.length + " letture)" : "")
        : "In attesa della posizione";

      let h =
        '<div class="ric-head">' +
          '<div class="ric-num">' + n + '</div>' +
          '<div class="ric-t"><div class="ric-stato">' + stato + (archiviata ? " · archiviata" : "") + '</div>' +
          '<div class="ric-meta">Inviato ' + ora(inviato) + (inviato ? " (" + fa(inviato) + ")" : "") + '</div></div>' +
          '<span class="tag' + (eMio ? " mio" : "") + '">' + (eMio ? "Mio comando" : esc(m.Comando || "Limitrofo")) + '</span>' +
        '</div>' +
        '<div class="ric-body">' +
          (m.NumeroIntervento ? 'Intervento <b>' + esc(m.NumeroIntervento) + '</b>' + (m.AnnoIntervento ? '/' + esc(m.AnnoIntervento) : '') + ' · ' : '') +
          'al n° <b>' + esc(maschera(m.NumeroTelefono)) + '</b>' + (m.Canale ? ' via <b>' + esc(m.Canale) + '</b>' : '') +
          '<br><span class="ric-id">ID ' + esc(m.IdRicerca || "-") + '</span>' +
        '</div>';

      if (ultima) {
        const coord = ultima._lat.toFixed(6) + ", " + ultima._lon.toFixed(6);
        const acc = num(ultima.Accuratezza);
        h +=
          '<div class="pos">' +
            '<div class="pos-row"><span>Coordinate</span><span class="copia" data-copia="' + coord + '">' + coord + '</span></div>' +
            (isFinite(acc) ? '<div class="pos-row"><span>Precisione</span><span>±' + Math.round(acc) + ' m' + (ultima.Fonte ? ' · ' + esc(ultima.Fonte) : '') + '</span></div>' : '') +
            '<div class="pos-row"><span>Ricevuta</span><span>' + ora(ultima._t) + (ultima._t ? ' (' + fa(ultima._t) + ')' : '') + '</span></div>' +
            (ctx.me ? '<div class="pos-row"><span>Da me</span><span>' + fmtKm(dist) + ' · ' + az(ctx.me.lat, ctx.me.lon, ultima._lat, ultima._lon) + '</span></div>' : '') +
          '</div>' +
          '<div class="ric-act">' +
            '<button type="button" class="nav">Naviga</button>' +
            '<button type="button" class="vedi">Sulla mappa</button>' +
          '</div>';
      }
      el.innerHTML = h;

      const c = el.querySelector(".copia");
      if (c) c.addEventListener("click", () => copia(c, c.dataset.copia));
      const nav = el.querySelector(".nav");
      if (nav) nav.addEventListener("click", () => {
        window.open("https://www.google.com/maps/dir/?api=1&destination=" + ultima._lat.toFixed(6) + "," + ultima._lon.toFixed(6) +
          "&travelmode=driving&dir_action=navigate", "_blank", "noopener");
      });
      const vedi = el.querySelector(".vedi");
      if (vedi) vedi.addEventListener("click", () => {
        if (!mappa) return;
        $("ricMapBox").scrollIntoView({behavior: "smooth", block: "center"});
        mappa.setView([ultima._lat, ultima._lon], Math.max(mappa.getZoom(), 15));
      });
      return el;
    }

    // ---------- mappa ----------
    function icona(n, colore, testo) {
      return L.divIcon({
        className: "", iconSize: [26, 26], iconAnchor: [13, 13],
        html: '<div style="width:26px;height:26px;border-radius:50%;background:' + colore + ';color:' + testo +
          ';border:2px solid #10141a;display:flex;align-items:center;justify-content:center;font:800 12px system-ui">' + n + '</div>'
      });
    }

    async function disegnaMappa(lista, ctx) {
      const conPos = lista.filter(r => r.ultima);
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
      }
      strato.clearLayers();
      const punti = [];

      if (ctx.me) {
        L.circleMarker([ctx.me.lat, ctx.me.lon], {radius: 8, color: "#10141a", weight: 2.5, fillColor: "#ffd700", fillOpacity: 1})
          .bindPopup("La mia posizione").addTo(strato);
        if ($("ricLimitrofi").checked) {
          L.circle([ctx.me.lat, ctx.me.lon], {radius: RAGGIO_KM * 1000, color: "#ffd700", weight: 1, opacity: .5, fillOpacity: .03, dashArray: "4,6", interactive: false}).addTo(strato);
        }
        punti.push([ctx.me.lat, ctx.me.lon]);
      }

      lista.forEach((r, i) => {
        if (!r.ultima) return;
        const n = i + 1, p = r.ultima;
        const acc = num(p.Accuratezza);
        if (isFinite(acc) && acc > 0) {
          L.circle([p._lat, p._lon], {radius: acc, color: "#d8262f", weight: 1, fillOpacity: .12, interactive: false}).addTo(strato);
        }
        L.marker([p._lat, p._lon], {icon: icona(n, r.archiviata ? "#8b96a3" : "#d8262f", "#fff")})
          .bindPopup("<b>" + n + ". " + esc(r.m.Comando || "") + "</b><br>" + p._lat.toFixed(6) + ", " + p._lon.toFixed(6) +
            (isFinite(acc) ? "<br>±" + Math.round(acc) + " m" : "") + "<br>" + ora(p._t))
          .on("click", () => {
            const el = [...$("ricLista").children].find(x => x.dataset.id === (r.m.IdRicerca || ""));
            if (el) {
              el.classList.add("flash");
              setTimeout(() => el.classList.remove("flash"), 1600);
            }
          })
          .addTo(strato);
        punti.push([p._lat, p._lon]);
      });

      setTimeout(() => {
        mappa.invalidateSize();
        if (punti.length === 1) mappa.setView(punti[0], 14);
        else mappa.fitBounds(L.latLngBounds(punti), {padding: [30, 30], maxZoom: 15});
      }, 50);
    }

    // ---------- eventi ----------
    $("ricAggiorna").addEventListener("click", carica);
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
      if (mappa) setTimeout(() => mappa.invalidateSize(), 60);
    });
    FireOps.onHide("ricerche", fermaTimer);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible" && FireOps.attivo() === "ricerche") carica();
    });
  }
});