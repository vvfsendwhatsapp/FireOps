/*!
 * FireOps VVF — sitac-scheda3d.js — scheda 3 "SITAC 3D"
 *
 * La vista 3D della SITAC planimetrica dentro la SITAC stessa, come scheda.
 * È la stessa pagina che prima si apriva solo in una finestra a parte
 * (sitac-3d.html, dal passo Importa ed Esporta), messa in un <iframe>.
 * Si guarda e basta: si disegna nella SITAC planimetrica. La scheda si apre
 * dopo la convalida dei dati (la sblocca sitac.js insieme alla carta) e a
 * ogni apertura riceve il disegno aggiornato.
 */
(function () {
'use strict';

const pagina = () => (/\/app\//.test(location.pathname) ? '../' : '') + 'sitac-3d.html?v='
  + encodeURIComponent(window.FIREOPS_VERSIONE || '');

let frame = null;

function istanza() {
  return window.FireOps && FireOps.Sitac && FireOps.Sitac.get && FireOps.Sitac.get();
}
function invia() {
  const i = istanza();
  if (!frame || !frame.contentWindow || !i || !i.dati3D) return;
  try { frame.contentWindow.postMessage(i.dati3D(), '*'); } catch (e) { /* niente */ }
}

/* La pagina 3D dice "ci sono" quando è pronta: le si mandano i dati */
window.addEventListener('message', ev => {
  if (!frame || ev.source !== frame.contentWindow) return;
  if (ev.data && ev.data.fireops === 'sitac3d-pronto') invia();
});

function cerca() {
  const box = document.getElementById('sitac-3d');
  if (!box) return false;
  const guarda = () => {
    if (!box.classList.contains('attivo')) return;
    if (!frame) {
      frame = document.createElement('iframe');
      frame.className = 'sitac-3d-frame';
      frame.title = 'SITAC 3D';
      frame.src = pagina();
      box.appendChild(frame);
    } else invia();   // disegno aggiornato a ogni apertura della scheda
  };
  new MutationObserver(guarda).observe(box, {attributes: true, attributeFilter: ['class']});
  guarda();
  return true;
}
/* Nell'app Pro il markup arriva dopo (fetch di index.html): si riprova un po' */
if (!cerca()) {
  let n = 0;
  const t = setInterval(() => { if (cerca() || ++n > 60) clearInterval(t); }, 500);
}
})();
