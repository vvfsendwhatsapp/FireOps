/*!
 * FireOps VVF — differibili-assessment.js
 * Le valutazioni da campo delle schede differibili: tipi, campi specifici,
 * priorità ed esiti. Un solo file per la Sala (differibili.js) e per la
 * pagina da campo (differibili-campo.html): se si aggiunge un campo o un
 * tipo, lo vedono entrambe. Il backend controlla solo le chiavi dei tipi e
 * degli esiti (TIPI_ASSESSMENT, ESITI_ASSESSMENT nel .gs): cambiando quelle
 * va aggiornato anche lì.
 *
 * Tipi di campo: scelta (una voce), multi (più voci), numero, si_no, testo.
 */
(function () {
'use strict';

const MEZZO = ['A terra', 'Scala', 'Autoscala / APS', 'Piattaforma aerea', 'Gru / autogru', 'Ditta specializzata'];

const TIPI = [
  {k: 'pericolanti', n: 'Parti pericolanti', ic: '🧱', campi: [
    {k: 'elemento', n: 'Elemento', t: 'scelta', v: ['Cornicione', 'Comignolo', 'Intonaco / frontalino',
      'Grondaia / pluviale', 'Balcone / parapetto', 'Insegna / cartellone', 'Altro']},
    {k: 'altezza', n: 'Altezza da terra (m)', t: 'numero'},
    {k: 'pubblico', n: 'Sopra strada o marciapiede', t: 'si_no'},
    {k: 'interdetta', n: 'Area transennata / interdetta', t: 'si_no'},
    {k: 'mezzo', n: 'Mezzo necessario', t: 'scelta', v: MEZZO}]},
  {k: 'tetti', n: 'Copertura tetti', ic: '🏠', campi: [
    {k: 'copertura', n: 'Tipo di copertura', t: 'scelta', v: ['Coppi / tegole', 'Lamiera', 'Guaina',
      'Lastre (possibile amianto)', 'Pannelli fotovoltaici', 'Altro']},
    {k: 'superficie', n: 'Superficie danneggiata (m²)', t: 'numero'},
    {k: 'abitato', n: 'Edificio abitato', t: 'si_no'},
    {k: 'infiltrazioni', n: 'Infiltrazioni d\u2019acqua', t: 'si_no'},
    {k: 'caduta', n: 'Rischio caduta elementi su area pubblica', t: 'si_no'},
    {k: 'mezzo', n: 'Mezzo necessario', t: 'scelta', v: MEZZO}]},
  {k: 'alberi', n: 'Alberi pericolanti', ic: '🌳', campi: [
    {k: 'stato', n: 'Stato', t: 'scelta', v: ['Inclinato', 'Sradicato / a terra', 'Rami spezzati sospesi',
      'Tronco spezzato', 'Appoggiato su struttura']},
    {k: 'altezza', n: 'Altezza albero (m)', t: 'numero'},
    {k: 'diametro', n: 'Diametro tronco (cm)', t: 'numero'},
    {k: 'interessa', n: 'Interessa', t: 'multi', v: ['Strada', 'Edificio', 'Linee elettriche / telefoniche',
      'Veicoli', 'Area privata']},
    {k: 'mezzo', n: 'Mezzo necessario', t: 'scelta', v: ['Motosega a terra', 'Autoscala / piattaforma',
      'Gru / autogru', 'Ditta specializzata']}]},
  {k: 'allagamenti', n: 'Allagamenti', ic: '🌊', campi: [
    {k: 'locale', n: 'Locale', t: 'scelta', v: ['Cantina / scantinato', 'Garage / box', 'Abitazione piano terra',
      'Locale commerciale', 'Sottopasso', 'Strada']},
    {k: 'acqua', n: 'Altezza acqua (cm)', t: 'numero'},
    {k: 'superficie', n: 'Superficie (m²)', t: 'numero'},
    {k: 'persone', n: 'Persone o animali presenti', t: 'si_no'},
    {k: 'elettrico', n: 'Impianti elettrici sommersi', t: 'si_no'},
    {k: 'mezzo', n: 'Mezzo necessario', t: 'scelta', v: ['Elettropompa', 'Motopompa', 'Idrovora', 'Aspiraliquidi']}]},
  {k: 'altro', n: 'Altro', ic: '❓', campi: [
    {k: 'descrizione', n: 'Descrizione', t: 'testo', obbligatorio: true}]}
];

/* Campi comuni a tutti i tipi (tranne il duplicato): le reti e gli enti
   da avvisare si annotano qualunque sia il danno. */
const COMUNI = [
  {k: 'enti', n: 'Reti / enti da avvisare', t: 'multi', v: ['ENEL', 'Telecom', 'Fibra', 'Pubblica Illuminazione', 'GAS']}
];
const campi = k => tipo(k).campi.concat(COMUNI);

const ESITI = [
  {k: 'da_intervenire', n: 'Da intervenire'},
  {k: 'eseguito', n: 'Intervento eseguito'},
  {k: 'non_necessario', n: 'Intervento non necessario'},
  {k: 'non_trovato', n: 'Non trovato / assente'},
  /* Duplicato: la stessa situazione è già in un'altra scheda. Non si
     compila altro, e in Sala il punto sparisce dalla carta. */
  {k: 'duplicato', n: 'Duplicato'}
];
/* Colore unico dell'anello attorno alle schede già valutate. */
const COLORE_VALUTATA = '#00e5ff';

/* 0 = niente da fare, 5 = urgentissimo. Il colore cresce col rischio. */
const PRIORITA = ['Nessun intervento', 'Bassa', 'Moderata', 'Media', 'Alta', 'URGENTISSIMA'];
const COLORI = ['#9e9e9e', '#43a047', '#c0ca33', '#fb8c00', '#e53935', '#8e24aa'];

const tipo = k => TIPI.find(t => t.k === k) || TIPI[TIPI.length - 1];
const esito = k => (ESITI.find(e => e.k === k) || ESITI[0]).n;
const stelle = p => '★'.repeat(p) + '☆'.repeat(5 - p);

/* Tipo proposto dalla tipologia del triage: si può sempre cambiare. */
function suggerisci(descrizione){
  const d = String(descrizione || '');
  if (/alber|tralic|rami/i.test(d)) return 'alberi';
  if (/allag|esond|acqua/i.test(d)) return 'allagamenti';
  if (/tett|copertur/i.test(d)) return 'tetti';
  if (/croll|disses|ceden|pericol|cornic|comign/i.test(d)) return 'pericolanti';
  return 'altro';
}

/* Ultima valutazione per scheda: chiave CODEM|ID_CONTATTO. */
function ultime(valutazioni){
  const m = new Map();
  /* Le valutazioni sbloccate dalla Sala restano nella storia ma non
     contano: la scheda torna "da valutare". */
  (valutazioni || []).filter(v => !v.SBLOCCATA_TS).forEach(v => {
    const k = v.CODEM + '|' + v.ID_CONTATTO;
    const p = m.get(k);
    if (!p || String(v.TS) > String(p.TS)) m.set(k, v);
  });
  return m;
}

const valore = (c, x) => x == null || x === '' ? '' : c.t === 'si_no' ? (x === true || x === 'si' ? 'sì' : 'no')
  : Array.isArray(x) ? x.join(', ') : String(x);

/* Righe "Campo: valore" della parte specifica, per popup, tabelle e stampa. */
function dettagli(v){
  const d = typeof v.DETTAGLI === 'string' ? (() => { try { return JSON.parse(v.DETTAGLI); } catch(e){ return {}; } })()
    : (v.DETTAGLI || {});
  return campi(v.TIPO).map(c => [c.n, valore(c, d[c.k])]).filter(r => r[1] !== '');
}

function riassunto(v){
  if (v.ESITO === 'duplicato') return '⧉ Duplicato';
  const t = tipo(v.TIPO), p = +v.PRIORITA || 0;
  return `${t.ic} ${t.n} · ${stelle(p)} ${PRIORITA[p]} · ${esito(v.ESITO)}`;
}

/* SIMBOLO DELLA SCHEDA VALUTATA — uguale in Sala e sul campo.
   Priorità 5: stella nera, pulsante, visibile da lontano.
   Altrimenti: rombo del colore del settore, con le stelle della priorità
   (1-4) sopra la punta. Eseguito o non necessario: rombo sbiadito.
   Duplicato: grigio e trasparente. testo = numero della scheda (campo) o
   niente (Sala). Restituisce le opzioni per L.divIcon. */
const STELLA = 'M12 1.5l3.1 6.6 7.2.9-5.3 5 1.4 7.1L12 17.6 5.6 21.1 7 14l-5.3-5 7.2-.9z';
function simbolo(v, colore, testo, classe){
  const p = +v.PRIORITA || 0, dup = v.ESITO === 'duplicato';
  const chiusa = v.ESITO === 'eseguito' || v.ESITO === 'non_necessario';
  const t = testo == null ? '' : String(testo);
  if (p === 5 && !dup && !chiusa) return {className: 'fa-icona ' + (classe || ''), iconSize: [36, 36], iconAnchor: [18, 18],
    html: `<div class="fa-sim fa-stella"><svg viewBox="0 0 24 24"><path d="${STELLA}"/></svg><b>${t}</b></div>`};
  return {className: 'fa-icona ' + (classe || ''), iconSize: [36, 40], iconAnchor: [18, 25],
    html: `<div class="fa-sim fa-rombo${chiusa ? ' chiusa' : ''}${dup ? ' dup' : ''}">`
      + `<i>${dup ? '' : '★'.repeat(Math.min(p, 4))}</i>`
      + `<span style="background:${colore || '#9e9e9e'}"><b>${chiusa ? '✓' : t}</b></span></div>`};
}

/* Lo stile dei simboli viaggia con il modulo: serve identico in due
   pagine che non condividono il foglio di stile. */
(function stile(){
  if (document.getElementById('fa-stile')) return;
  const st = document.createElement('style');
  st.id = 'fa-stile';
  st.textContent = `
  .fa-icona { background: none; border: 0; }
  .fa-sim { position: absolute; inset: 0; }
  .fa-stella svg { width: 100%; height: 100%; display: block; overflow: visible;
    filter: drop-shadow(0 0 2px #fff) drop-shadow(0 0 4px #fff); animation: faPulsa 1.1s ease-in-out infinite; }
  .fa-stella path { fill: #000; stroke: #fff; stroke-width: 1.4; }
  .fa-stella b { position: absolute; inset: 0; padding-top: 4px; display: flex; align-items: center;
    justify-content: center; color: #fff; font: bold 10px/1 Arial, sans-serif; }
  @keyframes faPulsa { 50% { transform: scale(1.18); } }
  .fa-rombo i { position: absolute; left: -10px; right: -10px; top: 0; text-align: center; font: bold 12px/12px Arial,
    sans-serif; font-style: normal; color: #ffd700; letter-spacing: -1px; white-space: nowrap;
    text-shadow: 0 0 2px #000, 0 0 2px #000, 0 0 3px #000; }
  .fa-rombo span { position: absolute; left: 7px; top: 14px; width: 22px; height: 22px; transform: rotate(45deg);
    border: 2px solid #fff; box-shadow: 0 0 0 1px #000, 0 1px 4px rgba(0, 0, 0, .6);
    display: flex; align-items: center; justify-content: center; }
  .fa-rombo span b { transform: rotate(-45deg); color: #fff; font: bold 10px/1 Arial, sans-serif;
    text-shadow: 0 0 2px #000, 0 0 2px #000; }
  .fa-rombo.chiusa { opacity: .6; }
  .fa-rombo.dup { opacity: .35; filter: grayscale(1); }
  .fa-icona.sel .fa-rombo span { box-shadow: 0 0 0 3px #ffd700, 0 0 12px #ffd700; }
  .fa-icona.sel .fa-stella svg { filter: drop-shadow(0 0 4px #ffd700) drop-shadow(0 0 8px #ffd700); }`;
  document.head.appendChild(st);
})();

const ora = ts => { const d = new Date(ts); return isNaN(d) ? '' :
  d.toLocaleString('it-IT', {day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Rome'}); };

(window.FireOps = window.FireOps || {}).Assessment = {
  TIPI, ESITI, PRIORITA, COLORI, COLORE_VALUTATA, COMUNI, campi, simbolo, tipo, esito, stelle, suggerisci, ultime, dettagli, riassunto, ora
};
})();