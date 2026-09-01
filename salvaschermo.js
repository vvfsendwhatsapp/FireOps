/* ==========================================================================
   salvaschermo.js — banner in dissolvenza dopo un'ora di inattività

   Non copre l'interfaccia: è una fascia semitrasparente che scorre
   lentamente sullo schermo, con il logo. Lo scorrimento non è un effetto:
   un'immagine ferma per ore marchia i pannelli OLED, e in Sala il monitor
   resta acceso sulla stessa schermata tutta la notte.

   Il banner non intercetta i click (pointer-events: none): qualsiasi cosa
   ci finisca sotto resta cliccabile, e il primo movimento lo spegne.

   Da aggiungere all'array MODULI in index.html.
   ========================================================================== */
(function () {
    'use strict';

    const ATTESA = 60 * 60 * 1000;      // un'ora di inattività
    const IMMAGINE = 'images/mask.png';

    let banner = null;
    let timer = null;
    let acceso = false;

    function crea() {
        if (banner) return banner;
        banner = document.createElement('div');
        banner.id = 'salvaschermo';
        banner.setAttribute('aria-hidden', 'true');
        banner.innerHTML =
            `<div class="salvaschermo-banner">
                 <img src="${IMMAGINE}" alt="">
                 <div class="salvaschermo-ora"></div>
             </div>`;
        document.body.appendChild(banner);
        return banner;
    }

    function aggiornaOra() {
        if (!acceso || !banner) return;
        const q = banner.querySelector('.salvaschermo-ora');
        if (q) q.textContent = new Date().toLocaleTimeString('it-IT',
            {hour: '2-digit', minute: '2-digit'});
    }

    function accendi() {
        /* Mai durante la stampa: il foglio è a schermo per il tempo che
           serve a Leaflet, e un banner ci finirebbe sopra. */
        if (document.body.classList.contains('sitac-stampa')) { riarma(); return; }
        if (document.hidden) { riarma(); return; }
        crea();
        acceso = true;
        aggiornaOra();
        banner.classList.add('attivo');
    }

    function spegni() {
        if (!acceso) return;
        acceso = false;
        if (banner) banner.classList.remove('attivo');
    }

    function riarma() {
        clearTimeout(timer);
        timer = setTimeout(accendi, ATTESA);
    }

    function attivita() {
        spegni();
        riarma();
    }

    ['mousemove', 'mousedown', 'keydown', 'wheel', 'touchstart', 'scroll']
        .forEach(evento => document.addEventListener(evento, attivita, {passive: true}));

    document.addEventListener('visibilitychange', () => {
        if (document.hidden) spegni();
        riarma();
    });

    setInterval(aggiornaOra, 30000);
    riarma();
})();