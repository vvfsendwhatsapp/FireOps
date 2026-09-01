/* ==========================================================================
   normative-ricerca.js — ricerca a testo libero dentro TUTTE le norme

   Le fonti NON si configurano qui: si leggono i data-fonte già presenti in
   #normative-contenuto, quindi ogni norma aggiunta in futuro entra nella
   ricerca senza toccare questo file.

   Per ogni fonte serve sapere DOVE finisce ogni pezzo di testo nell'albero
   della fisarmonica: senza, "Apri nella norma" non saprebbe quali voci
   espandere e il risultato non potrebbe mostrare la partizione di
   appartenenza. Da qui la mappa INDICIZZATORI, gemella di RENDERER_NORMATIVE
   in script.js: chi ha un indicizzatore dedicato produce percorso e catena
   esatti (Titolo IV › Capo II › Art. 71), chi non ce l'ha passa dal lettore
   generico e viene comunque indicizzato, solo con una navigazione
   approssimata.

   Va caricato dopo script.js. Usa FireOps.caricaJson, quindi i file già
   aperti nella fisarmonica non vengono riscaricati.
   ========================================================================== */
(function () {
    'use strict';

    const MIN_CARATTERI = 3;      // sotto questa soglia non si cerca
    const MAX_RISULTATI = 60;     // tetto ai risultati mostrati
    const CONTORNO = 110;         // caratteri di contesto attorno alla parola trovata
    const ATTESA_APERTURA = 3000; // ms max di attesa del caricamento di una fonte

    /* ---------- normalizzazione -------------------------------------------
       Gli accenti si sostituiscono UNO A UNO e non con NFD: così la stringa
       normalizzata ha la stessa lunghezza dell'originale, e le posizioni
       trovate nella ricerca valgono anche sul testo da evidenziare. */
    const ACCENTI = {
        'à': 'a', 'á': 'a', 'â': 'a', 'ä': 'a', 'å': 'a',
        'è': 'e', 'é': 'e', 'ê': 'e', 'ë': 'e',
        'ì': 'i', 'í': 'i', 'î': 'i', 'ï': 'i',
        'ò': 'o', 'ó': 'o', 'ô': 'o', 'ö': 'o',
        'ù': 'u', 'ú': 'u', 'û': 'u', 'ü': 'u',
        'ç': 'c', 'ñ': 'n', '\u2019': "'", '\u2018': "'", '\u00b4': "'"
    };

    function norm(s) {
        return String(s == null ? '' : s)
            .toLowerCase()
            .replace(/[àáâäåèéêëìíîïòóôöùúûüçñ\u2019\u2018\u00b4]/g, c => ACCENTI[c] || c);
    }

    function esc(s) {
        return String(s).replace(/[&<>"]/g, c =>
            ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    }

    function spazi(s) {
        return String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
    }

    /* ---------- fonti dichiarate nella pagina ------------------------------ */

    function elencoFonti() {
        const testate = document.querySelectorAll(
            '#normative-contenuto .evento-rilevante-testata[data-fonte]');
        return Array.from(testate).map(testata => {
            const codice = testata.querySelector('.evento-rilevante-codice');
            const altri = Array.from(testata.querySelectorAll('span'))
                .filter(s => !s.classList.contains('freccia') &&
                    !s.classList.contains('evento-rilevante-codice'));
            return {
                url: testata.dataset.fonte,
                nome: spazi(codice ? codice.textContent : 'Norma'),
                descrizione: spazi(altri.map(s => s.textContent).join(' ')),
                testata: testata
            };
        });
    }

    /* Una voce dell'indice.
       - `catena`: le tappe da aprire, nell'ordine, per arrivare a questo
         pezzo di testo partendo dalla fonte. Ogni tappa è { codice, rubrica }:
         il codice serve a ritrovare la testata nel DOM, la rubrica a scrivere
         il percorso per esteso.
       - `parti`: i blocchi di testo con il loro livello (comma, lettera,
         numero), così la resa mantiene i rientri invece di essere un blocco
         unico. */
    function voceIndice(fonte, codice, rubrica, catena, parti) {
        const testo = parti.map(p => p.testo).join(' ');
        const rami = catena.slice(0, -1);
        const percorso = rami.map(r => r.codice).join(' › ');
        const percorsoEsteso = rami
            .map(r => r.rubrica ? r.codice + ' — ' + spazi(r.rubrica) : r.codice)
            .join(' · ');
        const titolo = rubrica ? codice + ' — ' + spazi(rubrica) : codice;

        return {
            fonte: fonte,
            codice: codice,
            titolo: titolo,
            percorso: percorso,
            percorsoEsteso: percorsoEsteso,
            catena: catena,
            parti: parti,
            testo: testo,
            nTesto: norm(testo),
            nTitolo: norm(titolo + ' ' + percorsoEsteso)
        };
    }

    /* ---------- indicizzatore del D.P.R. 64/2012 ---------------------------
       Stessa forma che usa disegnaRegolamentoDpr: struttura ad albero con i
       soli NUMERI degli articoli, e articoli veri in un elenco piatto a
       parte. Valgono le stesse due regole del renderer:
       - se un nodo ha figli, il suo campo `articoli` è un doppione di quelli
         dei figli e va ignorato;
       - il campo `testo` dell'articolo è il testo integrale, che nei commi è
         già ripetuto: si usa solo se l'articolo non ha commi. */
    function indicizzaDpr(dati, fonte, out) {
        const mappa = new Map();
        (dati.articoli || []).forEach(a => mappa.set(a.numero, a));
        const collocati = new Set();

        function partiArticolo(a) {
            const parti = [];
            const commi = a.commi || [];

            if (!commi.length) {
                if (a.testo) parti.push({ liv: 0, num: '', testo: spazi(a.testo) });
                return parti;
            }

            commi.forEach(c => {
                if (c.testo) parti.push({ liv: 1, num: spazi(c.numero) + '.', testo: spazi(c.testo) });
                (c.lettere || []).forEach(l => {
                    if (l.testo) parti.push({ liv: 2, num: spazi(l.lettera) + ')', testo: spazi(l.testo) });
                    (l.numeri || []).forEach(n => {
                        if (n.testo) parti.push({ liv: 3, num: spazi(n.numero) + ')', testo: spazi(n.testo) });
                    });
                });
            });
            return parti;
        }

        function aggiungiArticolo(numero, catena) {
            const a = mappa.get(numero);
            if (!a) return;
            collocati.add(numero);
            const codice = a.etichetta || ('Art. ' + numero);
            const parti = partiArticolo(a);
            if (!parti.length) return;
            out.push(voceIndice(fonte, codice, a.rubrica,
                catena.concat([{ codice: codice, rubrica: a.rubrica || '' }]), parti));
        }

        function scendi(nodo, catena) {
            const tipo = String(nodo.tipo || '').replace(/^./, c => c.toUpperCase());
            const qui = catena.concat([{
                codice: spazi(tipo + ' ' + nodo.numero),
                rubrica: nodo.rubrica || ''
            }]);
            const figli = nodo.figli || [];
            if (figli.length) figli.forEach(f => scendi(f, qui));
            else (nodo.articoli || []).forEach(n => aggiungiArticolo(n, qui));
        }

        (dati.struttura || []).forEach(n => scendi(n, []));
        // Articoli non agganciati ad alcuna partizione: indicizzati lo stesso,
        // con catena minima (l'apertura si ferma alla fonte).
        (dati.articoli || []).forEach(a => {
            if (!collocati.has(a.numero)) aggiungiArticolo(a.numero, []);
        });
    }

    const INDICIZZATORI = {
        '/FireOps/db/dpr642012.json': indicizzaDpr
    };

    /* ---------- lettore generico (norme senza indicizzatore dedicato) ------ */

    const CAMPI_ETICHETTA = [
        'etichetta', 'codice', 'articolo', 'art', 'numero', 'num', 'n',
        'rubrica', 'titolo', 'intestazione', 'nome', 'capo', 'sezione', 'parte'
    ];
    const CAMPI_TESTO = [
        'testo', 'contenuto', 'commi', 'comma', 'corpo', 'paragrafi',
        'periodi', 'text', 'body'
    ];

    function etichettaDi(nodo) {
        for (const campo of CAMPI_ETICHETTA) {
            const v = nodo[campo];
            if (typeof v === 'string' && v.trim()) return spazi(v);
            if (typeof v === 'number') return String(v);
        }
        return '';
    }

    // Le stringhe di 1-2 caratteri sono quasi sempre numerazioni ("1", "a"):
    // come testo non dicono nulla e sporcherebbero il risultato.
    function raccogliTesto(v, out) {
        if (v == null) return;
        if (typeof v === 'string' || typeof v === 'number') {
            const t = spazi(v);
            if (t.length > 2) out.push(t);
            return;
        }
        if (Array.isArray(v)) { v.forEach(x => raccogliTesto(x, out)); return; }
        if (typeof v === 'object') Object.values(v).forEach(x => raccogliTesto(x, out));
    }

    function indicizzaGenerico(nodo, fonte, out, catena, radice) {
        if (Array.isArray(nodo)) {
            nodo.forEach(n => indicizzaGenerico(n, fonte, out, catena, false));
            return;
        }
        if (!nodo || typeof nodo !== 'object') return;

        // Sulla radice l'etichetta è il titolo o il numero della norma:
        // entrerebbe come prefisso di ogni voce senza aggiungere nulla.
        const etichetta = radice ? '' : etichettaDi(nodo);
        const qui = etichetta ? catena.concat([{ codice: etichetta, rubrica: '' }]) : catena;

        const grezze = [];
        CAMPI_TESTO.forEach(c => { if (c in nodo) raccogliTesto(nodo[c], grezze); });
        if (grezze.length) {
            const codice = qui.length ? qui[qui.length - 1].codice : fonte.nome;
            out.push(voceIndice(fonte, codice, '', qui,
                grezze.map(t => ({ liv: 0, num: '', testo: t }))));
        }

        Object.keys(nodo).forEach(k => {
            if (CAMPI_TESTO.indexOf(k) !== -1) return;
            const v = nodo[k];
            if (v && typeof v === 'object') indicizzaGenerico(v, fonte, out, qui, false);
        });
    }

    /* ---------- costruzione dell'indice ------------------------------------ */

    let indice = null;
    let inCorso = null;

    function costruisciIndice() {
        if (indice) return Promise.resolve(indice);
        if (inCorso) return inCorso;

        const fonti = elencoFonti();
        inCorso = Promise.all(fonti.map(f =>
            FireOps.caricaJson(f.url)
                .then(dati => ({ fonte: f, dati: dati }))
                .catch(err => {
                    console.warn('[normative] fonte non caricata:', f.url, err);
                    return null;
                })
        )).then(esiti => {
            const voci = [];
            esiti.filter(Boolean).forEach(e => {
                const dedicato = INDICIZZATORI[e.fonte.url];
                if (dedicato) dedicato(e.dati, e.fonte, voci);
                else indicizzaGenerico(e.dati, e.fonte, voci, [], true);
            });
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
                const nelTesto = occorrenze(voce.nTesto, k);
                const nelTitolo = occorrenze(voce.nTitolo, k);
                if (!nelTesto && !nelTitolo) tutte = false;
                punti += nelTesto + nelTitolo * 20;
            });
            if (tutte) esiti.push({ voce: voce, punti: punti });
        });

        esiti.sort((a, b) => b.punti - a.punti);
        return esiti;
    }

    /* ---------- evidenziazione e anteprima --------------------------------- */

    function intervalli(testo, ck) {
        const base = norm(testo);
        const trovati = [];
        ck.forEach(k => {
            let i = base.indexOf(k);
            while (i !== -1) { trovati.push([i, i + k.length]); i = base.indexOf(k, i + k.length); }
        });
        trovati.sort((a, b) => a[0] - b[0]);
        const uniti = [];
        trovati.forEach(x => {
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
        zone.forEach(z => {
            html += esc(testo.slice(pos, z[0])) + '<mark>' + esc(testo.slice(z[0], z[1])) + '</mark>';
            pos = z[1];
        });
        return html + esc(testo.slice(pos));
    }

    function anteprima(voce, ck) {
        const zone = intervalli(voce.testo, ck);
        if (!zone.length) return esc(voce.testo.slice(0, CONTORNO * 2)) + '…';
        let da = Math.max(0, zone[0][0] - CONTORNO);
        const a = Math.min(voce.testo.length, zone[0][1] + CONTORNO * 2);
        if (da > 0) {
            const s = voce.testo.indexOf(' ', da);
            if (s !== -1 && s < da + 25) da = s + 1;
        }
        return (da > 0 ? '… ' : '') + evidenzia(voce.testo.slice(da, a), ck) +
            (a < voce.testo.length ? ' …' : '');
    }

    /* ---------- apertura nella fisarmonica ---------------------------------
       Le voci si aprono a catena, ognuna dentro il dettaglio della
       precedente. La prima apertura della fonte carica il JSON: il contenuto
       arriva dopo, quindi si attende che le voci compaiano. */

    function attendiVoci(contenitore) {
        return new Promise(risolvi => {
            const scadenza = Date.now() + ATTESA_APERTURA;
            (function guarda() {
                if (!contenitore || contenitore.querySelector('.evento-rilevante-voce')
                    || Date.now() > scadenza) { risolvi(contenitore); return; }
                setTimeout(guarda, 80);
            })();
        });
    }

    function trovaVoce(contenitore, codice) {
        if (!contenitore) return null;
        const atteso = norm(spazi(codice));
        const voci = contenitore.querySelectorAll(':scope > .evento-rilevante-voce');
        return Array.from(voci).find(v => {
            const c = v.querySelector(':scope > .evento-rilevante-testata .evento-rilevante-codice');
            return c && norm(spazi(c.textContent)) === atteso;
        }) || null;
    }

    function apriNellaNorma(voce) {
        const testata = voce.fonte.testata;
        if (testata.getAttribute('aria-expanded') !== 'true') testata.click();

        let contenitore = testata.parentElement
            .querySelector(':scope > .evento-rilevante-dettaglio');

        attendiVoci(contenitore).then(pronto => {
            contenitore = pronto;
            let ultima = null;

            voce.catena.forEach(tappa => {
                if (!contenitore) return;
                const voceDom = trovaVoce(contenitore, tappa.codice);
                if (!voceDom) { contenitore = null; return; }
                const t = voceDom.querySelector(':scope > .evento-rilevante-testata');
                if (t && t.getAttribute('aria-expanded') !== 'true') t.click();
                ultima = voceDom;
                contenitore = voceDom.querySelector(':scope > .evento-rilevante-dettaglio');
            });

            const meta = ultima || testata;
            meta.scrollIntoView({ behavior: 'smooth', block: 'center' });
            meta.classList.add('normativa-evidenziato');
            setTimeout(() => meta.classList.remove('normativa-evidenziato'), 2500);
        });
    }

    /* ---------- interfaccia ------------------------------------------------- */

    const el = {};
    let attesa = null;

    function mostraStato(testo) {
        if (el.stato) el.stato.textContent = testo || '';
    }

    function svuota() {
        el.risultati.innerHTML = '';
        el.risultati.hidden = true;
        mostraStato('');
    }

    function schedaRisultato(voce, ck, indice) {
        const percorso = voce.percorso
            ? '<div class="normativa-risultato-percorso" title="' + esc(voce.percorsoEsteso) + '">' +
              esc(voce.percorso) + '</div>'
            : '';

        const completo = voce.parti.map(p =>
            '<p class="normativa-parte normativa-liv-' + p.liv + '">' +
            (p.num ? '<span class="normativa-parte-num">' + esc(p.num) + '</span> ' : '') +
            evidenzia(p.testo, ck) + '</p>').join('');

        return '<article class="normativa-risultato" data-i="' + indice + '">' +
            '<header class="normativa-risultato-testa">' +
            '<span class="normativa-risultato-fonte">' + esc(voce.fonte.nome) + '</span>' +
            '<span class="normativa-risultato-titolo">' + evidenzia(voce.titolo, ck) + '</span>' +
            '<button type="button" class="normativa-risultato-apri">Apri nella norma</button>' +
            '</header>' +
            percorso +
            '<p class="normativa-risultato-testo">' + anteprima(voce, ck) + '</p>' +
            '<div class="normativa-risultato-completo" hidden>' + completo + '</div>' +
            '</article>';
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

        el.risultati.innerHTML = esiti.slice(0, MAX_RISULTATI)
            .map((e, i) => schedaRisultato(e.voce, ck, i)).join('');
        el.risultati.hidden = false;
        el.risultati.__esiti = esiti;
    }

    function esegui() {
        const query = el.input.value;
        const fraseEsatta = el.frase && el.frase.checked;

        if (spazi(query).length < MIN_CARATTERI) { svuota(); return; }

        mostraStato('Ricerca in corso…');
        costruisciIndice().then(() => {
            if (el.input.value !== query) return;   // nel frattempo si è digitato altro
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

        // Indice scaldato al primo focus: quando arriva la terza lettera i
        // JSON sono già in memoria e il risultato è immediato.
        el.input.addEventListener('focus', () => { costruisciIndice(); }, { once: true });

        el.input.addEventListener('input', () => {
            clearTimeout(attesa);
            attesa = setTimeout(esegui, 200);
        });

        el.input.addEventListener('keydown', ev => {
            if (ev.key === 'Escape') { ev.stopPropagation(); el.input.value = ''; svuota(); }
        });

        if (el.frase) el.frase.addEventListener('change', esegui);

        el.risultati.addEventListener('click', ev => {
            const scheda = ev.target.closest('.normativa-risultato');
            if (!scheda) return;
            const esiti = el.risultati.__esiti || [];
            const trovato = esiti[Number(scheda.dataset.i)];
            if (!trovato) return;

            if (ev.target.closest('.normativa-risultato-apri')) {
                apriNellaNorma(trovato.voce);
                return;
            }
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