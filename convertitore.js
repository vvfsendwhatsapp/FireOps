// ==========================================================
// FireOps VVF — CONVERTITORE COORDINATE
// File indipendente: da includere in index.html DOPO <script src="script.js">
//     <script src="convertitore.js"></script>
// ==========================================================
document.addEventListener("DOMContentLoaded", () => {

    // ==========================================================
    // OPEN LOCATION CODE (Plus Codes) — porting fedele dall'algoritmo
    // ufficiale Google (openlocationcode, Apache 2.0), verificato contro
    // la libreria Python di riferimento (Zurigo, Sydney, Milano, Oxford).
    // ==========================================================
    const OLC_SEPARATOR = "+";
    const OLC_SEPARATOR_POSITION = 8;
    const OLC_PADDING_CHAR = "0";
    const OLC_CODE_ALPHABET = "23456789CFGHJMPQRVWX";
    const OLC_ENCODING_BASE = OLC_CODE_ALPHABET.length;
    const OLC_LATITUDE_MAX = 90;
    const OLC_LONGITUDE_MAX = 180;
    const OLC_MAX_DIGIT_COUNT = 15;
    const OLC_PAIR_CODE_LENGTH = 10;
    const OLC_PAIR_FIRST_PLACE_VALUE = Math.pow(OLC_ENCODING_BASE, OLC_PAIR_CODE_LENGTH / 2 - 1);
    const OLC_PAIR_PRECISION = Math.pow(OLC_ENCODING_BASE, 3);
    const OLC_GRID_CODE_LENGTH = OLC_MAX_DIGIT_COUNT - OLC_PAIR_CODE_LENGTH;
    const OLC_GRID_COLUMNS = 4;
    const OLC_GRID_ROWS = 5;
    const OLC_GRID_LAT_FIRST_PLACE_VALUE = Math.pow(OLC_GRID_ROWS, OLC_GRID_CODE_LENGTH - 1);
    const OLC_GRID_LNG_FIRST_PLACE_VALUE = Math.pow(OLC_GRID_COLUMNS, OLC_GRID_CODE_LENGTH - 1);
    const OLC_FINAL_LAT_PRECISION = OLC_PAIR_PRECISION * Math.pow(OLC_GRID_ROWS, OLC_MAX_DIGIT_COUNT - OLC_PAIR_CODE_LENGTH);
    const OLC_FINAL_LNG_PRECISION = OLC_PAIR_PRECISION * Math.pow(OLC_GRID_COLUMNS, OLC_MAX_DIGIT_COUNT - OLC_PAIR_CODE_LENGTH);

    function olcClipLatitude(lat) { return Math.min(90, Math.max(-90, lat)); }
    function olcNormalizeLongitude(lng) {
        while (lng < -180) lng += 360;
        while (lng >= 180) lng -= 360;
        return lng;
    }
    function olcComputeLatitudePrecision(codeLength) {
        if (codeLength <= 10) return Math.pow(20, Math.floor(codeLength / -2 + 2));
        return Math.pow(20, -3) / Math.pow(OLC_GRID_ROWS, codeLength - 10);
    }
    function intDiv(a, b) { return Math.floor(a / b); }

    function olcEncode(latitude, longitude, codeLength) {
        codeLength = codeLength || OLC_PAIR_CODE_LENGTH;
        if (codeLength < 2 || (codeLength < OLC_PAIR_CODE_LENGTH && codeLength % 2 === 1)) {
            throw new Error("Lunghezza OLC non valida: " + codeLength);
        }
        codeLength = Math.min(codeLength, OLC_MAX_DIGIT_COUNT);

        latitude = olcClipLatitude(latitude);
        longitude = olcNormalizeLongitude(longitude);
        if (latitude === 90) latitude -= olcComputeLatitudePrecision(codeLength);

        let code = "";
        let latVal = Math.trunc(Math.round((latitude + OLC_LATITUDE_MAX) * OLC_FINAL_LAT_PRECISION * 1e6) / 1e6);
        let lngVal = Math.trunc(Math.round((longitude + OLC_LONGITUDE_MAX) * OLC_FINAL_LNG_PRECISION * 1e6) / 1e6);

        if (codeLength > OLC_PAIR_CODE_LENGTH) {
            for (let i = 0; i < OLC_MAX_DIGIT_COUNT - OLC_PAIR_CODE_LENGTH; i++) {
                const latDigit = latVal % OLC_GRID_ROWS;
                const lngDigit = lngVal % OLC_GRID_COLUMNS;
                code = OLC_CODE_ALPHABET[latDigit * OLC_GRID_COLUMNS + lngDigit] + code;
                latVal = intDiv(latVal, OLC_GRID_ROWS);
                lngVal = intDiv(lngVal, OLC_GRID_COLUMNS);
            }
        } else {
            latVal = intDiv(latVal, Math.pow(OLC_GRID_ROWS, OLC_GRID_CODE_LENGTH));
            lngVal = intDiv(lngVal, Math.pow(OLC_GRID_COLUMNS, OLC_GRID_CODE_LENGTH));
        }

        for (let i = 0; i < OLC_PAIR_CODE_LENGTH / 2; i++) {
            code = OLC_CODE_ALPHABET[lngVal % OLC_ENCODING_BASE] + code;
            code = OLC_CODE_ALPHABET[latVal % OLC_ENCODING_BASE] + code;
            latVal = intDiv(latVal, OLC_ENCODING_BASE);
            lngVal = intDiv(lngVal, OLC_ENCODING_BASE);
        }

        code = code.slice(0, OLC_SEPARATOR_POSITION) + OLC_SEPARATOR + code.slice(OLC_SEPARATOR_POSITION);
        if (codeLength >= OLC_SEPARATOR_POSITION) return code.slice(0, codeLength + 1);
        return code.slice(0, codeLength) + OLC_PADDING_CHAR.repeat(OLC_SEPARATOR_POSITION - codeLength) + OLC_SEPARATOR;
    }

    function olcIsValid(code) {
        const sep = code.indexOf(OLC_SEPARATOR);
        if ((code.match(/\+/g) || []).length > 1) return false;
        if (code.length === 1) return false;
        if (sep === -1 || sep > OLC_SEPARATOR_POSITION || sep % 2 === 1) return false;

        const pad = code.indexOf(OLC_PADDING_CHAR);
        if (pad !== -1) {
            if (sep < OLC_SEPARATOR_POSITION) return false;
            if (pad === 0) return false;
            const rpad = code.lastIndexOf(OLC_PADDING_CHAR) + 1;
            const pads = code.slice(pad, rpad);
            if (pads.length % 2 === 1 || [...pads].some(c => c !== OLC_PADDING_CHAR)) return false;
            if (!code.endsWith(OLC_SEPARATOR)) return false;
        }
        if (code.length - sep - 1 === 1) return false;

        const sepPad = OLC_SEPARATOR + OLC_PADDING_CHAR;
        for (const ch of code) {
            if (OLC_CODE_ALPHABET.indexOf(ch.toUpperCase()) === -1 && sepPad.indexOf(ch) === -1) return false;
        }
        return true;
    }
    function olcIsShort(code) {
        if (!olcIsValid(code)) return false;
        const sep = code.indexOf(OLC_SEPARATOR);
        return sep >= 0 && sep < OLC_SEPARATOR_POSITION;
    }
    function olcIsFull(code) {
        if (!olcIsValid(code)) return false;
        if (olcIsShort(code)) return false;
        const firstLatValue = OLC_CODE_ALPHABET.indexOf(code[0].toUpperCase()) * OLC_ENCODING_BASE;
        if (firstLatValue >= OLC_LATITUDE_MAX * 2) return false;
        if (code.length > 1) {
            const firstLngValue = OLC_CODE_ALPHABET.indexOf(code[1].toUpperCase()) * OLC_ENCODING_BASE;
            if (firstLngValue >= OLC_LONGITUDE_MAX * 2) return false;
        }
        return true;
    }

    function olcDecode(code) {
        if (!olcIsFull(code)) throw new Error("Codice OLC non valido o non completo: " + code);
        code = code.replace(/[+0]/g, "").toUpperCase().slice(0, OLC_MAX_DIGIT_COUNT);

        let normalLat = -OLC_LATITUDE_MAX * OLC_PAIR_PRECISION;
        let normalLng = -OLC_LONGITUDE_MAX * OLC_PAIR_PRECISION;
        let gridLat = 0, gridLng = 0;

        const digits = Math.min(code.length, OLC_PAIR_CODE_LENGTH);
        let pv = OLC_PAIR_FIRST_PLACE_VALUE;
        for (let i = 0; i < digits; i += 2) {
            normalLat += OLC_CODE_ALPHABET.indexOf(code[i]) * pv;
            normalLng += OLC_CODE_ALPHABET.indexOf(code[i + 1]) * pv;
            if (i < digits - 2) pv = intDiv(pv, OLC_ENCODING_BASE);
        }

        let latPrecision = pv / OLC_PAIR_PRECISION;
        let lngPrecision = pv / OLC_PAIR_PRECISION;

        if (code.length > OLC_PAIR_CODE_LENGTH) {
            let rowpv = OLC_GRID_LAT_FIRST_PLACE_VALUE;
            let colpv = OLC_GRID_LNG_FIRST_PLACE_VALUE;
            const digits2 = Math.min(code.length, OLC_MAX_DIGIT_COUNT);
            for (let i = OLC_PAIR_CODE_LENGTH; i < digits2; i++) {
                const digitVal = OLC_CODE_ALPHABET.indexOf(code[i]);
                const row = Math.floor(digitVal / OLC_GRID_COLUMNS);
                const col = digitVal % OLC_GRID_COLUMNS;
                gridLat += row * rowpv;
                gridLng += col * colpv;
                if (i < digits2 - 1) {
                    rowpv = intDiv(rowpv, OLC_GRID_ROWS);
                    colpv = intDiv(colpv, OLC_GRID_COLUMNS);
                }
            }
            latPrecision = rowpv / OLC_FINAL_LAT_PRECISION;
            lngPrecision = colpv / OLC_FINAL_LNG_PRECISION;
        }

        const lat = normalLat / OLC_PAIR_PRECISION + gridLat / OLC_FINAL_LAT_PRECISION;
        const lng = normalLng / OLC_PAIR_PRECISION + gridLng / OLC_FINAL_LNG_PRECISION;
        const round14 = x => Math.round(x * 1e14) / 1e14;
        const latLo = round14(lat), lngLo = round14(lng);
        const latHi = round14(lat + latPrecision), lngHi = round14(lng + lngPrecision);

        return {
            latitudeCenter: Math.min(latLo + (latHi - latLo) / 2, OLC_LATITUDE_MAX),
            longitudeCenter: Math.min(lngLo + (lngHi - lngLo) / 2, OLC_LONGITUDE_MAX),
        };
    }

    // ==========================================================
    // UTM (WGS84) — formule standard di Snyder, verificate contro la
    // libreria Python "utm" (Milano, Oxford, Sydney: scarto submillimetrico).
    // ==========================================================
    const UTM_A = 6378137.0;
    const UTM_F = 1 / 298.257223563;
    const UTM_E2 = UTM_F * (2 - UTM_F);
    const UTM_K0 = 0.9996;
    const DEG2RAD = Math.PI / 180;
    const RAD2DEG = 180 / Math.PI;

    function utmZoneLetterFromLat(lat) {
        const lettere = "CDEFGHJKLMNPQRSTUVWX";
        if (lat < -80 || lat > 84) return null;
        const idx = Math.floor((lat + 80) / 8);
        return lettere[Math.min(idx, lettere.length - 1)];
    }

    function latLonToUtm(lat, lon) {
        const zone = Math.floor((lon + 180) / 6) + 1;
        const lon0 = ((zone - 1) * 6 - 180 + 3) * DEG2RAD;
        const latRad = lat * DEG2RAD, lonRad = lon * DEG2RAD;

        const ep2 = UTM_E2 / (1 - UTM_E2);
        const N = UTM_A / Math.sqrt(1 - UTM_E2 * Math.sin(latRad) ** 2);
        const T = Math.tan(latRad) ** 2;
        const C = ep2 * Math.cos(latRad) ** 2;
        const A = Math.cos(latRad) * (lonRad - lon0);

        const M = UTM_A * (
            (1 - UTM_E2 / 4 - 3 * UTM_E2 ** 2 / 64 - 5 * UTM_E2 ** 3 / 256) * latRad
            - (3 * UTM_E2 / 8 + 3 * UTM_E2 ** 2 / 32 + 45 * UTM_E2 ** 3 / 1024) * Math.sin(2 * latRad)
            + (15 * UTM_E2 ** 2 / 256 + 45 * UTM_E2 ** 3 / 1024) * Math.sin(4 * latRad)
            - (35 * UTM_E2 ** 3 / 3072) * Math.sin(6 * latRad)
        );

        let easting = UTM_K0 * N * (
            A + (1 - T + C) * A ** 3 / 6
            + (5 - 18 * T + T ** 2 + 72 * C - 58 * ep2) * A ** 5 / 120
        ) + 500000;

        let northing = UTM_K0 * (
            M + N * Math.tan(latRad) * (
                A ** 2 / 2
                + (5 - T + 9 * C + 4 * C ** 2) * A ** 4 / 24
                + (61 - 58 * T + T ** 2 + 600 * C - 330 * ep2) * A ** 6 / 720
            )
        );
        if (lat < 0) northing += 10000000;

        return { zona: zone, lettera: utmZoneLetterFromLat(lat), emisfero: lat < 0 ? "S" : "N", est: easting, nord: northing };
    }

    function utmToLatLon(zone, emisfero, easting, northing) {
        const e1 = (1 - Math.sqrt(1 - UTM_E2)) / (1 + Math.sqrt(1 - UTM_E2));
        const x = easting - 500000;
        let y = northing;
        if (emisfero === "S") y -= 10000000;

        const M = y / UTM_K0;
        const mu = M / (UTM_A * (1 - UTM_E2 / 4 - 3 * UTM_E2 ** 2 / 64 - 5 * UTM_E2 ** 3 / 256));

        const phi1 = mu
            + (3 * e1 / 2 - 27 * e1 ** 3 / 32) * Math.sin(2 * mu)
            + (21 * e1 ** 2 / 16 - 55 * e1 ** 4 / 32) * Math.sin(4 * mu)
            + (151 * e1 ** 3 / 96) * Math.sin(6 * mu)
            + (1097 * e1 ** 4 / 512) * Math.sin(8 * mu);

        const ep2 = UTM_E2 / (1 - UTM_E2);
        const C1 = ep2 * Math.cos(phi1) ** 2;
        const T1 = Math.tan(phi1) ** 2;
        const N1 = UTM_A / Math.sqrt(1 - UTM_E2 * Math.sin(phi1) ** 2);
        const R1 = UTM_A * (1 - UTM_E2) / Math.pow(1 - UTM_E2 * Math.sin(phi1) ** 2, 1.5);
        const D = x / (N1 * UTM_K0);

        const lat = phi1 - (N1 * Math.tan(phi1) / R1) * (
            D ** 2 / 2
            - (5 + 3 * T1 + 10 * C1 - 4 * C1 ** 2 - 9 * ep2) * D ** 4 / 24
            + (61 + 90 * T1 + 298 * C1 + 45 * T1 ** 2 - 252 * ep2 - 3 * C1 ** 2) * D ** 6 / 720
        );

        const lon0 = ((zone - 1) * 6 - 180 + 3) * DEG2RAD;
        const lon = lon0 + (
            D - (1 + 2 * T1 + C1) * D ** 3 / 6
            + (5 - 2 * C1 + 28 * T1 - 3 * C1 ** 2 + 8 * ep2 + 24 * T1 ** 2) * D ** 5 / 120
        ) / Math.cos(phi1);

        return { lat: lat * RAD2DEG, lon: lon * RAD2DEG };
    }

    // ==========================================================
    // PARSING CAMPI DI INGRESSO (DD, DMM, DMS)
    // ==========================================================
    function estraiSegnoEPulisci(testo) {
        testo = testo.trim().toUpperCase();
        let segno = 1;
        if (/[SW]\s*$/.test(testo)) segno = -1;
        if (/^-/.test(testo.replace(/[NSEW\s]/g, ""))) segno = -1;
        testo = testo.replace(/[NSEW]/g, "").replace(/-/g, "").trim();
        return { testo, segno };
    }

    function parseDDField(testoInput) {
        const { testo, segno } = estraiSegnoEPulisci(testoInput);
        const numero = parseFloat(testo.replace(",", "."));
        if (Number.isNaN(numero)) return null;
        return numero * segno;
    }

    // I formati DMM e DMS ora arrivano da campi separati: niente stringa da
    // interpretare, solo numeri da comporre. Un valore vuoto o fuori scala
    // (primi/secondi >= 60) restituisce null, così l'errore è esplicito.
    function numeroDaCampo(testo) {
        const pulito = String(testo === null || testo === undefined ? "" : testo).trim().replace(",", ".");
        if (!pulito) return null;
        const numero = parseFloat(pulito);
        return Number.isNaN(numero) ? null : numero;
    }

    // Il segno arriva da un menu a due voci, non dalla digitazione: nel campo
    // possono comparire solo cifre, e la scelta resta leggibile a colpo d'occhio
    function segnoDaSelettore(idSelettore) {
        const selettore = document.getElementById(idSelettore);
        return (selettore && selettore.value === "-") ? -1 : 1;
    }

    function componiDMM(testoGradi, testoPrimi) {
        const gradi = numeroDaCampo(testoGradi);
        const primi = numeroDaCampo(testoPrimi);
        if (gradi === null || primi === null) return null;
        if (primi < 0 || primi >= 60) return null;
        return Math.abs(gradi) + primi / 60;
    }

    function componiDMS(testoGradi, testoPrimi, testoSecondi) {
        const gradi = numeroDaCampo(testoGradi);
        const primi = numeroDaCampo(testoPrimi);
        const secondi = numeroDaCampo(testoSecondi);
        if (gradi === null || primi === null || secondi === null) return null;
        if (primi < 0 || primi >= 60 || secondi < 0 || secondi >= 60) return null;
        return Math.abs(gradi) + primi / 60 + secondi / 3600;
    }



    // ==========================================================
    // FORMATTAZIONE OUTPUT (tabella risultati)
    // ==========================================================
    function formattaDD(lat, lon) {
        return `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
    }
    // Formato DD per la TABELLA RISULTATI (uniforme a DMM/DMS: valore + lettera
    // N/S/E/W). NON usare questo per il campo "Appunti" del messaggio squadre:
    // quello resta "lat, lon" decimale semplice, come nel template originale.
    // Larghezza fissa dei gradi: 2 cifre in latitudine (max 90), 3 in
    // longitudine (max 180). Gli zeri iniziali non sono un vezzo grafico:
    // incolonnano i valori e rendono impossibile leggere "9" per "90" o
    // scambiare una longitudine per una latitudine quando si dettano via radio.
    function cifreGradi(lettere) {
        return lettere === "NS" ? 2 : 3;
    }

    // Scomposizione in gradi/primi/secondi fatta su INTERI, non su decimali.
    // Motivo: 5.05° in virgola mobile vale 5.049999...; scomponendo a cascata
    // si ottiene 5° 02' 59.999...", che arrotondato a due decimali diventa
    // "60.00" secondi — una coordinata che non esiste. Arrotondando invece
    // una volta sola alla precisione finale (centesimi di secondo) e dividendo
    // fra interi, il riporto su primi e gradi avviene da sé.
    function scomponiDMM(valore) {
        const decimillesimiDiPrimo = Math.round(Math.abs(valore) * 60 * 10000);
        return {
            gradi: Math.floor(decimillesimiDiPrimo / 600000),
            minuti: (decimillesimiDiPrimo % 600000) / 10000, // 0 - 59.9999
        };
    }

    function scomponiDMS(valore) {
        const centesimiDiSecondo = Math.round(Math.abs(valore) * 3600 * 100);
        return {
            gradi: Math.floor(centesimiDiSecondo / 360000),
            minuti: Math.floor((centesimiDiSecondo % 360000) / 6000), // 0 - 59
            secondi: (centesimiDiSecondo % 6000) / 100,               // 0 - 59.99
        };
    }
    // "9.189982" con 3 cifre di grado -> "009.189982" (3 + punto + 6 decimali)
    function gradiDecimaliRiempiti(valore, lettere) {
        return Math.abs(valore).toFixed(6).padStart(cifreGradi(lettere) + 7, "0");
    }

    function ddSingolo(valore, lettere) {
        const lettera = valore >= 0 ? lettere[0] : lettere[1];
        return `${gradiDecimaliRiempiti(valore, lettere)}° ${lettera}`;
    }
    function formattaDDUscita(lat, lon) {
        return `${ddSingolo(lat, "NS")}, ${ddSingolo(lon, "EW")}`;
    }
    function dmmSingolo(valore, lettere) {
        const lettera = valore >= 0 ? lettere[0] : lettere[1];
        const { gradi, minuti } = scomponiDMM(valore);
        const gradiTesto = String(gradi).padStart(cifreGradi(lettere), "0");
        const minutiTesto = minuti.toFixed(4).padStart(7, "0"); // "7.8522" -> "07.8522"
        return `${gradiTesto}° ${minutiTesto}' ${lettera}`;
    }
    function formattaDMM(lat, lon) {
        return `${dmmSingolo(lat, "NS")}, ${dmmSingolo(lon, "EW")}`;
    }
    function dmsSingolo(valore, lettere) {
        const lettera = valore >= 0 ? lettere[0] : lettere[1];
        const { gradi, minuti, secondi } = scomponiDMS(valore);
        const gradiTesto = String(gradi).padStart(cifreGradi(lettere), "0");
        const minutiTesto = String(minuti).padStart(2, "0");
        const secondiTesto = secondi.toFixed(2).padStart(5, "0"); // "1.10" -> "01.10"
        return `${gradiTesto}° ${minutiTesto}' ${secondiTesto}" ${lettera}`;
    }
    function formattaDMS(lat, lon) {
        return `${dmsSingolo(lat, "NS")}, ${dmsSingolo(lon, "EW")}`;
    }
    function formattaUTMTesto(lat, lon) {
        const u = latLonToUtm(lat, lon);
        return `${u.zona}${u.lettera} ${Math.round(u.est)} ${Math.round(u.nord)}`;
    }
    // Versione per gli appunti: via gradi, primi, secondi e lettere di emisfero,
    // restano solo le cifre con "." e ",". L'emisfero non si perde però: S e W
    // diventano un segno meno davanti, altrimenti si incollerebbe altrove una
    // coordinata che punta nell'emisfero sbagliato senza alcun avviso.
    function testoSoloNumeri(testoVisibile) {
        return testoVisibile.split(",").map(parte => {
            const negativo = /[SW]\s*$/.test(parte.trim());
            const numeri = parte.replace(/[^\d.]/g, " ").trim().replace(/\s+/g, " ");
            return (negativo ? "-" : "") + numeri;
        }).join(", ");
    }

    function formattaSO115Lon(lon) { return lon.toFixed(6).replace(".", ","); }
    function formattaSO115Lat(lat) { return lat.toFixed(6).replace(".", ","); }

    // ==========================================================
    // FORMATTAZIONE PER IL MESSAGGIO ALLE SQUADRE (template Sala Operativa)
    // ==========================================================
    function segnoLettera(valore, lettere) {
        // Il segno nel template è sempre "+": la direzione è già indicata dalla
        // lettera (N/S/E/W), un "-" insieme a "S" o "W" sarebbe ridondante/errato.
        return { segno: "+", lettera: valore >= 0 ? lettere[0] : lettere[1] };
    }
    function formattaDdMessaggio(lat, lon) {
        const sLat = segnoLettera(lat, "NS"), sLon = segnoLettera(lon, "EW");
        const gLat = String(Math.floor(Math.abs(lat))).padStart(2, "0");
        const gLon = String(Math.floor(Math.abs(lon))).padStart(3, "0");
        const decLat = (Math.abs(lat) - Math.floor(Math.abs(lat))).toFixed(6).slice(2);
        const decLon = (Math.abs(lon) - Math.floor(Math.abs(lon))).toFixed(6).slice(2);
        return `Lat ${sLat.lettera} ${sLat.segno}${gLat}.${decLat}° - Lon ${sLon.lettera} ${sLon.segno}${gLon}.${decLon}°`;
    }
    function formattaDMmMessaggio(lat, lon) {
        const sLat = segnoLettera(lat, "NS"), sLon = segnoLettera(lon, "EW");
        function parte(valore, cifreGradi) {
            const scomposto = scomponiDMM(valore);
            return {
                gradi: String(scomposto.gradi).padStart(cifreGradi, "0"),
                minuti: scomposto.minuti.toFixed(4).padStart(7, "0"),
            };
        }
        const pLat = parte(lat, 2), pLon = parte(lon, 3);
        return `Lat ${sLat.lettera} ${sLat.segno}${pLat.gradi}° ${pLat.minuti}' - Lon ${sLon.lettera} ${sLon.segno}${pLon.gradi}° ${pLon.minuti}'`;
    }
    function formattaDMSsMessaggio(lat, lon) {
        const sLat = segnoLettera(lat, "NS"), sLon = segnoLettera(lon, "EW");
        function parte(valore, cifreGradi) {
            const scomposto = scomponiDMS(valore);
            return {
                gradi: String(scomposto.gradi).padStart(cifreGradi, "0"),
                minuti: String(scomposto.minuti).padStart(2, "0"),
                secondi: scomposto.secondi.toFixed(2).padStart(5, "0"),
            };
        }
        const pLat = parte(lat, 2), pLon = parte(lon, 3);
        return `Lat ${sLat.lettera} ${sLat.segno}${pLat.gradi}° ${pLat.minuti}' ${pLat.secondi}" - Lon ${sLon.lettera} ${sLon.segno}${pLon.gradi}° ${pLon.minuti}' ${pLon.secondi}"`;
    }

    // ==========================================================
    // GEOCODING INVERSO (Nominatim + fallback Overpass su sentieri)
    // ==========================================================
    // Restituisce { toponimo, sigla }: la sigla è la targa provinciale
    // estratta da ISO3166-2-lvl6 ("IT-AG" → "AG"), unico aggancio affidabile
    // verso comandi.json. Il campo county non va usato: è il nome esteso e
    // in Italia coincide spesso col capoluogo, che è un'altra cosa.
    async function geocodingInverso(lat, lon) {
        try {
            const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&zoom=16&addressdetails=1&accept-language=it`;
            const risposta = await fetch(url);
            if (risposta.ok) {
                const dati = await risposta.json();
                if (dati && !dati.error) {
                    const a = dati.address || {};
                    const iso = String(a["ISO3166-2-lvl6"] || "");
                    const sigla = /^IT-[A-Z]{2}$/.test(iso) ? iso.slice(3) : "";

                    const nome = a.hamlet || a.village || a.town || a.city || a.suburb || a.locality || a.county;
                    if (nome) {
                        const extra = a.county && a.county !== nome ? ` (${a.county})` : "";
                        return { toponimo: nome + extra, sigla };
                    }
                    if (dati.display_name) {
                        return { toponimo: dati.display_name.split(",").slice(0, 2).join(",").trim(), sigla };
                    }
                }
            }
        } catch (err) {
            console.error("Geocoding inverso (Nominatim) non disponibile:", err);
        }

        try {
            const query = `[out:json][timeout:10];way(around:300,${lat},${lon})[highway~"^(path|track|footway|bridleway)$"];out tags center 5;`;
            const risposta2 = await fetch("https://overpass-api.de/api/interpreter", {
                method: "POST",
                body: "data=" + encodeURIComponent(query),
            });
            if (risposta2.ok) {
                const dati2 = await risposta2.json();
                const elementi = dati2.elements || [];
                const conNome = elementi.find(e => e.tags && e.tags.name);
                if (conNome) return { toponimo: `Vicino al sentiero "${conNome.tags.name}"`, sigla: "" };
                if (elementi.length > 0) return { toponimo: "Vicino a un sentiero/traccia non denominato", sigla: "" };
            }
        } catch (err) {
            console.error("Fallback Overpass non disponibile:", err);
        }

        return { toponimo: "Toponimo non disponibile", sigla: "" };
    }

    // ==========================================================
    // GEOCODING DIRETTO (indirizzo → coordinate)
    // Stesso servizio Nominatim del geocoding inverso, nessuna chiave.
    //
    // La ricerca "strutturata" (street=/city=) di Nominatim è rigidissima:
    // pretende una corrispondenza quasi letterale e sugli indirizzi italiani
    // ("Via Roma 97" con il civico in coda) fallisce spesso o restituisce il
    // centro del comune sbagliato. Qui si usa invece una CASCATA di tentativi
    // in query libera, con verifica che il risultato ricada davvero nel comune
    // richiesto e con l'indicazione esplicita del livello di precisione
    // raggiunto (civico / via / solo comune).
    // ==========================================================
    const PAUSA_TENTATIVI_MS = 1100; // Nominatim: max 1 richiesta al secondo

    function attendi(ms) { return new Promise(r => setTimeout(r, ms)); }

    // Confronto "tollerante": ignora maiuscole, accenti e punteggiatura, così
    // "Forlì" == "forli" e "Sant'Angelo" == "sant angelo"
    function normalizzaConfronto(testo) {
        return (testo || "")
            .toLowerCase()
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9]+/g, " ")
            .trim();
    }

    function comuneDelRisultato(risultato) {
        const a = risultato.address || {};
        return a.city || a.town || a.village || a.municipality || a.hamlet || a.suburb || "";
    }

    // Verifica che il risultato appartenga DAVVERO al comune scelto.
    //
    // ATTENZIONE: qui si confrontano solo i campi di livello comunale
    // (city/town/village/municipality...). NON si deve mai usare il
    // display_name completo né i campi county/state: in Italia moltissime
    // province portano il nome del capoluogo, così "Gambettola, ...,
    // Forlì-Cesena" verrebbe scambiato per un indirizzo di Forlì.
    function comuneCorrisponde(risultato, comune) {
        const atteso = normalizzaConfronto(comune);
        if (!atteso) return false;
        const a = risultato.address || {};
        const candidati = [a.city, a.town, a.village, a.municipality, a.borough, a.city_district, a.suburb, a.hamlet]
            .filter(Boolean).map(normalizzaConfronto);
        if (candidati.includes(atteso)) return true;
        // Il risultato può essere il comune stesso (ricerca del solo comune)
        return normalizzaConfronto(risultato.name) === atteso;
    }

    function dentroBoundingBox(risultato, bbox) {
        if (!bbox) return false;
        const lat = parseFloat(risultato.lat);
        const lon = parseFloat(risultato.lon);
        if (Number.isNaN(lat) || Number.isNaN(lon)) return false;
        return lat >= bbox.sud && lat <= bbox.nord && lon >= bbox.ovest && lon <= bbox.est;
    }

    function precisioneRisultato(risultato) {
        const a = risultato.address || {};
        if (a.house_number) return "civico";
        if (a.road) return "via";
        return "comune";
    }

    // Estrae il numero civico dall'indirizzo digitato ("Via Roma 97" → "97"),
    // sia in coda (uso italiano) sia in testa (uso anglosassone)
    function separaViaECivico(via) {
        const testo = (via || "").trim();
        const inCoda = testo.match(/^(.*?)[\s,]+(\d+[a-zA-Z]?(?:\s*\/\s*[a-zA-Z0-9]+)?)$/);
        if (inCoda) return { strada: inCoda[1].trim(), civico: inCoda[2].replace(/\s+/g, "") };
        const inTesta = testo.match(/^(\d+[a-zA-Z]?)[\s,]+(.*)$/);
        if (inTesta) return { strada: inTesta[2].trim(), civico: inTesta[1] };
        return { strada: testo, civico: "" };
    }

    async function interrogaNominatim(parametriRicerca) {
        const parametri = new URLSearchParams({
            format: "jsonv2",
            limit: "10",
            countrycodes: "it",
            addressdetails: "1",
            "accept-language": "it",
        });
        Object.entries(parametriRicerca).forEach(([k, v]) => { if (v) parametri.set(k, v); });

        const risposta = await fetch(`https://nominatim.openstreetmap.org/search?${parametri.toString()}`);
        if (!risposta.ok) throw new Error("HTTP " + risposta.status);
        const dati = await risposta.json();
        return Array.isArray(dati) ? dati : [];
    }

    // Ricava il perimetro (bounding box) del comune scelto. Serve a CONFINARE
    // la ricerca dell'indirizzo: con viewbox+bounded=1 Nominatim non può più
    // restituire una via omonima di un comune vicino, che è esattamente il
    // modo in cui "Via Roma, Forlì" finiva a Gambettola.
    async function trovaPerimetroComune(comune, sigla) {
        if (!comune) return null;
        let risultati = [];
        try {
            risultati = await interrogaNominatim({ q: [comune, sigla, "Italia"].filter(Boolean).join(", ") });
        } catch (err) {
            console.error("Geocoding: perimetro comune non recuperato:", err);
            return null;
        }

        const scelto = risultati.find(r => comuneCorrisponde(r, comune)) || null;
        if (!scelto || !Array.isArray(scelto.boundingbox)) return null;

        const [sud, nord, ovest, est] = scelto.boundingbox.map(parseFloat);
        if ([sud, nord, ovest, est].some(Number.isNaN)) return null;

        return {
            sud, nord, ovest, est,
            lat: parseFloat(scelto.lat),
            lon: parseFloat(scelto.lon),
            display: scelto.display_name || comune,
        };
    }

    async function geocodificaIndirizzo(via, comune, sigla) {
        if (!via && !comune) return null;

        const { strada, civico } = separaViaECivico(via);
        const codaComune = [comune, sigla, "Italia"].filter(Boolean).join(", ");

        const perimetro = await trovaPerimetroComune(comune, sigla);
        const confine = perimetro
            ? {
                viewbox: `${perimetro.ovest},${perimetro.nord},${perimetro.est},${perimetro.sud}`,
                bounded: "1",
            }
            : {};

        // Ordine dei tentativi: dal più preciso al più generico. Ci si ferma
        // al primo che produce un risultato dentro il comune richiesto.
        const tentativi = [];
        if (via && comune) {
            tentativi.push({ ...confine, q: `${via}, ${codaComune}` });
            if (civico) tentativi.push({ ...confine, q: `${strada} ${civico}, ${codaComune}` });
            tentativi.push({ ...confine, street: civico ? `${civico} ${strada}` : strada, city: comune });
            if (civico) tentativi.push({ ...confine, q: `${strada}, ${codaComune}` });
        } else if (via) {
            tentativi.push({ q: `${via}, Italia` });
        }

        let primoTentativo = !perimetro; // il perimetro ha già consumato una richiesta
        for (const tentativo of tentativi) {
            if (!primoTentativo) await attendi(PAUSA_TENTATIVI_MS);
            primoTentativo = false;

            let risultati = [];
            try {
                risultati = await interrogaNominatim(tentativo);
            } catch (err) {
                console.error("Geocoding: tentativo fallito", tentativo, err);
                continue;
            }

            // Doppia barriera: nome del comune corrispondente OPPURE punto
            // dentro il perimetro comunale (indispensabile per le frazioni,
            // dove Nominatim riporta il nome della frazione e non del comune)
            const validi = risultati.filter(r => comuneCorrisponde(r, comune) || dentroBoundingBox(r, perimetro));
            if (validi.length === 0) continue;

            // Prima chi ha il nome del comune giusto, poi il più preciso
            const ordinePrecisione = { civico: 0, via: 1, comune: 2 };
            validi.sort((a, b) => {
                const nomeA = comuneCorrisponde(a, comune) ? 0 : 1;
                const nomeB = comuneCorrisponde(b, comune) ? 0 : 1;
                if (nomeA !== nomeB) return nomeA - nomeB;
                return ordinePrecisione[precisioneRisultato(a)] - ordinePrecisione[precisioneRisultato(b)];
            });
            const scelto = validi[0];

            return {
                lat: parseFloat(scelto.lat),
                lon: parseFloat(scelto.lon),
                precisione: precisioneRisultato(scelto),
                civicoRichiesto: civico,
                comuneRichiesto: comune,
                comuneTrovato: comuneDelRisultato(scelto),
                comuneVerificato: comuneCorrisponde(scelto, comune),
                indirizzoTrovato: scelto.display_name || "",
                alternative: validi.length - 1,
            };
        }

        // Nessun indirizzo trovato dentro il comune: si ripiega sul centro del
        // comune, che è impreciso ma almeno è nel posto giusto
        if (perimetro) {
            return {
                lat: perimetro.lat,
                lon: perimetro.lon,
                precisione: "comune",
                civicoRichiesto: civico,
                comuneRichiesto: comune,
                comuneTrovato: comune,
                comuneVerificato: true,
                indirizzoTrovato: perimetro.display,
                alternative: 0,
            };
        }

        return null;
    }

    // Legge comune e sigla provinciale dalla combo: il campo nascosto contiene
    // la sola denominazione, mentre il testo visibile è "Forlì (FC)". La sigla
    // è decisiva per disambiguare i comuni omonimi.
    function comuneEProvinciaSelezionati() {
        const nascosto = (document.getElementById("coord-indirizzo-comune")?.value || "").trim();
        const visibile = (document.getElementById("coord-indirizzo-comune-input")?.value || "").trim();
        const conSigla = visibile.match(/\(([A-Za-z]{2})\)\s*$/);
        const comune = nascosto || visibile.replace(/\s*\([^)]*\)\s*$/, "").trim();
        return { comune, sigla: conSigla ? conSigla[1].toUpperCase() : "" };
    }

    // ==========================================================
    // COPIA NEGLI APPUNTI + FEEDBACK VISIVO
    // ==========================================================
    function copiaTestoConFeedback(event, testo) { return FireOps.copiaTesto(event, testo); }
    function mostraFeedbackCopiaCoord(event, testo) { return FireOps.mostraFeedbackCopia(event, testo); }
    function rendiCopiabile(elemento, testo, testoDaCopiare) { return FireOps.rendiCopiabile(elemento, testo, testoDaCopiare); }

    // ==========================================================
    // TURNO VVF + DATA/ORA ROMA — duplicato da script.js perché
    // convertitore.js è indipendente e non condivide il suo stato interno.
    // ==========================================================
    function getComponentiRomaCoord(date) { return FireOps.componentiRoma(date); }
    function calcolaOffsetRomaCoord(data) { return FireOps.offsetOreRoma(data); }
    function calcolaTurnoVVFCoord() { return FireOps.turnoVVF(); }
    function costruisciPieDiPaginaCoord() {
        const adesso = new Date();
        const c = getComponentiRomaCoord(adesso);
        const pad = n => String(n).padStart(2, "0");
        const nomeGiorno = new Intl.DateTimeFormat("it-IT", { weekday: "long", timeZone: "Europe/Rome" }).format(adesso);
        const nomeGiornoMaiuscolo = nomeGiorno.charAt(0).toUpperCase() + nomeGiorno.slice(1);
        const dataFormattata = `${pad(c.day)}.${pad(c.month)}.${c.year}`;
        const oraFormattata = `${pad(c.hour)}:${pad(c.minute)}:${pad(c.second)}`;
        const turno = calcolaTurnoVVFCoord();
        const offsetOre = calcolaOffsetRomaCoord(adesso);
        const etichettaFuso = FireOps.siglaFusoRoma(adesso);
        return `credit by VVFsendWhatsApp\n${nomeGiornoMaiuscolo} ${dataFormattata} ore ${oraFormattata} - Turno ${turno}\n(GMT+0${offsetOre}.00) Roma (${etichettaFuso})`;
    }

    // ==========================================================
    // COMBOBOX RICERCABILE (duplicata da script.js, usata per il prefisso)
    // ==========================================================
    function creaComboRicercabileCoord(opzioni) { return FireOps.creaCombo(opzioni); }

    // ==========================================================
    // UI: selezione formato in ingresso, lettura campi, conversione
    // ==========================================================
    const selectFormato = document.getElementById("coord-formato-input");

    const gruppiInput = {
        dd: document.getElementById("coord-input-dd"),
        dmm: document.getElementById("coord-input-dmm"),
        dms: document.getElementById("coord-input-dms"),
        olc: document.getElementById("coord-input-olc"),
        utm: document.getElementById("coord-input-utm"),
        mappa: document.getElementById("coord-input-mappa"),
        indirizzo: document.getElementById("coord-input-indirizzo"),
    };
    const elErrore = document.getElementById("coord-errore");
    const elRisultati = document.getElementById("coord-risultati");

    function tuttiCampiCompilatiPerFormato(formato) {
    const val = id => (document.getElementById(id)?.value || "").trim();
    switch (formato) {
        case "dd": return !!(val("coord-dd-lat") && val("coord-dd-lon"));
        case "dmm": return ["coord-dmm-lat-gradi", "coord-dmm-lat-primi",
                            "coord-dmm-lon-gradi", "coord-dmm-lon-primi"].every(val);
        case "dms": return ["coord-dms-lat-gradi", "coord-dms-lat-primi", "coord-dms-lat-secondi",
                            "coord-dms-lon-gradi", "coord-dms-lon-primi", "coord-dms-lon-secondi"].every(val);
        case "olc": return !!val("coord-olc");
        case "utm": return !!(val("coord-utm-zona") && val("coord-utm-est") && val("coord-utm-nord"));
        case "mappa": return true; // nessun campo da compilare: si va direttamente alla mappa
        case "indirizzo": return !!(val("coord-indirizzo-via") || val("coord-indirizzo-comune"));
        default: return false;
    }
}

function aggiornaBottoneConverti() {
    const btn = document.getElementById("btn-coord-converti");
    if (!btn || !selectFormato) return;
    const formato = selectFormato.value;
    btn.textContent = formato === "mappa"
        ? "🗺️ Vai alla mappa"
        : "📐 Converti e scopri le funzioni a lato";
    btn.disabled = !tuttiCampiCompilatiPerFormato(formato);
}

    if (selectFormato) {
        selectFormato.addEventListener("change", () => {
            Object.entries(gruppiInput).forEach(([chiave, el]) => {
                if (el) el.style.display = chiave === selectFormato.value ? "block" : "none";
            });
            aggiornaBottoneConverti();
            // Formato diverso = nuova ricerca: target, percorso e risultati
            // della ricerca precedente non devono sopravvivere sulla mappa
            azzeraConvertitore();
        });
    }

    // ==========================================================
    // PERSISTENZA FORM: i dati inseriti (qualsiasi formato) e il formato
    // scelto sopravvivono a un refresh/F5, salvati in sessionStorage
    // ==========================================================
    const CAMPI_PERSISTENTI_COORD = [
        "coord-formato-input",
        "coord-dd-lat-segno", "coord-dd-lat", "coord-dd-lon-segno", "coord-dd-lon",
        "coord-dmm-lat-segno", "coord-dmm-lat-gradi", "coord-dmm-lat-primi",
        "coord-dmm-lon-segno", "coord-dmm-lon-gradi", "coord-dmm-lon-primi",
        "coord-dms-lat-segno", "coord-dms-lat-gradi", "coord-dms-lat-primi", "coord-dms-lat-secondi",
        "coord-dms-lon-segno", "coord-dms-lon-gradi", "coord-dms-lon-primi", "coord-dms-lon-secondi",
        "coord-olc",
        "coord-utm-zona", "coord-utm-emisfero", "coord-utm-est", "coord-utm-nord",
        "coord-indirizzo-via", "coord-indirizzo-comune-input", "coord-indirizzo-comune"
    ];
    const CHIAVE_STORAGE_FORM_COORD = "fireops_coord_form_stato";

    function salvaStatoFormCoord() {
        try {
            const stato = {};
            CAMPI_PERSISTENTI_COORD.forEach(id => {
                const el = document.getElementById(id);
                if (el) stato[id] = el.value;
            });
            sessionStorage.setItem(CHIAVE_STORAGE_FORM_COORD, JSON.stringify(stato));
        } catch (err) { }
    }

    function ripristinaStatoFormCoord() {
        try {
            const stato = JSON.parse(sessionStorage.getItem(CHIAVE_STORAGE_FORM_COORD));
            if (!stato) return;
            CAMPI_PERSISTENTI_COORD.forEach(id => {
                const el = document.getElementById(id);
                if (el && stato[id] !== undefined) el.value = stato[id];
            });
            if (selectFormato && stato["coord-formato-input"]) {
                Object.entries(gruppiInput).forEach(([chiave, el]) => {
                    if (el) el.style.display = chiave === stato["coord-formato-input"] ? "block" : "none";
                });
    aggiornaBottoneConverti();
            }
        } catch (err) { }
    }

    ripristinaStatoFormCoord();
    aggiornaBottoneConverti();

    // Tiene solo ciò che può comparire in un valore di coordinata: cifre e un
    // unico separatore decimale (la virgola diventa punto). Niente segno meno:
    // i campi dichiarano °N e °E, quindi un valore negativo contraddirebbe
    // l'etichetta e sposterebbe il punto nell'emisfero opposto senza dirlo.
    function filtraTestoNumerico(testo) {
        let pulito = String(testo).replace(/[^\d.,]/g, "").replace(/,/g, ".");
        const parti = pulito.split(".");
        if (parti.length > 1) pulito = parti[0] + "." + parti.slice(1).join("");
        return pulito;
    }

    // I campi delle coordinate si svuotano appena ci si entra: in sala
    // operativa una coordinata si riscrive sempre da capo, non si corregge
    // una cifra in mezzo. Registrato PRIMA dell'avanzamento automatico, così
    // il salto al campo successivo valuta il testo già ripulito.
    document.querySelectorAll("#coord-input-colonna .coord-campo-num").forEach(campo => {
        campo.addEventListener("input", () => {
            const ripulito = filtraTestoNumerico(campo.value);
            if (ripulito !== campo.value) campo.value = ripulito;
        });
        campo.addEventListener("focus", () => {
            if (!campo.value) return;
            campo.value = "";
            salvaStatoFormCoord();
            aggiornaBottoneConverti();
        });
    });

    // Digitando le coordinate a raffica, i campi a larghezza fissa (gradi e
    // primi interi) passano da soli al successivo appena sono pieni: si batte
    // la sequenza senza staccare le mani dalla tastiera per usare il TAB
    document.querySelectorAll("#coord-input-colonna input[data-avanza]").forEach(campo => {
        campo.addEventListener("input", () => {
            const lunghezzaMassima = parseInt(campo.getAttribute("maxlength"), 10);
            if (!lunghezzaMassima || campo.value.length < lunghezzaMassima) return;
            const campiRiga = Array.from(campo.closest(".coord-campi-riga").querySelectorAll("input"));
            const successivo = campiRiga[campiRiga.indexOf(campo) + 1];
            if (successivo) { successivo.focus(); successivo.select(); }
        });
    });

    // Delega un solo listener sull'intero form: copre tutti i campi presenti
    // (compreso quello nascosto della combo Comune) senza doverli agganciare uno per uno
    const contenitoreFormCoord = document.getElementById("coord-input-colonna");
if (contenitoreFormCoord) {
    contenitoreFormCoord.addEventListener("input", () => { salvaStatoFormCoord(); aggiornaBottoneConverti(); });
    contenitoreFormCoord.addEventListener("change", () => { salvaStatoFormCoord(); aggiornaBottoneConverti(); });
}

    // ==========================================================
    // QUOTA DEL PUNTO CONVERTITO: Open-Meteo elevation API, stessa fonte
    // già usata per il meteo nel resto dell'app (nessuna chiave richiesta).
    // ==========================================================
    async function recuperaQuota(lat, lon) {
        try {
            const url = `https://api.open-meteo.com/v1/elevation?latitude=${lat}&longitude=${lon}`;
            const risposta = await fetch(url);
            if (!risposta.ok) throw new Error("HTTP " + risposta.status);
            const dati = await risposta.json();
            const valore = Array.isArray(dati.elevation) ? dati.elevation[0] : null;
            if (valore === null || valore === undefined || Number.isNaN(valore)) return "Quota non disponibile";
            return `${Math.round(valore)} m s.l.m.`;
        } catch (err) {
            console.error("Convertitore: quota non disponibile:", err);
            return "Quota non disponibile";
        }
    }

    // Link di navigazione Google Maps verso il punto convertito (stesso
    // pattern del "creaLinkMaps" già usato in script.js per i Comandi)
    function urlGoogleMapsNavigazione(lat, lon) {
        return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}&travelmode=driving&dir_action=navigate`;
    }

    function mostraErrore(messaggio) {
        if (!elErrore) return;
        elErrore.textContent = messaggio;
        elErrore.style.display = "block";
        if (elRisultati) elRisultati.style.display = "none";
    }
    function nascondiErrore() {
        if (elErrore) elErrore.style.display = "none";
        nascondiAvvisoIndirizzo();
    }

    // Riquadro di esito del geocoding: non è un errore (i risultati restano
    // visibili), serve a far verificare all'operatore COSA è stato trovato
    // davvero, perché un punto approssimato al centro del comune è molto
    // diverso da un civico esatto. Creato al volo: nessuna modifica all'HTML.
    function elementoAvvisoIndirizzo() {
        let el = document.getElementById("coord-avviso-indirizzo");
        if (!el) {
            if (!elErrore) return null;
            el = document.createElement("p");
            el.id = "coord-avviso-indirizzo";
            el.className = "pagina-nota";
            el.style.display = "none";
            el.style.textAlign = "left";
            elErrore.insertAdjacentElement("afterend", el);
        }
        return el;
    }

    function nascondiAvvisoIndirizzo() {
        const el = document.getElementById("coord-avviso-indirizzo");
        if (el) el.style.display = "none";
    }

    function mostraEsitoIndirizzo(risultato) {
        const el = elementoAvvisoIndirizzo();
        if (!el || !risultato) return;

        let icona = "✅";
        let colore = "var(--text-muted, #9aa0a6)";
        let titolo = "Civico trovato";

        if (risultato.precisione === "via") {
            icona = "⚠️";
            colore = "#ffd700";
            titolo = risultato.civicoRichiesto
                ? `Civico ${risultato.civicoRichiesto} non presente in OpenStreetMap: punto posizionato sulla via`
                : "Punto posizionato sulla via";
        } else if (risultato.precisione === "comune") {
            icona = "⚠️";
            colore = "#ffd700";
            titolo = "Indirizzo non trovato: punto approssimato al centro del comune — verifica prima di inviarlo alle squadre";
        }

        // Frazione o località interna al comune: il punto è dentro il perimetro
        // comunale ma porta un altro nome. Va detto, perché l'operatore deve
        // poter riconoscere un eventuale errore.
        if (risultato.comuneVerificato === false && risultato.comuneTrovato) {
            icona = "⚠️";
            colore = "#ffd700";
            titolo += ` — località "${risultato.comuneTrovato}", dentro il territorio di ${risultato.comuneRichiesto}`;
        }

        el.style.color = colore;
        el.innerHTML = `${icona} <strong>${titolo}</strong><br>${risultato.indirizzoTrovato}`;
        el.style.display = "block";
    }

    function leggiCoordinateSelezionate() {
        const formato = selectFormato ? selectFormato.value : "dd";
        if (formato === "dd") {
            const lat = parseDDField(document.getElementById("coord-dd-lat").value);
            const lon = parseDDField(document.getElementById("coord-dd-lon").value);
            if (lat === null || lon === null) { mostraErrore("Coordinate decimali non valide. Esempio: 45.464204"); return null; }
            return {
                lat: Math.abs(lat) * segnoDaSelettore("coord-dd-lat-segno"),
                lon: Math.abs(lon) * segnoDaSelettore("coord-dd-lon-segno"),
            };
        }
        if (formato === "dmm") {
            const valore = id => (document.getElementById(id)?.value || "");
            const lat = componiDMM(valore("coord-dmm-lat-gradi"), valore("coord-dmm-lat-primi"));
            const lon = componiDMM(valore("coord-dmm-lon-gradi"), valore("coord-dmm-lon-primi"));
            if (lat === null || lon === null) {
                mostraErrore("Gradi e primi non validi: i primi devono stare fra 0 e 59.9999. Esempio: 45° 27.8522′ N");
                return null;
            }
            return {
                lat: lat * segnoDaSelettore("coord-dmm-lat-segno"),
                lon: lon * segnoDaSelettore("coord-dmm-lon-segno"),
            };
        }
        if (formato === "dms") {
            const valore = id => (document.getElementById(id)?.value || "");
            const lat = componiDMS(valore("coord-dms-lat-gradi"), valore("coord-dms-lat-primi"), valore("coord-dms-lat-secondi"));
            const lon = componiDMS(valore("coord-dms-lon-gradi"), valore("coord-dms-lon-primi"), valore("coord-dms-lon-secondi"));
            if (lat === null || lon === null) {
                mostraErrore("Gradi, primi e secondi non validi: primi e secondi devono stare fra 0 e 59.99. Esempio: 45° 27′ 51.10″ N");
                return null;
            }
            return {
                lat: lat * segnoDaSelettore("coord-dms-lat-segno"),
                lon: lon * segnoDaSelettore("coord-dms-lon-segno"),
            };
        }
        if (formato === "olc") {
            const codice = (document.getElementById("coord-olc").value || "").trim();
            if (!codice) { mostraErrore("Inserisci un codice OLC/Plus Code."); return null; }
            try {
                if (!olcIsFull(codice)) {
                    mostraErrore("Codice OLC non completo: serve il codice pieno (8-11 caratteri prima del +), non un codice breve.");
                    return null;
                }
                const decodificato = olcDecode(codice);
                return { lat: decodificato.latitudeCenter, lon: decodificato.longitudeCenter };
            } catch (err) {
                mostraErrore("Codice OLC non valido: " + err.message);
                return null;
            }
        }
        if (formato === "utm") {
            const zona = parseInt(document.getElementById("coord-utm-zona").value, 10);
            const emisfero = document.getElementById("coord-utm-emisfero").value;
            const est = parseFloat((document.getElementById("coord-utm-est").value || "").replace(",", "."));
            const nord = parseFloat((document.getElementById("coord-utm-nord").value || "").replace(",", "."));
            if (!zona || zona < 1 || zona > 60 || Number.isNaN(est) || Number.isNaN(nord)) {
                mostraErrore("Coordinate UTM non valide. Controlla zona, Est e Nord.");
                return null;
            }
            const risultato = utmToLatLon(zona, emisfero, est, nord);
            return { lat: risultato.lat, lon: risultato.lon };
        }
        if (formato === "mappa") {
            mostraErrore("Clicca direttamente su un punto della mappa (scheda \"Mappa\") per generare le coordinate.");
            return null;
        }
        return null;
    }

    // ==========================================================
    // MAPPA LEAFLET — target intervento ROSSO, squadra VF GIALLO,
    // percorso ROSSO.
    // ==========================================================
    const COLORE_TARGET = "#AF2B1E";
    const COLORE_SQUADRA = "#ffd700";
    const COLORE_PERCORSO = "#AF2B1E";
    const COLORE_COMANDO = "#2E7DD1";

    let coordMappaLeaflet = null;
    let coordMarkerTarget = null;
    let coordMarkerPartenza = null;
    let coordLineaPercorso = null;
    let coordinateTargetCorrenti = null;
    let modalitaPercorsoAttiva = false;
    let ultimoGeojsonPercorso = null;
    let ultimoPuntoPartenza = null;
    let coordMarkerComando = null;

    function iconaMarkerGenerica(colore) {
        return L.divIcon({
            className: "",
            html: `<div style="width:18px;height:18px;border-radius:50%;background:${colore};border:2px solid #121212;box-shadow:0 0 6px rgba(0,0,0,.6);"></div>`,
            iconSize: [18, 18],
            iconAnchor: [9, 9],
        });
    }

    // Freccia direzionale: punta verso il target, ruotata secondo l'azimut
// calcolato (0° = Nord, in senso orario, coerente con calcolaAzimut)
function iconaFrecciaDirezione(colore, azimutGradi) {
    return L.divIcon({
        className: "",
        html: `<div style="width:26px;height:26px;transform:rotate(${azimutGradi}deg);display:flex;align-items:center;justify-content:center;">
                    <svg width="22" height="22" viewBox="0 0 22 22" style="filter:drop-shadow(0 0 3px rgba(0,0,0,.7));">
                        <polygon points="11,1 20,20 11,15 2,20" fill="${colore}" stroke="#121212" stroke-width="1.5" stroke-linejoin="round"/>
                    </svg>
                </div>`,
        iconSize: [26, 26],
        iconAnchor: [13, 13],
    });
}

    function assicuraMappaCoordInizializzata() {
        if (coordMappaLeaflet) return;
        const contenitore = document.getElementById("coord-mappa");
        if (!contenitore || typeof L === "undefined") return;

        coordMappaLeaflet = L.map("coord-mappa").setView([41.9, 12.5], 6);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            maxZoom: 19,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        }).addTo(coordMappaLeaflet);

        coordMappaLeaflet.on("click", (e) => {
    // Secondo punto di "Crea percorso": funziona sempre, indipendentemente
    // dal formato selezionato nel menù a tendina
    if (modalitaPercorsoAttiva && coordinateTargetCorrenti) {
        calcolaEDisegnaPercorso(e.latlng.lat, e.latlng.lng);
        return;
    }
    // Altrimenti il click genera coordinate SOLO se è selezionato
    // esplicitamente il formato "Scelta su mappa": con qualsiasi altro
    // formato (DD, UTM, indirizzo...) il click sulla mappa non fa nulla
    const formatoAttuale = selectFormato ? selectFormato.value : "dd";
    if (formatoAttuale !== "mappa") return;
    elaboraCoordinateConvertite(e.latlng.lat, e.latlng.lng);
    // Dopo il click, torna automaticamente sulla scheda Dati per mostrare
    // subito tutti i formati convertiti e i dati aggiornati
    impostaSchedaColonnaAttiva("dati");
});

        if (typeof ResizeObserver !== "undefined") {
            const osservatoreDimensione = new ResizeObserver(() => {
                if (coordMappaLeaflet) coordMappaLeaflet.invalidateSize();
            });
            osservatoreDimensione.observe(contenitore);
        }
    }

    assicuraMappaCoordInizializzata();

    const ZOOM_INIZIALE_COMANDO = 12;
let comandoAttivoCache = window.FireOpsComandoAttivo || null;

function estraiCoordinateComando(comando) {
    if (!comando || !comando["Coordinate"]) return null;
    const parti = comando["Coordinate"].split(",").map(s => parseFloat(s.trim()));
    if (parti.length !== 2 || parti.some(n => Number.isNaN(n))) return null;
    return { lat: parti[0], lon: parti[1] };
}

function applicaComandoAttivo(comando) {
    comandoAttivoCache = comando || null;
    const coord = estraiCoordinateComando(comando);
    if (coord && coordMappaLeaflet) coordMappaLeaflet.setView([coord.lat, coord.lon], ZOOM_INIZIALE_COMANDO);
    aggiornaAnteprimaMessaggioCoordinate();
}

// Se script.js ha già impostato il Comando attivo prima che questo script
// finisca di caricarsi, il valore è già qui: nessun fetch, nessuna attesa
if (comandoAttivoCache) applicaComandoAttivo(comandoAttivoCache);

// Se il Comando viene selezionato/cambiato DOPO, questo evento mantiene
// sincronizzato convertitore.js con l'unica fonte di verità di script.js
document.addEventListener("fireops:comando-attivo-cambiato", (e) => {
    applicaComandoAttivo(e.detail);
});

    // ==========================================================
    // AZZERAMENTO. Due livelli:
    //  - azzeraPercorso(): cancella solo percorso, freccia squadra e
    //    altimetria. Usato a ogni nuova conversione, perché un percorso
    //    calcolato verso il target PRECEDENTE non deve mai restare sullo
    //    schermo insieme a coordinate nuove.
    //  - azzeraConvertitore(): azzera anche il target, la tabella dei
    //    risultati e riporta la mappa sul Comando. Usato al cambio del
    //    formato in ingresso: si riparte da zero.
    // ==========================================================
    function azzeraPercorso({ mantieniTipologia = true } = {}) {
        modalitaPercorsoAttiva = false;
        ultimoPuntoPartenza = null;
        ultimoGeojsonPercorso = null;

        if (coordMappaLeaflet) {
            if (coordLineaPercorso) { coordMappaLeaflet.removeLayer(coordLineaPercorso); coordLineaPercorso = null; }
            if (coordMarkerPartenza) { coordMappaLeaflet.removeLayer(coordMarkerPartenza); coordMarkerPartenza = null; }
        }
        if (btnPercorso) {
            btnPercorso.classList.remove("attivo");
            btnPercorso.textContent = TESTO_PERCORSO_DA_ATTIVARE;
        }
        if (contenitoreControlliPercorsoAttivo) contenitoreControlliPercorsoAttivo.classList.remove("visibile");
        if (elInfoPercorso) elInfoPercorso.textContent = "";
        abilitaEsportazioni(false);

        nascondiGraficoAltimetria("");
        aggiornaOverlayPercorso(null, null);

        if (!mantieniTipologia && selectProfiloPercorso) selectProfiloPercorso.value = PROFILO_PERCORSO_PREDEFINITO;
        aggiornaStatoBottonePercorso();
    }

    function azzeraConvertitore() {
        azzeraPercorso({ mantieniTipologia: false });

        coordinateTargetCorrenti = null;
        if (coordMappaLeaflet && coordMarkerTarget) {
            coordMappaLeaflet.removeLayer(coordMarkerTarget);
            coordMarkerTarget = null;
        }
        rimuoviMarkerComandoCompetente();

        // Vista riportata sul Comando attivo, o sull'Italia se non c'è
        if (coordMappaLeaflet) {
            const coordComando = estraiCoordinateComando(comandoAttivoCache);
            if (coordComando) coordMappaLeaflet.setView([coordComando.lat, coordComando.lon], ZOOM_INIZIALE_COMANDO);
            else coordMappaLeaflet.setView([41.9, 12.5], 6);
        }

        if (elRisultati) elRisultati.style.display = "none";
        const elDatiNotaVuota = document.getElementById("coord-dati-nota-vuota");
        if (elDatiNotaVuota) elDatiNotaVuota.style.display = "block";

        nascondiErrore();
        aggiornaAnteprimaMessaggioCoordinate();
        aggiornaStatoBottonePercorso();
    }

    function centraMappaSulTarget(lat, lon) {
        assicuraMappaCoordInizializzata();
        if (!coordMappaLeaflet) return;

        coordinateTargetCorrenti = { lat, lon };
        coordMappaLeaflet.setView([lat, lon], 15);

        if (coordMarkerTarget) coordMappaLeaflet.removeLayer(coordMarkerTarget);
        coordMarkerTarget = L.marker([lat, lon], { icon: iconaMarkerGenerica(COLORE_TARGET) })
            .addTo(coordMappaLeaflet)
            .bindPopup("Target intervento");

        setTimeout(() => coordMappaLeaflet.invalidateSize(), 100);
    }

    // ==========================================================
    // ROUTING BRouter + KML + grafico altimetria
    // ==========================================================
    const elInfoPercorso = document.getElementById("coord-percorso-info");
    const selectProfiloPercorso = document.getElementById("coord-profilo-percorso");
    const PROFILO_PERCORSO_PREDEFINITO = "trekking";

    // Il pulsante ha due stati: prima dice cosa fa, dopo il clic dice cosa
    // deve fare l'operatore
    const TESTO_PERCORSO_DA_ATTIVARE = "🧭 Attiva crea percorso";
    const TESTO_PERCORSO_ATTIVO = "🧭 Clicca sulla mappa";
    const btnScaricaKml = document.getElementById("btn-coord-scarica-kml");
    const btnScaricaGpx = document.getElementById("btn-coord-scarica-gpx");

    function distanzaKmHaversine(lat1, lon1, lat2, lon2) {
        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    // Azimut (rilevamento) da un punto A verso un punto B, 0-360°, 0=Nord, 90=Est
function calcolaAzimut(lat1, lon1, lat2, lon2) {
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;
    const y = Math.sin(Δλ) * Math.cos(φ2);
    const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
    const θ = Math.atan2(y, x);
    return (θ * 180 / Math.PI + 360) % 360;
}

    // Quote dei due punti in un'unica chiamata Open-Meteo (accetta liste di
    // coordinate separate da virgola): meno richieste, meno attesa.
    async function recuperaQuoteCoppia(latPartenza, lonPartenza, latArrivo, lonArrivo) {
        try {
            const url = `https://api.open-meteo.com/v1/elevation?latitude=${latPartenza},${latArrivo}&longitude=${lonPartenza},${lonArrivo}`;
            const risposta = await fetch(url);
            if (!risposta.ok) throw new Error("HTTP " + risposta.status);
            const dati = await risposta.json();
            const quote = Array.isArray(dati.elevation) ? dati.elevation : [];
            const valido = v => (typeof v === "number" && !Number.isNaN(v)) ? v : null;
            return { partenza: valido(quote[0]), arrivo: valido(quote[1]) };
        } catch (err) {
            console.error("Quote dei punti non disponibili:", err);
            return { partenza: null, arrivo: null };
        }
    }

    function aggiornaOverlayPercorso(messaggioSemplice, dati) {
    const overlay = document.getElementById("coord-mappa-overlay-percorso");
    if (!overlay) return;
    if (messaggioSemplice) {
        overlay.style.display = "block";
        overlay.innerHTML = `<div class="coord-mappa-overlay-riga">${messaggioSemplice}</div>`;
        return;
    }
    if (!dati) { overlay.style.display = "none"; overlay.innerHTML = ""; return; }

    const righe = [dati.lineaDiretta
        ? `<div class="coord-mappa-overlay-titolo">📏 Linea diretta</div>`
        : `<div class="coord-mappa-overlay-titolo">🧭 Percorso</div>`];

    // Azimut + distanza in linea d'aria: SEMPRE presenti, indipendentemente
    // dal profilo scelto (a piedi, auto, o linea diretta)
    if (dati.azimut !== null && dati.azimut !== undefined) {
        righe.push(`<div class="coord-mappa-overlay-riga">Azimut: ${Math.round(dati.azimut)}°</div>`);
    }
    if (dati.distanzaAriaKm !== null && dati.distanzaAriaKm !== undefined) {
        righe.push(`<div class="coord-mappa-overlay-riga">Distanza aria: ${dati.distanzaAriaKm.toFixed(2)} km</div>`);
    }

    // Quote dei due punti selezionati: la squadra deve sapere se sta salendo
    // o scendendo, e di quanto, prima ancora di guardare l'altimetria
    if (dati.quotaPartenza !== null && dati.quotaPartenza !== undefined) {
        righe.push(`<div class="coord-mappa-overlay-riga">Quota squadra VF: ${Math.round(dati.quotaPartenza)} m s.l.m.</div>`);
    }
    if (dati.quotaArrivo !== null && dati.quotaArrivo !== undefined) {
        righe.push(`<div class="coord-mappa-overlay-riga">Quota target: ${Math.round(dati.quotaArrivo)} m s.l.m.</div>`);
    }
    if (dati.quotaPartenza !== null && dati.quotaPartenza !== undefined
        && dati.quotaArrivo !== null && dati.quotaArrivo !== undefined) {
        const salto = Math.round(dati.quotaArrivo - dati.quotaPartenza);
        const segno = salto > 0 ? "+" : "";
        righe.push(`<div class="coord-mappa-overlay-riga">Differenza di quota: ${segno}${salto} m</div>`);
    }

    // Dati specifici del percorso reale (assenti per "linea diretta", che
    // usa la stessa distanza in linea d'aria come unica misura disponibile)
    if (!dati.lineaDiretta && dati.distanzaKm !== null && dati.distanzaKm !== undefined) {
        righe.push(`<div class="coord-mappa-overlay-riga">Distanza percorso: ${dati.distanzaKm.toFixed(2)} km</div>`);
    }
    if (dati.tempoMin !== null && dati.tempoMin !== undefined) {
        righe.push(`<div class="coord-mappa-overlay-riga">Tempo: circa ${dati.tempoMin} min</div>`);
    }
    if (dati.dislivelloPositivo !== null && dati.dislivelloPositivo !== undefined) {
        righe.push(`<div class="coord-mappa-overlay-riga">D+ ${dati.dislivelloPositivo} m &nbsp; D− ${dati.dislivelloNegativo} m</div>`);
    }

    overlay.style.display = "block";
    overlay.innerHTML = righe.join("");
}

async function disegnaLineaDiretta(latPartenza, lonPartenza, latArrivo, lonArrivo, azimut, distanzaAriaKm, quote) {
    if (coordLineaPercorso) coordMappaLeaflet.removeLayer(coordLineaPercorso);
    coordLineaPercorso = L.polyline(
        [[latPartenza, lonPartenza], [latArrivo, lonArrivo]],
        { color: COLORE_PERCORSO, weight: 4, opacity: 0.85, dashArray: "8 6" }
    ).addTo(coordMappaLeaflet);
    coordMappaLeaflet.fitBounds(coordLineaPercorso.getBounds(), { padding: [30, 30] });

    ultimoGeojsonPercorso = {
        type: "FeatureCollection",
        features: [{
            type: "Feature",
            properties: { "track-length": distanzaAriaKm * 1000 },
            geometry: { type: "LineString", coordinates: [[lonPartenza, latPartenza], [lonArrivo, latArrivo]] },
        }],
    };
    abilitaEsportazioni(true);

    nascondiGraficoAltimetria("Linea diretta: nessun profilo altimetrico (è una distanza in linea d'aria, non un percorso reale).");
    if (elInfoPercorso) elInfoPercorso.textContent = `Linea diretta — ${distanzaAriaKm.toFixed(2)} km — Azimut ${Math.round(azimut)}°. Trascina la freccia gialla per spostare la squadra e ricalcolare.`;

    const quotaPartenza = quote ? quote.partenza : null;
    const quotaArrivo = quote ? quote.arrivo : null;
    const diff = (quotaPartenza !== null && quotaArrivo !== null) ? Math.round(quotaArrivo - quotaPartenza) : null;

    aggiornaOverlayPercorso(null, {
        azimut, distanzaAriaKm, lineaDiretta: true,
        quotaPartenza, quotaArrivo,
        dislivelloPositivo: diff !== null ? Math.max(diff, 0) : null,
        dislivelloNegativo: diff !== null ? Math.max(-diff, 0) : null,
    });
}

// Marker della squadra VF: trascinabile. Al rilascio ricalcola tutto
// (percorso, quote, azimut) dal nuovo punto, senza dover ricliccare.
function disegnaMarkerPartenza(lat, lon, azimut) {
    if (coordMarkerPartenza) coordMappaLeaflet.removeLayer(coordMarkerPartenza);
    coordMarkerPartenza = L.marker([lat, lon], {
        icon: iconaFrecciaDirezione(COLORE_SQUADRA, azimut),
        draggable: true,
        autoPan: true,
        title: "Squadra VF — trascina per spostare il punto di partenza",
    }).addTo(coordMappaLeaflet).bindPopup("Squadra VF (trascinabile)");

    coordMarkerPartenza.on("dragstart", () => {
        if (elInfoPercorso) elInfoPercorso.textContent = "Spostamento del punto di partenza…";
    });
    coordMarkerPartenza.on("dragend", (e) => {
        const posizione = e.target.getLatLng();
        calcolaEDisegnaPercorso(posizione.lat, posizione.lng);
    });
}

    async function calcolaEDisegnaPercorso(latPartenza, lonPartenza) {
    if (!coordinateTargetCorrenti || !coordMappaLeaflet) return;
    const { lat: latArrivo, lon: lonArrivo } = coordinateTargetCorrenti;
    const profilo = (selectProfiloPercorso && selectProfiloPercorso.value) || PROFILO_PERCORSO_PREDEFINITO;

    // Il punto di partenza resta in memoria: serve per ricalcolare quando
    // cambia la tipologia o quando la freccia viene trascinata altrove
    ultimoPuntoPartenza = { lat: latPartenza, lon: lonPartenza };

    // Azimut e distanza in linea d'aria: calcolati SUBITO, servono anche
    // per orientare la freccia del marker di partenza
    const azimut = calcolaAzimut(latPartenza, lonPartenza, latArrivo, lonArrivo);
    const distanzaAriaKm = distanzaKmHaversine(latPartenza, lonPartenza, latArrivo, lonArrivo);

    // Le quote partono in parallelo al routing: si aspettano solo alla fine
    const promessaQuote = recuperaQuoteCoppia(latPartenza, lonPartenza, latArrivo, lonArrivo);

    disegnaMarkerPartenza(latPartenza, lonPartenza, azimut);

    if (elInfoPercorso) elInfoPercorso.textContent = "Calcolo percorso in corso…";
    aggiornaOverlayPercorso(null, { azimut, distanzaAriaKm, lineaDiretta: profilo === "linea-diretta" });
    abilitaEsportazioni(false);

    if (profilo === "linea-diretta") {
        const quote = await promessaQuote;
        await disegnaLineaDiretta(latPartenza, lonPartenza, latArrivo, lonArrivo, azimut, distanzaAriaKm, quote);
        return;
    }

        try {
            const url = `https://brouter.de/brouter?lonlats=${lonPartenza},${latPartenza}|${lonArrivo},${latArrivo}&profile=${profilo}&alternativeidx=0&format=geojson`;
            const risposta = await fetch(url);
            if (!risposta.ok) throw new Error("HTTP " + risposta.status);
            const geojson = await risposta.json();
            ultimoGeojsonPercorso = geojson;
            if (coordLineaPercorso) coordMappaLeaflet.removeLayer(coordLineaPercorso);
            coordLineaPercorso = L.geoJSON(geojson, { style: { color: COLORE_PERCORSO, weight: 5, opacity: 0.85 } }).addTo(coordMappaLeaflet);
            coordMappaLeaflet.fitBounds(coordLineaPercorso.getBounds(), { padding: [30, 30] });

            const proprieta = (geojson.features && geojson.features[0] && geojson.features[0].properties) || {};
            const lunghezzaM = parseFloat(proprieta["track-length"]);
            const tempoS = parseFloat(proprieta["total-time"]);
            const risultatoAltimetria = disegnaGraficoAltimetria(geojson);
            const quote = await promessaQuote;

            aggiornaOverlayPercorso(null, {
                azimut, distanzaAriaKm,
                quotaPartenza: quote.partenza,
                quotaArrivo: quote.arrivo,
                distanzaKm: !Number.isNaN(lunghezzaM) ? lunghezzaM / 1000 : null,
                tempoMin: !Number.isNaN(tempoS) ? Math.round(tempoS / 60) : null,
                dislivelloPositivo: risultatoAltimetria ? risultatoAltimetria.dislivelloPositivo : null,
                dislivelloNegativo: risultatoAltimetria ? risultatoAltimetria.dislivelloNegativo : null,
            });

            let testoInfo = "Percorso calcolato";
            if (!Number.isNaN(lunghezzaM)) testoInfo += ` — ${(lunghezzaM / 1000).toFixed(2)} km`;
            if (!Number.isNaN(tempoS)) testoInfo += ` — circa ${Math.round(tempoS / 60)} min`;
            testoInfo += ". Trascina la freccia gialla per spostare la squadra e ricalcolare.";
            if (elInfoPercorso) elInfoPercorso.textContent = testoInfo;
            abilitaEsportazioni(true);
        } catch (err) {
            console.error("Errore routing BRouter:", err);
            ultimoGeojsonPercorso = null;
            if (elInfoPercorso) elInfoPercorso.textContent = "Impossibile calcolare il percorso (servizio BRouter non raggiungibile o punto fuori copertura).";
            const quote = await promessaQuote;
            aggiornaOverlayPercorso(null, { azimut, distanzaAriaKm, quotaPartenza: quote.partenza, quotaArrivo: quote.arrivo });
            nascondiGraficoAltimetria("Percorso non calcolato: nessun dato altimetrico disponibile.");
        }
    }

    const btnPercorso = document.getElementById("btn-coord-percorso");
    const btnAnnullaPercorso = document.getElementById("btn-coord-annulla-percorso");

    const contenitoreControlliPercorsoAttivo = document.getElementById("coord-mappa-controlli-percorso-attivo");

// Il pulsante si attiva solo quando esiste un target convertito E una
// tipologia di percorso scelta: prima di allora non c'è nulla da calcolare
function aggiornaStatoBottonePercorso() {
    // Lookup diretto: questa funzione gira anche prima che le costanti dei
    // Reparti Volo, più in basso nel file, siano state inizializzate
    const btnHelicottero = document.getElementById("btn-coord-reparti-volo");
    if (btnHelicottero) {
        btnHelicottero.disabled = !coordinateTargetCorrenti;
        btnHelicottero.title = coordinateTargetCorrenti
            ? "Mostra i due Reparti Volo più vicini al target"
            : "Converti prima delle coordinate: serve un target";
    }

    if (!btnPercorso) return;
    // La tipologia ha sempre un valore (predefinito "a piedi"), quindi
    // l'unica condizione rimasta è avere un target verso cui andare
    btnPercorso.disabled = !coordinateTargetCorrenti;
    btnPercorso.title = coordinateTargetCorrenti
        ? "Clicca un punto sulla mappa: sarà la posizione della squadra VF"
        : "Converti prima delle coordinate: serve un punto di arrivo";
}

if (selectProfiloPercorso) {
    selectProfiloPercorso.addEventListener("change", () => {
        aggiornaStatoBottonePercorso();
        // Cambio di tipologia con un percorso già tracciato: si ricalcola
        // subito, senza chiedere di ricliccare il punto di partenza
        if (ultimoPuntoPartenza && coordinateTargetCorrenti) {
            calcolaEDisegnaPercorso(ultimoPuntoPartenza.lat, ultimoPuntoPartenza.lon);
        }
    });
}

aggiornaStatoBottonePercorso();

if (btnPercorso) {
    btnPercorso.addEventListener("click", () => {
        if (!coordinateTargetCorrenti) {
            mostraErrore("Converti prima delle coordinate: serve un punto di arrivo per calcolare il percorso.");
            return;
        }
        modalitaPercorsoAttiva = true;
        btnPercorso.classList.add("attivo");
        btnPercorso.textContent = TESTO_PERCORSO_ATTIVO;
        if (contenitoreControlliPercorsoAttivo) contenitoreControlliPercorsoAttivo.classList.add("visibile");
        if (elInfoPercorso) elInfoPercorso.textContent = "Clicca un punto sulla mappa: verrà calcolato il percorso fino al punto convertito.";
    });
}

    if (btnAnnullaPercorso) {
        btnAnnullaPercorso.addEventListener("click", () => azzeraPercorso({ mantieniTipologia: true }));
    }

    function coordinatePercorso(geojson) {
        return (geojson && geojson.features && geojson.features[0]
            && geojson.features[0].geometry && geojson.features[0].geometry.coordinates) || [];
    }

    function costruisciKml(geojson, nomePercorso) {
        const coords = coordinatePercorso(geojson);
        const coordinateTesto = coords.map(c => `${c[0]},${c[1]},${c[2] || 0}`).join(" ");
        return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${nomePercorso}</name>
    <Placemark>
      <name>${nomePercorso}</name>
      <Style><LineStyle><color>ff1E2BAF</color><width>4</width></LineStyle></Style>
      <LineString>
        <tessellate>1</tessellate>
        <coordinates>${coordinateTesto}</coordinates>
      </LineString>
    </Placemark>
  </Document>
</kml>`;
    }

    // GPX 1.1: è il formato che digeriscono i GPS da montagna (Garmin), le
    // app di navigazione outdoor e i software di soccorso. A differenza del
    // KML include anche i due waypoint (squadra e target), utili sul campo
    // anche quando la traccia non serve.
    function costruisciGpx(geojson, nomePercorso) {
        const coords = coordinatePercorso(geojson);
        const istante = new Date().toISOString();

        const puntiTraccia = coords.map(c => {
            const quota = (c.length >= 3 && !Number.isNaN(parseFloat(c[2])))
                ? `<ele>${parseFloat(c[2]).toFixed(1)}</ele>`
                : "";
            return `      <trkpt lat="${c[1]}" lon="${c[0]}">${quota}</trkpt>`;
        }).join("\n");

        const waypoint = [];
        if (ultimoPuntoPartenza) {
            waypoint.push(`  <wpt lat="${ultimoPuntoPartenza.lat}" lon="${ultimoPuntoPartenza.lon}">
    <name>Squadra VF</name>
    <sym>Flag, Blue</sym>
  </wpt>`);
        }
        if (coordinateTargetCorrenti) {
            waypoint.push(`  <wpt lat="${coordinateTargetCorrenti.lat}" lon="${coordinateTargetCorrenti.lon}">
    <name>Target intervento</name>
    <sym>Danger Area</sym>
  </wpt>`);
        }

        return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="FireOps VVF" xmlns="http://www.topografix.com/GPX/1/1"
     xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
     xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd">
  <metadata>
    <name>${nomePercorso}</name>
    <time>${istante}</time>
  </metadata>
${waypoint.join("\n")}
  <trk>
    <name>${nomePercorso}</name>
    <trkseg>
${puntiTraccia}
    </trkseg>
  </trk>
</gpx>`;
    }

    function scaricaFile(nomeFile, contenuto, tipoMime) {
        const blob = new Blob([contenuto], { type: tipoMime });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = nomeFile;
        a.click();
        URL.revokeObjectURL(url);
    }

    // I due formati si abilitano e disabilitano sempre insieme: esiste un
    // percorso esportabile, oppure non esiste per nessuno dei due
    function abilitaEsportazioni(abilitate) {
        [btnScaricaKml, btnScaricaGpx].forEach(btn => { if (btn) btn.disabled = !abilitate; });
    }

    if (btnScaricaKml) {
        btnScaricaKml.addEventListener("click", () => {
            if (!ultimoGeojsonPercorso) return;
            scaricaFile(
                "percorso-fireops.kml",
                costruisciKml(ultimoGeojsonPercorso, "Percorso FireOps VVF"),
                "application/vnd.google-earth.kml+xml"
            );
        });
    }

    if (btnScaricaGpx) {
        btnScaricaGpx.addEventListener("click", () => {
            if (!ultimoGeojsonPercorso) return;
            scaricaFile(
                "percorso-fireops.gpx",
                costruisciGpx(ultimoGeojsonPercorso, "Percorso FireOps VVF"),
                "application/gpx+xml"
            );
        });
    }

    abilitaEsportazioni(false);

    // Grafico altimetria (canvas, nessuna libreria esterna). Dipende dal
    // fatto che BRouter includa la quota (terzo valore delle coordinate)
    // nella risposta: non verificabile dall'ambiente di sviluppo
    // (brouter.de non raggiungibile da qui). Se assente, mostra un
    // messaggio invece di un grafico vuoto o rotto.
function nascondiGraficoAltimetria(messaggio) {
    const canvas = document.getElementById("coord-grafico-altimetria");
    const nota = document.getElementById("coord-altimetria-nota");
    if (canvas) canvas.style.display = "none";
    if (nota) {
        nota.textContent = messaggio || "";
        nota.style.display = messaggio ? "block" : "none";
    }
}

function disegnaGraficoAltimetria(geojson) {
    const canvas = document.getElementById("coord-grafico-altimetria");
    if (!canvas) return null;
    const coords = (geojson.features && geojson.features[0] && geojson.features[0].geometry && geojson.features[0].geometry.coordinates) || [];
    const conQuota = coords.filter(c => Array.isArray(c) && c.length >= 3 && !Number.isNaN(parseFloat(c[2])));
    if (conQuota.length < 2) {
        nascondiGraficoAltimetria("Dati altimetrici non disponibili per questo percorso (BRouter non li ha forniti).");
        return null;
    }

    function distanzaKm(lat1, lon1, lat2, lon2) {
        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    let distanzaTot = 0;
    const punti = [{ d: 0, ele: parseFloat(conQuota[0][2]) }];
    let dislivelloPositivo = 0, dislivelloNegativo = 0;
    for (let i = 1; i < conQuota.length; i++) {
        distanzaTot += distanzaKm(conQuota[i - 1][1], conQuota[i - 1][0], conQuota[i][1], conQuota[i][0]);
        const eleAttuale = parseFloat(conQuota[i][2]);
        const diff = eleAttuale - punti[punti.length - 1].ele;
        if (diff > 0) dislivelloPositivo += diff; else dislivelloNegativo += Math.abs(diff);
        punti.push({ d: distanzaTot, ele: eleAttuale });
    }

    // Il grafico è automatico: appena disponibile compare subito sotto la mappa
    const nota = document.getElementById("coord-altimetria-nota");
    if (nota) nota.style.display = "none";

    canvas.style.display = "block";
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const eleMin = Math.min(...punti.map(p => p.ele));
    const eleMax = Math.max(...punti.map(p => p.ele));
    const margine = 34;
    const margineBasso = 44;
    const w = canvas.width - margine * 2;
    const h = canvas.height - margine - margineBasso;

    ctx.strokeStyle = "#333333";
    ctx.strokeRect(margine, margine, w, h);

    // Progressivi chilometrici: passo adattivo in base alla lunghezza totale
    let passoKm = 1;
    if (distanzaTot > 40) passoKm = 10;
    else if (distanzaTot > 15) passoKm = 5;
    else if (distanzaTot > 6) passoKm = 2;
    else if (distanzaTot < 2) passoKm = 0.5;

    ctx.font = "10px Arial";
    ctx.textAlign = "center";
    for (let km = passoKm; km < distanzaTot; km += passoKm) {
        const x = margine + (km / distanzaTot) * w;
        ctx.strokeStyle = "rgba(255,255,255,0.08)";
        ctx.beginPath();
        ctx.moveTo(x, margine);
        ctx.lineTo(x, margine + h);
        ctx.stroke();
        ctx.fillStyle = "#888888";
        ctx.fillText(km % 1 === 0 ? `${km}` : km.toFixed(1), x, margine + h + 14);
    }
    ctx.textAlign = "left";

    ctx.beginPath();
    punti.forEach((p, i) => {
        const x = margine + (distanzaTot > 0 ? (p.d / distanzaTot) * w : 0);
        const y = margine + h - ((p.ele - eleMin) / ((eleMax - eleMin) || 1)) * h;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = "#ffd700";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = "#aaaaaa";
    ctx.font = "11px Arial";
    ctx.fillText(`${Math.round(eleMax)} m`, 4, margine + 4);
    ctx.fillText(`${Math.round(eleMin)} m`, 4, margine + h);
    ctx.fillText("km", canvas.width - 22, margine + h + 30);

    return { dislivelloPositivo: Math.round(dislivelloPositivo), dislivelloNegativo: Math.round(dislivelloNegativo) };
}

    // ==========================================================
    // REPARTI VOLO — i due più vicini al target, con distanza in linea
    // d'aria, azimut e dislivello. Il JSON viene mostrato per intero
    // (tutte le chiavi presenti), così non serve toccare il codice se
    // domani il file guadagna o perde una colonna.
    // ==========================================================
    const btnRepartiVolo = document.getElementById("btn-coord-reparti-volo");
    const modaleRepartiVolo = document.getElementById("modal-reparti-volo");
    const contenutoRepartiVolo = document.getElementById("reparti-volo-contenuto");
    let elencoRepartiVoloCache = null;

    async function caricaRepartiVolo() {
        if (elencoRepartiVoloCache) return elencoRepartiVoloCache;
        const dati = await FireOps.caricaJson("/FireOps/db/repartivolovvf.json");
        // Accetta sia un array puro sia un oggetto che lo contiene
        elencoRepartiVoloCache = Array.isArray(dati)
            ? dati
            : (Object.values(dati).find(Array.isArray) || []);
        return elencoRepartiVoloCache;
    }

    // Le coordinate possono arrivare come campo unico "Coordinate": "45.1, 9.2"
    // (come in comandi.json) oppure come due campi separati. Si accettano
    // entrambe le forme senza doverle sapere in anticipo.
    const CHIAVI_LATITUDINE = ["lat", "latitudine", "latitude"];
    const CHIAVI_LONGITUDINE = ["lon", "lng", "long", "longitudine", "longitude"];

    function coordinateDaRecord(record) {
        for (const [chiave, valore] of Object.entries(record)) {
            if (typeof valore !== "string" || !/coordinat/i.test(chiave)) continue;
            const trovate = valore.match(/(-?\d{1,3}[.,]\d+)\s*[,;]\s*(-?\d{1,3}[.,]\d+)/);
            if (trovate) {
                return {
                    lat: parseFloat(trovate[1].replace(",", ".")),
                    lon: parseFloat(trovate[2].replace(",", ".")),
                };
            }
        }

        let lat = null, lon = null;
        for (const [chiave, valore] of Object.entries(record)) {
            const normalizzata = chiave.toLowerCase().replace(/[^a-z]/g, "");
            const numero = parseFloat(String(valore).replace(",", "."));
            if (Number.isNaN(numero)) continue;
            if (lat === null && CHIAVI_LATITUDINE.includes(normalizzata)) lat = numero;
            if (lon === null && CHIAVI_LONGITUDINE.includes(normalizzata)) lon = numero;
        }
        return (lat !== null && lon !== null) ? { lat, lon } : null;
    }

    function nomeDelReparto(record, indice) {
        const chiaveNome = Object.keys(record).find(k => /reparto|denominazion|nome|sede|base|aeroport/i.test(k));
        return (chiaveNome && String(record[chiaveNome]).trim()) || `Reparto ${indice + 1}`;
    }

    // Quote di più punti in una sola chiamata Open-Meteo
    async function recuperaQuoteMultiple(punti) {
        try {
            const latitudini = punti.map(p => p.lat).join(",");
            const longitudini = punti.map(p => p.lon).join(",");
            const risposta = await fetch(`https://api.open-meteo.com/v1/elevation?latitude=${latitudini}&longitude=${longitudini}`);
            if (!risposta.ok) throw new Error("HTTP " + risposta.status);
            const dati = await risposta.json();
            const quote = Array.isArray(dati.elevation) ? dati.elevation : [];
            return punti.map((_, i) => (typeof quote[i] === "number" && !Number.isNaN(quote[i])) ? quote[i] : null);
        } catch (err) {
            console.error("Reparti Volo: quote non disponibili:", err);
            return punti.map(() => null);
        }
    }

    function testoSicuro(valore) {
        return String(valore === null || valore === undefined ? "" : valore)
            .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }

    // Rende cliccabili telefoni, email e link senza sapere in quale campo
    // del JSON si trovano
    function valoreFormattato(valore) {
        const testo = String(valore === null || valore === undefined ? "" : valore).trim();
        if (!testo) return "—";
        if (/^https?:\/\//i.test(testo)) {
            return `<a href="${testoSicuro(testo)}" target="_blank" rel="noopener" class="indirizzo-link">${testoSicuro(testo)}</a>`;
        }
        if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(testo)) {
            return `<a href="mailto:${testoSicuro(testo)}" class="indirizzo-link">${testoSicuro(testo)}</a>`;
        }
        if (/^\+?[\d\s./-]{6,}$/.test(testo) && /\d{5,}/.test(testo.replace(/\D/g, ""))) {
            return `<a href="tel:${testoSicuro(testo.replace(/[^\d+]/g, ""))}" class="indirizzo-link">${testoSicuro(testo)}</a>`;
        }
        return testoSicuro(testo);
    }

    function tabellaCampiRecord(record) {
        const righe = Object.entries(record)
            .map(([chiave, valore]) => `<tr><th>${testoSicuro(chiave)}</th><td>${valoreFormattato(valore)}</td></tr>`)
            .join("");
        return `<table class="riepilogo-tabella"><tbody>${righe}</tbody></table>`;
    }

    function tabellaCalcoliReparto(calcoli) {
        const quota = v => (v === null ? "non disponibile" : `${Math.round(v)} m s.l.m.`);
        const dislivello = calcoli.dislivello === null
            ? "non disponibile"
            : `${calcoli.dislivello > 0 ? "+" : ""}${Math.round(calcoli.dislivello)} m`;

        return `<table class="riepilogo-tabella"><tbody>
            <tr><th>Distanza in linea d'aria</th><td>${calcoli.distanzaKm.toFixed(2)} km</td></tr>
            <tr><th>Azimut (reparto → target)</th><td>${Math.round(calcoli.azimut)}°</td></tr>
            <tr><th>Quota reparto volo</th><td>${quota(calcoli.quotaReparto)}</td></tr>
            <tr><th>Quota target</th><td>${quota(calcoli.quotaTarget)}</td></tr>
            <tr><th>Dislivello (reparto → target)</th><td>${dislivello}</td></tr>
        </tbody></table>`;
    }

    function apriModaleRepartiVolo(html) {
        if (!modaleRepartiVolo || !contenutoRepartiVolo) return;
        contenutoRepartiVolo.innerHTML = html;
        modaleRepartiVolo.style.display = "flex";
    }

    function chiudiModaleRepartiVolo() {
        if (modaleRepartiVolo) modaleRepartiVolo.style.display = "none";
    }

    async function mostraRepartiVoloPiuVicini() {
        if (!coordinateTargetCorrenti) {
            mostraErrore("Converti prima delle coordinate: serve un target verso cui misurare la distanza.");
            return;
        }
        apriModaleRepartiVolo(`<p class="pagina-nota">Caricamento elenco Reparti Volo…</p>`);

        let reparti = [];
        try {
            reparti = await caricaRepartiVolo();
        } catch (err) {
            console.error("Reparti Volo: elenco non disponibile:", err);
            apriModaleRepartiVolo(`<p class="pagina-nota" style="color:var(--danger-color);">Impossibile leggere <code>db/repartivolovvf.json</code>: ${testoSicuro(err.message)}</p>`);
            return;
        }

        const conCoordinate = reparti
            .map(record => ({ record, coord: coordinateDaRecord(record) }))
            .filter(voce => voce.coord);

        if (conCoordinate.length === 0) {
            const chiaviViste = reparti.length ? Object.keys(reparti[0]).join(", ") : "(file vuoto)";
            apriModaleRepartiVolo(`<p class="pagina-nota" style="color:var(--danger-color);">
                Nessuna coordinata riconosciuta in <code>repartivolovvf.json</code>.
                Servono un campo "Coordinate" nel formato "45.1, 9.2" oppure due campi
                latitudine/longitudine separati.<br>Chiavi trovate nel primo record: ${testoSicuro(chiaviViste)}</p>`);
            return;
        }

        const { lat: latTarget, lon: lonTarget } = coordinateTargetCorrenti;
        conCoordinate.forEach(voce => {
            voce.distanzaKm = distanzaKmHaversine(voce.coord.lat, voce.coord.lon, latTarget, lonTarget);
            voce.azimut = calcolaAzimut(voce.coord.lat, voce.coord.lon, latTarget, lonTarget);
        });
        conCoordinate.sort((a, b) => a.distanzaKm - b.distanzaKm);
        const piuVicini = conCoordinate.slice(0, 3);

        const quote = await recuperaQuoteMultiple([
            { lat: latTarget, lon: lonTarget },
            ...piuVicini.map(v => v.coord),
        ]);
        const quotaTarget = quote[0];

        const schede = piuVicini.map((voce, i) => {
            const quotaReparto = quote[i + 1];
            const dislivello = (quotaTarget !== null && quotaReparto !== null) ? quotaTarget - quotaReparto : null;

            return `<div class="reparto-volo-scheda">
                <button type="button" class="reparto-volo-testata" data-indice="${i}" aria-expanded="false">
                    <span class="freccia">▶</span>
                    <span class="reparto-volo-distintivo">${i + 1}º</span>
                    <span class="nome">${testoSicuro(nomeDelReparto(voce.record, i))}</span>
                    <span class="distanza">${voce.distanzaKm.toFixed(1)} km</span>
                    <span class="azimut">Az ${String(Math.round(voce.azimut)).padStart(3, "0")}°</span>
                </button>
                <div class="reparto-volo-dettaglio" data-dettaglio="${i}">
                    <h5>Rotta verso il target</h5>
                    ${tabellaCalcoliReparto({
                        distanzaKm: voce.distanzaKm,
                        azimut: voce.azimut,
                        quotaReparto,
                        quotaTarget,
                        dislivello,
                    })}
                    <h5>Dati del reparto</h5>
                    ${tabellaCampiRecord(voce.record)}
                </div>
            </div>`;
        }).join("");

        apriModaleRepartiVolo(`
            <p class="pagina-nota">Target: ${latTarget.toFixed(6)}, ${lonTarget.toFixed(6)} — confronto su ${conCoordinate.length} reparti con coordinate note.
            Le distanze sono in linea d'aria (ortodromica), non tengono conto di rotte, spazi aerei o autonomia.
            Clicca un reparto per aprirne i dati.</p>
            ${schede}`);
    }

    // Apertura/chiusura delle schede: un solo listener sul contenitore, così
    // funziona anche sulle schede ricostruite a ogni nuova ricerca
    if (contenutoRepartiVolo) {
        contenutoRepartiVolo.addEventListener("click", (e) => {
            const testata = e.target.closest(".reparto-volo-testata");
            if (!testata) return;
            const dettaglio = testata.parentElement.querySelector(".reparto-volo-dettaglio");
            if (!dettaglio) return;
            const aperto = dettaglio.classList.toggle("aperto");
            testata.setAttribute("aria-expanded", aperto ? "true" : "false");
            const freccia = testata.querySelector(".freccia");
            if (freccia) freccia.textContent = aperto ? "▼" : "▶";
        });
    }

    if (btnRepartiVolo) {
        btnRepartiVolo.addEventListener("click", mostraRepartiVoloPiuVicini);
    }

    const chiusuraModaleRepartiVolo = document.getElementById("modal-reparti-volo-close");
    if (chiusuraModaleRepartiVolo) chiusuraModaleRepartiVolo.addEventListener("click", chiudiModaleRepartiVolo);
    if (modaleRepartiVolo) {
        modaleRepartiVolo.addEventListener("click", (e) => {
            if (e.target === modaleRepartiVolo) chiudiModaleRepartiVolo();
        });
    }
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && modaleRepartiVolo && modaleRepartiVolo.style.display === "flex") {
            chiudiModaleRepartiVolo();
        }
    });

    // ==========================================================
    // MESSAGGIO ALLE SQUADRE VF: prefisso + numero + 3 pulsanti di invio
    // ==========================================================
    const inputMsgPrefisso = document.getElementById("coord-msg-prefisso-input");
    const hiddenMsgPrefisso = document.getElementById("coord-msg-prefisso");
    const dropdownMsgPrefisso = document.getElementById("coord-msg-prefisso-dropdown");
    const inputMsgNumero = document.getElementById("coord-msg-numero");
    const textareaMsg = document.getElementById("coord-msg-testo");
    const btnMsgWhatsappWeb = document.getElementById("coord-btn-whatsapp-web");
    const btnMsgWhatsappApp = document.getElementById("coord-btn-whatsapp-app");
    const btnMsgTelegram = document.getElementById("coord-btn-invia-telegram");

    const PREFISSO_PREDEFINITO_COORD = "39";

    function validaCampiMessaggioCoord() {
        const prefissoOk = !!(hiddenMsgPrefisso && hiddenMsgPrefisso.value);
        const numeroOk = !!(inputMsgNumero && inputMsgNumero.value.trim());
        if (inputMsgPrefisso) inputMsgPrefisso.classList.toggle("campo-mancante", !prefissoOk);
        if (inputMsgNumero) inputMsgNumero.classList.toggle("campo-mancante", !numeroOk);
        const tuttiCompilati = prefissoOk && numeroOk && !!coordinateTargetCorrenti && !!comandoAttivoCache;
        [btnMsgWhatsappWeb, btnMsgWhatsappApp, btnMsgTelegram].forEach(btn => { if (btn) btn.disabled = !tuttiCompilati; });
        return { prefissoOk, numeroOk, tuttiCompilati };
    }

    function costruisciMessaggioCoordinate() {
        if (!comandoAttivoCache) return "Seleziona prima un Comando dalla schermata iniziale per generare il messaggio.";
        if (!coordinateTargetCorrenti) return "Converti prima delle coordinate per generare il messaggio.";

        const { lat, lon } = coordinateTargetCorrenti;
        const nomeComando = (comandoAttivoCache.Comando || "").toUpperCase();
        const valoreEmergenza = comandoAttivoCache["115/NUE OUT"] || "112";
        const numeroEmergenzaFormattato = String(valoreEmergenza).split("").join(" ");
        const canale = comandoAttivoCache["Canale Radio Comando"] || "-";

        const righe = [
            `🚒 *Vigili del Fuoco ${nomeComando}* 🚒`,
            "Questo è un messaggio generato automaticamente.",
            "Per tutte le richieste di soccorso chiami il",
            "☎️🆘️",
            `*${numeroEmergenzaFormattato}*`,
            "🇪🇺🇮🇹",
            "",
            `*Canale Radio Provinciale VHF: ${canale}*`,
            "",
            "*Coordinate Intervento:*",
            "*Dd*",
            formattaDdMessaggio(lat, lon),
            "*DMm*",
            formattaDMmMessaggio(lat, lon),
            "*DMSs*",
            formattaDMSsMessaggio(lat, lon),
            "*Open Location Code*",
            olcEncode(lat, lon, 11),
            "",
            "*Appunti*",
            formattaDD(lat, lon),
            "",
            "*Naviga con Google Maps*",
            urlGoogleMapsNavigazione(lat, lon),
            "",
            costruisciPieDiPaginaCoord(),
        ];
        return righe.join("\n");
    }

    function aggiornaAnteprimaMessaggioCoordinate() {
        if (!textareaMsg) return;
        textareaMsg.value = costruisciMessaggioCoordinate();
        validaCampiMessaggioCoord();

        const elComandoInfo = document.getElementById("coord-msg-comando-info");
        if (elComandoInfo) {
            elComandoInfo.textContent = comandoAttivoCache
                ? `Comando attivo: ${(comandoAttivoCache.Comando || "").toUpperCase()}`
                : "Nessun Comando attivo — selezionalo dalla schermata iniziale (☰).";
        }
    }

    aggiornaAnteprimaMessaggioCoordinate(); // stato iniziale: già "Nessun Comando attivo..." finché non arriva il fetch

    if (inputMsgPrefisso && hiddenMsgPrefisso && dropdownMsgPrefisso) {
        FireOps.caricaJson("/FireOps/db/prefissi.json")
            .then(listaPrefissi => {
                const combo = creaComboRicercabileCoord({
                    input: inputMsgPrefisso,
                    hidden: hiddenMsgPrefisso,
                    dropdown: dropdownMsgPrefisso,
                    elenco: listaPrefissi,
                    cercaValore: p => p.Valore,
                    mostraTesto: p => p.Prefissi,
                    onScelta: validaCampiMessaggioCoord,
                });
                if (listaPrefissi.some(p => p.Valore === PREFISSO_PREDEFINITO_COORD)) {
                    combo.impostaValore(PREFISSO_PREDEFINITO_COORD);
                }
                validaCampiMessaggioCoord();
            })
            .catch(err => console.error("Convertitore: prefissi.json non disponibile:", err));
    }

    // ==========================================================
    // COMBO COMUNE (scheda Indirizzo): autocompletamento da comuni.json,
    // con CAP compilato automaticamente alla selezione
    // ==========================================================
    const inputComuneIndirizzo = document.getElementById("coord-indirizzo-comune-input");
    const hiddenComuneIndirizzo = document.getElementById("coord-indirizzo-comune");
    const dropdownComuneIndirizzo = document.getElementById("coord-indirizzo-comune-dropdown");
    if (inputComuneIndirizzo && hiddenComuneIndirizzo && dropdownComuneIndirizzo) {
        FireOps.caricaJson("/FireOps/db/comuni.json")
            .then(listaComuni => {
                creaComboRicercabileCoord({
    input: inputComuneIndirizzo,
    hidden: hiddenComuneIndirizzo,
    dropdown: dropdownComuneIndirizzo,
    elenco: listaComuni,
    cercaValore: c => c["Denominazione (Italiana e straniera)"],
    mostraTesto: c => `${c["Denominazione (Italiana e straniera)"]} (${c["Sigla automobilistica"] || "?"})`,
    testoSelezionato: c => `${c["Denominazione (Italiana e straniera)"]} (${c["Sigla automobilistica"] || "?"})`,
    onScelta: aggiornaBottoneConverti
});
            })
            .catch(err => console.error("Convertitore: comuni.json non disponibile:", err));
    }

    if (inputMsgNumero) inputMsgNumero.addEventListener("input", validaCampiMessaggioCoord);

    function numeroCompletoPulitoCoord() {
        const prefisso = (hiddenMsgPrefisso && hiddenMsgPrefisso.value || "").replace(/\D/g, "");
        const numero = (inputMsgNumero && inputMsgNumero.value || "").replace(/\D/g, "");
        return { prefisso, numero };
    }

    if (btnMsgWhatsappWeb) {
        btnMsgWhatsappWeb.addEventListener("click", () => {
            if (!validaCampiMessaggioCoord().tuttiCompilati) return;
            aggiornaAnteprimaMessaggioCoordinate();
            const { prefisso, numero } = numeroCompletoPulitoCoord();
            if (!numero) { alert("Inserisci un numero di telefono valido."); return; }
            const testoCodificato = encodeURIComponent(textareaMsg.value);
            window.open(`https://web.whatsapp.com/send?phone=${prefisso}${numero}&text=${testoCodificato}`, "_blank", "noopener");
        });
    }
    if (btnMsgWhatsappApp) {
        btnMsgWhatsappApp.addEventListener("click", () => {
            if (!validaCampiMessaggioCoord().tuttiCompilati) return;
            aggiornaAnteprimaMessaggioCoordinate();
            const { prefisso, numero } = numeroCompletoPulitoCoord();
            if (!numero) { alert("Inserisci un numero di telefono valido."); return; }
            const testoCodificato = encodeURIComponent(textareaMsg.value);
            window.location.href = `whatsapp://send?phone=${prefisso}${numero}&text=${testoCodificato}`;
        });
    }
    if (btnMsgTelegram) {
        btnMsgTelegram.addEventListener("click", () => {
            if (!validaCampiMessaggioCoord().tuttiCompilati) return;
            aggiornaAnteprimaMessaggioCoordinate();
            const testo = textareaMsg.value;
            if (!testo.trim()) { alert("Il messaggio è vuoto."); return; }
            navigator.clipboard.writeText(testo).catch(() => { });
            const { prefisso, numero } = numeroCompletoPulitoCoord();
            if (numero) window.open(`https://t.me/+${prefisso}${numero}`, "_blank", "noopener");
            else window.open(`https://t.me/share/url?url=&text=${encodeURIComponent(testo)}`, "_blank", "noopener");
        });
    }

    // ==========================================================
    // PULSANTE "CONVERTI"
    // ==========================================================
    const btnConverti = document.getElementById("btn-coord-converti");

    if (btnConverti) {
        btnConverti.addEventListener("click", async (event) => {
            nascondiErrore();
            const formatoScelto = selectFormato ? selectFormato.value : "dd";
            if (formatoScelto === "mappa") {
                event.stopPropagation();
                impostaSchedaColonnaAttiva("mappa");
                return;
            }
            let coordinate = null;

            let esitoIndirizzo = null;

            if (formatoScelto === "indirizzo") {
                const via = (document.getElementById("coord-indirizzo-via").value || "").trim();
                const { comune, sigla } = comuneEProvinciaSelezionati();

                if (!via && !comune) {
                    mostraErrore("Inserisci almeno indirizzo o comune.");
                    return;
                }

                // La cascata di tentativi può durare qualche secondo: il
                // pulsante lo dice, invece di sembrare bloccato
                const testoOriginaleBottone = btnConverti.textContent;
                btnConverti.disabled = true;
                btnConverti.textContent = "🔎 Ricerca indirizzo in corso…";
                try {
                    esitoIndirizzo = await geocodificaIndirizzo(via, comune, sigla);
                } catch (err) {
                    console.error("Geocoding indirizzo non disponibile:", err);
                    mostraErrore("Servizio di geocoding non raggiungibile al momento.");
                    return;
                } finally {
                    btnConverti.disabled = false;
                    btnConverti.textContent = testoOriginaleBottone;
                    aggiornaBottoneConverti();
                }

                if (!esitoIndirizzo) {
                    mostraErrore(comune
                        ? `Nessun risultato per "${via || comune}" nel comune di ${comune}. Controlla il nome della via, oppure prova senza numero civico.`
                        : "Indirizzo non trovato. Prova a essere più specifico.");
                    return;
                }
                coordinate = { lat: esitoIndirizzo.lat, lon: esitoIndirizzo.lon };
            } else {
                coordinate = leggiCoordinateSelezionate();
                if (!coordinate) return;
            }

            await elaboraCoordinateConvertite(coordinate.lat, coordinate.lon);

            // Dopo il rendering, perché elaboraCoordinateConvertite() azzera
            // errori e avvisi all'inizio
            if (esitoIndirizzo) mostraEsitoIndirizzo(esitoIndirizzo);
        });
    }

// ==========================================================
    // COMANDO COMPETENTE SUL PUNTO CONVERTITO
    //
    // La competenza è provinciale: si cerca per targa, non per vicinanza.
    // Il Comando più vicino in linea d'aria può stare in un'altra provincia,
    // e mandarci la squadra sarebbe un errore di giurisdizione.
    // ==========================================================
    function comandoPerSigla(sigla) {
        if (!sigla) return null;
        const elenco = window.FireOpsComandi || [];
        return elenco.find(c => String(c.Provincia || "").trim().toUpperCase() === sigla) || null;
    }

function rimuoviMarkerComandoCompetente() {
        if (coordMappaLeaflet && coordMarkerComando) coordMappaLeaflet.removeLayer(coordMarkerComando);
        coordMarkerComando = null;
    }

    // Il marker NON sposta la vista: al centro resta il target, che è il punto
    // dell'intervento. Se il Comando competente è lontano resta fuori campo,
    // ed è corretto: la distanza si legge nel popup, non spostando l'inquadratura.
    function mostraComandoSuMappa(comando) {
        rimuoviMarkerComandoCompetente();
        if (!coordMappaLeaflet || !comando) return;

        const coord = estraiCoordinateComando(comando);
        if (!coord) return;

        const canale = comando["Canale Radio Comando"] || "-";
        const telefono = String(comando["Telefono SO Comando"] || "").trim() || "-";

        let distanza = "";
        if (coordinateTargetCorrenti) {
            const km = distanzaKmHaversine(coord.lat, coord.lon,
                coordinateTargetCorrenti.lat, coordinateTargetCorrenti.lon);
            const az = calcolaAzimut(coord.lat, coord.lon,
                coordinateTargetCorrenti.lat, coordinateTargetCorrenti.lon);
            distanza = `<br>${km.toFixed(1)} km dal target — Az ${String(Math.round(az)).padStart(3, "0")}°`;
        }

        coordMarkerComando = L.marker([coord.lat, coord.lon], {
            icon: iconaMarkerGenerica(COLORE_COMANDO),
            title: `Comando competente: ${comando.Comando}`,
        }).addTo(coordMappaLeaflet)
          .bindPopup(`<strong>Comando ${testoSicuro(comando.Comando)}</strong><br>
                      CH VHF ${testoSicuro(canale)}<br>
                      TEL SO ${testoSicuro(telefono)}${distanza}`);
    }

    function mostraComandoCompetente(sigla) {
        const elNome = document.getElementById("coord-out-comando");
        const elCanale = document.getElementById("coord-out-comando-canale");
        const elTelefono = document.getElementById("coord-out-comando-telefono");
        if (!elNome) return;

        [elNome, elCanale, elTelefono].forEach(el => {
            if (!el) return;
            el.classList.remove("cliccabile");
            el.onclick = null;
        });

        const comando = comandoPerSigla(sigla);
        if (!comando) {
            rimuoviMarkerComandoCompetente();
            elNome.textContent = sigla
                ? `Nessun Comando in elenco per la provincia ${sigla}`
                : "Provincia non determinata";
            if (elCanale) elCanale.textContent = "-";
            if (elTelefono) elTelefono.textContent = "-";
            return;
        }

        // Se il punto cade fuori dalla provincia del Comando attivo, la cosa
        // va detta: è esattamente il caso in cui questo dato serve
        const attivo = comandoAttivoCache && String(comandoAttivoCache.Provincia || "").toUpperCase();
        const fuori = attivo && attivo !== sigla ? " ⚠️ fuori dal Comando attivo" : "";
        elNome.textContent = `${comando.Comando} (${sigla})${fuori}`;

        if (elCanale) elCanale.textContent = comando["Canale Radio Comando"] || "-";

        const telefono = String(comando["Telefono SO Comando"] || "").trim();
        if (elTelefono) {
            if (telefono) rendiCopiabile(elTelefono, telefono, telefono.replace(/\s+/g, ""));
            else elTelefono.textContent = "-";
        }
        mostraComandoSuMappa(comando);
    }

    // Logica di rendering condivisa: usata sia dal pulsante "Converti" sia
    // dal click diretto sulla mappa (che passa già una coppia lat/lon)
    async function elaboraCoordinateConvertite(lat, lon) {
        nascondiErrore();

        if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
            mostraErrore("Coordinate fuori range (latitudine -90/90, longitudine -180/180).");
            return;
        }

        // Si mostra la forma leggibile, si copia quella senza simboli
        [["coord-out-dd", formattaDDUscita(lat, lon)],
         ["coord-out-dmm", formattaDMM(lat, lon)],
         ["coord-out-dms", formattaDMS(lat, lon)]].forEach(([id, testo]) => {
            rendiCopiabile(document.getElementById(id), testo, testoSoloNumeri(testo));
        });
        try {
            rendiCopiabile(document.getElementById("coord-out-olc"), olcEncode(lat, lon, 11));
        } catch (err) {
            const el = document.getElementById("coord-out-olc");
            if (el) { el.textContent = "Non calcolabile"; el.classList.remove("cliccabile"); el.onclick = null; }
        }
        rendiCopiabile(document.getElementById("coord-out-utm"), formattaUTMTesto(lat, lon));
        rendiCopiabile(document.getElementById("coord-out-so115-lon"), formattaSO115Lon(lon));
        rendiCopiabile(document.getElementById("coord-out-so115-lat"), formattaSO115Lat(lat));

        const elMaps = document.getElementById("coord-out-maps");
        if (elMaps) {
            elMaps.innerHTML = `<a href="${urlGoogleMapsNavigazione(lat, lon)}" target="_blank" rel="noopener" class="indirizzo-link">🧭 Naviga con Google Maps</a>`;
        }

        ["coord-out-comando", "coord-out-comando-canale", "coord-out-comando-telefono"].forEach(id => {
            const el = document.getElementById(id);
            if (el) { el.textContent = "Ricerca in corso…"; el.classList.remove("cliccabile"); el.onclick = null; }
        });

        const elToponimo = document.getElementById("coord-out-toponimo");
        if (elToponimo) { elToponimo.textContent = "Ricerca in corso…"; elToponimo.classList.remove("cliccabile"); elToponimo.onclick = null; }

        const elQuota = document.getElementById("coord-out-quota");
        if (elQuota) { elQuota.textContent = "Ricerca in corso…"; elQuota.classList.remove("cliccabile"); elQuota.onclick = null; }

        if (elRisultati) elRisultati.style.display = "block";
        const elDatiNotaVuota = document.getElementById("coord-dati-nota-vuota");
        if (elDatiNotaVuota) elDatiNotaVuota.style.display = "none";

        centraMappaSulTarget(lat, lon);
        aggiornaAnteprimaMessaggioCoordinate();

        // Nuova conversione: il percorso calcolato verso il target precedente
        // viene sempre cancellato (la tipologia scelta invece resta)
        azzeraPercorso({ mantieniTipologia: true });

        const [esitoToponimo, quota] = await Promise.all([
            geocodingInverso(lat, lon),
            recuperaQuota(lat, lon),
        ]);
        rendiCopiabile(elToponimo, esitoToponimo.toponimo);
        rendiCopiabile(elQuota, quota);
        mostraComandoCompetente(esitoToponimo.sigla);
    }

    // ==========================================================
    // SCHEDA/COLONNA ATTIVA: Dati / Mappa / Messaggio.
    // Un'unica funzione gestisce sia il cambio scheda in modalità ridotta
    // sia l'evidenziazione col bordo giallo della colonna attiva quando
    // il pannello è espanso (le 3 colonne sono tutte visibili insieme,
    // ma solo una è "quella su cui stiamo lavorando").
    // ==========================================================
    const pulsantiScheda = document.querySelectorAll(".coord-tab-btn");
    const contenutiScheda = {
        dati: document.getElementById("coord-tab-content-dati"),
        mappa: document.getElementById("coord-tab-content-mappa"),
        messaggio: document.getElementById("coord-tab-content-messaggio"),
    };

    const CHIAVE_STORAGE_TAB_COORD = "fireops_coord_tab_attiva";

    function impostaSchedaColonnaAttiva(chiave, salva = true) {
        pulsantiScheda.forEach(p => p.classList.toggle("attivo", p.dataset.tab === chiave));
        const corpoSchede = document.querySelector(".coord-tab-corpo");
        if (corpoSchede) {
            corpoSchede.classList.remove("corpo-tab-primo-attivo", "corpo-tab-centro-attivo", "corpo-tab-ultimo-attivo");
            if (chiave === "dati") corpoSchede.classList.add("corpo-tab-primo-attivo");
            else if (chiave === "mappa") corpoSchede.classList.add("corpo-tab-centro-attivo");
            else if (chiave === "messaggio") corpoSchede.classList.add("corpo-tab-ultimo-attivo");
        }
        Object.entries(contenutiScheda).forEach(([k, el]) => {
            if (!el) return;
            el.style.display = k === chiave ? "block" : "none";
            const colonna = el.closest(".coord-colonna");
            if (colonna) colonna.classList.toggle("attiva", k === chiave);
        });
        if (salva) {
            try { sessionStorage.setItem(CHIAVE_STORAGE_TAB_COORD, chiave); } catch (err) { }
        }
    }

    pulsantiScheda.forEach(pulsante => {
        pulsante.addEventListener("click", () => impostaSchedaColonnaAttiva(pulsante.dataset.tab));
    });

    // In modalità espansa la barra schede è nascosta, ma le 3 colonne
    // restano cliccabili per spostare l'evidenziazione tra loro
    Object.entries(contenutiScheda).forEach(([chiave, el]) => {
        if (el) el.addEventListener("click", () => impostaSchedaColonnaAttiva(chiave));
    });

    let tabInizialeCoord = "dati";
    try {
        const tabSalvata = sessionStorage.getItem(CHIAVE_STORAGE_TAB_COORD);
        if (tabSalvata && contenutiScheda[tabSalvata]) tabInizialeCoord = tabSalvata;
    } catch (err) { }
    impostaSchedaColonnaAttiva(tabInizialeCoord, false); // false: non ri-salvare quello che abbiamo appena letto
});