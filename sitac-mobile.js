/*!
 * FireOps VVF — sitac-mobile.js — SITAC sul telefono
 *
 * Su schermo da telefono (SITAC stretta e finestra sotto 760 px) la carta
 * prende tutto lo spazio e gli strumenti stanno in un pannello che sale dal
 * basso: si apre con "🧰 Strumenti", si chiude da solo appena si sceglie
 * uno strumento, così si disegna con la carta intera davanti.
 * Vale per la SITAC planimetrica e per la SITAC da immagine, sul sito aperto
 * dal telefono e nell'app FireOps Pro. Su computer non cambia niente.
 * Lo stile sta in style.css (blocco "SITAC sul telefono").
 */
(function () {
'use strict';

const SOGLIA = 760;

function prepara(app){
  if (app.dataset.mobilePronto) return;
  app.dataset.mobilePronto = '1';
  const wrap = app.querySelector('.sitac-mapwrap');
  const barra = app.querySelector('#sitac-barra');
  if (!wrap || !barra) return;

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'sitac-m-strumenti';
  btn.innerHTML = '🧰 Strumenti';
  wrap.appendChild(btn);

  const chiudi = document.createElement('button');
  chiudi.type = 'button';
  chiudi.className = 'sitac-m-chiudi';
  chiudi.innerHTML = '<span class="sitac-m-maniglia"></span>Chiudi strumenti ✕';
  barra.insertBefore(chiudi, barra.firstChild);

  const apri = si => {
    app.classList.toggle('sitac-barra-aperta', si);
    btn.innerHTML = si ? '🗺 Carta' : '🧰 Strumenti';
  };
  btn.onclick = () => apri(!app.classList.contains('sitac-barra-aperta'));
  chiudi.onclick = () => apri(false);

  /* Scelto uno strumento (simbolo, linea, area, azione, modifica) si torna
     alla carta: il prossimo tocco è già sulla mappa. Le intestazioni delle
     fisarmoniche e gli interruttori di stato invece restano nel pannello. */
  barra.addEventListener('click', e => {
    if (!app.classList.contains('sitac-mobile')) return;
    const b = e.target.closest('button');
    if (!b || b.classList.contains('sitac-fisa-testa') || b === chiudi) return;
    if (b.dataset.genere || /^sitac-b(Modifica|Elimina)$/.test(b.id)) setTimeout(() => apri(false), 120);
  }, true);
}

function aggiorna(){
  const app = document.getElementById('sitac-app');
  if (!app) return false;
  const m = app.classList.contains('sitac-stretto') && window.innerWidth < SOGLIA;
  if (m) prepara(app);
  if (app.classList.contains('sitac-mobile') !== m){
    app.classList.toggle('sitac-mobile', m);
    if (!m) app.classList.remove('sitac-barra-aperta');
    const i = window.FireOps && FireOps.Sitac && FireOps.Sitac.get && FireOps.Sitac.get();
    if (i) setTimeout(() => i.ridisegna(), 60);
  }
  return true;
}

function avvia(){
  const app = document.getElementById('sitac-app');
  if (!app) return false;
  new MutationObserver(aggiorna).observe(app, {attributes: true, attributeFilter: ['class']});
  window.addEventListener('resize', aggiorna);
  aggiorna();
  return true;
}
if (!avvia()){
  let n = 0;
  const t = setInterval(() => { if (avvia() || ++n > 60) clearInterval(t); }, 500);
}
})();
