/* FireOps VVF - app a pagina unica
 * Struttura:
 *   app/user.html                 guscio: intestazione comune + home ICS + contenitore moduli
 *   app/css/fireops-app.css       stile comune
 *   app/js/fireops-app.js         questo file: componi, navigazione, caricamento moduli, dati comuni
 *   app/js/moduli/<id>.js         un file per modulo, caricato solo alla prima apertura
 *
 * Un modulo si registra così:
 *   FireOps.registra({ id: "localizzati", css: "...", html: "...", init(root) { ... } });
 * Hook facoltativi dal modulo: FireOps.onShow(id, fn), FireOps.onLogo(id, fn).
 */
(function () {
  "use strict";

  const VERSIONE = window.FIREOPS_VERSIONE || String(Date.now());   // da js/versione.js
  const DB = "../db/";                          // cartella dati del repo FireOps
  const DB_FALLBACK = "https://vvfsendwhatsapp.github.io/FireOps/db/";

  // ---- Funzioni ICS e moduli: per aggiungere un modulo basta una riga in "moduli" ----
  const SEZIONI = [
    {id: "comando", nome: "Comando", sigla: "C", colore: "var(--ics-comando)", testo: "#10141a",
      sub: "Direzione e coordinamento",
     moduli: [
    {id:"foto", nome:"Co.Em.", sotto:"Comunicazione in Emergenza",
  desc:"Prepara le foto da diffondere: inquadratura, sfocatura di volti, targhe e marchi, logo CNVVF", ico:"📷"},
{id:"pumamappa", nome:"P.U.M.A. - Mappa addestramenti", sotto:"Mappa in tempo reale",
  desc:"Dove si svolgono ora gli addestramenti, con i dettagli di ciascuno", ico:"🗺️"},
{id:"pumapresenze", nome:"P.U.M.A. - Tabella Presenze", sotto:"Riepilogo in tempo reale",
  desc:"Personale presente oggi negli addestramenti, con aggiornamento automatico", ico:"📋"}
       ]},
    {id: "operazioni", nome: "Operazioni", sigla: "O", colore: "var(--ics-operazioni)", testo: "#fff",
      sub: "Gestione dell'intervento",
      moduli: [
        {id: "ricerche", nome: "Ricerche", sotto: "Ricerche in corso da Messaggistica",
          desc: "Ricerche per intervento con la posizione migliore: tuo comando e limitrofi entro 50 km", ico: "🔎"},
        {id: "taglio", nome: "Taglio alberi", sotto: "Fibre compresse e tese, scarico e sequenza di taglio",
          desc: "Dove fare lo scarico e quanto profondo, in che ordine tagliare tronchi e rami", ico: "🪚"}
      ]},
    {id: "pianificazione", nome: "Pianificazione", sigla: "P", colore: "var(--ics-pianificazione)", testo: "#fff",
      sub: "Situazione, posizione e risorse",
    moduli: [
      {id: "localizzati", nome: "Localizzati", sotto: "Comando competente, canali radio e numeri SO",
        desc: "Comando competente, canali radio e numeri SO dalla posizione", ico: "📍"},
      {id: "trigo", nome: "Trigo", sotto: "Altezze, distanze, posizione e aree",
        desc: "Altezza di piante ed edifici, problema del faro, Snellius–Potenot, calcolo area da foto o pianta", ico: "📐"}
    ]},
    {id: "logistica", nome: "Logistica", sigla: "L", colore: "var(--ics-logistica)", testo: "#10141a",
      sub: "Mezzi, materiali e supporto", moduli: []},
    {id: "amministrazione", nome: "Amministrazione", sigla: "A", colore: "var(--ics-amministrazione)", testo: "#fff",
      sub: "Pratiche e comunicazioni del personale",
      moduli: [
        {id: "comunicazioni", nome: "Comunicazioni", sotto: "Missioni per soccorso e mancate timbrature",
          desc: "Missioni per soccorso e mancate timbrature via email", ico: "✉️"}
      ]}
  ];

  const MODULI = {};
  SEZIONI.forEach(s => s.moduli.forEach(m => { MODULI[m.id] = m; }));

  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;"}[c]));

  // =====================================================================
  // Componi + 4146
  // =====================================================================
  const PREFIX = "41460039";
  let prefisso = true;
  try { prefisso = localStorage.getItem("fireops_prefix") !== "0"; } catch (e) { }

  const cifre = v => (v || "").toString().replace(/[^0-9]/g, "");
  function nazionale(d) {
    if (d.startsWith("0039")) return d.slice(4);
    if (d.startsWith("39") && d.length >= 11) return d.slice(2);
    return d;
  }

  function telHref(num) {
    const raw = (num || "").toString();
    if (!prefisso) return "tel:" + raw.replace(/[^0-9+]/g, "");
    return "tel:" + PREFIX + nazionale(cifre(raw));
  }

  function aggiornaDial() {
    const d = cifre($("fohInput").value);
    const ok = d.length > 0;
    const n = nazionale(d);
    const set = (id, href) => {
      const a = $(id);
      a.href = ok ? href : "javascript:void(0)";
      a.classList.toggle("off", !ok);
    };
    set("fohCall", telHref(d));
    set("fohWa", "https://wa.me/39" + n);
    set("fohTg", "https://t.me/+39" + n);
  }

  $("fohPfx").setAttribute("aria-pressed", prefisso ? "true" : "false");
  $("fohPfx").addEventListener("click", function () {
    prefisso = !prefisso;
    this.setAttribute("aria-pressed", prefisso ? "true" : "false");
    try { localStorage.setItem("fireops_prefix", prefisso ? "1" : "0"); } catch (e) { }
    aggiornaDial();
    document.dispatchEvent(new CustomEvent("fireops:prefisso", {detail: {attivo: prefisso}}));
  });
  $("fohInput").addEventListener("input", aggiornaDial);
  aggiornaDial();

  window.FireOpsDial = {telHref, prefisso: () => prefisso};

  // =====================================================================
  // Dati comuni (caricati una volta, condivisi tra i moduli)
  // =====================================================================
  const cacheJson = {};
  function json(nome) {
    if (!cacheJson[nome]) {
      cacheJson[nome] = (async () => {
        for (const base of [DB, DB_FALLBACK]) {
          try {
            const r = await fetch(base + nome, {cache: "no-cache"});
            if (r.ok) return await r.json();
          } catch (e) { }
        }
        delete cacheJson[nome];                 // riprova alla prossima richiesta
        throw new Error(nome + " non disponibile");
      })();
    }
    return cacheJson[nome];
  }

  // ---- Comandi: db/comandi.json ha i nomi di colonna del foglio ("Comando", "Provincia", ...).
  // Qui vengono convertiti una volta sola nel formato corto usato dai moduli (c, pr, rg, ...).
  function radio(v) {
    const t = String(v == null ? "" : v).trim();
    return /^\d+$/.test(t) ? t.padStart(3, "0") : t;
  }

  function daFoglio(x) {
    if (x.c) return x;                                  // già nel formato corto
    const conf = [];
    for (let i = 1; i <= 9; i++) {
      const n = String(x["Comando confinante " + i] || "").trim();
      if (n) conf.push(n);
    }
    if (!conf.length && x["Concatena Comandi Confinanti"]) {
      String(x["Concatena Comandi Confinanti"]).split(";").map(t => t.trim()).filter(Boolean).forEach(n => conf.push(n));
    }
    return {
      c: String(x["Comando"] || "").trim(),
      pr: String(x["Provincia"] || "").trim().toUpperCase(),
      rg: x["Regione"] || "",
      cm: x["Comune"] || "",
      dz: x["Direzione VVF"] || "",
      lat: parseFloat(x["Latitudine"]),
      lon: parseFloat(x["Longitudine"]),                // nel file è testo con zero iniziale ("012.061362")
      ind: x["Indirizzo Completo"] || "",
      rc: radio(x["Canale Radio Comando"]),
      rd: radio(x["Canale Radio Direzione"]),
      tsc: x["Telefono SO Comando"] || "",
      tsd: x["Telefono SO Direzione"] || "",
      tc: x["Telefono Centralino"] || "",
      nue: x["115/NUE base"] || "",
      esc: x["email SO Comando"] || "",
      ecom: x["email Comando"] || "",
      web: x["sito web Comando"] || "",
      olc: x["OLC"] || "",
      conf
    };
  }

  // Sale non provinciali (es. "Lombardia COR AIB CURNO") restano fuori da ricerca provincia e destinatari
  const NON_COMANDO = /\b(COR|AIB)\b/i;

  let cacheComandi = null;
  function comandi() {
    if (!cacheComandi) {
      cacheComandi = json("comandi.json").then(d => {
        const righe = Array.isArray(d) ? d : (d && Array.isArray(d.comandi) ? d.comandi : []);
        const out = righe.map(daFoglio)
          .filter(c => c.c && !NON_COMANDO.test(c.c) && isFinite(c.lat) && isFinite(c.lon));
        if (!out.length) throw new Error("comandi.json: nessun comando riconosciuto");
        return out;
      }).catch(err => {
        cacheComandi = null;                            // riprova alla prossima richiesta
        throw err;
      });
    }
    return cacheComandi;
  }

  // Carica una sola volta script e fogli di stile esterni (es. Leaflet)
  const caricati = {};
  function carica(url) {
    if (!caricati[url]) {
      caricati[url] = new Promise((ok, ko) => {
        let el;
        if (/\.css(\?|$)/.test(url)) {
          el = document.createElement("link");
          el.rel = "stylesheet";
          el.href = url;
        } else {
          el = document.createElement("script");
          el.src = url;
        }
        el.onload = ok;
        el.onerror = () => { delete caricati[url]; ko(new Error("Impossibile caricare " + url)); };
        document.head.appendChild(el);
      });
    }
    return caricati[url];
  }

  // Leaflet condiviso: più fonti in ordine, restituisce true se disponibile
  const LEAFLET_FONTI = [
    ["https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css", "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js"],
    ["https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.css", "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.js"],
    ["https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css", "https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js"]
  ];
  let leafletPromessa = null;
  function leaflet() {
    if (typeof window.L !== "undefined") return Promise.resolve(true);
    if (!leafletPromessa) {
      leafletPromessa = (async () => {
        for (const [css, js] of LEAFLET_FONTI) {
          try {
            await Promise.all([carica(css), carica(js)]);
            if (typeof window.L !== "undefined") return true;
          } catch (e) { console.warn("Leaflet non disponibile da", js); }
        }
        return false;
      })().finally(() => { leafletPromessa = null; });
    }
    return leafletPromessa;
  }

  // =====================================================================
  // Moduli
  // =====================================================================
  const registrati = {};     // id -> definizione
  const attesa = {};         // id -> resolve della registrazione
  const montati = {};        // id -> <section>
  const hookShow = {}, hookLogo = {}, hookHide = {};
  let attivo = null;

  function registra(def) {
    registrati[def.id] = def;
    if (attesa[def.id]) attesa[def.id](def);
  }

  function scaricaModulo(id) {
    if (registrati[id]) return Promise.resolve(registrati[id]);
    const url = "js/moduli/" + id + ".js?v=" + VERSIONE;
    return new Promise((ok, ko) => {
      attesa[id] = ok;
      carica(url).then(() => {
        // file scaricato ma il modulo non si è registrato: di solito un errore di sintassi
        setTimeout(() => {
          if (!registrati[id]) {
            delete caricati[url];
            ko(new Error("il file " + url + " è stato scaricato ma non contiene il modulo \"" + id + "\""));
          }
        }, 0);
      }).catch(() => ko(new Error("file non trovato o non scaricabile: " + new URL(url, location.href).href)));
    });
  }

  async function montaModulo(id) {
    if (montati[id]) return montati[id];
    const def = await scaricaModulo(id);
    if (def.css) {
      const st = document.createElement("style");
      st.dataset.modulo = id;
      st.textContent = def.css;
      document.head.appendChild(st);
    }
    const sec = document.createElement("section");
    sec.className = "pg pg-" + id;
    sec.hidden = true;
    sec.innerHTML = def.html || "";
    $("view-mod").appendChild(sec);
    try {
      if (def.init) await def.init(sec);
    } catch (err) {
      sec.remove();                           // al prossimo tentativo si riparte da zero
      const e = new Error("errore all'avvio del modulo: " + (err && err.message ? err.message : err));
      e.dettaglio = err;
      throw e;
    }
    montati[id] = sec;
    return sec;
  }

  // Titolo sempre nella forma "FireOps VVF - <sezione>" (home: "App")
  function impostaTitolo(titolo, sotto) {
    const t = "FireOps VVF - " + titolo;
    $("fohTitolo").textContent = t;
    $("fohTitolo").title = t;
    $("fohSotto").textContent = sotto || "";
    document.title = t;
  }

  async function mostra(id) {
    const m = id && MODULI[id];
    if (attivo && attivo !== id) {
      (hookHide[attivo] || []).forEach(fn => { try { fn(); } catch (e) { console.error(e); } });
    }
    if (!m) {
      attivo = null;
      $("view-mod").hidden = true;
      $("view-home").hidden = false;
      $("fohHome").hidden = true;
      impostaTitolo("App", "Sala operativa · funzioni ICS");
      window.scrollTo(0, 0);
      return;
    }

    attivo = id;
    $("view-home").hidden = true;
    $("view-mod").hidden = false;
    $("fohHome").hidden = false;
    impostaTitolo(m.nome, m.sotto);
    Object.keys(montati).forEach(k => { montati[k].hidden = true; });

    let loading = null;
    if (!montati[id]) {
      loading = document.createElement("div");
      loading.className = "mod-loading";
      loading.textContent = "Caricamento " + m.nome + "…";
      $("view-mod").appendChild(loading);
    }

    try {
      const sec = await montaModulo(id);
      if (loading) loading.remove();
      if (attivo !== id) return;               // nel frattempo l'utente è andato altrove
      sec.hidden = false;
      window.scrollTo(0, 0);
      (hookShow[id] || []).forEach(fn => { try { fn(); } catch (e) { console.error(e); } });
    } catch (err) {
      console.error(err, err && err.dettaglio);
      if (loading) {
        loading.classList.add("error");
        loading.innerHTML = "";
        const t = document.createElement("div");
        t.textContent = "Impossibile aprire " + m.nome + ".";
        const d = document.createElement("div");
        d.className = "mod-err-det";
        d.textContent = err && err.message ? err.message : String(err);
        const b = document.createElement("button");
        b.type = "button";
        b.className = "mod-retry";
        b.textContent = "Riprova";
        b.addEventListener("click", () => { loading.remove(); mostra(id); });
        loading.append(t, d, b);
      }
    }
  }

  // Navigazione con #/modulo: il tasto indietro del telefono riporta alla home
  function daHash() {
    const id = (location.hash.match(/^#\/([\w-]+)/) || [])[1] || null;
    mostra(id);
  }
  window.addEventListener("hashchange", daHash);

  // Logo: dentro un modulo lo azzera (se il modulo lo prevede), altrimenti porta alla home
  function tapLogo() {
    if (attivo && hookLogo[attivo] && hookLogo[attivo].length) hookLogo[attivo].forEach(fn => fn());
    else if (attivo) location.hash = "#/";
  }
  $("fohLogo").addEventListener("click", tapLogo);
  $("fohLogo").addEventListener("keydown", e => { if (e.key === "Enter") tapLogo(); });

  // =====================================================================
  // Home ICS
  // =====================================================================
  const CHEVRON = '<svg class="ics-chev" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>';
  const home = $("view-home");

  function salvaAperta(id) {
    try { id ? localStorage.setItem("fireops_home_sezione", id) : localStorage.removeItem("fireops_home_sezione"); } catch (e) { }
  }

  SEZIONI.forEach(s => {
    const box = document.createElement("section");
    box.className = "ics";
    box.id = "ics-" + s.id;
    box.style.setProperty("--c", s.colore);
    box.style.setProperty("--on-c", s.testo);

    const n = s.moduli.length;
    const head = document.createElement("button");
    head.type = "button";
    head.className = "ics-head";
    head.setAttribute("aria-expanded", "false");
    head.innerHTML =
      '<span class="ics-swatch" aria-hidden="true">' + s.sigla + '</span>' +
      '<span class="ics-text"><span class="ics-name">' + esc(s.nome) + '</span>' +
      '<span class="ics-sub">' + esc(s.sub) + ' · ' + (n === 1 ? "1 modulo" : n + " moduli") + '</span></span>' +
      CHEVRON;

    const body = document.createElement("div");
    body.className = "ics-body";
    if (n) {
      s.moduli.forEach(m => {
        const a = document.createElement("a");
        a.className = "mod";
        a.href = "#/" + m.id;
        a.innerHTML =
          '<span class="mod-ico" aria-hidden="true">' + (m.ico || "•") + '</span>' +
          '<span class="mod-text"><span class="mod-name">' + esc(m.nome) + '</span>' +
          (m.desc ? '<span class="mod-desc">' + esc(m.desc) + '</span>' : '') + '</span>';
        // precarica il modulo appena il dito tocca, così l'apertura è immediata
        a.addEventListener("pointerdown", () => { scaricaModulo(m.id).catch(() => { }); }, {once: true});
        body.appendChild(a);
      });
    } else {
      body.innerHTML = '<div class="empty">Nessun modulo in questa funzione per ora.</div>';
    }

    head.addEventListener("click", () => {
      const apri = !box.classList.contains("open");
      home.querySelectorAll(".ics.open").forEach(x => {
        x.classList.remove("open");
        x.querySelector(".ics-head").setAttribute("aria-expanded", "false");
      });
      if (apri) {
        box.classList.add("open");
        head.setAttribute("aria-expanded", "true");
      }
      home.classList.toggle("has-open", apri);
      salvaAperta(apri ? s.id : null);
    });

    box.append(head, body);
    home.appendChild(box);
  });

  try {
    const ultima = localStorage.getItem("fireops_home_sezione");
    if (ultima && $("ics-" + ultima)) $("ics-" + ultima).querySelector(".ics-head").click();
  } catch (e) { }

  // =====================================================================
  // Autoposizionamento: all'apertura rileva la posizione e mostra il comando competente
  // =====================================================================
  const posEl = $("fohPos");
  let posUltima = null;          // {lat, lon, acc, comando, metodo, ora}
  let posInCorso = null;
  let autoLocalizzati = false;

  const CHIAVE_MANUALE = "fireops_comando_manuale";

  function statoPos(stato, testoHtml) {
    posEl.classList.remove("ok", "busy", "err", "man");
    if (stato) posEl.classList.add(stato);
    $("fohPosCmd").innerHTML = testoHtml;
    $("fohPosCmd").hidden = false;
    $("fohPosSel").hidden = true;
    if (stato !== "ok" && stato !== "man") {
      $("fohPosCh").hidden = true;
      $("fohPosSo").hidden = true;
    }
  }

  // ---- Scelta manuale: menu con tutti i comandi, al posto del nome ----
  async function mostraScelta(messaggio) {
    const sel = $("fohPosSel");
    let elenco = [];
    try { elenco = await comandi(); } catch (e) { }
    if (!elenco.length) return false;               // senza elenco resta il messaggio d'errore

    if (sel.options.length <= 1) {
      elenco.slice().sort((a, b) => a.c.localeCompare(b.c, "it")).forEach(c => {
        const o = document.createElement("option");
        o.value = c.c;
        o.textContent = c.c + (c.pr ? " (" + c.pr + ")" : "");
        sel.appendChild(o);
      });
    }
    sel.options[0].textContent = messaggio || "Scegli il comando…";
    sel.value = posUltima && posUltima.metodo === "manuale" ? posUltima.comando.c : "";
    $("fohPosCmd").hidden = true;
    sel.hidden = false;
    return true;
  }

  $("fohPosSel").addEventListener("change", async function () {
    if (!this.value) return;
    const elenco = await comandi();
    const c = elenco.find(x => x.c === this.value);
    if (!c) return;
    try { localStorage.setItem(CHIAVE_MANUALE, c.c); } catch (e) { }
    posUltima = {lat: null, lon: null, acc: null, comando: c, metodo: "manuale", ora: Date.now()};
    mostraPos();
    document.dispatchEvent(new CustomEvent("fireops:posizione", {detail: posUltima}));
  });

  // Posizione non arrivata: ripropone l'ultimo comando scelto a mano, altrimenti apre il menu
  async function fallbackManuale(messaggio) {
    let salvato = null;
    try { salvato = localStorage.getItem(CHIAVE_MANUALE); } catch (e) { }
    if (salvato) {
      try {
        const c = (await comandi()).find(x => x.c === salvato);
        if (c) {
          posUltima = {lat: null, lon: null, acc: null, comando: c, metodo: "manuale", ora: Date.now()};
          mostraPos();
          return;
        }
      } catch (e) { }
    }
    await mostraScelta(messaggio);
  }

  function normTxt(t) {
    return String(t || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }

  function distKm(a, b, c, d) {
    const R = 6371, r = Math.PI / 180;
    const x = Math.sin((c - a) * r / 2) ** 2 + Math.cos(a * r) * Math.cos(c * r) * Math.sin((d - b) * r / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  }

  // Provincia via Nominatim (stessa logica di Localizzati); se la rete non risponde, comando più vicino
  async function comandoDa(lat, lon, elenco) {
    try {
      const ctrl = new AbortController();
      const tmo = setTimeout(() => ctrl.abort(), 7000);
      const r = await fetch("https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=" + lat + "&lon=" + lon +
        "&addressdetails=1&accept-language=it&zoom=8", {headers: {"Accept": "application/json"}, signal: ctrl.signal});
      clearTimeout(tmo);
      if (r.ok) {
        const a = (await r.json()).address || {};
        const pr = a["ISO3166-2-lvl6"] ? a["ISO3166-2-lvl6"].split("-").pop().toUpperCase() : null;
        let rec = pr ? elenco.find(c => c.pr === pr) : null;
        if (!rec && a.county) {
          const n = normTxt(a.county.replace(/^(provincia di|libera consortile di|libero consorzio( comunale)? di|citt[aà] metropolitana di)\s*/i, ""));
          rec = elenco.find(c => normTxt(c.cm) === n || normTxt(c.c) === n);
        }
        if (rec) return {comando: rec, metodo: "provincia"};
      }
    } catch (e) { }
    const vicino = elenco.slice().sort((x, y) => distKm(lat, lon, x.lat, x.lon) - distKm(lat, lon, y.lat, y.lon))[0];
    return vicino ? {comando: vicino, metodo: "vicinanza"} : null;
  }

  function mostraPos() {
    const p = posUltima;
    if (!p || !p.comando) return;
    const c = p.comando;
    if (!c.c) { statoPos("err", "Comando non riconosciuto nei dati"); return; }
    if (p.metodo === "manuale") {
      statoPos("man", "");
      mostraScelta("Scegli il comando…");
      $("fohPosSel").title = "Comando scelto a mano. Tocca ⟳ per riprovare con la posizione.";
    } else {
      statoPos("ok", "Comando <b>" + esc(c.c) + "</b>" + (p.metodo === "vicinanza" ? " (stima)" : ""));
      $("fohPosCmd").title = p.metodo === "vicinanza"
        ? "Provincia non verificata via rete: comando con sede più vicina. Tocca per i dettagli."
        : "Comando competente per la tua posizione. Tocca per i dettagli.";
    }
    const ch = $("fohPosCh");
    ch.hidden = !c.rc;
    ch.textContent = c.rc ? "📻 " + c.rc : "";
    ch.title = "Canale radio Comando" + (c.rd ? " · DR " + c.rd : "");
    const so = $("fohPosSo");
    so.hidden = !c.tsc;
    if (c.tsc) {
      so.href = telHref(c.tsc);
      so.title = "Chiama la SO di " + c.c + " (" + c.tsc + ")";
    }
  }

  function localizza() {
    if (posInCorso) return posInCorso;
    if (!navigator.geolocation) {
      statoPos("err", "Posizione non supportata dal dispositivo");
      fallbackManuale("Posizione non supportata: scegli il comando…");
      return Promise.resolve(null);
    }
    statoPos("busy", posUltima && posUltima.metodo !== "manuale" ? "Aggiornamento posizione…" : "Localizzazione in corso…");
    posInCorso = new Promise(resolve => {
      navigator.geolocation.getCurrentPosition(async pos => {
        try {
          const lat = pos.coords.latitude, lon = pos.coords.longitude;
          let elenco = [];
          try { elenco = await comandi(); } catch (e) { console.warn(e); }
          const ris = elenco.length ? await comandoDa(lat, lon, elenco) : null;
          if (!ris) {
            statoPos("err", "Posizione rilevata, elenco comandi non disponibile");
            resolve(null);
            return;
          }
          posUltima = {lat, lon, acc: pos.coords.accuracy, comando: ris.comando, metodo: ris.metodo, ora: Date.now()};
          mostraPos();
          document.dispatchEvent(new CustomEvent("fireops:posizione", {detail: posUltima}));
          resolve(posUltima);
        } finally {
          posInCorso = null;
        }
      }, err => {
        posInCorso = null;
        const msg = err.code === 1 ? "Posizione non autorizzata: scegli il comando…" : "Posizione non disponibile: scegli il comando…";
        statoPos("err", err.code === 1 ? "Posizione non autorizzata" : "Posizione non disponibile");
        fallbackManuale(msg).then(() => resolve(posUltima));
      }, {enableHighAccuracy: true, timeout: 12000, maximumAge: 120000});
    });
    return posInCorso;
  }

  $("fohPosRef").addEventListener("click", localizza);
  document.addEventListener("fireops:prefisso", mostraPos);

  // Il nome del comando apre Localizzati e lo avvia già localizzato
  $("fohPosCmd").addEventListener("click", () => { autoLocalizzati = true; });

  // =====================================================================
  // API per i moduli
  // =====================================================================
  window.FireOps = Object.assign(window.FireOps || {}, {
    registra,
    carica,
    leaflet,
    json,
    comandi,
    onShow: (id, fn) => { (hookShow[id] = hookShow[id] || []).push(fn); },
    onLogo: (id, fn) => { (hookLogo[id] = hookLogo[id] || []).push(fn); },
    onHide: (id, fn) => { (hookHide[id] = hookHide[id] || []).push(fn); },
    attivo: () => attivo,
    posizione: () => posUltima,
    localizza,
    // true una sola volta dopo un tocco sul comando in alto
    consumaAutoLocalizzati: () => { const v = autoLocalizzati; autoLocalizzati = false; return v; },
    vai: id => { location.hash = id ? "#/" + id : "#/"; }
  });

  console.info("FireOps app versione", VERSIONE);
  $("fohLogo").title = "FireOps · versione " + VERSIONE;

  daHash();
  localizza();                  // autoposizionamento all'apertura
})();
