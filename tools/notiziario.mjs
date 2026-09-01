#!/usr/bin/env node
/* ==========================================================================
   notiziario.mjs — aggregatore dei feed istituzionali

   Gira su GitHub Actions, non nel browser: i siti istituzionali non mandano
   le intestazioni CORS, quindi da FireOps (statico su Pages) un fetch
   diretto verrebbe rifiutato. Qui il feed si legge lato server e si committa
   il risultato come db/notiziario.json, che l'app poi legge come ogni altro
   db con FireOps.caricaJson.

   Tre modi d'uso:
     node tools/notiziario.mjs            aggrega e scrive db/notiziario.json
     node tools/notiziario.mjs --verifica prova ogni feed e stampa OK/KO
     node tools/notiziario.mjs --scopri   legge le pagine indicate in 'pagina'
                                          e stampa gli indirizzi RSS trovati

   --scopri esiste perché gli indirizzi dei feed non si indovinano: cambiano
   a ogni rifacimento dei siti. Si lancia una volta, si incollano gli
   indirizzi trovati in db/fonti-notiziario.json, e la lista è verificata
   invece che copiata da un elenco vecchio.
   ========================================================================== */

import { readFile, writeFile } from 'node:fs/promises';
import { XMLParser } from 'fast-xml-parser';

const FONTI = 'db/fonti-notiziario.json';
const USCITA = 'db/notiziario.json';
const PER_FONTE = 8;        // quante voci tenere per ciascuna fonte
const TOTALE = 120;         // tetto complessivo
const GIORNI = 30;          // si scartano le voci più vecchie di così
const TIMEOUT = 15000;

const UA = 'FireOps-VVF/notiziario (+https://github.com/)';

/* ---------- utilità ---------------------------------------------------- */

async function prendi(url) {
  const stop = AbortSignal.timeout(TIMEOUT);
  const r = await fetch(url, {signal: stop, headers: {'user-agent': UA}});
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.text();
}

const pulisci = s => String(s == null ? '' : s)
  .replace(/<[^>]*>/g, ' ')
  .replace(/&nbsp;/g, ' ')
  .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
  .replace(/\s+/g, ' ')
  .trim();

const taglia = (s, n) => s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s;

/* ---------- lettura dei feed ------------------------------------------- */

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@',
  trimValues: true
});

// Un link Atom è un attributo, uno RSS è testo; entrambi possono arrivare
// come oggetto singolo o come array.
function primoLink(v) {
  if (!v) return '';
  if (typeof v === 'string') return v;
  if (Array.isArray(v)) {
    const alt = v.find(x => !x['@rel'] || x['@rel'] === 'alternate') || v[0];
    return primoLink(alt);
  }
  return v['@href'] || v['#text'] || '';
}

function comeData(...candidati) {
  for (const c of candidati) {
    if (!c) continue;
    const d = new Date(typeof c === 'object' ? (c['#text'] || '') : c);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return null;
}

function estraiVoci(xml) {
  const dati = parser.parse(xml);
  const canale = dati?.rss?.channel || dati?.['rdf:RDF'] || dati?.feed;
  if (!canale) return [];
  const grezze = canale.item || canale.entry || [];
  return (Array.isArray(grezze) ? grezze : [grezze]).map(v => ({
    titolo: pulisci(typeof v.title === 'object' ? v.title['#text'] : v.title),
    link: primoLink(v.link || v.guid),
    data: comeData(v.pubDate, v['dc:date'], v.updated, v.published, v.date),
    sommario: pulisci(v.description || v.summary
      || (typeof v.content === 'object' ? v.content['#text'] : v.content))
  })).filter(v => v.titolo && v.link);
}

/* ---------- scoperta degli indirizzi ----------------------------------- */

function trovaFeedInPagina(html, base) {
  const trovati = new Set();

  // <link rel="alternate" type="application/rss+xml" href="…">
  for (const tag of html.match(/<link[^>]+>/gi) || []) {
    if (!/application\/(rss|atom)\+xml/i.test(tag)) continue;
    const href = (tag.match(/href\s*=\s*["']([^"']+)["']/i) || [])[1];
    if (href) trovati.add(new URL(href, base).href);
  }

  // href che finiscono in .xml, /rss, rss.aspx, feed…
  for (const m of html.matchAll(/href\s*=\s*["']([^"']+)["']/gi)) {
    const href = m[1];
    if (/(\.xml|\/rss\b|rss\.|\/feed\b|feed\.|rsshandler)/i.test(href)
        && !/sitemap/i.test(href)) {
      try { trovati.add(new URL(href, base).href); } catch { /* href non valido */ }
    }
  }
  return [...trovati];
}

/* ---------- modalità --------------------------------------------------- */

async function scopri(fonti) {
  for (const f of fonti) {
    const pagina = f.pagina;
    if (!pagina) continue;
    process.stdout.write(`\n${f.id} — ${pagina}\n`);
    try {
      const html = await prendi(pagina);
      const trovati = trovaFeedInPagina(html, pagina);
      if (!trovati.length) { console.log('   nessun feed dichiarato nella pagina'); continue; }
      for (const url of trovati.slice(0, 12)) console.log('   ' + url);
    } catch (err) {
      console.log('   pagina non leggibile: ' + err.message);
    }
  }
  console.log('\nIncolla gli indirizzi giusti nel campo "url" di ' + FONTI +
              ', poi lancia --verifica.');
}

async function leggiFonte(f) {
  if (!f.url) return {fonte: f, stato: 'assente', messaggio: 'url non ancora impostato', voci: []};
  try {
    const voci = estraiVoci(await prendi(f.url));
    if (!voci.length) return {fonte: f, stato: 'vuoto', messaggio: 'nessuna voce riconosciuta', voci: []};
    return {fonte: f, stato: 'ok', messaggio: `${voci.length} voci`, voci};
  } catch (err) {
    return {fonte: f, stato: 'errore', messaggio: err.message, voci: []};
  }
}

async function aggrega(fonti, soloVerifica) {
  const esiti = await Promise.all(fonti.map(leggiFonte));

  if (soloVerifica) {
    let ko = 0;
    for (const e of esiti) {
      const segno = e.stato === 'ok' ? 'OK ' : 'KO ';
      if (e.stato !== 'ok') ko++;
      console.log(`${segno} ${e.fonte.id.padEnd(18)} ${e.messaggio}`);
    }
    console.log(`\n${esiti.length - ko}/${esiti.length} fonti funzionanti.`);
    return;
  }

  const limite = Date.now() - GIORNI * 24 * 3600 * 1000;
  const viste = new Set();
  const voci = [];

  for (const e of esiti) {
    e.voci
      .filter(v => !v.data || v.data.getTime() > limite)
      .sort((a, b) => (b.data?.getTime() || 0) - (a.data?.getTime() || 0))
      .slice(0, PER_FONTE)
      .forEach(v => {
        if (viste.has(v.link)) return;
        viste.add(v.link);
        voci.push({
          fonte: e.fonte.id,
          nomeFonte: e.fonte.nome,
          categoria: e.fonte.categoria || 'altro',
          priorita: e.fonte.priorita || 3,
          titolo: taglia(v.titolo, 180),
          sommario: taglia(v.sommario, 320),
          link: v.link,
          data: v.data ? v.data.toISOString() : null
        });
      });
  }

  voci.sort((a, b) => (b.data || '').localeCompare(a.data || ''));

  /* Il filtro per territorio NON si fa qui: il Comando attivo è una scelta
     del browser, e l'Action non lo conosce. Il JSON porta tutto, il modulo
     lato pagina mette in cima ciò che nomina il territorio del Comando. */
  const uscita = {
    aggiornato: new Date().toISOString(),
    fonti: esiti.map(e => ({
      id: e.fonte.id,
      nome: e.fonte.nome,
      categoria: e.fonte.categoria || 'altro',
      stato: e.stato,
      messaggio: e.messaggio
    })),
    voci: voci.slice(0, TOTALE)
  };

  await writeFile(USCITA, JSON.stringify(uscita, null, 1) + '\n', 'utf8');
  const ok = esiti.filter(e => e.stato === 'ok').length;
  console.log(`${USCITA}: ${uscita.voci.length} voci da ${ok}/${esiti.length} fonti.`);
}

/* ---------- avvio ------------------------------------------------------ */

const config = JSON.parse(await readFile(FONTI, 'utf8'));
const fonti = config.fonti || [];

if (process.argv.includes('--scopri')) await scopri(fonti);
else await aggrega(fonti, process.argv.includes('--verifica'));
