/* FireOps VVF - disegno in pianta condiviso dai moduli SAF (paranchi e palo pescante).
 * Pianta vista dall'alto: x verso destra, y verso l'alto, in metri. I punti si trascinano col dito o col mouse
 * (passo di 0,1 m). Il disegno si adatta da solo ai punti; durante il trascinamento la scala resta ferma.
 *   const p = SafPianta.crea(canvas, {onMove: (id, x, y) => ...});
 *   p.set(punti, linee);      punti: {id, x, y, col, nome, sotto, fisso, ly (spostamento verticale dell’etichetta in px)}   linee: {a, b, col, dash, lw, testo, freccia}
 *   a e b sono id di punti oppure coordinate [x, y].
 */
(function () {
  "use strict";
  const PASSI = [0.5, 1, 2, 5, 10, 20, 50];
  window.SafPianta = {
    crea(cv, opz) {
      opz = opz || {};
      const ctx = cv.getContext("2d");
      let punti = [], linee = [], T = null, fermo = false, presa = null;
      const snap = v => Math.round(v * 10) / 10;
      const pt = r => (Array.isArray(r) ? {x: r[0], y: r[1]} : punti.find(p => p.id === r));
      const fmt = v => Number(v).toLocaleString("it-IT", {maximumFractionDigits: 1});

      function adatta() {
        const w = cv.clientWidth || 320, h = cv.clientHeight || 260;
        let x0 = -1, x1 = 1, y0 = -1, y1 = 1;
        punti.forEach(p => { x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y); });
        const m = 40, s = Math.min((w - 2 * m) / (x1 - x0), (h - 2 * m) / (y1 - y0));
        T = {s, ox: w / 2 - s * (x0 + x1) / 2, oy: h / 2 + s * (y0 + y1) / 2};
      }
      const X = x => T.ox + x * T.s, Y = y => T.oy - y * T.s;

      function freccia(x1, y1, x2, y2, col, lw) {
        const a = Math.atan2(y2 - y1, x2 - x1);
        ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = lw;
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x2, y2); ctx.lineTo(x2 - 10 * Math.cos(a - 0.4), y2 - 10 * Math.sin(a - 0.4)); ctx.lineTo(x2 - 10 * Math.cos(a + 0.4), y2 - 10 * Math.sin(a + 0.4)); ctx.fill();
      }

      function disegna() {
        const w = cv.clientWidth || 320, h = cv.clientHeight || 260, dpr = window.devicePixelRatio || 1;
        if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, w, h);
        if (!T || !fermo) adatta();
        // griglia
        const passo = PASSI.find(p => p * T.s >= 36) || 50;
        const xa = (0 - T.ox) / T.s, xb = (w - T.ox) / T.s, yb = (T.oy - 0) / T.s, ya = (T.oy - h) / T.s;
        ctx.lineWidth = 1; ctx.strokeStyle = "#232b36";
        for (let x = Math.ceil(xa / passo) * passo; x <= xb; x += passo) { ctx.beginPath(); ctx.moveTo(X(x), 0); ctx.lineTo(X(x), h); ctx.stroke(); }
        for (let y = Math.ceil(ya / passo) * passo; y <= yb; y += passo) { ctx.beginPath(); ctx.moveTo(0, Y(y)); ctx.lineTo(w, Y(y)); ctx.stroke(); }
        ctx.strokeStyle = "#3a4552"; ctx.beginPath(); ctx.moveTo(X(0), 0); ctx.lineTo(X(0), h); ctx.moveTo(0, Y(0)); ctx.lineTo(w, Y(0)); ctx.stroke();
        // linee
        ctx.font = "12px sans-serif"; ctx.textAlign = "center";
        linee.forEach(l => {
          const a = pt(l.a), b = pt(l.b); if (!a || !b) return;
          ctx.setLineDash(l.dash || []);
          if (l.freccia) freccia(X(a.x), Y(a.y), X(b.x), Y(b.y), l.col || "#eceff3", l.lw || 2);
          else { ctx.strokeStyle = l.col || "#eceff3"; ctx.lineWidth = l.lw || 2; ctx.beginPath(); ctx.moveTo(X(a.x), Y(a.y)); ctx.lineTo(X(b.x), Y(b.y)); ctx.stroke(); }
          ctx.setLineDash([]);
          if (l.testo) { ctx.fillStyle = l.col || "#eceff3"; ctx.fillText(l.testo, (X(a.x) + X(b.x)) / 2, (Y(a.y) + Y(b.y)) / 2 - 6); }
        });
        // punti
        punti.forEach(p => {
          if (p.nascosto) return;
          const x = X(p.x), y = Y(p.y);
          ctx.fillStyle = p.col || "#ffd700"; ctx.strokeStyle = "#10141a"; ctx.lineWidth = 2;
          if (p.fisso) ctx.fillRect(x - 6, y - 6, 12, 12);
          else { ctx.beginPath(); ctx.arc(x, y, 9, 0, 7); ctx.fill(); ctx.stroke(); }
          ctx.fillStyle = "#eceff3"; ctx.textAlign = x > w - 90 ? "right" : "left";
          const dx = x > w - 90 ? -13 : 13;
          const ly = p.ly || 0;
          ctx.font = "bold 12px sans-serif"; ctx.fillText(p.nome || "", x + dx, y - 3 + ly);
          if (p.sotto) { ctx.font = "11px sans-serif"; ctx.fillStyle = "#8b96a3"; ctx.fillText(p.sotto, x + dx, y + 11 + ly); }
        });
        // scala
        const sc = PASSI.find(p => p * T.s >= 50) || 50;
        ctx.strokeStyle = "#eceff3"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(12, h - 14); ctx.lineTo(12 + sc * T.s, h - 14); ctx.stroke();
        ctx.fillStyle = "#eceff3"; ctx.font = "11px sans-serif"; ctx.textAlign = "left"; ctx.fillText(fmt(sc) + " m", 12, h - 20);
        ctx.fillStyle = "#8b96a3"; ctx.textAlign = "right"; ctx.fillText("pianta, dall’alto", w - 10, 16);
      }

      function mondo(e) {
        const r = cv.getBoundingClientRect();
        return [snap(((e.clientX - r.left) - T.ox) / T.s), snap((T.oy - (e.clientY - r.top)) / T.s)];
      }
      cv.addEventListener("pointerdown", e => {
        if (!T) return;
        const r = cv.getBoundingClientRect(), px = e.clientX - r.left, py = e.clientY - r.top;
        let best = null, bd = 26;
        punti.forEach(p => { if (p.fisso) return; const d = Math.hypot(X(p.x) - px, Y(p.y) - py); if (d < bd) { bd = d; best = p; } });
        if (!best) return;
        presa = best.id; fermo = true; cv.setPointerCapture(e.pointerId);
      });
      cv.addEventListener("pointermove", e => {
        if (presa == null) return;
        const [x, y] = mondo(e);
        if (opz.onMove) opz.onMove(presa, x, y);
      });
      const fine = () => { if (presa == null) return; presa = null; fermo = false; disegna(); };
      cv.addEventListener("pointerup", fine); cv.addEventListener("pointercancel", fine);

      return {
        set(p, l) { punti = p; linee = l || []; disegna(); },
        disegna
      };
    }
  };
})();
