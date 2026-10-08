/* FireOps VVF - modulo Co.Em. - Comunicazione in Emergenza (funzione Comando)
 * Foto per la comunicazione: inquadratura, sfocatura di volti, targhe e marchi, logo CNVVF. Tutto resta sul telefono: nessun invio.
 * Va in app/js/moduli/foto.js. Il logo è images/CNVVF.png (../images/CNVVF.png dalla pagina app/user.html).
 *
 * Per mostrarlo nella home, in fireops-app.js dentro la sezione "comando":
 *   moduli: [
 *     {id: "foto", nome: "Co.Em.", sotto: "Comunicazione in Emergenza",
 *       desc: "Prepara le foto da diffondere: inquadratura, sfocatura di volti, targhe e marchi, logo CNVVF", ico: "📷"}
 *   ]
 */
(function(){
'use strict';

const LOGO_URLS=['../images/CNVVF.png','https://vvfsendwhatsapp.github.io/FireOps/images/CNVVF.png'];
const WORK_MAX=1600;      // lato massimo dell'anteprima (px)
const EXPORT_MAX=4096;    // lato massimo del file salvato (px)
const KEY='fireops_foto_logo2';
const LOGO_DEF={corner:'tr',z:0.17,margin:0.04,r:0,a:100};
const CORNERS={tl:'in alto a sinistra',tr:'in alto a destra',bl:'in basso a sinistra',br:'in basso a destra'};   // z e margine: frazione del lato corto della foto
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
/* sagome a mano libera */
function pointInPoly(pts,x,y){
  let c=false;
  for(let i=0,j=pts.length-1;i<pts.length;j=i++){
    const xi=pts[i][0],yi=pts[i][1],xj=pts[j][0],yj=pts[j][1];
    if((yi>y)!==(yj>y)&&x<(xj-xi)*(y-yi)/(yj-yi)+xi)c=!c;
  }
  return c;
}
function bboxPts(pts){
  let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;
  for(const p of pts){x0=Math.min(x0,p[0]);y0=Math.min(y0,p[1]);x1=Math.max(x1,p[0]);y1=Math.max(y1,p[1]);}
  return {x:x0,y:y0,w:x1-x0,h:y1-y0};
}
function thinPts(pts,minD){
  const out=[pts[0]];
  for(let i=1;i<pts.length;i++){const l=out[out.length-1];if(Math.hypot(pts[i][0]-l[0],pts[i][1]-l[1])>=minD)out.push(pts[i]);}
  return out;
}
/* riquadri normalizzati (0..1 rispetto a larghezza e altezza della foto) */
function regionRect(rg,W,H){return {x:rg.x*W,y:rg.y*H,w:rg.w*W,h:rg.h*H};}
function hitRegion(rg,px,py,W,H){
  if(rg.shape==='free')return pointInPoly(rg.pts.map(p=>[p[0]*W,p[1]*H]),px,py);
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
/* logo: centro normalizzato (x,y), larghezza z (frazione del LATO CORTO della foto), rotazione r gradi, ar = altezza/larghezza */
function logoHit(lg,px,py,W,H){
  const w=lg.z*Math.min(W,H),h=w*lg.ar,dx=px-lg.x*W,dy=py-lg.y*H,c=Math.cos(-lg.r*D2R),s=Math.sin(-lg.r*D2R);
  const ux=dx*c-dy*s,uy=dx*s+dy*c;
  return Math.abs(ux)<=w/2&&Math.abs(uy)<=h/2;
}
function logoPreset(name,lg,W,H,margin){
  const w=lg.z*Math.min(W,H),h=w*lg.ar,a=lg.r*D2R;
  const bw=Math.abs(w*Math.cos(a))+Math.abs(h*Math.sin(a)),bh=Math.abs(w*Math.sin(a))+Math.abs(h*Math.cos(a));
  const m=margin*Math.min(W,H),out={x:lg.x,y:lg.y};
  if(name==='c'){out.x=0.5;out.y=0.5;return out;}
  out.x=(name==='tl'||name==='bl')?(m+bw/2)/W:1-(m+bw/2)/W;
  out.y=(name==='tl'||name==='tr')?(m+bh/2)/H:1-(m+bh/2)/H;
  return out;
}
/* inquadratura: riquadro di aspetto 'aspect' (l/a) che sta in cw×ch con margine pad */
function cropFrame(aspect,cw,ch,pad){
  const mw=Math.max(10,cw-2*pad),mh=Math.max(10,ch-2*pad);let w=mw,h=w/aspect;
  if(h>mh){h=mh;w=h*aspect;}
  return {w,h};
}
/* semi-estensioni del riquadro (fw×fh) nel sistema della foto, con foto ruotata di aDeg e scala 1 */
function cropHalf(aDeg,fw,fh){
  const a=aDeg*D2R,c=Math.abs(Math.cos(a)),s=Math.abs(Math.sin(a));
  return {x:(fw*c+fh*s)/2,y:(fw*s+fh*c)/2};
}
/* scala minima (px riquadro per px foto) perché il riquadro resti tutto dentro la foto ruotata */
function cropMinScale(iw,ih,aDeg,fw,fh){
  const b=cropHalf(aDeg,fw,fh);return Math.max(b.x/(iw/2),b.y/(ih/2));
}
/* punto della foto (rispetto al centro) che sta al centro del riquadro, limitato in modo che il riquadro non esca */
function cropClampCenter(cx,cy,iw,ih,aDeg,fw,fh,s){
  const b=cropHalf(aDeg,fw,fh),lx=Math.max(0,iw/2-b.x/s),ly=Math.max(0,ih/2-b.y/s);
  return {x:Math.max(-lx,Math.min(lx,cx)),y:Math.max(-ly,Math.min(ly,cy))};
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
.pg-foto .pos{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}
.pg-foto .pad{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-top:8px}
.pg-foto .two{display:flex;gap:8px;align-items:center}
.pg-foto .two input[type=number]{flex:none;width:92px}
.pg-foto .two input[type=range]{flex:1}

/* anteprima: resta visibile sotto l'intestazione mentre si scorrono i comandi */
.pg-foto #fo-stage{position:relative;height:46vh;min-height:240px;max-height:520px;background:#0c0e10;touch-action:none;overflow:hidden;border:1px solid var(--line);border-radius:8px;margin:0 auto 10px;user-select:none;-webkit-user-select:none}
.pg-foto #fo-stage.stk{position:sticky;z-index:6;height:38vh;min-height:200px;box-shadow:0 8px 14px rgba(0,0,0,.45)}
.pg-foto #fo-cv{position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none}
.pg-foto #fo-empty{position:absolute;inset:0;display:grid;place-items:center;text-align:center;padding:20px;color:var(--text-dim);font-size:14px;pointer-events:none}
.pg-foto #fo-empty strong{display:block;color:var(--text);font-size:16px;margin-bottom:4px}
.pg-foto .fo-zoom{position:absolute;right:8px;top:8px;display:flex;flex-direction:column;gap:6px;z-index:2}
.pg-foto .fo-zoom button{min-width:44px;min-height:44px;border-radius:8px;border:1px solid var(--line2);background:#000b;color:#fff;font-size:20px;font-weight:700;cursor:pointer}
.pg-foto .fo-zoom button#fo-zfit{font-size:12px}
.pg-foto #fo-hint{position:absolute;left:8px;right:60px;bottom:8px;background:#000c;border:1px solid var(--line2);border-radius:6px;padding:5px 9px;font-size:13px;color:#fff;pointer-events:none}
.pg-foto .pop{position:fixed;inset:0;z-index:4000;background:rgba(0,0,0,.65);display:grid;place-items:center;padding:16px}
.pg-foto .popbox{background:var(--panel);border:1px solid var(--line2);border-radius:10px;padding:12px;width:min(92vw,420px)}
.pg-foto .pophead{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:10px}
.pg-foto .poprect{position:relative;width:100%;max-height:46vh;margin:0 auto;border:2px dashed var(--line2);border-radius:8px;background:var(--bg);display:grid;grid-template:1fr 1fr/1fr 1fr;padding:8px}
.pg-foto .poprect .btn{width:64px;min-height:64px;font-size:26px;padding:0}
.pg-foto .poprect .btn[data-p=tl]{justify-self:start;align-self:start}
.pg-foto .poprect .btn[data-p=tr]{justify-self:end;align-self:start}
.pg-foto .poprect .btn[data-p=bl]{justify-self:start;align-self:end}
.pg-foto .poprect .btn[data-p=br]{justify-self:end;align-self:end}
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
  <button type="button" class="btn pri big" data-go="2" id="fo-next1">Vai all'inquadratura</button>
  <button type="button" class="btn sm" id="fo-reset" style="margin-top:10px;width:100%">Reset dati</button>
</div>

<div class="panel" data-s="2" hidden>
  <div class="card"><h3>Inquadratura <span style="font-weight:400;color:var(--text-dim)">(facoltativa)</span></h3>
    <label class="f">Formato</label>
    <div class="chips" id="fo-asp" role="group" aria-label="Formato">
      <button type="button" class="btn sm on" data-a="orig">Originale</button><button type="button" class="btn sm" data-a="43">4:3</button><button type="button" class="btn sm" data-a="32">3:2</button><button type="button" class="btn sm" data-a="169">16:9</button><button type="button" class="btn sm" data-a="54">5:4</button><button type="button" class="btn sm" data-a="11">1:1</button><button type="button" class="btn sm" data-a="free">Libero</button>
    </div>
    <div class="row" style="margin-top:8px"><button type="button" class="btn sm" id="fo-orient">Orizzontale</button>
      <button type="button" class="btn sm" id="fo-rl" aria-label="Ruota di 90 gradi a sinistra">⟲ 90°</button>
      <button type="button" class="btn sm" id="fo-rr" aria-label="Ruota di 90 gradi a destra">⟳ 90°</button></div>
    <label class="f" for="fo-ct">Rotazione fine / raddrizza (gradi, passo 0,1)</label>
    <div class="two"><input type="range" id="fo-ct" min="-45" max="45" step="0.1"><input type="number" id="fo-ctn" min="-45" max="45" step="0.1" inputmode="decimal"></div>
    <div class="row" style="margin-top:6px"><button type="button" class="btn sm" data-tn="-1">−1°</button><button type="button" class="btn sm" data-tn="-0.1">−0,1°</button><button type="button" class="btn sm" data-tn="0.1">+0,1°</button><button type="button" class="btn sm" data-tn="1">+1°</button></div>
    <label class="f" for="fo-cm">Zoom (%)</label>
    <div class="two"><input type="range" id="fo-cm" min="100" max="800" step="5"><input type="number" id="fo-cmn" min="100" max="800" step="5" inputmode="decimal"></div>
    <div class="row" style="margin-top:10px"><button type="button" class="btn sm" id="fo-creset">Azzera inquadratura</button></div>
    <p class="sub">Trascina la foto per spostarla, due dita per zoom e rotazione. Con "Libero" trascini gli angoli del riquadro. Se non tocchi nulla la foto resta intera. Cambiando l'inquadratura i riquadri di sfocatura vanno rifatti, quindi conviene farla prima.</p>
  </div>
  <button type="button" class="btn pri big" data-go="3">Vai alla sfocatura</button>
</div>

<div class="panel" data-s="3" hidden>
  <div class="card"><h3>Volti</h3>
    <div class="row"><button type="button" class="btn pri" id="fo-faces">Trova volti</button></div>
    <p class="sub" id="fo-auto">Un riquadro sfocato per ogni volto trovato. Controlla sempre il risultato e correggi a mano: il riconoscimento può sbagliare. Targhe e marchi vanno segnati a mano (qui sotto, "Che cosa copri").</p>
  </div>
  <div class="card"><h3>Sfocatura a mano</h3>
    <div class="seg" id="fo-tools" role="group" aria-label="Strumento">
      <button type="button" data-t="sel" class="on">Seleziona</button><button type="button" data-t="rect">Rettangolo</button><button type="button" data-t="oval">Ovale</button><button type="button" data-t="free">A mano</button><button type="button" data-t="poly">Poligono</button>
    </div>
    <div class="row" id="fo-polybar" style="margin-top:8px" hidden>
      <button type="button" class="btn sm pri" id="fo-pclosepoly">Chiudi forma</button><button type="button" class="btn sm" id="fo-ppt">Annulla punto</button><button type="button" class="btn sm" id="fo-ppc">Cancella</button>
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
    <p class="sub">Con "Rettangolo" o "Ovale" trascini sulla foto per disegnare un riquadro; con "A mano" disegni col dito il contorno di una forma qualsiasi; con "Poligono" tocchi i vertici uno dopo l'altro e chiudi toccando il primo punto (o con "Chiudi forma"). Con "Seleziona" tocchi un riquadro per spostarlo o ridimensionarlo dagli angoli. Due dita: zoom e spostamento.</p>
  </div>
  <button type="button" class="btn pri big" data-go="4">Vai al logo</button>
</div>

<div class="panel" data-s="4" hidden>
  <div class="card"><h3>Logo CNVVF</h3>
    <label class="chk"><input type="checkbox" id="fo-lshow" checked> Mostra il logo</label>
    <div class="note warn" id="fo-lnote" hidden>Il logo non è stato trovato in images/CNVVF.png: ho messo un segnaposto. Scegli il file del logo qui sotto.</div>
    <button type="button" class="btn" id="fo-ppos" style="width:100%" aria-haspopup="dialog">Posizione: in alto a destra</button>
    <label class="chk" style="margin-top:14px"><input type="checkbox" id="fo-ledit"> Modifica logo</label>
    <p class="sub" id="fo-lsub">Predefinito: in alto a destra, 17% del lato corto, margine 4%. Con la spunta puoi trascinare il logo e regolare dimensione, margine e rotazione.</p>
    <div id="fo-ladv" hidden>
      <button type="button" class="btn sm" id="fo-ldef" style="width:100%;margin-bottom:4px">Ripristina predefiniti (alto a destra, 17%, 4%)</button>
      <label class="f" for="fo-lz">Dimensione (% del lato corto della foto)</label>
      <div class="two"><input type="range" id="fo-lz" min="2" max="80" step="1"><input type="number" id="fo-lzn" min="2" max="80" step="1" inputmode="decimal"></div>
      <label class="f" for="fo-lp">Margine dal bordo (% del lato corto)</label>
      <div class="two"><input type="range" id="fo-lp" min="0" max="15" step="0.5"><input type="number" id="fo-lpn" min="0" max="15" step="0.5" inputmode="decimal"></div>
      <label class="f" for="fo-lr">Rotazione (gradi)</label>
      <div class="two"><input type="range" id="fo-lr" min="-180" max="180" step="1"><input type="number" id="fo-lrn" min="-180" max="180" step="1" inputmode="decimal"></div>
      <div class="row" style="margin-top:6px"><button type="button" class="btn sm" data-r="-90">−90°</button><button type="button" class="btn sm" data-r="0">0°</button><button type="button" class="btn sm" data-r="90">+90°</button></div>
      <label class="f" for="fo-la">Trasparenza (visibilità %)</label>
      <div class="two"><input type="range" id="fo-la" min="20" max="100" step="5"><input type="number" id="fo-lan" min="20" max="100" step="5" inputmode="decimal"></div>
    </div>
    <div class="row" style="margin-top:12px"><label class="btn sm" for="fo-lfile">Scegli un altro logo</label><button type="button" class="btn sm" id="fo-lreset">Logo predefinito</button></div>
    <input id="fo-lfile" type="file" accept="image/*" hidden>
  </div>
  <div class="card"><h3>Salva</h3>
    <button type="button" class="btn pri big" id="fo-save">Salva foto (JPG)</button>
    <div class="row" style="margin-top:8px"><button type="button" class="btn" id="fo-share">Condividi</button></div>
    <p class="sub" id="fo-out"></p>
  </div>
</div>

<div id="fo-pop" class="pop" hidden role="dialog" aria-modal="true" aria-label="Posizione del logo">
  <div class="popbox">
    <div class="pophead"><strong>Posizione del logo</strong><button type="button" class="btn sm" id="fo-pclose">Chiudi</button></div>
    <div class="poprect" id="fo-prect">
      <button type="button" class="btn" data-p="tl" aria-label="In alto a sinistra">↖</button>
      <button type="button" class="btn" data-p="tr" aria-label="In alto a destra">↗</button>
      <button type="button" class="btn" data-p="bl" aria-label="In basso a sinistra">↙</button>
      <button type="button" class="btn" data-p="br" aria-label="In basso a destra">↘</button>
    </div>
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
  logo:{img:null,ar:0.5,ok:false,show:true,x:0.9,y:0.1,z:LOGO_DEF.z,r:LOGO_DEF.r,a:LOGO_DEF.a,corner:LOGO_DEF.corner,pad:LOGO_DEF.margin,lock:true},
  orig:null,crop:null,poly:[],view:{s:1,x:0,y:0},cw:0,ch:0,dpr:1,step:1,painting:false,busy:false
};
let cv,ctx,steps;

function loadLogoPrefs(){
  try{
    const j=JSON.parse(localStorage.getItem(KEY)||'null');
    if(j){
      if(Number.isFinite(j.a))S.logo.a=clamp(j.a,20,100);
      if(typeof j.show==='boolean')S.logo.show=j.show;
    }
  }catch(e){}
}
function saveLogoPrefs(){
  try{const l=S.logo;localStorage.setItem(KEY,JSON.stringify({a:l.a,show:l.show}));}catch(e){}
}
function resetLogo(){Object.assign(S.logo,{z:LOGO_DEF.z,pad:LOGO_DEF.margin,r:LOGO_DEF.r,corner:LOGO_DEF.corner});}
function setLock(v){S.logo.lock=v;uiLogo();paint();}

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

/* se il logo è agganciato a un angolo lo si riposiziona (cambio foto, dimensione, rotazione) */
function snapCorner(){
  const l=S.logo;if(!l.corner||!S.W)return;
  const p=logoPreset(l.corner,l,S.W,S.H,l.pad);l.x=p.x;l.y=p.y;
}

/* ---------------- disegno ---------------- */
function drawLogo(g,scale){
  const l=S.logo;if(!l.show||!l.img)return;
  const w=l.z*Math.min(S.W,S.H)*scale,h=w*l.ar;
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
  else if(rg.shape==='free'){rg.pts.forEach((q,i)=>{const X=q[0]*S.W*scale,Y=q[1]*S.H*scale;if(i)g.lineTo(X,Y);else g.moveTo(X,Y);});g.closePath();}
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
  const s=Math.min(S.cw/S.W,S.ch/S.H);
  S.view={s,x:(S.cw-S.W*s)/2,y:(S.ch-S.H*s)/2};
}
function paint(){
  if(S.painting)return;
  S.painting=true;
  requestAnimationFrame(()=>{S.painting=false;draw();});
}
function pathRegion(g,rg){
  if(rg.shape==='free'){g.beginPath();rg.pts.forEach((q,i)=>{const a=toScr({x:q[0]*S.W,y:q[1]*S.H});if(i)g.lineTo(a.x,a.y);else g.moveTo(a.x,a.y);});g.closePath();return;}
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
  if(S.step===2&&S.orig){drawCrop(g);return;}
  if(!S.comp)rebuildComp();
  g.save();g.translate(S.view.x,S.view.y);g.scale(S.view.s,S.view.s);
  g.imageSmoothingQuality='high';
  g.drawImage(S.comp,0,0);
  drawLogo(g,1);
  g.restore();
  /* sovrapposizioni (non finiscono nel file salvato) */
  if(S.step===3){
    S.regions.forEach((rg,i)=>{
      pathRegion(g,rg);
      g.lineWidth=i===S.sel?3:1.5;g.strokeStyle=i===S.sel?'#ffd400':'rgba(255,255,255,.85)';
      g.setLineDash(i===S.sel?[]:[6,4]);g.stroke();g.setLineDash([]);
    });
    if(S.draft){if(S.draft.shape==='free'&&!S.draft.pts)S.draft=null;}
    if(S.draft){pathRegion(g,S.draft);g.lineWidth=2;g.strokeStyle='#ffd400';g.setLineDash([6,4]);g.stroke();g.setLineDash([]);}
    if(S.tool==='poly'&&S.poly.length){
      g.beginPath();S.poly.forEach((q,i)=>{const a=toScr({x:q[0]*S.W,y:q[1]*S.H});if(i)g.lineTo(a.x,a.y);else g.moveTo(a.x,a.y);});
      g.lineWidth=2;g.strokeStyle='#ffd400';g.setLineDash([6,4]);g.stroke();g.setLineDash([]);
      S.poly.forEach((q,i)=>{const a=toScr({x:q[0]*S.W,y:q[1]*S.H});g.beginPath();g.arc(a.x,a.y,i===0?9:5,0,Math.PI*2);g.fillStyle=i===0?'#ffd400':'#fff';g.fill();g.lineWidth=2;g.strokeStyle='#000';g.stroke();});
    }
    if(S.sel>=0&&S.regions[S.sel]){
      corners(S.regions[S.sel]).forEach(c=>{g.fillStyle='#ffd400';g.strokeStyle='#000';g.lineWidth=2;g.beginPath();g.rect(c.x-9,c.y-9,18,18);g.fill();g.stroke();});
    }
  }
  if(S.step===4&&S.logo.show&&S.logo.img&&!S.logo.lock){
    const l=S.logo,c=toScr({x:l.x*S.W,y:l.y*S.H}),w=l.z*Math.min(S.W,S.H)*S.view.s,h=w*l.ar;
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
/* poligono: un tocco aggiunge un vertice; si chiude toccando il primo o con "Chiudi forma" */
function polyAdd(ip){
  const q=[clamp(ip.x,0,S.W)/S.W,clamp(ip.y,0,S.H)/S.H];
  if(S.poly.length>=3){
    const f=toScr({x:S.poly[0][0]*S.W,y:S.poly[0][1]*S.H}),c=toScr({x:q[0]*S.W,y:q[1]*S.H});
    if(Math.hypot(f.x-c.x,f.y-c.y)<=22){polyClose();return;}
  }
  S.poly.push(q);uiRegions();paint();
}
function polyClose(){
  if(S.poly.length<3){toast('Servono almeno 3 punti.');return;}
  const pts=S.poly.slice(),bb=bboxPts(pts);S.poly=[];
  if(bb.w*S.W*S.view.s<10||bb.h*S.H*S.view.s<10){uiRegions();paint();return;}
  snap();S.regions.push({...bb,shape:'free',pts,kind:S.kind,s:S.str});S.sel=S.regions.length-1;changed();
}
function changed(){rebuildComp();uiRegions();paint();}

/* ---------------- foto e inquadratura ---------------- */
/* base di lavoro: foto originale oppure risultato dell'inquadratura; riquadri e logo si riferiscono a lei */
function setBase(src,w,h){
  S.img=src;S.iw=w;S.ih=h;
  const k=Math.min(1,WORK_MAX/Math.max(w,h));
  S.W=Math.max(1,Math.round(w*k));S.H=Math.max(1,Math.round(h*k));
  S.comp=null;S.regions=[];S.sel=-1;S.hist=[];S.draft=null;S.poly=[];
  $('#fo-info').textContent='Foto '+w+' × '+h+' px. Salvando si tolgono i dati nascosti (EXIF), posizione GPS compresa.';
  snapCorner();
}
function cropKey(){const c=S.crop;return JSON.stringify([c.q,c.t,c.asp,c.land,Math.round(c.m*1000),Math.round(c.cx),Math.round(c.cy),Math.round(c.fx*1000),Math.round(c.fy*1000)]);}
function cropIdentity(){const c=S.crop;return c.q===0&&c.t===0&&c.asp==='orig'&&c.m===1&&c.cx===0&&c.cy===0&&c.fx===1&&c.fy===1;}
const ASP={'43':4/3,'32':3/2,'169':16/9,'54':5/4};
function cropAspect(){
  const c=S.crop,O=S.orig;
  if(c.asp==='orig'||c.asp==='free')return c.q%2?O.h/O.w:O.w/O.h;
  if(c.asp==='11')return 1;
  const v=ASP[c.asp];
  return c.land?v:1/v;
}
/* riquadro di riferimento per lo zoom: quello del formato scelto, oppure tutta l'area per "Libero" */
function cropRef(){
  if(S.crop.asp==='free')return {w:Math.max(10,S.cw-32),h:Math.max(10,S.ch-32)};
  return cropFrame(cropAspect(),S.cw,S.ch,16);
}
function cropFrameNow(){
  const c=S.crop,r=cropRef();
  if(c.asp==='free')return {w:Math.max(30,r.w*c.fx),h:Math.max(30,r.h*c.fy)};
  return r;
}
function cropGeom(){
  const O=S.orig,c=S.crop,a=c.q*90+c.t,ref=cropRef(),fr=cropFrameNow();
  const sRef=cropMinScale(O.w,O.h,a,ref.w,ref.h),mmin=cropMinScale(O.w,O.h,a,fr.w,fr.h)/sRef;
  c.m=clamp(c.m,mmin,8);
  const s=sRef*c.m,cc=cropClampCenter(c.cx,c.cy,O.w,O.h,a,fr.w,fr.h,s);c.cx=cc.x;c.cy=cc.y;
  return {fw:fr.w,fh:fr.h,s,a,mmin};
}
function applyCrop(){
  const O=S.orig,c=S.crop;
  if(cropIdentity()){setBase(O.img,O.w,O.h);}
  else{
    const g0=cropGeom(),ow=Math.max(1,Math.round(g0.fw/g0.s)),oh=Math.max(1,Math.round(g0.fh/g0.s));
    const k=Math.min(1,EXPORT_MAX/Math.max(ow,oh)),cvs=document.createElement('canvas');
    cvs.width=Math.max(1,Math.round(ow*k));cvs.height=Math.max(1,Math.round(oh*k));
    const g=cvs.getContext('2d');
    g.translate(cvs.width/2,cvs.height/2);g.scale(k,k);g.rotate(g0.a*D2R);g.translate(-c.cx,-c.cy);
    g.drawImage(O.img,-O.w/2,-O.h/2,O.w,O.h);
    setBase(cvs,cvs.width,cvs.height);
  }
  c.applied=cropKey();
  steps.mark(2,!cropIdentity());
  fitView();uiLogo();
}
function drawCrop(g){
  const O=S.orig,c=S.crop,q=cropGeom(),fx=(S.cw-q.fw)/2,fy=(S.ch-q.fh)/2;
  g.save();g.translate(S.cw/2,S.ch/2);g.rotate(q.a*D2R);g.scale(q.s,q.s);g.translate(-c.cx,-c.cy);
  g.drawImage(O.img,-O.w/2,-O.h/2,O.w,O.h);g.restore();
  g.fillStyle='rgba(0,0,0,.62)';g.beginPath();g.rect(0,0,S.cw,S.ch);g.rect(fx,fy,q.fw,q.fh);g.fill('evenodd');
  g.strokeStyle='#ffd400';g.lineWidth=2;g.strokeRect(fx,fy,q.fw,q.fh);
  g.strokeStyle='rgba(255,255,255,.35)';g.lineWidth=1;g.beginPath();
  for(let i=1;i<3;i++){g.moveTo(fx+q.fw*i/3,fy);g.lineTo(fx+q.fw*i/3,fy+q.fh);g.moveTo(fx,fy+q.fh*i/3);g.lineTo(fx+q.fw,fy+q.fh*i/3);}
  g.stroke();
  if(c.asp==='free')cropHandles(q).forEach(h=>{g.fillStyle='#ffd400';g.strokeStyle='#000';g.lineWidth=2;g.beginPath();g.rect(h.x-9,h.y-9,18,18);g.fill();g.stroke();});
}
function cropHandles(q){
  const fx=(S.cw-q.fw)/2,fy=(S.ch-q.fh)/2;
  return [{x:fx,y:fy},{x:fx+q.fw,y:fy},{x:fx+q.fw,y:fy+q.fh},{x:fx,y:fy+q.fh}];
}
function cropChanged(){uiCrop();paint();}
function uiCrop(){
  const c=S.crop;if(!c)return;
  $$('#fo-asp button').forEach(b=>b.classList.toggle('on',b.dataset.a===c.asp));
  const ob=$('#fo-orient');ob.disabled=!ASP[c.asp];ob.textContent=c.land?'Orizzontale':'Verticale';
  $('#fo-ct').value=c.t;$('#fo-ctn').value=c.t;
  let mm=1;if(S.cw>0){try{mm=cropGeom().mmin;}catch(e){}}
  const mn=Math.max(5,Math.floor(Math.min(1,mm)*100));$('#fo-cm').min=mn;$('#fo-cmn').min=mn;
  const z=Math.round(c.m*100);$('#fo-cm').value=z;$('#fo-cmn').value=z;
}
function cropZoom(f){S.crop.m=clamp(S.crop.m*f,0.05,8);cropChanged();}

function loadPhoto(file){
  const url=URL.createObjectURL(file);
  const im=new Image();
  im.onload=()=>{
    const w=im.naturalWidth||im.width,h=im.naturalHeight||im.height;
    S.orig={img:im,w,h};S.crop={q:0,t:0,asp:'orig',land:w>=h,m:1,cx:0,cy:0,fx:1,fy:1,applied:''};
    resetLogo();S.logo.lock=true;
    setBase(im,w,h);S.crop.applied=cropKey();
    $('#fo-empty').hidden=true;
    resize();fitView();uiCrop();uiRegions();uiLogo();syncSticky();paint();
    steps.mark(1,true);steps.mark(2,false);
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
  if(S.step===2){cropZoom(f);return;}
  sp=sp||{x:S.cw/2,y:S.ch/2};S.vt=true;
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
  if(S.step===2&&S.crop.asp==='free'){
    const q=cropGeom(),hs=cropHandles(q);
    if(hs.some(h=>Math.hypot(h.x-sp.x,h.y-sp.y)<=26)){gest={t:'cresize'};return;}
  }
  if(S.step===2){gest={t:'cpan',sx:sp.x,sy:sp.y,cx0:S.crop.cx,cy0:S.crop.cy};return;}
  if(S.step===3){
    if(S.tool==='sel'){
      const h=handleAt(sp);
      if(h>=0){
        const rg=S.regions[S.sel],r=regionRect(rg,S.W,S.H),cs=[{x:r.x,y:r.y},{x:r.x+r.w,y:r.y},{x:r.x+r.w,y:r.y+r.h},{x:r.x,y:r.y+r.h}];
        gest={t:'resize',anchor:cs[(h+2)%4],moved:false,r0:{...rg,pts:rg.pts&&rg.pts.map(q=>q.slice())}};return;
      }
      const i=regionAt(ip);
      if(i>=0){S.sel=i;uiRegions();gest={t:'move',i,ox:ip.x,oy:ip.y,r0:{...S.regions[i]},moved:false};paint();return;}
      S.sel=-1;uiRegions();gest={t:'pan',sx:sp.x,sy:sp.y,vx:S.view.x,vy:S.view.y};paint();return;
    }
    if(S.tool==='poly'){gest={t:'polytap',s0:sp,sx:sp.x,sy:sp.y,vx:S.view.x,vy:S.view.y,moved:false};return;}
    if(S.tool==='free'){gest={t:'lasso',pts:[[ip.x,ip.y]],s0:sp};S.draft={shape:'free',pts:[[ip.x/S.W,ip.y/S.H]]};paint();return;}
    gest={t:'draw',p0:ip,s0:sp};return;
  }
  if(S.step===4&&S.logo.show&&!S.logo.lock&&logoHit(S.logo,ip.x,ip.y,S.W,S.H)){
    S.logo.corner=null;uiLogo();gest={t:'logo',ox:ip.x,oy:ip.y,x0:S.logo.x,y0:S.logo.y};return;
  }
  gest={t:'pan',sx:sp.x,sy:sp.y,vx:S.view.x,vy:S.view.y};
}
function startPinch(){
  const [a,b]=[...ptr.values()];
  if(gest&&(gest.t==='draw'||gest.t==='lasso')){S.draft=null;}
  const mid=toImg({x:(a.x+b.x)/2,y:(a.y+b.y)/2});
  const onLogo=S.step===4&&S.logo.show&&!S.logo.lock&&logoHit(S.logo,mid.x,mid.y,S.W,S.H);
  gest={t:'pinch',d0:Math.hypot(b.x-a.x,b.y-a.y)||1,a0:Math.atan2(b.y-a.y,b.x-a.x),m0:{x:(a.x+b.x)/2,y:(a.y+b.y)/2},
    v0:{...S.view},z0:S.logo.z,r0:S.logo.r,onLogo,onCrop:S.step===2,m0c:S.crop?S.crop.m:1,t0c:S.crop?S.crop.t:0};
  paint();
}
function onMove(e){
  if(!ptr.has(e.pointerId))return;
  ptr.set(e.pointerId,cpos(e));
  if(!gest)return;
  if(gest.t==='pinch'&&ptr.size>=2){
    const [a,b]=[...ptr.values()],d=Math.hypot(b.x-a.x,b.y-a.y)||1,ang=Math.atan2(b.y-a.y,b.x-a.x),m={x:(a.x+b.x)/2,y:(a.y+b.y)/2};
    if(gest.onCrop){
      S.crop.m=clamp(gest.m0c*d/gest.d0,0.05,8);
      S.crop.t=clamp(Math.round((gest.t0c+(ang-gest.a0)/D2R)*10)/10,-45,45);
      cropChanged();
    }else if(gest.onLogo){
      S.logo.z=clamp(gest.z0*d/gest.d0,0.02,0.8);snapCorner();
      S.logo.r=Math.round(((gest.r0+(ang-gest.a0)/D2R+540)%360)-180);snapCorner();
      uiLogo();saveLogoPrefs();paint();
    }else{
      S.vt=true;const k=clamp(gest.v0.s*d/gest.d0,0.1,12)/gest.v0.s;
      S.view.s=gest.v0.s*k;
      S.view.x=m.x-(gest.m0.x-gest.v0.x)*k;S.view.y=m.y-(gest.m0.y-gest.v0.y)*k;
      paint();
    }
    return;
  }
  const sp=cpos(e),ip=toImg(sp);
  if(gest.t==='polytap'){
    if(!gest.moved&&Math.hypot(sp.x-gest.s0.x,sp.y-gest.s0.y)>8)gest.moved=true;
    if(gest.moved){S.vt=true;S.view.x=gest.vx+(sp.x-gest.sx);S.view.y=gest.vy+(sp.y-gest.sy);paint();}
  }else if(gest.t==='cresize'){
    const r=cropRef();
    S.crop.fx=clamp(2*Math.abs(sp.x-S.cw/2)/r.w,0.1,1);S.crop.fy=clamp(2*Math.abs(sp.y-S.ch/2)/r.h,0.1,1);
    cropChanged();
  }else if(gest.t==='cpan'){
    const q=cropGeom(),a=q.a*D2R,dx=sp.x-gest.sx,dy=sp.y-gest.sy;
    S.crop.cx=gest.cx0-(dx*Math.cos(a)+dy*Math.sin(a))/q.s;
    S.crop.cy=gest.cy0-(-dx*Math.sin(a)+dy*Math.cos(a))/q.s;
    paint();
  }else if(gest.t==='pan'){S.vt=true;S.view.x=gest.vx+(sp.x-gest.sx);S.view.y=gest.vy+(sp.y-gest.sy);paint();}
  else if(gest.t==='logo'){
    S.logo.x=clamp(gest.x0+(ip.x-gest.ox)/S.W,0,1);S.logo.y=clamp(gest.y0+(ip.y-gest.oy)/S.H,0,1);
    saveLogoPrefs();paint();
  }else if(gest.t==='move'){
    if(!gest.moved){snap();gest.moved=true;}
    const rg=S.regions[gest.i];
    rg.x=clamp(gest.r0.x+(ip.x-gest.ox)/S.W,0,1-rg.w);rg.y=clamp(gest.r0.y+(ip.y-gest.oy)/S.H,0,1-rg.h);
    if(rg.shape==='free'){const dx=rg.x-gest.r0.x,dy=rg.y-gest.r0.y;rg.pts=gest.r0.pts.map(q=>[q[0]+dx,q[1]+dy]);}
    rebuildComp();paint();
  }else if(gest.t==='resize'){
    if(!gest.moved){snap();gest.moved=true;}
    const rg=S.regions[S.sel],ax=gest.anchor.x,ay=gest.anchor.y;
    const x0=clamp(Math.min(ax,ip.x),0,S.W),x1=clamp(Math.max(ax,ip.x),0,S.W),y0=clamp(Math.min(ay,ip.y),0,S.H),y1=clamp(Math.max(ay,ip.y),0,S.H);
    rg.x=x0/S.W;rg.y=y0/S.H;rg.w=Math.max(0.005,(x1-x0)/S.W);rg.h=Math.max(0.005,(y1-y0)/S.H);
    if(rg.shape==='free'&&gest.r0.pts){const o=gest.r0;rg.pts=o.pts.map(q=>[rg.x+(q[0]-o.x)/Math.max(1e-6,o.w)*rg.w,rg.y+(q[1]-o.y)/Math.max(1e-6,o.h)*rg.h]);}
    rebuildComp();paint();
  }else if(gest.t==='lasso'){
    const px=clamp(ip.x,0,S.W),py=clamp(ip.y,0,S.H),l=gest.pts[gest.pts.length-1];
    if(Math.hypot(px-l[0],py-l[1])*S.view.s>=3){gest.pts.push([px,py]);S.draft={shape:'free',pts:gest.pts.map(q=>[q[0]/S.W,q[1]/S.H])};paint();}
  }else if(gest.t==='draw'){
    const x0=clamp(Math.min(gest.p0.x,ip.x),0,S.W),x1=clamp(Math.max(gest.p0.x,ip.x),0,S.W),y0=clamp(Math.min(gest.p0.y,ip.y),0,S.H),y1=clamp(Math.max(gest.p0.y,ip.y),0,S.H);
    S.draft={x:x0/S.W,y:y0/S.H,w:(x1-x0)/S.W,h:(y1-y0)/S.H,shape:S.tool};
    paint();
  }
}
function onUp(e){
  if(!ptr.has(e.pointerId))return;
  const sp=cpos(e);ptr.delete(e.pointerId);
  if(gest&&gest.t==='polytap'){
    if(!gest.moved)polyAdd(toImg(sp));
  }else if(gest&&gest.t==='lasso'){
    S.draft=null;
    let pts=thinPts(gest.pts.map(q=>[q[0]/S.W,q[1]/S.H]),3/Math.max(S.W*S.view.s,1));
    const bb=pts.length>=3?bboxPts(pts):null;
    if(bb&&bb.w*S.W*S.view.s>=10&&bb.h*S.H*S.view.s>=10){
      snap();S.regions.push({...bb,shape:'free',pts,kind:S.kind,s:S.str});S.sel=S.regions.length-1;changed();
    }else paint();
  }else if(gest&&gest.t==='draw'&&S.draft){
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
  $('#fo-shape').disabled=!sel||sel.shape==='free';$('#fo-dup').disabled=!sel;$('#fo-del').disabled=!sel;$('#fo-undo').disabled=!S.hist.length;
  $('#fo-shape').textContent=sel?(sel.shape==='free'?'Forma: a mano':sel.shape==='oval'?'Forma: ovale':'Forma: rettangolo'):'Forma';
  $$('#fo-str button').forEach(b=>b.classList.toggle('on',b.dataset.v===(sel?sel.s:S.str)));
  if(sel)$('#fo-kind').value=sel.kind;
  $('#fo-polybar').hidden=S.tool!=='poly';
  $('#fo-pclosepoly').disabled=S.poly.length<3;$('#fo-ppt').disabled=!S.poly.length;$('#fo-ppc').disabled=!S.poly.length;
  $$('#fo-tools button').forEach(b=>b.classList.toggle('on',b.dataset.t===S.tool));
  steps&&steps.mark(3,S.regions.length>0);
  const h=$('#fo-hint');
  if(S.step===2&&S.img){h.hidden=false;h.textContent='Trascina per spostare; due dita per zoom e rotazione';}
  else if(S.step===3&&S.img){
    h.hidden=false;
    h.textContent=S.tool==='sel'?(S.sel>=0?'Trascina per spostare, gli angoli per ridimensionare':'Tocca un riquadro, oppure scegli Rettangolo o Ovale per disegnarne uno'):(S.tool==='free'?'Disegna col dito il contorno da sfocare':S.tool==='poly'?(S.poly.length<3?'Tocca i vertici uno dopo l\'altro ('+S.poly.length+')':'Tocca il primo punto o "Chiudi forma" per finire'):'Trascina sulla foto per disegnare il riquadro');
  }else if(S.step===4&&S.img){h.hidden=false;h.textContent=S.logo.lock?'Logo fisso. Spunta "Modifica logo" per spostarlo':'Trascina il logo; due dita sul logo: dimensione e rotazione';}
  else h.hidden=true;
}
function uiLogo(){
  const l=S.logo,p1=v=>Math.round(v*10)/10;
  $('#fo-lshow').checked=l.show;
  $('#fo-lz').value=Math.round(l.z*100);$('#fo-lzn').value=Math.round(l.z*100);
  $('#fo-lp').value=p1(l.pad*100);$('#fo-lpn').value=p1(l.pad*100);
  $('#fo-lr').value=Math.round(l.r);$('#fo-lrn').value=Math.round(l.r);
  $('#fo-la').value=l.a;$('#fo-lan').value=l.a;
  $('#fo-lnote').hidden=l.ok;
  $('#fo-ledit').checked=!l.lock;$('#fo-ladv').hidden=l.lock;
  $('#fo-ppos').textContent='Posizione: '+(CORNERS[l.corner]||'personalizzata');
  $$('#fo-prect button').forEach(b=>b.classList.toggle('pri',b.dataset.p===l.corner));
  if(S.step===4)uiRegions();
}
/* l'anteprima prende le proporzioni della foto: niente bordi neri, il logo si allinea ai bordi veri dell'immagine */
function layoutStage(){
  const st=$('#fo-stage');if(!st)return;
  if(!S.img||S.step===2){st.style.width='';st.style.height='';st.style.minHeight='';st.style.maxHeight='';return;}
  st.style.width='';st.style.minHeight='0';st.style.maxHeight='none';
  const fullW=st.getBoundingClientRect().width||S.cw||320;
  const maxH=(window.innerHeight||700)*(S.step>1?0.4:0.5);
  let h=fullW*S.H/S.W,w=fullW;
  if(h>maxH){h=maxH;w=h*S.W/S.H;}
  st.style.width=Math.round(w)+'px';st.style.height=Math.round(h)+'px';
}
function syncSticky(){
  const on=!!S.img&&S.step>1,st=$('#fo-stage');
  st.classList.toggle('stk',on);
  const hd=document.querySelector('.foh');
  st.style.top=on?((hd?hd.offsetHeight:0)+'px'):'';
  layoutStage();S.vt=false;resize();fitView();paint();
  requestAnimationFrame(()=>{layoutStage();resize();if(!S.vt)fitView();paint();});
}
function setupSteps(){
  const labels=['Foto','Inquadra','Sfocatura','Logo e salvataggio'],bar=$('#fo-steps');
  bar.innerHTML=labels.map((l,i)=>`<button type="button" class="step" data-s="${i+1}" aria-label="Passo ${i+1} di ${labels.length}: ${l}"></button>`).join('');
  const lab=document.createElement('div');lab.className='steplabel';bar.after(lab);
  const api={
    go(n){
      if(n>1&&!S.img){toast('Carica prima una foto.');n=1;}
      if(n>2&&S.crop&&S.crop.applied!==cropKey()){
        if(S.regions.length&&!confirm("Cambiando l'inquadratura i riquadri di sfocatura vengono cancellati. Continuare?"))return;
        applyCrop();
      }
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
    if(navigator.canShare&&navigator.canShare({files:[f]}))await navigator.share({files:[f],title:'Co.Em. FireOps'});
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
  $('#fo-zin').onclick=()=>zoomAt(1.4);$('#fo-zout').onclick=()=>zoomAt(1/1.4);$('#fo-zfit').onclick=()=>{if(S.step===2&&S.crop){S.crop.m=1;S.crop.cx=0;S.crop.cy=0;cropChanged();}else{S.vt=false;fitView();paint();}};
  if(typeof ResizeObserver==='function')new ResizeObserver(()=>{resize();if(!S.vt)fitView();paint();}).observe($('#fo-stage'));
  window.addEventListener('resize',()=>{layoutStage();resize();if(!S.vt)fitView();paint();});

  /* inquadratura */
  const C=()=>S.crop;
  $('#fo-asp').addEventListener('click',e=>{const b=e.target.closest('button');if(!b||!C())return;const c=C(),a=b.dataset.a;
    if(a==='free'&&c.asp!=='free'){
      const g=cropGeom();c.asp='free';const r=cropRef();
      c.fx=clamp(g.fw/r.w,0.1,1);c.fy=clamp(g.fh/r.h,0.1,1);
      c.m=g.s/cropMinScale(S.orig.w,S.orig.h,c.q*90+c.t,r.w,r.h);
    }else if(a!==c.asp){c.asp=a;c.fx=1;c.fy=1;c.m=1;c.cx=0;c.cy=0;}
    cropChanged();});
  $('#fo-orient').onclick=()=>{if(!C())return;C().land=!C().land;C().m=1;C().cx=0;C().cy=0;cropChanged();};
  $('#fo-rl').onclick=()=>{if(!C())return;C().q=(C().q+3)%4;C().m=1;C().fx=1;C().fy=1;C().cx=0;C().cy=0;cropChanged();};
  $('#fo-rr').onclick=()=>{if(!C())return;C().q=(C().q+1)%4;C().m=1;C().fx=1;C().fy=1;C().cx=0;C().cy=0;cropChanged();};
  const cnum=(id,fn)=>$(id).addEventListener('input',e=>{const v=parseFloat(String(e.target.value).replace(',','.'));if(C()&&Number.isFinite(v)){fn(v);cropChanged();}});
  $$('[data-tn]').forEach(b=>b.addEventListener('click',()=>{if(!C())return;C().t=clamp(Math.round((C().t+parseFloat(b.dataset.tn))*10)/10,-45,45);cropChanged();}));
  cnum('#fo-ct',v=>{C().t=clamp(v,-45,45);});cnum('#fo-ctn',v=>{C().t=clamp(v,-45,45);});
  cnum('#fo-cm',v=>{C().m=clamp(v/100,0.05,8);});cnum('#fo-cmn',v=>{C().m=clamp(v/100,0.05,8);});
  $('#fo-creset').onclick=()=>{if(!C())return;Object.assign(C(),{q:0,t:0,asp:'orig',m:1,cx:0,cy:0,fx:1,fy:1,land:S.orig.w>=S.orig.h});cropChanged();};

  /* riquadri */
  $('#fo-faces').onclick=findFaces;
  $('#fo-tools').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;S.tool=b.dataset.t;if(S.tool!=='poly')S.poly=[];uiRegions();paint();});
  $('#fo-kind').onchange=e=>{S.kind=e.target.value;const rg=S.regions[S.sel];if(rg){snap();rg.kind=S.kind;uiRegions();}};
  $('#fo-str').addEventListener('click',e=>{
    const b=e.target.closest('button');if(!b)return;
    S.str=b.dataset.v;const rg=S.regions[S.sel];
    if(rg){snap();rg.s=S.str;changed();}else uiRegions();
  });
  $('#fo-regs').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;S.sel=+b.dataset.i;S.tool='sel';uiRegions();paint();});
  $('#fo-shape').onclick=()=>{const rg=S.regions[S.sel];if(!rg)return;if(rg.shape==='free')return;snap();rg.shape=rg.shape==='oval'?'rect':'oval';changed();};
  $('#fo-dup').onclick=()=>{
    const rg=S.regions[S.sel];if(!rg)return;snap();
    const n={...rg,x:clamp(rg.x+0.03,0,1-rg.w),y:clamp(rg.y+0.03,0,1-rg.h)};
    if(rg.pts){const dx=n.x-rg.x,dy=n.y-rg.y;n.pts=rg.pts.map(q=>[q[0]+dx,q[1]+dy]);}S.regions.push(n);S.sel=S.regions.length-1;changed();
  };
  $('#fo-del').onclick=()=>{if(S.sel<0)return;snap();S.regions.splice(S.sel,1);S.sel=-1;changed();};
  $('#fo-undo').onclick=undo;
  $('#fo-pclosepoly').onclick=polyClose;
  $('#fo-ppt').onclick=()=>{S.poly.pop();uiRegions();paint();};
  $('#fo-ppc').onclick=()=>{S.poly=[];uiRegions();paint();};

  /* logo */
  const L=S.logo,upd=()=>{snapCorner();uiLogo();saveLogoPrefs();paint();};
  $('#fo-lshow').onchange=e=>{L.show=e.target.checked;upd();};
  const pop=$('#fo-pop');
  const openPop=()=>{
    if(!S.img){toast('Carica prima una foto.');return;}
    const r=$('#fo-prect');r.style.aspectRatio=(S.W/S.H).toFixed(3);r.style.width=(S.W>=S.H?'100%':Math.max(40,Math.round(100*S.W/S.H))+'%');
    pop.hidden=false;const f=$('#fo-prect .pri')||$('#fo-prect button');f&&f.focus();
  };
  const closePop=()=>{pop.hidden=true;$('#fo-ppos').focus();};
  $('#fo-ppos').onclick=openPop;$('#fo-pclose').onclick=closePop;
  pop.addEventListener('click',e=>{if(e.target===pop)closePop();});
  root.addEventListener('keydown',e=>{if(e.key==='Escape'&&!pop.hidden)closePop();});
  $('#fo-prect').addEventListener('click',e=>{
    const b=e.target.closest('button');if(!b)return;
    L.corner=b.dataset.p;upd();closePop();
  });
  $('#fo-ledit').onchange=e=>setLock(!e.target.checked);
  $('#fo-ldef').onclick=()=>{resetLogo();snapCorner();uiLogo();saveLogoPrefs();paint();};
  const num=(id,fn)=>{const f=e=>{const v=parseFloat(String(e.target.value).replace(',','.'));if(Number.isFinite(v)){fn(v);upd();}};$(id).addEventListener('input',f);};
  num('#fo-lp',v=>{L.pad=clamp(v/100,0,0.2);});num('#fo-lpn',v=>{L.pad=clamp(v/100,0,0.2);});
  num('#fo-lz',v=>{L.z=clamp(v/100,0.02,0.8);});num('#fo-lzn',v=>{L.z=clamp(v/100,0.02,0.8);});
  num('#fo-lr',v=>{L.r=clamp(Math.round(v),-180,180);});num('#fo-lrn',v=>{L.r=clamp(Math.round(v),-180,180);});
  num('#fo-la',v=>{L.a=clamp(Math.round(v),20,100);});num('#fo-lan',v=>{L.a=clamp(Math.round(v),20,100);});
  $$('[data-r]').forEach(b=>b.addEventListener('click',()=>{L.r=+b.dataset.r;upd();}));
  $('#fo-lfile').onchange=e=>{
    const f=e.target.files[0];e.target.value='';if(!f)return;
    const u=URL.createObjectURL(f);
    tryImage(u).then(im=>{L.img=im;L.ar=(im.naturalHeight||im.height)/(im.naturalWidth||im.width)||0.5;L.ok=true;upd();}).catch(()=>toast('Non riesco ad aprire questo logo.'));
  };
  $('#fo-lreset').onclick=()=>{L.show=true;L.a=LOGO_DEF.a;resetLogo();snapCorner();loadLogo();};
  $('#fo-save').onclick=save;$('#fo-share').onclick=share;
  $('#fo-reset').onclick=()=>{
    if(S.img&&!confirm('Cancellare foto, sfocature e inquadratura?'))return;
    Object.assign(S,{img:null,iw:0,ih:0,W:0,H:0,comp:null,regions:[],sel:-1,hist:[],tool:'sel',orig:null,crop:null,poly:[],draft:null,view:{s:1,x:0,y:0}});
    resetLogo();S.logo.lock=true;S.logo.show=true;S.logo.a=LOGO_DEF.a;
    $('#fo-empty').hidden=false;
    $('#fo-info').textContent='La foto resta sul telefono: non viene inviata a nessuno. Salvando si tolgono i dati nascosti (EXIF), posizione GPS compresa.';
    [1,2,3,4].forEach(n=>steps.mark(n,false));
    try{uiCrop();uiRegions();uiLogo();}catch(e){}
    steps.go(1);paint();toast('Dati azzerati.');
  };

  uiLogo();uiRegions();steps.go(1);
  loadLogo();
  FireOps.onShow('foto',()=>{resize();fitView();paint();});
}

FireOps.registra({id:'foto',css:CSS,html:HTML,init(sec){root=sec;setup();}});
})();