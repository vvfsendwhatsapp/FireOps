/* FireOps VVF - vista 3D condivisa dai moduli SAF (scala): proiezione prospettica fatta a mano, nessuna libreria.
 * x destra, y profondita' (positivo = lontano), z su; camera sopra il piano. Si ruota col dito o col mouse, pizzico o rotella per lo zoom.
 *   const v = SafVista3D.crea(canvas, {punti: () => [[x,y,z], ...], disegna: c => {...}});
 *   c = {ctx, w, h, pr(q) -> [px, py, f], linea(a, b, col, lw, dash), chiaro(f), raggio, centro}
 *   v.disegna(); v.vista(yaw, pitch); v.zoom(fattore);
 */
(function () {
  "use strict";
  window.SafVista3D = {
    crea(cv, opz) {
      const ctx = cv.getContext("2d");
      let yaw = -0.7, pitch = 0.45, zoom = 1, man = [], ultimoC = null, presa = null, px0 = 0, py0 = 0, sposta = false, ptrDest = false;
      const proietta = (pt, c) => {
        const x = pt[0] - c[0], y = pt[1] - c[1], z = pt[2] - c[2];
        const cy = Math.cos(yaw), sy = Math.sin(yaw), x1 = x * cy - y * sy, y1 = x * sy + y * cy;
        const cp = Math.cos(pitch), sp = Math.sin(pitch);
        return [x1, y1 * cp - z * sp, z * cp + y1 * sp];
      };
      function disegna() {
        const w = cv.clientWidth || 320, h = cv.clientHeight || 300, dpr = window.devicePixelRatio || 1;
        if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h);
        const pts = opz.punti();
        const mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9];
        pts.forEach(q => q.forEach((v, i) => { mn[i] = Math.min(mn[i], v); mx[i] = Math.max(mx[i], v); }));
        const centro = [(mn[0] + mx[0]) / 2, (mn[1] + mx[1]) / 2, (mn[2] + mx[2]) / 2];
        const raggio = Math.max(2, Math.hypot(mx[0] - mn[0], mx[1] - mn[1], mx[2] - mn[2]) / 2);
        const sc = Math.min(w, h) / (raggio * 2.3) * zoom, dist = raggio * 4;
        const pr = q => { const r = proietta(q, centro), f = dist / (dist + r[1]); return [w / 2 + px0 + r[0] * sc * f, h / 2 + py0 - r[2] * sc * f + 8, f]; };
        const chiaro = f => Math.max(0.3, Math.min(1, 0.3 + 0.7 * (f - 0.8) / 0.53));
        const linea = (a, b, col, lw, dash) => {
          const p1 = pr(a), p2 = pr(b), k = chiaro((p1[2] + p2[2]) / 2);
          ctx.globalAlpha = k; ctx.strokeStyle = col; ctx.lineWidth = lw * (0.6 + 0.4 * k); ctx.setLineDash(dash || []);
          ctx.beginPath(); ctx.moveTo(p1[0], p1[1]); ctx.lineTo(p2[0], p2[1]); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
        };
        man = [];
        const c = {ctx, w, h, pr, linea, chiaro, raggio, centro, mn, mx, maniglia: (id, q, txt) => {
          const p = pr(q); man.push({id, x: p[0], y: p[1]});
          ctx.strokeStyle = "#eceff3"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(p[0], p[1], 12, 0, 7); ctx.stroke();
          if (txt) { ctx.fillStyle = "#eceff3"; ctx.font = "bold 11px sans-serif"; ctx.textAlign = "left"; ctx.fillText(txt, p[0] + 16, p[1] + 4); }
        }};
        ultimoC = c;
        opz.disegna(c);
      }
      const dita = new Map();
      let ultimo = null, dpz = 0, mpx = 0, mpy = 0;
      cv.addEventListener("pointerdown", e => {
        cv.setPointerCapture(e.pointerId); dita.set(e.pointerId, [e.clientX, e.clientY]); ultimo = [e.clientX, e.clientY]; dpz = 0;
        const rc = cv.getBoundingClientRect(), px = e.clientX - rc.left, py = e.clientY - rc.top;
        let best = null, bd = 28;
        man.forEach(m => { const d = Math.hypot(m.x - px, m.y - py); if (d < bd) { bd = d; best = m; } });
        presa = best && dita.size === 1 ? best.id : null;
        ptrDest = e.button === 2 || e.button === 1 || e.shiftKey;
      });
      cv.addEventListener("contextmenu", e => e.preventDefault());
      cv.addEventListener("pointermove", e => {
        if (!dita.has(e.pointerId)) return;
        dita.set(e.pointerId, [e.clientX, e.clientY]);
        if (presa && dita.size === 1 && opz.trascina) {
          const rc = cv.getBoundingClientRect();
          opz.trascina(presa, e.clientX - rc.left, e.clientY - rc.top, ultimoC); return;
        }
        if (dita.size === 2) {
          const [p1, p2] = [...dita.values()], dd = Math.hypot(p1[0] - p2[0], p1[1] - p2[1]), mx = (p1[0] + p2[0]) / 2, my = (p1[1] + p2[1]) / 2;
          if (dpz) { zoom = Math.min(4, Math.max(0.4, zoom * dd / dpz)); px0 += mx - mpx; py0 += my - mpy; }
          dpz = dd; mpx = mx; mpy = my; disegna(); return;
        }
        if (sposta || ptrDest) { px0 += e.clientX - ultimo[0]; py0 += e.clientY - ultimo[1]; ultimo = [e.clientX, e.clientY]; disegna(); return; }
        yaw += (e.clientX - ultimo[0]) * 0.01;
        pitch = Math.min(1.5, Math.max(-0.1, pitch + (e.clientY - ultimo[1]) * 0.01));
        ultimo = [e.clientX, e.clientY]; disegna();
      });
      const fine = e => { presa = null; dita.delete(e.pointerId); dpz = 0; ultimo = dita.size ? [...dita.values()][0] : null; };
      cv.addEventListener("pointerup", fine); cv.addEventListener("pointercancel", fine);
      cv.addEventListener("wheel", e => { e.preventDefault(); zoom = Math.min(4, Math.max(0.4, zoom * (e.deltaY < 0 ? 1.1 : 0.9))); disegna(); }, {passive: false});
      cv.addEventListener("keydown", e => {
        const m = {ArrowLeft: [-0.1, 0], ArrowRight: [0.1, 0], ArrowUp: [0, -0.1], ArrowDown: [0, 0.1]}[e.key];
        if (m) { e.preventDefault(); yaw += m[0]; pitch = Math.min(1.5, Math.max(-0.1, pitch + m[1])); disegna(); }
      });
      return {
        disegna,
        vista(y, p) { yaw = y; pitch = p; zoom = 1; px0 = 0; py0 = 0; disegna(); },
        modo(m) { sposta = m === "sposta"; cv.style.cursor = sposta ? "move" : "grab"; },
        zoom(f) { zoom = Math.min(4, Math.max(0.4, zoom * f)); disegna(); }
      };
    }
  };
})();
