/* FireOps VVF - modulo Mappa addestramenti (funzione Comando)
 * Mostra dentro FireOps la pagina PUMA "Mappa addestramenti in tempo reale" (https://gesaddvvf.github.io/PUMA/trainingmaprealtime.html).
 * Va in app/js/moduli/pumamappa.js. La pagina PUMA resta quella originale: ogni suo aggiornamento compare anche qui.
 *
 * Per mostrarlo nella home, in fireops-app.js dentro la sezione "comando", nell'elenco moduli:
 *   {id: "pumamappa", nome: "Mappa addestramenti", sotto: "PUMA · addestramenti in tempo reale",
 *     desc: "Dove si svolgono ora gli addestramenti, con i dettagli di ciascuno", ico: "🗺️"}
 */
(function(){
'use strict';

const ID='pumamappa';
const URL_PAGINA='https://gesaddvvf.github.io/PUMA/trainingmaprealtime.html';
const TIMEOUT_MS=15000;

const CSS=`.pg-pumamappa{--acc:var(--ics-comando);display:flex;flex-direction:column;gap:8px;max-width:1100px;margin:0 auto;padding:8px 10px calc(10px + env(safe-area-inset-bottom,0px));color:var(--text);font-family:var(--sans)}
.pg-pumamappa *{box-sizing:border-box}
.pg-pumamappa [hidden]{display:none!important}
.pg-pumamappa .bar{display:flex;gap:8px;align-items:center}
.pg-pumamappa .bar .tt{flex:1;min-width:0;font-size:13px;color:var(--text-dim);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pg-pumamappa .btn{display:inline-flex;align-items:center;justify-content:center;background:var(--panel-2);border:1px solid var(--line);color:var(--text);padding:6px 12px;border-radius:8px;font:600 14px var(--sans);min-height:42px;cursor:pointer;text-decoration:none;user-select:none}
.pg-pumamappa .btn:active{background:var(--line)}
.pg-pumamappa .btn:focus-visible{outline:2px solid var(--text);outline-offset:2px}
.pg-pumamappa .frame{position:relative;border:1px solid var(--line);border-radius:8px;overflow:hidden;background:var(--panel);height:70vh;min-height:360px}
.pg-pumamappa iframe{position:absolute;inset:0;width:100%;height:100%;border:0;background:#fff}
.pg-pumamappa .msg{position:absolute;inset:0;display:grid;place-items:center;text-align:center;padding:20px;color:var(--text-dim);font-size:14px;background:var(--panel);z-index:1}
.pg-pumamappa .msg b{display:block;color:var(--text);font-size:16px;margin-bottom:6px}
.pg-pumamappa .msg .btn{margin-top:12px}
`;

const HTML=`<div class="bar">
  <span class="tt">PUMA · Mappa addestramenti in tempo reale</span>
  <button type="button" class="btn" id="pu-ref" aria-label="Aggiorna">Aggiorna</button>
  <button type="button" class="btn" id="pu-full" aria-label="Schermo intero" hidden>Schermo intero</button>
  <a class="btn" id="pu-out" href="${URL_PAGINA}" target="_blank" rel="noopener">Apri</a>
</div>
<div class="frame" id="pu-frame">
  <div class="msg" id="pu-msg"><div><b>Caricamento…</b>Sto aprendo la pagina PUMA.</div></div>
  <iframe id="pu-if" title="Mappa addestramenti in tempo reale" allow="geolocation; fullscreen" referrerpolicy="no-referrer-when-downgrade" loading="eager"></iframe>
</div>`;

let root=document;
const $=(s,r=root)=>r.querySelector(s);
let ifr,frame,msg,timer=0,loaded=false,visible=false;

function showMsg(html){msg.innerHTML=html;msg.hidden=false;}
function load(){
  clearTimeout(timer);loaded=false;
  showMsg('<div><b>Caricamento…</b>Sto aprendo la pagina PUMA.</div>');
  const sep=URL_PAGINA.indexOf('?')>=0?'&':'?';
  ifr.src=URL_PAGINA+sep+'t='+Date.now();   // evita la copia vecchia in cache
  timer=setTimeout(()=>{
    if(loaded)return;
    showMsg('<div><b>La pagina non risponde</b>Controlla la connessione.<br><button type="button" class="btn" id="pu-retry">Riprova</button> <a class="btn" href="'+URL_PAGINA+'" target="_blank" rel="noopener">Apri a parte</a></div>');
  },TIMEOUT_MS);
}
function unload(){clearTimeout(timer);loaded=false;try{ifr.src='about:blank';}catch(e){}}
/* l'altezza segue lo schermo: dalla posizione della cornice al fondo della finestra */
function fit(){
  if(!frame)return;
  const top=frame.getBoundingClientRect().top,h=(window.innerHeight||700)-top-10;
  frame.style.height=Math.max(360,Math.round(h))+'px';
}

function setup(){
  ifr=$('#pu-if');frame=$('#pu-frame');msg=$('#pu-msg');
  ifr.addEventListener('load',()=>{
    if(!ifr.src||ifr.src==='about:blank'||/^about:/.test(ifr.src)&&!visible)return;
    loaded=true;clearTimeout(timer);msg.hidden=true;
  });
  $('#pu-ref').onclick=load;
  root.addEventListener('click',e=>{if(e.target.closest('#pu-retry'))load();});
  const fb=$('#pu-full');
  if(frame.requestFullscreen||frame.webkitRequestFullscreen){
    fb.hidden=false;
    fb.onclick=()=>{try{(frame.requestFullscreen||frame.webkitRequestFullscreen).call(frame);}catch(e){}};
  }
  window.addEventListener('resize',fit);
  window.addEventListener('orientationchange',()=>setTimeout(fit,250));
  FireOps.onShow(ID,()=>{visible=true;fit();setTimeout(fit,200);load();});
  FireOps.onHide(ID,()=>{visible=false;unload();});
}

FireOps.registra({id:ID,css:CSS,html:HTML,init(sec){root=sec;setup();}});
})();
