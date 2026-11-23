/*!
 * FireOps VVF — sitac-frequenze-bis.js — Frequenze radio del DOS nella SITAC (solo BIS)
 *
 * Nella scheda 1 della SITAC (intestazione, dati del DOS) aggiunge il campo
 * "Frequenze radio": un elenco a tendina con tutte le frequenze utili
 * (TBT della regione dell'intervento, TBT nazionali, regionali e militari
 * della Direttiva COAU, emergenza aeronautica, Capitaneria; niente canali VVF) e in fondo
 * "Altra frequenza…" per scriverne una a mano con il suo uso.
 * Le scelte diventano voci in elenco, ciascuna con un campo "uso" libero.
 *
 * sitac.js le legge da window.FireOpsSitacFrequenze: finiscono nel GeoJSON
 * (properties.frequenze), nella testata di stampa (riquadro DOS) e si
 * rileggono all'importazione. In produzione questo file non c'è e sitac.js
 * non cambia comportamento.
 *
 * Le frequenze TBT vengono da window.FireOpsAeronautici (radiotelefoni-bis.js,
 * Direttiva COAU): una sola fonte da aggiornare.
 */
(function () {
'use strict';

const CHIAVE = 'fireops_sitac_frequenze';
const EMERGENZA = '121.500';
const REGIONI_TBT = [
  ['134.550', 'Lombardia, Emilia-Romagna'],
  ['128.500', "Valle d'Aosta, Piemonte, Liguria, Sicilia"],
  ['118.775', 'Toscana, Umbria'],
  ['118.525', 'Sardegna, Calabria, Puglia, Basilicata'],
  ['119.025', 'Lazio'],
  ['118.625', 'Campania'],
  ['118.925', 'Abruzzo, Molise, Marche']
];

const esc = s => String(s == null ? '' : s).replace(/[<>&"]/g,
  c => ({'<':'&lt;', '>':'&gt;', '&':'&amp;', '"':'&quot;'}[c]));
const $ = s => document.querySelector(s);

let voci = [];   // [{f:'134.550 MHz AM', d:'TBT regionale Emilia-Romagna', uso:''}]

function salva(){
  try { sessionStorage.setItem(CHIAVE, JSON.stringify(voci)); } catch (e) {}
}
function carica(){
  try { const v = JSON.parse(sessionStorage.getItem(CHIAVE) || '[]'); if (Array.isArray(v)) voci = v; } catch (e) {}
}

/* Il Comando dell'intervento è quello che sitac.js scrive in #sitac-comando
   dalla posizione del DOS; in mancanza, il Comando attivo della sala. */
function comandoIntervento(){
  const lista = Array.isArray(window.FireOpsComandi) ? window.FireOpsComandi : [];
  const testo = ($('#sitac-comando') || {}).textContent || '';
  const n = testo.trim().toLowerCase();
  const c = n && n !== '—' ? lista.find(x => x && x.Comando && n.includes(String(x.Comando).toLowerCase())) : null;
  return c || window.FireOpsComandoAttivo || null;
}

function aero(reg){
  return typeof window.FireOpsAeronautici === 'function' ? window.FireOpsAeronautici(reg || '') : null;
}

/* Elenco delle opzioni: [gruppo, [[valore, frequenza, descrizione]]] */
function opzioni(){
  const a = aero('') || {nazionale: ['122.150', '122.350'], militare: ['141.100', '142.500']};
  const c = comandoIntervento();
  const gruppi = [];
  if (c && c.Comando){
    const cons = [];
    const reg = c.Regione || '';
    const r = aero(reg);
    if (r && r.regionale.length) r.regionale.forEach(f => cons.push([f + ' MHz AM', 'TBT regionale ' + reg]));
    else if (reg) a.nazionale.forEach(f => cons.push([f + ' MHz AM', 'TBT nazionale (nessuna regionale per ' + reg + ')']));
    gruppi.push(['TBT della regione (' + c.Comando + ')', cons]);
  }
  gruppi.push(['TBT nazionali (aeromobili AIB)', a.nazionale.map(f => [f + ' MHz AM', 'TBT nazionale'])]);
  gruppi.push(['TBT regionali (Direttiva COAU)', REGIONI_TBT.map(([f, r]) => [f + ' MHz AM', 'TBT regionale ' + r])]);
  gruppi.push(['TBT militari (secondarie)', a.militare.map(f => [f + ' MHz AM', 'TBT militare, secondaria'])]);
  gruppi.push(['Emergenza', [
    [EMERGENZA + ' MHz AM', 'Emergenza aeronautica (MAYDAY · PAN PAN)'],
    ['156.800 MHz FM', 'Capitaneria di Porto, canale 16 nautico']
  ]]);
  return gruppi;
}

function riempiSelect(){
  const sel = $('#sitac-freqScelta');
  if (!sel) return;
  const prima = sel.value;
  let i = 0;
  sel.innerHTML = '<option value="">Scegli una frequenza…</option>'
    + opzioni().map(([g, l]) => l.length ? `<optgroup label="${esc(g)}">`
      + l.map(([f, d]) => `<option value="${i++}" data-f="${esc(f)}" data-d="${esc(d)}">${esc(f)} — ${esc(d)}</option>`).join('')
      + '</optgroup>' : '').join('')
    + '<option value="altra">✏️ Altra frequenza…</option>';
  if ([...sel.options].some(o => o.value === prima && prima === 'altra')) sel.value = prima;
  mostraAltra();
}

function mostraAltra(){
  const sel = $('#sitac-freqScelta'), box = $('#sitac-freqAltra');
  if (box) box.hidden = !sel || sel.value !== 'altra';
}

function bloccato(){
  const n = $('#sitac-nominativo');
  return !!(n && n.readOnly);
}

function disegna(){
  const el = $('#sitac-freqElenco');
  if (!el) return;
  const b = bloccato();
  el.innerHTML = voci.length ? voci.map((v, i) =>
    `<div class="sitac-freq-voce"><b>${esc(v.f)}</b><span class="sitac-freq-d">${esc(v.d)}</span>`
    + `<input type="text" data-freq-uso="${i}" value="${esc(v.uso || '')}" maxlength="60" placeholder="uso (es. DOS ↔ Drago 61)"${b ? ' readonly class="campo-bloccato"' : ''}>`
    + (b ? '' : `<button type="button" data-freq-del="${i}" title="Togli">✕</button>`) + `</div>`).join('')
    : '<p class="sitac-freq-vuoto">Nessuna frequenza impostata.</p>';
  ['#sitac-freqScelta', '#sitac-freqAggiungi', '#sitac-freqAltraF', '#sitac-freqAltraD']
    .forEach(s => { const x = $(s); if (x) x.disabled = b; });
}

function aggiungi(){
  const sel = $('#sitac-freqScelta');
  if (!sel || bloccato()) return;
  let f = '', d = '';
  if (sel.value === 'altra'){
    const fx = $('#sitac-freqAltraF'), dx = $('#sitac-freqAltraD');
    f = (fx.value || '').trim().replace(',', '.');
    d = (dx.value || '').trim() || 'Frequenza specifica';
    if (!f){ fx.focus(); fx.classList.add('campo-mancante'); return; }
    fx.classList.remove('campo-mancante');
    // Solo un numero: si aggiunge l'unità
    if (/^\d{2,3}(\.\d{1,3})?$/.test(f)) f = Number(f).toFixed(3) + ' MHz';
    fx.value = ''; dx.value = '';
  } else {
    const o = sel.selectedOptions[0];
    if (!o || !o.dataset.f) return;
    f = o.dataset.f; d = o.dataset.d;
  }
  if (voci.some(v => v.f === f && v.d === d)) return;
  voci.push({f, d, uso: ''});
  salva(); disegna();
  sel.value = ''; mostraAltra();
}

function html(){
  return `<label for="sitac-freqScelta">Frequenze radio</label>`
    + `<div class="sitac-freq-riga"><select id="sitac-freqScelta"></select>`
    + `<button type="button" id="sitac-freqAggiungi">＋ Aggiungi</button></div>`
    + `<div id="sitac-freqAltra" class="sitac-freq-altra" hidden>`
    + `<input type="text" id="sitac-freqAltraF" maxlength="20" inputmode="decimal" placeholder="Frequenza in MHz (es. 123.450)">`
    + `<input type="text" id="sitac-freqAltraD" maxlength="60" placeholder="Descrizione (es. TBT elicottero regionale)"></div>`
    + `<div id="sitac-freqElenco" class="sitac-freq-elenco"></div>`;
}

function monta(){
  const dati = $('#sitac-app .sitac-pannello[data-scheda="dati"] .sitac-dati');
  if (!dati || $('#sitac-freqScelta')) return !!dati;
  const campo = document.createElement('div');
  campo.className = 'sitac-dati-campo sitac-freq';
  campo.dataset.c = 'freq';
  campo.innerHTML = html();
  const az = dati.querySelector('[data-c="az"]');
  dati.insertBefore(campo, az || null);
  riempiSelect();
  disegna();

  campo.addEventListener('change', e => {
    if (e.target.id === 'sitac-freqScelta'){
      mostraAltra();
      if (e.target.value !== 'altra' && e.target.value !== '') aggiungi();
      else if (e.target.value === 'altra') $('#sitac-freqAltraF').focus();
    }
  });
  campo.addEventListener('click', e => {
    if (e.target.closest('#sitac-freqAggiungi')) aggiungi();
    const del = e.target.closest('[data-freq-del]');
    if (del && !bloccato()){ voci.splice(+del.dataset.freqDel, 1); salva(); disegna(); }
  });
  campo.addEventListener('input', e => {
    const u = e.target.dataset && e.target.dataset.freqUso;
    if (u != null && voci[+u]){ voci[+u].uso = e.target.value; salva(); }
  });
  campo.addEventListener('keydown', e => {
    if (e.key === 'Enter' && (e.target.id === 'sitac-freqAltraF' || e.target.id === 'sitac-freqAltraD')){ e.preventDefault(); aggiungi(); }
  });

  // Il Comando dell'intervento cambia con la posizione del DOS: si rifanno le consigliate
  const cmd = $('#sitac-comando');
  if (cmd) new MutationObserver(riempiSelect).observe(cmd, {childList: true, characterData: true, subtree: true});
  // Convalida / Modifica dei dati: il campo segue il blocco degli altri
  const nom = $('#sitac-nominativo');
  if (nom) new MutationObserver(disegna).observe(nom, {attributes: true, attributeFilter: ['readonly', 'class']});
  document.addEventListener('fireops:comando-attivo-cambiato', riempiSelect);
  return true;
}

/* Testo di una voce per la stampa e i messaggi. */
const testo = v => v.f + ' — ' + v.d + (v.uso ? ' (' + v.uso + ')' : '');

window.FireOpsSitacFrequenze = {
  lista: () => voci.map(v => ({frequenza: v.f, descrizione: v.d, uso: v.uso || ''})),
  testo: () => voci.map(testo),
  imposta(arr){
    voci = (Array.isArray(arr) ? arr : []).map(v => typeof v === 'string'
      ? {f: v, d: '', uso: ''}
      : {f: String(v.frequenza || v.f || ''), d: String(v.descrizione || v.d || ''), uso: String(v.uso || '')})
      .filter(v => v.f);
    salva(); disegna();
  }
};

carica();
function avvia(){ if (!monta()) setTimeout(avvia, 500); }
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', avvia);
else avvia();
})();
