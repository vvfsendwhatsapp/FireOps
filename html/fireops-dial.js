/* FireOps VVF - barra "Componi" condivisa
 * Includere subito dopo </header>:  <script src="fireops-dial.js"></script>
 * Inserisce una barra fissa in alto con numero, Chiama / WhatsApp / Telegram e interruttore 4146.
 * Espone window.FireOpsDial = { telHref(num), prefisso() } e l'evento "fireops:prefisso".
 */
(function () {
  const PREFIX = "41460039";
  const KEY = "fireops_prefix";

  let prefisso = true;
  try { prefisso = localStorage.getItem(KEY) !== "0"; } catch (e) { }

  const css = `
  .fod-bar{position:sticky;top:0;z-index:1500;background:var(--bg,#10141a);border-bottom:1px solid var(--line,#2a323d);
    box-shadow:0 6px 16px rgba(0,0,0,.35);padding-top:env(safe-area-inset-top,0px)}
  .fod-in{max-width:640px;margin:0 auto;padding:10px 16px;display:flex;gap:6px;align-items:stretch}
  .fod-in input{flex:1;min-width:0;padding:11px 12px;font-size:17px;background:var(--panel,#171d25);
    border:1px solid var(--line,#2a323d);border-radius:6px;color:var(--text,#eceff3);
    font-family:ui-monospace,"SF Mono",Consolas,monospace}
  .fod-in input:focus{outline:none;border-color:#ffd700}
  .fod-btn{flex:none;width:46px;display:flex;align-items:center;justify-content:center;border-radius:6px;
    text-decoration:none;color:#fff;border:none;cursor:pointer}
  .fod-call{background:#ffd700;color:#000}
  .fod-wa{background:#25d366}
  .fod-tg{background:#29a9eb}
  .fod-btn.off{opacity:.3;pointer-events:none}
  .fod-btn:active{opacity:.8}
  .fod-pfx{flex:none;display:flex;align-items:center;gap:6px;padding:0 10px;border-radius:6px;
    background:var(--panel-2,#1d242e);border:1px solid var(--line,#2a323d);color:var(--text-dim,#8b96a3);
    font-family:ui-monospace,"SF Mono",Consolas,monospace;font-size:12.5px;font-weight:700;cursor:pointer}
  .fod-pfx i{width:8px;height:8px;border-radius:50%;background:currentColor}
  .fod-pfx[aria-pressed="true"]{background:#ffd700;border-color:#ffd700;color:#000}
  .fod-btn:focus-visible,.fod-pfx:focus-visible{outline:2px solid var(--text,#eceff3);outline-offset:2px}
  @media (max-width:360px){.fod-btn{width:40px}.fod-pfx{padding:0 7px}}
  `;
  const st = document.createElement("style");
  st.textContent = css;
  document.head.appendChild(st);

  const bar = document.createElement("div");
  bar.className = "fod-bar";
  bar.innerHTML =
    '<div class="fod-in">' +
    '<input type="tel" id="fodInput" placeholder="Componi un numero" inputmode="tel" autocomplete="off" aria-label="Numero da comporre">' +
    '<button type="button" class="fod-pfx" id="fodPfx" title="Antepone 4146 solo in fase di composizione"><i></i>4146</button>' +
    '<a class="fod-btn fod-call off" id="fodCall" href="javascript:void(0)" aria-label="Chiama" title="Chiama">' +
    '<svg width="19" height="19" viewBox="0 0 24 24" fill="none"><path d="M6 3h4l2 5-2.5 1.5a11 11 0 005 5L16 12l5 2v4a2 2 0 01-2 2C10.6 20 4 13.4 4 5a2 2 0 012-2z" stroke="currentColor" stroke-width="2"/></svg></a>' +
    '<a class="fod-btn fod-wa off" id="fodWa" href="javascript:void(0)" target="_blank" rel="noopener" aria-label="WhatsApp" title="WhatsApp">' +
    '<svg width="19" height="19" viewBox="0 0 24 24"><path d="M12 3C7 3 3 6.6 3 11c0 2.1 1 4 2.6 5.4L5 21l4.8-1.8c.7.2 1.4.3 2.2.3 5 0 9-3.6 9-8S17 3 12 3z" fill="currentColor"/></svg></a>' +
    '<a class="fod-btn fod-tg off" id="fodTg" href="javascript:void(0)" target="_blank" rel="noopener" aria-label="Telegram" title="Telegram">' +
    '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4z"/></svg></a>' +
    '</div>';

  const header = document.querySelector("body > header");
  if (header) header.insertAdjacentElement("afterend", bar);
  else document.body.insertBefore(bar, document.body.firstChild);

  const input = bar.querySelector("#fodInput");
  const pfx = bar.querySelector("#fodPfx");

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
    set("#fodCall", telHref(d));
    set("#fodWa", "https://wa.me/39" + n);
    set("#fodTg", "https://t.me/+39" + n);
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