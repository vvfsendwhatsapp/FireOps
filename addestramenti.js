// ==========================================================
// FireOps VVF — ADDESTRAMENTI ODIERNI (pulsante "F" accanto a 8P)
//
// Legge dal foglio PUMA (Real_Time_Map) gli addestramenti di oggi e li
// divide in tre gruppi rispetto al Comando attivo:
//   1. Comando         → organizzati dal Comando attivo
//   2. Comandi limitrofi → organizzati da un Comando confinante
//   3. Direzione regionale → organizzati da un altro Comando della stessa
//                            Direzione (i limitrofi non vengono ripetuti)
// Per ogni addestramento: logo e tipologia (stessi loghi di PUMA),
// organizzatore, squadra, area, orario, partecipanti, link alla mappa PUMA.
//
// Il pulsante mostra un contatore (notifica) e si accende quando compaiono
// addestramenti nuovi rispetto all'ultima apertura. I dati personali del
// foglio (nominativi, CF, telefoni) NON vengono letti né mostrati.
//
// Dipende da script.js: usa window.FireOpsComandi, window.FireOpsComandoAttivo
// e l'evento "fireops:comando-attivo-cambiato". Va caricato DOPO script.js.
// Nessuna libreria esterna: il CSV si legge con il parser qui sotto.
// ==========================================================
(function () {
    "use strict";

    const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRfRKFf6aHC3asr7iNREmon_px3MLiLhbU78DDi-MucJx8sds6yX1e303P23wjR0IitnaNhFRNzDkzd/pub?gid=744101024&single=true&output=csv";
    const LOGHI_URL = "https://gesaddvvf.github.io/PUMA/images/loghi/loghi.json";
    const MAPPA_PUMA = "https://gesaddvvf.github.io/PUMA/trainingmaprealtime.html";
    const CHIAVE_STORAGE_COMANDO = "fireops_comando_selezionato";
    const CHIAVE_STORAGE_VISTI = "fireops_addestramenti_visti";
    const INTERVALLO_MS = 2 * 60 * 1000;

    // ---------- utilità ----------
    const esc = v => String(v === null || v === undefined ? "" : v)
        .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

    const norm = s => String(s || "").toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]/g, "");

    const vuoto = v => !v || /^(-+|#?N\/[AD])$/i.test(String(v).trim());

    // Parser CSV minimo: campi tra virgolette, virgolette raddoppiate, a-capo dentro i campi
    function parseCsv(testo) {
        const righe = [];
        let riga = [], campo = "", tra = false;
        for (let i = 0; i < testo.length; i++) {
            const c = testo[i];
            if (tra) {
                if (c === '"') {
                    if (testo[i + 1] === '"') { campo += '"'; i++; }
                    else tra = false;
                } else campo += c;
            } else if (c === '"') tra = true;
            else if (c === ",") { riga.push(campo); campo = ""; }
            else if (c === "\n" || c === "\r") {
                if (c === "\r" && testo[i + 1] === "\n") i++;
                riga.push(campo); campo = "";
                if (riga.some(x => x !== "")) righe.push(riga);
                riga = [];
            } else campo += c;
        }
        riga.push(campo);
        if (riga.some(x => x !== "")) righe.push(riga);
        if (righe.length < 2) return [];
        const intest = righe[0].map(h => h.trim());
        return righe.slice(1).map(r => {
            const o = {};
            intest.forEach((h, i) => { o[h] = (r[i] || "").trim(); });
            return o;
        });
    }

    // Trova il nome di colonna senza dipendere da maiuscole/simboli (il foglio usa ⚪ ecc.)
    function colonna(righe, regex) {
        if (!righe.length) return null;
        return Object.keys(righe[0]).find(k => regex.test(k)) || null;
    }

    // "08/10/2026 8.00.00" → { data: "08/10/2026", ora: "08:00" }
    function dataOra(v) {
        const m = String(v || "").match(/(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})(?:\s+(\d{1,2})[:.](\d{2}))?/);
        if (!m) return null;
        const pad = n => String(n).padStart(2, "0");
        return {
            data: `${pad(m[1])}/${pad(m[2])}/${m[3]}`,
            ora: m[4] !== undefined ? `${pad(m[4])}:${m[5]}` : "",
            ms: new Date(+m[3], +m[2] - 1, +m[1], +(m[4] || 0), +(m[5] || 0)).getTime()
        };
    }

    // ---------- loghi (stessa logica di PUMA) ----------
    let loghiIndex = [];
    const loghiPronti = fetch(LOGHI_URL)
        .then(r => (r.ok ? r.json() : {}))
        .then(dati => {
            Object.values(dati).forEach(l => {
                const chiavi = new Set([
                    norm(l.nome),
                    norm((l.nome || "").replace(/\(.*?\)/g, " ")),
                    norm(l.sigla)
                ]);
                chiavi.forEach(k => { if (k) loghiIndex.push({ k, svg: l.svg, nome: l.nome }); });
            });
        })
        .catch(err => console.warn("Loghi PUMA non caricati:", err));

    function trovaLogo(testo) {
        const t = norm(testo);
        if (!t || !loghiIndex.length) return null;
        const esatto = loghiIndex.find(e => e.k === t);
        if (esatto) return esatto;
        let migliore = null;
        loghiIndex.forEach(e => {
            if (e.k.length >= 5 && t.includes(e.k) && (!migliore || e.k.length > migliore.k.length)) migliore = e;
        });
        return migliore;
    }

    function logoPerTipologia(tipologia) {
        const voci = String(tipologia || "").split(/\n|;/).map(v => v.trim()).filter(Boolean);
        for (const v of voci) {
            const l = trovaLogo(v);
            if (l) return l;
        }
        return trovaLogo("Altro");
    }

    // ---------- Comando attivo e classificazione ----------
    function elencoComandi() { return Array.isArray(window.FireOpsComandi) ? window.FireOpsComandi : []; }

    function comandoAttivo() {
        if (window.FireOpsComandoAttivo) return window.FireOpsComandoAttivo;
        const nome = sessionStorage.getItem(CHIAVE_STORAGE_COMANDO);
        return elencoComandi().find(c => c.Comando === nome) || null;
    }

    // "Comando Pordenone" (foglio) ↔ "Pordenone" (comandi.json)
    function trovaComandoOrganizzatore(nomeFoglio) {
        const n = norm(nomeFoglio);
        const senzaPrefisso = n.replace(/^comando(di)?/, "");
        return elencoComandi().find(c => {
            const k = norm(c.Comando);
            return k === n || k === senzaPrefisso;
        }) || null;
    }

    function classifica(righe) {
        const attivo = comandoAttivo();
        const gruppi = { comando: [], direzione: [], limitrofi: [] };
        if (!attivo) return gruppi;

        const limitrofi = new Set(
            (attivo["Concatena Comandi Confinanti"] || "").split(";").map(norm).filter(Boolean)
        );
        const direzione = attivo["Direzione VVF"];

        righe.forEach(r => {
            const c = trovaComandoOrganizzatore(r.organizzatore);
            if (!c) return;
            if (c.Comando === attivo.Comando) gruppi.comando.push(r);
            else if (limitrofi.has(norm(c.Comando))) gruppi.limitrofi.push(r);
            else if (direzione && c["Direzione VVF"] === direzione) gruppi.direzione.push(r);
        });

        const perOra = (a, b) => (a.inizio ? a.inizio.ms : Infinity) - (b.inizio ? b.inizio.ms : Infinity);
        Object.values(gruppi).forEach(g => g.sort(perOra));
        return gruppi;
    }

    // ---------- dati ----------
    let tutte = [];        // addestramenti già normalizzati
    let caricato = false;
    let errore = false;
    let ultimoAggiornamento = null;
    let baseline = false;  // il primo caricamento non genera "nuovi"
    let visti = new Set();
    try { visti = new Set(JSON.parse(sessionStorage.getItem(CHIAVE_STORAGE_VISTI) || "[]")); } catch (e) {}

    function normalizza(righeGrezze) {
        const cOrg = colonna(righeGrezze, /comando organizzatore/i);
        const cSq = colonna(righeGrezze, /^squadra$/i);
        const cTip = colonna(righeGrezze, /tipologia addestramento/i);
        const cCoo = colonna(righeGrezze, /^coordinate$/i);
        const cAre = colonna(righeGrezze, /area di addestramento/i);
        const cIni = colonna(righeGrezze, /inizio/i);
        const cFin = colonna(righeGrezze, /fine/i);
        const cPers = colonna(righeGrezze, /personale operativo partecipante/i);

        return righeGrezze
            .filter(r => cOrg && cTip && !vuoto(r[cOrg]) && !vuoto(r[cTip]))
            .map(r => {
                const o = {
                    organizzatore: r[cOrg],
                    squadra: vuoto(r[cSq]) ? "" : r[cSq],
                    tipologia: r[cTip],
                    area: vuoto(r[cAre]) ? "" : r[cAre],
                    coordinate: vuoto(r[cCoo]) ? "" : r[cCoo],
                    inizio: dataOra(r[cIni]),
                    fine: dataOra(r[cFin]),
                    partecipanti: vuoto(r[cPers]) ? "" : r[cPers]
                };
                o.id = [o.organizzatore, o.tipologia, o.squadra, o.inizio ? o.inizio.ms : ""].join("|");
                return o;
            });
    }

    function scarica() {
        return fetch(CSV_URL + "&_=" + Date.now())
            .then(r => { if (!r.ok) throw new Error("HTTP " + r.status); return r.text(); })
            .then(testo => {
                tutte = normalizza(parseCsv(testo));
                caricato = true;
                errore = false;
                ultimoAggiornamento = new Date();
            })
            .catch(err => {
                console.error("Addestramenti odierni non disponibili:", err);
                errore = true;
            });
    }

    // ---------- interfaccia ----------
    let btn, badge, modale, contenuto, titolo;

    function conteggi() {
        const g = classifica(tutte);
        const tot = g.comando.length + g.direzione.length + g.limitrofi.length;
        const ids = [...g.comando, ...g.direzione, ...g.limitrofi].map(r => r.id);
        return { g, tot, ids };
    }

    function aggiornaPulsante() {
        if (!btn) return;
        const { tot, ids } = conteggi();
        const attivo = comandoAttivo();

        badge.hidden = !(caricato && attivo && tot > 0);
        badge.textContent = tot > 99 ? "99+" : String(tot);
        btn.title = !attivo ? "Addestramenti odierni (PUMA) — scegli prima il Comando"
            : errore && !caricato ? "Addestramenti odierni (PUMA) — dati non disponibili"
            : `Addestramenti odierni (PUMA): ${tot} per Comando, Direzione e limitrofi`;

        // "Nuovi" = ids mai visti dopo il primo caricamento
        if (caricato && attivo) {
            if (!baseline) {
                ids.forEach(i => visti.add(i));
                baseline = true;
                salvaVisti();
            }
            const nuovi = ids.some(i => !visti.has(i));
            btn.classList.toggle("addestr-nuovi", nuovi);
        }
    }

    function salvaVisti() {
        try { sessionStorage.setItem(CHIAVE_STORAGE_VISTI, JSON.stringify([...visti])); } catch (e) {}
    }

    function etichettaOrario(r) {
        const oggi = new Intl.DateTimeFormat("it-IT", { timeZone: "Europe/Rome", day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date());
        const ini = r.inizio, fin = r.fine;
        if (!ini && !fin) return "Orario non indicato";
        const parte = d => !d ? "" : (d.data === oggi ? d.ora : `${d.data.slice(0, 5)} ${d.ora}`.trim());
        const a = parte(ini), b = parte(fin);
        return a && b ? `${a} – ${b}` : (a || b);
    }

    function schedaHtml(r) {
        const logo = logoPerTipologia(r.tipologia);
        const tip = esc(r.tipologia).replace(/\n/g, "<br>");
        const comando = esc(r.organizzatore);
        const coord = r.coordinate.replace(/\s/g, "");
        const mappa = /^-?\d+(\.\d+)?,-?\d+(\.\d+)?$/.test(coord)
            ? `<a class="addestr-mappa" href="${MAPPA_PUMA}?lat=${coord.split(",")[0]}&lng=${coord.split(",")[1]}&zoom=16" target="_blank" rel="noopener">🗺 Mappa PUMA</a>`
            : "";
        const dettagli = [
            `<span>🕒 ${esc(etichettaOrario(r))}</span>`,
            r.squadra ? `<span>🚒 Squadra ${esc(r.squadra)}</span>` : "",
            r.partecipanti ? `<span>👥 ${esc(r.partecipanti)}</span>` : "",
            r.area ? `<span>📍 ${esc(r.area)}</span>` : ""
        ].filter(Boolean).join("");

        return `<div class="addestr-scheda">
            <span class="addestr-logo" title="${esc(logo ? logo.nome : "")}">${logo ? logo.svg : ""}</span>
            <div class="addestr-testo">
                <div class="addestr-tip">${tip}</div>
                <div class="addestr-org">${comando}</div>
                <div class="addestr-dettagli">${dettagli}</div>
                ${mappa}
            </div>
        </div>`;
    }

    function gruppoHtml(titoloGruppo, righe) {
        if (!righe.length) return "";
        return `<h4 class="addestr-gruppo">${esc(titoloGruppo)} <span class="addestr-conteggio">${righe.length}</span></h4>`
            + righe.map(schedaHtml).join("");
    }

    function disegna() {
        if (!contenuto) return;
        const attivo = comandoAttivo();

        if (!attivo) {
            contenuto.innerHTML = `<p class="pagina-nota">Seleziona prima il Comando dal menu ☰.</p>`;
            return;
        }
        if (!caricato) {
            contenuto.innerHTML = errore
                ? `<p class="pagina-nota" style="color:var(--danger-color);">Impossibile leggere il foglio PUMA. Riprova tra poco.</p>`
                : `<p class="pagina-nota">Caricamento in corso…</p>`;
            return;
        }

        const { g, tot } = conteggi();
        const dir = attivo["Direzione VVF"] || "Direzione";
        const agg = ultimoAggiornamento
            ? ultimoAggiornamento.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" }) : "—";

        const corpo = tot === 0
            ? `<p class="pagina-nota">Nessun addestramento odierno per il Comando ${esc(attivo.Comando)}, la sua Direzione e i Comandi limitrofi.</p>`
            : gruppoHtml(`Comando ${attivo.Comando}`, g.comando)
              + gruppoHtml(`Direzione regionale — ${dir}`, g.direzione)
              + gruppoHtml("Comandi limitrofi", g.limitrofi);

        contenuto.innerHTML = `<p class="pagina-nota">Da PUMA · aggiornato alle ${esc(agg)} · i limitrofi non sono ripetuti nella Direzione.
            <a href="${MAPPA_PUMA}" target="_blank" rel="noopener">Apri la mappa completa</a></p>` + corpo;
    }

    function apri() {
        modale.style.display = "flex";
        disegna();
        // Riapertura = presa visione: si spegne la notifica "nuovi"
        scarica().then(() => {
            conteggi().ids.forEach(i => visti.add(i));
            salvaVisti();
            btn.classList.remove("addestr-nuovi");
            aggiornaPulsante();
            if (modale.style.display === "flex") disegna();
        });
    }

    function chiudi() { modale.style.display = "none"; }

    function aggiorna() {
        return Promise.all([loghiPronti, scarica()]).then(() => {
            aggiornaPulsante();
            if (modale && modale.style.display === "flex") disegna();
        });
    }

    document.addEventListener("DOMContentLoaded", () => {
        btn = document.getElementById("btn-addestramenti");
        modale = document.getElementById("modal-addestramenti");
        contenuto = document.getElementById("addestramenti-contenuto");
        if (!btn || !modale || !contenuto) return;

        badge = btn.querySelector(".addestr-badge");
        const chiusura = document.getElementById("modal-addestramenti-close");

        btn.addEventListener("click", apri);
        if (chiusura) chiusura.addEventListener("click", chiudi);
        modale.addEventListener("click", e => { if (e.target === modale) chiudi(); });
        document.addEventListener("keydown", e => {
            if (e.key === "Escape" && modale.style.display === "flex") chiudi();
        });

        // Cambio Comando: i gruppi cambiano, i dati scaricati restano validi
        document.addEventListener("fireops:comando-attivo-cambiato", () => {
            baseline = false;
            aggiornaPulsante();
            if (modale.style.display === "flex") disegna();
        });

        aggiorna();
        setInterval(aggiorna, INTERVALLO_MS);
    });
})();