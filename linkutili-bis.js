/*!
 * FireOps VVF — linkutili-bis.js — Pagina "Link utili" riorganizzata (solo index-bis.html)
 * Dipendenze: script.js (window.FireOpsComandoAttivo, evento "fireops:comando-attivo-cambiato")
 * Dati:       db/linkUtili-bis.json (campi Categoria, Sottocategoria, Nome, URL, Nota, Rete)
 * Markup:     #link-utili-contenuto nella sezione #contatti (il vecchio rendering di script.js
 *             viene sostituito da questo appena compare)
 * Stile:      style.css, sezione "LINK UTILI (BIS)"
 */
(function () {
    "use strict";

    // Raggruppa l'elenco piatto in { Categoria: { Sottocategoria: [voci] } } mantenendo l'ordine del file
    function luRaggruppa(elenco) {
        const gruppi = new Map();
        elenco.forEach(voce => {
            const cat = voce["Categoria"] || "Altro";
            const sotto = voce["Sottocategoria"] || "";
            if (!gruppi.has(cat)) gruppi.set(cat, new Map());
            const sg = gruppi.get(cat);
            if (!sg.has(sotto)) sg.set(sotto, []);
            sg.get(sotto).push(voce);
        });
        return gruppi;
    }

    // Sostituisce {{LAT}} e {{LNG}} con le coordinate del Comando attivo; "" se non c'è un Comando
    function luCoordinate(url) {
        if (!url || (!url.includes("{{LAT}}") && !url.includes("{{LNG}}"))) return url;
        const c = window.FireOpsComandoAttivo;
        const parti = c && c["Coordinate"] ? String(c["Coordinate"]).split(",").map(s => parseFloat(s.trim())) : [];
        if (parti.length !== 2 || parti.some(n => Number.isNaN(n))) return "";
        return url.split("{{LAT}}").join(parti[0]).split("{{LNG}}").join(parti[1]);
    }

    // Stato della pagina: solo la categoria scelta resta nel browser (niente preferiti:
    // ogni postazione deve vedere la stessa pagina)
    const LU_CHIAVE_FILTRO = "fireops-linkutili-filtro";
    function luLeggi(chiave, predef) {
        try { const v = localStorage.getItem(chiave); return v ? JSON.parse(v) : predef; } catch (e) { return predef; }
    }
    function luScrivi(chiave, valore) {
        try { localStorage.setItem(chiave, JSON.stringify(valore)); } catch (e) { /* storage non disponibile */ }
    }
    const luEsc = t => String(t || "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" }[c]));
    // minuscolo e senza accenti, così "velivolo" trova anche "Velivòli"
    const luNorm = t => String(t || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
    let luElenco = [];
    let luTesto = "";

    function luRender(elenco) {
        const container = document.getElementById("link-utili-contenuto");
        if (!container) return;
        luElenco = Array.isArray(elenco) ? elenco : [];

        if (luElenco.length === 0) {
            container.innerHTML = "<p class=\"pagina-nota\">Nessun link disponibile.</p>";
            return;
        }

        // Struttura fissa (ricerca e filtri) costruita una volta sola; il resto si ridisegna
        if (!container.querySelector(".lu-barra")) {
            container.innerHTML = `
                <div class="lu-barra">
                    <input type="search" class="lu-cerca" placeholder="Cerca (es. elicottero, targa, ONU)" aria-label="Cerca link">
                    <div class="lu-chips"></div>
                </div>
                <p class="lu-legenda"><span class="lu-badge">📍</span> si apre sulle coordinate del Comando attivo · <span class="lu-badge">🔒</span> rete VVF</p>
                <div class="lu-elenco"></div>`;
            const cerca = container.querySelector(".lu-cerca");
            cerca.value = luTesto;
            cerca.addEventListener("input", () => { luTesto = cerca.value; luDisegna(container); });
            container.addEventListener("click", ev => {
                const chip = ev.target.closest(".lu-chip");
                if (chip) {
                    luScrivi(LU_CHIAVE_FILTRO, chip.dataset.filtro);
                    // scegliere una categoria azzera la ricerca
                    luTesto = ""; cerca.value = "";
                    luDisegna(container);
                    return;
                }
            });
        }
        luDisegna(container);
    }

    // Un colore per ogni macro categoria: filtro, titolo e bordo dei link
    const LU_COLORI = {
        "Mappe e posizione": "#4caf50",
        "Velivoli, natanti, satelliti": "#29b6f6",
        "Sala Operativa": "#ef5350",
        "Sostanze pericolose (NBCR)": "#ff9800",
        "Veicoli e incidenti": "#ba68c8",
        "Personale e amministrazione": "#7986cb",
        "Comunicazione in Emergenza": "#f06292",
        "Strumenti": "#9e9e9e"
    };
    const LU_RISERVA = ["#26a69a", "#d4e157", "#8d6e63", "#78909c"];
    function luColore(categoria, categorie) {
        if (LU_COLORI[categoria]) return LU_COLORI[categoria];
        const i = Math.max(0, categorie.indexOf(categoria));
        return LU_RISERVA[i % LU_RISERVA.length];
    }

    function luDisegna(container) {
        let filtro = luLeggi(LU_CHIAVE_FILTRO, "Tutti");
        const gruppiTutti = luRaggruppa(luElenco);
        const categorie = [...gruppiTutti.keys()];
        if (filtro !== "Tutti" && !categorie.includes(filtro)) filtro = "Tutti";
        const parole = luNorm(luTesto).split(/\s+/).filter(Boolean);

        const col = c => luColore(c, categorie);
        container.querySelector(".lu-chips").innerHTML = ["Tutti", ...categorie].map(c =>
            `<button type="button" class="lu-chip${c === filtro && !parole.length ? " attiva" : ""}" data-filtro="${luEsc(c)}"${c === "Tutti" ? "" : ` style="--lu-col:${col(c)}"`}>${c === "Tutti" ? "" : "<span class=\"lu-pallino\"></span>"}${luEsc(c)}</button>`
        ).join("");

        const tessera = voce => {
            const urlGrezzo = (voce["URL"] || "").trim();
            const url = luCoordinate(urlGrezzo);
            const conCoord = urlGrezzo.includes("{{LAT}}");
            const nome = voce["Nome"];
            const badge = (conCoord ? `<span class="lu-badge" title="Centrato sul Comando attivo">📍</span>` : "")
                + (voce["Rete"] === "VVF" ? `<span class="lu-badge" title="Raggiungibile dalla rete VVF">🔒</span>` : "");
            const corpo = `<span class="lu-nome">${luEsc(nome)}${badge}</span>`
                + (voce["Nota"] ? `<span class="lu-nota">${luEsc(voce["Nota"])}</span>` : "");
            const link = url
                ? `<a class="lu-link" href="${luEsc(url)}" target="_blank" rel="noopener">${corpo}</a>`
                : `<span class="lu-link lu-disabilitato" title="${conCoord ? "Seleziona prima un Comando" : "URL non ancora inserito"}">${corpo}</span>`;
            return `<div class="lu-tessera" style="--lu-col:${col(voce["Categoria"] || "Altro")}">${link}</div>`;
        };
        const griglia = voci => `<div class="lu-griglia">${voci.map(tessera).join("")}</div>`;

        let html = "";
        if (parole.length) {
            // Ricerca per parole chiave: ogni parola scritta deve comparire in nome, descrizione,
            // parole chiave o categoria; cerca in tutti i link, su ogni categoria
            const trovati = luElenco.filter(v => {
                const testoVoce = luNorm([v["Nome"], v["Nota"], v["Parole"], v["Categoria"], v["Sottocategoria"]].join(" "));
                return parole.every(p => testoVoce.includes(p));
            });
            html = trovati.length ? griglia(trovati) : `<p class="pagina-nota">Nessun link trovato per “${luEsc(luTesto.trim())}”.</p>`;
        } else {
            gruppiTutti.forEach((sottogruppi, categoria) => {
                if (filtro !== "Tutti" && filtro !== categoria) return;
                html += `<section class="lu-gruppo" style="--lu-col:${col(categoria)}">`;
                html += `<h4 class="lu-categoria">${luEsc(categoria)}</h4>`;
                sottogruppi.forEach((voci, sotto) => {
                    if (sotto) html += `<h5 class="lu-sottocategoria">${luEsc(sotto)}</h5>`;
                    html += griglia(voci);
                });
                html += `</section>`;
            });
        }
        container.querySelector(".lu-elenco").innerHTML = html;
    }

    // Avvio: carica l'elenco bis e prende il posto del rendering classico di script.js,
    // anche quando script.js lo ridisegna (cambio Comando)
    function avvia() {
        const container = document.getElementById("link-utili-contenuto");
        if (!container) return;
        fetch("/FireOps/db/linkUtili-bis.json")
            .then(r => { if (!r.ok) throw new Error("linkUtili-bis.json non trovato"); return r.json(); })
            .then(dati => {
                luRender(dati);
                new MutationObserver(() => {
                    if (!container.querySelector(".lu-barra")) luRender(dati);
                }).observe(container, { childList: true });
                document.addEventListener("fireops:comando-attivo-cambiato", () => luRender(dati));
            })
            .catch(err => console.warn("[linkutili-bis] resta la versione classica:", err.message));
    }
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", avvia);
    else avvia();
})();
