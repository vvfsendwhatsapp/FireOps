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
    // Il colore si posa sull'INTERA giornata (data + entrambe le sigle): in
    // Sala interessa vedere che quel giorno c'è servizio, non quale delle due
    // sigle stampate combacia. La sigla che combacia resta comunque marcata
    // più forte, così si legge a colpo d'occhio se è giorno o notte.
    //
    // Nel ciclo diurno e notturno non sono mai della stessa squadra nello
    // stesso giorno (verificato su tutti e 32 i giorni), quindi una giornata
    // non può risultare gialla e azzurra insieme.
    // ----------------------------------------------------------
    function analizzaGiorno(def, salto, turni, giornoSettimana) {
        const nessuna = { fascia: "", esatto: false, marcaSigla: false };
        if (!def) return nessuna;

        if (eGiornaliero(def)) {
            // Il G non ha una sigla nella sequenza: si colora la giornata,
            // ma non si marca nessuna delle due squadre di turno
            const feriale = giornoSettimana >= 1 && giornoSettimana <= 5;
            return feriale ? { fascia: "giorno", esatto: false, marcaSigla: false } : nessuna;
        }

        const candidate = [];
        if (def.fasce.includes("giorno")) candidate.push(["giorno", turni.giorno]);
        if (def.fasce.includes("notte")) candidate.push(["notte", turni.notte]);

        for (const [fascia, sigla] of candidate) {
            if (!def.lettere.includes(sigla.charAt(0).toUpperCase())) continue;
            const esatto = !!salto && sigla.slice(1) === String(salto);
            return { fascia, esatto, marcaSigla: true };
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
                // col saltoturno vince sulla distinzione giorno/notte
                const colore = esito.fascia ? (esito.esatto ? "salto" : esito.fascia) : "";
                const tinta = colore ? ` turnario-tinta-${colore}` : "";
                const marca = (colore && esito.marcaSigla) ? ` turnario-marca-${colore}` : "";

                const eOggi = oggi && oggi.year === anno && oggi.month === mese && oggi.day === giorno;
                const oggiClasse = eOggi ? " turnario-oggi" : "";
                const domenicaClasse = giornoSettimana === 0 ? " turnario-domenica" : "";

                rigaGiorni += `<td class="turnario-cella-giorno${domenicaClasse}${tinta}${oggiClasse}">` +
                    `<span class="turnario-sett">${GIORNI_SETTIMANA[giornoSettimana]}</span>` +
                    `<span class="turnario-num">${giorno}</span></td>`;

                const spanG = `<span class="turnario-turno turnario-turno-giorno${esito.fascia === "giorno" ? marca : ""}">${testoSicuro(turni.giorno)}</span>`;
                const spanN = `<span class="turnario-turno turnario-turno-notte${esito.fascia === "notte" ? marca : ""}">${testoSicuro(turni.notte.toLowerCase())}</span>`;

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
        // Il tema è chiaro e orizzontale: una griglia di 31 colonne su fondo
        // nero in verticale sarebbe illeggibile su carta e sprecherebbe toner.
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

            // Su carta i colori vanno schiariti: le tinte da schermo scuro
            // diventerebbero campiture pesanti e il testo nero sopra non si
            // leggerebbe. Le marcature restano più sature delle tinte.
            const stile = `
                @page { size: A4 landscape; margin: 10mm; }
                * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                body { font-family: Arial, Helvetica, sans-serif; color: #111; margin: 0; padding: 10px; }
                h1 { font-size: 15px; margin: 0 0 3px; }
                .sottotitolo { font-size: 10px; color: #555; margin: 0 0 8px; }
                .turnario-tabella { border-collapse: collapse; font-family: "Courier New", monospace; font-size: 8.5px; width: 100%; table-layout: fixed; }
                .turnario-tabella th, .turnario-tabella td { border: 1px solid #999; text-align: center; padding: 1px; }
                .turnario-mese { page-break-inside: avoid; break-inside: avoid; }
                .turnario-riga-mese th { background: #eee; text-align: left; padding: 3px 6px; font-size: 11px; }
                .turnario-cella-giorno { background: #f7f7f7; }
                .turnario-sett { display: block; color: #666; font-size: 7.5px; }
                .turnario-num { display: block; font-weight: bold; }
                .turnario-domenica .turnario-sett, .turnario-domenica .turnario-num { color: #b00; }
                .turnario-turno { display: inline-block; padding: 0 1px; }
                .turnario-separatore { color: #888; }
                .turnario-cella-vuota { background: #fff; border-color: #ddd; }

                /* Tinta = intera giornata, marca = la sigla che combacia */
                .turnario-tinta-giorno { background: #fff2b0; }
                .turnario-tinta-notte  { background: #cfeaff; }
                .turnario-tinta-salto  { background: #ffd0f2; }
                .turnario-marca-giorno { background: #ffd700; font-weight: bold; }
                .turnario-marca-notte  { background: #6cc4f5; font-weight: bold; }
                .turnario-marca-salto  { background: #ff6ad5; font-weight: bold; }

                /* Riga libera per segnare ferie e permessi a penna: resta
                   bianca anche sotto le giornate colorate, altrimenti la
                   penna non si legge sopra il fondo */
                .turnario-riga-note td { height: 7mm; background: #fff !important; }

                .legenda { font-size: 10px; margin: 8px 0 0; line-height: 1.8; }
                .legenda span { margin-right: 16px; white-space: nowrap; }
                .campione { display: inline-block; width: 11px; height: 11px; border: 1px solid #999; vertical-align: -1px; margin-right: 4px; }
            `;

            const CAMPIONI_STAMPA = { giorno: "#ffd700", notte: "#6cc4f5", salto: "#ff6ad5" };
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
            let giaStampato = false;
            const stampaUnaVolta = () => {
                if (giaStampato) return;
                giaStampato = true;
                finestra.focus();
                finestra.print();
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