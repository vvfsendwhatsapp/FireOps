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

        en: `🚒 *Fire Department {{COMANDO}}* 🚒
Automatically generated message.
Please use this number to send us the location, photos, videos or other information about the event you reported.
*THIS IS NOT AN EMERGENCY NUMBER*
Do NOT use it for other purposes or on other occasions without our authorization.
For all emergency assistance requests call
☎️🆘️
*{{NUM}}*
🇪🇺🇮🇹
To send your coordinates:
1. Tap the "paperclip" (Android) 📎 or the "plus" (Apple) ➕
2. Tap "Location" ⛳
3. If needed, follow your device's instructions to allow WhatsApp to access your location 🆗️
4. Wait a few moments to improve accuracy ⏰
5. Tap "Current location" 🎯
*Stay safe, remain at the location you shared with us, and keep the phone line free.*`,

        fr: `🚒 *Sapeurs-Pompiers {{COMANDO}}* 🚒
Message généré automatiquement.
Utilisez ce numéro pour nous envoyer la position, des photos, vidéos ou d'autres informations sur l'événement que vous nous avez signalé.
*CE N'EST PAS UN NUMÉRO D'URGENCE*
Ne l'utilisez PAS à d'autres fins ou en d'autres occasions sans notre autorisation.
Pour toute demande de secours, appelez le
☎️🆘️
*{{NUM}}*
🇪🇺🇮🇹
Pour envoyer vos coordonnées :
1. Appuyez sur le "trombone" (Android) 📎 ou sur le "plus" (Apple) ➕
2. Appuyez sur "Position" ⛳
3. Si nécessaire, suivez les indications de votre appareil pour autoriser WhatsApp à accéder à votre position 🆗️
4. Patientez quelques instants pour améliorer la précision ⏰
5. Appuyez sur "Position actuelle" 🎯
*Restez en sécurité, à l'endroit que vous avez partagé, et laissez la ligne téléphonique libre.*`,

        de: `🚒 *Feuerwehr {{COMANDO}}* 🚒
Automatisch generierte Nachricht.
Nutzen Sie diese Nummer, um uns den Standort, Fotos, Videos oder weitere Informationen zu dem gemeldeten Ereignis zu senden.
*DIES IST KEINE NOTRUFNUMMER*
Verwenden Sie sie NICHT für andere Zwecke oder bei anderen Gelegenheiten ohne unsere Genehmigung.
Für alle Notfälle rufen Sie bitte
☎️🆘️
*{{NUM}}*
🇪🇺🇮🇹
So senden Sie Ihren Standort:
1. Tippen Sie auf die "Büroklammer" (Android) 📎 oder das "Plus" (Apple) ➕
2. Tippen Sie auf "Standort" ⛳
3. Folgen Sie bei Bedarf den Anweisungen Ihres Geräts, um WhatsApp den Zugriff auf Ihren Standort zu erlauben 🆗️
4. Warten Sie einen Moment, um die Genauigkeit zu verbessern ⏰
5. Tippen Sie auf "Aktueller Standort" 🎯
*Bleiben Sie sicher, an dem Ort, den Sie uns mitgeteilt haben, und halten Sie die Telefonleitung frei.*`,

        es: `🚒 *Bomberos {{COMANDO}}* 🚒
Mensaje generado automáticamente.
Utilice este número para enviarnos la ubicación, fotos, vídeos u otra información sobre el evento que nos ha comunicado.
*ESTE NO ES UN NÚMERO DE EMERGENCIAS*
NO lo utilice para otros fines ni en otras ocasiones sin nuestra autorización.
Para cualquier solicitud de auxilio llame al
☎️🆘️
*{{NUM}}*
🇪🇺🇮🇹
Para enviar sus coordenadas:
1. Toque el "clip" (Android) 📎 o el "más" (Apple) ➕
2. Toque "Ubicación" ⛳
3. Si es necesario, siga las indicaciones de su dispositivo para permitir que WhatsApp acceda a su ubicación 🆗️
4. Espere unos instantes para mejorar la precisión ⏰
5. Toque "Ubicación actual" 🎯
*Manténgase a salvo, en el lugar que nos ha compartido, y deje libre la línea telefónica.*`,

        pt: `🚒 *Bombeiros {{COMANDO}}* 🚒
Mensagem gerada automaticamente.
Utilize este número para nos enviar a localização, fotos, vídeos ou outras informações sobre o evento que nos comunicou.
*ESTE NÃO É UM NÚMERO DE EMERGÊNCIA*
NÃO o utilize para outros fins ou em outras ocasiões sem a nossa autorização.
Para qualquer pedido de socorro ligue para
☎️🆘️
*{{NUM}}*
🇪🇺🇮🇹
Para enviar as suas coordenadas:
1. Toque no "clipe" (Android) 📎 ou no "mais" (Apple) ➕
2. Toque em "Localização" ⛳
3. Se necessário, siga as indicações do dispositivo para permitir que o WhatsApp aceda à sua localização 🆗️
4. Aguarde alguns instantes para aumentar a precisão ⏰
5. Toque em "Localização atual" 🎯
*Mantenha-se em segurança, no local que partilhou connosco, e deixe a linha telefónica livre.*`,

        ar: `🚒 *فرقة الإطفاء {{COMANDO}}* 🚒
رسالة تم إنشاؤها تلقائيًا.
يرجى استخدام هذا الرقم لإرسال الموقع أو الصور أو مقاطع الفيديو أو أي معلومات أخرى حول الحادث الذي أبلغتمونا به.
*هذا ليس رقم طوارئ*
لا تستخدموه لأغراض أخرى أو في مناسبات أخرى دون إذننا.
لطلبات الإنقاذ اتصلوا بالرقم
☎️🆘️
*{{NUM}}*
🇪🇺🇮🇹
لإرسال الإحداثيات:
1. اضغطوا على "المشبك" (أندرويد) 📎 أو على "زائد" (أبل) ➕
2. اضغطوا على "الموقع" ⛳
3. عند الحاجة اتبعوا تعليمات جهازكم للسماح لواتساب بالوصول إلى موقعكم 🆗️
4. انتظروا لحظات لتحسين الدقة ⏰
5. اضغطوا على "الموقع الحالي" 🎯
*ابقوا آمنين، في المكان الذي شاركتموه معنا، واتركوا الخط الهاتفي متاحًا.*`,

        ro: `🚒 *Pompierii {{COMANDO}}* 🚒
Mesaj generat automat.
Vă rugăm să folosiți acest număr pentru a ne trimite locația, fotografii, videoclipuri sau alte informații despre evenimentul comunicat.
*ACESTA NU ESTE UN NUMĂR DE URGENȚĂ*
NU îl folosiți în alte scopuri sau în alte ocazii fără autorizarea noastră.
Pentru orice solicitare de ajutor sunați la
☎️🆘️
*{{NUM}}*
🇪🇺🇮🇹
Pentru a trimite coordonatele:
1. Atingeți "agrafa" (Android) 📎 sau "plus" (Apple) ➕
2. Atingeți "Locație" ⛳
3. Dacă este necesar, urmați indicațiile dispozitivului pentru a permite WhatsApp să acceseze locația 🆗️
4. Așteptați câteva momente pentru a îmbunătăți precizia ⏰
5. Atingeți "Locația curentă" 🎯
*Rămâneți în siguranță, la locația pe care ne-ați comunicat-o, și lăsați linia telefonică liberă.*`,

        sq: `🚒 *Zjarrfikësit {{COMANDO}}* 🚒
Mesazh i krijuar automatikisht.
Përdorni këtë numër për të na dërguar pozicionin, fotografi, video ose informacione të tjera për ngjarjen që na keni raportuar.
*KY NUK ËSHTË NUMËR EMERGJENCE*
MOS e përdorni për qëllime të tjera ose në raste të tjera pa autorizimin tonë.
Për çdo kërkesë ndihme telefononi
☎️🆘️
*{{NUM}}*
🇪🇺🇮🇹
Për të dërguar koordinatat:
1. Prekni "kapësen" (Android) 📎 ose "plus" (Apple) ➕
2. Prekni "Vendndodhja" ⛳
3. Nëse është e nevojshme, ndiqni udhëzimet e pajisjes për t'i lejuar WhatsApp të aksesojë vendndodhjen tuaj 🆗️
4. Prisni pak çaste për të përmirësuar saktësinë ⏰
5. Prekni "Vendndodhja aktuale" 🎯
*Qëndroni të sigurt, në vendndodhjen që na keni ndarë, dhe mbani linjën telefonike të lirë.*`,

        ru: `🚒 *Пожарная служба {{COMANDO}}* 🚒
Автоматически сформированное сообщение.
Используйте этот номер, чтобы отправить нам местоположение, фото, видео или другую информацию о сообщённом происшествии.
*ЭТО НЕ НОМЕР ЭКСТРЕННОЙ СЛУЖБЫ*
НЕ используйте его для иных целей или в иных случаях без нашего разрешения.
По всем вопросам, требующим помощи, звоните
☎️🆘️
*{{NUM}}*
🇪🇺🇮🇹
Чтобы отправить координаты:
1. Нажмите на "скрепку" (Android) 📎 или на "плюс" (Apple) ➕
2. Нажмите "Геопозиция" ⛳
3. При необходимости следуйте указаниям устройства, чтобы разрешить WhatsApp доступ к местоположению 🆗️
4. Подождите немного для повышения точности ⏰
5. Нажмите "Текущее местоположение" 🎯
*Оставайтесь в безопасности, в том месте, которое вы нам сообщили, и не занимайте телефонную линию.*`,

        uk: `🚒 *Пожежна служба {{COMANDO}}* 🚒
Автоматично згенероване повідомлення.
Використовуйте цей номер, щоб надіслати нам місцезнаходження, фото, відео чи іншу інформацію про подію, про яку ви повідомили.
*ЦЕ НЕ НОМЕР ЕКСТРЕНОЇ СЛУЖБИ*
НЕ використовуйте його з іншою метою або в інших випадках без нашого дозволу.
Для будь-якого запиту про допомогу телефонуйте
☎️🆘️
*{{NUM}}*
🇪🇺🇮🇹
Щоб надіслати координати:
1. Натисніть на "скріпку" (Android) 📎 або на "плюс" (Apple) ➕
2. Натисніть "Місцезнаходження" ⛳
3. За потреби виконайте вказівки пристрою, щоб дозволити WhatsApp доступ до місцезнаходження 🆗️
4. Зачекайте кілька секунд для покращення точності ⏰
5. Натисніть "Поточне місцезнаходження" 🎯
*Залишайтеся в безпеці, там, де ви нам повідомили, і тримайте телефонну лінію вільною.*`,

        "zh-CN": `🚒 *{{COMANDO}}消防队* 🚒
自动生成的消息。
请使用此号码向我们发送您所报告事件的位置、照片、视频或其他信息。
*这不是紧急电话号码*
未经我们许可，请勿用于其他目的或场合。
如需求助，请拨打
☎️🆘️
*{{NUM}}*
🇪🇺🇮🇹
发送坐标的方法：
1. 点击"回形针"（安卓）📎 或"加号"（苹果）➕
2. 点击"位置" ⛳
3. 如有需要，请按照设备提示允许WhatsApp访问您的位置 🆗️
4. 请稍候片刻以提高定位精度 ⏰
5. 点击"当前位置" 🎯
*请留在您与我们分享的位置，保持安全，并保持电话线畅通。*`,

        hi: `🚒 *अग्निशमन सेवा {{COMANDO}}* 🚒
यह संदेश स्वचालित रूप से तैयार किया गया है।
इस नंबर का उपयोग हमें स्थान, फ़ोटो, वीडियो या घटना से संबंधित अन्य जानकारी भेजने के लिए करें।
*यह आपातकालीन नंबर नहीं है*
हमारी अनुमति के बिना इसका उपयोग किसी अन्य उद्देश्य या अवसर के लिए न करें।
किसी भी सहायता अनुरोध के लिए कॉल करें
☎️🆘️
*{{NUM}}*
🇪🇺🇮🇹
अपने निर्देशांक भेजने के लिए:
1. "पेपरक्लिप" (Android) 📎 या "प्लस" (Apple) ➕ पर टैप करें
2. "स्थान" पर टैप करें ⛳
3. यदि आवश्यक हो, तो WhatsApp को अपने स्थान तक पहुँचने की अनुमति देने के लिए डिवाइस के निर्देशों का पालन करें 🆗️
4. सटीकता बढ़ाने के लिए कुछ क्षण प्रतीक्षा करें ⏰
5. "वर्तमान स्थान" पर टैप करें 🎯
*सुरक्षित रहें, जिस स्थान की जानकारी आपने हमें दी है वहीं रहें, और फोन लाइन खाली रखें।*`,

        ur: `🚒 *فائر بریگیڈ {{COMANDO}}* 🚒
یہ پیغام خودکار طور پر تیار کیا گیا ہے۔
براہ کرم اس نمبر کو ہمیں محل وقوع، تصاویر، ویڈیوز یا واقعے سے متعلق دیگر معلومات بھیجنے کے لیے استعمال کریں۔
*یہ ایمرجنسی نمبر نہیں ہے*
ہماری اجازت کے بغیر اسے کسی اور مقصد یا موقع کے لیے استعمال نہ کریں۔
کسی بھی امدادی درخواست کے لیے کال کریں
☎️🆘️
*{{NUM}}*
🇪🇺🇮🇹
اپنی لوکیشن بھیجنے کے لیے:
1. "پیپر کلپ" (Android) 📎 یا "پلس" (Apple) ➕ پر ٹیپ کریں
2. "لوکیشن" پر ٹیپ کریں ⛳
3. ضرورت پڑنے پر واٹس ایپ کو اپنی لوکیشن تک رسائی دینے کے لیے آلے کی ہدایات پر عمل کریں 🆗️
4. درستگی بہتر بنانے کے لیے چند لمحے انتظار کریں ⏰
5. "موجودہ لوکیشن" پر ٹیپ کریں 🎯
*محفوظ رہیں، اسی جگہ جہاں آپ نے ہمیں بتایا، اور فون لائن خالی رکھیں۔*`,

        bn: `🚒 *দমকল বাহিনী {{COMANDO}}* 🚒
এই বার্তাটি স্বয়ংক্রিয়ভাবে তৈরি করা হয়েছে।
আপনি যে ঘটনার কথা জানিয়েছেন সে সম্পর্কে অবস্থান, ছবি, ভিডিও বা অন্যান্য তথ্য পাঠাতে এই নম্বরটি ব্যবহার করুন।
*এটি জরুরি নম্বর নয়*
আমাদের অনুমতি ছাড়া অন্য কোনো উদ্দেশ্যে বা অন্য কোনো সময়ে এটি ব্যবহার করবেন না।
যেকোনো সাহায্যের জন্য কল করুন
☎️🆘️
*{{NUM}}*
🇪🇺🇮🇹
আপনার অবস্থান পাঠাতে:
1. "পেপারক্লিপ" (Android) 📎 বা "প্লাস" (Apple) ➕ চাপুন
2. "অবস্থান" চাপুন ⛳
3. প্রয়োজনে, WhatsApp-কে আপনার অবস্থান অ্যাক্সেস করার অনুমতি দিতে ডিভাইসের নির্দেশাবলী অনুসরণ করুন 🆗️
4. নির্ভুলতা বাড়াতে কিছুক্ষণ অপেক্ষা করুন ⏰
5. "বর্তমান অবস্থান" চাপুন 🎯
*নিরাপদ থাকুন, আপনি যে স্থানের কথা আমাদের জানিয়েছেন সেখানেই থাকুন, এবং ফোন লাইন খালি রাখুন।*`,

        tr: `🚒 *İtfaiye {{COMANDO}}* 🚒
Bu mesaj otomatik olarak oluşturulmuştur.
Bize bildirdiğiniz olayla ilgili konum, fotoğraf, video veya diğer bilgileri göndermek için bu numarayı kullanın.
*BU BİR ACİL DURUM NUMARASI DEĞİLDİR*
İzniniz olmadan başka amaçlarla veya başka durumlarda KULLANMAYIN.
Her türlü yardım talebi için arayın
☎️🆘️
*{{NUM}}*
🇪🇺🇮🇹
Konumunuzu göndermek için:
1. Android'de "ataç" 📎 veya Apple'da "artı" ➕ simgesine dokunun
2. "Konum" seçeneğine dokunun ⛳
3. Gerekirse WhatsApp'ın konumunuza erişmesine izin vermek için cihazınızın talimatlarını izleyin 🆗️
4. Doğruluğu artırmak için birkaç saniye bekleyin ⏰
5. "Mevcut konum" seçeneğine dokunun 🎯
*Güvende kalın, bize bildirdiğiniz konumda bekleyin ve telefon hattını boş tutun.*`,

        pl: `🚒 *Straż Pożarna {{COMANDO}}* 🚒
Wiadomość wygenerowana automatycznie.
Prosimy używać tego numeru, aby przesłać nam lokalizację, zdjęcia, filmy lub inne informacje dotyczące zgłoszonego zdarzenia.
*TO NIE JEST NUMER ALARMOWY*
NIE używajcie go w innych celach ani przy innych okazjach bez naszej zgody.
W przypadku każdej prośby o pomoc dzwońcie pod numer
☎️🆘️
*{{NUM}}*
🇪🇺🇮🇹
Aby wysłać współrzędne:
1. Dotknijcie "spinacza" (Android) 📎 lub "plusa" (Apple) ➕
2. Dotknijcie "Lokalizacja" ⛳
3. W razie potrzeby postępujcie zgodnie ze wskazówkami urządzenia, aby zezwolić WhatsApp na dostęp do lokalizacji 🆗️
4. Poczekajcie chwilę, aby zwiększyć dokładność ⏰
5. Dotknijcie "Aktualna lokalizacja" 🎯
*Pozostańcie bezpieczni, w miejscu, które nam wskazaliście, i zostawcie linię telefoniczną wolną.*`,

        nl: `🚒 *Brandweer {{COMANDO}}* 🚒
Automatisch gegenereerd bericht.
Gebruik dit nummer om ons de locatie, foto's, video's of andere informatie over het gemelde incident te sturen.
*DIT IS GEEN NOODNUMMER*
Gebruik het NIET voor andere doeleinden of bij andere gelegenheden zonder onze toestemming.
Bel voor elke hulpvraag naar
☎️🆘️
*{{NUM}}*
🇪🇺🇮🇹
Om uw coördinaten te verzenden:
1. Tik op de "paperclip" (Android) 📎 of de "plus" (Apple) ➕
2. Tik op "Locatie" ⛳
3. Volg indien nodig de instructies van uw apparaat om WhatsApp toegang te geven tot uw locatie 🆗️
4. Wacht even om de nauwkeurigheid te verbeteren ⏰
5. Tik op "Huidige locatie" 🎯
*Blijf veilig op de locatie die u met ons heeft gedeeld en houd de telefoonlijn vrij.*`
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