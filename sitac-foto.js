/*!
 * FireOps VVF — sitac-foto.js — scheda 3 "SITAC da immagine"
 *
 * La scheda ospita sitac-immagine.html in un <iframe>: una seconda SITAC
 * completa, con tutti gli strumenti della tavola, disegnata su una foto
 * invece che sulla mappa. Non chiede la posizione del DOS. I dati
 * dell'intervento li legge dalla scheda 1 di questa pagina.
 * L'iframe si crea alla prima apertura della scheda, non all'avvio.
 * Lo stesso file serve l'app Pro (app/sitac.html), che prende lo stesso markup.
 */
(function () {
'use strict';

/* L'iframe usa srcdoc con <base> sulla cartella del sito: così, nell'app Pro
   (app/sitac.html), resta sotto il service worker dell'app e va anche offline. */
/* Da quale pagina sitac-immagine.html prende il markup della SITAC: la stessa che la contiene */
window.FireOpsSitacMarkup = /index-bis\.html$/.test(location.pathname) ? 'index-bis.html' : 'index.html';

const radice = () => new URL(/\/app\//.test(location.pathname) ? '../' : './', location.href).href;

function monta(box){
  if (box.dataset.pronto) return;
  box.dataset.pronto = '1';
  const f = document.createElement('iframe');
  f.className = 'sitac-immagine-frame';
  f.allow = 'camera; fullscreen';   // fotocamera dentro la pagina (Scatta foto)
  f.title = 'SITAC da immagine';
  box.appendChild(f);
  fetch(radice() + 'sitac-immagine.html?v=' + encodeURIComponent(window.FIREOPS_VERSIONE || ''))
    .then(r => r.text())
    .then(t => { f.srcdoc = t.replace(/<head>/i, '<head><base href="' + radice() + '">'); })
    .catch(() => { box.innerHTML = '<p style="padding:20px">⚠️ SITAC da immagine non disponibile senza rete al primo uso.</p>'; delete box.dataset.pronto; });
}

function cerca(){
  const box = document.getElementById('sitac-foto');
  if (!box) return false;
  const guarda = () => {
    if (!box.classList.contains('attivo')) return;
    monta(box);
    const f = box.querySelector('iframe');
    try { f && f.contentWindow.FireOpsSitacImmagine && f.contentWindow.FireOpsSitacImmagine.ridisegna(); } catch (e) {}
  };
  new MutationObserver(guarda).observe(box, {attributes: true, attributeFilter: ['class']});
  guarda();
  return true;
}
/* Nell'app Pro il markup arriva dopo (fetch di index.html): si riprova un po' */
if (!cerca()){
  let n = 0;
  const t = setInterval(() => { if (cerca() || ++n > 60) clearInterval(t); }, 500);
}
})();
