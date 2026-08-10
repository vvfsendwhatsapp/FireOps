// ==========================================================
// FireOps VVF — SEZIONE TURNARIO
//
// Costruisce il calendario annuale dei turni: 12 blocchi da 3 righe
// (mese / giorno della settimana + numero / coppia giorno-notte) e
// evidenzia le giornate del turno scelto.
//
// I turni NON sono in un file di dati: derivano dalla sequenza a 32 giorni
// di fireops-core.js (SEQUENZA_TURNI), quindi qualsiasi anno — passato o
// futuro — si calcola senza tabelle da mantenere.
//
// Va caricato DOPO fireops-core.js:
//     <script src="fireops-core.js"></script>
//     <script src="script.js"></script>
//     <script src="turnario.js"></script>
// ==========================================================
(function () {
    "use strict";

    const MESI = ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
        "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"];

    // Indicizzati come getUTCDay(): 0 = domenica
    const GIORNI_SETTIMANA = ["do", "lu", "ma", "me", "gi", "ve", "sa"];

    const URL_GESTIONE_PERSONALE = "https://gestionepersonale.dipvvf.it";

    // Il turnario è largo 31 colonne fisse: i mesi corti (e febbraio, bisestile
    // o no) lasciano vuote le ultime celle, così la colonna del giorno 7 è la
    // stessa in tutti e dodici i mesi
    const COLONNE = 31;

    // ----------------------------------------------------------
    // TIPI DI TURNO
    //
    // Ogni voce dichiara SU COSA si posa l'evidenziazione:
    //   lettere → quali squadre della sequenza (A/B/C/D)
    //   fasce   → "giorno" (08-20) e/o "notte" (20-08)
    //
    // Il turno G non compare nella sequenza: non è una squadra ma un orario
    // giornaliero, quindi segue il calendario civile (lun-ven) e ignora il
    // saltoturno, che per lui non esiste.
    // ----------------------------------------------------------
    const TIPI_TURNO = [
        { valore: "A", etichetta: "Turno A", lettere: ["A"], fasce: ["giorno", "notte"] },
        { valore: "B", etichetta: "Turno B", lettere: ["B"], fasce: ["giorno", "notte"] },
        { valore: "C", etichetta: "Turno C", lettere: ["C"], fasce: ["giorno", "notte"] },
        { valore: "D", etichetta: "Turno D", lettere: ["D"], fasce: ["giorno", "notte"] },
        { valore: "G", etichetta: "Turno G (giornaliero lun-ven)", tipo: "giornaliero" },
        { valore: "12/36 AB", etichetta: "12/36 AB", lettere: ["A", "B"], fasce: ["giorno"] },
        { valore: "12/36 CD", etichetta: "12/36 CD", lettere: ["C", "D"], fasce: ["giorno"] },
        { valore: "24/72 A", etichetta: "24/72 A", lettere: ["A"], fasce: ["giorno"] },
        { valore: "24/72 B", etichetta: "24/72 B", lettere: ["B"], fasce: ["giorno"] },
        { valore: "24/72 C", etichetta: "24/72 C", lettere: ["C"], fasce: ["giorno"] },
        { valore: "24/72 D", etichetta: "24/72 D", lettere: ["D"], fasce: ["giorno"] }
    ];

    function definizioneTurno(valore) {
        return TIPI_TURNO.find(t => t.valore === valore) || null;
    }

    function eGiornaliero(def) {
        return !!def && def.tipo === "giornaliero";
    }

    // ----------------------------------------------------------
    // LETTURA DI UNA GIORNATA
    //
    // Restituisce la fascia che riguarda chi consulta il turnario:
    //   fascia = ""        → giornata libera, nessun colore
    //   fascia = "giorno"  → di servizio 08:00-20:00  (giallo)
    //   fascia = "notte"   → di servizio 20:00-08:00  (azzurro)
    //   esatto = true      → coincide anche col saltoturno chiesto (fucsia)
    //
    // Il colore riempie l'INTERA giornata (data + entrambe le sigle): in
    // Sala interessa vedere che quel giorno c'è servizio, e la tinta stessa
    // dice già se è diurno o notturno. Nessuna sigla viene marcata a parte:
    // sopra una cella tutta gialla sarebbe solo rumore.
    //
    // Nel ciclo diurno e notturno non sono mai della stessa squadra nello
    // stesso giorno (verificato su tutti e 32 i giorni), quindi una giornata
    // non può risultare gialla e azzurra insieme.
    // ----------------------------------------------------------
    function analizzaGiorno(def, salto, turni, giornoSettimana) {
        const nessuna = { fascia: "", esatto: false };
        if (!def) return nessuna;

        if (eGiornaliero(def)) {
            // Il G non appartiene a nessuna delle squadre della sequenza:
            // si colora comunque la giornata di servizio
            const feriale = giornoSettimana >= 1 && giornoSettimana <= 5;
            return feriale ? { fascia: "giorno", esatto: false } : nessuna;
        }

        const candidate = [];
        if (def.fasce.includes("giorno")) candidate.push(["giorno", turni.giorno]);
        if (def.fasce.includes("notte")) candidate.push(["notte", turni.notte]);

        for (const [fascia, sigla] of candidate) {
            if (!def.lettere.includes(sigla.charAt(0).toUpperCase())) continue;
            const esatto = !!salto && sigla.slice(1) === String(salto);
            return { fascia, esatto };
        }

        return nessuna;
    }

    function giorniNelMese(anno, mese) {
        // Il giorno 0 del mese successivo è l'ultimo del mese richiesto: il
        // calcolo degli anni bisestili lo fa il motore delle date, non noi
        return new Date(Date.UTC(anno, mese, 0)).getUTCDate();
    }

    function eBisestile(anno) {
        return giorniNelMese(anno, 2) === 29;
    }

    function testoSicuro(valore) {
        return String(valore === null || valore === undefined ? "" : valore)
            .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }

    // ----------------------------------------------------------
    // COSTRUZIONE DELLA TABELLA
    //
    // Lo stesso HTML serve sia a schermo sia alla stampa: cambia solo il
    // foglio di stile applicato, mai il markup. Così non esistono due
    // versioni del turnario che possono divergere.
    //
    // Ogni mese è un <tbody> a sé: serve al CSS di stampa per non spezzare
    // un mese a metà fra due pagine.
    //
    // La quarta riga (annotazioni a penna per ferie e permessi) è sempre
    // presente nel markup ed è nascosta a schermo dal CSS: su carta serve,
    // a video sarebbe solo una striscia vuota che allontana i mesi.
    // ----------------------------------------------------------
    function costruisciTabella(anno, def, salto, oggi) {
        let html = '<table class="turnario-tabella">';

        for (let mese = 1; mese <= 12; mese++) {
            const quantiGiorni = giorniNelMese(anno, mese);

            html += '<tbody class="turnario-mese">';
            html += `<tr class="turnario-riga-mese"><th colspan="${COLONNE}">${MESI[mese - 1]} ${anno}</th></tr>`;

            let rigaGiorni = '<tr class="turnario-riga-giorni">';
            let rigaTurni = '<tr class="turnario-riga-turni">';
            let rigaNote = '<tr class="turnario-riga-note">';

            for (let giorno = 1; giorno <= COLONNE; giorno++) {
                if (giorno > quantiGiorni) {
                    rigaGiorni += '<td class="turnario-cella-vuota"></td>';
                    rigaTurni += '<td class="turnario-cella-vuota"></td>';
                    rigaNote += '<td class="turnario-cella-vuota"></td>';
                    continue;
                }

                const giornoSettimana = new Date(Date.UTC(anno, mese - 1, giorno)).getUTCDay();
                const turni = FireOps.turniDelGiorno(anno, mese, giorno);
                const esito = analizzaGiorno(def, salto, turni, giornoSettimana);

                // Un solo nome per il colore della giornata: la corrispondenza
                // col saltoturno vince sulla distinzione giorno/notte.
                // Il colore riempie la cella intera e basta da solo a dire se
                // e' diurno o notturno: nessuna marcatura sulla singola sigla.
                const colore = esito.fascia ? (esito.esatto ? "salto" : esito.fascia) : "";
                const tinta = colore ? ` turnario-tinta-${colore}` : "";

                const eOggi = oggi && oggi.year === anno && oggi.month === mese && oggi.day === giorno;
                const oggiClasse = eOggi ? " turnario-oggi" : "";
                const domenicaClasse = giornoSettimana === 0 ? " turnario-domenica" : "";

                rigaGiorni += `<td class="turnario-cella-giorno${domenicaClasse}${tinta}${oggiClasse}">` +
                    `<span class="turnario-sett">${GIORNI_SETTIMANA[giornoSettimana]}</span>` +
                    `<span class="turnario-num">${giorno}</span></td>`;

                const spanG = `<span class="turnario-turno turnario-turno-giorno">${testoSicuro(turni.giorno)}</span>`;
                const spanN = `<span class="turnario-turno turnario-turno-notte">${testoSicuro(turni.notte.toLowerCase())}</span>`;

                rigaTurni += `<td class="turnario-cella-turni${tinta}${oggiClasse}">${spanG}<span class="turnario-separatore">/</span>${spanN}</td>`;
                rigaNote += `<td class="turnario-cella-note${tinta}"></td>`;
            }

            html += rigaGiorni + '</tr>' + rigaTurni + '</tr>' + rigaNote + '</tr>';
            html += '</tbody>';
        }

        return html + '</table>';
    }

    function descrizioneSelezione(anno, def, salto) {
        if (!def) return `Turnario ${anno}`;
        const conSalto = (!eGiornaliero(def) && salto) ? ` — saltoturno ${salto}` : "";
        return `Turnario ${anno} — ${def.etichetta}${conSalto}`;
    }

    // Voci di legenda: le stesse a schermo e in stampa, così chi guarda il
    // foglio stampato legge esattamente quello che aveva a video
    function vociLegenda(def, salto) {
        if (!def) return [];

        if (eGiornaliero(def)) {
            return [
                { colore: "giorno", testo: "giornata di servizio (lun-ven)" },
                { colore: null, testo: "Il turno G non ha saltoturno: segue il calendario civile, non la sequenza delle squadre." }
            ];
        }

        const soloDiurno = !def.fasce.includes("notte");
        const voci = [];

        if (salto) {
            voci.push({ colore: "salto", testo: `saltoturno ${salto} — le tue giornate` });
            voci.push({ colore: "giorno", testo: soloDiurno ? "stessa squadra, altro saltoturno" : "diurno, altro saltoturno" });
            if (!soloDiurno) voci.push({ colore: "notte", testo: "notturno, altro saltoturno" });
        } else {
            voci.push({ colore: "giorno", testo: `turno ${def.lettere.join("/")} diurno (08:00-20:00)` });
            if (!soloDiurno) voci.push({ colore: "notte", testo: `turno ${def.lettere.join("/")} notturno (20:00-08:00)` });
            voci.push({ colore: null, testo: "Scegli un saltoturno per distinguere le tue giornate da quelle delle altre squadre con la stessa lettera." });
        }

        return voci;
    }

    function legendaHtml(def, salto) {
        const voci = vociLegenda(def, salto);
        if (voci.length === 0) return "";

        const elementi = voci.map(v => {
            const campione = v.colore
                ? `<span class="turnario-campione turnario-tinta-${v.colore}"></span>`
                : "";
            return `<span class="turnario-legenda-voce">${campione}${testoSicuro(v.testo)}</span>`;
        }).join("");

        return `<div class="turnario-legenda">${elementi}</div>`;
    }

    // ==========================================================
    // COLLEGAMENTO AL DOM
    // ==========================================================
    document.addEventListener("DOMContentLoaded", () => {
        const selectAnno = document.getElementById("turnario-anno");
        const selectTurno = document.getElementById("turnario-turno");
        const selectSalto = document.getElementById("turnario-salto");
        const btnVisualizza = document.getElementById("btn-turnario-visualizza");
        const btnPdf = document.getElementById("btn-turnario-pdf");
        const btnGestione = document.getElementById("btn-turnario-gestione");
        const contenitore = document.getElementById("turnario-griglia");

        if (!selectAnno || !selectTurno || !contenitore) return;

        let giaVisualizzato = false;

        function annoCorrenteRoma() {
            return FireOps.componentiRoma(new Date()).year;
        }

        // Anno precedente, corrente e successivo. Ricostruito a ogni chiamata
        // perché una postazione di Sala Operativa può restare aperta oltre la
        // mezzanotte del 31 dicembre: l'elenco deve seguire il calendario,
        // non il momento in cui la pagina è stata caricata.
        function popolaAnni() {
            const corrente = annoCorrenteRoma();
            const selezionato = selectAnno.value ? parseInt(selectAnno.value, 10) : corrente;
            const anni = [corrente - 1, corrente, corrente + 1];

            selectAnno.innerHTML = anni
                .map(a => `<option value="${a}">${a}</option>`)
                .join("");

            selectAnno.value = anni.includes(selezionato) ? String(selezionato) : String(corrente);
        }

        function popolaTurni() {
            selectTurno.innerHTML = '<option value="" disabled selected>-- Seleziona turno --</option>' +
                TIPI_TURNO.map(t => `<option value="${testoSicuro(t.valore)}">${testoSicuro(t.etichetta)}</option>`).join("");
        }

        function popolaSalti() {
            let opzioni = '<option value="">-- Nessuno --</option>';
            for (let n = 1; n <= 8; n++) opzioni += `<option value="${n}">${n}</option>`;
            selectSalto.innerHTML = opzioni;
        }

        function aggiornaStatoControlli() {
            const def = definizioneTurno(selectTurno.value);

            // Il saltoturno non si applica al giornaliero: meglio spento e
            // azzerato che presente e ignorato in silenzio
            if (selectSalto) {
                const disabilita = eGiornaliero(def);
                if (disabilita && selectSalto.value) selectSalto.value = "";
                selectSalto.disabled = disabilita;
            }

            const pronto = !!selectAnno.value && !!selectTurno.value;
            [btnVisualizza, btnPdf, btnGestione].forEach(b => { if (b) b.disabled = !pronto; });
            return pronto;
        }

        function selezioneCorrente() {
            return {
                anno: parseInt(selectAnno.value, 10),
                def: definizioneTurno(selectTurno.value),
                salto: (selectSalto && !selectSalto.disabled) ? selectSalto.value : ""
            };
        }

        function disegna() {
            const { anno, def, salto } = selezioneCorrente();
            if (!anno || !def) return;

            const oggi = FireOps.componentiRoma(new Date());
            const giorniAnno = eBisestile(anno) ? 366 : 365;

            contenitore.innerHTML = `
                <div class="turnario-intestazione">
                    <h4>${testoSicuro(descrizioneSelezione(anno, def, salto))}</h4>
                    <span class="turnario-conteggio">${giorniAnno} giorni</span>
                </div>
                ${legendaHtml(def, salto)}
                <div class="turnario-scroll">${costruisciTabella(anno, def, salto, oggi)}</div>
            `;
            giaVisualizzato = true;
        }

        // Una volta disegnato, cambiare un menu ridisegna subito: chiedere di
        // ripremere "Visualizza" dopo ogni modifica sarebbe solo un clic in più
        function suCambioSelezione() {
            const pronto = aggiornaStatoControlli();
            if (pronto && giaVisualizzato) disegna();
        }

        // ----------------------------------------------------------
        // STAMPA / PDF
        //
        // Nessuna libreria: si apre una scheda nuova che contiene SOLO titolo,
        // tabella e legenda — niente intestazione FireOps, niente pulsanti,
        // niente split-screen — e si chiama la stampa del browser, dove come
        // destinazione si può scegliere "Salva come PDF".
        //
        // Il foglio è A3 verticale: ci sta l'anno intero, riga per le
        // annotazioni compresa. Il fondo è bianco, non il nero dell'app:
        // stampare una pagina nera sprecherebbe toner e sarebbe illeggibile.
        // ----------------------------------------------------------
        function stampaPdf() {
            const { anno, def, salto } = selezioneCorrente();
            if (!anno || !def) return;

            const titolo = descrizioneSelezione(anno, def, salto);
            const finestra = window.open("", "_blank");
            if (!finestra) {
                alert("Il browser ha bloccato la finestra di stampa: consenti i popup per questo sito e riprova.");
                return;
            }

            // A3 verticale: 297x420 mm. Con 31 colonne su 277 mm utili ogni
            // giornata ha circa 8,9 mm, e i dodici mesi con la riga per le
            // annotazioni stanno su un foglio solo. In A4 orizzontale l'anno
            // si spezzava su due o tre pagine.
            //
            // I colori restano pieni come a schermo: e' una scelta di lettura,
            // non un vezzo, e schiarirli su carta renderebbe il foglio stampato
            // diverso da quello che si vede a video.
            const stile = `
                @page { size: A3 portrait; margin: 10mm; }
                * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                body { font-family: Arial, Helvetica, sans-serif; color: #111; margin: 0; padding: 8px; }
                h1 { font-size: 17px; margin: 0 0 3px; }
                .sottotitolo { font-size: 11px; color: #555; margin: 0 0 10px; }
                .turnario-tabella { border-collapse: collapse; font-family: "Courier New", monospace; font-size: 10px; width: 100%; table-layout: fixed; }
                .turnario-tabella th, .turnario-tabella td { border: 1px solid #999; text-align: center; padding: 1px; }
                .turnario-mese { page-break-inside: avoid; break-inside: avoid; }
                .turnario-riga-mese th { background: #e8e8e8; text-align: left; padding: 3px 6px; font-size: 12px; }
                .turnario-cella-giorno { background: #f7f7f7; line-height: 1.2; }
                .turnario-sett { display: block; color: #666; font-size: 8px; text-transform: uppercase; }
                .turnario-num { display: block; font-weight: bold; }
                .turnario-domenica .turnario-sett, .turnario-domenica .turnario-num { color: #b00; }
                .turnario-turno { display: inline-block; padding: 0 1px; }
                .turnario-separatore { color: #888; }
                .turnario-cella-vuota { background: #fff; border-color: #ddd; }

                /* Colore pieno su tutta la cella, data compresa */
                .turnario-tinta-giorno { background: #ffd700; }
                .turnario-tinta-notte  { background: #4fc3f7; }
                .turnario-tinta-salto  { background: #ff4fd8; }
                .turnario-tinta-giorno .turnario-sett, .turnario-tinta-notte .turnario-sett, .turnario-tinta-salto .turnario-sett,
                .turnario-tinta-giorno .turnario-num,  .turnario-tinta-notte .turnario-num,  .turnario-tinta-salto .turnario-num,
                .turnario-tinta-giorno .turnario-separatore, .turnario-tinta-notte .turnario-separatore, .turnario-tinta-salto .turnario-separatore { color: #111; }

                /* Riga libera per segnare ferie e permessi a penna: eredita
                   la tinta della giornata, così la colonna colorata scende
                   compatta dalla data fino allo spazio per gli appunti */
                .turnario-riga-note td { height: 8mm; }

                .legenda { font-size: 11px; margin: 10px 0 0; line-height: 1.9; }
                .legenda span { margin-right: 18px; white-space: nowrap; }
                .campione { display: inline-block; width: 12px; height: 12px; border: 1px solid #999; vertical-align: -1px; margin-right: 5px; }
            `;

            const CAMPIONI_STAMPA = { giorno: "#ffd700", notte: "#4fc3f7", salto: "#ff4fd8" };
            const legendaStampa = vociLegenda(def, salto).map(v => {
                const campione = v.colore
                    ? `<i class="campione" style="background:${CAMPIONI_STAMPA[v.colore]}"></i>`
                    : "";
                return `<span>${campione}${testoSicuro(v.testo)}</span>`;
            }).join("");

            finestra.document.write(`<!DOCTYPE html><html lang="it"><head><meta charset="UTF-8">
                <title>${testoSicuro(titolo)}</title><style>${stile}</style></head><body>
                <h1>${testoSicuro(titolo)}</h1>
                <p class="sottotitolo">Vigili del Fuoco — MAIUSCOLO: turno diurno 08:00-20:00 · minuscolo: turno notturno 20:00-08:00 · riga libera sotto ogni mese per ferie e permessi</p>
                ${costruisciTabella(anno, def, salto, null)}
                <p class="legenda">${legendaStampa}</p>
                </body></html>`);
            finestra.document.close();

            // Il rendering della tabella deve concludersi prima della stampa,
            // altrimenti su alcuni browser l'anteprima esce a pagina bianca.
            // Dopo document.close() il load può essere già scattato: il timer
            // di scorta evita la finestra che resta lì senza aprire la stampa.
            //
            // A stampa finita (o annullata) la scheda si chiude da sola: e'
            // servita solo a impaginare, tenerla aperta lascerebbe in giro
            // schede "Turnario 2026" a ogni tentativo.
            //
            // Il segnale di fine arriva per due strade perche' i browser non
            // concordano: onafterprint e' l'evento ufficiale, ma su Chrome ed
            // Edge print() e' bloccante e ritorna quando il dialogo si chiude,
            // mentre su Firefox e Safari ritorna subito. Chiudere solo sul
            // ritorno di print() ucciderebbe l'anteprima ancora aperta; solo
            // su onafterprint lascerebbe la scheda dove l'evento non scatta.
            // Il ritardo dà al browser il tempo di finire il lavoro di stampa.
            let giaChiusa = false;
            const chiudiScheda = () => {
                if (giaChiusa) return;
                giaChiusa = true;
                setTimeout(() => { try { finestra.close(); } catch (err) {} }, 400);
            };

            let giaStampato = false;
            const stampaUnaVolta = () => {
                if (giaStampato) return;
                giaStampato = true;
                finestra.onafterprint = chiudiScheda;
                finestra.focus();
                finestra.print();
                chiudiScheda();
            };
            finestra.onload = stampaUnaVolta;
            setTimeout(stampaUnaVolta, 600);
        }

        popolaAnni();
        popolaTurni();
        if (selectSalto) popolaSalti();
        aggiornaStatoControlli();

        selectAnno.addEventListener("change", suCambioSelezione);
        selectTurno.addEventListener("change", suCambioSelezione);
        if (selectSalto) selectSalto.addEventListener("change", suCambioSelezione);

        if (btnVisualizza) btnVisualizza.addEventListener("click", () => {
            popolaAnni();          // allinea l'elenco se nel frattempo è cambiato l'anno
            if (aggiornaStatoControlli()) disegna();
        });

        if (btnPdf) btnPdf.addEventListener("click", stampaPdf);

        if (btnGestione) btnGestione.addEventListener("click", () => {
            window.open(URL_GESTIONE_PERSONALE, "_blank", "noopener");
        });
    });
})();