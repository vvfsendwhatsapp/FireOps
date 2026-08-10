// ==========================================================
// FireOps VVF — SEZIONE QRCODE
//
// Campo di testo, anteprima del codice e salvataggio in PNG, JPG o PDF.
// La generazione del codice sta in qrcode.js: qui c'è solo il disegno.
//
// Va caricato DOPO qrcode.js:
//     <script src="qrcode.js"></script>
//     <script src="qrcoder.js"></script>
// ==========================================================
(function () {
    "use strict";

    const LIVELLO_CORREZIONE = "M";   // ~15% del codice recuperabile se rovinato
    const MODULI_BORDO = 4;           // margine chiaro richiesto dallo standard
    const LATO_ESPORTAZIONE = 1000;   // pixel indicativi del lato in PNG/JPG

    let qrCorrente = null;
    let testoCorrente = "";

    // ==========================================================
    // DISEGNO SU CANVAS
    //
    // Un canvas solo per tutto: anteprima a schermo e file esportati. Il
    // fondo è dipinto di bianco anche per il PNG: un QR trasparente diventa
    // nero su nero appena finisce in una chat o in un documento scuro.
    // ==========================================================
    function disegnaCanvas(qr, moduloPx) {
        const lato = (qr.dimensione + MODULI_BORDO * 2) * moduloPx;
        const canvas = document.createElement("canvas");
        canvas.width = lato;
        canvas.height = lato;

        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, lato, lato);

        ctx.fillStyle = "#000000";
        for (let r = 0; r < qr.dimensione; r++) {
            for (let c = 0; c < qr.dimensione; c++) {
                if (!qr.moduli[r][c]) continue;
                ctx.fillRect(
                    (c + MODULI_BORDO) * moduloPx,
                    (r + MODULI_BORDO) * moduloPx,
                    moduloPx, moduloPx
                );
            }
        }
        return canvas;
    }

    function moduloPerEsportazione(qr) {
        const totale = qr.dimensione + MODULI_BORDO * 2;
        return Math.max(4, Math.round(LATO_ESPORTAZIONE / totale));
    }

    // ==========================================================
    // SALVATAGGIO
    // ==========================================================
    function scarica(blob, nomeFile) {
        const url = URL.createObjectURL(blob);
        const collegamento = document.createElement("a");
        collegamento.href = url;
        collegamento.download = nomeFile;
        document.body.appendChild(collegamento);
        collegamento.click();
        collegamento.remove();
        // Revoca ritardata: alcuni browser leggono l'URL dopo il click
        setTimeout(() => URL.revokeObjectURL(url), 2000);
    }

    // Nome file ricavato dal contenuto: ritrovare un QR salvato mesi prima
    // è impossibile se si chiamano tutti "qrcode.png"
    function nomeFileDaTesto(estensione) {
        const base = testoCorrente
            .replace(/^https?:\/\//i, "")
            .replace(/[^a-zA-Z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "")
            .slice(0, 40)
            .toLowerCase();
        return `qr-${base || "codice"}.${estensione}`;
    }

    function salvaImmagine(tipo, estensione, qualita) {
        if (!qrCorrente) return;
        const canvas = disegnaCanvas(qrCorrente, moduloPerEsportazione(qrCorrente));
        canvas.toBlob(blob => {
            if (!blob) {
                alert("Il browser non è riuscito a creare l'immagine.");
                return;
            }
            scarica(blob, nomeFileDaTesto(estensione));
        }, tipo, qualita);
    }

    // ==========================================================
    // PDF SCRITTO A MANO
    //
    // Niente libreria, per lo stesso motivo per cui non c'è per il codice:
    // una postazione con la navigazione filtrata non raggiungerebbe la CDN.
    //
    // I moduli diventano rettangoli vettoriali, non un'immagine: il codice
    // resta nitido a qualsiasi ingrandimento e stampato non sgrana, che è
    // esattamente ciò che serve a un QR destinato a essere inquadrato.
    // ==========================================================

    // Testo dentro una stringa PDF: parentesi e barre vanno protette,
    // e i caratteri fuori da WinAnsi non hanno rappresentazione
    function testoPdf(valore) {
        return String(valore)
            .replace(/\\/g, "\\\\")
            .replace(/\(/g, "\\(")
            .replace(/\)/g, "\\)")
            .split("")
            .map(ch => ch.charCodeAt(0) > 255 ? "?" : ch)
            .join("");
    }

    // Ogni riga di moduli scuri contigui diventa un solo rettangolo invece
    // di uno per modulo: su una versione 40 sono decine di migliaia di
    // rettangoli in meno, e un file molto più leggero
    function rettangoliQr(qr, origineX, origineY, lato) {
        const passo = lato / qr.dimensione;
        const rettangoli = [];

        for (let r = 0; r < qr.dimensione; r++) {
            let inizio = -1;
            for (let c = 0; c <= qr.dimensione; c++) {
                const scuro = c < qr.dimensione && qr.moduli[r][c];
                if (scuro && inizio < 0) {
                    inizio = c;
                } else if (!scuro && inizio >= 0) {
                    const x = origineX + inizio * passo;
                    // Nel PDF l'origine è in basso a sinistra: le righe si
                    // contano dall'alto, quindi la Y va rovesciata
                    const y = origineY + lato - (r + 1) * passo;
                    const larghezza = (c - inizio) * passo;
                    rettangoli.push(`${x.toFixed(2)} ${y.toFixed(2)} ${larghezza.toFixed(2)} ${passo.toFixed(2)} re`);
                    inizio = -1;
                }
            }
        }
        return rettangoli;
    }

    function spezzaInRighe(testo, caratteriPerRiga) {
        const parole = testo.split(/\s+/);
        const righe = [];
        let corrente = "";

        parole.forEach(parola => {
            // Una parola più lunga della riga (un URL) va tagliata comunque
            while (parola.length > caratteriPerRiga) {
                if (corrente) { righe.push(corrente); corrente = ""; }
                righe.push(parola.slice(0, caratteriPerRiga));
                parola = parola.slice(caratteriPerRiga);
            }
            if (!corrente) corrente = parola;
            else if ((corrente + " " + parola).length <= caratteriPerRiga) corrente += " " + parola;
            else { righe.push(corrente); corrente = parola; }
        });

        if (corrente) righe.push(corrente);
        return righe;
    }

    function costruisciPdf(qr, testo) {
        const LARGHEZZA = 595, ALTEZZA = 842;   // A4 verticale in punti
        const LATO_QR = 300;
        const originX = (LARGHEZZA - LATO_QR) / 2;
        const originY = ALTEZZA - 110 - LATO_QR;

        const righe = spezzaInRighe(testo, 78).slice(0, 12);
        let testoPdfBlocco = "BT /F1 9 Tf\n";
        righe.forEach((riga, i) => {
            const y = originY - 34 - i * 12;
            testoPdfBlocco += `1 0 0 1 ${originX.toFixed(2)} ${y.toFixed(2)} Tm (${testoPdf(riga)}) Tj\n`;
        });
        testoPdfBlocco += "ET\n";

        const intestazione = `BT /F1 13 Tf 1 0 0 1 ${originX.toFixed(2)} ${(ALTEZZA - 70).toFixed(2)} Tm (FireOps VVF - Codice QR) Tj ET\n`;

        const disegnoQr = rettangoliQr(qr, originX, originY, LATO_QR).join("\n") + "\nf\n";

        const contenuto = "0 g\n" + intestazione + disegnoQr + testoPdfBlocco;

        const oggetti = [
            "<< /Type /Catalog /Pages 2 0 R >>",
            "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
            `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${LARGHEZZA} ${ALTEZZA}] ` +
            "/Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
            `<< /Length ${contenuto.length} >>\nstream\n${contenuto}endstream`,
            "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>"
        ];

        // La tabella xref elenca la posizione in byte di ogni oggetto: va
        // costruita mentre si compone il file, non dopo
        let pdf = "%PDF-1.4\n";
        const posizioni = [];
        oggetti.forEach((corpo, i) => {
            posizioni.push(pdf.length);
            pdf += `${i + 1} 0 obj\n${corpo}\nendobj\n`;
        });

        const inizioXref = pdf.length;
        pdf += `xref\n0 ${oggetti.length + 1}\n0000000000 65535 f \n`;
        posizioni.forEach(p => {
            pdf += String(p).padStart(10, "0") + " 00000 n \n";
        });
        pdf += `trailer\n<< /Size ${oggetti.length + 1} /Root 1 0 R >>\nstartxref\n${inizioXref}\n%%EOF\n`;

        // Il PDF è composto di soli caratteri Latin-1: la conversione byte a
        // byte tiene valide le posizioni calcolate sopra, che una codifica
        // UTF-8 automatica del Blob sfaserebbe
        const byte = new Uint8Array(pdf.length);
        for (let i = 0; i < pdf.length; i++) byte[i] = pdf.charCodeAt(i) & 0xFF;
        return new Blob([byte], { type: "application/pdf" });
    }

    function salvaPdf() {
        if (!qrCorrente) return;
        scarica(costruisciPdf(qrCorrente, testoCorrente), nomeFileDaTesto("pdf"));
    }

    // ==========================================================
    // COLLEGAMENTO AL DOM
    // ==========================================================
    document.addEventListener("DOMContentLoaded", () => {
        const campoTesto = document.getElementById("qr-testo");
        const btnVisualizza = document.getElementById("btn-qr-visualizza");
        const btnPng = document.getElementById("btn-qr-png");
        const btnJpg = document.getElementById("btn-qr-jpg");
        const btnPdf = document.getElementById("btn-qr-pdf");
        const contenitore = document.getElementById("qr-anteprima");
        const messaggio = document.getElementById("qr-messaggio");

        if (!campoTesto || !contenitore) return;

        const pulsantiSalvataggio = [btnPng, btnJpg, btnPdf];

        function abilitaSalvataggi(attivi) {
            pulsantiSalvataggio.forEach(b => { if (b) b.disabled = !attivi; });
        }

        function mostraMessaggio(testo, errore) {
            if (!messaggio) return;
            messaggio.textContent = testo || "";
            messaggio.style.display = testo ? "block" : "none";
            messaggio.style.color = errore ? "var(--danger-color)" : "var(--text-muted)";
        }

        function aggiornaStatoVisualizza() {
            if (btnVisualizza) btnVisualizza.disabled = !campoTesto.value.trim();
        }

        function svuotaAnteprima() {
            qrCorrente = null;
            testoCorrente = "";
            contenitore.innerHTML = "";
            abilitaSalvataggi(false);
        }

        function visualizza() {
            const testo = campoTesto.value.trim();
            if (!testo) return;

            try {
                qrCorrente = FireOpsQR.genera(testo, LIVELLO_CORREZIONE);
                testoCorrente = testo;
            } catch (err) {
                svuotaAnteprima();
                mostraMessaggio(err.message, true);
                return;
            }

            // A schermo bastano pochi pixel per modulo: l'ingrandimento
            // avviene via CSS, e i file esportati usano una risoluzione loro
            const canvas = disegnaCanvas(qrCorrente, 8);
            canvas.className = "qr-canvas";
            contenitore.innerHTML = "";
            contenitore.appendChild(canvas);

            abilitaSalvataggi(true);
            mostraMessaggio(
                `Versione ${qrCorrente.versione} · ${qrCorrente.dimensione}×${qrCorrente.dimensione} moduli · ` +
                `${qrCorrente.byte} byte · correzione ${qrCorrente.livello}`,
                false
            );
        }

        campoTesto.addEventListener("input", () => {
            aggiornaStatoVisualizza();
            // Il codice a schermo non deve sopravvivere al testo che lo ha
            // generato: salvarne uno che non corrisponde più sarebbe peggio
            // che non averlo
            if (qrCorrente && campoTesto.value.trim() !== testoCorrente) {
                svuotaAnteprima();
                mostraMessaggio("Testo modificato: premi «Visualizza QR» per rigenerare il codice.", false);
            }
        });

        campoTesto.addEventListener("keydown", (e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                visualizza();
            }
        });

        if (btnVisualizza) btnVisualizza.addEventListener("click", visualizza);
        if (btnPng) btnPng.addEventListener("click", () => salvaImmagine("image/png", "png"));
        if (btnJpg) btnJpg.addEventListener("click", () => salvaImmagine("image/jpeg", "jpg", 0.95));
        if (btnPdf) btnPdf.addEventListener("click", salvaPdf);

        aggiornaStatoVisualizza();
        abilitaSalvataggi(false);
    });
})();