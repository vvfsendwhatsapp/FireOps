// ==========================================================
// FireOps VVF — ELENCO, ORDINE E STATO DELLE SCHEDE
//
// Unico posto in cui si decide:
//   - quali pagine compaiono nei due elenchi a comparsa e in che ordine
//   - come si chiamano a schermo
//   - quali sono in lavorazione (prefisso 🚧)
//   - quale scheda si apre all'avvio in ciascun pannello
//
// L'id deve corrispondere all'id della <section class="page-section">
// in index.html: è quello che script.js sposta fra pannelli e magazzino.
// Una pagina tolta da qui sparisce dai selettori ma resta nel DOM, quindi
// per rimuoverla davvero va tolta anche la sezione dall'HTML.
//
// Va caricato PRIMA di script.js: è solo dati, non tocca il DOM.
// ==========================================================
window.FireOpsSchede = {

    // ORDINE DELL'ELENCO A COMPARSA — spostare le righe per riordinare.
    // lavori: true  →  la voce compare come "🚧 Nome scheda", ma resta
    // selezionabile. Quando la sezione è pronta, si toglie la proprietà.
    pagine: [
        { id: "homepage", label: "Home page - Informazioni generali comando" },
        { id: "messaggistica", label: "Messaggistica" },
        { id: "contatti", label: "Link utili" },
        { id: "info-comando", label: "Info altro Comando" },
        { id: "mappa-meteo", label: "Meteo locale" },
        { id: "sitac-aib", label: "SITAC AIB" },
        { id: "convertitore", label: "Convertitore coordinate e calcolo percorso" },
        { id: "convertitoreunita", label: "Convertitore unità" },
        { id: "turnario", label: "Turnario" },
        { id: "moduli-cmr", label: "Moduli CMR" },
        { id: "sostanze-pericolose", label: "Sostanze pericolose" },
        { id: "terremoti", label: "Terremoti INGV" },
        { id: "normative", label: "Normative, Circolari e Disposizioni" },
        { id: "qrcode", label: "QrCode" },
        { id: "gestione-fpds", label: "Gestione interventi FPDS", lavori: true },
        { id: "schede-soccorso", label: "Schede di soccorso", lavori: true },
        { id: "radio-telefoni", label: "Radio e telefoni", lavori: true }
    ],

    // Schede aperte all'apertura di una sessione nuova. Dentro la stessa
    // sessione vince quello che ha scelto l'operatore (sessionStorage).
    predefinite: {
        sinistra: "homepage",
        destra: "messaggistica"
    },

    // Pagina di servizio con cui riempire un pannello rimasto senza
    // contenuto (uscita da SITAC/Convertitore, scambio impossibile).
    // Tenuta distinta dalle predefinite di proposito: chiudendo la SITAC
    // è meglio ritrovarsi il meteo che il campo numero della
    // Messaggistica, che si prende il focus da solo.
    ripiego: {
        sinistra: "homepage",
        destra: "mappa-meteo"
    }
};