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
    let prefissiData = []; // elenco prefissi internazionali
    let lingueData = [];   // elenco lingue disponibili per Messaggistica
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
        }),
        fetch("/FireOps/db/prefissi.json").then(r => {
            if (!r.ok) throw new Error("Impossibile trovare prefissi.json");
            return r.json();
        }),
        fetch("/FireOps/db/lingue.json").then(r => {
            if (!r.ok) throw new Error("Impossibile trovare lingue.json");
            return r.json();
        })
    ])
    .then(([comandi, direzioni, con, socav, prefissi, lingue]) => {
        comandiData = comandi;
        direzioniData = direzioni;
        conData = Array.isArray(con) ? con[0] : con;
        socavData = Array.isArray(socav) ? socav[0] : socav;
        prefissiData = prefissi;
        lingueData = lingue;

        selectComando.innerHTML = '<option value="" disabled selected>-- Seleziona Comando --</option>';
        comandi.forEach(c => {
            const option = document.createElement("option");
            option.value = c.Comando;
            option.textContent = c.Comando;
            selectComando.appendChild(option);
        });
        selectComando.disabled = false;

        // Popola i selettori della pagina Messaggistica (prefisso e lingua)
        popolaSelectPrefissoMsg(prefissiData);
        popolaSelectLinguaMsg(lingueData);

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

        // Il messaggio precompilato dipende dal Comando attivo: lo rigenero
        generaMessaggioMessaggistica();
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

        // Entrando in Messaggistica, il cursore va subito sul campo "Numero"
        if (idValido === "messaggistica") {
            const inputNumero = document.getElementById("msg-numero");
            if (inputNumero) {
                setTimeout(() => inputNumero.focus(), 50);
            }
        }
    }

    window.addEventListener("hashchange", () => {
        const idPagina = window.location.hash.replace("#", "") || "homepage";
        mostraPagina(idPagina);
    });

    // Mostra subito la pagina corretta all'apertura (rispetta un eventuale hash nell'URL)
    const idPaginaIniziale = window.location.hash.replace("#", "") || "homepage";
    mostraPagina(idPaginaIniziale);

    // ==========================================================
    // PAGINA MESSAGGISTICA: messaggio precompilato multilingua
    // + invio tramite WhatsApp Web, WhatsApp Desktop o Telegram
    // ==========================================================
    const selectPrefissoMsg = document.getElementById("msg-prefisso");
    const selectLinguaMsg = document.getElementById("msg-lingua");
    const inputNumeroMsg = document.getElementById("msg-numero");
    const textareaMsg = document.getElementById("msg-testo");
    const btnWhatsappWeb = document.getElementById("btn-whatsapp-web");
    const btnWhatsappApp = document.getElementById("btn-whatsapp-app");
    const btnInviaTelegram = document.getElementById("btn-invia-telegram");

    const PREFISSO_PREDEFINITO = "39";  // Italia
    const LINGUA_PREDEFINITA = "it";    // Italiano

    // Popola il menu a tendina dei prefissi internazionali (default: 39 - Italia)
    function popolaSelectPrefissoMsg(listaPrefissi) {
        if (!selectPrefissoMsg) return;

        selectPrefissoMsg.innerHTML = "";
        listaPrefissi.forEach(p => {
            const opt = document.createElement("option");
            opt.value = p.Valore;
            opt.textContent = p.Prefissi;
            selectPrefissoMsg.appendChild(opt);
        });

        if (listaPrefissi.some(p => p.Valore === PREFISSO_PREDEFINITO)) {
            selectPrefissoMsg.value = PREFISSO_PREDEFINITO;
        }
    }
    window.popolaSelectPrefissoMsg = popolaSelectPrefissoMsg;

    // Popola il menu a tendina delle lingue disponibili (default: Italiano)
    function popolaSelectLinguaMsg(listaLingue) {
        if (!selectLinguaMsg) return;

        selectLinguaMsg.innerHTML = "";
        listaLingue.forEach(l => {
            const opt = document.createElement("option");
            opt.value = l.code;
            opt.textContent = l.lingua;
            selectLinguaMsg.appendChild(opt);
        });

        if (listaLingue.some(l => l.code === LINGUA_PREDEFINITA)) {
            selectLinguaMsg.value = LINGUA_PREDEFINITA;
        }

        // Alla prima generazione disponibile, genera subito il messaggio
        generaMessaggioMessaggistica();
    }
    window.popolaSelectLinguaMsg = popolaSelectLinguaMsg;

    if (selectLinguaMsg) {
        selectLinguaMsg.addEventListener("change", generaMessaggioMessaggistica);
    }

    // Testi del messaggio tradotti (solo il corpo istruttivo: il footer con
    // data/ora/turno resta sempre in italiano, essendo un dato operativo).
    // Lingue non presenti in questo elenco ricadono automaticamente sull'italiano.
    const TRADUZIONI_MESSAGGIO = {
        it: `🚒 *Vigili del Fuoco {{COMANDO}}* 🚒

Messaggio generato automaticamente.

Utilizzi questo numero per inviarci posizione, foto, video o altre informazioni dell'evento che ci ha comunicato.

*QUESTO NON È UN NUMERO PER LE EMERGENZE*
e NON lo utilizzi per altri scopi o in altre occasioni senza la nostra autorizzazione.

Per tutte le richieste di soccorso chiami il
☎️🆘️
*{{NUM}}*
🇪🇺🇮🇹

Per l'invio delle coordinate:
1. Clicchi sulla "graffetta" (Android) 📎 o sul "più" (Apple) ➕
2. Clicchi su "Posizione" ⛳
3. Se necessario segua le indicazioni del dispositivo per consentire a WhatsApp di accedere alla posizione 🆗️
4. Attenda qualche istante per aumentare la precisione ⏰
5. Clicchi su "Posizione attuale" 🎯

*Rimanga al sicuro, nella posizione che ci ha condiviso e lasci libera la linea telefonica.*`,

        en: `🚒 *Fire Brigade {{COMANDO}}* 🚒

Automatically generated message.

Please use this number to send us your location, photos, videos, or other information about the incident you reported.

*THIS IS NOT AN EMERGENCY NUMBER*
and DO NOT use it for any other purpose or occasion without our permission.

For all emergency requests, call
☎️🆘️
*{{NUM}}*
🇪🇺🇮🇹

To send coordinates:
1. Click on the "paperclip" (Android) 📎 or the "plus" (Apple) ➕
2. Click on "Location" ⛳
3. If necessary, follow the device's prompts to allow WhatsApp to access your location 🆗️
4. Wait a few moments to increase accuracy ⏰
5. Click on "Current Location" 🎯

*Stay safe, in the location you shared with us, and keep your phone line free.*`,

        es: `🚒 *Bomberos {{COMANDO}}* 🚒

Mensaje generado automáticamente.

Utilice este número para enviarnos su ubicación, fotos, videos u otra información sobre el incidente que reportó.

*ESTE NO ES UN NÚMERO DE EMERGENCIA*
y NO lo utilice para ningún otro propósito o ocasión sin nuestra autorización.

Para cualquier solicitud de emergencia, llame al
☎️🆘️
*{{NUM}}*
🇪🇺🇮🇹

Para enviar coordenadas:
1. Haga clic en el icono del clip (Android) 📎 o en el signo más (+) (Apple) ➕
2. Haga clic en "Ubicación" ⛳
3. Si es necesario, siga las instrucciones del dispositivo para permitir que WhatsApp acceda a su ubicación 🆗️
4. Espere unos instantes para que la ubicación sea más precisa ⏰
5. Haga clic en "Ubicación actual" 🎯

*Manténgase a salvo en la ubicación que nos indicó y mantenga su línea telefónica libre.*`,

        fr: `🚒 *Service d'incendie {{COMANDO}}* 🚒

Message automatique.

Veuillez utiliser ce numéro pour nous envoyer votre position, des photos, des vidéos ou toute autre information concernant l'incident que vous avez signalé.

*CECI N'EST PAS UN NUMÉRO D'URGENCE*

et NE L'UTILISEZ PAS à d'autres fins sans notre autorisation.

Pour toute urgence, appelez le
☎️🆘️

*{{NUM}}*

🇪🇺🇮🇹

Pour envoyer vos coordonnées :

1. Cliquez sur le trombone (Android) 📎 ou le plus (Apple) ➕

2. Cliquez sur « Position » ⛳

3. Si nécessaire, suivez les instructions de votre appareil pour autoriser WhatsApp à accéder à votre position 🆗️

4. Patientez quelques instants pour une meilleure précision ⏰

5. Cliquez sur « Position actuelle » 🎯

*Restez en sécurité à l’endroit que vous nous avez indiqué et assurez-vous que votre ligne téléphonique est libre.*

Crédit : VVFsendWhatsApp

Vendredi 31 juillet 2026, 12 h 04 - Équipe A3`,

        sq: `🚒 *Brigada e Zjarrfikësve {{COMANDO}}* 🚒

Mesazh i gjeneruar automatikisht.

Ju lutemi përdorni këtë numër për të na dërguar vendndodhjen tuaj, fotot, videot ose informacione të tjera në lidhje me incidentin që raportuat.

*KY NUK ËSHTË NJË NUMËR URGJENCE*
dhe MOS e përdorni për asnjë qëllim ose rast tjetër pa lejen tonë.

Për të gjitha kërkesat emergjente, telefononi
☎️🆘️
*{{NUM}}*
🇪🇺🇮🇹

Për të dërguar koordinatat:
1. Klikoni mbi "kapësen e letrës" (Android) 📎 ose "plus" (Apple) ➕
2. Klikoni mbi "Vendndodhjen" ⛳
3. Nëse është e nevojshme, ndiqni udhëzimet e pajisjes për të lejuar WhatsApp të hyjë në vendndodhjen tuaj 🆗️
4. Prisni disa momente për të rritur saktësinë ⏰
5. Klikoni mbi "Vendndodhja aktuale" 🎯

*Qëndroni të sigurt, në vendndodhjen që keni ndarë me ne, dhe mbajeni linjën tuaj telefonike të lirë.*`,

        ar: `🚒 *فرقة الإطفاء {{COMANDO}}* 🚒

رسالة مُولّدة تلقائيًا.

يُرجى استخدام هذا الرقم لإرسال موقعك، أو صورك، أو مقاطع الفيديو الخاصة بك، أو أي معلومات أخرى حول الحادث الذي أبلغت عنه.

*هذا ليس رقم طوارئ*
ولا تستخدمه لأي غرض آخر أو في أي مناسبة أخرى دون إذننا.


لجميع طلبات الطوارئ، اتصل على

☎️🆘️
*{{NUM}}*
🇪🇺🇮🇹

لإرسال الإحداثيات:

١. انقر على رمز المشبك (أندرويد) 📎 أو رمز الزائد (آبل) ➕

٢. انقر على "الموقع" ⛳

٣. إذا لزم الأمر، اتبع تعليمات جهازك للسماح لتطبيق واتساب بالوصول إلى موقعك 🆗️

٤. انتظر لحظات لزيادة دقة الموقع ⏰

٥. انقر على "الموقع الحالي" 🎯

*ابقَ آمنًا في الموقع الذي شاركته معنا، وتأكد من خلو خط هاتفك.*`,

        bg: `🚒 *Пожарна бригада {{COMANDO}}* 🚒

Автоматично генерирано съобщение.

Моля, използвайте този номер, за да ни изпратите вашето местоположение, снимки, видеоклипове или друга информация за инцидента, за който съобщихте.

*ТОВА НЕ Е НОМЕР ЗА СПЕШНИ СЛУЧАИ*
и НЕ го използвайте за други цели или случаи без наше разрешение.

За всички спешни заявки, обадете се на
☎️🆘️
*{{NUM}}*
🇪🇺🇮🇹

За да изпратите координати:
1. Кликнете върху „кламер“ (Android) 📎 или „плюс“ (Apple) ➕
2. Кликнете върху „Местоположение“ ⛳
3. Ако е необходимо, следвайте инструкциите на устройството, за да позволите на WhatsApp достъп до вашето местоположение 🆗️
4. Изчакайте няколко минути, за да увеличите точността ⏰
5. Кликнете върху „Текущо местоположение“ 🎯

*Бъдете в безопасност, на мястото, което споделихте с нас, и дръжте телефонната си линия свободна.*`,

        cs: `🚒 *Hasičský sbor {{COMANDO}}* 🚒

Automaticky generovaná zpráva.

Použijte prosím toto číslo k zaslání vaší polohy, fotografií, videí nebo dalších informací o incidentu, který jste nahlásili.

*TOTO NENÍ ČÍSLO PRO NOUZOVÉ VOLITELNÉ SITUACE*
a NEPOUŽÍVEJTE ho k žádnému jinému účelu ani příležitosti bez našeho svolení.

V případě nouze volejte
☎️🆘️
*{{NUM}}*
🇪🇺🇮🇹

Odeslání souřadnic:
1. Klikněte na „sponku“ (Android) 📎 nebo „plus“ (Apple) ➕
2. Klikněte na „Poloha“ ⛳
3. V případě potřeby postupujte podle pokynů na zařízení, abyste povolili aplikaci WhatsApp přístup k vaší poloze 🆗️
4. Pro zvýšení přesnosti chvíli počkejte ⏰
5. Klikněte na „Aktuální poloha“ 🎯

*Zůstaňte v bezpečí, na místě, které jste s námi sdíleli, a mějte volnou telefonní linku.*`,

        "zh-CN": `🚒 *消 防 队 {{COMANDO}}* 🚒

自 动 生 成 的 消 息 。

使 用 此 号 码 向 我 们 发 送 您 与 我 们 交 流 的 活 动 的 位 置，照 片，视 频 或 其 他 信 息 。

*这 不 是 紧 急 号 码*
未 经 我 们 的 允 许，请 勿 将 其 用 于 任 何 其 他 目 的 或 在 其 他 场 合 使 用 。

对 于 所 有 遇 险 电 话，请 致 电
☎️🆘️
*{{NUM}}*
🇪🇺🇮🇹

发 送 坐 标：
1. 单 击 “回 形 针”（Android）📎 或 “加 号”（Apple）➕
2. 单 击“位置” ⛳
3. 如 有 必 要，请 按 照 设 备 的 说 明 进 行 操 作，以 允 许 WhatsApp 访 问 您 的 位 置 location️
4. 等 待 片 刻 以 提 高 准 确 性 ⏰
5. 单 击 “当 前 位 置” 🎯

*请 确 保 与 您 共 享 的 位 置 安 全，并 保 持 电 话 线 畅 通 。*`,

        hr: `🚒 *Vatrogasna brigada {{COMANDO}}* 🚒

Automatski generirana poruka.

Molimo vas da nam na ovaj broj pošaljete svoju lokaciju, fotografije, videozapise ili druge informacije o incidentu koji ste prijavili.

*OVO NIJE BROJ ZA HITNE SLUČAJEVE*
i NE KORISTITE ga ni u koju drugu svrhu ili prigodu bez našeg dopuštenja.

Za sve hitne zahtjeve nazovite
☎️🆘️
*{{NUM}}*
🇪🇺🇮🇹

Za slanje koordinata:
1. Kliknite na "spajalicu" (Android) 📎 ili "plus" (Apple) ➕
2. Kliknite na "Lokacija" ⛳
3. Ako je potrebno, slijedite upute uređaja kako biste WhatsAppu omogućili pristup vašoj lokaciji 🆗️
4. Pričekajte nekoliko trenutaka kako biste povećali točnost ⏰
5. Kliknite na "Trenutna lokacija" 🎯

*Ostanite sigurni, na lokaciji koju ste podijelili s nama i neka vaša telefonska linija bude slobodna.*`,

        da: `🚒 *Brandvæsen {{COMANDO}}* 🚒

Automatisk genereret besked.

Brug venligst dette nummer til at sende os din placering, fotos, videoer eller andre oplysninger om den hændelse, du har rapporteret.

*DETTE ER IKKE ET NØDNUMMER*
og brug det IKKE til andre formål eller lejligheder uden vores tilladelse.

Ved alle nødsituationer, ring
☎️🆘️
*{{NUM}}*
🇪🇺🇮🇹

Sådan sender du koordinater:
1. Klik på "papirklipsen" (Android) 📎 eller "plusset" (Apple) ➕
2. Klik på "Placering" ⛳
3. Følg om nødvendigt enhedens instruktioner for at give WhatsApp adgang til din placering 🆗️
4. Vent et par øjeblikke for at øge nøjagtigheden ⏰
5. Klik på "Aktuel placering" 🎯

*Vær sikker på den placering, du delte med os, og hold din telefonlinje fri.*`,

        et: `🚒 *Tuletõrje {{COMANDO}}* 🚒

Automaatselt genereeritud sõnum.

Palun kasutage seda numbrit, et saata meile oma asukoht, fotod, videod või muu teave teatatud juhtumi kohta.

*SEE EI OLE HÄDAABINUMBER*
ja ÄRGE kasutage seda muul eesmärgil ega sündmusel ilma meie loata.

Kõikide hädaolukordade korral helistage numbril
☎️🆘️
*{{NUM}}*
🇪🇺🇮🇹

Koordinaatide saatmiseks:
1. Klõpsake kirjaklambril (Android) 📎 või plussmärgil (Apple) ➕
2. Klõpsake valikul „Asukoht” ⛳
3. Vajadusel järgige seadme juhiseid, et lubada WhatsAppil teie asukohale juurde pääseda 🆗️
4. Oodake täpsuse suurendamiseks paar hetke ⏰
5. Klõpsake valikul „Praegune asukoht” 🎯

*Jääge turvaliselt meiega jagatud asukohas ja hoidke oma telefoniliin vaba.*`,

        fi: `🚒 *Palokunta KKKKKKK* 🚒

Automaattisesti luotu viesti.

Käytä tätä numeroa lähettääksesi meille sijaintisi, valokuvia, videoita tai muita tietoja ilmoittamastasi tapahtumasta.

*TÄMÄ EI OLE HÄTÄNUMERO*
ÄLÄKÄ käytä sitä mihinkään muuhun tarkoitukseen tai tilanteeseen ilman lupaamme.

Hätätilanteissa soita numeroon
☎️🆘️
*{{NUM}}*
🇪🇺🇮🇹

Lähetä koordinaatit seuraavasti:
1. Napsauta "paperiliitintä" (Android) 📎 tai "plus"-merkkiä (Apple) ➕
2. Napsauta "Sijainti" ⛳
3. Tarvittaessa seuraa laitteen ohjeita, jotta WhatsApp voi käyttää sijaintiasi 🆗️
4. Odota hetki tarkkuuden lisäämiseksi ⏰
5. Napsauta "Nykyinen sijainti" 🎯

*Pysy turvassa jakamassasi sijainnissa ja pidä puhelinlinjasi vapaana.*`,

        el: `🚒 *Πυροσβεστική Υπηρεσία {{COMANDO}}* 🚒

Αυτόματα δημιουργημένο μήνυμα.

Χρησιμοποιήστε αυτόν τον αριθμό για να μας στείλετε την τοποθεσία σας, φωτογραφίες, βίντεο ή άλλες πληροφορίες σχετικά με το περιστατικό που αναφέρατε.

*ΑΥΤΟΣ ΔΕΝ ΕΙΝΑΙ ΑΡΙΘΜΟΣ ΕΚΤΑΚΤΗΣ ΑΝΑΓΚΗΣ*
και ΜΗΝ τον χρησιμοποιείτε για κανέναν άλλο σκοπό ή περίσταση χωρίς την άδειά μας.

Για όλα τα αιτήματα έκτακτης ανάγκης, καλέστε
☎️🆘️
*{{NUM}}*
🇪🇺🇮🇹

Για να στείλετε συντεταγμένες:
1. Κάντε κλικ στον "συνδετήρα" (Android) 📎 ή στο "συν" (Apple) ➕
2. Κάντε κλικ στην "Τοποθεσία" ⛳
3. Εάν είναι απαραίτητο, ακολουθήστε τις οδηγίες της συσκευής για να επιτρέψετε στο WhatsApp να έχει πρόσβαση στην τοποθεσία σας 🆗️
4. Περιμένετε λίγα λεπτά για να αυξήσετε την ακρίβεια ⏰
5. Κάντε κλικ στην "Τρέχουσα τοποθεσία" 🎯

*Μείνετε ασφαλείς, στην τοποθεσία που μας κοινοποιήσατε, και κρατήστε την τηλεφωνική σας γραμμή ελεύθερη.*`,

        ga: `🚒 *Briogáid Dóiteáin {{COMANDO}}* 🚒

Teachtaireacht a ghintear go huathoibríoch.

Úsáid an uimhir seo le do shuíomh, grianghraif, físeáin, nó faisnéis eile faoin eachtra a thuairiscigh tú a sheoladh chugainn.

*NÍ UIMHIR ÉIGEANDÁLA É SEO*
agus NÁ húsáid í chun aon chríche nó ócáide eile gan ár gcead.

I gcás gach iarratais éigeandála, glaoigh ar
☎️🆘️
*{{NUM}}*
🇪🇺🇮🇹

Chun comhordanáidí a sheoladh:
1. Cliceáil ar an "gearrthóg páipéir" (Android) 📎 nó an "móide" (Apple) ➕
2. Cliceáil ar "Suíomh" ⛳
3. Más gá, lean leideanna an fheiste chun ligean do WhatsApp rochtain a fháil ar do shuíomh 🆗️
4. Fan cúpla nóiméad chun cruinneas a mhéadú ⏰
5. Cliceáil ar "Suíomh Reatha" 🎯

*Fan sábháilte, sa suíomh a roinn tú linn, agus coinnigh do líne teileafóin saor.*`,

        lv: `🚒 *Ugunsdzēsības brigāde {{COMANDO}}* 🚒

Automātiski ģenerēts ziņojums.

Lūdzu, izmantojiet šo numuru, lai nosūtītu mums savu atrašanās vietu, fotoattēlus, videoklipus vai citu informāciju par ziņoto incidentu.

*ŠIS NAV ĀRKĀRTAS NUMURS*
un NEIZMANTOJIET to nekādiem citiem mērķiem vai gadījumiem bez mūsu atļaujas.

Visiem ārkārtas pieprasījumiem zvaniet uz numuru
☎️🆘️
*{{NUM}}*
🇪🇺🇮🇹

Lai nosūtītu koordinātas:
1. Noklikšķiniet uz "saspraudes" (Android) 📎 vai "plus" (Apple) ➕
2. Noklikšķiniet uz "Atrašanās vieta" ⛳
3. Ja nepieciešams, izpildiet ierīces norādījumus, lai atļautu WhatsApp piekļūt jūsu atrašanās vietai 🆗️
4. Uzgaidiet dažas minūtes, lai palielinātu precizitāti ⏰
5. Noklikšķiniet uz "Pašreizējā atrašanās vieta" 🎯

*Esiet drošībā, atrodieties atrašanās vietā, kuru kopīgojāt ar mums, un turiet tālruņa līniju brīvu.*`,

        lt: `🚒 *Ugniagesių brigada {{COMANDO}}* 🚒

Automatiškai sugeneruotas pranešimas.

Prašome naudoti šį numerį, jei norite atsiųsti mums savo buvimo vietą, nuotraukas, vaizdo įrašus ar kitą informaciją apie įvykį, apie kurį pranešėte.

*TAI NĖRA PAGALBOS NUMERIS*
ir NENAUDOKITE jo jokiais kitais tikslais ar progomis be mūsų leidimo.

Dėl visų skubių užklausų skambinkite
☎️🆘️
*{{NUM}}*
🇪🇺🇮🇹

Norėdami išsiųsti koordinates:
1. Spustelėkite „sąvaržėlę“ („Android“) 📎 arba „pliusą“ („Apple“) ➕
2. Spustelėkite „Vieta“ ⛳
3. Jei reikia, vykdykite įrenginio nurodymus, kad leistumėte „WhatsApp“ pasiekti jūsų buvimo vietą 🆗️
4. Palaukite kelias minutes, kad padidintumėte tikslumą ⏰
5. Spustelėkite „Dabartinė vieta“ 🎯

*Būkite saugūs, toje vietoje, kurią su mumis pasidalinote, ir palaikykite telefono liniją laisvą.*`,

        mt: `🚒 *Brigata tat-Tifi tan-Nar {{COMANDO}}C* 🚒

Messaġġ iġġenerat awtomatikament.

Jekk jogħġbok uża dan in-numru biex tibgħatilna l-post tiegħek, ritratti, vidjows, jew informazzjoni oħra dwar l-inċident li rrappurtajt.

*DAN MHUX NUMRU TA' EMERĠENZA*
u TUŻAHX għal xi skop jew okkażjoni oħra mingħajr il-permess tagħna.

Għal kull talba ta' emerġenza, ċempel
☎️🆘️
*{{NUM}}*
🇪🇺🇮🇹

Biex tibgħat koordinati:
1. Ikklikkja fuq il-"paperclip" (Android) 📎 jew il-"plus" (Apple) ➕
2. Ikklikkja fuq "Location" ⛳
3. Jekk meħtieġ, segwi l-istruzzjonijiet tal-apparat biex tippermetti lil WhatsApp jaċċessa l-lokazzjoni tiegħek 🆗️
4. Stenna ftit mumenti biex iżżid il-preċiżjoni ⏰
5. Ikklikkja fuq "Current Location" 🎯

*Ibqa' sigur, fil-lokazzjoni li qsamt magħna, u żomm il-linja tat-telefon tiegħek ħielsa.*`,

        nl: `🚒 *Brandweer {{COMANDO}}* 🚒

Automatisch gegenereerd bericht.

Gebruik dit nummer om ons uw locatie, foto's, video's of andere informatie over het gemelde incident te sturen.

*DIT IS GEEN NOODNUMMER*
en gebruik het NIET voor andere doeleinden of gelegenheden zonder onze toestemming.

Voor alle noodgevallen, bel
☎️🆘️
*{{NUM}}*
🇪🇺🇮🇹

Om coördinaten te verzenden:
1. Klik op het paperclip-icoon (Android) 📎 of het plusteken (Apple) ➕
2. Klik op 'Locatie' ⛳
3. Volg indien nodig de aanwijzingen van uw apparaat om WhatsApp toegang te geven tot uw locatie 🆗️
4. Wacht even voor een nauwkeurigere locatie ⏰
5. Klik op 'Huidige locatie' 🎯

*Blijf veilig op de locatie die u met ons hebt gedeeld en houd uw telefoonlijn vrij.*`,

        pl: `🚒 *Straż Pożarna {{COMANDO}}* 🚒

Wiadomość generowana automatycznie.

Użyj tego numeru, aby przesłać nam swoją lokalizację, zdjęcia, filmy lub inne informacje dotyczące zgłoszonego zdarzenia.

*TO NIE JEST NUMER ALARMOWY*
i NIE UŻYWAJ go w żadnym innym celu ani z żadnej innej okazji bez naszej zgody.

W nagłych wypadkach prosimy dzwonić pod numer
☎️🆘️
*{{NUM}}*
🇪🇺🇮🇹

Aby wysłać współrzędne:
1. Kliknij „spinacz” (Android) 📎 lub „plus” (Apple) ➕
2. Kliknij „Lokalizacja” ⛳
3. W razie potrzeby postępuj zgodnie z instrukcjami urządzenia, aby zezwolić WhatsApp na dostęp do Twojej lokalizacji 🆗️
4. Odczekaj chwilę, aby zwiększyć dokładność ⏰
5. Kliknij „Aktualna lokalizacja” 🎯

*Bądź bezpieczny w podanej nam lokalizacji i nie wyłączaj telefonu.*`,

        pt: `🚒 *Corpo de Bombeiros {{COMANDO}}* 🚒

Mensagem gerada automaticamente.

Por favor, utilize este número para nos enviar sua localização, fotos, vídeos ou outras informações sobre o incidente que você relatou.

*ESTE NÃO É UM NÚMERO DE EMERGÊNCIA*
e NÃO o utilize para qualquer outra finalidade ou ocasião sem nossa permissão.

Para todas as solicitações de emergência, ligue para
☎️🆘️
*{{NUM}}*
🇪🇺🇮🇹

Para enviar as coordenadas:
1. Clique no ícone de clipe de papel (Android) 📎 ou no ícone de mais (Apple) ➕
2. Clique em "Localização" ⛳
3. Se necessário, siga as instruções do dispositivo para permitir que o WhatsApp acesse sua localização 🆗️
4. Aguarde alguns instantes para aumentar a precisão ⏰
5. Clique em "Localização atual" 🎯

*Mantenha-se em segurança, no local que você compartilhou conosco, e mantenha sua linha telefônica livre.*`,

        ro: `🚒 *Brigada de Pompieri {{COMANDO}}C* 🚒

Mesaj generat automat.

Vă rugăm să folosiți acest număr pentru a ne trimite locația dvs., fotografii, videoclipuri sau alte informații despre incidentul pe care l-ați raportat.

*ACESTA NU ESTE UN NUMĂR DE URGENȚĂ*
și NU îl utilizați în niciun alt scop sau ocazie fără permisiunea noastră.

Pentru toate solicitările de urgență, sunați
☎️🆘️
*{{NUM}}*
🇪🇺🇮🇹

Pentru a trimite coordonate:
1. Faceți clic pe „agrafă” (Android) 📎 sau pe „plus” (Apple) ➕
2. Faceți clic pe „Locație” ⛳
3. Dacă este necesar, urmați instrucțiunile dispozitivului pentru a permite WhatsApp să acceseze locația dvs. 🆗️
4. Așteptați câteva momente pentru a crește precizia ⏰
5. Faceți clic pe „Locație curentă” 🎯

*Rămâneți în siguranță, în locația pe care ați partajat-o cu noi și păstrați-vă linia telefonică liberă.*`,

        ru: `🚒 *Номер телефона пожарной охраны* 🚒

Автоматически сгенерированное сообщение.

Пожалуйста, используйте этот номер, чтобы отправить нам ваше местоположение, фотографии, видео или другую информацию об инциденте, о котором вы сообщили.

*ЭТО НЕ НОМЕР ДЛЯ ЭКСТРЕННЫХ СИТУАЦИЙ*
и НЕ ИСПОЛЬЗУЙТЕ ЕГО ДЛЯ КАКИХ-ЛИБО ДРУГИХ ЦЕЛЕЙ БЕЗ НАШЕГО РАЗРЕШЕНИЯ.


Для всех экстренных случаев звоните:
☎️🆘️
*Н-Н-Н*
🇪🇺🇮🇹

Чтобы отправить координаты:
1. Нажмите на значок «скрепка» (Android) 📎 или «плюс» (Apple) ➕
2. Нажмите на «Местоположение» ⛳
3. При необходимости следуйте инструкциям устройства, чтобы разрешить WhatsApp доступ к вашему местоположению 🆗️
4. Подождите несколько минут для повышения точности ⏰
5. Нажмите на «Текущее местоположение» 🎯

*Оставайтесь в безопасности, в указанном вами местоположении, и держите телефонную линию свободной.*`,

        sk: `🚒 *Hasičský zbor {{COMANDO}}* 🚒

Automaticky vygenerovaná správa.

Použite toto číslo na zaslanie vašej polohy, fotografií, videí alebo iných informácií o incidente, ktorý ste nahlásili.

*TOTO NIE JE NÚDZOVÉ ČÍSLO*
a NEPOUŽÍVAJTE ho na žiadny iný účel ani príležitosť bez nášho súhlasu.

V prípade všetkých núdzových požiadaviek volajte na číslo
☎️🆘️
*{{NUM}}*
🇪🇺🇮🇹

Ak chcete odoslať súradnice:
1. Kliknite na „sponku“ (Android) 📎 alebo „plus“ (Apple) ➕
2. Kliknite na „Poloha“ ⛳
3. V prípade potreby postupujte podľa pokynov na zariadení, aby ste povolili aplikácii WhatsApp prístup k vašej polohe 🆗️
4. Počkajte chvíľu, aby ste zvýšili presnosť ⏰
5. Kliknite na „Aktuálna poloha“ 🎯

*Zostaňte v bezpečí, na mieste, ktoré ste s nami zdieľali, a majte voľnú telefónnu linku.*`,

        sl: `🚒 *Gasilska brigada {{COMANDO}}* 🚒

Samodejno ustvarjeno sporočilo.

Prosimo, uporabite to številko, da nam pošljete svojo lokacijo, fotografije, videoposnetke ali druge informacije o incidentu, ki ste ga prijavili.

*TO NI ŠTEVILKA ZA NUJNE PRIMERE*
in je NE uporabljajte za noben drug namen ali priložnost brez našega dovoljenja.

Za vse nujne primere pokličite
☎️🆘️
*{{NUM}}*
🇪🇺🇮🇹

Za pošiljanje koordinat:
1. Kliknite na "sponko za papir" (Android) 📎 ali "plus" (Apple) ➕
2. Kliknite na "Lokacija" ⛳
3. Po potrebi sledite navodilom naprave, da WhatsAppu omogočite dostop do vaše lokacije 🆗️
4. Počakajte nekaj trenutkov, da povečate natančnost ⏰
5. Kliknite na "Trenutna lokacija" 🎯

*Ostanite varni na lokaciji, ki ste jo delili z nami, in imejte telefonsko linijo prosto.*`,

        sv: `🚒 *Brandkåren {{COMANDO}}* 🚒

Automatiskt genererat meddelande.

Använd detta nummer för att skicka oss din plats, foton, videor eller annan information om den händelse du rapporterade.

*DETTA ÄR INTE ETT NÖDNUMMER*
och ANVÄND det INTE för något annat ändamål eller tillfälle utan vårt tillstånd.

För alla nödförfrågningar, ring
☎️🆘️
*{{NUM}}*
🇪🇺🇮🇹

För att skicka koordinater:
1. Klicka på "gem" (Android) 📎 eller "plus" (Apple) ➕
2. Klicka på "Plats" ⛳
3. Om det behövs, följ enhetens anvisningar för att tillåta WhatsApp att komma åt din plats 🆗️
4. Vänta några ögonblick för att öka noggrannheten ⏰
5. Klicka på "Nuvarande plats" 🎯

*Var säker på den plats du delade med oss ​​och håll din telefonlinje ledig.*`,

        de: `🚒 *Feuerwehr {{COMANDO}}* 🚒

Automatisch generierte Nachricht.

Bitte nutzen Sie diese Nummer, um uns Ihren Standort, Fotos, Videos oder andere Informationen zu dem von Ihnen gemeldeten Vorfall zu senden.

*DIES IST KEINE NOTRUFNUMMER*
und verwenden Sie sie NICHT ohne unsere Genehmigung für andere Zwecke oder Anlässe.

Für alle Notfälle rufen Sie bitte an:

☎️🆘️
*{{NUM}}*
🇪🇺🇮🇹

So senden Sie Ihre Koordinaten:
1. Tippen Sie auf die Büroklammer (Android) 📎 oder das Pluszeichen (Apple) ➕.
2. Tippen Sie auf „Standort“ ⛳.
3. Folgen Sie gegebenenfalls den Anweisungen Ihres Geräts, um WhatsApp den Zugriff auf Ihren Standort zu erlauben 🆗️.
4. Warten Sie einen Moment, um die Genauigkeit zu erhöhen ⏰.
5. Tippen Sie auf „Aktueller Standort“ 🎯.

*Bleiben Sie an dem Ort, den Sie uns mitgeteilt haben, und halten Sie Ihre Telefonleitung frei.*`,

        hu: `🚒 *Tűzoltóság {{COMANDO}}* 🚒

Automatikusan generált üzenet.

Kérjük, ezt a számot használja, ha tartózkodási helyét, fotóit, videóit vagy egyéb információkat szeretne küldeni nekünk a jelentett incidensről.

*EZ NEM SÜRGŐSSÉGI SZÁM*
és NE használja semmilyen más célra vagy alkalomra az engedélyünk nélkül.

Minden vészhelyzeti kérés esetén hívja a következő számot:
☎️🆘️
*{{NUM}}*
🇪🇺🇮🇹

Koordináták küldéséhez:
1. Kattintson a "gemkapocs" (Android) 📎 vagy a "plusz" (Apple) ikonra ➕
2. Kattintson a "Helyszín" ⛳ elemre
3. Szükség esetén kövesse az eszköz utasításait, hogy engedélyezze a WhatsAppnak a tartózkodási helyének elérését 🆗️
4. Várjon néhány percet a pontosság növelése érdekében ⏰
5. Kattintson a "Jelenlegi tartózkodási hely" 🎯 elemre

*Maradjon biztonságban, a velünk megosztott helyen, és tartsa szabadon a telefonvonalát.*`
    };

    // Costruisce il corpo del messaggio sostituendo Comando e numero emergenza,
    // ricadendo sull'italiano se la lingua scelta non ha ancora una traduzione
    function costruisciCorpoMessaggio(codiceLingua, nomeComando, numeroEmergenzaFormattato) {
        const modello = TRADUZIONI_MESSAGGIO[codiceLingua] || TRADUZIONI_MESSAGGIO.it;
        return modello
            .split("{{COMANDO}}").join(nomeComando.toUpperCase())
            .split("{{NUM}}").join(numeroEmergenzaFormattato);
    }

    // Calcola lo scarto orario attuale di Roma rispetto a UTC (1 = CET, 2 = CEST)
    function calcolaOffsetRoma(data) {
        const utc = new Date(data.toLocaleString("en-US", { timeZone: "UTC" }));
        const roma = new Date(data.toLocaleString("en-US", { timeZone: "Europe/Rome" }));
        return Math.round((roma - utc) / (1000 * 60 * 60));
    }

    // Costruisce il piè di pagina (sempre in italiano): credito, data/ora/turno, fuso orario
    function costruisciPieDiPaginaMessaggio() {
        const adesso = new Date();
        const componenti = getComponentiRoma(adesso);
        const pad = n => String(n).padStart(2, "0");

        const nomeGiorno = new Intl.DateTimeFormat("it-IT", { weekday: "long", timeZone: "Europe/Rome" }).format(adesso);
        const nomeGiornoMaiuscolo = nomeGiorno.charAt(0).toUpperCase() + nomeGiorno.slice(1);

        const dataFormattata = `${pad(componenti.day)}.${pad(componenti.month)}.${componenti.year}`;
        const oraFormattata = `${pad(componenti.hour)}:${pad(componenti.minute)}`;
        const turno = calcolaTurnoVVF();

        const offsetOre = calcolaOffsetRoma(adesso);
        const etichettaFuso = offsetOre === 2 ? "CEST" : "CET";

        return `credit by VVFsendWhatsApp\n${nomeGiornoMaiuscolo} ${dataFormattata} ore ${oraFormattata} - Turno ${turno}\n(GMT+0${offsetOre}.00) Roma (${etichettaFuso})`;
    }

    // Rigenera il messaggio completo nella textarea, in base al Comando attivo e alla lingua scelta
    function generaMessaggioMessaggistica() {
        if (!textareaMsg || !selectLinguaMsg) return;

        const nomeComandoAttivo = sessionStorage.getItem(CHIAVE_STORAGE);
        const comandoAttivo = comandiData.find(c => c.Comando === nomeComandoAttivo);

        if (!comandoAttivo) {
            textareaMsg.value = "Seleziona prima un Comando dalla schermata iniziale per generare il messaggio.";
            return;
        }

        const codiceLingua = selectLinguaMsg.value || LINGUA_PREDEFINITA;
        const valoreEmergenza = comandoAttivo["115/NUE OUT"] || "112";
        const numeroEmergenzaFormattato = String(valoreEmergenza).split("").join(" ");

        const corpo = costruisciCorpoMessaggio(codiceLingua, comandoAttivo.Comando, numeroEmergenzaFormattato);
        const pieDiPagina = costruisciPieDiPaginaMessaggio();

        textareaMsg.value = `${corpo}\n${pieDiPagina}`;
    }
    window.generaMessaggioMessaggistica = generaMessaggioMessaggistica;

    // Compone il numero completo (prefisso + numero) ripulito da spazi/simboli
    function numeroCompletoPulito() {
        const prefisso = (selectPrefissoMsg && selectPrefissoMsg.value || "").replace(/\D/g, "");
        const numero = (inputNumeroMsg && inputNumeroMsg.value || "").replace(/\D/g, "");
        return { prefisso, numero };
    }

    if (btnWhatsappWeb) {
        btnWhatsappWeb.addEventListener("click", () => {
            const { prefisso, numero } = numeroCompletoPulito();
            if (!numero) {
                alert("Inserisci un numero di telefono valido.");
                return;
            }
            const testoCodificato = encodeURIComponent(textareaMsg.value);
            // WhatsApp vuole il prefisso senza "+" (es. 39...)
            const url = `https://web.whatsapp.com/send?phone=${prefisso}${numero}&text=${testoCodificato}`;
            window.open(url, "_blank", "noopener");
        });
    }

    if (btnWhatsappApp) {
        btnWhatsappApp.addEventListener("click", () => {
            const { prefisso, numero } = numeroCompletoPulito();
            if (!numero) {
                alert("Inserisci un numero di telefono valido.");
                return;
            }
            const testoCodificato = encodeURIComponent(textareaMsg.value);
            // WhatsApp Desktop (app installata) tramite protocollo whatsapp://
            window.location.href = `whatsapp://send?phone=${prefisso}${numero}&text=${testoCodificato}`;
        });
    }

    if (btnInviaTelegram) {
        btnInviaTelegram.addEventListener("click", () => {
            const testo = textareaMsg.value;
            if (!testo.trim()) {
                alert("Il messaggio è vuoto.");
                return;
            }

            // Copia sempre il testo negli appunti: Telegram non supporta
            // testo precompilato quando si apre una chat da numero di telefono
            navigator.clipboard.writeText(testo).catch(() => {});

            const { prefisso, numero } = numeroCompletoPulito();
            if (numero) {
                // Telegram richiede il "+" davanti al numero completo
                window.open(`https://t.me/+${prefisso}${numero}`, "_blank", "noopener");
            } else {
                // Nessun numero indicato: apre la condivisione generica con testo precompilato
                window.open(`https://t.me/share/url?url=&text=${encodeURIComponent(testo)}`, "_blank", "noopener");
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