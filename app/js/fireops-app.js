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

  // ---- Tasti funzione della home. Una voce con "voci" apre una pagina con i sotto-tasti;
  //      una voce con "href" apre direttamente il modulo. Per aggiungere un modulo basta una riga qui sotto.
  const PUMA_HOME = "https://sites.google.com/view/pumavvf/home-page";
  // Icone della sezione Misura (le stesse della vecchia pagina di Trigo)
  const ICONE = {
    altezza: '<svg viewBox="0 0 76 76" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"> <path d="M6 67h64"/><path d="M56 67V34"/><path d="M56 7l-10 15h6l-9 13h26l-9-13h6z"/> <circle cx="12" cy="57" r="3.2"/><path d="M12 57h28" stroke-dasharray="3 4"/> <path d="M12 57L56 9" stroke="#10141a"/><path d="M12 57L56 67" stroke="#10141a"/></svg>',
    avanti: '<svg viewBox="0 0 76 76" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"> <path d="M12 64L58 18M64 64L58 18" stroke="#10141a"/><path d="M12 64h52" stroke-dasharray="3 4"/> <circle cx="12" cy="64" r="4" fill="currentColor"/><circle cx="64" cy="64" r="4" fill="currentColor"/><circle cx="58" cy="18" r="5" fill="#10141a" stroke="none"/></svg>',
    snellius: '<svg viewBox="0 0 76 76" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"> <path d="M10 62L66 56L36 10z"/><path d="M37 40L10 62M37 40L66 56M37 40L36 10" stroke="#10141a"/> <circle cx="37" cy="40" r="4" fill="#10141a" stroke="none"/> <circle cx="10" cy="62" r="3.2" style="fill:var(--ics-pianificazione)"/><circle cx="66" cy="56" r="3.2" style="fill:var(--ics-pianificazione)"/><circle cx="36" cy="10" r="3.2" style="fill:var(--ics-pianificazione)"/></svg>',
    faro: '<svg viewBox="0 0 76 76" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"> <path d="M52 66l4-40h8l4 40z"/><path d="M55 26v-8h10v8"/><path d="M54 18l6-9 6 9z"/> <path d="M4 68q4-4 8 0t8 0t8 0t8 0"/><circle cx="12" cy="58" r="3.2"/> <path d="M12 58h40" stroke-dasharray="3 4"/><path d="M12 58L60 22" stroke="#10141a"/></svg>',
    area: '<svg viewBox="0 0 76 76" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"> <path d="M10 10h34v20h22v30H10z" fill="rgba(255,255,255,.2)"/> <path d="M10 68h56" stroke="#10141a"/><path d="M10 64v8M66 64v8" stroke="#10141a"/> <circle cx="10" cy="10" r="3" fill="currentColor" stroke="none"/><circle cx="44" cy="10" r="3" fill="currentColor" stroke="none"/><circle cx="44" cy="30" r="3" fill="currentColor" stroke="none"/><circle cx="66" cy="30" r="3" fill="currentColor" stroke="none"/><circle cx="66" cy="60" r="3" fill="currentColor" stroke="none"/><circle cx="10" cy="60" r="3" fill="currentColor" stroke="none"/></svg>',
    taglio: '<svg viewBox="0 0 76 76" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 50h64"/><rect x="10" y="30" width="56" height="16" rx="3" fill="rgba(255,255,255,.2)"/><path d="M38 24v28" stroke="#10141a"/><path d="M32 26l6 8 6-8" stroke="#10141a"/><path d="M14 50v14M62 50v14"/></svg>'
  };
  // Ordine e colori per famiglia: rosso = trovare (Localizzati, Ricerche), verde = misurare (Misura), giallo = addestramento (PUMA),
  // blu = comunicare e riferire, grigio = dati personali.
  const FUNZIONI = [
    {id: "localizzati", nome: "Localizzati", ico: "📍", colore: "var(--ics-operazioni)", testo: "#fff",
      sotto: "Comando competente, canali radio, percorsi e AR", href: "#/localizzati"},
    {id: "ricerche", nome: "Ricerche", ico: "🔎", colore: "var(--ics-operazioni)", testo: "#fff",
      sotto: "Ricerche in corso da Messaggistica", href: "#/ricerche"},
    {id: "misura", nome: "Misura", ico: ICONE.altezza, colore: "var(--ics-pianificazione)", testo: "#fff",
      sotto: "Alberi, altezze, distanze e aree",
      voci: [
        {nome: "Taglio alberi", ico: ICONE.taglio, href: "#/taglio", desc: "Dove fare lo scarico, quanto profondo, in che ordine tagliare"},
        {nome: "Altezza e area di proiezione", ico: ICONE.altezza, href: "#/trigo/altezza", desc: "Piante, edifici e teleferiche, con area di caduta"},
        {nome: "Intersezione in avanti", ico: ICONE.avanti, href: "#/trigo/avanti", desc: "Coordinate e dislivello di un punto da due stazioni"},
        {nome: "Intersezione all’indietro", ico: ICONE.snellius, href: "#/trigo/snellius", desc: "Snellius–Potenot: la tua posizione da tre punti noti"},
        {nome: "Problema del faro", ico: ICONE.faro, href: "#/trigo/faro", desc: "Distanza, quota o posizione di un punto, con l’alzo"},
        {nome: "Calcola area", ico: ICONE.area, href: "#/trigo/area", desc: "Superfici da foto, pianta a passi o mappa"}
      ]},
    {id: "puma", nome: "PUMA", ico: "🧑‍🚒", colore: "var(--ics-logistica)", testo: "#10141a",
      sotto: "Piattaforma Unificata Monitoraggio Addestramenti",
      voci: [
        {nome: "Home PUMA", ico: "🏠", href: PUMA_HOME, esterno: true, desc: "Il sito PUMA, si apre in una nuova scheda"},
        {nome: "Mappa addestramenti", ico: "🗺️", href: "#/pumamappa", desc: "Dove si svolgono ora gli addestramenti, con i dettagli di ciascuno"},
        {nome: "Tabella presenze", ico: "📋", href: "#/pumapresenze", desc: "Personale presente oggi negli addestramenti, con aggiornamento automatico"}
      ]},
    {id: "coem", nome: "Co.Em.", ico: "📷", colore: "var(--ics-amministrazione)", testo: "#fff",
      sotto: "Comunicazione in Emergenza",
      voci: [
        {nome: "Foto", ico: "📷", href: "#/foto", desc: "Inquadra, ruota, ingrandisci, sfoca volti e targhe, aggiungi il logo CNVVF"},
        {nome: "Comunicato", ico: "📰", href: "#/comunicato", desc: "Scrivi i fatti e l’AI prepara il comunicato, con titolo e chiusura"},
        {nome: "Video", ico: "🎬", href: "#/video", desc: "In preparazione"}
      ]},
    {id: "comunicazioni", nome: "Comunicazioni", ico: "✉️", colore: "var(--ics-amministrazione)", testo: "#fff",
      sotto: "Missioni per soccorso e mancate timbrature", href: "#/comunicazioni"},
    {id: "rapporti", nome: "Rapporti d’intervento", ico: "📝", colore: "var(--ics-amministrazione)", testo: "#fff",
      sotto: "In preparazione", href: "#/rapporti"},
    {id: "personale", nome: "Area personale", ico: "👤", colore: "var(--panel-2)", testo: "#eceff3",
      sotto: "I tuoi dati, salvati solo su questo telefono", href: "#/personale"}
  ];
  // Qualifiche del CNVVF (DM 10.02.2012 sui gradi); le sigle sono quelle in uso al comando.
  // Dove non c'è una sigla il valore è il nome per esteso.
  const QUALIFICHE = [
    ["Vigili del fuoco", [["VF", "Vigile del fuoco"], ["VE", "Vigile del fuoco esperto"], ["VESC", "Vigile del fuoco esperto scatto convenzionale"], ["VC", "Vigile del fuoco coordinatore"]]],
    ["Capi squadra e capi reparto", [["CS", "Capo squadra"], ["CSE", "Capo squadra esperto"], ["CR", "Capo reparto"]]],
    ["Ispettori e sostituti direttori", [["Viceispettore antincendi", "Viceispettore antincendi"], ["IA", "Ispettore antincendi"], ["Ispettore antincendi esperto", "Ispettore antincendi esperto"],
      ["Sostituto direttore antincendi", "Sostituto direttore antincendi"], ["Sostituto direttore antincendi capo", "Sostituto direttore antincendi capo"], ["Sostituto direttore antincendi capo esperto", "Sostituto direttore antincendi capo esperto"]]],
    ["Direttivi", [["Vice direttore", "Vice direttore"], ["D", "Direttore"], ["Direttore vice dirigente", "Direttore vice dirigente"]]],
    ["Dirigenti", [["Primo dirigente", "Primo dirigente"], ["Dirigente superiore", "Dirigente superiore"], ["Dirigente generale", "Dirigente generale"]]],
    ["Volontari", [["Vigile del fuoco volontario", "Vigile del fuoco volontario"], ["Capo squadra volontario", "Capo squadra volontario"], ["Capo reparto volontario", "Capo reparto volontario"]]]
  ];
  const HUBS = {};
  FUNZIONI.forEach(f => { if (f.voci) HUBS[f.id] = f; });

  // Moduli (un file per modulo in js/moduli/). "padre": pagina a cui torna il logo.
  // "segnaposto": modulo non ancora pronto, la pagina mostra solo l'avviso.
  const MODULI = {
    taglio: {nome: "Taglio alberi", sotto: "Scarico e sequenza di taglio", padre: "misura"},
    trigo: {nome: "Misura", sotto: "Altezze, distanze, posizione e aree", padre: "misura"},
    pumamappa: {nome: "PUMA - Mappa addestramenti", sotto: "Mappa in tempo reale", padre: "puma"},
    pumapresenze: {nome: "PUMA - Tabella presenze", sotto: "Riepilogo in tempo reale", padre: "puma"},
    localizzati: {nome: "Localizzati", sotto: "Comando competente, canali radio e numeri SO"},
    ricerche: {nome: "Ricerche", sotto: "Ricerche in corso da Messaggistica"},
    foto: {nome: "Co.Em. - Foto", sotto: "Comunicazione in Emergenza", padre: "coem"},
    video: {nome: "Co.Em. - Video", sotto: "Comunicazione in Emergenza", padre: "coem",
      segnaposto: "Il modulo Video è in preparazione."},
    comunicato: {nome: "Co.Em. - Comunicato", sotto: "Comunicazione in Emergenza", padre: "coem"},
    comunicazioni: {nome: "Comunicazioni", sotto: "Missioni per soccorso e mancate timbrature"},
    rapporti: {nome: "Rapporti d’intervento", sotto: "In preparazione",
      segnaposto: "I rapporti d’intervento arriveranno in un prossimo aggiornamento."},
    personale: {nome: "Area personale", sotto: "I tuoi dati, solo su questo telefono"}
  };

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
    if (MODULI[id] && MODULI[id].segnaposto) {
      const sp = document.createElement("section");
      sp.className = "pg pg-" + id;
      sp.hidden = true;
      sp.innerHTML = '<div class="segnaposto"><div class="segnaposto-ico" aria-hidden="true">🛠️</div><p>' +
        esc(MODULI[id].segnaposto) + '</p><a class="segnaposto-btn" href="#/' + (MODULI[id].padre || "") + '">Indietro</a></div>';
      $("view-mod").appendChild(sp);
      montati[id] = sp;
      return sp;
    }
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

  let condiviso = "";
  async function mostra(id) {
    const m = id && MODULI[id];
    if (attivo && attivo !== id) {
      (hookHide[attivo] || []).forEach(fn => { try { fn(); } catch (e) { console.error(e); } });
    }
    if (id && HUBS[id]) {                       // pagina con i sotto-tasti di una funzione
      attivo = null;
      Object.keys(montati).forEach(k => { montati[k].hidden = true; });
      $("view-mod").hidden = true;
      $("view-home").hidden = true;
      $("view-hub").hidden = false;
      mostraHub(HUBS[id]);
      $("fohHome").hidden = false;
      impostaTitolo(HUBS[id].nome, HUBS[id].sotto);
      window.scrollTo(0, 0);
      return;
    }
    $("view-hub").hidden = true;
    if (!m) {
      attivo = null;
      $("view-mod").hidden = true;
      $("view-home").hidden = false;
      $("fohHome").hidden = true;
      impostaTitolo("App", "Sala operativa · tasti funzione");
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
    else if (attivo) location.hash = "#/" + ((MODULI[attivo] && MODULI[attivo].padre) || "");
    else location.hash = "#/";
  }
  $("fohLogo").addEventListener("click", tapLogo);
  $("fohLogo").addEventListener("keydown", e => { if (e.key === "Enter") tapLogo(); });

  // =====================================================================
  // Home ICS
  // =====================================================================
  const CHEVRON = '<svg class="ics-chev" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>';
  const home = $("view-home");
  home.classList.add("fn-list");

  // Un tasto grande: icona su fondo colorato, nome, riga di spiegazione
  function creaTasto(t) {
    const a = document.createElement("a");
    a.className = "fn";
    a.style.setProperty("--c", t.colore || "var(--panel-2)");
    a.style.setProperty("--on-c", t.testo || "#fff");
    a.href = t.href || ("#/" + t.id);
    if (t.esterno) { a.target = "_blank"; a.rel = "noopener"; }
    a.innerHTML =
      '<span class="fn-swatch" aria-hidden="true">' + (t.ico || "•") + '</span>' +
      '<span class="fn-text"><span class="fn-name">' + esc(t.nome) + '</span>' +
      '<span class="fn-sub">' + esc(t.sotto || t.desc || "") + '</span></span>' + CHEVRON;
    // precarica il modulo appena il dito tocca, così l'apertura è immediata
    const m = /^#\/([\w-]+)/.exec(a.getAttribute("href"));
    if (m && MODULI[m[1]] && !MODULI[m[1]].segnaposto) a.addEventListener("pointerdown", () => { scaricaModulo(m[1]).catch(() => { }); }, {once: true});
    return a;
  }

  FUNZIONI.forEach(f => home.appendChild(creaTasto({
    id: f.id, nome: f.nome, ico: f.ico, colore: f.colore, testo: f.testo, sotto: f.sotto,
    href: f.voci ? "#/" + f.id : f.href
  })));

  // Pagina dei sotto-tasti (Misura, PUMA, Co.Em.)
  function mostraHub(f) {
    const box = $("view-hub");
    box.innerHTML = "";
    f.voci.forEach(v => box.appendChild(creaTasto({
      nome: v.nome, ico: v.ico, colore: f.colore, testo: f.testo, sotto: v.desc, href: v.href, esterno: v.esterno
    })));
  }

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
    // testo ricevuto da "Condividi": si legge una volta sola
    consumaCondiviso: () => { const v = condiviso; condiviso = ""; return v; },
    qualifiche: QUALIFICHE,
    vai: id => { location.hash = id ? "#/" + id : "#/"; },
    // dati personali salvati in locale dall'Area personale ({} se vuoti)
    personale: () => { try { return JSON.parse(localStorage.getItem("fireops_personale") || "{}") || {}; } catch (e) { return {}; } }
  });

  // Altezza dell'intestazione fissa: le barre dei wizard restano appiccicate subito sotto
  (function () {
    const h = document.querySelector(".foh");
    const aggiorna = () => document.documentElement.style.setProperty("--foh-h", Math.round(h.getBoundingClientRect().height) + "px");
    aggiorna();
    if (window.ResizeObserver) new ResizeObserver(aggiorna).observe(h);
    window.addEventListener("resize", aggiorna);
  })();

  console.info("FireOps app versione", VERSIONE);
  $("fohLogo").title = "FireOps · versione " + VERSIONE;

  // Condivisione da altre app: "Condividi > FireOps" con testo o link selezionato
  // (es. coordinate o link di Google Maps) apre Localizzati e le incolla da sole
  try {
    const q = new URLSearchParams(location.search);
    const cond = ["text", "url", "title"].map(k => (q.get(k) || "").trim()).filter(Boolean).join("\n");
    if (cond) {
      condiviso = cond;
      history.replaceState(null, "", location.pathname);
      location.hash = "#/localizzati";
    }
  } catch (e) { /* ignora */ }

  daHash();
  localizza();                  // autoposizionamento all'apertura
})();
