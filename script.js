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
    let conData = null;   // record singolo, nazionale
    let socavData = null; // record singolo, nazionale
    let modalChiudibile = false; // true solo quando riaperto manualmente col pulsante ☰

    Promise.all([
        fetch("/FireOps/db/comandi.json").then(r => {
            if (!r.ok) throw new Error("Impossibile trovare comandi.json");
            return r.json();
        }),
        fetch("/FireOps/db/direzioni.json").then(r => {
            if (!r.ok) throw new Error("Impossibile trovare direzioni.json");
            return r.json();
        }),
        fetch("/FireOps/db/CON.json").then(r => {
            if (!r.ok) throw new Error("Impossibile trovare CON.json");
            return r.json();
        }),
        fetch("/FireOps/db/SOCAV.json").then(r => {
            if (!r.ok) throw new Error("Impossibile trovare SOCAV.json");
            return r.json();
        })
    ])
    .then(([comandi, direzioni, con, socav]) => {
        comandiData = comandi;
        direzioniData = direzioni;
        conData = Array.isArray(con) ? con[0] : con;
        socavData = Array.isArray(socav) ? socav[0] : socav;

        selectComando.innerHTML = '<option value="" disabled selected>-- Seleziona Comando --</option>';
        comandi.forEach(c => {
            const option = document.createElement("option");
            option.value = c.Comando;
            option.textContent = c.Comando;
            selectComando.appendChild(option);
        });
        selectComando.disabled = false;

        // Popola anche il selettore "destinatario rapido" della pagina Messaggistica
        popolaSelectDestinatarioMsg(comandiData);

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
        renderRiepilogoComando(comandoSelezionato, comandiData, direzioniData, conData, socavData);
    }

    // Apre il modale in modalità "cambio comando" (chiudibile)
    function apriModaleCambioComando() {
        modalChiudibile = true;
        modalContent.classList.add("chiudibile");

        const comandoAttuale = sessionStorage.getItem(CHIAVE_STORAGE);
        if (comandoAttuale) {
            selectComando.value = comandoAttuale;
            btnConferma.disabled = false;
        }

        modal.style.display = "flex";
    }

    // Chiude il modale solo se è stato aperto manualmente (mai alla prima selezione obbligatoria)
    function chiudiModaleSeConsentito() {
        if (!modalChiudibile) return;
        modal.style.display = "none";
        modalContent.classList.remove("chiudibile");
        modalChiudibile = false;
    }

    btnCambiaComando.addEventListener("click", apriModaleCambioComando);
    modalClose.addEventListener("click", chiudiModaleSeConsentito);

    // Chiude cliccando sull'overlay fuori dal box (solo se chiudibile)
    modal.addEventListener("click", (e) => {
        if (e.target === modal) chiudiModaleSeConsentito();
    });

    // Chiude con ESC (solo se chiudibile)
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") chiudiModaleSeConsentito();
    });

    selectComando.addEventListener("change", () => {
        if (selectComando.value) btnConferma.disabled = false;
    });

    btnConferma.addEventListener("click", () => {
        const scelto = selectComando.value;
        if (scelto) {
            attivaComando(scelto);
            modal.style.display = "none";
            modalContent.classList.remove("chiudibile");
            modalChiudibile = false;
        }
    });

    // Cerca un comando per nome esatto all'interno dell'elenco completo
    function trovaComandoPerNome(nome, lista) {
        return lista.find(c => c.Comando === nome);
    }

    // Cerca una direzione per nome esatto all'interno dell'elenco completo
    function trovaDirezionePerNome(nome, lista) {
        return lista.find(d => d["Direzione VVF"] === nome);
    }

    // Costruisce un link "naviga con Google Maps" a partire da un indirizzo testuale e una stringa di coordinate "lat, lng"
    function creaLinkMaps(testoIndirizzo, coordinate) {
        if (!testoIndirizzo) return "-";
        if (!coordinate) return testoIndirizzo;

        const coords = coordinate.split(",").map(s => s.trim()).join(",");
        const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(coords)}&travelmode=driving&dir_action=navigate`;
        return `<a href="${url}" target="_blank" rel="noopener" class="indirizzo-link">${testoIndirizzo}</a>`;
    }

    // Genera l'HTML per un campo email o telefono copiabile
    function creaCampoCopiabile(valore, tipo) {
        if (!valore || valore === '-') return '-';

        const classeCss = tipo === 'telefono' ? 'telefono-cliccabile' : 'email-cliccabile';

        // Se è un telefono, formatta con '0' iniziale e senza spazi per la copia
        const valoreCopia = tipo === 'telefono' ? formattaTelefonoPerCopia(valore) : valore;

        return `<span class="${classeCss}" data-copia="${valoreCopia}">${valore}</span>`;
    }

    // Chiude qualsiasi popup aperto
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

        // Attiva il click-to-copy dentro il popup per telefoni ed email
        popup.querySelectorAll(".telefono-cliccabile, .email-cliccabile").forEach(el => {
            el.addEventListener("click", (e) => copiaTesto(e, el.dataset.copia));
        });
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
            <tr><th>Indirizzo</th><td>${creaLinkMaps(c["Indirizzo Completo"], c["Coordinate"])}</td></tr>
            <tr><th>CH VHF COM</th><td>${c["Canale Radio Comando"] || "-"}</td></tr>
            <tr><th>TEL SO COM</th><td>${creaCampoCopiabile(c["Telefono SO Comando"], 'telefono')}</td></tr>
            <tr><th>SITO WEB</th><td>${sitoWeb}</td></tr>
            <tr><th>INTRANET</th><td>${intranet}</td></tr>
            <tr><th>DIREZIONE</th><td>${c["Direzione VVF"] || "-"}</td></tr>
            <tr><th>TEL SO DIR</th><td>${creaCampoCopiabile(c["Telefono SO Direzione"], 'telefono')}</td></tr>
            <tr><th>CH DIR</th><td>${c["Canale Radio Direzione"] || "-"}</td></tr>
        `;
        mostraPopupDati(event, `Comando: ${c.Comando}`, righe);
    }

    function popupDatiDirezione(event, c, tutteDirezioni) {
        const direzioneCollegata = trovaDirezionePerNome(c["Direzione VVF"], tutteDirezioni);
        const coordinateDirezione = direzioneCollegata ? direzioneCollegata["Coordinate DIR"] : null;

        const righe = `
            <tr><th>DIREZIONE</th><td>${c["Direzione VVF"] || "-"}</td></tr>
            <tr><th>Indirizzo</th><td>${creaLinkMaps(c["Indirizzo Direzione"], coordinateDirezione)}</td></tr>
            <tr><th>TEL SO DIR</th><td>${creaCampoCopiabile(c["Telefono SO Direzione"], 'telefono')}</td></tr>
            <tr><th>CH DIR</th><td>${c["Canale Radio Direzione"] || "-"}</td></tr>
            <tr><th>EMAIL SO DIR</th><td>${creaCampoCopiabile(c["email SO Direzione"], 'email')}</td></tr>
            <tr><th>PEC SO DIR</th><td>${creaCampoCopiabile(c["PEC SO Direzione"], 'email')}</td></tr>
        `;
        mostraPopupDati(event, `Direzione: ${c["Direzione VVF"]}`, righe);
    }

    // Copia un testo negli appunti e mostra un feedback visivo
    function copiaTesto(event, testo) {
        event.stopPropagation();
        if (!testo || testo === '-') return;

        navigator.clipboard.writeText(testo)
            .then(() => mostraFeedbackCopia(event, '✓ Copiato'))
            .catch(() => mostraFeedbackCopia(event, '✗ Errore copia'));
    }

    // Mostra un piccolo badge temporaneo vicino al punto cliccato
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

    // Apre/chiude una sezione comprimibile
    function toggleSezione(header, contenuto) {
        header.classList.toggle("aperta");
        contenuto.classList.toggle("aperta");
    }

    // Costruisce e inserisce il riepilogo dati del comando nella dashboard
    function renderRiepilogoComando(comando, tuttiComandi, tutteDirezioni, con, socav) {
        const container = document.getElementById("riepilogo-comando");
        if (!container) return;

        if (!comando) {
            container.innerHTML = "<p>Dati comando non disponibili.</p>";
            return;
        }

        const direzioneCollegata = trovaDirezionePerNome(comando["Direzione VVF"], tutteDirezioni);
        const coordinateDirezione = direzioneCollegata ? direzioneCollegata["Coordinate DIR"] : null;
        const coordinateCon = con ? con["Coordinate"] : null;
        const coordinateSocav = socav ? socav["Coordinate"] : null;

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
                <h3>Informazioni generali</h3>

                <h4 class="sezione-toggle" data-target="sezione-comando">Info Comando ${comando.Comando}</h4>
                <table id="sezione-comando" class="riepilogo-tabella sezione-contenuto">
                    <tbody>
                        <tr><th>Indirizzo</th><td>${creaLinkMaps(comando["Indirizzo Completo"], comando["Coordinate"])}</td></tr>
                        <tr><th>TEL SO COM</th><td>${creaCampoCopiabile(comando["Telefono SO Comando"], 'telefono')}</td></tr>
                        <tr><th>CH VHF COM</th><td>${comando["Canale Radio Comando"] || "-"}</td></tr>
                        <tr><th>CHS SO COM</th><td>${comando["CHS Comando"] || "-"}</td></tr>
                        <tr><th>Email SO Comando</th><td>${creaCampoCopiabile(comando["email SO Comando"], 'email')}</td></tr>
                        <tr><th>PEC SO Comando</th><td>${creaCampoCopiabile(comando["PEC SO Comando"], 'email')}</td></tr>
                        <tr><th>Email Comando</th><td>${creaCampoCopiabile(comando["email Comando"], 'email')}</td></tr>
                        <tr><th>PEC Comando</th><td>${creaCampoCopiabile(comando["PEC Comando"], 'email')}</td></tr>
                        <tr><th>Sito WEB</th><td>${sitoWeb}</td></tr>
                        <tr><th>Intranet</th><td>${intranet}</td></tr>
                    </tbody>
                </table>

                <h4 class="sezione-toggle" data-target="sezione-direzione">Info Direzione ${comando["Direzione VVF"] || "-"}</h4>
                <table id="sezione-direzione" class="riepilogo-tabella sezione-contenuto">
                    <tbody>
                        <tr><th>Indirizzo</th><td>${creaLinkMaps(comando["Indirizzo Direzione"], coordinateDirezione)}</td></tr>
                        <tr><th>TEL SO DIR</th><td>${creaCampoCopiabile(comando["Telefono SO Direzione"], 'telefono')}</td></tr>
                        <tr><th>CH VHF DIR</th><td>${comando["Canale Radio Direzione"] || "-"}</td></tr>
                        <tr><th>CHS SO DIR</th><td>${comando["CHS Direzione"] || "-"}</td></tr>
                        <tr><th>Email SO Direzione</th><td>${creaCampoCopiabile(comando["email SO Direzione"], 'email')}</td></tr>
                        <tr><th>PEC SO Direzione</th><td>${creaCampoCopiabile(comando["PEC SO Direzione"], 'email')}</td></tr>
                        <tr><th>Email Direzione</th><td>${creaCampoCopiabile(comando["email Direzione"], 'email')}</td></tr>
                        <tr><th>PEC Direzione</th><td>${creaCampoCopiabile(comando["PEC Direzione"], 'email')}</td></tr>
                    </tbody>
                </table>

                <h4 class="sezione-toggle" data-target="sezione-con">Info CON - Centro Operativo Nazionale</h4>
                <table id="sezione-con" class="riepilogo-tabella sezione-contenuto">
                    <tbody>
                        <tr><th>Indirizzo</th><td>${creaLinkMaps(comando["Indirizzo CON"], coordinateCon)}</td></tr>
                        <tr><th>TEL SO CON</th><td>${creaCampoCopiabile(comando["Telefono SO CON"], 'telefono')}</td></tr>
                        <tr><th>CH VHF CON</th><td>${comando["Canale Radio CON"] || "-"}</td></tr>
                        <tr><th>CHS CON</th><td>${comando["CHS CON"] || "-"}</td></tr>
                        <tr><th>Email SO CON</th><td>${creaCampoCopiabile(comando["email SO CON"], 'email')}</td></tr>
                    </tbody>
                </table>

                <h4 class="sezione-toggle" data-target="sezione-socav">Info SOCAV - Assistenza al Volo</h4>
                <table id="sezione-socav" class="riepilogo-tabella sezione-contenuto">
                    <tbody>
                        <tr><th>Indirizzo</th><td>${creaLinkMaps(comando["Indirizzo SOCAV"], coordinateSocav)}</td></tr>
                        <tr><th>TEL SOCAV</th><td>${creaCampoCopiabile(comando["Telefono SOCAV"], 'telefono')}</td></tr>
                        <tr><th>Email SOCAV</th><td>${creaCampoCopiabile(comando["email SOCAV"], 'email')}</td></tr>
                    </tbody>
                </table>

                <h4>Comandi Limitrofi</h4>
                <table id="sezione-limitrofi" class="riepilogo-tabella-limitrofi sezione-contenuto aperta">
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

        // Delegazione eventi click nel riepilogo
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
                if (c) popupDatiDirezione(e, c, tutteDirezioni);
            });
        });

        // Gestisce la copia sia per i telefoni che per le email
        container.querySelectorAll(".telefono-cliccabile, .email-cliccabile").forEach(el => {
            el.addEventListener("click", (e) => copiaTesto(e, el.dataset.copia));
        });

        // Sezioni comprimibili
        container.querySelectorAll(".sezione-toggle").forEach(header => {
            const contenuto = document.getElementById(header.dataset.target);
            if (contenuto) {
                header.addEventListener("click", () => toggleSezione(header, contenuto));
            }
        });
    }

    // ==========================================================
    // NAVIGAZIONE A SCHEDE (SPA): mostra/nasconde le sezioni
    // in base all'hash dell'URL, senza ricaricare la pagina
    // ==========================================================
    const paginaSections = document.querySelectorAll(".page-section");
    const navLinks = document.querySelectorAll(".sticky-nav a[data-page]");

    function mostraPagina(idPagina) {
        const idValido = document.getElementById(idPagina) ? idPagina : "homepage";

        paginaSections.forEach(sezione => {
            sezione.classList.toggle("attiva", sezione.id === idValido);
        });

        navLinks.forEach(link => {
            link.classList.toggle("attivo", link.dataset.page === idValido);
        });

        // Chiude eventuali popup rimasti aperti quando si cambia pagina
        chiudiPopupDati();
    }

    window.addEventListener("hashchange", () => {
        const idPagina = window.location.hash.replace("#", "") || "homepage";
        mostraPagina(idPagina);
    });

    // Mostra subito la pagina corretta all'apertura (rispetta un eventuale hash nell'URL)
    const idPaginaIniziale = window.location.hash.replace("#", "") || "homepage";
    mostraPagina(idPaginaIniziale);

    // ==========================================================
    // PAGINA MESSAGGISTICA: componi un messaggio e invialo
    // tramite WhatsApp o Telegram
    // ==========================================================
    const selectDestinatarioMsg = document.getElementById("msg-destinatario");
    const inputNumeroMsg = document.getElementById("msg-numero");
    const textareaMsg = document.getElementById("msg-testo");
    const btnInviaWhatsapp = document.getElementById("btn-invia-whatsapp");
    const btnInviaTelegram = document.getElementById("btn-invia-telegram");

    // Popola il menu a tendina "destinatario rapido" con i Comandi disponibili
    function popolaSelectDestinatarioMsg(listaComandi) {
        if (!selectDestinatarioMsg) return;

        selectDestinatarioMsg.innerHTML = '<option value="">-- Inserimento manuale --</option>';
        listaComandi.forEach(c => {
            if (!c["Telefono SO Comando"]) return; // mostra solo chi ha un numero disponibile
            const opt = document.createElement("option");
            opt.value = c.Comando;
            opt.textContent = `${c.Comando} (SO Comando)`;
            selectDestinatarioMsg.appendChild(opt);
        });
    }
    // Espone la funzione al di fuori di questo blocco, così può essere richiamata
    // dopo il caricamento dei dati nel Promise.all iniziale
    window.popolaSelectDestinatarioMsg = popolaSelectDestinatarioMsg;

    if (selectDestinatarioMsg) {
        selectDestinatarioMsg.addEventListener("change", () => {
            const nomeComando = selectDestinatarioMsg.value;
            if (!nomeComando) return;

            const comandoTrovato = comandiData.find(c => c.Comando === nomeComando);
            if (comandoTrovato && comandoTrovato["Telefono SO Comando"]) {
                inputNumeroMsg.value = formattaTelefonoPerCopia(comandoTrovato["Telefono SO Comando"]);
            }
        });
    }

    // Converte un numero italiano (es. "0123456789" o "+39 012 345 6789")
    // nel formato internazionale richiesto da wa.me (solo cifre, senza "+", con prefisso 39)
    function formattaNumeroWhatsapp(numero) {
        if (!numero) return "";

        let pulito = numero.replace(/[^\d+]/g, "");

        if (pulito.startsWith("+")) {
            pulito = pulito.slice(1);
        }
        if (pulito.startsWith("0")) {
            pulito = "39" + pulito.slice(1);
        } else if (!pulito.startsWith("39")) {
            pulito = "39" + pulito;
        }

        return pulito;
    }

    if (btnInviaWhatsapp) {
        btnInviaWhatsapp.addEventListener("click", () => {
            const testo = textareaMsg.value.trim();
            if (!testo) {
                alert("Scrivi un messaggio prima di inviarlo.");
                return;
            }

            const numero = inputNumeroMsg.value.trim();
            const testoCodificato = encodeURIComponent(testo);

            const url = numero
                ? `https://wa.me/${formattaNumeroWhatsapp(numero)}?text=${testoCodificato}`
                : `https://api.whatsapp.com/send?text=${testoCodificato}`;

            window.open(url, "_blank", "noopener");
        });
    }

    if (btnInviaTelegram) {
        btnInviaTelegram.addEventListener("click", () => {
            const testo = textareaMsg.value.trim();
            if (!testo) {
                alert("Scrivi un messaggio prima di inviarlo.");
                return;
            }

            // Telegram non permette, per privacy, di aprire una chat diretta
            // partendo da un numero di telefono via link web pubblico.
            // Si apre quindi la finestra di condivisione: sarà l'utente a
            // scegliere il contatto o il gruppo a cui inviare il messaggio.
            const testoCodificato = encodeURIComponent(testo);
            const url = `https://t.me/share/url?url=&text=${testoCodificato}`;

            window.open(url, "_blank", "noopener");
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

    setInterval(updateClockAndShift, 1000);
    updateClockAndShift();
});

// Pulisce e formatta il numero di telefono per la copia:
// rimuove gli spazi e assicura che inizi con uno '0' (se non presente)
function formattaTelefonoPerCopia(telefono) {
    if (!telefono || telefono === '-') return '';

    // Rimuove tutti gli spazi
    let pulito = telefono.replace(/\s+/g, '');

    // Se non inizia già con '0' e non è un prefisso internazionale (+), aggiunge lo '0'
    if (!pulito.startsWith('0') && !pulito.startsWith('+')) {
        pulito = '0' + pulito;
    }

    return pulito;
}