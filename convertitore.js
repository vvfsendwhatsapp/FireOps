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

    function parseDMMField(testoInput) {
        const { testo, segno } = estraiSegnoEPulisci(testoInput);
        const pulito = testo.replace(/[°'′]/g, " ").replace(/,/g, ".").trim();
        const parti = pulito.split(/\s+/).filter(Boolean);
        if (parti.length < 2) return null;
        const gradi = parseFloat(parti[0]), minuti = parseFloat(parti[1]);
        if (Number.isNaN(gradi) || Number.isNaN(minuti)) return null;
        return (gradi + minuti / 60) * segno;
    }

    function parseDMSField(testoInput) {
        const { testo, segno } = estraiSegnoEPulisci(testoInput);
        const pulito = testo.replace(/[°'′"″]/g, " ").replace(/,/g, ".").trim();
        const parti = pulito.split(/\s+/).filter(Boolean);
        if (parti.length < 3) return null;
        const gradi = parseFloat(parti[0]), minuti = parseFloat(parti[1]), secondi = parseFloat(parti[2]);
        if ([gradi, minuti, secondi].some(Number.isNaN)) return null;
        return (gradi + minuti / 60 + secondi / 3600) * segno;
    }

    // Riconoscimento automatico da testo incollato: coppie decimali, link Google
    // Maps (con "@lat,lon"), formato "?q=lat,lon", oppure DMS con N/S/E/W.
    // Best-effort: non copre TUTTI i formati possibili (es. link brevi
    // maps.app.goo.gl non si possono espandere lato client per via del CORS).
    function parseTestoLibero(testo) {
        testo = (testo || "").trim();
        if (!testo) return null;

        const matchChiocciola = testo.match(/@(-?\d{1,3}\.\d+),\s*(-?\d{1,3}\.\d+)/);
        if (matchChiocciola) {
            return { lat: parseFloat(matchChiocciola[1]), lon: parseFloat(matchChiocciola[2]) };
        }

        const matchQuery = testo.match(/[?&]q=(-?\d{1,3}\.\d+),\s*(-?\d{1,3}\.\d+)/);
        if (matchQuery) {
            return { lat: parseFloat(matchQuery[1]), lon: parseFloat(matchQuery[2]) };
        }

        const matchDecimale = testo.match(/^(-?\d{1,3}(?:[.,]\d+)?)\s*[,;\s]\s*(-?\d{1,3}(?:[.,]\d+)?)$/);
        if (matchDecimale) {
            const lat = parseFloat(matchDecimale[1].replace(",", "."));
            const lon = parseFloat(matchDecimale[2].replace(",", "."));
            if (!Number.isNaN(lat) && !Number.isNaN(lon)) return { lat, lon };
        }

        const partiDMS = testo.match(/\d{1,3}[°\s]+\d{1,2}['\s]+\d{1,2}(?:\.\d+)?["\s]*[NSEW]/gi);
        if (partiDMS && partiDMS.length === 2) {
            const lat = partiDMS.find(p => /[NS]/i.test(p));
            const lon = partiDMS.find(p => /[EW]/i.test(p));
            if (lat && lon) {
                const latVal = parseDMSField(lat);
                const lonVal = parseDMSField(lon);
                if (latVal !== null && lonVal !== null) return { lat: latVal, lon: lonVal };
            }
        }

        return null;
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
    function ddSingolo(valore, lettere) {
        const lettera = valore >= 0 ? lettere[0] : lettere[1];
        return `${Math.abs(valore).toFixed(6)}° ${lettera}`;
    }
    function formattaDDUscita(lat, lon) {
        return `${ddSingolo(lat, "NS")}, ${ddSingolo(lon, "EW")}`;
    }
    function dmmSingolo(valore, lettere) {
        const lettera = valore >= 0 ? lettere[0] : lettere[1];
        const v = Math.abs(valore);
        const gradi = Math.floor(v);
        const minuti = (v - gradi) * 60;
        return `${gradi}° ${minuti.toFixed(4)}' ${lettera}`;
    }
    function formattaDMM(lat, lon) {
        return `${dmmSingolo(lat, "NS")}, ${dmmSingolo(lon, "EW")}`;
    }
    function dmsSingolo(valore, lettere) {
        const lettera = valore >= 0 ? lettere[0] : lettere[1];
        const v = Math.abs(valore);
        const gradi = Math.floor(v);
        const minutiTot = (v - gradi) * 60;
        const minuti = Math.floor(minutiTot);
        const secondi = (minutiTot - minuti) * 60;
        return `${gradi}° ${minuti}' ${secondi.toFixed(2)}" ${lettera}`;
    }
    function formattaDMS(lat, lon) {
        return `${dmsSingolo(lat, "NS")}, ${dmsSingolo(lon, "EW")}`;
    }
    function formattaUTMTesto(lat, lon) {
        const u = latLonToUtm(lat, lon);
        return `${u.zona}${u.lettera} ${Math.round(u.est)} ${Math.round(u.nord)}`;
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
            const v = Math.abs(valore);
            const gradi = String(Math.floor(v)).padStart(cifreGradi, "0");
            const minuti = ((v - Math.floor(v)) * 60).toFixed(4).padStart(7, "0");
            return { gradi, minuti };
        }
        const pLat = parte(lat, 2), pLon = parte(lon, 3);
        return `Lat ${sLat.lettera} ${sLat.segno}${pLat.gradi}° ${pLat.minuti}' - Lon ${sLon.lettera} ${sLon.segno}${pLon.gradi}° ${pLon.minuti}'`;
    }
    function formattaDMSsMessaggio(lat, lon) {
        const sLat = segnoLettera(lat, "NS"), sLon = segnoLettera(lon, "EW");
        function parte(valore, cifreGradi) {
            const v = Math.abs(valore);
            const gradi = String(Math.floor(v)).padStart(cifreGradi, "0");
            const minutiTot = (v - Math.floor(v)) * 60;
            const minuti = String(Math.floor(minutiTot)).padStart(2, "0");
            const secondi = ((minutiTot - Math.floor(minutiTot)) * 60).toFixed(2).padStart(5, "0");
            return { gradi, minuti, secondi };
        }
        const pLat = parte(lat, 2), pLon = parte(lon, 3);
        return `Lat ${sLat.lettera} ${sLat.segno}${pLat.gradi}° ${pLat.minuti}' ${pLat.secondi}" - Lon ${sLon.lettera} ${sLon.segno}${pLon.gradi}° ${pLon.minuti}' ${pLon.secondi}"`;
    }

    // ==========================================================
    // GEOCODING INVERSO (Nominatim + fallback Overpass su sentieri)
    // ==========================================================
    async function geocodingInverso(lat, lon) {
        try {
            const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&zoom=16&addressdetails=1&accept-language=it`;
            const risposta = await fetch(url);
            if (risposta.ok) {
                const dati = await risposta.json();
                if (dati && !dati.error) {
                    const a = dati.address || {};
                    const nome = a.hamlet || a.village || a.town || a.city || a.suburb || a.locality || a.county;
                    if (nome) {
                        const extra = a.county && a.county !== nome ? ` (${a.county})` : "";
                        return nome + extra;
                    }
                    if (dati.display_name) return dati.display_name.split(",").slice(0, 2).join(",").trim();
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
                if (conNome) return `Vicino al sentiero "${conNome.tags.name}"`;
                if (elementi.length > 0) return "Vicino a un sentiero/traccia non denominato";
            }
        } catch (err) {
            console.error("Fallback Overpass non disponibile:", err);
        }

        return "Toponimo non disponibile";
    }

    // Geocoding diretto (indirizzo → coordinate), stesso servizio Nominatim
    // già usato per il geocoding inverso. Nessuna chiave richiesta.
    async function geocodificaIndirizzo(via, comune, cap) {
        if (!via && !comune && !cap) return null;

        const parametri = new URLSearchParams({ format: "jsonv2", limit: "1", countrycodes: "it" });
        if (via) parametri.set("street", via);
        if (comune) parametri.set("city", comune);
        if (cap) parametri.set("postalcode", cap);

        const url = `https://nominatim.openstreetmap.org/search?${parametri.toString()}`;
        const risposta = await fetch(url);
        if (!risposta.ok) throw new Error("HTTP " + risposta.status);
        const dati = await risposta.json();
        if (!Array.isArray(dati) || dati.length === 0) return null;

        return { lat: parseFloat(dati[0].lat), lon: parseFloat(dati[0].lon) };
    }

    // ==========================================================
    // COPIA NEGLI APPUNTI + FEEDBACK VISIVO
    // ==========================================================
    function copiaTestoConFeedback(event, testo) {
        event.stopPropagation();
        if (!testo) return;
        navigator.clipboard.writeText(testo)
            .then(() => mostraFeedbackCopiaCoord(event, "✓ Copiato"))
            .catch(() => mostraFeedbackCopiaCoord(event, "✗ Errore copia"));
    }
    function mostraFeedbackCopiaCoord(event, testo) {
        const badge = document.createElement("div");
        badge.className = "copia-feedback";
        badge.textContent = testo;
        const rect = event.target.getBoundingClientRect();
        badge.style.top = `${rect.top - 30}px`;
        badge.style.left = `${rect.left}px`;
        document.body.appendChild(badge);
        setTimeout(() => badge.remove(), 1200);
    }
    function rendiCopiabile(elemento, testo) {
        if (!elemento) return;
        elemento.textContent = testo;
        elemento.classList.add("cliccabile");
        elemento.onclick = (e) => copiaTestoConFeedback(e, testo);
    }

    // ==========================================================
    // TURNO VVF + DATA/ORA ROMA — duplicato da script.js perché
    // convertitore.js è indipendente e non condivide il suo stato interno.
    // ==========================================================
    const SEQUENZA_TURNI = ["A4", "C4", "B4", "B4", "D4", "C4", "C4", "A5", "D4", "D4", "B5", "A5", "A5", "C5", "B5", "B5", "D5", "C5", "C5", "A6", "D5", "D5", "B6", "A6", "A6", "C6", "B6", "B6", "D6", "C6", "C6", "A7", "D6", "D6", "B7", "A7", "A7", "C7", "B7", "B7", "D7", "C7", "C7", "A8", "D7", "D7", "B8", "A8", "A8", "C8", "B8", "B8", "D8", "C8", "C8", "A1", "D8", "D8", "B1", "A1", "A1", "C1", "B1", "B1", "D1", "C1", "C1", "A2", "D1", "D1", "B2", "A2", "A2", "C2", "B2", "B2", "D2", "C2", "C2", "A3", "D2", "D2", "B3", "A3", "A3", "C3", "B3", "B3", "D3", "C3", "C3", "A4", "D3", "D3", "B4", "A4"];
    const GIORNI_CICLO = 32;
    const MS_AL_GIORNO = 24 * 60 * 60 * 1000;
    const RIFERIMENTO_CICLO_MS = Date.UTC(2026, 0, 26, 0, 0, 0);

    function getComponentiRomaCoord(date) {
        const fmt = new Intl.DateTimeFormat("en-GB", {
            timeZone: "Europe/Rome",
            year: "numeric", month: "2-digit", day: "2-digit",
            hour: "2-digit", minute: "2-digit", second: "2-digit",
            hour12: false,
        });
        const parts = fmt.formatToParts(date);
        const get = tipo => parts.find(p => p.type === tipo).value;
        return {
            year: parseInt(get("year"), 10), month: parseInt(get("month"), 10), day: parseInt(get("day"), 10),
            hour: parseInt(get("hour"), 10) % 24, minute: parseInt(get("minute"), 10), second: parseInt(get("second"), 10),
        };
    }
    function calcolaOffsetRomaCoord(data) {
        const utc = new Date(data.toLocaleString("en-US", { timeZone: "UTC" }));
        const roma = new Date(data.toLocaleString("en-US", { timeZone: "Europe/Rome" }));
        return Math.round((roma - utc) / (1000 * 60 * 60));
    }
    function calcolaTurnoVVFCoord() {
        const adesso = new Date();
        const c = getComponentiRomaCoord(adesso);
        const oraPseudo = Date.UTC(c.year, c.month - 1, c.day, c.hour, c.minute, c.second);
        const diffGiorni = (oraPseudo - RIFERIMENTO_CICLO_MS) / MS_AL_GIORNO;
        const posizioneCiclo = ((diffGiorni % GIORNI_CICLO) + GIORNI_CICLO) % GIORNI_CICLO;
        const giornoIndex = Math.floor(posizioneCiclo);
        const fraz = posizioneCiclo - giornoIndex;
        let fasciaIndex;
        if (fraz < 1 / 3) fasciaIndex = 0;
        else if (fraz < 5 / 6) fasciaIndex = 1;
        else fasciaIndex = 2;
        return SEQUENZA_TURNI[giornoIndex * 3 + fasciaIndex] || "N/D";
    }
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
        const etichettaFuso = offsetOre === 2 ? "CEST" : "CET";
        return `credit by VVFsendWhatsApp\n${nomeGiornoMaiuscolo} ${dataFormattata} ore ${oraFormattata} - Turno ${turno}\n(GMT+0${offsetOre}.00) Roma (${etichettaFuso})`;
    }

    // ==========================================================
    // COMBOBOX RICERCABILE (duplicata da script.js, usata per il prefisso)
    // ==========================================================
    function creaComboRicercabileCoord({ input, hidden, dropdown, elenco, cercaValore, mostraTesto, testoRicerca, testoSelezionato, onScelta }) {
        let ultimoFiltrati = elenco;
        let indiceAttivo = -1;

        function filtra(testo) {
            const filtro = (testo || "").trim().toLowerCase();
            if (!filtro) return elenco;
            const ottieniTesto = testoRicerca || mostraTesto;
            return elenco.filter(item => ottieniTesto(item).toLowerCase().includes(filtro));
        }
        function renderOpzioni(testo) {
            ultimoFiltrati = filtra(testo);
            dropdown.innerHTML = "";
            if (ultimoFiltrati.length === 0) {
                indiceAttivo = -1;
                const vuoto = document.createElement("div");
                vuoto.className = "combo-opzione-vuota";
                vuoto.textContent = "Nessun risultato";
                dropdown.appendChild(vuoto);
                return;
            }
            const indiceValoreCorrente = hidden.value ? ultimoFiltrati.findIndex(item => cercaValore(item) === hidden.value) : -1;
            indiceAttivo = indiceValoreCorrente >= 0 ? indiceValoreCorrente : 0;
            ultimoFiltrati.forEach((item, i) => {
                const opz = document.createElement("div");
                opz.className = "combo-opzione" + (i === indiceAttivo ? " combo-opzione-attiva" : "");
                opz.textContent = mostraTesto(item);
                opz.addEventListener("mousedown", (e) => { e.preventDefault(); selezionaVoce(item); });
                opz.addEventListener("mouseenter", () => { indiceAttivo = i; aggiornaEvidenziazione(); });
                dropdown.appendChild(opz);
            });
            aggiornaEvidenziazione();
        }
        function aggiornaEvidenziazione() {
            const opzioni = dropdown.querySelectorAll(".combo-opzione");
            opzioni.forEach((el, i) => el.classList.toggle("combo-opzione-attiva", i === indiceAttivo));
            const attiva = opzioni[indiceAttivo];
            if (attiva) attiva.scrollIntoView({ block: "nearest" });
        }
        function selezionaVoce(item) {
            hidden.value = cercaValore(item);
            input.value = testoSelezionato ? testoSelezionato(item) : mostraTesto(item);
            chiudiDropdown();
            if (onScelta) onScelta(item);
        }
        function apriDropdown() { renderOpzioni(input.value); dropdown.classList.add("aperto"); }
        function apriDropdownCompleta() { renderOpzioni(""); dropdown.classList.add("aperto"); }
        function chiudiDropdown() { dropdown.classList.remove("aperto"); }

        input.addEventListener("input", () => { hidden.value = ""; apriDropdown(); });
        input.addEventListener("focus", apriDropdownCompleta);

        const wrapperCombo = input.closest(".combo-wrapper");
        const frecciaCombo = wrapperCombo ? wrapperCombo.querySelector(".combo-arrow") : null;
        if (frecciaCombo) {
            frecciaCombo.addEventListener("mousedown", (e) => {
                e.preventDefault();
                if (dropdown.classList.contains("aperto")) chiudiDropdown();
                else { input.focus(); apriDropdownCompleta(); }
            });
        }
        input.addEventListener("keydown", (e) => {
            const aperto = dropdown.classList.contains("aperto");
            if (e.key === "Escape") { chiudiDropdown(); input.blur(); }
            else if (e.key === "ArrowDown") {
                e.preventDefault();
                if (!aperto) { apriDropdownCompleta(); return; }
                if (ultimoFiltrati.length > 0) { indiceAttivo = (indiceAttivo + 1) % ultimoFiltrati.length; aggiornaEvidenziazione(); }
            } else if (e.key === "ArrowUp") {
                e.preventDefault();
                if (!aperto) { apriDropdownCompleta(); return; }
                if (ultimoFiltrati.length > 0) { indiceAttivo = (indiceAttivo - 1 + ultimoFiltrati.length) % ultimoFiltrati.length; aggiornaEvidenziazione(); }
            } else if (e.key === "Enter") {
                e.preventDefault();
                if (ultimoFiltrati.length > 0) selezionaVoce(ultimoFiltrati[indiceAttivo >= 0 ? indiceAttivo : 0]);
            }
        });
        document.addEventListener("click", (e) => {
            if (!input.contains(e.target) && !dropdown.contains(e.target) && !(frecciaCombo && frecciaCombo.contains(e.target))) chiudiDropdown();
        });

        return { impostaValore(valore) { const trovato = elenco.find(item => cercaValore(item) === valore); if (trovato) selezionaVoce(trovato); } };
    }

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
        libero: document.getElementById("coord-input-libero"),       // NUOVO
        indirizzo: document.getElementById("coord-input-indirizzo"), // NUOVO
    };
    const elErrore = document.getElementById("coord-errore");
    const elRisultati = document.getElementById("coord-risultati");

    if (selectFormato) {
        selectFormato.addEventListener("change", () => {
            Object.entries(gruppiInput).forEach(([chiave, el]) => {
                if (el) el.style.display = chiave === selectFormato.value ? "block" : "none";
            });
        });
    }

    // ==========================================================
    // PERSISTENZA FORM: i dati inseriti (qualsiasi formato) e il formato
    // scelto sopravvivono a un refresh/F5, salvati in sessionStorage
    // ==========================================================
    const CAMPI_PERSISTENTI_COORD = [
        "coord-formato-input",
        "coord-dd-lat", "coord-dd-lon",
        "coord-dmm-lat", "coord-dmm-lon",
        "coord-dms-lat", "coord-dms-lon",
        "coord-olc",
        "coord-utm-zona", "coord-utm-emisfero", "coord-utm-est", "coord-utm-nord",
        "coord-libero-testo",
        "coord-indirizzo-via", "coord-indirizzo-comune-input", "coord-indirizzo-comune", "coord-indirizzo-cap"
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
            }
        } catch (err) { }
    }

    ripristinaStatoFormCoord();

    // Delega un solo listener sull'intero form: copre tutti i campi presenti
    // (compreso quello nascosto della combo Comune) senza doverli agganciare uno per uno
    const contenitoreFormCoord = document.getElementById("coord-input-colonna");
    if (contenitoreFormCoord) {
        contenitoreFormCoord.addEventListener("input", salvaStatoFormCoord);
        contenitoreFormCoord.addEventListener("change", salvaStatoFormCoord);
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
    function nascondiErrore() { if (elErrore) elErrore.style.display = "none"; }

    function leggiCoordinateSelezionate() {
        const formato = selectFormato ? selectFormato.value : "dd";
        if (formato === "dd") {
            const lat = parseDDField(document.getElementById("coord-dd-lat").value);
            const lon = parseDDField(document.getElementById("coord-dd-lon").value);
            if (lat === null || lon === null) { mostraErrore("Coordinate decimali non valide. Esempio: 45.464204"); return null; }
            return { lat, lon };
        }
        if (formato === "dmm") {
            const lat = parseDMMField(document.getElementById("coord-dmm-lat").value);
            const lon = parseDMMField(document.getElementById("coord-dmm-lon").value);
            if (lat === null || lon === null) { mostraErrore("Coordinate gradi/primi non valide. Esempio: 45 27.8522 N"); return null; }
            return { lat, lon };
        }
        if (formato === "dms") {
            const lat = parseDMSField(document.getElementById("coord-dms-lat").value);
            const lon = parseDMSField(document.getElementById("coord-dms-lon").value);
            if (lat === null || lon === null) { mostraErrore("Coordinate gradi/primi/secondi non valide. Esempio: 45 27 51.1 N"); return null; }
            return { lat, lon };
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
        if (formato === "libero") {
            const testo = (document.getElementById("coord-libero-testo").value || "").trim();
            if (!testo) { mostraErrore("Incolla un testo con delle coordinate."); return null; }
            const risultato = parseTestoLibero(testo);
            if (!risultato) { mostraErrore("Formato non riconosciuto. Prova con 'lat, lon' decimali o un link Google Maps."); return null; }
            return risultato;
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

    let coordMappaLeaflet = null;
    let coordMarkerTarget = null;
    let coordMarkerPartenza = null;
    let coordLineaPercorso = null;
    let coordinateTargetCorrenti = null;
    let modalitaPercorsoAttiva = false;
    let ultimoGeojsonPercorso = null;

    function iconaMarkerGenerica(colore) {
        return L.divIcon({
            className: "",
            html: `<div style="width:18px;height:18px;border-radius:50%;background:${colore};border:2px solid #121212;box-shadow:0 0 6px rgba(0,0,0,.6);"></div>`,
            iconSize: [18, 18],
            iconAnchor: [9, 9],
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
        });

        if (typeof ResizeObserver !== "undefined") {
            const osservatoreDimensione = new ResizeObserver(() => {
                if (coordMappaLeaflet) coordMappaLeaflet.invalidateSize();
            });
            osservatoreDimensione.observe(contenitore);
        }
    }

    assicuraMappaCoordInizializzata();

    const CHIAVE_STORAGE_COMANDO = "fireops_comando_selezionato";
    const ZOOM_INIZIALE_COMANDO = 12;
    let comandoAttivoCache = null;

    function estraiCoordinateComando(comando) {
        if (!comando || !comando["Coordinate"]) return null;
        const parti = comando["Coordinate"].split(",").map(s => parseFloat(s.trim()));
        if (parti.length !== 2 || parti.some(n => Number.isNaN(n))) return null;
        return { lat: parti[0], lon: parti[1] };
    }

    fetch("/FireOps/db/comandi.json")
        .then(r => (r.ok ? r.json() : Promise.reject(new Error("HTTP " + r.status))))
        .then(comandiJson => {
            const nomeComandoAttivo = sessionStorage.getItem(CHIAVE_STORAGE_COMANDO);
            if (!nomeComandoAttivo) return;
            const comandoAttivo = (comandiJson || []).find(c => c.Comando === nomeComandoAttivo);
            comandoAttivoCache = comandoAttivo || null;
            const coord = estraiCoordinateComando(comandoAttivo);
            if (coord && coordMappaLeaflet) coordMappaLeaflet.setView([coord.lat, coord.lon], ZOOM_INIZIALE_COMANDO);
            aggiornaAnteprimaMessaggioCoordinate();
        })
        .catch(err => {
            console.error("Convertitore: impossibile leggere il Comando attivo, resto sulla vista Italia:", err);
        });

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
    const btnScaricaKml = document.getElementById("btn-coord-scarica-kml");

    async function calcolaEDisegnaPercorso(latPartenza, lonPartenza) {
        if (!coordinateTargetCorrenti || !coordMappaLeaflet) return;
        const { lat: latArrivo, lon: lonArrivo } = coordinateTargetCorrenti;
        const profilo = selectProfiloPercorso ? selectProfiloPercorso.value : "trekking";

        if (coordMarkerPartenza) coordMappaLeaflet.removeLayer(coordMarkerPartenza);
        coordMarkerPartenza = L.marker([latPartenza, lonPartenza], { icon: iconaMarkerGenerica(COLORE_SQUADRA) })
            .addTo(coordMappaLeaflet)
            .bindPopup("Squadra VF");

        if (elInfoPercorso) elInfoPercorso.textContent = "Calcolo percorso in corso…";
        if (btnScaricaKml) btnScaricaKml.disabled = true;

        try {
            const url = `https://brouter.de/brouter?lonlats=${lonPartenza},${latPartenza}|${lonArrivo},${latArrivo}&profile=${profilo}&alternativeidx=0&format=geojson`;
            const risposta = await fetch(url);
            if (!risposta.ok) throw new Error("HTTP " + risposta.status);
            const geojson = await risposta.json();
            ultimoGeojsonPercorso = geojson;

            if (coordLineaPercorso) coordMappaLeaflet.removeLayer(coordLineaPercorso);
            coordLineaPercorso = L.geoJSON(geojson, {
                style: { color: COLORE_PERCORSO, weight: 5, opacity: 0.85 },
            }).addTo(coordMappaLeaflet);

            coordMappaLeaflet.fitBounds(coordLineaPercorso.getBounds(), { padding: [30, 30] });

            const proprieta = (geojson.features && geojson.features[0] && geojson.features[0].properties) || {};
            const lunghezzaM = parseFloat(proprieta["track-length"]);
            const tempoS = parseFloat(proprieta["total-time"]);

            let testoInfo = "Percorso calcolato";
            if (!Number.isNaN(lunghezzaM)) testoInfo += ` — ${(lunghezzaM / 1000).toFixed(2)} km`;
            if (!Number.isNaN(tempoS)) testoInfo += ` — circa ${Math.round(tempoS / 60)} min`;
            if (elInfoPercorso) elInfoPercorso.textContent = testoInfo;

            if (btnScaricaKml) btnScaricaKml.disabled = false;
            disegnaGraficoAltimetria(geojson);
        } catch (err) {
            console.error("Errore routing BRouter:", err);
            ultimoGeojsonPercorso = null;
            if (elInfoPercorso) {
                elInfoPercorso.textContent = "Impossibile calcolare il percorso (servizio BRouter non raggiungibile o punto fuori copertura).";
            }
            nascondiGraficoAltimetria("Percorso non calcolato: nessun dato altimetrico disponibile.");
        }
    }

    const btnPercorso = document.getElementById("btn-coord-percorso");
    const btnAnnullaPercorso = document.getElementById("btn-coord-annulla-percorso");

    if (btnPercorso) {
        btnPercorso.addEventListener("click", () => {
            if (!coordinateTargetCorrenti) {
                mostraErrore("Converti prima delle coordinate: serve un punto di arrivo per calcolare il percorso.");
                return;
            }
            modalitaPercorsoAttiva = true;
            btnPercorso.classList.add("attivo");
            btnAnnullaPercorso.style.display = "inline-block";
            if (elInfoPercorso) elInfoPercorso.textContent = "Clicca un punto sulla mappa: verrà calcolato il percorso fino al punto convertito.";
        });
    }

    if (btnAnnullaPercorso) {
        btnAnnullaPercorso.addEventListener("click", () => {
            modalitaPercorsoAttiva = false;
            btnPercorso.classList.remove("attivo");
            btnAnnullaPercorso.style.display = "none";
            if (coordLineaPercorso) { coordMappaLeaflet.removeLayer(coordLineaPercorso); coordLineaPercorso = null; }
            if (coordMarkerPartenza) { coordMappaLeaflet.removeLayer(coordMarkerPartenza); coordMarkerPartenza = null; }
            if (elInfoPercorso) elInfoPercorso.textContent = "";
            ultimoGeojsonPercorso = null;
            if (btnScaricaKml) btnScaricaKml.disabled = true;
            nascondiGraficoAltimetria("");
        });
    }

    function costruisciKml(geojson, nomePercorso) {
        const coords = (geojson.features && geojson.features[0] && geojson.features[0].geometry && geojson.features[0].geometry.coordinates) || [];
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

    if (btnScaricaKml) {
        btnScaricaKml.disabled = true;
        btnScaricaKml.addEventListener("click", () => {
            if (!ultimoGeojsonPercorso) return;
            const kml = costruisciKml(ultimoGeojsonPercorso, "Percorso FireOps VVF");
            const blob = new Blob([kml], { type: "application/vnd.google-earth.kml+xml" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "percorso-fireops.kml";
            a.click();
            URL.revokeObjectURL(url);
        });
    }

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
        if (!canvas) return;

        const coords = (geojson.features && geojson.features[0] && geojson.features[0].geometry && geojson.features[0].geometry.coordinates) || [];
        const conQuota = coords.filter(c => Array.isArray(c) && c.length >= 3 && !Number.isNaN(parseFloat(c[2])));

        if (conQuota.length < 2) {
            nascondiGraficoAltimetria("Dati altimetrici non disponibili per questo percorso (BRouter non li ha forniti).");
            return;
        }

        canvas.style.display = "block";
        const nota = document.getElementById("coord-altimetria-nota");
        if (nota) nota.style.display = "none";

        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        function distanzaKm(lat1, lon1, lat2, lon2) {
            const R = 6371;
            const dLat = (lat2 - lat1) * Math.PI / 180;
            const dLon = (lon2 - lon1) * Math.PI / 180;
            const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
            return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        }

        let distanzaTot = 0;
        const punti = [{ d: 0, ele: parseFloat(conQuota[0][2]) }];
        for (let i = 1; i < conQuota.length; i++) {
            distanzaTot += distanzaKm(conQuota[i - 1][1], conQuota[i - 1][0], conQuota[i][1], conQuota[i][0]);
            punti.push({ d: distanzaTot, ele: parseFloat(conQuota[i][2]) });
        }

        const eleMin = Math.min(...punti.map(p => p.ele));
        const eleMax = Math.max(...punti.map(p => p.ele));
        const margine = 32;
        const w = canvas.width - margine * 2;
        const h = canvas.height - margine * 2;

        ctx.strokeStyle = "#333333";
        ctx.strokeRect(margine, margine, w, h);

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
        ctx.fillText("0 km", margine, canvas.height - 6);
        ctx.fillText(`${distanzaTot.toFixed(1)} km`, margine + w - 34, canvas.height - 6);
    }

    // Pulsante "Copia mappa" rimosso su richiesta: la cattura schermo nativa
    // non dava risultati sufficientemente affidabili da giustificarla.

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
        fetch("/FireOps/db/prefissi.json")
            .then(r => (r.ok ? r.json() : Promise.reject(new Error("HTTP " + r.status))))
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
    const inputCapIndirizzo = document.getElementById("coord-indirizzo-cap");

    if (inputComuneIndirizzo && hiddenComuneIndirizzo && dropdownComuneIndirizzo) {
        fetch("/FireOps/db/comuni.json")
            .then(r => (r.ok ? r.json() : Promise.reject(new Error("HTTP " + r.status))))
            .then(listaComuni => {
                creaComboRicercabileCoord({
                    input: inputComuneIndirizzo,
                    hidden: hiddenComuneIndirizzo,
                    dropdown: dropdownComuneIndirizzo,
                    elenco: listaComuni,
                    cercaValore: c => c.Comune,
                    mostraTesto: c => `${c.Comune} (${c["Sigla Provincia"] || c.Provincia || "?"})`,
                    testoSelezionato: c => c.Comune,
                    // Alla selezione, riempie subito il CAP corrispondente
                    onScelta: c => {
                        if (inputCapIndirizzo && c.CAP) inputCapIndirizzo.value = c.CAP;
                    }
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
        btnConverti.addEventListener("click", async () => {
            nascondiErrore();

            const formatoScelto = selectFormato ? selectFormato.value : "dd";
            let coordinate = null;

            if (formatoScelto === "indirizzo") {
                const via = (document.getElementById("coord-indirizzo-via").value || "").trim();
                const comune = (document.getElementById("coord-indirizzo-comune").value || "").trim();
                const cap = (document.getElementById("coord-indirizzo-cap").value || "").trim();

                if (!via && !comune && !cap) {
                    mostraErrore("Inserisci almeno uno tra indirizzo, comune o CAP.");
                    return;
                }
                try {
                    coordinate = await geocodificaIndirizzo(via, comune, cap);
                } catch (err) {
                    console.error("Geocoding indirizzo non disponibile:", err);
                    mostraErrore("Servizio di geocoding non raggiungibile al momento.");
                    return;
                }
                if (!coordinate) {
                    mostraErrore("Indirizzo non trovato. Prova a essere più specifico.");
                    return;
                }
            } else {
                coordinate = leggiCoordinateSelezionate();
                if (!coordinate) return;
            }

            await elaboraCoordinateConvertite(coordinate.lat, coordinate.lon);
        });
    }

    // Logica di rendering condivisa: usata sia dal pulsante "Converti" sia
    // dal click diretto sulla mappa (che passa già una coppia lat/lon)
    async function elaboraCoordinateConvertite(lat, lon) {
        nascondiErrore();

        if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
            mostraErrore("Coordinate fuori range (latitudine -90/90, longitudine -180/180).");
            return;
        }

        rendiCopiabile(document.getElementById("coord-out-dd"), formattaDDUscita(lat, lon));
        rendiCopiabile(document.getElementById("coord-out-dmm"), formattaDMM(lat, lon));
        rendiCopiabile(document.getElementById("coord-out-dms"), formattaDMS(lat, lon));
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

        const elToponimo = document.getElementById("coord-out-toponimo");
        if (elToponimo) { elToponimo.textContent = "Ricerca in corso…"; elToponimo.classList.remove("cliccabile"); elToponimo.onclick = null; }

        const elQuota = document.getElementById("coord-out-quota");
        if (elQuota) { elQuota.textContent = "Ricerca in corso…"; elQuota.classList.remove("cliccabile"); elQuota.onclick = null; }

        if (elRisultati) elRisultati.style.display = "block";
        const elDatiNotaVuota = document.getElementById("coord-dati-nota-vuota");
        if (elDatiNotaVuota) elDatiNotaVuota.style.display = "none";

        centraMappaSulTarget(lat, lon);
        aggiornaAnteprimaMessaggioCoordinate();

        modalitaPercorsoAttiva = false;
        if (btnPercorso) btnPercorso.classList.remove("attivo");
        if (btnAnnullaPercorso) btnAnnullaPercorso.style.display = "none";
        if (coordLineaPercorso && coordMappaLeaflet) { coordMappaLeaflet.removeLayer(coordLineaPercorso); coordLineaPercorso = null; }
        if (coordMarkerPartenza && coordMappaLeaflet) { coordMappaLeaflet.removeLayer(coordMarkerPartenza); coordMarkerPartenza = null; }
        if (elInfoPercorso) elInfoPercorso.textContent = "";
        ultimoGeojsonPercorso = null;
        if (btnScaricaKml) btnScaricaKml.disabled = true;
        nascondiGraficoAltimetria("");

        const [toponimo, quota] = await Promise.all([
            geocodingInverso(lat, lon),
            recuperaQuota(lat, lon),
        ]);
        rendiCopiabile(elToponimo, toponimo);
        rendiCopiabile(elQuota, quota);
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
