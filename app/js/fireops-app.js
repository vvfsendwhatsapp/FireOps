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

  const VERSIONE = "2026.09.26";                // cambiarla forza il ricaricamento dei moduli
  const DB = "../db/";                          // cartella dati del repo FireOps
  const DB_FALLBACK = "https://vvfsendwhatsapp.github.io/FireOps/db/";

  // ---- Funzioni ICS e moduli: per aggiungere un modulo basta una riga in "moduli" ----
  const SEZIONI = [
    {id: "comando", nome: "Comando", sigla: "C", colore: "var(--ics-comando)", testo: "#10141a",
      sub: "Direzione e coordinamento", moduli: []},
    {id: "operazioni", nome: "Operazioni", sigla: "O", colore: "var(--ics-operazioni)", testo: "#fff",
      sub: "Gestione dell'intervento", moduli: []},
    {id: "pianificazione", nome: "Pianificazione", sigla: "P", colore: "var(--ics-pianificazione)", testo: "#fff",
      sub: "Situazione, posizione e risorse",
      moduli: [
        {id: "localizzati", nome: "Localizzati", sotto: "Comando competente, canali radio e numeri SO",
          desc: "Comando competente, canali radio e numeri SO dalla posizione", ico: "📍"}
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

  // =====================================================================
  // Moduli
  // =====================================================================
  const registrati = {};     // id -> definizione
  const attesa = {};         // id -> resolve della registrazione
  const montati = {};        // id -> <section>
  const hookShow = {}, hookLogo = {};
  let attivo = null;

  function registra(def) {
    registrati[def.id] = def;
    if (attesa[def.id]) attesa[def.id](def);
  }

  function scaricaModulo(id) {
    if (registrati[id]) return Promise.resolve(registrati[id]);
    return new Promise((ok, ko) => {
      attesa[id] = ok;
      carica("js/moduli/" + id + ".js?v=" + VERSIONE).catch(ko);
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
      throw err;
    }
    montati[id] = sec;
    return sec;
  }

  function impostaTitolo(titolo, sotto) {
    $("fohTitolo").textContent = titolo;
    $("fohSotto").textContent = sotto || "";
    document.title = titolo === "FireOps VVF" ? titolo : "FireOps VVF - " + titolo;
  }

  async function mostra(id) {
    const m = id && MODULI[id];
    if (!m) {
      attivo = null;
      $("view-mod").hidden = true;
      $("view-home").hidden = false;
      $("fohHome").hidden = true;
      impostaTitolo("FireOps VVF", "Sala operativa · funzioni ICS");
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
      console.error(err);
      if (loading) {
        loading.classList.add("error");
        loading.textContent = "Impossibile caricare " + m.nome + ": controlla la connessione e riprova.";
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
  // API per i moduli
  // =====================================================================
  window.FireOps = Object.assign(window.FireOps || {}, {
    registra,
    carica,
    json,
    comandi: () => json("comandi.json").then(d => {
      if (!Array.isArray(d) || !d.length) throw new Error("comandi.json vuoto");
      return d;
    }),
    onShow: (id, fn) => { (hookShow[id] = hookShow[id] || []).push(fn); },
    onLogo: (id, fn) => { (hookLogo[id] = hookLogo[id] || []).push(fn); },
    vai: id => { location.hash = id ? "#/" + id : "#/"; }
  });

  daHash();
})();