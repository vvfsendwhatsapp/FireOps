/* Versione della sola index-bis.html (BIS - Test).
   È separata da versione.js apposta: cambiare questo numero aggiorna la BIS
   (cache dei moduli e barra "Aggiorna") senza toccare la produzione.
   Si aggiorna versione.js solo quando una modifica deve arrivare anche
   in index.html.

   Attenzione: separa le versioni, non i file. I moduli caricati da tutte e
   due le pagine (fireops-core.js, script.js, turnario.js, sitac*.js,
   style.css...) restano condivisi: se una modifica deve stare solo in BIS,
   va fatta su una copia -bis del file (come schede-bis.js,
   messaggistica-bis.js) e le regole CSS solo BIS vanno in style-bis.css. */
const FIREOPS_VERSIONE = "202610281915";
window.FIREOPS_VERSIONE = FIREOPS_VERSIONE;
window.FIREOPS_VERSIONE_FILE = "versione-bis.js"; // letto da utilizzo.js per la barra "Aggiorna"

document.write(`<link rel="stylesheet" href="style.css?v=${FIREOPS_VERSIONE}">`);
document.write(`<link rel="stylesheet" href="style-bis.css?v=${FIREOPS_VERSIONE}">`);
