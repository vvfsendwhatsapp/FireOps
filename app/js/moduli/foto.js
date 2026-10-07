/* FireOps VVF - modulo Foto (funzione Comando)
 * Logo CNVVF e sfocatura di volti, targhe e marchi su una foto. Tutto resta sul telefono: nessun invio.
 * Va in app/js/moduli/foto.js. Il logo è images/CNVVF.png (../images/CNVVF.png dalla pagina app/user.html).
 *
 * Per mostrarlo nella home, in fireops-app.js dentro la sezione "comando":
 *   moduli: [
 *     {id: "foto", nome: "Foto", sotto: "Logo e sfocatura di volti, targhe e marchi",
 *       desc: "Aggiungi il logo CNVVF e sfoca volti, targhe e marchi prima di condividere una foto", ico: "📷"}
 *   ]
 */
(function(){
'use strict';

const LOGO_URLS=['../images/CNVVF.png','https://vvfsendwhatsapp.github.io/FireOps/images/CNVVF.png'];
const WORK_MAX=1600;      // lato massimo dell'anteprima (px)
const EXPORT_MAX=4096;    // lato massimo del file salvato (px)
const KEY='fireops_foto_logo';
const STR={media:0.18,forte:0.3,massima:0.45};   // raggio di sfocatura rispetto al lato minore del riquadro
const KINDS={zona:'Zona',volto:'Volto',targa:'Targa',marchio:'Marchio'};
const MP_URL='https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs';
const MP_WASM='https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm';
const MP_MODEL='https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite';

/*MATH-START*/
const D2R=Math.PI/180;
/* sfocatura a scatola (3 passate ≈ gaussiana) su dati RGBA, bordi replicati; modifica data sul posto */
function blur1d(src,dst,w,h,r,horiz){
  const n=horiz?w:h,lines=horiz?h:w,stride=horiz?4:4*w,lineStep=horiz?4*w:4,k=2*r+1;
  for(let l=0;l<lines;l++){
    const base=l*lineStep;
    for(let c=0;c<4;c++){
      let sum=0;
      for(let i=-r;i<=r;i++){const j=Math.min(n-1,Math.max(0,i));sum+=src[base+j*stride+c];}
      for(let i=0;i<n;i++){
        dst[base+i*stride+c]=sum/k;
        const add=Math.min(n-1,i+r+1),sub=Math.max(0,i-r);
        sum+=src[base+add*stride+c]-src[base+sub*stride+c];
      }
    }
  }
}
function boxBlurRGBA(data,w,h,r,passes){
  r=Math.max(1,Math.round(r));passes=passes||3;
  const tmp=new Uint8ClampedArray(data.length);
  for(let p=0;p<passes;p++){blur1d(data,tmp,w,h,r,true);blur1d(tmp,data,w,h,r,false);}
  return data;
}
/* riquadri normalizzati (0..1 rispetto a larghezza e altezza della foto) */
function regionRect(rg,W,H){return {x:rg.x*W,y:rg.y*H,w:rg.w*W,h:rg.h*H};}
function hitRegion(rg,px,py,W,H){
  const r=regionRect(rg,W,H);
  if(rg.shape==='oval'){
    const cx=r.x+r.w/2,cy=r.y+r.h/2,a=r.w/2,b=r.h/2;
    return a>0&&b>0&&((px-cx)/a)**2+((py-cy)/b)**2<=1;
  }
  return px>=r.x&&px<=r.x+r.w&&py>=r.y&&py<=r.y+r.h;
}
function iou(a,b){
  const x0=Math.max(a.x,b.x),y0=Math.max(a.y,b.y),x1=Math.min(a.x+a.w,b.x+b.w),y1=Math.min(a.y+a.h,b.y+b.h);
  const inter=Math.max(0,x1-x0)*Math.max(0,y1-y0),ua=a.w*a.h+b.w*b.h-inter;
  return {iou:ua>0?inter/ua:0,min:inter/Math.max(1e-9,Math.min(a.w*a.h,b.w*b.h))};
}
/* unisce i rilevamenti duplicati (tessere sovrapposte): tiene il più grande */
function nms(boxes,thr){
  const s=boxes.slice().sort((a,b)=>b.w*b.h-a.w*a.h),out=[];
  for(const b of s){
    if(!out.some(o=>{const q=iou(o,b);return q.iou>thr||q.min>0.7;}))out.push(b);
  }
  return out;
}
function isPlateText(t){
  const s=String(t||'').toUpperCase().replace(/[\s.\-·]/g,'');
  return /^[A-Z]{2}\d{3}[A-Z]{2}$/.test(s)||/^[A-Z]{2}\d{5,6}$/.test(s)||/^(?=.*\d)(?=.*[A-Z])[A-Z0-9]{5,8}$/.test(s);
}
/* logo: centro normalizzato (x,y), larghezza z (frazione della larghezza della foto), rotazione r gradi, ar = altezza/larghezza */
function logoHit(lg,px,py,W,H){
  const w=lg.z*W,h=w*lg.ar,dx=px-lg.x*W,dy=py-lg.y*H,c=Math.cos(-lg.r*D2R),s=Math.sin(-lg.r*D2R);
  const ux=dx*c-dy*s,uy=dx*s+dy*c;
  return Math.abs(ux)<=w/2&&Math.abs(uy)<=h/2;
}
function logoPreset(name,lg,W,H,margin){
  const w=lg.z*W,h=w*lg.ar,a=lg.r*D2R;
  const bw=Math.abs(w*Math.cos(a))+Math.abs(h*Math.sin(a)),bh=Math.abs(w*Math.sin(a))+Math.abs(h*Math.cos(a));
  const m=margin*W,out={x:lg.x,y:lg.y};
  if(name==='c'){out.x=0.5;out.y=0.5;return out;}
  out.x=(name==='tl'||name==='bl')?(m+bw/2)/W:1-(m+bw/2)/W;
  out.y=(name==='tl'||name==='tr')?(m+bh/2)/H:1-(m+bh/2)/H;
  return out;
}
/*MATH-END*/

const CSS=`.pg-foto{--acc:var(--ics-comando);--ok:#3fa66b;--bad:#e8734a;--line2:#3a4552;
  max-width:640px;margin:0 auto;padding:12px 16px calc(24px + env(safe-area-inset-bottom,0px));color:var(--text);font-family:var(--sans)}
.pg-foto *{box-sizing:border-box}
.pg-foto [hidden]{display:none!important}
.pg-foto button,.pg-foto input,.pg-foto select{font:inherit;color:inherit}
.pg-foto button:focus-visible,.pg-foto input:focus-visible,.pg-foto select:focus-visible{outline:2px solid var(--text);outline-offset:2px}
.pg-foto .steps{display:flex;gap:5px;margin:2px 0 0}
.pg-foto .step{position:relative;flex:1;height:6px;min-height:0;padding:0;border:0;border-radius:3px;background:var(--line);cursor:pointer}
.pg-foto .step::before{content:'';position:absolute;left:-2px;right:-2px;top:-15px;bottom:-15px}
.pg-foto .step.done{background:var(--ok)}
.pg-foto .step.on{background:var(--yellow)}
.pg-foto .steplabel{padding:8px 0 10px;font-size:13px;color:var(--text-dim);text-align:center}
.pg-foto .card{background:var(--panel);border:1px solid var(--line);border-radius:8px;padding:12px;margin-bottom:10px}
.pg-foto .card h3{font-size:15px;font-weight:700;margin:0 0 8px}
.pg-foto label.f{display:block;font-size:12.5px;color:var(--text-dim);margin:10px 0 3px}
.pg-foto input,.pg-foto select{width:100%;background:var(--bg);border:1px solid var(--line);padding:9px 10px;border-radius:6px;min-height:42px;color:var(--text);font-variant-numeric:tabular-nums}
.pg-foto input:focus,.pg-foto select:focus{outline:none;border-color:var(--yellow)}
.pg-foto input[type=range]{padding:0;min-height:30px;accent-color:var(--yellow)}
.pg-foto input[type=checkbox]{width:22px;min-height:22px;accent-color:var(--yellow)}
.pg-foto .row{display:flex;gap:8px;align-items:flex-end}
.pg-foto .row>*{flex:1;min-width:0}
.pg-foto .row>.fit{flex:0 0 auto}
.pg-foto .sub{font-size:12.5px;color:var(--text-dim);margin:6px 0 0}
.pg-foto .btn{display:flex;align-items:center;justify-content:center;text-align:center;background:var(--panel-2);border:1px solid var(--line);color:var(--text);padding:10px 12px;border-radius:8px;font-weight:600;cursor:pointer;min-height:46px;user-select:none}
.pg-foto .btn:active{background:var(--line)}
.pg-foto .btn.pri{background:var(--acc);border-color:var(--acc);color:#10141a}
.pg-foto .btn.sm{padding:6px 10px;min-height:40px;font-size:14px}
.pg-foto .btn.big{width:100%;min-height:54px;font-size:16px}
.pg-foto .btn.on{background:var(--yellow);border-color:var(--yellow);color:#000}
.pg-foto .btn:disabled{opacity:.4;pointer-events:none}
.pg-foto .chips{display:flex;flex-wrap:wrap;gap:6px}
.pg-foto .chips .btn{min-height:36px;padding:4px 12px;border-radius:999px;font-size:14px}
.pg-foto .seg{display:flex;border:1px solid var(--line);border-radius:8px;overflow:hidden}
.pg-foto .seg button{flex:1;background:var(--panel-2);border:0;border-right:1px solid var(--line);padding:8px 4px;font-weight:600;font-size:14px;color:var(--text-dim);cursor:pointer;min-height:44px}
.pg-foto .seg button:last-child{border-right:0}
.pg-foto .seg button.on{background:var(--yellow);color:#000}
.pg-foto .note{border:1px solid var(--line);border-radius:6px;padding:8px 10px;font-size:13px;color:var(--text-dim);margin:8px 0}
.pg-foto .note.warn{border-color:var(--bad);color:var(--bad)}
.pg-foto .chk{display:flex;align-items:center;gap:10px;font-size:15px;margin:2px 0 6px}
.pg-foto .chk input{flex:none}
.pg-foto .pos{display:grid;grid-template-columns:repeat(5,1fr);gap:6px}
.pg-foto .pad{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-top:8px}
.pg-foto .two{display:flex;gap:8px;align-items:center}
.pg-foto .two input[type=number]{flex:none;width:92px}
.pg-foto .two input[type=range]{flex:1}

/* anteprima: resta visibile sotto l'intestazione mentre si scorrono i comandi */
.pg-foto #fo-stage{position:relative;height:46vh;min-height:240px;max-height:520px;background:#0c0e10;touch-action:none;overflow:hidden;border:1px solid var(--line);border-radius:8px;margin-bottom:10px;user-select:none;-webkit-user-select:none}
.pg-foto #fo-stage.stk{position:sticky;z-index:6;height:38vh;min-height:200px;box-shadow:0 8px 14px rgba(0,0,0,.45)}
.pg-foto #fo-cv{position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none}
.pg-foto #fo-empty{position:absolute;inset:0;display:grid;place-items:center;text-align:center;padding:20px;color:var(--text-dim);font-size:14px;pointer-events:none}
.pg-foto #fo-empty strong{display:block;color:var(--text);font-size:16px;margin-bottom:4px}
.pg-foto .fo-zoom{position:absolute;right:8px;top:8px;display:flex;flex-direction:column;gap:6px;z-index:2}
.pg-foto .fo-zoom button{min-width:44px;min-height:44px;border-radius:8px;border:1px solid var(--line2);background:#000b;color:#fff;font-size:20px;font-weight:700;cursor:pointer}
.pg-foto .fo-zoom button#fo-zfit{font-size:12px}
.pg-foto #fo-hint{position:absolute;left:8px;right:60px;bottom:8px;background:#000c;border:1px solid var(--line2);border-radius:6px;padding:5px 9px;font-size:13px;color:#fff;pointer-events:none}
.pg-foto .toast{position:fixed;left:50%;bottom:calc(20px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);background:var(--yellow);color:#000;padding:10px 16px;border-radius:8px;font-size:14px;font-weight:600;z-index:3000;max-width:90vw;text-align:center}
`;

const HTML=`<div class="steps" id="fo-steps"></div>

<div id="fo-stage">
  <canvas id="fo-cv"></canvas>
  <div id="fo-empty"><div><strong>Nessuna foto</strong>Scatta una foto o scegline una dalla galleria.</div></div>
  <div class="fo-zoom"><button type="button" id="fo-zin" aria-label="Zoom avanti">+</button><button type="button" id="fo-zout" aria-label="Zoom indietro">−</button><button type="button" id="fo-zfit" aria-label="Adatta alla vista">Adatta</button></div>
  <div id="fo-hint" hidden></div>
</div>

<div class="panel" data-s="1">
  <div class="card"><h3>Foto</h3>
    <div class="row">
      <label class="btn pri" for="fo-cam">Scatta foto</label>
      <label class="btn" for="fo-file">Dalla galleria</label>
    </div>
    <input id="fo-cam" type="file" accept="image/*" capture="environment" hidden>
    <input id="fo-file" type="file" accept="image/*" hidden>
    <p class="sub" id="fo-info">La foto resta sul telefono: non viene inviata a nessuno. Salvando si tolgono i dati nascosti (EXIF), posizione GPS compresa.</p>
  </div>
  <button type="button" class="btn pri big" data-go="2" id="fo-next1">Vai alla sfocatura</button>
</div>

<div class="panel" data-s="2" hidden>
  <div class="card"><h3>Riconoscimento automatico</h3>
    <div class="row"><button type="button" class="btn pri" id="fo-faces">Trova volti</button><button type="button" class="btn" id="fo-plates">Trova targhe</button></div>
    <p class="sub" id="fo-auto">Un riquadro sfocato per ogni volto trovato. Controlla sempre il risultato e correggi a mano: il riconoscimento può sbagliare.</p>
  </div>
  <div class="card"><h3>Sfocatura a mano</h3>
    <div class="seg" id="fo-tools" role="group" aria-label="Strumento">
      <button type="button" data-t="sel" class="on">Seleziona</button><button type="button" data-t="rect">Rettangolo</button><button type="button" data-t="oval">Ovale</button>
    </div>
    <label class="f" for="fo-kind">Che cosa copri</label>
    <select id="fo-kind"><option value="zona">Zona</option><option value="volto">Volto</option><option value="targa">Targa</option><option value="marchio">Marchio</option></select>
    <label class="f">Intensità</label>
    <div class="seg" id="fo-str" role="group" aria-label="Intensità"><button type="button" data-v="media">Media</button><button type="button" data-v="forte" class="on">Forte</button><button type="button" data-v="massima">Massima</button></div>
    <label class="f" id="fo-reglab">Riquadri</label>
    <div class="chips" id="fo-regs"></div>
    <div class="row" style="margin-top:10px">
      <button type="button" class="btn sm" id="fo-shape">Forma</button><button type="button" class="btn sm" id="fo-dup">Duplica</button>
      <button type="button" class="btn sm" id="fo-del">Elimina</button><button type="button" class="btn sm" id="fo-undo">Annulla</button>
    </div>
    <p class="sub">Con "Rettangolo" o "Ovale" trascini sulla foto per disegnare un riquadro. Con "Seleziona" tocchi un riquadro per spostarlo o ridimensionarlo dagli angoli. Due dita: zoom e spostamento.</p>
  </div>
  <button type="button" class="btn pri big" data-go="3">Vai al logo</button>
</div>

<div class="panel" data-s="3" hidden>
  <div class="card"><h3>Logo CNVVF</h3>
    <label class="chk"><input type="checkbox" id="fo-lshow" checked> Mostra il logo</label>
    <div class="note warn" id="fo-lnote" hidden>Il logo non è stato trovato in images/CNVVF.png: ho messo un segnaposto. Scegli il file del logo qui sotto.</div>
    <label class="f">Posizione</label>
    <div class="pos" id="fo-pos">
      <button type="button" class="btn sm" data-p="tl" aria-label="In alto a sinistra">↖</button>
      <button type="button" class="btn sm" data-p="tr" aria-label="In alto a destra">↗</button>
      <button type="button" class="btn sm" data-p="c" aria-label="Al centro">●</button>
      <button type="button" class="btn sm" data-p="bl" aria-label="In basso a sinistra">↙</button>
      <button type="button" class="btn sm" data-p="br" aria-label="In basso a destra">↘</button>
    </div>
    <div class="pad" id="fo-pad">
      <button type="button" class="btn sm" data-n="l" aria-label="Sposta a sinistra">◀</button>
      <button type="button" class="btn sm" data-n="u" aria-label="Sposta in alto">▲</button>
      <button type="button" class="btn sm" data-n="d" aria-label="Sposta in basso">▼</button>
      <button type="button" class="btn sm" data-n="r" aria-label="Sposta a destra">▶</button>
    </div>
    <p class="sub">Trascina il logo sulla foto, oppure usa gli angoli e le frecce (1% per tocco). Due dita sul logo: ingrandisci e ruota.</p>
    <label class="f" for="fo-lz">Zoom (% della larghezza della foto)</label>
    <div class="two"><input type="range" id="fo-lz" min="2" max="80" step="1"><input type="number" id="fo-lzn" min="2" max="80" step="1" inputmode="decimal"></div>
    <label class="f" for="fo-lr">Rotazione (gradi)</label>
    <div class="two"><input type="range" id="fo-lr" min="-180" max="180" step="1"><input type="number" id="fo-lrn" min="-180" max="180" step="1" inputmode="decimal"></div>
    <div class="row" style="margin-top:6px"><button type="button" class="btn sm" data-r="-90">−90°</button><button type="button" class="btn sm" data-r="0">0°</button><button type="button" class="btn sm" data-r="90">+90°</button></div>
    <label class="f" for="fo-la">Trasparenza (visibilità %)</label>
    <div class="two"><input type="range" id="fo-la" min="20" max="100" step="5"><input type="number" id="fo-lan" min="20" max="100" step="5" inputmode="decimal"></div>
    <div class="row" style="margin-top:12px"><label class="btn sm" for="fo-lfile">Scegli un altro logo</label><button type="button" class="btn sm" id="fo-lreset">Ripristina</button></div>
    <input id="fo-lfile" type="file" accept="image/*" hidden>
  </div>
  <div class="card"><h3>Salva</h3>
    <button type="button" class="btn pri big" id="fo-save">Salva foto (JPG)</button>
    <div class="row" style="margin-top:8px"><button type="button" class="btn" id="fo-share">Condividi</button></div>
    <p class="sub" id="fo-out"></p>
  </div>
</div>

<div id="fo-toast" class="toast" hidden></div>
`;

let root=document;
const $=(s,r=root)=>r.querySelector(s),$$=(s,r=root)=>Array.from(r.querySelectorAll(s));
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
let toastT;
function toast(m){const t=$('#fo-toast');t.textContent=m;t.hidden=false;clearTimeout(toastT);toastT=setTimeout(()=>{t.hidden=true;},3600);}

/* ---------------- stato ---------------- */
const S={
  img:null,iw:0,ih:0,W:0,H:0,comp:null,regions:[],sel:-1,hist:[],tool:'sel',kind:'zona',str:'forte',
  logo:{img:null,ar:0.5,ok:false,show:true,x:0.86,y:0.9,z:0.18,r:0,a:100},
  view:{s:1,x:0,y:0},cw:0,ch:0,dpr:1,step:1,painting:false,busy:false
};
let cv,ctx,steps;

function loadLogoPrefs(){
  try{
    const j=JSON.parse(localStorage.getItem(KEY)||'null');
    if(j){['x','y','z','r','a'].forEach(k=>{if(Number.isFinite(j[k]))S.logo[k]=j[k];});if(typeof j.show==='boolean')S.logo.show=j.show;}
  }catch(e){}
}
function saveLogoPrefs(){
  try{const l=S.logo;localStorage.setItem(KEY,JSON.stringify({x:l.x,y:l.y,z:l.z,r:l.r,a:l.a,show:l.show}));}catch(e){}
}

/* ---------------- logo ---------------- */
function placeholderLogo(){
  const c=document.createElement('canvas');c.width=400;c.height=200;
  const g=c.getContext('2d');
  g.fillStyle='#10141a';g.strokeStyle='#fff';g.lineWidth=8;
  g.beginPath();g.rect(4,4,392,192);g.fill();g.stroke();
  g.fillStyle='#fff';g.font='bold 84px system-ui,sans-serif';g.textAlign='center';g.textBaseline='middle';
  g.fillText('CNVVF',200,104);
  return c;
}
function tryImage(url){
  return new Promise((res,rej)=>{
    const im=new Image();
    if(/^https?:/.test(url))im.crossOrigin='anonymous';
    im.onload=()=>res(im);im.onerror=()=>rej(new Error('logo'));im.src=url;
  });
}
async function loadLogo(){
  for(const u of LOGO_URLS){
    try{
      const im=await tryImage(u);
      S.logo.img=im;S.logo.ar=(im.naturalHeight||im.height)/(im.naturalWidth||im.width)||0.5;S.logo.ok=true;
      uiLogo();paint();return;
    }catch(e){}
  }
  const p=placeholderLogo();
  S.logo.img=p;S.logo.ar=p.height/p.width;S.logo.ok=false;
  uiLogo();paint();
}

/* ---------------- disegno ---------------- */
function drawLogo(g,scale){
  const l=S.logo;if(!l.show||!l.img)return;
  const w=l.z*S.W*scale,h=w*l.ar;
  g.save();
  g.globalAlpha=clamp(l.a/100,0.05,1);
  g.translate(l.x*S.W*scale,l.y*S.H*scale);g.rotate(l.r*D2R);
  g.drawImage(l.img,-w/2,-h/2,w,h);
  g.restore();
}
function blurRegion(g,rg,scale){
  const r=regionRect(rg,S.W*scale,S.H*scale);
  const cw=Math.round(S.W*scale),ch=Math.round(S.H*scale);
  const x=clamp(Math.floor(r.x),0,cw),y=clamp(Math.floor(r.y),0,ch);
  const w=clamp(Math.ceil(r.x+r.w),0,cw)-x,h=clamp(Math.ceil(r.y+r.h),0,ch)-y;
  if(w<2||h<2)return;
  const id=g.getImageData(x,y,w,h);
  boxBlurRGBA(id.data,w,h,Math.max(2,(STR[rg.s]||STR.forte)*Math.min(r.w,r.h)),3);
  const t=document.createElement('canvas');t.width=w;t.height=h;t.getContext('2d').putImageData(id,0,0);
  g.save();g.beginPath();
  if(rg.shape==='oval')g.ellipse(r.x+r.w/2,r.y+r.h/2,Math.max(1,r.w/2),Math.max(1,r.h/2),0,0,Math.PI*2);
  else g.rect(r.x,r.y,r.w,r.h);
  g.clip();g.drawImage(t,x,y);g.restore();
}
/* foto + sfocature (senza logo) alla scala indicata rispetto all'anteprima */
function drawBase(g,scale){
  g.drawImage(S.img,0,0,S.W*scale,S.H*scale);
  S.regions.forEach(rg=>blurRegion(g,rg,scale));
}
function rebuildComp(){
  if(!S.img)return;
  if(!S.comp){S.comp=document.createElement('canvas');S.comp.width=S.W;S.comp.height=S.H;}
  const g=S.comp.getContext('2d');g.clearRect(0,0,S.W,S.H);
  drawBase(g,1);
}
const toScr=p=>({x:p.x*S.view.s+S.view.x,y:p.y*S.view.s+S.view.y});
const toImg=p=>({x:(p.x-S.view.x)/S.view.s,y:(p.y-S.view.y)/S.view.s});
function resize(){
  const r=cv.getBoundingClientRect();
  S.cw=r.width;S.ch=r.height;S.dpr=window.devicePixelRatio||1;
  cv.width=Math.max(1,Math.round(S.cw*S.dpr));cv.height=Math.max(1,Math.round(S.ch*S.dpr));
}
function fitView(){
  if(!S.img||!S.cw)return;
  const s=Math.min(S.cw/S.W,S.ch/S.H)*0.98;
  S.view={s,x:(S.cw-S.W*s)/2,y:(S.ch-S.H*s)/2};
}
function paint(){
  if(S.painting)return;
  S.painting=true;
  requestAnimationFrame(()=>{S.painting=false;draw();});
}
function pathRegion(g,rg){
  const r=regionRect(rg,S.W,S.H),a=toScr({x:r.x,y:r.y}),b=toScr({x:r.x+r.w,y:r.y+r.h});
  g.beginPath();
  if(rg.shape==='oval')g.ellipse((a.x+b.x)/2,(a.y+b.y)/2,Math.abs(b.x-a.x)/2,Math.abs(b.y-a.y)/2,0,0,Math.PI*2);
  else g.rect(a.x,a.y,b.x-a.x,b.y-a.y);
}
function corners(rg){
  const r=regionRect(rg,S.W,S.H);
  return [{x:r.x,y:r.y},{x:r.x+r.w,y:r.y},{x:r.x+r.w,y:r.y+r.h},{x:r.x,y:r.y+r.h}].map(toScr);
}
function draw(){
  if(!cv)return;
  const g=ctx,d=S.dpr;
  g.setTransform(1,0,0,1,0,0);g.clearRect(0,0,cv.width,cv.height);
  g.fillStyle='#0c0e10';g.fillRect(0,0,cv.width,cv.height);
  if(!S.img)return;
  g.setTransform(d,0,0,d,0,0);
  if(!S.comp)rebuildComp();
  g.save();g.translate(S.view.x,S.view.y);g.scale(S.view.s,S.view.s);
  g.imageSmoothingQuality='high';
  g.drawImage(S.comp,0,0);
  drawLogo(g,1);
  g.restore();
  /* sovrapposizioni (non finiscono nel file salvato) */
  if(S.step===2){
    S.regions.forEach((rg,i)=>{
      pathRegion(g,rg);
      g.lineWidth=i===S.sel?3:1.5;g.strokeStyle=i===S.sel?'#ffd400':'rgba(255,255,255,.85)';
      g.setLineDash(i===S.sel?[]:[6,4]);g.stroke();g.setLineDash([]);
    });
    if(S.draft){pathRegion(g,S.draft);g.lineWidth=2;g.strokeStyle='#ffd400';g.setLineDash([6,4]);g.stroke();g.setLineDash([]);}
    if(S.sel>=0&&S.regions[S.sel]){
      corners(S.regions[S.sel]).forEach(c=>{g.fillStyle='#ffd400';g.strokeStyle='#000';g.lineWidth=2;g.beginPath();g.rect(c.x-9,c.y-9,18,18);g.fill();g.stroke();});
    }
  }
  if(S.step===3&&S.logo.show&&S.logo.img){
    const l=S.logo,c=toScr({x:l.x*S.W,y:l.y*S.H}),w=l.z*S.W*S.view.s,h=w*l.ar;
    g.save();g.translate(c.x,c.y);g.rotate(l.r*D2R);
    g.strokeStyle='#ffd400';g.lineWidth=2;g.setLineDash([6,4]);g.strokeRect(-w/2,-h/2,w,h);g.restore();
  }
}

/* ---------------- storia ---------------- */
function snap(){
  S.hist.push(JSON.stringify({r:S.regions,s:S.sel}));
  if(S.hist.length>40)S.hist.shift();
  uiRegions();
}
function undo(){
  const j=S.hist.pop();if(!j)return;
  const o=JSON.parse(j);S.regions=o.r;S.sel=Math.min(o.s,S.regions.length-1);
  changed();
}
function changed(){rebuildComp();uiRegions();paint();}

/* ---------------- foto ---------------- */
function loadPhoto(file){
  const url=URL.createObjectURL(file);
  const im=new Image();
  im.onload=()=>{
    S.img=im;S.iw=im.naturalWidth||im.width;S.ih=im.naturalHeight||im.height;
    const k=Math.min(1,WORK_MAX/Math.max(S.iw,S.ih));
    S.W=Math.max(1,Math.round(S.iw*k));S.H=Math.max(1,Math.round(S.ih*k));
    S.comp=null;S.regions=[];S.sel=-1;S.hist=[];S.draft=null;
    $('#fo-empty').hidden=true;
    $('#fo-info').textContent='Foto '+S.iw+' × '+S.ih+' px. Salvando si tolgono i dati nascosti (EXIF), posizione GPS compresa.';
    resize();fitView();rebuildComp();uiRegions();uiLogo();syncSticky();paint();
    steps.mark(1,true);
    try{URL.revokeObjectURL(url);}catch(e){}
    steps.go(2);
  };
  im.onerror=()=>{toast('Non riesco ad aprire questa foto.');try{URL.revokeObjectURL(url);}catch(e){}};
  im.src=url;
}

/* ---------------- riconoscimento ---------------- */
function detCanvas(){
  const k=Math.min(1,1280/Math.max(S.iw,S.ih));
  const c=document.createElement('canvas');c.width=Math.round(S.iw*k);c.height=Math.round(S.ih*k);
  c.getContext('2d').drawImage(S.img,0,0,c.width,c.height);
  return c;
}
async function detectTiled(fn,c){
  const out=(await fn(c)).slice();
  if(Math.max(c.width,c.height)>=800){
    const tw=Math.round(c.width*0.6),th=Math.round(c.height*0.6);
    for(const [fx,fy] of [[0,0],[0.4,0],[0,0.4],[0.4,0.4]]){
      const ox=Math.round(c.width*fx),oy=Math.round(c.height*fy);
      const t=document.createElement('canvas');t.width=tw;t.height=th;
      t.getContext('2d').drawImage(c,ox,oy,tw,th,0,0,tw,th);
      try{(await fn(t)).forEach(b=>out.push({x:b.x+ox,y:b.y+oy,w:b.w,h:b.h}));}catch(e){}
    }
  }
  return nms(out,0.3);
}
let mpDet=null;
async function faceBoxes(c){
  if(typeof window.FaceDetector==='function'){
    try{
      const fd=new window.FaceDetector({fastMode:false,maxDetectedFaces:60});
      return await detectTiled(async cc=>(await fd.detect(cc)).map(f=>({x:f.boundingBox.x,y:f.boundingBox.y,w:f.boundingBox.width,h:f.boundingBox.height})),c);
    }catch(e){/* passa a MediaPipe */}
  }
  if(!mpDet){
    const mp=await import(MP_URL);
    const fs=await mp.FilesetResolver.forVisionTasks(MP_WASM);
    mpDet=await mp.FaceDetector.createFromOptions(fs,{baseOptions:{modelAssetPath:MP_MODEL},runningMode:'IMAGE',minDetectionConfidence:0.4});
  }
  return detectTiled(async cc=>mpDet.detect(cc).detections.map(d=>({x:d.boundingBox.originX,y:d.boundingBox.originY,w:d.boundingBox.width,h:d.boundingBox.height})),c);
}
function addBoxes(boxes,c,kind,shape,pad){
  snap();
  let n=0;
  boxes.forEach(b=>{
    const px=b.w*pad,py=b.h*pad;
    const x0=clamp(b.x-px,0,c.width),y0=clamp(b.y-py,0,c.height),x1=clamp(b.x+b.w+px,0,c.width),y1=clamp(b.y+b.h+py,0,c.height);
    if(x1-x0<2||y1-y0<2)return;
    S.regions.push({x:x0/c.width,y:y0/c.height,w:(x1-x0)/c.width,h:(y1-y0)/c.height,shape,kind,s:S.str});n++;
  });
  S.sel=n?S.regions.length-1:S.sel;
  changed();
  return n;
}
async function findFaces(){
  if(!S.img){toast('Carica prima una foto.');return;}
  const b=$('#fo-faces');b.disabled=true;const t=b.textContent;b.textContent='Cerco i volti…';
  const info=$('#fo-auto');
  try{
    const c=detCanvas(),boxes=await faceBoxes(c);
    const n=addBoxes(boxes,c,'volto','oval',0.25);
    info.textContent=n?n+(n===1?' volto trovato e sfocato':' volti trovati e sfocati')+'. Controlla la foto: se ne manca qualcuno aggiungilo a mano.':'Nessun volto trovato. Aggiungi i riquadri a mano.';
  }catch(e){
    info.textContent='Riconoscimento dei volti non disponibile (serve connessione la prima volta, oppure un browser che lo supporti). Usa i riquadri a mano.';
    toast('Riconoscimento volti non disponibile');
  }finally{b.disabled=false;b.textContent=t;}
}
async function findPlates(){
  if(!S.img){toast('Carica prima una foto.');return;}
  const info=$('#fo-auto');
  if(typeof window.TextDetector!=='function'){
    info.textContent='Il riconoscimento automatico delle targhe non è disponibile su questo dispositivo: segna ogni targa con "Rettangolo" e "Che cosa copri: Targa".';
    toast('Targhe: usa i riquadri a mano');return;
  }
  const b=$('#fo-plates');b.disabled=true;const t=b.textContent;b.textContent='Cerco le targhe…';
  try{
    const c=detCanvas(),td=new window.TextDetector(),res=await td.detect(c);
    const boxes=res.filter(r=>{
      const w=r.boundingBox.width,h=r.boundingBox.height,ar=w/Math.max(1,h);
      return isPlateText(r.rawValue)&&ar>1.6&&ar<8;
    }).map(r=>({x:r.boundingBox.x,y:r.boundingBox.y,w:r.boundingBox.width,h:r.boundingBox.height}));
    const n=addBoxes(boxes,c,'targa','rect',0.12);
    info.textContent=n?n+(n===1?' targa trovata e sfocata':' targhe trovate e sfocate')+'. Controlla la foto: le targhe poco leggibili possono sfuggire.':'Nessuna targa riconosciuta. Segnala a mano le targhe e i marchi.';
  }catch(e){
    info.textContent='Riconoscimento targhe non riuscito: segna le targhe a mano.';
  }finally{b.disabled=false;b.textContent=t;}
}

/* ---------------- interazione ---------------- */
const ptr=new Map();
let gest=null;
function cpos(e){const r=cv.getBoundingClientRect();return {x:e.clientX-r.left,y:e.clientY-r.top};}
function handleAt(sp){
  if(S.sel<0||!S.regions[S.sel])return -1;
  const cs=corners(S.regions[S.sel]);
  for(let i=0;i<4;i++)if(Math.hypot(cs[i].x-sp.x,cs[i].y-sp.y)<=24)return i;
  return -1;
}
function regionAt(ip){
  for(let i=S.regions.length-1;i>=0;i--)if(hitRegion(S.regions[i],ip.x,ip.y,S.W,S.H))return i;
  return -1;
}
function zoomAt(f,sp){
  sp=sp||{x:S.cw/2,y:S.ch/2};
  const s0=S.view.s,s1=clamp(s0*f,0.1,12),k=s1/s0;
  S.view.x=sp.x-(sp.x-S.view.x)*k;S.view.y=sp.y-(sp.y-S.view.y)*k;S.view.s=s1;
  paint();
}
function onDown(e){
  if(!S.img)return;
  cv.setPointerCapture&&cv.setPointerCapture(e.pointerId);
  ptr.set(e.pointerId,cpos(e));
  if(ptr.size===2){startPinch();return;}
  if(ptr.size>2)return;
  const sp=cpos(e),ip=toImg(sp);
  gest=null;
  if(S.step===2){
    if(S.tool==='sel'){
      const h=handleAt(sp);
      if(h>=0){
        const rg=S.regions[S.sel],r=regionRect(rg,S.W,S.H),cs=[{x:r.x,y:r.y},{x:r.x+r.w,y:r.y},{x:r.x+r.w,y:r.y+r.h},{x:r.x,y:r.y+r.h}];
        gest={t:'resize',anchor:cs[(h+2)%4],moved:false};return;
      }
      const i=regionAt(ip);
      if(i>=0){S.sel=i;uiRegions();gest={t:'move',i,ox:ip.x,oy:ip.y,r0:{...S.regions[i]},moved:false};paint();return;}
      S.sel=-1;uiRegions();gest={t:'pan',sx:sp.x,sy:sp.y,vx:S.view.x,vy:S.view.y};paint();return;
    }
    gest={t:'draw',p0:ip,s0:sp};return;
  }
  if(S.step===3&&S.logo.show&&logoHit(S.logo,ip.x,ip.y,S.W,S.H)){
    gest={t:'logo',ox:ip.x,oy:ip.y,x0:S.logo.x,y0:S.logo.y};return;
  }
  gest={t:'pan',sx:sp.x,sy:sp.y,vx:S.view.x,vy:S.view.y};
}
function startPinch(){
  const [a,b]=[...ptr.values()];
  if(gest&&gest.t==='draw'){S.draft=null;}
  gest={t:'pinch',d0:Math.hypot(b.x-a.x,b.y-a.y)||1,a0:Math.atan2(b.y-a.y,b.x-a.x),m0:{x:(a.x+b.x)/2,y:(a.y+b.y)/2},
    v0:{...S.view},z0:S.logo.z,r0:S.logo.r,onLogo:S.step===3&&S.logo.show};
  paint();
}
function onMove(e){
  if(!ptr.has(e.pointerId))return;
  ptr.set(e.pointerId,cpos(e));
  if(!gest)return;
  if(gest.t==='pinch'&&ptr.size>=2){
    const [a,b]=[...ptr.values()],d=Math.hypot(b.x-a.x,b.y-a.y)||1,ang=Math.atan2(b.y-a.y,b.x-a.x),m={x:(a.x+b.x)/2,y:(a.y+b.y)/2};
    if(gest.onLogo){
      S.logo.z=clamp(gest.z0*d/gest.d0,0.02,0.8);
      S.logo.r=Math.round(((gest.r0+(ang-gest.a0)/D2R+540)%360)-180);
      uiLogo();saveLogoPrefs();paint();
    }else{
      const k=clamp(gest.v0.s*d/gest.d0,0.1,12)/gest.v0.s;
      S.view.s=gest.v0.s*k;
      S.view.x=m.x-(gest.m0.x-gest.v0.x)*k;S.view.y=m.y-(gest.m0.y-gest.v0.y)*k;
      paint();
    }
    return;
  }
  const sp=cpos(e),ip=toImg(sp);
  if(gest.t==='pan'){S.view.x=gest.vx+(sp.x-gest.sx);S.view.y=gest.vy+(sp.y-gest.sy);paint();}
  else if(gest.t==='logo'){
    S.logo.x=clamp(gest.x0+(ip.x-gest.ox)/S.W,0,1);S.logo.y=clamp(gest.y0+(ip.y-gest.oy)/S.H,0,1);
    saveLogoPrefs();paint();
  }else if(gest.t==='move'){
    if(!gest.moved){snap();gest.moved=true;}
    const rg=S.regions[gest.i];
    rg.x=clamp(gest.r0.x+(ip.x-gest.ox)/S.W,0,1-rg.w);rg.y=clamp(gest.r0.y+(ip.y-gest.oy)/S.H,0,1-rg.h);
    rebuildComp();paint();
  }else if(gest.t==='resize'){
    if(!gest.moved){snap();gest.moved=true;}
    const rg=S.regions[S.sel],ax=gest.anchor.x,ay=gest.anchor.y;
    const x0=clamp(Math.min(ax,ip.x),0,S.W),x1=clamp(Math.max(ax,ip.x),0,S.W),y0=clamp(Math.min(ay,ip.y),0,S.H),y1=clamp(Math.max(ay,ip.y),0,S.H);
    rg.x=x0/S.W;rg.y=y0/S.H;rg.w=Math.max(0.005,(x1-x0)/S.W);rg.h=Math.max(0.005,(y1-y0)/S.H);
    rebuildComp();paint();
  }else if(gest.t==='draw'){
    const x0=clamp(Math.min(gest.p0.x,ip.x),0,S.W),x1=clamp(Math.max(gest.p0.x,ip.x),0,S.W),y0=clamp(Math.min(gest.p0.y,ip.y),0,S.H),y1=clamp(Math.max(gest.p0.y,ip.y),0,S.H);
    S.draft={x:x0/S.W,y:y0/S.H,w:(x1-x0)/S.W,h:(y1-y0)/S.H,shape:S.tool};
    paint();
  }
}
function onUp(e){
  if(!ptr.has(e.pointerId))return;
  const sp=cpos(e);ptr.delete(e.pointerId);
  if(gest&&gest.t==='draw'&&S.draft){
    const d=S.draft;S.draft=null;
    const big=Math.hypot(sp.x-gest.s0.x,sp.y-gest.s0.y)>=12&&d.w*S.W*S.view.s>=8&&d.h*S.H*S.view.s>=8;
    if(big){snap();S.regions.push({x:d.x,y:d.y,w:d.w,h:d.h,shape:d.shape,kind:S.kind,s:S.str});S.sel=S.regions.length-1;changed();}
    else paint();
  }else if(gest&&(gest.t==='move'||gest.t==='resize')&&gest.moved){uiRegions();paint();}
  if(ptr.size<2&&gest&&gest.t==='pinch')gest=null;
  if(ptr.size===0)gest=null;
}

/* ---------------- interfaccia ---------------- */
function uiRegions(){
  const box=$('#fo-regs');box.innerHTML='';
  const cnt={};
  S.regions.forEach((rg,i)=>{
    cnt[rg.kind]=(cnt[rg.kind]||0)+1;
    const b=document.createElement('button');b.type='button';b.className='btn'+(i===S.sel?' on':'');
    b.textContent=KINDS[rg.kind]+' '+cnt[rg.kind];b.dataset.i=i;box.appendChild(b);
  });
  $('#fo-reglab').textContent=S.regions.length?'Riquadri ('+S.regions.length+')':'Riquadri: nessuno';
  const sel=S.regions[S.sel];
  $('#fo-shape').disabled=!sel;$('#fo-dup').disabled=!sel;$('#fo-del').disabled=!sel;$('#fo-undo').disabled=!S.hist.length;
  $('#fo-shape').textContent=sel?(sel.shape==='oval'?'Forma: ovale':'Forma: rettangolo'):'Forma';
  $$('#fo-str button').forEach(b=>b.classList.toggle('on',b.dataset.v===(sel?sel.s:S.str)));
  if(sel)$('#fo-kind').value=sel.kind;
  $$('#fo-tools button').forEach(b=>b.classList.toggle('on',b.dataset.t===S.tool));
  steps&&steps.mark(2,S.regions.length>0);
  const h=$('#fo-hint');
  if(S.step===2&&S.img){
    h.hidden=false;
    h.textContent=S.tool==='sel'?(S.sel>=0?'Trascina per spostare, gli angoli per ridimensionare':'Tocca un riquadro, oppure scegli Rettangolo o Ovale per disegnarne uno'):'Trascina sulla foto per disegnare il riquadro';
  }else if(S.step===3&&S.img){h.hidden=false;h.textContent='Trascina il logo; due dita per ingrandire e ruotare';}
  else h.hidden=true;
}
function uiLogo(){
  const l=S.logo;
  $('#fo-lshow').checked=l.show;
  $('#fo-lz').value=Math.round(l.z*100);$('#fo-lzn').value=Math.round(l.z*100);
  $('#fo-lr').value=Math.round(l.r);$('#fo-lrn').value=Math.round(l.r);
  $('#fo-la').value=l.a;$('#fo-lan').value=l.a;
  $('#fo-lnote').hidden=l.ok;
}
function syncSticky(){
  const on=!!S.img&&S.step>1,st=$('#fo-stage');
  if(st.classList.contains('stk')===on)return;
  st.classList.toggle('stk',on);
  const hd=document.querySelector('.foh');
  st.style.top=on?((hd?hd.offsetHeight:0)+'px'):'';
  requestAnimationFrame(()=>{resize();fitView();paint();});
}
function setupSteps(){
  const labels=['Foto','Sfocatura','Logo e salvataggio'],bar=$('#fo-steps');
  bar.innerHTML=labels.map((l,i)=>`<button type="button" class="step" data-s="${i+1}" aria-label="Passo ${i+1} di ${labels.length}: ${l}"></button>`).join('');
  const lab=document.createElement('div');lab.className='steplabel';bar.after(lab);
  const api={
    go(n){
      if(n>1&&!S.img){toast('Carica prima una foto.');n=1;}
      S.step=n;
      $$('.step',bar).forEach(b=>{const on=+b.dataset.s===n;b.classList.toggle('on',on);if(on)b.setAttribute('aria-current','step');else b.removeAttribute('aria-current');});
      lab.textContent='Passo '+n+' di '+labels.length+' · '+labels[n-1];
      $$('.panel',root).forEach(p=>{p.hidden=+p.dataset.s!==n;});
      syncSticky();uiRegions();paint();
    },
    mark(n,done){const b=$('.step[data-s="'+n+'"]',bar);if(b)b.classList.toggle('done',!!done);}
  };
  bar.addEventListener('click',e=>{const b=e.target.closest('.step');if(b)api.go(+b.dataset.s);});
  root.addEventListener('click',e=>{const g=e.target.closest('[data-go]');if(g)api.go(+g.dataset.go);});
  return api;
}

/* ---------------- salvataggio ---------------- */
function exportCanvas(){
  const k=Math.min(1,EXPORT_MAX/Math.max(S.iw,S.ih)),w=Math.round(S.iw*k),h=Math.round(S.ih*k);
  const c=document.createElement('canvas');c.width=w;c.height=h;
  const g=c.getContext('2d');
  /* le scale delle regioni sono relative all'anteprima: S.W×S.H → w×h */
  const sc=w/S.W;
  g.drawImage(S.img,0,0,w,h);
  S.regions.forEach(rg=>blurRegion(g,rg,sc));
  drawLogo(g,sc);
  return c;
}
function stamp(){const d=new Date(),p=n=>String(n).padStart(2,'0');return d.getFullYear()+p(d.getMonth()+1)+p(d.getDate())+'-'+p(d.getHours())+p(d.getMinutes());}
function toBlob(c){return new Promise(res=>c.toBlob(res,'image/jpeg',0.92));}
async function makeFile(){
  const c=exportCanvas(),b=await toBlob(c);
  if(!b)throw new Error('blob');
  $('#fo-out').textContent='File '+c.width+' × '+c.height+' px, circa '+(b.size/1048576).toFixed(1).replace('.',',')+' MB.';
  return new File([b],'fireops-foto-'+stamp()+'.jpg',{type:'image/jpeg'});
}
async function save(){
  if(!S.img){toast('Carica prima una foto.');return;}
  const btn=$('#fo-save');btn.disabled=true;const t=btn.textContent;btn.textContent='Elaboro la foto…';
  try{
    await new Promise(r=>setTimeout(r,30));
    const f=await makeFile(),a=document.createElement('a');
    a.href=URL.createObjectURL(f);a.download=f.name;document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(a.href),4000);
    toast('Foto salvata');
  }catch(e){toast('Salvataggio non riuscito: prova con una foto più piccola.');}
  finally{btn.disabled=false;btn.textContent=t;}
}
async function share(){
  if(!S.img){toast('Carica prima una foto.');return;}
  try{
    const f=await makeFile();
    if(navigator.canShare&&navigator.canShare({files:[f]}))await navigator.share({files:[f],title:'Foto FireOps'});
    else toast('Condivisione non disponibile: usa "Salva foto".');
  }catch(e){if(!e||e.name!=='AbortError')toast('Condivisione non riuscita: usa "Salva foto".');}
}

/* ---------------- avvio ---------------- */
function setup(){
  cv=$('#fo-cv');ctx=cv.getContext('2d');
  loadLogoPrefs();
  steps=setupSteps();
  $('#fo-share').hidden=!(navigator.share&&navigator.canShare);
  $('#fo-file').onchange=$('#fo-cam').onchange=e=>{const f=e.target.files[0];if(f)loadPhoto(f);e.target.value='';};
  cv.addEventListener('pointerdown',onDown);cv.addEventListener('pointermove',onMove);
  cv.addEventListener('pointerup',onUp);cv.addEventListener('pointercancel',onUp);
  cv.addEventListener('wheel',e=>{if(!S.img)return;e.preventDefault();zoomAt(e.deltaY<0?1.15:1/1.15,cpos(e));},{passive:false});
  $('#fo-zin').onclick=()=>zoomAt(1.4);$('#fo-zout').onclick=()=>zoomAt(1/1.4);$('#fo-zfit').onclick=()=>{fitView();paint();};
  if(typeof ResizeObserver==='function')new ResizeObserver(()=>{resize();paint();}).observe($('#fo-stage'));
  window.addEventListener('resize',()=>{resize();paint();});

  /* riquadri */
  $('#fo-faces').onclick=findFaces;$('#fo-plates').onclick=findPlates;
  $('#fo-tools').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;S.tool=b.dataset.t;uiRegions();paint();});
  $('#fo-kind').onchange=e=>{S.kind=e.target.value;const rg=S.regions[S.sel];if(rg){snap();rg.kind=S.kind;uiRegions();}};
  $('#fo-str').addEventListener('click',e=>{
    const b=e.target.closest('button');if(!b)return;
    S.str=b.dataset.v;const rg=S.regions[S.sel];
    if(rg){snap();rg.s=S.str;changed();}else uiRegions();
  });
  $('#fo-regs').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;S.sel=+b.dataset.i;S.tool='sel';uiRegions();paint();});
  $('#fo-shape').onclick=()=>{const rg=S.regions[S.sel];if(!rg)return;snap();rg.shape=rg.shape==='oval'?'rect':'oval';changed();};
  $('#fo-dup').onclick=()=>{
    const rg=S.regions[S.sel];if(!rg)return;snap();
    const n={...rg,x:clamp(rg.x+0.03,0,1-rg.w),y:clamp(rg.y+0.03,0,1-rg.h)};S.regions.push(n);S.sel=S.regions.length-1;changed();
  };
  $('#fo-del').onclick=()=>{if(S.sel<0)return;snap();S.regions.splice(S.sel,1);S.sel=-1;changed();};
  $('#fo-undo').onclick=undo;

  /* logo */
  const L=S.logo,upd=()=>{uiLogo();saveLogoPrefs();paint();};
  $('#fo-lshow').onchange=e=>{L.show=e.target.checked;upd();};
  $('#fo-pos').addEventListener('click',e=>{
    const b=e.target.closest('button');if(!b||!S.img)return;
    const p=logoPreset(b.dataset.p,L,S.W,S.H,0.03);L.x=p.x;L.y=p.y;upd();
  });
  $('#fo-pad').addEventListener('click',e=>{
    const b=e.target.closest('button');if(!b)return;
    const d=b.dataset.n;
    if(d==='l')L.x=clamp(L.x-0.01,0,1);if(d==='r')L.x=clamp(L.x+0.01,0,1);
    if(d==='u')L.y=clamp(L.y-0.01,0,1);if(d==='d')L.y=clamp(L.y+0.01,0,1);
    upd();
  });
  const num=(id,fn)=>{const f=e=>{const v=parseFloat(String(e.target.value).replace(',','.'));if(Number.isFinite(v)){fn(v);upd();}};$(id).addEventListener('input',f);};
  num('#fo-lz',v=>{L.z=clamp(v/100,0.02,0.8);});num('#fo-lzn',v=>{L.z=clamp(v/100,0.02,0.8);});
  num('#fo-lr',v=>{L.r=clamp(Math.round(v),-180,180);});num('#fo-lrn',v=>{L.r=clamp(Math.round(v),-180,180);});
  num('#fo-la',v=>{L.a=clamp(Math.round(v),20,100);});num('#fo-lan',v=>{L.a=clamp(Math.round(v),20,100);});
  $$('[data-r]').forEach(b=>b.addEventListener('click',()=>{L.r=+b.dataset.r;upd();}));
  $('#fo-lfile').onchange=e=>{
    const f=e.target.files[0];e.target.value='';if(!f)return;
    const u=URL.createObjectURL(f);
    tryImage(u).then(im=>{L.img=im;L.ar=(im.naturalHeight||im.height)/(im.naturalWidth||im.width)||0.5;L.ok=true;upd();}).catch(()=>toast('Non riesco ad aprire questo logo.'));
  };
  $('#fo-lreset').onclick=()=>{Object.assign(L,{show:true,x:0.86,y:0.9,z:0.18,r:0,a:100});loadLogo();upd();};
  $('#fo-save').onclick=save;$('#fo-share').onclick=share;

  uiLogo();uiRegions();steps.go(1);
  loadLogo();
  FireOps.onShow('foto',()=>{resize();fitView();paint();});
}

FireOps.registra({id:'foto',css:CSS,html:HTML,init(sec){root=sec;setup();}});
})();
