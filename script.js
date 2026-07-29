document.addEventListener("DOMContentLoaded", () => {
    const modal = document.getElementById("modal-comando");
    const selectComando = document.getElementById("select-comando");
    const btnConferma = document.getElementById("btn-conferma-comando");
    const displayComando = document.getElementById("display-comando");

    let comandiData = []; // teniamo l'intero elenco in memoria per i lookup dei limitrofi

    fetch("/FireOps/db/comandi.json")
        .then(response => {
            if (!response.ok) throw new Error("Impossibile trovare il file db/comandi.json");
            return response.json();
        })
        .then(comandi => {
            comandiData = comandi;

            selectComando.innerHTML = '<option value="" disabled selected>-- Seleziona Comando --</option>';

            comandi.forEach(comando => {
                const option = document.createElement("option");
                option.value = comando.Comando;
                option.textContent = comando.Comando;
                selectComando.appendChild(option);
            });

            selectComando.disabled = false;
        })
        .catch(error => {
            console.error("Errore nel fetch del JSON:", error);
            selectComando.innerHTML = '<option value="" disabled selected>Errore caricamento comandi</option>';
        });

    selectComando.addEventListener("change", () => {
        if (selectComando.value) {
            btnConferma.disabled = false;
        }
    });

    btnConferma.addEventListener("click", () => {
        const scelto = selectComando.value;
        if (scelto) {
            displayComando.textContent = scelto;
            modal.style.display = "none";

            const comandoSelezionato = comandiData.find(c => c.Comando === scelto);
            renderRiepilogoComando(comandoSelezionato, comandiData);
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
        document.getElementById("display-turno").textContent = calcolaTurnoVVF(now);
    }

function calcolaTurnoVVF(date) {
    // Ancoriamo il calcolo a una data e ora di riferimento certa.
    // Usiamo come base OGGI (29 Luglio 2026 alle ore 08:00) in cui sappiamo che c'è il Turno C - Salto 2.
    // (Nota: su JavaScript i mesi vanno da 0 a 11, quindi 6 = Luglio)
    const baseDate = new Date(2026, 6, 29, 8, 0, 0); 
    
    // Differenza in millisecondi rispetto alla base
    const diffMs = date - baseDate;
    
    // Calcoliamo quanti blocchi da 12 ore sono trascorsi (cambio turno alle 08:00 e alle 20:00)
    // Se l'orario corrente è prima delle 08:00 ma dopo la mezzanotte, fa ancora parte del turno della notte precedente.
    let diffHalfDays = Math.floor(diffMs / (1000 * 60 * 60 * 12));
    
    // Sequenza fissa e ordinata dei 4 turni (A, B, C, D)
    const turniList = ['A', 'B', 'C', 'D'];
    
    // Indice di partenza del turno base (Oggi alle 08:00 c'è il Turno C -> indice 2)
    const baseTurnoIndex = 3; 
    
    // Calcolo del Turno corrente (Avanza di 1 ogni 12 ore)
    const turnoIndex = (baseTurnoIndex + diffHalfDays) % 4;
    const letteraTurno = turniList[(turnoIndex + 4) % 4];
    
    // Calcolo del Salto Turno (da 1 a 8)
    // Il salto turno avanza di 1 ogni volta che il ciclo dei 4 turni si ripete (cioè ogni 4 blocchi di 12 ore = 2 giorni)
    const baseSalto = 3; // Salto di partenza noto per oggi
    const cicliSalto = Math.floor(diffHalfDays / 4);
    
    // Formula modulare da 1 a 8 per il salto turno
    let saltoTurno = ((baseSalto - 1 + cicliSalto) % 8) + 1;
    if (saltoTurno <= 0) saltoTurno += 8;

    return `Turno ${letteraTurno} - Salto ${saltoTurno}`;
}

    setInterval(updateClockAndShift, 1000);
    updateClockAndShift();
});
