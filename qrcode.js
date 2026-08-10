// ==========================================================
// FireOps VVF — GENERATORE DI CODICI QR
//
// Implementazione autonoma dello standard ISO/IEC 18004: nessuna libreria,
// nessuna CDN. Le postazioni di Sala Operativa possono avere la navigazione
// filtrata, e un pulsante che smette di funzionare perché non raggiunge
// unpkg è peggio di un pulsante che non c'è.
//
// Copre la modalità byte (UTF-8), le versioni da 1 a 40 e i quattro livelli
// di correzione d'errore. Restituisce la matrice di moduli: il disegno su
// schermo, PNG, JPG o PDF è compito di chi la usa.
//
// Uso:
//     const qr = FireOpsQR.genera("testo", "M");
//     qr.dimensione   → lato in moduli
//     qr.moduli[r][c] → true se il modulo è scuro
// ==========================================================
window.FireOpsQR = (function () {
    "use strict";

    // ==========================================================
    // TABELLE DELLO STANDARD
    //
    // Per ogni livello di correzione e versione: quanti codeword di
    // correzione ha ciascun blocco, e in quanti blocchi sono divisi i dati.
    // Da questi due numeri discende tutto il resto (capacità, suddivisione
    // in gruppi, interleaving), quindi non serve la tabella gigante dello
    // standard con una riga per combinazione.
    // ==========================================================
    const LIVELLI = { L: 0, M: 1, Q: 2, H: 3 };

    // Bit di formato associati a ciascun livello (non coincidono con l'indice)
    const BIT_FORMATO_LIVELLO = { L: 1, M: 0, Q: 3, H: 2 };

    const EC_PER_BLOCCO = {
        L: [null, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 26, 30, 22, 24, 28, 30, 28, 28, 28, 28, 30, 30, 26, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
        M: [null, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28],
        Q: [null, 13, 22, 18, 26, 18, 24, 18, 22, 20, 24, 28, 26, 24, 20, 30, 24, 28, 28, 26, 30, 28, 30, 30, 30, 30, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
        H: [null, 17, 28, 22, 16, 22, 28, 26, 26, 24, 28, 24, 28, 22, 24, 24, 30, 28, 28, 26, 28, 30, 24, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30]
    };

    const NUM_BLOCCHI = {
        L: [null, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4, 4, 4, 4, 4, 6, 6, 6, 6, 7, 8, 8, 9, 9, 10, 12, 12, 12, 13, 14, 15, 16, 17, 18, 19, 19, 20, 21, 22, 24, 25],
        M: [null, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23, 25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49],
        Q: [null, 1, 1, 2, 2, 4, 4, 6, 6, 8, 8, 8, 10, 12, 16, 12, 17, 16, 18, 21, 20, 23, 23, 25, 27, 29, 34, 34, 35, 38, 40, 43, 45, 48, 51, 53, 56, 59, 62, 65, 68],
        H: [null, 1, 1, 2, 4, 4, 4, 5, 6, 8, 8, 11, 11, 16, 16, 18, 16, 19, 21, 25, 25, 25, 34, 30, 32, 35, 37, 40, 42, 45, 48, 51, 54, 57, 60, 63, 66, 70, 74, 77, 81]
    };

    // Moduli complessivi disponibili ai dati, tolti i motivi fissi.
    // La formula sostituisce la tabella versione per versione dello standard.
    function moduliDatiGrezzi(versione) {
        let risultato = (16 * versione + 128) * versione + 64;
        if (versione >= 2) {
            const numAllineamenti = Math.floor(versione / 7) + 2;
            risultato -= (25 * numAllineamenti - 10) * numAllineamenti - 55;
            if (versione >= 7) risultato -= 36; // due blocchi di informazione versione
        }
        return risultato;
    }

    function codewordDati(versione, livello) {
        return Math.floor(moduliDatiGrezzi(versione) / 8)
            - EC_PER_BLOCCO[livello][versione] * NUM_BLOCCHI[livello][versione];
    }

    // Centri dei motivi di allineamento: 6, poi passo costante fino a lato-7
    function posizioniAllineamento(versione) {
        if (versione === 1) return [];
        const quanti = Math.floor(versione / 7) + 2;
        const lato = versione * 4 + 17;
        const passo = (versione === 32) ? 26 : Math.ceil((lato - 13) / (quanti * 2 - 2)) * 2;
        const posizioni = [6];
        for (let p = lato - 7; posizioni.length < quanti; p -= passo) posizioni.unshift(p);
        return posizioni;
    }

    // ==========================================================
    // CAMPO DI GALOIS GF(256) — aritmetica della correzione d'errore
    // Polinomio primitivo 0x11D, come prescritto dallo standard
    // ==========================================================
    const ESPONENTI = new Uint8Array(512);
    const LOGARITMI = new Uint8Array(256);

    (function costruisciTabelleGalois() {
        let valore = 1;
        for (let i = 0; i < 255; i++) {
            ESPONENTI[i] = valore;
            LOGARITMI[valore] = i;
            valore <<= 1;
            if (valore & 0x100) valore ^= 0x11D;
        }
        for (let i = 255; i < 512; i++) ESPONENTI[i] = ESPONENTI[i - 255];
    })();

    function moltiplica(a, b) {
        if (a === 0 || b === 0) return 0;
        return ESPONENTI[LOGARITMI[a] + LOGARITMI[b]];
    }

    // Polinomio generatore di grado "quanti", prodotto di (x - α^i)
    function polinomioGeneratore(quanti) {
        let poli = [1];
        for (let i = 0; i < quanti; i++) {
            const nuovo = new Array(poli.length + 1).fill(0);
            for (let j = 0; j < poli.length; j++) {
                nuovo[j] ^= moltiplica(poli[j], 1);
                nuovo[j + 1] ^= moltiplica(poli[j], ESPONENTI[i]);
            }
            poli = nuovo;
        }
        return poli;
    }

    // Resto della divisione polinomiale: sono i codeword di correzione
    function codewordCorrezione(dati, quanti) {
        const generatore = polinomioGeneratore(quanti);
        const resto = new Array(quanti).fill(0);

        for (const byte of dati) {
            const fattore = byte ^ resto[0];
            resto.shift();
            resto.push(0);
            for (let i = 0; i < quanti; i++) {
                resto[i] ^= moltiplica(generatore[i + 1], fattore);
            }
        }
        return resto;
    }

    // ==========================================================
    // CODIFICA DEI DATI (modalità byte, UTF-8)
    // ==========================================================
    function bytesUtf8(testo) {
        if (typeof TextEncoder !== "undefined") return Array.from(new TextEncoder().encode(testo));
        // Ripiego per ambienti senza TextEncoder
        return Array.from(unescape(encodeURIComponent(testo)), c => c.charCodeAt(0));
    }

    // Il campo "lunghezza" occupa un numero di bit che dipende dalla versione:
    // le versioni grandi devono poter dichiarare messaggi più lunghi
    function bitLunghezza(versione) {
        return versione <= 9 ? 8 : 16;
    }

    function versioneMinima(numeroByte, livello) {
        for (let versione = 1; versione <= 40; versione++) {
            const capacitaBit = codewordDati(versione, livello) * 8;
            const richiestiBit = 4 + bitLunghezza(versione) + numeroByte * 8;
            if (richiestiBit <= capacitaBit) return versione;
        }
        return null;
    }

    function costruisciCodewordDati(byte, versione, livello) {
        const bit = [];
        const aggiungi = (valore, quantiBit) => {
            for (let i = quantiBit - 1; i >= 0; i--) bit.push((valore >>> i) & 1);
        };

        aggiungi(0b0100, 4);                        // indicatore modalità byte
        aggiungi(byte.length, bitLunghezza(versione));
        byte.forEach(b => aggiungi(b, 8));

        const capacitaBit = codewordDati(versione, livello) * 8;

        // Terminatore: fino a 4 bit a zero, ma non oltre la capacità
        for (let i = 0; i < 4 && bit.length < capacitaBit; i++) bit.push(0);
        // Allineamento al byte
        while (bit.length % 8 !== 0) bit.push(0);

        const codeword = [];
        for (let i = 0; i < bit.length; i += 8) {
            let valore = 0;
            for (let j = 0; j < 8; j++) valore = (valore << 1) | bit[i + j];
            codeword.push(valore);
        }

        // Riempimento fino a capacità con la coppia alternata prevista dallo standard
        const riempimenti = [0xEC, 0x11];
        for (let i = 0; codeword.length < capacitaBit / 8; i++) {
            codeword.push(riempimenti[i % 2]);
        }

        return codeword;
    }

    // Suddivide i dati in blocchi, calcola la correzione di ciascuno e li
    // intreccia: così un graffio che distrugge una zona contigua del codice
    // danneggia pochi byte per blocco anziché azzerarne uno intero
    function intrecciaBlocchi(codeword, versione, livello) {
        const quantiBlocchi = NUM_BLOCCHI[livello][versione];
        const ecPerBlocco = EC_PER_BLOCCO[livello][versione];
        const totaleCodeword = Math.floor(moduliDatiGrezzi(versione) / 8);
        const blocchiCorti = quantiBlocchi - (totaleCodeword % quantiBlocchi);
        const lunghezzaCorta = Math.floor(totaleCodeword / quantiBlocchi) - ecPerBlocco;

        const blocchiDati = [];
        const blocchiEc = [];
        let posizione = 0;

        for (let i = 0; i < quantiBlocchi; i++) {
            const lunghezza = lunghezzaCorta + (i < blocchiCorti ? 0 : 1);
            const dati = codeword.slice(posizione, posizione + lunghezza);
            posizione += lunghezza;
            blocchiDati.push(dati);
            blocchiEc.push(codewordCorrezione(dati, ecPerBlocco));
        }

        const risultato = [];
        const lunghezzaMassima = lunghezzaCorta + 1;
        for (let i = 0; i < lunghezzaMassima; i++) {
            for (const blocco of blocchiDati) {
                if (i < blocco.length) risultato.push(blocco[i]);
            }
        }
        for (let i = 0; i < ecPerBlocco; i++) {
            for (const blocco of blocchiEc) risultato.push(blocco[i]);
        }

        return risultato;
    }

    // ==========================================================
    // DISEGNO DELLA MATRICE
    // ==========================================================
    function nuovaMatrice(lato, valore) {
        const m = [];
        for (let r = 0; r < lato; r++) m.push(new Array(lato).fill(valore));
        return m;
    }

    function disegnaMotiviFissi(moduli, riservati, versione) {
        const lato = moduli.length;

        // Tre occhi di ricerca agli angoli, con la loro cornice chiara
        [[0, 0], [lato - 7, 0], [0, lato - 7]].forEach(([x, y]) => {
            for (let dy = -1; dy <= 7; dy++) {
                for (let dx = -1; dx <= 7; dx++) {
                    const r = y + dy, c = x + dx;
                    if (r < 0 || r >= lato || c < 0 || c >= lato) continue;
                    const distanza = Math.max(Math.abs(dx - 3), Math.abs(dy - 3));
                    moduli[r][c] = (distanza !== 2 && distanza <= 3);
                    riservati[r][c] = true;
                }
            }
        });

        // Motivi di allineamento, saltando quelli che finirebbero sugli occhi
        const posizioni = posizioniAllineamento(versione);
        posizioni.forEach(cy => {
            posizioni.forEach(cx => {
                const suUnOcchio =
                    (cx === 6 && cy === 6) ||
                    (cx === 6 && cy === lato - 7) ||
                    (cx === lato - 7 && cy === 6);
                if (suUnOcchio) return;

                for (let dy = -2; dy <= 2; dy++) {
                    for (let dx = -2; dx <= 2; dx++) {
                        moduli[cy + dy][cx + dx] = Math.max(Math.abs(dx), Math.abs(dy)) !== 1;
                        riservati[cy + dy][cx + dx] = true;
                    }
                }
            });
        });

        // Righe di sincronismo: moduli alternati fra un occhio e l'altro
        for (let i = 8; i < lato - 8; i++) {
            const scuro = (i % 2 === 0);
            moduli[6][i] = scuro; riservati[6][i] = true;
            moduli[i][6] = scuro; riservati[i][6] = true;
        }

        // Modulo sempre scuro previsto dallo standard
        moduli[lato - 8][8] = true;
        riservati[lato - 8][8] = true;

        // Aree riservate all'informazione di formato
        for (let i = 0; i < 9; i++) {
            riservati[8][i] = true;
            riservati[i][8] = true;
        }
        for (let i = 0; i < 8; i++) {
            riservati[8][lato - 1 - i] = true;
            riservati[lato - 1 - i][8] = true;
        }

        // Dalla versione 7 in poi due blocchi dichiarano la versione
        if (versione >= 7) {
            for (let i = 0; i < 18; i++) {
                const r = Math.floor(i / 3);
                const c = lato - 11 + (i % 3);
                riservati[r][c] = true;
                riservati[c][r] = true;
            }
        }
    }

    // Percorso a zigzag: colonne a due a due da destra a sinistra, saltando
    // la colonna 6 che è occupata dal sincronismo verticale
    function disponiDati(moduli, riservati, codeword) {
        const lato = moduli.length;
        let indiceBit = 0;
        const totaleBit = codeword.length * 8;
        let versoAlto = true;

        for (let destra = lato - 1; destra >= 1; destra -= 2) {
            if (destra === 6) destra = 5;

            for (let passo = 0; passo < lato; passo++) {
                const r = versoAlto ? lato - 1 - passo : passo;
                for (let k = 0; k < 2; k++) {
                    const c = destra - k;
                    if (riservati[r][c]) continue;
                    if (indiceBit < totaleBit) {
                        const byte = codeword[indiceBit >>> 3];
                        moduli[r][c] = ((byte >>> (7 - (indiceBit & 7))) & 1) === 1;
                        indiceBit++;
                    } else {
                        moduli[r][c] = false; // bit di riempimento, restano chiari
                    }
                }
            }
            versoAlto = !versoAlto;
        }
    }

    function applicaMaschera(moduli, riservati, maschera) {
        const lato = moduli.length;
        for (let r = 0; r < lato; r++) {
            for (let c = 0; c < lato; c++) {
                if (riservati[r][c]) continue;
                let inverti;
                switch (maschera) {
                    case 0: inverti = (r + c) % 2 === 0; break;
                    case 1: inverti = r % 2 === 0; break;
                    case 2: inverti = c % 3 === 0; break;
                    case 3: inverti = (r + c) % 3 === 0; break;
                    case 4: inverti = (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0; break;
                    case 5: inverti = ((r * c) % 2 + (r * c) % 3) === 0; break;
                    case 6: inverti = (((r * c) % 2 + (r * c) % 3) % 2) === 0; break;
                    case 7: inverti = (((r + c) % 2 + (r * c) % 3) % 2) === 0; break;
                }
                if (inverti) moduli[r][c] = !moduli[r][c];
            }
        }
    }

    // BCH(15,5): protegge livello di correzione e maschera, che il lettore
    // deve poter leggere prima di sapere qualsiasi altra cosa del codice
    function bitFormato(livello, maschera) {
        const dati = (BIT_FORMATO_LIVELLO[livello] << 3) | maschera;
        let resto = dati;
        for (let i = 0; i < 10; i++) {
            resto = (resto << 1) ^ ((resto >>> 9) * 0x537);
        }
        return ((dati << 10) | resto) ^ 0x5412;
    }

    function scriviFormato(moduli, livello, maschera) {
        const lato = moduli.length;
        const bit = bitFormato(livello, maschera);
        const leggi = i => ((bit >>> i) & 1) === 1;

        // Copia attorno all'occhio in alto a sinistra: scende lungo la
        // colonna 8 e prosegue lungo la riga 8, saltando le celle occupate
        // dai motivi di sincronismo (riga 6 e colonna 6)
        for (let i = 0; i <= 5; i++) moduli[i][8] = leggi(i);
        moduli[7][8] = leggi(6);
        moduli[8][8] = leggi(7);
        moduli[8][7] = leggi(8);
        for (let i = 9; i < 15; i++) moduli[8][14 - i] = leggi(i);

        // Copia ridondante: riga 8 a destra e colonna 8 in basso, così il
        // formato resta leggibile anche se un angolo del codice è rovinato
        for (let i = 0; i < 8; i++) moduli[8][lato - 1 - i] = leggi(i);
        for (let i = 8; i < 15; i++) moduli[lato - 15 + i][8] = leggi(i);

        moduli[lato - 8][8] = true; // modulo sempre scuro
    }

    // BCH(18,6) per l'informazione di versione, presente dalla 7 in su
    function scriviVersione(moduli, versione) {
        if (versione < 7) return;
        const lato = moduli.length;

        let resto = versione;
        for (let i = 0; i < 12; i++) {
            resto = (resto << 1) ^ ((resto >>> 11) * 0x1F25);
        }
        const bit = (versione << 12) | resto;

        for (let i = 0; i < 18; i++) {
            const acceso = ((bit >>> i) & 1) === 1;
            const r = Math.floor(i / 3);
            const c = lato - 11 + (i % 3);
            moduli[r][c] = acceso;
            moduli[c][r] = acceso;
        }
    }

    // ==========================================================
    // SCELTA DELLA MASCHERA
    //
    // Le otto maschere producono lo stesso contenuto ma disegni diversi.
    // Lo standard impone di sceglierne una secondo quattro penalità, che
    // puniscono i motivi difficili da leggere: strisce lunghe, blocchi
    // pieni, sequenze che somigliano a un occhio di ricerca e squilibrio
    // fra chiaro e scuro.
    // ==========================================================
    function penalita(moduli) {
        const lato = moduli.length;
        let punti = 0;

        // Regola 1: serie di 5 o più moduli uguali in fila
        for (let r = 0; r < lato; r++) {
            for (let orientamento = 0; orientamento < 2; orientamento++) {
                let precedente = null, quanti = 0;
                for (let c = 0; c < lato; c++) {
                    const valore = orientamento === 0 ? moduli[r][c] : moduli[c][r];
                    if (valore === precedente) {
                        quanti++;
                        if (quanti === 5) punti += 3;
                        else if (quanti > 5) punti += 1;
                    } else {
                        precedente = valore;
                        quanti = 1;
                    }
                }
            }
        }

        // Regola 2: blocchi 2x2 dello stesso colore
        for (let r = 0; r < lato - 1; r++) {
            for (let c = 0; c < lato - 1; c++) {
                const v = moduli[r][c];
                if (v === moduli[r][c + 1] && v === moduli[r + 1][c] && v === moduli[r + 1][c + 1]) {
                    punti += 3;
                }
            }
        }

        // Regola 3: sequenze che imitano l'occhio di ricerca (1:1:3:1:1)
        const motivoA = [true, false, true, true, true, false, true, false, false, false, false];
        const motivoB = [false, false, false, false, true, false, true, true, true, false, true];
        const combacia = (leggi, inizio, motivo) => {
            for (let i = 0; i < motivo.length; i++) {
                if (leggi(inizio + i) !== motivo[i]) return false;
            }
            return true;
        };
        for (let r = 0; r < lato; r++) {
            for (let orientamento = 0; orientamento < 2; orientamento++) {
                const leggi = i => orientamento === 0 ? moduli[r][i] : moduli[i][r];
                for (let c = 0; c + 11 <= lato; c++) {
                    if (combacia(leggi, c, motivoA) || combacia(leggi, c, motivoB)) punti += 40;
                }
            }
        }

        // Regola 4: sbilanciamento fra moduli scuri e chiari
        let scuri = 0;
        for (let r = 0; r < lato; r++) {
            for (let c = 0; c < lato; c++) if (moduli[r][c]) scuri++;
        }
        const percentuale = (scuri * 100) / (lato * lato);
        const scarto = Math.floor(Math.abs(percentuale - 50) / 5);
        punti += scarto * 10;

        return punti;
    }

    // ==========================================================
    // FUNZIONE PRINCIPALE
    // ==========================================================
    function genera(testo, livello) {
        livello = (livello || "M").toUpperCase();
        if (!(livello in LIVELLI)) throw new Error("Livello di correzione non valido: " + livello);

        const testoNormalizzato = String(testo === null || testo === undefined ? "" : testo);
        if (!testoNormalizzato) throw new Error("Nessun testo da codificare.");

        const byte = bytesUtf8(testoNormalizzato);
        const versione = versioneMinima(byte.length, livello);
        if (!versione) {
            throw new Error(`Testo troppo lungo per un codice QR (${byte.length} byte con correzione ${livello}).`);
        }

        const codeword = intrecciaBlocchi(costruisciCodewordDati(byte, versione, livello), versione, livello);
        const lato = versione * 4 + 17;

        // Le otto maschere vengono provate davvero, non stimate: si disegna
        // il codice completo per ciascuna e si tiene quella con penalità minore
        let migliore = null;
        for (let maschera = 0; maschera < 8; maschera++) {
            const moduli = nuovaMatrice(lato, false);
            const riservati = nuovaMatrice(lato, false);

            disegnaMotiviFissi(moduli, riservati, versione);
            disponiDati(moduli, riservati, codeword);
            applicaMaschera(moduli, riservati, maschera);
            scriviFormato(moduli, livello, maschera);
            scriviVersione(moduli, versione);

            const punti = penalita(moduli);
            if (!migliore || punti < migliore.punti) migliore = { moduli, punti, maschera };
        }

        return {
            dimensione: lato,
            moduli: migliore.moduli,
            versione,
            livello,
            maschera: migliore.maschera,
            byte: byte.length
        };
    }

    // Quanti byte entrano al massimo in un codice, per livello di correzione:
    // serve all'interfaccia per avvisare prima che l'utente prema il pulsante
    function capacitaMassima(livello) {
        return codewordDati(40, (livello || "M").toUpperCase()) - 3;
    }

    return { genera, capacitaMassima, LIVELLI };
})();