/* ==========================================================================
   terremoti.js — eventi sismici INGV

   Dati dal servizio fdsnws-event dell'INGV (webservices.ingv.it), lo stesso
   che alimenta terremoti.ingv.it. Formato 'text': una riga per evento, campi
   separati da barra verticale — più leggero dell'XML QuakeML e con dentro
   tutto quello che serve in Sala.

   Interrogazione diretta dal browser: se l'INGV non concede il CORS, la
   lettura fallisce e la pagina lo dice invece di restare vuota; in quel caso
   la stessa query si sposta nell'Action del notiziario, che scrive
   db/terremoti.json, e qui basta cambiare la sola funzione scarica().

   Da aggiungere all'array MODULI in index.html.
   ========================================================================== */
(function () {
    'use strict';

    const SERVIZIO = 'https://webservices.ingv.it/fdsnws/event/1/query';
    const SCHEDA_EVENTO = 'https://terremoti.ingv.it/event/';
    const RINFRESCO = 5 * 60 * 1000;

    // Riquadro Italia, largo abbastanza da prendere mare e confini.
    const ITALIA = {minlatitude: 35, maxlatitude: 48, minlongitude: 5.5, maxlongitude: 19.5};
    // Centro geografico approssimato, per la ricerca circolare.
    const CENTRO = {lat: 42.5, lon: 12.5};

    const AMBITI = {
        italia:   {etichetta: 'Italia',                mag: 3},
        allargato:{etichetta: 'Italia + 1000 km',      mag: 3},
        comando:  {etichetta: 'Vicino al Comando',     mag: 2}
    };

    const PERIODI = {
        '1':  'Ultime 24 ore',
        '7':  'Ultimi 7 giorni',
        '30': 'Ultimi 30 giorni'
    };

    let mappa = null, gruppo = null, osservatore = null;
    let eventi = [], ultimo = null, rinfresco = null;
    const el = {};

    /* ---------- utilità -------------------------------------------------- */

    const q = id => document.getElementById(id);

    const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c =>
        ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));

    // Distanza in chilometri fra due punti (formula dell'emisenoverso).
    function distanzaKm(a, b) {
        const R = 6371, rad = g => g * Math.PI / 180;
        const dLat = rad(b.lat - a.lat), dLon = rad(b.lon - a.lon);
        const x = Math.sin(dLat / 2) ** 2 +
            Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
        return 2 * R * Math.asin(Math.sqrt(x));
    }

    /* La scala dei colori è quella che si usa per leggere una lista a colpo
       d'occhio: sotto 3 non richiede nulla, 4 è avvertito dalla popolazione,
       5 può fare danni, oltre 5.5 è un evento da attivazione. */
    function classeMagnitudo(m) {
        if (m >= 5.5) return 'sisma-grave';
        if (m >= 4.5) return 'sisma-forte';
        if (m >= 3.5) return 'sisma-medio';
        return 'sisma-lieve';
    }

    function coordinateComando() {
        const c = window.FireOpsComandoAttivo;
        if (!c || !c.Coordinate) return null;
        const p = String(c.Coordinate).split(',').map(s => parseFloat(s.trim()));
        if (p.length !== 2 || p.some(Number.isNaN)) return null;
        return {lat: p[0], lon: p[1], nome: c.Comando};
    }

    /* ---------- interrogazione ------------------------------------------ */

    function parametri() {
        const ambito = el.ambito.value;
        const giorni = Number(el.periodo.value);
        const da = new Date(Date.now() - giorni * 24 * 3600 * 1000);

        const p = new URLSearchParams({
            starttime: da.toISOString().slice(0, 19),
            minmag: el.magnitudo.value,
            format: 'text',
            orderby: 'time',
            limit: '400'
        });

        if (ambito === 'italia') {
            Object.entries(ITALIA).forEach(([k, v]) => p.set(k, String(v)));
        } else if (ambito === 'allargato') {
            p.set('lat', String(CENTRO.lat));
            p.set('lon', String(CENTRO.lon));
            p.set('maxradiuskm', '1000');
        } else {
            const c = coordinateComando();
            if (!c) return null;
            p.set('lat', String(c.lat));
            p.set('lon', String(c.lon));
            p.set('maxradiuskm', el.raggio.value);
        }
        return p;
    }

    // Riga: EventID|Time|Lat|Lon|Depth|Author|Catalog|Contributor|
    //       ContributorID|MagType|Magnitude|MagAuthor|LocationName|EventType
    function leggiTesto(testo) {
        return testo.split('\n')
            .filter(r => r.trim() && !r.startsWith('#'))
            .map(r => r.split('|'))
            .filter(c => c.length >= 13)
            .map(c => ({
                id: c[0].trim(),
                quando: new Date(c[1] + 'Z'),
                lat: parseFloat(c[2]),
                lon: parseFloat(c[3]),
                profondita: parseFloat(c[4]),
                tipoMag: c[9].trim(),
                magnitudo: parseFloat(c[10]),
                luogo: c[12].trim(),
                tipo: (c[13] || '').trim()
            }))
            .filter(e => Number.isFinite(e.magnitudo) && Number.isFinite(e.lat));
    }

    async function scarica() {
        const p = parametri();
        if (!p) {
            stato('Nessun Comando attivo: scegli un altro ambito o seleziona un Comando.', true);
            return;
        }
        stato('Interrogazione INGV in corso…');
        try {
            const r = await fetch(`${SERVIZIO}?${p.toString()}`);
            // 204: la query è valida ma non ha prodotto eventi.
            if (r.status === 204) { eventi = []; disegna(); return; }
            if (!r.ok) throw new Error('HTTP ' + r.status);
            eventi = leggiTesto(await r.text());
            ultimo = new Date();
            disegna();
        } catch (err) {
            console.error('[terremoti] INGV non raggiungibile', err);
            stato('Dati INGV non raggiungibili dal browser. ' +
                  'Riprova fra qualche minuto: se l\'errore resta, il servizio ' +
                  'non consente la lettura diretta e va spostato nell\'aggregatore.', true);
        }
    }

    /* ---------- resa ----------------------------------------------------- */

    function stato(testo, errore) {
        el.stato.textContent = testo;
        el.stato.classList.toggle('sisma-errore', !!errore);
    }

    function disegna() {
        const base = coordinateComando();

        if (base) eventi.forEach(e => {
            e.distanza = distanzaKm(base, {lat: e.lat, lon: e.lon});
        });

        el.tabella.innerHTML = eventi.length ? eventi.map(e => {
            const ora = e.quando.toLocaleString('it-IT',
                {day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'});
            return `<tr data-id="${esc(e.id)}">
                <td class="sisma-ora">${esc(ora)}</td>
                <td><span class="sisma-mag ${classeMagnitudo(e.magnitudo)}">`
                + `${e.magnitudo.toFixed(1)}</span>`
                + `<small> ${esc(e.tipoMag)}</small></td>
                <td>${Number.isFinite(e.profondita) ? Math.round(e.profondita) + ' km' : '—'}</td>
                <td class="sisma-luogo">${esc(e.luogo)}</td>
                <td>${e.distanza != null ? Math.round(e.distanza) + ' km' : '—'}</td>
                <td><a href="${SCHEDA_EVENTO}${encodeURIComponent(e.id)}"
                       target="_blank" rel="noopener">scheda</a></td>
            </tr>`;
        }).join('') : `<tr><td colspan="6" class="pagina-nota">Nessun evento con questi criteri.</td></tr>`;

        stato(`${eventi.length} eventi · aggiornato alle ` +
              (ultimo ? ultimo.toLocaleTimeString('it-IT') : '—') +
              (base ? ` · distanze da ${base.nome}` : ''));

        disegnaMappa(base);
    }

    function disegnaMappa(base) {
        if (typeof L === 'undefined' || !el.mappa) return;

        if (!mappa) {
            mappa = L.map(el.mappa).setView([CENTRO.lat, CENTRO.lon], 5);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                maxZoom: 19,
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            }).addTo(mappa);
            gruppo = L.layerGroup().addTo(mappa);
            /* La sezione vive nei pannelli e nel magazzino nascosto: quando
               ricompare Leaflet crede ancora di essere largo zero. */
            osservatore = new ResizeObserver(() => mappa.invalidateSize());
            osservatore.observe(el.mappa);
        }

        gruppo.clearLayers();

        if (base) {
            L.circleMarker([base.lat, base.lon], {
                radius: 6, color: '#fff', weight: 2,
                fillColor: '#af2b1e', fillOpacity: 1
            }).addTo(gruppo).bindTooltip('Comando ' + base.nome);
        }

        eventi.forEach(e => {
            // Il raggio cresce con la magnitudo, non in proporzione: un 5
            // e un 3 devono distinguersi senza che il 5 copra mezza regione.
            const cerchio = L.circleMarker([e.lat, e.lon], {
                radius: 3 + Math.max(0, e.magnitudo - 1.5) * 2.6,
                weight: 1,
                color: '#333',
                fillColor: coloreMagnitudo(e.magnitudo),
                fillOpacity: .75
            }).addTo(gruppo);
            cerchio.bindPopup(
                `<b>M ${e.magnitudo.toFixed(1)}</b> ${esc(e.tipoMag)}<br>${esc(e.luogo)}<br>`
                + `${e.quando.toLocaleString('it-IT')}<br>`
                + `Profondità ${Math.round(e.profondita)} km<br>`
                + `<a href="${SCHEDA_EVENTO}${encodeURIComponent(e.id)}" target="_blank"
                     rel="noopener">Scheda INGV</a>`);
            cerchio._idEvento = e.id;
        });

        if (eventi.length) {
            const b = L.latLngBounds(eventi.map(e => [e.lat, e.lon]));
            if (base) b.extend([base.lat, base.lon]);
            mappa.fitBounds(b, {padding: [24, 24], maxZoom: 9});
        }
    }

    function coloreMagnitudo(m) {
        if (m >= 5.5) return '#7a0000';
        if (m >= 4.5) return '#d43d1a';
        if (m >= 3.5) return '#e8a33d';
        return '#f2e06b';
    }

    /* ---------- avvio ---------------------------------------------------- */

    function avvia() {
        el.mappa = q('terremoti-mappa');
        el.tabella = q('terremoti-tabella');
        if (!el.tabella) return;              // sezione non presente

        el.ambito = q('terremoti-ambito');
        el.periodo = q('terremoti-periodo');
        el.magnitudo = q('terremoti-magnitudo');
        el.raggio = q('terremoti-raggio');
        el.stato = q('terremoti-stato');

        Object.entries(AMBITI).forEach(([k, v]) => {
            el.ambito.add(new Option(v.etichetta, k));
        });
        Object.entries(PERIODI).forEach(([k, v]) => {
            el.periodo.add(new Option(v, k));
        });
        el.ambito.value = 'italia';
        el.periodo.value = '7';
        el.magnitudo.value = '3';

        function cambiaAmbito() {
            const a = AMBITI[el.ambito.value];
            el.magnitudo.value = String(a.mag);
            el.raggio.closest('.terremoti-campo').hidden = el.ambito.value !== 'comando';
            scarica();
        }

        el.ambito.addEventListener('change', cambiaAmbito);
        [el.periodo, el.magnitudo, el.raggio]
            .forEach(x => x.addEventListener('change', scarica));
        const bAggiorna = q('terremoti-aggiorna');
        if (bAggiorna) bAggiorna.addEventListener('click', scarica);

        // Cliccando una riga si va sull'evento nella carta.
        el.tabella.addEventListener('click', ev => {
            const riga = ev.target.closest('tr[data-id]');
            if (!riga || ev.target.tagName === 'A' || !gruppo) return;
            gruppo.eachLayer(l => {
                if (l._idEvento !== riga.dataset.id) return;
                mappa.setView(l.getLatLng(), Math.max(mappa.getZoom(), 8));
                l.openPopup();
            });
        });

        // Le distanze sono riferite al Comando: cambiandolo vanno rifatte.
        document.addEventListener('fireops:comando-attivo-cambiato', () => {
            if (el.ambito.value === 'comando') scarica();
            else if (eventi.length) disegna();
        });

        el.raggio.closest('.terremoti-campo').hidden = true;
        scarica();
        rinfresco = setInterval(scarica, RINFRESCO);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', avvia);
    } else {
        avvia();
    }
})();