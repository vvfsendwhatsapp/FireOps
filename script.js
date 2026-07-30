document.addEventListener("DOMContentLoaded", () => {
    const modal = document.getElementById("modal-comando");
    const modalContent = modal.querySelector(".modal-content");
    const modalClose = modal.querySelector(".modal-close");
    const selectComando = document.getElementById("select-comando");
    const btnConferma = document.getElementById("btn-conferma-comando");
    const displayComando = document.getElementById("display-comando");
    const btnCambiaComando = document.getElementById("btn-cambia-comando");

const CHIAVE_STORAGE = "fireops_comando_selezionato";
let comandiData = [];
let direzioniData = [];
let modalChiudibile = false;

Promise.all([
    fetch("/FireOps/db/comandi.json").then(r => {
        if (!r.ok) throw new Error("Impossibile trovare comandi.json");
        return r.json();
    }),
    fetch("/FireOps/db/direzioni.json").then(r => {
        if (!r.ok) throw new Error("Impossibile trovare direzioni.json");
        return r.json();
    })
])
.then(([comandi, direzioni]) => {
    comandiData = comandi;
    direzioniData = direzioni;

    selectComando.innerHTML = '<option value="" disabled selected>-- Seleziona Comando --</option>';
    comandi.forEach(c => {
        const option = document.createElement("option");
        option.value = c.Comando;
        option.textContent = c.Comando;
        selectComando.appendChild(option);
    });
    selectComando.disabled = false;

    const comandoSalvato = sessionStorage.getItem(CHIAVE_STORAGE);
    if (comandoSalvato && comandiData.some(c => c.Comando === comandoSalvato)) {
        attivaComando(comandoSalvato);
        modal.style.display = "none";
    }
})
.catch(error => {
    console.error("Errore nel caricamento dei dati:", error);
    selectComando.innerHTML = '<option value="" disabled selected>Errore caricamento comandi</option>';
});

    function attivaComando(nomeComando) {
    sessionStorage.setItem(CHIAVE_STORAGE, nomeComando);
    displayComando.textContent = `Sala Operativa - Comando VVF ${nomeComando}`;

    const homeNomeComando = document.getElementById("home-nome-comando");
    if (homeNomeComando) homeNomeComando.textContent = nomeComando;

    const comandoSelezionato = comandiData.find(c => c.Comando === nomeComando);
function renderRiepilogoComando(comando, tuttiComandi, tutteDirezioni) {
    const container = document.getElementById("riepilogo-comando");
    if (!container) return;

    if (!comando) {
        container.innerHTML = "<p>Dati comando non disponibili.</p>";
        return;
    }

    const direzioneCollegata = trovaDirezionePerNome(comando["Direzione VVF"], tutteDirezioni);
    const coordinateDirezione = direzioneCollegata ? direzioneCollegata["Coordinate DIR"] : null;

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
            <h3>Sala Operativa - Comando VVF ${comando.Comando}</h3>

            <h4 class="sezione-toggle" data-target="sezione-comando">Comando</h4>
            <table id="sezione-comando" class="riepilogo-tabella sezione-contenuto">
                <tbody>
                    <tr><th>Indirizzo</th><td>${renderIndirizzoLink(comando["Indirizzo Completo"], comando["Coordinate"])}</td></tr>
                    <tr><th>TEL SO COM</th><td><span class="telefono-cliccabile" data-telefono="${comando["Telefono SO Comando"] || ''}">${comando["Telefono SO Comando"] || "-"}</span></td></tr>
                    <tr><th>CH VHF COM</th><td>${comando["Canale Radio Comando"] || "-"}</td></tr>
                    <tr><th>CHS Comando</th><td>${comando["CHS Comando"] || "-"}</td></tr>
                    <tr><th>Email SO Comando</th><td>${comando["email SO Comando"] || "-"}</td></tr>
                    <tr><th>PEC SO Comando</th><td>${comando["PEC SO Comando"] || "-"}</td></tr>
                    <tr><th>Email Comando</th><td>${comando["email Comando"] || "-"}</td></tr>
                    <tr><th>PEC Comando</th><td>${comando["PEC Comando"] || "-"}</td></tr>
                    <tr><th>Sito WEB</th><td>${sitoWeb}</td></tr>
                    <tr><th>Intranet</th><td>${intranet}</td></tr>
                </tbody>
            </table>

            <h4 class="sezione-toggle" data-target="sezione-direzione">Direzione VVF</h4>
            <table id="sezione-direzione" class="riepilogo-tabella sezione-contenuto">
                <tbody>
                    <tr><th>Direzione</th><td class="cliccabile" data-direzione-di="${comando.Comando}">${comando["Direzione VVF"] || "-"}</td></tr>
                    <tr><th>Indirizzo</th><td>${renderIndirizzoLink(comando["Indirizzo Direzione"], coordinateDirezione)}</td></tr>
                    <tr><th>TEL SO DIR</th><td><span class="telefono-cliccabile" data-telefono="${comando["Telefono SO Direzione"] || ''}">${comando["Telefono SO Direzione"] || "-"}</span></td></tr>
                    <tr><th>CH VHF DIR</th><td>${comando["Canale Radio Direzione"] || "-"}</td></tr>
                    <tr><th>CHS Direzione</th><td>${comando["CHS Direzione"] || "-"}</td></tr>
                    <tr><th>Email SO Direzione</th><td>${comando["email SO Direzione"] || "-"}</td></tr>
                    <tr><th>PEC SO Direzione</th><td>${comando["PEC SO Direzione"] || "-"}</td></tr>
                    <tr><th>Email Direzione</th><td>${comando["email Direzione"] || "-"}</td></tr>
                    <tr><th>PEC Direzione</th><td>${comando["PEC Direzione"] || "-"}</td></tr>
                </tbody>
            </table>

            <h4 class="sezione-toggle" data-target="sezione-con">CON — Centro Operativo Nazionale</h4>
            <table id="sezione-con" class="riepilogo-tabella sezione-contenuto">
                <tbody>
                    <tr><th>Indirizzo</th><td>${renderIndirizzoLink(comando["Indirizzo CON"], null)}</td></tr>
                    <tr><th>TEL SO CON</th><td><span class="telefono-cliccabile" data-telefono="${comando["Telefono SO CON"] || ''}">${comando["Telefono SO CON"] || "-"}</span></td></tr>
                    <tr><th>CH VHF CON</th><td>${comando["Canale Radio CON"] || "-"}</td></tr>
                    <tr><th>CHS CON</th><td>${comando["CHS CON"] || "-"}</td></tr>
                    <tr><th>Email SO CON</th><td>${comando["email SO CON"] || "-"}</td></tr>
                </tbody>
            </table>

            <h4 class="sezione-toggle" data-target="sezione-socav">SOCAV — Assistenza al Volo</h4>
            <table id="sezione-socav" class="riepilogo-tabella sezione-contenuto">
                <tbody>
                    <tr><th>Indirizzo</th><td>${renderIndirizzoLink(comando["Indirizzo SOCAV"], null)}</td></tr>
                    <tr><th>TEL SOCAV</th><td><span class="telefono-cliccabile" data-telefono="${comando["Telefono SOCAV"] || ''}">${comando["Telefono SOCAV"] || "-"}</span></td></tr>
                    <tr><th>Email SOCAV</th><td>${comando["email SOCAV"] || "-"}</td></tr>
                </tbody>
            </table>

            <h4 class="sezione-toggle" data-target="sezione-limitrofi">Comandi Limitrofi</h4>
            <table id="sezione-limitrofi" class="riepilogo-tabella-limitrofi sezione-contenuto">
                <thead>
                    <tr>
                        <th>Comando</th>
                        <th>CH VHF COM</th>
                        <th>Direzione</th>
                        <th>CH VHF DIR</th>
                    </tr>
                </thead>
                <tbody>
                    ${limitrofiRighe || '<tr><td colspan="4">Nessun comando limitrofo disponibile</td></tr>'}
                </tbody>
            </table>
        </div>
    `;

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

    container.querySelectorAll(".telefono-cliccabile").forEach(el => {
        el.addEventListener("click", (e) => copiaTelefono(e, el.dataset.telefono));
    });

    // Sezioni comprimibili: chiuse di default (nessuna classe "aperta" iniziale)
    container.querySelectorAll(".sezione-toggle").forEach(header => {
        const contenuto = document.getElementById(header.dataset.target);
        if (contenuto) {
            header.addEventListener("click", () => toggleSezione(header, contenuto));
        }
    });
}

    // Orologio in tempo reale e Turno VVF
function updateClockAndShift() {
    const now = new Date();
    const c = getComponentiRoma(now);

    const pad = n => String(n).padStart(2, '0');
    const dataFormattata = `${pad(c.day)}.${pad(c.month)}.${c.year} - ${pad(c.hour)}:${pad(c.minute)}:${pad(c.second)}`;

    document.getElementById("display-datetime").textContent = dataFormattata;
    document.getElementById("display-turno").textContent = `Turno ${calcolaTurnoVVF()}`;
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
