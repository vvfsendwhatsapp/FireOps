/* FireOps VVF - intestazione comune
 * In ogni pagina:
 *   <header data-home="fireops-app.html">      (data-home="" nella home: niente tasto casetta)
 *     <img id="..." ...>  (facoltativo: l'id del logo viene mantenuto)
 *     <h1>Titolo</h1><p>Sottotitolo</p>
 *   </header>
 *   <script src="fireops-header.js"></script>
 * Lo script sostituisce l'header con la barra comune fissa in alto:
 *   logo, titolo, casetta Home, interruttore 4146 (in alto a destra) e riga "Componi".
 * Espone window.FireOpsDial = { telHref(num), prefisso() } e l'evento "fireops:prefisso".
 */
(function () {
  const PREFIX = "41460039";
  const KEY = "fireops_prefix";
  const LOGO = "https://vvfsendwhatsapp.github.io/FireOps/images/logo.png";

  let prefisso = true;
  try { prefisso = localStorage.getItem(KEY) !== "0"; } catch (e) { }

  const css = `
  .foh{position:sticky;top:0;z-index:1500;background:var(--bg,#10141a);border-bottom:1px solid var(--line,#2a323d);
    box-shadow:0 6px 16px rgba(0,0,0,.35);padding-top:env(safe-area-inset-top,0px);font-family:var(--sans,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif)}
  .foh-in{max-width:640px;margin:0 auto;padding:10px 16px 10px}
  .foh-top{display:flex;align-items:center;gap:10px}
  .foh-logo{width:32px;height:32px;object-fit:contain;flex:none}
  .foh-logo.click{cursor:pointer}
  .foh-t{flex:1;min-width:0}
  .foh-t h1{margin:0;font-size:16.5px;font-weight:700;color:var(--text,#eceff3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .foh-t p{margin:2px 0 0;font-size:12px;color:var(--text-dim,#8b96a3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .foh-home{flex:none;width:38px;height:38px;display:flex;align-items:center;justify-content:center;border-radius:50%;
    background:var(--panel-2,#1d242e);border:1px solid var(--line,#2a323d);color:var(--text,#eceff3);text-decoration:none}
  .foh-home:active{background:var(--line,#2a323d)}
  .foh-pfx{flex:none;height:38px;display:flex;align-items:center;gap:6px;padding:0 11px;border-radius:19px;
    background:var(--panel-2,#1d242e);border:1px solid var(--line,#2a323d);color:var(--text-dim,#8b96a3);
    font-family:ui-monospace,"SF Mono",Consolas,monospace;font-size:12.5px;font-weight:700;cursor:pointer;white-space:nowrap}
  .foh-pfx i{width:8px;height:8px;border-radius:50%;background:currentColor}
  .foh-pfx[aria-pressed="true"]{background:#ffd700;border-color:#ffd700;color:#000}
  .foh-dial{display:flex;gap:6px;margin-top:10px}
  .foh-dial input{flex:1;min-width:0;padding:11px 12px;font-size:16px;background:var(--panel,#171d25);
    border:1px solid var(--line,#2a323d);border-radius:6px;color:var(--text,#eceff3);
    font-family:ui-monospace,"SF Mono",Consolas,monospace}
  .foh-dial input::placeholder{font-family:var(--sans,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif);color:var(--text-dim,#8b96a3)}
  .foh-dial input:focus{outline:none;border-color:#ffd700}
  .foh-btn{flex:none;width:48px;display:flex;align-items:center;justify-content:center;border-radius:6px;text-decoration:none;color:#fff}
  .foh-call{background:#ffd700;color:#000}
  .foh-wa{background:#25d366}
  .foh-tg{background:#29a9eb}
  .foh-btn.off{opacity:.3;pointer-events:none}
  .foh-btn:active{opacity:.8}
  .foh-btn:focus-visible,.foh-pfx:focus-visible,.foh-home:focus-visible{outline:2px solid var(--text,#eceff3);outline-offset:2px}
  @media (max-width:370px){.foh-t p{display:none}.foh-btn{width:42px}.foh-pfx{padding:0 8px}}
  `;
  const st = document.createElement("style");
  st.textContent = css;
  document.head.appendChild(st);

  // Legge titolo, sottotitolo, logo e link home dall'header della pagina
  const old = document.querySelector("body > header");
  const titolo = old && old.querySelector("h1") ? old.querySelector("h1").textContent.trim() : document.title;
  const sotto = old && old.querySelector("p") ? old.querySelector("p").textContent.trim() : "";
  const oldLogo = old ? old.querySelector("img") : null;
  const logoId = oldLogo && oldLogo.id ? oldLogo.id : "";
  const homeHref = old && old.hasAttribute("data-home") ? old.getAttribute("data-home") : "fireops-app.html";

  const esc = s => s.replace(/[&<>"]/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;"}[c]));

  const bar = document.createElement("div");
  bar.className = "foh";
  bar.setAttribute("role", "banner");
  bar.innerHTML =
    '<div class="foh-in">' +
      '<div class="foh-top">' +
        '<img class="foh-logo' + (logoId ? ' click' : '') + '"' + (logoId ? ' id="' + logoId + '" title="Reset pagina"' : '') +
          ' src="' + LOGO + '" alt="Logo VVF">' +
        '<div class="foh-t"><h1>' + esc(titolo) + '</h1>' + (sotto ? '<p>' + esc(sotto) + '</p>' : '') + '</div>' +
        (homeHref ? '<a class="foh-home" href="' + esc(homeHref) + '" aria-label="Home" title="Torna alla home FireOps">' +
          '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
          '<path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><path d="M9 22V12h6v10"/></svg></a>' : '') +
        '<button type="button" class="foh-pfx" id="fohPfx" title="Antepone 4146 solo in fase di composizione"><i></i>4146 + 📞</button>' +
      '</div>' +
      '<div class="foh-dial">' +
        '<input type="tel" id="fohInput" placeholder="Componi un numero" inputmode="tel" autocomplete="off" aria-label="Numero da comporre">' +
        '<a class="foh-btn foh-call off" id="fohCall" href="javascript:void(0)" aria-label="Chiama" title="Chiama">' +
          '<svg width="19" height="19" viewBox="0 0 24 24" fill="none"><path d="M6 3h4l2 5-2.5 1.5a11 11 0 005 5L16 12l5 2v4a2 2 0 01-2 2C10.6 20 4 13.4 4 5a2 2 0 012-2z" stroke="currentColor" stroke-width="2"/></svg></a>' +
        '<a class="foh-btn foh-wa off" id="fohWa" href="javascript:void(0)" target="_blank" rel="noopener" aria-label="WhatsApp" title="WhatsApp">' +
          '<svg width="19" height="19" viewBox="0 0 24 24"><path d="M12 3C7 3 3 6.6 3 11c0 2.1 1 4 2.6 5.4L5 21l4.8-1.8c.7.2 1.4.3 2.2.3 5 0 9-3.6 9-8S17 3 12 3z" fill="currentColor"/></svg></a>' +
        '<a class="foh-btn foh-tg off" id="fohTg" href="javascript:void(0)" target="_blank" rel="noopener" aria-label="Telegram" title="Telegram">' +
          '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4z"/></svg></a>' +
      '</div>' +
    '</div>';

  if (old) old.replaceWith(bar);
  else document.body.insertBefore(bar, document.body.firstChild);

  const input = bar.querySelector("#fohInput");
  const pfx = bar.querySelector("#fohPfx");

  function cifre(v) { return (v || "").toString().replace(/[^0-9]/g, ""); }
  function nazionale(d) {
    if (d.startsWith("0039")) return d.slice(4);
    if (d.startsWith("39") && d.length >= 11) return d.slice(2);
    return d;
  }

  function telHref(num) {
    const raw = (num || "").toString();
    if (!prefisso) return "tel:" + raw.replace(/[^0-9+]/g, "");
    return "tel:" + PREFIX + nazionale(cifre(raw));
  }

  function aggiorna() {
    const d = cifre(input.value);
    const ok = d.length > 0;
    const n = nazionale(d);
    const set = (id, href) => {
      const a = bar.querySelector(id);
      a.href = ok ? href : "javascript:void(0)";
      a.classList.toggle("off", !ok);
    };
    set("#fohCall", telHref(d));
    set("#fohWa", "https://wa.me/39" + n);
    set("#fohTg", "https://t.me/+39" + n);
  }

  pfx.setAttribute("aria-pressed", prefisso ? "true" : "false");
  pfx.addEventListener("click", () => {
    prefisso = !prefisso;
    pfx.setAttribute("aria-pressed", prefisso ? "true" : "false");
    try { localStorage.setItem(KEY, prefisso ? "1" : "0"); } catch (e) { }
    aggiorna();
    document.dispatchEvent(new CustomEvent("fireops:prefisso", {detail: {attivo: prefisso}}));
  });
  input.addEventListener("input", aggiorna);
  aggiorna();

  window.FireOpsDial = { telHref, prefisso: () => prefisso };
})();