/* FireOps VVF - modulo Trigo (Pianificazione)
 * Misure con camera e mappa: altezza e area di proiezione, problema del faro, Snellius-Potenot, intersezione in avanti, calcola area.
 * Va in app/js/moduli/trigo.js. Leaflet arriva da FireOps.leaflet(); stile dalle variabili di fireops-app.css.
 * Sotto-pagine: #/trigo, #/trigo/altezza, #/trigo/faro, #/trigo/snellius, #/trigo/avanti, #/trigo/area
 */
(function(){
'use strict';
const CSS=`.pg-trigo{--acc:var(--ics-pianificazione);--ok:#3fa66b;--bad:#e8734a;--line2:#3a4552;--measure:#4cc9f0;--cut:#ffb703;
  max-width:640px;margin:0 auto;padding:12px 16px calc(24px + env(safe-area-inset-bottom,0px));color:var(--text);font-family:var(--sans)}
.pg-trigo *{box-sizing:border-box}
.pg-trigo [hidden]{display:none!important}
.pg-trigo button,.pg-trigo input,.pg-trigo select{font:inherit;color:inherit}
.pg-trigo button:focus-visible,.pg-trigo input:focus-visible,.pg-trigo select:focus-visible{outline:2px solid var(--text);outline-offset:2px}

/* barra interna */
.pg-trigo .tg-nav{display:flex;align-items:center;gap:10px;margin-bottom:12px}
.pg-trigo .tg-nav b{font-size:15px;font-weight:700;min-width:0}
.pg-trigo .tg-back{flex:none;background:var(--panel-2);border:1px solid var(--line);border-radius:19px;height:38px;padding:0 14px;font-weight:700;cursor:pointer}
.pg-trigo .tg-back:active{background:var(--line)}

/* scelte iniziali */
.pg-trigo .lead{margin:0 0 12px;font-size:13px;color:var(--text-dim)}
.pg-trigo .choice{height:84px;display:flex;align-items:stretch;width:100%;text-align:left;background:var(--panel);border:1px solid var(--line);border-radius:8px;
  padding:0;margin:0 0 10px;overflow:hidden;cursor:pointer}
.pg-trigo .choice:active{background:var(--panel-2)}
.pg-trigo .choice .sw{flex:none;width:72px;background:var(--acc);display:flex;align-items:center;justify-content:center;color:#fff}
.pg-trigo .choice .sw svg{width:46px;height:46px}
.pg-trigo .choice .tx{padding:0 14px;min-width:0;display:flex;flex-direction:column;justify-content:center}
.pg-trigo .choice h2{margin:0 0 3px;font-size:16.5px;font-weight:700}
.pg-trigo .choice p{margin:0;font-size:12.5px;color:var(--text-dim);line-height:1.4;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.pg-trigo .foot{margin:14px 0 0;padding-top:10px;border-top:1px solid var(--line);font-size:12.5px;color:var(--text-dim)}

/* passi: righe sottili (poco spazio), area di tocco ampia, etichetta sotto */
.pg-trigo .steps{display:flex;gap:5px;margin:8px 0 0}
.pg-trigo .step{position:relative;flex:1;height:6px;min-height:0;padding:0;border:0;border-radius:3px;background:var(--line);cursor:pointer}
.pg-trigo .step::before{content:'';position:absolute;left:-2px;right:-2px;top:-15px;bottom:-15px}
.pg-trigo .step.done{background:var(--ok)}
.pg-trigo .step.on{background:var(--yellow)}
.pg-trigo .steplabel{padding:8px 0 10px;font-size:13px;color:var(--text-dim);text-align:center}
.pg-trigo .strip{display:grid;grid-template-columns:repeat(var(--n,2),1fr);gap:8px;margin-bottom:10px}
.pg-trigo .strip div{border:1px solid var(--line);border-radius:8px;padding:6px 10px;background:var(--panel)}
.pg-trigo .strip span{display:block;font-size:12px;color:var(--text-dim)}
.pg-trigo .strip b{font-size:21px;line-height:1.2;font-variant-numeric:tabular-nums}

/* schede e moduli di input */
.pg-trigo .card{background:var(--panel);border:1px solid var(--line);border-radius:8px;padding:12px;margin-bottom:10px}
.pg-trigo .card h3{font-size:15px;font-weight:700;margin:0 0 8px}
.pg-trigo label.f{display:block;font-size:12.5px;color:var(--text-dim);margin:8px 0 3px}
.pg-trigo input,.pg-trigo select{width:100%;background:var(--bg);border:1px solid var(--line);padding:9px 10px;border-radius:6px;min-height:42px;
  color:var(--text);font-variant-numeric:tabular-nums}
.pg-trigo input:focus,.pg-trigo select:focus{outline:none;border-color:var(--yellow)}
.pg-trigo input[aria-invalid=true]{border-color:var(--bad)}
.pg-trigo input[type=range]{padding:0;min-height:0;accent-color:var(--yellow)}
.pg-trigo input[type=checkbox]{width:22px;min-height:22px;accent-color:var(--yellow)}
.pg-trigo .row{display:flex;gap:8px;align-items:flex-end}
.pg-trigo .row>*{flex:1;min-width:0}
.pg-trigo .row>.fit{flex:0 0 auto}
.pg-trigo .sub{font-size:12.5px;color:var(--text-dim);margin:6px 0 0}
.pg-trigo .hint{margin:8px 0;font-size:14px}
.pg-trigo .lnk{background:none;border:0;color:var(--yellow);text-decoration:underline;padding:0;cursor:pointer}

.pg-trigo .btn{background:var(--panel-2);border:1px solid var(--line);color:var(--text);padding:10px 14px;border-radius:8px;font-weight:600;
  cursor:pointer;min-height:44px}
.pg-trigo .btn:active{background:var(--line)}
.pg-trigo .btn.pri{background:var(--acc);border-color:var(--acc);color:#fff}
.pg-trigo .btn.sm{padding:6px 11px;min-height:38px;font-size:14px}
.pg-trigo .btn.big{width:100%;min-height:54px;font-size:16px}
.pg-trigo .btn.on{background:var(--yellow);border-color:var(--yellow);color:#000}
.pg-trigo .btn:disabled{opacity:.4}
.pg-trigo .chips{display:flex;flex-wrap:wrap;gap:6px}
.pg-trigo .seg{display:flex;border:1px solid var(--line);border-radius:8px;overflow:hidden}
.pg-trigo .seg button{flex:1;background:var(--panel-2);border:0;border-right:1px solid var(--line);padding:8px 4px;font-weight:600;font-size:14px;
  color:var(--text-dim);cursor:pointer;min-height:42px}
.pg-trigo .seg button:last-child{border-right:0}
.pg-trigo .seg button.on{background:var(--yellow);color:#000}

.pg-trigo .note{border:1px solid var(--line);border-radius:6px;padding:8px 10px;font-size:13px;color:var(--text-dim);margin:8px 0}
.pg-trigo .note.warn{border-color:var(--bad);color:var(--bad)}
.pg-trigo .note.ok{border-color:var(--ok);color:var(--ok);display:flex;gap:10px;align-items:center;justify-content:space-between}
.pg-trigo .note.stat{display:block}

/* mappa */
.pg-trigo .mapwrap{border:1px solid var(--line);border-radius:8px;background:var(--panel);display:flex;flex-direction:column;margin-bottom:10px;overflow:hidden}
.pg-trigo .maptools{display:flex;flex-wrap:wrap;gap:6px;padding:8px}
.pg-trigo .mapsearch{display:flex;gap:6px;padding:0 8px 8px}
.pg-trigo .mapsearch input{min-height:38px;padding:5px 8px}
.pg-trigo .mapcanvas{height:340px;position:relative;isolation:isolate;background:#0c0e10}
.pg-trigo .maphint{padding:6px 10px;font-size:13px;border-top:1px solid var(--line);color:var(--text-dim);min-height:32px}
.pg-trigo .mapwrap.expanded{position:fixed;inset:0;z-index:3000;margin:0;border:0;border-radius:0;background:var(--bg)}
.pg-trigo .mapwrap.expanded .mapcanvas{flex:1;height:auto}
.pg-trigo .pin{width:32px;height:32px;border-radius:50%;display:grid;place-items:center;background:var(--bg,#ffd700);color:var(--fg,#000);
  font-weight:800;font-size:13px;border:3px solid #fff;box-shadow:0 0 0 2px #000,0 2px 8px #000a}
.pg-trigo .pin.mini{width:26px;height:26px;font-size:12px;border-width:2px;flex:0 0 auto}

/* camera */
.pg-trigo .cam{position:relative;aspect-ratio:3/4;max-height:72vh;width:100%;background:#0a0a0a;overflow:hidden;border:1px solid var(--line);border-radius:8px;touch-action:none}
.pg-trigo .cam video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;transform-origin:50% 50%}
.pg-trigo .reticle{position:absolute;left:50%;top:50%;width:86px;height:86px;margin:-43px 0 0 -43px;border:2px solid var(--yellow);border-radius:50%;pointer-events:none;box-shadow:0 0 0 1px #000}
.pg-trigo .reticle:before,.pg-trigo .reticle:after{content:'';position:absolute;background:var(--yellow)}
.pg-trigo .reticle:before{left:50%;top:-14px;bottom:-14px;width:2px;margin-left:-1px}
.pg-trigo .reticle:after{top:50%;left:-14px;right:-14px;height:2px;margin-top:-1px}
.pg-trigo .cam-hz{position:absolute;left:0;right:0;height:2px;background:var(--ok);top:50%;pointer-events:none;box-shadow:0 0 0 1px #0008}
.pg-trigo .cam-hz span{position:absolute;right:6px;top:4px;font-size:11px;color:var(--ok);background:#000a;padding:0 4px}
.pg-trigo .hud{position:absolute;top:8px;right:8px;background:#000c;border:1px solid var(--line2);border-radius:6px;padding:4px 10px;text-align:right;pointer-events:none}
.pg-trigo .hud b{display:block;font:700 26px/1.1 var(--mono)}
.pg-trigo .hud small{display:block;font-size:11px;color:var(--text-dim)}
.pg-trigo .cam .zoom{position:absolute;left:8px;top:50%;transform:translateY(-50%);background:#000b;border:1px solid var(--line2);border-radius:6px;padding:6px 4px;display:flex;flex-direction:column;align-items:center;gap:4px}
.pg-trigo .cam .zoom small{font-weight:700;font-size:12px}
.pg-trigo .cam .zoom input{width:28px;height:120px;writing-mode:vertical-lr;direction:rtl}
.pg-trigo .cam-start{position:absolute;inset:0;display:grid;place-items:center;text-align:center;padding:20px;background:#10141aee;z-index:3}
.pg-trigo .cam-mk{position:absolute;inset:0;pointer-events:none}
.pg-trigo .mk{position:absolute;top:0;bottom:0;width:0;border-left:2px dashed var(--yellow)}
.pg-trigo .mk span{position:absolute;top:32%;left:6px;background:var(--yellow);color:#000;font-weight:800;font-size:13px;padding:1px 7px;white-space:nowrap;border-radius:3px}
.pg-trigo .mk.done{border-left-color:var(--ok)}
.pg-trigo .mk.done span{background:var(--ok)}
.pg-trigo .mk.edge{border-left:0}
.pg-trigo .mk.edge span{left:0;top:44%}
.pg-trigo .mk.edge.r span{left:auto;right:0}

.pg-trigo #m2-mode{flex-wrap:wrap}.pg-trigo #m2-mode button{flex:1 1 45%}
.pg-trigo .stg{display:grid;grid-template-columns:repeat(var(--cols,3),1fr);gap:6px;margin-top:8px}
.pg-trigo .stgc{border:1px solid var(--line);border-radius:6px;background:var(--panel);padding:4px 8px;display:grid;grid-template-columns:1fr auto;align-items:center;gap:0 4px}
.pg-trigo .stgl{grid-column:1/-1;background:none;border:0;text-align:left;font-weight:600;font-size:13px;color:var(--text-dim);padding:2px 0;cursor:pointer}
.pg-trigo .stgc input{min-height:34px;padding:2px 4px;border:0;background:transparent;font:700 20px var(--mono)}
.pg-trigo .stgc.act{border-color:var(--yellow);background:var(--panel-2)}
.pg-trigo .stgc.act .stgl{color:var(--yellow)}
.pg-trigo .stgc.done{border-color:var(--ok)}

/* risultati */
.pg-trigo .big-n{font:700 56px/1.05 var(--sans);font-variant-numeric:tabular-nums}
.pg-trigo .big-n small{font-size:22px;color:var(--text-dim);margin-left:6px}
.pg-trigo .big-l{font-size:13px;color:var(--text-dim)}
.pg-trigo .kv{display:grid;grid-template-columns:1fr auto;gap:6px 12px;margin:10px 0 0;font-size:14px}
.pg-trigo .kv dt{color:var(--text-dim)}
.pg-trigo .kv dd{margin:0;font-weight:700;text-align:right;font-variant-numeric:tabular-nums}
.pg-trigo .coords{font:700 22px/1.2 var(--mono);word-break:break-word}
.pg-trigo .ptc{border-top:1px solid var(--line);padding:10px 0}
.pg-trigo .ptc:first-child{border-top:0}
.pg-trigo .ptc-h{display:flex;gap:8px;align-items:center}
.pg-trigo .ptc-h input{min-height:36px}
.pg-trigo .ptc-h+.row{margin-top:10px}
.pg-trigo .ms-need{grid-column:1/-1;font-size:13px;color:var(--text-dim);padding:2px 2px 4px}
.pg-trigo .ms-dgrp{grid-column:1/-1;display:grid;grid-template-columns:repeat(3,1fr);gap:8px;border:1px dashed var(--line);border-radius:8px;padding:8px}
.pg-trigo .ms-dgrp .ms-dh{grid-column:1/-1;font-size:13px;color:var(--text-dim)}
.pg-trigo .ms-sides label.calc input{border-style:dashed;color:var(--text-dim)}
.pg-trigo #ms-stage.stk{position:sticky;z-index:6;height:36vh;min-height:190px;margin-bottom:8px;box-shadow:0 8px 14px rgba(0,0,0,.45)}
@media (max-width:420px){.pg-trigo .ms-dgrp{grid-template-columns:1fr 1fr}}
.pg-trigo.tg-offline .pmap{display:none}
.pg-trigo .mapwrap.nomap .note{margin:0 0 8px}
.pg-trigo #tg-avanti .mapwrap.nomap .maptools{display:none}
.pg-trigo #tg-avanti .row>select.fit{width:auto;max-width:42%}
.pg-trigo #tg-avanti .cam{aspect-ratio:4/5;max-height:64vh}
.pg-trigo #tg-avanti .cam-start{place-items:start center;padding-top:14%}
.pg-trigo .toast{position:fixed;left:50%;bottom:calc(20px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);background:var(--yellow);color:#000;
  padding:10px 16px;font-weight:600;border-radius:6px;z-index:5000;max-width:90vw;text-align:center}
.pg-trigo .leaflet-container{background:#0c0e10;font-family:var(--sans)}

/* Calcola area (foto e pianta) */
.pg-trigo .ms button,.pg-trigo .ms .msb{font:inherit;color:var(--text);background:var(--panel-2);border:1px solid var(--line);border-radius:8px;padding:9px 12px;
  min-height:40px;cursor:pointer;display:inline-flex;align-items:center;justify-content:center}
.pg-trigo .ms button:active,.pg-trigo .ms .msb:active{background:var(--line)}
.pg-trigo .ms button.primary,.pg-trigo .ms .msb.primary{background:var(--acc);border-color:var(--acc);color:#fff;font-weight:600}
.pg-trigo .ms button.on{background:var(--yellow);border-color:var(--yellow);color:#000;font-weight:600}
.pg-trigo .ms button.danger{color:#ff8a8a}
.pg-trigo .ms button:disabled{opacity:.4;pointer-events:none}
.pg-trigo .ms-tabs{display:flex;margin-bottom:10px}
.pg-trigo .ms-tabs button{flex:1;border-radius:0;min-height:42px}
.pg-trigo .ms-tabs button:first-child{border-radius:8px 0 0 8px}
.pg-trigo .ms-tabs button:last-child{border-radius:0 8px 8px 0}
.pg-trigo .ms-tabs button+button{border-left:0}
.pg-trigo .am-v{width:24px;height:24px;border-radius:50%;background:var(--yellow);color:#000;border:2px solid #000;font:700 12px/20px var(--mono);text-align:center}
.pg-trigo .am-l{background:#000c;color:#fff;border:1px solid var(--line2);border-radius:4px;padding:0 4px;font:600 11px/16px var(--mono);white-space:nowrap;transform:translate(-50%,-50%);display:inline-block}
.pg-trigo .ms .ms-steps{display:flex;gap:5px;margin:2px 0 0}
.pg-trigo .ms .ms-steps button{position:relative;flex:1;height:6px;min-height:0;padding:0;border:0;border-radius:3px;background:var(--line);cursor:pointer}
.pg-trigo .ms .ms-steps button::before{content:'';position:absolute;left:-2px;right:-2px;top:-15px;bottom:-15px}
.pg-trigo .ms .ms-steps button.done{background:var(--ok)}
.pg-trigo .ms .ms-steps button.on{background:var(--yellow);border:0}
.pg-trigo .ms .ms-steps button:disabled{opacity:.4}
.pg-trigo #ms-stage{position:relative;height:54vh;min-height:280px;max-height:520px;background:#0c0e10;touch-action:none;overflow:hidden;border:1px solid var(--line);border-radius:8px;margin-bottom:10px}
.pg-trigo #ms-cv{position:absolute;inset:0;width:100%;height:100%;display:block}
.pg-trigo #ms-hint{position:absolute;left:8px;right:8px;top:8px;background:rgba(16,20,26,.9);border:1px solid var(--line);border-radius:8px;padding:7px 10px;font-size:13px;pointer-events:none}
.pg-trigo #ms-empty{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;text-align:center;padding:24px;color:var(--text-dim);font-size:13px}
.pg-trigo #ms-empty strong{color:var(--text);font-size:16px}
.pg-trigo .ms-zoom{position:absolute;right:8px;bottom:8px;display:flex;flex-direction:column;gap:6px}
.pg-trigo .ms-zoom button{width:46px;padding:0;font-size:20px;background:rgba(29,36,46,.92)}
.pg-trigo .ms-row{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px;align-items:center}
.pg-trigo .ms-chips button{padding:6px 11px;min-height:34px;border-radius:999px;font-size:14px}
.pg-trigo .ms-fields{display:grid;grid-template-columns:1.4fr 1fr 1fr;gap:8px;margin-bottom:8px}
.pg-trigo .ms-sides{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:8px}
.pg-trigo .ms-dirs{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:8px}
.pg-trigo .ms-dirs button{font-size:20px;padding:0}
@media (max-width:420px){.pg-trigo .ms-sides{grid-template-columns:repeat(2,1fr)}.pg-trigo .ms-fields{grid-template-columns:1fr 1fr}}
.pg-trigo .ms label{display:flex;flex-direction:column;gap:3px;font-size:12.5px;color:var(--text-dim)}
.pg-trigo .ms input[type=text],.pg-trigo .ms input[type=number],.pg-trigo .ms select{width:100%}
.pg-trigo #ms-res{font-size:14px}
.pg-trigo #ms-res table{width:100%;border-collapse:collapse;margin:4px 0 8px}
.pg-trigo #ms-res td{padding:4px 0;border-bottom:1px solid var(--line)}
.pg-trigo #ms-res td:last-child{text-align:right;font-variant-numeric:tabular-nums;font-weight:600}
.pg-trigo #ms-res .ms-tot td{border-bottom:0;color:var(--ok);font-size:16px;padding-top:8px}
.pg-trigo .ms-warn{color:var(--cut)}
.pg-trigo .ms-note{font-size:12.5px;color:var(--text-dim);margin:4px 0 8px}
.pg-trigo .ms details summary{color:var(--text-dim);font-size:13px;cursor:pointer}

/* rotazione della pianta */
.pg-trigo .ms-rot{background:var(--panel);border:1px solid var(--line);border-radius:8px;padding:12px;margin-bottom:10px}
.pg-trigo .ms-tit{display:flex;justify-content:space-between;align-items:baseline;font-size:15px;font-weight:700;margin-bottom:8px}
.pg-trigo .ms-tit b{font:700 15px var(--mono)}
.pg-trigo .ms-rot .ms-row{margin-bottom:4px}
.pg-trigo .ms-rot input[type=range]{width:100%;margin:8px 0 2px;accent-color:var(--yellow);height:28px;padding:0}
`;
const HTML=`<div class="tg-nav" id="tg-nav" hidden><button type="button" class="tg-back" id="tg-back">‹ Trigo</button><b id="tg-navt"></b><button type="button" class="tg-back tg-rst" style="margin-left:auto">Reset dati</button></div>

<section id="tg-home">
  <p class="lead">Misure con la camera del telefono e la mappa. Scegli che cosa devi ricavare.</p>

  <button type="button" class="choice" data-to="altezza">
    <span class="sw"><svg viewBox="0 0 76 76" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M6 67h64"/><path d="M56 67V34"/><path d="M56 7l-10 15h6l-9 13h26l-9-13h6z"/>
      <circle cx="12" cy="57" r="3.2"/><path d="M12 57h28" stroke-dasharray="3 4"/>
      <path d="M12 57L56 9" stroke="#10141a"/><path d="M12 57L56 67" stroke="#10141a"/></svg></span>
    <span class="tx"><h2>Altezza e area di proiezione</h2><p>Piante, edifici e teleferiche, con area di caduta.</p></span>
  </button>

  <button type="button" class="choice" data-to="avanti">
    <span class="sw"><svg viewBox="0 0 76 76" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M12 64L58 18M64 64L58 18" stroke="#10141a"/><path d="M12 64h52" stroke-dasharray="3 4"/>
      <circle cx="12" cy="64" r="4" fill="currentColor"/><circle cx="64" cy="64" r="4" fill="currentColor"/><circle cx="58" cy="18" r="5" fill="#10141a" stroke="none"/></svg></span>
    <span class="tx"><h2>Intersezione in avanti</h2><p>Coordinate e dislivello di un punto C da due stazioni.</p></span>
  </button>

  <button type="button" class="choice" data-to="snellius">
    <span class="sw"><svg viewBox="0 0 76 76" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M10 62L66 56L36 10z"/><path d="M37 40L10 62M37 40L66 56M37 40L36 10" stroke="#10141a"/>
      <circle cx="37" cy="40" r="4" fill="#10141a" stroke="none"/>
      <circle cx="10" cy="62" r="3.2" style="fill:var(--ics-pianificazione)"/><circle cx="66" cy="56" r="3.2" style="fill:var(--ics-pianificazione)"/><circle cx="36" cy="10" r="3.2" style="fill:var(--ics-pianificazione)"/></svg></span>
    <span class="tx"><h2>Intersezione all’indietro</h2><p>Snellius–Potenot: la tua posizione da tre punti noti.</p></span>
  </button>

  <button type="button" class="choice" data-to="faro">
    <span class="sw"><svg viewBox="0 0 76 76" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M52 66l4-40h8l4 40z"/><path d="M55 26v-8h10v8"/><path d="M54 18l6-9 6 9z"/>
      <path d="M4 68q4-4 8 0t8 0t8 0t8 0"/><circle cx="12" cy="58" r="3.2"/>
      <path d="M12 58h40" stroke-dasharray="3 4"/><path d="M12 58L60 22" stroke="#10141a"/></svg></span>
    <span class="tx"><h2>Problema del faro</h2><p>Distanza, quota o posizione di un punto, con l’alzo.</p></span>
  </button>

  <button type="button" class="choice" data-to="area">
    <span class="sw"><svg viewBox="0 0 76 76" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M10 10h34v20h22v30H10z" fill="rgba(255,255,255,.2)"/>
      <path d="M10 68h56" stroke="#10141a"/><path d="M10 64v8M66 64v8" stroke="#10141a"/>
      <circle cx="10" cy="10" r="3" fill="currentColor" stroke="none"/><circle cx="44" cy="10" r="3" fill="currentColor" stroke="none"/><circle cx="44" cy="30" r="3" fill="currentColor" stroke="none"/><circle cx="66" cy="30" r="3" fill="currentColor" stroke="none"/><circle cx="66" cy="60" r="3" fill="currentColor" stroke="none"/><circle cx="10" cy="60" r="3" fill="currentColor" stroke="none"/></svg></span>
    <span class="tx"><h2>Calcola area</h2><p>Superfici da foto, pianta a passi o mappa.</p></span>
  </button>

  <p class="foot">La precisione dipende dai sensori del telefono, di norma ±0,5–1°. Usa i risultati come stima e verifica con strumenti omologati quando serve.</p>
  <button type="button" class="tg-back tg-rst" style="margin:14px 0 4px;width:100%">Reset dati</button>
</section>

<section id="tg-altezza" hidden></section>
<section id="tg-faro" hidden></section>
<section id="tg-snellius" hidden></section>
<section id="tg-avanti" hidden></section>

<section id="tg-area" class="ms" hidden>
  <div class="ms-tabs" role="tablist" aria-label="Modalità">
    <button id="ms-tFoto" class="on" role="tab">Foto</button>
    <button id="ms-tPianta" role="tab">Pianta</button>
    <button id="ms-tMappa" role="tab">Mappa</button>
  </div>
  <div id="ms-stage">
    <canvas id="ms-cv"></canvas>
    <div id="ms-hint" hidden></div>
    <div id="ms-empty">
      <strong>Carica la foto di una parete, del soffitto o del pavimento</strong>
      <span>Segni i 4 spigoli, indichi larghezza e altezza reali di quella superficie e la pagina calcola l'area.</span>
      <div class="ms-row" style="justify-content:center;gap:10px">
        <label class="msb primary" for="ms-cam" style="margin:0;font-size:15px">Scatta foto</label>
        <label class="msb" for="ms-file" style="margin:0;font-size:15px">Dalla galleria</label>
      </div>
    </div>
    <div class="ms-zoom">
      <button id="ms-zin" aria-label="Zoom avanti">+</button>
      <button id="ms-zout" aria-label="Zoom indietro">−</button>
      <button id="ms-zfit" aria-label="Adatta alla vista" style="font-size:13px">Adatta</button>
    </div>
  </div>
  <input id="ms-file" type="file" accept="image/*" hidden>
  <input id="ms-cam" type="file" accept="image/*" capture="environment" hidden>

  <div id="ms-panel">
    <div id="ms-pFoto">
      <div class="ms-row">
        <label class="msb" for="ms-cam" style="margin:0;font-size:15px">Scatta</label>
        <label class="msb" for="ms-file" style="margin:0;font-size:15px">Galleria</label>
        <button id="ms-bNew" class="primary" disabled>Nuova superficie</button>
        <button id="ms-bCut" disabled>Apertura</button>
        <button id="ms-bClose" hidden>Chiudi apertura</button>
        <button id="ms-bDist" disabled>Distanza</button>
        <button id="ms-bUndo" disabled>Annulla</button>
      </div>
      <div class="ms-row ms-chips" id="ms-chips"></div>
      <div class="ms-fields" id="ms-fields" hidden>
        <label>Nome<input id="ms-fName" type="text" placeholder="Parete nord"></label>
        <label><span id="ms-lW">Larghezza reale (m)</span><input id="ms-fW" type="number" inputmode="decimal" step="any" min="0.1"></label>
        <label><span id="ms-lH">Altezza reale (m)</span><input id="ms-fH" type="number" inputmode="decimal" step="any" min="0.1"></label>
      </div>
    </div>

    <div id="ms-pPianta" hidden>
      <div class="ms-steps" role="tablist" aria-label="Fase della pianta">
        <button id="ms-sBozza" class="on" role="tab" aria-label="Fase 1: bozza della pianta"></button>
        <button id="ms-sMisure" role="tab" aria-label="Fase 2: misure dei lati" disabled></button>
      </div>
      <div class="steplabel" id="ms-stlabel">Fase 1 di 2 · Bozza della pianta</div>
      <div class="ms-rot" id="ms-rotBox" hidden>
        <div class="ms-tit">Ruota la pianta <b id="ms-rotv">0°</b></div>
        <div class="ms-row">
          <button id="ms-rotL" aria-label="Ruota di 90 gradi in senso antiorario">↺ 90°</button>
          <button id="ms-rotR" aria-label="Ruota di 90 gradi in senso orario">↻ 90°</button>
          <button id="ms-rotAl">L1 in orizzontale</button>
          <button id="ms-rotZ">Azzera</button>
        </div>
        <input id="ms-rot" type="range" min="-180" max="180" step="1" value="0" aria-label="Rotazione della pianta in gradi">
        <p class="ms-note">Positivo = senso orario. L'area, le misure e la chiusura non cambiano: si ricalcolano e restano coerenti. I nuovi vertici si agganciano alla griglia, non ai lati ruotati.</p>
      </div>
      <div id="ms-pBozza">
        <div class="ms-row">
          <button id="ms-bOrto" class="on" aria-pressed="true">Orto</button>
          <button id="ms-bSnap" class="on" aria-pressed="true">Snap</button>
          <label style="flex:1;min-width:120px">
            <select id="ms-fStep" aria-label="Passo della griglia">
              <option value="0.05">Griglia 5 cm</option><option value="0.1">Griglia 10 cm</option>
              <option value="0.25">Griglia 25 cm</option><option value="0.5" selected>Griglia 50 cm</option>
              <option value="1">Griglia 1 m</option><option value="boot">Griglia 1 tacco-punta</option>
            </select>
          </label>
        </div>
        <div class="ms-row">
          <button id="ms-bPClose" class="primary" hidden>Chiudi poligono</button>
          <button id="ms-bPUndo" disabled>Annulla</button>
          <button id="ms-bPNew" class="danger" disabled>Nuova pianta</button>
        </div>
        <details style="margin-bottom:8px">
          <summary>Disegna lato per lato con una lunghezza esatta</summary>
          <label style="margin:8px 0"><span id="ms-lLen">Lunghezza lato (m)</span><input id="ms-fLen" type="number" inputmode="decimal" step="any" min="0" placeholder="es. 4,5"></label>
          <div class="ms-dirs" role="group" aria-label="Aggiungi un lato nella direzione scelta">
            <button id="ms-dL" aria-label="Lato verso sinistra">←</button>
            <button id="ms-dU" aria-label="Lato verso l'alto">↑</button>
            <button id="ms-dD" aria-label="Lato verso il basso">↓</button>
            <button id="ms-dR" aria-label="Lato verso destra">→</button>
          </div>
        </details>
      </div>
      <div id="ms-pMisure" hidden>
        <div class="ms-sides" id="ms-sides"></div>
        <label style="margin-bottom:8px"><span>Altezza del locale (m, facoltativa)</span>
          <input id="ms-fPH" type="number" inputmode="decimal" step="any" min="0" placeholder="es. 2,7"></label>
      </div>
    </div>

    <div id="ms-unitRow" hidden>
      <div class="ms-fields">
        <label>Misurato in
          <select id="ms-fUnit"><option value="m">Metri</option><option value="b">Tacco-punta (stivale)</option><option value="p">Passi</option></select>
        </label>
        <label id="ms-bootLbl" hidden>1 tacco-punta = (cm)<input id="ms-fBoot" type="number" inputmode="decimal" step="any" min="10" value="31"></label>
        <label id="ms-pasLbl" hidden>1 passo = (tacco-punta)<input id="ms-fPas" type="number" inputmode="decimal" step="any" min="1" value="2.5"></label>
      </div>
      <div id="ms-conv" class="ms-note" hidden></div>
    </div>
    <div id="ms-res"></div>
    <div class="ms-row">
      <button id="ms-bCopy" disabled>Copia riepilogo</button>
      <button id="ms-bCsv" disabled>Scarica CSV</button>
      <button id="ms-bDel" class="danger" hidden>Elimina superficie</button>
    </div>
    <p class="ms-note" id="ms-noteFoto">Per una misura corretta, i 4 spigoli devono formare un rettangolo reale (parete, soffitto, pavimento) e larghezza e altezza devono essere quelle effettive, rilevate con metro, distanziometro o a passi. Le misure interne al rettangolo (aperture, distanze) sono tanto più precise quanto più la foto è frontale.</p>
    <p class="ms-note" id="ms-notePianta" hidden>1) Fai una bozza a mano libera del locale: la scala non conta, conta la forma (Orto tiene i lati dritti, Snap aggancia alla griglia). Tocca il vertice 1 (verde) per chiudere. 2) In "Misure" scrivi i tacco-punta o i passi contati: se la bozza ha angoli retti bastano le misure necessarie e gli altri lati si calcolano da soli (un lato obliquo ne vuole due: diagonale e altezza, oppure i due cateti). Senza angoli retti si misurano tutti i lati e la pagina compensa l'errore di chiusura. Se cambi unità, i numeri già scritti vengono letti nella nuova unità.</p>
  </div>
  <div id="ms-mapView" hidden>
    <div id="am-slot"></div>
    <div class="card">
      <div class="row"><input id="am-coord" inputmode="decimal" placeholder="Vertice per coordinate: 41.8902, 12.4922" aria-label="Aggiungi un vertice per coordinate"><button type="button" class="btn sm fit" id="am-addc">Aggiungi</button></div>
      <div class="row" style="margin-top:8px"><button type="button" class="btn sm" id="am-undo">Annulla ultimo</button><button type="button" class="btn sm" id="am-clear">Azzera</button></div>
    </div>
    <div id="am-res"></div>
  </div>
</section>

<div id="tg-toast" class="toast" hidden></div>
`;
let root=document;


/*MATH-START*/
const D2R=Math.PI/180, R2D=180/Math.PI, EARTH=6371008.8;
const FT=0.31, PASSO=2.5*FT;                       // 1 piede = 31 cm, 1 passo = 2,5 piedi
const norm180=a=>{a=((a+180)%360+360)%360-180;return a===-180?180:a;};
const norm360=a=>((a%360)+360)%360;

function distLL(a,b){
  const p1=a[0]*D2R,p2=b[0]*D2R,dp=p2-p1,dl=(b[1]-a[1])*D2R;
  const h=Math.sin(dp/2)**2+Math.cos(p1)*Math.cos(p2)*Math.sin(dl/2)**2;
  return 2*EARTH*Math.asin(Math.sqrt(h));
}
function bearingLL(a,b){
  const p1=a[0]*D2R,p2=b[0]*D2R,dl=(b[1]-a[1])*D2R;
  return norm360(Math.atan2(Math.sin(dl)*Math.cos(p2),Math.cos(p1)*Math.sin(p2)-Math.sin(p1)*Math.cos(p2)*Math.cos(dl))*R2D);
}
function destLL(a,brg,d){
  const p1=a[0]*D2R,l1=a[1]*D2R,t=brg*D2R,r=d/EARTH;
  const p2=Math.asin(Math.sin(p1)*Math.cos(r)+Math.cos(p1)*Math.sin(r)*Math.cos(t));
  const l2=l1+Math.atan2(Math.sin(t)*Math.sin(r)*Math.cos(p1),Math.cos(r)-Math.sin(p1)*Math.sin(p2));
  return [p2*R2D,l2*R2D];
}
function toXY(ll,o){return {x:EARTH*Math.cos(o[0]*D2R)*(ll[1]-o[1])*D2R, y:EARTH*(ll[0]-o[0])*D2R};}
function toLL(p,o){return [o[0]+p.y/EARTH*R2D, o[1]+p.x/(EARTH*Math.cos(o[0]*D2R))*R2D];}

/* Pianta con angoli retti: le direzioni ortogonali vengono dalla bozza, i lati obliqui hanno due incognite.
   Misure necessarie = lati H + lati V + 2·lati obliqui − 2 (la chiusura ne ricava due).
   Lato H/V: una lunghezza. Lato obliquo: due fra diagonale, cateto orizzontale, cateto verticale.
   sv = lunghezze (H/V) o diagonali, sx = cateti orizzontali, sy = cateti verticali, nell'unità scelta (pu m per unità). */
function planOrtho(poly,sv,sx,sy,pu){
  const n=poly.length;if(n<3)return null;
  const d=[],u=[];
  for(let i=0;i<n;i++){
    const a=poly[i],b=poly[(i+1)%n],l=Math.hypot(b.x-a.x,b.y-a.y);
    d.push(l);u.push(l>1e-9?{x:(b.x-a.x)/l,y:(b.y-a.y)/l}:{x:0,y:0});
  }
  const TOL=Math.sin(8*D2R),COS=Math.cos(8*D2R);
  const right=i=>{const p=u[(i+n-1)%n],q=u[i];return Math.abs(p.x*q.x+p.y*q.y)<TOL;};
  let ref=-1;
  for(let i=0;i<n;i++)if((right(i)||right((i+1)%n))&&d[i]>1e-9&&(ref<0||d[i]>d[ref]))ref=i;
  if(ref<0)return null;
  const e=u[ref],f={x:-e.y,y:e.x};
  const type=[],dxd=[],dyd=[];let hs=0,vs=0,ds=0;
  for(let i=0;i<n;i++){
    const x=d[i]*(u[i].x*e.x+u[i].y*e.y),y=d[i]*(u[i].x*f.x+u[i].y*f.y);
    dxd.push(x);dyd.push(y);
    const c=d[i]>1e-9?Math.abs(x)/d[i]:1;
    const t=c>COS?'H':c<TOL?'V':'D';
    type.push(t);if(t==='H')hs++;else if(t==='V')vs++;else ds++;
  }
  if(hs+vs===0)return null;
  const need=hs+vs+2*ds-2;
  const val=a=>(a>0?a*pu:null);
  const X=new Array(n).fill(null),Y=new Array(n).fill(null),Lm=new Array(n).fill(null);
  const derived=new Array(n).fill(false),est=new Array(n).fill(false),bad=new Array(n).fill(false);
  const sgx=i=>dxd[i]>=0?1:-1,sgy=i=>dyd[i]>=0?1:-1;
  let given=0;
  for(let i=0;i<n;i++){
    const l=val(sv[i]);
    if(type[i]==='H'){if(l!=null){X[i]=sgx(i)*l;given++;}Y[i]=0;}
    else if(type[i]==='V'){if(l!=null){Y[i]=sgy(i)*l;given++;}X[i]=0;}
    else{
      const a=val(sx[i]),b=val(sy[i]);Lm[i]=l;
      given+=Math.min(2,[l,a,b].filter(q=>q!=null).length);
      if(a!=null)X[i]=sgx(i)*a;if(b!=null)Y[i]=sgy(i)*b;
    }
  }
  const resolveD=()=>{
    for(let i=0;i<n;i++)if(type[i]==='D'&&Lm[i]!=null){
      if(X[i]!=null&&Y[i]==null)Y[i]=sgy(i)*Math.sqrt(Math.max(0,Lm[i]*Lm[i]-X[i]*X[i]));
      else if(Y[i]!=null&&X[i]==null)X[i]=sgx(i)*Math.sqrt(Math.max(0,Lm[i]*Lm[i]-Y[i]*Y[i]));
    }
  };
  const closeOne=(C,dd)=>{
    const unk=[];for(let i=0;i<n;i++)if(C[i]==null)unk.push(i);
    if(unk.length!==1)return;
    const k=unk[0];let sum=0;for(let i=0;i<n;i++)if(i!==k)sum+=C[i];
    C[k]=-sum;derived[k]=true;
    if(C[k]*dd[k]<-1e-9&&Math.abs(dd[k])>1e-9)bad[k]=true;
  };
  resolveD();
  for(let pass=0;pass<3;pass++){closeOne(X,dxd);closeOne(Y,dyd);resolveD();}
  /* scala media dai lati misurati, per le stime */
  let ks=0,kc=0;
  for(let i=0;i<n;i++){
    if(type[i]==='H'&&X[i]!=null&&!derived[i]&&Math.abs(dxd[i])>1e-9){ks+=Math.abs(X[i])/Math.abs(dxd[i]);kc++;}
    else if(type[i]==='V'&&Y[i]!=null&&!derived[i]&&Math.abs(dyd[i])>1e-9){ks+=Math.abs(Y[i])/Math.abs(dyd[i]);kc++;}
    else if(type[i]==='D'&&Lm[i]!=null&&d[i]>1e-9){ks+=Lm[i]/d[i];kc++;}
  }
  const kk=kc?ks/kc:1;
  for(let i=0;i<n;i++){
    if(X[i]==null||Y[i]==null){
      est[i]=true;
      const sc=(type[i]==='D'&&Lm[i]!=null&&d[i]>1e-9)?Lm[i]/d[i]:kk;
      if(X[i]==null)X[i]=dxd[i]*sc;
      if(Y[i]==null)Y[i]=dyd[i]*sc;
    }
  }
  const V=X.map((x,i)=>({x:x*e.x+Y[i]*f.x,y:x*e.y+Y[i]*f.y}));
  const L=V.map(v=>Math.hypot(v.x,v.y));
  const P=[{x:0,y:0}];let px=0,py=0;
  V.forEach(v=>{px+=v.x;py+=v.y;P.push({x:px,y:py});});
  const mis=P[n],tot=L.reduce((a,b)=>a+b,0);
  const pts=[];let cum=0;
  for(let i=0;i<n;i++){pts.push({x:P[i].x-mis.x*cum/tot,y:P[i].y-mis.y*cum/tot});cum+=L[i];}
  const flag=type.map((t,i)=>est[i]?'e':derived[i]?'c':'m');
  const dxv=X.map(Math.abs),dyv=Y.map(Math.abs);
  return {ortho:true,pts,L,type,flag,meas:flag.map(q=>q!=='e'),bad,need,given,hs,vs,ds,e,f,dxv,dyv,
    cnt:given,mis:Math.hypot(mis.x,mis.y),tot,sufficient:!est.some(Boolean)};
}

/* Area e perimetro di un poligono da vertici lat/lon (proiezione locale: errore trascurabile sotto i 10 km) */
function segCross(a,b,c,d){
  const o=(p,q,r)=>(q.x-p.x)*(r.y-p.y)-(q.y-p.y)*(r.x-p.x);
  const d1=o(a,b,c),d2=o(a,b,d),d3=o(c,d,a),d4=o(c,d,b);
  return ((d1>0&&d2<0)||(d1<0&&d2>0))&&((d3>0&&d4<0)||(d3<0&&d4>0));
}
function polyAreaLL(p){
  const n=p.length;if(n<2)return null;
  const o=[p.reduce((s,x)=>s+x[0],0)/n,p.reduce((s,x)=>s+x[1],0)/n];
  const xy=p.map(q=>toXY(q,o)),sides=[],m=n>=3?n:n-1;
  for(let i=0;i<m;i++)sides.push(distLL(p[i],p[(i+1)%n]));
  const perim=sides.reduce((a,b)=>a+b,0);
  if(n<3)return {n,perim,sides,area:0,closed:false,selfInt:false,centroid:null};
  let a2=0,cx=0,cy=0;
  for(let i=0;i<n;i++){const A=xy[i],B=xy[(i+1)%n],c=A.x*B.y-B.x*A.y;a2+=c;cx+=(A.x+B.x)*c;cy+=(A.y+B.y)*c;}
  let selfInt=false;
  for(let i=0;i<n&&!selfInt;i++)for(let j=i+2;j<n;j++){
    if(i===0&&j===n-1)continue;
    if(segCross(xy[i],xy[(i+1)%n],xy[j],xy[(j+1)%n])){selfInt=true;break;}
  }
  const centroid=a2!==0?toLL({x:cx/(3*a2),y:cy/(3*a2)},o):toLL({x:0,y:0},o);
  return {n,perim,sides,area:Math.abs(a2)/2,closed:true,selfInt,centroid};
}

/* Altezza: H = D·(tan β − tan α); α negativo se la base è sotto l'orizzonte */
function heightCalc(D,betaDeg,alphaDeg){
  const tb=Math.tan(betaDeg*D2R), ta=Math.tan(alphaDeg*D2R);
  return {H:D*(tb-ta), sTop:D/Math.cos(betaDeg*D2R), sBase:D/Math.cos(alphaDeg*D2R), eyeAboveBase:-D*ta};
}

/* Faro: distanza da dislivello e alzo; opzionale curvatura terrestre + rifrazione (k=0,13)
   c·D² + tanθ·D − ΔZ = 0 con c=(1−k)/(2R) */
function distFromAngle(dz,thetaDeg,curv,k){
  k=(k==null)?0.13:k;
  const t=Math.tan(thetaDeg*D2R);
  if(!curv){const D=dz/t;return (isFinite(D)&&D>0)?D:NaN;}
  const c=(1-k)/(2*EARTH), disc=t*t+4*c*dz;
  if(disc<0) return NaN;
  const s=Math.sqrt(disc);
  const r=[(-t+s)/(2*c),(-t-s)/(2*c)].filter(x=>x>0);
  return r.length?Math.min(...r):NaN;
}

/* Faro al contrario: dislivello da distanza e alzo (inversa di distFromAngle) */
function dzFromDist(D,thetaDeg,curv,k){
  k=(k==null)?0.13:k;
  return D*Math.tan(thetaDeg*D2R)+(curv?(1-k)/(2*EARTH)*D*D:0);
}

/* Snellius–Potenot: intersezione di due archi capaci; P = riflesso di B rispetto alla retta dei centri */
function circleCenter(P1,P2,angDeg){
  const s=Math.sin(angDeg*D2R); if(Math.abs(s)<1e-6) return null;
  const dx=P2.x-P1.x, dy=P2.y-P1.y, d=Math.hypot(dx,dy); if(d<1e-9) return null;
  const k=(d/2)*Math.cos(angDeg*D2R)/s;
  return {x:(P1.x+P2.x)/2+(-dy/d)*k, y:(P1.y+P2.y)/2+(dx/d)*k};
}
function solveResection(A,B,C,thA,thB,thC){
  const gam=norm180(-(thB-thA)), alp=norm180(-(thC-thB));
  const c1=circleCenter(A,B,gam), c2=circleCenter(B,C,alp);
  if(!c1||!c2) return null;
  const dx=c2.x-c1.x, dy=c2.y-c1.y, L=Math.hypot(dx,dy); if(L<1e-6) return null;
  const ux=dx/L, uy=dy/L, wx=B.x-c1.x, wy=B.y-c1.y, t=wx*ux+wy*uy;
  const P={x:c1.x+2*t*ux-wx, y:c1.y+2*t*uy-wy};
  if(Math.hypot(P.x-B.x,P.y-B.y)<1e-3) return null;
  return P;
}
function circum(A,B,C){
  const d=2*(A.x*(B.y-C.y)+B.x*(C.y-A.y)+C.x*(A.y-B.y)); if(Math.abs(d)<1e-9) return null;
  const a2=A.x*A.x+A.y*A.y,b2=B.x*B.x+B.y*B.y,c2=C.x*C.x+C.y*C.y;
  const ux=(a2*(B.y-C.y)+b2*(C.y-A.y)+c2*(A.y-B.y))/d, uy=(a2*(C.x-B.x)+b2*(A.x-C.x)+c2*(B.x-A.x))/d;
  return {x:ux,y:uy,r:Math.hypot(A.x-ux,A.y-uy)};
}
function resection(ll,az,sigma){
  const o=[(ll[0][0]+ll[1][0]+ll[2][0])/3,(ll[0][1]+ll[1][1]+ll[2][1])/3];
  const [A,B,C]=ll.map(p=>toXY(p,o));
  const P=solveResection(A,B,C,az[0],az[1],az[2]);
  if(!P) return null;
  let err=0;
  for(let i=0;i<8;i++){
    const q=solveResection(A,B,C,az[0]+((i&1)?sigma:-sigma),az[1]+((i&2)?sigma:-sigma),az[2]+((i&4)?sigma:-sigma));
    if(!q){err=Infinity;break;}
    err=Math.max(err,Math.hypot(q.x-P.x,q.y-P.y));
  }
  const cc=circum(A,B,C);
  const danger=cc?Math.abs(Math.hypot(P.x-cc.x,P.y-cc.y)-cc.r)/cc.r:0;
  return {ll:toLL(P,o), err, danger,
          angAB:Math.abs(norm180(az[1]-az[0])), angBC:Math.abs(norm180(az[2]-az[1]))};
}

/* Intersezione in avanti: C è l'incontro delle semirette da A (azimut thA) e da B (azimut thB), azimut veri in gradi.
   t e s sono le distanze A→C e B→C; se le semirette divergono (C "dietro") restituisce {behind:true}. */
function rayIntersect(A,thA,B,thB){
  const d1={x:Math.sin(thA*D2R),y:Math.cos(thA*D2R)}, d2={x:Math.sin(thB*D2R),y:Math.cos(thB*D2R)};
  const c=d1.x*d2.y-d1.y*d2.x; if(Math.abs(c)<1e-6) return null;
  const w={x:B.x-A.x,y:B.y-A.y};
  const t=(w.x*d2.y-w.y*d2.x)/c, s=(w.x*d1.y-w.y*d1.x)/c;
  if(t<=0||s<=0) return {behind:true};
  return {x:A.x+t*d1.x,y:A.y+t*d1.y,t,s};
}
function forwardIntersection(ll,az,sigma){
  const o=[(ll[0][0]+ll[1][0])/2,(ll[0][1]+ll[1][1])/2];
  const A=toXY(ll[0],o), B=toXY(ll[1],o);
  const r=rayIntersect(A,az[0],B,az[1]);
  if(!r||r.behind) return r;
  let err=0;
  for(let i=0;i<4;i++){
    const q=rayIntersect(A,az[0]+((i&1)?sigma:-sigma),B,az[1]+((i&2)?sigma:-sigma));
    if(!q||q.behind){err=Infinity;break;}
    err=Math.max(err,Math.hypot(q.x-r.x,q.y-r.y));
  }
  return {ll:toLL(r,o), dA:r.t, dB:r.s, gamma:Math.abs(norm180(az[0]-az[1])), err, base:Math.hypot(B.x-A.x,B.y-A.y)};
}

/* UTM WGS84 (serie di Krüger) */
const UTM_A=6378137, UTM_F=1/298.257223563, UTM_K0=0.9996;
function utmConst(){const n=UTM_F/(2-UTM_F);return {n,A:UTM_A/(1+n)*(1+n*n/4+n**4/64),e:Math.sqrt(UTM_F*(2-UTM_F))};}
function utmZone(lon){return Math.min(60,Math.max(1,Math.floor((lon+180)/6)+1));}
function utmBand(lat){return 'CDEFGHJKLMNPQRSTUVWX'.charAt(Math.max(0,Math.min(19,Math.floor((lat+80)/8))));}
function ll2utm(lat,lon,zone){
  zone=zone||utmZone(lon);
  const {n,A,e}=utmConst();
  const al=[n/2-2*n*n/3+5*n**3/16, 13*n*n/48-3*n**3/5, 61*n**3/240];
  const lon0=((zone-1)*6-180+3)*D2R, p=lat*D2R, l=lon*D2R-lon0;
  const t=Math.sinh(Math.atanh(Math.sin(p))-e*Math.atanh(e*Math.sin(p)));
  const xp=Math.atan2(t,Math.cos(l)), ep=Math.atanh(Math.sin(l)/Math.hypot(1,t));
  let x=xp,y=ep;
  for(let j=1;j<=3;j++){x+=al[j-1]*Math.sin(2*j*xp)*Math.cosh(2*j*ep); y+=al[j-1]*Math.cos(2*j*xp)*Math.sinh(2*j*ep);}
  return {zone,E:500000+UTM_K0*A*y, N:UTM_K0*A*x+(lat<0?1e7:0)};
}
function utm2ll(E,N,zone,south){
  const {n,A}=utmConst();
  const be=[n/2-2*n*n/3+37*n**3/96, n*n/48+n**3/15, 17*n**3/480];
  const de=[2*n-2*n*n/3-2*n**3, 7*n*n/3-8*n**3/5, 56*n**3/15];
  const x=(N-(south?1e7:0))/(UTM_K0*A), y=(E-500000)/(UTM_K0*A);
  let xp=x,yp=y;
  for(let j=1;j<=3;j++){xp-=be[j-1]*Math.sin(2*j*x)*Math.cosh(2*j*y); yp-=be[j-1]*Math.cos(2*j*x)*Math.sinh(2*j*y);}
  const chi=Math.asin(Math.sin(xp)/Math.cosh(yp)); let p=chi;
  for(let j=1;j<=3;j++) p+=de[j-1]*Math.sin(2*j*chi);
  const lon0=((zone-1)*6-180+3)*D2R, l=lon0+Math.atan2(Math.sinh(yp),Math.cos(xp));
  return [p*R2D,l*R2D];
}
function nums(s){return (String(s).match(/-?\d+(?:[.,]\d+)?/g)||[]).map(x=>parseFloat(x.replace(',','.')));}
function parseCoord(s,fmt,zone){
  const v=nums(s); if(v.length<2) return null;
  if(fmt==='utm'){
    let E=v[0],N=v[1];
    if(E>900000&&N>100000&&N<900000){const t=E;E=N;N=t;}
    if(E<100000||E>900000||N<0||N>1e7) return null;
    return utm2ll(E,N,zone,false);
  }
  if(Math.abs(v[0])>90||Math.abs(v[1])>180) return null;
  return [v[0],v[1]];
}
function fmtCoord(ll,fmt,zone){
  if(fmt==='utm'){const u=ll2utm(ll[0],ll[1],zone);return Math.round(u.E)+' '+Math.round(u.N);}
  return ll[0].toFixed(6)+', '+ll[1].toFixed(6);
}
/*MATH-END*/

/* ============================================================ */
/*  Utilità UI                                                  */
/* ============================================================ */
const $=(s,r=root)=>r.querySelector(s), $$=(s,r=root)=>Array.from(r.querySelectorAll(s));
const fmt=(v,d=1)=>Number.isFinite(v)?v.toLocaleString('it-IT',{minimumFractionDigits:d,maximumFractionDigits:d}):'—';
const sgn=(v,d=1)=>Number.isFinite(v)?(v<0?'−':'+')+fmt(Math.abs(v),d):'—';
const num=id=>{const el=$('#'+id);if(!el)return null;const v=parseFloat(String(el.value).replace(',','.'));return Number.isFinite(v)?v:null;};
const r2=v=>Math.round(v*100)/100;
/* Leaflet opzionale: se non si carica (nessuna connessione) la pagina funziona lo stesso, senza mappa */
const DUMMY=new Proxy(function(){},{get:(t,k)=>k==='valueOf'?()=>0:k==='toString'?()=>'':(k==='then'||typeof k==='symbol')?undefined:DUMMY,apply:()=>DUMMY});
const L=new Proxy({},{get:(t,k)=>typeof window.L!=='undefined'?window.L[k]:DUMMY});
const HFOV=52, VFOV=68;   // campo visivo approssimato (verticale/orizzontale, ritratto, zoom 1×)
let toastT;
function toast(m){const t=$('#tg-toast');t.textContent=m;t.hidden=false;clearTimeout(toastT);toastT=setTimeout(()=>{t.hidden=true;},3600);}
function download(text,name,type){
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type}));a.download=name;
  document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),2000);
}
function stamp(){const d=new Date(),p=n=>String(n).padStart(2,'0');return d.getFullYear()+p(d.getMonth()+1)+p(d.getDate())+'-'+p(d.getHours())+p(d.getMinutes());}
function copyText(t){
  if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(t).then(()=>toast('Copiato'),()=>toast('Copia non riuscita'));return;}
  const x=document.createElement('textarea');x.value=t;document.body.appendChild(x);x.select();
  try{document.execCommand('copy');toast('Copiato');}catch(e){toast('Copia non riuscita');}x.remove();
}
function boundsAround(c,r){return L.latLngBounds([destLL(c,0,r),destLL(c,90,r),destLL(c,180,r),destLL(c,270,r)]);}
function ring(c,r,n=72){const a=[];for(let i=0;i<=n;i++){const p=destLL(c,360*i/n,r);a.push([+p[1].toFixed(7),+p[0].toFixed(7)]);}return a;}

/* ============================================================ */
/*  Sensori e camera                                            */
/* ============================================================ */
const Sensors={
  video:null,stream:null,on:false,hasOri:false,abs:false,compass:false,render:null,zoom:1,
  eb:[],ab:[],N:24,_raf:0,
  _h(e){
    const S=Sensors;
    if(e.type==='deviceorientationabsolute'){ if(e.alpha==null) return; S.abs=true; }
    else if(S.abs) return;
    if(e.beta==null||e.gamma==null) return;
    let al=e.alpha==null?0:e.alpha, comp=S.abs;
    if(typeof e.webkitCompassHeading==='number'&&e.webkitCompassHeading>=0){al=360-e.webkitCompassHeading;comp=true;}
    S.hasOri=true;S.compass=comp;
    const a=al*D2R,b=e.beta*D2R,g=e.gamma*D2R;
    // versore "retro del telefono" nel sistema Est-Nord-Alto (matrice W3C Rz(α)·Rx(β)·Ry(γ))
    const zx=Math.cos(a)*Math.sin(g)+Math.sin(a)*Math.sin(b)*Math.cos(g);
    const zy=Math.sin(a)*Math.sin(g)-Math.cos(a)*Math.sin(b)*Math.cos(g);
    const zz=Math.cos(b)*Math.cos(g);
    const elev=Math.asin(Math.max(-1,Math.min(1,-zz)))*R2D;
    const az=norm360(Math.atan2(-zx,-zy)*R2D);
    S.eb.push(elev);if(S.eb.length>S.N)S.eb.shift();
    S.ab.push(az);if(S.ab.length>S.N)S.ab.shift();
    if(S.render&&!S._raf)S._raf=requestAnimationFrame(()=>{S._raf=0;if(S.render)S.render();});
  },
  elev(){const b=this.eb;return b.length?b.reduce((s,x)=>s+x,0)/b.length:NaN;},
  elevStd(){const b=this.eb;if(b.length<3)return 9;const m=this.elev();return Math.sqrt(b.reduce((s,x)=>s+(x-m)**2,0)/b.length);},
  az(){const b=this.ab;if(!b.length)return NaN;let s=0,c=0;b.forEach(x=>{s+=Math.sin(x*D2R);c+=Math.cos(x*D2R);});return norm360(Math.atan2(s,c)*R2D);},
  azStd(){const b=this.ab;if(b.length<3)return 99;let s=0,c=0;b.forEach(x=>{s+=Math.sin(x*D2R);c+=Math.cos(x*D2R);});
    const R=Math.hypot(s,c)/b.length;return R>=1?0:Math.sqrt(-2*Math.log(R))*R2D;},
  async start(video){
    const out={err:''};this.video=video;
    if(!this.on){
      this.on=true;
      try{
        const DO=window.DeviceOrientationEvent;
        if(DO&&typeof DO.requestPermission==='function'){
          const r=await DO.requestPermission();
          if(r!=='granted')out.err='Permesso ai sensori di movimento negato. ';
        }
      }catch(e){out.err='Permesso ai sensori non concesso. ';}
      window.addEventListener('deviceorientationabsolute',this._h,true);
      window.addEventListener('deviceorientation',this._h,true);
    }
    try{
      if(this.stream)this.stream.getTracks().forEach(t=>t.stop());
      this.stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:720}},audio:false});
      video.srcObject=this.stream;
      try{await video.play();}catch(e){}
      this.setZoom(this.zoom);
    }catch(e){out.err+='Camera non disponibile: controlla i permessi (serve HTTPS).';}
    return out;
  },
  stop(){
    if(this.stream){this.stream.getTracks().forEach(t=>t.stop());this.stream=null;}
    if(this.video)this.video.srcObject=null;
    window.removeEventListener('deviceorientationabsolute',this._h,true);
    window.removeEventListener('deviceorientation',this._h,true);
    this.on=false;this.hasOri=false;this.abs=false;this.compass=false;this.eb=[];this.ab=[];this.render=null;
  },
  setZoom(z){
    this.zoom=z;const v=this.video;if(!v)return;
    const tr=this.stream&&this.stream.getVideoTracks&&this.stream.getVideoTracks()[0];
    const caps=tr&&tr.getCapabilities?tr.getCapabilities():null;
    if(caps&&caps.zoom){
      const zz=Math.min(caps.zoom.max,Math.max(caps.zoom.min,z));
      tr.applyConstraints({advanced:[{zoom:zz}]}).catch(()=>{});v.style.transform='';
    }else{v.style.transform='scale('+z+')';}
  }
};

function camHTML(p,o){
  return `<div class="cam" id="${p}-cam">
    <video id="${p}-video" playsinline muted autoplay></video>
    <div class="cam-hz" id="${p}-hz" ${o.horizon?'':'hidden'}><span>orizzonte</span></div>
    <div class="cam-mk" id="${p}-mk"></div>
    <div class="reticle"></div>
    <div class="hud"><small>${o.hud}</small><b id="${p}-hv">—</b><small id="${p}-hs"></small></div>
    <div class="zoom"><small id="${p}-zv">1×</small><input id="${p}-zoom" type="range" min="1" max="5" step="0.1" value="1" aria-label="Zoom"></div>
    <div class="cam-start" id="${p}-start"><div>
      <button type="button" class="btn pri big" id="${p}-go">Attiva camera e sensori</button>
      <p class="sub" id="${p}-msg">Servono i permessi alla fotocamera e ai sensori di movimento.</p>
    </div></div>
  </div>`;
}
function bindCam(p,render){
  const video=$('#'+p+'-video'),start=$('#'+p+'-start'),msg=$('#'+p+'-msg'),zi=$('#'+p+'-zoom'),zv=$('#'+p+'-zv');
  $('#'+p+'-go').onclick=async()=>{
    msg.textContent='Avvio in corso…';
    Sensors.render=render;
    const r=await Sensors.start(video);
    msg.textContent=r.err||'';
    if(Sensors.stream||!r.err){start.hidden=true;}
    else{start.hidden=true;toast(r.err);}
    setTimeout(()=>{if(Sensors.on&&!Sensors.hasOri)toast('Sensori di orientamento non rilevati: inserisci gli angoli a mano.');},2500);
  };
  zi.oninput=()=>{const z=parseFloat(zi.value);zv.textContent=z.toFixed(1)+'×';Sensors.setZoom(z);};
  zi.value=1;zv.textContent='1×';
}
function showStart(p){const s=$('#'+p+'-start');if(s)s.hidden=false;}

/* Sequenza di acquisizione: bottone principale + riquadri con i valori (modificabili a mano) */
function makeFlow(p,stages,store,hint,onChange,onCapture,okc){
  okc=okc||{go:3,text:'Vedi risultato',msg:'Misura completa.'};
  let act=0;
  const root=$('#'+p+'-flow');
  root.style.setProperty('--cols',stages.length);
  root.innerHTML=`<button type="button" class="btn pri big" id="${p}-cap"></button>
    <p class="hint" id="${p}-hint"></p>
    <div class="stg">${stages.map((s,i)=>`<div class="stgc" data-i="${i}"><button type="button" class="stgl">${s.chip}</button><input type="number" inputmode="decimal" step="${s.step||0.1}" data-k="${s.key}" aria-label="${s.chip} (gradi)"><span>°</span></div>`).join('')}</div>
    <div class="note ok" id="${p}-ok" hidden><span>${okc.msg}</span><button type="button" class="btn sm" data-go="${okc.go}">${okc.text}</button></div>`;
  const cap=$('#'+p+'-cap'),hintEl=$('#'+p+'-hint');
  function refresh(){
    const st=stages[act];
    cap.textContent=typeof st.label==='function'?st.label():st.label;
    hintEl.innerHTML=hint(st.key)+(st.skip&&store[st.key]==null?' <button type="button" class="lnk" data-skip>Salta questo passaggio</button>':'');
    $$('.stgc',root).forEach((c,i)=>{
      const s=stages[i],inp=$('input',c);
      c.classList.toggle('act',i===act);c.classList.toggle('done',store[s.key]!=null);
      if(document.activeElement!==inp)inp.value=typeof store[s.key]==='number'?store[s.key].toFixed(1):'';
    });
    $('#'+p+'-ok').hidden=!stages.filter(s=>!s.optional).every(s=>store[s.key]!=null);
  }
  function next(){const n=stages.findIndex(s=>store[s.key]==null);if(n>=0)act=n;}
  cap.onclick=()=>{
    const st=stages[act];
    if(!Sensors.hasOri){toast('Nessun dato dai sensori: inserisci il valore a mano nel riquadro.');return;}
    const v=st.read();if(!Number.isFinite(v))return;
    const old=store[st.key];store[st.key]=r2(v);
    if(onCapture)onCapture(st.key,store[st.key],old);
    next();refresh();onChange();
  };
  root.addEventListener('click',e=>{
    const l=e.target.closest('.stgl');
    if(l){act=+l.parentNode.dataset.i;refresh();return;}
    if(e.target.closest('[data-skip]')){const sv=stages[act].skipVal;store[stages[act].key]=sv!==undefined?sv:0;next();refresh();onChange();}
  });
  root.addEventListener('input',e=>{
    const inp=e.target.closest('input[data-k]');if(!inp)return;
    const k=inp.dataset.k,old=store[k],v=parseFloat(inp.value);
    store[k]=Number.isFinite(v)?v:null;
    if(onCapture&&store[k]!=null)onCapture(k,store[k],old);
    $$('.stgc',root).forEach((c,i)=>{c.classList.toggle('done',store[stages[i].key]!=null);});
    $('#'+p+'-ok').hidden=!stages.filter(s=>!s.optional).every(s=>store[s.key]!=null);
    onChange();
  });
  refresh();
  return {refresh,act:()=>act,go(i){act=i;refresh();},reset(){stages.forEach(s=>{store[s.key]=null;});act=0;refresh();onChange();}};
}
/* HUD di inclinazione (modalità clinometro) */
function pitchRender(p,store){
  const e=Sensors.elev(),c=e-(store.zero||0);
  $('#'+p+'-hv').textContent=Number.isFinite(c)?sgn(c,1)+'°':'—';
  $('#'+p+'-hs').textContent=(store.zero==null?'zero non fissato · ':'')+(Sensors.elevStd()<0.2?'fermo':'instabile');
  const y=50+c/(VFOV/Sensors.zoom)*100;
  $('#'+p+'-hz').style.top=Math.max(3,Math.min(97,Number.isFinite(y)?y:50))+'%';
}

/* ============================================================ */
/*  Mappa riutilizzabile                                        */
/* ============================================================ */
function createNoMapUI(cfg,slot){
  const wrap=document.createElement('div');wrap.className='mapwrap nomap';
  wrap.innerHTML=`<div class="note">Mappa non disponibile (nessuna connessione): scrivi le coordinate a mano o usa il GPS.</div><div class="maptools"><button type="button" class="btn sm" data-act="gps">${cfg.gpsLabel||'Mia posizione GPS'}</button></div>`;
  slot.appendChild(wrap);
  const pts={};
  const ui={map:DUMMY,group:DUMMY,wrap,noMap:true};
  ui.setPoint=(k,ll)=>{pts[k]=ll;};
  ui.getPoint=k=>pts[k]||null;
  ui.removePoint=k=>{delete pts[k];};
  ui.setMode=()=>{};ui.refreshHint=()=>{};ui.fit=()=>{};ui.expand=()=>{};
  $('[data-act=gps]',wrap).addEventListener('click',()=>{
    if(!navigator.geolocation){toast('GPS non disponibile su questo dispositivo.');return;}
    toast('Ricerca posizione GPS…');
    navigator.geolocation.getCurrentPosition(pos=>{
      const ll=[pos.coords.latitude,pos.coords.longitude];
      const gk=typeof cfg.gpsKey==='function'?cfg.gpsKey():cfg.gpsKey;
      if(!cfg.multi)ui.setPoint(gk,ll);
      cfg.onChange&&cfg.onChange(gk,ll,'gps');
      toast('Posizione acquisita (±'+Math.round(pos.coords.accuracy)+' m)');
    },()=>toast('Posizione GPS non disponibile: controlla i permessi.'),{enableHighAccuracy:true,timeout:20000,maximumAge:0});
  });
  return ui;
}
function createMapUI(cfg,slot){
  if(typeof window.L==='undefined')return createNoMapUI(cfg,slot);
  const wrap=document.createElement('div');wrap.className='mapwrap';
  wrap.innerHTML=`<div class="maptools">${cfg.modes.map(m=>`<button type="button" class="btn sm" data-mode="${m.key}">${m.label}</button>`).join('')}<button type="button" class="btn sm" data-act="gps">${cfg.gpsLabel||'Mia posizione GPS'}</button><button type="button" class="btn sm" data-act="expand">Espandi</button></div>
    <div class="mapsearch"><input type="search" placeholder="Cerca luogo o indirizzo" aria-label="Cerca luogo o indirizzo"><button type="button" class="btn sm" data-act="search">Cerca</button></div>
    <div class="mapcanvas"></div><div class="maphint"></div>`;
  slot.appendChild(wrap);
  const cv=$('.mapcanvas',wrap),hint=$('.maphint',wrap);
  const map=L.map(cv,{zoomSnap:0.5}).setView([42.5,12.5],6);
  const osm=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap'}).addTo(map);
  const sat=L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',{maxZoom:19,attribution:'Immagini © Esri'});
  L.control.layers({'Mappa':osm,'Satellite':sat},null,{position:'topright'}).addTo(map);
  const group=L.layerGroup().addTo(map);
  const pts={};let mode=null;
  const ui={map,group,wrap};
  const idle=()=>typeof cfg.idleHint==='function'?cfg.idleHint():(cfg.idleHint||'');
  const icon=k=>{const q=cfg.pins[k];return L.divIcon({className:'',html:`<div class="pin" style="--bg:${q.bg};--fg:${q.fg}">${q.t}</div>`,iconSize:[32,32],iconAnchor:[16,16]});};
  ui.setPoint=(k,ll)=>{
    ll=L.latLng(ll[0],ll[1]);
    if(pts[k]){pts[k].setLatLng(ll);return;}
    const m=L.marker(ll,{draggable:true,icon:icon(k)}).addTo(map);
    const emit=src=>{const p=m.getLatLng();cfg.onChange&&cfg.onChange(k,[p.lat,p.lng],src);};
    m.on('drag',()=>emit('drag'));m.on('dragend',()=>emit('dragend'));
    pts[k]=m;
  };
  ui.getPoint=k=>pts[k]?[pts[k].getLatLng().lat,pts[k].getLatLng().lng]:null;
  ui.removePoint=k=>{if(pts[k]){map.removeLayer(pts[k]);delete pts[k];}};
  ui.setMode=k=>{
    mode=(mode===k)?null:k;
    $$('[data-mode]',wrap).forEach(b=>b.classList.toggle('on',b.dataset.mode===mode));
    const h=mode?cfg.hints[mode]:null;
    hint.textContent=mode?(typeof h==='function'?h():(h||'Tocca la mappa per posizionare il punto.')):idle();
  };
  ui.refreshHint=()=>{if(!mode)hint.textContent=idle();};
  ui.fit=()=>{
    const ll=Object.values(pts).map(m=>m.getLatLng());
    if(!ll.length)return;
    if(ll.length===1)map.setView(ll[0],Math.max(map.getZoom(),17));
    else map.fitBounds(L.latLngBounds(ll).pad(0.35),{maxZoom:19});
  };
  ui.expand=on=>{
    wrap.classList.toggle('expanded',on);document.body.classList.toggle('noscroll',on);
    $('[data-act=expand]',wrap).textContent=on?'Riduci':'Espandi';
    setTimeout(()=>map.invalidateSize(),60);
  };
  map.on('click',e=>{
    if(!mode)return;
    if(cfg.onMapClick){cfg.onMapClick(mode,[e.latlng.lat,e.latlng.lng]);return;}
    const k=mode,ll=[e.latlng.lat,e.latlng.lng];
    ui.setPoint(k,ll);ui.setMode(k);
    cfg.onChange&&cfg.onChange(k,ll,'click');
  });
  const geo=()=>{
    if(!navigator.geolocation){toast('GPS non disponibile su questo dispositivo.');return;}
    toast('Ricerca posizione GPS…');
    navigator.geolocation.getCurrentPosition(pos=>{
      const ll=[pos.coords.latitude,pos.coords.longitude];
      const gk=typeof cfg.gpsKey==='function'?cfg.gpsKey():cfg.gpsKey;
      if(!cfg.multi)ui.setPoint(gk,ll);
      map.setView(ll,Math.max(map.getZoom(),17));
      cfg.onChange&&cfg.onChange(gk,ll,'gps');
      toast('Posizione acquisita (±'+Math.round(pos.coords.accuracy)+' m)');
    },()=>toast('Posizione GPS non disponibile: controlla i permessi.'),{enableHighAccuracy:true,timeout:20000,maximumAge:0});
  };
  const search=async()=>{
    const q=$('input',$('.mapsearch',wrap)).value.trim();if(!q)return;
    try{
      const r=await fetch('https://nominatim.openstreetmap.org/search?format=json&limit=1&q='+encodeURIComponent(q));
      const j=await r.json();
      if(j&&j.length)map.setView([parseFloat(j[0].lat),parseFloat(j[0].lon)],17);else toast('Luogo non trovato.');
    }catch(e){toast('Ricerca non riuscita: controlla la connessione.');}
  };
  wrap.addEventListener('click',e=>{
    const b=e.target.closest('button');if(!b)return;
    if(b.dataset.mode)ui.setMode(b.dataset.mode);
    else if(b.dataset.act==='gps')geo();
    else if(b.dataset.act==='expand')ui.expand(!wrap.classList.contains('expanded'));
    else if(b.dataset.act==='search')search();
  });
  $('input',$('.mapsearch',wrap)).addEventListener('keydown',e=>{if(e.key==='Enter')search();});
  hint.textContent=idle();
  return ui;
}
function placeMap(ui,slotId){
  const s=$('#'+slotId);
  if(s&&ui.wrap.parentNode!==s)s.appendChild(ui.wrap);
  setTimeout(()=>ui.map.invalidateSize(),60);
}
function setupSteps(view,labels,onStep){
  const bar=$('.steps',view);
  bar.innerHTML=labels.map((l,i)=>`<button type="button" class="step" data-s="${i+1}" aria-label="Passo ${i+1} di ${labels.length}: ${l}"></button>`).join('');
  const lab=document.createElement('div');lab.className='steplabel';bar.after(lab);
  const api={
    go(n){
      $$('.step',bar).forEach(b=>{const on=+b.dataset.s===n;b.classList.toggle('on',on);if(on)b.setAttribute('aria-current','step');else b.removeAttribute('aria-current');});
      lab.textContent='Passo '+n+' di '+labels.length+' · '+labels[n-1];
      $$('.panel',view).forEach(pn=>{pn.hidden=+pn.dataset.s!==n;});
      view.dataset.step=n;
      if(onStep)onStep(n);
    },
    mark(n,done){$('.step[data-s="'+n+'"]',bar).classList.toggle('done',!!done);}
  };
  bar.addEventListener('click',e=>{const b=e.target.closest('.step');if(b)api.go(+b.dataset.s);});
  view.addEventListener('click',e=>{const g=e.target.closest('[data-go]');if(g)api.go(+g.dataset.go);});
  return api;
}

/* ============================================================ */
/*  1 · Altezza e area di proiezione                            */
/* ============================================================ */
const T1={
  pianta:{n:'Pianta',h:'Altezza della pianta',top:'cima della pianta',base:'base della pianta',tgt:'Tocca la base della pianta, dove il tronco entra nel terreno.'},
  edificio:{n:'Edificio',h:'Altezza dell’edificio',top:'sommità dell’edificio',base:'base dell’edificio',tgt:'Tocca il punto a terra alla base dell’edificio.'},
  teleferica:{n:'Teleferica',h:'Altezza del punto alto',top:'punto alto (sostegno o cavo)',base:'punto a terra sotto il punto alto',tgt:'Tocca il punto a terra sotto il punto alto da misurare.'},
  altro:{n:'Altro',h:'Altezza',top:'punto più alto',base:'punto a terra sotto il punto alto',tgt:'Tocca il punto a terra sotto il punto da misurare.'}
};
const hasArea=t=>t!=='teleferica';   // il punto alto di una teleferica non cade: niente raggio di proiezione
const m1={type:'pianta',obs:null,tgt:null,D:null,dMode:'map',s:{zero:null,beta:null,alpha:null},margin:1,ui:null,flow:null,steps:null,fitted:false};

function m1Calc(){
  const D=m1.D,b=m1.s.beta,a=m1.s.alpha;
  if(!(D>0)||b==null||a==null)return null;
  if(Math.abs(b)>=85||Math.abs(a)>=85)return {err:'Con angoli oltre 85° il calcolo non è affidabile: allontanati dal bersaglio.'};
  const r=heightCalc(D,b,a);
  if(!(r.H>0))return {err:'L’alzo deve essere maggiore dell’angolo della base. Controlla i segni (verso l’alto positivo).'};
  return r;
}
function m1SetD(D,mode){
  m1.D=D;m1.dMode=mode;
  if(document.activeElement!==$('#m1-d'))$('#m1-d').value=D>0?D.toFixed(1):'';
  if(document.activeElement!==$('#m1-p'))$('#m1-p').value=D>0?(Math.round(D/PASSO*10)/10):'';
  if(document.activeElement!==$('#m1-b'))$('#m1-b').value=D>0?(Math.round(D/FT*10)/10):'';
  $('#m1-dsrc').textContent=D>0?(mode==='map'?'Calcolata dai punti impostati (mappa, GPS o coordinate): distanza tra la tua posizione e il target.':'Valore inserito a mano.'):'Imposta target e posizione sulla mappa, oppure scrivi la distanza.';
  $('#m1-dmap').hidden=!(mode==='manual'&&m1.obs&&m1.tgt);
}
function m1Render(){
  const T=T1[m1.type],r=m1Calc(),ok=r&&!r.err,D=m1.D;
  $('#m1-sd').textContent=D>0?fmt(D,1)+' m':'—';
  $('#m1-shl').textContent=T.h;
  $('#m1-sh').textContent=ok?fmt(r.H,1)+' m':'—';
  m1.steps.mark(1,D>0);m1.steps.mark(2,!!ok);m1.steps.mark(3,!!ok);
  // mappa: linea e aree
  const g=m1.ui.group;g.clearLayers();
  if(m1.obs&&m1.tgt)L.polyline([m1.obs,m1.tgt],{color:'#ffd400',weight:3,dashArray:'6 6'}).addTo(g);
  if(ok&&m1.tgt&&hasArea(m1.type)){
    L.circle(m1.tgt,{radius:r.H,color:'#d8262f',weight:3,fillColor:'#d8262f',fillOpacity:.2}).addTo(g);
    if(m1.margin>1)L.circle(m1.tgt,{radius:r.H*m1.margin,color:'#ffd400',weight:2,dashArray:'8 6',fill:false}).addTo(g);
  }
  // pannello risultato
  const res=$('#m1-res');let h='';
  if(!r){
    h=`<div class="note">Completa la distanza (passo 1) e le misure con la camera (passo 2) per vedere altezza e area.</div>`;
  }else if(r.err){
    h=`<div class="note warn">${r.err}</div>`;
  }else{
    const area=hasArea(m1.type),R=r.H,Ro=R*m1.margin;
    let stat;
    if(D<R)stat=`<div class="note warn stat">Sei dentro l’area di proiezione: allontanati di almeno ${fmt(R-D+1,0)} m.</div>`;
    else if(m1.margin>1&&D<Ro)stat=`<div class="note stat">Sei fuori dall’area, ma dentro la fascia di rispetto.</div>`;
    else stat=`<div class="note ok stat">Sei fuori dall’area di proiezione.</div>`;
    h=`<div class="card">
      <div class="big-l">${T.h}</div>
      <div class="big-n">${fmt(r.H,1)}<small>m</small></div>
      <dl class="kv">
        <dt>Distanza orizzontale</dt><dd>${fmt(D,1)} m · ${fmt(D/PASSO,0)} passi · ${fmt(D/FT,0)} tacco-punta</dd>
        <dt>Distanza inclinata alla base</dt><dd>${fmt(r.sBase,1)} m</dd>
        <dt>Distanza inclinata alla cima</dt><dd>${fmt(r.sTop,1)} m</dd>
        <dt>Alzo · angolo base</dt><dd>${sgn(m1.s.beta,1)}° · ${sgn(m1.s.alpha,1)}°</dd>
        <dt>Occhio rispetto alla base</dt><dd>${sgn(r.eyeAboveBase,1)} m</dd>
      </dl>
      ${m1.s.zero==null?'<div class="note">Zero non fissato: gli angoli sono quelli grezzi del sensore.</div>':''}
    </div>
    ${area?`    <div class="card"><h3>Area di proiezione</h3>
      <p class="sub" style="margin:0 0 8px">Cerchio di raggio pari all’altezza, centrato sul target.</p>
      <div class="seg" id="m1-seg">
        <button type="button" data-m="1" class="${m1.margin===1?'on':''}">Nessuna fascia</button>
        <button type="button" data-m="1.5" class="${m1.margin===1.5?'on':''}">Fascia ×1,5</button>
        <button type="button" data-m="2" class="${m1.margin===2?'on':''}">Fascia ×2</button>
      </div>
      <dl class="kv">
        <dt>Raggio area di caduta</dt><dd>${fmt(R,1)} m</dd>
        <dt>Superficie</dt><dd>${fmt(Math.PI*R*R,0)} m²</dd>
        ${m1.margin>1?`<dt>Raggio con fascia</dt><dd>${fmt(Ro,1)} m</dd><dt>Superficie con fascia</dt><dd>${fmt(Math.PI*Ro*Ro,0)} m²</dd>`:''}
      </dl>
      ${stat}
      ${m1.tgt?'':'<div class="note warn">Imposta il target sulla mappa per disegnare l’area.</div>'}
    </div>`:`<div class="note stat">Per ${T.n.toLowerCase()} non c’è un’area di proiezione: il punto alto non cade. Sulla mappa restano il punto a terra e la tua posizione, a ${fmt(D,1)} m in orizzontale.</div>`}
    <div class="row"><button type="button" class="btn" id="m1-exp">Esporta GeoJSON</button><button type="button" class="btn" id="m1-new">Nuova misura</button></div>`;
  }
  res.innerHTML=h;
  m1.ui.refreshHint();
}
function m1Export(){
  const r=m1Calc();
  if(!r||r.err||!m1.tgt){toast('Servono il target sulla mappa e una misura completa.');return;}
  const f=[{type:'Feature',properties:{ruolo:'target',tipo:m1.type,altezza_m:+r.H.toFixed(2)},geometry:{type:'Point',coordinates:[m1.tgt[1],m1.tgt[0]]}}];
  if(m1.obs)f.push({type:'Feature',properties:{ruolo:'osservatore',distanza_orizzontale_m:+m1.D.toFixed(1)},geometry:{type:'Point',coordinates:[m1.obs[1],m1.obs[0]]}});
  if(hasArea(m1.type))f.push({type:'Feature',properties:{ruolo:'area_proiezione',raggio_m:+r.H.toFixed(2),area_m2:+(Math.PI*r.H*r.H).toFixed(1)},geometry:{type:'Polygon',coordinates:[ring(m1.tgt,r.H)]}});
  if(hasArea(m1.type)&&m1.margin>1)f.push({type:'Feature',properties:{ruolo:'fascia_rispetto',raggio_m:+(r.H*m1.margin).toFixed(2)},geometry:{type:'Polygon',coordinates:[ring(m1.tgt,r.H*m1.margin)]}});
  download(JSON.stringify({type:'FeatureCollection',features:f},null,1),'fireops-trigo-altezza-'+stamp()+'.geojson','application/geo+json');
}
const m1c={fmt:'dd',zone:32};
const m1CId=k=>'#m1-c'+(k==='tgt'?'t':'o');
function m1CWrite(k){
  const el=$(m1CId(k));if(!el)return;
  if(document.activeElement!==el)el.value=m1[k]?fmtCoord(m1[k],m1c.fmt,m1c.zone):'';
  el.removeAttribute('aria-invalid');
}
function m1CLabel(){$('#m1-ctl').textContent=m1.type==='teleferica'?'Punto a terra sotto il punto alto (target)':'Target (base dell’oggetto)';}
function initM1(){
  const v=$('#tg-altezza');
  v.innerHTML=`<div class="steps"></div>
  <div class="strip"><div><span>Distanza orizzontale</span><b id="m1-sd">—</b></div><div><span id="m1-shl">Altezza</span><b id="m1-sh">—</b></div></div>

  <div class="panel" data-s="1">
    <div class="card"><h3>Che cosa misuri?</h3>
      <div class="chips" id="m1-types">${Object.keys(T1).map(k=>`<button type="button" class="btn sm ${k===m1.type?'on':''}" data-t="${k}">${T1[k].n}</button>`).join('')}</div>
    </div>
    <div id="m1-slot1"></div>
    <div class="card"><h3>Coordinate</h3>
      <label class="f" for="m1-ct" id="m1-ctl"></label>
      <div class="row">
        <input id="m1-ct" class="m1c" inputmode="decimal" placeholder="41.8902, 12.4922" autocomplete="off">
        <select class="m1zone fit" aria-label="Fuso UTM" hidden>${[31,32,33,34,35].map(z=>`<option value="${z}" ${z===32?'selected':''}>Fuso ${z}</option>`).join('')}</select>
        <select class="m1fmt fit" aria-label="Formato coordinate"><option value="dd">Lat, Lon</option><option value="utm">UTM</option></select>
      </div>
      <label class="f" for="m1-co">La mia posizione (osservatore)</label>
      <div class="row">
        <input id="m1-co" class="m1c" inputmode="decimal" placeholder="41.8902, 12.4922" autocomplete="off">
        <select class="m1zone fit" aria-label="Fuso UTM" hidden>${[31,32,33,34,35].map(z=>`<option value="${z}" ${z===32?'selected':''}>Fuso ${z}</option>`).join('')}</select>
        <select class="m1fmt fit" aria-label="Formato coordinate"><option value="dd">Lat, Lon</option><option value="utm">UTM</option></select>
      </div>
      <p class="sub" id="m1-cinfo">Scrivi le coordinate, oppure usa la mappa o il GPS. Con entrambe la distanza si calcola da sola.</p>
    </div>
    <div class="card"><h3>Distanza orizzontale</h3>
      <div class="row">
        <div><label class="f" for="m1-d">Metri</label><input id="m1-d" type="number" inputmode="decimal" step="0.1" min="0"></div>
        <div><label class="f" for="m1-p">Passi</label><input id="m1-p" type="number" inputmode="decimal" step="1" min="0"></div>
        <div><label class="f" for="m1-b">Tacco-punta</label><input id="m1-b" type="number" inputmode="decimal" step="1" min="0"></div>
      </div>
      <p class="sub" id="m1-dsrc"></p>
      <p class="sub">Scrivi la distanza in metri, in passi o in tacco-punta (piedi): gli altri campi si aggiornano. 1 tacco-punta = 31 cm · 1 passo = 2,5 tacco-punta = 77,5 cm.</p>
      <button type="button" class="btn sm" id="m1-dmap" style="margin-top:8px" hidden>Torna alla distanza da mappa</button>
    </div>
    <button type="button" class="btn pri big" data-go="2">Vai alla misura con la camera</button>
  </div>

  <div class="panel" data-s="2" hidden>
    ${camHTML('m1',{hud:'Inclinazione',horizon:true})}
    <div id="m1-flow" style="margin-top:10px"></div>
    <p class="sub">Tieni il telefono fermo con entrambe le mani. Il valore è la media degli ultimi istanti.</p>
  </div>

  <div class="panel" data-s="3" hidden>
    <div id="m1-res"></div>
    <div id="m1-slot3"></div>
  </div>`;

  m1.ui=createMapUI({
    modes:[{key:'tgt',label:'Imposta target'},{key:'obs',label:'Imposta la mia posizione'}],
    gpsKey:'obs',
    pins:{tgt:{t:'T',bg:'#d8262f',fg:'#fff'},obs:{t:'Io',bg:'#ffd400',fg:'#000'}},
    hints:{tgt:()=>T1[m1.type].tgt,obs:'Tocca la mappa dove ti trovi (oppure usa il GPS).'},
    idleHint:'Imposta il target e la tua posizione: la distanza si calcola da sola. Trascina i segnaposto per correggere.',
    onChange:(k,ll,src)=>{
      m1[k]=ll;
      if(m1c.fmt==='utm'&&src!=='drag'){const z=utmZone(ll[1]);if(z>=31&&z<=35){m1c.zone=z;$$('.m1zone',v).forEach(x=>{x.value=z;});}}
      if(m1.tgt&&m1.obs)m1SetD(distLL(m1.obs,m1.tgt),'map');
      m1CWrite(k);m1Render();
    }
  },$('#m1-slot1'));

  m1.steps=setupSteps(v,['Mappa','Misura','Risultato'],n=>{
    if(n===1)placeMap(m1.ui,'m1-slot1');
    if(n===3){
      placeMap(m1.ui,'m1-slot3');m1Render();
      const r=m1Calc();
      if(r&&!r.err&&m1.tgt&&hasArea(m1.type)){setTimeout(()=>{m1.ui.map.invalidateSize();m1.ui.map.fitBounds(boundsAround(m1.tgt,r.H*Math.max(1,m1.margin)).pad(0.3));},120);}
      else m1.ui.fit();
    }
    if(n!==2){Sensors.stop();showStart('m1');}
  });

  const stages=[
    {key:'zero',chip:'Zero',label:'Fissa lo zero',optional:true,skip:true,read:()=>Sensors.elev()},
    {key:'beta',chip:'Alzo (cima)',label:'Fissa l’alzo sulla cima',read:()=>Sensors.elev()-(m1.s.zero||0)},
    {key:'alpha',chip:'Base',label:'Fissa l’angolo della base',read:()=>Sensors.elev()-(m1.s.zero||0)}
  ];
  const hint=k=>{
    const T=T1[m1.type];
    if(k==='zero')return 'Inquadra l’orizzonte, o un punto alla tua stessa altezza. Tieni fermo e premi.';
    if(k==='beta')return 'Porta il mirino sulla '+T.top+' e premi. L’alzo è positivo verso l’alto.';
    return 'Porta il mirino sulla '+T.base+', dove tocca terra, e premi. Di solito è negativo (sotto l’orizzonte).';
  };
  m1.flow=makeFlow('m1',stages,m1.s,hint,m1Render,(k,val,old)=>{
    if(k==='zero'){const o=old==null?0:old;['beta','alpha'].forEach(x=>{if(m1.s[x]!=null)m1.s[x]=r2(m1.s[x]+o-val);});m1.flow.refresh();}
  });
  bindCam('m1',()=>pitchRender('m1',m1.s));

  $('#m1-types').addEventListener('click',e=>{
    const b=e.target.closest('[data-t]');if(!b)return;
    m1.type=b.dataset.t;$$('#m1-types .btn').forEach(x=>x.classList.toggle('on',x===b));
    m1CLabel();m1.flow.refresh();m1.ui.refreshHint();m1Render();
  });
  $('#m1-d').addEventListener('input',()=>{const x=num('m1-d');m1SetD(x==null?null:x,'manual');m1Render();});
  $('#m1-p').addEventListener('input',()=>{const x=num('m1-p');const d=x==null?null:r2(x*PASSO);m1SetD(d,'manual');m1Render();});
  $('#m1-b').addEventListener('input',()=>{const x=num('m1-b');const d=x==null?null:r2(x*FT);m1SetD(d,'manual');m1Render();});
  $('#m1-dmap').onclick=()=>{if(m1.obs&&m1.tgt){m1SetD(distLL(m1.obs,m1.tgt),'map');m1Render();}};
  v.addEventListener('click',e=>{
    const sg=e.target.closest('#m1-seg button');
    if(sg){m1.margin=parseFloat(sg.dataset.m);m1Render();return;}
    if(e.target.closest('#m1-exp'))m1Export();
    if(e.target.closest('#m1-new')){m1.flow.reset();m1.steps.go(2);}
  });
  const m1CSync=()=>{
    $$('.m1fmt',v).forEach(x=>{x.value=m1c.fmt;});$$('.m1zone',v).forEach(x=>{x.value=m1c.zone;});
    $$('.m1zone',v).forEach(x=>{x.hidden=m1c.fmt!=='utm';});
    $$('.m1c',v).forEach(x=>{x.placeholder=m1c.fmt==='utm'?'291234 4640123':'41.8902, 12.4922';});
    m1CWrite('tgt');m1CWrite('obs');
  };
  v.addEventListener('change',e=>{
    const t=e.target;
    if(t.classList.contains('m1fmt')){
      m1c.fmt=t.value;
      if(m1c.fmt==='utm'){const f=m1.tgt||m1.obs;if(f){const z=utmZone(f[1]);if(z>=31&&z<=35)m1c.zone=z;}}
      m1CSync();return;
    }
    if(t.classList.contains('m1zone')){m1c.zone=parseInt(t.value,10);m1CSync();return;}
    if(t.classList.contains('m1c')){
      const k=t.id==='m1-ct'?'tgt':'obs',txt=t.value.trim();
      if(!txt){m1[k]=null;m1.ui.removePoint(k);}
      else{
        const ll=parseCoord(txt,m1c.fmt,m1c.zone);
        if(!ll){t.setAttribute('aria-invalid','true');toast(m1c.fmt==='utm'?'Formato non valido: scrivi Est e Nord, ad esempio 291234 4640123, e controlla il fuso.':'Formato non valido: scrivi latitudine e longitudine, ad esempio 41.8902, 12.4922.');return;}
        m1[k]=ll;m1.ui.setPoint(k,ll);m1.ui.fit();
      }
      if(m1.tgt&&m1.obs)m1SetD(distLL(m1.obs,m1.tgt),'map');
      m1CWrite(k);m1Render();
    }
  });
  m1CLabel();
  m1SetD(null,'map');
  m1.steps.go(1);
  m1Render();
}

/* ============================================================ */
/*  2 · Problema del faro                                       */
/* ============================================================ */
const m2={mode:'dist',obs:null,tgt:null,s:{zero:null,theta:null,az:0},azAuto:true,stages:null,ui:null,flow:null,steps:null};
async function dem(ll){
  const r=await fetch('https://api.open-meteo.com/v1/elevation?latitude='+ll[0].toFixed(6)+'&longitude='+ll[1].toFixed(6));
  const j=await r.json();return j&&j.elevation?j.elevation[0]:null;
}
const UNITS={m:1,km:1000,NM:1852,passi:PASSO};
function m2Dist(){const v=num('m2-dv'),u=UNITS[$('#m2-du').value]||1;return v==null||v<=0?null:v*u;}
function m2Calc(){
  const zo=num('m2-zo'),hp=num('m2-hp'),zt=num('m2-zt'),ht=num('m2-ht'),th=m2.s.theta,curv=$('#m2-curv').checked,mode=m2.mode;
  if(th==null)return null;
  if(mode==='pos'){
    if([zo,hp,zt,ht].some(x=>x==null)||m2.s.az==null)return null;
    const dz=(zt+ht)-(zo+hp),D=distFromAngle(dz,th,curv),D0=distFromAngle(dz,th,false);
    const Dp=distFromAngle(dz,th+0.1,curv),Dm=distFromAngle(dz,th-0.1,curv);
    const decl=num('m2-decl')||0,brg=norm360(m2.s.az+decl);
    const pos=(m2.obs&&Number.isFinite(D))?destLL(m2.obs,brg,D):null;
    return {mode,dz,D,D0,Dp,Dm,curv,th,az:m2.s.az,decl,brg,pos,noObs:!m2.obs,lat:Number.isFinite(D)?D*Math.tan(3*D2R):NaN};
  }
  if(mode==='dist'){
    if([zo,hp,zt,ht].some(x=>x==null))return null;
    const dz=(zt+ht)-(zo+hp);
    const D=distFromAngle(dz,th,curv),D0=distFromAngle(dz,th,false);
    const Dp=distFromAngle(dz,th+0.1,curv),Dm=distFromAngle(dz,th-0.1,curv);
    return {mode,dz,D,D0,Dp,Dm,curv,th};
  }
  const D=m2Dist();if(D==null)return null;
  const dz=dzFromDist(D,th,curv),dzp=dzFromDist(D,th+0.1,curv),dzm=dzFromDist(D,th-0.1,curv),dz0=dzFromDist(D,th,false);
  if(mode==='quota'){
    if(zo==null||hp==null)return null;
    const zeye=zo+hp,Z=zeye+dz;
    return {mode,D,dz,dz0,curv,th,Z,Zlo:zeye+Math.min(dzp,dzm),Zhi:zeye+Math.max(dzp,dzm),Z0:zeye+dz0,hgt:zt!=null?Z-zt:null};
  }
  if(zt==null||ht==null||hp==null)return null;
  const zp=zt+ht,Ze=zp-dz;
  return {mode,D,dz,dz0,curv,th,Ze,Zg:Ze-hp,Zlo:zp-Math.max(dzp,dzm)-hp,Zhi:zp-Math.min(dzp,dzm)-hp,Zg0:zp-dz0-hp};
}
/* l'azimut serve solo in modalità "Posizione del punto": nelle altre vale 0 (già fissato) così il flusso non lo chiede */
function m2SyncAz(){
  const pos=m2.mode==='pos';
  if(pos){if(m2.azAuto){m2.s.az=null;m2.azAuto=false;}}
  else if(!m2.azAuto||m2.s.az==null){m2.s.az=0;m2.azAuto=true;}
  if(m2.stages){
    m2.stages[2].optional=!pos;
    const root=$('#m2-flow');
    if(root){root.style.setProperty('--cols',pos?3:2);const c=$('.stgc[data-i="2"]',root);if(c)c.hidden=!pos;}
    if(m2.flow){m2.flow.refresh();if(pos&&m2.s.az==null&&m2.s.theta!=null)m2.flow.go(2);}
  }
}
function m2Modes(){
  const m=m2.mode;
  $$('#m2-mode button').forEach(b=>b.classList.toggle('on',b.dataset.m===m));
  $('#m2-wzo').hidden=m==='mia';$('#m2-wzeye').hidden=m==='mia';
  $('#m2-wht').hidden=m==='quota';$('#m2-wztot').hidden=m==='quota';
  $('#m2-cdist').hidden=m==='dist'||m==='pos';
  $('#m2-cpos').hidden=m!=='pos';
  m2SyncAz();
  $('#m2-ltz').textContent=m==='quota'?'Quota del suolo alla base del punto (m s.l.m., facoltativa: serve per l’altezza sul suolo)':'Quota del suolo alla sua base (m s.l.m.)';
  $('#m2-modesub').textContent={dist:'Conosci la quota del punto osservato (per esempio un faro): ricavi la distanza.',
    quota:'Conosci la distanza (per esempio dai segnaposto sulla mappa): ricavi la quota del punto osservato.',
    mia:'Conosci la distanza e la quota del punto osservato: ricavi la quota a cui ti trovi.',
    pos:'Al contrario: conosci la tua posizione e quota e di un punto (una vetta, una cima, un traliccio) conosci solo la quota: con alzo e azimut ricavi la sua distanza e le sue coordinate.'}[m];
  $('#m2-sdl').textContent=m==='dist'?'Distanza':m==='quota'?'Quota del punto':'La mia quota';
}
function m2Render(){
  const mode=m2.mode;
  const zo=num('m2-zo'),hp=num('m2-hp'),zt=num('m2-zt'),ht=num('m2-ht');
  $('#m2-zeye').textContent=(zo!=null&&hp!=null)?fmt(zo+hp,1)+' m':'—';
  $('#m2-ztot').textContent=(zt!=null&&ht!=null)?fmt(zt+ht,1)+' m':'—';
  const r=m2Calc();
  const km=D=>D>=10000?fmt(D/1000,2)+' km':fmt(D,0)+' m';
  let main='—';
  if(r){
    if(mode==='dist'||mode==='pos')main=Number.isFinite(r.D)?km(r.D):'—';
    else if(mode==='quota')main=fmt(r.Z,0)+' m';
    else main=fmt(r.Ze,0)+' m';
  }
  $('#m2-sd').textContent=main;
  $('#m2-sz').textContent=r?sgn(r.dz,1)+' m':'—';
  const oc=$('#m2-oc');if(oc&&m2.obs&&document.activeElement!==oc)oc.value=m2.obs[0].toFixed(6)+', '+m2.obs[1].toFixed(6);
  const need1=mode==='pos'?(zo!=null&&hp!=null&&zt!=null&&ht!=null&&!!m2.obs):mode==='dist'?(zo!=null&&hp!=null&&zt!=null&&ht!=null):mode==='quota'?(zo!=null&&hp!=null&&m2Dist()!=null):(zt!=null&&ht!=null&&hp!=null&&m2Dist()!=null);
  m2.steps.mark(1,need1);
  const ok=r&&((mode==='dist'||mode==='pos')?Number.isFinite(r.D):true);
  m2.steps.mark(2,m2.s.theta!=null&&(mode!=='pos'||m2.s.az!=null));m2.steps.mark(3,!!ok);
  const g=m2.ui.group;g.clearLayers();
  if(mode==='pos'&&ok&&r.pos&&m2.obs){L.polyline([m2.obs,r.pos],{color:'#ffd400',weight:3}).addTo(g);L.circleMarker(r.pos,{radius:9,color:'#000',weight:2,fillColor:'#ffd400',fillOpacity:.95}).addTo(g);}
  if(mode==='dist'&&ok&&m2.tgt)L.circle(m2.tgt,{radius:r.D,color:'#ffd400',weight:3,dashArray:'8 6',fill:false}).addTo(g);
  if(mode!=='pos'&&m2.obs&&m2.tgt)L.polyline([m2.obs,m2.tgt],{color:'#d8262f',weight:2}).addTo(g);
  const res=$('#m2-res');
  if(!r){res.innerHTML='<div class="note">Inserisci i dati (passo 1) e fissa l’alzo (passo 2) per vedere il risultato.</div>';return;}
  if(!ok){res.innerHTML='<div class="note warn">Angolo e quote non sono coerenti: se il punto osservato è sopra il tuo occhio l’alzo deve essere positivo, se è sotto deve essere negativo. Controlla anche le quote.</div>';return;}
  const mapD=(m2.obs&&m2.tgt)?distLL(m2.obs,m2.tgt):null;
  if(mode==='pos'){
    const z=r.pos?utmZone(r.pos[1]):null,ll=r.pos?fmtCoord(r.pos,'dd'):'',ut=r.pos?'UTM '+z+utmBand(r.pos[0])+' '+fmtCoord(r.pos,'utm',z):'';
    res.innerHTML=`<div class="card">
    <div class="big-l">Distanza orizzontale del punto</div>
    <div class="big-n">${fmt(r.D,0)}<small>m</small></div>
    <dl class="kv">
      <dt>In chilometri</dt><dd>${fmt(r.D/1000,2)} km</dd>
      <dt>Azimut vero usato</dt><dd>${fmt(r.brg,0)}° <small>(letto ${fmt(r.az,0)}° ${r.decl>=0?'+':'−'} ${fmt(Math.abs(r.decl),1)}° declinazione)</small></dd>
      <dt>Dislivello occhio–punto</dt><dd>${sgn(r.dz,1)} m</dd>
      <dt>Alzo usato</dt><dd>${sgn(r.th,2)}°</dd>
      <dt>Senza correzione curvatura</dt><dd>${fmt(r.D0,0)} m</dd>
      <dt>Se l’alzo sbaglia di ±0,1°</dt><dd>${fmt(Math.min(r.Dp,r.Dm),0)} – ${fmt(Math.max(r.Dp,r.Dm),0)} m</dd>
      <dt>Se l’azimut sbaglia di ±3°</dt><dd>±${fmt(r.lat,0)} m di lato</dd>
    </dl>
    ${r.pos?`<div class="card" style="margin:8px 0 0"><h3>Posizione stimata del punto</h3>
      <dl class="kv"><dt>Lat, Lon</dt><dd>${ll}</dd><dt>UTM</dt><dd>${ut}</dd></dl>
      <div class="row"><button type="button" class="btn sm" data-copy="${ll}">Copia Lat, Lon</button><button type="button" class="btn sm" data-copy="${ut}">Copia UTM</button></div></div>`
      :'<div class="note warn">Per ricavare le coordinate serve la tua posizione: scrivila, usa il GPS o toccala sulla mappa (passo 1).</div>'}
    ${Sensors.compass?'':'<div class="note">La bussola del telefono è relativa: se non conosci l’azimut reale scrivilo a mano nel riquadro “Azimut” (passo 2).</div>'}
  </div>`;
    return;
  }
  if(mode==='dist'){
    res.innerHTML=`<div class="card">
    <div class="big-l">Distanza orizzontale stimata</div>
    <div class="big-n">${fmt(r.D,0)}<small>m</small></div>
    <dl class="kv">
      <dt>In chilometri</dt><dd>${fmt(r.D/1000,2)} km</dd>
      <dt>In miglia nautiche</dt><dd>${fmt(r.D/1852,2)} NM</dd>
      <dt>In passi</dt><dd>${fmt(r.D/PASSO,0)}</dd>
      <dt>Dislivello occhio–punto</dt><dd>${sgn(r.dz,1)} m</dd>
      <dt>Alzo usato</dt><dd>${sgn(r.th,2)}°</dd>
      <dt>Senza correzione curvatura</dt><dd>${fmt(r.D0,0)} m</dd>
      <dt>Se l’alzo sbaglia di ±0,1°</dt><dd>${fmt(Math.min(r.Dp,r.Dm),0)} – ${fmt(Math.max(r.Dp,r.Dm),0)} m</dd>
    </dl>
    ${mapD!=null?`<div class="note stat">Distanza sulla mappa tra i due segnaposto: ${fmt(mapD,0)} m (scarto ${sgn((r.D-mapD)/mapD*100,1)}%).</div>`:''}
    ${m2.tgt?'<div class="note stat">Sulla mappa la circonferenza gialla è il luogo dei punti a questa distanza dal target: tu sei su di essa.</div>':'<div class="note">Imposta il target sulla mappa per tracciare la circonferenza di posizione.</div>'}
  </div>`;
    return;
  }
  if(mode==='quota'){
    res.innerHTML=`<div class="card">
    <div class="big-l">Quota del punto osservato</div>
    <div class="big-n">${fmt(r.Z,0)}<small>m s.l.m.</small></div>
    <dl class="kv">
      <dt>Distanza usata</dt><dd>${fmt(r.D,0)} m</dd>
      <dt>Dislivello occhio–punto</dt><dd>${sgn(r.dz,1)} m</dd>
      <dt>Alzo usato</dt><dd>${sgn(r.th,2)}°</dd>
      ${r.hgt!=null?`<dt>Altezza sul suolo</dt><dd>${fmt(r.hgt,1)} m</dd>`:''}
      <dt>Senza correzione curvatura</dt><dd>${fmt(r.Z0,0)} m</dd>
      <dt>Se l’alzo sbaglia di ±0,1°</dt><dd>${fmt(r.Zlo,0)} – ${fmt(r.Zhi,0)} m</dd>
    </dl>
    ${mapD!=null?`<div class="note stat">Distanza sulla mappa tra i due segnaposto: ${fmt(mapD,0)} m (scarto ${sgn((r.D-mapD)/mapD*100,1)}%).</div>`:''}
  </div>`;
    return;
  }
  res.innerHTML=`<div class="card">
    <div class="big-l">Quota del tuo punto di osservazione</div>
    <div class="big-n">${fmt(r.Zg,0)}<small>m s.l.m. (suolo)</small></div>
    <dl class="kv">
      <dt>Quota dell’occhio</dt><dd>${fmt(r.Ze,1)} m</dd>
      <dt>Distanza usata</dt><dd>${fmt(r.D,0)} m</dd>
      <dt>Dislivello occhio–punto</dt><dd>${sgn(r.dz,1)} m</dd>
      <dt>Alzo usato</dt><dd>${sgn(r.th,2)}°</dd>
      <dt>Senza correzione curvatura</dt><dd>${fmt(r.Zg0,0)} m</dd>
      <dt>Se l’alzo sbaglia di ±0,1°</dt><dd>${fmt(r.Zlo,0)} – ${fmt(r.Zhi,0)} m</dd>
    </dl>
  </div>`;
}
function initM2(){
  const v=$('#tg-faro');
  v.innerHTML=`<div class="steps"></div>
  <div class="strip"><div><span>Dislivello occhio–punto</span><b id="m2-sz">—</b></div><div><span id="m2-sdl">Distanza</span><b id="m2-sd">—</b></div></div>

  <div class="panel" data-s="1">
    <div class="card"><h3>Cosa vuoi trovare</h3>
      <div class="seg" id="m2-mode" role="group" aria-label="Cosa vuoi trovare">
        <button type="button" data-m="dist" class="on">Distanza</button><button type="button" data-m="quota">Quota del punto</button><button type="button" data-m="mia">La mia quota</button><button type="button" data-m="pos">Posizione del punto</button>
      </div>
      <p class="sub" id="m2-modesub"></p>
    </div>
    <div class="card"><h3>Il tuo punto di osservazione</h3>
      <div id="m2-wzo"><label class="f" for="m2-zo">Quota del suolo (m s.l.m.)</label>
      <div class="row"><input id="m2-zo" type="number" inputmode="decimal" step="0.1" value="0"><button type="button" class="btn sm fit" id="m2-gps">GPS + quota</button></div></div>
      <label class="f" for="m2-hp">Altezza del telefono dal suolo (m)</label>
      <input id="m2-hp" type="number" inputmode="decimal" step="0.05" value="1.5">
      <dl class="kv" id="m2-wzeye"><dt>Quota dell’occhio</dt><dd id="m2-zeye">—</dd></dl>
      <p class="sub">In mare usa 0 come quota del suolo e l’altezza dell’occhio sul livello del mare.</p>
    </div>
    <div class="card" id="m2-cpos" hidden><h3>La tua posizione</h3>
      <label class="f" for="m2-oc">Coordinate (lat, lon — oppure UTM E N)</label>
      <div class="row"><input id="m2-oc" type="text" inputmode="text" autocomplete="off" placeholder="es. 45.6983, 9.6773"><button type="button" class="btn sm fit" id="m2-oc-gps">GPS</button></div>
      <p class="sub">Scrivile, usa il GPS oppure tocca la mappa qui sotto (“Imposta la mia posizione”). Servono per ricavare le coordinate del punto.</p>
      <label class="f" for="m2-decl">Declinazione magnetica (°, Est +)</label>
      <input id="m2-decl" type="number" inputmode="decimal" step="0.1" value="3">
      <p class="sub">La bussola del telefono dà l’azimut magnetico: in Italia la declinazione è circa +3° (Est). Correggila se la conosci meglio.</p>
    </div>
    <div class="card"><h3>Il punto che osservi</h3>
      <label class="f" for="m2-zt" id="m2-ltz">Quota del suolo alla sua base (m s.l.m.)</label>
      <div class="row"><input id="m2-zt" type="number" inputmode="decimal" step="0.1" value="0"><button type="button" class="btn sm fit" id="m2-dem">Quota dalla mappa</button></div>
      <div id="m2-wht"><label class="f" for="m2-ht">Altezza del punto osservato sul suolo (m)</label>
      <input id="m2-ht" type="number" inputmode="decimal" step="0.1" value="50"></div>
      <dl class="kv" id="m2-wztot"><dt>Quota del punto</dt><dd id="m2-ztot">—</dd></dl>
      <p class="sub">Esempio: per la lanterna di un faro, quota della base più altezza della torre.</p>
    </div>
    <div class="card" id="m2-cdist" hidden><h3>Distanza orizzontale nota</h3>
      <div class="row"><input id="m2-dv" type="number" inputmode="decimal" step="any" placeholder="es. 1200" aria-label="Distanza"><select id="m2-du" aria-label="Unità" style="flex:0 0 96px"><option value="m">m</option><option value="km">km</option><option value="NM">NM</option><option value="passi">passi</option></select></div>
      <div class="row" style="margin-top:8px"><button type="button" class="btn sm" id="m2-dmap">Dai segnaposto sulla mappa</button></div>
      <p class="sub">Dalla carta, da una misura o dai due segnaposto (tu e il punto osservato) sulla mappa qui sotto.</p>
    </div>
    <div class="card">
      <label style="display:flex;gap:10px;align-items:center"><input type="checkbox" id="m2-curv" checked style="width:22px;min-height:22px"> Correggi per curvatura terrestre e rifrazione</label>
      <p class="sub">Conta oltre qualche chilometro: a 20 km la differenza supera i 25 m di quota.</p>
    </div>
    <div id="m2-slot1"></div>
    <button type="button" class="btn pri big" data-go="2">Vai alla misura con la camera</button>
  </div>

  <div class="panel" data-s="2" hidden>
    ${camHTML('m2',{hud:'Inclinazione',horizon:true})}
    <div id="m2-flow" style="margin-top:10px"></div>
    <p class="sub">Tieni il telefono fermo con entrambe le mani. Il valore è la media degli ultimi istanti.</p>
  </div>

  <div class="panel" data-s="3" hidden>
    <div id="m2-res"></div>
    <div class="row"><button type="button" class="btn" id="m2-new">Nuova misura</button></div>
    <div id="m2-slot3" style="margin-top:10px"></div>
  </div>`;

  m2.ui=createMapUI({
    modes:[{key:'tgt',label:'Imposta il punto osservato'},{key:'obs',label:'Imposta la mia posizione'}],
    gpsKey:'obs',
    pins:{tgt:{t:'T',bg:'#d8262f',fg:'#fff'},obs:{t:'Io',bg:'#ffd400',fg:'#000'}},
    hints:{tgt:'Tocca la mappa sul punto osservato (la sua base).',obs:'Tocca la mappa dove ti trovi (opzionale: serve solo al confronto).'},
    idleHint:'La mappa è facoltativa: serve per leggere le quote dal DEM e per tracciare la circonferenza di posizione.',
    onChange:async(k,ll,src)=>{
      m2[k]=ll;m2Render();
      if(src==='drag')return;
      try{
        const z=await dem(ll);
        if(z!=null){$(k==='obs'?'#m2-zo':'#m2-zt').value=Math.round(z*10)/10;toast('Quota dal DEM: '+fmt(z,0)+' m (indicativa)');m2Render();}
      }catch(e){toast('Quota dal DEM non disponibile: scrivila a mano.');}
    }
  },$('#m2-slot1'));

  m2.steps=setupSteps(v,['Dati','Misura','Risultato'],n=>{
    if(n===1)placeMap(m2.ui,'m2-slot1');
    if(n===3){placeMap(m2.ui,'m2-slot3');m2Render();setTimeout(()=>{m2.ui.map.invalidateSize();const r=m2Calc();
      if(r&&r.mode==='pos'&&r.pos&&m2.obs)m2.ui.map.fitBounds(L.latLngBounds([m2.obs,r.pos]).pad(0.35));
      else if(r&&Number.isFinite(r.D)&&m2.tgt&&r.mode!=='pos')m2.ui.map.fitBounds(boundsAround(m2.tgt,r.D).pad(0.2));else m2.ui.fit();},120);}
    if(n!==2){Sensors.stop();showStart('m2');}
  });
  const stages=[
    {key:'zero',chip:'Zero',label:'Fissa lo zero',optional:true,skip:true,read:()=>Sensors.elev()},
    {key:'theta',chip:'Alzo',label:'Fissa l’alzo sul punto',read:()=>Sensors.elev()-(m2.s.zero||0)},
    {key:'az',chip:'Azimut',label:'Fissa l’azimut verso il punto',step:1,optional:true,read:()=>Sensors.az()}
  ];
  m2.stages=stages;
  const hint=k=>k==='zero'
    ?'Inquadra l’orizzonte, o un punto alla tua stessa altezza. Tieni fermo e premi.'
    :k==='az'
    ?'Mira il punto con il mirino e premi: serve la direzione (azimut) verso di esso. Puoi anche scriverla a mano.'
    :'Porta il mirino sul punto osservato (la lanterna, la cima) e premi. Positivo verso l’alto, negativo verso il basso.';
  m2.flow=makeFlow('m2',stages,m2.s,hint,m2Render,(k,val,old)=>{
    if(k==='zero'&&m2.s.theta!=null){m2.s.theta=r2(m2.s.theta+(old==null?0:old)-val);m2.flow.refresh();}
  });
  bindCam('m2',()=>{
    pitchRender('m2',m2.s);
    if(m2.mode==='pos'){
      const a=Sensors.az();
      $('#m2-hs').textContent=(Sensors.compass?'':'bussola relativa · ')+'azimut '+(Number.isFinite(a)?Math.round(a)+'°':'—');
    }
  });

  ['m2-zo','m2-hp','m2-zt','m2-ht','m2-curv','m2-dv','m2-du','m2-decl'].forEach(id=>$('#'+id).addEventListener('input',m2Render));
  $('#m2-du').addEventListener('change',m2Render);
  $('#m2-mode').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;m2.mode=b.dataset.m;m2Modes();m2Render();});
  const setObs=ll=>{m2.obs=ll;m2.ui.setPoint('obs',ll);m2Render();};
  $('#m2-oc').addEventListener('change',e=>{
    const t=e.target.value.trim();if(!t)return;
    const n=nums(t),utm=n.length>=2&&Math.abs(n[0])>1000;
    const ll=parseCoord(t,utm?'utm':'dd',32);
    if(!ll){toast('Coordinate non valide: scrivi “lat, lon” (es. 45.6983, 9.6773).');return;}
    setObs(ll);
  });
  $('#m2-oc-gps').onclick=()=>$('#m2-gps').click();
  $('#m2-dmap').onclick=()=>{
    if(!m2.obs||!m2.tgt){toast('Imposta sulla mappa sia la tua posizione sia il punto osservato.');return;}
    $('#m2-du').value='m';$('#m2-dv').value=Math.round(distLL(m2.obs,m2.tgt));m2Render();
  };
  $('#m2-gps').onclick=()=>{
    if(!navigator.geolocation){toast('GPS non disponibile.');return;}
    toast('Ricerca posizione GPS…');
    navigator.geolocation.getCurrentPosition(async pos=>{
      const ll=[pos.coords.latitude,pos.coords.longitude];
      m2.obs=ll;m2.ui.setPoint('obs',ll);
      try{const z=await dem(ll);if(z!=null){$('#m2-zo').value=Math.round(z*10)/10;toast('Quota dal DEM: '+fmt(z,0)+' m (indicativa)');}}
      catch(e){if(pos.coords.altitude!=null){$('#m2-zo').value=Math.round(pos.coords.altitude);toast('Quota dal GPS (poco precisa).');}else toast('Quota non disponibile: scrivila a mano.');}
      m2Render();
    },()=>toast('Posizione GPS non disponibile: controlla i permessi.'),{enableHighAccuracy:true,timeout:20000,maximumAge:0});
  };
  $('#m2-dem').onclick=async()=>{
    if(!m2.tgt){toast('Imposta prima il punto osservato sulla mappa.');return;}
    try{const z=await dem(m2.tgt);if(z!=null){$('#m2-zt').value=Math.round(z*10)/10;toast('Quota dal DEM: '+fmt(z,0)+' m (indicativa)');m2Render();}}
    catch(e){toast('Quota dal DEM non disponibile: scrivila a mano.');}
  };
  v.addEventListener('click',e=>{if(e.target.closest('#m2-new')){m2.flow.reset();m2SyncAz();m2.steps.go(2);}
    const cp=e.target.closest('[data-copy]');if(cp)copyText(cp.dataset.copy);});
  m2.steps.go(1);
  m2Modes();
  m2Render();
}

/* ============================================================ */
/*  3 · Snellius–Potenot                                        */
/* ============================================================ */
const KEYS3=['a','b','c'],LET3=['A','B','C'];
const m3={fmt:'dd',zone:32,pts:[{ll:null,name:''},{ll:null,name:''},{ll:null,name:''}],est:null,estGps:false,
  s:{a:null,b:null,c:null},sigma:1,sol:null,ui:null,flow:null,steps:null,mkEls:[]};
const lab3=i=>LET3[i]+(m3.pts[i].name?' · '+m3.pts[i].name:'');
function m3Origin(){
  if(m3.est)return m3.est;
  const p=m3.pts.filter(x=>x.ll);if(!p.length)return null;
  return [p.reduce((s,x)=>s+x.ll[0],0)/p.length,p.reduce((s,x)=>s+x.ll[1],0)/p.length];
}
function m3InfoText(i){
  const ll=m3.pts[i].ll;if(!ll)return 'Non ancora impostato.';
  return m3.fmt==='dd'?('UTM '+utmZone(ll[1])+utmBand(ll[0])+' '+fmtCoord(ll,'utm',utmZone(ll[1]))):('Lat, Lon '+fmtCoord(ll,'dd'));
}
function m3WriteField(i){
  const row=$('.ptc[data-i="'+i+'"]');if(!row)return;
  const inp=$('.pcoord',row),ll=m3.pts[i].ll;
  if(document.activeElement!==inp)inp.value=ll?fmtCoord(ll,m3.fmt,m3.zone):'';
  inp.removeAttribute('aria-invalid');
  $('.pinfo',row).textContent=m3InfoText(i);
}
function m3Solve(){
  const ok=m3.pts.every(p=>p.ll)&&KEYS3.every(k=>m3.s[k]!=null);
  m3.sol=ok?resection(m3.pts.map(p=>p.ll),KEYS3.map(k=>m3.s[k]),m3.sigma):null;
  return ok;
}
function m3Render(){m3RenderInner();m3Stats();}
function m3RenderInner(){
  const ok=m3Solve();
  m3.steps.mark(1,m3.pts.every(p=>p.ll));m3.steps.mark(2,KEYS3.every(k=>m3.s[k]!=null));m3.steps.mark(3,!!m3.sol);
  const g=m3.ui.group;g.clearLayers();
  m3.ui.removePoint('p');
  const res=$('#m3-res');
  if(!ok){res.innerHTML='<div class="note">Imposta i tre punti noti (passo 1) e fissa le tre direzioni con la camera (passo 2).</div>';return;}
  const S=m3.sol;
  if(!S){res.innerHTML='<div class="note warn">Con questi angoli il problema non ha soluzione: i punti sono quasi allineati, oppure la posizione cade sul cerchio che passa per A, B e C. Cambia punti o rifai le misure.</div>';return;}
  const ll=S.ll,u=ll2utm(ll[0],ll[1],utmZone(ll[1]));
  const bad=!Number.isFinite(S.err)||S.err>200;
  const gps=(m3.est&&m3.estGps)?distLL(m3.est,ll):null;
  m3.pts.forEach(p=>L.polyline([ll,p.ll],{color:'#ffd400',weight:2,dashArray:'6 6'}).addTo(g));
  if(Number.isFinite(S.err))L.circle(ll,{radius:Math.max(S.err,1),color:'#2fd36b',weight:2,fillColor:'#2fd36b',fillOpacity:.15}).addTo(g);
  m3.ui.setPoint('p',ll);
  res.innerHTML=`<div class="card">
    <div class="big-l">Posizione calcolata</div>
    <div class="coords">${ll[0].toFixed(6)}, ${ll[1].toFixed(6)}</div>
    <div class="sub" style="font-size:15px;margin-top:4px">UTM WGS84 ${u.zone}${utmBand(ll[0])} · E ${Math.round(u.E)} · N ${Math.round(u.N)}</div>
    <dl class="kv">
      <dt>Incertezza stimata</dt><dd>${Number.isFinite(S.err)?'± '+fmt(S.err,0)+' m':'non determinabile'}</dd>
      <dt>Angolo A–B · B–C</dt><dd>${fmt(S.angAB,1)}° · ${fmt(S.angBC,1)}°</dd>
      ${gps!=null?`<dt>Scarto dal GPS</dt><dd>${fmt(gps,0)} m</dd>`:''}
    </dl>
    <label class="f" for="m3-sig">Errore angolare ipotizzato</label>
    <select id="m3-sig">${[0.5,1,2,3].map(x=>`<option value="${x}" ${x===m3.sigma?'selected':''}>±${String(x).replace('.',',')}°</option>`).join('')}</select>
    ${S.danger<0.05?'<div class="note warn">La posizione è vicina al cerchio che passa per A, B e C: la soluzione è molto instabile. Scegli un altro punto noto.</div>':''}
    ${bad?'<div class="note warn">Incertezza elevata: la geometria è sfavorevole. Prediligi punti ben distribuiti attorno a te, con angoli tra le direzioni di almeno 30°.</div>':''}
    ${m3.compass?'':'<div class="note">La bussola non era assoluta: l’orientamento è relativo, ma gli angoli tra le direzioni restano validi.</div>'}
  </div>
  <div class="row">
    <button type="button" class="btn" id="m3-copy">Copia coordinate</button>
    <a class="btn" style="text-align:center;text-decoration:none;display:flex;align-items:center;justify-content:center" target="_blank" rel="noopener" href="https://www.google.com/maps?q=${ll[0].toFixed(6)},${ll[1].toFixed(6)}">Apri nel navigatore</a>
  </div>
  <div class="row" style="margin-top:8px"><button type="button" class="btn" id="m3-new">Rifai le misure</button></div>`;
}
function m3CamRender(){
  const az=Sensors.az();
  $('#m3-hv').textContent=Number.isFinite(az)?fmt(az,1)+'°':'—';
  $('#m3-hs').textContent=(Sensors.compass?'':'bussola relativa · ')+(Sensors.azStd()<0.5?'fermo':'instabile');
  const P0=m3Origin();
  if(!P0||!Number.isFinite(az)){m3.mkEls.forEach(e=>{e.hidden=true;});return;}
  let off=0;const j=KEYS3.findIndex(k=>m3.s[k]!=null);
  if(j>=0&&m3.pts[j].ll)off=norm180(bearingLL(P0,m3.pts[j].ll)-m3.s[KEYS3[j]]);
  const hf=HFOV/Sensors.zoom;
  m3.pts.forEach((p,i)=>{
    const el=m3.mkEls[i];
    if(!p.ll){el.hidden=true;return;}
    el.hidden=false;
    const rel=norm180(bearingLL(P0,p.ll)-(az+off)),inside=Math.abs(rel)<=hf/2;
    el.classList.toggle('edge',!inside);el.classList.toggle('done',m3.s[KEYS3[i]]!=null);
    el.classList.toggle('r',!inside&&rel>0);
    const t=lab3(i);
    if(inside){el.style.left=(50+rel/hf*100)+'%';el.style.right='auto';el.firstChild.textContent=t;}
    else if(rel<0){el.style.left='0';el.style.right='auto';el.firstChild.textContent='◀ '+t+' '+Math.round(-rel)+'°';}
    else{el.style.left='auto';el.style.right='0';el.firstChild.textContent=t+' '+Math.round(rel)+'° ▶';}
  });
}
function initM3(){
  const v=$('#tg-snellius');
  v.innerHTML=`<div class="steps"></div>
  <div class="strip" style="--n:3"><div><span>Punti noti</span><b id="m3-sp">0/3</b></div><div><span>Direzioni</span><b id="m3-sm">0/3</b></div><div><span>Incertezza</span><b id="m3-se">—</b></div></div>

  <div class="panel" data-s="1">
    <div id="m3-slot1"></div>
    <div class="card"><h3>Coordinate dei punti noti</h3>
      <div class="row">
        <div><label class="f" for="m3-fmt">Formato</label>
          <select id="m3-fmt"><option value="dd">Lat, Lon (gradi decimali)</option><option value="utm">UTM WGS84 (Est Nord)</option></select></div>
        <div id="m3-zwrap" hidden><label class="f" for="m3-zone">Fuso</label>
          <select id="m3-zone">${[31,32,33,34,35].map(z=>`<option value="${z}" ${z===32?'selected':''}>${z}</option>`).join('')}</select></div>
      </div>
      <div id="m3-pts">${[0,1,2].map(i=>`<div class="ptc" data-i="${i}">
        <div class="ptc-h"><div class="pin mini" style="--bg:#ffd400;--fg:#000">${LET3[i]}</div><input class="pname" placeholder="Nome (facoltativo): campanile, antenna…" aria-label="Nome del punto ${LET3[i]}"></div>
        <label class="f">Coordinate del punto ${LET3[i]}</label>
        <div class="row"><input class="pcoord" inputmode="decimal" placeholder="41.8902, 12.4922" aria-label="Coordinate del punto ${LET3[i]}"><button type="button" class="btn sm fit pmap">Su mappa</button></div>
        <p class="sub pinfo">Non ancora impostato.</p></div>`).join('')}</div>
      <p class="sub">Le coordinate sono in WGS84. Se la carta cartacea è in ED50 o Roma40, convertile prima: lo scarto è di decine o centinaia di metri.</p>
    </div>
    <button type="button" class="btn pri big" data-go="2">Vai al rilievo con la camera</button>
  </div>

  <div class="panel" data-s="2" hidden>
    ${camHTML('m3',{hud:'Direzione (azimut)',horizon:false})}
    <div id="m3-flow" style="margin-top:10px"></div>
    <p class="sub">I segnaposto A, B, C sulla camera sono indicativi: si basano sul GPS (o sul centro dei tre punti). Punta il mirino sul punto reale e conferma. Tieni il telefono fermo e ruota sul posto, senza spostarti.</p>
  </div>

  <div class="panel" data-s="3" hidden>
    <div id="m3-res"></div>
    <div id="m3-slot3" style="margin-top:10px"></div>
  </div>`;

  m3.ui=createMapUI({
    modes:[{key:'A',label:'Punto A'},{key:'B',label:'Punto B'},{key:'C',label:'Punto C'}],
    gpsKey:'est',gpsLabel:'Mia posizione GPS',
    pins:{A:{t:'A',bg:'#ffd400',fg:'#000'},B:{t:'B',bg:'#ffd400',fg:'#000'},C:{t:'C',bg:'#ffd400',fg:'#000'},
          est:{t:'Io',bg:'#fff',fg:'#000'},p:{t:'P',bg:'#2fd36b',fg:'#000'}},
    hints:{A:'Tocca la mappa sul punto noto A.',B:'Tocca la mappa sul punto noto B.',C:'Tocca la mappa sul punto noto C.'},
    idleHint:'Scegli A, B e C sulla mappa, oppure scrivi le coordinate sotto. Il GPS serve solo come posizione approssimata per la camera.',
    onChange:(k,ll,src)=>{
      if(k==='est'){m3.est=ll;m3.estGps=(src==='gps');if(src!=='drag')m3Render();return;}
      const i=LET3.indexOf(k);if(i<0)return;
      m3.pts[i].ll=ll;
      if(m3.fmt==='utm'&&src!=='drag'){m3.zone=utmZone(ll[1]);const zs=$('#m3-zone');if(zs&&[31,32,33,34,35].includes(m3.zone))zs.value=m3.zone;}
      m3WriteField(i);
      m3Stats();m3Render();
    }
  },$('#m3-slot1'));

  m3.steps=setupSteps(v,['Punti noti','Rilievo','Posizione'],n=>{
    if(n===1)placeMap(m3.ui,'m3-slot1');
    if(n===3){placeMap(m3.ui,'m3-slot3');m3Render();setTimeout(()=>{m3.ui.map.invalidateSize();m3.ui.fit();
      if(m3.sol){const b=L.latLngBounds([m3.sol.ll,...m3.pts.map(p=>p.ll)]);m3.ui.map.fitBounds(b.pad(0.3));}},120);}
    if(n!==2){Sensors.stop();showStart('m3');}
  });

  m3.mkEls=KEYS3.map(()=>{const d=document.createElement('div');d.className='mk';d.hidden=true;d.innerHTML='<span></span>';$('#m3-mk').appendChild(d);return d;});
  const stages=KEYS3.map((k,i)=>({key:k,chip:'Punto '+LET3[i],step:0.1,
    label:()=>'Conferma direzione '+lab3(i),
    read:()=>{
      if(!m3.pts.every(p=>p.ll)){toast('Imposta prima i tre punti noti (passo 1).');return NaN;}
      return Sensors.az();
    }}));
  m3.flow=makeFlow('m3',stages,m3.s,k=>{
    const i=KEYS3.indexOf(k);
    return 'Punta il mirino sul punto reale '+lab3(i)+' e premi. Confermali in ordine, fermandoti un istante su ciascuno.';
  },()=>{m3Stats();m3Render();});
  bindCam('m3',m3CamRender);

  $('#m3-fmt').onchange=e=>{
    m3.fmt=e.target.value;$('#m3-zwrap').hidden=m3.fmt!=='utm';
    if(m3.fmt==='utm'){const f=m3.pts.find(q=>q.ll);if(f){const z=utmZone(f.ll[1]);if(z>=31&&z<=35){m3.zone=z;$('#m3-zone').value=z;}}}
    $$('.pcoord',v).forEach(x=>{x.placeholder=m3.fmt==='utm'?'291234 4640123':'41.8902, 12.4922';});
    [0,1,2].forEach(m3WriteField);
  };
  $('#m3-zone').onchange=e=>{m3.zone=parseInt(e.target.value,10);[0,1,2].forEach(m3WriteField);};
  $('#m3-pts').addEventListener('change',e=>{
    const row=e.target.closest('.ptc');if(!row)return;const i=+row.dataset.i;
    if(e.target.classList.contains('pcoord')){
      const t=e.target.value.trim();
      if(!t){m3.pts[i].ll=null;m3.ui.removePoint(LET3[i]);m3WriteField(i);m3Stats();m3Render();return;}
      const ll=parseCoord(t,m3.fmt,m3.zone);
      if(!ll){e.target.setAttribute('aria-invalid','true');$('.pinfo',row).textContent=m3.fmt==='utm'?'Formato non valido: scrivi Est e Nord, ad esempio 291234 4640123, e controlla il fuso.':'Formato non valido: scrivi latitudine e longitudine, ad esempio 41.8902, 12.4922.';return;}
      m3.pts[i].ll=ll;m3.ui.setPoint(LET3[i],ll);m3.ui.fit();m3WriteField(i);m3Stats();m3Render();
    }
  });
  $('#m3-pts').addEventListener('input',e=>{
    if(e.target.classList.contains('pname')){m3.pts[+e.target.closest('.ptc').dataset.i].name=e.target.value.trim();m3.flow.refresh();}
  });
  $('#m3-pts').addEventListener('click',e=>{
    const b=e.target.closest('.pmap');if(!b)return;
    const i=+b.closest('.ptc').dataset.i;
    m3.steps.go(1);m3.ui.setMode(LET3[i]);m3.ui.wrap.scrollIntoView({block:'center',behavior:'smooth'});
  });
  v.addEventListener('click',e=>{
    if(e.target.closest('#m3-new')){m3.flow.reset();m3.steps.go(2);}
    if(e.target.closest('#m3-copy')&&m3.sol)copyText(m3.sol.ll[0].toFixed(6)+', '+m3.sol.ll[1].toFixed(6));
  });
  v.addEventListener('change',e=>{if(e.target.id==='m3-sig'){m3.sigma=parseFloat(e.target.value);m3Render();m3Stats();}});
  m3.steps.go(1);
  m3Render();m3Stats();
}
function m3Stats(){
  $('#m3-sp').textContent=m3.pts.filter(p=>p.ll).length+'/3';
  $('#m3-sm').textContent=KEYS3.filter(k=>m3.s[k]!=null).length+'/3';
  $('#m3-se').textContent=(m3.sol&&Number.isFinite(m3.sol.err))?'± '+fmt(m3.sol.err,0)+' m':'—';
}

/* ============================================================ */
/*  5 · Intersezione in avanti                                  */
/*  Si lavora per stazioni: in A imposto la posizione e miro C,  */
/*  poi mi sposto in B, imposto la posizione e miro di nuovo C.  */
/* ============================================================ */
const LET4=['A','B'];
const m4={fmt:'dd',zone:32,pts:[{ll:null,name:''},{ll:null,name:''}],s:{a:null,b:null,ab:null,ba:null,ea:null,eb:null,eab:null,eba:null},rd:{},sigma:2,sol:null,ui:null,flows:[null,null],steps:null,mkEl:null,cur:0};
const lab4=i=>LET4[i]+(m4.pts[i].name?' · '+m4.pts[i].name:'');

/* correzione bussola: i riferimenti A→B (da A) e B→A (da B) danno ciascuno uno sfasamento, se ne fa la media */
function m4OffList(){
  const A=m4.pts[0].ll,B=m4.pts[1].ll,o=[];if(!A||!B)return o;
  if(typeof m4.s.ab==='number')o.push(norm180(bearingLL(A,B)-m4.s.ab));
  if(typeof m4.s.ba==='number')o.push(norm180(bearingLL(B,A)-m4.s.ba));
  return o;
}
const m4HasRef=()=>m4OffList().length>0;
function m4Off(){
  const o=m4OffList();if(!o.length)return 0;
  let sn=0,cs=0;o.forEach(x=>{sn+=Math.sin(x*D2R);cs+=Math.cos(x*D2R);});
  return norm180(Math.atan2(sn,cs)*R2D);
}
function m4Info(i){
  const ll=m4.pts[i].ll;if(!ll)return 'Non ancora impostato.';
  return m4.fmt==='dd'?('UTM '+utmZone(ll[1])+utmBand(ll[0])+' '+fmtCoord(ll,'utm',utmZone(ll[1]))):('Lat, Lon '+fmtCoord(ll,'dd'));
}
function m4Write(i){
  const row=$('.ptc[data-i="'+i+'"]',$('#tg-avanti'));if(!row)return;
  const inp=$('.pcoord',row),ll=m4.pts[i].ll;
  if(document.activeElement!==inp)inp.value=ll?fmtCoord(ll,m4.fmt,m4.zone):'';
  inp.removeAttribute('aria-invalid');
  $('.pinfo',row).textContent=m4Info(i);
}
function m4Stats(){
  $('#m4-sp').textContent=m4.pts.filter(p=>p.ll).length+'/2';
  $('#m4-sm').textContent=['a','b'].filter(k=>m4.s[k]!=null).length+'/2';
  $('#m4-se').textContent=(m4.sol&&Number.isFinite(m4.sol.err))?'± '+fmt(m4.sol.err,0)+' m':'—';
}
function m4Render(){
  const have=m4.pts.every(p=>p.ll)&&m4.s.a!=null&&m4.s.b!=null;
  const off=m4Off();
  m4.sol=have?forwardIntersection(m4.pts.map(p=>p.ll),[norm360(m4.s.a+off),norm360(m4.s.b+off)],m4.sigma):null;
  const S=m4.sol;
  m4.steps.mark(1,!!(m4.pts[0].ll&&m4.s.a!=null));m4.steps.mark(2,!!(m4.pts[1].ll&&m4.s.b!=null));m4.steps.mark(3,!!(S&&S.ll));
  m4Stats();
  const g=m4.ui.group;g.clearLayers();m4.ui.removePoint('C');
  const res=$('#m4-res');
  if(!have){res.innerHTML='<div class="note">Servono le due stazioni: in A posizione e direzione verso C (passo 1), in B posizione e direzione verso C (passo 2).</div>';return;}
  if(!S){res.innerHTML='<div class="note warn">Le due direzioni sono quasi parallele: non si incontrano in un punto. Scegli per B un punto più distante da A, in modo che C sia visto con angoli diversi.</div>';return;}
  if(S.behind){res.innerHTML='<div class="note warn">Le due semirette si allontanano: C risulterebbe alle tue spalle. Controlla di aver puntato lo stesso punto da A e da B. Se la bussola è sfasata, usa i riferimenti A→B e B→A.</div>';return;}
  const ll=S.ll,u=ll2utm(ll[0],ll[1],utmZone(ll[1]));
  const bad=!Number.isFinite(S.err)||S.err>Math.max(50,S.base*0.5);
  /* dislivello: h = d·tan(alzo) + correzione di curvatura e rifrazione (0,0683 m per km²) */
  const cur=d=>0.0683*(d/1000)**2, sg=m4.sigma*D2R, sec2=e=>1/Math.cos(e*D2R)**2;
  const hq=(d,e)=>d*Math.tan(e*D2R)+cur(d);
  const hqErr=(d,e)=>d*sec2(e)*sg+(Number.isFinite(S.err)?Math.abs(Math.tan(e*D2R))*S.err:0);
  const hA=(m4.s.ea!=null)?hq(S.dA,m4.s.ea):null, hB=(m4.s.eb!=null)?hq(S.dB,m4.s.eb):null;
  const eA=hA!=null?hqErr(S.dA,m4.s.ea):0, eB=hB!=null?hqErr(S.dB,m4.s.eb):0;
  /* dislivello A–B misurato direttamente: A→B da A e/o B→A da B (con entrambe la curvatura si elimina) */
  const D=S.base,e1=(typeof m4.s.ab==='number'&&m4.s.eab!=null)?m4.s.eab:null,e2=(typeof m4.s.ba==='number'&&m4.s.eba!=null)?m4.s.eba:null;
  const v1=e1!=null?D*Math.tan(e1*D2R)+cur(D):null, v2=e2!=null?-(D*Math.tan(e2*D2R)+cur(D)):null;
  const s1=e1!=null?D*sec2(e1)*sg:0, s2=e2!=null?D*sec2(e2)*sg:0;
  let dz=null,dzErr=0,dzSrc='';
  if(v1!=null&&v2!=null){dz=(v1+v2)/2;dzErr=Math.hypot(s1,s2)/2;dzSrc='misurato A→B e B→A';}
  else if(v1!=null){dz=v1;dzErr=s1;dzSrc='misurato da A';}
  else if(v2!=null){dz=v2;dzErr=s2;dzSrc='misurato da B';}
  /* quote di C: se il dislivello A–B è noto, le due misure di C si compensano a vicenda (media pesata) */
  let cA=hA,cB=hB,cErr=null,mis=null,misErr=0,comp=false;
  if(dz!=null&&hA!=null&&hB!=null){
    const wA=1/Math.max(eA,1e-3)**2,wB=1/Math.max(Math.hypot(eB,dzErr),1e-3)**2;
    cA=(hA*wA+(hB+dz)*wB)/(wA+wB);cB=cA-dz;cErr=1/Math.sqrt(wA+wB);
    mis=hA-hB-dz;misErr=Math.hypot(eA,eB,dzErr);comp=true;
  }else if(dz!=null&&hA!=null){cB=hA-dz;cErr=Math.hypot(eA,dzErr);}
  else if(dz!=null&&hB!=null){cA=hB+dz;cErr=Math.hypot(eB,dzErr);}
  else if(hA!=null&&hB!=null){dz=hA-hB;dzErr=Math.hypot(eA,eB);dzSrc='ricavato dalle quote di C';}
  const ea_=cErr!=null?cErr:eA, eb_=cErr!=null?cErr:eB;
  const q=(x,e)=>sgn(x,1)+' m <small>± '+fmt(e,1)+'</small>';
  const quote=(cA!=null||cB!=null||dz!=null)?`<dl class="kv">
      ${dz!=null?`<dt>Dislivello da A a B</dt><dd>${q(dz,dzErr)}</dd>`:''}
      ${(v1!=null&&v2!=null)?`<dt>Scarto A→B / B→A</dt><dd>${fmt(Math.abs(v1-v2),1)} m</dd>`:''}
      ${cA!=null?`<dt>Quota di C rispetto ad A</dt><dd>${q(cA,cErr!=null?cErr:eA)}</dd>`:''}
      ${cB!=null?`<dt>Quota di C rispetto a B</dt><dd>${q(cB,cErr!=null?cErr:eB)}</dd>`:''}
      ${mis!=null?`<dt>Chiusura delle misure</dt><dd>${sgn(mis,1)} m <small>± ${fmt(misErr,1)}</small></dd>`:''}
    </dl>
    ${(mis!=null&&Math.abs(mis)>2*misErr)?'<div class="note warn">Le misure di quota non tornano tra loro: controlla di aver puntato lo stesso punto C e di aver tenuto il telefono fermo.</div>':''}
    <p class="sub">${dz!=null&&dzSrc&&dzSrc!=='ricavato dalle quote di C'?'Dislivello A–B '+dzSrc+'. ':''}${comp?'Quote di C compensate con il dislivello A–B. ':''}${dz==null?'Per un dislivello A–B diretto, punta B da A e A da B (passaggio facoltativo). ':''}Il telefono va tenuto alla stessa altezza dal suolo nelle due stazioni.</p>`:'';
  m4.pts.forEach(p=>L.polyline([p.ll,ll],{color:'#ffd400',weight:2,dashArray:'6 6'}).addTo(g));
  L.polyline([m4.pts[0].ll,m4.pts[1].ll],{color:'#8b96a3',weight:1.5}).addTo(g);
  if(Number.isFinite(S.err))L.circle(ll,{radius:Math.max(S.err,1),color:'#2fd36b',weight:2,fillColor:'#2fd36b',fillOpacity:.15}).addTo(g);
  m4.ui.setPoint('C',ll);
  res.innerHTML=`<div class="card">
    <div class="big-l">Coordinate del punto C</div>
    <div class="coords">${ll[0].toFixed(6)}, ${ll[1].toFixed(6)}</div>
    <div class="sub" style="font-size:15px;margin-top:4px">UTM WGS84 ${u.zone}${utmBand(ll[0])} · E ${Math.round(u.E)} · N ${Math.round(u.N)}</div>
    <dl class="kv">
      <dt>Distanza A → C</dt><dd>${fmt(S.dA,0)} m</dd>
      <dt>Distanza B → C</dt><dd>${fmt(S.dB,0)} m</dd>
      <dt>Distanza A–B (base)</dt><dd>${fmt(S.base,0)} m</dd>
      <dt>Angolo in C</dt><dd>${fmt(S.gamma,1)}°</dd>
      <dt>Incertezza stimata</dt><dd>${Number.isFinite(S.err)?'± '+fmt(S.err,0)+' m':'non determinabile'}</dd>
      <dt>Correzione bussola</dt><dd>${m4HasRef()?sgn(off,1)+'°':'non usata'}</dd>
    </dl>
    ${quote}
    <label class="f" for="m4-sig">Errore angolare ipotizzato</label>
    <select id="m4-sig">${[0.5,1,2,3].map(x=>`<option value="${x}" ${x===m4.sigma?'selected':''}>±${String(x).replace('.',',')}°</option>`).join('')}</select>
    ${(S.gamma<30||S.gamma>150)?'<div class="note warn">L’angolo in C è molto piccolo o molto grande: le due direzioni sono quasi parallele e l’errore si amplifica. Meglio una base più larga: l’angolo ideale è vicino a 90°.</div>':''}
    ${bad?'<div class="note warn">Incertezza elevata rispetto alla base: ripeti le misure da punti più distanti.</div>':''}
    ${!m4HasRef()?'<div class="note">Non hai usato nessun riferimento: l’azimut dipende dalla bussola del telefono (declinazione magnetica compresa, in Italia circa +3°). Per una posizione più affidabile punta B da A e/o A da B (passaggio facoltativo): serve anche per il dislivello A–B.</div>':''}
  </div>
  <div class="row">
    <button type="button" class="btn" id="m4-copy">Copia coordinate</button>
    <a class="btn" style="text-align:center;text-decoration:none;display:flex;align-items:center;justify-content:center" target="_blank" rel="noopener" href="https://www.google.com/maps?q=${ll[0].toFixed(6)},${ll[1].toFixed(6)}">Apri nel navigatore</a>
  </div>
  <div class="row" style="margin-top:8px"><button type="button" class="btn" id="m4-new">Rifai le misure</button></div>`;
}
function m4CamRender(i){
  const p=i?'m4b':'m4a',az=Sensors.az();
  $('#'+p+'-hv').textContent=Number.isFinite(az)?fmt(az,1)+'°':'—';
  const el_=Sensors.elev();
  $('#'+p+'-hs').textContent=(Sensors.compass?'':'bussola relativa · ')+(Sensors.azStd()<0.5?'fermo':'instabile')+(Number.isFinite(el_)?' · alzo '+sgn(el_,1)+'°':'');
  const el=m4.mkEl;if(!el)return;
  /* in B mostro dove dovrebbe stare A, come aiuto per il riferimento */
  if(i!==1||!m4.pts[0].ll||!m4.pts[1].ll||!Number.isFinite(az)){el.hidden=true;return;}
  const hf=HFOV/Sensors.zoom,off=m4Off();
  const rel=norm180(bearingLL(m4.pts[1].ll,m4.pts[0].ll)-(az+off)),inside=Math.abs(rel)<=hf/2;
  el.hidden=false;el.classList.toggle('edge',!inside);el.classList.toggle('r',!inside&&rel>0);el.classList.toggle('done',m4HasRef());
  const t=lab4(0);
  if(inside){el.style.left=(50+rel/hf*100)+'%';el.style.right='auto';el.firstChild.textContent=t;}
  else if(rel<0){el.style.left='0';el.style.right='auto';el.firstChild.textContent='◀ '+t+' '+Math.round(-rel)+'°';}
  else{el.style.left='auto';el.style.right='0';el.firstChild.textContent=t+' '+Math.round(rel)+'° ▶';}
}
function m4Station(i){
  const L_=LET4[i],pr=i?'m4b':'m4a';
  return `<div class="panel" data-s="${i+1}" ${i?'hidden':''}>
    <div class="card"><h3>Stazione ${L_}: dove sei</h3>
      <div class="ptc" data-i="${i}">
        <div class="ptc-h"><div class="pin mini" style="--bg:#ffd400;--fg:#000">${L_}</div><input class="pname" placeholder="Nome (facoltativo)" aria-label="Nome del punto ${L_}"></div>
        <div class="row"><button type="button" class="btn pri sm" data-m4gps>Imposta con il GPS</button><button type="button" class="btn sm fit pmap">Su mappa</button></div>
        <label class="f">Oppure scrivi le coordinate</label>
        <div class="row">
          <input class="pcoord" inputmode="decimal" placeholder="41.8902, 12.4922" aria-label="Coordinate del punto ${L_}">
          <select class="m4zone fit" aria-label="Fuso UTM" hidden>${[31,32,33,34,35].map(z=>`<option value="${z}" ${z===32?'selected':''}>Fuso ${z}</option>`).join('')}</select>
          <select class="m4fmt fit" aria-label="Formato coordinate"><option value="dd">Lat, Lon</option><option value="utm">UTM</option></select>
        </div>
        <p class="sub pinfo">Non ancora impostato.</p>
      </div>
      <div id="m4-slot${i}" hidden></div>
    </div>
    ${camHTML(pr,{hud:'Direzione (azimut)',horizon:false})}
    <div id="${pr}-flow" style="margin-top:10px"></div>
    <p class="sub">${i?'Punta il mirino su C, lo stesso punto mirato da A, e conferma. Se da qui vedi anche A, puoi puntarlo dopo (facoltativo): dà il dislivello A–B e corregge la bussola.':'Punta il mirino proprio sul punto C (anche in alto o in basso: l’alzo serve per il dislivello) e conferma. Facoltativo: punta anche B. Poi spostati in B.'}</p>
  </div>`;
}
function initM4(){
  const v=$('#tg-avanti');
  v.innerHTML=`<div class="steps"></div>
  <div class="strip" style="--n:3"><div><span>Posizioni</span><b id="m4-sp">0/2</b></div><div><span>Direzioni</span><b id="m4-sm">0/2</b></div><div><span>Incertezza</span><b id="m4-se">—</b></div></div>
  ${m4Station(0)}${m4Station(1)}
  <div class="panel" data-s="3" hidden>
    <div id="m4-res"></div>
    <div id="m4-slot3" style="margin-top:10px"></div>
  </div>`;

  m4.ui=createMapUI({
    modes:[{key:'A',label:'Punto A'},{key:'B',label:'Punto B'}],
    gpsKey:()=>LET4[m4.cur],gpsLabel:'Mia posizione GPS',
    pins:{A:{t:'A',bg:'#ffd400',fg:'#000'},B:{t:'B',bg:'#ffd400',fg:'#000'},C:{t:'C',bg:'#2fd36b',fg:'#000'}},
    hints:{A:'Tocca la mappa sul punto A, dove ti trovi.',B:'Tocca la mappa sul punto B, dove ti trovi.'},
    idleHint:()=>'Tocca “Punto '+LET4[m4.cur]+'” e poi la mappa, oppure usa il GPS.',
    onChange:(k,ll,src)=>{
      const i=LET4.indexOf(k);if(i<0)return;
      m4.pts[i].ll=ll;
      if(m4.fmt==='utm'&&src!=='drag'){const z=utmZone(ll[1]);if([31,32,33,34,35].includes(z)){m4.zone=z;$$('.m4zone',v).forEach(x=>{x.value=z;});}}
      m4Write(i);m4Render();
    }
  },$('#m4-slot0'));

  m4.steps=setupSteps(v,['Stazione A','Stazione B','Punto C'],n=>{
    Sensors.stop();showStart('m4a');showStart('m4b');
    if(n<3){
      m4.cur=n-1;
      $('#m4-slot0').hidden=true;$('#m4-slot1').hidden=true;
      placeMap(m4.ui,'m4-slot'+(n-1));
      m4.ui.refreshHint();
    }else{
      placeMap(m4.ui,'m4-slot3');m4Render();
      setTimeout(()=>{m4.ui.map.invalidateSize();
        if(m4.sol&&m4.sol.ll)m4.ui.map.fitBounds(L.latLngBounds([m4.sol.ll,...m4.pts.map(p=>p.ll)]).pad(0.3));else m4.ui.fit();},120);
    }
  });

  m4.mkEl=(()=>{const d=document.createElement('div');d.className='mk';d.hidden=true;d.innerHTML='<span></span>';$('#m4b-mk').appendChild(d);return d;})();
  const need=(i,key)=>()=>{
    if(!m4.pts[i].ll){toast('Imposta prima la posizione di '+LET4[i]+'.');return NaN;}
    const az=Sensors.az();
    if(key)m4.rd[key]={az:r2(az),el:r2(Sensors.elev())};   /* alzo preso nello stesso istante */
    return az;
  };
  const onCap=(k,val)=>{
    if(!['a','b','ab','ba'].includes(k))return;
    const r=m4.rd[k];m4.s['e'+k]=(r&&r.az===val&&Number.isFinite(r.el))?r.el:null;m4.rd[k]=null;
  };
  m4.flows[0]=makeFlow('m4a',[
    {key:'a',chip:'A → C',step:0.1,label:()=>'Da '+lab4(0)+': conferma direzione verso C',read:need(0,'a')},
    {key:'ab',chip:'A → B',step:0.1,optional:true,skip:true,skipVal:'no',label:()=>'Facoltativo: punta '+lab4(1),read:need(0,'ab')}
  ],m4.s,k=>k==='a'?'Sei in A: imposta la posizione, poi punta il mirino su C e premi.'
    :'Facoltativo: se da A vedi B (o un segnale posto su B), puntalo e premi. Serve per il dislivello A–B e per correggere la bussola.',()=>{m4Render();},onCap,{go:2,text:'Vai al punto B',msg:'Direzione da A registrata.'});
  m4.flows[1]=makeFlow('m4b',[
    {key:'b',chip:'B → C',step:0.1,label:()=>'Da '+lab4(1)+': conferma direzione verso C',read:need(1,'b')},
    {key:'ba',chip:'B → A',step:0.1,optional:true,skip:true,skipVal:'no',label:()=>'Facoltativo: punta '+lab4(0),read:need(1,'ba')}
  ],m4.s,k=>k==='b'?'Sei in B: imposta la posizione, poi punta il mirino sullo stesso punto C e premi.'
    :'Facoltativo: se da B vedi A, puntalo e premi. Con A→B e B→A il dislivello A–B è più preciso.',()=>{m4Render();},onCap,{go:3,text:'Vedi risultato',msg:'Direzione da B registrata.'});
  bindCam('m4a',()=>m4CamRender(0));bindCam('m4b',()=>m4CamRender(1));

  const setFmt=()=>{
    $$('.m4fmt',v).forEach(x=>{x.value=m4.fmt;});$$('.m4zone',v).forEach(x=>{x.value=m4.zone;});
    $$('.m4zone',v).forEach(x=>{x.hidden=m4.fmt!=='utm';});
    $$('.pcoord',v).forEach(x=>{x.placeholder=m4.fmt==='utm'?'291234 4640123':'41.8902, 12.4922';});
    [0,1].forEach(m4Write);
  };
  v.addEventListener('change',e=>{
    const t=e.target;
    if(t.classList.contains('m4fmt')){
      m4.fmt=t.value;
      if(m4.fmt==='utm'){const f=m4.pts.find(q=>q.ll);if(f){const z=utmZone(f.ll[1]);if(z>=31&&z<=35)m4.zone=z;}}
      setFmt();return;
    }
    if(t.classList.contains('m4zone')){m4.zone=parseInt(t.value,10);setFmt();return;}
    if(t.id==='m4-sig'){m4.sigma=parseFloat(t.value);m4Render();return;}
    if(t.classList.contains('pcoord')){
      const row=t.closest('.ptc'),i=+row.dataset.i,txt=t.value.trim();
      if(!txt){m4.pts[i].ll=null;m4.ui.removePoint(LET4[i]);m4Write(i);m4Render();return;}
      const ll=parseCoord(txt,m4.fmt,m4.zone);
      if(!ll){t.setAttribute('aria-invalid','true');$('.pinfo',row).textContent=m4.fmt==='utm'?'Formato non valido: scrivi Est e Nord, ad esempio 291234 4640123, e controlla il fuso.':'Formato non valido: scrivi latitudine e longitudine, ad esempio 41.8902, 12.4922.';return;}
      m4.pts[i].ll=ll;m4.ui.setPoint(LET4[i],ll);m4.ui.fit();m4Write(i);m4Render();
    }
  });
  v.addEventListener('input',e=>{
    if(e.target.classList.contains('pname')){m4.pts[+e.target.closest('.ptc').dataset.i].name=e.target.value.trim();m4.flows.forEach(f=>f.refresh());}
  });
  v.addEventListener('click',e=>{
    const t=e.target;
    if(t.closest('[data-m4gps]')){$('[data-act="gps"]',m4.ui.wrap).click();return;}
    const pm=t.closest('.pmap');
    if(pm){
      const i=+pm.closest('.ptc').dataset.i,slot=$('#m4-slot'+i);
      slot.hidden=false;placeMap(m4.ui,'m4-slot'+i);
      if(m4.ui.wrap.querySelector('[data-mode].on')===null||m4.ui.wrap.querySelector('[data-mode].on').dataset.mode!==LET4[i])m4.ui.setMode(LET4[i]);
      m4.ui.map.invalidateSize();m4.ui.wrap.scrollIntoView({block:'center',behavior:'smooth'});return;
    }
    if(t.closest('#m4-new')){m4.s.ea=m4.s.eb=m4.s.eab=m4.s.eba=null;m4.flows.forEach(f=>f.reset());m4.steps.go(1);}
    if(t.closest('#m4-copy')&&m4.sol&&m4.sol.ll)copyText(m4.sol.ll[0].toFixed(6)+', '+m4.sol.ll[1].toFixed(6));
  });
  m4.steps.go(1);
  m4Render();
}

/* ============================================================ */
/*  4 · Calcola area (foto e pianta)                            */
/* ============================================================ */
function initArea(){
const $ = id => root.querySelector('#ms-' + id);
const cv = $('cv'), ctx = cv.getContext('2d');

let mode = 'foto';
let img = null, surfaces = [], act = -1, tool = 'pan', pending = [];
let poly = [], closed = false, orto = true, snap = true, planH = 0, planInit = false;
let planView = 'bozza', sideVal = [], sideDx = [], sideDy = [], focusSide = -1, rot = 0;
const views = {foto:{s:1, x:0, y:0}, pianta:{s:60, x:0, y:0}};
let view = views.foto;
let dpr = window.devicePixelRatio || 1, CW = 0, CH = 0;
let unit = 'm', bootCm = 31, tpPerPasso = 2.5;
const UN = {m:'m', b:'tp', p:'passi'};
try {
  bootCm = parseFloat(localStorage.getItem('fireops_boot_cm')) || 31;
  tpPerPasso = parseFloat(localStorage.getItem('fireops_tp_passo')) || 2.5;
  const u = localStorage.getItem('fireops_unit'); unit = (u === 'b' || u === 'p') ? u : 'm';
} catch (e) {}
$('fBoot').value = bootCm; $('fPas').value = tpPerPasso; $('fUnit').value = unit;

const esc = t => t.replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const fmt = n => n.toLocaleString('it-IT', {minimumFractionDigits:2, maximumFractionDigits:2});
const num = t => parseFloat(String(t).replace(',', '.')) || 0;
const perUnit = () => unit === 'b' ? bootCm / 100 : unit === 'p' ? bootCm * tpPerPasso / 100 : 1;
const toDisp = m => { const v = m / perUnit(); return unit === 'm' ? Math.round(v * 1000) / 1000 : Math.round(v * 100) / 100; };
const fromDisp = v => v * perUnit();
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const cur = () => surfaces[act];
function lenTxt(m){
  let t = fmt(m) + ' m';
  if (unit !== 'm') t += ' · ' + (m / perUnit()).toLocaleString('it-IT', {maximumFractionDigits:1}) + ' ' + UN[unit];
  return t;
}

/* ---------- geometria ---------- */
function homography(src, dst){
  const A = [];
  for (let i = 0; i < 4; i++){
    const {x, y} = src[i], {x:u, y:v} = dst[i];
    A.push([x, y, 1, 0, 0, 0, -x*u, -y*u, u]);
    A.push([0, 0, 0, x, y, 1, -x*v, -y*v, v]);
  }
  for (let c = 0; c < 8; c++){
    let p = c;
    for (let r = c+1; r < 8; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
    if (Math.abs(A[p][c]) < 1e-12) return null;
    [A[c], A[p]] = [A[p], A[c]];
    for (let r = 0; r < 8; r++){
      if (r === c) continue;
      const f = A[r][c] / A[c][c];
      for (let k = c; k < 9; k++) A[r][k] -= f * A[c][k];
    }
  }
  return A.map((row, i) => row[8] / row[i]);
}
function mapPt(h, p){
  const d = h[6]*p.x + h[7]*p.y + 1;
  return {x:(h[0]*p.x + h[1]*p.y + h[2])/d, y:(h[3]*p.x + h[4]*p.y + h[5])/d};
}
function polyArea(pts){
  let a = 0;
  for (let i = 0; i < pts.length; i++){
    const p = pts[i], q = pts[(i+1) % pts.length];
    a += p.x*q.y - q.x*p.y;
  }
  return Math.abs(a) / 2;
}
function H(s){
  const w = +s.w, h = +s.h;
  if (!(w > 0 && h > 0)) return null;
  return homography(s.quad, [{x:0,y:0},{x:w,y:0},{x:w,y:h},{x:0,y:h}]);
}
function calc(s){
  const h = H(s);
  if (!h) return null;
  const gross = s.w * s.h;
  const cuts = s.cuts.map(c => polyArea(c.map(p => mapPt(h, p))));
  const cutSum = cuts.reduce((a, b) => a + b, 0);
  return {gross, cuts, cutSum, net: Math.max(0, gross - cutSum), h};
}

/* Ricostruzione della pianta: direzioni dalla bozza, lunghezze dalle misure.
   Lati senza misura: lunghezza della bozza per la scala media dei lati misurati.
   L'errore di chiusura è distribuito sui lati in proporzione alla lunghezza. */
function rebuild(){
  const n = poly.length;
  if (!closed || n < 3) return null;
  const o = planOrtho(poly, sideVal, sideDx, sideDy, perUnit());
  if (o) return o;
  const d = [], u = [];
  for (let i = 0; i < n; i++){
    const a = poly[i], b = poly[(i+1) % n], l = dist(a, b);
    d.push(l);
    u.push(l > 1e-9 ? {x:(b.x - a.x)/l, y:(b.y - a.y)/l} : {x:0, y:0});
  }
  const pu = perUnit();
  let sum = 0, cnt = 0;
  for (let i = 0; i < n; i++) if (sideVal[i] > 0 && d[i] > 1e-9){ sum += sideVal[i] * pu / d[i]; cnt++; }
  const k = cnt ? sum / cnt : 1;
  const meas = [], L = [];
  for (let i = 0; i < n; i++){
    const m = sideVal[i] > 0;
    meas.push(m);
    L.push(m ? sideVal[i] * pu : d[i] * k);
  }
  const P = [{x:0, y:0}];
  let x = 0, y = 0;
  for (let i = 0; i < n; i++){ x += L[i]*u[i].x; y += L[i]*u[i].y; P.push({x, y}); }
  const mis = P[n], tot = L.reduce((a, b) => a + b, 0);
  const pts = [];
  let cum = 0;
  for (let i = 0; i < n; i++){
    pts.push({x:P[i].x - mis.x*cum/tot, y:P[i].y - mis.y*cum/tot});
    cum += L[i];
  }
  return {ortho:false, pts, L, meas, flag:meas.map(m => m ? 'm' : 'e'), bad:[], need:n, given:cnt, cnt, mis:Math.hypot(mis.x, mis.y), tot};
}
function planStats(pts){
  const n = pts.length;
  let per = 0;
  for (let i = 0; i < n; i++) per += dist(pts[i], pts[(i+1) % n]);
  const area = polyArea(pts);
  return {area, per, h:planH, walls:per*planH, vol:area*planH};
}
const sideName = i => { const n = poly.length; return (i+1) + '-' + (((i+1) % n) + 1); };
const normDeg = a => { a = ((a + 180) % 360 + 360) % 360 - 180; return a === -180 ? 180 : a; };
/* Ruota la bozza attorno al suo baricentro (positivo = senso orario sullo schermo). Lunghezze e misure restano valide. */
function rotatePoly(deg){
  if (poly.length < 2 || !deg) return;
  const r = deg * Math.PI / 180, c = Math.cos(r), s = Math.sin(r);
  let cx = 0, cy = 0;
  poly.forEach(p => { cx += p.x; cy += p.y; });
  cx /= poly.length; cy /= poly.length;
  poly = poly.map(p => ({x: cx + (p.x - cx)*c - (p.y - cy)*s, y: cy + (p.x - cx)*s + (p.y - cy)*c}));
  rot = normDeg(rot + deg);
}
function applyRot(deg){ rotatePoly(deg); fitPlan(); ui(); draw(); }
const dispPts = () => { if (mode === 'pianta' && planView === 'misura'){ const r = rebuild(); if (r) return r.pts; } return poly; };

/* ---------- vista ---------- */
const toScr = p => ({x: p.x*view.s + view.x, y: p.y*view.s + view.y});
const toImg = p => ({x: (p.x - view.x)/view.s, y: (p.y - view.y)/view.s});
const lim = () => mode === 'foto' ? [0.05, 40] : [4, 800];
function fit(){
  if (!img || !CW) return;
  const s = Math.min(CW / img.width, CH / img.height);
  Object.assign(views.foto, {s, x:(CW - img.width*s)/2, y:(CH - img.height*s)/2});
}
function fitPlan(){
  const v = views.pianta, pts = dispPts();
  if (!pts.length){ Object.assign(v, {s:60, x:CW*0.12, y:CH*0.15}); return; }
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  pts.forEach(p => { x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y); });
  const w = Math.max(x1 - x0, 1) + 2, h = Math.max(y1 - y0, 1) + 2;
  const s = Math.min(800, Math.max(4, Math.min(CW / w, CH / h)));
  v.s = s; v.x = CW/2 - (x0 + x1)/2 * s; v.y = CH/2 - (y0 + y1)/2 * s;
}
function resize(){
  const r = cv.getBoundingClientRect();
  const first = CW === 0 && r.width > 0;
  CW = r.width; CH = r.height; dpr = window.devicePixelRatio || 1;
  cv.width = Math.round(CW*dpr); cv.height = Math.round(CH*dpr);
  if (first){ if (img) fit(); if (planInit) fitPlan(); }
  draw();
}
function zoomAt(f, cx = CW/2, cy = CH/2){
  const ip = toImg({x:cx, y:cy}), [lo, hi] = lim();
  view.s = Math.min(hi, Math.max(lo, view.s * f));
  view.x = cx - ip.x*view.s; view.y = cy - ip.y*view.s;
  draw();
}

/* ---------- disegno comune ---------- */
function path(pts, close){
  ctx.beginPath();
  pts.forEach((p, i) => { const q = toScr(p); i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y); });
  if (close) ctx.closePath();
}
function dot(p, label, color, big){
  const q = toScr(p);
  ctx.beginPath(); ctx.arc(q.x, q.y, big ? 11 : 8, 0, 6.2832);
  ctx.fillStyle = color; ctx.globalAlpha = .9; ctx.fill(); ctx.globalAlpha = 1;
  ctx.lineWidth = 2; ctx.strokeStyle = '#0c0e10'; ctx.stroke();
  if (label !== '' && label != null){
    ctx.fillStyle = '#0c0e10'; ctx.font = '700 11px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(label, q.x, q.y + .5);
  }
}
function chip(q, t, bg, fg){
  ctx.font = '700 13px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const w = ctx.measureText(t).width + 12;
  ctx.fillStyle = bg; ctx.fillRect(q.x - w/2, q.y - 12, w, 24);
  ctx.fillStyle = fg; ctx.fillText(t, q.x, q.y);
}
function draw(){
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, CW, CH);
  mode === 'foto' ? drawFoto() : drawPlan();
}

/* ---------- disegno foto ---------- */
function drawFoto(){
  if (!img) return;
  ctx.drawImage(img, view.x, view.y, img.width*view.s, img.height*view.s);
  surfaces.forEach((s, i) => {
    const on = i === act;
    path(s.quad, true);
    ctx.fillStyle = on ? 'rgba(47,158,91,.22)' : 'rgba(47,158,91,.12)';
    ctx.fill();
    ctx.lineWidth = on ? 2.5 : 1.5; ctx.strokeStyle = on ? '#3fd37b' : 'rgba(63,211,123,.6)'; ctx.stroke();
    if (!on){
      const c = toScr({x: s.quad.reduce((a,p)=>a+p.x,0)/4, y: s.quad.reduce((a,p)=>a+p.y,0)/4});
      ctx.fillStyle = '#fff'; ctx.font = '600 13px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(s.name, c.x, c.y);
      return;
    }
    s.quad.forEach((p, k) => dot(p, k+1, '#3fd37b', true));
    s.cuts.forEach(c => {
      path(c, true); ctx.fillStyle = 'rgba(255,183,3,.28)'; ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = '#ffb703'; ctx.stroke();
      c.forEach(p => dot(p, '', '#ffb703'));
    });
    const h = H(s);
    s.measures.forEach(m => {
      path([m.a, m.b], false); ctx.lineWidth = 2.5; ctx.strokeStyle = '#4cc9f0'; ctx.stroke();
      dot(m.a, '', '#4cc9f0'); dot(m.b, '', '#4cc9f0');
      if (h){
        const d = dist(mapPt(h, m.a), mapPt(h, m.b));
        chip(toScr({x:(m.a.x+m.b.x)/2, y:(m.a.y+m.b.y)/2}), lenTxt(d), 'rgba(6,34,43,.92)', '#4cc9f0');
      }
    });
  });
  const col = tool === 'cut' ? '#ffb703' : tool === 'dist' ? '#4cc9f0' : '#3fd37b';
  if (pending.length > 1){ path(pending, false); ctx.lineWidth = 2; ctx.strokeStyle = col; ctx.stroke(); }
  pending.forEach((p, k) => dot(p, tool === 'quad' ? k+1 : '', col, tool === 'quad'));
}

/* ---------- disegno pianta ---------- */
function gridStep(){
  const v = $('fStep').value;
  return v === 'boot' ? bootCm / 100 : parseFloat(v);
}
function drawGrid(){
  const tl = toImg({x:0, y:0}), br = toImg({x:CW, y:CH});
  let g = gridStep(); while (g * view.s < 14) g *= 2;
  const line = (step, color) => {
    ctx.beginPath();
    for (let i = Math.floor(tl.x/step); i * step <= br.x; i++){ const sx = Math.round(i*step*view.s + view.x) + .5; ctx.moveTo(sx, 0); ctx.lineTo(sx, CH); }
    for (let j = Math.floor(tl.y/step); j * step <= br.y; j++){ const sy = Math.round(j*step*view.s + view.y) + .5; ctx.moveTo(0, sy); ctx.lineTo(CW, sy); }
    ctx.lineWidth = 1; ctx.strokeStyle = color; ctx.stroke();
  };
  if (planView === 'bozza') line(g, 'rgba(255,255,255,.06)');
  let m = 1; while (m * view.s < 30) m *= 5;
  line(m, 'rgba(255,255,255,.16)');
}
function drawPlan(){
  drawGrid();
  if (planView === 'misura'){ const r = rebuild(); if (r) drawMisure(r); return; }
  const n = poly.length;
  if (!n) return;
  if (n >= 3 && closed){ path(poly, true); ctx.fillStyle = 'rgba(47,158,91,.24)'; ctx.fill(); }
  path(poly, closed);
  ctx.lineWidth = 2.5; ctx.strokeStyle = '#3fd37b'; ctx.stroke();
  if (!closed && n >= 3){
    ctx.save(); ctx.setLineDash([6, 6]); path([poly[n-1], poly[0]], false);
    ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(63,211,123,.55)'; ctx.stroke(); ctx.restore();
  }
  const edges = closed ? n : n - 1;
  for (let i = 0; i < edges; i++){
    const a = poly[i], b = poly[(i+1) % n];
    chip(toScr({x:(a.x+b.x)/2, y:(a.y+b.y)/2}), sideName(i), 'rgba(6,34,43,.92)', '#4cc9f0');
  }
  poly.forEach((p, i) => dot(p, i+1, (i === 0 && n >= 3 && !closed) ? '#ffd700' : '#3fd37b', true));
}
function drawMisure(r){
  const P = r.pts, n = P.length;
  path(P, true); ctx.fillStyle = 'rgba(47,158,91,.24)'; ctx.fill();
  ctx.lineWidth = 2.5; ctx.strokeStyle = '#3fd37b'; ctx.stroke();
  if (focusSide >= 0 && focusSide < n){
    const a = P[focusSide], b = P[(focusSide+1) % n];
    path([a, b], false);
    ctx.lineWidth = 6; ctx.strokeStyle = '#ffb703'; ctx.stroke();
    if (r.ortho && r.type[focusSide] === 'D'){      /* lato obliquo: mostro i due cateti */
      const dx = (b.x - a.x)*r.e.x + (b.y - a.y)*r.e.y, c = {x: a.x + dx*r.e.x, y: a.y + dx*r.e.y};
      ctx.save(); ctx.setLineDash([6, 5]); path([a, c, b], false);
      ctx.lineWidth = 2; ctx.strokeStyle = '#ffb703'; ctx.stroke(); ctx.restore();
    }
  }
  const FC = {m:'#4cc9f0', c:'#3fd37b', e:'#ffb703'};
  for (let i = 0; i < n; i++){
    const a = P[i], b = P[(i+1) % n];
    chip(toScr({x:(a.x+b.x)/2, y:(a.y+b.y)/2}), sideName(i) + ': ' + lenTxt(dist(a, b)), 'rgba(6,34,43,.92)', FC[r.flag[i]] || '#4cc9f0');
  }
  P.forEach((p, i) => dot(p, i+1, '#3fd37b', true));
}

/* ---------- interfaccia ---------- */
function hintText(){
  if (mode === 'pianta'){
    if (planView === 'misura'){
      const r = rebuild();
      if (!r) return '';
      return r.ortho ? `Servono ${r.need} misure, ne hai inserite ${r.given}. Blu misurati, verde calcolati, giallo stimati`
        : `Scrivi tacco-punta o passi per ogni lato (${r.cnt} di ${poly.length} misurati). I lati in giallo sono ancora stimati`;
    }
    if (!poly.length) return 'Bozza: tocca per segnare il primo vertice. La scala non conta, conta la forma';
    if (!closed && poly.length < 3) return 'Tocca il vertice successivo';
    if (!closed) return 'Aggiungi vertici, poi tocca il vertice 1 (giallo) o "Chiudi poligono"';
    return 'Bozza chiusa. Correggi i vertici trascinandoli, poi passa a "Misure"';
  }
  if (!img) return '';
  if (tool === 'quad'){
    const names = ['alto a sinistra','alto a destra','basso a destra','basso a sinistra'];
    return pending.length < 4 ? `Tocca lo spigolo ${pending.length+1} di 4: ${names[pending.length]}` : '';
  }
  if (tool === 'cut') return pending.length < 3 ? `Apertura: tocca i vertici (${pending.length}, minimo 3), poi "Chiudi apertura"` : 'Altri vertici, oppure "Chiudi apertura"';
  if (tool === 'dist') return pending.length ? 'Tocca il secondo punto' : 'Tocca il primo punto da misurare';
  if (!surfaces.length) return 'Premi "Nuova superficie" e segna i 4 spigoli';
  return 'Trascina un punto per correggerlo. Due dita: zoom e spostamento';
}
function unitLabels(){
  const u = UN[unit];
  $('lW').textContent = `Larghezza reale (${u})`;
  $('lH').textContent = `Altezza reale (${u})`;
  $('lLen').textContent = `Lunghezza lato (${u})`;
  $('bootLbl').hidden = unit === 'm';
  $('pasLbl').hidden = unit !== 'p';
  const conv = $('conv');
  if (unit === 'p') conv.textContent = `1 passo = ${fmt(bootCm * tpPerPasso / 100)} m`;
  else if (unit === 'b') conv.textContent = `1 tacco-punta = ${fmt(bootCm / 100)} m`;
  if (mode === 'foto' && act >= 0 && unit !== 'm') conv.textContent += ` · superficie ${fmt(cur().w)} × ${fmt(cur().h)} m`;
  conv.hidden = unit === 'm';
  root.querySelectorAll('#ms-sides [data-lab]').forEach(s => s.textContent = sideLabel(s.dataset.lab, +s.dataset.i));
}
function syncFields(){
  if (act >= 0){ $('fName').value = cur().name; $('fW').value = toDisp(cur().w); $('fH').value = toDisp(cur().h); }
  $('fPH').value = planH > 0 ? planH : '';
  unitLabels();
}
function sideLabel(kind, i){
  const u = UN[unit], nm = sideName(i);
  return kind === 'dx' ? `Cateto orizzontale (${u})` : kind === 'dy' ? `Cateto verticale (${u})`
    : kind === 'diag' ? `Diagonale ${nm} (${u})` : `Lato ${nm} (${u})`;
}
function buildSides(){
  const box = $('sides'); box.innerHTML = '';
  const o = planOrtho(poly, [], [], [], 1);
  const need = document.createElement('div'); need.className = 'ms-need'; need.id = 'ms-need'; box.appendChild(need);
  const mk = (kind, i, arr, parent) => {
    const l = document.createElement('label');
    const sp = document.createElement('span'); sp.dataset.lab = kind; sp.dataset.i = i; sp.textContent = sideLabel(kind, i);
    const inp = document.createElement('input');
    inp.type = 'number'; inp.inputMode = 'decimal'; inp.step = 'any'; inp.min = '0'; inp.placeholder = 'da misurare';
    inp.dataset.kind = kind; inp.dataset.i = i;
    inp.value = arr[i] > 0 ? arr[i] : '';
    inp.oninput = () => { arr[i] = num(inp.value); results(); ui(true); draw(); };
    inp.onfocus = () => { focusSide = i; draw(); };
    inp.onblur = () => { focusSide = -1; draw(); };
    l.appendChild(sp); l.appendChild(inp); parent.appendChild(l);
  };
  poly.forEach((_, i) => {
    if (o && o.type[i] === 'D'){
      const g = document.createElement('div'); g.className = 'ms-dgrp';
      const h = document.createElement('div'); h.className = 'ms-dh'; h.textContent = `Lato obliquo ${sideName(i)}: bastano 2 misure su 3 (diagonale e altezza, oppure i due cateti)`;
      g.appendChild(h);
      mk('diag', i, sideVal, g); mk('dx', i, sideDx, g); mk('dy', i, sideDy, g);
      box.appendChild(g);
    } else mk('len', i, sideVal, box);
  });
  refreshSides();
}
/* testo di stato e valori calcolati nei campi: solo le misure necessarie restano "da misurare" */
function refreshSides(){
  if (mode !== 'pianta' || planView !== 'misura') return;
  const r = rebuild(), nd = $('need');
  if (!r || !nd) return;
  nd.textContent = r.ortho
    ? `Angoli retti rilevati: bastano ${r.need} misure (inserite ${r.given}).` + (r.sufficient ? ' Misure sufficienti: il resto è calcolato.' : '')
    : 'Nessun angolo retto nella bozza: misura tutti i lati.';
  const pu = perUnit();
  root.querySelectorAll('#ms-sides input').forEach(inp => {
    const i = +inp.dataset.i, k = inp.dataset.kind;
    let ph = 'da misurare', calc = false;
    if (r.ortho && r.flag[i] !== 'e'){
      const v = k === 'dx' ? r.dxv[i] : k === 'dy' ? r.dyv[i] : k === 'diag' ? r.L[i] : (r.type[i] === 'V' ? r.dyv[i] : r.dxv[i]);
      ph = '≈ ' + fmt(v / pu) + ' calcolato'; calc = true;
    }
    inp.placeholder = ph;
    inp.parentNode.classList.toggle('calc', calc && inp.value === '');
  });
}
function structureChanged(){ sideVal = []; sideDx = []; sideDy = []; planView = 'bozza'; focusSide = -1; }
function setPlanView(v){
  if (v === 'misura' && !(closed && poly.length >= 3)) return;
  planView = v;
  if (v === 'misura') buildSides();
  fitPlan(); ui(); draw();
}
function ui(soft){
  const foto = mode === 'foto', has = act >= 0;
  $('tFoto').classList.toggle('on', foto); $('tPianta').classList.toggle('on', !foto);
  $('pFoto').hidden = !foto; $('pPianta').hidden = foto;
  $('noteFoto').hidden = !foto; $('notePianta').hidden = foto;
  $('empty').hidden = !foto || !!img;
  $('unitRow').hidden = foto ? !has : false;
  if (foto){
    $('bNew').disabled = !img;
    $('bCut').disabled = !has; $('bDist').disabled = !has;
    $('bClose').hidden = !(tool === 'cut' && pending.length >= 3);
    $('bUndo').disabled = !(pending.length || (has && (cur().cuts.length || cur().measures.length)));
    $('bCut').classList.toggle('on', tool === 'cut');
    $('bDist').classList.toggle('on', tool === 'dist');
    $('bNew').classList.toggle('on', tool === 'quad');
    $('fields').hidden = !has;
    $('bDel').hidden = !has;
    $('bCopy').disabled = $('bCsv').disabled = !surfaces.length;
    const chips = $('chips'); chips.innerHTML = '';
    surfaces.forEach((s, i) => {
      const b = document.createElement('button');
      b.textContent = s.name; if (i === act) b.classList.add('on');
      b.onclick = () => { act = i; tool = 'pan'; pending = []; syncFields(); ui(); draw(); };
      chips.appendChild(b);
    });
  } else {
    const okPlan = closed && poly.length >= 3;
    $('sBozza').classList.toggle('on', planView === 'bozza');
    $('sMisure').classList.toggle('on', planView === 'misura');
    $('sBozza').classList.toggle('done', planView === 'misura');
    $('stlabel').textContent = planView === 'misura' ? 'Fase 2 di 2 · Misure dei lati' : 'Fase 1 di 2 · Bozza della pianta';
    $('sMisure').disabled = !okPlan;
    $('pBozza').hidden = planView !== 'bozza'; $('pMisure').hidden = planView !== 'misura';
    $('bOrto').classList.toggle('on', orto); $('bOrto').setAttribute('aria-pressed', orto);
    $('bSnap').classList.toggle('on', snap); $('bSnap').setAttribute('aria-pressed', snap);
    $('bPClose').hidden = !(poly.length >= 3 && !closed);
    $('bPUndo').disabled = !poly.length;
    $('bPNew').disabled = !poly.length;
    $('rotBox').hidden = poly.length < 2;
    $('rot').value = Math.round(rot); $('rotv').textContent = (rot > 0 ? '+' : '') + Math.round(rot) + '°';
    $('dL').disabled = $('dU').disabled = $('dD').disabled = $('dR').disabled = closed;
    $('bDel').hidden = true;
    $('bCopy').disabled = $('bCsv').disabled = !(planView === 'misura' && okPlan);
  }
  const hint = $('hint'), t = hintText();
  hint.hidden = !t; hint.textContent = t;
  syncSticky();
  results();
}
/* in Misure la pianta resta visibile sotto l'intestazione mentre si scorrono i campi */
function syncSticky(){
  const stk = mode === 'pianta' && planView === 'misura', st = $('stage');
  if (st.classList.contains('stk') === stk) return;
  st.classList.toggle('stk', stk);
  const hd = document.querySelector('.foh');
  st.style.top = stk ? ((hd ? hd.offsetHeight : 0) + 'px') : '';
  requestAnimationFrame(() => { resize(); if (mode === 'pianta') fitPlan(); draw(); });
}
function results(){
  const box = $('res');
  if (mode === 'pianta'){
    const r = planView === 'misura' ? rebuild() : null;
    if (!r){ box.innerHTML = ''; return; }
    const st = planStats(r.pts), pct = r.tot > 0 ? r.mis / r.tot * 100 : 0;
    let html = `<table><tr class="ms-tot"><td>Area del pavimento</td><td>${fmt(st.area)} m²</td></tr>
      <tr><td>Perimetro</td><td>${fmt(st.per)} m</td></tr>
      <tr><td>Errore di chiusura (compensato)</td><td>${fmt(r.mis)} m · ${fmt(pct)}%</td></tr>${Math.abs(rot) > .05 ? `<tr><td>Rotazione della pianta</td><td>${rot > 0 ? '+' : ''}${rot.toLocaleString('it-IT', {maximumFractionDigits:1})}° (senso orario +)</td></tr>` : ''}`;
    if (st.h > 0) html += `<tr><td>Pareti (lorde, h ${fmt(st.h)} m)</td><td>${fmt(st.walls)} m²</td></tr>
      <tr><td>Volume</td><td>${fmt(st.vol)} m³</td></tr>`;
    html += '</table>';
    if (r.ortho && r.bad.some(Boolean)) html += `<p class="ms-note ms-warn">Misure incoerenti: il lato ${sideName(r.bad.indexOf(true))} risulterebbe negativo. Ricontrolla le misure inserite.</p>`;
    else if (r.ortho && !r.sufficient) html += `<p class="ms-note ms-warn">Servono ${r.need} misure, ne hai inserite ${r.given}: i lati in giallo sono stimati dalla bozza.</p>`;
    else if (!r.ortho && r.cnt < poly.length) html += `<p class="ms-note ms-warn">${r.cnt} lati su ${poly.length} misurati: gli altri sono stimati dalla bozza.</p>`;
    else if (pct > 5) html += '<p class="ms-note ms-warn">Errore di chiusura sopra il 5%: ricontrolla i conteggi dei lati.</p>';
    box.innerHTML = html; refreshSides(); return;
  }
  if (!surfaces.length){ box.innerHTML = ''; return; }
  let html = '', tot = 0;
  surfaces.forEach((s, i) => {
    const r = calc(s);
    if (i === act && r){
      html += `<table><tr><td>${esc(s.name)} · area lorda</td><td>${fmt(r.gross)} m²</td></tr>`;
      r.cuts.forEach((a, k) => html += `<tr><td>Apertura ${k+1}</td><td>− ${fmt(a)} m²</td></tr>`);
      html += `<tr><td>Area netta</td><td>${fmt(r.net)} m²</td></tr></table>`;
    }
    if (r) tot += r.net;
  });
  html += `<table><tr class="ms-tot"><td>Totale superfici (${surfaces.length})</td><td>${fmt(tot)} m²</td></tr></table>`;
  box.innerHTML = html;
}
function setTool(t){ tool = t; pending = []; ui(); draw(); }
function setMode(m){
  if (m === mode) return;
  mode = m; view = views[m]; pending = []; tool = 'pan';
  if (m === 'pianta' && !planInit){ planInit = true; fitPlan(); }
  syncFields(); ui(); draw();
}

/* ---------- pulsanti: comuni ---------- */
function showMapTab(on){
  $('stage').hidden = on; $('panel').hidden = on; $('mapView').hidden = !on;
  $('tMappa').classList.toggle('on', on);
  if (on){ $('tFoto').classList.remove('on'); $('tPianta').classList.remove('on'); amOpen(); }
  else { ui(); resize(); draw(); }
}
$('tFoto').onclick = () => { showMapTab(false); setMode('foto'); };
$('tPianta').onclick = () => { showMapTab(false); setMode('pianta'); };
$('tMappa').onclick = () => showMapTab(true);
$('zin').onclick = () => zoomAt(1.4);
$('zout').onclick = () => zoomAt(1/1.4);
$('zfit').onclick = () => { mode === 'foto' ? fit() : fitPlan(); draw(); };
$('fUnit').onchange = e => {
  unit = e.target.value;
  try { localStorage.setItem('fireops_unit', unit); } catch (err) {}
  syncFields(); ui(); draw();
};
function saveConv(){
  try { localStorage.setItem('fireops_boot_cm', String(bootCm)); localStorage.setItem('fireops_tp_passo', String(tpPerPasso)); } catch (err) {}
  if (unit !== 'm' && act >= 0){ cur().w = fromDisp(num($('fW').value)); cur().h = fromDisp(num($('fH').value)); }
  unitLabels(); ui(); draw();
}
$('fBoot').oninput = e => { const v = num(e.target.value); if (v < 10 || v > 60) return; bootCm = v; saveConv(); };
$('fPas').oninput = e => { const v = num(e.target.value); if (v < 1 || v > 6) return; tpPerPasso = v; saveConv(); };
function flash(b, t){ const o = b.textContent; b.textContent = t; setTimeout(() => b.textContent = o, 1200); }
function summary(){
  if (mode === 'pianta'){
    const r = rebuild(); if (!r) return '';
    const st = planStats(r.pts);
    const l = ['FireOps · Pianta del locale', '',
      `Area pavimento: ${fmt(st.area)} m²`, `Perimetro: ${fmt(st.per)} m`,
      `Errore di chiusura: ${fmt(r.mis)} m (compensato)`];
    if (Math.abs(rot) > .05) l.push(`Rotazione della pianta: ${Math.round(rot)}° (senso orario +)`);
    if (st.h > 0) l.push(`Altezza: ${fmt(st.h)} m`, `Pareti (lorde): ${fmt(st.walls)} m²`, `Volume: ${fmt(st.vol)} m³`);
    l.push('', 'Lati:');
    r.L.forEach((m, i) => l.push(`${sideName(i)}: ${r.ortho ? (r.flag[i] === 'm' ? 'misurato ' : r.flag[i] === 'c' ? 'calcolato ' : 'stimato ') : (r.meas[i] ? sideVal[i] + ' ' + UN[unit] + ' = ' : 'stimato ')}${fmt(m)} m`));
    return l.join('\n');
  }
  let tot = 0;
  const lines = ['FireOps · Misura superfici', ''];
  surfaces.forEach(s => {
    const r = calc(s); if (!r) return;
    tot += r.net;
    lines.push(`${s.name}: ${fmt(s.w)} x ${fmt(s.h)} m = ${fmt(r.gross)} m²` + (r.cutSum ? `, aperture − ${fmt(r.cutSum)} m², netta ${fmt(r.net)} m²` : ''));
  });
  lines.push('', `Totale netto: ${fmt(tot)} m²`);
  return lines.join('\n');
}
$('bCopy').onclick = async () => {
  const t = summary();
  try { await navigator.clipboard.writeText(t); flash($('bCopy'), 'Copiato'); }
  catch { const a = document.createElement('textarea'); a.value = t; document.body.appendChild(a); a.select();
    try { document.execCommand('copy'); flash($('bCopy'), 'Copiato'); } catch { prompt('Copia il riepilogo:', t); } a.remove(); }
};
$('bCsv').onclick = () => {
  let rows;
  if (mode === 'pianta'){
    const r = rebuild(); if (!r) return;
    const st = planStats(r.pts);
    rows = [['Lato','Valore inserito','Unita','Lunghezza usata m']];
    r.L.forEach((m, i) => rows.push([sideName(i), sideVal[i] > 0 ? sideVal[i] : '', r.ortho ? (r.flag[i] === 'm' ? UN[unit] : r.flag[i] === 'c' ? 'calcolato' : 'stimato') : (r.meas[i] ? UN[unit] : 'stimato'), m.toFixed(3)]));
    rows.push([], ['Vertice','X m','Y m']);
    r.pts.forEach((p, i) => rows.push([i+1, p.x.toFixed(3), p.y.toFixed(3)]));
    rows.push([], ['Area pavimento m2', st.area.toFixed(2)], ['Perimetro m', st.per.toFixed(2)],
      ['Errore di chiusura m', r.mis.toFixed(3)], ['Rotazione gradi', rot.toFixed(1)], ['Altezza m', st.h.toFixed(2)],
      ['Pareti lorde m2', st.walls.toFixed(2)], ['Volume m3', st.vol.toFixed(2)]);
  } else {
    rows = [['Nome','Larghezza m','Altezza m','Area lorda m2','Aperture m2','Area netta m2']];
    surfaces.forEach(s => { const r = calc(s); if (r) rows.push([s.name, s.w.toFixed(2), s.h.toFixed(2), r.gross.toFixed(2), r.cutSum.toFixed(2), r.net.toFixed(2)]); });
  }
  const csv = rows.map(r => r.map(v => '"' + String(v).replace(/"/g, '""') + '"').join(';')).join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob(['\ufeff' + csv], {type:'text/csv'}));
  a.download = mode === 'pianta' ? 'pianta.csv' : 'superfici.csv'; a.click();
};

/* ---------- pulsanti: foto ---------- */
$('file').onchange = $('cam').onchange = e => {
  const f = e.target.files[0]; if (!f) return;
  const im = new Image();
  im.onload = () => {
    img = im; surfaces = []; act = -1; tool = 'pan'; pending = [];
    if (mode !== 'foto'){ mode = 'foto'; view = views.foto; }
    resize(); fit(); syncFields(); ui(); draw();
  };
  im.src = URL.createObjectURL(f);
  e.target.value = '';
};
$('bNew').onclick = () => setTool(tool === 'quad' ? 'pan' : 'quad');
$('bCut').onclick = () => setTool(tool === 'cut' ? 'pan' : 'cut');
$('bDist').onclick = () => setTool(tool === 'dist' ? 'pan' : 'dist');
$('bClose').onclick = () => {
  if (pending.length >= 3){ cur().cuts.push(pending.slice()); pending = []; tool = 'pan'; ui(); draw(); }
};
$('bUndo').onclick = () => {
  if (pending.length) pending.pop();
  else if (act >= 0){
    const s = cur();
    if (tool === 'dist' && s.measures.length) s.measures.pop();
    else if (s.cuts.length) s.cuts.pop();
    else s.measures.pop();
  }
  ui(); draw();
};
$('bDel').onclick = () => {
  if (act < 0 || !confirm('Eliminare "' + cur().name + '"?')) return;
  surfaces.splice(act, 1); act = surfaces.length - 1; tool = 'pan'; pending = [];
  syncFields(); ui(); draw();
};
$('fName').oninput = e => { cur().name = e.target.value || 'Superficie'; ui(); draw(); };
$('fW').oninput = e => { cur().w = fromDisp(num(e.target.value)); unitLabels(); results(); draw(); };
$('fH').oninput = e => { cur().h = fromDisp(num(e.target.value)); unitLabels(); results(); draw(); };

/* ---------- pulsanti: pianta ---------- */
$('sBozza').onclick = () => setPlanView('bozza');
$('sMisure').onclick = () => setPlanView('misura');
$('bOrto').onclick = () => { orto = !orto; ui(); };
$('bSnap').onclick = () => { snap = !snap; ui(); };
$('fStep').onchange = () => draw();
$('fPH').oninput = e => { planH = num(e.target.value); results(); };
$('bPClose').onclick = () => { if (poly.length >= 3){ closed = true; ui(); draw(); } };
$('bPUndo').onclick = () => {
  if (closed) closed = false; else poly.pop();
  if (!poly.length) rot = 0;
  structureChanged(); ui(); draw();
};
$('bPNew').onclick = () => {
  if (poly.length >= 3 && !confirm('Cancellare la pianta disegnata?')) return;
  poly = []; closed = false; rot = 0; structureChanged(); fitPlan(); ui(); draw();
};
function addSide(dx, dy){
  if (closed) return;
  const len = fromDisp(num($('fLen').value));
  if (!(len > 0)){ $('fLen').focus(); return; }
  if (!poly.length) poly.push({x:0, y:0});
  const l = poly[poly.length - 1];
  poly.push({x:l.x + dx*len, y:l.y + dy*len});
  structureChanged(); fitPlan(); ui(); draw();
}
$('rotL').onclick = () => applyRot(-90);
$('rotR').onclick = () => applyRot(90);
$('rotZ').onclick = () => applyRot(-rot);
$('rotAl').onclick = () => { if (poly.length >= 2) applyRot(-Math.atan2(poly[1].y - poly[0].y, poly[1].x - poly[0].x) * 180 / Math.PI); };
$('rot').oninput = e => applyRot(parseFloat(e.target.value) - rot);
$('dL').onclick = () => addSide(-1, 0);
$('dR').onclick = () => addSide(1, 0);
$('dU').onclick = () => addSide(0, -1);
$('dD').onclick = () => addSide(0, 1);

/* ---------- puntatore: tocco, trascinamento, pinch ---------- */
const ptrs = new Map();
let drag = null, pinch = null, moved = false, downAt = null, downHit = null, wasPinch = false;
function pos(e){ const r = cv.getBoundingClientRect(); return {x:e.clientX - r.left, y:e.clientY - r.top}; }
function hit(sp){
  const cands = [];
  if (mode === 'pianta'){
    if (planView !== 'bozza') return null;
    poly.forEach((p, i) => cands.push({p, i}));
  } else {
    if (act < 0 || tool !== 'pan') return null;
    const s = cur();
    s.quad.forEach((p, i) => cands.push({p, ref:s.quad, i}));
    s.cuts.forEach(c => c.forEach((p, i) => cands.push({p, ref:c, i})));
    s.measures.forEach(m => { cands.push({p:m.a, ref:m, i:'a'}); cands.push({p:m.b, ref:m, i:'b'}); });
  }
  let best = null, bd = 26;
  cands.forEach(c => { const q = toScr(c.p), d = Math.hypot(q.x - sp.x, q.y - sp.y); if (d < bd){ bd = d; best = c; } });
  return best;
}
cv.addEventListener('pointerdown', e => {
  if (mode === 'foto' && !img) return;
  cv.setPointerCapture(e.pointerId);
  const p = pos(e); ptrs.set(e.pointerId, p);
  if (ptrs.size === 2){
    const [a, b] = [...ptrs.values()];
    pinch = {d:Math.hypot(a.x-b.x, a.y-b.y), s:view.s, ip:toImg({x:(a.x+b.x)/2, y:(a.y+b.y)/2})};
    drag = null; wasPinch = true; return;
  }
  wasPinch = false; moved = false; downAt = p;
  downHit = hit(p);
  drag = downHit ? {type:'handle', h:downHit} : {type:'pan', ox:view.x, oy:view.y};
});
cv.addEventListener('pointermove', e => {
  if (!ptrs.has(e.pointerId)) return;
  const p = pos(e); ptrs.set(e.pointerId, p);
  if (ptrs.size === 2 && pinch){
    const [a, b] = [...ptrs.values()], [lo, hi] = lim();
    const mid = {x:(a.x+b.x)/2, y:(a.y+b.y)/2}, d = Math.hypot(a.x-b.x, a.y-b.y);
    view.s = Math.min(hi, Math.max(lo, pinch.s * d / pinch.d));
    view.x = mid.x - pinch.ip.x*view.s; view.y = mid.y - pinch.ip.y*view.s;
    draw(); return;
  }
  if (!drag) return;
  const dx = p.x - downAt.x, dy = p.y - downAt.y;
  if (Math.hypot(dx, dy) > 6) moved = true;
  if (!moved) return;
  if (drag.type === 'pan'){ view.x = drag.ox + dx; view.y = drag.oy + dy; }
  else if (mode === 'pianta'){
    poly[drag.h.i] = planDragPoint(p, drag.h.i);
  } else {
    const ip = toImg(p), h = drag.h;
    if (h.ref.a && h.i === 'a') h.ref.a = ip;
    else if (h.ref.b && h.i === 'b') h.ref.b = ip;
    else h.ref[h.i] = ip;
    results();
  }
  draw();
});
function endPtr(e){
  const had = ptrs.has(e.pointerId);
  ptrs.delete(e.pointerId);
  if (ptrs.size < 2) pinch = null;
  if (!had) return;
  if (ptrs.size === 0 && drag && !moved && !wasPinch) tap(downAt, downHit);
  if (ptrs.size === 0) drag = null;
}
cv.addEventListener('pointerup', endPtr);
cv.addEventListener('pointercancel', endPtr);
cv.addEventListener('wheel', e => { e.preventDefault(); const p = pos(e); zoomAt(e.deltaY < 0 ? 1.15 : 1/1.15, p.x, p.y); }, {passive:false});

/* ---------- tocco ---------- */
function inImg(p){ return p.x >= 0 && p.y >= 0 && p.x <= img.width && p.y <= img.height; }
function tap(sp, h){
  if (mode === 'pianta') return planTap(sp, h);
  const ip = toImg(sp);
  if (tool === 'quad'){
    if (!inImg(ip)) return;
    pending.push(ip);
    if (pending.length === 4){
      surfaces.push({name:'Superficie ' + (surfaces.length + 1), quad:pending.slice(), w:3, h:2.7, cuts:[], measures:[]});
      act = surfaces.length - 1; pending = []; tool = 'pan'; syncFields();
    }
  } else if (tool === 'cut'){
    if (inImg(ip)) pending.push(ip);
  } else if (tool === 'dist'){
    if (!inImg(ip)) return;
    pending.push(ip);
    if (pending.length === 2){ cur().measures.push({a:pending[0], b:pending[1]}); pending = []; }
  }
  ui(); draw();
}

/* ---------- pianta: Orto e Snap ---------- */
function snapGrid(v){ const g = gridStep(); return Math.round(v / g) * g; }
function snapVertex(p, sp, skip){
  for (let i = 0; i < poly.length; i++){
    if (i === skip) continue;
    const q = toScr(poly[i]);
    if (Math.hypot(q.x - sp.x, q.y - sp.y) < 16) return {x:poly[i].x, y:poly[i].y};
  }
  return null;
}
function planPoint(sp){
  let p = toImg(sp);
  const last = poly.length && !closed ? poly[poly.length - 1] : null;
  if (snap){ const v = snapVertex(p, sp, -1); if (v) return v; }
  if (orto && last){
    if (Math.abs(p.x - last.x) >= Math.abs(p.y - last.y)){ p = {x: snap ? snapGrid(p.x) : p.x, y:last.y}; }
    else { p = {x:last.x, y: snap ? snapGrid(p.y) : p.y}; }
  } else if (snap){
    p = {x:snapGrid(p.x), y:snapGrid(p.y)};
  }
  return p;
}
function planDragPoint(sp, i){
  let p = toImg(sp);
  if (snap){
    const v = snapVertex(p, sp, i); if (v) return v;
    p = {x:snapGrid(p.x), y:snapGrid(p.y)};
  }
  return p;
}
function planTap(sp, h){
  if (closed || planView !== 'bozza') return;
  if (h){
    if (h.i === 0 && poly.length >= 3){ closed = true; ui(); draw(); }
    return;
  }
  poly.push(planPoint(sp));
  structureChanged();
  ui(); draw();
}

window.addEventListener('resize', resize);
if (window.ResizeObserver) new ResizeObserver(() => resize()).observe($('stage'));
resize(); syncFields(); ui();
return {show(){ resize(); }};
}


/* ============================================================ */
/*  Calcola area · scheda Mappa                                 */
/* ============================================================ */
const am={ui:null,pts:[],mk:[],shape:null,ready:false};
function amMarker(i){
  const m=L.marker(am.pts[i],{draggable:true,icon:L.divIcon({className:'',html:'<div class="am-v">'+(i+1)+'</div>',iconSize:[24,24],iconAnchor:[12,12]})}).addTo(am.ui.group);
  m.on('drag',()=>{const q=m.getLatLng();am.pts[i]=[q.lat,q.lng];amRender();});
  am.mk[i]=m;
}
function amAdd(ll,center){
  am.pts.push(ll);amMarker(am.pts.length-1);
  if(center)am.ui.map.setView(ll,Math.max(17,typeof am.ui.map.getZoom==='function'?am.ui.map.getZoom():17));
  amRender();
}
function amSummary(M){
  const ha=M.area>=10000?' ('+fmt(M.area/10000,2)+' ha)':'';
  return 'Area: '+fmt(M.area,M.area<100?2:0)+' m²'+ha+'\nPerimetro: '+fmt(M.perim,0)+' m\nVertici: '+M.n+(M.centroid?'\nCentro: '+M.centroid[0].toFixed(6)+', '+M.centroid[1].toFixed(6):'')+'\nLati: '+M.sides.map(x=>fmt(x,1)+' m').join(' · ');
}
function amRender(){
  const res=$('#am-res'),n=am.pts.length;
  if(am.shape)am.shape.clearLayers();
  const M=n>=2?polyAreaLL(am.pts):null;
  if(M&&am.shape){
    if(M.closed)L.polygon(am.pts,{color:M.selfInt?'#d8262f':'#2fd36b',weight:2,fillColor:M.selfInt?'#d8262f':'#2fd36b',fillOpacity:.2}).addTo(am.shape);
    else L.polyline(am.pts,{color:'#2fd36b',weight:2}).addTo(am.shape);
    M.sides.forEach((d,i)=>{
      const a=am.pts[i],b=am.pts[(i+1)%n];
      L.marker([(a[0]+b[0])/2,(a[1]+b[1])/2],{interactive:false,icon:L.divIcon({className:'',html:'<span class="am-l">'+fmt(d,d<10?1:0)+' m</span>',iconSize:[0,0]})}).addTo(am.shape);
    });
  }
  $('#am-undo').disabled=!n;$('#am-clear').disabled=!n;
  if(!M){res.innerHTML='<div class="note">'+(n?'Aggiungi altri vertici: servono almeno 3 punti.':'Tocca la mappa per segnare i vertici del perimetro, o aggiungili con il GPS o per coordinate.')+'</div>';return;}
  if(!M.closed){res.innerHTML='<div class="card"><dl class="kv"><dt>Lunghezza</dt><dd>'+fmt(M.perim,0)+' m</dd><dt>Vertici</dt><dd>'+n+'</dd></dl></div><div class="note">Servono almeno 3 vertici per calcolare l’area.</div>';return;}
  const ha=M.area>=10000?'<dt>Ettari</dt><dd>'+fmt(M.area/10000,2)+' ha</dd>':'';
  res.innerHTML=`<div class="card">
    <div class="big-l">Area</div>
    <div class="coords">${fmt(M.area,M.area<100?2:0)} m²</div>
    <dl class="kv">${ha}<dt>Perimetro</dt><dd>${fmt(M.perim,0)} m</dd><dt>Vertici</dt><dd>${M.n}</dd>
      <dt>Centro</dt><dd>${M.centroid[0].toFixed(6)}, ${M.centroid[1].toFixed(6)}</dd></dl>
    ${M.selfInt?'<div class="note warn">Due lati si incrociano: l’area non è affidabile. Sposta o annulla i vertici fino a ottenere un perimetro senza incroci.</div>':''}
    <p class="sub">Calcolo su proiezione locale: errore trascurabile sotto i 10 km. La precisione dipende da quella dei vertici (GPS circa 3–10 m, mappa a seconda dello zoom).</p>
  </div>
  <div class="row"><button type="button" class="btn" id="am-copy">Copia riepilogo</button><button type="button" class="btn" id="am-geo">Esporta GeoJSON</button></div>`;
}
async function amOpen(){
  if(am.ready){setTimeout(()=>{am.ui.map.invalidateSize();},60);return;}
  am.ready=true;
  if(typeof window.L==='undefined'){
    toast('Caricamento mappa…');
    const ok=await Promise.race([FireOps.leaflet(),new Promise(r=>setTimeout(()=>r(false),7000))]);
    if(!ok)toast('Mappa non disponibile: aggiungi i vertici con il GPS o per coordinate.');
  }
  root.classList.toggle('tg-offline',typeof window.L==='undefined');
  am.ui=createMapUI({
    modes:[{key:'P',label:'Aggiungi punti'}],
    multi:true,gpsKey:'P',gpsLabel:'Aggiungi la mia posizione',pins:{},
    hints:{P:'Tocca la mappa per aggiungere un vertice. Trascina i vertici per correggerli.'},
    idleHint:'Attiva “Aggiungi punti” e tocca i vertici del perimetro.',
    onMapClick:(k,ll)=>amAdd(ll,false),
    onChange:(k,ll,src)=>{if(src==='gps')amAdd(ll,false);}
  },$('#am-slot'));
  am.shape=L.layerGroup().addTo(am.ui.map);
  am.ui.setMode('P');
  const v=$('#ms-mapView');
  $('#am-addc').onclick=()=>{
    const inp=$('#am-coord'),ll=parseCoord(inp.value.trim(),'dd',32);
    if(!ll){inp.setAttribute('aria-invalid','true');toast('Coordinate non valide: scrivi latitudine e longitudine, ad esempio 41.8902, 12.4922.');return;}
    inp.removeAttribute('aria-invalid');inp.value='';amAdd(ll,true);
  };
  $('#am-undo').onclick=()=>{if(!am.pts.length)return;am.pts.pop();const m=am.mk.pop();if(m)am.ui.group.removeLayer(m);amRender();};
  $('#am-clear').onclick=()=>{am.pts=[];am.mk=[];am.ui.group.clearLayers();amRender();};
  v.addEventListener('click',e=>{
    const M=am.pts.length>=3?polyAreaLL(am.pts):null;if(!M)return;
    if(e.target.closest('#am-copy'))copyText(amSummary(M));
    if(e.target.closest('#am-geo')){
      const ring=am.pts.map(q=>[+q[1].toFixed(7),+q[0].toFixed(7)]);ring.push(ring[0]);
      download(JSON.stringify({type:'Feature',properties:{area_m2:+M.area.toFixed(1),perimetro_m:+M.perim.toFixed(1)},geometry:{type:'Polygon',coordinates:[ring]}}),'area-'+stamp()+'.geojson','application/geo+json');
    }
  });
  amRender();
}

/* ============================================================ */
/*  Navigazione interna: #/trigo, #/trigo/altezza, ...          */
/* ============================================================ */
const VIEWS={
  home:{title:''},
  altezza:{title:'Altezza e area di proiezione',init:initM1,mod:m1},
  faro:{title:'Problema del faro',init:initM2,mod:m2},
  snellius:{title:'Intersezione all’indietro',init:initM3,mod:m3},
  avanti:{title:'Intersezione in avanti',init:initM4,mod:m4},
  area:{title:'Calcola area',init:initArea}
};
let curView='home';
function collapseMaps(){[m1,m2,m3,m4].forEach(m=>{if(m.ui&&m.ui.wrap.classList.contains('expanded'))m.ui.expand(false);});}
async function go(name){
  if(!VIEWS[name])name='home';
  const o=VIEWS[name];
  Sensors.stop();collapseMaps();
  $$('.cam-start').forEach(e=>{e.hidden=false;});
  if(o.mod&&typeof window.L==='undefined'){
    toast('Caricamento mappa…');
    const ok=await Promise.race([FireOps.leaflet(),new Promise(r=>setTimeout(()=>r(false),7000))]);
    if(!ok)toast('Mappa non disponibile: uso la modalità senza mappa.');
  }
  root.classList.toggle('tg-offline',typeof window.L==='undefined');
  Object.keys(VIEWS).forEach(n=>{$('#tg-'+n).hidden=n!==name;});
  $('#tg-nav').hidden=name==='home';
  $('#tg-navt').textContent=o.title;
  curView=name;
  if(o.init&&!o.ready){o.api=o.init();o.ready=true;}
  else if(o.mod&&o.mod.ui)setTimeout(()=>o.mod.ui.map.invalidateSize(),80);
  if(o.api&&o.api.show)o.api.show();
  window.scrollTo(0,0);
}
function setup(){
  $$('.choice').forEach(b=>b.addEventListener('click',()=>{location.hash='#/trigo/'+b.dataset.to;}));
  $('#tg-back').addEventListener('click',()=>{location.hash='#/trigo';});
  $$('.tg-rst').forEach(b=>b.addEventListener('click',()=>{
    if(!confirm('Cancellare tutte le misure, i punti e i risultati di Trigo?'))return;
    Sensors.stop();location.hash='#/trigo';location.reload();   // lo stato è solo in memoria: si riparte da zero (restano le impostazioni stivali/passo/unità)
  }));
  document.addEventListener('keydown',e=>{if(e.key==='Escape')collapseMaps();});
  FireOps.onShow('trigo',()=>{go((location.hash.match(/^#\/trigo\/([\w-]+)/)||[])[1]||'home');});
  FireOps.onHide('trigo',()=>{Sensors.stop();collapseMaps();});
  FireOps.onLogo('trigo',()=>{if(curView!=='home')location.hash='#/trigo';else FireOps.vai('');});
}

FireOps.registra({id:'trigo',css:CSS,html:HTML,init(sec){root=sec;setup();}});
})();