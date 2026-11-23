/*!
 * FireOps VVF — sitac-foto-bis.js — SITAC da immagine (scheda 3 della SITAC, solo BIS)
 *
 * Una foto (scattata, caricata, incollata con Ctrl+V o trascinata) su cui
 * disegnare frecce, doppie frecce, linee, tratteggi e scritte. Non chiede la
 * posizione del DOS: si usa subito, anche prima di compilare la scheda 1.
 * "Salva / condividi" produce un JPG con, se spuntata, una didascalia in
 * fondo con intervento, DOS, data e ora e frequenze (letti dalla scheda 1).
 * La foto resta sul dispositivo: non viene inviata da nessuna parte.
 *
 * Il pannello è <div id="sitac-foto" class="sitac-pannello" data-scheda="foto">
 * in index-bis.html: le linguette le gestisce sitac.js come le altre due.
 * Lo usa anche l'app FireOps Pro (app/sitac.html), che prende lo stesso markup.
 */
(function () {
'use strict';

const COLORI = [['#e3001b', 'Rosso'], ['#ffd400', 'Giallo'], ['#1e6fff', 'Blu'], ['#13a538', 'Verde'], ['#ffffff', 'Bianco'], ['#000000', 'Nero']];
const STRUMENTI = [['freccia', '➜ Freccia'], ['doppia', '⟷ Doppia'], ['tratto', '⇢ Tratteggio'], ['linea', '／ Linea'], ['testo', 'T Testo']];

function avvia(box){
  if (!box || box.dataset.pronto) return;
  box.dataset.pronto = '1';
  box.innerHTML = `
    <div class="sfo-barra">
      <label class="sfo-btn sfo-prim">📷 Scatta / carica foto<input type="file" class="sfo-file" accept="image/*" capture="environment" hidden></label>
      <label class="sfo-btn">🖼 Dalla galleria / file<input type="file" class="sfo-file" accept="image/*" hidden></label>
      <span class="sfo-sep"></span>
      ${STRUMENTI.map(([k, t], i) => `<button type="button" data-sfo-str="${k}"${i ? '' : ' class="attivo"'}>${t}</button>`).join('')}
    </div>
    <div class="sfo-barra">
      ${COLORI.map(([c, n], i) => `<button type="button" class="sfo-col${i ? '' : ' attivo'}" data-sfo-col="${c}" style="background:${c}" title="${n}" aria-label="${n}"></button>`).join('')}
      <label class="sfo-spess">Spessore <input type="range" class="sfo-spessore" min="2" max="14" value="6"></label>
      <span class="sfo-sep"></span>
      <button type="button" data-sfo="annulla" disabled>↶ Annulla</button>
      <button type="button" data-sfo="pulisci" disabled>🗑 Togli tutto</button>
      <label class="sfo-did"><input type="checkbox" class="sfo-didascalia" checked> Didascalia con i dati dell'intervento</label>
      <button type="button" data-sfo="salva" class="sfo-prim" disabled>💾 Salva / condividi</button>
    </div>
    <div class="sfo-tela">
      <div class="sfo-vuota">Scatta o carica una foto — oppure incollala (Ctrl+V) o trascinala qui.<br>
        Poi trascina per disegnare le frecce, dalla coda alla punta.<br>
        <small>Qui la posizione del DOS non serve.</small></div>
      <canvas hidden></canvas>
    </div>`;

  const $ = s => box.querySelector(s);
  const cv = $('canvas'), ctx = cv.getContext('2d'), tela = $('.sfo-tela');
  let img = null, segni = [], bozza = null, strumento = 'freccia', colore = COLORI[0][0];
  const spess = () => { const r = cv.getBoundingClientRect(); return +$('.sfo-spessore').value * (r.width ? cv.width / r.width : 1); };

  function apri(file){
    if (!file || !/^image\//.test(file.type)) return;
    const url = URL.createObjectURL(file), im = new Image();
    im.onload = () => {
      const k = Math.min(1, 2400 / Math.max(im.width, im.height));   // le foto del telefono sono enormi
      const c = document.createElement('canvas');
      c.width = Math.round(im.width * k); c.height = Math.round(im.height * k);
      c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
      img = c; segni = []; cv.width = c.width; cv.height = c.height;
      cv.hidden = false; $('.sfo-vuota').hidden = true;
      URL.revokeObjectURL(url); disegna(); stato();
    };
    im.src = url;
  }
  box.querySelectorAll('.sfo-file').forEach(i => { i.onchange = e => { apri(e.target.files[0]); e.target.value = ''; }; });
  tela.addEventListener('dragover', e => { e.preventDefault(); tela.classList.add('sopra'); });
  tela.addEventListener('dragleave', () => tela.classList.remove('sopra'));
  tela.addEventListener('drop', e => { e.preventDefault(); tela.classList.remove('sopra'); apri(e.dataTransfer.files[0]); });
  document.addEventListener('paste', e => {
    if (box.offsetParent === null || !box.classList.contains('attivo')) return;
    const it = [...(e.clipboardData || {}).items || []].find(x => /^image\//.test(x.type));
    if (it){ e.preventDefault(); apri(it.getAsFile()); }
  });

  function punta(c, x1, y1, x2, y2, w){
    const a = Math.atan2(y2 - y1, x2 - x1), L = w * 4.2;
    c.beginPath(); c.moveTo(x2, y2);
    c.lineTo(x2 - L * Math.cos(a - 0.42), y2 - L * Math.sin(a - 0.42));
    c.lineTo(x2 - L * Math.cos(a + 0.42), y2 - L * Math.sin(a + 0.42));
    c.closePath(); c.fill();
  }
  function segno(c, s){
    c.save(); c.strokeStyle = c.fillStyle = s.col; c.lineWidth = s.w; c.lineCap = 'round'; c.lineJoin = 'round';
    c.shadowColor = 'rgba(0,0,0,.55)'; c.shadowBlur = s.w * 0.9;     // si legge su qualunque foto
    if (s.t === 'testo'){
      c.font = 'bold ' + Math.round(s.w * 5) + 'px Arial, sans-serif'; c.textBaseline = 'middle';
      c.lineWidth = Math.max(2, s.w * 0.6); c.strokeStyle = s.col === '#000000' ? '#fff' : '#000';
      c.strokeText(s.txt, s.x1, s.y1); c.fillText(s.txt, s.x1, s.y1);
    } else {
      const a = Math.atan2(s.y2 - s.y1, s.x2 - s.x1);
      const acc = s.t === 'linea' ? 0 : s.w * 3.4;
      const xa = s.x2 - acc * Math.cos(a), ya = s.y2 - acc * Math.sin(a);
      const xb = s.t === 'doppia' ? s.x1 + acc * Math.cos(a) : s.x1, yb = s.t === 'doppia' ? s.y1 + acc * Math.sin(a) : s.y1;
      if (s.t === 'tratto') c.setLineDash([s.w * 2.4, s.w * 1.8]);
      c.beginPath(); c.moveTo(xb, yb); c.lineTo(xa, ya); c.stroke();
      c.setLineDash([]);
      if (s.t !== 'linea') punta(c, s.x1, s.y1, s.x2, s.y2, s.w);
      if (s.t === 'doppia') punta(c, s.x2, s.y2, s.x1, s.y1, s.w);
    }
    c.restore();
  }
  function disegna(){
    if (!img) return;
    ctx.clearRect(0, 0, cv.width, cv.height); ctx.drawImage(img, 0, 0);
    segni.forEach(s => segno(ctx, s));
    if (bozza) segno(ctx, bozza);
  }
  function stato(){
    $('[data-sfo="annulla"]').disabled = !segni.length;
    $('[data-sfo="pulisci"]').disabled = !segni.length;
    $('[data-sfo="salva"]').disabled = !img;
  }
  function punto(e){
    const r = cv.getBoundingClientRect();
    return {x: (e.clientX - r.left) * cv.width / r.width, y: (e.clientY - r.top) * cv.height / r.height};
  }
  cv.addEventListener('pointerdown', e => {
    if (!img) return;
    e.preventDefault();
    const p = punto(e);
    if (strumento === 'testo'){
      const t = prompt('Testo da scrivere sulla foto:');
      if (t && t.trim()){ segni.push({t: 'testo', txt: t.trim(), x1: p.x, y1: p.y, col: colore, w: spess()}); disegna(); stato(); }
      return;
    }
    cv.setPointerCapture(e.pointerId);
    bozza = {t: strumento, x1: p.x, y1: p.y, x2: p.x, y2: p.y, col: colore, w: spess()};
  });
  cv.addEventListener('pointermove', e => { if (!bozza) return; const p = punto(e); bozza.x2 = p.x; bozza.y2 = p.y; disegna(); });
  const fine = () => {
    if (!bozza) return;
    if (Math.hypot(bozza.x2 - bozza.x1, bozza.y2 - bozza.y1) > bozza.w * 3) segni.push(bozza);
    bozza = null; disegna(); stato();
  };
  cv.addEventListener('pointerup', fine); cv.addEventListener('pointercancel', fine);

  box.addEventListener('click', e => {
    const s = e.target.closest('[data-sfo-str]'), c = e.target.closest('[data-sfo-col]'), a = e.target.closest('[data-sfo]');
    if (s){ strumento = s.dataset.sfoStr; box.querySelectorAll('[data-sfo-str]').forEach(x => x.classList.toggle('attivo', x === s)); }
    if (c){ colore = c.dataset.sfoCol; box.querySelectorAll('[data-sfo-col]').forEach(x => x.classList.toggle('attivo', x === c)); }
    if (!a) return;
    if (a.dataset.sfo === 'annulla'){ segni.pop(); disegna(); stato(); }
    if (a.dataset.sfo === 'pulisci' && confirm('Togliere tutte le frecce e le scritte?')){ segni = []; disegna(); stato(); }
    if (a.dataset.sfo === 'salva') salva();
  });

  /* Didascalia: i dati della scheda 1, quelli che ci sono (la foto si può fare anche prima). */
  function righeDidascalia(){
    const v = id => { const x = document.getElementById(id); if (!x) return ''; return String(('value' in x ? x.value : x.textContent) || '').trim(); };
    const ora = new Intl.DateTimeFormat('it-IT', {dateStyle: 'short', timeStyle: 'short', timeZone: 'Europe/Rome'}).format(new Date());
    const senza = document.getElementById('sitac-senzaScheda');
    const int = senza && senza.checked ? 'senza scheda' : v('sitac-nIntervento');
    const dos = v('sitac-nDos') ? 'VF ' + v('sitac-nDos') : '';
    const chi = [v('sitac-qualifica'), v('sitac-nominativo')].filter(Boolean).join(' ');
    const cmd = v('sitac-comando').replace(/^—$/, '');
    const r1 = ['SITAC da immagine', int ? 'Int. ' + int : '', ora].filter(Boolean).join(' · ');
    const r2 = [dos ? 'DOS ' + dos : '', chi, v('sitac-telefono') ? 'tel. ' + v('sitac-telefono') : '', cmd].filter(Boolean).join(' · ');
    const fq = window.FireOpsSitacFrequenze ? window.FireOpsSitacFrequenze.testo().join(' · ') : '';
    return [r1, r2, fq ? 'Frequenze: ' + fq : ''].filter(Boolean);
  }

  function salva(){
    if (!img) return;
    const out = document.createElement('canvas'), righe = $('.sfo-didascalia').checked ? righeDidascalia() : [];
    const fs = Math.max(16, Math.round(cv.width / 55)), riga = Math.round(fs * 1.45), pad = Math.round(fs * 0.7);
    const fascia = righe.length ? righe.length * riga + pad * 2 : 0;
    out.width = cv.width; out.height = cv.height + fascia;
    const c = out.getContext('2d');
    c.drawImage(cv, 0, 0);
    if (fascia){
      c.fillStyle = '#10141a'; c.fillRect(0, cv.height, out.width, fascia);
      c.fillStyle = '#ffd700'; c.fillRect(0, cv.height, out.width, Math.max(3, fs / 6));
      c.textBaseline = 'top';
      righe.forEach((t, i) => {
        c.font = (i ? '' : 'bold ') + fs + 'px Arial, sans-serif';
        c.fillStyle = i ? '#e8e8e8' : '#ffd700';
        let s = t; while (c.measureText(s).width > out.width - pad * 2 && s.length > 4) s = s.slice(0, -2);
        c.fillText(s === t ? t : s + '…', pad, cv.height + pad + i * riga);
      });
    }
    const d = new Date(), z = n => String(n).padStart(2, '0');
    const int = (document.getElementById('sitac-nIntervento') || {}).value || '';
    const nome = 'SITAC-immagine' + (int ? '_' + int : '') + '_' + d.getFullYear() + z(d.getMonth() + 1) + z(d.getDate())
      + '_' + z(d.getHours()) + z(d.getMinutes()) + '.jpg';
    out.toBlob(b => {
      const f = new File([b], nome, {type: 'image/jpeg'});
      const mobile = matchMedia('(pointer:coarse)').matches;
      if (mobile && navigator.canShare && navigator.canShare({files: [f]})){
        navigator.share({files: [f], title: nome}).catch(() => {});
      } else {
        const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = nome;
        document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
      }
    }, 'image/jpeg', 0.9);
  }
}

function cerca(){
  const box = document.getElementById('sitac-foto');
  if (box){ avvia(box); return true; }
  return false;
}
/* Nell'app Pro il markup arriva dopo (fetch di index-bis.html): si riprova un po' */
if (!cerca()){
  let n = 0;
  const t = setInterval(() => { if (cerca() || ++n > 60) clearInterval(t); }, 500);
}
})();
