/* ============================================================
   FireOps — Link "invio coordinate" nel modulo Messaggistica
   Basato sulla struttura reale di index.html:
   - #msg-chk-link-coordinate  checkbox
   - #msg-riga-link-coordinate riga con i due campi (nascosta finché
     la checkbox non è spuntata)
   - #msg-numero-intervento    numero intervento (6 cifre)
   - #msg-anno-intervento      select anno (popolato qui sotto)
   - #msg-lingua               input hidden già esistente, contiene
     il codice lingua corrente (it/en/fr/...)
   - sessionStorage 'fireops_comando_selezionato' contiene il NOME
     del comando attivo (stringa) — va incrociato con l'array
     comandi.json già caricato altrove in script.js per ottenere
     Provincia e Comune. Vedi TODO in trovaComandoAttivo().
   ============================================================ */

// ----------------------------------------------------------
// 1) CALCOLO SIGLA (Comando o Direzione) — dati letti dalla fonte,
//    nessuna tabella scritta a mano.
// ----------------------------------------------------------

function siglaComando(comandoObj) {
  if (!comandoObj || !comandoObj.Provincia) return '';
  return 'Com' + String(comandoObj.Provincia).trim().toUpperCase();
}

function siglaDirezione(nomeDirezione) {
  if (!nomeDirezione) return '';
  const primaParola = String(nomeDirezione).trim().split(/[\s'-]/)[0];
  return primaParola.slice(0, 3).toUpperCase() + 'DR';
}

function siglaEntita(entita) {
  if (!entita) return '';
  if (typeof entita === 'string') return siglaDirezione(entita);
  if (entita.Provincia) return siglaComando(entita);
  if (entita['Direzione VVF']) return siglaDirezione(entita['Direzione VVF']);
  return '';
}

// ----------------------------------------------------------
// 2) ID_RICERCA: "NNNNNN_AAAA_Sigla"
// ----------------------------------------------------------

function costruisciIdRicerca(numeroIntervento, annoIntervento, sigla) {
  const numeroPad = String(numeroIntervento).replace(/\D/g, '').padStart(6, '0').slice(-6);
  return numeroPad + '_' + annoIntervento + '_' + sigla;
}

// ----------------------------------------------------------
// 3) INIZIALIZZAZIONE UI (da chiamare una volta, es. in
//    DOMContentLoaded o subito dopo aver iniettato il markup)
// ----------------------------------------------------------

function initLinkCoordinateUI() {
  const checkbox = document.getElementById('msg-chk-link-coordinate');
  const riga = document.getElementById('msg-riga-link-coordinate');
  const inputNumero = document.getElementById('msg-numero-intervento');
  const selectAnno = document.getElementById('msg-anno-intervento');

  if (!checkbox || !riga || !inputNumero || !selectAnno) {
    console.warn('FireOps Locator: elementi UI non trovati, markup non ancora inserito?');
    return;
  }

  // Popola l'anno: corrente ± 1, default corrente
  const annoCorrente = new Date().getFullYear();
  [annoCorrente - 1, annoCorrente, annoCorrente + 1].forEach(anno => {
    const opt = document.createElement('option');
    opt.value = anno;
    opt.textContent = anno;
    if (anno === annoCorrente) opt.selected = true;
    selectAnno.appendChild(opt);
  });

  function aggiornaVisibilitaEObbligatorieta() {
    riga.style.display = checkbox.checked ? 'flex' : 'none';
    const numeroVuoto = inputNumero.value.trim() === '';
    const obbligatorio = checkbox.checked && numeroVuoto;
    inputNumero.style.borderColor = obbligatorio ? 'var(--danger-color, #d32f2f)' : '';
    inputNumero.style.outline = obbligatorio ? '1px solid var(--danger-color, #d32f2f)' : '';
  }

  checkbox.addEventListener('change', aggiornaVisibilitaEObbligatorieta);
  inputNumero.addEventListener('input', () => {
    inputNumero.value = inputNumero.value.replace(/\D/g, '').slice(0, 6);
    aggiornaVisibilitaEObbligatorieta();
  });

  aggiornaVisibilitaEObbligatorieta();
}

// ----------------------------------------------------------
// 4) RICERCA COMANDO ATTIVO
// ----------------------------------------------------------

/**
 * TODO: sostituire con il modo reale in cui script.js accede
 * all'array di comandi già caricato (quello usato per popolare
 * #select-comando, #altro-comando-select, #rt-comandi-list).
 * Qui ipotizzo una funzione/variabile globale come esempio:
 * window.FireOpsDati.comandi — va adattata al nome vero.
 */
function trovaComandoAttivo() {
  const nomeComando = sessionStorage.getItem('fireops_comando_selezionato');
  if (!nomeComando) return null;

  const elencoComandi = (window.FireOpsDati && window.FireOpsDati.comandi) || []; // TODO: adattare
  return elencoComandi.find(c => c.Comando === nomeComando) || null;
}

// ----------------------------------------------------------
// 5) GENERAZIONE LINK
// ----------------------------------------------------------

const URL_BASE_LOCATOR = 'https://vvfsendwhatsapp.github.io/FireOps/html/locator.html'; // TODO: verifica il path reale

function generaLinkLocator(comandoObj, numeroIntervento, annoIntervento, lingua) {
  const sigla = siglaEntita(comandoObj);
  const id = costruisciIdRicerca(numeroIntervento, annoIntervento, sigla);
  const params = new URLSearchParams({
    id: id,
    comando: comandoObj.Comando || '',
    sede: comandoObj.Comune || comandoObj.Comando || '',
    lingua: lingua || 'it'
  });
  return URL_BASE_LOCATOR + '?' + params.toString();
}

/**
 * Da chiamare nel punto di script.js dove oggi viene composto il
 * testo di #msg-testo, per aggiungere la riga con il link — se la
 * checkbox è spuntata e i campi obbligatori sono compilati.
 * Ritorna '' se la checkbox non è spuntata o mancano dati, così si
 * può fare semplicemente: testoMessaggio += rigaLinkCoordinate();
 */
function rigaLinkCoordinate() {
  const checkbox = document.getElementById('msg-chk-link-coordinate');
  if (!checkbox || !checkbox.checked) return '';

  const inputNumero = document.getElementById('msg-numero-intervento');
  const selectAnno = document.getElementById('msg-anno-intervento');
  const lingua = (document.getElementById('msg-lingua') || {}).value || 'it';

  if (!inputNumero.value.trim()) {
    console.warn('FireOps Locator: numero intervento mancante, link non generato.');
    return '';
  }

  const comandoObj = trovaComandoAttivo();
  if (!comandoObj) {
    console.warn('FireOps Locator: comando attivo non trovato, link non generato.');
    return '';
  }

  const link = generaLinkLocator(comandoObj, inputNumero.value, selectAnno.value, lingua);
  return '\n📍 Invia la tua posizione: ' + link;
}

// Avvio automatico quando il DOM è pronto
document.addEventListener('DOMContentLoaded', initLinkCoordinateUI);