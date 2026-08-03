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
    let moduliCMRData = []; // elenco moduli della Circolare EM-01/2020 (Colonne Mobili Regionali)
    let linkUtiliData = []; // elenco link utili organizzati per tema, per la pagina "Link Utili"
    let sostanzePericoloseData = []; // database locale schede ICSC (numero, nome, sinonimi)
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
        }),
        fetch("/FireOps/db/moduliCMR.json").then(r => {
            if (!r.ok) throw new Error("Impossibile trovare moduliCMR.json");
            return r.json();
        }),
        fetch("/FireOps/db/linkUtili.json").then(r => {
            if (!r.ok) throw new Error("Impossibile trovare linkUtili.json");
            return r.json();
        })
    ])
    .then(([comandi, direzioni, con, socav, prefissi, lingue, moduliCMR, linkUtili]) => {
        comandiData = comandi;
        direzioniData = direzioni;
        conData = Array.isArray(con) ? con[0] : con;
        socavData = Array.isArray(socav) ? socav[0] : socav;
        prefissiData = prefissi;
        lingueData = lingue;
        moduliCMRData = moduliCMR;
        linkUtiliData = linkUtili;

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

        // Popola il selettore ricercabile della pagina Moduli CMR
        popolaSelectModuloCMR(moduliCMRData);

        // Popola il selettore rapido della pagina "Info Altro Comando"
        try {
            popolaSelectAltroComando(comandiData);
        } catch (err) {
            console.error("Errore nel popolare il selettore Info Altro Comando:", err);
        }

        // Costruisce i pulsanti della pagina Link Utili
        renderLinkUtili(linkUtiliData);

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

    // Database locale delle schede ICSC: caricato separatamente e non bloccante.
    // Se questo file manca o fallisce, il resto dell'app (Comandi, Link Utili, ecc.)
    // continua a funzionare normalmente: la ricerca ICSC per nome resta solo "best-effort"
    fetch("/FireOps/db/sostanzepericolose.json")
        .then(r => {
            if (!r.ok) throw new Error("Impossibile trovare sostanzepericolose.json");
            return r.json();
        })
        .then(dati => {
            sostanzePericoloseData = dati;
            popolaComboSostanzePericolose(sostanzePericoloseData);
        })
        .catch(err => {
            console.error("Database sostanze pericolose non disponibile:", err);
        });

    function attivaComando(nomeComando) {
        sessionStorage.setItem(CHIAVE_STORAGE, nomeComando);
        displayComando.textContent = `Sala Operativa - Comando VVF ${nomeComando}`;

        const homeNomeComando = document.getElementById("home-nome-comando");
        if (homeNomeComando) homeNomeComando.textContent = nomeComando;

        const comandoSelezionato = comandiData.find(c => c.Comando === nomeComando);
        renderRiepilogoComando(comandoSelezionato, comandiData, direzioniData, conData, socavData);
        aggiornaMappaEMeteo(comandoSelezionato);

        // Il messaggio precompilato dipende dal Comando attivo: lo rigenero
        generaMessaggioMessaggistica();

        // I link mappa (Mappe > SAR) puntano alle coordinate del Comando attivo: li rigenero
        if (linkUtiliData.length > 0) renderLinkUtili(linkUtiliData);
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

    // ==========================================================
    // MAPPA E METEO DEL COMANDO ATTIVO (Leaflet + Open-Meteo, senza chiave API)
    // ==========================================================
    let mappaComandoLeaflet = null;
    let markerComandoLeaflet = null;
    let coordinateComandoAttivo = null; // ultime coordinate del Comando, per il pulsante "Torna al Comando"
    const ZOOM_VISTA_COMANDO = 11;   // zoom di dettaglio usato quando si seleziona/aggiorna il Comando
    const ZOOM_RITORNO_COMANDO = 11; // zoom più ampio usato dal pulsante "Torna al Comando"
    let layerBaseLeaflet = null;      // layer di sfondo attivo (grigia o OSM)
    let stileMappaAttuale = "grigia"; // stile di sfondo scelto dall'utente
    let crocinoCentroMappa = null;    // overlay fisso col mirino che indica il centro inquadratura
    let radarMeteoAttivo = false;
    let radarInPausa = false;
    let radarFotogrammi = []; // [{ layer, data }] dal più vecchio al più recente, ultima ora
    let radarIndiceCorrente = 0;
    let radarTimeoutAnimazione = null;
    let radarEtichettaOrario = null;
    let intervalloMeteo = null;
    let intervalloRadar = null;

    // Interpretazione sintetica dei WMO Weather Code restituiti da Open-Meteo
    const METEO_CODICI = {
        0: ["☀️", "Sereno"],
        1: ["🌤️", "Prevalentemente sereno"],
        2: ["⛅", "Parzialmente nuvoloso"],
        3: ["☁️", "Nuvoloso"],
        45: ["🌫️", "Nebbia"],
        48: ["🌫️", "Nebbia con brina"],
        51: ["🌦️", "Pioviggine debole"],
        53: ["🌦️", "Pioviggine moderata"],
        55: ["🌧️", "Pioviggine intensa"],
        56: ["🌧️", "Pioviggine gelata debole"],
        57: ["🌧️", "Pioviggine gelata intensa"],
        61: ["🌧️", "Pioggia debole"],
        63: ["🌧️", "Pioggia moderata"],
        65: ["🌧️", "Pioggia forte"],
        66: ["🌧️", "Pioggia gelata debole"],
        67: ["🌧️", "Pioggia gelata forte"],
        71: ["🌨️", "Neve debole"],
        73: ["🌨️", "Neve moderata"],
        75: ["❄️", "Neve forte"],
        77: ["❄️", "Granelli di neve"],
        80: ["🌦️", "Rovesci di pioggia deboli"],
        81: ["🌧️", "Rovesci di pioggia moderati"],
        82: ["⛈️", "Rovesci di pioggia violenti"],
        85: ["🌨️", "Rovesci di neve deboli"],
        86: ["❄️", "Rovesci di neve forti"],
        95: ["⛈️", "Temporale"],
        96: ["⛈️", "Temporale con grandine debole"],
        99: ["⛈️", "Temporale con grandine forte"]
    };

    function descrizioneMeteo(codice) {
        return METEO_CODICI[codice] || ["🌡️", "Condizioni non disponibili"];
    }

    // Estrae { lat, lng } dal campo "Coordinate" del comando (formato testuale "lat, lng")
    function estraiCoordinate(comando) {
        if (!comando || !comando["Coordinate"]) return null;
        const parti = comando["Coordinate"].split(",").map(s => parseFloat(s.trim()));
        if (parti.length !== 2 || parti.some(n => Number.isNaN(n))) return null;
        return { lat: parti[0], lng: parti[1] };
    }

    // Crea la mappa Leaflet al primo utilizzo, altrimenti la ricentra sul nuovo Comando
    function aggiornaMappaComando(comando) {
        const contenitoreMappa = document.getElementById("mappa-comando");
        if (!contenitoreMappa || typeof L === "undefined") return;

        const coord = estraiCoordinate(comando);
        if (!coord) {
            contenitoreMappa.innerHTML = '<p class="pagina-nota">Coordinate del Comando non disponibili.</p>';
            return;
        }

        coordinateComandoAttivo = coord; // memorizzate per il pulsante "Torna al Comando"

        if (!mappaComandoLeaflet) {
            mappaComandoLeaflet = L.map("mappa-comando").setView([coord.lat, coord.lng], ZOOM_VISTA_COMANDO);
            impostaStileMappa(stileMappaAttuale);
            markerComandoLeaflet = L.marker([coord.lat, coord.lng], { icon: iconaCasermaVVF() }).addTo(mappaComandoLeaflet);

            aggiornaCoordinateCentroMappa();
            // Coordinate aggiornate in tempo reale durante il trascinamento (leggero, solo testo)
            mappaComandoLeaflet.on("move", aggiornaCoordinateCentroMappa);

            // Il meteo mostrato segue il centro della mappa: se l'utente la sposta,
            // le previsioni si aggiornano sulla nuova zona inquadrata
            mappaComandoLeaflet.on("moveend", () => {
                const centro = mappaComandoLeaflet.getCenter();
                aggiornaMeteoPerCoordinate({ lat: centro.lat, lng: centro.lng });
            });

            // Click sulla mappa: la ricentra dolcemente sul punto cliccato, senza cambiare zoom
            mappaComandoLeaflet.on("click", (e) => {
                mappaComandoLeaflet.panTo(e.latlng);
            });
        } else {
            mappaComandoLeaflet.setView([coord.lat, coord.lng], ZOOM_VISTA_COMANDO);
            markerComandoLeaflet.setLatLng([coord.lat, coord.lng]);
            // Se la mappa era nascosta (cambio pagina) le dimensioni interne vanno ricalcolate
            setTimeout(() => mappaComandoLeaflet.invalidateSize(), 100);
        }
        markerComandoLeaflet.bindPopup(`Comando VVF ${comando.Comando}`);
    }

    // Icona del marker: badge circolare col logo VVF, a forma di caserma/segnaposto
    function iconaCasermaVVF() {
        return L.divIcon({
            className: "marker-caserma",
            html: '<div class="marker-caserma-cerchio"><img src="images/logo.png" alt="Comando VVF"></div><div class="marker-caserma-punta"></div>',
            iconSize: [44, 56],
            iconAnchor: [22, 56],
            popupAnchor: [0, -52]
        });
    }

    // ==========================================================
    // STILE DI SFONDO DELLA MAPPA (grigia in stile Windy oppure OpenStreetMap classica)
    // ==========================================================
    const STILI_MAPPA = {
        grigia: {
            url: "https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png",
            opzioni: {
                maxZoom: 20,
                subdomains: "abcd",
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            }
        },
        osm: {
            url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
            opzioni: {
                maxZoom: 19,
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            }
        }
    };

    // Sostituisce il layer di sfondo mantenendo mirino/marker/radar sopra di esso
    function impostaStileMappa(stile) {
        if (!mappaComandoLeaflet || !STILI_MAPPA[stile]) return;

        if (layerBaseLeaflet) mappaComandoLeaflet.removeLayer(layerBaseLeaflet);
        const conf = STILI_MAPPA[stile];
        layerBaseLeaflet = L.tileLayer(conf.url, conf.opzioni).addTo(mappaComandoLeaflet);
        layerBaseLeaflet.bringToBack();

        stileMappaAttuale = stile;
        if (btnStileMappa) {
            btnStileMappa.textContent = stile === "grigia" ? "🗺️ OSM" : "🗺️ Grigia";
        }
    }

    const btnStileMappa = document.getElementById("btn-stile-mappa");
    if (btnStileMappa) {
        btnStileMappa.addEventListener("click", () => {
            impostaStileMappa(stileMappaAttuale === "grigia" ? "osm" : "grigia");
        });
    }

    // Ricentra la mappa sul Comando attivo con uno zoom più ampio (vista d'insieme)
    const btnTornaComando = document.getElementById("btn-torna-comando");
    if (btnTornaComando) {
        btnTornaComando.addEventListener("click", () => {
            if (!mappaComandoLeaflet || !coordinateComandoAttivo) return;
            mappaComandoLeaflet.setView([coordinateComandoAttivo.lat, coordinateComandoAttivo.lng], ZOOM_RITORNO_COMANDO);
        });
    }

    // ==========================================================
    // CROCINO CENTRALE: mirino fisso al centro della mappa con le coordinate inquadrate
    // ==========================================================
    function creaCrocinoCentroMappa() {
        if (crocinoCentroMappa) return crocinoCentroMappa;
        const contenitoreMappa = document.getElementById("mappa-comando");
        if (!contenitoreMappa) return null;

        crocinoCentroMappa = document.createElement("div");
        crocinoCentroMappa.className = "crocino-centro-mappa";
        crocinoCentroMappa.innerHTML = `
            <svg class="crocino-svg" width="26" height="26" viewBox="0 0 26 26">
                <line class="crocino-linea" x1="13" y1="0" x2="13" y2="9"></line>
                <line class="crocino-linea" x1="13" y1="17" x2="13" y2="26"></line>
                <line class="crocino-linea" x1="0" y1="13" x2="9" y2="13"></line>
                <line class="crocino-linea" x1="17" y1="13" x2="26" y2="13"></line>
                <circle class="crocino-cerchio" cx="13" cy="13" r="3"></circle>
            </svg>
            <div class="crocino-coordinate"></div>
        `;
        contenitoreMappa.appendChild(crocinoCentroMappa);
        return crocinoCentroMappa;
    }

    function aggiornaCoordinateCentroMappa() {
        if (!mappaComandoLeaflet) return;
        const crocino = creaCrocinoCentroMappa();
        if (!crocino) return;

        const centro = mappaComandoLeaflet.getCenter();
        const etichetta = crocino.querySelector(".crocino-coordinate");
        if (etichetta) etichetta.textContent = `${centro.lat.toFixed(5)}, ${centro.lng.toFixed(5)}`;
    }

    // ==========================================================
    // RADAR METEO ANIMATO (ultima ora, un fotogramma ogni 5 minuti)
    // ==========================================================
    // Layer "radar:vmi" (Vertical Maximum Intensity) del servizio WMS Protezione Civile.
    // Il radar produce un nuovo campione ogni 5 minuti: costruiamo 12 fotogrammi (ultima ora)
    // e li facciamo scorrere in loop cambiandone solo l'opacità, senza dover riscaricare
    // le tile ad ogni passo dell'animazione.

    // Arrotonda un istante al multiplo di 5 minuti precedente (i campioni radar cadono su questi minuti)
    function arrotondaAi5Minuti(data) {
        const cinqueMinutiMs = 5 * 60 * 1000;
        return new Date(Math.floor(data.getTime() / cinqueMinutiMs) * cinqueMinutiMs);
    }

    // Genera gli istanti degli ultimi N fotogrammi radar (5 minuti di passo), dal più vecchio al più recente
    function generaIstantiRadar(numeroFotogrammi) {
        const ultimoIstante = arrotondaAi5Minuti(new Date());
        const istanti = [];
        for (let i = numeroFotogrammi - 1; i >= 0; i--) {
            istanti.push(new Date(ultimoIstante.getTime() - i * 5 * 60 * 1000));
        }
        return istanti;
    }

    // Etichetta con l'orario del fotogramma radar attualmente mostrato, sovrapposta alla mappa
    function creaEtichettaOrarioRadar() {
        if (radarEtichettaOrario) return radarEtichettaOrario;
        const contenitoreMappa = document.getElementById("mappa-comando");
        if (!contenitoreMappa) return null;
        radarEtichettaOrario = document.createElement("div");
        radarEtichettaOrario.className = "radar-etichetta-orario";
        contenitoreMappa.appendChild(radarEtichettaOrario);
        return radarEtichettaOrario;
    }

    function mostraOrarioFotogramma(data) {
        const etichetta = creaEtichettaOrarioRadar();
        if (!etichetta) return;
        const ora = data.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Rome" });
        etichetta.textContent = `Radar ${ora}`;
        etichetta.style.display = "block";
    }

    function nascondiEtichettaOrarioRadar() {
        if (radarEtichettaOrario) radarEtichettaOrario.style.display = "none";
    }

    // Crea i 12 fotogrammi (uno per ogni istante) e li aggiunge tutti alla mappa,
    // ma visibili (opacità piena) solo l'ultimo: l'animazione poi alterna l'opacità tra i layer già caricati
    function creaFotogrammiRadar() {
        rimuoviFotogrammiRadar();

        const istanti = generaIstantiRadar(12);
        radarFotogrammi = istanti.map((data, i) => {
            const layer = L.tileLayer.wms("https://radar-geowebcache.protezionecivile.it/service/wms", {
                layers: "radar:vmi",
                format: "image/png",
                transparent: true,
                version: "1.1.1",
                time: data.toISOString(),
                opacity: i === istanti.length - 1 ? 0.65 : 0,
                attribution: "Radar meteo &copy; Dipartimento Protezione Civile",
                // Il mosaico radar nazionale ha una risoluzione nativa limitata (~1 km):
                // tileSize 512 chiede immagini più definite al servizio, mentre maxNativeZoom
                // evita di richiedere tile oltre la risoluzione reale (Leaflet ingrandisce
                // l'ultimo fotogramma valido invece di mostrare tile vuote o a scacchiera)
                tileSize: 512,
                zoomOffset: -1,
                maxNativeZoom: 9,
                minZoom: 3
            });
            layer.addTo(mappaComandoLeaflet);
            return { layer, data };
        });

        radarIndiceCorrente = radarFotogrammi.length - 1; // parte mostrando il fotogramma più recente
        mostraOrarioFotogramma(radarFotogrammi[radarIndiceCorrente].data);
    }

    function rimuoviFotogrammiRadar() {
        radarFotogrammi.forEach(f => {
            if (mappaComandoLeaflet) mappaComandoLeaflet.removeLayer(f.layer);
        });
        radarFotogrammi = [];
    }

    // Fa scorrere i fotogrammi in loop: passo normale tra un fotogramma e l'altro,
    // pausa più lunga sull'ultimo (il più recente) prima di ripartire dal più vecchio
    function avviaAnimazioneRadar() {
        fermaAnimazioneRadar();
        const DURATA_FOTOGRAMMA_MS = 450;
        const PAUSA_FOTOGRAMMA_RECENTE_MS = 1600;

        function passoSuccessivo() {
            if (radarFotogrammi.length === 0) return;

            radarFotogrammi[radarIndiceCorrente].layer.setOpacity(0);
            radarIndiceCorrente = (radarIndiceCorrente + 1) % radarFotogrammi.length;
            radarFotogrammi[radarIndiceCorrente].layer.setOpacity(0.65);
            mostraOrarioFotogramma(radarFotogrammi[radarIndiceCorrente].data);

            const suFotogrammaRecente = radarIndiceCorrente === radarFotogrammi.length - 1;
            radarTimeoutAnimazione = setTimeout(passoSuccessivo, suFotogrammaRecente ? PAUSA_FOTOGRAMMA_RECENTE_MS : DURATA_FOTOGRAMMA_MS);
        }

        radarTimeoutAnimazione = setTimeout(passoSuccessivo, PAUSA_FOTOGRAMMA_RECENTE_MS);
    }

    function fermaAnimazioneRadar() {
        if (radarTimeoutAnimazione) clearTimeout(radarTimeoutAnimazione);
        radarTimeoutAnimazione = null;
    }

    const btnToggleRadar = document.getElementById("btn-toggle-radar");
    const btnPausaRadar = document.getElementById("btn-pausa-radar");

    if (btnPausaRadar) {
        btnPausaRadar.addEventListener("click", () => {
            if (!radarMeteoAttivo) return;

            radarInPausa = !radarInPausa;
            btnPausaRadar.classList.toggle("attivo", radarInPausa);
            btnPausaRadar.textContent = radarInPausa ? "▶️ Riprendi" : "⏸️ Pausa";

            if (radarInPausa) {
                fermaAnimazioneRadar();
            } else {
                avviaAnimazioneRadar();
            }
        });
    }

    if (btnToggleRadar) {
        btnToggleRadar.addEventListener("click", () => {
            if (!mappaComandoLeaflet) return;

            radarMeteoAttivo = !radarMeteoAttivo;
            btnToggleRadar.classList.toggle("attivo", radarMeteoAttivo);

            if (radarMeteoAttivo) {
                radarInPausa = false;
                if (btnPausaRadar) {
                    btnPausaRadar.style.display = "inline-block";
                    btnPausaRadar.classList.remove("attivo");
                    btnPausaRadar.textContent = "⏸️ Pausa";
                }

                creaFotogrammiRadar();
                avviaAnimazioneRadar();

                // Ogni 5 minuti arriva un nuovo campione radar: ricostruisce i 12 fotogrammi
                // in modo che la finestra "ultima ora" resti sempre aggiornata. Se l'animazione
                // è in pausa, i fotogrammi vengono comunque rinfrescati ma la riproduzione resta ferma.
                if (intervalloRadar) clearInterval(intervalloRadar);
                intervalloRadar = setInterval(() => {
                    if (!radarMeteoAttivo) return;
                    creaFotogrammiRadar();
                    if (!radarInPausa) avviaAnimazioneRadar();
                }, 5 * 60 * 1000);
            } else {
                fermaAnimazioneRadar();
                rimuoviFotogrammiRadar();
                nascondiEtichettaOrarioRadar();
                if (intervalloRadar) clearInterval(intervalloRadar);

                radarInPausa = false;
                if (btnPausaRadar) btnPausaRadar.style.display = "none";
            }
        });
    }

    // Scarica e mostra il meteo in tempo reale per le coordinate del Comando attivo
    function aggiornaMeteoComando(comando) {
        const coord = estraiCoordinate(comando);
        if (!coord) {
            const contenitoreOrario = document.getElementById("meteo-orario");
            if (contenitoreOrario) contenitoreOrario.innerHTML = '<p class="pagina-nota">Coordinate del Comando non disponibili.</p>';
            return;
        }
        aggiornaMeteoPerCoordinate(coord);
    }

    // Scarica e mostra le previsioni orarie (12 ore) per una coppia di coordinate qualsiasi
    // (usata sia per il Comando attivo sia per il centro corrente della mappa)
    function aggiornaMeteoPerCoordinate(coord) {
        const contenitoreOrario = document.getElementById("meteo-orario");
        if (!contenitoreOrario || !coord) return;

        const url = `https://api.open-meteo.com/v1/forecast?latitude=${coord.lat}&longitude=${coord.lng}&hourly=temperature_2m,weather_code,precipitation_probability&forecast_hours=12&timezone=auto`;

        fetch(url)
            .then(r => {
                if (!r.ok) throw new Error("Errore meteo");
                return r.json();
            })
            .then(dati => {
                if (!dati.hourly) throw new Error("Dati meteo non disponibili");
                renderMeteoOrario(dati.hourly);
            })
            .catch(() => {
                contenitoreOrario.innerHTML = '<p class="pagina-nota">Meteo non disponibile al momento.</p>';
            });
    }


    // Mostra la striscia con le previsioni orarie per le prossime 12 ore
    function renderMeteoOrario(hourly) {
        const container = document.getElementById("meteo-orario");
        if (!container) return;

        if (!hourly || !Array.isArray(hourly.time) || hourly.time.length === 0) {
            container.innerHTML = "";
            return;
        }

        let html = "";
        hourly.time.forEach((iso, i) => {
            const ora = iso.slice(11, 16); // estrae "HH:MM" dal formato ISO restituito da Open-Meteo
            const [icona] = descrizioneMeteo(hourly.weather_code[i]);
            const temp = Math.round(hourly.temperature_2m[i]);
            const probabilitaPioggia = Array.isArray(hourly.precipitation_probability) ? hourly.precipitation_probability[i] : null;

            html += `
                <div class="meteo-ora-card">
                    <div class="meteo-ora-etichetta">${ora}</div>
                    <div class="meteo-ora-icona">${icona}</div>
                    <div class="meteo-ora-temp">${temp}°</div>
                    ${probabilitaPioggia !== null ? `<div class="meteo-ora-pioggia">💧 ${probabilitaPioggia}%</div>` : ""}
                </div>`;
        });

        container.innerHTML = html;
    }

    // Aggiorna mappa e meteo per il Comando attivo, e avvia il refresh periodico del meteo
    function aggiornaMappaEMeteo(comando) {
        aggiornaMappaComando(comando);
        aggiornaMeteoComando(comando);

        if (intervalloMeteo) clearInterval(intervalloMeteo);
        intervalloMeteo = setInterval(() => {
            const centro = mappaComandoLeaflet ? mappaComandoLeaflet.getCenter() : null;
            if (centro) {
                aggiornaMeteoPerCoordinate({ lat: centro.lat, lng: centro.lng });
            } else {
                aggiornaMeteoComando(comando);
            }
        }, 10 * 60 * 1000); // ogni 10 minuti
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
        // Ancorato dal basso: si apre "crescendo" verso l'alto sopra l'elemento cliccato,
        // senza bisogno di conoscere in anticipo l'altezza del popup
        let bottom = window.innerHeight - rect.top + 8;
        let left = rect.left;

        const larghezzaStimata = 300;
        if (left + larghezzaStimata > window.innerWidth) {
            left = window.innerWidth - larghezzaStimata - 10;
        }

        popup.style.bottom = `${bottom}px`;
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
    function renderRiepilogoComando(comando, tuttiComandi, tutteDirezioni, con, socav, idContenitore = "riepilogo-comando", accentoAlternativo = false) {
        const container = document.getElementById(idContenitore);
        if (!container) return;

        if (!comando) {
            container.innerHTML = "<p>Dati comando non disponibili.</p>";
            return;
        }

        // Prefisso usato per rendere univoci gli ID interni (sezioni comprimibili):
        // necessario perché lo stesso riepilogo può comparire in più contenitori insieme
        // (es. un pannello sullo split-screen e un altro), e gli ID devono restare unici nel DOM
        const p = idContenitore;

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

        const classeBox = accentoAlternativo ? "riepilogo-box riepilogo-box-consultazione" : "riepilogo-box";

        container.innerHTML = `
            <div class="${classeBox}">
                <h4 class="sezione-toggle" data-target="${p}-sezione-comando">Info Comando ${comando.Comando}</h4>
                <table id="${p}-sezione-comando" class="riepilogo-tabella sezione-contenuto">
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

                <h4 class="sezione-toggle" data-target="${p}-sezione-direzione">Info Direzione ${comando["Direzione VVF"] || "-"}</h4>
                <table id="${p}-sezione-direzione" class="riepilogo-tabella sezione-contenuto">
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

                <h4 class="sezione-toggle" data-target="${p}-sezione-con">Info CON - Centro Operativo Nazionale</h4>
                <table id="${p}-sezione-con" class="riepilogo-tabella sezione-contenuto">
                    <tbody>
                        <tr><th>Indirizzo</th><td>${creaLinkMaps(comando["Indirizzo CON"], coordinateCon)}</td></tr>
                        <tr><th>TEL SO CON</th><td>${creaCampoCopiabile(comando["Telefono SO CON"], 'telefono')}</td></tr>
                        <tr><th>CH VHF CON</th><td>${comando["Canale Radio CON"] || "-"}</td></tr>
                        <tr><th>CHS CON</th><td>${comando["CHS CON"] || "-"}</td></tr>
                        <tr><th>Email SO CON</th><td>${creaCampoCopiabile(comando["email SO CON"], 'email')}</td></tr>
                    </tbody>
                </table>

                <h4 class="sezione-toggle" data-target="${p}-sezione-socav">Info SOCAV - Assistenza al Volo</h4>
                <table id="${p}-sezione-socav" class="riepilogo-tabella sezione-contenuto">
                    <tbody>
                        <tr><th>Indirizzo</th><td>${creaLinkMaps(comando["Indirizzo SOCAV"], coordinateSocav)}</td></tr>
                        <tr><th>TEL SOCAV</th><td>${creaCampoCopiabile(comando["Telefono SOCAV"], 'telefono')}</td></tr>
                        <tr><th>Email SOCAV</th><td>${creaCampoCopiabile(comando["email SOCAV"], 'email')}</td></tr>
                    </tbody>
                </table>

                <h4>Comandi Limitrofi</h4>
                <table id="${p}-sezione-limitrofi" class="riepilogo-tabella-limitrofi sezione-contenuto aperta">
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
    // PAGINA "INFO ALTRO COMANDO": consultazione rapida dei dati di un
    // qualsiasi Comando dall'elenco a tendina, senza toccare il Comando
    // attivo di sessione (quello impostato dal menu ☰)
    // ==========================================================
    function popolaSelectAltroComando(lista) {
        const select = document.getElementById("altro-comando-select");
        if (!select) return;

        select.innerHTML = '<option value="" disabled selected>-- Seleziona un Comando --</option>';
        (lista || [])
            .filter(c => c && c.Comando) // scarta eventuali righe senza nome Comando valido
            .slice()
            .sort((a, b) => String(a.Comando).localeCompare(String(b.Comando), "it"))
            .forEach(c => {
                const opzione = document.createElement("option");
                opzione.value = c.Comando;
                opzione.textContent = c.Comando;
                select.appendChild(opzione);
            });

        select.addEventListener("change", () => {
            const comandoScelto = trovaComandoPerNome(select.value, comandiData);
            renderRiepilogoComando(comandoScelto, comandiData, direzioniData, conData, socavData, "riepilogo-altro-comando", true);
        });
    }

    // ==========================================================
    // SPLIT SCREEN: due pannelli indipendenti, ciascuno mostra una pagina.
    // Le sezioni esistono una sola volta nel DOM (niente ID duplicati): vengono
    // spostate (appendChild) dentro il pannello che le mostra, o parcheggiate
    // nel "magazzino" nascosto quando non sono assegnate a nessun pannello.
    // Selezionare in un pannello una pagina già aperta nell'altro fa scambiare
    // automaticamente le due pagine, così restano sempre univoche.
    // ==========================================================
    const CATALOGO_PAGINE = [
        { id: "homepage", label: "Home page - Informazioni generali comando" },
        { id: "mappa-meteo", label: "Mappa e meteo" },
        { id: "messaggistica", label: "Messaggistica" },
        { id: "info-comando", label: "Info altro comando" },
        { id: "gestione-fpds", label: "Gestione interventi FPDS" },
        { id: "contatti", label: "Link utili" },
        { id: "convertitoreunita", label: "Convertitore unità" },
        { id: "convertitore", label: "Convertitore coordinate" },
        { id: "radio-telefoni", label: "Radio e telefoni" },
        { id: "qrcode", label: "QrCode" },
        { id: "turnario", label: "Turnario" },
        { id: "moduli-cmr", label: "Moduli CMR" },
        { id: "sostanze-pericolose", label: "Sostanze pericolose" }
    ];

    const magazzinoPagine = document.getElementById("magazzino-pagine");
    const selectPannelloSinistra = document.getElementById("select-pannello-sinistra");
    const selectPannelloDestra = document.getElementById("select-pannello-destra");
    const corpoSinistra = document.getElementById("corpo-sinistra");
    const corpoDestra = document.getElementById("corpo-destra");

    let paginaSinistra = "homepage";
    let paginaDestra = "mappa-meteo";

    function contenitorePerLato(lato) {
        if (lato === "sinistra") return corpoSinistra;
        if (lato === "destra") return corpoDestra;
        return magazzinoPagine;
    }

    // Sposta la sezione (esistente una sola volta nel DOM) dentro il contenitore del lato indicato
    function spostaSezione(idPagina, lato) {
        const sezione = document.getElementById(idPagina);
        const contenitore = contenitorePerLato(lato);
        if (sezione && contenitore) contenitore.appendChild(sezione);
    }

    function popolaSelettorePannello(select) {
        if (!select) return;
        select.innerHTML = "";
        CATALOGO_PAGINE.forEach(pagina => {
            const opzione = document.createElement("option");
            opzione.value = pagina.id;
            opzione.textContent = pagina.label;
            select.appendChild(opzione);
        });
    }

    function aggiornaSelettori() {
        if (selectPannelloSinistra) selectPannelloSinistra.value = paginaSinistra;
        if (selectPannelloDestra) selectPannelloDestra.value = paginaDestra;
    }

    // Effetti collaterali dovuti al comparire di una pagina in un pannello
    // (stesso comportamento che prima aveva il cambio scheda unico)
    function eseguiEffettiPagina(idPagina) {
        chiudiPopupDati();

        if (idPagina === "messaggistica") {
            const inputNumero = document.getElementById("msg-numero");
            if (inputNumero) setTimeout(() => inputNumero.focus(), 50);
            validaCampiMessaggistica();
        }

        // La mappa Leaflet potrebbe essere stata inizializzata mentre il suo pannello
        // era nel magazzino nascosto: ricalcola le dimensioni, altrimenti resta rotta
        if (idPagina === "mappa-meteo" && mappaComandoLeaflet) {
            setTimeout(() => mappaComandoLeaflet.invalidateSize(), 100);
        }
    }

    // Assegna una pagina a un pannello ("sinistra"/"destra"). Se la pagina scelta
    // è già mostrata nell'altro pannello, le due pagine si scambiano di posto:
    // così non possono mai coincidere.
    function assegnaPagina(lato, nuovoId) {
        if (!document.getElementById(nuovoId)) return;

        const altroLato = lato === "sinistra" ? "destra" : "sinistra";
        const idAttualeLato = lato === "sinistra" ? paginaSinistra : paginaDestra;
        const idAttualeAltro = lato === "sinistra" ? paginaDestra : paginaSinistra;

        if (nuovoId === idAttualeLato) return; // nessun cambiamento

        if (nuovoId === idAttualeAltro) {
            // Scambio: la pagina che era in questo pannello va nell'altro, e viceversa
            spostaSezione(idAttualeLato, altroLato);
            spostaSezione(nuovoId, lato);
            if (lato === "sinistra") {
                paginaSinistra = nuovoId;
                paginaDestra = idAttualeLato;
            } else {
                paginaDestra = nuovoId;
                paginaSinistra = idAttualeLato;
            }
        } else {
            // La pagina che c'era prima in questo pannello torna nel magazzino nascosto,
            // altrimenti resterebbe incolonnata sotto quella nuova
            spostaSezione(idAttualeLato, "magazzino");
            spostaSezione(nuovoId, lato);
            if (lato === "sinistra") paginaSinistra = nuovoId;
            else paginaDestra = nuovoId;
        }

        aggiornaSelettori();
        eseguiEffettiPagina(nuovoId);
    }

    if (selectPannelloSinistra) {
        popolaSelettorePannello(selectPannelloSinistra);
        selectPannelloSinistra.addEventListener("change", () => {
            assegnaPagina("sinistra", selectPannelloSinistra.value);
        });
    }

    if (selectPannelloDestra) {
        popolaSelettorePannello(selectPannelloDestra);
        selectPannelloDestra.addEventListener("change", () => {
            assegnaPagina("destra", selectPannelloDestra.value);
        });
    }

    // ==========================================================
// FULLSCREEN PER PAGINA (solo Convertitore Coordinate, per ora)
// ==========================================================
function toggleFullscreenPagina(pulsante) {
    const pannello = pulsante.closest(".pannello");
    if (!pannello) return;

    const splitScreenEl = document.querySelector(".split-screen");
    const inFullscreen = pannello.classList.toggle("pannello-fullscreen");

    if (splitScreenEl) splitScreenEl.classList.toggle("ha-pannello-fullscreen", inFullscreen);

    pulsante.textContent = inFullscreen ? "🗗" : "⛶";
    pulsante.title = inFullscreen ? "Esci da schermo intero" : "Schermo intero";

    // Leaflet ascolta il resize della window: un evento sintetico basta
    // ad aggiornare la mappa del Convertitore senza toccare convertitore.js
    setTimeout(() => window.dispatchEvent(new Event("resize")), 150);
}

document.querySelectorAll(".btn-fullscreen-pagina").forEach(pulsante => {
    pulsante.addEventListener("click", () => toggleFullscreenPagina(pulsante));
});

document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    const pannelloAttivo = document.querySelector(".pannello.pannello-fullscreen");
    if (!pannelloAttivo) return;
    const pulsanteAttivo = pannelloAttivo.querySelector(".btn-fullscreen-pagina");
    if (pulsanteAttivo) toggleFullscreenPagina(pulsanteAttivo);
});

// ==========================================================
// MODALE AIUTO E CONTATTI
// ==========================================================
const btnHelp = document.getElementById("btn-help");
const modalHelp = document.getElementById("modal-help");
const modalHelpClose = document.getElementById("modal-help-close");

if (btnHelp && modalHelp) {
    btnHelp.addEventListener("click", () => { modalHelp.style.display = "flex"; });
}
if (modalHelpClose && modalHelp) {
    modalHelpClose.addEventListener("click", () => { modalHelp.style.display = "none"; });
}
if (modalHelp) {
    modalHelp.addEventListener("click", (e) => {
        if (e.target === modalHelp) modalHelp.style.display = "none";
    });
}
document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modalHelp && modalHelp.style.display === "flex") {
        modalHelp.style.display = "none";
    }
});

    // Assegnazione iniziale: Home a sinistra, Mappa e Meteo a destra.
    // Tutte le altre pagine restano parcheggiate nel magazzino nascosto.
    CATALOGO_PAGINE.forEach(pagina => {
        if (pagina.id !== paginaSinistra && pagina.id !== paginaDestra && magazzinoPagine) {
            spostaSezione(pagina.id, "magazzino");
        }
    });
    spostaSezione(paginaSinistra, "sinistra");
    spostaSezione(paginaDestra, "destra");
    aggiornaSelettori();

    // ==========================================================
    // PAGINA MESSAGGISTICA: messaggio precompilato multilingua
    // + invio tramite WhatsApp Web, WhatsApp Desktop o Telegram
    // ==========================================================
    const inputPrefissoMsg = document.getElementById("msg-prefisso-input");
    const hiddenPrefissoMsg = document.getElementById("msg-prefisso");
    const dropdownPrefissoMsg = document.getElementById("msg-prefisso-dropdown");

    const inputLinguaMsg = document.getElementById("msg-lingua-input");
    const hiddenLinguaMsg = document.getElementById("msg-lingua");
    const dropdownLinguaMsg = document.getElementById("msg-lingua-dropdown");

    const inputNumeroMsg = document.getElementById("msg-numero");
    const textareaMsg = document.getElementById("msg-testo");
    const btnWhatsappWeb = document.getElementById("btn-whatsapp-web");
    const btnWhatsappApp = document.getElementById("btn-whatsapp-app");
    const btnInviaTelegram = document.getElementById("btn-invia-telegram");

    const PREFISSO_PREDEFINITO = "39";  // Italia
    const LINGUA_PREDEFINITA = "it";    // Italiano

    // ==========================================================
    // PAGINA MODULI CMR: ricerca modulo per Descrizione + riepilogo dati
    // ==========================================================
    const inputModuloCMR = document.getElementById("cmr-modulo-input");
    const hiddenModuloCMR = document.getElementById("cmr-modulo");
    const dropdownModuloCMR = document.getElementById("cmr-modulo-dropdown");

    // ==========================================================
    // COMBOBOX RICERCABILE: input di testo + lista filtrata a comparsa,
    // usato per Prefisso internazionale e Lingua messaggio (utile con
    // elenchi lunghi, specialmente su mobile).
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

    // Popola il campo ricercabile dei prefissi internazionali (default: 39 - Italia)
    function popolaSelectPrefissoMsg(listaPrefissi) {
        if (!inputPrefissoMsg) return;

        const comboPrefisso = creaComboRicercabile({
            input: inputPrefissoMsg,
            hidden: hiddenPrefissoMsg,
            dropdown: dropdownPrefissoMsg,
            elenco: listaPrefissi,
            cercaValore: p => p.Valore,
            mostraTesto: p => p.Prefissi,
            onScelta: validaCampiMessaggistica
        });

        if (listaPrefissi.some(p => p.Valore === PREFISSO_PREDEFINITO)) {
            comboPrefisso.impostaValore(PREFISSO_PREDEFINITO);
        }

        validaCampiMessaggistica();
    }
    window.popolaSelectPrefissoMsg = popolaSelectPrefissoMsg;

    // Popola il campo ricercabile delle lingue disponibili (default: Italiano)
    function popolaSelectLinguaMsg(listaLingue) {
        if (!inputLinguaMsg) return;

        const comboLingua = creaComboRicercabile({
            input: inputLinguaMsg,
            hidden: hiddenLinguaMsg,
            dropdown: dropdownLinguaMsg,
            elenco: listaLingue,
            cercaValore: l => l.code,
            mostraTesto: l => l.lingua,
            onScelta: generaMessaggioMessaggistica
        });

        if (listaLingue.some(l => l.code === LINGUA_PREDEFINITA)) {
            comboLingua.impostaValore(LINGUA_PREDEFINITA);
        }

        // Alla prima generazione disponibile, genera subito il messaggio
        generaMessaggioMessaggistica();
    }
    window.popolaSelectLinguaMsg = popolaSelectLinguaMsg;

    // Popola il campo ricercabile dei moduli CMR (cerca per Descrizione)
    function popolaSelectModuloCMR(listaModuli) {
        if (!inputModuloCMR) return;

        creaComboRicercabile({
            input: inputModuloCMR,
            hidden: hiddenModuloCMR,
            dropdown: dropdownModuloCMR,
            elenco: listaModuli,
            cercaValore: m => m["Numero progressivo del modulo pianificato"],
            mostraTesto: m => m["Descrizione"],
            placeholderOpzione: "-- Seleziona modulo --",
            onScelta: (modulo) => renderRiepilogoModuloCMR(modulo)
        });
    }
    window.popolaSelectModuloCMR = popolaSelectModuloCMR;

    // Costruisce la tabella di riepilogo del modulo CMR selezionato, cercandolo nel JSON.
    // Se nessun modulo è ancora selezionato, mostra comunque la tabella con le sole etichette.
    function renderRiepilogoModuloCMR(modulo) {
        const container = document.getElementById("riepilogo-modulo-cmr");
        if (!container) return;

        const campo = valore => (valore && String(valore).trim()) ? valore : "-";
        const get = chiave => modulo ? campo(modulo[chiave]) : "-";
        const coloreModulo = modulo ? (modulo["Colore"] || "var(--primary-color)") : "var(--border-color)";
        const codiceCompleto = modulo ? [modulo["Codice Tipologia Modulo"], modulo["Codice Modulo"]].filter(Boolean).join(".") : "";
        const titolo = modulo ? `${codiceCompleto} — ${campo(modulo["Denominazione modulo"])}` : "Nessun modulo selezionato";

        container.innerHTML = `
            <div class="riepilogo-box">
                <h4 class="cmr-titolo-modulo" style="border-left-color: ${coloreModulo};">
                    ${titolo}
                </h4>
                <table class="riepilogo-tabella">
                    <tbody>
                        <tr><th>Numero modulo</th><td>${get("Numero progressivo del modulo pianificato")}</td></tr>
                        <tr><th>Tipo modulo</th><td>${get("Tipo Modulo")}</td></tr>
                        <tr><th>Denominazione internazionale</th><td>${get("Denominazione internazionale secondo meccanismo europeo (se applicabile)")}</td></tr>
                        <tr><th>Compiti e funzioni</th><td>${get("Compiti e funzioni")}</td></tr>
                        <tr><th>Capacità</th><td>${get("Capacità")}</td></tr>
                        <tr><th>Componenti principali</th><td>${get("Componenti principali")}</td></tr>
                        <tr><th>Autosufficienza mobilitazione</th><td>${get("Autosufficienza mobilitazione")}</td></tr>
                        <tr><th>Automezzi predisposti</th><td>${get("Tipologia e numero di automezzi predisposti")}</td></tr>
                        <tr><th>Equipaggio</th><td>${get("Equipaggio (numero componenti)")}</td></tr>
                        <tr><th>Trasporto con mezzo aereo</th><td>${get("Pianificazione per trasporto con mezzo aereo")}</td></tr>
                        <tr><th>Approvvigionamento a regime</th><td>${get("Esigenze di approvvigionamento a regime")}</td></tr>
                        <tr><th>Dimensioni, pesi e ingombri</th><td>${get("Dimensioni, pesi e ingombri (utili per l’imbarco o il trasporto mediante mezzi aerei)")}</td></tr>
                    </tbody>
                </table>
            </div>
        `;
    }
    window.renderRiepilogoModuloCMR = renderRiepilogoModuloCMR;

    // Mostra subito la tabella con le sole etichette, ancora prima che i dati siano caricati
    renderRiepilogoModuloCMR(null);

    // ==========================================================
    // PAGINA "SOSTANZE PERICOLOSE": ricerca sul database ICSC (ILO/OMS)
    // ==========================================================
    // Un unico campo di ricerca (come i Moduli CMR): si digita nome, sinonimo,
    // CAS o numero scheda, e selezionando un risultato si apre subito la scheda
    // esatta (pattern confermato affidabile: showcard.display?p_card_id=NNNN).
    const inputIcscCerca = document.getElementById("icsc-cerca-input");
    const hiddenIcscCerca = document.getElementById("icsc-cerca-hidden");
    const dropdownIcscCerca = document.getElementById("icsc-cerca-dropdown");
    const btnCercaIcscOnline = document.getElementById("btn-cerca-icsc-online");

    function apriSchedaIcsc(numero) {
        window.open(`https://chemicalsafety.ilo.org/dyn/icsc/showcard.display?p_lang=it&p_card_id=${numero}&p_version=2`, "_blank", "noopener");
    }

    // Popola il combo di ricerca unico: filtra su nome, sinonimi, CAS e numero scheda insieme.
    // Selezionando un risultato si apre subito la scheda, nessun pulsante "Cerca" necessario.
function popolaComboSostanzePericolose(lista) {
    if (!inputIcscCerca || !lista || lista.length === 0) return;
 
    creaComboRicercabile({
        input: inputIcscCerca,
        hidden: hiddenIcscCerca,
        dropdown: dropdownIcscCerca,
        elenco: lista,
        cercaValore: s => s.Numero,
        mostraTesto: s => {
            const cas = s.CAS ? ` [CAS ${s.CAS}]` : "";
            const base = `${s.Numero} — ${s.Nome}${cas}`;
            if (!s.Sinonimi) return base;
            const riga = `${base} — ${s.Sinonimi}`;
            return riga.length > 110 ? riga.slice(0, 107) + "…" : riga;
        },
        testoRicerca: s => `${s.Numero} ${s.Nome} ${s.CAS || ""} ${s.Sinonimi || ""}`,
        testoSelezionato: s => s.Nome,
        // Selezionata la sostanza: apre la scheda ILO E mostra il badge ONU/Kemler (se presente)
        onScelta: s => {
            apriSchedaIcsc(s.Numero);
            renderIcscSelezionata(s);
        }
    });
}
window.popolaComboSostanzePericolose = popolaComboSostanzePericolose;
 
// Mostra nome sostanza + chip ONU/Kemler/Classe ADR sotto la ricerca.
// Il campo "onu" è opzionale: se assente (sostanza non ancora abbinata a un
// numero ADR) mostra chip "assente" invece di lasciare uno spazio vuoto muto.
// "onu.verificato" distingue un match automatico (da controllare) da uno
// confermato a mano: non trattarli mai come equivalenti in UI.
function renderIcscSelezionata(sostanza) {
    const container = document.getElementById("icsc-scheda-selezionata");
    if (!container) return;
 
    if (!sostanza) {
        container.innerHTML = "";
        return;
    }
 
    const onu = sostanza.onu;
    let chipOnu, chipKemler, chipClasse = "";
 
    if (onu && onu.numero) {
        const stato = onu.verificato ? "verificato" : "da-verificare";
        const tooltip = onu.verificato
            ? `Verificato${onu.fonte ? " — " + onu.fonte : ""}`
            : `Importato automaticamente${onu.tipo_match ? " (" + onu.tipo_match + ")" : ""} — controllare prima dell'uso operativo`;
 
        chipOnu = `<span class="onu-kemler-chip ${stato}" title="${tooltip}">ONU <span class="val">${onu.numero}</span></span>`;
 
        chipKemler = onu.kemler
            ? `<span class="onu-kemler-chip ${stato}" title="${tooltip}">Kemler <span class="val">${onu.kemler}</span></span>`
            : `<span class="onu-kemler-chip da-verificare" title="Kemler non verificato — consultare Tabella A ADR colonna 20">Kemler <span class="val">?</span></span>`;
 
        if (onu.classe_adr) {
            chipClasse = `<span class="onu-kemler-chip ${stato}">Classe ADR <span class="val">${onu.classe_adr}</span></span>`;
        }
    } else {
        chipOnu = `<span class="onu-kemler-chip assente">ONU non disponibile</span>`;
        chipKemler = `<span class="onu-kemler-chip assente">Kemler non disponibile</span>`;
    }
 
    container.innerHTML = `
        <div class="icsc-scheda-nome">Selezionata: <strong>${sostanza.Nome}</strong> (scheda ${sostanza.Numero})</div>
        <div class="onu-kemler-block">${chipOnu}${chipKemler}${chipClasse}</div>
    `;
}
window.renderIcscSelezionata = renderIcscSelezionata;

    // Fallback: quando la sostanza digitata non è nel database locale (CAS non ancora
    // verificato, UN number, sinonimo non censito...), prova comunque la ricerca online
    if (btnCercaIcscOnline) {
        btnCercaIcscOnline.addEventListener("click", () => {
            const testo = (inputIcscCerca.value || "").trim();
            if (!testo) return;

            const parametri = new URLSearchParams({ p_lang: "it" });
            parametri.set("p_substance_name", testo);
            parametri.set("p_cas_no", testo);
            parametri.set("p_free_text", testo);

            window.open(`https://chemicalsafety.ilo.org/dyn/icsc/showcard.listcards3?${parametri.toString()}`, "_blank", "noopener");
        });
    }

    // ==========================================================
    // PAGINA LINK UTILI: pulsanti ai vari siti raggruppati per tema
    // ==========================================================

    // Raggruppa l'elenco piatto del JSON in { Categoria: { Sottocategoria: [voci] } },
    // preservando l'ordine di comparsa così come arrivano dal file
    function raggruppaLinkUtili(elenco) {
        const gruppi = new Map();
        elenco.forEach(voce => {
            const categoria = voce["Categoria"] || "Altro";
            const sottocategoria = voce["Sottocategoria"] || "";
            if (!gruppi.has(categoria)) gruppi.set(categoria, new Map());
            const sottogruppi = gruppi.get(categoria);
            if (!sottogruppi.has(sottocategoria)) sottogruppi.set(sottocategoria, []);
            sottogruppi.get(sottocategoria).push(voce);
        });
        return gruppi;
    }

    // Costruisce i pulsanti della pagina Link Utili, raggruppati per Categoria e Sottocategoria.
    // I link senza URL compilato vengono mostrati disabilitati (dato non ancora inserito nel JSON).
    // Sostituisce i segnaposto {{LAT}} e {{LNG}} nell'URL con le coordinate del Comando
    // attualmente attivo (letto da sessionStorage), così i link mappa puntano sempre
    // alla zona giusta invece di un punto fisso. Se non c'è ancora un Comando attivo
    // o l'URL non contiene segnaposto, restituisce l'URL invariato.
    function sostituisciCoordinateUrl(url) {
        if (!url || (!url.includes("{{LAT}}") && !url.includes("{{LNG}}"))) return url;

        const nomeComandoAttivo = sessionStorage.getItem(CHIAVE_STORAGE);
        const comandoAttivo = comandiData.find(c => c.Comando === nomeComandoAttivo);
        const coord = estraiCoordinate(comandoAttivo);
        if (!coord) return "";

        return url.split("{{LAT}}").join(coord.lat).split("{{LNG}}").join(coord.lng);
    }

    function renderLinkUtili(elenco) {
        const container = document.getElementById("link-utili-contenuto");
        if (!container) return;

        if (!elenco || elenco.length === 0) {
            container.innerHTML = "<p class=\"pagina-nota\">Nessun link disponibile.</p>";
            return;
        }

        const gruppi = raggruppaLinkUtili(elenco);
        let html = "";
        let indiceCategoria = 0;

        gruppi.forEach((sottogruppi, categoria) => {
            const idContenuto = `link-utili-categoria-${indiceCategoria++}`;
            html += `<h4 class="link-utili-categoria sezione-toggle" data-target="${idContenuto}">${categoria}</h4>`;
            html += `<div id="${idContenuto}" class="link-utili-categoria-contenuto">`;

            sottogruppi.forEach((voci, sottocategoria) => {
                if (sottocategoria) {
                    html += `<h5 class="link-utili-sottocategoria">${sottocategoria}</h5>`;
                }

                html += `<div class="link-utili-griglia">`;
                voci.forEach(voce => {
                    const url = sostituisciCoordinateUrl((voce["URL"] || "").trim());
                    if (url) {
                        html += `<a class="link-utili-pulsante" href="${url}" target="_blank" rel="noopener">${voce["Nome"]}</a>`;
                    } else {
                        html += `<span class="link-utili-pulsante link-utili-pulsante-disabilitato" title="URL non ancora inserito">${voce["Nome"]}</span>`;
                    }
                });
                html += `</div>`;
            });

            html += `</div>`;
        });

        container.innerHTML = html;

        // Ogni categoria si apre/chiude cliccando sul titolo (parte collassata di default)
        container.querySelectorAll(".sezione-toggle").forEach(header => {
            const contenuto = document.getElementById(header.dataset.target);
            if (contenuto) {
                header.addEventListener("click", () => toggleSezione(header, contenuto));
            }
        });
    }
    window.renderLinkUtili = renderLinkUtili;

    // ==========================================================
    // VALIDAZIONE CAMPI MESSAGGISTICA: evidenzia i campi mancanti
    // (prefisso, numero, lingua) e abilita/disabilita i pulsanti di invio
    // ==========================================================
    function validaCampiMessaggistica() {
        const prefissoOk = !!(hiddenPrefissoMsg && hiddenPrefissoMsg.value);
        const numeroOk = !!(inputNumeroMsg && inputNumeroMsg.value.trim());
        const linguaOk = !!(hiddenLinguaMsg && hiddenLinguaMsg.value);

        if (inputPrefissoMsg) inputPrefissoMsg.classList.toggle("campo-mancante", !prefissoOk);
        if (inputNumeroMsg) inputNumeroMsg.classList.toggle("campo-mancante", !numeroOk);
        if (inputLinguaMsg) inputLinguaMsg.classList.toggle("campo-mancante", !linguaOk);

        const tuttiCompilati = prefissoOk && numeroOk && linguaOk;
        [btnWhatsappWeb, btnWhatsappApp, btnInviaTelegram].forEach(btn => {
            if (btn) btn.disabled = !tuttiCompilati;
        });

        return { prefissoOk, numeroOk, linguaOk, tuttiCompilati };
    }
    window.validaCampiMessaggistica = validaCampiMessaggistica;

    if (inputNumeroMsg) {
        inputNumeroMsg.addEventListener("input", validaCampiMessaggistica);
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

        fr: `🚒 *Sapeur Pompiers {{COMANDO}}* 🚒

Message automatique.

Veuillez utiliser ce numéro pour nous envoyer votre position, des photos, des vidéos ou toute autre information concernant l'incident que vous avez signalé.

*CECI N'EST PAS UN NUMÉRO D'URGENCE*

et NE L'UTILISEZ PAS à d'autres fins sans notre autorisation.

Pour toute urgence, appelez le
☎️🆘️

*{{NUM}}*

🇪🇺🇮🇹

Pour envoyer vos coordonnées :

1. Cliquez sur le trombone (Android) 📎 ou le plus (Apple) ➕

2. Cliquez sur « Position » ⛳

3. Si nécessaire, suivez les instructions de votre appareil pour autoriser WhatsApp à accéder à votre position 🆗️

4. Patientez quelques instants pour une meilleure précision ⏰

5. Cliquez sur « Position actuelle » 🎯

*Restez en sécurité à l'endroit que vous nous avez indiqué et assurez-vous que votre ligne téléphonique est libre.*

Crédit : VVFsendWhatsApp

Vendredi 31 juillet 2026, 12 h 04 - Équipe A3`,

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

S dan sender du koordinater:
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
2. Klõpsake valikul „Asukoht" ⛳
3. Vajadusel järgige seadme juhiseid, et lubada WhatsAppil teie asukohale juurde pääseda 🆗️
4. Oodake täpsuse suurendamiseks paar hetke ⏰
5. Klõpsake valikul „Praegune asukoht" 🎯

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
2. Tippen Sie auf „Standort" ⛳.
3. Folgen Sie gegebenenfalls den Anweisungen Ihres Geräts, um WhatsApp den Zugriff auf Ihren Standort zu erlauben 🆗️.
4. Warten Sie einen Moment, um die Genauigkeit zu erhöhen ⏰.
5. Tippen Sie auf „Aktueller Standort" 🎯.

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
        const oraFormattata = `${pad(componenti.hour)}:${pad(componenti.minute)}:${pad(componenti.second)}`;
        const turno = calcolaTurnoVVF();

        const offsetOre = calcolaOffsetRoma(adesso);
        const etichettaFuso = offsetOre === 2 ? "CEST" : "CET";

        return `credit by VVFsendWhatsApp\n${nomeGiornoMaiuscolo} ${dataFormattata} ore ${oraFormattata} - Turno ${turno}\n(GMT+0${offsetOre}.00) Roma (${etichettaFuso})`;
    }

    // Rigenera il messaggio completo nella textarea, in base al Comando attivo e alla lingua scelta.
    // Se la lingua non è ancora stata scelta, l'anteprima resta vuota (non compare).
    function generaMessaggioMessaggistica() {
        if (!textareaMsg || !hiddenLinguaMsg) return;

        const stato = validaCampiMessaggistica();

        if (!stato.linguaOk) {
            textareaMsg.value = "";
            textareaMsg.placeholder = "Seleziona una lingua per generare l'anteprima del messaggio.";
            return;
        }

        const nomeComandoAttivo = sessionStorage.getItem(CHIAVE_STORAGE);
        const comandoAttivo = comandiData.find(c => c.Comando === nomeComandoAttivo);

        if (!comandoAttivo) {
            textareaMsg.value = "Seleziona prima un Comando dalla schermata iniziale per generare il messaggio.";
            return;
        }

        const codiceLingua = hiddenLinguaMsg.value || LINGUA_PREDEFINITA;
        const valoreEmergenza = comandoAttivo["115/NUE OUT"] || "112";
        const numeroEmergenzaFormattato = String(valoreEmergenza).split("").join(" ");

        const corpo = costruisciCorpoMessaggio(codiceLingua, comandoAttivo.Comando, numeroEmergenzaFormattato);
        const pieDiPagina = costruisciPieDiPaginaMessaggio();

        textareaMsg.value = `${corpo}\n${pieDiPagina}`;
    }
    window.generaMessaggioMessaggistica = generaMessaggioMessaggistica;

    // Compone il numero completo (prefisso + numero) ripulito da spazi/simboli
    function numeroCompletoPulito() {
        const prefisso = (hiddenPrefissoMsg && hiddenPrefissoMsg.value || "").replace(/\D/g, "");
        const numero = (inputNumeroMsg && inputNumeroMsg.value || "").replace(/\D/g, "");
        return { prefisso, numero };
    }

    if (btnWhatsappWeb) {
        btnWhatsappWeb.addEventListener("click", () => {
            if (!validaCampiMessaggistica().tuttiCompilati) return;
            generaMessaggioMessaggistica(); // aggiorna l'orario (con i secondi) al momento dell'invio
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
            if (!validaCampiMessaggistica().tuttiCompilati) return;
            generaMessaggioMessaggistica(); // aggiorna l'orario (con i secondi) al momento dell'invio
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
            if (!validaCampiMessaggistica().tuttiCompilati) return;
            generaMessaggioMessaggistica(); // aggiorna l'orario (con i secondi) al momento dell'invio
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

        const nomeGiorno = new Intl.DateTimeFormat("it-IT", { weekday: "short", timeZone: "Europe/Rome" }).format(now);
        const nomeGiornoMaiuscolo = nomeGiorno.charAt(0).toUpperCase() + nomeGiorno.slice(1).replace(".", "");

        const offsetOre = calcolaOffsetRoma(now);
        const etichettaFuso = offsetOre === 2 ? "CEST" : "CET";

        const dataFormattata = `${nomeGiornoMaiuscolo} ${pad(c.day)}.${pad(c.month)}.${c.year} - ${pad(c.hour)}:${pad(c.minute)}:${pad(c.second)} ${etichettaFuso}`;

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

    // ==========================================================
    // FOCUS INIZIALE SU "COMANDO" + CONFERMA CON INVIO (Enter)
    // ==========================================================
    // Alla prima apertura, e ogni volta che il modale viene riaperto per
    // cambiare comando, il focus va subito sul select in modo da poter
    // digitare le prime lettere del nome del Comando per trovarlo rapidamente.
    // Premendo Invio, se un Comando è selezionato, si conferma ed entra.
    function focusSelectComando() {
        setTimeout(() => selectComando.focus(), 50);
    }

    selectComando.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            if (!btnConferma.disabled) btnConferma.click();
        }
    });

    // Focus quando il modale compare/riappare (osserva i cambi di display inline)
    const osservatoreModale = new MutationObserver(() => {
        if (modal.style.display === "flex") focusSelectComando();
    });
    osservatoreModale.observe(modal, { attributes: true, attributeFilter: ["style"] });

    // Se il modale è già visibile al caricamento (nessun comando salvato in sessione), porta subito il focus
    if (modal.style.display !== "none") {
        focusSelectComando();
    }

    // ==========================================================
    // CONTATORE ACCESSI + CREDITS
    // ==========================================================
    (function contatoreAccessi() {
        const displayContatore = document.getElementById("display-contatore-accessi");
        if (!displayContatore) return;

        fetch("https://abacus.jasoncameron.dev/hit/fireops-vvf-pel/accessi")
            .then(r => r.json())
            .then(dati => {
                displayContatore.textContent = `Accessi: ${dati.value}`;
            })
            .catch(() => {
                displayContatore.textContent = "Accessi: N/D";
            });
    })();
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