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
                    <td>${c.Comando}</td>
                    <td>${c["Canale Radio Comando"] || "-"}</td>
                    <td>${c["Direzione VVF"] || "-"}</td>
                    <td>${c["Canale Radio Direzione"] || "-"}</td>
                </tr>`;
        }).join("");

        const sitoWeb = comando["sito web Comando"]
            ? `<a href="${comando["sito web Comando"]}" target="_blank" rel="noopener">Apri sito</a>`
            : "-";
        const intranet = comando["Intranet Comando"]
            ? `<a href="${comando["Intranet Comando"]}" target="_blank" rel="noopener">Apri intranet</a>`
            : "-";

        container.innerHTML = `
            <div class="riepilogo-box">
                <h3>Riepilogo Comando: ${comando.Comando}</h3>
                <table class="riepilogo-tabella">
                    <tbody>
                        <tr><th>CH RADIO</th><td>${comando["Canale Radio Comando"] || "-"}</td></tr>
                        <tr><th>TEL SO</th><td>${comando["Telefono SO Comando"] || "-"}</td></tr>
                        <tr><th>SITO WEB</th><td>${sitoWeb}</td></tr>
                        <tr><th>INTRANET</th><td>${intranet}</td></tr>
                        <tr><th>DIREZIONE COLLEGATA</th><td>${comando["Direzione VVF"] || "-"}</td></tr>
                        <tr><th>TEL SO DIR</th><td>${comando["Telefono SO Direzione"] || "-"}</td></tr>
                        <tr><th>CH DIR</th><td>${comando["Canale Radio Direzione"] || "-"}</td></tr>
                    </tbody>
                </table>

                <h4>Comandi Limitrofi</h4>
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
        const baseDate = new Date(2026, 0, 1, 8, 0, 0);
        const diffHours = (date - baseDate) / (1000 * 60 * 60);

        if (diffHours < 0) return "Turno 1 / 2";

        const cycleHours = 96;
        const currentCycleHour = diffHours % cycleHours;

        if (currentCycleHour < 12) return "Smonto / SM";
        else if (currentCycleHour < 36) return "Riposo / 24";
        else if (currentCycleHour < 48) return "Smonto / SM";
        else return "Servizio / 48";
    }

    setInterval(updateClockAndShift, 1000);
    updateClockAndShift();
});
