document.addEventListener("DOMContentLoaded", () => {
    const modal = document.getElementById("modal-comando");
    const selectComando = document.getElementById("select-comando");
    const btnConferma = document.getElementById("btn-conferma-comando");
    const selectComandoHeader = document.getElementById("select-comando-header");

    const CHIAVE_STORAGE = "fireops_comando_selezionato";
    let comandiData = [];

    fetch("/FireOps/db/comandi.json")
        .then(response => {
            if (!response.ok) throw new Error("Impossibile trovare il file db/comandi.json");
            return response.json();
        })
        .then(comandi => {
            comandiData = comandi;

            // Popola la select del modale (primo accesso)
            selectComando.innerHTML = '<option value="" disabled selected>-- Seleziona Comando --</option>';
            comandi.forEach(c => {
                const option = document.createElement("option");
                option.value = c.Comando;
                option.textContent = c.Comando;
                selectComando.appendChild(option);
            });
            selectComando.disabled = false;

            // Popola la select dell'header (per cambio successivo)
            selectComandoHeader.innerHTML = '<option value="">-- Cambia --</option>';
            comandi.forEach(c => {
                const option = document.createElement("option");
                option.value = c.Comando;
                option.textContent = c.Comando;
                selectComandoHeader.appendChild(option);
            });

            // Controlla se c'è già un comando salvato da una sessione precedente
            const comandoSalvato = localStorage.getItem(CHIAVE_STORAGE);
            if (comandoSalvato && comandiData.some(c => c.Comando === comandoSalvato)) {
                attivaComando(comandoSalvato);
                modal.style.display = "none";
            }
            // Altrimenti il modale resta visibile per la prima selezione
        })
        .catch(error => {
            console.error("Errore nel fetch del JSON:", error);
            selectComando.innerHTML = '<option value="" disabled selected>Errore caricamento comandi</option>';
        });

    // Attiva un comando: aggiorna header, salva in localStorage, ridisegna il riepilogo
    function attivaComando(nomeComando) {
        localStorage.setItem(CHIAVE_STORAGE, nomeComando);
        selectComandoHeader.value = nomeComando;

        const comandoSelezionato = comandiData.find(c => c.Comando === nomeComando);
        renderRiepilogoComando(comandoSelezionato, comandiData);
    }

    // Prima selezione, dal modale bloccante
    selectComando.addEventListener("change", () => {
        if (selectComando.value) btnConferma.disabled = false;
    });

    btnConferma.addEventListener("click", () => {
        const scelto = selectComando.value;
        if (scelto) {
            attivaComando(scelto);
            modal.style.display = "none";
        }
    });

    // Cambio comando successivo, dalla select nell'header
    selectComandoHeader.addEventListener("change", () => {
        if (selectComandoHeader.value) {
            attivaComando(selectComandoHeader.value);
        }
    });

    // Cerca un comando per nome esatto all'interno dell'elenco completo
    function trovaComandoPerNome(nome, lista) {
        return lista.find(c => c.Comando === nome);
    }

    // Costruisce e inserisce il riepilogo dati del comando nella dashboard// Chiude qualsiasi popup aperto
function chiudiPopupDati() {
    const esistente = document.getElementById("popup-dati-attivo");
    if (esistente) esistente.remove();
}

// Mostra un popup con dati di un comando o direzione, ancorato vicino al click
function mostraPopupDati(event, titolo, righeHTML) {
    event.stopPropagation();
    chiudiPopupDati();

    const popup = document.createElement("div");
    popup.className = "popup-dati";
    popup.id = "popup-dati-attivo";

    const rect = event.target.getBoundingClientRect();
    let top = rect.bottom + 8;
    let left = rect.left;

    // Evita che esca dallo schermo a destra/in basso
    const larghezzaStimata = 300;
    if (left + larghezzaStimata > window.innerWidth) {
        left = window.innerWidth - larghezzaStimata - 10;
    }

    popup.style.top = `${top}px`;
    popup.style.left = `${left}px`;

    popup.innerHTML = `
        <span class="popup-close" onclick="chiudiPopupDati()">&times;</span>
        <h5>${titolo}</h5>
        <table>${righeHTML}</table>
    `;

    document.body.appendChild(popup);
}

// Chiude il popup cliccando fuori o con ESC
document.addEventListener("click", chiudiPopupDati);
document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") chiudiPopupDati();
});

function popupDatiComando(event, c) {
    const sitoWeb = c["sito web Comando"]
        ? `<a href="${c["sito web Comando"]}" target="_blank" rel="noopener">Apri</a>` : "-";
    const intranet = c["Intranet Comando"]
        ? `<a href="${c["Intranet Comando"]}" target="_blank" rel="noopener">Apri</a>` : "-";

    const righe = `
        <tr><th>CH RADIO</th><td>${c["Canale Radio Comando"] || "-"}</td></tr>
        <tr><th>TEL SO</th><td>${c["Telefono SO Comando"] || "-"}</td></tr>
        <tr><th>SITO WEB</th><td>${sitoWeb}</td></tr>
        <tr><th>INTRANET</th><td>${intranet}</td></tr>
        <tr><th>DIREZIONE</th><td>${c["Direzione VVF"] || "-"}</td></tr>
        <tr><th>TEL SO DIR</th><td>${c["Telefono SO Direzione"] || "-"}</td></tr>
        <tr><th>CH DIR</th><td>${c["Canale Radio Direzione"] || "-"}</td></tr>
    `;
    mostraPopupDati(event, `Comando: ${c.Comando}`, righe);
}

function popupDatiDirezione(event, c) {
    const righe = `
        <tr><th>DIREZIONE</th><td>${c["Direzione VVF"] || "-"}</td></tr>
        <tr><th>TEL SO DIR</th><td>${c["Telefono SO Direzione"] || "-"}</td></tr>
        <tr><th>CH DIR</th><td>${c["Canale Radio Direzione"] || "-"}</td></tr>
        <tr><th>EMAIL SO DIR</th><td>${c["email SO Direzione"] || "-"}</td></tr>
        <tr><th>PEC SO DIR</th><td>${c["PEC SO Direzione"] || "-"}</td></tr>
        <tr><th>INDIRIZZO DIR</th><td>${c["Indirizzo Direzione"] || "-"}</td></tr>
    `;
    mostraPopupDati(event, `Direzione: ${c["Direzione VVF"]}`, righe);
}

// Cerca un comando per nome esatto all'interno dell'elenco completo
function trovaComandoPerNome(nome, lista) {
    return lista.find(c => c.Comando === nome);
}

// Costruisce e inserisce il riepilogo dati del comando nella dashboard
function renderRiepilogoComando(comando, tuttiComandi) {
    const container = document.getElementById("riepilogo-comando");
    if (!container) return;

    if (!comando) {
        container.innerHTML = "<p>Dati comando non disponibili.</p>";
        return;
    }

    const limitrofiNomi = (comando["Concatena Comandi Confinanti"] || "")
        .split(";")
        .map(n => n.trim())
        .filter(n => n.length > 0);

    const limitrofiRighe = limitrofiNomi.map(nome => {
        const c = trovaComandoPerNome(nome, tuttiComandi);
        if (!c) {
            return `<tr><td>${nome}</td><td colspan="3">Dati non trovati</td></tr>`;
        }
        return `
            <tr>
                <td class="cliccabile" data-comando="${c.Comando}">${c.Comando}</td>
                <td>${c["Canale Radio Comando"] || "-"}</td>
                <td class="cliccabile" data-direzione-di="${c.Comando}">${c["Direzione VVF"] || "-"}</td>
                <td>${c["Canale Radio Direzione"] || "-"}</td>
            </tr>`;
    }).join("");

    const sitoWeb = comando["sito web Comando"]
        ? `<a href="${comando["sito web Comando"]}" target="_blank" rel="noopener">Apri sito</a>` : "-";
    const intranet = comando["Intranet Comando"]
        ? `<a href="${comando["Intranet Comando"]}" target="_blank" rel="noopener">Apri intranet</a>` : "-";

    container.innerHTML = `
        <div class="riepilogo-box">
            <h3>Riepilogo Comando: ${comando.Comando}</h3>
            <table class="riepilogo-tabella">
                <tbody>
                    <tr><th>CH RADIO</th><td>${comando["Canale Radio Comando"] || "-"}</td></tr>
                    <tr><th>TEL SO</th><td>${comando["Telefono SO Comando"] || "-"}</td></tr>
                    <tr><th>SITO WEB</th><td>${sitoWeb}</td></tr>
                    <tr><th>INTRANET</th><td>${intranet}</td></tr>
                    <tr><th>DIREZIONE COLLEGATA</th><td class="cliccabile" data-direzione-di="${comando.Comando}">${comando["Direzione VVF"] || "-"}</td></tr>
                    <tr><th>TEL SO DIR</th><td>${comando["Telefono SO Direzione"] || "-"}</td></tr>
                    <tr><th>CH DIR</th><td>${comando["Canale Radio Direzione"] || "-"}</td></tr>
                </tbody>
            </table>

            <h4>Comandi Limitrofi <span style="font-size:11px; color: var(--text-muted); text-transform:none;">(clicca per dettagli)</span></h4>
            <table class="riepilogo-tabella-limitrofi">
                <thead>
                    <tr>
                        <th>Comando</th>
                        <th>CH COM</th>
                        <th>Direzione Collegata</th>
                        <th>CH DIR</th>
                    </tr>
                </thead>
                <tbody>
                    ${limitrofiRighe || '<tr><td colspan="4">Nessun comando limitrofo disponibile</td></tr>'}
                </tbody>
            </table>
        </div>
    `;

    // Delega gli eventi di click una sola volta per tutto il container
    container.querySelectorAll("[data-comando]").forEach(el => {
        el.addEventListener("click", (e) => {
            const nome = el.dataset.comando;
            const c = trovaComandoPerNome(nome, tuttiComandi);
            if (c) popupDatiComando(e, c);
        });
    });

    container.querySelectorAll("[data-direzione-di]").forEach(el => {
        el.addEventListener("click", (e) => {
            const nome = el.dataset.direzioneDi;
            const c = trovaComandoPerNome(nome, tuttiComandi);
            if (c) popupDatiDirezione(e, c);
        });
    });
}

    // Orologio in tempo reale e Turno VVF
function updateClockAndShift() {
    const now = new Date();
    const options = {
        timeZone: 'Europe/Rome',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    };

    const formatter = new Intl.DateTimeFormat('it-IT', options);
    document.getElementById("display-datetime").textContent = formatter.format(now);
    document.getElementById("display-turno").textContent = calcolaTurnoVVF();
}

// Sequenza dei turni: 32 giorni × 3 fasce giornaliere (8h + 12h + 4h)
const SEQUENZA_TURNI = ["A4", "C4", "B4", "B4", "D4", "C4", "C4", "A5", "D4", "D4", "B5", "A5", "A5", "C5", "B5", "B5", "D5", "C5", "C5", "A6", "D5", "D5", "B6", "A6", "A6", "C6", "B6", "B6", "D6", "C6", "C6", "A7", "D6", "D6", "B7", "A7", "A7", "C7", "B7", "B7", "D7", "C7", "C7", "A8", "D7", "D7", "B8", "A8", "A8", "C8", "B8", "B8", "D8", "C8", "C8", "A1", "D8", "D8", "B1", "A1", "A1", "C1", "B1", "B1", "D1", "C1", "C1", "A2", "D1", "D1", "B2", "A2", "A2", "C2", "B2", "B2", "D2", "C2", "C2", "A3", "D2", "D2", "B3", "A3", "A3", "C3", "B3", "B3", "D3", "C3", "C3", "A4", "D3", "D3", "B4", "A4"];

const GIORNI_CICLO = 32;
const MS_AL_GIORNO = 24 * 60 * 60 * 1000;

// Riferimento: 26/01/2026 00:00 ora civile di Roma = inizio ciclo (A4)
const RIFERIMENTO_CICLO_MS = Date.UTC(2026, 0, 26, 0, 0, 0);

// Estrae i componenti orari civili di Roma per un istante, indipendentemente
// dal fuso orario del dispositivo dell'utente
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
        hour: parseInt(get('hour'), 10) % 24, // alcuni browser danno "24" per mezzanotte
        minute: parseInt(get('minute'), 10),
        second: parseInt(get('second'), 10)
    };
}

// Converte i componenti civili in pseudo-timestamp a 24h fisse per giorno,
// per non farsi sballare dal cambio ora legale/solare
function pseudoTimestamp(componenti) {
    return Date.UTC(
        componenti.year, componenti.month - 1, componenti.day,
        componenti.hour, componenti.minute, componenti.second
    );
}

// Calcola il turno VVF corrente (sempre "adesso", nessun parametro da passare)
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
    else fasciaIndex = 2;                     // 20:00 - 24:00 Roma

    const slotIndex = giornoIndex * 3 + fasciaIndex;
    return SEQUENZA_TURNI[slotIndex] || "N/D";
}
    setInterval(updateClockAndShift, 1000);
    updateClockAndShift();
});
