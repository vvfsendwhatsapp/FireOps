// ==========================================================
// FireOps VVF — NUCLEO CONDIVISO
//
// Raccoglie il codice che serve a più pagine: calendario turni, data/ora
// di Roma, combobox ricercabile, copia negli appunti, caricamento JSON.
//
// Perché esiste: prima queste funzioni erano scritte due volte, in
// script.js e in convertitore.js. La tabella dei turni in particolare
// viveva in doppia copia, e una correzione applicata a una sola delle due
// avrebbe fatto mostrare turni diversi nella stessa schermata.
//
// Va caricato PRIMA di script.js e convertitore.js:
//     <script src="fireops-core.js"></script>
//     <script src="script.js"></script>
//     <script src="convertitore.js"></script>
// ==========================================================
window.FireOps = (function () {
    "use strict";

    // ==========================================================
    // CALENDARIO TURNI VVF + DATA/ORA DI ROMA
    // ==========================================================
    const SEQUENZA_TURNI = ["A4", "C4", "B4", "B4", "D4", "C4", "C4", "A5", "D4", "D4", "B5", "A5", "A5", "C5", "B5", "B5", "D5", "C5", "C5", "A6", "D5", "D5", "B6", "A6", "A6", "C6", "B6", "B6", "D6", "C6", "C6", "A7", "D6", "D6", "B7", "A7", "A7", "C7", "B7", "B7", "D7", "C7", "C7", "A8", "D7", "D7", "B8", "A8", "A8", "C8", "B8", "B8", "D8", "C8", "C8", "A1", "D8", "D8", "B1", "A1", "A1", "C1", "B1", "B1", "D1", "C1", "C1", "A2", "D1", "D1", "B2", "A2", "A2", "C2", "B2", "B2", "D2", "C2", "C2", "A3", "D2", "D2", "B3", "A3", "A3", "C3", "B3", "B3", "D3", "C3", "C3", "A4", "D3", "D3", "B4", "A4"];

    const GIORNI_CICLO = 32;
    const MS_AL_GIORNO = 24 * 60 * 60 * 1000;

    // Riferimento: 26/01/2026 00:00 ora civile di Roma = inizio ciclo (A4)
    const RIFERIMENTO_CICLO_MS = Date.UTC(2026, 0, 26, 0, 0, 0);

    function getComponentiRoma(date) {
        const fmt = new Intl.DateTimeFormat('en-GB', {
            timeZone: 'Europe/Rome',
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit', second: '2-digit',
            hour12: false
        });
        const parts = fmt.formatToParts(date);
        const get = tipo => parts.find(p => p.type === tipo).value;

        return {
            year: parseInt(get('year'), 10),
            month: parseInt(get('month'), 10),
            day: parseInt(get('day'), 10),
            hour: parseInt(get('hour'), 10) % 24,
            minute: parseInt(get('minute'), 10),
            second: parseInt(get('second'), 10)
        };
    }

    function pseudoTimestamp(componenti) {
        return Date.UTC(
            componenti.year, componenti.month - 1, componenti.day,
            componenti.hour, componenti.minute, componenti.second
        );
    }

    function calcolaOffsetRoma(data) {
        const utc = new Date(data.toLocaleString("en-US", { timeZone: "UTC" }));
        const roma = new Date(data.toLocaleString("en-US", { timeZone: "Europe/Rome" }));
        return Math.round((roma - utc) / (1000 * 60 * 60));
    }

    function calcolaTurnoVVF() {
        const adesso = new Date();
        const componentiRoma = getComponentiRoma(adesso);
        const oraPseudo = pseudoTimestamp(componentiRoma);

        const diffGiorni = (oraPseudo - RIFERIMENTO_CICLO_MS) / MS_AL_GIORNO;
        const posizioneCiclo = ((diffGiorni % GIORNI_CICLO) + GIORNI_CICLO) % GIORNI_CICLO;

        const giornoIndex = Math.floor(posizioneCiclo);
        const fraz = posizioneCiclo - giornoIndex;

        let fasciaIndex;
        if (fraz < 1 / 3) fasciaIndex = 0;       // 00:00 - 08:00 Roma
        else if (fraz < 5 / 6) fasciaIndex = 1;  // 08:00 - 20:00 Roma
        else fasciaIndex = 2;                    // 20:00 - 24:00 Roma

        const slotIndex = giornoIndex * 3 + fasciaIndex;
        return SEQUENZA_TURNI[slotIndex] || "N/D";
    }

    // Sigla del fuso in vigore adesso: unica riga di verità per l'etichetta
    // CET/CEST usata sia nell'header sia nei messaggi alle squadre
    function siglaFusoRoma(data) {
        return calcolaOffsetRoma(data) === 2 ? "CEST" : "CET";
    }

    // ==========================================================
    // COMBOBOX RICERCABILE
    // ==========================================================
    function creaComboRicercabile({ input, hidden, dropdown, elenco, cercaValore, mostraTesto, testoRicerca, testoSelezionato, onScelta, placeholderOpzione }) {
        let elencoCorrente = elenco;
        let ultimoFiltrati = elenco;
        let indiceAttivo = -1; // voce evidenziata nella lista filtrata (come il cursore di un select nativo)

        function filtra(testo) {
            const filtro = (testo || "").trim().toLowerCase();
            if (!filtro) return elencoCorrente;
            const ottieniTestoRicerca = testoRicerca || mostraTesto;
            return elencoCorrente.filter(item => ottieniTestoRicerca(item).toLowerCase().includes(filtro));
        }

        function renderOpzioni(testo) {
            ultimoFiltrati = filtra(testo);
            dropdown.innerHTML = "";

            // Voce segnaposto non selezionabile (es. "-- Seleziona modulo --"), mostrata solo
            // quando si sfoglia l'elenco completo, come il default del select "Comando"
            if (placeholderOpzione && !(testo || "").trim()) {
                const placeholder = document.createElement("div");
                placeholder.className = "combo-opzione-placeholder";
                placeholder.textContent = placeholderOpzione;
                dropdown.appendChild(placeholder);
            }

            if (ultimoFiltrati.length === 0) {
                indiceAttivo = -1;
                const vuoto = document.createElement("div");
                vuoto.className = "combo-opzione-vuota";
                vuoto.textContent = "Nessun risultato";
                dropdown.appendChild(vuoto);
                return;
            }

            // Alla riapertura evidenzia la voce già selezionata (se ancora presente nel
            // filtro), altrimenti la prima: proprio come farebbe un <select> nativo.
            const indiceValoreCorrente = hidden.value
                ? ultimoFiltrati.findIndex(item => cercaValore(item) === hidden.value)
                : -1;
            indiceAttivo = indiceValoreCorrente >= 0 ? indiceValoreCorrente : 0;

            ultimoFiltrati.forEach((item, i) => {
                const opz = document.createElement("div");
                opz.className = "combo-opzione" + (i === indiceAttivo ? " combo-opzione-attiva" : "");
                opz.textContent = mostraTesto(item);
                // mousedown (non click): scatta prima del blur dell'input, altrimenti
                // il dropdown si chiuderebbe prima che il click venga registrato
                opz.addEventListener("mousedown", (e) => {
                    e.preventDefault();
                    selezionaVoce(item);
                });
                // Passando col mouse, l'evidenziazione segue anche il puntatore
                opz.addEventListener("mouseenter", () => {
                    indiceAttivo = i;
                    aggiornaEvidenziazione();
                });
                dropdown.appendChild(opz);
            });

            aggiornaEvidenziazione();
        }

        // Aggiorna solo la classe "attiva" sulle voci già renderizzate, senza ridisegnare
        // tutta la lista: usata dalla navigazione a tastiera e dal passaggio del mouse.
        function aggiornaEvidenziazione() {
            const opzioni = dropdown.querySelectorAll(".combo-opzione");
            opzioni.forEach((el, i) => {
                el.classList.toggle("combo-opzione-attiva", i === indiceAttivo);
            });
            const attiva = opzioni[indiceAttivo];
            if (attiva) attiva.scrollIntoView({ block: "nearest" });
        }

        function selezionaVoce(item) {
            hidden.value = cercaValore(item);
            input.value = testoSelezionato ? testoSelezionato(item) : mostraTesto(item);
            chiudiDropdown();
            if (onScelta) onScelta(item);
        }

        function apriDropdown() {
            renderOpzioni(input.value);
            dropdown.classList.add("aperto");
        }

        // Apre sempre l'elenco COMPLETO, ignorando il testo/la voce già selezionata:
        // usata quando il campo riceve il focus e quando si clicca sulla freccetta,
        // così si può sfogliare tutta la lista anche con una voce già scelta.
        function apriDropdownCompleta() {
            renderOpzioni("");
            dropdown.classList.add("aperto");
        }

        function chiudiDropdown() {
            dropdown.classList.remove("aperto");
        }

        input.addEventListener("input", () => {
            // Digitare invalida la selezione precedente finché non se ne sceglie una nuova:
            // altrimenti il campo nascosto resterebbe collegato alla vecchia voce
            hidden.value = "";
            apriDropdown();
        });
        input.addEventListener("focus", apriDropdownCompleta);

        const wrapperCombo = input.closest(".combo-wrapper");
        const frecciaCombo = wrapperCombo ? wrapperCombo.querySelector(".combo-arrow") : null;

        if (frecciaCombo) {
            frecciaCombo.addEventListener("mousedown", (e) => {
                // preventDefault: evita che il click sulla freccetta tolga il focus
                // dall'input (che chiuderebbe subito il dropdown appena aperto)
                e.preventDefault();
                if (dropdown.classList.contains("aperto")) {
                    chiudiDropdown();
                } else {
                    input.focus();
                    apriDropdownCompleta();
                }
            });
        }

        // Navigazione da tastiera identica a quella del select "Comando":
        // frecce per scorrere le voci, Invio per confermare quella evidenziata.
        input.addEventListener("keydown", (e) => {
            const dropdownAperto = dropdown.classList.contains("aperto");

            if (e.key === "Escape") {
                chiudiDropdown();
                input.blur();
            } else if (e.key === "ArrowDown") {
                e.preventDefault();
                if (!dropdownAperto) { apriDropdownCompleta(); return; }
                if (ultimoFiltrati.length > 0) {
                    indiceAttivo = (indiceAttivo + 1) % ultimoFiltrati.length;
                    aggiornaEvidenziazione();
                }
            } else if (e.key === "ArrowUp") {
                e.preventDefault();
                if (!dropdownAperto) { apriDropdownCompleta(); return; }
                if (ultimoFiltrati.length > 0) {
                    indiceAttivo = (indiceAttivo - 1 + ultimoFiltrati.length) % ultimoFiltrati.length;
                    aggiornaEvidenziazione();
                }
            } else if (e.key === "Enter") {
                e.preventDefault();
                if (ultimoFiltrati.length > 0) {
                    const scelta = ultimoFiltrati[indiceAttivo >= 0 ? indiceAttivo : 0];
                    selezionaVoce(scelta);
                }
            }
        });

        document.addEventListener("click", (e) => {
            if (!input.contains(e.target) && !dropdown.contains(e.target) && !(frecciaCombo && frecciaCombo.contains(e.target))) {
                chiudiDropdown();
            }
        });

        return {
            impostaValore(valore) {
                const trovato = elencoCorrente.find(item => cercaValore(item) === valore);
                if (trovato) selezionaVoce(trovato);
            }
        };
    }

    // ==========================================================
    // COPIA NEGLI APPUNTI
    // ==========================================================
    function copiaTesto(event, testo) {
        event.stopPropagation();
        if (!testo || testo === '-') return;

        navigator.clipboard.writeText(testo)
            .then(() => mostraFeedbackCopia(event, '✓ Copiato'))
            .catch(() => mostraFeedbackCopia(event, '✗ Errore copia'));
    }

    function mostraFeedbackCopia(event, testo) {
        const badge = document.createElement('div');
        badge.className = 'copia-feedback';
        badge.textContent = testo;

        const rect = event.target.getBoundingClientRect();
        badge.style.top = `${rect.top - 30}px`;
        badge.style.left = `${rect.left}px`;

        document.body.appendChild(badge);
        setTimeout(() => badge.remove(), 1200);
    }

    // Rende un elemento cliccabile per copiarne il contenuto
    function rendiCopiabile(elemento, testo) {
        if (!elemento) return;
        elemento.textContent = testo;
        elemento.classList.add("cliccabile");
        elemento.onclick = (e) => copiaTesto(e, testo);
    }

    // ==========================================================
    // CARICAMENTO JSON con cache: lo stesso file richiesto da due pagine
    // viene scaricato una volta sola
    // ==========================================================
    const cacheJson = new Map();

    function caricaJson(percorso) {
        if (!cacheJson.has(percorso)) {
            cacheJson.set(percorso, fetch(percorso)
                .then(r => (r.ok ? r.json() : Promise.reject(new Error("HTTP " + r.status))))
                .catch(err => {
                    cacheJson.delete(percorso); // un errore non deve restare in cache per sempre
                    throw err;
                }));
        }
        return cacheJson.get(percorso);
    }

    return {
        SEQUENZA_TURNI,
        GIORNI_CICLO,
        RIFERIMENTO_CICLO_MS,
        componentiRoma: getComponentiRoma,
        offsetOreRoma: calcolaOffsetRoma,
        siglaFusoRoma,
        turnoVVF: calcolaTurnoVVF,
        creaCombo: creaComboRicercabile,
        copiaTesto,
        mostraFeedbackCopia,
        rendiCopiabile,
        caricaJson,
    };
})();