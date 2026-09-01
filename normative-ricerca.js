/* ==========================================================================
   normative-ricerca.js — ricerca a testo libero dentro TUTTE le norme

   Come funziona, in breve:
   - le fonti NON si configurano qui: il modulo legge i data-fonte già presenti
     in #normative-contenuto, quindi ogni norma che aggiungi in futuro entra
     automaticamente nella ricerca (compreso il DPR 64/2012 già in elenco);
   - l'indice si costruisce una volta sola, al primo uso della casella di
     ricerca (o al primo focus, per essere già pronti quando si digita);
   - la lettura del JSON è generica: non impone una struttura, ma riconosce i
     campi di testo (testo, commi, contenuto...) e quelli di intestazione
     (articolo, rubrica, capo, sezione...) a qualsiasi profondità. Se un domani
     una norma arriva con uno schema diverso, viene indicizzata lo stesso.

   Dipendenze: nessuna. Va caricato dopo script.js.
   ========================================================================== */
(function () {
    'use strict';

    const MIN_CARATTERI = 3;      // sotto questa soglia non si cerca
    const MAX_RISULTATI = 60;     // tetto ai risultati mostrati
    const CONTORNO = 110;         // caratteri di contesto attorno alla parola trovata

    // Campi che, se presenti, danno il NOME del pezzo di norma (breadcrumb).
    const CAMPI_ETICHETTA = [
        'etichetta', 'codice', 'articolo', 'art', 'numero', 'num', 'n',
        'rubrica', 'titolo', 'intestazione', 'nome', 'capo', 'sezione', 'parte'
    ];

    // Campi che contengono il TESTO vero e proprio.
    const CAMPI_TESTO = [
        'testo', 'contenuto', 'commi', 'comma', 'corpo', 'paragrafi',
        'periodi', 'text', 'body'
    ];

    /* ---------- normalizzazione -------------------------------------------
       Le accenti si sostituiscono UNA A UNA e non con NFD: così la stringa
       normalizzata ha la stessa lunghezza dell'originale, e le posizioni
       trovate nella ricerca valgono anche sul testo da evidenziare. */
    const ACCENTI = {
        'à': 'a', 'á': 'a', 'â': 'a', 'ä': 'a', 'å': 'a',
        'è': 'e', 'é': 'e', 'ê': 'e', 'ë': 'e',
        'ì': 'i', 'í': 'i', 'î': 'i', 'ï': 'i',
        'ò': 'o', 'ó': 'o', 'ô': 'o', 'ö': 'o',
        'ù': 'u', 'ú': 'u', 'û': 'u', 'ü': 'u',
        'ç': 'c', 'ñ': 'n', '’': "'", '‘': "'", '´': "'"
    };

    function norm(s) {
        return String(s == null ? '' : s)
            .toLowerCase()
            .replace(/[àáâäåèéêëìíîïòóôöùúûüçñ’‘´]/g, c => ACCENTI[c] || c);
    }

    function esc(s) {
        return String(s).replace(/[&<>"]/g, c =>
            ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    }

    function spazi(s) {
        return String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
    }

    /* ---------- lettura delle fonti --------------------------------------- */

    // Se fireops-core espone una cache JSON, usala: qui il nome è protetto da
    // typeof, quindi basta adeguare la riga se nel core si chiama diversamente.
    function leggiJson(url) {
        if (window.FireOps && typeof window.FireOps.json === 'function') {
            return Promise.resolve(window.FireOps.json(url));
        }
        return fetch(url).then(r => {
            if (!r.ok) throw new Error('HTTP ' + r.status);
            return r.json();
        });
    }

    function elencoFonti() {
        const testate = document.querySelectorAll(
            '#normative-contenuto .evento-rilevante-testata[data-fonte]');
        return Array.from(testate).map(testata => {
            const codice = testata.querySelector('.evento-rilevante-codice');
            const spans = Array.from(testata.querySelectorAll('span'))
                .filter(s => !s.classList.contains('freccia') &&
                    !s.classList.contains('evento-rilevante-codice'));
            return {
                url: testata.dataset.fonte,
                nome: spazi(codice ? codice.textContent : 'Norma'),
                descrizione: spazi(spans.map(s => s.textContent).join(' ')),
                testata: testata
            };
        });
    }

    /* ---------- costruzione dell'indice ------------------------------------ */

    function etichettaDi(nodo) {
        for (const campo of CAMPI_ETICHETTA) {
            const v = nodo[campo];
            if (typeof v === 'string' && v.trim()) return spazi(v);
            if (typeof v === 'number') return String(v);
        }
        return '';
    }

    // Raccoglie ricorsivamente tutte le stringhe sotto un campo di testo.
    function raccogliTesto(v, out) {
        if (v == null) return;
        if (typeof v === 'string' || typeof v === 'number') {
            const t = spazi(v);
            if (t) out.push(t);
            return;
        }
        if (Array.isArray(v)) { v.forEach(x => raccogliTesto(x, out)); return; }
        if (typeof v === 'object') Object.values(v).forEach(x => raccogliTesto(x, out));
    }

    function esplora(nodo, fonte, percorso, out) {
        if (Array.isArray(nodo)) {
            nodo.forEach(n => esplora(n, fonte, percorso, out));
            return;
        }
        if (!nodo || typeof nodo !== 'object') return;

        const etichetta = etichettaDi(nodo);
        const qui = etichetta ? percorso.concat(etichetta) : percorso;

        const parti = [];
        CAMPI_TESTO.forEach(c => { if (c in nodo) raccogliTesto(nodo[c], parti); });

        if (parti.length) {
            const testo = parti.join(' ');
            const titolo = qui.join(' › ') || fonte.nome;
            out.push({
                fonte: fonte,
                titolo: titolo,
                etichettaBreve: etichetta || fonte.nome,
                parti: parti,
                testo: testo,
                nTesto: norm(testo),
                nTitolo: norm(titolo)
            });
        }

        // Si scende comunque nei rami non testuali: capi, sezioni, articoli...
        Object.keys(nodo).forEach(k => {
            if (CAMPI_TESTO.indexOf(k) !== -1) return;
            const v = nodo[k];
            if (v && typeof v === 'object') esplora(v, fonte, qui, out);
        });
    }

    let indice = null;
    let inCorso = null;

    function costruisciIndice() {
        if (indice) return Promise.resolve(indice);
        if (inCorso) return inCorso;

        const fonti = elencoFonti();
        inCorso = Promise.all(fonti.map(f =>
            leggiJson(f.url)
                .then(dati => ({ fonte: f, dati: dati }))
                .catch(err => {
                    console.warn('[normative] fonte non caricata:', f.url, err);
                    return null;
                })
        )).then(esiti => {
            const voci = [];
            esiti.filter(Boolean).forEach(e => esplora(e.dati, e.fonte, [], voci));
            indice = voci;
            inCorso = null;
            return indice;
        });

        return inCorso;
    }

    /* ---------- ricerca ---------------------------------------------------- */

    function chiavi(query, fraseEsatta) {
        const q = spazi(norm(query));
        if (!q) return [];
        return fraseEsatta ? [q] : q.split(' ').filter(t => t.length >= 2);
    }

    function occorrenze(testo, chiave) {
        let n = 0, i = testo.indexOf(chiave);
        while (i !== -1) { n++; i = testo.indexOf(chiave, i + chiave.length); }
        return n;
    }

    function cerca(query, fraseEsatta) {
        const ck = chiavi(query, fraseEsatta);
        if (!ck.length) return [];

        const esiti = [];
        indice.forEach(voce => {
            let punti = 0, tutte = true;
            ck.forEach(k => {
                const nel = occorrenze(voce.nTesto, k);
                const nelTitolo = occorrenze(voce.nTitolo, k);
                if (!nel && !nelTitolo) tutte = false;
                punti += nel + nelTitolo * 20;
            });
            if (tutte) esiti.push({ voce: voce, punti: punti, chiavi: ck });
        });

        esiti.sort((a, b) => b.punti - a.punti);
        return esiti;
    }

    /* ---------- evidenziazione e anteprima --------------------------------- */

    function intervalli(testo, ck) {
        const base = norm(testo);
        const r = [];
        ck.forEach(k => {
            let i = base.indexOf(k);
            while (i !== -1) { r.push([i, i + k.length]); i = base.indexOf(k, i + k.length); }
        });
        r.sort((a, b) => a[0] - b[0]);
        const uniti = [];
        r.forEach(x => {
            const u = uniti[uniti.length - 1];
            if (u && x[0] <= u[1]) u[1] = Math.max(u[1], x[1]);
            else uniti.push([x[0], x[1]]);
        });
        return uniti;
    }

    function evidenzia(testo, ck) {
        const zone = intervalli(testo, ck);
        if (!zone.length) return esc(testo);
        let html = '', pos = 0;
        zone.forEach(([a, b]) => {
            html += esc(testo.slice(pos, a)) + '<mark>' + esc(testo.slice(a, b)) + '</mark>';
            pos = b;
        });
        return html + esc(testo.slice(pos));
    }

    function anteprima(voce, ck) {
        const zone = intervalli(voce.testo, ck);
        if (!zone.length) return esc(voce.testo.slice(0, CONTORNO * 2)) + '…';
        let da = Math.max(0, zone[0][0] - CONTORNO);
        let a = Math.min(voce.testo.length, zone[0][1] + CONTORNO * 2);
        if (da > 0) { const s = voce.testo.indexOf(' ', da); if (s !== -1 && s < da + 25) da = s + 1; }
        const frammento = voce.testo.slice(da, a);
        return (da > 0 ? '… ' : '') + evidenzia(frammento, ck) + (a < voce.testo.length ? ' …' : '');
    }

    /* ---------- interfaccia ------------------------------------------------- */

    const el = {};

    function mostraStato(testo) {
        if (el.stato) el.stato.textContent = testo || '';
    }

    function svuota() {
        el.risultati.innerHTML = '';
        el.risultati.hidden = true;
        mostraStato('');
    }

    function disegna(esiti, ck, query) {
        if (!esiti.length) {
            el.risultati.hidden = false;
            el.risultati.innerHTML =
                '<p class="pagina-nota normative-nessun-risultato">Nessuna corrispondenza per «' +
                esc(spazi(query)) + '». Prova con una parola sola o con la radice del termine.</p>';
            mostraStato('0 risultati');
            return;
        }

        const norme = new Set(esiti.map(e => e.voce.fonte.nome));
        mostraStato(esiti.length + (esiti.length === 1 ? ' risultato' : ' risultati') +
            ' in ' + norme.size + (norme.size === 1 ? ' norma' : ' norme') +
            (esiti.length > MAX_RISULTATI ? ' — mostrati i primi ' + MAX_RISULTATI : ''));

        const html = esiti.slice(0, MAX_RISULTATI).map((e, i) => {
            const v = e.voce;
            return '' +
                '<article class="normativa-risultato" data-i="' + i + '">' +
                '<header class="normativa-risultato-testa">' +
                '<span class="normativa-risultato-fonte">' + esc(v.fonte.nome) + '</span>' +
                '<span class="normativa-risultato-titolo">' + evidenzia(v.titolo, ck) + '</span>' +
                '<button type="button" class="normativa-risultato-apri">Apri nella norma</button>' +
                '</header>' +
                '<p class="normativa-risultato-testo">' + anteprima(v, ck) + '</p>' +
                '<div class="normativa-risultato-completo" hidden>' +
                v.parti.map(p => '<p>' + evidenzia(p, ck) + '</p>').join('') +
                '</div>' +
                '</article>';
        }).join('');

        el.risultati.innerHTML = html;
        el.risultati.hidden = false;
        el.risultati.__esiti = esiti;
    }

    // Apre la voce dell'accordion e prova a portarsi sull'articolo trovato.
    function apriNellaNorma(voce) {
        const testata = voce.fonte.testata;
        if (testata.getAttribute('aria-expanded') !== 'true') testata.click();

        setTimeout(() => {
            const dettaglio = testata.nextElementSibling;
            if (!dettaglio) return;
            const ago = norm(spazi(voce.etichettaBreve));
            let bersaglio = null;
            if (ago) {
                bersaglio = Array.from(dettaglio.querySelectorAll('button, h3, h4, h5, li, p, div'))
                    .find(n => n.children.length < 4 && norm(spazi(n.textContent)).indexOf(ago) === 0);
            }
            const meta = bersaglio || dettaglio;
            if (bersaglio && bersaglio.tagName === 'BUTTON' &&
                bersaglio.getAttribute('aria-expanded') === 'false') bersaglio.click();
            meta.scrollIntoView({ behavior: 'smooth', block: 'center' });
            if (bersaglio) {
                bersaglio.classList.add('normativa-evidenziato');
                setTimeout(() => bersaglio.classList.remove('normativa-evidenziato'), 2500);
            }
        }, 300);
    }

    let attesa = null;

    function esegui() {
        const query = el.input.value;
        const fraseEsatta = el.frase && el.frase.checked;

        if (spazi(query).length < MIN_CARATTERI) { svuota(); return; }

        mostraStato('Ricerca in corso…');
        costruisciIndice().then(() => {
            if (el.input.value !== query) return;   // l'utente ha già digitato altro
            disegna(cerca(query, fraseEsatta), chiavi(query, fraseEsatta), query);
        }).catch(err => {
            console.error('[normative] indice non disponibile', err);
            mostraStato('Non è stato possibile leggere i testi delle norme.');
        });
    }

    function avvia() {
        el.input = document.getElementById('normative-cerca');
        el.risultati = document.getElementById('normative-risultati');
        if (!el.input || !el.risultati) return;      // sezione non presente

        el.frase = document.getElementById('normative-cerca-frase');
        el.stato = document.getElementById('normative-cerca-stato');

        // Si scalda l'indice al primo focus: quando arriva la terza lettera
        // i JSON sono già in memoria e il risultato è immediato.
        el.input.addEventListener('focus', () => { costruisciIndice(); }, { once: true });

        el.input.addEventListener('input', () => {
            clearTimeout(attesa);
            attesa = setTimeout(esegui, 200);
        });

        el.input.addEventListener('keydown', ev => {
            if (ev.key === 'Escape') { el.input.value = ''; svuota(); }
        });

        if (el.frase) el.frase.addEventListener('change', esegui);

        el.risultati.addEventListener('click', ev => {
            const scheda = ev.target.closest('.normativa-risultato');
            if (!scheda) return;
            const esiti = el.risultati.__esiti || [];
            const voce = (esiti[Number(scheda.dataset.i)] || {}).voce;
            if (!voce) return;

            if (ev.target.closest('.normativa-risultato-apri')) {
                apriNellaNorma(voce);
                return;
            }
            // clic sulla scheda: mostra/nasconde il testo integrale
            const completo = scheda.querySelector('.normativa-risultato-completo');
            const breve = scheda.querySelector('.normativa-risultato-testo');
            const aperto = !completo.hidden;
            completo.hidden = aperto;
            breve.hidden = !aperto;
            scheda.classList.toggle('esteso', !aperto);
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', avvia);
    } else {
        avvia();
    }
})();